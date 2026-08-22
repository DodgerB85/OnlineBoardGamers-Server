<script setup>
/** This is the MAIN action area for the city
 * It should ONLY contain
 * RESET WHOLE TURN
 * END PHASE
 *
 * All the minor actions are done above the first city,
 * or next to the new building area
 *
 * The code to change phases should move to controller.js
 */
import PromiseArea from "./PromiseArea.vue"

import * as view from "../js/AQYview.js"
import * as Bot from "../js/AQYbot.js"
import * as rf from "../js/AQYreference.js"
import * as city from "../js/AQYcity.js"
import * as controller from "../js/AQYcontroller.js"
import * as model from "../js/AQYmodel.js"
import * as country from "../js/AQYcountry.js"
import * as IO from "../backend/AQY_IO"
import * as funcs from "../js/AQYfuncs.js"

import { ref, watch, onUnmounted } from "vue"

import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()

const store = useModelStore()

/** Kickout */
function cancelKickout() {
	personal.kickoutRequired = 0
}

function passKickout() {
	controller.endPlayerTurn()
}

function getFlexiKickoutTImerText() {
	if (personal.flexiSecondsToNextKickout < 0) personal.flexiSecondsToNextKickout = 0
	let hoursToGo = String(Math.floor(personal.flexiSecondsToNextKickout / 60 / 60))
	let minsToGo = String(Math.floor((personal.flexiSecondsToNextKickout % 3600) / 60)).padStart(2, "0")
	let secsToGo = String(Math.floor(personal.flexiSecondsToNextKickout % 60)).padStart(2, "0")

	return hoursToGo + ":" + minsToGo + ":" + secsToGo
}

function currentKickoutTarget() {
	return controller.currentPlayerObj().name
}

// Returns my vote entry [target, time] if I have voted to kick out the current player
function myKickoutVote() {
	if (personal.pov < 0) return null
	const vote = store.kickoutVotesData[personal.name]
	if (!vote || !Array.isArray(vote) || vote[0] !== currentKickoutTarget()) return null
	return vote
}

// 2-player games keep the old direct kickout; otherwise I must have a vote
// for this player that is more than 2 days old before I can kick out alone
function canKickoutNow() {
	if (store.kickoutVoteThreshold <= 1) return true
	const myVote = myKickoutVote()
	if (!myVote) return false
	return Date.now() - myVote[1] >= rf.KICKOUT_SOLO_DELAY_MS
}

function kickoutVoteCount() {
	if (personal.pov < 0) return 0
	const target = currentKickoutTarget()
	let count = 0
	for (const voter in store.kickoutVotesData) {
		const vote = store.kickoutVotesData[voter]
		if (Array.isArray(vote) && vote[0] === target) count++
	}
	return count
}

function kickoutVoters() {
	if (personal.pov < 0) return "None"
	const target = currentKickoutTarget()
	let voters = "None"
	for (const voter in store.kickoutVotesData) {
		const vote = store.kickoutVotesData[voter]
		if (Array.isArray(vote) && vote[0] === target) {
			if (voters === "None") voters = String(voter)
			else voters += ", " + voter
		}
	}
	return voters
}

// My vote would bring the count to the threshold, so the kickout goes ahead
function isLastVoteRequired() {
	return kickoutVoteCount() + 1 >= store.kickoutVoteThreshold
}

const soloKickoutCountdown = ref("")
let soloKickoutCountdownTimer = null

function updateSoloKickoutCountdown() {
	const myVote = myKickoutVote()
	if (!myVote || store.kickoutVoteThreshold <= 1) {
		soloKickoutCountdown.value = ""
		return
	}
	let remainingMs = rf.KICKOUT_SOLO_DELAY_MS - (Date.now() - myVote[1])
	if (remainingMs <= 0) {
		clearInterval(soloKickoutCountdownTimer)
		soloKickoutCountdownTimer = null
		soloKickoutCountdown.value = ""
		return
	}
	let totalSeconds = Math.floor(remainingMs / 1000)
	let hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0")
	let mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0")
	let secs = String(Math.floor(totalSeconds % 60)).padStart(2, "0")
	soloKickoutCountdown.value = hours + ":" + mins + ":" + secs
}

watch(
	() => personal.pov >= 0 ? store.kickoutVotesData[personal.name] : undefined,
	() => {
		if (personal.pov < 0) return
		updateSoloKickoutCountdown()
		if (soloKickoutCountdown.value !== "") {
			if (soloKickoutCountdownTimer != null) clearInterval(soloKickoutCountdownTimer)
			soloKickoutCountdownTimer = setInterval(updateSoloKickoutCountdown, 1000)
		}
	},
	{ immediate: true }
)

onUnmounted(() => {
	if (soloKickoutCountdownTimer != null) clearInterval(soloKickoutCountdownTimer)
})
/** End Kickout */

function setupCountryBuilding(bldg) {
	store.clearVars()
	store.clearHistoryHelpers()
	store.context.countryBuildingBeingPlaced = bldg

	if (model.unableToAffordBuilding(controller.currentPlayerIndex(), bldg)) return

	// Woodcutter
	if (bldg === rf.COUNTRYSIDE_BLDG_WOODCUTTER) {
		store.context.hexesToHighlight = country.getWoodcutterPlacementZone(controller.currentPlayerIndex())
		store.context.action = rf.ACT_PLACE_COUNTRYSIDE_BLDG
	}
	// Mine
	else if (bldg === rf.COUNTRYSIDE_BLDG_MINE) {
		/*
			Method 1 Order:
			1) Select Zone
			2) Select Mine Type

		*/
		// store.context.hexesToHighlight = country.getMinePlacementZone(controller.currentPlayerIndex())
		// store.context.action = rf.ACT_PLACE_COUNTRYSIDE_BLDG

		/*
			Method 2 Order:
			1) Select Mine Type
			2) Select Zone
		*/
		store.context.action = rf.ACT_CHOOSE_BUILDING_PAYMENT
	}
	// Inn / Farm / Fishery
	else if (bldg === rf.COUNTRYSIDE_BLDG_INN || bldg === rf.COUNTRYSIDE_BLDG_FARM || bldg === rf.COUNTRYSIDE_BLDG_FISHERY) {
		store.context.action = rf.ACT_CHOOSE_BUILDING_PAYMENT
		if (bldg === rf.COUNTRYSIDE_BLDG_FARM) store.context.countryBuildingBeingPlaced = rf.COUNTRYSIDE_BLDG_FARM
	}
	// New City
	else if (bldg === rf.COUNTRYSIDE_BLDG_CITY) {
		// Req: Max 4 cities
		if (controller.currentPlayerObj().cities.length >= 4) {
			// Error message set independently
			return
		}
		// Set up the payment array
		store.context.newCityPayment.splice(0)
		store.context.newCityPayment = [-1, -1, -1]
		// Attempt to auto-select resources
		let availableResources = controller.currentPlayerObj().availableResources
		// First do the FOOD
		let relevantFoodRes = [availableResources[rf.RES_GRAIN], availableResources[rf.RES_OLIVES], availableResources[rf.RES_SHEEP], availableResources[rf.RES_FISH]]
		const nonZeroFoodResCount = relevantFoodRes.filter((value) => value > 0).length
		// If only 1 food source, select that
		if (nonZeroFoodResCount === 1) {
			let nonZeroIndex = relevantFoodRes.findIndex((value) => value !== 0)
			if (nonZeroIndex === 0) store.context.newCityPayment[0] = rf.RES_GRAIN
			else if (nonZeroIndex === 1) store.context.newCityPayment[0] = rf.RES_OLIVES
			else if (nonZeroIndex === 2) store.context.newCityPayment[0] = rf.RES_SHEEP
			else if (nonZeroIndex === 3) store.context.newCityPayment[0] = rf.RES_FISH
		}

		// Then do the LUX
		//const resLuxRef = [rf.RES_GOLD, rf.RES_WINE, rf.RES_PEARLS, rf.RES_DYE]
		let workingPhil = city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_PHILOSOPHY)
		let relevantRes = [availableResources[rf.RES_GOLD], availableResources[rf.RES_WINE], availableResources[rf.RES_PEARLS], availableResources[rf.RES_DYE]]
		const resSum = relevantRes.reduce((acc, curr) => acc + curr, 0)
		const nonZeroResCount = relevantRes.filter((value) => value > 0).length

		// Can't afford if less than 2 res
		if (resSum < 2) return
		// Can't afford if no phil and no 2D
		if (!workingPhil && nonZeroResCount < 2) return

		// Fac Phil, 1 type of Lux, just use that
		if (workingPhil && nonZeroResCount === 1) {
			let nonZeroIndex = relevantRes.findIndex((value) => value !== 0)
			if (nonZeroIndex === 0) {
				store.context.newCityPayment[1] = rf.RES_GOLD
				store.context.newCityPayment[2] = rf.RES_GOLD
			} else if (nonZeroIndex === 1) {
				store.context.newCityPayment[1] = rf.RES_WINE
				store.context.newCityPayment[2] = rf.RES_WINE
			} else if (nonZeroIndex === 2) {
				store.context.newCityPayment[1] = rf.RES_PEARLS
				store.context.newCityPayment[2] = rf.RES_PEARLS
			} else if (nonZeroIndex === 3) {
				store.context.newCityPayment[1] = rf.RES_DYE
				store.context.newCityPayment[2] = rf.RES_DYE
			}
		}
		// No Fac Phil, but only 2 diff Lux
		else if (!workingPhil && nonZeroResCount === 2) {
			for (let i = 0; i < relevantRes.length; i++) {
				if (relevantRes[i] !== 0) {
					let selectedRes = rf.RES_GOLD
					if (i == 1) selectedRes = rf.RES_WINE
					if (i == 2) selectedRes = rf.RES_PEARLS
					if (i == 3) selectedRes = rf.RES_DYE
					if (store.context.newCityPayment[1] === -1) store.context.newCityPayment[1] = selectedRes
					else store.context.newCityPayment[2] = selectedRes
				}
			}
		}
		// only 2 of any resources, use them, even with fac phil
		else if (resSum === 2 && nonZeroResCount === 2) {
			for (let i = 0; i < relevantRes.length; i++) {
				if (relevantRes[i] !== 0) {
					let selectedRes = rf.RES_GOLD
					if (i == 1) selectedRes = rf.RES_WINE
					if (i == 2) selectedRes = rf.RES_PEARLS
					if (i == 3) selectedRes = rf.RES_DYE
					if (store.context.newCityPayment[1] === -1) store.context.newCityPayment[1] = selectedRes
					else store.context.newCityPayment[2] = selectedRes
				}
			}
		}
		// Cannot auto select
		if (store.context.newCityPayment[0] === -1 || store.context.newCityPayment[1] === -1 || store.context.newCityPayment[2] === -1) store.context.action = rf.ACT_CHOOSE_BUILDING_PAYMENT
		else {
			store.context.action = rf.ACT_PLACE_COUNTRYSIDE_CITY
			store.context.countryBuildingBeingPlaced = rf.COUNTRYSIDE_BLDG_CITY
			store.context.hexesToHighlight = country.getCityPlacementZone(controller.currentPlayerIndex())
		}
	}
}

