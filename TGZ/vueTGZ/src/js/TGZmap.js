import * as refFuncs from "./TGZfuncs"
import * as rf from "./TGZreference"
import * as model from "./TGZmodel"
import * as controller from "./TGZcontroller"

import { useModelStore } from "../stores/TGZstore.js"

/*
  newMap(nbPlayers)
  getMapDisplayArray
  initCoords
  rotateTile
  getSw
  getIndexForCoords
  getCoordsForIndex
  getNeighbours
  getSpacesForMonument(hasNomads, startMonument) -> indexes
  isIndexOnRightOfMap
  getSpacesForResource()
  expandWater(index)
  getCraftsmanZoneFromData(craftsmanData)
  isIn2dArray
  getAllSquaresWithinRangeOfZone(zone, range, returnRanges) => EITTHER arrray with sqs at each range OR all sqs
  getAllSquaresOfSameType(type)
  getAllSquaresOfTypesWithinRangeOfZone
  isAhub
  spaceAvailable
  getCraftsmanDataFromAnySq
  getAllCraftsmanPrimaryIndexesWithinRangeOfZone
  getAllCraftsmanDataWithinRangeOfZoneAndOutOfRange
  getResourceRangeStatusForPlacingCraftsman
  getTakenResourceSquaresForCraftsman
  getAllowedIndexesToPlacePriCraftsman
  getAllSquaresAndHubsWithinRangeOfZone
  getAllOrAnySquaresWithinRangeOfZoneUsingHubs
  getAllowedIndexesToPlaceSecCraftsman
  getAllUndepletedResourceSquaresToHighlight
  getPossibleCraftsmenWithRangeToRaiseMonument

  prettyPrint
*/

export function newMap(inputData) {
	const store = useModelStore()

	let res = []
	if (typeof inputData === "number") {
		let nbPlayers = inputData
		let tilesNeeded = 4
		if (nbPlayers === 3) tilesNeeded = 6
		if (nbPlayers === 4) tilesNeeded = 7
		if (nbPlayers === 5) tilesNeeded = 9

		var availableTiles = refFuncs.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

		// Set up map
		for (let i = 0; i < tilesNeeded; i++) {
			res.push(availableTiles.pop(), Math.floor(Math.random() * 4))
		}

		// Swap in player start tile
		if (nbPlayers === 2) {
			res[0] = 0
			res[1] = Math.floor(Math.random() * 4)
		} else if (nbPlayers === 3) {
			res[8] = 0
			res[9] = Math.floor(Math.random() * 4)
		} else if (nbPlayers === 4) {
			res[6] = 0
			res[7] = Math.floor(Math.random() * 4)
		} else if (nbPlayers === 5) {
			res[8] = 0
			res[9] = Math.floor(Math.random() * 4)
		}
		// "return" the new map
		store.mapTiles = res
	} else if (Array.isArray(inputData)) {
		store.mapTiles = [...inputData]
	}

	initCoords()
}

// Returns one tile per index, with [tile, rotation]
export function getMapDisplayArray() {
	const store = useModelStore()
	let res = []
	for (let i = 0; i < store.mapTiles.length; i += 2) res.push(store.mapTiles.slice(i, i + 2))
	return res
}

export function initCoords() {
	const store = useModelStore()

	// Now set up the co-ords
	store.coords.splice(0)
	let coordsTiles = [...store.mapTiles]

	// Add in blank tiles to make a grid
	switch (coordsTiles.length) {
		case 12:
			coordsTiles.splice(10, 0, -1, 0)
			coordsTiles.splice(14, 0, -1, 0, -1, 0)
			break
		case 14:
			coordsTiles.splice(4, 0, -1, 0)
			coordsTiles.splice(12, 0, -1, 0)
			break
	}

	// Now make a 2d array of each tiles co-ords (6x6)
	let coordsTilesInner = []
	for (let i = 0; i < coordsTiles.length / 2; i++) {
		let currentTile = rf.OOB_TILE
		if (coordsTiles[i * 2] >= 0) currentTile = rf.MAP_TILES[coordsTiles[i * 2]]
		coordsTilesInner.push(rotateTile(currentTile, coordsTiles[i * 2 + 1]))
	}

	let Tw = 3
	if (store.mapTiles.length === 8) Tw = 2
	let Sw = Tw * 6

	// Now split it out into a single long array
	for (let i = 0; i < Sw; i++) {
		for (let j = 0; j < Sw; j++) {
			var coordsIndex = Sw * i + j
			var tileIndex = Math.floor(i / 6) * Tw + Math.floor(j / 6)
			var insideTileIndex = (i % 6) * 6 + (j % 6)
			store.coords[coordsIndex] = coordsTilesInner[tileIndex][insideTileIndex]
		}
	}
}

function rotateTile(arr, rots) {
	var res = []
	for (let i = 0; i < arr.length; i++) {
		let x = i % 6
		let y = Math.floor(i / 6)
		let Tsw = 6
		switch (rots) {
			case 0:
				res[i] = arr[i]
				break
			case 1:
				res[x * Tsw + y] = arr[Tsw * Tsw - Tsw * y - Tsw + x]
				break
			case 2:
				res[x + y * Tsw] = arr[Tsw * Tsw - Tsw * y - x - 1]
				break
			case 3:
				res[x * Tsw + y] = arr[Tsw - x - 1 + Tsw * y]
				break
		}
	}
	return res
}

export function getSw() {
	const store = useModelStore()
	let Sw = 18
	if (store.mapTiles.length === 8) Sw = 12
	return Sw
}

/* EITHER:
  Take ([x,y]) and find the index, OR
  Take (x, y) and find the index
*/
export function getIndexForCoords(x, y) {
	let Sw = getSw()
	if (y == undefined && x.length == 2) {
		return x[1] * Sw + x[0]
	} else {
		return y * Sw + x
	}
}

// Take an index, return coords in [x, y]
export function getCoordsForIndex(index) {
	let Sw = getSw()
	var res = []
	res.push(index % Sw)
	res.push(Math.floor(index / Sw))
	return res
}

