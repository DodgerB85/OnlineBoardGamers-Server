from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('KFW', '0016_remove_kfw_game_deletegamevotes_and_more'),
        ('Lobby', '0097_migrate_kfw_games'),
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
