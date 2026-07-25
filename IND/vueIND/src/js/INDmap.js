/**
 * These are functions to do with manipulating or interacting with the map.
 * If they do not need to be directly in the component, it is easier to put them here.
 * This helps to stop the component getting cluttered up with a lot of functions,
 * and keeps the component mainly for the display
 *
 */

import * as rf from "./INDreference.js"
import * as model from "./INDmodel.js"

import { useModelStore } from "../stores/INDstore.js"

/** MAP CONSTRUCTION RELATED FUNCTIONS */

// Get the province that a terrid belongs to
export function getProvinceFromTerrID(terrID) {
	const store = useModelStore()

	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) {
		if (terrID <= 3) return rf.PROVINCE_ACE
		if (terrID <= 7) return rf.PROVINCE_SUM_UTA
		if (terrID <= 11) return rf.PROVINCE_SUM_BAR
		if (terrID <= 16) return rf.PROVINCE_RIA
		if (terrID <= 19) return rf.PROVINCE_JAM
		if (terrID <= 22) return rf.PROVINCE_BEN
		if (terrID <= 29) return rf.PROVINCE_SUM_SEL
		if (terrID <= 33) return rf.PROVINCE_LAM
		if (terrID <= 40) return rf.PROVINCE_JAW_BAR
		if (terrID <= 44) return rf.PROVINCE_JAW_TEN
		if (terrID <= 50) return rf.PROVINCE_JAW_TIM
		if (terrID <= 53) return rf.PROVINCE_KAL_BAR
		if (terrID <= 57) return rf.PROVINCE_SAR
		if (terrID <= 62) return rf.PROVINCE_KAL_TIM
		if (terrID <= 67) return rf.PROVINCE_KAL_TEN
		if (terrID <= 70) return rf.PROVINCE_KAL_SEL
		if (terrID <= 72) return rf.PROVINCE_BAL
		if (terrID <= 74) return rf.PROVINCE_NUS_BAR
		if (terrID <= 80) return rf.PROVINCE_NUS_TIM
		if (terrID <= 83) return rf.PROVINCE_SUL_SEL
		if (terrID <= 88) return rf.PROVINCE_SUL_TENGAH
		if (terrID <= 90) return rf.PROVINCE_SUL_UTA
		if (terrID <= 93) return rf.PROVINCE_SUL_TENGGARA
		if (terrID <= 99) return rf.PROVINCE_HAL
		if (terrID <= 108) return rf.PROVINCE_MAL
		if (terrID <= 115) return rf.PROVINCE_PAP
	} else if (store.mapData.selectedMap === rf.MAP_AEGEAN) {
		if (terrID <= 5) return rf.AG_PROVINCE_THRACE
		if (terrID <= 9) return rf.AG_PROVINCE_ABDERA
		if (terrID <= 12) return rf.AG_PROVINCE_KAVALA
		if (terrID <= 16) return rf.AG_PROVINCE_ATHOS
		if (terrID <= 22) return rf.AG_PROVINCE_MACEDON
		if (terrID <= 27) return rf.AG_PROVINCE_PELLA
		if (terrID <= 33) return rf.AG_PROVINCE_TROAS
		if (terrID <= 38) return rf.AG_PROVINCE_LYDIA
		if (terrID <= 42) return rf.AG_PROVINCE_AEOLIA
		if (terrID <= 45) return rf.AG_PROVINCE_LESBOS
		if (terrID <= 48) return rf.AG_PROVINCE_LEMNOS
		if (terrID <= 54) return rf.AG_PROVINCE_SPORADES
		if (terrID <= 59) return rf.AG_PROVINCE_THEBES
		if (terrID <= 64) return rf.AG_PROVINCE_IONIA
		if (terrID <= 67) return rf.AG_PROVINCE_CHIOS
		if (terrID <= 74) return rf.AG_PROVINCE_EUBOEA
		if (terrID <= 79) return rf.AG_PROVINCE_ATHENS
		if (terrID <= 84) return rf.AG_PROVINCE_CARIA
		if (terrID <= 88) return rf.AG_PROVINCE_SAMOS
		if (terrID <= 95) return rf.AG_PROVINCE_ANDROS
		if (terrID <= 101) return rf.AG_PROVINCE_SPARTA
		if (terrID <= 105) return rf.AG_PROVINCE_RHODES
		if (terrID <= 110) return rf.AG_PROVINCE_KOS
		if (terrID <= 116) return rf.AG_PROVINCE_NAXOS
		if (terrID <= 121) return rf.AG_PROVINCE_THERA
		if (terrID <= 124) return rf.AG_PROVINCE_HEPTANESE
		if (terrID <= 127) return rf.AG_PROVINCE_ETEA
		if (terrID <= 130) return rf.AG_PROVINCE_KNOSSOS
		if (terrID <= 132) return rf.AG_PROVINCE_RITHYMNA
		if (terrID <= 136) return rf.AG_PROVINCE_CYDONIA
	} else if (store.mapData.selectedMap === rf.MAP_PHP) {
		if (terrID <= 4) return rf.PH_PROVINCE_COR
		if (terrID <= 8) return rf.PH_PROVINCE_ILO
		if (terrID <= 13) return rf.PH_PROVINCE_CAG
		if (terrID <= 16) return rf.PH_PROVINCE_LUZ
		if (terrID <= 23) return rf.PH_PROVINCE_QUE
		if (terrID <= 26) return rf.PH_PROVINCE_CAP
		if (terrID <= 30) return rf.PH_PROVINCE_CAL
		if (terrID <= 34) return rf.PH_PROVINCE_NBI
		if (terrID <= 38) return rf.PH_PROVINCE_SBI
		if (terrID <= 43) return rf.PH_PROVINCE_SAM
		if (terrID <= 46) return rf.PH_PROVINCE_LEY
		if (terrID <= 49) return rf.PH_PROVINCE_NCA
		if (terrID <= 53) return rf.PH_PROVINCE_SCA
		if (terrID <= 58) return rf.PH_PROVINCE_MIN
		if (terrID <= 64) return rf.PH_PROVINCE_ZAM
		if (terrID <= 70) return rf.PH_PROVINCE_BAN
		if (terrID <= 73) return rf.PH_PROVINCE_CMI
		if (terrID <= 76) return rf.PH_PROVINCE_DAV
		if (terrID <= 79) return rf.PH_PROVINCE_SOC
		if (terrID <= 86) return rf.PH_PROVINCE_MIM
		if (terrID <= 92) return rf.PH_PROVINCE_PAL
		if (terrID <= 99) return rf.PH_PROVINCE_WVI
		if (terrID <= 105) return rf.PH_PROVINCE_CVI
		if (terrID <= 111) return rf.PH_PROVINCE_MAL
	}
	return -1
}

