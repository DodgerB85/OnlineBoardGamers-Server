import * as rf from "./KFWreference"
import * as funcs from "./KFWfuncs"
import * as map from "./KFWmap"
import * as model from "./KFWmodel"
import * as history from "./KFWhistory"
import * as controller from "./KFWcontroller"
import i18n from "../i18n"

import { useModelStore } from "../stores/KFWstore.js"

export function goToReplayStep(step) {
	const store = useModelStore()

	store.replayStep = step
	funcs.importKFWmodel(store.replayData[store.replayStep], false, true, true)
	//map.calculateCanvasSize()

	history.setupHistoryHighlight(store.history[store.replayStep][0], store.history[store.replayStep][3], store.replayStep) // ADD STEP???
	if (store.viewSettings.showingPlayerIndex !== -1) store.viewSettings.showingPlayerIndex = controller.currentPlayerIndex()
}

export function performStep(amount) {
	const store = useModelStore()

	store.clearHistoryHelpers()
	store.clearMessages()
	if (amount === -99) store.replayStep = 0
	if (amount === -9) store.replayStep -= 5
	if (amount === -1) store.replayStep--
	if (amount === 1) store.replayStep++
	if (amount === 9) store.replayStep += 5
	if (amount === 99) store.replayStep = store.replayData.length - 1

	if (store.replayStep < 0) store.replayStep = 0
	if (store.replayStep > store.replayData.length - 1) store.replayStep = store.replayData.length - 1

	funcs.importKFWmodel(store.replayData[store.replayStep], false, true, true)

	history.setupHistoryHighlight(store.history[store.replayStep][0], store.history[store.replayStep][3], store.replayStep) // ADD STEP??
	if (store.viewSettings.showingPlayerIndex !== -1) store.viewSettings.showingPlayerIndex = store.history[store.replayStep][1]
}

async function resetDataForReplay() {
	const store = useModelStore()

	// Reset Players
	for (let i = 0; i < store.players.length; i++) {
	
		//eraCards: [],
	}
	


	// Reset gameflow
	store.gameflow.turnOrder.splice(0)
	store.gameflow.fullTurnOrder.splice(0)

	for (let i = 0; i < store.players.length; i++) {
		store.gameflow.turnOrder.push(i)
		store.gameflow.fullTurnOrder.push(i)
	}
	

	// keep history
	store.clearVars()
	store.resetOngoingVars()
}

export async function generateReplayData(spoilerFree = false) {
	const store = useModelStore()
	store.viewSettings.generatingReplay = true

	// KFW history stores a raw model snapshot after every recorded action.
	// Older saves have no snapshots, so they cannot be replayed.
	const snapshots = store.history.map((entry) => (Array.isArray(entry?.[4]) ? entry[4] : null))
	if (snapshots.length === 0 || snapshots.some((snapshot) => !snapshot)) {
		store.gameMessages.errorText = i18n.global.t("replay.noReplayData")
		store.viewSettings.generatingReplay = false
		return
	}

	store.replayData = snapshots
	store.replayStep = snapshots.length - 1
	if (spoilerFree) {
		if (window.initData.replayStep <= 0) store.replayStep = 0
		else if (window.initData.replayStep >= store.replayData.length - 1) store.replayStep = store.replayData.length - 1
		else store.replayStep = window.initData.replayStep
	}
	store.viewSettings.showReplay = true
	goToReplayStep(store.replayStep)
	store.viewSettings.generatingReplay = false
}

/*** REPLAY FUNCTIONS HERE */
function replayNewTurn(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

}


function replayAddCity(historyIndex, playerIndex, entry3) {
	//const store = useModelStore()

}

function checkAndPerformTurnEnd(historyIndex) {
	// NOTE: THis IS THE HISTORY KFWEX THAT ALREADY HAPPEND
	// SO NEED TO REDUCE TO THE PREVIOUS MENINGFUL ENTRY
	const store = useModelStore()

	let currentAction = store.history[historyIndex][0]

	// Ignore player trades, as they won't ever end a turn or player (which is done by city build)
	let entriesToIgnore = [rf.HIST_REWIND, rf.HIST_RESIGN, rf.HIST_KICKOUT]
	if (entriesToIgnore.includes(currentAction)) return // NOTHING

	let currentPlayerIndex = store.history[historyIndex][1]

	historyIndex--
	while (entriesToIgnore.includes(store.history[historyIndex][0]) && historyIndex > 0) historyIndex--
	// Don't end the first turn before it has begun

	//let previousPlayerIndex = store.history[historyIndex][1]
	let previousAction = store.history[historyIndex][0]

	if (historyIndex === 0 && entriesToIgnore.includes(previousAction)) return //NOTHING

	//if (previousAction === rf.HIST_NEW_TURN) return // NOTHING

	let changeOfPlayer = false
	if (store.gameflow.turnOrder[0] !== -1 && store.gameflow.turnOrder[0] !== currentPlayerIndex) changeOfPlayer = true
	//if (currentAction === rf.HIST_CITY_BUILD && previousAction === rf.HIST_FIRST_CITY) changeOfPlayer = true

	// If there has been a change of player
	if (changeOfPlayer) {
		// This should work, as city build simul history is generated in player turn order
		store.gameflow.turnOrder.shift()

		/*// Instead of shift, use this to allow for simul turns
		const indexToRemove = store.gameflow.turnOrder.indexOf(currentPlayerIndex)
		// Check if the integer is present in the array before removing
		if (indexToRemove !== -1) {
			// Remove the integer from the array
			store.gameflow.turnOrder.splice(indexToRemove, 1)
		}*/

		if (store.gameflow.turnOrder.length === 0) {
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		}
	}
	//return NOTHING
}
