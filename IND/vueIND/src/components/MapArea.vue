<script setup>
/** This is the main DISPLAY for the map
 *  Functions to do directly with DISPLAYING the map should be here
 *  Functions to do with manipulating the map should go in map.js
 *
 *
 */

import * as rf from "../js/INDreference"
import * as map from "../js/INDmap"
import * as view from "../js/INDview"
import * as model from "../js/INDmodel"
import * as controller from "../js/INDcontroller"
import * as funcs from "../js/INDfuncs"
import * as mpf from "../js/INDshipping"

import MapPopup from "./MapPopup.vue"

import { useModelStore } from "../stores/INDstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/INDpersonal.js"
const personal = usePersonalStore()

import { ref, reactive, computed } from "vue"

/** DEBUG - USE TO LAYOUT MAP ITEMS*/
/*
const circleRadius = 15 // 5 small 50 big
const compWidth = 100 * 0.7 //25//100
const shipWidth = 65 * 0.7 //20//60
const shipTextPX = 40 //13//45
const SVGwidth = 2624 //640// 3824 // AG: 888.66669 // 1622 // 3e: [2646, 1280]
const SVGheight = 1280 //428.32001// 1770 // AG: 583.66669 // 2164

const isDragging = ref(false)
const cxPos = ref(500)
const cyPos = ref(500)

const dragType = ref("")
const dragIndex = ref(-1)
const offsetX = ref(0)
const offsetY = ref(0)
const rects = reactive([
	{ x: 40, y: 1040, value: "rect", fill: "ship_pirate" },
	{ x: 80, y: 1080, value: "rect", fill: "ship_pirate" },
	{ x: 120, y: 1120, value: "rect", fill: "ship_pirate" },
	{ x: 160, y: 1160, value: "rect", fill: "ship_pirate" },
	{ x: 200, y: 1200, value: "rect", fill: "ship_pirate" },
	{ x: 240, y: 100, value: "rect", fill: "c_comp_00" },
	{ x: 280, y: 200, value: "rect", fill: "c_comp_04" },
])

const DEBUGstartDragShape = (type, index) => {
	isDragging.value = true
	dragType.value = type
	dragIndex.value = index
	if (index !== undefined) {
		offsetX.value = rects[index].x
		offsetY.value = rects[index].y
	}
}

const DEBUGmoveElement = (event) => {
	if (isDragging.value) {
		const svgRect = DEBUGmapSVG.value.getBoundingClientRect()
		//const x = event.clientX - svgRect.left;
		//const y = event.clientY - svgRect.top;
		if (dragType.value === "circle") {
			let pixelsInsideSVGleft = event.clientX - svgRect.left
			//cxPos.value = pixelsInsideSVGleft / 1600 * 3824
			cxPos.value = (pixelsInsideSVGleft / svgRect.width) * SVGwidth

			let pixelsInsideSVGtop = event.clientY - svgRect.top
			//cyPos.value = pixelsInsideSVGtop / 833.167 * 1770
			cyPos.value = (pixelsInsideSVGtop / svgRect.height) * SVGheight
		} else if (dragType.value === "rect" && dragIndex.value !== -1) {
			let pixelsInsideSVGleft = event.clientX - svgRect.left
			rects[dragIndex.value].x = (pixelsInsideSVGleft / svgRect.width) * SVGwidth

			let pixelsInsideSVGtop = event.clientY - svgRect.top

			rects[dragIndex.value].y = (pixelsInsideSVGtop / svgRect.height) * SVGheight
		}
	}
}

const DEBUGstopDrag = () => {
	isDragging.value = false
}
*/
/**END DEBUG */

const DEBUGmapSVG = ref(null)

const originalMapDivRef = ref(null)
const popupSetter = reactive({
	showPopup: false,
	popupData: {
		wholeSVGheight: -1,
		popupObjectType: -1,
		svgX: -1,
		svgY: -1,
		popupObjectData: [],
	},
})

function mouseOverAvailableCompany(event, popupObjectType, popupObjectData) {
	showPopupFunc(event, popupObjectType, popupObjectData)
	if (store.context.action === rf.ACT_ACQUIRE_COMPANY) {
		const companyID = popupObjectData[0]
		const ret = model.getTerritoryIDsToHighlightForNewCompany(companyID)
		store.context.territoriesToHighlight.splice(0)
		store.context.territoriesToHighlightRed.splice(0)
		store.context.territoriesToHighlight.push(...ret.territoriesToHighlight)
		store.context.territoriesToHighlightRed.push(...ret.territoriesToHighlightRed)
	}
}

function mouseOutAvailableCompany() {
	hidePopupFunc()

	setTimeout(() => {
		// Only clear if we haven't transitioned to a "confirm" or "click" state
		if (store.context.action === rf.ACT_ACQUIRE_COMPANY) {
			store.context.territoriesToHighlight.splice(0)
			store.context.territoriesToHighlightRed.splice(0)
			store.context.territoriesToHighlightGreen.splice(0)
		}
	}, 10) // Small 50ms delay is usually enough to beat the race
}

function mouseOverProdMarker(event, popupObjectType, popupObjectData) {
	showPopupFunc(event, popupObjectType, popupObjectData)
	// If it is siap saji removal phase, we don't want highlighting
	if (store.gameflow.phase === rf.PHASE_MERGER_REMOVE_SIAP_FAJI_TERRS && personal.canPlay()) return
	// If it's ops phase, we don't want highlighting
	if (store.gameflow.phase === rf.PHASE_OPERATIONS && personal.canPlay()) return
	// Get all the prod markers of the same company
	for (const terrArr of popupObjectData[0].territories) {
		store.historyHelpers.prodMarkersInSameCompany.push(terrArr[0])
	}
}

function mouseOutProdMarker() {
	hidePopupFunc()
	store.historyHelpers.prodMarkersInSameCompany.splice(0)
}

const showPopupFunc = (event, popupObjectType, popupObjectData) => {
	// 1. Get the container that holds the SVG and the Popups
	// This container MUST have position: relative
	const containerRect = originalMapDivRef.value.getBoundingClientRect()

	// 2. Get the specific element the user hovered
	const targetRect = event.currentTarget.getBoundingClientRect()

	popupSetter.showPopup = true
	popupSetter.popupData.popupObjectType = popupObjectType
	popupSetter.popupData.popupObjectData = popupObjectData

	// 3. Calculate pixel position relative to the container
	// svgX is the horizontal center of the target
	popupSetter.popupData.svgX = targetRect.left - containerRect.left + targetRect.width / 2
	// svgY is the bottom of the target
	popupSetter.popupData.svgY = targetRect.bottom - containerRect.top
}

const hidePopupFunc = () => {
	popupSetter.showPopup = false
}

function clickedTerritory(terrID) {
	const store = useModelStore()
	store.context.territoriesToHighlight.splice(0)
	store.context.territoriesToHighlightBlue.splice(0)
	store.context.territoriesToHighlightGreen.splice(0)
	store.context.territoriesToHighlightRed.splice(0)
	store.clearHistoryHelpers()

	if (!personal.canPlay()) return

	// Ship Redeployment
	if (store.gameflow.phase === rf.PHASE_MERGER_SHIP_REDEPLOYMENT) {
		let newSlot = store.ongoingVars.siapFajiOrShippingTerrsToRemoveData[1]
		let slotIdx = controller.currentPlayerObj().slots.findIndex((slot) => JSON.stringify(slot) === JSON.stringify(newSlot))
		let territories = model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[slotIdx][0]).territories
		// Find the index of the first subarray where entry[0] is 123
		const index = territories.findIndex((entry) => entry[0] === terrID)

		// If found (index is not -1), remove only that one element
		if (index !== -1) {
			territories.splice(index, 1)
			store.context.historyObj.push(terrID)
		}

		// Extract just the terrIDs: [123, 127, 123, 124, 128]
		const terrIDs = territories.map((entry) => entry[0])
		// A Set only keeps unique values. If size < length, there was a duplicate.
		//const hasDuplicates = new Set(terrIDs).size !== terrIDs.length
		const duplicates = terrIDs.filter((id, index) => terrIDs.indexOf(id) !== index)
		// Able to remove more territories
		store.context.shippingTerrsToRedeploy = duplicates
		store.context.territoriesToHighlight.splice(0)
		store.context.territoriesToHighlight = [...store.context.shippingTerrsToRedeploy]

		// If in ship redeployment phase, EXIT NOW
		return
	}

	if (store.context.action === rf.ACT_PLACE_CITY) {
		model.addCity(terrID)

		// 1. Tag the newest city
		const newCity = store.cities[store.cities.length - 1]
		newCity.isNew = true

		// 2. Remove the tag after animation finishes (400ms in CSS)
		setTimeout(() => {
			newCity.isNew = false
		}, 500)

		store.context.action = rf.ACT_CONFIRM_END_TURN
		return
	}
	if (store.gameflow.phase === rf.PHASE_ACQUISITIONS && store.context.action === rf.ACT_FREE_EXPANSION) {
		let slot = model.getSlotFromCompanyID(store.context.selectedCompanyToAcquire)
		let slotIdx = controller.currentPlayerObj().slots.indexOf(slot)
		model.expandCompany(slotIdx, terrID)
		return
	}
	if (store.context.action === rf.ACT_EXPAND_COMPANY || store.context.action === rf.ACT_FREE_EXPANSION) {
		if (store.gameflow.phase === rf.PHASE_OPERATIONS && store.context.action === rf.ACT_EXPAND_COMPANY) {
			// Check you still have enough money
			let company = model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0])
			if (controller.currentPlayerObj().moneyCash < company.goodValue) {
				store.gameMessages.actionError = "Not enough money to expand"
				return
			}
		}
		model.expandCompany(store.context.selectedSlotToOperate, terrID)
		return
	}

	// DEBUG CLICK CODE
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) store.debugVars.clickedTerrPath = rf.OM_TERR_ID_TO_PATH_ID[terrID]
	else if (store.mapData.selectedMap === rf.MAP_AEGEAN) store.debugVars.clickedTerrPath = rf.AG_TERR_ID_TO_PATH_ID[terrID]
	else if (store.mapData.selectedMap === rf.MAP_PHP) store.debugVars.clickedTerrPath = rf.PHP_TERR_ID_TO_PATH_ID[terrID]

	store.debugVars.clickedTerrID = terrID
	store.debugVars.allNeighbours = store.mapData.allNeighbours[store.debugVars.clickedTerrID]

	store.context.territoriesToHighlight.splice(0)
	store.context.territoriesToHighlightBlue.splice(0)

	for (let i = 0; i < store.debugVars.allNeighbours.length; i++) {
		store.context.territoriesToHighlight.push(store.debugVars.allNeighbours[i])
		store.context.territoriesToHighlight.sort((a, b) => b - a)
	}
	store.context.territoriesToHighlightBlue.push(terrID)
}

function clickedAvailableCompany(company) {
	if (company.markedForRemoval) return
	store.context.territoriesToHighlight.splice(0)
	store.context.territoriesToHighlightBlue.splice(0)
	store.context.territoriesToHighlightGreen.splice(0)
	store.context.territoriesToHighlightRed.splice(0)
	store.clearHistoryHelpers()

	if (!personal.canPlay()) return

	if (store.context.action !== rf.ACT_ACQUIRE_COMPANY) return
	store.context.selectedCompanyToAcquire = company.id
	model.acquireCompany(store.context.selectedCompanyToAcquire)
}
/*function shouldShowHullCapacity() {
	if (!store.topMenuViews.showShipText) return false
	if (store.gameflow.phase === rf.PHASE_OPERATIONS) return true
	return false
}*/

