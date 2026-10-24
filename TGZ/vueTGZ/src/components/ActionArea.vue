<script setup>
import TurnNudge from "./utils/TurnNudge.vue"
import MapInspectorButton from "./utils/MapInspectorButton.vue"
import HubRangeLegend from "./utils/HubRangeLegend.vue"
import * as rf from "../js/TGZreference"
import * as map from "../js/TGZmap"
import * as view from "../js/TGZview"
import * as model from "../js/TGZmodel"
import * as funcs from "../js/TGZfuncs"
import * as controller from "../js/TGZcontroller"
import * as Bot from "../js/TGZbot"
import * as IO from "../js/TGZ_IO"

import { ref, computed, watch, onUnmounted } from "vue"

import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/TGZpersonal.js"
const personal = usePersonalStore()

import i18n from "../i18n"
const t = i18n.global.t

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
	res.push([0, t("actionArea.passWithCows", { count: getCurrentCows(0), cows: t(getCurrentCows(0) !== 1 ? "common.cows" : "common.cow") })])
	for (let i = 0; i < possibleBids.length; i++) {
		let label = String(possibleBids[i])
		if (model.eleguaAvailable()) label += t("actionArea.bidWithCowsElegua", { cost: possibleBids[i] - 3 <= 0 ? t("actionArea.free") : String(possibleBids[i] - 3) })
		label += t("actionArea.bidWithCows", { count: getCurrentCows(possibleBids[i]), cows: t(getCurrentCows(possibleBids[i]) !== 1 ? "common.cows" : "common.cow") })
		res.push([possibleBids[i], label])
	}
	return res
}

function changeBid(dir) {
	const options = getBidRange().map((option) => option[0])
	if (options.length === 0) return
	let idx = options.indexOf(store.context.selectedBid)
	if (idx === -1) idx = 0
	idx = Math.max(0, Math.min(options.length - 1, idx + dir))
	store.context.selectedBid = options[idx]
}

function getBidAmountLabel() {
	return store.context.selectedBid === 0 ? t("actionArea.pass") : String(store.context.selectedBid)
}

function getRitualGoodsDone() {
	return Math.max(0, store.context.upgradingMonumentProcess.length - 1)
}

function getRequiredRitualGoods() {
	if (store.context.upgradingMonumentProcess.length === 0) return 0
	const level = store.context.upgradingMonumentProcess[0][1]
	if (model.has_god(controller.currentPlayerObj(), rf.TIURAKH) && level >= 2) return level - 1
	return level
}

function getGoodCraftsman(good) {
	return map.getCraftsmanDataFromAnySq(good[0][0], true)
}

function getGoodResourceIndexes(good) {
	return good.slice(1).filter((item) => typeof item === "number" && item >= 0)
}

function getGoodResourceImage(resourceIndex) {
	const tile = rf.resSqToTile(store.coords[resourceIndex])
	return view.getImage("res" + String(tile))
}

function getActionsTakenText() {
	const labels = {
		[rf.ACT_BUILD_MON]: t("actionArea.build") + " " + t("actionArea.monument"),
		[rf.ACT_RAISE_MON]: t("actionArea.raise") + " " + t("actionArea.monuments"),
		[rf.ACT_BUILD_CRAFTSMEN]: t("actionArea.place") + " " + t("actionArea.craftsmen"),
		[rf.ACT_CHOOSE_god]: t("actionArea.choose") + " " + t("actionArea.god"),
		[rf.ACT_CHOOSE_SPEC]: t("actionArea.choose") + " " + t("actionArea.specialist"),
		[rf.ACT_USE_SPEC]: t("actionArea.use") + " " + t("actionArea.specialist"),
		[rf.ACT_BUILD_RES]: t("actionArea.addResource"),
		[rf.ACT_BUILD_WATER]: t("actionArea.placeWater"),
		[rf.ACT_USE_HERD]: t("actionArea.use") + " " + rf.SPEC_NAMES[rf.HERD],
		[rf.ACT_SET_PRICES]: t("actionArea.confirmPrice"),
		[rf.ACT_BUILD_PRI_CRAFTSMAN]: t("actionArea.place") + " " + t("actionArea.craftsmen"),
		[rf.ACT_BUILD_SEC_CRAFTSMAN]: t("actionArea.place") + " " + t("actionArea.craftsmen"),
	}
	const texts = store.context.actionsTaken.map((action) => labels[action]).filter(Boolean)
	return texts.length ? texts.join(", ") : t("common.none")
}

function getLastUpdateText() {
	if (!personal.latestUpdate) return ""
	return new Date(personal.latestUpdate * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
	if (pos === 1) return t("common.ordinal1")
	if (pos === 2) return t("common.ordinal2")
	if (pos === 3) return t("common.ordinal3")
	if (pos === 4) return t("common.ordinal4")
	if (pos === 5) return t("common.ordinal5")
}

function getOrdinal(num) {
	if (num === 2) return t("common.ordinal2")
	else if (num === 3) return t("common.ordinal3")
	else if (num === 4) return t("common.ordinal4")
	else if (num === 5) return t("common.ordinal5")
}

function getReason(num, idx) {
	if (num === 1) return (idx !== 0 ? t("common.next") : "") + t("actionArea.highestDifference")
	else if (num === 2) return (idx !== 0 ? t("common.next") : "") + t("actionArea.xangoTie")
	else if (num === 3) return (idx !== 0 ? t("common.next") : "") + t("actionArea.highestTotalVp")
	else if (num === 4) return (idx !== 0 ? t("common.next") : "") + t("actionArea.earlierTurnOrder")
	else if (num === 5) return t("actionArea.nextInOrder")
	else return t("actionArea.unfavourableFamines")
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
	let eleguaDiscount = 0
	if (model.eleguaAvailable()) eleguaDiscount = Math.min(cowCost, 3)
	model.addHistory(rf.HIST_BID, controller.currentPlayerIndex(), 0, [parseInt(cowCost), pos, -1, eleguaDiscount])
	localEndPlayerTurn()
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
		store.context.actionError = t("actionArea.noRemainingCraftsmen")
		return
	}

	// VR CHECK
	if (!model.hasTechForCman(cman)) {
		let techs = model.getAvailableTechs(-1)
		let techCard = cman * 2 + 1
		if (techs.includes(cman * 2)) techCard = cman * 2
		if (!model.has_god(controller.currentPlayerObj(), rf.GU) && model.getVR(controller.currentPlayerObj()) + rf.TECH_VR[techCard] > 40) {
			store.context.actionError = t("actionArea.techOver40")
			return
		}
		if (model.has_god(controller.currentPlayerObj(), rf.GU) && model.getVR(controller.currentPlayerObj()) + 1 > 40) {
			store.context.actionError = t("actionArea.techOver40")
			return
		}
	}

	// COW CHECK
	if (controller.currentPlayerObj().cows < rf.COW_COST_TO_BUILD_CMAN[cman]) {
		store.context.actionError = t("actionArea.notEnoughCowsCraftsman")
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
			store.context.actionError = t("actionArea.mustUseRain")
			return
		} else if (controller.currentPlayerObj().specialists[i][0] === rf.SHAMAN && controller.currentPlayerObj().specialists[i][1] !== 0 && !store.context.actionsTaken.includes(rf.ACT_BUILD_RES)) {
			store.context.actionError = t("actionArea.mustUseShaman")
			return
		}
	}
	store.context.actionError = ""
	store.context.action = rf.ACT_END_BUILD
	if (store.context.actionsTaken.length === 0) store.context.actionError = t("actionArea.noActionsTaken")
}

