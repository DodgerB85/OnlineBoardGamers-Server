/**
 * This is a reference file to store actions/etc as constants.
 * It makes the code easier to read, and items easier to store, as they're just numbers
 *
 *
 */

import * as util from "./RNButil"
import * as coord from "./RNBcoordinate"

export const BOT_NAME = "RnbBot"
export const DELETE_VOTE_TOPIC = "delete_game_votes"
export const STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"

export const SUPER_USERS = ["BotKickStarter"]
export const DEBUG_USERS = ["admin", "BotKickStarter", "Ross"]
export const DEBUG_VERTEX_USERS = ["Ross"]
export const APP_ONLY_USERS = ["Ross"]

// MAP EDITOR VAR
export const ACT_MAP_EDITOR_ADD_HOME_MARKER = 901
export const ACT_MAP_EDITOR_REMOVE_HOME_MARKER = 902

// EXTERNAL VARS
// Starting options
export const SO_BASE_GAME = -1
export const SO_ELECTRICITY = 0
export const SO_MANAGEMENT = 1
export const SO_ART = 2
export const SO_TRADE = 3
export const SO_FUNDAMENTAL_RESEARCH = 4
export const SO_PLANES = 5
export const SO_BOMBS = 6
export const SO_JUMP_START = 7
export const SO_USE_SOLO_MINE_RULES = 8 

// These are not "selectable" SO's, but rather defined by the map
//export const SO_POLDER = 4
//export const SO_CITY = 5
//export const SO_TRAINS = 9


// Player Aid Options
export const PLAYER_AID_NONE = 0
export const PLAYER_AID_OG = 1
export const PLAYER_AID_COLOUR = 2
export const PLAYER_AID_COLOUR_ETC = 3
// END EXTERNAL VARS
export const SO_TRAINING_GAME = 102

/* CONSTANAT PARAMS */
// These shouldn't really be changed! But are gathered here in once place for hopefully easy modification later
export const DEFAULT_BLDG_WIDTH = 250
export const DEFAULT_BLDG_HEIGHT = 250
export const DEFAULT_RES_WIDTH = 150
export const DEFAULT_RES_HEIGHT = 150

/* Ratios */
export const hexBigRatio = 1.1547
export const hexSmallRatio = 0.866

/** COLOURS */
export const BLACK = 0
export const BLUE = 1
export const GREEN = 2
export const GREY = 3
export const RED = 4
export const YELLOW = 5

/** RnD */
export const RND_ROWBOAT_IDX = 0
export const RND_TRUCK_IDX = 1
export const RND_STEAMER_IDX = 2
export const RND_OILRIG_IDX = 3
export const RND_MINE_SPEC_IDX = 4
export const RND_MINE_BIG_IDX = 5
export const RND_MINE_NEW_SHAFT_IDX = 6
export const RND_FUNDAMENTAL_RESEARCH_IDX = 7

export const RND_STRINGS = ["Rowboat Factory", "Truck Factory", "Steamer Factory", "Oilrig", "Specialised Mine", "Big Mine", "New Shafts", "Fundamental Research"]
export const RND_STRINGS_COMPACT = ["Row Fac", "Truck Fac", "Steam Fac", "Oil rig", "Spec Mine", "Big Mine", "New Shafts", "Fundamental Research"]

/** DIRECTIONS */
export const UP_RIGHT = 0
export const RIGHT = 1
export const DOWN_RIGHT = 2
export const DOWN_LEFT = 3
export const LEFT = 4
export const UP_LEFT = 5

/** HEX STYLE */
export const POINTY = 0
export const FLAT = 1

// Conflicts
export const CONFLICT_DECISION_WAIT_AND_SEE = 0
export const CONFLICT_DECISION_NO_CONFLICT = 1
export const CONFLICT_DECISION_CONFLICT = 2

export const CONFLICT_PRAYING_WAIT_AND_SEE = 0
export const CONFLICT_PRAYING_CASH_IN = 1
export const CONFLICT_PRAYING_KEEP_PRAYING = 2

export const CONFLICT_TURN_ORDER_WAIT_AND_SEE = 0
export const CONFLICT_TURN_ORDER_EARLIEST = 1
export const CONFLICT_TURN_ORDER_LATEST = 2

export const CONFLICT_SKIP_WONDER_PHASE_WAIT_AND_SEE = 0
export const CONFLICT_SKIP_WONDER_PHASE_SKIP_ALL = 1
export const CONFLICT_SKIP_WONDER_PHASE_SKIP_WONDER_ONLY = 2

export const CONFLICT_SKIP_PRODUCTION_PHASE_WAIT_AND_SEE = 0
export const CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_ALL = 1
export const CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_PRODUCTION_ONLY = 2

/** PHASES */ /** !!!!!!!!!!!! PHASES AND CONFLICTS MUST BE SEQUENTIAL TO MAKE SIMUL PROCESSING SIMPLER !!!!!!!!!!!!!!!! */
// EXTERNAL VARS
export const PHASE_CONFLICT_PRODUCTION_DECISION = 0
export const PHASE_CONFLICT_PRODUCTION_PRAYING = 1
export const PHASE_CONFLICT_PRODUCTION_TURN_ORDER = 2
export const PHASE_PRODUCTION_TO = 3
export const PHASE_CONFLICT_MOVEMENT_DECISION = 4
export const PHASE_CONFLICT_MOVEMENT_PRAYING = 5
export const PHASE_CONFLICT_MOVEMENT_TURN_ORDER = 6
export const PHASE_MOVEMENT_TO = 7
export const PHASE_CONFLICT_BUILDING_DECISION = 8
export const PHASE_CONFLICT_BUILDING_PRAYING = 9
export const PHASE_CONFLICT_BUILDING_TURN_ORDER = 10
export const PHASE_BUILDING_TO = 11
export const PHASE_CONFLICT_WONDER_DECISION = 12
export const PHASE_CONFLICT_WONDER_PRAYING = 13
export const PHASE_CONFLICT_WONDER_TURN_ORDER = 14
export const PHASE_WONDER_TO = 15

export const MAX_PHASE_REACHED = 16 // Previous phase +1, to roll the conflict preset phase to 0
export const PHASE_LOOKBACK_AMOUNT = 2 // EXT use only. If you are in phase X, keep phase data >= X=PHASE_LOOKBACK_AMOUNT. Stops data for decision phase deleting during TO phase

export const PHASE_GAME_OVER = 19
export const PHASE_CHOOSE_HOME_TILE = 20

// Pre phase for pre-sets
export const PRE_PHASE_OFFSET = 100
export const PRE_PHASE_CONFLICT_PRODUCTION = 100
export const PRE_PHASE_PRODUCTION = 103
export const PRE_PHASE_CONFLICT_MOVEMENT = 104
export const PRE_PHASE_MOVEMENT = 107
export const PRE_PHASE_CONFLICT_BUILDING = 108
export const PRE_PHASE_BUILDING = 111
export const PRE_PHASE_CONFLICT_WONDER = 112
export const PRE_PHASE_WONDER = 115

export const ALL_PRE_PHASE_CONFLICTS = [PRE_PHASE_CONFLICT_PRODUCTION, PRE_PHASE_CONFLICT_MOVEMENT, PRE_PHASE_CONFLICT_BUILDING, PRE_PHASE_CONFLICT_WONDER]
export const ALL_PRE_PHASE_MAIN_PHASES = [PRE_PHASE_PRODUCTION, PRE_PHASE_MOVEMENT, PRE_PHASE_BUILDING, PRE_PHASE_WONDER]

// At one point, there were multiple types of eg production phase; fully simul, fully TO, or hybrid
// In the end, everything went hybrid only (except practice/solo, which is set by a flag anyway)
// So these arrays are "pointless" but also allow easily expanding back to move types of phase
export const PHASE_PRODUCTIONS = [PHASE_PRODUCTION_TO, PRE_PHASE_PRODUCTION]
export const PHASE_MOVEMENTS = [PHASE_MOVEMENT_TO, PRE_PHASE_MOVEMENT]
export const PHASE_BUILDINGS = [PHASE_BUILDING_TO, PRE_PHASE_BUILDING]
export const PHASE_WONDERS = [PHASE_WONDER_TO, PRE_PHASE_WONDER]

export const MAIN_PHASES = [PHASE_PRODUCTION_TO, PHASE_MOVEMENT_TO, PHASE_BUILDING_TO, PHASE_WONDER_TO]

export const PHASE_CONFLICT_PRODUCTIONS = [PHASE_CONFLICT_PRODUCTION_DECISION, PHASE_CONFLICT_PRODUCTION_PRAYING, PHASE_CONFLICT_PRODUCTION_TURN_ORDER]
export const PHASE_CONFLICT_MOVEMENTS = [PHASE_CONFLICT_MOVEMENT_DECISION, PHASE_CONFLICT_MOVEMENT_PRAYING, PHASE_CONFLICT_MOVEMENT_TURN_ORDER]
export const PHASE_CONFLICT_BUILDINGS = [PHASE_CONFLICT_BUILDING_DECISION, PHASE_CONFLICT_BUILDING_PRAYING, PHASE_CONFLICT_BUILDING_TURN_ORDER]
export const PHASE_CONFLICT_WONDERS = [PHASE_CONFLICT_WONDER_DECISION, PHASE_CONFLICT_WONDER_PRAYING, PHASE_CONFLICT_WONDER_TURN_ORDER]

export const PHASE_CONFLICT_DECISIONS = [PHASE_CONFLICT_PRODUCTION_DECISION, PHASE_CONFLICT_MOVEMENT_DECISION, PHASE_CONFLICT_BUILDING_DECISION, PHASE_CONFLICT_WONDER_DECISION]
export const PHASE_CONFLICT_PRAYINGS = [PHASE_CONFLICT_PRODUCTION_PRAYING, PHASE_CONFLICT_MOVEMENT_PRAYING, PHASE_CONFLICT_BUILDING_PRAYING, PHASE_CONFLICT_WONDER_PRAYING]
export const PHASE_CONFLICT_TURN_ORDERS = [PHASE_CONFLICT_PRODUCTION_TURN_ORDER, PHASE_CONFLICT_MOVEMENT_TURN_ORDER, PHASE_CONFLICT_BUILDING_TURN_ORDER, PHASE_CONFLICT_WONDER_TURN_ORDER]

export const ALL_PHASE_CONFLICTS = [PHASE_CONFLICT_PRODUCTION_DECISION, PHASE_CONFLICT_PRODUCTION_PRAYING, PHASE_CONFLICT_PRODUCTION_TURN_ORDER, PHASE_CONFLICT_MOVEMENT_DECISION, PHASE_CONFLICT_MOVEMENT_PRAYING, PHASE_CONFLICT_MOVEMENT_TURN_ORDER, PHASE_CONFLICT_BUILDING_DECISION, PHASE_CONFLICT_BUILDING_PRAYING, PHASE_CONFLICT_BUILDING_TURN_ORDER, PHASE_CONFLICT_WONDER_DECISION, PHASE_CONFLICT_WONDER_PRAYING, PHASE_CONFLICT_WONDER_TURN_ORDER]
// END EXTERNAL VARS

export function getBaseConflictPhase(phase) {
	if (PHASE_CONFLICT_PRODUCTIONS.includes(phase)) return PHASE_CONFLICT_PRODUCTION_DECISION
	if (PHASE_CONFLICT_MOVEMENTS.includes(phase)) return PHASE_CONFLICT_MOVEMENT_DECISION
	if (PHASE_CONFLICT_BUILDINGS.includes(phase)) return PHASE_CONFLICT_BUILDING_DECISION
	if (PHASE_CONFLICT_WONDERS.includes(phase)) return PHASE_CONFLICT_WONDER_DECISION
	// You could get here if saving the last TO decision in conflict phases
	return -1
	//doAdminAlrt(`getBaseConflictPhase() Error with ${phase}`)
}

/** ACTIONS */
export const ACT_NONE = -1
export const ACT_BUILD_BRIDGE = 0
export const ACT_BUILD_ROAD = 1
export const ACT_MOVE_TRANSPORTER = 2
export const ACT_PICKUP_RES = 3
export const ACT_DROP_RES = 4

export const ACT_PLACE_HEX = 9

// TM = transporter Mode - These actions are all associated with selecting a transporter, and playing in "transporter" mode
// Common
export const ACT_TM_SELECT_TRANSPORTER = 10
export const ACT_TM_SELECT_PICKUP_DROP_MOVE = 11 // This works for production and movement. For prod, simply don't highlight any move options
export const ACT_TM_ANY_PHASE_DROP_RES_OR_TRANSPORT = 12 // You can ferry in any phase
export const ACT_TM_ANY_PHASE_STRICT_DROP_RES_OR_TRANSPORT = 13 // We need to know if it's a ferry or a drop

// Production
//export const ACT_TM_SELECT_BUILDING_RES = 12
export const ACT_SELECT_WATER_FOR_NEW_TRANSPORTER = 20
export const ACT_SELECT_INPUT_RESOURCES_FOR_SEC_PRODUCTION = 21
export const ACT_CHOOSE_BUILDING_TO_UPGRADE = 22
export const ACT_REMOVE_EXCESS_TRANSPORTERS = 23
export const ACT_REMOVE_EXCESS_TRANSPORTERS_FOR_DONKEY = 24
// Movement
export const ACT_TM_CHOOSE_GOOSE_LOCATION = 30
export const ACT_TM_CHOOSE_GOOSE_DEPOSIT_LOCATION = 31
export const ACT_TM_DECIDE_ON_TRANSPORTER_PICKUP_OR_SELECT = 32

// Building
export const ACT_TM_BUILD_SELECT_BRIDGE_ROAD_WALL_BUILDING_RES_PICKUP_DROP = 40
export const ACT_TM_CHOOSE_BUILDING_SEGMENT = 41

export const ACT_CONFIRM_RESIGN = 97
export const ACT_CONFIRM_KICKOUT = 98
export const ACT_CONFIRM_END_TURN = 99
export const ACT_CONFIRM_END_GAME = 100

// ADMIN ACTIONS
export const ACT_ADMIN_ADD_RES = 900
export const ACT_ADMIN_ADD_BLDG = 901
export const ACT_ADMIN_ADD_TRANSPORTER = 902
/** ACTION STACK */
// For the main prod/move/build phase, each possible player action will be recorded on a 'stack'
// This is used to then redo all moves in turn order, to check they are still valid
// It is also used to display history, and can be used in replay in exactly the same way it is used to verify the turn

// GENERAL STACKACTIONS
export const STACK_STRICT_PICKUP_RES = 0
export const STACK_STRICT_DROP_RES = 1
export const STACK_STRICT_FERRY_RES = 2
export const STACK_PICKUP_TRANSPORTER = 3
export const STACK_STEAL_RES = 4

// MOVE ACTIONS
export const STACK_MOVE_LAND = 10
// Land transports move from hexID and vertex to hexID and vertex
export const STACK_MOVE_WATER = 11
export const STACK_DROP_TRANSPORTER = 12
export const STACK_PICKUP_RES_TO_FOLLOW = 13
export const STACK_DROP_RES_FOLLOWING = 14
export const STACK_DROP_TRANSPORTER_JUST_PICKED_UP = 15

