/**
 * This is a reference file to store actions/etc as constants.
 * It makes the code easier to read, and items easier to store, as they're just numbers
 *
 *
 */

export const BOT_NAME = "AqyBot"
export const DELETE_VOTE_TOPIC = "delete_game_votes"
export const STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"
export const KICKOUT_VOTE_TOPIC = "kickout_player_votes"
export const KICKOUT_SOLO_DELAY_MS = 2 * 24 * 60 * 60 * 1000

export const SMALL_SQ = 40

/* Ratios */
export const hexBigRatio = 1.1547
export const hexSmallRatio = 0.866

/** COLOURS */
export const BLUE = 0
export const PURPLE = 1
export const RED = 2
export const YELLOW = 3

/** PHASES */
// EXTERNAL VARS
export const PHASE_FIRST_CITY = 0 // single conf
export const PHASE_ALL_RISE = 1 // auto
export const PHASE_CITY_BUILDING = 2 // double conf
export const PHASE_TURN_ORDER = 3 // auto
export const PHASE_COUNTRYSIDE_BUILDING = 4 // double conf
export const PHASE_STORE_GOODS = 5 // single conf
export const PHASE_HARVEST = 6 // single conf
export const PHASE_EXPLORE = 7 // double conf
export const PHASE_FAMINE = 8 // single conf
export const PHASE_POLLUTION = 9 // single conf
export const PHASE_CHECK_VICTORY = 10 // auto
export const PHASE_GAME_OVER = 11

// PRE_PHASE MUST BE PHASE+10
export const PRE_PHASE_OFFSET = 10 // Used in python
export const PRE_PHASE_STORE_GOODS = 15
export const PRE_PHASE_HARVEST = 16
export const PRE_PHASE_EXPLORE = 17
export const PRE_PHASE_FAMINE = 18
export const PRE_PHASE_POLLUTION = 19
// END EXTERNAL VARS

export const PHASE_STRINGS = ["No Phase", "All Rise", "City Building", "Turn Order", "Countryside Building", "Store Goods", "Harvest", "Explore", "Famine", "Pollution", "Check Victory", "Game Over"]

export const COUNTRY_PHASES = [PHASE_FIRST_CITY, PHASE_COUNTRYSIDE_BUILDING, PHASE_HARVEST, PHASE_EXPLORE, PHASE_POLLUTION]
// This is mainly so the city knows when to display an End Turn button NB: Pollution included in city phases
export const CITY_PHASES = [PHASE_CITY_BUILDING, PHASE_STORE_GOODS, PHASE_FAMINE, PHASE_POLLUTION, PRE_PHASE_STORE_GOODS]

/** SUB PHASES */
export const SUB_PHASE_NONE = 0
export const SUB_PHASE_ADD_BUILDINGS = 1
export const SUB_PHASE_MOVE_BUILDINGS = 2
export const SUB_PHASE_CHOOSE_SAINT = 3
export const SUB_PHASE_SAINT_HOUSE = 4
export const SUB_PHASE_READD_GRAVE = 5
export const SUB_PHASE_ARRAY = ["SUB_PHASE_NONE", "SUB_PHASE_ADD_BUILDINGS", "SUB_PHASE_MOVE_BUILDINGS", "SUB_PHASE_CHOOSE_SAINT", "SUB_PHASE_SAINT_HOUSE", "SUB_PHASE_READD_GRAVE"]

/** ACTIONS CITY */
export const ACT_NONE = -1
export const ACT_MAN_BLDG = 0
export const ACT_PLACE_BUILDING = 1

export const ACT_CHOOSE_BUILDING_PAYMENT = 2
export const ACT_HOSPITAL_GRAVES = 3
export const ACT_RAZE_CATHEDRAL = 4
export const ACT_TRADE_BOARD = 5
export const ACT_READD_GRAVE = 6
export const ACT_UNMAN_BUILDING = 7
export const ACT_SETUP_PLAYER_TRADE = 8

/** ACTIONS COUNTRY */
export const ACT_PLACE_FIRST_CITY = 10
export const ACT_PLACE_COUNTRYSIDE_BLDG = 11
export const ACT_PLACE_COUNTRYSIDE_CITY = 12

export const ACT_PLACE_COUNTRYSIDE_POLLUTION = 13
export const ACT_REMOVE_COUNTRYSIDE_POLLUTION = 14

export const ACT_HARVEST = 15
export const ACT_PLACE_COUNTRYSIDE_BLDG_MINE_SELECT_TYPE = 16
export const ACT_EXPLORE = 17

/** ACTIONS GENERAL */
export const ACT_CONFIRM_END_TURN = 20
export const ACT_CONFIRM_RESIGN = 21
export const ACT_CONFIRM_KICKOUT = 22

//export const ACT_CHOOSE_SAINT = 4;

/** SUB ACTIONS */
//export const SUB_ACT_NONE = -1;

/** HISTORY */
// Non-player Actions
export const HIST_NEW_GAME = 0
export const HIST_NEW_TURN = 1

// Player Actions
export const HIST_FIRST_CITY = 10
export const HIST_CITY_BUILD = 11
export const HIST_CITY_FOUNTAINS = 12
// EXTERNAL VARS
export const HIST_CITY_PLAYER_TRADE = 13
// END EXTERNAL VARS

