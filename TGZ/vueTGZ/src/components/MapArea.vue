<script setup>
import * as map from "../js/TGZmap"
import * as view from "../js/TGZview"
import * as rf from "../js/TGZreference"
import * as model from "../js/TGZmodel"
import * as controller from "../js/TGZcontroller"

import MapHighlight from "./MapHighlight.vue"
import MapHistory from "./MapHistory.vue"

import { useModelStore } from "../stores/TGZstore.js"
import { usePersonalStore } from "../stores/TGZpersonal.js"

const store = useModelStore()
const personal = usePersonalStore()

import { ref, reactive } from "vue"

const showWATERTOLLpopup = ref(0)
const EKWENSUdata = reactive({
	showEKWENSUpopup: 0,
	EKWENSUcowsAvailable: 0,
	EKWENSUcowsSelected: 0,
	hubsUsed: 0,
	craftsmanCost: 0,
	craftsmanData: [], // For clickedCman function
	playerIndex: -1, // For clickedCman function
	popupPosition: { x: 0, y: 0 },
})
const popupPosition = ref({ x: 0, y: 0 })

let popupInterval

function hideErrorPopup() {
	return
	/*let popup = document.getElementsByClassName("WATERTOLLpopup")[0]
	popup.style.display = "none"
	clearTimeout(popupInterval)
	showWATERTOLLpopup.value = 0*/
}

function getTilePos(index) {
	if (store.mapTiles.length === 8) {
		if (index === 0) return [0, 0]
		if (index === 1) return [0, store.refSize]
		if (index === 2) return [store.refSize, 0]
		if (index === 3) return [store.refSize, store.refSize]
	}
	if (store.mapTiles.length === 12) {
		if (index === 0) return [0, 0]
		if (index === 1) return [0, store.refSize]
		if (index === 2) return [0, store.refSize * 2]
		if (index === 3) return [store.refSize, 0]
		if (index === 4) return [store.refSize, store.refSize]
		if (index === 5) return [store.refSize * 2, 0]
	}
	if (store.mapTiles.length === 14) {
		if (index === 0) return [0, 0]
		if (index === 1) return [0, store.refSize]
		if (index === 2) return [store.refSize, 0]
		if (index === 3) return [store.refSize, store.refSize]
		if (index === 4) return [store.refSize, store.refSize * 2]
		if (index === 5) return [store.refSize * 2, store.refSize]
		if (index === 6) return [store.refSize * 2, store.refSize * 2]
	}
	if (store.mapTiles.length === 18) {
		if (index === 0) return [0, 0]
		if (index === 1) return [0, store.refSize]
		if (index === 2) return [0, store.refSize * 2]
		if (index === 3) return [store.refSize, 0]
		if (index === 4) return [store.refSize, store.refSize]
		if (index === 5) return [store.refSize, store.refSize * 2]
		if (index === 6) return [store.refSize * 2, 0]
		if (index === 7) return [store.refSize * 2, store.refSize]
		if (index === 8) return [store.refSize * 2, store.refSize * 2]
	}

	return [500, 500]
}
const itemCounter = (array, item) => {
	return array.filter((currentItem) => currentItem == item).length
}
function getDepletedResourceTimes(index) {
	if (itemCounter(store.depletedResources, index) === 1) return 1
	return 2
}

function shouldCraftsmanShowDepleted(craftsmanData) {
	let availableResources = map.getAllUndepletedResourceSquaresToHighlight(craftsmanData, store.context.range, [])
	if (craftsmanData[1] !== rf.BLACKSMITH_TILE && availableResources.length > 0) return false
	else if (craftsmanData[1] === rf.BLACKSMITH_TILE) {
		if (availableResources.length <= 1) return true
		else if (availableResources.length > 0) {
			let firstResType = store.coords[availableResources[0]]
			let diffResFound = false
			for (let j = 1; j < availableResources.length; j++) {
				if (store.coords[availableResources[j]] !== firstResType) {
					diffResFound = true
					break
				}
			}
			if (!diffResFound) return true
		}
		return false
	}
	return true
}

