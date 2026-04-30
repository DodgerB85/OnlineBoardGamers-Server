/**
 * Contains functions related to the flow of the game,
 * or rather, interacting with the game, making moves,
 * ending turns / phases / etc
 *
 *
 */
import * as rf from "./AQYreference.js"
import * as model from "./AQYmodel.js"
import * as IO from "../backend/AQY_IO.js"
import * as funcs from "./AQYfuncs.js"
import * as country from "./AQYcountry.js"
import * as city from "./AQYcity.js"
//import * as map from "./AQYmap.js"
import * as Bot from "./AQYbot.js"

import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal.js"

export function currentPlayerObj() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (isSimulPhase(store.gameflow.phase)) {
		if (!personal.canPlay()) return store.players[store.gameflow.turnOrder[0]]
		return store.players[personal.pov]
	}
	if (store.gameflow.turnOrder.length > 0) return store.players[store.gameflow.turnOrder[0]]
	else {
		if (!store.topMenuViews.showReplay && personal.pov != undefined) {
			console.log(`CP() Error - turnOrder: ${store.gameflow.turnOrder}`)
		}
		return store.players[0]
	}
}

export function currentPlayerIndex() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (isSimulPhase(store.gameflow.phase)) {
		if (personal.pov >= 0) return personal.pov
		return 0
	}
	if (store.gameflow.turnOrder.length > 0) return store.gameflow.turnOrder[0]
	else {
		if (!store.topMenuViews.showReplay && personal.pov != undefined) {
			console.log(`CPI() Error - turnOrder: ${store.gameflow.turnOrder}`)
		}
		return 0
	}
}

export function shouldShowActivePlayerInfo(playerIndex) {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (!personal.trainingGame && personal.pov === playerIndex) return true
	if (personal.trainingGame && store.gameflow.turnOrder[0] === playerIndex) return true
	return false
}

export function canResign() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (!personal.canPlay()) return false
	if (store.gameflow.phase !== rf.PHASE_CITY_BUILDING) return false
	if (personal.trainingGame) return false
	return true
}

export function canEndPlayerTurn() {
	const store = useModelStore()
	//const personal = usePersonalStore()

	if (store.sandboxMode) return false

	if (store.context.needToPlaceSecondFisheryHex) return false

	if (store.gameflow.phase === rf.PHASE_CITY_BUILDING && store.gameflow.subPhase === rf.SUB_PHASE_ADD_BUILDINGS && store.context.action === rf.ACT_NONE && store.players[currentPlayerIndex()].requiredRebuilds.length === 0 && store.players[currentPlayerIndex()].availableMen >= 0) return true
	else if (store.gameflow.phase === rf.PHASE_FAMINE && store.context.gravesLeftToPlace === 0) return true
	else if (store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING) return true
	else if (store.gameflow.phase === rf.PHASE_STORE_GOODS && store.context.resourcesToDiscard === 0) return true
	else if (store.gameflow.phase === rf.PHASE_HARVEST && store.context.hexesToHighlight.length === 0) return true
	else if (store.gameflow.phase === rf.PHASE_EXPLORE) return true
	else if (store.gameflow.phase === rf.PHASE_POLLUTION && store.context.pollutionLeftToPlace === 0 && store.context.gravesLeftToPlace <= 0) return true

	return false
}

