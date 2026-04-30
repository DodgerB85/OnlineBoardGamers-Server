import * as funcs from "../js/WEBfuncs.js"
import * as controller from "../js/WEBcontroller.js"
import * as rf from "../js/WEBreference.js"
import * as model from "../js/WEBmodel.js"
import * as Bot from "../js/WEBbot.js"
import * as WS from "./WEBwebsocket.js"

import { useModelStore } from "../stores/WEBstore.js"
import { usePersonalStore } from "../stores/WEBpersonal.js"

export const SUPER_USERS = ["BotKickStarter"]
export const DEBUG_USERS = ["BotKickStarter", "admin"]

export async function submitBug(bugContent) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.viewSettings.showLoader = true
	var csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/WEB/bugEntry/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
				action: "bugentry",
				description: bugContent,
				gameData: funcs.exportWEBmodel(true),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.bugEntrySuccess) {
			store.gameMessages.bugSuccessText = "Your bug report has been submitted"
			store.viewSettings.showLoader = false
			store.viewSettings.showBug = false
		} else store.gameMessages.bugErrorText = "Sorry, there was a problem.<br/>Please email the webmaster directly or report on the Discord"
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.bugErrorText = "Sorry, there was a problem.<br/>Please email the webmaster directly or report on the Discord"
	}
	store.viewSettings.showLoader = false
}

