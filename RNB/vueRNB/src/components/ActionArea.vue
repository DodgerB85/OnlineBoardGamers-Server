<script setup>
import TurnNudge from "./Utils/TurnNudge.vue"
/** Action area - This is where you interact with the game flow.
 * Confirm actions, end turn, reset turn.
 * Also, it's where you're told what to do next
 *
 *
 */
import * as rf from "../js/RNBreference"
import * as controller from "../js/RNBcontroller"
import * as funcs from "../js/RNBfuncs"
import * as model from "../js/RNBmodel"
import * as map from "../js/RNBmap"
import * as context from "../js/RNBcontext"
import * as view from "../js/RNBview"
import * as produce from "../js/RNBproduce"
import * as highlight from "../js/RNBhighlight"
import * as loc from "../js/RNBlocation"
import * as stack from "../js/RNBstack"
import * as wonder from "../js/RNBwonder"
import * as Bot from "../js/RNBbot"
import * as build from "../js/RNBbuild"
import * as IO from "../backend/RNB_IO"

import MiniHex from "./Utils/MiniHex.vue"
import PlayerTradeArea from "./PlayerTradeArea.vue"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/RNBpersonal.js"
const personal = usePersonalStore()

import i18n from "../i18n"
const t = (key, named) => i18n.global.t(key, named)

import { computed, ref, watch, onUnmounted } from "vue"

import FailedStackEntry from "./Utils/FailedStackEntry.vue"
import ActionAreaPrePhase from "./ActionAreaPrePhase.vue"
import ConflictDecisionPanel from "./ConflictDecisionPanel.vue"

function chosenStartTileIsPolder() {
	const homeLoc = model.getPlayersHomeMarkerLocation(controller.currentPlayerIndex())
	const hex = model.getHexByID(homeLoc[1])
	return rf.TERR_IS_POLDER.includes(hex.currentTerrain)
}

function chosenStartTileIsFloodedPolder() {
	const homeLoc = model.getPlayersHomeMarkerLocation(controller.currentPlayerIndex())
	const hex = model.getHexByID(homeLoc[1])
	return hex.currentTerrain === rf.TERR_POLDER_WET
}

// Pre-set home tile spots from the map (setupData.HM), minus any already taken.
const remainingStartSpots = computed(() => {
	const hm = store.mapData.setupData && store.mapData.setupData.HM
	if (!hm || hm.length === 0) return []
	const usedHexIDs = store.ALL_HOME_MARKERS.map((m) => m.location[1])
	return hm.map((m) => stack.decompressLocation(m)).filter((spotLoc) => spotLoc && !usedHexIDs.includes(spotLoc[1]))
})

// Coarse location of a hex on the map, as a compass region (upper-left, centre, lower-right...)
function describeMapRegion(hexID) {
	const hex = model.getHexByID(hexID)
	if (!hex || !hex.rawXY) return ""
	let minX = Infinity
	let maxX = -Infinity
	let minY = Infinity
	let maxY = -Infinity
	for (const h of store.mapData.hexData) {
		if (!h.rawXY) continue
		minX = Math.min(minX, h.rawXY[0])
		maxX = Math.max(maxX, h.rawXY[0])
		minY = Math.min(minY, h.rawXY[1])
		maxY = Math.max(maxY, h.rawXY[1])
	}
	const fx = (hex.rawXY[0] - minX) / (maxX - minX || 1)
	const fy = (hex.rawXY[1] - minY) / (maxY - minY || 1)
	const vLabel = fy < 0.34 ? "upper" : fy > 0.66 ? "lower" : "middle"
	const hLabel = fx < 0.34 ? "left" : fx > 0.66 ? "right" : "middle"
	const cap = (s) => s[0].toUpperCase() + s.slice(1)
	if (vLabel === "middle" && hLabel === "middle") return t("action.regionCentre")
	if (vLabel === "middle") return t(`action.region${cap(hLabel)}`)
	if (hLabel === "middle") return t(`action.region${cap(vLabel)}`)
	return t(`action.region${cap(vLabel)}${cap(hLabel)}`)
}

const startSpotRegionsText = computed(() => {
	const regions = []
	for (const spot of remainingStartSpots.value) {
		const region = describeMapRegion(spot[1])
		if (region && !regions.includes(region)) regions.push(region)
	}
	if (regions.length === 0) return ""
	if (regions.length === 1) return regions[0]
	return regions.slice(0, -1).join(", ") + " " + t("action.regionAnd") + " " + regions[regions.length - 1]
})

function finishActions(stopActionChange = false, event = null) {
	// Save the "Go Back" stats
	store.goBackResetData = funcs.simpleExportWholeRNBmodel()
	// If in movement phase, check all geese are dropped
	if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) {
		model.dropAllGeeseForPlayerIndex(controller.currentPlayerIndex(), event)
		if (store.context.errorUnableToDropGeeseAtSea === true) {
			return
		}
	}

	// Preserve research info
	let tempResearch = [...store.context.researchHexIDpossibilities]
	context.resetContextAndHighlights()
	// This should be used to show remaining options
	if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) {
		store.context.researchHexIDpossibilities = [...tempResearch]
		highlight.highlightEligibleSecondaryBuildingsForManualProduction(-1, false, controller.currentPlayerIndex(), true)
	}
	if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) {
		const allPlayerTransporters = model.getTransportersByPlayerIndex(controller.currentPlayerIndex())
		for (const transporterObj of allPlayerTransporters) {
			if (loc.isOnAnyTransporter(transporterObj.location)) continue
			if (transporterObj.remainingMoves > 0) {
				// Check it is not carrying an already moved transporter
				if (model.doesTransporterHaveAlreadyMovedTransporter(transporterObj.id)) continue

				// Check it is not carrying an already moved res
				if (model.doesTransporterHaveAlreadyMovedResource(transporterObj.id)) continue
				store.context.remainingTransportersWithMovement.push([transporterObj.location[1], `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`])
			}
		}
	}
	if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) {
		let remainingBuildingSummaryOptions = []
		const allPlayerTransporters = model.getTransportersByPlayerIndex(controller.currentPlayerIndex())
		for (const transporterObj of allPlayerTransporters) {
			if (loc.isOnAnyTransporter(transporterObj.location)) continue
			const eligibleMainBuildingOptions = build.getEligibleMainBuildingsToBuildWithTransporterID(transporterObj.id)[0]
			if (eligibleMainBuildingOptions.length > 0) {
				if (!remainingBuildingSummaryOptions.some((a) => a[0] === transporterObj.location[1])) remainingBuildingSummaryOptions.push([transporterObj.location[1], `transporter_${transporterObj.type}_${personal.getCorrectedColour(store.players[transporterObj.ownerIndex].colour)}`])
			}
		}
		store.context.remainingBuildingSummaryOptions = [...remainingBuildingSummaryOptions]
		// Check for wonder actions
		const currentHomeTileLocation = model.getPlayersHomeMarkerLocation(controller.currentPlayerIndex())
		const homeMarkerHexID = currentHomeTileLocation[1]
		const homeTransporters = model.getTransportersByPlayerIndexAndHexID(controller.currentPlayerIndex(), homeMarkerHexID)
		if (homeTransporters.length === 0) {
			store.context.noTransportersOnHomeTile = true
		}
		//model.resetBuildingsAfterProduction()
		//highlight.highlightEligibleSecondaryBuildingsForManualProduction()
	}
	if (rf.PHASE_WONDERS.includes(store.gameflow.phase)) {
		//model.resetBuildingsAfterProduction()
		//highlight.highlightEligibleSecondaryBuildingsForManualProduction()
	}
	if (!stopActionChange) store.context.action = rf.ACT_CONFIRM_END_TURN
}

function finishActionsAndEndTurn(event = null) {
	finishActions(true, event)
	localEndPlayerTurn()
}

