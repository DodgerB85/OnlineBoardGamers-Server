/**
 * Static reference / constants for UR: 1830 BC.
 *
 * Values mirror URR/URRconstants.py, which is sourced from the official Splotter
 * rulebook. Keep the two files in sync.
 */

export const SUPER_USERS = ["BotKickStarter", "admin"]
export const DEBUG_USERS = []
export const BOT_NAME = "UrrBot"

// Player colours used by the generic UI (index -> colour)
export const BLACK = 0
export const BLUE = 1
export const GREEN = 2
export const GREY = 3
export const RED = 4
export const YELLOW = 5
export const ALL_COLOURS = [BLACK, BLUE, GREEN, GREY, RED, YELLOW]

// --- Phases (mirror URRconstants.py) ---
export const PHASE_DIVIDING_NATIONS = 0
export const PHASE_SETTLEMENT = 1
export const PHASE_DEVELOPMENT = 2
export const PHASE_RAINY_SEASON = 3
export const PHASE_GAME_OVER = 4
export const MAIN_PHASES = [PHASE_SETTLEMENT, PHASE_DEVELOPMENT, PHASE_RAINY_SEASON]
export const ALL_PHASES = [PHASE_DIVIDING_NATIONS, PHASE_SETTLEMENT, PHASE_DEVELOPMENT, PHASE_RAINY_SEASON, PHASE_GAME_OVER]

// --- The six states ---
export const STATE_AKKAD = 0
export const STATE_BABYLON = 1
export const STATE_ELAM = 2
export const STATE_PERSIA = 3
export const STATE_SUMER = 4
export const STATE_URARTU = 5
export const STATE_NAMES = ["Akkad", "Babylon", "Elam", "Persia", "Sumer", "Urartu"]
export const STATE_COLOURS = ["grey", "blue", "green", "black", "yellow", "red"]
export const ALL_STATES = [STATE_AKKAD, STATE_BABYLON, STATE_ELAM, STATE_PERSIA, STATE_SUMER, STATE_URARTU]

// --- Land ---
export const LAND_HILLS = 0
export const LAND_FOREST = 1
export const LAND_SAVANNAH = 2
export const LAND_DESERT = 3
export const LAND_NAMES = ["Hills", "Forest", "Savannah", "Desert"]
export const LAND_COLONIZATION_PRICES = [100, 82, 71, 60]
export const LAND_CITY_COLONIZATION_PRICES = [100, 100, 82, 71]
export const ALL_LAND_TYPES = [LAND_HILLS, LAND_FOREST, LAND_SAVANNAH, LAND_DESERT]
export const LAND_FOR_STATE_TO_ACTIVATE = 6

// --- Independent nations ---
export const NATION_ASHUR = 0
export const NATION_BARAHSHUM = 1
export const NATION_CALAH = 2
export const NATION_DER = 3
export const NATION_ERIDU = 4
export const NATION_FIRST_AKKADIANS = 5
export const NATION_NAMES = ["Ashur", "Barahshum", "Calah", "Der", "Eridu", "First Akkadians"]
export const NATION_PRICES = [20, 40, 70, 110, 160, 220]
export const NATION_INCOMES = [10, 20, 25, 30, 35, 40]
export const ALL_NATIONS = [NATION_ASHUR, NATION_BARAHSHUM, NATION_CALAH, NATION_DER, NATION_ERIDU, NATION_FIRST_AKKADIANS]

// --- Eras ---
export const ERA_1 = 1
export const ERA_2 = 2
export const ERA_3 = 3
export const ERA_4 = 4
export const ERA_5_MILLENNIUM = 5
export const ALL_ERAS = [ERA_1, ERA_2, ERA_3, ERA_4, ERA_5_MILLENNIUM]
export const ERA_WATER_PER_RIVER = { 1: 6, 2: 6, 3: 6, 4: 7, 5: 8 }
export const ERA_YIELD_PER_AREA = { 1: 20, 2: 20, 3: 25, 4: 25, 5: 30 }
export const IRRIGATED_LANDOWNER_INCOME = 5
export const ERA_CARD_DATA = {
	1: { reservoir: [2, 30], pump: [1, 30], digger: ["1+1", 50] },
	2: { reservoir: [4, 80], pump: [2, 80], digger: [2, 100] },
	3: { reservoir: [6, 100], pump: [3, 100], digger: [3, 150] },
	4: { reservoir: [8, 150], pump: [4, 150], digger: [4, 200] },
	5: { reservoir: ["M", 200], pump: ["M", 200], digger: ["M", 400] },
}

// --- Starting money ---
export const STARTING_MONEY_BY_PLAYER_COUNT = { 3: 600, 4: 450, 5: 360, 6: 300 }

// --- History event types ---
export const HIST_NEW_GAME = 0
export const HIST_END_TURN = 1
export const HIST_GAME_END = 2

// --- Vote topics (mirror Lobby.sharedFunctions.constants) ---
export const DELETE_VOTE_TOPIC = "delete_game_votes"
export const STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"

export function doAdminAlrt(msg) {
	window.alert(msg)
}

export function doAdminConsolLg(msg) {
	console.log(msg)
}
