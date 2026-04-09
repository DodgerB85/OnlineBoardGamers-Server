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
 * Generally there should be 2 funcitons, like
 * doAction(vars) and doAction_core(otherVars)
 *
 * The core action should do the real meat of the action, so it can be used to recreate a replay
 * the doAction would also contain things like resetting the current action, or things
 * related to actually playing the move in real time
 *
 */
import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal.js"

import * as rf from "./AQYreference.js"
import * as city from "./AQYcity.js"
import * as funcs from "./AQYfuncs.js"
import * as controller from "./AQYcontroller.js"
import * as country from "./AQYcountry.js"
import * as map from "./AQYmap.js"
import * as IO from "../backend/AQY_IO.js"
import * as Bot from "./AQYbot.js"

export function addHistory(event, playerIndex, timeOffset, params) {
	const personal = usePersonalStore()
	const store = useModelStore()

	let time = Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp + timeOffset)
	console.log("addHistory called with event:", event, "playerIndex:", playerIndex, "params:", params)
	store.history.push([event, playerIndex, time, [...params]])
	console.log("History now has length:", store.history.length)
	console.log("Last entry:", store.history[store.history.length - 1])
}

export function initiateGameVars(forReplay = false) {
	const store = useModelStore()

	let COLOURS = funcs.shuffle([rf.BLUE, rf.PURPLE, rf.RED, rf.YELLOW])

	if (forReplay) {
		COLOURS.splice(0)
		for (let i = 0; i < store.players.length; i++) COLOURS.push(store.players[i].colour)
	}

	store.players.splice(0)
	for (let i = 0; i < window.initData.playerNames.length; i++) {
		store.players.push({
			name: window.initData.playerNames[i],
			displayName: "",
			colour: COLOURS[i],
			countrysideBuildings: [],

			cities: [], //[city.createNewCity_core({"q": 0,"r": 0,"s": 0})],
			availableBuildings: [...rf.SINGLE_CITY_BUILDINGS],
			availableHouses: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
			availableMen: 0,
			availableResources: [6, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			saint: rf.SAINT_NONE,
			requiredRebuilds: [],
			cathedralStatus: 0,
			cityHistory: {
				//built: [], // Use flags? Need: bldgNum, cityIndex, index, rotation, payment?
				moved: [], // Use flags? Need: bldgNum, newPos-> cityIndex, index, rotation, payment?
				//manned: [],// Use flags? Need: bldgNum, (if not unique then also: cityIndex, index),
				boardTrades: [], // IN: sets of [out, out, in]
				gravesRemoved: [], // IN: [][][][], up to 4 arrays, 1 per city, with grave indexes in each,
				saintChosen: rf.SAINT_NONE, // IN: just a saint_ID
				razedCathedral: 0, // IN: true/false
			},
			promises: [],
			selectedForZOCline: false, // Use to display individual ZOCs. Not saved
			preMoves: [], // NOT stored in player data. Recreated from special server sent data if required
			// It WILL be saved in simple import / export - handy for any resets mid turn, etc
		})
	}

	store.currentLayout = JSON.parse(JSON.stringify(rf.MAP_LAYOUTS.find((l) => l.players === store.players.length)))

	// Now insert display names
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].name === "SHADOW" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[0]
		else if (store.players[i].name === "SHADOW_2" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[1]
		else if (store.players[i].name === "SHADOW_3" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[2]
		else store.players[i].displayName = store.players[i].name
	}
	for (let i = 0; i < store.players.length; i++) {
		store.gameflow.turnOrder.push(i)
		store.gameflow.fullTurnOrder.push(i)
	}

	store.gameflow.phase = rf.PHASE_FIRST_CITY
	store.gameflow.subPhase = rf.SUB_PHASE_NONE
	store.gameflow.action = rf.ACT_NONE
	store.gameflow.turn = 1

	// GENERATE A NEW MAP
	if (window.initData.startingMap != undefined) {
		map.generateMapFromSeed(window.initData.startingMap)
	} else {
		map.generateMap()
	}

	map.calculateCanvasSize()

	store.players.forEach(() => {
		store.mapData.availableExplorerResources.push(rf.RES_WINE)
		store.mapData.availableExplorerResources.push(rf.RES_GRAIN)
		store.mapData.availableExplorerResources.push(rf.RES_OLIVES)
		store.mapData.availableExplorerResources.push(rf.RES_SHEEP)
	})
	funcs.shuffle(store.mapData.availableExplorerResources)

	//if (!forReplay) addHistory(rf.HIST_NEW_GAME, -1, 0, [[...store.gameflow.fullTurnOrder]])
}

export function updateCountryBuildCalclation(playerIndex, updatecachedZOCtiles) {
	const store = useModelStore()

	/*store.context.countryBuildCalculation.hasWood = true
	store.context.countryBuildCalculation.anyWoodHexes = true
	store.context.countryBuildCalculation.anyPlainsHexes = true
	store.context.countryBuildCalculation.hasSeedRes = true*/
	//return

	let player = store.players[playerIndex]

	if (updatecachedZOCtiles) store.context.countryBuildCalculation.cachedZOCtiles = [...country.getZocTiles(playerIndex, false)]

	/**SEEMINGLY SLOW FUNCTIONS */
	// No mountain hexes
	if (country.getMinePlacementZone(playerIndex, rf.RES_STONE, store.context.countryBuildCalculation.cachedZOCtiles, true) || country.getMinePlacementZone(playerIndex, rf.RES_GOLD, store.context.countryBuildCalculation.cachedZOCtiles, true)) store.context.countryBuildCalculation.anyMountainHexes = true
	else store.context.countryBuildCalculation.anyMountainHexes = false
	// No fisherman hexes
	if (country.getFishermanPlacementZone(playerIndex, store.context.countryBuildCalculation.cachedZOCtiles, true)) store.context.countryBuildCalculation.anyFishermanHexes = true
	else store.context.countryBuildCalculation.anyFishermanHexes = false

	// No Plains
	if (country.getFarmPlacementZone(playerIndex, store.context.countryBuildCalculation.cachedZOCtiles, true)) store.context.countryBuildCalculation.anyPlainsHexes = true
	else store.context.countryBuildCalculation.anyPlainsHexes = false
	// No space for city
	if (country.getCityPlacementZone(playerIndex, store.context.countryBuildCalculation.cachedZOCtiles, true)) store.context.countryBuildCalculation.noSpaceForCity = false
	else store.context.countryBuildCalculation.noSpaceForCity = true

	/*** PROBABLY OK FUNCTIONS */
	// No wood hexxes
	if (country.getWoodcutterPlacementZone(playerIndex, store.context.countryBuildCalculation.cachedZOCtiles, true)) store.context.countryBuildCalculation.anyWoodHexes = true
	else store.context.countryBuildCalculation.anyWoodHexes = false

	/*** REALLY FAST FUNCTIONS */
	// HAS WOOD
	if (player.availableResources[rf.RES_WOOD] === 0) store.context.countryBuildCalculation.hasWood = false
	else store.context.countryBuildCalculation.hasWood = true
	// Cannot afford city
	if (unableToAffordBuilding(playerIndex, rf.COUNTRYSIDE_BLDG_CITY)) store.context.countryBuildCalculation.canAffordCity = false
	else store.context.countryBuildCalculation.canAffordCity = true
	// Any Food Res
	if (!hasFoodRes(playerIndex)) store.context.countryBuildCalculation.hasFoodRes = false
	else store.context.countryBuildCalculation.hasFoodRes = true
	// No seed Res
	if (!hasSeedRes(playerIndex)) store.context.countryBuildCalculation.hasSeedRes = false
	else store.context.countryBuildCalculation.hasSeedRes = true
	// Has Brewery
	if (city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_BREWERY, false)) store.context.countryBuildCalculation.hasBrewery = true
	else store.context.countryBuildCalculation.hasBrewery = false
	// Has Fac Alch
	if (city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_ALCHEMY, true)) store.context.countryBuildCalculation.hasFacAlchToUse = true
	else store.context.countryBuildCalculation.hasFacAlchToUse = false
}

