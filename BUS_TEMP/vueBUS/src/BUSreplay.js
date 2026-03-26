import { useModelStore } from "./stores/model.js"

import * as refFuncs from "./refFuncs"
import { /*initialPlayersState,*/ /*initialLinesState,*/ initialJunctionsStateArray } from "./seed.js"

import * as constants from "./constants"
import { usePersonalStore } from "./stores/personal.js"

export function goToReplayStep(step) {
	const model = useModelStore()

	model.replayStep = step
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

	store.importModel(store.replayData[store.replayStep])

	let requireHighlights = [constants.HIST_ADD_BLDG, constants.HIST_ADD_LINE, constants.HIST_VROM]
	if (requireHighlights.includes(store.history[store.replayStep][0])) setupReplayHighlights(store.history[store.replayStep][3])
}

function setupReplayHighlights(entry3) {
	const model = useModelStore()

	model.clearHistoryHelpers()

	if (model.history[model.replayStep][0] === constants.HIST_ADD_BLDG) model.historyHelpers.buildingsToHighlight = [...entry3]
	else if (model.history[model.replayStep][0] === constants.HIST_ADD_LINE) model.historyHelpers.linesToHighlight = [...entry3]
	else if (model.history[model.replayStep][0] === constants.HIST_VROM) {
		let junctions = []
		let buildings = []

		for (let i = 0; i < entry3.length; i++) {
			if (entry3[i].length > 1) {
				junctions.push(entry3[i][0])
				buildings.push([-1, entry3[i][1], entry3[i][2]])
			}
		}
		model.historyHelpers.buildingsToHighlight = [...buildings]
		model.historyHelpers.junctionsToHighlight = [...junctions]
	}
}

async function resetDataForReplay() {
	const model = useModelStore()
	const personal = usePersonalStore()

	model.replayData.splice(0)

	for (let i = 0; i < model.players.length; i++) {
		model.players[i].score = 0.5 // Start at ZERO POINT FIVE
		model.players[i].maxScore = 0.5
		model.players[i].remainingActions = 20 // Start with 20
		model.players[i].timeStones = 0
		model.players[i].buses = 1 // Total of 5, start with 1
		model.players[i].endJunctions.splice(0)
		model.players[i].endLines.splice(0)
		model.players[i].playerJunctions.splice(0)
		if (!personal.trainingGame) model.players[i].displayName = model.players[i].name
	}
	for (let i = 0; i < model.junctions.length; i++) {
		for (let j = 0; j < model.junctions[i].length; j++) {
			model.junctions[i][j] = initialJunctionsStateArray[i][j]
		}
	}
	model.desiredBuilding = 1
	model.remainingTimeStones = 5
	if (model.players.length === 3) model.remainingTimeStones--
	model.remainingPassengers = 11

	for (let i = 0; i < model.lines.length; i++) model.lines[i].splice(0)
	// actionAreaData
	for (let i = 0; i < model.actionAreaData.length; i++) {
		for (let j = 0; j < model.actionAreaData[i].length; j++) {
			model.actionAreaData[i][j] = -1
		}
	}
	model.gameflow.turn = 0
	model.gameflow.phase = 0
	model.gameflow.turnOrder.splice(0)
	model.gameflow.fullTurnOrder.splice(0)
	for (let i = 0; i < model.players.length; i++) {
		model.gameflow.turnOrder.push(i)
		model.gameflow.fullTurnOrder.push(i)
	}
	model.gameflow.gameEnded = 0

	model.resetVarsOnTurnEnd()
	model.clearHistoryHelpers()
}