export function getPathDfromterrID(terrID) {
	const store = useModelStore()
	try {
		return store.mapData.selectedMapData.terrPaths.find((path) => path.id === terrID).pathD
	} catch (e) {
		console.log(`terrID: ${terrID} e: ${e}`)
	}
}

// Get all terrIDs for a province
export function getWholeProvinceTerrIDs(provinceID) {
	/*const store = useModelStore()

	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) {
		let res = []
		let sum = 0
		for (let i = 0; i < provinceID; i++) sum += rf.OM_TERRS_IN_PROVINCE[i]
		let startNum = sum
		sum += rf.OM_TERRS_IN_PROVINCE[provinceID]
		let endNum = sum
		for (let i = startNum; i < endNum; i++) res.push(i)
		return res
	}*/
	const store = useModelStore()

	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) {
		let startNum = 0
		for (let i = 0; i < provinceID; i++) {
			startNum += rf.OM_TERRS_IN_PROVINCE[i]
		}

		const endNum = startNum + rf.OM_TERRS_IN_PROVINCE[provinceID]
		return Array.from({ length: endNum - startNum }, (_, index) => startNum + index)
	} else if (store.mapData.selectedMap === rf.MAP_AEGEAN) {
		let startNum = 0
		for (let i = 0; i < provinceID; i++) {
			startNum += rf.AG_TERRS_IN_PROVINCE[i]
		}

		const endNum = startNum + rf.AG_TERRS_IN_PROVINCE[provinceID]
		return Array.from({ length: endNum - startNum }, (_, index) => startNum + index)
	} else if (store.mapData.selectedMap === rf.MAP_PHP) {
		let startNum = 0
		for (let i = 0; i < provinceID; i++) {
			startNum += rf.PHP_TERRS_IN_PROVINCE[i]
		}

		const endNum = startNum + rf.PHP_TERRS_IN_PROVINCE[provinceID]
		return Array.from({ length: endNum - startNum }, (_, index) => startNum + index)
	}

	return []
}

