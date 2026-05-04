import * as funcs from "../js/AQYfuncs.js"
import * as WS from "./AQYwebsocket.js"
import * as controller from "../js/AQYcontroller.js"
import * as rf from "../js/AQYreference.js"
import * as model from "../js/AQYmodel.js"
import * as Bot from "../js/AQYbot.js"
import * as city from "../js/AQYcity.js"

import { useModelStore } from "../stores/AQYstore.js"

import { usePersonalStore } from "../stores/AQYpersonal.js"

export const SUPER_USERS = ["BotKickStarter"]
export const DEBUG_USERS = ["BotKickStarter", "admin"]

export async function submitBug(bugContent) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true
	var csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/AQY/bugEntry/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
				action: "bugentry",
				description: bugContent,
				gameData: funcs.exportModel(true),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.bugEntrySuccess) store.topMenuViews.bugSuccessText = "Your bug report has been submitted"
		else store.topMenuViews.bugErrorText = "Sorry, there was a problem.<br/>Please email the webmaster directly or report on the Discord"
	} catch (error) {
		console.error("Error fetching data:", error)
		store.topMenuViews.bugErrorText = "Sorry, there was a problem.<br/>Please email the webmaster directly or report on the Discord"
	}
	store.topMenuViews.showLoader = false
}