function clickedMonument(monument) {
	if (store.topMenuViews.mapInspectorMode) {
		store.context.indexesToPipGreen.splice(0)
		store.context.indexesToPipRed.splice(0)
		store.topMenuViews.hubRangesToHighlight = map.getAllOrAnySquaresWithinRangeOfZoneUsingHubs([monument[0]], store.topMenuViews.mapInspectorEshu ? 6 : 3, 0)
		return
	}
	if (store.context.action === rf.ACT_CHOOSE_ANYANWU_MON) {
		monument[1] = 3
		model.addHistory(rf.HIST_CHOOSE_ANYANWU_MON, controller.currentPlayerIndex(), 0, [monument[0]])
		store.clearVars(true)
		return
	}
	if (store.context.action !== rf.ACT_RAISE_MON) return
	if (store.context.upgradingMonumentProcess.length !== 0) return

	// If you are clicking someone else's monument, then return
	let currentMonnument = false
	for (let i = 0; i < controller.currentPlayerObj().monuments.length; i++) {
		if (controller.currentPlayerObj().monuments[i][0] === monument[0]) {
			currentMonnument = true
			break
		}
	}
	if (!currentMonnument && !model.hasGod(controller.currentPlayerObj(), rf.YEMOJA)) return

	if (!model.canSelectRaiseMonument(monument)) return

	store.context.canSelectRaiseMonument.splice(0)
	store.context.upgradingMonumentProcess = [monument] // THIS IS A POINTER
	model.getValidCraftsmenToRaiseMonument([monument[0]], false)
	store.topMenuViews.hubRangesToHighlight = map.getAllOrAnySquaresWithinRangeOfZoneUsingHubs([monument[0]], model.hasGod(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3, 0)
	store.context.itemsInMonumentUpgrade.push(monument[0])
}

function clickedCraftsman(event, craftsmanData, playerIndex) {
	// MAP INSPECTOR
	if (store.topMenuViews.mapInspectorMode) {
		// Add pips to resources
		let resource_sq_arr = rf.getPrimaryResourceSqs(craftsmanData[1])

		let inRange = []
		let outOfRange = []
		for (let i = 0; i < resource_sq_arr.length; i++) {
			let [inRange_i, outOfRange_i] = map.getResourceRangeStatusForPlacingCraftsman(craftsmanData[0], store.topMenuViews.mapInspectorEshu ? 6 : 3, resource_sq_arr[i], craftsmanData[1], craftsmanData[2])
			inRange = inRange.concat(inRange_i)
			outOfRange = outOfRange.concat(outOfRange_i)
		}
		store.context.indexesToPipGreen = inRange
		store.context.indexesToPipRed = outOfRange

		let craftsmanZone = map.getCraftsmanZoneFromData(craftsmanData)
		store.topMenuViews.hubRangesToHighlight = map.getAllOrAnySquaresWithinRangeOfZoneUsingHubs(craftsmanZone, store.topMenuViews.mapInspectorEshu ? 6 : 3, 0)
		return
	}
	// If you're not meant to click them, AND you're not processing EKWENSU decision, return
	if (store.context.craftsmenIndexesToHighlight.length === 0 && store.context.EKWENSUdecision === -1) return
	if (!store.context.craftsmenIndexesToHighlight.includes(craftsmanData[0]) && store.context.EKWENSUdecision === -1) return

	// Remove craftsman selection
	store.context.craftsmenIndexesToHighlight.splice(0)

	// If OYA, then no hubs, no ranage data, as you start from a CMAN (get monument)
	if (store.context.action === rf.ACT_OYA_RUITUALGOOD) {
		// Pay the CM price
		let craftsmanCost = model.getPriceForCraftsman(model.getPlayerForCraftsmanPriIndex(craftsmanData[0]), craftsmanData[1], true)
		let totalCost = craftsmanCost
		// FIX WITH COWS TO ovia AND COWS FROM god card
		controller.currentPlayerObj().cows -= totalCost

		// Add cows to Cman
		for (let i = 0; i < store.players[playerIndex].techs.length; i++) {
			if (craftsmanData[1] === rf.BLACKSMITH_TILE) {
				if (store.players[playerIndex].techs[i][0] === rf.BLACKSMITH_TECH) {
					store.players[playerIndex].techs[i][1] += craftsmanCost
					break
				}
			} else if (store.players[playerIndex].techs[i][0] === craftsmanData[1] * 2 || store.players[playerIndex].techs[i][0] === craftsmanData[1] * 2 + 1) {
				store.players[playerIndex].techs[i][1] += craftsmanCost
				break
			}
		}
		store.context.currentRitualGood.push([craftsmanData[0], 0, craftsmanCost])

		// Selected a craftsman, so now highlight a resource
		store.context.resourceIndexesToHighlight = map.getAllUndepletedResourceSquaresToHighlight(craftsmanData, store.context.range, [])
		store.topMenuViews.hubRangesToHighlight.splice(0)
		// Highlight range 3 from craftsman
		store.topMenuViews.hubRangesToHighlight.push(map.getAllSquaresWithinRangeOfZone(map.getCraftsmanZoneFromData(craftsmanData), model.hasGod(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3, false))

		store.context.itemsInMonumentUpgrade.push(craftsmanData[0])
		return
	}
	// Store the craftsman AND HOW MANY HUBS USED
	// Reform the data
	let rangeData = []
	// If no currentritualgood data, MUST be coming from the hub
	if (store.context.currentRitualGood.length === 0) rangeData = map.getPossibleCraftsmenWithRangeToRaiseMonument([store.context.upgradingMonumentProcess[0][0]], store.context.range)
	// Otherwise, need to take it from the SEC craftsman
	else if (store.context.currentRitualGood.length === 2) {
		let craftsmanZone = map.getCraftsmanZoneFromData(map.getCraftsmanDataFromAnySq(store.context.currentRitualGood[0][0], true))
		rangeData = map.getPossibleCraftsmenWithRangeToRaiseMonument(craftsmanZone, store.context.range)
	}

	let arrIndex = rangeData[0].indexOf(craftsmanData[0])
	let hubsUsed = rangeData[1][arrIndex]

	/** OLOK */
	if (model.needToPayWATERTOLL(true, [hubsUsed, craftsmanData])) {
		store.context.WATERTOLLpaymentStatus = 1
	}

	/** END OLOK */

	// Pay the CM price in the following code
	let craftsmanPlayer = model.getPlayerForCraftsmanPriIndex(craftsmanData[0])
	let craftsmanCost = model.getPriceForCraftsman(craftsmanPlayer, craftsmanData[1], true)

	// AS pays 0 for pri when using their sec
	if (model.hasGod(controller.currentPlayerObj(), rf.AJE_SHALUGA) && store.context.currentRitualGood.length > 0) {
		let secCmanData = map.getCraftsmanDataFromAnySq(store.context.currentRitualGood[0][0], true)
		// If you have the cman index, then you pay 0
		if (controller.currentPlayerObj().craftsmen.some((cman) => cman[0] === secCmanData[0] && cman[1] === secCmanData[1] && cman[2] === secCmanData[2])) {
			craftsmanCost = 0
		}
	}

	// Get Cman payment
	let addWATERTOLLHist = false
	// CHECK WHETHER EKWENSU IS POSSIBLE - you can't EKWENSU yourself
	if (craftsmanCost > 0 && controller.currentPlayerIndex() !== model.getPlayerIndexForCraftsmanPriIndex(craftsmanData[0]) && (/*(model.hasGod(controller.currentPlayerObj(), rf.EKWENSU) && model.getGodData(controller.currentPlayerObj(), rf.EKWENSU)[1] > 0) ||*/ (model.hasGod(craftsmanPlayer, rf.EKWENSU) && model.getGodData(craftsmanPlayer, rf.EKWENSU)[1] > 0))) {
		// Now we know EKWENSU is available. If the decision has already been made, then process it.
		// But first show the popup if no decision has been made
		if (store.context.EKWENSUdecision === -1) {
			// Calculate the position based on the mouse/touch event
			EKWENSUdata.popupPosition = { x: event.clientX - 120, y: event.clientY - 150 }
			EKWENSUdata.craftsmanData = JSON.parse(JSON.stringify(craftsmanData))
			EKWENSUdata.playerIndex = playerIndex
			EKWENSUdata.showEKWENSUpopup = 1
			EKWENSUdata.craftsmanCost = craftsmanCost
			EKWENSUdata.EKWENSUcowsAvailable = model.getGodData(store.players.find((player) => model.hasGod(player, rf.EKWENSU)), rf.EKWENSU)[1]
			EKWENSUdata.EKWENSUcowsSelected = Math.min(EKWENSUdata.EKWENSUcowsAvailable, craftsmanCost)
			EKWENSUdata.hubsUsed = hubsUsed
			return
		} else {
			let totalCraftsmanCost = craftsmanCost
			let EKWENSUcows = 0
			let desiredEKWENSUcows = Math.min(store.context.EKWENSUdecision, totalCraftsmanCost)
			if (model.hasGod(controller.currentPlayerObj(), rf.EKWENSU)) EKWENSUcows = Math.min(model.getGodData(controller.currentPlayerObj(), rf.EKWENSU)[1], desiredEKWENSUcows)
			else if (model.hasGod(craftsmanPlayer, rf.EKWENSU)) EKWENSUcows = Math.min(model.getGodData(craftsmanPlayer, rf.EKWENSU)[1], desiredEKWENSUcows)

			let netCraftsmanCost = totalCraftsmanCost - EKWENSUcows

			// OLOK CHECK - NOT ENOUGH COWS FOR TOLL
			if (store.WATERTOLLpaymentStatus === 1 && netCraftsmanCost + hubsUsed + rf.WATERTOLLCowToll > controller.currentPlayerObj().cows) {
				// Calculate the position based on the mouse/touch event
				popupPosition.value = { x: event.clientX, y: event.clientY - 80 }
				clearTimeout(popupInterval)
				// Hide the error popup after 2 seconds
				popupInterval = setTimeout(() => {
					showWATERTOLLpopup.value = 0
				}, 3000)
				store.context.WATERTOLLpaymentStatus = 0
				showWATERTOLLpopup.value = 1
				return
			}

			if (model.hasGod(controller.currentPlayerObj(), rf.EKWENSU)) model.updateGodData(controller.currentPlayerObj(), rf.EKWENSU, model.getGodData(controller.currentPlayerObj(), rf.EKWENSU)[1] - EKWENSUcows)
			else if (model.hasGod(craftsmanPlayer, rf.EKWENSU)) model.updateGodData(craftsmanPlayer, rf.EKWENSU, model.getGodData(craftsmanPlayer, rf.EKWENSU)[1] - EKWENSUcows)
			// Pay the costs and hub costs
			controller.currentPlayerObj().cows -= netCraftsmanCost
			controller.currentPlayerObj().cows -= hubsUsed
			store.context.EKWENSUcowsUsed += EKWENSUcows

			if (store.context.WATERTOLLpaymentStatus === 1) {
				// Calculate the position based on the mouse/touch event
				popupPosition.value = { x: event.clientX, y: event.clientY - 80 }
				clearTimeout(popupInterval)
				// Hide the error popup after 2 seconds
				popupInterval = setTimeout(() => {
					showWATERTOLLpopup.value = 0
				}, 3000)
				// PAY OLOK HERE - During EKWENSU
				store.context.WATERTOLLpaymentStatus = 2
				controller.currentPlayerObj().cows -= rf.WATERTOLLCowToll
				addWATERTOLLHist = true
				let WATERTOLLplayerIndex = model.anyoneHasWATERTOLL(true)
				model.updateGodData(store.players[WATERTOLLplayerIndex], rf.WATERTOLL, model.getGodData(store.players[WATERTOLLplayerIndex], rf.WATERTOLL)[1] + rf.WATERTOLLCowToll)
				showWATERTOLLpopup.value = 2
			}
		} // END processing EKWENSU cows
	}
	// else NOT using Ekwensu
	else {
		let totalCost = craftsmanCost + hubsUsed
		// OLOK CHECK - NOT ENOUGH COWS FOR TOLL
		if (store.context.WATERTOLLpaymentStatus === 1 && totalCost + rf.WATERTOLLCowToll > controller.currentPlayerObj().cows) {
			// Calculate the position based on the mouse/touch event
			popupPosition.value = { x: event.clientX, y: event.clientY - 80 }
			clearTimeout(popupInterval)
			// Hide the error popup after 2 seconds
			popupInterval = setTimeout(() => {
				showWATERTOLLpopup.value = 0
			}, 3000)
			store.context.WATERTOLLpaymentStatus = 0
			showWATERTOLLpopup.value = 1
			return
		}
		controller.currentPlayerObj().cows -= totalCost

		if (store.context.WATERTOLLpaymentStatus === 1) {
			// Calculate the position based on the mouse/touch event
			popupPosition.value = { x: event.clientX, y: event.clientY - 80 }
			clearTimeout(popupInterval)
			// Hide the error popup after 2 seconds
			popupInterval = setTimeout(() => {
				showWATERTOLLpopup.value = 0
			}, 3000)
			// PAY OLOK HERE - NOT using Ekwen
			controller.currentPlayerObj().cows -= rf.WATERTOLLCowToll
			addWATERTOLLHist = true
			let WATERTOLLplayerIndex = model.anyoneHasWATERTOLL(true)
			model.updateGodData(store.players[WATERTOLLplayerIndex], rf.WATERTOLL, model.getGodData(store.players[WATERTOLLplayerIndex], rf.WATERTOLL)[1] + rf.WATERTOLLCowToll)
			store.context.WATERTOLLpaymentStatus = 2
			showWATERTOLLpopup.value = 2
		}
	}

	// Finally -
	// Add cows to Cman
	for (let i = 0; i < store.players[playerIndex].techs.length; i++) {
		if (craftsmanData[1] === rf.BLACKSMITH_TILE) {
			if (store.players[playerIndex].techs[i][0] === rf.BLACKSMITH_TECH) {
				if (model.hasGod(controller.currentPlayerObj(), rf.OVIA)) {
					model.updateGodData(controller.currentPlayerObj(), rf.OVIA, model.getGodData(controller.currentPlayerObj(), rf.OVIA)[1] + 1)
					store.players[playerIndex].techs[i][1] += craftsmanCost - 1
				} else store.players[playerIndex].techs[i][1] += craftsmanCost
				break
			}
		} else if (store.players[playerIndex].techs[i][0] === craftsmanData[1] * 2 || store.players[playerIndex].techs[i][0] === craftsmanData[1] * 2 + 1) {
			if (model.hasGod(controller.currentPlayerObj(), rf.OVIA)) {
				model.updateGodData(controller.currentPlayerObj(), rf.OVIA, model.getGodData(controller.currentPlayerObj(), rf.OVIA)[1] + 1)
				store.players[playerIndex].techs[i][1] += craftsmanCost - 1
			} else store.players[playerIndex].techs[i][1] += craftsmanCost
			break
		}
	}
	// Add cows to QAMATA
	for (let i = 0; i < store.players.length; i++) {
		if (model.hasGod(store.players[i], rf.QAMATA)) {
			model.updateGodData(store.players[i], rf.QAMATA, model.getGodData(store.players[i], rf.QAMATA)[1] + hubsUsed)
			break
		}
	}

	if (addWATERTOLLHist) store.context.currentRitualGood.push([craftsmanData[0], hubsUsed, craftsmanCost, -3])
	else store.context.currentRitualGood.push([craftsmanData[0], hubsUsed, craftsmanCost])

	// Selected a craftsman, so now highlight a resource
	store.context.resourceIndexesToHighlight = map.getAllUndepletedResourceSquaresToHighlight(craftsmanData, store.context.range, [])
	store.topMenuViews.hubRangesToHighlight.splice(0)
	// Highlight range 3 from craftsman
	store.topMenuViews.hubRangesToHighlight.push(map.getAllSquaresWithinRangeOfZone(map.getCraftsmanZoneFromData(craftsmanData), model.hasGod(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3, false))

	store.context.itemsInMonumentUpgrade.push(craftsmanData[0])

	// Reset EKWENSU
	store.context.EKWENSUdecision = -1
	EKWENSUdata.showEKWENSUpopup = 0
	EKWENSUdata.craftsmanData.splice(0)
	EKWENSUdata.playerIndex = -1
}

function isRitualGoodComplete(craftsmanSq) {
	if (rf.PRI_CRAFFTSMAN_SQS.includes(craftsmanSq) && craftsmanSq !== rf.BLACKSMITH_SQ) return true
	if (craftsmanSq === rf.BLACKSMITH_SQ && store.context.selectedResourcesForCraftsmen.length === 2) return true
	if (store.context.currentRitualGood.length === 3) return true
	if (!store.context.ignoreAjeShaluga && model.hasGod(controller.currentPlayerObj(), rf.AJE_SHALUGA_OLD) && model.getPlayerIndexForCraftsmanPriIndex(store.context.currentRitualGood[0][0]) === controller.currentPlayerIndex()) {
		return true
	}
	return false
}

function clickedResource(index) {
	store.context.resourceIndexesToHighlight.splice(0)

	// WATERTOLL check
	if (model.needToPayWATERTOLL(false, [index]) && rf.WATERTOLLCowToll > controller.currentPlayerObj().cows) {
		// Calculate the position based on the mouse/touch event
		popupPosition.value = { x: event.clientX, y: event.clientY - 80 }
		clearTimeout(popupInterval)
		// Hide the error popup after 2 seconds
		popupPosition.value = { x: event.clientX, y: event.clientY - 80 }
		popupInterval = setTimeout(() => {
			showWATERTOLLpopup.value = 0
		}, 3000)
		store.context.WATERTOLLpaymentStatus = 0
		showWATERTOLLpopup.value = 1
		return
	}

	let addWATERTOLLHistAfterIndex = false
	if (model.needToPayWATERTOLL(false, [index])) {
		// PAY OLOK HERE - During resource usage
		controller.currentPlayerObj().cows -= rf.WATERTOLLCowToll
		// Add WATERTOLL history
		addWATERTOLLHistAfterIndex = true
		let WATERTOLLplayerIndex = model.anyoneHasWATERTOLL(true)
		model.updateGodData(store.players[WATERTOLLplayerIndex], rf.WATERTOLL, model.getGodData(store.players[WATERTOLLplayerIndex], rf.WATERTOLL)[1] + rf.WATERTOLLCowToll)
		store.context.WATERTOLLpaymentStatus = 2
		popupPosition.value = { x: event.clientX, y: event.clientY - 80 }
		clearTimeout(popupInterval)
		showWATERTOLLpopup.value = 2
		popupInterval = setTimeout(() => {
			showWATERTOLLpopup.value = 0
		}, 3000)
	}

	// Deplete resource and add to current ritual good
	store.depletedResources.push(index)
	store.context.itemsInMonumentUpgrade.push(index)

	store.context.selectedResourcesForCraftsmen.push(index)
	if (addWATERTOLLHistAfterIndex) {
		store.context.selectedResourcesForCraftsmen.push(-3)
		addWATERTOLLHistAfterIndex = false
	}
	let craftsmanSq = store.coords[store.context.currentRitualGood[0][0]]

	// Check if the ritual good is complete
	if (isRitualGoodComplete(craftsmanSq)) {
		// Ritual good is complete. So check for completion, or reset for new selection
		store.context.currentRitualGood.push([...store.context.selectedResourcesForCraftsmen])

		store.context.upgradingMonumentProcess.push([...store.context.currentRitualGood])
		store.context.currentRitualGood.splice(0)
		store.context.selectedResourcesForCraftsmen.splice(0)

		// Check if Raise complete
		if (store.context.action === rf.ACT_OYA_RUITUALGOOD || store.context.upgradingMonumentProcess.length === store.context.upgradingMonumentProcess[0][1] + 1 || (model.hasGod(controller.currentPlayerObj(), rf.TIURAKH) && store.context.upgradingMonumentProcess.length === model.getGodData(controller.currentPlayerObj(), rf.TIURAKH)[1])) {
			// Raise complete!

			// Clear vars and end Raise
			store.context.actionsTaken.push(rf.ACT_RAISE_MON)

			if (store.context.action === rf.ACT_OYA_RUITUALGOOD) {
				store.context.OYAused = true
				//model.setupPlaceMonument()
				store.context.action = rf.ACT_BUILD_MON
				store.context.monumentsToPlace = 1
				store.context.indexesToHighlightClick.splice(0)
				store.context.indexesToHighlightClick = map.getSpacesForMonument(model.hasNomads(controller.currentPlayerObj()), false)
				if (store.context.indexesToHighlightClick.length === 0) store.context.actionError = "No Space Left for Any Monuments"
			} else {
				// +1 to monument level
				store.context.upgradingMonumentProcess[0][1]++ // ONLY WORKS BECAUSE IT IS A POINTER
				/**ADD HISTORY */
				// Check if Ekwensu was used
				if (store.context.EKWENSUcowsUsed > 0) store.context.upgradingMonumentProcess = store.context.upgradingMonumentProcess.concat([[-1, store.context.EKWENSUcowsUsed]])
				// Check if Oya was used
				if (model.hasGod(controller.currentPlayerObj(), rf.OVIA)) {
					store.context.upgradingMonumentProcess = store.context.upgradingMonumentProcess.concat([[-2]])
				}
				model.addHistory(rf.HIST_RAISE_MON, controller.currentPlayerIndex(), 0, [...store.context.upgradingMonumentProcess])
				store.clearVars(true)
				model.setupRaiseMonument(true)
			}
		} // END complete Raise
		// Otherwise set up for next ritual good
		else {
			//store.context.craftsmenIndexesToHighlight = map.getPossibleCraftsmenWithRangeToRaiseMonument([store.context.upgradingMonumentProcess[0][0]], store.context.range)[0]
			model.getValidCraftsmenToRaiseMonument([store.context.upgradingMonumentProcess[0][0]], false)
			// Set up hub highlight from monument
			store.topMenuViews.hubRangesToHighlight.splice(0)
			store.topMenuViews.hubRangesToHighlight = map.getAllOrAnySquaresWithinRangeOfZoneUsingHubs([store.context.upgradingMonumentProcess[0][0]], model.hasGod(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3, 0)
		} // END set up for next good
	} // END complete ritual good
	// Check if blacksmith and need 2nd res
	else if (craftsmanSq === rf.BLACKSMITH_SQ) {
		let craftsmanData = map.getCraftsmanDataFromAnySq(store.context.currentRitualGood[0][0], true)
		// highlight resources again
		store.context.resourceIndexesToHighlight = map.getAllUndepletedResourceSquaresToHighlight(craftsmanData, store.context.range, [store.coords[index]])
		store.topMenuViews.hubRangesToHighlight.splice(0)
		// Highlight range 3 from craftsman
		store.topMenuViews.hubRangesToHighlight.push(map.getAllSquaresWithinRangeOfZone(map.getCraftsmanZoneFromData(craftsmanData), model.hasGod(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3, false))
	} else {
		// Otherwise, need to select the related PRIMARY craftsman and resource
		store.context.currentRitualGood.push([...store.context.selectedResourcesForCraftsmen])
		store.context.selectedResourcesForCraftsmen.splice(0)

		// THIS NEEDS TO START FROM THE RELATED CRAFTSMAN AREA
		let craftsmanZone = map.getCraftsmanZoneFromData(map.getCraftsmanDataFromAnySq(store.context.currentRitualGood[0][0], true))
		//store.context.craftsmenIndexesToHighlight = map.getPossibleCraftsmenWithRangeToRaiseMonument(craftsmanZone, store.context.range)[0]
		model.getValidCraftsmenToRaiseMonument(craftsmanZone)
		store.topMenuViews.hubRangesToHighlight = map.getAllOrAnySquaresWithinRangeOfZoneUsingHubs(craftsmanZone, model.hasGod(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3, 0)
	}
}

function shouldCmanShowInMonProcessBorder(craftsmanData) {
	if (model.hasGod(controller.currentPlayerObj(), rf.TSUI_GOAB)) {
		if (store.context.itemsInMonumentUpgrade.length % 2 === 0 && store.context.itemsInMonumentUpgrade.includes(craftsmanData[0])) return true
		return false
	}
	if (store.context.itemsInMonumentUpgrade.includes(craftsmanData[0])) return true
}

function clickedEWKWENSUpopup(event, val) {
	if (controller.currentPlayerObj().cows + val < EKWENSUdata.hubsUsed + EKWENSUdata.craftsmanCost) return
	EKWENSUdata.showEKWENSUpopup = 0
	store.context.EKWENSUdecision = val
	clickedCraftsman(event, EKWENSUdata.craftsmanData, EKWENSUdata.playerIndex)
}

function localSelectEWKWENSUcows(val) {
	if (controller.currentPlayerObj().cows + val < EKWENSUdata.hubsUsed + EKWENSUdata.craftsmanCost) return
	EKWENSUdata.EKWENSUcowsSelected = val
}
</script>

<template>
	<!-- WATERTOLL POPUP-->
	<transition name="fadeOut">
		<div
			class="WATERTOLLpopup"
			v-if="showWATERTOLLpopup > 0"
			:style="{
				top: popupPosition.y + 'px',
				left: popupPosition.x + 'px',
				backgroundColor: showWATERTOLLpopup === 1 ? 'red' : 'green',
			}"
			@mouseover="hideErrorPopup">
			<span v-if="showWATERTOLLpopup === 1">
				Unable to Afford
				<br />
				WATERTOLL Water Toll
			</span>
			<span v-if="showWATERTOLLpopup === 2">
				WATERTOLL Water
				<br />
				Toll Paid
			</span>
		</div>
	</transition>

	<!-- EKWENSU DECISION POPUP -->
	<div
		class="EKWENSUpopup"
		v-if="EKWENSUdata.showEKWENSUpopup > 0"
		:style="{
			top: EKWENSUdata.popupPosition.y + 'px',
			left: EKWENSUdata.popupPosition.x + 'px',
		}">
		<div class="EKWENSUpopupTextDiv">
			You may use Ekwensu cows
			<br />
			Ekwensu has {{ EKWENSUdata.EKWENSUcowsAvailable }} cows. You need to pay {{ EKWENSUdata.craftsmanCost }} total
			<br />
			<img :src="view.getImage('cows1')" :class="[{ selectedEKWENSUcowImg: EKWENSUdata.EKWENSUcowsSelected === 1 }, { EKWENSUcowImgSelectable: controller.currentPlayerObj().cows + 1 >= EKWENSUdata.hubsUsed + EKWENSUdata.craftsmanCost }, { EKWENSUcowImgNOTselectable: controller.currentPlayerObj().cows + 1 < EKWENSUdata.hubsUsed + EKWENSUdata.craftsmanCost }]" class="EKWENSUcowImg" alt="1 cow" @click="localSelectEWKWENSUcows(1)" />
			<img v-if="EKWENSUdata.EKWENSUcowsAvailable >= 2 && EKWENSUdata.craftsmanCost >= 2" :src="view.getImage('cows2')" :class="[{ selectedEKWENSUcowImg: EKWENSUdata.EKWENSUcowsSelected === 2 }, { EKWENSUcowImgSelectable: controller.currentPlayerObj().cows + 2 >= EKWENSUdata.hubsUsed + EKWENSUdata.craftsmanCost }, { EKWENSUcowImgNOTselectable: controller.currentPlayerObj().cows + 2 < EKWENSUdata.hubsUsed + EKWENSUdata.craftsmanCost }]" class="EKWENSUcowImg" alt="2 cows" @click="localSelectEWKWENSUcows(2)" />
			<img v-if="EKWENSUdata.EKWENSUcowsAvailable >= 3 && EKWENSUdata.craftsmanCost >= 3" :src="view.getImage('cows3')" :class="[{ selectedEKWENSUcowImg: EKWENSUdata.EKWENSUcowsSelected === 3 }, { EKWENSUcowImgSelectable: controller.currentPlayerObj().cows + 3 >= EKWENSUdata.hubsUsed + EKWENSUdata.craftsmanCost }, { EKWENSUcowImgNOTselectable: controller.currentPlayerObj().cows + 3 < EKWENSUdata.hubsUsed + EKWENSUdata.craftsmanCost }]" class="EKWENSUcowImg" alt="2 cows" @click="localSelectEWKWENSUcows(3)" />

			<div @click="clickedEWKWENSUpopup($event, EKWENSUdata.EKWENSUcowsSelected)" class="tickButtonDiv">✓</div>
			<div @click="clickedEWKWENSUpopup($event, 0)" :class="{ disabledEKWENSUcross: controller.currentPlayerObj().cows < EKWENSUdata.hubsUsed + EKWENSUdata.craftsmanCost }" class="crossButtonDiv">X</div>
		</div>
	</div>

	<!-- DISPLAY MAP TILES -->
	<div
		id="mapTilesDiv"
		:style="{
			width: store.mapTiles.length === 8 ? (store.refSize * 480) / 240 + 'px' : (store.refSize * 720) / 240 + 'px',
			height: store.mapTiles.length === 8 ? (store.refSize * 480) / 240 + 'px' : (store.refSize * 720) / 240 + 'px',
		}">
		<template v-for="(tileData, index) in map.getMapDisplayArray()" :key="index">
			<div
				class="mapTile"
				:class="'r' + String(tileData[1])"
				:style="{
					width: store.refSize + 'px',
					height: store.refSize + 'px',
					top: getTilePos(index)[0] + 'px',
					left: getTilePos(index)[1] + 'px',
					//'border': 1 + store.refSize * 0 / 400 + 'px solid black'
				}">
				<img class="mapTileImg" :src="view.getImage('map' + String(tileData[0]))" alt="Map Tile" />
			</div>
		</template>

		<!-- DISPLAY MONUMENTS -->
		<template v-for="(player, index1) in store.players" :key="index1">
			<template v-for="(monument, index2) in player.monuments" :key="index2">
				<div
					class="monumentDiv"
					:style="{
						width: store.refSize / 6 + 'px',
						height: store.refSize / 6 + 'px',
						top: view.getIndexPos(monument[0])[0] + 'px',
						left: view.getIndexPos(monument[0])[1] + 'px',
						'border-width': (store.refSize * 2) / 240 + 'px',
						'background-color': personal.getCorrectedColourHex(player.colour),
						'font-size': (store.refSize * 33) / 240 + 'px',
						//'line-height': store.refSize / 6 + 'px'
					}"
					:class="[{ canRaiseMonument: store.context.canSelectRaiseMonument.includes(monument[0]) }, { inMonRaiseProcess: store.context.itemsInMonumentUpgrade.includes(monument[0]) }, { mapInspectorMode: store.topMenuViews.mapInspectorMode }]"
					@click="clickedMonument(monument)">
					<span class="nonSelectableSpan">{{ monument[1] }}</span>
					<div
						class="notEnoguhCraftsmenForMon"
						v-if="store.context.monumentsToShowNotEnoughCraftsmen.includes(monument[0])"
						:style="{
							top: ((store.refSize / 6) * 2) / 3 + 'px',
							left: (store.refSize / 240) * -3 + 'px',
							width: String(store.refSize / 6) + 'px',
							height: String(((store.refSize / 6) * 1) / 3) + 'px',
						}">
						<img class="noCmen" :src="view.getImage('noCmen')" alt="NC" />
					</div>
				</div>
			</template>
		</template>

		<!-- ADD PLAYER ADDED RESOURCES !! NB !! DOES NOT INCLUDE NATURAL -->
		<template v-for="(resourceObj, index) in store.addedResources" :key="index">
			<div
				class="resourceDiv"
				:style="{
					width: store.refSize / 6 + 'px',
					height: store.refSize / 6 + 'px',
					top: view.getIndexPos(resourceObj[0])[0] + 'px',
					left: view.getIndexPos(resourceObj[0])[1] + 'px',
					'border-width': (store.refSize * 3) / 240 + 'px',
				}"
				:class="{ inMonRaiseProcess: store.context.itemsInMonumentUpgrade.includes(resourceObj[0]) }">
				<img class="resourceImg" :src="view.getImage('res' + String(resourceObj[1]))" alt="RRR" />
				<div v-if="store.depletedResources.includes(resourceObj[0])" class="depletedDiv" :class="getDepletedResourceTimes(resourceObj[0]) === 1 ? 'crossBackground' : 'crossBackground_Atete'"></div>
			</div>
		</template>

		<!-- ADD DEPLETED MARKERS TO NATURAL RESOURCES -->
		<template v-for="(depletedIndex, index) in store.depletedResources" :key="index">
			<div
				v-if="
					!store.addedResources
						.map(function (x) {
							return x[0]
						})
						.includes(depletedIndex)
				"
				:class="[getDepletedResourceTimes(depletedIndex) === 1 ? 'crossBackground' : 'crossBackground_Atete', { inMonRaiseProcess: store.context.itemsInMonumentUpgrade.includes(depletedIndex) }]"
				:style="{
					width: store.refSize / 6 + 'px',
					height: store.refSize / 6 + 'px',
					top: view.getIndexPos(depletedIndex)[0] + 'px',
					left: view.getIndexPos(depletedIndex)[1] + 'px',
					//opacity: getDepletedResourceOpacity(depletedIndex),
				}"></div>
		</template>

		<!-- ADD PLAYER ADDED WATER -->
		<template v-for="(waterObj, index) in store.addedWater" v-bind:key="index">
			<img
				class="waterImg"
				:class="'r' + String(waterObj[1])"
				:src="view.getImage('res' + String(rf.WATER_TILE))"
				:style="{
					width: (store.refSize * 2) / 6 + 'px',
					height: store.refSize / 6 + 'px',
					top: view.getIndexPos(waterObj[0], waterObj[1])[0] + 'px',
					left: view.getIndexPos(waterObj[0], waterObj[1])[1] + 'px',
					'border-width': (store.refSize * 0) / 240 + 'px',
				}"
				alt="RRR" />
		</template>

		<!-- ADD PLAYER CRAFTSMEN -->
		<template v-for="(player, index1) in store.players" v-bind:key="index1">
			<template v-for="(craftsmanData, index2) in player.craftsmen" v-bind:key="index2">
				<div
					:class="['craftsmanDiv', { selectableTile: store.context.craftsmenIndexesToHighlight.includes(craftsmanData[0]) }, 'r' + String(craftsmanData[2]), { inMonRaiseProcess: shouldCmanShowInMonProcessBorder(craftsmanData) }, { mapInspectorMode: store.topMenuViews.mapInspectorMode }]"
					:style="{
						width: (store.refSize * 2) / 6 + 'px',
						height: rf.FOUR_SIZE_TILES.includes(craftsmanData[1]) ? (store.refSize * 2) / 6 + 'px' : store.refSize / 6 + 'px',
						top: view.getIndexPos(craftsmanData[0], craftsmanData[2])[0] + 'px',
						left: view.getIndexPos(craftsmanData[0], craftsmanData[2])[1] + 'px',
						'border-width': (store.refSize * 4) / 240 + 'px',
						'border-color': personal.getCorrectedColourHex(player.colour),
						'font-size': (store.refSize * 2) / 3 / 6 + 'px',
					}"
					@click="clickedCraftsman($event, craftsmanData, index1)">
					<img class="craftsmanImg" :src="view.getImage('craftsman' + String(craftsmanData[1]))" alt="RRR" />
					<!-- Add PRICE-->
					<div
						class="craftsmanPriceDiv"
						:class="[{ r3: craftsmanData[2] === 1 }, { fourSizeCraftsman: rf.FOUR_SIZE_TILES.includes(craftsmanData[1]) }]"
						:style="{
							'font-size': (store.refSize * 1.1 * 2) / 3 / 6 + 'px',
						}">
						<span v-if="store.statsModeData.statsMode">{{ model.getStatForPrCraftsmanSq(craftsmanData[0]) }}</span>
						<span v-else>{{ model.getPriceForCraftsman(player, craftsmanData[1], false) }}</span>
					</div>
					<!-- Add NO RESOURCES -->
					<div
						v-if="shouldCraftsmanShowDepleted(craftsmanData)"
						class="craftsmanNoResourceDiv"
						:style="{
							top: (rf.FOUR_SIZE_TILES.includes(craftsmanData[1]) ? (store.refSize / 240) * -6 + (store.refSize / 240) * 53 : 0) + 'px',
							left: (store.refSize / 240) * -6 + (store.refSize / 240) * 53 + 'px',
							width: String(((store.refSize / 6) * 2) / 3) + 'px',
							height: String(((store.refSize / 6) * 2) / 3) + 'px',
						}">
						<img class="craftsmanNoResourceImg" :src="view.getImage('noResource' + String(rf.getPrimaryResourceSqs(craftsmanData[1])[0]))" alt="NR" />
					</div>
					<!-- Add NOT ENOUGH COWS -->
					<div
						v-if="store.context.craftsmenTooExpensive.includes(craftsmanData[0])"
						class="craftsmanNoResourceDiv"
						:style="{
							top: (rf.FOUR_SIZE_TILES.includes(craftsmanData[1]) ? (store.refSize / 240) * -6 + (store.refSize / 240) * 53 : 0) + 'px',
							left: (store.refSize / 240) * -6 + (store.refSize / 240) * 53 + 'px',
							width: String(((store.refSize / 6) * 2) / 3) + 'px',
							height: String(((store.refSize / 6) * 2) / 3) + 'px',
						}">
						<img class="craftsmanNoResourceImg" :class="{ r3: craftsmanData[2] === 1 }" :src="view.getImage('noCows')" alt="NC" />
					</div>
				</div>

				<!-- WEIRD TILE PLACEMENTS
				<div
					v-if="craftsmanData[1] === rf.BLACKSMITH_TILE"
					:class="['craftsmanDiv', { selectableTileBlacksmith: store.context.craftsmenIndexesToHighlight.includes(craftsmanData[0]) }, { inMonRaiseProcessBlacksmith: shouldCmanShowInMonProcessBorder(craftsmanData) }, { mapInspectorMode: store.topMenuViews.mapInspectorMode }]"
					:style="{
						width: (store.refSize * 3) / 6 + 'px',
						height: (store.refSize * 3) / 6 + 'px',
						top: view.getIndexPos(craftsmanData[0], craftsmanData[2])[0] + 'px',
						left: view.getIndexPos(craftsmanData[0] - 1, craftsmanData[2])[1] + 'px',
						'border-width': '0px',
						'font-size': (store.refSize * 2) / 3 / 6 + 'px',
						filter: `drop-shadow(${((store.refSize / 2) * 6) / 240}px 0 0 ${personal.getCorrectedColourHex(store.players[index1].colour)}) drop-shadow(0 ${((store.refSize / 2) * 6) / 240}px 0 ${personal.getCorrectedColourHex(store.players[index1].colour)}) drop-shadow(-${((store.refSize / 2) * 6) / 240}px 0 0 ${personal.getCorrectedColourHex(store.players[index1].colour)}) drop-shadow(0 -${((store.refSize / 2) * 6) / 240}px 0 ${personal.getCorrectedColourHex(store.players[index1].colour)})`,
					}"
					@click="clickedCraftsman(craftsmanData, index1)">
					<img class="craftsmanImg" :src="view.getImage('craftsman' + String(craftsmanData[1]))" alt="RRR" />
					Add PRICE
					<div
						class="craftsmanPriceDiv fourSizeCraftsman"
						:style="{
							//top: store.refSize * 1 / 6 / 6 + (rf.FOUR_SIZE_TILES.includes(craftsmanData[1]) ? store.refSize / 18 : store.refSize / 240 * -8) + 'px',
							//left: (rf.FOUR_SIZE_TILES.includes(craftsmanData[1]) || craftsmanData[2] === 0 ? store.refSize / 240 * 25 : store.refSize / 240 * 26) + 'px',
							'font-size': (store.refSize * 1.1 * 2) / 3 / 6 + 'px',
							//'color': personal.getCorrectedColourHex(player.colour),
							//'text-shadow': '-1px -1px 5px ' + personal.getCorrectedColourHex(player.colour) + ', 1px -1px 1px ' + personal.getCorrectedColourHex(player.colour) + ', -1px 1px 1px ' + personal.getCorrectedColourHex(player.colour) + ', 1px 1px 1px ' + personal.getCorrectedColourHex(player.colour) + '',
						}">
						{{ model.getPriceForCraftsman(player, craftsmanData[1], false) }}
					</div>
					Add NO RESOURCES 
					<div
						v-if="shouldCraftsmanShowDepleted(craftsmanData)"
						class="craftsmanNoResourceDiv"
						:style="{
							top: (store.refSize / 240) * 40 + (store.refSize / 240) * 40 + 'px',
							left: (store.refSize / 240) * 4 + (store.refSize / 240) * 40 + 'px',
							width: String(((store.refSize / 6) * 2) / 3) + 'px',
							height: String(((store.refSize / 6) * 2) / 3) + 'px',
						}">
						<img class="craftsmanNoResourceImg" :src="view.getImage('noResource' + String(rf.getPrimaryResourceSqSSSSS(craftsmanData[1])))" alt="NR" />
					</div>
					Add NOT ENOUGH COWS 
					<div
						v-if="store.context.craftsmenTooExpensive.includes(craftsmanData[0])"
						class="craftsmanNoResourceDiv"
						:style="{
							top: (rf.FOUR_SIZE_TILES.includes(craftsmanData[1]) ? (store.refSize / 240) * -6 + (store.refSize / 240) * 53 : 0) + 'px',
							left: (store.refSize / 240) * 4 + (store.refSize / 240) * 40 + 'px',
							width: String(((store.refSize / 6) * 2) / 3) + 'px',
							height: String(((store.refSize / 6) * 2) / 3) + 'px',
						}">
						<img class="craftsmanNoResourceImg" :class="{ r3: craftsmanData[2] === 1 }" :src="view.getImage('noCows')" alt="NC" />
					</div>
				</div>-->
			</template>
		</template>

		<!-- RESOURCE INDEXES TO HIGHLIGHT !! INCLUDES NATURAL !! -->
		<template v-for="(index, index1) in store.context.resourceIndexesToHighlight" v-bind:key="index1">
			<div
				class="resourceHighlightDiv selectableTile"
				:style="{
					width: store.refSize / 6 + 'px',
					height: store.refSize / 6 + 'px',
					top: view.getIndexPos(index, 0)[0] + 'px',
					left: view.getIndexPos(index, 0)[1] + 'px',
				}"
				@click="clickedResource(index)"></div>
		</template>

		<MapHighlight />
		<MapHistory />
	</div>
