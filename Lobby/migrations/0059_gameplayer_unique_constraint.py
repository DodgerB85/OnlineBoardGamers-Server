# Generated manually on 2026-01-16

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0058_migrate_cns_games"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="gameplayer",
            constraint=models.UniqueConstraint(
                fields=["game", "player"], name="unique_game_player"
            ),
        ),
    ]
