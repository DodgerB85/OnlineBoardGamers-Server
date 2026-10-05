import json
import random
from typing import TYPE_CHECKING, cast

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils.translation import gettext

from Lobby.models import Game, GamePlayer, User
from Lobby.sharedFunctions.sharedFunctions import (
    SF_getGameCreationJsonReturn,
    SF_setupTrainingGameShadows,
)
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from . import CNSconstants as rfCNS

if TYPE_CHECKING:
    from Lobby.presenters import CNSpresenter


@login_required()
def create_cns_game(
    request,
    tournamentObj=None,
    tournamentGameName=None,
    current_players_usernames=None,
):
    """Create a CNS game, either for a tournament or regular play."""
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
    player_order_seed = random.randint(1000, 32767)
    all_players = []

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

        game_status = "ACTIVE"

        # Mini tournament games can have fewer players than maxGamePlayers
        max_players = len(current_players_usernames) if is_mini_tournament and current_players_usernames else tournamentObj.maxGamePlayers

        all_players = [User.objects.get(username=username) for username in (current_players_usernames or []) if username]

    # Else setup normal Options
    else:
        players = ["player2", "player3", "player4"]
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
                    return HttpResponseRedirect(reverse("createCNSpage"))
                if username == request.user.username:
                    messages.error(request, gettext("Error: You cannot add yourself"))
                    return HttpResponseRedirect(reverse("createCNSpage"))

        game_description = request.POST["gameDescription"]
        max_players = int(request.POST.get("playerNumber", "2"))
        game_pace = request.POST["pace"]
        creator = request.user
        host = request.user
        game_name = request.POST["gameName"]
        kickout_duration = request.POST["kickoutDuration"]

        if "trainingGame" in request.POST:
            starting_options.append(int(request.POST["trainingGame"]))
        if "useExpansion" in request.POST:
            starting_options.append(int(request.POST["useExpansion"]))
        if "tableSizeRadio" in request.POST:
            starting_options.append(int(request.POST.get("tableSizeRadio")))
        if "tableJunkRadio" in request.POST:
            starting_options.append(int(request.POST.get("tableJunkRadio")))
        if "learningGame" in request.POST:
            starting_options.append(int(request.POST.get("learningGame")))
        if "experiencedGame" in request.POST:
            starting_options.append(int(request.POST.get("experiencedGame")))

        if "trainingGame" in request.POST:
            game_status = "ACTIVE"
            stats_exclude = True
            shadow_users, shadowNameNotes = SF_setupTrainingGameShadows(request, max_players)
            all_players.append(request.user)
            all_players.extend(shadow_users)
        else:
            all_players.append(request.user)
            for i in range(2, max_players + 1):
                player_username = request.POST.get(f"player{i}", "")
                if player_username:
                    newPlayer = get_object_or_404(User, username=player_username)
                    invited_usernames_objs.append(newPlayer)
                    usernames_to_notify.append(newPlayer.username)
            if usernames_to_notify:
                game_status = "WAITING"

        if "learningGame" in request.POST:
            stats_exclude = True

    if "privateGame" in request.POST:
        game_status = "PRIVATE"

    with transaction.atomic():
        new_game = Game(
            gameCode="CNS",
            gameName=game_name,
            gameDescription=game_description,
            creator=creator,
            host=host,
            gamePace=game_pace,
            turn=1,
            phase=rfCNS.PHASE_PLACE_HEXES,
            created=created_time,
            latestUpdate=created_time,
            maxPlayers=max_players,
            gameStatus=game_status,
            kickoutDuration=kickout_duration,
            zoomLevels=json.dumps([24] * max_players),
            statsExcludedGame=stats_exclude,
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
        if is_main_tournament or is_mini_tournament or "trainingGame" in request.POST:
            presenter = cast("CNSpresenter", new_game.presenter())
            presenter.startGame(request)

    # Tournament games return the game id
    if is_main_tournament or is_mini_tournament:
        return new_game.id

    # Normal Game Notifications
    if usernames_to_notify:
        presenter = cast("CNSpresenter", new_game.presenter())
        presenter.sendInviteNotifications(
            usernames_to_notify,
            new_game.presenter().getGameName(),
            max_players,
            "CNS",
        )

    if "trainingGame" in request.POST:
        messages.success(request, gettext("Your Practice game has started"))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))

    messages.success(request, SF_getGameCreationJsonReturn("CNS", new_game.id))
    return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))
