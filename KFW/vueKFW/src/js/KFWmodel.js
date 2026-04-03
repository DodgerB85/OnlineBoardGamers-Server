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
 * to the function (EG playerObj, hexes) rather than relying
 * on knowing the currentPlayer.
 * This makes it possible to more easily recreate replays later.
 *
 */
import { useModelStore } from "../stores/KFWstore.js"
import { usePersonalStore } from "../stores/KFWpersonal.js"

import * as rf from "./KFWreference.js"
import * as map from "./KFWmap.js"
import * as controller from "./KFWcontroller.js"
import * as funcs from "./KFWfuncs.js"
import * as IO from "../backend/KFW_IO.js"
import * as WS from "../backend/KFWwebsocket.js"
import * as view from "./KFWview.js"
import * as village from "./KFWvillage.js"
import * as rules from "./KFWrules.js"

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

export function createUndoPoint() {
	const store = useModelStore()
	//store.context.justUndone = false
	store.undoPoints.push(funcs.simpleExportWholeKFWmodel())
}

export function undoLastAction() {
	const store = useModelStore()

	// 0 or 1 action is the same as a whole turn reset
	if (store.undoPoints.length === 0) {
		// || store.undoPoints.length === 1) {
		resetWholeTurn()
		return
	}

	store.undoPoints.pop()
	// Get the next action
	let restorePoint = store.undoPoints[store.undoPoints.length - 1]
	funcs.simpleImportWholeKFWmodel(restorePoint, true)
	//store.context.action = rf.ACT_NONE
	store.clearHistoryHelpers()
}

export async function resetWholeTurn() {
	const store = useModelStore()

	store.clearContext()
	store.clearHistoryHelpers()

	store.clearMessages()

	await funcs.importKFWmodel(store.wholeTurnResetData, true)
	controller.startPlayerTurn()

	store.undoPoints.splice(0)
	store.context.endTurnActions.splice(0)
	store.context.localEndTurnActions.splice(0)

	createUndoPoint()
}

export function rotateTileMultipleTimes(tile, dir, amount) {
	//const store = useModelStore()
	tile.rotation = (tile.rotation + dir * amount + 6) % 6
	//store.context.newTileGhostData.rotation = tile.rotation
	if (dir === 1) {
		for (let i = 0; i < amount; i++) tile.sides.unshift(tile.sides.pop())
	} else if (dir === -1) {
		for (let i = 0; i < amount; i++) tile.sides.push(tile.sides.shift())
	}
	return tile.rotation
}

export async function initGame() {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true

	//window.initData.gameData = 'H4sIAAAAAAAAA3VTyWpDMQz8l5xVsLz7WvoX5h0KCb2UFgL9/87Ijt1HKNm0vdFImvTeL9ef++3r+v55kT9mEHVOnPSeDuken/nGR8XbS2FXUS9NNBziHfzL2/f143Z/BdiyVDQPrMinn7AMD3YWjZJEUZEdkz1EJLvZydGk5cvDigFPdkAf9AJNott3EdKB/YL2qdVijlpls2DxiWxIguyiqw24bDljqKnBOrtVpa1GoxBWEWHAJFrAo6a5GAeLEVFg6wokNnc7H+DkyHjIM6BSKzCljIpIdqFxQj8DKqXY8szHrFJqRo80feQBYNua7RY71TO3cGbmd7Y9MVXJ7Ko+LWK+bh7klTZN0mq2QXMTm6F5H0fQzAWXqYrYJNZ5xtEVOz0W6ZjOpNu/63wmDcuVzE2o95t3YmTzVl5x+hl5SAa/Q/6Bk9jjEkj2xW8ZWZXugR4yj5UeV4XbjQFPvmFQoVxYllAOZClZSKFAMbaPGVJODSIUoLebdo5ivknT4YpZCuH2v0tM+zj88QuFVMuh5gMAAA=='

	// Set up all Data
	personal.gameID = window.initData.gameID
	store.gameName = window.initData.gameName
	personal.gameCreationTimestamp = window.initData.gameCreationTimestamp / 1000
	personal.finishedGame = window.initData.finishedGame
	if (window.initData.startingOptions.includes(102)) personal.trainingGame = true
	/*let gameData3 = funcs.decompressData(window.initData.gameData3)
	store.availableMeeples = gameData3[0]
	store.availableSkills = gameData3[1]*/

	store.refSize = window.initData.myZoomLevel * 100

	personal.liveWS = false

	// Set up logged in player, but not involved
	if (window.initData.pov === -9 || window.initData.pov >= 0) {
		personal.name = window.initData.name
		store.chatData = funcs.decompressChatData(window.initData.chatData)
		personal.latestUpdate = window.initData.latestUpdate
	}

	// If NOT your game, and NO game data, then game hasn't started
	if (window.initData.pov < 0 && window.initData.gameData === "") {
		store.viewSettings.errorText = "The game has not yet started"
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
				if (personal.finishedGame) funcs.importKFWmodelForGameOver(window.initData.gameData)
				else funcs.importKFWmodel(window.initData.gameData, false)
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

		// Set up and save new game
		if (window.initData.gameData === "") {
			/************************* SETUP GAME *************************/
			// Home tiles don't change
			const HOME_TILES = funcs.shuffle(rf.ALL_TILES.filter((tile) => tile.season === rf.SEASON_HOME_TILE))
			// Available Winter Tiles depends on settings
			const WINTER_TILES = rules.getInitialWinterTileOptions()

			let COLOURS = funcs.shuffle([rf.PLAYER_COLOUR_0, rf.PLAYER_COLOUR_1, rf.PLAYER_COLOUR_2, rf.PLAYER_COLOUR_3])
			/*
				if (colour === 0) return "#84C3E2" // blue // 3474a9
				if (colour === 1) return "#3E7139" // green // red // a12529
				if (colour === 2) return "#D65A1E" // orange // f67112
				if (colour === 3) return "#92385C" // purple
				if (colour === 4) return "#808080" // grey //"#C28727" //"#ECC81C";// yellow // ece334
				if (colour === 5) return "#000000" //black // orange
				ONLY ADD GREY / BLACK FOR 5+ PLAYERS
			*/
			if (window.initData.playerNames.length >= 5) COLOURS.push(rf.PLAYER_COLOUR_4)
			if (window.initData.playerNames.length >= 6) COLOURS.push(rf.PLAYER_COLOUR_5)

			COLOURS = funcs.shuffle(COLOURS)

			store.players.splice(0)
			for (let i = 0; i < window.initData.playerNames.length; i++) {
				store.players.push({
					name: window.initData.playerNames[i],
					displayName: "",
					colour: COLOURS[i],

					hiddenWinterTile_tileIDs: [], // This is just tile.id

					hiddenContracts: [], // object copies; but only need the objects in final scoring
					villageTiles: [], // stores your village, along with hex co-ords
					villageCanvasSize: [162.5, 162.5], // Size of player village
					villageRefSize: 2400,
					pendingVillageTiles: [], // tile objects
					hasPurpleMeeple: false, // Given in TO setup
					villageNeighbours: [],
					placeableVillageCoords: [],
					finalScore: 0,
					requireItmesScore: 0,
					autoScoreScore: 0,
					manualScoreScore: 0,
					contractScore: 0,
					goldScore: 0,
					passFlag: 1,

					// Tracking Data
					knownHiddenMeeples: [0, 0, 0, 0, 8], // NB the last entries here are the unknown incomes
					knownHiddenSkillTiles: [0, 0, 0, 0],

					// DATA FROM SERVER
					hiddenMeeples: [0, 0, 0, 0], // B / R / Y / G
					hiddenSkillTiles: [0, 0, 0], // SAW / PICKAXE / ANVIL
					hiddenHistory: [], // History objects
				})

				// Deal winter tiles to each player
				let winterTileAmount = 2
				if (window.initData.playerNames.length <= 4) winterTileAmount = 3
				if (store.useMerchantsExpansion) {
					winterTileAmount = 2
					if (window.initData.playerNames.length <= 5) winterTileAmount = 3
					if (window.initData.playerNames.length <= 3) winterTileAmount = 4
				}
				for (let j = 0; j < winterTileAmount; j++) store.players[i].hiddenWinterTile_tileIDs.push(WINTER_TILES.pop().tileID[0])
			} // End looping and inserting player names

			// Each player gets random home tile - but turn order was decided by server. So give in ascending order - player[0] also gets purple meeple
			let availableHomeTiles = []
			for (let i = 0; i < store.players.length; i++) availableHomeTiles.push(HOME_TILES.pop())
			availableHomeTiles.sort((a, b) => {
				return a.tileID[0] - b.tileID[0]
			})
			for (let i = 0; i < store.players.length; i++) {
				store.players[i].villageTiles.push(JSON.parse(JSON.stringify(availableHomeTiles[i])))
				map.calculateCanvasSizeForPlayerVillage(i, false)
			}

			// Now insert display names
			for (let i = 0; i < store.players.length; i++) {
				if (store.players[i].name === "SHADOW" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[0]
				else if (store.players[i].name === "SHADOW_2" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[1]
				else if (store.players[i].name === "SHADOW_3" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[2]
				else if (store.players[i].name === "SHADOW_4" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[3]
				else if (store.players[i].name === "SHADOW_5" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[4]
				else store.players[i].displayName = store.players[i].name
			}

			// Set up gameflow - per start tiles
			store.gameflow.fullTurnOrder = store.players.map((player, index) => index)
			store.gameflow.fullTurnOrder.sort((a, b) => {
				return store.players[a].villageTiles[0].tileID[0] - store.players[b].villageTiles[0].tileID[0]
			})
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			// Give the purple meeple
			store.players[store.gameflow.fullTurnOrder[0]].hasPurpleMeeple = true

			store.gameflow.season = rf.SPRING

			// SET UP CONTRACTS FIRST TO ALLOW THEM ON THE BOAT
			// setup the Contracts
			store.hiddenContracts.splice(0)
			store.visibleContracts.splice(0)
			for (let i = 0; i < rf.ALL_CONTRACTS.length; i++) {
				store.hiddenContracts.push(rf.ALL_CONTRACTS[i].id)
			}
			store.hiddenContracts = funcs.shuffle(store.hiddenContracts)

			await rules.setupBoatTiles()

			//Use the number and side of turn order tiles according to the number of players
			store.availableTurnOrderTiles = rf.ALL_TILES.filter((tile) => tile.season === rf.SEASON_TURN_ORDER_TILE && tile.minPlayers <= store.players.length && tile.maxPlayers >= store.players.length)

			rules.setupSeasonTiles(rf.SPRING)

			// Set up the game start
			//addHistory(rf.HIST_NEW_GAME, -1, 0, [])

			store.context.historyObj.splice(0)
			for (let i = 0; i < store.availableTiles.length; i++) store.context.historyObj.push(store.availableTiles[i].id)

			addHistory(rf.HIST_SEASON_TILES, -1, 0, [rf.SPRING, ...store.context.historyObj])
			store.context.historyObj.splice(0)

			// Do this now, so the history is 3rd
			// Draw 3 contracts (function checks for merchants)
			dealVisibileContracts()
		} // End NEW GAME
	} // end involved player

	// Save game if no existing data
	if (window.initData.gameData === "") {
		await IO.saveGame(true, false)
		personal.haltPlay = true
	}
	// Oteherwise load the game
	else {
		// FInally, impport data
		if (personal.finishedGame) {
			funcs.importKFWmodelForGameOver(window.initData.gameData)
			for (let i = 0; i < store.players.length; i++) scoreAutoProcessingTilesAndMoveResources(i)
		} else funcs.importKFWmodel(window.initData.gameData, false)
		// If you have a move, import that too for the visuals
		if (window.initData.move !== "" && personal.pov >= 0) {
			if (store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING || store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING || store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES) funcs.importPlayerVIllageMoveData(personal.pov, window.initData.move)
		}
		// get current players
		if (controller.isSimulPhase(store.gameflow.phase) || store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
			// rebuild the turnOrder from the names
			let currentNames = window.initData.currentPlayers.map((name) => name.trim())
			store.gameflow.turnOrder.splice(0)
			for (let i = 0; i < currentNames.length; i++) {
				for (let j = 0; j < store.players.length; j++) {
					if (currentNames[i] === store.players[j].name) store.gameflow.turnOrder.push(j)
				}
			}
			// If training game and in final scoring, always work through in numerical order
			if (personal.trainingGame && store.gameflow.phase === rf.PHASE_FINAL_SCORING) store.gameflow.turnOrder.sort((a, b) => a - b)
		}

		doturnStartHighlights()
		// Go to replay mode if requested
		/*if (window.initData.spoilerFree) {
			// Enter replay mode at step 1
			store.viewSettings.showReplay = true
			store.replayResetData = funcs.exportKFWmodel(true) // FIZ

			// TURM ON
			await replay.generateReplayData(true)
		}*/
	}

	// Now insert data1/3
	if (!window.initData.finishedGame) funcs.importCompressedGameData13(window.initData.gameData1, window.initData.gameData3)
	// start WS
	if (window.initData.pov >= 0) await WS.StartWebSocket()
	// Allow play
	personal.haltPlay = false

	// Set up pre phase to allow canPlay
	if (!personal.trainingGame && store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES && !store.gameflow.turnOrder.includes(personal.pov) && store.players[personal.pov].pendingVillageTiles.length > 0) {
		// NB if you refresh the page you will have pending village tiles, but not visible
		if (!IO.DEBUG_USERS.includes(personal.name) && personal.pov >= 0 && window.initData.move == "") store.gameflow.phase = rf.PRE_PHASE_VILLAGE_EXPANDING
	}
	if (personal.canPlay()) controller.startPlayerTurn()
} // end initGame

export function doturnStartHighlights() {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.turnStartHighlights.bidAreas.splice(0)
	store.turnStartHighlights.actionAreas.splice(0)

	// Now highlight meeple actions since your last turn
	if (!personal.trainingGame && controller.currentPlayerIndex() === personal.pov && store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		for (let i = store.history.length - 1; i >= 0; i--) {
			// If it hits a move you made, then break
			if (store.history[i][1] === personal.pov) break
			// Bid on tile, highlight the bidding area

			if (store.history[i][0] === rf.HIST_BID_ON_TILE) {
				let tileID = store.history[i][3][0]
				let tile = rf.ALL_TILES.find((t) => t.tileID.includes(tileID))
				let tile_id = tile.id
				let playerIndex = store.history[i][1]

				let index = store.turnStartHighlights.bidAreas.findIndex((subArr) => subArr[0] === tile_id)
				if (index === -1) store.turnStartHighlights.bidAreas.push([tile_id, playerIndex])
				else store.turnStartHighlights.bidAreas[index].push(playerIndex)
			} else if (store.history[i][0] === rf.HIST_ACT_ON_TILE) {
				let tileID = store.history[i][3][0]
				let tile = rf.ALL_TILES.find((t) => t.tileID.includes(tileID))
				let tile_id = tile.id
				let index = store.turnStartHighlights.actionAreas.findIndex((subArr) => subArr[0] === tile_id)
				if (index === -1) store.turnStartHighlights.actionAreas.push([tile_id])
				else store.turnStartHighlights.actionAreas[index].push(tile_id)
			}
		}
	}
}

export function resetCoreMeepleColours() {
	const store = useModelStore()
	// Reset Turn Order Tiles
	for (let i = 0; i < store.availableTurnOrderTiles.length; i++) store.availableTurnOrderTiles[i].coreMeepleColour = rf.MEEPLE_NONE
	// Reset Village Tiles
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].villageTiles.length; j++) {
			store.players[i].villageTiles[j].coreMeepleColour = rf.MEEPLE_NONE
			if (store.players[i].villageTiles[j].extension !== rf.EXTENSION_NONE && store.players[i].villageTiles[j].extension !== rf.EXTENSION_BANNED) {
				let extension = rf.ALL_EXTENSIONS.find((ext) => ext.id === store.players[i].villageTiles[j].extension)
				store.players[i].villageTiles[j].coreMeepleColour = extension.colour
			}
		}
	}
}

export function dealVisibileContracts() {
	const store = useModelStore()
	if (!store.useMerchantsExpansion) return
	let histObj = []
	while (store.visibleContracts.length < 3 && store.hiddenContracts.length > 0) {
		let newContract = store.hiddenContracts.pop()
		store.visibleContracts.push(newContract)
		histObj.push(newContract)
	}
	if (histObj.length > 0) addHistory(rf.HIST_NEW_CONTRACTS, -1, 0, [...histObj])
}

export function deductHiddenMeeple(playerIndex, colour) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	if (playerObj.knownHiddenMeeples[colour] > 0) playerObj.knownHiddenMeeples[colour]--
	else playerObj.knownHiddenMeeples[4]--
}

export function deductHiddenSkillTile(playerIndex, skill) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	if (playerObj.knownHiddenSkillTiles[skill] > 0) playerObj.knownHiddenSkillTiles[skill]--
	else playerObj.knownHiddenSkillTiles[3]--
}

// find and locate a tile object in the game
export function getTile(tile_id) {
	const store = useModelStore()
	let tile = store.availableTiles.find((tile) => tile.id === tile_id)
	if (tile) return tile

	tile = store.availableTurnOrderTiles.find((tile) => tile.id === tile_id)
	if (tile) return tile

	tile = store.availableBoatTiles.find((tile) => tile.id === tile_id)
	if (tile) return tile

	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].villageTiles.length; j++) {
			if (store.players[i].villageTiles[j].id === tile_id) return store.players[i].villageTiles[j]
		}
	}
	alert(`No tile found with id ${tile_id}`)
}

export function getTileFromTileID(tileID) {
	const store = useModelStore()
	let tileIndex = store.availableTurnOrderTiles.findIndex((x) => x.tileID.includes(tileID))
	if (tileIndex !== -1) return store.availableTurnOrderTiles[tileIndex]
	tileIndex = store.availableBoatTiles.findIndex((x) => x.tileID.includes(tileID))
	if (tileIndex !== -1) return store.availableBoatTiles[tileIndex]
	tileIndex = store.availableTiles.findIndex((x) => x.tileID.includes(tileID))
	if (tileIndex !== -1) return store.availableTiles[tileIndex]
	for (let i = 0; i < store.players.length; i++) {
		tileIndex = store.players[i].villageTiles.findIndex((x) => x.tileID.includes(tileID))
		if (tileIndex !== -1) return store.players[i].villageTiles[tileIndex]
	}
	alert("Tile not found from tileID")
	return null
}

// Pull meeples from the bag, return these as an array, and save the remaining bag
/*export function pullMeeplesFromBag(numMeeples) {
	const store = useModelStore()
	const availableColors = store.meepleBag.reduce((acc, count, index) => {
		return acc.concat(Array(count).fill(index))
	}, [])

	const pulledMeeples = []
	for (let i = 0; i < numMeeples; i++) {
		if (availableColors.length === 0) break

		const randomIndex = Math.floor(Math.random() * availableColors.length)
		const randomMeeple = availableColors.splice(randomIndex, 1)[0]
		pulledMeeples.push(randomMeeple)
	}

	// Update the store with the remaining meeples
	store.meepleBag = availableColors.reduce(
		(acc, color) => {
			acc[color] += 1
			return acc
		},
		[0, 0, 0, 0]
	)

	return pulledMeeples
}

// Pull skills from the bag, return these as an array, and save the remaining bag
export function pullSkillTilesFromBag(numSkills) {
	const store = useModelStore()
	const availableSkills = store.skillTileBag.reduce((acc, count, index) => {
		return acc.concat(Array(count).fill(index))
	}, [])

	const pulledSkills = []
	for (let i = 0; i < numSkills; i++) {
		if (availableSkills.length === 0) break

		const randomIndex = Math.floor(Math.random() * availableSkills.length)
		const randomSkill = availableSkills.splice(randomIndex, 1)[0]
		pulledSkills.push(randomSkill)
	}

	// Update the store with the remaining meeples
	store.skillTileBag = availableSkills.reduce(
		(acc, color) => {
			acc[color] += 1
			return acc
		},
		[0, 0, 0]
	)

	return pulledSkills
}*/

