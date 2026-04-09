import * as rf from "./AQYreference"
import * as funcs from "./AQYfuncs"
import * as map from "./AQYmap"
import * as model from "./AQYmodel"
import * as history from "./AQYhistory"
import * as controller from "./AQYcontroller"
import * as country from "./AQYcountry"
import * as city from "./AQYcity"

import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal.js"

export function goToReplayStep(step) {
	const store = useModelStore()

	store.replayStep = step
	funcs.importModel(store.replayData[store.replayStep], false, true)
	//map.calculateCanvasSize()

	history.setupHistoryHighlight(store.history[store.replayStep][0], store.history[store.replayStep][3], store.replayStep, true) // ADD STEP???
	if (store.topMenuViews.showingPlayerIndex !== -1) store.topMenuViews.showingPlayerIndex = controller.currentPlayerIndex()
}

export function performStep(amount) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.clearHistoryHelpers()
	store.clearMessages()
	if (amount === -99) store.replayStep = 0
	if (amount === -9) store.replayStep -= 5
	if (amount === -1) store.replayStep--
	if (amount === 1) store.replayStep++
	if (amount === 9) store.replayStep += 5
	if (amount === 99) store.replayStep = store.replayData.length - 1

	if (store.replayStep < 0) store.replayStep = 0
	if (store.replayStep > store.replayData.length - 1) store.replayStep = store.replayData.length - 1

	// Performing back to my last
	if (amount === -999) {
		let idx = store.replayStep
		idx--
		while (idx > 0) {
			let histEntry = store.history[idx]
			if (histEntry[1] === personal.pov) {
				store.replayStep = idx
				break
			}
			idx--
		}
	}

	funcs.importModel(store.replayData[store.replayStep], false, true)

	history.setupHistoryHighlight(store.history[store.replayStep][0], store.history[store.replayStep][3], store.replayStep, true) // ADD STEP??
	if (store.topMenuViews.showingPlayerIndex !== -1) store.topMenuViews.showingPlayerIndex = store.history[store.replayStep][1]
}

async function resetDataForReplay() {
	const store = useModelStore()

	// Remove ghosts
	let ghostDivs = document.getElementsByClassName("ghostDiv")
	let ghostImgs = document.getElementsByClassName("ghostImg")
	for (let i = 0; i < ghostDivs.length; i++) ghostDivs[i].style.display = "none"
	for (let i = 0; i < ghostImgs.length; i++) ghostImgs[i].style.display = "none"
	store.topMenuViews.currentGhostIndex = -1

	let seed = store.mapData.seed

	model.initiateGameVars(true)

	// Reset map
	map.generateMapFromSeed(seed)

	// Reset gameflow
	store.gameflow.turnOrder.splice(0)
	store.gameflow.fullTurnOrder.splice(0)

	for (let i = 0; i < store.players.length; i++) {
		store.gameflow.fullTurnOrder.push(i)
		store.gameflow.turnOrder.push(i)
	}

	// Famine level
	store.famineLevel = 0

	// keep history
	store.clearVars()
}

