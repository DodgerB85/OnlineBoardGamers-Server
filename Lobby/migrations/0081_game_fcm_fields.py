# Generated manually on 2026-02-11

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0080_remove_game_relatedbustournament"),
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
    ]
