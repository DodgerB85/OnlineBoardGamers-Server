import * as IO from "../backend/KFW_IO.js"
import * as rf from "./KFWreference"
import * as controller from "./KFWcontroller"
import * as model from "./KFWmodel"
import { useModelStore } from "../stores/KFWstore.js"
import { usePersonalStore } from "../stores/KFWpersonal"

export function removeBotPlayers() {
	const store = useModelStore()

	store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => store.players[idx].displayName !== rf.BOT_NAME)
}

export async function actionPlayerKickout() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.kickoutRequired === 2) {
		personal.kickoutRequired = 0

		// Ask the server first: 3p+ games need a majority vote to kick,
		// so this may only record a vote rather than actually kick.
		const result = await IO.kickout()
		if (result && result.voteCast) return

		// Action the kick in game
		model.addHistory(rf.HIST_KICKOUT, personal.pov, 0, [controller.currentPlayerObj().displayName])

		// Set up end of turn vars
		personal.removeCurrentFlexTime = true
		personal.removeCurrentFlexTimeName = controller.currentPlayerObj().name

		controller.currentPlayerObj().displayName = rf.BOT_NAME

		let nbNonPlayers = 0
		for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++

		if (nbNonPlayers >= store.players.length - 1) {
			// Only 1 player left, so end game
			store.gameflow.phase = rf.PHASE_GAME_OVER
			// This is done in the IO
			//model.endGame() 
			await IO.saveGameForGameOver()
			return
		} else if (!controller.isSimulPhase(store.gameflow.phase)) controller.endPlayerTurn(false)
		else {
			// Simul phase, so all moves have been removed, so reform turn order
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			removeBotPlayers()
			IO.saveGame(false, false)
		}
		
		//else controller.endPlayerTurn()
	}
}

export async function actionResign() {
	const store = useModelStore()
	const personal = usePersonalStore()

	model.addHistory(rf.HIST_RESIGN, controller.currentPlayerIndex(), 0, [controller.currentPlayerObj().displayName])

	// This just sets the server settings
	await IO.resign()

	store.clearContext()

	store.players[personal.pov].displayName = rf.BOT_NAME

	// Check that there is more than 1 player left, otherwise end game
	let nbNonPlayers = 0
	for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++

	if (nbNonPlayers >= store.players.length - 1) {
		// Only 1 player left, so end game
		store.gameflow.phase = rf.PHASE_GAME_OVER
		// This is done in the IO
		//model.endGame() 
		await IO.saveGameForGameOver()
		return
	} else controller.endPlayerTurn()
}
