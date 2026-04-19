# Generated manually on 2026-02-10

from django.db import migrations


def migrate_bus_games(apps, schema_editor):
    """
    No-op: BUS app has been deleted and unified into Lobby.
    """
    pass

def reverse_migration(apps, schema_editor):
    """
    No-op
    """
    pass

class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0078_game_relatedbustournament"),
        # REMOVED: ("BUS", "0023_bus_game_automoves")
        # Removing this prevents the NodeNotFoundError and CircularDependencyError
    ]

    operations = [
        migrations.RunPython(migrate_bus_games, reverse_migration),
    ]
