/**
 * This does any calculations for the Countryside screen
 *
 */

import * as rf from "./AQYreference.js"
import * as model from "./AQYmodel.js"
import * as map from "./AQYmap.js"
import * as city from "./AQYcity.js"
//import * as funcs from "./AQYfuncs.js"

import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal.js"
//import hexlib from "./hexlib.js";

// Gets the ZoC For a playerIndex
export function getZOC(playerIndex) {
	const store = useModelStore()
	store.historyHelpers.hexesToHighlightYellow = getZocTiles(playerIndex, false)
}

/**NEW FASTER FUNCTION */ /** NO THIS FUNCTION IS ACTUALLY SLOWER!!!!!!! DO NOT USE!!!!!! */
/*export function getZocTiles(playerIndex, allIDSonly, ZOCidsOnly, excludeCities, excludeInns) {
	//if (allIDSonly) return [311,312]
	const store = useModelStore()
	const player = store.players[playerIndex]
	const stable = city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_STABLE, false)
	const harbour = city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_HARBOUR, false)
	const cityCenters = player.cities.map((city) => ({ hex: city.hex }))
	let seedIDs = cityCenters.map((center) => map.getIDfromHex(center.hex))
	for (let i = seedIDs.length - 1; i >= 0; i--) {
		seedIDs = seedIDs.concat(store.mapNeighbours[seedIDs[i]])
	}

	const inns = store.players[playerIndex].countrysideBuildings.filter((cb) => cb.type === rf.COUNTRYSIDE_BLDG_INN)
	inns.forEach((inn) => seedIDs.push(inn.hexId))

	let ZOCring1 = getZOCRing(seedIDs, rf.TERR_WATER)
	let ZOCring1Water = []

	if (harbour) {
		ZOCring1Water = getZOCRing(
			ZOCring1.filter((num) => map.getHexDataFromID(num).terrainType === rf.TERR_WATER),
			rf.TERR_WATER
		)
	}

	let ZOCring2 = getZOCRing(ZOCring1, rf.TERR_WATER)
	let ZOCring3 = []

	if (stable) {
		ZOCring3 = getZOCRing(ZOCring2, rf.TERR_WATER)
	}

	let wholeZOC = [...new Set([...ZOCring1, ...ZOCring1Water, ...ZOCring2, ...ZOCring3])]

	if (excludeCities) {
		wholeZOC = wholeZOC.filter((hex) => !getAllCityHexId().includes(hex))
	}

	if (excludeInns) {
		const innIDs = store.players.flatMap((player) => player.countrysideBuildings.filter((cb) => cb.type === rf.COUNTRYSIDE_BLDG_INN).map((inn) => inn.hexId))
		wholeZOC = wholeZOC.filter((hex) => !innIDs.includes(hex))
	}

	if (ZOCidsOnly) return wholeZOC

	if (allIDSonly) {
		wholeZOC = [...new Set([...wholeZOC, ...seedIDs])]
		return wholeZOC
	}

	return wholeZOC.map((hex) => map.getHexDataFromID(hex))
}
function getZOCRing(seedIDs, terrainType) {
	const store = useModelStore()

	let ring = seedIDs.flatMap((id) => store.mapNeighbours[id])
	ring = [...new Set(ring.filter((num) => map.getHexDataFromID(num).terrainType !== terrainType))]
	return ring
}*/

// ORIGINAL FUNCTION
export function getZocTiles(playerIndex, allIDSonly, ZOCidsOnly, excludeALLcities, excludeALLinns) {
	const store = useModelStore()

	let player = store.players[playerIndex]

	let stable = city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_STABLE, false)
	let harbour = city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_HARBOUR, false)

	let cityCenters = []
	let seedIDs = []
	// First, get the city central co-ords

	for (let i = 0; i < player.cities.length; i++) {
		cityCenters.push({ hex: player.cities[i].hex })
	}

	// Gather the city center IDs
	for (let i = 0; i < cityCenters.length; i++) {
		seedIDs.push(map.getIDfromHex(cityCenters[i].hex))
	}

	// Now add in the closest neighbouts - IE the city ring
	for (let i = seedIDs.length - 1; i >= 0; i--) {
		seedIDs = seedIDs.concat([...store.mapNeighbours[seedIDs[i]]])
	}

	// Gather the inns
	const inns = store.players[playerIndex].countrysideBuildings.filter((cb) => cb.type === rf.COUNTRYSIDE_BLDG_INN)
	inns.forEach((inn) => seedIDs.push(inn.hexId))

	// Now you have all the seed data to start making the ZoC
	// So get the first ring of ZoC
	let ZOCring1 = []
	for (let i = 0; i < seedIDs.length; i++) {
		ZOCring1 = ZOCring1.concat([...store.mapNeighbours[seedIDs[i]]])
	}
	// Now unique the array
	ZOCring1 = [...new Set(ZOCring1)]
	// Now remove the seedIDs so you only have ZOCring1
	ZOCring1 = ZOCring1.filter((num) => !seedIDs.includes(num))
	// Now filter ZOCring1 for water tiles -- ASSUME NO HARBOUR
	let ZOCring1Water = []
	// If you have a harbour, include the water from ZOCring1, all adjacent water, and then all the shore hexes
	if (harbour) {
		ZOCring1Water = ZOCring1.filter((num) => map.getHexDataFromID(num).terrainType === rf.TERR_WATER)
		// First, find all the adjacent water
		ZOCring1Water = expandWater(ZOCring1Water, seedIDs)
		// Now expand to include shore hexes
		for (let i = ZOCring1Water.length - 1; i >= 0; i--) {
			ZOCring1Water = ZOCring1Water.concat([...store.mapNeighbours[ZOCring1Water[i]]])
		}
		// Now unique the array
		ZOCring1Water = [...new Set(ZOCring1Water)]

		// remove seedIDs
		ZOCring1Water = ZOCring1Water.filter((num) => !seedIDs.includes(num))
	}
	// Remove the water from the rest of ring1
	ZOCring1 = ZOCring1.filter((num) => map.getHexDataFromID(num).terrainType !== rf.TERR_WATER)

	// Now get the 2nd ring of ZoC
	let ZOCring2 = []
	for (let i = 0; i < ZOCring1.length; i++) {
		ZOCring2 = ZOCring2.concat([...store.mapNeighbours[ZOCring1[i]]])
	}
	// Now unique the array
	ZOCring2 = [...new Set(ZOCring2)]
	// Now remove the ZOCring1 so you only have ZOCring2
	ZOCring2 = ZOCring2.filter((num) => !seedIDs.includes(num))
	ZOCring2 = ZOCring2.filter((num) => !ZOCring1.includes(num))
	// Now filter ZOCring1 for water tiles -- ASSUME NO HARBOUR
	ZOCring2 = ZOCring2.filter((num) => map.getHexDataFromID(num).terrainType !== rf.TERR_WATER)

	// Now get the 3rd ring of ZoC IF stables
	let ZOCring3 = []
	if (stable) {
		for (let i = 0; i < ZOCring2.length; i++) {
			ZOCring3 = ZOCring3.concat([...store.mapNeighbours[ZOCring2[i]]])
		}
		// Now unique the array
		ZOCring3 = [...new Set(ZOCring3)]
		// Now remove the ZOCring1 so you only have ZOCring3
		ZOCring3 = ZOCring3.filter((num) => !seedIDs.includes(num))
		ZOCring3 = ZOCring3.filter((num) => !ZOCring1.includes(num))
		ZOCring3 = ZOCring3.filter((num) => !ZOCring2.includes(num))
		// Now filter ZOCring1 for water tiles -- ASSUME NO HARBOUR
		ZOCring3 = ZOCring3.filter((num) => map.getHexDataFromID(num).terrainType !== rf.TERR_WATER)
	}

	// Finally, for testing purposes, convert the ongoing result to hexes and higlight
	let wholeZOC = ZOCring1.concat(ZOCring1Water).concat(ZOCring2).concat(ZOCring3)

	// Now unique the array
	wholeZOC = [...new Set(wholeZOC)]

	// Now remove city IDs
	if (excludeALLcities) {
		let cityIDs = getAllCityHexId()
		for (let i = wholeZOC.length - 1; i >= 0; i--) {
			if (cityIDs.includes(wholeZOC[i])) wholeZOC.splice(i, 1)
		}
	}

	if (excludeALLinns) {
		let innIDs = []
		for (let i = 0; i < store.players.length; i++) {
			const inns = store.players[i].countrysideBuildings.filter((cb) => cb.type === rf.COUNTRYSIDE_BLDG_INN)
			inns.forEach((inn) => innIDs.push(inn.hexId))
		}
		for (let i = wholeZOC.length - 1; i >= 0; i--) {
			if (innIDs.includes(wholeZOC[i])) wholeZOC.splice(i, 1)
		}
	}

	if (ZOCidsOnly) return wholeZOC

	if (allIDSonly) {
		wholeZOC = wholeZOC.concat(seedIDs)
		return wholeZOC
	}

	let resDisplay = []
	for (let i = 0; i < wholeZOC.length; i++) {
		resDisplay.push(map.getHexDataFromID(wholeZOC[i]))
	}

	return resDisplay
}

export function getZOCoutline(playerIndex) {
	const store = useModelStore()

	let path = ""

	// First, get the IDs of ALL hexes
	let wholeZOC = getZocTiles(playerIndex, true)

	for (let i = 0; i < wholeZOC.length; i++) {
		// Only continue if the ZOC ID isn't a tile with a city on it
		// This seems to already be done? Maybe in the display function

		// For each ZOC ID, get the neigbours
		let neighbours = store.mapNeighbours[wholeZOC[i]]
		let neighboursOutsideZOC = []
		for (let j = 0; j < neighbours.length; j++) {
			if (!wholeZOC.includes(neighbours[j])) {
				neighboursOutsideZOC.push(neighbours[j])
			}
		}
		// For each neighbour OUTSIDE ZOC, add a border path
		for (let j = 0; j < neighboursOutsideZOC.length; j++) {
			path += map.getPathBetweenHexIDs(wholeZOC[i], neighboursOutsideZOC[j])
		}
	}

	// This is just debug stuff to see whats going on visually
	/*hexIDtemp.push(startHexID)
	hexIDtemp.push(startHexOutsideZOCid)
	let resDisplay = []
	for (let i = 0; i < hexIDtemp.length; i++) {
		resDisplay.push(map.getHexDataFromID(hexIDtemp[i]))
	}
	store.historyHelpers.hexesToHighlightYellow = resDisplay*/

	// Add this to the display. Current format: [player-colour, path]
	store.ZOCpaths.push([store.players[playerIndex].colour, path])
	/*store.ZOCpaths.push([0, path])
	//store.ZOCpaths.push([1, path])
	//store.ZOCpaths.push([2, path])
	store.ZOCpaths.push([3, path])*/
}

