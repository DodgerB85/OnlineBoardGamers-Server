import json
import lzstring
import time
import requests
import random

from contextlib import contextmanager
from itertools import chain

from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.conf import settings

from django.http import Http404, HttpResponse, JsonResponse, HttpResponseRedirect
from django.shortcuts import render  # , redirect
from django.contrib.auth.decorators import login_required

# from django.contrib.sites.shortcuts import get_current_site
# from django.template.loader import render_to_string
from django.utils.translation import gettext  # , get_language
from django.contrib import messages
from django.urls import reverse
from django.db import connection, transaction
from django.shortcuts import get_object_or_404

from django.db.models import Q

from .models import TGZ_Game
from Lobby.models import User, Profile

from Lobby.sharedFunctions.sharedFunctions import (
    SF_TGZadvancedOptions,
    SF_getGameCreationJsonReturn,
    SF_updateFlexiTime,
    SF_fastSerializeGame,
)
from Lobby.sharedFunctions.sharedNotifications import (
    SN_M_T_sendTournamentGameStartNotification,
    SN_sendBugReportEmail,
    SN_sendNextTurnNotification,
    SN_sendInviteNotifications,
    SN_sendAdminErrorMessage,
)
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from .common import create_tgz_game

def index(request):
    return HttpResponse("Secret tip! Click your name in the top right in a PRACTICE game to unlock all gods!")


def TGZhelp(request):
    return render(request, "TGZ/TGZhelp.html")


