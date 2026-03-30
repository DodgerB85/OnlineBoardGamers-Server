from django.db import migrations

def no_op(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0067_game_relatedtournament"), 
        # DELETE the ("TGZ", "0001_initial") line!
    ]

    operations = [
        migrations.RunPython(no_op, no_op),
    ]
