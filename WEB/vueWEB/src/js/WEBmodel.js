/**
 * Contains functions that alter the game state,
 * IE anything that needs to be held in the "digital"
 * model.
 * So the functions in here should allow a replay of
 * the game to be re-created.
 * These should not directly update the "view" or
 * what the player sees.
 *
 * In general, it is better to provide all the required information
 * to the function (EG playerIndex, hexes) rather than relying
 * on knowing the currentPlayer.
 * This makes it possible to more easily recreate replays later.
 *
 */

/**
AVAILABLE FUNCTIONS
===================
initGame()
getTransporterByID(transporterID)
getResByID(resID)
getHexByID(hexID)
getEdgeDataFromHexID(hexID1, hexID2)
isHexIDshore(hexID)
addTransporterToGame(playerIndex, transporterType, hexID, vertex)
addResourceToGame(locationType, resource, locationData)
removeResourcesFromGameUsingVertex(hexID, vertex, resArr)
removeResourcesFromGameUsingTransporter(transporterID, resArr)
addBuildingToGame(buildingType, hexID, vertex)
addHistory(event, playerIndex, timeOffset, params)
addHexToMap+core(coord, hexTerrainID, rotation)
dropResourceOntoHex(resID, hexID, vertex)
showErrorPopup(clientX, clientY, htmlMessage)
updateAllHighlightsForTransporterMode()
highlightEligibleResourcesForTransporterPickup(transporterID)
highlightEligibleTransportersForTransporterDrop(transporterID)
highlightEligibleItemsForTransporterDrop(transporterID)
doesTransporterHaveAlreadyMovedResource(transporterID)
highlightEligibleHexAreasForTransporterMove(transporterID)
setupOptionsToDropHexDuringTM(resID, carriedTransporterID, hexID)
highlightEligibleTransportersForTransporterPickup(transporterID)
resourceCountByType(resourceTypes)
setEligibleBuildingsToBuild(playerIndex, transporterID)
doPrimaryProduction()
doSecondaryProduction(prePhase)


*/
import { useModelStore } from "../stores/WEBstore.js"
import { usePersonalStore } from "../stores/WEBpersonal.js"

import * as rf from "./WEBreference.js"
import * as map from "./WEBmap.js"
import * as controller from "./WEBcontroller.js"
import * as funcs from "./WEBfuncs.js"
import * as IO from "../backend/WEB_IO.js"
import * as WS from "../backend/WEBwebsocket.js"
import * as cb from "./WEBcables.js"
import * as view from "./WEBview.js"

