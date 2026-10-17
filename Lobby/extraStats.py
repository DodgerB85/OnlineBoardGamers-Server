import base64
import gzip
import json
import logging
from collections import Counter
from statistics import mean, median

import msgpack

from django.conf import settings
from django.core.cache import cache
from django.db.models import Q
from django.shortcuts import render
from lzstring import LZString

import Lobby.sharedFunctions.constants as rf
from Lobby.models import Game
from Lobby.sharedFunctions.sharedRefs import SR_GAMES_CODES_AND_NAMES_CHOICES

logger = logging.getLogger(__name__)

# Finished-game exports differ from the live/replay exports in several games.
FINISHED_HISTORY_INDEX = {"TGZ": 7, "CNS": 7, "AQY": 3, "IND": 3, "BUS": 8, "WEB": 11, "KFW": 1, "RNB": 9}
DELTA_HISTORY_CODES = {"IND", "WEB", "KFW", "RNB"}
METRICS = [
    ("duration", "Game duration", "days"),
    ("lobby", "Lobby wait", "days"),
    ("lifetime", "Created to latest update", "days"),
    ("outside", "Time outside recorded play", "days"),
    ("tail", "Last history to latest update", "days"),
    ("actions", "Recorded actions per player", "actions"),
    ("gap", "Time between player actions", "hours"),
    ("longestGap", "Longest gap per match", "days"),
]


def decode_game_data(game):
    if game.gameCode == "HLC":
        return json.loads(LZString().decompressFromEncodedURIComponent(game.gameData))
    if game.gameData.lstrip().startswith(("[", "{")):
        return json.loads(game.gameData)
    raw = gzip.decompress(base64.b64decode(game.gameData))
    if game.gameCode == "BUS" and not raw.lstrip().startswith((b"[", b"{")):
        return msgpack.unpackb(raw, raw=False)
    return json.loads(raw)


def read_history(game, data):
    """Return (player index, epoch seconds), retaining entries without timestamps."""
    created = int(game.created) / 1000
    code = game.gameCode
    if code == "HLC":
        reference = data[15][0]
        return [(entry[0], reference + offset) for entry, offset in zip(data[15][1:], data[16], strict=True)]
    if code == "FCM":
        # Both legacy and current compact exports store a reference followed by
        # [player, event, params] entries and a separate array of timestamp deltas.
        for index, history in enumerate(data[:-1]):
            if not isinstance(history, list) or len(history) < 2 or not isinstance(history[0], (int, float)) or history[0] < 1_000_000_000:
                continue
            offsets = data[index + 1]
            if not isinstance(offsets, list) or len(offsets) != len(history) - 1 or not all(isinstance(entry, list) and len(entry) == 3 for entry in history[1:]):
                continue
            timestamp = history[0]
            entries = []
            for entry, offset in zip(history[1:], offsets, strict=True):
                timestamp += offset
                entries.append((entry[0], timestamp))
            return entries
        raise ValueError("Unrecognized FCM history format")
    if code in {"DDL", "URR"}:
        return [(entry[1], entry[4] if code == "URR" and len(entry) > 4 else None) for entry in data["history"]]
    if code == "BUS":
        # The MessagePack export uses nested name/display-name pairs and moves
        # history to slot 4; the legacy JSON export keeps names flat and uses 8.
        history = data[4 if isinstance(data[0][0][0], list) else 8]
    else:
        history = data[FINISHED_HISTORY_INDEX[code]]
    timestamp = created
    entries = []
    for entry in history:
        if code in DELTA_HISTORY_CODES:
            timestamp += entry[2]
        else:
            timestamp = created + entry[2]
        entries.append((entry[1], timestamp))
    return entries


def summarize(values):
    return {"average": round(mean(values), 3), "median": round(median(values), 3), "count": len(values)} if values else {"average": None, "median": None, "count": 0}


