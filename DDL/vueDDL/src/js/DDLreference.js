/**
 * Static reference data for Duck Dealer.
 *
 * Board coordinates are in the 1800 x 1200 space of the redesigned board;
 * the board image is drawn with the same viewBox, so everything lines up.
 *
 * Goods ids are stable and must not be reordered: they are saved in gameData.
 */

import i18n from "../i18n.js"

const t = i18n.global.t

export const SUPER_USERS = ["BotKickStarter", "admin"]
export const DEBUG_USERS = []
export const BOT_NAME = "DdlBot"

// Player colours (index -> colour)
export const BLACK = 0
export const BLUE = 1
export const GREEN = 2
export const GREY = 3
export const RED = 4
export const YELLOW = 5

export const ALL_COLOURS = [BLACK, BLUE, GREEN, GREY, RED, YELLOW]

export const COLOUR_HEX = ["#333333", "#334CCC", "#4C9726", "#7F7F7F", "#CC3333", "#CCBF33"]

// Phases (mirror DDLconstants.py)
export const PHASE_SETUP = 0
export const PHASE_MAIN = 1
export const PHASE_GAME_OVER = 2
export const MAIN_PHASES = [PHASE_SETUP, PHASE_MAIN]
export const ALL_PHASES = [PHASE_SETUP, PHASE_MAIN, PHASE_GAME_OVER]

// Starting options (mirror DDLconstants.py)
export const SO_AUCTION = 1

// Turn states, local only (not saved in gameflow.phase)
export const TURN_SETUP_AUCTION = "AUCTION"
export const TURN_SETUP_TIEBREAK = "TIEBREAK"
export const TURN_SETUP_GEAR = "SETUP_GEAR"
export const TURN_SETUP_PLANET = "SETUP_PLANET"
export const TURN_CHOOSE = "CHOOSE"
export const TURN_ACTION = "ACTION"
export const TURN_GAME_OVER = "GAME_OVER"

// Action sub-states
export const ACT_NONE = 0
export const ACT_PLACE_HIGHWAYS = 1
export const ACT_MOVE = 2
export const ACT_BUILD = 3
export const ACT_TRADE = 4
export const ACT_PATHWAY = 5
export const ACT_EXPLORE = 6
export const ACT_TRADE_OFFER = 7

// History event types
export const HIST_NEW_GAME = 0
export const HIST_ENERGY = 1
export const HIST_ACTION_START = 2
export const HIST_HIGHWAY = 3
export const HIST_MOVE = 4
export const HIST_BUILD = 5
export const HIST_TRADE = 6
export const HIST_PATHWAY = 7
export const HIST_TRADE_OFFER = 8
export const HIST_END_TURN = 9
export const HIST_GAME_END = 10
export const HIST_AUCTION = 11

// Vote topics (mirror Lobby.sharedFunctions.constants)
export const DELETE_VOTE_TOPIC = "delete_game_votes"
export const STATS_EXCLUDE_VOTE_TOPIC = "stats_exclude_votes"

// Energy
export const RED_ENERGY = 0
export const YELLOW_ENERGY = 1
export const BLUE_ENERGY = 2
export const ENERGY_NAMES = ["Movement", "Build", "Trade"]
export const ENERGY_COLOURS = ["red", "gold", "blue"]
export const ENERGY_HEX = ["#d33a3a", "#e0b528", "#2f6fd0"]
export const ENERGY_STOCK_PER_COLOUR = 40

// Goods ------------------------------------------------------------------
// 0-4 primary, 5-9 intermediate, 10-12 ten-point final, 13-16 thirty-point final.
export const GOODS = [
	{ id: 0, key: "duck", name: "Yellow Duck", img: "duck.png", tier: 0 },
	{ id: 1, key: "beads", name: "Plastic Beads", img: "beads.png", tier: 0 },
	{ id: 2, key: "paint", name: "Blue Paint", img: "paint.png", tier: 0 },
	{ id: 3, key: "phone", name: "Phone Box", img: "phone.png", tier: 0 },
	{ id: 4, key: "tower", name: "Solar Panels", img: "tower.png", tier: 0 },
	{ id: 5, key: "radio", name: "Modern Radio", img: "radio.png", tier: 1 },
	{ id: 6, key: "stealthduck", name: "Stealth Duck", img: "stealthduck.png", tier: 1 },
	{ id: 7, key: "accelerator", name: "Linear Accelerator", img: "accelerator.png", tier: 1 },
	{ id: 8, key: "pills", name: "Diet Pills", img: "pills.png", tier: 1 },
	{ id: 9, key: "satellite", name: "Satellite", img: "satellite.png", tier: 1 },
	{ id: 10, key: "art", name: "Modern Art", img: "art.png", tier: 2, value: 10 },
	{ id: 11, key: "science", name: "Science", img: "science.png", tier: 2, value: 10 },
	{ id: 12, key: "coins", name: "Economics", img: "coins.png", tier: 2, value: 10 },
	{ id: 13, key: "religion", name: "Religion", img: "religion.png", tier: 3, value: 30 },
	{ id: 14, key: "politics", name: "Politics", img: "politics.png", tier: 3, value: 30 },
	{ id: 15, key: "medicine", name: "Medicine", img: "medicine.png", tier: 3, value: 30 },
	{ id: 16, key: "military", name: "Military", img: "military.png", tier: 3, value: 30 },
]

