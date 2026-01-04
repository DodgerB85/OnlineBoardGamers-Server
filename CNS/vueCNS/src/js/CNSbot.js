import * as IO from "./CNS_IO"
import * as rf from "./CNSreference"
import * as controller from "./CNScontroller"
import * as model from "./CNSmodel"
import { useModelStore } from "../stores/CNSstore.js"
import { usePersonalStore } from "../stores/CNSpersonal"

export function actionAnyBotMooves() {
	const store = useModelStore()

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) return

	while (store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) {
		store.gameflow.turnOrder.shift()
	}

	if (store.gameflow.turnOrder.length === 0) {
		model.endTurn()
	}

	while (store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) {
		store.gameflow.turnOrder.shift()
	}
}

export async function actionPlayerKickout() {
	const personal = usePersonalStore()
	if (personal.kickoutRequired === 2) {
		personal.kickoutRequired = 0

		// Action the kick in game
		model.addHistory(rf.HIST_KICKOUT, personal.pov, 0, [controller.currentPlayerObj().displayName])

		await IO.kickout()

		controller.currentPlayerObj().displayName = rf.BOT_NAME

		controller.endPlayerTurn()
	}
}

export async function actionResign() {
	controller.currentPlayerObj().score = -1
	model.addHistory(rf.HIST_RESIGN, controller.currentPlayerIndex(), 0, [controller.currentPlayerObj().displayName])

	await IO.resign()

	controller.currentPlayerObj().displayName = rf.BOT_NAME

	controller.endPlayerTurn()
}