</template>

<style scoped>
#mapTilesDiv {
	position: relative;
	margin-top: 20px;
	margin: auto;
	/*margin-right: auto;
  margin-left:calc((100vw - 500px)/2);*/
	margin-bottom: 20px;
	-webkit-transition: all 0.2s ease-in-out;
	-moz-transition: all 0.2s ease-in-out;
	-ms-transition: all 0.2s ease-in-out;
	-o-transition: all 0.2s ease-in-out;
	transition: all 0.2s ease-in-out;
}

.crossBackground {
	z-index: 20;
	position: absolute;
	top: 0px;
	left: 0px;
	background: linear-gradient(to top left, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 4px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 4px), rgba(0, 0, 0, 0) 100%), linear-gradient(to top right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 4px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 4px), rgba(0, 0, 0, 0) 100%);
}

.crossBackground_Atete {
	z-index: 20;
	position: absolute;
	top: 0px;
	left: 0px;
	background: linear-gradient(to top left, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 4px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 4px), rgba(0, 0, 0, 0) 100%), linear-gradient(to top right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 4px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 4px), rgba(0, 0, 0, 0) 100%), linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 4px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 4px), rgba(0, 0, 0, 0) 100%), linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 4px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 4px), rgba(0, 0, 0, 0) 100%);
}

