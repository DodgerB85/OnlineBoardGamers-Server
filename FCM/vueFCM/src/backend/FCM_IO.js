import * as funcs from "../js/FCMfuncs.js"
import * as WS from "./FCMwebsocket.js"
import * as controller from "../js/FCMcontroller.js"
import * as rf from "../js/FCMreference.js"
import * as model from "../js/FCMmodel.js"
import * as context from "../js/FCMcontext.js"
import i18n from "../i18n.js"
import * as rules from "../js/FCMrules.js"
import * as map from "../js/FCMmap.js"
import * as plyr from "../js/FCMplayer.js"
import * as view from "../js/FCMview.js"

import { useModelStore } from "../stores/FCMstore.js"
import { makeAImove } from "../js/FCM_AI.js"

import { usePersonalStore } from "../stores/FCMpersonal.js"

//import { usePersonalStore } from "../stores/FCMpersonal.js"

function restartKickoutTimers() {
	const personal = usePersonalStore()
	if (personal.kickoutCountdownIntervalTimer != null) clearInterval(personal.kickoutCountdownIntervalTimer)
	if (personal.flexiKickoutCountdownIntervalTimer != null) clearInterval(personal.flexiKickoutCountdownIntervalTimer)
	if (personal.secondsToNextKickout <= 1200) {
		personal.kickoutCountdownIntervalTimer = setInterval(view.kickoutTimerTicker, 1000)
	}
	if (personal.kickoutRequired === 1 && personal.secondsToNextKickout <= 1200) {
		personal.flexiKickoutCountdownIntervalTimer = setInterval(view.kickoutFlexiTimerTicker, 1000)
	}
}

/***** PRE-MOVES
 *
 * _controller.store.context.preMoveData = [[[paydaySkipFlag], [paidInFood]], [cleanupSkipFlag]]
 *
 *	Payday
 *	======
 *	-9 = no data
 *	-1 = no salary
 *	-2 = enough money already
 *	-3 = try to pay all - not enough money yet
 *	-4 = pay with food, then money, if possible
 *	-5 = Trainer MS and not enough money
 *
 *	-8: don't fire anyone - manual move
 *	-9: no move
 *
 * 	Fridge
 * 	======
 * 	-9 = no data
 * 	-1 = keep all(10)
 * 	-2 = keep in this order
 *
 * 	-8 = don't bin anything; manual move
 * 	-9 = no move
 *
 */

// enactAdminKickout was removed
// simpleSave was removed

export function deleteMoveData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")

	store.viewSettings.showGameLoader = true

	fetch("/FCM/processTurn/", {
		method: "POST",
		body: JSON.stringify({
			action: "deleteMoveData",
			gameID: personal.gameID,
			phase: store.gameflow.phase,
		}),
		headers: { "X-CSRFToken": csrftoken },
	})
		.then((response) => response.json())
		.then((result) => {
			if (result.result === 2) {
				//store.gameMessages.successText = "<b>Save Successful</b> "
			} else {
				store.gameMessages.errorText = i18n.global.t("FCM_IO.saveErrorSST")
			}
			store.viewSettings.showGameLoader = false
		})
		.catch((error) => {
			store.gameMessages.errorText = i18n.global.t("FCM_IO.errorOccurred", { error: String(error) })
			store.viewSettings.showGameLoader = false
		})
}

export async function unlockTurn(type) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showGameLoader = true

	personal.moveDataRaw = ""
	store.gameflow.turnOrder.push(personal.pov)

	let action
	if (type === rf.PHASE_RESTRUCTURING) {
		action = "unlockRestructure"
	} else if (type === rf.PHASE_PAYDAY) {
		action = "unlockPayday"
	} else if (type === rf.PHASE_CLEAN_UP) {
		action = "unlockCleanup"
	}

	let callData = {
		latestUpdate: personal.latestUpdate,
		action: action,
		nextPlayer: controller.getCurrentPlayersArray(),
		gameID: personal.gameID,
	}

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/FCM/processTurn/", {
			method: "POST",
			body: JSON.stringify(callData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		let result = await response.json()

		if (result.syncError) {
			store.gameMessages.errorText = i18n.global.t("FCM_IO.olderVersionRefresh")
			store.viewSettings.showGameLoader = false
			return
		}

		personal.latestUpdate = result.latestUpdate
		store.viewSettings.showGameLoader = false
		window.location.reload()
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = i18n.global.t("FCM_IO.errorOccurred", { error: String(error) })
		store.viewSettings.showGameLoader = false
	}
}

export async function saveAndUpdateNotifictions(playerIndexesToNotify, referringPhase) {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")

	store.viewSettings.showGameLoader = true

	try {
		const response = await fetch("/FCM/processTurn/", {
			method: "POST",
			body: JSON.stringify({
				action: "saveAndUpdateNotifictions",
				gameID: personal.gameID,
				data: funcs.exportFCMmodel(false, false),
				playerIndexesToNotify: playerIndexesToNotify,
				referringPhase: referringPhase,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			const errorData = await response.json() // Assuming the server returns JSON error data
			const errorMessage = errorData.error || "Network response was not ok"
			throw new Error(errorMessage)
		}
		let _result = await response.json()

		store.viewSettings.showGameLoader = false
		
		// NEW: Clean Fire-and-Forget Broadcast
		if (personal.liveWS) WS.broadcastGameUpdate()

	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = i18n.global.t("FCM_IO.errorSavingGame")
		const payloadInfo = `referringPhase=${referringPhase}, LU=${personal.latestUpdate}`
		const gameInfo = `Game ${personal.gameID} - User ${personal.name || "unknown"} - ${payloadInfo}`
		const errorName = error && error.name ? error.name : "Error"
		const errorMsg = error && error.message ? error.message : String(error)
		const errorStack = error && error.stack ? String(error.stack).substring(0, 1200) : "no stack"
		const browserInfo = typeof navigator !== "undefined" ? navigator.userAgent : "unknown UA"
		sendDiscordWebhook(`FCM save and notify error - ${gameInfo}: [${errorName}] ${errorMsg} | UA: ${browserInfo} | stack: ${errorStack}`)
	}
}

export async function loadGame() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")

	await fetch("/FCM/processTurn/", {
		method: "POST",
		body: JSON.stringify({
			action: "loadNew",
			gameID: personal.gameID,
		}),
		headers: { "X-CSRFToken": csrftoken },
	})
		.then((response) => response.json())
		.then((result) => {
			let loadDataString = String(result.loadData)
			personal.latestUpdate = String(result.latestUpdate)
			personal.secondsToNextKickout = result.secondsToNextKickout
			if (result.kickoutRequired != null) personal.kickoutRequired = result.kickoutRequired
			if (result.kickoutVotesData) store.kickoutVotesData = typeof result.kickoutVotesData === "string" ? JSON.parse(result.kickoutVotesData) : result.kickoutVotesData
			if (result.kickoutVoteThreshold != null) store.kickoutVoteThreshold = result.kickoutVoteThreshold
			store.mapData.startingMap = JSON.parse(result.startingMap)
			//let suppressActions = false
			//if (result.specialData) suppressActions = true
			// Do this to update the top line info / green player highlights
			funcs.importFCMmodel(loadDataString, false, false)
			personal.moveDataRaw = result.specialData
			if (personal.pov >= 0) store.players[personal.pov].OOBpreference = result.OOBpreference
			// Match fresh page load: wipe highlights / toasts / client-only fire state from the previous snapshot
			context.clearAllHighlights()
			store.context.justFired.splice(0)
			store.clearMessages()
			// Restore pending move visuals like initGame (before startPlayerTurn: canPlay clears it for a fresh move;
			// !canPlay early-outs so a submitted move stays visible)
			if (personal.pov >= 0 && result.specialData) {
				if (store.gameflow.phase >= rf.PHASE_WORKING_DAY && store.gameflow.phase !== rf.PHASE_CLEAN_UP) {
					let decompressedData = funcs.decompressData(result.specialData)
					if (decompressedData && decompressedData[0] === store.players[personal.pov].name) store.context.preMoveData = decompressedData[3]
				} else if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) {
					let decompressedData = funcs.decompressData(result.specialData)
					if (decompressedData && decompressedData[0] === store.players[personal.pov].name) {
						store.players[personal.pov].beach = [...decompressedData[3][0]]
						store.players[personal.pov].employees = [...decompressedData[3][1]]
						if (decompressedData[3][2]) store.players[personal.pov].OOBpreference = decompressedData[3][2]
					}
				}
			}

			if (store.gameflow.phase !== rf.PHASE_SETUP_MODULES) personal.haltPlay = false
			controller.startPlayerTurn(false)
			restartKickoutTimers()
		})
		.catch((error) => {
			console.log("Error:", error)
		})
}


export async function saveInProgressMap() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.clearMessages()
	store.viewSettings.showGameLoader = true

	// NEW: Trigger connection but don't wait for it here
	if (personal.liveWS && (!WS.FCMwebSocket || WS.FCMwebSocket.readyState !== WebSocket.OPEN)) {
		WS.StartWebSocket().catch(() => {})
	}

	// Move person to last place
	store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
	//store.gameflow.currentPlayer = store.gameflow.turnOrder[0]

	let nextPlayer = [controller.currentPlayerObj().name]

	// Check whether to move into placing restos
	let nextPhase = false
	if (map.getOriginalTiles(false).indexOf(-2) === -1) nextPhase = true

	if (nextPhase) {
		store.gameflow.phase = rf.PHASE_SETUP_RESTAURANT1
		store.gameflow.turnOrder = [].splice(0)
		for (let i = 0; i < store.players.length; i++) store.gameflow.turnOrder.push(i)
		store.gameflow.fullTurnOrder = [...store.gameflow.turnOrder]
		map.initCoords()
		if (store.mapData.tiles.indexOf(20) > -1) {
			let rotated = 0
			if (store.mapData.tiles[store.mapData.tiles.indexOf(20) + 1] == 1 || store.mapData.tiles[store.mapData.tiles.indexOf(20) + 1] == 3) rotated = 1
			let index = map.findIndexForHouse(25)
			model.addHouse(25, index, rotated)
		}
	}

	

	let callData = {
		latestUpdate: personal.latestUpdate, // USED
		action: "saveInProgressMap", // USED
		data: funcs.exportFCMmodel(false, false), // USED
		nextPlayer: nextPlayer, // USED > goes to currentPlayers
		gameID: personal.gameID, // USED
		tiles: map.getOriginalTiles(false),
	}

	let csrftoken = funcs.getCookie("csrftoken")
	fetch("/FCM/processTurn/", {
		method: "POST",
		body: JSON.stringify(callData),
		headers: { "X-CSRFToken": csrftoken },
	})
		.then((response) => response.json())
		.then((result) => {
			personal.latestUpdate = String(result.latestUpdate)
			personal.saveRewind = false

			if (result.syncError) {
				store.gameMessages.errorText = i18n.global.t("FCM_IO.olderVersionRefresh")
				return
			}
			store.viewSettings.showGameLoader = false

			personal.secondsToNextKickout = result.secondsToNextKickout
			restartKickoutTimers()

			// NEW: Clean Fire-and-Forget Broadcast
			if (personal.liveWS) WS.broadcastGameUpdate()

			// TODO: save first rewind? if map complete?

			store.context.rotation = 0
			controller.startPlayerTurn(false)
		})
		.catch((error) => {
			console.log("Error:", error)
		})
}

