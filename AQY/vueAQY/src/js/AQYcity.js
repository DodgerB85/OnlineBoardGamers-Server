/**
 * This does any calculations for the City screen
 *
 */

import * as rf from "./AQYreference.js"
import * as model from "./AQYmodel.js"
import * as map from "./AQYmap.js"
import * as country from "./AQYcountry.js"
import * as Bot from "./AQYbot.js"

import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal.js"

export function createFirstCity(playerIndex, hex) {
	createNewCity_core(playerIndex, hex)
	model.addHistory(rf.HIST_FIRST_CITY, playerIndex, 0, [map.getIDfromHex(hex)])
}

export function createNewCity_core(playerIndex, hex) {
	const store = useModelStore()

	let size = 7
	if (store.players[playerIndex].cities.length > 0) size = 6

	let newCity = {
		size: size,
		coords: new Array(size * size).fill(rf.BLDG_NONE_SQ),
		buildings: [], //[type, rotation, index, manned]
		graves: [], // simple array of indexes
		hex: hex, // QRS coords of the city
	}
	store.players[playerIndex].cities.push(newCity)

	let hexID = map.getIDfromHex(hex)
	country.removeExplorerFromHexID(hexID)
	let neigbourIDs = store.mapNeighbours[hexID]
	for (let i = 0; i < neigbourIDs.length; i++) country.removeExplorerFromHexID(neigbourIDs[i])
}

export function payAndCreateNewCity(playerIndex, hex, costArr) {
	const store = useModelStore()

	payAndCreateNewCity_core(playerIndex, hex, costArr)
	model.addHistory(rf.HIST_NEW_CITY, playerIndex, 0, [map.getIDfromHex(hex), [...costArr]])
	country.updateZOCdisplayData()
	store.clearVars()
	// Update country build data
	model.updateCountryBuildCalclation(playerIndex, true)
	// Add an undo point
	model.createUndoPoint()
}

export function payAndCreateNewCity_core(playerIndex, hex, costArr) {
	const store = useModelStore()
	let resources = store.players[playerIndex].availableResources
	resources[rf.RES_WOOD]--
	resources[rf.RES_STONE]--
	resources[costArr[0]]--
	resources[costArr[1]]--
	resources[costArr[2]]--

	// Remove explorers - NOTE THIS IS A BIT POINTLESS. But why not.
	let hexID = map.getIDfromHex(hex)
	country.removeExplorerFromHexID(hexID)
	let neigbourIDs = store.mapNeighbours[hexID]

	for (let i = 0; i < neigbourIDs.length; i++) country.removeExplorerFromHexID(neigbourIDs[i])

	// Use cart shop
	country.useCartShop_core(playerIndex, rf.COUNTRYSIDE_BLDG_CITY)

	// Create new city
	createNewCity_core(playerIndex, hex)
}

export function cancelButton() {
	const store = useModelStore()

	store.clearVars()
}

export function allRise() {
	const store = useModelStore()

	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].cities.length; j++) {
			for (let k = 0; k < store.players[i].cities[j].buildings.length; k++) {
				if (store.players[i].cities[j].buildings[k].manned) {
					store.players[i].cities[j].buildings[k].manned = false
					store.players[i].availableMen++
				}
			}
		}
	}
}

export function getAllFreeCitySquaresToHighlight(playerIndex, returnAnyFree) {
	const store = useModelStore()
	const personal = usePersonalStore()

	// Stop if you can't play in the city
	if (!personal.canPlayInCity(playerIndex)) return

	store.context.cityIndexesToHighlightClick.splice(0)
	for (let i = 0; i < store.players[playerIndex].cities.length; i++) {
		let tempArr = []
		for (let j = 0; j < store.players[playerIndex].cities[i].coords.length; j++) {
			if (store.players[playerIndex].cities[i].coords[j] === rf.BLDG_NONE_SQ) {
				tempArr.push(j)
				if (returnAnyFree) return true
			}
		}
		if (!returnAnyFree) store.context.cityIndexesToHighlightClick.push([...tempArr])
	}
	if (returnAnyFree) return false
}

export function autoSelectResources(playerIndex, building, cost) {
	const store = useModelStore()

	const resFoodRef = [rf.RES_GRAIN, rf.RES_SHEEP, rf.RES_OLIVES, rf.RES_FISH]
	const resLuxRef = [rf.RES_GOLD, rf.RES_WINE, rf.RES_PEARLS, rf.RES_DYE]

	let availableResources = store.players[playerIndex].availableResources

	if (store.sandboxMode) availableResources = [99, 99, 99, 99, 99, 99, 99, 99, 99, 99]

	// SINGLE LUX
	if (building === rf.BLDG_FOUNTAIN || building === rf.BLDG_HOSPITAL) {
		// Gold
		if (availableResources[rf.RES_WINE] + availableResources[rf.RES_PEARLS] + availableResources[rf.RES_DYE] === 0) return [rf.RES_GOLD]
		// Wine
		else if (availableResources[rf.RES_GOLD] + availableResources[rf.RES_PEARLS] + availableResources[rf.RES_DYE] === 0) return [rf.RES_WINE]
		// PEARLS
		else if (availableResources[rf.RES_WINE] + availableResources[rf.RES_GOLD] + availableResources[rf.RES_DYE] === 0) return [rf.RES_PEARLS]
		// DYE
		else if (availableResources[rf.RES_WINE] + availableResources[rf.RES_PEARLS] + availableResources[rf.RES_GOLD] === 0) return [rf.RES_DYE]
		return [-1]
	}
	// STABLES
	else if (building === rf.BLDG_STABLE) {
		let workingPhil = hasWorkingUniqueBuilding(playerIndex, rf.BLDG_PHILOSOPHY)
		let relevantRes = [availableResources[rf.RES_GOLD], availableResources[rf.RES_WINE], availableResources[rf.RES_PEARLS], availableResources[rf.RES_DYE]]
		const resSum = relevantRes.reduce((acc, curr) => acc + curr, 0)
		const nonZeroResCount = relevantRes.filter((value) => value > 0).length

		// Can't afford if less than 2 res
		if (resSum < 2) return [-2]
		// Can't afford if no phil and no 2D
		if (!workingPhil && nonZeroResCount < 2) return [-2]

		// Fac Phil, 1 type of Lux, just use that
		if (workingPhil && nonZeroResCount === 1) {
			let nonZeroIndex = relevantRes.findIndex((value) => value !== 0)
			if (nonZeroIndex === 0) return [rf.RES_GOLD, rf.RES_GOLD]
			else if (nonZeroIndex === 1) return [rf.RES_WINE, rf.RES_WINE]
			else if (nonZeroIndex === 2) return [rf.RES_PEARLS, rf.RES_PEARLS]
			else if (nonZeroIndex === 3) return [rf.RES_DYE, rf.RES_DYE]
		}
		// No Fac Phil, but only 2 diff Lux
		else if (!workingPhil && nonZeroResCount === 2) {
			let res = []
			for (let i = 0; i < relevantRes.length; i++) {
				if (relevantRes[i] !== 0) res.push(resLuxRef[i])
			}
			return res
		}
		// Cannot auto select
		return [-1]
	}
	// HOUSES
	let res = []
	let workingPhil = hasWorkingUniqueBuilding(playerIndex, rf.BLDG_PHILOSOPHY)
	let relevantFoodRes = [availableResources[rf.RES_GRAIN], availableResources[rf.RES_SHEEP], availableResources[rf.RES_OLIVES], availableResources[rf.RES_FISH]]
	let relevantLuxRes = [availableResources[rf.RES_GOLD], availableResources[rf.RES_WINE], availableResources[rf.RES_PEARLS], availableResources[rf.RES_DYE]]
	const foodResSum = relevantFoodRes.reduce((acc, curr) => acc + curr, 0)
	const luxResSum = relevantLuxRes.reduce((acc, curr) => acc + curr, 0)
	const nonZeroFoodResCount = relevantFoodRes.filter((value) => value > 0).length
	const nonZeroLuxResCount = relevantLuxRes.filter((value) => value > 0).length
	let canPickFood = true
	let canPickLux = true

	// FOOD
	if (cost[0] > 0) {
		// no Food, cannot afford
		if (foodResSum === 0) return [-2]
		// Single Food
		if (cost[0] === 1) {
			// GRAIN
			if (availableResources[rf.RES_SHEEP] + availableResources[rf.RES_OLIVES] + availableResources[rf.RES_FISH] === 0) res.push(rf.RES_GRAIN)
			// sheep
			else if (availableResources[rf.RES_GRAIN] + availableResources[rf.RES_OLIVES] + availableResources[rf.RES_FISH] === 0) res.push(rf.RES_SHEEP)
			// olive
			else if (availableResources[rf.RES_GRAIN] + availableResources[rf.RES_SHEEP] + availableResources[rf.RES_FISH] === 0) res.push(rf.RES_OLIVES)
			// fish
			else if (availableResources[rf.RES_GRAIN] + availableResources[rf.RES_SHEEP] + availableResources[rf.RES_OLIVES] === 0) res.push(rf.RES_FISH)
			// Otherwise, need to select due food
			else canPickFood = false
		} else if (cost[0] > 1) {
			// More than 1 food
			// Can't afford if less than 2 res
			if (foodResSum < cost[0]) return [-2]
			// Can't afford if no phil and no 2D
			if (!workingPhil && nonZeroFoodResCount < cost[0]) return [-2]

			// Fac Phil, 1 type of Food, just use that
			if (workingPhil && nonZeroFoodResCount === 1) {
				let nonZeroIndex = relevantFoodRes.findIndex((value) => value !== 0)
				if (nonZeroIndex === 0) for (let i = 0; i < cost[0]; i++) res.push(rf.RES_GRAIN)
				else if (nonZeroIndex === 1) for (let i = 0; i < cost[0]; i++) res.push(rf.RES_SHEEP)
				else if (nonZeroIndex === 2) for (let i = 0; i < cost[0]; i++) res.push(rf.RES_OLIVES)
				else if (nonZeroIndex === 3) for (let i = 0; i < cost[0]; i++) res.push(rf.RES_FISH)
			}
			// No Fac Phil, but only X diff Foof
			else if (!workingPhil && nonZeroFoodResCount === cost[0]) {
				for (let i = 0; i < relevantFoodRes.length; i++) {
					if (relevantFoodRes[i] !== 0) res.push(resFoodRef[i])
				}
			}

			// Fac Phil, and EXACT resources, just add all
			else if (workingPhil && foodResSum === cost[0]) {
				for (let i = 0; i < relevantFoodRes.length; i++) {
					for (let j = 0; j < relevantFoodRes[i]; j++) res.push(resFoodRef[i])
				}
			}

			// Else Cannot auto select
			else canPickFood = false
		}
	}

	// LUX
	if (cost[1] > 0) {
		// no Lux, cannot afford
		if (luxResSum === 0) return [-2]
		// Single Lux
		if (cost[1] === 1) {
			// Gold
			if (availableResources[rf.RES_WINE] + availableResources[rf.RES_PEARLS] + availableResources[rf.RES_DYE] === 0) res.push(rf.RES_GOLD)
			// Wine
			else if (availableResources[rf.RES_GOLD] + availableResources[rf.RES_PEARLS] + availableResources[rf.RES_DYE] === 0) res.push(rf.RES_WINE)
			// PEARLS
			else if (availableResources[rf.RES_WINE] + availableResources[rf.RES_GOLD] + availableResources[rf.RES_DYE] === 0) res.push(rf.RES_PEARLS)
			// DYE
			else if (availableResources[rf.RES_WINE] + availableResources[rf.RES_PEARLS] + availableResources[rf.RES_GOLD] === 0) res.push(rf.RES_DYE)
			// Else cannot auto-select
			else canPickLux = false
		} else if (cost[1] > 1) {
			// More than 1 lux
			// Can't afford if less than 2 res
			if (luxResSum < cost[1]) return [-2]
			// Can't afford if no phil and no 2D
			if (!workingPhil && nonZeroLuxResCount < cost[1]) return [-2]

			// Fac Phil, 1 type of Lux, just use that
			if (workingPhil && nonZeroLuxResCount === 1) {
				let nonZeroIndex = relevantLuxRes.findIndex((value) => value !== 0)
				if (nonZeroIndex === 0) for (let i = 0; i < cost[1]; i++) res.push(rf.RES_GOLD)
				else if (nonZeroIndex === 1) for (let i = 0; i < cost[1]; i++) res.push(rf.RES_WINE)
				else if (nonZeroIndex === 2) for (let i = 0; i < cost[1]; i++) res.push(rf.RES_PEARLS)
				else if (nonZeroIndex === 3) for (let i = 0; i < cost[1]; i++) res.push(rf.RES_DYE)
			}
			// No Fac Phil, but only X diff Lux
			else if (!workingPhil && nonZeroLuxResCount === cost[1]) {
				for (let i = 0; i < relevantLuxRes.length; i++) {
					if (relevantLuxRes[i] !== 0) res.push(resLuxRef[i])
				}
			}
			// Fac Phil, and EXACT resources, just add all
			else if (workingPhil && luxResSum === cost[1]) {
				for (let i = 0; i < relevantLuxRes.length; i++) {
					for (let j = 0; j < relevantLuxRes[i]; j++) res.push(resLuxRef[i])
				}
			}

			// Else Cannot auto select
			else canPickLux = false
		}
	}
	if (!canPickFood || !canPickLux) return [-1]
	return res
}