// BUILD ACTIONS
export const STACK_BUILD_ROAD = 20 // [] -- [hexIDFrom, bucketsFrom, hexIDTo, bucketsTo, transType]
export const STACK_BUILD_BRIDGE = 21
export const STACK_BUILD_WALL = 22
export const STACK_DEMOLISH_WALL = 23
export const STACK_BUILD_BUILDING = 24
export const STACK_RESHAFT_MINE = 25

// PRODUCTION ACTIONS
export const STACK_MANUAL_PRODUCTION = 30
export const STACK_DONKEY_REPRODUCTION = 31
export const STACK_DO_RESEARCH = 32
export const STACK_UPGRADE_BUILDING = 33
export const STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY = 34

// Wonder
export const STACK_ADD_WONDER_BRICKS = 40

/** HISTORY */
// Non-player Actions
export const HIST_NEW_GAME = 90 // only added in computed
export const HIST_NEW_TURN = 0
export const HIST_ADD_CUSTOM_SCENARIO_ELEMENTS = 1
// Player actions
export const HIST_CHOOSE_HOME_TILE = 2
// COMMON TO ALL PHASES
export const HIST_STACK_ACTIONS = 3
// Conflict
export const HIST_CHOOSE_CONFLICT = 4
export const HIST_CONFLICT_PRAYING = 5
export const HIST_CONFLICT_TURN_ORDER = 6
export const HIST_NO_CONFLICT = 7

export const HIST_KICKOUT = 10
export const HIST_RESIGN = 11
export const HIST_REWIND = 12

// Production Actions
export const HIST_PRE_PRODUCTION = 30 // This is ALL PRIs, plus SECs with no trans on them
export const HIST_POST_PRODUCTION = 31 // Remaining secs auto-production
export const HIST_PRE_PRODUCTION_MINES = 32
// No actions
export const HIST_NO_PRODUCTION_ACTIONS = 34
export const HIST_NO_BUILDING_ACTIONS = 35
export const HIST_NO_MOVEMENT_ACTIONS = 36
export const HIST_NO_WONDER_ACTIONS = 37

export const HIST_GAME_END = 40

export const ENTRIES_TO_IGNORE = [HIST_REWIND, HIST_KICKOUT, HIST_RESIGN]

/** CUSTOM SCENARIO ITEMS */
export const CUSTOM_ADD_WALL = 0
export const CUSTOM_ADD_RESOURCE = 1
export const CUSTOM_ADD_BUILDING = 2
export const CUSTOM_ADD_TRANSPORTER = 3
export const CUSTOM_ALL_PLAYERS_PRE_RESEARCHED = 4

//export const CUSTOM_SET_MAP = 9

// terraindIDs = 1 unique ID per hex tile in the box. You can have multiple of each terrainID in a game
/**RIVERS */
export const DESERT_RIVER_SHARP_U = 0
export const DESERT_RIVER_GENTLE_CURVE = 1
export const PASTURE_RIVER_STRAIGHT = 2
export const PASTURE_RIVER_STRAIGHT_WIGGLY = 3
export const PASTURE_RIVER_GENTLE_CURVE_1 = 4
export const PASTURE_RIVER_GENTLE_CURVE_2 = 5
export const PASTURE_RIVER_GENTLE_CURVE_3 = 6
export const PASTURE_RIVER_SHARP_U = 7
export const PASTURE_RIVER_TRI_BLADE = 8
export const PASTURE_RIVER_SHARP_U_PLUS_STRAIGHT_R = 9
export const PASTURE_RIVER_SHARP_U_PLUS_STRAIGHT_L = 10
export const ROCK_RIVER_STRAIGHT = 11
export const ROCK_RIVER_GENTLE_CURVE = 12
export const ROCK_RIVER_SHARP_U = 13
export const WOODS_RIVER_STRAIGHT = 14
export const WOODS_RIVER_GENTLE_CURVE = 15
export const WOODS_RIVER_SHARP_U = 16
export const WOODS_RIVER_BRACKETS_WIDE_NARROW = 17
export const WOODS_RIVER_BRACKETS_NARROW_WIDE = 18
export const WOODS_RIVER_BRACKETS_2_US = 19
export const MOUNTAIN_RIVER_STRAIGHT = 20
export const MOUNTAIN_RIVER_SOURCE = 21
export const CITY = 22

/** NON-RIVERS */
export const DESERT_1_UNIRRIGATED = 50
export const DESERT_2_UNIRRIGATED = 51
export const DESERT_3_UNIRRIGATED = 52
export const DESERT_4_UNIRRIGATED = 53
export const DESERT_5_UNIRRIGATED = 54
export const PASTURE_1 = 55
export const PASTURE_2 = 56
export const PASTURE_3 = 57
export const PASTURE_4 = 58
export const PASTURE_5 = 59
export const PASTURE_6 = 60
export const PASTURE_7 = 61
export const PASTURE_8 = 62
export const PASTURE_9 = 63
export const ROCK_1 = 64
export const ROCK_2 = 65
export const ROCK_3 = 66
export const ROCK_4 = 67
export const ROCK_5 = 68
export const ROCK_6 = 69
export const WOODS_1 = 70
export const WOODS_2 = 71
export const WOODS_3 = 72
export const WOODS_4 = 73
export const WOODS_5 = 74
export const MOUNTAIN_1 = 75
export const MOUNTAIN_2 = 76
export const MOUNTAIN_3 = 77
export const MOUNTAIN_4 = 78
export const MOUNTAIN_5 = 79
export const SEA_1 = 80
export const SEA_2 = 81
export const SEA_3 = 82
export const SEA_4 = 83
export const SEA_5 = 84
export const SEA_6 = 85
export const SEA_7 = 86
export const SEA_8 = 87
export const POLDER_1 = 90
export const POLDER_2 = 91
export const POLDER_3 = 92
export const POLDER_4 = 93
export const POLDER_5 = 94
export const BLANK_1 = 95
export const BLANK_2 = 96

// Group terrain for easier sorting during map editing, also irrigating deserts
export const GROUP_DESERT = [DESERT_1_UNIRRIGATED, DESERT_2_UNIRRIGATED, DESERT_3_UNIRRIGATED, DESERT_4_UNIRRIGATED, DESERT_5_UNIRRIGATED]
export const GROUP_DESERT_RIVERS = [DESERT_RIVER_SHARP_U, DESERT_RIVER_GENTLE_CURVE]
export const GROUP_PASTURE = [PASTURE_1, PASTURE_2, PASTURE_3, PASTURE_4, PASTURE_5, PASTURE_6, PASTURE_7, PASTURE_8, PASTURE_9]
export const GROUP_PASTURE_RIVERS = [PASTURE_RIVER_STRAIGHT, PASTURE_RIVER_STRAIGHT_WIGGLY, PASTURE_RIVER_GENTLE_CURVE_1, PASTURE_RIVER_GENTLE_CURVE_2, PASTURE_RIVER_GENTLE_CURVE_3, PASTURE_RIVER_SHARP_U, PASTURE_RIVER_TRI_BLADE, PASTURE_RIVER_SHARP_U_PLUS_STRAIGHT_R, PASTURE_RIVER_SHARP_U_PLUS_STRAIGHT_L]
export const GROUP_ROCK = [ROCK_1, ROCK_2, ROCK_3, ROCK_4, ROCK_5, ROCK_6]
export const GROUP_ROCK_RIVERS = [ROCK_RIVER_STRAIGHT, ROCK_RIVER_GENTLE_CURVE, ROCK_RIVER_SHARP_U]
export const GROUP_WOODS = [WOODS_1, WOODS_2, WOODS_3, WOODS_4, WOODS_5]
export const GROUP_WOODS_RIVERS = [WOODS_RIVER_STRAIGHT, WOODS_RIVER_GENTLE_CURVE, WOODS_RIVER_SHARP_U, WOODS_RIVER_BRACKETS_WIDE_NARROW, WOODS_RIVER_BRACKETS_NARROW_WIDE, WOODS_RIVER_BRACKETS_2_US]
export const GROUP_MOUNTAIN = [MOUNTAIN_1, MOUNTAIN_2, MOUNTAIN_3, MOUNTAIN_4, MOUNTAIN_5]
export const GROUP_MOUNTAIN_RIVERS = [MOUNTAIN_RIVER_STRAIGHT, MOUNTAIN_RIVER_SOURCE]
export const GROUP_SEA = [SEA_1, SEA_2, SEA_3, SEA_4, SEA_5, SEA_6, SEA_7, SEA_8]
export const GROUP_POLDER = [POLDER_1, POLDER_2, POLDER_3, POLDER_4, POLDER_5]
export const GROUP_CITY = [CITY]
export const GROUP_BLANK = [BLANK_1, BLANK_2]

//export const RIVER_TERRAIN_IDS = [WOODS_RIVER_STRAIGHT, PASTURE_RIVER_SHARP_U, PASTURE_RIVER_SHARP_U_PLUS_STRAIGHT_L, WOODS_RIVER_BRACKETS_WIDE_NARROW]

// Rivers
export const RIVER_NONE = 0
export const RIVER_SINGLE_STRAIGHT = 1
export const RIVER_SHARP_U = 2 // Ie from edge 4 to edge 5
export const RIVER_SHARP_U_PLUS_STRAIGHT_L = 3
export const RIVER_SHARP_U_PLUS_STRAIGHT_R = 4
export const RIVER_BRACKETS_WIDE_NARROW = 5
export const RIVER_BRACKETS_NARROW_WIDE = 6
export const RIVER_BRACKETS_2_US = 7
export const RIVER_SOURCE = 8
export const RIVER_GENTLE_CURVE = 9
export const RIVER_TRI_BLADE = 10
export const RIVER_CITY = 11

// THESE 2 ARE INCOMPLETE AND CURRENTLY UNUSED
//export const JOINED_RIVERS = [RIVER_SINGLE_STRAIGHT, RIVER_SHARP_U, RIVER_SHARP_U_PLUS_STRAIGHT_L, RIVER_SHARP_U_PLUS_STRAIGHT_R, RIVER_SOURCE, RIVER_GENTLE_CURVE, RIVER_TRI_BLADE]
//export const BRACKETS_RIVERS = [RIVER_BRACKETS_WIDE_NARROW]

// Terrain
export const TERR_WOODS = 0
export const TERR_PASTURE = 1
export const TERR_ROCK = 2
export const TERR_MOUNTAINS = 3
export const TERR_DESERT = 4
export const TERR_SEA = 5
export const TERR_POLDER = 6

export const TERR_VOID = 9 // blank hex

export const TERR_ANY_LAND = [TERR_WOODS, TERR_PASTURE, TERR_ROCK, TERR_MOUNTAINS, TERR_DESERT]
export const TERR_ANY_LAND_EXCEPT_DESERT = [TERR_WOODS, TERR_PASTURE, TERR_ROCK, TERR_MOUNTAINS]
export const TERR_ANY = [TERR_WOODS, TERR_PASTURE, TERR_ROCK, TERR_MOUNTAINS, TERR_DESERT, TERR_SEA, TERR_POLDER]

// Movement graph
export const MOVE_NONE = 0
export const MOVE_INTERNAL = 1
export const MOVE_DONKEY = 2
export const MOVE_ROAD = 3
export const MOVE_WATER = 4

export const NODE_HEX = 0
export const NODE_VERTEX = 1
export const NODE_RIVER_VERTEX = 2
export const NODE_COAST = 3
export const NODE_SIDE = 4

export const NODE_ALL = [NODE_HEX, NODE_VERTEX, NODE_RIVER_VERTEX, NODE_COAST, NODE_SIDE]

/** HEX CONTENTS -- NOTE: ALL THE BELOW MUST HAVE DISTINCT NUMBERS, IE RES AND TRANSPORTERS MUST ALL BE UNIQUE */
export const BANK_NONE = 0
export const BANK_LEFT = 1
export const BANK_RIGHT = 2

export const LOCATION_LAND_VERTEX = 0
export const LOCATION_SEA_VERTEX = 1
export const LOCATION_RIVER_BUCKET = 2
export const LOCATION_DOCKED = 3 // Docked boats. Basically part of the land tile
export const LOCATION_EDGE = 4 // NB just for walls. This is "truly" in an edege - and not on either hex
export const LOCATION_TRANSPORTER = 5
export const LOCATION_FOLLOWER = 6 // Goose following transport
export const LOCATION_BUCKET = 7
export const LOCATION_RIVER_VERTEX = 8 // River vertex for precise boat positioning

export const LOCATION_OOB = 9 // Out Of Bounds (of game)

// Docked offsets
export const DOCKED_OFFSET_NONE = 0
export const DOCKED_OFFSET_ACW = 1
export const DOCKED_OFFSET_CW = 2

// Resources
export const RES_TRUNKS = 0
export const RES_BOARDS = 1
export const RES_PAPER = 2
export const RES_GOOSE = 3
export const RES_CLAY = 4
export const RES_STONE = 5
export const RES_FUEL = 6
export const RES_IRON = 7
export const RES_GOLD = 8
export const RES_COINS = 9
export const RES_STOCK = 10
// Resources &C
export const RES_BOMB = 11
export const RES_MANAGER = 12
export const RES_PEARL = 13
export const RES_MARBLE = 14

export const RES_PSEUDO_MINE = 28 // Do not include in ALL_RES for now

// Total
export const TOTAL_RES = 15
//export const RES_ART = 15

export const ALL_RES = [RES_TRUNKS, RES_BOARDS, RES_PAPER, RES_GOOSE, RES_CLAY, RES_STONE, RES_FUEL, RES_IRON, RES_GOLD, RES_COINS, RES_STOCK, RES_BOMB, RES_MANAGER, RES_PEARL, RES_MARBLE]

export const ALL_POINT_SCORING_RES = [RES_GOLD, RES_COINS, RES_STOCK]

// NB - ONLY used for admin cheat add resource
export const ALL_RES_STRINGS = ["Trunks", "Boards", "Paper", "Goose", "Clay", "Stone", "Fuel", "Iron", "Gold", "Coins", "Stock", "Bomb", "Manager", "Pearl", "Marble"]

// This marks the change from resources to transporters
export const RES_UPPER_LIMIT = 29

// Transporters - NOTE: Transporters must have IDs distinct from resources
// EG If output < 30 it's a resource, if >=30 it's a transporter
export const DONKEY = 30
export const WAGON = 31
export const TRUCK = 32
export const RAFT = 33
export const ROWBOAT = 34
export const STEAMER = 35
// Transporters &C
export const PLANE = 36
export const EXHIBITION_TRANSPORTER = 37

export const ALL_TRANSPORTERS = [DONKEY, WAGON, TRUCK, RAFT, ROWBOAT, STEAMER, PLANE, EXHIBITION_TRANSPORTER]

export const ALL_TRANSPORTER_STRINGS = ["Donkey", "Wagon", "Truck", "Raft", "Rowboat", "Steamer", "Plane", "Exhibition T"]

// NB THESE ARE 2 SEPERATE FLAGS, NOT RELATED TO THE LIST OF GOODS
export const LAND_TYPE = 30
export const WATER_TYPE = 33

export const LAND_TRANSPORTERS = [DONKEY, WAGON, TRUCK]
export const WATER_TRANSPORTERS = [RAFT, ROWBOAT, STEAMER]

