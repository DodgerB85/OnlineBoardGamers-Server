import * as rf from "./BUSreference.js"
import * as funcs from "./BUSfuncs.js"
import * as Bot from "./BUSbot"
import * as IO from "../backend/BUS_IO"
import * as model from "./BUSmodel"

import { useModelStore } from "../stores/BUSstore.js"
import { usePersonalStore } from "../stores/BUSpersonal.js"

function canPlayerVrom(forceCheck) {
	const store = useModelStore()
	if (!forceCheck) {
		if (store.context.remainingVroms === 0) return false
		if (store.gameflow.phase !== rf.PHASE_VROM) return false
	}
	let player = currentPlayerObj()
	let anyPax = false
	// If no pax on owned junctions, cannot vrom
	for (let i = 0; i < player.playerJunctions.length; i++) {
		if (store.junctions[player.playerJunctions[i]][rf.paxIdx] > 0) {
			anyPax = true
			break
		}
	}
	if (!anyPax) {
		store.context.turnEndingErrorMessage = "No available passengers in your network"
		if (store.context.historyObj.length === 0 || store.context.historyObj[store.context.historyObj.length - 1].length !== 1) store.context.historyObj.push([1])
		return false
	}
	let anyBldg = false
	for (let i = 0; i < player.playerJunctions.length; i++) {
		for (let j = 0; j < store.junctions[player.playerJunctions[i]].length - 1; j++) {
			if (store.junctions[player.playerJunctions[i]][j] === store.desiredBuilding) {
				anyBldg = true
				break
			}
		}
	}
	if (!anyBldg) {
		store.context.turnEndingErrorMessage = "No available buildings of the desired type in your network"
		// if the end isn't a single item, push a single item
		if (store.context.historyObj.length === 0 || store.context.historyObj[store.context.historyObj.length - 1].length !== 1) store.context.historyObj.push([2])
		return false
	}
	return true
}

function maxBuses() {
	const store = useModelStore()
	let busArr = []
	store.players.forEach((player) => busArr.push(player.buses))
	return busArr.reduce((a, b) => Math.max(a, b), -Infinity)
}

function moveAllPassengersOntoCorrectBuilding(bldgNum) {
	const store = useModelStore()
	for (let i = 0; i < store.junctions.length; i++) {
		// On each junction, check for pax, and try to move to correct bldg
		for (let j = 0; j < store.junctions[i].length - 1; j++) {
			if (store.junctions[i][j] === bldgNum && store.junctions[i][rf.paxIdx] > 0) {
				// add pax to bldg
				store.junctions[i][j] += 10
				store.junctions[i][rf.paxIdx]--
			}
		}
	}
}

function moveAllPassengersOntoJunctions() {
	const store = useModelStore()
	for (let i = 0; i < store.junctions.length; i++) {
		// On each junction, check for pax, and try to move to correct bldg
		for (let j = 0; j < store.junctions[i].length - 1; j++) {
			if (store.junctions[i][j] > 9) {
				// add pax to bldg
				store.junctions[i][j] -= 10
				store.junctions[i][rf.paxIdx]++
			}
		}
	}
}
/*
function getEmptyBuildingSpots(checkAll) {
	const store = useModelStore()
	let ret = []
	for (let i = 0; i < store.junctions.length; i++) {
		for (let j = 0; j < store.junctions[i].length - 1; j++) {
			if (store.junctions[i][j] === 0) ret.push([i, j])
		}
	}
	if (checkAll) return ret
	else return [...store.gameflow.fullTurnOrder]
}
*/
export function currentPlayerIndex() {
	const store = useModelStore()
	if (store.gameflow.turnOrder.length > 0) return store.gameflow.turnOrder[0]
	else {
		alert("CPI() Error")
		return 0
	}
}

export function currentPlayerObj() {
	const store = useModelStore()
	if (store.gameflow.turnOrder.length > 0) return store.players[store.gameflow.turnOrder[0]]
	else {
		if (!store.topMenuViews.generatingReplay && !store.gameflow.phase === 0) alert("CP() Error")
		return 0
	}
}