export async function generateReplayData(spoilerFree = false) {
	const store = useModelStore()
	store.topMenuViews.generatingReplay = true

	let replayData = []

	// Reset the data
	await resetDataForReplay()
	let pBarEl = document.querySelector(".progress-bar div")
	const pBarTextEl = document.querySelector(".progress-bar span")

	for (let i = 0; i < store.history.length; i++) {
		if (i !== 0) checkAndPerformTurnEnd(i)

		/** THESE HAVE NO REPLAY YET -- BUT NOT ALL WILL NEED A REPLAY */
		// Non-player Actions
		// Non-player Actions
		/*
		export const HIST_NEW_GAME = 0
		export const HIST_NEW_TURN = 1

		// Player Actions
		export const  = 13

		export const HIST_ADD_POLLUIIONS_AND_GRAVES = 26

		// 25 used above

		export const HIST_RESIGN = 30
		export const HIST_KICKOUT = 31
		export const HIST_REWIND = 32
		export const HIST_GRAVE_GAME_OVER = 33
		export const HIST_GAME_END = 34

		// Auto-actions
		export const HIST_SKIP_COUNTRY_TURN = 40
		export const HIST_SKIP_EXPLORE_TURN = 43
		export const HIST_SKIP_FAMINE_TURN = 44
		export const HIST_SKIP_POLLUTION_TURN = 45
		export const HIST_CITY_CATHEDRALS = 47
*/

		if (store.history[i][0] === rf.HIST_FIRST_CITY) replayFirstCity(i, store.history[i][1], store.history[i][3])
		// city build
		else if (store.history[i][0] === rf.HIST_CITY_PLAYER_TRADE) replayCityPlayerTrade(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_CITY_BUILD) replayCityBuild(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_CITY_FOUNTAINS) replayCityFountains(i, store.history[i][1], store.history[i][3])
		// turn order
		else if (store.history[i][0] === rf.HIST_NEW_TURN_ORDER) replayNewTurnOrder(i, store.history[i][1], store.history[i][3])
		// CS building
		else if (store.history[i][0] === rf.HIST_WOODCUTTER) replayWoodcutter(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_MINE) replayMine(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_FARM) replayFarm(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_FISHERY) replayFishery(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_INN) replayInn(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_NEW_CITY) replayNewCity(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_REMOVE_POLLUTION) replayRemovePollution(i, store.history[i][1], store.history[i][3])
		// Storage
		else if (store.history[i][0] === rf.HIST_STORE_GOODS) replayStorage(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_SKIP_STORAGE_TURN) replaySkipStorage(i, store.history[i][1], store.history[i][3])
		// harvest
		else if (store.history[i][0] === rf.HIST_CATHEDRAL_FISH) replayCathedralFish(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_AUTO_HARVEST)
			replayHarvest(i, store.history[i][1], store.history[i][3]) //NB IFRNTICSL TO MANUAL
		else if (store.history[i][0] === rf.HIST_HARVEST) replayHarvest(i, store.history[i][1], store.history[i][3])
		// explore
		else if (store.history[i][0] === rf.HIST_SKIP_EXPLORE_TURN) replaySkipExplore(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_EXPLORE) replayExplore(i, store.history[i][1], store.history[i][3])
		// famine
		else if (store.history[i][0] === rf.HIST_FAMINE) replayFamine(i, store.history[i][1], store.history[i][3])
		// pollution
		else if (store.history[i][0] === rf.HIST_ADD_POLLUTIONS) replayAddPollutions(i, store.history[i][1], store.history[i][3])
		else if (store.history[i][0] === rf.HIST_ADD_POLLUIIONS_AND_GRAVES) replayAddPollutionsAndGraves(i, store.history[i][1], store.history[i][3])
		// new turn
		else if (store.history[i][0] === rf.HIST_NEW_TURN) replayNewTurn(i, store.history[i][1], store.history[i][3])

		replayData.push(funcs.exportModel(true))

		if (i % 5 === 0 && pBarEl != null) {
			let percent = (i / store.history.length) * 100
			pBarEl.style.width = percent + "%"
			pBarTextEl.innerText = Math.round(percent) + "%"
			await funcs.sleep(0)
		}
	} // END generating replay

	store.replayData = replayData
	store.replayStep = replayData.length - 1
	if (spoilerFree) {
		if (window.initData.replayStep <= 0) store.replayStep = 0
		else if (window.initData.replayStep >= store.replayData.length - 1) store.replayStep = store.replayData.length - 1
		else store.replayStep = window.initData.replayStep
	}
	if (store.replayData.length > 0) store.topMenuViews.showReplay = true
	goToReplayStep(store.replayStep)
	// SET THE VIEWPORT
	store.topMenuViews.showingPlayerIndex = -1 // TODO: set to player
	store.topMenuViews.generatingReplay = false
}

/*** REPLAY FUNCTIONS HERE */
function replayFirstCity(historyIndex, playerIndex, entry3) {
	//const store = useModelStore()
	city.createNewCity_core(playerIndex, map.getHexDataFromID(entry3[0]).hex)
}

function replayCityPlayerTrade(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	let proposerIndex = entry3[0][0]
	let proposerResources = entry3[0][1]
	let receiverIndex = entry3[1][0]
	let receiverResources = entry3[1][1]

	// Action proposer resources
	for (let i = 0; i < proposerResources.length; i++) {
		store.players[proposerIndex].availableResources[proposerResources[i]]--
		store.players[receiverIndex].availableResources[proposerResources[i]]++
	}

	// Action receiver resources
	for (let i = 0; i < receiverResources.length; i++) {
		store.players[receiverIndex].availableResources[receiverResources[i]]--
		store.players[proposerIndex].availableResources[receiverResources[i]]++
	}
}

