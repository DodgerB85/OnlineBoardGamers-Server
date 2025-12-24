import os
from django.db import migrations

def load_sql(view_name):
    path = os.path.join(os.path.dirname(__file__), 'views', view_name, 'v1.sql')
    with open(path, 'r') as f:
        return f.read()

CREATION_SQL = '\n'.join([
    load_sql('all_games_all_players'),
    load_sql('all_games_invited_players'),
    load_sql('all_games_winners'),
    load_sql('all_games')
])

DESTRUCTION_SQL="""
DROP VIEW IF EXISTS Lobby_all_games_all_players;
DROP VIEW IF EXISTS Lobby_all_games_invited_players;
DROP VIEW IF EXISTS Lobby_all_games_winners;
DROP VIEW IF EXISTS Lobby_all_games;
"""

class Migration(migrations.Migration):

    dependencies = [
        ('Lobby', '0051_queryablegame_queryablegameallplayers_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql=CREATION_SQL,
            reverse_sql=DESTRUCTION_SQL
        )
    ]
