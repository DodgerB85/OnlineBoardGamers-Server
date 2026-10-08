/**
 * Map geometry + board-target logic for ROW.
 *
 * Geometry is ported from the boardgamefiesta GWT trail.component SVG
 * (GPL-3.0, Copyright (C) 2021 Tom Wetjens). Coordinates are absolute in the
 * board SVG space: the 1920x1920 board image is drawn at (0,0) sized 800x800
 * inside viewBox "0 -20 800 820" (or 1015 tall with Rails to the North, where
 * everything below shifts down by 195).
 *
 * Legal-target predicates are ported from the canSelect* predicates of the same
 * component.
 */
import { ActionType } from "./ROWreference"
import { neutralBuildingAction, playerBuildingAction } from "./ROWdata"

/** Trail location rectangles, keyed by engine location name. */
export const TRAIL_SPOTS = {
	KANSAS_CITY: { x: 120, y: 122, w: 62, h: 45 },
	START: { x: 756, y: 742, w: 44, h: 30 },

	"FLOOD-4": { x: 488.79, y: 700.61, w: 36.8, h: 41.66 },
	"FLOOD-3": { x: 538.93, y: 707.02, w: 36.8, h: 41.66 },
	"FLOOD-2": { x: 590.38, y: 706.65, w: 36.8, h: 41.66 },
	"FLOOD-1": { x: 641.45, y: 711.15, w: 36.8, h: 41.66 },
	"DROUGHT-1": { x: 190.08, y: 618.4, w: 36.8, h: 41.66 },
	"DROUGHT-2": { x: 184.82, y: 560.2, w: 36.8, h: 41.66 },
	"DROUGHT-3": { x: 193.46, y: 504.25, w: 36.8, h: 41.66 },
	"DROUGHT-4": { x: 197.59, y: 448.67, w: 36.8, h: 41.66 },
	"ROCKFALL-1": { x: 666.35, y: 284.95, w: 36.8, h: 41.66 },
	"ROCKFALL-2": { x: 670.36, y: 232.75, w: 36.8, h: 41.66 },
	"ROCKFALL-3": { x: 669.23, y: 180.55, w: 36.8, h: 41.66 },
	"ROCKFALL-4": { x: 635.4, y: 132.94, w: 36.8, h: 41.66 },

	"TEEPEE-1": { x: 365.68, y: 532.64, w: 36.8, h: 41.66 },
	"TEEPEE-2": { x: 407.5, y: 538.42, w: 36.8, h: 41.66 },
	"TEEPEE-4": { x: 451.44, y: 547.81, w: 36.8, h: 41.66 },
	"TEEPEE-6": { x: 494.19, y: 550.78, w: 36.8, h: 41.66 },
	"TEEPEE-8": { x: 535.46, y: 553.75, w: 36.8, h: 41.66 },
	"TEEPEE-10": { x: 578.21, y: 550.78, w: 36.8, h: 41.66 },
	"TEEPEE--1": { x: 482.24, y: 488.1, w: 36.8, h: 41.66 },
	"TEEPEE--2": { x: 525.82, y: 483.95, w: 36.8, h: 41.66 },
	"TEEPEE--3": { x: 568.57, y: 480.98, w: 36.8, h: 41.66 },

	"FLOOD-RISK-2": { x: 318.74, y: 676.03, w: 66.49, h: 68.08 },
	"FLOOD-RISK-1": { x: 401.05, y: 678.68, w: 66.49, h: 68.08 },
	"A-1": { x: 536.47, y: 614.42, w: 66.49, h: 68.08 },
	"A-2": { x: 447.25, y: 604.33, w: 66.49, h: 68.08 },
	"A-3": { x: 356.97, y: 594.24, w: 66.49, h: 68.08 },
	B: { x: 226.13, y: 675.49, w: 66.49, h: 68.08 },
	"B-1": { x: 249.17, y: 573, w: 66.49, h: 68.08 },
	"B-2": { x: 265.1, y: 489.62, w: 66.49, h: 68.08 },
	"B-3": { x: 313.96, y: 415.28, w: 66.49, h: 68.08 },
	"DROUGHT-RISK-1": { x: 199.25, y: 367.48, w: 66.49, h: 68.08 },
	"INDIAN-TRADE-RISK-1": { x: 629.94, y: 508.74, w: 66.49, h: 68.08 },
	"INDIAN-TRADE-RISK-2": { x: 629.94, y: 431.74, w: 66.49, h: 68.08 },
	C: { x: 354.84, y: 334.64, w: 66.49, h: 68.08 },
	"C-1-1": { x: 444.6, y: 311.72, w: 66.49, h: 68.08 },
	"C-1-2": { x: 532.22, y: 304.82, w: 66.49, h: 68.08 },
	"C-2": { x: 443, y: 400.41, w: 66.49, h: 68.08, edition: "FIRST" },
	"D-1": { x: 530.62, y: 387.1, w: 66.49, h: 68.08, edition: "SECOND" },
	D: { x: 530.62, y: 387.1, x2: 443, y2: 400.41, w: 66.49, h: 68.08 },
	E: { x: 626.22, y: 341.98, w: 66.49, h: 68.08 },
	"E-1": { x: 558.77, y: 227.81, w: 66.49, h: 68.08 },
	"E-2": { x: 460.53, y: 226.75, w: 66.49, h: 68.08 },
	F: { x: 372.9, y: 163, w: 66.49, h: 68.08 },
	"F-1": { x: 287.94, y: 149.75, w: 66.49, h: 68.08 },
	"F-2": { x: 346.35, y: 247.46, w: 66.49, h: 68.08 },
	"ROCKFALL-RISK-1": { x: 547.62, y: 138.6, w: 66.49, h: 68.08 },
	"ROCKFALL-RISK-2": { x: 458.94, y: 136.47, w: 66.49, h: 68.08 },
	G: { x: 249.69, y: 244.8, w: 66.49, h: 68.08 },
	"G-1": { x: 158.89, y: 213.48, w: 66.49, h: 68.08 },
	"G-2": { x: 190.22, y: 135.41, w: 66.49, h: 68.08 },
}

