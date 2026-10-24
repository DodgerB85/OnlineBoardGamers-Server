<script setup>
import TurnNudge from "./utils/TurnNudge.vue"
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
import { useI18n } from "vue-i18n"

import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()

const store = useModelStore()

const { t } = useI18n()

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
	if (personal.pov < 0) return t("mapActionArea.none")
	const target = currentKickoutTarget()
	let voters = "None"
	for (const voter in store.kickoutVotesData) {
		const vote = store.kickoutVotesData[voter]
		if (Array.isArray(vote) && vote[0] === target) {
			if (voters === "None") voters = String(voter)
			else voters += ", " + voter
		}
	}
	return voters === "None" ? t("mapActionArea.none") : voters
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
	if (isFood) return t("mapActionArea.oneFood")
	if (city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_PHILOSOPHY)) return t("mapActionArea.oneLux")
	return t("mapActionArea.oneDoubleLux")
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
	if (city.getCartShopStatus(controller.currentPlayerIndex())[0] > 0) ret.push(["orange", t("mapActionArea.unusedCartShops")])

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
			<i18n-t keypath="mapActionArea.loggedOutPrompt" tag="span" scope="global">
				<template #register><a href="/register">{{ $t("mapActionArea.register") }}</a></template>
				<template #login><a href="/login">{{ $t("mapActionArea.login") }}</a></template>
			</i18n-t>
			<br />
		</div>
		<br />
	</template>

	<!-- EXPERT PANEL - HARVEST, EXPLORE, STORE - ONLY AFTER YOU HAVE MADE A COUTNRYSIDE TURN-->
	<template v-if="shouldShowAnyPreTurnOption()">
		<br />
		<div class="expertPanel">
			<i18n-t keypath="mapActionArea.expertOptions" tag="span" scope="global">
				<template #title><b>{{ $t("mapActionArea.expertOptionsTitle") }}</b></template>
			</i18n-t>
			<hr />
			<template v-if="shouldShowPreStorageOption() >= 0">
				<template v-if="shouldShowPreStorageOption() === 0">
					<button @click="localActionPreStoreTurn" class="actionsLineButton">
						<span v-if="getStoragePreMove().length === 0">{{ $t("mapActionArea.actionStoreTurn") }}</span>
						<span v-else>{{ $t("mapActionArea.changeStoreTurn") }}</span>
					</button>
					<template v-if="getStoragePreMove().length > 0">
						{{ $t("mapActionArea.store") }}
						<img v-for="(res, idx) in flatmapResourceArray(getStoragePreMove())" :key="idx"
							class="storagePreMoveRes" :src="view.getImage('res_' + String(res))" />
					</template>
					<template v-else>{{ $t("mapActionArea.noData") }}</template>
				</template>
				<template v-else>
					<span v-if="shouldShowPreStorageOption() === 1">{{ $t("mapActionArea.unlimitedStorage") }}</span>
					<span v-else-if="shouldShowPreStorageOption() === 2">{{ $t("mapActionArea.noResourcesToStore") }}</span>
					<span v-else-if="shouldShowPreStorageOption() === 3">{{ $t("mapActionArea.enoughStorage") }}</span>
					<span v-else-if="shouldShowPreStorageOption() === 4">{{ $t("mapActionArea.noStorage") }}</span>
				</template>
				<hr />
			</template>

			<template v-if="shouldShowPreHarvestOption() >= 0">
				<template v-if="shouldShowPreHarvestOption() === 0">
					<button @click="localActionPreHarvestTurn" class="actionsLineButton">
						<span v-if="getHarvestPreMove() === -1">{{ $t("mapActionArea.actionHarvestTurn") }}</span>
						<span v-else>{{ $t("mapActionArea.changeHarvestTurn") }}</span>
					</button>
					<template v-if="getHarvestPreMove() >= 0">{{ $t("mapActionArea.harvestingPreset") }}</template>
					<template v-else>{{ $t("mapActionArea.noData") }}</template>
				</template>
				<template v-else>
					<span v-if="shouldShowPreHarvestOption() === 1">{{ $t("mapActionArea.noHarvestDecisions") }}</span>
					<span v-if="shouldShowPreHarvestOption() === 2">{{ $t("mapActionArea.finishCountrysideBeforeHarvest") }}</span>
				</template>
				<hr />
			</template>

			<template v-if="shouldShowPreExploreOption() >= 0">
				<template v-if="shouldShowPreExploreOption() === 0">
					<button @click="localActionPreExploreTurn" class="actionsLineButton">
						<span v-if="getExplorerPreMove() === -1">{{ $t("mapActionArea.actionExploreTurn") }}</span>
						<span v-else>{{ $t("mapActionArea.changeExploreTurn") }}</span>
					</button>
					<template v-if="getExplorerPreMove() === 1">{{ $t("mapActionArea.choseToExplore") }}</template>
					<template v-else-if="getExplorerPreMove() === 0">{{ $t("mapActionArea.skipExploration") }}</template>
					<template v-else>{{ $t("mapActionArea.noData") }}</template>
				</template>
				<template v-else>
					<span v-if="shouldShowPreExploreOption() === 1">{{ $t("mapActionArea.noMannedExplorer") }}</span>
					<span v-if="shouldShowPreExploreOption() === 2">{{ $t("mapActionArea.cannotReachExplorerToken") }}</span>
				</template>
				<hr />
			</template>
			<template v-if="shouldShowPreFamineOption() >= 0">
				<template v-if="shouldShowPreFamineOption() === 0">
					<button @click="localActionPreFamineTurn" class="actionsLineButton">
						<span v-if="getFaminePreMove() === -1">{{ $t("mapActionArea.actionFamineTurn") }}</span>
						<span v-else>{{ $t("mapActionArea.changeFamineTurn") }}</span>
					</button>
					<template v-if="getFaminePreMove() >= 0">{{ $t("mapActionArea.gravesPreset") }}</template>
					<template v-else>{{ $t("mapActionArea.noData") }}</template>
					<br />
					<b>{{ $t("mapActionArea.graves") }}</b>
					{{ Math.max(city.getTotalGravesToPlaceForPreTurn(personal.pov)[0] -
						city.getTotalGravesToPlaceForPreTurn(personal.pov)[1], 0) }}
					<span v-if="city.getTotalGravesToPlaceForPreTurn(personal.pov)[1] > 0">- {{
						city.getTotalGravesToPlaceForPreTurn(personal.pov)[0] }}</span>
				</template>
				<template v-else>
					<span v-if="shouldShowPreFamineOption() === 1">{{ $t("mapActionArea.noGravesNoExplorers") }}</span>
					<span v-if="shouldShowPreFamineOption() === 2">{{ $t("mapActionArea.noGravesEvenIfExplorersFindFood") }}</span>
					<span v-if="shouldShowPreFamineOption() === 3">{{ $t("mapActionArea.notEnoughSpaceForGraves") }}</span>
				</template>
				<hr />
			</template>
			<template v-if="shouldShowPrePollutionOption() >= 0">
				<template v-if="shouldShowPrePollutionOption() === 0">
					<button @click="localActionPrePollutionTurn" class="actionsLineButton">
						<span v-if="getPollutionPreMove() === -1">{{ $t("mapActionArea.actionPollutionTurn") }}</span>
						<span v-else>{{ $t("mapActionArea.changePollutionTurn") }}</span>
					</button>
					<template v-if="getPollutionPreMove() >= 0">{{ $t("mapActionArea.pollutionPreset") }}</template>
					<template v-else>{{ $t("mapActionArea.noData") }}</template>
					<br />
					<b>{{ $t("mapActionArea.pollution") }}</b>
					{{ country.getPendingPollution(personal.pov) }}
				</template>
				<template v-else>
					<span v-if="shouldShowPrePollutionOption() === 1">{{ $t("mapActionArea.noPollutionToPlace") }}</span>
					<span v-if="shouldShowPrePollutionOption() === 2">{{ $t("mapActionArea.morePollutionThanFreeHexes") }}</span>
				</template>
				<br />
			</template>
		</div>
	</template>

	<!-- KICKOUT-->
	<template v-if="personal.kickoutRequired > 0 && !personal.canPlay() && store.gameflow.phase !== rf.PHASE_GAME_OVER">
		<div v-if="personal.kickoutRequired == 1" id="kickoutDiv">
			<i18n-t keypath="mapActionArea.playerUsedAllKickoutTime" tag="span" scope="global">
				<template #name><b>{{ controller.currentPlayerObj().name }}</b></template>
			</i18n-t>
			<br />
			<br />
			{{ $t("mapActionArea.remainingFlexTime") }}
			<span id="flexiKickoutTimerSpan">{{ getFlexiKickoutTImerText() }}</span>
			<br />
			<br />
			<i18n-t keypath="mapActionArea.forMoreInfoSeeHelp" tag="span" scope="global">
				<template #help><b><a href="/help/" target="_blank">{{ $t("mapActionArea.help") }}</a></b></template>
			</i18n-t>
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
					<i18n-t keypath="mapActionArea.playerTimedOut" tag="span" scope="global">
						<template #name><b>{{ controller.currentPlayerObj().name }}</b></template>
					</i18n-t>
					<br />
					<i18n-t keypath="mapActionArea.toKickoutPressConfirm" tag="span" scope="global">
						<template #name><b>{{ controller.currentPlayerObj().name }}</b></template>
					</i18n-t>
					<br />
					{{ $t("mapActionArea.gameProceedsNext") }}
					<br />
					<br />
					<i18n-t keypath="mapActionArea.allowMoreTimeReload" tag="span" scope="global">
						<template #name><b>{{ controller.currentPlayerObj().name }}</b></template>
					</i18n-t>
					<br />

					<br />
					<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
					<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("mapActionArea.notNowAllowMoreTime") }}</button></span>
					<span>
						<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t("mapActionArea.keepInGame", { name: controller.currentPlayerObj().name }) }}</button>
					</span>
					<span><button class="actionsLineButton" id="confirmKickoutButton"
							@click="store.context.action = rf.ACT_CONFIRM_KICKOUT">{{ $t("mapActionArea.confirmKickout") }}</button></span>
				</template>
				<template v-if="store.context.action === rf.ACT_CONFIRM_KICKOUT">
					<i18n-t keypath="mapActionArea.permanentlyRemove" tag="span" scope="global">
						<template #name><b>{{ controller.currentPlayerObj().name }}</b></template>
					</i18n-t><br />
					<b>{{ $t("mapActionArea.cannotBeUndone") }}</b><br />
					<br />
					{{ $t("mapActionArea.checkChatAbsence") }}<br />
					{{ $t("mapActionArea.gracePeriodNote") }}

					<br />
					<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
					<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("mapActionArea.notNowAllowMoreTime") }}</button></span>
					<span><button class="actionsLineButton" id="confirmKickoutButton"
							@click="Bot.actionPlayerKickout">{{ $t("mapActionArea.permanentlyKickout", { name: controller.currentPlayerObj().name }) }}</button></span>
				</template>
			</template>
			<template v-else>
				<i18n-t keypath="mapActionArea.playerTimedOut" tag="span" scope="global">
					<template #name><b>{{ controller.currentPlayerObj().name }}</b></template>
				</i18n-t>
				<br />
				<i18n-t keypath="mapActionArea.voteNeededKickout" tag="span" scope="global">
					<template #name><b>{{ controller.currentPlayerObj().name }}</b></template>
				</i18n-t>
				<br />
				{{ $t("mapActionArea.votesLine", { count: kickoutVoteCount(), threshold: store.kickoutVoteThreshold, voters: kickoutVoters() }) }}
				<br />
				<br />
				<span v-if="!myKickoutVote()">
					<template v-if="isLastVoteRequired()">
						<i18n-t keypath="mapActionArea.permanentlyRemove" tag="span" scope="global">
							<template #name><b>{{ controller.currentPlayerObj().name }}</b></template>
						</i18n-t><br />
						<b>{{ $t("mapActionArea.cannotBeUndone") }}</b><br />
						<br />
					</template>
					<button class="actionsLineButton" id="voteKickoutButton"
						@click="Bot.actionPlayerKickout">{{ $t("mapActionArea.voteToKickout", { name: controller.currentPlayerObj().name }) }}</button>
				</span>
				<span v-else>
					<i18n-t keypath="mapActionArea.youHaveVotedKickout" tag="span" scope="global">
						<template #name><b>{{ controller.currentPlayerObj().name }}</b></template>
					</i18n-t>
					<br />
					{{ $t("mapActionArea.kickDirectlyIn", { countdown: soloKickoutCountdown }) }}
				</span>
				<br />
				<br />
				<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
				<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("mapActionArea.notNowAllowMoreTime") }}</button></span>
				<span>
					<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t("mapActionArea.keepInGame", { name: controller.currentPlayerObj().name }) }}</button>
				</span>
			</template>
		</div>
	</template>

	<!-- ALWAYS SHOWS GAME END-->
	<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
		<div id="gameEndDiv">
			{{ $t("mapActionArea.gameOver") }}
			<br />
			<br />
			<!-- LAST MAN STANDING WIN -->
			<template v-if="store.history[store.history.length - 1][3][0] === rf.GAME_WIN_LAST_MAN_STANING">
				{{ $t("mapActionArea.winner") }}
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][1][0]].colour)">{{
							store.players[store.history[store.history.length - 1][3][1][0]].displayName }}</span>
				</div>
				<br />
				<span>{{ $t("mapActionArea.lastManStanding") }}</span>
				<br />
				<span v-if="store.players[store.history[store.history.length - 1][3][1][0]].saint !== rf.SAINT_NONE">
					{{ $t("mapActionArea.winningSaint") }}
					<img class="winningSaintImage"
						:src="view.getImage('saint_' + String(store.players[store.history[store.history.length - 1][3][1][0]].saint))" />
					{{ rf.SAINT_INFO[store.players[store.history[store.history.length - 1][3][1][0]].saint].name }}
				</span>
				<span v-else>{{ $t("mapActionArea.noSaint") }}</span>
				<br />
				<template v-if="store.players[store.history[store.history.length - 1][3][1][0]].name === personal.name">
					<h1>{{ $t("mapActionArea.congratulations") }}</h1>
				</template>
			</template>

			<!-- GAME_WIN_LAST_UNGRAVED WIN -->
			<template v-if="store.history[store.history.length - 1][3][0] === rf.GAME_WIN_LAST_UNGRAVED">
				{{ $t("mapActionArea.winner") }}
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][1][0]].colour)">{{
							store.players[store.history[store.history.length - 1][3][1][0]].displayName }}</span>
				</div>
				<br />
				<span>{{ $t("mapActionArea.graveDodger") }}</span>
				<br />
				<span v-if="store.players[store.history[store.history.length - 1][3][1][0]].saint !== rf.SAINT_NONE">
					{{ $t("mapActionArea.winningSaint") }}
					<img class="winningSaintImage"
						:src="view.getImage('saint_' + String(store.players[store.history[store.history.length - 1][3][1][0]].saint))" />
					{{ rf.SAINT_INFO[store.players[store.history[store.history.length - 1][3][1][0]].saint].name }}
				</span>
				<span v-else>{{ $t("mapActionArea.noSaint") }}</span>
				<br />
				<template v-if="store.players[store.history[store.history.length - 1][3][1][0]].name === personal.name">
					<h1>{{ $t("mapActionArea.congratulations") }}</h1>
				</template>
			</template>

			<!-- SINGLE SAINT WINNER -->
			<template v-if="store.history[store.history.length - 1][3][0] === rf.GAME_WIN_ONLY_SAINT_WINNER">
				{{ $t("mapActionArea.winner") }}
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][1][0]].colour)">{{
							store.players[store.history[store.history.length - 1][3][1][0]].displayName }}</span>
				</div>
				<br />
				<span>{{ $t("mapActionArea.soloSaintlyFulfilment") }}</span>
				<br />
				<span v-if="store.players[store.history[store.history.length - 1][3][1][0]].saint !== rf.SAINT_NONE">
					{{ $t("mapActionArea.winningSaint") }}
					<img class="winningSaintImage"
						:src="view.getImage('saint_' + String(store.players[store.history[store.history.length - 1][3][1][0]].saint))" />
					{{ rf.SAINT_INFO[store.players[store.history[store.history.length - 1][3][1][0]].saint].name }}
				</span>
				<span v-else>{{ $t("mapActionArea.noSaint") }}</span>
				<br />
				<template v-if="store.players[store.history[store.history.length - 1][3][1][0]].name === personal.name">
					<h1>{{ $t("mapActionArea.congratulations") }}</h1>
				</template>
			</template>

			<!-- SINGLE POLLUTION  WINNER -->
			<template v-if="store.history[store.history.length - 1][3][0] === rf.GAME_WIN_ONLY_POLLUTION_WINNER">
				{{ $t("mapActionArea.winner") }}
				<div class="playerScoreSummaryDiv">
					<span class="mainEntryPlayerNewTurn"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][1][0]].colour)">{{
							store.players[store.history[store.history.length - 1][3][1][0]].displayName }}</span>
				</div>
				<br />
				<span>{{ $t("mapActionArea.mostUnpollutedHexes") }}</span>
				<br />
				<span v-if="store.players[store.history[store.history.length - 1][3][1][0]].saint !== rf.SAINT_NONE">
					{{ $t("mapActionArea.winningSaint") }}
					<img class="winningSaintImage"
						:src="view.getImage('saint_' + String(store.players[store.history[store.history.length - 1][3][1][0]].saint))" />
					{{ rf.SAINT_INFO[store.players[store.history[store.history.length - 1][3][1][0]].saint].name }}
				</span>
				<span v-else>{{ $t("mapActionArea.noSaint") }}</span>
				<br />
				<template v-if="store.players[store.history[store.history.length - 1][3][1][0]].name === personal.name">
					<h1>{{ $t("mapActionArea.congratulations") }}</h1>
				</template>
				{{ store.history[store.history.length - 1][3][2].length > 1 ? $t("mapActionArea.runnersUp") : $t("mapActionArea.runnerUp") }}
				<div class="playerScoreSummaryDiv"
					v-for="(playerIndex, idx) in store.history[store.history.length - 1][3][2]" :key="idx">
					<span class="mainEntryPlayerNewTurn"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{
							store.players[playerIndex].displayName }}</span>
				</div>
			</template>

			<!-- MULTI POLLUTION WINNER -->
			<template v-if="store.history[store.history.length - 1][3][0] === rf.GAME_WIN_TIE">
				{{ $t("mapActionArea.winners") }}
				<div class="playerScoreSummaryDiv"
					v-for="(playerIndex, idx) in store.history[store.history.length - 1][3][1]" :key="idx">
					<span class="mainEntryPlayerNewTurn"
						:class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{
							store.players[playerIndex].displayName }}</span>
				</div>
				<br />
				<span>{{ $t("mapActionArea.jointMostUnpollutedHexes") }}</span>
				<br />
				{{ $t("mapActionArea.winningSaints") }}
				<template v-for="(playerIndex, idx) in store.history[store.history.length - 1][3][1]" :key="idx">
					<span v-if="store.players[playerIndex].saint !== rf.SAINT_NONE">
						<img class="winningSaintImage"
							:src="view.getImage('saint_' + String(store.players[playerIndex].saint))" />
						{{ rf.SAINT_INFO[store.players[playerIndex].saint].name }}
					</span>
					<span v-else>{{ $t("mapActionArea.noSaint") }}</span>
				</template>
				<br />
				<template v-if="store.history[store.history.length - 1][3][1].includes(personal.pov)">
					<h1>{{ $t("mapActionArea.congratulations") }}</h1>
				</template>

				<template v-if="store.history[store.history.length - 1][3].length > 2">
					{{ store.history[store.history.length - 1][3][2].length > 1 ? $t("mapActionArea.runnersUp") : $t("mapActionArea.runnerUp") }}
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
			<i18n-t keypath="mapActionArea.fancyARematch" tag="span" scope="global">
				<template #link><a :href="'/createAQYpage/' + String(personal.gameID) + '/'">{{ $t("mapActionArea.rematch") }}</a></template>
			</i18n-t>
			<br />
			<br />
		</div>
	</template>

	<!-- EXPLORER RESULT -->
	<div v-if="store.newlyExplorerResource !== rf.RES_NONE" class="generalActions explorerRevealDiv">
		{{ $t("mapActionArea.explorerRevealed") }}
		<img class="newBuildingCostRes explorer-reveal-res" :src="view.getImage('res_' + String(store.newlyExplorerResource))" />
		<br />
		<span v-if="store.newlyExplorerResource === rf.RES_WINE">{{ $t("mapActionArea.famineRemainsAt", { level: store.famineLevel }) }}</span>
		<span v-else>{{ $t("mapActionArea.famineIncreasesTo", { level: store.famineLevel }) }}</span>
	</div>

	<!-- ONLY SHOW ACTIONS IF YOU CAN PLAY -->
	<template v-if="personal.canPlay()">
		<!-- TURN 1 INFO -->
		<template
			v-if="store.gameflow.turn === 1 && store.gameflow.phase === rf.PHASE_FIRST_CITY && !store.topMenuViews.showReplay">
			<h2>{{ $t("mapActionArea.welcome") }}</h2>
			<div class="intro_items_list_div">
				{{ $t("mapActionArea.switchViews") }}
				<img :src="view.getImage('clickPlayers')" :alt="$t('mapActionArea.playerBoxesAlt')" class="helpImage clickPlayers" />
				<br />
				<img :src="view.getImage('helpCity')" :alt="$t('mapActionArea.cityHelpAlt')" class="helpImage helpCity" />
				<br />
				<br />
				{{ $t("mapActionArea.duringCityBuilding") }}
				<br />
				<br />
				<span class="greenArea">{{ $t("mapActionArea.greenAreaHelp") }}</span>
				<br />
				<br />
				<span class="purpleArea">{{ $t("mapActionArea.purpleAreaHelp") }}</span>
				<br />
				<br />
				<span class="blueArea">{{ $t("mapActionArea.blueAreaHelp") }}</span>
				<br />
				<br />

				{{ $t("mapActionArea.moveUnusedBuildingsNote") }}
				<br />
				{{ $t("mapActionArea.shortcutNote") }}
				<br />
				{{ $t("mapActionArea.lockInBuildings") }}
				<br />
				{{ $t("mapActionArea.resetTurnToChange") }}
				<br />
				<br />
				<img :src="view.getImage('icon-info')" :alt="$t('mapActionArea.infoAlt')" class="helpImage infoIcon" />
				{{ $t("mapActionArea.infoButtonHelp") }}
				<br />
				<br />
				{{ $t("mapActionArea.dontForgetPreferences") }}
				<a class="linkOther" href="/profileAQY/" target="_blank">{{ $t("mapActionArea.antiquityPreferences") }}</a>
				<br />
				<br />
				{{ $t("mapActionArea.forMoreInfoHelp") }}
				<a class="linkOther" href="/AQY/help/" target="_blank">{{ $t("mapActionArea.antiquityHelp") }}</a>
			</div>
			<br />
		</template>

		<!-- FIRST CITY -->
		<template v-if="store.gameflow.phase === rf.PHASE_FIRST_CITY">
			<div class="generalActions">{{ $t("mapActionArea.placeFirstCity") }}</div>
		</template>
		<!-- CITY BUILDING -->
		<template v-if="store.gameflow.phase === rf.PHASE_CITY_BUILDING">
			<div class="generalActions">{{ $t("mapActionArea.buildYourCities") }}</div>
		</template>
		<!-- COUNTRYSIDE PHASE-->
		<template
			v-else-if="store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING && store.context.action !== rf.ACT_CONFIRM_END_TURN">
			<template
				v-if="store.context.countryCartsLeftToUse > 0 || city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_ALCHEMY, true)">
				<!-- ACTION SELECTION -->
				<div id="actionsContainer" class="countryPhase" v-if="!store.context.needToPlaceSecondFisheryHex">
					<div id="actionSelectionDiv">
						{{ $t("mapActionArea.availableCartShops", { count: city.getCartShopStatus(controller.currentPlayerIndex())[0] }) }}
						<br />
						<button v-if="canBuildBuilding(rf.COUNTRYSIDE_BLDG_WOODCUTTER)" class="actionsLineButton"
							@click="setupCountryBuilding(rf.COUNTRYSIDE_BLDG_WOODCUTTER)">
							{{ $t("mapActionArea.build") }}
							<br />
							{{ $t("mapActionArea.woodcutter") }}
						</button>
						<button v-if="canBuildBuilding(rf.COUNTRYSIDE_BLDG_MINE)" class="actionsLineButton"
							@click="setupCountryBuilding(rf.COUNTRYSIDE_BLDG_MINE)">
							{{ $t("mapActionArea.build") }}
							<br />
							{{ $t("mapActionArea.mine") }}
						</button>
						<button v-if="canBuildBuilding(rf.COUNTRYSIDE_BLDG_FARM)" class="actionsLineButton"
							@click="setupCountryBuilding(rf.COUNTRYSIDE_BLDG_FARM)">
							{{ $t("mapActionArea.build") }}
							<br />
							{{ $t("mapActionArea.farm") }}
						</button>
						<button v-if="canBuildBuilding(rf.COUNTRYSIDE_BLDG_FISHERY)" class="actionsLineButton"
							@click="setupCountryBuilding(rf.COUNTRYSIDE_BLDG_FISHERY)">
							{{ $t("mapActionArea.build") }}
							<br />
							{{ $t("mapActionArea.fishery") }}
						</button>
						<button v-if="canBuildBuilding(rf.COUNTRYSIDE_BLDG_INN)" class="actionsLineButton"
							@click="setupCountryBuilding(rf.COUNTRYSIDE_BLDG_INN)">
							{{ $t("mapActionArea.build") }}
							<br />
							{{ $t("mapActionArea.inn") }}
						</button>
						<button v-if="canBuildBuilding(rf.COUNTRYSIDE_BLDG_CITY)" class="actionsLineButton"
							@click="setupCountryBuilding(rf.COUNTRYSIDE_BLDG_CITY)">
							{{ $t("mapActionArea.build") }}
							<br />
							{{ $t("mapActionArea.city") }}
						</button>
						<button class="actionsLineButton"
							v-if="city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_ALCHEMY, true)"
							@click="clickedUseFacAlch">
							{{ $t("mapActionArea.useFaculty") }}
							<br />
							{{ $t("mapActionArea.ofAlchemy") }}
						</button>
						<br />

						<span v-if="store.context.countryBuildCalculation.hasWood === false">{{ $t("mapActionArea.noWoodForWoodcutterMineFishery") }}</span>
						<span v-if="store.context.countryBuildCalculation.anyWoodHexes === false">{{ $t("mapActionArea.noWoodTilesForWoodcutter") }}</span>
						<span v-if="store.context.countryBuildCalculation.anyMountainHexes === false">{{ $t("mapActionArea.noMountainsForMine") }}</span>
						<span v-if="store.context.countryBuildCalculation.anyFishermanHexes === false">{{ $t("mapActionArea.noHexesForFishery") }}</span>
						<span v-if="store.context.countryBuildCalculation.hasSeedRes === false">{{ $t("mapActionArea.noSeedForFarm") }}</span>
						<span v-if="!store.context.countryBuildCalculation.anyPlainsHexes">{{ $t("mapActionArea.noPlainsForFarm") }}</span>
						<span v-if="store.context.countryBuildCalculation.hasBrewery === false">{{ $t("mapActionArea.noBreweryForInn") }}</span>
						<span v-else-if="!store.context.countryBuildCalculation.hasFoodRes">{{ $t("mapActionArea.noFoodForInn") }}</span>
						<span v-if="store.context.countryBuildCalculation.canAffordCity === false">{{ $t("mapActionArea.noResourcesForCity") }}</span>
						<span v-if="store.context.countryBuildCalculation.noSpaceForCity === true">{{ $t("mapActionArea.noSpaceForCity") }}</span>
						<span v-if="store.context.countryBuildCalculation.hasFacAlchToUse === false">{{ $t("mapActionArea.noFacAlchForPollution") }}</span>
						<br />
						<button class="actionsLineButton" @click="cancelButton">{{ $t("mapActionArea.cancel") }}</button>
					</div>
					<!-- Selected Action -->
					<div id="selectedActionDiv">
						<span v-if="store.context.countryBuildingBeingPlaced === rf.COUNTRSIDE_BLDG_NONE">{{ $t("mapActionArea.selectBuildingToPlace") }}</span>
						<span v-else>
							<!-- BUILDING TYPE -->
							{{ $t("mapActionArea.building") }}
							<b>{{ rf.COUNTRYSIDE_BLDG_NAMES[store.context.countryBuildingBeingPlaced] }}</b>
							<br />
							<!-- Woodcutter / mine / fishery COST -->
							{{ $t("mapActionArea.cost") }}
							<span
								v-if="store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_WOODCUTTER || store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_MINE || store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FISHERY">
								<img class="newBuildingCostRes" :src="view.getImage('res_0')" />
							</span>
							<span v-else-if="store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FARM">
								<b>{{ $t("mapActionArea.oneSeedGood") }}</b>
								<span
									v-if="city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_BIOLOGY, true)"
									class="greenText">
									<br />
									<b>{{ $t("mapActionArea.freeSeedFromBiology") }}</b>
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
								{{ $t("mapActionArea.mineType") }}
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
									<b>{{ $t("mapActionArea.noAvailableMountains") }}</b>
								</span>
								<span v-else>
									<b>
										{{ $t("mapActionArea.mountainRangesUnavailablePart1") }}
										<br />
										{{ $t("mapActionArea.mountainRangesUnavailablePart2") }}
									</b>
								</span>
							</span>
							<!-- SET FARM FROM SEED -->
							<span v-if="store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_FARM">
								<br />
								<template
									v-if="city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_BIOLOGY, true)">
									<span class="greenText"><b>&nbsp;&nbsp;&nbsp;{{ $t("mapActionArea.freeSeed") }}</b></span>
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
								{{ $t("mapActionArea.storedSeed") }}
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
								{{ $t("mapActionArea.fisheryType") }}
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
									{{ $t("mapActionArea.foodCost") }}
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
									{{ $t("mapActionArea.luxCost") }}
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
								{{ $t("mapActionArea.cannotAffordBuilding") }}
							</span>
							<!-- ALREADY HAVE 4 CITIES -->
							<span
								v-if="store.context.countryBuildingBeingPlaced === rf.COUNTRYSIDE_BLDG_CITY && controller.currentPlayerObj().cities.length >= 4"
								class="redText">
								<br />
								<br />
								{{ $t("mapActionArea.onlyFourCities") }}
							</span>
						</span>
					</div>
				</div>
				<div v-else-if="store.context.needToPlaceSecondFisheryHex" id="actionsContainer" class="countryPhase">
					<br />
					<br />
					<b>{{ $t("mapActionArea.placeSecondFisheryHex") }}</b>
				</div>
			</template>
			<template v-else>
				<div class="generalActions countryPhase">
					<br />
					<br />
					<br />
					{{ $t("mapActionArea.noMoreCartShops") }}
				</div>
			</template>
		</template>
		<!-- STORE GOODS -->
		<template v-if="store.gameflow.phase === rf.PHASE_STORE_GOODS">
			<div class="generalActions">{{ $t("mapActionArea.storeGoodsInCities") }}</div>
		</template>
		<!-- HARVEST -->
		<template
			v-else-if="store.gameflow.phase === rf.PHASE_HARVEST || store.gameflow.phase === rf.PRE_PHASE_HARVEST">
			<div id="generalActions">
				<b>{{ $t("mapActionArea.harvestYourResources") }}</b>

				<br />
				<template v-if="store.context.hexesToHighlight.length > 0">
					<br />
					<b>{{ $t("mapActionArea.harvestBeforeEndingTurn") }}</b>
				</template>

				<br />
				<!-- END PRE_PHASE_HARVEST-->
				<template v-if="store.gameflow.phase === rf.PRE_PHASE_HARVEST">
					<button @click="model.resetPreMove" class="actionsLineButton">{{ $t("mapActionArea.cancelPreMove") }}</button>
					<button
						v-if="store.players[personal.pov].preMoves.some((move) => move.phase === rf.PRE_PHASE_HARVEST)"
						@click="IO.savePreTurn(rf.PRE_PHASE_HARVEST, [-999])" class="actionsLineButton">{{ $t("mapActionArea.deletePreMove") }}</button>
				</template>

				<template
					v-if="store.gameflow.phase === rf.PRE_PHASE_HARVEST && store.context.hexesToHighlight.length === 0">
					<button @click="IO.savePreTurn(rf.PRE_PHASE_HARVEST, [...store.context.historyObj])"
						class="actionsLineButton">{{ $t("mapActionArea.saveHarvestTurn") }}</button>
				</template>
			</div>
		</template>
		<!-- EXPLORE -->
		<template
			v-else-if="store.gameflow.phase === rf.PHASE_EXPLORE || store.gameflow.phase === rf.PRE_PHASE_EXPLORE">
			<div v-if="store.context.selectedExplorerRes === rf.RES_NONE" class="generalActions explorerActionsDiv">
				<br />
				{{ $t("mapActionArea.selectExplorerOrSkip") }}
				<span
					v-if="store.context.action === rf.ACT_CONFIRM_END_TURN && city.hasWorkingUniqueBuilding(controller.currentPlayerIndex(), rf.BLDG_EXPLORER, true)"
					class="cautionSpan">
					<br />
					{{ $t("mapActionArea.cautionExplorerNotUsed") }}
				</span>
				<span v-else class="cautionSpan">
					<br />
					{{ $t("mapActionArea.cautionExplorerIrreversible") }}
				</span>
				<br />
				{{ $t("mapActionArea.possibleResources") }}
				<img v-for="(res, idx) in [...store.mapData.availableExplorerResources].sort((a, b) => a - b)"
					:key="idx" class="possibleExplorerRes" :src="view.getImage('res_' + String(res))" />
				<!-- END PRE_PHASE_EXPLORE-->
				<template v-if="store.gameflow.phase === rf.PRE_PHASE_EXPLORE">
					<br />
					<button @click="model.resetPreMove" class="actionsLineButton">{{ $t("mapActionArea.cancelPreMove") }}</button>
					<button
						v-if="store.players[personal.pov].preMoves.some((move) => move.phase === rf.PRE_PHASE_EXPLORE)"
						@click="IO.savePreTurn(rf.PRE_PHASE_EXPLORE, [-999])" class="actionsLineButton">{{ $t("mapActionArea.deletePreMove") }}</button>
					<button @click="IO.savePreTurn(rf.PRE_PHASE_EXPLORE, [-1])" class="actionsLineButton">{{ $t("mapActionArea.chooseNotToExplore") }}</button>
				</template>
			</div>
			<div v-else-if="store.context.selectedExplorerRes !== rf.RES_NONE"
				class="generalActions explorerActionsDiv">
				{{ $t("mapActionArea.yourExplorerRevealed") }}
				<img class="newBuildingCostRes"
					:src="view.getImage('res_' + String(store.context.selectedExplorerRes))" />
				<span v-if="rf.RES_FOODS.includes(store.context.selectedExplorerRes)">
					<br />
					{{ $t("mapActionArea.famineLevelIncreases") }}
				</span>
			</div>
		</template>
		<!-- FAMINE -->
		<template v-else-if="store.gameflow.phase === rf.PHASE_FAMINE">
			<div class="generalActions">{{ $t("mapActionArea.placeGravesInCities") }}</div>
		</template>
		<!-- POLLUTION -->
		<template v-else-if="store.gameflow.phase === rf.PHASE_POLLUTION">
			<div class="generalActions" v-if="store.context.gravesLeftToPlace > 0">
				{{ $t("mapActionArea.noSpaceForPollution") }}
				<br />
				{{ $t("mapActionArea.gravesLeftToPlace", { count: store.context.gravesLeftToPlace }) }}
			</div>
			<div class="generalActions" v-else>
				{{ $t("mapActionArea.remainingPollution", { count: store.context.pollutionLeftToPlace }) }}
				<button v-if="IO.DEBUG_USERS.includes(personal.name)" @click="store.context.pollutionLeftToPlace = 0"
					class="actionsLineButton">CHEAT: Remove pollution</button>
			</div>
		</template>

		<!-- PRE PHASE POLLUTION -->
		<template v-else-if="store.gameflow.phase === rf.PRE_PHASE_POLLUTION">
			<div class="generalActions">
				{{ $t("mapActionArea.remainingPollution", { count: store.context.pollutionLeftToPlace }) }}<br />
				<span v-if="store.context.gameflowPhase <= rf.PHASE_HARVEST">
					<br />
					{{ $t("mapActionArea.prePollutionNoteHarvest") }}<br />
					{{ $t("mapActionArea.prePollutionNoteSpaces") }}
					<br />
				</span>
				<button @click="model.resetPreMove" class="actionsLineButton">{{ $t("mapActionArea.cancelPreMove") }}</button>
				<button
					v-if="store.players[personal.pov].preMoves.some((move) => move.phase === rf.PRE_PHASE_POLLUTION)"
					@click="IO.savePreTurn(rf.PRE_PHASE_POLLUTION, [-999])" class="actionsLineButton">{{ $t("mapActionArea.deletePreMove") }}</button>
				<button v-if="store.context.pollutionLeftToPlace === 0"
					@click="IO.savePreTurn(rf.PRE_PHASE_POLLUTION, [...store.context.historyObj])"
					class="actionsLineButton">{{ $t("mapActionArea.savePollutionTurn") }}</button>
			</div>
		</template>

		<!-- MULTI-PHASE ITEMS -->
		<!-- GENERAL RESET / GO TO TURN END CONFIRMATION -->
		<div
			v-if="rf.COUNTRY_PHASES.includes(store.gameflow.phase) && personal.canPlay() && store.context.action !== rf.ACT_CONFIRM_END_TURN">
			<div class="inlineDiv"
				v-if="store.gameflow.phase === rf.PHASE_FIRST_CITY || (store.gameflow.phase === rf.PHASE_POLLUTION && store.context.pollutionLeftToPlace > 0)">
				<button @click="toggleHexSelection" class="actionsLineButton">{{ $t("mapActionArea.toggleHexOutline") }}</button>
			</div>
			<div class="inlineDiv">
				<button @click="model.resetWholeTurn" class="actionsLineButton">{{ $t("mapActionArea.resetWholeTurn") }}</button>
			</div>
			<div class="inlineDiv">
				<button
					v-if="store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING && !store.context.needToPlaceSecondFisheryHex"
					@click="model.undoLastAction" class="actionsLineButton"
					:disabled="store.undoPoints.length === 0" :title="$t('aqyUi.hotkeys.undo')">{{ $t("mapActionArea.undo") }}</button>
			</div>
			<div class="inlineDiv">
				<button v-if="controller.canEndPlayerTurn()" id="endTurnButton" class="actionsLineButton" @click="localEndTurn" :title="$t('aqyUi.hotkeys.endTurn')">
					<span
						v-if="store.gameflow.phase === rf.PHASE_POLLUTION || store.gameflow.phase === rf.PHASE_HARVEST">{{ $t("mapActionArea.endTurn") }}</span>
					<span v-else-if="store.gameflow.phase === rf.PHASE_EXPLORE">{{ $t("mapActionArea.skipExplorationAction") }}</span>
					<span v-else>{{ $t("mapActionArea.finishActions") }}</span>
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
				<button @click="model.resetWholeTurn" class="actionsLineButton">{{ $t("mapActionArea.resetWholeTurn") }}</button>
			</div>
			<div class="inlineDiv">
				<button v-if="store.gameflow.phase === rf.PHASE_COUNTRYSIDE_BUILDING" @click="store.clearVars()"
					class="actionsLineButton">{{ $t("mapActionArea.backToCountry") }}</button>
			</div>

			<div class="inlineDiv">
				<button id="endTurnButton" class="actionsLineButton" @click="localEndTurn" :title="$t('aqyUi.hotkeys.endTurn')">{{ $t("mapActionArea.endTurn") }}</button>
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

.explorer-reveal-res {
	animation: explorer-reveal 0.25s ease-out;
}

@keyframes explorer-reveal {
	0% {
		transform: rotateY(90deg) scale(0.8);
		opacity: 0;
	}
	100% {
		transform: rotateY(0deg) scale(1);
		opacity: 1;
	}
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