export async function simpleSave() {
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.haltPlay = true
	store.viewSettings.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let postData = {
		action: "simpleSave", // USED
		latestUpdate: personal.latestUpdate, // USED
		data: funcs.exportWEBmodel(false),
		turn: store.gameflow.turn, // USED
		phase: store.gameflow.phase, // USED
		gameID: personal.gameID, // USED
	}

	try {
		const response = await fetch("/WEB/processWEBturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.syncError) {
			alert("It appears you have an older version of the game. Please refresh the page")
			return
		}
		//personal.latestUpdate = data.latestUpdate
		if (!data.completed) alert("Error occurred")
		store.viewSettings.showLoader = false
		personal.haltPlay = false
		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error fetching data:", error)
		alert("Error saving the game")
	}
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

	if (personal.latestUpdate === -1) personal.latestUpdate = "9999999999999"

	let exportData = funcs.exportWEBmodel(false, false)
	if (saveContext) exportData = funcs.exportWEBmodel(true, false)
	let BKSN = store.players[personal.pov].name

	let postData = {
		action: "saveGame",
		latestUpdate: personal.latestUpdate,
		gameData: exportData,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		saveRewind: saveRewind,
		BKSN: BKSN,
	}

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		postData.status = "FINISHED" // USED
		let result = model.endGame_core()
		postData.winner = result[0]
		postData.saveRewind = false
		postData.data = funcs.exportWEBmodel(false, true)
		postData.finalPositions = [...result]
	}

	// SHOULD BE NON-SIMUL
	if (store.gameflow.turnOrder.length > 0) {
		postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name] // USED > goes to currentPlayers
	} else {
		// THIS IS JUST AN EMERGENCY CHECK
		store.gameflow.turnOrder.push(0)
		postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name]
		alert("RE-EXPORT")
		postData.data = funcs.exportWEBmodel()
	}

	// Use this to kickPass another player and remove their flexi time
	if (personal.removeCurrentFlexTime) {
		personal.removeCurrentFlexTime = false
		postData.checkName = personal.removeCurrentFlexTimeName
		personal.removeCurrentFlexTimeName = ""
	}

	try {
		const response = await fetch("/WEB/processWEBturn/", {
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
		if (data.syncError === "12345") {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout

		store.viewSettings.showLoader = false
		personal.haltPlay = false
		controller.startPlayerTurn()

		WS.broadcastGameUpdate(wsConnecting)
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error saving the game"
	}
}

export async function sendChatMessage(newEntry) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.viewSettings.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")
	try {
		const response = await fetch("/WEB/sendChatMessage/", {
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
		if (personal.liveWS) WS.WEBwebSocket.send("NEWCHATTS" + String(personal.gameID)) //+ String(result.latestUpdate));
		store.viewSettings.showLoader = false
	} catch (error) {
		console.error("Error sending chat:", error)
		store.gameMessages.errorText = "Error sending chat message"
	}
}

export async function reloadGameData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")
	store.viewSettings.showLoader = true
	store.clearMessages()
	personal.adminDataInspection = false

	// Function to fetch data from the database
	try {
		const response = await fetch("/WEB/data/1/", {
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
		if (data.finishedGame) funcs.importWEBmodel(data.gameData, true, false)
		else funcs.importWEBmodel(data.gameData, false, false)

		window.initData.move = data.move

		personal.secondsToNextKickout = data.secondsToNextKickout
		personal.latestUpdate = data.latestUpdate

		window.initData.latestUpdate = data.latestUpdate
		window.initData.secondsToNextKickout = data.secondsToNextKickout
		window.initData.finishedGame = data.finishedGame
		window.initData.gameData = data.gameData

		store.viewSettings.showLoader = false
		controller.startPlayerTurn()
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
		const response = await fetch("/WEB/data/2/", {
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
		store.viewSettings.showChat = true
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

export async function saveNotes() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/WEB/saveNotesWEB/", {
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
			store.gameMessages.errorText = "Sorry, there was a problem. Please email the webmaster directly"
			return
		}
		store.viewSettings.showLoader = false
	} catch (error) {
		console.error("Error saving Notes:", error)
		store.gameMessages.errorText = "Error saving Notes"
	}
}

export async function loadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let hiddenInfoRevealed = model.revealedHiddenInformationForRewind()
	let currentParam = []
	if (store.history[store.history.length - 1][0] === rf.HIST_REWIND) {
		currentParam = JSON.parse(JSON.stringify(store.history[store.history.length - 1][3]))
	}

	store.clearMessages()
	store.resetContext()

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
		const response = await fetch("/WEB/processWEBturn/", {
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
		if (data.syncError === "12345") {
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
			funcs.importWEBmodel(data.gameData, false)
			personal.latestUpdate = data.latestUpdate
			window.initData.latestUpdate = data.latestUpdate

			if (hiddenInfoRevealed && !currentParam.includes(personal.pov)) currentParam.push(personal.pov)
			if (personal.name !== "BotKickStarter") model.addHistory(rf.HIST_REWIND, personal.pov, 0, [...currentParam])
			else model.addHistory(rf.HIST_REWIND, -1, 0, [...currentParam])

			// Re kick booted players
			for (let i = 0; i < data.missingPlayers.length; i++) {
				for (let j = 0; j < store.players.length; j++) {
					if (store.players[j].name == data.missingPlayers[i]) {
						store.players[j].displayName = rf.BOT_NAME
						//model.players[j].score = 0
					}
				}
			}
			if (store.gameflow.phase !== rf.PHASE_MID_ACTIONS) {
				store.resetContext()
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
	// IF AT THE END OF NON-SIMUL PHASE, SET UP NEXT PLAYER
	let nextPlayer = [store.players[store.gameflow.turnOrder[0]].name]

	let exportedModel = funcs.exportWEBmodel(false, false)
	if (store.gameflow.phase === rf.PHASE_MID_ACTIONS) exportedModel = funcs.exportWEBmodel(true, false)

	try {
		const response = await fetch("/WEB/processWEBturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "updateDataFromLoadRewind",
				turn: store.gameflow.turn,
				nextPlayer: nextPlayer, // USED > goes to currentPlayers
				gameID: personal.gameID,
				phase: store.gameflow.phase,
				gameData: exportedModel,
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

		store.viewSettings.showLoader = false
		store.viewSettings.performingRewind = false
		Bot.removeBotPlayers()
		if (store.gameflow.turnOrder.length === 0) controller.endCurrentPhase()
		//if (store.gameflow.phase !== rf.PHASE_PRODUCTION && store.gameflow.phase !== rf.PHASE_MOVE_PIRATE) store.resetContext()

		controller.startPlayerTurn()

		WS.broadcastGameUpdate(wsConnecting)
	} catch (error) {
		console.error("Error updating data:", error)
		store.gameMessages.errorText = "Error updating the game"
		store.viewSettings.performingRewind = false
		controller.startPlayerTurn()
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
		const response = await fetch("/WEB/processWEBturn/", {
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
		const data = await response.json()
		console.log(data)
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

	var postData = {
		action: "kickout",
		gameID: personal.gameID,
		kickedName: controller.currentPlayerObj().name,
		latestUpdate: personal.latestUpdate,
	}

	try {
		const response = await fetch("/WEB/processWEBturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.syncError === "12345") {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
	} catch (error) {
		console.error("Error kicking:", error)
		store.gameMessages.errorText = "Error Kicking Player"
	}
}

export async function saveZoom() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let csrftoken = funcs.getCookie("csrftoken")

	let zoomLevel = store.refSize / 10

	try {
		const response = await fetch("/WEB/saveZoom/", {
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
		const response = await fetch("/WEB/data/3/", {
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
			if (store.gameflow.phase === rf.PHASE_GAME_OVER) funcs.importWEBmodel(data.gameData, true, false)
			else funcs.importWEBmodel(data.gameData, false, false)
			window.initData.move = data.move
			personal.secondsToNextKickout = data.secondsToNextKickout
			personal.latestUpdate = data.latestUpdate
			store.viewSettings.showLoader = false
			controller.startPlayerTurn()
		}
	} catch (error) {
		console.error("Error fetching data:", error)
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
		const response = await fetch("/WEB/castVote/", {
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
		console.log(data)
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