export async function initGame() {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true

	// Set up all Data
	personal.gameID = window.initData.gameID
	store.gameName = window.initData.gameName
	personal.gameCreationTimestamp = window.initData.gameCreationTimestamp / 1000
	personal.finishedGame = window.initData.finishedGame
	if (window.initData.startingOptions.includes(102)) personal.trainingGame = true

	let zoomLevel = window.initData.myZoomLevel !== 0 ? window.initData.myZoomLevel * 10 : 50
	store.refSize = zoomLevel

	store.deleteVotesData = window.initData.deleteVotesData
	store.statsExcludeVotesData = window.initData.statsExcludeVotesData

	personal.liveWS = false

	// Set up logged in player, but not involved
	if (window.initData.pov === -9 || window.initData.pov === -1 || window.initData.pov >= 0) {
		personal.name = window.initData.name
		store.chatData = funcs.decompressChatData(window.initData.chatData)
		personal.latestUpdate = window.initData.latestUpdate
	}

	// If NOT your game, and NO game data, then game hasn't started
	if (window.initData.pov < 0 && window.initData.gameData === "") {
		// Create the <h1> element
		var heading = document.createElement("h1")
		// Set the text content of the <h1> element
		heading.textContent = "The game has not yet started"
		// Get a reference to the body element
		var body = document.body
		// Append the <h1> element to the body
		body.appendChild(heading)
		return
	}

	personal.pov = window.initData.pov
	// Set up Involved Player data
	if (personal.pov >= 0) {
		personal.liveWS = true

		personal.secondsToNextKickout = window.initData.secondsToNextKickout
		personal.myStatsExcludeConsent = window.initData.myStatsExcludeConsent
		personal.statsExcludedGame = window.initData.statsExcludedGame

		// Set up kickout timer / kickout options
		if (personal.kickoutCountdownIntervalTimer != undefined) clearInterval(personal.kickoutCountdownIntervalTimer)
		if (personal.secondsToNextKickout <= 1200) personal.kickoutCountdownIntervalTimer = setInterval(view.kickoutTimerTicker, 1000)
		if (window.initData.kickoutRequired > 0) {
			personal.kickoutRequired = window.initData.kickoutRequired
			if (personal.kickoutRequired === 1) {
				if (personal.finishedGame) funcs.importWEBmodel(window.initData.gameData, true)
				else funcs.importWEBmodel(window.initData.gameData, false)
				let KickoutFlexiDataArray = window.initData.KickoutFlexiDataArray
				let secondsIn24Hours = 24 * 60 * 60
				let playerSeconds = 0

				// Iterate over the KickoutFlexiDataArray to find the player's entry
				for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
					let entry = KickoutFlexiDataArray[i]

					// Check if the entry is a length-2 array and the first element matches the playerName
					if (Array.isArray(entry) && entry.length === 2 && entry[0] === controller.currentPlayerObj().name) {
						playerSeconds = entry[1]
						break
					}
				}
				let remainingFlexSecondsBeforeThisMove = secondsIn24Hours - playerSeconds
				personal.flexiSecondsToNextKickout = remainingFlexSecondsBeforeThisMove + personal.secondsToNextKickout

				personal.kickoutFlexiCountdownIntervalTimer = setInterval(view.kickoutFlexiTimerTicker, 1000)
			}
		} // END kickout settings

		personal.notes = funcs.htmlUnescape(window.initData.notes)

		if (window.initData.chatNotification) store.viewSettings.showChat = true
		personal.yourTurnAudioType = window.initData.yourTurnAudioType

		// Set up and save new game if there's no data
		if (window.initData.gameData === "") {
			/************************* SETUP GAME *************************/

			let COLOURS = funcs.shuffle([rf.BLACK, rf.BLUE, rf.WHITE, rf.YELLOW])

			COLOURS = funcs.shuffle(COLOURS)

			store.players.splice(0)
			for (let i = 0; i < window.initData.playerNames.length; i++) {
				store.players.push({
					name: window.initData.playerNames[i],
					displayName: "",
					colour: COLOURS[i],
					storedCables: 15,
					currentCables: 3,
					tileIDarrays: [],
				})
			} // End looping and inserting player names

			// Now insert display names
			for (let i = 0; i < store.players.length; i++) {
				if (store.players[i].name === "SHADOW" && window.initData.displayNames.length > 0) store.players[i].displayName = window.initData.displayNames[0]
				else if (store.players[i].name === "SHADOW_2" && window.initData.displayNames.length > 1) store.players[i].displayName = window.initData.displayNames[1]
				else if (store.players[i].name === "SHADOW_3" && window.initData.displayNames.length > 2) store.players[i].displayName = window.initData.displayNames[2]
				else if (store.players[i].name === "SHADOW_4" && window.initData.displayNames.length > 3) store.players[i].displayName = window.initData.displayNames[3]
				else if (store.players[i].name === "SHADOW_5" && window.initData.displayNames.length > 4) store.players[i].displayName = window.initData.displayNames[4]
				else store.players[i].displayName = store.players[i].name
			}

			// Set up the tiles
			let ALL_SQUARE_TILES = JSON.parse(JSON.stringify(rf.ALL_SQUARE_TILES))
			let ALL_RECT_TILES = JSON.parse(JSON.stringify(rf.ALL_RECT_TILES))
			let ALL_CORNER_TILES = JSON.parse(JSON.stringify(rf.ALL_CORNER_TILES))

			ALL_SQUARE_TILES = funcs.shuffle(ALL_SQUARE_TILES)
			ALL_RECT_TILES = funcs.shuffle(ALL_RECT_TILES)
			ALL_CORNER_TILES = funcs.shuffle(ALL_CORNER_TILES)

			for (let i = 0; i < store.players.length; i++) {
				store.players[i].tileIDarrays.push([ALL_SQUARE_TILES.pop(), 0])
				store.players[i].tileIDarrays.push([ALL_RECT_TILES.pop(), 0])
				store.players[i].tileIDarrays.push([ALL_CORNER_TILES.pop(), 0])
			}

			for (let i = 0; i < ALL_SQUARE_TILES.length; i++) {
				if (i % 2 === 0) store.SQUARE_PILE_1.push(ALL_SQUARE_TILES[i])
				else store.SQUARE_PILE_2.push(ALL_SQUARE_TILES[i])
			}

			for (let i = 0; i < ALL_RECT_TILES.length; i++) {
				if (i % 2 === 0) store.RECT_PILE_1.push(ALL_RECT_TILES[i])
				else store.RECT_PILE_2.push(ALL_RECT_TILES[i])
			}

			for (let i = 0; i < ALL_CORNER_TILES.length; i++) {
				if (i % 2 === 0) store.CORNER_PILE_1.push(ALL_CORNER_TILES[i])
				else store.CORNER_PILE_2.push(ALL_CORNER_TILES[i])
			}

			// Set up gameflow - per start tiles
			store.gameflow.fullTurnOrder = store.players.map((player, index) => index)
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			store.gameflow.phase = rf.PHASE_WHOLE_TURN

			// set start tile
			addTileToModel(-1, rf.TILE_CENTER, 0, -1, [2, 2])
			map.initCoords()

			personal.haltPlay = true
			await IO.saveGame(true, false)
		} // End NEW GAME
	} // end involved player

	// Otherwise, If there is load data, then load it
	if (window.initData.gameData !== "") {
		// FInally, impport data
		if (personal.finishedGame) {
			funcs.importWEBmodel(window.initData.gameData, true, false)
		} else funcs.importWEBmodel(window.initData.gameData, false, false)

		personal.votedToDelete = store.deleteVotesData[personal.name]
		personal.votedToExclude = store.statsExcludeVotesData[personal.name]
		// Go to replay mode if requested
		/*if (window.initData.spoilerFree) {
			// Enter replay mode at step 1
			store.viewSettings.showReplay = true
			store.replayResetData = funcs.exportKFWmodel(true) // FIZ

			// TURM ON
			await replay.generateReplayData(true)
		}*/
	}

	// Allow play
	personal.haltPlay = false

	if (personal.canPlay()) controller.startPlayerTurn()

	// start WS
	if (window.initData.pov >= 0) {
		WS.StartWebSocket().catch(() => {
			console.log("WebSocket background task initialized.")
		})
	}
} // end initGame