export function manAllBuildings(playerIndex) {
	const store = useModelStore()

	let mannedHospital = manAllBuildings_core(playerIndex)
	if (mannedHospital) {
		//store.context.action = rf.ACT_HOSPITAL_GRAVES
		store.context.gravesLeftToRemove = 5
	}
	model.createUndoPoint()
	country.updateZOCdisplayData()
}

export function manAllBuildings_core(playerIndex) {
	// THIS ASSUMES THE AVAILABLE MEN IS ALREADY ENOUGH
	const store = useModelStore()

	let mannedHospital = false
	let player = store.players[playerIndex]
	for (let i = 0; i < player.cities.length; i++) {
		for (let j = 0; j < player.cities[i].buildings.length; j++) {
			if (rf.MANNABLE_BUILDINGS.includes(player.cities[i].buildings[j].bldgNum) && player.cities[i].buildings[j].manned === false) {
				if (canManBuilding(playerIndex, i, player.cities[i].buildings[j])) {
					player.cities[i].buildings[j].manned = true
					player.availableMen--
					if (player.cities[i].buildings[j].bldgNum === rf.BLDG_HOSPITAL) mannedHospital = true
				}
			}
		}
	}
	return mannedHospital
}

export function unManBuilding_core(playerIndex, bldg) {
	const store = useModelStore()
	bldg.manned = false
	store.players[playerIndex].availableMen++
}

export function startGravePlacement(playerIndex) {
	const store = useModelStore()

	store.context.cityIndexesToHighlightClick.splice(0)
	store.context.cityBuildingToDisplay = 19
	store.context.cityBuildingBeingAdded = rf.BLDG_GRAVE
	store.context.cityBuildingToDisplayData = rf.BLDG_DATA["BLDG_GRAVE"]

	const spots = getAllGraveCitySquaresToHighlight(playerIndex)

	store.context.cityIndexesToHighlightClick = [...spots]
	//return spots
}

export function getAllGraveCitySquaresToHighlight(playerIndex) {
	const store = useModelStore()

	let res = []

	for (let i = 0; i < store.players[playerIndex].cities.length; i++) {
		let tempArr = []
		for (let j = 0; j < store.players[playerIndex].cities[i].coords.length; j++) {
			if (store.players[playerIndex].cities[i].coords[j] === rf.BLDG_NONE_SQ) tempArr.push(j)
		}
		//store.context.cityIndexesToHighlightClick.push([...tempArr])
		res.push([...tempArr])
	}
	//const availableSqs = store.context.cityIndexesToHighlightClick.some((subArr) => subArr.length > 0)
	const availableSqs = res.some((subArr) => subArr.length > 0)
	// If no free space, start highlighting buildings - NOT houses, NOT graves
	if (!availableSqs) {
		//store.context.cityIndexesToHighlightClick.splice(0)
		res.splice(0)
		for (let i = 0; i < store.players[playerIndex].cities.length; i++) {
			let tempArr = []
			for (let j = 0; j < store.players[playerIndex].cities[i].coords.length; j++) {
				if (store.players[playerIndex].cities[i].coords[j] < 100 && store.players[playerIndex].cities[i].coords[j] !== rf.BLDG_HOUSE_SQ) tempArr.push(j)
			}
			//store.context.cityIndexesToHighlightClick.push([...tempArr])
			res.push([...tempArr])
		}
	}
	return res
}

export function checkForLegalStoragePlacement(playerIndex, cityIndex, index, width, height) {
	const store = useModelStore()
	let city = store.players[playerIndex].cities[cityIndex]
	let coords = city.coords

	width -= 1
	height -= 1

	if ((index % city.size) + width > city.size - 1) return 1
	else if (Math.floor(index / city.size) + height > city.size - 1) return 1

	let errorFound = false
	for (let i = 0; i <= height; i++) {
		for (let j = 0; j <= width; j++) {
			if (coords[index + j + city.size * i] !== rf.BLDG_NONE_SQ) {
				errorFound = true
				break
			}
		}
		if (errorFound) break
	}
	if (errorFound) return 2
	return 0
}

export function checkForLegalPlacement(playerIndex, cityIndex, index, bldgNum, rotation) {
	const store = useModelStore()
	let city = store.players[playerIndex].cities[cityIndex]
	let coords = city.coords
	let bldgData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgNum]]
	// Gross error check for big rectangle
	let width = bldgData.width - 1
	let height = bldgData.height - 1

	/*let topLeftRotated = index - bldgData.path[0]
    if (rotation === 1) topLeftRotated = index - (bldgData.path[0] * city.size)
    if (rotation === 2) topLeftRotated = index + bldgData.path[0]
    if (rotation === 3) topLeftRotated = index + (bldgData.path[0] * city.size)*/

	let topLeftFixed = index - bldgData.path[0]
	if (rotation === 1) topLeftFixed = index - bldgData.path[0] * city.size - (bldgData.height - 1)
	if (rotation === 2) topLeftFixed = index + bldgData.path[0] - (bldgData.height - 1) * city.size - (bldgData.width - 1)
	if (rotation === 3) topLeftFixed = index + bldgData.path[0] * city.size - (bldgData.width - 1) * city.size

	if (rotation % 2 === 1) {
		let temp = height
		height = width
		width = temp
	}

	// Basic big square check
	if (topLeftFixed < 0) return 1
	else if (topLeftFixed > city.size * city.size - 1) return 1
	else if ((topLeftFixed % city.size) + width > city.size - 1) return 1
	else if (topLeftFixed % city.size < 0) return 1
	else if (Math.floor(topLeftFixed / city.size) + height < 0) return 1
	else if (topLeftFixed + height * city.size > city.size * city.size - 1) return 1

	// Check ths city space
	width = bldgData.width
	height = bldgData.height
	if (rotation % 2 === 1) {
		let temp = height
		height = width
		width = temp
	}

	let bldgModel = rf.getRotatedBuildingModel(bldgNum, rotation)
	let errorFound = false
	for (let i = 0; i < height; i++) {
		for (let j = 0; j < width; j++) {
			if (bldgModel[i * width + j] === 1) {
				if (coords[topLeftFixed + j + city.size * i] !== rf.BLDG_NONE_SQ) {
					errorFound = true
					break
				}
			}
		}
		if (errorFound) break
	}
	if (errorFound) return 2
	return 0
}