// Sub Building Type
export const MINE_NORMAL = 0
export const MINE_IRON = 1
export const MINE_GOLD = 2
export const MINE_BIG = 3

// Buildings
export const BLDG_WOODCUTTER = 50
export const BLDG_SAWMILL = 51
export const BLDG_PAPERMILL = 52
export const BLDG_CLAY_PIT = 53
export const BLDG_STONE_FACTORY = 54
export const BLDG_QUARRY = 55
export const BLDG_OILRIG = 56
export const BLDG_COAL_BURNER = 57
export const BLDG_MINE = 58
export const BLDG_MINT = 59
export const BLDG_STOCK_EXCHANGE = 60
export const BLDG_WAGON_FACTORY = 61
export const BLDG_TRUCK_FACTORY = 62
export const BLDG_RAFT_FACTORY = 63
export const BLDG_ROWBOAT_FACTORY = 64
export const BLDG_STEAMER_FACTORY = 65
// Buildings &C
export const BLDG_AEROPORT = 66
export const BLDG_BOMB_FACTORY = 67
export const BLDG_POWER_PLANT = 68
//export const MBA = 69
export const BLDG_PEARL_FISHERY = 70
export const BLDG_ATELIER = 71
//export const BLDG_QUARRY_MARBLE = THIS IS JUST A PSEUDO BUILDING

// PSEUDO BUILDINGS - only to generate options in build phase
export const BLDG_PSEUDO_INDEX = 100 // Check if greater than this for P-B
export const BLDG_PSEUDO_RESHAFT_MINE = 101
export const BLDG_PSEUDO_ROAD = 102
export const BLDG_PSEUDO_BRIDGE = 103
export const BLDG_PSEUDO_WALL = 104
export const BLDG_PSEUDO_DEMOLISH_WALL = 105

export const ALL_BUILDINGS = [BLDG_WOODCUTTER, BLDG_SAWMILL, BLDG_PAPERMILL, BLDG_CLAY_PIT, BLDG_STONE_FACTORY, BLDG_QUARRY, BLDG_OILRIG, BLDG_COAL_BURNER, BLDG_MINE, BLDG_MINT, BLDG_STOCK_EXCHANGE, BLDG_WAGON_FACTORY, BLDG_TRUCK_FACTORY, BLDG_RAFT_FACTORY, BLDG_ROWBOAT_FACTORY, BLDG_STEAMER_FACTORY, BLDG_AEROPORT, BLDG_BOMB_FACTORY, BLDG_POWER_PLANT, BLDG_PEARL_FISHERY, BLDG_ATELIER]

export const ALL_TRANSPORTER_FACTORIES = [BLDG_WAGON_FACTORY, BLDG_TRUCK_FACTORY, BLDG_RAFT_FACTORY, BLDG_ROWBOAT_FACTORY, BLDG_STEAMER_FACTORY]
// NB Wagon factory REMOVES and ADDS
export const ALL_TRANSPORTER_ADDING_BUILDINGS = [BLDG_TRUCK_FACTORY, BLDG_RAFT_FACTORY, BLDG_ROWBOAT_FACTORY, BLDG_STEAMER_FACTORY]
export const ALL_WATER_TRANSPORTER_BUILDINGS = [BLDG_RAFT_FACTORY, BLDG_ROWBOAT_FACTORY, BLDG_STEAMER_FACTORY]
export const ALL_PSEUDO_BUILDINGS = [BLDG_PSEUDO_RESHAFT_MINE, BLDG_PSEUDO_ROAD, BLDG_PSEUDO_BRIDGE, BLDG_PSEUDO_WALL, BLDG_PSEUDO_DEMOLISH_WALL]

// NB ONLY USED IN ADMIN ACTION SELECT
export const ALL_BUILDING_STRINGS = ["Woodcutter", "Sawmill", "Papermill", "Clay Pit", "Stone Factory", "Quarry", "Oil Rig", "Coal Burner", "Mine", "Mint", "Stock Exchange", "Wagon Factory", "Truck Factory", "Raft Factory", "Rowboat Factory", "Steamer Factory", "Airport", "Bomb Factory", "Power Plant", "Pearl Fisher", "Atelier"]

export const VERTEX_CENTER = 0
export const VERTEX_CORNER = [1, 2, 3, 4, 5, 6]
export const VERTEX_SIDE = [7, 8, 9, 10, 11, 12]

export const ITEM_BUILT_BUILDING = 0

/**
 * ADDING A NEW HEX
 * 1) Add the data to the bottom of this array
 * 2) To do roads, make a map with just this tile. Turn true no-river-sides, plus FIRST entry in river sides (or just turn them on 1 at a time in order)
 *    Make the correct entries in view.getRoadsSVGpoints to draw in the roads
 * 3) For bridges, make a new entry at the top of view.getBridgePath
 */

/* REMEMBER: Rivers will always start just before vertex 0,
 and any non-symmetrical rivers will have the river exits AS FAR AS POSSIBLE
 from vertex 0.
 Consequently, the first "bucket" of vertexes, will ALWAYS be the biggest.
 Sides are defined as FOLLOWING the vertex in a CLOCKWISE direction.
 Consequently, side 5 will always be a river side, and the other river sides will be as high as possible

 We could also add a neightbours: [], property to the entry. This would store the hexID of the neighbour hexes.
 However, it would have to constantly update each time a new hex is added, but ONLY during map building

 REMEMBER: VERTEX 0 IS AT THE TOP. IT SHOULD ALWAYS BE AT THE TOP, EVEN IF SOMETHING IS ROTATED.
 WHEN YOU ARE LOOKING AT SOMETHING ON THE MAP, VERTEX 0 WILL ALWAYS BE AT THE TOP, REGARDLESS OF ANY "ROTATION" APPLIED TO THE TILE
 SIDE 0 IS THE SIDE CLOCKWISE FOLLOWING VERTEX 0
*/

export const ROAD_SIDE_ALIGNMENT = 0.2
const RSA = ROAD_SIDE_ALIGNMENT // shorthand

const sideIndices = [0, 1, 2, 3, 4, 5]

const halfwayCorners = [
	[0, -230],
	[200, -115],
	[200, 115],
	[0, 230],
	[-200, 115],
	[-200, -115],
	[0, 0],
].map(coord.absolute)

export function uniformTerrain(nodeVertexDefinitions, nodeEdges, roadAnchors, sideNodeIds) {
	return function (hex) {
		hex.riverType = RIVER_NONE
		hex.rotatable = true
		hex.riverVertexRiverIds = []
		hex.riverVertexDefinitions = []
		hex.riverVertexEdges = []
		hex.sideRiverVertexIds = [-1, -1, -1, -1, -1, -1]
		hex.riverStoppingVertex = []
		hex.nodeBucketIds = util.makeArrayOfSizeWithFill(nodeVertexDefinitions.length, 0)
		hex.nodeVertexDefinitions = nodeVertexDefinitions
		hex.nodeEdges = nodeEdges
		hex.roadAnchors = roadAnchors
		hex.sideNodeIds = sideNodeIds
		hex.cornerBucketIds = [0, 0, 0, 0, 0, 0]
		hex.cornerNodeIds = util.makeArrayOfSizeWithFill(6, [-1, -1])
		hex.bridgeRiverLines = []
		hex.riverAdjacencies = []
		hex.bridges = []
		hex.chitLocationBucketIds = [0, 0, 0, 0, 0, 0, 0]
		hex.chitLocationBuildingEligible = [true, true, true, true, true, true, true]
		hex.chitLocations = halfwayCorners
		hex.homeMarkerFallbackPositions = [null, null, null, null, null, null, null]
		return hex
	}
}

const uniformPlainsNodeVertexDefinitions = [
	["absolute", 0, 0],
	["relative", 0, 0.5, 0.25],
	["relative", 1, 0.5, 0.25],
	["relative", 2, 0.5, 0.25],
	["relative", 3, 0.5, 0.25],
	["relative", 4, 0.5, 0.25],
	["relative", 5, 0.5, 0.25],
]
const uniformPlainsNodeEdges = util.indexArray(6).map((i) => [0, i + 1])

const uniformPlains = uniformTerrain(
	uniformPlainsNodeVertexDefinitions,
	uniformPlainsNodeEdges,
	[0],
	util.indexArray(6).map((i) => i + 1)
)

const uniformMountainNodeVertexDefinition = [
	[0, 0.5, 0.4],
	[1, 0.5, 0.4],
	[2, 0.5, 0.4],
	[3, 0.5, 0.4],
	[4, 0.5, 0.4],
	[5, 0.5, 0.4],
].map(coord.relative)
const uniformMountainNodeEdges = [
	[0, 1],
	[1, 2],
	[2, 3],
	[3, 4],
	[4, 5],
	[5, 0],
]

const uniformMountains = uniformTerrain(uniformMountainNodeVertexDefinition, uniformMountainNodeEdges, util.indexArray(6), util.indexArray(6))

export function seaTerrain(hex) {
	return {
		hexTerrainID: hex.hexTerrainID,
		baseTerrain: TERR_SEA,
		riverType: RIVER_NONE,
		hexGfx: hex.hexGfx,
		rotatable: true,
		riverVertexRiverIds: [],
		riverVertexDefinitions: [],
		riverVertexEdges: [],
		sideRiverVertexIds: [-1, -1, -1, -1, -1, -1],
		riverStoppingVertex: [],
		nodeBucketIds: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		nodeVertexDefinitions: [
			["absolute", 0, 0],
			["relative", 0, 0.1, 0.2],
			["relative", 1, 0.1, 0.2],
			["relative", 2, 0.1, 0.2],
			["relative", 3, 0.1, 0.2],
			["relative", 4, 0.1, 0.2],
			["relative", 5, 0.1, 0.2],
			// Stopping vertices
			["relative", 0, 0.5, 0.4],
			["relative", 1, 0.5, 0.4],
			["relative", 2, 0.5, 0.4],
			["relative", 3, 0.5, 0.4],
			["relative", 4, 0.5, 0.4],
			["relative", 5, 0.5, 0.4],
		],
		nodeEdges: VERTEX_CORNER.map((i) => [0, i]).concat(VERTEX_SIDE.map((i) => [0, i]).concat(sideIndices.map((i) => [VERTEX_CORNER[i], VERTEX_SIDE[i]]).concat(sideIndices.map((i) => [VERTEX_CORNER[i], VERTEX_SIDE[(i + 5) % 6]]).concat(sideIndices.map((i) => [VERTEX_CORNER[i], VERTEX_CORNER[(i + 1) % 6]]).concat(sideIndices.map((i) => [VERTEX_SIDE[i], VERTEX_SIDE[(i + 1) % 6]])))))),
		cornerBucketIds: [0, 0, 0, 0, 0, 0],
		sideNodeIds: [7, 8, 9, 10, 11, 12],
		cornerNodeIds: [
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
			[6, 1],
		],
		roadAnchors: [],
		bridges: [],
		bridgeRiverLines: [],
		riverAdjacencies: [],
		chitLocationBucketIds: [0, 0, 0, 0, 0, 0, 0],
		chitLocationBuildingEligible: [true, true, true, true, true, true, true],

		chitLocations: [
			["absolute", 0, -230 * 0.6],
			["absolute", 200 * 0.6, -115 * 0.6],
			["absolute", 200 * 0.6, 115 * 0.6],
			["absolute", 0, 230 * 0.6],
			["absolute", -200 * 0.6, 115 * 0.6],
			["absolute", -200 * 0.6, -115 * 0.6],
			["absolute", 0, 0],
		],
		homeMarkerFallbackPositions: [null, null, null, null, null, null, null],
	}
}

export function voidTerrain(hex) {
	return {
		hexTerrainID: hex.hexTerrainID,
		baseTerrain: TERR_VOID,
		riverType: RIVER_NONE,
		hexGfx: hex.hexGfx,
		rotatable: true,
		riverVertexRiverIds: [],
		riverVertexDefinitions: [],
		riverVertexEdges: [],
		sideRiverVertexIds: util.makeArrayOfSizeWithFill(6, -1),
		riverStoppingVertex: [],
		nodeBucketIds: [0],
		nodeVertexDefinitions: [["absolute", 0, 0]],
		nodeEdges: [],
		cornerBucketIds: util.makeArrayOfSizeWithFill(6, 0),
		sideNodeIds: util.makeArrayOfSizeWithFill(6, 0),
		cornerNodeIds: util.makeArrayOfSizeWithFill(6, [-1, -1]),
		roadAnchors: [],
		bridges: [],
		bridgeRiverLines: [],
		riverAdjacencies: [],
		chitLocationBucketIds: [],
		chitLocationBuildingEligible: [],
		chitLocations: [],
		homeMarkerFallbackPositions: [],
	}
}

/**
 * NON-RIVER LAND HEXES
 */
