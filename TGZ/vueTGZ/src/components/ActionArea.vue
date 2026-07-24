<script setup>
import * as rf from "../js/TGZreference"
import * as map from "../js/TGZmap"
import * as view from "../js/TGZview"
import * as model from "../js/TGZmodel"
import * as funcs from "../js/TGZfuncs"
import * as controller from "../js/TGZcontroller"
import * as Bot from "../js/TGZbot"
import * as IO from "../js/TGZ_IO"

import { ref, computed, watch } from "vue"

import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/TGZpersonal.js"
const personal = usePersonalStore()

const autoPass = ref(window.initData.autoPass || false)
const confirmTournamentReplacement = ref(false)

// --- Smooth Rotation ---
const currentDegrees = ref(store.context.itemBeingAddedRotation * 90)

// Re-sync whenever rotation changes externally (e.g., when highlight squares are added)
watch(
	() => store.context.itemBeingAddedRotation,
	(newRotation) => {
		currentDegrees.value = newRotation * 90
	}
)

const rotationStyle = computed(() => {
	return {
		transform: `rotate(${currentDegrees.value}deg)`,
		transition: "transform 0.3s ease-in-out",
	}
})
// --- End Smooth Rotation ---

function rotateNewTile(dir) {
	if (!rf.ROTATABLE_TILES.includes(store.context.itemBeingAdded)) return
	// Remove ghosts
	let ghostDivs = document.getElementsByClassName("ghostDiv")
	let ghostImgs = document.getElementsByClassName("ghostImg")
	for (let i = 0; i < ghostDivs.length; i++) ghostDivs[i].style.display = "none"
	for (let i = 0; i < ghostImgs.length; i++) ghostImgs[i].style.display = "none"
	store.topMenuViews.currentGhostIndex = -1

	store.context.itemBeingAddedRotation += dir
	if (store.context.itemBeingAddedRotation === 2) store.context.itemBeingAddedRotation = 0
	else if (store.context.itemBeingAddedRotation === -1) store.context.itemBeingAddedRotation = 1
	currentDegrees.value = store.context.itemBeingAddedRotation * 90
	store.context.indexesToHighlightClick.splice(0)
	if (store.context.action === rf.ACT_BUILD_WATER) store.context.indexesToHighlightClick = map.getSpacesForResource()
	else if (store.context.action === rf.ACT_BUILD_PRI_CRAFTSMAN) store.context.indexesToHighlightClick = map.getAllowedIndexesToPlacePriCraftsman(store.context.itemBeingAdded, store.context.range, store.context.itemBeingAddedRotation)[0]
	else if (store.context.action === rf.ACT_BUILD_SEC_CRAFTSMAN) store.context.indexesToHighlightClick = map.getAllowedIndexesToPlaceSecCraftsman(store.context.itemBeingAdded, store.context.range, store.context.itemBeingAddedRotation)[0]
}

function resetWholePlayerTurn() {
	store.clearVars()

	funcs.importModel(store.wholeTurnResetData)
	store.resetTurnVars()
	controller.startPlayerTurn()
}
function localEndPlayerTurn() {
	controller.endPlayerTurn()
}

function getBidRange() {
	let possibleBids = []
	let maxCows = controller.currentPlayerObj().cows
	if (model.eleguaAvailable()) maxCows += 3
	for (let i = store.ongoingVars.currentBid + 1; i <= maxCows; i++) possibleBids.push(i)
	let res = []
	// Pass
	res.push([0, "Pass (" + String(getCurrentCows(0)) + " cows for actions)"])
	for (let i = 0; i < possibleBids.length; i++) {
		res.push([possibleBids[i], "" + String(possibleBids[i]) + (model.eleguaAvailable() ? " (Cost after Elegua: " + (possibleBids[i] - 3 <= 0 ? "Free" : String(possibleBids[i] - 3)) + ")" : "") + " (" + String(getCurrentCows(possibleBids[i])) + " cow" + (getCurrentCows(possibleBids[i]) !== 1 ? "s" : "") + " for actions)"])
	}
	return res
}

function getFirstPositionOrdinal() {
	let pos = 0
	for (let i = store.ongoingVars.newTurnOrder.length - 1; i >= 0; i--) {
		if (store.ongoingVars.newTurnOrder[i] === -1) {
			pos = i
			break
		}
	}
	pos++
	if (pos === 1) return "1st"
	if (pos === 2) return "2nd"
	if (pos === 3) return "3rd"
	if (pos === 4) return "4th"
	if (pos === 5) return "5th"
}

function getOrdinal(num) {
	if (num === 2) return "2nd"
	else if (num === 3) return "3rd"
	else if (num === 4) return "4th"
	else if (num === 5) return "5th"
}

function getReason(num, idx) {
	if (num === 1) return (idx !== 0 ? "Next " : "") + "Highest Difference Between VP / VR"
	else if (num === 2) return (idx !== 0 ? "Next " : "") + "Xango wins ties with same difference between VP / VR"
	else if (num === 3) return (idx !== 0 ? "Next " : "") + "Highest Total VP"
	else if (num === 4) return (idx !== 0 ? "Next " : "") + "Earlier in Turn Order"
	else if (num === 5) return "Next in order"
	else return "Unfavourable Famines"
}

function getCurrentCows(bidAmount) {
	let cowCost = bidAmount
	if (model.eleguaAvailable()) cowCost -= 3
	if (cowCost < 0) cowCost = 0
	let cows = controller.currentPlayerObj().cows - cowCost

	let pos = store.gameflow.fullTurnOrder.indexOf(controller.currentPlayerIndex())
	if (model.anyoneHasSHADIPINYI()) pos++
	cows += model.getCowsOnPlaque(pos, bidAmount)

	if (model.has_god(controller.currentPlayerObj(), rf.SHADIPINYI)) cows += model.getCowsOnPlaque(0, bidAmount)
	return cows
}

/* DEFUNCT SCHISM AJA
function confirmFreeAjaPass() {
	model.addHistory(rf.HIST_BID, controller.currentPlayerIndex(), 0, [-3])
	store.context.action = rf.ACT_NONE
}*/

function confirmAjaBid(cowCost) {
	if (!model.has_god(controller.currentPlayerObj(), rf.AJA) || model.get_godData(controller.currentPlayerObj(), rf.AJA)[1] !== 0) return
	model.confirmBid_core(cowCost) // This just deducts cows
	model.update_godData(controller.currentPlayerObj(), rf.AJA, cowCost)

	store.ongoingVars.totalBids -= cowCost

	let pos = 0
	for (let i = store.ongoingVars.newTurnOrder.length - 1; i >= 0; i--) {
		if (store.ongoingVars.newTurnOrder[i] === -1) {
			pos = i
			if (cowCost === 0) store.ongoingVars.newTurnOrder[i] = controller.currentPlayerIndex()
			break
		}
	}

	store.context.action = rf.ACT_NONE
	model.addHistory(rf.HIST_BID, controller.currentPlayerIndex(), 0, [parseInt(cowCost), pos, -1])
}

function confirmBid(cowCost, preventTurnEnd) {
	model.confirmBid_core(cowCost) // This just deducts cows

	let pos = 0
	for (let i = store.ongoingVars.newTurnOrder.length - 1; i >= 0; i--) {
		if (store.ongoingVars.newTurnOrder[i] === -1) {
			pos = i
			if (cowCost === 0) store.ongoingVars.newTurnOrder[i] = controller.currentPlayerIndex()
			break
		}
	}

	store.context.action = rf.ACT_NONE
	let eleguaDiscount = 0
	if (model.eleguaAvailable()) eleguaDiscount = Math.min(cowCost, 3)
	model.addHistory(rf.HIST_BID, controller.currentPlayerIndex(), 0, [parseInt(cowCost), pos, eleguaDiscount])
	//if (cowCost === 0)
	if (!preventTurnEnd) localEndPlayerTurn()
}

function unableToUseSpec(spec) {
	// Not enough cows
	if (spec[1] === 0 && controller.currentPlayerObj().cows < rf.SPEC_COST[spec[0]]) return true
	// Already used
	if (spec[0] === rf.HERD && spec[1] === 6) return true
	if (spec[0] === rf.HERD && controller.currentPlayerObj().cows < 2) return true
	if (spec[0] === rf.NOMADS && spec[1] !== 0) return true
	if (spec[0] === rf.RAIN_CEREMONY && store.context.actionsTaken.includes(rf.ACT_BUILD_WATER)) return true
	if (spec[0] === rf.SHAMAN && store.context.actionsTaken.includes(rf.ACT_BUILD_RES)) return true
	if (spec[0] === rf.BUILDER && spec[1] !== 0) return true
	return false
}

function localSetupUseSingleSpec(spec) {
	if (unableToUseSpec(spec)) return
	model.setupUseSingleSpec(spec)
}

function allowMultipleGods() {
	store.allowMultiple_gods = true
	store.context.action = rf.ACT_NONE
}

function enableAllGods() {
	personal.aidText = true
	store.availablegods = [...rf.EVERYTHING_gods]
	store.context.action = rf.ACT_NONE
}

function cancelCheat() {
	store.context.action = rf.ACT_NONE
}

function cmanDisplayInfo(cman, flag) {
	// Display the option at all. So either has a tech, or one available. Sec must already have a pri
	if (flag === 0) {
		// Has Ogun
		if (model.has_god(controller.currentPlayerObj(), rf.OGUN) && cman === rf.BLACKSMITH_TILE) return true
		// Has Tech
		if (model.hasTechForCman(cman)) return true
		// If no pri from prior turns, then no
		if (rf.SEC_CRAFTSMEN.includes(cman)) {
			for (let i = 0; i < store.players.length; i++) {
				for (let j = 0; j < store.players[i].craftsmen.length; j++) {
					if (i !== controller.currentPlayerIndex() && store.players[i].craftsmen[j][1] === cman - 4 && model.getAvailableTechs(cman)) return true
					else if (i === controller.currentPlayerIndex() && store.players[i].craftsmen[j][1] === cman - 4 && !store.context.techsTaken.includes((cman - 4) * 2) && !store.context.techsTaken.includes((cman - 4) * 2 + 1) && model.getAvailableTechs(cman)) return true
				}
			}

			return false
		}
		// Or tech available
		if (model.getAvailableTechs(cman)) return true
		return false
	}
	// Display a tech card. So don't have one, and one available
	else if (flag === 1) {
		if (model.hasTechForCman(cman)) return false
		return true
	}
	// Find the lowest available tech for the Cman
	else if (flag === 2) {
		let techs = model.getAvailableTechs(-1)
		if (techs.includes(cman * 2)) return cman * 2
		else return cman * 2 + 1
	}
}

function localSetupPlaceResource(resource) {
	if (store.remainingItems[resource] <= 0) return
	store.context.itemBeingAdded = resource
	if (model.has_god(controller.currentPlayerObj(), rf.ESHU)) store.context.range = 6

	let data = map.getAllCraftsmanDataWithinRangeOfZoneAndOutOfRange([0], 18, rf.RES_TILE_TO_SQ[store.context.itemBeingAdded])
	store.context.craftsmanDataToPipRed = data[0]
}

