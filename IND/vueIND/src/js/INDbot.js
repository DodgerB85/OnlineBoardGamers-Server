import * as IO from "../backend/IND_IO.js"
import * as rf from "./INDreference"
import * as controller from "./INDcontroller"
import * as model from "./INDmodel"
import { useModelStore } from "../stores/INDstore.js"
import { usePersonalStore } from "../stores/INDpersonal"

export function removeBotPlayers() {
	const store = useModelStore()
	if (store.gameflow.phase === rf.PHASE_MERGERS) {
		for (let i = 0; i < store.players.length; i++) {
			if (store.players[i].displayName === rf.BOT_NAME) store.ongoingVars.passedPlayerIndexes.push(i)
		}
		// make sure it's uniq
		store.ongoingVars.passedPlayerIndexes = [...new Set(store.ongoingVars.passedPlayerIndexes)]
	}

	store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => store.players[idx].displayName != rf.BOT_NAME)
}

export async function actionPlayerKickout() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.kickoutRequired === 2) {
		personal.kickoutRequired = 0

		// Action the kick in game
		model.addHistory(rf.HIST_KICKOUT, personal.pov, 0, [controller.currentPlayerObj().displayName])

		controller.currentPlayerObj().moneyCash = -1
		controller.currentPlayerObj().moneyBank = -1
		controller.currentPlayerObj().moneyRoundIncome = 0

		// Set up end of turn vars
		store.context.selectedMergerBid = 0
		personal.kickoutRequired = 0
		personal.removeCurrentFlexTime = true
		personal.removeCurrentFlexTimeName = controller.currentPlayerObj().name

		if (store.gameflow.phase === rf.PHASE_BID_TURN_ORDER) {
			if (!store.ongoingVars.newTurnOrderBids.some((entry) => entry[0] === controller.currentPlayerIndex())) {
				store.ongoingVars.newTurnOrderBids.push([controller.currentPlayerIndex(), 0, model.getBidMultiplierAmount(controller.currentPlayerIndex())])
			}
		}

		await IO.kickout()

		controller.currentPlayerObj().displayName = rf.BOT_NAME

		let nbNonPlayers = 0
		for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++

		if (nbNonPlayers >= store.players.length - 1) {
			// Only 1 player left, so end game
			store.gameflow.phase = rf.PHASE_GAME_OVER
			model.endGame()
			await IO.saveGame(false, false)
			return
		} else controller.endPlayerTurn()
	}
}

export async function actionResign() {
	const store = useModelStore()
	const personal = usePersonalStore()

	controller.currentPlayerObj().moneyCash = -1
	controller.currentPlayerObj().moneyBank = -1
	controller.currentPlayerObj().moneyRoundIncome = 0

	model.addHistory(rf.HIST_RESIGN, controller.currentPlayerIndex(), 0, [controller.currentPlayerObj().displayName])

	// This just sets the server settings
	await IO.resign()

	store.clearVars()

	store.players[personal.pov].displayName = rf.BOT_NAME

	// Reform the turnOrder
	/*for (let i = 0; i < store.gameflow.fullTurnOrder.length; i++) {
		if (store.players[store.gameflow.fullTurnOrder[i]].displayName != rf.BOT_NAME) store.gameflow.turnOrder.push(store.gameflow.fullTurnOrder[i])
	}*/

	// Check that there is more than 1 player left, otherwise end game
	let nbNonPlayers = 0
	for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++

	if (nbNonPlayers >= store.players.length - 1) {
		// Only 1 player left, so end game
		store.gameflow.phase = rf.PHASE_GAME_OVER
		model.endGame()
		await IO.saveGame(false, false)
		return
	} else controller.endPlayerTurn()

	// This then ends and saves the game
	//controller.endPlayerTurn()

	// Save the game
	//IO.saveGame(false)
}
