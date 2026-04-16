# Migration to delete the old Mini_Tournaments model after copying data to Tournament

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("Lobby", "0105_copy_mini_tournaments_to_tournament"),
    ]

    operations = [
        migrations.DeleteModel(
            name="Mini_Tournaments",
        ),
    ]