export async function saveModuleSelection(moduleIndex) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.clearMessages()
	store.viewSettings.showGameLoader = true
	personal.haltPlay = true

	store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())

	let nextPlayer = [controller.currentPlayerObj().name]

	let SM = 999
	if (moduleIndex !== 999) SM = rules.getAvailableModules()[moduleIndex]

	store.externalStartingOptions.push(parseInt(SM))
	model.setInternalStartingOptions(store.externalStartingOptions)

	let draftedModules = rules.getAvailableModules(true)
	let nextPhase = false
	const pLen = store.players.length
	if (pLen === 2 && draftedModules.length === 6) nextPhase = true
	if (pLen === 3 && draftedModules.length === 6) nextPhase = true
	if (pLen === 4 && draftedModules.length === 4) nextPhase = true
	if (pLen === 5 && draftedModules.length === 5) nextPhase = true
	if (pLen === 6 && draftedModules.length === 6) nextPhase = true

	if (nextPhase) {
		let index300 = store.externalStartingOptions.indexOf(300)
		store.externalStartingOptions.splice(index300, 1)
		store.externalStartingOptions.push(300)

		model.setupKetchupExpansion(pLen)

		store.gameflow.phase = rf.PHASE_SETUP_RESTAURANT1
		store.gameflow.turnOrder = []
		for (let i = 0; i < pLen; i++) store.gameflow.turnOrder.push(i)
		store.gameflow.fullTurnOrder = [...store.gameflow.turnOrder]
	}

	store.context.selectedModuleIndex = 0

	let callData = {
		latestUpdate: personal.latestUpdate,
		action: "saveModuleSelection",
		data: funcs.exportFCMmodel(false, false),
		nextPlayer: nextPlayer,
		gameID: personal.gameID,
		SM: SM,
		phase: store.gameflow.phase,
	}

	let csrftoken = funcs.getCookie("csrftoken")
	fetch("/FCM/processTurn/", {
		method: "POST",
		body: JSON.stringify(callData),
		headers: { "X-CSRFToken": csrftoken },
	})
		.then((response) => response.json())
		.then((result) => {
			personal.latestUpdate = String(result.latestUpdate)

			if (result.syncError) {
				store.gameMessages.errorText = i18n.global.t("FCM_IO.olderVersionRefresh")
				return
			}
			store.viewSettings.showGameLoader = false

			personal.secondsToNextKickout = result.secondsToNextKickout
			restartKickoutTimers()

			if (personal.liveWS) WS.broadcastGameUpdate()

			store.context.selectedModuleIndex = 0
			personal.haltPlay = false
			controller.startPlayerTurn(false)
		})
		.catch((error) => {
			console.log("Error:", error)
			personal.haltPlay = false
		})
}