export function getZOCpathsForDottedLines(playerIndexArray) {
	const store = useModelStore()

	let cityHexIDs = getAllCityHexId()
	let innIDs = []
	for (let i = 0; i < store.players.length; i++) {
		const inns = store.players[i].countrysideBuildings.filter((cb) => cb.type === rf.COUNTRYSIDE_BLDG_INN)
		inns.forEach((inn) => innIDs.push(inn.hexId))
	}

	// First gather all the paths that need to be drawn
	let allPaths = []

	// Make all the paths
	for (let i = 0; i < playerIndexArray.length; i++) {
		let playerIndex = playerIndexArray[i]
		let path = []

		// First, get the IDs of ALL hexes
		let wholeZOC = getZocTiles(playerIndex, false, true, true, true)
		for (let i = 0; i < wholeZOC.length; i++) {
			// For each ZOC ID, get the neigbours
			let neighbours = store.mapNeighbours[wholeZOC[i]]
			let neighboursOutsideZOC = []
			for (let j = 0; j < neighbours.length; j++) {
				if (!wholeZOC.includes(neighbours[j])) {
					neighboursOutsideZOC.push(neighbours[j])
				}
			}
			// For each neighbour OUTSIDE ZOC, add a border path
			for (let j = 0; j < neighboursOutsideZOC.length; j++) {
				// Only get a path if NEITHER the ZoC tile NOR neighbour is a city hex
				if (!cityHexIDs.includes(wholeZOC[i]) && !cityHexIDs.includes(neighboursOutsideZOC[j]) && !innIDs.includes(wholeZOC[i]) && !innIDs.includes(neighboursOutsideZOC[j])) path.push(map.getPathBetweenHexIDs(wholeZOC[i], neighboursOutsideZOC[j]))
			}
		}
		allPaths.push([...path])
	} // End of making all paths

	const allPathsWithMultiples = []

	for (let i = 0; i < allPaths.length; i++) {
		for (let j = 0; j < allPaths[i].length; j++) {
			let entry = allPaths[i][j]

			// Check this exact line hasn't already been processed
			const entryProcessed = allPathsWithMultiples.some((alreadyEntry) => alreadyEntry[1] === entry)
			if (!entryProcessed) {
				const matches = [playerIndexArray[i]]
				// Create an array to store the indices of matches

				// Check if any subsequent subarray contains the same entry
				if (i < allPaths.length - 1) {
					for (let ii = i + 1; ii < allPaths.length; ii++) {
						for (let jj = 0; jj < allPaths[ii].length; jj++) {
							if (allPaths[ii][jj] == entry) {
								matches.push(playerIndexArray[ii])
							}
						}
					}
				}

				// Push the entry with the matching indices if matches are found
				allPathsWithMultiples.push([matches, entry])

				// Remove the matched entries from allPaths
				/*for (let k = matches.length - 1; k >= 0; k--) {
			allPaths.splice(matches[k], 1)
		}*/
				// Remove the matched entries from allPaths
				/*for (let k = matches.length - 1; k >= 0; k--) {
				const index = matches[k]
				allPaths[index].splice(allPaths[index].indexOf(entry), 1)
			}*/
			}
		}
	}

	store.ZOCpathsWithMultiples.splice(0)
	store.ZOCpathsWithMultiples.push(...allPathsWithMultiples)
}

// OLD FUNCTION
/*export function hexOccupied(hexId) {
	const store = useModelStore()

	let isOccupiedByCity = false
	let isOccupiedByCountrySideBuildings = false
	let isOccupiedByResources = false

	store.players.forEach((player) => {
		player.countrysideBuildings.forEach((cb) => {
			// Hex occupied by country side buildings (excluding city, handled below)
			if (cb.hexId === hexId) {
				isOccupiedByCountrySideBuildings = true
			}

			// Hex occupied by resources, excluding Pollusion
			cb.resources.forEach((res) => {
				if (map.getDistanceBetweenHex(res.hex, map.getHexDataFromID(hexId).hex) == 0) {
					isOccupiedByResources = true
					return
				}
			})
		})
		// Hex occupied by city (Multiple Hexes)
		player.cities.forEach((city) => {
			if (map.getDistanceBetweenHex(city.hex, map.getHexDataFromID(hexId).hex) <= 1) isOccupiedByCity = true
			return
		})
	})

	return isOccupiedByCountrySideBuildings || isOccupiedByCity || isOccupiedByResources
}*/

export function hexOccupied(hexId) {
	const store = useModelStore()

	for (let i = 0; i < store.players.length; i++) {
		const player = store.players[i]

		for (let j = 0; j < player.countrysideBuildings.length; j++) {
			const cb = player.countrysideBuildings[j]

			if (cb.hexId === hexId) {
				return true // Hex occupied by countryside building
			}

			for (let k = 0; k < cb.resources.length; k++) {
				const res = cb.resources[k]
				if (map.getDistanceBetweenHex(res.hex, map.getHexDataFromID(hexId).hex) === 0) {
					return true // Hex occupied by resources
				}
			}
		}

		for (let l = 0; l < player.cities.length; l++) {
			const city = player.cities[l]
			if (map.getDistanceBetweenHex(city.hex, map.getHexDataFromID(hexId).hex) <= 1) {
				return true // Hex occupied by city
			}
		}
	}

	return false
}

export function removeExplorerFromHexID(hex_id) {
	const store = useModelStore()

	//const index = store.mapData.explorers.findIndex((explorer) => explorer.id === hex_id)
	const index = store.mapData.explorers.indexOf(hex_id)

	if (index !== -1) {
		store.mapData.explorers.splice(index, 1)
	}
}

export function hexPolluted(hexId) {
	const store = useModelStore()
	/*let pollutions = store.mapData.pollution
	for (let i = 0; i < pollutions.length; i++) {
		if (pollutions[i].hexId == hexId) {
			if (pollutions[i].hexId == hexId) {
				return true
		}
	}*/
	const pollutions = store.mapData.pollution

	for (let i = 0; i < pollutions.length; i++) {
		if (pollutions[i] == hexId) return true
	}

	return false
}

function buildingHasResources(building) {
	return building.resources.length > 0
}

/*
	This function returns the expected harvest resources in an array (e.g. [0,0,0,1,4,6]) where each num is an rf.RES_XXX
	Case 1) No Forced Labour (Min 0, Max 1)
	Case 2) Forced Labour (Min 0, Max 2)
*/
export function getExpectedHarvestResources(playerIndex, ismannedForcedLabour) {
	const store = useModelStore()
	let player = store.players[playerIndex]

	let expectedHarvestResources = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

	for (let i = 0; i < player.countrysideBuildings.length; i++) {
		let building = player.countrysideBuildings

		// There are 4 countryside building that produce goods
		if (building[i].type === rf.COUNTRYSIDE_BLDG_WOODCUTTER || building[i].type === rf.COUNTRYSIDE_BLDG_FARM || building[i].type === rf.COUNTRYSIDE_BLDG_MINE || building[i].type === rf.COUNTRYSIDE_BLDG_FISHERY) {
			let res = building[i].resources

			// Check res.length != 0 to handle the fishery case
			if (res.length != 0) {
				if (!ismannedForcedLabour) {
					// Case 1: No Forced Labour (Single Resources)
					expectedHarvestResources[res[0].resType] = expectedHarvestResources[res[0].resType] + 1
				} else {
					// Case 2: Forced Labour (Take 3 Resources, discards first (Min 0, Max 2))
					if (res.length == 2) {
						expectedHarvestResources[res[0].resType] = expectedHarvestResources[res[0].resType] + 1
					} else if (res.length >= 3) {
						expectedHarvestResources[res[0].resType] = expectedHarvestResources[res[0].resType] + 2
					}
				}
			}
		}
	}
	// Convert to flat array
	let res = []
	for (let i = 0; i < expectedHarvestResources.length; i++) {
		for (let j = 0; j < expectedHarvestResources[i]; j++) {
			res.push(i)
		}
	}
	return res
}

export function canAutoHarvest(playerIndex, ismannedForcedLabour) {
	const store = useModelStore()
	let canAutoHarvest = true
	store.players[playerIndex].countrysideBuildings.forEach((building) => {
		if (building.type === rf.COUNTRYSIDE_BLDG_WOODCUTTER || building.type === rf.COUNTRYSIDE_BLDG_FARM || building.type === rf.COUNTRYSIDE_BLDG_MINE) {
			if (!ismannedForcedLabour && building.resources.length >= 3) {
				canAutoHarvest = false
				return
			} else if (ismannedForcedLabour && building.resources.length >= 5) {
				canAutoHarvest = false
				return
			}
		} else if (building.type === rf.COUNTRYSIDE_BLDG_FISHERY) {
			if (!ismannedForcedLabour && building.resources.length >= 2) {
				canAutoHarvest = false
				return
			} else if (ismannedForcedLabour && building.resources.length >= 4) {
				canAutoHarvest = false
				return
			}
		}
	})
	return canAutoHarvest
}

export function doAutoHarvest(playerIndex, ismannedForcedLabour) {
	const store = useModelStore()

	store.context.historyObj.splice(0)
	doAutoHarvest_core(playerIndex, ismannedForcedLabour)
	model.addHistory(rf.HIST_AUTO_HARVEST, playerIndex, 0, [...store.context.historyObj])
	store.context.historyObj.splice(0)
}

export function doAutoHarvest_core(playerIndex, ismannedForcedLabour) {
	const store = useModelStore()
	//collectCathedralFish(playerIndex)
	let player = store.players[playerIndex]
	let buildingToSplice = []
	let buildingToSpliceHexIDs = []

	// Use a counter to NOT return one man per each fishery hex!
	let fisheryManReturnCounter = 0

	for (let i = 0; i < player.countrysideBuildings.length; i++) {
		//for (let i = player.countrysideBuildings.length - 1; i >= 0; i--) {
		let building = player.countrysideBuildings

		if (building[i].type === rf.COUNTRYSIDE_BLDG_WOODCUTTER || building[i].type === rf.COUNTRYSIDE_BLDG_FARM || building[i].type === rf.COUNTRYSIDE_BLDG_MINE || building[i].type === rf.COUNTRYSIDE_BLDG_FISHERY) {
			let res = building[i].resources

			// AUTO WITHOUT FORCED LABOUR - SINGLE RES
			if (!ismannedForcedLabour) {
				let isFisheryWithoutRes = building[i].type === rf.COUNTRYSIDE_BLDG_FISHERY && building[i].refHexId == undefined

				if (res.length == 1) {
					store.context.historyObj.push([res[0].resType, res[0].hexId, 1])
					building[i].resources = []
					// Change the BUILDING hex to grass - this is the last one with the man on it
					// NO, the grass is always added in the model at start. This setting only changes the display
					//if (building[i].type === rf.COUNTRYSIDE_BLDG_WOODCUTTER && store.permanentSettings.keepForestUnderWoodRes) changeHexToGrass(building[i].hexId, building[i].hex)
				} else if (res.length == 2) {
					for (let j = res.length - 1; j >= 0; j--) {
						if (res[j].hexId != building[i].hexId) {
							// Change the RES hex to grass - this is the SECOND last one
							//if (building[i].type === rf.COUNTRYSIDE_BLDG_WOODCUTTER && store.permanentSettings.keepForestUnderWoodRes) changeHexToGrass(res[j].hexId, res[j].hex)
							// Add this history - res // hex ID
							store.context.historyObj.push([res[j].resType, res[j].hexId, 1])
							building[i].resources.splice(j, 1)
						}
					}
				} else {
					if (!isFisheryWithoutRes) alert(`Auto-Harvest Error: Without Manned Labour -- res.length: ${res.length}`)
				}

				// GAIN THE RESOURCE - res[0] has been spliced? But works because of a copy?
				if (!isFisheryWithoutRes) player.availableResources[res[0].resType]++
			}
			// AUTO WITH FORCED LABOUR
			else if (ismannedForcedLabour) {
				if (res.length >= 1 && res.length <= 3) {
					// Change ALL res hexes to grass
					//for (let j = 0; j < res.length; j++) if (building[i].type === rf.COUNTRYSIDE_BLDG_WOODCUTTER && store.permanentSettings.keepForestUnderWoodRes) changeHexToGrass(res[j].hexId, res[j].hex)
					// Add 1 less resource due to the wastage
					for (let j = 0; j < res.length - 1; j++) player.availableResources[res[0].resType]++
					// Add a history; throw the first, collect the rest
					for (let j = 0; j < res.length; j++) {
						if (j === 0) store.context.historyObj.push([res[j].resType, res[j].hexId, 0])
						else store.context.historyObj.push([res[j].resType, res[j].hexId, 1])
					}
					building[i].resources = []
				} else if (res.length == 4) {
					// If exactly 4 res, bin 1 and keep 3 of the NON-MAN resources
					let firstBinned = false
					for (let j = res.length - 1; j >= 0; j--) {
						if (res[j].hexId !== building[i].hexId) {
							// Change res hexe to grass
							//if (building[i].type === rf.COUNTRYSIDE_BLDG_WOODCUTTER && store.permanentSettings.keepForestUnderWoodRes) changeHexToGrass(res[j].hexId, res[j].hex)
							// Add a history; throw the first, collect the rest

							// Reminder: Handle resource gain 1") works because only the 3 outer resources are taken
							// dont take the first res
							if (firstBinned) {
								player.availableResources[res[0].resType]++
								store.context.historyObj.push([res[j].resType, res[j].hexId, 1])
							} else {
								firstBinned = true
								store.context.historyObj.push([res[j].resType, res[j].hexId, 0])
							}
							building[i].resources.splice(j, 1)
						}
					}
				}
			}

			// Return Worker when no more goods avaliable
			if (building[i].resources.length == 0) {
				// Fisherman needs to remove 2 buildings
				// So only return ONCE
				if (building[i].type === rf.COUNTRYSIDE_BLDG_FISHERY) {
					let refHexId = building[i].refHexId
					buildingToSplice.push(i)
					buildingToSpliceHexIDs.push(building[i].hexId)
					//building.splice(i, 1)
					// Locate the other half and remove the building
					for (let k = 0; k < building.length; k++) {
						if (building[k].hexId === refHexId) {
							//building.splice(k, 1)
							buildingToSplice.push(k)
							buildingToSpliceHexIDs.push(building[k].hexId)
						}
					}
					// Fisheries have TWO hexes, so only return on the first hex (even number)
					if (fisheryManReturnCounter % 2 === 0) {
						fisheryManReturnCounter++
						player.availableMen++
					} else fisheryManReturnCounter++
				} else {
					buildingToSplice.push(i)
					buildingToSpliceHexIDs.push(building[i].hexId)
					player.availableMen++
				}
			}
		}
	}

	for (let i = 0; i < buildingToSpliceHexIDs.length; i++) {
		player.countrysideBuildings = player.countrysideBuildings.filter((building) => building.hexId !== buildingToSpliceHexIDs[i])
	}
}

