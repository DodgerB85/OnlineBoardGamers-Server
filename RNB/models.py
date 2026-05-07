import time

from django.conf import settings
from django.db import models, transaction

from Lobby.sharedFunctions.sharedRefs import (
    SR_getTimeNow,
)


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
        help_text="Permanent unique ID for this map across all installations.",
        blank=True,
        null=True,
    )

    # Manual checkbox for verified maps to be part of the official collection
    isOfficial = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.uniqueID:
            # Atomic transaction to prevent two maps getting the same number
            with transaction.atomic():
                customElements = self.hexData[-1]
                uk_value = customElements.get("UK")
                self.uniqueID = uk_value
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.description})"


class RNBMapScoreManager(models.Manager):
    def add_highscore(self, user, game, map_ref, score):
        with transaction.atomic():
            # Lock the row to prevent race conditions
            score_entry = self.select_for_update().filter(user=user, map_ref=map_ref).first()

            # Calculate the rounded time once
            rounded_now = str(round(time.time() / 60) * 60)

            if score_entry:
                if score > score_entry.score:
                    score_entry.score = score
                    score_entry.game = game
                    score_entry.timeStamp = rounded_now
                    score_entry.save()
                    return score_entry, True
                return score_entry, False
            else:
                # Create fresh record with the same rounded time
                new_entry = self.create(
                    user=user,
                    game=game,
                    map_ref=map_ref,
                    score=score,
                    timeStamp=rounded_now,
                )
                return new_entry, True


class RNBMapScore(models.Model):
    # Link the custom manager
    objects = RNBMapScoreManager()

    map_ref = models.ForeignKey("RNBmap", to_field="uniqueID", on_delete=models.CASCADE, related_name="leaderboard_entries")

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="my_scores")

    game = models.ForeignKey("Lobby.Game", on_delete=models.CASCADE, related_name="rnb_scores")

    score = models.PositiveIntegerField(db_index=True)

    # Note: If SR_getTimeNow is a function, don't use () in the default
    timeStamp = models.CharField(max_length=15, blank=False, default=SR_getTimeNow)

    class Meta:
        # Note: 'timeStamp' is string-based, so it will sort alphabetically
        ordering = ["-score", "timeStamp"]
        verbose_name = "RNB Map Score"
        verbose_name_plural = "RNB Map Scores"

    def __str__(self):
        return f"{self.user.username}: {self.score} (Map: {self.map_ref.uniqueID})"
