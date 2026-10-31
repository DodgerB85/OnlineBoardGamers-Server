"""Server-to-server calls to the Discord bot's Eclipse API.

The bot owns the saves and Discord channels. OBG only asks it to create a game
and then reads/writes through the proxy in `views.py`.
"""
import requests
from decouple import config


class ECLBotError(Exception):
    pass


def _bot_url():
    url = config("ECL_BOT_URL", default="").rstrip("/")
    if not url:
        raise ECLBotError("ECL_BOT_URL is not configured")
    return url


def _secret():
    secret = config("ECL_BOT_SECRET", default="")
    if not secret:
        raise ECLBotError("ECL_BOT_SECRET is not configured")
    return secret


def create_remote_game(game_name, players, max_players, starting_options):
    """Create the `aebN` game and Discord channels, returning the bot's reply.

    ``players`` is an ordered list of ``{"discord_id": ..., "name": ...}``.
    ``starting_options`` is the OBG starting-option list; map it to the bot's
    boolean setup flags.
    """
    from ECL.ECLconstants import OPTION_CHOICES

    enabled = {option for option in starting_options}
    body = {
        "name": game_name,
        "players": players,
        "player_count": max_players,
        "ai_ship_type": "def",
    }
    for key, option in OPTION_CHOICES:
        body[key] = option in enabled

    try:
        response = requests.post(
            f"{_bot_url()}/api/obg/games",
            json=body,
            headers={"X-OBG-Token": _secret()},
            timeout=120,
        )
    except requests.RequestException as exc:
        raise ECLBotError(f"Discord bot is unreachable: {exc}") from exc
    if response.status_code != 201:
        detail = response.text[:300]
        raise ECLBotError(f"Discord bot refused game creation ({response.status_code}): {detail}")
    try:
        data = response.json()
    except ValueError as exc:
        raise ECLBotError("Discord bot returned an invalid response") from exc
    if not data.get("id"):
        raise ECLBotError("Discord bot returned no game id")
    return data