function localSetupPlaceCraftsman(cman) {
	// Remove displayed data
	store.topMenuViews.hubRangesToHighlight.splice(0)
	store.context.indexesToPipGreen.splice(0)
	store.context.indexesToPipRed.splice(0)
	// Remove ghosts
	let ghostDivs = document.getElementsByClassName("ghostDiv")
	let ghostImgs = document.getElementsByClassName("ghostImg")
	for (let i = 0; i < ghostDivs.length; i++) ghostDivs[i].style.display = "none"
	for (let i = 0; i < ghostImgs.length; i++) ghostImgs[i].style.display = "none"
	store.topMenuViews.currentGhostIndex = -1
	// Remaining check
	if (store.remainingItems[cman] <= 0) {
		store.context.actionError = "No Remaining Craftsmen"
		return
	}

	// VR CHECK
	if (!model.hasTechForCman(cman)) {
		let techs = model.getAvailableTechs(-1)
		let techCard = cman * 2 + 1
		if (techs.includes(cman * 2)) techCard = cman * 2
		if (!model.has_god(controller.currentPlayerObj(), rf.GU) && model.getVR(controller.currentPlayerObj()) + rf.TECH_VR[techCard] > 40) {
			store.context.actionError = "Taking Tech would increase VR over 40"
			return
		}
		if (model.has_god(controller.currentPlayerObj(), rf.GU) && model.getVR(controller.currentPlayerObj()) + 1 > 40) {
			store.context.actionError = "Taking Tech would increase VR over 40"
			return
		}
	}

	// COW CHECK
	if (controller.currentPlayerObj().cows < rf.COW_COST_TO_BUILD_CMAN[cman]) {
		store.context.actionError = "Not enough cows to place craftsman"
		store.context.itemBeingAdded = -1
		store.context.indexesToHighlightClick.splice(0)
		return
	}

	store.context.actionError = ""
	store.context.itemBeingAdded === cman

	store.context.itemBeingAdded = cman
	store.context.itemBeingAddedRotation = 0
	if (rf.ROTATABLE_TILES.includes(cman)) store.context.itemBeingAddedRotation = 1
	store.context.indexesToHighlightClick.splice(0)
	store.context.range = model.has_god(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3
	//  return [validSquares, availableResourcesSquares, takenResourcesSquares]
	let craftsmanPlacingInfo = []
	if (rf.PRI_CRAFFTSMAN.includes(cman)) {
		store.context.action = rf.ACT_BUILD_PRI_CRAFTSMAN
		craftsmanPlacingInfo = map.getAllowedIndexesToPlacePriCraftsman(cman, store.context.range, store.context.itemBeingAddedRotation)
	} else if (rf.SEC_CRAFTSMEN.includes(cman)) {
		store.context.action = rf.ACT_BUILD_SEC_CRAFTSMAN
		craftsmanPlacingInfo = map.getAllowedIndexesToPlaceSecCraftsman(cman, store.context.range, store.context.itemBeingAddedRotation)
	}
	store.context.indexesToHighlightClick = craftsmanPlacingInfo[0]
	store.context.indexesToPipRed = craftsmanPlacingInfo[1].concat(craftsmanPlacingInfo[2])
}

function endBuildActions() {
	store.clearVars(true)
	// Check for activated and unused specialist
	for (let i = 0; i < controller.currentPlayerObj().specialists.length; i++) {
		if (controller.currentPlayerObj().specialists[i][0] === rf.RAIN_CEREMONY && controller.currentPlayerObj().specialists[i][1] !== 0 && !store.context.actionsTaken.includes(rf.ACT_BUILD_WATER)) {
			store.context.actionError = "You must use your Rain Ceremony to place a water tile in order to take the specialist"
			return
		} else if (controller.currentPlayerObj().specialists[i][0] === rf.SHAMAN && controller.currentPlayerObj().specialists[i][1] !== 0 && !store.context.actionsTaken.includes(rf.ACT_BUILD_RES)) {
			store.context.actionError = "You must use your Shaman to place a resource in order to take the specialist"
			return
		}
	}
	store.context.actionError = ""
	store.context.action = rf.ACT_END_BUILD
	if (store.context.actionsTaken.length === 0) store.context.actionError = "CAUTION: You Have Not Taken Any Actions"
}

function clickedSpecialistChoice(spec) {
	store.context.actionError = ""
	// VR check
	if (model.getVR(controller.currentPlayerObj()) + rf.SPEC_VR[spec] > 40) {
		store.context.actionError = "Taking " + rf.SPEC_NAMES[spec] + " would increase your VR over 40"
		return
	}
	// Cow check
	if (controller.currentPlayerObj().cows - rf.SPEC_COST[spec] < 0) {
		store.context.actionError = "You must be able to pay the cow cost to take " + rf.SPEC_NAMES[spec]
		return
	}

	store.context.itemBeingAdded = spec
}

function clickedgodChoice(god) {
	store.context.actionError = ""

	// god is included, so don't add it on again
	if (model.getVR(controller.currentPlayerObj(), true) > 40) {
		store.context.actionError = "Taking " + rf.god_NAMES[god] + " would increase your VR over 40"
		return
	}

	store.context.itemBeingAdded = god
}

function onlyPlaceOneMonument() {
	let histAction = rf.HIST_BUILD_MON
	model.addHistory(histAction, store.gameflow.turnOrder[0], 0, store.context.historyObj)
	store.clearVars(true)
	// Remove ghosts
	let ghostDivs = document.getElementsByClassName("ghostDiv")
	for (let i = 0; i < ghostDivs.length; i++) ghostDivs[i].style.display = "none"
}

function localCheckResign() {
	store.context.action = rf.ACT_CONFIRM_RESIGN
}

function cancelKickout() {
	personal.kickoutRequired = 0
}

function passKickout() {
	store.context.selectedBid = 0
	if (store.gameflow.phase === rf.PHASE_BID) confirmBid(0, true)
	personal.kickoutRequired = 0
	personal.removeCurrentFlexTime = true
	personal.removeCurrentFlexTimeName = controller.currentPlayerObj().name
	localEndPlayerTurn()
}

function getCurrentUpgradeCost() {
	if (store.context.upgradingMonumentProcess.length === 1 && store.context.currentRitualGood.length === 0) return 0
	let cmenCosts = [0, 0, 0, 0, 0]
	let hubCosts = 0
	// Otherwise, combine the 1+ index from process,
	if (store.context.upgradingMonumentProcess.length > 1) {
		for (let i = 1; i < store.context.upgradingMonumentProcess.length; i++) {
			for (let j = 0; j < store.context.upgradingMonumentProcess[i].length; j++) {
				if (store.context.upgradingMonumentProcess[i][j].length === 3) {
					let cowCost = store.context.upgradingMonumentProcess[i][j][2]
					let priCmanIndex = store.context.upgradingMonumentProcess[i][j][0]
					cmenCosts[model.getPlayerIndexForCraftsmanPriIndex(priCmanIndex)] += cowCost
					hubCosts += store.context.upgradingMonumentProcess[i][j][1]
				}
			}
		}
	}
	if (store.context.currentRitualGood.length > 0) {
		for (let i = 0; i < store.context.currentRitualGood.length; i++) {
			if (store.context.currentRitualGood[i].length > 1) {
				let cowCost = store.context.currentRitualGood[i][2]
				let priCmanIndex = store.context.currentRitualGood[i][0]
				cmenCosts[model.getPlayerIndexForCraftsmanPriIndex(priCmanIndex)] += cowCost
				hubCosts += store.context.currentRitualGood[i][1]
			}
		}
	}

	let ret = "<b>" + String(hubCosts) + "</b> hub" + (hubCosts !== 1 ? "s" : "") + " "
	for (let i = 0; i < cmenCosts.length; i++) {
		if (cmenCosts[i] !== 0) {
			ret += '<span class="mainEntryPlayer" style="background-color: ' + personal.getCorrectedColourHex(store.players[i].colour) + ";color: " + (personal.getCorrectedColour(store.players[i].colour) === rf.WHITE || personal.getCorrectedColour(store.players[i].colour) === rf.YELLOW ? "black" : "white") + '">' + store.players[i].displayName + "</span>" + String(cmenCosts[i]) + " "
		}
	}
	// Total
	ret += " Total: " + String(cmenCosts.reduce((a, b) => a + b, 0) + hubCosts) + " "
	return ret
}

function handleAutoPassCheckbox() {
	document.querySelector("#autoPassResponse").innerHTML = ""
	const autoPass = document.querySelector("#autoPassCheckbox").checked
	IO.saveAutoPass(autoPass)
}

function newBidSelected(newBid) {
	store.context.selectedBid = parseInt(newBid)
}

function isThisTheLastPlaque(idx) {
	let modulo = store.players.length
	if (model.anyoneHasSHADIPINYI()) {
		modulo++
		idx++
	}
	let total = parseInt(store.context.selectedBid) + store.ongoingVars.totalBids
	if (model.anyoneHasNYAMI()) total = parseInt(store.context.selectedBid)
	if ((total - 1) % modulo === idx) return true
	return false
}
function isShadTheLastPlaque() {
	let modulo = store.players.length + 1
	if ((parseInt(store.context.selectedBid) + store.ongoingVars.totalBids - 1) % modulo === 0) return true
	return false
}

function getLatestBidder() {
	if (store.topMenuViews.showReplay) {
		// if current player made a big return them
		if (store.history[store.replayStep][3][0] > 0) return store.players[store.history[store.replayStep][1]]
		else return store.players[store.gameflow.turnOrder[store.gameflow.turnOrder.length - 1]]
	} else return store.players[store.gameflow.turnOrder[store.gameflow.turnOrder.length - 1]]
}

function getFlexiKickoutTImerText() {
	if (personal.flexiSecondsToNextKickout < 0) personal.flexiSecondsToNextKickout = 0
	let hoursToGo = String(Math.floor(personal.flexiSecondsToNextKickout / 60 / 60))
	let minsToGo = String(Math.floor((personal.flexiSecondsToNextKickout % 3600) / 60)).padStart(2, "0")
	let secsToGo = String(Math.floor(personal.flexiSecondsToNextKickout % 60)).padStart(2, "0")

	return hoursToGo + ":" + minsToGo + ":" + secsToGo
}

function localReplaceExternalTournamentPlayer() {
	IO.replaceExternalTournamentPlayer()
	confirmTournamentReplacement.value = false
}

function localSetPrice(craftsman, price) {
	if (craftsman === rf.BLACKSMITH_TILE) store.context.choosingPrices[7] = price
	else store.context.choosingPrices[craftsman] = price
}

function localGetPrice(craftsman) {
	if (craftsman === rf.BLACKSMITH_TILE) return store.context.choosingPrices[7]
	else return store.context.choosingPrices[craftsman]
}

function setupOya() {
	store.context.action = rf.ACT_OYA_RUITUALGOOD
	store.context.canSelectRaiseMonument.splice(0)
	model.getValidCraftsmenToRaiseMonument([0], false)
	store.topMenuViews.hubRangesToHighlight = map.getAllOrAnySquaresWithinRangeOfZoneUsingHubs([0], 17)
}

function skipResource() {
	store.context.resourceIndexesToHighlight.splice(0)

	store.context.selectedResourcesForCraftsmen.push()

	// Otherwise, need to select the related PRIMARY craftsman and resource
	store.context.currentRitualGood.push([...store.context.selectedResourcesForCraftsmen])
	store.context.selectedResourcesForCraftsmen.splice(0)

	// THIS NEEDS TO START FROM THE RELATED CRAFTSMAN AREA
	let craftsmanZone = map.getCraftsmanZoneFromData(map.getCraftsmanDataFromAnySq(store.context.currentRitualGood[0][0], true))
	model.getValidCraftsmenToRaiseMonument(craftsmanZone)
	store.topMenuViews.hubRangesToHighlight = map.getAllOrAnySquaresWithinRangeOfZoneUsingHubs(craftsmanZone, model.has_god(controller.currentPlayerObj(), rf.ESHU) ? 6 : 3, 0)
}

function cancelRaising() {
	store.resetTurnVars()
	funcs.importModel(store.actionResetData, true)
}

function localConfirmRaising() {
	store.clearVars(true)
	if (model.has_god(controller.currentPlayerObj(), rf.OYA)) {
		model.setupPlaceMonument()
	}
}

function failedToJustPlaceCraftsmanFlag() {
	// If you just placed, return 0
	if (store.history[store.history.length - 1][0] === rf.HIST_BUILD_CRAFTSMAN) return 0
	if (controller.currentPlayerObj().craftsmen.length === 0) return 2
	return 1
}
</script>

<template>
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

	<!-- TOURNAMENT ADMIN KICKOUT BUTTON -->
	<template v-if="rf.SUPER_USERS.includes(personal.name)">
		<template v-if="confirmTournamentReplacement === false">
			<button class="actionsLineButton" @click="confirmTournamentReplacement = true">
				Confirm Replacement For:
				<b>{{ controller.currentPlayerObj().name }}</b>
			</button>
		</template>
		<template v-if="confirmTournamentReplacement === true">
			<br />
			<br />
			Are you sure you want to replace
			<b>{{ controller.currentPlayerObj().name }}</b>
			?
			<br />
			<br />
			This action cannot be undone.
			<br />
			<br />
			This action will delete current rewind data.
			<br />
			<br />
			The TGZtourneyAdmin player will replace
			<b>{{ controller.currentPlayerObj().name }}</b>
			.
			<br />
			<br />
			Mr.Moo will get notifications, and this game will show up in "Current Games".
			<br />
			<br />
			<button class="actionsLineButton" @click="confirmTournamentReplacement = false">CANCEL</button>
			<button class="actionsLineButton" @click="localReplaceExternalTournamentPlayer()">
				CONFIRM Kick and replacement for
				<b>{{ controller.currentPlayerObj().name }}</b>
			</button>
		</template>
	</template>

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
		<div v-else-if="personal.externalTournamentGame" id="kickoutDiv">
			Under the tournament rules set by the external tournament organisers, you cannot kick other players from this type of tournament game
			<br />
			<br />
			Please use the button below to alert the admins, who will continue to make moves for this player
			<br />
			<br />
			<br />
			<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow more time</button></span>

			<button class="actionsLineButton" @click="IO.nudgeTourneyAdmins(1)">Alert Admins</button>
		</div>

		<div v-else id="kickoutDiv">
			<br />
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
				<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow more time</button></span>
				<span>
					<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">Keep {{ controller.currentPlayerObj().name }} in the game - but end their current turn</button>
				</span>
				<span><button class="actionsLineButton" id="confirmKickoutButton" @click="store.context.action = rf.ACT_CONFIRM_KICKOUT">Confirm Kickout</button></span>
			</template>
			<template v-if="store.context.action === rf.ACT_CONFIRM_KICKOUT">
				This will permanently remove
				<b>{{ controller.currentPlayerObj().name }}</b>
				from the game
				<br />
				<b>It cannot be undone</b>
				<br />
				<br />
				Try checking the chat in case they have given a reason for any temporary absence
				<br />
				Please consider giving them a short grace period, in case they are just delayed

				<br />
				<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow more time</button></span>
				<span>
					<button class="actionsLineButton" id="confirmKickoutButton" @click="Bot.actionPlayerKickout">Permanently Kickout {{ controller.currentPlayerObj().name }}</button>
				</span>
			</template>
		</div>
	</template>

	<template v-if="store.topMenuViews.rewindErrorText !== ''">
		<h1 id="rewindErrorText">{{ store.topMenuViews.rewindErrorText }}</h1>
	</template>
	<template v-else-if="store.topMenuViews.errorText !== ''">
		<h1 id="errorText">{{ store.topMenuViews.errorText }}</h1>
	</template>
	<template v-else-if="store.topMenuViews.bugSuccessText !== ''">
		<h2 id="bugSuccessText" v-html="store.topMenuViews.bugSuccessText"></h2>
	</template>
	<template v-else>
		<div class="IOSfix-wrapper">
			<h6>&nbsp;</h6>
		</div>
	</template>

	<!-- ALWAYS SHOWS ON TURN 0 -->
	<template v-if="store.gameflow.turn === 0 && !store.topMenuViews.showReplay && store.topMenuViews.showIntroInfo">
		<h2>Welcome to Africa!</h2>
		<b>
			NOTE: Check the option in your
			<a href="/profile/">Profile</a>
			to remove god/specs description/VR
		</b>
		<br />
		<br />
		In The Great Zimbabwe Online the following symbols can help you whilst positioning tiles or raising monuments
		<br />
		<div class="intro_items_list_div">
			<div class="intro_inRange"></div>
			Item in range
			<br />
			<div class="intro_OutOfRange"></div>
			Item not in range
			<br />
			<div class="intro_resNotUsed"></div>
			Resource not in range of another Craftsman of same type
			<br />
			<div class="intro_resUsed"></div>
			Resource already in range of another Craftsman of same type
			<br />
			<div class="intro_imgDiv"><img class="intro_img" :src="view.getImage('noResource5')" alt="NR" /></div>
			Depleted Resource / No resource available for craftsman
			<br />
			<div class="intro_imgDiv">
				<img class="intro_img" :src="view.getImage('noResource5')" alt="NR" />
				<div class="crossBackground_Atete"></div>
			</div>
			Depleted Resource / No resource available for craftsman (for Atete)
			<br />
			<div class="intro_imgDiv"><img class="intro_img" :src="view.getImage('noCows')" alt="NR" /></div>
			Not enough cattle to pay craftsman (including any hub costs)
			<br />

			<div
				class="intro_monumentDiv"
				:style="{
					'background-color': personal.getCorrectedColourHex(rf.GREEN),
				}">
				3
				<div class="intro_notEnoguhCraftsmenForMon">
					<img :src="view.getImage('noCmen')" alt="NC" />
				</div>
			</div>
			Not enough available Craftsmen/Resources to Raise Monument
			<br />
			<br />
			<b>REWIND</b>
			will literally roll the game back by one player turn.
			<br />
			So in the bidding phase, it will go back to the last player to make an actual bid,
			<br />
			or if at the first player to bid, it will rewind to the last player to take actions during the last actions phase.
			<br />
			Similarly during actions, it will either rewind to the previous player's action turn,
			<br />
			or if already at the first player, it will rewind to the last player who made an actual bid.
			<br />
			<br />
			<b>REPLAY</b>
			does not alter the game state in any way. You can view all the moves made from the
			<br />
			start of the game, stepping through move by move, and viewing the game state exactly as it was at that time.
			<br />
			Once you exit replay mode, the game will return to the same state as when you entered replay mode.
			<br />
			For information on Bidding, Replay, Map Inspector, Ranges, and Game-Spinoff please see
			<b><a class="linkOther" href="/TGZ/help/" target="_blank">TGZ Help</a></b>
		</div>
	</template>
	<template v-else-if="store.topMenuViews.showIntroInfo === false">
		<button class="actionsLineButton" @click="store.topMenuViews.showIntroInfo = true">Show Help</button>
	</template>

	<!-- ALWAYS SHOWS BID INFO-->
	<template v-if="store.gameflow.phase === rf.PHASE_BID">
		<div id="bidLine">
			<b>New Turn Order:</b>
			<template v-for="(playerIndex, idx) in store.ongoingVars.newTurnOrder" :key="idx">
				<div v-if="playerIndex === -1" class="newTurnOrderDiv">
					<span class="newTurnOrderNumber">{{ idx + 1 }}</span>
				</div>
				<div v-else class="newTurnOrderDiv">
					<img :src="view.getPlayerTribeImage(personal.getCorrectedColour(store.players[playerIndex].colour))" alt="TRIBE" />
				</div>
			</template>
			<br v-if="!store.topMenuViews.showReplay" />
			<template v-if="store.ongoingVars.totalBids > 0">
				<b>Current Bid:</b>
				<b>{{ store.ongoingVars.currentBid }}</b>
				<img :src="view.getImage('cows1')" class="bidCow" alt="Cows" />
				<span
					class="mainEntryPlayer"
					:style="{
						'background-color': personal.getCorrectedColourHex(getLatestBidder().colour),
						color: personal.getCorrectedColour(getLatestBidder().colour) === rf.WHITE || personal.getCorrectedColour(getLatestBidder().colour) === rf.YELLOW ? 'black' : 'white',
					}">
					{{ getLatestBidder().displayName }}
				</span>
			</template>
		</div>

		<div id="plaqueLine">
			<div v-if="model.anyoneHasSHADIPINYI(false)" class="biddingPlaque">
				<img :src="view.getImage('shad_plaque')" alt="SHAD" />
				<div class="shadOwnerDiv">
					<img :src="view.getPlayerTribeImage(personal.getCorrectedColour(store.players[model.anyoneHasSHADIPINYI(true)].colour))" alt="TRIBE" />
				</div>
				<div v-if="model.getCowsOnPlaque(0, store.context.selectedBid) > 0" class="cowsOnPlaqueDiv" :class="{ cowsOnPlaqueDivYellowBorder: isShadTheLastPlaque() }">
					<img :src="view.getImage('cows1_bid')" alt="Cows" />
					<div class="cowsOnPlaqueNumber">{{ model.getCowsOnPlaque(0, store.context.selectedBid) }}</div>
				</div>
			</div>
			<div v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx" class="biddingPlaque">
				<img class="playerPlaqueImg" :src="view.getPlayerTribeImage(personal.getCorrectedColour(store.players[playerIndex].colour))" alt="TRIBE" />
				<div v-if="model.getCowsOnPlaque(model.anyoneHasSHADIPINYI() ? idx + 1 : idx, store.context.selectedBid) > 0" class="cowsOnPlaqueDiv" :class="{ cowsOnPlaqueDivYellowBorder: isThisTheLastPlaque(idx) }">
					<img :src="view.getImage('cows1_bid')" alt="Cows" />
					<div class="cowsOnPlaqueNumber">{{ model.getCowsOnPlaque(model.anyoneHasSHADIPINYI() ? idx + 1 : idx, store.context.selectedBid) }}</div>
				</div>
			</div>
		</div>

		<span v-if="store.topMenuViews.showReplay"><br /></span>

		<!-- EXPERT PANEL TO PASS BID-->
		<template v-if="!personal.canPlay() && !store.topMenuViews.showReplay && store.gameflow.turnOrder.includes(personal.pov)">
			<div class="expertPanel">
				<b>Expert Option</b>
				: If unsure leave blank
				<br />
				<input type="checkbox" id="autoPassCheckbox" v-model="autoPass" />
				<label for="autoPassCheckbox">Auto-pass on your next bid</label>
				<button @click="handleAutoPassCheckbox" class="actionsLineButton">Submit</button>
				<span id="autoPassResponse" class="messageSuccess"></span>
			</div>
		</template>
	</template>

	<!-- ALWAYS SHOWS GAME END-->
	<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
		<div id="gameEndDiv">
			Game Over
			<br />
			<br />
			Winner: {{ store.players[store.history[store.history.length - 1][3][0][1]].displayName }}
			<br />
			<template v-if="store.players[store.history[store.history.length - 1][3][0][1]].name === personal.name">
				<h1>Congratulations!</h1>
			</template>
			<template v-else></template>
			{{ getReason(store.history[store.history.length - 1][3][0][2], 0) }}
			<br />
			Fancy a
			<a :href="'/createTGZpage/' + String(personal.gameID) + '/'">rematch</a>
			?
			<br />
			Winning Kingdom:
			<img class="winningTribeImg" :src="view.getPlayerTribeImage(personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][0][1]].colour))" alt="Tribe" />
			Best Mythology:
			<template v-if="store.players[store.history[store.history.length - 1][3][0][1]].god[0][0] !== rf.NO_god">
				<template v-for="(godData, index) in model.getPlayer_gods(store.players[store.history[store.history.length - 1][3][0][1]])" :key="index">
					<img v-if="godData[0] !== rf.NO_god" :src="view.getImage('god' + godData[0])" alt="god" class="winningMythImg" />
				</template>
			</template>
			<span v-else>None</span>
			<br />
			<div class="intro_items_list_div">
				<template v-for="(entry, idx) in store.history[store.history.length - 1][3]" :key="idx">
					<template v-if="idx !== 0">
						{{ getOrdinal(idx + 1) }}: {{ store.players[entry[1]].displayName }} ({{ getReason(entry[2], idx) }})
						<br />
					</template>
				</template>
			</div>
			<span v-if="store.statsModeData.statsMode">Stats view - craftsman and techs show total game income</span>
			<span v-else>Normal view</span>
			<br />
			<button @click="store.statsModeData.statsMode = !store.statsModeData.statsMode" class="actionsLineButton">
				Cick to change to
				<span v-if="!store.statsModeData.statsMode">Stats</span>
				<span v-else>Normal</span>
				View
			</button>
		</div>
	</template>

	<!-- Not your turn, map inspector button -->
	<template v-if="!personal.canPlay() && !store.topMenuViews.showReplay">
		<div id="mapInspectorButtonDiv">
			<button @click="model.toggleMapInspector" class="actionsLineButton">
				<span v-if="!store.topMenuViews.mapInspectorMode">Enable</span>
				<span v-else>Disable</span>
				<br />
				Map
				<br />
				Inspector
			</button>
			<template v-if="store.topMenuViews.mapInspectorMode">
				<br />
				<input type="checkbox" id="mapInspectorEshuCheckbox" v-model="store.topMenuViews.mapInspectorEshu" />
				<label for="mapInspectorEshuCheckbox">Use Eshu</label>
			</template>
		</div>
		<template v-if="store.topMenuViews.mapInspectorMode && !store.topMenuViews.showReplay">
			<br />
			Click an item to view ranges. Hubs Used:
			<span class="hubRangeSq hubRangeSq0">0</span>
			<span v-for="idx in Math.max(store.topMenuViews.hubRangesToHighlight.length - 1, 0)" :key="idx" class="hubRangeSq" :class="'hubRangeSq' + String(idx % 8)">
				{{ idx }}
			</span>
			<br />
			<br />
		</template>
	</template>

	<template v-if="personal.canPlay()">
		<div id="actions">
			<!-- ADD FIRST MONUMENT  -->
			<template v-if="store.gameflow.phase === rf.PHASE_FIRST_MON">
				<button @click="model.toggleMapInspector" class="actionsLineButton" id="mapInspectFirstMon">
					<span v-if="!store.topMenuViews.mapInspectorMode">Enable</span>
					<span v-else>Disable</span>
					<br />
					Map
					<br />
					Inspector
				</button>
				<b>Build your first monument on a highlighted start square</b>
				<template v-if="store.context.action !== rf.ACT_NONE">
					<br />
					<br />
					Hubs Used:
					<span class="hubRangeSq hubRangeSq0">0</span>
					<span v-for="idx in Math.max(store.topMenuViews.hubRangesToHighlight.length - 1, 0)" :key="idx" class="hubRangeSq" :class="'hubRangeSq' + String(idx % 8)">
						{{ idx }}
					</span>
					<br />
					<br />
				</template>
				<div v-if="store.context.action === rf.ACT_NONE">
					<button v-if="controller.canResign()" class="actionsLineButton" @click="localCheckResign">Resign</button>
					<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset</button>
					<button class="actionsLineButton" @click="localEndPlayerTurn">End Turn</button>
				</div>
			</template>

			<!-- CHEAT ACTION -->
			<template v-if="store.context.action === rf.ACT_CHOOSE_CHEAT">
				<h2>Cheat Options</h2>
				(If you got here accidentally please CANCEL. Other players will be able to see your cheat in the History!)
				<br />
				<br />
				<div class="cheatOptionsContainer">
					<div class="cheatOptionDiv">
						<span>
							Allow choosing multiple gods
							<br />
							(Choosing the same one twice won't work)
						</span>
						<br />
						<button class="actionsLineButton" @click="allowMultipleGods">
							Allow Multiple
							<br />
							gods
						</button>
					</div>
					<div class="cheatOptionDiv">
						<span>
							Unlock all gods for selection
							<br />
							This adds ALL gods to the Reserve
							<br />
							(even already chosen ones)
							<br />
							When you end your turn, all gods
							<br />
							will remain in the reserve
							<br />
							(So you only need to enable this once, then finish your turn)
						</span>
						<br />
						<button class="actionsLineButton" @click="enableAllGods">
							Enable All
							<br />
							gods
						</button>
					</div>
				</div>
				<br />
				<button class="actionsLineButton" @click="cancelCheat">Cancel</button>
			</template>

			<!-- BID  -->
			<template v-if="store.gameflow.phase === rf.PHASE_BID">
				<template v-if="store.context.action === rf.ACT_BID">
					<b>Provide a gift, or Pass</b>
					<br />
					<span v-if="model.has_god(controller.currentPlayerObj(), rf.AJA) && model.get_godData(controller.currentPlayerObj(), rf.AJA)[1] === 0">
						To place your bid on Aja, select a bid amount and then use "Confirm Bid to Aja"
						<br />
					</span>
					<span v-if="model.anyoneHasNYAMI(false)" class="orangeText">
						<!--Remember: Nyami-Nyami allows that player to go first
						<br />-->
						Remember: Nyami-Nyami is placing all bid cows starting from the first plaque
						<br />
					</span>
					<label class="choiceLabel" for="bidAmount">Bid Amount:</label>

					<select name="bidAmount" id="bidAmount" @change="newBidSelected($event.target.value)">
						<option v-for="(amount, idx) in getBidRange()" :key="idx" :value="amount[0]">{{ amount[1] }}</option>
					</select>

					<br />
					<button @click="model.toggleMapInspector" class="actionsLineButton" id="mapInspectBid">
						<span v-if="!store.topMenuViews.mapInspectorMode">Enable</span>
						<span v-else>Disable</span>
						<br />
						Map
						<br />
						Inspector
					</button>

					<span v-if="store.context.selectedBid === 0">
						Passing will place you in
						<b>{{ getFirstPositionOrdinal() }}</b>
						position with
						<b>{{ getCurrentCows(store.context.selectedBid) }}</b>
						cows
					</span>
					<span v-else>
						Bidding {{ store.context.selectedBid }} means you will currently have {{ getCurrentCows(store.context.selectedBid) }}
						<span v-if="getCurrentCows(store.context.selectedBid) !== 1">cows</span>
						<span v-else>cow</span>
						to use for your actions
					</span>

					<br />

					<!--DEFUNCT SCHISM AJA <button v-if="controller.ajaPlayerCanFreePass()" class="actionsLineButton" @click="confirmFreeAjaPass">Confirm Free Pass with Aja</button>-->
					<button v-if="store.context.selectedBid > 0 && model.has_god(controller.currentPlayerObj(), rf.AJA) && model.get_godData(controller.currentPlayerObj(), rf.AJA)[1] === 0" class="actionsLineButton" @click="confirmAjaBid(store.context.selectedBid)">Confirm Bid to Aja</button>

					<button class="actionsLineButton" @click="confirmBid(store.context.selectedBid)">
						Confirm
						<span v-if="store.context.selectedBid === 0">Pass & End Turn</span>
						<span v-else>Bid & End Turn</span>
					</button>
				</template>

				<div v-if="store.context.action === rf.ACT_NONE">
					<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset</button>
					<button class="actionsLineButton" @click="localEndPlayerTurn">End Turn</button>
				</div>
			</template>

			<!-- BUILD PHASE - NO ACTION  -->
			<template v-if="store.gameflow.phase === rf.PHASE_BUILD && store.context.action === rf.ACT_NONE">
				<div id="mapInspectorButtonDiv">
					<button @click="model.toggleMapInspector" class="actionsLineButton">
						<span v-if="!store.topMenuViews.mapInspectorMode">Enable</span>
						<span v-else>Disable</span>
						<br />
						Map
						<br />
						Inspector
					</button>
					<template v-if="store.topMenuViews.mapInspectorMode">
						<br />
						<input type="checkbox" id="mapInspectorEshuCheckbox" v-model="store.topMenuViews.mapInspectorEshu" />
						<label for="mapInspectorEshuCheckbox">Use Eshu</label>
					</template>
				</div>
				<fieldset class="optionsGroup">
					<legend class="optionsHeader">Pick One</legend>
					<template v-if="!store.context.actionsTaken.includes(rf.ACT_BUILD_MON) && !store.context.actionsTaken.includes(rf.ACT_RAISE_MON) && !store.context.actionsTaken.includes(rf.ACT_BUILD_CRAFTSMEN)">
						<button class="actionsLineButton mainActionButton" @click="model.setupPlaceMonument">
							Build
							<br />
							Monument
						</button>
						<br />
						<button class="actionsLineButton mainActionButton" @click="model.setupRaiseMonument(false)">
							Raise
							<br />
							Monuments
						</button>
						<br />
						<button class="actionsLineButton mainActionButton" @click="model.setupPlaceCraftsmen(false)">
							Place
							<br />
							Craftsmen
						</button>
					</template>
					<template v-else-if="store.context.actionsTaken.includes(rf.ACT_BUILD_MON)">
						You Chose:
						<br />
						Building
						<br />
						Monuments
					</template>
					<template v-else-if="store.context.actionsTaken.includes(rf.ACT_RAISE_MON)">
						You Chose:
						<br />
						Raising
						<br />
						Monuments
					</template>
					<template v-else-if="store.context.actionsTaken.includes(rf.ACT_BUILD_CRAFTSMEN)">
						You Chose:
						<br />
						Building
						<br />
						Craftsmen
					</template>
				</fieldset>
				<fieldset class="optionsGroup">
					<legend class="optionsHeader">Once Each</legend>
					<span v-if="controller.currentPlayerObj().specialists.length === 0">
						<div class="noSpecsTextDiv">
							You Have
							<br />
							No Specialists
							<br />
						</div>
					</span>
					<span v-else>
						You Have:
						<br />
						<span v-for="(spec, idx) in controller.currentPlayerObj().specialists" :key="idx">
							{{ rf.SPEC_NAMES[spec[0]] }}
							<br />
						</span>
						<button class="actionsLineButton mainActionButton" @click="model.setupUseSpec">
							Use
							<br />
							Specialist
						</button>
					</span>
				</fieldset>
				<fieldset class="optionsGroup" v-if="store.availableSpecialists.length > 0 || model.has_god(controller.currentPlayerObj(), rf.NO_god)">
					<legend class="optionsHeader">Pick One</legend>
					<span v-if="(model.has_god(controller.currentPlayerObj(), rf.NO_god) || store.allowMultiple_gods) && !store.context.actionsTaken.includes(rf.ACT_CHOOSE_god) && !store.context.actionsTaken.includes(rf.ACT_CHOOSE_SPEC)">
						<button class="actionsLineButton mainActionButton" @click="model.setupChoosegod">
							Choose
							<br />
							god
						</button>
						<br />
					</span>
					<span v-else-if="!model.has_god(controller.currentPlayerObj(), rf.NO_god)">
						You adore:
						<template v-for="(godData, index) in model.getPlayer_gods(controller.currentPlayerObj())" :key="index">
							<span v-if="godData[0] !== rf.NO_god">
								{{ rf.god_NAMES[godData[0]] }}
								<span v-if="index < model.getPlayer_gods(controller.currentPlayerObj()).filter((g) => g[0] !== rf.NO_god).length - 1">,</span>
							</span>
						</template>
						<br />
					</span>
					<button v-if="store.availableSpecialists.length > 0 && !store.context.actionsTaken.includes(rf.ACT_CHOOSE_god) && !store.context.actionsTaken.includes(rf.ACT_CHOOSE_SPEC)" class="actionsLineButton mainActionButton" @click="model.setupChooseSpec">
						Choose
						<br />
						Specialist
					</button>
					<template v-if="store.context.actionsTaken.includes(rf.ACT_CHOOSE_SPEC)">
						You chose:
						<br />
						A New Spec
					</template>
				</fieldset>

				<template v-if="store.topMenuViews.mapInspectorMode">
					<br />
					<br />
					Click an item to view ranges. Hubs Used:
					<span class="hubRangeSq hubRangeSq0">0</span>
					<span v-for="idx in Math.max(store.topMenuViews.hubRangesToHighlight.length - 1, 0)" :key="idx" class="hubRangeSq" :class="'hubRangeSq' + String(idx % 8)">
						{{ idx }}
					</span>
				</template>
				<br />
				<button v-if="controller.canResign()" class="actionsLineButton" @click="localCheckResign">Resign</button>
				<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
				<button class="actionsLineButton" @click="endBuildActions">End Turn</button>
			</template>

			<!-- CONFIRM END TURN -->
			<template v-if="store.context.action === rf.ACT_END_BUILD">
				<template v-if="model.anyPlayerMeetsVR()">
					The game will end this round!
					<br />
					Current Standings:
					<br />
					<br />
					<span v-for="(scoreObj, idx) in model.endGame_core(true)" :key="idx">
						{{ idx + 1 }} - {{ store.players[scoreObj[1]].displayName }}
						<br />
					</span>
					<br />
				</template>
				<template v-else>
					Ending your turn now will give you
					<b>+{{ model.getTurnEndCows(controller.currentPlayerIndex(), 9) }}</b>
					<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
					next turn - Total:
					<b>{{ model.getTurnEndCows(controller.currentPlayerIndex(), 9) + controller.currentPlayerObj().cows }}</b>
					<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
					<br />
					Your income is from:
					<b>{{ model.getTurnEndCows(controller.currentPlayerIndex(), 0) }}</b>
					(god),
					<b>{{ model.getTurnEndCows(controller.currentPlayerIndex(), 1) }}</b>
					(specialists),
					<b>{{ model.getTurnEndCows(controller.currentPlayerIndex(), 2) }}</b>
					(techs),
					<b>{{ model.getTurnEndCows(controller.currentPlayerIndex(), 3) }}</b>
					(monuments)
					<br />
					You could receive more cows if other players use your craftsmen
					<br />
					<template v-if="model.anyoneHasAJAKA(false) && controller.currentPlayerObj().techs.some((t) => t[1] >= 6)">
						<!-- YOU DO NOT HAVE AJAKA - SO YOU ARE LOSING COWS -->
						<template v-if="!model.has_god(controller.currentPlayerObj(), rf.AJAKA)">
							<span class="orangeText">
								Ajaka is taking half the cows from your tech cards that have 6+ cows
								<br />
							</span>
						</template>
					</template>
				</template>
				<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
				<button class="actionsLineButton" @click="localEndPlayerTurn">Confirm End Turn</button>
			</template>

			<template v-if="store.context.action === rf.ACT_CONFIRM_RESIGN && !personal.externalTournamentGame">
				<p>Are you sure you want to resign?</p>
				<p>Resigning will unbalance the game for the remaining players</p>
				<p>Please carry on playing if that is at all possible</p>
				<p>Even if you think you can't win, you can still aim for not last / most monuments / funny monument positions / etc</p>
				<button class="actionsLineButton" @click="resetWholePlayerTurn">Carry On Playing</button>
				<button class="actionsLineButton" @click="Bot.actionResign">Confirm Resignation</button>
			</template>
			<template v-else-if="store.context.action === rf.ACT_CONFIRM_RESIGN && personal.externalTournamentGame">
				<div id="resignConfirmDiv">
					Under the tournament rules set by the external tournament organisers, you cannot resign from this type of tournament game
					<br />
					<br />
					Please continue to play
					<br />
					<br />
					If you are unable to continue, please contact the admins via BGG or Discord, or alert them using the button below
					<br />
					You will probably be removed from the tournament
					<br />
					<br />
					<button class="actionsLineButton" @click="resetWholePlayerTurn">Carry On Playing</button>
					<button class="actionsLineButton" @click="IO.nudgeTourneyAdmins(0)">Alert Admins</button>
				</div>
			</template>

			<!-- CHOOSE god  -->
			<template v-if="store.context.action === rf.ACT_CHOOSE_god">
				<template v-if="store.context.itemBeingAdded === -1">
					Choose a god. You may only have 1, and your choice is permanent
					<br />
					<div v-for="(god, idx) in store.availablegods" :key="idx" :class="[personal.aidText ? 'godChoiceDiv' : 'godChoiceDivNoText']" @click="clickedgodChoice(god)">
						<template v-if="personal.aidText">
							<b>{{ rf.god_NAMES[god] }}</b>
							<br />
						</template>
						<img class="godChoiceImg" :src="view.getImage('god' + god)" alt="god" />
						<div v-if="personal.aidText" class="godChoiceTextDiv">
							{{ rf.god_TEXT[god] }}
							<br />
						</div>
						<span v-if="rf.isVRchanged(god) || personal.aidText" :class="{ changedVR: rf.isVRchanged(god) }">VR: {{ rf.gods_VR[god] }}</span>
					</div>

					<br />
					<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">Cancel</button>
				</template>
				<template v-else>
					<div :class="[personal.aidText ? 'godChoiceDivSingle fixedBorder' : 'godChoiceDivSingleNoText fixedBorder']">
						<img class="godChoiceImgSingle" :src="view.getImage('god' + store.context.itemBeingAdded)" alt="god" />
						<template v-if="personal.aidText">
							<br />
							{{ rf.god_TEXT[store.context.itemBeingAdded] }}
						</template>
						<br />
						<span v-if="rf.isVRchanged(store.context.itemBeingAdded) || personal.aidText" :class="{ changedVR: rf.isVRchanged(store.context.itemBeingAdded) }">VR: {{ rf.gods_VR[store.context.itemBeingAdded] }}</span>
					</div>
					<br />
					<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">Cancel</button>
					<button class="actionsLineButton" @click="model.setgod(store.context.itemBeingAdded)">Confirm Choice</button>
				</template>
			</template>

			<!-- CHOOSE SPEC  -->
			<template v-if="store.context.action === rf.ACT_CHOOSE_SPEC">
				<template v-if="store.context.itemBeingAdded === -1">
					Choose a Specialist
					<br />
					<div v-for="(spec, idx) in store.availableSpecialists" :key="idx" :class="[personal.aidText ? 'specChoiceDiv' : 'specChoiceDivNoText']" @click="clickedSpecialistChoice(spec)">
						<img class="specChoiceImg" :src="view.getImage('spec' + spec)" alt="SPEC" />
						<template v-if="personal.aidText">
							<br />
							{{ rf.SPEC_TEXT[spec] }}
							<br />
						</template>
						<br v-if="!personal.aidText" />
						<span v-if="rf.isSpecVRchanged(spec) || personal.aidText" :class="{ changedVR: rf.isSpecVRchanged(spec) }">VR: {{ rf.SPEC_VR[spec] }}</span>
					</div>
					<br />
					<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">Cancel</button>
				</template>
				<template v-else>
					<div :class="[personal.aidText ? 'specChoiceDivSingle fixedBorder' : 'specChoiceDivSingleNoText fixedBorder']">
						<img class="specChoiceImgSingle" :src="view.getImage('spec' + store.context.itemBeingAdded)" alt="god" />
						<template v-if="personal.aidText">
							<br />
							{{ rf.SPEC_TEXT[store.context.itemBeingAdded] }}
						</template>
						<br />
						<span v-if="rf.isSpecVRchanged(store.context.itemBeingAdded) || personal.aidText" :class="{ changedVR: rf.isSpecVRchanged(store.context.itemBeingAdded) }">VR: {{ rf.SPEC_VR[store.context.itemBeingAdded] }}</span>
					</div>
					<br />
					<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">Cancel</button>
					<button class="actionsLineButton" @click="model.addSpecialist(store.context.itemBeingAdded)">Confirm Choice</button>
				</template>
			</template>

			<!-- USE SPEC  -->
			<template v-if="store.context.action === rf.ACT_USE_SPEC">
				Use a Specialist
				<br />
				<!-- SPECIALISTS -->
				<div v-for="(spec, idx) in controller.currentPlayerObj().specialists" :key="idx" :class="[{ usedSpec: unableToUseSpec(spec) }, personal.aidText ? 'specChoiceDiv' : 'specChoiceDivNoText']" @click="localSetupUseSingleSpec(spec)">
					<img class="specChoiceImg" :src="view.getImage('spec' + spec[0])" alt="Spec" />
					<div class="cowOnCardDiv">
						<img :src="view.getImage('cows1_bid')" alt="Cows" />
						<div class="cowsOnPlaqueNumber">{{ spec[1] }}</div>
					</div>
					<div v-if="spec[0] === rf.HERD && spec[1] > 0" class="cowOnCardDivHerdIncome">
						<img :src="view.getImage('cows1_bid')" alt="Cows" />
						<div class="cowsOnPlaqueNumber">+{{ spec[1] / 2 }}</div>
					</div>
					<template v-if="personal.aidText">
						<br />
						{{ rf.SPEC_TEXT[spec[0]] }}
					</template>
					<br />
					VR: {{ rf.SPEC_VR[spec[0]] }}
					<template v-if="spec[0] === rf.HERD">
						<br />
						<span v-if="spec[1] === 6" class="redText">Max 6 Cows</span>
						<span v-else-if="controller.currentPlayerObj().cows < 2" class="redText">Not enough cows to add</span>
						<span v-else class="greenText">Select to increase Cows</span>
					</template>
				</div>
				<br />
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">Back</button>
			</template>

			<!-- USE HERD  -->
			<template v-if="store.context.action === rf.ACT_USE_HERD">
				<template v-for="(spec, idx) in controller.currentPlayerObj().specialists" :key="idx">
					<template v-if="spec[0] === rf.HERD">
						<div class="relative">
							<img :src="view.getImage('spec' + spec[0])" alt="Spec" class="singleCardImg" />

							<div class="cowOnCardDiv2">
								<img :src="view.getImage('cows1_bid')" alt="Cows" />
								<div class="cowsOnPlaqueNumber">{{ spec[1] }}</div>
							</div>
							<div v-if="spec[1] > 0" class="cowOnCardDivHerdIncome2">
								<img :src="view.getImage('cows1_bid')" alt="Cows" />
								<div class="cowsOnPlaqueNumber">+{{ spec[1] / 2 }}</div>
							</div>
						</div>

						<br />
						Choose the new Total Number of Cows for you Herd
						<br />
						<div v-if="spec[1] === 0 && controller.currentPlayerObj().cows >= 2" class="herdCowChoiceDiv" :class="{ selectedItem: store.context.chosenPrice === 2 }" @click="store.context.chosenPrice = 2">
							<img :src="view.getImage('cows1_bid')" alt="Cows" />
							<div class="cowsOnPlaqueNumber">2</div>
						</div>
						<div v-if="spec[1] <= 2 && controller.currentPlayerObj().cows >= 4 - spec[1]" class="herdCowChoiceDiv" :class="{ selectedItem: store.context.chosenPrice === 4 }" @click="store.context.chosenPrice = 4">
							<img :src="view.getImage('cows1_bid')" alt="Cows" />
							<div class="cowsOnPlaqueNumber">4</div>
						</div>
						<div v-if="spec[1] <= 4 && controller.currentPlayerObj().cows >= 6 - spec[1]" class="herdCowChoiceDiv" :class="{ selectedItem: store.context.chosenPrice === 6 }" @click="store.context.chosenPrice = 6">
							<img :src="view.getImage('cows1_bid')" alt="Cows" />
							<div class="cowsOnPlaqueNumber">6</div>
						</div>
					</template>
				</template>

				<br />
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">Cancel</button>
				<button class="actionsLineButton" @click="model.addHerdCows(store.context.chosenPrice)">Confirm Choice</button>
			</template>

			<!-- ADD MONUMENT  -->
			<template v-if="store.context.action === rf.ACT_BUILD_MON">
				<b>Build a monument</b>
				<span v-if="model.hasNomads(controller.currentPlayerObj())">
					<br />
					Your active Nomads allow you to build on any empty space
				</span>
				<span v-if="!model.hasNomads(controller.currentPlayerObj())">
					<br />
					You may not build adjacent to any existing monument
				</span>
				<span v-if="model.has_god(controller.currentPlayerObj(), rf.OBATALA)">
					<br />
					Monuments to place: {{ store.context.monumentsToPlace }}
				</span>
				<br />
				<br />
				Hubs Used:
				<span class="hubRangeSq hubRangeSq0">0</span>
				<span v-for="idx in Math.max(store.topMenuViews.hubRangesToHighlight.length - 1, 0)" :key="idx" class="hubRangeSq" :class="'hubRangeSq' + String(idx % 8)">
					{{ idx }}
				</span>
				<br />
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">Cancel</button>
				<button v-if="model.has_god(controller.currentPlayerObj(), rf.OBATALA) && store.context.monumentsToPlace === 1" class="actionsLineButton" @click="onlyPlaceOneMonument">Only Place 1 Monument</button>
			</template>

			<!-- ADD RESOURCE -->
			<template v-if="store.context.action === rf.ACT_BUILD_RES">
				Add a resource
				<br />
				<img class="resSelectImg" :src="view.getImage('res' + String(rf.WOOD_TILE))" :class="[{ selectedItem: store.context.itemBeingAdded === rf.WOOD_TILE }, store.remainingItems[rf.WOOD_TILE] > 0 ? 'availableRes' : 'runOutRes']" @click="localSetupPlaceResource(rf.WOOD_TILE)" />
				<img class="resSelectImg" :src="view.getImage('res' + String(rf.CLAY_TILE))" :class="[{ selectedItem: store.context.itemBeingAdded === rf.CLAY_TILE }, store.remainingItems[rf.CLAY_TILE] > 0 ? 'availableRes' : 'runOutRes']" @click="localSetupPlaceResource(rf.CLAY_TILE)" />
				<img class="resSelectImg" :src="view.getImage('res' + String(rf.IVORY_TILE))" :class="[{ selectedItem: store.context.itemBeingAdded === rf.IVORY_TILE }, store.remainingItems[rf.IVORY_TILE] > 0 ? 'availableRes' : 'runOutRes']" @click="localSetupPlaceResource(rf.IVORY_TILE)" />
				<img class="resSelectImg" :src="view.getImage('res' + String(rf.DIAMOND_TILE))" :class="[{ selectedItem: store.context.itemBeingAdded === rf.DIAMOND_TILE }, store.remainingItems[rf.DIAMOND_TILE] > 0 ? 'availableRes' : 'runOutRes']" @click="localSetupPlaceResource(rf.DIAMOND_TILE)" />
				<br />
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">Cancel</button>
			</template>

			<!-- ADD WATER  -->
			<template v-if="store.context.action === rf.ACT_BUILD_WATER">
				<b>Place a water tile on any free area</b>
				<div id="itemBeingAddedDiv">
					<img class="rot_img rot_img_enabled" @click="rotateNewTile(-1)" :src="view.getImage('rot_anticlockwise')" />
					<img class="newTileImg newTileWater" :src="view.getImage('res' + String(store.context.itemBeingAdded))" :style="rotationStyle" />
					<img class="rot_img rot_img_enabled" @click="rotateNewTile(1)" :src="view.getImage('rot_clockwise')" />
				</div>
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">Cancel</button>
			</template>

			<!-- ANYANWU LEVEL 3 -->
			<template v-if="store.context.action === rf.ACT_CHOOSE_ANYANWU_MON">
				<br />
				<b>Select a monument to raise to level 3</b>
				<br />
				<br />
			</template>

			<!-- ADD NEW CRAFTSMAN  -->
			<template v-if="store.context.action === rf.ACT_BUILD_CRAFTSMEN || store.context.action === rf.ACT_BUILD_PRI_CRAFTSMAN || store.context.action === rf.ACT_BUILD_SEC_CRAFTSMAN">
				<b>
					Add a craftsman
					<br />
					A primary resource must be within range that is not already within range of a craftsman of the same type
				</b>
				<br />
				<template v-for="(cman, idx) in rf.CRAFTSMEN_TILES" :key="idx">
					<div
						v-if="cmanDisplayInfo(cman, 0)"
						class="techAndCmanDiv"
						@click="localSetupPlaceCraftsman(cman)"
						:style="{
							padding: !cmanDisplayInfo(cman, 1) ? '5px' : '',
						}">
						<!-- TECH-->
						<template v-if="cmanDisplayInfo(cman, 1)">
							<img :src="view.getImage('tech' + String(cmanDisplayInfo(cman, 2)))" alt="Tech" class="techChoiceImg" />
							<br />
						</template>
						<template v-else>
							You already have
							<br />
							this Technology
							<br />
							Cost: {{ rf.COW_COST_TO_BUILD_CMAN[cman] }}
							<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
							VP +{{ rf.CRAFTSMEN_SCORE[cman] }}
							<br />
						</template>
						<div class="cmanActionHolder">
							<img :src="view.getImage('craftsman' + String(cman) + (rf.ROTATABLE_TILES.includes(cman) ? '_v' : ''))" :class="{ noMoreCman: store.remainingItems[cman] <= 0 }" alt="Cman" class="cmanChoiceImg" />
							<div class="remainingCmanAction">({{ store.remainingItems[cman] }})</div>
						</div>
					</div>
				</template>
				<br />
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">Cancel</button>
				<button class="actionsLineButton" @click="model.endAddingCraftsmen">Confirm Craftsmen - Set Prices</button>
			</template>

			<!-- ADD CRAFTSMAN  -->
			<template v-if="store.context.itemBeingAdded !== -1 && (store.context.action === rf.ACT_BUILD_PRI_CRAFTSMAN || store.context.action === rf.ACT_BUILD_SEC_CRAFTSMAN)">
				<span v-if="!model.hasTechForCman(store.context.itemBeingAdded)">
					<br />
					Taking tech for this craftsman is +{{ rf.TECH_VR[cmanDisplayInfo(store.context.itemBeingAdded, 2)] }} VR
				</span>
				<br />
				Placing this Craftman costs {{ rf.COW_COST_TO_BUILD_CMAN[store.context.itemBeingAdded] }} cows
				<template v-if="model.hasActiveBuilder(controller.currentPlayerIndex())">
					<template v-if="Math.max(0, rf.COW_COST_TO_BUILD_CMAN[store.context.itemBeingAdded] - 2) == 0">(to your builder)</template>
					<template v-else>({{ Math.min(rf.COW_COST_TO_BUILD_CMAN[store.context.itemBeingAdded], 2) }} to your builder, and {{ Math.max(0, rf.COW_COST_TO_BUILD_CMAN[store.context.itemBeingAdded] - 2) }} to the common stock)</template>
				</template>
				<template v-else>(to the common stock)</template>
				<div id="itemBeingAddedDiv">
					<img class="rot_img" :class="rf.ROTATABLE_TILES.includes(store.context.itemBeingAdded) ? 'rot_img_enabled' : 'rot_img_disabled'" @click="rotateNewTile(-1)" :src="view.getImage('rot_anticlockwise')" />
					<img class="newTileImg newTileCraftsman" :src="view.getImage('craftsman' + String(store.context.itemBeingAdded))" :style="rotationStyle" alt="Craftsman" />
					<img class="rot_img" :class="rf.ROTATABLE_TILES.includes(store.context.itemBeingAdded) ? 'rot_img_enabled' : 'rot_img_disabled'" @click="rotateNewTile(1)" :src="view.getImage('rot_clockwise')" />
				</div>
				<br />
				Hubs Used:
				<span class="hubRangeSq hubRangeSq0">0</span>
				<span v-for="idx in Math.max(store.topMenuViews.hubRangesToHighlight.length - 1, 0)" :key="idx" class="hubRangeSq" :class="'hubRangeSq' + String(idx % 8)">
					{{ idx }}
				</span>
				<br />
				<br />
			</template>

			<!-- SET PRICE -->
			<template v-if="store.context.action === rf.ACT_SET_PRICES">
				<template v-for="(craftsmanTile, index) in rf.CRAFTSMEN_TILES" :key="index">
					<div
						class="priceSettingDiv"
						v-if="
							controller
								.currentPlayerObj()
								.craftsmen.map(function (el) {
									return el[1]
								})
								.indexOf(craftsmanTile) > -1
						">
						<img class="priceTileImg" :src="view.getImage('craftsman' + String(craftsmanTile) + (rf.ROTATABLE_TILES.includes(craftsmanTile) ? '_v' : ''))" alt="Craftsman" />
						<br />
						<img v-if="model.getPriceForCraftsman(controller.currentPlayerObj(), craftsmanTile, false) === 1 || model.has_god(controller.currentPlayerObj(), rf.DZIVA)" :src="view.getImage('cows1')" :class="{ cowPriceChosenImg: localGetPrice(craftsmanTile) === 1 }" class="cowPriceImg" alt="1 cow" @click="localSetPrice(craftsmanTile, 1)" />
						<img v-if="model.getPriceForCraftsman(controller.currentPlayerObj(), craftsmanTile, false) <= 2 || model.has_god(controller.currentPlayerObj(), rf.DZIVA)" :src="view.getImage('cows2')" :class="{ cowPriceChosenImg: localGetPrice(craftsmanTile) === 2 }" class="cowPriceImg" alt="1 cow" @click="localSetPrice(craftsmanTile, 2)" />
						<img v-if="model.getPriceForCraftsman(controller.currentPlayerObj(), craftsmanTile, false) <= 3" :src="view.getImage('cows3')" :class="{ cowPriceChosenImg: localGetPrice(craftsmanTile) === 3 }" class="cowPriceImg" alt="1 cow" @click="localSetPrice(craftsmanTile, 3)" />
					</div>
				</template>
				<br />
				<template v-if="failedToJustPlaceCraftsmanFlag() >= 1">
					<span class="orangeText">CAUTION: YOU DID NOT PLACE ANY CRAFTSMEN</span>
					<br />
				</template>
				<button class="actionsLineButton" @click="resetWholePlayerTurn">Reset Whole Turn</button>
				<button v-if="failedToJustPlaceCraftsmanFlag() <= 1" class="actionsLineButton" @click="model.setCraftsmanPrice(controller.currentPlayerObj(), store.context.choosingPrices)">Confirm Price</button>
			</template>

			<!-- RAISE MON -->
			<template v-if="store.context.action === rf.ACT_RAISE_MON">
				<template v-if="store.context.upgradingMonumentProcess.length === 0">
					Select a Monument to Raise
					<span v-if="model.has_god(controller.currentPlayerObj(), rf.TSUI_GOAB)">
						<br />
						Tsui-Goab allows you to upgrade monuments with any combination of goods
					</span>
					<span v-if="model.has_god(controller.currentPlayerObj(), rf.ATETE)">
						<br />
						Atete allows you to use each resource twice
					</span>
					<span v-if="model.has_god(controller.currentPlayerObj(), rf.OYA) && 1 === 2">
						<br />
						Oya allows you to place a monument after making one extra ritual good
						<br />
						<button v-if="!store.context.OYAused" class="actionsLineButton" @click="setupOya()">Create Monument with 1 Ritual good</button>
						<span v-else>You have already used Oya's power</span>
					</span>
				</template>
				<span v-if="store.context.upgradingMonumentProcess.length > 0">
					Upgrading this monument requires
					{{ store.context.upgradingMonumentProcess[0][1] }} Ritual Good
					<span v-if="store.context.upgradingMonumentProcess[0][1] !== 1">s</span>
					<span v-if="store.context.upgradingMonumentProcess[0] > 1">s</span>
					<br />
					<br />
					Current Cost:
					<span v-html="getCurrentUpgradeCost()"></span>
					<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />

					<span v-if="store.context.currentRitualGood.length === 0">
						<br />
						<br />
						Choose a craftsman to produce a ritual good
					</span>
					<span v-if="store.context.currentRitualGood.length === 1">
						<br />
						<br />
						Choose a resource
						<template v-if="!store.context.ignoreAjeShaluga && model.has_god(controller.currentPlayerObj(), rf.AJE_SHALUGA_OLD) && model.getPlayerIndexForCraftsmanPriIndex(store.context.currentRitualGood[0][0]) === controller.currentPlayerIndex()">
							to skip a primary ritual good, or
							<button class="actionsLineButton" @click="skipResource">Skip this resource</button>
							instead, or
							<button class="actionsLineButton" @click="store.context.ignoreAjeShaluga = true">Ignore Aje-Shaluga's power</button>
						</template>
					</span>
					<span v-if="store.context.currentRitualGood.length === 2">
						<br />
						<br />
						Choose a Primary Craftsman to support the Secondary Craftsman
					</span>
					<span v-if="store.context.currentRitualGood.length === 3">
						<br />
						<br />
						Choose a Resource to support the Primary Craftsman
					</span>

					<template v-if="store.context.currentRitualGood.length !== 1">
						<br />
						<br />
						Hub Range:
						<span class="hubRangeSq hubRangeSq0">0</span>
						<span v-for="idx in Math.max(store.topMenuViews.hubRangesToHighlight.length - 1, 0)" :key="idx" class="hubRangeSq" :class="'hubRangeSq' + String(idx % 8)">
							{{ idx }}
						</span>
					</template>
				</span>
				<br />
				<button class="actionsLineButton" @click="cancelRaising">Cancel Raising</button>
				<button v-if="store.context.canSelectRaiseMonument.length === 0 && store.context.actionError !== 'No monument to raise (No more monuments / not enough cows / not enough available craftsmen)'" class="actionsLineButton" @click="funcs.importModel(store.lastMonumentResetData, true)">Restart Current Raise</button>
				<button v-if="store.context.OYAused || (store.history[store.history.length - 1][0] === rf.HIST_RAISE_MON && (store.context.canSelectRaiseMonument.length > 0 || store.context.actionError === 'No monument to raise (No more monuments / not enough cows / not enough available craftsmen)'))" class="actionsLineButton" @click="localConfirmRaising">Confirm Raising</button>
			</template>

			<template v-if="store.context.action === rf.ACT_OYA_RUITUALGOOD">
				Current Cost:
				<span v-html="getCurrentUpgradeCost()"></span>
				<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />

				<span v-if="store.context.currentRitualGood.length === 0">
					<br />
					<br />
					Choose a craftsman to produce a ritual good
				</span>
				<span v-if="store.context.currentRitualGood.length === 1">
					<br />
					<br />
					Choose a resource
				</span>
				<span v-if="store.context.currentRitualGood.length === 2">
					<br />
					<br />
					Choose a Primary Craftsman to support the Secondary Craftsman
				</span>
				<span v-if="store.context.currentRitualGood.length === 3">
					<br />
					<br />
					Choose a Resource to support the Primary Craftsman
				</span>

				<template v-if="store.context.currentRitualGood.length !== 1">
					<br />
					<br />
					Hub Range:
					<span class="hubRangeSq hubRangeSq0">0</span>
					<span v-for="idx in Math.max(store.topMenuViews.hubRangesToHighlight.length - 1, 0)" :key="idx" class="hubRangeSq" :class="'hubRangeSq' + String(idx % 8)">
						{{ idx }}
					</span>
				</template>
				<br />
				<button class="actionsLineButton" @click="funcs.importModel(store.lastMonumentResetData, true)">Cancel Oya Ritual Good</button>
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">Cancel Raising</button>
			</template>

			<span class="actionError" v-if="store.context.actionError !== ''">
				<br />
				{{ store.context.actionError }}
			</span>
		</div>
	</template>