// End the current players turn
// Set up for the next turn
// Save the game
export async function endPlayerTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.clearMessages()

	// Remove undo points
	store.undoPoints.splice(0)

	// Check for last man standing game over here
	let nbNonPlayers = 0
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++
	}
	if (personal.trainingGame && nbNonPlayers > 0) {
		model.endGame()
		return
	}
	if (nbNonPlayers === store.players.length - 1) {
		model.endGame()
		return
	}

	// At end of city build, check the famine level not lower than 0
	if (store.gameflow.phase === rf.PHASE_CITY_BUILDING) {
		if (personal.trainingGame) {
			city.generateCityBuildHistoryEntry(currentPlayerIndex(), Math.round(new Date().getTime() / 1000), 0)
		}
		if (store.famineLevel < 0) store.famineLevel = 0
	}

	// At end of storage, add history
	if (store.gameflow.phase === rf.PHASE_STORE_GOODS) {
		store.context.historyObj.splice(0)
		for (let i = 0; i < currentPlayerObj().availableResources.length; i++) {
			if (currentPlayerObj().availableResources[i] > 0) {
				for (let j = 0; j < currentPlayerObj().availableResources[i]; j++) store.context.historyObj.push(i)
			}
		}
		model.addHistory(rf.HIST_STORE_GOODS, currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
	}

	// At end of harvest phase, add the history
	if (store.gameflow.phase === rf.PHASE_HARVEST) {
		model.addHistory(rf.HIST_HARVEST, currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
	}

	// At end of explore, add history if there was a manual choice not to explore
	if (store.gameflow.phase === rf.PHASE_EXPLORE) {
		if (store.context.historyObj.length > 0 && store.context.historyObj[0] === -1) {
			model.addHistory(rf.HIST_MANUAL_SKIP_EXPLORE, currentPlayerIndex(), 0, [])
			store.context.historyObj.splice(0)
		}
	}

	// At end of famine, add history
	if (store.gameflow.phase === rf.PHASE_FAMINE) {
		if (store.context.historyObj.reduce((length, subarray) => length + subarray.length, 0) > 0) model.addHistory(rf.HIST_FAMINE, currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
	}

	// At end of pollution, if there's still a history Obj, then it wasn't spliced out during country placing pollution
	if (store.gameflow.phase === rf.PHASE_POLLUTION && store.context.historyObj.length > 0) {
		model.addHistory(rf.HIST_ADD_POLLUIIONS_AND_GRAVES, currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
	}

	store.clearVars()

	// Check only 1 player was here

	// END NON SIMUL TURN
	if (!isSimulPhase(store.gameflow.phase)) {
		// Remove player from the turn order

		store.gameflow.turnOrder.shift()

		// If not a simul phase, check to see if you can skip the next player
		actionAllPlayerSkips()

		// Check for all turns complete
		if (store.gameflow.turnOrder.length === 0) {
			// POSSIBLE NEEDED TEMP FIX
			// Maybe copy fullTurnOrder in here so that vue updates don't break on zero TO length?

			endCurrentPhase()
			// Game over is saved on game end
			if (store.gameflow.phase === rf.PHASE_GAME_OVER) return
		}

		// await save
		await IO.saveGame(true, false, false)

		// In case it is your turn again right away, run startPlayerTurn
		// If it isn't then you get returned from that function anyway
		startPlayerTurn()
		// Make sure this function is exited now
		return
	}
	// END SIMUL TURN - assume bots are filtered out at the start of the phase
	else {
		// Remove from turn order
		store.gameflow.turnOrder = store.gameflow.turnOrder.filter((playerIndex) => playerIndex !== currentPlayerIndex())
		// NEED TO REBUILD THE TO ARRAY NOW, OTHERWISE VUE GFX THAT REALLY ON (eg turnOder[0]) WILL CAUSE ERRORS
		// The turn order should be set/reset again after processing the end of the simul turn
		if (store.gameflow.turnOrder.length === 0) store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]

		await IO.saveSimulTurn(personal.pov)
		// Make sure this function is exited now

		return
	}
}

export async function startPlayerTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.undoPoints.splice(0)

	// Reset these here, to prevent data leak eg on rewind
	store.context.gravesLeftToPlace = 0
	store.context.gravesLeftToRemove = 0
	store.context.resourcesToDiscard = 0

	if (!personal.canPlay()) return

	// FIRST CITY
	if (store.gameflow.phase === rf.PHASE_FIRST_CITY) {
		store.topMenuViews.showingPlayerIndex = -1

		country.getFirstCityPlacementZone()
	}
	// CITY BUILDING
	else if (store.gameflow.phase === rf.PHASE_CITY_BUILDING) {
		store.topMenuViews.showingPlayerIndex = currentPlayerIndex()
		store.context.saintHousesThisTurn.splice(0)
		store.context.saintHouse = -1
		// Reset all buildings to unused
		for (let i = 0; i < store.players[currentPlayerIndex()].cities.length; i++) {
			for (let j = 0; j < store.players[currentPlayerIndex()].cities[i].buildings.length; j++) {
				store.players[currentPlayerIndex()].cities[i].buildings[j].usedThisTurn = false
			}
		}
	}
	// COUNTRY BUILDING
	else if (store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING) {
		store.topMenuViews.showingPlayerIndex = -1
		store.context.countryCartsLeftToUse = city.getCartShopStatus(currentPlayerIndex())[0]
		model.updateCountryBuildCalclation(currentPlayerIndex(), true)
	}
	// STORE GOODS
	else if (store.gameflow.phase === rf.PHASE_STORE_GOODS) {
		let resCount = currentPlayerObj().availableResources.reduce((acc, curr) => acc + curr, 0)
		let availableStorage = city.getAvailableStorage(currentPlayerIndex())
		store.context.resourcesToDiscard = resCount - availableStorage
		store.topMenuViews.showingPlayerIndex = currentPlayerIndex()
	}
	// HARVEST
	else if (store.gameflow.phase === rf.PHASE_HARVEST) {
		store.topMenuViews.showingPlayerIndex = -1
		model.setHarvestPhase()
		//country.collectCathedralFish(currentPlayerIndex())
	}
	// EXPLORE
	else if (store.gameflow.phase === rf.PHASE_EXPLORE) {
		store.topMenuViews.showingPlayerIndex = -1
		store.context.selectedExplorerRes = rf.RES_NONE
		if (!city.hasWorkingUniqueBuilding(currentPlayerIndex(), rf.BLDG_EXPLORER, false)) {
			rf.doAdminAlrt("No Explorer - turn should have been skipped")
			return
		}

		const zoc = country.getZocTiles(currentPlayerIndex())
		//const tiles = zoc.filter((hex) => store.mapData.explorers.map((e) => e.id).includes(hex.id))
		const tiles = zoc.filter((hex) => store.mapData.explorers.includes(hex.id))

		if (tiles.length === 0) {
			rf.doAdminAlrt("No Explorer tile within ZoC - turn should have been skipped")
			return
		}
		store.context.action = rf.ACT_EXPLORE
		store.context.hexesToHighlight = tiles
	}
	// FAMINE
	else if (store.gameflow.phase === rf.PHASE_FAMINE) {
		// Clear histObj at start of turn
		store.context.historyObj.splice(0)

		// If you just explored, stay on country screen to view result
		if (store.newlyExplorerResource === rf.RES_NONE) store.topMenuViews.showingPlayerIndex = currentPlayerIndex()
		else store.topMenuViews.showingPlayerIndex = -1

		// Set the number of graves to place
		store.context.gravesLeftToPlace = city.getTotalGravesToPlace(currentPlayerIndex())
		// Check for game loss
		if (store.context.gravesLeftToPlace > 0) {
			let freeSpace = city.getAllGraveCitySquaresToHighlight(currentPlayerIndex())
			const availableSqs = freeSpace.some((subArr) => subArr.length > 0)
			if (!availableSqs) {
				await Bot.actionGraveGameOver()
				return
			}
		}
		city.startGravePlacement(currentPlayerIndex())
	}
	// POLLUTION
	else if (store.gameflow.phase === rf.PHASE_POLLUTION) {
		store.topMenuViews.showingPlayerIndex = -1
		store.context.historyObj.splice(0)
		model.setPollutionPhase(currentPlayerIndex())
	}

	// Save the turn reset
	store.wholeTurnResetData = funcs.simpleExportWholeModel()
	// Add an undo point
	model.createUndoPoint()
}

export function setTurnOrder() {
	const store = useModelStore()

	setTurnOrder_core()
	let hist_turnOrder = [...store.gameflow.fullTurnOrder]
	let entry3 = []
	for (let i = 0; i < hist_turnOrder.length; i++) {
		entry3.push([hist_turnOrder[i], city.getMannedCartsAndExplorers(hist_turnOrder[i])])
	}
	model.addHistory(rf.HIST_NEW_TURN_ORDER, -1, 0, [...entry3])
}

export function setTurnOrder_core() {
	const store = useModelStore()
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]

	store.gameflow.turnOrder.sort((a, b) => {
		const resultA = city.getMannedCartsAndExplorers(a)
		const resultB = city.getMannedCartsAndExplorers(b)

		if (resultA === resultB) {
			return 0 // Maintain the relative order
		} else if (resultA > resultB) {
			// LOWEST total manned carts and explorers goes first
			return 1 //
		} else {
			return -1 //
		}
	})

	store.gameflow.fullTurnOrder = [...store.gameflow.turnOrder]
}