export function isSeaTerritory(terrID) {
	const store = useModelStore()

	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) {
		if (terrID >= 116) return true
		return false
	} else if (store.mapData.selectedMap === rf.MAP_AEGEAN) {
		if (terrID >= 137) return true
		return false
	} else if (store.mapData.selectedMap === rf.MAP_PHP) {
		if (terrID >= 112) return true
		return false
	}
}

export function isLandTerritory(terrID) {
	const store = useModelStore()

	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) {
		if (terrID <= 115) return true
		return false
	} else if (store.mapData.selectedMap === rf.MAP_AEGEAN) {
		if (terrID <= 136) return true
		return false
	} else if (store.mapData.selectedMap === rf.MAP_PHP) {
		if (terrID <= 117) return true
		return false
	}
}

function arrayOfEmpty(size) {
	let arr = new Array(size)
	for (let n = 0; n < size; n++) {
		arr[n] = []
	}
	return arr
}

export function territoryNeighbors(territoryCount, neighbourPairs, disallowedPairs = []) {
	let all = arrayOfEmpty(territoryCount)
	let sea = arrayOfEmpty(territoryCount)
	let land = arrayOfEmpty(territoryCount)
	let landWithExpansionRestrictionsNeighbours = arrayOfEmpty(territoryCount)

	// Create a Set of strings like "from-to" for rapid lookup
	const restricted = new Set(disallowedPairs.map((p) => `${p[0]}-${p[1]}`))

	for (const pair of neighbourPairs) {
		// Add to general neighbours
		let a = pair[0]
		let b = pair[1]
		all[a].push(b)
		all[b].push(a)
		let nb = isSeaTerritory(a) ? sea : land
		nb[b].push(a)
		let na = isSeaTerritory(b) ? sea : land
		na[a].push(b)

		// Try direction A -> B
		if (!isSeaTerritory(b) && !restricted.has(`${b}-${a}`)) {
			landWithExpansionRestrictionsNeighbours[a].push(b)
		}

		// Try direction B -> A
		if (!isSeaTerritory(a) && !restricted.has(`${a}-${b}`)) {
			landWithExpansionRestrictionsNeighbours[b].push(a)
		}
	}
	return { all, sea, land, landWithExpansionRestrictionsNeighbours }
}

export function getTerrIDfromPath(path) {
	const store = useModelStore()
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) return rf.OM_TERR_ID_TO_PATH_ID.indexOf(path)
	else if (store.mapData.selectedMap === rf.MAP_AEGEAN) return rf.AG_TERR_ID_TO_PATH_ID.indexOf(path)
	else if (store.mapData.selectedMap === rf.MAP_PHP) return rf.PHP_TERR_ID_TO_PATH_ID.indexOf(path)
}

export function isCoastal(terrID) {
	const store = useModelStore()
	if (terrID < 0) return false
	if (isSeaTerritory(terrID)) return false
	return store.mapData.seaNeighbours[terrID].length > 0
}

export function getTerritoryDataFromTerritoryID(terrID) {
	const store = useModelStore()
	const data =  store.mapData.selectedMapData.terrPaths.find((entry) => entry.id === terrID)
	if (!data) alert(`Territory not found: ${terrID}`)
	return data
}

/** FUNCTIONS FOR OPERATIONS OF LAND COMPANIES */
// Function to find the number of unconnected areas in a set of terrain IDs
export function countUnconnectedAreas(terrIDsSet) {
	const store = useModelStore()

	let unconnectedAreas = 0
	let visited = new Set()

	for (let terrID of terrIDsSet) {
		if (!visited.has(terrID)) {
			let stack = [terrID]
			unconnectedAreas++

			while (stack.length > 0) {
				let current = stack.pop()
				visited.add(current)

				for (let neighbor of store.mapData.landNeighbours[current]) {
					if (terrIDsSet.has(neighbor) && !visited.has(neighbor)) {
						stack.push(neighbor)
					}
				}
			}
		}
	}
	return unconnectedAreas
}

