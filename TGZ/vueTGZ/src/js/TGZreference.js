import i18n from "../i18n"
const t = i18n.global.t

export const DELETE_VOTE_TOPIC = "delete_game_votes"
export const STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"
export const KICKOUT_VOTE_TOPIC = "kickout_player_votes"
export const KICKOUT_SOLO_DELAY_MS = 2 * 24 * 60 * 60 * 1000

/** COLOURS */
export const BLACK = 0
export const GREEN = 1
export const RED = 2
export const WHITE = 3
export const YELLOW = 4

/** names */
export const BOT_NAME = "TgzBot"
export const SUPER_USERS = ['BotKickStarter']
export const debugUsers = ['BotKickStarter', 'admin']

export const SPLOTTER_CON_USERS = ["admin", "DodgerB", 'agundlachi', 'pgh_gamer', 'cheen']

export const SCHISM_MAKERS = ["admin", "DodgerB", "joshuastarr", "Lemem", "waymost", "timmymayes", "Ftep", "vraid"]

/**SQUARES */
export const OOB_SQ = -1
export const EMPTY_SQ = 0
export const WATER_SQ = 1
export const START_SQ = 2

export const WOOD_SQ = 3
export const CLAY_SQ = 4
export const IVORY_SQ = 5
export const DIAMOND_SQ = 6

export const WOOD_CARVER_SQ = 13
export const POTTER_SQ = 14
export const IVORY_CARVER_SQ = 15
export const DIAMOND_CUTTER_SQ = 16
export const BLACKSMITH_SQ = 17

export const SCULPTOR_SQ = 23
export const VESSEL_MAKER_SQ = 24
export const THRONE_MAKER_SQ = 25

/* 50 -- 100 == monuments, player, level */

// ???
//export const FIND_ANY_CRAFTSMAN = -9

export const PRI_CRAFFTSMAN_SQS = [WOOD_CARVER_SQ, POTTER_SQ, IVORY_CARVER_SQ, DIAMOND_CUTTER_SQ, BLACKSMITH_SQ]
export const CRAFTSMEN_SQS = [WOOD_CARVER_SQ, POTTER_SQ, IVORY_CARVER_SQ, DIAMOND_CUTTER_SQ, SCULPTOR_SQ, VESSEL_MAKER_SQ, THRONE_MAKER_SQ, BLACKSMITH_SQ]

export const RESOURCE_SQS = [WOOD_SQ, CLAY_SQ, IVORY_SQ, DIAMOND_SQ]

export const VALID_SIMBI_SQS =  CRAFTSMEN_SQS.concat(RESOURCE_SQS)

export const MAP_TILES = [
	/* 0 */[EMPTY_SQ, EMPTY_SQ, START_SQ, EMPTY_SQ, EMPTY_SQ, START_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, START_SQ, EMPTY_SQ, EMPTY_SQ, WOOD_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, CLAY_SQ, EMPTY_SQ, EMPTY_SQ, START_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, START_SQ, EMPTY_SQ, EMPTY_SQ, START_SQ, EMPTY_SQ, EMPTY_SQ],
	/* 1 */[EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WOOD_SQ, WATER_SQ, WATER_SQ, CLAY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WOOD_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ],
    /* 2 */[DIAMOND_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, CLAY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, IVORY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ],
    /* 3 */[WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, IVORY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, CLAY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, DIAMOND_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ],
    /* 4 */[WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WOOD_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, DIAMOND_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, CLAY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ],
    /* 5 */[EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, IVORY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WOOD_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WOOD_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ],
    /* 6 */[EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, EMPTY_SQ, CLAY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, DIAMOND_SQ, WOOD_SQ, WATER_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ],
    /* 7 */[EMPTY_SQ, EMPTY_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, CLAY_SQ, IVORY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, CLAY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ],
    /* 8 */[EMPTY_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, EMPTY_SQ, IVORY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, IVORY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, WOOD_SQ],
    /* 9 */[EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, CLAY_SQ, EMPTY_SQ, EMPTY_SQ, WOOD_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, CLAY_SQ],
    /* 10*/[WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, WOOD_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, IVORY_SQ, DIAMOND_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ],
    /******************* SCHISM TILES HERE  ***********/
    /* 11 */ [EMPTY_SQ, EMPTY_SQ, START_SQ, EMPTY_SQ, EMPTY_SQ, START_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, START_SQ, EMPTY_SQ, OOB_SQ, OOB_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, OOB_SQ, OOB_SQ, EMPTY_SQ, START_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, START_SQ, EMPTY_SQ, EMPTY_SQ, START_SQ, EMPTY_SQ, EMPTY_SQ],
    /* 12 */ [WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WOOD_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, CLAY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ],
    /* 13 */ [EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, DIAMOND_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, IVORY_SQ, CLAY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ],
    /* 14 */ [DIAMOND_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WOOD_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, CLAY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, IVORY_SQ],
    /* 15 */ [WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, EMPTY_SQ, WOOD_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WOOD_SQ, WOOD_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ],
    /* 16 */ [EMPTY_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, OOB_SQ, OOB_SQ, WATER_SQ, WATER_SQ, WATER_SQ, WATER_SQ, OOB_SQ, OOB_SQ, WOOD_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, OOB_SQ, OOB_SQ, CLAY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, OOB_SQ, OOB_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, OOB_SQ, OOB_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WOOD_SQ],
    /* 17 */ [WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, OOB_SQ, OOB_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, WOOD_SQ, OOB_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, IVORY_SQ, OOB_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, CLAY_SQ, OOB_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, OOB_SQ, OOB_SQ, WATER_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ, EMPTY_SQ],
];