function localEndPlayerTurn() {
	store.context.researchHexIDpossibilities.splice(0)
	// If you have just played a pre-phase, then store the move
	if (rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)) {
		controller.endPlayerPreMainPhaseTurn()
		return
	}
	// If you are in fully simul conflict decision phase, AND calling conflict, then immediately end the phase
	/*if (rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase) && store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_CONFLICT) {
		store.gameflow.turnOrder.splice(0)
	}*/
	if (rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) {
		// Update your stack -- BUT ALL STACKS MIGHT NOT HAVE BEEN SENT
		//const myStack = store.allStackData.find((a) => a.username === personal.name)
		/*if (store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_CONFLICT) {
			store.gameflow.phase++
			store.gameflow.fullTurnOrder = [...store.gameflow.newWonderPrayingOrder]
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		}*/
		// Dont do anything - submit your stack with conflict chosen to get to next phase
	}
	controller.endPlayerTurn()
}

function resetWholeTurn() {
	context.resetWholeTurn()
}

function anyDonkeyProducingProblems(forcedIncomingDonkeys = -1) {
	const [isLandProblem, isWaterProblem] = produce.findExcessTransportersWithDonkeyProduction(controller.currentPlayerIndex(), forcedIncomingDonkeys)

	// Return a clean array of booleans
	return [isLandProblem, isWaterProblem]
}

const donkeyProductionData = computed(() => produce.findExcessTransportersWithDonkeyProduction(controller.currentPlayerIndex()))

const anyDonkeyProducingProblemsNoParam = computed(() => {
	const ret = donkeyProductionData.value
	return [ret[0], ret[1]]
})

const numNewDonkeys = computed(() => donkeyProductionData.value[2])

const getDonkeyWarningText = computed(() => {
	const ret = donkeyProductionData.value
	let warningText = ""
	// Total Problem
	if (ret[0] === true) warningText += t("action.max8Warning", { gain: ret[2], total: ret[2] + ret[3] })
	if (ret[1] === true) warningText += t("action.max5LandWarning", { gain: ret[2], total: ret[2] + ret[4] })
	return warningText
})

const lastSoloTurn = computed(() => {
	if (store.CUSTOM_RULES.includes(rf.CR_USE_ONLY_28_NEUTRAL_BRICKS)) return 11
	return 20
})

function handleDonkeyCheckboxChange(entry, newValue) {
	// If checkbox was unchecked
	if (newValue === false && entry[2] !== -1) {
		const transporter = model.getTransporterByID(entry[2])
		if (transporter) {
			transporter.location = [...entry[3]]
		}
		entry[2] = -1
		entry[3].splice(0)
	}
}

function localGoBack() {
	//context.resetContextAndHighlights()
	//highlight.updateAllHighlightsForTransporterMode()
	//if (rf.MAIN_PHASES.includes(store.gameflow.phase)) store.context.action = rf.ACT_TM_SELECT_TRANSPORTER
	funcs.simpleImportWholeRNBmodel(store.goBackResetData, false)
}

function addResToInput(res) {
	// Remove from options
	store.context.chosenInputGoods[0].splice(store.context.chosenInputGoods[0].indexOf(res), 1)
	// Add to chosen
	store.context.chosenInputGoods[1].push(res)
}

function removeResFromInput(res) {
	// Remove from chosen
	store.context.chosenInputGoods[1].splice(store.context.chosenInputGoods[1].indexOf(res), 1)
	// Add to options
	store.context.chosenInputGoods[0].push(res)
}

function cancelInputGoods() {
	context.resetContextAndHighlights()
	highlight.updateAllHighlightsForTransporterMode()
}

function resetInputGoods() {
	store.context.chosenInputGoods[0] = store.context.chosenInputGoods[0].concat(store.context.chosenInputGoods[1])
	store.context.chosenInputGoods[1].splice(0)
}

function confirmInputGoods() {
	map.clickedBuilding(store.context.chosenInputGoods[2], store.context.chosenInputGoods[1])
}

function anyFollowingGeeseOnRiver() {
	const playerTransportersOnMap = model.getAllInGameTransporters().filter((transporter) => model.transporterIsOnMap(transporter) && transporter.ownerIndex === controller.currentPlayerIndex())
	for (let i = 0; i < playerTransportersOnMap.length; i++) {
		if (loc.isRiverVertexLocation(playerTransportersOnMap[i].location)) {
			const resFollowing = model.resourcesFollowingTransporter(playerTransportersOnMap[i].id)
			if (resFollowing.length > 0) return true
		}
	}
	return false
}

function clickedWonderBrickOption(resID) {
	if (store.context.resIDsInWonderBrick.includes(resID)) {
		store.context.resIDsInWonderBrick.splice(store.context.resIDsInWonderBrick.indexOf(resID), 1)
		store.context.resIDsOnHomeTile.push(resID)
	} else {
		// Don't add to the wondre brick goods if it is complete
		if (wonder.requiredResourcesForWonderBrick(controller.currentPlayerIndex()) - store.context.resIDsInWonderBrick.length === 0) return

		store.context.resIDsOnHomeTile.splice(store.context.resIDsOnHomeTile.indexOf(resID), 1)
		store.context.resIDsInWonderBrick.push(resID)

		// AUto add brick
		if (wonder.requiredResourcesForWonderBrick(controller.currentPlayerIndex()) - store.context.resIDsInWonderBrick.length === 0) {
			addBrickToWonder()
		}
	}
}
function addBrickToWonder() {
	wonder.addBrickToWonder(controller.currentPlayerIndex(), true)
}

function cashInPraying(andEndTurn) {
	wonder.cashInPraying(controller.currentPlayerIndex())
	if (andEndTurn) localEndPlayerTurn()
	else store.context.action = rf.ACT_CONFIRM_END_TURN
}

function keepPraying(andEndTurn) {
	wonder.keepPraying(controller.currentPlayerIndex())
	if (andEndTurn) localEndPlayerTurn()
	else store.context.action = rf.ACT_CONFIRM_END_TURN
}

function clickedNewTurnOrderDiv(idx) {
	if (!personal.canPlay()) return
	if (store.context.action === rf.ACT_CONFIRM_END_TURN) return
	wonder.setNewTurnOrderPosition(controller.currentPlayerIndex(), idx)
}

function stopUpgradingBuildings() {
	context.resetContextAndHighlights()
	highlight.updateAllHighlightsForTransporterMode()
}

const getCurrentlyProducingDonkeys = (currentIndex) => {
	const additionalDonkeys = store.context.possibleDonkeyReproductionData.slice(0, currentIndex + 1).filter((entry) => entry[1] === true).length
	const removedTransporters = store.context.possibleDonkeyReproductionData.slice(0, currentIndex + 1).filter((entry) => entry[2] !== -1).length
	return additionalDonkeys - removedTransporters
}

function getOrdinal(num) {
	return view.getOrdinal(num)
}

function cancelKickout() {
	personal.kickoutRequired = 0
}

