from django.db import migrations

def no_op(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0062_game_relatedmaintournament_and_more"),
        # REMOVED: ("WEB", "0001_initial") 
    ]

    operations = [
        migrations.RunPython(no_op, reverse_code=no_op),
    ]
