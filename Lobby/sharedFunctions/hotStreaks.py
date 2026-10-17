from datetime import datetime, time, timedelta, timezone as datetime_timezone
from functools import partial

from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext
from django_q.tasks import schedule

from Lobby.sharedFunctions.availability import get_starting_options, should_skip_availability_username
import Lobby.sharedFunctions.constants as rf


def get_hot_streak(game, now=None):
    today = (now or timezone.now()).astimezone(datetime_timezone.utc).date()
    last_day = game.streakLastMoveDate
    is_current = last_day is not None and last_day >= today - timedelta(days=1)
    return {"days": game.streakDays if is_current else 0, "best": game.streakBestDays, "hasMovedToday": last_day == today}


def record_hot_streak(game, acting_username, now=None):
    if not acting_username or game.maxPlayers == 1 or game.gameStatus not in {"ACTIVE", "FINISHED"}:
        return
    if should_skip_availability_username(acting_username) or rf.SO_TRAINING_GAME in get_starting_options(game.startingOptions):
        return
    players = list(game.players.select_related("player"))
    if any(gp.player and gp.player.username in rf.SHADOW_USERNAMES for gp in players):
        return
    if not any(gp.player and gp.player.username == acting_username and gp.is_current and not gp.is_missing and not gp.is_kicked for gp in players):
        return
    today = (now or timezone.now()).astimezone(datetime_timezone.utc).date()
    if game.streakLastMoveDate == today:
        return
    game.streakDays = game.streakDays + 1 if game.streakLastMoveDate == today - timedelta(days=1) else 1
    game.streakBestDays = max(game.streakBestDays, game.streakDays)
    game.streakLastMoveDate = today
    game.save(update_fields=["streakDays", "streakBestDays", "streakLastMoveDate"])
    # Check again two hours before tomorrow's goal expires. A later move or
    # finished match makes this task a no-op; one task is queued per active day.
    reminder_time = datetime.combine(today + timedelta(days=1), time(22), tzinfo=datetime_timezone.utc)
    transaction.on_commit(partial(schedule, "Lobby.sharedFunctions.sharedNotifications.SN_sendHotStreakReminder", game.id, today.isoformat(), next_run=reminder_time, schedule_type="O", repeats=-1))


def get_turn_nudge_message(game, sender_name):
    return gettext("Players can now vote to kick you out of %(game)s. %(player)s asked you to take your turn, or at least message the players in the game to let them know you are still interested.") % {"game": game.presenter().getGameName(), "player": sender_name}