function turnEndToPerform(historyIndex) {
	const model = useModelStore()

	const NOTHING = 0
	const PUSH_SHIFT = 1
	const SHIFT = 2

	if (model.gameflow.turnOrder.length === 0) {
		if (model.history[historyIndex][0] === constants.HIST_VROM) return SHIFT
		if (model.history[historyIndex][0] === constants.HIST_ALTER_TIME) return SHIFT
		return NOTHING
	}
	let entriesToIgnore = [constants.HIST_REWIND, constants.HIST_RESIGN, constants.HIST_KICKOUT]

	if (model.gameflow.turn === 0 && model.history[historyIndex][0] === constants.HIST_ADD_BLDG) {
		let index = historyIndex
		while (index >= 0 /*&& !entriesToIgnore.includes(model.history[index][0])*/) {
			if (index === 0) return NOTHING
			index--
			// if previous entry was differnt phase, do nothing. Else shift
			if (!entriesToIgnore.includes(model.history[index][0]) && model.history[index][0] !== constants.HIST_ADD_BLDG) return NOTHING
			else if (!entriesToIgnore.includes(model.history[index][0]) && model.history[index][0] === constants.HIST_ADD_BLDG) return SHIFT
		}
	} else if (model.history[historyIndex][0] === constants.HIST_ADD_LINE) return SHIFT
	else if (model.history[historyIndex][0] === constants.HIST_CHOOSE_ACTION) {
		// Need to find if the previous entry was a pass or not
		historyIndex--
		while (entriesToIgnore.includes(model.history[historyIndex][0])) historyIndex--
		if (model.history[historyIndex][0] === constants.HIST_NEW_TURN) return NOTHING
		if (model.history[historyIndex][3][0] >= 10) return SHIFT
		return PUSH_SHIFT
	} else if (model.history[historyIndex][0] === constants.HIST_ADD_BUS) return SHIFT
	else if (model.history[historyIndex][0] === constants.HIST_ADD_PAX) return SHIFT
	else if (model.gameflow.turn > 0 && model.history[historyIndex][0] === constants.HIST_ADD_BLDG) return SHIFT
	else if (model.history[historyIndex][0] === constants.HIST_ALTER_TIME) return SHIFT
	else if (model.history[historyIndex][0] === constants.HIST_VROM) return SHIFT
	else if (model.history[historyIndex][0] === constants.HIST_STARTING_PLAYER) return SHIFT
	return SHIFT
}

function replayCanSkipPhase() {
	const model = useModelStore()

	if (model.gameflow.phase === constants.PHASE_LINE_EXPANSION && refFuncs.removeItemAll(model.actionAreaData[0], -1).length === 0) return true
	if (model.gameflow.phase === constants.PHASE_ADD_BUS && refFuncs.removeItemAll(model.actionAreaData[1], -1).length === 0) return true
	if (model.gameflow.phase === constants.PHASE_ADD_PAX && refFuncs.removeItemAll(model.actionAreaData[2], -1).length === 0) return true
	if (model.gameflow.phase === constants.PHASE_ADD_BLDGS && refFuncs.removeItemAll(model.actionAreaData[3], -1).length === 0) return true
	if (model.gameflow.phase === constants.PHASE_VROM && refFuncs.removeItemAll(model.actionAreaData[5], -1).length === 0) return true
	return false
}