@login_required()
def createTGZgame(request):
    # Creating a game must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    return create_tgz_game(request)
    ########################################################## EXTERNAL TOURNY
    if request.user.username == "TGZtourneyAdmin":
        players = ["player1", "player2", "player3", "player4", "player5"]
        _maxPlayers = 2
        if "playerNumber" in request.POST:
            _maxPlayers = int(request.POST["playerNumber"])
        else:
            tilesList = request.POST["mapData"].split(",")
            if len(tilesList) == 8:
                _maxPlayers = 2
            if len(tilesList) == 12:
                _maxPlayers = 3
            if len(tilesList) == 14:
                _maxPlayers = 4
            if len(tilesList) == 18:
                _maxPlayers = 5

        ################### BATCH
        if request.POST.get("player1") == "":
            batchGameData_raw = request.POST.get("batchGameData")
            batchGameData_lines = batchGameData_raw.splitlines()
            batchGameData_arr = []
            error_detected = False
            for line in batchGameData_lines:
                split_line = [entry.strip() for entry in line.split(",")]
                batchGameData_arr.append(split_line)
            for row in batchGameData_arr:
                row_error = False
                _maxPlayers = len(row) - 1
                _gameName = row[0]
                for username in row[1:5]:
                    try:
                        User.objects.get(username=username)
                    except User.DoesNotExist:
                        row_error = True
                        error_detected = True
                        message = f"****** GAME CREATION ERROR -- USER NOT FOUND: {username} -- Game: {row}"
                        requests.post(
                            "https://discord.com/api/webhooks/1197726435369029713/WJz5fJ0KsJnUM1bH4Czn7ELBSTzL_Bng6ZMO52IuRHa1A-FyJcDsZZhdbQYORKDwvehS",
                            data={"content": message},
                        )
                        break
                if not row_error:
                    _pace = 40
                    _created = SR_getTimeNow()
                    creator = User.objects.get(username="TGZtourneyAdmin")
                    newGame = TGZ_Game(
                        gameName=_gameName,
                        creator=creator,
                        host=User.objects.get(username=row[1]),
                        gamePace=_pace,
                        turn=0,
                        phase=0,
                        created=_created,
                        latestUpdate=_created,
                        maxPlayers=_maxPlayers,
                        gameStatus="ACTIVE",
                    )
                    newGame.save()

                    # Add and email players up to maxPlayers to the game
                    for username in row[1:5]:
                        _newPlayer = User.objects.get(username=username)
                        newGame.allPlayers.add(_newPlayer)
                        SN_M_T_sendTournamentGameStartNotification(
                            request,
                            "TGZ",
                            username,
                            _maxPlayers,
                            _gameName,
                            newGame.currentTurnString(),
                            getattr(newGame, "id"),
                            True,
                            "externalTournament",
                        )

                    newGame.kickoutDuration = 100

                    zoomLevels = []
                    for i in range(_maxPlayers):
                        zoomLevels.append(240)
                    newGame.zoomLevels = json.dumps(zoomLevels)

                    newGame.statsExcludeConsent = "0" * _maxPlayers

                    # EXPERT OPTIONS
                    _startingOptions = []
                    if "enableAdvancedOptions" in request.POST:
                        _startingOptions = SF_TGZadvancedOptions(request)

                    newGame.startingOptions = json.dumps(_startingOptions)

                    newGame.externalTournamentGame = True

                    # Fix the player order in order of array
                    newGame.playerOrderSeed = random.randint(1000, 32767)
                    print(row)
                    player_name_order_input = [row[i] for i in range(1, 5)]
                    print(player_name_order_input)
                    playerList_raw = list(
                        newGame.allPlayers.exclude(username="TGZtourneyAdmin").values_list("username", flat=True)
                    )
                    print(playerList_raw)
                    print(newGame.playerOrderSeed)
                    for i in range(1000, 32767):
                        playerList_test = playerList_raw.copy()
                        random.Random(i).shuffle(playerList_test)
                        if playerList_test == player_name_order_input:
                            print("MATCH")
                            print(player_name_order_input)
                            print(playerList_test)
                            newGame.playerOrderSeed = i
                            break
                    print(newGame.playerOrderSeed)

                    allPlayersL = newGame.getAllPlayersOrderedySeat()
                    newGame.currentPlayers = allPlayersL[0]

                    newGame.save()

                    message = f"Game Created -- Game: {row}"
                    try:
                        message = "===========================\n"
                        message += "New Tournament Game Started\n"
                        message += "Data: " + str(row) + "\n"
                        message += (
                            "[Click here to view the game](https://www.OnlineBoardGamers.com/TGZ/"
                            + str(getattr(newGame, "id"))
                            + "/)"
                        )
                        requests.post(
                            "https://discord.com/api/webhooks/1197726435369029713/WJz5fJ0KsJnUM1bH4Czn7ELBSTzL_Bng6ZMO52IuRHa1A-FyJcDsZZhdbQYORKDwvehS",
                            data={"content": message},
                        )
                    except Exception:
                        pass

            message = "Game created and started. New Game Notifications sent [NO EMAILS SENT]"
            if error_detected:
                message += ". ERROR DETECTED. Check MR Moo"
            else:
                message += ". No erros detected"
            messages.success(request, (message))
            return HttpResponseRedirect(reverse("createTGZpage"))
        ################### SINGLE
        else:
            # Check players exist
            for i, player in enumerate(players):
                if i < _maxPlayers:
                    # Players up to maxPlayers should not be blank
                    username = request.POST.get(player)
                    if not username:
                        messages.error(request, gettext(f"Error: {player} is required"))
                        return HttpResponseRedirect(reverse("createTGZpage"))
                    try:
                        User.objects.get(username=username)
                    except User.DoesNotExist:
                        messages.error(request, gettext(f"Error: {username} does not exist"))
                        return HttpResponseRedirect(reverse("createTGZpage"))
                else:
                    # Players after maxPlayers should be blank
                    username = request.POST.get(player)
                    if username:
                        messages.error(request, gettext(f"Error: {player} should be blank"))
                        return HttpResponseRedirect(reverse("createTGZpage"))

            _gameName = request.POST["gameName"]

            _gameDescription = request.POST["gameDescription"]

            _startingOptions = []
            _created = SR_getTimeNow()
            _pace = request.POST["pace"]
            creator = User.objects.get(username="TGZtourneyAdmin")

            newGame = TGZ_Game(
                gameName=_gameName,
                gameDescription=_gameDescription,
                creator=creator,
                host=User.objects.get(username=request.POST.get("player1")),
                gamePace=_pace,
                turn=0,
                phase=0,
                created=_created,
                latestUpdate=_created,
                maxPlayers=_maxPlayers,
                gameStatus="ACTIVE",
            )
            newGame.save()

            # Add and email players up to maxPlayers to the game
            for i in range(1, _maxPlayers + 1):
                player_key = f"player{i}"
                username = request.POST.get(player_key)
                _newPlayer = User.objects.get(username=username)
                newGame.allPlayers.add(_newPlayer)
                SN_M_T_sendTournamentGameStartNotification(
                    request,
                    "TGZ",
                    username,
                    _maxPlayers,
                    _gameName,
                    newGame.currentTurnString(),
                    getattr(newGame, "id"),
                    False,
                    "externalTournament",
                )

            newGame.kickoutDuration = request.POST["kickoutDuration"]

            zoomLevels = []
            for i in range(_maxPlayers):
                zoomLevels.append(240)
            newGame.zoomLevels = json.dumps(zoomLevels)

            newGame.statsExcludeConsent = "0" * _maxPlayers

            if "mapData" in request.POST and request.POST["mapData"] != "":
                newGame.startingMap = request.POST["mapData"]

            # EXPERT OPTIONS
            if "enableAdvancedOptions" in request.POST:
                _startingOptions = SF_TGZadvancedOptions(request)

            newGame.startingOptions = json.dumps(_startingOptions)
            newGame.externalTournamentGame = True
            newGame.playerOrderSeed = random.randint(1000, 32767)
            allPlayersL = newGame.getAllPlayersOrderedySeat()
            newGame.currentPlayers = allPlayersL[0]

            newGame.save()

            try:
                message = "===========================\n"
                message += "New Tournament Game Started\n"
                usernames = [user.username for user in newGame.allPlayers.all()]
                message += "Players: " + ", ".join(usernames) + "\n"
                message += (
                    "[Click here to view the game](https://www.OnlineBoardGamers.com/TGZ/"
                    + str(getattr(newGame, "id"))
                    + "/)"
                )

                requests.post(
                    "https://discord.com/api/webhooks/1197726435369029713/WJz5fJ0KsJnUM1bH4Czn7ELBSTzL_Bng6ZMO52IuRHa1A-FyJcDsZZhdbQYORKDwvehS",
                    data={"content": message},
                )
            except Exception as e:
                print("createTGZgame Error: " + str(e))

            messages.success(request, (gettext("Game created and started. New Game Notifications sent")))
            return HttpResponseRedirect(reverse("createTGZpage"))

    ########################################################## END EXTERNAL TOURNY

    # Check Not You
    players = ["player2", "player3", "player4", "player5"]
    usernames = []
    for player in players:
        username = request.POST.get(player)
        if username:
            usernames.append(username)

    if "trainingGame" not in request.POST:
        existing_users = User.objects.filter(username__in=usernames)
        existing_usernames = set(user.username for user in existing_users)

        for username in usernames:
            if username not in existing_usernames:
                messages.error(request, gettext(f"Error: {username} does not exist"))
                return HttpResponseRedirect(reverse("createTGZpage"))
            if username == request.user.username:
                messages.error(request, gettext("Error: You cannot add yourself"))
                return HttpResponseRedirect(reverse("createTGZpage"))

    # CHECK APPROPRIATE NUMBER OF ENTERED USERS ARE REAL AND UNIQUE

    _gameDescription = request.POST["gameDescription"]

    _maxPlayers = 2
    if "playerNumber" in request.POST:
        _maxPlayers = int(request.POST["playerNumber"])
    else:
        tilesList = request.POST["mapData"].split(",")
        if len(tilesList) == 8:
            _maxPlayers = 2
        if len(tilesList) == 12:
            _maxPlayers = 3
        if len(tilesList) == 14:
            _maxPlayers = 4
        if len(tilesList) == 18:
            _maxPlayers = 5

    _startingOptions = []
    if "trainingGame" in request.POST:
        _startingOptions.append(int(request.POST["trainingGame"]))
    if "learningGame" in request.POST:
        _startingOptions.append(int(request.POST.get("learningGame")))
    if "experiencedGame" in request.POST:
        _startingOptions.append(int(request.POST.get("experiencedGame")))
    if "useSchism" in request.POST:
        # Stats exclude is done later
        if "schismRadio" in request.POST:
            _startingOptions.append(int(request.POST.get("schismRadio")))

    _created = SR_getTimeNow()
    _pace = request.POST["pace"]

    with transaction.atomic():
        newGame = TGZ_Game(
            gameDescription=_gameDescription,
            creator=request.user,
            host=request.user,
            gamePace=_pace,
            turn=0,
            phase=0,
            created=_created,
            latestUpdate=_created,
            maxPlayers=_maxPlayers,
            gameStatus="AVAILABLE",
        )
        newGame.save()

        _gameName = request.POST["gameName"]
        if _gameName != "":
            newGame.gameName = _gameName

        newGame.allPlayers.add(request.user)

        if "trainingGame" in request.POST:
            newGame.gameStatus = "ACTIVE"
            shadow_names = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4"]
            shadow_players = []

            for i in range(1, _maxPlayers):
                shadow_player = User.objects.get(username=f"{shadow_names[i - 1]}")
                newGame.allPlayers.add(shadow_player)

                if request.POST[f"player{i + 1}"]:
                    display_name = request.POST[f"player{i + 1}"]
                else:
                    display_name = f"{shadow_names[i - 1]}"
                shadow_players.append(display_name)

            newGame.player0notes = json.dumps(shadow_players)
            newGame.startGame(request)
        else:
            usernamesToNotify = []
            for i in range(2, _maxPlayers + 1):
                player_username = request.POST.get(f"player{i}", "")
                if player_username:
                    newPlayer = get_object_or_404(User, username=player_username)
                    newGame.gameStatus = "WAITING"
                    newGame.invitedPlayers.add(newPlayer)
                    usernamesToNotify.append(newPlayer.username)

            SN_sendInviteNotifications(request, usernamesToNotify, newGame.getGameName(), _maxPlayers, "TGZ")

        newGame.kickoutDuration = request.POST["kickoutDuration"]

        zoomLevels = [240] * _maxPlayers
        newGame.zoomLevels = json.dumps(zoomLevels)

        newGame.statsExcludeConsent = "0" * _maxPlayers
        if "trainingGame" in request.POST:
            newGame.statsExcludeConsent = "1" * _maxPlayers
            newGame.statsExcludedGame = True
        elif "learningGame" in request.POST:
            newGame.statsExcludeConsent = "1" * _maxPlayers
            newGame.statsExcludedGame = True
        if "useSchism" in request.POST:
            newGame.statsExcludeConsent = "1" * _maxPlayers
            newGame.statsExcludedGame = True

        if "mapData" in request.POST and request.POST["mapData"] != "":
            newGame.startingMap = request.POST["mapData"]

        # EXPERT OPTIONS
        if "enableAdvancedOptions" in request.POST:
            _startingOptions.extend(SF_TGZadvancedOptions(request))
            newGame.statsExcludeConsent = "1" * _maxPlayers
            newGame.statsExcludedGame = True
            # Check and add schism flag
            # Check if any subarray has entry[0] == 90
            for entry in _startingOptions:
                if isinstance(entry, list) and len(entry) > 0 and entry[0] == 90:
                    # Check if any other int in the array is between 12 and 23 inclusive
                    schismFound = False
                    for num in entry:
                        if 12 <= num <= 23:
                            schismFound = True
                            _startingOptions.append(7)
                            break  # Exit the loop if condition is met
                    if schismFound:
                        break  # Exit the outer loop if flag is set to True

        newGame.startingOptions = json.dumps(_startingOptions)

        if "privateGame" in request.POST:
            print(request.POST["privateGame"])
            newGame.gameStatus = "PRIVATE"

        newGame.save()

    if "trainingGame" in request.POST:
        messages.success(request, (gettext("Your Practice game has started")))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))
    else:
        messages.success(request, (SF_getGameCreationJsonReturn("TGZ", getattr(newGame, "id"))))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))


