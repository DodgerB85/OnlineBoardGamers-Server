import json

from django.db import migrations


def migrate_fcm_move_data(apps, schema_editor):
    """Copy the old FCM move array into the per-seat GamePlayer fields.

    The old field is intentionally left in place for one release. The presenter
    reads it as a fallback for seats that were not copied (for example, a game
    with a mismatched row count). Run this in a quiet window, or immediately
    after the new code is live, so the old code cannot write the old field
    after the copy.
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


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0136_profile_usernamelastchanged"),
    ]

    operations = [
        migrations.RunPython(migrate_fcm_move_data, migrations.RunPython.noop),
    ]