function clickedProdMarker(company, terrID) {
	store.clearHistoryHelpers()
	store.stopFlashingGoodsJourney()

	if (!personal.canPlay()) return

	// Only go on if the prod marker was highlighted
	if (!store.context.prodMarkerTerritoriesToHighlight.includes(terrID)) return

	// Remove siap faji terrs
	if (store.gameflow.phase === rf.PHASE_MERGER_REMOVE_SIAP_FAJI_TERRS) {
		company.territories = company.territories.filter((territory) => territory[0] !== terrID)
		store.context.historyObj.push(terrID)
		store.context.siapFajiTerrsToRemove--
		if (store.context.siapFajiTerrsToRemove === 0) {
			store.context.prodMarkerTerritoriesToHighlight.splice(0)
			store.context.action = rf.ACT_CONFIRM_END_TURN
		} else {
			// Now re-highlight the terrs
			let newSlot = store.ongoingVars.siapFajiOrShippingTerrsToRemoveData[1]
			let allTerrs = []
			for (let i = 0; i < newSlot.length; i++) {
				for (let j = 0; j < model.getActiveCompanyDataFromID(newSlot[i]).territories.length; j++) {
					allTerrs.push(model.getActiveCompanyDataFromID(newSlot[i]).territories[j][0])
				}
			}
			// Now remove those which would break up continuous terrs
			let unconnectedAreasBefore = map.countUnconnectedAreas(new Set(allTerrs))
			let filteredTerrs = []

			for (let terrID of allTerrs) {
				let tempSet = new Set(allTerrs)
				tempSet.delete(terrID)

				let unconnectedAreasAfter = map.countUnconnectedAreas(tempSet)
				if (unconnectedAreasAfter <= unconnectedAreasBefore) {
					filteredTerrs.push(terrID)
				}
			}

			store.context.prodMarkerTerritoriesToHighlight.splice(0)
			store.context.prodMarkerTerritoriesToHighlight = [...filteredTerrs]
		}
		// If in SF phase, EXIT NOW
		return
	}

	// OPERATIONS

	// First, check if it is a DIRECT map click, and not a slot click
	if (store.context.selectedSlotToOperate === -1) {
		let companySlot = []
		for (let i = 0; i < controller.currentPlayerObj().slots.length; i++) {
			companySlot = controller.currentPlayerObj().slots[i]
			if (companySlot.includes(company.id)) {
				store.context.selectedSlotToOperate = i
				break
			}
		}
		model.setupSlotToOperate(controller.currentPlayerIndex(), store.context.selectedSlotToOperate)
	} // END setup company to operate

	// Before going on, save a reset point
	store.goodJourneyResetData = funcs.simpleExportWholeModel()

	store.context.prodMarkerTerritoriesToHighlight.splice(0)
	// Can't switch comps
	store.context.canChangeOperatingCompany = false
	// Empty the current journey
	store.context.currentGoodJourney.push(terrID)
	// Highlight Blue the neighbouring sea territories OF THE WHOLE ZONE with ***shipping capacity***
	let productionZone = map.getProductionZoneFromSlotIDXandTerrID(controller.currentPlayerIndex(), store.context.selectedSlotToOperate, terrID)
	let allSeaNeighbours = []
	for (let i = 0; i < productionZone.length; i++) {
		allSeaNeighbours = allSeaNeighbours.concat(store.mapData.seaNeighbours[productionZone[i]])
	}
	allSeaNeighbours = [...new Set(allSeaNeighbours)]
	store.context.territoriesToHighlightBlue = [...allSeaNeighbours]
	// highlight the ships you can use to sail
	store.context.shipMarkersToHighlight.splice(0)
	store.context.shipMarkersToHighlightRed.splice(0)
	store.context.shipMarkersToHighlightBlue.splice(0)

	const combinedCapacitiesMap = new Map()

	// Iterate through players and slots
	for (const player of store.players) {
		for (const slot of player.slots) {
			// Check if it's a shipping slot
			if (slot.length > 0 && model.getActiveCompanyDataFromID(slot[0]).type === rf.COMPANY_SHIPPING) {
				const territoriesCopy = JSON.parse(JSON.stringify(model.getActiveCompanyDataFromID(slot[0]).territories))

				// Combine remaining capacities efficiently using a Map
				territoriesCopy.forEach(([terrID, remainingCapacity]) => {
					combinedCapacitiesMap.set(terrID, (combinedCapacitiesMap.get(terrID) || 0) + remainingCapacity)
				})

				// Highlight ship markers based on capacities
				for (const [terrID, capacity] of combinedCapacitiesMap.entries()) {
					if (allSeaNeighbours.includes(terrID)) {
						const markerToHighlight = capacity > 0 ? store.context.shipMarkersToHighlight : store.context.shipMarkersToHighlightRed
						markerToHighlight.push([slot[0], terrID])
					}
				}

				// Clear the Map for the next iteration
				combinedCapacitiesMap.clear()
			}
		}
	}

	// Highlight reachable cities
	let reachableCities = mpf.getCitiesReachableByShipping(
		store.cities,
		store.activeCompanies,
		store.players.map((player) => player.slots),
		controller.currentPlayerIndex(),
		store.context.selectedSlotToOperate,
		store.context.historyObj.slice(1),
		store.context.currentGoodJourney.slice(1)
	)
	store.context.citiesToHighlightRed.splice(0)
	store.context.citiesToHighlight = [...reachableCities]
}

function clickedShipMarker(companyID, terrID) {
	store.clearHistoryHelpers()
	store.stopFlashingGoodsJourney()

	if (!personal.canPlay()) return

	// OPERATIONS phase only
	if (store.gameflow.phase !== rf.PHASE_OPERATIONS) return

	// First, check if it is a DIRECT map click, and not a slot click
	if (store.context.selectedSlotToOperate === -1) {
		let companySlot = []
		for (let i = 0; i < controller.currentPlayerObj().slots.length; i++) {
			companySlot = controller.currentPlayerObj().slots[i]
			if (companySlot.includes(companyID)) {
				store.context.selectedSlotToOperate = i
				break
			}
		}
		model.setupSlotToOperate(controller.currentPlayerIndex(), store.context.selectedSlotToOperate)
	}

	// Only go on if the ship marker was highlighted
	if (!store.context.shipMarkersToHighlight.some((subArray) => subArray[0] === companyID && subArray[1] === terrID)) return

	// So now you clicked a highlghted ship marker. So it must be for delivering goods
	let company = store.activeCompanies.find((company) => company.id === companyID)

	// Update the current journey
	if (store.context.currentGoodJourney.length === 2) store.context.currentGoodJourney.push(company.ownerIndex, company.id, terrID)
	else store.context.currentGoodJourney.push(terrID)

	// Highlight reachable cities - DO THIS BEFORE UPDATING HULL CAPACITY REMAINING
	let reachableCities = mpf.getCitiesReachableByShipping(
		store.cities,
		store.activeCompanies,
		store.players.map((player) => player.slots),
		controller.currentPlayerIndex(),
		store.context.selectedSlotToOperate,
		store.context.historyObj.slice(1),
		store.context.currentGoodJourney.slice(1)
	)
	store.context.citiesToHighlightRed.splice(0)
	store.context.citiesToHighlight = [...reachableCities]

	// Update the hull capacity REMAINING
	let terrArr = company.territories.find((terr) => terr[0] === terrID && terr[1] > 0)
	terrArr[1]--

	// Highlight Blue the neighbouring sea territories with shipping capacity
	let seaNeighbours = store.mapData.seaNeighbours[terrID]
	store.context.territoriesToHighlightBlue = [...seaNeighbours]
	// highlight the ships you can use to sail
	store.context.shipMarkersToHighlight.splice(0)
	store.context.shipMarkersToHighlightRed.splice(0)
	store.context.shipMarkersToHighlightBlue.splice(0)

	const territoriesCopy = JSON.parse(JSON.stringify(model.getActiveCompanyDataFromID(companyID).territories))

	const combinedCapacitiesMap = new Map()

	// Combine remaining capacities efficiently using a Map
	territoriesCopy.forEach(([terrID, remainingCapacity]) => {
		combinedCapacitiesMap.set(terrID, (combinedCapacitiesMap.get(terrID) || 0) + remainingCapacity)
	})

	// Highlight ship markers based on conditions
	for (const [terrID, capacity] of combinedCapacitiesMap.entries()) {
		if (seaNeighbours.includes(terrID) && ![...store.context.currentGoodJourney.slice(1)].includes(terrID)) {
			const markerToHighlight = capacity > 0 ? store.context.shipMarkersToHighlight : store.context.shipMarkersToHighlightRed
			markerToHighlight.push([companyID, terrID])
		}
	}

	// Clear the Map for the next iteration
	combinedCapacitiesMap.clear()

	// Highlight the cities you can sell to
	// Don't splice them here - reachable cities highlighted above
	//store.context.citiesToHighlight.splice(0)
	/*
	let landNeighbours = store.mapData.landNeighbours[terrID]
	for (let i = 0; i < store.cities.length; i++) {
		if (landNeighbours.includes(store.cities[i].territory)) {
			if (model.canCityAcceptGood(store.cities[i].territory, model.getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0]).good)) store.context.citiesToHighlight.push(store.cities[i].territory)
		}
	}*/
}

function clickedCity(city) {
	store.stopFlashingGoodsJourney()
	if (!personal.canPlay()) return

	if (!store.context.citiesToHighlight.includes(city.territory)) return

	if (store.gameflow.phase === rf.PHASE_CITY_GROWTH) {
		if (city.size === 1) {
			store.context.historyObj[0].push(city.territory)
			city.size = 2
			store.context.citiesToHighlight = store.context.citiesToHighlight.filter((terrID) => terrID !== city.territory)
			store.context.citySize1GrowsRemaining--
			if (store.context.citySize1GrowsRemaining === 0) store.context.citiesToHighlight = store.context.citiesToHighlight.filter((terrID) => store.cities.find((city) => city.territory === terrID).size !== 1)
		} else if (city.size === 2) {
			if (store.context.historyObj.length === 1) store.context.historyObj.push([])
			store.context.historyObj[1].push(city.territory)
			city.size = 3
			store.context.citiesToHighlight = store.context.citiesToHighlight.filter((terrID) => terrID !== city.territory)
			store.context.citySize2GrowsRemaining--
			if (store.context.citySize2GrowsRemaining === 0) store.context.citiesToHighlight = store.context.citiesToHighlight.filter((terrID) => store.cities.find((city) => city.territory === terrID).size !== 2)
		}

		if (store.context.citySize1GrowsRemaining === 0 && store.context.citySize2GrowsRemaining === 0) {
			store.context.citiesToHighlight.splice(0)
			store.context.action = rf.ACT_CONFIRM_END_TURN
		}

		return
	}

	// Otherwise, must be operations
	// First, check if the city is adjacent to the last sea zone. If it is, no need to auto complete journey
	if (store.context.currentGoodJourney.length > 2) {
		let landNeighbours = store.mapData.landNeighbours[store.context.currentGoodJourney[store.context.currentGoodJourney.length - 1]]
		if (landNeighbours.includes(city.territory)) {
			store.context.currentGoodJourney.push(city.territory)
			// Remove the highlights
			store.removeAllActiveHighlights()

			model.deliverGoodsToCity() // no param as it's taken from CGJ
			return
		}
	}
	// So now we must be clicking on a reachable city, but not adjacent to the last sea zone
	// Auto complete the journey
	/*let journey = mpf.completeCurrentPath(
		city.territory,
		store.activeCompanies,
		store.players.map((player) => player.slots),
		controller.currentPlayerIndex(),
		store.context.selectedSlotToOperate,
		store.context.currentGoodJourney.slice(1)
	)*/
	// journey should be in the acceptable format of CGJ
	// NB the below combines model.deliverGoodsToCity with dealing with auto complete shipment
	let slotContent = store.context.currentGoodJourney.shift()
	let alreadyCompletedLength = store.context.currentGoodJourney.length
	store.context.currentGoodJourney.splice(0) // Keep the comp id as its removed later
	store.context.currentGoodJourney = [...store.context.currentMouseoverJourneyCompletion]

	// Now fill the ships that have been used to auto complete the journey, but only if a ship comp was already selected
	if (alreadyCompletedLength > 2) {
		let shipCompany = model.getActiveCompanyDataFromID(store.context.currentGoodJourney[2])
		for (let i = alreadyCompletedLength; i <= store.context.currentGoodJourney.length - 2; i++) {
			let terrArr = shipCompany.territories.find((terrArr) => terrArr[0] === store.context.currentGoodJourney[i] && terrArr[1] > 0)
			terrArr[1] -= 1
		}
		model.deliverGoodsToCity_core(controller.currentPlayerIndex(), slotContent, store.context.currentGoodJourney, false)
		store.context.historyObj.push([...store.context.currentGoodJourney])
	}
	// else mark ships as used
	else model.deliverGoodsToCity_core(controller.currentPlayerIndex(), slotContent, store.context.currentGoodJourney, true)

	// Remove the highlights
	store.removeAllActiveHighlights()

	model.checkForResponseAfterDeliverGoodsToCity(slotContent)
}

function canSelectRNDmarker(playerIndex, rowIdx, colIdx, isEllipse) {
	if (colIdx === 4) return false
	if (!personal.canPlay()) return false
	if (store.gameflow.phase !== rf.PHASE_R_AND_D) return false
	if (store.context.action === rf.ACT_CONFIRM_END_TURN) return false
	//  [ xPos, yPos, radius, playerIndex]
	if (isEllipse && rowIdx !== 4) return false
	if (!isEllipse && rowIdx === 4) return false
	if (rowIdx !== 4 && playerIndex === controller.currentPlayerIndex()) return true
	if (rowIdx === 4) return true
	return false
}