export function unableToAffordBuilding(playerIndex, building) {
	const store = useModelStore()

	let resources = store.players[playerIndex].availableResources

	// Woodcutter and mine and fishery
	if ((building === rf.COUNTRYSIDE_BLDG_WOODCUTTER || building === rf.COUNTRYSIDE_BLDG_MINE || building === rf.COUNTRYSIDE_BLDG_FISHERY) && resources[rf.RES_WOOD] <= 0) return true
	// Inn
	else if (building === rf.COUNTRYSIDE_BLDG_INN && resources[rf.RES_GRAIN] <= 0 && resources[rf.RES_SHEEP] <= 0 && resources[rf.RES_OLIVES] <= 0 && resources[rf.RES_FISH] <= 0) return true
	// Farm
	else if (building === rf.COUNTRYSIDE_BLDG_FARM && !city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_BIOLOGY, true) && resources[rf.RES_GRAIN] <= 0 && resources[rf.RES_OLIVES] <= 0 && resources[rf.RES_SHEEP] <= 0 && resources[rf.RES_WINE] <= 0) return true
	// City
	else if (building === rf.COUNTRYSIDE_BLDG_CITY) {
		if (resources[rf.RES_WOOD] <= 0) return true
		else if (resources[rf.RES_STONE] <= 0) return true
		else if (resources[rf.RES_GOLD] + resources[rf.RES_WINE] + resources[rf.RES_PEARLS] + resources[rf.RES_DYE] < 2) return true
		else if (resources[rf.RES_GRAIN] + resources[rf.RES_OLIVES] + resources[rf.RES_SHEEP] + resources[rf.RES_FISH] < 1) return true
		// If you don't have Fac Phil, and you have 2 lux but not 2D lux, you cannot afford
		else if (!city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_PHILOSOPHY)) {
			let relevantRes = [resources[rf.RES_GOLD], resources[rf.RES_WINE], resources[rf.RES_PEARLS], resources[rf.RES_DYE]]
			const nonZeroResCount = relevantRes.filter((value) => value > 0).length
			if (nonZeroResCount < 2) return [-2]
		}
	}
	return false
}

export function hasFoodRes(playerIndex) {
	const store = useModelStore()

	if (store.players[playerIndex].availableResources[rf.RES_GRAIN] > 0) return true
	if (store.players[playerIndex].availableResources[rf.RES_SHEEP] > 0) return true
	if (store.players[playerIndex].availableResources[rf.RES_OLIVES] > 0) return true
	if (store.players[playerIndex].availableResources[rf.RES_FISH] > 0) return true
	return false
}