export const OOB_TILE = new Array(36).fill(OOB_SQ);

/** PHASES */
export const PHASE_FIRST_MON = 0
export const PHASE_BID = 1
export const PHASE_BUILD = 2
export const PHASE_REVENUES = 3
export const PHASE_CHECK_END = 4
export const PHASE_GAME_OVER = 5

/** ACTIONS */
export const ACT_NONE = -1
export const ACT_FIRST_MON = 0
export const ACT_BID = 1
export const ACT_BUILD_MON = 19
export const ACT_BUILD_RES = 2
export const ACT_BUILD_CRAFTSMEN = 20
export const ACT_BUILD_PRI_CRAFTSMAN = 3
export const ACT_BUILD_SEC_CRAFTSMAN = 4
export const ACT_SET_PRICES = 5
export const ACT_RAISE_MON = 6
export const ACT_CHOOSE_god = 7
export const ACT_CHOOSE_SPEC = 8
export const ACT_USE_SPEC = 9
export const ACT_BUILD_WATER = 10
export const ACT_USE_HERD = 11
export const ACT_END_BUILD = 12

export const ACT_CONFIRM_RESIGN = 13
export const ACT_CONFIRM_KICKOUT = 14

/** CHEAT ACTIONS */
export const ACT_CHOOSE_CHEAT = 15

/** SCHISM ACTIONS */
export const ACT_CHOOSE_ANYANWU_MON = 30
export const ACT_OYA_RUITUALGOOD = 31

/**HISTORY ENTRIES */
export const HIST_NEW_GAME = 0
export const HIST_BUILD_FIRST_MON = 1
export const HIST_BID = 2
export const HIST_END_BIDS = 3
export const HIST_CHOOSE_god = 4
export const HIST_CHOOSE_SPEC = 5
export const HIST_BUILD_MON = 6
export const HIST_RAISE_MON = 7
export const HIST_BUILD_CRAFTSMAN = 8
export const HIST_SET_PRICES = 9
export const HIST_ACTIVATE_SPEC = 10
export const HIST_ADD_HERD_COWS = 11
export const HIST_BUILD_WATER = 12
export const HIST_BUILD_RESOURCE = 13
export const HIST_REVENUES = 14
export const HIST_COMPARE_MYTHOLOGIES = 15
export const HIST_NEW_TURN = 16
export const HIST_GAME_END = 17

export const HIST_REWIND = 18
export const HIST_RESIGN = 19
export const HIST_KICKOUT = 20

/** SCHISM */
export const HIST_CHOOSE_ANYANWU_MON = 30
export const HIST_BUILD_OYA_MON = 31

/** TILES  */
// Use to hold prices in array starting at 0
//export const CMEN_TILE_OFFSET = 4

export const WOOD_CARVER_TILE = 0
export const POTTER_TILE = 1
export const IVORY_CARVER_TILE = 2
export const DIAMOND_CUTTER_TILE = 3