function isCurrentPlayerAt(row, col) {
	const activePlayerIdx = controller.currentPlayerIndex()
	// Check if the current player's RnD value for this track matches this column
	// (Adding 1 because col 0 is RnD level 1)
	return store.players[activePlayerIdx].RnD[row] === col + 1
}

function clickedRNDentry(playerIndex, rowIdx, colIdx, isEllipse) {
	store.clearHistoryHelpers()
	if (!personal.canPlay()) return
	if (!canSelectRNDmarker(playerIndex, rowIdx, colIdx, isEllipse)) return
	model.upgradeRND(playerIndex, rowIdx)
}

function getGoodsArrayForCity(city) {
	let res = [0, 0, 0, 0, 0]
	for (let i = 0; i < city.receivedGoods.length; i++) {
		res[city.receivedGoods[i]]++
	}
	return res
}

const computedShipMarkerDisplayData = computed(() => {
	// x, y, shipGfx, companyID, terrID
	let res = []

	let usedTerrs = []

	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].slots.length; j++) {
			for (let k = 0; k < store.players[i].slots[j].length; k++) {
				let company = model.getActiveCompanyDataFromID(store.players[i].slots[j][k])
				if (company.type === rf.COMPANY_SHIPPING) {
					let shipGfx = company.shipGfx //+ String(personal.getCorrectedColour(store.players[company.ownerIndex].colour))
					for (let l = 0; l < company.territories.length; l++) {
						let terrID = company.territories[l][0]
						let alreadyPresentShips = usedTerrs.reduce((count, num) => (num === terrID ? count + 1 : count), 0)
						let posShift = Math.floor(alreadyPresentShips / 5)
						alreadyPresentShips = alreadyPresentShips % 5
						let x = map.getTerritoryDataFromTerritoryID(terrID).shipLocs[alreadyPresentShips][0] + (posShift / 2) * store.mapData.selectedMapData.shipMarkerWidth
						let y = map.getTerritoryDataFromTerritoryID(terrID).shipLocs[alreadyPresentShips][1] + (posShift / 2) * store.mapData.selectedMapData.shipMarkerWidth
						usedTerrs.push(terrID)
						res.push([x, y, shipGfx, company.id, terrID, l, company.ownerIndex, [company.hullCapacity - company.territories[l][1], company.hullCapacity]])
					}
				}
			}
		}
	}
	return res
})

const computedRNDdisplayData = computed(() => {
	const markers = []
	const rndMapData = store.mapData.selectedMapData.RNDdata
	const radius = rndMapData.diameter / 2

	// Loop through players to find active markers
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].RnD.length; j++) {
			// Skip unused tracks
			if (store.players[i].RnD[j] < 0) continue

			const rndValue = store.players[i].RnD[j]

			// 1. Calculate Base Positions
			let xPos = rndMapData.topCorner[0] + radius + (rndValue - 1) * rndMapData.xShift
			let yPos = rndMapData.topCorner[1] + radius + j * rndMapData.yShift

			// 2. Apply Player-specific Offsets (Your existing logic)
			if (i == 1 || i == 3) xPos += rndMapData.diameter
			if (i == 4) xPos += radius
			if (i == 2 || i == 3) yPos += rndMapData.diameter
			if (i == 4) yPos += radius

			// 3. Apply Map-specific offsets
			if (store.mapData.selectedMap === rf.MAP_OM_3E) {
				if (rndValue === 2) xPos -= rndMapData.xShift * 0
				if (rndValue === 5) xPos -= rndMapData.xShift / 3.3
			}

			// 4. Push a unique marker object
			markers.push({
				// UNIQUE ID: This is the secret to the sliding effect.
				// It identifies "Player i's marker on Track j"
				id: `player-${i}-track-${j}`,
				x: xPos,
				y: yPos,
				r: radius,
				playerIdx: i,
				trackIdx: j,
				rndValue: rndValue - 1, // 0-indexed for your logic
				color: personal.getCorrectedColourHex(store.players[i].colour),
			})
		}
	}

	return markers
})
const computedAvailableCompaniesDisplayData = computed(() => {
	let companyList = JSON.parse(JSON.stringify(store.availableCompanies))
	let usedProvinces = []
	for (let i = 0; i < companyList.length; i++) {
		// Make an exception for PH MAL/DAV company
		if (store.mapData.selectedMap === rf.MAP_PHP && companyList[i].id === 11) {
			companyList[i].Xpos = store.mapData.selectedMapData.availableCompanyLocations[24][0][0]
			companyList[i].Ypos = store.mapData.selectedMapData.availableCompanyLocations[24][0][1]
			continue
		}
		let alreadyPresentComps = usedProvinces.reduce((count, num) => (num === companyList[i].province ? count + 1 : count), 0)
		companyList[i].Xpos = store.mapData.selectedMapData.availableCompanyLocations[companyList[i].province][alreadyPresentComps][0]
		companyList[i].Ypos = store.mapData.selectedMapData.availableCompanyLocations[companyList[i].province][alreadyPresentComps][1]
		usedProvinces.push(companyList[i].province)
	}

	return companyList
})

const computedAvailableCompaniesDisplayDataFUTURE = computed(() => {
	let companyList = JSON.parse(JSON.stringify(store.availableCompanies))
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) {
		if (store.gameflow.currentEra === rf.ERA_A) companyList = companyList.concat(rf.ALL_COMPANIES.filter((company) => company.era > rf.ERA_A))
		else if (store.gameflow.currentEra === rf.ERA_B) companyList = companyList.concat(rf.ALL_COMPANIES.filter((company) => company.era > rf.ERA_B))
	} else if (store.mapData.selectedMap === rf.MAP_AEGEAN) {
		if (store.gameflow.currentEra === rf.ERA_A) companyList = companyList.concat(rf.AG_ALL_COMPANIES.filter((company) => company.era > rf.ERA_A))
		else if (store.gameflow.currentEra === rf.ERA_B) companyList = companyList.concat(rf.AG_ALL_COMPANIES.filter((company) => company.era > rf.ERA_B))
	} else if (store.mapData.selectedMap === rf.MAP_PHP) {
		if (store.gameflow.currentEra === rf.ERA_A) companyList = companyList.concat(rf.PH_ALL_COMPANIES.filter((company) => company.era > rf.ERA_A))
		else if (store.gameflow.currentEra === rf.ERA_B) companyList = companyList.concat(rf.PH_ALL_COMPANIES.filter((company) => company.era > rf.ERA_B))
		// First, remove all oii companies
		companyList = companyList.filter((company) => company.type !== rf.COMPANY_OIL)

		// But remove the ID's that were taken out at the start
		let previouslyRemovedCompanyIDs = []
		for (let i = store.history.length - 1; i >= 0; i--) {
			if (store.history[i][0] === rf.HIST_NEW_ERA && store.history[i][3].length > 1) {
				previouslyRemovedCompanyIDs = previouslyRemovedCompanyIDs.concat(store.history[i][3][1])
			}
		}
		companyList = companyList.filter((company) => !previouslyRemovedCompanyIDs.includes(company.id))
		// Find those provinces that were removed
		let previouslyRemovedCompanyProvinces = []
		for (let i = 0; i < previouslyRemovedCompanyIDs.length; i++) {
			let previousProvince = rf.PH_ALL_COMPANIES.find((c) => c.id === previouslyRemovedCompanyIDs[i]).province
			previouslyRemovedCompanyProvinces.push(previousProvince)
		}
		// Now add the ERA_C oil companies with the matching provinces
		for (let i = 0; i < previouslyRemovedCompanyProvinces.length; i++) {
			let oilCompany = rf.PH_ALL_COMPANIES.find((c) => c.province === previouslyRemovedCompanyProvinces[i] && c.type === rf.COMPANY_OIL && c.era === rf.ERA_C)
			companyList.push(JSON.parse(JSON.stringify(oilCompany)))
		}
	}

	let usedProvinces = []
	for (let i = 0; i < companyList.length; i++) {
		// Make an exception for PH MAL/DAV company
		if (store.mapData.selectedMap === rf.MAP_PHP && companyList[i].id === 11) {
			companyList[i].Xpos = store.mapData.selectedMapData.availableCompanyLocations[24][0][0]
			companyList[i].Ypos = store.mapData.selectedMapData.availableCompanyLocations[24][0][1]
			if (companyList[i].era === store.gameflow.currentEra) companyList[i].strokeColour = "black"
			else if (companyList[i].era === store.gameflow.currentEra + 1) companyList[i].strokeColour = "orange"
			else companyList[i].strokeColour = "red"
			continue
		}

		let alreadyPresentComps = usedProvinces.reduce((count, num) => (num === companyList[i].province ? count + 1 : count), 0)

		if (alreadyPresentComps === 0 || (alreadyPresentComps === 1 && store.mapData.selectedMapData.availableCompanyLocations[companyList[i].province].length === 2)) {
			companyList[i].Xpos = store.mapData.selectedMapData.availableCompanyLocations[companyList[i].province][alreadyPresentComps][0]
			companyList[i].Ypos = store.mapData.selectedMapData.availableCompanyLocations[companyList[i].province][alreadyPresentComps][1]
			usedProvinces.push(companyList[i].province)
		} else {
			if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap) && companyList[i].province === rf.PROVINCE_JAW_BAR) {
				companyList[i].Xpos = store.mapData.selectedMapData.availableCompanyLocations[companyList[i].province][0][0]
				companyList[i].Ypos = store.mapData.selectedMapData.availableCompanyLocations[companyList[i].province][0][1] + store.mapData.selectedMapData.viewSettings.availableCompanyLength * 1.1
			} else if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap) && companyList[i].province === rf.PROVINCE_MAL) {
				companyList[i].Xpos = store.mapData.selectedMapData.availableCompanyLocations[companyList[i].province][0][0] + store.mapData.selectedMapData.viewSettings.availableCompanyLength * 1.1
				companyList[i].Ypos = store.mapData.selectedMapData.availableCompanyLocations[companyList[i].province][0][1]
			} else if (store.mapData.selectedMap === rf.MAP_AEGEAN) {
				companyList[i].Xpos = store.mapData.selectedMapData.availableCompanyLocations[companyList[i].province][0][0]
				companyList[i].Ypos = store.mapData.selectedMapData.availableCompanyLocations[companyList[i].province][0][1] + store.mapData.selectedMapData.viewSettings.availableCompanyLength * 1.1
			} else if (store.mapData.selectedMap === rf.MAP_PHP) {
				companyList[i].Xpos = store.mapData.selectedMapData.availableCompanyLocations[companyList[i].province][0][0]
				companyList[i].Ypos = store.mapData.selectedMapData.availableCompanyLocations[companyList[i].province][0][1] + store.mapData.selectedMapData.viewSettings.availableCompanyLength * 1.1
			}
		}

		if (companyList[i].era === store.gameflow.currentEra && store.mapData.selectedMap !== rf.MAP_PHP) companyList[i].strokeColour = "white"
		else if (companyList[i].era === store.gameflow.currentEra) companyList[i].strokeColour = "black"
		else if (companyList[i].era === store.gameflow.currentEra + 1) companyList[i].strokeColour = "orange"
		else companyList[i].strokeColour = "red"
	}

	return companyList
})