function replayCityBuild(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	// BUILD is in entry3[0]
	for (let i = 0; i < entry3[0].length; i++) {
		// j is the CITY INDEX
		/*if (rf.BLDG_ROTATABLE.includes(bldg.bldgNum)) playerBuiltObj.push([bldg.bldgNum, j, bldg.index, bldg.rotation])
      else if (bldg.bldgNum === rf.BLDG_STORAGE) playerBuiltObj.push([bldg.bldgNum, j, bldg.index, [bldg.width, bldg.height]])
      else playerBuiltObj.push([bldg.bldgNum, j, bldg.index])

      // Add complex costs if needed
      if (rf.BLDG_COMPLEX_COST.includes(bldg.bldgNum)) {
        playerBuiltObj[playerBuiltObj.length - 1].push([...bldg.builtThisTurnCost])
      }*/
		let bldgNum = entry3[0][i][0]
		let rotation = 0
		let width = 0
		let height = 0
		if (rf.BLDG_ROTATABLE.includes(bldgNum)) rotation = entry3[0][i][3]
		else if (bldgNum === rf.BLDG_STORAGE) {
			width = entry3[0][i][3][0]
			height = entry3[0][i][3][1]
		}

		let bldgData
		// If not house, get the data
		if (bldgNum < 20 && bldgNum !== rf.BLDG_STORAGE) {
			bldgData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgNum]]
		} else if (bldgNum === rf.BLDG_STORAGE) {
			bldgData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgNum]]
			bldgData.width = rotation[0]
			bldgData.height = rotation[1]
			rotation = 0
		} else bldgData = rf.BLDG_DATA["HOUSE"]

		let cityIndex = entry3[0][i][1]
		let citySize = 7
		if (cityIndex !== 0) citySize = 6
		let topLeftFixed = entry3[0][i][2]
		let bldgIndex = topLeftFixed

		if (rotation === 0) {
			bldgIndex = topLeftFixed + bldgData.path[0]
		} else if (rotation === 1) {
			bldgIndex = topLeftFixed + bldgData.path[0] * citySize + (bldgData.height - 1)
		} else if (rotation === 2) {
			bldgIndex = topLeftFixed - bldgData.path[0] + (bldgData.height - 1) * citySize + (bldgData.width - 1)
		} else if (rotation === 3) {
			bldgIndex = topLeftFixed - bldgData.path[0] * citySize + (bldgData.width - 1) * citySize
		}

		if (bldgNum === rf.BLDG_STORAGE) city.addStorageToCity(playerIndex, cityIndex, bldgIndex, width, height, true)
		else city.addBuildingToCity(playerIndex, cityIndex, bldgIndex, bldgNum, rotation, true, false)
		// Remove Resource
		if (rf.BLDG_SINGLE_WOOD.includes(bldgNum)) store.players[playerIndex].availableResources[rf.RES_WOOD]--
		else if (rf.BLDG_SINGLE_STONE.includes(bldgNum)) store.players[playerIndex].availableResources[rf.RES_STONE]--
		else if (rf.BLDG_DOUBLE_STONE.includes(bldgNum)) store.players[playerIndex].availableResources[rf.RES_STONE] -= 2
		else if (rf.BLDG_COMPLEX_COST.includes(bldgNum)) {
			let complexCost = []
			// COMPLEX COST BLDGS COULD BE ROTATED (HOSTP) So need to access end entry
			complexCost = [...entry3[0][i][entry3[0][i].length - 1]]
			for (let i = 0; i < complexCost.length; i++) store.players[playerIndex].availableResources[complexCost[i]]--
		}
	}
	// MOVE is in entry3[1]
	for (let i = 0; i < entry3[1].length; i++) {
		// UNIQUE MOVE: [ [ 14, [ 0, 14, 0 ], [ 0, 17, 0 ] ] ]
		// NON UNIQUE MOVE: [ [ 16, [ 0, 5, 0 ], [ 0, 39, 0 ] ] ]
		// STORAGE MOVE: [ [ 18, [ 0, 42, [ 2, 1 ] ], [ 0, 47 ] ] ]
		if (entry3[1][i][0] === rf.BLDG_STORAGE) {
			// Remove building
			let width = entry3[1][i][1][2][0]
			let height = entry3[1][i][1][2][1]
			city.addStorageToCity(playerIndex, entry3[1][i][1][0], entry3[1][i][1][1], width, height, false)
			// Now readd
			city.addStorageToCity(playerIndex, entry3[1][i][2][0], entry3[1][i][2][1], width, height, true)
		} else {
			let bldgMoveNum = entry3[1][i][0]
			if (bldgMoveNum === rf.BLDG_GRAVE) {
				// Remove grave
				city.addGraveToCity_core(playerIndex, entry3[1][i][1][0], entry3[1][i][1][1], false)
				// Now readd
				city.addGraveToCity_core(playerIndex, entry3[1][i][2][0], entry3[1][i][2][1], true)
			} else {
				// Remove building
				let rotationBldgRemove = 0
				if (rf.BLDG_ROTATABLE.includes(entry3[1][i][0])) rotationBldgRemove = entry3[1][i][1][2]
				city.addBuildingToCity(playerIndex, entry3[1][i][1][0], entry3[1][i][1][1], bldgMoveNum, rotationBldgRemove, false, false)
				// Re-add building
				let topLeftFixed = entry3[1][i][2][1]
				let bldgIndex = entry3[1][i][2][1]
				let rotation = entry3[1][i][2][2]
				let bldgNum = entry3[1][i][0]
				let cityIndex = entry3[1][i][2][0]
				let citySize = 7
				if (cityIndex !== 0) citySize = 6
				let bldgData
				// If not house, get the data
				if (bldgNum < 20 && bldgNum !== rf.BLDG_STORAGE) {
					bldgData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgNum]]
				} else if (bldgNum === rf.BLDG_STORAGE) {
					bldgData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgNum]]
					bldgData.width = rotation[0]
					bldgData.height = rotation[1]
					rotation = 0
				} else bldgData = rf.BLDG_DATA["HOUSE"]

				if (rotation === 0) {
					bldgIndex = topLeftFixed + bldgData.path[0]
				} else if (rotation === 1) {
					bldgIndex = topLeftFixed + bldgData.path[0] * citySize + (bldgData.height - 1)
				} else if (rotation === 2) {
					bldgIndex = topLeftFixed - bldgData.path[0] + (bldgData.height - 1) * citySize + (bldgData.width - 1)
				} else if (rotation === 3) {
					bldgIndex = topLeftFixed - bldgData.path[0] * citySize + (bldgData.width - 1) * citySize
				}
				city.addBuildingToCity(playerIndex, cityIndex, bldgIndex, bldgNum, rotation, true, false)
			}
		}
	}

	// MANNED is in entry3[2]
	for (let i = 0; i < entry3[2].length; i++) {
		// BldgNum,  city, index
		//if (rf.BLDG_UNIQUE.includes(bldg.bldgNum)) playerMannedObj.push([bldg.bldgNum])
		//else playerMannedObj.push([bldg.bldgNum, j, bldg.index])
		if (rf.BLDG_UNIQUE.includes(entry3[2][i][0])) {
			// Iterate over the cities of player with index i
			for (let city of store.players[playerIndex].cities) {
				// Find the building in the city with bldgNum equal to entry3[2][i][0]
				const building = city.buildings.find((building) => building.bldgNum === entry3[2][i][0])

				// If a building with the specified bldgNum is found, set its manned property to true
				if (building) {
					building.manned = true
					store.players[playerIndex].availableMen--
					break
				}
			}
		} else {
			//for (let building of store.players[playerIndex].cities[entry3[2][i][1]]) {
			// Find the building in the city with bldgNum equal to entry3[2][i][0]
			const buildingFound = store.players[playerIndex].cities[entry3[2][i][1]].buildings.find((building) => building.bldgNum === entry3[2][i][0] && building.index === entry3[2][i][2])

			// If a building with the specified bldgNum is found, set its manned property to true
			if (buildingFound) {
				buildingFound.manned = true
				store.players[playerIndex].availableMen--
				//break
			} else {
				alert(`BUILDING NOT FOUND TO MAN: playerIndex: ${playerIndex}, bldgNum: ${entry3[2][i][0]}, city: ${entry3[2][i][1]}, index: ${entry3[2][i][2]}`)
			}
			//}
		}
	}

	// BOARD TRADES is entry3[3]
	for (let i = 0; i < entry3[3].length; i++) {
		store.players[playerIndex].availableResources[entry3[3][i][0]]--
		store.players[playerIndex].availableResources[entry3[3][i][1]]--
		store.players[playerIndex].availableResources[entry3[3][i][2]]++
	}

	// HOSPITAL GRAVES is entry3[4]
	for (let i = 0; i < entry3[4].length; i++) {
		for (let j = 0; j < entry3[4][i].length; j++) city.addGraveToCity(playerIndex, i, entry3[4][i][j], false, false)
	}

	// CHOOSE SAINT is entry3[5]
	if (entry3[5] !== rf.SAINT_NONE) store.players[playerIndex].saint = entry3[5]

	// RAZED CATHRDRAL is entry3[6]
	if (entry3[6] === 1) city.razeCathedral_core(playerIndex)
}