@contextmanager
def db_mutex(name, timeout=10):
    # if settings.DEBUG:
    # if 1==2:
    #    yield
    #    return
    mutex_name = "dbmutex_" + name
    cursor = connection.cursor()
    # timeout returns with error
    cursor.execute("SELECT GET_LOCK(%s, %s)", (mutex_name, timeout))
    ((got,),) = cursor.fetchall()
    if got:
        yield
        cursor.execute("SELECT RELEASE_LOCK(%s)", (mutex_name,))
        cursor.fetchall()
    else:
        # time out or can't open?
        print("ERROR-TGZ: Not running, %s mutex not available" % (mutex_name))


def showTGZgame(request, game_id, spoilerFree=False, replayStep=1):
    try:
        currentGame = TGZ_Game.objects.select_related(
            "host", "relatedMainTournament", "creator",
        ).prefetch_related(
            "allPlayers", 
            "missingPlayers", 
            "playersWithChatNotification"
        ).get(id=game_id)
    except TGZ_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.gameStatus != "ACTIVE" and currentGame.gameStatus != "FINISHED":
        messages.error(request, gettext("The game is not Active"))
        return HttpResponseRedirect(reverse("index"))
    # Access the prefetch cache immediately to "warm" it
    all_player_ids = {p.id for p in currentGame.allPlayers.all()}
    userObj = request.user
    username = userObj.username
    
    #start_time = time.time()
    #show_timestamps = username in ["admin", "DodgerB"]
    #def print_timestamp(label):
    #    if show_timestamps:
    #        print(f"[TIMING] {label}: {time.time() - start_time:.4f}s | DB Hits: {len(connection.queries)}")

    # Noe it is a proper started game, so set up for not logged in
    gameID = getattr(currentGame, "id")
    gameName = currentGame.getGameName()
    gameData = currentGame.gameData
    gameCreationTimestamp = currentGame.created
    KickoutFlexiDataArray = []
    if currentGame.kickoutFlexiData:
        KickoutFlexiDataArray = json.loads(currentGame.kickoutFlexiData)
    returnData = {
        "gameID": gameID,
        "gameName": gameName,
        "gameData": gameData,
        "gameCreationTimestamp": gameCreationTimestamp,
        "myZoomLevel": 240,
        "spoilerFree": spoilerFree,
        "replayStep": replayStep,
        "KickoutFlexiDataArray": KickoutFlexiDataArray,
        "latestUpdateLiteral": currentGame.latestUpdate,
        "settingsDEBUG": settings.DEBUG,
    }
    
    #print_timestamp("After not logged in setup")

    if not request.user.is_authenticated:
        return render(request, "TGZ/showTGZgame.html", returnData)

    # Now you are logged in
    user_id = userObj.id
    
    user_profile = Profile.objects.get(user=userObj) 
    missing_player_ids = {p.id for p in currentGame.missingPlayers.all()}
    chat_notify_ids = {p.id for p in currentGame.playersWithChatNotification.all()}

    is_in_all = user_id in all_player_ids
    is_missing = user_id in missing_player_ids
    involvedPlayer = is_in_all and not is_missing
    if username == "BotKickStarter":
        involvedPlayer = True
    if username == "TGZtourneyAdmin" and currentGame.relatedMainTournament is not None:
        involvedPlayer = True
            
    preferredTGZcolour = user_profile.preferredTGZcolour
    chatData = currentGame.chatData

    ## Get the next URL
    nextURL = f"/nextGame?current_id={gameID}&current_code={currentGame.getGameCode()}/"
    
    chatNotification = False
    if user_id in chat_notify_ids:
        chatNotification = True
        currentGame.playersWithChatNotification.remove(request.user)
        currentGame.save()

    returnData.update(
        {
            "name": username,
            "chatData": chatData,
            "nextURL": nextURL,
            "TGZminimalText": user_profile.TGZminimalText,
            "chatNotification": chatNotification,
        }
    )

    if not involvedPlayer:
        return render(request, "TGZ/showTGZgame.html", returnData)
    
    #print_timestamp("After not involvedPlayer")

    pov = currentGame.seatPosition(username)
    if username == "BotKickStarter":
        pov = 0
    if username == "TGZtourneyAdmin" and currentGame.externalTournamentGame:
        pov = 0
    secondsToNextKickout = currentGame.getSecondsToNextKickout()

    kickoutRequired = currentGame.kickoutRequired()

    myMove = currentGame.isMyMove(username)

    # Get the Notes for the user
    notes_mapping = {
            0: currentGame.player0notes,
            1: currentGame.player1notes,
            2: currentGame.player2notes,
            3: currentGame.player3notes,
            4: currentGame.player4notes,
        }
    notes = notes_mapping.get(pov, "")

    #print_timestamp("After getting notes")

    liveNotification = user_profile.liveNotification
    startingOptions = json.loads(currentGame.startingOptions) if currentGame.startingOptions else []
    myZoomLevel = json.loads(currentGame.zoomLevels)[pov]

    autoPass = "false"
    if currentGame.autoMoves is not None:
        autoMoves = json.loads(currentGame.autoMoves)
        if autoMoves[pov] == 1:
            autoPass = "true"

    experiencedPlayer = False
    if currentGame.turn == 0:
        if TGZ_Game.objects.filter(Q(allPlayers=request.user) & Q(gameStatus="FINISHED")).count() >= 5:
            experiencedPlayer = True

    myStatsExcludeConsent = "0"
    try:
        myStatsExcludeConsent = int(currentGame.statsExcludeConsent[pov : pov + 1])
    except:
        myStatsExcludeConsent = "0"

    #print_timestamp("After getting myStatsExcludeConsent")

    # Involved Player
    returnData.update(
        {
            "involvedPlayer": True,
            "pov": pov,
            "secondsToNextKickout": secondsToNextKickout,
            "kickoutRequired": kickoutRequired,
            "myMove": myMove,
            "myZoomLevel": myZoomLevel,
            "notes": notes,
            "yourTurnAudioType": liveNotification,
            "startingOptions": startingOptions,
            "preferredTGZcolour": preferredTGZcolour,
            "autoPass": autoPass,
            "statsExcludedGame": currentGame.statsExcludedGame,
            "myStatsExcludeConsent": myStatsExcludeConsent,
            "externalTournamentGame": currentGame.externalTournamentGame,
            "experiencedPlayer": experiencedPlayer,
        }
    )

    ## NEW GAME
    if currentGame.gameData == "":
        displayNames = ""
        if "SHADOW" in currentGame.getAllPlayersOrderedySeat():
            displayNames = currentGame.player0notes
            currentGame.player0notes = ""
            notes = ""
            currentGame.save()
        allPlayerListBySeat = json.dumps(currentGame.getAllPlayersOrderedySeat())
        if currentGame.startingMap != "":
            returnData.update({"startingMap": json.loads(currentGame.startingMap)})

        returnData.update(
            {
                "notes": notes,
                "displayNames": displayNames,
                "allPlayerListBySeat": allPlayerListBySeat,
            }
        )

    return render(request, "TGZ/showTGZgame.html", returnData)


