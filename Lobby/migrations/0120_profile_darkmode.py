from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("Lobby", "0119_alter_game_gamecode_alter_tournament_gamecode"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="darkMode",
            field=models.BooleanField(default=False),
        ),
    ]
