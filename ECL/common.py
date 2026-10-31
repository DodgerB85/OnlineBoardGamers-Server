import json
import random

from django.contrib import messages
from django.db import transaction
from django.http import HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.utils.translation import gettext

from Lobby.models import Game, GamePlayer
from Lobby.sharedFunctions.sharedFunctions import (
    SF_getGameCreationJsonReturn,
    SF_validatePlayers,
)
from Lobby.sharedFunctions.sharedRefs import SR_getTimeNow

from .ECLconstants import OPTION_CHOICES
from .models import ECLgameLink


def create_ecl_game(request):
    """Create an OBG lobby game.

    The bot game and Discord channels are created on start, when every seat has
    accepted, so a declined invitation cannot leave a ghost seat in Discord.
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    game_name = request.POST.get("gameName", "").strip() or gettext("Eclipse Game")
    game_description = request.POST.get("gameDescription", "")
    game_pace = request.POST.get("pace", "30")
    kickout_duration = "100000"  # Eclipse timeouts are the bot's; keep OBG kickouts off.
    try:
        max_players = int(request.POST.get("playerNumber", "2"))
    except ValueError:
        max_players = 2
    if max_players < 2 or max_players > 9:
        messages.error(request, gettext("Eclipse games need 2 to 9 players"))
        return HttpResponseRedirect(reverse("createECLpage"))
    if request.POST.get("hyperlanes") and max_players not in (4, 5):
        messages.error(request, gettext("Hyperlanes need 4 or 5 players"))
        return HttpResponseRedirect(reverse("createECLpage"))
    if request.POST.get("alliances") and max_players < 4:
        messages.error(request, gettext("Alliances need at least 4 players"))
        return HttpResponseRedirect(reverse("createECLpage"))

    usernames = []
    for seat in range(2, max_players + 1):
        username = request.POST.get(f"player{seat}", "")
        if username:
            usernames.append(username)

    invited_users = SF_validatePlayers(request, usernames, max_players, allow_creator=False)
    if invited_users is None:
        return HttpResponseRedirect(reverse("createECLpage"))

    players = [request.user, *invited_users]
    discord_ids = []
    for player in players:
        discord_id = getattr(player.profile, "discord_id", "")
        if not discord_id:
            messages.error(
                request,
                gettext("%(player)s has not linked Discord. Every Eclipse player must link Discord in their profile.")
                % {"player": player.username},
            )
            return HttpResponseRedirect(reverse("createECLpage"))
        if str(discord_id) in discord_ids:
            messages.error(request, gettext("Two Eclipse players cannot share the same Discord account"))
            return HttpResponseRedirect(reverse("createECLpage"))
        discord_ids.append(str(discord_id))

    starting_options = [option for key, option in OPTION_CHOICES if request.POST.get(key)]
    game_status = "WAITING" if invited_users else "AVAILABLE"
    if request.POST.get("privateGame"):
        game_status = "PRIVATE"

    created_time = SR_getTimeNow()
    with transaction.atomic():
        new_game = Game(
            gameCode="ECL",
            gameName=game_name,
            gameDescription=game_description,
            creator=request.user,
            host=request.user,
            gamePace=game_pace,
            turn=1,
            phase=0,
            created=created_time,
            latestUpdate=created_time,
            maxPlayers=max_players,
            gameStatus=game_status,
            kickoutDuration=kickout_duration,
            zoomLevels=json.dumps([0] * max_players),
            statsExcludedGame=False,
            startingOptions=json.dumps(starting_options),
            playerOrderSeed=random.randint(1000, 32767),
        )
        new_game.save()
        ECLgameLink.objects.create(game=new_game)
        GamePlayer.objects.create(game=new_game, player=request.user, seat_order=0, notes="")
        for player in invited_users:
            new_game.invitedPlayers.add(player)

    if invited_users:
        presenter = new_game.presenter()
        presenter.sendInviteNotifications(
            [player.username for player in invited_users],
            presenter.getGameName(),
            max_players,
            "ECL",
        )

    messages.success(request, SF_getGameCreationJsonReturn("ECL", new_game.id))
    return HttpResponseRedirect(reverse("indexListType", kwargs={"listType": "waiting"}))
