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

from . import LBRconstants as rfLBR

if TYPE_CHECKING:
    from Lobby.presenters import LBRpresenter


def get_ai_seat_user(seat):
    """The User that holds AI seat `seat` (1-based). Never notifies or logs in."""
    username = rfLBR.AI_USERNAMES[seat - 1]
    user, _ = User.objects.get_or_create(username=username, defaults={"is_active": False})
    return user


@login_required()
def create_lbr_game(
    request,
    tournamentObj=None,
    tournamentGameName=None,
    current_players_usernames=None,
):
    """Create an LBR game, either for a tournament or regular play."""
    is_main_tournament = tournamentObj and tournamentObj.tournamentCategory == "Main"
    is_mini_tournament = tournamentObj and tournamentObj.tournamentCategory == "Mini"

    if not is_main_tournament and not is_mini_tournament and request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

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
    all_players = []  # (User, is_ai) in seat order

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
        max_players = len(current_players_usernames) if is_mini_tournament and current_players_usernames else tournamentObj.maxGamePlayers
        all_players = [(User.objects.get(username=username), False) for username in (current_players_usernames or []) if username]
    else:
        game_description = request.POST["gameDescription"]
        creator = request.user
        host = request.user
        game_name = request.POST["gameName"]
        game_pace = request.POST["pace"]
        kickout_duration = request.POST["kickoutDuration"]
        max_players = int(request.POST.get("playerNumber", "2"))
        if max_players < rfLBR.MIN_PLAYERS or max_players > rfLBR.MAX_PLAYERS:
            messages.error(request, gettext("Land Between Rivers is for 2 to 4 players"))
            return HttpResponseRedirect(reverse("createLBRpage"))

        is_training_game = "trainingGame" in request.POST
        # Practice games are hotseat and use the SHADOW seats; per-seat AI is for
        # normal games, where any seat (including the creator's) can be the AI.
        ai_seats = set() if is_training_game else {seat for seat in range(1, max_players + 1) if request.POST.get(f"ai{seat}")}

        if is_training_game:
            starting_options.append(rf.SO_TRAINING_GAME)
            game_status = "ACTIVE"
            stats_exclude = True
            shadow_users, shadowNameNotes = SF_setupTrainingGameShadows(request, max_players)
            all_players.append((request.user, False))
            all_players.extend((shadow_user, False) for shadow_user in shadow_users)
        else:
            usernames = [
                request.POST.get(f"player{seat}", "")
                for seat in range(2, max_players + 1)
                if seat not in ai_seats
            ]
            invited_usernames_objs = SF_validatePlayers(
                request,
                [username for username in usernames if username],
                max_players - len(ai_seats),
                allow_creator=False,
            )
            if invited_usernames_objs is None:
                return HttpResponseRedirect(reverse("createLBRpage"))
            for seat in range(1, max_players + 1):
                if seat in ai_seats:
                    all_players.append((get_ai_seat_user(seat), True))
                elif seat == 1:
                    all_players.append((request.user, False))
            usernames_to_notify = [user.username for user in invited_usernames_objs]
            if usernames_to_notify:
                game_status = "WAITING"
            if len(all_players) == max_players:
                game_status = "ACTIVE"

        if "learningGame" in request.POST:
            starting_options.append(rf.SO_LEARNING_GAME)
            stats_exclude = True
        if "experiencedGame" in request.POST:
            starting_options.append(rf.SO_EXPERIENCED_GAME)
            stats_exclude = True
        if "privateGame" in request.POST:
            game_status = "PRIVATE"

    with transaction.atomic():
        new_game = Game(
            gameCode="LBR",
            gameName=game_name,
            gameDescription=game_description,
            creator=creator,
            host=host,
            gamePace=game_pace,
            turn=1,
            phase=rfLBR.PHASE_TURN,
            created=created_time,
            latestUpdate=created_time,
            maxPlayers=max_players,
            gameStatus=game_status,
            kickoutDuration=kickout_duration,
            zoomLevels=json.dumps([0] * max_players),
            statsExcludedGame=stats_exclude,
            startingOptions=json.dumps(starting_options),
            playerOrderSeed=player_order_seed,
        )

        if is_main_tournament:
            new_game.relatedMainTournament = tournamentObj
        if is_mini_tournament:
            new_game.relatedMiniTournament = tournamentObj

        new_game.save()

        for player in invited_usernames_objs:
            new_game.invitedPlayers.add(player)

        for idx, (player, is_ai) in enumerate(all_players):
            GamePlayer.objects.create(
                game=new_game,
                player=player,
                seat_order=idx,
                is_ai=is_ai,
                notes=shadowNameNotes if player == request.user else "",
            )

        starts_now = is_main_tournament or is_mini_tournament or "trainingGame" in request.POST or len(all_players) == max_players
        if starts_now:
            presenter = cast("LBRpresenter", new_game.presenter())
            presenter.startGame(request)

    if is_main_tournament or is_mini_tournament:
        return new_game.id

    if usernames_to_notify:
        presenter = cast("LBRpresenter", new_game.presenter())
        presenter.sendInviteNotifications(
            usernames_to_notify,
            new_game.presenter().getGameName(),
            max_players,
            "LBR",
        )

    if starts_now:
        from LBR.ai_worker import schedule_ai_turn

        schedule_ai_turn(new_game.id)

    if "trainingGame" in request.POST:
        messages.success(request, gettext("Your Practice game has started"))
        return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current"}))

    messages.success(request, SF_getGameCreationJsonReturn("LBR", new_game.id))
    return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))
