"""One-time data helpers kept after the migration history reset.

The migration files that originally ran these were replaced by a single
`0001_initial` per app. The functions are still exercised directly by the
regression tests, so they live here as normal importable code.
"""

import html
import json
import re

from django.db import models

# Only the entities django.utils.html.escape() emits count as corruption; a
# bare "&" the user typed is left alone.
ESCAPED_TEXT = re.compile(r"&(amp|lt|gt|quot|#x27|#39);")

KICKOUT_TOPIC = "kickout_player_votes"


def repaired(value):
    # Each rematch generation stored the previous value escaped once, so
    # unwind until html.unescape stops changing anything.
    if not ESCAPED_TEXT.search(value):
        return value
    while True:
        unescaped = html.unescape(value)
        if unescaped == value:
            return value
        value = unescaped


def unescape_game_text(apps, schema_editor):
    Game = apps.get_model("Lobby", "Game")
    games = Game.objects.filter(models.Q(gameName__contains="&") | models.Q(gameDescription__contains="&"))

    to_update = []
    for game in games:
        name = repaired(game.gameName)
        description = repaired(game.gameDescription)
        if (name, description) != (game.gameName, game.gameDescription):
            game.gameName = name
            game.gameDescription = description
            to_update.append(game)

    if to_update:
        Game.objects.bulk_update(to_update, ["gameName", "gameDescription"])


def migrate_fcm_move_data(apps, schema_editor):
    """Copy the old FCM move array into the per-seat GamePlayer fields.

    Used by migration 0002 immediately before the old column is dropped. Rows
    that already have per-seat data are left alone so a re-run cannot clobber a
    newer move.
    """
    Game = apps.get_model("Lobby", "Game")
    GamePlayer = apps.get_model("Lobby", "GamePlayer")

    games = Game.objects.filter(gameCode="FCM").exclude(gameStatus="FINISHED")
    for game in games.iterator():
        raw = game.FCMplayersMoveData
        if not raw:
            continue
        try:
            rows = json.loads(raw)
        except (TypeError, ValueError):
            continue
        if not isinstance(rows, list):
            continue

        game_players = list(GamePlayer.objects.filter(game=game).order_by("seat_order"))
        if len(rows) != len(game_players):
            print(f"FCM move migration: game {game.id} has {len(rows)} rows for {len(game_players)} seats; skipped")
            continue

        # The old array is seat-ordered; its name column is a stale label after
        # a rename, so the seat index is the identity here.
        for row, gp in zip(rows, game_players, strict=True):
            if not isinstance(row, list) or len(row) < 4:
                continue
            if isinstance(gp.moveDataJSON, dict) and "phases" in gp.moveDataJSON and "data" in gp.moveDataJSON:
                continue
            gp.moveDataJSON = {"phases": row[1], "data": row[3]}
            gp.currentMoveTime = str(row[2]) if row[2] else ""
            gp.save(update_fields=["moveDataJSON", "currentMoveTime"])


def migrate_ind_pre_move_data(apps, schema_editor):
    """Copy the old IND pre-move array into the per-seat GamePlayer fields.

    Used by migration 0002 immediately before the old column is dropped. Rows
    that already have per-seat data are left alone so a re-run cannot clobber a
    newer move.
    """
    Game = apps.get_model("Lobby", "Game")
    GamePlayer = apps.get_model("Lobby", "GamePlayer")

    games = Game.objects.filter(gameCode="IND").exclude(gameStatus="FINISHED")
    for game in games.iterator():
        raw = game.playersPreMoveData
        if not raw:
            continue
        try:
            rows = json.loads(raw)
        except (TypeError, ValueError):
            continue
        if not isinstance(rows, list):
            continue

        game_players = list(GamePlayer.objects.filter(game=game).order_by("seat_order"))
        if len(rows) != len(game_players):
            print(f"IND move migration: game {game.id} has {len(rows)} rows for {len(game_players)} seats; skipped")
            continue

        # The old array is seat-ordered; its name column is a stale label after
        # a rename, so the seat index is the identity here.
        for row, gp in zip(rows, game_players, strict=True):
            if not isinstance(row, list) or len(row) < 4:
                continue
            if isinstance(gp.moveDataJSON, dict) and "phases" in gp.moveDataJSON and "data" in gp.moveDataJSON:
                continue
            gp.moveDataJSON = {"phases": row[1], "data": row[3]}
            gp.currentMoveTime = str(row[2]) if row[2] else ""
            gp.save(update_fields=["moveDataJSON", "currentMoveTime"])


