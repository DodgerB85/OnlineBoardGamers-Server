from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('Lobby', '0088_game_serverremainingplayerorderbynames'),
    ]

    operations = [
        migrations.DeleteModel(name='QueryableGameAllPlayers'),
        migrations.DeleteModel(name='QueryableGameInvitedPlayers'),
        migrations.DeleteModel(name='QueryableGameWinners'),
        migrations.DeleteModel(name='QueryableGame'),
        migrations.RunSQL(
            sql="""
DROP VIEW IF EXISTS Lobby_all_games_all_players;
DROP VIEW IF EXISTS Lobby_all_games_invited_players;
DROP VIEW IF EXISTS Lobby_all_games_winners;
DROP VIEW IF EXISTS Lobby_all_games;
""",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
