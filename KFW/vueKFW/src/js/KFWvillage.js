/***
 * Functions related to player villages - for core map display see KFWmap.js
 */

import * as rf from "./KFWreference"
import * as model from "./KFWmodel"
import * as map from "./KFWmap"
import * as controller from "./KFWcontroller"
import * as funcs from "../js/KFWfuncs.js"

import { useModelStore } from "../stores/KFWstore.js"
import { usePersonalStore } from "../stores/KFWpersonal.js"

// This will search for a SPECIFIC SINGLE SIDE of a tile in a village
export function doesPlayerHaveTileID(playerIndex, tileID) {
	const store = useModelStore()
	if (tileID < 0) return false
	let playerObj = store.players[playerIndex]
	for (let i = 0; i < playerObj.villageTiles.length; i++) {
		// If it is a summer boat tile, then upgraded just means which side is selected
		if (rf.TILE_SUMMER_BOATS.includes(playerObj.villageTiles[i].tileID[0])) {
			if (playerObj.villageTiles[i].tileID[playerObj.villageTiles[i].upgraded] == tileID) return true
		}
		// If it is a boat tile, you get the index from the season
		else if (rf.TILE_BOATS.includes(playerObj.villageTiles[i].tileID[0])) {
			let indexToUse = playerObj.villageTiles[i].seasonsIndex.findIndex((subarray) => subarray.includes(store.gameflow.season))
			if (playerObj.villageTiles[i].tileID[indexToUse] == tileID) return true
		}
		// Otherwise, use the upgraded flag - works for SEASON and TURN ORDER tiles
		else {
			if (playerObj.villageTiles[i].tileID[playerObj.villageTiles[i].upgraded] == tileID) return true
		}
	}

	// CHECK THE PENDING TILES FOR BOATS
	for (let i = 0; i < playerObj.pendingVillageTiles.length; i++) {
		// If it is a summer boat tile, then upgraded just means which side is selected
		if (rf.TILE_SUMMER_BOATS.includes(playerObj.pendingVillageTiles[i].tileID[0])) {
			if (playerObj.pendingVillageTiles[i].tileID[playerObj.pendingVillageTiles[i].upgraded] == tileID) return true
		}
	}
	return false
}

/**
 *
 *
 *
 * VILLAGE EXPANSION
 *
 *
 *
 */

// This should only run at the START of village expansion - it assumes all tiles are permanent
export function setBoatChainWarningSettings(playerIndex) {
	const store = useModelStore()
	store.context.boatChainWarnings.splice(0)
	let playerObj = store.players[playerIndex]
	// Find the 3 relevant coords
	let boatCoords = []
	let homeTile = playerObj.villageTiles[0]
	let waterSide = homeTile.sides.indexOf(rf.WATER)
	// Add the tiles with the closest to home tile at end of the array
	boatCoords.unshift(map.findAdjacentHexCoordsThroughSide(homeTile.coord, waterSide))
	boatCoords.unshift(map.findAdjacentHexCoordsThroughSide(boatCoords[0], waterSide))
	boatCoords.unshift(map.findAdjacentHexCoordsThroughSide(boatCoords[0], waterSide))
	// Now check if there are alerady tiles
	let illegalTileFound = false
	for (let i = boatCoords.length - 1; i >= 0; i--) {
		if (illegalTileFound) {
			// If we have already found an illegal tile, remove this co-ord and all after it
			boatCoords.splice(i, 1)
			continue
		}
		let tile = playerObj.villageTiles.find((tile) => tile.coord[0] === boatCoords[i][0] && tile.coord[1] === boatCoords[i][1])
		// If there is a tile, we don't need to monitor those co-ords
		if (tile) {
			boatCoords.splice(i, 1)
		}
		// Otherwise, check if a boat COULD go there
		else {
			let dummyTile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID[0] === rf.TILE_BOAT_KEYFLOWER_A)))
			//model.rotateTileMultipleTimes(dummyTile, 1, waterSide)
			// If the co-ord is valid, add it to the check.
			let locationRet = isValidLocationforNewTile(playerIndex, dummyTile.id, boatCoords[i], waterSide)
			if (locationRet === 1) {
				store.context.boatChainWarnings.push({
					coord: boatCoords[i],
					errorTile_ids: [],
				})
			}
			// Otherwise remove this co-ord and all after it
			else {
				boatCoords.splice(i, 1)
				illegalTileFound = true
			}
		}
	}
}

