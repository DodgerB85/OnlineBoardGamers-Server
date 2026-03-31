from django.db import models

class RNBmap(models.Model):
    id = models.AutoField(primary_key=True)  # Explicitly define the id field
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Player counts
    min_players = models.PositiveSmallIntegerField(default=1)
    max_players = models.PositiveSmallIntegerField(default=6)
    
    # All map data (tiles, starting positions, etc.)
    # Note: Requires a database that supports JSON (like PostgreSQL or SQLite 3.9+)
    hexData = models.JSONField(blank=True, null=True, help_text="JUST the hex data, in format [ [q,r,rotation,terrainID], ...]]")
    customElements = models.JSONField(blank=True, null=True, help_text="Preset starting locations, built bridges, etc etc")
    
    # Highscores stored as an array of subArrs [ [userID, score, achievedTS], ...]
    highscores = models.JSONField(default=list, blank=True, null=True)

    # Manual checkbox for verified maps to be part of the official collection
    isOfficial = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.description})"