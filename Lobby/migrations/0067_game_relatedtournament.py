# Generated manually on 2026-01-30

from django.db import migrations, models
import django.db.models.deletion


def populate_related_tournament(apps, schema_editor):
    """
    Populate relatedTournament field for existing AQY games from AQY_Game model
    """
    AQY_Game = apps.get_model("AQY", "AQY_Game")
    Game = apps.get_model("Lobby", "Game")

    # Get all AQY games in the unified model
    aqy_games = Game.objects.filter(gameCode="AQY").select_related("relatedTournament")

    print(f"\nPopulating relatedTournament for {aqy_games.count()} AQY games...")

    updated_count = 0

    for game in aqy_games:
        # Find the original AQY_Game using original_id
        if game.original_id:
            try:
                aqy_game = AQY_Game.objects.get(id=game.original_id)
                if aqy_game.relatedTournament:
                    game.relatedTournament = aqy_game.relatedTournament
                    game.save(update_fields=["relatedTournament"])
                    updated_count += 1
            except AQY_Game.DoesNotExist:
                print(f"  Warning: Could not find AQY_Game with id={game.original_id}")

    print(f"Successfully updated {updated_count} games with relatedTournament!")


def reverse_population(apps, schema_editor):
    """
    Clear relatedTournament field for AQY games
    """
    Game = apps.get_model("Lobby", "Game")

    updated_count = (
        Game.objects.filter(gameCode="AQY")
        .exclude(relatedTournament__isnull=True)
        .count()
    )
    Game.objects.filter(gameCode="AQY").update(relatedTournament=None)

    print(f"Cleared relatedTournament for {updated_count} AQY games")


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0066_migrate_aqy_games"),
        ("AQY", "0023_aqygame"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="relatedTournament",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="tournament_games_relName",
                to="AQY.aqy_tournament",
            ),
        ),
        migrations.RunPython(populate_related_tournament, reverse_population),
    ]
