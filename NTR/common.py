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
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from . import NTRconstants as rfNTR

if TYPE_CHECKING:
    from Lobby.presenters import NTRpresenter


@login_required()
def create_ntr_game(
    request,
    tournamentObj=None,
    tournamentGameName=None,
    current_players_usernames=None,
):
    """Create an NTR game, either for a tournament or regular play."""
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
    shadowNameNotes = ""
    usernames_to_notify = []
    invited_usernames_objs = []
    stats_exclude = False
    is_training_game = False
    player_order_seed = random.randint(1000, 32767)
    all_players = []

    # Setup Tournament Options
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

        # Mini tournament games can have fewer players than maxGamePlayers
        max_players = len(current_players_usernames) if is_mini_tournament and current_players_usernames else tournamentObj.maxGamePlayers

        all_players = [User.objects.get(username=username) for username in (current_players_usernames or []) if username]

    # Else setup normal Options
    else:
        game_description = request.POST["gameDescription"]
        creator = request.user
        host = request.user
        game_name = request.POST["gameName"]
        game_pace = request.POST["pace"]
        kickout_duration = request.POST["kickoutDuration"]

        # Practice is one human against one bot; the shared shadow accounts cannot
        # fill a 4 or 8 seat team game.
        is_training_game = "trainingGame" in request.POST
        team_play = "teamPlay" in request.POST and not is_training_game
        max_players = int(request.POST.get("playerNumber", "2"))
        if team_play and max_players == 2:
            max_players = 4

        scenario = int(request.POST.get("scenario", rfNTR.DEFAULT_SCENARIO))
        starting_options.append(scenario if scenario in rfNTR.SCENARIO_SLUGS else rfNTR.DEFAULT_SCENARIO)

        if is_training_game:
            starting_options.append(rf.SO_TRAINING_GAME)
            game_status = "ACTIVE"
            stats_exclude = True
            max_players = 2
            shadow_users, shadowNameNotes = SF_setupTrainingGameShadows(request, max_players)
            all_players.append(request.user)
            all_players.extend(shadow_users)
        else:
            usernames = [request.POST.get(f"player{i}", "") for i in range(2, 9)]
            invited_usernames_objs = SF_validatePlayers(request, [username for username in usernames if username], max_players, allow_creator=False)
            if invited_usernames_objs is None:
                return HttpResponseRedirect(reverse("createNTRpage"))
            all_players.append(request.user)
            usernames_to_notify = [user.username for user in invited_usernames_objs]
            if usernames_to_notify:
                game_status = "WAITING"

        if "learningGame" in request.POST:
            starting_options.append(rf.SO_LEARNING_GAME)
            stats_exclude = True
        if "experiencedGame" in request.POST:
            starting_options.append(rf.SO_EXPERIENCED_GAME)
            stats_exclude = True
        if "frenchReinforcements" in request.POST:
            starting_options.append(rfNTR.SO_FRENCH_REINFORCEMENTS)
        if "santonFort" in request.POST:
            starting_options.append(rfNTR.SO_SANTON_FORT)
        if team_play:
            starting_options.append(rfNTR.SO_TEAM_PLAY)

        if "privateGame" in request.POST:
            game_status = "PRIVATE"

    # The client builds the opening position from this, and reads the option set
    # from startingOptions afterwards.
    scenario_option = next((option for option in starting_options if option in rfNTR.SCENARIO_SLUGS), rfNTR.DEFAULT_SCENARIO)
    starting_map = json.dumps(
        {
            "scenario": rfNTR.SCENARIO_SLUGS[scenario_option],
            "options": {
                "french_reinforcements": rfNTR.SO_FRENCH_REINFORCEMENTS in starting_options,
                "santon_fort": rfNTR.SO_SANTON_FORT in starting_options,
                "team_play": rfNTR.SO_TEAM_PLAY in starting_options,
            },
            "version": 1,
        }
    )

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

        # Start pre-populated games
        if is_main_tournament or is_mini_tournament or is_training_game:
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

    if is_training_game:
        messages.success(request, gettext("Your Practice game has started"))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))

    messages.success(request, SF_getGameCreationJsonReturn("NTR", new_game.id))
    return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))
