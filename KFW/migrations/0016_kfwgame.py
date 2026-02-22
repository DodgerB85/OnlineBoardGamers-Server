from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('KFW', '0015_kfw_game_gamedatablob'),
        ('Lobby', '0096_migrate_kfw_games'),
    ]

    operations = [
        migrations.CreateModel(
            name='KFWgame',
            fields=[
            ],
            options={
                'verbose_name': 'KFW_Game',
                'verbose_name_plural': 'KFW_Games',
                'abstract': False,
                'proxy': True,
                'indexes': [],
                'constraints': [],
            },
            bases=('Lobby.game',),
        ),
    ]