// At the END of simul turns, we want a rewind pointt
export async function saveGameNormal(saveRewind, restartAnySimulPhase, isPointlessMove) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.clearMessages()
	store.viewSettings.showGameLoader = true
	personal.haltPlay = true

	//let phase = store.gameflow.phase
	let phase = store.gameflow.phase

	if (!phase && phase !== 0) alert(i18n.global.t("alerts.missingPhase", { phase }))

	let nextPlayer = [controller.currentPlayerObj().name]
	// If you are saving FROM non simul, and next phase IS simul, construct the whole list
	if (controller.isSimulPhase(phase)) {
		// Check if simul phase is being reset, eg rewind / resign / kick
		if (restartAnySimulPhase) {
			store.gameflow.fullTurnOrder.splice(0)
			store.gameflow.turnOrder.splice(0)
			for (let i = 0; i < store.players.length; i++) {
				store.gameflow.fullTurnOrder.push(i)
				if (store.players[i].displayName !== rf.BOT_NAME) store.gameflow.turnOrder.push(i)
			}
		}
		nextPlayer = []
		for (let i = 0; i < store.gameflow.turnOrder.length; i++) {
			nextPlayer.push(store.players[store.gameflow.turnOrder[i]].name)
		}
	}

	let BKSN = ""
	if (personal.pov >= 0) BKSN = store.players[personal.pov].name
	if (personal.pov >= 0 && store.players[personal.pov].name === rf.TOURNAMENT_ADMIN_NAME) BKSN = store.players[personal.pov].displayName

	let gameData = funcs.exportFCMmodel(false, false)

	let sideData = ""
	if (store.gameflow.phase >= rf.PHASE_WORKING_DAY) sideData = funcs.compressData(store.context.preMoveData)

	// If saving the working day, delete moveDataRaw
	if (store.gameflow.phase == rf.PHASE_WORKING_DAY) personal.moveDataRaw = ""

	// You always want to save a rewind, even at the END of a pointless move
	// But if it is pointless, you want to delete the PREVIOUS rewind point
	// Never save a rewind point while FcmBot is the active player; loading it after a kick would strand the bot as current. ponytail: whole-turnOrder scan if multi-bot simul needs finer control.
	if (saveRewind && store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) saveRewind = false

	let postData = {
		action: "saveNormal",
		latestUpdate: personal.latestUpdate,
		sideData: sideData,
		turn: store.gameflow.turn,
		phase: phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		saveRewind: saveRewind,
		BKSN: BKSN,
		nextPlayer: nextPlayer,
		checksum: restartAnySimulPhase,
		gameData: gameData,
		IPM: isPointlessMove,
		mapTiles: map.getOriginalTiles(false),
	}

	if ((window.initData.gameData === "" || !window.initData.gameData) && store.gameflow.turn === 0) {
		//postData.mapTiles = map.getOriginalTiles(false)
		window.initData.startingMap = map.getOriginalTiles(false)
	}

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		postData.status = "FINISHED" // USED
		postData.winner = rules.winner(false) // USED
		//callData.deleteMoves = "true" // USED
		let finalScores = []
		/*for (let j = 0; j < store.players.length; j++) {
				if (store.players[j].displayName == rf.BOT_NAME && store.players[j].money > 0) store.players[j].money *= -1
				finalScores.push([store.players[j].name, store.players[j].money])
				finalScores.sort(function (a, b) {
					return b[1] - a[1]
				})
			}*/

		// GET THE TOURNAMENT OBJ ASSUME store.gameflow.fullTurnOrder is correct - as set in model.endGame()
		let tournamentData = []
		// Seed the tournamentData with 1 subarray per player
		for (let i = 0; i < store.gameflow.fullTurnOrder.length; i++) tournamentData.push([store.gameflow.fullTurnOrder[i]])
		let winningPlayerMoney = store.players[tournamentData[0][0]].money
		// Don't need to add winners tie breaker
		for (let i = 1; i < tournamentData.length; i++) {
			let playerIndex = tournamentData[i][0]
			let playerMoney = store.players[playerIndex].money
			tournamentData[i].push(Math.ceil((winningPlayerMoney - playerMoney) / 100))
		}
		// Now replace indexes with names
		for (let i = 0; i < tournamentData.length; i++) tournamentData[i][0] = store.players[tournamentData[i][0]].name
		//console.log(JSON.stringify(tournamentData))
		postData.tournamentData = [...tournamentData]

		// ASSUME store.gameflow.fullTurnOrder is correct - as set in model.endGame()
		for (let i = 0; i < store.gameflow.fullTurnOrder.length; i++) {
			let j = store.gameflow.fullTurnOrder[i]
			if (store.players[j].displayName == rf.BOT_NAME && store.players[j].money > 0) store.players[j].money *= -1
			finalScores.push([store.players[j].name, store.players[j].money])
		}
		postData.finalScores = finalScores
		postData.gameData = funcs.exportFCMmodel(true, false)
	}

	/* This is only used in PASS_KICKOUT function
		if (personal.removeCurrentFlexTime) {
			personal.removeCurrentFlexTime = false
			postData.checkName = personal.removeCurrentFlexTimeName
			personal.removeCurrentFlexTimeName = ""
		}
			*/

	let csrftoken = funcs.getCookie("csrftoken")
	let result
	try {
		const response = await fetch("/FCM/processTurn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			const errorData = await response.json() // Assuming the server returns JSON error data
			const errorMessage = errorData.error || "Network response was not ok"
			throw new Error(errorMessage)
		}
		result = await response.json()

		if (result.latestUpdate > parseInt(personal.latestUpdate)) personal.latestUpdate = String(result.latestUpdate)

		personal.saveRewind = false
		if (result.gameNotActive === true && store.gameflow.phase != rf.PHASE_GAME_OVER) {
			store.viewSettings.showGameLoader = false
			store.gameMessages.errorText = i18n.global.t("FCM_IO.gameNotActive")
			return
		}
		if (result.syncError) {
			personal.haltPlay = true
			store.gameMessages.errorText = i18n.global.t("FCM_IO.olderVersionRefresh")
			return
		}

		//if (!global.stopRender) await funcs.sleep(0)
		store.viewSettings.showGameLoader = false

		// If you are saving INTO restruc, it must have come from end of previous turn. So delete any move data
		if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) {
			personal.moveDataRaw = ""
		}

		// If you're still in turn order phase, extract the OOBs
		if (store.gameflow.phase === rf.PHASE_TURN_ORDER) {
			if (result.sideData) {
				let decompressedData = funcs.decompressObjectFromDB(result.sideData)
				for (let i = 0; i < decompressedData.length; i++) {
					let content = decompressedData[i][3]
					if (store.players[i].displayName === rf.BOT_NAME) continue
					store.players[i].OOBpreference = content[2]
				}
				// Now process any set OOB
				if (controller.currentPlayerObj().OOBpreference == 1 || controller.currentPlayerObj().OOBpreference == 2) {
					if (store.gameflow.turnOrder.length !== 1) controller.autoProcessTurnOrder()

					store.gameflow.turnOrder.shift()

					// If not a simul phase, check to see if you can skip the next player
					controller.actionAllPlayerSkips()
					// Check for all turns complete
					if (store.gameflow.turnOrder.length === 0 || (store.gameflow.phase === rf.PHASE_TURN_ORDER && store.gameflow.turnOrder.length === 1)) {
						store.gameflow.turnOrder.splice(0)
						controller.endCurrentPhase()
						// Game over is saved on game end
						//if (store.gameflow.phase === rf.PHASE_GAME_OVER) return
					}

				await saveGameNormal(false, false, false)
				// In case it is your turn again right away, run startPlayerTurn
				// If it isn't then you get returned from that function anyway
				if (rf.SUPER_USERS.includes(personal.name)) personal.pov = -1
				controller.startPlayerTurn(false)

				return
				}
			}
		}

		// if you are savig INTO payday, check the pre-move data
		if (store.gameflow.phase == rf.PHASE_PAYDAY) {
			if (result.sideData) {
				let sideData = funcs.decompressData(result.sideData)
				let playerIndexesToNotify = []

				for (let i = 0; i < sideData.length; i++) {
					// NB NEW FLAG SET UP HERE!
					// 0 = no data - need to move
					// 1 = data  ok
					// 9 = data no longer valid

					// NB this is the whole array. So [i][3] is the content part of the move. [0] is then the payday part of the move
					let flag = checkPaydayDataValid(i, sideData[i][3][0])
					// Check there are no missing players from TO
					if (flag === 0 && !store.gameflow.turnOrder.includes(i) && store.players[i].displayName !== rf.BOT_NAME) {
						store.gameflow.turnOrder.push(i)
						playerIndexesToNotify.push(i)
					}
					// Check keep all if <=10 valid
					else if (flag === 9 && store.players[i].displayName !== rf.BOT_NAME) {
						playerIndexesToNotify.push(i)
					} else if (flag === 1) {
						if (store.gameflow.turnOrder.includes(i)) store.gameflow.turnOrder = store.gameflow.turnOrder.filter((x) => x !== i)
					}
					// flag === -1 (keep all in this order) will always work, as limited to first 10 found
				}
				// NB turn order will always AT LEAST include the last player in WD
				if (playerIndexesToNotify.length > 0) {
					for (let i = 0; i < playerIndexesToNotify.length; i++) {
						if (!store.gameflow.turnOrder.includes(playerIndexesToNotify[i])) store.gameflow.turnOrder.push(playerIndexesToNotify[i])
					}
					await saveAndUpdateNotifictions(playerIndexesToNotify, rf.PHASE_PAYDAY)
					//return
				}
			} // end has sideData
		}

		// if you are savig INTO cleanup, check the pre-move data
		if (store.gameflow.phase == rf.PHASE_CLEAN_UP) {
			if (result.sideData) {
				let sideData = funcs.decompressData(result.sideData)
				let playerIndexesToNotify = []
				for (let i = 0; i < sideData.length; i++) {
					// Players with nothing to bin never enter the cleanup turn order
					if (!rules.isRequiredToPlayCleanUp(i)) continue
					// NB NEW FLAG SET UP HERE!
					// 0 = no data - need to move
					// 1 = data  ok
					// 9 = data no longer valid
					let flag = checkFridgeDataValid(i, sideData[i][3][1])
					// Check there are no missing players from TO
					if (flag === 0 && !store.gameflow.turnOrder.includes(i) && store.players[i].displayName !== rf.BOT_NAME) {
						store.gameflow.turnOrder.push(i)
						playerIndexesToNotify.push(i)
					}
					// Check keep all if <=10 valid
					else if (flag === 9 && store.players[i].displayName !== rf.BOT_NAME) {
						playerIndexesToNotify.push(i)
					} else if (flag === 1 && store.players[i].displayName !== rf.BOT_NAME) {
						if (store.gameflow.turnOrder.includes(i)) store.gameflow.turnOrder = store.gameflow.turnOrder.filter((x) => x !== i)
					}
					// flag === -1 (keep all in this order) will always work, as limited to first 10 found
				}
				if (store.gameflow.turnOrder.length === 0) {
					// Resubmit your move data to trigger end of phase
					await saveSimulMove(sideData[personal.pov][3])
					controller.startPlayerTurn()
					return
				}
				if (playerIndexesToNotify.length > 0) {
					for (let i = 0; i < playerIndexesToNotify.length; i++) {
						if (!store.gameflow.turnOrder.includes(playerIndexesToNotify[i])) store.gameflow.turnOrder.push(playerIndexesToNotify[i])
					}
					await saveAndUpdateNotifictions(playerIndexesToNotify, rf.PHASE_CLEAN_UP)
					//return
				}
			} // end has sideData
		} // end new phase is cleanup

		//personal.latestUpdate = String(result.latestUpdate);
		personal.secondsToNextKickout = result.secondsToNextKickout
		restartKickoutTimers()
		personal.haltPlay = false

		if (personal.liveWS) WS.broadcastGameUpdate()

		if (controller.currentPlayerObj().name === "FcmAI" && store.gameflow.phase != rf.PHASE_GAME_OVER) makeAImove()
	} catch (error) {
		console.error("Error fetching data:", error)
		personal.haltPlay = false
		store.gameMessages.errorText = i18n.global.t("FCM_IO.errorSavingGame")
		const payloadInfo = `turn=${store.gameflow.turn}, phase=${store.gameflow.phase}, LU=${postData.latestUpdate}, nextPlayer=${postData.nextPlayer?.[0] || "none"}`
		const gameInfo = `Game ${personal.gameID} - User ${personal.name || "unknown"} - ${payloadInfo}`
		const errorName = error && error.name ? error.name : "Error"
		const errorMsg = error && error.message ? error.message : String(error)
		const errorStack = error && error.stack ? String(error.stack).substring(0, 1200) : "no stack"
		const browserInfo = typeof navigator !== "undefined" ? navigator.userAgent : "unknown UA"
		sendDiscordWebhook(`FCM save error - ${gameInfo}: [${errorName}] ${errorMsg} | UA: ${browserInfo} | stack: ${errorStack}`)
	}
}

