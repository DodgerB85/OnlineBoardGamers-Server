# Generated manually on 2026-01-16

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0056_game_gameplayer"),
    ]

    operations = [
        migrations.AddField(
            model_name="gameplayer",
            name="is_missing",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="gameplayer",
            name="is_kicked",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="gameplayer",
            name="seat_order",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AlterModelOptions(
            name="gameplayer",
            options={"ordering": ["seat_order"]},
        ),
    ]