export function currentPlayerCanPass() {
	const store = useModelStore()
	//if (context.actionChosen) return false
	if (store.gameflow.phase !== rf.PHASE_CHOOSE_ACTIONS) return false
	let takenActions = 0
	for (let i = 0; i < store.actionAreaData.length; i++) {
		for (let j = 0; j < store.actionAreaData[i].length; j++) {
			if (store.actionAreaData[i][j] === currentPlayerObj().colour) takenActions++
			if (takenActions >= 2) return true
		}
	}
	if (currentPlayerObj().remainingActions === 0) return true
	return false
}

export function getPlayerByColour(colour) {
	const store = useModelStore()
	return store.players.find((players) => players.colour === colour)
}

export function getPlayerIndexFromColour(colour) {
	const store = useModelStore()
	let index = store.players.findIndex((object) => {
		return object.colour === colour
	})
	return index
}

export function canSkipPhase() {
	const store = useModelStore()
	if (store.gameflow.phase === rf.PHASE_LINE_EXPANSION && funcs.removeItemAll(store.actionAreaData[0], -1).length === 0) return true
	if (store.gameflow.phase === rf.PHASE_ADD_PAX && funcs.removeItemAll(store.actionAreaData[2], -1).length === 0) return true
	if (store.gameflow.phase === rf.PHASE_ADD_BLDGS && funcs.removeItemAll(store.actionAreaData[3], -1).length === 0) return true
	if (store.gameflow.phase === rf.PHASE_VROM && funcs.removeItemAll(store.actionAreaData[5], -1).length === 0) return true
	return false
}

export function startPlayerTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	//alert('start')
	if (!personal.canPlay()) return
	// SHOULD ONLY BE HERE IF YOU CAN ACTUALLY PLAY

	// Setup Bldgs
	if (store.gameflow.phase === rf.PHASE_SETUP_BLDGS) store.context.buildingsLeftToPlace = 2
	// Setup Lines
	else if (store.gameflow.phase === rf.PHASE_SETUP_LINES) {
		store.context.linesLeftToPlace = 1 //+ 90
		if (store.gameflow.turnOrder.length === store.players.length) store.context.linesLeftToPlace = 2
	}
	// Choose Actions
	// Line Expansion
	else if (store.gameflow.phase === rf.PHASE_LINE_EXPANSION) {
		store.context.linesLeftToPlace = maxBuses() - store.gameflow.turnOrder.length + 1 // + 60
		if (store.players.length === 5) store.context.linesLeftToPlace++
		//if (store.context.linesLeftToPlace <= 0) endPlayerTurn()
	}
	// Add Pax
	else if (store.gameflow.phase === rf.PHASE_ADD_PAX) {
		store.context.passengersLeftToPlace = maxBuses() - (store.gameflow.fullActionTurnOrder.length - store.gameflow.turnOrder.length)
	}
	// Add Bldgs
	else if (store.gameflow.phase === rf.PHASE_ADD_BLDGS) {
		store.context.buildingsLeftToPlace = maxBuses() - store.gameflow.turnOrder.length + 1 // + 60
	}
	// VROM
	else if (store.gameflow.phase === rf.PHASE_VROM) {
		store.context.remainingVroms = currentPlayerObj().buses
		canPlayerVrom()
	}

	// Save Reset
	store.turnResetData = funcs.exportBUSmodel(false)
}

export function endPlayerChooseActionTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	// If action chose, rotate the turn order
	if (store.context.actionChosen) {
		if (store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS) store.history.push([rf.HIST_CHOOSE_ACTION, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...store.context.historyObj]])
		store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
		Bot.actionAnyBotMooves() // At end of player choosing an action
		store.resetVarsOnTurnEnd()
	}
	// Else player has passed, so remove and check for next phase
	else {
		store.history.push([rf.HIST_CHOOSE_ACTION, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [10]])
		store.resetVarsOnTurnEnd()
		store.gameflow.turnOrder.shift()
		Bot.actionAnyBotMooves() // At end of player passing actions
		if (store.gameflow.turnOrder.length === 0) endCurrentPhase()
	}

	// Skip any players who have just used up their actions
	while (store.gameflow.turnOrder.length > 0 && store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && (store.players[store.gameflow.turnOrder[0]].remainingActions === 0 || store.players[store.gameflow.turnOrder[0]].passActionsFlag === true)) {
		if (store.players[store.gameflow.turnOrder[0]].passActionsFlag === true) {
			store.history.push([rf.HIST_CHOOSE_ACTION, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [11]])
			store.players[store.gameflow.turnOrder[0]].passActionsFlag = false
		}
		store.gameflow.turnOrder.shift()
	}

	// Skip any players again -- THIS NEEDS TO BE HERE FOR SOME REASON
	// SOMETHING TO DO WITH SOME PLAYERS SKIPPING AND OTHERS NOT, WHILST SOME HAVE 0 ACTIONS
	// Skip any players who have just used up their actions

	if (store.gameflow.turnOrder.length === 0) endCurrentPhase()
	IO.saveGame(true)
	//startPlayerTurn() // MOO
}