export function collectCathedralFish(playerIndex) {
	const store = useModelStore()

	let player = store.players[playerIndex]
	let fish = 0
	// Must have the right saint
	if (player.saint !== rf.SAINT_GIORGIO && player.saint !== rf.SAINT_MARIA) return
	for (let i = 0; i < store.players.length; i++) {
		/*for (let j = 0; j < store.players[i].cities.length; j++) {
			for (let k = 0; k < store.players[i].cities[j].buildings.length; k++) {
				if (store.players[i].cities[j].buildings[k].bldgNum === rf.BLDG_CATHEDRAL && store.players[i].cities[j].buildings[k].builtThisTurn) {
					fish++
					break
				}
			}
		}*/
		if (store.players[i].cathedralStatus >= 5) store.players[i].cathedralStatus -= 5
		fish += store.players[i].cathedralStatus
		//store.players[i].cathedralStatus = 0
	}
	player.availableResources[rf.RES_FISH] += fish
	if (fish > 0) model.addHistory(rf.HIST_CATHEDRAL_FISH, playerIndex, 0, [fish])
}

/**
 * Return all resources belonged to a player
 * Return the resources below the man only if it is the last
 */
export function getResourcesHexesForHarvest(playerIndex) {
	const store = useModelStore()
	// Reset hexesToHighlight
	store.context.hexesToHighlight.splice(0)

	let resourcesHexes = []
	let mannedForcedLabour = false
	if (city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_FORCED_LABOUR, false)) mannedForcedLabour = true

	/*if (store.context.action != rf.ACT_HARVEST && canAutoHarvest(mannedForcedLabour, playerIndex)) {
		doAutoHarvest(mannedForcedLabour, playerIndex)
		return
	}*/

	store.players[playerIndex].countrysideBuildings.forEach((building) => {
		if (building.type === rf.COUNTRYSIDE_BLDG_WOODCUTTER || building.type === rf.COUNTRYSIDE_BLDG_FARM || building.type === rf.COUNTRYSIDE_BLDG_MINE || building.type === rf.COUNTRYSIDE_BLDG_FISHERY) {
			if (!buildingHasResources(building)) return

			if (building.canHarvest) {
				if (!(building.type === rf.COUNTRYSIDE_BLDG_FISHERY) && building.resources.length === 1) {
					// Highlight the last resources
					resourcesHexes.push({
						hex: building.resources[0].hex,
						id: building.resources[0].hexId, // this should be id
						isDiscardGoods: mannedForcedLabour && building.harvestCount == 0,
					})
				} else {
					for (let i = 0; i < building.resources.length; i++) {
						// The one below the building can only be harvested at last
						if (building.hexId != building.resources[i].hexId) {
							resourcesHexes.push({
								hex: building.resources[i].hex,
								id: building.resources[i].hexId, // this should  be id
								isDiscardGoods: mannedForcedLabour && building.harvestCount == 0,
							})
						}
					}
				}
			}
		}
	})

	// Nothing to highlight, cannot harvest
	if (resourcesHexes.length == 0) {
		// Harvest Done
		// Reset harvestCount, canHarvest
		let building = store.players[playerIndex].countrysideBuildings

		for (let i = 0; i < building.length; i++) {
			if (building[i].type === rf.COUNTRYSIDE_BLDG_WOODCUTTER || building[i].type === rf.COUNTRYSIDE_BLDG_FARM || building[i].type === rf.COUNTRYSIDE_BLDG_MINE || building[i].type === rf.COUNTRYSIDE_BLDG_FISHERY) {
				building[i].canHarvest = true
				building[i].harvestCount = 0
			}
		}

		store.context.noReset = false
		store.context.hexesToHighlight.splice(0)
		return
	}

	store.context.noReset = true
	store.context.action = rf.ACT_HARVEST
	store.context.hexesToHighlight = resourcesHexes
}

/**
 * Handles the removal of the resources
 * Update number of times the buiding has harvested
 */
export function harvestResources(tile, playerIndex) {
	const store = useModelStore()

	harvestResources_core(tile, playerIndex)

	store.context.noReset = false
}

export function harvestResources_core(tile, playerIndex, replayDiscardFlag = false) {
	const store = useModelStore()

	if (tile == undefined) {
		alert("No tile")
		return
	}

	let player = store.players[playerIndex]

	let mannedForcedLabour = false
	if (city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_FORCED_LABOUR, false)) mannedForcedLabour = true

	for (let i = 0; i < player.countrysideBuildings.length; i++) {
		let building = player.countrysideBuildings

		if (building[i].type === rf.COUNTRYSIDE_BLDG_WOODCUTTER || building[i].type === rf.COUNTRYSIDE_BLDG_FARM || building[i].type === rf.COUNTRYSIDE_BLDG_MINE || building[i].type === rf.COUNTRYSIDE_BLDG_FISHERY) {
			let res = building[i].resources
			for (let j = 0; j < res.length; j++) {
				if (res[j].hexId === tile.id) {
					// Check isDiscardGood
					// HEXESTOHIGHLIGHT CANNOT BE IN CORE! MUST BE ABLE TO REPRODUCE FROM HISTORY
					//store.context.hexesToHighlight.forEach((resourcesHexes) => {
					store.mapData.hexes.forEach((resourcesHexes) => {
						if (resourcesHexes.id === tile.id) {
							// isDiscardGoods
							if (tile.isDiscardGoods || replayDiscardFlag === true) {
								// Discard Goods, Harvest Count + 1
								store.context.historyObj.push([res[j].resType, res[j].hexId, 0])
								building[i].resources.splice(j, 1)
								building[i].harvestCount = building[i].harvestCount + 1
								// ONLY DO THIS IF ADDING GRASS POST-HARVEST -- FORCED LABOUR DISCARD HEX MANUAL
								//if (building[i].type === rf.COUNTRYSIDE_BLDG_WOODCUTTER && store.permanentSettings.keepForestUnderWoodRes) changeHexToGrass(tile.id, tile.hex)
							} else {
								// ADD RESOURCE TO THE PLAYER
								player.availableResources[building[i].resources[j].resType]++
								store.context.historyObj.push([res[j].resType, res[j].hexId, 1])
								// Discard Goods, Harvest Count + 1
								building[i].resources.splice(j, 1)
								building[i].harvestCount = building[i].harvestCount + 1
								if (!mannedForcedLabour) {
									building[i].canHarvest = false
								} else {
									if (building[i].harvestCount >= 3) building[i].canHarvest = false
								}
								// ONLY DO THIS IF ADDING GRASS POST-HARVEST -- HARVESTED HEX MANUAL
								//if (building[i].type === rf.COUNTRYSIDE_BLDG_WOODCUTTER && store.permanentSettings.keepForestUnderWoodRes) changeHexToGrass(tile.id, tile.hex)
							}

							// Return Worker when no more goods avaliable
							if (building[i].resources.length == 0) {
								// Fisherman needs to remove 2 buildings
								if (building[i].type === rf.COUNTRYSIDE_BLDG_FISHERY) {
									let refHexId = building[i].refHexId
									building.splice(i, 1)
									// Locate the other half and remove the building
									for (let k = 0; k < building.length; k++) {
										if (building[k].hexId === refHexId) {
											building.splice(k, 1)
										}
									}
									player.availableMen++
								} else {
									building.splice(i, 1)
									player.availableMen++
								}
							}
						}
					})
				}
			}
		}
	}
}

export function changeHexToGrass(_id) {
	const store = useModelStore()

	// Woodcutter turns forest to grass
	/*store.mapData.grass.push({
		icon: "hex_grass_" + Math.floor(Math.random() * 2),
		hexId: _id,
		hex: _hex,
	})*/
	store.mapData.grass.push([_id, Math.floor(Math.random() * 2)])
	store.mapData.hexes.forEach((mapDatahex) => {
		if (mapDatahex.id == _id) {
			mapDatahex.terrainType = rf.TERR_GRASS
		}
	})
}

// Takes in an array of ID's
export function expandWater(idArray, seedIDs) {
	const store = useModelStore()

	let res = [...idArray]
	let toExplo = [...idArray]
	while (toExplo.length > 0) {
		// find all new squares
		let newSquares = []
		for (let i = 0; i < toExplo.length; i++) {
			let neighbours = [...store.mapNeighbours[toExplo[i]]]
			// must be not already found, and also be water
			for (let j = neighbours.length - 1; j >= 0; j--) {
				if (map.getHexDataFromID(neighbours[j]).terrainType !== rf.TERR_WATER || res.includes(neighbours[j]) || seedIDs.includes(neighbours[j])) neighbours.splice(j, 1)
			}
			res = res.concat(neighbours)
			newSquares = newSquares.concat(neighbours)
		}
		toExplo = [...newSquares]
	}
	return res
}

export function expandMountain(idArray) {
	const store = useModelStore()

	let res = [...idArray]
	let toExplo = [...idArray]
	while (toExplo.length > 0) {
		// find all new squares
		let newSquares = []
		for (let i = 0; i < toExplo.length; i++) {
			let neighbours = [...store.mapNeighbours[toExplo[i]]]
			// must be not already found, and also be water
			for (let j = neighbours.length - 1; j >= 0; j--) {
				if (map.getHexDataFromID(neighbours[j]).terrainType !== rf.TERR_MOUNTAINS || res.includes(neighbours[j])) neighbours.splice(j, 1)
			}
			res = res.concat(neighbours)
			newSquares = newSquares.concat(neighbours)
		}
		toExplo = [...newSquares]
	}
	return res
}