export function getProductionZoneFromSlotIDXandTerrID(playerIndex, slotIDX, terrID) {
	const store = useModelStore()
	const allProductionTerrs = new Set()

	const slot = store.players[playerIndex].slots[slotIDX]
	slot.forEach((companyID) => {
		const companyData = model.getActiveCompanyDataFromID(companyID)
		companyData.territories.forEach((territory) => {
			allProductionTerrs.add(territory[0])
		})
	})

	const res = [terrID]
	const visited = new Set(res)

	let queue = [terrID]
	while (queue.length > 0) {
		const currentTerr = queue.shift()
		const neighbours = store.mapData.landNeighbours[currentTerr] || []
		for (const neighbour of neighbours) {
			if (allProductionTerrs.has(neighbour) && !visited.has(neighbour)) {
				res.push(neighbour)
				queue.push(neighbour)
				visited.add(neighbour)
			}
		}
	}
	return res
}

// This function doesn't respect hull capacity or city size. See below function for with limits
// So it is pretty useless. Basically just for debugging
export function getAllItemsReachableFromSlotIDXandTerrID_NO_LIMITS(playerIndex, slotIDX, terrID) {
	/*const store = useModelStore()
	let initialShipMarkers = [] // subarrays of [companyID, terrID]

	let productionZone = getProductionZoneFromSlotIDXandTerrID(playerIndex, slotIDX, terrID)
	let allSeaNeighbours = []

	// Initially, just expand the production zone into ship markers ONLY
	for (let i = 0; i < productionZone.length; i++) {
		allSeaNeighbours = allSeaNeighbours.concat(store.mapData.seaNeighbours[productionZone[i]])
	}
	allSeaNeighbours = [...new Set(allSeaNeighbours)]
	for (let i = 0; i < store.activeCompanies.length; i++) {
		let company2 = store.activeCompanies[i]
		if (company2.type === rf.COMPANY_SHIPPING) {
			for (let j = 0; j < company2.territories.length; j++) {
				// terr must be in company, and not already used
				if (allSeaNeighbours.includes(company2.territories[j][0])) {
					initialShipMarkers.push([company2.id, company2.territories[j][0]])
				}
			}
		}
	}

	// Now we have some ship markers, so expand as much as possible, including ship markers AND cities
	// So.... take each of the INITIAL ship companies available in turn, and check where they go
	let allCities = []
	let allShipMarkers = [...initialShipMarkers]

	initialShipMarkers.forEach((shipMarkerData) => {
		let company = store.activeCompanies.find((company) => company.id === shipMarkerData[0])

		let currentShipMarkers = [[...shipMarkerData]]
		let newTerrFound = false
		do {
			newTerrFound = false
			// Update the hull capacity
			//let terrArr = company.territories.find((terr) => terr[0] === terrID)
			//terrArr[1]++

			// Update the current journey
			//if (store.context.currentGoodJourney.length === 2) store.context.currentGoodJourney.push(company.ownerIndex, company.id, terrID)
			//else store.context.currentGoodJourney.push(terrID)
			for (let i = 0; i < currentShipMarkers.length; i++) {
				let seaNeighbours = store.mapData.seaNeighbours[currentShipMarkers[i][1]]

				for (let j = 0; j < company.territories.length; j++) {
					//if (seaNeighbours.includes(company.territories[j][0]) && !store.context.currentGoodJourney.some((subArray) => subArray[0] === company.id && subArray[1] === company.territories[j][0])) {
					if (seaNeighbours.includes(company.territories[j][0]) && !currentShipMarkers.some((subArray) => subArray[0] === company.id && subArray[1] === company.territories[j][0])) {
						currentShipMarkers.push([company.id, company.territories[j][0]])
						newTerrFound = true
					}
				}

				// Include any cities
				let landNeighbours = store.mapData.landNeighbours[currentShipMarkers[i][1]]
				for (let i = 0; i < store.cities.length; i++) {
					if (landNeighbours.includes(store.cities[i].territory)) {
						allCities.push(store.cities[i].territory)
					}
				}
			}
		} while (newTerrFound)

		allShipMarkers = allShipMarkers.concat(currentShipMarkers)
	})

	allCities = [...new Set(allCities)]

	store.removeAllActiveHighlights()
	store.context.shipMarkersToHighlight = [...allShipMarkers]
	store.context.prodMarkerTerritoriesToHighlight = [...productionZone]
	store.context.citiesToHighlight = [...allCities]
	store.context.shipMarkersToHighlight = [...allShipMarkers]
	*/
	const store = useModelStore()

	let initialShipMarkers = new Set()
	let allCities = new Set()
	let allShipMarkers = new Set()

	let productionZone = getProductionZoneFromSlotIDXandTerrID(playerIndex, slotIDX, terrID)

	const allSeaNeighbours = new Set(productionZone.flatMap((terr) => store.mapData.seaNeighbours[terr] || []))

	store.activeCompanies.forEach((company) => {
		if (company.type === rf.COMPANY_SHIPPING) {
			company.territories.forEach((territory) => {
				if (allSeaNeighbours.has(territory[0])) {
					initialShipMarkers.add(`${company.id}-${territory[0]}`)
				}
			})
		}
	})

	initialShipMarkers.forEach((shipMarkerData) => {
		//const [companyID, initialTerr] = shipMarkerData.split('-');
		const currentShipMarkers = new Set([shipMarkerData])

		let newTerrFound = true
		while (newTerrFound) {
			newTerrFound = false
			currentShipMarkers.forEach((marker) => {
				const [currentCompanyID, currentTerr] = marker.split("-")
				const seaNeighbours = store.mapData.seaNeighbours[currentTerr] || []

				store.activeCompanies.forEach((company) => {
					if (company.id === Number(currentCompanyID)) {
						company.territories.forEach((territory) => {
							if (seaNeighbours.includes(territory[0]) && !currentShipMarkers.has(`${company.id}-${territory[0]}`)) {
								currentShipMarkers.add(`${company.id}-${territory[0]}`)
								newTerrFound = true
							}
						})

						const landNeighbours = store.mapData.landNeighbours[currentTerr] || []
						store.cities.forEach((city) => {
							if (landNeighbours.includes(city.territory)) {
								allCities.add(city.territory)
							}
						})
					}
				})
			})
		}
		currentShipMarkers.forEach((marker) => {
			allShipMarkers.add(marker)
		})
	})

	const uniqueCities = [...allCities]

	store.removeAllActiveHighlights()
	allShipMarkers.forEach((marker) => {
		const [companyID, territoryID] = marker.split("-")
		store.context.shipMarkersToHighlight.push([parseInt(companyID), parseInt(territoryID)])
	})
	store.context.prodMarkerTerritoriesToHighlight = [...productionZone]
	store.context.citiesToHighlight = [...uniqueCities]
}

