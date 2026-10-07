/**
 * Static reference / constants for the ROW scaffold.
 *
 * Keep the phase numbers in sync with ROW/ROWconstants.py.
 */

export const SUPER_USERS = ["BotKickStarter", "admin"]
export const DEBUG_USERS = []
export const BOT_NAME = "RowBot"

// Player colours (index -> colour)
export const BLACK = 0
export const BLUE = 1
export const GREEN = 2
export const GREY = 3
export const RED = 4
export const YELLOW = 5

export const ALL_COLOURS = [BLACK, BLUE, GREEN, GREY, RED, YELLOW]

// Phases (mirror ROWconstants.py)
export const PHASE_SETUP = 0
export const PHASE_MAIN = 1
export const PHASE_GAME_OVER = 2
export const MAIN_PHASES = [PHASE_MAIN]
export const ALL_PHASES = [PHASE_SETUP, PHASE_MAIN, PHASE_GAME_OVER]

// History event types
export const HIST_NEW_GAME = 0
export const HIST_END_TURN = 1
export const HIST_GAME_END = 2

// Vote topics (mirror Lobby.sharedFunctions.constants)
export const DELETE_VOTE_TOPIC = "delete_game_votes"
export const STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"

export function doAdminAlrt(msg) {
	window.alert(msg)
}

export function doAdminConsolLg(msg) {
	console.log(msg)
}
