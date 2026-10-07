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
	if (store.gameflow.turnOrder.length > 0) {
		const currentPlayer = store.players[store.gameflow.turnOrder[0]]
		// One remaining player persists bot moves so concurrent clients do not race.
		const actingPlayer = currentPlayer.isMissing ? store.players[controller.botTurnPlayerIndex()] : currentPlayer
		if (!actingPlayer) throw new Error("No active player remains to continue this game")
		allIsCurrentPlayers.push(actingPlayer.name)
	}
	const allRemainingPlayersInTurnOrder = store.gameflow.turnOrder.filter(idx => !store.players[idx].isMissing).map((idx) => store.players[idx].name)
	return { allIsCurrentPlayers, allRemainingPlayersInTurnOrder }
}

export async function saveGame(saveRewind = true) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) wsConnecting = WS.StartWebSocket()

	personal.haltPlay = true
	store.viewSettings.isSaving = true

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
			return false
		}
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout

		if (personal.liveWS) WS.broadcastGameUpdate(wsConnecting)

		personal.haltPlay = false
		controller.startPlayerTurn()
		return true
	} catch (error) {
		console.error("Error saving game:", error)
		store.gameMessages.errorText = "Unable to confirm that the move was saved. Refresh the page before playing again."
		return false
	} finally {
		store.viewSettings.isSaving = false
		if (!personal.haltPlay) WS.refreshPendingGameUpdate()
	}
}

export async function sendChatMessage(newEntry) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.isSendingChat = true
	store.gameMessages.chatErrorText = ""
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
		return true
	} catch (error) {
		console.error("Error sending chat:", error)
		store.gameMessages.chatErrorText = "Error sending chat message"
		return false
	} finally {
		store.viewSettings.isSendingChat = false
	}
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
	if (store.viewSettings.showReplay || store.viewSettings.isSaving || store.viewSettings.performingRewind) return
	const requestedUpdate = personal.latestUpdate
	store.viewSettings.showLoader = true
	try {
		const response = await fetch("/URR/data/1/", {
			method: "POST",
			body: JSON.stringify({ gameID: personal.gameID }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		if (store.viewSettings.showReplay || store.viewSettings.isSaving || store.viewSettings.performingRewind || personal.latestUpdate !== requestedUpdate) return
		updateKickoutData(data)
		model.importGameData(data.gameData)
		model.setMissingPlayers(data.missingPlayers)
		model.rebuildTurnOrder()
		personal.secondsToNextKickout = data.secondsToNextKickout
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
	} catch (error) {
		console.error("Error fetching game data:", error)
	} finally {
		store.viewSettings.showLoader = false
	}
}

export async function saveNotes() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.isSavingNotes = true
	store.gameMessages.notesErrorText = ""
	try {
		const response = await fetch("/URR/saveNotesURR/", {
			method: "POST",
			body: JSON.stringify({ action: "saveNotes", player: personal.name, gameID: personal.gameID, notes: funcs.htmlEscape(personal.notes) }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		const data = await response.json()
		if (data.error) {
			store.gameMessages.notesErrorText = data.error
			return
		}
		if (!response.ok) throw new Error("Network response was not ok")
		if (!data.notePosted) {
			store.gameMessages.notesErrorText = "Sorry, there was a problem. Please email the webmaster directly"
			return
		}
	} catch (error) {
		console.error("Error saving notes:", error)
		store.gameMessages.notesErrorText = "Error saving notes"
	} finally {
		store.viewSettings.isSavingNotes = false
	}
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
		return true
	} catch (error) {
		console.error("Error resigning:", error)
		store.gameMessages.errorText = "Error resigning"
		return false
	} finally {
		store.viewSettings.showLoader = false
	}
}

function updateKickoutData(data) {
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.kickoutRequired = data.kickoutRequired
	personal.kickoutFlexiData = data.KickoutFlexiDataArray
	personal.kickoutSecondsRemaining = data.secondsToNextKickout
	personal.kickoutTimerUpdatedAt = Date.now()
	store.kickoutVotesData = data.kickoutVotesData
	store.kickoutVoteThreshold = data.kickoutVoteThreshold
	model.setMissingPlayers(data.missingPlayers)
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
		const data = await response.json()
		if (!response.ok) throw new Error(data.error || "Unable to kick out player")
		if (data.syncError) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		if (data.voteCast) {
			store.kickoutVotesData = JSON.parse(data.votesData)
			store.kickoutVoteThreshold = data.threshold
			store.gameMessages.successText = "Kickout vote recorded"
			return data
		}
		personal.kickoutRequired = 0
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		model.setMissingPlayers(data.missingPlayers)
		// Save the abandoned seat without creating a rewind across the kickout.
		if (!await saveGame(false)) return
		return data
	} catch (error) {
		console.error("Error kicking:", error)
		store.gameMessages.errorText = error.message
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
	if (store.viewSettings.showReplay || store.viewSettings.isSaving || store.viewSettings.performingRewind) return
	const requestedUpdate = personal.latestUpdate
	try {
		const response = await fetch("/URR/data/3/", {
			method: "POST",
			body: JSON.stringify({ gameID: personal.gameID, latestUpdate: personal.latestUpdate }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		if (store.viewSettings.showReplay || store.viewSettings.isSaving || store.viewSettings.performingRewind || personal.latestUpdate !== requestedUpdate) return
		if (data.gameDoesNotExist === true) {
			location.reload()
			return
		}
		updateKickoutData(data)
		if (data.latest === true) return
		model.importGameData(data.gameData)
		model.setMissingPlayers(data.missingPlayers)
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
	if (store.turnDraft.start) {
		store.gameMessages.errorText = "Reset your uncommitted turn before rewinding a saved turn."
		return
	}
	if (store.viewSettings.performingRewind || store.viewSettings.showLoader || store.viewSettings.isSaving || store.viewSettings.showReplay) return
	if (!window.confirm("Rewind the previous saved turn? This will undo that turn for all players.")) return
	const personal = usePersonalStore()
	const wasHalted = personal.haltPlay
	personal.haltPlay = true
	store.viewSettings.performingRewind = true
	store.viewSettings.showLoader = true
	store.gameMessages.errorText = ""
	store.gameMessages.successText = ""
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
			personal.haltPlay = wasHalted
			return
		}
		model.importGameData(data.gameData)
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		if (await updateDataFromLoadRewind()) {
			store.gameMessages.successText = "Game loaded from rewind"
			store.viewSettings.showRewindPanel = false
		}
	} catch (error) {
		console.error("Error rewinding:", error)
		store.gameMessages.errorText = "Unable to confirm the rewind. Refresh the page before playing again."
	} finally {
		store.viewSettings.showLoader = false
		store.viewSettings.performingRewind = false
		if (!personal.haltPlay) WS.refreshPendingGameUpdate()
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
		return true
	} catch (error) {
		console.error("Error updating after rewind:", error)
		personal.haltPlay = true
		store.gameMessages.errorText = "Unable to confirm the rewound game. Refresh the page before playing again."
		return false
	}
}
