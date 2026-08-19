import * as funcs from "../js/RNBfuncs.js"
import * as WS from "./RNBwebsocket.js"
import * as controller from "../js/RNBcontroller.js"
import * as rf from "../js/RNBreference.js"
import * as model from "../js/RNBmodel.js"
import * as Bot from "../js/RNBbot.js"
import * as context from "../js/RNBcontext.js"
import * as stack from "../js/RNBstack.js"
import * as wonder from "../js/RNBwonder.js"
import * as produce from "../js/RNBproduce.js"
import * as highlight from "../js/RNBhighlight.js"
import * as view from "../js/RNBview.js"

import { useModelStore } from "../stores/RNBstore.js"

import { usePersonalStore } from "../stores/RNBpersonal.js"

//import { usePersonalStore } from "../stores/RNBpersonal.js"

export async function sendDiscordWebhook(message) {
	let csrftoken = funcs.getCookie("csrftoken")

	fetch("/sendAdminMessage/", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-CSRFToken": csrftoken, // Important for Django CSRF protection
		},
		body: JSON.stringify({ message: message }),
	})
		.then((response) => {
			if (!response.ok) {
				console.error("Error sending webhook:", response.status, response.statusText)
			}
		})
		.catch((error) => {
			console.error("Error sending webhook:", error)
		})
}

export async function saveGame(saveRewind, saveContext = false) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket() // No 'await'! Starts in background.
	}

	personal.haltPlay = true
	store.viewSettings.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	const { allIsCurrentPlayers, allRemainingPlayersInTurnOrder, pendingPlayersArr } = getNextCurrentPlayers()

	let gameDataB64 = funcs.exportRNBmodel(false)
	if (saveContext) {
		rf.doAdminAlrt("saving context in saveGame")
		gameDataB64 = funcs.exportRNBmodel(false)
	}
	let BKSN = personal.pov >= 0 ? store.players[personal.pov].name : personal.name

	let postData = {
		action: "saveGame",
		latestUpdate: personal.latestUpdate,
		gameDataB64: gameDataB64,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		saveRewind: saveRewind,
		BKSN: BKSN,
		allIsCurrentPlayers: allIsCurrentPlayers,
		allRemainingPlayersInTurnOrder: allRemainingPlayersInTurnOrder,
		pendingPlayersArr: pendingPlayersArr,
	}

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		postData.status = "FINISHED" // USED
		postData.winnerUsername = store.players[store.gameflow.fullTurnOrder[0]].name
		postData.saveRewind = false
		postData.data = funcs.exportRNBmodel(true)
		postData.finalPositions = [...store.gameflow.fullTurnOrder]

		const turnOrder = store.gameflow.fullTurnOrder
		const winningPlayerScore = wonder.getPlayerWonderPoints(turnOrder[0]) + wonder.getHeldResourcesScore(turnOrder[0])
		postData.winningPlayerScore = winningPlayerScore
		postData.tournamentData = turnOrder.map((playerIdx, i) => {
			const player = store.players[playerIdx]

			// First player gets [Name], others get [Name, calculatedValue]
			if (i === 0) return [player.name]

			const playerScore = wonder.getPlayerWonderPoints(playerIdx) + wonder.getHeldResourcesScore(playerIdx)
			const diffValue = Math.ceil((winningPlayerScore - playerScore) / 10)
			return [player.name, diffValue]
		})
	}

	// Use this to kickPass another player and remove their flexi time
	if (personal.removeCurrentFlexTime) {
		personal.removeCurrentFlexTime = false
		postData.checkName = personal.removeCurrentFlexTimeName
		personal.removeCurrentFlexTimeName = ""
	}

	try {
		const response = await fetch("/RNB/processRNBturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			const errorData = await response.json() // Assuming the server returns JSON error data
			const errorMessage = errorData.error || "Network response was not ok"
			throw new Error(errorMessage)
		}
		const data = await response.json()
		if (data.syncError === true) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout

		// Broadcast update
		WS.broadcastGameUpdate(wsConnecting)

		store.viewSettings.showLoader = false
		personal.haltPlay = false
		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error saving the game - Send all this to admin (eg on discord/email)"
		const payloadInfo = `turn=${postData.turn}, phase=${postData.phase}, LU=${postData.latestUpdate}, action=${postData.action}`
		const gameInfo = `Game ${personal.gameID} - User ${personal.name || "unknown"} - ${payloadInfo}`
		const errorName = error && error.name ? error.name : "Error"
		const errorMsg = error && error.message ? error.message : String(error)
		const errorStack = error && error.stack ? String(error.stack).substring(0, 1200) : "no stack"
		const browserInfo = typeof navigator !== "undefined" ? navigator.userAgent : "unknown UA"
		sendDiscordWebhook(`RNB save error - ${gameInfo}: [${errorName}] ${errorMsg} | UA: ${browserInfo} | stack: ${errorStack}`)
	}
}

export function getNextCurrentPlayers() {
	const store = useModelStore()
	//const personal = usePersonalStore()
	let allIsCurrentPlayers = []
	let allRemainingPlayersInTurnOrder = []
	let pendingPlayers = []

	if (store.players.length === 1) {
		store.gameflow.fullTurnOrder = [0]
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		allIsCurrentPlayers = [store.players[0].name]
		allRemainingPlayersInTurnOrder = [store.players[0].name]
		return {
			allIsCurrentPlayers: allIsCurrentPlayers,
			allRemainingPlayersInTurnOrder: allRemainingPlayersInTurnOrder,
			pendingPlayersArr: pendingPlayers,
		}
	}

	// If there is no one left, then that is fine, as phase ticks over later
	if (store.gameflow.turnOrder.length === 0)
		return {
			allIsCurrentPlayers: allIsCurrentPlayers,
			allRemainingPlayersInTurnOrder: allRemainingPlayersInTurnOrder,
			pendingPlayersArr: pendingPlayers,
		}

	//First check for practice game or strict TO move
	if (controller.isStrictTOphase()) {
		return {
			allIsCurrentPlayers: [store.players[store.gameflow.turnOrder[0]].name],
			allRemainingPlayersInTurnOrder: [store.players[store.gameflow.turnOrder[0]].name],
			pendingPlayersArr: [],
		}
	}
	// Then set up for simul turn order
	else if (controller.isSimulPhase()) {
		// start at the FIRST player
		let startingIndex = 0
		//if (rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) startingIndex = 0
		for (let i = startingIndex; i < store.gameflow.turnOrder.length; i++) {
			if (store.players[store.gameflow.turnOrder[i]].displayName !== rf.BOT_NAME) {
				pendingPlayers.push(store.players[store.gameflow.turnOrder[i]].name)
				allIsCurrentPlayers.push(store.players[store.gameflow.turnOrder[i]].name)
				allRemainingPlayersInTurnOrder.push(store.players[store.gameflow.turnOrder[i]].name)
			}
		}
	} else if (controller.isMainPhaseAndPseudoSimul()) {
		allIsCurrentPlayers.push(store.players[store.gameflow.turnOrder[0]].name)
		allRemainingPlayersInTurnOrder.push(store.players[store.gameflow.turnOrder[0]].name)
		// start at the SECOND player in turnOrder
		let startingIndex = 1
		for (let i = startingIndex; i < store.gameflow.turnOrder.length; i++) {
			if (store.players[store.gameflow.turnOrder[i]].displayName !== rf.BOT_NAME) {
				pendingPlayers.push(store.players[store.gameflow.turnOrder[i]].name)
				allRemainingPlayersInTurnOrder.push(store.players[store.gameflow.turnOrder[i]].name)
			}
		}
	}

	return {
		allIsCurrentPlayers: allIsCurrentPlayers,
		allRemainingPlayersInTurnOrder: allRemainingPlayersInTurnOrder,
		pendingPlayersArr: pendingPlayers,
	}
}