export const UNIFORM_HEX_DATA = [
	{
		hexTerrainID: DESERT_1_UNIRRIGATED,
		baseTerrain: TERR_DESERT,
		hexGfx: "hex_50",
	},
	{
		hexTerrainID: DESERT_2_UNIRRIGATED,
		baseTerrain: TERR_DESERT,
		hexGfx: "hex_51",
	},
	{
		hexTerrainID: DESERT_3_UNIRRIGATED,
		baseTerrain: TERR_DESERT,
		hexGfx: "hex_52",
	},
	{
		hexTerrainID: DESERT_4_UNIRRIGATED,
		baseTerrain: TERR_DESERT,
		hexGfx: "hex_53",
	},
	{
		hexTerrainID: DESERT_5_UNIRRIGATED,
		baseTerrain: TERR_DESERT,
		hexGfx: "hex_54",
	},
	{
		hexTerrainID: PASTURE_1,
		baseTerrain: TERR_PASTURE,
		hexGfx: "hex_55",
	},
	{
		hexTerrainID: PASTURE_2,
		baseTerrain: TERR_PASTURE,
		hexGfx: "hex_56",
	},
	{
		hexTerrainID: PASTURE_3,
		baseTerrain: TERR_PASTURE,
		hexGfx: "hex_57",
	},
	{
		hexTerrainID: PASTURE_4,
		baseTerrain: TERR_PASTURE,
		hexGfx: "hex_58",
	},
	{
		hexTerrainID: PASTURE_5,
		baseTerrain: TERR_PASTURE,
		hexGfx: "hex_59",
	},
	{
		hexTerrainID: PASTURE_6,
		baseTerrain: TERR_PASTURE,
		hexGfx: "hex_60",
	},
	{
		hexTerrainID: PASTURE_7,
		baseTerrain: TERR_PASTURE,
		hexGfx: "hex_61",
	},
	{
		hexTerrainID: PASTURE_8,
		baseTerrain: TERR_PASTURE,
		hexGfx: "hex_62",
	},
	{
		hexTerrainID: PASTURE_9,
		baseTerrain: TERR_PASTURE,
		hexGfx: "hex_63",
	},
	{
		hexTerrainID: WOODS_1,
		baseTerrain: TERR_WOODS,
		hexGfx: "hex_70",
	},
	{
		hexTerrainID: WOODS_2,
		baseTerrain: TERR_WOODS,
		hexGfx: "hex_71",
	},
	{
		hexTerrainID: WOODS_3,
		baseTerrain: TERR_WOODS,
		hexGfx: "hex_72",
	},
	{
		hexTerrainID: WOODS_4,
		baseTerrain: TERR_WOODS,
		hexGfx: "hex_73",
	},
	{
		hexTerrainID: WOODS_5,
		baseTerrain: TERR_WOODS,
		hexGfx: "hex_74",
	},
	{
		hexTerrainID: ROCK_1,
		baseTerrain: TERR_ROCK,
		hexGfx: "hex_64",
	},
	{
		hexTerrainID: ROCK_2,
		baseTerrain: TERR_ROCK,
		hexGfx: "hex_65",
	},
	{
		hexTerrainID: ROCK_3,
		baseTerrain: TERR_ROCK,
		hexGfx: "hex_66",
	},
	{
		hexTerrainID: ROCK_4,
		baseTerrain: TERR_ROCK,
		hexGfx: "hex_67",
	},
	{
		hexTerrainID: ROCK_5,
		baseTerrain: TERR_ROCK,
		hexGfx: "hex_68",
	},
	{
		hexTerrainID: ROCK_6,
		baseTerrain: TERR_ROCK,
		hexGfx: "hex_69",
	},
	// POLDERS
	{
		hexTerrainID: POLDER_1,
		baseTerrain: TERR_POLDER,
		hexGfx: "hex_90",
	},
	{
		hexTerrainID: POLDER_2,
		baseTerrain: TERR_POLDER,
		hexGfx: "hex_91",
	},
	{
		hexTerrainID: POLDER_3,
		baseTerrain: TERR_POLDER,
		hexGfx: "hex_92",
	},
	{
		hexTerrainID: POLDER_4,
		baseTerrain: TERR_POLDER,
		hexGfx: "hex_93",
	},
	{
		hexTerrainID: POLDER_5,
		baseTerrain: TERR_POLDER,
		hexGfx: "hex_94",
	},
]
	.map(uniformPlains)
	.concat(
		[
			{
				hexTerrainID: MOUNTAIN_1,
				baseTerrain: TERR_MOUNTAINS,
				hexGfx: "hex_75",
			},
			{
				hexTerrainID: MOUNTAIN_2,
				baseTerrain: TERR_MOUNTAINS,
				hexGfx: "hex_76",
			},
			{
				hexTerrainID: MOUNTAIN_3,
				baseTerrain: TERR_MOUNTAINS,
				hexGfx: "hex_77",
			},
			{
				hexTerrainID: MOUNTAIN_4,
				baseTerrain: TERR_MOUNTAINS,
				hexGfx: "hex_78",
			},
			{
				hexTerrainID: MOUNTAIN_5,
				baseTerrain: TERR_MOUNTAINS,
				hexGfx: "hex_79",
			},
		]
			.map(uniformMountains)
			.concat(
				[
					// Plain sea hexex
					{
						hexTerrainID: SEA_1,
						hexGfx: "hex_80",
					},
					{
						hexTerrainID: SEA_2,
						hexGfx: "hex_81",
					},
					{
						hexTerrainID: SEA_3,
						hexGfx: "hex_82",
					},
					{
						hexTerrainID: SEA_4,
						hexGfx: "hex_83",
					},
					{
						hexTerrainID: SEA_5,
						hexGfx: "hex_84",
					},
					{
						hexTerrainID: SEA_6,
						hexGfx: "hex_85",
					},
					{
						hexTerrainID: SEA_7,
						hexGfx: "hex_86",
					},
					{
						hexTerrainID: SEA_8,
						hexGfx: "hex_87",
					},
				].map(seaTerrain)
			)
			.concat(
				[
					{
						hexTerrainID: BLANK_1,
						hexGfx: "hex_95",
					},
					{
						hexTerrainID: BLANK_2,
						hexGfx: "hex_96",
					},
				].map(voidTerrain)
			)
	)