export const PRIMARY_GOODS = GOODS.filter((g) => g.tier === 0).map((g) => g.id)
export const INTERMEDIATE_GOODS = GOODS.filter((g) => g.tier === 1).map((g) => g.id)
export const FINAL_GOODS = GOODS.filter((g) => g.tier >= 2)
export const GOODS_BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g]))

export function goodName(id) {
	return GOODS_BY_ID[id] ? t("goods." + GOODS_BY_ID[id].key) : "?"
}

export function goodValue(id) {
	const g = GOODS_BY_ID[id]
	return g && g.value ? g.value : 0
}

// Factories ---------------------------------------------------------------
// tier 1 = intermediate factory, tier 2 = 10-point final, tier 3 = 30-point final.
export const FACTORY_TYPES = [
	{ id: 0, key: "radio", tier: 1, input: [4, 0], output: 5, points: 10, copies: 2 },
	{ id: 1, key: "stealthduck", tier: 1, input: [2, 0], output: 6, points: 10, copies: 2 },
	{ id: 2, key: "accelerator", tier: 1, input: [1, 2], output: 7, points: 10, copies: 2 },
	{ id: 3, key: "pills", tier: 1, input: [1, 3], output: 8, points: 10, copies: 2 },
	{ id: 4, key: "satellite", tier: 1, input: [4, 3], output: 9, points: 10, copies: 2 },
	{ id: 5, key: "art", tier: 2, input: [9, 2], output: 10, points: 25, copies: 2 },
	{ id: 6, key: "science", tier: 2, input: [7, 0], output: 11, points: 25, copies: 2 },
	{ id: 7, key: "coins", tier: 2, input: [8, 5], output: 12, points: 25, copies: 2 },
	{ id: 8, key: "religion", tier: 3, input: [6, 5], output: 13, points: 50, copies: 2 },
	{ id: 9, key: "politics", tier: 3, input: [9, 5], output: 14, points: 50, copies: 2 },
	{ id: 10, key: "medicine", tier: 3, input: [7, 8], output: 15, points: 50, copies: 2 },
	{ id: 11, key: "military", tier: 3, input: [7, 9], output: 16, points: 50, copies: 2 },
]

export const FACTORIES_BY_ID = Object.fromEntries(FACTORY_TYPES.map((f) => [f.id, f]))

export function factoryName(id) {
	const f = FACTORIES_BY_ID[id]
	return f ? `${goodName(f.input[0])} + ${goodName(f.input[1])} \u2192 ${goodName(f.output)}` : "?"
}

export function factoryPoints(id) {
	const f = FACTORIES_BY_ID[id]
	return f ? f.points : 0
}

// Consumers ---------------------------------------------------------------
// One consumer tile per non-primary good. Building costs the demanded good plus
// any other different good; selling costs the demanded good again.
export const CONSUMER_TILES = GOODS.filter((g) => g.tier >= 1).map((g) => ({
	id: g.id,
	good: g.id,
	points: g.tier === 1 ? 3 : g.value,
}))

// The two columns on the board, top to bottom. The value is fixed by the board;
// the specific tiles are dealt into the matching slots at setup.
export const CONSUMER_COLUMNS = [
	[3, 3, 3, 10, 30, 30],
	[3, 3, 10, 10, 30, 30],
]

export const CONSUMER_SLOT_POSITIONS = [
	[
		[1555, 58],
		[1555, 123],
		[1555, 188],
		[1555, 253],
		[1555, 318],
		[1555, 383],
	],
	[
		[1665, 58],
		[1665, 123],
		[1665, 188],
		[1665, 253],
		[1665, 318],
		[1665, 383],
	],
]

// Spaceyards --------------------------------------------------------------
// costs are [printedGood, "R"]; R = any other different good.
export const SPACEYARD_TYPES = [
	{ id: 0, key: "navigator", gear: "navigator", cost: [0, "R"], points: 10 },
	{ id: 1, key: "builder", gear: "builder", cost: [2, "R"], points: 10 },
	{ id: 2, key: "merchant", gear: "merchant", cost: [1, "R"], points: 10 },
	{ id: 3, key: "cargo-tower", gear: "cargo", cost: [4, "R"], points: 10 },
	{ id: 4, key: "cargo-paint", gear: "cargo", cost: [2, "R"], points: 10 },
]