// Here you are saving a stack for the CURRENT phase, PLUS the next conflict phase
export async function saveStackMove(saveRewind = true, overrideBKSN = null, overridePlayerIndex = null) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket() // No 'await'! Starts in background.
	}

	personal.haltPlay = true
	store.viewSettings.showLoader = true

	// Check for stacks of ridiculouts lengths
	if (store.actionStack.length >= 100) {
		store.gameMessages.errorText = `You used ${store.actionStack.length} actions. Reset turn and use fewer actions`
		return
	}

	stack.resetStackControlData()
	let conflictPresetData = ""
	let mainPhaseSkipsData = []
	// Only save conflict at the end of a MAIN phase -- IE EVERY TIME, as this only hapens for main phases
	if (rf.MAIN_PHASES.includes(store.gameflow.phase)) {
		let conflictPresetMoves = []
		// Add the directly upcoming conflict
		let conflictPresetMove = {
			turn: store.gameflow.turn,
			phase: store.gameflow.phase + 1,
			conflictPreset: [store.conflictPreset.conflictDecision, store.conflictPreset.prayingDecision, store.conflictPreset.turnOrderDecision],
		}
		if (conflictPresetMove.phase === rf.MAX_PHASE_REACHED) {
			conflictPresetMove.phase = rf.PHASE_CONFLICT_PRODUCTION_DECISION
			conflictPresetMove.turn++
		}
		conflictPresetMoves.push(conflictPresetMove)

		if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) {
			if (store.conflictPreset.skipWonderPhaseDecision === rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_ALL)
				// Skip Wonder Phase AND THEN PRODUCTION CONFLICT - this will be for the next turn
				conflictPresetMoves.push({
					turn: store.gameflow.turn + 1,
					phase: rf.PHASE_CONFLICT_PRODUCTION_DECISION,
					conflictPreset: [rf.CONFLICT_DECISION_NO_CONFLICT, 0, 0],
				})
		}
		// Add any preset-conflicts
		if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase) || rf.PHASE_WONDERS.includes(store.gameflow.phase)) {
			if (store.conflictPreset.skipProductionPhaseDecision === rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_ALL)
				// Skip Wonder proudction phase AND THEN MOVEMENT Conflict - this will be for the next turn
				conflictPresetMoves.push({
					turn: store.gameflow.turn + 1,
					phase: rf.PHASE_CONFLICT_MOVEMENT_DECISION,
					conflictPreset: [rf.CONFLICT_DECISION_NO_CONFLICT, 0, 0],
				})
		}
		conflictPresetData = funcs.compressData64(conflictPresetMoves)
		// Finally, add any preset skip moves
		if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) {
			if (store.conflictPreset.skipWonderPhaseDecision === rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_ALL || store.conflictPreset.skipWonderPhaseDecision === rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_WONDER_ONLY) {
				// Skip Wonder Phase
				mainPhaseSkipsData.push([store.gameflow.turn, rf.PHASE_WONDER_TO])
			}
		}
		// Add any preset-conflicts
		if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase) || rf.PHASE_WONDERS.includes(store.gameflow.phase)) {
			if (store.conflictPreset.skipProductionPhaseDecision === rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_ALL || store.conflictPreset.skipProductionPhaseDecision === rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_PRODUCTION_ONLY) {
				// Skip proudction phase
				mainPhaseSkipsData.push([store.gameflow.turn + 1, rf.PHASE_PRODUCTION_TO])
			}
		}
		// Now reset the conflict choices
		view.resetConflictPreferences()
	}
	let csrftoken = funcs.getCookie("csrftoken")

	// If we are first in TO, we SHOULD only be able to submit valid move data
	let isCurrent = false
	const effectivePov = overridePlayerIndex !== null ? overridePlayerIndex : personal.pov
	if (store.gameflow.turnOrder.length > 0 && store.gameflow.turnOrder[0] === effectivePov) {
		isCurrent = true
		store.gameflow.turnOrder.shift()
	}

	// In multiplayer, auto-remove consecutive bots from the turn order
	while (store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) {
		store.gameflow.turnOrder.shift()
	}

	const { allIsCurrentPlayers, allRemainingPlayersInTurnOrder, pendingPlayersArr } = getNextCurrentPlayers()

	let gameDataB64 = funcs.exportRNBmodel(false)
	let actionStack = ""
	// If it is a MAIN PHASE, save the stack - THIS WILL ALWAYS BE A MAIN PHASE
	if (rf.MAIN_PHASES.includes(store.gameflow.phase) && Array.isArray(store.actionStack)) {
		// Check if any element in the stack is missing OR has a null in its history
		const hasError = store.actionStack.some((subArr) => {
			// 1. Ensure subArr itself isn't undefined/null
			if (!subArr || !subArr.historyEntry) return true

			// 2. Check for nulls inside the history
			return subArr.historyEntry.some((e) => e == null)
		})

		if (hasError) {
			rf.doAdminAlrt("SEND TO ADMIN: ERROR CODE 1 - IO stack error found")
		}

		actionStack = store.actionStack.length === 0 ? "SKIP" : funcs.compressData64(store.actionStack)
	}
	let BKSN = overrideBKSN !== null ? overrideBKSN : (personal.pov >= 0 ? store.players[personal.pov].name : personal.name)

	// Don't save a rewind with no TO
	if (allIsCurrentPlayers.length === 0) saveRewind = false

	let postData = {
		action: "saveStackMove",
		latestUpdate: personal.latestUpdate,
		gameDataB64: gameDataB64,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		actionStack: actionStack,
		mainPhaseSkipsData: mainPhaseSkipsData,
		BKSN: BKSN,
		isCurrent: isCurrent,
		conflictPresetData: conflictPresetData,
		saveRewind: saveRewind,
		knownArrayLengths: store.knownArrayLengths,
		knownFinalHistoryidx: store.knownFinalHistoryidx,
		playerIndex: overridePlayerIndex !== null ? overridePlayerIndex : personal.pov,
		expectedResPreProduction: store.expectedResPreProduction,
	}

	postData.allIsCurrentPlayers = allIsCurrentPlayers
	postData.allRemainingPlayersInTurnOrder = allRemainingPlayersInTurnOrder
	postData.pendingPlayersArr = pendingPlayersArr

	// Use this to kickPass another player and remove their flexi time
	if (personal.removeCurrentFlexTime) {
		personal.removeCurrentFlexTime = false
		postData.checkName = personal.removeCurrentFlexTimeName
		personal.removeCurrentFlexTimeName = ""
	}

	try {
		const response = await fetch("/RNB/processRNBturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			const errorData = await response.json() // Assuming the server returns JSON error data
			const errorMessage = errorData.error || "Network response was not ok"
			throw new Error(errorMessage)
		}
		const data = await response.json()
		if (data.syncError === true) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		// If your move was saved, then just store that
		if (data.savedMoveForLater) {
			// Remove the preset selection from actions
			context.resetContext()
			store.viewSettings.showLoader = false
			store.gameMessages.successText = "Your move has been saved"
			// You have just done your stack, so it is loaded. Set this to allow premoves / cancel
			store.stackControl.loadedPreMove = true
			personal.currentMoveData = data.currentMoveData
			personal.allMyMoveData = data.allMyMoveData
			personal.gameDataB64 = data.gameDataB64
			personal.haltPlay = false

			return
		}
		// If the move was directly processed, do normal end of turn stuff
		if (data.savingFromStackMove) {
			personal.currentMoveData = {}
			personal.allMyMoveData = data.allMyMoveData
			personal.gameDataB64 = data.gameDataB64
			personal.transactionID = data.transactionID || ""

			personal.latestUpdate = data.latestUpdate
			window.initData.latestUpdate = data.latestUpdate
			personal.secondsToNextKickout = data.secondsToNextKickout
			const stackCurrentPlayers = data.stackCurrentPlayers
			let turnorder = []
			for (let i = 0; i < stackCurrentPlayers.length; i++) {
				let playerIndex = store.players.findIndex((player) => player.name === stackCurrentPlayers[i])
				if (playerIndex !== -1 && store.players[playerIndex].displayName !== rf.BOT_NAME) {
					turnorder.push(playerIndex)
				}
			}
			store.gameflow.turnOrder = [...turnorder]

			// Your turn was directly saved in the game data, so now try to process any stacks
			let loadedPreMove = false
			let currentPlayerNeedsToFixMove = false
			if (data.allStackData) {
				store.allStackData = data.allStackData
				// result = 1(error) or 2(no move found)
				const result = processStacks(data.allStackData)
				currentPlayerNeedsToFixMove = result.needToStop === 1
				if (currentPlayerNeedsToFixMove) {
					context.resetWholeTurn()
				}
				//const phaseChanged = result.phaseChanged === true
				if (store.gameflow.phase !== rf.PHASE_GAME_OVER)
					loadedPreMove = await saveAndUpdateNotifictionsAfterStack(currentPlayerNeedsToFixMove) //, phaseChanged)
				else if (store.gameflow.phase === rf.PHASE_GAME_OVER) await saveGame(false, false)
			}

			store.viewSettings.showLoader = false
			personal.haltPlay = false
			if (currentPlayerNeedsToFixMove) {
				const savedRM = model.getAllInGameTransporters().map((t) => t.remainingMoves)
				controller.startPlayerTurn(loadedPreMove)
				for (let i = 0; i < model.getAllInGameTransporters().length; i++) {
					model.getAllInGameTransporters()[i].remainingMoves = savedRM[i]
				}
			} else {
				controller.startPlayerTurn(loadedPreMove)
			}

			// Broadcast update
			WS.broadcastGameUpdate(wsConnecting)

			return
		}
		// Server says we are current but our client was out of sync.
		// Import the server's authoritative game data, process all stacks
		// (including the move we just submitted), and save the results.
		if (data.immediateProcess) {
			funcs.importRNBmodel(data.gameDataB64, false)
			personal.currentMoveData = data.currentMoveData || {}
			personal.allMyMoveData = data.allMyMoveData || []
			personal.gameDataB64 = data.gameDataB64

			personal.latestUpdate = data.latestUpdate
			window.initData.latestUpdate = data.latestUpdate
			personal.secondsToNextKickout = data.secondsToNextKickout

			let loadedPreMove = false
			let currentPlayerNeedsToFixMove = false
			if (data.allStackData) {
				store.allStackData = data.allStackData
				const result = processStacks(data.allStackData)
				currentPlayerNeedsToFixMove = result.needToStop === 1
				if (currentPlayerNeedsToFixMove) {
					context.resetWholeTurn()
				}
				if (store.gameflow.phase !== rf.PHASE_GAME_OVER) loadedPreMove = await saveAndUpdateNotifictionsAfterStack(currentPlayerNeedsToFixMove)
				else if (store.gameflow.phase === rf.PHASE_GAME_OVER) await saveGame(false, false)
			}

			store.viewSettings.showLoader = false
			personal.haltPlay = false
			if (currentPlayerNeedsToFixMove) {
				const savedRM = model.getAllInGameTransporters().map((t) => t.remainingMoves)
				controller.startPlayerTurn(loadedPreMove)
				for (let i = 0; i < model.getAllInGameTransporters().length; i++) {
					model.getAllInGameTransporters()[i].remainingMoves = savedRM[i]
				}
			} else {
				controller.startPlayerTurn(loadedPreMove)
			}

			WS.broadcastGameUpdate(wsConnecting)
			return
		}
		// Finally, if the server has you as next player, but the browser didn't, reload the new state and try to process your move
	} catch (error) {
		console.error("Error fetching data:", error)
		sendDiscordWebhook(`saveStackMove failed: ${error.message}. Game may be in inconsistent state. GameID: ${personal.gameID}`)
		store.gameMessages.errorText = "Error saving the game"
	}
}