def collect_extra_stats():
    groups = {code: {"gameCode": code, "name": name, "finished": 0, "unreadable": 0, "missingTiming": 0, "samples": []} for code, name in SR_GAMES_CODES_AND_NAMES_CHOICES}
    excluded_ids = Game.objects.filter(Q(players__player__username__in=rf.SHADOW_USERNAMES) | Q(players__player__username="FcmAI")).values("id")
    games = Game.objects.filter(gameStatus="FINISHED", statsExcludedGame=False, maxPlayers__gt=1).exclude(id__in=excluded_ids).only("id", "gameCode", "created", "latestUpdate", "maxPlayers", "gameData", "startingOptions")
    for game in games.iterator(chunk_size=100):
        group = groups.get(game.gameCode)
        if group is None:
            continue
        if str(rf.SO_TRAINING_GAME) in game.startingOptions.replace(" ", "").strip("[]").split(","):
            continue
        group["finished"] += 1
        try:
            entries = read_history(game, decode_game_data(game))
            if not entries:
                raise ValueError("Empty history")
            created = int(game.created) / 1000
            updated = int(game.latestUpdate) / 1000
            counts = Counter(player for player, timestamp in entries if isinstance(player, int) and 0 <= player < game.maxPlayers)
            lifetime = max(0, updated - created) / 86400
            sample = {"players": game.maxPlayers, "actions": [counts[player] for player in range(game.maxPlayers)], "lifetime": lifetime}
            # Synthetic zero-time setup/seed entries are not evidence of play.
            timestamps = [timestamp for player, timestamp in entries if timestamp is not None and timestamp > created]
            has_timing = len(timestamps) >= 2 and all(created - 2 <= timestamp <= updated + 120 for timestamp in timestamps) and all(a <= b for a, b in zip(timestamps, timestamps[1:]))
            if has_timing:
                first, last = timestamps[0], timestamps[-1]
                duration = (last - first) / 86400
                action_times = sorted({timestamp for player, timestamp in entries if isinstance(player, int) and 0 <= player < game.maxPlayers and timestamp is not None and timestamp > created})
                gaps = [(b - a) / 3600 for a, b in zip(action_times, action_times[1:])]
                sample.update(duration=duration, lobby=(first - created) / 86400, outside=max(0, lifetime - duration), tail=max(0, updated - last) / 86400, gap=gaps, longestGap=max(gaps) / 24 if gaps else None)
            else:
                group["missingTiming"] += 1
            group["samples"].append(sample)
        except (ValueError, TypeError, IndexError, KeyError, OSError, EOFError) as error:
            group["unreadable"] += 1
            logger.warning("Extra stats: cannot read %s game %s: %s", game.gameCode, game.id, error)
    results = []
    for group in groups.values():
        samples = group.pop("samples")
        group["cohorts"] = build_stats_cohorts(samples)
        results.append(group)
    return results


def build_stats_cohorts(samples):
    cohorts = {}
    for player_count in [0, *sorted({sample["players"] for sample in samples})]:
        cohort = [sample for sample in samples if player_count == 0 or sample["players"] == player_count]
        metrics = {}
        for key, label, unit in METRICS:
            values = []
            for sample in cohort:
                value = sample.get(key)
                if isinstance(value, list):
                    values.extend(value)
                elif value is not None:
                    values.append(value)
            metrics[key] = {"label": label, "unit": unit, **summarize(values)}
        cohorts[str(player_count)] = {"games": len(cohort), "metrics": metrics}
    return cohorts


def synthetic_fcm_stats():
    samples = []
    for players in range(2, 7):
        for index, duration in enumerate([2, 4, 7, 12, 30]):
            duration = duration * (0.6 + players * 0.2)
            lobby = [0.1, 0.5, 1, 2, 5][index]
            tail = [0, 0.01, 0.05, 0.1, 0.25][index]
            actions = [30 + index * 12 + seat * 4 for seat in range(players)]
            gap_count = sum(actions) - 1
            # One longer pause and evenly spaced remaining actions preserve the
            # synthetic match duration while giving different average/median gaps.
            longest_gap = duration * 24 * 0.25
            other_gap = (duration * 24 - longest_gap) / (gap_count - 1)
            samples.append({"players": players, "duration": duration, "lobby": lobby, "lifetime": lobby + duration + tail, "outside": lobby + tail, "tail": tail, "actions": actions, "gap": [longest_gap, *([other_gap] * (gap_count - 1))], "longestGap": longest_gap / 24})
    return {"gameCode": "FCM", "name": "Food Chain Magnate", "finished": len(samples), "unreadable": 0, "missingTiming": 0, "isSynthetic": True, "cohorts": build_stats_cohorts(samples)}


def extra_stats(request):
    stats = cache.get("extra_game_stats_v1")
    if stats is None:
        stats = collect_extra_stats()
        cache.set("extra_game_stats_v1", stats, 3600)
    fcm_stats = next(game for game in stats if game["gameCode"] == "FCM")
    demo = request.GET.get("demo")
    has_local_preview = settings.DEBUG and settings.LOCAL_USER_SQLITE3 and not fcm_stats["cohorts"]["0"]["metrics"]["duration"]["count"]
    if demo == "FCM" or (demo is None and has_local_preview):
        # Replace only the response data; cached real statistics remain intact.
        stats = [synthetic_fcm_stats() if game["gameCode"] == "FCM" else game for game in stats]
    response = render(request, "Lobby/extraStats.html", {"extra_stats": stats})
    response["X-Robots-Tag"] = "noindex, nofollow"
    return response