export function spotFor(name, edition) {
	const s = TRAIL_SPOTS[name]
	if (!s) return null
	if (s.edition && s.edition !== edition) return null
	return s
}

const TURNOUTS = [4, 7, 10, 13, 16, 21, 25, 29, 33]
export const SPACE_RECTS = [
	...Array.from({ length: 19 }, (_, i) => ({ space: `${i}`, x: 164 + i * 31.7, y: 54, w: 31.7, h: 19 })),
	...TURNOUTS.slice(0, 5).map((t, i) => ({ space: `${t}.5`, x: 303 + i * 95, y: 73, w: 36, h: 18 })),
	{ space: "19", x: 776, y: 52, w: 30.9, h: 20, transform: "rotate(45 0 0)" },
	...Array.from({ length: 19 }, (_, i) => ({ space: `${20 + i}`, x: 777, y: 112.9 + i * 30.9, w: 30.9, h: 20, transform: "rotate(-90 0 0)" })),
	...TURNOUTS.slice(5).map((t, i) => ({ space: `${t}.5`, x: 759, y: 162 + i * 124, w: 36, h: 18, transform: "rotate(-90 0 0)" })),
	{ space: "39", x: 733, y: 678, w: 46, h: 20 },
]

export const STATION_POSITIONS = Array.from({ length: 10 }, (_, i) => ({
	x: i < 5 ? 305 + i * 95 : i < 9 ? 722 : 745,
	y: i < 5 ? 95 : i < 9 ? 127 + (i - 5) * 124 : 700,
	w: 33,
	h: 33,
}))