function performReplayEndTurn(historyIndex) {
	const NOTHING = 0
	const PUSH_SHIFT = 1
	const SHIFT = 2

	const model = useModelStore()

	if (turnEndToPerform(historyIndex) === NOTHING) return
	else if (turnEndToPerform(historyIndex) === PUSH_SHIFT) {
		model.gameflow.turnOrder.push(model.gameflow.turnOrder.shift())
		return
	} else if (turnEndToPerform(historyIndex) === SHIFT && model.gameflow.turnOrder.length > 0) model.gameflow.turnOrder.shift()

	if (model.gameflow.turnOrder.length === 0) {
		// Skip phases that no one has chosen
		do {
			model.gameflow.phase++
			if (model.gameflow.phase > constants.PHASE_CHANGE_START_PLAYER) model.gameflow.phase = constants.PHASE_CHOOSE_ACTIONS
		} while (replayCanSkipPhase())

		if (model.gameflow.phase === constants.PHASE_SETUP_LINES) {
			model.gameflow.turnOrder = [...model.gameflow.fullTurnOrder].concat([...model.gameflow.fullTurnOrder].reverse())
			model.gameflow.turnOrder.splice(model.players.length, 1)
		}
		// Phase choose actions
		// Phase Line Expansion
		else if (model.gameflow.phase === constants.PHASE_LINE_EXPANSION) {
			model.gameflow.turnOrder = refFuncs.removeItemAll([...model.actionAreaData[0]], -1)
			// Swap colour number for array index number
			for (let i = 0; i < model.gameflow.turnOrder.length; i++) model.gameflow.turnOrder[i] = model.getPlayerIndexFromColour(model.gameflow.turnOrder[i])
			model.gameflow.fullActionTurnOrder = [...model.gameflow.turnOrder]
		}
		// Phase Add Bus
		else if (model.gameflow.phase === constants.PHASE_ADD_BUS) {
			model.gameflow.turnOrder = refFuncs.removeItemAll([...model.actionAreaData[1]], -1)
			// Swap colour number for array index number
			for (let i = 0; i < model.gameflow.turnOrder.length; i++) model.gameflow.turnOrder[i] = model.getPlayerIndexFromColour(model.gameflow.turnOrder[i])
			model.gameflow.fullActionTurnOrder = [...model.gameflow.turnOrder]
			// Re running this loop, so start turn after
			return
		}
		// Phase Add Pax
		else if (model.gameflow.phase === constants.PHASE_ADD_PAX) {
			model.gameflow.turnOrder = refFuncs.removeItemAll([...model.actionAreaData[2]], -1)
			// Swap colour number for array index number
			for (let i = 0; i < model.gameflow.turnOrder.length; i++) model.gameflow.turnOrder[i] = model.getPlayerIndexFromColour(model.gameflow.turnOrder[i])
			model.gameflow.fullActionTurnOrder = [...model.gameflow.turnOrder]
		}
		// Phase Add Bldgs
		else if (model.gameflow.phase === constants.PHASE_ADD_BLDGS) {
			model.gameflow.turnOrder = refFuncs.removeItemAll([...model.actionAreaData[3]], -1)
			// Swap colour number for array index number
			for (let i = 0; i < model.gameflow.turnOrder.length; i++) model.gameflow.turnOrder[i] = model.getPlayerIndexFromColour(model.gameflow.turnOrder[i])
			model.gameflow.fullActionTurnOrder = [...model.gameflow.turnOrder]
		}
		// Phase alter time
		else if (model.gameflow.phase === constants.PHASE_ALTER_TIME) {
			let botAlterTime = false
			if (model.actionAreaData[4][0] !== -1) {
				model.gameflow.turnOrder = [model.actionAreaData[4][0]]
				model.gameflow.turnOrder[0] = model.getPlayerIndexFromColour(model.gameflow.turnOrder[0])
				if (model.players[model.gameflow.turnOrder[0]].displayName === "BusBot") botAlterTime = true
				//Bot.updateTurnOrder()
			}
			if (botAlterTime || model.actionAreaData[4][0] === -1 || model.gameflow.turnOrder.length === 0) {
				// do nothing
			}
		}
		// Phase VROM
		else if (model.gameflow.phase === constants.PHASE_VROM) {
			model.moveAllPassengersOntoCorrectBuilding(model.desiredBuilding.value)
			model.gameflow.turnOrder = refFuncs.removeItemAll([...model.actionAreaData[5]], -1)
			// Swap colour number for array index number
			for (let i = 0; i < model.gameflow.turnOrder.length; i++) model.gameflow.turnOrder[i] = model.getPlayerIndexFromColour(model.gameflow.turnOrder[i])
			model.gameflow.fullActionTurnOrder = [...model.gameflow.turnOrder]
		}
		// Phase Change Start Player
		else if (model.gameflow.phase === constants.PHASE_CHANGE_START_PLAYER) {
			// do nothing
		}
	}
}

function replayAddLine(historyIndex, playerIndex, entry3) {
	const model = useModelStore()

	performReplayEndTurn(historyIndex)

	for (let i = 0; i < entry3.length; i++) {
		model.addLine_core(playerIndex, entry3[i][0])
	}
}

