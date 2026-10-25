import * as funcs from "../js/BUSfuncs.js"
import * as WS from "./BUSwebsocket"
import * as Bot from "../js/BUSbot"
import * as rf from "../js/BUSreference.js"
import * as controller from "../js/BUScontroller.js"

import { useModelStore } from "../stores/BUSstore.js"
import * as model from "../js/BUSmodel.js"

import { usePersonalStore } from "../stores/BUSpersonal.js"

import i18n from "../i18n"

export const SPLOTTER_CON_USERS = ["admin", "DodgerB", "agundlachi", "pgh_gamer", "cheen"]

function clearLoader() {
	const store = useModelStore()
	store.topMenuViews.showLoader = false
	store.topMenuViews.retryAction = null
	store.topMenuViews.errorText = ""
}

// Keep the loader up on failure, show the reason and offer a retry.
function failLoader(retry, message) {
	const store = useModelStore()
	store.topMenuViews.showLoader = true
	store.topMenuViews.retryAction = retry
	store.topMenuViews.errorText = message
}

export async function saveGame(saveRewind) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket()
	}

	store.topMenuViews.showLoader = true
	store.topMenuViews.retryAction = null
	store.topMenuViews.errorText = ""

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let postData = {
		action: "save", // USED
		latestUpdate: personal.latestUpdate, // USED
		data: funcs.exportBUSmodel(false),
		turn: store.gameflow.turn, // USED
		phase: store.gameflow.phase, // USED
		status: "ACTIVE", // USED - only if FINISHED
		gameID: personal.gameID, // USED
		saveRewind: saveRewind,
		nextPlayer: [], // USED > goes to currentPlayers
	}
	if (store.gameflow.turnOrder.length > 0) postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name]
	else if (store.gameflow.gameEnded === 0) {
		alert(i18n.global.t("io.zeroToLength"))
		store.gameflow.turnOrder.push(0)
		postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name]
		postData.data = funcs.exportBUSmodel(false)
	}

	// GAME ENDED
	if (store.gameflow.gameEnded > 0) {
		postData.status = "FINISHED" // USED
		const finalRanking = model.getFinalRanking()
		postData.winner = finalRanking.length > 0 ? finalRanking[0].name : undefined // server expects a username
		postData.saveRewind = false
		postData.finalPositions = finalRanking.map((player) => player.name)
		postData.data = funcs.exportBUSmodel(true)
	}
	if (personal.removeCurrentFlexTime) {
		personal.removeCurrentFlexTime = false
		postData.checkName = personal.removeCurrentFlexTimeName
		personal.removeCurrentFlexTimeName = ""
	}

	try {
		const response = await fetch("/BUS/processBUSturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.syncError) {
			failLoader(() => saveGame(saveRewind), i18n.global.t("io.olderVersion"))
			return
		}
		personal.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout

		clearLoader()
		controller.startPlayerTurn()

		WS.broadcastGameUpdate(wsConnecting)
	} catch (error) {
		console.error("Error fetching data:", error)
		failLoader(() => saveGame(saveRewind), i18n.global.t("io.saveError"))
	}
}

export async function sendChatMessage(newEntry) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.topMenuViews.showLoader = true
	store.topMenuViews.retryAction = null
	store.topMenuViews.errorText = ""

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/BUS/sendChatMessage/", {
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
			failLoader(() => sendChatMessage(newEntry), i18n.global.t("io.webmasterProblem"))
			return
		}
		store.chatData = funcs.decompressChatData(data.chatData)
		if (personal.liveWS) WS.BUSwebSocket.send("NEWCHATTS" + String(personal.gameID)) //+ String(result.latestUpdate));
		clearLoader()
	} catch (error) {
		console.error("Error sending chat:", error)
		failLoader(() => sendChatMessage(newEntry), i18n.global.t("io.chatError"))
	}
}

