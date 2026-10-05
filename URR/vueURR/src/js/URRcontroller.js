import * as rf from "./URRreference"
import * as model from "./URRmodel"
import * as IO from "../backend/URR_IO"
import { getBotAction } from "./URRgame.js"
import { canExchangeBarahshum } from "./URRrules.js"
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
	let player = personal.trainingGame || rf.SUPER_USERS.includes(personal.name) ? currentPlayerIndex() : personal.pov
	if (action.type === "exchangeBarahshum") {
		if (personal.haltPlay || store.viewSettings.showReplay || personal.pov < 0) return false
		const nation = store.nations[rf.NATION_BARAHSHUM]
		if ((personal.trainingGame || rf.SUPER_USERS.includes(personal.name)) && nation.ownerType === "player") player = nation.owner
		if (!canExchangeBarahshum(store, player)) return false
	} else if (!personal.canPlay()) return false
	try {
		model.performAction(player, action)
		store.gameMessages.actionError = ""
	} catch (error) {
		store.gameMessages.actionError = error.message
		return false
	}
	return await IO.saveGame(true)
}

export function endPlayerTurn() {
	const store = useModelStore()
	const type = store.gameflow.developmentStep === "betweenStates" ? "beginDevelopment" : store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.developmentStep !== "eridu" ? "endDevelopment" : "pass"
	return submitAction({ type })
}

export function timedOutPlayerObj() {
	const store = useModelStore()
	const idx = store.gameflow.turnOrder[0]
	return store.players[idx] || { name: "" }
}

export function botTurnPlayerIndex() {
	const store = useModelStore()
	const current = currentPlayerIndex()
	for (let offset = 1; offset <= store.players.length; offset++) {
		const index = (current + offset) % store.players.length
		if (!store.players[index].isMissing) return index
	}
	return -1
}

export function canRunBotTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	return personal.pov >= 0 && !personal.haltPlay && !store.viewSettings.showReplay && store.players[currentPlayerIndex()]?.isMissing && botTurnPlayerIndex() === personal.pov
}

export function getAutomaticBotAction() {
	if (!canRunBotTurn()) return null
	try {
		return getBotAction(model.snapshotState())
	} catch (error) {
		useModelStore().gameMessages.actionError = error.message
		console.error("Unable to choose an abandoned seat's move:", error)
		return null
	}
}

export async function submitBotAction(action) {
	if (!canRunBotTurn()) return false
	const store = useModelStore()
	try {
		model.performAction(currentPlayerIndex(), action)
		store.gameMessages.actionError = ""
	} catch (error) {
		store.gameMessages.actionError = error.message
		console.error("Unable to play an abandoned seat's move:", error)
		return false
	}
	return await IO.saveGame(true)
}