// OLD FUNCTION
/*export function getWoodcutterPlacementZone(playerIndex) {
	//const store = useModelStore()

	const zoc = getZocTiles(playerIndex, false)

	// Instead of setting hex.isAllowed true or false,
	// just remove the whole hex from the highlight options

	for (let i = zoc.length - 1; i >= 0; i--) {
		let allowedHex = true
		if (hexOccupied(zoc[i].id)) allowedHex = false
		else if (hexPolluted(zoc[i].id)) allowedHex = false
		else if (zoc[i].terrainType !== rf.TERR_FOREST) allowedHex = false
		// Not needed because the base terrain is changed?
		/*else {
			// Not allow to place on grass THAT USED TO BE FOREST
			for (let j = 0; j < store.mapData.grass.length; j++) {
				if (store.mapData.grass[j].hexId === zoc[i].id) {
					allowedHex = false
					break
				}
			}
		}*/
/*if (!allowedHex) zoc.splice(i, 1)
	}

	//store.context.hexesToHighlight = zoc
	return zoc
}*/

export function getWoodcutterPlacementZone(playerIndex, zoc = [], checkAny = false) {
	//const zoc = getZocTiles(playerIndex, false)
	if (zoc.length === 0) zoc = getZocTiles(playerIndex, false)

	/*const filteredZoc = zoc.filter((hex) => {
		if (hexOccupied(hex.id) || hexPolluted(hex.id) || hex.terrainType !== rf.TERR_FOREST) {
			return false
		}
		return true
	})*/
	if (checkAny) {
		for (const hex of zoc) {
			if (hex.terrainType === rf.TERR_FOREST && !hexOccupied(hex.id) && !hexPolluted(hex.id)) {
				return true
			}
		}
		return false
	}

	const filteredZoc = zoc.reduce((acc, hex) => {
		if (hex.terrainType === rf.TERR_FOREST && !hexOccupied(hex.id) && !hexPolluted(hex.id)) {
			acc.push(hex)
		}
		return acc
	}, [])

	return filteredZoc
}

export function getCityTiles() {
	const store = useModelStore()

	const ct = []
	store.players.forEach((player) => {
		player.cities.forEach((city) => {
			ct.push(city.hex)
		})
	})

	return ct
}

export function getAllCityHexId() {
	const store = useModelStore()
	let allCityTiles = getCityTiles()
	let allCityHexID = []

	for (let i = 0; i < allCityTiles.length; i++) {
		let { q, r, s } = allCityTiles[i]
		let centerHexId = map.getIDfromHex({ q, r, s })
		let neighbours = store.mapNeighbours[centerHexId]
		allCityHexID = allCityHexID.concat(neighbours.concat(centerHexId))
		// Use this for array of arrays of each city hex IDS
		// allCityHexID.push(neighbours.concat(centerHexId))
	}
	return allCityHexID
}

// OLD FUNCTION
/*export function getFarmPlacementZone(playerIndex) {
	const store = useModelStore()
	const zoc = getZocTiles(playerIndex, false)

	//console.log(JSON.stringify(store.mapData.grass))

	for (let i = zoc.length - 1; i >= 0; i--) {
		let allowedHex = false
		if (
			//(zoc[i].terrainType === rf.TERR_PLAINS || zoc[i].terrainType === rf.TERR_GRASS) && // Woodcutter turns forest to grass
			(zoc[i].terrainType === rf.TERR_PLAINS || store.mapData.grass.some((subArr) => subArr[0] === zoc[i].id)) && // Woodcutter turns forest to grass
			!hexOccupied(zoc[i].id) &&
			!hexPolluted(zoc[i].id)
		) {
			allowedHex = true
		}
		if (!allowedHex) zoc.splice(i, 1)
	}

	//store.context.hexesToHighlight = zoc
	return zoc
}*/

export function getFarmPlacementZone(playerIndex, zoc = [], checkAny = false) {
	//const store = useModelStore()
	//const zoc = getZocTiles(playerIndex, false)
	if (zoc.length === 0) zoc = getZocTiles(playerIndex, false)

	//const grassTiles = store.mapData.grass.map((subArr) => subArr[0])

	/*const filteredZoc = zoc.filter((tile) => {
		return (tile.terrainType === rf.TERR_PLAINS || grassTiles.includes(tile.id)) && !hexOccupied(tile.id) && !hexPolluted(tile.id)
	})*/
	if (checkAny) {
		for (const hex of zoc) {
			if ((hex.terrainType === rf.TERR_PLAINS || hex.terrainType === rf.TERR_GRASS) && !hexOccupied(hex.id) && !hexPolluted(hex.id)) {
				return true
			}
		}
		return false
	}

	const filteredZoc = zoc.reduce((acc, hex) => {
		if ((hex.terrainType === rf.TERR_PLAINS || hex.terrainType === rf.TERR_GRASS) && !hexOccupied(hex.id) && !hexPolluted(hex.id)) {
			acc.push(hex)
		}
		return acc
	}, [])

	return filteredZoc
}
// OLD FUNCTION
// Basically check if it is NOT water, but a neighbout IS
/*export function isCoastal(hexId) {
	const store = useModelStore()

	// Check it isn't water
	let hexData = map.getHexDataFromID(hexId)
	if (hexData.terrainType === rf.TERR_WATER) return false

	const cities = getAllCityHexId().flat()
	const neighbours = store.mapNeighbours[hexId]
	//const isCoastal = neighbours.find((n) => {
	//	if (hexPolluted(n)) return false
	//	if (cities.includes(n)) return false
	//	const neighborHex = map.getHexDataFromID(n)
	//	if (neighborHex.terrainType === rf.TERR_WATER) return true
	//	return false
	//})
	// So now a neightbour must be water
	for (let i = 0; i < neighbours.length; i++) {
		// If it isn't a city hex
		if (!cities.includes(neighbours[i])) {
			const neighborHex = map.getHexDataFromID(neighbours[i])
			// Must have an UNPOLLUTED water next to it to count as "coastal"
			if (neighborHex.terrainType === rf.TERR_WATER && !hexPolluted(neighbours[i])) return true
		}
	}

	return false

	//return !!isCoastal
}*/

export function isCoastal(hexId) {
	const store = useModelStore()
	const hexData = map.getHexDataFromID(hexId)

	if (hexData.terrainType === rf.TERR_WATER) return false

	const cities = getAllCityHexId().flat()
	const neighbours = store.mapNeighbours[hexId]
	return neighbours.some((n) => !cities.includes(n) && !hexPolluted(n) && map.getHexDataFromID(n).terrainType === rf.TERR_WATER)

	//return isCoastal

	/*for (let i = 0; i < neighbours.length; i++) {
		if (!cities.includes(neighbours[i])) {
			const neighborHex = map.getHexDataFromID(neighbours[i])
			if (neighborHex.terrainType === rf.TERR_WATER && !hexPolluted(neighbours[i])) {
				return true
			}
		}
	}

	return false*/
}
// OLD FUNCTION
/*export function getFishermanSecondtiles(hex) {
	const store = useModelStore()
	const hexNeighbours = store.mapNeighbours[hex.id]

	const fishermanTiles = hexNeighbours.filter((hn) => {
		if (hexOccupied(hn)) return false
		if (!isCoastal(hn)) return false

		const h = map.getHexDataFromID(hn)
		if (h.terrainType === rf.TERR_WATER) return false

		return true
	})

	return fishermanTiles
}*/
export function getFishermanSecondtiles(hex, checkAny) {
	const store = useModelStore()
	const hexNeighbours = store.mapNeighbours[hex.id]

	/*const fishermanTiles = hexNeighbours.filter((hn) => {
		if (hexOccupied(hn) || !isCoastal(hn)) {
			return false
		}

		const neighborHexData = map.getHexDataFromID(hn)
		if (neighborHexData.terrainType === rf.TERR_WATER) {
			return false
		}

		return true
	})*/
	if (checkAny) {
		for (const hn of hexNeighbours) {
			if (!hexOccupied(hn) && isCoastal(hn)) {
				const neighborHexData = map.getHexDataFromID(hn)
				if (neighborHexData.terrainType !== rf.TERR_WATER) {
					if (checkAny) return true
				}
			}
		}
		return false
	}

	const fishermanTiles = hexNeighbours.reduce((acc, hn) => {
		if (hexOccupied(hn) || !isCoastal(hn)) {
			return acc
		}

		const neighborHexData = map.getHexDataFromID(hn)
		if (neighborHexData.terrainType !== rf.TERR_WATER) {
			acc.push(hn)
		}

		return acc
	}, [])

	return fishermanTiles
}

// OLD FUNCTION
/*export function getFishermanPlacementZone(playerIndex) {
	//const store = useModelStore()
	const zoc = getZocTiles(playerIndex, false)

	for (let i = zoc.length - 1; i >= 0; i--) {
		let allowedHex = true
		if (hexOccupied(zoc[i].id)) allowedHex = false
		else if (zoc[i].terrainType === rf.TERR_WATER) allowedHex = false
		else if (!isCoastal(zoc[i].id)) allowedHex = false
		else if (getFishermanSecondtiles(zoc[i]).length === 0) allowedHex = false

		if (!allowedHex) zoc.splice(i, 1)
	}

	//store.context.hexesToHighlight = zoc
	return zoc
}*/
export function getFishermanPlacementZone(playerIndex, zoc = [], checkAny = false) {
	//return [331,331]
	//const zoc = getZocTiles(playerIndex, false)
	if (zoc.length === 0) zoc = getZocTiles(playerIndex, false)

	/*const filteredZoc = zoc.filter((tile) => {
		if (hexOccupied(tile.id) || tile.terrainType === rf.TERR_WATER || !isCoastal(tile.id) || getFishermanSecondtiles(tile).length === 0) {
			return false
		}
		return true
	})*/

	if (checkAny) {
		for (const hex of zoc) {
			if (hex.terrainType !== rf.TERR_WATER && !hexOccupied(hex.id) && isCoastal(hex.id) && getFishermanSecondtiles(hex, true)) {
				return true
			}
		}
		return false
	}

	const filteredZoc = zoc.reduce((acc, hex) => {
		if (hex.terrainType !== rf.TERR_WATER && !hexOccupied(hex.id) && isCoastal(hex.id) && getFishermanSecondtiles(hex, true)) {
			acc.push(hex)
		}
		return acc
	}, [])

	return filteredZoc
}

// OLD FUNCTION
/*export function getMinePlacementZone(playerIndex, res) {
	//const store = useModelStore()
	const zoc = getZocTiles(playerIndex, false)

	/**
	 * Flow: ONLY FOR METHOD 1
	 * Click Mine
	 * Show Region
	 * Click Tile
	 * Place Good/ Allow Selection
	 */
/*
	for (let i = zoc.length - 1; i >= 0; i--) {
		let allowedHex = true
		if (hexOccupied(zoc[i].id)) allowedHex = false
		else if (hexPolluted(zoc[i].id)) allowedHex = false
		else if (zoc[i].terrainType !== rf.TERR_MOUNTAINS) allowedHex = false
		else if (
			!(zoc[i].mountainType === rf.MOUNTAIN_NONE) && // If Mountain type has been set; AND
			!(zoc[i].mountainType === (res === rf.RES_STONE ? rf.MOUNTAIN_STONE : rf.MOUNTAIN_GOLD))
		)
			// MountainType does not equal the good selected
			allowedHex = false

		if (!allowedHex) zoc.splice(i, 1)
	}

	//store.context.hexesToHighlight = zoc
	return zoc
}*/

