"""Explicit staff flags, replacing hardcoded username checks."""

from django.db import migrations, models

SITE_ADMINS = ["admin", "DodgerB"]
GAME_ADMINS = ["admin", "DodgerB", "BotKickStarter", "FCMtourneyAdmin"]


def grant_existing_admins(apps, schema_editor):
    Profile = apps.get_model("Lobby", "Profile")
    Profile.objects.filter(user__username__in=SITE_ADMINS).update(is_site_admin=True)
    Profile.objects.filter(user__username__in=GAME_ADMINS).update(is_game_admin=True)


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0120_profile_darkmode"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="is_site_admin",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="profile",
            name="is_game_admin",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(grant_existing_admins, migrations.RunPython.noop),
    ]
