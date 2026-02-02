from typing import Final

MINI_T_FLAG: Final = "MiniT"
MAIN_T_FLAG: Final = "MainT"
DELETE_VOTE_TOPIC: Final = "delete_game_votes"
STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"
REWIND_CONSENT_VOTE_TOPIC = "rewind_consent_votes"
BLANK_MESSAGE_TEMPLATE = {
    "gameID": 0,
    "gameName": "NO_GAME_NAME",
    "gameCode": "NON",
    "maxPlayers": 0,
    "username": "NO_USERNAME",
    "currentPlayersString": "NO_CURRENT_PLAYERS",
    "domain": "www.onlineboardgamers.com",
    "relatedMainTournamentID": 0,
    "relatedMiniTournamentID": 0,

}