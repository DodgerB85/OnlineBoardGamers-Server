import json

from decouple import config
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import Http404, HttpResponse, HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.utils.translation import gettext

from Lobby.models import Profile, Game

import Lobby.sharedFunctions.constants as rf


def build_show_game_data(
    request,
    game_id,
    game_code,
    *,
    default_zoom=0,
    extra_select_related=None,
    settings_debug_key=None,
    super_users=("BotKickStarter",),
    clear_chat_notification=True,
):
    """
    Common logic for all showXXXgame views.

    Returns HttpResponseRedirect if the game is not active/finished,
    or a dict with keys: game, presenter, all_players, user_gp, user_profile,
    is_authenticated, is_involved, pov, base_data, auth_data, involved_data.
    """
    select_related = ["host", "creator"]
    if extra_select_related:
        select_related.extend(extra_select_related)

    try:
        currentGame = Game.objects.select_related(*select_related).prefetch_related("players__player", "invitedPlayers").get(id=game_id, gameCode=game_code)
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    presenter = currentGame.presenter()

    if currentGame.gameStatus not in ["ACTIVE", "FINISHED"]:
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))

    # Filter in Python to use the prefetch cache (exclude/filter would bypass it)
    all_players = [gp for gp in currentGame.players.all() if not gp.is_kicked]
    all_player_ids = {gp.player.id for gp in all_players if gp.player}

    userObj = request.user
    username = userObj.username

    gameID = currentGame.id
    gameName = presenter.getGameName()
    gameCreationTimestamp = currentGame.created
    KickoutFlexiDataArray = json.loads(currentGame.kickoutFlexiData) if currentGame.kickoutFlexiData else []
    startingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
    settings_debug = config(settings_debug_key, default=False, cast=bool) if settings_debug_key else False

    base_data = {
        "gameID": gameID,
        "finishedGame": currentGame.gameStatus == "FINISHED",
        "gameName": gameName,
        "gameData": currentGame.gameData,
        "gameCreationTimestamp": gameCreationTimestamp,
        "myZoomLevel": default_zoom,
        "KickoutFlexiDataArray": KickoutFlexiDataArray,
        "startingOptions": startingOptions,
        "settingsDebug": settings_debug,
        "statsExcludeVotesData": json.dumps(
            presenter.getFullSetOfVoteResults(
                rf.STATS_EXCLUDE_VOTE_TOPIC,
                presenter.getAllPlayersOrderedySeatInArray(True),
                False,
            )
        ),
        "deleteVotesData": json.dumps(
            presenter.getFullSetOfVoteResults(
                rf.DELETE_VOTE_TOPIC,
                presenter.getAllPlayersOrderedySeatInArray(True),
                False,
            )
        ),
    }

    if not request.user.is_authenticated:
        return {
            "game": currentGame,
            "presenter": presenter,
            "all_players": all_players,
            "all_player_ids": all_player_ids,
            "user_gp": None,
            "user_profile": None,
            "is_authenticated": False,
            "is_involved": False,
            "pov": -99,
            "base_data": base_data,
            "auth_data": {},
            "involved_data": {},
        }

    # --- Authenticated user ---
    user_id = userObj.id
    user_profile = Profile.objects.get(user=userObj)

    user_gp = next((gp for gp in all_players if gp.player and gp.player.id == user_id), None)

    is_in_all = user_id in all_player_ids
    is_missing = user_gp.is_missing if user_gp else False
    involvedPlayer = is_in_all and not is_missing
    if username in super_users:
        involvedPlayer = True

    chatData = currentGame.chatData
    latestUpdate = currentGame.latestUpdate

    # Chat notification
    chatNotification = False
    if user_gp and user_gp.has_chat_notification:
        chatNotification = True
        if clear_chat_notification:
            user_gp.has_chat_notification = False
            user_gp.save()

    nextURL = f"/nextGame?current_id={gameID}&current_code={presenter.getGameCode()}"

    auth_data = {
        "name": username,
        "chatData": chatData,
        "latestUpdateLiteral": latestUpdate,
        "nextURL": nextURL,
        "chatNotification": chatNotification,
    }

    if not involvedPlayer:
        return {
            "game": currentGame,
            "presenter": presenter,
            "all_players": all_players,
            "all_player_ids": all_player_ids,
            "user_gp": user_gp,
            "user_profile": user_profile,
            "is_authenticated": True,
            "is_involved": False,
            "pov": -9,
            "base_data": base_data,
            "auth_data": auth_data,
            "involved_data": {},
        }

    # --- Involved player ---
    pov = presenter.seatPosition(username)
    if username in super_users:
        pov = -1

    secondsToNextKickout = presenter.getSecondsToNextKickout()
    kickoutRequired = presenter.kickoutRequired()
    myMove = presenter.isMyMove(username)
    notes = user_gp.notes if user_gp else ""
    liveNotification = user_profile.liveNotification

    myZoomLevel = default_zoom
    try:
        zoomLevels = json.loads(currentGame.zoomLevels)
        if 0 <= pov < len(zoomLevels):
            myZoomLevel = zoomLevels[pov]
    except (json.JSONDecodeError, IndexError, TypeError):
        pass

    involved_data = {
        "involvedPlayer": True,
        "pov": pov,
        "secondsToNextKickout": secondsToNextKickout,
        "kickoutRequired": kickoutRequired,
        "myMove": myMove,
        "myZoomLevel": myZoomLevel,
        "notes": notes,
        "chatNotification": chatNotification,
        "yourTurnAudioType": liveNotification,
        "statsExcludedGame": currentGame.statsExcludedGame,
    }

    return {
        "game": currentGame,
        "presenter": presenter,
        "all_players": all_players,
        "all_player_ids": all_player_ids,
        "user_gp": user_gp,
        "user_profile": user_profile,
        "is_authenticated": True,
        "is_involved": True,
        "pov": pov,
        "base_data": base_data,
        "auth_data": auth_data,
        "involved_data": involved_data,
    }

