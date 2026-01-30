# Generated manually on 2026-01-28

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('AQY', '0022_aqy_game_activevotes'),
        ('Lobby', '0062_game_relatedmaintournament_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='AQYgame',
            fields=[
            ],
            options={
                'verbose_name': 'AQY_Game',
                'verbose_name_plural': 'AQY_Games',
                'proxy': True,
                'indexes': [],
                'constraints': [],
            },
            bases=('Lobby.game',),
        ),
    ]