function replayAddBuilding(historyIndex, playerIndex, entry3) {
	const model = useModelStore()

	performReplayEndTurn(historyIndex)

	for (let i = 0; i < entry3.length; i++) {
		model.junctions[entry3[i][1]][entry3[i][2]] = entry3[i][0]
	}
}

function replayChooseAction(historyIndex, playerIndex, entry3) {
	const model = useModelStore()

	performReplayEndTurn(historyIndex)

	if (entry3[0] < 10) {
		model.players[playerIndex].remainingActions--
		model.actionAreaData[entry3[0]][entry3[1]] = model.players[playerIndex].colour
	}
}

function replayNewTurn(historyIndex, playerIndex, entry3) {
	const model = useModelStore()

	performReplayEndTurn(historyIndex)

	/** Cheat detection - check for real time end game */
	if (model.getEmptyBuildingSpots(true).length === 0) model.gameflow.gameEnded = 2
	var eligiblePlayers = 0
	for (let i = 0; i < model.players.length; i++) {
		if (model.players[i].remainingActions > 0) eligiblePlayers++
	}
	if (eligiblePlayers <= 1) model.gameflow.gameEnded = 3
	if (model.gameflow.gameEnded > 0) {
		model.gameflow.phase = constants.PHASE_GAME_OVER
		model.endGame()
		return
	}

	model.gameflow.turn++
	model.gameflow.phase = constants.PHASE_CHOOSE_ACTIONS
	model.gameflow.turnOrder = [...model.gameflow.fullTurnOrder]
	// remove all non players
	for (let i = model.gameflow.turnOrder.length - 1; i >= 0; i--) {
		if (model.players[model.gameflow.turnOrder[i]].displayName === "BusBot" || model.players[model.gameflow.turnOrder[i]].remainingActions === 0) {
			model.gameflow.turnOrder.splice(i, 1)
		}
	}
	for (let i = 0; i < model.actionAreaData.length; i++) {
		for (let j = 0; j < model.actionAreaData[i].length; j++) {
			model.actionAreaData[i][j] = -1
		}
	}
}

function replayAddBus(historyIndex, playerIndex, entry3) {
	const model = useModelStore()

	performReplayEndTurn(historyIndex)

	model.players[playerIndex].buses++
}

function replayAddPax(historyIndex, playerIndex, entry3) {
	const model = useModelStore()

	performReplayEndTurn(historyIndex)

	for (let i = 0; i < entry3.length; i++) {
		if (entry3[i].length != undefined) alert("Anomaly detected. Please submit bug report")
		if (entry3[i].length == undefined && entry3[i] !== -1) {
			model.junctions[entry3[i]][constants.paxIdx]++
			model.remainingPassengers--
		}
	}
}

function replayAlterTime(historyIndex, playerIndex, entry3) {
	const model = useModelStore()

	performReplayEndTurn(historyIndex)

	// If no player, or not stopping
	if (model.history[historyIndex][1] === -1 || entry3[1] === 0) {
		model.desiredBuilding++
		if (model.desiredBuilding === 4) model.desiredBuilding = 1
	} else if (entry3[1] === 1) {
		model.players[playerIndex].timeStones++
		model.decreaseScore(model.players[playerIndex])
		model.remainingTimeStones--
		// ADD GAME END CHECK
	}
}

function replayVrom(historyIndex, playerIndex, entry3) {
	const model = useModelStore()

	performReplayEndTurn(historyIndex)

	for (let i = 0; i < entry3.length; i++) {
		if (entry3[i].length > 1) {
			// Remove a pax from the junction
			model.junctions[entry3[i][0]][constants.paxIdx]--
			// Add onto the building
			model.junctions[entry3[i][1]][entry3[i][2]] += 10
			// Increase scre
			model.increaseScore(model.players[playerIndex])
		}
	}
}