export async function saveBoardPreference(boardNumber) {
	const personal = usePersonalStore()

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/BUS/changeBUSviewport/", {
			method: "PUT",
			body: JSON.stringify({
				action: "saveBoardPreference",
				playerNumber: personal.pov,
				gameID: personal.gameID,
				boardNumber: boardNumber,
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
		//const data = await response.json()
	} catch (error) {
		console.error("Error zooming:", error)
	}
}

export async function reloadGameData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")
	store.topMenuViews.showLoader = true
	store.topMenuViews.retryAction = null
	store.topMenuViews.errorText = ""

	// Function to fetch data from the database
	try {
		const response = await fetch("/BUS/data/2/", {
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
		if (data.finishedGame) personal.finishedGame = true
		funcs.importBUSmodel(data.gameData, personal.finishedGame, false)
		personal.secondsToNextKickout = data.secondsToNextKickout
		personal.latestUpdate = data.latestUpdate
		clearLoader()
		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error fetching data:", error)
		failLoader(() => reloadGameData(), i18n.global.t("io.updateError"))
	}
}

export async function reloadChatData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")

	// Function to fetch data from the database
	try {
		const response = await fetch("/BUS/data/3/", {
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
		if (data.gameDoesNotExist === true) location.reload()

		store.chatData = funcs.decompressChatData(data.chatData)
		if (!personal.inhibitChatPopup) store.topMenuViews.showChat = true
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

export async function saveNotes() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.topMenuViews.showLoader = true
	store.topMenuViews.errorText = ""
	store.topMenuViews.retryAction = null

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/BUS/saveNotes/", {
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
			failLoader(() => saveNotes(), data.error)
			return
		}
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		if (!data.notePosted) {
			failLoader(() => saveNotes(), i18n.global.t("io.webmasterProblem"))
			return
		}

		clearLoader()
	} catch (error) {
		console.error("Error saving Notes:", error)
		failLoader(() => saveNotes(), i18n.global.t("io.saveNotesError"))
	}
}

export async function loadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.topMenuViews.showLoader = true
	store.topMenuViews.retryAction = null
	store.topMenuViews.errorText = ""
	let csrftoken = funcs.getCookie("csrftoken")

	if (store.gameflow.gameEnded > 0) {
		store.rewindErrorText = i18n.global.t("io.rewindGameEnded")
		store.performingRewind = false
		store.topMenuViews.showLoader = false
		return
	}
	if (store.topMenuViews.showReplay) {
		store.rewindErrorText = i18n.global.t("io.rewindExitReplay")
		store.performingRewind = false
		store.topMenuViews.showLoader = false
		return
	}

	try {
		const response = await fetch("/BUS/processBUSturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "loadRewind",
				gameID: personal.gameID,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.syncError) {
			store.performingRewind = false
			failLoader(() => loadRewind(), i18n.global.t("io.olderVersion"))
			return
		}
		personal.latestUpdate = data.latestUpdate
		// Hide the dropdown
		if (data.errorMessage) {
			store.rewindErrorText = data.errorMessage
			store.performingRewind = false
			controller.startPlayerTurn()
		} else {
			funcs.importBUSmodel(data.gameData, false, false)

			store.history.push([rf.HIST_REWIND, personal.pov, Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), []])

			// Re kick booted players
			for (let i = 0; i < data.missingPlayers.length; i++) {
				for (let j = 0; j < store.players.length; j++) {
					if (store.players[j].name == data.missingPlayers[i]) {
						store.players[j].displayName = rf.BOT_NAME
						store.players[j].score = 0
					}
				}
			}

			// Send back to DB with another save
			updateDataFromLoadRewind()
		}
		clearLoader()
	} catch (error) {
		console.error("Error rewinding data:", error)
		store.performingRewind = false
		failLoader(() => loadRewind(), i18n.global.t("io.rewindError"))
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
	store.topMenuViews.retryAction = null
	store.topMenuViews.errorText = ""
	let csrftoken = funcs.getCookie("csrftoken")
	// IF AT THE END OF NON-SIMUL PHASE, SET UP NEXT PLAYER

	try {
		const response = await fetch("/BUS/processBUSturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "updateDataFromLoadRewind",
				turn: store.gameflow.turn,
				nextPlayer: [store.players[store.gameflow.turnOrder[0]].name], // USED > goes to currentPlayers
				gameID: personal.gameID,
				phase: store.gameflow.phase,
				gameData: funcs.exportBUSmodel(false),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		personal.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		clearLoader()
		store.performingRewind = false
		Bot.actionAnyBotMooves()
		store.resetVarsOnTurnEnd()
		controller.startPlayerTurn()

		// BroadcasT UpDATE
		WS.broadcastGameUpdate(wsConnecting)
	} catch (error) {
		console.error("Error updating data:", error)
		store.performingRewind = false
		controller.startPlayerTurn()
		failLoader(() => updateDataFromLoadRewind(), i18n.global.t("io.updateError"))
	}
}

export async function resign() {
	/* ONLY GET HERE DURING ACTION SELECTION IF NOT LAST PERSON */
	const store = useModelStore()
	const personal = usePersonalStore()

	// Add history, and remove player
	store.history.push([rf.HIST_RESIGN, store.gameflow.turnOrder[0], Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), []])
	store.resetVarsOnTurnEnd()
	store.gameflow.turnOrder.shift()

	store.topMenuViews.showLoader = true
	store.topMenuViews.retryAction = null
	store.topMenuViews.errorText = ""
	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/BUS/processBUSturn/", {
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
		clearLoader()
		Bot.actionResign()
		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error resiging:", error)
		failLoader(() => reloadGameData(), i18n.global.t("io.resignError"))
	}
}