function replayCityFountains(historyIndex, playerIndex, entry3) {
	const store = useModelStore()

	let newFountains = entry3[0]
	store.famineLevel -= newFountains
	if (store.famineLevel !== entry3[1]) alert("Famine Level Mismatch")
}

function replayNewTurnOrder(historyIndex, playerIndex, entry3) {
	// Set the new turn order. Don't need a history entry for this really
	controller.setTurnOrder_core()
}

/*** CS BUILDING */
function replayWoodcutter(historyIndex, playerIndex, entry3) {
	//const store = useModelStore()
	// function placeBuilding_core(playerIndex, hex, newBuilding, resource)
	country.placeBuilding_core(playerIndex, map.getHexDataFromID(entry3[0]), rf.COUNTRYSIDE_BLDG_WOODCUTTER, rf.RES_WOOD)
}
function replayMine(historyIndex, playerIndex, entry3) {
	//const store = useModelStore()
	// function placeBuilding_core(playerIndex, hex, newBuilding, resource)
	country.placeBuilding_core(playerIndex, map.getHexDataFromID(entry3[2]), rf.COUNTRYSIDE_BLDG_MINE, entry3[1])
}

function replayFarm(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	store.context.goodsToBeProducedUsesFreeSeed = entry3.length >= 4 && entry3[3] === 1 ? true : false
	country.placeBuilding_core(playerIndex, map.getHexDataFromID(entry3[1]), rf.COUNTRYSIDE_BLDG_FARM, entry3[0])
}