export const GEAR_TYPES = [
	{ key: "cargo", name: "Cargo Hold", colour: "black" },
	{ key: "navigator", name: "Navigator", colour: "red" },
	{ key: "builder", name: "Builder", colour: "gold" },
	{ key: "merchant", name: "Merchant", colour: "blue" },
]

export const GEAR_BY_KEY = Object.fromEntries(GEAR_TYPES.map((g) => [g.key, g]))

export function gearName(key) {
	return GEAR_BY_KEY[key] ? t("gear." + key) : "?"
}

export function gearEnergyColour(key) {
	if (key === "navigator") return RED_ENERGY
	if (key === "builder") return YELLOW_ENERGY
	if (key === "merchant") return BLUE_ENERGY
	return -1
}

// Ship slots: 8 buildable slots, in build order 8,8,8,5,5,5,2,2.
// The built-in small hold is separate and holds one good.
export const SHIP_SLOTS = [
	{ number: 8 },
	{ number: 8 },
	{ number: 8 },
	{ number: 5 },
	{ number: 5 },
	{ number: 5 },
	{ number: 2 },
	{ number: 2 },
]
export const BUILT_IN_CARGO = 1
export const STARTING_GEAR = 3
export const MAX_GEAR = 8

export function shipSpeed(gear) {
	const filled = gear.filter(Boolean).length
	if (filled <= 3) return 8
	if (filled <= 6) return 5
	return 2
}

export function cargoCapacity(gear) {
	let holds = 0
	for (const g of gear) if (g === "cargo") holds++
	return BUILT_IN_CARGO + holds * 2
}

// Board -------------------------------------------------------------------
export const BOARD_WIDTH = 1800
export const BOARD_HEIGHT = 1200

// Node ids: P0..P15 for planets, J0/J1 for mid-space junctions.
export const PLANETS = [
	{ id: 0, name: "Osiris", x: 243, y: 127, start: false },
	{ id: 1, name: "Bellerophon", x: 183, y: 255, start: false },
	{ id: 2, name: "Zarmina", x: 512, y: 300, start: false },
	{ id: 3, name: "Corot-9b", x: 852, y: 65, start: false },
	{ id: 4, name: "55 Cancri f", x: 1057, y: 130, start: false },
	{ id: 5, name: "Tau Bo\u00f6tis b", x: 638, y: 462, start: false },
	{ id: 6, name: "Metuselah", x: 778, y: 392, start: false },
	{ id: 7, name: "Kepler-42c", x: 1025, y: 305, start: false },
	{ id: 8, name: "Tsukuyomi", x: 258, y: 655, start: true },
	{ id: 9, name: "Susanoo", x: 461, y: 680, start: true },
	{ id: 10, name: "Izanagi", x: 300, y: 780, start: true },
	{ id: 11, name: "Amaterasu", x: 486, y: 790, start: true },
	{ id: 12, name: "Inari", x: 614, y: 925, start: true },
	{ id: 13, name: "Epsilon Reticuli b", x: 867, y: 725, start: false },
	{ id: 14, name: "Mu Arae b", x: 1098, y: 590, start: false },
	{ id: 15, name: "Iota Draconis b", x: 1190, y: 685, start: false },
]

export const JUNCTIONS = [
	{ id: "J0", name: "", x: 710, y: 185 },
	{ id: "J1", name: "", x: 930, y: 180 },
]

export const NODE_COORDS = {}
for (const p of PLANETS) NODE_COORDS["P" + p.id] = [p.x, p.y]
for (const j of JUNCTIONS) NODE_COORDS[j.id] = [j.x, j.y]