.noCmen,
.craftsmanNoResourceImg {
	top: 0px;
	left: 0px;
}

.noCmen {
	position: absolute;
}

.noCmen,
.craftsmanNoResourceImg,
.depletedDiv,
.resourceImg,
.craftsmanImg {
	width: 100%;
	height: 100%;
}

.selectableTile:hover {
	outline: 3px solid lightgreen;
}

.notEnoguhCraftsmenForMon,
.craftsmanNoResourceDiv {
	position: absolute;
	background-color: red;
	/*box-sizing: border-box;*/
	border: 2px solid white;
}

.notEnoguhCraftsmenForMon {
	box-sizing: border-box;
}

.inMonRaiseProcess {
	outline: 4px solid lightgreen !important;
}

.mapTile {
	position: absolute;
}

.waterImg {
	position: absolute;
	box-sizing: border-box;
	border-style: solid;
	border-color: black;
}

.resourceDiv {
	z-index: 20;
}

.resourceDiv,
.resourceHighlightDiv,
.craftsmanDiv {
	cursor: default;

	position: absolute;
	box-sizing: border-box;
	border-style: solid;
}

.craftsmanPriceDiv {
	position: absolute;
	top: 0px;
	left: 0px;
	width: 100%;
	text-align: center;
	justify-content: center;
	vertical-align: middle;
	color: white;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
}

