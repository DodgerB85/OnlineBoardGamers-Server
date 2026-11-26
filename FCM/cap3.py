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
from Lobby.sharedFunctions.constants import SO_TRAINING_GAME

from . import FCMconstants as rf

AI_USERNAME = "FcmAI"
SIMULTANEOUS_PHASES = {rf.PHASE_SETUP_RESERVE, rf.PHASE_RESTRUCTURING}
CAP3_OPTIONS = {rf.SO_CAP3_AI, rf.SO_STRICT_PAYDAY_FRIDGE, SO_TRAINING_GAME, rf.SO_AUTO_ENABLE_REWINDS}
logger = logging.getLogger(__name__)


def cap3_available():
    return (
        bool(settings.FCM_CAP3_BIN)
        and Path(settings.FCM_CAP3_BIN).is_file()
        and os.access(settings.FCM_CAP3_BIN, os.X_OK)
    )


def cap3_options_supported(options):
    return set(options) <= CAP3_OPTIONS


def is_cap3_simultaneous(game):
    return game.phase in SIMULTANEOUS_PHASES and SO_TRAINING_GAME not in json.loads(game.startingOptions)


def pending_cap3_seat(game):
    if game.gameStatus != "ACTIVE" or game.maxPlayers != 4:
        return None
    options = json.loads(game.startingOptions or "[]")
    if rf.SO_CAP3_AI not in options or not cap3_options_supported(options):
        return None
    seat = game.players.filter(
        player__username=AI_USERNAME, is_current=True, is_missing=False, is_kicked=False,
    ).values_list("seat_order", flat=True).first()
    if seat not in range(4) or game.players.count() != 4:
        return None
    if is_cap3_simultaneous(game) and game.presenter().hasValidActualMoveData(AI_USERNAME):
        return None
    return seat


@login_required
@require_POST
def cap3_turn(request, game_id):
    game = get_object_or_404(Game, id=game_id, gameCode="FCM")
    if not game.players.filter(player=request.user, is_missing=False, is_kicked=False).exists():
        return JsonResponse({"error": gettext("You are not a player in this game.")}, status=403)
    seat = pending_cap3_seat(game)
    if seat is None:
        return JsonResponse({"latestUpdate": game.latestUpdate}, status=409)
    if not cap3_available():
        return JsonResponse({"error": gettext("Cap3 AI is currently unavailable.")}, status=503)
    try:
        if len(request.body) > 262144:
            raise ValueError("position too large")
        payload = json.loads(request.body)
        if str(payload["latestUpdate"]) != str(game.latestUpdate):
            return JsonResponse({"stale": True}, status=409)
        state = payload["state"]
        metadata = {key: payload["metadata"][key] for key in (
            "starting_map", "subphase", "availableEmployees", "availableMarketingCampaigns",
            "availableMilestones", "bankruptPlayers",
        )}
        flow = state[2]
        order = flow[2]
        if (
            len(state[0]) != 4 or flow[1] != game.phase or seat not in order
            or any(type(other) is not int or other not in range(4) for other in order)
            or len(set(order)) != len(order)
            or (not is_cap3_simultaneous(game) and order[0] != seat)
        ):
            raise ValueError("position does not match the game")
        if len(flow[0]) != 4 or any(type(other) is not int for other in flow[0]) or set(flow[0]) != set(range(4)):
            raise ValueError("invalid full turn order")
        flow[2] = [seat, *(other for other in order if other != seat)]
        for index, player in enumerate(state[0]):
            names = player[0]
            player[0] = ["FcmBot" if "FcmBot" in names else f"P{index}"]
        metadata["starting_map"] = json.loads(game.startingMap) if game.startingMap else metadata["starting_map"]
        metadata["starting_options"] = [str(option) for option in json.loads(game.startingOptions)]
        metadata["turn"] = game.turn
        if len(metadata["starting_map"]) != 32 or any(type(tile) is not int for tile in metadata["starting_map"]):
            raise ValueError("expected a four-player map")
    except (AttributeError, IndexError, KeyError, TypeError, ValueError):
        return JsonResponse({"error": gettext("Invalid Cap3 position.")}, status=400)

    try:
        completed = subprocess.run(
            [settings.FCM_CAP3_BIN, "--cap3"],
            input=json.dumps({"state": state, "metadata": metadata}), text=True, capture_output=True,
            check=True, timeout=20,
        )
        plan = json.loads(completed.stdout)
        if plan["seat"] != seat or plan["phase"] != game.phase or not plan["steps"]:
            raise ValueError("policy returned a turn for the wrong position")
    except (OSError, subprocess.SubprocessError, ValueError, TypeError, KeyError) as error:
        logger.warning("Cap3 failed for FCM game %s: %s", game.id, error)
        return JsonResponse({"error": gettext("Cap3 AI could not complete its move. Try again.")}, status=502)

    if not Game.objects.filter(pk=game.pk, latestUpdate=game.latestUpdate).exists():
        return JsonResponse({"stale": True}, status=409)
    return JsonResponse(plan)