export function getMinePlacementZone(playerIndex, res, zoc = [], checkAny = false) {
	//const zoc = getZocTiles(playerIndex, false)
	if (zoc.length === 0) zoc = getZocTiles(playerIndex, false)

	// Filter the zoc array to include only valid mine placement zones
	/*const filteredZoc = zoc.filter((tile) => {
		if (tile.terrainType !== rf.TERR_MOUNTAINS ||hexOccupied(tile.id) || hexPolluted(tile.id)) return false

		if (tile.mountainType !== rf.MOUNTAIN_NONE && tile.mountainType !== (res === rf.RES_STONE ? rf.MOUNTAIN_STONE : rf.MOUNTAIN_GOLD)) return false

		return true
	})*/
	if (checkAny) {
		for (const tile of zoc) {
			if (tile.terrainType === rf.TERR_MOUNTAINS && !hexOccupied(tile.id) && !hexPolluted(tile.id) && (tile.mountainType === rf.MOUNTAIN_NONE || tile.mountainType !== (res === rf.RES_STONE ? rf.MOUNTAIN_STONE : rf.MOUNTAIN_GOLD))) {
				return true
			}
		}
		return false
	}

	const filteredZoc = zoc.reduce((acc, tile) => {
		if (tile.terrainType !== rf.TERR_MOUNTAINS || hexOccupied(tile.id) || hexPolluted(tile.id) || (tile.mountainType !== rf.MOUNTAIN_NONE && tile.mountainType !== (res === rf.RES_STONE ? rf.MOUNTAIN_STONE : rf.MOUNTAIN_GOLD))) {
			return acc
		}

		acc.push(tile)
		return acc
	}, [])

	return filteredZoc
}

// OLD FUNCTION
/*export function getInnPlacementZone(playerIndex) {
	const store = useModelStore()
	const zoc = getZocTiles(playerIndex, false)

	for (let i = zoc.length - 1; i >= 0; i--) {
		let allowedHex = true
		if (hexOccupied(zoc[i].id)) allowedHex = false
		else if (zoc[i].terrainType === rf.TERR_WATER) allowedHex = false

		if (!allowedHex) zoc.splice(i, 1)
	}

	store.context.hexesToHighlight = zoc
}*/
export function getInnPlacementZone(playerIndex) {
	const store = useModelStore()
	const zoc = getZocTiles(playerIndex, false)

	/*const filteredZoc = zoc.filter((tile) => {
		return !hexOccupied(tile.id) && tile.terrainType !== rf.TERR_WATER
	})*/
	const filteredZoc = zoc.reduce((acc, tile) => {
		if (!hexOccupied(tile.id) && tile.terrainType !== rf.TERR_WATER) {
			acc.push(tile)
		}
		return acc
	}, [])

	store.context.hexesToHighlight = filteredZoc
}

function hasCityinMap(mapHex) {
	let result = false
	const store = useModelStore()

	store.players.forEach((player) => {
		player.cities.forEach((city) => {
			// Get All city.hex
			// if(building.type == rf.COUNTRYSIDE_BLDG_CITY){
			// Check if city in map
			mapHex.forEach((hex) => {
				let cityID = map.getIDfromHex(city.hex)
				let mapHexID = map.getIDfromHex(hex.hex)
				if (cityID === mapHexID) {
					result = true
				}
			})
			// }
		})
	})

	return result
}

export function getCityStartLocations(playerCount) {
	const store = useModelStore()
	const tiles = store.mapData.hexes
	store.context.action = rf.ACT_PLACE_FIRST_CITY

	const p1 = []
	const p2 = []
	const p3 = []
	const p4 = []

	//const layoutConfig = rf.MAP_LAYOUTS.find((layout) => layout.players === playerCount)
	const layoutConfig = store.currentLayout

	if (playerCount === 2) {
		tiles.forEach((tile) => {
			const p2Offset = layoutConfig.tileOffsets[3]

			if (Math.min(tile.hex.q, tile.hex.r, tile.hex.s) > -4 && Math.max(tile.hex.q, tile.hex.r, tile.hex.s) < 4) {
				p1.push(tile)
			}

			if (Math.min(tile.hex.q - p2Offset[0], tile.hex.r - p2Offset[1], 0 - (tile.hex.q - p2Offset[0] + tile.hex.r - p2Offset[1])) > -4 && Math.max(tile.hex.q - p2Offset[0], tile.hex.r - p2Offset[1], 0 - (tile.hex.q - p2Offset[0] + tile.hex.r - p2Offset[1])) < 4) {
				p2.push(tile)
			}
		})

		return [p1, p2]
	}

	if (playerCount === 3) {
		tiles.forEach((tile) => {
			const p1Offset = layoutConfig.tileOffsets[0]
			const p2Offset = layoutConfig.tileOffsets[3]
			const p3Offset = layoutConfig.tileOffsets[5]

			if (Math.min(tile.hex.q - p1Offset[0], tile.hex.r - p1Offset[1], 0 - (tile.hex.q - p1Offset[0] + tile.hex.r - p1Offset[1])) > -4 && Math.max(tile.hex.q - p1Offset[0], tile.hex.r - p1Offset[1], 0 - (tile.hex.q - p1Offset[0] + tile.hex.r - p1Offset[1])) < 4) {
				p1.push(tile)
			}

			if (Math.min(tile.hex.q - p2Offset[0], tile.hex.r - p2Offset[1], 0 - (tile.hex.q - p2Offset[0] + tile.hex.r - p2Offset[1])) > -4 && Math.max(tile.hex.q - p2Offset[0], tile.hex.r - p2Offset[1], 0 - (tile.hex.q - p2Offset[0] + tile.hex.r - p2Offset[1])) < 4) {
				p2.push(tile)
			}

			if (Math.min(tile.hex.q - p3Offset[0], tile.hex.r - p3Offset[1], 0 - (tile.hex.q - p3Offset[0] + tile.hex.r - p3Offset[1])) > -4 && Math.max(tile.hex.q - p3Offset[0], tile.hex.r - p3Offset[1], 0 - (tile.hex.q - p3Offset[0] + tile.hex.r - p3Offset[1])) < 4) {
				p3.push(tile)
			}
		})

		return [p1, p2, p3]
	}

	if (playerCount === 4) {
		tiles.forEach((tile) => {
			const p1Offset = layoutConfig.tileOffsets[0]
			const p2Offset = layoutConfig.tileOffsets[2]
			const p3Offset = layoutConfig.tileOffsets[5]
			const p4Offset = layoutConfig.tileOffsets[7]

			if (Math.min(tile.hex.q - p1Offset[0], tile.hex.r - p1Offset[1], 0 - (tile.hex.q - p1Offset[0] + tile.hex.r - p1Offset[1])) > -4 && Math.max(tile.hex.q - p1Offset[0], tile.hex.r - p1Offset[1], 0 - (tile.hex.q - p1Offset[0] + tile.hex.r - p1Offset[1])) < 4) {
				p1.push(tile)
			}

			if (Math.min(tile.hex.q - p2Offset[0], tile.hex.r - p2Offset[1], 0 - (tile.hex.q - p2Offset[0] + tile.hex.r - p2Offset[1])) > -4 && Math.max(tile.hex.q - p2Offset[0], tile.hex.r - p2Offset[1], 0 - (tile.hex.q - p2Offset[0] + tile.hex.r - p2Offset[1])) < 4) {
				p2.push(tile)
			}

			if (Math.min(tile.hex.q - p3Offset[0], tile.hex.r - p3Offset[1], 0 - (tile.hex.q - p3Offset[0] + tile.hex.r - p3Offset[1])) > -4 && Math.max(tile.hex.q - p3Offset[0], tile.hex.r - p3Offset[1], 0 - (tile.hex.q - p3Offset[0] + tile.hex.r - p3Offset[1])) < 4) {
				p3.push(tile)
			}

			if (Math.min(tile.hex.q - p4Offset[0], tile.hex.r - p4Offset[1], 0 - (tile.hex.q - p4Offset[0] + tile.hex.r - p4Offset[1])) > -4 && Math.max(tile.hex.q - p4Offset[0], tile.hex.r - p4Offset[1], 0 - (tile.hex.q - p4Offset[0] + tile.hex.r - p4Offset[1])) < 4) {
				p4.push(tile)
			}
		})

		return [p1, p2, p3, p4]
	}
	return null
}

export function getFirstCityPlacementZone() {
	const store = useModelStore()
	//if (store.gameflow.turnOrder.length === 1) return
	let initialHexes = []
	let cityStartLocations = getCityStartLocations(store.players.length)

	for (let i = 0; i < store.players.length; i++) {
		if (!hasCityinMap(cityStartLocations[i])) {
			cityStartLocations[i].forEach((hex) => {
				//hex.isAllowed = true
				initialHexes.push(hex)
			})
		}
	}

	store.context.countryBuildingBeingPlaced = rf.COUNTRYSIDE_BLDG_CITY
	store.context.hexesToHighlight = initialHexes
}

// OLD FUNCTION
/*export function getCityPlacementZone(playerIndex) {
	const store = useModelStore()

	const zoc = getZocTiles(playerIndex, false)
	// Req: City can be placed if at least one hex inside the ZoC
	let wking_zoc = []

	zoc.forEach((hex) => {
		store.mapNeighbours[hex.id].forEach((hexId) => {
			wking_zoc.push(map.getHexDataFromID(hexId))
		})
	})
	wking_zoc = [...new Set(wking_zoc)]

	//wking_zoc.forEach((hex) => {
	//	//hex.isAllowed = true
//
	//	// Req: Only the first city can be build over water (Handled exceptional cases caused by adding neighbour of ZoC)
	//	if (hex.terrainType === rf.TERR_WATER) {
	//		//hex.isAllowed = false
	//		return
	//	}
	//	if (hexOccupied(hex.id)) {
	//		//hex.isAllowed = false
	//		return
	//	}
//
	//	const centerHexNeighbours = store.mapNeighbours[hex.id]
	//	// Req: Need to Fit in Map
	//	if (centerHexNeighbours.length < 6) {
	//		//hex.isAllowed = false
	//		return
	//	}
//
	//	centerHexNeighbours.forEach((hexId) => {
	//		// Req: No buildings over existing buildings
	//		if (hexOccupied(hexId)) {
	//			//hex.isAllowed = false
	//		}
	//		// Req: Only the first city can be build over water
	//		if (map.getHexDataFromID(hexId).terrainType === rf.TERR_WATER) {
	//			//hex.isAllowed = false
	//		}
	//	})
//
	//	// Req: No adjacent to other cities (Displacemet >= 4)
	//	store.players.forEach((player) => {
	//		player.cities.forEach((city) => {
	//			const hexDisplacement = map.getDistanceBetweenHex(hex.hex, city.hex)
	//			if (hexDisplacement < 4) {
	//				//hex.isAllowed = false
	//			}
	//		})
	//	})
//
	//	// Req: Cities may not be placed over hexes containing goods or men
	//	// Can cover pollution
	//})

	for (let i = wking_zoc.length - 1; i >= 0; i--) {
		let allowedHex = true
		if (wking_zoc[i].terrainType === rf.TERR_WATER) allowedHex = false
		else if (hexOccupied(wking_zoc[i].id)) allowedHex = false
		else {
			const centerHexNeighbours = store.mapNeighbours[wking_zoc[i].id]
			// Req: Need to Fit in Map
			if (centerHexNeighbours.length < 6) allowedHex = false
			else {
				for (let j = 0; j < centerHexNeighbours.length; j++) {
					if (hexOccupied(centerHexNeighbours[j]) || map.getHexDataFromID(centerHexNeighbours[j]).terrainType === rf.TERR_WATER) {
						allowedHex = false
						break
					}
				}
			}
			// If not yet disallowed, check displacement
			// Req: No adjacent to other cities (Displacemet >= 4)
			store.players.forEach((player) => {
				player.cities.forEach((city) => {
					const hexDisplacement = map.getDistanceBetweenHex(wking_zoc[i].hex, city.hex)
					if (hexDisplacement < 4) {
						allowedHex = false
					}
				})
			})
		}

		if (!allowedHex) wking_zoc.splice(i, 1)
	}

	return wking_zoc
}*/

