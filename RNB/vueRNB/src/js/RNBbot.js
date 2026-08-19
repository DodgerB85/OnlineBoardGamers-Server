import * as IO from "../backend/RNB_IO.js"
import * as rf from "./RNBreference"
import * as controller from "./RNBcontroller"
import * as model from "./RNBmodel"
import * as wonder from "./RNBwonder"
import * as context from "./RNBcontext.js"
import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal"

export function removeBotPlayers() {
	const store = useModelStore()
	store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => store.players[idx].displayName != rf.BOT_NAME)
}

export function moveBotsToStartOfPlayerIndexArray(arr) {
	const store = useModelStore()
	const bots = []
	const nonBots = []

	// 1. Separate bots from humans, safely ignoring -1 and invalid values
	for (const idx of arr) {
		if (idx === -1 || idx === undefined || idx === null) continue

		const player = store.players?.[idx]
		if (player?.displayName === rf.BOT_NAME) {
			bots.push(idx)
		} else {
			nonBots.push(idx)
		}
	}

	let botIdx = 0
	let nonBotIdx = 0

	// 2. Map over the original array to build and return a fresh copy
	const sortedResult = arr.map((item) => {
		if (item === -1 || item === undefined || item === null) {
			return item // Keep slot fillers locked exactly where they were
		}
		if (botIdx < bots.length) {
			return bots[botIdx++]
		}
		return nonBots[nonBotIdx++]
	})

	return sortedResult
}

export async function actionPlayerKickout() {
	const store = useModelStore()
	const personal = usePersonalStore()

	const timedOutPlayerIndex = controller.timedOutPlayerIndex()
	if (personal.kickoutRequired === 2) {
		personal.kickoutRequired = 0
		const playerObj = controller.timedOutPlayerObj()

		// Ask the server first: 3p+ games need a majority vote to kick,
		// so this may only record a vote rather than actually kick.
		const result = await IO.kickout(timedOutPlayerIndex)
		if (result && result.voteCast) return

		// Action the kick in game
		model.addHistory(rf.HIST_KICKOUT, personal.pov, 0, [timedOutPlayerIndex])

		playerObj.displayName = rf.BOT_NAME

		let nbNonPlayers = 0
		for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++

		if (nbNonPlayers >= store.players.length - 1) {
			// Only 1 player left, so end game
			store.gameflow.phase = rf.PHASE_GAME_OVER
			wonder.checkAndPerformEndGame()
			if (store.gameflow.phase === rf.PHASE_GAME_OVER) IO.saveGame()
			return
		} else {
			store.actionStack.splice(0)
			/*store.conflictPreset.conflictDecision = rf.CONFLICT_DECISION_NO_CONFLICT
			store.conflictPreset.prayingDecision = rf.CONFLICT_PRAYING_CASH_IN
			store.conflictPreset.turnOrderDecision = rf.CONFLICT_TURN_ORDER_EARLIEST*/

			await controller.endPlayerTurn()

			store.context.resIDsOnHomeTile.splice(0)
			store.context.resIDsInWonderBrick.splice(0)
			store.context.possibleDonkeyReproductionData.splice(0)

			const phase = store.gameflow.phase

			if (store.gameflow.phase === rf.PHASE_CHOOSE_HOME_TILE) {
				store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => idx !== timedOutPlayerIndex)
				if (store.gameflow.turnOrder.length === 0) {
					controller.endCurrentPhase()
					controller.startPhase()
				}
				await IO.saveGame(false, false)
				return
			}

			if (rf.MAIN_PHASES.includes(phase)) {
				
				store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => idx !== timedOutPlayerIndex)
				removeBotPlayers()

				if (store.gameflow.turnOrder.length === 0) {
					controller.endCurrentPhase()
					controller.startPhase()
				}

				await IO.saveGame(true, false)
				return
			}

			if (rf.ALL_PHASE_CONFLICTS.includes(phase)) {
				/*store.conflictPreset.conflictDecision = rf.CONFLICT_DECISION_NO_CONFLICT
				store.conflictPreset.prayingDecision = rf.CONFLICT_PRAYING_CASH_IN
				store.conflictPreset.turnOrderDecision = rf.CONFLICT_TURN_ORDER_EARLIEST*/

				if (rf.PHASE_CONFLICT_DECISIONS.includes(phase)) {
					store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => idx !== timedOutPlayerIndex)
					removeBotPlayers()
				} else if (rf.PHASE_CONFLICT_PRAYINGS.includes(phase) || rf.PHASE_CONFLICT_TURN_ORDERS.includes(phase)) {
					store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => idx !== timedOutPlayerIndex)
					removeBotPlayers()
					if (store.gameflow.turnOrder.length === 1) controller.processOnePlayerLeftDuringConflict()
				}

				await IO.saveConflictMove()
			}
		}
	}
}

export async function actionResign() {
	const store = useModelStore()
	const personal = usePersonalStore()

	model.addHistory(rf.HIST_RESIGN, controller.currentPlayerIndex(), 0, [controller.currentPlayerObj().displayName])

	// This just sets the server settings
	await IO.resign()

	context.resetContextAndHighlights()

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
		//store.gameflow.phase = rf.PHASE_GAME_OVER
		wonder.checkAndPerformEndGame()
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) IO.saveGame()

		return
	} else controller.endPlayerTurn()

	// This then ends and saves the game
	//controller.endPlayerTurn()

	// Save the game
	//IO.saveGame(false)
}
