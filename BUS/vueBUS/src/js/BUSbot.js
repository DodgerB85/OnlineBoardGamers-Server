import * as model from "./BUSmodel.js"
import * as controller from "./BUScontroller.js"
import * as IO from "../backend/BUS_IO"
import * as rf from "../js/BUSreference.js"

import { useModelStore } from "../stores/BUSstore.js"
import { usePersonalStore } from "../stores/BUSpersonal.js"

export function actionAnyBotMooves() {
	const store = useModelStore()

	if (store.gameflow.gameEnded > 0) return
	// Still action any bot turns for history on time passing, or adding buses
	if (store.gameflow.phase === rf.PHASE_ADD_BUS || store.gameflow.phase === rf.PHASE_ALTER_TIME) return
	while (store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) {
		store.gameflow.turnOrder.shift()
	}

	if (store.gameflow.turnOrder.length === 0) {
		//store.context.historyObj.push([9])
		controller.endCurrentPhase()
	}
	controller.startPlayerTurn()
}

/**================================================================================================ */

export function actionPlayerKickout() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.kickoutRequired === 2) {
		personal.kickoutRequired = 0

		// Action the kick in game
		store.history.push([rf.HIST_KICKOUT, personal.pov, Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [store.gameflow.turnOrder[0]]])
		store.resetVarsOnTurnEnd()

		store.players[store.gameflow.turnOrder[0]].displayName = rf.BOT_NAME
		store.players[store.gameflow.turnOrder[0]].score = 0
		store.players[store.gameflow.turnOrder[0]].remainingActions = 0

		IO.saveGameDataAfterKickout()
	}
}

export function actionResign() {
	const store = useModelStore()
	const personal = usePersonalStore()
	// change display name
	store.players[personal.pov].displayName = rf.BOT_NAME
	// set score to 0
	store.players[personal.pov].score = 0

	// Count non players and end game if only 1 left
	var nbNonPlayers = 0
	for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++

	if (nbNonPlayers >= store.players.length - 1) {
		// Only 1 player left, so end game
		store.gameflow.phase = rf.PHASE_GAME_OVER
		store.gameflow.gameEnded = 4
		model.endGame()
		IO.saveGame(false)
		return
	} else [IO.saveGame(true)]
}