export const SCULPTOR_TILE = 4
export const VESSEL_MAKER_TILE = 5
export const THRONE_MAKER_TILE = 6

export const WOOD_TILE = 7
export const CLAY_TILE = 8
export const IVORY_TILE = 9
export const DIAMOND_TILE = 10

export const WATER_TILE = 11

export const BLACKSMITH_TILE = 12

export const RES_TILE_TO_SQ = [WOOD_CARVER_SQ, POTTER_SQ, IVORY_CARVER_SQ, DIAMOND_CUTTER_SQ, SCULPTOR_SQ, VESSEL_MAKER_SQ, THRONE_MAKER_SQ, WOOD_SQ, CLAY_SQ, IVORY_SQ, DIAMOND_SQ, WATER_SQ, BLACKSMITH_SQ]

export const CRAFTSMEN_SCORE = [
    1, // WOOD CARVER
    1, // POTTER
    1, // IVORY_CARVER
    3, // DIAMOND CUTTER
    2, // SCULPTOR
    2, // VESSEL MAKER
    2, // THRONE MAKER

    0, // WOOD
    0, // CLAY
    0, // IVORY
    0, // DIAMOND
    0, // WATER

    1, // BLACKSMITH
]

export const MONUMENT_SCORE = [
    0, // 0
    1, // 1
    3, // 2
    7, // 3
    13, // 4
    21 // 5

]

export function resSqToTile(sq) {
    if (sq === WOOD_SQ) return WOOD_TILE
    if (sq === CLAY_SQ) return CLAY_TILE
    if (sq === IVORY_SQ) return IVORY_TILE
    if (sq === DIAMOND_SQ) return DIAMOND_TILE
    return -1
}

export const ROTATABLE_TILES = [WATER_TILE, WOOD_CARVER_TILE, POTTER_TILE, THRONE_MAKER_TILE]

export const FOUR_SIZE_TILES = [IVORY_CARVER_TILE, DIAMOND_CUTTER_TILE, SCULPTOR_TILE, VESSEL_MAKER_TILE, BLACKSMITH_TILE]

// Used in price setting
export const CRAFTSMEN_TILES = [WOOD_CARVER_TILE, POTTER_TILE, IVORY_CARVER_TILE, DIAMOND_CUTTER_TILE, SCULPTOR_TILE, VESSEL_MAKER_TILE, THRONE_MAKER_TILE, BLACKSMITH_TILE]
export const PRI_CRAFFTSMAN = [WOOD_CARVER_TILE, POTTER_TILE, IVORY_CARVER_TILE, DIAMOND_CUTTER_TILE, BLACKSMITH_TILE]
export const SEC_CRAFTSMEN = [SCULPTOR_TILE, VESSEL_MAKER_TILE, THRONE_MAKER_TILE]

// Used to display in reserve
export const ALL_TILES = [WOOD_CARVER_TILE, POTTER_TILE, IVORY_CARVER_TILE, DIAMOND_CUTTER_TILE, SCULPTOR_TILE, VESSEL_MAKER_TILE, THRONE_MAKER_TILE, WOOD_TILE, CLAY_TILE, IVORY_TILE, DIAMOND_TILE, WATER_TILE]//, BLACKSMITH_TILE]

export function getPrimaryCraftsmanSqfromSecCraftsman(secCraftsman) {
    if (secCraftsman === SCULPTOR_TILE) return WOOD_CARVER_SQ
    if (secCraftsman === VESSEL_MAKER_TILE) return POTTER_SQ
    if (secCraftsman === THRONE_MAKER_TILE) return IVORY_CARVER_SQ
}

export function getPrimaryResourceSqs(craftsman) {
    if (craftsman === WOOD_CARVER_TILE) return [WOOD_SQ]
    if (craftsman === POTTER_TILE) return [CLAY_SQ]
    if (craftsman === IVORY_CARVER_TILE) return [IVORY_SQ]
    if (craftsman === DIAMOND_CUTTER_TILE) return [DIAMOND_SQ]

    if (craftsman === SCULPTOR_TILE) return [WOOD_SQ]
    if (craftsman === VESSEL_MAKER_TILE) return [CLAY_SQ]
    if (craftsman === THRONE_MAKER_TILE) return [WOOD_SQ]

    if (craftsman === BLACKSMITH_TILE) return [WOOD_SQ, CLAY_SQ, IVORY_SQ]
}