/**
 *
 * UTILITY FUNCTIONS
 *
 */

export function addHistory(event, playerIndex, timeOffset, params) {
	const personal = usePersonalStore()
	const store = useModelStore()

	let time = Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp + timeOffset)
	if (store.history.length > 0) {
		for (let i = 0; i < store.history.length; i++) {
			time -= store.history[i][2]
		}
	}
	store.history.push([event, playerIndex, time, [...params]])
}

export function getTileByID(tileID) {
	let tile = rf.ALL_TILES.find((tile) => tile.tileID === tileID)
	if (tile) return tile
	alert("No tile with ID " + tileID + " found")
}

export function getRotatedModel3d(tileID, rotation) {
	let tileData = getTileByID(tileID)
	let rotatedModel3d = []
	if (tileData.style === rf.TILE_STYLE_SQUARE) {
		if (rotation === 0) rotatedModel3d.push([tileData.model[0], tileData.model[1]], [tileData.model[2], tileData.model[3]])
		else if (rotation === 1) {
			rotatedModel3d.push([tileData.model[2], tileData.model[0]], [tileData.model[3], tileData.model[1]])
		} else if (rotation === 2) {
			rotatedModel3d.push([tileData.model[3], tileData.model[2]], [tileData.model[1], tileData.model[0]])
		} else if (rotation === 3) {
			rotatedModel3d.push([tileData.model[1], tileData.model[3]], [tileData.model[0], tileData.model[2]])
		}
	} else if (tileData.style === rf.TILE_STYLE_RECT) {
		if (rotation === 0) rotatedModel3d.push([tileData.model[0]], [tileData.model[1]])
		else if (rotation === 1) {
			rotatedModel3d.push([tileData.model[1], tileData.model[0]])
		} else if (rotation === 2) {
			rotatedModel3d.push([tileData.model[1]], [tileData.model[0]])
		} else if (rotation === 3) {
			rotatedModel3d.push([tileData.model[0], tileData.model[1]])
		}
	} else if (tileData.style === rf.TILE_STYLE_CORNER) {
		if (rotation === 0) {
			rotatedModel3d.push([tileData.model[0]], [tileData.model[1], tileData.model[2]])
		} else if (rotation === 1) {
			rotatedModel3d.push([tileData.model[1], tileData.model[0]], [tileData.model[2]])
		} else if (rotation === 2) {
			rotatedModel3d.push([tileData.model[2], tileData.model[1]], [rf.SQ_NOTHING, tileData.model[0]])
		} else if (rotation === 3) {
			rotatedModel3d.push([rf.SQ_NOTHING, tileData.model[2]], [tileData.model[0], tileData.model[1]])
		}
	}

	return rotatedModel3d
}

export function getActionsForTileID(tileID) {
	let tileData = getTileByID(tileID)
	return tileData.actions
}