function getShipMarkerFilterURL(entry, returnIsHighlighted) {
	// entry = [x, y, shipGfx, companyID, terrID]

	// highlight green mouseover
	if (store.context.shipMarkerImageToHighlightGreen.length > 0 && store.context.shipMarkerImageToHighlightGreen[0][0] === entry[3] && store.context.shipMarkerImageToHighlightGreen[0][1] === entry[4]) {
		if (returnIsHighlighted) return true
		return `url(#f_lightGreen)`
	}
	// Highlight green if in current good journey
	if (store.context.currentGoodJourney.length > 2 && store.context.currentGoodJourney[3] === entry[3]) {
		if (store.context.currentGoodJourney.slice(3).includes(entry[4])) {
			if (returnIsHighlighted) return true
			return `url(#f_lightGreen)`
		}
	}
	// Possible Merger Highlight
	// Find all the territories in the merger
	let companyIDs = []
	let terrIDs = []
	for (let i = 0; i < store.ongoingVars.selectedMergerInfo.length; i++) {
		let playerIndex = store.ongoingVars.selectedMergerInfo[i][0]
		let slotIdx = store.ongoingVars.selectedMergerInfo[i][1]
		for (let j = 0; j < store.players[playerIndex].slots[slotIdx].length; j++) {
			companyIDs.push(store.players[playerIndex].slots[slotIdx][j])
			let company = model.getActiveCompanyDataFromID(store.players[playerIndex].slots[slotIdx][j])
			for (let k = 0; k < company.territories.length; k++) {
				terrIDs.push(company.territories[k][0])
			}
		}
	}
	if (companyIDs.includes(entry[3]) && terrIDs.includes(entry[4])) {
		if (returnIsHighlighted) return true
		return `url(#f_green_pulse_ship)`
	}
	// Highlight RED
	if (store.context.shipMarkersToHighlightRed.some((subArray) => subArray[0] === entry[3] && subArray[1] === entry[4])) {
		if (returnIsHighlighted) return true
		return `url(#f_red)`
	}
	// Highlight BLUE
	if (store.context.shipMarkersToHighlightBlue.some((subArray) => subArray[0] === entry[3] && subArray[1] === entry[4])) {
		if (returnIsHighlighted) return true
		return `url(#f_blue)`
	}
	// Highlight yellow if selectable
	if (store.context.shipMarkersToHighlight.some((subArray) => subArray[0] === entry[3] && subArray[1] === entry[4])) {
		if (returnIsHighlighted) return true
		return `url(#f_yellow)`
	}
	// Highlight pulsing yellow for existing ship markers during expansion
	if (store.context.shipMarkersToPulse.some((subArray) => subArray[0] === entry[3] && subArray[1] === entry[4])) {
		if (returnIsHighlighted) return true
		return `url(#f_yellow_pulse)`
	}

	if (store.historyHelpers.shipMarkersInSameCompany.some((subArray) => subArray[0] === entry[3] && subArray[1] === entry[4])) {
		return `url(#f_lightGreen)`
	}
	// else outline black
	if (returnIsHighlighted) return false

	return `url(#f_black)`
}

// Function to update the filter value for a specific entry
function setShipMarkerFilterGreen(event, entry, setGreen) {
	// Update the value inside the ref
	store.context.shipMarkerImageToHighlightGreen.splice(0)
	if (setGreen) {
		if (store.context.shipMarkersToHighlight.some((subArray) => subArray[0] === entry[3] && subArray[1] === entry[4])) store.context.shipMarkerImageToHighlightGreen.push([entry[3], entry[4]])
		// POPUP INFO
		showPopupFunc(event, 3, [...entry])
		// If it is ship removal phase, we don't want highlighting
		if (store.gameflow.phase === rf.PHASE_MERGER_SHIP_REDEPLOYMENT && personal.canPlay()) return
		// If it's ops phase, we don't want highlighting
		if (store.gameflow.phase === rf.PHASE_OPERATIONS && personal.canPlay()) return
		// Highlight ships in same companye
		store.historyHelpers.shipMarkersInSameCompany.splice(0) // Clear existing
		const companyID = entry[3]
		const slot = model.getSlotFromCompanyID(companyID)
		for (let i = 0; i < slot.length; i++) {
			let company = model.getActiveCompanyDataFromID(slot[i])
			for (let j = 0; j < company.territories.length; j++) {
				// Add existing ship markers to pulse array
				store.historyHelpers.shipMarkersInSameCompany.push([company.id, company.territories[j][0]])
			}
		}
	} else {
		// POPUP INFO
		hidePopupFunc()
		store.historyHelpers.shipMarkersInSameCompany.splice(0)
	}
	// conp id, terr id
}

function getProdMarkerHighlightStrokeWidth(terrArr) {
	// Highlight
	if (store.context.prodMarkerTerritoriesToHighlight.includes(terrArr[0])) return store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth
	if (typeof store.context.currentGoodJourney[0] === "object" && store.context.currentGoodJourney[1] === terrArr[0]) return store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth
	if (prodMarkerInMerger(terrArr)) return store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth * 2
	if (store.historyHelpers.prodMarkersInSameCompany.includes(terrArr[0])) return store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth
	return 0
}

function prodMarkerInMerger(terrArr) {
	// Find all the territories in the merger
	let terrIDs = []
	for (let i = 0; i < store.ongoingVars.selectedMergerInfo.length; i++) {
		let playerIndex = store.ongoingVars.selectedMergerInfo[i][0]
		let slotIdx = store.ongoingVars.selectedMergerInfo[i][1]
		for (let j = 0; j < store.players[playerIndex].slots[slotIdx].length; j++) {
			let company = model.getActiveCompanyDataFromID(store.players[playerIndex].slots[slotIdx][j])
			for (let k = 0; k < company.territories.length; k++) {
				terrIDs.push(company.territories[k][0])
			}
		}
	}
	if (terrIDs.includes(terrArr[0])) return true
	return false
}

function hideErrorPopup() {
	let popup = document.getElementsByClassName("infoPopup")[0]
	popup.style.display = "none"
	popupSetter.showPopup = false
}

function getMapWidth() {
	const screenWidth = window.innerWidth // Get the device screen width

	if (store.refSize > screenWidth + 500 && screenWidth > 1000) store.refSize = Math.floor((screenWidth + 500) / 100) * 100
	return store.refSize
}

function localToggleFutureBoardState() {
	store.clearHistoryHelpers()

	if (store.topMenuViews.showFutureBoardState === 0) {
		store.topMenuViews.showFutureBoardState = 1

		for (let i = 0; i < store.players[personal.pov].eraCards.length; i++) {
			let cardID = store.players[personal.pov].eraCards[i]
			let eraCard
			if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) eraCard = rf.ALL_ERA_CARDS.find((card) => card.id === cardID)
			else if (store.mapData.selectedMap === rf.MAP_AEGEAN) eraCard = rf.AG_ALL_ERA_CARDS.find((card) => card.id === cardID)
			else if (store.mapData.selectedMap === rf.MAP_PHP) eraCard = rf.PH_ALL_ERA_CARDS.find((card) => card.id === cardID)
			// Highlight the terrs
			let validTerrs = []
			let invalidTerrs = []

			for (let i = 0; i < eraCard.provinces.length; i++) {
				if (model.doesProvinceContainCity(eraCard.provinces[i])) invalidTerrs = invalidTerrs.concat(map.getWholeProvinceTerrIDs(eraCard.provinces[i]))
				else validTerrs = validTerrs.concat(map.getWholeProvinceTerrIDs(eraCard.provinces[i]))
			}
			let occupiedTerrs = model.getOccupiedTerrIDs()
			for (let i = validTerrs.length - 1; i >= 0; i--) {
				if (!map.isCoastal(validTerrs[i])) {
					invalidTerrs.push(validTerrs[i])
					validTerrs.splice(i, 1)
				} else if (occupiedTerrs.includes(validTerrs[i])) {
					invalidTerrs.push(validTerrs[i])
					validTerrs.splice(i, 1)
				}
			}
			//await nextTick()
			store.historyHelpers.histTerritoriesToHighlight = store.historyHelpers.histTerritoriesToHighlight.concat(validTerrs)

			store.historyHelpers.histTerritoriesToHighlightRed = store.historyHelpers.histTerritoriesToHighlightRed.concat(invalidTerrs)
		}
	} else store.topMenuViews.showFutureBoardState = 0
}

function getShipCapacitySqX(index, used, total) {
	// You start on the ship marker left-X
	// index runs from ONE to FIVE
	let res = 0
	// 1 capac
	if (total === 1 && index === 1) return store.mapData.selectedMapData.shipMarkerWidth / 2 - store.mapData.selectedMapData.shipCapacitySqW / 2
	// 2 capac
	if (total === 2 && index === 1) return store.mapData.selectedMapData.shipMarkerWidth / 2 - store.mapData.selectedMapData.shipCapacitySqW
	if (total === 2 && index === 2) return store.mapData.selectedMapData.shipMarkerWidth / 2
	// 3 capac
	if (total === 3 && index === 1) return store.mapData.selectedMapData.shipMarkerWidth / 2 - store.mapData.selectedMapData.shipCapacitySqW * 1.5
	if (total === 3 && index === 2) return store.mapData.selectedMapData.shipMarkerWidth / 2 - store.mapData.selectedMapData.shipCapacitySqW / 2
	if (total === 3 && index === 3) return store.mapData.selectedMapData.shipMarkerWidth / 2 + store.mapData.selectedMapData.shipCapacitySqW * 0.5
	// 4 capac
	if (total === 4 && index === 1) return store.mapData.selectedMapData.shipMarkerWidth / 2 - store.mapData.selectedMapData.shipCapacitySqW * 2
	if (total === 4 && index === 2) return store.mapData.selectedMapData.shipMarkerWidth / 2 - store.mapData.selectedMapData.shipCapacitySqW
	if (total === 4 && index === 3) return store.mapData.selectedMapData.shipMarkerWidth / 2
	if (total === 4 && index === 4) return store.mapData.selectedMapData.shipMarkerWidth / 2 + store.mapData.selectedMapData.shipCapacitySqW
	// 5 capac
	if (total === 5 && index === 1) return store.mapData.selectedMapData.shipMarkerWidth / 2 - store.mapData.selectedMapData.shipCapacitySqW * 2.5
	if (total === 5 && index === 2) return store.mapData.selectedMapData.shipMarkerWidth / 2 - store.mapData.selectedMapData.shipCapacitySqW * 1.5
	if (total === 5 && index === 3) return store.mapData.selectedMapData.shipMarkerWidth / 2 - store.mapData.selectedMapData.shipCapacitySqW / 2
	if (total === 5 && index === 4) return store.mapData.selectedMapData.shipMarkerWidth / 2 + store.mapData.selectedMapData.shipCapacitySqW * 0.5
	if (total === 5 && index === 5) return store.mapData.selectedMapData.shipMarkerWidth / 2 + store.mapData.selectedMapData.shipCapacitySqW * 1.5

	return res
}

function getShipCapacitySqFillColour(index, used) {
	if (used === 0) return "white"
	if (store.context.selectedSlotToOperate === -1) return "white"
	if (index > used) return "white"
	// So now we need a fill. So find company being operated and fill it with good colour
	let company = store.activeCompanies.find((comp) => comp.id === controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0])
	return view.getGoodColour(company.good)
	//return index <= used ? 'black' : 'white'
}

function mouseOverCity(event, popupObjectType, popupObjectData) {
	// 1. Calculate Screen Coordinates for Popup
	// Find the relative container (parent of SVG)
	const containerRect = DEBUGmapSVG.value.parentElement.getBoundingClientRect()
	const targetRect = event.currentTarget.getBoundingClientRect()

	// Horizontal Center of City, Vertical Bottom of City
	//const pixelX = targetRect.left - containerRect.left + targetRect.width / 2
	//const pixelY = targetRect.bottom - containerRect.top

	// 2. Call the base popup function with calculated pixels
	showPopupFunc(event, popupObjectType, popupObjectData)

	// --- REMAINDER OF YOUR LOGIC ---
	let cityTerrID = popupObjectData[0].territory
	if (store.gameflow.phase !== rf.PHASE_OPERATIONS) return
	if (!store.context.citiesToHighlight.includes(cityTerrID)) return

	// Adjacent check
	if (store.context.currentGoodJourney.length > 2) {
		let landNeighbours = store.mapData.landNeighbours[store.context.currentGoodJourney[store.context.currentGoodJourney.length - 1]]
		if (landNeighbours.includes(cityTerrID)) return
	}

	// Path completion logic
	let journey = mpf.completeCurrentPath(
		cityTerrID,
		store.activeCompanies,
		store.players.map((_, n) => (n == controller.currentPlayerIndex() ? 0 : store.context.unfavouredPlayerIndexes[n] ? 2 : 1)),
		store.players.map((_, n) => (store.useShippingSubsidy && store.context.unfavouredPlayerIndexes[n] ? store.players[n].RnD[rf.RnD_SHIPPING_SUBSIDY_IDX] - 1 : 0)),
		store.players.map((player) => player.slots),
		controller.currentPlayerIndex(),
		store.context.selectedSlotToOperate,
		store.context.currentGoodJourney.slice(1)
	)

	let shippingCompanyID = journey[2]
	for (let i = store.context.currentGoodJourney.length - 1; i < journey.length - 1; i++) {
		store.context.shipMarkersToHighlightBlue.push([shippingCompanyID, journey[i]])
	}
	store.context.currentMouseoverJourneyCompletion = [...journey]
}

function mouseOffCity() {
	hidePopupFunc()
	store.context.shipMarkersToHighlightBlue.splice(0)
	store.context.currentMouseoverJourneyCompletion.splice(0)
}