export function getCrafsmsnTileFromCraftsmanSq(craftsmanSq) {
    if (craftsmanSq === WOOD_CARVER_SQ) return WOOD_CARVER_TILE
    if (craftsmanSq === POTTER_SQ) return POTTER_TILE
    if (craftsmanSq === IVORY_CARVER_SQ) return IVORY_CARVER_TILE
    if (craftsmanSq === DIAMOND_CUTTER_SQ) return DIAMOND_CUTTER_TILE

    if (craftsmanSq === SCULPTOR_SQ) return SCULPTOR_TILE
    if (craftsmanSq === VESSEL_MAKER_SQ) return VESSEL_MAKER_TILE
    if (craftsmanSq === THRONE_MAKER_SQ) return THRONE_MAKER_TILE

    if (craftsmanSq === BLACKSMITH_SQ) return BLACKSMITH_TILE
}

export function getRelevantCraftsmenSqsFromResourceSq(resource) {
    if (resource === WOOD_SQ) return [WOOD_CARVER_SQ, SCULPTOR_SQ, THRONE_MAKER_SQ, BLACKSMITH_SQ]
    if (resource === CLAY_SQ) return [POTTER_SQ, VESSEL_MAKER_SQ, BLACKSMITH_SQ]
    if (resource === IVORY_SQ) return [IVORY_CARVER_SQ, BLACKSMITH_SQ]
    if (resource === DIAMOND_SQ) return [DIAMOND_CUTTER_SQ]
}

/**** */

export const WOOD_CARVER_TECH_A = 0
export const WOOD_CARVER_TECH_B = 1
export const POTTER_TECH_A = 2
export const POTTER_TECH_B = 3
export const IVORY_CARVER_TECH_A = 4
export const IVORY_CARVER_TECH_B = 5
export const DIAMOND_CUTTER_TECH_A = 6
export const DIAMOND_CUTTER_TECH_B = 7
export const SCULPTOR_TECH_A = 8
export const SCULPTOR_TECH_B = 9
export const VESSEL_MAKER_TECH_A = 10
export const VESSEL_MAKER_TECH_B = 11
export const THRONE_MAKER_TECH_A = 12
export const THRONE_MAKER_TECH_B = 13

export const BLACKSMITH_TECH = 14

export const ALL_TECHS = [WOOD_CARVER_TECH_A, WOOD_CARVER_TECH_B, POTTER_TECH_A, POTTER_TECH_B, IVORY_CARVER_TECH_A, IVORY_CARVER_TECH_B, DIAMOND_CUTTER_TECH_A, DIAMOND_CUTTER_TECH_B, SCULPTOR_TECH_A, SCULPTOR_TECH_B, VESSEL_MAKER_TECH_A, VESSEL_MAKER_TECH_B, THRONE_MAKER_TECH_A, THRONE_MAKER_TECH_B, BLACKSMITH_TECH]
export const ALL_TECHS_RES = [WOOD_CARVER_TECH_A, POTTER_TECH_A, IVORY_CARVER_TECH_A, DIAMOND_CUTTER_TECH_A, SCULPTOR_TECH_A, VESSEL_MAKER_TECH_A, THRONE_MAKER_TECH_A, WOOD_CARVER_TECH_B, POTTER_TECH_B, IVORY_CARVER_TECH_B, DIAMOND_CUTTER_TECH_B, SCULPTOR_TECH_B, VESSEL_MAKER_TECH_B, THRONE_MAKER_TECH_B, BLACKSMITH_TECH]
export const ALL_TECHS_RES_DISPLAY = [[WOOD_CARVER_TECH_A, WOOD_CARVER_TECH_B], [POTTER_TECH_A, POTTER_TECH_B], [IVORY_CARVER_TECH_A, IVORY_CARVER_TECH_B], [DIAMOND_CUTTER_TECH_A, DIAMOND_CUTTER_TECH_B], [SCULPTOR_TECH_A, SCULPTOR_TECH_B], [VESSEL_MAKER_TECH_A, VESSEL_MAKER_TECH_B], [THRONE_MAKER_TECH_A, THRONE_MAKER_TECH_B]]//, [BLACKSMITH_TECH]]
// NOT A CONST. NEEDS TO BE CREATED DYNAMICALLY ON APP START/IMPORT