export const STATION_DISCS = [
	{ cx: 322, cy: 110 },
	{ cx: 416, cy: 110 },
	{ cx: 510, cy: 110 },
	{ cx: 606, cy: 110 },
	{ cx: 701, cy: 110 },
	{ cx: 739, cy: 144 },
	{ cx: 739, cy: 266 },
	{ cx: 739, cy: 390 },
	{ cx: 739, cy: 514 },
	{ cx: 762, cy: 715 },
]

/** Station-master tile slots, only drawn for the first five stations (as in the original). */
export const STATION_MASTERS = [
	{ x: 271, y: 86 },
	{ x: 365.5, y: 86 },
	{ x: 460, y: 86 },
	{ x: 555, y: 86 },
	{ x: 650, y: 86 },
	null,
	null,
	null,
	null,
	null,
]

/** City strip: rect + disc stack per ORIGINAL_CITY_STRIP entry (top of board). */
export const CITY_POSITIONS = [
	{ rect: { x: 121, y: 0, w: 52, h: 50 }, disc: { cx: 147, cy: 17 } },
	{ rect: { x: 184, y: 0, w: 52, h: 50 }, disc: { cx: 210, cy: 17 } },
	{ rect: { x: 279, y: 0, w: 52, h: 50 }, disc: { cx: 305, cy: 17 } },
	{ rect: { x: 343, y: 0, w: 52, h: 50 }, disc: { cx: 368, cy: 17 } },
	{ rect: { x: 406, y: 0, w: 52, h: 50 }, disc: { cx: 431, cy: 17 } },
	{ rect: { x: 469, y: 0, w: 52, h: 50 }, disc: { cx: 495, cy: 17 } },
	{ rect: { x: 532, y: 0, w: 52, h: 50 }, disc: { cx: 558, cy: 17 } },
	{ rect: { x: 595, y: 0, w: 52, h: 50 }, disc: { cx: 621, cy: 17 } },
	{ rect: { x: 659, y: 0, w: 52, h: 50 }, disc: { cx: 684, cy: 17 } },
	{ rect: { x: 722, y: 0, w: 52, h: 50 }, disc: { cx: 748, cy: 17 } },
]

/** Foresight slots: engine [column][row] mapped onto the top-left slots. */
export const FORESIGHT_SLOTS = [
	{ col: 0, row: 0, x: 89.5, y: 195 },
	{ col: 0, row: 1, x: 89.5, y: 235 },
	{ col: 1, row: 0, x: 55.5, y: 195 },
	{ col: 1, row: 1, x: 55.5, y: 235 },
	{ col: 2, row: 0, x: 21.5, y: 195 },
	{ col: 2, row: 1, x: 21.5, y: 235 },
]

/** Job market: worker tiles right-aligned in a 4-wide frame; token marks current row. */
export const JOB_MARKET = {
	x: 9,
	y0: 316,
	rowStep: 39,
	workerW: 33,
	workerH: 39,
	tokenX: 110,
	tokenY0: 319,
}

// ---------------------------------------------------------------------------
// Legal board targets
// ---------------------------------------------------------------------------
export const MOVE_FAMILY = [
	ActionType.MOVE,
	ActionType.MOVE_1_FORWARD,
	ActionType.MOVE_2_FORWARD,
	ActionType.MOVE_3_FORWARD,
	ActionType.MOVE_3_FORWARD_WITHOUT_FEES,
	ActionType.MOVE_4_FORWARD,
	ActionType.MOVE_5_FORWARD,
]

export const BUILD_ACTIONS = [ActionType.PLACE_BUILDING, ActionType.PLACE_CHEAP_BUILDING, ActionType.PLACE_BUILDING_FOR_FREE]

export const HAZARD_ACTIONS = [
	ActionType.REMOVE_HAZARD,
	ActionType.REMOVE_HAZARD_FOR_FREE,
	ActionType.REMOVE_HAZARD_FOR_2_DOLLARS,
	ActionType.REMOVE_HAZARD_FOR_5_DOLLARS,
]

