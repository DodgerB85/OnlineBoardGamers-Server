import json

from django.db import migrations


def migrate_kfw_player_data(apps, schema_editor):
    """Copy the old KFW per-player arrays into GamePlayer fields.

    The old fields are intentionally left in place for one release. The
    presenter reads them as a fallback for seats that were not copied (for
    example, a game with a mismatched row count). Run this in a quiet window,
    or immediately after the new code is live, so the old code cannot write
    the old fields after the copy.
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


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0138_migrate_ind_pre_move_data_to_gameplayer"),
    ]

    operations = [
        migrations.RunPython(migrate_kfw_player_data, migrations.RunPython.noop),
    ]