export async function saveGame(saveRewind, saveContext = false, deleteMoves = false) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket()
	}

	personal.haltPlay = true
	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let exportData = funcs.exportModel(saveContext, false)
	//if (saveContext) exportData = funcs.exportModel(true)

	let postData = {
		action: "save",
		latestUpdate: personal.latestUpdate,
		data: exportData,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		saveRewind: saveRewind,
		deleteMoves: deleteMoves,
	}

	if (window.initData.gameData === "") postData.mapTiles = [...store.mapData.seed]

	// SHOULD BE NON-SIMUL
	if (store.gameflow.turnOrder.length > 0)
		postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name] // USED > goes to currentPlayers
	else {
		// THIS IS JUST AN EMERGENCY CHECK ??
		store.gameflow.turnOrder.push(0)
		postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name]
		rf.doAdminAlrt("RE-EXPORT")
		postData.data = funcs.exportModel()
	}

	if (controller.isSimulPhase(store.gameflow.phase)) {
		const filteredNames = store.players.filter((player) => player.displayName != rf.BOT_NAME).map((player) => player.displayName)

		postData.nextPlayer = filteredNames //.join(",")
	}

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		postData.status = "FINISHED" // USED
		let finalRes = model.endGame_core()
		postData.winner = finalRes[1] // USED
		postData.saveRewind = false

		let finalPositions = []
		//for (let i = 0; i < finalRes.length; i++) finalPositionsNames.push(store.players[finalRes[i][0]].name)
		finalPositions.push([...finalRes[1]])
		if (finalRes.length > 2) finalPositions.push([...finalRes[2]])
		postData.finalPositions = finalPositions
	}

	if (personal.removeCurrentFlexTime) {
		personal.removeCurrentFlexTime = false
		postData.checkName = personal.removeCurrentFlexTimeName
		personal.removeCurrentFlexTimeName = ""
	}

	try {
		const response = await fetch("/AQY/processAQYturn/", {
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
			store.topMenuViews.rewindErrorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		personal.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout

		// If pre move, stop here, process the move, and go back into the save
		if (data.preMove) {
			let preMoveJSON = funcs.decompressData(data.preMove)
			let errorFound = false
			if (preMoveJSON.phase !== store.gameflow.phase + 10) {
				errorFound = true
				rf.doAdminAlrt("Pre Move Phase Mismatch Error")
			}
			if (preMoveJSON.playerIndex !== controller.currentPlayerIndex()) {
				errorFound = true
				rf.doAdminAlrt("Pre Move Player Mismatch Error")
			}
			// If no error found, process the move, and stop this function early
			if (!errorFound) {
				let gameSavedDueModelEndGame = model.processPreMove(preMoveJSON)
				if (!gameSavedDueModelEndGame) await saveGame(true, false, false)
				return
			}
		}

		store.topMenuViews.showLoader = false
		personal.haltPlay = false

		// Broadcast update
		WS.broadcastGameUpdate(wsConnecting).catch((err) => console.warn("Broadcast failed:", err))

		await controller.startPlayerTurn()
	} catch (error) {
		console.error("Error fetching data:", error)
		rf.doAdminAlrt("Error saving the game")
	}
}

export async function sendNotification(name) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket()
	}

	personal.haltPlay = true
	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let postData = {
		action: "sendNotification",
		status: "ACTIVE",
		gameID: personal.gameID,
		nextPlayer: [name],
	}

	try {
		const response = await fetch("/AQY/processAQYturn/", {
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

		store.topMenuViews.showLoader = false
		personal.haltPlay = false

		WS.broadcastGameUpdate(wsConnecting)

		await controller.startPlayerTurn()
	} catch (error) {
		console.error("Error fetching data:", error)
		rf.doAdminAlrt("Error saving the game")
	}
}

export async function savePreTurn(prePhase, data) {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true
	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let postData = {
		action: "preTurn",
		latestUpdate: personal.latestUpdate,
		data: funcs.compressData(data),
		prePhase: prePhase,
		gameID: personal.gameID,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
	}

	try {
		const response = await fetch("/AQY/processAQYturn/", {
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
			store.topMenuViews.rewindErrorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}

		store.topMenuViews.showLoader = false
		personal.haltPlay = false
		model.resetPreMove()
		store.players[personal.pov].preMoves.splice(0)
		store.players[personal.pov].preMoves = [...funcs.decompressData(data.data)]
	} catch (error) {
		console.error("Error saving pre-move:", error)
		rf.doAdminAlrt("Error saving the pre-move")
	}
}

export async function sendProposeTrade(selectedOpponent, yourResources, opponentsResources, yourPromise, opponentsPromise) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket()
	}

	personal.haltPlay = true
	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let moveData = funcs.simpleExportPlayerCityTurnData(personal.pov, true)

	let postData = {
		action: "proposeTrade",
		latestUpdate: personal.latestUpdate,
		selectedOpponent: selectedOpponent,
		yourResources: yourResources,
		opponentsResources: opponentsResources,
		yourPromise: yourPromise,
		opponentsPromise: opponentsPromise,
		gameID: personal.gameID,
		BKSN: store.players[personal.pov].name,
		moveData: moveData,
	}

	try {
		const response = await fetch("/AQY/processAQYturn/", {
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

		if (data.endMoveError) {
			store.clearVars()
			store.clearMessages()
			store.topMenuViews.tradeErrorText = `<div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[selectedOpponent].colour) + `">${store.players[selectedOpponent].displayName}</span></div> has already finished their move. You are unable to trade with them`
			store.topMenuViews.showLoader = false
			personal.haltPlay = false
			return
		}
		if (data.resourceError) {
			store.clearVars()
			store.clearMessages()
			store.topMenuViews.tradeErrorText = `<div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[selectedOpponent].colour) + `">${store.players[selectedOpponent].displayName}</span></div> no longer has those resources - they must have traded. Please refresh the page`
			store.topMenuViews.showLoader = false
			personal.haltPlay = false
			return
		}
		if (data.success) {
			store.clearMessages()
			store.clearVars()
			//store.topMenuViews.tradeSuccessText = `Your trade has been sent to 	<div class="playerScoreSummaryDiv"><span class="mainEntryPlayerNewTurn" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[selectedOpponent].colour)">{{ store.players[selectedOpponent].displayName }}</span>
			//	</div>" + store.players[selectedOpponent].displayName`
			store.topMenuViews.tradeSuccessText = `Your trade has been sent to <div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[selectedOpponent].colour) + `">${store.players[selectedOpponent].displayName}</span></div> `

			// Just a proposal, so no need to force update
			funcs.decompressTradeData(data.playerTradeData, false)

			store.topMenuViews.bugSuccessText = "Your trade has been proposed to " + store.players[selectedOpponent].displayName
			store.topMenuViews.showLoader = false
			personal.haltPlay = false

			WS.broadcastGameUpdate(wsConnecting)
		}
	} catch (error) {
		console.error("Error fetching data:", error)
		rf.doAdminAlrt("Error proposing trade")
	}
}

export async function acceptTrade(entry) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket()
	}

	personal.haltPlay = true
	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let moveData = funcs.simpleExportPlayerCityTurnData(personal.pov, true)

	let postData = {
		action: "acceptTrade",
		latestUpdate: personal.latestUpdate,
		gameID: personal.gameID,
		BKSN: store.players[personal.pov].name,
		moveData: moveData,
		entry: entry,
	}
	try {
		const response = await fetch("/AQY/processAQYturn/", {
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

		if (data.endMoveError) {
			store.clearVars()
			store.topMenuViews.rewindErrorText = store.players[entry[0]].displayName + " has already finished their move. You are unable to trade with them. Please refresh the page to update"
			store.topMenuViews.showLoader = false
			personal.haltPlay = false
			return
		}
		if (data.resourceError) {
			store.clearVars()
			store.topMenuViews.rewindErrorText = store.players[entry[0]].displayName + " no longer has those resources - they must have traded. Please refresh the page to update"
			store.topMenuViews.showLoader = false
			personal.haltPlay = false
			return
		}
		if (data.tradeExistError) {
			store.clearVars()
			store.topMenuViews.rewindErrorText = "The trade no longer exists - please refresh the page to update"
			store.topMenuViews.showLoader = false
			personal.haltPlay = false
			return
		}
		if (data.success) {
			// CHECK LOCKED DATA ON IMPORT AND UPDATE
			store.clearVars()
			// Trade accepted, so force update
			funcs.decompressTradeData(data.playerTradeData, true)

			//store.topMenuViews.bugSuccessText = "Your trade has been proposed to " + store.players[selectedOpponent].displayName
			store.topMenuViews.showLoader = false
			personal.haltPlay = false

			WS.broadcastGameUpdate(wsConnecting)
		}
	} catch (error) {
		console.error("Error fetching data:", error)
		rf.doAdminAlrt("Error processing trade")
	}
}

export async function rejectTrade(entry) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket()
	}

	personal.haltPlay = true
	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let postData = {
		action: "rejectTrade",
		latestUpdate: personal.latestUpdate,
		gameID: personal.gameID,
		BKSN: store.players[personal.pov].name,
		entry: entry,
	}

	try {
		const response = await fetch("/AQY/processAQYturn/", {
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

		if (data.success) {
			store.clearVars()
			// Trade rejected, so no need to force an update
			funcs.decompressTradeData(data.playerTradeData, false)
			store.topMenuViews.tradeSuccessText = `You have rejected the trade with <div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[entry[0]].colour) + `">${store.players[entry[0]].displayName}</span></div> `

			//store.topMenuViews.bugSuccessText = "Your trade has been proposed to " + store.players[selectedOpponent].displayName
			store.topMenuViews.showLoader = false
			personal.haltPlay = false

			WS.broadcastGameUpdate(wsConnecting)
		}
	} catch (error) {
		console.error("Error fetching data:", error)
		rf.doAdminAlrt("Error rejecting trade")
	}
}

export async function markPromiseComplete(playerIndex, promise) {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true
	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let postData = {
		action: "markPromiseComplete",
		latestUpdate: personal.latestUpdate,
		gameID: personal.gameID,
		BKSN: store.players[personal.pov].name,
		idx: playerIndex,
		promise: promise,
	}

	try {
		const response = await fetch("/AQY/processAQYturn/", {
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

		if (data.success) {
			//let reversedPromise = promise.slice(0, 2).reverse().concat(promise.slice(2));
			// Remove promise localls
			for (let i = 0; i < store.players.length; i++) {
				for (let j = 0; j < store.players[i].promises.length; j++) {
					if (store.players[i].promises[j] === promise) store.players[i].promises.splice(j, 1)
					//if(store.players[i].promises[j] === reversedPromise) store.players[i].promises.splice(j,1)
				}
			}

			store.topMenuViews.showLoader = false
			personal.haltPlay = false
		}
	} catch (error) {
		console.error("Error fetching data:", error)
		rf.doAdminAlrt("Error marking promise as complete")
	}
}

export async function saveSimulTurn(playerIndex) {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true
	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let moveData = funcs.simpleExportPlayerCityTurnData(playerIndex)
	//if (saveContext) exportData = funcs.exportModel(true)

	let postData = {
		action: "saveSimulMove",
		latestUpdate: personal.latestUpdate,
		moveData: moveData,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		BKSN: store.players[personal.pov].name,
	}

	if (personal.removeCurrentFlexTime) {
		personal.removeCurrentFlexTime = false
		postData.checkName = personal.removeCurrentFlexTimeName
		personal.removeCurrentFlexTimeName = ""
	}

	try {
		const response = await fetch("/AQY/processAQYturn/", {
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
			store.topMenuViews.rewindErrorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		// If not ready
		if (!data[data.length - 1].allReady) {
			store.gameflow.turnOrder.splice(0)
			for (let i = 0; i < data[0].ready.length; i++) {
				if (!data[0].ready[i]) store.gameflow.turnOrder.push(i)
			}
		} else {
			// Reload the data
			let timestamps = []
			for (let i = 0; i < store.players.length; i++) {
				funcs.simpleImportPlayerCityTurnData(i, data[i].content)
				timestamps.push(data[i].timestamp)
			}
			// Process end of simul city phase (do famine, history)
			city.processEndOfSimulTurn(timestamps)

			// End the city phase
			controller.endCurrentPhase()
			// save the game
			await saveGame(true, false, true)
		}

		store.topMenuViews.showLoader = false
		personal.haltPlay = false
	} catch (error) {
		console.error("Error fetching data:", error)
		rf.doAdminAlrt("Error saving the game")
	}
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

export async function kickstartGame() {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true
	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let postData = {
		action: "kickstartGame",
		latestUpdate: personal.latestUpdate,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		BKSN: store.players[personal.pov].name,
	}

	try {
		const response = await fetch("/AQY/processAQYturn/", {
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
			store.topMenuViews.rewindErrorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		// If not ready
		if (!data[data.length - 1].allReady) {
			store.gameflow.turnOrder.splice(0)
			for (let i = 0; i < data[0].ready.length; i++) {
				if (!data[0].ready[i]) store.gameflow.turnOrder.push(i)
			}
		} else {
			// Reload the data
			let timestamps = []
			for (let i = 0; i < store.players.length; i++) {
				funcs.simpleImportPlayerCityTurnData(i, data[i].content)
				timestamps.push(data[i].timestamp)
			}
			// Process end of simul city phase (do famine, history)
			city.processEndOfSimulTurn(timestamps)

			// End the city phase
			controller.endCurrentPhase()
			// save the game
			await saveGame(true, false, true)
		}

		store.topMenuViews.showLoader = false
		personal.haltPlay = false
	} catch (error) {
		console.error("Error fetching data:", error)
		rf.doAdminAlrt("Error saving the game")
	}
}

export async function sendChatMessage(newEntry) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")
	try {
		const response = await fetch("/AQY/sendChatMessage/", {
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
			rf.doAdminAlrt("Sorry, there was a problem. Please email the webmaster directly")
			return
		}
		store.chatData = funcs.decompressChatData(data.chatData)
		store.topMenuViews.showLoader = false
		// TODO - move this?
		if (personal.liveWS) WS.AQYwebSocket.send("NEWCHATTS" + String(personal.gameID)) //+ String(result.latestUpdate));
	} catch (error) {
		console.error("Error sending chat:", error)
		rf.doAdminAlrt("Error sending chat message")
	}
}

export async function reloadGameData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")
	store.topMenuViews.showLoader = true

	// Function to fetch data from the database
	try {
		const response = await fetch("/AQY/data/1/", {
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
		funcs.importModel(data.gameData, false)
		personal.secondsToNextKickout = data.secondsToNextKickout
		personal.latestUpdate = data.latestUpdate
		if (data.preMove) {
			store.players[personal.pov].preMoves.splice(0)
			store.players[personal.pov].preMoves = [...funcs.decompressData(data.preMove)]
		}
		store.topMenuViews.showLoader = false
		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

/** THIS ONLY COMES FROM WS. THIS UPDATES TRADE OFFERS, SO ONLY FORCE UPDATE WITH A FLAG */
export async function reloadTradeData() {
	//const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")
	//store.topMenuViews.showLoader = true

	// Function to fetch data from the database
	try {
		const response = await fetch("/AQY/data/4/", {
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
		// This only comes from WS, so only update with flag
		funcs.decompressTradeData(data.playerTradeData, false)
		//store.topMenuViews.showLoader = false
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

export async function reloadChatData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")

	// Function to fetch data from the database
	try {
		const response = await fetch("/AQY/data/2/", {
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
		store.topMenuViews.showChat = true
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

export async function saveNotes() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/AQY/saveNotes/", {
			method: "POST",
			body: JSON.stringify({
				action: "saveNotes",
				player: personal.name,
				gameID: personal.gameID,
				notes: funcs.htmlEscape(personal.notes),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (!data.notePosted) {
			rf.doAdminAlrt("Sorry, there was a problem. Please email the webmaster directly")
			return
		}
		store.topMenuViews.showLoader = false
	} catch (error) {
		console.error("Error saving Notes:", error)
		rf.doAdminAlrt("Error saving Notes")
	}
}

export async function loadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	if (store.topMenuViews.showReplay) {
		store.topMenuViews.rewindErrorText = "Error: Exit Replay Mode First"
		store.topMenuViews.performingRewind = false
		store.topMenuViews.showLoader = false
		return
	}

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		store.topMenuViews.rewindErrorText = "Error: Game Ended"
		store.topMenuViews.performingRewind = false
		store.topMenuViews.showLoader = false
		return
	}

	try {
		const response = await fetch("/AQY/processAQYturn/", {
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
		if (data.syncError) {
			store.topMenuViews.rewindErrorText = "It appears you have an older version of the game. Please refresh the page"
			store.topMenuViews.performingRewind = false
			return
		}

		// Hide the dropdown
		if (data.errorMessage) {
			store.topMenuViews.rewindErrorText = data.errorMessage
			store.topMenuViews.performingRewind = false
			controller.startPlayerTurn()
		} else {
			funcs.importModel(data.gameData, false)
			personal.latestUpdate = data.latestUpdate

			model.addHistory(rf.HIST_REWIND, -1, 0, [personal.pov])

			// Re kick booted players
			for (let i = 0; i < data.missingPlayers.length; i++) {
				for (let j = 0; j < store.players.length; j++) {
					if (store.players[j].name == data.missingPlayers[i]) {
						store.players[j].displayName = rf.BOT_NAME
						//model.players[j].score = 0
					}
				}
			}

			// Send back to DB with another save
			updateDataFromLoadRewind()
		}
		store.topMenuViews.showLoader = false
	} catch (error) {
		console.error("Error rewinding data:", error)
		rf.doAdminAlrt("Error rewinding the game")
		store.topMenuViews.performingRewind = false
	}
}

async function updateDataFromLoadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket()
	}

	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")
	// IF AT THE END OF NON-SIMUL PHASE, SET UP NEXT PLAYER

	try {
		const response = await fetch("/AQY/processAQYturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "updateDataFromLoadRewind",
				turn: store.gameflow.turn,
				nextPlayer: [store.players[store.gameflow.turnOrder[0]].name], // USED > goes to currentPlayers
				gameID: personal.gameID,
				phase: store.gameflow.phase,
				gameData: funcs.exportModel(),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		personal.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		store.topMenuViews.showLoader = false
		store.topMenuViews.performingRewind = false
		Bot.removeBotPlayers()
		if (store.gameflow.turnOrder.length === 0) controller.endCurrentPhase()
		//if (store.gameflow.phase !== rf.PHASE_PRODUCTION && store.gameflow.phase !== rf.PHASE_MOVE_PIRATE) store.resetContext()
		controller.startPlayerTurn()
		WS.broadcastGameUpdate(wsConnecting)
	} catch (error) {
		console.error("Error updating data:", error)
		rf.doAdminAlrt("Error updating the game")
		store.topMenuViews.performingRewind = false
		controller.startPlayerTurn()
	}
}

// Simply saves as a no kickout missing ALSO FOR GRAVE GAME OVER
export async function resign(lossDueToGraves) {
	/* ONLY GET HERE WITH 0 HEX ACTIONS USED */
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/AQY/processAQYturn/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
				action: "resign",
				user: personal.name,
				lossDueToGraves: lossDueToGraves,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
	} catch (error) {
		console.error("Error resiging:", error)
		rf.doAdminAlrt("Error Resigning")
	}
}

export async function kickout() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	var postData = {
		action: "kickout",
		gameID: personal.gameID,
		kickedName: controller.currentPlayerObj().name,
		latestUpdate: personal.latestUpdate,
	}

	try {
		const response = await fetch("/AQY/processAQYturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.syncError) {
			store.topMenuViews.rewindErrorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		personal.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
	} catch (error) {
		console.error("Error kicking:", error)
		rf.doAdminAlrt("Error Kicking")
	}
}

export async function removePlayerFromHardTradeReset(playerIndex) {
	//const store = useModelStore()
	const personal = usePersonalStore()

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/AQY/processAQYturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "removePlayerFromHardTradeReset",
				playerIndex: playerIndex,
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
		console.error("Error adjusting trade:", error)
	}
}

export async function saveZoom() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let csrftoken = funcs.getCookie("csrftoken")

	let zoomLevel = store.refSize / 10

	try {
		const response = await fetch("/AQY/saveZoom/", {
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

export async function checkForLatestData() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/AQY/data/3/", {
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
			funcs.importModel(data.gameData, false)
			personal.secondsToNextKickout = data.secondsToNextKickout
			personal.latestUpdate = data.latestUpdate
			store.topMenuViews.showLoader = false
			await controller.startPlayerTurn()
		}
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

export async function submitStatsExcludeConsent() {
	//const store = useModelStore()
	//const personal = usePersonalStore()

	await simulateServer()
}

async function simulateServer() {
	const store = useModelStore()
	store.topMenuViews.showLoader = true
	await funcs.sleep(500)
	store.topMenuViews.showLoader = false
}

export async function castVote(topic) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	let postData = {
		action: "castVote", // USED
		topic: topic, // USED
		gameID: personal.gameID, // USED
	}

	try {
		const response = await fetch("/AQY/castVote/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			store.topMenuViews.rewindErrorText = "Error; Contact Admin"
			throw new Error("Network response was not ok")
		}
		const data = await response.json()

		store.topMenuViews.showLoader = false
		if (data.voteChanged === true) {
			store.topMenuViews.tradeSuccessText = "Vote Saved"

			if (topic === rf.DELETE_VOTE_TOPIC) {
				personal.votedToDelete = true
				store.deleteVotesData = JSON.parse(data.votesData)
				if (data.redirect_url) window.location.href = data.redirect_url
			} else if (topic === rf.STATS_EXCLUDE_VOTE_TOPIC) {
				personal.votedToExclude = true
				store.statsExcludeVotesData = JSON.parse(data.votesData)
			}
		} else store.topMenuViews.rewindErrorText = "Error; Contact Admin"
	} catch (error) {
		console.error("Error fetching data:", error)
		store.topMenuViews.rewindErrorText = "Error; Contact Admin"
		return false
	}
}
