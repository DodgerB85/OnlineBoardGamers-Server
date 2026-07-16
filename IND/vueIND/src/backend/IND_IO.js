import * as funcs from "../js/INDfuncs.js"
import * as WS from "./INDwebsocket.js"
import * as controller from "../js/INDcontroller.js"
import * as rf from "../js/INDreference.js"
import * as model from "../js/INDmodel.js"
import * as Bot from "../js/INDbot.js"
import * as replay from "../js/INDreplay.js"

import { useModelStore } from "../stores/INDstore.js"

import { usePersonalStore } from "../stores/INDpersonal.js"

export const SUPER_USERS = ["BotKickStarter"]
export const DEBUG_USERS = ["BotKickStarter", "admin"]
export const MAP_DEBUG_USERS = [] //["admin", "joshuastarr"]

export async function submitBug(bugContent) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true
	var csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/IND/bugEntry/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
				action: "bugentry",
				description: bugContent,
				//gameData: funcs.exportModel(true),
				gameData: funcs.exportModel(true),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.bugEntrySuccess) {
			store.gameMessages.bugSuccessText = "Your bug report has been submitted"
			store.gameMessages.successText = "Your bug report has been submitted"
			store.topMenuViews.showLoader = false
			store.topMenuViews.showBug = false
		} else store.gameMessages.bugErrorText = "Sorry, there was a problem.<br/>Please email the webmaster directly or report on the Discord"
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.bugErrorText = "Sorry, there was a problem.<br/>Please email the webmaster directly or report on the Discord"
	}
	store.topMenuViews.showLoader = false
}

export async function saveGame(saveRewind, saveContext = false) {
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
	}

	// SHOULD BE NON-SIMUL
	if (store.gameflow.turnOrder.length > 0) {
		postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name] // USED > goes to currentPlayers
	} else if (store.gameflow.phase !== rf.PHASE_MERGER_BIDDING) {
		// THIS IS JUST AN EMERGENCY CHECK
		store.gameflow.turnOrder.push(0)
		postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name]
		alert("RE-EXPORT")
		postData.data = funcs.exportModel()
	}
	if (store.gameflow.phase === rf.PHASE_MERGER_BIDDING) {
		if (store.ongoingVars.bidTurnOrder.length > 0) {
			postData.nextPlayer = [store.players[store.ongoingVars.bidTurnOrder[0]].name]
		} else {
			console.error(`CP() Error - Bidding. S.O.bTO: ${store.ongoingVars.bidTurnOrder}`)
			postData.nextPlayer = []
		}
	}

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		postData.status = "FINISHED" // USED
		//let finalRes = [...store.gameflow.fullTurnOrder]
		postData.winner = store.players[store.gameflow.fullTurnOrder[0]].name // NAME
		postData.saveRewind = false
		postData.data = funcs.exportModel(false, true)

		//let finalPositions = []
		//for (let i = 0; i < finalRes.length; i++) finalPositionsNames.push(store.players[finalRes[i][0]].name)
		/*finalPositions.push([...finalRes[1]])
		if (finalRes.length > 2) finalPositions.push([...finalRes[2]])
		postData.finalPositions = finalPositions*/
		postData.finalPositions = [...store.gameflow.fullTurnOrder]

		const turnOrder = store.gameflow.fullTurnOrder
		const winningPlayerMoney = store.players[turnOrder[0]].moneyCash + store.players[turnOrder[0]].moneyBank

		postData.tournamentData = turnOrder.map((playerIdx, i) => {
			const player = store.players[playerIdx]

			// First player gets [Name], others get [Name, calculatedValue]
			if (i === 0) return [player.name]

			const diffValue = Math.ceil((winningPlayerMoney - (player.moneyCash + player.moneyBank)) / 100)
			return [player.name, diffValue]
		})
	}

	// Use this to kickPass another player and remove their flexi time
	if (personal.removeCurrentFlexTime) {
		personal.removeCurrentFlexTime = false
		postData.checkName = personal.removeCurrentFlexTimeName
		personal.removeCurrentFlexTimeName = ""
	}

	try {
		const response = await fetch("/IND/processINDturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			const responseText = await response.text()
			let errorMessage = `HTTP ${response.status} ${response.statusText}`
			try {
				const errorData = JSON.parse(responseText)
				if (errorData.syncError === "12345") {
					store.gameMessages.rewindErrorText = "It appears you have an older version of the game. Please refresh the page"
					return
				}
				errorMessage = errorData.error || errorMessage
			} catch {
				// Django 500 pages: try to extract the actual exception message
				const excMatch = responseText.match(/<pre class="exception_value">([\s\S]*?)<\/pre>/i)
					|| responseText.match(/<div class="exception_value">([\s\S]*?)<\/div>/i)
				if (excMatch) {
					errorMessage += ` | ${excMatch[1].replace(/<[^>]+>/g, "").trim()}`
				} else {
					const titleMatch = responseText.match(/<title>(.*?)<\/title>/i)
					if (titleMatch) {
						errorMessage += ` | ${titleMatch[1]}`
					} else {
						const plain = responseText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
						errorMessage += ` | ${plain.substring(0, 400)}`
					}
				}
			}
			throw new Error(errorMessage)
		}
		const data = await response.json()
		if (data.syncError === "12345") {
			store.gameMessages.rewindErrorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		store.preMovesCompressed = data.sideData
		if (store.gameflow.phase === rf.PHASE_R_AND_D) await processPreMoves()
		store.topMenuViews.showLoader = false
		personal.haltPlay = false
		controller.startPlayerTurn()

		// Fire-and-forget broadcast in background
		WS.broadcastGameUpdate(wsConnecting).catch((err) => console.warn("Broadcast failed:", err))
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error saving the game - Send all this to admin (eg on discord/email)"
		const payloadInfo = `turn=${postData.turn}, phase=${postData.phase}, LU=${postData.latestUpdate}, nextPlayer=${postData.nextPlayer?.[0] || "none"}`
		const gameInfo = `Game ${personal.gameID} - User ${personal.name || 'unknown'} - ${payloadInfo}`
		const errorName = error && error.name ? error.name : "Error"
		const errorMsg = error && error.message ? error.message : String(error)
		const errorStack = error && error.stack ? String(error.stack).substring(0, 1200) : "no stack"
		const browserInfo = typeof navigator !== "undefined" ? navigator.userAgent : "unknown UA"
		store.gameMessages.errorText += `<br/> ${errorName}`
		store.gameMessages.errorText += `<br/> ${errorStack}`
		store.gameMessages.errorText += `<br/> ${errorMsg}`
		sendDiscordWebhook(`IND save error - ${gameInfo}: [${errorName}] ${errorMsg} | UA: ${browserInfo} | stack: ${errorStack}`)
	}
}

