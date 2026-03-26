# Generated manually on 2026-02-10

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("BUS", "0023_bus_game_automoves"),  # Ensure BUS app is available
        ("Lobby", "0077_remove_game_relatedindtournament"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="relatedBusTournament",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="bustournamentGEN_relName",
                to="BUS.Bus_Tournament",
            ),
        ),
    ]
