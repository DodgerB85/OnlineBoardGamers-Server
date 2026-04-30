import * as funcs from "./TGZfuncs"
import * as WS from "./TGZwebsocket"
import * as Bot from "./TGZbot"
import * as rf from "./TGZreference"
import * as controller from "./TGZcontroller"
import * as model from "./TGZmodel"
import * as history from "./TGZhistory"

import { useModelStore } from "../stores/TGZstore.js"

import { usePersonalStore } from "../stores/TGZpersonal.js"

export async function doSimpleSave() {
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.haltPlay = true
	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let postData = {
		action: "simpleSave", // USED
		latestUpdate: personal.latestUpdate, // USED
		data: funcs.exportModel(false),
		turn: store.gameflow.turn, // USED
		phase: store.gameflow.phase, // USED
		gameID: personal.gameID, // USED
		//saveRewind: global.saveRewind
	}
	if (window.initData.gameData === "") postData.mapTiles = [...store.mapTiles]

	try {
		const response = await fetch("/TGZ/processTGZturn/", {
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

		store.topMenuViews.showLoader = false
		personal.haltPlay = false
		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error fetching data:", error)
		alert("Error saving the game")
	}
}

export async function replaceExternalTournamentPlayer() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket() // No 'await'! Starts in background.
	}

	personal.haltPlay = true
	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let kickedName = controller.currentPlayerObj().name

	// Replace current player
	controller.currentPlayerObj().name = "TGZtourneyAdmin"
	controller.currentPlayerObj().displayName = "TGZtourneyAdmin"

	let postData = {
		action: "replaceExternalTournamentPlayer", // USED
		latestUpdate: personal.latestUpdate, // USED
		data: funcs.exportModel(false),
		gameID: personal.gameID, // USED
		kickedName: kickedName,
	}
	postData.nextPlayer = store.players[store.gameflow.turnOrder[0]].name // USED > goes to currentPlayers

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		alert("ERROR: Game over")
		return
	}

	try {
		const response = await fetch("/TGZ/processTGZturn/", {
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
		personal.haltPlay = false
		controller.startPlayerTurn()
		store.topMenuViews.rewindErrorText = "PLAYER REPLACED"
		WS.broadcastGameUpdate(wsConnecting)
	} catch (error) {
		console.error("Error fetching data:", error)
		alert("Error saving the game")
	}
}

export async function saveGame(saveRewind) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket() // No 'await'! Starts in background.
	}

	personal.haltPlay = true
	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate == undefined) personal.latestUpdate = "9999999999999"

	let postData = {
		action: "save", // USED
		latestUpdate: personal.latestUpdate, // USED
		data: funcs.exportModel(false),
		turn: store.gameflow.turn, // USED
		phase: store.gameflow.phase, // USED
		status: "ACTIVE", // USED - only if FINISHED
		gameID: personal.gameID, // USED
		saveRewind: saveRewind,
	}
	if (window.initData.gameData === "") postData.mapTiles = [...store.mapTiles]
	if (store.gameflow.turnOrder.length > 0)
		postData.nextPlayer = store.players[store.gameflow.turnOrder[0]].name // USED > goes to currentPlayers
	else {
		// THIS IS JUST AN EMERGENCY CHECK ??
		store.gameflow.turnOrder.push(0)
		postData.nextPlayer = store.players[store.gameflow.turnOrder[0]].name
		postData.data = funcs.exportModel()
	}
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		postData.status = "FINISHED" // USED
		let overshootObj = model.endGame_core()
		let tournamentData = []
		for (let i = 0; i < overshootObj.length; i++) tournamentData.push([overshootObj[i][1]])
		let winningPlayerObj = store.players[tournamentData[0][0]]
		let winningPlayerScore = model.getScore(tournamentData[0][0])
		let winningPlayerVR = model.getVR(winningPlayerObj)
		let winningPlayerDiffernce = winningPlayerVR - winningPlayerScore // THIS IS NEGATIVE OR 0
		// Don't need to add winners tie breaker
		for (let i = 1; i < tournamentData.length; i++) {
			let playerIndex = tournamentData[i][0]
			let playerScore = model.getScore(playerIndex)
			let playerVR = model.getVR(store.players[playerIndex])
			let playerDiffernce = playerScore - playerVR // How far behind / in front of your VR you are
			tournamentData[i].push(playerDiffernce + winningPlayerDiffernce)
		}
		// Now replace indexes with names
		for (let i = 0; i < tournamentData.length; i++) tournamentData[i][0] = store.players[tournamentData[i][0]].name

		postData.tournamentData = [...tournamentData]
		postData.winner = store.players[overshootObj[0][1]].name // USED
		postData.saveRewind = false

		let finalPositionsNames = []
		for (let i = 0; i < overshootObj.length; i++) finalPositionsNames.push(store.players[overshootObj[i][1]].name)
		postData.finalPositions = finalPositionsNames

		//  If finished external tournament game, add data to store in flexi-time
		if (personal.externalTournamentGame) {
			postData.externalTournamentGame = true
			let tournamentData = []
			for (let i = 0; i < store.gameflow.fullTurnOrder.length; i++) {
				let playerIndex = store.gameflow.fullTurnOrder[i]
				tournamentData.push([store.players[playerIndex].name, model.getScore(playerIndex), model.getVR(store.players[playerIndex])])
			}
			postData.tournamentData = [...tournamentData]
		}
	}
	if (personal.removeCurrentFlexTime) {
		personal.removeCurrentFlexTime = false
		postData.checkName = personal.removeCurrentFlexTimeName
		personal.removeCurrentFlexTimeName = ""
	}

	try {
		const response = await fetch("/TGZ/processTGZturn/", {
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

		// Now process any auto-passes during bid phase
		if (data.processAutoPass) {
			let pos = 0
			for (let i = store.ongoingVars.newTurnOrder.length - 1; i >= 0; i--) {
				if (store.ongoingVars.newTurnOrder[i] === -1) {
					pos = i
					store.ongoingVars.newTurnOrder[i] = controller.currentPlayerIndex()
					break
				}
			}
			store.context.action = rf.ACT_NONE
			store.context.selectedBid = 0
			model.addHistory(rf.HIST_BID, controller.currentPlayerIndex(), 0, [parseInt(0), pos])
			personal.haltPlay = false
			controller.endPlayerTurn()
			return
		}

		store.topMenuViews.showLoader = false
		personal.haltPlay = false
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
		const response = await fetch("/TGZ/sendChatMessage/", {
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
		if (personal.liveWS) WS.TGZwebSocket.send("NEWCHATTS" + String(personal.gameID)) //+ String(result.latestUpdate));
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
		const response = await fetch("/TGZ/data/1/", {
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
		const response = await fetch("/TGZ/data/2/", {
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
		const response = await fetch("/TGZ/saveNotes/", {
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
	if (store.topMenuViews.showReplay) {
		store.topMenuViews.rewindErrorText = "Error: Exit Replay Mode First"
		store.topMenuViews.performingRewind = false
		store.topMenuViews.showLoader = false
		return
	}

	try {
		const response = await fetch("/TGZ/processTGZturn/", {
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
			store.topMenuViews.performingRewind = false
			return
		}
		personal.latestUpdate = data.latestUpdate

		// Hide the dropdown
		if (data.errorMessage) {
			store.topMenuViews.rewindErrorText = data.errorMessage
			store.topMenuViews.performingRewind = false
			controller.startPlayerTurn()
		} else {
			funcs.importModel(data.gameData, false)

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
		alert("Error rewinding the game")
		store.topMenuViews.performingRewind = false
	}
}

async function updateDataFromLoadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket() // No 'await'! Starts in background.
	}

	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")
	// IF AT THE END OF NON-SIMUL PHASE, SET UP NEXT PLAYER

	try {
		const response = await fetch("/TGZ/processTGZturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "updateDataFromLoadRewind",
				turn: store.gameflow.turn,
				nextPlayer: store.players[store.gameflow.turnOrder[0]].name, // USED > goes to currentPlayers
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
		store.topMenuViews.showLoader = false
		store.topMenuViews.performingRewind = false
		Bot.actionAnyBotMoves()
		store.clearVars(false)
		controller.startPlayerTurn()
		WS.broadcastGameUpdate(wsConnecting)
	} catch (error) {
		console.error("Error updating data:", error)
		alert("Error updating the game")
		store.topMenuViews.performingRewind = false
		controller.startPlayerTurn()
	}
}

// Simply saves as a no kickout missing
export async function resign() {
	/* ONLY GET HERE DURING ACTION PHASE */
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	let BKSN = store.players[personal.pov].name

	try {
		const response = await fetch("/TGZ/processTGZturn/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
				action: "resign",
				user: personal.name,
				BKSN: BKSN,
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
		const response = await fetch("/TGZ/processTGZturn/", {
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

export async function saveZoom(zoomLevel) {
	//const model = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/TGZ/changeTGZzoom/", {
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

export async function submitBug(bugContent) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true
	var csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/TGZ/bugEntry/", {
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
		else alert("Sorry, there was a problem. Please email the webmaster directly")
	} catch (error) {
		console.error("Error fetching data:", error)
		alert("Sorry, there was a problem. Please email the webmaster directly")
	}

	store.topMenuViews.showLoader = false
	store.topMenuViews.showBug = false
}

export async function copyGameToNewPracticeGame(_replayStep) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	let Dnames = []
	for (let i = 0; i < store.players.length; i++) {
		Dnames.push(store.players[i].displayName)
	}

	let histotyCopy = [...store.history]
	if (_replayStep < store.spinoffReplayData.length) funcs.importModel(store.spinoffReplayData[_replayStep])
	else funcs.importModel(store.replayResetData, true)
	store.history.splice(_replayStep)

	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].displayName !== personal.name) store.players[i].displayName = store.players[i].displayName + "_X"
	}
	let originalNames = []
	for (let i = 0; i < store.players.length; i++) {
		originalNames.push(store.players[i].name)
	}
	let counter = 0
	let shadowArray = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4"]
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].name !== personal.name) {
			store.players[i].name = shadowArray[counter]
			counter++
		}
	}
	let postData = {
		action: "copyGame", // USED
		data: funcs.exportModel(true),
		latestUpdate: personal.latestUpdate,
		turn: store.gameflow.turn, // USED
		phase: store.gameflow.phase, // USED
		gameID: personal.gameID, // USED
		currentPlayer: controller.currentPlayerIndex(),
		Dnames: Dnames,
	}

	try {
		const response = await fetch("/TGZ/createTGZspinoff/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			store.history.splice(0)
			store.history = [...histotyCopy]
			alert("Network response was not ok")
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		history.performStep(0)
		store.topMenuViews.showLoader = false
		return data
	} catch (error) {
		history.performStep(0)

		console.error("Error fetching data:", error)
		alert("Error Creating a Copy of the game")
		return false
	}
}

export async function saveAutoPass(autoPass) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/TGZ/processTGZturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "setAutoPass",
				playerNumber: personal.pov,
				gameID: personal.gameID,
				autoPass: autoPass,
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
		const data = await response.json()
		if (data.setAutoPassSuccess) {
			if (document.querySelector("#autoPassCheckbox").checked) document.querySelector("#autoPassResponse").innerHTML = "<br/>Auto-Pass Saved"
			else document.querySelector("#autoPassResponse").innerHTML = "<br/>Auto-Pass Cancelled"
		}

		store.topMenuViews.showLoader = false
	} catch (error) {
		console.error("Error zooming:", error)
	}
}

export async function checkForLatestData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")

	// Function to fetch data from the database
	try {
		const response = await fetch("/TGZ/data/3/", {
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
			controller.startPlayerTurn()
		}
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

/*export async function submitStatsExcludeConsent() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let checkbox = document.querySelector("#checkStatsExclude")
	if (!checkbox || !checkbox.checked) {
		store.topMenuViews.rewindErrorText = "Please check the box first"
		return
	}
	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/TGZ/processStatsExcludeConsent/", {
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
}*/

export function nudgeTourneyAdmins(type) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.topMenuViews.showLoader = true

	// Usage example
	const webhookUrl = "https://discord.com/api/webhooks/1197726435369029713/WJz5fJ0KsJnUM1bH4Czn7ELBSTzL_Bng6ZMO52IuRHa1A-FyJcDsZZhdbQYORKDwvehS"
	let message = ""
	// Resign
	if (type === 0) {
		message = "=======================\n"
		message += "RESIGN REQUEST RECEIVED\n"
		message += "Player: " + personal.name + "\n"
		message += "[Click here to go to the game](https://www.OnlineBoardGamers.com/TGZ/" + String(personal.gameID) + "/show/)"
	} else if (type === 1) {
		message = "============\n"
		message += "GAME TIMEOUT\n"
		message += "Alerting Player: " + personal.name + "\n"
		message += "Timed Out Player: " + controller.currentPlayerObj().name + "\n"
		message += "[Click here to go to the game](https://www.OnlineBoardGamers.com/TGZ/" + String(personal.gameID) + "/show/)"
	}
	fetch(webhookUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ content: message }),
	})
		.then((response) => {
			if (response.ok) {
				personal.kickoutRequired = false
				store.clearVars()
				funcs.importModel(store.wholeTurnResetData)
				controller.startPlayerTurn()
				store.topMenuViews.showLoader = false
				store.topMenuViews.rewindErrorText = "Alert Sent"
			} else {
				store.clearVars()
				funcs.importModel(store.wholeTurnResetData)
				controller.startPlayerTurn()
				store.topMenuViews.rewindErrorText = "Error. Please use email or discord."
			}
		})
		.catch((error) => {
			console.error("Error sending webhook:", error.message)
		})
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
		const response = await fetch("/TGZ/castVote/", {
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
			store.topMenuViews.bugSuccessText = "Vote Saved"

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