export const HIST_WOODCUTTER = 14
export const HIST_MINE = 15
export const HIST_FARM = 16
export const HIST_FISHERY = 17
export const HIST_INN = 18
export const HIST_NEW_CITY = 19
export const HIST_REMOVE_POLLUTION = 20

export const HIST_STORE_GOODS = 21

export const HIST_HARVEST = 22

export const HIST_EXPLORE = 23

export const HIST_FAMINE = 24

export const HIST_ADD_POLLUTIONS = 25
export const HIST_ADD_POLLUIIONS_AND_GRAVES = 26

export const HIST_MANUAL_SKIP_EXPLORE = 27
export const HIST_INVALID_PRE_EXPLORE = 28


// 25 used above

export const HIST_RESIGN = 30
export const HIST_KICKOUT = 31
export const HIST_REWIND = 32
export const HIST_GRAVE_GAME_OVER = 33
export const HIST_GAME_END = 34

// Auto-actions
export const HIST_SKIP_COUNTRY_TURN = 40
export const HIST_SKIP_STORAGE_TURN = 41
export const HIST_AUTO_HARVEST = 42
export const HIST_SKIP_EXPLORE_TURN = 43
export const HIST_SKIP_FAMINE_TURN = 44
export const HIST_SKIP_POLLUTION_TURN = 45
export const HIST_CATHEDRAL_FISH = 46
export const HIST_CITY_CATHEDRALS = 47
export const HIST_NEW_TURN_ORDER = 48
export const HIST_NEW_PHASE = 49

// Hist phase trackers
export const HIST_PHASE_CITY_BUILDING = 51
export const HIST_PHASE_NEW_TURN_ORDER = 52
export const HIST_PHASE_COUNTRYSIDE_BUILDING = 53
export const HIST_PHASE_GOODS_STORAGE = 54
export const HIST_PHASE_HARVEST = 55
export const HIST_PHASE_EXPLORE = 56
export const HIST_PHASE_FAMINE = 57
export const HIST_PHASE_POLLUTION = 58
export const HIST_FAMINE_INCREASE = 59

export const ENTRIES_TO_IGNORE = [HIST_NEW_GAME, HIST_RESIGN, HIST_KICKOUT, HIST_REWIND, HIST_NEW_PHASE]
export const HIST_CITY_ACTIONS = [HIST_CITY_PLAYER_TRADE, HIST_CITY_BUILD]
export const HIST_COUNTRY_ACTIONS = [HIST_WOODCUTTER, HIST_MINE, HIST_FARM, HIST_FISHERY, HIST_INN, HIST_NEW_CITY, HIST_REMOVE_POLLUTION, HIST_SKIP_COUNTRY_TURN]
export const HIST_STORAGE_ACTIONS = [HIST_SKIP_STORAGE_TURN, HIST_STORE_GOODS]
export const HIST_HARVEST_ACTIONS = [HIST_HARVEST, HIST_AUTO_HARVEST, HIST_CATHEDRAL_FISH]
export const HIST_EXPLORE_ACTIONS = [HIST_SKIP_EXPLORE_TURN, HIST_EXPLORE, HIST_MANUAL_SKIP_EXPLORE, HIST_INVALID_PRE_EXPLORE]
export const HIST_FAMINE_ACTIONS = [HIST_SKIP_FAMINE_TURN, HIST_FAMINE]
export const HIST_POLLUTION_ACTIONS = [HIST_SKIP_POLLUTION_TURN, HIST_ADD_POLLUTIONS, HIST_ADD_POLLUIIONS_AND_GRAVES, HIST_GRAVE_GAME_OVER]

/** POLLUTION */
export const RES_POLLUTION = -1
/** Mountain Type */
export const MOUNTAIN_NONE = -1
export const MOUNTAIN_STONE = 0
export const MOUNTAIN_GOLD = 1

/** RESOURCES */
export const RES_NONE = -1

export const RES_WOOD = 0
export const RES_STONE = 1

export const RES_GRAIN = 2
export const RES_SHEEP = 3
export const RES_OLIVES = 4
export const RES_FISH = 5

export const RES_GOLD = 6
export const RES_WINE = 7
export const RES_PEARLS = 8
export const RES_DYE = 9

export const RES_FOODS = [RES_GRAIN, RES_SHEEP, RES_OLIVES, RES_FISH]
export const RES_LUXS = [RES_GOLD, RES_WINE, RES_PEARLS, RES_DYE]

export const RES_TEXT = ["Wood", "Stone", "Grain", "Sheep", "Olives", "Fish", "Gold", "Wine", "Pearls", "Dye"]

export const RES_DATA = {
	// Woodcutters
	RES_WOOD: { id: RES_WOOD, imgName: "res_" + RES_WOOD },

	// Farms
	RES_OLIVES: { id: RES_OLIVES, imgName: "res_" + RES_OLIVES },
	RES_GRAIN: { id: RES_GRAIN, imgName: "res_" + RES_GRAIN },
	RES_WINE: { id: RES_WINE, imgName: "res_" + RES_WINE },
	RES_SHEEP: { id: RES_SHEEP, imgName: "res_" + RES_SHEEP },

	// Mines
	RES_STONE: { id: RES_STONE, imgName: "res_" + RES_STONE },
	RES_GOLD: { id: RES_GOLD, imgName: "res_" + RES_GOLD },

	// Fisheries
	RES_DYE: { id: RES_DYE, imgName: "res_" + RES_DYE },
	RES_PEARLS: { id: RES_PEARLS, imgName: "res_" + RES_PEARLS },
	RES_FISH: { id: RES_FISH, imgName: "res_" + RES_FISH },
}