export function endCurrentPhase() {
	const store = useModelStore()
	if (store.gameflow.phase === rf.PHASE_FIRST_CITY) {
		// Reverse turn order, and move to city building
		store.gameflow.fullTurnOrder.reverse()
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		store.gameflow.phase = rf.PHASE_CITY_BUILDING
		store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS
	} else if (store.gameflow.phase === rf.PHASE_CITY_BUILDING) {
		store.gameflow.phase = rf.PHASE_TURN_ORDER
		// SET THE TURN ORDER
		// store.gameflow.fullTurnOrder is the old order
		setTurnOrder()

		// Move on to countryside phase
		store.gameflow.phase = rf.PHASE_COUNTRYSIDE_BUILDING
	} else if (store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		store.gameflow.phase = rf.PHASE_STORE_GOODS
	} else if (store.gameflow.phase === rf.PHASE_STORE_GOODS) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		for (let i=0; i < store.players.length; i++) {
			if (store.players[i].displayName === rf.BOT_NAME) Bot.performBotHarvest(i)
		}
		store.gameflow.phase = rf.PHASE_HARVEST
		// Process auto-fish
		for (let i = 0; i < store.players.length; i++) country.collectCathedralFish(i)
		// Reset fish
		for (let i = 0; i < store.players.length; i++) store.players[i].cathedralStatus = 0
	} else if (store.gameflow.phase === rf.PHASE_HARVEST) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		store.gameflow.phase = rf.PHASE_EXPLORE
	} else if (store.gameflow.phase === rf.PHASE_EXPLORE) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		store.gameflow.phase = rf.PHASE_FAMINE
	} else if (store.gameflow.phase === rf.PHASE_FAMINE) {
		// At end of famine phase, raise the famine level
		store.famineLevel++
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		store.gameflow.phase = rf.PHASE_POLLUTION
	} else if (store.gameflow.phase === rf.PHASE_POLLUTION) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		store.gameflow.phase = rf.PHASE_CHECK_VICTORY

		let res = []
		for (let i = 0; i < store.players.length; i++) {
			if (model.checkWinningCondition(i)) res.push(i)
		}

		if (res.length > 0) {
			model.endGame()
			return true // Stops a double save if endGame saves the game, but it's also mid pre-move processing
		}
		// If no victory, restart phases
		// ASSUME NO VICTORY

		store.gameflow.turn++
		model.addHistory(rf.HIST_NEW_TURN, -1, 0, [store.gameflow.turn])

		// ALL RISE
		store.gameflow.phase = rf.PHASE_ALL_RISE
		city.allRise()

		// CITY BUILDING
		store.gameflow.phase = rf.PHASE_CITY_BUILDING
		store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS
		// remove building flags
		for (let i = 0; i < store.players.length; i++) {
			store.players[i].cathedralStatus = 0
			for (let j = 0; j < store.players[i].cities.length; j++) {
				for (let k = 0; k < store.players[i].cities[j].buildings.length; k++) {
					delete store.players[i].cities[j].buildings[k].builtThisTurn
					delete store.players[i].cities[j].buildings[k].builtThisTurnCost
					store.players[i].cities[j].buildings[k].usedThisTurn = false
				}
			}
		}
	}

	// Check for skips
	// If not a simul phase, check to see if you can skip the next player
	actionAllPlayerSkips()
	if (store.gameflow.turnOrder.length === 0) endCurrentPhase()

	return false
}

