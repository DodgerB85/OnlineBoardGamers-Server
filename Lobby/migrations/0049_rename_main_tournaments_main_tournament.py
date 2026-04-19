from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0048_alter_mini_tournaments_tournamenttype_and_more"),
        # REMOVE the ("TGZ", "0023_tgz_game_relatedmaintournament") line
    ]

    operations = [
        migrations.RenameModel(
            old_name="Main_Tournaments",
            new_name="Main_Tournament",
        ),
    ]