// Here you are saving a CONFLICT move - either starting conflict, being last to reject conflict, or pray/TO
export async function saveConflictMove(saveRewind = true, overrideBKSN = null, overridePlayerIndex = null) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket() // No 'await'! Starts in background.
	}

	if (rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase) && store.gameflow.turnOrder.length === 2) {
		saveRewind = false
	}

	if (rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase) && store.gameflow.turnOrder.length === 2) {
		//controller.processOnePlayerLeftDuringConflict()
		// 1 player left will process during stack processing and cause a save
		// FOR SOME REASON WE DO NEED TO CHECK THAT THE LENFTH IS 2 NOT 1
		saveRewind = false
	}

	//let localPhaseChangedFromConflictDecision = false

	personal.haltPlay = true
	store.viewSettings.showLoader = true

	stack.resetStackControlData()
	let conflictPresetData = ""
	// Only save conflict at the end of a MAIN phase
	let conflictPresetMove = {
		turn: store.gameflow.turn,
		phase: rf.getBaseConflictPhase(store.gameflow.phase),
		conflictPreset: [store.conflictPreset.conflictDecision, store.conflictPreset.prayingDecision, store.conflictPreset.turnOrderDecision],
	}
	// Now reset the conflict choices
	view.resetConflictPreferences()

	conflictPresetData = funcs.compressData64(conflictPresetMove)

	let csrftoken = funcs.getCookie("csrftoken")

	let gameDataB64 = funcs.exportRNBmodel(false)
	let BKSN = overrideBKSN !== null ? overrideBKSN : (personal.pov >= 0 ? store.players[personal.pov].name : personal.name)
	const effectivePov = overridePlayerIndex !== null ? overridePlayerIndex : personal.pov
	let clientNextPlayerNames = []
	// Decision is simul, so add everyone who hasn't moved
	if (rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) {
		for (let i = 0; i < store.gameflow.turnOrder.length; i++) {
			if (store.gameflow.turnOrder[i] !== effectivePov && store.players[store.gameflow.turnOrder[i]].displayName !== rf.BOT_NAME) clientNextPlayerNames.push(store.players[store.gameflow.turnOrder[i]].name)
		}
	} else if (rf.PHASE_CONFLICT_PRAYINGS.concat(rf.PHASE_CONFLICT_TURN_ORDERS).includes(store.gameflow.phase)) {
		if (store.gameflow.turnOrder.length > 0) clientNextPlayerNames.push(store.players[store.gameflow.turnOrder[0]].name)
	}

	const nextSinglePlayerUsername = store.gameflow.turnOrder.length > 0 ? store.players[store.gameflow.turnOrder[0]].name : ""

	let postData = {
		action: "saveConflictMove",
		latestUpdate: personal.latestUpdate,
		gameDataB64: gameDataB64,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		BKSN: BKSN,
		conflictPresetData: conflictPresetData,
		saveRewind: saveRewind,
		clientNextPlayerNames: clientNextPlayerNames,
		nextSinglePlayerUsername: nextSinglePlayerUsername,
		allRemainingPlayersInTurnOrder: [nextSinglePlayerUsername],
	}

	// Use this to kickPass another player and remove their flexi time
	if (personal.removeCurrentFlexTime) {
		personal.removeCurrentFlexTime = false
		postData.checkName = personal.removeCurrentFlexTimeName
		personal.removeCurrentFlexTimeName = ""
	}

	try {
		const response = await fetch("/RNB/processRNBturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			const errorData = await response.json() // Assuming the server returns JSON error data
			const errorMessage = errorData.error || "Network response was not ok"
			throw new Error(errorMessage)
		}
		const data = await response.json()
		if (data.syncError === true) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}

		// FIRST, TRY TO PROCESS ANY PRE-SET MOVES

		// If the move was directly processed, do normal end of turn stuff
		if (data.checkAnyRemainingConflictDecicions) {
			personal.secondsToNextKickout = data.secondsToNextKickout
			personal.transactionID = data.transactionID || ""
			const isCurrentPlayersArr = data.isCurrentPlayersArr
			let turnorder = []
			for (let i = 0; i < isCurrentPlayersArr.length; i++) {
				let playerIndex = store.players.findIndex((player) => player.name === isCurrentPlayersArr[i])
				if (playerIndex !== -1 && store.players[playerIndex].displayName !== rf.BOT_NAME) {
					turnorder.push(playerIndex)
				}
			}
			// result = 1(error) or 2(no move found)
			store.allStackData = data.allStackData
			//const _result = processStacks(data.allStackData)
			processStacks(data.allStackData)
			// ONLY NEED to broadcast an update IF conflict has ended, OR moved on from conflict decision
			if (rf.MAIN_PHASES.includes(store.gameflow.phase) || rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase) || rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase)) {
				//const phaseChanged = (result.phaseChanged === true || localPhaseChangedFromConflictDecision)
				const loadedPreMove = await saveAndUpdateNotifictionsAfterStack(false) //, phaseChanged)
				// Broadcast update
				WS.broadcastGameUpdate(wsConnecting)

				store.viewSettings.showLoader = false
				personal.haltPlay = false
				controller.startPlayerTurn(loadedPreMove)
				return
			}

			store.viewSettings.showLoader = false
			personal.haltPlay = false
			controller.startPlayerTurn()
			return
		}
		// Otherwise, if we are STILL in conflict, it must be praying/TO with a decision to make
		else if (rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase) || rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase)) {
			personal.latestUpdate = data.latestUpdate
			window.initData.latestUpdate = data.latestUpdate
			personal.secondsToNextKickout = data.secondsToNextKickout
			personal.transactionID = data.transactionID || ""
			//const isCurrentPlayersArr = data.isCurrentPlayersArr
			/*let turnorder = []
			for (let i = 0; i < isCurrentPlayersArr.length; i++) {
				let playerIndex = store.players.findIndex((player) => player.name === isCurrentPlayersArr[i])
				turnorder.push(playerIndex)
			}
			store.gameflow.turnOrder = [...turnorder]*/
			// Your turn was directly saved in the game data, so now try to process any stacks
			store.allStackData = data.allStackData
			// result = 1(error) or 2(no move found)

			//const result = processStacks(data.allStackData)
			processStacks(data.allStackData)
			//const phaseChanged = result.phaseChanged === true

			const loadedPreMove = await saveAndUpdateNotifictionsAfterStack(false) //, phaseChanged)

			// Broadcast update
			WS.broadcastGameUpdate(wsConnecting)

			store.viewSettings.showLoader = false
			personal.haltPlay = false
			controller.startPlayerTurn(loadedPreMove)
			return
		}
		// Otherwise, you are saving INTO a main phase
		else {
			personal.latestUpdate = data.latestUpdate
			window.initData.latestUpdate = data.latestUpdate
			personal.secondsToNextKickout = data.secondsToNextKickout

			store.allStackData = data.allStackData
			//const result = processStacks(data.allStackData)
			processStacks(data.allStackData)
			// ONLY NEED to broadcast an update IF conflict has ended, OR moved on from conflict decision
			//const phaseChanged = (result.phaseChanged === true || localPhaseChangedFromConflictDecision)
			const loadedPreMove = await saveAndUpdateNotifictionsAfterStack(false) //, phaseChanged)
			// Broadcast update
			WS.broadcastGameUpdate(wsConnecting)

			store.viewSettings.showLoader = false
			personal.haltPlay = false
			controller.startPlayerTurn(loadedPreMove)
			return
		}
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error saving the game - Send all this to admin (eg on discord/email)"
		const payloadInfo = `turn=${postData.turn}, phase=${postData.phase}, LU=${postData.latestUpdate}, action=${postData.action}`
		const gameInfo = `Game ${personal.gameID} - User ${personal.name || "unknown"} - ${payloadInfo}`
		const errorName = error && error.name ? error.name : "Error"
		const errorMsg = error && error.message ? error.message : String(error)
		const errorStack = error && error.stack ? String(error.stack).substring(0, 1200) : "no stack"
		const browserInfo = typeof navigator !== "undefined" ? navigator.userAgent : "unknown UA"
		sendDiscordWebhook(`RNB conflict move save error - ${gameInfo}: [${errorName}] ${errorMsg} | UA: ${browserInfo} | stack: ${errorStack}`)
	}
}

export async function savePrePhaseConflict() {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true
	store.viewSettings.showLoader = true

	let conflictPresetData = ""
	const savingPhase = store.gameflow.phase - rf.PRE_PHASE_OFFSET
	const savingTurn = store.gameflow.turn

	// If editing the CURRENT conflict section and choosing to call conflict,
	// process it as an actual conflict call instead of saving a preset
	if (store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_CONFLICT && savingTurn === store.actualGameState.turn && rf.getBaseConflictPhase(savingPhase) === rf.getBaseConflictPhase(store.actualGameState.phase)) {
		store.gameflow.phase = store.actualGameState.phase
		store.gameflow.turn = store.actualGameState.turn
		controller.endPlayerTurn()
		return
	}

	let conflictPresetMove = {
		turn: savingTurn,
		phase: savingPhase,
		conflictPreset: [store.conflictPreset.conflictDecision, store.conflictPreset.prayingDecision, store.conflictPreset.turnOrderDecision],
	}
	// Now reset the conflict choices
	view.resetConflictPreferences()

	conflictPresetData = funcs.compressData64(conflictPresetMove)

	let csrftoken = funcs.getCookie("csrftoken")

	let BKSN = personal.pov >= 0 ? store.players[personal.pov].name : personal.name

	let postData = {
		action: "saveConflictPreset",
		latestUpdate: personal.latestUpdate,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		BKSN: BKSN,
		conflictPresetData: conflictPresetData,
		savingPhase: savingPhase,
		savingTurn: savingTurn,
	}

	try {
		const response = await fetch("/RNB/processRNBturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			const errorData = await response.json() // Assuming the server returns JSON error data
			const errorMessage = errorData.error || "Network response was not ok"
			throw new Error(errorMessage)
		}
		const data = await response.json()
		if (data.syncError === true) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		// If the move was directly processed, do normal end of turn stuff
		if (data.savedConflictPreset) {
			funcs.importRNBmodel(data.gameDataB64, false)
			personal.currentMoveData = data.currentMoveData
			personal.allMyMoveData = data.allMyMoveData
			personal.gameDataB64 = data.gameDataB64
			store.viewSettings.showLoader = false
			loadCurrentMove()
			personal.haltPlay = false
			controller.startPlayerTurn()
			return
		}
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error saving the game - Send all this to admin (eg on discord/email)"
		const payloadInfo = `turn=${postData.turn}, phase=${postData.phase}, LU=${postData.latestUpdate}, action=${postData.action}, BKSN=${postData.BKSN}`
		const gameInfo = `Game ${personal.gameID} - User ${personal.name || "unknown"} - ${payloadInfo}`
		const errorName = error && error.name ? error.name : "Error"
		const errorMsg = error && error.message ? error.message : String(error)
		const errorStack = error && error.stack ? String(error.stack).substring(0, 1200) : "no stack"
		const browserInfo = typeof navigator !== "undefined" ? navigator.userAgent : "unknown UA"
		sendDiscordWebhook(`RNB pre-phase conflict save error - ${gameInfo}: [${errorName}] ${errorMsg} | UA: ${browserInfo} | stack: ${errorStack}`)
	}
}