function canSelectCostRes(res) {
	if (store.context.action !== rf.ACT_CHOOSE_BUILDING_PAYMENT && store.context.action !== rf.ACT_PLACE_COUNTRYSIDE_BLDG) return

	// Bio check is now done in template, and selection enablement is automatic
	//if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FARM && city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_BIOLOGY, true)) return true

	if (!store.sandboxMode && controller.currentPlayerObj().availableResources[res] === 0) return false
	//if (store.context.countryBuildingBeingAddedPayment.length === 0) return true
	if (!city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_PHILOSOPHY) && store.context.newCityPayment.includes(res)) return false
	else if (city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_PHILOSOPHY) && store.context.newCityPayment.includes(res) && controller.currentPlayerObj().availableResources[res] === 1) return false

	if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_CITY) {
		if (rf.RES_FOODS.includes(res) && store.context.newCityPayment[0] !== -1) return false

		if (rf.RES_LUXS.includes(res) && store.context.newCityPayment[1] !== -1 && store.context.newCityPayment[2] !== -1) return false
	}
	return true
}

function clickedCostRes(res, isUsingFreeSeed) {
	if (!canSelectCostRes(res) && !isUsingFreeSeed) return

	store.context.goodsToBeProduced = res
	// INN
	if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_INN) {
		store.context.action = rf.ACT_PLACE_COUNTRYSIDE_BLDG
		country.getInnPlacementZone(controller.currentPlayerIndex())
		// FARM
	} else if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FARM) {
		store.context.goodsToBeProduced = res
		if (isUsingFreeSeed) store.context.goodsToBeProducedUsesFreeSeed = true
		else store.context.goodsToBeProducedUsesFreeSeed = false
		store.context.action = rf.ACT_PLACE_COUNTRYSIDE_BLDG
		store.context.hexesToHighlight = country.getFarmPlacementZone(controller.currentPlayerIndex())
	}
	// City
	else if (store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_CITY) {
		if (rf.RES_LUXS.includes(res)) {
			if (store.context.newCityPayment[1] === -1) store.context.newCityPayment[1] = res
			else store.context.newCityPayment[2] = res
		} else store.context.newCityPayment[0] = res

		if (store.context.newCityPayment[0] !== -1 && store.context.newCityPayment[1] !== -1 && store.context.newCityPayment[2] !== -1) {
			store.context.action = rf.ACT_PLACE_COUNTRYSIDE_CITY
			store.context.countryBuildingBeingPlaced = rf.COUNTRYSIDE_BLDG_CITY
			store.context.hexesToHighlight = country.getCityPlacementZone(controller.currentPlayerIndex())
		}
	}
}

function selectMineRes(res) {
	/*
		Method 1
	*/
	// Clear highlighted text in case a different products highlight different zones (e.g. Mine)
	//store.context.hexesToHighlight.splice(0)
	//store.context.goodsToBeProduced = res
	//country.placeBuilding(controller.currentPlayerIndex(), store.context.hexSelectedForMine)

	/*
		Method 2
	*/
	store.context.goodsToBeProduced = res
	store.context.action = rf.ACT_PLACE_COUNTRYSIDE_BLDG
	store.context.hexesToHighlight = country.getMinePlacementZone(controller.currentPlayerIndex(), store.context.goodsToBeProduced)
	// Initiate the historyObj
	store.context.historyObj.splice(0)
	store.context.historyObj.push(-1) // placeholder for mountain range set or not
	store.context.historyObj.push(res)
}

function selectFisheryRes(res) {
	store.context.goodsToBeProduced = res
	store.context.action = rf.ACT_PLACE_COUNTRYSIDE_BLDG
	store.context.hexesToHighlight = country.getFishermanPlacementZone(controller.currentPlayerIndex())
}

function getCityCostText(isFood) {
	if (isFood) return "1 Food"
	if (city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_PHILOSOPHY)) return "1 Lux"
	return "1D Lux"
}

function clickedUseFacAlch() {
	// Extra check for the building
	if (!city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_ALCHEMY, true)) return
	// If already used, give an error

	// Else, set up the zone
	country.setAlchemistZoc(controller.currentPlayerIndex())
}

function localEndTurn() {
	if (store.gameflow.phase === rf.PHASE_EXPLORE) {
		store.context.historyObj.splice(0)
		store.context.historyObj.push(-1)
	}

	if (store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING && store.context.action !== rf.ACT_CONFIRM_END_TURN) store.context.action = rf.ACT_CONFIRM_END_TURN
	else if (store.gameflow.phase === rf.PHASE_EXPLORE && store.context.action !== rf.ACT_CONFIRM_END_TURN) {
		store.context.hexesToHighlight.splice(0)
		store.context.action = rf.ACT_CONFIRM_END_TURN
	} else controller.endPlayerTurn()
}

function getCountryEndTurnWarnings() {
	let ret = []
	let player = controller.currentPlayerObj()
	let _playerIndex = controller.currentPlayerIndex()
	let _resources = player.availableResources
	// Caution: Unused cart shops
	if (city.getCartShopStatus(controller.currentPlayerIndex())[0] > 0) ret.push(["orange", "Caution: You have unused Cart Shops"])

	//ret.push(["orange", "Caution: You cannot currently store all your resources (More might be spent in the Countryside Building phase)"])
	//ret.push(["red", "WARNING: You have no wood and no manned Cart Shops"])

	return ret
}

function canBuildBuilding(bldg) {
	if (store.context.countryCartsLeftToUse === 0) return false
	if (bldg === rf.COUNTRYSIDE_BLDG_WOODCUTTER) {
		if (store.context.countryBuildCalculation.hasWood && store.context.countryBuildCalculation.anyWoodHexes) return true
		return false
	}
	if (bldg === rf.COUNTRYSIDE_BLDG_MINE) {
		if (store.context.countryBuildCalculation.hasWood && store.context.countryBuildCalculation.anyMountainHexes) return true
		return false
	}
	if (bldg === rf.COUNTRYSIDE_BLDG_FARM) {
		if (store.context.countryBuildCalculation.hasSeedRes && store.context.countryBuildCalculation.anyPlainsHexes) return true
		return false
	}
	if (bldg === rf.COUNTRYSIDE_BLDG_FISHERY) {
		if (store.context.countryBuildCalculation.hasWood && store.context.countryBuildCalculation.anyFishermanHexes) return true
		return false
	}
	if (bldg === rf.COUNTRYSIDE_BLDG_INN) {
		if (store.context.countryBuildCalculation.hasBrewery && store.context.countryBuildCalculation.hasFoodRes) return true
		return false
	}
	if (bldg === rf.COUNTRYSIDE_BLDG_CITY) {
		if (controller.currentPlayerObj().cities.length >= 4) return false
		if (store.context.countryBuildCalculation.canAffordCity && !store.context.countryBuildCalculation.noSpaceForCity) return true
		return false
	}
	return false
}

function toggleHexSelection() {
	if (store.context.hexesToHighlight.length > 0) store.context.hexesToHighlight.splice(0)
	else {
		if (store.gameflow.phase === rf.PHASE_FIRST_CITY) country.getFirstCityPlacementZone()
		if (store.gameflow.phase === rf.PHASE_POLLUTION) store.context.hexesToHighlight = country.getPollutionPlacementZone(controller.currentPlayerIndex())
	}
}

/*function getOrdinal(num) {
	if (num === 2) return "2nd"
	else if (num === 3) return "3rd"
	else if (num === 4) return "4th"
}*/

function cancelButton() {
	store.clearVars()
	store.clearHistoryHelpers()
}