/** SAINTS */
export const SAINT_NONE = -1
export const SAINT_GIORGIO = 0 // Get 1 fish if ANY player builds a cathedral this turn
export const SAINT_BARBARA = 1 // Move bldgs, graves ONLY to free spaces
export const SAINT_CHRISTOFORI = 2
export const SAINT_NICOLO = 3
export const SAINT_MARIA = 4 // All bonuses,  // need 2 VR

export const SAINT_INFO = [
	{
		id: SAINT_GIORGIO,
		name: "San Giorgio",
		bonus: "Get 1 fish per cathedral built this turn",
		VR: "Enclose another player with your ZoC",
	},
	{
		id: SAINT_BARBARA,
		name: "Santa Barbara",
		bonus: "Allows moving buildings (graves can only move to free space)",
		VR: "Build all Buildings (Ungraved)",
	},
	{
		id: SAINT_CHRISTOFORI,
		name: "San Christofori",
		bonus: "Store any amount of goods",
		VR: "At least 3 of each Food and Luxury Goods",
	},
	{
		id: SAINT_NICOLO,
		name: "San Nicolo",
		bonus: "When building a house, build.a second lower numbered house for free",
		VR: "Build all houses",
	},
	{
		id: SAINT_MARIA,
		name: "Santa Maria",
		bonus: "All Saint Bonuses",
		VR: "Any 2 Victory Requirements",
	},
]

export const TERRAIN_TYPES = [
	{
		name: "forest",
		color: "#228B22",
	},
	{
		name: "plains",
		color: "#9acd32",
	},
	{
		name: "mountains",
		//color: "#616E71",
		color: "#CF832C",
	},
	{
		name: "water",
		color: "#416bdf",
	},
	{
		name: "grass",
		//color: "#cdcd32",
		color: "#90C43D",
	},
]

export const MAP_LAYOUTS = [
	{
		players: 2,
		layout: [1, 2, 1],
		tiles: 4,
		tileOffsets: [
			[0, 0],
			[4, 5],
			[-5, 9],
			[-1, 14],
		],
		imageOffsets: [
			[-0.5, -4.5],
			[5.5, 2.5],
			[-8, 2],
			[-2, 9],
		],
	},
	{
		players: 3,
		layout: [1, 2, 3],
		tiles: 6,
		tileOffsets: [
			[0, 0],
			[4, 5],
			[-5, 9],
			[-10, 18],
			[-1, 14],
			[8, 10],
		],
		imageOffsets: [
			[-0.5, -4.5],
			[5.5, 2.5],
			[-8, 2],
			[-15.5, 8.5],
			[-2, 9],
			[11.5, 9.5],
		],
	},
	{
		players: 4,
		layout: [3, 2, 3],
		tiles: 8,
		tileOffsets: [
			[-9, 4],
			[0, 0],
			[9, -4],
			[4, 5],
			[-5, 9],
			[-10, 18],
			[-1, 14],
			[8, 10],
		],
		imageOffsets: [
			[-14, -5],
			[-0.5, -4.5],
			[13, -4],
			[5.5, 2.5],
			[-8, 2],
			[-15.5, 8.5],
			[-2, 9],
			[11.5, 9.5],
		],
	},
]

export const TERR_FOREST = 0
export const TERR_PLAINS = 1
export const TERR_MOUNTAINS = 2
export const TERR_WATER = 3
export const TERR_GRASS = 4

// prettier-ignore
const TILE_0 = {
	// THIS IS OLD TILE_0. IT BACKS ON TO OLD TILE_2
    name: "TILE_0",
	id: 0,
    img: "tile0",
    terrain: [
        0, 0, 0, 1, 1,
        2, 2, 2, 12, 2, 2,
        2, 2, 0, 1, 2, 0, 2,
        0, 0, 0, 1, 1, 0, 0, 0,
        0, 0, 1, 1, 1, 3, 3, 3, 0,
        0, 0, 1, 1, 3, 0, 0, 0,
        3, 3, 1, 1, 3, 0, 1,
        3, 1, 1, 11, 0, 0,
        3, 3, 1, 1, 0
    ]
}

const TILE_1 = {
	// THIS IS OLD TILE_2
	name: "TILE_1",
	id: 1,
	img: "tile1",
	// prettier-ignore
	terrain: [
		0, 3, 1, 1, 1, 
		3, 3, 3, 0, 0, 3, 
		3, 0, 1, 0, 10, 0, 3, 
		0, 0, 1, 1, 1, 2, 0, 0, 
		0, 1, 0, 2, 2, 2, 0, 0, 0, 
		1, 1, 12, 2, 2, 0, 0, 1, 
		0, 2, 0, 0, 1, 0, 2,
		0, 0, 0, 1, 0, 2, 
		1, 0, 1, 1, 0,
	],
}

