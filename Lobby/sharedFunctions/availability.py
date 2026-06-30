import json
from datetime import datetime, timedelta

from django.utils import timezone

import Lobby.sharedFunctions.constants as rf


AVAILABILITY_BUCKET_COUNT = 24
MAX_TRACKED_TURN_HOURS = 14 * 24


def get_availability_hour(moment=None):
    moment_to_use = moment or timezone.now()
    return timezone.localtime(moment_to_use).hour


def get_availability_hours_between(start_timestamp_ms, end_moment=None):
    end_moment = end_moment or timezone.now()
    try:
        start_moment = datetime.fromtimestamp(int(start_timestamp_ms) / 1000, tz=timezone.get_current_timezone())
    except (TypeError, ValueError, OSError):
        return [get_availability_hour(end_moment)]

    start_moment = timezone.localtime(start_moment)
    end_moment = timezone.localtime(end_moment)
    if start_moment > end_moment:
        return [end_moment.hour]

    final_hour = end_moment.replace(minute=0, second=0, microsecond=0)
    if start_moment.replace(minute=0, second=0, microsecond=0) == final_hour:
        return [end_moment.hour]

    hours = []
    cursor = start_moment.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    while cursor <= final_hour and len(hours) < MAX_TRACKED_TURN_HOURS:
        hours.append(cursor.hour)
        cursor += timedelta(hours=1)
    return hours or [end_moment.hour]


def record_player_availability_for_turn_change(game, acting_username=None, old_latest_update=None, now=None):
    if not acting_username or should_skip_availability_tracking(game):
        return

    game_player = game.players.filter(is_current=True, player__username=acting_username).select_related("player__profile").first()
    if not game_player or should_skip_availability_username(acting_username):
        return

    now = now or timezone.now()
    base_start_ms = int(old_latest_update or game.latestUpdate)
    move_hour = get_availability_hour(now)
    epoch_ms = int(now.timestamp() * 1000)
    player = game_player.player
    if not player or should_skip_availability_username(player.username):
        return

    turn_hours = get_turn_hours_for_player(game, game_player, base_start_ms, now)

    profile = player.profile
    profile.availabilityTurnCounts = increment_availability_counts(profile.availabilityTurnCounts, turn_hours)
    profile.availabilityMoveCounts = increment_availability_counts(profile.availabilityMoveCounts, [move_hour])
    profile.save(update_fields=["availabilityTurnCounts", "availabilityMoveCounts"])

    game_player.availabilityAnchor = epoch_ms
    game_player.save(update_fields=["availabilityAnchor"])


def get_turn_hours_for_player(game, game_player, base_start_ms, now):
    if is_redo_after_rewind(game, game_player):
        return [get_availability_hour(now)]

    window_start_ms = min(base_start_ms, game_player.availabilityAnchor) if game_player.availabilityAnchor is not None else base_start_ms
    return get_availability_hours_between(window_start_ms, now)


def is_redo_after_rewind(game, game_player, margin_ms=60000):
    if game_player.availabilityAnchor is None:
        return False

    relevant_anchors = [
        current_gp.availabilityAnchor
        for current_gp in game.players.filter(is_current=True)
        if current_gp.availabilityAnchor is not None
    ]
    if len(relevant_anchors) == 0:
        return False

    earliest_anchor = min(relevant_anchors)
    return game_player.availabilityAnchor > earliest_anchor + margin_ms


def increment_availability_counts(raw_counts, hours):
    counts = normalize_availability_counts(raw_counts)
    for hour in hours:
        if 0 <= hour < AVAILABILITY_BUCKET_COUNT:
            counts[hour] += 1
    return counts


def normalize_availability_counts(raw_counts):
    if not isinstance(raw_counts, list):
        raw_counts = []

    counts = []
    for value in raw_counts[:AVAILABILITY_BUCKET_COUNT]:
        if isinstance(value, int) and value >= 0:
            counts.append(value)
        else:
            counts.append(0)

    while len(counts) < AVAILABILITY_BUCKET_COUNT:
        counts.append(0)
    return counts


def should_skip_availability_tracking(game):
    if game.gameStatus != "ACTIVE" or game.maxPlayers == 1:
        return True

    starting_options = get_starting_options(game.startingOptions)
    if rf.SO_TRAINING_GAME in starting_options:
        return True

    usernames = [game_player.player.username for game_player in game.players.all().select_related("player") if game_player.player]
    return any(should_skip_availability_username(username) and username in rf.SHADOW_USERNAMES for username in usernames)


def should_skip_availability_username(username):
    return username in rf.SHADOW_USERNAMES or username == "BotKickStarter" or username.endswith("Bot")


def get_starting_options(starting_options):
    if not starting_options:
        return []
    try:
        parsed_options = json.loads(starting_options)
    except (TypeError, ValueError):
        return []
    return parsed_options if isinstance(parsed_options, list) else []
