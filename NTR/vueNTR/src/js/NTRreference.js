// NTRreference.js - Game constants and reference data

// Unit Types
export const UNIT_COMMANDER = "COMMANDER"
export const UNIT_INFANTRY = "INFANTRY"
export const UNIT_GUARD_INFANTRY = "GUARD_INFANTRY"
export const UNIT_CAVALRY = "CAVALRY"
export const UNIT_ARTILLERY = "ARTILLERY"

export const ALL_UNIT_TYPES = [
  UNIT_COMMANDER,
  UNIT_INFANTRY,
  UNIT_GUARD_INFANTRY,
  UNIT_CAVALRY,
  UNIT_ARTILLERY,
]

// Unit base stats
export const UNIT_STATS = {
  [UNIT_COMMANDER]: { strength: 0, move: 3, command: 3, gfx: 'unit_commander' },
  [UNIT_INFANTRY]: { strength: 2, move: 2, command: 0, gfx: 'unit_infantry' },
  [UNIT_GUARD_INFANTRY]: { strength: 3, move: 2, command: 0, gfx: 'unit_guard' },
  [UNIT_CAVALRY]: { strength: 2, move: 4, command: 0, gfx: 'unit_cavalry' },
  [UNIT_ARTILLERY]: { strength: 1, move: 1, command: 0, gfx: 'unit_artillery' },
}

// Unit display names
export const UNIT_DISPLAY_NAMES = {
  [UNIT_COMMANDER]: "Commander",
  [UNIT_INFANTRY]: "Infantry",
  [UNIT_GUARD_INFANTRY]: "Guard Infantry",
  [UNIT_CAVALRY]: "Cavalry",
  [UNIT_ARTILLERY]: "Artillery",
}

// Sides
export const SIDE_ALLIED = "ALLIED"
export const SIDE_FRENCH = "FRENCH"

// Terrain Types
export const TERRAIN_CLEAR = "clear"
export const TERRAIN_ROUGH = "rough"
export const TERRAIN_WOODED = "wooded"
export const TERRAIN_HILL = "hill"
export const TERRAIN_TOWN = "town"
export const TERRAIN_FORT = "fort"

export const ALL_TERRAINS = [
  { id: TERRAIN_CLEAR, name: "Clear", moveCost: 1, defense: 0 },
  { id: TERRAIN_ROUGH, name: "Rough", moveCost: 2, defense: 1 },
  { id: TERRAIN_WOODED, name: "Wooded", moveCost: 2, defense: 1 },
  { id: TERRAIN_HILL, name: "Hill", moveCost: 2, defense: 2 },
  { id: TERRAIN_TOWN, name: "Town", moveCost: 1, defense: 1 },
  { id: TERRAIN_FORT, name: "Fortification", moveCost: 1, defense: 3 },
]

// Approach Types
export const APPROACH_WIDE = "wide"
export const APPROACH_NARROW = "narrow"

export const APPROACH_TERRAIN_TYPES = {
  CLEAR: "clear",
  ROUGH: "rough",
  WOODED: "wooded",
  STREAM: "stream",
  RIVER: "river",
  ROAD: "road",
}

export const ALL_APPROACH_TYPES = [
  { id: "wide_clear", name: "Wide Clear", type: APPROACH_WIDE, terrain: "clear", capacity: 3 },
  { id: "narrow_clear", name: "Narrow Clear", type: APPROACH_NARROW, terrain: "clear", capacity: 1 },
  { id: "wide_rough", name: "Wide Rough", type: APPROACH_WIDE, terrain: "rough", capacity: 3 },
  { id: "narrow_rough", name: "Narrow Rough", type: APPROACH_NARROW, terrain: "rough", capacity: 1 },
  { id: "wide_wooded", name: "Wide Wooded", type: APPROACH_WIDE, terrain: "wooded", capacity: 3 },
  { id: "narrow_wooded", name: "Narrow Wooded", type: APPROACH_NARROW, terrain: "wooded", capacity: 1 },
  { id: "wide_stream", name: "Wide Stream", type: APPROACH_WIDE, terrain: "stream", capacity: 2 },
  { id: "narrow_stream", name: "Narrow Stream", type: APPROACH_NARROW, terrain: "stream", capacity: 1 },
  { id: "wide_river", name: "Wide River", type: APPROACH_WIDE, terrain: "river", capacity: 1 },
  { id: "narrow_river", name: "Narrow River", type: APPROACH_NARROW, terrain: "river", capacity: 1 },
  { id: "wide_road", name: "Wide Road", type: APPROACH_WIDE, terrain: "road", capacity: 3 },
  { id: "narrow_road", name: "Narrow Road", type: APPROACH_NARROW, terrain: "road", capacity: 1 },
]

