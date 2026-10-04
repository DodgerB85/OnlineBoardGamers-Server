# UR: 1830 BC game constants
#
# Sourced from the official Splotter Spellen rulebook (UrErules.pdf,
# https://splottercon.com/rules-ur-1830bc/). Values reproduced here so the
# shared server code and the Vue client agree on phase numbers and setup data.
#
# NOTE: the rulebook pages are laid out in columns, so the "number of cards per
# era" is ambiguous in the extracted text and has intentionally been left out.
# Everything else below is taken directly from the rulebook.

# --- Phases ---
# A game is a series of rounds, each with three phases. Before round 1 there is
# a one-off "dividing the independent nations" setup phase.
PHASE_DIVIDING_NATIONS = 0
PHASE_SETTLEMENT = 1
PHASE_DEVELOPMENT = 2
PHASE_RAINY_SEASON = 3
PHASE_GAME_OVER = 4

# The three phases that repeat each round.
MAIN_PHASES = [PHASE_SETTLEMENT, PHASE_DEVELOPMENT, PHASE_RAINY_SEASON]
ALL_PHASES = [PHASE_DIVIDING_NATIONS, PHASE_SETTLEMENT, PHASE_DEVELOPMENT, PHASE_RAINY_SEASON, PHASE_GAME_OVER]

# How many phases the client may look back when loading a pre-set move.
PHASE_LOOKBACK_AMOUNT = 1

# --- Starting options ---
# Ur is a single base game (no expansions), so there are no URR-specific
# starting option flags yet. The common options (Practice / Learning /
# Experienced) come from Lobby.sharedFunctions.constants.
SO_BASE_GAME = -1

# --- The six states (and their colours on the board) ---
# The board number of each state (1..6) is used for tie-breaks when ordering
# states in the development phase.
STATE_AKKAD = 0
STATE_BABYLON = 1
STATE_ELAM = 2
STATE_PERSIA = 3
STATE_SUMER = 4
STATE_URARTU = 5

STATE_NAMES = ["Akkad", "Babylon", "Elam", "Persia", "Sumer", "Urartu"]
STATE_COLOURS = ["grey", "blue", "green", "black", "yellow", "red"]
ALL_STATES = [STATE_AKKAD, STATE_BABYLON, STATE_ELAM, STATE_PERSIA, STATE_SUMER, STATE_URARTU]

# --- Land types and colonization prices ---
LAND_HILLS = 0
LAND_FOREST = 1
LAND_SAVANNAH = 2
LAND_DESERT = 3

LAND_NAMES = ["Hills", "Forest", "Savannah", "Desert"]
# Colonization price paid (to the state treasury) for previously-unsold land.
LAND_COLONIZATION_PRICES = [100, 82, 71, 60]
# Colonization price for a city site = the next-highest normal land price.
LAND_CITY_COLONIZATION_PRICES = [100, 100, 82, 71]
ALL_LAND_TYPES = [LAND_HILLS, LAND_FOREST, LAND_SAVANNAH, LAND_DESERT]

# A state becomes active once six of its land pieces have been colonized
# (markers on them, flipped or not) at the end of a settlement phase.
LAND_FOR_STATE_TO_ACTIVATE = 6

# --- Independent nations (alphabetical order) ---
NATION_ASHUR = 0
NATION_BARAHSHUM = 1
NATION_CALAH = 2
NATION_DER = 3
NATION_ERIDU = 4
NATION_FIRST_AKKADIANS = 5

NATION_NAMES = ["Ashur", "Barahshum", "Calah", "Der", "Eridu", "First Akkadians"]
# (price in Splägels, income per round in Splägels)
NATION_PRICES = [20, 40, 70, 110, 160, 220]
NATION_INCOMES = [10, 20, 25, 30, 35, 35]
ALL_NATIONS = [NATION_ASHUR, NATION_BARAHSHUM, NATION_CALAH, NATION_DER, NATION_ERIDU, NATION_FIRST_AKKADIANS]

# --- Technology eras (1..5, where 5 is the Millennium era) ---
ERA_1 = 1
ERA_2 = 2
ERA_3 = 3
ERA_4 = 4
ERA_5_MILLENNIUM = 5
ALL_ERAS = [ERA_1, ERA_2, ERA_3, ERA_4, ERA_5_MILLENNIUM]

# Water available at each river source, per era.
ERA_WATER_PER_RIVER = {
    ERA_1: 6,
    ERA_2: 6,
    ERA_3: 6,
    ERA_4: 7,
    ERA_5_MILLENNIUM: 8,
}
# Harvest the irrigating state gets per area, per era.
ERA_YIELD_PER_AREA = {
    ERA_1: 20,
    ERA_2: 20,
    ERA_3: 25,
    ERA_4: 25,
    ERA_5_MILLENNIUM: 30,
}
# The landowner of an irrigated area always gets 5 SPL (10 for a city site).
IRRIGATED_LANDOWNER_INCOME = 5

# Card values per era: (reservoir_capacity, reservoir_price),
#                      (pump_reach, pump_price),
#                      (digger_quality, digger_price)
# Era 5 values are "M" (unlimited/mill).
ERA_CARD_DATA = {
    ERA_1: {"reservoir": (2, 30), "pump": (1, 30), "digger": ("1+1", 50)},
    ERA_2: {"reservoir": (4, 80), "pump": (2, 80), "digger": (2, 100)},
    ERA_3: {"reservoir": (6, 100), "pump": (3, 100), "digger": (3, 150)},
    ERA_4: {"reservoir": (8, 150), "pump": (4, 150), "digger": (4, 200)},
    ERA_5_MILLENNIUM: {"reservoir": ("M", 200), "pump": ("M", 200), "digger": ("M", 400)},
}

# --- Starting money ---
STARTING_MONEY_BY_PLAYER_COUNT = {
    3: 600,
    4: 450,
    5: 360,
    6: 300,
}

# --- Game end conditions ---
END_REASON_REVOLUTION = "revolution"
END_REASON_SOUTHERN_INVASION = "invasion"
