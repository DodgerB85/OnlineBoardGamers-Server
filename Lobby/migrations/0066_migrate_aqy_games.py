from django.db import migrations


def no_op(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        # Keep only the LOBBY dependency so the chain doesn't break
        ("Lobby", "0065_add_aqy_fields"),
        # REMOVE the ("AQY", "0001_initial") line!
    ]

    operations = [
        migrations.RunPython(no_op, no_op),
    ]