@login_required()
def processTGZturn(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("processTurn_" + str(gameID)):
        return _processTGZturn(request)


@login_required()
def _processTGZturn(request):
    # processing a turn must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = TGZ_Game.objects.get(id=jsonData["gameID"])
    except TGZ_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if jsonData["action"] == "setAutoPass":
        playerIndex = jsonData["playerNumber"]
        autoPass = jsonData["autoPass"]
        # If no data and submitting no pass, just return
        if not autoPass and currentGame.autoMoves is None:
            return JsonResponse({"setAutoPassSuccess": True})
        if currentGame.autoMoves is None:
            autoMoves = [0] * currentGame.maxPlayers
        else:
            autoMoves = json.loads(currentGame.autoMoves)
        if autoPass:
            autoMoves[playerIndex] = 1
        else:
            autoMoves[playerIndex] = 0
        currentGame.autoMoves = json.dumps(autoMoves)
        currentGame.save()
        return JsonResponse({"setAutoPassSuccess": True})

    elif jsonData["action"] == "simpleSave":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(
            currentGame.latestUpdate
        ):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: TGZ simpleSave - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        if "mapTiles" in jsonData:
            currentGame.startingMap = json.dumps(jsonData["mapTiles"])

        currentGame.gameData = jsonData["data"]
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        response_data = {
            "latestUpdate": currentGame.latestUpdate,
        }

        return JsonResponse(response_data, safe=False)

    elif jsonData["action"] == "replaceExternalTournamentPlayer":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(
            currentGame.latestUpdate
        ):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: TGZ replaceExternalTournamentPlayer - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.kickedPlayers.add(_missingPlayer)

        # Add TGZ tourney admin player
        currentGame.allPlayers.add(User.objects.get(username="TGZtourneyAdmin"))

        # Change host to TGZ tourney admin
        currentGame.host = User.objects.get(username="TGZtourneyAdmin")

        currentGame.currentPlayers = jsonData["nextPlayer"]

        # Delete Rewind Data
        currentGame.rewindData = ""
        currentGame.rewindTempData = ""

        currentGame.gameData = jsonData["data"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()
        response_data = {
            "latestUpdate": currentGame.latestUpdate,
            "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
        }

        return JsonResponse(response_data, safe=False)

    elif jsonData["action"] == "save":
        # Check if old version is older than DB version, and if so, return
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(
            currentGame.latestUpdate
        ):
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: TGZ save - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        if "mapTiles" in jsonData:
            currentGame.startingMap = json.dumps(jsonData["mapTiles"])

        firstSave = False
        if currentGame.gameData == "":
            firstSave = True

        # If staying in bid phase
        autoPass = False
        if currentGame.phase == 1 and jsonData["phase"] == 1:
            if currentGame.autoMoves is not None:
                autoMoves = json.loads(currentGame.autoMoves)
                if autoMoves[currentGame.seatPosition(jsonData["nextPlayer"])] == 1:
                    autoPass = True

        # If moving from bids to actions, set automoves to null
        if currentGame.phase == 1 and jsonData["phase"] == 2:
            currentGame.autoMoves = None

        currentGame.gameData = jsonData["data"]
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]

        if "checkName" in jsonData:
            currentGame.kickoutFlexiData = SF_updateFlexiTime(
                currentGame.kickoutFlexiData,
                currentGame.latestUpdate,
                int(time.time()) * 1000,
                jsonData["checkName"],
                currentGame.kickoutDuration,
            )
        else:
            currentGame.kickoutFlexiData = SF_updateFlexiTime(
                currentGame.kickoutFlexiData,
                currentGame.latestUpdate,
                int(time.time()) * 1000,
                request.user.username,
                currentGame.kickoutDuration,
            )

        oldVer = currentGame.latestUpdate
        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        newLatestUpdate = str((int(time.time()) * 1000) + newVer)
        currentGame.latestUpdate = newLatestUpdate

        currentGame.currentPlayers = jsonData["nextPlayer"]

        # SAVE BEFORE NOTIFICATIONS
        currentGame.save()

        if jsonData["status"] == "FINISHED":
            currentGame.endGame(request, jsonData["winner"], jsonData["finalPositions"], jsonData["tournamentData"], jsonData["gameID"])
            if "externalTournamentGame" in jsonData and jsonData["externalTournamentGame"] is True:
                currentGame.kickoutFlexiData = ""
                currentGame.kickoutFlexiData = json.dumps(jsonData["tournamentData"])
                currentGame.save()

        # Don't notify if auto-passing
        elif not autoPass and not firstSave:
            # Send Notifications
            if (
                jsonData["nextPlayer"] != ""
                and jsonData["nextPlayer"] != "HcBot"
                and not jsonData["status"] == "FINISHED"
                and currentGame.startingOptions != "102"
            ):
                playerListToNotify = jsonData["nextPlayer"].split(",")
                if request.user.username in playerListToNotify:
                    playerListToNotify.remove(request.user.username)

                if len(playerListToNotify) > 0:
                    SN_sendNextTurnNotification(
                        request,
                        "TGZ",
                        playerListToNotify,
                        getattr(currentGame, "id"),
                        currentGame.gameName,
                        currentGame,
                        oldVer,
                    )

        ################ REWIND EVERY SAVE #######################

        if jsonData["saveRewind"]:
            currentRewindData = []
            # Need this as intially it is totally empty
            if currentGame.rewindData != "":
                currentRewindData = json.loads(currentGame.rewindData)

            # If tempData isn't already onthe end, AND isn't the same as currentGameData then add it on, and wipe the temp storage
            if len(currentGame.rewindTempData) > 0:
                if len(currentRewindData) == 0 or (
                    currentRewindData[-1] != currentGame.rewindTempData
                    and jsonData["data"] != currentGame.rewindTempData
                ):
                    # add to RWdata and RWdata[]
                    currentRewindData.append(currentGame.rewindTempData)
                currentGame.rewindTempData = ""

            # If no rewind data, then start it with this data
            if len(currentRewindData) == 0:
                currentRewindData.append(jsonData["data"])
            else:
                # else check last one isn't same as cufrent, and if not then add
                if len(currentRewindData) == 0 or currentRewindData[-1] != jsonData["data"]:
                    currentRewindData.append(jsonData["data"])
                    # Limit to 20 rewind points by removing oldest
                    while len(currentRewindData) > 20:
                        currentRewindData.pop(0)
                # MAYBE ADD AN INDENT TO THIS LINE????

            currentGame.rewindData = json.dumps(currentRewindData)

        ################ END REWIND EVERY SAVE #######################

        currentGame.save()

        response_data = {"latestUpdate": newLatestUpdate, "secondsToNextKickout": currentGame.getSecondsToNextKickout()}

        if autoPass:
            response_data["processAutoPass"] = autoPass

        return JsonResponse(response_data, safe=False)

    # END SAVE / CREATE

    elif jsonData["action"] == "resign":
        # Always do this
        usernameToUse = request.user.username
        if usernameToUse == "BotKickStarter":
            usernameToUse = jsonData["BKSN"]
        _missingPlayer = User.objects.get(username=usernameToUse)
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.checkForHostChange(_missingPlayer)
        currentGame.enableStatsExclude(usernameToUse)
        currentGame.save()
        # Response not used
        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
            },
            safe=False,
        )

    elif jsonData["action"] == "loadRewind":
        if len(currentGame.rewindData) == 0:
            return JsonResponse(
                {
                    "errorMessage": gettext(
                        "No rewind data. Rewind limit reached. Please play on to generate more rewind data"
                    )
                },
                safe=False,
            )

        currentRewindDataArray = json.loads(currentGame.rewindData)
        if len(currentRewindDataArray) == 0:
            return JsonResponse(
                {
                    "errorMessage": gettext(
                        "No rewind data. Rewind limit reached. Please play on to generate more rewind data"
                    )
                },
                safe=False,
            )

        loadData = ""
        if len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()

        while loadData == currentGame.gameData and len(currentRewindDataArray) > 0:
            loadData = currentRewindDataArray.pop()
        currentGame.gameData = loadData

        currentGame.rewindTempData = loadData
        currentGame.rewindData = json.dumps(currentRewindDataArray)

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        return JsonResponse(
            {
                "gameData": loadData,
                "latestUpdate": currentGame.latestUpdate,
                "missingPlayers": currentGame.getMissingPlayersNamesArray(),
            },
            safe=False,
        )
    # ENd LOAD REWIND

    elif jsonData["action"] == "updateDataFromLoadRewind":
        currentGame.turn = jsonData["turn"]
        currentGame.phase = jsonData["phase"]
        currentGame.currentPlayers = jsonData["nextPlayer"]
        currentGame.gameData = jsonData["gameData"]

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        # Send Notifications
        if jsonData["nextPlayer"] != "" and jsonData["nextPlayer"] != "TGZbot" and currentGame.startingOptions != "102":
            playerListToNotify = jsonData["nextPlayer"].split(",")
            if request.user.username in playerListToNotify:
                playerListToNotify.remove(request.user.username)
            if len(playerListToNotify) > 0:
                SN_sendNextTurnNotification(
                    request,
                    "TGZ",
                    playerListToNotify,
                    getattr(currentGame, "id"),
                    currentGame.gameName,
                    currentGame,
                    currentGame.latestUpdate,
                )

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            },
            safe=False,
        )

    elif jsonData["action"] == "kickout":
        if str(jsonData["latestUpdate"]) != "9999999999999" and str(jsonData["latestUpdate"]) != str(
            currentGame.latestUpdate
        ):  # and not jsonData["ignoreSync"]:
            turn = jsonData.get("turn", "N/A")
            phase = jsonData.get("phase", "N/A")
            message = (
                f"SYNC ERROR IN: TGZ kickout - gameID: {jsonData['gameID']} - User: {request.user.username} - JSON_LU: {jsonData['latestUpdate']} "
                f"- DB_LU: {currentGame.latestUpdate} -- JSON_turn: {turn} -- DB_turn: {currentGame.turn} "
                f"-- JSON_phase: {phase} -- DB_phase: {currentGame.phase} -- currentP: {currentGame.currentPlayers}"
            )
            SN_sendAdminErrorMessage(request, message)
            return JsonResponse({"syncError": True}, safe=False)

        _missingPlayer = User.objects.get(username=jsonData["kickedName"])
        currentGame.missingPlayers.add(_missingPlayer)
        currentGame.kickedPlayers.add(_missingPlayer)
        currentGame.checkForHostChange(_missingPlayer)
        currentGame.enableStatsExclude(_missingPlayer.username)

        newVer = (int(currentGame.latestUpdate) % 1000) + 1
        currentGame.latestUpdate = str((int(time.time()) * 1000) + newVer)

        currentGame.save()

        return JsonResponse(
            {
                "latestUpdate": currentGame.latestUpdate,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
            },
            safe=False,
        )

    return JsonResponse({"error": "POST request required."}, status=400)


