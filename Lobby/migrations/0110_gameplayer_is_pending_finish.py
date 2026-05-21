from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0109_tournament_openedforsignupat_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="gameplayer",
            name="is_pending_finish",
            field=models.BooleanField(default=False),
        ),
    ]