export async function savePreTurn(preMoveDataRaw) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showGameLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	// Empty payday fire list would fail server validation (treated as no move)
	if (Array.isArray(preMoveDataRaw) && Array.isArray(preMoveDataRaw[0]) && Array.isArray(preMoveDataRaw[0][0]) && preMoveDataRaw[0][0].length === 0) {
		preMoveDataRaw[0][0] = [-9]
	}

	let postData = {
		action: "preTurn",
		latestUpdate: personal.latestUpdate,
		data: funcs.compressData(preMoveDataRaw),
		gameID: personal.gameID,
	}

	try {
		const response = await fetch("/FCM/processTurn/", {
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
		if (data.syncError) {
			store.gameMessages.errorText = i18n.global.t("FCM_IO.olderVersionRefresh")
			return
		}

		store.viewSettings.showGameLoader = false
		//controller.addAfterWorkingDayExpertPanel()
	} catch (error) {
		console.error("Error saving pre-move:", error)
		store.gameMessages.errorText = i18n.global.t("FCM_IO.errorSavingPreMove")
	}
}

export async function saveOOBpreference() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showGameLoader = true

	let OOBpreference = 0
	if (personal.pov >= 0) OOBpreference = store.players[personal.pov].OOBpreference

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/FCM/processTurn/", {
			method: "POST",
			body: JSON.stringify({
				latestUpdate: personal.latestUpdate,
				action: "saveOOBpreference",
				gameID: personal.gameID,
				OOBpreference: OOBpreference,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const result = await response.json()
		store.viewSettings.showGameLoader = false
		if (result.syncError) {
			store.gameMessages.errorText = i18n.global.t("FCM_IO.olderVersionRefresh")
			return false
		}
		if (result.OOBsaved) {
			store.gameMessages.successText = i18n.global.t("FCM_IO.preferenceSaved")
			return true
		}
		store.gameMessages.errorText = i18n.global.t("FCM_IO.errorSavingTurnOrderPreference")
		return false
	} catch (error) {
		console.error("Error saving OOB preference:", error)
		store.viewSettings.showGameLoader = false
		store.gameMessages.errorText = i18n.global.t("FCM_IO.errorSavingTurnOrderPreference")
		return false
	}
}

export async function saveSimulMove(moveData, continueFromStalledGame = false) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showGameLoader = true
	personal.haltPlay = true
	let notificationSuppression = false
	if (store.gameflow.phase == rf.PHASE_RESTRUCTURING && moveData[2] > 0) notificationSuppression = true

	let csrftoken = funcs.getCookie("csrftoken")
	

	// Tell the server which players to accept blank data from
	let notRequiedPlayerNames = []
	// Bots
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].displayName === rf.BOT_NAME) notRequiedPlayerNames.push(store.players[i].name)
	}
	// Restructuring - no employees
	if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) {
		for (let i = 0; i < store.players.length; i++) {
			if (store.players[i].beach.length === 0) {
				let noEmployees = false
				if (store.players[i].employees.length === 0) noEmployees = true
				else if (store.players[i].employees.length <= 3) {
					noEmployees = true
					for (let j = 0; j < store.players[i].employees.length; j++) {
						if (store.players[i].employees[j] !== -1) {
							noEmployees = false
							break
						}
					}
				}

				if (noEmployees && !notRequiedPlayerNames.includes(store.players[i].name)) notRequiedPlayerNames.push(store.players[i].name)
			}
		}
	}
	// Clean up - no fridge or nothing to bin (mirrors canSkipCurrentPlayer /
	// isRequiredToPlayCleanUp, so such players never enter the cleanup turn order)
	if (store.gameflow.phase === rf.PHASE_CLEAN_UP) {
		for (let i = 0; i < store.players.length; i++) {
			if (!rules.isRequiredToPlayCleanUp(i) && !notRequiedPlayerNames.includes(store.players[i].name)) notRequiedPlayerNames.push(store.players[i].name)
		}
	}
	let BKSN = "Name"
	if (!continueFromStalledGame) BKSN = store.players[personal.pov].displayName
	let postData = {
		latestUpdate: personal.latestUpdate, // USED
		action: "saveSimulMove", // USED
		moveData: funcs.compressData(moveData), // USED
		turn: store.gameflow.turn, // USED
		phase: store.gameflow.phase, // USED
		gameID: personal.gameID,
		notificationSuppression: notificationSuppression,
		BKSN: BKSN,
		notRequiedPlayerNames: notRequiedPlayerNames,
		continueFromStalledGame: continueFromStalledGame,
	}

	/* This is only used in PASS_KICKOUT function
		if (personal.removeCurrentFlexTime) {
			personal.removeCurrentFlexTime = false
			postData.checkName = personal.removeCurrentFlexTimeName
			personal.removeCurrentFlexTimeName = ""
		}*/

	try {
		const response = await fetch("/FCM/processTurn/", {
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

		if (data.syncError) {
			store.gameMessages.errorText = i18n.global.t("FCM_IO.olderVersionRefresh")
			return
		}
		// If not ALL ready (IE data.ready tells you who is NOT ready)
		if (data.allPlayersMoved === false) {
			personal.haltPlay = false
			// If you are doing reserve early, don't do anything
			if (store.gameflow.phase == rf.PHASE_SETUP_RESTAURANT1 || store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT2) {
				store.viewSettings.showGameLoader = false
				return
			}
			// If not everyone is ready, setupAllowUnlock
			if (!personal.canPlay() && store.gameflow.phase === rf.PHASE_RESTRUCTURING) {
				//controller.setupAllowUnlock(rf.PHASE_RESTRUCTURING)
			} else if (!personal.canPlay() && store.gameflow.phase === rf.PHASE_PAYDAY) {
				//controller.setupAllowUnlock(rf.PHASE_PAYDAY)
			}

			store.gameflow.turnOrder.splice(0)
			/*for (let i = 0; i < data.playersToMove.length; i++) {
					if (!data.ready[i]) store.gameflow.turnOrder.push(i)
				}*/
			for (let i = 0; i < store.players.length; i++) {
				if (data.playersToMove.includes(store.players[i].name)) store.gameflow.turnOrder.push(i)
				// Add in FCMtA players
				else if (store.players[i].name === rf.TOURNAMENT_ADMIN_NAME && data.playersToMove.includes(store.players[i].displayName.slice(16))) store.gameflow.turnOrder.push(i)
			}
		}
		// Else if ready
		else if (data.allPlayersMoved === true) {
			// LOAD AND PROCESS ALL DATA
			personal.latestUpdate = data.latestUpdate
			await processSimulMoveData(data.moveData)
			// Preserve TO settings after working day
			if (store.gameflow.phase !== rf.PHASE_RESTRUCTURING && store.gameflow.phase !== rf.PHASE_PAYDAY) await deleteMoveData()

			// End the phase
			await controller.endCurrentPhase()
			// save the game
			// NB could M have been changed in endCurrentPhase that isn't reflected in model??
			await saveGameNormal(true, false, false)
			// Keep haltPlay true through the saves above so Vue renders during the
			// in-flight fetches (empty turn order) don't look like a live state;
			// the turn order is rebuilt by now, so allow play again
			personal.haltPlay = false
		}

		store.viewSettings.showGameLoader = false
		//personal.haltPlay = false
	} catch (error) {
		console.error("Error fetching data:", error)
		personal.haltPlay = false
		store.gameMessages.errorText = i18n.global.t("FCM_IO.errorSavingGame")
		const payloadInfo = `LU=${personal.latestUpdate}`
		const gameInfo = `Game ${personal.gameID} - User ${personal.name || "unknown"} - ${payloadInfo}`
		const errorName = error && error.name ? error.name : "Error"
		const errorMsg = error && error.message ? error.message : String(error)
		const errorStack = error && error.stack ? String(error.stack).substring(0, 1200) : "no stack"
		const browserInfo = typeof navigator !== "undefined" ? navigator.userAgent : "unknown UA"
		sendDiscordWebhook(`FCM simul move save error - ${gameInfo}: [${errorName}] ${errorMsg} | UA: ${browserInfo} | stack: ${errorStack}`)
	}
}



export async function kickout(kickedPlayerIndex) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showGameLoader = true

	let kickedName = store.players[kickedPlayerIndex].name

	const postData = {
		action: "kickout",
		gameID: personal.gameID,
		kickedName: kickedName,
		latestUpdate: personal.latestUpdate,
		supportsVoting: true,
	}

	try {
		const response = await fetch("/FCM/processTurn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})

		if (!response.ok) throw new Error("Network response was not ok")

		const data = await response.json()

		if (data.syncError) {
			store.gameMessages.errorText = i18n.global.t("FCM_IO.olderVersionRefresh")
			store.viewSettings.showGameLoader = false
			return null
		}

		store.viewSettings.showGameLoader = false

		// Vote was recorded but kickout did not proceed yet
		if (data.voteCast) {
			store.kickoutVotesData = data.votesData ? (typeof data.votesData === "string" ? JSON.parse(data.votesData) : data.votesData) : {}
			store.kickoutVoteThreshold = data.threshold || 1
			return { voteCast: true }
		}

		// Kickout proceeded - update local state
		personal.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		restartKickoutTimers()

		return { voteCast: false }
	} catch (error) {
		console.error("Error kicking:", error)
		store.viewSettings.showGameLoader = false
		store.gameMessages.errorText = i18n.global.t("FCM_IO.errorKicking")
		return null
	}
}

export async function resign(playerName) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showGameLoader = true

	try {
		const response = await fetch("/FCM/processTurn/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
				action: "resign",
				user: playerName,
			}),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})

		const _result = await response.json()

		// 1. Reset state
		personal.moveDataRaw = ""
		store.viewSettings.showGameLoader = false

		// 2. Count non-active players
		const numNonPlayers = store.players.filter((p) => p.displayName === rf.BOT_NAME).length

		// 3. Logic: If only one real player left, end the game
		if (numNonPlayers >= store.players.length - 1) {
			model.endGame()
			saveGameNormal(false, false, false)
			return false
		}

		// 4. Advance turn or save state
		if (store.gameflow.turn === 0) {
			controller.endPlayerTurn(true, false)
		} else {
			saveGameNormal(false, true, false)
		}
	} catch (error) {
		console.error("Resign Error:", error)
		store.viewSettings.showGameLoader = false
		store.gameMessages.errorText = i18n.global.t("FCM_IO.somethingWentWrong")
	}
}