const TILE_2 = {
	// THIS IS OLD TILE_1 backs on to old 6
	name: "TILE_2",
	id: 2,
	img: "tile2",
	// prettier-ignore
	terrain: [
			0, 0, 1, 1, 0,
			0, 0, 0, 1, 0, 0,
			0, 1, 0, 0, 1, 0, 0,
			3, 3, 3, 3, 12, 0, 3, 3,
			1, 1, 1, 0, 0, 2, 2, 0, 3,
			1, 2, 2, 2, 2, 0, 0, 3,
			0, 2, 2, 2, 0, 0, 3,
			0, 12, 1, 1, 0, 0,
			0, 1, 1, 0, 1,
		],
}

const TILE_3 = {
	// This is OLD 6
	name: "TILE_3",
	id: 3,
	img: "tile3",
	// prettier-ignore
	terrain: [
		1, 1, 1, 3, 0,
		1, 1, 1, 3, 3, 3,
		0, 0, 0, 0, 3, 0, 0,
		0, 0, 0, 10, 0, 1, 0, 2, 
		0, 0, 0, 0, 0, 1, 1, 1, 2,
		0, 3, 3, 3, 3, 0, 1, 1, 
		1, 3, 1, 1, 3, 0, 0, 
		1, 1, 0, 1, 10, 0, 
		0, 0, 0, 0, 0, 
	],
}

const TILE_4 = {
	// THIS IS old 3
	name: "TILE_4",
	id: 4,
	img: "tile4",
	// prettier-ignore
	terrain: [
			2, 2, 0, 1, 0,
			1, 2, 10, 0, 0, 0,
			1, 1, 0, 0, 1, 0, 0,
			1, 3, 3, 0, 0, 1, 0, 0,
			0, 1, 3, 1, 3, 1, 2, 2, 1,
			3, 3, 0, 0, 0, 3, 2, 0,
			1, 1, 0, 3, 0, 0, 0,
			1, 0, 10, 0, 1, 0,
			0, 0, 0, 1, 1,
		],
}

const TILE_5 = {
	name: "TILE_5",
	id: 5,
	img: "tile5",
	// prettier-ignore
	terrain: [
		1, 1, 1, 2, 1,
		3, 1, 1, 2, 2, 0,
		0, 3, 2, 2, 0, 0, 0,		
		0, 3, 0, 2, 1, 0, 0, 0, 
		0, 10, 0, 2, 2, 2, 1, 0, 3, 
		0, 0, 3, 3, 12, 2, 1, 0,
		1, 1, 0, 0, 2, 0, 0, 
		1, 1, 3, 3, 2, 0,
		1, 1, 1, 2, 1
	],
}

const TILE_6 = {
	// THIS IS OLD 4
	name: "TILE_6",
	id: 6,
	img: "tile6",
	// prettier-ignore
	terrain: [
				0, 1, 1, 0, 0,
				0, 1, 0, 2, 12, 2,
				2, 0, 0, 0, 0, 2, 0,
				0, 2, 0, 0, 0, 0, 0, 1,
				0, 0, 0, 1, 0, 3, 3, 0, 0,
				3, 0, 1, 1, 0, 0, 3, 0,
				3, 3, 0, 0, 0, 3, 0,
				0, 10, 0, 0, 2, 1,
				0, 0, 2, 2, 2,
			],
}

const TILE_7 = {
	name: "TILE_7",
	id: 7,
	img: "tile7",
	// prettier-ignore
	terrain: [
		2, 0, 0, 0, 0,
		2, 2, 2, 0, 2, 2, 
		0, 2, 12, 0, 2, 2, 2, 
		0, 2, 2, 2, 2, 2, 0, 0,
		0, 1, 2, 0, 0, 0, 0, 3, 0,
		0, 1, 3, 3, 0, 3, 3, 0, 
		1, 3, 1, 0, 0, 0, 0, 
		1, 1, 3, 1, 11, 1, 
		0, 1, 1, 1, 1, 
	],
}

export function getTileByID(id) {
	if (id === 0) return TILE_0
	if (id === 1) return TILE_1
	if (id === 2) return TILE_2
	if (id === 3) return TILE_3
	if (id === 4) return TILE_4
	if (id === 5) return TILE_5
	if (id === 6) return TILE_6
	if (id === 7) return TILE_7

	/*if (id === 8) return TILE_0
	if (id === 9) return TILE_1
	if (id === 10) return TILE_2
	if (id === 11) return TILE_3
	if (id === 12) return TILE_4
	if (id === 13) return TILE_5
	if (id === 14) return TILE_6
	if (id === 15) return TILE_7*/
	rf.doAdminAlrt(`AQYREF: TILEid: ${id} not found`)
}

