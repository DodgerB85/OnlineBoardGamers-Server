from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("Lobby", "0117_alter_profile_profilelanguage")]
    operations = [
        migrations.AddField(model_name="profile", name="hotStreakEnabled", field=models.BooleanField(default=True)),
        migrations.AddField(model_name="profile", name="hotStreakReminders", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="profile", name="receiveTurnNudges", field=models.BooleanField(default=True)),
        migrations.AddField(model_name="game", name="streakDays", field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="game", name="streakBestDays", field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="game", name="streakLastMoveDate", field=models.DateField(null=True, blank=True)),
        migrations.AddField(model_name="gameplayer", name="lastNudgedAt", field=models.DateTimeField(null=True, blank=True)),
        migrations.AddField(model_name="gameplayer", name="lastNudgedBy", field=models.CharField(max_length=150, blank=True, default="")),
    ]