export function getNeighbours(index, allSqs, removeWater = false) {
	const store = useModelStore()
	let Sw = getSw()
	let res = []

	// If not on top row, push one up
	if (index >= Sw) res.push(index - Sw)
	// If not on bottom, push one below
	if (index <= store.coords.length - Sw - 1) res.push(index + Sw)
	// if not on left edge, push -1
	if (index % Sw > 0) res.push(index - 1)
	// if not on right edge, push +1
	if (index % Sw < Sw - 1) res.push(index + 1)

	if (allSqs) {
		// Not on top and not on left, push UL
		if (index >= Sw && index % Sw > 0) res.push(index - Sw - 1)
		// Not on top and not on right, push UR
		if (index >= Sw && index % Sw < Sw - 1) res.push(index - Sw + 1)
		// Not on bottom and not on left, push DL
		if (index <= store.coords.length - Sw - 1 && index % Sw > 0) res.push(index + Sw - 1)
		// Not on bottom and not on right, push DR
		if (index <= store.coords.length - Sw - 1 && index % Sw < Sw - 1) res.push(index + Sw + 1)
	}

	// remove OOB
	for (let i = res.length - 1; i >= 0; i--) {
		if (store.coords[res[i]] === rf.OOB_SQ) res.splice(i, 1)
	}

	if (removeWater) {
		for (let i = res.length - 1; i >= 0; i--) {
			if (store.coords[res[i]] === rf.WATER_SQ) res.splice(i, 1)
		}
	}

	return res
}

export function getSpacesForMonument(hasNomads, startMonument) {
	const store = useModelStore()

	if (startMonument) return getAllSquaresOfSameType(rf.START_SQ)

	// get all free spaces
	let res = getAllSquaresOfSameType(rf.EMPTY_SQ)
	if (hasNomads) return res
	// Now remove all sqs adjacent to monument already
	for (let i = res.length - 1; i >= 0; i--) {
		let neighbours = getNeighbours(res[i], true)
		for (let j = 0; j < neighbours.length; j++) {
			if (store.coords[neighbours[j]] >= 50 && store.coords[neighbours[j]] <= 100) {
				res.splice(i, 1)
				break
			}
		}
	}
	return res
}

function isIndexOnRightOfMap(index) {
	let Sw = getSw()
	if (index % Sw < Sw - 1) return false
	return true
}

// This is resource OR water
export function getSpacesForResource() {
	const store = useModelStore()
	// get all free spaces
	let res = []
	for (let i = 0; i < store.coords.length; i++) if (store.coords[i] === rf.EMPTY_SQ) res.push(i)
	// Return NON water resource
	if (store.context.itemBeingAdded !== rf.WATER_TILE) return res
	// Now for a water tile, need to check if there's space
	let resSpace = []
	for (let i = 0; i < res.length; i++) {
		// all res are empty. So just check the other one is empty
		let Sw = getSw()
		if (store.context.itemBeingAddedRotation === 0 && !isIndexOnRightOfMap(res[i]) && store.coords[res[i] + 1] === rf.EMPTY_SQ) resSpace.push(res[i])
		// POSSIBLE ERROR if accessing store.coords[I] where I could be > length
		else if (store.context.itemBeingAddedRotation === 1 && store.coords[res[i] + Sw] === rf.EMPTY_SQ) resSpace.push(res[i])
	}
	return resSpace
}

export function expandWater(index) {
	const store = useModelStore()
	let validWaterSqs = [rf.WATER_SQ]
	//if (controller.currentPlayerObj().god[0] === rf.OLOKUN) validWaterSqs = validWaterSqs.concat(rf.CRAFTSMEN_SQS).concat(rf.RESOURCE_SQS)
	if (!validWaterSqs.includes(store.coords[index])) return []
	let res = [index]
	let toExplo = [index]
	while (toExplo.length > 0) {
		// find all new squares
		let newSquares = []
		for (let i = 0; i < toExplo.length; i++) {
			let neighbours = getNeighbours(toExplo[i], false)
			// must be not already found, and also be water
			for (let j = neighbours.length - 1; j >= 0; j--) {
				if (!validWaterSqs.includes(store.coords[neighbours[j]]) || res.includes(neighbours[j])) neighbours.splice(j, 1)
			}
			res = res.concat(neighbours)
			newSquares = newSquares.concat(neighbours)
		}
		toExplo = [...newSquares]
	}
	return res
}

export function expandArryaOfSqs(index, validSquaresArray) {
	const store = useModelStore()
	if (!validSquaresArray.includes(store.coords[index])) return []
	let res = [index]
	let toExplo = [index]
	while (toExplo.length > 0) {
		// find all new squares
		let newSquares = []
		for (let i = 0; i < toExplo.length; i++) {
			let neighbours = getNeighbours(toExplo[i], false)
			// must be not already found, and also be water
			for (let j = neighbours.length - 1; j >= 0; j--) {
				if (!validSquaresArray.includes(store.coords[neighbours[j]]) || res.includes(neighbours[j])) neighbours.splice(j, 1)
			}
			res = res.concat(neighbours)
			newSquares = newSquares.concat(neighbours)
		}
		toExplo = [...newSquares]
	}
	return res
}

export function getCraftsmanZoneFromData(craftsmanData) {
	let index = craftsmanData[0]
	let Sw = getSw()

	if (rf.FOUR_SIZE_TILES.includes(craftsmanData[1])) return [index, index + 1, index + Sw, index + Sw + 1]
	else if (craftsmanData[2] === 0) return [index, index + 1]
	else if (craftsmanData[2] === 1) return [index, index + Sw]
}

function isIn2dArray(array2d, itemtofind) {
	return [].concat.apply([], [].concat.apply([], array2d)).indexOf(itemtofind) !== -1
}

/** Takes in:
 *    zone (arr), RANGE(int)
 *    returns EITHER all squares in range
 *    OR an array with all sqaures at each range being that entry in the array
 */