export function getAllItemsReachableFromSlotIDXandTerrID(playerIndex, slotIDX, terrID) {
	const store = useModelStore()

	let initialShipMarkers = new Set()
	let allCities = new Set()
	let allShipMarkers = new Set()

	let productionZone = getProductionZoneFromSlotIDXandTerrID(playerIndex, slotIDX, terrID)

	const allSeaNeighbours = new Set(productionZone.flatMap((terr) => store.mapData.seaNeighbours[terr] || []))

	store.activeCompanies.forEach((company) => {
		if (company.type === rf.COMPANY_SHIPPING) {
			company.territories.forEach((territory) => {
				// NOTE: This does NOT directly respect multiple ships in same terrID, if there's partial use
				// BUT... if the first idential terrID has 0 capacity, the other(s) will have > 0
				// THEREFORE.... this is fine
				if (allSeaNeighbours.has(territory[0]) && territory[1] > 0) {
					initialShipMarkers.add(`${company.id}-${territory[0]}`)
				}
			})
		}
	})

	initialShipMarkers.forEach((shipMarkerData) => {
		//const [companyID, initialTerr] = shipMarkerData.split('-');
		const currentShipMarkers = new Set([shipMarkerData])

		let newTerrFound = true
		while (newTerrFound) {
			newTerrFound = false
			currentShipMarkers.forEach((marker) => {
				const [currentCompanyID, currentTerr] = marker.split("-")
				const seaNeighbours = store.mapData.seaNeighbours[currentTerr] || []

				store.activeCompanies.forEach((company) => {
					if (company.id === Number(currentCompanyID)) {
						company.territories.forEach((territory) => {
							if (seaNeighbours.includes(territory[0]) && territory[1] > 0 && !currentShipMarkers.has(`${company.id}-${territory[0]}`)) {
								// NOTE: This does NOT directly respect multiple ships in same terrID, if there's partial use
								// BUT... if the first idential terrID has 0 capacity, the other(s) will have > 0
								// THEREFORE.... this is fine
								currentShipMarkers.add(`${company.id}-${territory[0]}`)
								newTerrFound = true
							}
						})

						const landNeighbours = store.mapData.landNeighbours[currentTerr] || []
						store.cities.forEach((city) => {
							if (landNeighbours.includes(city.territory)) {
								if (model.canCityAcceptGood(city.territory, model.getActiveCompanyDataFromID(store.players[playerIndex].slots[slotIDX][0]).good)) allCities.add(city.territory)
							}
						})
					}
				})
			})
		}
		currentShipMarkers.forEach((marker) => {
			allShipMarkers.add(marker)
		})
	})

	const uniqueCities = [...allCities]

	store.removeAllActiveHighlights()
	allShipMarkers.forEach((marker) => {
		const [companyID, territoryID] = marker.split("-")
		store.context.shipMarkersToHighlight.push([parseInt(companyID), parseInt(territoryID)])
	})
	store.context.prodMarkerTerritoriesToHighlight = [...productionZone]
	store.context.citiesToHighlight = [...uniqueCities]
}

