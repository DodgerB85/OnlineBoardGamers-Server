# Duck Dealer constants.

# --- Phases ---
PHASE_SETUP = 0
PHASE_MAIN = 1
PHASE_GAME_OVER = 2

MAIN_PHASES = [PHASE_SETUP, PHASE_MAIN]
ALL_PHASES = [PHASE_SETUP, PHASE_MAIN, PHASE_GAME_OVER]

# How many phases the client may look back when loading a pre-set move.
PHASE_LOOKBACK_AMOUNT = 1

# --- Starting options (bit flags appended to Game.startingOptions) ---
# Common options (Practice / Learning / Experienced) come from
# Lobby.sharedFunctions.constants.
SO_BASE_GAME = -1
SO_AUCTION = 1
