import * as model from "./BUSmodel.js"
import * as controller from "./BUScontroller.js"
import * as funcs from "../js/BUSfuncs.js"
import * as rf from "./BUSreference.js"

import { useModelStore } from "../stores/BUSstore.js"
import { usePersonalStore } from "../stores/BUSpersonal.js"

export function goToReplayStep(step) {
	const store = useModelStore()

	store.replayStep = step
	performStep(0)
}

export function performStep(amount) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.clearHistoryHelpers()
	if (amount === -99) store.replayStep = 0
	if (amount === -9) store.replayStep -= 5
	if (amount === -1) store.replayStep--
	if (amount === 1) store.replayStep++
	if (amount === 9) store.replayStep += 5
	if (amount === 99) store.replayStep = store.replayData.length - 1

	// Performing back to my last
	if (amount === -999) {
		let idx = store.replayStep
		idx--
		while (idx > 0) {
			let histEntry = store.history[idx]
			if (histEntry[1] === personal.pov) {
				store.replayStep = idx
				break
			}
			idx--
		}
	}

	if (store.replayStep < 0) store.replayStep = 0
	if (store.replayStep > store.replayData.length - 1) store.replayStep = store.replayData.length - 1

	funcs.importBUSmodel(store.replayData[store.replayStep], false, false)

	let requireHighlights = [rf.HIST_ADD_BLDG, rf.HIST_ADD_LINE, rf.HIST_VROM]
	if (requireHighlights.includes(store.history[store.replayStep][0])) setupReplayHighlights(store.history[store.replayStep][3])
}

function setupReplayHighlights(entry3) {
	const store = useModelStore()

	store.clearHistoryHelpers()

	if (store.history[store.replayStep][0] === rf.HIST_ADD_BLDG) store.historyHelpers.buildingsToHighlight = [...entry3]
	else if (store.history[store.replayStep][0] === rf.HIST_ADD_LINE) store.historyHelpers.linesToHighlight = [...entry3]
	else if (store.history[store.replayStep][0] === rf.HIST_VROM) {
		let junctions = []
		let buildings = []

		for (let i = 0; i < entry3.length; i++) {
			if (entry3[i].length > 1) {
				junctions.push(entry3[i][0])
				buildings.push([-1, entry3[i][1], entry3[i][2]])
			}
		}
		store.historyHelpers.buildingsToHighlight = [...buildings]
		store.historyHelpers.junctionsToHighlight = [...junctions]
	}
}

async function resetDataForReplay() {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.replayData.splice(0)

	for (let i = 0; i < store.players.length; i++) {
		store.players[i].score = 0.5 // Start at ZERO POINT FIVE
		store.players[i].maxScore = 0.5
		store.players[i].remainingActions = 20 // Start with 20
		store.players[i].timeStones = 0
		store.players[i].buses = 1 // Total of 5, start with 1
		store.players[i].endJunctions.splice(0)
		store.players[i].endLines.splice(0)
		store.players[i].playerJunctions.splice(0)
		if (!personal.trainingGame) store.players[i].displayName = store.players[i].name
	}
	for (let i = 0; i < store.junctions.length; i++) {
		for (let j = 0; j < store.junctions[i].length; j++) {
			if (personal.selectedBoard === rf.BOARD_PITTS) {
				store.junctions[i][j] = rf.initialJunctionsStateArrayPitts[i][j]
			} else {
				store.junctions[i][j] = rf.initialJunctionsStateArray[i][j]
			}
		}
	}
	store.desiredBuilding = 1
	store.remainingTimeStones = 5
	if (store.players.length === 3) store.remainingTimeStones--
	store.remainingPassengers = 11

	for (let i = 0; i < store.lines.length; i++) store.lines[i].splice(0)
	// actionAreaData
	for (let i = 0; i < store.actionAreaData.length; i++) {
		for (let j = 0; j < store.actionAreaData[i].length; j++) {
			store.actionAreaData[i][j] = -1
		}
	}
	store.gameflow.turn = 0
	store.gameflow.phase = 0
	store.gameflow.turnOrder.splice(0)
	store.gameflow.fullTurnOrder.splice(0)
	for (let i = 0; i < store.players.length; i++) {
		store.gameflow.turnOrder.push(i)
		store.gameflow.fullTurnOrder.push(i)
	}
	store.gameflow.gameEnded = 0

	store.resetVarsOnTurnEnd()
	store.clearHistoryHelpers()
}

