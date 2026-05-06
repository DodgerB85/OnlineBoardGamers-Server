from django.db import models, transaction


class RNBmap(models.Model):
    id = models.AutoField(primary_key=True)  # Explicitly define the id field

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "RNB Map"
        verbose_name_plural = "RNB Maps"

    # Player counts
    playerCount = models.PositiveSmallIntegerField(default=2)

    # All map data (tiles, starting positions, etc.)
    # Note: Requires a database that supports JSON (like PostgreSQL or SQLite 3.9+)
    hexData = models.JSONField(blank=True, null=True, help_text="JUST the hex data, in format [ [q,r,rotation,terrainID], ...]]")
    uniqueID = models.PositiveIntegerField(
        unique=True,
        help_text="Permanent unique ID for this map across all installations."
    )
    # Highscores stored as an array of subArrs [ [userID, score, achievedTS], ...]
    highscores = models.JSONField(default=list, blank=True, null=True)

    # Manual checkbox for verified maps to be part of the official collection
    isOfficial = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.map_number:
            # Atomic transaction to prevent two maps getting the same number
            with transaction.atomic():
                last_map = RNBmap.objects.select_for_update().order_by('-map_number').first()
                if last_map:
                    self.map_number = last_map.map_number + 1
                else:
                    self.map_number = 1  # Start at 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.description})"