export function markBuildingAsUsed(playerIndex, bldgNum) {
	const store = useModelStore()
	let breakOut = false
	let player = store.players[playerIndex]
	for (let i = 0; i < player.cities.length; i++) {
		for (let j = 0; j < player.cities[i].buildings.length; j++) {
			if (player.cities[i].buildings[j].bldgNum === bldgNum) {
				player.cities[i].buildings[j].usedThisTurn = true
				breakOut = true
				break
			}
		}
		if (breakOut) break
	}
}

// Get the number to use in Turn Order
export function getMannedCartsAndExplorers(playerIndex) {
	//const store = useModelStore()
	let res = getCartShopStatus(playerIndex)[0]
	if (hasWorkingUniqueBuilding(playerIndex, rf.BLDG_EXPLORER, false)) res++

	return res
}

// return [mannedCS, unmannedCD, gravedCS]
export function getCartShopStatus(playerIndex) {
	const store = useModelStore()

	let mannedCS = 0
	let unmannedCS = 0
	let gravedCS = 0
	let player = store.players[playerIndex]
	for (let i = 0; i < player.cities.length; i++) {
		for (let j = 0; j < player.cities[i].buildings.length; j++) {
			if (player.cities[i].buildings[j].bldgNum === rf.BLDG_CART) {
				// Check if graved
				if (!isBuildingGraveFree(playerIndex, i, player.cities[i].buildings[j])) gravedCS++
				else if (!player.cities[i].buildings[j].manned) unmannedCS++
				else mannedCS++
			}
		}
	}
	return [mannedCS, unmannedCS, gravedCS]
}

// Works for any building - SEEMS TO RUN QUITE A LOT?
export function getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, index, bldgNum, rotation, setIndexes, adding) {
	const store = useModelStore()

	let city = store.players[playerIndex].cities[cityIndex]
	let coords = city.coords

	let bldgData = []
	let bldgModel = [1]
	let width = 1
	let height = 1
	let bldgSq = 999
	// If not house, get the data
	if (bldgNum < 20 && bldgNum !== rf.BLDG_STORAGE) {
		bldgData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgNum]]
		bldgModel = rf.getRotatedBuildingModel(bldgNum, rotation)
	} else if (bldgNum === rf.BLDG_STORAGE) {
		bldgData.width = rotation[0]
		bldgData.height = rotation[1]
		bldgData.bldgSq = rf.BLDG_STORAGE_SQ
		rotation = 0
		bldgModel = new Array(bldgData.width * bldgData.height).fill(1)
	} else bldgData = rf.BLDG_DATA["HOUSE"]

	width = bldgData.width
	height = bldgData.height
	bldgSq = bldgData.bldgSq

	// Add to coords

	if (rotation % 2 === 1) {
		let temp = width
		width = height
		height = temp
	}

	let topLeftFixed = index
	if (bldgNum < 20 && bldgNum !== rf.BLDG_STORAGE) {
		topLeftFixed = index - bldgData.path[0]
		if (rotation === 1) topLeftFixed = index - bldgData.path[0] * city.size - (width - 1)
		if (rotation === 2) topLeftFixed = index + bldgData.path[0] - (height - 1) * city.size - (width - 1)
		if (rotation === 3) topLeftFixed = index + bldgData.path[0] * city.size - (height - 1) * city.size
	}

	let bldgIndexes = []
	for (let i = 0; i < height; i++) {
		for (let j = 0; j < width; j++) {
			if (bldgModel[i * width + j] === 1) {
				if (setIndexes && adding) coords[topLeftFixed + j + city.size * i] = bldgSq
				else if (setIndexes && !adding) coords[index + j + city.size * i] = rf.BLDG_NONE_SQ
				else if (!setIndexes) bldgIndexes.push(index + j + city.size * i)
			}
		}
	}
	// If setting the data, return the topLeft corner of the containing rectangle
	if (setIndexes && adding) return topLeftFixed
	if (setIndexes && !adding) return index

	// If just getting the info, return the bldgIndexes
	if (!setIndexes) return bldgIndexes
}

export function addBuildingToCity(playerIndex, cityIndex, index, bldgNum, rotation, adding, razingCathedral) {
	const store = useModelStore()

	let city = store.players[playerIndex].cities[cityIndex]

	// Set the coords
	let topLeftFixed = getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, index, bldgNum, rotation, true, adding)

	if (adding) {
		let builtThisTurn = true
		let previouslyManned = false
		let stopSaintHousePower = false
		let usedThisTurn = false
		let movedThisTurn = false
		let originalMovedFromCity = -1
		let originalMovedFromIndex = -1
		let lockedDueTrade = false

		// Rebuilding
		if (store.players[playerIndex].requiredRebuilds.some((subarray) => subarray.bldgNum === bldgNum)) {
			const removingIndex = store.players[playerIndex].requiredRebuilds.findIndex((subarray) => subarray.bldgNum === bldgNum)
			previouslyManned = store.players[playerIndex].requiredRebuilds[removingIndex].manned
			builtThisTurn = store.players[playerIndex].requiredRebuilds[removingIndex].builtThisTurn
			if (!builtThisTurn) {
				movedThisTurn = true
				originalMovedFromCity = store.players[playerIndex].requiredRebuilds[removingIndex].originalMovedFromCity
				originalMovedFromIndex = store.players[playerIndex].requiredRebuilds[removingIndex].originalMovedFromIndex

				completeBuildingMoveInfo(playerIndex, cityIndex, bldgNum, topLeftFixed, rotation, originalMovedFromCity, originalMovedFromIndex)
			}

			usedThisTurn = store.players[playerIndex].requiredRebuilds[removingIndex].usedThisTurn
			lockedDueTrade = store.players[playerIndex].requiredRebuilds[removingIndex].lockedDueTrade

			let requiredGraves = store.players[playerIndex].requiredRebuilds[removingIndex].graveCount
			store.context.cityBuildingBeingAddedPayment.splice(0)
			store.players[playerIndex].requiredRebuilds.splice(removingIndex, 1) // Remove one element at the found index
			stopSaintHousePower = true
			let bldgIndexes = getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, index, bldgNum, rotation, false, false)
			for (let i = 0; i < requiredGraves; i++) {
				addGraveToCity(playerIndex, cityIndex, bldgIndexes[i], true)
			}
		} // END rebuilding
		else {
			// Ig NOT rebuilding, AND is cathedral, add 1
			if (bldgNum === rf.BLDG_CATHEDRAL) store.players[playerIndex].cathedralStatus += 1
		}
		// Add to city
		city.buildings.push({
			index: topLeftFixed,
			bldgNum: bldgNum,
			rotation: rotation,
			manned: previouslyManned,
			builtThisTurn: builtThisTurn,
			movedThisTurn: movedThisTurn,
			builtThisTurnCost: [...store.context.cityBuildingBeingAddedPayment],
			usedThisTurn: usedThisTurn,
			originalMovedFromCity: originalMovedFromCity,
			originalMovedFromIndex: originalMovedFromIndex,
			lockedDueTrade: lockedDueTrade,
		})
		// Remove from store.players[playerIndexProp].availableBuildings
		if (bldgNum < 20) store.players[playerIndex].availableBuildings = store.players[playerIndex].availableBuildings.filter((num) => num !== bldgNum)
		else if (bldgNum > 20) store.players[playerIndex].availableHouses = store.players[playerIndex].availableHouses.filter((num) => num !== bldgNum)
		if (bldgNum > 20) store.players[playerIndex].availableMen++
		// If fountain built this turn, decrease famine level FL
		// Only change FL at end of round
		//if (bldgNum === rf.BLDG_FOUNTAIN && builtThisTurn) store.famineLevel--

		if (store.context.cityBuildingBeingAdded >= 26 && store.context.cityBuildingBeingAdded <= 40 && store.gameflow.subPhase !== rf.SUB_PHASE_SAINT_HOUSE && !stopSaintHousePower && !store.context.saintHousesThisTurn.includes(store.context.cityBuildingBeingAdded) && model.hasWorkingSaint(playerIndex, rf.SAINT_NICOLO)) {
			// Mark the intial house as used
			markBuildingAsUsed(playerIndex, store.context.cityBuildingBeingAdded)
			store.gameflow.subPhase = rf.SUB_PHASE_SAINT_HOUSE
			store.context.saintHouse = store.context.cityBuildingBeingAdded
			store.clearVars()
		} else if (store.gameflow.subPhase === rf.SUB_PHASE_SAINT_HOUSE) {
			store.context.saintHousesThisTurn.push(store.context.saintHouse)
			store.context.saintHousesThisTurn.push(bldgNum)
			store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS
			store.context.saintHouse = -1
		} else if (store.context.cityBuildingBeingAdded === rf.BLDG_CATHEDRAL) {
			store.clearVars()
			// Mark building as Used
			markBuildingAsUsed(playerIndex, rf.BLDG_CATHEDRAL)
			// Set up Choose Saint
			if (store.players[playerIndex].saint === rf.SAINT_NONE) store.gameflow.subPhase = rf.SUB_PHASE_CHOOSE_SAINT
			return
		}
	} else {
		// Delete from city

		const bldgInfo = city.buildings.find((building) => building.index === index && building.bldgNum === bldgNum && building.rotation === rotation)

		/*if (bldgInfo === undefined) {
			alert(`playerIndex: ${playerIndex}, cityIndex: ${cityIndex}, index: ${index}, bldgNum: ${bldgNum}, rotation: ${rotation}`)
			alert(JSON.stringify(city.buildings))
		}*/

		// NOTE: If used this turn and NOT barbara power, you have already hit the error message
		if (!bldgInfo.builtThisTurn || bldgInfo.usedThisTurn || bldgInfo.lockedDueTrade || store.context.saintHousesThisTurn.includes(bldgInfo.bldgNum)) {
			// You are MOVING a building with the saint power, so it must be rebuilt
			// Graves on it need to be removed first, and stored with the data
			let bldgIndexes = getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, index, bldgNum, rotation, false, false)
			let graveCount = 0
			for (let i = 0; i < bldgIndexes.length; i++) {
				if (city.graves.includes(bldgIndexes[i])) {
					graveCount++
					city.graves = city.graves.filter((number) => number !== bldgIndexes[i])
				}
			}
			bldgInfo.graveCount = graveCount

			// Conditionally set properties if they don't already exist
			if (!Object.prototype.hasOwnProperty.call(bldgInfo, "originalMovedFromCity")) {
				bldgInfo.originalMovedFromCity = cityIndex
			}

			if (!Object.prototype.hasOwnProperty.call(bldgInfo, "originalMovedFromIndex")) {
				bldgInfo.originalMovedFromIndex = topLeftFixed
			}

			if (!razingCathedral) store.players[playerIndex].requiredRebuilds.push(JSON.parse(JSON.stringify(bldgInfo)))
		} else {
			// NOT required to rebuild
			if (bldgInfo.manned) store.players[playerIndex].availableMen++
			if (bldgNum === rf.BLDG_CATHEDRAL) store.players[playerIndex].cathedralStatus -= 1
		}
		// Readd to availableBuildings
		if (bldgNum < 20) store.players[playerIndex].availableBuildings.push(bldgNum)
		else if (bldgNum > 20) {
			store.players[playerIndex].availableHouses.push(bldgNum)
			store.players[playerIndex].availableMen--
			// NO - NEED TO CHECK IF IT WAS A SAINT HOUSE
			// IE WHEN REMOVING HOUSE, NEED TO CHECK IF WAS SAINT HOUSE
			//store.context.saintHousesThisTurn.push(bldgNum)
		}
		// If fountain built this turn, decrease famine level FL
		// Only adjust FL at end of round
		//if (bldgNum === rf.BLDG_FOUNTAIN && bldgInfo.builtThisTurn) store.famineLevel++

		const buildingIndex = city.buildings.indexOf(bldgInfo)
		if (buildingIndex !== -1) {
			city.buildings.splice(buildingIndex, 1)
		}

		if (store.context.action === rf.ACT_RAZE_CATHEDRAL) {
			store.clearVars()
			// Add an undo point
			model.createUndoPoint()
			return
		}
		// Set up a re-add
		store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS
		store.context.action = rf.ACT_PLACE_BUILDING
		store.context.cityBuildingToDisplay = bldgInfo.bldgNum
		store.context.cityBuildingToDisplayData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgInfo.bldgNum]]
		if (bldgInfo.bldgNum)
			if (bldgInfo.builtThisTurn && !bldgInfo.usedThisTurn) {
				// Don't refund saint houses, otherwise can get for free
				store.context.cityBuildingBeingAddedPayment = [...bldgInfo.builtThisTurnCost]
				for (let i = 0; i < store.context.cityBuildingBeingAddedPayment.length; i++) {
					store.players[playerIndex].availableResources[store.context.cityBuildingBeingAddedPayment[i]]++
				}
			}

		store.context.cityBuildingBeingAdded = bldgInfo.bldgNum
		store.context.cityBuildingBeingAddedRotation = bldgInfo.rotation
		getAllFreeCitySquaresToHighlight(playerIndex)
	}
	// Add an undo point
	if (!store.topMenuViews.showReplay) model.createUndoPoint()
	if (bldgNum === rf.BLDG_STABLE || bldgNum === rf.BLDG_HARBOUR) country.updateZOCdisplayData()
}