// Determines whether to allow the player to carry on in "shipping" mode, or change to "paid expansion" mode
export function canShipGoodFromSlotIDX(playerIndex, slotIDX) {
	/*const store = useModelStore()
	let canShip = false

	outerLoop: for (let i = 0; i < store.players[playerIndex].slots[slotIDX].length; i++) {
		const company = model.getActiveCompanyDataFromID(store.players[playerIndex].slots[slotIDX][i])

		for (let j = 0; j < company.territories.length; j++) {
			if (company.territories[j][1] === false) {
				let terrID = company.territories[j][0]
				let initialShipMarkers = new Set()
				let allShipMarkers = new Set()

				let productionZone = getProductionZoneFromSlotIDXandTerrID(playerIndex, slotIDX, terrID)

				const allSeaNeighbours = new Set(productionZone.flatMap((terr) => store.mapData.seaNeighbours[terr] || []))

				store.activeCompanies.forEach((company) => {
					if (company.type === rf.COMPANY_SHIPPING) {
						company.territories.forEach((territory) => {
							if (allSeaNeighbours.has(territory[0]) && territory[1] > 0) {
								initialShipMarkers.add(`${company.id}-${territory[0]}`)
							}
						})
					}
				})

				initialShipMarkers.forEach((shipMarkerData) => {
					const currentShipMarkers = new Set([shipMarkerData])

					let newTerrFound = true
					while (newTerrFound) {
						newTerrFound = false
						currentShipMarkers.forEach((marker) => {
							const [currentCompanyID, currentTerr] = marker.split("-")
							const seaNeighbours = store.mapData.seaNeighbours[currentTerr] || []

							store.activeCompanies.forEach((company) => {
								if (company.id === Number(currentCompanyID)) {
									company.territories.forEach((territory) => {
										if (seaNeighbours.includes(territory[0]) && territory[1] > 0 && !currentShipMarkers.has(`${company.id}-${territory[0]}`)) {
											currentShipMarkers.add(`${company.id}-${territory[0]}`)
											newTerrFound = true
										}
									})

									const landNeighbours = store.mapData.landNeighbours[currentTerr] || []
									store.cities.forEach((city) => {
										if (landNeighbours.includes(city.territory)) {
											if (model.canCityAcceptGood(city.territory, store.players[playerIndex].slots[slotIDX][0].good)) {
												canShip = true
												return true
											}
										}
									})
								}
							})
						})
					}

					currentShipMarkers.forEach((marker) => {
						allShipMarkers.add(marker)
					})
				})
			}
		}

		if (canShip) {
			break outerLoop
		}
	}

	return canShip*/

	/********* */
	const store = useModelStore()
	let canShip = false

	const activeCompanies = store.activeCompanies
	const cities = store.cities
	const mapData = store.mapData
	const players = store.players

	for (let i = 0; i < players[playerIndex].slots[slotIDX].length; i++) {
		const companyID = players[playerIndex].slots[slotIDX][i]
		const company = model.getActiveCompanyDataFromID(companyID)

		for (let j = 0; j < company.territories.length; j++) {
			const territory = company.territories[j]

			if (territory[1] === false) {
				const terrID = territory[0]
				const productionZone = getProductionZoneFromSlotIDXandTerrID(playerIndex, slotIDX, terrID)
				const allSeaNeighbours = new Set(productionZone.flatMap((terr) => mapData.seaNeighbours[terr] || []))

				const initialShipMarkers = new Set()

				activeCompanies.forEach((comp) => {
					if (comp.type === rf.COMPANY_SHIPPING) {
						comp.territories.forEach((t) => {
							// NOTE: This does NOT directly respect multiple ships in same terrID, if there's partial use
							// BUT... if the first idential terrID has 0 capacity, the other(s) will have > 0
							// THEREFORE.... this is fine
							if (allSeaNeighbours.has(t[0]) && t[1] > 0) {
								initialShipMarkers.add(`${comp.id}-${t[0]}`)
							}
						})
					}
				})

				const visited = new Set()
				const stack = [...initialShipMarkers]

				while (stack.length > 0) {
					const marker = stack.pop()
					if (visited.has(marker)) continue

					visited.add(marker)

					const [currentCompanyID, currentTerr] = marker.split("-")
					const seaNeighbours = mapData.seaNeighbours[currentTerr] || []

					activeCompanies.forEach((comp) => {
						if (comp.id === Number(currentCompanyID)) {
							comp.territories.forEach((t) => {
								// NOTE: This does NOT directly respect multiple ships in same terrID, if there's partial use
								// BUT... if the first idential terrID has 0 capacity, the other(s) will have > 0
								// THEREFORE.... this is fine
								if (seaNeighbours.includes(t[0]) && t[1] > 0 && !visited.has(`${comp.id}-${t[0]}`)) {
									stack.push(`${comp.id}-${t[0]}`)
								}
							})

							const landNeighbours = mapData.landNeighbours[currentTerr] || []
							cities.forEach((city) => {
								if (landNeighbours.includes(city.territory)) {
									if (model.canCityAcceptGood(city.territory, model.getActiveCompanyDataFromID(players[playerIndex].slots[slotIDX][0]).good)) {
										canShip = true
									}
								}
							})
						}
					})
				}

				if (canShip) {
					break
				}
			}
		}

		if (canShip) {
			break
		}
	}

	return canShip
}

