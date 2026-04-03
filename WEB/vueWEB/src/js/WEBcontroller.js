/**
 * Contains functions related to the flow of the game,
 * or rather, interacting with the game, making moves,
 * ending turns / phases / etc
 *
 *
 */
import * as rf from "./WEBreference"
import * as model from "./WEBmodel"
//import * as map from "./WEBmap"
import * as funcs from "./WEBfuncs"
import * as IO from "../backend/WEB_IO"

import { useModelStore } from "../stores/WEBstore.js"
import { usePersonalStore } from "../stores/WEBpersonal"

export function currentPlayerObj() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (store.gameflow.turnOrder.length > 0) return store.players[store.gameflow.turnOrder[0]]
	else {
		if (!store.viewSettings.showReplay & (personal.pov != undefined)) {
			alert("CP() Error")
			alert(store.gameflow.turnOrder)
		}
		return store.players[0]
	}
}

export function currentPlayerIndex() {
	const store = useModelStore()

	if (store.gameflow.turnOrder.length > 0) return store.gameflow.turnOrder[0]
	else {
		if (!store.viewSettings.showReplay) alert("CP() IDX Error")
		return 0
	}
}

export function startPlayerTurn() {
	const store = useModelStore()
	store.undoPoints.splice(0)
	if (store.gameflow.phase === rf.PHASE_WHOLE_TURN) {
		store.resetContext()
		store.context.action = rf.ACT_CHOOSE_INTIIAL_TILE
	} else {
		model.createUndoPoint()
		store.context.action = rf.ACT_CHOOSE_ACTION
	}
	store.clearAllHighlights()
	store.wholeTurnResetData = funcs.simpleExportWholeWEBmodel()
}

export function endCurrentPhase() {
	const store = useModelStore()
	store.resetContext()
	store.clearAllHighlights()
}

export function startPhase() {
	//const store = useModelStore()
}

export function endPlayerTurn() {
	const store = useModelStore()
	store.resetContext()
	store.clearAllHighlights()

	// Check if ending turn into game over
	if (model.endGameConditionMet()) {
		model.endGame()
		return
	}

	store.gameflow.phase = rf.PHASE_WHOLE_TURN
	store.context.action = rf.ACT_CHOOSE_INTIIAL_TILE
	store.gameflow.turnOrder.shift()
	actionAllPlayerSkips()
	if (store.gameflow.turnOrder.length === 0) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		store.gameflow.turn++
		actionAllPlayerSkips()
	}

	IO.saveGame(true, false)
}

export function actionAllPlayerSkips() {
	const store = useModelStore()

	while (canSkipCurrentPlayer()) {
		store.gameflow.turnOrder.shift()
	}
}

export function canSkipCurrentPlayer() {
	const store = useModelStore()
	// YOU ARRIVE HERE WITH A NEW, UNTESTED PLAYER IN store.gameflow.turnOrder[0]

	// Always skip bots - NB these SHOULDNT ever be in turnOrder, so this is a backup
	if (store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) return true

	// You can't skip if the turn is over
	if (store.gameflow.turnOrder.length === 0) return false

	if (store.players[store.gameflow.turnOrder[0]].tileIDarrays.length === 0) return true

	return false
}