export async function loadUnlockedRewind() {
	const store = useModelStore()
	if (store.gameflow.phase === rf.PHASE_TURN_ORDER) {
		store.viewSettings.performingRewind = false
		store.gameMessages.errorText = i18n.global.t("FCM_IO.rewindNotAllowedTurnOrder")
		return
	}
	if (store.gameflow.phase === rf.PHASE_WORKING_DAY && store.gameflow.fullTurnOrder.indexOf(controller.currentPlayerIndex()) === 0) {
		store.viewSettings.performingRewind = false
		store.gameMessages.errorText = i18n.global.t("FCM_IO.rewindNotAllowedWorkingDayFirst")
		return
	}
	loadRewind(controller, true)
}

export async function loadRewind(allowRewind) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.clearMessages()
	if (store.viewSettings.alreadyRewinding) return
	store.viewSettings.alreadyRewinding = true
	store.viewSettings.showGameLoader = true
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		store.viewSettings.alreadyRewinding = false
		store.viewSettings.performingRewind = false
		return
	}
	if (store.viewSettings.showReplay) {
		store.viewSettings.alreadyRewinding = false
		store.viewSettings.performingRewind = false
		return
	}
	let removeSinglePermission = false
	if (store.gameflow.phase === rf.PHASE_TURN_ORDER) {
		removeSinglePermission = true
		for (let i = 0; i < store.gameflow.newTurnOrder.length; i++) {
			if (store.gameflow.newTurnOrder[i] !== -1 && store.players[store.gameflow.newTurnOrder[i]].displayName !== rf.BOT_NAME) {
				removeSinglePermission = false
			}
		}
	}
	let csrftoken = funcs.getCookie("csrftoken")

	let callData = {
		action: "loadRewind",
		gameID: personal.gameID,
		phase: store.gameflow.phase,
		RSRP: removeSinglePermission,
	}

	if (allowRewind) callData.latency = 20 // Just try to disguise the variable a bit to discourage hacks

	fetch("/FCM/processTurn/", {
		method: "POST",
		body: JSON.stringify(callData),

		headers: { "X-CSRFToken": csrftoken },
	})
		.then((response) => response.json())
		.then((result) => {
			if (result.latestUpdate) personal.latestUpdate = String(result.latestUpdate)
			if (result.message) {
				store.gameMessages.errorText = result.message
				store.viewSettings.alreadyRewinding = false
				store.viewSettings.performingRewind = false
				store.viewSettings.showGameLoader = false
			} else {
				personal.moveDataRaw = ""
				funcs.importFCMmodel(result.loadData)
				if (personal.pov >= 0) model.addHistory(rf.HIST_REWIND, [], personal.pov, 0)
				else model.addHistory(rf.HIST_REWIND, [], -1, 0)

				// Remove payday skip flag
				// TODO fix delete
				for (let j = 0; j < store.players.length; j++) if (store.players[j].skipPayday) delete store.players[j].skipPayday

				// Re kick booted players
				for (let i = 0; i < result.missingPlayers.length; i++) {
					for (let j = 0; j < store.players.length; j++) {
						if (store.players[j].name == result.missingPlayers[i]) {
							store.players[j].displayName = rf.BOT_NAME
							if (store.players[j].money > 0) store.players[j].money *= -1
						}
					}
				}
				// Send back to DB with another save
				updateDataFromLoadRewind()
			}

			store.viewSettings.alreadyRewinding = false
		})
		.catch((error) => {
			console.log("Error:", error)
			store.viewSettings.alreadyRewinding = false
			store.viewSettings.performingRewind = false
			store.viewSettings.showGameLoader = false
		})
}

export async function updateDataFromLoadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showGameLoader = true
	// NEW: Non-blocking connection attempt
	if (personal.liveWS && (!WS.FCMwebSocket || WS.FCMwebSocket.readyState !== WebSocket.OPEN)) {
		WS.StartWebSocket().catch(() => {})
	}

	let nextPlayer = [controller.currentPlayerObj().name]
	let phase = store.gameflow.phase
	// Simul Next Player
	if (phase == rf.PHASE_SETUP_RESERVE || phase == rf.PHASE_RESTRUCTURING || ((phase == rf.PHASE_CLEAN_UP || phase == rf.PHASE_PAYDAY) && !store.startingOptions.strictPaydayFridge)) {
		nextPlayer = []
		//let u = _.uniq(store.gameflow.ready);
		for (let i = 0; i < store.players.length; i++) {
			nextPlayer.push(store.players[i].name)
		}
	}

	let csrftoken = funcs.getCookie("csrftoken")

	fetch("/FCM/processTurn/", {
		method: "POST",
		body: JSON.stringify({
			action: "updateDataFromLoadRewind",
			turn: store.gameflow.turn,
			nextPlayer: nextPlayer,
			gameID: personal.gameID,
			phase: store.gameflow.phase,
			data: funcs.exportFCMmodel(false, false),
		}),
		headers: { "X-CSRFToken": csrftoken },
	})
		.then((response) => response.json())
		.then((result) => {
			if (result.latestUpdate) personal.latestUpdate = String(result.latestUpdate)
			//sleepPause(500);
			store.viewSettings.showGameLoader = false
			//if (!personal.trainingGame && personal.liveWS && WS.FCMwebSocket.readyState === 1) WS.FCMwebSocket.send("NEWDATATS" + String(personal.gameID) + String(result.latestUpdate));
			//if (personal.liveWS && WS.FCMwebSocket.readyState === 1) WS.FCMwebSocket.send("NEWDATATS" + String(personal.gameID) + String(result.latestUpdate))

			store.viewSettings.performingRewind = false
			store.viewSettings.alreadyRewinding = false

			// NEW: Background Broadcast (Fire and Forget)
			if (personal.liveWS) {
				WS.broadcastGameUpdate()
			}

			controller.startPlayerTurn(false)
		})
		.catch((error) => {
			console.log("Error:", error)
		})
}