// Returns a flag - 0 = Unable right now (not your turn / no action), 1 = ineligible right now (meeple colour / tile full), 2 = true
export function canPutMeeplesOnTile(playerIndex, tile, ignoreMeeples) {
	const store = useModelStore()
	const personal = usePersonalStore()

	// Check you can play and the tile accepts meeples
	if (!personal.canPlay()) return 0
	if (rf.TILE_NO_ACTION.includes(tile.tileID[0])) return 0
	if (store.gameflow.phase !== rf.PHASE_BIDDING_AND_ACTIONS) return 0
	if (!ignoreMeeples && store.context.action !== rf.ACT_NONE) return 0

	// Check if there is space on the tile
	let minMeeplesRequired = 1
	let totalMeeplesOnTile = 0
	for (let i = 0; i < tile.meeplesOnTile.length; i++) {
		totalMeeplesOnTile += tile.meeplesOnTile[i].length
	}
	if (tile.meeplesOnTile.length > 0) {
		// If there are already meeples on the tile, you must add at least 1 more
		minMeeplesRequired = tile.meeplesOnTile[tile.meeplesOnTile.length - 1].length + 1
		// SET CONTEXT BASED ON FIRST MEEPLE IN FIRST ARRAY
	}
	if (!ignoreMeeples && totalMeeplesOnTile + minMeeplesRequired > 6) return 1

	// Now there is space on the tile, make sure you have enough meeples
	let coreMeepleColour = tile.coreMeepleColour
	// But if you have boat4b you can use any colour
	if (village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT4_B)) coreMeepleColour = rf.MEEPLE_NONE
	if (!ignoreMeeples && !doesPlayerHaveMeepleColours(playerIndex, coreMeepleColour, minMeeplesRequired)) return 1

	// Check you can actually perform the action
	if (!doesPlayerHaveResourcesForTileAction(playerIndex, tile)) return 1

	store.context.meepleActionFound = true
	return 2
}

// NOTE: you can click a tile in various ways from various components. So have the function here so they can all reach it
export function clickedtileArea(tile, tileArea) {
	const store = useModelStore()
	store.removeAllActiveHighlights()
	store.turnStartHighlights.bidAreas.splice(0)
	store.turnStartHighlights.actionAreas.splice(0)
	unhighlightOutbidMeeples()
	let playerIndex = controller.currentPlayerIndex()

	store.context.action = rf.ACT_CHOOSE_MEEPLES
	store.context.coreMeepleColour = tile.coreMeepleColour
	if (store.context.coreMeepleColour === rf.MEEPLE_NONE) store.context.stopBoat4b = true
	store.context.selectedTile = tile
	store.context.selectedTileArea = tileArea
	store.context.historyObj.splice(0)

	if (tileArea === rf.TILE_ACTION_AREA) {
		store.context.minMeeplesRequired = 1
		if (tile.meeplesOnTile.length > 0) {
			// If there are already meeples on the tile, you must add at least 1 more
			store.context.minMeeplesRequired = tile.meeplesOnTile[tile.meeplesOnTile.length - 1].length + 1
		}

		// Now check boat 4b eligibility
		// SET CONTEXT BASED ON FIRST MEEPLE IN FIRST ARRAY
		if (tile.bids.some((subArr) => subArr[0].length > 0) || (tile.meeplesOnTile.length > 0 && tile.meeplesOnTile[tile.meeplesOnTile.length - 1].length > 0)) {
			// NO - this breaks with boat 4b using any colour
			//store.context.coreMeepleColour = tile.meeplesOnTile[tile.meeplesOnTile.length - 1][0]
			// Unless you have boat4b, then you can use any colour
			if (village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT4_B)) store.context.coreMeepleColour = rf.MEEPLE_NONE
			store.context.boat4bEligible = true
		}

		store.context.historyObj.push(tile.tileID[tile.upgraded])
	} else if (tileArea === rf.TILE_BIDDING_AREA) {
		//store.context.minMeeplesRequired = Math.max(1, tile.bids.reduce((max, currentBid) => Math.max(max, currentBid[0]), tile.bids[0][0].length) + 1)
		//store.context.minMeeplesRequired = Math.max(1, tile.bids.reduce((max, bid, i, arr) => (bid[0].length > arr[max][0].length ? i : max), 0) + 1)
		store.context.minMeeplesRequired = Math.max(1, tile.bids[tile.bids.reduce((maxIndex, bid, currentIndex, arr) => (bid[0].length > arr[maxIndex][0].length ? currentIndex : maxIndex), 0)][0].length + 1)
		// Now subtract your existing bid
		store.context.minMeeplesRequired = Math.max(store.context.minMeeplesRequired - tile.bids[controller.currentPlayerIndex()][0].length, 1)

		// If you have boat 4a, AND someone else has bid in B/Y/G, then allow different colour counter / or must use new colour
		if (village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT4_A)) {
			// If you have already bid, xhange the colour to your colour
			if (tile.bids[playerIndex][0].length > 0) store.context.coreMeepleColour = tile.bids[playerIndex][0][0]
			// But you cannot counterbid against green
			else if (store.context.coreMeepleColour !== rf.MEEPLE_GREEN) store.context.coreMeepleColour = rf.MEEPLE_NONE
			//else store.context.coreMeepleColour = rf.MEEPLE_NONE
		}
		store.context.historyObj.push(tile.tileID[tile.upgraded])
	}

	// Set the meeple popup
	store.meeplePopupSetter.showPopup = true

	highlightEligibleOutbidMeeples(controller.currentPlayerIndex())
}

// This only actions OUTBID meeples highlights
function highlightEligibleOutbidMeeples(playerIndex) {
	const store = useModelStore()
	store.meeplePopupSetter.outbidMeepleInfo.splice(0)
	let allTiles = store.availableTiles.concat(store.availableTurnOrderTiles)

	for (let i = 0; i < allTiles.length; i++) {
		let currentTile = allTiles[i]
		if (isPlayerOutbidOnTile(playerIndex, currentTile) && rf.ACT_MEEPLE_HIGHLIGHTING.includes(store.context.action) && playerIndex === controller.currentPlayerIndex()) {
			// Don't highlight if it's the wrong colour
			if (store.context.coreMeepleColour !== rf.MEEPLE_NONE && currentTile.bids[playerIndex][0].length > 0 && store.context.coreMeepleColour !== currentTile.bids[playerIndex][0][0]) {
				currentTile.bids[playerIndex][1] = `none`
				continue
			}
			// Don't highlight if moving them would over-fill the tile
			if (store.context.selectedTileArea === rf.TILE_ACTION_AREA) {
				let outbidMeepleArrayLength = currentTile.bids[playerIndex][0].length
				if (store.context.selectedTile.meeplesOnTile.reduce((sum, subarray) => sum + subarray.length, 0) + outbidMeepleArrayLength > 6) {
					currentTile.bids[playerIndex][1] = `none`
					continue
				}
			}
			currentTile.bids[playerIndex][1] = `selectableBidMeeple`
			// Add this info to the meeplePopup
			store.meeplePopupSetter.outbidMeepleInfo.push([currentTile.id, currentTile.bids[playerIndex][0][0], currentTile.bids[playerIndex][0].length, currentTile.name[currentTile.upgraded]])
		} else {
			currentTile.bids[playerIndex][1] = `none`
		}
	}
}

export function unhighlightOutbidMeeples() {
	const store = useModelStore()
	for (let i = 0; i < store.availableTurnOrderTiles.length; i++) {
		for (let j = 0; j < store.availableTurnOrderTiles[i].bids.length; j++) {
			store.availableTurnOrderTiles[i].bids[j][1] = `none`
		}
	}
	for (let i = 0; i < store.availableTiles.length; i++) {
		for (let j = 0; j < store.availableTiles[i].bids.length; j++) {
			store.availableTiles[i].bids[j][1] = `none`
		}
	}
}

export function isPlayerOutbidOnTile(playerIndex, tile) {
	const store = useModelStore()
	let currentTile = tile
	if (currentTile.bids[playerIndex][0].length > 0) {
		let eligible = true
		let highestBid = currentTile.bids[currentTile.bids.reduce((maxIndex, bid, currentIndex, arr) => (bid[0].length > arr[maxIndex][0].length ? currentIndex : maxIndex), 0)][0].length

		// Don't count as "outbid" if you are adding back to the same tile
		if (currentTile.id === store.context.selectedTile.id && store.context.selectedTileArea === rf.TILE_BIDDING_AREA) eligible = false
		else if (currentTile.bids[playerIndex][0].length === highestBid) eligible = false

		//else if (store.context.coreMeepleColour !== currentTile.bids[playerIndex][0][0] && store.context.coreMeepleColour !== rf.MEEPLE_NONE) eligible = false

		if (eligible) {
			return true
		} else {
			return false
		}
	}

	// Otherwise, player has no meeples, so return false - not outbid
	return false
}

export function doesPlayerHaveMeepleColours(playerIndex, colour, amount) {
	const store = useModelStore()
	let requiredAmount = amount
	//console.log(`Starting check: player ${playerIndex} has ${store.players[playerIndex].hiddenMeeples[colour]} ${colour} meeples`)
	// If colour isn't set, check each colour in turn
	if (colour === rf.MEEPLE_NONE) {
		// You could be here if you have boat 4b. So check if you have boat 4b, and then just check total meeples
		if (village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT4_B)) {
			let totalMeeples = store.players[playerIndex].hiddenMeeples.reduce((sum, entry) => sum + entry, 0)
			if (totalMeeples >= requiredAmount) return true
			// BUT ALSO NEED TO CHECK OUT BID MEEPLES
			// So now check OUTBID bids on turnOrder tiles
			for (let i = 0; i < store.availableTurnOrderTiles.length; i++) {
				if (isPlayerOutbidOnTile(playerIndex, store.availableTurnOrderTiles[i])) {
					store.context.meepleActionFound = true
					return true
				}
			}

			// So now check OUTBID bids on available tiles
			for (let i = 0; i < store.availableTiles.length; i++) {
				if (isPlayerOutbidOnTile(playerIndex, store.availableTiles[i])) {
					store.context.meepleActionFound = true
					return true
				}
			}
			return false
		}

		if (doesPlayerHaveMeepleColours(playerIndex, rf.MEEPLE_BLUE, amount)) {
			store.context.meepleActionFound = true
			return true
		}
		if (doesPlayerHaveMeepleColours(playerIndex, rf.MEEPLE_RED, amount)) {
			store.context.meepleActionFound = true
			return true
		}
		if (doesPlayerHaveMeepleColours(playerIndex, rf.MEEPLE_YELLOW, amount)) {
			store.context.meepleActionFound = true
			return true
		}
		if (doesPlayerHaveMeepleColours(playerIndex, rf.MEEPLE_GREEN, amount)) {
			store.context.meepleActionFound = true
			return true
		}

		return false
	}

	// If you have it hidden, then you have it
	requiredAmount -= store.players[playerIndex].hiddenMeeples[colour]
	if (requiredAmount <= 0) return true

	// So now check OUTBID bids on turnOrder tiles
	for (let i = 0; i < store.availableTurnOrderTiles.length; i++) {
		if (isPlayerOutbidOnTile(playerIndex, store.availableTurnOrderTiles[i])) {
			if (store.availableTurnOrderTiles[i].bids[playerIndex][0].length > 0) {
				for (let j = 0; j < store.availableTurnOrderTiles[i].bids[playerIndex][0].length; j++) {
					if (store.availableTurnOrderTiles[i].bids[playerIndex][0][j] === colour) requiredAmount--
					if (requiredAmount <= 0) return true
				}
			}
		}
	}
	// So now check OUTBID bids on available tiles
	for (let i = 0; i < store.availableTiles.length; i++) {
		if (isPlayerOutbidOnTile(playerIndex, store.availableTiles[i])) {
			if (store.availableTiles[i].bids[playerIndex][0].length > 0) {
				for (let j = 0; j < store.availableTiles[i].bids[playerIndex][0].length; j++) {
					if (store.availableTiles[i].bids[playerIndex][0][j] === colour) requiredAmount--
					if (requiredAmount <= 0) return true
				}
			}
		}
	}

	return false
}

// Inputs: playerIndex or -1 to not check player Input, meepleArr = [col, col, ...], skillArr = [skill, skill, ...], resArr = [res, res, res....]
// Returns: 0 = player Input failure, 9 - all good
export function resourceCheck(playerIndex, requiedMeeples, requiredSkills, requiredResources, requiredResourceTile_id) {
	const store = useModelStore()
	// Only check the player inputs if a player is an input
	if (playerIndex >= 0) {
		let playerObj = store.players[playerIndex]

		// Check for any meeple requirements
		if (requiedMeeples.length > 0) {
			// Copy the players meeples
			let meeplesCopy = JSON.parse(JSON.stringify(playerObj.hiddenMeeples))
			// Add in any outbid meeples
			for (let i = 0; i < store.availableTurnOrderTiles.length; i++) {
				if (isPlayerOutbidOnTile(playerIndex, store.availableTurnOrderTiles[i])) {
					for (let j = 0; j < store.availableTurnOrderTiles[i].bids[playerIndex][0].length; j++) {
						meeplesCopy[store.availableTurnOrderTiles[i].bids[playerIndex][0][j]]++
					}
				}
			}
			for (let i = 0; i < store.availableTiles.length; i++) {
				if (isPlayerOutbidOnTile(playerIndex, store.availableTiles[i])) {
					for (let j = 0; j < store.availableTiles[i].bids[playerIndex][0].length; j++) {
						meeplesCopy[store.availableTiles[i].bids[playerIndex][0][j]]++
					}
				}
			}
			// For simplicity, split the meeple reuiirements into distinct meeples
			let numBlueReq = 0
			let numRedReq = 0
			let numYellowReq = 0
			let numGreenReq = 0
			let numPurpleReq = 0
			let numAnyReq = 0
			//let numMatchingReq = 0

			for (let i = 0; i < requiedMeeples.length; i++) {
				if (requiedMeeples[i] === rf.MEEPLE_BLUE) numBlueReq++
				else if (requiedMeeples[i] === rf.MEEPLE_RED) numRedReq++
				else if (requiedMeeples[i] === rf.MEEPLE_YELLOW) numYellowReq++
				else if (requiedMeeples[i] === rf.MEEPLE_GREEN) numGreenReq++
				else if (requiedMeeples[i] === rf.MEEPLE_PURPLE) numPurpleReq++
				else if (requiedMeeples[i] === rf.MEEPLE_ANY) numAnyReq++
				//else if (requiedMeeples[i] === rf.MEEPLE_MATCHING) numMatchingReq++
			}

			// If you need the purple and don’t have it, then false
			if (numPurpleReq > 0 && !playerObj.hasPurpleMeeple) return 0

			// Remove the fixed items
			meeplesCopy[rf.MEEPLE_BLUE] -= numBlueReq
			meeplesCopy[rf.MEEPLE_RED] -= numRedReq
			meeplesCopy[rf.MEEPLE_YELLOW] -= numYellowReq
			meeplesCopy[rf.MEEPLE_GREEN] -= numGreenReq

			// Check if any entry is negative - then you don’t have enough
			if (meeplesCopy.some((num) => num < 0)) return 0

			// If the remaining meeples don't meet the "meeples_any" requirement, then you don't have enough
			if (numAnyReq > meeplesCopy.reduce((acc, curr) => acc + curr, 0)) return 0

			// TODO meeples match?
		}
		// Check for any skill requirements
		if (requiredSkills.length > 0) {
			// Copy the players skills
			let skillsCopy = JSON.parse(JSON.stringify(playerObj.hiddenSkillTiles))
			// For simplicity, split the skill reuiirements into distinct skills
			let numSawReq = 0
			let numPickaxeReq = 0
			let numAnvilReq = 0
			let numAnyReq = 0
			for (let i = 0; i < requiredSkills.length; i++) {
				if (requiredSkills[i] === rf.SAW) numSawReq++
				else if (requiredSkills[i] === rf.PICKAXE) numPickaxeReq++
				else if (requiredSkills[i] === rf.ANVIL) numAnvilReq++
				else if (requiredSkills[i] === rf.SKILL_ANY) numAnyReq++
			}
			// Remove the fixed items
			skillsCopy[rf.SAW] -= numSawReq
			skillsCopy[rf.PICKAXE] -= numPickaxeReq
			skillsCopy[rf.ANVIL] -= numAnvilReq
			// Check if any entry is negative - then you don’t have enough
			if (skillsCopy.some((num) => num < 0)) return 0

			// If the remaining skills don't meet the "skills_any" requirement, then you don't have enough
			if (numAnyReq > skillsCopy.reduce((acc, curr) => acc + curr, 0)) return 0
			// TODO skills match?
		}
		if (requiredResources.length > 0) {
			// For simplicity, split the skill reuiirements into distinct skills
			let numWoodReq = 0
			let numStoneReq = 0
			let numIronReq = 0
			let numGoldReq = 0
			let numAnyReq = 0

			for (let i = 0; i < requiredResources.length; i++) {
				if (requiredResources[i] === rf.WOOD) numWoodReq++
				else if (requiredResources[i] === rf.STONE) numStoneReq++
				else if (requiredResources[i] === rf.IRON) numIronReq++
				else if (requiredResources[i] === rf.GOLD) numGoldReq++
				else if (requiredResources[i] === rf.RES_ANY) numAnyReq++
			}
			let resourceCopy = [0, 0, 0, 0]
			// If the tileID is set, then they MUST be on a specific tile
			if (requiredResourceTile_id >= 0) {
				let resTile = playerObj.villageTiles.find((tile) => tile.id === requiredResourceTile_id)
				resourceCopy = JSON.parse(JSON.stringify(resTile.resources))
			}
			// Otherwise, the resources can be from anywhere in your village
			else {
				for (let i = 0; i < playerObj.villageTiles.length; i++) {
					if (playerObj.villageTiles[i].resources) {
						resourceCopy[0] += playerObj.villageTiles[i].resources[0]
						resourceCopy[1] += playerObj.villageTiles[i].resources[1]
						resourceCopy[2] += playerObj.villageTiles[i].resources[2]
						resourceCopy[3] += playerObj.villageTiles[i].resources[3]
					}
				}
			}

			resourceCopy[rf.WOOD] -= numWoodReq
			resourceCopy[rf.STONE] -= numStoneReq
			resourceCopy[rf.IRON] -= numIronReq
			resourceCopy[rf.GOLD] -= numGoldReq

			// Before checking if it's negative, check if any res can be replaced with gold
			for (let i = 0; i < 3; i++) {
				if (resourceCopy[i] < 0) {
					const adjustment = Math.min(-resourceCopy[i], resourceCopy[3])
					resourceCopy[3] -= adjustment
					resourceCopy[i] += adjustment
				}
			}

			// Check if any entry is negative - then you don’t have enough
			if (resourceCopy.some((num) => num < 0)) return 0
			// If the remaining resources don't meet the "resources_any" requirement, then you don't have enough
			if (numAnyReq > resourceCopy.reduce((acc, curr) => acc + curr, 0)) return 0

			// TODO resources match?
		}

		// Now there is no problem with player reousrces
	}
	// Check game resources

	return 9
}