function clickedSpecialistChoice(spec) {
	store.context.actionError = ""
	// VR check
	if (model.getVR(controller.currentPlayerObj()) + rf.SPEC_VR[spec] > 40) {
		store.context.actionError = t("actionArea.takingSpecOver40", { name: rf.SPEC_NAMES[spec] })
		return
	}
	// Cow check
	if (controller.currentPlayerObj().cows - rf.SPEC_COST[spec] < 0) {
		store.context.actionError = t("actionArea.paySpecCost", { name: rf.SPEC_NAMES[spec] })
		return
	}

	store.context.itemBeingAdded = spec
}

function clickedgodChoice(god) {
	store.context.actionError = ""

	// god is included, so don't add it on again
	if (model.getVR(controller.currentPlayerObj(), true, god) > 40) {
		store.context.actionError = t("actionArea.takingGodOver40", { name: rf.god_NAMES[god] })
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

	let ret = "<b>" + String(hubCosts) + "</b> " + t(hubCosts !== 1 ? "history.hubs" : "history.hub") + " "
	for (let i = 0; i < cmenCosts.length; i++) {
		if (cmenCosts[i] !== 0) {
			ret += '<span class="mainEntryPlayer" style="background-color: ' + personal.getCorrectedColourHex(store.players[i].colour) + ";color: " + (personal.getCorrectedColour(store.players[i].colour) === rf.WHITE || personal.getCorrectedColour(store.players[i].colour) === rf.YELLOW ? "black" : "white") + '">' + funcs.escapeHtml(store.players[i].displayName) + "</span>" + String(cmenCosts[i]) + " "
		}
	}
	// Total
	ret += " " + t("history.totalLabel") + " " + String(cmenCosts.reduce((a, b) => a + b, 0) + hubCosts) + " "
	return ret
}

function handleAutoPassCheckbox() {
	document.querySelector("#autoPassResponse").innerHTML = ""
	const autoPass = document.querySelector("#autoPassCheckbox").checked
	IO.saveAutoPass(autoPass)
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

function currentKickoutTarget() {
	return controller.currentPlayerObj().name
}
function myKickoutVote() {
	return store.kickoutVotesData[personal.name]
}
function canKickoutNow() {
	const target = currentKickoutTarget()
	const myVote = myKickoutVote()
	if (myVote) {
		if (myVote[0] === target) {
			if (new Date().getTime() - myVote[1] > rf.KICKOUT_SOLO_DELAY_MS) return true
		} else if (new Date().getTime() - myVote[1] > rf.KICKOUT_SOLO_DELAY_MS) {
			// My 2 day old vote is for someone else, so clear the requirement for the target
			personal.kickoutRequired = 0
			return false
		}
	}
	if (store.kickoutVoteThreshold === 1) return true
	return false
}
function kickoutVoteCount() {
	return Object.values(store.kickoutVotesData).filter((vote) => vote[0] === currentKickoutTarget()).length
}
function kickoutVoters() {
	let names = []
	for (const voter in store.kickoutVotesData) {
		const vote = store.kickoutVotesData[voter]
		if (vote[0] === currentKickoutTarget()) names.push(voter)
	}
	return names.join(", ")
}
function isLastVoteRequired() {
	return kickoutVoteCount() + 1 >= store.kickoutVoteThreshold
}
const soloKickoutCountdown = ref("")
function updateSoloKickoutCountdown() {
	const myVote = myKickoutVote()
	if (!myVote || myVote[0] !== currentKickoutTarget()) {
		soloKickoutCountdown.value = ""
		return
	}
	const remainingMs = Math.max(rf.KICKOUT_SOLO_DELAY_MS - (new Date().getTime() - myVote[1]), 0)
	const totalSeconds = Math.floor(remainingMs / 1000)
	const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0")
	const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0")
	const seconds = String(totalSeconds % 60).padStart(2, "0")
	soloKickoutCountdown.value = hours + ":" + minutes + ":" + seconds
	if (remainingMs <= 0) {
		soloKickoutCountdown.value = ""
		return
	}
}
watch(
	() => store.kickoutVotesData[personal.name],
	() => {
		updateSoloKickoutCountdown()
		if (soloKickoutCountdown.value !== "") {
			if (personal.kickoutCountdownIntervalTimer != undefined) clearInterval(personal.kickoutCountdownIntervalTimer)
			personal.kickoutCountdownIntervalTimer = setInterval(updateSoloKickoutCountdown, 1000)
		}
	},
	{ immediate: true }
)
onUnmounted(() => {
	if (personal.kickoutCountdownIntervalTimer != undefined) clearInterval(personal.kickoutCountdownIntervalTimer)
})

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

function continueAfterAnyanwu() {
	store.clearVars(true)
	store.context.action = rf.ACT_NONE
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
			{{ $t("actionArea.loggedOutPlease") }}
			<a href="/register">{{ $t("actionArea.register") }}</a>
			{{ $t("actionArea.or") }}
			<a href="/login">{{ $t("actionArea.login") }}</a>
			{{ $t("actionArea.toPlayGame") }}
			<br />
		</div>
		<br />
	</template>

	<!-- TOURNAMENT ADMIN KICKOUT BUTTON -->
	<template v-if="rf.SUPER_USERS.includes(personal.name)">
		<template v-if="confirmTournamentReplacement === false">
			<button class="actionsLineButton" @click="confirmTournamentReplacement = true">
				{{ $t("actionArea.confirmReplacementFor") }}
				<b>{{ controller.currentPlayerObj().name }}</b>
			</button>
		</template>
		<template v-if="confirmTournamentReplacement === true">
			<br />
			<br />
			{{ $t("actionArea.sureReplace") }}
			<b>{{ controller.currentPlayerObj().name }}</b>
			?
			<br />
			<br />
			{{ $t("actionArea.actionCannotBeUndone") }}
			<br />
			<br />
			{{ $t("actionArea.deletesRewindData") }}
			<br />
			<br />
			{{ $t("actionArea.adminWillReplace") }}
			<b>{{ controller.currentPlayerObj().name }}</b>
			.
			<br />
			<br />
			{{ $t("actionArea.mrMooNotification") }}
			<br />
			<br />
			<button class="actionsLineButton" @click="confirmTournamentReplacement = false">{{ $t("common.cancel").toUpperCase() }}</button>
			<button class="actionsLineButton" @click="localReplaceExternalTournamentPlayer()">
				{{ $t("actionArea.confirmKickReplacement") }}
				<b>{{ controller.currentPlayerObj().name }}</b>
			</button>
		</template>
	</template>

	<template v-if="personal.kickoutRequired > 0 && !personal.canPlay() && store.gameflow.phase !== rf.PHASE_GAME_OVER">
		<div v-if="personal.kickoutRequired == 1" id="kickoutDiv">
			{{ $t("actionArea.kickoutStandardUsed", { name: controller.currentPlayerObj().name }) }}
			<br />
			<br />
			{{ $t("actionArea.remainingFlexTime") }}
			<span id="flexiKickoutTimerSpan">{{ getFlexiKickoutTImerText() }}</span>
			<br />
			<br />
			{{ $t("actionArea.forMoreInfo") }}
			<b><a href="/help/" target="_blank">{{ $t("actionArea.help") }}</a></b>
		</div>
		<div v-else-if="personal.externalTournamentGame" id="kickoutDiv">
			{{ $t("actionArea.tournamentNoKick") }}
			<br />
			<br />
			{{ $t("actionArea.tournamentAdminsHint") }}
			<br />
			<br />
			<br />
			<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
			<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("actionArea.notNow") }}</button></span>

			<button class="actionsLineButton" @click="IO.nudgeTourneyAdmins(1)">{{ $t("actionArea.alertAdmins") }}</button>
		</div>

		<div v-else id="kickoutDiv">
			<template v-if="canKickoutNow()">
			<br />
			<template v-if="store.context.action !== rf.ACT_CONFIRM_KICKOUT">
				{{ $t("actionArea.timedOut", { name: controller.currentPlayerObj().name }) }}
				<br />
				{{ $t("actionArea.toKickout", { name: controller.currentPlayerObj().name }) }}
				<br />
				{{ $t("actionArea.gameProceeds") }}
				<br />
				<br />
				{{ $t("actionArea.allowMoreTime", { name: controller.currentPlayerObj().name }) }}
				<br />

				<br />
				<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
				<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("actionArea.notNow") }}</button></span>
				<span>
					<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t("actionArea.keepInGame", { name: controller.currentPlayerObj().name }) }}</button>
				</span>
				<span><button class="actionsLineButton" id="confirmKickoutButton" @click="store.context.action = rf.ACT_CONFIRM_KICKOUT">{{ $t("actionArea.confirmKickout") }}</button></span>
			</template>
			<template v-if="store.context.action === rf.ACT_CONFIRM_KICKOUT">
				{{ $t("actionArea.willRemove", { name: controller.currentPlayerObj().name }) }}
				<br />
				<b>{{ $t("actionArea.cannotBeUndone") }}</b>
				<br />
				<br />
				{{ $t("actionArea.checkChat") }}
				<br />
				{{ $t("actionArea.gracePeriod") }}

				<br />
				<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
				<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("actionArea.notNow") }}</button></span>
				<span>
					<button class="actionsLineButton" id="confirmKickoutButton" @click="Bot.actionPlayerKickout">{{ $t("actionArea.permanentlyKickout", { name: controller.currentPlayerObj().name }) }}</button>
				</span>
			</template>
			</template>
			<template v-else>
				<br />
				{{ $t("actionArea.timedOut", { name: controller.currentPlayerObj().name }) }}
				<br />
				{{ $t("actionArea.voteNeeded", { name: controller.currentPlayerObj().name }) }}
				<br />
				<br />
				{{ $t("actionArea.votes", { votes: kickoutVoteCount(), threshold: store.kickoutVoteThreshold, voters: kickoutVoters() }) }}
				<br />
				<br />
				<span v-if="!myKickoutVote()">
					<template v-if="isLastVoteRequired()">
						{{ $t("actionArea.willRemove", { name: controller.currentPlayerObj().name }) }}
						<br />
						<b>{{ $t("actionArea.cannotBeUndone") }}</b>
						<br />
						<br />
					</template>
					<button class="actionsLineButton" id="voteKickoutButton" @click="Bot.actionPlayerKickout">{{ $t("actionArea.voteToKickout", { name: controller.currentPlayerObj().name }) }}</button>
				</span>
				<span v-else>
					{{ $t("actionArea.votedToKickout", { name: controller.currentPlayerObj().name }) }}
					<br />
					{{ $t("actionArea.voteCountdown", { time: soloKickoutCountdown }) }}
				</span>
				<br />
				<br />
				<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
				<span>
					<button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("actionArea.notNow") }}</button>
				</span>
				<span>
					<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t("actionArea.keepInGame", { name: controller.currentPlayerObj().name }) }}</button>
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

	<div v-if="!personal.canPlay() && !store.topMenuViews.showReplay && store.gameflow.phase !== rf.PHASE_GAME_OVER && store.players.length > 0 && store.gameflow.turnOrder.length > 0" class="waitingInfo">
		{{ $t("actionArea.waitingFor", { name: controller.currentPlayerObj().displayName }) }}
		<span v-if="getLastUpdateText()"> · {{ $t("actionArea.lastUpdate") }} {{ getLastUpdateText() }}</span>
	</div>

	<!-- ALWAYS SHOWS ON TURN 0 -->
	<template v-if="store.gameflow.turn === 0 && !store.topMenuViews.showReplay && store.topMenuViews.showIntroInfo">
		<h2>{{ $t("actionArea.welcomeTitle") }}</h2>
		<b>
			{{ $t("actionArea.welcomeNote") }}
			<a href="/profile/">{{ $t("actionArea.profile") }}</a>
			{{ $t("actionArea.welcomeRemoveText") }}
		</b>
		<br />
		<br />
		{{ $t("actionArea.welcomeSymbols") }}
		<br />
		<div class="intro_items_list_div">
			<div class="intro_inRange"></div>
			{{ $t("actionArea.inRange") }}
			<br />
			<div class="intro_OutOfRange"></div>
			{{ $t("actionArea.outOfRange") }}
			<br />
			<div class="intro_resNotUsed"></div>
			{{ $t("actionArea.resNotUsed") }}
			<br />
			<div class="intro_resUsed"></div>
			{{ $t("actionArea.resUsed") }}
			<br />
			<div class="intro_imgDiv"><img class="intro_img" :src="view.getImage('noResource5')" alt="NR" /></div>
			{{ $t("actionArea.depletedResource") }}
			<br />
			<div class="intro_imgDiv">
				<img class="intro_img" :src="view.getImage('noResource5')" alt="NR" />
				<div class="crossBackground_Atete"></div>
			</div>
			{{ $t("actionArea.depletedResourceAtete") }}
			<br />
			<div class="intro_imgDiv"><img class="intro_img" :src="view.getImage('noCows')" alt="NR" /></div>
			{{ $t("actionArea.notEnoughCattle") }}
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
			{{ $t("actionArea.notEnoughCraftsmen") }}
			<br />
			<br />
			<b>{{ $t("actionArea.rewindTitle") }}</b>
			{{ $t("actionArea.rewindInto") }}
			<br />
			{{ $t("actionArea.rewindBid1") }}
			<br />
			{{ $t("actionArea.rewindBid2") }}
			<br />
			{{ $t("actionArea.rewindAction1") }}
			<br />
			{{ $t("actionArea.rewindAction2") }}
			<br />
			<br />
			<b>{{ $t("actionArea.replayTitle") }}</b>
			{{ $t("actionArea.replayIntro") }}
			<br />
			{{ $t("actionArea.replayIntro2") }}
			<br />
			{{ $t("actionArea.replayExit") }}
			<br />
			{{ $t("actionArea.helpIntro") }}
			<b><a class="linkOther" href="/TGZ/help/" target="_blank">{{ $t("actionArea.helpLink") }}</a></b>
		</div>
	</template>
	<template v-else-if="store.topMenuViews.showIntroInfo === false">
		<button class="actionsLineButton" @click="store.topMenuViews.showIntroInfo = true">{{ $t("actionArea.showHelp") }}</button>
	</template>

	<!-- ALWAYS SHOWS BID INFO-->
	<template v-if="store.gameflow.phase === rf.PHASE_BID">
		<div id="bidLine">
			<b>{{ $t("actionArea.newTurnOrder") }}</b>
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
				<b>{{ $t("actionArea.currentBid") }}</b>
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
				<b>{{ $t("actionArea.expertOption") }}</b>
				: {{ $t("actionArea.expertIgnore") }}
				<br />
				<input type="checkbox" id="autoPassCheckbox" v-model="autoPass" />
				<label for="autoPassCheckbox">{{ $t("actionArea.autoPass") }}</label>
				<button @click="handleAutoPassCheckbox" class="actionsLineButton">{{ $t("actionArea.submit") }}</button>
				<span id="autoPassResponse" class="messageSuccess"></span>
			</div>
		</template>
	</template>

	<!-- ALWAYS SHOWS GAME END-->
	<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
		<div id="gameEndDiv">
			{{ $t("actionArea.gameOver") }}
			<br />
			<br />
			{{ $t("actionArea.winner") }} {{ store.players[store.history[store.history.length - 1][3][0][1]].displayName }}
			<br />
			<template v-if="store.players[store.history[store.history.length - 1][3][0][1]].name === personal.name">
				<h1>{{ $t("actionArea.congratulations") }}</h1>
			</template>
			<template v-else></template>
			{{ getReason(store.history[store.history.length - 1][3][0][2], 0) }}
			<br />
			{{ $t("actionArea.fancyA") }}
			<a :href="'/createTGZpage/' + String(personal.gameID) + '/'">{{ $t("actionArea.rematch") }}</a>
			?
			<br />
			{{ $t("actionArea.winningKingdom") }}
			<img class="winningTribeImg" :src="view.getPlayerTribeImage(personal.getCorrectedColour(store.players[store.history[store.history.length - 1][3][0][1]].colour))" alt="Tribe" />
			{{ $t("actionArea.bestMythology") }}
			<template v-if="store.players[store.history[store.history.length - 1][3][0][1]].god[0][0] !== rf.NO_god">
				<template v-for="(godData, index) in model.getPlayer_gods(store.players[store.history[store.history.length - 1][3][0][1]])" :key="index">
					<img v-if="godData[0] !== rf.NO_god" :src="view.getImage('god' + godData[0])" alt="god" class="winningMythImg" />
				</template>
			</template>
			<span v-else>{{ $t("actionArea.none") }}</span>
			<br />
			<div class="intro_items_list_div">
				<template v-for="(entry, idx) in store.history[store.history.length - 1][3]" :key="idx">
					<template v-if="idx !== 0">
						{{ getOrdinal(idx + 1) }}: {{ store.players[entry[1]].displayName }} ({{ getReason(entry[2], idx) }})
						<br />
					</template>
				</template>
			</div>
			<span v-if="store.statsModeData.statsMode">{{ $t("actionArea.statsView") }}</span>
			<span v-else>{{ $t("actionArea.normalView") }}</span>
			<br />
			<button @click="store.statsModeData.statsMode = !store.statsModeData.statsMode" class="actionsLineButton">
				{{ $t("actionArea.clickToChange") }}
				<span v-if="!store.statsModeData.statsMode">{{ $t("actionArea.stats") }}</span>
				<span v-else>{{ $t("actionArea.normal") }}</span>
				{{ $t("actionArea.view") }}
			</button>
		</div>
	</template>

	<!-- Not your turn, map inspector button -->
	<template v-if="!personal.canPlay() && !store.topMenuViews.showReplay">
		<MapInspectorButton show-eshu />
		<template v-if="store.topMenuViews.mapInspectorMode && !store.topMenuViews.showReplay">
			<br />
			{{ $t("actionArea.clickItemRanges") }}
			<HubRangeLegend :ranges="store.topMenuViews.hubRangesToHighlight" />
			<br />
			<br />
		</template>
	</template>

	<template v-if="personal.canPlay()">
		<div id="actions">
			<!-- ADD FIRST MONUMENT  -->
			<template v-if="store.gameflow.phase === rf.PHASE_FIRST_MON">
				<MapInspectorButton />
				<b>{{ $t("actionArea.buildFirstMonument") }}</b>
				<template v-if="store.context.action !== rf.ACT_NONE">
					<br />
					<br />
					{{ $t("actionArea.hubsUsed") }}
					<HubRangeLegend :ranges="store.topMenuViews.hubRangesToHighlight" />
					<br />
					<br />
				</template>
				<div v-if="store.context.action === rf.ACT_NONE">
					<button v-if="controller.canResign()" class="actionsLineButton" @click="localCheckResign">{{ $t("actionArea.resign") }}</button>
					<button class="actionsLineButton" @click="resetWholePlayerTurn">{{ $t("common.reset") }}</button>
					<button class="actionsLineButton" @click="localEndPlayerTurn">{{ $t("common.endTurn") }}</button>
				</div>
			</template>

			<!-- CHEAT ACTION -->
			<template v-if="store.context.action === rf.ACT_CHOOSE_CHEAT">
				<h2>{{ $t("actionArea.cheatOptions") }}</h2>
				{{ $t("actionArea.cheatWarning") }}
				<br />
				<br />
				<div class="cheatOptionsContainer">
					<div class="cheatOptionDiv">
						<span>
							{{ $t("actionArea.allowMultipleGods") }}
							<br />
							{{ $t("actionArea.allowMultipleGodsNote") }}
						</span>
						<br />
						<button class="actionsLineButton" @click="allowMultipleGods">
							{{ $t("actionArea.allowMultiple") }}
							<br />
							{{ $t("actionArea.gods") }}
						</button>
					</div>
					<div class="cheatOptionDiv">
						<span>
							{{ $t("actionArea.unlockAllGods") }}
							<br />
							{{ $t("actionArea.unlockAllGodsNote1") }}
							<br />
							{{ $t("actionArea.unlockAllGodsNote2") }}
							<br />
							{{ $t("actionArea.unlockAllGodsNote3") }}
							<br />
							{{ $t("actionArea.unlockAllGodsNote4") }}
							<br />
							{{ $t("actionArea.unlockAllGodsNote5") }}
						</span>
						<br />
						<button class="actionsLineButton" @click="enableAllGods">
							{{ $t("actionArea.enableAll") }}
							<br />
							{{ $t("actionArea.gods") }}
						</button>
					</div>
				</div>
				<br />
				<button class="actionsLineButton" @click="cancelCheat">{{ $t("common.cancel") }}</button>
			</template>

			<!-- BID  -->
			<template v-if="store.gameflow.phase === rf.PHASE_BID">
				<template v-if="store.context.action === rf.ACT_BID">
					<b>{{ $t("actionArea.provideGift") }}</b>
					<br />
					<span v-if="model.has_god(controller.currentPlayerObj(), rf.AJA) && model.get_godData(controller.currentPlayerObj(), rf.AJA)[1] === 0">
						{{ $t("actionArea.ajaBidHint") }}
						<br />
					</span>
					<span v-if="model.anyoneHasNYAMI(false)" class="orangeText">
						<!--Remember: Nyami-Nyami allows that player to go first
						<br />-->
						{{ $t("actionArea.nyamiHint") }}
						<br />
					</span>
					<label class="choiceLabel" for="bidAmount">{{ $t("actionArea.bidAmount") }}</label>

					<div class="bidPicker">
						<button class="bidStepButton" :disabled="store.context.selectedBid === 0" @click="changeBid(-1)" :aria-label="$t('actionArea.lowerBid')">−</button>
						<span class="bidAmount" aria-live="polite">{{ getBidAmountLabel() }}</span>
						<button class="bidStepButton" :disabled="store.context.selectedBid === getBidRange()[getBidRange().length - 1][0]" @click="changeBid(1)" :aria-label="$t('actionArea.raiseBid')">+</button>
					</div>

					<br />
					<MapInspectorButton />

					<span v-if="store.context.selectedBid === 0">
						{{ $t("actionArea.passPosition") }}
						<b>{{ getFirstPositionOrdinal() }}</b>
						{{ $t("actionArea.position") }}
						<b>{{ getCurrentCows(store.context.selectedBid) }}</b>
						{{ $t("common.cows") }}
					</span>
					<span v-else>
						{{ $t("actionArea.biddingMeans", { bid: store.context.selectedBid, count: getCurrentCows(store.context.selectedBid) }) }}
						<span v-if="getCurrentCows(store.context.selectedBid) !== 1">{{ $t("common.cows") }}</span>
						<span v-else>{{ $t("common.cow") }}</span>
						{{ $t("actionArea.toUseActions") }}
					</span>

					<br />

					<!--DEFUNCT SCHISM AJA <button v-if="controller.ajaPlayerCanFreePass()" class="actionsLineButton" @click="confirmFreeAjaPass">Confirm Free Pass with Aja</button>-->
					<button v-if="store.context.selectedBid > 0 && model.has_god(controller.currentPlayerObj(), rf.AJA) && model.get_godData(controller.currentPlayerObj(), rf.AJA)[1] === 0" class="actionsLineButton" @click="confirmAjaBid(store.context.selectedBid)">{{ $t("actionArea.confirmBidAja") }}</button>

					<button class="actionsLineButton" @click="confirmBid(store.context.selectedBid)">
						{{ $t("common.confirm") }}
						<span v-if="store.context.selectedBid === 0">{{ $t("actionArea.passEndTurn") }}</span>
						<span v-else>{{ $t("actionArea.bidEndTurn") }}</span>
					</button>
				</template>

				<div v-if="store.context.action === rf.ACT_NONE">
					<button class="actionsLineButton" @click="resetWholePlayerTurn">{{ $t("common.reset") }}</button>
					<button class="actionsLineButton" @click="localEndPlayerTurn">{{ $t("common.endTurn") }}</button>
				</div>
			</template>

			<!-- BUILD PHASE - NO ACTION  -->
			<template v-if="store.gameflow.phase === rf.PHASE_BUILD && store.context.action === rf.ACT_NONE">
				<MapInspectorButton show-eshu />
				<fieldset class="optionsGroup">
					<legend class="optionsHeader"><span class="stepBadge">1</span>{{ $t("actionArea.pickOne") }}</legend>
					<template v-if="!store.context.actionsTaken.includes(rf.ACT_BUILD_MON) && !store.context.actionsTaken.includes(rf.ACT_RAISE_MON) && !store.context.actionsTaken.includes(rf.ACT_BUILD_CRAFTSMEN)">
						<button class="actionsLineButton mainActionButton" @click="model.setupPlaceMonument">
							{{ $t("actionArea.build") }}
							<br />
							{{ $t("actionArea.monument") }}
						</button>
						<br />
						<button class="actionsLineButton mainActionButton" @click="model.setupRaiseMonument(false)">
							{{ $t("actionArea.raise") }}
							<br />
							{{ $t("actionArea.monuments") }}
						</button>
						<br />
						<button class="actionsLineButton mainActionButton" @click="model.setupPlaceCraftsmen(false)">
							{{ $t("actionArea.place") }}
							<br />
							{{ $t("actionArea.craftsmen") }}
						</button>
					</template>
					<template v-else-if="store.context.actionsTaken.includes(rf.ACT_BUILD_MON)">
						{{ $t("actionArea.youChose") }}
						<br />
						{{ $t("actionArea.building") }}
						<br />
						{{ $t("actionArea.monuments") }}
					</template>
					<template v-else-if="store.context.actionsTaken.includes(rf.ACT_RAISE_MON)">
						{{ $t("actionArea.youChose") }}
						<br />
						{{ $t("actionArea.raising") }}
						<br />
						{{ $t("actionArea.monuments") }}
					</template>
					<template v-else-if="store.context.actionsTaken.includes(rf.ACT_BUILD_CRAFTSMEN)">
						{{ $t("actionArea.youChose") }}
						<br />
						{{ $t("actionArea.building") }}
						<br />
						{{ $t("actionArea.craftsmen") }}
					</template>
				</fieldset>
				<fieldset class="optionsGroup">
					<legend class="optionsHeader"><span class="stepBadge">2</span>{{ $t("actionArea.onceEach") }}</legend>
					<span v-if="controller.currentPlayerObj().specialists.length === 0">
						<div class="noSpecsTextDiv">
							{{ $t("actionArea.youHave") }}
							<br />
							{{ $t("actionArea.noSpecialists") }}
							<br />
						</div>
					</span>
					<span v-else>
						{{ $t("actionArea.youHaveColon") }}
						<br />
						<span v-for="(spec, idx) in controller.currentPlayerObj().specialists" :key="idx">
							{{ rf.SPEC_NAMES[spec[0]] }}
							<br />
						</span>
						<button class="actionsLineButton mainActionButton" @click="model.setupUseSpec">
							{{ $t("actionArea.use") }}
							<br />
							{{ $t("actionArea.specialist") }}
						</button>
					</span>
				</fieldset>
				<fieldset class="optionsGroup" v-if="store.availableSpecialists.length > 0 || model.has_god(controller.currentPlayerObj(), rf.NO_god)">
					<legend class="optionsHeader"><span class="stepBadge">3</span>{{ $t("actionArea.pickOne") }}</legend>
					<span v-if="(model.has_god(controller.currentPlayerObj(), rf.NO_god) || store.allowMultiple_gods) && !store.context.actionsTaken.includes(rf.ACT_CHOOSE_god) && !store.context.actionsTaken.includes(rf.ACT_CHOOSE_SPEC)">
						<button class="actionsLineButton mainActionButton" @click="model.setupChoosegod">
							{{ $t("actionArea.choose") }}
							<br />
							{{ $t("actionArea.god") }}
						</button>
						<br />
					</span>
					<span v-else-if="!model.has_god(controller.currentPlayerObj(), rf.NO_god)">
						{{ $t("actionArea.youAdore") }}
						<template v-for="(godData, index) in model.getPlayer_gods(controller.currentPlayerObj())" :key="index">
							<span v-if="godData[0] !== rf.NO_god">
								{{ rf.god_NAMES[godData[0]] }}
								<span v-if="index < model.getPlayer_gods(controller.currentPlayerObj()).filter((g) => g[0] !== rf.NO_god).length - 1">,</span>
							</span>
						</template>
						<br />
					</span>
					<button v-if="store.availableSpecialists.length > 0 && !store.context.actionsTaken.includes(rf.ACT_CHOOSE_god) && !store.context.actionsTaken.includes(rf.ACT_CHOOSE_SPEC)" class="actionsLineButton mainActionButton" @click="model.setupChooseSpec">
						{{ $t("actionArea.choose") }}
						<br />
						{{ $t("actionArea.specialist") }}
					</button>
					<template v-if="store.context.actionsTaken.includes(rf.ACT_CHOOSE_SPEC)">
						{{ $t("actionArea.youChose") }}
						<br />
						{{ $t("actionArea.newSpec") }}
					</template>
				</fieldset>

				<template v-if="store.topMenuViews.mapInspectorMode">
					<br />
					<br />
					{{ $t("actionArea.clickItemRanges") }}
					<HubRangeLegend :ranges="store.topMenuViews.hubRangesToHighlight" />
				</template>
				<br />
				<button v-if="controller.canResign()" class="actionsLineButton" @click="localCheckResign">{{ $t("actionArea.resign") }}</button>
				<button class="actionsLineButton" @click="resetWholePlayerTurn">{{ $t("common.resetWholeTurn") }}</button>
				<button class="actionsLineButton" @click="endBuildActions">{{ $t("common.endTurn") }}</button>
			</template>

			<!-- CONFIRM END TURN -->
			<template v-if="store.context.action === rf.ACT_END_BUILD">
				<template v-if="model.anyPlayerMeetsVR()">
					{{ $t("actionArea.endGameThisRound") }}
					<br />
					{{ $t("actionArea.currentStandings") }}
					<br />
					<br />
					<span v-for="(scoreObj, idx) in model.endGame_core(true)" :key="idx">
						{{ idx + 1 }} - {{ store.players[scoreObj[1]].displayName }}
						<br />
					</span>
					<br />
				</template>
				<template v-else>
					{{ $t("actionArea.endingTurnGives") }}
					<b>+{{ model.getTurnEndCows(controller.currentPlayerIndex(), 9) }}</b>
					<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
					{{ $t("actionArea.nextTurnTotal") }}
					<b>{{ model.getTurnEndCows(controller.currentPlayerIndex(), 9) + controller.currentPlayerObj().cows }}</b>
					<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
					<br />
					{{ $t("actionArea.incomeFrom") }}
					<b>{{ model.getTurnEndCows(controller.currentPlayerIndex(), 0) }}</b>
					{{ $t("actionArea.godIncome") }},
					<b>{{ model.getTurnEndCows(controller.currentPlayerIndex(), 1) }}</b>
					{{ $t("actionArea.specsIncome") }},
					<b>{{ model.getTurnEndCows(controller.currentPlayerIndex(), 2) }}</b>
					{{ $t("actionArea.techsIncome") }},
					<b>{{ model.getTurnEndCows(controller.currentPlayerIndex(), 3) }}</b>
					{{ $t("actionArea.monumentsIncome") }}
					<br />
					{{ $t("actionArea.couldReceiveMore") }}
					<br />
					<template v-if="model.anyoneHasAJAKA(false) && controller.currentPlayerObj().techs.some((t) => t[1] >= 6)">
						<!-- YOU DO NOT HAVE AJAKA - SO YOU ARE LOSING COWS -->
						<template v-if="!model.has_god(controller.currentPlayerObj(), rf.AJAKA)">
							<span class="orangeText">
								{{ $t("actionArea.ajakaWarning") }}
								<br />
							</span>
						</template>
					</template>
				</template>
				<div class="endTurnSummary">
					<b>{{ $t("actionArea.endTurnSummary") }}</b>
					<br />
					{{ $t("actionArea.actionsTakenThisTurn") }}: {{ getActionsTakenText() }}
					<br />
					{{ $t("actionArea.victoryPoints") }}: {{ model.getScore(controller.currentPlayerIndex()) }} / {{ model.getVR(controller.currentPlayerObj()) }}
				</div>
				<button class="actionsLineButton" @click="resetWholePlayerTurn">{{ $t("common.resetWholeTurn") }}</button>
				<button class="actionsLineButton" @click="localEndPlayerTurn">{{ $t("actionArea.confirmEndTurn") }}</button>
			</template>

			<template v-if="store.context.action === rf.ACT_CONFIRM_RESIGN && !personal.externalTournamentGame">
				<p>{{ $t("actionArea.resignQuestion") }}</p>
				<p>{{ $t("actionArea.resignUnbalance") }}</p>
				<p>{{ $t("actionArea.resignCarryOn") }}</p>
				<p>{{ $t("actionArea.resignAim") }}</p>
				<button class="actionsLineButton" @click="resetWholePlayerTurn">{{ $t("actionArea.carryOnPlaying") }}</button>
				<button class="actionsLineButton" @click="Bot.actionResign">{{ $t("actionArea.confirmResignation") }}</button>
			</template>
			<template v-else-if="store.context.action === rf.ACT_CONFIRM_RESIGN && personal.externalTournamentGame">
				<div id="resignConfirmDiv">
					{{ $t("actionArea.tournamentNoResign") }}
					<br />
					<br />
					{{ $t("actionArea.continuePlay") }}
					<br />
					<br />
					{{ $t("actionArea.contactAdmins") }}
					<br />
					{{ $t("actionArea.willBeRemoved") }}
					<br />
					<br />
					<button class="actionsLineButton" @click="resetWholePlayerTurn">{{ $t("actionArea.carryOnPlaying") }}</button>
					<button class="actionsLineButton" @click="IO.nudgeTourneyAdmins(0)">{{ $t("actionArea.alertAdmins") }}</button>
				</div>
			</template>

			<!-- CHOOSE god  -->
			<template v-if="store.context.action === rf.ACT_CHOOSE_god">
				<template v-if="store.context.itemBeingAdded === -1">
					{{ $t("actionArea.chooseGod") }}
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
					<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">{{ $t("common.cancel") }}</button>
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
					<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">{{ $t("common.cancel") }}</button>
					<button class="actionsLineButton" @click="model.setgod(store.context.itemBeingAdded)">{{ $t("common.confirmChoice") }}</button>
				</template>
			</template>

			<!-- CHOOSE SPEC  -->
			<template v-if="store.context.action === rf.ACT_CHOOSE_SPEC">
				<template v-if="store.context.itemBeingAdded === -1">
					{{ $t("actionArea.chooseSpecialist") }}
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
					<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">{{ $t("common.cancel") }}</button>
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
					<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">{{ $t("common.cancel") }}</button>
					<button class="actionsLineButton" @click="model.addSpecialist(store.context.itemBeingAdded)">{{ $t("common.confirmChoice") }}</button>
				</template>
			</template>

			<!-- USE SPEC  -->
			<template v-if="store.context.action === rf.ACT_USE_SPEC">
				{{ $t("actionArea.useSpecialist") }}
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
						<span v-if="spec[1] === 6" class="redText">{{ $t("actionArea.max6Cows") }}</span>
						<span v-else-if="controller.currentPlayerObj().cows < 2" class="redText">{{ $t("actionArea.notEnoughCowsAdd") }}</span>
						<span v-else class="greenText">{{ $t("actionArea.selectIncreaseCows") }}</span>
					</template>
				</div>
				<br />
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">{{ $t("common.back") }}</button>
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
						{{ $t("actionArea.chooseHerdTotal") }}
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
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">{{ $t("common.cancel") }}</button>
				<button class="actionsLineButton" @click="model.addHerdCows(store.context.chosenPrice)">{{ $t("common.confirmChoice") }}</button>
			</template>

			<!-- ADD MONUMENT  -->
			<template v-if="store.context.action === rf.ACT_BUILD_MON">
				<b>{{ $t("actionArea.buildMonument") }}</b>
				<span v-if="model.hasNomads(controller.currentPlayerObj())">
					<br />
					{{ $t("actionArea.nomadsAnySpace") }}
				</span>
				<span v-if="!model.hasNomads(controller.currentPlayerObj())">
					<br />
					{{ $t("actionArea.noAdjacentMonument") }}
				</span>
				<span v-if="model.has_god(controller.currentPlayerObj(), rf.OBATALA)">
					<br />
					{{ $t("actionArea.monumentsToPlace", { count: store.context.monumentsToPlace }) }}
				</span>
				<br />
				<br />
				{{ $t("actionArea.hubsUsed") }}
				<HubRangeLegend :ranges="store.topMenuViews.hubRangesToHighlight" />
				<br />
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">{{ $t("common.cancel") }}</button>
				<button v-if="model.has_god(controller.currentPlayerObj(), rf.OBATALA) && store.context.monumentsToPlace === 1" class="actionsLineButton" @click="onlyPlaceOneMonument">{{ $t("actionArea.onlyPlaceOne") }}</button>
			</template>

			<!-- ADD RESOURCE -->
			<template v-if="store.context.action === rf.ACT_BUILD_RES">
				{{ $t("actionArea.addResource") }}
				<br />
				<img class="resSelectImg" :src="view.getImage('res' + String(rf.WOOD_TILE))" :class="[{ selectedItem: store.context.itemBeingAdded === rf.WOOD_TILE }, store.remainingItems[rf.WOOD_TILE] > 0 ? 'availableRes' : 'runOutRes']" @click="localSetupPlaceResource(rf.WOOD_TILE)" />
				<img class="resSelectImg" :src="view.getImage('res' + String(rf.CLAY_TILE))" :class="[{ selectedItem: store.context.itemBeingAdded === rf.CLAY_TILE }, store.remainingItems[rf.CLAY_TILE] > 0 ? 'availableRes' : 'runOutRes']" @click="localSetupPlaceResource(rf.CLAY_TILE)" />
				<img class="resSelectImg" :src="view.getImage('res' + String(rf.IVORY_TILE))" :class="[{ selectedItem: store.context.itemBeingAdded === rf.IVORY_TILE }, store.remainingItems[rf.IVORY_TILE] > 0 ? 'availableRes' : 'runOutRes']" @click="localSetupPlaceResource(rf.IVORY_TILE)" />
				<img class="resSelectImg" :src="view.getImage('res' + String(rf.DIAMOND_TILE))" :class="[{ selectedItem: store.context.itemBeingAdded === rf.DIAMOND_TILE }, store.remainingItems[rf.DIAMOND_TILE] > 0 ? 'availableRes' : 'runOutRes']" @click="localSetupPlaceResource(rf.DIAMOND_TILE)" />
				<br />
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">{{ $t("common.cancel") }}</button>
			</template>

			<!-- ADD WATER  -->
			<template v-if="store.context.action === rf.ACT_BUILD_WATER">
				<b>{{ $t("actionArea.placeWater") }}</b>
				<div id="itemBeingAddedDiv">
					<img class="rot_img rot_img_enabled" @click="rotateNewTile(-1)" :src="view.getImage('rot_anticlockwise')" />
					<img class="newTileImg newTileWater" :src="view.getImage('res' + String(store.context.itemBeingAdded))" :style="rotationStyle" />
					<img class="rot_img rot_img_enabled" @click="rotateNewTile(1)" :src="view.getImage('rot_clockwise')" />
				</div>
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">{{ $t("common.cancel") }}</button>
			</template>

			<!-- ANYANWU LEVEL 3 -->
			<template v-if="store.context.action === rf.ACT_CHOOSE_ANYANWU_MON">
				<br />
				<b>{{ $t("actionArea.selectMonumentLevel3") }}</b>
				<br />
				<template v-if="store.context.canSelectRaiseMonument.length === 0">
					<span class="actionError">{{ $t("actionArea.noLevelOneOrTwoMonuments") }}</span>
					<br />
					<br />
					<button class="actionsLineButton" @click="continueAfterAnyanwu">{{ $t("actionArea.continue") }}</button>
				</template>
				<br />
				<br />
			</template>

			<!-- ADD NEW CRAFTSMAN  -->
			<template v-if="store.context.action === rf.ACT_BUILD_CRAFTSMEN || store.context.action === rf.ACT_BUILD_PRI_CRAFTSMAN || store.context.action === rf.ACT_BUILD_SEC_CRAFTSMAN">
				<b>
					{{ $t("actionArea.addCraftsman") }}
					<br />
					{{ $t("actionArea.addCraftsmanHint") }}
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
							{{ $t("actionArea.alreadyHaveTech") }}
							<br />
							{{ $t("actionArea.thisTechnology") }}
							<br />
							{{ $t("actionArea.cost", { count: rf.COW_COST_TO_BUILD_CMAN[cman] }) }}
							<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />
							{{ $t("actionArea.vpPlus", { count: rf.CRAFTSMEN_SCORE[cman] }) }}
							<br />
						</template>
						<div class="cmanActionHolder">
							<img :src="view.getImage('craftsman' + String(cman) + (rf.ROTATABLE_TILES.includes(cman) ? '_v' : ''))" :class="{ noMoreCman: store.remainingItems[cman] <= 0 }" alt="Cman" class="cmanChoiceImg" />
							<div class="remainingCmanAction">({{ store.remainingItems[cman] }})</div>
						</div>
					</div>
				</template>
				<br />
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">{{ $t("common.cancel") }}</button>
				<button class="actionsLineButton" @click="model.endAddingCraftsmen">{{ $t("actionArea.confirmCraftsmen") }}</button>
			</template>

			<!-- ADD CRAFTSMAN  -->
			<template v-if="store.context.itemBeingAdded !== -1 && (store.context.action === rf.ACT_BUILD_PRI_CRAFTSMAN || store.context.action === rf.ACT_BUILD_SEC_CRAFTSMAN)">
				<span v-if="!model.hasTechForCman(store.context.itemBeingAdded)">
					<br />
					{{ $t("actionArea.takingTechVR", { count: rf.TECH_VR[cmanDisplayInfo(store.context.itemBeingAdded, 2)] }) }}
				</span>
				<br />
				{{ $t("actionArea.placingCraftsmanCost", { count: rf.COW_COST_TO_BUILD_CMAN[store.context.itemBeingAdded] }) }}
				<template v-if="model.hasActiveBuilder(controller.currentPlayerIndex())">
					<template v-if="Math.max(0, rf.COW_COST_TO_BUILD_CMAN[store.context.itemBeingAdded] - 2) == 0">{{ $t("actionArea.toYourBuilder") }}</template>
					<template v-else>{{ $t("actionArea.builderSplit", { builder: Math.min(rf.COW_COST_TO_BUILD_CMAN[store.context.itemBeingAdded], 2), stock: Math.max(0, rf.COW_COST_TO_BUILD_CMAN[store.context.itemBeingAdded] - 2) }) }}</template>
				</template>
				<template v-else>{{ $t("actionArea.toCommonStock") }}</template>
				<div id="itemBeingAddedDiv">
					<img class="rot_img" :class="rf.ROTATABLE_TILES.includes(store.context.itemBeingAdded) ? 'rot_img_enabled' : 'rot_img_disabled'" @click="rotateNewTile(-1)" :src="view.getImage('rot_anticlockwise')" />
					<img class="newTileImg newTileCraftsman" :src="view.getImage('craftsman' + String(store.context.itemBeingAdded))" :style="rotationStyle" alt="Craftsman" />
					<img class="rot_img" :class="rf.ROTATABLE_TILES.includes(store.context.itemBeingAdded) ? 'rot_img_enabled' : 'rot_img_disabled'" @click="rotateNewTile(1)" :src="view.getImage('rot_clockwise')" />
				</div>
				<br />
				{{ $t("actionArea.hubsUsed") }}
				<HubRangeLegend :ranges="store.topMenuViews.hubRangesToHighlight" />
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
					<span class="orangeText">{{ $t("actionArea.noCraftsmenPlaced") }}</span>
					<br />
				</template>
				<button class="actionsLineButton" @click="resetWholePlayerTurn">{{ $t("common.resetWholeTurn") }}</button>
				<button v-if="failedToJustPlaceCraftsmanFlag() <= 1" class="actionsLineButton" @click="model.setCraftsmanPrice(controller.currentPlayerObj(), store.context.choosingPrices)">{{ $t("actionArea.confirmPrice") }}</button>
			</template>

			<!-- RAISE MON -->
			<template v-if="store.context.action === rf.ACT_RAISE_MON">
				<template v-if="store.context.upgradingMonumentProcess.length === 0">
					{{ $t("actionArea.selectMonumentRaise") }}
					<span v-if="model.has_god(controller.currentPlayerObj(), rf.TSUI_GOAB)">
						<br />
						{{ $t("actionArea.tsuiGoab") }}
					</span>
					<span v-if="model.has_god(controller.currentPlayerObj(), rf.ATETE)">
						<br />
						{{ $t("actionArea.atete") }}
					</span>
					<span v-if="model.has_god(controller.currentPlayerObj(), rf.OYA) && 1 === 2">
						<br />
						{{ $t("actionArea.oya") }}
						<br />
						<button v-if="!store.context.OYAused" class="actionsLineButton" @click="setupOya()">{{ $t("actionArea.createMonumentOya") }}</button>
						<span v-else>{{ $t("actionArea.oyaUsed") }}</span>
					</span>
				</template>
				<span v-if="store.context.upgradingMonumentProcess.length > 0">
					{{ store.context.upgradingMonumentProcess[0][1] !== 1 ? $t("actionArea.upgradingRequiresPlural", { count: store.context.upgradingMonumentProcess[0][1] }) : $t("actionArea.upgradingRequires", { count: store.context.upgradingMonumentProcess[0][1] }) }}
					<br />
					<br />
					{{ $t("actionArea.currentCost") }}
					<span v-html="getCurrentUpgradeCost()"></span>
					<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />

					<div class="raiseProgress">
						<b>{{ $t("actionArea.ritualGoodProgress", { done: getRitualGoodsDone(), total: getRequiredRitualGoods() }) }}</b>
						<div class="raiseGoodsList">
							<div v-for="(good, goodIdx) in store.context.upgradingMonumentProcess.slice(1)" :key="goodIdx" class="raiseGoodChip">
								<img v-if="getGoodCraftsman(good)" :src="view.getImage('craftsman' + getGoodCraftsman(good)[1])" alt="Craftsman" />
								<img v-for="(resourceIndex, resIdx) in getGoodResourceIndexes(good)" :key="resIdx" :src="getGoodResourceImage(resourceIndex)" alt="Resource" />
							</div>
						</div>
					</div>

					<span v-if="store.context.currentRitualGood.length === 0">
						<br />
						<br />
						{{ $t("actionArea.chooseCraftsmanRitual") }}
					</span>
					<span v-if="store.context.currentRitualGood.length === 1">
						<br />
						<br />
						{{ $t("actionArea.chooseResource") }}
						<template v-if="!store.context.ignoreAjeShaluga && model.has_god(controller.currentPlayerObj(), rf.AJE_SHALUGA_OLD) && model.getPlayerIndexForCraftsmanPriIndex(store.context.currentRitualGood[0][0]) === controller.currentPlayerIndex()">
							{{ $t("actionArea.skipPrimaryGood") }}
							<button class="actionsLineButton" @click="skipResource">{{ $t("actionArea.skipThisResource") }}</button>
							{{ $t("actionArea.insteadOr") }}
							<button class="actionsLineButton" @click="store.context.ignoreAjeShaluga = true">{{ $t("actionArea.ignoreAjeShaluga") }}</button>
						</template>
					</span>
					<span v-if="store.context.currentRitualGood.length === 2">
						<br />
						<br />
						{{ $t("actionArea.choosePrimaryCraftsman") }}
					</span>
					<span v-if="store.context.currentRitualGood.length === 3">
						<br />
						<br />
						{{ $t("actionArea.chooseResourcePrimary") }}
					</span>

					<template v-if="store.context.currentRitualGood.length !== 1">
						<br />
						<br />
						{{ $t("actionArea.hubRange") }}
						<HubRangeLegend :ranges="store.topMenuViews.hubRangesToHighlight" />
					</template>
				</span>
				<br />
				<button class="actionsLineButton" @click="cancelRaising">{{ $t("actionArea.cancelRaising") }}</button>
				<button v-if="store.context.canSelectRaiseMonument.length === 0 && store.context.actionError !== $t('model.noMonumentToRaise')" class="actionsLineButton" @click="funcs.importModel(store.lastMonumentResetData, true)">{{ $t("actionArea.restartRaise") }}</button>
				<button v-if="store.context.OYAused || (store.history[store.history.length - 1][0] === rf.HIST_RAISE_MON && (store.context.canSelectRaiseMonument.length > 0 || store.context.actionError === $t('model.noMonumentToRaise')))" class="actionsLineButton" @click="localConfirmRaising">{{ $t("actionArea.confirmRaising") }}</button>
			</template>

			<template v-if="store.context.action === rf.ACT_OYA_RUITUALGOOD">
				{{ $t("actionArea.currentCost") }}
				<span v-html="getCurrentUpgradeCost()"></span>
				<img class="miniCowImg" :src="view.getImage('cows1')" alt="Cows" />

				<span v-if="store.context.currentRitualGood.length === 0">
					<br />
					<br />
					{{ $t("actionArea.chooseCraftsmanRitual") }}
				</span>
				<span v-if="store.context.currentRitualGood.length === 1">
					<br />
					<br />
					{{ $t("actionArea.chooseResource") }}
				</span>
				<span v-if="store.context.currentRitualGood.length === 2">
					<br />
					<br />
					{{ $t("actionArea.choosePrimaryCraftsman") }}
				</span>
				<span v-if="store.context.currentRitualGood.length === 3">
					<br />
					<br />
					{{ $t("actionArea.chooseResourcePrimary") }}
				</span>

				<template v-if="store.context.currentRitualGood.length !== 1">
					<br />
					<br />
					{{ $t("actionArea.hubRange") }}
					<HubRangeLegend :ranges="store.topMenuViews.hubRangesToHighlight" />
				</template>
				<br />
				<button class="actionsLineButton" @click="funcs.importModel(store.lastMonumentResetData, true)">{{ $t("actionArea.cancelOya") }}</button>
				<button class="actionsLineButton" @click="funcs.importModel(store.actionResetData, true)">{{ $t("actionArea.cancelRaising") }}</button>
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