export function getAllSquaresWithinRangeOfZone(zone, range, returnRanges) {
	const store = useModelStore()
	let res = []
	res.push([...zone]) // zone is at range 0
	let toExplo = [...zone]
	let remainingRange = range
	while (remainingRange > 0) {
		let thisRange = []
		for (let i = 0; i < toExplo.length; i++) {
			let neighbours = getNeighbours(toExplo[i], true)
			// For each neighbour, check it isn't already in the array
			for (let j = 0; j < neighbours.length; j++) {
				if (!isIn2dArray(res, neighbours[j])) thisRange.push(neighbours[j])
			}
		}
		// Now have all unique squares at thisRange, so expand for water
		let validWaterSqs = [rf.WATER_SQ]
		//if (controller.currentPlayerObj().god[0] === rf.OLOKUN) validWaterSqs = validWaterSqs.concat(rf.CRAFTSMEN_SQS).concat(rf.RESOURCE_SQS)
		let waterSqs = []
		for (let j = 0; j < thisRange.length; j++) {
			if (validWaterSqs.includes(store.coords[thisRange[j]]) && !waterSqs.includes(thisRange[j])) waterSqs = waterSqs.concat(expandWater(thisRange[j]))
		}
		// Expand for Simbi
		if (controller.currentPlayerObj().god[0] === rf.SIMBI) {
			let simbiSqs = []
			for (let j = 0; j < thisRange.length; j++) {
				if (rf.VALID_SIMBI_SQS.includes(store.coords[thisRange[j]]) && !simbiSqs.includes(thisRange[j])) simbiSqs = simbiSqs.concat(expandArryaOfSqs(thisRange[j], rf.VALID_SIMBI_SQS))
			}
			thisRange = thisRange.concat(simbiSqs)
		}
		// Add in the water
		thisRange = thisRange.concat(waterSqs)
		thisRange = [...new Set(thisRange)]
		toExplo = [...thisRange]
		res.push([...thisRange])
		remainingRange--
	} // End of range

	// Return array, with each index being sqs at that range
	if (returnRanges) return res

	let resSqs = []
	for (let i = 0; i < res.length; i++) resSqs = resSqs.concat(res[i])
	return resSqs
}

export function getAllSquaresWithinRangeOfZoneWithoutWater(zone, range, returnRanges) {
	//const store = useModelStore()
	let res = []
	res.push([...zone]) // zone is at range 0
	let toExplo = [...zone]
	let remainingRange = range
	while (remainingRange > 0) {
		let thisRange = []
		for (let i = 0; i < toExplo.length; i++) {
			let neighbours = getNeighbours(toExplo[i], true, true)
			// For each neighbour, check it isn't already in the array
			for (let j = 0; j < neighbours.length; j++) {
				if (!isIn2dArray(res, neighbours[j])) thisRange.push(neighbours[j])
			}
		}
		thisRange = [...new Set(thisRange)]
		toExplo = [...thisRange]
		res.push([...thisRange])
		remainingRange--
	} // End of range

	// Return array, with each index being sqs at that range
	if (returnRanges) return res

	let resSqs = []
	for (let i = 0; i < res.length; i++) resSqs = resSqs.concat(res[i])
	return resSqs
}

export function getAllSquaresOfSameType(type) {
	const store = useModelStore()
	let res = []
	for (let i = 0; i < store.coords.length; i++) if (store.coords[i] === type) res.push(i)
	return res
}

export function getAllSquaresOfTypesWithinRangeOfZone(zone, range, types) {
	const store = useModelStore()
	let allSquaresWIthinRange = getAllSquaresWithinRangeOfZone(zone, range, false)
	let resInRange = []
	for (let i = 0; i < allSquaresWIthinRange.length; i++) {
		if (types.includes(store.coords[allSquaresWIthinRange[i]])) resInRange.push(allSquaresWIthinRange[i])
	}
	return resInRange
}

export function getAllSquaresOfTypesWithinRangeOfZoneWithoutWater(zone, range, types) {
	const store = useModelStore()
	let allSquaresWIthinRange = getAllSquaresWithinRangeOfZoneWithoutWater(zone, range, false)
	let resInRange = []
	for (let i = 0; i < allSquaresWIthinRange.length; i++) {
		if (types.includes(store.coords[allSquaresWIthinRange[i]])) resInRange.push(allSquaresWIthinRange[i])
	}
	return resInRange
}

function isAhub(index) {
	const store = useModelStore()
	if (store.coords[index] >= 50 && store.coords[index] <= 100) return true
	return false
}

function spaceAvailable(index, width, height, isBlacksmith) {
	const store = useModelStore()
	let Sw = getSw()
	let [x, y] = getCoordsForIndex(index)

	// Now check all sqs are empty
	if (isBlacksmith) {
		// Check it doesn't hang off the edge
		if (x + 2 > Sw || y + 3 > Sw || x - 1 < 0) {
			return false
		}
		if (store.coords[getIndexForCoords(x, y)] !== rf.EMPTY_SQ) return false
		if (store.coords[getIndexForCoords(x - 1, y + 1)] !== rf.EMPTY_SQ) return false
		if (store.coords[getIndexForCoords(x, y + 1)] !== rf.EMPTY_SQ) return false
		if (store.coords[getIndexForCoords(x + 1, y + 1)] !== rf.EMPTY_SQ) return false
		if (store.coords[getIndexForCoords(x, y + 2)] !== rf.EMPTY_SQ) return false
		return true
	}

	// Check it doesn't hang off the edge
	if (x + width > Sw || y + height > Sw) {
		return false
	}

	for (let i = 0; i < width; i++) {
		for (let j = 0; j < height; j++) {
			if (store.coords[getIndexForCoords(x + i, y + j)] !== rf.EMPTY_SQ) {
				return false
			}
		}
	}
	return true
}

