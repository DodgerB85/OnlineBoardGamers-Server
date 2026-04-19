from django.db import migrations


def migrate_ind_games(apps, schema_editor):
    # No-Op: IND app has been deleted
    pass

def reverse_migration(apps, schema_editor):
    # No-Op
    pass

class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0075_game_playerspremovedata_game_relatedindtournament"),
        # REMOVED: ("IND", "0021_indgame") - This line would cause a crash!
    ]

    operations = [
        migrations.RunPython(migrate_ind_games, reverse_migration),
    ]