export function anyEmptySupplyPile() {
	const store = useModelStore()
	if (store.SQUARE_PILE_1.length === 0) return true
	if (store.SQUARE_PILE_2.length === 0) return true
	if (store.RECT_PILE_1.length === 0) return true
	if (store.RECT_PILE_2.length === 0) return true
	if (store.CORNER_PILE_1.length === 0) return true
	if (store.CORNER_PILE_2.length === 0) return true
	return false
}

export function endGameConditionMet() {
	const store = useModelStore()
	if (anyEmptySupplyPile()) return true
	let nbPlayersWtihNoTiles = 0
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].tileIDarrays.length === 0) nbPlayersWtihNoTiles++
	}
	if (nbPlayersWtihNoTiles >= store.players.length - 1) return true
	return false
}

export function gameEndedLastManStanding() {
	const store = useModelStore()
	let nbNonPlayers = 0
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++
	}
	if (nbNonPlayers >= store.players.length - 1) return true
	return false
}

/*** End of Utility Functions */

export function addTileToModel(playerIndex, tileID, rotation, _clickedIndex, _clickedCoord) {
	const store = useModelStore()
	let index = _clickedIndex
	let coord = _clickedCoord
	if (index === -1) index = map.getIndexFromCoord(coord)
	else if (coord[0] === -1) coord = map.getCoordFromIndex(index)
	let tileData = getTileByID(tileID)

	index = map.convertMouseIndexToAnchorIndex(index, tileID, rotation)
	coord = map.getCoordFromIndex(index)
	let rotatedModel3d = getRotatedModel3d(tileID, rotation)

	// Add to map
	store.mapTiles.push({
		tileID: tileID,
		index: index, // The index is always the TOP/LEFT of the tile
		coord: coord,
		gfx: tileData.gfx,
		style: tileData.style,
		rotation: rotation, // This affects the inner coords and visuals
		rotatedModel3d: rotatedModel3d, // This is based off the index. Entry 0 is in top row, entry 1 is in bottom row
	})

	// Remove from player
	if (playerIndex !== -1) {
		store.players[playerIndex].tileIDarrays = store.players[playerIndex].tileIDarrays.filter((tile) => tile[0] !== tileID)
		addHistory(rf.HIST_ADD_TILE, playerIndex, 0, [index, tileID, rotation])
	}
	map.addSingleTileToCoords(store.mapTiles[store.mapTiles.length - 1])
	map.initCoords()
	store.clearMessages()
}

export function resetWholeTurn() {
	const store = useModelStore()
	store.resetContext()
	store.clearAllHighlights()
	store.clearMessages()
	store.undoPoints.splice(0)
	funcs.simpleImportWholeWEBmodel(store.wholeTurnResetData, true)
}

export function createUndoPoint() {
	const store = useModelStore()
	//store.context.justUndone = false
	store.undoPoints.push(funcs.simpleExportWholeWEBmodel())
}

export function undoLastAction() {
	const store = useModelStore()
	store.clearMessages()
	// 0 or 1 action is the same as a whole turn reset
	if (store.undoPoints.length === 0) {
		// || store.undoPoints.length === 1) {
		//resetWholeTurn()
		return
	}

	store.undoPoints.pop()
	// Get the next action
	let restorePoint = store.undoPoints[store.undoPoints.length - 1]
	funcs.simpleImportWholeWEBmodel(restorePoint, true)
	//store.context.action = rf.ACT_NONE
	store.clearHistoryHighlights()
}

export function addCablesToPlayer(playerIndex) {
	const store = useModelStore()
	store.clearMessages()
	addCablesToPlayer_core(playerIndex)
	store.context.remainingActions--
	addHistory(rf.HIST_ADD_CABLES, playerIndex, 0, [store.players[playerIndex].currentCables, store.players[playerIndex].storedCables])
	if (store.context.remainingActions > 0) store.context.action = rf.ACT_CHOOSE_ACTION
	else store.context.action = rf.ACT_CONFIRM_END_TURN
	createUndoPoint()
}

export function addCablesToPlayer_core(playerIndex) {
	const store = useModelStore()
	store.players[playerIndex].storedCables -= 3
	store.players[playerIndex].currentCables += 3
}

export async function addTileToPlayer(playerIndex, tileID) {
	const store = useModelStore()
	store.clearMessages()
	addTileToPlayer_core(playerIndex, tileID)
	store.context.remainingActions--
	addHistory(rf.HIST_GET_NEW_TILE, playerIndex, 0, [tileID])
	store.gameflow.phase = rf.PHASE_MID_ACTIONS
	store.undoPoints.splice(0)
	store.wholeTurnResetData = ""
	await IO.saveGame(true, true)
	if (store.context.remainingActions > 0) store.context.action = rf.ACT_CHOOSE_ACTION
	else store.context.action = rf.ACT_CONFIRM_END_TURN
	if (anyEmptySupplyPile()) store.context.action = rf.CONFIRM_GAME_END_EMPTY_SUPPLY
	createUndoPoint()
	store.context.action = rf.ACT_CHOOSE_ACTION
	store.wholeTurnResetData = funcs.simpleExportWholeWEBmodel()
}