export async function savePrePhaseMain() {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true
	store.viewSettings.showLoader = true

	stack.resetStackControlData()
	let conflictPresetData = ""
	let mainPhaseSkipsData = []
	// Only save conflict at the end of a MAIN phase -- IE EVERY TIME, as this only hapens for main phases
	let conflictPresetMoves = []
	// Add the directly upcoming conflict
	//const additionalTurns = Math.floor(store.gameflow.futureUnboundedMainPhaseNum / 16)
	const additionalTurns = 0
	const turnRequired = store.gameflow.turn + additionalTurns
	let conflictPresetMove = {
		turn: turnRequired,
		phase: store.gameflow.phase - rf.PRE_PHASE_OFFSET + 1,
		conflictPreset: [store.conflictPreset.conflictDecision, store.conflictPreset.prayingDecision, store.conflictPreset.turnOrderDecision],
	}

	if (conflictPresetMove.phase === rf.MAX_PHASE_REACHED) {
		conflictPresetMove.phase = rf.PHASE_CONFLICT_PRODUCTION_DECISION
		conflictPresetMove.turn++
	}
	conflictPresetMoves.push(conflictPresetMove)

	if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) {
		if (store.conflictPreset.skipWonderPhaseDecision === rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_ALL)
			// Skip Wonder Phase AND THEN PRODUCTION CONFLICT - this will be for the next turn
			conflictPresetMoves.push({
				turn: store.gameflow.turn + 1,
				phase: rf.PHASE_CONFLICT_PRODUCTION_DECISION,
				conflictPreset: [rf.CONFLICT_DECISION_NO_CONFLICT, 0, 0],
			})
	}
	// Add any preset-conflicts
	if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase) || rf.PHASE_WONDERS.includes(store.gameflow.phase)) {
		if (store.conflictPreset.skipProductionPhaseDecision === rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_ALL)
			// Skip Wonder proudction phase AND THEN MOVEMENT Conflict - this will be for the next turn
			conflictPresetMoves.push({
				turn: store.gameflow.turn + 1,
				phase: rf.PHASE_CONFLICT_MOVEMENT_DECISION,
				conflictPreset: [rf.CONFLICT_DECISION_NO_CONFLICT, 0, 0],
			})
	}
	conflictPresetData = funcs.compressData64(conflictPresetMoves)
	// Finally, add any preset skip moves
	if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) {
		if (store.conflictPreset.skipWonderPhaseDecision === rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_ALL || store.conflictPreset.skipWonderPhaseDecision === rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_WONDER_ONLY) {
			// Skip Wonder Phase
			mainPhaseSkipsData.push([store.gameflow.turn, rf.PHASE_WONDER_TO])
		}
	}
	// Add any preset-conflicts
	if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase) || rf.PHASE_WONDERS.includes(store.gameflow.phase)) {
		if (store.conflictPreset.skipProductionPhaseDecision === rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_ALL || store.conflictPreset.skipProductionPhaseDecision === rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_PRODUCTION_ONLY) {
			// Skip proudction phase
			mainPhaseSkipsData.push([store.gameflow.turn + 1, rf.PHASE_PRODUCTION_TO])
		}
	}
	// Now reset the conflict choices
	view.resetConflictPreferences()

	let csrftoken = funcs.getCookie("csrftoken")

	let actionStack = ""
	// If it is a MAIN PHASE, save the stack - THIS WILL ALWAYS BE A MAIN PHASE
	// Check if any element in the stack is missing OR has a null in its history
	const hasError = store.actionStack.some((subArr) => {
		// 1. Ensure subArr itself isn't undefined/null
		if (!subArr || !subArr.historyEntry) return true

		// 2. Check for nulls inside the history
		return subArr.historyEntry.some((e) => e == null)
	})

	if (hasError) {
		rf.doAdminAlrt("SEND TO ADMIN: ERROR CODE 1 - IO stack error found")
	}

	actionStack = store.actionStack.length === 0 ? "SKIP" : funcs.compressData64(store.actionStack)

	let BKSN = personal.pov >= 0 ? store.players[personal.pov].name : personal.name

	let postData = {
		action: "savePrePhaseMain",
		latestUpdate: personal.latestUpdate,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		//futureTurn: model.getCorrectTurnForPhasePreseet(store.gameflow.turn, store.gameflow.currentPhase, store.gameflow.phase - rf.PRE_PHASE_OFFSET),
		futureTurn: store.gameflow.turn,
		futurePhase: store.gameflow.phase - rf.PRE_PHASE_OFFSET,
		knownArrayLengths: store.knownArrayLengths,
		knownFinalHistoryidx: store.knownFinalHistoryidx,
		playerIndex: personal.pov,
		expectedResPreProduction: store.expectedResPreProduction,
		status: "ACTIVE",
		gameID: personal.gameID,
		actionStack: actionStack,
		mainPhaseSkipsData: mainPhaseSkipsData,
		BKSN: BKSN,
		conflictPresetData: conflictPresetData,
	}

	try {
		const response = await fetch("/RNB/processRNBturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			const errorData = await response.json() // Assuming the server returns JSON error data
			const errorMessage = errorData.error || "Network response was not ok"
			throw new Error(errorMessage)
		}
		const data = await response.json()
		if (data.syncError === true) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		// If your move was saved, then just store that
		if (data.savedMoveForLater) {
			// Remove the preset selection from actions
			context.resetContext()
			store.viewSettings.showLoader = false
			store.gameMessages.successText = "Your move has been saved"
			// You have just done your stack, so it is loaded. Set this to allow premoves / cancel
			store.stackControl.loadedPreMove = true
			personal.currentMoveData = data.currentMoveData
			personal.allMyMoveData = data.allMyMoveData
			personal.gameDataB64 = data.gameDataB64
			// LEAVE THIS TRUE - otherwise nothing to stop you from playing!
			personal.haltPlay = false
			resetGameStateToLoadedPreMove()
			return
		}
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error saving the game - Send all this to admin (eg on discord/email)"
		const payloadInfo = `turn=${postData.turn}, phase=${postData.phase}, LU=${postData.latestUpdate}, action=${postData.action}, BKSN=${postData.BKSN}`
		const gameInfo = `Game ${personal.gameID} - User ${personal.name || "unknown"} - ${payloadInfo}`
		const errorName = error && error.name ? error.name : "Error"
		const errorMsg = error && error.message ? error.message : String(error)
		const errorStack = error && error.stack ? String(error.stack).substring(0, 1200) : "no stack"
		const browserInfo = typeof navigator !== "undefined" ? navigator.userAgent : "unknown UA"
		sendDiscordWebhook(`RNB pre-phase main save error - ${gameInfo}: [${errorName}] ${errorMsg} | UA: ${browserInfo} | stack: ${errorStack}`)
	}
}

// By default this is a SUB FUNCTION of another save: it clears the transactionID on success but
// leaves the loader / haltPlay / broadcast to the caller (which usually has its own startPlayerTurn).
// Pass finalize = true when this is the terminal step of a transaction (eg disconnect recovery): it
// then self-completes everything (hide loader, resume play, broadcast) so completion does not depend
// on the caller and a disconnect right after the POST cannot leave the client half-finished.
export async function saveAndUpdateNotifictionsAfterStack(currentPlayerNeedsToFixMove, finalize = false /*phaseChanged*/) {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true
	store.viewSettings.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	const { allIsCurrentPlayers, allRemainingPlayersInTurnOrder, pendingPlayersArr } = getNextCurrentPlayers()

	let gameDataB64 = funcs.exportRNBmodel(false)
	personal.gameDataB64 = gameDataB64
	let BKSN = personal.pov >= 0 ? store.players[personal.pov].name : personal.name

	let postData = {
		action: "saveAndUpdateNotifictionsAfterStack",
		latestUpdate: personal.latestUpdate,
		gameDataB64: gameDataB64,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		BKSN: BKSN,
	}

	// Double check this at some point. 
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		postData.status = "FINISHED"
		postData.winnerUsername = store.players[store.gameflow.fullTurnOrder[0]].name
		postData.saveRewind = false
		postData.data = funcs.exportRNBmodel(true)
		postData.finalPositions = [...store.gameflow.fullTurnOrder]

		const turnOrder = store.gameflow.fullTurnOrder
		const winningPlayerScore = wonder.getPlayerWonderPoints(turnOrder[0]) + wonder.getHeldResourcesScore(turnOrder[0])
		postData.winningPlayerScore = winningPlayerScore
		postData.tournamentData = turnOrder.map((playerIdx, i) => {
			const player = store.players[playerIdx]

			// First player gets [Name], others get [Name, calculatedValue]
			if (i === 0) return [player.name]

			const playerScore = wonder.getPlayerWonderPoints(playerIdx) + wonder.getHeldResourcesScore(playerIdx)
			const diffValue = Math.ceil((winningPlayerScore - playerScore) / 10)
			return [player.name, diffValue]
		})
	}

	postData.allIsCurrentPlayers = allIsCurrentPlayers
	postData.allRemainingPlayersInTurnOrder = allRemainingPlayersInTurnOrder
	postData.pendingPlayersArr = pendingPlayersArr
	postData.currentPlayerNeedsToFixMove = currentPlayerNeedsToFixMove
	postData.transactionID = personal.transactionID
	//postData.phaseChanged = phaseChanged // NOT USED

	try {
		const response = await fetch("/RNB/processRNBturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			const errorData = await response.json() // Assuming the server returns JSON error data
			const errorMessage = errorData.error || "Network response was not ok"
			throw new Error(errorMessage)
		}
		const data = await response.json()
		if (data.syncError === true) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			if (finalize) {
				store.viewSettings.showLoader = false
				personal.haltPlay = false
			}
			return false
		}
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		personal.currentMoveData = data.currentMoveData || {}
		personal.allMyMoveData = data.allMyMoveData || []
		// The server cleared its transactionID in this same save, so the transaction is complete here.
		personal.transactionID = ""
		const loadedPreMove = loadCurrentMove()
		if (finalize) {
			store.viewSettings.showLoader = false
			personal.haltPlay = false
			WS.broadcastGameUpdate(null)
		}
		return loadedPreMove
	} catch (error) {
		console.error("Error fetching data:", error)
		sendDiscordWebhook(`saveAndUpdateNotifictionsAfterStack failed: ${error.message}. Game may be in inconsistent state. GameID: ${personal.gameID}`)
		store.gameMessages.errorText = "Error saving the game"
		// Even on failure, don't leave the UI frozen when this was the terminal step.
		if (finalize) {
			store.viewSettings.showLoader = false
			personal.haltPlay = false
		}
		return false
	}
}

export async function cancelPresetMoves(turn, futureUnboundedMainPhaseNum) {
	const store = useModelStore()
	const personal = usePersonalStore()

	const phase = futureUnboundedMainPhaseNum % 16

	personal.haltPlay = true
	store.viewSettings.showLoader = true

	stack.resetStackControlData()

	let csrftoken = funcs.getCookie("csrftoken")

	let BKSN = personal.pov >= 0 ? store.players[personal.pov].name : personal.name

	let postData = {
		action: "cancelPresetMoves",
		latestUpdate: personal.latestUpdate,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		startingTurn: turn,
		startingPhase: phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		BKSN: BKSN,
	}

	try {
		const response = await fetch("/RNB/processRNBturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			const errorData = await response.json() // Assuming the server returns JSON error data
			const errorMessage = errorData.error || "Network response was not ok"
			throw new Error(errorMessage)
		}
		const data = await response.json()
		if (data.syncError === true) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		// If the move was directly processed, do normal end of turn stuff
		if (data.deletedMoves) {
			funcs.importRNBmodel(data.gameDataB64, false)
			personal.currentMoveData = data.currentMoveData
			personal.allMyMoveData = data.allMyMoveData
			personal.gameDataB64 = data.gameDataB64
			loadCurrentMove()

			store.viewSettings.showLoader = false
			personal.haltPlay = false
			controller.startPlayerTurn()
			return
		}
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error saving the game - Send all this to admin (eg on discord/email)"
		const payloadInfo = `turn=${postData.turn}, phase=${postData.phase}, LU=${postData.latestUpdate}, action=${postData.action}, BKSN=${postData.BKSN}`
		const gameInfo = `Game ${personal.gameID} - User ${personal.name || "unknown"} - ${payloadInfo}`
		const errorName = error && error.name ? error.name : "Error"
		const errorMsg = error && error.message ? error.message : String(error)
		const errorStack = error && error.stack ? String(error.stack).substring(0, 1200) : "no stack"
		const browserInfo = typeof navigator !== "undefined" ? navigator.userAgent : "unknown UA"
		sendDiscordWebhook(`RNB cancel preset moves error - ${gameInfo}: [${errorName}] ${errorMsg} | UA: ${browserInfo} | stack: ${errorStack}`)
	}
}

