from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0110_gameplayer_is_pending_finish"),
    ]

    operations = [
        migrations.AddField(
            model_name="game",
            name="transactionID",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]