export async function saveGameDataAfterKickout() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.topMenuViews.showLoader = true
	store.topMenuViews.retryAction = null
	store.topMenuViews.errorText = ""
	let csrftoken = funcs.getCookie("csrftoken")

	var postData = {
		action: "saveGameDataAfterKickout",
		gameID: personal.gameID,
		kickedName: store.players[store.gameflow.turnOrder[0]].name,
		latestUpdate: personal.latestUpdate,
	}

	try {
		const response = await fetch("/BUS/processBUSturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.syncError) {
			failLoader(() => reloadGameData(), i18n.global.t("io.olderVersion"))
			return
		}
		if (data.voteCast) {
			store.kickoutVotesData = data.votesData
			clearLoader()
			store.successText = i18n.global.t("io.kickoutVoteRecorded")
			return data
		}
		personal.latestUpdate = data.latestUpdate
		// Now set the game to the next state
		// Count non players and end game if only 1 left
		var nbNonPlayers = 0
		for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++

		if (nbNonPlayers >= store.players.length - 1) {
			// Only 1 player left, so end game
			store.gameflow.phase = rf.PHASE_GAME_OVER
			store.gameflow.gameEnded = 4
			model.endGame()
			saveGame(false)
			return
		} else {
			Bot.actionAnyBotMooves()
			saveGame(true)
			controller.startPlayerTurn()
		}
	} catch (error) {
		console.error("Error kicking:", error)
		failLoader(() => reloadGameData(), i18n.global.t("io.kickError"))
	}
}

export async function saveZoom(zoomLevel) {
	//const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/BUS/changeBUSviewport/", {
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

	store.topMenuViews.showLoader = true
	store.topMenuViews.retryAction = null
	store.topMenuViews.errorText = ""
	let csrftoken = funcs.getCookie("csrftoken")

	let postData = {
		action: "castVote", // USED
		topic: topic, // USED
		gameID: personal.gameID, // USED
	}

	try {
		const response = await fetch("/BUS/castVote/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			store.rewindErrorText = i18n.global.t("io.contactAdmin")
			throw new Error("Network response was not ok")
		}
		const data = await response.json()

		clearLoader()
		if (data.voteChanged === true) {
			store.successText = i18n.global.t("io.voteSaved")

			if (topic === rf.DELETE_VOTE_TOPIC) {
				personal.votedToDelete = true
				store.deleteVotesData = JSON.parse(data.votesData)
				if (data.redirect_url) window.location.href = data.redirect_url
			} else if (topic === rf.STATS_EXCLUDE_VOTE_TOPIC) {
				personal.votedToExclude = true
				store.statsExcludeVotesData = JSON.parse(data.votesData)
			}
		} else store.rewindErrorText = i18n.global.t("io.contactAdmin")
	} catch (error) {
		console.error("Error fetching data:", error)
		failLoader(() => castVote(topic), i18n.global.t("io.contactAdmin"))
		return false
	}
}