export function getCraftsmanDataFromAnySq(index, returnData) {
	const store = useModelStore()

	let Sw = getSw()
	let relevantTile = rf.getCrafsmsnTileFromCraftsmanSq(store.coords[index])

	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].craftsmen.length; j++) {
			if (store.players[i].craftsmen[j][0] === index && store.players[i].craftsmen[j][1] === relevantTile) {
				if (!returnData) return store.players[i].craftsmen[j][0]
				return store.players[i].craftsmen[j]
			}
			// Move one left
			else if (rf.FOUR_SIZE_TILES.includes(relevantTile) && store.players[i].craftsmen[j][0] === index - 1 && store.players[i].craftsmen[j][1] === relevantTile) {
				if (!returnData) return store.players[i].craftsmen[j][0]
				return store.players[i].craftsmen[j]
			}
			// Move one up
			else if (rf.FOUR_SIZE_TILES.includes(relevantTile) && store.players[i].craftsmen[j][0] === index - Sw && store.players[i].craftsmen[j][1] === relevantTile) {
				if (!returnData) return store.players[i].craftsmen[j][0]
				return store.players[i].craftsmen[j]
			}
			// Move one up one left
			else if (rf.FOUR_SIZE_TILES.includes(relevantTile) && store.players[i].craftsmen[j][0] === index - Sw - 1 && store.players[i].craftsmen[j][1] === relevantTile) {
				if (!returnData) return store.players[i].craftsmen[j][0]
				return store.players[i].craftsmen[j]
			}
			// OTHERWISE, check if not rotated and one left is the index
			else if (store.players[i].craftsmen[j][2] === 0 && store.players[i].craftsmen[j][0] === index - 1 && store.players[i].craftsmen[j][1] === relevantTile) {
				if (!returnData) return store.players[i].craftsmen[j][0]
				return store.players[i].craftsmen[j]
			}
			// Otherwise, must be roated and up one
			else if (store.players[i].craftsmen[j][2] === 1 && store.players[i].craftsmen[j][0] === index - Sw && store.players[i].craftsmen[j][1] === relevantTile) {
				if (!returnData) return store.players[i].craftsmen[j][0]
				return store.players[i].craftsmen[j]
			}
		}
	}
	alert("NO CM TILE FOUND")
}

// Used to pip craftsmen when placing pure resource
function getAllCraftsmanPrimaryIndexesWithinRangeOfZone(zone, range, resourceSq, returnData) {
	let craftsmanSquaresWanted = rf.getRelevantCraftsmenSqsFromResourceSq(resourceSq)
	let foundSquares = getAllSquaresOfTypesWithinRangeOfZone(zone, range, craftsmanSquaresWanted)

	// Now investigate each sq to find the primary sq
	let primaryIndexes = []
	let craftsmanData = []
	for (let i = 0; i < foundSquares.length; i++) {
		primaryIndexes.push(getCraftsmanDataFromAnySq(foundSquares[i], false))
		craftsmanData.push(getCraftsmanDataFromAnySq(foundSquares[i], true))
	}
	primaryIndexes = [...new Set(primaryIndexes)]

	// Filter for unique craftsmanData
	let temp = ""
	craftsmanData = craftsmanData.sort().filter((r) => {
		if (r.join("") !== temp) {
			temp = r.join("")
			return true
		}
	})
	if (returnData) return craftsmanData
	else return primaryIndexes
}

// Used to pip craftsmen when placing resource
export function getAllCraftsmanDataWithinRangeOfZoneAndOutOfRange(zone, range, resourceSq) {
	const store = useModelStore()

	let craftsmanData = getAllCraftsmanPrimaryIndexesWithinRangeOfZone(zone, range, resourceSq, true)
	let outOfRangeData = []
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].craftsmen.length; j++) {
			// Check we actually care about this craftsman
			if (rf.getRelevantCraftsmenSqsFromResourceSq(resourceSq).includes(rf.RES_TILE_TO_SQ[store.players[i].craftsmen[j][1]])) {
				// If the craftsman hasn't been found, it must be out of range
				if (!craftsmanData.some((r) => r.length == store.players[i].craftsmen[j].length && r.every((value, index) => store.players[i].craftsmen[j][index] == value))) outOfRangeData.push([...store.players[i].craftsmen[j]])
			}
		}
	}
	return [craftsmanData, outOfRangeData]
}

// Used to pip resources when placing craftsmen
export function getResourceRangeStatusForPlacingCraftsman(index, range, type, craftsmanTile, craftsmanTileRotation) {
	//const store = useModelStore()
	let Sw = getSw()

	// Firstly, find all indexes and all included resources
	let resoureSqsInRange = []
	if (rf.FOUR_SIZE_TILES.includes(craftsmanTile)) resoureSqsInRange = getAllSquaresOfTypesWithinRangeOfZone([index, index + 1, index + Sw, index + Sw + 1], range, [type])
	else if (craftsmanTileRotation === 0) resoureSqsInRange = getAllSquaresOfTypesWithinRangeOfZone([index, index + 1], range, [type])
	else resoureSqsInRange = getAllSquaresOfTypesWithinRangeOfZone([index, index + Sw], range, [type])

	// Now find the leftovers
	let allsquaresOfType = getAllSquaresOfSameType(type)
	let resourceSqsNotInRange = []
	for (let i = 0; i < allsquaresOfType.length; i++) {
		if (!resoureSqsInRange.includes(allsquaresOfType[i])) resourceSqsNotInRange.push(allsquaresOfType[i])
	}
	return [resoureSqsInRange, resourceSqsNotInRange]
}

export function getTakenResourceSquaresForCraftsman(craftsman, range) {
	const store = useModelStore()

	// Get all sqs within range of current craftsmen
	let allCraftsmanSquares = getAllSquaresOfSameType(rf.RES_TILE_TO_SQ[craftsman])
	let usedSquares = getAllSquaresWithinRangeOfZone(allCraftsmanSquares, range, false)

	// Now find all resources already covered by these craftsmen
	let takenResourcesSquares = []
	for (let i = 0; i < usedSquares.length; i++) if (rf.getPrimaryResourceSqs(craftsman).includes(store.coords[usedSquares[i]])) takenResourcesSquares.push(usedSquares[i])
	return takenResourcesSquares
}