function getCityStrokeWidth(city) {
	if (store.context.citiesToHighlight.includes(city.territory)) return store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth
	if (store.context.citiesToHighlightRed.includes(city.territory)) return store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth
	if (store.mapData.selectedMap === rf.MAP_PHP) return store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth

	return 0
}

function handlePointerEnter(event, company) {
	// If the user is on an iPad/Touch device, don't trigger the hover logic.
	// This allows the first tap to go straight to @click.

	if (event.pointerType === "touch") return

	// Otherwise, run your desktop hover logic
	mouseOverAvailableCompany(event, 0, [company.id])
}
</script>

<template>
	<!-- DEBUG ONLY-->
	<!--
	Territory Path: {{ store.debugVars.clickedTerrPath }}
	<br />
	hexRescenter: [{{ Math.round(cxPos) }}, {{ Math.round(cyPos) }}],

	<br />
	<br />
	Ship Pos: [{{ Math.round(rects[0].x) }}, {{ Math.round(rects[0].y) }}], [{{ Math.round(rects[1].x) }}, {{ Math.round(rects[1].y) }}], [{{ Math.round(rects[2].x) }}, {{ Math.round(rects[2].y) }}], [{{ Math.round(rects[3].x) }}, {{ Math.round(rects[3].y) }}], [{{ Math.round(rects[4].x) }}, {{ Math.round(rects[4].y) }}]
	<br />
	<br />
	Avail Comp Rect:
	<br />
	[[{{ Math.round(rects[5].x) }}, {{ Math.round(rects[5].y) }}]]
	<br />
	[[{{ Math.round(rects[5].x) }}, {{ Math.round(rects[5].y) }}], [{{ Math.round(rects[6].x) }}, {{ Math.round(rects[6].y) }}]]
	<br />
