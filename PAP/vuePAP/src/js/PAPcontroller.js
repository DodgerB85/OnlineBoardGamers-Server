/**
 * Turn / phase control.
 *
 * The scaffold uses a simple sequential turn model: every player moves once
 * per turn (in turnOrder), then the turn increments. Replace this with the
 * real Permits and Poisons flow as you implement it.
 */

import * as rf from "./PAPreference"
import * as model from "./PAPmodel"
import * as IO from "../backend/PAP_IO"
import { useModelStore } from "../stores/PAPstore.js"
import { usePersonalStore } from "../stores/PAPpersonal.js"

export function currentPlayerIndex() {
	const store = useModelStore()
	return store.gameflow.turnOrder[0]
}

export function isMyTurn() {
	const personal = usePersonalStore()
	return personal.canPlay() && currentPlayerIndex() === personal.pov
}

export function isSimulPhase() {
	return false
}

export function startPlayerTurn() {
	const personal = usePersonalStore()
	const store = useModelStore()
	personal.haltPlay = false
	if (store.viewSettings.showReplay) return
	if (personal.canPlay() && personal.yourTurnAudioType > 0) {
		// Optional "your turn" sound. Add sound files to static/Lobby/common/sounds if wanted.
	}
	model.rebuildTurnOrder()
}

export function endPlayerTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!personal.canPlay()) return

	if (store.gameflow.turnOrder.length > 0) store.gameflow.turnOrder.shift()

	if (store.gameflow.turnOrder.length === 0) {
		store.gameflow.turn += 1
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
	}

	model.addHistory(rf.HIST_END_TURN, personal.pov, model.snapshotState())
	IO.saveGame(true)
}

export function timedOutPlayerObj() {
	const store = useModelStore()
	const idx = store.gameflow.turnOrder[0]
	return store.players[idx] || { name: "" }
}
