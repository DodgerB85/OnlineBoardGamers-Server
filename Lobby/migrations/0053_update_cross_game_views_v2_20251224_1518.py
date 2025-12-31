import os
from django.db import migrations

def load_sql(view_name, version):
    path = os.path.join(os.path.dirname(__file__), 'views', view_name, f'v{version}.sql')
    with open(path, 'r') as f:
        return f.read()

CREATION_SQL_V2 = '\n'.join([
    load_sql('all_games_all_players', 2),
    load_sql('all_games_invited_players', 2),
    load_sql('all_games_winners', 2),
    load_sql('all_games', 2)
])

CREATION_SQL_V1 = '\n'.join([
    load_sql('all_games_all_players', 1),
    load_sql('all_games_invited_players', 1),
    load_sql('all_games_winners', 1),
    load_sql('all_games', 1)
])

class Migration(migrations.Migration):

    dependencies = [
        ('Lobby', '0052_add_cross_game_views_20251221_2139'),
    ]

    operations = [
        migrations.RunSQL(
            sql=CREATION_SQL_V2,
            reverse_sql=CREATION_SQL_V1
        )
    ]