.waitingInfo {
	margin: 8px auto;
	padding: 6px 10px;
	border: 1px solid #666;
	border-radius: 4px;
	background: #eef4e8;
	font-weight: bold;
	width: fit-content;
}

.stepBadge {
	display: inline-block;
	min-width: 18px;
	height: 18px;
	line-height: 18px;
	border-radius: 50%;
	background: #333;
	color: white;
	font-size: 12px;
	text-align: center;
	margin-right: 6px;
}

.bidPicker {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	margin: 8px;
}

.bidStepButton {
	font-size: 22px;
	font-weight: bold;
	width: 36px;
	height: 36px;
	border: 2px solid green;
	border-radius: 4px;
	background: white;
	cursor: pointer;
}

.bidStepButton:disabled {
	opacity: 0.4;
	cursor: default;
}

.bidAmount {
	display: inline-block;
	min-width: 76px;
	text-align: center;
	font-size: 20px;
	font-weight: bold;
}

.endTurnSummary {
	margin: 8px auto;
	padding: 8px;
	border: 1px solid #666;
	border-radius: 4px;
	background: #f8f8e8;
	width: fit-content;
}

.raiseProgress {
	margin: 8px auto;
	padding: 6px;
	border: 1px solid #999;
	border-radius: 4px;
	background: #f4f4f4;
}

.raiseGoodsList {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	justify-content: center;
	margin-top: 4px;
}

.raiseGoodChip {
	display: inline-flex;
	align-items: center;
	gap: 2px;
	border: 1px solid #333;
	border-radius: 4px;
	padding: 2px;
	background: white;
}

.raiseGoodChip img {
	width: 34px;
	height: 34px;
	object-fit: cover;
}
</style>
