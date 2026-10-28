# NTR (Napoleon's Triumph) Constants
# Phases
PHASE_ALLIED_TURN = 0
PHASE_FRENCH_TURN = 1
PHASE_GAME_OVER = 2

# Phase lists for easier checking
ALLIED_PHASES = [PHASE_ALLIED_TURN]
FRENCH_PHASES = [PHASE_FRENCH_TURN]
MAIN_PHASES = [PHASE_ALLIED_TURN, PHASE_FRENCH_TURN]

# Max rounds in the game
MAX_ROUNDS = 10

# Starting Options (102/110/120 are the shared practice/learning/experienced ids)
SO_SCENARIO_DEC_01 = 1
SO_SCENARIO_DEC_02 = 2
SO_FRENCH_REINFORCEMENTS = 10
SO_SANTON_FORT = 11
SO_TEAM_PLAY = 12

# Scenario starting options -> the slug the client uses in NTRmap.js
SCENARIO_SLUGS = {SO_SCENARIO_DEC_01: "dec_01", SO_SCENARIO_DEC_02: "dec_02"}
DEFAULT_SCENARIO = SO_SCENARIO_DEC_01

# Unit Types
UNIT_COMMANDER = "COMMANDER"
UNIT_INFANTRY = "INFANTRY"
UNIT_GUARD_INFANTRY = "GUARD_INFANTRY"
UNIT_CAVALRY = "CAVALRY"
UNIT_ARTILLERY = "ARTILLERY"

ALL_UNIT_TYPES = [
    UNIT_COMMANDER,
    UNIT_INFANTRY,
    UNIT_GUARD_INFANTRY,
    UNIT_CAVALRY,
    UNIT_ARTILLERY,
]

# Sides
SIDE_ALLIED = "ALLIED"
SIDE_FRENCH = "FRENCH"

# Corps Assignments (for team play - up to 8 players)
# Allied Corps (4 players max)
ALLIED_CORPS = {
    0: "AUSTRIAN",
    1: "RUSSIAN_1",
    2: "RUSSIAN_2",
    3: "RUSSIAN_3",
}

# French Corps (4 players max)
FRENCH_CORPS = {
    0: "IMPERIAL_GUARD",
    1: "I_CORPS",
    2: "II_CORPS",
    3: "III_CORPS",
    4: "IV_CORPS",
    5: "V_CORPS",
    6: "CAVALRY_RESERVE",
}

# Corps display names
CORPS_DISPLAY_NAMES = {
    "AUSTRIAN": "Austrian Corps",
    "RUSSIAN_1": "Russian 1st Column",
    "RUSSIAN_2": "Russian 2nd Column",
    "RUSSIAN_3": "Russian 3rd Column",
    "IMPERIAL_GUARD": "Imperial Guard",
    "I_CORPS": "I Corps (Davout)",
    "II_CORPS": "II Corps (Lannes)",
    "III_CORPS": "III Corps (Soult)",
    "IV_CORPS": "IV Corps (Murat)",
    "V_CORPS": "V Corps (Lannes)",
    "CAVALRY_RESERVE": "Cavalry Reserve",
}

# Morale Track
INITIAL_ALLIED_MORALE = 12
INITIAL_FRENCH_MORALE = 12

# Morale Penalties
MORALE_LOSS_GUARD_DESTROYED = 2
MORALE_LOSS_CAVALRY_FIRST_COMMIT = 1
MORALE_LOSS_STEP_LOSS = 1
MORALE_LOSS_RETREAT = 1

SCENARIO_NAMES = {
    SO_SCENARIO_DEC_01: "1 December 1805 (Evening)",
    SO_SCENARIO_DEC_02: "2 December 1805 (Morning)",
}

# Approach Properties
APPROACH_WIDE = "wide"
APPROACH_NARROW = "narrow"

APPROACH_TERRAIN_TYPES = {
    "CLEAR": "clear",
    "ROUGH": "rough",
    "WOODED": "wooded",
    "STREAM": "stream",
    "RIVER": "river",
    "ROAD": "road",
}

# Approach capacity limits
WIDE_APPROACH_CAPACITY = 3  # max steps per side
NARROW_APPROACH_CAPACITY = 1  # max steps per side

# Cavalry penalty on certain approaches
CAVALRY_PENALTY_APPROACHES = {
    APPROACH_TERRAIN_TYPES["ROUGH"],
    APPROACH_TERRAIN_TYPES["WOODED"],
    APPROACH_TERRAIN_TYPES["STREAM"],
    APPROACH_TERRAIN_TYPES["RIVER"],
}

# Combat
COMBAT_DICE_SIDES = 6

# Fog of War
FOG_OF_WAR_HIDDEN = "hidden"
FOG_OF_WAR_REVEALED = "revealed"

# Game Data Keys
NTR_GAME_DATA_VERSION = 1
