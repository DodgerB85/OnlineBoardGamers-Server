from typing import Final

MINI_T_FLAG: Final = "MiniT"
MAIN_T_FLAG: Final = "MainT"

# Ordered list of shadow player usernames (used when creating training games)
SHADOW_PLAYER_NAMES = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5"]
# Full set of bot/shadow usernames for membership checks (is-my-move, kickout, etc.)
SHADOW_USERNAMES = {*SHADOW_PLAYER_NAMES, "FcmAI"}
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

# PACE
PACE_LIVE = 10
PACE_FAST = 20
PACE_STANDARD = 30
PACE_SLOW = 40
PACE_CASUAL = 50

# KICKOUT DURATIONS
KICKOUT_5_MINUTES = 5
KICKOUT_10_MINUTES = 10
KICKOUT_20_MINUTES = 20
KICKOUT_12_HOURS = 50
KICKOUT_1_DAY = 100
KICKOUT_2_DAYS = 200
KICKOUT_3_DAYS = 300
KICKOUT_5_DAYS = 500

# COMMON STARTING OPTIONS
SO_TRAINING_GAME = 102
SO_LEARNING_GAME = 110
SO_EXPERIENCED_GAME = 120