export function updateBoatChainWarnings(newCoord, tile_id) {
	const store = useModelStore()
	let homeTile = controller.currentPlayerObj().villageTiles[0]
	let waterSide = homeTile.sides.indexOf(rf.WATER)
	let dummyTile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID[0] === rf.TILE_BOAT_KEYFLOWER_A)))
	for (let i = 0; i < store.context.boatChainWarnings.length; i++) {
		// If it's no longer valid, add the tileID to the error list
		// NB currently can only have 1 error, as all tiles added anywhere after this would just repeat the error
		if (!isValidLocationforDummyBoatTile(controller.currentPlayerIndex(), dummyTile.id, store.context.boatChainWarnings[i].coord, waterSide, store.context.boatChainWarnings[i].errorTile_ids)) {
			store.context.boatChainWarnings[i].errorTile_ids.push(tile_id)
		}
	}
}

export function isValidLocationforDummyBoatTile(playerIndex, newTileID, boatChainCoord, rotation, tileIdsToIgnore) {
	//const store = useModelStore()
	if (!newTileID) return false
	if (newTileID === -1) return false
	// if you have boat 2a, everything is valid
	if (doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT2_A)) return true

	// First find the neighbours of the BEING ADDED tile
	let neighbours = map.getNeighbours(playerIndex, boatChainCoord)
	for (let i = neighbours.length - 1; i >= 0; i--) {
		// If the tile is in the ignore list, remove it from the neighbours
		if (tileIdsToIgnore.includes(neighbours[i].id)) {
			neighbours.splice(i, 1)
		}
	}
	// Get the tile sides data
	let newSides = [...rf.ALL_TILES.find((tile) => tile.id === newTileID).sides]
	// Match current rotation
	for (let i = 0; i < rotation; i++) newSides.unshift(newSides.pop())

	for (let i = 0; i < neighbours.length; i++) {
		let commonSide = map.getJoiningSide(neighbours[i].coord, boatChainCoord)
		// So the common side is in relation to the ALREADY PLACED tile
		if (neighbours[i].sides[commonSide] !== newSides[(commonSide + 3) % 6]) return false
	}
	return true
}

// 0 = illegal, 1 = legal, 2 = legal but only with boat power 2a
export function isValidLocationforNewTile(playerIndex, newTileID, newCoord, rotation) {
	//const store = useModelStore()
	if (!newTileID && newTileID !== 0) return 0
	if (newTileID === -1) return 0
	// if you have boat 2a, everything is valid
	let boatPower2a = false
	if (doesPlayerHaveTileID(playerIndex, rf.TILE_SUMMER_BOAT2_A)) boatPower2a = true

	// First find the neighbours of the BEING ADDED tile
	let neighbours = map.getNeighbours(playerIndex, newCoord)
	// Get the tile sides data
	let newSides = [...rf.ALL_TILES.find((tile) => tile.id === newTileID).sides]
	// Match current rotation
	for (let i = 0; i < rotation; i++) newSides.unshift(newSides.pop())

	for (let i = 0; i < neighbours.length; i++) {
		let commonSide = map.getJoiningSide(neighbours[i].coord, newCoord)
		// So the common side is in relation to the ALREADY PLACED tile
		if (neighbours[i].sides[commonSide] !== newSides[(commonSide + 3) % 6]) return boatPower2a ? 2 : 0
	}
	return 1
}

