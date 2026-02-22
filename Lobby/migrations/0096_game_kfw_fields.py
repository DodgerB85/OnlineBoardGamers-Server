import django.db.models.deletion
import json
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Lobby', '0095_rename_serverremainingplayerorderbynames_game_servercurrentplayernamesinturnorder_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='KFWserverData',
            field=models.TextField(blank=True, default=json.dumps([[40, 40, 40, 0], [16, 16, 16]])),
        ),
        migrations.AddField(
            model_name='game',
            name='KFWplayersHiddenData',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='game',
            name='KFWplayersMoveData',
            field=models.TextField(blank=True),
        ),
    ]
