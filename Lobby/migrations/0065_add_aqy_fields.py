# Generated manually on 2026-01-28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Lobby', '0064_alter_game_gamecode'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='playerTradeData',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='gameplayer',
            name='currentMoveTime',
            field=models.CharField(blank=True, max_length=15),
        ),
        migrations.AddField(
            model_name='gameplayer',
            name='currentMoveData',
            field=models.TextField(blank=True),
        ),
    ]