export function hasSeedRes(playerIndex) {
	const store = useModelStore()

	if (city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_BIOLOGY, true)) return true
	if (store.players[playerIndex].availableResources[rf.RES_GRAIN] > 0) return true
	if (store.players[playerIndex].availableResources[rf.RES_SHEEP] > 0) return true
	if (store.players[playerIndex].availableResources[rf.RES_OLIVES] > 0) return true
	if (store.players[playerIndex].availableResources[rf.RES_WINE] > 0) return true
	return false
}

// This checks for the saint OR maria
export function hasWorkingSaint(playerIndex, saint) {
	const store = useModelStore()

	let player = store.players[playerIndex]
	//If incorrect saint or not maria, false
	if (player.saint !== saint && player.saint !== rf.SAINT_MARIA) return false
	// If no working cathedral, must be false
	if (!city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_CATHEDRAL)) return false

	// Now they have the saint, or maria, plus a working cathedral. So true
	return true
}

export function getFamineLevel() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (store.gameflow.phase !== rf.PHASE_CITY_BUILDING) return store.famineLevel
	if (personal.pov < 0) return store.famineLevel
	// emergency check
	if (store.gameflow.turnOrder.length === 0) return store.famineLevel

	// If city building, need to check your fountains
	let fountainsBuilt = 0
	let player = store.players[personal.pov]
	if (personal.trainingGame) player = store.players[store.gameflow.turnOrder[0]]
	for (let j = 0; j < player.cities.length; j++) {
		for (let k = 0; k < player.cities[j].buildings.length; k++) {
			let bldg = player.cities[j].buildings[k]

			// BUILT THIS TURN
			if (bldg.builtThisTurn) {
				if (bldg.bldgNum === rf.BLDG_FOUNTAIN) fountainsBuilt++
				//if (bldg.bldgNum === rf.BLDG_CATHEDRAL) cathedralsBuilt++
			}
		}
	}
	return store.famineLevel - fountainsBuilt
}

export function createUndoPoint() {
	const store = useModelStore()
	//store.context.justUndone = false
	store.undoPoints.push(funcs.simpleExportWholeModel())
}

export function undoLastAction() {
	const store = useModelStore()

	// 0 or 1 action is the same as a whole turn reset
	if (store.undoPoints.length === 0) {
		// || store.undoPoints.length === 1) {
		resetWholeTurn()
		return
	}
	// Remove the action we have just done from the saves IF IT IS THE SAME
	/*if (funcs.simpleExportWholeModel() === store.undoPoints[store.undoPoints.length - 1]) {
		store.undoPoints.pop()
	}*/
	/*if (!store.context.justUndone) {
		store.undoPoints.pop()
		store.context.justUndone = true
	}*/

	store.undoPoints.pop()
	// Get the next action
	let restorePoint = store.undoPoints[store.undoPoints.length - 1]
	let tempRelevantIncomingTrades = [...store.context.relevantIncomingTrades]
	let tempRelevantOutgoingTrades = [...store.context.relevantOutgoingTrades]
	let tempIrrelevantTrades = [...store.context.irrelevantTrades]

	funcs.simpleImportWholeModel(restorePoint)
	//store.context.justUndone = true
	//store.undoPoints.pop()
	store.context.cityIndexesToHighlightClick.splice(0)
	store.context.action = rf.ACT_NONE
	// remove mine oulines
	store.clearHistoryHelpers()
	//createUndoPoint()
	store.context.relevantIncomingTrades.splice(0)
	store.context.relevantIncomingTrades = [...tempRelevantIncomingTrades]
	store.context.relevantOutgoingTrades.splice(0)
	store.context.relevantOutgoingTrades = [...tempRelevantOutgoingTrades]
	store.context.irrelevantTrades.splice(0)
	store.context.irrelevantTrades = [...tempIrrelevantTrades]
}

export async function resetWholeTurn() {
	const store = useModelStore()

	let tempRelevantIncomingTrades = [...store.context.relevantIncomingTrades]
	let tempRelevantOutgoingTrades = [...store.context.relevantOutgoingTrades]
	let tempIrrelevantTrades = [...store.context.irrelevantTrades]

	store.clearVars() // Why not? Maybe need to keep turn setup vars
	store.clearHistoryHelpers()

	await funcs.simpleImportWholeModel(store.wholeTurnResetData)
	store.context.historyObj.splice(0)
	setInitialViewport(store.gameflow.phase)
	//if (store.gameflow.phase !== rf.PHASE_HARVEST) {
	controller.startPlayerTurn()
	//}

	// Add an undo point
	store.context.saintHousesThisTurn.splice(0)
	store.context.saintHouse = -1
	store.context.relevantIncomingTrades.splice(0)
	store.context.relevantIncomingTrades = [...tempRelevantIncomingTrades]
	store.context.relevantOutgoingTrades.splice(0)
	store.context.relevantOutgoingTrades = [...tempRelevantOutgoingTrades]
	store.context.irrelevantTrades.splice(0)
	store.context.irrelevantTrades = [...tempIrrelevantTrades]
	createUndoPoint()
}