@login_required()
def bugEntry(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    try:
        currentGame = TGZ_Game.objects.get(id=gameID)
    except TGZ_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    gameData = jsonData["gameData"]
    bugDescription = jsonData["description"]

    # email data to myself
    SN_sendBugReportEmail(
        request, "TGZ", gameID, gameData, bugDescription, currentGame.rewindData, currentGame.startingMap
    )

    return JsonResponse({"bugEntrySuccess": True})


@login_required()
def saveNotes(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = TGZ_Game.objects.get(id=jsonData["gameID"])
    except TGZ_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if currentGame.seatPosition(request.user.username) == 0:
        currentGame.player0notes = jsonData["notes"]
    if currentGame.seatPosition(request.user.username) == 1:
        currentGame.player1notes = jsonData["notes"]
    if currentGame.seatPosition(request.user.username) == 2:
        currentGame.player2notes = jsonData["notes"]
    if currentGame.seatPosition(request.user.username) == 3:
        currentGame.player3notes = jsonData["notes"]
    if currentGame.seatPosition(request.user.username) == 4:
        currentGame.player4notes = jsonData["notes"]

    currentGame.save()

    return JsonResponse({"notePosted": True})


@login_required()
def sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)
    gameID = jsonData["gameID"]

    with db_mutex("sendChatMessage_" + str(gameID)):
        return _sendChatMessage(request)


@login_required()
def _sendChatMessage(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "sendChatMessage":
        currentGame = get_object_or_404(TGZ_Game, id=jsonData["gameID"])
        currentGame.playersWithChatNotification.remove(request.user)

        LZS = lzstring.LZString()
        currentChatData = []
        chat_data = currentGame.chatData
        # if currentGame.chatData != "":
        if chat_data:  # Check if chatData is not None and not empty
            # currentChatData = json.loads(LZS.decompressFromEncodedURIComponent(currentGame.chatData))
            try:
                decompressed_chat_data = LZS.decompressFromEncodedURIComponent(chat_data)
                if decompressed_chat_data:
                    currentChatData = json.loads(decompressed_chat_data)
            except (TypeError, json.JSONDecodeError) as e:
                # Handle potential errors during decompression or JSON parsing
                print(f"Error processing chat data: {e}")
                currentChatData = []  # Or handle the error as appropriate
        currentChatData.insert(0, jsonData["newEntry"])

        # save chat data.
        compressedChatData = LZS.compressToEncodedURIComponent(json.dumps(currentChatData))

        currentGame.chatData = compressedChatData

        # Now add notifications to everyone except request.user
        currentGame.playersWithChatNotification.set(currentGame.allPlayers.all())
        currentGame.playersWithChatNotification.remove(request.user)
        currentGame.save()

        return JsonResponse({"chatData": compressedChatData})

    return JsonResponse({"error": "POST request required."}, status=400)


@login_required
def TGZdata(request, dataType):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    jsonData = json.loads(request.body)

    try:
        currentGame = TGZ_Game.objects.get(id=jsonData["gameID"])
    except TGZ_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))

    if dataType == 1:
        # Send game data
        return JsonResponse(
            {
                "gameData": currentGame.gameData,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
            }
        )
    if dataType == 2:
        # Remove user from notifications
        currentGame.playersWithChatNotification.remove(request.user)
        currentGame.save()
        return JsonResponse(
            {
                "chatData": currentGame.chatData
                # }, safe=False)
            },
            safe=True,
        )
    # Check for update comparison, and update or do nothing
    if dataType == 3:
        gameUpdate = int(jsonData["latestUpdate"])
        latestUpdate = int(currentGame.latestUpdate)
        if gameUpdate == latestUpdate:
            return JsonResponse({"latest": True}, safe=False)
        # Else Send game data
        return JsonResponse(
            {
                "latest": False,
                "gameData": currentGame.gameData,
                "secondsToNextKickout": currentGame.getSecondsToNextKickout(),
                "latestUpdate": currentGame.latestUpdate,
            }
        )

    return JsonResponse({"error": "Wrong request."}, status=400)


