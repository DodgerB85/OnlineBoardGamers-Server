"""Merge BUS colour and board preferences into preferredBUSoptions."""

import json

from django.db import migrations, models


def build_bus_options(apps, schema_editor):
    Profile = apps.get_model("Lobby", "Profile")
    for profile in Profile.objects.all():
        colour = profile.preferredBusColour if profile.preferredBusColour is not None else -1
        board = profile.preferredBusBoard if profile.preferredBusBoard is not None else 0
        # Leave the field blank for players who never changed either option.
        if colour == -1 and board == 0:
            continue
        profile.preferredBUSoptions = json.dumps([colour, board, 0], separators=(",", ":"))
        profile.save(update_fields=["preferredBUSoptions"])


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0123_profile_preferredfcmoptions"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="preferredBUSoptions",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.RunPython(build_bus_options, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="profile",
            name="preferredBusColour",
        ),
        migrations.RemoveField(
            model_name="profile",
            name="preferredBusBoard",
        ),
    ]