/*export function getMaxPossibleShipmentsFromSlotIDX(playerIndex, slotIDX) {
	const store = useModelStore()
	// If there is no delivery, return 0
	if (!canShipGoodFromSlotIDX(playerIndex, slotIDX)) return 0

	// Now we can deliver. So if there is only 1 territory, return 1
	if (store.players[playerIndex].slots[slotIDX].length === 1 && model.getActiveCompanyDataFromID(store.players[playerIndex].slots[slotIDX][0]).territories.length === 1) return 1

	// Now into the real function
	// Get the terrID's of the production zone
	let productionZone = getProductionZoneFromSlotIDXandTerrID(playerIndex, slotIDX)

	// Now make a copy of the network to traverse
	// Generally, you start in a player SLOT
	// Each slot can hold multiple company ID's
	// Each shipping company has territories = [ [terrID, remainingCapacity] ]
	// The main thing is you cannot change companyID mid shipment
	// So we could store the network as [compID, terrID, reminaingCapacity]   ??

	// NOTE: MERGED shipping companies have all their territories in a single company
	// - the other company has company.territories  = []
	let networkCopy = []
	for (let i = 0; i < store.activeCompanies.length; i++) {
		let company = store.activeCompanies[i]
		if (company.type === rf.COMPANY_SHIPPING) {
			company.territories.forEach((territory) => {
				networkCopy.push([company.id, territory[0], territory[1]])
			})
		}
	}

	// Now make a copy of the destinations
	//I think we need both the ID and delivered goods, to see if a city fills up mid function
	let citiesCopy = JSON.parse(JSON.stringify(store.cities))

	// Now find the max number of terrID's in the productionZone can deliver to a city

	// So something like.... get the seaNeighbours of a proudctionZone[i]
	// Then find a company with a territory in that seaNeighbour, and remainingCapacity > 0
	// Then find the sea neighbours of that sea zone, and check if theres a same company ship with remainingCapacity > 0
	// And also check land neighbours for a possible city

	// Maybe an extension of this function 
	// getAllItemsReachableFromSlotIDXandTerrID
	// would be useful?
	// You could limit it to ONLY get stuff reachable from a single companyID, IE one shipping company

	// But obbvously the tricky bit is to find MAX deliveries, not any or some possible deliveries.

	// The current method to store good journeys is:
	//	[prod_marker_terrID, shipping_company_owner_index, ship_company_index, shipping_terrID, shipping_terrId, ...., city_terrID]
	// NOTE: Technically you use a SLOT with shipping companies in it, NOT a shipping company (or shipping_company_index)
	// But when ship comps are merged, ALL terrs go into the company in slot index 0. 
	// Therefore, other then chacking max company size, the other companies are now irreleq
	// So you can use a single ship_company_id and still get all the terrIDs in that entire slot
}*/