</template>

<style scoped>
.cowsOnPlaqueDivYellowBorder {
	outline: 3px solid yellow !important;
}

.messageSuccess {
	color: darkgreen;
	background-color: lightblue;
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

.noSpecsTextDiv {
	padding: 5px;
}

#plaqueLine,
#bidLine {
	overflow: none;
	white-space: nowrap;
	margin-bottom: 5px;
}

#passKickoutButton,
#cancelKickoutButton {
	margin-right: 100px;
}

#mapInspectorButtonDiv {
	display: inline-block;
	vertical-align: middle;
}

.redText {
	color: red;
}

.greenText {
	color: darkgreen;
}

.orangeText {
	font-weight: bolder;
	color: darkgoldenrod;
}

.relative {
	position: relative;
	display: inline-block;
}

.optionsGroup {
	display: inline-block;
	padding: 2px;
	margin: 5px;
	text-align: center;
	border: 5px solid gray;
	width: fit-content;
	height: fit-content;
	vertical-align: bottom;
}

.optionsHeader {
	font-size: 18px;
	/*20px*/
	font-weight: bold;
	color: gray;
}

.intro_monumentDiv {
	border-radius: 100%;
	border: solid black;
	box-sizing: border-box;
	width: 40px;
	height: 40px;
	border: 3px solid black;
	font-size: 30px;
	color: white;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
	text-align: center;
	position: relative;
	display: inline-block;
}

