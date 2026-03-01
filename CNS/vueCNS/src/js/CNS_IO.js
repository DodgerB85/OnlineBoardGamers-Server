import * as funcs from "./CNSfuncs"
import * as WS from "./CNSwebsocket"
import * as controller from "./CNScontroller"
import * as rf from "./CNSreference"
import * as model from "./CNSmodel"
import * as Bot from "./CNSbot"

import { useModelStore } from "../stores/CNSstore.js"

import { usePersonalStore } from "../stores/CNSpersonal.js"

export async function submitBug(bugContent) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true
	var csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/CNS/bugEntry/", {
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

export async function saveGame(saveRewind, saveContext) {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true
	store.topMenuViews.showLoader = true

	if (personal.liveWS && WS.CNSwebSocket && WS.CNSwebSocket.readyState !== 1) {
		await WS.StartWebSocket()
		await funcs.sleep(2000)
	}

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let exportData = funcs.exportModel(false)
	if (saveContext) exportData = funcs.exportModel(true)

	let postData = {
		action: "save",
		latestUpdate: personal.latestUpdate,
		data: exportData,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		saveRewind: saveRewind,
	}
	if (store.gameflow.turnOrder.length > 0) postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name]
	// USED > goes to currentPlayers
	else {
		// THIS IS JUST AN EMERGENCY CHECK ??
		store.gameflow.turnOrder.push(0)
		postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name]
		alert("RE-EXPORT")
		postData.data = funcs.exportModel()
	}
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		postData.status = "FINISHED" // USED
		let finalRes = model.endGame_core()
		postData.winner = store.players[finalRes[0][0]].name // USED
		postData.saveRewind = false

		let finalPositionsNames = []
		for (let i = 0; i < finalRes.length; i++) finalPositionsNames.push(store.players[finalRes[i][0]].name)
		postData.finalPositions = finalPositionsNames
	}

	if (personal.removeCurrentFlexTime) {
		personal.removeCurrentFlexTime = false
		postData.checkName = personal.removeCurrentFlexTimeName
		personal.removeCurrentFlexTimeName = ""
	}

	try {
		const response = await fetch("/CNS/processCNSturn/", {
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
			alert("It appears you have an older version of the game. Please refresh the page")
			return
		}
		personal.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout

		// Broadcast update
		if (WS.CNSwebSocket && WS.CNSwebSocket.readyState === 1) WS.CNSwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
		else if (WS.CNSwebSocket && personal.liveWS) {
			await WS.StartWebSocket()
			await funcs.sleep(2000)
			if (personal.liveWS && WS.CNSwebSocket.readyState === 1) WS.CNSwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
			else console.log("2xTO: " + WS.CNSwebSocket.readyState)
		}

		store.topMenuViews.showLoader = false
		personal.haltPlay = false
		controller.startPlayerTurn()
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
		const response = await fetch("/CNS/sendChatMessage/", {
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
		if (personal.liveWS) WS.CNSwebSocket.send("NEWCHATTS" + String(personal.gameID)) //+ String(result.latestUpdate));
		store.topMenuViews.showLoader = false
	} catch (error) {
		console.error("Error sending chat:", error)
		alert("Error sending chat message")
	}
}

export async function reloadGameData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")
	store.topMenuViews.showLoader = true

	// Function to fetch data from the database
	try {
		const response = await fetch("/CNS/data/1/", {
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
		const response = await fetch("/CNS/data/2/", {
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
		const response = await fetch("/CNS/saveNotes/", {
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

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		store.topMenuViews.rewindErrorText = "Error: Game Ended"
		store.topMenuViews.performingRewind = false
		store.topMenuViews.showLoader = false
		return
	}

	try {
		const response = await fetch("/CNS/processCNSturn/", {
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
			alert("It appears you have an older version of the game. Please refresh the page")
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
		store.topMenuViews.performingRewind = false
	}
}

async function updateDataFromLoadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")
	// IF AT THE END OF NON-SIMUL PHASE, SET UP NEXT PLAYER

	try {
		const response = await fetch("/CNS/processCNSturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "updateDataFromLoadRewind",
				turn: store.gameflow.turn,
				nextPlayer: [store.players[store.gameflow.turnOrder[0]].name], // USED > goes to currentPlayers
				gameID: personal.gameID,
				phase: store.gameflow.phase,
				gameData: funcs.exportModel(false),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		personal.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		if (WS.CNSwebSocket.readyState === 1) WS.CNSwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
		else if (personal.liveWS && WS.CNSwebSocket.readyState === 0) {
			funcs.sleepPause(1000)
			if (personal.liveWS && WS.CNSwebSocket.readyState === 1) WS.CNSwebSocket.send("NEWDATATS" + String(personal.gameID) + String(personal.latestUpdate))
		}
		store.topMenuViews.showLoader = false
		store.topMenuViews.performingRewind = false
		Bot.actionAnyBotMooves()
		if (store.gameflow.phase !== rf.PHASE_PRODUCTION && store.gameflow.phase !== rf.PHASE_MOVE_PIRATE) store.resetContext()
		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error updating data:", error)
		alert("Error updating the game")
		store.topMenuViews.performingRewind = false
		controller.startPlayerTurn()
	}
}

// Simply saves as a no kickout missing
export async function resign() {
	/* ONLY GET HERE WITH 0 HEX ACTIONS USED */
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/CNS/processCNSturn/", {
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
	} catch (error) {
		console.error("Error resiging:", error)
		alert("Error Resigning")
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
		const response = await fetch("/CNS/processCNSturn/", {
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
	} catch (error) {
		console.error("Error kicking:", error)
		alert("Error Kicking")
	}
}

export async function saveZoom() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let csrftoken = funcs.getCookie("csrftoken")

	let zoomLevel = store.refSize / 100

	if (store.topMenuViews.showWholeTable) zoomLevel++

	try {
		const response = await fetch("/CNS/changeCNSzoom/", {
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
		const response = await fetch("/CNS/data/3/", {
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
		if (data.latest === true) return
		else {
			funcs.importModel(data.gameData, false)
			personal.secondsToNextKickout = data.secondsToNextKickout
			personal.latestUpdate = data.latestUpdate
			store.topMenuViews.showLoader = false
			controller.startPlayerTurn()
		}
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

export async function submitStatsExcludeConsent() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let checkbox = document.querySelector("#checkStatsExclude")
	if (!checkbox || !checkbox.checked) {
		store.topMenuViews.rewindErrorText = "Please check the box first"
		return
	}
	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/CNS/processStatsExcludeConsent/", {
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json; charset=UTF-8",
				"X-CSRFToken": csrftoken,
			},
			body: JSON.stringify({
				playerNumber: personal.pov,
				gameID: personal.gameID,
			}),
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		personal.myStatsExcludeConsent = 1
		if (data.statsExcludedGame) personal.statsExcludedGame = true
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
		const response = await fetch("/CNS/castVote/", {
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
		console.log(data)
		if (data.voteChanged === true) {
			store.topMenuViews.tradeSuccessText = "Vote Saved"
			
			if (topic === rf.DELETE_VOTE_TOPIC) {
				personal.votedToDelete = true
				store.deleteVotesData = JSON.parse(data.votesData)
				if (data.redirect_url) window.location.href = data.redirect_url
			}
			else if (topic === rf.STATS_EXCLUDE_VOTE_TOPIC) {
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
