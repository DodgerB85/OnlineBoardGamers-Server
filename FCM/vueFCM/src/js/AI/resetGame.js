/**
 * Admin "Reset AI": throw the current game away and start again from turn 0 on
 * a brand new map, keeping the same seats (so FcmAI stays in the game).
 *
 * Implemented purely client-side: the server stores gameData as an opaque blob,
 * so re-running model.setupNewGame() and saving the result over the top is
 * enough. No new endpoint needed.
 */
import { useModelStore } from "../../stores/FCMstore.js"
import { usePersonalStore } from "../../stores/FCMpersonal.js"
import * as model from "../FCMmodel"
import * as IO from "../../backend/FCM_IO"
import { clearThinking, AI_PLAYER_NAME } from "./aiDebug"

/**
 * @returns {Promise<boolean>} false if there was nothing to reset
 */
export async function resetGameForAI() {
	const store = useModelStore()
	const personal = usePersonalStore()

	const names = store.players.map((p) => p.name)
	if (names.length === 0) return false

	// setupNewGame consumes this positionally: [0] for the SHADOW seat, [1] for
	// SHADOW_2, etc. So collect the shadow seats' names in seat order.
	const displayNames = names.map((n, i) => (n.startsWith("SHADOW") ? store.players[i].displayName : "")).filter(Boolean)
	if (!names.includes(AI_PLAYER_NAME)) {
		// Nothing AI-specific to debug, but the reset itself is still valid.
		console.warn("resetGameForAI called with no FcmAI seat")
	}

	personal.haltPlay = true
	clearThinking()

	model.setupNewGame({
		playerNames: names,
		displayNames: displayNames,
		regenerateMap: true,
		keepColours: true,
	})

	// The bank needs rebuilding too - setupNewGame derives it from player count.
	store.clearHistoryHelpers()
	store.clearMessages()

	// saveRewind=false on purpose. The server seeds its rewind array from the
	// gameData it currently holds, which after a reset is the game we just threw
	// away - so saving a rewind here would leave a rewind point that resurrects it.
	await IO.saveGameNormal(false, false, false)

	personal.haltPlay = false
	return true
}
