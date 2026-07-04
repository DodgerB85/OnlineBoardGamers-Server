# Generated manually to merge independent Lobby migration branches.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("Lobby", "0113_seed_sample_main_tournaments"),
        ("Lobby", "0114_gameplayer_availabilityanchor"),
    ]

    operations = []