export const TECH_VR = [
    3, 4, // WOOD CARVER
    3, 4, // POTTER
    2, 3, // IVORY CARVER
    1, 2, // DIAMOND CUTTER
    3, 4, // SCULPTOR,
    3, 4, // VESSEL MAKER
    3, 4, // THRONE MAKER
    0, // BLACKSMITH
]


export const COW_COST_TO_BUILD_CMAN = [
    2, //2, // WOOD CARVER
    2, //2, // POTTER
    2, //2, // IVORY CARVER
    10,// 10, // DIAMOND CUTTER
    4, //4, // SCULPTOR,
    4, //4, // VESSEL MAKER
    4, //4 // THRONE MAKER

    0, // WOOD
    0, // CLAY
    0, // IVORY
    0, // DIAMOND
    0, // WATER

    2, //5, // BLACKSMITH
]

export const NO_god = -1
export const SHADIPINYI = 0 // Pos 0 bid plaque
export const ELEGUA = 1 // Up to 3 bank cows in first bid
export const DZIVA = 2 // Raise / lower prices on pickup and turn start
export const ESHU = 3 // range 6
export const GU = 4 // tech cards cost 1 VR only
export const OBATALA = 5 // place 2 mons
export const ATETE = 6 // use res 2nd time
export const TSUI_GOAB = 7 // use same good multiple times when raising
export const ANANSI = 8 // Pay only 1 cow per craftsman
export const QAMATA = 9 // Gets hub cost cows
export const ENGAI = 10 // gain 2 cattle during revenue
export const XANGO = 11 // wins ties in VR 

/** SCHISM gods */
export const AGWU_NSI = 12
export const AJA = 13
export const AJE_SHALUGA = 14
export const ALAJIRE = 15
export const ANYANWU = 16
export const EKWENSU = 17
export const OGUN = 18
export const OVIA = 19
export const OYA = 20
export const SIMBI = 21 
export const TIURAKH = 22
export const YEMOJA = 23

/*** CUSTOM gods */
export const ALA = 24
export const AJAKA = 25
export const AJE_SHALUGA_OLD = 26
export const IGWEKALA = 27
export const NYAMI_NYAMI = 28
export const OLOKUN = 29
export const ORISHA_AJE = 30



export const WATERTOLL = 99

export const EVERYTHING_gods = [SHADIPINYI, ELEGUA, DZIVA, ESHU, GU, OBATALA, ATETE, TSUI_GOAB, ANANSI, QAMATA, ENGAI, XANGO, 
    // schism
    AGWU_NSI, AJA,  AJE_SHALUGA, ALAJIRE, ANYANWU, EKWENSU, OGUN, OVIA, OYA,SIMBI, TIURAKH, YEMOJA, 
    ALA, AJAKA, AJE_SHALUGA_OLD, IGWEKALA,NYAMI_NYAMI, OLOKUN, ORISHA_AJE
 ]

export const SCHISM_gods =[AGWU_NSI,AJA,  AJE_SHALUGA, ALAJIRE, ANYANWU, EKWENSU, OGUN, OVIA, OYA, SIMBI, TIURAKH, YEMOJA]

export const gods_WITH_COWS = [QAMATA, EKWENSU, OVIA,  AJA]

export const WATERTOLLCowToll = 2

export const god_NAMES = [
    'Shadipinyi',
    'Elegua',
    'Dziva',
    'Eshu',
    'Gu',
    'Obatala',
    'Atete',
    'Tsui-Goab',
    'Anansi',
    'Qamata',
    'Engai',
    'Xango',
    // Schism
    'Agwu Nsi',//12
    'Aja', 
    'Aje Shaluga',
    'Alajire',
    'Anyanwu',
    'Ekwensu',//17
    'Ogun',
    'Ovia',
    'Oya',
    'Simbi', 
    'Tiurakh',
    'Yemoja',//23
    // Other
    'Ala', //24
    'Ajaka',
    'Aje Shaluga Old',
    'Igwekala',
    'Nyami Nyami',
    'Olokun',
    'Orisha Aje', //30
]

