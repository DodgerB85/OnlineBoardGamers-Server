/**
 * This is a reference file to store actions/etc as constants.
 * It makes the code easier to read, and items easier to store, as they're just numbers
 *
 *
 */
//import { useModelStore } from "../stores/WEBstore.js"

export const BOT_NAME = "WebBot"
export const DELETE_VOTE_TOPIC = "delete_game_votes"
export const STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"
export const KICKOUT_VOTE_TOPIC = "kickout_player_votes"
export const KICKOUT_SOLO_DELAY_MS = 2 * 24 * 60 * 60 * 1000

/** COLOURS */
export const BLACK = 0
export const BLUE = 1
export const WHITE = 2
export const YELLOW = 3

/** PHASES */
export const PHASE_WHOLE_TURN = 0
export const PHASE_MID_ACTIONS = 1
export const PHASE_GAME_OVER = 9

/** ACTIONS */
export const ACT_NONE = -1
export const ACT_CHOOSE_INTIIAL_TILE = 0
export const ACT_CHOOSE_ACTION = 1
export const ACT_PLACE_CABLE = 2

export const ACT_CONFIRM_KICKOUT = 97
export const CONFIRM_GAME_END_EMPTY_SUPPLY = 98
export const ACT_CONFIRM_END_TURN = 99


/** HISTORY  */
export const HIST_NEW_GAME = 0
export const HIST_ADD_TILE = 1
export const HIST_ADD_CABLES = 2
export const HIST_GET_NEW_TILE = 3
export const HIST_ADD_CABLE_TO_MAP = 4

export const HIST_ENTRIES_WITH_INDEX_AS_FIRST_ENTRY = [HIST_ADD_TILE, HIST_ADD_CABLE_TO_MAP]

export const HIST_RESIGN = 7
export const HIST_KICKOUT = 8
export const HIST_REWIND = 9
export const HIST_GAME_END = 99

// Squares
export const SQ_NOTHING = -2 // Used to mark a cutout in the corner tiles
export const SQ_EMPTY = -1 // An empty square on the grid where you can place tiles.
export const SQ_ENCLOSED_EMPTY = 0 // enclosed single sq too small for any tile
export const SQ_TILE_EMPTY = 1 // Empty square on a tile
export const SQ_SERVER = 2
export const SQ_COMP_1 = 3
export const SQ_COMP_2 = 4
export const SQ_COMP_3 = 5
export const SQ_COMP_4 = 6

export const SQS_COMPS = [SQ_COMP_1, SQ_COMP_2, SQ_COMP_3, SQ_COMP_4]

// Tile Styles
export const TILE_STYLE_SQUARE = 0
export const TILE_STYLE_RECT = 1
export const TILE_STYLE_CORNER = 2

// Tile IDs
export const TILE_CENTER = 0

export const TILE_SQUARE_SINGLESERVER_2 = 1
export const TILE_SQUARE_SINGLESERVER_3 = 2
export const TILE_SQUARE_SINGLESERVER_4 = 3

export const TILE_SQUARE_LINECOMPS_2 = 4
export const TILE_SQUARE_LINECOMPS_3 = 5
export const TILE_SQUARE_LINECOMPS_4 = 6

export const TILE_SQUARE_CORNERCOMPS_2 = 7
export const TILE_SQUARE_CORNERCOMPS_3 = 8
export const TILE_SQUARE_CORNERCOMPS_4 = 9

export const TILE_SQUARE_4x1COMPS_2 = 10
export const TILE_SQUARE_4x1COMPS_3 = 11
export const TILE_SQUARE_4x1COMPS_4 = 12

export const TILE_SQUARE_3COMPS_2 = 13
export const TILE_SQUARE_3COMPS_3 = 14
export const TILE_SQUARE_3COMPS_4 = 15

export const TILE_SQUARE_4COMP_2 = 16
export const TILE_SQUARE_4COMP_3 = 17
export const TILE_SQUARE_4COMP_4 = 18