export function generateMirroredTiles(tiles = []) {
	const mirroredTiles = []
	tiles.forEach((tile) => {
		const newTile = {
			name: tile.name + "M",
			id: tile.id + 10,
			img: tile.img + "M",
			terrain: [],
		}

		const swapTiles = (i, j, n) => {
			newTile.terrain[i] = tile.terrain[j + i - n]
			newTile.terrain[j + i - n] = tile.terrain[i]
		}

		let j = tile.terrain.length - 1

		for (let i = 0; i < 35; i++) {
			if (i < 5) {
				// 5 width
				swapTiles(i, j, 4)
			} else if (5 <= i && i < 11) {
				// 6
				swapTiles(i, j, 15)
			} else if (11 <= i && i < 18) {
				// 7
				swapTiles(i, j, 28)
			} else if (18 <= i && i < 26) {
				// 8
				swapTiles(i, j, 43)
			} else if (25 <= i) {
				// 9
				swapTiles(i, j, 60)
			}
		}
		mirroredTiles.push(newTile)
	})

	return mirroredTiles
}

// These are our map tiles, linked front/back as per real tiles
const MAP_TILES_BASE = [
	[TILE_0, TILE_1], // done
	[TILE_2, TILE_3], // done
	[TILE_4, TILE_5], // done
	[TILE_6, TILE_7], // done
]

const mapTiles = []

MAP_TILES_BASE.forEach((mt) => {
	const mirror = generateMirroredTiles(mt)
	//mirror.id = mt.id+10
	for (let i = 0; i < 4; i++) {
		mapTiles.push(mt)
		mapTiles.push(mirror)
	}
})

export const MAP_TILES_BASE_FLAT = [TILE_0, TILE_1, TILE_2, TILE_3, TILE_4, TILE_5, TILE_6, TILE_7]
let mirroredTiles = []
for (let i=0; i<MAP_TILES_BASE_FLAT.length; i++) {
	let tile = MAP_TILES_BASE_FLAT[i]
	const newTile = {
		name: tile.name + "M",
		id: tile.id + 10,
		img: tile.img + "M",
		terrain: [],
	}

	const swapTiles = (i, j, n) => {
		newTile.terrain[i] = tile.terrain[j + i - n]
		newTile.terrain[j + i - n] = tile.terrain[i]
	}

	let j = tile.terrain.length - 1

	for (let i = 0; i < 35; i++) {
		if (i < 5) {
			// 5 width
			swapTiles(i, j, 4)
		} else if (5 <= i && i < 11) {
			// 6
			swapTiles(i, j, 15)
		} else if (11 <= i && i < 18) {
			// 7
			swapTiles(i, j, 28)
		} else if (18 <= i && i < 26) {
			// 8
			swapTiles(i, j, 43)
		} else if (25 <= i) {
			// 9
			swapTiles(i, j, 60)
		}
	}
	mirroredTiles.push(newTile)
}

export const MAP_TILES_MIRROR_FLAT = [...mirroredTiles]

export const MAP_TILE_BAG_V2 = [
	[JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[0])), JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[1])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[0])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[1]))],
	[JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[2])), JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[3])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[2])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[3]))],
	[JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[4])), JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[5])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[4])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[5]))],
	[JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[6])), JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[7])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[6])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[7]))],
	[JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[0])), JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[1])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[0])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[1]))],
	[JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[2])), JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[3])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[2])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[3]))],
	[JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[4])), JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[5])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[4])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[5]))],
	[JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[6])), JSON.parse(JSON.stringify(MAP_TILES_BASE_FLAT[7])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[6])), JSON.parse(JSON.stringify(MAP_TILES_MIRROR_FLAT[7]))],
]

export const MAP_TILES = [...mapTiles]

/** COUNTRYSIDE BUILDINGS */
/** COUNTRYSIDE BUILDINGS */
export const COUNTRSIDE_BLDG_NONE = -1
export const COUNTRYSIDE_BLDG_CITY = 0
export const COUNTRYSIDE_BLDG_INN = 1
export const COUNTRYSIDE_BLDG_WOODCUTTER = 2
export const COUNTRYSIDE_BLDG_MINE = 3
export const COUNTRYSIDE_BLDG_FARM = 4
export const COUNTRYSIDE_BLDG_FISHERY = 5

export const COUNTRYSIDE_BLDG_NAMES = ["City", "Inn", "Woodcutter", "Mine", "Farm", "Fishery"]

/** BUILDINGS */
export const BLDG_NONE = 0
export const BLDG_THEOLOGY = 1
export const BLDG_BIOLOGY = 2
export const BLDG_UNIVERSITY = 3
export const BLDG_ALCHEMY = 4
export const BLDG_PHILOSOPHY = 5
export const BLDG_BREWERY = 6
export const BLDG_FORCED_LABOUR = 7
export const BLDG_STABLE = 8
export const BLDG_HARBOUR = 9
export const BLDG_HOSPITAL = 10

export const BLDG_EXPLORER = 11
export const BLDG_GRANARY = 12
export const BLDG_DUMP = 13
export const BLDG_CATHEDRAL = 14
export const BLDG_MARKET = 15

export const BLDG_CART = 16
export const BLDG_FOUNTAIN = 17
export const BLDG_STORAGE = 18 // This needs to be 18, with 0-17 buildings before it

export const BLDG_GRAVE_INFO = 19

export const BLDG_GRAVE = 100

export const BLDG_SINGLE_WOOD = [BLDG_STORAGE, BLDG_CART, BLDG_UNIVERSITY, BLDG_BREWERY, BLDG_HARBOUR, BLDG_EXPLORER, BLDG_GRANARY, BLDG_MARKET]
export const BLDG_SINGLE_STONE = [BLDG_THEOLOGY, BLDG_PHILOSOPHY, BLDG_FORCED_LABOUR, BLDG_DUMP, BLDG_CATHEDRAL]
export const BLDG_DOUBLE_STONE = [BLDG_BIOLOGY, BLDG_ALCHEMY]

