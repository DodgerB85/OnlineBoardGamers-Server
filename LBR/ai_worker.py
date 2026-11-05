"""AI seats for Land Between Rivers.

The prebuilt policy engine (LBR/ai-service/bin/lbr-policy) decides; LBRrules.js is run
headlessly by node to validate and apply the decision; the resulting position is
saved through the same mutex/latestUpdate path as a human move. Django never
interprets the rules itself.
"""

import json
import logging
import subprocess
import time
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace

# A whole AI turn is played inside one task. The cap only keeps a task well under
# the django-q timeout; the remaining decisions are queued as a fresh task.
MAX_AI_DECISIONS_PER_TASK = 40

import requests
from django.conf import settings
from django.utils import timezone

from Lobby.models import Game
from Lobby.sharedFunctions.db_mutex import db_mutex
from Lobby.sharedFunctions.sharedNotifications import SN_sendAdminErrorMessage

logger = logging.getLogger(__name__)

STEP_SCRIPT = settings.BASE_DIR / "LBR" / "ai" / "lbr_step.mjs"

_policy_disabled_logged = False


def policy_paths():
    """Absolute binary and model paths, always derived from settings (never cwd)."""
    return Path(settings.LBR_AI_BIN), Path(settings.LBR_AI_MODEL)


def policy_available():
    """Whether a policy decision can be produced at all.

    A missing binary or model disables AI seats instead of claiming a turn the
    worker could never play, so the seat is never wedged by a broken install.
    """
    global _policy_disabled_logged
    if settings.LBR_AI_URL:
        return True
    missing = [str(path) for path in policy_paths() if not path.is_file()]
    if missing and not _policy_disabled_logged:
        _policy_disabled_logged = True
        logger.warning("LBR AI seats are disabled: missing %s", ", ".join(missing))
    return not missing


def actor_seat(state):
    pending = state.get("pending")
    return pending.get("seat") if pending else state.get("activeSeat")


def setup_options(game):
    """The board and finish-round choices carried in startingOptions."""
    try:
        options = json.loads(game.startingOptions) if game.startingOptions else []
    except ValueError:
        options = []
    map_name = next(
        (option[4:] for option in options if isinstance(option, str) and option.startswith("map:")),
        "default",
    )
    return map_name, "finishRound" in options


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
    """Queue one AI turn for the current position, once.

    ``autoMoves`` holds the claim for the whole AI turn: the worker keeps it
    while it plays, so polling clients cannot queue duplicate tasks between
    decisions. A claim older than ``LBR_AI_CLAIM_SECONDS`` is treated as
    abandoned by a crashed worker and replaced.
    """
    from django_q.tasks import async_task

    if not policy_available():
        return False

    game = Game.objects.filter(id=game_id, gameCode="LBR").first()
    if not game or not ai_seat_to_act(game):
        return False

    previous = game.autoMoves or ""
    if previous.startswith("ai:"):
        try:
            claimed_seconds_ago = int(time.time()) - int(previous.rsplit(":", 1)[-1])
        except ValueError:
            claimed_seconds_ago = None
        if claimed_seconds_ago is not None and claimed_seconds_ago < settings.LBR_AI_CLAIM_SECONDS:
            return False

    marker = f"ai:{game.latestUpdate}:{int(time.time())}"
    # Filtering on the old value makes the claim a compare-and-swap, so two
    # polls at the same moment cannot both queue a task.
    claimed = (
        Game.objects.filter(id=game.id, latestUpdate=game.latestUpdate, autoMoves=game.autoMoves)
        .update(autoMoves=marker)
    )
    if not claimed:
        return False

    async_task("LBR.ai_worker.play_ai_turn", game.id, game.latestUpdate)
    return True