export function canAutoProcessResources(playerIndex, requiedMeeples, requiredSkills, requiredResources, requiredResourceTile_id) {
	// ASSUME YOU HAVE AT LEAST THE REQUIRED RESOURCCES
	const store = useModelStore()
	let playerObj = store.players[playerIndex]

	// Check for meeple requirements
	if (requiedMeeples.length > 0) {
		// Copy the players meeples
		let meeplesCopy = JSON.parse(JSON.stringify(playerObj.hiddenMeeples))
		// For simplicity, split the meeple reuiirements into distinct meeples
		let numBlueReq = 0
		let numRedReq = 0
		let numYellowReq = 0
		let numGreenReq = 0
		//let numPurpleReq = 0
		let numAnyReq = 0
		//let numMatchingReq = 0

		for (let i = 0; i < requiedMeeples.length; i++) {
			if (requiedMeeples[i] === rf.MEEPLE_BLUE) numBlueReq++
			else if (requiedMeeples[i] === rf.MEEPLE_RED) numRedReq++
			else if (requiedMeeples[i] === rf.MEEPLE_YELLOW) numYellowReq++
			else if (requiedMeeples[i] === rf.MEEPLE_GREEN) numGreenReq++
			//else if (requiedMeeples[i] === rf.MEEPLE_PURPLE) numPurpleReq++
			else if (requiedMeeples[i] === rf.MEEPLE_ANY) numAnyReq++
			//else if (requiedMeeples[i] === rf.MEEPLE_MATCHING) numMatchingReq++
		}

		// Remove the fixed items
		meeplesCopy[rf.MEEPLE_BLUE] -= numBlueReq
		meeplesCopy[rf.MEEPLE_RED] -= numRedReq
		meeplesCopy[rf.MEEPLE_YELLOW] -= numYellowReq
		meeplesCopy[rf.MEEPLE_GREEN] -= numGreenReq

		// If you require "any" the remaining meeples don't match that number, then you need to choose
		if (numAnyReq > 0 && meeplesCopy.reduce((acc, curr) => acc + curr, 0) !== numAnyReq) return false

		// TODO meeples match?
	}
	// Check for any skill requirements
	if (requiredSkills.length > 0) {
		// Copy the players skills
		let skillsCopy = JSON.parse(JSON.stringify(playerObj.hiddenSkillTiles))
		// For simplicity, split the skill reuiirements into distinct skills
		let numSawReq = 0
		let numPickaxeReq = 0
		let numAnvilReq = 0
		let numAnyReq = 0
		for (let i = 0; i < requiredSkills.length; i++) {
			if (requiredSkills[i] === rf.SAW) numSawReq++
			else if (requiredSkills[i] === rf.PICKAXE) numPickaxeReq++
			else if (requiredSkills[i] === rf.ANVIL) numAnvilReq++
			else if (requiredSkills[i] === rf.SKILL_ANY) numAnyReq++
		}
		// Remove the fixed items
		skillsCopy[rf.SAW] -= numSawReq
		skillsCopy[rf.PICKAXE] -= numPickaxeReq
		skillsCopy[rf.ANVIL] -= numAnvilReq

		// If you require "any" the remaining meeples don't match that number, then you need to choose
		if (numAnyReq > 0 && skillsCopy.reduce((acc, curr) => acc + curr, 0) !== numAnyReq) return false
		// TODO skills match?
	}
	if (requiredResources.length > 0) {
		// For simplicity, split the skill reuiirements into distinct skills
		let numWoodReq = 0
		let numStoneReq = 0
		let numIronReq = 0
		let numGoldReq = 0
		let numAnyReq = 0

		for (let i = 0; i < requiredResources.length; i++) {
			if (requiredResources[i] === rf.WOOD) numWoodReq++
			else if (requiredResources[i] === rf.STONE) numStoneReq++
			else if (requiredResources[i] === rf.IRON) numIronReq++
			else if (requiredResources[i] === rf.GOLD) numGoldReq++
			else if (requiredResources[i] === rf.RES_ANY) numAnyReq++
		}
		let resourceCopy = [0, 0, 0, 0]
		// If the tileID is set, then they MUST be on a specific tile
		if (requiredResourceTile_id >= 0) {
			let resTile = playerObj.villageTiles.find((tile) => tile.id === requiredResourceTile_id)
			resourceCopy = JSON.parse(JSON.stringify(resTile.resources))
		}
		// Otherwise, the resources can be from anywhere in your village
		else {
			for (let i = 0; i < playerObj.villageTiles.length; i++) {
				resourceCopy[0] += playerObj.villageTiles[i].resources[0]
				resourceCopy[1] += playerObj.villageTiles[i].resources[1]
				resourceCopy[2] += playerObj.villageTiles[i].resources[2]
				resourceCopy[3] += playerObj.villageTiles[i].resources[3]
			}
		}

		resourceCopy[rf.WOOD] -= numWoodReq
		resourceCopy[rf.STONE] -= numStoneReq
		resourceCopy[rf.IRON] -= numIronReq
		resourceCopy[rf.GOLD] -= numGoldReq

		// Before checking if it's negative, check if any res can be replaced with gold
		for (let i = 0; i < 3; i++) {
			if (resourceCopy[i] < 0) {
				const adjustment = Math.min(-resourceCopy[i], resourceCopy[3])
				resourceCopy[3] -= adjustment
				resourceCopy[i] += adjustment
			}
		}

		// If you require "any" the remaining meeples don't match that number, then you need to choose
		if (numAnyReq > 0 && resourceCopy.reduce((acc, curr) => acc + curr, 0) !== numAnyReq) return false

		// TODO resources match?
	}

	// Now It is either set resources, or the "any" matches the exact amount
	return true
}

export function doesPlayerHaveResourcesForTileAction(playerIndex, tile) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	// This means either the resource to perform the action, OR the ability to "do" at least part of the action
	// EG you ARE allowed to reclaim a losing bid to your home tile, BUT must at least be able to upgrade, or move a res 1 tile (even if you then move it back)
	if (tile.action[0] === rf.ACT_TILE_GET_RES) return true
	if (tile.action[0] === rf.ACT_TILE_GET_RES_CHOICE_THEN_ALL) return true
	if (tile.action[0] === rf.ACT_TILE_GET_RANDOM_MEEPLE) return true
	if (tile.action[0] === rf.ACT_TILE_GET_RANDOM_SKILL_TILE) return true
	if (tile.action[0] === rf.ACT_TILE_GET_MEEPLE_AND_OR_SKILL) return true
	if (tile.action[0] === rf.ACT_TILE_MOVE_AND_UPGRADE) {
		// Check you can upgrade any tile
		// OR you have at least 1 res and at least 2 tiles
		return true
	}
	if (tile.action[0] === rf.ACT_TILE_EXCHANGE_MEEPLE_AUTO) {
		let requiredMeepleColour = tile.action[tile.upgraded + 1][0] // First meeple is the requirement
		//if (doesPlayerHaveMeepleColours(playerIndex, requiredMeepleColour, 1)) return true
		if (resourceCheck(playerIndex, [requiredMeepleColour], [], [], -1) === 9) return true
		return false
	}
	if (tile.action[0] === rf.ACT_TILE_EXCHANGE_MEEPLE_MANUAL) {
		if (playerObj.hiddenMeeples.reduce((acc, curr) => acc + curr, 0) === 0) return false
		return true
	}
	if (tile.action[0] === rf.ACT_TILE_EXCHANGE_SKILL_FOR_SKILL || tile.action[0] === rf.ACT_TILE_SKILL_FOR_MEEPLE || tile.action[0] === rf.ACT_TILE_SKILL_FOR_GREEN) {
		// Exchange any skill for random
		if (playerObj.hiddenSkillTiles.reduce((acc, curr) => acc + curr, 0) === 0) return false
		return true
	}
	if (tile.action[0] === rf.ACT_TILE_SKILL_FOR_RES) {
		let requiredSkillTile = tile.action[tile.upgraded + 1][0]
		if (playerObj.hiddenSkillTiles[requiredSkillTile] === 0) return false
		return true
	}
	return true
	/*	
export const ACT_USE_OTHER_TILE = 22*/
}

export function checkItemsRequiredCompletion() {
	const store = useModelStore()
	// If there are outstanding items, they will still be selected, so just wait for them to be chosen
	const noItemsRequired = store.context.itemsRequired.meeplesReq.length === 0 && store.context.itemsRequired.skillsReq.length === 0 && store.context.itemsRequired.resReq.length === 0
	if (!noItemsRequired) return

	// Everything has been chosen, so complete the action
	// If it's an upgrade action, then upgrade the tile
	if (store.context.action2 === rf.ACT_MOVE_AND_UPGRADE) {
		let tile = controller.currentPlayerObj().villageTiles.find((t) => t.id === store.context.itemsRequired.resTile_id)
		let tileID = tile.tileID[0]
		tile.upgraded = 1
		store.context.remainingUpgrades--

		// Set up the server payload
		if (store.context.itemsChosen.meeplesChosen.length > 0) {
			let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_REMOVE_FROM_PLAYER)
			if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_MEEPLES_REMOVE_FROM_PLAYER, [...store.context.itemsChosen.meeplesChosen]])
			else store.context.endTurnActions[index][2].push(...store.context.itemsChosen.meeplesChosen)
			index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_JUST_TO_BAG)
			if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_MEEPLES_JUST_TO_BAG, [...store.context.itemsChosen.meeplesChosen]])
			else store.context.endTurnActions[index][2].push(...store.context.itemsChosen.meeplesChosen)
		}
		if (store.context.itemsChosen.skillsChosen.length > 0) {
			let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_REMOVE_FROM_PLAYER)
			if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_REMOVE_FROM_PLAYER, [...store.context.itemsChosen.skillsChosen]])
			else store.context.endTurnActions[index][2].push(...store.context.itemsChosen.skillsChosen)
			index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_JUST_TO_BAG)
			if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_JUST_TO_BAG, [...store.context.itemsChosen.skillsChosen]])
			else store.context.endTurnActions[index][2].push(...store.context.itemsChosen.skillsChosen)
		}

		// Add to end of history
		if (tile.tileID[0] === rf.TILE_AUTUMN_TALTON_LODGE_A) {
			store.context.historyObj[store.context.historyObj.length - 1].push([-3, tileID, [...store.context.itemsChosen.meeplesChosen]])
		} else if (tile.tileID[0] === rf.TILE_AUTUMN_INN_A) {
			store.context.historyObj[store.context.historyObj.length - 1].push([-3, tileID, [...store.context.itemsChosen.resChosen], [...store.context.itemsChosen.skillsChosen]])
		} else {
			if (store.context.itemsChosen.resChosen.length > 0) {
				store.context.historyObj[store.context.historyObj.length - 1].push([-3, tileID, [...store.context.itemsChosen.resChosen]])
			} else if (store.context.itemsChosen.skillsChosen.length > 0) {
				store.context.historyObj[store.context.historyObj.length - 1].push([-3, tileID, [...store.context.itemsChosen.skillsChosen]])
			}
		}

		// Reset resource selection
		store.context.action = rf.ACT_MOVE_AND_UPGRADE
		store.context.action2 = rf.ACT_NONE
		store.context.itemsRequired.meeplesReq.splice(0)
		store.context.itemsRequired.skillsReq.splice(0)
		store.context.itemsRequired.resReq.splice(0)
		store.context.itemsRequired.resTile_id = -1
		store.context.itemsChosen.meeplesChosen.splice(0)
		store.context.itemsChosen.skillsChosen.splice(0)
		store.context.itemsChosen.resChosen.splice(0)
		store.context.itemsChosen.resTile_id = -1
		createUndoPoint()
	}
	// If it's choosing an extension, then add that
	else if (store.context.action2 === rf.ACT_CHOOSE_EXTENSION) {
		//let tile = controller.currentPlayerObj().villageTiles.find((t) => t.id === store.context.itemsRequired.resTile_id)
		addExtensionToTile(controller.currentPlayerIndex(), store.context.selectedTile.id, store.context.selectedExtension)
	} else if (store.context.action2 === rf.ACT_CHOOSE_CONTRACT_SCORING_ITEMS) {
		let contract = controller.currentPlayerObj().hiddenContracts.find((contract) => contract.id === store.context.currentlyScoringContract_id)
		contract.completed = true
		// Set the fulfilling items
		contract.chosenMeeples = [...store.context.itemsChosen.meeplesChosen]
		contract.chosenSkillTiles = [...store.context.itemsChosen.skillsChosen]
		contract.chosenResources = [...store.context.itemsChosen.resChosen]
		store.context.action2 = rf.ACT_NONE
		store.clearContext()
		store.context.action = rf.ACT_CHOOSE_SCORING_AREAS
	}

	// So now reset the tile
	store.context.itemsRequired.resTile_id = -1
}

export function addMeepleFromYourSupplyToTile(colour) {
	const store = useModelStore()
	addMeepleFromYourSupplyToTile_core(controller.currentPlayerIndex(), colour, store.context.selectedTile, store.context.selectedTileArea)
	if (store.context.coreMeepleColour === rf.MEEPLE_NONE) {
		store.context.coreMeepleColour = colour
		// If action area, and you have boat4b, check if you can add any meeples
		if (store.context.selectedTileArea === rf.TILE_ACTION_AREA && village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT4_B)) {
			// You need either someone else to have put on the tile, OR someone to be bidding
			if (store.context.selectedTile.meeplesOnTile.length > 1 || store.context.selectedTile.bids.some((bid) => bid[0].length) > 0) {
				store.context.coreMeepleColour = rf.MEEPLE_NONE
			}
		}

		highlightEligibleOutbidMeeples(controller.currentPlayerIndex())
	}
	// But also check if adding to action area that you now won't go over 6
	else if (store.context.selectedTileArea === rf.TILE_ACTION_AREA) highlightEligibleOutbidMeeples(controller.currentPlayerIndex())
	store.context.minMeeplesRequired--

	if (store.context.selectedTileArea === rf.TILE_BIDDING_AREA) checkPassFlagsForOutbidMeeples(store.context.selectedTile.id)
	// Coming from your supply, one at a time
	let histIdx = store.context.historyObj.findIndex((el) => el[0] === -1)
	if (histIdx !== -1) store.context.historyObj[histIdx].push(colour)
	else store.context.historyObj.push([-1, colour])
}

export function addMeepleFromYourSupplyToTile_core(playerIndex, colour, tile, area) {
	const store = useModelStore()
	// Remove the meeple from the player
	store.players[playerIndex].hiddenMeeples[colour] -= 1
	deductHiddenMeeple(playerIndex, colour)

	// And add it to the server data
	const index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_REMOVE_FROM_PLAYER)
	if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_MEEPLES_REMOVE_FROM_PLAYER, [colour]])
	else store.context.endTurnActions[index][2].push(colour)

	// Set the tile meeple colour
	if (tile.coreMeepleColour === rf.MEEPLE_NONE) tile.coreMeepleColour = colour

	if (area === rf.TILE_ACTION_AREA) {
		if (!store.context.arrayCreatedToHoldActionMeepels) {
			// New array
			tile.meeplesOnTile.push([colour])
		} else {
			tile.meeplesOnTile[tile.meeplesOnTile.length - 1].push(colour)
		}
		store.context.arrayCreatedToHoldActionMeepels = true
	} else if (area === rf.TILE_BIDDING_AREA) {
		tile.bids[playerIndex][0].push(colour)
	}
}

export function moveOutbidMeeples(tile_id, playerIndex) {
	const store = useModelStore()
	let ret = moveOutbidMeeples_core(tile_id, playerIndex, store.context.selectedTile.id, store.context.selectedTileArea)
	if (store.context.selectedTileArea === rf.TILE_BIDDING_AREA) checkPassFlagsForOutbidMeeples(tile_id)
	store.context.minMeeplesRequired -= ret[0].length
	store.context.coreMeepleColour = ret[1]
	// Except tile 4b.which can still be wild, IF there were originally other meeples present
	//if (store.context.selectedTileArea === rf.TILE_ACTION_AREA && village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT4_B)) store.context.coreMeepleColour = rf.MEEPLE_NONE
	if (store.context.selectedTileArea === rf.TILE_ACTION_AREA && store.context.boat4bEligible && village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT4_B)) {
		store.context.coreMeepleColour = rf.MEEPLE_NONE
		unhighlightOutbidMeeples()
	}
	highlightEligibleOutbidMeeples(playerIndex)

	// Add the tile_id of the outbid meeples, and the amount
	store.context.historyObj.push([-2, tile_id, ...ret[0]])
}

export function moveOutbidMeeples_core(from_tile_id, playerIndex, to_tile_id, to_tile_area) {
	const store = useModelStore()
	// Remove the meeple from the from tile
	let fromTile = getTile(from_tile_id)
	let outbidMeepleArray = [...fromTile.bids[playerIndex][0]]
	let outbidColour = fromTile.bids[playerIndex][0][0] // ASSUME THE FIRST MEEPLE IN THE ARRAY SETS THE COLOUR
	// NB THIS WILL NOW NEVER BE TRUE
	if (outbidColour === rf.MEEPLE_NONE) outbidColour = fromTile.coreMeepleColour
	//fromTile.bids[playerIndex][0] = 0
	fromTile.bids[playerIndex][0].splice(0)

	// Add the meeples to the new area
	let toTile = getTile(to_tile_id)

	if (to_tile_area === rf.TILE_ACTION_AREA) {
		if (!store.context.arrayCreatedToHoldActionMeepels) {
			// New array
			toTile.meeplesOnTile.push([...outbidMeepleArray])
		} else {
			toTile.meeplesOnTile[toTile.meeplesOnTile.length - 1] = toTile.meeplesOnTile[toTile.meeplesOnTile.length - 1].concat(...outbidMeepleArray)
		}
		store.context.arrayCreatedToHoldActionMeepels = true
	} else if (to_tile_area === rf.TILE_BIDDING_AREA) {
		toTile.bids[playerIndex][0] = toTile.bids[playerIndex][0].concat([...outbidMeepleArray])
		/*if (toTile.coreMeepleColour !== rf.MEEPLE_NONE && outbidColour !== toTile.coreMeepleColour) {
			toTile.bids[playerIndex][1] = outbidColour
		}*/
	}
	if (toTile.coreMeepleColour === rf.MEEPLE_NONE) toTile.coreMeepleColour = outbidColour

	// Now you need to check if there is only one bid, and if so, set the core tile colour to that colour (ie boat4a)
	const filteredBids = fromTile.bids.filter((bid) => bid[0].length > 0)
	const bidIndex = filteredBids.length === 1 ? fromTile.bids.indexOf(filteredBids[0]) : -1
	// If there is a single bid on the tile, AND no meepls on the tile set the tile colour to that colour
	if (bidIndex !== -1 && fromTile.meeplesOnTile.length === 0) {
		// NB colour at index 0 is used
		fromTile.coreMeepleColour = fromTile.bids[bidIndex][0][0]
	}

	// Meeples Added (subtract length of array from meeples Req'd), coreMeepleColour
	return [outbidMeepleArray, outbidColour]
}

export function checkPassFlagsForOutbidMeeples(tile_id) {
	const store = useModelStore()
	let tile = store.availableTiles.find((tile) => tile.id === tile_id) || store.availableTurnOrderTiles.find((tile) => tile.id === tile_id)
	let highestBid = tile.bids[tile.bids.reduce((maxIndex, bid, currentIndex, arr) => (bid[0].length > arr[maxIndex][0].length ? currentIndex : maxIndex), 0)][0].length
	for (let i = 0; i < tile.bids.length; i++) {
		if (tile.bids[i][0].length > 0 && tile.bids[i][0].length < highestBid) {
			if (store.players[i].passFlag === 2) store.players[i].passFlag = 1
		}
	}
}