.fourSizeCraftsman {
	top: 50%;
	/* Set top to 50% */
	transform: translateY(-50%);
	/* Use transform to vertically center the div */
}

.mapTileImg {
	width: 100%;
	height: 100%;
	border: 1px solid black;
	box-sizing: border-box;
}

.monumentDiv {
	cursor: default;
	position: absolute;
	border-radius: 100%;
	border: solid black;
	box-sizing: border-box;
	justify-content: center;
	text-align: center;
	color: white;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
	/**/
	/*filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.5)); /* Adjust the values as needed */
	/*text-shadow: 0px 0px 3px rgba(0, 0, 0, 1);/**/
	/*text-shadow: -1px -1px 2px #000, 1px -1px 2px #000, -1px 1px 2px #000, 1px 1px 2px #000;/**/
}

.selectableTile {
	outline: 3px solid yellow;
	cursor: pointer;
	z-index: 100;
}

.selectableTileBlacksmith {
	filter: drop-shadow(3px 0 0 yellow) drop-shadow(0 3px 0 yellow) drop-shadow(-3px 0 0 yellow) drop-shadow(0 -3px 0 yellow) !important;
	cursor: pointer;
	z-index: 100;
}

.selectableTileBlacksmith:hover {
	filter: drop-shadow(3px 0 0 lightgreen) drop-shadow(0 3px 0 lightgreen) drop-shadow(-3px 0 0 lightgreen) drop-shadow(0 -3px 0 lightgreen) !important;
}