function currentKickoutTarget() {
	return controller.timedOutPlayerObj().name
}
function myKickoutVote() {
	if (personal.pov < 0) return false
	// A super-user (BotKickStarter) votes as the seat it is currently POV-ing
	return store.kickoutVotesData[store.players[personal.pov].name]
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
	if (personal.pov < 0) return 0
	return Object.values(store.kickoutVotesData).filter((vote) => vote[0] === currentKickoutTarget()).length
}
function kickoutVoters() {
	if (personal.pov < 0) return ""
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
	() => personal.pov >= 0 ? store.kickoutVotesData[store.players[personal.pov].name] : false,
	() => {
		if (personal.pov < 0) return
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

function passKickout() {
	personal.kickoutRequired = 0
	const timedOutPlayerObj = controller.timedOutPlayerObj()
	const timedOutPlayerIndex = controller.timedOutPlayerIndex()
	personal.removeCurrentFlexTime = true
	personal.removeCurrentFlexTimeName = timedOutPlayerObj.name

	if (store.stackControl.loadedPreMove) {
		const savedWonderTurnOrder = [...store.gameflow.wonderTurnOrder]
		context.resetWholeTurn()
		store.gameflow.wonderTurnOrder = savedWonderTurnOrder
	} else {
		store.actionStack.splice(0)
	}

	if (rf.MAIN_PHASES.includes(store.gameflow.phase)) {
		// Main phase - skip (no action, stack is already empty)
	} else if (rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) {
		// Conflict decision - no conflict, with fallback preferences
		store.conflictPreset.conflictDecision = rf.CONFLICT_DECISION_NO_CONFLICT
		store.conflictPreset.prayingDecision = rf.CONFLICT_PRAYING_KEEP_PRAYING
		store.conflictPreset.turnOrderDecision = rf.CONFLICT_TURN_ORDER_LATEST
	} else if (rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase)) {
		// Praying - keep praying (same as keepPraying)
		store.conflictPreset.prayingDecision = rf.CONFLICT_PRAYING_KEEP_PRAYING
		const lastEmptyIndex = store.gameflow.newWonderPrayingOrder.lastIndexOf(-1)
		if (lastEmptyIndex !== -1) {
			store.gameflow.newWonderPrayingOrder[lastEmptyIndex] = timedOutPlayerIndex
		}
		if (store.gameflow.newWonderPrayingOrder.filter((x) => x === -1).length === 1) {
			const requiredNumbers = Array.from({ length: store.players.length }, (_, i) => i)
			const missingNumber = requiredNumbers.find((x) => !store.gameflow.newWonderPrayingOrder.includes(x))
			const emptyIdx = store.gameflow.newWonderPrayingOrder.lastIndexOf(-1)
			store.gameflow.newWonderPrayingOrder[emptyIdx] = missingNumber
		}
		model.addHistory(rf.HIST_CONFLICT_PRAYING, timedOutPlayerIndex, 0, [timedOutPlayerIndex])
	} else if (rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase)) {
		// Turn order - go latest (same as setNewTurnOrderPosition with goLatest)
		store.conflictPreset.turnOrderDecision = rf.CONFLICT_TURN_ORDER_LATEST
		const idx = store.gameflow.wonderTurnOrder.lastIndexOf(-1)
		if (idx >= 0) {
			store.gameflow.wonderTurnOrder[idx] = timedOutPlayerIndex
		}
		if (store.gameflow.wonderTurnOrder.filter((x) => x === -1).length === 1) {
			const requiredNumbers = Array.from({ length: store.players.length }, (_, i) => i)
			const missingNumber = requiredNumbers.find((x) => !store.gameflow.wonderTurnOrder.includes(x))
			const emptyIdx = store.gameflow.wonderTurnOrder.lastIndexOf(-1)
			store.gameflow.wonderTurnOrder[emptyIdx] = missingNumber
		}
		model.addHistory(rf.HIST_CONFLICT_TURN_ORDER, timedOutPlayerIndex, 0, [[timedOutPlayerIndex, idx >= 0 ? idx : 0]])
	}

	controller.endPlayerTurn(timedOutPlayerObj.name, timedOutPlayerIndex)
}

function localClickResign() {
	if (store.context.action !== rf.ACT_CONFIRM_RESIGN) store.context.action = rf.ACT_CONFIRM_RESIGN
	else Bot.actionResign()
}

function confirmEndGame() {
	wonder.setFullTurnOrderForGameover()
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
	store.gameflow.phase = rf.PHASE_GAME_OVER
	IO.saveGame()
}

function presetTransporterRemovalForDonkey(donkeyIdx) {
	highlight.highlightEligibleTransportersForRemoval(controller.currentPlayerIndex(), anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx))[0], anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx))[1], false)
	store.context.selectedDonkeyIdxToStoreTransporterRemoveal = donkeyIdx
	store.context.action = rf.ACT_REMOVE_EXCESS_TRANSPORTERS_FOR_DONKEY
}

function getConflictCallingPlayerIndexes() {
	let idx = store.history.length - 1
	while (idx >= 0 && store.history[idx][0] !== rf.HIST_CHOOSE_CONFLICT) idx--
	if (idx < 0) return []
	return store.history[idx][3]
}

const getGameOverReason = computed(() => {
	if (store.players.length === 2 && store.wonderBricks.length >= 62) return t("action.gameOverBrick2")
	if (store.players.length === 3 && store.wonderBricks.length >= 66) return t("action.gameOverBrick3")
	if (store.players.length === 4 && store.wonderBricks.length >= 69) return t("action.gameOverBrick4")
	if (store.players.length === 5 && store.wonderBricks.length >= 76) return t("action.gameOverBrick5")
	if (store.players.length === 6 && store.wonderBricks.length >= 83) return t("action.gameOverBrick6")

	const neutralBricksUsed = store.wonderBricks.filter((num) => num === 8 || num === 9).length
	if (neutralBricksUsed >= 33 && !personal.soloGame) return t("action.gameOverNeutral33")
	if (store.CUSTOM_RULES.includes(rf.CR_USE_ONLY_28_NEUTRAL_BRICKS) && neutralBricksUsed >= 28 && !personal.soloGame) return t("action.gameOverNeutral28")
	if (personal.soloGame && neutralBricksUsed >= 37) return t("action.gameOverSolo20")

	let nbNonPlayers = 0
	for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++

	if (nbNonPlayers >= store.players.length - 1) return t("action.gameOverLastMan")

	return t("action.gameOverUnknown")
})
</script>