export function processTileAction(tile) {
	const store = useModelStore()
	let action = tile.action[0]
	let tileID = tile.tileID[tile.upgraded]
	let actionParams = tile.action[tile.upgraded + 1]
	let histData = []
	let message = ""
	// Process the AUTO ACTIONS first and go to end turn
	if (rf.AUTO_RESOLVING_ACTIONS.includes(action)) {
		if (action === rf.ACT_TILE_GET_RES) {
			let incomingRes = tile.action[store.context.selectedTile.upgraded + 1]
			for (let i = incomingRes.length - 1; i >= 0; i--) {
				if (store.availableResources[incomingRes[i]] > 0) store.availableResources[incomingRes[i]]--
				else incomingRes.splice(i, 1)
			}
			village.addResourcesToVillage(controller.currentPlayerIndex(), tileID, incomingRes)
			// If the destination is not set, then it must be a boat 7A
			if (store.context.historyObj[store.context.historyObj.length - 1][0] === -1) {
				store.context.action2 = rf.ACT_CONFIRM_END_TURN
				return
			}
			message = "You got "
			for (let i = 0; i < incomingRes.length; i++) {
				message += `<img class="resourceInMessage" src="${view.getImage("res_" + incomingRes[i])}" />`
			}
			// Add the history
			addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
		} else if (action === rf.ACT_TILE_GET_RANDOM_MEEPLE) {
			message = "End your turn to get "
			for (let i = 0; i < tile.action[tile.upgraded + 1]; i++) message += `<img class="meepleInMessage" src="${view.getImage("meeple_random")}" />`
			for (let i = 0; i < tile.action[tile.upgraded + 1]; i++) histData.push(rf.MEEPLE_RANDOM)
			store.context.historyObj.push([...histData])
			addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
			store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_GET_RADOM_MEEPLES_FROM_BAG_TO_PLAYER, tile.action[tile.upgraded + 1], store.history.length - 1, [...histData]])
			controller.currentPlayerObj().knownHiddenMeeples[4] += tile.action[tile.upgraded + 1]
		} else if (action === rf.ACT_TILE_GET_RANDOM_SKILL_TILE) {
			message = "End your turn to get "
			for (let i = 0; i < tile.action[tile.upgraded + 1]; i++) message += `<img class="skillTileInMessage" src="${view.getImage("skillTile_random")}" />`
			for (let i = 0; i < tile.action[tile.upgraded + 1]; i++) histData.push(rf.SKILL_ANY_RANDOM)
			store.context.historyObj.push([...histData])
			addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
			store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_GET_RADOM_SKILLS_FROM_BAG_TO_PLAYER, tile.action[tile.upgraded + 1], store.history.length - 1, [...histData]])
			controller.currentPlayerObj().knownHiddenSkillTiles[3] += tile.action[tile.upgraded + 1]
		}
		// SUMMER ACTION
		else if (action === rf.ACT_TILE_SKILL_FOR_RES) {
			if (controller.currentPlayerObj().hiddenSkillTiles[actionParams[0]] === 0) {
				store.gameMessages.errorText = "You do not have the skill tile"
				return
			}
			//message = getResForSkillTile_core(controller.currentPlayerIndex(), isInMyVillage, tile.id)
			// Remove the skill tile
			let skillTile = tile.action[store.context.selectedTile.upgraded + 1][0]
			controller.currentPlayerObj().hiddenSkillTiles[skillTile]--
			deductHiddenSkillTile(controller.currentPlayerIndex(), skillTile)
			store.availableSkills[skillTile]++

			// Set up the server payload
			let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_REMOVE_FROM_PLAYER)
			if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_REMOVE_FROM_PLAYER, [skillTile]])
			else store.context.endTurnActions[index][2].push(skillTile)
			index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_JUST_TO_BAG)
			if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_JUST_TO_BAG, [skillTile]])
			else store.context.endTurnActions[index][2].push(skillTile)

			// Remove the first element as that is the skill tile gone
			let incomingRes = tile.action[store.context.selectedTile.upgraded + 1].slice(1)
			for (let i = incomingRes.length - 1; i >= 0; i--) {
				if (store.availableResources[incomingRes[i]] > 0) store.availableResources[incomingRes[i]]--
				else incomingRes.splice(i, 1)
			}
			village.addResourcesToVillage(controller.currentPlayerIndex(), tileID, incomingRes)
			// If the destination is not set, then it must be a boat 7A
			if (store.context.historyObj[store.context.historyObj.length - 1][0] === -1) {
				store.context.action2 = rf.ACT_CONFIRM_END_TURN
				return
			}
			message = "You got "
			for (let i = 0; i < incomingRes.length; i++) {
				message += `<img class="resourceInMessage" src="${view.getImage("res_" + incomingRes[i])}" />`
			}

			addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
		} else {
			alert("you would get the [AUTO] tile action now. that's not done yet")
		}
		store.gameMessages.turnEndText = message
		store.context.action = rf.ACT_CONFIRM_END_TURN
		store.removeAllActiveHighlights()
		unhighlightOutbidMeeples()
	}
	// Now process POSSIBLY auto actions
	else if (rf.AUTO_RESOLVING_ACTIONS_WITH_LOSING_MEEPLE.includes(action)) {
		if (action === rf.ACT_TILE_EXCHANGE_MEEPLE_AUTO) {
			let playerIndex = controller.currentPlayerIndex()
			let meepleSources = 0
			let singleMeepleSource = []
			let requiredMeepleColour = tile.action[tile.upgraded + 1][0]
			if (store.players[playerIndex].hiddenMeeples[requiredMeepleColour] > 0) {
				meepleSources++
				singleMeepleSource = [0]
			}
			// So now check OUTBID bids on turnOrder tiles
			for (let i = 0; i < store.availableTurnOrderTiles.length; i++) {
				if (isPlayerOutbidOnTile(playerIndex, store.availableTurnOrderTiles[i])) {
					if (store.availableTurnOrderTiles[i].bids[playerIndex][0].length > 0) {
						for (let j = 0; j < store.availableTurnOrderTiles[i].bids[playerIndex][0].length; j++) {
							if (store.availableTurnOrderTiles[i].bids[playerIndex][0][j] === requiredMeepleColour) {
								meepleSources++
								singleMeepleSource = [1, store.availableTurnOrderTiles[i].id]
								break
							}
						}
					}
				}
			}

			// So now check OUTBID bids on available tiles
			for (let i = 0; i < store.availableTiles.length; i++) {
				if (isPlayerOutbidOnTile(playerIndex, store.availableTiles[i])) {
					if (store.availableTiles[i].bids[playerIndex][0].length > 0) {
						for (let j = 0; j < store.availableTiles[i].bids[playerIndex][0].length; j++) {
							if (store.availableTiles[i].bids[playerIndex][0][j] === requiredMeepleColour) {
								meepleSources++
								singleMeepleSource = [2, store.availableTiles[i].id]
								break
							}
						}
					}
				}
			}

			if (meepleSources > 1) {
				store.context.action = rf.ACT_CHOOSE_SET_MEEPLE_FOR_EXCHANGE
				// Set the colour to the required colour
				store.context.coreMeepleColour = requiredMeepleColour
				highlightEligibleOutbidMeeples(controller.currentPlayerIndex())
			} else if (meepleSources === 1) {
				store.context.meeplesRemoved.splice(0)
				store.context.action = action
				let message = exchangeMeeples_core(controller.currentPlayerIndex(), tile.action[tile.upgraded + 1], singleMeepleSource)
				store.gameMessages.turnEndText = message
				store.context.action = rf.ACT_CONFIRM_END_TURN
				store.removeAllActiveHighlights()
				unhighlightOutbidMeeples()

				histData.push(tile.upgraded)
				// from your supply
				if (singleMeepleSource[0] === 0) histData.push(-1)
				// Otherwise need outbid tile, and array
				else {
					// entry0 >=0 so must be tileID of outbid off meeples]
					histData.push(singleMeepleSource[1], [...store.context.meeplesRemoved])
				}

				store.context.historyObj.push([...histData])

				addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
				store.context.meeplesRemoved.splice(0)
				store.context.historyObj.splice(0)
			} else if (meepleSources === 0) {
				store.gameMessages.actionError = "You do not have the correct meeple to exchange"
				return
			}
		}
	}
	// Now process NON-AUTO ACTIONS - ie set up the action and highlights
	else {
		// SPRING actions
		if (action === rf.ACT_TILE_GET_RES_CHOICE_THEN_ALL) {
			if (tile.upgraded === 1) {
				// If the tile is upgraded, it becomes an auto-action
				let incomingRes = tile.action[store.context.selectedTile.upgraded + 1]
				for (let i = incomingRes.length - 1; i >= 0; i--) {
					if (store.availableResources[incomingRes[i]] > 0) store.availableResources[incomingRes[i]]--
					else incomingRes.splice(i, 1)
				}
				village.addResourcesToVillage(controller.currentPlayerIndex(), tileID, incomingRes)
				// If the destination is not set, then it must be a boat 7A
				if (store.context.historyObj[store.context.historyObj.length - 1][0] === -1) {
					store.context.action2 = rf.ACT_CONFIRM_END_TURN
					return
				}
				let message = "You got "
				for (let i = 0; i < incomingRes.length; i++) {
					message += `<img class="resourceInMessage" src="${view.getImage("res_" + incomingRes[i])}" />`
				}
				store.gameMessages.turnEndText = message

				// Add the history
				addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])

				store.context.action = rf.ACT_CONFIRM_END_TURN
				store.removeAllActiveHighlights()
				unhighlightOutbidMeeples()
				return
			} else store.context.action = rf.ACT_CHOOSE_SINGLE_RES
		} else if (action === rf.ACT_TILE_GET_MEEPLE_AND_OR_SKILL) {
			// If the tile is upgraded, it becomes an auto-action
			if (tile.upgraded === 1) {
				message = "End your turn to get "
				message += `<img class="meepleInMessage" src="${view.getImage("meeple_random")}" /> `
				message += `<img class="skillTileInMessage" src="${view.getImage("skillTile_random")}" />`

				let histData = [rf.MEEPLE_RANDOM, rf.SKILL_ANY_RANDOM]
				store.context.historyObj.push([...histData])
				addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
				store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_GET_RANDOM_MEEPLE_RANDOM_SKILL, 1, store.history.length - 1, [...histData]])
				controller.currentPlayerObj().knownHiddenMeeples[4]++
				controller.currentPlayerObj().knownHiddenSkillTiles[3]++

				store.gameMessages.turnEndText = message
				store.context.action = rf.ACT_CONFIRM_END_TURN
			}
			// Otherwise, need to choose one to get
			else store.context.action = rf.ACT_CHOOSE_RANDOM_MEEPLE_OR_SKILL
		} else if (action === rf.ACT_TILE_CONTRACT_OR_AND_ITEMS) {
			if (tile.tileID[0] === rf.TILE_M_SPRING_ASSAYER_A) {
				store.context.action = rf.ACT_CHOOSE_CONTRACT
				store.context.action2 = rf.ACT_CHOOSE_CONTRACT
				// If upgraded, get the resoureces now
				if (tile.upgraded === 1) {
					let incomingRes = [rf.STONE, rf.IRON]
					for (let i = incomingRes.length - 1; i >= 0; i--) {
						if (store.availableResources[incomingRes[i]] > 0) store.availableResources[incomingRes[i]]--
						else incomingRes.splice(i, 1)
					}
					village.addResourcesToVillage(controller.currentPlayerIndex(), tile.tileID[tile.upgraded], incomingRes)
				}
			} else if (tile.tileID[0] === rf.TILE_M_SUMMER_BOOKKEEPER_A) {
				if (tile.upgraded === 0) {
					store.context.action = rf.ACT_CHOOSE_CONTRACT
					store.context.action2 = rf.ACT_CHOOSE_CONTRACT
				} else if (tile.upgraded === 1) {
					store.context.historyObj.push([-1, -1, rf.SKILL_ANY_RANDOM])
					addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
					// Set up the server payload
					store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_GET_RADOM_SKILLS_FROM_BAG_TO_PLAYER, 1, store.history.length - 1, [-1, -1, rf.SKILL_ANY_RANDOM]])
					if (tile.tileID[tile.upgraded] === rf.TILE_M_SUMMER_BOOKKEEPER_B) store.context.action = rf.ACT_END_TURN_FOR_BOOKKEEPER_B_SKILL
				}
			}
		}
		// SUMMER actions
		else if (action === rf.ACT_TILE_EXCHANGE_MEEPLE_MANUAL) {
			store.context.action = rf.ACT_CHOOSE_ANY_MEEPLE_FOR_EXCHANGE
			store.context.coreMeepleColour = rf.MEEPLE_NONE
			highlightEligibleOutbidMeeples(controller.currentPlayerIndex())
		} else if (action === rf.ACT_TILE_EXCHANGE_SKILL_FOR_SKILL) {
			store.context.action = rf.ACT_CHOOSE_SKILL_TILE_FOR_SKILL_TILE_EXCHANGE
		} else if (action === rf.ACT_TILE_SKILL_FOR_MEEPLE) {
			store.context.action = rf.ACT_CHOOSE_SKILL_TILE_FOR_MEEPLE
		} else if (action === rf.ACT_TILE_SKILL_FOR_GREEN) {
			store.context.action = rf.ACT_CHOOSE_SKILL_TILE_FOR_GREEN
		} else if (action === rf.ACT_TILE_MOVE_AND_UPGRADE) {
			store.context.remainingMoves = tile.action[tile.upgraded + 1][0]
			store.context.remainingUpgrades = tile.action[tile.upgraded + 1][1]
			// Add on cabins from your home tile
			if (tile.season === rf.SEASON_HOME_TILE) store.context.remainingUpgrades += tile.cabins
			// If you have boat2b, both are doubled
			if (village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT2_B)) {
				store.context.remainingMoves *= 2
				store.context.remainingUpgrades *= 2
			}
			// Open and highlight the extensions
			store.viewSettings.showFullExtensions = true
			store.context.action = rf.ACT_MOVE_AND_UPGRADE

			// Create an array to hold all the actions
			store.context.historyObj.push([])

			store.undoPoints.splice(0)
			createUndoPoint()
		} else if (action === rf.ACT_TILE_GET_CONTRACT) {
			store.context.remainingContracts = tile.action[tile.upgraded + 1]
			// If more than 1 contract, set up the history container
			if (store.context.remainingContracts > 1) store.context.historyObj.push([])
			store.context.action = rf.ACT_CHOOSE_CONTRACT
		} else if (action === rf.ACT_TILE_USE_OTHER_TILE) {
			store.context.sorcererRange = tile.action[tile.upgraded + 1][0]
			store.context.action = rf.ACT_CHOOSE_SORCERER_TILE
		}
	}
}

export function upgradeTile(playerIndex, tile_id) {
	const store = useModelStore()
	let upgradePayment = upgradeTile_core(playerIndex, tile_id)
	store.context.remainingUpgrades--

	let meeplesPaid = upgradePayment.meeplesPaid
	let skillsPaid = upgradePayment.skillsPaid
	let resPaid = upgradePayment.resPaid

	let tile = controller.currentPlayerObj().villageTiles.find((tile) => tile.id === tile_id)
	let tileID = tile.tileID[0]

	// Set up the server payload
	if (meeplesPaid.length > 0) {
		let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_REMOVE_FROM_PLAYER)
		if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_MEEPLES_REMOVE_FROM_PLAYER, [...meeplesPaid]])
		else store.context.endTurnActions[index][2].push(...meeplesPaid)
		index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_JUST_TO_BAG)
		if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_MEEPLES_JUST_TO_BAG, [...meeplesPaid]])
		else store.context.endTurnActions[index][2].push(...meeplesPaid)
	}
	if (skillsPaid.length > 0) {
		let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_REMOVE_FROM_PLAYER)
		if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_REMOVE_FROM_PLAYER, [...skillsPaid]])
		else store.context.endTurnActions[index][2].push(...skillsPaid)
		index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_JUST_TO_BAG)
		if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_JUST_TO_BAG, [...skillsPaid]])
		else store.context.endTurnActions[index][2].push(...skillsPaid)
	}

	// Add to end of history
	if (tile.tileID[0] === rf.TILE_AUTUMN_TALTON_LODGE_A) {
		store.context.historyObj[store.context.historyObj.length - 1].push([-3, tileID, [...meeplesPaid]])
	} else if (tile.tileID[0] === rf.TILE_AUTUMN_INN_A) {
		store.context.historyObj[store.context.historyObj.length - 1].push([-3, tileID, [...resPaid], [...skillsPaid]])
	} else {
		if (resPaid.length > 0) {
			store.context.historyObj[store.context.historyObj.length - 1].push([-3, tileID, [...resPaid]])
		} else if (skillsPaid.length > 0) {
			store.context.historyObj[store.context.historyObj.length - 1].push([-3, tileID, [...skillsPaid]])
		}
	}

	createUndoPoint()
}

// This takes in a tile with NO choice in resources - either fixed, or any matching exactly available
export function upgradeTile_core(playerIndex, tile_id) {
	let tile = controller.currentPlayerObj().villageTiles.find((tile) => tile.id === tile_id)

	// If you have boat 3a, all res are wild for upgrading. So change any res req to RES_ANY
	if (village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT3_A)) {
		for (let i = 0; i < tile.upgradeCost.resCost.length; i++) {
			tile.upgradeCost.resCost[i] = rf.RES_ANY
		}
	}

	let upgradePayment = payAnyCosts_core(playerIndex, tile.upgradeCost.meepleCost, tile.upgradeCost.skillCost, tile.upgradeCost.resCost, tile_id)
	// Upgrade the tile
	tile.upgraded = 1
	return upgradePayment
}

export function addExtensionToTile(playerIndex, tile_id, extension_id) {
	const store = useModelStore()

	let extension = rf.ALL_EXTENSIONS.find((extension) => extension.id === extension_id)

	// if you didn't have to choose a res, deduct them now
	let upgradePayment = []
	if (store.context.action !== rf.ACT_CHOOSE_ITEMS) {
		// NB this READDS the skills etc LOCALLY, but doesn't set up server payload
		upgradePayment = payAnyCosts_core(playerIndex, extension.requiredMeeples, extension.requiredSkillTiles, extension.requiredResources, tile_id)
		store.context.itemsChosen.meeplesChosen = upgradePayment.meeplesPaid
		store.context.itemsChosen.skillsChosen = upgradePayment.skillsPaid
		store.context.itemsChosen.resChosen = upgradePayment.resPaid
	}

	if (store.context.itemsChosen.meeplesChosen.length === 0) store.context.itemsChosen.meeplesChosen = [...extension.requiredMeeples]
	if (store.context.itemsChosen.skillsChosen.length === 0) store.context.itemsChosen.skillsChosen = [...extension.requiredSkillTiles]
	if (store.context.itemsChosen.resChosen.length === 0) store.context.itemsChosen.resChosen = [...extension.requiredResources]
	addExtensionToTile_core(playerIndex, tile_id, extension_id /*, store.context.itemsChosen.meeplesChosen, store.context.itemsChosen.skillsChosen, store.context.itemsChosen.resChosen*/)
	// Add to end of history
	let histObj = [-4, tile_id, extension_id]
	// If it was meeple any, then that is the only cost
	if (extension.requiredMeeples.length > 0 && extension.requiredMeeples[0] === rf.MEEPLE_ANY) histObj.push(store.context.itemsChosen.meeplesChosen[0])
	else if (extension.requiredResources.length === 2 && extension.requiredResources[1] === rf.RES_ANY) histObj.push(store.context.itemsChosen.resChosen[1])

	store.context.historyObj[store.context.historyObj.length - 1].push([...histObj])

	// Set up server payload for any meeples
	if (store.context.itemsChosen.meeplesChosen.length > 0) {
		//for (let i = 0; i < store.context.itemsChosen.meeplesChosen.length; i++) store.availableMeeples[store.context.itemsChosen.meeplesChosen[i]]++
		let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_FROM_PLAYER_TO_BAG)
		if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_MEEPLES_FROM_PLAYER_TO_BAG, [...store.context.itemsChosen.meeplesChosen]])
		else store.context.endTurnActions[index][2].push(...store.context.itemsChosen.meeplesChosen)
	}

	// Set up server for any skills
	if (store.context.itemsChosen.skillsChosen.length > 0) {
		//for (let i = 0; i < store.context.itemsChosen.skillsChosen.length; i++) store.availableSkills[store.context.itemsChosen.skillsChosen[i]]++
		let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_FROM_PLAYER_TO_BAG)
		if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_FROM_PLAYER_TO_BAG, [...store.context.itemsChosen.skillsChosen]])
		else store.context.endTurnActions[index][2].push(...store.context.itemsChosen.skillsChosen)
	}
	// Deduct upgradeRemaining
	store.context.remainingUpgrades--
	store.context.action = rf.ACT_MOVE_AND_UPGRADE
	createUndoPoint()
}