.intro_notEnoguhCraftsmenForMon {
	position: absolute;
	top: 27px;
	left: -3px;
	background-color: red;
	border: 2px solid white;
	width: 40px;
	height: 13px;
	box-sizing: border-box;
}

.intro_notEnoguhCraftsmenForMon img {
	width: 100%;
	height: 100%;
	position: absolute;
	top: 0px;
	left: 0px;
}

.intro_items_list_div {
	width: fit-content;
	text-align: left;
	margin: 9px auto;
}

.intro_imgDiv {
	width: 40px;
	height: 40px;
	vertical-align: middle;
	margin-bottom: 2px;
	margin-top: 2px;
	position: relative;
	display: inline-block;
}

.intro_img {
	width: 100%;
	height: 100%;
}

.intro_resNotUsed,
.intro_resUsed,
.intro_inRange,
.intro_OutOfRange {
	border-radius: 100%;
	width: 20px;
	height: 20px;
	border: 1px solid black;
	display: inline-block;
	vertical-align: middle;
	margin-bottom: 2px;
	margin-top: 2px;
}

.intro_OutOfRange {
	background-color: lightgray;
}

.intro_inRange {
	background-color: yellow;
}

.intro_resUsed {
	background: linear-gradient(to top left, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 2px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 2px), rgba(0, 0, 0, 0) 100%), linear-gradient(to top right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 2px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 2px), rgba(0, 0, 0, 0) 100%);
}