export function addStorageToCity(playerIndex, cityIndex, index, width, height, adding) {
	const store = useModelStore()

	let city = store.players[playerIndex].cities[cityIndex]

	// Add to coords
	let topLeftFixed = getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, index, rf.BLDG_STORAGE, [width, height], true, adding)

	// Add to city
	let bldgIndexes = getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, index, rf.BLDG_STORAGE, [width, height], false, false)

	if (adding) {
		let previouslyManned = false
		let builtThisTurn = true
		let movedThisTurn = false
		let originalMovedFromCity = -1
		let originalMovedFromIndex = -1

		if (store.players[playerIndex].requiredRebuilds.some((subarray) => subarray.bldgNum === rf.BLDG_STORAGE)) {
			const removingIndex = store.players[playerIndex].requiredRebuilds.findIndex((subarray) => subarray.bldgNum === rf.BLDG_STORAGE)
			previouslyManned = store.players[playerIndex].requiredRebuilds[removingIndex].manned
			builtThisTurn = store.players[playerIndex].requiredRebuilds[removingIndex].builtThisTurn
			if (!builtThisTurn) {
				movedThisTurn = true
				originalMovedFromCity = store.players[playerIndex].requiredRebuilds[removingIndex].originalMovedFromCity
				originalMovedFromIndex = store.players[playerIndex].requiredRebuilds[removingIndex].originalMovedFromIndex

				completeBuildingMoveInfo(playerIndex, cityIndex, rf.BLDG_STORAGE, topLeftFixed, 0, originalMovedFromCity, originalMovedFromIndex)
			}
			let requiredGraves = store.players[playerIndex].requiredRebuilds[removingIndex].graveCount

			store.context.cityBuildingBeingAddedPayment.splice(0)
			store.players[playerIndex].requiredRebuilds.splice(removingIndex, 1) // Remove one element at the found index
			for (let i = 0; i < requiredGraves; i++) {
				addGraveToCity(playerIndex, cityIndex, bldgIndexes[i], true)
			}
		}
		city.buildings.push({
			index: index,
			bldgNum: rf.BLDG_STORAGE,
			width: width,
			height: height,
			manned: previouslyManned,
			builtThisTurn: builtThisTurn,
			movedThisTurn: movedThisTurn,
			builtThisTurnCost: [...store.context.cityBuildingBeingAddedPayment],
			rotation: 0,
			usedThisTurn: false, // needed to allow un-man
			originalMovedFromCity: originalMovedFromCity,
			originalMovedFromIndex: originalMovedFromIndex,
		})
	} else {
		// Delete from city

		const bldgInfo = city.buildings.find((building) => building.index === index && building.width === width && building.height === height)

		if (!bldgInfo.builtThisTurn) {
			// You are MOVING a storage  with the saint power, so it must be rebuilt

			let graveCount = 0
			for (let i = 0; i < bldgIndexes.length; i++) {
				if (city.graves.includes(bldgIndexes[i])) {
					graveCount++
					city.graves = city.graves.filter((number) => number !== bldgIndexes[i])
				}
			}
			bldgInfo.graveCount = graveCount

			if (!Object.prototype.hasOwnProperty.call(bldgInfo, "originalMovedFromCity")) {
				bldgInfo.originalMovedFromCity = cityIndex
			}

			if (!Object.prototype.hasOwnProperty.call(bldgInfo, "originalMovedFromIndex")) {
				bldgInfo.originalMovedFromIndex = topLeftFixed
			}

			store.players[playerIndex].requiredRebuilds.push(JSON.parse(JSON.stringify(bldgInfo)))
		} else if (bldgInfo.manned) store.players[playerIndex].availableMen++

		// Remove the retrieved object from the city.buildings array
		const buildingIndex = city.buildings.indexOf(bldgInfo)
		// Set up a re-add
		store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS
		store.context.action = rf.ACT_PLACE_BUILDING
		store.context.cityBuildingToDisplay = bldgInfo.bldgNum
		store.context.cityBuildingToDisplayData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgInfo.bldgNum]]

		// SET UP NEW W/H
		if (bldgInfo.bldgNum === rf.BLDG_STORAGE) {
			store.context.newStorageWidth = bldgInfo.width
			store.context.newStorageHeight = bldgInfo.height
		}

		if (bldgInfo.builtThisTurn) {
			store.context.cityBuildingBeingAddedPayment = [...bldgInfo.builtThisTurnCost]
			for (let i = 0; i < store.context.cityBuildingBeingAddedPayment.length; i++) {
				store.players[playerIndex].availableResources[store.context.cityBuildingBeingAddedPayment[i]]++
			}
		}

		store.context.cityBuildingBeingAdded = bldgInfo.bldgNum
		store.context.cityBuildingBeingAddedRotation = bldgInfo.rotation
		getAllFreeCitySquaresToHighlight(playerIndex)

		if (buildingIndex !== -1) {
			city.buildings.splice(buildingIndex, 1)
		}
	}
	// Add an undo point
	model.createUndoPoint()
}