export function addTileToVillage(tile_id, rotation, newCoord, upgraded) {
	const store = useModelStore()
	const personal = usePersonalStore()

	addTileToVillage_core(controller.currentPlayerIndex(), tile_id, rotation, newCoord, upgraded)

	store.players[controller.currentPlayerIndex()].pendingVillageTiles = store.players[controller.currentPlayerIndex()].pendingVillageTiles.filter((tile) => tile.id !== tile_id)

	// Update the boat chain warnings
	updateBoatChainWarnings(newCoord, tile_id)

	if (controller.currentPlayerObj().pendingVillageTiles.length > 0) {
		map.setPlaceableTilesForPlayerVillge(controller.currentPlayerIndex())
		map.calculateCanvasSizeForPlayerVillage(controller.currentPlayerIndex(), true)
		store.context.action = rf.ACT_ADD_TILES_TO_VILLAGE
		/*store.context.newTileGhostData.selectedIndexInpendingVillageTiles = 0
		store.context.newTileGhostData.id = controller.currentPlayerObj().pendingVillageTiles[0].id
		store.context.newTileGhostData.rotation = 0
		store.context.newTileGhostData.gfx = controller.currentPlayerObj().pendingVillageTiles[0].gfx[0]*/
		store.context.newTileGhostData.selectedIndexInpendingVillageTiles = -1
		store.context.newTileGhostData.id = -1
		store.context.newTileGhostData.rotation = 0
		store.context.newTileGhostData.gfx = ""
		store.context.newTileGhostData.upgraded = 0
	} else {
		store.players[controller.currentPlayerIndex()].placeableVillageCoords.splice(0)
		map.calculateCanvasSizeForPlayerVillage(controller.currentPlayerIndex(), false)
		if (personal.trainingGame) model.addHistory(rf.HIST_VILLAGE_EXPANSION, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.action = rf.ACT_CONFIRM_END_TURN
	}

	// Add the id to new tile
	store.context.newVillageTile_ids.push(tile_id)

	// Add an undo point
	model.createUndoPoint()
}

export function addTileToVillage_core(playerIndex, tile_id, rotation, newCoord, upgraded) {
	const store = useModelStore()
	let newTile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.id === tile_id)))
	newTile.coord = newCoord
	model.rotateTileMultipleTimes(newTile, 1, rotation)
	newTile.upgraded = upgraded

	store.players[playerIndex].villageTiles.push(newTile)
}

export function isVillageValid(playerIndex) {
	const store = useModelStore()
	// Check there are no pending tiles
	if (store.players[playerIndex].pendingVillageTiles.length > 0) return 1

	// Check every tile placement is valid
	for (let i = 0; i < store.players[playerIndex].villageTiles.length; i++) {
		let tile = store.players[playerIndex].villageTiles[i]
		if (isValidLocationforNewTile(playerIndex, tile.id, tile.coord, tile.rotation) === 0) return 2
	}

	// Check every tile is connected
	for (let i = 0; i < store.players[playerIndex].villageTiles.length; i++) {
		let tile = store.players[playerIndex].villageTiles[i]
		const distanceData = map.tilesDistanceFrom(store.players[playerIndex].villageTiles, [rf.ROAD, rf.GRASS, rf.WATER], tile.id)
		let homeTileID = store.players[playerIndex].villageTiles[0].id
		if (!distanceData.some((subArr) => subArr.includes(homeTileID))) return 3
	}
	return 0
}

export function getResHistoryObj(resources, destinationTileID) {
	const store = useModelStore()
	let ret = []
	// Check if it's coming from a tile action
	if (store.context.selectedTile.id !== -1) {
		let actionTile = store.context.selectedTile
		let actionTileID = store.context.selectedTile.tileID[store.context.selectedTile.upgraded]
		let action = store.context.selectedTile.action[0]
		//let homeTileID = controller.currentPlayerObj().villageTiles[0].tileID[controller.currentPlayerObj().villageTiles[0].upgraded]
		if (actionTileID === rf.TILE_M_SPRING_ASSAYER_A) {
			// Adding a single res CHOICE
			ret.push(destinationTileID, resources[0])
		} else if (actionTileID === rf.TILE_M_SPRING_ASSAYER_B) {
			// Adding 2 known res
			ret.push(destinationTileID)
		}
		// Auto resolving action
		else if (action === rf.ACT_TILE_GET_RES) {
			ret.push(destinationTileID)
		}
		// Manual Choice
		else if (actionTile.action[0] === rf.ACT_TILE_GET_RES_CHOICE_THEN_ALL && actionTile.upgraded === 0) {
			ret.push(destinationTileID, resources[0])
		}
		// Get all res
		else if (actionTile.action[0] === rf.ACT_TILE_GET_RES_CHOICE_THEN_ALL && actionTile.upgraded === 1) {
			ret.push(destinationTileID)
		}
		// SKill tile for Res - fixed res
		else if (actionTile.action[0] === rf.ACT_TILE_SKILL_FOR_RES) {
			ret.push(destinationTileID)
		}
	}
	return ret
}