export const missinggod_TEXT = [
    t("reference.missingGod.0"), // Shadipinyi
    t("reference.missingGod.1"), // Elegua
    t("reference.missingGod.2"), // Dziva
    t("reference.missingGod.3"), // Eshu
    t("reference.missingGod.4"), // Gu
    t("reference.missingGod.5"), // Obatala
    t("reference.missingGod.6"), // Atete
    t("reference.missingGod.7"), // TG
    t("reference.missingGod.8"), // Anansi
    t("reference.missingGod.9"), // Qamata
    t("reference.missingGod.10"), // Engai
    t("reference.missingGod.11"), // Xango
    t("reference.missingGod.12"), // Agwu Nsi
    t("reference.missingGod.13"), // Aja
    t("reference.missingGod.14"), // Aje Shaluga
    t("reference.missingGod.15"), // Alajire
    t("reference.missingGod.16"), // Anyanwu
    t("reference.missingGod.17"), // Ekwensu
    t("reference.missingGod.18"), // Ogun
    t("reference.missingGod.19"), // Ovia
    t("reference.missingGod.20"), // Oya
    t("reference.missingGod.21"), // Simbi
    t("reference.missingGod.22"), // Tiurakh
    t("reference.missingGod.23"), // Yemoja
    t("reference.missingGod.24"), // Ala
    t("reference.missingGod.25"), // Ajaka
    t("reference.missingGod.26"), // Aje Shaluga Old
    t("reference.missingGod.27"), // Igwekala
    t("reference.missingGod.28"), // Nyami Nyami
    t("reference.missingGod.29"), // Olokun
    t("reference.missingGod.30"), // Orisha Aje
]

export const god_TEXT = [
    t("reference.godText.0"), // Shadipinyi
    t("reference.godText.1"), // Elegua
    t("reference.godText.2"), // Dziva
    t("reference.godText.3"), // Eshu
    t("reference.godText.4"), // Gu
    t("reference.godText.5"), // Obatala
    t("reference.godText.6"), // Atete
    t("reference.godText.7"), // TG
    t("reference.godText.8"), // Anansi
    t("reference.godText.9"), // Qamata
    t("reference.godText.10"), // Engai
    t("reference.godText.11"), // Xango
    t("reference.godText.12"), // Agwu Nsi
    t("reference.godText.13"), // Aja
    t("reference.godText.14"), // Aje Shaluga
    t("reference.godText.15"), // Alajire
    t("reference.godText.16"), // Anyanwu
    t("reference.godText.17"), // Ekwensu
    t("reference.godText.18"), // Ogun
    t("reference.godText.19"), // Ovia
    t("reference.godText.20"), // Oya
    t("reference.godText.21"), // Simbi
    t("reference.godText.22"), // Tiurakh
    t("reference.godText.23"), // Yemoja
    t("reference.godText.24"), // Ala
    t("reference.godText.25"), // Ajaka
    t("reference.godText.26"), // Aje Shaluga Old
    t("reference.godText.27"), // Igwekala
    t("reference.godText.28"), // Nyami-Nyami
    t("reference.godText.29"), // Olokun
    t("reference.godText.30"), // Orisha Aje
]

export const ALL_gods = [SHADIPINYI, ELEGUA, DZIVA, ESHU, GU, OBATALA, ATETE, TSUI_GOAB, ANANSI, QAMATA, ENGAI, XANGO] 

export const gods_VR = [
    // Original
    4, // SHADIPINYI
    4, // ELEGUA
    2, // DZIVA
    4, // ESHU
    4, // GU
    7, // OBATALA
    5, // ATETE
    3, // TSUI-GOAB
    5, // ANANSI
    2, // QAMATA
    5, // ENGAI
    -2, // XANGO
    // Schism
    5, // AGWU_NSI
    3, // AJA
    4, // AJE_SHALUGA
    2, // ALAJIRE
    6, // ANYANWU
    0, // EKWENSU
    3, // OGUN
    4, // OVIA
    6, // OYA  
    2, // SIMBI
    7, // TIURAKH
    4, // YEMOJA
    // Other
    -4, // ALA
    4, // AJAKA
    4, // AJE_SHALUGA_OLD
    2, // NYAMI_NYAMI
    4, // IGWEKALA
    2, // OLOKUN
    6, // ORISHA_AJE
]