export function getAvailableStorage(playerIndex) {
	const store = useModelStore()

	let playerObj = store.players[playerIndex]

	let availableStorage = 0
	for (let i = 0; i < playerObj.cities.length; i++) {
		for (let j = 0; j < playerObj.cities[i].buildings.length; j++) {
			if (playerObj.cities[i].buildings[j].bldgNum === rf.BLDG_STORAGE && playerObj.cities[i].buildings[j].manned && isBuildingGraveFree(playerIndex, i, playerObj.cities[i].buildings[j])) {
				availableStorage += playerObj.cities[i].buildings[j].width * playerObj.cities[i].buildings[j].height
			}
		}
	}
	return availableStorage
}

export function addGraveToCity(playerIndex, cityIndex, index, adding, moving) {
	const store = useModelStore()
	addGraveToCity_core(playerIndex, cityIndex, index, adding) //, moving)

	/*let city = store.players[playerIndex].cities[cityIndex]
	let coords = city.coords*/

	if (adding) {
		// Take off required
		store.context.gravesLeftToPlace--

		// If RE-adding a grave, update the cityHistoy
		if (store.gameflow.subPhase === rf.SUB_PHASE_READD_GRAVE) {
			let originalMovedFromCity = store.context.originalMovedFromCityGrave
			let originalMovedFromIndex = store.context.originalMovedFromIndexGrave

			completeBuildingMoveInfo(playerIndex, cityIndex, rf.BLDG_GRAVE, index, 0, originalMovedFromCity, originalMovedFromIndex)
		}

		// Add to historyObj -- ONLY IN FAMINE OR POLLUTION
		if (store.gameflow.phase === rf.PHASE_FAMINE || store.gameflow.phase === rf.PRE_PHASE_FAMINE) {
			if (store.gameflow.phase === rf.PHASE_FAMINE) {
				if (store.context.historyObj.length <= cityIndex) {
					const missingItems = cityIndex - store.context.historyObj.length + 1
					const newArrays = Array(missingItems)
						.fill()
						.map(() => [])
					store.context.historyObj.push(...newArrays)
				}
				store.context.historyObj[cityIndex].push(index)
			} else if (store.gameflow.phase === rf.PRE_PHASE_FAMINE) store.context.historyObj.push([cityIndex, index])
		} else if (store.gameflow.phase === rf.PHASE_POLLUTION) {
			if (store.context.historyObj.length === 0) store.context.historyObj.push([])
			if (store.context.historyObj.length < 2) store.context.historyObj.push([])
			//for (let i = 0; i < store.players[playerIndex].cities.length; i++) store.context.historyObj[1].push([])
			if (store.context.historyObj[1].length <= cityIndex) {
				const missingItems = cityIndex - store.context.historyObj[1].length + 1
				const newArrays = Array(missingItems)
					.fill()
					.map(() => [])
				store.context.historyObj[1].push(...newArrays)
			}

			store.context.historyObj[1][cityIndex].push(index)
		}

		// Check for game loss
		if (store.context.gravesLeftToPlace > 0) {
			let freeSpace = getAllGraveCitySquaresToHighlight(playerIndex)
			const availableSqs = freeSpace.some((subArr) => subArr.length > 0)
			if (!availableSqs) Bot.actionGraveGameOver()
			return
		}
	}
	// REMOVE GRAVE
	else {
		store.context.gravesLeftToRemove--
		if (!moving) markBuildingAsUsed(playerIndex, rf.BLDG_HOSPITAL)
		/*// Remove the grave from coords
		coords[index] -= rf.BLDG_GRAVE_SQ
		// Remove from display
		city.graves = city.graves.filter((number) => number !== index)*/
		if (moving) {
			// Store the "from" place -- find out if this is already a "to" place, and then get the "from"place
			/*let arr_idx = store.players[playerIndex].cityHistory.moved.findIndex((subarray) => subarray[0] === rf.BLDG_GRAVE && subarray[2][0] === cityIndex && subarray[2][1] === index)
			if (arr_idx !== -1) {
				store.context.originalMovedFromCityGrave = store.players[playerIndex].cityHistory.moved[arr_idx][2][0]
				store.context.originalMovedFromIndexGrave = store.players[playerIndex].cityHistory.moved[arr_idx][2][1]
			} else {*/
			store.context.originalMovedFromCityGrave = cityIndex
			store.context.originalMovedFromIndexGrave = index
			//}
			// Set up the readd
			store.context.gravesLeftToPlace = 1
			store.gameflow.subPhase = rf.SUB_PHASE_READD_GRAVE
			store.context.action = rf.ACT_READD_GRAVE

			store.context.cityBuildingToDisplay = 19
			store.context.cityBuildingBeingAdded = rf.BLDG_GRAVE
			store.context.cityBuildingToDisplayData = rf.BLDG_DATA["BLDG_GRAVE"]

			store.context.cityBuildingBeingAddedRotation = 0
			getAllFreeCitySquaresToHighlight(playerIndex, false)
		}
		if (store.context.gravesLeftToRemove === 0) store.clearVars()

		// Add history - ONLY IF NOT MOVING
		if (!moving) {
			if (store.players[playerIndex].cityHistory.gravesRemoved.length <= cityIndex) {
				const missingItems = cityIndex - store.players[playerIndex].cityHistory.gravesRemoved.length + 1
				for (let i = 0; i < missingItems; i++) {
					store.players[playerIndex].cityHistory.gravesRemoved.push([])
				}
			}
			store.players[playerIndex].cityHistory.gravesRemoved[cityIndex].push(index)
		}
	}
}

export function addGraveToCity_core(playerIndex, cityIndex, index, adding) {
	const store = useModelStore()
	let city = store.players[playerIndex].cities[cityIndex]
	let coords = city.coords

	if (adding) {
		// Add to coords
		coords[index] += rf.BLDG_GRAVE_SQ

		// Add to city (And unique, to precent multiples from loading data)
		city.graves.push(index)
		city.graves = [...new Set(city.graves)]
	}
	// REMOVE GRAVE
	else {
		// Remove the grave from coords
		coords[index] -= rf.BLDG_GRAVE_SQ
		// Remove from display
		city.graves = city.graves.filter((number) => number !== index)
	}
}

// This just checks if it already exists
export function canAddBuilding(playerIndex, bldgNum) {
	const store = useModelStore()

	if (bldgNum === rf.BLDG_FOUNTAIN) return true
	if (bldgNum === rf.BLDG_CART) return true
	if (bldgNum === rf.BLDG_STORAGE) return true
	if (bldgNum < 20 && !store.players[playerIndex].availableBuildings.includes(bldgNum)) return false
	if (bldgNum > 20 && !store.players[playerIndex].availableHouses.includes(bldgNum)) return false
	return true
}

export function buildingNotAddedAndCannotAfford(playerIndex, bldgNum) {
	const store = useModelStore()

	// If it's not available, then it will be GREYSCALE
	if (!canAddBuilding(playerIndex, bldgNum)) return false

	// NOTE: Houses are only checked in NUMBER layout. Otherwise, the text is altered
	// If it's house 1-4, then you can afford it
	if ([21, 22, 23, 24].includes(bldgNum)) return false

	// Check other houses
	if (bldgNum >= 21) {
		let cost = rf.HOUSE_COSTS[bldgNum - 25]
		let res = [...autoSelectResources(playerIndex, bldgNum, cost)]
		if (res[0] === -2) return true
		return false
	}

	// Now if must be a non house city building
	let cost = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgNum]].cost

	let availableResources = store.players[playerIndex].availableResources

	if (store.sandboxMode) availableResources = [99, 99, 99, 99, 99, 99, 99, 99, 99, 99]

	if (cost[0] === 1 && availableResources[rf.RES_WOOD] > 0) return false
	else if (cost[1] > 0 && availableResources[rf.RES_STONE] >= cost[1]) return false
	else if (cost[2] > 0) {
		// Check single lux bldgs
		if (cost[2] === 1) {
			if (availableResources[rf.RES_GOLD] + availableResources[rf.RES_WINE] + availableResources[rf.RES_PEARLS] + availableResources[rf.RES_DYE] > 0) return false
			return true
		} else {
			let autoSelectedResources = autoSelectResources(playerIndex, bldgNum, cost)
			if (autoSelectedResources[0] !== -2) return false
		}
	}

	return true
}

// Works for all buildings
export function isBuildingGraveFree(playerIndex, cityIndex, bldgInfo) {
	const store = useModelStore()

	let bldgIndexes = []
	if (bldgInfo.bldgNum !== rf.BLDG_STORAGE) bldgIndexes = getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, bldgInfo.index, bldgInfo.bldgNum, bldgInfo.rotation, false, false)
	else bldgIndexes = getOrSetAllIndexesOfBuilding(playerIndex, cityIndex, bldgInfo.index, bldgInfo.bldgNum, [bldgInfo.width, bldgInfo.height], false, false)
	// So now check it hasn't been covered in graves
	for (let i = 0; i < bldgIndexes.length; i++) {
		if (store.players[playerIndex].cities[cityIndex].coords[bldgIndexes[i]] >= 100) return false
	}
	return true
}