export const ALL_SQUARE_TILES = [TILE_SQUARE_SINGLESERVER_2, TILE_SQUARE_SINGLESERVER_3, TILE_SQUARE_SINGLESERVER_4, TILE_SQUARE_LINECOMPS_2, TILE_SQUARE_LINECOMPS_3, TILE_SQUARE_LINECOMPS_4, TILE_SQUARE_CORNERCOMPS_2, TILE_SQUARE_CORNERCOMPS_3, TILE_SQUARE_CORNERCOMPS_4, TILE_SQUARE_4x1COMPS_2, TILE_SQUARE_4x1COMPS_3, TILE_SQUARE_4x1COMPS_4, TILE_SQUARE_3COMPS_2, TILE_SQUARE_3COMPS_3, TILE_SQUARE_3COMPS_4, TILE_SQUARE_4COMP_2, TILE_SQUARE_4COMP_3, TILE_SQUARE_4COMP_4]

// RECTS
export const TILE_RECT_DBLCOMP1_2 = 19
export const TILE_RECT_DBLCOMP1_3 = 20
export const TILE_RECT_DBLCOMP1_4 = 21

export const TILE_RECT_DBLCOMP2_2 = 22
export const TILE_RECT_DBLCOMP2_3 = 23
export const TILE_RECT_DBLCOMP2_4 = 24

export const TILE_RECT_DBLNOTHING_2 = 25
export const TILE_RECT_DBLNOTHING_3 = 26
export const TILE_RECT_DBLNOTHING_4 = 27

export const TILE_RECT_COMP1_2 = 28
export const TILE_RECT_COMP1_3 = 29
export const TILE_RECT_COMP1_4 = 30

export const TILE_RECT_COMP2_2 = 31
export const TILE_RECT_COMP2_3 = 32
export const TILE_RECT_COMP2_4 = 33

export const TILE_RECT_SERVER_2 = 34
export const TILE_RECT_SERVER_3 = 35
export const TILE_RECT_SERVER_4 = 36

export const ALL_RECT_TILES = [TILE_RECT_DBLCOMP1_2, TILE_RECT_DBLCOMP1_3, TILE_RECT_DBLCOMP1_4, TILE_RECT_DBLCOMP2_2, TILE_RECT_DBLCOMP2_3, TILE_RECT_DBLCOMP2_4, TILE_RECT_DBLNOTHING_2, TILE_RECT_DBLNOTHING_3, TILE_RECT_DBLNOTHING_4, TILE_RECT_COMP1_2, TILE_RECT_COMP1_3, TILE_RECT_COMP1_4, TILE_RECT_COMP2_2, TILE_RECT_COMP2_3, TILE_RECT_COMP2_4, TILE_RECT_SERVER_2, TILE_RECT_SERVER_3, TILE_RECT_SERVER_4]

// CORNERS
export const TILE_CORNER_CORNERCOMPS_2 = 37
export const TILE_CORNER_CORNERCOMPS_3 = 38
export const TILE_CORNER_CORNERCOMPS_4 = 39

export const TILE_CORNER_BOTTOMLINECOMPS_2 = 40
export const TILE_CORNER_BOTTOMLINECOMPS_3 = 41
export const TILE_CORNER_BOTTOMLINECOMPS_4 = 42

export const TILE_CORNER_VERTICALLINECOMPS_2 = 43
export const TILE_CORNER_VERTICALLINECOMPS_3 = 44
export const TILE_CORNER_VERTICALLINECOMPS_4 = 45

export const TILE_CORNER_1COMPS_2 = 46
export const TILE_CORNER_1COMPS_3 = 47
export const TILE_CORNER_1COMPS_4 = 48

export const TILE_CORNER_CORNER3COMP_2 = 49
export const TILE_CORNER_CORNER3COMP_3 = 50
export const TILE_CORNER_CORNER3COMP_4 = 51

export const TILE_CORNER_UP3COMP_2 = 52
export const TILE_CORNER_UP3COMP_3 = 53
export const TILE_CORNER_UP3COMP_4 = 54