function replayFishery(historyIndex, playerIndex, entry3) {
	//  [[hex.id, store.context.previousStep.hexId], store.context.goodsToBeProduced, [...store.context.historyObj]]
	country.placeFirstFisheryHex_core(playerIndex, map.getHexDataFromID(entry3[0][1]), entry3[1])
	country.placeSecondFisheryHex_core(playerIndex, map.getHexDataFromID(entry3[0][0]), entry3[1], entry3[0][1])
}

function replayInn(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	// function placeBuilding_core(playerIndex, hex, newBuilding, resource)
	country.placeBuilding_core(playerIndex, map.getHexDataFromID(entry3[1]), rf.COUNTRYSIDE_BLDG_INN, rf.RES_NONE)
	store.players[playerIndex].availableResources[entry3[0]]--
}

function replayNewCity(historyIndex, playerIndex, entry3) {
	//const store = useModelStore()
	// function placeBuilding_core(playerIndex, hex, newBuilding, resource)
	city.payAndCreateNewCity_core(playerIndex, map.getHexDataFromID(entry3[0]).hex, entry3[1])
}

function replayRemovePollution(historyIndex, playerIndex, entry3) {
	for (let i = 0; i < entry3.length; i++) country.removePollution_core(entry3[i])
}

function replayStorage(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	// Remove all resources
	for (let i = 0; i < store.players[playerIndex].availableResources.length; i++) store.players[playerIndex].availableResources[i] = 0
	// Keep stored resources
	for (let i = 0; i < entry3.length; i++) store.players[playerIndex].availableResources[entry3[i]]++
}

function replaySkipStorage(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	// skip value 1 = no res
	if (entry3[0] === 1) return

	// skip value 3 = no storage - lose all
	if (entry3[0] === 3) {
		for (let i = 0; i < store.players[playerIndex].availableResources.length; i++) {
			store.players[playerIndex].availableResources[i] = 0
		}
	}
}

function replayHarvest(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	// [Res, HexID, 0/1] 0 = discard from FL, 1 = harvest >> THIS IS ONLY USED IN HISTORY
	//const store = useModelStore()
	store.context.historyObj.splice(0)

	for (let i = 0; i < entry3.length; i++) {
		let replayDiscardFlag = entry3[i][2] === 0 ? true : false
		country.harvestResources_core(map.getHexDataFromID(entry3[i][1]), playerIndex, replayDiscardFlag)
	}
}

export function replayCathedralFish(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	for (let i = 0; i < entry3[0]; i++) store.players[playerIndex].availableResources[rf.RES_FISH]++
}