// ONLY WORKS FOR UNIQUE BUILDINGS. CART SHOPS / STORAGE NEED TO BE HANDLED SEPARATELY
// OLD FUNCTION
/*export function hasWorkingUniqueBuilding(playerIndex, bldgNum, checkUnused) {
	const store = useModelStore()

	let bldgInfo = []
	let cityIndex = -1

	// Check if it's actually been built
	let built = false
	for (let i = 0; i < store.players[playerIndex].cities.length; i++) {
		for (let j = 0; j < store.players[playerIndex].cities[i].buildings.length; j++) {
			if (store.players[playerIndex].cities[i].buildings[j].bldgNum === bldgNum) {
				bldgInfo = store.players[playerIndex].cities[i].buildings[j]
				built = true
				cityIndex = i
				break
			}
		}
		if (built) break
	}
	if (!built) return false

	// Check it is grave free
	if (!isBuildingGraveFree(playerIndex, cityIndex, bldgInfo)) return false

	// Now check it is manned, if it needs to be
	if (!rf.MANNABLE_BUILDINGS.includes(bldgNum)) return true
	// If checking it has been used, and ti has been, return false
	if (checkUnused && bldgInfo.usedThisTurn) return false
	if (bldgInfo.manned) return true
	// Finally, check if unmanned (must be by now), AND faculty, AND adjacent MANNED uni
	if (rf.BLDG_FACULTY.includes(bldgNum) && doesFacultyHaveAdjacentMannedUniversity(playerIndex, cityIndex, bldgInfo)) return true
	return false
}*/
export function hasWorkingUniqueBuilding(playerIndex, bldgNum, checkUnused) {
	const store = useModelStore()
	const player = store.players[playerIndex]
	const cities = player.cities

	for (let i = 0; i < cities.length; i++) {
		const city = cities[i]
		const building = city.buildings.find((building) => building.bldgNum === bldgNum)

		if (building) {
			if (!isBuildingGraveFree(playerIndex, i, building)) {
				return false
			}

			if (!rf.MANNABLE_BUILDINGS.includes(bldgNum)) {
				return true
			}

			if (checkUnused && building.usedThisTurn) {
				return false
			}

			if (building.manned) {
				return true
			}

			if (rf.BLDG_FACULTY.includes(bldgNum) && doesFacultyHaveAdjacentMannedUniversity(playerIndex, i, building)) {
				return true
			}

			return false
		}
	}

	return false
}

// OLD FUNCTION
/*export function doesFacultyHaveAdjacentMannedUniversity(playerIndex, cityIndex, bldgInfo) {
	const store = useModelStore()
	if (!hasWorkingUniqueBuilding(playerIndex, rf.BLDG_UNIVERSITY)) return false
	// ASSUME you have ungraved faculty and ungraved, manned, uni.
	// So check any neighbouring square of the faculty contains a uni square.
	let bldgData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgInfo.bldgNum]]
	let facultySq = bldgData.bldgSq

	// First, collect the INDEXES of the faculty
	let city = store.players[playerIndex].cities[cityIndex]
	let coords = city.coords
	let bldgIndexes = []

	for (let i = 0; i < coords.length; i++) {
		if (coords[i] === facultySq) bldgIndexes.push(i)
	}
	let neighbours = []
	for (let i = 0; i < bldgIndexes.length; i++) {
		neighbours = neighbours.concat(getNeighbours(bldgIndexes[i], city.size))
	}
	neighbours = [...new Set(neighbours)]
	for (let i = 0; i < neighbours.length; i++) {
		if (coords[neighbours[i]] === rf.BLDG_UNIVERSITY_SQ) return true
	}
}*/
export function doesFacultyHaveAdjacentMannedUniversity(playerIndex, cityIndex, bldgInfo) {
	const store = useModelStore()
	const player = store.players[playerIndex]
	const city = player.cities[cityIndex]

	if (!hasWorkingUniqueBuilding(playerIndex, rf.BLDG_UNIVERSITY)) return false

	const facultySq = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgInfo.bldgNum]].bldgSq
	const coords = city.coords
	const facultyIndexes = coords.reduce((acc, sq, index) => {
		if (sq === facultySq) {
			acc.push(index)
		}
		return acc
	}, [])

	const neighbours = facultyIndexes.flatMap((index) => getNeighbours(index, city.size))

	for (let i = 0; i < neighbours.length; i++) {
		if (coords[neighbours[i]] === rf.BLDG_UNIVERSITY_SQ) {
			return true
		}
	}

	return false
}

export function getNeighbours(index, citySize) {
	let res = []

	// If not on top row, push one up
	if (index >= citySize) res.push(index - citySize)
	// If not on bottom, push one below
	if (index <= citySize * citySize - citySize - 1) res.push(index + citySize)
	// if not on left edge, push -1
	if (index % citySize > 0) res.push(index - 1)
	// if not on right edge, push +1
	if (index % citySize < citySize - 1) res.push(index + 1)

	return res
}

export function canManBuilding(playerIndex, cityIndex, bldgInfo) {
	// No need if house
	if (bldgInfo.bldgNum > 20) return false
	// No need if unmannable
	if (bldgInfo.bldgNum === rf.BLDG_BREWERY) return false
	if (bldgInfo.bldgNum === rf.BLDG_CATHEDRAL) return false
	if (bldgInfo.bldgNum === rf.BLDG_GRANARY) return false
	if (bldgInfo.bldgNum === rf.BLDG_FOUNTAIN) return false
	if (bldgInfo.bldgNum === rf.BLDG_GRAVE_INFO) return false
	// Check if already manned
	if (bldgInfo.manned) return false
	// Check not blocked by graves

	if (!isBuildingGraveFree(playerIndex, cityIndex, bldgInfo)) return false

	// Finally, check if unmanned (must be by now), AND faculty, AND adjacent MANNED uni
	if (rf.BLDG_FACULTY.includes(bldgInfo.bldgNum) && doesFacultyHaveAdjacentMannedUniversity(playerIndex, cityIndex, bldgInfo)) return false

	return true
}

export function canMoveBulding(playerIndex, cityIndex, bldgInfo) {
	const store = useModelStore()
	// With the saint power, graves are moveable (as long as free space)
	if (bldgInfo.bldgNum === rf.BLDG_GRAVE_INFO && model.hasWorkingSaint(playerIndex, rf.SAINT_BARBARA)) {
		// IF NO FREE SPACE RETURN 7
		if (!getAllFreeCitySquaresToHighlight(playerIndex, true)) return 7
		return 0 // 0 means can move
	}

	// If not grave free, then cannot move //No, you can move buildings with graves on them with the graves
	//let bldgData = rf.BLDG_DATA["HOUSE"]
	//if (bldgInfo.bldgNum < 20) bldgData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgInfo.bldgNum]]

	//if (!isBuildingGraveFree(playerIndex, bldgData)) return false

	// Saint powers always allow moving
	if (model.hasWorkingSaint(playerIndex, rf.SAINT_BARBARA)) return 0
	// If built this turn, but NOT USED HOSP, NOT USED PHIL, then you can move it
	if (bldgInfo.bldgNum === rf.BLDG_HOSPITAL && bldgInfo.builtThisTurn && bldgInfo.manned) return 2
	if (bldgInfo.bldgNum === rf.BLDG_UNIVERSITY && bldgInfo.builtThisTurn && bldgInfo.manned) return 3
	if (bldgInfo.bldgNum === rf.BLDG_THEOLOGY && bldgInfo.builtThisTurn && bldgInfo.usedThisTurn) return 4
	if (bldgInfo.bldgNum === rf.BLDG_MARKET && bldgInfo.builtThisTurn && bldgInfo.usedThisTurn) return 5
	if (bldgInfo.bldgNum === rf.BLDG_CATHEDRAL && store.context.saintHousesThisTurn.length > 0) return 6
	if (bldgInfo.lockedDueTrade) return 9
	if (bldgInfo.builtThisTurn) return 0
	return 1
	// 0 - true
	// 1 - not built this turn
	// 2 - hospital this turn, but manned
	// 3 - uni this turn, but manned
	// 4 - Theology built and used this turn
	// 5 - Market built and used this turn
	// 6 - used cathedral
	// 7 - grave, but no free space
	// 8 - (Elsewhere) Trying to build hospital, but buildings left to add
	// 9 - locked due to trade
}

export function razeCathedral(playerIndex) {
	const store = useModelStore()
	let player = store.players[playerIndex]

	razeCathedral_core(playerIndex)

	// Add to history
	player.cityHistory.razedCathedral = true
	// Add an undo point
	model.createUndoPoint()
}

export function razeCathedral_core(playerIndex) {
	const store = useModelStore()

	let player = store.players[playerIndex]
	player.cathedralStatus += 5
	player.saint = rf.SAINT_NONE

	let bldgInfo = []
	let cityIndex = -1

	for (let i = 0; i < player.cities.length; i++) {
		for (let j = 0; j < player.cities[i].buildings.length; j++) {
			if (player.cities[i].buildings[j].bldgNum === rf.BLDG_CATHEDRAL) {
				bldgInfo = player.cities[i].buildings[j]
				cityIndex = i
				break
			}
		}
	}

	store.context.action = rf.ACT_RAZE_CATHEDRAL
	addBuildingToCity(playerIndex, cityIndex, bldgInfo.index, rf.BLDG_CATHEDRAL, bldgInfo.rotation, false, true)

	// Mark theology as used this turn
	markBuildingAsUsed(playerIndex, rf.BLDG_THEOLOGY)
}