export const WORKER_ACTIONS = [
	ActionType.HIRE_WORKER,
	ActionType.HIRE_WORKER_PLUS_2,
	ActionType.HIRE_WORKER_MINUS_1,
	ActionType.HIRE_WORKER_MINUS_2,
]

/** Engine-move ranges; MOVE_ENGINE_FORWARD/UP_TO_* get special ranges via engineMoveRange(). */
export const ENGINE_FORWARD = {
	[ActionType.MOVE_ENGINE_1_FORWARD]: [1, 1],
	[ActionType.MOVE_ENGINE_2_FORWARD]: [1, 2],
	[ActionType.PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD]: [1, 1],
	[ActionType.PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD]: [1, 2],
	[ActionType.MOVE_ENGINE_AT_MOST_2_FORWARD]: [0, 2],
	[ActionType.MOVE_ENGINE_AT_MOST_3_FORWARD]: [0, 3],
	[ActionType.MOVE_ENGINE_AT_MOST_4_FORWARD]: [0, 4],
	[ActionType.MOVE_ENGINE_2_OR_3_FORWARD]: [2, 3],
	[ActionType.DISCARD_1_JERSEY_TO_MOVE_ENGINE_1_FORWARD]: [1, 1],
	[ActionType.DISCARD_1_DUTCH_BELT_TO_MOVE_ENGINE_2_FORWARD]: [1, 2],
}

export const ENGINE_BACKWARD = {
	[ActionType.MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS]: [1, 1],
	[ActionType.MOVE_ENGINE_AT_LEAST_1_BACKWARDS_AND_GAIN_3_DOLLARS]: [1, 39],
	[ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD]: [1, 1],
	[ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR]: [1, 1],
	[ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS]: [2, 2],
	[ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS_AND_GAIN_2_DOLLARS]: [2, 2],
	[ActionType.PAY_1_DOLLAR_AND_MOVE_ENGINE_1_BACKWARDS_TO_GAIN_1_CERTIFICATE]: [1, 1],
	[ActionType.PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES]: [2, 2],
	[ActionType.EXTRAORDINARY_DELIVERY]: [1, 39],
}

export function engineMoveRange(a, g) {
	const ps = g.currentPlayerState()
	if (a === ActionType.MOVE_ENGINE_FORWARD) return { lo: 0, hi: ps.getNumberOfEngineers(), dir: 1 }
	if (a === ActionType.MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_BUILDINGS_IN_WOODS) return { lo: 0, hi: g.getTrail().buildingsInWoods(g.currentPlayer), dir: 1 }
	if (a === ActionType.MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_HAZARDS) return { lo: 0, hi: ps.numberOfHazards(), dir: 1 }
	if (ENGINE_FORWARD[a]) return { lo: ENGINE_FORWARD[a][0], hi: ENGINE_FORWARD[a][1], dir: 1 }
	if (ENGINE_BACKWARD[a]) return { lo: ENGINE_BACKWARD[a][0], hi: ENGINE_BACKWARD[a][1], dir: -1 }
	return null
}

export function reachableSpacesFor(a, g) {
	const r = engineMoveRange(a, g)
	if (!r) return new Set()
	const rt = g.getRailroadTrack()
	const from = rt.currentSpace(g.currentPlayer)
	return r.dir === 1 ? rt.reachableSpacesForward(from, r.lo, r.hi) : rt.reachableSpacesBackwards(from, r.lo, r.hi)
}

export function moveDestination(m) {
	return m.steps[m.steps.length - 1]
}

// ---------------------------------------------------------------------------
// Building activation (board-integrated actions)
// ---------------------------------------------------------------------------

