/**
 * All communication with the Django backend for the URR scaffold.
 *
 * Generic actions supported: save turn, resign, kickout, chat, notes, bug
 * report, votes, rewind and polling for the latest data. Extend as needed.
 */

import * as funcs from "../js/URRfuncs.js"
import * as rf from "../js/URRreference.js"
import * as model from "../js/URRmodel.js"
import * as controller from "../js/URRcontroller.js"
import * as WS from "./URRwebsocket.js"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"

export async function sendDiscordWebhook(message) {
	let csrftoken = funcs.getCookie("csrftoken")
	fetch("/sendAdminMessage/", {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
		body: JSON.stringify({ message: message }),
	}).catch((error) => console.error("Error sending webhook:", error))
}

export function getNextCurrentPlayers() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (personal.trainingGame && store.gameflow.turnOrder.length > 0) {
		return {
			allIsCurrentPlayers: [personal.name],
			allRemainingPlayersInTurnOrder: [personal.name],
		}
	}

	const allIsCurrentPlayers = []
	if (store.gameflow.turnOrder.length > 0) allIsCurrentPlayers.push(store.players[store.gameflow.turnOrder[0]].name)
	const allRemainingPlayersInTurnOrder = store.gameflow.turnOrder.map((idx) => store.players[idx].name)
	return { allIsCurrentPlayers, allRemainingPlayersInTurnOrder }
}

export async function saveGame(saveRewind = true) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) wsConnecting = WS.StartWebSocket()

	personal.haltPlay = true
	store.viewSettings.showLoader = true

	const { allIsCurrentPlayers, allRemainingPlayersInTurnOrder } = getNextCurrentPlayers()

	let postData = {
		action: "saveGame",
		latestUpdate: personal.latestUpdate,
		gameDataCompressed: funcs.compressData64(model.exportGameData()),
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		saveRewind: saveRewind,
		allIsCurrentPlayers: allIsCurrentPlayers,
		allRemainingPlayersInTurnOrder: allRemainingPlayersInTurnOrder,
	}

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		postData.status = "FINISHED"
		postData.saveRewind = false
		const positions = store.gameflow.finalPositions || Array.from(store.players.keys()).sort((a, b) => store.players[b].score - store.players[a].score)
		postData.finalPositions = [...positions]
		postData.winnerUsername = store.players[positions[0]].name
		postData.tournamentData = positions.map((playerIdx, i) => (i === 0 ? [store.players[playerIdx].name] : [store.players[playerIdx].name, store.players[playerIdx].score]))
	}

	try {
		const response = await fetch("/URR/processURRturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		if (data.syncError === true) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			store.viewSettings.showLoader = false
			return false
		}
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout

		if (personal.liveWS) WS.broadcastGameUpdate(wsConnecting)

		store.viewSettings.showLoader = false
		personal.haltPlay = false
		controller.startPlayerTurn()
		return true
	} catch (error) {
		console.error("Error saving game:", error)
		store.gameMessages.errorText = "Unable to confirm that the move was saved. Refresh the page before playing again."
		store.viewSettings.showLoader = false
		return false
	}
}