export function getTotalGravesToPlace(playerIndex) {
	const store = useModelStore()

	let playerObj = store.players[playerIndex]
	// Start with the famine level
	let totalGraves = store.famineLevel
	// Granary takes off 3
	if (hasWorkingUniqueBuilding(playerIndex, rf.BLDG_GRANARY, false)) totalGraves -= 3
	// Finally, each food takes off 1
	totalGraves -= playerObj.availableResources[rf.RES_GRAIN]
	totalGraves -= playerObj.availableResources[rf.RES_SHEEP]
	totalGraves -= playerObj.availableResources[rf.RES_OLIVES]
	totalGraves -= playerObj.availableResources[rf.RES_FISH]

	if (totalGraves < 0) totalGraves = 0

	return totalGraves
}

export function getTotalGravesToPlaceForPreTurn(playerIndex) {
	const store = useModelStore()
	const personal = usePersonalStore()
	
	let playerObj = store.players[playerIndex]
	// Start with the famine level
	let totalGraves = store.famineLevel
	// Granary takes off 3
	if (hasWorkingUniqueBuilding(playerIndex, rf.BLDG_GRANARY, false)) totalGraves -= 3
	// Eeach food takes off 1
	totalGraves -= playerObj.availableResources[rf.RES_GRAIN]
	totalGraves -= playerObj.availableResources[rf.RES_SHEEP]
	totalGraves -= playerObj.availableResources[rf.RES_OLIVES]
	totalGraves -= playerObj.availableResources[rf.RES_FISH]

	// Now if you have not harvested, remove the graves from harvesting food
	// flat array of resources
	if (store.gameflow.phase < rf.PHASE_HARVEST || (store.gameflow.phase === rf.PHASE_HARVEST && store.gameflow.turnOrder.includes(playerIndex))) {
		let expectedHarvest = country.getExpectedHarvestResources(playerIndex, hasWorkingUniqueBuilding(playerIndex, rf.BLDG_FORCED_LABOUR, false))
		const totalFoodHarvest = expectedHarvest.filter((num) => [rf.RES_GRAIN, rf.RES_SHEEP, rf.RES_OLIVES, rf.RES_FISH].includes(num)).length
		totalGraves -= totalFoodHarvest
	}

	let totalExplorers = 0
	// Now add in the possibility of any explorers
	if (store.gameflow.phase <= rf.PHASE_EXPLORE) {
		for (let i = 0; i < store.players.length; i++) {
			// Your own explorers CANNOT affect graves
			if (i !== personal.pov) {
				// Check there is an explorer
				if (hasWorkingUniqueBuilding(i, rf.BLDG_EXPLORER, false)) {
					// Check the explorer can still do something - if player can still C build, could enlarge zoc and explore
					if (store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING && store.gameflow.turnOrder.includes(i)) totalExplorers++
					else if (store.gameflow.phase < rf.PHASE_EXPLORE || (store.gameflow.phase === rf.PHASE_EXPLORE && store.gameflow.turnOrder.includes(i))) {
						// Now we have a manned explorer with a turn still to go.
						// So check there is a valid explore token within the ZoC
						const zoc = country.getZocTiles(i)
						const tiles = zoc.filter((hex) => store.mapData.explorers.includes(hex.id))
						if (tiles.length > 0) totalExplorers++
					}
				}
			}
		}
	}
	totalGraves += totalExplorers

	// If there are no graves, even if explore food, just return 0
	if (totalGraves <= 0) return [0, totalExplorers]
	// NB totalGraves INCLUDES the explorers
	return [totalGraves, totalExplorers]
}

export function generateCityBuildHistoryEntry(playerIndex, timestamp) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let fountainsBuilt = 0
	let cathedralsBuilt = 0
	let player = store.players[playerIndex]

	let playerBuiltObj = []
	//let playerBuiltMannedObj = []
	let playerMannedObj = []
	let playerMovedObj = [] // NOTE: deprecated; see player.cityHisory.moved
	for (let j = 0; j < player.cities.length; j++) {
		for (let k = 0; k < player.cities[j].buildings.length; k++) {
			let bldg = player.cities[j].buildings[k]

			// BUILT THIS TURN
			if (bldg.builtThisTurn) {
				// BldgNum, manned, city, index
				/*if (rf.BLDG_UNIQUE.includes(bldg.bldgNum)) playerBuiltObj.push([bldg.bldgNum, j, bldg.index])
				else playerBuiltObj.push([bldg.bldgNum, j, bldg.index])*/

				if (rf.BLDG_ROTATABLE.includes(bldg.bldgNum)) playerBuiltObj.push([bldg.bldgNum, j, bldg.index, bldg.rotation])
				else if (bldg.bldgNum === rf.BLDG_STORAGE) playerBuiltObj.push([bldg.bldgNum, j, bldg.index, [bldg.width, bldg.height]])
				else playerBuiltObj.push([bldg.bldgNum, j, bldg.index])

				// Add complex costs if needed
				if (rf.BLDG_COMPLEX_COST.includes(bldg.bldgNum)) {
					playerBuiltObj[playerBuiltObj.length - 1].push([...bldg.builtThisTurnCost])
				}
				if (bldg.bldgNum === rf.BLDG_FOUNTAIN) fountainsBuilt++
				//if (bldg.bldgNum === rf.BLDG_CATHEDRAL) cathedralsBuilt++
			}

			// NOT BUILT, BUT MOVED THIS TURN
			if (!bldg.builtThisTurn && bldg.movedThisTurn) {
				// BldgNum, manned, city, index
				if (rf.BLDG_UNIQUE.includes(bldg.bldgNum)) playerMovedObj.push([bldg.bldgNum])
				else playerMovedObj.push([bldg.bldgNum, j, bldg.index])
			}

			if (bldg.manned) {
				// BldgNum,  city, index
				if (rf.BLDG_UNIQUE.includes(bldg.bldgNum)) playerMannedObj.push([bldg.bldgNum])
				else playerMannedObj.push([bldg.bldgNum, j, bldg.index])
			}
		}
	}

	let razedCathedral = 0
	if (player.cityHistory.razedCathedral) razedCathedral = 1

	let timeNow = Math.round(new Date().getTime() / 1000)
	
	//model.addHistory(rf.HIST_CITY_BUILD, playerIndex, timestamp / 1000 - personal.gameCreationTimestamp, [[...playerBuiltObj], [...player.cityHistory.moved], [...playerMannedObj], [...player.cityHistory.boardTrades], [...player.cityHistory.gravesRemoved], player.cityHistory.saintChosen, razedCathedral])
	model.addHistory(rf.HIST_CITY_BUILD, playerIndex, timestamp / 1000 - timeNow, [[...playerBuiltObj], [...player.cityHistory.moved], [...playerMannedObj], [...player.cityHistory.boardTrades], [...player.cityHistory.gravesRemoved], player.cityHistory.saintChosen, razedCathedral])

	player.cityHistory.boardTrades.splice(0)
	player.cityHistory.gravesRemoved.splice(0)
	player.cityHistory.saintChosen = rf.SAINT_NONE
	player.cityHistory.razedCathedral = false

	cathedralsBuilt = player.cathedralStatus
	if (cathedralsBuilt >= 5) cathedralsBuilt -= 5

	// MAKE EXTRA ENTRIES NOW, ONLY IF TRAINING GAME
	if (personal.trainingGame) {
		if (fountainsBuilt > 0) {
			store.famineLevel = Math.max(store.famineLevel - fountainsBuilt, 0)
			model.addHistory(rf.HIST_CITY_FOUNTAINS, -1, 0, [fountainsBuilt])
		}
		/*if (cathedralsBuilt > 0) {
			const needCathedralHistory = store.players.some((player) => player.saint === rf.SAINT_NICOLO || player.saint === rf.SAINT_MARIA)
			if (needCathedralHistory) model.addHistory(rf.HIST_CITY_CATHEDRALS, -1, 0, [cathedralsBuilt])
		}*/
	}

	return [fountainsBuilt, cathedralsBuilt]
}

export function processEndOfSimulTurn(timestamps) {
	const store = useModelStore()

	// Go through each player, add a history, alter the famine level
	let fountainsBuilt = 0
	let cathedralsBuilt = 0

	// Go in reverse so it shows chronologically in history with newest at top
	for (let i = store.players.length - 1; i >= 0; i--) {
		let res = generateCityBuildHistoryEntry(i, timestamps[i])
		fountainsBuilt += res[0]
		cathedralsBuilt += res[1]
	}
	if (fountainsBuilt > 0) {
		store.famineLevel = Math.max(store.famineLevel - fountainsBuilt, 0)
		model.addHistory(rf.HIST_CITY_FOUNTAINS, -1, 0, [fountainsBuilt])
	}
	if (cathedralsBuilt > 0) {
		const needCathedralHistory = store.players.some((player) => player.saint === rf.SAINT_NICOLO || player.saint === rf.SAINT_MARIA)
		if (needCathedralHistory) model.addHistory(rf.HIST_CITY_CATHEDRALS, -1, 0, [cathedralsBuilt])
	}
}

