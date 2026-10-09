# Generic placeholder constants for the ROW scaffold.
#
# These are intentionally minimal - replace / extend them with the real
# Ranchers of the Old West phases and starting options as you build the game. They are kept
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
# Only option values that are ROW-specific belong here. The common options
# (Practice / Learning / Experienced) come from Lobby.sharedFunctions.constants.
SO_BASE_GAME = -1
SO_SECOND_EDITION = 2
SO_RTTN = 3  # Rails to the North expansion
SO_SIMMENTAL = 4  # second edition simmental cattle

# Extra setup options (mirror the Java GWTProvider options).
SO_MODE_STRATEGIC = 20
SO_BUILDINGS_BEGINNER = 21
SO_PLAYER_ORDER_BIDDING = 22
SO_VARIANT_BALANCED = 23
SO_STATION_MASTER_PROMOS = 24
SO_BUILDING_11 = 25
SO_BUILDING_13 = 26