/* BELOW IS OTHER FUNCTIONS NOT USING -- processTurn -- IE BUG, CHAT, NOTES, REWIND_CONSENT, CHANGE_ASSISTANCE, ZOOM */
export async function checkForLatestData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")

	// Function to fetch data from the database
	try {
		const response = await fetch("/FCM/data/3/", {
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
			let loadDataString = String(data.loadData)
			personal.latestUpdate = String(data.latestUpdate)
			personal.secondsToNextKickout = data.secondsToNextKickout
			restartKickoutTimers()
			//let suppressActions = false
			//if (data.specialData) suppressActions = true
			funcs.importFCMmodel(loadDataString)
			// Match fresh page load / old C.reloadModel: clear stale highlights + fire state, then rebuild turn UI
			// (import zeros summary totals; without startPlayerTurn, hire.total stays 0 → hired.length === total+1)
			context.clearAllHighlights()
			store.context.justFired.splice(0)
			store.clearMessages()
			if (personal.pov >= 0) controller.startPlayerTurn(true)
		}
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

export async function submitBug(bugContent) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showGameLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/FCM/bugEntry/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
				action: "bugentry",
				description: bugContent,
				gameData: funcs.exportFCMmodel(false, false),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.bugEntrySuccess) {
			store.gameMessages.successText = i18n.global.t("FCM_IO.bugReportSubmitted")
			store.viewSettings.showBug = false
			return true
		} else {
			store.gameMessages.bugErrorText = i18n.global.t("FCM_IO.bugErrorHtml")
			store.viewSettings.showGameLoader = false
			return false
		}
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.bugErrorText = i18n.global.t("FCM_IO.bugErrorHtml")
		store.viewSettings.showGameLoader = false
		return false
	}
}

export async function sendChatMessage(newEntry) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showGameLoader = true

	/*function removeEmojis(str) {
			let emojiRE = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
			return str.replace(emojiRE, '');
		}
		message = removeEmojis(message)*/

	let csrftoken = funcs.getCookie("csrftoken")

	fetch("/FCM/sendChatMessage/", {
		method: "POST",
		body: JSON.stringify({
			action: "sendChatMessage",
			player: personal.name,
			gameID: personal.gameID,
			//message: htmlEscape(message),
			newEntry: newEntry,
		}),
		headers: { "X-CSRFToken": csrftoken },
	})
		.then((response) => response.json())
		.then((result) => {
			if (!result.chatData) {
				store.gameMessages.errorText = i18n.global.t("FCM_IO.problemEmailWebmaster")
				return
			}
			store.chatData = funcs.decompressChatData(result.chatData)

			//if (personal.liveWS) WS.FCMwebSocket.send("NEWCHATTS" + String(personal.gameID)) //+ String(result.latestUpdate));
			// NEW: Non-blocking Broadcast for Chat
			if (personal.liveWS) WS.broadcastChatUpdate()

			//V.reparseChatData()
			store.viewSettings.showGameLoader = false
		})
		.catch((error) => {
			console.log("Error:", error)
		})
}

export async function reloadChatData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")

	// Function to fetch data from the database
	try {
		const response = await fetch("/FCM/data/2/", {
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
		//V.reparseChatData()
		//V.displayChat()
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

export async function saveNotes() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showGameLoader = true
	store.gameMessages.errorText = ""

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/FCM/notes/", {
			method: "POST",
			body: JSON.stringify({
				action: "notes",
				type: "post",
				user: personal.name,
				gameID: personal.gameID,
				note: funcs.htmlEscape(personal.notes),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		const data = await response.json()
		if (data.error) {
			store.gameMessages.errorText = data.error
			store.viewSettings.showGameLoader = false
			return
		}
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		if (!data.notePosted) {
			store.gameMessages.errorText = i18n.global.t("FCM_IO.problemEmailWebmaster")
			return
		}
		store.viewSettings.showGameLoader = false
	} catch (error) {
		console.error("Error saving Notes:", error)
		store.gameMessages.errorText = i18n.global.t("FCM_IO.errorSavingNotes")
	}
}


export async function saveAssistance(assistance) {
	let csrftoken = funcs.getCookie("csrftoken")

	fetch("/FCM/changeAssistance/", {
		method: "PUT",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json; charset=UTF-8",
			"X-CSRFToken": csrftoken,
		},
		body: JSON.stringify({
			action: "assistance",
			changeAssistance: assistance,
		}),
	})
}

export async function submitRewindConsent(consentLevel) {
	const store = useModelStore()
	if (consentLevel === 0) {
		store.gameMessages.errorText = i18n.global.t("FCM_IO.tickPermissionFirst")
		return
	}
	castVote(rf.REWIND_CONSENT_VOTE_TOPIC, consentLevel)
}


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

export async function saveZoom(zoomLevel) {
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")

	fetch("/FCM/changeAssistance/", {
		method: "PUT",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json; charset=UTF-8",
			"X-CSRFToken": csrftoken,
		},
		body: JSON.stringify({
			action: "zoom",
			zoomLevel: String(zoomLevel),
			playerNumber: personal.pov,
			allPlayers: personal.trainingGame === true,
			gameID: personal.gameID,
		}),
	})
}

export async function castVote(topic, choice) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showGameLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	let postData = {
		action: "castVote", // USED
		topic: topic, // USED
		gameID: personal.gameID, // USED
		choice: choice,
	}

	try {
		const response = await fetch("/FCM/castVote/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			store.gameMessages.errorText = i18n.global.t("FCM_IO.errorSavingVote")
			throw new Error("Network response was not ok")
		}
		const data = await response.json()

		store.viewSettings.showGameLoader = false
		if (data.voteChanged === true) {
			if (topic === rf.REWIND_CONSENT_VOTE_TOPIC) {
				personal.currentRewindConsent = choice
			}
		}
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = i18n.global.t("FCM_IO.errorSavingVote")
		return false
	}
}