export function addResourcesToVillage(playerIndex, actionTileID, resources) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	let isInMyVillage = doesPlayerHaveTileID(playerIndex, actionTileID)

	// If the tileID causing the action is in your village, resources go on that tile
	if (isInMyVillage) {
		addResourcceToVillageTileID_core(playerIndex, actionTileID, resources)
		store.context.resourceDepositTileID = actionTileID
		store.context.historyObj.push([...getResHistoryObj(resources, store.context.resourceDepositTileID)])
	}
	// Otherwise, the resources come from outside your village
	else {
		// So if you have summer boat 7A you can choose where they go
		if (doesPlayerHaveTileID(controller.currentPlayerIndex(), rf.TILE_SUMMER_BOAT7_A)) {
			store.context.pendingBoat7Aresources = [...resources]
			store.context.action = rf.ACT_PLACE_BOAT_7A_RESOURCES
			store.context.historyObj.push([...getResHistoryObj(resources, -1)]) // add the -1 to make sure the correct int is replaced with tileID
		}
		// Otherwise, they go on your home tile
		else {
			addResourcceToVillageTileID_core(playerIndex, playerObj.villageTiles[0].tileID[playerObj.villageTiles[0].upgraded], resources)
			store.context.resourceDepositTileID = playerObj.villageTiles[0].tileID[playerObj.villageTiles[0].upgraded]
			store.context.historyObj.push([...getResHistoryObj(resources, store.context.resourceDepositTileID)])
		}
	}
}

export function addResourcceToVillageTileID_core(playerIndex, tileID, resources) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	let tile = playerObj.villageTiles.find((tile) => tile.tileID[tile.upgraded] === tileID)
	for (let i = 0; i < resources.length; i++) {
		tile.resources[resources[i]]++
	}
}

export function getValidSorcererIds() {
	const store = useModelStore()
	let sorcererPlayerIndex = -1
	let startTileId = -1
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].villageTiles.length; j++) {
			if (store.players[i].villageTiles[j].tileID[0] === rf.TILE_SUMMER_SORCERER_A) {
				startTileId = store.players[i].villageTiles[j].id
				sorcererPlayerIndex = i
				break
			}
		}
		if (sorcererPlayerIndex !== -1) break
	}
	let distances = map.tilesDistanceFrom(store.players[sorcererPlayerIndex].villageTiles, [rf.ROAD, rf.GRASS, rf.WATER], startTileId)
	// Remove the sorcerer tile at distance 0
	distances.shift()
	// If range limited, just keep distance 1
	if (store.context.sorcererRange === 1) distances = distances.slice(0, 1)
	return [].concat(...distances)
}

export function processEndOfSimulTurn(histData) {
	const store = useModelStore()
	let timeNow = Math.round(new Date().getTime() / 1000)
	let allHist = []

	for (let i = 0; i < histData.length; i++) {
		// Ignore empty moves
		if (histData[i].length === 0) continue
		// First, gather the previously added tileID's
		let alreadyAddededTileIDs = []
		for (let j=0;j<store.history.length;j++) {
			if (store.history[j][0] === rf.HIST_VILLAGE_EXPANSION && store.history[j][1] === i) {
				alreadyAddededTileIDs = alreadyAddededTileIDs.concat(store.history[j][3])
			}
		}
		// Now add their upgraded versions in case they've been upgraded
		let upgradedTileIDs =[]
		for (let j = 0; j < alreadyAddededTileIDs.length; j++) {
			let prevTile = rf.ALL_TILES.find((t) => t.tileID.includes(alreadyAddededTileIDs[j]))
			upgradedTileIDs.push(prevTile.tileID[1])
		}
		// Now uniq the upgrade, and add to alreadyAdded
		alreadyAddededTileIDs = [...new Set(upgradedTileIDs.concat(alreadyAddededTileIDs))]

		let timestamp = histData[i][0]
		let compressedData = histData[i][1]
		let moveData = funcs.decompressData(compressedData)
		let histObj = []
		for (let i = 0; i < moveData.length; i++) {
			//histObj.push(moveData[i][0]) // id
			let tile_id = moveData[i][0]
			let upgraded = moveData[i][1]
			let tile = rf.ALL_TILES.find((t) => t.id === tile_id)
			let tileID = tile.tileID[upgraded]
			// We never want home tiles
			if (rf.ALL_HOME_TILES.includes(tileID)) continue
			if (!alreadyAddededTileIDs.includes(tileID)) histObj.push(tileID)
		}
		allHist.push([rf.HIST_VILLAGE_EXPANSION, i, timestamp / 1000 - timeNow, [...histObj]])
	}
	// Sort by TS
	allHist.sort((a, b) => a[2] - b[2])
	for (let i = 0; i < allHist.length; i++) {
		model.addHistory(...allHist[i])
	}
}