<template>
	<div v-if="store.viewSettings.showLoader" id="fLoadingBar">
		{{ $t("action.savingGame") }}
		<br />
		<img :src="view.getImage('loading-bar-black')" />
	</div>

	<div id="actionAreaDiv">
		<!-- LOGGED OUT TEXT -->
		<template v-if="personal.pov === -99">
			<div id="loggedOutText">
				{{ $t("action.loggedOutPlease") }}
				<a href="/register">{{ $t("action.register") }}</a>
				{{ $t("action.loggedOutOr") }}
				<a href="/login">{{ $t("action.login") }}</a>
				{{ $t("action.loggedOutToPlay") }}
				<br />
			</div>
			<br />
		</template>

		<!-- RESIGN -->
		<template v-if="store.context.action === rf.ACT_CONFIRM_RESIGN">
			{{ $t("action.resignConfirm") }}
			<br />
			{{ $t("action.resignUnbalance") }}
			<br />
			{{ $t("action.resignCarryOn") }}
			<br />
			{{ $t("action.resignStillCompete") }}
			<br />
			<img class="resignImg" :src="view.getImage('resign')" />
			<br />
			<button class="actionsLineButton" @click="resetWholeTurn">{{ $t("action.carryOnPlaying") }}</button>
			<button class="actionsLineButton" @click="Bot.actionResign">{{ $t("action.confirmResignation") }}</button>
		</template>

		<!-- CONFIRM END GAME -->
		<template v-if="store.context.action === rf.ACT_CONFIRM_END_GAME">
			{{ $t("action.endGameWarning") }}
			<br />
			{{ getGameOverReason }}
			<br />
			<br />
			<button class="actionsLineButton" @click="context.undoLastAction()">{{ $t("action.undoLastAction") }}</button>
			<button class="actionsLineButton" @click="confirmEndGame">{{ $t("action.endGame") }}</button>
		</template>

		<!-- KICKOUT INFO -->
		<template v-if="personal.kickoutRequired > 0 && store.gameflow.phase !== rf.PHASE_GAME_OVER && store.gameflow.phase < rf.PRE_PHASE_OFFSET && store.gameflow.turnOrder[0] !== personal.pov && (store.actionStack.length === 0 || store.stackControl.loadedPreMove)">
			<div v-if="personal.kickoutRequired == 1" id="kickoutDiv">
				{{ $t("action.player") }}
				<b>{{ controller.timedOutPlayerObj().name }}</b>
				{{ $t("action.usedAllKickoutTime") }}
				<br />
				<br />
				{{ $t("action.remainingFlexTime") }}
				<span id="flexiKickoutTimerSpan">{{ view.getFlexiKickoutTImerText() }}</span>
				<br />
				<br />
				{{ $t("action.forMoreInfoSee") }}
				<b><a href="/help/" target="_blank">{{ $t("action.help") }}</a></b>
			</div>
			<div v-else id="kickoutDiv">
				<br />
				<template v-if="canKickoutNow()">
					<template v-if="store.context.action !== rf.ACT_CONFIRM_KICKOUT">
						{{ $t("action.player") }}
						<b>{{ controller.timedOutPlayerObj().name }}</b>
						{{ $t("action.hasTimedOut") }}
						<br />
						{{ $t("action.toKickOut") }}
						<b>{{ controller.timedOutPlayerObj().name }}</b>
						{{ $t("action.pressConfirmKickout") }}
						<br />
						{{ $t("action.gameWillProceed") }}
						<br />
						<br />
						{{ $t("action.otherwiseAllow") }}
						<b>{{ controller.timedOutPlayerObj().name }}</b>
						{{ $t("action.moreTimeReload") }}
						<br />

						<br />
						<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
						<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("action.notNow") }}</button></span>
						<span>
							<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t("action.keepInGame", { name: controller.timedOutPlayerObj().name }) }}</button>
						</span>
						<span><button class="actionsLineButton" id="confirmKickoutButton" @click="store.context.action = rf.ACT_CONFIRM_KICKOUT">{{ $t("action.confirmKickout") }}</button></span>
					</template>
					<template v-if="store.context.action === rf.ACT_CONFIRM_KICKOUT">
						{{ $t("action.permanentlyRemove") }}
						<b>{{ controller.timedOutPlayerObj().name }}</b>
						{{ $t("action.fromTheGame") }}
						<br />
						<b>{{ $t("action.cannotBeUndone") }}</b>
						<br />
						<br />
						{{ $t("action.checkChat") }}
						<br />
						{{ $t("action.gracePeriod") }}

						<br />
						<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
						<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("action.notNow") }}</button></span>
						<span>
							<button class="actionsLineButton" id="confirmKickoutButton" @click="Bot.actionPlayerKickout">{{ $t("action.permanentlyKickout", { name: controller.timedOutPlayerObj().name }) }}</button>
						</span>
					</template>
				</template>
				<template v-else>
					<br />
					{{ $t("action.player") }}
					<b>{{ controller.timedOutPlayerObj().name }}</b>
					{{ $t("action.hasTimedOut") }}
					<br />
					{{ $t("action.voteNeeded") }}
					<b>{{ controller.timedOutPlayerObj().name }}</b>
					<br />
					<br />
					{{ $t("action.votesLine", { count: kickoutVoteCount(), threshold: store.kickoutVoteThreshold, voters: kickoutVoters() }) }}
					<br />
					<br />
					<span v-if="!myKickoutVote()">
						<template v-if="isLastVoteRequired()">
							{{ $t("action.permanentlyRemove") }}
							<b>{{ controller.timedOutPlayerObj().name }}</b>
							{{ $t("action.fromTheGame") }}
							<br />
							<b>{{ $t("action.cannotBeUndone") }}</b>
							<br />
							<br />
						</template>
						<button class="actionsLineButton" id="voteKickoutButton" @click="Bot.actionPlayerKickout">{{ $t("action.voteToKickout", { name: controller.timedOutPlayerObj().name }) }}</button>
					</span>
					<span v-else>
						{{ $t("action.youVoted") }}
						<b>{{ controller.timedOutPlayerObj().name }}</b>
						<br />
						{{ $t("action.soloKickout", { countdown: soloKickoutCountdown }) }}
					</span>
					<br />
					<br />
					<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
					<span>
						<button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">{{ $t("action.notNow") }}</button>
					</span>
					<span>
						<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">{{ $t("action.keepInGame", { name: controller.timedOutPlayerObj().name }) }}</button>
					</span>
				</template>
			</div>
		</template>

		<!-- [Rewind/ERROR] ERROR TEXT -->
		<template v-if="store.gameMessages.errorText !== ''">
			<h1 class="errorText">{{ store.gameMessages.errorText }}</h1>
		</template>
		<template v-if="store.gameMessages.actionError !== ''">
			<h1 class="errorText">{{ store.gameMessages.actionError }}</h1>
		</template>
		<!-- [BUG]]  SUCCESS TEXT -->
		<template v-if="store.gameMessages.successText !== ''">
			<h2 id="successText" v-html="store.gameMessages.successText"></h2>
		</template>

		<!-- ALWAYS SHOWS GAME END-->
		<template v-if="store.gameflow.phase === rf.PHASE_GAME_OVER">
			<!-- ASSUME FULL-TO IS SORTED WITH WINNER AT INDEX 0 -->
			<div id="gameEndDiv">
				{{ $t("action.gameOver") }}
				<br />
				{{ getGameOverReason }}
				<template v-if="store.gameflow.fullTurnOrder === personal.pov">
					<h1>{{ $t("action.congratulations") }}</h1>
				</template>
				<template v-else>
					<br />
					<br />
				</template>
				{{ $t("action.winner") }}
				<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[store.gameflow.fullTurnOrder[0]].colour)">{{ store.players[store.gameflow.fullTurnOrder[0]].displayName }}</span>

				({{ wonder.getPlayerTotalScore(store.gameflow.fullTurnOrder[0]) }})
				<br />
				<template v-for="(playerIndex, idx1) in store.gameflow.fullTurnOrder.slice(1)" :key="idx1">
					{{ getOrdinal(idx1 + 2) }}:
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>

					({{ wonder.getPlayerTotalScore(playerIndex) }})
					<br />
				</template>
				<br />
				<i18n-t keypath="action.fancyRematch" tag="span" scope="global">
					<template #rematch><a :href="'/createRNBpage/' + String(personal.gameID) + '/'">{{ $t("action.rematch") }}</a></template>
				</i18n-t>
				<br />
				<template v-if="personal.soloGame">
					<br />
					<a class="viewHighScoresBtn" :href="'/RNB/highscores/map/' + store.mapData.setupData.UK + '/'" target="_blank">{{ $t("topMenu.viewHighscores") }}</a>
				</template>
				<br />
			</div>
		</template>

		<!-- INTRO TEXT -->
		<div v-if="store.gameflow.turn === 1 && store.gameflow.phase === rf.PHASE_CHOOSE_HOME_TILE && !store.viewSettings.showReplay">
			<h2>{{ $t("action.welcomeTitle") }}</h2>
			<div class="introRow">
				<div class="leftCol">
					<img :src="view.getImage('transporterSelectHelp')" :alt="$t('action.introSelectMap')" width="203" height="222" />
				</div>
				<div class="rightCol">
					{{ $t("action.introSelectMap") }}
					<br />
					{{ $t("action.introSelectZoom") }}
					<br />
					{{ $t("action.introZoomCrowded") }}
					<br />
					<br />
					{{ $t("action.introDeselect") }}
					<br />
					<br />
					{{ $t("action.introInteract") }}
					<br />
					<br />
					{{ $t("action.introPreSet") }}
					<br />
					{{ $t("action.introInterfere") }}
				</div>
			</div>

			{{ $t("action.introPreferencesPrefix") }}
			<a class="linkOther" href="/profileRNB/" target="_blank">{{ $t("action.preferencesLink") }}</a>
			!
			<br />
			<br />
			{{ $t("action.introHelpPrefix") }}
			<a class="linkOther" href="/RNB/help/" target="_blank">{{ $t("action.helpLink") }}</a>

			<template v-if="personal.soloGame">
				{{ $t("action.soloRulesTitle") }}
				<br />
				<br />
				{{ $t("action.soloStarts17") }}
				<br />
				{{ $t("action.soloEnds20") }}
				<br />
				{{ $t("action.soloMines") }}
			</template>
			<br />
			<br />
			<br />
		</div>

		<!-- Always add this component - it self selects to display inside the component -->
		<ActionAreaPrePhase />
		<!-- CURRENT PLAYER ONLY-->
		<template v-if="personal.canPlay() && !store.stackControl.previewingPhase">
			<!-- CHOOSE START TILE -->
			<div v-if="store.gameflow.phase === rf.PHASE_CHOOSE_HOME_TILE">
				<span class="donkeyWarningSpan">
					{{ $t("action.introComplexity") }}
					<br />
					{{ $t("action.introComplexityTesting") }}
					<br />
					{{ $t("action.introComplexityBugs") }}
					<br />
				</span>
				<br />
				<br />
				<h2>{{ personal.mapName }}</h2>
				<h3 class="mapDescriptionH">{{ personal.mapDescription }}</h3>
				<template v-if="personal.soloGame">
					<br />
					<a class="viewHighScoresBtn" :href="'/RNB/highscores/map/' + store.mapData.setupData.UK + '/'" target="_blank">{{ $t("topMenu.viewHighscores") }}</a>
				</template>
				<br />
				{{ $t("action.chooseHomeTile") }}
				<div v-if="remainingStartSpots.length > 0" class="setStartSpotsBox">
					<b>{{ $t("action.setStartSpots") }}</b>
					<br />
					{{ remainingStartSpots.length === 1 ? $t("action.startSpotsLeftOne", { count: remainingStartSpots.length }) : $t("action.startSpotsLeftMany", { count: remainingStartSpots.length }) }}
					<br />
					{{ $t("action.startSpotsHighlight", { regions: startSpotRegionsText }) }}
				</div>
				<template v-if="store.context.action === rf.ACT_CONFIRM_END_TURN">
					<template v-if="chosenStartTileIsPolder()">
						<br />
						<br />
						<span class="donkeyWarningSpan">
							{{ chosenStartTileIsFloodedPolder() ? $t("action.floodedPolderCaution") : $t("action.polderCaution") }}
						</span>
					</template>
					<br />
					<br />
					<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
					<button @click="localEndPlayerTurn" class="actionsLineButton">{{ $t("action.endTurn") }}</button>
				</template>
			</div>
			<!-- CONFLICT WAIT & SEE -->
			<ConflictDecisionPanel v-if="!rf.MAIN_PHASES.includes(store.gameflow.phase) && !rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)" />
			<!-- CONFLICT PRAYING -->
			<div v-if="rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase)">
				{{ $t("action.conflictCalledBy") }}
				<template v-for="(playerIndex, idx) in getConflictCallingPlayerIndexes()" :key="idx">
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>
				</template>
				<br />
				{{ $t("action.nextPhase") }}
				<b>{{ view.phaseStr(wonder.getNextPhaseFromHistory()) }}</b>
				<br />
				<b><u>{{ $t("action.currentPrayingOrder") }}</u></b>
				<br />