-->
	<!-- END DEBUG ONLY -->
	<div
		v-if="store.mapData.selectedMap !== rf.MAP_RANDOM_TASK"
		id="originalMapDiv"
		ref="originalMapDivRef"
		:style="{
			width: String(getMapWidth()) + 'px',
		}">
		<Transition name="fade">
			<MapPopup v-if="popupSetter.showPopup" @mouseover="hideErrorPopup" :mapPopupProp="popupSetter.popupData" />
		</Transition>
		<svg :viewBox="store.mapData.selectedMapData.viewbox" id="mapSVG" @mousemove="DEBUGmoveElement" @mouseup="DEBUGstopDrag" ref="DEBUGmapSVG">
			<image :width="store.mapData.selectedMapData.backgroundDim[0]" :height="store.mapData.selectedMapData.backgroundDim[1]" preserveAspectRatio="none" :xlink:href="view.getImage('current_map_background')" style="display: inline" />

			<!-- ABSOLUTE BOTTOM LAYER - BLACK TERR OUTLINE OPTION -->
			<g v-if="store.topMenuViews.showTerrOutline">
				<g
					v-for="(dataEntry, idx) in store.mapData.selectedMapData.terrPaths"
					:key="idx"
					:style="{
						'stroke-width': `${store.mapData.selectedMapData.strokeWidthShowTerrOutlineBlack}px`,
					}">
					<path class="territoryOutlineBlack" :d="dataEntry.pathD" />
				</g>
			</g>

			<!-- MASK UNUSED PH R&F TRACKS -->
			<rect v-if="store.mapData.selectedMap === rf.MAP_PHP && !store.useMergerSubsidy" x="1142.5" y="401" width="477" height="79.5" fill="grey" opacity="0.5" />
			<rect v-if="store.mapData.selectedMap === rf.MAP_PHP && !store.useShippingSubsidy" x="1142.5" y="480.5" width="477" height="79.5" fill="grey" opacity="0.5" />

			<!-- CITIES -->
			<g v-for="(city, idx) in store.cities" :key="idx">
				<ellipse
					class="cityEllipse"
					:class="[{ 'city-plop': city.isNew }, { selectableCity: store.context.citiesToHighlight.includes(city.territory) }, { redCity: store.context.citiesToHighlightRed.includes(city.territory) }]"
					:cx="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0]"
					:cy="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1]"
					:rx="store.mapData.selectedMapData.cityRadius"
					:ry="store.mapData.selectedMapData.cityRadius"
					:fill="'url(#city_' + String(city.size) + ')'"
					:style="{
						'stroke-width': getCityStrokeWidth(city),
					}"
					@click="clickedCity(city)"
					@mouseover="mouseOverCity($event, 1, [city])"
					@mouseleave="mouseOffCity" />
				<ellipse v-if="city.isNew" class="city-ripple" :cx="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0]" :cy="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1]" :rx="store.mapData.selectedMapData.cityRadius" :ry="store.mapData.selectedMapData.cityRadius" />
				<g v-for="(amount, good) in getGoodsArrayForCity(city)" :key="good">
					<g v-if="amount === 1">
						<rect class="deliveredGoodRect" :style="{ 'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}` }" :x="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0] - store.mapData.selectedMapData.receivedGoodMarkerSize / 2" :y="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * good" :width="store.mapData.selectedMapData.receivedGoodMarkerSize" :height="store.mapData.selectedMapData.receivedGoodMarkerSize" :fill="view.getGoodColour(good)" />
					</g>
					<g v-else-if="amount === 2">
						<rect class="deliveredGoodRect" :style="{ 'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}` }" :x="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0] - store.mapData.selectedMapData.receivedGoodMarkerSize / 2 - store.mapData.selectedMapData.receivedGoodMarkerSize * 0.75" :y="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * good" :width="store.mapData.selectedMapData.receivedGoodMarkerSize" :height="store.mapData.selectedMapData.receivedGoodMarkerSize" :fill="view.getGoodColour(good)" />
						<rect class="deliveredGoodRect" :style="{ 'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}` }" :x="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0] - store.mapData.selectedMapData.receivedGoodMarkerSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * 0.75" :y="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * good" :width="store.mapData.selectedMapData.receivedGoodMarkerSize" :height="store.mapData.selectedMapData.receivedGoodMarkerSize" :fill="view.getGoodColour(good)" />
					</g>
					<g v-else-if="amount === 3">
						<rect class="deliveredGoodRect" :style="{ 'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}` }" :x="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0] - store.mapData.selectedMapData.receivedGoodMarkerSize / 2 - store.mapData.selectedMapData.receivedGoodMarkerSize * 1.5" :y="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * good" :width="store.mapData.selectedMapData.receivedGoodMarkerSize" :height="store.mapData.selectedMapData.receivedGoodMarkerSize" :fill="view.getGoodColour(good)" />
						<rect class="deliveredGoodRect" :style="{ 'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}` }" :x="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0] - store.mapData.selectedMapData.receivedGoodMarkerSize / 2" :y="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * good" :width="store.mapData.selectedMapData.receivedGoodMarkerSize" :height="store.mapData.selectedMapData.receivedGoodMarkerSize" :fill="view.getGoodColour(good)" />
						<rect class="deliveredGoodRect" :style="{ 'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}` }" :x="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0] - store.mapData.selectedMapData.receivedGoodMarkerSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * 1.5" :y="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * good" :width="store.mapData.selectedMapData.receivedGoodMarkerSize" :height="store.mapData.selectedMapData.receivedGoodMarkerSize" :fill="view.getGoodColour(good)" />
					</g>
				</g>
				<!-- HIST HIGHLIGHTS -->
				<g v-if="store.historyHelpers.histCitiesToHighlight.includes(city.territory)">
					<ellipse class="historyHighlightPath fillYellow" :cx="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0]" :cy="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1]" :rx="store.mapData.selectedMapData.cityRadius" :ry="store.mapData.selectedMapData.cityRadius" />
				</g>
				<g v-if="store.historyHelpers.histCitiesToHighlightBlue.includes(city.territory)">
					<ellipse class="historyHighlightPath fillBlue" :cx="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0]" :cy="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1]" :rx="store.mapData.selectedMapData.cityRadius" :ry="store.mapData.selectedMapData.cityRadius" />
				</g>
			</g>

			<!-- BOTTOM LAYER - RED -->
			<g
				v-for="(terrID, idx) in store.context.territoriesToHighlightRed"
				:key="idx"
				:style="{
					'stroke-width': `${store.mapData.selectedMapData.strokeWidthOutlineTerr}px`,
				}">
				<path class="territoryToHighlightRed" :d="map.getPathDfromterrID(terrID)" />
			</g>

			<!-- Base Highlight layer -- YELLOW + SELECTABLE -->
			<g
				v-for="(terrID, idx) in store.context.territoriesToHighlight"
				:key="idx"
				:style="{
					'stroke-width': `${store.mapData.selectedMapData.strokeWidthOutlineTerr}px`,
				}">
				<path class="selectableSVGarea territoryToHighlight" :d="map.getPathDfromterrID(terrID)" @click="clickedTerritory(terrID)" :id="rf.OM_TERR_ID_TO_PATH_ID[terrID]" @mouseenter="store.context.territoriesToHighlightGreen.push(terrID)" @mouseleave="store.context.territoriesToHighlightGreen.splice(0)" />
			</g>

			<!-- Middle layer for the Blue -->
			<g
				v-for="(terrID, idx) in store.context.territoriesToHighlightBlue"
				:key="idx"
				:style="{
					'stroke-width': `${store.mapData.selectedMapData.strokeWidthOutlineTerr}px`,
				}">
				<path class="hollowSVGarea territoryToHighlightBlue" :d="map.getPathDfromterrID(terrID)" />
			</g>

			<!-- Top layer for the highlight green -->
			<g
				v-for="(terrID, idx) in store.context.territoriesToHighlightGreen"
				:key="idx"
				:style="{
					'stroke-width': `${store.mapData.selectedMapData.strokeWidthOutlineTerr}px`,
				}">
				<path class="hollowSVGarea territoryToHighlightGreen" :d="map.getPathDfromterrID(terrID)" :id="rf.OM_TERR_ID_TO_PATH_ID[terrID]" @click="clickedTerritory(terrID)" @mouseleave="store.context.territoriesToHighlightGreen.splice(0)" />
			</g>

			<!-- Finally draw again the green circle over the current canvas -->
			<g v-if="store.topMenuViews.showFutureBoardState === 0">
				<!-- AVAILABLE COMPANIES-->
				<g v-for="(company, idx) in computedAvailableCompaniesDisplayData" :key="idx">
					<rect
						:class="[{ availableCompanyRect: store.mapData.selectedMap !== rf.MAP_PHP }, { availableCompanyRectPHP: store.mapData.selectedMap === rf.MAP_PHP }, { selectableCompanyRect: personal.canPlay() && store.context.action === rf.ACT_ACQUIRE_COMPANY && store.gameflow.phase === rf.PHASE_ACQUISITIONS && !company.markedForRemoval }, { selectedCompanyRect: company.id === store.context.selectedCompanyToAcquire }]"
						:style="{
							'stroke-width': store.context.action === rf.ACT_ACQUIRE_COMPANY || company.id === store.context.selectedCompanyToAcquire ? `${store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth}` : `${store.mapData.selectedMapData.availableCompanyOutlineStroke}`,
							//stroke: store.mapData.selectedMap === rf.MAP_PHP ? 'black' : 'white',
						}"
						@click="clickedAvailableCompany(company)"
						@pointerenter="handlePointerEnter($event, company)"
						@pointerleave="mouseOutAvailableCompany()"
						:x="company.Xpos"
						:y="company.Ypos"
						:width="store.mapData.selectedMapData.viewSettings.availableCompanyLength + 'px'"
						:height="store.mapData.selectedMapData.viewSettings.availableCompanyLength + 'px'"
						:fill="`url(#${company.gfx})`" />
					<text
						v-if="company.type === rf.COMPANY_SHIPPING"
						:x="company.Xpos + store.mapData.selectedMapData.viewSettings.availableCompanyLength / 20"
						:y="company.Ypos + store.mapData.selectedMapData.viewSettings.availableCompanyLength / 1.5"
						class="availableShipCompanyText unclickable"
						:style="{
							'font-size': `${store.mapData.selectedMapData.viewSettings.availableCompanyLength / 3}px !important`,
							'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}`,
						}">
						{{ company.capacity[0] === 0 ? " - " : company.capacity[0] }}/{{ company.capacity[1] }}/{{ company.capacity[2] }}
					</text>
					<path v-if="company.markedForRemoval" :d="'M' + company.Xpos + ',' + company.Ypos + ' L' + (company.Xpos + store.mapData.selectedMapData.viewSettings.availableCompanyLength) + ',' + (company.Ypos + store.mapData.selectedMapData.viewSettings.availableCompanyLength)" stroke="black" :stroke-width="store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth" />
					<path v-if="company.markedForRemoval" :d="'M' + company.Xpos + ',' + (company.Ypos + store.mapData.selectedMapData.viewSettings.availableCompanyLength) + ' L' + (company.Xpos + store.mapData.selectedMapData.viewSettings.availableCompanyLength) + ',' + company.Ypos" stroke="black" :stroke-width="store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth" />
				</g>

				<!-- PRODUCTION MARKERS -->
				<g v-for="(company, idx) in store.activeCompanies" :key="idx">
					<g v-if="rf.LAND_COMPANIES.includes(company.type)">
						<g v-for="(terrArr, idx2) in company.territories" :key="idx2">
							<!-- WITH PLAYER COLOUR BORDER -->

							<rect :transform="`rotate(${company.newExpansionsThisTurn.includes(terrArr[0]) ? 45 : 0} ${map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[0]} ${map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[1]})`" :style="{ 'stroke-width': `${store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth}` }" :x="map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[0] - store.mapData.selectedMapData.viewSettings.resRefSize / 2" :y="map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2" :width="store.mapData.selectedMapData.viewSettings.resRefSize + 'px'" :height="store.mapData.selectedMapData.viewSettings.resRefSize + 'px'" :fill="`url(#${company.goodsGfx})`" :stroke="personal.getCorrectedColourHex(store.players[company.ownerIndex].colour)" />

							<!-- NO BORDER -->
							<!--
						<rect :style="{ 'stroke-width': `${store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth / 2}` }" :x="map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[0] - store.mapData.selectedMapData.viewSettings.resRefSize / 2" :y="map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2" :width="store.mapData.selectedMapData.viewSettings.resRefSize + 'px'" :height="store.mapData.selectedMapData.viewSettings.resRefSize + 'px'" :fill="`url(#${company.goodsGfx})`" stroke="black" />
					-->
							<!-- UNDERLINE player colour -->
							<!--
						<rect :style="{ 'stroke-width': `${store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth}` }" :x="map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[0] - store.mapData.selectedMapData.viewSettings.resRefSize / 2" :y="map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[1] + store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth / 2" :width="store.mapData.selectedMapData.viewSettings.resRefSize + 'px'" :height="store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth + 'px'" :stroke="personal.getCorrectedColourHex(store.players[company.ownerIndex].colour)" />
					-->
							<!-- UNDERLINE FILL player colour -->
							<!--
						<rect :style="{ 'stroke-width': `${store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth/4 }` }" :x="map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[0] - store.mapData.selectedMapData.viewSettings.resRefSize / 2" :y="map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[1] + store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth/4" :width="store.mapData.selectedMapData.viewSettings.resRefSize + 'px'" :height="(store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth*2) + 'px'" stroke="white" :fill="personal.getCorrectedColourHex(store.players[company.ownerIndex].colour)" />
					-->
							<!-- Used Prod Marker -->
							<g v-if="terrArr[1]">
								<path :transform="`rotate(${company.newExpansionsThisTurn.includes(terrArr[0]) ? '45' : '0'} ${map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[0]} ${map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[1]})`" :d="'M' + (map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[0] - store.mapData.selectedMapData.viewSettings.resRefSize / 2) + ',' + (map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2) + ' L' + (map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[0] + store.mapData.selectedMapData.viewSettings.resRefSize / 2) + ',' + (map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[1] + store.mapData.selectedMapData.viewSettings.resRefSize / 2)" :stroke="company.newExpansionsThisTurn.includes(terrArr[0]) ? 'blue' : 'black'" :stroke-width="store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth" />
								<path :transform="`rotate(${company.newExpansionsThisTurn.includes(terrArr[0]) ? '45' : '0'} ${map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[0]} ${map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[1]})`" :d="'M' + (map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[0] - store.mapData.selectedMapData.viewSettings.resRefSize / 2) + ',' + (map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[1] + store.mapData.selectedMapData.viewSettings.resRefSize / 2) + ' L' + (map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[0] + store.mapData.selectedMapData.viewSettings.resRefSize / 2) + ',' + (map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2)" :stroke="company.newExpansionsThisTurn.includes(terrArr[0]) ? 'blue' : 'black'" :stroke-width="store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth" />
							</g>

							<!-- Highlight Outline -->
							<rect
								class="prodMarkerHighlightRect"
								:x="map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[0] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 - store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth"
								:y="map.getTerritoryDataFromTerritoryID(terrArr[0]).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 - store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth"
								:width="store.mapData.selectedMapData.viewSettings.resRefSize + store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth * 2 + 'px'"
								:height="store.mapData.selectedMapData.viewSettings.resRefSize + store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth * 2 + 'px'"
								:class="[{ selectableProdMarker: store.context.prodMarkerTerritoriesToHighlight.includes(terrArr[0]) }, { prodMarkerInJourney: typeof store.context.currentGoodJourney[0] === 'object' && store.context.currentGoodJourney[1] === terrArr[0] }, { prodMarkerInMerger: prodMarkerInMerger(terrArr) }, { prodMarkerInSameCompany: store.historyHelpers.prodMarkersInSameCompany.includes(terrArr[0]) }]"
								:style="{
									'stroke-width': getProdMarkerHighlightStrokeWidth(terrArr),
								}"
								@click="clickedProdMarker(company, terrArr[0])"
								@mouseover="mouseOverProdMarker($event, 2, [company])"
								@mouseleave="mouseOutProdMarker" />
						</g>
					</g>
				</g>

				<!-- SHIP MARKERS - IMAGE ONLY WITH HIGHLIGHTS -->
				<g v-for="(entry, idx) in computedShipMarkerDisplayData" :key="idx">
					<image :xlink:href="view.getImage(entry[2])" :x="getShipMarkerFilterURL(entry, true) === true ? entry[0] - store.mapData.selectedMapData.shipShadowOffsetHighlight : entry[0] - store.mapData.selectedMapData.shipShadowOffset" :y="getShipMarkerFilterURL(entry, true) === true ? entry[1] - store.mapData.selectedMapData.shipShadowOffsetHighlight : entry[1] - store.mapData.selectedMapData.shipShadowOffset" :width="store.mapData.selectedMapData.shipMarkerWidth" :height="store.mapData.selectedMapData.shipMarkerWidth" :filter="getShipMarkerFilterURL(entry, false)" />
					<image :xlink:href="view.getImage(entry[2])" :x="getShipMarkerFilterURL(entry, true) === true ? entry[0] + store.mapData.selectedMapData.shipShadowOffsetHighlight : entry[0] + store.mapData.selectedMapData.shipShadowOffset" :y="getShipMarkerFilterURL(entry, true) === true ? entry[1] + store.mapData.selectedMapData.shipShadowOffsetHighlight : entry[1] + store.mapData.selectedMapData.shipShadowOffset" :width="store.mapData.selectedMapData.shipMarkerWidth" :height="store.mapData.selectedMapData.shipMarkerWidth" :filter="getShipMarkerFilterURL(entry, false)" />
					<image :xlink:href="view.getImage(entry[2])" :x="getShipMarkerFilterURL(entry, true) === true ? entry[0] - store.mapData.selectedMapData.shipShadowOffsetHighlight : entry[0] - store.mapData.selectedMapData.shipShadowOffset" :y="getShipMarkerFilterURL(entry, true) === true ? entry[1] + store.mapData.selectedMapData.shipShadowOffsetHighlight : entry[1] + store.mapData.selectedMapData.shipShadowOffset" :width="store.mapData.selectedMapData.shipMarkerWidth" :height="store.mapData.selectedMapData.shipMarkerWidth" :filter="getShipMarkerFilterURL(entry, false)" />
					<image :xlink:href="view.getImage(entry[2])" :x="getShipMarkerFilterURL(entry, true) === true ? entry[0] + store.mapData.selectedMapData.shipShadowOffsetHighlight : entry[0] + store.mapData.selectedMapData.shipShadowOffset" :y="getShipMarkerFilterURL(entry, true) === true ? entry[1] - store.mapData.selectedMapData.shipShadowOffsetHighlight : entry[1] - store.mapData.selectedMapData.shipShadowOffset" :width="store.mapData.selectedMapData.shipMarkerWidth" :height="store.mapData.selectedMapData.shipMarkerWidth" :filter="getShipMarkerFilterURL(entry, false)" />

					<!--ALSO HANDLES POPUP -->
					<image @mouseover="setShipMarkerFilterGreen($event, entry, true)" @mouseleave="setShipMarkerFilterGreen(null, entry, false)" :xlink:href="view.getImage(entry[2])" :x="entry[0]" :y="entry[1]" :width="store.mapData.selectedMapData.shipMarkerWidth" :height="store.mapData.selectedMapData.shipMarkerWidth" @click="clickedShipMarker(entry[3], entry[4])" :filter="view.getShipMarkerMainFilterURLfromPlayerIndex(entry[6])" />
					<!-- TEXT OPERATION HULL CAPACTIY -->
					<!--
					<text
						v-if="shouldShowHullCapacity()"
						:x="entry[0]"
						:y="entry[1] + store.mapData.selectedMapData.shipMarkerWidth / 1.5"
						class="shipMultipleText unclickable"
						:style="{
							'font-size': `${store.mapData.selectedMapData.shipMarkerFontSizePX}px !important`,
							'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}`,
						}">
						{{ view.getRemainingHullText(entry[3], entry[4], entry[5]) }}
					</text>
				-->
					<!-- BLOCK OPERATION HULL CAPACITY -->
					<g v-if="store.gameflow.phase === rf.PHASE_OPERATIONS">
						<g v-for="index in entry[7][1]" :key="index">
							<!-- Start on x, go halfway into marker-->
							<rect class="hullCaoacityRect" :x="entry[0] + getShipCapacitySqX(index, entry[7][0], entry[7][1])" :y="entry[1] + store.mapData.selectedMapData.shipMarkerWidth - store.mapData.selectedMapData.shipCapacitySqW / 2" :width="store.mapData.selectedMapData.shipCapacitySqW" :height="store.mapData.selectedMapData.shipCapacitySqW" :stroke="entry[7][0] === entry[7][1] ? 'red' : 'black'" :fill="getShipCapacitySqFillColour(index, entry[7][0])" :stroke-width="store.mapData.selectedMapData.strokeWidthBase05" />
						</g>
					</g>

					<!-- HISTORY HIGHLIGHT -->
					<g v-if="store.historyHelpers.histShipMarkersToHighlight.some((subArray) => subArray[0] === entry[3] && subArray[1] === entry[4])">
						<image class="historyHighlightShipMarker" :xlink:href="view.getImage(entry[2])" :x="entry[0]" :y="entry[1]" :width="store.mapData.selectedMapData.shipMarkerWidth" :height="store.mapData.selectedMapData.shipMarkerWidth" filter="url(#f_col_blue" />
					</g>
				</g>
			</g>
			<!--End showFutureBoardState=0-->
			<g v-if="store.topMenuViews.showFutureBoardState === 1">
				<!-- ALL FUTURE AVAILABLE COMPANIES-->
				<g v-for="(company, idx) in computedAvailableCompaniesDisplayDataFUTURE" :key="idx">
					<rect
						class="availableCompanyRect"
						:style="{
							'stroke-width': `${store.mapData.selectedMapData.availableCompanyOutlineStroke * 2}`,
							stroke: company.strokeColour,
						}"
						@mouseover="showPopupFunc($event, 0, [company.id])"
						@mouseleave="hidePopupFunc"
						:x="company.Xpos"
						:y="company.Ypos"
						:width="store.mapData.selectedMapData.viewSettings.availableCompanyLength + 'px'"
						:height="store.mapData.selectedMapData.viewSettings.availableCompanyLength + 'px'"
						:fill="`url(#${company.gfx})`" />
					<text
						v-if="company.type === rf.COMPANY_SHIPPING"
						:x="company.Xpos + store.mapData.selectedMapData.viewSettings.availableCompanyLength / 20"
						:y="company.Ypos + store.mapData.selectedMapData.viewSettings.availableCompanyLength / 1.5"
						class="availableShipCompanyText unclickable"
						:style="{
							'font-size': `${store.mapData.selectedMapData.viewSettings.availableCompanyLength / 3}px !important`,
							'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}`,
						}">
						{{ company.capacity[0] }}/{{ company.capacity[1] }}/{{ company.capacity[2] }}
					</text>
					<path v-if="company.markedForRemoval" :d="'M' + company.Xpos + ',' + company.Ypos + ' L' + (company.Xpos + store.mapData.selectedMapData.viewSettings.availableCompanyLength) + ',' + (company.Ypos + store.mapData.selectedMapData.viewSettings.availableCompanyLength)" stroke="black" :stroke-width="store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth" />
					<path v-if="company.markedForRemoval" :d="'M' + company.Xpos + ',' + (company.Ypos + store.mapData.selectedMapData.viewSettings.availableCompanyLength) + ' L' + (company.Xpos + store.mapData.selectedMapData.viewSettings.availableCompanyLength) + ',' + company.Ypos" stroke="black" :stroke-width="store.mapData.selectedMapData.prodMarkerHighlightStrokeWidth" />
				</g>
			</g>

			<!-- RnD Texts -->
			<g v-if="store.gameflow.phase === rf.PHASE_R_AND_D && personal.canPlay()">
				<g v-for="(row, rowIdx) in [0, 1, 2, 3, 4]" :key="rowIdx">
					<text
						:x="store.mapData.selectedMapData.RNDdata.topCorner[0] + store.mapData.selectedMapData.RNDhelpText[0]"
						:y="store.mapData.selectedMapData.RNDdata.topCorner[1] + store.mapData.selectedMapData.RNDhelpText[1] + rowIdx * store.mapData.selectedMapData.RNDdata.yShift"
						class="rndText"
						:style="{
							'font-size': `${store.mapData.selectedMapData.RNDhelpText[2]}px !important`,
							'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}`,
						}">
						<tspan v-if="rowIdx === 0">Bid Multiplier</tspan>
						<tspan v-else-if="rowIdx === 1">Slots</tspan>
						<tspan v-else-if="rowIdx === 2">Mergers</tspan>
						<tspan v-else-if="rowIdx === 3">Expansions</tspan>
						<tspan v-else-if="rowIdx === 4">Hull Capacity</tspan>
					</text>
				</g>
			</g>
			<!-- RnD MARKERS -->
			<g v-for="marker in computedRNDdisplayData" :key="marker.id">
				<ellipse
					class="rndEllipse sliding-marker"
					:cx="marker.x"
					:cy="marker.y"
					:rx="marker.r"
					:ry="marker.r"
					:fill="marker.color"
					:class="[{ selectableRNDmarker: canSelectRNDmarker(marker.playerIdx, marker.trackIdx, marker.rndValue, true) }]"
					:style="{
						'stroke-width': canSelectRNDmarker(marker.playerIdx, marker.trackIdx, marker.rndValue, true) ? `${store.mapData.selectedMapData.strokeWidthOutlineRnD}px` : `${store.mapData.selectedMapData.strokeWidthBase05}px`,
					}"
					@click="clickedRNDentry(marker.playerIdx, marker.trackIdx, marker.rndValue, true)" />
			</g>

			<!-- RND Highlights -->
			<g v-for="rIdx in 7" :key="'h-row-' + rIdx">
				<g v-for="cIdx in 5" :key="'h-col-' + cIdx">
					<g v-if="rIdx - 1 !== 4">
						<rect v-if="canSelectRNDmarker(isCurrentPlayerAt(rIdx - 1, cIdx - 1) ? controller.currentPlayerIndex() : null, rIdx - 1, cIdx - 1, false)" class="selectableRNDrect" :x="store.mapData.selectedMapData.RNDdata.topCorner[0] + store.mapData.selectedMapData.RNDdata.xShift * (cIdx - 1)" :y="store.mapData.selectedMapData.RNDdata.topCorner[1] + store.mapData.selectedMapData.RNDdata.yShift * (rIdx - 1)" :width="store.mapData.selectedMapData.RNDdata.boxWidth" :height="store.mapData.selectedMapData.RNDdata.boxHeight" @click="clickedRNDentry(controller.currentPlayerIndex(), rIdx - 1, cIdx - 1, false)" :style="{ 'stroke-width': `${store.mapData.selectedMapData.strokeWidthOutlineRnD}px` }" />
					</g>
				</g>
			</g>

			<!--HISTORY HIGHLIGHTS -->
			<g v-for="(terrID, idx) in store.historyHelpers.histTerritoriesToHighlight" :key="idx">
				<path class="historyHighlightPath fillYellow" :d="map.getPathDfromterrID(terrID)" />
			</g>
			<g v-for="(terrID, idx) in store.historyHelpers.histTerritoriesToHighlightBlue" :key="idx">
				<path class="historyHighlightPath fillBlue" :d="map.getPathDfromterrID(terrID)" />
			</g>
			<g v-for="(terrID, idx) in store.historyHelpers.histTerritoriesToHighlightRed" :key="idx">
				<path class="historyHighlightPath fillRed" :d="map.getPathDfromterrID(terrID)" />
			</g>

			<!--<g v-for="(row, rowIdx) in store.displayData.RNDdisplay" :key="rowIdx">
				<g v-for="(col, colIdx) in row" :key="colIdx">
					<g v-for="(entry, idx) in col" :key="idx">-->
			<!-- [ xPos, yPos, radius, playerIndex] -->
			<!-- [playerIdx, rowIdx, colIdx]-->
			<!--<g v-if="store.historyHelpers.histRNDmarkersToHighlight.some((subArray) => /*subArray[0] === entry[3] &&*/ subArray[1] === rowIdx && subArray[2] - 1 === colIdx)">
							<ellipse class="historyHighlightRNDmarker" :cx="entry[0]" :cy="entry[1]" :rx="entry[2]" :ry="entry[2]" />
						</g>
					</g>
				</g>
			</g>-->
			<g v-for="rIdx in 7" :key="'hist-row-' + rIdx">
				<g v-for="cIdx in 5" :key="'hist-col-' + cIdx">
					<!-- 
            We check if any entry in the history highlights array matches 
            this specific row and column.
        -->
					<rect v-if="store.historyHelpers.histRNDmarkersToHighlight.some((subArray) => subArray[1] === rIdx - 1 && subArray[2] - 1 === cIdx - 1)" class="historyHighlightRNDrect" :x="store.mapData.selectedMapData.RNDdata.topCorner[0] + store.mapData.selectedMapData.RNDdata.xShift * (cIdx - 1)" :y="store.mapData.selectedMapData.RNDdata.topCorner[1] + store.mapData.selectedMapData.RNDdata.yShift * (rIdx - 1)" :width="store.mapData.selectedMapData.RNDdata.boxWidth" :height="store.mapData.selectedMapData.RNDdata.boxHeight" />
				</g>
			</g>

			<!-- SHOW SHIPPING PATH -->
			<g v-for="(entry, index) in store.context.showShippingArray" :key="index">
				<!-- PROD MARKER -->
				<g v-if="entry[0] === 0">
					<rect :x="map.getTerritoryDataFromTerritoryID(entry[1]).resCenter[0] - store.mapData.selectedMapData.viewSettings.resRefSize / 2" :y="map.getTerritoryDataFromTerritoryID(entry[1]).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2" :width="store.mapData.selectedMapData.viewSettings.resRefSize" :height="store.mapData.selectedMapData.viewSettings.resRefSize" fill="none">
						<animate attributeName="fill" values="rgba(255, 255, 0, 0); rgba(255, 255, 0, 1); rgba(255, 255, 0, 0); rgba(255, 255, 0, 0)" :keyTimes="'0;' + (0.15 * 10) / store.context.showShippingArray.length + '; ' + (0.3 * 10) / store.context.showShippingArray.length + '; 1'" :dur="store.context.showShippingArray.length * 0.6 + 's'" repeatCount="indefinite" :begin="index * 0.6 + 's'" />
					</rect>
				</g>
				<!-- SHIP MARKERS -->
				<g v-if="entry[0] === 1">
					<rect :x="computedShipMarkerDisplayData.find((shipMarker) => shipMarker[3] === entry[1][0] && shipMarker[4] === entry[1][1])[0]" :y="computedShipMarkerDisplayData.find((shipMarker) => shipMarker[3] === entry[1][0] && shipMarker[4] === entry[1][1])[1]" :width="store.mapData.selectedMapData.shipMarkerWidth" :height="store.mapData.selectedMapData.shipMarkerWidth" fill="none">
						<animate attributeName="fill" values="rgba(255, 255, 0, 0); rgba(255, 255, 0, 1); rgba(255, 255, 0, 0); rgba(255, 255, 0, 0)" :keyTimes="'0;' + (0.15 * 10) / store.context.showShippingArray.length + '; ' + (0.3 * 10) / store.context.showShippingArray.length + '; 1'" :dur="store.context.showShippingArray.length * 0.6 + 's'" repeatCount="indefinite" :begin="index * 0.6 + 's'" />
					</rect>
				</g>
				<!-- CITIES -->
				<g v-if="entry[0] === 2">
					<ellipse class="cityEllipse" :cx="map.getTerritoryDataFromTerritoryID(entry[1]).resCenter[0]" :cy="map.getTerritoryDataFromTerritoryID(entry[1]).resCenter[1]" :rx="store.mapData.selectedMapData.cityRadius" :ry="store.mapData.selectedMapData.cityRadius" fill="none">
						<animate attributeName="fill" values="rgba(255, 255, 0, 0); rgba(255, 255, 0, 1); rgba(255, 255, 0, 0); rgba(255, 255, 0, 0)" :keyTimes="'0;' + (0.15 * 10) / store.context.showShippingArray.length + '; ' + (0.3 * 10) / store.context.showShippingArray.length + '; 1'" :dur="store.context.showShippingArray.length * 0.6 + 's'" repeatCount="indefinite" :begin="index * 0.6 + 's'" />
					</ellipse>
				</g>
			</g>

			<!-- DEBUG ONLY-->
			<!--
			<ellipse :cx="cxPos" :cy="cyPos" :rx="circleRadius" :ry="circleRadius" fill="white" stroke="black" stroke-width="1" @mousedown="DEBUGstartDragShape('circle', index)" />

			<g v-for="(rect, index) in rects" :key="index">
				<rect :x="rect.x" :y="rect.y" :width="index >= 5 ? compWidth : shipWidth" :height="index >= 5 ? compWidth : shipWidth" :fill="`url(#${rect.fill})`" stroke="black" stroke-width="2" @mousedown="DEBUGstartDragShape('rect', index)" />
				<text
					:x="rect.x"
					:y="rect.y + shipWidth / 1.3"
					class="shipMultipleText unclickable"
					:style="{
						'font-size': `${shipTextPX}px !important`,
						'stroke-width': `0.5`,
						fill: 'yellow',
					}">
					{{ index }}/3
				</text>
			</g>
		-->
			<!-- END DEBUG ONLY -->
		</svg>
		<button class="actionsLineButton" @click="store.topMenuViews.showTerrOutline = !store.topMenuViews.showTerrOutline">
			<span v-if="store.topMenuViews.showTerrOutline">Hide Territory Outline</span>
			<span v-else>Show Territory Outline</span>
		</button>
		<button v-if="personal.pov >= 0 && store.gameflow.phase !== rf.PHASE_GAME_OVER" class="actionsLineButton" @click="localToggleFutureBoardState">
			<span v-if="store.topMenuViews.showFutureBoardState === 0">Show All Available Companies and My Era Card Provinces</span>
			<span v-else>Show Game</span>
		</button>
	</div>
	<!-- AG MAP-->
	<!-- AG MAP-->
	<!-- AG MAP-->
	<div
		v-else-if="store.mapData.selectedMap === rf.MAP_RANDOM_TASK"
		id="originalMapDiv"
		ref="originalMapDivRef"
		:style="{
			width: String(getMapWidth()) + 'px',
		}">
		<Transition name="fade">
			<MapPopup v-if="popupSetter.showPopup" @mouseover="hideErrorPopup" :mapPopupProp="popupSetter.popupData" />
		</Transition>
		<svg :viewBox="store.mapData.selectedMapData.viewbox" id="mapSVG" @mousemove="DEBUGmoveElement" @mouseup="DEBUGstopDrag" ref="DEBUGmapSVG222">
			<image :width="store.mapData.selectedMapData.backgroundDim[0]" :height="store.mapData.selectedMapData.backgroundDim[1]" preserveAspectRatio="none" :xlink:href="view.getImage('current_map_background')" style="display: inline" />

			<!-- ABSOLUTE BOTTOM LAYER - BLACK TERR OUTLINE OPTION -->
			<g v-if="store.topMenuViews.showTerrOutline">
				<g
					v-for="(dataEntry, idx) in store.mapData.selectedMapData.terrPaths"
					:key="idx"
					:style="{
						'stroke-width': `${store.mapData.selectedMapData.strokeWidthShowTerrOutlineBlack}px`,
					}">
					<path class="territoryOutlineBlack" :d="dataEntry.pathD" />
				</g>
			</g>

			<!-- CITIES -->
			<g v-for="(city, idx) in store.cities" :key="idx">
				<ellipse
					class="cityEllipse"
					:cx="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0]"
					:cy="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1]"
					:rx="store.mapData.selectedMapData.cityRadius"
					:ry="store.mapData.selectedMapData.cityRadius"
					:fill="'url(#city_' + String(city.size) + ')'"
					:class="[{ selectableCity: store.context.citiesToHighlight.includes(city.territory) }, { redCity: store.context.citiesToHighlightRed.includes(city.territory) }]"
					:style="{
						'stroke-width': getCityStrokeWidth(city),
					}"
					@click="clickedCity(city)"
					@mouseover="showPopupFunc($event, 1, [city])"
					@mouseleave="hidePopupFunc" />
				<g v-for="(amount, good) in getGoodsArrayForCity(city)" :key="good">
					<g v-if="amount === 1">
						<rect class="deliveredGoodRect" :style="{ 'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}` }" :x="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0] - store.mapData.selectedMapData.receivedGoodMarkerSize / 2" :y="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * good" :width="store.mapData.selectedMapData.receivedGoodMarkerSize" :height="store.mapData.selectedMapData.receivedGoodMarkerSize" :fill="view.getGoodColour(good)" />
					</g>
					<g v-else-if="amount === 2">
						<rect class="deliveredGoodRect" :style="{ 'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}` }" :x="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0] - store.mapData.selectedMapData.receivedGoodMarkerSize / 2 - store.mapData.selectedMapData.receivedGoodMarkerSize * 0.75" :y="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * good" :width="store.mapData.selectedMapData.receivedGoodMarkerSize" :height="store.mapData.selectedMapData.receivedGoodMarkerSize" :fill="view.getGoodColour(good)" />
						<rect class="deliveredGoodRect" :style="{ 'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}` }" :x="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0] - store.mapData.selectedMapData.receivedGoodMarkerSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * 0.75" :y="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * good" :width="store.mapData.selectedMapData.receivedGoodMarkerSize" :height="store.mapData.selectedMapData.receivedGoodMarkerSize" :fill="view.getGoodColour(good)" />
					</g>
					<g v-else-if="amount === 3">
						<rect class="deliveredGoodRect" :style="{ 'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}` }" :x="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0] - store.mapData.selectedMapData.receivedGoodMarkerSize / 2 - store.mapData.selectedMapData.receivedGoodMarkerSize * 1.5" :y="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * good" :width="store.mapData.selectedMapData.receivedGoodMarkerSize" :height="store.mapData.selectedMapData.receivedGoodMarkerSize" :fill="view.getGoodColour(good)" />
						<rect class="deliveredGoodRect" :style="{ 'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}` }" :x="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0] - store.mapData.selectedMapData.receivedGoodMarkerSize / 2" :y="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * good" :width="store.mapData.selectedMapData.receivedGoodMarkerSize" :height="store.mapData.selectedMapData.receivedGoodMarkerSize" :fill="view.getGoodColour(good)" />
						<rect class="deliveredGoodRect" :style="{ 'stroke-width': `${store.mapData.selectedMapData.strokeWidthBase05}` }" :x="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0] - store.mapData.selectedMapData.receivedGoodMarkerSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * 1.5" :y="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1] - store.mapData.selectedMapData.viewSettings.resRefSize / 2 + store.mapData.selectedMapData.receivedGoodMarkerSize * good" :width="store.mapData.selectedMapData.receivedGoodMarkerSize" :height="store.mapData.selectedMapData.receivedGoodMarkerSize" :fill="view.getGoodColour(good)" />
					</g>
				</g>
				<!-- HIST HIGHLIGHTS -->
				<g v-if="store.historyHelpers.histCitiesToHighlight.includes(city.territory)">
					<ellipse class="historyHighlightPath fillYellow" :cx="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0]" :cy="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1]" :rx="store.mapData.selectedMapData.cityRadius" :ry="store.mapData.selectedMapData.cityRadius" />
				</g>
				<g v-if="store.historyHelpers.histCitiesToHighlightBlue.includes(city.territory)">
					<ellipse class="historyHighlightPath fillBlue" :cx="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[0]" :cy="map.getTerritoryDataFromTerritoryID(city.territory).resCenter[1]" :rx="store.mapData.selectedMapData.cityRadius" :ry="store.mapData.selectedMapData.cityRadius" />
				</g>
			</g>

			<!-- BOTTOM LAYER - RED -->
			<g
				v-for="(terrID, idx) in store.context.territoriesToHighlightRed"
				:key="idx"
				:style="{
					'stroke-width': `${store.mapData.selectedMapData.strokeWidthOutlineTerr}px`,
				}">
				<path class="territoryToHighlightRed" :d="map.getPathDfromterrID(terrID)" />
			</g>

			<!-- Base Highlight layer -- YELLOW + SELECTABLE -->
			<g
				v-for="(terrID, idx) in store.context.territoriesToHighlight"
				:key="idx"
				:style="{
					'stroke-width': `${store.mapData.selectedMapData.strokeWidthOutlineTerr}px`,
				}">
				<path class="selectableSVGarea territoryToHighlight" :d="map.getPathDfromterrID(terrID)" @click="clickedTerritory(terrID)" :id="rf.AG_TERR_ID_TO_PATH_ID[terrID]" @mouseenter="store.context.territoriesToHighlightGreen.push(terrID)" @mouseleave="store.context.territoriesToHighlightGreen.splice(0)" />
			</g>

			<!-- Middle layer for the Blue -->
			<g
				v-for="(terrID, idx) in store.context.territoriesToHighlightBlue"
				:key="idx"
				:style="{
					'stroke-width': `${store.mapData.selectedMapData.strokeWidthOutlineTerr}px`,
				}">
				<path class="hollowSVGarea territoryToHighlightBlue" :d="map.getPathDfromterrID(terrID)" />
			</g>

			<!-- Top layer for the highlight green -->
			<g
				v-for="(terrID, idx) in store.context.territoriesToHighlightGreen"
				:key="idx"
				:style="{
					'stroke-width': `${store.mapData.selectedMapData.strokeWidthOutlineTerr}px`,
				}">
				<path class="hollowSVGarea territoryToHighlightGreen" :d="map.getPathDfromterrID(terrID)" :id="rf.OM_TERR_ID_TO_PATH_ID[terrID]" @click="clickedTerritory(terrID)" @mouseleave="store.context.territoriesToHighlightGreen.splice(0)" />
			</g>
		</svg>
		<button class="actionsLineButton" @click="store.topMenuViews.showTerrOutline = !store.topMenuViews.showTerrOutline">
			THIS SHOULD NEVER BE USED?
			<span v-if="store.topMenuViews.showTerrOutline">Hide Territory Outline</span>
			<span v-else>Show Territory Outline</span>
		</button>
		<button v-if="personal.pov >= 0" class="actionsLineButton" @click="localToggleFutureBoardState">
			<span v-if="store.topMenuViews.showFutureBoardState === 0">Show All Available Companies and My Era Card Provinces</span>
			<span v-else>Show Game</span>
		</button>
	</div>