.actionError {
	color: red;
	font-weight: bolder;
}

.priceSettingDiv {
	border: 1px solid black;
	display: inline-block;
	margin: 5px;
}

.actionsLineButton {
	margin: 10px;
	/*width: 100px;*/
	width: fit-content;
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 5px;
}

.actionsLineButton:hover {
	background-color: lightgrey;
}

.newTurnOrderDiv {
	vertical-align: middle;
	border: 1px solid black;
	width: 50px;
	height: 50px;
	display: inline-block;
	position: relative;
	font-size: 30px;
	font-weight: bolder;
	line-height: 50px;
	margin-right: 10px;
	margin-bottom: 5px;
}

.biddingPlaque {
	border: 1px solid black;
	margin-right: 5px;
	width: 150px;
	height: 150px;
	display: inline-block;
	position: relative;
}

.shadOwnerDiv {
	position: absolute;
	right: 0px;
	bottom: 0px;
	width: 33px;
	height: 33px;
}

.newTurnOrderDiv img,
.cowsOnPlaqueDiv img,
.biddingPlaque img {
	width: 100%;
	height: 100%;
}

.cowsOnPlaqueDiv {
	border: 2px solid black;
	position: absolute;
	top: 43px;
	left: 43px;
	width: 65px;
	height: 47px;
}

