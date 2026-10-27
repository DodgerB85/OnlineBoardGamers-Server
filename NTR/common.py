import json
import random
from typing import TYPE_CHECKING, cast

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.utils.translation import gettext

from Lobby.models import Game, GamePlayer, User
from Lobby.sharedFunctions.sharedFunctions import (
    SF_getGameCreationJsonReturn,
    SF_setupTrainingGameShadows,
    SF_validatePlayers,
)
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow
import Lobby.sharedFunctions.constants as rf
from . import NTRconstants as rfNTR


@login_required()
def create_ntr_game(
    request,
    tournamentObj=None,
    tournamentGameName=None,
    current_players_usernames=None,
):
    """
    Create an NTR game, either for a tournament or regular play.
    Supports 2-8 players (2 default, up to 8 with SO_TEAM_PLAY).
    """
    is_main_tournament = tournamentObj and tournamentObj.tournamentCategory == "Main"
    is_mini_tournament = tournamentObj and tournamentObj.tournamentCategory == "Mini"

    if not is_main_tournament and not is_mini_tournament and request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    # Initialize game parameters
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
    starting_map = ""
    shadowNameNotes = ""
    usernames_to_notify = []
    invited_usernames_objs = []
    stats_exclude = False
    player_order_seed = random.randint(1000, 32767)
    all_players = []
    invited_usernames = []

    # Default scenario slug
    scenario_slug = "dec_01"
    team_play = False

    # Setup Tournament Options
    if is_main_tournament or is_mini_tournament:
        if not tournamentObj or not tournamentGameName:
            raise ValueError("Tournament and tournamentGameName required for tournament games")
        game_name = tournamentGameName
        game_description = ""
        creator = User.objects.get(username="admin")
        host = creator
        game_pace = 30
        kickout_duration = 50
        starting_options = json.loads(tournamentObj.startingOptions) if tournamentObj.startingOptions != "" else []
        scenario_slug = "dec_01"  # default for tournaments, could be from tournament options
        team_play = rfNTR.SO_TEAM_PLAY in starting_options

        game_status = "ACTIVE"

        if is_mini_tournament and current_players_usernames:
            max_players = len(current_players_usernames)

        all_players = [User.objects.get(username=username) for username in (current_players_usernames or []) if username]
        usernames_to_notify = [username for username in (current_players_usernames or []) if username]

    # Else setup normal Options
    else:
        game_name = request.POST.get("gameName", "")
        game_description = request.POST.get("gameDescription", "")
        creator = request.user
        host = request.user
        game_pace = request.POST.get("pace", 40)
        kickout_duration = request.POST.get("kickoutDuration", 100)
        scenario_slug = request.POST.get("scenario", "dec_01")
        team_play = "teamPlay" in request.POST

        invited_usernames = [request.POST.get(f"player{i}") for i in range(2, 9) if request.POST.get(f"player{i}")]

        isTrainingGame = False
        if "trainingGame" in request.POST:
            isTrainingGame = True
        if max_players == 1:
            isTrainingGame = True

        if team_play:
            max_players = 8
        else:
            max_players = int(request.POST.get("playerNumber", "2"))

        if not isTrainingGame:
            invited_usernames_objs = SF_validatePlayers(request, invited_usernames, max_players, allow_creator=False)
            if invited_usernames_objs is None:
                return HttpResponseRedirect(reverse("createNTRpage"))

            if len(invited_usernames_objs) > 0:
                game_status = "WAITING"
                usernames_to_notify = [user.username for user in invited_usernames_objs]

        if isTrainingGame:
            starting_options.append(rf.SO_TRAINING_GAME)
            game_status = "ACTIVE"
            stats_exclude = True
            if max_players > 1:
                shadow_users, shadowNameNotes = SF_setupTrainingGameShadows(request, max_players)
                all_players.extend(shadow_users)
        elif "learningGame" in request.POST:
            starting_options.append(rf.SO_LEARNING_GAME)
            stats_exclude = True
        elif "experiencedGame" in request.POST:
            starting_options.append(rf.SO_EXPERIENCED_GAME)
            stats_exclude = True

        # Custom NTR options
        if "frenchReinforcements" in request.POST:
            starting_options.append(rfNTR.SO_FRENCH_REINFORCEMENTS)
        if "santonFort" in request.POST:
            starting_options.append(rfNTR.SO_SANTON_FORT)
        if team_play:
            starting_options.append(rfNTR.SO_TEAM_PLAY)

        all_players.append(request.user)

    # Build starting map data - just pass scenario slug and options
    # Client will build full initial game state on first load
    options = {
        "french_reinforcements": rfNTR.SO_FRENCH_REINFORCEMENTS in starting_options,
        "santon_fort": rfNTR.SO_SANTON_FORT in starting_options,
        "team_play": team_play,
    }
    starting_map = json.dumps({
        "scenario": scenario_slug,
        "options": options,
        "version": 1,
    })

    with transaction.atomic():
        new_game = Game(
            gameCode="NTR",
            gameName=game_name,
            gameDescription=game_description,
            creator=creator,
            host=host,
            gamePace=game_pace,
            turn=1,
            phase=rfNTR.PHASE_ALLIED_TURN,
            created=created_time,
            latestUpdate=created_time,
            maxPlayers=max_players,
            gameStatus=game_status,
            kickoutDuration=kickout_duration,
            zoomLevels=json.dumps([16] * max_players),
            statsExcludedGame=stats_exclude,
            startingMap=starting_map,
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

        # Add invited players M2M
        for player in invited_usernames_objs:
            new_game.invitedPlayers.add(player)

        # Create GamePlayer instances for all players
        for idx, player in enumerate(all_players):
            GamePlayer.objects.create(
                game=new_game,
                player=player,
                seat_order=idx,
                notes=shadowNameNotes if player == request.user else "",
            )

        # Fix zoomLevels array size to match actual number of players
        actual_player_count = len(all_players)
        current_zoom_levels = json.loads(new_game.zoomLevels)
        if len(current_zoom_levels) != actual_player_count:
            new_game.zoomLevels = json.dumps([16] * actual_player_count)
            new_game.save()

        # Start pre-populated games
        if is_main_tournament or is_mini_tournament or isTrainingGame:
            presenter = cast("NTRpresenter", new_game.presenter())
            presenter.startGame(request)

    # Tournament games return the game id
    if is_main_tournament or is_mini_tournament:
        return new_game.id

    # Normal Game Notifications
    if usernames_to_notify:
        presenter = cast("NTRpresenter", new_game.presenter())
        presenter.sendInviteNotifications(
            usernames_to_notify,
            new_game.presenter().getGameName(),
            max_players,
            "NTR",
        )

    # Training Game return
    if isTrainingGame:
        messages.success(request, gettext("Your Practice game has started"))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))

    # Otherwise, return normal game creation
    messages.success(request, SF_getGameCreationJsonReturn("NTR", new_game.id))
    return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))