function turnEndToPerform(historyIndex) {
	const store = useModelStore()

	const NOTHING = 0
	const PUSH_SHIFT = 1
	const SHIFT = 2

	if (store.gameflow.turnOrder.length === 0) {
		if (store.history[historyIndex][0] === rf.HIST_VROM) return SHIFT
		if (store.history[historyIndex][0] === rf.HIST_ALTER_TIME) return SHIFT
		return NOTHING
	}
	let entriesToIgnore = [rf.HIST_REWIND, rf.HIST_RESIGN, rf.HIST_KICKOUT]

	if (store.gameflow.turn === 0 && store.history[historyIndex][0] === rf.HIST_ADD_BLDG) {
		let index = historyIndex
		while (index >= 0 /*&& !entriesToIgnore.includes(store.history[index][0])*/) {
			if (index === 0) return NOTHING
			index--
			// if previous entry was differnt phase, do nothing. Else shift
			if (!entriesToIgnore.includes(store.history[index][0]) && store.history[index][0] !== rf.HIST_ADD_BLDG) return NOTHING
			else if (!entriesToIgnore.includes(store.history[index][0]) && store.history[index][0] === rf.HIST_ADD_BLDG) return SHIFT
		}
	} else if (store.history[historyIndex][0] === rf.HIST_ADD_LINE) return SHIFT
	else if (store.history[historyIndex][0] === rf.HIST_CHOOSE_ACTION) {
		// Need to find if the previous entry was a pass or not
		historyIndex--
		while (entriesToIgnore.includes(store.history[historyIndex][0])) historyIndex--
		if (store.history[historyIndex][0] === rf.HIST_NEW_TURN) return NOTHING
		if (store.history[historyIndex][3][0] >= 10) return SHIFT
		return PUSH_SHIFT
	} else if (store.history[historyIndex][0] === rf.HIST_ADD_BUS) return SHIFT
	else if (store.history[historyIndex][0] === rf.HIST_ADD_PAX) return SHIFT
	else if (store.gameflow.turn > 0 && store.history[historyIndex][0] === rf.HIST_ADD_BLDG) return SHIFT
	else if (store.history[historyIndex][0] === rf.HIST_ALTER_TIME) return SHIFT
	else if (store.history[historyIndex][0] === rf.HIST_VROM) return SHIFT
	else if (store.history[historyIndex][0] === rf.HIST_STARTING_PLAYER) return SHIFT
	return SHIFT
}

function replayCanSkipPhase() {
	const store = useModelStore()

	if (store.gameflow.phase === rf.PHASE_LINE_EXPANSION && funcs.removeItemAll(store.actionAreaData[0], -1).length === 0) return true
	if (store.gameflow.phase === rf.PHASE_ADD_BUS && funcs.removeItemAll(store.actionAreaData[1], -1).length === 0) return true
	if (store.gameflow.phase === rf.PHASE_ADD_PAX && funcs.removeItemAll(store.actionAreaData[2], -1).length === 0) return true
	if (store.gameflow.phase === rf.PHASE_ADD_BLDGS && funcs.removeItemAll(store.actionAreaData[3], -1).length === 0) return true
	if (store.gameflow.phase === rf.PHASE_VROM && funcs.removeItemAll(store.actionAreaData[5], -1).length === 0) return true
	return false
}