.cowOnCardDiv {
	border: 2px solid black;
	position: absolute;
	top: 68px;
	left: 72px;
	width: 65px;
	height: 47px;
}

.cowOnCardDivHerdIncome {
	border: 2px solid black;
	position: absolute;
	top: 130px;
	left: 72px;
	width: 65px;
	height: 47px;
}

.cowOnCardDiv2 {
	border: 2px solid black;
	position: absolute;
	top: 68px;
	left: 47px;
	width: 65px;
	height: 47px;
}

.cowOnCardDivHerdIncome img,
.cowOnCardDivHerdIncome2 img,
.resSelectImg img,
.herdCowChoiceDiv img,
.cowOnCardDiv2 img {
	width: 100%;
	height: 100%;
}

.cowOnCardDivHerdIncome2 {
	border: 2px solid black;
	position: absolute;
	top: 130px;
	left: 47px;
	width: 65px;
	height: 47px;
}

.cowOnCardDiv img {
	width: 100% !important;
	height: 100% !important;
}

.usedSpec img {
	opacity: 0.5;
}

.cowsOnPlaqueNumber {
	position: relative;
	top: -53px;
	/*left: 17px;*/
	display: block;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
	color: white;
	font-size: 45px;
}

.specChoiceDiv,
.godChoiceDiv {
	display: inline-block;
	border: 2px solid black;
	margin: 2px;
	vertical-align: middle;
	position: relative;
	min-height: fit-content;
}

