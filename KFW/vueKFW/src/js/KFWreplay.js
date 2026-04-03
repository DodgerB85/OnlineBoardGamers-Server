import * as rf from "./KFWreference"
import * as funcs from "./KFWfuncs"
import * as map from "./KFWmap"
import * as model from "./KFWmodel"
import * as history from "./KFWhistory"
import * as controller from "./KFWcontroller"

import { useModelStore } from "../stores/KFWstore.js"

export function goToReplayStep(step) {
	const store = useModelStore()

	store.replayStep = step
	funcs.importKFWmodel(store.replayData[store.replayStep], false, false)
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

	funcs.importKFWmodel(store.replayData[store.replayStep], false, false)

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

	let replayData = []

	// Reset the data
	await resetDataForReplay()
	let pBarEl = document.querySelector(".progress-bar div")
	const pBarTextEl = document.querySelector(".progress-bar span")

	for (let i = 0; i < store.history.length; i++) {
		if (i !== 0) checkAndPerformTurnEnd(i)

		/** THESE HAVE NO REPLAY YET -- BUT NOT ALL WILL NEED A REPLAY */
		/*// Non-player Actions
		/*
		if (store.history[i][0] === rf.HIST_NEW_TURN) replayNewTurn(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_ADD_CITY) replayAddCity(i, store.history[i][1], store.history[i][3])
		*/

		replayData.push(funcs.exportKFWmodel(true))

		if (i % 5 === 0 && pBarEl != null) {
			let percent = (i / store.history.length) * 100
			pBarEl.style.width = percent + "%"
			pBarTextEl.innerText = Math.round(percent) + "%"
			await funcs.sleep(0)
		}
	} // END generating replay

	store.replayData = replayData
	store.replayStep = replayData.length - 1
	if (spoilerFree) {
		if (window.initData.replayStep <= 0) store.replayStep = 0
		else if (window.initData.replayStep >= store.replayData.length - 1) store.replayStep = store.replayData.length - 1
		else store.replayStep = window.initData.replayStep
	}
	if (store.replayData.length > 0) store.viewSettings.showReplay = true
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
