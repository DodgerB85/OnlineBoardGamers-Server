/**
 * Debug plumbing for the FcmAI: records what the AI is about to do and, when
 * "Pause on AI" is on, parks it between finishing the calculation and applying
 * the move so a human can read the reasoning and the board heat map first.
 *
 * FCM_AI.js calls think() at the point where a decision is complete but nothing
 * has been written to the model yet, then continues once think() resolves. With
 * pausing off think() is effectively a no-op beyond filling in the panel.
 */
import { useModelStore } from "../../stores/FCMstore.js"
import * as map from "../FCMmap"
import * as view from "../FCMview"

export const AI_PLAYER_NAME = "FcmAI"

/** Resolver for the AI currently parked at the gate, if any. */
let gate = null

/** True when at least one seat is played by the bot. */
export function aiInGame() {
	const store = useModelStore()
	return store.players.some((p) => p.name === AI_PLAYER_NAME)
}

/** True while the AI is parked waiting for a human. */
export function isWaiting() {
	return gate !== null
}

/**
 * Record the AI's current decision and optionally wait for a human.
 *
 * Always fills in the debug panel; only actually blocks when
 * store.viewSettings.pauseOnAi is set.
 *
 * @param {object} info
 * @param {string} info.summary one line describing the decision
 * @param {string[]} [info.reasons] bullet lines explaining it
 * @param {object[]} [info.heatMap] placement scores, for the board overlay
 * @param {number} [info.heatMapRotation] which rotation heatMap is for
 * @param {object} [info.chosen] the picked placement
 * @returns {Promise<void>} resolves once the AI may proceed
 */
export async function think(info) {
	const store = useModelStore()

	store.aiThinking.turn = store.gameflow.turn
	store.aiThinking.phase = store.gameflow.phase
	store.aiThinking.subphase = store.gameflow.subphase
	store.aiThinking.aiLevel = store.players[store.gameflow.turnOrder[0]]?.AIlevel ?? 0
	store.aiThinking.summary = info.summary || ""
	store.aiThinking.reasons = info.reasons || []
	store.aiThinking.heatMap = info.heatMap || []
	store.aiThinking.heatMapRotation = info.heatMapRotation ?? -1
	store.aiThinking.chosen = info.chosen || null

	// Gate whenever the AI is being watched, not just when "Pause on AI" is on:
	// turning the debug panel on is a request to see each decision, so the AI has
	// to stop and wait rather than playing through unobserved. Pause is the
	// explicit override for when you want the panel without stopping.
	if (!store.viewSettings.pauseOnAi && !store.viewSettings.showAiDebug) return

	// Overwrite any previous gate rather than queueing a second waiter - the AI
	// is single threaded, so only one thought can ever be pending.
	resume()

	// Never park invisibly: if the AI stopped, its reasoning is on screen.
	store.viewSettings.showAiDebug = true
	store.aiThinking.waiting = true
	await new Promise((resolve) => {
		gate = resolve
	})
	store.aiThinking.waiting = false
}

/** Let a parked AI continue. Safe to call when nothing is parked. */
export function resume() {
	if (gate === null) return
	const resolve = gate
	gate = null
	resolve()
}

/** Toggle the pause flag, releasing the AI if it is being switched off. */
export function togglePause() {
	const store = useModelStore()
	store.viewSettings.pauseOnAi = !store.viewSettings.pauseOnAi
	// Switching pausing off must never leave the AI parked with nothing to click.
	if (!store.viewSettings.pauseOnAi) {
		store.viewSettings.showAiDebug = false
		resume()
	}
}

/**
 * Close the debug panel. If the AI is parked this also releases it - the panel
 * is the only way to un-park, so hiding it has to let the AI through or the game
 * deadlocks.
 */
export function closePanel() {
	const store = useModelStore()
	store.viewSettings.showAiDebug = false
	resume()
}

/** Blank the panel out, e.g. after a reset. */
export function clearThinking() {
	const store = useModelStore()
	resume()
	store.aiThinking.waiting = false
	store.aiThinking.summary = ""
	store.aiThinking.reasons = []
	store.aiThinking.heatMap = []
	store.aiThinking.heatMapRotation = -1
	store.aiThinking.chosen = null
}

/**
 * Turn a heat map into absolute-positioned entries for the board overlay.
 * Only the requested rotation is drawn, since a square can be legal for several.
 *
 * @param {object[]} heatMap entries from generatePlacementHeatMap()
 * @param {number} rotation
 * @returns {{index: number, x: number, y: number, score: number, chosen: boolean}[]}
 */
export function overlaySquares(heatMap, rotation) {
	const store = useModelStore()
	const used = map.getUsedRowCol()
	const out = []

	for (const entry of heatMap) {
		if (entry.rotation !== rotation) continue
		const [px, py] = view.getXYforSmallSquare(entry.index, used)
		out.push({
			index: entry.index,
			x: px,
			y: py,
			score: entry.score,
			chosen: entry.index === store.aiThinking.chosen?.index && entry.rotation === store.aiThinking.chosen?.rotation,
		})
	}

	return out
}

/** Human label for the current position, for the panel header. */
export function describePosition() {
	const store = useModelStore()
	const phase = (view.phaseStr(store.gameflow.phase) || "phase " + store.gameflow.phase).trim()
	return phase + " / subphase " + store.gameflow.subphase + " (turn " + store.gameflow.turn + ")"
}
