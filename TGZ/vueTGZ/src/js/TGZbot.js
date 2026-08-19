import * as IO from "./TGZ_IO"
import * as rf from "./TGZreference"
import * as controller from "./TGZcontroller"
import * as model from "./TGZmodel"
import { useModelStore } from "../stores/TGZstore.js"
import { usePersonalStore } from "../stores/TGZpersonal"

export function actionAnyBotMoves() {
	const store = useModelStore()

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) return

	while (store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) {
		if (store.gameflow.phase === rf.PHASE_BID) {
			let pos = 0
			for (let i = store.ongoingVars.newTurnOrder.length - 1; i >= 0; i--) {
				if (store.ongoingVars.newTurnOrder[i] === -1) {
					pos = i
					store.ongoingVars.newTurnOrder[i] = controller.currentPlayerIndex()
					break
				}
			}
			model.addHistory(rf.HIST_BID, controller.currentPlayerIndex(), 0, [0, pos])
		}
		store.gameflow.turnOrder.shift()
	}

	if (store.gameflow.turnOrder.length === 0) {
		controller.endCurrentPhase()
	}
	controller.startPlayerTurn()
}

/**================================================================================================ */

export async function actionPlayerKickout() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.kickoutRequired === 2) {
		personal.kickoutRequired = 0

		const result = await IO.kickout()
		if (result && result.voteCast) return

		// Action the kick in game
		model.addHistory(rf.HIST_KICKOUT, personal.pov, 0, [controller.currentPlayerObj().displayName])

		store.context.selectedBid = 0
		if (store.gameflow.phase === rf.PHASE_BID) {
			// CODE COPIED
			//confirmBid(0)
			model.confirmBid_core(0)

			for (let i = store.ongoingVars.newTurnOrder.length - 1; i >= 0; i--) {
				if (store.ongoingVars.newTurnOrder[i] === -1) {
					store.ongoingVars.newTurnOrder[i] = controller.currentPlayerIndex()
					break
				}
			}

			store.context.action = rf.ACT_NONE
		}
		await IO.kickout()

		controller.currentPlayerObj().displayName = rf.BOT_NAME

		controller.endPlayerTurn()
	}
}

export async function actionResign() {
	model.addHistory(rf.HIST_RESIGN, controller.currentPlayerIndex(), 0, [controller.currentPlayerObj().displayName])

	await IO.resign()

	controller.currentPlayerObj().displayName = rf.BOT_NAME

	controller.endPlayerTurn()
}