// NB THIS DOES NOT DEDUCT ANY COSTS
export function addExtensionToTile_core(playerIndex, tile_id, extension_id /*, meeplesPaid, skillsPaid, resPaid*/) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	let tile = playerObj.villageTiles.find((t) => t.id === tile_id)
	let extension = rf.ALL_EXTENSIONS.find((extension) => extension.id === extension_id)
	// If you have boat 3a, all res are wild for upgrading. So change any res req to RES_ANY
	if (village.doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT3_A)) {
		for (let i = 0; i < extension.requiredResources.length; i++) {
			extension.requiredResources[i] = rf.RES_ANY
		}
	}

	// Deduct costs
	/*for (let i = 0; i < extension.requiredMeeples.length; i++) playerObj.hiddenMeeples[extension.requiredMeeples[i]]--
	for (let i = 0; i < extension.requiredSkillTiles.length; i++) playerObj.hiddenSkillTiles[extension.requiredSkillTiles[i]]--
	for (let i = 0; i < extension.requiredResources.length; i++) tile.resources[extension.requiredResources[i]]--*/
	//let extensionCost = payAnyCosts_core(playerIndex, meeplesPaid, skillsPaid, resPaid, tile_id)

	// Set the extension
	tile.extension = extension_id
	// Set the core tile colour, if needed
	if (tile.coreMeepleColour === rf.MEEPLE_NONE) tile.coreMeepleColour = extension.colour
	// remove from available
	store.availableExtensions.splice(store.availableExtensions.indexOf(extension_id), 1)
	//return extensionCost
}

export function deductAutoItemPicks(tile_id) {
	const store = useModelStore()
	let tile = controller.currentPlayerObj().villageTiles.find((t) => t.id === tile_id)
	for (let i = store.context.itemsRequired.meeplesReq.length - 1; i >= 0; i--) {
		if (store.context.itemsRequired.meeplesReq[i] >= 0) {
			// Add to chosen
			store.context.itemsChosen.meeplesChosen.push(store.context.itemsRequired.meeplesReq[i])
			// Remove from resources
			// Check for purple meeple first
			if (store.context.itemsRequired.meeplesReq[i] === rf.MEEPLE_PURPLE) controller.currentPlayerObj().hasPurpleMeeple = false
			else {
				controller.currentPlayerObj().hiddenMeeples[store.context.itemsRequired.meeplesReq[i]]--
				deductHiddenMeeple(controller.currentPlayerIndex(), store.context.itemsRequired.meeplesReq[i])
				// Final Scoring, set up server payload
				if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
					let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_REMOVE_FROM_PLAYER)
					if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_MEEPLES_REMOVE_FROM_PLAYER, [store.context.itemsRequired.meeplesReq[i]]])
					else store.context.endTurnActions[index][2].push(store.context.itemsRequired.meeplesReq[i])
				}
			}
			// Remove from required
			store.context.itemsRequired.meeplesReq.splice(i, 1)
		}
	}
	for (let i = store.context.itemsRequired.skillsReq.length - 1; i >= 0; i--) {
		if (store.context.itemsRequired.skillsReq[i] >= 0) {
			// Add to chosen
			store.context.itemsChosen.skillsChosen.push(store.context.itemsRequired.skillsReq[i])
			// Remove from resources
			controller.currentPlayerObj().hiddenSkillTiles[store.context.itemsRequired.skillsReq[i]]--
			deductHiddenSkillTile(controller.currentPlayerIndex(), store.context.itemsRequired.skillsReq[i])
			// Final Scoring, set up server payload
			if (store.gameflow.phase === rf.PHASE_FINAL_SCORING) {
				let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_REMOVE_FROM_PLAYER)
				if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_REMOVE_FROM_PLAYER, [store.context.itemsRequired.skillsReq[i]]])
				else store.context.endTurnActions[index][2].push(store.context.itemsRequired.skillsReq[i])
			}

			// Remove from required
			store.context.itemsRequired.skillsReq.splice(i, 1)
		}
	}
	for (let i = store.context.itemsRequired.resReq.length - 1; i >= 0; i--) {
		if (store.context.itemsRequired.resReq[i] >= 0) {
			// Remove from resources
			if (tile.resources[store.context.itemsRequired.resReq[i]] > 0) {
				tile.resources[store.context.itemsRequired.resReq[i]]--
				store.availableResources[store.context.itemsRequired.resReq[i]]++
				// Add to chosen
				store.context.itemsChosen.resChosen.push(store.context.itemsRequired.resReq[i])
			} else {
				tile.resources[rf.GOLD]--
				store.availableResources[rf.GOLD]++
				// Add to chosen
				store.context.itemsChosen.resChosen.push(rf.GOLD)
			}
			// Remove from required
			store.context.itemsRequired.resReq.splice(i, 1)
		}
	}
}

// This function will deduct costs and return an array of what was ACTUALLY paid
// NB _ANY costs are asuumed to only be EXACTLY payable, and therefore there is no choice
// NB tile_id should be 0, even if it's not needed. That way it will always find a (not needed) home tile
export function payAnyCosts_core(playerIndex, meepleCostArr, skillsCostArr, resCostArr, tile_id) {
	const store = useModelStore()
	if (!canAutoProcessResources(playerIndex, meepleCostArr, skillsCostArr, resCostArr, tile_id)) {
		alert("RES PROCESS ERROR")
		return
	}
	let playerObj = store.players[playerIndex]
	let tile = playerObj.villageTiles.find((tile) => tile.id === tile_id)

	let paymentObj = {
		meeplesPaid: [],
		skillsPaid: [],
		resPaid: [],
	}

	// Deduct the FIXED costs
	for (let i = 0; i < meepleCostArr.length; i++) {
		if (meepleCostArr[i] !== rf.MEEPLE_ANY) {
			playerObj.hiddenMeeples[meepleCostArr[i]]--
			deductHiddenMeeple(playerIndex, meepleCostArr[i])

			store.availableMeeples[meepleCostArr[i]]++
			paymentObj.meeplesPaid.push(meepleCostArr[i])
		}
	}
	for (let i = 0; i < skillsCostArr.length; i++) {
		if (skillsCostArr[i] !== rf.SKILL_ANY) {
			playerObj.hiddenSkillTiles[skillsCostArr[i]]--
			deductHiddenSkillTile(playerIndex, skillsCostArr[i])
			store.availableSkills[skillsCostArr[i]]++
			paymentObj.skillsPaid.push(skillsCostArr[i])
		}
	}
	for (let i = 0; i < resCostArr.length; i++) {
		if (resCostArr[i] !== rf.RES_ANY) {
			if (tile.resources[resCostArr[i]] === 0) {
				tile.resources[rf.GOLD]--
				store.availableResources[rf.GOLD]++
				paymentObj.resPaid.push(rf.GOLD)
			} else {
				tile.resources[resCostArr[i]]--
				store.availableResources[resCostArr[i]]++
				paymentObj.resPaid.push(resCostArr[i])
			}
		}
	}

	// Now deduct any remaining "ANY" costs
	for (let i = 0; i < meepleCostArr.length; i++) {
		if (meepleCostArr[i] === rf.MEEPLE_ANY) {
			if (playerObj.hiddenMeeples[0] > 0) {
				playerObj.hiddenMeeples[0]--
				deductHiddenMeeple(playerIndex, 0)

				store.availableMeeples[0]++
				paymentObj.meeplesPaid.push(0)
			} else if (playerObj.hiddenMeeples[1] > 0) {
				playerObj.hiddenMeeples[1]--
				deductHiddenMeeple(playerIndex, 1)
				store.availableMeeples[1]++
				paymentObj.meeplesPaid.push(1)
			} else if (playerObj.hiddenMeeples[2] > 0) {
				playerObj.hiddenMeeples[2]--
				deductHiddenMeeple(playerIndex, 2)
				store.availableMeeples[2]++
				paymentObj.meeplesPaid.push(2)
			} else if (playerObj.hiddenMeeples[3] > 0) {
				playerObj.hiddenMeeples[3]--
				deductHiddenMeeple(playerIndex, 3)
				store.availableMeeples[3]++
				paymentObj.meeplesPaid.push(3)
			}
		}
	}
	for (let i = 0; i < skillsCostArr.length; i++) {
		if (skillsCostArr[i] === rf.SKILL_ANY) {
			if (playerObj.hiddenSkillTiles[0] > 0) {
				playerObj.hiddenSkillTiles[0]--
				deductHiddenSkillTile(playerIndex, 0)
				store.availableSkills[0]++
				paymentObj.skillsPaid.push(0)
			} else if (playerObj.hiddenSkillTiles[1] > 0) {
				playerObj.hiddenSkillTiles[1]--
				deductHiddenSkillTile(playerIndex, 1)
				store.availableSkills[1]++
				paymentObj.skillsPaid.push(1)
			} else if (playerObj.hiddenSkillTiles[2] > 0) {
				playerObj.hiddenSkillTiles[2]--
				deductHiddenSkillTile(playerIndex, 2)
				store.availableSkills[2]++
				paymentObj.skillsPaid.push(2)
			}
		}
	}
	for (let i = 0; i < resCostArr.length; i++) {
		if (resCostArr[i] === rf.RES_ANY) {
			if (tile.resources[0] > 0) {
				tile.resources[0]--
				store.availableResources[0]++
				paymentObj.resPaid.push(0)
			} else if (tile.resources[1] > 0) {
				tile.resources[1]--
				store.availableResources[1]++
				paymentObj.resPaid.push(1)
			} else if (tile.resources[2] > 0) {
				tile.resources[2]--
				store.availableResources[2]++
				paymentObj.resPaid.push(2)
			} else if (tile.resources[3] > 0) {
				tile.resources[3]--
				store.availableResources[3]++
				paymentObj.resPaid.push(3)
			}
		}
	}
	return paymentObj
}

export function moveRes(fromTile_id, toTile_id, res, distance) {
	const store = useModelStore()
	moveRes_core(controller.currentPlayerIndex(), fromTile_id, toTile_id, res)
	let fromTile = controller.currentPlayerObj().villageTiles.find((tile) => tile.id === fromTile_id)
	let toTile = controller.currentPlayerObj().villageTiles.find((tile) => tile.id === toTile_id)
	let fromTileID = fromTile.tileID[fromTile.upgraded]
	let toTileID = toTile.tileID[toTile.upgraded]
	// Add into end of history obj
	store.context.historyObj[store.context.historyObj.length - 1].push([fromTileID, toTileID, res, distance])
	store.context.remainingMoves -= distance
	store.context.action = store.context.action2
	store.context.actions2 = rf.ACT_NONE
	createUndoPoint()
}

export function moveRes_core(playerIndex, fromTile_id, toTile_id, res) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	let fromTile = playerObj.villageTiles.find((tile) => tile.id === fromTile_id)
	let toTile = playerObj.villageTiles.find((tile) => tile.id === toTile_id)
	fromTile.resources[res]--
	toTile.resources[res]++
}

// Tavern using OUTBID meeples
export function exchangeOutbidMeeples(tileID, playerIndex) {
	const store = useModelStore()
	let tile = getTile(tileID)
	let message
	store.context.meeplesRemoved.splice(0)

	let singleMeepleSource = 0
	if (tile.season === rf.SEASON_TURN_ORDER_TILE)
		singleMeepleSource = 1 //message = model.exchangeMeeples_core(playerIndex, store.context.selectedTile.action[store.context.selectedTile.upgraded + 1], [1, props.tileProp.id])
	else singleMeepleSource = 2 //message = model.exchangeMeeples_core(playerIndex, store.context.selectedTile.action[store.context.selectedTile.upgraded + 1], [2, props.tileProp.id])

	//let playerObj = store.players[playerIndex]
	let meeplesRemoved = []
	let amount = store.context.selectedTile.action[store.context.selectedTile.upgraded + 1][1]

	if (singleMeepleSource === 1) {
		let tile = store.availableTurnOrderTiles.find((t) => t.id === tileID)
		let outgoingMeeples = []
		for (let i = 0; i < tile.bids[playerIndex][0].length; i++) {
			meeplesRemoved.push(tile.bids[playerIndex][0][i])
			outgoingMeeples.push(tile.bids[playerIndex][0][i])
			store.availableMeeples[tile.bids[playerIndex][0][i]]++
		}
		// And add it to the server data
		const index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_JUST_TO_BAG)
		if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_MEEPLES_JUST_TO_BAG, [...outgoingMeeples]])
		else store.context.endTurnActions[index][2].push(...outgoingMeeples)
		tile.bids[playerIndex][0].splice(0)
	}
	// Otherwise, if it comes from outbid availble tiles, remove the bid, and add to the bag
	else if (singleMeepleSource === 2) {
		let tile = store.availableTiles.find((t) => t.id === tileID)
		for (let i = 0; i < tile.bids[playerIndex][0].length; i++) {
			meeplesRemoved.push(tile.bids[playerIndex][0][i])
			store.availableMeeples[tile.bids[playerIndex][0][i]]++
			// And add it to the server data
			const index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_JUST_TO_BAG)
			if (typeof tile.bids[playerIndex][0][i] === "number") {
				if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_MEEPLES_JUST_TO_BAG, [tile.bids[playerIndex][0][i]]])
				else store.context.endTurnActions[index][2].push(tile.bids[playerIndex][0][i])
			} else {
				if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_MEEPLES_JUST_TO_BAG, [...tile.bids[playerIndex][0][i]]])
				else store.context.endTurnActions[index][2].push(...tile.bids[playerIndex][0][i])
			}
		}
		tile.bids[playerIndex][0].splice(0)
	}

	// Set up the turn end to award hidden meeples

	let histData = [...meeplesRemoved]
	for (let i = 0; i < amount; i++) histData.push(rf.MEEPLE_RANDOM)
	store.context.historyObj.push([...histData])
	addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
	store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_GET_RADOM_MEEPLES_FROM_BAG_TO_PLAYER, amount, store.history.length - 1, [...histData]])
	controller.currentPlayerObj().knownHiddenMeeples[4] += amount

	store.removeAllActiveHighlights()
	unhighlightOutbidMeeples()

	message = "End your turn to get "
	for (let i = 0; i < amount; i++) message += `<img class="meepleInMessage" src="${view.getImage("meeple_random")}" /> `
	store.gameMessages.turnEndText = message
	store.context.action = rf.ACT_CONFIRM_END_TURN

	store.context.meeplesRemoved.splice(0)
	store.context.historyObj.splice(0)
}

// This only actions from the HIRING FAIR action
export function exchangeChosenMeeple(colour) {
	const store = useModelStore()
	controller.currentPlayerObj().hiddenMeeples[colour]--
	deductHiddenMeeple(controller.currentPlayerIndex(), colour)
	store.availableMeeples[colour]++
	let amount = store.context.selectedTile.action[store.context.selectedTile.upgraded + 1][1]

	// Set up the server payload
	let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_FROM_PLAYER_TO_BAG)
	if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_MEEPLES_FROM_PLAYER_TO_BAG, [colour]])
	else store.context.endTurnActions[index][2].push(colour)

	let histData = [colour]
	for (let i = 0; i < amount; i++) histData.push(rf.MEEPLE_RANDOM)
	store.context.historyObj.push([...histData])
	addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
	store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_GET_RADOM_MEEPLES_FROM_BAG_TO_PLAYER, amount, store.history.length - 1, [...histData]])
	controller.currentPlayerObj().knownHiddenMeeples[4] += amount

	let message = "End your turn to get "
	for (let i = 0; i < amount; i++) message += `<img class="meepleInMessage" src="${view.getImage("meeple_random")}" /> `
	store.gameMessages.turnEndText = message
	store.context.action = rf.ACT_CONFIRM_END_TURN
}

// ONLY from hiring fair
export function exchangeSkillTileForSkillTiles(idx) {
	const store = useModelStore()
	controller.currentPlayerObj().hiddenSkillTiles[idx]--
	deductHiddenSkillTile(controller.currentPlayerIndex(), idx)
	store.availableSkills[idx]++
	let amount = store.context.selectedTile.action[store.context.selectedTile.upgraded + 1][1]

	// Set up the server payload
	let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_FROM_PLAYER_TO_BAG)
	if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_FROM_PLAYER_TO_BAG, [idx]])
	else store.context.endTurnActions[index][2].push(idx)

	let histData = [idx]
	for (let i = 0; i < amount; i++) histData.push(rf.SKILL_ANY_RANDOM)
	store.context.historyObj.push([...histData])
	addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
	store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_GET_RADOM_SKILLS_FROM_BAG_TO_PLAYER, amount, store.history.length - 1, [...histData]])
	controller.currentPlayerObj().knownHiddenSkillTiles[3] += amount

	let message = "End your turn to get "
	for (let i = 0; i < amount; i++) message += `<img class="skillTileInMessage" src="${view.getImage("skillTile_random")}" /> `
	store.gameMessages.turnEndText = message
	store.context.action = rf.ACT_CONFIRM_END_TURN
}

// ONLY from brewer
export function exchangeSkillTileForMeeples(idx) {
	const store = useModelStore()
	controller.currentPlayerObj().hiddenSkillTiles[idx]--
	deductHiddenSkillTile(controller.currentPlayerIndex(), idx)
	store.availableSkills[idx]++

	let amount = store.context.selectedTile.action[store.context.selectedTile.upgraded + 1][1]

	// Set up the server payload
	let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_FROM_PLAYER_TO_BAG)
	if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_FROM_PLAYER_TO_BAG, [idx]])
	else store.context.endTurnActions[index][2].push(idx)

	let histData = [idx]
	for (let i = 0; i < amount; i++) histData.push(rf.MEEPLE_RANDOM)
	store.context.historyObj.push([...histData])
	addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
	store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_GET_RADOM_MEEPLES_FROM_BAG_TO_PLAYER, amount, store.history.length - 1, [...histData]])
	controller.currentPlayerObj().knownHiddenMeeples[4] += amount

	let message = "End your turn to get "
	for (let i = 0; i < amount; i++) message += `<img class="meepleInMessage" src="${view.getImage("meeple_random")}" /> `
	store.gameMessages.turnEndText = message
	store.context.action = rf.ACT_CONFIRM_END_TURN
}

export function exchangeSkillTileForGreen(idx) {
	const store = useModelStore()
	let numGreen = store.context.selectedTile.action[store.context.selectedTile.upgraded + 1][1]
	let message = exchangeSkillTileForGreen_core(controller.currentPlayerIndex(), idx, numGreen)

	store.gameMessages.turnEndText = message
	store.context.action = rf.ACT_CONFIRM_END_TURN

	store.removeAllActiveHighlights()
	unhighlightOutbidMeeples()

	store.context.meeplesRemoved.splice(0)
	store.context.historyObj.splice(0)
}

export function exchangeSkillTileForGreen_core(playerIndex, idx, numGreen) {
	const store = useModelStore()
	store.players[playerIndex].hiddenSkillTiles[idx]--
	deductHiddenSkillTile(playerIndex, idx)
	store.availableSkills[idx]++

	// Set up the server payload
	let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_SKILLS_FROM_PLAYER_TO_BAG)
	if (index === -1) store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_SKILLS_FROM_PLAYER_TO_BAG, [idx]])
	else store.context.endTurnActions[index][2].push(idx)

	let histData = [idx]
	store.context.historyObj.push([...histData])
	addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
	let numGreenArr = []
	for (let i = 0; i < numGreen; i++) numGreenArr.push(rf.MEEPLE_GREEN)
	store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_MEEPLES_JUST_TO_PLAYER, numGreenArr])

	let message = "You gained "
	for (let i = 0; i < numGreen; i++) {
		if (store.availableGreenMeeples > 0) {
			controller.currentPlayerObj().hiddenMeeples[rf.MEEPLE_GREEN]++
			controller.currentPlayerObj().knownHiddenMeeples[rf.MEEPLE_GREEN]++
			store.availableGreenMeeples--
			message += `<img class="meepleInMessage" src="${view.getImage("meeple_green")}" /> `
		} else message + -` (No more green meeples available)`
	}
	return message
}

