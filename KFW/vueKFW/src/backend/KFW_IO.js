import * as funcs from "../js/KFWfuncs.js"
import * as WS from "./KFWwebsocket.js"
import * as controller from "../js/KFWcontroller.js"
import * as rf from "../js/KFWreference.js"
import * as model from "../js/KFWmodel.js"
import * as Bot from "../js/KFWbot.js"
import * as view from "../js/KFWview.js"
import * as village from "../js/KFWvillage.js"

import { useModelStore } from "../stores/KFWstore.js"

import { usePersonalStore } from "../stores/KFWpersonal.js"

export const SUPER_USERS = ["BotKickStarter"]
export const DEBUG_USERS = ["BotKickStarter", "admin"]

export async function submitBug(bugContent) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.viewSettings.showLoader = true
	var csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/KFW/bugEntry/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
				action: "bugentry",
				description: bugContent,
				gameData: funcs.exportKFWmodel(true),
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

export async function getBoatMeeplesAndSkills(meeplesRequired, skillsRequired) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.viewSettings.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/KFW/processKFWturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "getBoatMeeplesAndSkills",
				gameID: personal.gameID,
				gameData: funcs.compressData([meeplesRequired, skillsRequired]),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		let incomingData = funcs.decompressData(data.data)
		let meepleArr = incomingData[0]
		let skillsArr = incomingData[1]
		let meeples = []
		let skills = []
		for (let i = 0; i < meepleArr.length; i++) {
			for (let j = 0; j < meepleArr[i]; j++) meeples.push(i)
		}
		for (let i = 0; i < skillsArr.length; i++) {
			for (let j = 0; j < skillsArr[i]; j++) skills.push(i)
		}

		let gameData3 = funcs.decompressData(data.data3)
		store.availableMeeples = gameData3[0]
		store.availableSkills = gameData3[1]

		store.viewSettings.showLoader = false
		return [meeples, skills]
	} catch (error) {
		console.error("Error updating data:", error)
		store.gameMessages.errorText = "Error updating the game"
		store.viewSettings.performingRewind = false
		controller.startPlayerTurn()
	}
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
		data: funcs.exportKFWmodel(false),
		turn: store.gameflow.turn, // USED
		phase: store.gameflow.phase, // USED
		gameID: personal.gameID, // USED
		//saveRewind: global.saveRewind
	}
	//if (window.initData.gameData === "") postData.mapTiles = [...store.mapTiles]

	try {
		const response = await fetch("/KFW/processKFWturn/", {
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
		wsConnecting = WS.StartWebSocket()
	}

	personal.haltPlay = true
	store.viewSettings.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate === -1) personal.latestUpdate = "9999999999999"

	/* data2 is actions to be performed on the server. They should be in the form
	SERV_MEEPLES_REMOVE_FROM_PLAYER: [playerIndex, serverAction, [MR, MR, ...]]

	SERV_GET_RADOM_MEEPLES_FROM_BAG_TO_PLAYER: [playerindex, serverAction, num, histindex, [histData]]
	

	*/
	let data2 = funcs.compressData(store.context.endTurnActions)
	store.context.endTurnActions.splice(0)

	let exportData = funcs.exportKFWmodel(false)
	if (saveContext) exportData = funcs.exportKFWmodel(true)
	let BKSN = store.players[personal.pov].name
	if (!personal.trainingGame) BKSN = store.players[personal.pov].name

	let postData = {
		action: "saveGame",
		latestUpdate: personal.latestUpdate,
		data: exportData,
		data2: data2,
		turn: store.gameflow.season,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		saveRewind: saveRewind,
		BKSN: BKSN,
	}

	// SHOULD BE NON-SIMUL
	if (store.gameflow.turnOrder.length > 0) {
		postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name] // USED > goes to currentPlayers
	} else {
		// THIS IS JUST AN EMERGENCY CHECK
		store.gameflow.turnOrder.push(0)
		postData.nextPlayer = [store.players[store.gameflow.turnOrder[0]].name]
		alert("RE-EXPORT")
		postData.data = funcs.exportKFWmodel()
	}

	// But could be saving INTO simul
	if (controller.isSimulPhase(store.gameflow.phase)) {
		// Make sure there's no bots
		Bot.removeBotPlayers()
		let currentPlayerIndexes = [...store.gameflow.turnOrder]
		// Remove players who don't need to move
		if (store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING) {
			for (let i = currentPlayerIndexes.length - 1; i >= 0; i--) {
				let playerObj = store.players[currentPlayerIndexes[i]]
				if (playerObj.pendingVillageTiles.length === 0) {
					currentPlayerIndexes.splice(i, 1)
				}
			}
		}

		const filteredNames = currentPlayerIndexes.map((playerIndex) => store.players[playerIndex].name)
		postData.nextPlayer = filteredNames
	}

	// Use this to kickPass another player and remove their flexi time
	if (personal.removeCurrentFlexTime) {
		personal.removeCurrentFlexTime = false
		postData.checkName = personal.removeCurrentFlexTimeName
		personal.removeCurrentFlexTimeName = ""
	}

	// If you are collecting boat resources, but have NO pending tiles, then submit your move now
	let IPM = ""
	if (personal.pov >= 0 && (store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES || store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING) && store.gameflow.season !== rf.WINTER && store.players[personal.pov].pendingVillageTiles.length === 0) {
		let moveData = funcs.compressData(funcs.exportPlayerVIllageMoveData(personal.pov))
		IPM = moveData
		window.initData.move = moveData
	}

	postData.IPM = IPM

	try {
		const response = await fetch("/KFW/processKFWturn/", {
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

		// Check if you just finished boat collection into village phase with IPM and no new players
		if (store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING && IPM !== "") {
			await saveSimulMove(personal.pov, IPM)
			// If saving simul ended the phase, then don't need to broadcast
			if (data.phaseEnded) return
		}

		funcs.importCompressedGameData13(data.gameData1, data.gameData3)

		let newInformation = funcs.decompressData(data.newInformation)

		if (newInformation[0].length > 0 || newInformation[1].length > 0) {
			let message = ""
			if (personal.trainingGame) message = `${store.players[newInformation[2]].name} gained `
			else message = `You gained `

			for (let i = 0; i < newInformation[0].length; i++) {
				message += `<img class="meepleInMessage" src="${view.getImage("meeple_" + newInformation[0][i])}" />`
			}
			for (let i = 0; i < newInformation[1].length; i++) {
				message += `<img class="skillTileInMessage" src="${view.getImage("skillTile_" + newInformation[1][i])}" />`
			}

			store.gameMessages.endTurnMessage = message
		}

		// Broadcast update
		WS.broadcastGameUpdate(wsConnecting).catch((err) => console.warn("Broadcast failed:", err))

		store.viewSettings.showLoader = false
		personal.haltPlay = false
		controller.startPlayerTurn()
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error saving the game"
	}
}

export async function saveSimulMove(playerIndex, moveDataString) {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true
	store.viewSettings.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate === -1) personal.latestUpdate = "9999999999999"

	let postData = {
		action: "saveSimulMove",
		latestUpdate: personal.latestUpdate,
		moveData: moveDataString,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		BKSN: store.players[personal.pov].name,
	}

	if (personal.removeCurrentFlexTime) {
		personal.removeCurrentFlexTime = false
		postData.checkName = personal.removeCurrentFlexTimeName
		personal.removeCurrentFlexTimeName = ""
	}

	try {
		const response = await fetch("/KFW/processKFWturn/", {
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
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		window.initData.move = moveDataString
		// If not ready
		const allReadyObject = data.find((item) => Object.hasOwn(item, "allReady"))
		const readyObject = data.find((item) => Object.hasOwn(item, "ready"))

		let allReadyJS = false // Default value in case "allReady" is not found

		if (allReadyObject) {
			allReadyJS = allReadyObject.allReady
		}

		if (!allReadyJS) {
			store.gameflow.turnOrder.splice(0)
			for (let i = 0; i < readyObject.ready.length; i++) {
				if (!readyObject.ready[i]) store.gameflow.turnOrder.push(i)
			}
		} else {
			// PROCESS SIMUL RETURNS
			if (store.gameflow.phase === rf.PHASE_CHOOSE_WINTER_TILES) {
				let histObj = []
				let chosenCount = []
				for (let i = 0; i < store.players.length; i++) {
					store.players[i].hiddenWinterTile_tileIDs.splice(0)
					if (data[i].content === "") chosenCount.push(0)
					if (data[i].content === "") continue
					let playerData = funcs.decompressData(data[i].content)
					chosenCount.push(playerData.length)
					for (let j = 0; j < playerData.length; j++) {
						let tileID = playerData[j]
						store.context.historyObj.push(tileID)
						let tile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID.includes(tileID))))
						store.availableTiles.push(tile)
						histObj.push(tileID)
					}
				}
				histObj.unshift([...chosenCount])
				model.addHistory(rf.HIST_CHOSEN_WINTER_TILES, -1, 0, [...histObj])
			}
			// OTHERWISE - must be a village expansion
			else {
				// As it is a village expansion, if it is in winter, remove all available boats, in case that got out of sync
				if (store.gameflow.season === rf.WINTER) {
					store.availableBoatTiles.splice(0)
				}
				// IF you submitted form pre-phase, AND all players are now ready, you MUST reloead the history first to preserve boat collection history
				if (store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING) {
					store.gameflow.phase = rf.PHASE_VILLAGE_EXPANDING
					const gameDataBooObject = data.find((item) => Object.hasOwn(item, "GameDataBoo"))

					if (gameDataBooObject) {
						// Check if gameDataBooObject is found
						if (gameDataBooObject.GameDataBoo === true) {
							// Corrected: Access property with correct casing
							const gameDataObject = data.find((item) => Object.hasOwn(item, "GameData"))

							if (gameDataObject) {
								// Check if gameDataObject is found
								//await funcs.loadGameData(gameDataObject.GameData)
								await reloadGameData()
							} else {
								console.log("GameData object not found in data.") // Handle the case where GameData is missing
							}
						}
					} else {
						console.log("GameDataBoo object not found in data.") // Handle the case where GameDataBoo is missing
					}
				}

				// Reload the data
				let histData = []
				for (let i = 0; i < store.players.length; i++) {
					if (data[i].content === "") {
						histData.push([])
						continue
					}
					funcs.importPlayerVIllageMoveData(i, data[i].content)
					histData.push([data[i].timestamp, data[i].content])
				}
				// Process end of simul build (make the history)
				village.processEndOfSimulTurn(histData)
			}

			// End the phase
			await controller.endCurrentPhase()
			// save the game
			await saveGame(true, false)
		}

		// Final check to remove pre-phase
		if (store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING) store.gameflow.phase = rf.PHASE_VILLAGE_EXPANDING

		store.viewSettings.showLoader = false
		personal.haltPlay = false
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error saving the game"
	}
}