export const TILE_CORNER_RIGHT3COMP_2 = 55
export const TILE_CORNER_RIGHT3COMP_3 = 56
export const TILE_CORNER_RIGHT3COMP_4 = 57

export const TILE_CORNER_SERVER_2 = 58
export const TILE_CORNER_SERVER_3 = 59
export const TILE_CORNER_SERVER_4 = 60

export const ALL_CORNER_TILES = [TILE_CORNER_CORNERCOMPS_2, TILE_CORNER_CORNERCOMPS_3, TILE_CORNER_CORNERCOMPS_4, TILE_CORNER_BOTTOMLINECOMPS_2, TILE_CORNER_BOTTOMLINECOMPS_3, TILE_CORNER_BOTTOMLINECOMPS_4, TILE_CORNER_VERTICALLINECOMPS_2, TILE_CORNER_VERTICALLINECOMPS_3, TILE_CORNER_VERTICALLINECOMPS_4, TILE_CORNER_1COMPS_2, TILE_CORNER_1COMPS_3, TILE_CORNER_1COMPS_4, TILE_CORNER_CORNER3COMP_2, TILE_CORNER_CORNER3COMP_3, TILE_CORNER_CORNER3COMP_4, TILE_CORNER_UP3COMP_2, TILE_CORNER_UP3COMP_3, TILE_CORNER_UP3COMP_4, TILE_CORNER_RIGHT3COMP_2, TILE_CORNER_RIGHT3COMP_3, TILE_CORNER_RIGHT3COMP_4, TILE_CORNER_SERVER_2, TILE_CORNER_SERVER_3, TILE_CORNER_SERVER_4]

