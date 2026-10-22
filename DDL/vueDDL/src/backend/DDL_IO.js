/**
 * All communication with the Django backend for Duck Dealer.
 */

import * as funcs from "../js/DDLfuncs.js"
import * as rf from "../js/DDLreference.js"
import * as model from "../js/DDLmodel.js"
import * as controller from "../js/DDLcontroller.js"
import * as WS from "./DDLwebsocket.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"
import i18n from "../i18n.js"

const t = i18n.global.t

export async function sendDiscordWebhook(message) {
	const csrftoken = funcs.getCookie("csrftoken")
	fetch("/sendAdminMessage/", {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
		body: JSON.stringify({ message }),
	}).catch((error) => console.error("Error sending webhook:", error))
}

export function getNextCurrentPlayers() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!store.players.length || !store.gameflow.turnOrder.length) {
		return { allIsCurrentPlayers: [], allRemainingPlayersInTurnOrder: [], pendingPlayersArr: [] }
	}
	const allRemainingPlayersInTurnOrder = store.gameflow.turnOrder.map((idx) => store.players[idx].name)
	const allIsCurrentPlayers = [allRemainingPlayersInTurnOrder[0]]
	return { allIsCurrentPlayers, allRemainingPlayersInTurnOrder, pendingPlayersArr: [] }
}

function buildTournamentData() {
	const store = useModelStore()
	const groups = store.gameflow.finalPositions
	const result = []
	for (let i = 0; i < groups.length; i++) {
		for (const idx of groups[i]) {
			result.push(i === 0 ? [store.players[idx].name] : [store.players[idx].name, store.gameflow.tournamentScores?.[idx] ?? store.players[idx].score])
		}
	}
	return result
}

export async function saveGame(saveRewind = true, options = {}) {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.haltPlay) return
	let wsConnecting = null
	if (personal.liveWS) wsConnecting = WS.StartWebSocket()

	personal.haltPlay = true
	store.viewSettings.showLoader = true

	const { allIsCurrentPlayers, allRemainingPlayersInTurnOrder, pendingPlayersArr } = getNextCurrentPlayers()

	const postData = {
		action: "saveGame",
		latestUpdate: personal.latestUpdate,
		gameData: model.exportGameData(),
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		saveRewind: saveRewind,
		allIsCurrentPlayers,
		allRemainingPlayersInTurnOrder,
		pendingPlayersArr,
		noNotify: options.noNotify === true,
	}

	if (options.checkName) postData.checkName = options.checkName
	if (personal.removeCurrentFlexTime && personal.removeCurrentFlexTimeName) {
		postData.checkName = personal.removeCurrentFlexTimeName
	}

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		postData.status = "FINISHED"
		postData.saveRewind = false
		postData.winnerUsername = store.gameflow.winnerNames
		postData.finalPositions = store.gameflow.finalPositions
		postData.tournamentData = buildTournamentData()
	}

	try {
		const response = await fetch("/DDL/processDDLturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		if (data.syncError === true) {
			store.gameMessages.errorText = t("errors.staleVersion")
			store.viewSettings.showLoader = false
			personal.haltPlay = false
			return
		}
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		if (personal.liveWS) WS.broadcastGameUpdate(wsConnecting)
		store.viewSettings.showLoader = false
		personal.haltPlay = false
		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error saving game:", error)
		store.gameMessages.errorText = t("errors.saveGame")
		store.viewSettings.showLoader = false
		personal.haltPlay = false
	}
}

