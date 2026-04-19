from django.db import migrations


def migrate_hc_games(apps, schema_editor):
    """
    No-op: HLC app has been deleted/unified into Lobby.
    """
    pass

def reverse_migration(apps, schema_editor):
    """
    No-op
    """
    pass

class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0090_game_relatedhctournament"),
        # Ensure there are NO dependencies on "HLC" here
    ]

    operations = [
        migrations.RunPython(migrate_hc_games, reverse_migration),
    ]
