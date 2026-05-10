import { usePersonalStore } from "../stores/BUSpersonal.js"

export const DELETE_VOTE_TOPIC = "delete_game_votes"
export const STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"

export const BOT_NAME = "BusBot"

export const paxIdx = 5

export const BLUE = 0
export const GREEN = 1
export const PURPLE = 2
export const RED = 3
export const YELLOW = 4

export const PHASE_SETUP_BLDGS = 0
export const PHASE_SETUP_LINES = 1
export const PHASE_CHOOSE_ACTIONS = 2
export const PHASE_LINE_EXPANSION = 3
export const PHASE_ADD_BUS = 4
export const PHASE_ADD_PAX = 5
export const PHASE_ADD_BLDGS = 6
export const PHASE_ALTER_TIME = 7
export const PHASE_VROM = 8
export const PHASE_CHANGE_START_PLAYER = 9
export const PHASE_GAME_END_CHECK = 10
export const PHASE_GAME_OVER = 11

export const BOARD_20A_UNOFFICIAL = 0
export const BOARD_OG = 1
export const BOARD_20A_CAPSTONE = 2
export const BOARD_PITTS = 3

// History Log Vars
/********* NO PLAYER ACTIONS */
export const HIST_NEW_TURN = 0 // [turn]
export const HIST_GAME_END = 1 // []
export const HIST_REWIND = 2 // TODO
export const HIST_RESIGN = 3
export const HIST_KICKOUT = 4

/********** SIMPLE PLAYER ACTIONS */
export const HIST_ADD_BLDG = 10
export const HIST_ADD_LINE = 11
export const HIST_CHOOSE_ACTION = 12
export const HIST_ADD_BUS = 13
export const HIST_ADD_PAX = 14
export const HIST_ALTER_TIME = 15
export const HIST_STARTING_PLAYER = 16

/*********** COMPLEX PLAYER ACTIONS */
export const HIST_VROM = 20

// PITTS vars
export const PITTS_BRIDGE_LINE_IDS = [36, 24, 40, 44, 11, 2, 47, 54, 68]

// FROM->TO
export const PITTS_ONE_WAY_JUNCTION_IDS = [[9, 17], [(17, 18)], [(19, 20)], [(20, 21)], [(21, 12)], [(13, 12)], [(12, 10)], [(10, 20)], [(10, 9)]]

export function getColourNameFromNumber(colour) {
	const personal = usePersonalStore()
	/*if (colour === 0) return "blue";
	if (colour === 1) return "green";
	if (colour === 2) return "purple";
	if (colour === 3) return "red";
	if (colour === 4) return "yellow";*/
	if (colour === 0) return "#0C64AE"
	if (colour === 1) {
		//if (personal.selectedBoard === BOARD_OG) return "rgb(113,164,85)"
		if (personal.selectedBoard === BOARD_OG) return "rgb(102,200,91)"
		return "#0E7964"
	}
	if (colour === 2) return "#6E365E"
	if (colour === 3) return "#EB2E0F"
	if (colour === 4) return "#FB9907"
	alert("GCNFN: " + colour)
	return "none"
}

// This has available junction spots
// The format is [spot1, (2nd spot1), spot2, spot3, spot4, pax]
export const initialJunctionsStateArray = [
	[-1, -1, -1, -1, 0, 0],
	[-1, -1, -1, -1, 0, 0],
	[-1, -1, 0, 0, -1, 0],
	[-1, -1, -1, -1, 0, 0],
	[-1, -1, 0, -1, -1, 0],
	[-1, -1, -1, -1, 0, 0],
	[-1, -1, -1, -1, 0, 0],
	[-1, -1, 0, 0, -1, 0],
	[-1, -1, 0, -1, -1, 0],
	[-1, 0, -1, 0, -1, 0],
	[-1, -1, -1, -1, -1, 0],
	[-1, -1, -1, -1, 0, 0],
	[-1, -1, 0, -1, -1, 0],
	[-1, -1, 0, -1, -1, 0],
	[0, 0, -1, -1, -1, 1],
	[0, 0, -1, -1, -1, 1],
	[-1, 0, -1, 0, -1, 0],
	[-1, -1, -1, -1, 0, 0],
	[-1, -1, -1, -1, 0, 0],
	[-1, 0, -1, 0, -1, 0],
	[0, 0, -1, -1, -1, 1],
	[0, 0, -1, -1, -1, 1],
	[-1, -1, 0, 0, -1, 0],
	[-1, -1, -1, -1, 0, 0],
	[-1, -1, -1, -1, 0, 0],
	[-1, -1, -1, -1, -1, 0],
	[-1, 0, -1, 0, -1, 0],
	[-1, -1, 0, 0, -1, 0],
	[-1, -1, 0, -1, -1, 0],
	[-1, -1, 0, -1, -1, 0],
	[-1, -1, -1, -1, 0, 0],
	[-1, -1, 0, 0, -1, 0],
	[-1, -1, -1, -1, 0, 0],
	[-1, -1, -1, -1, 0, 0],
	[-1, -1, -1, -1, 0, 0],
	[-1, -1, -1, -1, 0, 0],
]