// Also used to check resource availabilitu in first stage of placing sec craftsman
export function getAllowedIndexesToPlacePriCraftsman(craftsman, range, rotation) {
	const store = useModelStore()
	let takenResourcesSquares = getTakenResourceSquaresForCraftsman(craftsman, range)

	// Now find resource squares that are still available
	let allResourcesSquares = getAllSquaresOfSameType(rf.getPrimaryResourceSqs(craftsman)[0])
	// FIX OGUN
	if (craftsman === rf.BLACKSMITH_TILE) allResourcesSquares = getAllSquaresOfSameType(rf.WOOD_SQ).concat(getAllSquaresOfSameType(rf.CLAY_SQ)).concat(getAllSquaresOfSameType(rf.IVORY_SQ))
	let availableResourcesSquares = []
	console.log(`allResourcesSquares: ${allResourcesSquares}   // takenResourcesSquares: ${takenResourcesSquares}`)
	for (let i = 0; i < allResourcesSquares.length; i++) if (!takenResourcesSquares.includes(allResourcesSquares[i])) availableResourcesSquares.push(allResourcesSquares[i])
	console.log(`availableResourcesSquares: ${availableResourcesSquares}`)
	// Now find sqaures within range of available resources
	let withinRangeSquares = []
	if (craftsman !== rf.BLACKSMITH_TILE) withinRangeSquares = getAllSquaresWithinRangeOfZone(availableResourcesSquares, range, false)
	else if (craftsman === rf.BLACKSMITH_TILE) {
		let woodSqs = []
		let claySqs = []
		let ivorySqs = []
		for (let i = 0; i < availableResourcesSquares.length; i++) {
			if (store.coords[availableResourcesSquares[i]] === rf.WOOD_SQ) woodSqs.push(availableResourcesSquares[i])
			else if (store.coords[availableResourcesSquares[i]] === rf.CLAY_SQ) claySqs.push(availableResourcesSquares[i])
			else if (store.coords[availableResourcesSquares[i]] === rf.IVORY_SQ) ivorySqs.push(availableResourcesSquares[i])
		}
		//let withinRangeSquaresWOOD = getAllSquaresWithinRangeOfZone(getAllSquaresOfSameType(rf.WOOD_SQ), range, false)
		//let withinRangeSquaresCLAY = getAllSquaresWithinRangeOfZone(getAllSquaresOfSameType(rf.CLAY_SQ), range, false)
		//let withinRangeSquaresIVORY = getAllSquaresWithinRangeOfZone(getAllSquaresOfSameType(rf.IVORY_SQ), range, false)
		let withinRangeSquaresWOOD = getAllSquaresWithinRangeOfZone(woodSqs, range, false)
		let withinRangeSquaresCLAY = getAllSquaresWithinRangeOfZone(claySqs, range, false)
		let withinRangeSquaresIVORY = getAllSquaresWithinRangeOfZone(ivorySqs, range, false)
		for (let i = 0; i < withinRangeSquaresWOOD.length; i++) {
			if (withinRangeSquaresCLAY.includes(withinRangeSquaresWOOD[i])) withinRangeSquares.push(withinRangeSquaresWOOD[i])
			else if (withinRangeSquaresIVORY.includes(withinRangeSquaresWOOD[i])) withinRangeSquares.push(withinRangeSquaresWOOD[i])
		}
		for (let i = 0; i < withinRangeSquaresCLAY.length; i++) {
			if (withinRangeSquaresWOOD.includes(withinRangeSquaresCLAY[i])) withinRangeSquares.push(withinRangeSquaresCLAY[i])
			if (withinRangeSquaresIVORY.includes(withinRangeSquaresCLAY[i])) withinRangeSquares.push(withinRangeSquaresCLAY[i])
		}
		// Now uniq
		withinRangeSquares = [...new Set(withinRangeSquares)]
	}
	// Now we have within range squares of free resource. Need to check empty
	for (let i = withinRangeSquares.length - 1; i >= 0; i--) if (store.coords[withinRangeSquares[i]] !== rf.EMPTY_SQ) withinRangeSquares.splice(i, 1)

	// Now all squares are empty, need to check it can fit, and that it doesn't go onto any forbidden squares
	let Sw = getSw()

	let tileWidth = 1
	let tileheight = 1
	if (rf.FOUR_SIZE_TILES.includes(craftsman) || rotation === 0) tileWidth = 2
	if (rf.FOUR_SIZE_TILES.includes(craftsman) || rotation === 1) tileheight = 2
	/*if (craftsman === rf.BLACKSMITH_TILE) {
		tileWidth = 3
		tileheight = 3
	}*/
	// So just check everything! This is because a within range square might not be at top left of tile
	let validSquares = []
	for (let i = 0; i < store.coords.length; i++) {
		// Check every index to see if it can fit
		if (spaceAvailable(i, tileWidth, tileheight, false)) {
			// now there's space, make sure at least one square is in withinRangeSquares
			let goodSqFound = false
			for (let j = 0; j < tileWidth; j++) {
				for (let k = 0; k < tileheight; k++) {
					if (withinRangeSquares.includes(i + j + Sw * k)) {
						goodSqFound = true
						break
					}
				}
				if (goodSqFound) break
			}
			if (goodSqFound) validSquares.push(i)
		}
	}
	return [validSquares, availableResourcesSquares, takenResourcesSquares]
}

