"""Merge TGZ colour and minimal-text preferences into preferredTGZoptions."""

import json

from django.db import migrations, models


def build_tgz_options(apps, schema_editor):
    Profile = apps.get_model("Lobby", "Profile")
    for profile in Profile.objects.all():
        colour = profile.preferredTGZcolour if profile.preferredTGZcolour is not None else -1
        minimal = 1 if profile.TGZminimalText else 0
        # Leave the field blank for players who never changed either option.
        if colour == -1 and minimal == 0:
            continue
        profile.preferredTGZoptions = json.dumps([colour, minimal, 0], separators=(",", ":"))
        profile.save(update_fields=["preferredTGZoptions"])


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0121_profile_admin_flags"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="preferredTGZoptions",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.RunPython(build_tgz_options, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="profile",
            name="preferredTGZcolour",
        ),
        migrations.RemoveField(
            model_name="profile",
            name="TGZminimalText",
        ),
    ]
