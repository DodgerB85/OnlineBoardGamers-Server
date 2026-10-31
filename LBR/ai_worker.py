"""AI seats for Land Between Rivers.

The AI service (donor Rust engine) decides; LBRrules.js is run headlessly by
node to validate and apply the decision; the resulting position is saved through
the same mutex/latestUpdate path as a human move. Django never interprets the
rules itself.
"""

import json
import logging
import subprocess
import time
from datetime import timedelta
from types import SimpleNamespace

import requests
from django.conf import settings
from django.utils import timezone

from Lobby.models import Game
from Lobby.sharedFunctions.db_mutex import db_mutex
from Lobby.sharedFunctions.sharedNotifications import SN_sendAdminErrorMessage

logger = logging.getLogger(__name__)

STEP_SCRIPT = settings.BASE_DIR / "LBR" / "ai" / "lbr_step.mjs"


def actor_seat(state):
    pending = state.get("pending")
    return pending.get("seat") if pending else state.get("activeSeat")


def seat_game_players(game):
    return list(game.players.select_related("player").order_by("seat_order"))


def ai_seat_to_act(game):
    """The GamePlayer that must act now, when that seat is an AI seat.

    Missing and kicked seats are abandoned; the AI takes them over in place.
    """
    seats = seat_game_players(game)
    if game.gameStatus != "ACTIVE" or not seats:
        return None

    if not game.gameData:
        # No client has dealt the opening position (AI-only game).
        return seats[0] if seats[0].is_ai else None

    try:
        state = json.loads(game.gameData)
    except ValueError:
        return None
    if state.get("gameOver"):
        return None

    seat = actor_seat(state)
    if not isinstance(seat, int) or seat < 0 or seat >= len(seats):
        return None
    gp = seats[seat]
    if not gp.is_ai:
        if gp.is_missing or gp.is_kicked:
            gp.is_ai = True
            gp.save(update_fields=["is_ai"])
        else:
            return None
    return gp


def schedule_ai_turn(game_id):
    """Queue one AI decision for the current position, once.

    ``autoMoves`` is used as the claim marker so polling clients cannot queue a
    burst of duplicate tasks for the same latestUpdate.
    """
    from django_q.tasks import async_task

    if not settings.LBR_AI_URL:
        return False

    game = Game.objects.filter(id=game_id, gameCode="LBR").first()
    if not game or not ai_seat_to_act(game):
        return False

    marker_latest_update = f"ai:{game.latestUpdate}"
    marker = f"{marker_latest_update}:{int(time.time())}"
    previous = game.autoMoves or ""
    if previous.startswith(marker_latest_update):
        try:
            claimed_seconds_ago = int(time.time()) - int(previous.rsplit(":", 1)[-1])
        except ValueError:
            claimed_seconds_ago = None
        # A queued task that never ran (worker restart) must not block the seat
        # forever.
        if claimed_seconds_ago is not None and claimed_seconds_ago < 300:
            return False

    claimed = (
        Game.objects.filter(id=game.id, latestUpdate=game.latestUpdate)
        .update(autoMoves=marker)
    )
    if not claimed:
        return False

    async_task("LBR.ai_worker.play_ai_turn", game.id, game.latestUpdate)
    return True


def play_ai_turn(game_id, expected_latest_update, attempt=0):
    """Play one AI decision for ``game_id``.

    The service call and the rules step run outside the game mutex; the result is
    only saved if the position is still the one it was computed from.
    """
    game = Game.objects.filter(id=game_id, gameCode="LBR").select_related("creator").first()
    if not game or str(game.latestUpdate) != str(expected_latest_update):
        return "stale"

    gp = ai_seat_to_act(game)
    if not gp:
        return "not_ai"

    seats = seat_game_players(game)
    names = [player.player.username if player.player else "" for player in seats]

    try:
        if game.gameData:
            state = json.loads(game.gameData)
            seat = actor_seat(state)
            action = request_ai_action(state, seat)
            applied = _run_step({"state": state, "seat": seat, "action": action, "playerNames": names})
        else:
            seat = 0
            applied = _run_step({"mode": "init", "numSeats": len(names), "playerNames": names})
    except Exception as exc:  # noqa: BLE001 - any failure must not wedge the game
        logger.exception("LBR AI move failed for game %s", game_id)
        _retry(game_id, expected_latest_update, attempt, exc)
        return "error"

    if applied.get("fallback"):
        SN_sendAdminErrorMessage(
            f"LBR AI: service action rejected by LBRrules - gameID: {game_id} - seat: {seat} - {applied.get('rejectedAction')}"
        )

    with db_mutex(f"processTurn_{game_id}", timeout=10, ttl=180) as acquired:
        if not acquired:
            _retry(game_id, expected_latest_update, attempt, RuntimeError("game busy"))
            return "busy"

        game = Game.objects.filter(id=game_id, gameCode="LBR").select_related("creator").get()
        if str(game.latestUpdate) != str(expected_latest_update):
            return "stale"
        gp = game.players.filter(seat_order=seat).select_related("player").first()
        if not gp or not gp.is_ai:
            return "not_ai"
        if applied.get("stateJson") is None:
            return "bad_result"

        from LBR.views import save_lbr_state

        save_lbr_state(
            game,
            game.presenter(),
            game_data=applied["stateJson"],
            turn=applied["turn"],
            phase=applied["phase"],
            next_player_usernames=applied["nextPlayer"],
            acting_username=gp.player.username,
            check_name=gp.player.username,
            status=applied["status"],
            winner=applied["winner"],
            final_positions=applied["finalPositions"],
            save_rewind=applied["status"] != "FINISHED",
            request=SimpleNamespace(user=gp.player),
            track_availability=False,
        )
    return "ok"


def request_ai_action(state, seat):
    if not settings.LBR_AI_URL:
        raise RuntimeError("LBR_AI_URL is not configured")
    response = requests.post(
        settings.LBR_AI_URL,
        json={"state": state, "seat": seat},
        timeout=settings.LBR_AI_TIMEOUT,
    )
    response.raise_for_status()
    data = response.json()
    action = data.get("action")
    if not isinstance(action, dict):
        raise RuntimeError(f"AI service returned no action: {data}")
    return action


def _run_step(payload):
    process = subprocess.run(
        [settings.LBR_AI_NODE, str(STEP_SCRIPT)],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        timeout=settings.LBR_AI_STEP_TIMEOUT,
        cwd=str(settings.BASE_DIR),
    )
    if process.returncode != 0:
        raise RuntimeError(f"LBR rules step failed: {process.stderr.strip() or process.stdout.strip()}")
    return json.loads(process.stdout)


def _retry(game_id, expected_latest_update, attempt, exc):
    SN_sendAdminErrorMessage(
        f"LBR AI move failed - gameID: {game_id} - attempt {attempt + 1}/{settings.LBR_AI_MAX_ATTEMPTS} - {exc}"
    )
    if attempt + 1 >= settings.LBR_AI_MAX_ATTEMPTS:
        Game.objects.filter(id=game_id, latestUpdate=expected_latest_update).update(autoMoves=None)
        return

    from django_q.tasks import schedule

    schedule(
        "LBR.ai_worker.play_ai_turn",
        game_id,
        expected_latest_update,
        attempt + 1,
        next_run=timezone.now() + timedelta(seconds=settings.LBR_AI_RETRY_SECONDS),
        schedule_type="O",
    )
