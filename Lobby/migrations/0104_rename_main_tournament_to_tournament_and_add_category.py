import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("Lobby", "0103_alter_game_startingmap"),
        # CRITICAL: This tells Django to ensure auth_user exists before running
        ("auth", "__latest__"),
    ]

    operations = [
        # 1. Rename the model first
        migrations.RenameModel(
            old_name="Main_Tournament",
            new_name="Tournament",
        ),
        # 2. Add the simple CharField
        migrations.AddField(
            model_name="tournament",
            name="tournamentCategory",
            field=models.CharField(
                max_length=4,
                choices=[("Main", "Main Tournament"), ("Mini", "Mini Tournament")],
                default="Main",
            ),
        ),
        # 3. Add the ForeignKey using consistent settings.AUTH_USER_MODEL
        migrations.AddField(
            model_name="tournament",
            name="creator",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.SET_NULL,
                null=True,
                blank=True,
                related_name="tournament_creator_relName",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # 4. Add the ManyToMany field
        migrations.AddField(
            model_name="tournament",
            name="invitedPlayers",
            field=models.ManyToManyField(
                related_name="invitedPlayersRelName_Tournament",
                to=settings.AUTH_USER_MODEL,
                blank=True,
            ),
        ),
        # 5. Fix AlterFields to use settings.AUTH_USER_MODEL instead of "auth.user"
        # This prevents mismatches between the model name and the actual table
        migrations.AlterField(
            model_name="tournament",
            name="startingPlayers",
            field=models.ManyToManyField(
                related_name="startingPlayersRelName_Tournament",
                to=settings.AUTH_USER_MODEL,
                blank=True,
            ),
        ),
        migrations.AlterField(
            model_name="tournament",
            name="nextRoundPlayers",
            field=models.ManyToManyField(
                related_name="currentRoundPlayersRelName_Tournament",
                to=settings.AUTH_USER_MODEL,
                blank=True,
            ),
        ),
        # 6. Update the ForeignKey in the Game model
        migrations.AlterField(
            model_name="game",
            name="relatedMiniTournament",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.SET_NULL,
                null=True,
                blank=True,
                related_name="minitournamentGEN_relName",
                to="Lobby.tournament",
            ),
        ),
    ]