// Approach capacity limits
export const WIDE_APPROACH_CAPACITY = 3
export const NARROW_APPROACH_CAPACITY = 1

// Cavalry penalty approaches
export const CAVALRY_PENALTY_TERRAINS = new Set(["rough", "wooded", "stream", "river"])

// Phases
export const PHASE_ALLIED_TURN = 0
export const PHASE_FRENCH_TURN = 1
export const PHASE_GAME_OVER = 2

export const MAIN_PHASES = [PHASE_ALLIED_TURN, PHASE_FRENCH_TURN]
export const MAX_ROUNDS = 10

// Morale
export const INITIAL_ALLIED_MORALE = 12
export const INITIAL_FRENCH_MORALE = 12

export const MORALE_LOSS_GUARD_DESTROYED = 2
export const MORALE_LOSS_CAVALRY_FIRST_COMMIT = 1
export const MORALE_LOSS_STEP_LOSS = 1
export const MORALE_LOSS_RETREAT = 1

// Corps (for team play)
export const ALLIED_CORPS = {
  0: "AUSTRIAN",
  1: "RUSSIAN_1",
  2: "RUSSIAN_2",
  3: "RUSSIAN_3",
}

export const FRENCH_CORPS = {
  0: "IMPERIAL_GUARD",
  1: "I_CORPS",
  2: "II_CORPS",
  3: "III_CORPS",
  4: "IV_CORPS",
  5: "V_CORPS",
  6: "CAVALRY_RESERVE",
}

export const CORPS_DISPLAY_NAMES = {
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

// Starting Options
export const SO_FRENCH_REINFORCEMENTS = 10
export const SO_SANTON_FORT = 11
export const SO_TEAM_PLAY = 12

// Scenarios
export const SCENARIO_HISTORICAL = 0
export const SCENARIO_ALTERNATE = 1

export const SCENARIO_NAMES = {
  [SCENARIO_HISTORICAL]: "Historical (Dec 2, 1805)",
  [SCENARIO_ALTERNATE]: "Alternate Deployment",
}

// Game Data Version
export const NTR_GAME_DATA_VERSION = 1

// Combat
export const COMBAT_DICE_SIDES = 6

// Fog of War
export const FOG_OF_WAR_HIDDEN = "hidden"
export const FOG_OF_WAR_REVEALED = "revealed"

// Admin users
export const SUPER_USERS = [
  'admin', 'DodgerB', 'Burmer', 'Batch', 'Beezy', 'Benkyo', 'BigBad',
  'Brent', 'BotKickStarter', 'DodgerB', 'Dopple', 'Dycu', 'F1087',
  'Ftep', 'Gauss', 'Hohohale', 'Jasonbartfast', 'JoshuaAcosta', 'Jungy',
  'Juni', 'Kawlos', 'Lemem', 'Melk0r', 'PhasingPlayer', 'RJ_E', 'Rastko',
  'RedWater', 'SaintJason', 'Shoopuffman', 'Steveth', 'Strange8ractor',
  'TDUBZ', 'burmer', 'craggybackhand', 'durendal', 'enavico', 'gdc', 'h',
  'ha.steven', 'huddyrx', 'jmelliere', 'joshuastarr', 'kbbr', 'krieg90',
  'looogic', 'massibull', 'michazhn', 'phil', 'siddhig', 'timmymayes',
  'user1', 'vraid', 'waymost',
]

export const DEBUG_USERS = [...SUPER_USERS]
export const PRACTICE_USERS = []