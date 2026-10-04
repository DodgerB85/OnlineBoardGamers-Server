# Generic placeholder constants for the PAP scaffold.
#
# These are intentionally minimal - replace / extend them with the real
# Permits and Poisons phases and starting options as you build the game. They are kept
# in their own module so the shared code (presenters / sharedRefs) can import
# them the same way the other games do.

# --- Phases ---
PHASE_SETUP = 0
PHASE_MAIN = 1
PHASE_GAME_OVER = 2

MAIN_PHASES = [PHASE_MAIN]
ALL_PHASES = [PHASE_SETUP, PHASE_MAIN, PHASE_GAME_OVER]

# How many phases the client may look back when loading a pre-set move.
PHASE_LOOKBACK_AMOUNT = 1

# --- Starting options (bit flags appended to Game.startingOptions) ---
# Only option values that are PAP-specific belong here. The common options
# (Practice / Learning / Experienced) come from Lobby.sharedFunctions.constants.
SO_BASE_GAME = -1
