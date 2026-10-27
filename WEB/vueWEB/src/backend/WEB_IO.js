import * as funcs from "../js/WEBfuncs.js"
import * as controller from "../js/WEBcontroller.js"
import * as rf from "../js/WEBreference.js"
import * as model from "../js/WEBmodel.js"
import * as Bot from "../js/WEBbot.js"
import * as WS from "./WEBwebsocket.js"
import i18n from "../i18n"

const t = (key, named) => i18n.global.t(key, named)

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
			store.gameMessages.bugSuccessText = t("io.bugSubmitted")
			store.viewSettings.showLoader = false
			store.viewSettings.showBug = false
		} else store.gameMessages.bugErrorText = t("io.bugError")
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.bugErrorText = t("io.bugError")
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
			alert(t("io.olderVersion"))
			return
		}
		//personal.latestUpdate = data.latestUpdate
		if (!data.completed) alert(t("io.genericError"))
		store.viewSettings.showLoader = false
		personal.haltPlay = false
		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error fetching data:", error)
		alert(t("io.saveError"))
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
			store.gameMessages.errorText = t("io.olderVersion")
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
		store.gameMessages.errorText = t("io.saveError")
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
			store.gameMessages.errorText = t("io.webmasterProblem")
			return
		}
		store.chatData = funcs.decompressChatData(data.chatData)
		if (personal.liveWS) WS.WEBwebSocket.send("NEWCHATTS" + String(personal.gameID)) //+ String(result.latestUpdate));
		store.viewSettings.showLoader = false
	} catch (error) {
		console.error("Error sending chat:", error)
		store.gameMessages.errorText = t("io.chatError")
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
	store.gameMessages.errorText = ""

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
			store.gameMessages.errorText = t("io.webmasterProblem")
			return
		}
		store.viewSettings.showLoader = false
	} catch (error) {
		console.error("Error saving Notes:", error)
		store.gameMessages.errorText = t("io.notesError")
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
		store.gameMessages.errorText = t("io.exitReplayFirst")
		store.viewSettings.performingRewind = false
		store.viewSettings.showLoader = false
		return
	}

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		store.gameMessages.errorText = t("io.gameEnded")
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
			store.gameMessages.errorText = t("io.olderVersion")
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
		store.gameMessages.errorText = t("io.rewindError")
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
		store.gameMessages.errorText = t("io.updateError")
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
		store.gameMessages.errorText = t("io.resignError")
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
			store.gameMessages.errorText = t("io.olderVersion")
			return
		}
		if (data.voteCast) {
			store.kickoutVotesData = data.votesData
			store.viewSettings.showLoader = false
			return data
		}

		// Apply kickout result to local state so subsequent saves don't revert it
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout

		if (data.missingPlayers && data.missingPlayers.length > 0) {
			// Find all missing player indices in the players array
			const missingIndices = []
			for (const missingName of data.missingPlayers) {
				const idx = store.players.findIndex(p => p.name === missingName)
				if (idx >= 0) {
					missingIndices.push(idx)
				}
			}

			// Remove from ACTIVE turn orders only (keep in fullTurnOrder as placeholders)
			const filterTurnOrder = (arr) => arr.filter(idx => !missingIndices.includes(idx))
			store.gameflow.turnOrder = filterTurnOrder(store.gameflow.turnOrder)
			store.gameflow.fullTurnOrder = filterTurnOrder(store.gameflow.fullTurnOrder)
			store.gameflow.wonderTurnOrder = filterTurnOrder(store.gameflow.wonderTurnOrder)
			store.gameflow.wonderPrayingOrder = filterTurnOrder(store.gameflow.wonderPrayingOrder)
			store.gameflow.newWonderTurnOrder = filterTurnOrder(store.gameflow.newWonderTurnOrder)
			store.gameflow.newWonderPrayingOrder = filterTurnOrder(store.gameflow.newWonderPrayingOrder)
			// NOTE: fullTurnOrder is NOT filtered - kicked players remain as placeholders

			// Mark kicked players as bots
			for (const idx of missingIndices) {
				store.players[idx].displayName = rf.BOT_NAME
			}

			// Update wholeTurnResetData so resetWholeTurn() doesn't revert the kickout
			store.wholeTurnResetData = funcs.simpleExportWholeWEBmodel()
		}

		store.viewSettings.showLoader = false
		return data
	} catch (error) {
		console.error("Error kicking:", error)
		store.gameMessages.errorText = t("io.kickoutError")
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
			store.gameMessages.errorText = t("io.contactAdmin")
			throw new Error("Network response was not ok")
		}
		const data = await response.json()

		store.viewSettings.showLoader = false
		console.log(data)
		if (data.voteChanged === true) {
			store.gameMessages.bugSuccessText = t("io.voteSaved")

			if (topic === rf.DELETE_VOTE_TOPIC) {
				personal.votedToDelete = true
				store.deleteVotesData = JSON.parse(data.votesData)
				if (data.redirect_url) window.location.href = data.redirect_url
			} else if (topic === rf.STATS_EXCLUDE_VOTE_TOPIC) {
				personal.votedToExclude = true
				store.statsExcludeVotesData = JSON.parse(data.votesData)
			}
		} else store.gameMessages.errorText = t("io.contactAdmin")
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = t("io.contactAdmin")
		return false
	}
}
