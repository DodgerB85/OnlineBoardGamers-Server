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

    hours = []
    cursor = start_moment.replace(minute=0, second=0, microsecond=0)
    final_hour = end_moment.replace(minute=0, second=0, microsecond=0)
    while cursor <= final_hour and len(hours) < MAX_TRACKED_TURN_HOURS:
        hours.append(cursor.hour)
        cursor += timedelta(hours=1)
    return hours or [end_moment.hour]


def record_player_availability_for_turn_change(game, acting_username=None, old_latest_update=None, now=None):
    if not acting_username or should_skip_availability_tracking(game):
        return

    current_game_players = list(game.players.filter(is_current=True).select_related("player__profile"))
    current_usernames = {game_player.player.username for game_player in current_game_players if game_player.player}
    if acting_username not in current_usernames or should_skip_availability_username(acting_username):
        return

    turn_hours = get_availability_hours_between(old_latest_update or game.latestUpdate, now)
    move_hour = get_availability_hour(now)

    for game_player in current_game_players:
        player = game_player.player
        if not player or should_skip_availability_username(player.username):
            continue

        profile = player.profile
        profile.availabilityTurnCounts = increment_availability_counts(profile.availabilityTurnCounts, turn_hours)
        update_fields = ["availabilityTurnCounts"]
        if player.username == acting_username:
            profile.availabilityMoveCounts = increment_availability_counts(profile.availabilityMoveCounts, [move_hour])
            update_fields.append("availabilityMoveCounts")
        profile.save(update_fields=update_fields)


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
