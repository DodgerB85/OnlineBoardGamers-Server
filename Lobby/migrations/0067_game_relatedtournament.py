import django.db.models.deletion
from django.db import migrations, models


def no_op(apps, schema_editor):
    pass

class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0066_migrate_aqy_games"),
        # REMOVED: ("AQY", "0023_aqygame")
    ]

    operations = [
        # Option 1: Keep the field if you still use it in Lobby,
        # but point it to a model that actually exists (like Lobby.Main_Tournament)
        migrations.AddField(
            model_name="game",
            name="relatedTournament",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="tournament_games_relName",
                to="Lobby.Main_Tournament", # Changed from AQY.aqy_tournament
            ),
        ),
        # Option 2: If the field is totally useless now,
        # just comment out the AddField and the RunPython blocks.

        migrations.RunPython(no_op, no_op),
    ]