@login_required
def changeTGZzoom(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "zoom":
        try:
            currentGame = TGZ_Game.objects.get(id=jsonData["gameID"])
        except TGZ_Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))
        zoomLevels = json.loads(currentGame.zoomLevels)
        zoomLevels[jsonData["playerNumber"]] = int(jsonData["zoomLevel"])
        if jsonData.get("allPlayers"):
            for i in range(len(zoomLevels)):
                zoomLevels[i] = int(jsonData["zoomLevel"])

        currentGame.zoomLevels = json.dumps(zoomLevels)
        currentGame.save()
        return JsonResponse(
            {
                "response": "ok",
            }
        )

    return JsonResponse({"error": "Wrong request."}, status=400)


@login_required
def createTGZspinoff(request):
    if request.method != "POST":
        return JsonResponse({"error": "Wrong request."}, status=400)

    jsonData = json.loads(request.body)

    if jsonData["action"] == "copyGame":
        try:
            currentGame = TGZ_Game.objects.get(id=jsonData["gameID"])
        except TGZ_Game.DoesNotExist:
            raise Http404(gettext("Game does not exist"))

        NgameName = "[Copy] - " + currentGame.gameName
        NgameStatus = "ACTIVE"
        if currentGame.startingOptions != "":
            NstartingOptions = json.loads(currentGame.startingOptions)
        else:
            NstartingOptions = []
        if len(NstartingOptions) == 0 or NstartingOptions[0] != 102:
            NstartingOptions = [102, *NstartingOptions]
        NstartingOptions = json.dumps(NstartingOptions)
        NplayerOrderSeed = currentGame.playerOrderSeed
        NmaxPlayers = currentGame.maxPlayers
        Nturn = jsonData["turn"]
        Nphase = jsonData["phase"]
        NkickoutDuration = currentGame.kickoutDuration
        NgamePace = currentGame.gamePace
        Ncreator = request.user
        Nhost = request.user
        NgameData = jsonData["data"]
        NstatsExcludedGame = True
        # For some reason jsonData["latestUpdate"] didn't come through one time. Use this as a fallback so it doesn't fail
        Ncreated = jsonData["latestUpdate"] if jsonData["latestUpdate"] else SR_getTimeNow()
        NlatestUpdate = jsonData["latestUpdate"] if jsonData["latestUpdate"] else SR_getTimeNow()
        NstartingMap = currentGame.startingMap

        newGame = TGZ_Game(
            gameName=NgameName,
            gameStatus=NgameStatus,
            startingOptions=NstartingOptions,
            startingMap=NstartingMap,
            currentPlayers=request.user.username,
            playerOrderSeed=NplayerOrderSeed,
            maxPlayers=NmaxPlayers,
            turn=Nturn,
            phase=Nphase,
            kickoutDuration=NkickoutDuration,
            gamePace=NgamePace,
            creator=Ncreator,
            host=Nhost,
            gameData=NgameData,
            statsExcludedGame=NstatsExcludedGame,
            created=Ncreated,
            latestUpdate=NlatestUpdate,
        )

        newGame.save()

        newGame.allPlayers.add(request.user)
        newGame.allPlayers.add(User.objects.get(username="SHADOW"))
        if NmaxPlayers >= 3:
            newGame.allPlayers.add(User.objects.get(username="SHADOW_2"))
        if NmaxPlayers >= 4:
            newGame.allPlayers.add(User.objects.get(username="SHADOW_3"))
        if NmaxPlayers >= 5:
            newGame.allPlayers.add(User.objects.get(username="SHADOW_4"))
        newGame.latestUpdate = str(int(time.time()) * 1000)

        rewindDataArray = []
        rewindDataArray.append(NgameData)
        newGame.rewindData = json.dumps(rewindDataArray)

        newGame.save()

        return JsonResponse({"response": "ok", "newID": getattr(newGame, "id")})

    return JsonResponse({"error": "Wrong request."}, status=400)