export const ALL_TILES = [
	{
		tileID: TILE_CENTER, // Unique to the tile and actions
		name: "Center Servers",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_00",
		model: [SQ_SERVER, SQ_SERVER, SQ_SERVER, SQ_SERVER],
		actions: 2,
	},
	// Square Single Server
	{
		tileID: TILE_SQUARE_SINGLESERVER_2,
		name: "Square Single Server 2 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_01",
		model: [ SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_SERVER],
		actions: 2,
	},
	{
		tileID: TILE_SQUARE_SINGLESERVER_3,
		name: "Square Single Server 3 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_01",
		model: [ SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_SERVER],
		actions: 3,
	},
	{
		tileID: TILE_SQUARE_SINGLESERVER_4,
		name: "Square Single Server 4 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_01",
		model: [ SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_SERVER],
		actions: 4,
	},
	// Square with 2comps in line
	{
		tileID: TILE_SQUARE_LINECOMPS_2,
		name: "Square 2 Comps in Line 2 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_02",
		model: [SQ_TILE_EMPTY, SQ_COMP_2, SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 2,
	},
	{
		tileID: TILE_SQUARE_LINECOMPS_3,
		name: "Square 2 Comps in Line 3 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_02",
		model: [SQ_TILE_EMPTY, SQ_COMP_2, SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 3,
	},
	{
		tileID: TILE_SQUARE_LINECOMPS_4,
		name: "Square 2 Comps in Line 4 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_02",
		model: [SQ_TILE_EMPTY, SQ_COMP_2, SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 4,
	},
	// Square tile 2 corner comps
	{
		tileID: TILE_SQUARE_CORNERCOMPS_2,
		name: "Square 2 Comps in Corners 2 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_03",
		model: [SQ_COMP_2, SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 2,
	},
	{
		tileID: TILE_SQUARE_CORNERCOMPS_3,
		name: "Square 2 Comps in Corners 3 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_03",
		model: [SQ_COMP_2, SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 3,
	},
	{
		tileID: TILE_SQUARE_CORNERCOMPS_4,
		name: "Square 2 Comps in Corners 4 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_03",
		model: [SQ_COMP_2, SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 4,
	},
	// Square tiles 4x1 comps
	{
		tileID: TILE_SQUARE_4x1COMPS_2,
		name: "Square 4x1 Comps 2 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_04",
		model: [SQ_COMP_1, SQ_COMP_1, SQ_COMP_1, SQ_COMP_1],
		actions: 2,
	},
	{
		tileID: TILE_SQUARE_4x1COMPS_3,
		name: "Square 4x1 Comps 3 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_04",
		model: [SQ_COMP_1, SQ_COMP_1, SQ_COMP_1, SQ_COMP_1],
		actions: 3,
	},
	{
		tileID: TILE_SQUARE_4x1COMPS_4,
		name: "Square 4x1 Comps 4 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_04",
		model: [SQ_COMP_1, SQ_COMP_1, SQ_COMP_1, SQ_COMP_1],
		actions: 4,
	},
	// Square 3 comps
	{
		tileID: TILE_SQUARE_3COMPS_2,
		name: "Square 3 Comps 2 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_05",
		model: [SQ_TILE_EMPTY, SQ_COMP_1, SQ_COMP_1, SQ_COMP_2],
		actions: 2,
	},
	{
		tileID: TILE_SQUARE_3COMPS_3,
		name: "Square 3 Comps 3 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_05",
		model: [SQ_TILE_EMPTY, SQ_COMP_1, SQ_COMP_1, SQ_COMP_2],
		actions: 3,
	},
	{
		tileID: TILE_SQUARE_3COMPS_4,
		name: "Square 3 Comps 4 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_05",
		model: [SQ_TILE_EMPTY, SQ_COMP_1, SQ_COMP_1, SQ_COMP_2],
		actions: 4,
	},
	// Square tile single comp
	{
		tileID: TILE_SQUARE_4COMP_2,
		name: "Square 4 Comp 2 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_06",
		model: [SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_COMP_4],
		actions: 2,
	},
	{
		tileID: TILE_SQUARE_4COMP_3,
		name: "Square 4 Comp 3 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_06",
		model: [SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_COMP_4],
		actions: 3,
	},
	{
		tileID: TILE_SQUARE_4COMP_4,
		name: "Square 1 Comp 4 actions",
		style: TILE_STYLE_SQUARE,
		gfx: "tile_06",
		model: [SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_COMP_4],
		actions: 4,
	},
	// Rect tile with double comp
	{
		tileID: TILE_RECT_DBLCOMP1_2,
		name: "Rectangle Dbl Comp 2 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_07",
		model: [SQ_COMP_2, SQ_COMP_2],
		actions: 2,
	},
	{
		tileID: TILE_RECT_DBLCOMP1_3,
		name: "Rectangle Dbl Comp 3 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_07",
		model: [SQ_COMP_2, SQ_COMP_2],
		actions: 3,
	},
	{
		tileID: TILE_RECT_DBLCOMP1_4,
		name: "Rectangle Dbl Comp 4 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_07",
		model: [SQ_COMP_2, SQ_COMP_2],
		actions: 4,
	},
	{
		tileID: TILE_RECT_DBLCOMP2_2,
		name: "Rectangle Dbl Comp 2 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_07",
		model: [SQ_COMP_2, SQ_COMP_2],
		actions: 2,
	},
	{
		tileID: TILE_RECT_DBLCOMP2_3,
		name: "Rectangle Dbl Comp 3 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_07",
		model: [SQ_COMP_2, SQ_COMP_2],
		actions: 3,
	},
	{
		tileID: TILE_RECT_DBLCOMP2_4,
		name: "Rectangle Dbl Comp 4 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_07",
		model: [SQ_COMP_2, SQ_COMP_2],
		actions: 4,
	},
	// Rect double nothing
	{
		tileID: TILE_RECT_DBLNOTHING_2,
		name: "Rectangle Dbl Nothing 2 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_08",
		model: [SQ_TILE_EMPTY, SQ_TILE_EMPTY],
		actions: 2,
	},
	{
		tileID: TILE_RECT_DBLNOTHING_3,
		name: "Rectangle Dbl Nothing 3 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_08",
		model: [SQ_TILE_EMPTY, SQ_TILE_EMPTY],
		actions: 2,
	},
	{
		tileID: TILE_RECT_DBLNOTHING_4,
		name: "Rectangle Dbl Nothing 4 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_08",
		model: [SQ_TILE_EMPTY, SQ_TILE_EMPTY],
		actions: 4,
	},
	// Rect Single Comp
	{
		tileID: TILE_RECT_COMP1_2,
		name: "Rectangle Single Comp 2 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_09",
		model: [SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 2,
	},
	{
		tileID: TILE_RECT_COMP1_3,
		name: "Rectangle Single Comp 3 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_09",
		model: [SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 3,
	},
	{
		tileID: TILE_RECT_COMP1_4,
		name: "Rectangle Single Comp 4 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_09",
		model: [SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 4,
	},
	{
		tileID: TILE_RECT_COMP2_2,
		name: "Rectangle Single Comp 2 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_09",
		model: [SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 2,
	},
	{
		tileID: TILE_RECT_COMP2_3,
		name: "Rectangle Single Comp 3 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_09",
		model: [SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 3,
	},
	{
		tileID: TILE_RECT_COMP2_4,
		name: "Rectangle Single Comp 4 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_09",
		model: [SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 4,
	},
	// Rect Server
	{
		tileID: TILE_RECT_SERVER_2,
		name: "Rectangle Single Server 2 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_10",
		model: [SQ_TILE_EMPTY, SQ_SERVER],
		actions: 2,
	},
	{
		tileID: TILE_RECT_SERVER_3,
		name: "Rectangle Single Server 3 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_10",
		model: [SQ_TILE_EMPTY, SQ_SERVER],
		actions: 3,
	},
	{
		tileID: TILE_RECT_SERVER_4,
		name: "Rectangle Single Server 4 actions",
		style: TILE_STYLE_RECT,
		gfx: "tile_10",
		model: [SQ_TILE_EMPTY, SQ_SERVER],
		actions: 4,
	},
	//////////////// CORNERS
	// Corner Corner Comps
	{
		tileID: TILE_CORNER_CORNERCOMPS_2,
		name: "Corner Corner Comps 2 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_11",
		model: [SQ_COMP_2, SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 2,
	},
	{
		tileID: TILE_CORNER_CORNERCOMPS_3,
		name: "Corner Corner Comps 3 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_11",
		model: [SQ_COMP_2, SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 3,
	},
	{
		tileID: TILE_CORNER_CORNERCOMPS_4,
		name: "Corner Corner Comps 4 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_11",
		model: [SQ_COMP_2, SQ_TILE_EMPTY, SQ_COMP_2],
		actions: 4,
	},
	// Corner bottom line comps
	{
		tileID: TILE_CORNER_BOTTOMLINECOMPS_2,
		name: "Corner Bottom Line Comps 2 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_12",
		model: [SQ_TILE_EMPTY, SQ_COMP_2, SQ_COMP_2],
		actions: 2,
	},
	{
		tileID: TILE_CORNER_BOTTOMLINECOMPS_3,
		name: "Corner Bottom Line Comps 3 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_12",
		model: [SQ_TILE_EMPTY, SQ_COMP_2, SQ_COMP_2],
		actions: 3,
	},
	{
		tileID: TILE_CORNER_BOTTOMLINECOMPS_4,
		name: "Corner Bottom Line Comps 4 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_12",
		model: [SQ_TILE_EMPTY, SQ_COMP_2, SQ_COMP_2],
		actions: 4,
	},
	// Corner Vertical line comps
	{
		tileID: TILE_CORNER_VERTICALLINECOMPS_2,
		name: "Corner Vertical Line Comps 2 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_13",
		model: [SQ_COMP_2, SQ_COMP_2, SQ_TILE_EMPTY],
		actions: 2,
	},
	{
		tileID: TILE_CORNER_VERTICALLINECOMPS_3,
		name: "Corner Vertical Line Comps 3 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_13",
		model: [SQ_COMP_2, SQ_COMP_2, SQ_TILE_EMPTY],
		actions: 3,
	},
	{
		tileID: TILE_CORNER_VERTICALLINECOMPS_4,
		name: "Corner Vertical Line Comps 4 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_13",
		model: [SQ_COMP_2, SQ_COMP_2, SQ_TILE_EMPTY],
		actions: 4,
	},

	// Corner 1 comps
	{
		tileID: TILE_CORNER_1COMPS_2,
		name: "Corner 1 Comps 2 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_14",
		model: [SQ_COMP_1, SQ_COMP_1, SQ_COMP_1],
		actions: 2,
	},
	{
		tileID: TILE_CORNER_1COMPS_3,
		name: "Corner 1 Comps 3 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_14",
		model: [SQ_COMP_1, SQ_COMP_1, SQ_COMP_1],
		actions: 3,
	},
	{
		tileID: TILE_CORNER_1COMPS_4,
		name: "Corner 1 Comps 4 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_14",
		model: [SQ_COMP_1, SQ_COMP_1, SQ_COMP_1],
		actions: 4,
	},
	// Corner corner 4 comps
	{
		tileID: TILE_CORNER_CORNER3COMP_2,
		name: "Corner Corner 3 comp 2 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_15",
		model: [SQ_TILE_EMPTY, SQ_COMP_3, SQ_TILE_EMPTY],
		actions: 2,
	},
	{
		tileID: TILE_CORNER_CORNER3COMP_3,
		name: "Corner Corner 3 comp 3 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_15",
		model: [SQ_TILE_EMPTY, SQ_COMP_3, SQ_TILE_EMPTY],
		actions: 3,
	},
	{
		tileID: TILE_CORNER_CORNER3COMP_4,
		name: "Corner Corner 3 comp 4 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_15",
		model: [SQ_TILE_EMPTY, SQ_COMP_3, SQ_TILE_EMPTY],
		actions: 4,
	},
	// Corner Up 3 comp
	{
		tileID: TILE_CORNER_UP3COMP_2,
		name: "Corner Up 3 comp 2 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_16",
		model: [SQ_COMP_3, SQ_TILE_EMPTY, SQ_TILE_EMPTY],
		actions: 2,
	},
	{
		tileID: TILE_CORNER_UP3COMP_3,
		name: "Corner Up 3 comp 3 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_16",
		model: [SQ_COMP_3, SQ_TILE_EMPTY, SQ_TILE_EMPTY],
		actions: 3,
	},
	{
		tileID: TILE_CORNER_UP3COMP_4,
		name: "Corner Up 3 comp 4 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_16",
		model: [SQ_COMP_3, SQ_TILE_EMPTY, SQ_TILE_EMPTY],
		actions: 4,
	},
	// Corner right 3 comp
	{
		tileID: TILE_CORNER_RIGHT3COMP_2,
		name: "Corner Right 3 comp 2 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_17",
		model: [SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_COMP_3],
		actions: 2,
	},
	{
		tileID: TILE_CORNER_RIGHT3COMP_3,
		name: "Corner Right 3 comp 3 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_17",
		model: [SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_COMP_3],
		actions: 3,
	},
	{
		tileID: TILE_CORNER_RIGHT3COMP_4,
		name: "Corner Right 3 comp 4 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_17",
		model: [SQ_TILE_EMPTY, SQ_TILE_EMPTY, SQ_COMP_3],
		actions: 4,
	},
	// Corner server
	{
		tileID: TILE_CORNER_SERVER_2,
		name: "Corner Server 2 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_18",
		model: [ SQ_TILE_EMPTY,SQ_SERVER, SQ_TILE_EMPTY],
		actions: 2,
	},
	{
		tileID: TILE_CORNER_SERVER_3,
		name: "Corner Server 3 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_18",
		model: [ SQ_TILE_EMPTY,SQ_SERVER, SQ_TILE_EMPTY],
		actions: 3,
	},
	{
		tileID: TILE_CORNER_SERVER_4,
		name: "Corner Server 4 actions",
		style: TILE_STYLE_CORNER,
		gfx: "tile_18",
		model: [ SQ_TILE_EMPTY,SQ_SERVER, SQ_TILE_EMPTY],
		actions: 4,
	},

	///// end
]