export function endPlayerTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	// history: [.., [HIST_ACTION, PLAYER_ID, TIMESTAMP, [PARAMS]], ... ]

	if (store.gameflow.phase === rf.PHASE_SETUP_BLDGS) store.history.push([rf.HIST_ADD_BLDG, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...store.context.historyObj]])
	else if (store.gameflow.phase === rf.PHASE_SETUP_LINES) store.history.push([rf.HIST_ADD_LINE, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...store.context.historyObj]])
	else if (store.gameflow.phase === rf.PHASE_LINE_EXPANSION) store.history.push([rf.HIST_ADD_LINE, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...store.context.historyObj]])
	else if (store.gameflow.phase === rf.PHASE_ADD_BLDGS) store.history.push([rf.HIST_ADD_BLDG, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...store.context.historyObj]])
	else if (store.gameflow.phase === rf.PHASE_ADD_PAX) store.history.push([rf.HIST_ADD_PAX, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...store.context.historyObj]])
	else if (store.gameflow.phase === rf.PHASE_ALTER_TIME) store.history.push([rf.HIST_ALTER_TIME, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...store.context.historyObj]])
	else if (store.gameflow.phase === rf.PHASE_VROM) store.history.push([rf.HIST_VROM, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...store.context.historyObj]])

	store.resetVarsOnTurnEnd()
	store.gameflow.turnOrder.shift()
	//Bot.updateTurnOrder()
	// Skip players at start of player turn with low max buses
	if (store.gameflow.phase === rf.PHASE_ADD_PAX && store.gameflow.turnOrder.length > 0) {
		let actionsRemaining = 0
		do {
			actionsRemaining = maxBuses() - (store.gameflow.fullActionTurnOrder.length - store.gameflow.turnOrder.length)
			if (actionsRemaining <= 0) {
				store.history.push([rf.HIST_ADD_PAX, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), []])
				store.gameflow.turnOrder.shift()
				//Bot.updateTurnOrder()
			}
		} while (actionsRemaining <= 0 && store.gameflow.turnOrder.length > 0)
	} else if (store.gameflow.phase === rf.PHASE_VROM) {
		// Everyone has at least one bus, so remainingVroms > 0
		while (store.gameflow.turnOrder.length > 0 && !canPlayerVrom(true)) {
			store.history.push([rf.HIST_VROM, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...store.context.historyObj]])
			store.resetVarsOnTurnEnd()
			store.gameflow.turnOrder.shift()
			// Bot.updateTurnOrder()
			if (store.gameflow.turnOrder.length === 0) {
				endCurrentPhase()
				break
				//return
			}
			//startPlayerTurn()
		}
	}
	// Now skip players if there are no pax left to add
	if (store.gameflow.phase === rf.PHASE_ADD_PAX && store.remainingPassengers <= 0 && store.gameflow.turnOrder.length > 0) {
		do {
			store.history.push([rf.HIST_ADD_PAX, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [-1]])
			store.gameflow.turnOrder.shift()
			//Bot.updateTurnOrder()
		} while (store.gameflow.turnOrder.length > 0)
	}

	// Called at end of ALTER_TIME phase, so can check game end here
	// EVALUATED EVERY TIME, BUT RUNS ONLY AT FIRST TIME - IE AFTER ALTER TIME
	if (store.gameflow.turnOrder.length === 0) {
		if (store.remainingTimeStones === 0) {
			store.gameflow.gameEnded = 1
			model.endGame()
		} else {
			endCurrentPhase()
		}
	} else {
		// do nothing
	}
	if (store.gameflow.gameEnded === 0) Bot.actionAnyBotMooves()
	IO.saveGame(true)
} // End Player Turn