export const ALL_HEX_DATA = UNIFORM_HEX_DATA.concat([
	/**
	 * RIVER HEXES ---- see hex_02 for example hex
	 * x
	 */
	{
		// Desert hex with sharp U river
		hexTerrainID: DESERT_RIVER_SHARP_U,
		baseTerrain: TERR_DESERT,
		riverType: RIVER_SHARP_U,
		hexGfx: "hex_00",
		rotatable: true,

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, -1, -1, 6, 0],
		riverVertexDefinitions: [
			["absolute", -144, -284],
			["absolute", -31, -204],
			["absolute", 71, -134],
			["absolute", 116, 0],
			["absolute", -26, 75],
			["absolute", -197, 24],
			["absolute", -331, 8],
		],
		// This tells you which vertices connect to which
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 0, 1, 1, 1],
		nodeVertexDefinitions: [
			["relative", 5, 1 - RSA, 0.05],
			["relative", 0, 0.5, 0.2],
			["relative", 1, 0.5, 0.4],
			["relative", 2, 0.5, 0.4],
			["relative", 3, 0.5, 0.4],
			["relative", 4, RSA, 0.1],
			["relative", 4, 1 - RSA, 0.1],
			["relative", 5, RSA, 0.1],
			["absolute", -120, -116],
		],
		nodeEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[6, 8],
			[7, 8],
		],
		cornerBucketIds: [0, 0, 0, 0, 0, 1],
		sideNodeIds: [1, 2, 3, 4, -1, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[5, 6],
			[7, 0],
		],

		roadAnchors: [3, 5, 8],
		bridges: [[2, 8]],
		bridgeRiverLines: [
			[
				[126, -74],
				[110, 19],
			].map(coord.absolute),
		],
		riverAdjacencies: [[0, 1]],
		chitLocationBucketIds: [0, 0, 0, 0, 0, 1],
		chitLocationBuildingEligible: [false, true, true, true, false, true],
		chitLocations: [
			["absolute", 39, -328],
			["absolute", 251, -158],
			["absolute", 232, 140],
			["absolute", -1, 252],
			["absolute", -246, 191],
			["absolute", -200, -115],
		],
		homeMarkerFallbackPositions: [null, null, null, null, null, ["absolute", -39, -58]],
	},
	{
		// Desert hex with gentle curve - 1
		hexTerrainID: DESERT_RIVER_GENTLE_CURVE,
		baseTerrain: TERR_DESERT,
		riverType: RIVER_GENTLE_CURVE,
		hexGfx: "hex_01",
		rotatable: true,

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, -1, 6, -1, 0],
		riverVertexDefinitions: [
			["absolute", -149, -292],
			["absolute", -31, -204],
			["absolute", 52, -84],
			["absolute", 55, 26],
			["absolute", 4, 141],
			["absolute", -77, 205],
			["absolute", -171, 297],
		],
		// This tells you which vertices connect to which
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		riverAdjacencies: [[0, 1]],

		nodeBucketIds: [0, 0, 0, 0, 0, 1, 1, 1],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.2],
			[0, 0.5, 0.4],
			[1, 0.5, 0.5],
			[2, 0.5, 0.4],
			[3, RSA, 0.2],
			[3, 1 - RSA, 0.2],
			[4, 0.5, 0.5],
			[5, RSA, 0.2],
		].map(coord.relative),
		nodeEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[5, 6],
			[6, 7],
		],
		cornerBucketIds: [0, 0, 0, 0, 1, 1],
		sideNodeIds: [1, 2, 3, -1, 6, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[4, 5],
			[-1, -1],
			[7, 0],
		],
		roadAnchors: [2, 6],
		bridges: [[2, 6]], // Bridges indicate connected nodes. So [0,1] joins node0 and node1
		bridgeRiverLines: [
			[
				[60, 75],
				[36, -121],
			].map(coord.absolute),
		],
		chitLocationBucketIds: [0, 0, 0, 0, 1, 1],
		chitLocationBuildingEligible: [false, true, true, false, true, true],
		chitLocations: [
			["absolute", 74, -319],
			["absolute", 200, -115],
			["absolute", 200, 115],
			["absolute", 60, 309],
			["absolute", -240, 105],
			["absolute", -243, -99],
		],
		homeMarkerFallbackPositions: [null, null, null, null, null, null],
	},
	// This is the example hex. All data should be explained in the comments
	{
		// Pasture hex with straight river
		/** These items are 'constants' for the hex, and can be copied from this data on load. NB some might need to be 'rotated'  */
		hexTerrainID: PASTURE_RIVER_STRAIGHT, // This is NOT unique. There can be many of these tiles on the map. It identifies the TYPE of hex it is
		baseTerrain: TERR_PASTURE,
		riverType: RIVER_SINGLE_STRAIGHT,
		hexGfx: "hex_02",
		rotatable: true, // NB currently every tile is "rotatable"; for non river hexes its just to allow rotation of the tile gfx
		// Each hex has an internal graph of nodes and edges. The bridges can be thought of as potential edges
		// And each node has a position associated with it, in hex.vertices

		// NOT bridges - Used to figure out which rivers and buckets are adjacent for purposes of picking up and dropping things
		// These are the buckets that connect to the river
		riverAdjacencies: [[0, 1]],

		// This tells you which river the below vertices go in
		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		// This defines the river vertices
		riverVertexDefinitions: [
			["absolute", -149, -292],
			["absolute", -117, -190],
			["absolute", -125, -87],
			["absolute", -117, -2],
			["absolute", 87, 86],
			["absolute", 127, 177],
			["absolute", 162, 276],
		],
		// This tells you which vertices connect to which
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],

		// This tells you which vertices connect to which

		sideRiverVertexIds: [-1, -1, 6, -1, -1, 0],
		// Each hex has a set of internal *nodes* and *edges* representing a graph
		// The nodes are referred to by ID, and are merely inferred
		// The edges connect two node IDs as in [a, b]
		nodeBucketIds: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1], // The initial bucket ids for each node
		// Encodes the positions of each node
		// Format is [side, x, y] where x is placement clockwise from the side's first corner to the next
		// and y is orthogonal placement, from the hex side and inward
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.3],
			[0, 0.5, 0.2],
			[1, 0.5, 0.2],
			[2, RSA, 0.2],
			[0, 0.4, 0.6],
			[2, 0.1, 0.7],
			[2, 1 - RSA, 0.2],
			[3, 0.5, 0.5],
			[4, 0.5, 0.3],
			[5, RSA, 0.2],
		].map(coord.relative),
		// Edges defining which nodes are adjacent in the graph
		nodeEdges: [
			[0, 4],
			[1, 4],
			[4, 5],
			[2, 5],
			[3, 5],
			[6, 7],
			[7, 8],
			[8, 9],
		],

		// Initial bucket ids for hex corners. Used for drawing bucket highlights
		cornerBucketIds: [0, 0, 0, 1, 1, 1],
		// define which nodes are the exit/entry points of that side of the hex FOR LAND EXITS
		// This is for NON river sides only, so always in the CENTER of that side
		// The number refers to the entry in nodeVertexDefinitions (should be small circle in ZP hex)
		sideNodeIds: [1, 2, -1, 7, 8, -1],
		//define which nodes are the exit/entry points of that corner of the hex, in the direction of that side
		// eg top corner exit to the right would be in cornerNodeIds[0][0], whereas top corner exit to the left would be cornerNodeIds[5][1]
		// So These are the entry/exit points, like above, but ONLY for LAND exits ON RIVER sides
		// So the exit must be above/below the river
		// The number refers to the entry in nodeVertexDefinitions (should be small circle in ZP hex)
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[3, 6],
			[-1, -1],
			[-1, -1],
			[9, 0],
		],

		// Roads will extend until finding of these nodes when building from an edge
		roadAnchors: [4, 5, 7, 8],
		/******* BRIDGES ***********/
		bridges: [[4, 7]], // Bridges indicate connected nodes. So [0,1] joins node0 and node1
		bridgeRiverLines: [
			[
				[-126.49604, 0.54423],
				[63.97923, 72.38062],
			].map(coord.absolute),
		], // This is the line of the river. It intersects with the bridge line to center the bridge gfx
		// This is to get which connected bucket each chit location is in
		chitLocationBucketIds: [0, 0, 0, 1, 1, 1],
		// Of the chit locations, this says which are AVAILABLE for buildings
		chitLocationBuildingEligible: [false, true, false, false, true, false],
		chitLocations: [
			["absolute", 63, -244],
			["absolute", 200, -115],
			["absolute", 291, 99],
			["absolute", -31, 260],
			["absolute", -246, 115],
			["absolute", -275, -105],
		],
		homeMarkerFallbackPositions: [null, ["absolute", 288, 99], null, null, ["absolute", -275, -105], null],
	},
	// This is the template hex. It should EXACTLY match the order of items above
	// No comments required. Copy and paste this to make nex hexes
	{
		// Pasture hex with straight river - wiggly
		hexTerrainID: PASTURE_RIVER_STRAIGHT_WIGGLY,
		baseTerrain: TERR_PASTURE,
		riverType: RIVER_SINGLE_STRAIGHT,
		hexGfx: "hex_03",
		rotatable: true,

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, 6, -1, -1, 0],
		riverVertexDefinitions: [
			["absolute", -149, -292],
			["absolute", -26, -229],
			["absolute", -71, 31],
			["absolute", 114, 41],
			["absolute", 44, 165],
			["absolute", 14, 269],
			["absolute", 162, 299],
		],
		// This tells you which vertices connect to which
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		riverAdjacencies: [[0, 1]],

		nodeBucketIds: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.1],
			[0, 0.5, 0.25],
			[1, 0.5, 0.2],
			[2, RSA, 0.2],
			[0, 0.6, 0.6],
			[2, 0.1, 0.7],
			[2, 1 - RSA, 0.1],
			[3, 0.5, 0.2],
			[4, 0.5, 0.6],
			[5, RSA, 0.2],
		].map(coord.relative),
		nodeEdges: [
			[0, 1],
			[1, 4],
			[4, 5],
			[2, 5],
			[3, 5],
			[6, 7],
			[7, 8],
			[8, 9],
		],
		cornerBucketIds: [0, 0, 0, 1, 1, 1],
		sideNodeIds: [1, 2, -1, 7, 8, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[3, 6],
			[-1, -1],
			[-1, -1],
			[9, 0],
		],
		roadAnchors: [4, 5, 7, 8],
		bridges: [[4, 8]],
		bridgeRiverLines: [
			[
				[-26.36047, -233.46825],
				[-88.40099, 39.72771],
			].map(coord.absolute),
		],
		chitLocationBucketIds: [0, 0, 0, 1, 1, 1],
		chitLocationBuildingEligible: [false, true, false, false, true, false],
		chitLocations: [
			["absolute", 47, -317],
			["absolute", 230, -129],
			["absolute", 216, 115],
			["absolute", -85, 183],
			["absolute", -246, 110],
			["absolute", -200, -115],
		],
		homeMarkerFallbackPositions: [null, ["absolute", 296, 112], null, null, ["absolute", -313, -94], null],
	},
	{
		// Pasture hex with gentle curve - 1
		hexTerrainID: PASTURE_RIVER_GENTLE_CURVE_1,
		baseTerrain: TERR_PASTURE,
		riverType: RIVER_GENTLE_CURVE,
		hexGfx: "hex_04",
		rotatable: true,
		riverAdjacencies: [[0, 1]],

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, -1, 6, -1, 0],
		riverVertexDefinitions: [
			["absolute", -165, -282],
			["absolute", -87, -196],
			["absolute", -50, -70],
			["absolute", -53, 64],
			["absolute", -82, 139],
			["absolute", -120, 208],
			["absolute", -171, 297],
		],
		// This tells you which vertices connect to which
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 1, 1, 1],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.2],
			[0, 0.5, 0.4],
			[1, 0.5, 0.6],
			[2, 0.5, 0.6],
			[3, RSA, 0.2],
			[3, 1 - RSA, 0.2],
			[4, 0.5, 0.5],
			[5, RSA, 0.2],
		].map(coord.relative),
		nodeEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[5, 6],
			[6, 7],
		],
		cornerBucketIds: [0, 0, 0, 0, 1, 1],
		sideNodeIds: [1, 2, 3, -1, 6, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[4, 5],
			[-1, -1],
			[7, 0],
		],
		roadAnchors: [2, 6],
		bridges: [[2, 6]], // Bridges indicate connected nodes. So [0,1] joins node0 and node1
		bridgeRiverLines: [
			[
				[-39.42163, -132.24424],
				[-57.92494, 101.76823],
			].map(coord.absolute),
		],
		chitLocationBucketIds: [0, 0, 0, 0, 1, 1],
		chitLocationBuildingEligible: [false, true, true, false, true, true],
		chitLocations: [
			["absolute", 52, -295],
			["absolute", 200, -115],
			["absolute", 200, 115],
			["absolute", 79, 277],
			["absolute", -267, 99],
			["absolute", -267, -105],
		],
		homeMarkerFallbackPositions: [null, null, null, null, null, null],
	},
	{
		hexTerrainID: PASTURE_RIVER_GENTLE_CURVE_2,
		baseTerrain: TERR_PASTURE,
		riverType: RIVER_GENTLE_CURVE,
		hexGfx: "hex_05",
		rotatable: true,
		riverAdjacencies: [[0, 1]],

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, -1, 6, -1, 0],
		riverVertexDefinitions: [
			["absolute", -165, -282],
			["absolute", -87, -196],
			["absolute", -50, -70],
			["absolute", -53, 64],
			["absolute", -82, 139],
			["absolute", -120, 208],
			["absolute", -171, 297],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 1, 1, 1],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.2],
			[0, 0.5, 0.4],
			[1, 0.5, 0.6],
			[2, 0.5, 0.6],
			[3, RSA, 0.2],
			[3, 1 - RSA, 0.2],
			[4, 0.5, 0.5],
			[5, RSA, 0.2],
		].map(coord.relative),
		nodeEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[5, 6],
			[6, 7],
		],
		cornerBucketIds: [0, 0, 0, 0, 1, 1],
		sideNodeIds: [1, 2, 3, -1, 6, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[4, 5],
			[-1, -1],
			[7, 0],
		],
		roadAnchors: [2, 6],
		bridges: [[2, 6]], // Bridges indicate connected nodes. So [0,1] joins node0 and node1
		bridgeRiverLines: [
			[
				[-52.48279, -123.5368],
				[-64.45552, 85.44178],
			].map(coord.absolute),
		],
		chitLocationBucketIds: [0, 0, 0, 0, 1, 1],
		chitLocationBuildingEligible: [false, true, true, false, true, true],
		chitLocations: [
			["absolute", 52, -295],
			["absolute", 200, -115],
			["absolute", 200, 115],
			["absolute", 79, 277],
			["absolute", -267, 99],
			["absolute", -267, -105],
		],
		homeMarkerFallbackPositions: [null, null, null, null, null, null],
	},
	{
		hexTerrainID: PASTURE_RIVER_GENTLE_CURVE_3,
		baseTerrain: TERR_PASTURE,
		riverType: RIVER_GENTLE_CURVE,
		hexGfx: "hex_06",
		rotatable: true,
		riverAdjacencies: [[0, 1]],

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, -1, 6, -1, 0],
		riverVertexDefinitions: [
			["absolute", -85, -221],
			["absolute", -141, -79],
			["absolute", -63, -12],
			["absolute", 20, 34],
			["absolute", 68, 165],
			["absolute", -31, 238],
			["absolute", -171, 297],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 1, 1, 1],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.2],
			[0, 0.5, 0.5],
			[1, 0.5, 0.5],
			[2, 0.5, 0.2],
			[3, RSA, 0.2],
			[3, 1 - RSA, 0.2],
			[4, 0.5, 0.4],
			[5, RSA, 0.2],
		].map(coord.relative),
		nodeEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[5, 6],
			[6, 7],
		],
		cornerBucketIds: [0, 0, 0, 0, 1, 1],
		sideNodeIds: [1, 2, 3, -1, 6, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[4, 5],
			[-1, -1],
			[7, 0],
		],
		roadAnchors: [2, 6],
		bridges: [[1, 6]], // Bridges indicate connected nodes. So [0,1] joins node0 and node1
		bridgeRiverLines: [
			[
				[-152.61836, -127.89052],
				[-85.1357, 8.16324],
			].map(coord.absolute),
		],
		chitLocationBucketIds: [0, 0, 0, 0, 1, 1],
		chitLocationBuildingEligible: [false, true, true, false, true, true],
		chitLocations: [
			["absolute", 52, -295],
			["absolute", 200, -115],
			["absolute", 200, 115],
			["absolute", 64, 314],
			["absolute", -267, 99],
			["absolute", -267, -105],
		],
		homeMarkerFallbackPositions: [null, null, null, null, null, null],
	},
	{
		hexTerrainID: PASTURE_RIVER_SHARP_U,
		baseTerrain: TERR_PASTURE,
		riverType: RIVER_SHARP_U,
		hexGfx: "hex_07",
		rotatable: true,

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, -1, -1, 6, 0],
		riverVertexDefinitions: [
			["absolute", -157, -305],
			["absolute", -31, -302],
			["absolute", 57, -201],
			["absolute", -34, 54],
			["absolute", -128, 81],
			["absolute", -238, 60],
			["absolute", -342, 9],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.05],
			[0, 0.5, 0.2],
			[1, 0.5, 0.6],
			[2, 0.5, 0.6],
			[3, 0.5, 0.4],
			[4, RSA, 0.1],
			[4, 1 - RSA, 0.1],
			[5, RSA, 0.1],
			[5, 0.4, 0.6],
			[0, 0.1, 0.1],
		].map(coord.relative),
		nodeEdges: [
			[0, 9],
			[9, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[6, 8],
			[7, 8],
		],
		cornerBucketIds: [0, 0, 0, 0, 0, 1],
		sideNodeIds: [1, 2, 3, 4, -1, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[5, 6],
			[7, 0],
		],

		roadAnchors: [3, 5, 8],
		bridges: [[2, 8]],
		bridgeRiverLines: [
			[
				[-43.88191, 65.99704],
				[50.2356, -80.91809],
			].map(coord.absolute),
		],
		riverAdjacencies: [[0, 1]],
		chitLocationBucketIds: [1, 0, 0, 0, 0, 1],
		chitLocationBuildingEligible: [false, true, true, true, false, true],
		chitLocations: [
			["absolute", -79, -174],
			["absolute", 238, -137],
			["absolute", 221, 140],
			["absolute", -9, 268],
			["absolute", -246, 201],
			["absolute", -235, -134],
		],
		homeMarkerFallbackPositions: [null, null, null, null, null, ["absolute", -106, -112]],
	},
	{
		hexTerrainID: PASTURE_RIVER_TRI_BLADE,
		baseTerrain: TERR_PASTURE,
		riverType: RIVER_TRI_BLADE,
		hexGfx: "hex_08",
		rotatable: true,

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 1, 0],
		sideRiverVertexIds: [-1, 7, -1, 5, -1, 0],
		riverVertexDefinitions: [
			["absolute", -160, -289],
			["absolute", -106, -195],
			["absolute", -55, -90],
			["absolute", -10, 17],
			["absolute", -74, 146],
			["absolute", -128, 234],
			["absolute", 218, 17],
			["absolute", 355, -2],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[3, 6],
			[6, 7],
		],

		nodeBucketIds: [0, 0, 0, 1, 1, 1, 2, 2, 2],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.2],
			[0, 0.5, 0.5],
			[1, RSA, 0.2],
			[1, 1 - RSA, 0.2],
			[2, 0.5, 0.5],
			[3, RSA, 0.2],
			[3, 1 - RSA, 0.2],
			[4, 0.5, 0.5],
			[5, RSA, 0.2],
		].map(coord.relative),
		nodeEdges: [
			[0, 1],
			[1, 2],
			[3, 4],
			[4, 5],
			[6, 7],
			[7, 8],
		],
		cornerBucketIds: [0, 0, 1, 1, 2, 2],
		sideNodeIds: [1, -1, 4, -1, 7, -1],
		cornerNodeIds: [
			[-1, -1],
			[2, 3],
			[-1, -1],
			[5, 6],
			[-1, -1],
			[8, 0],
		],

		roadAnchors: [1, 4, 7],
		bridges: [
			[1, 4], // Right bridge
			[1, 7], // Top left bridge
			[4, 7], // Bottom left bridge
		],
		bridgeRiverLines: [
			[
				[202.20985, 27.75498],
				[21.53045, 5.98638],
			].map(coord.absolute),
			[
				[-91.66628, -170.3393],
				[-11.12245, 8.16324],
			].map(coord.absolute),
			[
				[-104.72744, 201.9038],
				[-18.74146, 38.63928],
			].map(coord.absolute),
		],
		riverAdjacencies: [[0, 1, 2]],
		chitLocationBucketIds: [0, 0, 1, 1, 2, 2],
		chitLocationBuildingEligible: [true, false, true, false, true, false],
		chitLocations: [
			["absolute", 74, -268],
			["absolute", 227, -140],
			["absolute", 184, 185],
			["absolute", 34, 271],
			["absolute", -238, 97],
			["absolute", -281, -89],
		],
		homeMarkerFallbackPositions: [["absolute", 226, -142], null, ["absolute", 33, 271], null, ["absolute", -278, -88], null],
	},
	{
		hexTerrainID: PASTURE_RIVER_SHARP_U_PLUS_STRAIGHT_R,
		baseTerrain: TERR_PASTURE,
		riverType: RIVER_SHARP_U_PLUS_STRAIGHT_R,
		hexGfx: "hex_09",
		rotatable: true,

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 1, 0],
		sideRiverVertexIds: [-1, 7, -1, -1, 5, 0],
		riverVertexDefinitions: [
			["absolute", -160, -289],
			["absolute", -106, -195],
			["absolute", -39, -119],
			["absolute", 12, 21],
			["absolute", -160, 115],
			["absolute", -278, 64],
			["absolute", 127, 42],
			["absolute", 266, 21],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[3, 6],
			[6, 7],
		],

		nodeBucketIds: [0, 0, 0, 1, 1, 1, 1, 2, 2, 2],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.2],
			[0, 0.5, 0.4],
			[1, RSA, 0.2],
			[1, 1 - RSA, 0.1],
			[2, 0.5, 0.4],
			[3, 0.5, 0.3],
			[4, RSA, 0.1],
			[4, 1 - RSA, 0.1],
			[5, RSA, 0.1],
			[4, 0.6, 0.5],
		].map(coord.relative),
		nodeEdges: [
			[0, 1],
			[1, 2],
			[3, 4],
			[4, 5],
			[5, 6],
			[7, 9],
			[8, 9],
		],
		cornerBucketIds: [0, 0, 1, 1, 1, 2],
		sideNodeIds: [1, -1, 4, 5, -1, -1],
		cornerNodeIds: [
			[-1, -1],
			[2, 3],
			[-1, -1],
			[-1, -1],
			[6, 7],
			[8, 0],
		],

		roadAnchors: [1, 4],
		bridges: [
			[1, 4], // Right river bit
			[1, 9], // Top river bit
			[5, 9], // Left river bit
		],
		bridgeRiverLines: [
			[
				[197.85613, 47.34672],
				[56.36022, 42.993],
			].map(coord.absolute),
			[
				[-72.07454, -170.3393],
				[5.204, -58.231],
			].map(coord.absolute),
			[
				[-207.03987, 117.00625],
				[-27.4489, 65.85004],
			].map(coord.absolute),
		],
		riverAdjacencies: [[0, 1, 2]],
		chitLocationBucketIds: [0, 0, 1, 1, 1, 2, 2],
		chitLocationBuildingEligible: [true, true, false, true, false, true, false],
		chitLocations: [
			["absolute", 44, -266],
			["absolute", 208, -137],
			["absolute", 240, 183],
			["absolute", -4, 282],
			["absolute", -240, 201],
			["absolute", -246, -137],
			["absolute", -128, -43],
		],
		homeMarkerFallbackPositions: [null, null, null, ["absolute", 240, 184], null, ["absolute", -130, -43], null],
	},

	{
		// Pasture hex with triple river; like straight river, plus L bend to side 4
		hexTerrainID: PASTURE_RIVER_SHARP_U_PLUS_STRAIGHT_L,
		baseTerrain: TERR_PASTURE,
		riverType: RIVER_SHARP_U_PLUS_STRAIGHT_L,
		hexGfx: "hex_10",
		rotatable: true,

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 1, 0],
		sideRiverVertexIds: [-1, -1, 7, -1, 5, 0],
		riverVertexDefinitions: [
			["absolute", -160, -289],
			["absolute", -74, -258],
			["absolute", 17, -178],
			["absolute", 23, 5],
			["absolute", -122, 34],
			["absolute", -254, 10],
			["absolute", 98, 74],
			["absolute", 140, 182],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[3, 6],
			[6, 7],
		],

		nodeBucketIds: [0, 0, 0, 0, 1, 1, 1, 2, 2, 2],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.1],
			[0, 0.5, 0.3],
			[1, 0.5, 0.4],
			[2, RSA, 0.1],
			[2, 1 - RSA, 0.2],
			[3, 0.5, 0.4],
			[4, RSA, 0.2],
			[4, 1 - RSA, 0.1],
			[5, RSA, 0.1],
			[5, 0.4, 0.5],
		].map(coord.relative),
		nodeEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[4, 5],
			[5, 6],
			[7, 9],
			[8, 9],
		],
		cornerBucketIds: [0, 0, 0, 1, 1, 2],
		sideNodeIds: [1, 2, -1, 5, -1, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[3, 4],
			[-1, -1],
			[6, 7],
			[8, 0],
		],

		roadAnchors: [1, 2, 5, 9],
		bridges: [
			[1, 9], // Top bridge
			[2, 5], // Bottom bridge
			[5, 9], // Left bridge, on the stumpy bit
		],
		bridgeRiverLines: [
			[
				[-16.61721, -245.61843],
				[45.06432, -94.661],
			].map(coord.absolute),
			[
				[92.13707, 53.05005],
				[157.065, 262.44262],
			].map(coord.absolute),
			[
				[-209.7778, 14.09329],
				[-73.42915, 41.68766],
			].map(coord.absolute),
		],
		riverAdjacencies: [[0, 1, 2]],
		chitLocationBucketIds: [0, 0, 0, 1, 1, 2, 2],
		chitLocationBuildingEligible: [false, true, false, true, true, true, false],
		chitLocations: [
			["absolute", 55, -328],
			["absolute", 240, -121],
			["absolute", 291, 105],
			["absolute", -36, 263],
			["absolute", -211, 166],
			["absolute", -246, -142],
			["absolute", -85, -89],
		],
		homeMarkerFallbackPositions: [null, ["absolute", 288, 107], null, null, null, ["absolute", -93, -92], null],
	},
	{
		hexTerrainID: ROCK_RIVER_STRAIGHT,
		baseTerrain: TERR_ROCK,
		riverType: RIVER_SINGLE_STRAIGHT,
		hexGfx: "hex_11",
		rotatable: true,
		riverAdjacencies: [[0, 1]],

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, 6, -1, -1, 0],
		riverVertexDefinitions: [
			["absolute", -157, -305],
			["absolute", -120, -192],
			["absolute", -63, -55],
			["absolute", 55, 84],
			["absolute", 87, 140],
			["absolute", 124, 205],
			["absolute", 173, 285],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
		nodeVertexDefinitions: [
			[5, 1-RSA, 0.2],
			[0, 0.5, 0.2],
			[1, 0.5, 0.2],
			[2, RSA, 0.2],
			[2, RSA, 1],
			[2, 1 - RSA, 0.2],
			[3, 0.5, 0.2],
			[4, 0.5, 0.2],
			[5, RSA, 0.2],
			[5, RSA, 1],
		].map(coord.relative),
		nodeEdges: [
			[0, 4],
			[1, 4],
			[2, 4],
			[3, 4],
			[5, 9],
			[6, 9],
			[7, 9],
			[8, 9],
		],
		cornerBucketIds: [0, 0, 0, 1, 1, 1],
		sideNodeIds: [1, 2, -1, 6, 7, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[3, 5],
			[-1, -1],
			[-1, -1],
			[8, 0],
		],
		roadAnchors: [4, 9],
		bridges: [[4, 9]], // Bridges indicate connected nodes. So [0,1] joins node0 and node1
		bridgeRiverLines: [
			[
				[44.38748, 69.11532],
				[-41.5985, -57.14257],
			].map(coord.absolute),
		],
		chitLocationBucketIds: [0, 0, 0, 1, 1, 1],
		chitLocationBuildingEligible: [false, true, false, false, true, false],
		chitLocations: halfwayCorners,
		homeMarkerFallbackPositions: [null, ["absolute", 301, 100], null, null, ["absolute", -299, -112], null],
	},
	{
		hexTerrainID: ROCK_RIVER_GENTLE_CURVE,
		baseTerrain: TERR_ROCK,
		riverType: RIVER_GENTLE_CURVE,
		hexGfx: "hex_12",
		rotatable: true,
		riverAdjacencies: [[0, 1]],

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, -1, 6, -1, 0],
		riverVertexDefinitions: [
			["absolute", -157, -305],
			["absolute", -82, -186],
			["absolute", -36, -95],
			["absolute", -31, 98],
			["absolute", -71, 168],
			["absolute", -114, 221],
			["absolute", -181, 307],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 1, 1, 1],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.2],
			[0, 0.5, 0.5],
			[1, 0.5, 0.6],
			[2, 0.5, 0.5],
			[3, RSA, 0.2],
			[3, 1 - RSA, 0.2],
			[4, 0.5, 0.5],
			[5, RSA, 0.2],
		].map(coord.relative),
		nodeEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[5, 6],
			[6, 7],
		],
		cornerBucketIds: [0, 0, 0, 0, 1, 1],
		sideNodeIds: [1, 2, 3, -1, 6, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[4, 5],
			[-1, -1],
			[7, 0],
		],
		roadAnchors: [2, 6],
		bridges: [[2, 6]], // Bridges indicate connected nodes. So [0,1] joins node0 and node1
		bridgeRiverLines: [
			[
				[-10, -61],
				[-36, 94],
			].map(coord.absolute),
		],
		chitLocationBucketIds: [0, 0, 0, 0, 1, 1],
		chitLocationBuildingEligible: [false, true, true, false, true, true],
		chitLocations: [
			["absolute", 68, -271],
			["absolute", 200, -115],
			["absolute", 200, 115],
			["absolute", 79, 290],
			["absolute", -251, 99],
			["absolute", -246, -102],
		],
		homeMarkerFallbackPositions: [null, null, null, null, null, null],
	},
	{
		// Rock hex with sharp U river
		hexTerrainID: ROCK_RIVER_SHARP_U,
		baseTerrain: TERR_ROCK,
		riverType: RIVER_SHARP_U,
		hexGfx: "hex_13",
		rotatable: true,

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, -1, -1, 6, 0],
		riverVertexDefinitions: [
			["absolute", -154, -297],
			["absolute", -34, -284],
			["absolute", 84, -230],
			["absolute", 6, 38],
			["absolute", -47, 81],
			["absolute", -197, 70],
			["absolute", -347, 11],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.05],
			[0, 0.5, 0.2],
			[1, 0.5, 0.6],
			[2, 0.5, 0.6],
			[3, 0.5, 0.4],
			[4, RSA, 0.1],
			[4, 1 - RSA, 0.1],
			[5, RSA, 0.1],
			[5, 0.4, 0.6],
			[0, 0.1, 0.1],
		].map(coord.relative),
		nodeEdges: [
			[0, 9],
			[9, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[6, 8],
			[7, 8],
		],
		cornerBucketIds: [0, 0, 0, 0, 0, 1],
		sideNodeIds: [1, 2, 3, 4, -1, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[5, 6],
			[7, 0],
		],

		roadAnchors: [3, 5, 8],
		bridges: [[2, 8]],
		bridgeRiverLines: [
			[
				[-43.88191, 65.99704],
				[50.2356, -80.91809],
			].map(coord.absolute),
		],
		riverAdjacencies: [[0, 1]],
		chitLocationBucketIds: [1, 0, 0, 0, 0, 1],
		chitLocationBuildingEligible: [false, true, true, true, false, true],
		chitLocations: [
			["absolute", -52, -185],
			["absolute", 240, -129],
			["absolute", 211, 134],
			["absolute", -1, 258],
			["absolute", -227, 169],
			["absolute", -219, -134],
		],
		homeMarkerFallbackPositions: [null, null, null, null, null, ["absolute", -93, -84]],
	},
	{
		hexTerrainID: WOODS_RIVER_STRAIGHT,
		baseTerrain: TERR_WOODS,
		riverType: RIVER_SINGLE_STRAIGHT,
		hexGfx: "hex_14",
		rotatable: true,
		riverAdjacencies: [[0, 1]],

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, 6, -1, -1, 0],
		riverVertexDefinitions: [
			["absolute", -154, -297],
			["absolute", -130, -215],
			["absolute", -82, -140],
			["absolute", -31, -89],
			["absolute", 55, 50],
			["absolute", 103, 150],
			["absolute", 149, 270],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.2],
			[0, 0.5, 0.2],
			[1, 0.5, 0.2],
			[2, RSA, 0.2],
			[2, RSA, 1],
			[2, 1 - RSA, 0.2],
			[3, 0.5, 0.2],
			[4, 0.5, 0.2],
			[5, RSA, 0.2],
			[5, RSA, 1],
		].map(coord.relative),
		nodeEdges: [
			[0, 4],
			[1, 4],
			[2, 4],
			[3, 4],
			[5, 9],
			[6, 9],
			[7, 9],
			[8, 9],
		],
		cornerBucketIds: [0, 0, 0, 1, 1, 1],
		sideNodeIds: [1, 2, -1, 6, 7, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[3, 5],
			[-1, -1],
			[-1, -1],
			[8, 0],
		],
		roadAnchors: [4, 9],
		bridges: [[4, 9]], // Bridges indicate connected nodes. So [0,1] joins node0 and node1
		bridgeRiverLines: [
			[
				[99, 117],
				[-27, -80],
			].map(coord.absolute),
		],
		chitLocationBucketIds: [0, 0, 0, 1, 1, 1],
		chitLocationBuildingEligible: [false, true, false, false, true, false],
		chitLocations: [
			["absolute", 34, -252],
			["absolute", 200, -115],
			["absolute", 243, 102],
			["absolute", -39, 250],
			["absolute", -200, 115],
			["absolute", -256, -99],
		],
		homeMarkerFallbackPositions: [null, ["absolute", 240, 102], null, null, ["absolute", -254, -97], null],
	},
	{
		hexTerrainID: WOODS_RIVER_GENTLE_CURVE,
		baseTerrain: TERR_WOODS,
		riverType: RIVER_GENTLE_CURVE,
		hexGfx: "hex_15",
		rotatable: true,
		riverAdjacencies: [[0, 1]],

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, -1, 6, -1, 0],
		riverVertexDefinitions: [
			["absolute", -154, -297],
			["absolute", -53, -219],
			["absolute", 39, -109],
			["absolute", 9, 102],
			["absolute", -34, 196],
			["absolute", -103, 239],
			["absolute", -184, 309],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 1, 1, 1],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.2],
			[0, 0.5, 0.4],
			[1, 0.5, 0.6],
			[2, 0.5, 0.5],
			[3, RSA, 0.2],
			[3, 1 - RSA, 0.2],
			[4, 0.5, 0.5],
			[5, RSA, 0.2],
		].map(coord.relative),
		nodeEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[5, 6],
			[6, 7],
		],
		cornerBucketIds: [0, 0, 0, 0, 1, 1],
		sideNodeIds: [1, 2, 3, -1, 6, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[4, 5],
			[-1, -1],
			[7, 0],
		],
		roadAnchors: [2, 6],
		bridges: [[2, 6]], // Bridges indicate connected nodes. So [0,1] joins node0 and node1
		bridgeRiverLines: [
			[
				[65, -115],
				[-20, 199],
			].map(coord.absolute),
		],
		chitLocationBucketIds: [0, 0, 0, 0, 1, 1],
		chitLocationBuildingEligible: [false, true, true, false, true, true],
		chitLocations: [
			["absolute", 66, -317],
			["absolute", 200, -115],
			["absolute", 200, 115],
			["absolute", 90, 293],
			["absolute", -235, 99],
			["absolute", -235, -115],
		],
		homeMarkerFallbackPositions: [null, null, null, null, null, null],
	},
	{
		hexTerrainID: WOODS_RIVER_SHARP_U,
		baseTerrain: TERR_WOODS,
		riverType: RIVER_SHARP_U,
		hexGfx: "hex_16",
		rotatable: true,

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, -1, -1, 6, 0],
		riverVertexDefinitions: [
			["absolute", -149, -303],
			["absolute", -12, -258],
			["absolute", 39, -129],
			["absolute", -63, 83],
			["absolute", -171, 88],
			["absolute", -272, 29],
			["absolute", -355, -3],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 0, 1, 1, 1, 0],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.05],
			[0, 0.5, 0.2],
			[1, 0.5, 0.6],
			[2, 0.5, 0.6],
			[3, 0.5, 0.4],
			[4, RSA, 0.1],
			[4, 1 - RSA, 0.1],
			[5, RSA, 0.1],
			[5, 0.4, 0.6],
			[0, 0.1, 0.1],
		].map(coord.relative),
		nodeEdges: [
			[0, 9],
			[9, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[6, 8],
			[7, 8],
		],
		cornerBucketIds: [0, 0, 0, 0, 0, 1],
		sideNodeIds: [1, 2, 3, 4, -1, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[5, 6],
			[7, 0],
		],

		roadAnchors: [3, 5, 8],
		bridges: [[2, 8]],
		bridgeRiverLines: [
			[
				[-43.88191, 65.99704],
				[50.2356, -80.91809],
			].map(coord.absolute),
		],
		riverAdjacencies: [[0, 1]],
		chitLocationBucketIds: [1, 0, 0, 0, 0, 1],
		chitLocationBuildingEligible: [false, true, true, true, false, true],
		chitLocations: [
			["absolute", -119, -43],
			["absolute", 200, -115],
			["absolute", 200, 115],
			["absolute", 0, 230],
			["absolute", -243, 196],
			["absolute", -248, -148],
		],
		homeMarkerFallbackPositions: [null, null, null, null, null, ["absolute", -117, -43]],
	},
	{
		hexTerrainID: WOODS_RIVER_BRACKETS_WIDE_NARROW, // This is NOT unique ON THE MAP. There can be many of these tiles on the map. It identifies th TYPE of hex it is
		baseTerrain: TERR_WOODS,
		riverType: RIVER_BRACKETS_WIDE_NARROW,
		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0],

		riverVertexDefinitions: [
			["absolute", 352, 7],
			["absolute", 229, 34],
			["absolute", 90, 26],
			["absolute", -10, 23],
			["absolute", -85, 63],
			["absolute", -130, 122],
			["absolute", -181, 280],
			["absolute", -372, -6],
			["absolute", -278, 7],
			["absolute", -189, 4],
			["absolute", -95, -36],
			["absolute", -66, -186],
			["absolute", -109, -256],
			["absolute", -173, -315],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
			[7, 8],
			[8, 9],
			[9, 10],
			[10, 11],
			[11, 12],
			[12, 13],
		],
		sideRiverVertexIds: [-1, 0, -1, 6, 7, 13],

		nodeBucketIds: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.2],
			[0, 0.5, 0.2],
			[1, RSA, 0.2],
			[0, 0.55, 0.7],
			[3, 1 - RSA, 0.1],
			[4, RSA, 0.1],
			[4, 0.2, 0.3],
			[1, 1 - RSA, 0.2],
			[2, 0.5, 0.4],
			[3, RSA, 0.2],
			[4, 1 - RSA, 0.1],
			[5, RSA, 0.1],
			[5, 0.3, 0.4],
		].map(coord.relative),
		nodeEdges: [
			[0, 3],
			[1, 3],
			[2, 3],
			[3, 6],
			[4, 6],
			[5, 6],
			[7, 8],
			[8, 9],
			[10, 12],
			[11, 12],
		],
		cornerBucketIds: [0, 0, 1, 1, 0, 2],
		sideNodeIds: [1, -1, 8, -1, -1, -1],
		cornerNodeIds: [
			[-1, -1],
			[2, 7],
			[-1, -1],
			[9, 4],
			[5, 10],
			[11, 0],
		],

		roadAnchors: [3, 6, 8, 12],
		bridges: [
			[3, 8], // Bottom river
			[3, 12], // Top river
		],
		bridgeRiverLines: [
			[
				[27.20915, 17.33969],
				[174.9202, 40.06447],
			].map(coord.absolute),
			[
				[-47.45797, -183.93689],
				[-83.16833, -44.34184],
			].map(coord.absolute),
		],
		riverAdjacencies: [
			[0, 1],
			[0, 2],
		],
		hexGfx: "hex_17",
		rotatable: true,
		chitLocationBucketIds: [0, 0, 1, 1, 0, 2],
		chitLocationBuildingEligible: [true, true, true, true, true, true],
		chitLocations: [
			["absolute", 50, -279],
			["absolute", 200, -115],
			["absolute", 219, 169],
			["absolute", -4, 234],
			["absolute", -275, 153],
			["absolute", -267, -164],
		],
		homeMarkerFallbackPositions: [null, null, null, null, null, ["absolute", -192, -118]],
	},

	{
		hexTerrainID: WOODS_RIVER_BRACKETS_NARROW_WIDE,
		baseTerrain: TERR_WOODS,
		riverType: RIVER_BRACKETS_NARROW_WIDE,

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0],

		riverVertexDefinitions: [
			["absolute", 352, 7],
			["absolute", 221, -34],
			["absolute", 87, -23],
			["absolute", -12, -13],
			["absolute", -85, -50],
			["absolute", -136, -136],
			["absolute", -173, -262],
			["absolute", -372, -6],
			["absolute", -270, -10],
			["absolute", -192, -7],
			["absolute", -106, 46],
			["absolute", -58, 175],
			["absolute", -114, 263],
			["absolute", -176, 306],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
			[7, 8],
			[8, 9],
			[9, 10],
			[10, 11],
			[11, 12],
			[12, 13],
		],
		sideRiverVertexIds: [-1, 0, -1, 13, 7, 6],

		riverAdjacencies: [
			[0, 1],
			[1, 2],
		],
		nodeBucketIds: [0, 0, 0, 0, 2, 2, 2, 1, 1, 1, 1, 1, 1],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.2],
			[0, 0.5, 0.2],
			[1, RSA, 0.2],
			[0, 0.55, 0.7],
			[3, 1 - RSA, 0.1],
			[4, RSA, 0.1],
			[4, 0.2, 0.3],
			[1, 1 - RSA, 0.2],
			[2, 0.5, 0.4],
			[3, RSA, 0.2],
			[4, 1 - RSA, 0.1],
			[5, RSA, 0.1],
			[5, 0.3, 0.4],
		].map(coord.relative),
		nodeEdges: [
			[0, 3],
			[1, 3],
			[2, 3],
			//[3, 6],
			[4, 6],
			[5, 6],
			[7, 8],
			[8, 9],
			[8, 12],
			[10, 12],
			[11, 12],
		],
		cornerBucketIds: [0, 0, 1, 1, 2, 1],
		sideNodeIds: [1, -1, 8, -1, -1, -1],
		cornerNodeIds: [
			[-1, -1],
			[2, 7],
			[-1, -1],
			[9, 4],
			[5, 10],
			[11, 0],
		],

		roadAnchors: [3, 6, 8, 12],
		bridges: [
			[3, 8], // Bottom river
			[8, 6], // Top river
		],
		bridgeRiverLines: [
			[
				[47.65278, -20.13594],
				[166.29166, -36.46239],
			].map(coord.absolute),
			[
				[-87.31256, 234.5567],
				[-48.12907, 126.80212],
			].map(coord.absolute),
		],

		hexGfx: "hex_18",
		rotatable: true,
		chitLocationBucketIds: [0, 0, 1, 1, 2, 1],
		chitLocationBuildingEligible: [true, true, true, true, true, true],
		chitLocations: [
			["absolute", 15, -244],
			["absolute", 208, -161],
			["absolute", 200, 115],
			["absolute", 52, 295],
			["absolute", -208, 142],
			["absolute", -278, -137],
		],
		homeMarkerFallbackPositions: [null, null, null, null, ["absolute", -326, 147], null],
	},

	{
		hexTerrainID: WOODS_RIVER_BRACKETS_2_US,
		baseTerrain: TERR_WOODS,
		riverType: RIVER_BRACKETS_2_US,

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0],

		riverVertexDefinitions: [
			["absolute", 352, 7],
			["absolute", 210, 4],
			["absolute", 98, 21],
			["absolute", -7, 69],
			["absolute", -45, 200],
			["absolute", 39, 246],
			["absolute", 162, 299],
			["absolute", -315, 13],
			["absolute", -227, 98],
			["absolute", -120, 77],
			["absolute", -58, 13],
			["absolute", -50, -87],
			["absolute", -101, -181],
			["absolute", -154, -277],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
			[7, 8],
			[8, 9],
			[9, 10],
			[10, 11],
			[11, 12],
			[12, 13],
		],
		sideRiverVertexIds: [-1, 0, 6, -1, 7, 13],

		nodeBucketIds: [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 2, 2, 2],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.2],
			[0, 0.5, 0.2],
			[1, RSA, 0.2],
			[0, 0.55, 0.7],
			[3, 1 - RSA, 0.1],
			[4, RSA, 0.1],
			[3, 0.5, 0.3],
			[1, 1 - RSA, 0.2],
			[2, 0.4, 0.6],
			[3, RSA, 0.2],
			[4, 1 - RSA, 0.1],
			[5, RSA, 0.1],
			[5, 0.2, 0.6],
		].map(coord.relative),
		nodeEdges: [
			[0, 3],
			[1, 3],
			[2, 3],
			[3, 6],
			[4, 6],
			[5, 6],
			[7, 8],
			[8, 9],
			[10, 12],
			[11, 12],
		],
		cornerBucketIds: [0, 0, 1, 0, 0, 2],
		sideNodeIds: [1, -1, -1, 4, -1, -1],
		cornerNodeIds: [
			[-1, -1],
			[2, 7],
			[7, 9],
			[-1, -1],
			[5, 10],
			[11, 0],
		],

		roadAnchors: [3, 6, 8, 12],
		bridges: [
			[3, 8], // Bottom river
			[3, 12], // Top river
		],
		bridgeRiverLines: [
			[
				[49.82964, 24.48969],
				[185.8834, 2.72109],
			].map(coord.absolute),
			[
				[-100.37372, -183.40046],
				[81.63226, 127.34632],
			].map(coord.absolute),
		],
		riverAdjacencies: [
			[0, 1],
			[0, 2],
		],
		hexGfx: "hex_19",
		rotatable: true,
		chitLocationBucketIds: [0, 0, 1, 0, 0, 2],
		chitLocationBuildingEligible: [true, true, true, false, true, true],
		chitLocations: [
			["absolute", 31, -242],
			["absolute", 197, -129],
			["absolute", 205, 140],
			["absolute", -79, 322],
			["absolute", -208, 215],
			["absolute", -189, -62],
		],
		homeMarkerFallbackPositions: [null, null, ["absolute", 323, 176], null, null, ["absolute", -307, -180]],
	},

	{
		hexTerrainID: MOUNTAIN_RIVER_STRAIGHT,
		baseTerrain: TERR_MOUNTAINS,
		riverType: RIVER_SINGLE_STRAIGHT,
		hexGfx: "hex_20",
		rotatable: true,
		riverAdjacencies: [[0, 1]],

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, 6, -1, -1, 0],
		riverVertexDefinitions: [
			["absolute", -173, -301],
			["absolute", -122, -199],
			["absolute", -130, -19],
			["absolute", 71, 69],
			["absolute", 108, 136],
			["absolute", 132, 211],
			["absolute", 170, 297],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
		nodeVertexDefinitions: [
			[5, 1 - RSA, 0.3],
			[0, 0.5, 0.2],
			[1, 0.5, 0.2],
			[2, RSA, 0.2],
			[0, 0.4, 0.6],
			[2, 0.1, 0.7],
			[2, 1 - RSA, 0.2],
			[3, 0.5, 0.5],
			[4, 0.5, 0.3],
			[5, RSA, 0.2],
		].map(coord.relative),
		nodeEdges: [
			[0, 4],
			[1, 4],
			[4, 5],
			[2, 5],
			[3, 5],
			[6, 7],
			[7, 8],
			[8, 9],
		],
		cornerBucketIds: [0, 0, 0, 1, 1, 1],
		sideNodeIds: [1, 2, -1, 7, 8, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[3, 6],
			[-1, -1],
			[-1, -1],
			[9, 0],
		],
		roadAnchors: [4, 5, 7, 8],
		/******* BRIDGES ***********/
		bridges: [[4, 7]],
		bridgeRiverLines: [
			[
				[-126.49604, 0.54423],
				[63.97923, 72.38062],
			].map(coord.absolute),
		],
		chitLocationBucketIds: [0, 0, 0, 1, 1, 1],
		chitLocationBuildingEligible: [false, true, false, false, true, false],
		chitLocations: [
			["absolute", 39, -260],
			["absolute", 200, -115],
			["absolute", 283, 113],
			["absolute", -17, 258],
			["absolute", -200, 115],
			["absolute", -275, -107],
		],
		homeMarkerFallbackPositions: [null, ["absolute", 283, 110], null, null, ["absolute", -275, -105], null],
	},

	{
		hexTerrainID: MOUNTAIN_RIVER_SOURCE,
		baseTerrain: TERR_MOUNTAINS,
		riverType: RIVER_SOURCE,
		hexGfx: "hex_21",
		rotatable: true,
		riverAdjacencies: [[0]],

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0],
		sideRiverVertexIds: [-1, -1, -1, -1, -1, 0],
		riverVertexDefinitions: [
			["absolute", -173, -301],
			["absolute", -125, -205],
			["absolute", -85, -140],
			["absolute", -36, -76],
			["absolute", -74, 7],
			["absolute", -112, 74],
			["absolute", -138, 157],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 0, 0, 0],
		nodeVertexDefinitions: [
			[0, 0.5, 0.3],
			[1, 0.5, 0.4],
			[2, 0.5, 0.3],
			[3, 0.5, 0.2],
			[4, 0.2, 0.3],
			[4, 0.5, 0.3],
			[5, RSA, 0.2],
			[5, 1 - RSA, 0.2],
		].map(coord.relative),
		nodeEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
			[7, 0],
		],
		cornerBucketIds: [0, 0, 0, 0, 0, 0],
		sideNodeIds: [0, 1, 2, 3, 5, -1],
		cornerNodeIds: [
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[-1, -1],
			[6, 7],
		],
		roadAnchors: [0, 1, 2, 3, 5],
		/******* BRIDGES ***********/
		bridges: [],
		bridgeRiverLines: [],
		chitLocationBucketIds: [0, 0, 0, 0, 0, 0, 0],
		chitLocationBuildingEligible: [true, true, true, true, true, false, true],
		chitLocations: [
			["absolute", 65, 58],
			["absolute", 47, -266],
			["absolute", 200, -115],
			["absolute", 200, 115],
			["absolute", 0, 230],
			["absolute", -248, 99],
			["absolute", -259, -107],
		],
		homeMarkerFallbackPositions: [null, null, null, null, null, null, null],
	},
	{
		// TODO - make this river thing work
		// River vertices and pathfinding work! :)
		// But the road building code needs to change to come with a bridge.
		// Probably need some special gfx as well
		hexTerrainID: CITY,
		baseTerrain: TERR_PASTURE,
		riverType: RIVER_CITY,
		hexGfx: "hex_22",
		rotatable: true,
		riverAdjacencies: [[0, 1]],

		riverVertexRiverIds: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		riverStoppingVertex: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
		sideRiverVertexIds: [0, 2, 4, 6, 8, 10],
		riverVertexDefinitions: [
			["absolute", 170, -298],
			["absolute", 301, -181],
			["absolute", 347, 2],
			["absolute", 307, 165],
			["absolute", 202, 297],
			["absolute", 12, 340],
			["absolute", -181, 305],
			["absolute", -278, 168],
			["absolute", -366, 2],
			["absolute", -283, -162],
			["absolute", -203, -290],
			["absolute", -12, -341],
		],
		riverVertexEdges: [
			[0, 1],
			[1, 2],
			[2, 3],
			[3, 4],
			[4, 5],
			[5, 6],
			[6, 7],
			[7, 8],
			[8, 9],
			[9, 10],
			[10, 11],
			[11, 0],
		],

		nodeBucketIds: [0, 0, 0, 0, 0, 0, 0, 0],
		nodeVertexDefinitions: [
			[0, 0.5, 0.3],
			[1, 0.5, 0.4],
			[2, 0.5, 0.3],
			[3, 0.5, 0.2],
			[4, 0.2, 0.3],
			[4, 0.5, 0.3],
			[5, RSA, 0.2],
			[5, 1 - RSA, 0.2],
		].map(coord.relative),
		nodeEdges: [
			[0, 4],
			[1, 4],
			[4, 5],
			[2, 5],
			[3, 5],
			[6, 7],
			[7, 8],
			[8, 9],
		],
		cornerBucketIds: [0, 0, 0, 0, 0, 0],
		sideNodeIds: [-1, -1, -1, -1, -1, -1],
		cornerNodeIds: [
			[3, 6],
			[3, 6],
			[3, 6],
			[3, 6],
			[3, 6],
			[3, 6],
		],
		roadAnchors: [4, 5, 7, 8],
		/******* BRIDGES ***********/
		bridges: [[4, 7]],
		bridgeRiverLines: [
			[
				[-126.49604, 0.54423],
				[63.97923, 72.38062],
			].map(coord.absolute),
		],
		chitLocationBucketIds: [0, 0, 0, 0, 0, 0],
		chitLocationBuildingEligible: [true, true, true, true, true, true],
		chitLocations: halfwayCorners,
		homeMarkerFallbackPositions: [null, null, null, null, null, null],
	},
])

