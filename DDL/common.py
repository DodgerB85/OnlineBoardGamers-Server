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
from Lobby.models import Game, GamePlayer
from Lobby.sharedFunctions.sharedFunctions import (
    SF_getGameCreationJsonReturn,
    SF_setupTrainingGameShadows,
    SF_validatePlayers,
)
from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
)

if TYPE_CHECKING:
    from Lobby.presenters import DDLpresenter

from . import DDLconstants as rfDDL


@login_required()
def create_ddl_game(request):
    """Create a Duck Dealer game from the create page POST."""
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    max_players = max(3, min(5, int(request.POST.get("playerNumber", 3))))

    starting_options = []
    usernames_to_notify = []
    invited_usernames_objs = []
    shadow_name_notes = ""
    all_players = []
    is_training_game = "trainingGame" in request.POST
    stats_exclude = False
    game_status = "AVAILABLE"

    invited_usernames = [request.POST.get(f"player{i}") for i in range(2, 6) if request.POST.get(f"player{i}")]

    if not is_training_game:
        invited_usernames_objs = SF_validatePlayers(request, invited_usernames, max_players, allow_creator=False)
        if invited_usernames_objs is None:
            return HttpResponseRedirect(reverse("createDDLpage"))
        if invited_usernames_objs:
            game_status = "WAITING"
            usernames_to_notify = [user.username for user in invited_usernames_objs]

    if is_training_game:
        starting_options.append(rf.SO_TRAINING_GAME)
        game_status = "ACTIVE"
        stats_exclude = True
        shadow_users, shadow_name_notes = SF_setupTrainingGameShadows(request, max_players)
        all_players.extend(shadow_users)
    elif "learningGame" in request.POST:
        starting_options.append(rf.SO_LEARNING_GAME)
        stats_exclude = True
    elif "experiencedGame" in request.POST:
        starting_options.append(rf.SO_EXPERIENCED_GAME)

    # Practice games drive every seat from one browser, so they skip the auction.
    if "startingOptionAuction" in request.POST and not is_training_game:
        starting_options.append(rfDDL.SO_AUCTION)

    all_players.append(request.user)

    created_time = SR_getTimeNow()

    with transaction.atomic():
        new_game = Game(
            gameCode="DDL",
            gameName=request.POST.get("gameName", ""),
            gameDescription=request.POST.get("gameDescription", ""),
            creator=request.user,
            host=request.user,
            gamePace=request.POST.get("pace", 30),
            turn=1,
            phase=rfDDL.PHASE_SETUP,
            created=created_time,
            latestUpdate=created_time,
            maxPlayers=max_players,
            gameStatus="PRIVATE" if "privateGame" in request.POST else game_status,
            kickoutDuration=request.POST.get("kickoutDuration", 100),
            zoomLevels=json.dumps([16] * max_players),
            statsExcludedGame=stats_exclude,
            startingOptions=json.dumps(starting_options),
            playerOrderSeed=random.randint(1000, 32767),
        )
        new_game.save()

        for player in invited_usernames_objs:
            new_game.invitedPlayers.add(player)

        for idx, player in enumerate(all_players):
            GamePlayer.objects.create(
                game=new_game,
                player=player,
                seat_order=idx,
                notes=shadow_name_notes if player == request.user else "",
            )

        if is_training_game:
            presenter = cast("DDLpresenter", new_game.presenter())
            presenter.startGame(request)

    if usernames_to_notify:
        presenter = cast("DDLpresenter", new_game.presenter())
        presenter.sendInviteNotifications(
            usernames_to_notify,
            presenter.getGameName(),
            max_players,
            "DDL",
        )

    messages.success(request, gettext("Your Practice game has started") if is_training_game else SF_getGameCreationJsonReturn("DDL", new_game.id))
    return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "current" if is_training_game else "waiting"}))