function replayStartingPlayer(historyIndex, playerIndex, entry3) {
	const model = useModelStore()

	performReplayEndTurn(historyIndex)

	model.moveAllPassengersOntoJunctions()
	// change start plasyer
	if (model.actionAreaData[6][0] !== -1) {
		model.gameflow.turnOrder = [model.getPlayerIndexFromColour(model.actionAreaData[6][0])]
		let newStartPlayer = model.getPlayerIndexFromColour(model.actionAreaData[6][0])
		var i = 0
		do {
			model.gameflow.fullTurnOrder.push(model.gameflow.fullTurnOrder.shift())
			i++
			if (i === 10) break
		} while (model.gameflow.fullTurnOrder[0] !== newStartPlayer)
	}
	// Otherwise player to the left is now starting
	else {
		model.gameflow.fullTurnOrder.push(model.gameflow.fullTurnOrder.shift())
	}

	// Required as pausing here in replay
	model.gameflow.phase = constants.PHASE_CHANGE_START_PLAYER
}

function replayGameEnd(historyIndex, playerIndex, entry3) {
	const model = useModelStore()
	model.gameflow.phase = constants.PHASE_GAME_OVER
	model.gameflow.turnOrder.push(model.getPlayerIndexOrderForTable()[0])
}

function replayMissingPlayer(historyIndex, playerIndex, entry3) {
	const model = useModelStore()

	performReplayEndTurn(historyIndex)

	model.players[model.history[historyIndex][1]].displayName = "BusBot"
	model.players[model.history[historyIndex][1]].remainingActions = 0
	model.players[model.history[historyIndex][1]].score = 0
}

export async function generateReplayData() {
	const model = useModelStore()
	model.topMenuViews.generatingReplay = true
	// Reset the data
	await resetDataForReplay()
	const pBarEl = document.querySelector(".progress-bar div")
	const pBarTextEl = document.querySelector(".progress-bar span")
	for (let i = 0; i < model.history.length; i++) {
		if (model.history[i][0] === constants.HIST_ADD_LINE) replayAddLine(i, model.history[i][1], model.history[i][3])
		else if (model.history[i][0] === constants.HIST_ADD_BLDG) replayAddBuilding(i, model.history[i][1], model.history[i][3])
		else if (model.history[i][0] === constants.HIST_CHOOSE_ACTION) replayChooseAction(i, model.history[i][1], model.history[i][3])
		else if (model.history[i][0] === constants.HIST_NEW_TURN) replayNewTurn(i, model.history[i][1], model.history[i][3])
		else if (model.history[i][0] === constants.HIST_ADD_BUS) replayAddBus(i, model.history[i][1], model.history[i][3])
		else if (model.history[i][0] === constants.HIST_ADD_PAX) replayAddPax(i, model.history[i][1], model.history[i][3])
		else if (model.history[i][0] === constants.HIST_ALTER_TIME) replayAlterTime(i, model.history[i][1], model.history[i][3])
		else if (model.history[i][0] === constants.HIST_VROM) replayVrom(i, model.history[i][1], model.history[i][3])
		else if (model.history[i][0] === constants.HIST_STARTING_PLAYER) replayStartingPlayer(i, model.history[i][1], model.history[i][3])
		else if (model.history[i][0] === constants.HIST_KICKOUT) replayMissingPlayer(i, model.history[i][1], model.history[i][3])
		else if (model.history[i][0] === constants.HIST_RESIGN) replayMissingPlayer(i, model.history[i][1], model.history[i][3])
		else if (model.history[i][0] === constants.HIST_GAME_END) replayGameEnd(i, model.history[i][1], model.history[i][3])

		model.replayData.push(model.exportModel())

		if (i % 5 === 0 && pBarEl != null) {
			let percent = (i / model.history.length) * 100
			pBarEl.style.width = percent + "%"
			pBarTextEl.innerText = Math.round(percent) + "%"
			await refFuncs.sleep(0)
		}
	}
	model.topMenuViews.generatingReplay = false
	model.replayStep = model.replayData.length - 1
	model.topMenuViews.showReplay = true
}