.specChoiceDivNoText,
.godChoiceDivNoText {
	display: inline-block;
	border: 2px solid black;
	border-radius: 10px;
	margin: 2px;
	vertical-align: middle;
	position: relative;
	width: 160px;
	box-sizing: border-box;
	font-size: 0;
}

.specChoiceDivNoText img,
.godChoiceDivNoText img {
	width: 100%;
}

.godChoiceDiv {
	width: 125px;
	height: 405px;
}

.specChoiceDiv {
	width: 175px;
	min-height: 395px;
	height: fit-content;
}

.specChoiceDivSingle,
.godChoiceDivSingle {
	display: inline-block;
	margin: 2px;
	vertical-align: middle;
	position: relative;
	width: 200px;
	min-height: 410px;
	height: fit-content;
}

.specChoiceImgSingle,
.godChoiceImgSingle {
	border-radius: 10px;
}

.specChoiceDivSingleNoText,
.godChoiceDivSingleNoText {
	display: inline-block;
	margin: 2px;
	vertical-align: middle;
	position: relative;
	width: 160px;
	height: fit-content;
}

.specChoiceDivSingleNoText img,
.godChoiceDivSingleNoText img,
.specChoiceDivSingle img,
.godChoiceDivSingle img {
	border: 1px solid black;
	width: 100%;
}