// NB this doesn't extend using hubs, it just finds the hubs
export function getAllSquaresAndHubsWithinRangeOfZone(zone, range) {
	const store = useModelStore()

	let res = [...zone]
	let toExplo = [...zone]
	let alreadyFound_flat = [...zone]
	let foundHubs = []
	let remainingRange = range
	while (remainingRange > 0) {
		let thisRange = []
		for (let i = 0; i < toExplo.length; i++) {
			let neighbours = getNeighbours(toExplo[i], true)
			// For each neighbout, check it isn't already in the array
			for (let j = 0; j < neighbours.length; j++) {
				if (!alreadyFound_flat.includes(neighbours[j])) thisRange.push(neighbours[j])
			}
		}

		// Now have all unique squares at thisRange, so expand for water
		let validWaterSqs = [rf.WATER_SQ]
		//if (controller.currentPlayerObj().god[0] === rf.OLOKUN) validWaterSqs = validWaterSqs.concat(rf.CRAFTSMEN_SQS).concat(rf.RESOURCE_SQS)
		let waterSqs = []
		for (let j = 0; j < thisRange.length; j++) {
			if (validWaterSqs.includes(store.coords[thisRange[j]]) && !waterSqs.includes(thisRange[j])) waterSqs = waterSqs.concat(expandWater(thisRange[j]))
		}
		// Expand for Simbi
		if (controller.currentPlayerObj().god[0] === rf.SIMBI) {
			let simbiSqs = []
			for (let j = 0; j < thisRange.length; j++) {
				if (rf.VALID_SIMBI_SQS.includes(store.coords[thisRange[j]]) && !simbiSqs.includes(thisRange[j])) simbiSqs = simbiSqs.concat(expandArryaOfSqs(thisRange[j], rf.VALID_SIMBI_SQS))
			}
			thisRange = thisRange.concat(simbiSqs)
		}
		// Add in the water
		thisRange = thisRange.concat(waterSqs)
		thisRange = [...new Set(thisRange)]

		alreadyFound_flat = alreadyFound_flat.concat(thisRange)
		// Hubs block, but can be used to extend. So remove them from possible ecplores and save
		for (let i = thisRange.length - 1; i >= 0; i--) {
			if (isAhub(thisRange[i])) {
				foundHubs.push(thisRange[i])
				thisRange.splice(i, 1)
			}
		}
		toExplo = [...thisRange]
		res = res.concat(thisRange)
		remainingRange--
	}

	res = res.concat(foundHubs)

	// NB res INCLUDES hubs within range
	return [res, foundHubs]
}

export function getAllSquaresAndHubsWithinRangeOfZoneWithoutWater(zone, range) {
	const store = useModelStore()

	let res = [...zone]
	let toExplo = [...zone]
	let alreadyFound_flat = [...zone]
	let foundHubs = []
	let remainingRange = range
	while (remainingRange > 0) {
		let thisRange = []
		for (let i = 0; i < toExplo.length; i++) {
			let neighbours = getNeighbours(toExplo[i], true, true)
			// For each neighbout, check it isn't already in the array
			for (let j = 0; j < neighbours.length; j++) {
				if (!alreadyFound_flat.includes(neighbours[j])) thisRange.push(neighbours[j])
			}
		}

		// Now have all unique squares at thisRange, so expand for water
		let waterSqs = []
		// ASSUME WITHOUT PROPER WATER ONLY
		for (let j = 0; j < thisRange.length; j++) {
			if (store.coords[thisRange[j]] === rf.WATER_SQ && !waterSqs.includes(thisRange[j])) waterSqs = waterSqs.concat(expandWater(thisRange[j]))
		}
		// Expand for Simbi
		if (controller.currentPlayerObj().god[0] === rf.SIMBI) {
			let simbiSqs = []
			for (let j = 0; j < thisRange.length; j++) {
				if (rf.VALID_SIMBI_SQS.includes(store.coords[thisRange[j]]) && !simbiSqs.includes(thisRange[j])) simbiSqs = simbiSqs.concat(expandArryaOfSqs(thisRange[j], rf.VALID_SIMBI_SQS))
			}
			thisRange = thisRange.concat(simbiSqs)
		}
		// Add in the water
		thisRange = thisRange.concat(waterSqs)
		thisRange = [...new Set(thisRange)]

		alreadyFound_flat = alreadyFound_flat.concat(thisRange)
		// Hubs block, but can be used to extend. So remove them from possible ecplores and save
		for (let i = thisRange.length - 1; i >= 0; i--) {
			if (isAhub(thisRange[i])) {
				foundHubs.push(thisRange[i])
				thisRange.splice(i, 1)
			}
		}
		toExplo = [...thisRange]
		res = res.concat(thisRange)
		remainingRange--
	}

	res = res.concat(foundHubs)

	// NB res INCLUDES hubs within range
	return [res, foundHubs]
}

export function getAllOrAnySquaresWithinRangeOfZoneUsingHubs(zone, range, requiredSq /*returnHubsUsedArray*/) {
	const store = useModelStore()

	// Start with one expansion
	let toExplo = [...zone]
	let res = [] // "zone" will be found naturally by exploring and added to zero hub range
	let foundHubs = []
	let foundSquares_flat = []
	while (toExplo.length > 0) {
		let newData = getAllSquaresAndHubsWithinRangeOfZone([...toExplo], range)
		let newSquares = newData[0]

		let newHubs = newData[1]
		// remove squares found at previous levels
		for (let i = newSquares.length - 1; i >= 0; i--) {
			if (requiredSq > 0 && store.coords[newSquares[i]] === requiredSq) return true
			if (foundSquares_flat.includes(newSquares[i])) newSquares.splice(i, 1)
		}
		// remove hubs found already
		for (let i = newHubs.length - 1; i >= 0; i--) {
			if (foundHubs.includes(newHubs[i])) newHubs.splice(i, 1)
		}
		toExplo = [...newHubs]
		foundHubs = foundHubs.concat(newHubs)
		foundSquares_flat = foundSquares_flat.concat(newSquares)
		res.push([...newSquares])
	}

	// Array with the number of hubs used at each index
	// hence res[0] means using ZERO HUBS
	if (requiredSq > 0) return false
	return res
}