export function resetPreMove() {
	const store = useModelStore()

	let tempRelevantIncomingTrades = [...store.context.relevantIncomingTrades]
	let tempRelevantOutgoingTrades = [...store.context.relevantOutgoingTrades]
	let tempIrrelevantTrades = [...store.context.irrelevantTrades]

	store.clearVars() // Why not? Maybe need to keep turn setup vars
	store.clearHistoryHelpers()

	funcs.simpleImportWholeModel(store.prePhaseResetData)
	store.context.historyObj.splice(0)
	store.topMenuViews.showingPlayerIndex = -1
	//setInitialViewport(store.gameflow.phase)
	//if (store.gameflow.phase !== rf.PHASE_HARVEST) {
	controller.startPlayerTurn()
	//}

	// Add an undo point
	store.context.saintHousesThisTurn.splice(0)
	store.context.saintHouse = -1
	store.context.relevantIncomingTrades.splice(0)
	store.context.relevantIncomingTrades = [...tempRelevantIncomingTrades]
	store.context.relevantOutgoingTrades.splice(0)
	store.context.relevantOutgoingTrades = [...tempRelevantOutgoingTrades]
	store.context.irrelevantTrades.splice(0)
	store.context.irrelevantTrades = [...tempIrrelevantTrades]
	createUndoPoint()
}

export function setInitialViewport(phase) {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (rf.COUNTRY_PHASES.includes(phase)) store.topMenuViews.showingPlayerIndex = -1
	else if (!personal.trainingGame) store.topMenuViews.showingPlayerIndex = personal.topMenuViews
	else if (personal.trainingGame) store.topMenuViews.showingPlayerIndex = store.gameflow.turnOrder[0]
}

export function setHarvestPhase() {
	const store = useModelStore()

	// AUTO HARVEST IS DONE DURING PLAYER SKIP TURN CHECK
	//let mannedForcedLabour = false
	//if (city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_FORCED_LABOUR, false)) mannedForcedLabour = true

	/*if (store.context.action !== rf.ACT_HARVEST && country.canAutoHarvest(controller.currentPlayerIndex(), mannedForcedLabour)) {
		country.doAutoHarvest(controller.currentPlayerIndex(), mannedForcedLabour)
		return
	}*/

	store.gameflow.phase = rf.PHASE_HARVEST
	country.getResourcesHexesForHarvest(controller.currentPlayerIndex())
}

export function setPollutionPhase(playerIndex) {
	const store = useModelStore()

	store.context.historyObj.splice(0)
	store.context.action = rf.ACT_PLACE_COUNTRYSIDE_POLLUTION
	store.context.hexesToHighlight.splice(0)

	store.context.pollutionLeftToPlace = country.getPendingPollution(playerIndex)

	const zoc = country.getPollutionPlacementZone(controller.currentPlayerIndex())

	// TEST TO CHECK POLLUTION -> GRAVES
	//zoc.splice(0)

	// TEST TO CHECK POLL -> GRAVES
	//zoc.push({"id":72,"terrainType":2,"rotation":0,"hex":{"q":-2,"r":-2,"s":4},"mountainType":-1})

	if (zoc.length === 0 && store.context.pollutionLeftToPlace > 0) {
		// Set the number of graves to place
		store.context.gravesLeftToPlace = store.context.pollutionLeftToPlace
		city.startGravePlacement(playerIndex)

		if (!store.context.cityIndexesToHighlightClick.some((citySpots) => citySpots.length > 0)) {
			Bot.actionGraveGameOver()
			return
		}

		store.context.pollutionLeftToPlace = 0
		store.topMenuViews.showingPlayerIndex = controller.currentPlayerIndex()
	}

	store.context.hexesToHighlight = zoc
}