@login_required
def processStatsExcludeConsent(request):
    if request.method != "PUT":
        return JsonResponse({"error": "Wrong request."}, status=400)
    jsonData = json.loads(request.body)
    try:
        currentGame = TGZ_Game.objects.get(id=jsonData["gameID"])
    except TGZ_Game.DoesNotExist:
        raise Http404(gettext("Game does not exist"))
    currentGame.enableStatsExclude(request.user.username)
    currentGame.save()
    return JsonResponse({"statsExcludedGame": currentGame.statsExcludedGame})


# @login_required
# def TGZstats(request):
#    f = open("./TGZ/TGZstats/TGZ_stats.json")
#    data = json.load(f)
#    PRE_DATA = data[0]
#    G_STATS_DATA = data[1]
#    S_STATS_DATA = data[2]
#
#    timeString = PRE_DATA[0]
#
#    data_2p = data[1]
#    data_3p = data[2]
#    data_4p = data[3]
#    data_tp = data[4]
#    data_5p = data[5]
#
#    data_2p.insert(0, "players2")
#    data_3p.insert(0, "players3")
#    data_4p.insert(0, "players4")
#    data_tp.insert(0, "playerst")
#    data_5p.insert(0, "players5")
#
#    all_data = [data_2p, data_3p, data_4p, data_tp, data_5p]
#
#    f_schism = open("./TGZ/TGZstats/TGZ_stats_schism.json")
#    data_schism = json.load(f_schism)
#    PRE_DATA_schism = data_schism[0]
#    G_STATS_DATA = data_schism[1]
#    S_STATS_DATA = data_schism[2]
#
#    timeString_schism = PRE_DATA_schism[0]
#
#    data_2p_schism = data_schism[1]
#    data_3p_schism = data_schism[2]
#    data_4p_schism = data_schism[3]
#    data_tp_schism = data_schism[4]
#    data_5p_schism = data_schism[5]
#
#    data_2p_schism.insert(0, "players2")
#    data_3p_schism.insert(0, "players3")
#    data_4p_schism.insert(0, "players4")
#    data_tp_schism.insert(0, "playerst")
#    data_5p_schism.insert(0, "players5")
#
#    all_data_schism = [data_2p_schism, data_3p_schism, data_4p_schism, data_tp_schism, data_5p_schism]
#
#    # bar_chart_data = []
#    # for row_god in data[1]:
#    #    bar_chart_data.append({
#    #        'totalHeight': row_god[0],
#    #        'xHeight': row_god[2],
#    #        'yHeight': row_god[1] - row_god[2]
#    #    })
#
#    return render(
#        request,
#        "TGZ/TGZstats.html",
#        {
#            "timeString": timeString,
#            "all_data": all_data,
#            "all_data_schism": all_data_schism,
#        },
#    )