.specChoiceImg,
.godChoiceImg {
	width: 100%;
	border-radius: 7px;
	border: 1px solid black;
	box-sizing: border-box;
}

.godChoiceTextDiv {
	padding: 2px;
}

.singleCardImg {
	border: 2px solid black;
	width: 160px;
}

.specChoiceDiv:hover,
.specChoiceDivNoText:hover,
.godChoiceDiv:hover,
.godChoiceDivNoText:hover {
	border: 2px solid yellow;
}

.specChoiceDiv.fixedBorder:hover,
.godChoiceDiv.fixedBorder:hover {
	border: 2px solid black;
}

.usedSpec:hover {
	border: 2px solid black;
}

.herdCowChoiceDiv {
	border: 4px solid black;
	display: inline-block;
	margin-right: 5px;
	margin-top: 5px;
	position: relative;
	width: 65px;
	height: 47px;
}

.herdCowChoiceDiv:hover {
	border: 4px solid yellow;
}

.selectedItem {
	border: 4px solid lightgreen !important;
}

.resSelectImg {
	border: 4px solid black;
	display: inline-block;
	margin-right: 5px;
	margin-top: 5px;
	width: 47px;
	height: 47px;
}

.availableRes:hover {
	border: 4px solid yellow;
}

.runOutRes {
	opacity: 0.5;
}

.techAndCmanDiv {
	border: 2px solid black;
	display: inline-block;
	margin-right: 5px;
	margin-bottom: 5px;
	vertical-align: bottom;
}

.techAndCmanDiv:hover {
	border: 2px solid yellow;
}

.techChoiceImg {
	width: 200px;
	height: 130px;
	border-radius: 10px;
}

.cmanChoiceImg {
	height: 80px;
	border: 1px solid black;
	margin: 2px;
}

.cowPriceImg {
	margin: 4px;
	border: 4px solid black;
	/*height: 62px;*/
}

.cowPriceImg:hover {
	border: 4px solid yellow;
}

.cowPriceChosenImg {
	border: 4px solid lightgreen !important;
}

.miniCowImg {
	vertical-align: middle;
	width: 30px;
	height: 30px;
	border: 1px solid white;
}

.rot_img {
	width: 50px;
	height: 50px;
	border: 1px solid black;
	border-radius: 15px;
	margin: 5px;
}

.rot_img_enabled:hover {
	border: 1px solid yellow;
}

.rot_img_disabled {
	opacity: 0.3;
}

.newTileImg {
	margin: 5px;
}

.newTileCraftsman {
	width: 100px;
	border: 1px solid black;
	box-sizing: border-box;
}

.newTileWater {
	width: 100px;
	border: #000 solid 1px;
	box-sizing: border-box;
}

.priceTileImg {
	vertical-align: middle;
	height: 100px;
	padding: 0px;
	border: 1px solid black;
	margin-top: 5px;
	box-sizing: border-box;
}

#itemBeingAddedDiv {
	border: 1px solid black;
	width: fit-content;
	margin: 2px auto;
	height: 100px;
	padding: 5px;
	line-height: 150px;
}

#actions,
#gameEndDiv {
	/*margin: 0;*/
	font-weight: bolder;
	/*text-align: center;*/
	/*background-color: lightsalmon;*/
}

#rewindErrorText,
#loggedOutText,
#errorText {
	/*margin: 0;
    width: 100%;*/
	font-weight: bolder;
	/*text-align: center;*/
	background-color: lightgoldenrodyellow;
	color: darkred;
}

#loggedOutText {
	font-size: 20px;
}

#gameEndDiv {
	font-size: 30px;
}

.winningTribeImg {
	vertical-align: middle;
	border: 2px solid black;
	width: 100px;
	height: 100px;
}

.winningMythImg {
	vertical-align: middle;
	border: 2px solid black;
	height: 200px;
}

.actionsLineButton.mainActionButton {
	margin: 4px;
	padding: 10px;
	/*width: 119px;
    height: 76px;*/
}

.crossBackground_Atete {
	z-index: 20;
	position: absolute;
	top: 0px;
	left: 0px;
	width: 100%;
	height: 100%;
	background: linear-gradient(to top left, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 4px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 4px), rgba(0, 0, 0, 0) 100%), linear-gradient(to top right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 4px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 4px), rgba(0, 0, 0, 0) 100%), linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 4px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 4px), rgba(0, 0, 0, 0) 100%), linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) calc(50% - 4px), rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) calc(50% + 4px), rgba(0, 0, 0, 0) 100%);
}

.linkOther {
	/*color: lightblue;*/
	text-align: center;
	/*margin: 14px 16px;*/
	/*margin: 10px;*/
	text-decoration: none;
	/*font-size: 17px;*/
	outline: none;
}

.linkOther:hover {
	/*background: #ddd;*/
	color: darkblue;
}

.bidCow {
	vertical-align: middle;
	width: 29px;
	height: 25px;
	margin-left: 5px;
	margin-right: 5px;
}

.noMoreCman {
	opacity: 0.5;
}

.cmanActionHolder {
	margin: auto;
	width: fit-content;
	position: relative;
	padding: 0px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.remainingCmanAction {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	color: white;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
	font-size: 20px;
}

.changedVR {
	background-color: yellow;
	color: darkred;
	font-size: 16px;
}

#resignConfirmDiv,
#kickoutDiv {
	margin: 20px;
}

#resignConfirmDiv {
	font-weight: bolder;
}

#IOSfixH6 {
	display: inline;
	margin: 0;
	padding: 0;
	font-size: 10px;
	/* Optional: Set the desired font size */
	line-height: 10px;
	background-color: red;
	position: relative;
	top: -10px;
}

.IOSfix-wrapper {
	margin-top: -1em;
}

.IOSfix-wrapper h6 {
	margin: 0;
	padding: 0;
	font-size: 1em;
}

#mapInspectFirstMon,
#mapInspectBid {
	vertical-align: middle;
}

.cheatOptionsContainer {
	display: flex;
	gap: 20px;
	justify-content: center;
}

.cheatOptionDiv {
	border: 2px solid black;
	padding: 10px;
}

#bugSuccessText {
	color: darkgreen;
	background-color: lightblue;
}
</style>