export function getTransporterStats(transporter) {
	if (transporter === DONKEY) {
		return {
			maxCapacity: 2,
			maxMoves: 2,
			validMove: [MOVE_INTERNAL, MOVE_ROAD, MOVE_DONKEY],
			validDrop: [LOCATION_LAND_VERTEX],
			width: 200,
			height: 200,
		}
	} else if (transporter === WAGON) {
		return {
			maxCapacity: 3,
			maxMoves: 3,
			validMove: [MOVE_INTERNAL, MOVE_ROAD],
			validDrop: [LOCATION_LAND_VERTEX],
			width: 200,
			height: 200,
		}
	} else if (transporter === TRUCK) {
		return {
			maxCapacity: 6,
			maxMoves: 4,
			validMove: [MOVE_INTERNAL, MOVE_ROAD],
			validDrop: [LOCATION_LAND_VERTEX],
			width: 300,
			height: 200,
		}
	} else if (transporter === RAFT) {
		return {
			maxCapacity: 3,
			maxMoves: 3,
			validMove: [MOVE_WATER],
			validDrop: [LOCATION_SEA_VERTEX, LOCATION_RIVER_VERTEX, LOCATION_DOCKED],
			width: 200, //300,
			height: 123, //184.5,
		}
	} else if (transporter === ROWBOAT) {
		return {
			maxCapacity: 5,
			maxMoves: 4,
			validMove: [MOVE_WATER],
			validDrop: [LOCATION_SEA_VERTEX, LOCATION_RIVER_VERTEX, LOCATION_DOCKED],
			width: 250,
			height: 153.75,
		}
	} else if (transporter === STEAMER) {
		return {
			maxCapacity: 8,
			maxMoves: 6,
			validMove: [MOVE_WATER],
			validDrop: [LOCATION_SEA_VERTEX, LOCATION_RIVER_VERTEX, LOCATION_DOCKED],
			width: 300,
			height: 184.5,
		}
	}
	// &c
	else if (transporter === PLANE) {
		return {
			maxCapacity: 4,
			maxMoves: 99,
			width: 200,
			height: 200,
		}
	}
	return {}
}

