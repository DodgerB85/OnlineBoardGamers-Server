from django.db import migrations


def migrate_kfw_games(apps, schema_editor):
    # App is deleted, do nothing
    pass

class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0096_game_kfw_fields"),
        # REMOVE THIS LINE: ("KFW", "0015_kfw_game_gamedatablob"),
    ]

    operations = [
        migrations.RunPython(migrate_kfw_games, migrations.RunPython.noop),
    ]