export function exportVillageMidGame(playerIndex) {
	const store = useModelStore()
	let res = []
	for (let i = 0; i < store.players[playerIndex].villageTiles.length; i++) {
		let tile = store.players[playerIndex].villageTiles[i]
		let newEntry = []
		newEntry.push(tile.tileID[tile.upgraded]) // 0
		newEntry.push(tile.rotation) // 1
		newEntry.push(tile.coreMeepleColour) // 2
		newEntry.push(tile.coord.slice(0, 2)) // 3
		newEntry.push([...tile.resources]) // 4
		if (!rf.TILE_NO_ACTION.includes(tile.tileID[tile.upgraded])) newEntry.push(JSON.parse(JSON.stringify(tile.meeplesOnTile))) // 5?

		if (store.useMerchantsExpansion) {
			if (i === 0) {
				newEntry.push(tile.cabins) //6?
				if (tile.extension !== rf.EXTENSION_NONE && tile.extension !== rf.EXTENSION_BANNED) newEntry.push(tile.extension)
			} else if (tile.extension !== rf.EXTENSION_NONE && tile.extension !== rf.EXTENSION_BANNED) newEntry.push(tile.extension)
		}
		res.push(newEntry)
	}
	return res
}

export function importVillageMidGame(villageDataArr) {
	const store = useModelStore()
	let newVillage = []
	for (let i = 0; i < villageDataArr.length; i++) {
		let newTileID = villageDataArr[i][0]
		let newTileRotation = villageDataArr[i][1]
		let newCoreMeepleColour = villageDataArr[i][2]
		let newCoord = villageDataArr[i][3]
		newCoord.push(-newCoord[0] - newCoord[1])
		let newResources = villageDataArr[i][4]
		let newMeeplesOnTile = []
		let IMPORT_IDX = 5
		if (!rf.TILE_NO_ACTION.includes(newTileID)) {
			newMeeplesOnTile = JSON.parse(JSON.stringify(villageDataArr[i][IMPORT_IDX]))
			IMPORT_IDX++
		}
		let newCabins = 0
		let newExtension = rf.EXTENSION_NONE
		if (store.useMerchantsExpansion) {
			if (i === 0) {
				newCabins = villageDataArr[i][IMPORT_IDX]
				IMPORT_IDX++
				if (villageDataArr[i].length > IMPORT_IDX) newExtension = villageDataArr[i][IMPORT_IDX]
			} else {
				if (villageDataArr[i].length > IMPORT_IDX) newExtension = villageDataArr[i][IMPORT_IDX]
			}
		}

		let newTile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((t) => t.tileID.includes(newTileID))))
		model.rotateTileMultipleTimes(newTile, 1, newTileRotation)
		newTile.upgraded = newTile.tileID.indexOf(newTileID)
		newTile.coreMeepleColour = newCoreMeepleColour
		newTile.coord = [...newCoord]
		newTile.resources = [...newResources]
		newTile.meeplesOnTile = [...newMeeplesOnTile]

		if (store.useMerchantsExpansion) {
			newTile.cabins = newCabins
			newTile.extension = newExtension
		}
		newVillage.push(newTile)
	}
	return newVillage
}