</template>

<style scoped>
#originalMapDiv {
	position: relative;
	background-color: aliceblue;
	margin: auto;
}

#originalMapSVG {
	width: 100%;
	height: 100%;
}

.selectableSVGarea {
	fill: 000;
	fill-opacity: 0;
	opacity: 1;
	stroke-opacity: 0;
	stroke: yellow;
}

.hollowSVGarea {
	fill: none;
	fill-opacity: 0;
	opacity: 1;
	stroke-opacity: 0;
	stroke: yellow;
}

.territoryToHighlight {
	stroke-opacity: 1;
}

.territoryToHighlightBlue {
	stroke-opacity: 1;
	stroke: blue !important;
	pointer-events: none;
	/*border: 20px solid red !important;*/
	/*outline: 2px solid white !important;*/
	/*filter: 
    drop-shadow(-2px -2px 0px #fff) 
    drop-shadow(2px -2px 0px #fff) 
    drop-shadow(2px 2px 0px #fff)
    drop-shadow(-2px 2px 0px #fff)*/
}

.territoryOutlineBlack {
	stroke-opacity: 1;
	stroke: black;
	pointer-events: none;
	fill: none;
}

.territoryToHighlightRed {
	stroke-opacity: 1;
	stroke: red !important;
	pointer-events: none;
	fill: none;
}