export function addTileToPlayer_core(playerIndex, tileID) {
	const store = useModelStore()
	// Add to player
	store.players[playerIndex].tileIDarrays.push([tileID, 0])
	// Remove from available
	store.SQUARE_PILE_1 = store.SQUARE_PILE_1.filter((tile) => tile !== tileID)
	store.SQUARE_PILE_2 = store.SQUARE_PILE_2.filter((tile) => tile !== tileID)
	store.RECT_PILE_1 = store.RECT_PILE_1.filter((tile) => tile !== tileID)
	store.RECT_PILE_2 = store.RECT_PILE_2.filter((tile) => tile !== tileID)
	store.CORNER_PILE_1 = store.CORNER_PILE_1.filter((tile) => tile !== tileID)
	store.CORNER_PILE_2 = store.CORNER_PILE_2.filter((tile) => tile !== tileID)
}

export function addCableToMap(playerIndex, index, rotation) {
	const store = useModelStore()
	store.clearMessages()
	addCableToMap_core(playerIndex, index, rotation)
	store.context.remainingActions--
	let remainingActions = store.context.remainingActions

	if (rotation === 0) addHistory(rf.HIST_ADD_CABLE_TO_MAP, controller.currentPlayerIndex(), 0, [index])
	else addHistory(rf.HIST_ADD_CABLE_TO_MAP, controller.currentPlayerIndex(), 0, [index, 1])

	store.resetContext()
	store.clearAllHighlights()
	if (remainingActions > 0) {
		store.context.remainingActions = remainingActions
		store.context.action = rf.ACT_CHOOSE_ACTION
	} else store.context.action = rf.ACT_CONFIRM_END_TURN
	createUndoPoint()
}

export function addCableToMap_core(playerIndex, index, rotation) {
	const store = useModelStore()
	let secondIndex = index + (rotation === 0 ? store.gridWidth : 1)
	store.cables.push({
		playerIndex: playerIndex,
		indexes: [index, secondIndex],
		rotation: rotation,
		coord: [map.getCoordFromIndex(index)[0], map.getCoordFromIndex(index)[1]],
	})
	store.players[playerIndex].currentCables--
}

export function revealedHiddenInformationForRewind() {
	const store = useModelStore()
	// If you are placing a tile, then there's no hidden info to rewind from
	if (store.context.action === rf.ACT_CHOOSE_INTIIAL_TILE) return false
	let ENTRIES_TO_IGNORE = [rf.HIST_REWIND, rf.HIST_RESIGN, rf.HIST_KICKOUT, rf.HIST_ADD_CABLES, rf.HIST_ADD_CABLE_TO_MAP]
	let idx = store.history.length - 1
	while (idx > 0 && ENTRIES_TO_IGNORE.includes(store.history[idx][0])) idx--
	// If you just took a tile, it would reveal hidden info
	if (idx > 0 && store.history[idx][0] === rf.HIST_GET_NEW_TILE) return true
	return false
}

export function endGame() {
	const store = useModelStore()
	store.gameflow.phase = rf.PHASE_GAME_OVER
	endGame_core()
	IO.saveGame(false, false)
}

export function endGame_core() {
	const store = useModelStore()
	store.gameflow.phase = rf.PHASE_GAME_OVER

	// Create an array of player objects with their original index
	const playerScores = store.players.map((player, index) => ({
		index: index,
		finalScore: cb.getScore(index),
	}))

	// Sort the player scores in descending order of finalScore
	playerScores.sort((a, b) => b.finalScore - a.finalScore)

	const result = []
	let currentGroup = []

	for (let i = 0; i < playerScores.length; i++) {
		const currentPlayer = playerScores[i]

		if (currentGroup.length === 0) {
			// Start a new group
			currentGroup.push(currentPlayer.index)
		} else {
			const previousPlayer = playerScores[i - 1]
			if (currentPlayer.finalScore === previousPlayer.finalScore) {
				// Add to the current group if scores are equal
				currentGroup.push(currentPlayer.index)
			} else {
				// Start a new group if scores are different
				result.push(currentGroup)
				currentGroup = [currentPlayer.index]
			}
		}
	}

	// Add the last group to the result
	if (currentGroup.length > 0) {
		result.push(currentGroup)
	}
	store.context.finalPositions = [...result]
	return result
}
