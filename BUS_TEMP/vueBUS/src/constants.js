import { usePersonalStore } from './stores/personal.js'

export const DELETE_VOTE_TOPIC = "delete_game_votes"
export const STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"

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


// History Log Vars
/********* NO PLAYER ACTIONS */
export const HIST_NEW_TURN = 0
export const HIST_GAME_END = 1
export const HIST_REWIND = 2
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


export function getColourNameFromNumber(colour) {
	const personal = usePersonalStore()
	/*if (colour === 0) return "blue";
	if (colour === 1) return "green";
	if (colour === 2) return "purple";
	if (colour === 3) return "red";
	if (colour === 4) return "yellow";*/
	if (colour === 0) return "#3474A9";
	if (colour === 1) {
		//if (personal.selectedBoard === 1) return "rgb(113,164,85)"
		if (personal.selectedBoard === 1) return "rgb(102,200,91)"
		return "#456334";
	}
	if (colour === 2) return "#AA79AE";
	if (colour === 3) return "#A12529";
	if (colour === 4) return "#C28727";
	alert("GCNFN: " + colour)
	return "none"
}