function replaySkipExplore(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	// Just remove players from turn order
	for (let i = 0; i < entry3.length; i++) {
		// Remove from turn order
		store.gameflow.turnOrder = store.gameflow.turnOrder.filter((playerIndex) => playerIndex !== entry3[i][0])
	}
}

function replayExplore(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	// DO THIS MANUALLY, AS THE NEW RANDOM ORDER OF EXPLORER RES IS NOT SAVED
	store.mapData.explorers = store.mapData.explorers.filter((ex) => ex !== entry3[0])

	const res = entry3[1]

	store.players[playerIndex].availableResources[res]++
	if (rf.RES_FOODS.includes(res)) store.famineLevel++

	city.markBuildingAsUsed(playerIndex, rf.BLDG_EXPLORER)
}

function replayFamine(historyIndex, playerIndex, entry3) {
	for (let i = 0; i < entry3.length; i++) {
		for (let j = 0; j < entry3[i].length; j++) {
			city.addGraveToCity(playerIndex, i, entry3[i][j], true, false)
		}
	}
}

function replayAddPollutions(historyIndex, playerIndex, entry3) {
	let pollutionHexes = entry3[0]
	for (let i = 0; i < pollutionHexes.length; i++) {
		let pollutionHex = map.getHexDataFromID(pollutionHexes[i])
		country.placePollution_core(pollutionHex)
	}
}

function replayAddPollutionsAndGraves(historyIndex, playerIndex, entry3) {
	let pollutionHexes = entry3[0]
	for (let i = 0; i < pollutionHexes.length; i++) {
		let pollutionHex = map.getHexDataFromID(pollutionHexes[i])
		country.placePollution_core(pollutionHex)
	}

	for (let i = 0; i < entry3[1].length; i++) {
		for (let j = 0; j < entry3[1][i].length; j++) {
			city.addGraveToCity(playerIndex, i, entry3[1][i][j], true, false)
		}
	}
}

function replayNewTurn(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	store.gameflow.turn++
	store.gameflow.phase = rf.PHASE_CITY_BUILDING
	store.famineLevel++
	city.allRise()
}

function checkAndPerformTurnEnd(historyIndex) {
	// NOTE: THis IS THE HISTORY INDEX THAT ALREADY HAPPEND
	// SO NEED TO REDUCE TO THE PREVIOUS MENINGFUL ENTRY
	const store = useModelStore()

	let currentAction = store.history[historyIndex][0]

	// Ignore player trades, as they won't ever end a turn or player (which is done by city build)
	let entriesToIgnore = [rf.HIST_REWIND, rf.HIST_RESIGN, rf.HIST_KICKOUT, rf.HIST_CITY_PLAYER_TRADE, rf.HIST_CATHEDRAL_FISH]
	if (entriesToIgnore.includes(currentAction)) return // NOTHING

	let currentPlayerIndex = store.history[historyIndex][1]

	historyIndex--
	while (entriesToIgnore.includes(store.history[historyIndex][0]) && historyIndex > 0) historyIndex--
	// Don't end the first turn before it has begun

	//let previousPlayerIndex = store.history[historyIndex][1]
	let previousAction = store.history[historyIndex][0]

	if (historyIndex === 0 && entriesToIgnore.includes(previousAction)) return //NOTHING

	if (previousAction === rf.HIST_NEW_TURN) return // NOTHING

	let changeOfPlayer = false
	if (store.gameflow.turnOrder[0] !== -1 && store.gameflow.turnOrder[0] !== currentPlayerIndex) changeOfPlayer = true
	if (currentAction === rf.HIST_CITY_BUILD && previousAction === rf.HIST_FIRST_CITY) changeOfPlayer = true

	// If there has been a change of player
	if (changeOfPlayer) {
		// This should work, as city build simul history is generated in player turn order
		store.gameflow.turnOrder.shift()

		/*// Instead of shift, use this to allow for simul turns
		const indexToRemove = store.gameflow.turnOrder.indexOf(currentPlayerIndex)
		// Check if the integer is present in the array before removing
		if (indexToRemove !== -1) {
			// Remove the integer from the array
			store.gameflow.turnOrder.splice(indexToRemove, 1)
		}*/

		if (store.gameflow.turnOrder.length === 0) {
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			if (store.gameflow.phase === rf.PHASE_FIRST_CITY) {
				//alert("REVERSING")
				store.gameflow.turnOrder.reverse()
				store.gameflow.fullTurnOrder = [...store.gameflow.turnOrder]
				store.gameflow.phase = rf.PHASE_CITY_BUILDING
			}
		}
	}
	//return NOTHING
}
