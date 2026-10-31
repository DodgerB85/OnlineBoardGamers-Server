from django.db import models


class ECLgameLink(models.Model):
    """Map an OBG lobby game to the Discord bot's `aebN` game.

    Eclipse state and history stay in the bot; this row only carries identity
    and the Discord channel links shown on the game page.
    """

    game = models.OneToOneField("Lobby.Game", on_delete=models.CASCADE, related_name="ecl_link")
    external_game_id = models.CharField(max_length=20, blank=True, default="")
    tabletalk_url = models.CharField(max_length=300, blank=True, default="")
    actions_url = models.CharField(max_length=300, blank=True, default="")

    def __str__(self):
        return f"{self.game_id}: {self.external_game_id or 'not started'}"
