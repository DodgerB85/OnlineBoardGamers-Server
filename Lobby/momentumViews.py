import json
from datetime import timedelta
from functools import partial

from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.translation import gettext
from django.views.decorators.http import require_GET, require_POST
from django_q.tasks import async_task

from Lobby.models import Game, GamePlayer
from Lobby.sharedFunctions.availability import should_skip_availability_username
from Lobby.sharedFunctions.db_mutex import db_mutex
from Lobby.sharedFunctions.hotStreaks import get_hot_streak, get_turn_nudge_message


NUDGE_COOLDOWN = timedelta(hours=24)


def is_active_participant(game, user):
    return game.players.filter(player=user, is_kicked=False, is_missing=False).exists()


def get_nudge_targets(game, user):
    if game.gameStatus != "ACTIVE" or game.presenter().kickoutRequired() == 0:
        return []
    now = timezone.now()
    return [
        {"id": gp.player_id, "name": gp.player.username, "canNudge": gp.player.profile.receiveTurnNudges and (gp.lastNudgedAt is None or gp.lastNudgedAt <= now - NUDGE_COOLDOWN)}
        for gp in game.players.filter(is_current=True, is_kicked=False, is_missing=False, player__isnull=False).exclude(player=user).select_related("player__profile")
        if not should_skip_availability_username(gp.player.username)
    ]


@login_required
@require_GET
def game_momentum(request, game_id):
    game = get_object_or_404(Game, pk=game_id)
    if not is_active_participant(game, request.user):
        return JsonResponse({"error": gettext("Only players in this game can view its momentum.")}, status=403)
    own_seat = game.players.get(player=request.user)
    has_nudge = own_seat.is_current and own_seat.lastNudgedAt and own_seat.lastNudgedBy and own_seat.lastNudgedAt.timestamp() * 1000 >= int(game.latestUpdate)
    return JsonResponse({"nudge": get_turn_nudge_message(game, own_seat.lastNudgedBy) if has_nudge else None, "streak": get_hot_streak(game) if request.user.profile.hotStreakEnabled else None, "isActive": game.gameStatus == "ACTIVE", "latestUpdate": game.latestUpdate, "targets": get_nudge_targets(game, request.user)})


@login_required
@require_POST
def nudge_player(request, game_id):
    try:
        data = json.loads(request.body)
        target_id = int(data["playerID"])
        expected_update = str(data["latestUpdate"])
    except (ValueError, TypeError, KeyError):
        return JsonResponse({"error": gettext("Invalid nudge request.")}, status=400)
    # Use the same mutex as turn submissions so a turn cannot complete between
    # checking eligibility and queuing the nudge.
    with db_mutex(f"processTurn_{game_id}", timeout=5, ttl=60) as acquired:
        if not acquired:
            return JsonResponse({"error": gettext("System busy, please try again.")}, status=503)
        with transaction.atomic():
            game = get_object_or_404(Game, pk=game_id)
            if not is_active_participant(game, request.user):
                return JsonResponse({"error": gettext("Only players in this game can send nudges.")}, status=403)
            if game.gameStatus != "ACTIVE" or expected_update != game.latestUpdate:
                return JsonResponse({"error": gettext("The game has changed. Refresh before sending a nudge.")}, status=409)
            if game.presenter().kickoutRequired() == 0:
                return JsonResponse({"error": gettext("Nudges become available when players can vote to kick out.")}, status=400)
            target = GamePlayer.objects.select_related("player__profile").select_for_update().filter(game=game, player_id=target_id, is_current=True, is_kicked=False, is_missing=False).first()
            if target is None:
                return JsonResponse({"error": gettext("This player is no longer waiting to take a turn.")}, status=409)
            if target_id == request.user.id or should_skip_availability_username(target.player.username):
                return JsonResponse({"error": gettext("Choose another player whose turn is pending.")}, status=400)
            if not target.player.profile.receiveTurnNudges:
                return JsonResponse({"error": gettext("This player has turned off turn nudges.")}, status=400)
            now = timezone.now()
            if target.lastNudgedAt and target.lastNudgedAt > now - NUDGE_COOLDOWN:
                return JsonResponse({"error": gettext("This player has already been nudged in this match within the last 24 hours.")}, status=429)
            target.lastNudgedAt = now
            target.lastNudgedBy = request.user.username
            target.save(update_fields=["lastNudgedAt", "lastNudgedBy"])
            transaction.on_commit(partial(async_task, "Lobby.sharedFunctions.sharedNotifications.SN_sendTurnNudge", game.id, target_id, request.user.username, expected_update, now.isoformat()))
    return JsonResponse({"message": gettext("Nudge queued.")})