@login_required
def shared_save_zoom(request, game_code):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "zoom":
        try:
            currentGame = Game.objects.get(id=jsonData["gameID"], gameCode=game_code)
        except Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))
        
        # If you are not an invovled player, don't save the zoom
        user_id = request.user.id
        all_players = [gp for gp in currentGame.players.all() if not gp.is_kicked]
        all_player_ids = {gp.player.id for gp in all_players if gp.player}
        user_gp = next((gp for gp in all_players if gp.player and gp.player.id == user_id), None)
        is_in_all = user_id in all_player_ids
        is_missing = user_gp.is_missing if user_gp else False
        if is_missing or not is_in_all:
            return JsonResponse({"response": "ok"})

        zoomLevels = json.loads(currentGame.zoomLevels)

        if jsonData.get("allPlayers"):
            for i in range(len(zoomLevels)):
                if game_code == "RNB":
                    zoomLevels[i] = round(float(jsonData["zoomLevel"]), 1)
                else:
                    zoomLevels[i] = int(jsonData["zoomLevel"])
        else:
            playerNumber = int(jsonData["playerNumber"])
            # Ensure zoomLevels array is long enough
            while len(zoomLevels) <= playerNumber:
                zoomLevels.append(0)  # Add default zoom level for new players
            
            if game_code == "RNB":
                zoomLevels[playerNumber] = round(float(jsonData["zoomLevel"]), 1)
            else:
                zoomLevels[playerNumber] = int(jsonData["zoomLevel"])

        currentGame.zoomLevels = json.dumps(zoomLevels)
        currentGame.save()
        return JsonResponse({"response": "ok"})

    return HttpResponse(status=204)


def shared_save_notes(request, game_code, json_key="notes"):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    try:
        currentGame = Game.objects.get(id=jsonData["gameID"], gameCode=game_code)
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    user_gp = currentGame.players.filter(player=request.user).first()
    if user_gp:
        user_gp.notes = jsonData[json_key]
        user_gp.save()

    return JsonResponse({"notePosted": True})


def shared_bug_entry(request, game_code, extra_info_fn=None):
    from django_q.tasks import async_task

    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    try:
        currentGame = Game.objects.get(id=gameID, gameCode=game_code)
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    extra_info = extra_info_fn(currentGame) if extra_info_fn else ""

    async_task("Lobby.sharedFunctions.sharedNotifications.SN_sendBugReportEmail", 
        request.user.username,
        request.user.email,
        game_code,
        gameID,
        jsonData["gameData"],
        jsonData["description"],
        currentGame.rewindData,
        extra_info,
    )


    return JsonResponse({"bugEntrySuccess": True})


def shared_cast_vote(request):
    jsonData = json.loads(request.body)

    try:
        currentGame = Game.objects.get(id=jsonData["gameID"])
    except Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    result = currentGame.presenter().processVoteLogic(
        topic=jsonData["topic"],
        username=request.user.username,
        choice=jsonData.get("choice", True),
    )

    msg = result.get("message")
    if isinstance(msg, str):
        messages.success(request, msg)

    return JsonResponse(result)