export function getCityPlacementZone(playerIndex, zoc = [], checkAny = false) {
	const store = useModelStore()

	//const zoc = getZocTiles(playerIndex, false);
	if (zoc.length === 0) zoc = getZocTiles(playerIndex, false)

	let workingZoc = []

	zoc.forEach((hex) => {
		store.mapNeighbours[hex.id].forEach((hexId) => {
			workingZoc.push(map.getHexDataFromID(hexId))
		})
	})
	workingZoc = [...new Set(workingZoc)]

	/*const filteredZoc = workingZoc.filter((hex) => {
		if (hex.terrainType === rf.TERR_WATER || store.mapNeighbours[hex.id].length < 6 || hexOccupied(hex.id) || store.players.some((player) => player.cities.some((city) => map.getDistanceBetweenHex(hex.hex, city.hex) < 4)) || store.mapNeighbours[hex.id].some((neighbourId) => hexOccupied(neighbourId) || map.getHexDataFromID(neighbourId).terrainType === rf.TERR_WATER)) {
			return false
		}

		return true
	})*/

	if (checkAny) {
		for (const hex of workingZoc) {
			if (hex.terrainType !== rf.TERR_WATER && store.mapNeighbours[hex.id].length >= 6 && !hexOccupied(hex.id)) {
				if (!store.players.some((player) => player.cities.some((city) => map.getDistanceBetweenHex(hex.hex, city.hex) < 4)) && !store.mapNeighbours[hex.id].some((neighbourId) => hexOccupied(neighbourId) || map.getHexDataFromID(neighbourId).terrainType === rf.TERR_WATER)) return true
			}
		}
		return false
	}

	const filteredZoc = workingZoc.reduce((acc, hex) => {
		if (hex.terrainType === rf.TERR_WATER || store.mapNeighbours[hex.id].length < 6 || hexOccupied(hex.id) || store.players.some((player) => player.cities.some((city) => map.getDistanceBetweenHex(hex.hex, city.hex) < 4)) || store.mapNeighbours[hex.id].some((neighbourId) => map.getHexDataFromID(neighbourId).terrainType === rf.TERR_WATER) || store.mapNeighbours[hex.id].some((neighbourId) => hexOccupied(neighbourId))) {
			return acc
		}

		acc.push(hex)
		return acc
	}, [])

	return filteredZoc
}

export function getPollutionPlacementZone(playerIndex) {
	const store = useModelStore()
	const personal = usePersonalStore()

	const zoc = getZocTiles(playerIndex, false)

	const dumpRestrictedTiles = new Set()

	store.players.forEach((player, index) => {
		if (city.hasWorkingUniqueBuilding(index, rf.BLDG_DUMP) && index != playerIndex) {
			getZocTiles(index, true, true).forEach((hexId) => dumpRestrictedTiles.add(hexId))
		}
	})

	let disallowedHexesIDs = []

	const allowedHexes = zoc.filter((hex) => {
		if (hexOccupied(hex.id)) return false
		if (hexPolluted(hex.id)) return false
		if (dumpRestrictedTiles.has(hex.id)) {
			disallowedHexesIDs.push(hex.id)
			return false
		}
		return true
	})

	// TEST TO CHECK POLLUTION -> GRAVES
	// WARNING this is messsed up by the watch function on reset turn
	//allowedHexes.splice(0)

	// TEST TO CHECK POLL -> GRAVES
	//zoc.push({"id":72,"terrainType":2,"rotation":0,"hex":{"q":-2,"r":-2,"s":4},"mountainType":-1})

	// Set up the red outline
	store.historyHelpers.hexesToOutlineRed.splice(0)
	if (personal.canPlay() && store.gameflow.phase === rf.PHASE_POLLUTION) {
		for (let i = 0; i < disallowedHexesIDs.length; i++) {
			store.historyHelpers.hexesToOutlineRed.push(map.getHexDataFromID(disallowedHexesIDs[i]))
		}
	}

	return allowedHexes
}

export function getPollutionPlacementZonePRETURN(playerIndex) {
	const store = useModelStore()
	const personal = usePersonalStore()

	const zoc = getZocTiles(playerIndex, false, false, true, true)

	const dumpRestrictedTiles = new Set()

	store.players.forEach((player, index) => {
		if (city.hasWorkingUniqueBuilding(index, rf.BLDG_DUMP) && index != playerIndex) {
			getZocTiles(index, true, true).forEach((hexId) => dumpRestrictedTiles.add(hexId))
		}
	})

	let disallowedHexesIDs = []
	const allowedHexes = zoc.filter((hex) => {
		const store = useModelStore()
		if (hexOccupied(hex.id)) {
			if (store.context.gameflowPhase >= rf.PHASE_EXPLORE) return false
			if (store.gameflow.phase === rf.PRE_PHASE_POLLUTION && store.context.historyObj.length > 0 && store.context.historyObj[0].includes(hex.id)) return false

			// EXTRA CODE TO REMOVE CITIES / INNS -- SHOULD NOW BE DONE IN THE INITIAL ZoC FETCH
			/*for (let i = 0; i < store.players.length; i++) {
				const player = store.players[i];
				
				// Disallow pollution placement on City
				for (let l = 0; l < player.cities.length; l++){
					const city = player.cities[l]
					if (map.getDistanceBetweenHex(city.hex, map.getHexDataFromID(hex.id).hex) <= 1) {	
						return false // Hex occupied by city
					}
				}
				// Disallow pollution placement on Inn
				for (let l = 0; l < player.countrysideBuildings.length; l++){
					const cb = player.countrysideBuildings[l];
					if(cb.type === rf.COUNTRYSIDE_BLDG_INN){
						return false
					}
				}
			}*/

			return true
		}
		if (hexPolluted(hex.id)) return false
		if (dumpRestrictedTiles.has(hex.id)) {
			disallowedHexesIDs.push(hex.id)
			return false
		}
		// Repeat this for unoccupied hexes
		if (store.context.historyObj.includes(hex.id)) return false
		return true
	})

	// TEST TO CHECK POLL -> GRAVES
	//zoc.push({"id":72,"terrainType":2,"rotation":0,"hex":{"q":-2,"r":-2,"s":4},"mountainType":-1})

	// Set up the red outline
	store.historyHelpers.hexesToOutlineRed.splice(0)
	if (personal.canPlay() && store.gameflow.phase === rf.PRE_PHASE_POLLUTION) {
		for (let i = 0; i < disallowedHexesIDs.length; i++) {
			store.historyHelpers.hexesToOutlineRed.push(map.getHexDataFromID(disallowedHexesIDs[i]))
		}
	}

	return allowedHexes
}

export function getResourcesForHarvestZone(playerIndex) {
	const store = useModelStore()
	let zone = []

	store.players[playerIndex].countrysideBuildings.forEach((cb) => {
		if (buildingHasResources(cb)) {
			cb.resources.forEach((res) => {
				zone.push({
					id: res.hexId,
					hex: res.hex,
					isAllowed: true,
				})
			})
		}
	})

	// TODO: Need to handle phase?
	store.context.action = rf.ACT_HARVEST
	store.context.tilePlacementZone = zone
}

export function setMountainType(hex, goodsToBeProduced) {
	const store = useModelStore()

	// Find connected Mountain
	if (hex.terrainType != rf.TERR_MOUNTAINS) {
		alert("Err in setMountainType")
	}

	let hexIdToChangeType = expandMountain([hex.id])

	// Set the mountain type to goodsToBeProduced
	for (let i = 0; i < hexIdToChangeType.length; i++) {
		if (store.mapData.hexes[hexIdToChangeType[i]].mountainType != rf.MOUNTAIN_NONE) {
			alert("Err in setMountainType")
			return
		} else if (goodsToBeProduced === rf.RES_STONE) {
			store.mapData.hexes[hexIdToChangeType[i]].mountainType = rf.MOUNTAIN_STONE
		} else if (goodsToBeProduced === rf.RES_GOLD) {
			store.mapData.hexes[hexIdToChangeType[i]].mountainType = rf.MOUNTAIN_GOLD
		}
	}
}

export function placeBuilding(playerIndex, hex) {
	const store = useModelStore()
	//if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_WOODCUTTER) store.context.goodsToBeProduced = rf.RES_WOOD

	// MINE
	// If MINE and NO res selected, just go to res selection
	if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_MINE && store.context.goodsToBeProduced == -1) {
		if (store.mapData.hexes[hex.id].mountainType === rf.MOUNTAIN_NONE) {
			store.context.hexSelectedForMine = hex
			store.context.noReset = true
			//newBuilding == rf.COUNTRYSIDE_BLDG_MINE
			store.context.action = rf.ACT_PLACE_COUNTRYSIDE_BLDG_MINE_SELECT_TYPE
			// Remove the highlight
			store.context.hexesToHighlight.splice(0)
			// Set the first history entry to 1 (manual selection)
			/* METHOD 1 HIST
			store.context.historyObj.splice(0) 
			store.context.historyObj.push(1)
			*/
			// METHOD 2 HIST. historyObj is already initialized with entry 0 being -1
			store.context.historyObj[0] = 1
			return
		}
		// Set the first entry to be 0 (auto selected)
		else {
			/* METHOD 1 HIST
			//store.context.historyObj.splice(0) 
			store.context.historyObj.push(0)
			*/
			store.context.historyObj[0] = 0
			// remove mine oulines
			store.clearHistoryHelpers()
		}
	}

	// FISHERY
	// If fishery and NO first hex, return
	if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FISHERY && store.context.previousStep.length === 0) {
		//let newBuilding = store.context.countryBuildingBeingPlaced
		let building = {
			type: rf.COUNTRYSIDE_BLDG_FISHERY,
			hexId: hex.id,
			hex: hex.hex,
			resources: [],
			harvestCount: 0,
			// Resources will be pushed into building below, Initial Value set to True
			canHarvest: true,
		}

		store.context.noReset = true
		store.context.previousStep = building

		const allowedHexIds = getFishermanSecondtiles(hex)

		store.context.hexesToHighlight = allowedHexIds.map((hexId) => ({
			...map.getHexDataFromID(hexId),
		}))

		placeFirstFisheryHex_core(playerIndex, map.getHexDataFromID(store.context.previousStep.hexId), store.context.goodsToBeProduced)
		store.context.needToPlaceSecondFisheryHex = true
		return
	}
	// If fishery AND already done first step
	else if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FISHERY) {
		//} && store.context.previousStep.length > 0)  {
		store.context.noReset = false

		placeSecondFisheryHex_core(playerIndex, hex, store.context.goodsToBeProduced, store.context.previousStep.hexId)
		model.addHistory(rf.HIST_FISHERY, playerIndex, 0, [[hex.id, store.context.previousStep.hexId], store.context.goodsToBeProduced, [...store.context.historyObj]])
		store.context.historyObj.splice(0)
		store.clearVars()
		// Update country build data
		model.updateCountryBuildCalclation(playerIndex, false)
		// Add an undo point
		model.createUndoPoint()
		return
	}

	// Otherwise, place the building into the model
	store.context.noReset = false

	const histFreeSeedUsedRet = placeBuilding_core(playerIndex, hex, store.context.countryBuildingBeingPlaced, store.context.goodsToBeProduced)

	// remove mine oulines
	store.clearHistoryHelpers()

	// Update country build data
	if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_INN) model.updateCountryBuildCalclation(playerIndex, true)
	else model.updateCountryBuildCalclation(playerIndex, false)

	// Add history
	if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_WOODCUTTER) {
		model.addHistory(rf.HIST_WOODCUTTER, playerIndex, 0, [map.getIDfromHex(hex.hex), [...store.context.historyObj]])
	} else if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_MINE) {
		//KBBR TODO: Need to change this for history update?
		model.addHistory(rf.HIST_MINE, playerIndex, 0, [...store.context.historyObj])
	} else if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FARM) {
		let histEntry3 = [store.context.goodsToBeProduced, map.getIDfromHex(hex.hex), [...store.context.historyObj]]
		if (histFreeSeedUsedRet) histEntry3.push(1)
		model.addHistory(rf.HIST_FARM, playerIndex, 0, [...histEntry3])
	} else if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_INN) {
		model.addHistory(rf.HIST_INN, playerIndex, 0, [store.context.goodsToBeProduced, map.getIDfromHex(hex.hex)])
		updateZOCdisplayData()
	}
	store.context.historyObj.splice(0)
	store.clearVars()
	// Add an undo point
	model.createUndoPoint()
}