// The meepleArray is [MEEPLE_OUT, meepleIn, meepleIn, ...]
export function exchangeMeeples_core(playerIndex, meepleArray, singleMeepleSource) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	let meeplesRemoved = []
	let numIncomingGreens = meepleArray.slice(1).length // Entry 0 is the cost, entry 1+ is the incoming
	// If it comes from hidden, put one in the bag
	if (singleMeepleSource[0] === 0) {
		playerObj.hiddenMeeples[meepleArray[0]]--
		deductHiddenMeeple(playerIndex, meepleArray[0])
		store.availableMeeples[meepleArray[0]]++

		// And add it to the server data
		const index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_FROM_PLAYER_TO_BAG)
		if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_MEEPLES_FROM_PLAYER_TO_BAG, [meepleArray[0]]])
		else store.context.endTurnActions[index][2].push(meepleArray[0])
		meeplesRemoved.push(meepleArray[0])
	}
	// Otherwise, if it comes from outbid Turnorder tiles, remove the bid, and add to the bag
	else if (singleMeepleSource[0] === 1) {
		let tile = store.availableTurnOrderTiles.find((t) => t.id === singleMeepleSource[1])
		let outgoingMeeples = []
		for (let i = 0; i < tile.bids[playerIndex][0].length; i++) {
			meeplesRemoved.push(tile.bids[playerIndex][0][i])
			outgoingMeeples.push(tile.bids[playerIndex][0][i])
			store.availableMeeples[tile.bids[playerIndex][0][i]]++
		}
		// And add it to the server data
		const index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_JUST_TO_BAG)
		if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_MEEPLES_JUST_TO_BAG, [...outgoingMeeples]])
		else store.context.endTurnActions[index][2].push(...outgoingMeeples)
		tile.bids[playerIndex][0].splice(0)
	}
	// Otherwise, if it comes from outbid availble tiles, remove the bid, and add to the bag
	else if (singleMeepleSource[0] === 2) {
		let tile = store.availableTiles.find((t) => t.id === singleMeepleSource[1])
		for (let i = 0; i < tile.bids[playerIndex][0].length; i++) {
			meeplesRemoved.push(tile.bids[playerIndex][0][i])
			store.availableMeeples[tile.bids[playerIndex][0][i]]++
			// And add it to the server data
			const index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_JUST_TO_BAG)
			if (typeof tile.bids[playerIndex][0][i] === "number") {
				if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_MEEPLES_JUST_TO_BAG, [tile.bids[playerIndex][0][i]]])
				else store.context.endTurnActions[index][2].push(tile.bids[playerIndex][0][i])
			} else {
				if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_MEEPLES_JUST_TO_BAG, [...tile.bids[playerIndex][0][i]]])
				else store.context.endTurnActions[index][2].push(...tile.bids[playerIndex][0][i])
			}
		}
		tile.bids[playerIndex][0].splice(0)
	}

	// Award the incoming meeples NB IT MUST ALWAYS BE FROM THE AVAILABLE GREEN MEEPLES
	if (store.context.action === rf.ACT_CHOOSE_SET_MEEPLE_FOR_EXCHANGE || store.context.action === rf.ACT_TILE_EXCHANGE_MEEPLE_AUTO) {
		for (let i = numIncomingGreens - 1; i >= 0; i--) {
			if (store.availableGreenMeeples > 0) {
				playerObj.hiddenMeeples[rf.MEEPLE_GREEN]++
				playerObj.knownHiddenMeeples[rf.MEEPLE_GREEN]++

				store.availableGreenMeeples--
				// Add it to the server
				const index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_JUST_TO_PLAYER)
				if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_MEEPLES_JUST_TO_PLAYER, [rf.MEEPLE_GREEN]])
				else store.context.endTurnActions[index][2].push(rf.MEEPLE_GREEN)
			} else numIncomingGreens--
		}

		let message = "You traded "
		for (let i = 0; i < meeplesRemoved.length; i++) {
			message += `<img class="meepleInMessage" src="${view.getImage("meeple_" + meeplesRemoved[i])}" />`
		}
		message += ` for `
		for (let i = 0; i < numIncomingGreens; i++) {
			message += `<img class="meepleInMessage" src="${view.getImage("meeple_green")}" />`
		}
		store.context.meeplesRemoved = [...meeplesRemoved]
		return message
	} /* else if (store.context.action === rf.ACT_CHOOSE_ANY_MEEPLE_FOR_EXCHANGE) {
		let tile = store.availableTiles.find((t) => t.id === singleMeepleSource[1])
		let amount = store.context.selectedTile.action[store.context.selectedTile.upgraded + 1][1]

		let colour = tile.bids[playerIndex][0][0]

		let histData = [colour]
		for (let i = 0; i < amount; i++) histData.push(rf.MEEPLE_RANDOM)
		store.context.historyObj.push([...histData])
		addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_GET_RADOM_MEEPLES_FROM_BAG_TO_PLAYER, amount, store.history.length - 1, [...histData]])
		controller.currentPlayerObj().knownHiddenMeeples[4] += amount

		let message = "End your turn to get "
		for (let i = 0; i < amount; i++) message += `<img class="meepleInMessage" src="${view.getImage("meeple_random")}" /> `
		store.gameMessages.turnEndText = message
		store.context.action = rf.ACT_CONFIRM_END_TURN
	}*/
}

// THIS WAS INLINED ABOVE. This doesn't account for boat 7a or server actions
/*export function getResForSkillTile_core(playerIndex, isInMyVillage, tile_ID) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	let tile
	if (isInMyVillage) {
		tile = playerObj.villageTiles.find((myTile) => myTile.id === tile_ID)
	} else {
		tile = store.availableTiles.find((tile) => tile.id === tile_ID)
		if (!tile) {
			for (let i = 0; i < store.players.length; i++) {
				if (i !== controller.currentPlayerIndex()) {
					tile = store.players[i].villageTiles.find((otherTile) => otherTile.id === tile_ID)
				}
				if (tile) break
			}
		}
	}
	// Remove the skill tile
	playerObj.hiddenSkillTiles[tile.action[store.context.selectedTile.upgraded + 1][0]]--
	deductHiddenSkillTile(playerIndex, tile.action[store.context.selectedTile.upgraded + 1][0])
	store.availableSkills[tile.action[store.context.selectedTile.upgraded + 1][0]]++

	// Remove the first element as that is the skill tile gone
	let incomingRes = tile.action[store.context.selectedTile.upgraded + 1].slice(1)
	let message = "You got "
	for (let i = 0; i < incomingRes.length; i++) {
		message += `<img class="resourceInMessage" src="${view.getImage("res_" + incomingRes[i])}" />`
		if (isInMyVillage) tile.resources[incomingRes[i]]++
		else playerObj.villageTiles[0].resources[incomingRes[i]]++
		store.availableResources[incomingRes[i]]++
	}
	return message
}*/

export function chooseContract(id) {
	const store = useModelStore()
	let new_id = chooseContract_core(controller.currentPlayerIndex(), id)
	// add history, depending on where you're coming from
	// if there is a selected tile, it is a tile action
	if (store.context.selectedTile.id !== -1 || store.gameflow.phase === rf.PHASE_GET_BOOKKEEPER_B_CONTRACT || store.gameflow.phase === rf.PHASE_GET_SECOND_CONTRACT_UPGRADED_MERCHANTS_TILE) {
		// NB THIS MUST GO FIRST AS THERE IS NO SELECTED TILE
		if (store.gameflow.phase === rf.PHASE_GET_BOOKKEEPER_B_CONTRACT) {
			// You are doing this AFTER a skill. So the history has already been saved
			let histIndex = store.history.length - 1
			while (store.history[histIndex][3][0] !== rf.TILE_M_SUMMER_BOOKKEEPER_B) histIndex--
			let histEntry3 = store.history[histIndex][3]

			if (id === -1) {
				histEntry3[histEntry3.length - 1][0] = -1
				histEntry3[histEntry3.length - 1][1] = -1
			} else {
				histEntry3[histEntry3.length - 1][0] = id
				histEntry3[histEntry3.length - 1][1] = id
			}
			//addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
			store.gameflow.phase = rf.PHASE_BIDDING_AND_ACTIONS
		} else if (store.gameflow.phase === rf.PHASE_GET_SECOND_CONTRACT_UPGRADED_MERCHANTS_TILE) {
			// You are doing this AFTER a skill. So the history has already been saved
			let histIndex = store.history.length - 1
			while (store.history[histIndex][3][0] !== rf.TILE_M_AUTUMN_MERCHANT_B) histIndex--
			let histEntry3 = store.history[histIndex][3]

			if (id === -1) {
				//histEntry3[histEntry3.length - 1][0] = -1
				//histEntry3[histEntry3.length - 1][1] = -1
				histEntry3[histEntry3.length - 1].push([-1, -1])
			} else {
				//histEntry3[histEntry3.length - 1][0] = id
				//histEntry3[histEntry3.length - 1][1] = id
				histEntry3[histEntry3.length - 1].push([id])
			}
			//addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
			store.gameflow.phase = rf.PHASE_BIDDING_AND_ACTIONS
		}
		// If it's from ASSAYER_A then it means you didn't choose a res
		else if (store.context.selectedTile.tileID[store.context.selectedTile.upgraded] === rf.TILE_M_SPRING_ASSAYER_A) {
			if (id === -1) store.context.historyObj.push([-1, new_id])
			else {
				store.context.historyObj.push([id])
				addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
				store.context.historyObj.splice(0)
			}
		}
		// ASSAYER_B means auto res plus C
		else if (store.context.selectedTile.tileID[store.context.selectedTile.upgraded] === rf.TILE_M_SPRING_ASSAYER_B) {
			// NB historyObj = [destinationTileID] for the resourrces
			// If choosing random contract
			if (id === -1) store.context.historyObj[store.context.historyObj.length - 1].push(-1, new_id)
			else store.context.historyObj[store.context.historyObj.length - 1].push(id)
			// Otherwise choosing visible contract
			addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
		}
		// If bookkeeper A, then just getting 1 contract
		else if (store.context.selectedTile.tileID[store.context.selectedTile.upgraded] === rf.TILE_M_SUMMER_BOOKKEEPER_A) {
			if (id === -1) store.context.historyObj.push([-1, -1])
			else store.context.historyObj.push([id, id])
			store.context.remainingContracts--
			//store.context.endTurnActions.push([rf.ACT_GET_RANDOM_CONTRACT, 1])
			// If not waiting for random contract, add history
			if (!store.context.localEndTurnActions.some((subArr) => subArr[0] === rf.ACT_GET_RANDOM_CONTRACT)) addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
		}
		// If merchants A, then just getting 1 contract
		else if (store.context.selectedTile.tileID[store.context.selectedTile.upgraded] === rf.TILE_M_AUTUMN_MERCHANT_A) {
			if (id === -1) store.context.historyObj.push([new_id, -1])
			else store.context.historyObj.push([id])
			store.context.remainingContracts--
			//store.context.endTurnActions.push([rf.ACT_GET_RANDOM_CONTRACT, 1])
			// If not waiting for random contract, add history
			if (!store.context.localEndTurnActions.some((subArr) => subArr[0] === rf.ACT_GET_RANDOM_CONTRACT)) addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
		}
		// If merchants B and choice 1, then just getting 2 contracts
		else if (store.context.selectedTile.tileID[store.context.selectedTile.upgraded] === rf.TILE_M_AUTUMN_MERCHANT_B) {
			if (id === -1) store.context.historyObj[store.context.historyObj.length - 1].push([new_id, -1])
			else store.context.historyObj[store.context.historyObj.length - 1].push([id])
			store.context.remainingContracts--

			//store.context.endTurnActions.push([rf.ACT_GET_RANDOM_CONTRACT, 1])
			// If not waiting for random contract, add history
			//if (!store.context.localEndTurnActions.some((subArr) => subArr[0] === rf.ACT_GET_RANDOM_CONTRACT))
			addHistory(rf.HIST_ACT_ON_TILE, controller.currentPlayerIndex(), 0, [...store.context.historyObj])

			if (store.context.remainingContracts === 0) store.context.action = rf.ACT_CONFIRM_END_TURN
			// Otherwise save the game to set up choosing the second contract
			else store.context.action = rf.ACT_END_TURN_FOR_MERCHANTS_B_CONTRACT
			return
		}
	}

	store.context.action = rf.ACT_CONFIRM_END_TURN
}

export function chooseContract_core(playerIndex, id) {
	const store = useModelStore()
	let ret = id
	if (id === -1) {
		/*ret = store.hiddenContracts.pop()
		let newContract = rf.ALL_CONTRACTS.find((c) => c.id === ret)
		store.players[playerIndex].hiddenContracts.push(JSON.parse(JSON.stringify(newContract)))*/
		if (store.gameMessages.turnEndText === "") store.gameMessages.turnEndText = "End your turn to get "
		store.gameMessages.turnEndText += `<svg viewBox="77 131.5 55.5 34" class="contractInMessage">
					<image width="52.916668" height="31.75" preserveAspectRatio="none" xlink:href="${view.getImage("c_back")}" x="78.386688" y="132.625" style="clip-path: url(#conttractClipPath)" />
					<path d="${rf.CONTRACT_PATH_D}" class="contractPathGLOBAL"  />
				</svg>`
		store.context.localEndTurnActions.push([rf.ACT_GET_RANDOM_CONTRACT, 1])
	} else {
		let newContract = rf.ALL_CONTRACTS.find((c) => c.id === id)
		store.players[playerIndex].hiddenContracts.push(JSON.parse(JSON.stringify(newContract)))
		store.players[playerIndex].hiddenContracts[store.players[playerIndex].hiddenContracts.length - 1].visible = 1
		store.visibleContracts = store.visibleContracts.filter((contract_id) => contract_id !== id)
	}
	return ret
	// Do this at end of turn, to prevent re-rolling chosen contract
	//if (store.visibleContracts.length < 3) store.visibleContracts.push(store.hiddenContracts.pop())
}

export function exchangeContractAuto(contract_id, keyNum, item) {
	exchangeContractAuto_core(controller.currentPlayerIndex(), contract_id, keyNum, item)
	addHistory(rf.HIST_EXCHANGE_CONTRACT_AUTO, controller.currentPlayerIndex(), 0, [contract_id, keyNum, item])
}

export function exchangeContractAuto_core(playerIndex, contract_id, keyNum, item) {
	const store = useModelStore()
	// Award the item
	if (keyNum === 0) {
		store.players[playerIndex].hiddenMeeples[item]++
		store.players[playerIndex].knownHiddenMeeples[item]++
		store.availableMeeples[item]--
		// Set up server payload
		const index = store.context.endTurnActions.findIndex((subArr) => subArr[0] === playerIndex && subArr[1] === rf.SERV_MEEPLES_FROM_BAG_TO_PLAYER)
		if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_MEEPLES_FROM_BAG_TO_PLAYER, [item]])
		else store.context.endTurnActions[index][2].push(item)
	} else if (keyNum === 1) {
		store.players[playerIndex].hiddenSkillTiles[item]++
		store.players[playerIndex].knownHiddenSkillTiles[item]++
		store.availableSkills[item]--
		// Set up server payload
		const index = store.context.endTurnActions.findIndex((subArr) => subArr[0] === playerIndex && subArr[1] === rf.SERV_SKILLS_FROM_BAG_TO_PLAYER)
		if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_SKILLS_FROM_BAG_TO_PLAYER, [item]])
		else store.context.endTurnActions[index][2].push(item)
	} else if (keyNum === 2) {
		if (store.availableResources[item] > 0) {
			store.availableResources[item]--
			village.addResourcesToVillage(playerIndex, -1, [item])
		} else {
			store.gameMessages.actionError = "There are no moure of that resource available"
		}
	}
	// Remove the contract
	store.players[playerIndex].hiddenContracts = store.players[playerIndex].hiddenContracts.filter((contract) => contract.id !== contract_id)
}

/***
 *
 * END OF SEASON FUNCTIONS
 *
 *
 */

export function collectUnsuccessfulBids() {
	const store = useModelStore()
	store.context.historyObj.splice(0)
	collectUnsuccessfulBids_core()
	addHistory(rf.HIST_COLLECT_OUTBID_MEEPLES, -1, 0, [...store.context.historyObj])
}

export function collectUnsuccessfulBids_core() {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) store.context.historyObj.push([])
	let allTiles = store.availableTiles.concat(store.availableTurnOrderTiles)

	for (let i = 0; i < allTiles.length; i++) {
		let currentTile = allTiles[i]
		let highestBid = currentTile.bids[currentTile.bids.reduce((maxIndex, bid, currentIndex, arr) => (bid[0].length > arr[maxIndex][0].length ? currentIndex : maxIndex), 0)][0].length

		for (let j = 0; j < currentTile.bids.length; j++) {
			if (currentTile.bids[j][0].length > 0) {
				// Set up a new history entry
				if (currentTile.bids[j][0].length < highestBid) {
					let histEntry = [currentTile.tileID[currentTile.upgraded], []] // use upgraded flag for summer boat tiles - which could use either side

					let incomingMeeples = []
					// Recover the meeples
					for (let k = 0; k < currentTile.bids[j][0].length; k++) {
						store.players[j].hiddenMeeples[currentTile.bids[j][0][k]]++
						store.players[j].knownHiddenMeeples[currentTile.bids[j][0][k]]++
						histEntry[1].push(currentTile.bids[j][0][k])
						incomingMeeples.push(currentTile.bids[j][0][k])
					}
					// Remove meeples from the tile
					currentTile.bids[j][0].splice(0)
					store.context.historyObj[j].push([...histEntry])

					// Set up server payload
					const index = store.context.endTurnActions.findIndex((subArr) => subArr[0] === j && subArr[1] === rf.SERV_MEEPLES_JUST_TO_PLAYER)
					if (index === -1) store.context.endTurnActions.push([j, rf.SERV_MEEPLES_JUST_TO_PLAYER, [...incomingMeeples]])
					else store.context.endTurnActions[index][2].push(...incomingMeeples)
				}
			}
		}
	}
}

// Collect season tiles; put meeples in bag; remove unbid on tiles
export function collectSeasonTiles() {
	const store = useModelStore()
	store.context.historyObj.splice(0)
	let keysidePlayerIndex = collectSeasonTiles_core()
	addHistory(rf.HIST_COLLECT_SEASON_TILES, -1, 0, [...store.context.historyObj])
	if (keysidePlayerIndex !== -1) addHistory(rf.HIST_KEYSIDE_BOAT_INCOME, keysidePlayerIndex, 0, [])
}
export function collectSeasonTiles_core() {
	const store = useModelStore()
	let keysidePlayerIndex = -1
	for (let i = 0; i < store.players.length; i++) store.context.historyObj.push([])

	for (let i = store.availableTiles.length - 1; i >= 0; i--) {
		let currentTile = store.availableTiles[i]
		if (currentTile.bids.some((bid) => bid[0].length > 0)) {
			// set up the history
			let histEntry = [currentTile.tileID[currentTile.upgraded]] // use upgraded flag for summer boat tiles - which could use either side
			let winningPlayerIndex = currentTile.bids.findIndex((bid) => bid[0].length > 0)

			let incomingPlayerMeeples = []
			let incomingBagMeeples = []

			// Collect any meeples on the tile
			for (let j = 0; j < currentTile.meeplesOnTile.length; j++) {
				for (let k = 0; k < currentTile.meeplesOnTile[j].length; k++) {
					store.players[winningPlayerIndex].hiddenMeeples[currentTile.meeplesOnTile[j][k]]++
					store.players[winningPlayerIndex].knownHiddenMeeples[currentTile.meeplesOnTile[j][k]]++
					// Set up the history for collecting tile meeples
					if (histEntry.length === 1) histEntry.push([])
					histEntry[1].push(currentTile.meeplesOnTile[j][k])
					incomingPlayerMeeples.push(currentTile.meeplesOnTile[j][k])
				}
			}
			// Remove meeples from tile
			currentTile.meeplesOnTile.splice(0)

			// Put the WINNING BID meeples in the bag
			for (let j = 0; j < currentTile.bids[winningPlayerIndex][0].length; j++) {
				store.availableMeeples[currentTile.bids[winningPlayerIndex][0][j]]++
				incomingBagMeeples.push(currentTile.bids[winningPlayerIndex][0][j])
			}
			// Remove the meeples from the tile
			currentTile.bids[winningPlayerIndex][0].splice(0)
			//currentTile.ownerIndex = winningPlayerIndex
			store.players[winningPlayerIndex].pendingVillageTiles.push(JSON.parse(JSON.stringify(currentTile)))

			// Add the history
			store.context.historyObj[winningPlayerIndex].push([...histEntry])

			// Set up the server payload
			// Add meeples to player
			let index = store.context.endTurnActions.findIndex((subArr) => subArr[0] === winningPlayerIndex && subArr[1] === rf.SERV_MEEPLES_JUST_TO_PLAYER)
			if (index === -1) store.context.endTurnActions.push([winningPlayerIndex, rf.SERV_MEEPLES_JUST_TO_PLAYER, [...incomingPlayerMeeples]])
			else store.context.endTurnActions[index][2].push(...incomingPlayerMeeples)
			// Add meeples to bag
			index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_JUST_TO_BAG)
			if (index === -1) store.context.endTurnActions.push([winningPlayerIndex, rf.SERV_MEEPLES_JUST_TO_BAG, [...incomingBagMeeples]])
			else store.context.endTurnActions[index][2].push(...incomingBagMeeples)

			// Award Promo Winter Boat KEYSIDE 3x4 res now
			if (currentTile.tileID[0] === rf.TILE_WINTER_KEYSIDE_A) {
				// TODO boat 7a this DEPENDING ON RULING
				for (let i = 0; i < 3; i++) {
					if (store.availableResources[rf.WOOD] > 0) {
						store.players[winningPlayerIndex].villageTiles[0].resources[rf.WOOD]++
						store.availableResources[rf.WOOD]--
					}
					if (store.availableResources[rf.STONE] > 0) {
						store.players[winningPlayerIndex].villageTiles[0].resources[rf.STONE]++
						store.availableResources[rf.STONE]--
					}
					if (store.availableResources[rf.IRON] > 0) {
						store.players[winningPlayerIndex].villageTiles[0].resources[rf.IRON]++
						store.availableResources[rf.IRON]--
					}
					if (store.availableResources[rf.GOLD] > 0) {
						store.players[winningPlayerIndex].villageTiles[0].resources[rf.GOLD]++
						store.availableResources[rf.GOLD]--
					}
				}
				keysidePlayerIndex = winningPlayerIndex
			}
			// Finally, remove the tile from available
			store.availableTiles.splice(i, 1)
		}
	}

	// Any remaining tiles, meeples on tile goes to the bag
	let incomingBagMeeples2 = []
	for (let i = 0; i < store.availableTiles.length; i++) {
		let currentTile = store.availableTiles[i]
		// Move any meeples to the bag
		for (let j = 0; j < currentTile.meeplesOnTile.length; j++) {
			for (let k = 0; k < currentTile.meeplesOnTile[j].length; k++) {
				incomingBagMeeples2.push(currentTile.meeplesOnTile[j][k])
			}
		}
	}
	// Add meeples to bag
	let index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_JUST_TO_BAG)
	if (index === -1) store.context.endTurnActions.push([0, rf.SERV_MEEPLES_JUST_TO_BAG, [...incomingBagMeeples2]])
	else store.context.endTurnActions[index][2].push(...incomingBagMeeples2)

	// Remove all season tiles
	store.availableTiles.splice(0)

	return keysidePlayerIndex
}