export function sendDiscordWebhook(message) {
	let csrftoken = funcs.getCookie("csrftoken")

	fetch("/sendAdminMessage/", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-CSRFToken": csrftoken,
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

export async function sendChatMessage(newEntry) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")
	try {
		const response = await fetch("/IND/sendChatMessage/", {
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
		if (personal.liveWS) WS.INDwebSocket.send("NEWCHATTS" + String(personal.gameID)) //+ String(result.latestUpdate));
		store.topMenuViews.showLoader = false
	} catch (error) {
		console.error("Error sending chat:", error)
		store.gameMessages.errorText = "Error sending chat message"
	}
}

export async function reloadGameData() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let csrftoken = funcs.getCookie("csrftoken")
	store.topMenuViews.showLoader = true

	// Function to fetch data from the database
	try {
		const response = await fetch("/IND/data/1/", {
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
		if (data.finishedGame) funcs.importModel(data.gameData, false, true)
		else funcs.importModel(data.gameData, false, false)

		// Import any pre-moves
		if (personal.pov >= 0) {
			store.players[personal.pov].preMoves.splice(0)
			if (window.initData.preMoves !== "") store.players[personal.pov].preMoves = [...funcs.decompressData(window.initData.preMoves)]
			store.preMovesCompressed = window.initData.sideData
		}

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
		const response = await fetch("/IND/data/2/", {
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
	store.gameMessages.errorText = ""

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/IND/saveNotes/", {
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
			store.topMenuViews.showLoader = false
			return
		}
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		if (!data.notePosted) {
			store.gameMessages.errorText = "Sorry, there was a problem. Please email the webmaster directly"
			return
		}
		store.topMenuViews.showLoader = false
	} catch (error) {
		console.error("Error saving Notes:", error)
		store.gameMessages.errorText = "Error saving Notes"
	}
}

export async function loadRewind() {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	if (store.topMenuViews.showReplay) {
		store.gameMessages.rewindErrorText = "Error: Exit Replay Mode First"
		store.topMenuViews.performingRewind = false
		store.topMenuViews.showLoader = false
		return
	}

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
		store.gameMessages.rewindErrorText = "Error: Game Ended"
		store.topMenuViews.performingRewind = false
		store.topMenuViews.showLoader = false
		return
	}

	try {
		const response = await fetch("/IND/processINDturn/", {
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
			store.gameMessages.rewindErrorText = "It appears you have an older version of the game. Please refresh the page"
			store.topMenuViews.performingRewind = false
			return
		}

		// Hide the dropdown
		if (data.errorMessage) {
			store.gameMessages.rewindErrorText = data.errorMessage
			store.topMenuViews.performingRewind = false
			controller.startPlayerTurn()
		} else {
			funcs.importModel(data.gameData, false)
			personal.latestUpdate = data.latestUpdate
			window.initData.latestUpdate = data.latestUpdate

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
		store.gameMessages.errorText = "Error rewinding the game"
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
		const response = await fetch("/IND/processINDturn/", {
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
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
		store.topMenuViews.showLoader = false
		store.topMenuViews.performingRewind = false
		Bot.removeBotPlayers()
		if (store.gameflow.turnOrder.length === 0) controller.endCurrentPhase()
		//if (store.gameflow.phase !== rf.PHASE_PRODUCTION && store.gameflow.phase !== rf.PHASE_MOVE_PIRATE) store.resetContext()
		controller.startPlayerTurn()

		// Fire-and-forget broadcast in background
		WS.broadcastGameUpdate(wsConnecting).catch((err) => console.warn("Broadcast failed:", err))
	} catch (error) {
		console.error("Error updating data:", error)
		store.gameMessages.errorText = "Error updating the game"
		store.topMenuViews.performingRewind = false
		controller.startPlayerTurn()
	}
}

// Simply saves as a no kickout missing ALSO FOR GRAVE GAME OVER
export async function resign() {
	/* ONLY GET HERE WITH 0 HEX ACTIONS USED */
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/IND/processINDturn/", {
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
		store.gameMessages.errorText = "Error Resigning"
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
		const response = await fetch("/IND/processINDturn/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.syncError === "12345") {
			store.gameMessages.rewindErrorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		personal.latestUpdate = data.latestUpdate
		window.initData.latestUpdate = data.latestUpdate
		personal.secondsToNextKickout = data.secondsToNextKickout
	} catch (error) {
		console.error("Error kicking:", error)
		store.gameMessages.errorText = "Error Kicking"
	}
}

export async function savePreTurn(prePhase, data) {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true
	store.topMenuViews.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	let postData = {
		action: "preTurn",
		latestUpdate: personal.latestUpdate,
		//data: funcs.compressData(data),
		data: data,
		prePhase: [prePhase],
		gameID: personal.gameID,
	}

	try {
		const response = await fetch("/IND/processINDturn/", {
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
		//model.resetPreMove()
		store.players[personal.pov].preMoves.splice(0)
		if (data.data != "" && data.data != [] && data.data.length > 0) store.players[personal.pov].preMoves = [...funcs.decompressData(data.data)]
	} catch (error) {
		console.error("Error saving pre-move:", error)
		store.gameMessages.errorText = "Error saving the pre-move"
	}
}

export async function saveZoom() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let csrftoken = funcs.getCookie("csrftoken")

	let zoomLevel = store.refSize / 100

	try {
		const response = await fetch("/IND/saveZoom/", {
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
		const response = await fetch("/IND/data/3/", {
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
			if (store.gameflow.phase === rf.PHASE_GAME_OVER) funcs.importModel(data.gameData, false, true)
			else funcs.importModel(data.gameData, false, false)

			// Import any pre-moves
			if (personal.pov >= 0) {
				store.players[personal.pov].preMoves.splice(0)
				if (window.initData.preMoves !== "") store.players[personal.pov].preMoves = [...funcs.decompressData(window.initData.preMoves)]
				store.preMovesCompressed = window.initData.sideData
			}
			personal.secondsToNextKickout = data.secondsToNextKickout
			personal.latestUpdate = data.latestUpdate
			store.topMenuViews.showLoader = false
			controller.startPlayerTurn()
		}
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

export async function submitStatsToBGS() {
	// Get current UTC date and time
	const now = new Date()
	const utcDate = new Date(now.getTime()) // + now.getTimezoneOffset() * 60000) // Convert to UTC

	// Format the UTC date and time as "YYYY-MM-DD HH:mm:ss"
	const year = utcDate.getUTCFullYear()
	const month = (utcDate.getUTCMonth() + 1).toString().padStart(2, "0") // Month is 0-indexed
	const day = utcDate.getUTCDate().toString().padStart(2, "0")
	const hours = utcDate.getUTCHours().toString().padStart(2, "0")
	const minutes = utcDate.getUTCMinutes().toString().padStart(2, "0")
	const seconds = utcDate.getUTCSeconds().toString().padStart(2, "0")

	const playDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`

	const store = useModelStore()
	const personal = usePersonalStore()
	let data = {
		sourceName: "OnlineBoardGamers.com",
		location: "OnlineBoardGamers.com",
		sourcePlayId: personal.gameID,
		playDate: playDate,
		//"board": "",
		//"comments": "",
		game: {
			name: "Indonesia",
			sourceGameId: "IND",
			bggId: 19777,
			highestWins: true,
			noPoints: false,
		},

		players: [],
	}
	// Add the players
	for (let i = 0; i < store.players.length; i++) {
		data.players.push({
			name: store.players[i].name,
			sourcePlayerId: store.players[i].name,
			startPlayer: i === 0 ? true : false,
			rank: 1,
			//role: "",
			score: store.players[i].moneyCash + store.players[i].moneyBank,
			winner: false,
		})
	}
	// Set the result
	let resArray = store.history[store.history.length - 1][3]
	for (let i = 0; i < resArray.length; i++) {
		data.players[resArray[i][0]].rank = i + 1
		if (i == 0) data.players[resArray[i][0]].winner = true
	}

	// Create the URL
	let urlData = encodeURIComponent(JSON.stringify(data))
	let url = `https://app.bgstatsapp.com/createPlay.html?data=${urlData}`

	// Open the URL in a new window
	window.open(url, "_blank")
	console.log(JSON.stringify(data, null, 4))
}

export async function submitStatsExcludeConsent() {
	//const store = useModelStore()
	//const personal = usePersonalStore()
	//await simulateServer()
}

export function nudgeTourneyAdmins() {
	alert("Nudge")
}

export async function forkGame() {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	let postData = {
		action: "forkGame", // USED
		gameID: personal.gameID, // USED
	}

	try {
		const response = await fetch("/IND/forkINDgame/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			alert("Network response was not ok")
			throw new Error("Network response was not ok")
		}
		const data = await response.json()

		store.topMenuViews.showLoader = false
		store.gameMessages.successText = "Game forked. Check Invites / Waiting Games in the Lobby"
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error Creating a Copy of the game"
		return false
	}
}

export async function processPreMoves() {
	const store = useModelStore()
	let playerObj = controller.currentPlayerObj()
	let playerIndex = controller.currentPlayerIndex()

	// If the player has a pre move, action that and then skip
	let decompressedPreMoveData = funcs.decompressData(store.preMovesCompressed)
	let idx = decompressedPreMoveData.findIndex((x) => x[0] === playerObj.name)
	if (idx !== -1) {
		let preMoveArr = decompressedPreMoveData[idx][3]
		if (preMoveArr.length === 0) {
			return
		}
		// Check the turn is correct
		let preMoveTurn = preMoveArr[0]
		if (preMoveTurn !== store.gameflow.turn) {
			return
		}

		// If it's YOUR RnD, check the current level is as per preMove
		let expectedCurrentLevel = preMoveArr[2]
		let preRndIdx = parseInt(preMoveArr[1])
		if (preRndIdx <= 9 && playerObj.RnD[preRndIdx] !== expectedCurrentLevel) {
			return
		}

		// Now you have the
		if (preRndIdx >= 0) {
			let RNDidx = 0
			if (String(preRndIdx).length === 1) {
				RNDidx = parseInt(preRndIdx)
				model.upgradeRND(playerIndex, RNDidx)
			} else if (String(preRndIdx).length === 2) {
				RNDidx = parseInt(String(preRndIdx)[0])
				let playerIndex = parseInt(String(preRndIdx)[1])
				model.upgradeRND(playerIndex, RNDidx)
			}
			// There was valid data, so remove current player
			controller.endPlayerTurn()
		}
		// No valid data
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
		const response = await fetch("/IND/castVote/", {
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

export async function copyGameToNewPracticeGame(_replayStep) {
	const store = useModelStore()
	const personal = usePersonalStore()

	//if (_replayStep > 0) _replayStep--
	const copyingResetData = funcs.simpleExportWholeINDmodelNoCompression()

	store.topMenuViews.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	let Dnames = []
	for (let i = 0; i < store.players.length; i++) {
		Dnames.push(store.players[i].displayName)
	}

	if (_replayStep < store.spinoffReplayData.length) funcs.simpleImportWholeINDmodelNoCompression(store.spinoffReplayData[_replayStep], false)
	else funcs.simpleImportWholeModel(store.replayResetData, true)
	let histotyCopy = [...store.history]

	// Get the correct history index from computedHistory (5th element)
	let historyIndex = store.computedHistory[_replayStep]?.[4] ?? store.history.length
	store.history.splice(historyIndex)

	let originalNames = []
	let originalDisplayNames = []
	for (let i = 0; i < store.players.length; i++) {
		originalNames.push(store.players[i].name)
		originalDisplayNames.push(store.players[i].displayName)
	}
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].displayName !== personal.name) store.players[i].displayName = store.players[i].displayName + "_X"
	}
	let counter = 0
	let shadowArray = ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4"]
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].name !== personal.name) {
			store.players[i].name = shadowArray[counter]
			counter++
		}
	}

	// Remove pre bid data
	store.ongoingVars.preBidData.splice(0)

	// Reset future era cards
	if (store.actualGameState.era === rf.ERA_A || store.actualGameState.era === rf.ERA_B) {
		let allEraCards
		if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) allEraCards = rf.ALL_ERA_CARDS
		else if (store.mapData.selectedMap === rf.MAP_AEGEAN) allEraCards = rf.AG_ALL_ERA_CARDS
		else if (store.mapData.selectedMap === rf.MAP_PHP) allEraCards = rf.PH_ALL_ERA_CARDS

		for (const playerObj of store.players) {
			playerObj.eraCards = playerObj.eraCards.filter((cardId) => {
				const card = allEraCards.find((c) => c.id === cardId)
				return card && card.era <= store.actualGameState.era
			})
		}

		let shuffledEraCards = funcs.shuffle(rf.ALL_ERA_CARDS.slice())
		if (store.mapData.selectedMap === rf.MAP_AEGEAN) shuffledEraCards = funcs.shuffle(rf.AG_ALL_ERA_CARDS.slice())
		else if (store.mapData.selectedMap === rf.MAP_PHP) shuffledEraCards = funcs.shuffle(rf.PH_ALL_ERA_CARDS.slice())
		const playerCardsPerEra = store.players.length === 2 ? 2 : 1
		for (let era = store.actualGameState.era + 1; era <= rf.ERA_C; era++) {
			let thisEraCards = shuffledEraCards.filter((card) => card.era === era)
			for (let player of store.players) {
				for (let k = 0; k < playerCardsPerEra; k++) {
					player.eraCards.push(thisEraCards.pop().id)
				}
			}
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
		const response = await fetch("/IND/createINDspinoff/", {
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
		replay.performStep(0)
		store.topMenuViews.showLoader = false
		// Replace original names
		for (let i = 0; i < store.players.length; i++) {
			if (store.players[i].name !== originalNames[i]) {
				store.players[i].name = originalNames[i]
			}
			if (store.players[i].displayName !== originalDisplayNames[i]) {
				store.players[i].displayName = originalDisplayNames[i]
			}
		}

		funcs.simpleImportWholeINDmodelNoCompression(copyingResetData, true)

		return data
	} catch (error) {
		store.history.splice(0)
		store.history = [...histotyCopy]
		replay.performStep(0)
		// Restore original names
		for (let i = 0; i < store.players.length; i++) {
			if (store.players[i].name !== originalNames[i]) {
				store.players[i].name = originalNames[i]
			}
			if (store.players[i].displayName !== originalDisplayNames[i]) {
				store.players[i].displayName = originalDisplayNames[i]
			}
		}
		funcs.simpleImportWholeINDmodelNoCompression(copyingResetData, true)

		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error Creating a Copy of the game"
		return false
	}
}
