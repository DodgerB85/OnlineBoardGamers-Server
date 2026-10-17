/**
 * Turn control: every move goes through the engine, then is saved.
 * The engine decides whose turn it is; the server only stores the result.
 */

import * as model from "./PAPmodel"
import * as IO from "../backend/PAP_IO"
import * as engine from "./engine/index.js"
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
	model.rebuildTurnOrder()
}

// Play one engine action for the viewer and persist it. Rewind points are only saved when the turn passes.
export function act(action) {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!isMyTurn() || personal.haltPlay) return
	store.gameMessages.actionError = model.act(action)
	if (store.gameMessages.actionError) return
	IO.saveGame(engine.activeSeat(store.game) !== personal.pov)
}

export function timedOutPlayerObj() {
	const store = useModelStore()
	const idx = store.gameflow.turnOrder[0]
	return store.players[idx] || { name: "" }
}