export async function saveFinalScoringMove(playerIndex, moveDataString) {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true
	store.viewSettings.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate === -1) personal.latestUpdate = "9999999999999"

	let BKSN = store.players[playerIndex].name
	if (!personal.trainingGame) BKSN = store.players[personal.pov].name

	let data2 = funcs.compressData(store.context.endTurnActions)
	store.context.endTurnActions.splice(0)

	let postData = {
		action: "saveFinalScoringMove",
		latestUpdate: personal.latestUpdate,
		moveData: moveDataString,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "ACTIVE",
		gameID: personal.gameID,
		BKSN: BKSN,
		data2: data2,
	}

	if (personal.removeCurrentFlexTime) {
		personal.removeCurrentFlexTime = false
		postData.checkName = personal.removeCurrentFlexTimeName
		personal.removeCurrentFlexTimeName = ""
	}

	try {
		const response = await fetch("/KFW/processKFWturn/", {
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
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		if (!personal.trainingGame) window.initData.move = moveDataString
		// If not ready
		const allReadyObject = data.find((item) => Object.hasOwn(item, "allReady"))
		const readyObject = data.find((item) => Object.hasOwn(item, "ready"))

		let allReadyJS = false // Default value in case "allReady" is not found

		if (allReadyObject) {
			allReadyJS = allReadyObject.allReady
		}

		if (!allReadyJS) {
			store.gameflow.turnOrder.splice(0)
			for (let i = 0; i < readyObject.ready.length; i++) {
				if (!readyObject.ready[i]) store.gameflow.turnOrder.push(i)
			}
			store.gameflow.turnOrder.sort((a, b) => a - b)

			personal.haltPlay = false
			if (personal.trainingGame) controller.startPlayerTurn()
		}
		// OTHERWISE EVERYONE IS READY - SO PROCESS THE MOVE
		else {
			let allPlayerReturnData = data[0].allPlayerReturnData
			// Firstly, import the player data to overwrite score / contracts / village
			for (let i = 0; i < store.players.length; i++) {
				// ignore empty moves by bots
				if (allPlayerReturnData[i].content !== "") funcs.importPlayerFinalScoringMoveData(i, funcs.decompressData(allPlayerReturnData[i].content))
				//histData.push([data[i].timestamp, data[i].content])
			}
			// Next, import the uncensored data13
			funcs.importCompressedGameData13(data[1].gameData1, data[2].gameData3, true)

			// Now overwrite store.history with the revealed data
			for (let i = 0; i < store.players.length; i++) {
				for (let j = 0; j < store.players[i].hiddenHistory.length; j++) {
					let hiddenEntry = store.players[i].hiddenHistory[j]
					let entry3 = store.history[hiddenEntry[0]][3]
					if (store.history[hiddenEntry[0]][0] === rf.HIST_COLLECT_BOAT1A_RANDOM_MEEPLES) {
						entry3[0] = hiddenEntry[1][0]
						entry3[1] = hiddenEntry[1][1]
					} else entry3[entry3.length - 1] = [...hiddenEntry[1]]
				}
			}

			// Now save the game wholistic data, and get the server to wipe unneeded data

			await saveGameForGameOver()
		}

		store.viewSettings.showLoader = false
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error saving the game"
	}
}

export async function saveGameForGameOver() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let wsConnecting = null
	if (personal.liveWS) {
		wsConnecting = WS.StartWebSocket()
	}

	personal.haltPlay = true
	store.viewSettings.showLoader = true

	model.endGame()

	let csrftoken = funcs.getCookie("csrftoken")

	if (personal.latestUpdate === -1) personal.latestUpdate = "9999999999999"

	store.context.endTurnActions.splice(0)

	for (let i = 0; i < store.players.length; i++) model.scoreAutoProcessingTilesAndMoveResources(i)

	let exportData = funcs.exportKFWmodelForGameOver()

	let postData = {
		action: "saveEndGame",
		latestUpdate: personal.latestUpdate,
		data: exportData,
		turn: store.gameflow.turn,
		phase: store.gameflow.phase,
		status: "FINISHED",
		gameID: personal.gameID,
	}

	//let finalRes = [...store.gameflow.fullTurnOrder]
	//postData.winner = store.players[store.gameflow.fullTurnOrder[0]].name // NAME
	let finalRes = model.endGame_core()

	postData.winner = finalRes[0] // USED

	//let finalPositions = []
	//for (let i = 0; i < finalRes.length; i++) finalPositionsNames.push(store.players[finalRes[i][0]].name)
	/*finalPositions.push([...finalRes[1]])
		if (finalRes.length > 2) finalPositions.push([...finalRes[2]])
		postData.finalPositions = finalPositions*/
	postData.finalPositions = [...finalRes]

	try {
		const response = await fetch("/KFW/processKFWturn/", {
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

		funcs.importKFWmodelForGameOver(exportData)

		// Broadcast update
		WS.broadcastGameUpdate(wsConnecting).catch((err) => console.warn("Broadcast failed:", err))

		store.viewSettings.showLoader = false
		personal.haltPlay = false
		//controller.startPlayerTurn()
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
		const response = await fetch("/KFW/sendChatMessage/", {
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
		if (personal.liveWS) WS.KFWwebSocket.send("NEWCHATTS" + String(personal.gameID)) //+ String(result.latestUpdate));
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
		const response = await fetch("/KFW/data/1/", {
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
		if (data.finishedGame) funcs.importKFWmodelForGameOver(data.gameData, false, true)
		else funcs.importKFWmodel(data.gameData, false, false)
		funcs.importCompressedGameData13(data.gameData1, data.gameData3)

		window.initData.move = data.move

		// Now check if we should be looking for moveData
		if (store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING) {
			funcs.importPlayerVIllageMoveData(personal.pov, window.initData.move)
		}

		personal.secondsToNextKickout = data.secondsToNextKickout
		personal.latestUpdate = data.latestUpdate

		window.initData.latestUpdate = data.latestUpdate
		window.initData.secondsToNextKickout = data.secondsToNextKickout
		window.initData.finishedGame = data.finishedGame
		window.initData.gameData = data.gameData
		window.initData.gameData1 = data.gameData1
		window.initData.gameData3 = data.gameData3

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
		const response = await fetch("/KFW/data/2/", {
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
		const response = await fetch("/KFW/saveNotes/", {
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

	store.clearMessages()

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
		const response = await fetch("/KFW/processKFWturn/", {
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
			funcs.importKFWmodel(data.gameData, false)
			funcs.importCompressedGameData13(data.gameData1, data.gameData3)
			personal.latestUpdate = data.latestUpdate
			window.initData.latestUpdate = data.latestUpdate

			// remove any pass flags
			for (let i = 0; i < store.players.length; i++) {
				store.players[i].passFlag = 1
			}

			model.addHistory(rf.HIST_REWIND, personal.pov, 0, [])

			// Re kick booted players
			for (let i = 0; i < data.missingPlayers.length; i++) {
				for (let j = 0; j < store.players.length; j++) {
					if (store.players[j].name == data.missingPlayers[i]) {
						store.players[j].displayName = rf.BOT_NAME
						//model.players[j].score = 0
					}
				}
			}

			store.clearContext()
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
		wsConnecting = WS.StartWebSocket()
	}

	store.viewSettings.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")
	// IF AT THE END OF NON-SIMUL PHASE, SET UP NEXT PLAYER
	let nextPlayer = [store.players[store.gameflow.turnOrder[0]].name]
	// But if simul, form the furn order
	if (controller.isSimulPhase(store.gameflow.phase)) {
		// Assume everyone can move except bots
		let playerIndexes = []
		for (let i = 0; i < store.players.length; i++) {
			if (store.players[i].displayName !== rf.BOT_NAME) playerIndexes.push(i)
		}
		// Now filter out people who don't need to move
		for (let i = playerIndexes.length - 1; i >= 0; i--) {
			let playerObj = store.players[playerIndexes[i]]
			if (store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING && playerObj.pendingVillageTiles.length === 0) playerIndexes.splice(i, 1)
		}

		store.gameflow.turnOrder = [...playerIndexes]
		let nextPlayerArr = []
		for (let i = 0; i < playerIndexes.length; i++) {
			nextPlayerArr.push(store.players[playerIndexes[i]].name)
		}
		nextPlayer = nextPlayerArr
	}

	// Remove any current move
	window.initData.move = ""
	//window.initData.currentPlayers = nextPlayer

	try {
		const response = await fetch("/KFW/processKFWturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "updateDataFromLoadRewind",
				turn: store.gameflow.turn,
				nextPlayer: nextPlayer, // USED > goes to currentPlayers
				gameID: personal.gameID,
				phase: store.gameflow.phase,
				gameData: funcs.exportKFWmodel(false),
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

		// Broadcast update
		WS.broadcastGameUpdate(wsConnecting).catch((err) => console.warn("Broadcast failed:", err))

		store.viewSettings.showLoader = false
		store.viewSettings.performingRewind = false
		Bot.removeBotPlayers()
		if (store.gameflow.turnOrder.length === 0) controller.endCurrentPhase()
		//if (store.gameflow.phase !== rf.PHASE_PRODUCTION && store.gameflow.phase !== rf.PHASE_MOVE_PIRATE) store.resetContext()
		controller.startPlayerTurn()
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
		const response = await fetch("/KFW/processKFWturn/", {
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
	store.viewSettings.showLoader = true
	let csrftoken = funcs.getCookie("csrftoken")

	var postData = {
		action: "kickout",
		gameID: personal.gameID,
		kickedName: controller.currentPlayerObj().name,
		latestUpdate: personal.latestUpdate,
	}

	try {
		const response = await fetch("/KFW/processKFWturn/", {
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

	let zoomLevel = store.refSize / 100

	try {
		const response = await fetch("/KFW/saveZoom/", {
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
		const response = await fetch("/KFW/data/3/", {
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
			if (store.gameflow.phase === rf.PHASE_GAME_OVER) funcs.importKFWmodelForGameOver(data.gameData, false, true)
			else funcs.importKFWmodel(data.gameData, false, false)
			window.initData.move = data.move
			funcs.importCompressedGameData13(data.gameData1, data.gameData3)
			personal.secondsToNextKickout = data.secondsToNextKickout
			personal.latestUpdate = data.latestUpdate
			store.viewSettings.showLoader = false
			controller.startPlayerTurn()
		}
	} catch (error) {
		console.error("Error fetching data:", error)
	}
}

export async function submitStatsExcludeConsent() {
	//const store = useModelStore()
	//const personal = usePersonalStore()
	//await simulateServer()
}

export function nudgeTourneyAdmins() {
	alert("Nudge")
}

export async function adminDataInspection() {
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.haltPlay = true
	store.viewSettings.showLoader = true
	personal.adminDataInspection = true

	let csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/KFW/processKFWturn/", {
			method: "POST",
			body: JSON.stringify({
				action: "adminDataInspection",
				gameID: personal.gameID,
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()

		funcs.importCompressedGameData13(data.gameData1, data.gameData3)
		personal.haltPlay = false
	} catch (error) {
		console.error("Error updating data:", error)
		store.gameMessages.errorText = "Error updating the game"
		store.viewSettings.performingRewind = false
		controller.startPlayerTurn()
	}
}