export function collectPlayerVillageMeeples() {
	const store = useModelStore()
	store.context.historyObj.splice(0)
	collectPlayerVillageMeeples_core()
	addHistory(rf.HIST_COLLECT_VILLAGE_MEEPLES, -1, 0, [...store.context.historyObj])
}

export function collectPlayerVillageMeeples_core() {
	const store = useModelStore()

	for (let i = 0; i < store.players.length; i++) {
		let incomingMeeples = []
		store.context.historyObj.push([])
		for (let j = 0; j < store.players[i].villageTiles.length; j++) {
			if (store.players[i].villageTiles[j].meeplesOnTile.length > 0) {
				// Meeples to recover, so make a data entry
				let histEntry = [store.players[i].villageTiles[j].tileID[store.players[i].villageTiles[j].upgraded]] //, 0, 0, 0, 0]
				//let recoveredMeeples = []
				for (let k = 0; k < store.players[i].villageTiles[j].meeplesOnTile.length; k++) {
					for (let l = 0; l < store.players[i].villageTiles[j].meeplesOnTile[k].length; l++) {
						store.players[i].hiddenMeeples[store.players[i].villageTiles[j].meeplesOnTile[k][l]]++
						store.players[i].knownHiddenMeeples[store.players[i].villageTiles[j].meeplesOnTile[k][l]]++
						incomingMeeples.push(store.players[i].villageTiles[j].meeplesOnTile[k][l])
						//recoveredMeeples.push(store.players[i].villageTiles[j].meeplesOnTile[k][l])
						//histEntry[store.players[i].villageTiles[j].meeplesOnTile[k][l] + 1]++
						histEntry.push(store.players[i].villageTiles[j].meeplesOnTile[k][l])
					}
				}
				// SHOULD THIS BE JUST FOR BIDS?
				//while (histEntry[histEntry.length - 1] === 0) histEntry.pop()
				//histEntry.push(recoveredMeeples)
				store.context.historyObj[i].push([...histEntry])
				store.players[i].villageTiles[j].meeplesOnTile.splice(0)
			}
		}
		// Add server data before moving on to next player
		const index = store.context.endTurnActions.findIndex((subArr) => subArr[0] === i && subArr[1] === rf.SERV_MEEPLES_JUST_TO_PLAYER)
		if (index === -1) store.context.endTurnActions.push([i, rf.SERV_MEEPLES_JUST_TO_PLAYER, [...incomingMeeples]])
		else store.context.endTurnActions[index][2].push(...incomingMeeples)
	}
}

export function processTurnOrderTiles() {
	const store = useModelStore()
	// Find out who has the current purple meeple
	let oldPurpleMeepleIndex = store.players.findIndex((player) => player.hasPurpleMeeple === true)
	let newPurpleMeepleIndex = -1

	// remove purple meeple
	store.players[oldPurpleMeepleIndex].hasPurpleMeeple = false

	let newTurnOrder = []
	// ASSUME store.availableTurnOrderTiles IS IN ORDER WITH LOWEST FIRST
	for (let i = 0; i < store.availableTurnOrderTiles.length; i++) {
		let currentTile = store.availableTurnOrderTiles[i]
		// check if any winning bids remain
		if (currentTile.bids.some((bid) => bid[0].length > 0)) {
			let winningPlayerIndex = currentTile.bids.findIndex((bid) => bid[0].length > 0)
			// add this player index to the newTurnOrder
			if (!newTurnOrder.includes(winningPlayerIndex) && store.players[winningPlayerIndex].displayName !== rf.BOT_NAME) newTurnOrder.push(winningPlayerIndex)

			// Put the meeples in the bag
			let meeplesToBag = []
			for (let j = 0; j < currentTile.bids[winningPlayerIndex][0].length; j++) {
				store.availableMeeples[currentTile.bids[winningPlayerIndex][0][j]]++
				meeplesToBag.push(currentTile.bids[winningPlayerIndex][0][j])
			}
			// Remove the meeples from the tile
			currentTile.bids[winningPlayerIndex][0].splice(0)

			// Add server payload
			const index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_JUST_TO_BAG)
			if (index === -1) store.context.endTurnActions.push([i, rf.SERV_MEEPLES_JUST_TO_BAG, [...meeplesToBag]])
			else store.context.endTurnActions[index][2].push(...meeplesToBag)

			// NB outbid meeples have already been procesed

			// Award the purple meeple, if it has it
			if (currentTile.hasPurpleMeeple) {
				newPurpleMeepleIndex = winningPlayerIndex
				store.players[winningPlayerIndex].hasPurpleMeeple = true
			}

			// If it is winter, add tile to pendingVillageTiles
			if (store.gameflow.season === rf.WINTER) {
				store.players[winningPlayerIndex].pendingVillageTiles.push(JSON.parse(JSON.stringify(currentTile)))
			}
		}
	}

	// At end of winter, remove all turn order tiles
	if (store.gameflow.season === rf.WINTER) store.availableTurnOrderTiles.splice(0)

	// Now all the turn order tiles have been processed, add in any missing players going clockwise from NEW PURPLE MEEPLE
	if (newPurpleMeepleIndex >= 0) {
		// Rotate purple meeple player to first position
		while (!store.gameflow.fullTurnOrder[0] === newPurpleMeepleIndex) store.gameflow.fullTurnOrder.push(store.gameflow.fullTurnOrder.shift())
		// Now add in any missing players
		for (let i = 0; i < store.gameflow.fullTurnOrder.length; i++) {
			if (!newTurnOrder.includes(store.gameflow.fullTurnOrder[i])) newTurnOrder.push(store.gameflow.fullTurnOrder[i])
		}
	}
	// Otherwise, start from oldPurpleMeepleIndex
	else {
		// Rotate purple meeple player to first position - PURPLE SHOULD BE IN FRIST ANYWAY
		while (!store.gameflow.fullTurnOrder[0] === oldPurpleMeepleIndex) store.gameflow.fullTurnOrder.push(store.gameflow.fullTurnOrder.shift())
		// Now add in any missing players
		for (let i = 0; i < store.gameflow.fullTurnOrder.length; i++) {
			if (!newTurnOrder.includes(store.gameflow.fullTurnOrder[i])) newTurnOrder.push(store.gameflow.fullTurnOrder[i])
		}

		// The purple meeple goes to the player to the left of the old player
		newPurpleMeepleIndex = (oldPurpleMeepleIndex + 1) % store.players.length
		store.players[newPurpleMeepleIndex].hasPurpleMeeple = true
	}

	// reform the turn orders
	store.gameflow.fullTurnOrder.splice(0)
	store.gameflow.fullTurnOrder = [...newTurnOrder]
	store.gameflow.turnOrder.splice(0)
	store.gameflow.turnOrder = [...newTurnOrder]

	// Now remove bots
	for (let i = store.gameflow.turnOrder.length - 1; i >= 0; i--) {
		if (store.players[store.gameflow.turnOrder[i]].displayName === rf.BOT_NAME) store.gameflow.turnOrder.splice(i, 1)
	}
}

export function collectBoatResources(tileID) {
	const store = useModelStore()
	store.context.historyObj.splice(0)
	store.context.historyObj = collectBoatResources_core(controller.currentPlayerIndex(), tileID, store.gameflow.season)

	// Add a history of all the KNOWN items
	addHistory(rf.HIST_COLLECT_BOAT_RESOURCES, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
	// Now add a history for boat 1a RANDOM meeples
	if (store.context.historyObj[store.context.historyObj.length - 1].includes(1)) {
		let histData = [rf.MEEPLE_RANDOM, rf.MEEPLE_RANDOM]
		addHistory(rf.HIST_COLLECT_BOAT1A_RANDOM_MEEPLES, controller.currentPlayerIndex(), 0, [...histData])
		store.context.endTurnActions.push([controller.currentPlayerIndex(), rf.SERV_GET_RADOM_MEEPLES_FROM_BAG_TO_PLAYER, 2, store.history.length - 1, [...histData]])
		controller.currentPlayerObj().knownHiddenMeeples[4] += 2
	}

	// Sea Bastion 2 means select a NEW boat tile
	if (tileID === rf.TILE_M_BOAT_SEA_BASTION_2_B) {
		store.context.action = rf.ACT_CHOOSE_NEW_BOAT_TILE
		store.context.newBoatTileIDs = rules.getNewBoatTileIDs()
	} else if (store.context.action !== rf.ACT_PLACE_BOAT_7A_RESOURCES) store.context.action = rf.ACT_CONFIRM_END_TURN
}

export function collectBoatResources_core(playerIndex, tileID, season) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	let tile = store.availableBoatTiles.find((t) => t.tileID.includes(tileID))
	let retHistoryObj = [tileID]
	// In Winter, collect the tile
	if (season === rf.WINTER) {
		//
	}
	// In Spring / Summer / Autumn, collect the resources on the tile
	else {
		/*itemsOnBoat: {
			meeples: [],
			skillTiles: [],
			cabins: 0,
			greenMeeples: 0,
			resources: [],
			contracts: [],
		},*/
		let incomingMeeples = []
		let incomingSkills = []
		// Add meeples to player
		retHistoryObj.push([...tile.itemsOnBoat.meeples])
		for (let i = 0; i < tile.itemsOnBoat.meeples.length; i++) {
			playerObj.hiddenMeeples[tile.itemsOnBoat.meeples[i]]++
			playerObj.knownHiddenMeeples[tile.itemsOnBoat.meeples[i]]++
			incomingMeeples.push(tile.itemsOnBoat.meeples[i])
		}
		tile.itemsOnBoat.meeples.splice(0)
		// Add skill tiles to player
		retHistoryObj.push([...tile.itemsOnBoat.skillTiles])
		for (let i = 0; i < tile.itemsOnBoat.skillTiles.length; i++) {
			playerObj.hiddenSkillTiles[tile.itemsOnBoat.skillTiles[i]]++
			playerObj.knownHiddenSkillTiles[tile.itemsOnBoat.skillTiles[i]]++

			incomingSkills.push(tile.itemsOnBoat.skillTiles[i])
		}
		tile.itemsOnBoat.skillTiles.splice(0)

		// Set up the server payload
		let index = store.context.endTurnActions.findIndex((subArr) => subArr[0] === playerIndex && subArr[1] === rf.SERV_MEEPLES_JUST_TO_PLAYER)
		if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_MEEPLES_JUST_TO_PLAYER, [...incomingMeeples]])
		else store.context.endTurnActions[index][2].push(...incomingMeeples)
		index = store.context.endTurnActions.findIndex((subArr) => subArr[0] === playerIndex && subArr[1] === rf.SERV_SKILLS_JUST_TO_PLAYER)
		if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_SKILLS_JUST_TO_PLAYER, [...incomingSkills]])
		else store.context.endTurnActions[index][2].push(...incomingSkills)

		// Collect merchant items NB these are never random, so don't need to be added to history (EXCEPT CONTRACTS) (just if there's none left)
		if (tile.itemsOnBoat.cabins > 0) {
			playerObj.villageTiles[0].cabins += tile.itemsOnBoat.cabins
			tile.itemsOnBoat.cabins = 0
		}

		if (tile.itemsOnBoat.greenMeeples > 0) {
			// NB if green meeples was ever 2 with only 1 left this would award you 2. But only ever 1 on boat
			if (store.availableGreenMeeples > 0) {
				playerObj.hiddenMeeples[rf.MEEPLE_GREEN] += tile.itemsOnBoat.greenMeeples
				playerObj.knownHiddenMeeples[rf.MEEPLE_GREEN] += tile.itemsOnBoat.greenMeeples
				tile.itemsOnBoat.greenMeeples = 0
				// Set up the server payload
				let index = store.context.endTurnActions.findIndex((subArr) => subArr[0] === playerIndex && subArr[1] === rf.SERV_MEEPLES_JUST_TO_PLAYER)
				if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_MEEPLES_JUST_TO_PLAYER, [rf.MEEPLE_GREEN]])
				else store.context.endTurnActions[index][2].push(rf.MEEPLE_GREEN)
			}
		}

		if (tile.itemsOnBoat.resources.length > 0) {
			for (let i = 0; i < tile.itemsOnBoat.resources.length; i++) {
				if (store.availableResources[tile.itemsOnBoat.resources[i]] > 0) {
					store.availableResources[tile.itemsOnBoat.resources[i]]--
					store.context.action2 = rf.ACT_CONFIRM_END_TURN
					village.addResourcesToVillage(playerIndex, -1, [tile.itemsOnBoat.resources[i]])
				}
				//playerObj.villageTiles[0].resources[tile.itemsOnBoat.resources[i]]++
			}
			tile.itemsOnBoat.resources.splice(0)
		}

		// NB the contract array MUST be entry 3 if it's going to exist
		if (tile.itemsOnBoat.contracts.length > 0) {
			store.context.hideContractFromBoatCollection = true
			retHistoryObj.push([...tile.itemsOnBoat.contracts])
			for (let i = 0; i < tile.itemsOnBoat.contracts.length; i++) {
				let contract_id = tile.itemsOnBoat.contracts[i]
				let newContract = rf.ALL_CONTRACTS.find((c) => c.id === contract_id)
				playerObj.hiddenContracts.push(JSON.parse(JSON.stringify(newContract)))
			}

			tile.itemsOnBoat.contracts.splice(0)
		}
	}

	let historyFlags = []
	/* HISTORY FLAGS
	 	1 = boat1a
		2 = boat1b+green meeple
		3 = boat1b+NO green meeple
		4 = boat7b+res income
		9 = boat7a used on a res - tileID is the next entry
	*/
	// If you have boat1a you get 2 additional workers from the bag, if possible
	if (village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT1_A)) {
		// After adding boat collection history, this flag is used to generate another history entry
		// The server payload is set at that point
		historyFlags.push(1)
	}
	// If you have boat 1b you get 1 GREEN meeple from SUPPLY, if available
	else if (village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT1_B)) {
		if (store.availableGreenMeeples > 0) {
			historyFlags.push(2)
			playerObj.hiddenMeeples[rf.MEEPLE_GREEN]++
			playerObj.knownHiddenMeeples[rf.MEEPLE_GREEN]++
			store.availableGreenMeeples--
			const index = store.context.endTurnActions.findIndex((subArr) => subArr[1] === rf.SERV_MEEPLES_JUST_TO_PLAYER)
			if (index === -1) store.context.endTurnActions.push([playerIndex, rf.SERV_MEEPLES_JUST_TO_PLAYER, [rf.MEEPLE_GREEN]])
			else store.context.endTurnActions[index][2].push(rf.MEEPLE_GREEN)
		} else if (store.availableGreenMeeples === 0) historyFlags.push(3)
	}

	// 7b gets you res income at end of season
	if (village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT7_B)) {
		// If you have boat 7B then you cannot have boat 7A, so don't worry about boat 7A
		if (store.availableResources[rf.WOOD] > 0) {
			store.players[playerIndex].villageTiles[0].resources[rf.WOOD]++
			store.availableResources[rf.WOOD]--
		}
		if (store.availableResources[rf.STONE] > 0) {
			store.players[playerIndex].villageTiles[0].resources[rf.STONE]++
			store.availableResources[rf.STONE]--
		}
		if (store.availableResources[rf.IRON] > 0) {
			store.players[playerIndex].villageTiles[0].resources[rf.IRON]++
			store.availableResources[rf.IRON]--
		}
		historyFlags.push(4)
	}

	// FLAGS MUST BE THE LAST ENTRY
	retHistoryObj.push([...historyFlags])

	return retHistoryObj
}

export function replaceSeaBation2(tileID) {
	const store = useModelStore()
	store.context.historyObj.splice(0)
	replaceSeaBation2_core(tileID)
	addHistory(rf.HIST_REPLACE_SEA_BASTION_2, controller.currentPlayerIndex(), 0, [tileID])
}

export function replaceSeaBation2_core(tileID) {
	const store = useModelStore()
	// Remove Sea Bastion 2 from availableBoats
	store.availableBoatTiles = store.availableBoatTiles.filter((t) => t.tileID[1] !== rf.TILE_M_BOAT_SEA_BASTION_2_B)

	let newBoatTile = rf.ALL_TILES.find((t) => t.tileID.includes(tileID))
	// Set it to current side
	let currentSide = newBoatTile.seasonsIndex.findIndex((subarray) => subarray.includes(store.gameflow.season))
	newBoatTile.upgraded = currentSide
	// Add the new tile
	store.availableBoatTiles.push(JSON.parse(JSON.stringify(newBoatTile)))
}

/*****
 *
 *
 * ENG GAME FUNCTIONS
 *
 *
 *
 */
const SURROUND_SCORING_TILES = rf.TILE_TURN_ORDER.concat(rf.TILE_SUMMER_DEVELOPER_A, rf.TILE_SUMMER_DEVELOPER_B, rf.TILE_WINTER_BEEKEEPER_A, rf.TILE_WINTER_THE_GLADE_A, rf.TILE_WINTER_THE_GLADE_IN_WINTER_A)
const SCORE_RES_ON_TILE = [rf.TILE_AUTUMN_TIMBER_YARD_A, rf.TILE_AUTUMN_TIMBER_YARD_B, rf.TILE_AUTUMN_STONE_YARD_A, rf.TILE_AUTUMN_STONE_YARD_B, rf.TILE_AUTUMN_BARN_A, rf.TILE_AUTUMN_BARN_B, rf.TILE_AUTUMN_BLACKSMITH_A, rf.TILE_AUTUMN_BLACKSMITH_B]
// Add in appropriate boats
//TILE_SCORE_AUTO_PROCESS = TILE_SCORE_AUTO_PROCESS.concat(, TILE_BOAT_SEA_BREESE_B)
// Add in promo tiles
//TILE_SCORE_AUTO_PROCESS = TILE_SCORE_AUTO_PROCESS.concat(TILE_AUTUMN_TALTON_LODGE_A, TILE_AUTUMN_TALTON_LODGE_B, , , , , )