export async function loadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let currentParam = []
	if (store.history[store.history.length - 1][0] === rf.HIST_REWIND) {
		currentParam = JSON.parse(JSON.stringify(store.history[store.history.length - 1][3]))
	}

	store.clearMessages()
	context.resetContext()

	store.viewSettings.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	if (store.viewSettings.showReplay) {
		store.gameMessages.errorText = "Error: Exit Replay Mode First"
		store.viewSettings.performingRewind = false
		store.viewSettings.showLoader = false
		return
	}

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		store.gameMessages.errorText = "Error: Game Ended"
		store.viewSettings.performingRewind = false
		store.viewSettings.showLoader = false
		return
	}

	try {
		const response = await fetch("/RNB/processRNBturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "loadRewind",
				gameID: personal.gameID,
				latestUpdate: personal.latestUpdate,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.syncError === true) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			store.viewSettings.performingRewind = false
			return
		}

		// Hide the dropdown
		if (data.errorMessage) {
			store.gameMessages.errorText = data.errorMessage
			store.viewSettings.performingRewind = false
			controller.startPlayerTurn()
		} else {
			funcs.importRNBmodel(data.gameDataB64, false)
			personal.gameDataB64 = data.gameDataB64
			personal.latestUpdate = data.latestUpdate
			window.initData.latestUpdate = data.latestUpdate
			personal.currentMoveData = {}
			personal.allMyMoveData.splice(0)

			if (!currentParam.includes(personal.pov)) currentParam.push(personal.pov)
			if (personal.name !== "BotKickStarter") model.addHistory(rf.HIST_REWIND, personal.pov, 0, [...currentParam])
			else model.addHistory(rf.HIST_REWIND, -1, 0, [...currentParam])

			// Re kick booted players
			for (let i = 0; i < data.missingPlayers.length; i++) {
				for (let j = 0; j < store.players.length; j++) {
					if (store.players[j].name == data.missingPlayers[i]) {
						store.players[j].displayName = rf.BOT_NAME
					}
				}
			}

			// Send back to DB with another save
			updateDataFromLoadRewind()
		}
		store.viewSettings.showLoader = false
	} catch (error) {
		console.error("Error rewinding data:", error)
		store.gameMessages.errorText = "Error rewinding the game"
		store.viewSettings.performingRewind = false
	}
}

async function updateDataFromLoadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket() // No 'await'! Starts in background.
	}

	store.viewSettings.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	const { allIsCurrentPlayers, allRemainingPlayersInTurnOrder, pendingPlayersArr } = getNextCurrentPlayers()

	let gameDataB64 = funcs.exportRNBmodel(false)

	try {
		const response = await fetch("/RNB/processRNBturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "updateDataFromLoadRewind",
				turn: store.gameflow.turn,
				allIsCurrentPlayers: allIsCurrentPlayers, // USED > goes to currentPlayers
				allRemainingPlayersInTurnOrder: allRemainingPlayersInTurnOrder,
				pendingPlayersArr: pendingPlayersArr,
				gameID: personal.gameID,
				phase: store.gameflow.phase,
				gameDataB64: gameDataB64,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout

		// Broadcast update
		WS.broadcastGameUpdate(wsConnecting)

		store.viewSettings.showLoader = false
		store.viewSettings.performingRewind = false
		Bot.removeBotPlayers()
		if (store.gameflow.turnOrder.length === 0) controller.endCurrentPhase()
		//if (store.gameflow.phase !== rf.PHASE_PRODUCTION && store.gameflow.phase !== rf.PHASE_MOVE_PIRATE) store.resetContext()

		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error updating data:", error)
		store.gameMessages.errorText = "Error updating the game"
		store.viewSettings.performingRewind = false
		controller.startPlayerTurn()
	}
}