// WHEN YOU END A PHASE YOU HAVE TO START THE NEXT
// SO IT'S ALL ROLLED INTO endPhase
/*export function startPhase(phase) {
	const store = useModelStore()

	// This should only happen at the START of city build
	if (phase === rf.PHASE_CITY_BUILDING) {
		store.clearVars()
	}
}*/

export function actionAllPlayerSkips() {
	const store = useModelStore()

	store.context.historyObj.splice(0)
	while (canSkipCurrentPlayer()) {
		store.gameflow.turnOrder.shift()
	}
	if (store.gameflow.phase === rf.PHASE_EXPLORE && store.context.historyObj.length > 0) model.addHistory(rf.HIST_SKIP_EXPLORE_TURN, -1, 0, [...store.context.historyObj])
	store.context.historyObj.splice(0)
}

export function canSkipCurrentPlayer() {
	const store = useModelStore()
	// YOU ARRIVE HERE WITH A NEW, UNTESTED PLAYER IN store.gameflow.turnOrder[0]

	// Always skip bots - NB these SHOULDNT ever be in turnOrder, so this is a backup
	if (store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === "AqyBot") return true

	// You can't skip a simul phase
	if (isSimulPhase(store.gameflow.phase)) return false

	// You can't skip if the turn is over
	if (store.gameflow.turnOrder.length === 0) return false

	// This needs to be here as turnOrder.length must be > 0 otherwise errors
	let playerIndex = store.gameflow.turnOrder[0]
	let playerObj = store.players[playerIndex]

	// ALWAYS skip bots
	if (playerObj.displayName === "AqyBot") return true

	// Can't skip first city phase
	if (store.gameflow.phase === rf.PHASE_FIRST_CITY) return false

	// Can't skip city build (if non simul, eg trainingGame)
	if (store.gameflow.phase === rf.PHASE_CITY_BUILDING) return false

	// COUNTRY BUILDING PHASE
	if (store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING) {
		// No available cart shops, no available fac Alch, then skip
		if (city.getCartShopStatus(store.gameflow.turnOrder[0])[0] === 0 && !city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_ALCHEMY, false)) {
			model.addHistory(rf.HIST_SKIP_COUNTRY_TURN, playerIndex, 0, [])
			return true
		}
		return false
	}

	// STORE GOODS PHASE
	if (store.gameflow.phase === rf.PHASE_STORE_GOODS) {
		// Unlimited storage, then store everything
		if (model.hasWorkingSaint(currentPlayerIndex(), rf.SAINT_CHRISTOFORI)) {
			model.addHistory(rf.HIST_SKIP_STORAGE_TURN, playerIndex, 0, [0])
			return true
		}
		// NO resources
		else if (playerObj.availableResources.reduce((acc, curr) => acc + curr, 0) === 0) {
			model.addHistory(rf.HIST_SKIP_STORAGE_TURN, playerIndex, 0, [1])
			return true
		}
		// Now you have some resources
		else {
			let resCount = playerObj.availableResources.reduce((acc, curr) => acc + curr, 0)
			let availableStorage = city.getAvailableStorage(playerIndex)
			// Enough storage
			if (availableStorage >= resCount) {
				model.addHistory(rf.HIST_SKIP_STORAGE_TURN, playerIndex, 0, [2])
				return true
			}
			// No storage
			if (availableStorage === 0) {
				for (let i = 0; i < playerObj.availableResources.length; i++) {
					playerObj.availableResources[i] = 0
				}
				model.addHistory(rf.HIST_SKIP_STORAGE_TURN, playerIndex, 0, [3])
				return true
			}
			//store.context.availableStorage = availableStorage
			store.context.resourcesToDiscard = resCount - availableStorage
			store.context.discardedResources.splice(0)
		}
		return false
	}

	// HARVEST PHASE
	if (store.gameflow.phase === rf.PHASE_HARVEST) {
		let mannedForcedLabour = false
		if (city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_FORCED_LABOUR, false)) mannedForcedLabour = true

		if (country.canAutoHarvest(playerIndex, mannedForcedLabour)) {
			country.doAutoHarvest(playerIndex, mannedForcedLabour)
			// ADD HISTORY - THIS IS SONE DURING THE AUTO-HARVEST
			return true
		}
	}

	// EXPLORE PHASE
	if (store.gameflow.phase === rf.PHASE_EXPLORE) {
		// Skip if no explorers
		if (!city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_EXPLORER, false)) {
			//model.addHistory(rf.HIST_SKIP_EXPLORE_TURN, playerIndex, 0, [0])
			store.context.historyObj.push([playerIndex, 0])
			return true
		}
		// So now with an explorer, skip if no explorer in ZoC
		const zoc = country.getZocTiles(playerIndex)
		//const tiles = zoc.filter((hex) => store.mapData.explorers.map((e) => e.id).includes(hex.id))
		const tiles = zoc.filter((hex) => store.mapData.explorers.includes(hex.id))
		if (tiles.length === 0) {
			//model.addHistory(rf.HIST_SKIP_EXPLORE_TURN, playerIndex, 0, [1])
			store.context.historyObj.push([playerIndex, 1])
			return true
		}
	}

	// FAMINE PHASE
	if (store.gameflow.phase === rf.PHASE_FAMINE) {
		if (city.getTotalGravesToPlace(playerIndex) === 0) {
			model.addHistory(rf.HIST_SKIP_FAMINE_TURN, playerIndex, 0, [])
			return true
		}
	}

	// POLLUTION PHASE
	if (store.gameflow.phase === rf.PHASE_POLLUTION) {
		if (country.getPendingPollution(playerIndex) === 0) {
			model.addHistory(rf.HIST_SKIP_POLLUTION_TURN, playerIndex, 0, [])
			return true
		}
	}

	return false
}

export function isSimulPhase(phase) {
	//const store = useModelStore()
	const personal = usePersonalStore()

	// Practice gamws are always in turn order
	if (personal.trainingGame) return false

	// Country phase should normally be turn order
	if (phase === rf.PHASE_COUNTRYSIDE_BUILDING) return false
	// Explore is always turn order
	if (phase === rf.PHASE_EXPLORE) return false

	// City building IS simul
	if (phase === rf.PHASE_CITY_BUILDING) return true

	return false
}