.territoryToHighlightGreen {
	stroke-opacity: 1;
	stroke: lightgreen !important;
}

.outlineTest {
	outline: 2px solid white !important;
	stroke-opacity: 1;
}

/*.prodMarkerRect {
	stroke-width: 2;
}*/

.prodMarkerHighlightRect {
	fill: black;
	fill-opacity: 0;
	stroke-width: 0;
	stroke: yellow;
}

.selectableProdMarker {
	stroke: yellow;
}

.prodMarkerInSameCompany {
	stroke: lightgreen;
}

.selectableProdMarker:hover {
	stroke: lightgreen;
}

.prodMarkerInJourney {
	stroke: lightgreen;
}

.prodMarkerInMerger {
	filter: url(#f_green_pulse);
}

.deliveredGoodRect {
	stroke: white;
	pointer-events: none;
}

.availableCompanyRect {
	stroke: white;
}

.availableCompanyRectPHP {
	stroke: black;
}

.selectableCompanyRect {
	stroke: yellow;
}

.selectedCompanyRect {
	stroke: lightgreen !important;
}

.selectableCompanyRect:hover {
	stroke: lightgreen;
}

.redShipMarker {
	stroke: red;
	stroke-width: 3;
}

.cityEllipse {
	stroke: black;
}

.selectableCity {
	stroke: yellow;
}

.redCity {
	stroke: red;
}

.selectableCity:hover {
	stroke: lightgreen;
}

.rndText {
	font-weight: 1000;
	font-family: Arial, Helvetica, sans-serif;
	/*
	fill: black;
	stroke: white;
	*/
	fill: white;
	stroke: black;
}

.rndEllipse {
	stroke: black;
}

.selectableRNDmarker {
	stroke: yellow;
}

.selectableRNDmarker:hover {
	stroke: lightgreen;
}

.selectableRNDrect {
	stroke: yellow;
	fill: white;
	fill-opacity: 0;
}

.selectableRNDrect:hover {
	stroke: lightgreen;
}

#mapSVG {
	width: 100%;
}

.availableShipCompanyText {
	fill: white;
	font-weight: 900;
	stroke: black;
}

.shipMultipleText {
	fill: white;
	/*font-size: 13px;*/
	/*font-size: 45px;*/
	font-weight: bolder;
	stroke: black;
	/*stroke-width: 0.5;*/
	/*stroke-width: 1.5;*/
}

.unclickable {
	pointer-events: none;
}

.historyHighlightPath {
	stroke: black;
	stroke-width: 0px;
	fill-opacity: 1;
	pointer-events: none;
	animation: glow 0.6s infinite alternate;
}

.historyHighlightShipMarker {
	pointer-events: none;
	animation: glow 0.6s infinite alternate;
}

.historyHighlightRNDmarker {
	stroke: black;
	fill: white;
	stroke-width: 0px;
	fill-opacity: 1;
	pointer-events: none;
	animation: glow 0.6s infinite alternate;
}

.historyHighlightRNDrect {
	stroke: black;
	fill: white;
	stroke-width: 0px;
	fill-opacity: 1;
	pointer-events: none;
	animation: glow 0.6s infinite alternate;
}

.fillYellow {
	fill: yellow;
}

.fillBlue {
	fill: blue;
}

.fillRed {
	fill: red;
}

@keyframes glow {
	to {
		opacity: 0.3;
	}
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.city-plop {
	animation: plop 0.4s ease-out;
	/* Ensures the scaling happens from the center of the ellipse */
	transform-origin: center;
	transform-box: fill-box;
}

@keyframes plop {
	0% {
		transform: scale(0.5);
		opacity: 0;
	}
	50% {
		transform: scale(1.4);
	}
	100% {
		transform: scale(1);
		opacity: 1;
	}
}

.city-ripple {
	fill: none;
	stroke: rgba(255, 255, 255, 0.8);
	stroke-width: 10px;
	transform-origin: center;
	transform-box: fill-box;
	animation: ripple-out 0.6s ease-out forwards;
}

@keyframes ripple-out {
	0% {
		transform: scale(1);
		opacity: 1;
	}
	100% {
		transform: scale(2.5);
		opacity: 0;
	}
}

.sliding-marker {
	/* Transitions the coordinate attributes over 0.6 seconds */
	transition:
		cx 0.6s ease-in-out,
		cy 0.6s ease-in-out;
}
</style>