export async function sendChatMessage(newEntry) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	try {
		const response = await fetch("/URR/sendChatMessageURR/", {
			method: "POST",
			body: JSON.stringify({ action: "sendChatMessage", player: personal.name, gameID: personal.gameID, newEntry: newEntry }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		store.chatData = funcs.decompressChatData(data.chatData)
		if (personal.liveWS) WS.broadcastChatUpdate()
	} catch (error) {
		console.error("Error sending chat:", error)
		store.gameMessages.errorText = "Error sending chat message"
	}
	store.viewSettings.showLoader = false
}

export async function reloadChatData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	try {
		const response = await fetch("/URR/data/2/", {
			method: "POST",
			body: JSON.stringify({ gameID: personal.gameID }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		store.chatData = funcs.decompressChatData(data.chatData)
		store.viewSettings.showChat = true
	} catch (error) {
		console.error("Error fetching chat data:", error)
	}
}

export async function reloadGameData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	try {
		const response = await fetch("/URR/data/1/", {
			method: "POST",
			body: JSON.stringify({ gameID: personal.gameID }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		model.importGameData(data.gameData)
		model.rebuildTurnOrder()
		personal.secondsToNextKickout = data.secondsToNextKickout
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
	} catch (error) {
		console.error("Error fetching game data:", error)
	}
	store.viewSettings.showLoader = false
}

export async function saveNotes() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	store.gameMessages.errorText = ""
	try {
		const response = await fetch("/URR/saveNotesURR/", {
			method: "POST",
			body: JSON.stringify({ action: "saveNotes", player: personal.name, gameID: personal.gameID, notes: funcs.htmlEscape(personal.notes) }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		const data = await response.json()
		if (data.error) {
			store.gameMessages.errorText = data.error
			store.viewSettings.showLoader = false
			return
		}
		if (!response.ok) throw new Error("Network response was not ok")
		if (!data.notePosted) {
			store.gameMessages.errorText = "Sorry, there was a problem. Please email the webmaster directly"
			return
		}
	} catch (error) {
		console.error("Error saving notes:", error)
		store.gameMessages.errorText = "Error saving notes"
	}
	store.viewSettings.showLoader = false
}

export async function resign() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	try {
		const response = await fetch("/URR/processURRturn/", {
			method: "POST",
			body: JSON.stringify({ gameID: personal.gameID, action: "resign", user: personal.name }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		await response.json()
	} catch (error) {
		console.error("Error resigning:", error)
		store.gameMessages.errorText = "Error resigning"
	}
	store.viewSettings.showLoader = false
}

export async function kickout() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	const kickedPlayerObj = controller.timedOutPlayerObj()
	try {
		const response = await fetch("/URR/processURRturn/", {
			method: "POST",
			body: JSON.stringify({ action: "kickout", gameID: personal.gameID, kickedName: kickedPlayerObj.name, latestUpdate: personal.latestUpdate }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		if (data.syncError) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		if (data.voteCast) {
			store.kickoutVotesData = data.votesData
			store.gameMessages.successText = "Kickout vote recorded"
			return data
		}
		personal.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		return data
	} catch (error) {
		console.error("Error kicking:", error)
		rf.doAdminAlrt("Error kicking player")
	} finally {
		store.viewSettings.showLoader = false
	}
}

export async function castVote(topic) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	try {
		const response = await fetch("/URR/castVote/", {
			method: "POST",
			body: JSON.stringify({ action: "castVote", topic: topic, gameID: personal.gameID }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		if (data.voteChanged === true) {
			if (topic === rf.DELETE_VOTE_TOPIC) {
				personal.votedToDelete = true
				store.deleteVotesData = JSON.parse(data.votesData)
				if (data.redirect_url) window.location.href = data.redirect_url
			} else if (topic === rf.STATS_EXCLUDE_VOTE_TOPIC) {
				personal.votedToExclude = true
				store.statsExcludeVotesData = JSON.parse(data.votesData)
			}
		} else store.gameMessages.errorText = "Error casting vote; contact admin"
	} catch (error) {
		console.error("Error casting vote:", error)
		store.gameMessages.errorText = "Error casting vote; contact admin"
	}
	store.viewSettings.showLoader = false
}

export async function checkForLatestData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	try {
		const response = await fetch("/URR/data/3/", {
			method: "POST",
			body: JSON.stringify({ gameID: personal.gameID, latestUpdate: personal.latestUpdate }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		if (data.gameDoesNotExist === true) {
			location.reload()
			return
		}
		if (data.latest === true) return
		model.importGameData(data.gameData)
		model.rebuildTurnOrder()
		personal.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		window.initData.latestUpdate = data.latestUpdate
		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error checking for latest data:", error)
	}
}

export async function submitBug(bugContent) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	try {
		const response = await fetch("/URR/bugEntry/", {
			method: "POST",
			body: JSON.stringify({ gameID: personal.gameID, action: "bugentry", description: bugContent, gameData: JSON.stringify(model.exportGameData()) }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		if (data.bugEntrySuccess) {
			store.gameMessages.successText = "Your bug report has been submitted"
			store.viewSettings.showBug = false
		} else store.gameMessages.bugErrorText = "Sorry, there was a problem. Please email the webmaster directly"
	} catch (error) {
		console.error("Error submitting bug:", error)
		store.gameMessages.bugErrorText = "Sorry, there was a problem. Please email the webmaster directly"
	}
	store.viewSettings.showLoader = false
}

export async function loadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	try {
		const response = await fetch("/URR/processURRturn/", {
			method: "POST",
			body: JSON.stringify({ action: "loadRewind", gameID: personal.gameID, latestUpdate: personal.latestUpdate }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		if (data.syncError) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		if (data.errorMessage) {
			store.gameMessages.errorText = data.errorMessage
			return
		}
		model.importGameData(data.gameData)
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		await updateDataFromLoadRewind()
		store.gameMessages.successText = "Game loaded from rewind"
	} catch (error) {
		console.error("Error rewinding:", error)
		store.gameMessages.errorText = "Error rewinding the game"
	} finally {
		store.viewSettings.showLoader = false
		store.viewSettings.performingRewind = false
	}
}

async function updateDataFromLoadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const { allIsCurrentPlayers, allRemainingPlayersInTurnOrder } = getNextCurrentPlayers()
	try {
		const response = await fetch("/URR/processURRturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "updateDataFromLoadRewind",
				turn: store.gameflow.turn,
				allIsCurrentPlayers: allIsCurrentPlayers,
				allRemainingPlayersInTurnOrder: allRemainingPlayersInTurnOrder,
				gameID: personal.gameID,
				phase: store.gameflow.phase,
				gameDataCompressed: funcs.compressData64(model.exportGameData()),
			}),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		if (personal.liveWS) WS.broadcastGameUpdate()
		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error updating after rewind:", error)
	}
}