function shouldShowAnyPreTurnOption() {
	// If not in the game, then no. Also, if super user, but with POV of -1, then no or it crashes
	if (personal.pov === -1) return false
	if (IO.DEBUG_USERS.includes(personal.name)) return true

	if (personal.pov == undefined) return false
	if (store.topMenuViews.showLoader) return false
	if (personal.canPlay()) return false
	if (store.topMenuViews.showReplay) return false
	if (store.gameflow.phase < rf.PHASE_COUNTRYSIDE_BUILDING) return false
	if (store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING && store.gameflow.turnOrder.includes(personal.pov)) return false

	if (store.gameflow.phase > rf.PHASE_POLLUTION) return false
	if (store.gameflow.phase === rf.PHASE_POLLUTION && !store.gameflow.turnOrder.includes(personal.pov)) return false

	if (shouldShowPreStorageOption() < 0 && shouldShowPreHarvestOption() < 0 && shouldShowPreExploreOption() < 0 && shouldShowPreFamineOption() < 0 && shouldShowPrePollutionOption() < 0) return false
	return true
}

function shouldShowPreStorageOption() {
	// if phase is after storage, false
	if (store.gameflow.phase > rf.PHASE_STORE_GOODS) return -1
	// if phase IS storage, but you have already moved, false
	if (store.gameflow.phase === rf.PRE_PHASE_STORE_GOODS && !store.gameflow.turnOrder.includes(personal.pov)) return -1

	let playerObj = store.players[personal.pov]
	let playerIndex = personal.pov

	// Unlimited storage, then store everything
	if (model.hasWorkingSaint(personal.pov, rf.SAINT_CHRISTOFORI)) return 1
	// NO resources
	else if (playerObj.availableResources.reduce((acc, curr) => acc + curr, 0) === 0) return 2
	// Now you have some resources
	else {
		let resCount = playerObj.availableResources.reduce((acc, curr) => acc + curr, 0)
		let availableStorage = city.getAvailableStorage(playerIndex)
		// Enough storage
		if (availableStorage >= resCount) return 3

		// No storage
		if (availableStorage === 0) return 4
	}
	return 0
}

function shouldShowPreHarvestOption() {
	// Don't show if you still need to country build
	if (store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING && store.gameflow.turnOrder.includes(personal.pov)) return 2
	// Don't show if after harvest, or after your move
	if (store.gameflow.phase > rf.PHASE_HARVEST) return -1
	if (store.gameflow.phase === rf.PHASE_HARVEST && !store.gameflow.turnOrder.includes(personal.pov)) return -1

	if (country.canAutoHarvest(personal.pov, city.hasWorkingUniqueBuilding(personal.pov, rf.BLDG_FORCED_LABOUR, false))) return 1
	return 0
}

function shouldShowPreExploreOption() {
	// Don't show if after explore, or after your move
	if (store.gameflow.phase > rf.PHASE_EXPLORE) return -1
	if (store.gameflow.phase === rf.PHASE_EXPLORE && !store.gameflow.turnOrder.includes(personal.pov)) return -1

	// Skip if no explorers
	if (!city.hasWorkingUniqueBuilding(personal.pov, rf.BLDG_EXPLORER, false)) return 1

	// So now with an explorer, skip if no explorer in ZoC
	const zoc = country.getZocTiles(personal.pov)
	//const tiles = zoc.filter((hex) => store.mapData.explorers.map((e) => e.id).includes(hex.id))
	const tiles = zoc.filter((hex) => store.mapData.explorers.includes(hex.id))
	if (tiles.length === 0) return 2

	return 0
}

function shouldShowPreFamineOption() {
	if (store.gameflow.phase > rf.PHASE_FAMINE) return -1
	if (store.gameflow.phase === rf.PHASE_FAMINE && !store.gameflow.turnOrder.includes(personal.pov)) return -1

	let totalGravesToPlaceForPreTurnArr = city.getTotalGravesToPlaceForPreTurn(personal.pov)
	// No graves, no explorers
	if (totalGravesToPlaceForPreTurnArr[0] === 0 && totalGravesToPlaceForPreTurnArr[1] === 0) return 1
	// No graves, but explorers
	if (totalGravesToPlaceForPreTurnArr[0] === 0 && totalGravesToPlaceForPreTurnArr[1] > 0) return 2
	// Otherwise, there are some graves to place
	// So check there is enough space
	let freeSpaceArr = city.getAllGraveCitySquaresToHighlight(personal.pov)
	let freeSpace = 0
	for (let i = 0; i < freeSpaceArr.length; i++) {
		freeSpace += freeSpaceArr[i].length
	}
	// N index[0] INCLUDES the explorers
	if (freeSpace < totalGravesToPlaceForPreTurnArr[0]) return 3
	return 0
}

function shouldShowPrePollutionOption() {
	if (store.gameflow.phase > rf.PHASE_POLLUTION) return -1
	if (store.gameflow.phase === rf.PHASE_POLLUTION && !store.gameflow.turnOrder.includes(personal.pov)) return -1
	let pollutionCount = country.getPendingPollution(personal.pov)
	if (pollutionCount <= 0) return 1
	const zoc = country.getPollutionPlacementZonePRETURN(personal.pov)
	if (pollutionCount > zoc.length) return 2

	return 0
}

function localActionPreStoreTurn() {
	store.prePhaseResetData = funcs.simpleExportWholeModel()
	store.gameflow.phase = rf.PRE_PHASE_STORE_GOODS
	let playerObj = store.players[personal.pov]
	let playerIndex = personal.pov
	let resCount = playerObj.availableResources.reduce((acc, curr) => acc + curr, 0)
	let availableStorage = city.getAvailableStorage(playerIndex)
	store.context.resourcesToDiscard = resCount - availableStorage
	store.topMenuViews.showingPlayerIndex = playerIndex
	store.wholeTurnResetData = funcs.simpleExportWholeModel()
}

function localActionPreHarvestTurn() {
	store.prePhaseResetData = funcs.simpleExportWholeModel()
	store.gameflow.phase = rf.PRE_PHASE_HARVEST
	//let playerObj = store.players[personal.pov]
	//let playerIndex = personal.pov
	country.getResourcesHexesForHarvest(personal.pov)
	store.wholeTurnResetData = funcs.simpleExportWholeModel()
}

function localActionPreExploreTurn() {
	store.prePhaseResetData = funcs.simpleExportWholeModel()
	store.gameflow.phase = rf.PRE_PHASE_EXPLORE

	const zoc = country.getZocTiles(personal.pov)
	const tiles = zoc.filter((hex) => store.mapData.explorers.includes(hex.id))

	store.context.action = rf.ACT_EXPLORE
	store.context.hexesToHighlight = tiles
}

function localActionPreFamineTurn() {
	store.prePhaseResetData = funcs.simpleExportWholeModel()
	// We know there is at least 1 potential grave to place, and enough free space for all of them
	// Set the number of graves to place
	store.context.preMoveGravesArr.splice(0)
	store.context.preMoveGravesArr = city.getTotalGravesToPlaceForPreTurn(personal.pov)
	store.context.gravesLeftToPlace = store.context.preMoveGravesArr[0]
	// Check for game loss
	//let freeSpace = city.getAllGraveCitySquaresToHighlight(currentPlayerIndex())

	store.gameflow.phase = rf.PRE_PHASE_FAMINE

	city.startGravePlacement(personal.pov)

	// Switch to city
	store.topMenuViews.showingPlayerIndex = personal.pov
}

function localActionPrePollutionTurn() {
	store.prePhaseResetData = funcs.simpleExportWholeModel()
	store.context.gameflowPhase = store.gameflow.phase
	store.gameflow.phase = rf.PRE_PHASE_POLLUTION

	store.context.historyObj.splice(0)
	store.context.action = rf.ACT_PLACE_COUNTRYSIDE_POLLUTION
	store.context.hexesToHighlight.splice(0)

	store.context.pollutionLeftToPlace = country.getPendingPollution(personal.pov)

	const zoc = country.getPollutionPlacementZonePRETURN(personal.pov)
	// We can only pre-pollute if enough space
	store.context.hexesToHighlight = zoc
}

function getStoragePreMove() {
	let playerObj = store.players[personal.pov]
	if (playerObj.preMoves.some((move) => move.phase === rf.PRE_PHASE_STORE_GOODS)) {
		return playerObj.preMoves.find((move) => move.phase === rf.PRE_PHASE_STORE_GOODS).data
	}
	return []
}

function getHarvestPreMove() {
	let playerObj = store.players[personal.pov]
	if (playerObj.preMoves.some((move) => move.phase === rf.PRE_PHASE_HARVEST)) {
		return playerObj.preMoves.find((move) => move.phase === rf.PRE_PHASE_HARVEST).data.length
	}
	return -1
}

function getExplorerPreMove() {
	let playerObj = store.players[personal.pov]
	if (playerObj.preMoves.some((move) => move.phase === rf.PRE_PHASE_EXPLORE)) {
		if (playerObj.preMoves.find((move) => move.phase === rf.PRE_PHASE_EXPLORE).data[0] === -1) return 0
		return 1
	}
	return -1
}

function getFaminePreMove() {
	let playerObj = store.players[personal.pov]
	if (playerObj.preMoves.some((move) => move.phase === rf.PRE_PHASE_FAMINE)) {
		//if (playerObj.preMoves.find((move) => move.phase === rf.PRE_PHASE_FAMINE).data[0] === -1) return 0
		return 1
	}
	return -1
}

function getPollutionPreMove() {
	let playerObj = store.players[personal.pov]
	if (playerObj.preMoves.some((move) => move.phase === rf.PRE_PHASE_POLLUTION)) {
		//if (playerObj.preMoves.find((move) => move.phase === rf.PRE_PHASE_FAMINE).data[0] === -1) return 0
		return 1
	}
	return -1
}