export function useCartShop_core(playerIndex, building) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]
	// Use a cart
	store.context.countryCartsLeftToUse--
	// Take a man off a cart shop
	let breakout = false
	for (let i = 0; i < playerObj.cities.length; i++) {
		for (let j = 0; j < playerObj.cities[i].buildings.length; j++) {
			if (playerObj.cities[i].buildings[j].bldgNum === rf.BLDG_CART && playerObj.cities[i].buildings[j].manned === true) {
				breakout = true
				playerObj.cities[i].buildings[j].manned = false
				break
			}
		}
		if (breakout) break
	}
	// If it's a city, return the man to useage
	if (building === rf.COUNTRYSIDE_BLDG_CITY || building === rf.COUNTRYSIDE_BLDG_INN) playerObj.availableMen++
}

export function placeFirstFisheryHex_core(playerIndex, hex, res) {
	const store = useModelStore()
	let player = store.players[playerIndex]

	let building = {
		type: rf.COUNTRYSIDE_BLDG_FISHERY,
		hexId: hex.id,
		hex: hex.hex,
		resources: [],
		harvestCount: 0,
		// Resources will be pushed into building below, Initial Value set to True
		canHarvest: true,
	}

	player.countrysideBuildings.push(building)

	// Record for history
	store.context.historyObj.splice(0)

	store.mapNeighbours[hex.id].forEach((hexId) => {
		const dest = map.getHexDataFromID(hexId)
		if (dest.terrainType === rf.TERR_WATER) {
			// Target hex should not be occupied or polluted
			if (!hexOccupied(hexId) && !hexPolluted(hexId)) {
				building = placeResourcesIntoBuilding(building, dest, res)
				store.context.historyObj.push(hexId)
				// Need to add pollution
				/*store.mapData.pollution.push({
					hexId: dest.id,
					hex: dest.hex,
				})*/
				store.mapData.pollution.push(dest.id)
			}
		}
	})
}

export function placeSecondFisheryHex_core(playerIndex, hex, goodsToBeProduced, previousStepHexId) {
	const store = useModelStore()
	let player = store.players[playerIndex]

	// Pay for fishery
	player.availableResources[rf.RES_WOOD]--

	let building = {
		type: rf.COUNTRYSIDE_BLDG_FISHERY,
		hexId: hex.id,
		hex: hex.hex,
		resources: [],
		harvestCount: 0,
		// Resources will be pushed into building below, Initial Value set to True
		canHarvest: true,
	}

	//store.context.noReset = false;
	const buildingWithRef = {
		...building,
		refHexId: previousStepHexId,
	}

	player.countrysideBuildings.push(buildingWithRef)

	store.mapNeighbours[hex.id].forEach((hexId) => {
		const dest = map.getHexDataFromID(hexId)
		if (dest.terrainType === rf.TERR_WATER) {
			// Target hex should not be occupied or polluted
			if (!hexOccupied(hexId) && !hexPolluted(hexId)) {
				building = placeResourcesIntoBuilding(building, dest, goodsToBeProduced)
				store.context.historyObj.push(hexId)
				// Need to add pollution
				/*store.mapData.pollution.push({
					hexId: dest.id,
					hex: dest.hex,
				})*/
				store.mapData.pollution.push(dest.id)
			}
		}
	})

	// Move resources from the one without refHexId to the one with refHexId
	let resToTransfer = []
	for (let i = 0; i < player.countrysideBuildings.length; i++) {
		if (player.countrysideBuildings[i].hexId === previousStepHexId) {
			resToTransfer = JSON.parse(JSON.stringify(player.countrysideBuildings[i].resources))
			player.countrysideBuildings[i].resources = []
		}
	}

	for (let i = 0; i < resToTransfer.length; i++) {
		building.resources.push(resToTransfer[i])
	}

	useCartShop_core(playerIndex, rf.COUNTRYSIDE_BLDG_FISHERY)

	// Remove Explorers
	removeExplorerFromHexID(hex.id)
	removeExplorerFromHexID(previousStepHexId)
}

export function getFisheries(csBuildings, IDonly) {
	const results = []
	if (!IDonly) {
		csBuildings.forEach((building) => {
			if (building.refHexId != undefined) {
				const partA = csBuildings.find((b) => b.hexId == building.refHexId)
				results.push([partA, building])
			}
		})
		return results
	}
	// Now get the IDs only for the zoom panel
	csBuildings.forEach((building) => {
		if (building.refHexId != undefined) {
			const partA = csBuildings.find((b) => b.hexId == building.refHexId)
			results.push([partA.hexId, building.hexId])
		}
	})
	return results
}

// ONLY do this if you are placing the building into the game model
// So mine resource selection phase shouldn't be here
export function placeBuilding_core(playerIndex, hex, newBuilding, resource) {
	const store = useModelStore()
	const player = store.players[playerIndex]

	// use this for Farm Seed History
	let histFreeSeedUsedRet = false

	// Deduct the building cost
	if (newBuilding === rf.COUNTRYSIDE_BLDG_INN) player.availableResources[resource]--
	else if (newBuilding === rf.COUNTRYSIDE_BLDG_WOODCUTTER) player.availableResources[rf.RES_WOOD]--
	else if (newBuilding === rf.COUNTRYSIDE_BLDG_MINE) player.availableResources[rf.RES_WOOD]--
	else if (newBuilding === rf.COUNTRYSIDE_BLDG_FARM) {
		//if (city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_BIOLOGY, true)) city.markBuildingAsUsed(playerIndex, rf.BLDG_BIOLOGY)
		if (store.context.goodsToBeProducedUsesFreeSeed) {
			city.markBuildingAsUsed(playerIndex, rf.BLDG_BIOLOGY)
			store.context.goodsToBeProducedUsesFreeSeed = false
			histFreeSeedUsedRet = true
		} else player.availableResources[resource]--
	}

	// Remove explorers from the (center) hex
	removeExplorerFromHexID(hex.id)

	let building = {
		type: newBuilding,
		hexId: hex.id,
		hex: hex.hex,
		resources: [],
		harvestCount: 0,
		// Resources will be pushed into building below, Initial Value set to True
		canHarvest: newBuilding === rf.COUNTRYSIDE_BLDG_FARM || newBuilding === rf.COUNTRYSIDE_BLDG_FISHERY || newBuilding === rf.COUNTRYSIDE_BLDG_WOODCUTTER || newBuilding === rf.COUNTRYSIDE_BLDG_MINE,
	}

	// Handle buildings that produce resources
	// Then push the building, and use a cart shop
	if (newBuilding == rf.COUNTRYSIDE_BLDG_FARM) {
		let goodsToBeProduced = resource

		building = placeResourcesIntoBuilding(building, hex, goodsToBeProduced)
		// Need to add pollution
		store.mapData.pollution.push(hex.id)

		let hexNeighbours = store.mapNeighbours[hex.id]
		hexNeighbours.forEach((hexId) => {
			let dest_hex = map.getHexDataFromID(hexId)
			if (dest_hex.terrainType === rf.TERR_PLAINS || dest_hex.terrainType === rf.TERR_GRASS) {
				// Target hex should not be occupied or polluted
				if (!hexOccupied(hexId) && !hexPolluted(hexId)) {
					building = placeResourcesIntoBuilding(building, dest_hex, goodsToBeProduced)
					// Need to add pollution
					/*store.mapData.pollution.push({
						hexId: dest_hex.id,
						hex: dest_hex.hex,
					})*/
					store.mapData.pollution.push(dest_hex.id)

					// Remove explorers
					removeExplorerFromHexID(dest_hex.id)
					// Add to history
					store.context.historyObj.push(dest_hex.id)
				}
			}
		})
	} else if (newBuilding == rf.COUNTRYSIDE_BLDG_WOODCUTTER) {
		// Add grass to woodcutter hex, Add Wood counter on top of that

		// THIS JUST CHANGES THE "MAN" HEX
		// ONLY DO THIS IF ADDING GRASS PRE-HARVEST
		//if (!store.permanentSettings.keepForestUnderWoodRes)
		// No, this should always be done here. The toggle just changes display
		changeHexToGrass(hex.id)

		building = placeResourcesIntoBuilding(building, hex, rf.RES_WOOD)

		let hexNeighbours = store.mapNeighbours[hex.id]
		hexNeighbours.forEach((hexId) => {
			let dest_hex = map.getHexDataFromID(hexId)
			if (dest_hex.terrainType === rf.TERR_FOREST) {
				// Target hex should not be occupied or polluted
				if (!hexOccupied(hexId) && !hexPolluted(hexId)) {
					building = placeResourcesIntoBuilding(building, dest_hex, rf.RES_WOOD)

					// THIS JUST CHANGES THE "NON-MAN" HEXES
					// ONLY DO THIS IF ADDING GRASS PRE-HARVEST
					//if (!store.permanentSettings.keepForestUnderWoodRes)
					// No, this should always be done here. The toggle just changes display
					changeHexToGrass(dest_hex.id)
					// Remove explorers
					removeExplorerFromHexID(dest_hex.id)
					// Add to history
					store.context.historyObj.push(dest_hex.id)
				}
			}
		})
	} else if (newBuilding == rf.COUNTRYSIDE_BLDG_MINE) {
		// This function is ONLY for placing building - so resource type is already set

		//let goodsToBeProduced = store.context.goodsToBeProduced
		if (store.mapData.hexes[hex.id].mountainType === rf.MOUNTAIN_STONE) resource = rf.RES_STONE
		if (store.mapData.hexes[hex.id].mountainType === rf.MOUNTAIN_GOLD) resource = rf.RES_GOLD
		// If not set already, will be taken from the manual selection
		let goodsToBeProduced = resource

		/*// Check if hex has decided goods
		if (store.mapData.hexes[hex.id].mountainType != rf.MOUNTAIN_NONE && goodsToBeProduced == -1) {
			goodsToBeProduced = store.mapData.hexes[hex.id].mountainType === rf.MOUNTAIN_STONE ? rf.RES_STONE : rf.RES_GOLD
		} else if (store.mapData.hexes[hex.id].mountainType === rf.MOUNTAIN_NONE && goodsToBeProduced == -1) {
			store.context.hexSelectedForMine = hex
			store.context.noReset = true
			newBuilding == rf.COUNTRYSIDE_BLDG_MINE
			store.context.action = rf.ACT_PLACE_COUNTRYSIDE_BLDG_MINE_SELECT_TYPE
			return
		}*/

		building = placeResourcesIntoBuilding(building, hex, goodsToBeProduced)
		// Need to add pollution
		//store.mapData.pollution.push({ hexId: hex.id, hex: hex.hex })
		store.mapData.pollution.push(hex.id)

		// Need to set the Mountain type if not set
		if (hex.mountainType === rf.MOUNTAIN_NONE) {
			setMountainType(hex, goodsToBeProduced)
			// Now we have a single (random-ish) seed ID for the mountain range. So add it to the data
			if (goodsToBeProduced === rf.RES_STONE) store.mapData.mountainRangeSeedStone.push(hex.id)
			else if (goodsToBeProduced === rf.RES_GOLD) store.mapData.mountainRangeSeedGold.push(hex.id)
		}

		let historyNeighbours = []

		let hexNeighbours = store.mapNeighbours[hex.id]
		hexNeighbours.forEach((hexId) => {
			let dest_hex = map.getHexDataFromID(hexId)
			if (dest_hex.terrainType === rf.TERR_MOUNTAINS) {
				// Target hex should not be occupied or polluted
				if (!hexOccupied(hexId) && !hexPolluted(hexId)) {
					building = placeResourcesIntoBuilding(building, dest_hex, goodsToBeProduced)
					// Need to add pollution
					/*store.mapData.pollution.push({
						hexId: dest_hex.id,
						hex: dest_hex.hex,
					})*/
					store.mapData.pollution.push(dest_hex.id)

					historyNeighbours.push(dest_hex.id)
					// Remove explorers
					removeExplorerFromHexID(dest_hex.id)
				}
			}
		})
		// Set up history vars
		//store.context.historyObj.push(goodsToBeProduced)
		store.context.historyObj.push(hex.id)
		store.context.historyObj.push([...historyNeighbours])
	}

	player.countrysideBuildings.push(building)
	useCartShop_core(playerIndex, newBuilding)
	return histFreeSeedUsedRet
}