export function processSimulMoveData(data) {
	const store = useModelStore()
	const personal = usePersonalStore()
	// data is the entire compressed playersMoveData
	let decompressedData = funcs.decompressObjectFromDB(data)
	if (store.gameflow.phase === rf.PHASE_SETUP_RESERVE) {
		let histEntries = []
		let reserve = []
		for (let i = 0; i < decompressedData.length; i++) {
			if (store.players[i].displayName === rf.BOT_NAME) {
				// Add a dud entry to preserve POV indexing
				reserve.push(-1)
				continue
			}
			// Check if there's any dodgy data
			if (!decompressedData[i][1].includes(rf.PHASE_SETUP_RESERVE)) {
				store.gameMessages.errorText = i18n.global.t("FCM_IO.contactAdminPhaseMismatchSetupReserve")
				sendDiscordWebhook(`JS ERROR: phase mismatch in SETUP_RESERVE - gameID: ${personal.gameID} player: ${store.players[i].name} phase: ${store.gameflow.phase} decompressedData: ${JSON.stringify(decompressedData)}`)
			}
			if (!decompressedData[i][0] === store.players[i].name && store.players[i].name !== rf.TOURNAMENT_ADMIN_NAME) {
				store.gameMessages.errorText = i18n.global.t("FCM_IO.contactAdminNameMismatchSetupReserve")
				sendDiscordWebhook(`JS ERROR: player name mismatch in SETUP_RESERVE - gameID: ${personal.gameID} player: ${store.players[i].name} decompressedData: ${JSON.stringify(decompressedData)}`)
			}

			let content = decompressedData[i][3]
			let reserveCard = -1
			if (content.length > 0) reserveCard = content[0]
			histEntries.push([rf.HIST_CHOOSE_RESERVE_CARD, reserveCard, i, Math.floor(decompressedData[i][2] / 1000)])
			reserve.push(reserveCard)
		}
		store.reserveCards = [...reserve]
		//histEntries.sort((a, b) => a[3] - b[3])
		histEntries.sort((a, b) => parseInt(a[3], 10) - parseInt(b[3], 10))
		for (let i = 0; i < histEntries.length; i++) {
			model.addHistory(histEntries[i][0], histEntries[i][1], histEntries[i][2], histEntries[i][3])
		}
	} else if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) {
		let histEntries = []
		if (decompressedData.length !== store.players.length) {
			store.gameMessages.errorText = i18n.global.t("FCM_IO.contactAdminRestructureDataLen", { dataLen: decompressedData.length, playersLen: store.players.length, data: JSON.stringify(data) })
			sendDiscordWebhook(`JS ERROR: RESTRUCTURE - data-len: ${decompressedData.length} players-len: ${store.players.length} data: ${JSON.stringify(data)}`)
		}
		for (let i = 0; i < decompressedData.length; i++) {
			if (store.players[i].displayName === rf.BOT_NAME) continue
			let _name = decompressedData[i][0]
			let _phasesArray = decompressedData[i][1]
			let _timestamp = decompressedData[i][2]
			let content = decompressedData[i][3]
			// Check if there's any dodgy data
			// First check if it's a pointless move - and then allow it
			if (_phasesArray.length === 1 && _phasesArray[0] === -1) {
				if (store.players[i].beach.length === 0) {
					let noEmployees = false
					if (store.players[i].employees.length === 0) noEmployees = true
					else if (store.players[i].employees.length <= 3) {
						noEmployees = true
						for (let j = 0; j < store.players[i].employees.length; j++) {
							if (store.players[i].employees[j] !== -1) {
								noEmployees = false
								break
							}
						}
					}

					if (noEmployees) {
						_phasesArray = [rf.PHASE_RESTRUCTURING]
						content = [[], [], 0] // Beach, Employees, OOB preference
					}
				}
			}
			if (!_phasesArray.includes(rf.PHASE_RESTRUCTURING)) {
				store.gameMessages.errorText = i18n.global.t("FCM_IO.contactAdminPhaseMismatchRestructuring")
				sendDiscordWebhook(`JS ERROR: phase mismatch in PHASE_RESTRUCTURING - gameID: ${personal.gameID} player: ${store.players[i].name} phase: ${store.gameflow.phase} decompressedData: ${JSON.stringify(decompressedData)}`)
			}
			if (_name !== store.players[i].name && _name !== rf.TOURNAMENT_ADMIN_NAME) {
				store.gameMessages.errorText = i18n.global.t("FCM_IO.contactAdminNameMismatchRestructuring")
				sendDiscordWebhook(`JS ERROR: player name mismatch in PHASE_RESTRUCTURING - gameID: ${personal.gameID} player: ${store.players[i].name} decompressedData: ${JSON.stringify(decompressedData)}`)
			}
			if (content.length !== 3) {
				store.gameMessages.errorText = i18n.global.t("FCM_IO.contactAdminDataErrorRestructuring")
				sendDiscordWebhook(`JS ERROR: data-error in PHASE_RESTRUCTURING - gameID: ${personal.gameID} player: ${store.players[i].name} decompressedData: ${JSON.stringify(decompressedData)}`)
			}

			store.players[i].beach = content[0]
			store.players[i].employees = content[1]
			store.players[i].OOBpreference = content[2]
			//alert(`name: ${store.players[i].name} beach: ${store.players[i].beach} employees: ${store.players[i].employees} OOBpreference: ${store.players[i].OOBpreference}`)
			//alert(`_name: ${_name} _phasesArray: ${_phasesArray} _timestamp: ${_timestamp} content: ${content}`)
			if (store.players[i].employees.indexOf(rf.DISCOUNT_MANAGER) > -1) {
				plyr.awardMilestone(i, rf.FIRST_DISCOUNT_MANAGER_USED)
			}
			histEntries.push([rf.HIST_CHOOSE_STRUCTURE, [[...store.players[i].employees], [...store.players[i].beach]], i, Math.floor(_timestamp / 1000)])
			rules.enforceDiscountMilestone(i)
		}
		//histEntries.sort((a, b) => a[3] - b[3])
		histEntries.sort((a, b) => parseInt(a[3], 10) - parseInt(b[3], 10))
		for (let i = 0; i < histEntries.length; i++) {
			model.addHistory(histEntries[i][0], histEntries[i][1], histEntries[i][2], histEntries[i][3])
		}
	} else if (store.gameflow.phase === rf.PHASE_PAYDAY) {
		/*
		 *	-9 = no data
		 *	-1 = no salary
		 *	-2 = enough money already
		 *	-3 = try to pay all - not enough money yet
		 *	-4 = pay with food, then money, if possible
		 *	-5 = Trainer MS and not enough money
		 *
		 *	-8: don't fire anyone - manual move
		 *	-9: no move
		 */
		let foodPayements = []
		let histEntries = []

		for (let i = 0; i < decompressedData.length; i++) {
			let histAdded = false
			let playerObj = store.players[i]
			if (playerObj.displayName === rf.BOT_NAME) {
				foodPayements.push([])
				continue
			}
			// NB take the "0 = first" entry from the array - to get payday only and not cleanup
			let turnDataArray = decompressedData[i][3][0]
			let timestamp = decompressedData[i][2]

			//alert(`player: ${store.players[i].name}   -- data: ${JSON.stringify(turnDataArray)}`)

			// Firing no-one is already validated. So pay none / pay all with money / pay all with earnings must be valid
			// Still need to check for processing with BEER MS- PAY WITH FOOD THEN MONEY
			if (turnDataArray[0].length > 0 && turnDataArray[0][0] === -4) {
				turnDataArray[1].splice(0)
				let due = rules.salary(i)
				let unitarySalary = plyr.hasMilestone(i, rf.FIRST_WAITRESS_USED) ? 3 : 5
				// Remove any coffee
				playerObj.resources = funcs.removeItemAll(playerObj.resources, rf.COFFEE)
				while (due > 0 && playerObj.resources.length > 0) {
					let resource = playerObj.resources[0]
					turnDataArray[1].push(resource)
					plyr.removeResourcesFromPlayer(i, resource, 1)
					due -= unitarySalary
					due = Math.max(due, 0)
				}
			}
			// Check if it's a move rather than a flag
			else if (turnDataArray[0].length > 0 && turnDataArray[0][0] >= 0) {
				for (let j = 0; j < turnDataArray[0].length; j++) {
					if (i !== personal.pov) {
						// The current player's firing and returning is done in real time
						plyr.fireEmployee(i, turnDataArray[0][j])
						store.availableEmployees[turnDataArray[0][j]]++
					}
				}
				histAdded = true
				histEntries.push([rf.HIST_FIRE, [...turnDataArray[0]], i, Math.floor(timestamp / 1000)])
			}
			// If manual move, need to remove resources
			if (turnDataArray[1].length > 0 && (turnDataArray[0].length === 0 || (turnDataArray[0].length === 1 && turnDataArray[0][0] === -8))) {
				if (i !== personal.pov) {
					// If you are processing the data, then you just made a move and lost your resources.
					// So don't deduct resources AGAIN if this is your move
					turnDataArray[1] = model.checkAllResourcesOwned(playerObj.resources, turnDataArray[1])
					for (let j = 0; j < turnDataArray[1].length; j++) {
						plyr.removeResourcesFromPlayer(i, turnDataArray[1][j], 1)
					}
				}
			} else if (turnDataArray[1].length > 0 && i !== personal.pov && !(turnDataArray[0].length === 1 && turnDataArray[0][0] === -4)) {
				// Handle case where resources are provided but it's not a manual move (e.g., firing + salary payment)
				// Exclude -4 (auto food-then-money) — the -4 branch above already removed those items and filled turnDataArray[1]
				turnDataArray[1] = model.checkAllResourcesOwned(playerObj.resources, turnDataArray[1])
				for (let j = 0; j < turnDataArray[1].length; j++) {
					plyr.removeResourcesFromPlayer(i, turnDataArray[1][j], 1)
				}
			}
			foodPayements.push(turnDataArray[1])

			if (!histAdded) histEntries.push([rf.HIST_FIRE, [], i, Math.floor(timestamp / 1000)])
		}

		let salaryHistObj = rules.paySalaries(foodPayements)

		//histEntries.sort((a, b) => a[3] - b[3])
		histEntries.sort((a, b) => parseInt(a[3], 10) - parseInt(b[3], 10))
		for (let i = 0; i < histEntries.length; i++) {
			model.addHistory(histEntries[i][0], histEntries[i][1], histEntries[i][2], histEntries[i][3])
		}

		model.addHistory(rf.HIST_SALARY, [...salaryHistObj], -1, 0)

		// Now check the side data to see who needs to move
	} else if (store.gameflow.phase === rf.PHASE_CLEAN_UP) {
		let histEntries = []
		for (let i = 0; i < decompressedData.length; i++) {
			let playerObj = store.players[i]
			if (playerObj.displayName === rf.BOT_NAME) {
				playerObj.resources.splice(0)
				continue
			}
			// NB add [1] to the end to get cleanup data WITHOUT payday
			let turnDataArray = decompressedData[i][3][1]
			let timestamp = decompressedData[i][2]
			// NB the turnDataArray could be undefined if the entire move data is a default "[]"
			// If the turnDataArray is empty, then continue
			if (!turnDataArray || turnDataArray.length === 0) {
				// Fridge players with nothing to bin are auto-skipped and never
				// submit a move, so empty data is expected for them; only flag it
				// when there were actually items to deal with
				if (plyr.hasFridge(i) && playerObj.resources.length > 0) {
					histEntries.push([rf.HIST_FRIDGE_RESOURCES, [...playerObj.resources], i, Math.floor(timestamp / 1000)])
					sendDiscordWebhook(`JS ERROR: turnDataArray is empty - gameID: ${personal.gameID} player: ${playerObj.name} decompressedData: ${JSON.stringify(decompressedData)}`)
				}
				continue
			}
			// If it isn't a specified order, then the keep all if <= 10 flag has been verified
			// So anything that isn't a -ve flag is being thrown out
			if (turnDataArray[0] !== -2) {
				for (let j = 0; j < turnDataArray.length; j++) {
					// Active players resources have already been removed -- BUT MAYBE NOT IF THEY DID A PRE-TURN????
					if (i !== personal.pov && turnDataArray[j] >= 0) plyr.removeResourcesFromPlayer(i, turnDataArray[j], 1)
				}
				// Safety: ensure at most 10 resources remain
				if (playerObj.resources.length > 10) {
					store.gameMessages.errorText = i18n.global.t("FCM_IO.tooManyItems")
					sendDiscordWebhook(`489: JS ERROR: Too many items - gameID: ${personal.gameID} player: ${playerObj.name} resources: ${JSON.stringify(playerObj.resources)}`)
					playerObj.resources.splice(10)
				}
			}
			// Otherwise, keep in preference order
			else if (turnDataArray[0] === -2) {
				let desiredResources = [...turnDataArray]
				desiredResources.shift()
				let newResourrces = []
				// Reorder based on desiredResources
				for (let j = 0; j < desiredResources.length; j++) {
					const desiredResource = desiredResources[j]
					const index = playerObj.resources.indexOf(desiredResource)

					if (index !== -1) {
						playerObj.resources.splice(index, 1)
						newResourrces.push(desiredResource)
					}
				}

				// Remove elements not in desiredResources
				playerObj.resources.splice(0)
				playerObj.resources = [...newResourrces]

				// Keep at most 10 elements
				playerObj.resources.splice(10)
			}
			if (plyr.hasFridge(i)) histEntries.push([rf.HIST_FRIDGE_RESOURCES, [...playerObj.resources], i, Math.floor(timestamp / 1000)])
		}
		// Remove the move to allow restruc play
		personal.moveDataRaw = ""

		//histEntries.sort((a, b) => a[3] - b[3])
		histEntries.sort((a, b) => parseInt(a[3], 10) - parseInt(b[3], 10))
		for (let i = 0; i < histEntries.length; i++) {
			model.addHistory(histEntries[i][0], histEntries[i][1], histEntries[i][2], histEntries[i][3])
		}
	}
}