function performReplayEndTurn(historyIndex) {
	const NOTHING = 0
	const PUSH_SHIFT = 1
	const SHIFT = 2

	const store = useModelStore()

	if (turnEndToPerform(historyIndex) === NOTHING) return
	else if (turnEndToPerform(historyIndex) === PUSH_SHIFT) {
		store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
		return
	} else if (turnEndToPerform(historyIndex) === SHIFT && store.gameflow.turnOrder.length > 0) store.gameflow.turnOrder.shift()

	if (store.gameflow.turnOrder.length === 0) {
		// Skip phases that no one has chosen
		do {
			store.gameflow.phase++
			if (store.gameflow.phase > rf.PHASE_CHANGE_START_PLAYER) store.gameflow.phase = rf.PHASE_CHOOSE_ACTIONS
		} while (replayCanSkipPhase())

		if (store.gameflow.phase === rf.PHASE_SETUP_LINES) {
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder].concat([...store.gameflow.fullTurnOrder].reverse())
			store.gameflow.turnOrder.splice(store.players.length, 1)
		}
		// Phase choose actions
		// Phase Line Expansion
		else if (store.gameflow.phase === rf.PHASE_LINE_EXPANSION) {
			store.gameflow.turnOrder = funcs.removeItemAll([...store.actionAreaData[0]], -1)
			// Swap colour number for array index number
			for (let i = 0; i < store.gameflow.turnOrder.length; i++) store.gameflow.turnOrder[i] = controller.getPlayerIndexFromColour(store.gameflow.turnOrder[i])
			store.gameflow.fullActionTurnOrder = [...store.gameflow.turnOrder]
		}
		// Phase Add Bus
		else if (store.gameflow.phase === rf.PHASE_ADD_BUS) {
			if (store.actionAreaData[1][0] !== -1) {
				controller.getPlayerByColour(store.actionAreaData[1][0]).buses++
			}
		}
		// Phase Add Pax
		else if (store.gameflow.phase === rf.PHASE_ADD_PAX) {
			store.gameflow.turnOrder = funcs.removeItemAll([...store.actionAreaData[2]], -1)
			// Swap colour number for array index number
			for (let i = 0; i < store.gameflow.turnOrder.length; i++) store.gameflow.turnOrder[i] = controller.getPlayerIndexFromColour(store.gameflow.turnOrder[i])
			store.gameflow.fullActionTurnOrder = [...store.gameflow.turnOrder]
		}
		// Phase Add Bldgs
		else if (store.gameflow.phase === rf.PHASE_ADD_BLDGS) {
			store.gameflow.turnOrder = funcs.removeItemAll([...store.actionAreaData[3]], -1)
			// Swap colour number for array index number
			for (let i = 0; i < store.gameflow.turnOrder.length; i++) store.gameflow.turnOrder[i] = controller.getPlayerIndexFromColour(store.gameflow.turnOrder[i])
			store.gameflow.fullActionTurnOrder = [...store.gameflow.turnOrder]
		}
		// Phase alter time
		else if (store.gameflow.phase === rf.PHASE_ALTER_TIME) {
			let botAlterTime = false
			if (store.actionAreaData[4][0] !== -1) {
				store.gameflow.turnOrder = [store.actionAreaData[4][0]]
				store.gameflow.turnOrder[0] = controller.getPlayerIndexFromColour(store.gameflow.turnOrder[0])
				if (store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) botAlterTime = true
				//Bot.updateTurnOrder()
			}
			if (botAlterTime || store.actionAreaData[4][0] === -1 || store.gameflow.turnOrder.length === 0) {
				// do nothing
			}
		}
		// Phase VROM
		else if (store.gameflow.phase === rf.PHASE_VROM) {
			model.moveAllPassengersOntoCorrectBuilding(store.desiredBuilding)
			store.gameflow.turnOrder = funcs.removeItemAll([...store.actionAreaData[5]], -1)
			// Swap colour number for array index number
			for (let i = 0; i < store.gameflow.turnOrder.length; i++) store.gameflow.turnOrder[i] = controller.getPlayerIndexFromColour(store.gameflow.turnOrder[i])
			store.gameflow.fullActionTurnOrder = [...store.gameflow.turnOrder]
		}
		// Phase Change Start Player
		else if (store.gameflow.phase === rf.PHASE_CHANGE_START_PLAYER) {
			// do nothing
		}
	}
}

function replayAddLine(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	performReplayEndTurn(historyIndex)

	for (let i = 0; i < entry3.length; i++) {
		model.addLine_core(playerIndex, entry3[i][0])
	}
}

function replayAddBuilding(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	performReplayEndTurn(historyIndex)

	for (let i = 0; i < entry3.length; i++) {
		store.junctions[entry3[i][1]][entry3[i][2]] = entry3[i][0]
	}
}

function replayChooseAction(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	performReplayEndTurn(historyIndex)

	if (entry3[0] < 10) {
		store.players[playerIndex].remainingActions--
		store.actionAreaData[entry3[0]][entry3[1]] = store.players[playerIndex].colour
	}
}

function replayNewTurn(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	performReplayEndTurn(historyIndex)

	/** Cheat detection - check for real time end game */
	if (model.getEmptyBuildingSpots(true).length === 0) store.gameflow.gameEnded = 2
	var eligiblePlayers = 0
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].remainingActions > 0) eligiblePlayers++
	}
	if (eligiblePlayers <= 1) store.gameflow.gameEnded = 3
	if (store.gameflow.gameEnded > 0) {
		store.gameflow.phase = rf.PHASE_GAME_OVER
		model.endGame()
		return
	}

	store.gameflow.turn++
	store.gameflow.phase = rf.PHASE_CHOOSE_ACTIONS
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
	// remove all non players
	for (let i = store.gameflow.turnOrder.length - 1; i >= 0; i--) {
		if (store.players[store.gameflow.turnOrder[i]].displayName === rf.BOT_NAME || store.players[store.gameflow.turnOrder[i]].remainingActions === 0) {
			store.gameflow.turnOrder.splice(i, 1)
		}
	}
	for (let i = 0; i < store.actionAreaData.length; i++) {
		for (let j = 0; j < store.actionAreaData[i].length; j++) {
			store.actionAreaData[i][j] = -1
		}
	}
}