function flatmapResourceArray(array) {
	return array.flatMap((num, index) => Array.from({ length: num }, () => index))
}
</script>

<template>
	<!-- LOGGED OUT TEXT-->
	<template v-if="personal.name == undefined">
		<div id="loggedOutText">
			Please
			<a href="/register">REGISTER</a>
			or
			<a href="/login">LOGIN</a>
			to play a game
			<br />
		</div>
		<br />
	</template>

	<!-- EXPERT PANEL - HARVEST, EXPLORE, STORE - ONLY AFTER YOU HAVE MADE A COUTNRYSIDE TURN-->
	<template v-if="shouldShowAnyPreTurnOption()">
		<br />
		<div class="expertPanel">
			<b>Expert Options</b>
			: If unsure then ignore
			<hr />
			<template v-if="shouldShowPreStorageOption() >= 0">
				<template v-if="shouldShowPreStorageOption() === 0">
					<button @click="localActionPreStoreTurn" class="actionsLineButton">
						<span v-if="getStoragePreMove().length === 0">Action Store Turn</span>
						<span v-else>Change Store Turn</span>
					</button>
					<template v-if="getStoragePreMove().length > 0">
						Store:
						<img v-for="(res, idx) in flatmapResourceArray(getStoragePreMove())" :key="idx"
							class="storagePreMoveRes" :src="view.getImage('res_' + String(res))" />
					</template>
					<template v-else>No Data</template>
				</template>
				<template v-else>
					<span v-if="shouldShowPreStorageOption() === 1">Your Saint Power gives you Unlimited Storage</span>
					<span v-else-if="shouldShowPreStorageOption() === 2">You have no resources to store</span>
					<span v-else-if="shouldShowPreStorageOption() === 3">You have enough storage for all your
						resources</span>
					<span v-else-if="shouldShowPreStorageOption() === 4">You have no storage</span>
				</template>
				<hr />
			</template>

			<template v-if="shouldShowPreHarvestOption() >= 0">
				<template v-if="shouldShowPreHarvestOption() === 0">
					<button @click="localActionPreHarvestTurn" class="actionsLineButton">
						<span v-if="getHarvestPreMove() === -1">Action Harvest Turn</span>
						<span v-else>Change Harvest Turn</span>
					</button>
					<template v-if="getHarvestPreMove() >= 0">Harvesting Pre-set</template>
					<template v-else>No Data</template>
				</template>
				<template v-else>
					<span v-if="shouldShowPreHarvestOption() === 1">You have no decisions to make during
						harvesting</span>
					<span v-if="shouldShowPreHarvestOption() === 2">You must complete countryside building before
						harvesting</span>
				</template>
				<hr />
			</template>

			<template v-if="shouldShowPreExploreOption() >= 0">
				<template v-if="shouldShowPreExploreOption() === 0">
					<button @click="localActionPreExploreTurn" class="actionsLineButton">
						<span v-if="getExplorerPreMove() === -1">Action Explore Turn</span>
						<span v-else>Change Explore Turn</span>
					</button>
					<template v-if="getExplorerPreMove() === 1">You chose to explore</template>
					<template v-else-if="getExplorerPreMove() === 0">Skip exploration</template>
					<template v-else>No Data</template>
				</template>
				<template v-else>
					<span v-if="shouldShowPreExploreOption() === 1">You do not have a manned explorer</span>
					<span v-if="shouldShowPreExploreOption() === 2">You cannot reach an explorer token</span>
				</template>
				<hr />
			</template>
			<template v-if="shouldShowPreFamineOption() >= 0">
				<template v-if="shouldShowPreFamineOption() === 0">
					<button @click="localActionPreFamineTurn" class="actionsLineButton">
						<span v-if="getFaminePreMove() === -1">Action Famine Turn</span>
						<span v-else>Change Famine Turn</span>
					</button>
					<template v-if="getFaminePreMove() >= 0">Graves Pre-set</template>
					<template v-else>No Data</template>
					<br />
					<b>Graves:</b>
					{{ Math.max(city.getTotalGravesToPlaceForPreTurn(personal.pov)[0] -
						city.getTotalGravesToPlaceForPreTurn(personal.pov)[1], 0) }}
					<span v-if="city.getTotalGravesToPlaceForPreTurn(personal.pov)[1] > 0">- {{
						city.getTotalGravesToPlaceForPreTurn(personal.pov)[0] }}</span>
				</template>
				<template v-else>
					<span v-if="shouldShowPreFamineOption() === 1">No graves to place, no explorers in play</span>
					<span v-if="shouldShowPreFamineOption() === 2">Even if all explorers find food, you will still have
						0 graves</span>
					<span v-if="shouldShowPreFamineOption() === 3">You do not have enough space to place all
						graves</span>
				</template>
				<hr />
			</template>
			<template v-if="shouldShowPrePollutionOption() >= 0">
				<template v-if="shouldShowPrePollutionOption() === 0">
					<button @click="localActionPrePollutionTurn" class="actionsLineButton">
						<span v-if="getPollutionPreMove() === -1">Action Pollution Turn</span>
						<span v-else>Change Pollution Turn</span>
					</button>
					<template v-if="getPollutionPreMove() >= 0">Pollution Pre-set</template>
					<template v-else>No Data</template>
					<br />
					<b>Pollution:</b>
					{{ country.getPendingPollution(personal.pov) }}
				</template>
				<template v-else>
					<span v-if="shouldShowPrePollutionOption() === 1">No pollution to place</span>
					<span v-if="shouldShowPrePollutionOption() === 2">You have more pollution than free hexes</span>
				</template>
				<br />
			</template>
		</div>
	</template>

	<!-- KICKOUT-->
	<template v-if="personal.kickoutRequired > 0 && !personal.canPlay() && store.gameflow.phase !== rf.PHASE_GAME_OVER">
		<div v-if="personal.kickoutRequired == 1" id="kickoutDiv">
			Player
			<b>{{ controller.currentPlayerObj().name }}</b>
			has used all the standard kickout time.
			<br />
			<br />
			Remaining Flex-Time:
			<span id="flexiKickoutTimerSpan">{{ getFlexiKickoutTImerText() }}</span>
			<br />
			<br />
			For more information see
			<b><a href="/help/" target="_blank">Help</a></b>
		</div>
		<!--<div v-else-if="personal.externalTournamentGame" id="kickoutDiv">
			Under the tournament rules set by the external tournament organisers, you cannot kick other players from this type of tournament game
			<br />
			<br />
			Please use the button below to alert the admins, who will continue to make moves for this player
			<br />
			<br />
			<br />
			<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow more time</button></span>

			<button class="actionsLineButton" @click="IO.nudgeTourneyAdmins(1)">Alert Admins</button>
		</div>-->

		<div v-else id="kickoutDiv">
			<br />
			<template v-if="canKickoutNow()">
				<template v-if="store.context.action !== rf.ACT_CONFIRM_KICKOUT">
					Player
					<b>{{ controller.currentPlayerObj().name }}</b>
					has timed out
					<br />
					To kick out
					<b>{{ controller.currentPlayerObj().name }}</b>
					press Confirm Kickout
					<br />
					The game will proceed to the next player/phase/turn
					<br />
					<br />
					Otherwise you can allow
					<b>{{ controller.currentPlayerObj().name }}</b>
					more time - reload the page to initiate kickout again
					<br />

					<br />
					<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow
							more time</button></span>
					<span>
						<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">Keep {{
							controller.currentPlayerObj().name }} in the game - but end their current turn</button>
					</span>
					<span><button class="actionsLineButton" id="confirmKickoutButton"
							@click="store.context.action = rf.ACT_CONFIRM_KICKOUT">Confirm Kickout</button></span>
				</template>
				<template v-if="store.context.action === rf.ACT_CONFIRM_KICKOUT">
					This will permanently remove <b>{{ controller.currentPlayerObj().name }}</b> from the game<br />
					<b>It cannot be undone</b><br />
					<br />
					Try checking the chat in case they have given a reason for any temporary absence<br />
					Please consider giving them a short grace period, in case they are just delayed

					<br />
					<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow
							more time</button></span>
					<span><button class="actionsLineButton" id="confirmKickoutButton"
							@click="Bot.actionPlayerKickout">Permanently Kickout {{ controller.currentPlayerObj().name
							}}</button></span>
				</template>
			</template>
			<template v-else>
				Player
				<b>{{ controller.currentPlayerObj().name }}</b>
				has timed out
				<br />
				A vote from the other players is needed to kick out
				<b>{{ controller.currentPlayerObj().name }}</b>
				<br />
				Votes: {{ kickoutVoteCount() }}/{{ store.kickoutVoteThreshold }}
				({{ kickoutVoters() }})
				<br />
				<br />
				<span v-if="!myKickoutVote()">
					<template v-if="isLastVoteRequired()">
						This will permanently remove <b>{{ controller.currentPlayerObj().name }}</b> from the game<br />
						<b>It cannot be undone</b><br />
						<br />
					</template>
					<button class="actionsLineButton" id="voteKickoutButton"
						@click="Bot.actionPlayerKickout">Vote to Kickout {{ controller.currentPlayerObj().name }}</button>
				</span>
				<span v-else>
					You have voted to kick out
					<b>{{ controller.currentPlayerObj().name }}</b>
					<br />
					If the other players do not also vote, you will be able to kick them out directly in {{ soloKickoutCountdown }}
				</span>
				<br />
				<br />
				<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow
						more time</button></span>
				<span>
					<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">Keep {{
						controller.currentPlayerObj().name }} in the game - but end their current turn</button>
				</span>
			</template>
		</div>
	</template>

	<!-- ALWAYS SHOWS GAME END-->
	<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
		<div id="gameEndDiv">
			Game Over
			<br />
			<br />
			<!-- LAST MAN STANDING WIN -->
			<template v-if="store.history[store.history.length - 1][3][0] === rf.GAME_WIN_LAST_MAN_STANING">
				Winner:
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][1][0]].colour)">{{
							store.players[store.history[store.history.length - 1][3][1][0]].displayName }}</span>
				</div>
				<br />
				<span>Last Man Standing</span>
				<br />
				<span v-if="store.players[store.history[store.history.length - 1][3][1][0]].saint !== rf.SAINT_NONE">
					Winning Saint:
					<img class="winningSaintImage"
						:src="view.getImage('saint_' + String(store.players[store.history[store.history.length - 1][3][1][0]].saint))" />
					{{ rf.SAINT_INFO[store.players[store.history[store.history.length - 1][3][1][0]].saint].name }}
				</span>
				<span v-else>No Saint</span>
				<br />
				<template v-if="store.players[store.history[store.history.length - 1][3][1][0]].name === personal.name">
					<h1>Congratulations!</h1>
				</template>
			</template>

			<!-- GAME_WIN_LAST_UNGRAVED WIN -->
			<template v-if="store.history[store.history.length - 1][3][0] === rf.GAME_WIN_LAST_UNGRAVED">
				Winner:
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][1][0]].colour)">{{
							store.players[store.history[store.history.length - 1][3][1][0]].displayName }}</span>
				</div>
				<br />
				<span>Grave Dodger</span>
				<br />
				<span v-if="store.players[store.history[store.history.length - 1][3][1][0]].saint !== rf.SAINT_NONE">
					Winning Saint:
					<img class="winningSaintImage"
						:src="view.getImage('saint_' + String(store.players[store.history[store.history.length - 1][3][1][0]].saint))" />
					{{ rf.SAINT_INFO[store.players[store.history[store.history.length - 1][3][1][0]].saint].name }}
				</span>
				<span v-else>No Saint</span>
				<br />
				<template v-if="store.players[store.history[store.history.length - 1][3][1][0]].name === personal.name">
					<h1>Congratulations!</h1>
				</template>
			</template>

			<!-- SINGLE SAINT WINNER -->
			<template v-if="store.history[store.history.length - 1][3][0] === rf.GAME_WIN_ONLY_SAINT_WINNER">
				Winner:
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][1][0]].colour)">{{
							store.players[store.history[store.history.length - 1][3][1][0]].displayName }}</span>
				</div>
				<br />
				<span>Solo Saintly Fulfilment</span>
				<br />
				<span v-if="store.players[store.history[store.history.length - 1][3][1][0]].saint !== rf.SAINT_NONE">
					Winning Saint:
					<img class="winningSaintImage"
						:src="view.getImage('saint_' + String(store.players[store.history[store.history.length - 1][3][1][0]].saint))" />
					{{ rf.SAINT_INFO[store.players[store.history[store.history.length - 1][3][1][0]].saint].name }}
				</span>
				<span v-else>No Saint</span>
				<br />
				<template v-if="store.players[store.history[store.history.length - 1][3][1][0]].name === personal.name">
					<h1>Congratulations!</h1>
				</template>
			</template>

			<!-- SINGLE POLLUTION  WINNER -->
			<template v-if="store.history[store.history.length - 1][3][0] === rf.GAME_WIN_ONLY_POLLUTION_WINNER">
				Winner:
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][1][0]].colour)">{{
							store.players[store.history[store.history.length - 1][3][1][0]].displayName }}</span>
				</div>
				<br />
				<span>Most Unpolluted Hexes</span>
				<br />
				<span v-if="store.players[store.history[store.history.length - 1][3][1][0]].saint !== rf.SAINT_NONE">
					Winning Saint:
					<img class="winningSaintImage"
						:src="view.getImage('saint_' + String(store.players[store.history[store.history.length - 1][3][1][0]].saint))" />
					{{ rf.SAINT_INFO[store.players[store.history[store.history.length - 1][3][1][0]].saint].name }}
				</span>
				<span v-else>No Saint</span>
				<br />
				<template v-if="store.players[store.history[store.history.length - 1][3][1][0]].name === personal.name">
					<h1>Congratulations!</h1>
				</template>
				Runner
				<span v-if="store.history[store.history.length - 1][3][2].length > 1">s</span>
				Up:
				<div class="playerScoreSummaryDiv"
					v-for="(playerIndex, idx) in store.history[store.history.length - 1][3][2]" :key="idx">
					<span class="mainEntryPlayerNewTurn"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{
							store.players[playerIndex].displayName }}</span>
				</div>
			</template>

			<!-- MULTI POLLUTION WINNER -->
			<template v-if="store.history[store.history.length - 1][3][0] === rf.GAME_WIN_TIE">
				Winners:
				<div class="playerScoreSummaryDiv"
					v-for="(playerIndex, idx) in store.history[store.history.length - 1][3][1]" :key="idx">
					<span class="mainEntryPlayerNewTurn"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{
							store.players[playerIndex].displayName }}</span>
				</div>
				<br />
				<span>Joint Most Unpolluted Hexes</span>
				<br />
				Winning Saints:
				<template v-for="(playerIndex, idx) in store.history[store.history.length - 1][3][1]" :key="idx">
					<span v-if="store.players[playerIndex].saint !== rf.SAINT_NONE">
						<img class="winningSaintImage"
							:src="view.getImage('saint_' + String(store.players[playerIndex].saint))" />
						{{ rf.SAINT_INFO[store.players[playerIndex].saint].name }}
					</span>
					<span v-else>No Saint</span>
				</template>
				<br />
				<template v-if="store.history[store.history.length - 1][3][1].includes(personal.pov)">
					<h1>Congratulations!</h1>
				</template>

				<template v-if="store.history[store.history.length - 1][3].length > 2">
					Runner
					<span v-if="store.history[store.history.length - 1][3][2].length > 1">s</span>
					Up:
					<div class="playerScoreSummaryDiv"
						v-for="(playerIndex, idx) in store.history[store.history.length - 1][3][2]" :key="idx">
						<span class="mainEntryPlayerNewTurn"
							:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{
								store.players[playerIndex].displayName }}</span>
					</div>
				</template>
			</template>

			<!-- ALWAYS HAVE REMATCH LINK AT THE BOTTOM -->
			<br />
			<br />
			Fancy a
			<a :href="'/createAQYpage/' + String(personal.gameID) + '/'">rematch</a>
			?
			<br />
			<br />
		</div>
	</template>

	<!-- EXPLORER RESULT -->
	<div v-if="store.newlyExplorerResource !== rf.RES_NONE" class="generalActions explorerRevealDiv">
		Your Explorer Revealed:
		<img class="newBuildingCostRes" :src="view.getImage('res_' + String(store.newlyExplorerResource))" />
		<br />
		<span v-if="store.newlyExplorerResource === rf.RES_WINE">Famine level remains at: {{ store.famineLevel }}</span>
		<span v-else>Famine level increases to: {{ store.famineLevel }}</span>
	</div>

	<!-- ONLY SHOW ACTIONS IF YOU CAN PLAY -->
	<template v-if="personal.canPlay()">
		<!-- TURN 1 INFO -->
		<template
			v-if="store.gameflow.turn === 1 && store.gameflow.phase === rf.PHASE_FIRST_CITY && !store.topMenuViews.showReplay">
			<h2>Welcome to Antiquity!</h2>
			<div class="intro_items_list_div">
				To switch between City and Country views, click on any player icon
				<img :src="view.getImage('clickPlayers')" alt="Player Boxes" class="helpImage clickPlayers" />
				<br />
				<img :src="view.getImage('helpCity')" alt="City Help" class="helpImage helpCity" />
				<br />
				<br />
				During City Building:
				<br />
				<br />
				<span class="greenArea">Use the green area for main actions: Reset Whole Turn / Undo / Finish Actions
					(and End Turn)</span>
				<br />
				<br />
				<span class="purpleArea">Use the purple area to interact with your cities: (Re)move buildings, man and
					un-man buildings</span>
				<br />
				<br />
				<span class="blueArea">Use the blue area to directly use buildings, eg Market, Faculty of
					Theology</span>
				<br />
				<br />

				NOTE: You may MOVE unused buildings during city building on the turn they were built even without the
				Saint power.
				<br />
				This is effectively a shortcut to prevent you having to reset the whole turn just to place a building
				somewhere slighly different.
				<br />
				Using certain buildings or performing certain actions will lock in your buildings;
				<br />
				in this case you will need to reset your turn in order to perform your actions differently.
				<br />
				<br />
				<img :src="view.getImage('icon-info')" alt="Info" class="helpImage infoIcon" />
				Click the Info button to view Victory Progression
				<br />
				<br />
				Don't forget to set your Antiquity Preferences!
				<a class="linkOther" href="/profileAQY/" target="_blank">Antiquity Preferences</a>
				<br />
				<br />
				For more information please see
				<a class="linkOther" href="/AQY/help/" target="_blank">Antiquity Help</a>
			</div>
			<br />
		</template>

		<!-- FIRST CITY -->
		<template v-if="store.gameflow.phase === rf.PHASE_FIRST_CITY">
			<div class="generalActions">Place your first city</div>
		</template>
		<!-- CITY BUILDING -->
		<template v-if="store.gameflow.phase === rf.PHASE_CITY_BUILDING">
			<div class="generalActions">Build your Cities</div>
		</template>
		<!-- COUNTRYSIDE PHASE-->
		<template
			v-else-if="store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING && store.context.action !== rf.ACT_CONFIRM_END_TURN">
			<template
				v-if="store.context.countryCartsLeftToUse > 0 || city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_ALCHEMY, true)">
				<!-- ACTION SELECTION -->
				<div id="actionsContainer" class="countryPhase" v-if="!store.context.needToPlaceSecondFisheryHex">
					<div id="actionSelectionDiv">
						Available cart shops: {{ city.getCartShopStatus(controller.currentPlayerIndex())[0] }}
						<br />
						<button v-if="canBuildBuilding(rf.COUNTRYSIDE_BLDG_WOODCUTTER)" class="actionsLineButton"
							@click="setupCountryBuilding(rf.COUNTRYSIDE_BLDG_WOODCUTTER)">
							Build
							<br />
							Woodcutter
						</button>
						<button v-if="canBuildBuilding(rf.COUNTRYSIDE_BLDG_MINE)" class="actionsLineButton"
							@click="setupCountryBuilding(rf.COUNTRYSIDE_BLDG_MINE)">
							Build
							<br />
							Mine
						</button>
						<button v-if="canBuildBuilding(rf.COUNTRYSIDE_BLDG_FARM)" class="actionsLineButton"
							@click="setupCountryBuilding(rf.COUNTRYSIDE_BLDG_FARM)">
							Build
							<br />
							Farm
						</button>
						<button v-if="canBuildBuilding(rf.COUNTRYSIDE_BLDG_FISHERY)" class="actionsLineButton"
							@click="setupCountryBuilding(rf.COUNTRYSIDE_BLDG_FISHERY)">
							Build
							<br />
							Fishery
						</button>
						<button v-if="canBuildBuilding(rf.COUNTRYSIDE_BLDG_INN)" class="actionsLineButton"
							@click="setupCountryBuilding(rf.COUNTRYSIDE_BLDG_INN)">
							Build
							<br />
							Inn
						</button>
						<button v-if="canBuildBuilding(rf.COUNTRYSIDE_BLDG_CITY)" class="actionsLineButton"
							@click="setupCountryBuilding(rf.COUNTRYSIDE_BLDG_CITY)">
							Build
							<br />
							City
						</button>
						<button class="actionsLineButton"
							v-if="city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_ALCHEMY, true)"
							@click="clickedUseFacAlch">
							Use Faculty
							<br />
							of Alchemy
						</button>
						<br />

						<span v-if="store.context.countryBuildCalculation.hasWood === false">No wood for Woodcutter /
							Mine / Fishery,</span>
						<span v-if="store.context.countryBuildCalculation.anyWoodHexes === false">No wood tiles for
							Woodcutter,</span>
						<span v-if="store.context.countryBuildCalculation.anyMountainHexes === false">No Mountains for
							Mine,</span>
						<span v-if="store.context.countryBuildCalculation.anyFishermanHexes === false">No hexes for
							Fishery,</span>
						<span v-if="store.context.countryBuildCalculation.hasSeedRes === false">No seed for Farm,</span>
						<span v-if="!store.context.countryBuildCalculation.anyPlainsHexes">No Plains for Farm,</span>
						<span v-if="store.context.countryBuildCalculation.hasBrewery === false">No Brewery for
							Inn,</span>
						<span v-else-if="!store.context.countryBuildCalculation.hasFoodRes">No Food for Inn,</span>
						<span v-if="store.context.countryBuildCalculation.canAffordCity === false">No Resources for
							City,</span>
						<span v-if="store.context.countryBuildCalculation.noSpaceForCity === true">No space for
							City,</span>
						<span v-if="store.context.countryBuildCalculation.hasFacAlchToUse === false">No Fac Alch to
							remove Pollution,</span>
						<br />
						<button class="actionsLineButton" @click="cancelButton">Cancel</button>
					</div>
					<!-- Selected Action -->
					<div id="selectedActionDiv">
						<span v-if="store.context.countryBuildingBeingPlaced === rf.COUNTRSIDE_BLDG_NONE">Select a
							Building to Place</span>
						<span v-else>
							<!-- BUILDING TYPE -->
							Building:
							<b>{{ rf.COUNTRYSIDE_BLDG_NAMES[store.context.countryBuildingBeingPlaced] }}</b>
							<br />
							<!-- Woodcutter / mine / fishery COST -->
							Cost:
							<span
								v-if="store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_WOODCUTTER || store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_MINE || store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FISHERY">
								<img class="newBuildingCostRes" :src="view.getImage('res_0')" />
							</span>
							<span v-else-if="store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FARM">
								<b>1 Seed Good</b>
								<span
									v-if="city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_BIOLOGY, true)"
									class="greenText">
									<br />
									<b>Your Faculty Of Biology gives you a Free Seed</b>
								</span>
							</span>
							<!-- CHOOSE INN COST -->
							<span v-else-if="store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_INN">
								<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_GRAIN)"
									:class="[{ resSelectable: canSelectCostRes(rf.RES_GRAIN), selectedRes: store.context.goodsToBeProduced === rf.RES_GRAIN }]"
									:src="view.getImage('res_' + String(rf.RES_GRAIN))" />
								/
								<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_SHEEP)"
									:class="[{ resSelectable: canSelectCostRes(rf.RES_SHEEP), selectedRes: store.context.goodsToBeProduced === rf.RES_SHEEP }]"
									:src="view.getImage('res_' + String(rf.RES_SHEEP))" />
								/
								<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_OLIVES)"
									:class="[{ resSelectable: canSelectCostRes(rf.RES_OLIVES), selectedRes: store.context.goodsToBeProduced === rf.RES_OLIVES }]"
									:src="view.getImage('res_' + String(rf.RES_OLIVES))" />
								/
								<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_FISH)"
									:class="[{ resSelectable: canSelectCostRes(rf.RES_FISH), selectedRes: store.context.goodsToBeProduced === rf.RES_FISH }]"
									:src="view.getImage('res_' + String(rf.RES_FISH))" />
							</span>
							<!-- SELECT MINE RESOURCE Method 1-->
							<!--
							<span v-if="store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_MINE && store.context.action === rf.ACT_PLACE_COUNTRYSIDE_BLDG_MINE_SELECT_TYPE">
								<br />
								Select Mine Type:
								<img class="newBuildingCostRes resSelectable" @click="selectMineRes(rf.COUNTRYSIDE_BLDG_MINE, rf.RES_STONE)" :src="view.getImage('res_' + rf.RES_STONE)" />
								/
								<img class="newBuildingCostRes resSelectable" @click="selectMineRes(rf.COUNTRYSIDE_BLDG_MINE, rf.RES_GOLD)" :src="view.getImage('res_' + rf.RES_GOLD)" />
							</span>
							-->
							<!-- SELECT MINE RESOURCE Method 2-->
							<span v-if="store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_MINE">
								<br />
								Mine Type:
								<img class="newBuildingCostRes resSelectable"
									:class="{ selectedRes: store.context.goodsToBeProduced === rf.RES_STONE }"
									@click="selectMineRes(rf.RES_STONE)" :src="view.getImage('res_' + rf.RES_STONE)" />
								/
								<img class="newBuildingCostRes resSelectable"
									:class="{ selectedRes: store.context.goodsToBeProduced === rf.RES_GOLD }"
									@click="selectMineRes(rf.RES_GOLD)" :src="view.getImage('res_' + rf.RES_GOLD)" />
								<br />
								<span class="redText"
									v-if="store.context.goodsToBeProduced !== rf.RES_NONE && store.context.hexesToHighlight.length === 0">
									<b>No available mountains for this resouce</b>
								</span>
								<span v-else>
									<b>
										Mountain ranges already producing the other
										<br />
										resource will not be available to select
									</b>
								</span>
							</span>
							<!-- SET FARM FROM SEED -->
							<span v-if="store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FARM">
								<br />
								<template
									v-if="city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_BIOLOGY, true)">
									<span class="greenText"><b>&nbsp;&nbsp;&nbsp;Free Seed:</b></span>
									<img class="newBuildingCostRes resSelectable"
										@click="clickedCostRes(rf.RES_GRAIN, true)"
										:class="[{ selectedRes: store.context.goodsToBeProduced === rf.RES_GRAIN && store.context.goodsToBeProducedUsesFreeSeed }]"
										:src="view.getImage('res_' + String(rf.RES_GRAIN))" />
									/
									<img class="newBuildingCostRes resSelectable"
										@click="clickedCostRes(rf.RES_OLIVES, true)"
										:class="[{ selectedRes: store.context.goodsToBeProduced === rf.RES_OLIVES && store.context.goodsToBeProducedUsesFreeSeed }]"
										:src="view.getImage('res_' + String(rf.RES_OLIVES))" />
									/
									<img class="newBuildingCostRes resSelectable"
										@click="clickedCostRes(rf.RES_SHEEP, true)"
										:class="[{ selectedRes: store.context.goodsToBeProduced === rf.RES_SHEEP && store.context.goodsToBeProducedUsesFreeSeed }]"
										:src="view.getImage('res_' + String(rf.RES_SHEEP))" />
									/
									<img class="newBuildingCostRes resSelectable"
										@click="clickedCostRes(rf.RES_WINE, true)"
										:class="[{ selectedRes: store.context.goodsToBeProduced === rf.RES_WINE && store.context.goodsToBeProducedUsesFreeSeed }]"
										:src="view.getImage('res_' + String(rf.RES_WINE))" />
									<br />
								</template>
								Stored Seed:
								<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_GRAIN)"
									:class="[{ resSelectable: canSelectCostRes(rf.RES_GRAIN), selectedRes: store.context.goodsToBeProduced === rf.RES_GRAIN && !store.context.goodsToBeProducedUsesFreeSeed }]"
									:src="view.getImage('res_' + String(rf.RES_GRAIN))" />
								/
								<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_OLIVES)"
									:class="[{ resSelectable: canSelectCostRes(rf.RES_OLIVES), selectedRes: store.context.goodsToBeProduced === rf.RES_OLIVES && !store.context.goodsToBeProducedUsesFreeSeed }]"
									:src="view.getImage('res_' + String(rf.RES_OLIVES))" />
								/
								<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_SHEEP)"
									:class="[{ resSelectable: canSelectCostRes(rf.RES_SHEEP), selectedRes: store.context.goodsToBeProduced === rf.RES_SHEEP && !store.context.goodsToBeProducedUsesFreeSeed }]"
									:src="view.getImage('res_' + String(rf.RES_SHEEP))" />
								/
								<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_WINE)"
									:class="[{ resSelectable: canSelectCostRes(rf.RES_WINE), selectedRes: store.context.goodsToBeProduced === rf.RES_WINE && !store.context.goodsToBeProducedUsesFreeSeed }]"
									:src="view.getImage('res_' + String(rf.RES_WINE))" />
							</span>
							<!-- SET FISHERY -->
							<span v-if="store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FISHERY">
								<br />
								Fishery Type:
								<img class="newBuildingCostRes resSelectable" @click="selectFisheryRes(rf.RES_FISH)"
									:class="{ selectedRes: store.context.goodsToBeProduced === rf.RES_FISH }"
									:src="view.getImage('res_' + String(rf.RES_FISH))" />
								/
								<img class="newBuildingCostRes resSelectable" @click="selectFisheryRes(rf.RES_PEARLS)"
									:class="{ selectedRes: store.context.goodsToBeProduced === rf.RES_PEARLS }"
									:src="view.getImage('res_' + String(rf.RES_PEARLS))" />
								/
								<img class="newBuildingCostRes resSelectable" @click="selectFisheryRes(rf.RES_DYE)"
									:class="{ selectedRes: store.context.goodsToBeProduced === rf.RES_DYE }"
									:src="view.getImage('res_' + String(rf.RES_DYE))" />
							</span>
							<!-- NEW CITY COST -->
							<span v-if="store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_CITY">
								<img class="newBuildingCostRes" :src="view.getImage('res_0')" />
								+
								<img class="newBuildingCostRes" :src="view.getImage('res_1')" />
								+
								<!-- 1x FOOD-->
								<span v-if="store.context.newCityPayment[0] === -1">{{ getCityCostText(true) }} +</span>
								<span v-else>
									<img class="newBuildingCostRes"
										:src="view.getImage('res_' + String(store.context.newCityPayment[0]))" />
									+
								</span>

								<!-- 2x LUX-->
								<span
									v-if="store.context.newCityPayment[1] === -1 && store.context.newCityPayment[2] === -1">{{
										getCityCostText(false) }} + {{ getCityCostText(false) }}</span>
								<span
									v-else-if="store.context.newCityPayment[1] !== -1 && store.context.newCityPayment[2] === -1">
									<img class="newBuildingCostRes"
										:src="view.getImage('res_' + String(store.context.newCityPayment[1]))" />
									+ {{ getCityCostText() }}
								</span>
								<span v-else>
									<img class="newBuildingCostRes"
										:src="view.getImage('res_' + String(store.context.newCityPayment[1]))" />
									+
									<img class="newBuildingCostRes"
										:src="view.getImage('res_' + String(store.context.newCityPayment[2]))" />
								</span>

								<span v-if="store.context.action === rf.ACT_CHOOSE_BUILDING_PAYMENT">
									<br />
									Food Cost:
									<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_GRAIN)"
										:class="[{ resSelectable: canSelectCostRes(rf.RES_GRAIN) }]"
										:src="view.getImage('res_' + String(rf.RES_GRAIN))" />
									/
									<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_OLIVES)"
										:class="[{ resSelectable: canSelectCostRes(rf.RES_OLIVES) }]"
										:src="view.getImage('res_' + String(rf.RES_OLIVES))" />
									/
									<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_SHEEP)"
										:class="[{ resSelectable: canSelectCostRes(rf.RES_SHEEP) }]"
										:src="view.getImage('res_' + String(rf.RES_SHEEP))" />
									/
									<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_FISH)"
										:class="[{ resSelectable: canSelectCostRes(rf.RES_FISH) }]"
										:src="view.getImage('res_' + String(rf.RES_FISH))" />
									<br />
									Lux Cost:
									<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_GOLD)"
										:class="[{ resSelectable: canSelectCostRes(rf.RES_GOLD) }]"
										:src="view.getImage('res_' + String(rf.RES_GOLD))" />
									/
									<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_WINE)"
										:class="[{ resSelectable: canSelectCostRes(rf.RES_WINE) }]"
										:src="view.getImage('res_' + String(rf.RES_WINE))" />
									/
									<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_PEARLS)"
										:class="[{ resSelectable: canSelectCostRes(rf.RES_PEARLS) }]"
										:src="view.getImage('res_' + String(rf.RES_PEARLS))" />
									/
									<img class="newBuildingCostRes" @click="clickedCostRes(rf.RES_DYE)"
										:class="[{ resSelectable: canSelectCostRes(rf.RES_DYE) }]"
										:src="view.getImage('res_' + String(rf.RES_DYE))" />
								</span>
							</span>

							<!-- ERRORS === REMOVE === THIS WONT NOW SHOW IF YOU CANT AFFORD THE BLDG - THERS NO BUTTON ANYWAY -->
							<!-- UNABLE TO AFFORD -->
							<span
								v-if="model.unableToAffordBuilding(controller.currentPlayerIndex(), store.context.countryBuildingBeingPlaced)"
								class="redText">
								<br />
								You Cannot Afford This Building
							</span>
							<!-- ALREADY HAVE 4 CITIES -->
							<span
								v-if="store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_CITY && controller.currentPlayerObj().cities.length >= 4"
								class="redText">
								<br />
								<br />
								You can only have 4 cities
							</span>
						</span>
					</div>
				</div>
				<div v-else-if="store.context.needToPlaceSecondFisheryHex" id="actionsContainer" class="countryPhase">
					<br />
					<br />
					<b>Place The Second Fishery Hex</b>
				</div>
			</template>
			<template v-else>
				<div class="generalActions countryPhase">
					<br />
					<br />
					<br />
					No More Cart Shops
				</div>
			</template>
		</template>
		<!-- STORE GOODS -->
		<template v-if="store.gameflow.phase === rf.PHASE_STORE_GOODS">
			<div class="generalActions">Store goods in your cities</div>
		</template>
		<!-- HARVEST -->
		<template
			v-else-if="store.gameflow.phase === rf.PHASE_HARVEST || store.gameflow.phase === rf.PRE_PHASE_HARVEST">
			<div id="generalActions">
				<b>Harvest your resources</b>

				<br />
				<template v-if="store.context.hexesToHighlight.length > 0">
					<br />
					<b>Harvest resources before ending your turn</b>
				</template>

				<br />
				<!-- END PRE_PHASE_HARVEST-->
				<template v-if="store.gameflow.phase === rf.PRE_PHASE_HARVEST">
					<button @click="model.resetPreMove" class="actionsLineButton">Cancel Pre Move</button>
					<button
						v-if="store.players[personal.pov].preMoves.some((move) => move.phase === rf.PRE_PHASE_HARVEST)"
						@click="IO.savePreTurn(rf.PRE_PHASE_HARVEST, [-999])" class="actionsLineButton">Delete Pre
						Move</button>
				</template>

				<template
					v-if="store.gameflow.phase === rf.PRE_PHASE_HARVEST && store.context.hexesToHighlight.length === 0">
					<button @click="IO.savePreTurn(rf.PRE_PHASE_HARVEST, [...store.context.historyObj])"
						class="actionsLineButton">Save Harvest Turn</button>
				</template>
			</div>
		</template>
		<!-- EXPLORE -->
		<template
			v-else-if="store.gameflow.phase === rf.PHASE_EXPLORE || store.gameflow.phase === rf.PRE_PHASE_EXPLORE">
			<div v-if="store.context.selectedExplorerRes === rf.RES_NONE" class="generalActions explorerActionsDiv">
				<br />
				You may select an Explorer Token in your Zone of Control, or Skip Exploration
				<span
					v-if="store.context.action === rf.ACT_CONFIRM_END_TURN && city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_EXPLORER, true)"
					class="cautionSpan">
					<br />
					CAUTION: You have not used your Explorer
				</span>
				<span v-else class="cautionSpan">
					<br />
					Caution: Selecting an Explorer is irreversible and will end your turn immediately
				</span>
				<br />
				Possible Resources:
				<img v-for="(res, idx) in [...store.mapData.availableExplorerResources].sort((a, b) => a - b)"
					:key="idx" class="possibleExplorerRes" :src="view.getImage('res_' + String(res))" />
				<!-- END PRE_PHASE_EXPLORE-->
				<template v-if="store.gameflow.phase === rf.PRE_PHASE_EXPLORE">
					<br />
					<button @click="model.resetPreMove" class="actionsLineButton">Cancel Pre Move</button>
					<button
						v-if="store.players[personal.pov].preMoves.some((move) => move.phase === rf.PRE_PHASE_EXPLORE)"
						@click="IO.savePreTurn(rf.PRE_PHASE_EXPLORE, [-999])" class="actionsLineButton">Delete Pre
						Move</button>
					<button @click="IO.savePreTurn(rf.PRE_PHASE_EXPLORE, [-1])" class="actionsLineButton">Choose not to
						Explore</button>
				</template>
			</div>
			<div v-else-if="store.context.selectedExplorerRes !== rf.RES_NONE"
				class="generalActions explorerActionsDiv">
				Your Explorer revealed:
				<img class="newBuildingCostRes"
					:src="view.getImage('res_' + String(store.context.selectedExplorerRes))" />
				<span v-if="rf.RES_FOODS.includes(store.context.selectedExplorerRes)">
					<br />
					Famine level increases
				</span>
			</div>
		</template>
		<!-- FAMINE -->
		<template v-else-if="store.gameflow.phase === rf.PHASE_FAMINE">
			<div class="generalActions">Place Graves in your Cities</div>
		</template>
		<!-- POLLUTION -->
		<template v-else-if="store.gameflow.phase === rf.PHASE_POLLUTION">
			<div class="generalActions" v-if="store.context.gravesLeftToPlace > 0">
				No space for pollution in your Zone of Control - Pollution converted to graves
				<br />
				Graves Left to Place: {{ store.context.gravesLeftToPlace }}
			</div>
			<div class="generalActions" v-else>
				Remaining Pollution: {{ store.context.pollutionLeftToPlace }}
				<button v-if="IO.DEBUG_USERS.includes(personal.name)" @click="store.context.pollutionLeftToPlace = 0"
					class="actionsLineButton">CHEAT: Remove pollution</button>
			</div>
		</template>

		<!-- PRE PHASE POLLUTION -->
		<template v-else-if="store.gameflow.phase === rf.PRE_PHASE_POLLUTION">
			<div class="generalActions">
				Remaining Pollution: {{ store.context.pollutionLeftToPlace }}<br />
				<span v-if="store.context.gameflowPhase <= rf.PHASE_HARVEST">
					<br />
					NOTE: As harvest is not yet complete, you will be allowed to pre-place pollution under Fisheries and
					Wood resources<br />
					If these spaces are not free during the pollution phase, you will need to do your move again
					<br />
				</span>
				<button @click="model.resetPreMove" class="actionsLineButton">Cancel Pre Move</button>
				<button
					v-if="store.players[personal.pov].preMoves.some((move) => move.phase === rf.PRE_PHASE_POLLUTION)"
					@click="IO.savePreTurn(rf.PRE_PHASE_POLLUTION, [-999])" class="actionsLineButton">Delete Pre
					Move</button>
				<button v-if="store.context.pollutionLeftToPlace === 0"
					@click="IO.savePreTurn(rf.PRE_PHASE_POLLUTION, [...store.context.historyObj])"
					class="actionsLineButton">Save Pollution Turn</button>
			</div>
		</template>

		<!-- MULTI-PHASE ITEMS -->
		<!-- GENERAL RESET / GO TO TURN END CONFIRMATION -->
		<div
			v-if="rf.COUNTRY_PHASES.includes(store.gameflow.phase) && personal.canPlay() && store.context.action !== rf.ACT_CONFIRM_END_TURN">
			<div class="inlineDiv"
				v-if="store.gameflow.phase === rf.PHASE_FIRST_CITY || (store.gameflow.phase === rf.PHASE_POLLUTION && store.context.pollutionLeftToPlace > 0)">
				<button @click="toggleHexSelection" class="actionsLineButton">Toggle Hex Outline</button>
			</div>
			<div class="inlineDiv">
				<button @click="model.resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
			</div>
			<div class="inlineDiv">
				<button
					v-if="store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING && !store.context.needToPlaceSecondFisheryHex"
					@click="model.undoLastAction" class="actionsLineButton"
					:disabled="store.undoPoints.length === 0">Undo</button>
			</div>
			<div class="inlineDiv">
				<button v-if="controller.canEndPlayerTurn()" class="actionsLineButton" @click="localEndTurn">
					<span
						v-if="store.gameflow.phase === rf.PHASE_POLLUTION || store.gameflow.phase === rf.PHASE_HARVEST">End
						Turn</span>
					<span v-else-if="store.gameflow.phase === rf.PHASE_EXPLORE">Skip Exploration</span>
					<span v-else>Finish Actions</span>
				</button>
			</div>
			<PromiseArea v-if="personal.pov >= 0" :playerIndexProp="personal.pov" />
		</div>

		<!-- CONFIRM END TURN -->
		<div
			v-if="rf.COUNTRY_PHASES.includes(store.gameflow.phase) && personal.canPlay() && store.context.action === rf.ACT_CONFIRM_END_TURN">
			<template v-if="store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING">
				<template v-for="(entry, idx) in getCountryEndTurnWarnings()" :key="idx">
					<span class="endOfTurnIssueSpan" :style="{
						color: entry[0],
					}">
						{{ entry[1] }}
					</span>
					<br />
				</template>
			</template>

			<div class="inlineDiv">
				<button @click="model.resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
			</div>
			<div class="inlineDiv">
				<button v-if="store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING" @click="store.clearVars()"
					class="actionsLineButton">Back To Country</button>
			</div>

			<div class="inlineDiv">
				<button class="actionsLineButton" @click="localEndTurn">End Turn</button>
			</div>
		</div>
	</template>
	<div v-if="store.topMenuViews.showLoader" class="fLoadingBar">
		<img :src="view.getImage('loading-bar-black')" />
	</div>