export function processPreMove(preMoveJSON) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let playerIndex = preMoveJSON.playerIndex
	let playerObj = store.players[playerIndex]
	let phase = preMoveJSON.phase - 10
	let data = preMoveJSON.data

	// Copy from controller.endPlayerTurn()
	store.clearMessages()

	// Remove undo points
	store.undoPoints.splice(0)

	store.context.historyObj.splice(0)

	if (phase === rf.PHASE_STORE_GOODS) {
		store.players[playerIndex].availableResources = [...data]
		store.context.historyObj.splice(0)
		for (let i = 0; i < playerObj.availableResources.length; i++) {
			if (playerObj.availableResources[i] > 0) {
				for (let j = 0; j < playerObj.availableResources[i]; j++) store.context.historyObj.push(i)
			}
		}
		addHistory(rf.HIST_STORE_GOODS, playerIndex, 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
	} else if (phase === rf.PHASE_HARVEST) {
		// each entry in data is in the form [[res[j].resType, res[j].hexId, 1/0 for discard]]
		//country.getResourcesHexesForHarvest(playerIndex)
		for (let i = 0; i < data.length; i++) {
			country.getResourcesHexesForHarvest(playerIndex)
			let hexToHarvest = store.context.hexesToHighlight.find((hex) => hex.id === data[i][1])
			country.harvestResources_core(hexToHarvest, playerIndex)
		}
		store.context.hexesToHighlight.splice(0)
		addHistory(rf.HIST_HARVEST, playerIndex, 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
	} else if (phase === rf.PHASE_EXPLORE) {
		// skip explore if pre chosen
		if (data[0] === -1) {
			addHistory(rf.HIST_MANUAL_SKIP_EXPLORE, playerIndex, 0, [])
		} else if (data[0] !== -1) {
			let explorerHexId = data[0]
			if (!store.mapData.explorers.includes(explorerHexId)) {
				// You can no longer explore the pre chosen explorer. So check if there is another valid move
				let validAlternativeExplorer = false
				const zoc = country.getZocTiles(playerIndex, true)
				for (let i = 0; i < zoc.length; i++) {
					if (store.mapData.explorers.includes(zoc[i])) {
						validAlternativeExplorer = true
						break
					}
				}

				// If there are more graves than pre-places, send notification instead
				if (validAlternativeExplorer) {
					// send notification to current player
					IO.sendNotification(controller.currentPlayerObj().name)
					// Stop from shifting turn order
					return false
				}
				// I think this is now redundent. If the player has no valid explorers, then they get auto skipped prior to this
				addHistory(rf.HIST_INVALID_PRE_EXPLORE, playerIndex, 0, [])
			} else if (store.mapData.explorers.includes(explorerHexId)) {
				let tile = map.getHexDataFromID(explorerHexId)
				country.exploreTile(tile, playerIndex, true)
			}
		}
	} else if (phase === rf.PHASE_FAMINE) {
		let gravesLeftToPlace = city.getTotalGravesToPlace(playerIndex)

		// If there are more graves than pre-places, send notification instead
		if (gravesLeftToPlace > data.length) {
			// send notification to current player
			IO.sendNotification(controller.currentPlayerObj().name)
			// Stop from shifting turn order
			return false
		}

		for (let i = 0; i < data.length; i++) {
			if (gravesLeftToPlace > 0) city.addGraveToCity(playerIndex, data[i][0], data[i][1], true, false)
			gravesLeftToPlace--
		}
		addHistory(rf.HIST_FAMINE, playerIndex, 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
	} else if (phase === rf.PHASE_POLLUTION) {
		let hexData = data[0]
		let pollutionLeftToPlace = country.getPendingPollution(playerIndex)
		let errorFound = false

		const zoc = country.getZocTiles(playerIndex, false)

		const dumpRestrictedTiles = new Set()

		store.players.forEach((player, index) => {
			if (city.hasWorkingUniqueBuilding(index, rf.BLDG_DUMP) && index != playerIndex) {
				country.getZocTiles(index, true, true).forEach((hexId) => dumpRestrictedTiles.add(hexId))
			}
		})

		let disallowedHexesIDs = []

		const allowedHexes = zoc.filter((hex) => {
			if (country.hexOccupied(hex.id)) return false
			if (country.hexPolluted(hex.id)) return false
			if (dumpRestrictedTiles.has(hex.id)) {
				disallowedHexesIDs.push(hex.id)
				return false
			}
			return true
		})

		let allowedIDs = allowedHexes.map((hex) => hex.id)

		// Unique the hex data to make sure there's no pollution stacking
		hexData = [...new Set(hexData)]

		// Verify each pollution position is still allowed
		for (let i = 0; i < hexData.length; i++) {
			if (!allowedIDs.includes(hexData[i])) {
				errorFound = true
				break
			}
		}

		// If no error, action the move
		if (!errorFound) {
			for (let i = 0; i < hexData.length; i++) {
				country.placePollution_core(map.getHexDataFromID(hexData[i]))
				pollutionLeftToPlace--
			}
		}
		if (pollutionLeftToPlace === 0) addHistory(rf.HIST_ADD_POLLUTIONS, playerIndex, 0, [...data])
		else errorFound = true

		if (errorFound) {
			// send notification to current player
			IO.sendNotification(controller.currentPlayerObj().name)
			// Stop from shifting turn order
			return false
		}
	}

	store.gameflow.turnOrder.shift()

	// If not a simul phase, check to see if you can skip the next player
	controller.actionAllPlayerSkips()

	// Check for all turns complete
	if (store.gameflow.turnOrder.length === 0) {
		// POSSIBLE NEEDED TEMP FIX
		// Maybe copy fullTurnOrder in here so that vue updates don't break on zero TO length?
		return controller.endCurrentPhase()
	}
	return false
}

/*************************************************************** WINNING CODE START */

export function checkWinningCondition(playerIndex) {
	const store = useModelStore()
	let currentPlayer = store.players[playerIndex]

	if (currentPlayer.saint === rf.SAINT_NONE) {
		return false
	} else if (currentPlayer.saint === rf.SAINT_NICOLO) {
		return status_nicolo_20houses(playerIndex)
	} else if (currentPlayer.saint === rf.SAINT_BARBARA) {
		return status_barbara_buildings(playerIndex)
	} else if (currentPlayer.saint === rf.SAINT_CHRISTOFORI) {
		return status_christo_3foodLux(playerIndex)
	} else if (currentPlayer.saint === rf.SAINT_GIORGIO) {
		return status_giorgio_enclosing(playerIndex)
	} else if (currentPlayer.saint === rf.SAINT_MARIA) {
		let winConditions = 0
		if (status_nicolo_20houses(playerIndex)) winConditions = winConditions + 1
		if (status_barbara_buildings(playerIndex)) winConditions = winConditions + 1
		if (status_christo_3foodLux(playerIndex)) winConditions = winConditions + 1
		if (status_giorgio_enclosing(playerIndex)) winConditions = winConditions + 1
		return winConditions >= 2
	}
}

export function status_nicolo_20houses(playerIndex) {
	/**
	 * San Nicolo
	 * Wins if he has 20 people
	 */
	const store = useModelStore()
	let isWin = false
	isWin = store.players[playerIndex].availableHouses.length === 0
	return isWin
}

export function data_nicolo_20houses(playerIndex) {
	const store = useModelStore()
	return store.players[playerIndex].availableHouses.length
}

export function status_barbara_buildings(playerIndex) {
	/**
	 * Santa Barbara
	 * Built each city building at least once
	 * No need grave
	 */
	let isWin = false
	let data = data_barbara_buildings(playerIndex)
	isWin = data.every((entry) => entry === 2)
	return isWin
}

export function data_barbara_buildings(playerIndex) {
	const store = useModelStore()
	//let player = store.players[playerIndex]

	let hasStorage = 0
	let hasCart = 0
	let hasFountain = 0
	//let hasAllUniqueBuilding = true

	/*store.players[playerIndex].cities.forEach((playerCity, cityIdz) => {
		playerCity.buildings.forEach((building) => {
			if (building.bldgNum === rf.BLDG_STORAGE) {
				if (hasStorage === 0) hasStorage = 1
				if (hasStorage === 1 && city.isBuildingGraveFree(playerIndex, cityIdz, building)) hasStorage = 2
			}
			else if (building.bldgNum === rf.BLDG_CART) {
				if (hasCart === 0) hasCart = 1
				if (hasCart === 1 && city.isBuildingGraveFree(playerIndex, cityIdz, building)) hasCart = 2
			}
			else if (building.bldgNum === rf.BLDG_FOUNTAIN) {
				if (hasFountain === 0) hasFountain = 1
				if (hasFountain === 1 && city.isBuildingGraveFree(playerIndex, cityIdz, building)) hasFountain = 2
			}
		})
	})*/
	for (let i = 0; i < store.players[playerIndex].cities.length; i++) {
		for (let j = 0; j < store.players[playerIndex].cities[i].buildings.length; j++) {
			if (store.players[playerIndex].cities[i].buildings[j].bldgNum === rf.BLDG_STORAGE) {
				if (hasStorage === 0) hasStorage = 1
				if (hasStorage === 1 && city.isBuildingGraveFree(playerIndex, i, store.players[playerIndex].cities[i].buildings[j])) hasStorage = 2
			} else if (store.players[playerIndex].cities[i].buildings[j].bldgNum === rf.BLDG_CART) {
				if (hasCart === 0) hasCart = 1
				if (hasCart === 1 && city.isBuildingGraveFree(playerIndex, i, store.players[playerIndex].cities[i].buildings[j])) hasCart = 2
			} else if (store.players[playerIndex].cities[i].buildings[j].bldgNum === rf.BLDG_FOUNTAIN) {
				if (hasFountain === 0) hasFountain = 1
				if (hasFountain === 1 && city.isBuildingGraveFree(playerIndex, i, store.players[playerIndex].cities[i].buildings[j])) hasFountain = 2
			}
		}
	}
	let hasHouse = store.players[playerIndex].availableHouses.length < 20 ? 2 : 0

	let buildingsBuilt = [hasHouse, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, hasCart, hasFountain, hasStorage]
	/*for (let i = 0; i < store.players[playerIndex].availableBuildings.length; i++) {
		if (store.players[playerIndex].availableBuildings[i] >= 1 && store.players[playerIndex].availableBuildings[i] <= 15) {
			buildingsBuilt[store.players[playerIndex].availableBuildings[i]] = false
		}
	}*/
	for (let i = 0; i < store.players[playerIndex].cities.length; i++) {
		for (let j = 0; j < store.players[playerIndex].cities[i].buildings.length; j++) {
			if (rf.SINGLE_CITY_BUILDINGS.includes(store.players[playerIndex].cities[i].buildings[j].bldgNum)) {
				if (buildingsBuilt[store.players[playerIndex].cities[i].buildings[j].bldgNum] === 0) {
					buildingsBuilt[store.players[playerIndex].cities[i].buildings[j].bldgNum] = 1
				}
				if (buildingsBuilt[store.players[playerIndex].cities[i].buildings[j].bldgNum] === 1 && city.isBuildingGraveFree(playerIndex, i, store.players[playerIndex].cities[i].buildings[j])) {
					buildingsBuilt[store.players[playerIndex].cities[i].buildings[j].bldgNum] = 2
				}
			}
		}
	}

	return buildingsBuilt
}

export function status_christo_3foodLux(playerIndex) {
	/**
	 * San Christofori
	 * has 3 of each food and luxury
	 */
	const store = useModelStore()
	let isWin = false
	let hasGrain = store.players[playerIndex].availableResources[rf.RES_GRAIN] >= 3
	let hasSheep = store.players[playerIndex].availableResources[rf.RES_SHEEP] >= 3
	let hasOlives = store.players[playerIndex].availableResources[rf.RES_OLIVES] >= 3
	let hasFish = store.players[playerIndex].availableResources[rf.RES_FISH] >= 3

	let hasGold = store.players[playerIndex].availableResources[rf.RES_GOLD] >= 3
	let hasWine = store.players[playerIndex].availableResources[rf.RES_WINE] >= 3
	let hasPearls = store.players[playerIndex].availableResources[rf.RES_PEARLS] >= 3
	let hasDye = store.players[playerIndex].availableResources[rf.RES_DYE] >= 3

	isWin = hasGrain && hasSheep && hasOlives && hasFish && hasGold && hasWine && hasPearls && hasDye
	return isWin
}

export function data_christo_3foodLux(playerIndex) {
	const store = useModelStore()
	let grain = store.players[playerIndex].availableResources[rf.RES_GRAIN]
	let sheep = store.players[playerIndex].availableResources[rf.RES_SHEEP]
	let olives = store.players[playerIndex].availableResources[rf.RES_OLIVES]
	let fish = store.players[playerIndex].availableResources[rf.RES_FISH]

	let gold = store.players[playerIndex].availableResources[rf.RES_GOLD]
	let wine = store.players[playerIndex].availableResources[rf.RES_WINE]
	let pearls = store.players[playerIndex].availableResources[rf.RES_PEARLS]
	let dye = store.players[playerIndex].availableResources[rf.RES_DYE]

	return [grain, sheep, olives, fish, gold, wine, pearls, dye]
}

export function status_giorgio_enclosing(playerIndex) {
	/**
	 * San Giorgio
	 * Enclosing another player
	 * Need not reach the hexes which contain the inns and cities of the other player
	 */

	const store = useModelStore()
	let isWin = false

	let zocTileID = country.getZocTiles(playerIndex).map((tile) => tile.id)
	// Implemetation of getZocTiles does not include the inn and city tiles
	// To check if we can enclose another player, we need to add the inn and city hex to current player's zoc
	let currentPlayerCityTileID = store.players[playerIndex].cities.map((city) => map.getIDfromHex(city.hex))
	let currentPlayerAllCityTileID = []
	for (let i = 0; i < currentPlayerCityTileID.length; i++) {
		currentPlayerAllCityTileID = currentPlayerAllCityTileID.concat(store.mapNeighbours[currentPlayerCityTileID[i]])
	}
	zocTileID = zocTileID.concat(currentPlayerAllCityTileID)

	let currentPlayerAllInnTileID = store.players[playerIndex].countrysideBuildings.filter((cb) => cb.type === rf.COUNTRYSIDE_BLDG_INN).map((cb) => cb.hexId)
	zocTileID = zocTileID.concat(currentPlayerAllInnTileID)

	let resDisplay = []

	for (let i = 0; i < store.players.length; i++) {
		if (i != playerIndex) {
			//let targetPlayer = store.players[i]

			let targetPlayerZocTileID = country.getZocTiles(i, false, true, true, true) //.map((tile) => tile.id)
			let zocNotEnclosed = targetPlayerZocTileID.filter((id) => zocTileID.indexOf(id) == -1)
			zocNotEnclosed.forEach((id) => {
				resDisplay.push(map.getHexDataFromID(id))
			})
			if (zocNotEnclosed.length === 0) isWin = true
		}
	}
	//store.context.hexesToHighlight = resDisplay
	return isWin
}

export function data_giorgio_enclosing(currentPlayerIndex, targetPlayerIndex) {
	const store = useModelStore()

	let zocTileID = country.getZocTiles(currentPlayerIndex).map((tile) => tile.id)
	// Implemetation of getZocTiles does not include the inn and city tiles
	// To check if we can enclose another player, we need to add the inn and city hex to current player's zoc
	let currentPlayerCityTileID = store.players[currentPlayerIndex].cities.map((city) => map.getIDfromHex(city.hex))
	let currentPlayerAllCityTileID = []
	for (let i = 0; i < currentPlayerCityTileID.length; i++) {
		currentPlayerAllCityTileID = currentPlayerAllCityTileID.concat(store.mapNeighbours[currentPlayerCityTileID[i]])
	}
	zocTileID = zocTileID.concat(currentPlayerAllCityTileID)

	let currentPlayerAllInnTileID = store.players[currentPlayerIndex].countrysideBuildings.filter((cb) => cb.type === rf.COUNTRYSIDE_BLDG_INN).map((cb) => cb.hexId)
	zocTileID = zocTileID.concat(currentPlayerAllInnTileID)

	//let targetPlayer = store.players[targetPlayerIndex]

	//let targetPlayerZocTileID = country.getZocTiles(targetPlayerIndex).map((tile) => tile.id)
	// For the target player, we only need to enclose the ID's of NON city NON inns
	let targetPlayerZocTileID = country.getZocTiles(targetPlayerIndex, false, true, true, true)
	let zocNotEnclosed = targetPlayerZocTileID.filter((id) => zocTileID.indexOf(id) == -1)
	return zocNotEnclosed.length
}

export function getUnpollutedArea(playerIndex) {
	const store = useModelStore()
	//let zocTileID = country.getZocTiles(playerIndex).map((tile) => tile.id)
	let zocTileID = country.getZocTiles(playerIndex, false, true, true, true)	
	
	//let pollutionTileID = store.mapData.pollution.map((pollution) => pollution.hexId)

	//let unpollutedArea = zocTileID.filter((id) => store.mapData.pollution.indexOf(id) == -1)

	let ineligibleIDs = []

	// Remove cities
	let cityCenters = []
	// First, get the city central co-ords
	for (let i=0;i<store.players.length;i++) {
		for (let j=0;j<store.players[i].cities.length;j++) {
			cityCenters.push({hex:store.players[i].cities[j].hex})
		}
	}

	// Gather the city center IDs
	for (let i = 0; i < cityCenters.length; i++) {
		ineligibleIDs.push(map.getIDfromHex(cityCenters[i].hex))
	}

	// Now add in the closest neighbouts - IE the city ring
	for (let i = ineligibleIDs.length - 1; i >= 0; i--) {
		ineligibleIDs = ineligibleIDs.concat([...store.mapNeighbours[ineligibleIDs[i]]])
	}

	// Pollution is ineligible
	ineligibleIDs = ineligibleIDs.concat(...store.mapData.pollution)

	// Remove inns
	const inns = store.players[playerIndex].countrysideBuildings.filter((cb) => cb.type === rf.COUNTRYSIDE_BLDG_INN)
	inns.forEach((inn) => ineligibleIDs.push(inn.hexId))

	
	// Remove men/resources
	for (const player of store.players) {
		for (const building of player.countrysideBuildings) {
			if (building.resources.length > 0) {
				for (const resource of building.resources) {
					ineligibleIDs.push(resource.hexId)
				}
			}
		}
	}

	// Remove fisheries
	for (const player of store.players) {
		let fisheries = country.getFisheries(player.countrysideBuildings, true)
		fisheries.forEach((fishery) => {
			ineligibleIDs.push(fishery[0])
			ineligibleIDs.push(fishery[1])
		})
	}

	// Remove explorers
	for (const explorer of store.mapData.explorers) {
		ineligibleIDs.push(explorer)
	}

	// Uniq ineligibleIDs
	ineligibleIDs = [...new Set(ineligibleIDs)]

	let unpollutedArea = zocTileID.filter((id) => ineligibleIDs.indexOf(id) == -1)

	return unpollutedArea.length
}

/*************************************************************** WINNING CODE END */

export function endGame() {
	const store = useModelStore()

	// Remove current player
	//store.gameflow.turnOrder.shift()
	store.clearVars()

	let finalRes = endGame_core()
	// Final res has [[[winnner(s)], reason], [any lower pollution player]]
	// So if the length is 1, there is only winner(s) with 1 reason
	// Multiple winners are if res[0][0].length > 1

	// If the length is 2, it must have been a tie sorted by pollution
	// Multiple runners up is if res[1][0].length > 1
	addHistory(rf.HIST_GAME_END, -1, 0, [...finalRes])

	//store.gameflow.fullTurnOrder.splice(0)
	//for (let i = 0; i < finalRes.length; i++) store.gameflow.fullTurnOrder.push(finalRes[i][0])

	//store.gameflow.turnOrder.splice(0)
	//store.gameflow.turnOrder.push(0)
	
	// Don't save here? Causes extra save and sync error
	IO.saveGame(false, false)
	store.topMenuViews.showingPlayerIndex = -1
}

export function endGame_core() {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.gameflow.phase = rf.PHASE_GAME_OVER
	let res = []

	// Check for last man standing game over here
	const nbNonPlayers = store.players.filter((player) => player.displayName === rf.BOT_NAME).length
	if ((personal.trainingGame && nbNonPlayers > 0) || nbNonPlayers === store.players.length - 1) {
		/*for (let i=0;i<store.players.length;i++) res.push(i)
		while (store.players[res[0][0]].displayName === rf.BOT_NAME) {
			res.push(res.shift())
		}
		// Single winner, 1 player left
		return [rf.GAME_WIN_LAST_MAN_STANING, [res[0]]]*/
		const nonBotPlayers = store.players.filter((player) => player.displayName !== rf.BOT_NAME)
		const winnerIndex = store.players.findIndex((player) => player === nonBotPlayers[0])
		// Single winner, 1 player left
		// First check if this is due to someone busting on graves
		if (store.history[store.history.length - 1][0] === rf.GAME_WIN_LAST_UNGRAVED) {
			return [rf.GAME_WIN_LAST_UNGRAVED, [winnerIndex]]
		}
		return [rf.GAME_WIN_LAST_MAN_STANING, [winnerIndex]]
	}

	// Now there must be a proper winner
	for (let i = 0; i < store.players.length; i++) {
		if (checkWinningCondition(i)) res.push(i)
		//if (i !== 9) res.push(i)
	}

	// Only 1 winner? Return that
	if (res.length === 1) return [rf.GAME_WIN_ONLY_SAINT_WINNER, [...res]]

	// Multiple saint winners? See if there is an outright winner on pollution
	const values = res.map(getUnpollutedArea)
	const mostUnpolluted = Math.max(...values)
	const highestIndices = values.reduce((acc, val, idx) => {
		if (val === mostUnpolluted) {
			acc.push(idx)
		}
		return acc
	}, [])

	if (highestIndices.length === 1) {
		let result = []
		result.push(rf.GAME_WIN_ONLY_POLLUTION_WINNER, [res[highestIndices[0]]])
		result.push(res.filter((val, idx) => !highestIndices.includes(idx)))
		return result
	} else {
		// Now we have multiple saint winners with equal unpolluted areas
		let winners = highestIndices.map((index) => res[index])
		let nonWinners = res.filter((val, idx) => !highestIndices.includes(idx))
		let result = []
		if (nonWinners.length > 0)
			result = [rf.GAME_WIN_TIE, [...winners] /*.flat()*/, [...nonWinners]] //.flat()]
		else result = [rf.GAME_WIN_TIE, [...winners]] //.flat()]
		return result
	}
}
