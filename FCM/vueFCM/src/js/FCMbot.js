import * as rf from "./FCMreference"
import * as model from "./FCMmodel"
import * as controller from "./FCMcontroller"
import * as rules from "./FCMrules"
import * as plyr from "./FCMplayer"
import * as IO from "../backend/FCM_IO"

import { useModelStore } from "../stores/FCMstore.js"
import { usePersonalStore } from "../stores/FCMpersonal"

export function makeBot(player) {
	player.displayName = rf.BOT_NAME
	if (player.money > 0) player.money *= -1
	else player.money = -1
}

export function removeBotPlayers() {
    const store = useModelStore()
	store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => store.players[idx].displayName != rf.BOT_NAME)
	// Second Bailout mod: bots never claim their gift - auto-decline so the
	// claim night cannot get stuck on an abandoned player
	if (store.bailout.pending) {
		store.bailout.order.forEach((idx) => {
			if (store.players[idx].displayName === rf.BOT_NAME && store.bailout.claims[idx] === undefined) rules.claimBailoutEmployee(idx, -1)
		})
	}
}

function generatePaydayDefaultMove(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	const due = rules.salary(playerIndex)

	if (due === 0) return [[-8], [-9]]

	let unitarySalary = plyr.hasMilestone(playerIndex, rf.FIRST_WAITRESS_USED) ? 3 : 5
	let fired = []
	const payableWithFood = rules.baseSalary(playerIndex)
	let remaining = due

	if (plyr.hasMilestone(playerIndex, rf.FIRST_BEER_SOLD)) {
		let itemCount = playerObj.resources.filter((r) => r !== rf.COFFEE).length
		remaining = rules.headhuntSalaryDue(playerIndex) + Math.max(payableWithFood - itemCount * unitarySalary, 0)
	}

	while (remaining > playerObj.money && playerObj.employees.length > 0) {
		let emp = playerObj.employees.pop()
		if (emp !== rf.BLANK_EMPLOYEE_SPACE) {
			fired.push(emp)
			const normalAfterFood = Math.max(rules.baseSalary(playerIndex) - (plyr.hasMilestone(playerIndex, rf.FIRST_BEER_SOLD) ? playerObj.resources.filter((r) => r !== rf.COFFEE).length * unitarySalary : 0), 0)
			remaining = rules.headhuntSalaryDue(playerIndex) + normalAfterFood
		}
	}

	if (fired.length > 0) return [fired, [-9]]
	if (plyr.hasMilestone(playerIndex, rf.FIRST_BEER_SOLD)) return [[-4], [-9]]
	return [[-8], [-9]]
}

function generateCleanupDefaultMove(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	if (!rules.isRequiredToPlayCleanUp(playerIndex)) return [[-9], [-8]]
	if (playerObj.resources.length <= 10) return [[-9], [-1]]
	let kept = playerObj.resources.slice(0, 10)
	let binned = playerObj.resources.slice(10)
	playerObj.resources = [...kept]
	return [[-9], [...binned]]
}

export function passKickout() {
    const store = useModelStore()
    const personal = usePersonalStore()
	personal.kickoutRequired = 0
	let timedOutPlayerIndex = store.gameflow.turnOrder[0]

	if (!controller.isSimulPhase()) {
		controller.endPlayerTurn(true, false)
		return
	}

	let moveData = []
	if (store.gameflow.phase === rf.PHASE_SETUP_RESERVE) {
		// A timed-out player never chose a reserve card. Give them the explicit
		// RES_CARD_NONE (RES_CARD_NOT_CHOSEN stays reserved for "not chosen"), and always
		// wrap in an array so the saved move matches the shape the server and
		// processSimulMoveData expect.
		if (store.reserveCards[timedOutPlayerIndex] === rf.RES_CARD_NOT_CHOSEN) store.reserveCards[timedOutPlayerIndex] = rf.RES_CARD_NONE
		moveData = [store.reserveCards[timedOutPlayerIndex]]
	} else if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) {
		let p = store.players[timedOutPlayerIndex]
		// Strip blank slots, exactly as endPlayerTurn does: a kicked player who never
		// placed anyone still has [BLANK_EMPLOYEE_SPACE x ceoSlots] in employees, and
		// saving those poisons the move data for every client that renders the
		// CHOOSE_STRUCTURE history entry
		moveData = [[...p.beach], p.employees.filter((e) => e !== rf.BLANK_EMPLOYEE_SPACE), parseInt(p.OOBpreference) || 0]
	} else if (store.gameflow.phase === rf.PHASE_PAYDAY) {
		let paydayMove = generatePaydayDefaultMove(timedOutPlayerIndex)
		moveData = [paydayMove, [-9]]
	} else if (store.gameflow.phase === rf.PHASE_CLEAN_UP) {
		moveData = [[[-9], []], generateCleanupDefaultMove(timedOutPlayerIndex)]
	}

	let savedPov = personal.pov
	personal.pov = timedOutPlayerIndex
	store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => idx !== timedOutPlayerIndex)
	IO.saveSimulMove(moveData)
	personal.pov = savedPov
}

export async function actionPlayerKickout() {
    const store = useModelStore()
    const personal = usePersonalStore()
	const timedOutPlayerIndex = store.gameflow.turnOrder[0]
	if (personal.kickoutRequired !== 2) return

	personal.kickoutRequired = 0
	let player = store.players[timedOutPlayerIndex]
	model.addHistory(rf.HIST_KICKOUT, [timedOutPlayerIndex, personal.pov], personal.pov, 0)
	makeBot(player)

	let result = await IO.kickout(timedOutPlayerIndex)
	if (result && result.voteCast) return

	// Count remaining human players
	const botCount = store.players.filter((p) => p.displayName === rf.BOT_NAME).length
	if (botCount >= store.players.length - 1) {
		model.endGame()
		await IO.saveGameNormal(false, false, false)
		return
	}

	// Advance turn - match old JS main.js flow
	if (store.gameflow.phase === rf.PHASE_TURN_ORDER) {
		for (let i = 0; i < store.gameflow.newTurnOrder.length; i++) {
			if (store.gameflow.newTurnOrder[i] === -1) {
				store.gameflow.newTurnOrder[i] = timedOutPlayerIndex
				break
			}
		}
	}
	if (controller.isSimulPhase(store.gameflow.phase)) {
		await IO.saveGameNormal(false, true, false)
	} else {
		await controller.endPlayerTurn(true, false)
	}
}

export function actionResign() {
    const store = useModelStore()
    const personal = usePersonalStore()
	const playerIndex = personal.pov >= 0 ? personal.pov : store.gameflow.turnOrder[0]
	let player = store.players[playerIndex]
	model.addHistory(rf.HIST_RESIGN, [], playerIndex, 0)
	makeBot(player)
	store.context.action = rf.ACT_NONE
	IO.resign(player.name)
}