</template>

<style scoped>
.inlineDiv {
	display: inline-block;
}

#actionsContainer {
	display: flex;
	/* Use flexbox */
	width: fit-content;
	margin: 0 auto;
	min-height: 166px;
}

.expertPanel {
	border: 2px solid darkblue;
	background-color: lightsalmon;
	font-weight: bolder;
	width: fit-content;
	height: fit-content;
	padding: 10px;
	margin: auto;
}

.countryPhase {
	min-height: 140px;
}

.generalActions {
	font-weight: bolder;
}

.explorerActionsDiv {
	min-height: 75px;
}

#actionSelectionDiv {
	width: fit-content;
	/* Set a fixed width for the left div */
	border: 2px solid black;
	padding: 5px;
	font-weight: bolder;
}

#selectedActionDiv {
	flex: 1;
	/* Allow the right div to grow and fill remaining space */
	overflow: hidden;
	/* Hide content that exceeds the available space */
	white-space: nowrap;
	/* Prevent content from wrapping */
	border: 2px solid black;
	padding: 5px;
	min-width: 348px;
}

.newBuildingCostRes {
	border: 2px solid black;
	width: 50px;
	height: 50px;
	vertical-align: middle;
	border: 1px solid black;
}

.possibleExplorerRes {
	border: 2px solid black;
	width: 50px;
	height: 50px;
	vertical-align: middle;
	border: 1px solid black;
	margin-right: 4px;
}

