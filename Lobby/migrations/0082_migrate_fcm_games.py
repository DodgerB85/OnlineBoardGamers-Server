from django.db import migrations

def no_op(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0081_game_fcm_fields"),
        # REMOVED: ("FCM", "0092_fcm_game_automoves")
    ]

    operations = [
        migrations.RunPython(no_op, reverse_code=no_op),
    ]