export const SINGLE_CITY_BUILDINGS = [BLDG_THEOLOGY, BLDG_BIOLOGY, BLDG_UNIVERSITY, BLDG_ALCHEMY, BLDG_PHILOSOPHY, BLDG_BREWERY, BLDG_FORCED_LABOUR, BLDG_STABLE, BLDG_HARBOUR, BLDG_HOSPITAL, BLDG_EXPLORER, BLDG_GRANARY, BLDG_DUMP, BLDG_CATHEDRAL, BLDG_MARKET]
export const MANNABLE_BUILDINGS = [BLDG_CART, BLDG_THEOLOGY, BLDG_BIOLOGY, BLDG_UNIVERSITY, BLDG_ALCHEMY, BLDG_PHILOSOPHY, BLDG_FORCED_LABOUR, BLDG_STABLE, BLDG_HARBOUR, BLDG_EXPLORER, BLDG_DUMP, BLDG_MARKET, BLDG_HOSPITAL, BLDG_STORAGE]
export const BLDG_FACULTY = [BLDG_THEOLOGY, BLDG_BIOLOGY, BLDG_ALCHEMY, BLDG_PHILOSOPHY]
export const BLDG_COMPLEX_COST = [BLDG_FOUNTAIN, BLDG_STABLE, BLDG_HOSPITAL, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40]
export const BLDG_D_COST = [BLDG_STABLE, 27, 29, 32, 31, 34, 36, 30, 35, 38, 39, 33, 37, 40]
export const BLDG_UNIQUE = [BLDG_THEOLOGY, BLDG_BIOLOGY, BLDG_UNIVERSITY, BLDG_ALCHEMY, BLDG_PHILOSOPHY, BLDG_BREWERY, BLDG_FORCED_LABOUR, BLDG_STABLE, BLDG_HARBOUR, BLDG_HOSPITAL, BLDG_EXPLORER, BLDG_GRANARY, BLDG_DUMP, BLDG_CATHEDRAL, BLDG_MARKET, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40]
export const BLDG_ROTATABLE = [BLDG_THEOLOGY, BLDG_BIOLOGY, BLDG_ALCHEMY, BLDG_PHILOSOPHY, BLDG_BREWERY, BLDG_FORCED_LABOUR, BLDG_HARBOUR, BLDG_EXPLORER, BLDG_GRANARY, BLDG_CATHEDRAL, BLDG_HOSPITAL, BLDG_CART]

/** CITY SQUARES */
export const BLDG_NONE_SQ = 0
export const BLDG_THEOLOGY_SQ = 1
export const BLDG_BIOLOGY_SQ = 2
export const BLDG_UNIVERSITY_SQ = 3
export const BLDG_ALCHEMY_SQ = 4
export const BLDG_PHILOSOPHY_SQ = 5
export const BLDG_BREWERY_SQ = 6
export const BLDG_FORCED_LABOUR_SQ = 7
export const BLDG_STABLE_SQ = 8
export const BLDG_HARBOUR_SQ = 9
export const BLDG_HOSPITAL_SQ = 10

export const BLDG_EXPLORER_SQ = 11
export const BLDG_GRANARY_SQ = 12
export const BLDG_DUMP_SQ = 13
export const BLDG_CATHEDRAL_SQ = 14
export const BLDG_MARKET_SQ = 15

export const BLDG_CART_SQ = 16
export const BLDG_FOUNTAIN_SQ = 17
// Must be the highest building
export const BLDG_STORAGE_SQ = 18

export const BLDG_HOUSE_SQ = 20

export const BLDG_GRAVE_SQ = 100


export const BLDG_ARRAY = [
	"BLDG_NONE", // 0
	"BLDG_THEOLOGY",
	"BLDG_BIOLOGY",
	"BLDG_UNIVERSITY",
	"BLDG_ALCHEMY",
	"BLDG_PHILOSOPHY",
	"BLDG_BREWERY",
	"BLDG_FORCED_LABOUR",
	"BLDG_STABLE",
	"BLDG_HARBOUR",
	"BLDG_HOSPITAL", // 10
	"BLDG_EXPLORER",
	"BLDG_GRANARY",
	"BLDG_DUMP",
	"BLDG_CATHEDRAL",
	"BLDG_MARKET",
	"BLDG_CART",
	"BLDG_FOUNTAIN",
	"BLDG_STORAGE",
	"BLDG_GRAVE", //19
	"HOUSE",
]