@login_required
def TGZstats(request):
    # Load regular stats
    with open("./TGZ/TGZstats/TGZ_stats.json", "r") as f:
        data = json.load(f)

    timeString = data["time_string"]

    all_data = {}
    for playerCount in [2, 3, 4, 4.5, 5]:
        player_data = data["player_counts"].get(str(playerCount))
        playerCountLabel = playerCount
        if playerCount == 4.5:
            playerCountLabel = "45"
        if player_data:
            seat_wins = player_data.get("seat_wins", [])  
            
            all_data[playerCountLabel] = {
                "finishedGamesCount": player_data["finishedGamesCount"],
                "god_stats": player_data["god_stats"],
                "spec_stats": player_data["spec_stats"],
                "seat_wins": seat_wins,
            }

    # Load schism stats
    with open("./TGZ/TGZstats/TGZ_stats_schism.json", "r") as f_schism:
        data_schism = json.load(f_schism)

    #timeString_schism = data_schism["time_string"]

    all_data_schism = {}
    for playerCount in [2, 3, 4, 4.5, 5]:
        player_data_schism = data_schism["player_counts"].get(str(playerCount))
        playerCountLabel = playerCount
        if playerCount == 4.5:
            playerCountLabel = "45"
        if player_data_schism:
            all_data_schism[playerCountLabel] = {
                "finishedGamesCount": player_data_schism["finishedGamesCount"],
                "god_stats": player_data_schism["god_stats"],
                "spec_stats": player_data_schism["spec_stats"],
            }

    return render(
        request,
        "TGZ/TGZstats.html",
        {
            "timeString": timeString,
            "all_data": all_data,
            "all_data_schism": all_data_schism,
        },
    )


@login_required
def TGZstatGames(request):
    # Post is required
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    # Get the game ids
    gameIDs = json.loads(request.POST["game_ids"])
    
    gameIDs.reverse()

    # Pagination settings
    page = request.POST.get("page", 1)  # Get the current page number from the request
    items_per_page = 20  # Number of games to display per page

    # Get the total count of games BEFORE slicing gameIDs
    total_games_count = len(gameIDs)

    # Initialize paginator and related variables outside the try block
    paginator = Paginator(gameIDs, items_per_page)
    gameIDs_page = []
    num_pages = 1  # Default to 1 page if there are no games

    # Slice gameIDs for the current page
    try:
        gameIDs_page = paginator.page(page).object_list  # Get the gameIDs for the current page
        num_pages = paginator.num_pages
    except PageNotAnInteger:
        # If page is not an integer, deliver first page.
        gameIDs_page = paginator.page(1).object_list
        page = 1
        num_pages = paginator.num_pages
    except EmptyPage:
        # If page is out of range (e.g. 9999), deliver last page of results.
        gameIDs_page = paginator.page(paginator.num_pages).object_list
        page = paginator.num_pages
        num_pages = paginator.num_pages

    # Filter the games for the current page ONLY   
    finishedGames = TGZ_Game.objects.filter(id__in=gameIDs_page).order_by("-latestUpdate").select_related("creator__profile", "creator", "winner").prefetch_related("allPlayers", "missingPlayers", "invitedPlayers", "playersWithChatNotification")

#    def serializeLocal(game):
#        winner = game.winner.username if game.winner else None  # Handle cases where there is no winner
#
#        latestUpdateString = str(game.latestUpdate)
#
#        latestUpdateElapsedTimeString = ""  # You can calculate this if needed
#
#        # startingOptionsHTML = SR_getTGZstartingOptionsHTML(game.startingOptions)
#
#        return {
#            "gameID": game.id,
#            "gameName": game.getGameName(),
#            # "creator": game.creator.username,
#            "allPlayers": [user.username for user in game.allPlayers.all()],
#            "currentTurn": game.currentTurnString(),
#            "latestUpdate": latestUpdateString,
#            "startingOptions": "",
#            "maxPlayers": game.maxPlayers,
#            "winner": winner,  # Used for Finished Games
#            "game": "TGZ",
#        }

    # Serialize ONLY the games for the current page
    finishedGamesListJson = [SF_fastSerializeGame(game, request.user) for game in finishedGames]

    return render(
        request,
        "TGZ/TGZstatGames.html",
        {
            "finishedGamesList": finishedGamesListJson,
            "page": int(page),
            "num_pages": num_pages,
            "total_games_count": total_games_count,  # Pass the total count to the template
            "game_ids_json": request.POST["game_ids"],  # Pass the game_ids back to the
        },
    )
