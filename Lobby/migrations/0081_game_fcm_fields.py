# Generated manually on 2026-02-11

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0080_remove_game_relatedbustournament"),
        ("FCM", "0092_fcm_game_automoves"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="FCMplayersMoveData",
            field=models.TextField(blank=True, default=""),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="game",
            name="FCMnotificationSuppression",
            field=models.CharField(default="000000", max_length=30),
        ),
        migrations.AddField(
            model_name="game",
            name="relatedFCMTournament",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="fcmtournamentGEN_relName",
                to="FCM.fcm_tournament",
            ),
        ),
    ]