<!-- temple area-->
			<div>
				<!--Old temple figures -->
				<template v-for="(playerIndex, idx) in store.gameflow.wonderPrayingOrder" :key="idx">
					<div
						v-if="playerIndex !== -1 && store.players[playerIndex]"
						class="prayingDiv"
						:class="{ wholeTurnOrderFigureDivActive: playerIndex === store.gameflow.turnOrder[0] }"
						:style="{
							borderColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
						}">
						<img class="prayingFigureImg" :src="view.getImage('pray_' + String(personal.getCorrectedColour(store.players[playerIndex].colour)))" />
					</div>
				</template>
				<img class="templeIconImg" :src="view.getImage('temple_icon')" />
			</div>
			<br />
			<b><u>{{ $t("action.newPrayingOrder") }}</u></b>
				<br />
				<!-- NEW temple figures -->
				<div>
					<template v-for="(playerIndex, idx) in store.gameflow.newWonderPrayingOrder" :key="idx">
						<div
							v-if="playerIndex !== -1"
							class="prayingDiv"
							:class="'prayingDiv' + String(playerIndex)"
							:style="{
								borderColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
							}">
							<img class="prayingFigureImg" :src="view.getImage('pray_' + String(personal.getCorrectedColour(store.players[playerIndex].colour)))" />
						</div>
						<div v-if="playerIndex === -1" class="emptyPrayingDiv"></div>
					</template>
					<img class="templeIconImg" :src="view.getImage('temple_icon')" />
				</div>

				<button @click="cashInPraying(true)" class="actionsLineButton">{{ $t("action.cashInAndEndTurn") }}</button>
				<button @click="keepPraying(true)" class="actionsLineButton">{{ $t("action.keepPrayingAndEndTurn") }}</button>
			</div>
			<!-- CONFLICT_TO-->
			<div v-else-if="rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase)">
				{{ $t("action.conflictCalledBy") }}
				<template v-for="(playerIndex, idx) in getConflictCallingPlayerIndexes()" :key="idx">
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>
				</template>
				<br />
				{{ $t("action.nextPhase") }}
				<b>{{ view.phaseStr(wonder.getNextPhaseFromHistory()) }}</b>
				<br />

				<b><u>{{ $t("action.currentPrayingOrder") }}</u></b>
				<br />
				<!-- temple area-->
				<div>
					<!--Old temple figures -->
					<template v-for="(playerIndex, idx) in store.gameflow.wonderPrayingOrder" :key="idx">
						<div
							v-if="playerIndex !== -1 && store.players[playerIndex]"
							class="prayingDiv"
							:class="{ wholeTurnOrderFigureDivActive: playerIndex === store.gameflow.turnOrder[0] }"
							:style="{
								borderColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
							}">
							<img class="prayingFigureImg" :src="view.getImage('pray_' + String(personal.getCorrectedColour(store.players[playerIndex].colour)))" />
						</div>
					</template>
					<img class="templeIconImg" :src="view.getImage('temple_icon')" />
				</div>
				<br />
				<b><u>{{ $t("action.newTurnOrder") }}</u></b>
				<br />
				<!-- NEW turn order figures -->
				<div>
					<!-- turn order figures -->
					{{ $t("action.first") }}
					<template v-for="(playerIndex, idx) in store.gameflow.wonderTurnOrder" :key="idx">
						<div v-if="playerIndex !== -1" class="wholeTurnOrderFigureDiv" :class="{ wholeTurnOrderFigureDivActive: playerIndex === store.gameflow.turnOrder[0] }">
							<div
								class="turnOrderFigureDiv"
								:style="{
									borderColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
									color: personal.getCorrectedColourHex(store.players[playerIndex].colour),
								}">
								{{ idx + 1 }}
							</div>
						</div>
						<div v-else-if="playerIndex === -1" @click="clickedNewTurnOrderDiv(idx)" class="emptyTurnOrderDiv"></div>
					</template>
					{{ $t("action.last") }}
				</div>
				<br />
				<template v-if="store.context.action !== rf.ACT_CONFIRM_END_TURN">{{ $t("action.chooseTurnOrderPosition") }}</template>
				<template v-else-if="store.context.action === rf.ACT_CONFIRM_END_TURN">
					<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
					<button @click="localEndPlayerTurn" class="actionsLineButton">{{ $t("action.endTurn") }}</button>
				</template>
			</div>

			<!-- PRODUCTIONS -->
			<div v-if="rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase) && store.context.action !== rf.ACT_CONFIRM_END_TURN && store.context.action !== rf.ACT_CONFIRM_RESIGN">
				<template v-if="store.context.action === rf.ACT_CHOOSE_BUILDING_TO_UPGRADE">
					{{ $t("action.productionSelectUpgrade") }}
					<br />
					<br />
					<button class="actionsLineButton" @click="stopUpgradingBuildings">{{ $t("action.stopUpgrading") }}</button>
				</template>
				<template v-else-if="[rf.ACT_SELECT_WATER_FOR_NEW_TRANSPORTER].includes(store.context.action)">
					{{ $t("action.productionSelectWater") }}
					<br />
					<br />
					<button class="actionsLineButton" @click="IO.resetGameStateToLoadedPreMove()" v-if="rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)">{{ $t("common.cancel") }}</button>
					<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
					<button @click="context.undoLastAction()" class="actionsLineButton">{{ $t("action.undoLastAction") }}</button>
				</template>
				<template v-else-if="[rf.ACT_REMOVE_EXCESS_TRANSPORTERS, rf.ACT_REMOVE_EXCESS_TRANSPORTERS_FOR_DONKEY].includes(store.context.action)">
					{{ $t("action.productionRemoveExcess") }}
					<br />
					<br />
					<button class="actionsLineButton" @click="IO.resetGameStateToLoadedPreMove()" v-if="rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)">{{ $t("common.cancel") }}</button>
					<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
					<button @click="context.undoLastAction()" class="actionsLineButton">{{ $t("action.undoLastAction") }}</button>
				</template>
				<template v-else>
					{{ $t("action.productionSelectAuto") }}
					<br />
					<span v-if="personal.soloGame && store.gameflow.turn === lastSoloTurn" class="donkeyWarningSpan">
						<br />
						{{ $t("action.lastTurnCaution") }}
						<br />
					</span>
					<!-- current player info -->
					<span v-if="controller.playingOutOfTurn()" class="errorText">
						<br />
						{{ $t("action.notCurrentPlayer") }}
						<br />
					</span>
					<FailedStackEntry v-if="store.stackControl.failedStackHistoryEntry.length > 0" />
					<!-- Researh -->
					<template v-if="store.context.researchHexIDpossibilities.length > 0">
						{{ $t("action.canResearchTiles") }}
						<MiniHex class="summaryMiniHex" v-for="(hexID, idx) in store.context.researchHexIDpossibilities" :key="idx" :hexID="hexID" :scale-factor="1" />
						<br />
					</template>
					<template v-if="store.context.selectedTransporterIDforTM === -9 && loc.isAnyHexLocation(model.getTransporterByID(store.context.selectedTransporterIDforTM).location) && store.context.researchHexIDpossibilities.includes(model.getTransporterByID(store.context.selectedTransporterIDforTM).location[1])">
						{{ $t("action.canResearchWithTransporter") }}
						<br />
						<div class="allResearchOptions">
							<template v-for="(isResearched, idx) in controller.currentPlayerObj().RnD" :key="idx">
								<div v-if="isResearched === 0 && (idx !== rf.RND_FUNDAMENTAL_RESEARCH_IDX || (idx === rf.RND_FUNDAMENTAL_RESEARCH_IDX && store.gameOptions.useFundamentalResearch))" class="researchOptionDiv" @click="produce.doResearch(idx)">
									<img :src="view.getImage(`research_${idx}`)" class="researchOptionImg" />
									{{ view.rndName(idx) }}
								</div>
							</template>
						</div>
					</template>
					<div class="cancelTransporterHolderDiv">
						<button v-if="store.context.selectedTransporterIDforTM !== -1" @click="highlight.deselectTransporter" class="actionsLineButton">{{ $t("action.deselectTransporter") }}</button>
					</div>
					<div v-for="(entry, donkeyIdx) in store.context.possibleDonkeyReproductionData" :key="donkeyIdx" class="donkeyReproductionDiv">
						<!-- Visuals -->
						<mini-hex :hexID="entry[0][0]" :scale-factor="0.8" />
						<img class="donkeyAboutToReproduceImg" :src="view.getImage(`transporter_${rf.DONKEY}_${personal.getCorrectedColour(controller.currentPlayerObj().colour)}`)" />
						<img class="donkeyAboutToReproduceImg" :src="view.getImage(`transporter_${rf.DONKEY}_${personal.getCorrectedColour(controller.currentPlayerObj().colour)}`)" />
						<!-- Label (text) + Checkbox (on the right) -->
						<label class="donkeyReproductionLabel">
							{{ $t("action.allowDonkeys") }}
							<input type="checkbox" v-model="entry[1]" :true-value="true" :false-value="false" @change="(e) => handleDonkeyCheckboxChange(entry, e.target.checked)" />
							<span class="checkmark"></span>
						</label>
						<!-- ADD BUTTON TO REMOVE EXCESS TRANS TO MAKE ROOM, OR, CAUTION THAT YOU CAN'T -->
						<template v-if="entry[2] !== -1">
							{{ $t("action.byRemoving") }}
							<img class="donkeyAboutToReproduceImg" :src="view.getImage(`transporter_${model.getTransporterByID(entry[2]).type}_${personal.getCorrectedColour(controller.currentPlayerObj().colour)}`)" />
						</template>
						<template v-else-if="entry[1] && anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx)).includes(true)">
							<button @click="presetTransporterRemovalForDonkey(donkeyIdx)" v-if="highlight.getEligibleTransportersForRemoval(controller.currentPlayerIndex(), anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx))[0], anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx))[1], false).length > 0" class="actionsLineButton">{{ $t("action.selectTransporterToRemove") }}</button>
							<span v-else class="errorText">{{ $t("action.unableRemoveTransporters") }}</span>
						</template>
						<template v-if="entry[1] && anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx)).includes(true)">
							<div class="flexBreak"></div>
							<span class="donkeyWarningSpan" v-if="anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx))[0]">{{ $t("action.unableMax8") }}</span>
							<span class="donkeyWarningSpan" v-if="anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx))[1]">{{ $t("action.unableMax5Land") }}</span>
						</template>
					</div>
					<div v-if="store.context.action === rf.ACT_SELECT_INPUT_RESOURCES_FOR_SEC_PRODUCTION">
						<b>
							<u>{{ $t("action.selectInputGoods") }}</u>
						</b>
						<br />
						<div class="flexContainer">
							{{ $t("action.chosenGoods") }}
							<img @click="removeResFromInput(res)" v-for="res in store.context.chosenInputGoods[1]" :key="res" class="resImgChoice" :src="view.getImage(`res_${res}`)" />
							<div v-for="i in 2 - store.context.chosenInputGoods[1].length" :key="i" class="blankInputRes"></div>
						</div>
						<div class="flexContainer" v-if="store.context.chosenInputGoods[1].length < 2">
							{{ $t("action.availableGoods") }}
							<img @click="addResToInput(res)" v-for="res in store.context.chosenInputGoods[0]" :key="res" class="resImgChoice" :src="view.getImage(`res_${res}`)" />
						</div>
						<div class="flexContainer" v-else>
							<button class="actionsLineButton" @click="cancelInputGoods">{{ $t("common.cancel") }}</button>
							<button class="actionsLineButton" @click="resetInputGoods">{{ $t("action.resetGoods") }}</button>
							<button class="actionsLineButton" @click="confirmInputGoods">{{ $t("action.confirmGoods") }}</button>
						</div>
					</div>
					<div v-if="![rf.ACT_SELECT_INPUT_RESOURCES_FOR_SEC_PRODUCTION, rf.ACT_REMOVE_EXCESS_TRANSPORTERS, rf.ACT_SELECT_WATER_FOR_NEW_TRANSPORTER].includes(store.context.action)">
						<button id="resignButton" v-if="personal.canResign()" class="actionsLineButton" @click="localClickResign">{{ $t("action.resign") }}</button>
						<button class="actionsLineButton" @click="IO.resetGameStateToLoadedPreMove()" v-if="rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)">{{ $t("common.cancel") }}</button>
						<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
						<button @click="context.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">{{ $t("action.undoLastAction") }}</button>
						<button v-if="personal.trainingGame || personal.soloGame" @click="finishActionsAndEndTurn($event)" class="actionsLineButton">{{ $t("action.finishActionsEndTurn") }}</button>
						<button v-else @click="finishActions(false, $event)" class="actionsLineButton">{{ $t("action.finishActions") }}</button>
					</div>
				</template>
			</div>

		<!-- MOVEMENT-->
		<div v-if="rf.PHASE_MOVEMENTS.includes(store.gameflow.phase) && store.context.action !== rf.ACT_CONFIRM_END_TURN">
		<span v-if="store.context.selectedTransporterIDforTM === -1">{{ $t("action.movementSelect") }}</span>
		<span v-else>{{ $t("action.moveOrPickup") }}</span>
		<br />
			<span v-if="personal.soloGame && store.gameflow.turn === lastSoloTurn" class="donkeyWarningSpan">
					<br />
					Caution: This is your last turn
					<br />
				</span>
				<!-- current player info -->
				<span v-if="controller.playingOutOfTurn()" class="errorText">
					<br />
					You are not the current player. Your move will be processed in turn order
				</span>
				<FailedStackEntry v-if="store.stackControl.failedStackHistoryEntry.length > 0" />
				<span v-if="store.context.errorUnableToDropGeeseAtSea" class="donkeyWarningSpan">
					<br />
					{{ $t("action.unableDropGeese") }}
				</span>
				<span v-if="anyFollowingGeeseOnRiver()" class="donkeyWarningSpan">
					<br />
					{{ $t("action.mustDropGeese") }}
				</span>
				<span v-else><br /></span>
				<br />
				<div class="cancelTransporterHolderDiv">
					<button v-if="store.context.selectedTransporterIDforTM !== -1" @click="highlight.deselectTransporter" class="actionsLineButton">{{ $t("action.deselectTransporter") }}</button>
				</div>
				<button class="actionsLineButton" @click="IO.resetGameStateToLoadedPreMove()" v-if="rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)">{{ $t("common.cancel") }}</button>
				<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
				<button @click="context.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">{{ $t("action.undoLastAction") }}</button>
				<template v-if="!store.context.errorUnableToDropGeeseAtSea && !anyFollowingGeeseOnRiver()">
					<button v-if="personal.trainingGame || personal.soloGame" @click="finishActionsAndEndTurn($event)" class="actionsLineButton">{{ $t("action.finishActionsEndTurn") }}</button>
					<button v-else @click="finishActions(false, $event)" class="actionsLineButton">{{ $t("action.finishActions") }}</button>
				</template>
			</div>

			<!-- BUILDING -->
			<div v-if="rf.PHASE_BUILDINGS.includes(store.gameflow.phase) && store.context.action !== rf.ACT_CONFIRM_END_TURN">
				<span v-if="store.context.selectedTransporterIDforTM === -1">{{ $t("action.buildingSelect") }}</span>
				<span v-else>{{ $t("action.chooseBuilding") }}</span>
				<br />
				<span v-if="personal.soloGame && store.gameflow.turn === lastSoloTurn" class="donkeyWarningSpan">
					<br />
					Caution: This is your last turn
					<br />
				</span>
				<!-- current player info -->
				<span v-if="controller.playingOutOfTurn()" class="errorText">
					<br />
					You are not the current player. Your move will be processed in turn order
				</span>
				<FailedStackEntry v-if="store.stackControl.failedStackHistoryEntry.length > 0" />
				<div class="cancelTransporterHolderDiv">
					<button v-if="store.context.selectedTransporterIDforTM !== -1" @click="highlight.deselectTransporter" class="actionsLineButton">{{ $t("action.deselectTransporter") }}</button>
				</div>
				<button class="actionsLineButton" @click="IO.resetGameStateToLoadedPreMove()" v-if="rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)">{{ $t("common.cancel") }}</button>
				<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
				<button @click="context.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">{{ $t("action.undoLastAction") }}</button>

				<button v-if="personal.trainingGame || personal.soloGame" @click="finishActionsAndEndTurn($event)" class="actionsLineButton">{{ $t("action.finishActionsEndTurn") }}</button>
				<button v-else @click="finishActions(false, $event)" class="actionsLineButton">{{ $t("action.finishActions") }}</button>
			</div>

			<!-- WONDER-->
			<div v-if="rf.PHASE_WONDERS.includes(store.gameflow.phase) && store.context.action !== rf.ACT_CONFIRM_END_TURN && store.context.action !== rf.ACT_CONFIRM_END_GAME">
				<span>{{ $t("action.wonderSelect") }}</span>
				<br />
				<span v-if="personal.soloGame && store.gameflow.turn === lastSoloTurn" class="donkeyWarningSpan">
					<br />
					Caution: This is your last turn
					<br />
					<br />
				</span>
				<!-- current player info -->
				<span v-if="controller.playingOutOfTurn()" class="errorText">
					You are not the current player. Your move will be processed in turn order
					<br />
				</span>
				<FailedStackEntry v-if="store.stackControl.failedStackHistoryEntry.length > 0" />
				<span v-if="store.context.wonderError === 1" class="donkeyWarningSpan">
					{{ $t("action.noTransportersHome") }}
					<br />
				</span>
				<span v-else-if="store.context.wonderError === 2" class="donkeyWarningSpan">
					{{ $t("action.notEnoughGoodsHome") }}
					<br />
				</span>
				<template v-else>
					<img v-for="(resID, idx) in store.context.resIDsOnHomeTile" :key="idx" @click="clickedWonderBrickOption(resID)" class="wonderChoiceRes" :class="{ wonderChoiceResActive: wonder.requiredResourcesForWonderBrick(controller.currentPlayerIndex()) - store.context.resIDsInWonderBrick.length > 0 }" :src="view.getImage(model.getResByID(resID).gfx)" />
					<br />
					{{ $t("action.requiredGoods") }} {{ wonder.requiredResourcesForWonderBrick(controller.currentPlayerIndex()) - store.context.resIDsInWonderBrick.length }}
					<br />
					<img v-for="(resID, idx) in store.context.resIDsInWonderBrick" :key="idx" @click="clickedWonderBrickOption(resID)" class="wonderChoiceRes wonderChoiceResActive" :src="view.getImage(model.getResByID(resID).gfx)" />
					<div v-for="requiredRes in wonder.requiredResourcesForWonderBrick(controller.currentPlayerIndex()) - store.context.resIDsInWonderBrick.length" :key="requiredRes" class="requiredWonderResDiv">{{ $t("action.good") }}</div>
					<!--<template v-if="wonder.requiredResourcesForWonderBrick(controller.currentPlayerIndex()) - store.context.resIDsInWonderBrick.length === 0">
						<br />
						<button @click="addBrickToWonder" class="actionsLineButton">Add Brick</button>
					</template>-->
				</template>
				<br />
				<button class="actionsLineButton" @click="IO.resetGameStateToLoadedPreMove()" v-if="rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)">{{ $t("common.cancel") }}</button>
				<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
				<button @click="context.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">{{ $t("action.undoLastAction") }}</button>

				<button v-if="personal.trainingGame || personal.soloGame" @click="finishActionsAndEndTurn($event)" class="actionsLineButton">{{ $t("action.finishActionsEndTurn") }}</button>
				<button v-else @click="finishActions(false, $event)" class="actionsLineButton">{{ $t("action.finishActions") }}</button>
			</div>

			<!-- Confirm Turn End -->
			<div v-if="store.context.action === rf.ACT_CONFIRM_END_TURN && store.gameflow.phase !== rf.PHASE_CHOOSE_HOME_TILE && !rf.ALL_PHASE_CONFLICTS.includes(store.gameflow.phase)">
				{{ $t("action.endTurnQuestion") }}
				<br />
				<!-- PRODUCTION RESEARCH REMAINING -->
				<template v-if="rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase) && store.context.researchHexIDpossibilities.length > 0">
					{{ $t("action.canResearchTiles") }}
					<MiniHex class="summaryMiniHex" v-for="(hexID, idx) in store.context.researchHexIDpossibilities" :key="idx" :hexID="hexID" :scale-factor="1" />
					<br />
				</template>
				<!-- PRODUCTION MORE SEC BLDGS -->
				<template v-if="rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase) && store.context.buildingIDsToHighlight.length > 0">
					{{ $t("action.canProduceTiles") }}
					<template v-for="(bldgID, idx) in store.context.buildingIDsToHighlight" :key="idx">
						<MiniHex class="summaryMiniHex" :hexID="model.getBuildingByID(bldgID).location[1]" :buildingNonMineNum="model.getBuildingByID(bldgID).type" :scale-factor="1" />
					</template>
					<br />
				</template>
				<!-- PRODUCTION - DONKEY SUMMARY-->
				<template v-if="rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase) && store.context.possibleDonkeyReproductionData.some((entry) => entry[1] === true)">
					<br />
					<!-- Donkey reproduction problem check -->
					<template v-if="!anyDonkeyProducingProblemsNoParam.includes(true)">
						<span class="donkeyNoProblemSpan">{{ $t("action.gainDonkeys", { count: numNewDonkeys }) }}</span>
					</template>
					<template v-else>
						{{ $t("action.unableToReproduce") }}
						<br />
						<span class="donkeyWarningSpan" v-html="getDonkeyWarningText"></span>
					</template>
					<br />
				</template>
				<!-- MOVEMENT - Transporters that can still move -->
				<template v-if="rf.PHASE_MOVEMENTS.includes(store.gameflow.phase) && store.context.remainingTransportersWithMovement.length > 0">
					{{ $t("action.canMoveTransporters") }}
					<MiniHex class="summaryMiniHex" v-for="(entry, idx) in store.context.remainingTransportersWithMovement" :key="idx" :hexID="entry[0]" :transporterGfx="entry[1]" :scale-factor="1" />
				</template>
				<!-- BUILDING - REMAINING MAIN BUILDINGS TO BUILD -->
				<template v-if="rf.PHASE_BUILDINGS.includes(store.gameflow.phase) && store.context.remainingBuildingSummaryOptions.length > 0">
					{{ $t("action.canBuildOn") }}
					<MiniHex class="summaryMiniHex" v-for="(entry, idx) in store.context.remainingBuildingSummaryOptions" :key="idx" :hexID="entry[0]" :transporterGfx="entry[1]" :scale-factor="1" />
				</template>
				<!-- Set preference for next turn -->
				<br />
				<ConflictDecisionPanel />

				<button @click="resetWholeTurn" class="actionsLineButton">{{ $t("action.resetWholeTurn") }}</button>
				<button @click="context.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">{{ $t("action.undoLastAction") }}</button>
				<button @click="localGoBack" class="actionsLineButton">{{ $t("action.back") }}</button>
				<button @click="localEndPlayerTurn" class="actionsLineButton">{{ $t("action.endTurn") }}</button>
			</div>
		</template>

		<!-- Trade area - available during wonder phase even if you have already moved -->
		<div v-if="rf.PHASE_WONDERS.includes(store.gameflow.phase)" class="tradeAreaStandalone">
			<PlayerTradeArea />
		</div>

		<template v-if="store.stackControl.previewingPhase">
			<div>
				{{ $t("action.previewingPhase", { phase: view.phaseStr(store.stackControl.previewingPhase % 16) }) }}
				<br />
				<button class="actionsLineButton" @click="IO.cancelPreviewAndRedo">{{ $t("action.cancelMoveRedo") }}</button>
				<button class="actionsLineButton" @click="IO.backFromPreview">{{ $t("action.back") }}</button>
			</div>
		</template>
	</div>