export function isVRchanged(god) {
    // Original
    if (god === SHADIPINYI && gods_VR[god] !== 4) return true
    else if (god === ELEGUA && gods_VR[god] !== 4) return true
    else if (god === DZIVA && gods_VR[god] !== 2) return true
    else if (god === ESHU && gods_VR[god] !== 4) return true
    else if (god === GU && gods_VR[god] !== 4) return true
    else if (god === OBATALA && gods_VR[god] !== 7) return true
    else if (god === ATETE && gods_VR[god] !== 5) return true
    else if (god === TSUI_GOAB && gods_VR[god] !== 3) return true
    else if (god === ANANSI && gods_VR[god] !== 5) return true
    else if (god === QAMATA && gods_VR[god] !== 2) return true
    else if (god === ENGAI && gods_VR[god] !== 5) return true
    else if (god === XANGO && gods_VR[god] !== -2) return true
    // Schiscm
    else if (god === AGWU_NSI && gods_VR[god] !== 5) return true
    else if (god === AJA && gods_VR[god] !== 3) return true
    else if (god === AJE_SHALUGA && gods_VR[god] !== 4) return true
    else if (god === ALAJIRE && gods_VR[god] !== 2) return true
    else if (god === ANYANWU && gods_VR[god] !== 6) return true
    else if (god === EKWENSU && gods_VR[god] !== 0) return true
    else if (god === OGUN && gods_VR[god] !== 3) return true
    else if (god === OVIA && gods_VR[god] !== 4) return true
    else if (god === OYA && gods_VR[god] !== 6) return true
    else if (god === SIMBI && gods_VR[god] !== 2) return true
    else if (god === TIURAKH && gods_VR[god] !== 7) return true
    else if (god === YEMOJA && gods_VR[god] !== 4) return true
    // Other
    else if (god === ALA && gods_VR[god] !== -4) return true
    else if (god === AJAKA && gods_VR[god] !== 4) return true
    else if (god === AJE_SHALUGA_OLD && gods_VR[god] !== 4) return true
    else if (god === IGWEKALA && gods_VR[god] !== 4) return true
    else if (god === NYAMI_NYAMI && gods_VR[god] !== 2) return true
    else if (god === OLOKUN && gods_VR[god] !== 2) return true
    else if (god === ORISHA_AJE && gods_VR[god] !== 6) return true

    return false
}
export function isSpecVRchanged(spec) {
    if (spec === HERD && SPEC_VR[spec] !== 6) return true
    else if (spec === NOMADS && SPEC_VR[NOMADS] !== 1) return true
    else if (spec === RAIN_CEREMONY && SPEC_VR[RAIN_CEREMONY] !== 1) return true
    else if (spec === SHAMAN && SPEC_VR[SHAMAN] !== 3) return true
    else if (spec === BUILDER && SPEC_VR[BUILDER] !== 2) return true
    return false

}

export const HERD = 0 // Change 2/4/5 cows => 3/6/9 cows
export const NOMADS = 1 // allow adjacent monuments
export const RAIN_CEREMONY = 2 // place water
export const SHAMAN = 3 // place resources
export const BUILDER = 4 // 2 cow rebate when buildingCmen

export const SPEC_NAMES = [
    t("reference.specNames.herd"),
    t("reference.specNames.nomads"),
    t("reference.specNames.rainCeremony"),
    t("reference.specNames.shaman"),
    t("reference.specNames.builder"),
]

export const SPEC_TEXT = [
    t("reference.specText.0"),
    t("reference.specText.1"),
    t("reference.specText.2"),
    t("reference.specText.3"),
    t("reference.specText.4"),
]

export const ALL_SPECIALISTS = [HERD, NOMADS, RAIN_CEREMONY, SHAMAN, BUILDER]

export const SPEC_VR = [
    6, // HERD 
    1, // NOMADS
    1, // RAIN_CEREMONY
    3, // SHAMAN
    2, // BUILDER
]

export const SPEC_COST = [
    2, // HERD
    2, // NOMADS
    3,// RAIN_CEREMONY
    2, // SHAMAN
    2, // BUILDER
]


