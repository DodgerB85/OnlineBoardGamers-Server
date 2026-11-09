/**
 * ROW utility functions (serialization shims, detach, small helpers).
 * Mirrors the role of FCMfuncs / RNBfuncs.
 */
import { shuffle as coreShuffle } from "./ROWcore"
import { serializeGame as serializeGameImpl, deserializeGame as deserializeGameImpl } from "./ROWserialize"

export function shuffle(array, rnd) {
	return coreShuffle(array, rnd)
}

/** Deep detached copy of a JSON-able value. */
export function detach(value) {
	return JSON.parse(JSON.stringify(value))
}

/** Convert player-name ranking groups to server seat indexes (the order in initData.playerNames). */
export function finalPositionsFor(groups, seatNames) {
	return groups
		.map((group) => group.map((name) => seatNames.indexOf(name)).filter((index) => index >= 0))
		.filter((group) => group.length > 0)
}

export function serializeGame(game, rng) {
	return serializeGameImpl(game, rng)
}

export function deserializeGame(obj) {
	return deserializeGameImpl(obj)
}

/** Serialized game plus the history log, for persistence. */
export function savedPayload(game, rng, history) {
	return { ...serializeGame(game, rng), history: history.slice() }
}

export function booleanToInt(b) {
	return b ? 1 : 0
}

export function range(n) {
	return Array.from({ length: n }, (_, i) => i)
}
