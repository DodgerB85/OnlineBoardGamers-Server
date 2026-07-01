# Generated manually for player availability counters.

import Lobby.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("Lobby", "0112_normalize_legacy_tournament_statuses"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="availabilityMoveCounts",
            field=models.JSONField(blank=True, default=Lobby.models.default_availability_counts),
        ),
        migrations.AddField(
            model_name="profile",
            name="availabilityTurnCounts",
            field=models.JSONField(blank=True, default=Lobby.models.default_availability_counts),
        ),
    ]