// The sqaure shape that will just fit the building
export const BLDG_DATA = {
	// First path number is the offset from the top left corner to get to the first path in the shape
	BLDG_THEOLOGY: { id: BLDG_THEOLOGY, width: 3, height: 3, path: [0, 3, 2, -1, 1, -2, -3], name: "Faculty of Theology", description: "May Raze Cathedral", imgName: "b_theology", bldgModel: [1, 1, 1, 1, 1, 1, 1, 1, 0], bldgSq: BLDG_THEOLOGY_SQ, cost: [0, 1, 0], reqdSqs: 8, manIdx: [0.25, 0.25] },
	BLDG_BIOLOGY: { id: BLDG_BIOLOGY, width: 3, height: 3, path: [0, 3, 3, -2, -1, -1, -2], name: "Faculty of Biology", description: "Build 1 Free Farm per Turn", imgName: "b_biology", bldgModel: [1, 1, 1, 1, 1, 1, 0, 1, 1], bldgSq: BLDG_BIOLOGY_SQ, cost: [0, 2, 0], reqdSqs: 8, manIdx: [0.35, 0.15] },
	BLDG_UNIVERSITY: { id: BLDG_UNIVERSITY, width: 2, height: 2, path: [0, 2, 2, -2, -2], name: "University", description: "Joins adjacent Faculties (Only need to Man the Uni)", imgName: "b_university", bldgModel: [1, 1, 1, 1], bldgSq: BLDG_UNIVERSITY_SQ, cost: [1, 0, 0], reqdSqs: 4, manIdx: [0.5, 0.5] },
	BLDG_ALCHEMY: { id: BLDG_ALCHEMY, width: 3, height: 3, path: [0, 2, 1, 1, 2, -3, -3], name: "Faculty of Alchemy", description: "Clean 1 Hex and all Neighbours of Pollution", imgName: "b_alchemy", bldgModel: [1, 1, 0, 1, 1, 1, 1, 1, 1], bldgSq: BLDG_ALCHEMY_SQ, cost: [0, 2, 0], reqdSqs: 8, manIdx: [0.35, 1.1] },
	BLDG_PHILOSOPHY: { id: BLDG_PHILOSOPHY, width: 3, height: 3, path: [1, 2, 3, -3, -2, 1, -1, 2], name: "Faculty of Philosophy", description: "Ignore 'D'", imgName: "b_philosophy", bldgModel: [0, 1, 1, 1, 1, 1, 1, 1, 1], bldgSq: BLDG_PHILOSOPHY_SQ, cost: [0, 1, 0], reqdSqs: 8, manIdx: [1.85, 1.1] },
	BLDG_BREWERY: { id: BLDG_BREWERY, width: 4, height: 2, path: [0, 4, 1, -3, 1, -1, -2], name: "Brewery", description: "Allows Building Inn", imgName: "b_brewery", bldgModel: [1, 1, 1, 1, 1, 0, 0, 0], bldgSq: BLDG_BREWERY_SQ, cost: [1, 0, 0], reqdSqs: 5, manIdx: [0, 0] },
	BLDG_FORCED_LABOUR: { id: BLDG_FORCED_LABOUR, width: 4, height: 3, path: [3, 1, 2, -3, 1, -1, -2, 3, -1], name: "Forced Labour", description: "Countryside Harvests 3x, but Discards 1", imgName: "b_forcedLabour", bldgModel: [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0], bldgSq: BLDG_FORCED_LABOUR_SQ, cost: [0, 1, 0], reqdSqs: 6, manIdx: [0, 2] },
	BLDG_STABLE: { id: BLDG_STABLE, width: 2, height: 2, path: [0, 2, 2, -2, -2], name: "Stable", description: "ZoC Grows by 1 Step", imgName: "b_stable", bldgModel: [1, 1, 1, 1], bldgSq: BLDG_STABLE_SQ, cost: [0, 0, 2], reqdSqs: 4, manIdx: [0.5, 0.5] },
	BLDG_HARBOUR: { id: BLDG_HARBOUR, width: 4, height: 2, path: [0, 1, 1, 2, -1, 1, 2, -4, -2], name: "Harbour", description: "Add Water plus Coast to ZoC", imgName: "b_harbour", bldgModel: [1, 0, 0, 1, 1, 1, 1, 1], bldgSq: BLDG_HARBOUR_SQ, cost: [1, 0, 0], reqdSqs: 6, manIdx: [0, 0] },
	BLDG_EXPLORER: { id: BLDG_EXPLORER, width: 3, height: 1, path: [0, 3, 1, -3, -1], name: "Explorer", description: "Allows Sending Out Explorers", imgName: "b_explorer", bldgModel: [1, 1, 1], bldgSq: BLDG_EXPLORER_SQ, cost: [1, 0, 0], reqdSqs: 3, manIdx: [1, 0] },
	BLDG_GRANARY: { id: BLDG_GRANARY, width: 3, height: 2, path: [1, 1, 1, 1, 1, -3, -1, 1, -1], name: "Granary", description: "Prevents 3 Famine", imgName: "b_granary", bldgModel: [0, 1, 0, 1, 1, 1], bldgSq: BLDG_GRANARY_SQ, cost: [1, 0, 0], reqdSqs: 4, manIdx: [0, 0] },
	BLDG_DUMP: { id: BLDG_DUMP, width: 3, height: 3, path: [0, 3, 3, -3, -3], name: "Dump", description: "Prevents 4 Pollution; Opponents may not Pollute your ZoC", imgName: "b_dump", bldgModel: [1, 1, 1, 1, 1, 1, 1, 1, 1], bldgSq: BLDG_DUMP_SQ, cost: [0, 1, 0], reqdSqs: 9, manIdx: [1, 1] },
	BLDG_CATHEDRAL: { id: BLDG_CATHEDRAL, width: 3, height: 4, path: [1, 1, 1, 1, 1, -1, 2, -1, -2, -1, -1, 1, -1], name: "Cathedral", description: "Choose Patron Saint", imgName: "b_cathedral", bldgModel: [0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0], bldgSq: BLDG_CATHEDRAL_SQ, cost: [0, 1, 0], reqdSqs: 6, manIdx: [0, 0] },
	BLDG_HOSPITAL: { id: BLDG_HOSPITAL, width: 3, height: 2, path: [0, 3, 2, -3, -2], name: "Hospital", description: "Clear 5 Graves", imgName: "b_hospital", bldgModel: [1, 1, 1, 1, 1, 1], bldgSq: BLDG_HOSPITAL_SQ, cost: [0, 0, 1], reqdSqs: 6, manIdx: [1, 0.5] },
	BLDG_MARKET: { id: BLDG_MARKET, width: 2, height: 2, path: [0, 2, 2, -2, -2], name: "Market", description: "Trade with Players, or 2:1 with Game", imgName: "b_market", bldgModel: [1, 1, 1, 1], bldgSq: BLDG_MARKET_SQ, cost: [1, 0, 0], reqdSqs: 4, manIdx: [0.5, 0] },
	BLDG_CART: { id: BLDG_CART, width: 2, height: 2, path: [1, 1, 2, -2, -1, 1, -1], name: "Cart Shop", description: "Allows Building in Countryside", imgName: "b_cart", bldgModel: [0, 1, 1, 1], bldgSq: BLDG_CART_SQ, cost: [1, 0, 0], reqdSqs: 3, manIdx: [1, 0.2] },
	BLDG_FOUNTAIN: { id: BLDG_FOUNTAIN, width: 1, height: 1, path: [0, 1, 1, -1, -1], name: "Fountain", description: "Drops Famine Level 1 on Build. Reduces Pollution by 1", imgName: "b_fountain", bldgModel: [1], bldgSq: BLDG_FOUNTAIN_SQ, cost: [0, 0, 1], reqdSqs: 1, manIdx: [0, 0] },
	BLDG_STORAGE: { id: BLDG_STORAGE, width: 2, height: 1, path: [0, 2, 1, -2, -1], name: "Storage", description: "Store 1 Good per Square", imgName: "b_storage", bldgModel: [1, 1], bldgSq: BLDG_STORAGE_SQ, cost: [1, 0, 0], reqdSqs: 2, manIdx: [0, 0] },

	HOUSE: { id: 1, width: 1, height: 1, path: [0, 1, 1, -1, -1], name: "House", description: "Get a worker", imgName: "b_storage", bldgModel: [1], bldgSq: BLDG_HOUSE_SQ, reqdSqs: 1 },

	BLDG_GRAVE: { id: BLDG_GRAVE, width: 1, height: 1, path: [0, 1, 1, -1, -1], name: "Grave", description: "Uses up Space", imgName: "grave", bldgModel: [1], bldgSq: BLDG_GRAVE_SQ, cost: [0], reqdSqs: 1 },
}