export async function sendChatMessage(newEntry) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.viewSettings.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")
	try {
		const response = await fetch("/RNB/sendChatMessageRNB/", {
			method: "POST",
			body: JSON.stringify({
				action: "sendChatMessage",
				player: personal.name,
				gameID: personal.gameID,
				newEntry: newEntry,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (!data.chatData) {
			store.gameMessages.errorText = "Sorry, there was a problem. Please email the webmaster directly"
			return
		}
		store.chatData = funcs.decompressChatData(data.chatData)
		if (personal.liveWS) WS.RNBwebSocket.send("NEWCHATTS" + String(personal.gameID)) //+ String(result.latestUpdate));
		store.viewSettings.showLoader = false
	} catch (error) {
		console.error("Error sending chat:", error)
		store.gameMessages.errorText = "Error sending chat message"
	}
}

export async function reloadChatData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")

	// Function to fetch data from the database
	try {
		const response = await fetch("/RNB/data/2/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})

		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()

		store.chatData = funcs.decompressChatData(data.chatData)
		if (store.viewSettings.showHistory) {
			store.clearHistoryHelpers()
			store.viewSettings.showHistory = false
		}
		store.viewSettings.showChat = true
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

export async function reloadGameData(updatingFromWSAndCanPlay = false) {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")
	store.viewSettings.showLoader = true
	store.clearMessages()

	let oldPhase = store.gameflow.phase
	let oldTurn = store.gameflow.turn
	// If you are in the middle of setting a pre-phase, we must ensure we check against the actual current phase and turn
	if (oldPhase >= rf.PRE_PHASE_OFFSET) {
		oldPhase = store.gameflow.currentPhase
		oldTurn = store.actualGameState.turn
	}
	const oldTurnOrder = [...store.gameflow.turnOrder]

	// Function to fetch data from the database
	try {
		const response = await fetch("/RNB/data/1/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})

		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		stack.resetStackControlData()
		const wasInPrePhase = store.gameflow.phase >= rf.PRE_PHASE_OFFSET
		let storedActionStackCopy = []
		if (data.finishedGame) funcs.importRNBmodel(data.gameDataB64, false)
		else {
			// If updating from WS, AND mid play, Store the action stack and undo points, then reset, then reload
			storedActionStackCopy = JSON.parse(JSON.stringify(store.actionStack))
			if (store?.actionStack?.some((subArr) => subArr?.historyEntry?.some((e) => e == null))) rf.doAdminAlrt("SEND TO ADMIN: ERROR CODE 2 - IO stack error found")

			funcs.importRNBmodel(data.gameDataB64, false)
			// Clear any stale pre-phase / in-progress data that importRNBmodel doesn't reset
			store.gameflow.currentPhase = store.gameflow.phase
			store.gameflow.futureUnboundedMainPhaseNum = 16
			store.gameflow.futureUnboundedConflictPhaseNum = 16
			store.stackControl.previewingPhase = null

			// Remove this
			store.context.action = rf.ACT_NONE
			store.wholeTurnResetData = funcs.simpleExportWholeRNBmodel()
			window.initData.gameDataB64 = data.gameDataB64
			personal.gameDataB64 = data.gameDataB64
		}

		personal.secondsToNextKickout = data.secondsToNextKickout
		personal.latestUpdate = data.latestUpdate

		window.initData.latestUpdate = data.latestUpdate
		window.initData.secondsToNextKickout = data.secondsToNextKickout
		window.initData.finishedGame = data.finishedGame

		// Check if the load is a rewind
		let loadingFromRewind = false
		let loadedPreMove = false
		// If the turn has gone down, or the turn is the same but the phase has gone down, or turn and phase is same, but new turnorder is now longer
		if (oldTurn > store.gameflow.turn) {
			loadingFromRewind = true
		} else if (oldTurn === store.gameflow.turn) {
			if (oldPhase > store.gameflow.phase) {
				loadingFromRewind = true
			} else if (oldPhase === store.gameflow.phase && store.gameflow.turnOrder.length > oldTurnOrder.length) {
				loadingFromRewind = true
			}
		}

		personal.currentMoveData = data.currentMoveData || {}
		personal.allMyMoveData = data.allMyMoveData || []

		// Transaction recovery: if server has a stuck transaction lock, process stacks and clear it.
		// saveAndUpdateNotifictionsAfterStack clears personal.transactionID itself on success; left as a
		// sub-step (finalize = false) because reloadGameData finishes loading below.
		// Skip if game is already over - no need to process stacks or save
		if (data.transactionID && personal.pov >= 0 && store.gameflow.phase !== rf.PHASE_GAME_OVER) {
			personal.transactionID = data.transactionID
			const allStackData = data.allStackData || []
			store.allStackData = allStackData
			processStacks(allStackData)
			await saveAndUpdateNotifictionsAfterStack(false)
		}

		// KICKSTART: a main/simul phase with no current players (turnOrder rebuilt from the imported
		// gameData) is only valid mid-saveStackMove. Seeing it on a WS reload means the phase never
		// advanced, so drive it forward now. Skip if a transactionID is set (handled above).
		// Skip if game is already over - no need to process stacks or save
		if (!data.transactionID && personal.pov >= 0 && store.gameflow.phase !== rf.PHASE_GAME_OVER && store.gameflow.turnOrder.length === 0 && (controller.isSimulPhase() || controller.isMainPhaseAndPseudoSimul())) {
			const allStackData = data.allStackData || []
			store.allStackData = allStackData
			processStacks(allStackData)
			await saveAndUpdateNotifictionsAfterStack(false)
		}

		// BOT RECOVERY: if the current player is a bot, auto-process to end its turn and advance the game.
		// processStacks already strips/handles bots in all phases (main, conflict decision, praying, TO).
		const firstPlayerIdx = store.gameflow.turnOrder[0]
		if (!data.transactionID && personal.pov >= 0 && store.gameflow.phase !== rf.PHASE_GAME_OVER && Number.isInteger(firstPlayerIdx) && firstPlayerIdx >= 0 && firstPlayerIdx < store.players.length && store.players[firstPlayerIdx].displayName === rf.BOT_NAME) {
			const allStackData = data.allStackData || []
			store.allStackData = allStackData
			processStacks(allStackData)
			await saveAndUpdateNotifictionsAfterStack(false)
		}

		if (loadingFromRewind) {
			personal.gameDataB64 = data.gameDataB64
			// turn 1 movement phase comes after setup phase
			if (store.gameflow.turn !== 1 && store.gameflow.phase !== rf.PHASE_MOVEMENT_TO) store.gameMessages.successText = "Game loaded from rewind"
			store.actionStack.splice(0)
		} else if (wasInPrePhase || !updatingFromWSAndCanPlay || storedActionStackCopy.length === 0 || oldTurn !== store.gameflow.turn || oldPhase !== store.gameflow.phase) {
			loadedPreMove = loadCurrentMove()
		} else {
			let tempMoveData = {
				actionStack: funcs.compressData64(storedActionStackCopy),
			}
			stack.attemptToLoadWholeCurrentMoveStack(tempMoveData, store.gameflow.phase)
			if (store.actionStack.length > 0) {
				loadedPreMove = true
				store.gameMessages.successText = "Game updated - in progress moves have been redone"
			} else store.gameMessages.successText = "Game updated"
		}
		personal.haltPlay = false
		store.viewSettings.showLoader = false
		if (updatingFromWSAndCanPlay && personal.canPlay()) {
			context.resetContext()
			highlight.updateAllHighlightsForTransporterMode()
			// Rewinding into choose home tile needs a startPlayerTurnTrigger
			if (store.gameflow.phase === rf.PHASE_CHOOSE_HOME_TILE) controller.startPlayerTurn()
		} else {
			controller.startPlayerTurn(loadedPreMove)
		}
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

export async function saveNotes() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	store.gameMessages.errorText = ""

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/RNB/saveNotesRNB/", {
			method: "POST",
			body: JSON.stringify({
				action: "saveNotes",
				player: personal.name,
				gameID: personal.gameID,
				notes: funcs.htmlEscape(personal.notes),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		const data = await response.json()
		if (data.error) {
			store.gameMessages.errorText = data.error
			store.viewSettings.showLoader = false
			return
		}
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		if (!data.notePosted) {
			store.gameMessages.errorText = "Sorry, there was a problem. Please email the webmaster directly"
			return
		}
		store.viewSettings.showLoader = false
	} catch (error) {
		console.error("Error saving Notes:", error)
		store.gameMessages.errorText = "Error saving Notes"
	}
}

// Simply saves as a no kickout missing ALSO FOR GRAVE GAME OVER
export async function resign() {
	/* ONLY GET HERE WITH 0 HEX ACTIONS USED */
	const store = useModelStore()
	const personal = usePersonalStore()

	store.viewSettings.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/RNB/processRNBturn/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
				action: "resign",
				user: personal.name,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		//const data = await response.json()
		await response.json()
	} catch (error) {
		console.error("Error resiging:", error)
		store.gameMessages.errorText = "Error Resigning"
	}
}

export async function kickout() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	const kickedPlayerObj = controller.timedOutPlayerObj()
	//const kickedPlayerIndex = controller.timedOutPlayerIndex()

	var postData = {
		action: "kickout",
		gameID: personal.gameID,
		kickedName: kickedPlayerObj.name,
		latestUpdate: personal.latestUpdate,
	}

	try {
		const response = await fetch("/RNB/processRNBturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.syncError) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		if (data.voteCast) {
			store.kickoutVotesData = data.votesData
			store.viewSettings.showLoader = false
			store.gameMessages.successText = "Kickout vote recorded"
			return data
		}
		personal.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		return data
	} catch (error) {
		console.error("Error kicking:", error)
		rf.doAdminAlrt("Error Kicking")
	}
}

export async function saveZoom() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let csrftoken = funcs.getCookie("csrftoken")

	let zoomLevel = store.refSize / 100

	try {
		const response = await fetch("/RNB/saveZoomRNB/", {
			method: "PUT",
			body: JSON.stringify({
				action: "zoom",
				zoomLevel: String(zoomLevel),
				playerNumber: personal.pov,
				allPlayers: personal.trainingGame,
				gameID: personal.gameID,
			}),
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json; charset=UTF-8",
				"X-CSRFToken": csrftoken,
			},
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
	} catch (error) {
		console.error("Error zooming:", error)
	}
}

export async function castVote(topic) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.viewSettings.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	let postData = {
		action: "castVote", // USED
		topic: topic, // USED
		gameID: personal.gameID, // USED
	}

	try {
		const response = await fetch("/RNB/castVote/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			store.gameMessages.errorText = "Error; Contact Admin"
			throw new Error("Network response was not ok")
		}
		const data = await response.json()

		store.viewSettings.showLoader = false
		if (data.voteChanged === true) {
			store.gameMessages.bugSuccessText = "Vote Saved"

			if (topic === rf.DELETE_VOTE_TOPIC) {
				personal.votedToDelete = true
				store.deleteVotesData = JSON.parse(data.votesData)
				if (data.redirect_url) window.location.href = data.redirect_url
			} else if (topic === rf.STATS_EXCLUDE_VOTE_TOPIC) {
				personal.votedToExclude = true
				store.statsExcludeVotesData = JSON.parse(data.votesData)
			}
		} else store.gameMessages.errorText = "Error; Contact Admin"
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error; Contact Admin"
		return false
	}
}

export async function checkForLatestData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")
	try {
		const response = await fetch("/RNB/data/3/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
				latestUpdate: personal.latestUpdate,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})

		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.gameDoesNotExist === true) location.reload()
		if (data.latest === true) return
		else {
			if (store.gameflow.phase === rf.PHASE_GAME_OVER) funcs.importRNBmodel(data.gameDataB64, true)
			else funcs.importRNBmodel(data.gameDataB64, false)
			// TEST THIS Clear any stale pre-phase / in-progress data that importRNBmodel doesn't reset
			//store.actionStack.splice(0)
			//store.undoPoints.splice(0)

			personal.gameDataB64 = data.gameDataB64
			personal.secondsToNextKickout = data.secondsToNextKickout
			personal.latestUpdate = data.latestUpdate

			personal.currentMoveData = data.currentMoveData
			personal.allMyMoveData = data.allMyMoveData
			personal.gameDataB64 = data.gameDataB64
			// If you have a move, import that too for the visuals
			loadCurrentMove()

			store.viewSettings.showLoader = false
			controller.startPlayerTurn()
		}
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

export async function submitStatsExcludeConsent() {
	//const store = useModelStore()
	//const personal = usePersonalStore()

	await simulateServer("submitStatsExcludeConsent")
}

async function simulateServer(flag) {
	const store = useModelStore()
	rf.doAdminAlrt(flag)
	store.viewSettings.showLoader = true
	await funcs.sleep(500)
	store.viewSettings.showLoader = false
}

export async function submitBug(bugContent) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.viewSettings.showLoader = true
	var csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/RNB/bugEntry/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
				action: "bugentry",
				description: bugContent,
				// This MUST be gameData to math the unified game model
				gameData: funcs.simpleExportWholeRNBmodel(),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.bugEntrySuccess) {
			store.gameMessages.successText = "Your bug report has been submitted"
			store.viewSettings.showLoader = false
			store.viewSettings.showBug = false
		} else store.gameMessages.bugErrorText = "Sorry, there was a problem.<br/>Please email the RNBmaster directly or report on the Discord"
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.bugErrorText = "Sorry, there was a problem.<br/>Please email the webmaster directly or report on the Discord"
	}
	store.viewSettings.showLoader = false
}

export function processStacks(allStackData) {
	const store = useModelStore()
	let needToStop = 0
	let phaseChanged = false
	while (needToStop === 0) {
		// PROCESS MAIN PHASE
		store.wholeTurnResetData = funcs.simpleExportWholeRNBmodel()
		if (rf.MAIN_PHASES.includes(store.gameflow.phase)) {
			// Recovery: turnOrder may contain -1 placeholders if it was rebuilt from incomplete arrays
			store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < store.players.length)
			// In multiplayer, skip bot players when processing stacks sequentially
			while (store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) {
				store.gameflow.turnOrder.shift()
			}

			let errorFree = processMainMoveStacks(allStackData)
			// If there WAS an error, exit, save, send notification
			if (!errorFree) {
				// Reset to the start of the turn
				funcs.simpleImportWholeRNBmodel(store.wholeTurnResetData, false)
				needToStop = 1
				return {
					needToStop: 1,
					phaseChanged: phaseChanged,
				}
			}
			// If there were no errors, but there IS a current player, then that player has not submitted anything yet
			if (errorFree && store.gameflow.turnOrder.length > 0) {
				needToStop = 2
				return {
					needToStop: 2,
					phaseChanged: phaseChanged,
				}
			}
			// If there are no current players, then end the phase
			if (store.gameflow.turnOrder.length === 0) {
				// This also sets up the next phase TO
				controller.endCurrentPhase()
				phaseChanged = true
			}
		}
		// PROCESS CONFLICT PHASE
		else if (rf.ALL_PHASE_CONFLICTS.includes(store.gameflow.phase)) {
			// This only shows if there was an error or not, NOT why it stopped.
			// But actually we only stop if someone wants a choice. So that must be the reason.

			if (rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) {
				const result = processConflictMoveStacks(allStackData)
				// If any error is found, alrt again
				if (result !== 0) {
					needToStop = 1
					rf.doAdminAlrt(`Error processing conflict, please submit bug report. Error code: ${result}`)
					return {
						needToStop: 1,
						phaseChanged: phaseChanged,
					}
				}
				// If we are in conflict decision, someone must have not set it, so need to stop
				if (rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) {
					needToStop = 2
					return {
						needToStop: 2,
						phaseChanged: true,
					}
				}
				// Otherwise, carry on to the next check
			}
			if (rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase)) {
				//const result2 = processConflictMoveStacks(allStackData)
				processConflictMoveStacks(allStackData)
				// If more than 1 player left, need a move
				if (store.gameflow.turnOrder.length > 1) {
					needToStop = 2
					return {
						needToStop: 2,
						phaseChanged: phaseChanged,
					}
				}
				// Otherwise, with a single player left, process that
				if (store.gameflow.turnOrder.length === 1) {
					controller.processOnePlayerLeftDuringConflict()
					phaseChanged = true
				}
				// If all remaining players were bots and got processed, advance the phase
				if (store.gameflow.turnOrder.length === 0) {
					controller.processOnePlayerLeftDuringConflict()
					phaseChanged = true
				}
			}

			if (rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase)) {
				//const result3 = processConflictMoveStacks(allStackData)
				processConflictMoveStacks(allStackData)
				// If more than 1 player left, need a move
				if (store.gameflow.turnOrder.length > 1) {
					needToStop = 2
					return {
						needToStop: 2,
						phaseChanged: phaseChanged,
					}
				}
				// Otherwise, with a single player left, process that
				if (store.gameflow.turnOrder.length === 1) {
					controller.processOnePlayerLeftDuringConflict()
					phaseChanged = true
				}
				// If all remaining players were bots and got processed, advance the phase
				if (store.gameflow.turnOrder.length === 0) {
					controller.processOnePlayerLeftDuringConflict()
					phaseChanged = true
				}
			}
		} else if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
			return {
				needToStop: 0,
				phaseChanged: false,
			}
		} else rf.doAdminAlrt(`Error: unexpected phase ${store.gameflow.phase}`)
	}

	return {
		needToStop: needToStop,
	}
}