export function endCurrentPhase() {
	const store = useModelStore()
	const personal = usePersonalStore()
	// DO END PHASE STUFF
	if (store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS) {
		for (let i = 0; i < store.players.length; i++) store.players[i].passActionsFlag = false
	}

	// Skip phases that no one has chosen
	do {
		store.gameflow.phase++
		if (store.gameflow.phase > rf.PHASE_CHANGE_START_PLAYER) store.gameflow.phase = rf.PHASE_CHOOSE_ACTIONS
	} while (canSkipPhase())

	// SETUP NEW PHASE
	if (store.gameflow.phase === rf.PHASE_SETUP_LINES) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder].concat([...store.gameflow.fullTurnOrder].reverse())
		store.gameflow.turnOrder.splice(store.players.length, 1)
	}
	// Phase choose actions
	else if (store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS) {
		store.gameflow.turn++
		store.history.push([rf.HIST_NEW_TURN, -1, Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [store.gameflow.turn]])
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		// remove all non players
		for (let i = store.gameflow.turnOrder.length - 1; i >= 0; i--) {
			if (store.players[store.gameflow.turnOrder[i]].displayName === "BusBot" || store.players[store.gameflow.turnOrder[i]].remainingActions === 0) {
				store.gameflow.turnOrder.splice(i, 1)
			}
		}
		if (store.gameflow.gameEnded === 0) {
			for (let i = 0; i < store.actionAreaData.length; i++) {
				for (let j = 0; j < store.actionAreaData[i].length; j++) {
					store.actionAreaData[i][j] = -1
				}
			}
		}
	}
	// Phase Line Expansion
	else if (store.gameflow.phase === rf.PHASE_LINE_EXPANSION) {
		store.gameflow.turnOrder = funcs.removeItemAll([...store.actionAreaData[0]], -1)
		// Swap colour number for array index number
		for (let i = 0; i < store.gameflow.turnOrder.length; i++) store.gameflow.turnOrder[i] = getPlayerIndexFromColour(store.gameflow.turnOrder[i])
		store.gameflow.fullActionTurnOrder = [...store.gameflow.turnOrder]
		//Bot.updateTurnOrder()
	}
	// Phase Add Bus
	else if (store.gameflow.phase === rf.PHASE_ADD_BUS) {
		if (store.actionAreaData[1][0] !== -1) {
			getPlayerByColour(store.actionAreaData[1][0]).buses++
			store.history.push([rf.HIST_ADD_BUS, getPlayerIndexFromColour(store.actionAreaData[1][0]), Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [getPlayerByColour(store.actionAreaData[1][0]).buses]])
		}
		endCurrentPhase()
		// Re running this loop, so start turn after
		return
	}
	// Phase Add Pax
	else if (store.gameflow.phase === rf.PHASE_ADD_PAX) {
		store.gameflow.turnOrder = funcs.removeItemAll([...store.actionAreaData[2]], -1)
		// Swap colour number for array index number
		for (let i = 0; i < store.gameflow.turnOrder.length; i++) store.gameflow.turnOrder[i] = getPlayerIndexFromColour(store.gameflow.turnOrder[i])
		store.gameflow.fullActionTurnOrder = [...store.gameflow.turnOrder]
		//Bot.updateTurnOrder()
	}
	// Phase Add Bldgs
	else if (store.gameflow.phase === rf.PHASE_ADD_BLDGS) {
		store.gameflow.turnOrder = funcs.removeItemAll([...store.actionAreaData[3]], -1)
		// Swap colour number for array index number
		for (let i = 0; i < store.gameflow.turnOrder.length; i++) store.gameflow.turnOrder[i] = getPlayerIndexFromColour(store.gameflow.turnOrder[i])
		store.gameflow.fullActionTurnOrder = [...store.gameflow.turnOrder]
		//Bot.updateTurnOrder()
	}
	// Phase alter time
	else if (store.gameflow.phase === rf.PHASE_ALTER_TIME) {
		let botAlterTime = false
		if (store.actionAreaData[4][0] !== -1) {
			store.gameflow.turnOrder = [store.actionAreaData[4][0]]
			store.gameflow.turnOrder[0] = getPlayerIndexFromColour(store.gameflow.turnOrder[0])
			if (store.players[store.gameflow.turnOrder[0]].displayName === "BusBot") botAlterTime = true
			//Bot.updateTurnOrder()
		}
		if (botAlterTime || store.actionAreaData[4][0] === -1 || store.gameflow.turnOrder.length === 0) {
			store.desiredBuilding++
			if (store.desiredBuilding === 4) store.desiredBuilding = 1
			store.history.push([rf.HIST_ALTER_TIME, -1, Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [store.desiredBuilding]])
			endCurrentPhase()
			return
		}
	}
	// Phase VROM
	else if (store.gameflow.phase === rf.PHASE_VROM) {
		moveAllPassengersOntoCorrectBuilding(store.desiredBuilding)
		store.gameflow.turnOrder = funcs.removeItemAll([...store.actionAreaData[5]], -1)
		// Swap colour number for array index number
		for (let i = 0; i < store.gameflow.turnOrder.length; i++) store.gameflow.turnOrder[i] = getPlayerIndexFromColour(store.gameflow.turnOrder[i])
		store.gameflow.fullActionTurnOrder = [...store.gameflow.turnOrder]
		//Bot.updateTurnOrder()
	}
	// Phase Change Start Player
	else if (store.gameflow.phase === rf.PHASE_CHANGE_START_PLAYER) {
		moveAllPassengersOntoJunctions()
		// change start plasyer
		if (store.actionAreaData[6][0] !== -1) {
			let newStartPlayer = getPlayerIndexFromColour(store.actionAreaData[6][0])
			var i = 0
			do {
				store.gameflow.fullTurnOrder.push(store.gameflow.fullTurnOrder.shift())
				i++
				if (i === 10) break
			} while (store.gameflow.fullTurnOrder[0] !== newStartPlayer)
			store.history.push([rf.HIST_STARTING_PLAYER, getPlayerIndexFromColour(store.actionAreaData[6][0]), Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...store.gameflow.fullTurnOrder]])
		}
		// Otherwise player to the left is now starting
		else {
			store.gameflow.fullTurnOrder.push(store.gameflow.fullTurnOrder.shift())
			store.history.push([rf.HIST_STARTING_PLAYER, -1, Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...store.gameflow.fullTurnOrder]])
		}

		store.gameflow.phase = rf.PHASE_GAME_END_CHECK
		// check game end
		// No more building spots?
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
		} else endCurrentPhase()
	}

	// Skip players at START of new phase; someone at the end will always be able to play
	if (store.gameflow.phase === rf.PHASE_LINE_EXPANSION || store.gameflow.phase === rf.PHASE_ADD_BLDGS) {
		let actionsRemaining = 0
		do {
			if (store.gameflow.phase === rf.PHASE_LINE_EXPANSION) {
				actionsRemaining = maxBuses() - store.gameflow.turnOrder.length + 1
				if (store.players.length === 5) actionsRemaining++
			} else if (store.gameflow.phase === rf.PHASE_ADD_BLDGS) actionsRemaining = maxBuses() - store.gameflow.turnOrder.length + 1
			if (actionsRemaining <= 0) {
				if (store.gameflow.phase === rf.PHASE_LINE_EXPANSION) store.history.push([rf.HIST_ADD_LINE, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), []])
				else if (store.gameflow.phase === rf.PHASE_ADD_BLDGS) store.history.push([rf.HIST_ADD_BLDG, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), []])
				store.gameflow.turnOrder.shift()
				// Bot.updateTurnOrder()
			}
		} while (actionsRemaining <= 0)
	} else if (store.gameflow.phase === rf.PHASE_VROM) {
		// Everyone has at least one bus, so remainingVroms > 0
		while (store.gameflow.turnOrder.length > 0 && !canPlayerVrom(true)) {
			store.history.push([rf.HIST_VROM, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [...store.context.historyObj]])
			store.resetVarsOnTurnEnd()
			store.gameflow.turnOrder.shift()
			// Bot.updateTurnOrder()
			if (store.gameflow.turnOrder.length === 0) {
				endCurrentPhase()
				return
			}
		}
	}
	// Now skip players if there are no pax left to add
	else if (store.gameflow.phase === rf.PHASE_ADD_PAX && store.remainingPassengers <= 0 && store.gameflow.turnOrder.length > 0) {
		do {
			store.history.push([rf.HIST_ADD_PAX, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), [-1]])
			store.gameflow.turnOrder.shift()
			// Bot.updateTurnOrder()
		} while (store.gameflow.turnOrder.length > 0)
		endCurrentPhase()
		return
	}
	Bot.actionAnyBotMooves()
} // end current phase
