import * as funcs from "../js/BUSfuncs.js"
import * as WS from "./BUSwebsocket"
import * as Bot from "../js/BUSbot"
import * as rf from "../js/BUSreference.js"
import * as controller from "../js/BUScontroller.js"

import { useModelStore } from "../stores/BUSstore.js"
import * as model from "../js/BUSmodel.js"

import { usePersonalStore } from "../stores/BUSpersonal.js"

export const SPLOTTER_CON_USERS = ["admin", "DodgerB", "agundlachi", "pgh_gamer", "cheen"]

export async function saveGame(saveRewind) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket() 
	}

	store.topMenuViews.showLoader = true

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
	}
	if (store.gameflow.turnOrder.length > 0) postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name]
	// USED > goes to currentPlayers
	else {
		if (store.gameflow.gameEnded === 0) alert("ZERO TO LENGTH")
		store.gameflow.turnOrder.push(0)
		postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name]
		postData.data = funcs.exportBUSmodel(false)
	}

	// GAME ENDED
	if (store.gameflow.gameEnded > 0) {
		postData.status = "FINISHED" // USED
		postData.winner = model.getWinnerName()[0] // USED
		postData.saveRewind = false
		let finalPositions = [...store.players]
		let cmp = (a, b) => (a > b) - (a < b)
		finalPositions.sort(function (a, b) {
			return cmp(b.score, a.score) || cmp(b.timeStones, a.timeStones)
		})
		let finalPositionsNames = []
		for (let i = 0; i < finalPositions.length; i++) finalPositionsNames.push(finalPositions[i].name)
		postData.finalPositions = finalPositionsNames
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
			alert("It appears you have an older version of the game. Please refresh the page")
			return
		}
		personal.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout

		store.topMenuViews.showLoader = false
		controller.startPlayerTurn()

		WS.broadcastGameUpdate(wsConnecting)
	} catch (error) {
		console.error("Error fetching data:", error)
		alert("Error saving the game")
	}
}

export async function sendChatMessage(newEntry) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.topMenuViews.showLoader = true

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
			alert("Sorry, there was a problem. Please email the webmaster directly")
			return
		}
		store.chatData = funcs.decompressChatData(data.chatData)
		if (personal.liveWS) WS.BUSwebSocket.send("NEWCHATTS" + String(personal.gameID)) //+ String(result.latestUpdate));
		store.topMenuViews.showLoader = false
	} catch (error) {
		console.error("Error sending chat:", error)
		alert("Error sending chat message")
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
		store.topMenuViews.showLoader = false
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
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (!data.notePosted) {
			alert("Sorry, there was a problem. Please email the webmaster directly")
			return
		}

		store.topMenuViews.showLoader = false
	} catch (error) {
		console.error("Error saving Notes:", error)
		alert("Error saving Notes")
	}
}

export async function loadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	if (store.gameflow.gameEnded > 0) {
		store.rewindErrorText = "Error: Game Ended"
		store.performingRewind = false
		store.topMenuViews.showLoader = false
		return
	}
	if (store.topMenuViews.showReplay) {
		store.rewindErrorText = "Error: Exit Replay Mode First"
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
			alert("It appears you have an older version of the game. Please refresh the page")
			store.performingRewind = false
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
						store.players[j].displayName = "BusBot"
						store.players[j].score = 0
					}
				}
			}

			// Send back to DB with another save
			updateDataFromLoadRewind()
		}
		store.topMenuViews.showLoader = false
	} catch (error) {
		console.error("Error rewinding data:", error)
		alert("Error rewinding the game")
		store.performingRewind = false
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
		store.topMenuViews.showLoader = false
		store.performingRewind = false
		Bot.actionAnyBotMooves()
		store.resetVarsOnTurnEnd()
		controller.startPlayerTurn()

		// BroadcasT UpDATE
		WS.broadcastGameUpdate(wsConnecting)
	} catch (error) {
		console.error("Error updating data:", error)
		alert("Error updating the game")
		store.performingRewind = false
		controller.startPlayerTurn()
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
		Bot.actionResign()
		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error resiging:", error)
		alert("Error Resigning")
	}
}

export async function saveGameDataAfterKickout() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.topMenuViews.showLoader = true
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
			alert("It appears you have an older version of the game. Please refresh the page")
			return
		}
		personal.latestUpdate = data.latestUpdate
		// Now set the game to the next state
		// Count non players and end game if only 1 left
		var nbNonPlayers = 0
		for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === "BusBot") nbNonPlayers++

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
		alert("Error Kicking")
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
			store.rewindErrorText = "Error; Contact Admin"
			throw new Error("Network response was not ok")
		}
		const data = await response.json()

		store.topMenuViews.showLoader = false
		if (data.voteChanged === true) {
			store.successText = "Vote Saved"

			if (topic === rf.DELETE_VOTE_TOPIC) {
				personal.votedToDelete = true
				store.deleteVotesData = JSON.parse(data.votesData)
				if (data.redirect_url) window.location.href = data.redirect_url
			} else if (topic === rf.STATS_EXCLUDE_VOTE_TOPIC) {
				personal.votedToExclude = true
				store.statsExcludeVotesData = JSON.parse(data.votesData)
			}
		} else store.rewindErrorText = "Error; Contact Admin"
	} catch (error) {
		console.error("Error fetching data:", error)
		store.rewindErrorText = "Error; Contact Admin"
		return false
	}
}