export function processMainMoveStacks(allStackData) {
	const store = useModelStore()

	// NO! DO NOT SKIP OUT OF ORDER!
	// Otherwise we end up being unable to cancel the skip move if we're not first in TO
	/*
	// Process any skip entries for the current turn/phase regardless of turn order position
	// This handles cases where a skip preset was saved but turnOrder[0] hasn't submitted yet
	let skipIndex = allStackData.findIndex((data) => data.actionStack === "SKIP" && data.turn === store.gameflow.turn && data.phase === store.gameflow.phase)
	while (skipIndex !== -1) {
		const skipData = allStackData[skipIndex]
		const playerIndex = store.players.findIndex((p) => p.name === skipData.username)
		if (playerIndex !== -1 && store.gameflow.turnOrder.includes(playerIndex)) {
			if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) model.addHistory(rf.HIST_NO_PRODUCTION_ACTIONS, playerIndex, 0, [])
			else if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) model.addHistory(rf.HIST_NO_MOVEMENT_ACTIONS, playerIndex, 0, [])
			else if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) model.addHistory(rf.HIST_NO_BUILDING_ACTIONS, playerIndex, 0, [])
			else if (rf.PHASE_WONDERS.includes(store.gameflow.phase)) model.addHistory(rf.HIST_NO_WONDER_ACTIONS, playerIndex, 0, [])

			allStackData.splice(skipIndex, 1)
			store.allStackData = allStackData
			store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => idx !== playerIndex)
		} else {
			// Skip entry for a player not in turnOrder, remove it to avoid infinite loop
			allStackData.splice(skipIndex, 1)
			store.allStackData = allStackData
		}
		skipIndex = allStackData.findIndex((data) => data.actionStack === "SKIP" && data.turn === store.gameflow.turn && data.phase === store.gameflow.phase)
	}
		*/

	// Find out if there's data for the next player that matches the current turn/phase
	let nextDataIndex = -1
	if (store.gameflow.turnOrder.length > 0) nextDataIndex = allStackData.findIndex((data) => data.turn === store.gameflow.turn && data.phase === store.gameflow.phase && data.username === store.players[store.gameflow.turnOrder[0]].name)
	while (nextDataIndex !== -1) {
		const nextData = allStackData[nextDataIndex]

		// First, check for a skipped move
		if (nextData.actionStack === "SKIP") {
			if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) model.addHistory(rf.HIST_NO_PRODUCTION_ACTIONS, store.gameflow.turnOrder[0], 0, [])
			else if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) model.addHistory(rf.HIST_NO_MOVEMENT_ACTIONS, store.gameflow.turnOrder[0], 0, [])
			else if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) model.addHistory(rf.HIST_NO_BUILDING_ACTIONS, store.gameflow.turnOrder[0], 0, [])
			else if (rf.PHASE_WONDERS.includes(store.gameflow.phase)) model.addHistory(rf.HIST_NO_WONDER_ACTIONS, store.gameflow.turnOrder[0], 0, [])

			// Remove the data from the stack
			allStackData.splice(nextDataIndex, 1)
			store.allStackData = allStackData
			store.gameflow.turnOrder.shift()
			if (store.gameflow.turnOrder.length > 0) nextDataIndex = allStackData.findIndex((data) => data.turn === store.gameflow.turn && data.phase === store.gameflow.phase && data.username === store.players[store.gameflow.turnOrder[0]].name)
			else nextDataIndex = -1
			continue
		}

		let importedStack
		try {
			importedStack = funcs.decompressData64(nextData.actionStack)
		} catch {
			rf.doAdminAlrt(`Decompress failed for ${nextData.username} turn: ${nextData.turn} phase: ${nextData.phase}`)
			return false
		}
		//let result = stack.verifyAndPerformStack(importedStack, true, nextData)
		let result = stack.verifyAndPerformStack(importedStack, true)
		// If there is an error here, break and notify the player
		if (result.verified === false) {
			rf.doAdminConsolLg(`Error processing stack for ${nextData.username} turn: ${nextData.turn} phase: ${nextData.phase}`)
			return false
		}

		if (result.verified === true) {
			// If you processed movement, make sure all geese are dropped
			if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) {
				model.dropAllGeeseForPlayerIndex(store.gameflow.turnOrder[0])
			}

			// Remove the data from the stack
			allStackData.splice(nextDataIndex, 1)
			store.allStackData = allStackData
			store.gameflow.turnOrder.shift()
			if (store.gameflow.turnOrder.length > 0) nextDataIndex = allStackData.findIndex((data) => data.turn === store.gameflow.turn && data.phase === store.gameflow.phase && data.username === store.players[store.gameflow.turnOrder[0]].name)
			else nextDataIndex = -1
		}
	}

	// In multiplayer, remove any bot players that remain at the front of the turn order
	if (store.gameflow.turnOrder.length > 0) {
		while (store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) {
			store.gameflow.turnOrder.shift()
		}
	}

	return true
}

// Return 0 for no error, or flag if error found (except only 0 is returned, apparently)
export function processConflictMoveStacks(allStackData) {
	const store = useModelStore()
	// const conflictPreset = [callingConflict T=1,F=0, prayingDecisionVal wait=0,cash=1,pray=2, turnOrderDecisionVal 0/Early/Late]
	// First find out if there's any conflict, or any wait & see
	if (rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) {
		let conflictResult = Array(store.players.length).fill(-1)
		for (let i = 0; i < allStackData.length; i++) {
			if (allStackData[i].turn === store.gameflow.turn && allStackData[i].phase === store.gameflow.phase) {
				const playerIndex = store.players.findIndex((p) => p.name === allStackData[i].username)
				conflictResult[playerIndex] = allStackData[i].conflictPreset[0]
			}
		}
		// In multiplayer, bots always choose "no conflict"
		for (let i = 0; i < store.players.length; i++) {
			if (store.players[i].displayName === rf.BOT_NAME) {
				conflictResult[i] = rf.CONFLICT_DECISION_NO_CONFLICT
			}
		}

		// Firstly, if ANYONE has ALREADY called conflict, move to conflict praying
		if (conflictResult.includes(rf.CONFLICT_DECISION_CONFLICT)) {
			// Add history for players who called conflict
			const conflictPlayerIndexes = conflictResult.reduce((acc, val, idx) => (val === rf.CONFLICT_DECISION_CONFLICT ? [...acc, idx] : acc), [])
			model.addHistory(rf.HIST_CHOOSE_CONFLICT, -1, 0, [...conflictPlayerIndexes])
			// Go to the next phase - DECISION > PRAYING
			store.gameflow.phase++
			controller.startPhase()
			return 0
		}
		// Check all conflict presets have been filled in
		// If not, it could be a rewind deleting data. So go to "conflict wait & see"
		if (conflictResult.includes(-1) || conflictResult.includes(0)) {
			// Set the turn order with the missing names
			let missingConflictDecisions = []
			let fullIndexSet = []
			for (let i = 0; i < conflictResult.length; i++) {
				if (conflictResult[i] === -1 || conflictResult[i] === 0) missingConflictDecisions.push(i)
				fullIndexSet.push(i)
			}
			store.gameflow.fullTurnOrder = [...fullIndexSet]
			store.gameflow.turnOrder = [...missingConflictDecisions]

			return 0
		}
		// If every entry is 1, then there is no conflict
		if (conflictResult.every((c) => c === 1)) {
			// Go to the next phase - DECISION > PRAYING
			if (rf.PHASE_CONFLICT_PRODUCTIONS.includes(store.gameflow.phase)) store.gameflow.phase = rf.PHASE_PRODUCTION_TO
			else if (rf.PHASE_CONFLICT_MOVEMENTS.includes(store.gameflow.phase)) store.gameflow.phase = rf.PHASE_MOVEMENT_TO
			else if (rf.PHASE_CONFLICT_BUILDINGS.includes(store.gameflow.phase)) store.gameflow.phase = rf.PHASE_BUILDING_TO
			else if (rf.PHASE_CONFLICT_WONDERS.includes(store.gameflow.phase)) store.gameflow.phase = rf.PHASE_WONDER_TO
			store.gameflow.fullTurnOrder = [...store.gameflow.wonderTurnOrder]
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]

			controller.startPhase()
			return 0
		}

		// That should be it
		rf.doAdminAlrt(`Error processing conflict for turn ${store.gameflow.turn} phase ${store.gameflow.phase} conflictResult: ${JSON.stringify(conflictResult)}`)
	}

	// Otherwise, someone has chosen conflict, so try to process prayer presets
	if (rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase)) {
		// data is stored under decision. So compare currentPhase-1 wtih stored phase
		// Recovery: turnOrder may contain -1 placeholders if it was rebuilt from incomplete arrays
		store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < store.players.length)
		// In multiplayer, bots always cash in praying
		while (store.gameflow.turnOrder.length > 1 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) {
			wonder.cashInPraying(controller.currentPlayerIndex(), true)
			store.gameflow.turnOrder.shift()
		}
		// If the last remaining player is a bot, process it too so
		// newWonderPrayingOrder is fully populated before phase advance
		if (store.gameflow.turnOrder.length === 1 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) {
			wonder.cashInPraying(controller.currentPlayerIndex(), true)
			store.gameflow.turnOrder.shift()
		}

		if (store.gameflow.turnOrder.length === 0) return 0
		let nextDataIndex = allStackData.findIndex((data) => data.turn === store.gameflow.turn && data.phase === store.gameflow.phase - 1 && data.username === store.players[store.gameflow.turnOrder[0]].name)
		// Only process if there's data AND more than 1 player to move

		while (nextDataIndex !== -1 && store.gameflow.turnOrder.length > 1) {
			const nextData = allStackData[nextDataIndex]
			const prayerPreset = nextData.conflictPreset[1]
			// Check if we are in prayers phase
			if (store.gameflow.newWonderPrayingOrder.length > 0) {
				// If no preset, stop processing
				if (prayerPreset === rf.CONFLICT_PRAYING_WAIT_AND_SEE) {
					nextDataIndex = -1
					return 0
				}
				if (prayerPreset === rf.CONFLICT_PRAYING_CASH_IN) {
					wonder.cashInPraying(controller.currentPlayerIndex(), true)
					// Remove the data from the stack -- NO! IT HOLDS 3 ENTRIES!!!!!
					//allStackData.splice(nextDataIndex, 1)
					store.gameflow.turnOrder.shift()
				} else if (prayerPreset === rf.CONFLICT_PRAYING_KEEP_PRAYING) {
					wonder.keepPraying(controller.currentPlayerIndex(), true)
					// Remove the data from the stack
					//allStackData.splice(nextDataIndex, 1)
					store.gameflow.turnOrder.shift()
				}

				if (store.gameflow.turnOrder.length > 1) nextDataIndex = allStackData.findIndex((data) => data.turn === store.gameflow.turn && data.phase === store.gameflow.phase - 1 && data.username === store.players[store.gameflow.turnOrder[0]].name)
				else nextDataIndex = -1
			}
		}
	}
	// Otherwise we are in TO phase
	if (rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase)) {
		// data is stored under decision. So compare currentPhase-1 wtih stored phase
		// Recovery: turnOrder may contain -1 placeholders if it was rebuilt from incomplete arrays
		store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < store.players.length)
		// In multiplayer, bots always choose earliest turn order
		while (store.gameflow.turnOrder.length > 1 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) {
			wonder.setNewTurnOrderPosition(controller.currentPlayerIndex(), -1, true, false, true)
			store.gameflow.turnOrder.shift()
		}

		if (store.gameflow.turnOrder.length === 0) return 0
		let nextDataIndex = allStackData.findIndex((data) => data.turn === store.gameflow.turn && data.phase === store.gameflow.phase - 2 && data.username === store.players[store.gameflow.turnOrder[0]].name)
		// Only process if there's data AND more than 1 player to move
		while (nextDataIndex !== -1 && store.gameflow.turnOrder.length > 1) {
			const nextData = allStackData[nextDataIndex]
			const turnOrderDecisionVal = nextData.conflictPreset[2]
			// If no preset, stop processing
			if (turnOrderDecisionVal === rf.CONFLICT_TURN_ORDER_WAIT_AND_SEE) {
				nextDataIndex = -1
				return 0
			}
			if (turnOrderDecisionVal === rf.CONFLICT_TURN_ORDER_EARLIEST) {
				wonder.setNewTurnOrderPosition(controller.currentPlayerIndex(), -1, true, false, true)
				store.gameflow.turnOrder.shift()
			} else if (turnOrderDecisionVal === rf.CONFLICT_TURN_ORDER_LATEST) {
				wonder.setNewTurnOrderPosition(controller.currentPlayerIndex(), -1, false, true, true)
				store.gameflow.turnOrder.shift()
			}
			if (store.gameflow.turnOrder.length > 1) nextDataIndex = allStackData.findIndex((data) => data.turn === store.gameflow.turn && data.phase === store.gameflow.phase - 2 && data.username === store.players[store.gameflow.turnOrder[0]].name)
			else {
				controller.processOnePlayerLeftDuringConflict()
				nextDataIndex = -1
			}
		}
	}
	return 0 // error free
}