.resSelectable {
	border-color: yellow;
	border-width: 3px;
}

.resSelectable:hover {
	border-color: lightgreen;
	border-width: 3px;
}

.selectedRes {
	border-color: lightgreen !important;
}

.redText {
	font-weight: bolder;
	color: red;
}

.greenText {
	color: green;
}

.cautionSpan {
	color: orangered;
	font-size: 20px;
	font-weight: bolder;
	/*text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;*/
}

.endOfTurnIssueSpan {
	font-size: 20px;
	font-weight: bolder;
}

.fLoadingBar {
	width: 100%;
	text-align: center;
}

#gameEndDiv {
	font-size: 30px;
	font-weight: bold;
	margin-top: 10px;
}

.playerScoreSummaryDiv {
	border: 1px solid black;
	display: inline-block;
	font-size: 30px;
	margin: 4px;
	padding: 0px;
}

.explorerRevealDiv {
	border: 5px solid black;
	width: fit-content;
	margin: auto;
	margin-top: 10px;
	margin-bottom: 10px;
	padding: 5px;
}

.winningSaintImage {
	width: 128px;
	height: 232px;
	vertical-align: middle;
	margin-right: 10px;
	margin-left: 10px;
}

.intro_items_list_div {
	width: fit-content;
	text-align: left;
	margin: 9px auto;
	font-weight: bolder;
	font-size: 18px;
}

.helpImage {
	display: inline;
	vertical-align: middle;
}

.clickPlayers {
	width: 300px;
}

.helpCity {
	margin-top: 10px;
	margin-left: 250px;
	width: 300px;
}

.greenArea {
	background-color: lightgreen;
}

.purpleArea {
	background-color: darkorchid;
	color: white;
}

.blueArea {
	background-color: rgb(4, 12, 255);
	color: white;
}

.infoIcon {
	width: 38px;
	height: 38px;
	border: #eee;
	border-radius: 5px;
	margin-left: 0px;
	cursor: pointer;
	text-align: center;
	background-color: black;
}

.storagePreMoveRes {
	width: 40px;
	height: 40px;
	vertical-align: middle;
	border: 1px solid black;
	margin-right: 4px;
}
</style>