export function terrainIsType(types) {
	return function (type) {
		return types.includes(type)
	}
}

export function terrainIsShoreForBuilding(type, isShore) {
	return isShore && type !== TERR_DESERT
}

// Define an order to display build OPTIOSN in - ie primary FIRST
export const BUILDING_OPTION_DISPLAY_ORDER = [
	// Pri
	BLDG_WOODCUTTER,
	BLDG_CLAY_PIT,
	BLDG_QUARRY,
	BLDG_OILRIG,
	BLDG_MINE,
	BLDG_ATELIER,
	// Sec
	BLDG_SAWMILL,
	BLDG_PAPERMILL,
	BLDG_STONE_FACTORY,
	BLDG_COAL_BURNER,
	BLDG_MINT,
	BLDG_STOCK_EXCHANGE,
	BLDG_WAGON_FACTORY,
	BLDG_TRUCK_FACTORY,
	BLDG_RAFT_FACTORY,
	BLDG_ROWBOAT_FACTORY,
	BLDG_STEAMER_FACTORY,
	BLDG_AEROPORT,
	BLDG_BOMB_FACTORY,
	BLDG_POWER_PLANT,
	BLDG_PEARL_FISHERY,
	// TODO: MBA's
]

// State these explicitly here for easy reference
export const BUILDINGS_WITH_MULTIPLE_MIXABLE_INPUTS = [BLDG_PAPERMILL, BLDG_COAL_BURNER]