/*
	 *	-9 = no data
	 *	-1 = no salary
	 *	-2 = enough money already
	 *	-3 = try to pay all - not enough money yet
	 *	-4 = pay with food, then money, if possible
	 *	-5 = Trainer MS and not enough money
	 *
	 *	-8: don't fire anyone - manual move
	 *	-9: no move

	// Returns:
	// 0: No data
	// 1: OK
	// 9: Mismatch - delete data and need to play

	 */
export function checkPaydayDataValid(playerIndex, paydayData) {
	const store = useModelStore()
	// pdaydayDaya = [  [flag/move], [paidInFood]]

	if (!paydayData) return 0

	// Check for NO DATA
	if (paydayData[0].length === 0) return 0
	if (paydayData[0].length === 1 && paydayData[0][0] === -9) return 0

	let playerObj = store.players[playerIndex]
	// Check for enough money
	if (paydayData[0].length === 1 && (paydayData[0][0] === -1 || paydayData[0][0] === -2 || paydayData[0][0] === -3)) {
		// Find the salay due
		let due = rules.salary(playerIndex)
		// INVALIDATE THE DATA IF THE PLAYER HAS THE BEER MS
		if (plyr.hasMilestone(playerIndex, rf.FIRST_BEER_SOLD) && playerObj.resources.length > 0) return 9

		if (playerObj.money >= due) return 1
		else return 9
	}
	// Check for pay all food then money
	if (paydayData[0].length === 1 && paydayData[0][0] === -4) {
		paydayData[1].splice(0)
		// Find the salay due
		let due = rules.salary(playerIndex)
		let unitarySalary = plyr.hasMilestone(playerIndex, rf.FIRST_WAITRESS_USED) ? 3 : 5
		// Remove any coffee
		let resourceCopy = [...playerObj.resources]
		resourceCopy = funcs.removeItemAll(playerObj.resources, rf.COFFEE)
		let excessItems = true
		if (plyr.hasMilestone(playerIndex, rf.FIRST_BEER_SOLD) && resourceCopy.length > 0) {
			due -= unitarySalary * resourceCopy.length
			if (due === 0) excessItems = false
			due = Math.max(due, 0)
		}

		// REJECT THIS IF YOU HAVE THE FRIDGE ME
		if (plyr.hasFridge(playerIndex) && excessItems) return 9

		if (playerObj.money >= due) return 1
		else return 9
	}
	// Trainer MS ?????
	if (paydayData[0].length === 1 && paydayData[0][0] === -5) {
		return 1
	}

	// Finally, it must be a fired move. So check can pay salary
	if (paydayData[0].length >= 1 && paydayData[0][0] >= 0) {
		let due = rules.salary(playerIndex)

		// Make sure any paid in food is still valid
		if (paydayData[1].length > 0) paydayData[1] = model.checkAllResourcesOwned(playerObj.resources, paydayData[1])

		// Now take off salary for each fired employee
		for (let i = 0; i < paydayData[0].length; i++) {
			let unitarySalary = 5
			if (plyr.hasMilestone(playerIndex, rf.FIRST_WAITRESS_USED)) unitarySalary = 3
			if (rules.doesEmployeeRequireSalary(i, paydayData[0][i]) === true) due -= unitarySalary
		}
		if (playerObj.money >= due) return 1
		else return 9
	}
}

/*
 * 	Fridge
 * 	======
 * 	-9 = no data
 * 	-1 = keep all(10)
 * 	-2 = keep in this order
 *
 *
 * 	-8 = don't bin anything; manual move
 * 	-9 = no move
 */

// Returns:
// 0: No data
// 1: OK
// 9: Mismatch - delete data and need to play
export function checkFridgeDataValid(playerIndex, fridgeData) {
	const store = useModelStore()
	if (!plyr.hasFridge(playerIndex)) return 1

	// NB Bots can have undef fride Data - bots now return false in hasFridge. Ideally this shouldn't be undef though.
	if (!fridgeData) return 0

	if (fridgeData.length === 0) return 0
	if (fridgeData.length === 1 && fridgeData[0] === -9) return 0

	let playerObj = store.players[playerIndex]
	// If you have kimchi plus others, it must be a manual move
	if (playerObj.resources.includes(rf.KIMCHI) && playerObj.resources.some((x) => x !== rf.KIMCHI)) return 9
	if (fridgeData.length === 1 && fridgeData[0] === -8 && playerObj.resources.length > 10) {
		store.gameMessages.errorText = i18n.global.t("FCM_IO.bugReport10R", { name: playerObj.name })
		return 9
	} else if (fridgeData.length === 1 && fridgeData[0] === -8 && playerObj.resources.length <= 10) return 1

	if (fridgeData.length === 1 && fridgeData[0] === -1) {
		// Check there is 10 or less resource
		if (playerObj.resources.length <= 10) return 1
		else return 9
	}

	// Check if it is a list of priority order food to keep
	if (fridgeData.length >= 1 && fridgeData[0] === -2) return 1

	// otherwise, the move is what you are binning
	if (playerObj.resources.length - fridgeData.length <= 10) return 1

	store.gameMessages.errorText = i18n.global.t("FCM_IO.bugReportFoodB", { name: playerObj.name })
	return 9
}
