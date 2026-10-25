"""Merge FCM restaurant colour and high-contrast preferences into preferredFCMoptions."""

import json

from django.db import migrations, models


def build_fcm_options(apps, schema_editor):
    Profile = apps.get_model("Lobby", "Profile")
    for profile in Profile.objects.all():
        colour = profile.preferredRestaurantColour if profile.preferredRestaurantColour is not None else -1
        high_contrast = 1 if profile.highContrastBoardItems else 0
        # Leave the field blank for players who never changed either option.
        if colour == -1 and high_contrast == 0:
            continue
        profile.preferredFCMoptions = json.dumps([colour, high_contrast, 0], separators=(",", ":"))
        profile.save(update_fields=["preferredFCMoptions"])


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0122_profile_preferredtgzoptions"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="preferredFCMoptions",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.RunPython(build_fcm_options, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="profile",
            name="preferredRestaurantColour",
        ),
        migrations.RemoveField(
            model_name="profile",
            name="highContrastBoardItems",
        ),
    ]
