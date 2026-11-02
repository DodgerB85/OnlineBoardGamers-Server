import html
import re

from django.db import migrations, models

# Only the entities django.utils.html.escape() emits count as corruption; a
# bare "&" the user typed is left alone.
ESCAPED_TEXT = re.compile(r"&(amp|lt|gt|quot|#x27|#39);")


def repaired(value):
    # Each rematch generation stored the previous value escaped once, so
    # unwind until html.unescape stops changing anything.
    if not ESCAPED_TEXT.search(value):
        return value
    while True:
        unescaped = html.unescape(value)
        if unescaped == value:
            return value
        value = unescaped


def unescape_game_text(apps, schema_editor):
    Game = apps.get_model("Lobby", "Game")
    games = Game.objects.filter(models.Q(gameName__contains="&") | models.Q(gameDescription__contains="&"))

    to_update = []
    for game in games:
        name = repaired(game.gameName)
        description = repaired(game.gameDescription)
        if (name, description) != (game.gameName, game.gameDescription):
            game.gameName = name
            game.gameDescription = description
            to_update.append(game)

    if to_update:
        Game.objects.bulk_update(to_update, ["gameName", "gameDescription"])


class Migration(migrations.Migration):
    dependencies = [
        ("Lobby", "0127_alter_tournament_tournamentname"),
    ]

    operations = [
        migrations.RunPython(unescape_game_text, migrations.RunPython.noop),
    ]
