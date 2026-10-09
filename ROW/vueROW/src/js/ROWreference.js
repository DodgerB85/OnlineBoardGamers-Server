/**
 * ROW reference file: all constants live here, matching the other games.
 *
 * The engine enums (ActionType, CattleType, City, Unlockable, ...) are defined
 * in ROWcore.js and re-exported here so components/modules have a single
 * constants import point (`import * as rf from "./ROWreference"`).
 */

export {
	ActionType,
	CattleType,
	CATTLE_DEFAULT_VALUE,
	Worker,
	HazardType,
	Hand,
	Teepee,
	City,
	DiscColor,
	Unlockable,
	UNLOCKABLE_INFO,
	ScoreCategory,
	Edition,
	Status,
	Mode,
	BuildingsOption,
	PlayerOrderOption,
	Variant,
	Task,
	ROWError,
} from "./ROWcore"

// ---------------------------------------------------------------------------
// Users / bots / votes (mirror the other games)
// ---------------------------------------------------------------------------
export const BOT_NAME = "RowBot"
export const SUPER_USERS = ["BotKickStarter"]
export const DEBUG_USERS = ["admin", "BotKickStarter"]

export const DELETE_VOTE_TOPIC = "delete_game_votes"
export const STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"
export const REWIND_CONSENT_VOTE_TOPIC = "rewind_consent_votes"
export const KICKOUT_VOTE_TOPIC = "kickout_player_votes"
export const KICKOUT_SOLO_DELAY_MS = 2 * 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Seats / colours
// ---------------------------------------------------------------------------
export const COLOURS = ["RED", "BLUE", "YELLOW", "GREEN"]
export const P_COLOURS = COLOURS
export const MAX_PLAYERS = 4
export const MIN_PLAYERS = 2

// ---------------------------------------------------------------------------
// Phases (mirror ROW/ROWconstants.py)
// ---------------------------------------------------------------------------
export const PHASE_SETUP = 0
export const PHASE_MAIN = 1
export const PHASE_GAME_OVER = 2
export const MAIN_PHASES = [PHASE_MAIN]
export const ALL_PHASES = [PHASE_SETUP, PHASE_MAIN, PHASE_GAME_OVER]

// ---------------------------------------------------------------------------
// Starting options (mirror Lobby.sharedFunctions.constants + ROWconstants.py)
// ---------------------------------------------------------------------------
export const SO_BASE_GAME = -1
export const SO_SECOND_EDITION = 2
export const SO_RTTN = 3
export const SO_SIMMENTAL = 4
export const SO_TRAINING_GAME = 102
export const SO_LEARNING_GAME = 110
export const SO_EXPERIENCED_GAME = 120

// ---------------------------------------------------------------------------
// Board geometry
// ---------------------------------------------------------------------------
export const BOARD_WIDTH = 800
export const BOARD_HEIGHT = 800
export const RTTN_SHIFT = 195

// Turn number stored/sent to OBG (ROW keeps a simple running counter).
export const DEFAULT_ZOOM = 16
export const MIN_ZOOM = 8
export const MAX_ZOOM = 28
