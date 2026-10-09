import json
import random
from typing import TYPE_CHECKING, cast

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.utils.translation import gettext

import Lobby.sharedFunctions.constants as rf
from Lobby.models import Game, GamePlayer, User
from Lobby.sharedFunctions.sharedFunctions import (
    SF_getGameCreationJsonReturn,
    SF_setupTrainingGameShadows,
    SF_validatePlayers,
)
from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
)

if TYPE_CHECKING:
    from Lobby.presenters import ROWpresenter

from . import ROWconstants as rfROW


@login_required()
def create_row_game(
    request,
    tournamentObj=None,
    tournamentGameName=None,
    current_players_usernames=None,
):
    """
    Create a Ranchers of the Old West game, either for a tournament or regular play.

    This mirrors the shared creation flow used by the other games so that the
    lobby / tournament / notification plumbing all behaves the same. ROW-specific
    options should be added to the ``starting_options`` block below.
    """
    is_main_tournament = tournamentObj and tournamentObj.tournamentCategory == "Main"
    is_mini_tournament = tournamentObj and tournamentObj.tournamentCategory == "Mini"

    if not is_main_tournament and not is_mini_tournament and request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    def get_max_players(post_data):
        """Determine max players based on playerNumber or tournament."""
        if "playerNumber" in post_data:
            return int(post_data.get("playerNumber", 2))
        if tournamentObj is not None and (is_main_tournament or is_mini_tournament):
            return tournamentObj.maxGamePlayers
        return 2

    #############################################
    #
    # Regular game creation
    #
    ###############################################
    game_name = ""
    game_description = ""
    creator = None
    host = None
    game_pace = 30
    created_time = SR_getTimeNow()
    starting_options = []
    max_players = 2
    game_status = "AVAILABLE"
    kickout_duration = 100
    shadowNameNotes = ""
    usernames_to_notify = []
    invited_usernames = []
    stats_exclude = False
    player_order_seed = random.randint(1000, 32767)
    all_players = []
    invited_usernames_objs = []
    isTrainingGame = False

    max_players = get_max_players(request.POST)
    # ROW supports 2-4 players; clamp in case the lobby posts a larger number.
    if max_players > 4:
        max_players = 4

    if is_main_tournament or is_mini_tournament:
        if not tournamentObj or not tournamentGameName:
            raise ValueError("Tournament and tournamentGameName required for tournament games")
        game_name = tournamentGameName
        creator = User.objects.get(username="admin")
        host = creator
        game_pace = 30
        kickout_duration = 50
        starting_options = json.loads(tournamentObj.startingOptions) if tournamentObj.startingOptions != "" else []
        game_status = "ACTIVE"
        all_players = [User.objects.get(username=username) for username in (current_players_usernames or []) if username]
        usernames_to_notify = [username for username in (current_players_usernames or []) if username]
    else:
        game_name = request.POST.get("gameName", "")
        game_description = request.POST.get("gameDescription", "")
        creator = request.user
        host = request.user
        game_pace = request.POST.get("pace", 30)
        kickout_duration = request.POST.get("kickoutDuration", 100)
        invited_usernames = [request.POST.get(f"player{i}") for i in range(2, 5) if request.POST.get(f"player{i}")]

        if "trainingGame" in request.POST:
            isTrainingGame = True
        if max_players == 1:
            isTrainingGame = True

        if not isTrainingGame:
            invited_usernames_objs = SF_validatePlayers(request, invited_usernames, max_players, allow_creator=False)
            if invited_usernames_objs is None:
                return HttpResponseRedirect(reverse("createROWpage"))
            if len(invited_usernames_objs) > 0:
                game_status = "WAITING"
                usernames_to_notify = [user.username for user in invited_usernames_objs]

        if isTrainingGame:
            starting_options.append(rf.SO_TRAINING_GAME)
            game_status = "ACTIVE"
            stats_exclude = True
            # Only add shadow users for multi-player training games
            if max_players > 1:
                shadow_users, shadowNameNotes = SF_setupTrainingGameShadows(request, max_players)
                all_players.extend(shadow_users)
        elif "learningGame" in request.POST:
            starting_options.append(rf.SO_LEARNING_GAME)
            stats_exclude = True
        elif "experiencedGame" in request.POST:
            starting_options.append(rf.SO_EXPERIENCED_GAME)

        # ROW-specific options.
        if request.POST.get("edition", "FIRST") == "SECOND":
            starting_options.append(rfROW.SO_SECOND_EDITION)
            # Java's GWT2Provider is the only one that reads the simmental flag.
            if request.POST.get("simmental"):
                starting_options.append(rfROW.SO_SIMMENTAL)
        if request.POST.get("railsToTheNorth"):
            starting_options.append(rfROW.SO_RTTN)
        if request.POST.get("mode") == "STRATEGIC":
            starting_options.append(rfROW.SO_MODE_STRATEGIC)
        if request.POST.get("buildings") == "BEGINNER":
            starting_options.append(rfROW.SO_BUILDINGS_BEGINNER)
        if request.POST.get("playerOrder") == "BIDDING":
            starting_options.append(rfROW.SO_PLAYER_ORDER_BIDDING)
        if request.POST.get("variant") == "BALANCED":
            starting_options.append(rfROW.SO_VARIANT_BALANCED)
        if request.POST.get("stationMasterPromos"):
            starting_options.append(rfROW.SO_STATION_MASTER_PROMOS)
        if request.POST.get("building11"):
            starting_options.append(rfROW.SO_BUILDING_11)
        if request.POST.get("building13"):
            starting_options.append(rfROW.SO_BUILDING_13)

        all_players.append(request.user)

    with transaction.atomic():
        new_game = Game(
            gameCode="ROW",
            gameName=game_name,
            gameDescription=game_description,
            creator=creator,
            host=host,
            gamePace=game_pace,
            turn=1,
            phase=rfROW.PHASE_MAIN,
            created=created_time,
            latestUpdate=created_time,
            maxPlayers=max_players,
            gameStatus=game_status,
            kickoutDuration=kickout_duration,
            zoomLevels=json.dumps([16] * max_players),
            statsExcludedGame=stats_exclude,
            startingOptions=json.dumps(starting_options),
            playerOrderSeed=player_order_seed,
        )
        if "privateGame" in request.POST:
            new_game.gameStatus = "PRIVATE"

        if is_main_tournament:
            new_game.relatedMainTournament = tournamentObj
        if is_mini_tournament:
            new_game.relatedMiniTournament = tournamentObj

        new_game.save()

        for player in invited_usernames_objs:
            new_game.invitedPlayers.add(player)

        for idx, player in enumerate(all_players):
            GamePlayer.objects.create(
                game=new_game,
                player=player,
                seat_order=idx,
                notes=shadowNameNotes if player == request.user else "",
            )

        actual_player_count = len(all_players)
        current_zoom_levels = json.loads(new_game.zoomLevels)
        if len(current_zoom_levels) != actual_player_count:
            new_game.zoomLevels = json.dumps([16] * actual_player_count)
            new_game.save()

        if is_main_tournament or is_mini_tournament or isTrainingGame:
            presenter = cast("ROWpresenter", new_game.presenter())
            presenter.startGame(request)

    if is_main_tournament or is_mini_tournament:
        return new_game.id

    if usernames_to_notify:
        presenter = cast("ROWpresenter", new_game.presenter())
        presenter.sendInviteNotifications(
            usernames_to_notify,
            new_game.presenter().getGameName(),
            max_players,
            "ROW",
        )

    if max_players == 1:
        messages.success(request, gettext("Your Solo Challenge has started"))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))

    elif isTrainingGame:
        messages.success(request, gettext("Your Practice game has started"))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))

    messages.success(request, SF_getGameCreationJsonReturn("ROW", new_game.id))
    return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))