</template>

<style scoped>
#actionAreaDiv {
	font-weight: bolder;
	background-color: aliceblue;
}
.tradeAreaStandalone {
	display: flex;
	justify-content: center;
}

.errorText,
#loggedOutText {
	font-weight: bolder;
	background-color: lightgoldenrodyellow;
	color: darkred;
}

#successText {
	color: darkgreen;
	background-color: lightblue;
}

#resignButton {
	margin-right: 100px;
}

.flexContainer {
	display: flex;
	align-items: center;
	gap: 0px;
	/* Add spacing between elements */
	margin-bottom: 2px;
	justify-content: center;
}

.cancelTransporterHolderDiv {
	height: 50px;
}

.donkeyAboutToReproduceImg {
	height: 40px;
}

.donkeyNoProblemSpan {
	color: darkgreen;
	background-color: lightblue;
}

.donkeyWarningSpan {
	width: 100%;
	font-weight: bolder;
	font-family: Arial, sans-serif;
	text-align: center;
	background-color: lightgoldenrodyellow;
	color: darkred;
}

.setStartSpotsBox {
	width: 100%;
	box-sizing: border-box;
	margin: 10px 0;
	padding: 8px;
	border: 3px solid darkgreen;
	border-radius: 6px;
	background-color: lightyellow;
	color: darkgreen;
	font-weight: bold;
	text-align: center;
}