def play_ai_turn(game_id, expected_latest_update, attempt=0):
    """Play AI decisions until a human seat has to act.

    The whole turn (and any following AI seat) is resolved in one task, so the AI
    never waits for a browser poll between decisions. The service call and the
    rules step run outside the game mutex; each result is only saved if the
    position is still the one it was computed from. The claim set by
    ``schedule_ai_turn`` is held for the whole task and released when it ends,
    except on a retry, which schedules the next attempt under the same claim.
    """
    claim_prefix = f"ai:{expected_latest_update}:"
    keep_claim = False
    try:
        game = Game.objects.filter(id=game_id, gameCode="LBR").select_related("creator").first()
        if not game or str(game.latestUpdate) != str(expected_latest_update):
            return "stale"

        names = [player.player.username if player.player else "" for player in seat_game_players(game)]
        decisions = 0
        while True:
            gp = ai_seat_to_act(game)
            if not gp:
                return "ok" if decisions else "not_ai"

            try:
                if game.gameData:
                    state = json.loads(game.gameData)
                    seat = actor_seat(state)
                    action = request_ai_action(state, seat)
                    applied = _run_step({"state": state, "seat": seat, "action": action, "playerNames": names})
                else:
                    seat = 0
                    map_name, finish_round = setup_options(game)
                    applied = _run_step(
                        {
                            "mode": "init",
                            "numSeats": len(names),
                            "playerNames": names,
                            "map": map_name,
                            "finishRound": finish_round,
                        }
                    )
            except Exception as exc:  # noqa: BLE001 - any failure must not wedge the game
                logger.exception("LBR AI move failed for game %s", game_id)
                keep_claim = True
                _retry(game_id, str(game.latestUpdate), attempt, exc)
                return "error"

            if applied.get("fallback"):
                SN_sendAdminErrorMessage(
                    f"LBR AI: service action rejected by LBRrules - gameID: {game_id} - seat: {seat} - {applied.get('rejectedAction')}"
                )

            computed_version = str(game.latestUpdate)
            with db_mutex(f"processTurn_{game_id}", timeout=10, ttl=180) as acquired:
                if not acquired:
                    keep_claim = True
                    _retry(game_id, computed_version, attempt, RuntimeError("game busy"))
                    return "busy"

                game = Game.objects.filter(id=game_id, gameCode="LBR").select_related("creator").get()
                if str(game.latestUpdate) != computed_version:
                    return "stale"
                gp = game.players.filter(seat_order=seat).select_related("player").first()
                if not gp or not gp.is_ai:
                    return "not_ai" if decisions == 0 else "ok"
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
                    schedule_next_ai=False,
                    keep_ai_claim=True,
                )
                decisions += 1

            if applied["status"] == "FINISHED":
                return "ok"
            if decisions >= MAX_AI_DECISIONS_PER_TASK:
                # Release first so the continuation can claim the new position.
                _release_claim(game_id, claim_prefix)
                schedule_ai_turn(game.id)
                return "ok"
    finally:
        if not keep_claim:
            _release_claim(game_id, claim_prefix)


def _release_claim(game_id, claim_prefix):
    """Drop this task's claim without touching a newer one."""
    Game.objects.filter(id=game_id, autoMoves__startswith=claim_prefix).update(autoMoves=None)



def request_ai_action(state, seat):
    """One policy decision for `seat`, from the local binary or LBR_AI_URL."""
    request = {"state": state, "seat": seat}
    if settings.LBR_AI_URL:
        response = requests.post(settings.LBR_AI_URL, json=request, timeout=settings.LBR_AI_TIMEOUT)
        response.raise_for_status()
        data = response.json()
    else:
        data = _run_policy(request)
    action = data.get("action") if isinstance(data, dict) else None
    if not isinstance(action, dict):
        raise RuntimeError(f"AI policy returned no action: {data}")
    return action


def model_for_map(model, map_name):
    """The board's own net, `<map>.bin` beside LBR_AI_MODEL, if one is installed.

    Each board has its own trained net; a board without one falls back to
    LBR_AI_MODEL (the default board's net), which still plays legally.
    """
    if isinstance(map_name, str) and map_name.replace("-", "").isalnum():
        candidate = model.with_name(f"{map_name}.bin")
        if candidate.is_file():
            return candidate
    return model


def _run_policy(request):
    """One-shot `lbr-move` subprocess: a crash or a hang costs one decision."""
    binary, model = policy_paths()
    model = model_for_map(model, (request.get("state") or {}).get("map"))
    if not binary.is_file():
        raise RuntimeError(f"LBR policy binary not found: {binary}")
    if not model.is_file():
        raise RuntimeError(f"LBR policy model not found: {model}")

    try:
        process = subprocess.run(
            [
                str(binary),
                "lbr-move",
                "--sims",
                str(settings.LBR_AI_SIMS),
                "--alpha",
                str(settings.LBR_AI_ALPHA),
                "--net",
                str(model),
            ],
            input=json.dumps(request),
            capture_output=True,
            text=True,
            timeout=settings.LBR_AI_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"LBR policy timed out after {settings.LBR_AI_TIMEOUT}s") from None
    if process.returncode != 0:
        raise RuntimeError(
            f"LBR policy failed (exit {process.returncode}): {process.stderr.strip() or process.stdout.strip()}"
        )
    try:
        return json.loads(process.stdout)
    except ValueError:
        raise RuntimeError(f"LBR policy returned malformed JSON: {process.stdout.strip()[:500]}") from None


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