export function exportVillageEndGame(playerIndex) {
	const store = useModelStore()
	let res = []
	for (let i = 0; i < store.players[playerIndex].villageTiles.length; i++) {
		let tile = store.players[playerIndex].villageTiles[i]
		let newEntry = []
		newEntry.push(tile.tileID[tile.upgraded]) // 0
		newEntry.push(tile.rotation) // 1
		newEntry.push(tile.coord.slice(0, 2)) // 2

		if (rf.TILE_SCORE_RES_ALREADY_ON_TILE.includes(tile.tileID[tile.upgraded]))
			newEntry.push([...tile.resources]) // 3?
		else if (tile.tileID[tile.upgraded] === rf.TILE_WINTER_DELIVERY_MAN_A)
			newEntry.push([...tile.scoredRoute]) // 3?
		else if (tile.tileID[tile.upgraded] === rf.TILE_BOAT_SEA_BASTION_B) newEntry.push([...tile.scoredRoute]) // 3?

		if (store.useMerchantsExpansion) {
			if (i === 0) {
				newEntry.push(tile.cabins) // 4?
				newEntry.push([...tile.resources]) // 6?
				if (tile.upgradable && tile.upgraded === 1) newEntry.push(tile.extension) // 6?
			} else if (tile.upgradable && tile.upgraded === 1) newEntry.push(tile.extension) //4?
		}

		if (tile.completedSets.length > 0) {
			newEntry.push([0])
			for (let j = 0; j < tile.completedSets.length; j++) {
				let completedSet = tile.completedSets[j]
				// if each item matches tile.itemSet, just store the number
				let matching = true
				for (let k = 0; k < completedSet.length; k++) {
					if (completedSet[k] !== tile.itemSet[k]) matching = false
				}
				if (matching) newEntry[newEntry.length - 1][0]++
				else {
					newEntry[newEntry.length - 1].push([...completedSet])
				}
			}
			// Now remove the leading 0 if none can be matching
			if (tile.itemSet.some((item) => item < 0)) newEntry[newEntry.length - 1].shift()
		}

		res.push(newEntry)
	}
	return res
}

export function importVillageEndGame(playerIndex, villageDataArr) {
	const store = useModelStore()
	let newVillage = []
	for (let i = 0; i < villageDataArr.length; i++) {
		let newTileID = villageDataArr[i][0]
		let newTileRotation = villageDataArr[i][1]
		let newCoord = villageDataArr[i][2]
		newCoord.push(-newCoord[0] - newCoord[1])

		let newResources = []
		let scoredRoute = []
		let IMPORT_IDX = 3
		if (rf.TILE_SCORE_RES_ALREADY_ON_TILE.includes(newTileID)) {
			newResources = villageDataArr[i][IMPORT_IDX]
			IMPORT_IDX++
		} else if (newTileID === rf.TILE_WINTER_DELIVERY_MAN_A) {
			scoredRoute = villageDataArr[i][IMPORT_IDX]
			IMPORT_IDX++
		} else if (newTileID === rf.TILE_BOAT_SEA_BASTION_B) {
			scoredRoute = villageDataArr[i][IMPORT_IDX]
			IMPORT_IDX++
		}

		let newTile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((t) => t.tileID.includes(newTileID))))
		model.rotateTileMultipleTimes(newTile, 1, newTileRotation)
		newTile.upgraded = newTile.tileID.indexOf(newTileID)
		newTile.coord = [...newCoord]

		let newCabins = 0
		let newExtension = rf.EXTENSION_NONE
		if (store.useMerchantsExpansion) {
			if (i === 0) {
				newCabins = villageDataArr[i][IMPORT_IDX]
				IMPORT_IDX++
				newResources = villageDataArr[i][IMPORT_IDX]
				IMPORT_IDX++
				if (newTile.upgraded && newTile.upgraded === 1) {
					newExtension = villageDataArr[i][IMPORT_IDX]
					IMPORT_IDX++
				}
			} else {
				if (newTile.upgradable && newTile.upgraded === 1) {
					newExtension = villageDataArr[i][IMPORT_IDX]
					IMPORT_IDX++
				}
			}
		}

		if (store.useMerchantsExpansion) {
			newTile.cabins = newCabins
			newTile.extension = newExtension
		}
		// DO this here so home tile res are added
		newTile.resources = [...newResources]
		if (newTileID === rf.TILE_WINTER_DELIVERY_MAN_A) newTile.scoredRoute = [...scoredRoute]
		if (newTileID === rf.TILE_BOAT_SEA_BASTION_B) newTile.scoredRoute = [...scoredRoute]

		// Now add completed item sets
		if (villageDataArr[i].length > IMPORT_IDX) {
			let allItemSets = villageDataArr[i][IMPORT_IDX]
			let baseSet = newTile.itemSet
			let baseMults = 0
			let startIdx = 0
			if (!baseSet.some((item) => item < 0)) {
				startIdx = 1
				baseMults = allItemSets[0]
				for (let j = 0; j < baseMults; j++) newTile.completedSets.push([...newTile.itemSet])
			}
			for (let j = startIdx; j < allItemSets.length; j++) {
				newTile.completedSets.push([...allItemSets[j]])
			}
		}

		newVillage.push(newTile)
	}
	store.players[playerIndex].villageTiles.splice(0)
	store.players[playerIndex].villageTiles = JSON.parse(JSON.stringify(newVillage))
}