.blankInputRes {
	width: 40px;
	height: 40px;
	margin-right: 2px;
	border: 2px solid black;
	box-sizing: border-box;
}

.resImgChoice {
	width: 40px;
	height: 40px;
	margin-right: 2px;
	border: 4px solid yellow;
	box-sizing: border-box;
}

.resImgChoice:hover {
	border: 4px solid lightgreen;
}

.eligibleBuildingsToBuildDiv {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 10px;
	margin-bottom: 10px;
}

.flexBreak {
	flex-basis: 100%;
	height: 0;
}

/** DONKEY REPRODUCTION */
.donkeyReproductionDiv {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	margin-bottom: 10px;
	flex-wrap: wrap;
	padding: 8px;
	background: rgba(255, 255, 255, 0.08);
	border-radius: 8px;
}

/* Label with checkbox on the right */
.donkeyReproductionLabel {
	display: flex;
	align-items: center;
	gap: 10px;
	cursor: pointer;
	font-size: 15px;
	font-weight: 500;
	user-select: none;
	white-space: nowrap;
}

.donkeyReproductionLabel:hover {
	color: blue;
}

/* This makes checkbox appear AFTER the text */

/* Hide native checkbox */
.donkeyReproductionLabel input {
	opacity: 0;
	width: 0;
	height: 0;
	position: absolute;
}