export function scoreAutoProcessingTilesAndMoveResources(playerIndex) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	let hasBoat3b = village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT3_B)
	for (let i = 0; i < store.players[playerIndex].villageTiles.length; i++) {
		let tile = store.players[playerIndex].villageTiles[i]
		// SCORE surrounding
		if (SURROUND_SCORING_TILES.includes(tile.tileID[tile.upgraded])) {
			// get neighbours - a full array of tiles data
			let neighbours = map.getNeighbours(playerIndex, tile.coord)

			// Score adjacent WINTER tiles
			if (tile.tileID[0] === rf.TILE_WINTER_THE_GLADE_IN_WINTER_A) {
				let winterNeighbours = neighbours.filter((tile) => tile.season === rf.WINTER).length
				tile.victoryPoints[0] = winterNeighbours * 3
			}
			// Score adjacent SUMMER tiles
			else if (tile.tileID[0] === rf.TILE_WINTER_THE_GLADE_A) {
				let summerNeighbours = neighbours.filter((tile) => tile.season === rf.SUMMER).length
				tile.victoryPoints[0] = summerNeighbours * 5
			}
			// Scores for number of upgrade icons on adjacent tiles
			else if (tile.tileID[tile.upgraded] === rf.TILE_SUMMER_DEVELOPER_A || tile.tileID[tile.upgraded] === rf.TILE_SUMMER_DEVELOPER_B) {
				let upgradeNeighbours = neighbours.filter((tile) => tile.action[0] === rf.ACT_TILE_MOVE_AND_UPGRADE)
				let upgradesInNeighbours = 0
				for (let i = 0; i < upgradeNeighbours.length; i++) {
					upgradesInNeighbours += upgradeNeighbours[i].action[upgradeNeighbours[i].upgraded + 1][1]
					if (upgradeNeighbours[i].season === rf.SEASON_HOME_TILE) upgradesInNeighbours += upgradeNeighbours[i].cabins
				}
				if (tile.tileID[tile.upgraded] === rf.TILE_SUMMER_DEVELOPER_A) tile.victoryPoints[0] = upgradesInNeighbours * 2
				else if (tile.tileID[tile.upgraded] === rf.TILE_SUMMER_DEVELOPER_B) tile.victoryPoints[1] = upgradesInNeighbours * 3
			}
			// Otherwise, just score for each neighbour
			else {
				let rawScore = neighbours.length
				if (tile.tileID[0] === rf.TILE_WINTER_BEEKEEPER_A) rawScore *= 2
				tile.victoryPoints[tile.upgraded] = rawScore
			}
		} // End surround tiles
		// SCORE res on tile
		else if (SCORE_RES_ON_TILE.includes(tile.tileID[tile.upgraded])) {
			if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_TIMBER_YARD_A || tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_TIMBER_YARD_B) {
				let woodOnTile = tile.resources[rf.WOOD] + tile.resources[rf.GOLD]
				if (hasBoat3b) woodOnTile = tile.resources.reduce((accumulator, currentValue) => accumulator + currentValue, 0)
				if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_TIMBER_YARD_A) tile.victoryPoints[0] = woodOnTile * 2
				else if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_TIMBER_YARD_B) tile.victoryPoints[1] = woodOnTile * 3
				// Without boat 4b, move stone and iron to home tile
				if (!hasBoat3b) {
					playerObj.villageTiles[0].resources[rf.STONE] += tile.resources[rf.STONE]
					playerObj.villageTiles[0].resources[rf.IRON] += tile.resources[rf.IRON]
					tile.resources[rf.STONE] = 0
					tile.resources[rf.IRON] = 0
				}
			} else if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_STONE_YARD_A || tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_STONE_YARD_B) {
				let stoneOnTile = tile.resources[rf.STONE] + tile.resources[rf.GOLD]
				if (hasBoat3b) stoneOnTile = tile.resources.reduce((accumulator, currentValue) => accumulator + currentValue, 0)
				if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_STONE_YARD_A) tile.victoryPoints[0] = stoneOnTile * 2
				else if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_STONE_YARD_B) tile.victoryPoints[1] = stoneOnTile * 3
				// Without boat 4b, move wood and iron to home tile
				if (!hasBoat3b) {
					playerObj.villageTiles[0].resources[rf.WOOD] += tile.resources[rf.WOOD]
					playerObj.villageTiles[0].resources[rf.IRON] += tile.resources[rf.IRON]
					tile.resources[rf.WOOD] = 0
					tile.resources[rf.IRON] = 0
				}
			} else if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_BLACKSMITH_A || tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_BLACKSMITH_B) {
				let ironOnTile = tile.resources[rf.IRON] + tile.resources[rf.GOLD]
				if (hasBoat3b) ironOnTile = tile.resources.reduce((accumulator, currentValue) => accumulator + currentValue, 0)
				if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_BLACKSMITH_A) tile.victoryPoints[0] = ironOnTile * 2
				else if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_BLACKSMITH_B) tile.victoryPoints[1] = ironOnTile * 3
				// Without boat 4b, move wood and stone to home tile
				if (!hasBoat3b) {
					playerObj.villageTiles[0].resources[rf.WOOD] += tile.resources[rf.WOOD]
					playerObj.villageTiles[0].resources[rf.STONE] += tile.resources[rf.STONE]
					tile.resources[rf.WOOD] = 0
					tile.resources[rf.STONE] = 0
				}
			} else if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_BARN_A || tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_BARN_B) {
				let resCountOnTile = tile.resources.reduce((accumulator, currentValue) => accumulator + currentValue, 0)
				if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_BARN_A) tile.victoryPoints[0] = resCountOnTile
				else if (tile.tileID[tile.upgraded] === rf.TILE_AUTUMN_BARN_B) tile.victoryPoints[1] = resCountOnTile * 2
				// (Don't remove any resources from the barn)
			}
		} // end score res on tile
		// BOAT SCORES
		// SCORE keyflower
		else if (tile.tileID[tile.upgraded] === rf.TILE_BOAT_KEYFLOWER_B) {
			// 1 point for each transport, doubled if they own summer boat 2b
			let hasSummerBoat2b = village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT2_B)
			let movePoints = 0
			for (let j = 0; j < store.players[playerIndex].villageTiles.length; j++) {
				let tile2 = store.players[playerIndex].villageTiles[j]
				if (tile2.action && tile2.action[0] === rf.ACT_TILE_MOVE_AND_UPGRADE) movePoints += tile2.action[tile2.upgraded + 1][0]
			}
			if (hasSummerBoat2b) movePoints *= 2
			tile.victoryPoints[tile.upgraded] = movePoints
		} else if (tile.tileID[tile.upgraded] === rf.TILE_BOAT_SEA_BREESE_B) {
			let boatChainLength = 0
			let homeTile = store.players[playerIndex].villageTiles[0]
			let waterSide = homeTile.sides.indexOf(rf.WATER)

			let foundRiver = true
			let previousTile = homeTile
			let previousWaterSide = waterSide
			let emergency = 0
			while (foundRiver && emergency < 10) {
				// Get the adjacent tile
				let adjacentCoords = map.findAdjacentHexCoordsThroughSide(previousTile.coord, previousWaterSide)
				let newTile = store.players[playerIndex].villageTiles.find((tile) => tile.coord[0] === adjacentCoords[0] && tile.coord[1] === adjacentCoords[1])
				if (!newTile) {
					foundRiver = false
					break
				}
				// Now there is a village tile, so chec if it has water on the correct side
				let joiningWaterSide = (previousWaterSide + 3) % 6
				if (newTile.sides[joiningWaterSide] === rf.WATER) {
					// If it's water, add it to the chain
					boatChainLength++
					previousTile = newTile
					// Set the new water side to the NEW side of the NEW tile, and check it's water
					previousWaterSide = (joiningWaterSide + 3) % 6
					if (newTile.sides[previousWaterSide] !== rf.WATER) foundRiver = false
				}
				// Otherwise, stop looking
				else foundRiver = false

				emergency++
			}

			tile.victoryPoints[tile.upgraded] = rf.getBreeseScore(boatChainLength, true)
		}
		// Score Artisan - 2VP for each upgraded tile
		else if (tile.tileID[0] === rf.TILE_M_WINTER_ARTISAN) {
			let pointsCount = 0
			for (let j = 0; j < store.players[playerIndex].villageTiles.length; j++) {
				let tile2 = store.players[playerIndex].villageTiles[j]
				if (tile2.upgradable && tile2.upgraded === 1) pointsCount += 2
			}
			tile.victoryPoints[0] = pointsCount
		}
		// Score Builder - 3VP per extension
		else if (tile.tileID[0] === rf.TILE_M_WINTER_BUILDER) {
			let pointsCount = 0
			for (let j = 0; j < store.players[playerIndex].villageTiles.length; j++) {
				let tile2 = store.players[playerIndex].villageTiles[j]
				if (tile2.upgradable && tile2.upgraded === 1 && tile2.extension !== rf.EXTENSION_NONE && tile2.extension !== rf.EXTENSION_BANNED) pointsCount += 3
			}
			tile.victoryPoints[0] = pointsCount
		}
		// Score Talton Lodge - 1vp per meeple icon on tiles
		else if (tile.tileID[0] === rf.TILE_AUTUMN_TALTON_LODGE_A) {
			let pointsCount = 0
			for (let j = 0; j < store.players[playerIndex].villageTiles.length; j++) {
				let tile2 = store.players[playerIndex].villageTiles[j]
				pointsCount += tile2.taltonScore[tile2.upgraded]
			}
			tile.victoryPoints[tile.upgraded] = pointsCount
			tile.victoryPoints[1] *= 2
		} else if (tile.tileID[tile.upgraded] === rf.TILE_M_BOAT_IANVINCIBLE_2_B) {
			// Ianvincible 2 - 2vp per upgrade point, inc cabins
			let hasSummerBoat2b = village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT2_B)
			let upgradePoints = 0
			for (let j = 0; j < store.players[playerIndex].villageTiles.length; j++) {
				let tile2 = store.players[playerIndex].villageTiles[j]
				if (tile2.action && tile2.action[0] === rf.ACT_TILE_MOVE_AND_UPGRADE) upgradePoints += tile2.action[tile.upgraded + 1][1]
			}
			// Add on your cabins
			upgradePoints += playerObj.villageTiles[0].cabins
			if (hasSummerBoat2b) upgradePoints *= 2
			tile.victoryPoints[tile.upgraded] = upgradePoints * 2
		} else if (tile.tileID[tile.upgraded] === rf.TILE_M_BOAT_SEA_BREESE_2_B) {
			// Sea Breese 2 - 2vp per winter tile in village - NOT including turn order/boats
			let winterTileCount = 0
			for (let j = 0; j < store.players[playerIndex].villageTiles.length; j++) {
				let tile2 = store.players[playerIndex].villageTiles[j]
				if (tile2.season === rf.WINTER) winterTileCount++
			}
			tile.victoryPoints[tile.upgraded] = winterTileCount * 2
		}
	}

	// Now move all other resources to home tile. Assume any RES_ON_TILE scoring should keep resources
	for (let i = 1; i < store.players[playerIndex].villageTiles.length; i++) {
		let tile = store.players[playerIndex].villageTiles[i]
		// If not scoring the res on the tile, move it to home tile
		if (!SCORE_RES_ON_TILE.includes(tile.tileID[tile.upgraded])) {
			for (let j = 0; j < store.players[playerIndex].villageTiles[i].resources.length; j++) {
				store.players[playerIndex].villageTiles[0].resources[j] += store.players[playerIndex].villageTiles[i].resources[j]
				store.players[playerIndex].villageTiles[i].resources[j] = 0
				/*while (store.players[playerIndex].villageTiles[i].resources[j] > 0) {
					store.players[playerIndex].villageTiles[0].resources[j] += 1
					store.players[playerIndex].villageTiles[i].resources[j] -= 1
				}*/
			}
		}
	}
}

export function findValidTileIdsForRouteSelection() {
	const store = useModelStore()

	let validTileIds = []
	if (store.context.action === rf.ACT_SCORE_DELIVERY_MAN && store.context.deliveryManScoringRoute.length === 0) {
		// First, can only select delivery man
		let tile = controller.currentPlayerObj().villageTiles.find((tile) => tile.tileID[tile.upgraded] === rf.TILE_WINTER_DELIVERY_MAN_A)
		validTileIds.push(tile.id)
	} else if (store.context.action === rf.ACT_SCORE_SEA_BASTION && store.context.seaBastionScoringRoute.length === 0) {
		// First, can select anything
		for (let i = 0; i < controller.currentPlayerObj().villageTiles.length; i++) {
			if (controller.currentPlayerObj().villageTiles[i].sides.includes(rf.ROAD)) validTileIds.push(controller.currentPlayerObj().villageTiles[i].id)
		}
	}
	// Otherwise, you must have started a route
	else if (store.context.action === rf.ACT_SCORE_DELIVERY_MAN || store.context.action === rf.ACT_SCORE_SEA_BASTION) {
		let currentRoute = []
		if (store.context.action === rf.ACT_SCORE_DELIVERY_MAN) currentRoute = [...store.context.deliveryManScoringRoute]
		else if (store.context.action === rf.ACT_SCORE_SEA_BASTION) currentRoute = [...store.context.seaBastionScoringRoute]
		let currentTileId = currentRoute[currentRoute.length - 1]
		let possibleNeighbourIds = map.tilesDistanceFrom(controller.currentPlayerObj().villageTiles, [rf.ROAD], currentTileId)[1]
		if (!possibleNeighbourIds || possibleNeighbourIds.length === 0) return []

		for (let i = 0; i < possibleNeighbourIds.length; i++) {
			let validId = true
			for (let j = 0; j < currentRoute.length - 1; j++) {
				// Can't go forwards along the same route
				if (currentRoute[j] === currentTileId && currentRoute[j + 1] === possibleNeighbourIds[i]) {
					validId = false
					break
				}
				// Can't go backwards along the same route
				else if (currentRoute[j] === possibleNeighbourIds[i] && currentRoute[j + 1] === currentTileId) {
					validId = false
					break
				}
			}

			if (validId) validTileIds.push(possibleNeighbourIds[i])
		}
	}
	return validTileIds
}

export function endGame() {
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.finishedGame = true

	//let finalRes =
	endGame_core()
	store.clearContext()
	//addHistory(rf.HIST_GAME_END, -1, 0, [...finalRes])
}

// ONLY APPLIES TO PROPERLY ENDING GAME
export function endGame_core() {
	const store = useModelStore()

	for (let i = 0; i < store.players.length; i++) {
		calculateTotalFinalScore(i)
	}

	// Create an array of player objects with their original index
	const playerScores = store.players.map((player, index) => ({
		index: index,
		finalScore: player.finalScore,
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
	store.gameflow.phase = rf.PHASE_GAME_OVER
	return result
}

// This runs scoring on all tiles, and sets the player's finalScore, then returns it
export function calculateTotalFinalScore(playerIndex) {
	const store = useModelStore()

	scoreAutoProcessingTilesAndMoveResources(playerIndex)
	let playerObj = store.players[playerIndex]
	//let hasBoat3b = village.doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT3_B)

	let totalScore = 0
	let requireItmesScore = 0
	let autoScoreScore = 0
	let manualScoreScore = 0
	let contractScore = 0
	let goldScore = 0

	// Go through all village tiles, and add to correct section
	for (let i = 0; i < playerObj.villageTiles.length; i++) {
		let tile = playerObj.villageTiles[i]
		// Tiles Needing Items
		if (rf.TILE_SCORE_REQUIRES_ITEMS.includes(tile.tileID[tile.upgraded])) {
			// Base Winter
			if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_JEWELLER_A) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_CRAFTMENS_GUILD_A) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_WATERMILL_A) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_MERCERS_GUILD_A) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_WINDMILL_A) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_SCRIBES_A) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_SCHOLAR_A) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_VILLAGE_HALL_A) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_KEY_MARKET_A) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_KEY_GUILD_A) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_APOTHACARY_A) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			}
			// Base Boat
			else if (tile.tileID[tile.upgraded] === rf.TILE_BOAT_WHITE_WIND_B) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			}
			// Promo Tiles
			else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_EMPORIUM_A) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_MONUMENT_A) {
				requireItmesScore += tile.pointsPerSet * tile.completedSets.length
				totalScore += tile.pointsPerSet * tile.completedSets.length
			}
		}
		// Tiles needing an action
		else if (rf.TILE_VP_MANUAL_ACTION.includes(tile.tileID[tile.upgraded])) {
			if (tile.tileID[tile.upgraded] === rf.TILE_BOAT_SEA_BASTION_B) {
				let score = [...new Set(tile.scoredRoute)].length
				tile.victoryPoints[tile.upgraded] = score
				manualScoreScore += score
				totalScore += score
			} else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_DELIVERY_MAN_A) {
				let score = [...new Set(tile.scoredRoute)].length
				tile.victoryPoints[tile.upgraded] = score
				manualScoreScore += score
				totalScore += score
			}
		}
		// VP that isn't fixed but can be auto-scored
		else if (rf.TILE_SCORE_AUTO_PROCESS.includes(tile.tileID[tile.upgraded])) {
			autoScoreScore += tile.victoryPoints[tile.upgraded]
			totalScore += tile.victoryPoints[tile.upgraded]
		}
		// VP only tiles
		else if (rf.TILE_VP_ONLY.includes(tile.tileID[tile.upgraded])) {
			autoScoreScore += tile.victoryPoints[tile.upgraded]
			totalScore += tile.victoryPoints[tile.upgraded]
			// Extensions score upgrade points again
			if (tile.extension >= 0) {
				autoScoreScore += tile.victoryPoints[tile.upgraded]
				totalScore += tile.victoryPoints[tile.upgraded]
			}
		}
		// score Upgrade Only Points
		else if (rf.TILES_FIXED_SCORING_UPGRADED_ONLY.includes(tile.tileID[tile.upgraded])) {
			autoScoreScore += tile.victoryPoints[tile.upgraded]
			totalScore += tile.victoryPoints[tile.upgraded]
			// Extensions score upgrade points again
			if (tile.extension >= 0) {
				autoScoreScore += tile.victoryPoints[tile.upgraded]
				totalScore += tile.victoryPoints[tile.upgraded]
			}
		}
		// No score, but you get a different action
		/*else if (rf.TILE_FINAL_SCORE_ACTION.includes(tile.tileID[tile.upgraded])) {
			ret.nonScoringAction.push(tile)
		}*/
	}
	let hasWhiteWind2b = village.doesPlayerHaveTileID(playerIndex, rf.TILE_M_BOAT_WHITE_WIND_2_B)
	let hasMuleteer = village.doesPlayerHaveTileID(playerIndex, rf.TILE_M_WINTER_MULETEER)
	// Go through contracts
	for (let i = 0; i < playerObj.hiddenContracts.length; i++) {
		let contract = playerObj.hiddenContracts[i]
		if (contract.completed) {
			let sc = 7
			if (hasWhiteWind2b) sc = 10
			contract.score = sc
		} else {
			contract.score = 0
			if (hasMuleteer) contract.score = 3
		}
		contractScore += contract.score
		totalScore += contract.score
	}

	// Add in 1 vp/gold
	goldScore += playerObj.villageTiles[0].resources[rf.GOLD]
	totalScore += playerObj.villageTiles[0].resources[rf.GOLD]
	playerObj.finalScore = totalScore
	playerObj.requireItmesScore = requireItmesScore
	playerObj.autoScoreScore = autoScoreScore
	playerObj.manualScoreScore = manualScoreScore
	playerObj.contractScore = contractScore
	playerObj.goldScore = goldScore

	if (playerObj.displayName === rf.BOT_NAME) {
		totalScore = -1
		playerObj.finalScore = -1
	}

	return totalScore
}