export async function saveBid(bid, round = 1, tiedPlayers = []) {
	const personal = usePersonalStore()
	try {
		const response = await fetch("/DDL/processDDLturn/", {
			method: "POST",
			body: JSON.stringify({ action: "saveBid", gameID: personal.gameID, bid, round, tiedPlayers }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		return await response.json()
	} catch (error) {
		console.error("Error saving bid:", error)
		return { ok: false, error: t("errors.couldNotSaveBid") }
	}
}

export async function getBids(round = 1, tiedPlayers = []) {
	const personal = usePersonalStore()
	try {
		const response = await fetch("/DDL/processDDLturn/", {
			method: "POST",
			body: JSON.stringify({ action: "getBids", gameID: personal.gameID, round, tiedPlayers }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		return await response.json()
	} catch (error) {
		console.error("Error getting bids:", error)
		return { ready: false }
	}
}

export async function sendChatMessage(newEntry) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	try {
		const response = await fetch("/DDL/sendChatMessageDDL/", {
			method: "POST",
			body: JSON.stringify({ action: "sendChatMessage", player: personal.name, gameID: personal.gameID, newEntry }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		store.chatData = funcs.decompressChatData(data.chatData, personal.gameCreationTimestamp)
		if (personal.liveWS) WS.broadcastChatUpdate()
	} catch (error) {
		console.error("Error sending chat:", error)
		store.gameMessages.errorText = t("errors.sendChat")
	}
	store.viewSettings.showLoader = false
}

export async function reloadChatData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	try {
		const response = await fetch("/DDL/data/2/", {
			method: "POST",
			body: JSON.stringify({ gameID: personal.gameID }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		store.chatData = funcs.decompressChatData(data.chatData, personal.gameCreationTimestamp)
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
		const response = await fetch("/DDL/data/1/", {
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
		const response = await fetch("/DDL/saveNotesDDL/", {
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
			store.gameMessages.errorText = t("errors.webmaster")
			return
		}
	} catch (error) {
		console.error("Error saving notes:", error)
		store.gameMessages.errorText = t("errors.saveNotes")
	}
	store.viewSettings.showLoader = false
}

export async function resign() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	try {
		const response = await fetch("/DDL/processDDLturn/", {
			method: "POST",
			body: JSON.stringify({ gameID: personal.gameID, action: "resign", user: personal.name }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		await response.json()
	} catch (error) {
		console.error("Error resigning:", error)
		store.gameMessages.errorText = t("errors.resigning")
	}
	store.viewSettings.showLoader = false
}

export async function kickout() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	const kickedPlayerObj = controller.currentPlayerObj()
	try {
		const response = await fetch("/DDL/processDDLturn/", {
			method: "POST",
			body: JSON.stringify({ action: "kickout", gameID: personal.gameID, kickedName: kickedPlayerObj.name, latestUpdate: personal.latestUpdate }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		if (data.syncError) {
			store.gameMessages.errorText = t("errors.staleVersion")
			return
		}
		if (data.voteCast) {
			store.kickoutVotesData = data.votesData
			store.gameMessages.successText = t("messages.kickoutVote")
			return data
		}
		personal.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		return data
	} catch (error) {
		console.error("Error kicking:", error)
		rf.doAdminAlrt(t("errors.kicking"))
	} finally {
		store.viewSettings.showLoader = false
	}
}

export async function castVote(topic) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	try {
		const response = await fetch("/DDL/castVote/", {
			method: "POST",
			body: JSON.stringify({ action: "castVote", topic, gameID: personal.gameID }),
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
		} else store.gameMessages.errorText = t("errors.castingVote")
	} catch (error) {
		console.error("Error casting vote:", error)
		store.gameMessages.errorText = t("errors.castingVote")
	}
	store.viewSettings.showLoader = false
}

export async function checkForLatestData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	try {
		const response = await fetch("/DDL/data/3/", {
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
		const response = await fetch("/DDL/bugEntry/", {
			method: "POST",
			body: JSON.stringify({ gameID: personal.gameID, action: "bugentry", description: bugContent, gameData: model.exportGameData() }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		if (data.bugEntrySuccess) {
			store.gameMessages.successText = t("messages.bugSubmitted")
			store.viewSettings.showBug = false
		} else store.gameMessages.bugErrorText = t("errors.webmaster")
	} catch (error) {
		console.error("Error submitting bug:", error)
		store.gameMessages.bugErrorText = t("errors.webmaster")
	}
	store.viewSettings.showLoader = false
}

export async function loadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	try {
		const response = await fetch("/DDL/processDDLturn/", {
			method: "POST",
			body: JSON.stringify({ action: "loadRewind", gameID: personal.gameID, latestUpdate: personal.latestUpdate }),
			headers: { "X-CSRFToken": funcs.getCookie("csrftoken") },
		})
		if (!response.ok) throw new Error("Network response was not ok")
		const data = await response.json()
		if (data.syncError) {
			store.gameMessages.errorText = t("errors.staleVersion")
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
		store.gameMessages.successText = t("messages.rewindLoaded")
	} catch (error) {
		console.error("Error rewinding:", error)
		store.gameMessages.errorText = t("errors.rewind")
	} finally {
		store.viewSettings.showLoader = false
		store.viewSettings.performingRewind = false
	}
}

async function updateDataFromLoadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const { allIsCurrentPlayers, allRemainingPlayersInTurnOrder, pendingPlayersArr } = getNextCurrentPlayers()
	try {
		const response = await fetch("/DDL/processDDLturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "updateDataFromLoadRewind",
				turn: store.gameflow.turn,
				allIsCurrentPlayers,
				allRemainingPlayersInTurnOrder,
				pendingPlayersArr,
				gameID: personal.gameID,
				phase: store.gameflow.phase,
				gameData: model.exportGameData(),
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