/* Custom checkmark */
.checkmark {
	width: 20px;
	height: 20px;
	border: 2px solid #aaa;
	border-radius: 4px;
	background: white;
	flex-shrink: 0;
	position: relative;
	transition: all 0.2s;
}

/* Checked state */
.donkeyReproductionLabel input:checked ~ .checkmark {
	background: #4caf50;
	border-color: #4caf50;
}

/* Checkmark tick */
.checkmark:after {
	content: "";
	position: absolute;
	display: none;
	left: 6px;
	top: 2px;
	width: 5px;
	height: 11px;
	border: solid white;
	border-width: 0 3px 3px 0;
	transform: rotate(45deg);
}

.donkeyReproductionLabel input:checked ~ .checkmark:after {
	display: block;
}

.wonderChoiceRes {
	width: 50px;
	border: 3px solid black;
	margin-right: 2px;
}

.wonderChoiceResActive {
	border: 3px solid yellow;
}

.wonderChoiceResActive:hover {
	border: 3px solid lightgreen;
}

.requiredWonderResDiv {
	display: inline-block;
	pointer-events: none;
	width: 50px;
	height: 50px;
	line-height: 50px;
	border: 2px solid black;
	margin: auto;
	margin-right: 2px;
	vertical-align: top;
}

#fLoadingBar {
	width: 100%;
	text-align: center;
	font-size: 40px;
	font-weight: bolder;
}

/** WONDER AREA */
.prayingDiv {
	border: 8px solid;
	box-sizing: border-box;
	width: 38px;
	height: 38px;
	pointer-events: none;
	border-radius: 100%;
	display: inline-block;
	vertical-align: middle;
}

.emptyPrayingDiv {
	border: 8px solid black;
	box-sizing: border-box;
	width: 38px;
	height: 38px;
	pointer-events: none;
	border-radius: 100%;
	display: inline-block;
	vertical-align: middle;
}

.templeIconImg {
	height: 38px;
	vertical-align: middle;
}

.prayingFigureImg {
	width: 80%;
	height: 100%;
}

.wholeTurnOrderFigureDiv {
	display: inline-block;
	vertical-align: middle;
}

.wholeTurnOrderFigureDivActive {
	background-color: lightgreen;
}

.turnOrderFigureDiv {
	border: 8px solid;
	width: 30px;
	height: 30px;
	pointer-events: none;
	border-radius: 100%;
	vertical-align: middle;
	font-weight: bolder;
	font-size: 25px;
	line-height: 30px;
	text-align: center;
}

.emptyTurnOrderDiv {
	border: 8px solid grey;
	width: 30px;
	height: 30px;
	border-radius: 100%;
	display: inline-block;
	vertical-align: middle;
	font-weight: bolder;
	font-size: 25px;
	text-align: center;
	cursor: pointer;
}

.emptyTurnOrderDiv:hover {
	border: 8px solid lightgreen;
}

.summaryMiniHex {
	vertical-align: middle;
}

.allResearchOptions {
	display: flex;
	justify-content: center;
	gap: 4px;
}

.researchOptionDiv {
	display: inline-block;
	width: 100px;
	border: 4px solid yellow;
	margin-right: 4px;
}

.researchOptionDiv:hover {
	border: 4px solid lightgreen;
}

.researchOptionImg {
	width: 100%;
	margin-top: 0px;
	vertical-align: top;
}

#gameEndDiv {
	font-size: 30px;
	font-weight: bold;
	margin-top: 10px;
}

.resignImg {
	width: 256px;
	height: 256px;
	margin: 20px;
	border: 2px solid black;
}

.introRow {
	display: flex;
	align-items: flex-start;
}

.leftCol {
	flex: 0 0 203px;
}

.leftCol img {
	width: 203px;
	height: 222px;
	padding: 5px;
}

.rightCol {
	flex: 1 1 auto;
	text-align: left;
	padding: 5px;
}

.mapDescriptionH {
	white-space: pre-line;
	max-width: 800px;
	margin: auto;
}

.viewHighScoresBtn {
	background-color: #04aa6d;
	color: white;
	padding: 16px 0px;
	margin: 8px 0;
	border: none;
	cursor: pointer;
	width: 100%;
	opacity: 0.9;
	font-size: 20px;
	text-decoration: none;
	display: inline-block;
	text-align: center;
}

.viewHighScoresBtn:hover {
	opacity: 1;
}
</style>
