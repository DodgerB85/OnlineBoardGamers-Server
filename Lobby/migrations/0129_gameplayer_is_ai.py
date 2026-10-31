from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("Lobby", "0128_alter_game_gamecode_alter_tournament_gamecode"),
    ]

    operations = [
        migrations.AddField(
            model_name="gameplayer",
            name="is_ai",
            field=models.BooleanField(default=False),
        ),
    ]