/** Actions that need a target/choice before the engine can perform them. */
export const NEEDS_PARAMS = new Set([
	ActionType.MOVE,
	ActionType.MOVE_1_FORWARD,
	ActionType.MOVE_2_FORWARD,
	ActionType.MOVE_3_FORWARD,
	ActionType.MOVE_3_FORWARD_WITHOUT_FEES,
	ActionType.MOVE_4_FORWARD,
	ActionType.MOVE_5_FORWARD,
	ActionType.DELIVER_TO_CITY,
	ActionType.HIRE_WORKER,
	ActionType.HIRE_WORKER_PLUS_2,
	ActionType.HIRE_WORKER_MINUS_1,
	ActionType.HIRE_WORKER_MINUS_2,
	ActionType.BUY_CATTLE,
	ActionType.PLACE_BUILDING,
	ActionType.PLACE_CHEAP_BUILDING,
	ActionType.PLACE_BUILDING_FOR_FREE,
	ActionType.REMOVE_HAZARD,
	ActionType.REMOVE_HAZARD_FOR_FREE,
	ActionType.REMOVE_HAZARD_FOR_2_DOLLARS,
	ActionType.REMOVE_HAZARD_FOR_5_DOLLARS,
	ActionType.TRADE_WITH_TRIBES,
	ActionType.APPOINT_STATION_MASTER,
	ActionType.DOWNGRADE_STATION,
	ActionType.UPGRADE_ANY_STATION_BEHIND_ENGINE,
	ActionType.TAKE_BREEDING_VALUE_3_CATTLE_CARD,
	ActionType.DISCARD_CARD,
	ActionType.REMOVE_CARD,
	ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES,
	ActionType.PLAY_OBJECTIVE_CARD,
	ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE,
	ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND,
	ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND,
	ActionType.DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS,
	ActionType.DISCARD_PAIR_TO_GAIN_3_DOLLARS,
	ActionType.DISCARD_PAIR_TO_GAIN_4_DOLLARS,
])

/** The local action tree a placed building offers the current player. */
function buildingLocalAction(loc, game) {
	const b = loc.building
	if (!b) return null
	const ps = game.currentPlayerState()
	return b.player === null ? neutralBuildingAction(b.name, ps.getNumberOfCowboys()) : playerBuildingAction(b.name, game.edition, ps.getNumberOfCowboys())
}

/**
 * What building interaction, if any, is available for a location right now:
 *   { mode: "activate", options:[ActionType...] }  -> the player is on/at it
 *   { mode: "adjacent", options:[USE_ADJACENT_BUILDING] } -> it can be used from an adjacent spot
 * Returns null when the building cannot be interacted with.
 */
export function buildingInteraction(locName, game, liveActions) {
	const loc = game.getTrail().getLocation(locName)
	if (!loc || loc.kind !== "BUILDING" || !loc.building) return null
	const ps = game.currentPlayerState()
	const current = game.getTrail().currentLocation(game.currentPlayer)
	const last = ps.getLastActivatedLocation()
	const here = locName === current || locName === last

	if (here) {
		const local = buildingLocalAction(loc, game)
		const offered = new Set(local ? local.getPossibleActions() : [])
		const layoutActions = [...offered]
		const options = [...offered].filter((a) => liveActions.includes(a))
		if (options.length) return { mode: "activate", location: locName, options, layoutActions }
	}
	if (liveActions.includes(ActionType.USE_ADJACENT_BUILDING) && game.getTrail().getAdjacentLocations(current).includes(locName)) {
		return { mode: "adjacent", location: locName, options: [ActionType.USE_ADJACENT_BUILDING], layoutActions: [ActionType.USE_ADJACENT_BUILDING] }
	}
	return null
}

/** Every building action currently reachable through a board interaction. */
export function activeBuildingActions(game, liveActions) {
	const set = new Set()
	for (const [name, loc] of game.getTrail().locations) {
		if (loc.kind !== "BUILDING" || !loc.building) continue
		const inter = buildingInteraction(name, game, liveActions)
		if (inter) for (const a of inter.options) set.add(a)
	}
	return set
}