export const BUILDING_STATS = [
	{
		building: BLDG_WOODCUTTER,
		bldg_name: "Woodcutter",
		bldg_name_summary: "Woodcutter",
		isValidTerrain: terrainIsType([TERR_WOODS]),
		cost: [RES_BOARDS],
		inputRes: [[]],
		outputRes: [RES_TRUNKS],
		makesTransporter: false,
		maxConversions: 1,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_SAWMILL,
		bldg_name: "Sawmill",
		bldg_name_summary: "Sawmill",
		isValidTerrain: terrainIsType(TERR_ANY_LAND_EXCEPT_DESERT),
		cost: [RES_BOARDS, RES_BOARDS, RES_STONE],
		inputRes: [[RES_TRUNKS]],
		outputRes: [RES_BOARDS, RES_BOARDS],
		makesTransporter: false,
		maxConversions: 3,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_PAPERMILL,
		bldg_name: "Papermill",
		bldg_name_summary: "Papermill",
		isValidTerrain: terrainIsType(TERR_ANY_LAND_EXCEPT_DESERT),
		cost: [RES_BOARDS, RES_STONE],
		inputRes: [
			[RES_BOARDS, RES_BOARDS],
			[RES_TRUNKS, RES_BOARDS],
			[RES_TRUNKS, RES_TRUNKS],
		],
		outputRes: [RES_PAPER],
		makesTransporter: false,
		maxConversions: 1,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_CLAY_PIT,
		bldg_name: "Clay Pit",
		bldg_name_summary: "Clay Pit",
		isValidTerrain: terrainIsShoreForBuilding,
		cost: [RES_BOARDS, RES_BOARDS, RES_BOARDS],
		inputRes: [[]],
		outputRes: [RES_CLAY],
		makesTransporter: false,
		maxConversions: 1,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_STONE_FACTORY,
		bldg_name: "Stone Factory",
		bldg_name_summary: "Stone Factory",
		isValidTerrain: terrainIsType(TERR_ANY_LAND_EXCEPT_DESERT),
		cost: [RES_BOARDS, RES_BOARDS],
		inputRes: [[RES_CLAY]],
		outputRes: [RES_STONE, RES_STONE],
		makesTransporter: false,
		maxConversions: 3,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_QUARRY,
		bldg_name: "Quarry",
		bldg_name_summary: "Quarry",
		isValidTerrain: terrainIsType([TERR_ROCK]),
		cost: [RES_BOARDS, RES_BOARDS],
		inputRes: [[]],
		outputRes: [RES_STONE],
		makesTransporter: false,
		maxConversions: 1,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_OILRIG,
		bldg_name: "Oil Rig",
		bldg_name_summary: "Oil Rig",
		isValidTerrain: terrainIsType([TERR_SEA]),
		cost: [RES_BOARDS, RES_BOARDS, RES_BOARDS, RES_STONE],
		inputRes: [[]],
		outputRes: [RES_FUEL],
		makesTransporter: false,
		maxConversions: 1,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: RND_OILRIG_IDX,
	},
	{
		building: BLDG_COAL_BURNER,
		bldg_name: "Coal Burner",
		bldg_name_summary: "Coal Burner",
		isValidTerrain: terrainIsType(TERR_ANY_LAND_EXCEPT_DESERT),
		cost: [RES_BOARDS, RES_BOARDS, RES_BOARDS],
		inputRes: [
			[RES_BOARDS, RES_BOARDS],
			[RES_TRUNKS, RES_BOARDS],
			[RES_TRUNKS, RES_TRUNKS],
		],
		outputRes: [RES_FUEL],
		makesTransporter: false,
		maxConversions: 6,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_MINE,
		bldg_name: "Mine",
		bldg_name_summary: "Mine",
		isValidTerrain: terrainIsType([TERR_MOUNTAINS]),
		cost: [RES_BOARDS, RES_BOARDS, RES_BOARDS, RES_STONE],
		inputRes: [[]],
		outputRes: [RES_IRON], // place holder to allow SINGLE res production
		makesTransporter: false,
		maxConversions: 1,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_MINT,
		bldg_name: "Mint",
		bldg_name_summary: "Mint",
		isValidTerrain: terrainIsType(TERR_ANY_LAND_EXCEPT_DESERT),
		cost: [RES_BOARDS, RES_BOARDS, RES_STONE],
		inputRes: [[RES_FUEL, RES_GOLD, RES_GOLD]],
		outputRes: [RES_COINS],
		makesTransporter: false,
		maxConversions: 1,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_STOCK_EXCHANGE,
		bldg_name: "Stock Exchange",
		bldg_name_summary: "Stock Exchange",
		isValidTerrain: terrainIsType(TERR_ANY_LAND_EXCEPT_DESERT),
		cost: [RES_STONE, RES_STONE, RES_STONE],
		inputRes: [[RES_PAPER, RES_COINS, RES_COINS]],
		outputRes: [RES_STOCK],
		makesTransporter: false,
		maxConversions: 6,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_WAGON_FACTORY,
		bldg_name: "Wagon Factory",
		bldg_name_summary: "Wagon Fac",
		isValidTerrain: terrainIsType(TERR_ANY_LAND_EXCEPT_DESERT),
		cost: [RES_BOARDS, RES_BOARDS, RES_STONE],
		inputRes: [[DONKEY, RES_BOARDS, RES_BOARDS]],
		outputRes: [WAGON],
		makesTransporter: true,
		maxConversions: 1,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_TRUCK_FACTORY,
		bldg_name: "Truck Factory",
		bldg_name_summary: "Truck Factory",
		isValidTerrain: terrainIsType(TERR_ANY_LAND_EXCEPT_DESERT),
		cost: [RES_BOARDS, RES_BOARDS, RES_STONE, RES_STONE],
		inputRes: [[RES_IRON, RES_FUEL]],
		outputRes: [TRUCK],
		makesTransporter: true,
		maxConversions: 1,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: RND_TRUCK_IDX,
	},
	{
		building: BLDG_RAFT_FACTORY,
		bldg_name: "Raft Factory",
		bldg_name_summary: "Raft Factory",
		isValidTerrain: terrainIsShoreForBuilding,
		cost: [RES_BOARDS, RES_STONE],
		inputRes: [[RES_TRUNKS, RES_TRUNKS]],
		outputRes: [RAFT],
		makesTransporter: true,
		maxConversions: 1,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_ROWBOAT_FACTORY,
		bldg_name: "Rowboat Factory",
		bldg_name_summary: "Rowboat Fac",
		isValidTerrain: terrainIsShoreForBuilding,
		cost: [RES_BOARDS, RES_BOARDS, RES_STONE],
		inputRes: [[RES_BOARDS, RES_BOARDS, RES_BOARDS, RES_BOARDS, RES_BOARDS]],
		outputRes: [ROWBOAT],
		makesTransporter: true,
		maxConversions: 1,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: RND_ROWBOAT_IDX,
	},
	{
		building: BLDG_STEAMER_FACTORY,
		bldg_name: "Steamer Factory",
		bldg_name_summary: "Steamer",
		isValidTerrain: terrainIsShoreForBuilding,
		cost: [RES_BOARDS, RES_BOARDS, RES_STONE, RES_STONE],
		inputRes: [[RES_FUEL, RES_FUEL, RES_IRON]],
		outputRes: [STEAMER],
		makesTransporter: true,
		maxConversions: 1,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: RND_STEAMER_IDX,
	},
	// Buildings &C
	{
		building: BLDG_AEROPORT,
		bldg_name: "Aeroport",
		bldg_name_summary: "Aeroport",
		isValidTerrain: terrainIsType(TERR_ANY_LAND_EXCEPT_DESERT),
		cost: [RES_STONE, RES_STONE],
		inputRes: [[RES_GOOSE, RES_BOARDS, RES_BOARDS]],
		outputRes: [PLANE],
		makesTransporter: true,
		maxConversions: 1,
		startingOptionRequired: SO_PLANES,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_BOMB_FACTORY,
		bldg_name: "Bomb Factory",
		bldg_name_summary: "Bomb Factory",
		isValidTerrain: terrainIsType(TERR_ANY_LAND_EXCEPT_DESERT),
		cost: [RES_BOARDS, RES_BOARDS, RES_STONE],
		inputRes: [[RES_FUEL, RES_IRON]],
		outputRes: [RES_BOMB],
		makesTransporter: false,
		maxConversions: 1,
		startingOptionRequired: SO_BOMBS,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_POWER_PLANT,
		bldg_name: "Power Plant",
		bldg_name_summary: "Power Plant",
		isValidTerrain: terrainIsType(TERR_ANY_LAND_EXCEPT_DESERT),
		cost: [RES_STONE, RES_STONE, RES_STONE],
		inputRes: [[RES_TRUNKS], [RES_BOARDS]],
		outputRes: [],
		makesTransporter: false,
		maxConversions: 1,
		startingOptionRequired: SO_ELECTRICITY,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_PEARL_FISHERY,
		bldg_name: "Pearl Fishery",
		bldg_name_summary: "Pearl Fishery",
		isValidTerrain: terrainIsType([TERR_SEA]),
		cost: [RES_BOARDS, RES_BOARDS, RES_BOARDS],
		inputRes: [[RES_STONE]],
		outputRes: [RES_PEARL],
		makesTransporter: false,
		maxConversions: 1,
		startingOptionRequired: SO_ART,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_ATELIER,
		bldg_name: "Atelier",
		bldg_name_summary: "Atelier",
		isValidTerrain: terrainIsType(TERR_ANY_LAND_EXCEPT_DESERT),
		cost: [RES_BOARDS, RES_BOARDS, RES_STONE],
		inputRes: [[]],
		outputRes: [],
		makesTransporter: true, // TODO
		maxConversions: 6,
		startingOptionRequired: SO_ART,
		requiredResearchIndex: -1,
	},
	// PSEUDO BUILDINGS
	{
		building: BLDG_PSEUDO_RESHAFT_MINE,
		bldg_name: "Reshaft Mine",
		bldg_name_summary: "Reshaft Mine",
		isValidTerrain: terrainIsType([TERR_MOUNTAINS]),
		cost: [RES_FUEL, RES_IRON],
		inputRes: [[]],
		outputRes: [],
		makesTransporter: false,
		maxConversions: 99,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_PSEUDO_ROAD,
		bldg_name: "Road",
		bldg_name_summary: "Road",
		isValidTerrain: terrainIsType(TERR_ANY_LAND),
		cost: [RES_STONE],
		inputRes: [[]],
		outputRes: [],
		makesTransporter: false,
		maxConversions: 99,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_PSEUDO_BRIDGE,
		bldg_name: "Bridge",
		bldg_name_summary: "Bridge",
		isValidTerrain: terrainIsType(TERR_ANY_LAND), // Can build wall from sea
		cost: [RES_STONE],
		inputRes: [[]],
		outputRes: [],
		makesTransporter: false,
		maxConversions: 99,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_PSEUDO_WALL,
		bldg_name: "Wall",
		bldg_name_summary: "Wall",
		isValidTerrain: terrainIsType(TERR_ANY), // Can demo wall from sea
		cost: [RES_STONE],
		inputRes: [[]],
		outputRes: [],
		makesTransporter: false,
		maxConversions: 99,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},
	{
		building: BLDG_PSEUDO_DEMOLISH_WALL,
		bldg_name: "Demolish Wall",
		bldg_name_summary: "Demolish Wall",
		isValidTerrain: terrainIsType(TERR_ANY), // this isn't used anyway
		cost: [RES_BOARDS],
		inputRes: [[]],
		outputRes: [],
		makesTransporter: false,
		maxConversions: 99,
		startingOptionRequired: SO_BASE_GAME,
		requiredResearchIndex: -1,
	},

	//export const MBA = 69
	// MBAs are ONE PER HEX TYPE. So should probably define 1 building per type
	// startingOptionRequired: SO_MANAGEMENT,
]

export function doAdminAlrt(message) {
	alert(message)
}

export function doAdminConsolLg(message) {
	//const personal = usePersonalStore()
	//if (!DEBUG_USERS.includes(personal.name)) return
	console.log(message)
}

/** CUSTOM RULES (skip 0 and 1 to avoid true/false conflicts) */
export const CR_START_2_DONKEY_3RD_ON_WONDER_BRICK_27 = 2
export const CR_START_WITH_ONE_EXTRA_STONE = 3
export const CR_START_WITH_ONE_EXTRA_BOARDS = 4
export const CR_USE_ONLY_28_NEUTRAL_BRICKS = 5
export const CR_ONLY_START_WITH_1_DONKEY = 6

/* COMMENTS ABOUT DEVELOPMENT

===
One thing to consider in the coding is applying some "loaded" status to a transporter that is static until
unloaded the following movement phase. This labeling can be important in a super rare scenario, afforded by the rules....

Basically, let's say I have 4 Donkeys and 1 Truck. I have a Donkey and a Truck on a City tile with a Truck Factory and a Sawmill.
The Sawmill has Trunks to process for sets of Boards. For some reason, the Donkey is carrying the Truck. There is Fuel and Iron on the tile to make a Truck.
In the Production phase the Donkey uses 1 Fuel and 1 Iron to produce a new Truck at the Truck Factory.
Because of the 5 Land Transporter limit, the Donkey on the tile must be put out of use.
The Truck is dropped by the vanishing Donkey, but since it was carried,
it cannot pick up the newly produced sets of Boards on the tile until the beginning of the Movement phase.
So, if Conflict arose, another player could choose to move to that City tile to steal the Boards before the Truck player operated their movement phase.
===

SOME MAY NOW BE OUT OF DATE / ALREADY CODED INTO THE GAME

Uhh. CITY tiles have a "moat", ie a river circling the tile edge.
However it is not quite "at" the tile edge, so cannot connect to a river to flow onto an adjacent tile.
Uhh, looking at modern art reimagined scenario, it would appear the rifer IS on the edge of the tile, and CAN connect to a perpendicular river on the next tile.

Needs to be bridged to get in.

There is a scenario with a city tile completely surrounded by sea tiles.
I guess in this case you can have "half" a road - there would be a bridge from the edge of the city tile over the moat, but nothing on he sea tile.



HEX STUFF

=========

Resources (Res, managers)
Transporters
Buildings
(Production, reproduction, research production, factories)
Bridges, over rivers

EDGE STORED STUFF

================

roads
power lines (Can build in sea. Only cross river with bridge)
Rails
walls
Water transporter produced on a tile and placed on an EDGE of a sea hex
Water transporters DOCKED on the edge of a sea hex (you cannot dock if the edge already contains another players wall)

*/