def migrate_kfw_player_data(apps, schema_editor):
    """Copy the old KFW per-player arrays into GamePlayer fields.

    Used by migration 0002 immediately before the old columns are dropped.
    Seats that already have per-player data are left alone so a re-run cannot
    clobber a newer move.
    """
    Game = apps.get_model("Lobby", "Game")
    GamePlayer = apps.get_model("Lobby", "GamePlayer")

    games = Game.objects.filter(gameCode="KFW").exclude(gameStatus="FINISHED")
    for game in games.iterator():
        game_players = list(GamePlayer.objects.filter(game=game).order_by("seat_order"))

        raw_moves = game.KFWplayersMoveData
        if raw_moves:
            try:
                move_rows = json.loads(raw_moves)
            except (TypeError, ValueError):
                move_rows = []
            if isinstance(move_rows, list) and len(move_rows) == len(game_players):
                for row, gp in zip(move_rows, game_players, strict=True):
                    if not isinstance(row, list) or len(row) < 3:
                        continue
                    if gp.currentMoveTime or gp.currentMoveData:
                        continue
                    gp.currentMoveTime = str(row[1]) if row[1] else ""
                    gp.currentMoveData = row[2] or ""
                    gp.save(update_fields=["currentMoveTime", "currentMoveData"])
            elif move_rows:
                print(f"KFW move migration: game {game.id} has {len(move_rows)} rows for {len(game_players)} seats; skipped")

        raw_hidden = game.KFWplayersHiddenData
        if raw_hidden:
            try:
                hidden_rows = json.loads(raw_hidden)
            except (TypeError, ValueError):
                hidden_rows = []
            if isinstance(hidden_rows, list) and len(hidden_rows) == len(game_players):
                # The old array is seat-ordered; its name column is a stale
                # label after a rename, so the seat index is the identity.
                for row, gp in zip(hidden_rows, game_players, strict=True):
                    if not isinstance(row, list) or len(row) < 4:
                        continue
                    state = gp.moveDataJSON if isinstance(gp.moveDataJSON, dict) else {}
                    if "hidden" in state:
                        continue
                    state["hidden"] = row[1:4]
                    gp.moveDataJSON = state
                    gp.save(update_fields=["moveDataJSON"])
            elif hidden_rows:
                print(f"KFW hidden migration: game {game.id} has {len(hidden_rows)} rows for {len(game_players)} seats; skipped")


def backfill_flexi_seconds(apps, schema_editor):
    """Copy the active-game flexi ledger from Game.kickoutFlexiData to each player.

    Only accept [username, seconds] rows. Finished TGZ tournament games reuse the
    same Game field for tie-break data, so those are skipped by the ACTIVE filter.
    """
    Game = apps.get_model("Lobby", "Game")
    GamePlayer = apps.get_model("Lobby", "GamePlayer")
    for game in Game.objects.filter(gameStatus="ACTIVE").exclude(kickoutFlexiData="").iterator():
        try:
            entries = json.loads(game.kickoutFlexiData)
        except (TypeError, ValueError):
            continue
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if (
                isinstance(entry, list)
                and len(entry) == 2
                and isinstance(entry[0], str)
                and isinstance(entry[1], int)
                and entry[1] > 0
            ):
                GamePlayer.objects.filter(game_id=game.id, player__username=entry[0]).update(flexiSecondsUsed=entry[1])


def convert_kickout_vote_targets(apps, schema_editor):
    """Rewrite legacy [target_username, timestamp] kickout votes to GamePlayer ids."""
    GamePlayer = apps.get_model("Lobby", "GamePlayer")
    ids_by_game = {}

    for gp in GamePlayer.objects.filter(game__gameStatus="ACTIVE", votesJSON__isnull=False).iterator():
        votes = gp.votesJSON
        if not isinstance(votes, dict):
            continue
        vote = votes.get(KICKOUT_TOPIC)
        if not (isinstance(vote, list) and len(vote) >= 2 and isinstance(vote[0], str)):
            continue

        if gp.game_id not in ids_by_game:
            ids_by_game[gp.game_id] = {
                username: gp_id
                for gp_id, username in GamePlayer.objects.filter(game_id=gp.game_id, player__isnull=False).values_list("pk", "player__username")
            }

        target_id = ids_by_game[gp.game_id].get(vote[0])
        votes = dict(votes)
        if target_id is None:
            # The target is no longer in the game; a stale vote must not block anything.
            votes.pop(KICKOUT_TOPIC, None)
        else:
            votes[KICKOUT_TOPIC] = [target_id, vote[1]]
        gp.votesJSON = votes
        gp.save(update_fields=["votesJSON"])


def backfill_remaining_turn_order(apps, schema_editor):
    """Copy each active game's turn-order names onto GamePlayer.remainingTurnOrder."""
    Game = apps.get_model("Lobby", "Game")
    GamePlayer = apps.get_model("Lobby", "GamePlayer")

    for game in Game.objects.filter(gameStatus="ACTIVE").iterator():
        names = game.serverCurrentPlayerNamesInTurnOrder or []
        if game.gameCode == "HLC" and game.currentPlayersInTurnOrder:
            try:
                hlc_names = json.loads(game.currentPlayersInTurnOrder)
            except (TypeError, ValueError):
                hlc_names = []
            if isinstance(hlc_names, list) and hlc_names:
                names = hlc_names
        if not isinstance(names, list) or not names:
            continue

        ids_by_username = {
            username: gp_id
            for gp_id, username in GamePlayer.objects.filter(game_id=game.id, player__isnull=False).values_list("pk", "player__username")
        }
        for position, username in enumerate(names, start=1):
            gp_id = ids_by_username.get(username)
            if gp_id:
                GamePlayer.objects.filter(pk=gp_id).update(remainingTurnOrder=position)