export function placeResourcesIntoBuilding(building, Resourceshex, resId) {
	//const store = useModelStore();
	building.resources.push({
		resType: resId,
		icon: "res_" + resId,
		hexId: Resourceshex.id,
		hex: Resourceshex.hex,
	})
	return building
}

export function placePollution(hex, playerIndex) {
	const store = useModelStore()
	store.context.noReset = true

	placePollution_core(hex)
	if (store.context.historyObj.length === 0) store.context.historyObj.push([])
	store.context.historyObj[0].push(map.getIDfromHex(hex.hex))
	store.context.pollutionLeftToPlace--

	if (store.context.pollutionLeftToPlace <= 0 && store.gameflow.phase !== rf.PRE_PHASE_POLLUTION) {
		store.context.noReset = false
		model.addHistory(rf.HIST_ADD_POLLUTIONS, playerIndex, 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
	}
	if (store.context.pollutionLeftToPlace <= 0 && store.gameflow.phase === rf.PRE_PHASE_POLLUTION) {
		store.context.noReset = false
	}
}

export function placePollution_core(hex) {
	const store = useModelStore()
	/*let pollution = {
		hexId: hex.id,
		hex: hex.hex,
	}*/
	// Remove explorers
	removeExplorerFromHexID(hex.id)
	//store.mapData.pollution.push(pollution)
	store.mapData.pollution.push(hex.id)
}

export function getPendingPollution(playerIndex) {
	const store = useModelStore()
	if (playerIndex < 0) return
	const player = store.players[playerIndex]

	// 3 Per City
	let pollution = player.cities.length * 3
	// Dump reduces by 4
	if (city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_DUMP)) pollution -= 4
	// Check for ACTUAL fountain squares. Fountain is 1 sq, so 1 sq = 1 Fount. Graved fountains are += 100
	for (let i = 0; i < player.cities.length; i++) {
		for (let j = 0; j < player.cities[i].coords.length; j++) if (player.cities[i].coords[j] === rf.BLDG_FOUNTAIN_SQ) pollution--
	}

	if (pollution < 0) pollution = 0

	return pollution
}

/*export function getExplorers(playerIndex) {
	const store = useModelStore()
	const player = store.players[playerIndex]

	return city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_EXPLORER, false)
}*/

/*export function hasAlchemy(playerIndex) {
	const store = useModelStore()
	const player = store.players[playerIndex]
	const alchemists = player.cities.find((city) => city.buildings.find((building) => building.bldgNum == rf.BLDG_ALCHEMY_SQ && building.manned))

	return !!alchemists
}*/

export function setAlchemistZoc(playerIndex) {
	const store = useModelStore()
	const zoc = getZocTiles(playerIndex)
	store.context.action = rf.ACT_REMOVE_COUNTRYSIDE_POLLUTION

	const hexes = zoc.filter((hex) => {
		if (hexOccupied(hex.id)) return false
		if (!hexPolluted(hex.id)) return false
		return true
	})

	store.context.hexesToHighlight = hexes
}

export function removePollution(hex, playerIndex) {
	const store = useModelStore()
	const pollutionToBeRemoved = []

	pollutionToBeRemoved.push(hex.id)

	const neigbourIds = store.mapNeighbours[hex.id]
	store.context.historyObj.splice(0)
	store.context.historyObj.push(hex.id)
	neigbourIds.forEach((n) => {
		if (hexOccupied(n)) return
		if (!hexPolluted(n)) return
		pollutionToBeRemoved.push(n)
		store.context.historyObj.push(n)
	})
	pollutionToBeRemoved.forEach((hex) => {
		removePollution_core(hex)
	})
	// Mark the Alchemy as used
	city.markBuildingAsUsed(playerIndex, rf.BLDG_ALCHEMY)

	// Add history
	model.addHistory(rf.HIST_REMOVE_POLLUTION, playerIndex, 0, [...store.context.historyObj])
	store.context.historyObj.splice(0)
	// Update country build data
	model.updateCountryBuildCalclation(playerIndex, false)
	// Add an undo point
	model.createUndoPoint()
}

export function removePollution_core(hexId) {
	const store = useModelStore()

	//store.mapData.pollution = store.mapData.pollution.filter((p) => p.hexId !== hexId)
	store.mapData.pollution = store.mapData.pollution.filter((p) => p !== hexId)
}

export function exploreTile(hex, playerIndex, fromPreMove) {
	const store = useModelStore()

	let res = exploreTile_core(hex, playerIndex)
	store.context.selectedExplorerRes = res
	model.addHistory(rf.HIST_EXPLORE, playerIndex, 0, [hex.id, res])
	if (!fromPreMove) store.newlyExplorerResource = res
}

export function exploreTile_core(hex, playerIndex) {
	const store = useModelStore()

	//store.mapData.explorers = store.mapData.explorers.filter((ex) => ex.id != hex.id)
	store.mapData.explorers = store.mapData.explorers.filter((ex) => ex != hex.id)

	//const resource = store.mapData.availableExplorerResources.splice(Math.floor(Math.random() * store.mapData.availableExplorerResources), 1)
	const res = store.mapData.availableExplorerResources[0]
	store.mapData.availableExplorerResources.shift()

	store.players[playerIndex].availableResources[res]++
	if (rf.RES_FOODS.includes(res)) store.famineLevel++

	city.markBuildingAsUsed(playerIndex, rf.BLDG_EXPLORER)

	return res
}

export function updateZOCdisplayData() {
	const store = useModelStore()

	if (store.ZOCpathsWithMultiples.length > 0) updateZOCwithDottedLinesSelectedPlayers()
	if (store.ZOCuniqueData.length > 0) updateZOCuniqueSelectedPlayers()
	if (store.ZOCoverlapData.length > 0) updateZOCoverlapSelectedPlayers()
}

export function updateZOCwithDottedLinesSelectedPlayers() {
	const store = useModelStore()

	let arr = []
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].selectedForZOCline === true) arr.push(i)
	}
	getZOCpathsForDottedLines(arr)
}

export function updateZOCuniqueSelectedPlayers() {
	const store = useModelStore()

	store.ZOCuniqueData.splice(0)

	// First, get all the ZoC ID's for each player
	let ZOCids = []

	let playerIndexArray = []
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].selectedForZOCline === true) playerIndexArray.push(i)
	}
	for (let i = 0; i < store.players.length; i++) {
		if (playerIndexArray.includes(i)) ZOCids.push(getZocTiles(i, false, true, true))
		else ZOCids.push([])
	}

	let res = []
	for (let i = 0; i < store.players.length; i++) {
		// Only carry on if player is selected
		if (!playerIndexArray.includes(i)) res.push([])
		else {
			let tempRes = []
			for (let j = 0; j < ZOCids[i].length; j++) {
				let IDtoCheck = ZOCids[i][j]
				let unique = true
				for (let k = 0; k < ZOCids.length; k++) {
					if (k !== i && ZOCids[k].includes(IDtoCheck)) {
						unique = false
						break
					}
				}
				if (unique) tempRes.push(IDtoCheck)
			}
			res.push(tempRes)
		}
	}

	// remove any inns
	let innIDs = []
	for (let i = 0; i < store.players.length; i++) {
		const inns = store.players[i].countrysideBuildings.filter((cb) => cb.type === rf.COUNTRYSIDE_BLDG_INN)
		inns.forEach((inn) => innIDs.push(inn.hexId))
	}
	for (let i = res.length - 1; i >= 0; i--) {
		for (let j = res[i].length - 1; j >= 0; j--) {
			if (innIDs.includes(res[i][j])) res[i].splice(j, 1)
		}
	}

	store.ZOCuniqueData.push(...res)
}

export function updateZOCoverlapSelectedPlayers() {
	const store = useModelStore()

	// Clear overlaps
	store.ZOCoverlapData.splice(0)

	let playerIndexArray = []
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].selectedForZOCline === true) playerIndexArray.push(i)
	}

	let res = []

	// First, get all the ZoC ID's for each player
	let ZOCids = []
	for (let i = 0; i < playerIndexArray.length; i++) {
		ZOCids.push(getZocTiles(playerIndexArray[i], false, true, true, true))
	}

	// Now go through every hex id and find out which are rep
	const minId = store.mapData.hexes.reduce((min, hexObj) => (hexObj.id < min ? hexObj.id : min), Infinity)
	const maxId = store.mapData.hexes.reduce((max, hexObj) => (hexObj.id > max ? hexObj.id : max), -Infinity)

	for (let i = minId; i <= maxId; i++) {
		// now "i" is an ID. So check how many ZoC it is in
		// If it is in more than one, add it to the result
		let row = []
		for (let j = 0; j < ZOCids.length; j++) {
			if (ZOCids[j].includes(i)) row.push(playerIndexArray[j])
		}
		// If there is overlap, add it to result
		if (row.length > 1) {
			res.push([i].concat([...row]))
		}
	}
	// res = Each entry is [hexID, playerNum, playerNUm, ....]
	// Now filter the entires to make sure ALL playernums are included
	for (let i = res.length - 1; i >= 0; i--) {
		let entry = [...res[i]]
		entry.shift()
		let validEntry = true
		for (let j = 0; j < playerIndexArray.length; j++) {
			if (!entry.includes(playerIndexArray[j])) {
				validEntry = false
				break
			}
		}
		if (!validEntry) res.splice(i, 1)
	}

	store.ZOCoverlapData = res
}