// Route control points are in board coordinates. Endpoints are the node coords.
export const ROUTES = [
	{ id: 0, a: "P0", b: "P1", length: 4, ctrl: [[243, 127], [232, 180], [183, 255]] },
	{ id: 1, a: "P0", b: "J0", length: 18, ctrl: [[243, 127], [410, 78], [560, 110], [710, 185]] },
	{ id: 2, a: "J0", b: "P2", length: 14, ctrl: [[710, 185], [640, 245], [560, 285], [512, 300]] },
	{ id: 3, a: "J0", b: "P3", length: 10, ctrl: [[710, 185], [770, 120], [820, 80], [852, 65]] },
	{ id: 4, a: "P3", b: "J1", length: 12, ctrl: [[852, 65], [900, 105], [920, 145], [930, 180]] },
	{ id: 5, a: "J1", b: "P4", length: 12, ctrl: [[930, 180], [975, 150], [1020, 135], [1057, 130]] },
	{ id: 6, a: "J1", b: "P6", length: 10, ctrl: [[930, 180], [900, 250], [840, 330], [778, 392]] },
	{ id: 7, a: "P4", b: "P7", length: 6, ctrl: [[1057, 130], [1080, 200], [1060, 270], [1025, 305]] },
	{ id: 8, a: "P6", b: "P7", length: 8, ctrl: [[778, 392], [870, 365], [960, 330], [1025, 305]] },
	{ id: 9, a: "P2", b: "P5", length: 10, ctrl: [[512, 300], [545, 370], [590, 430], [638, 462]] },
	{ id: 10, a: "P2", b: "P6", length: 8, ctrl: [[512, 300], [590, 330], [690, 350], [778, 392]] },
	{ id: 11, a: "P5", b: "P1", length: 10, ctrl: [[638, 462], [540, 430], [420, 380], [300, 330], [183, 255]] },
	{ id: 12, a: "P5", b: "P6", length: 6, ctrl: [[638, 462], [690, 430], [740, 410], [778, 392]] },
	{ id: 13, a: "P5", b: "P9", length: 12, ctrl: [[638, 462], [590, 540], [520, 615], [461, 680]] },
	{ id: 14, a: "P5", b: "P12", length: 12, ctrl: [[638, 462], [660, 600], [650, 760], [614, 925]] },
	{ id: 15, a: "P1", b: "P8", length: 12, ctrl: [[183, 255], [120, 420], [160, 560], [258, 655]] },
	{ id: 16, a: "P8", b: "P9", length: 5, ctrl: [[258, 655], [340, 650], [420, 665], [461, 680]] },
	{ id: 17, a: "P8", b: "P10", length: 4, ctrl: [[258, 655], [260, 710], [280, 760], [300, 780]] },
	{ id: 18, a: "P10", b: "P11", length: 3, ctrl: [[300, 780], [370, 790], [440, 795], [486, 790]] },
	{ id: 19, a: "P10", b: "P9", length: 6, ctrl: [[300, 780], [330, 750], [390, 710], [461, 680]] },
	{ id: 20, a: "P9", b: "P11", length: 4, ctrl: [[461, 680], [465, 735], [470, 770], [486, 790]] },
	{ id: 21, a: "P11", b: "P12", length: 4, ctrl: [[486, 790], [530, 845], [575, 895], [614, 925]] },
	{ id: 22, a: "P6", b: "P14", length: 10, ctrl: [[778, 392], [880, 455], [1000, 520], [1098, 590]] },
	{ id: 23, a: "P14", b: "P7", length: 6, ctrl: [[1098, 590], [1090, 500], [1065, 390], [1025, 305]] },
	{ id: 24, a: "P14", b: "P15", length: 8, ctrl: [[1098, 590], [1150, 620], [1180, 660], [1190, 685]] },
	{ id: 25, a: "P14", b: "P13", length: 10, ctrl: [[1098, 590], [1030, 650], [950, 700], [867, 725]] },
	{ id: 26, a: "P13", b: "P12", length: 10, ctrl: [[867, 725], [800, 790], [700, 880], [614, 925]] },
	{ id: 27, a: "P12", b: "P15", length: 12, ctrl: [[614, 925], [760, 900], [980, 850], [1190, 685]] },
]

export const ROUTES_BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r]))

export function nodeCoord(nodeId) {
	return NODE_COORDS[nodeId] || [0, 0]
}

export function planetByNode(nodeId) {
	if (typeof nodeId !== "string" || !nodeId.startsWith("P")) return null
	return PLANETS[Number(nodeId.slice(1))]
}

export function isPlanetNode(nodeId) {
	return typeof nodeId === "string" && nodeId.startsWith("P")
}

// History / UI helpers ----------------------------------------------------
export const HISTORY_LABELS = {
	[HIST_NEW_GAME]: "New game",
	[HIST_ENERGY]: "Collect energy",
	[HIST_ACTION_START]: "Start action turn",
	[HIST_HIGHWAY]: "Build highway",
	[HIST_MOVE]: "Move",
	[HIST_BUILD]: "Build",
	[HIST_TRADE]: "Trade",
	[HIST_PATHWAY]: "Place Schr\u00f6dinger pathway",
	[HIST_TRADE_OFFER]: "Player trade",
	[HIST_END_TURN]: "End turn",
	[HIST_GAME_END]: "Game end",
	[HIST_AUCTION]: "Starting auction",
}

export function doAdminAlrt(msg) {
	window.alert(msg)
}

export function doAdminConsolLg(msg) {
	console.log(msg)
}
