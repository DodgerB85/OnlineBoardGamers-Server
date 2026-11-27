import json
import logging
import os
import subprocess
from pathlib import Path

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.translation import gettext
from django.views.decorators.http import require_POST

from Lobby.models import Game
from Lobby.sharedFunctions.constants import FCM_CAP3_USERNAMES, SO_TRAINING_GAME

from . import FCMconstants as rf

SIMULTANEOUS_PHASES = {rf.PHASE_SETUP_RESERVE, rf.PHASE_RESTRUCTURING}
CHINA_OPTIONS = {
    rf.SO_URBAN_PLANNING, rf.SO_URBAN_PLANNING_PLUS, rf.SO_JAZZ_MUSICIANS,
    rf.SO_DUMPLINGS, rf.SO_DELIVERY_DRIVERS, rf.SO_HAWKERS, rf.SO_RANDOM_MODULES_CHINESE,
}
FAN_OPTIONS = {
    rf.SO_FRIED_CHICKEN, rf.SO_STADIUM, rf.SO_LABOR_MARKET, rf.SO_SECOND_BAILOUT,
    rf.SO_MEDIA_LINE, rf.SO_NEW_MAP, rf.SO_NEW_MAP_ALL,
    rf.SO_SENIOR_BUSINESS_DEVELOPER, rf.SO_MILESTONE_NIGHT_BALANCE, rf.SO_RANDOM_MODULES_FAN,
}
UNSUPPORTED_BOT_OPTIONS = CHINA_OPTIONS | FAN_OPTIONS | {
    rf.SO_INCLUDED_MODULE_BASE + mod for mod in range(40, 55)
}
logger = logging.getLogger(__name__)


def cap3_available():
    return (
        bool(settings.FCM_CAP3_BIN)
        and Path(settings.FCM_CAP3_BIN).is_file()
        and os.access(settings.FCM_CAP3_BIN, os.X_OK)
    )


def cap3_options_supported(options):
    return UNSUPPORTED_BOT_OPTIONS.isdisjoint(options)


def is_cap3_simultaneous(game):
    return game.phase in SIMULTANEOUS_PHASES and SO_TRAINING_GAME not in json.loads(game.startingOptions)


def pending_cap3_username(game, seat):
    if game.maxPlayers not in range(2, 7) or type(seat) is not int or seat not in range(game.maxPlayers) or game.gameStatus != "ACTIVE":
        return None
    options = json.loads(game.startingOptions or "[]")
    if rf.SO_CAP3_AI not in options or not cap3_options_supported(options):
        return None
    username = game.players.filter(
        seat_order=seat, player__username__in=FCM_CAP3_USERNAMES,
        is_current=True, is_missing=False, is_kicked=False,
    ).values_list("player__username", flat=True).first()
    if username is None or game.players.count() != game.maxPlayers:
        return None
    if is_cap3_simultaneous(game) and game.presenter().hasValidActualMoveData(username):
        return None
    return username


@login_required
@require_POST
def cap3_turn(request, game_id):
    game = get_object_or_404(Game, id=game_id, gameCode="FCM")
    if not game.players.filter(player=request.user, is_missing=False, is_kicked=False).exists():
        return JsonResponse({"error": gettext("You are not a player in this game.")}, status=403)
    if not cap3_available():
        return JsonResponse({"error": gettext("Deep-Fry Bot is currently unavailable.")}, status=503)
    try:
        if len(request.body) > 262144:
            raise ValueError("position too large")
        payload = json.loads(request.body)
        if str(payload["latestUpdate"]) != str(game.latestUpdate):
            return JsonResponse({"stale": True}, status=409)
        seat = payload.get("cap3Seat")
        if pending_cap3_username(game, seat) is None:
            return JsonResponse({"latestUpdate": game.latestUpdate}, status=409)
        state = payload["state"]
        metadata = {key: payload["metadata"][key] for key in (
            "starting_map", "subphase", "availableEmployees", "availableMarketingCampaigns",
            "availableMilestones", "bankruptPlayers",
        )}
        options = json.loads(game.startingOptions)
        player_slot = int(rf.SO_LOBBYISTS in options)
        players = state[player_slot]
        flow = state[player_slot + 2]
        order = flow[2]
        n = game.maxPlayers
        if (
            len(players) != n or flow[1] != game.phase or seat not in order
            or any(type(other) is not int or other not in range(n) for other in order)
            or len(set(order)) != len(order)
            or (not is_cap3_simultaneous(game) and order[0] != seat)
        ):
            raise ValueError("position does not match the game")
        if len(flow[0]) != n or any(type(other) is not int for other in flow[0]) or set(flow[0]) != set(range(n)):
            raise ValueError("invalid full turn order")
        flow[2] = [seat, *(other for other in order if other != seat)]
        for index, player in enumerate(players):
            names = player[0]
            player[0] = ["FcmBot" if "FcmBot" in names else f"P{index}"]
        metadata["starting_map"] = json.loads(game.startingMap) if game.startingMap else metadata["starting_map"]
        # Vue exports the selected draft modules' fields even while the draft is in progress.
        engine_options = [
            option for option in options
            if option not in {
                rf.SO_CAP3_AI, rf.SO_CAP3_FULL_ROLLOUT,
                rf.SO_AUTO_ENABLE_REWINDS, rf.SO_DRAFT_MODULE_BREAKER,
            }
        ]
        if rf.SO_DRAFT_MODULE_BREAKER in options:
            engine_options.append(rf.SO_DRAFT_MODULE_BREAKER)
        metadata["starting_options"] = list(map(str, engine_options))
        metadata["turn"] = game.turn
        expected_tiles = {2: 18, 3: 24, 4: 32, 5: 40, 6: 48}.get(n)
        if expected_tiles is None or len(metadata["starting_map"]) != expected_tiles or any(type(tile) is not int for tile in metadata["starting_map"]):
            raise ValueError("unexpected map size for player count")
    except (AttributeError, IndexError, KeyError, TypeError, ValueError):
        return JsonResponse({"error": gettext("Invalid Cap3 position.")}, status=400)

    try:
        completed = subprocess.run(
            [settings.FCM_CAP3_BIN, "--full-rollout"],
            input=json.dumps({"state": state, "metadata": metadata}), text=True, capture_output=True,
            check=True, timeout=120,
        )
        plan = json.loads(completed.stdout)
        if plan["seat"] != seat or plan["phase"] != game.phase or not plan["steps"]:
            raise ValueError("policy returned a turn for the wrong position")
    except (OSError, subprocess.SubprocessError, ValueError, TypeError, KeyError) as error:
        logger.warning("Cap3 failed for FCM game %s: %s", game.id, error)
        return JsonResponse({"error": gettext("Deep-Fry Bot could not complete its move. Try again.")}, status=502)

    if not Game.objects.filter(pk=game.pk, latestUpdate=game.latestUpdate).exists():
        return JsonResponse({"stale": True}, status=409)
    return JsonResponse(plan)