export function loadCurrentMove() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.pov < 0) return false
	// Reset conflict preferences to defaults first, then override with preset if one exists
	view.resetConflictPreferences()
	const currentMoveData = personal.currentMoveData

	if (Object.keys(currentMoveData).length === 0) return false
	if (currentMoveData.actionStack === "SKIP") {
		store.stackControl.loadedPreMove = true
		store.stackControl.loadedPreMoveIsSkip = true
		return true
	}
	if (rf.MAIN_PHASES.includes(store.gameflow.phase) && currentMoveData.actionStack !== "" && personal.pov >= 0) {
		if (currentMoveData.turn === store.gameflow.turn && currentMoveData.phase === store.gameflow.phase && currentMoveData.username === store.players[personal.pov].name && store.gameflow.turnOrder.includes(personal.pov)) {
			stack.attemptToLoadWholeCurrentMoveStack(currentMoveData, store.gameflow.phase)
			if (store.actionStack.length > 0) {
				store.stackControl.loadedPreMove = true
				store.stackControl.loadedPreMoveIsSkip = false
			} else {
				// Empty stack means it was a skip/no-op pre-move
				store.stackControl.loadedPreMove = true
				store.stackControl.loadedPreMoveIsSkip = true
			}
			// If loading the pre-move ended the game, save it so all players see game over
			if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
				saveGame(false, false)
			}
		}
	}
	// Otherwise match the pre-set conflict settings
	else if (rf.ALL_PHASE_CONFLICTS.includes(store.gameflow.phase)) {
		if (currentMoveData.conflictPreset && currentMoveData.conflictPreset.length === 3 && currentMoveData.turn === store.gameflow.turn && currentMoveData.phase >= store.gameflow.phase - rf.PHASE_LOOKBACK_AMOUNT && currentMoveData.username === store.players[personal.pov].name) {
			store.conflictPreset.conflictDecision = currentMoveData.conflictPreset[0]
			store.conflictPreset.prayingDecision = currentMoveData.conflictPreset[1]
			store.conflictPreset.turnOrderDecision = currentMoveData.conflictPreset[2]
		}
	}
	return true
}

export function resetGameStateToLoadedPreMove() {
	const store = useModelStore()
	const personal = usePersonalStore()
	funcs.importRNBmodel(personal.gameDataB64, false)
	// When resetting the game, save the DEFINITIVELY KNOWN lengths
	stack.saveKnownLengths()

	store.gameflow.currentPhase = store.gameflow.phase
	loadCurrentMove()
}

export function saveActualGameState() {
	const store = useModelStore()
	store.actualGameState.turn = store.gameflow.turn
	store.actualGameState.phase = store.gameflow.phase
}

/*export function previewPresetPhase(futureUnboundedMainPhaseNum) {
	const store = useModelStore()
	const personal = usePersonalStore()

	saveActualGameState()
	resetGameStateToLoadedPreMove()
	store.gameflow.currentPhase = store.gameflow.phase
	const futureMainPhaseNum = futureUnboundedMainPhaseNum % 16
	store.gameflow.phase = futureMainPhaseNum + rf.PRE_PHASE_OFFSET
	store.gameflow.futureUnboundedMainPhaseNum = futureUnboundedMainPhaseNum
	let processingPhase = store.gameflow.currentPhase
	while (![rf.PHASE_BUILDING_TO, rf.PHASE_MOVEMENT_TO, rf.PHASE_PRODUCTION_TO, rf.PHASE_WONDER_TO].includes(processingPhase)) {
		processingPhase--
		if (processingPhase === 0) processingPhase = 16
	}
	processingPhase = (processingPhase + 4) % 16
	let moveFound = true
	while (moveFound && processingPhase !== futureMainPhaseNum) {
		if (rf.PHASE_PRODUCTIONS.includes(processingPhase)) {
			store.gameflow.turn++
		}
		moveFound = false
		let turnRequired = store.gameflow.turn
		const prePhaseData = personal.allMyMoveData.find((entry) => entry.phase === processingPhase && entry.turn === turnRequired)
		if (prePhaseData) {
			moveFound = true
			stack.attemptToLoadWholeCurrentMoveStack(prePhaseData, processingPhase)
		}
		processingPhase = (processingPhase + 4) % 16
	}
	// If at the START of prod pre phase, increment turn now
	if (rf.PHASE_PRODUCTIONS.includes(futureMainPhaseNum)) {
		store.gameflow.turn++
	}
	// Also load the target phase itself
	{
		let turnRequired = store.gameflow.turn
		const prePhaseData = personal.allMyMoveData.find((entry) => entry.phase === futureMainPhaseNum && entry.turn === turnRequired)
		if (prePhaseData) {
			stack.attemptToLoadWholeCurrentMoveStack(prePhaseData, futureMainPhaseNum)
		}
	}
	store.stackControl.previewingPhase = futureUnboundedMainPhaseNum
}
*/
export function backFromPreview() {
	const store = useModelStore()
	resetGameStateToLoadedPreMove()
	store.gameflow.phase = store.gameflow.currentPhase
	store.stackControl.previewingPhase = null
}

export async function cancelPreviewAndRedo() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const phase = store.stackControl.previewingPhase
	store.stackControl.previewingPhase = null
	resetGameStateToLoadedPreMove()
	store.gameflow.phase = store.gameflow.currentPhase
	const futureMainPhaseNum = phase % 16
	const turnRequired = model.getCorrectTurnForPhasePreseet(store.gameflow.turn, store.gameflow.phase, futureMainPhaseNum)
	await cancelPresetMoves(turnRequired, phase)
	// After cancel completes, enter pre-phase panel for this phase
	// We need to call the same logic as presetMainPhase in ActionAreaPrePhase
	saveActualGameState()
	resetGameStateToLoadedPreMove()
	store.gameflow.currentPhase = store.gameflow.phase
	store.gameflow.phase = futureMainPhaseNum + rf.PRE_PHASE_OFFSET
	store.gameflow.futureUnboundedMainPhaseNum = phase
	let processingPhase = store.gameflow.currentPhase
	while (![rf.PHASE_BUILDING_TO, rf.PHASE_MOVEMENT_TO, rf.PHASE_PRODUCTION_TO, rf.PHASE_WONDER_TO].includes(processingPhase)) {
		processingPhase--
		if (processingPhase === 0) processingPhase = 16
	}

	processingPhase = (processingPhase + 4) % 16
	let moveFound = true
	while (moveFound && processingPhase !== futureMainPhaseNum) {
		if (rf.PHASE_PRODUCTIONS.includes(processingPhase)) {
			wonder.addBrickToWonder_core(8, [])
			store.gameflow.turn++
			produce.doMineProduction(false, [], true)
			controller.performAllPreProductionExceptMines()
			store.context.researchHexIDpossibilities = produce.findAllResearchHexIDpossibilities(personal.pov)
		}

		moveFound = false
		let turnRequired = store.gameflow.turn
		const prePhaseData = personal.allMyMoveData.find((entry) => entry.phase === processingPhase && entry.turn === turnRequired)
		if (prePhaseData) {
			moveFound = true
			stack.attemptToLoadWholeCurrentMoveStack(prePhaseData, processingPhase)
			if (rf.PHASE_PRODUCTIONS.includes(processingPhase)) {
				store.context.historyObj.splice(0)
				store.context.historyObj.push([])
				produce.doAutoSecondaryProduction(false)
				model.addHistory(rf.HIST_POST_PRODUCTION, -1, 0, [...store.context.historyObj])
				model.resetBuildingsAfterProduction()
			}
			if (rf.PHASE_MOVEMENTS.includes(processingPhase)) {
				model.dropAllGeeseForPlayerIndex(personal.pov)
			}
			processingPhase = (processingPhase + 4) % 16
		}
	}

	if (rf.PHASE_PRODUCTIONS.includes(futureMainPhaseNum)) {
		wonder.addBrickToWonder_core(8, [])
		store.gameflow.turn++
		produce.doMineProduction(false, [], true)
		controller.performAllPreProductionExceptMines()
		store.context.researchHexIDpossibilities = produce.findAllResearchHexIDpossibilities(personal.pov)
	}
	// Save remainingMoves so the intermediate phase processing above is not undone
	// This may fix allowing too many moves?
	const savedRemainingMoves = model.getAllInGameTransporters().map((t) => t.remainingMoves)
	controller.startPlayerMainPhasePreTurn()
	for (let i = 0; i < model.getAllInGameTransporters().length; i++) {
		model.getAllInGameTransporters()[i].remainingMoves = savedRemainingMoves[i]
	}
}