export function getAllOrAnySquaresWithinRangeOfZoneUsingHubsWithoutWater(zone, range, requiredSq /*returnHubsUsedArray*/) {
	const store = useModelStore()

	// Start with one expansion
	let toExplo = [...zone]
	let res = [] // "zone" will be found naturally by exploring and added to zero hub range
	let foundHubs = []
	let foundSquares_flat = []
	while (toExplo.length > 0) {
		let newData = getAllSquaresAndHubsWithinRangeOfZoneWithoutWater([...toExplo], range)
		let newSquares = newData[0]

		let newHubs = newData[1]
		// remove squares found at previous levels
		for (let i = newSquares.length - 1; i >= 0; i--) {
			if (requiredSq > 0 && store.coords[newSquares[i]] === requiredSq) return true
			if (foundSquares_flat.includes(newSquares[i])) newSquares.splice(i, 1)
		}
		// remove hubs found already
		for (let i = newHubs.length - 1; i >= 0; i--) {
			if (foundHubs.includes(newHubs[i])) newHubs.splice(i, 1)
		}
		toExplo = [...newHubs]
		foundHubs = foundHubs.concat(newHubs)
		foundSquares_flat = foundSquares_flat.concat(newSquares)
		res.push([...newSquares])
	}

	// Array with the number of hubs used at each index
	// hence res[0] means using ZERO HUBS
	if (requiredSq > 0) return false
	return res
}

export function getAllowedIndexesToPlaceSecCraftsman(craftsman, range, rotation) {
	let primarySort = getAllowedIndexesToPlacePriCraftsman(craftsman, range, rotation)
	let inUniqueResouceRange = primarySort[0] // Space available check already done here
	let availableResourcesSquares = primarySort[1]
	let takenResourcesSquares = primarySort[2]

	// Now we have all squares within range of a resource
	// We KNOW the tile has to fit already
	// So need to also ensure ANY SQ is within HUB range of a primary
	let validSquares = []

	let inPriCraftsmanRangeWithHubs = getAllOrAnySquaresWithinRangeOfZoneUsingHubs(getAllSquaresOfSameType(rf.getPrimaryCraftsmanSqfromSecCraftsman(craftsman)), range, -9)

	let inPriCraftsmanRangeWithHubs_flat = []
	for (let i = 0; i < inPriCraftsmanRangeWithHubs.length; i++) {
		inPriCraftsmanRangeWithHubs_flat = inPriCraftsmanRangeWithHubs_flat.concat(inPriCraftsmanRangeWithHubs[i])
	}

	let Sw = getSw()

	for (let i = 0; i < inUniqueResouceRange.length; i++) {
		if (inPriCraftsmanRangeWithHubs_flat.includes(inUniqueResouceRange[i])) validSquares.push(inUniqueResouceRange[i])
		else if ((rf.FOUR_SIZE_TILES.includes(craftsman) || rotation === 0) && inPriCraftsmanRangeWithHubs_flat.includes(inUniqueResouceRange[i] + 1)) validSquares.push(inUniqueResouceRange[i])
		else if ((rf.FOUR_SIZE_TILES.includes(craftsman) || rotation === 1) && inPriCraftsmanRangeWithHubs_flat.includes(inUniqueResouceRange[i] + Sw)) validSquares.push(inUniqueResouceRange[i])
		else if (rf.FOUR_SIZE_TILES.includes(craftsman) && inPriCraftsmanRangeWithHubs_flat.includes(inUniqueResouceRange[i] + 1 + Sw)) validSquares.push(inUniqueResouceRange[i])
	}

	// return [1] and [2] only used in concat when setting up sec craftsman
	return [validSquares, availableResourcesSquares, takenResourcesSquares]
}

export function getAllUndepletedResourceSquaresToHighlight(craftsmanData, range, excludeArr) {
	const store = useModelStore()
	const toFindDuplicates = (arry) => arry.filter((item, index) => arry.indexOf(item) !== index)

	const duplicateElements = toFindDuplicates(store.depletedResources)

	// Get ALL resources in range
	let allRes = getAllSquaresOfTypesWithinRangeOfZone(getCraftsmanZoneFromData(craftsmanData), range, [rf.getPrimaryResourceSqs(craftsmanData[1])[0]])

	if (craftsmanData[1] === rf.BLACKSMITH_TILE) {
		allRes = getAllSquaresOfTypesWithinRangeOfZone(getCraftsmanZoneFromData(craftsmanData), range, [rf.WOOD_SQ, rf.CLAY_SQ, rf.IVORY_SQ])
		// remove the used blacksmith res
		if (excludeArr.length > 0) {
			for (let i = allRes.length - 1; i >= 0; i--) {
				if (excludeArr.includes(store.coords[allRes[i]])) allRes.splice(i, 1)
			}
		}
	}

	if (controller.currentPlayerObj().god[0] === rf.AGWU_NSI) {
		allRes = getAllSquaresOfTypesWithinRangeOfZone(getCraftsmanZoneFromData(craftsmanData), range, [rf.WOOD_SQ, rf.CLAY_SQ, rf.IVORY_SQ, rf.DIAMOND_SQ])
	}

	for (let i = allRes.length - 1; i >= 0; i--) {
		if (controller.currentPlayerObj().god[0] !== rf.ATETE && store.depletedResources.includes(allRes[i])) allRes.splice(i, 1)
		else if (controller.currentPlayerObj().god[0] === rf.ATETE && duplicateElements.includes(allRes[i])) allRes.splice(i, 1)
	}
	return allRes
}

export function getAllUndepletedResourceSquaresToHighlightWithoutWater(craftsmanData, range, excludeArr) {
	const store = useModelStore()
	const toFindDuplicates = (arry) => arry.filter((item, index) => arry.indexOf(item) !== index)

	const duplicateElements = toFindDuplicates(store.depletedResources)

	// Get ALL resources in range
	let allRes = getAllSquaresOfTypesWithinRangeOfZoneWithoutWater(getCraftsmanZoneFromData(craftsmanData), range, [rf.getPrimaryResourceSqs(craftsmanData[1])[0]])
	// FIX OGUN
	if (craftsmanData[1] === rf.BLACKSMITH_TILE) allRes = getAllSquaresOfTypesWithinRangeOfZoneWithoutWater(getCraftsmanZoneFromData(craftsmanData), range, [rf.WOOD_SQ, rf.CLAY_SQ, rf.IVORY_SQ])
	if (controller.currentPlayerObj().god[0] === rf.AGWU_NSI) {
		allRes = getAllSquaresOfTypesWithinRangeOfZoneWithoutWater(getCraftsmanZoneFromData(craftsmanData), range, [rf.WOOD_SQ, rf.CLAY_SQ, rf.IVORY_SQ, rf.DIAMOND_SQ])
	}

	for (let i = allRes.length - 1; i >= 0; i--) {
		if (controller.currentPlayerObj().god[0] !== rf.ATETE && store.depletedResources.includes(allRes[i])) allRes.splice(i, 1)
		else if (controller.currentPlayerObj().god[0] === rf.ATETE && duplicateElements.includes(allRes[i])) allRes.splice(i, 1)
	}
	return allRes
}

