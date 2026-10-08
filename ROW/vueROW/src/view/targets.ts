/**
 * Which board targets the currently available actions can legally be played
 * against. Ported from the canSelect* predicates of the boardgamefiesta GWT
 * trail.component (GPL-3.0, Tom Wetjens).
 */
import { ActionType, Game, PossibleMove } from "../game"

export const MOVE_FAMILY: ActionType[] = [
	ActionType.MOVE,
	ActionType.MOVE_1_FORWARD,
	ActionType.MOVE_2_FORWARD,
	ActionType.MOVE_3_FORWARD,
	ActionType.MOVE_3_FORWARD_WITHOUT_FEES,
	ActionType.MOVE_4_FORWARD,
	ActionType.MOVE_5_FORWARD,
]

export const BUILD_ACTIONS: ActionType[] = [ActionType.PLACE_BUILDING, ActionType.PLACE_CHEAP_BUILDING, ActionType.PLACE_BUILDING_FOR_FREE]

export const HAZARD_ACTIONS: ActionType[] = [
	ActionType.REMOVE_HAZARD,
	ActionType.REMOVE_HAZARD_FOR_FREE,
	ActionType.REMOVE_HAZARD_FOR_2_DOLLARS,
	ActionType.REMOVE_HAZARD_FOR_5_DOLLARS,
]

export const WORKER_ACTIONS: ActionType[] = [
	ActionType.HIRE_WORKER,
	ActionType.HIRE_WORKER_PLUS_2,
	ActionType.HIRE_WORKER_MINUS_1,
	ActionType.HIRE_WORKER_MINUS_2,
]

/** Engine-move ranges; MOVE_ENGINE_FORWARD/UP_TO_* get special ranges via engineMoveRange(). */
export const ENGINE_FORWARD: Record<string, [number, number]> = {
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

export const ENGINE_BACKWARD: Record<string, [number, number]> = {
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

export type EngineMove = { lo: number; hi: number; dir: 1 | -1 }

export function engineMoveRange(a: ActionType, g: Game): EngineMove | null {
	const ps = g.currentPlayerState()
	if (a === ActionType.MOVE_ENGINE_FORWARD) return { lo: 0, hi: ps.getNumberOfEngineers(), dir: 1 }
	if (a === ActionType.MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_BUILDINGS_IN_WOODS) return { lo: 0, hi: g.getTrail().buildingsInWoods(g.currentPlayer), dir: 1 }
	if (a === ActionType.MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_HAZARDS) return { lo: 0, hi: ps.numberOfHazards(), dir: 1 }
	if (ENGINE_FORWARD[a]) return { lo: ENGINE_FORWARD[a][0], hi: ENGINE_FORWARD[a][1], dir: 1 }
	if (ENGINE_BACKWARD[a]) return { lo: ENGINE_BACKWARD[a][0], hi: ENGINE_BACKWARD[a][1], dir: -1 }
	return null
}

export function reachableSpacesFor(a: ActionType, g: Game): Set<string> {
	const r = engineMoveRange(a, g)
	if (!r) return new Set()
	const rt = g.getRailroadTrack()
	const from = rt.currentSpace(g.currentPlayer)
	return r.dir === 1 ? rt.reachableSpacesForward(from, r.lo, r.hi) : rt.reachableSpacesBackwards(from, r.lo, r.hi)
}

export function moveDestination(m: PossibleMove): string {
	return m.steps[m.steps.length - 1]
}

/** Human-readable label for an action type (falls back to a prettified enum). */
export function humanizeAction(a: string): string {
	return a
		.replace(/_/g, " ")
		.toLowerCase()
		.replace(/^\w/, (c) => c.toUpperCase())
}
