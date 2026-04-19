from django.db import migrations


def migrate_cns_games(apps, schema_editor):
    # Do nothing - CNS app is deleted
    pass

def reverse_migration(apps, schema_editor):
    # Do nothing
    pass

class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0057_add_gameplayer_fields"),
        # REMOVE the ("CNS", "0001_initial") dependency!
    ]

    operations = [
        migrations.RunPython(migrate_cns_games, reverse_migration),
    ]