// Get all craftsmen within hub range of monument OR sec craftsman
export function getPossibleCraftsmenWithRangeToRaiseMonument(zone, range) {
	const store = useModelStore()

	let allowedSqs = model.getAllowedSqsForMonRaise()

	// Find all reachable sqs
	let allsqs = getAllOrAnySquaresWithinRangeOfZoneUsingHubs(zone, range, -9)

	let possibleCraftsmen = []
	let craftsmanIndexes = []
	let ranges = []
	for (let i = 0; i < allsqs.length; i++) {
		for (let j = 0; j < allsqs[i].length; j++) {
			if (allowedSqs.includes(store.coords[allsqs[i][j]])) {
				craftsmanIndexes.push(getCraftsmanDataFromAnySq(allsqs[i][j], false))
				ranges.push(i)
			}
		}
	}

	// NEED TO UNIQUE, otherwise a double square gives 2x pri index // But doesn't affect ranges :/
	let craftsmanIndexesUnique = []
	let rangesUnique = []

	for (let i = 0; i < craftsmanIndexes.length; i++) {
		if (!craftsmanIndexesUnique.includes(craftsmanIndexes[i])) {
			craftsmanIndexesUnique.push(craftsmanIndexes[i])
			rangesUnique.push(ranges[i])
		}
	}
	possibleCraftsmen = [craftsmanIndexesUnique, rangesUnique]
	return possibleCraftsmen
}

export function getPossibleCraftsmenWithRangeToRaiseMonumentWithoutWater(zone, range) {
	const store = useModelStore()

	let allowedSqs = model.getAllowedSqsForMonRaise()

	// Find all reachable sqs
	let allsqs = getAllOrAnySquaresWithinRangeOfZoneUsingHubsWithoutWater(zone, range, -9)

	let possibleCraftsmen = []
	let craftsmanIndexes = []
	let ranges = []
	for (let i = 0; i < allsqs.length; i++) {
		for (let j = 0; j < allsqs[i].length; j++) {
			if (allowedSqs.includes(store.coords[allsqs[i][j]])) {
				craftsmanIndexes.push(getCraftsmanDataFromAnySq(allsqs[i][j], false))
				ranges.push(i)
			}
		}
	}

	// NEED TO UNIQUE, otherwise a double square gives 2x pri index // But doesn't affect ranges :/
	let craftsmanIndexesUnique = []
	let rangesUnique = []

	for (let i = 0; i < craftsmanIndexes.length; i++) {
		if (!craftsmanIndexesUnique.includes(craftsmanIndexes[i])) {
			craftsmanIndexesUnique.push(craftsmanIndexes[i])
			rangesUnique.push(ranges[i])
		}
	}
	possibleCraftsmen = [craftsmanIndexesUnique, rangesUnique]
	return possibleCraftsmen
}

// Find a vlid path from a zone to another zone using hubs
/*export function findValidPathFromZoneToZone(zoneFrom, ZoneTo, range) {
  // We KNOW that the zones are within hub range, as that has already been verified

}*/

export function prettyPrint() {
	const store = useModelStore()

	let Sw = 18
	if (store.mapTiles.length === 8) Sw = 12

	var str = ""
	for (var i = 0; i < store.coords.length; i++) {
		if (i % Sw == 0) str += "\n"

		switch (store.coords[i]) {
			case rf.OOB_SQ:
				str += "X "
				break
			case rf.EMPTY_SQ:
				str += ". "
				break
			case rf.WATER_SQ:
				str += "~~"
				break
			case rf.START_SQ:
				str += "St"
				break

			case rf.WOOD_SQ:
				str += "Wp"
				break
			case rf.CLAY_SQ:
				str += "Cp"
				break
			case rf.IVORY_SQ:
				str += "Ip"
				break
			case rf.DIAMOND_SQ:
				str += "Dp"
				break

			case rf.WOOD_CARVER_SQ:
				str += "WC"
				break
			case rf.POTTER_SQ:
				str += "PT"
				break
			case rf.IVORY_CARVER_SQ:
				str += "IC"
				break
			case rf.DIAMOND_CUTTER_SQ:
				str += "DC"
				break

			case rf.SCULPTOR_SQ:
				str += "SC"
				break
			case rf.VESSEL_MAKER_SQ:
				str += "VM"
				break
			case rf.THRONE_MAKER_SQ:
				str += "TM"
				break
			case rf.BLACKSMITH_SQ:
				str += "Bs"
				break

			case 51:
				str += "51"
				break
			case 52:
				str += "52"
				break
			case 53:
				str += "53"
				break
			case 54:
				str += "54"
				break
			case 55:
				str += "55"
				break
			case 61:
				str += "61"
				break
			case 62:
				str += "62"
				break
			case 63:
				str += "63"
				break
			case 64:
				str += "64"
				break
			case 65:
				str += "65"
				break
			case 71:
				str += "71"
				break
			case 72:
				str += "72"
				break
			case 73:
				str += "73"
				break
			case 74:
				str += "74"
				break
			case 75:
				str += "75"
				break
			case 81:
				str += "81"
				break
			case 82:
				str += "82"
				break
			case 83:
				str += "83"
				break
			case 84:
				str += "84"
				break
			case 85:
				str += "85"
				break
			case 91:
				str += "91"
				break
			case 92:
				str += "92"
				break
			case 93:
				str += "93"
				break
			case 94:
				str += "94"
				break
			case 95:
				str += "95"
				break
			default:
				str += "?"
		}
	}
	return str
}