.inMonRaiseProcessBlacksmith {
	filter: drop-shadow(3px 0 0 lightgreen) drop-shadow(0 3px 0 lightgreen) drop-shadow(-3px 0 0 lightgreen) drop-shadow(0 -3px 0 lightgreen) !important;
}

.canRaiseMonument {
	border: solid yellow;
}

.canRaiseMonument:hover {
	border: solid lightgreen;
	cursor: pointer;
}

.mapInspectorMode {
	outline: 3px solid yellow;
	cursor: pointer;
	z-index: 50;
}

.mapInspectorMode:hover {
	outline: 3px solid lightgreen;
}
.nonSelectableSpan {
	user-select: none;
	pointer-events: none;
}

.WATERTOLLpopup {
	position: fixed;
	color: white;
	padding: 10px;
	border-radius: 5px;
	opacity: 1;
	z-index: 9999;
}

.EKWENSUpopup {
	position: fixed;
	color: black;
	padding: 10px;
	border-radius: 5px;
	opacity: 1;
	z-index: 9999;
	border: 2px solid black;
	background-color: #d4eafd;
	font-weight: bolder;
	height: 130px;
}

.EKWENSUpopupTextDiv {
	position: relative;
	height: 100%;
}

.tickButtonDiv {
	position: absolute;
	bottom: 5px;
	right: 5px;
	z-index: 9999;
	border-radius: 100%;
	background-color: darkgreen;
	width: 50px;
	height: 50px;
	font-size: 50px;
	line-height: 50px;
	color: white;
	border: 3px solid yellow;
	user-select: none;
}

.crossButtonDiv {
	position: absolute;
	bottom: 5px;
	left: 5px;
	z-index: 9999;
	border-radius: 100%;
	background-color: darkred;
	width: 50px;
	height: 50px;
	font-size: 50px;
	line-height: 50px;
	color: white;
	border: 3px solid yellow;
	user-select: none;
}

.disabledEKWENSUcross {
	opacity: 0.5;
	border-color: red !important;
}

.tickButtonDiv:hover,
.crossButtonDiv:hover,
.EKWENSUcowImgSelectable:hover {
	cursor: pointer;
	border-color: lightgreen;
}

.EKWENSUcowImg {
	display: inline-block;
	border: 3px solid black;
	width: 50px;
	height: 50px;
	margin-right: 5px;
	margin-top: 5px;
}

.EKWENSUcowImgSelectable {
	cursor: pointer;
	border: 3px solid yellow;
}

.selectedEKWENSUcowImg {
	border-color: lightgreen !important;
}

.EKWENSUcowImgNOTselectable {
	cursor: default;
	border: 3px solid red !important;
}

.fadeOut-enter-active,
.fadeOut-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fadeOut-enter,
.fadeOut-leave-active {
	opacity: 0;
}
</style>