function replayAddBus(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	performReplayEndTurn(historyIndex)

	store.players[playerIndex].buses++
}

function replayAddPax(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	performReplayEndTurn(historyIndex)

	for (let i = 0; i < entry3.length; i++) {
		if (entry3[i].length != undefined) alert("Anomaly detected. Please submit bug report")
		if (entry3[i].length == undefined && entry3[i] !== -1) {
			store.junctions[entry3[i]][rf.paxIdx]++
			store.remainingPassengers--
		}
	}
}

function replayAlterTime(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	performReplayEndTurn(historyIndex)

	// If no player, or not stopping
	if (store.history[historyIndex][1] === -1 || entry3[1] === 0) {
		store.desiredBuilding++
		if (store.desiredBuilding === 4) store.desiredBuilding = 1
	} else if (entry3[1] === 1) {
		store.players[playerIndex].timeStones++
		model.decreaseScore(store.players[playerIndex])
		store.remainingTimeStones--
		// ADD GAME END CHECK
	}
}

function replayVrom(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	performReplayEndTurn(historyIndex)

	for (let i = 0; i < entry3.length; i++) {
		if (entry3[i].length > 1) {
			// Remove a pax from the junction
			store.junctions[entry3[i][0]][rf.paxIdx]--
			// Add onto the building
			store.junctions[entry3[i][1]][entry3[i][2]] += 10
			// Increase scre
			model.increaseScore(store.players[playerIndex])
		}
	}
}

function replayStartingPlayer(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	performReplayEndTurn(historyIndex)

	model.moveAllPassengersOntoJunctions()
	// change start plasyer
	if (store.actionAreaData[6][0] !== -1) {
		store.gameflow.turnOrder = [controller.getPlayerIndexFromColour(store.actionAreaData[6][0])]
		let newStartPlayer = controller.getPlayerIndexFromColour(store.actionAreaData[6][0])
		var i = 0
		do {
			store.gameflow.fullTurnOrder.push(store.gameflow.fullTurnOrder.shift())
			i++
			if (i === 10) break
		} while (store.gameflow.fullTurnOrder[0] !== newStartPlayer)
	}
	// Otherwise player to the left is now starting
	else {
		store.gameflow.fullTurnOrder.push(store.gameflow.fullTurnOrder.shift())
	}

	// Required as pausing here in replay
	store.gameflow.phase = rf.PHASE_CHANGE_START_PLAYER
}

function replayGameEnd(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	store.gameflow.phase = rf.PHASE_GAME_OVER
	let scoreObj = model.getScoreObj()
	let resArr = [...store.players]
	for (let i = 0; i < resArr.length; i++) resArr[i].playerIndex = i
	let order = []
	for (let i = 0; i < scoreObj.length; i++) {
		for (let j = 0; j < scoreObj[i][1].length; j++) {
			let player = resArr.find((el) => el.colour === scoreObj[i][1][j])
			order.push(player.playerIndex)
		}
	}
	store.gameflow.turnOrder.push(order[0])
}

function replayMissingPlayer(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	performReplayEndTurn(historyIndex)

	store.players[store.history[historyIndex][1]].displayName = rf.BOT_NAME
	store.players[store.history[historyIndex][1]].remainingActions = 0
	store.players[store.history[historyIndex][1]].score = 0
}

export async function generateReplayData() {
	const store = useModelStore()
	store.topMenuViews.generatingReplay = true
	// Reset the data
	await resetDataForReplay()
	const pBarEl = document.querySelector(".progress-bar div")
	const pBarTextEl = document.querySelector(".progress-bar span")
	for (let i = 0; i < store.history.length; i++) {
		if (store.history[i][0] === rf.HIST_ADD_LINE) replayAddLine(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_ADD_BLDG) replayAddBuilding(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_CHOOSE_ACTION) replayChooseAction(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_NEW_TURN) replayNewTurn(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_ADD_BUS) replayAddBus(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_ADD_PAX) replayAddPax(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_ALTER_TIME) replayAlterTime(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_VROM) replayVrom(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_STARTING_PLAYER) replayStartingPlayer(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_KICKOUT) replayMissingPlayer(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_RESIGN) replayMissingPlayer(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_GAME_END) replayGameEnd(i, store.history[i][1], store.history[i][3])

		store.replayData.push(funcs.exportBUSmodel(false))

		if (i % 5 === 0 && pBarEl != null) {
			let percent = (i / store.history.length) * 100
			pBarEl.style.width = percent + "%"
			pBarTextEl.innerText = Math.round(percent) + "%"
			await funcs.sleep(0)
		}
	}
	store.topMenuViews.generatingReplay = false
	store.replayStep = store.replayData.length - 1
	store.topMenuViews.showReplay = true
}
