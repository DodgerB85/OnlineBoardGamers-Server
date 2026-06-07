import math

from Lobby.models import Tournament
from Lobby.sharedFunctions.sharedRefs import PENDING


MANUAL_START_GAME_CODES = {"HLC", "BUS", "AQY", "IND"}


def is_pending_creation_day(current_date, tournament_date):
    return (tournament_date.date() - current_date.date()).days == 7


def find_pending_tournament_to_open(game_code, tournament_name):
    exact_match = (
        Tournament.objects.filter(
            tournamentCategory="Main",
            tournamentStatus=PENDING,
            gameCode=game_code,
            tournamentName=tournament_name,
        )
        .order_by("-id")
        .first()
    )
    if exact_match:
        return exact_match

    pending_qs = Tournament.objects.filter(
        tournamentCategory="Main",
        tournamentStatus=PENDING,
        gameCode=game_code,
    ).order_by("-id")

    if pending_qs.count() == 1:
        return pending_qs.first()

    return None


def should_auto_start_game(game_code):
    return game_code not in MANUAL_START_GAME_CODES


def get_target_start_size(total_players, max_game_players, tournament_type, day_number):
    if max_game_players <= 0:
        return None

    threshold = 0
    if total_players > 25:
        threshold = 25
    elif total_players >= (max_game_players * max_game_players) - max_game_players + 1:
        threshold = (max_game_players * max_game_players) - max_game_players + 1
    elif tournament_type in ["TL", "RR", "PT"]:
        threshold = max_game_players * (3 if tournament_type == "TL" else 2)
    elif day_number >= 28:
        threshold = max_game_players

    if threshold <= 0:
        return None

    target_start_size = math.ceil(threshold / max_game_players) * max_game_players

    if total_players > target_start_size:
        target_start_size = math.ceil(total_players / max_game_players) * max_game_players

    return target_start_size


def should_start_open_tournament(total_players, target_start_size, max_game_players):
    if target_start_size is None or max_game_players <= 0:
        return False

    return total_players >= target_start_size and total_players % max_game_players == 0
