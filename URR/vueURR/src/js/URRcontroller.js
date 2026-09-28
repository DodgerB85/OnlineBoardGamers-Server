import * as rf from "./URRreference"
import * as model from "./URRmodel"
import * as IO from "../backend/URR_IO"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"

export function currentPlayerIndex() {
	const store = useModelStore()
	return store.gameflow.turnOrder[0]
}

export function isMyTurn() {
	const personal = usePersonalStore()
	return personal.canPlay() && currentPlayerIndex() === personal.pov
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

// The UI can submit explicit rule actions without owning any game logic.
export async function submitAction(action) {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!personal.canPlay()) return false
	const player = personal.trainingGame || rf.SUPER_USERS.includes(personal.name) ? currentPlayerIndex() : personal.pov
	try {
		model.performAction(player, action)
		store.gameMessages.actionError = ""
	} catch (error) {
		store.gameMessages.actionError = error.message
		return false
	}
	await IO.saveGame(true)
	return true
}

export function endPlayerTurn() {
	const store = useModelStore()
	const type = store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.developmentStep !== "eridu" ? "endDevelopment" : "pass"
	return submitAction({ type })
}

export function timedOutPlayerObj() {
	const store = useModelStore()
	const idx = store.gameflow.turnOrder[0]
	return store.players[idx] || { name: "" }
}