// Obviously starts at index 0. This equals house FIVE (ie bldg 25)
/**
 * [costOfFood, costOfLax]
 */
export const HOUSE_COSTS = [
	[1, 0], // 5
	[1, 0], // 6
	[2, 0], // 7
	[1, 1], // 8
	[3, 0], // 9
	[1, 2], // 10
	[2, 1], // 11
	[4, 0], // 12
	[1, 3], // 13
	[3, 1], // 14
	[2, 2], // 15
	[4, 1], // 16
	[2, 3], // 17
	[3, 2], // 18
	[4, 2], // 19
	[3, 3], // 20
]

export const GAME_WIN_LAST_MAN_STANING = 0
export const GAME_WIN_ONLY_SAINT_WINNER = 1
export const GAME_WIN_ONLY_POLLUTION_WINNER = 2
export const GAME_WIN_TIE = 4
export const GAME_WIN_LAST_UNGRAVED = 5

export function getRotatedBuildingModel(bldgNum, rotation) {
	//originalArray, rotationAngle, width, height) {
	let bldgData = BLDG_DATA[BLDG_ARRAY[bldgNum]]
	let res = []

	let bldgModel = bldgData.bldgModel
	let width = bldgData.width
	let height = bldgData.height
	const size = width * height

	// Calculate the number of elements in each row and column
	const rowCount = height
	const columnCount = width

	// Rotate the array based on the rotation angle
	switch (rotation) {
		case 0:
			res = [...bldgModel]
			break
		case 1:
			for (let i = 0; i < columnCount; i++) {
				for (let j = rowCount - 1; j >= 0; j--) {
					res.push(bldgModel[j * columnCount + i])
				}
			}
			break
		case 2:
			for (let i = size - 1; i >= 0; i--) {
				res.push(bldgModel[i])
			}
			break
		case 3:
			for (let i = columnCount - 1; i >= 0; i--) {
				for (let j = 0; j < rowCount; j++) {
					res.push(bldgModel[j * columnCount + i])
				}
			}
			break
	}

	return res
}

export function doAdminAlrt(message) {
	alert(message)
}