from django.db import migrations

from Lobby.migrationHelpers import (
    migrate_fcm_move_data,
    migrate_ind_pre_move_data,
    migrate_kfw_player_data,
)


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0001_initial"),
    ]

    operations = [
        # Copy anything still sitting in the old blobs before the columns go.
        migrations.RunPython(migrate_fcm_move_data, migrations.RunPython.noop),
        migrations.RunPython(migrate_ind_pre_move_data, migrations.RunPython.noop),
        migrations.RunPython(migrate_kfw_player_data, migrations.RunPython.noop),
        migrations.RemoveField(model_name="game", name="activeVotes"),
        migrations.RemoveField(model_name="game", name="playersPreMoveData"),
        migrations.RemoveField(model_name="game", name="FCMplayersMoveData"),
        migrations.RemoveField(model_name="game", name="KFWplayersHiddenData"),
        migrations.RemoveField(model_name="game", name="KFWplayersMoveData"),
    ]