export function setBuildingToMidMove(playerIndex, cityIndex, bldgNum, index, rotation) {
	const store = useModelStore()

	// Entry in move history is [bldg_num, [from city, from index], [to city, to index]]
	if (rf.BLDG_UNIQUE.includes(bldgNum)) {
		// Find an existing entry
		const arr_idx = store.players[playerIndex].cityHistory.moved.findIndex((subarray) => subarray[0] === bldgNum)

		// if it exists, it has alredy been moved, so remove the from data
		if (arr_idx > -1) {
			store.players[playerIndex].cityHistory.moved[arr_idx].splice(2)
		} else {
			// Create a new entry
			if (rf.BLDG_ROTATABLE.includes(bldgNum)) store.players[playerIndex].cityHistory.moved.push([bldgNum, [cityIndex, index, rotation]])
			else if (bldgNum === rf.BLDG_STORAGE) store.players[playerIndex].cityHistory.moved.push([bldgNum, [cityIndex, index, rotation]])
			else store.players[playerIndex].cityHistory.moved.push([bldgNum, [cityIndex, index]])
		}
	} else {
		// If it is not unique, need more information
		// Try to find the existing array
		let arr_idx = -1
		if (bldgNum === rf.BLDG_GRAVE) {
			arr_idx = store.players[playerIndex].cityHistory.moved.findIndex((subarray) => subarray[0] === rf.BLDG_GRAVE && subarray[2][0] === store.context.originalMovedFromCityGrave && subarray[2][1] === store.context.originalMovedFromIndexGrave)
			if (arr_idx > -1) {
				store.context.originalMovedFromCityGrave = store.players[playerIndex].cityHistory.moved[arr_idx][1][0]
				store.context.originalMovedFromIndexGrave = store.players[playerIndex].cityHistory.moved[arr_idx][1][1]
			}
		} else if (bldgNum === rf.BLDG_STORAGE) arr_idx = store.players[playerIndex].cityHistory.moved.findIndex((subarray) => subarray[0] === rf.BLDG_STORAGE && subarray[2][0] === cityIndex && subarray[2][1] === index)
		else arr_idx = store.players[playerIndex].cityHistory.moved.findIndex((subarray) => subarray[0] === bldgNum && subarray[2][0] === cityIndex && subarray[2][1] === index)

		// if it exists, it has alredy been moved, so remove the from data
		if (arr_idx > -1) {
			store.players[playerIndex].cityHistory.moved[arr_idx].splice(2)
		} else {
			// Create a new entry
			if (rf.BLDG_ROTATABLE.includes(bldgNum)) store.players[playerIndex].cityHistory.moved.push([bldgNum, [cityIndex, index, rotation]])
			else if (bldgNum === rf.BLDG_STORAGE) store.players[playerIndex].cityHistory.moved.push([bldgNum, [cityIndex, index, rotation]])
			else store.players[playerIndex].cityHistory.moved.push([bldgNum, [cityIndex, index]])
		}
	}
}

export function completeBuildingMoveInfo(playerIndex, cityIndex, bldgNum, index, rotation, originalMovedFromCity, originalMovedFromIndex) {
	const store = useModelStore()

	if (rf.BLDG_UNIQUE.includes(bldgNum)) {
		// It is mid move, so an entry must exist
		const arr_idx = store.players[playerIndex].cityHistory.moved.findIndex((subarray) => subarray[0] === bldgNum)
		if (arr_idx === -1) {
			alert("ERROR: Move History Entry Not Found")
			return
		}
		if (store.players[playerIndex].cityHistory.moved[arr_idx].length !== 2) {
			alert("ERROR: Move History Entry Not = 2a")
			return
		}
		// Now it has been found, so add the "to" data
		if (rf.BLDG_ROTATABLE.includes(bldgNum)) store.players[playerIndex].cityHistory.moved[arr_idx].push([cityIndex, index, rotation])
		else store.players[playerIndex].cityHistory.moved[arr_idx].push([cityIndex, index])

		// If it went back to the start, remove the move
		if (!rf.BLDG_ROTATABLE.includes(bldgNum) && store.players[playerIndex].cityHistory.moved[arr_idx][1][0] === store.players[playerIndex].cityHistory.moved[arr_idx][2][0] && store.players[playerIndex].cityHistory.moved[arr_idx][1][1] === store.players[playerIndex].cityHistory.moved[arr_idx][2][1]) {
			store.players[playerIndex].cityHistory.moved.splice(arr_idx, 1)
		} else if (rf.BLDG_ROTATABLE.includes(bldgNum) && store.players[playerIndex].cityHistory.moved[arr_idx][1][0] === store.players[playerIndex].cityHistory.moved[arr_idx][2][0] && store.players[playerIndex].cityHistory.moved[arr_idx][1][1] === store.players[playerIndex].cityHistory.moved[arr_idx][2][1] && store.players[playerIndex].cityHistory.moved[arr_idx][1][2] === store.players[playerIndex].cityHistory.moved[arr_idx][2][2]) {
			store.players[playerIndex].cityHistory.moved.splice(arr_idx, 1)
		}
	}
	// Otherwise, is storage / foundtain / cart / GRAVE
	else {
		const arr_idx = store.players[playerIndex].cityHistory.moved.findIndex((subarray) => subarray[0] === bldgNum && subarray[1][0] === originalMovedFromCity && subarray[1][1] === originalMovedFromIndex)
		if (arr_idx === -1) {
			alert("ERROR: Move History Entry Not Found")
			alert(`originalMovedFromCity: ${originalMovedFromCity}, originalMovedFromIndex: ${originalMovedFromIndex}`)
			return
		}
		if (store.players[playerIndex].cityHistory.moved[arr_idx].length !== 2) {
			alert("ERROR: Move History Entry Not = 2b")
			return
		}
		// Now it has been found, so add the "to" data
		if (rf.BLDG_ROTATABLE.includes(bldgNum)) store.players[playerIndex].cityHistory.moved[arr_idx].push([cityIndex, index, rotation])
		else store.players[playerIndex].cityHistory.moved[arr_idx].push([cityIndex, index])

		// If it went back to the start, remove the move
		if (store.players[playerIndex].cityHistory.moved[arr_idx][1][0] === store.players[playerIndex].cityHistory.moved[arr_idx][2][0] && store.players[playerIndex].cityHistory.moved[arr_idx][1][1] === store.players[playerIndex].cityHistory.moved[arr_idx][2][1]) {
			store.players[playerIndex].cityHistory.moved.splice(arr_idx, 1)
		}
	}
}

export function getBarabaraCostToGo(playerIndex) {
	const store = useModelStore()

	let res = [0, 0, 0, 0]

	for (let i = 0; i < store.players[playerIndex].availableBuildings.length; i++) {
		if (rf.BLDG_SINGLE_WOOD.includes(store.players[playerIndex].availableBuildings[i])) res[0]++
		else if (rf.BLDG_SINGLE_STONE.includes(store.players[playerIndex].availableBuildings[i])) res[1]++
		else if (rf.BLDG_DOUBLE_STONE.includes(store.players[playerIndex].availableBuildings[i])) res[1] += 2
		else if (store.players[playerIndex].availableBuildings[i] === rf.BLDG_HOSPITAL) res[2]++
		else if (store.players[playerIndex].availableBuildings[i] === rf.BLDG_STABLE) res[3]++
	}
	// Now just need to check cart / foundtain / storage
	let cartBuilt = false
	let foundtainBuilt = false
	let storageBuilt = false
	for (let i = 0; i < store.players[playerIndex].cities.length; i++) {
		for (let j = 0; j < store.players[playerIndex].cities[i].buildings.length; j++) {
			if (store.players[playerIndex].cities[i].buildings[j].bldgNum === rf.BLDG_CART) cartBuilt = true
			else if (store.players[playerIndex].cities[i].buildings[j].bldgNum === rf.BLDG_FOUNTAIN) foundtainBuilt = true
			else if (store.players[playerIndex].cities[i].buildings[j].bldgNum === rf.BLDG_STORAGE) storageBuilt = true
		}
	}
	if (!cartBuilt) res[0]++
	if (!foundtainBuilt) res[2]++
	if (!storageBuilt) res[0]++

	return res
}

export function prettyPrint(playerIndex, cityIndex) {
	const store = useModelStore()
	let city = store.players[playerIndex].cities[cityIndex]
	let Sw = city.size

	var str = ""
	for (var i = 0; i < city.coords.length; i++) {
		if (i % Sw == 0) str += "\n"

		switch (city.coords[i]) {
			case rf.BLDG_NONE_SQ:
				str += ". "
				break
			case rf.BLDG_THEOLOGY_SQ:
				str += "Th"
				break
			case rf.BLDG_BIOLOGY_SQ:
				str += "Bi"
				break
			case rf.BLDG_UNIVERSITY_SQ:
				str += "Un"
				break
			case rf.BLDG_ALCHEMY_SQ:
				str += "Al"
				break
			case rf.BLDG_PHILOSOPHY_SQ:
				str += "Ph"
				break
			case rf.BLDG_BREWERY_SQ:
				str += "Br"
				break
			case rf.BLDG_FORCED_LABOUR_SQ:
				str += "Fl"
				break
			case rf.BLDG_STABLE_SQ:
				str += "St"
				break
			case rf.BLDG_HARBOUR_SQ:
				str += "Ha"
				break
			case rf.BLDG_HOSPITAL_SQ:
				str += "Ho"
				break
			case rf.BLDG_EXPLORER_SQ:
				str += "Ex"
				break
			case rf.BLDG_GRANARY_SQ:
				str += "Gr"
				break
			case rf.BLDG_DUMP_SQ:
				str += "Du"
				break
			case rf.BLDG_CATHEDRAL_SQ:
				str += "Ca"
				break
			case rf.BLDG_MARKET_SQ:
				str += "Ma"
				break
			case rf.BLDG_CART_SQ:
				str += "Ct"
				break
			case rf.BLDG_FOUNTAIN_SQ:
				str += "F_"
				break
			case rf.BLDG_STORAGE_SQ:
				str += "S_"
				break
			case rf.BLDG_HOUSE_SQ:
				str += "hh"
				break

			default:
				str += "??"
		}
	}
	console.log(str)
	//return (str)
}
