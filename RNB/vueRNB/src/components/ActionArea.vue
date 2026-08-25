<script setup>
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
import * as wonder from "../js/RNBwonder"
import * as Bot from "../js/RNBbot"
import * as build from "../js/RNBbuild"
import * as IO from "../backend/RNB_IO"

import MiniHex from "./Utils/MiniHex.vue"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/RNBpersonal.js"
const personal = usePersonalStore()

import { computed, ref, watch, onUnmounted } from "vue"

import FailedStackEntry from "./Utils/FailedStackEntry.vue"
import ActionAreaPrePhase from "./ActionAreaPrePhase.vue"
import ConflictDecisionPanel from "./ConflictDecisionPanel.vue"

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
	if (ret[0] === true) warningText += `You may only have 8 total Transporters. Gaining ${ret[2]} Donkey(s) would give you ${ret[2] + ret[3]}<br/> `
	if (ret[1] === true) warningText += `You may only have 5 Land Transporters. Gaining ${ret[2]} Donkey(s) would give you ${ret[2] + ret[4]}<br/> `
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
	if (num === 1) return "1st"
	else if (num === 2) return "2nd"
	else if (num === 3) return "3rd"
	else if (num === 4) return "4th"
	else if (num === 5) return "5th"
	else if (num === 6) return "6th"
	return "Unknown ordinal"
}

function cancelKickout() {
	personal.kickoutRequired = 0
}

function currentKickoutTarget() {
	return controller.timedOutPlayerObj().name
}
function myKickoutVote() {
	if (personal.pov < 0) return false
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
	() => personal.pov >= 0 ? store.kickoutVotesData[personal.name] : false,
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
	if (store.players.length === 2 && store.wonderBricks.length >= 62) return "(Brick built on 2 player mark)"
	if (store.players.length === 3 && store.wonderBricks.length >= 66) return "(Brick built on 3 player mark)"
	if (store.players.length === 4 && store.wonderBricks.length >= 69) return "(Brick built on 4 player mark)"
	if (store.players.length === 5 && store.wonderBricks.length >= 76) return "(Brick built on 5 player mark)"
	if (store.players.length === 6 && store.wonderBricks.length >= 83) return "(Brick built on 6 player mark)"

	const neutralBricksUsed = store.wonderBricks.filter((num) => num === 8 || num === 9).length
	if (neutralBricksUsed >= 33 && !personal.soloGame) return "(33 Neutral Bricks in Wonder)"
	if (store.CUSTOM_RULES.includes(rf.CR_USE_ONLY_28_NEUTRAL_BRICKS) && neutralBricksUsed >= 28 && !personal.soloGame) return "(28 Neutral Bricks in Wonder)"
	if (personal.soloGame && neutralBricksUsed >= 37) return "(20 turn solo limit)"

	let nbNonPlayers = 0
	for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++

	if (nbNonPlayers >= store.players.length - 1) return "Last man standing"

	return "Unknown reason"
})
</script>

<template>
	<div v-if="store.viewSettings.showLoader" id="fLoadingBar">
		Saving Game.... Please Wait....
		<br />
		<img :src="view.getImage('loading-bar-black')" />
	</div>

	<div id="actionAreaDiv">
		<!-- LOGGED OUT TEXT -->
		<template v-if="personal.pov === -99">
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

		<!-- RESIGN -->
		<template v-if="store.context.action === rf.ACT_CONFIRM_RESIGN">
			Are you sure you want to resign?
			<br />
			Resigning will unbalance the game for the remaining players
			<br />
			Please carry on playing if that is at all possible
			<br />
			Even if you think you can't win, you can still aim for longest road / most walls / etc
			<br />
			<img class="resignImg" :src="view.getImage('resign')" />
			<br />
			<button class="actionsLineButton" @click="resetWholeTurn">Carry On Playing</button>
			<button class="actionsLineButton" @click="Bot.actionResign">Confirm Resignation</button>
		</template>

		<!-- CONFIRM END GAME -->
		<template v-if="store.context.action === rf.ACT_CONFIRM_END_GAME">
			This action will end the game.
			<br />
			{{ getGameOverReason }}
			<br />
			<br />
			<button class="actionsLineButton" @click="context.undoLastAction()">Undo Last Action</button>
			<button class="actionsLineButton" @click="confirmEndGame">End Game</button>
		</template>

		<!-- KICKOUT INFO -->
		<template v-if="personal.kickoutRequired > 0 && store.gameflow.phase !== rf.PHASE_GAME_OVER && store.gameflow.phase < rf.PRE_PHASE_OFFSET && store.gameflow.turnOrder[0] !== personal.pov && (store.actionStack.length === 0 || store.stackControl.loadedPreMove)">
			<div v-if="personal.kickoutRequired == 1" id="kickoutDiv">
				Player
				<b>{{ controller.timedOutPlayerObj().name }}</b>
				has used all the standard kickout time.
				<br />
				<br />
				Remaining Flex-Time:
				<span id="flexiKickoutTimerSpan">{{ view.getFlexiKickoutTImerText() }}</span>
				<br />
				<br />
				For more information see
				<b><a href="/help/" target="_blank">Help</a></b>
			</div>
			<div v-else id="kickoutDiv">
				<br />
				<template v-if="canKickoutNow()">
					<template v-if="store.context.action !== rf.ACT_CONFIRM_KICKOUT">
						Player
						<b>{{ controller.timedOutPlayerObj().name }}</b>
						has timed out
						<br />
						To kick out
						<b>{{ controller.timedOutPlayerObj().name }}</b>
						press Confirm Kickout
						<br />
						The game will proceed to the next player/phase/turn
						<br />
						<br />
						Otherwise you can allow
						<b>{{ controller.timedOutPlayerObj().name }}</b>
						more time - reload the page to initiate kickout again
						<br />

						<br />
						<span><button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow more time</button></span>
						<span>
							<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">Keep {{ controller.timedOutPlayerObj().name }} in the game - but end their current turn</button>
						</span>
						<span><button class="actionsLineButton" id="confirmKickoutButton" @click="store.context.action = rf.ACT_CONFIRM_KICKOUT">Confirm Kickout</button></span>
					</template>
					<template v-if="store.context.action === rf.ACT_CONFIRM_KICKOUT">
						This will permanently remove
						<b>{{ controller.timedOutPlayerObj().name }}</b>
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
							<button class="actionsLineButton" id="confirmKickoutButton" @click="Bot.actionPlayerKickout">Permanently Kickout {{ controller.timedOutPlayerObj().name }}</button>
						</span>
					</template>
				</template>
				<template v-else>
					<br />
					Player
					<b>{{ controller.timedOutPlayerObj().name }}</b>
					has timed out
					<br />
					A vote from the other players is needed to kick out
					<b>{{ controller.timedOutPlayerObj().name }}</b>
					<br />
					<br />
					Votes: {{ kickoutVoteCount() }}/{{ store.kickoutVoteThreshold }} ({{ kickoutVoters() }})
					<br />
					<br />
					<span v-if="!myKickoutVote()">
						<template v-if="isLastVoteRequired()">
							This will permanently remove
							<b>{{ controller.timedOutPlayerObj().name }}</b>
							from the game
							<br />
							<b>It cannot be undone</b>
							<br />
							<br />
						</template>
						<button class="actionsLineButton" id="voteKickoutButton" @click="Bot.actionPlayerKickout">Vote to Kickout {{ controller.timedOutPlayerObj().name }}</button>
					</span>
					<span v-else>
						You have voted to kick out
						<b>{{ controller.timedOutPlayerObj().name }}</b>
						<br />
						If the other players do not also vote, you will be able to kick them out directly in
						{{ soloKickoutCountdown }}
					</span>
					<br />
					<br />
					<span>
						<button class="actionsLineButton" id="cancelKickoutButton" @click="cancelKickout">Not now - allow more time</button>
					</span>
					<span>
						<button class="actionsLineButton" id="passKickoutButton" @click="passKickout">Keep {{ controller.timedOutPlayerObj().name }} in the game - but end their current turn</button>
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
				Game Over
				<br />
				{{ getGameOverReason }}
				<template v-if="store.gameflow.fullTurnOrder === personal.pov">
					<h1>Congratulations!</h1>
				</template>
				<template v-else>
					<br />
					<br />
				</template>
				Winner:
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
				Fancy a
				<a :href="'/createRNBpage/' + String(personal.gameID) + '/'">rematch</a>
				?
				<br />
				<template v-if="personal.soloGame">
					<br />
					<a class="viewHighScoresBtn" :href="'/RNB/highscores/map/' + store.mapData.setupData.UK + '/'" target="_blank">View Highscores for this Map</a>
				</template>
				<br />
			</div>
		</template>

		<!-- INTRO TEXT -->
		<div v-if="store.gameflow.turn === 1 && store.gameflow.phase === rf.PHASE_CHOOSE_HOME_TILE && !store.viewSettings.showReplay">
			<h2>Welcome to Roads & Boats!</h2>
			<div class="introRow">
				<div class="leftCol">
					<img :src="view.getImage('transporterSelectHelp')" alt="Transporter Help" width="203" height="222" />
				</div>
				<div class="rightCol">
					You can select a transporter directly on the map.
					<br />
					You can also select it by clicking on a tile, and then clicking on the transporter in the Zoom Tile.
					<br />
					If the Zoom Tile is still so crowded that you cannot select it, then each area of the tile is listed underneath, and will always display all items. So alternatively you will always be able to select an item in this Zoom Area.
					<br />
					<br />
					You can click any unhighlighted tile to deselect a transporter, or use the button above the map.
					<br />
					<br />
					Once a transporter is selected, you can interact with goods/buildings either directly on the map, or using the big tile in the Zoom Panel or below in the Zoom Area.
					<br />
					<br />
					To help speed up the game, you can pre-set your turns in advance.
					<br />
					If another player interferes with your preset turn, then you will get a notification and need to redo your turn.
				</div>
			</div>

			Don't forget to set your
			<a class="linkOther" href="/profileRNB/" target="_blank">Roads & Boats Preferences</a>
			!
			<br />
			<br />
			For more information please see
			<a class="linkOther" href="/RNB/help/" target="_blank">Roads & Boats Help</a>

			<template v-if="personal.soloGame">
				Official solo rule changes:
				<br />
				<br />
				Wonder starts with 17 neutral bricks (so the first brick costs 2 goods from the start)
				<br />
				Game ends after 20 turns (ie when 20 more netural bricks have been added)
				<br />
				Mines always produce whatever they contain most of. In a tie they wiil produce gold.
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
					Roads & Boats is a complex game with a lot of interactions.
					<br />
					Significant tesing has been carried out, and everything "does" work. I'm still actively working on improving visuals etc!
					<br />
					If you do spot a bug, please stop the game and bug report me. Thanks!
					<br />
				</span>
				<br />
				<br />
				<h2>{{ personal.mapName }}</h2>
				<h3 class="mapDescriptionH">{{ personal.mapDescription }}</h3>
				<template v-if="personal.soloGame">
					<br />
					<a class="viewHighScoresBtn" :href="'/RNB/highscores/map/' + store.mapData.setupData.UK + '/'" target="_blank">View Highscores for this Map</a>
				</template>
				<br />
				Choose your home tile
				<template v-if="store.context.action === rf.ACT_CONFIRM_END_TURN">
					<br />
					<br />
					<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
					<button @click="localEndPlayerTurn" class="actionsLineButton">End Turn</button>
				</template>
			</div>
			<!-- CONFLICT WAIT & SEE -->
			<ConflictDecisionPanel v-if="!rf.MAIN_PHASES.includes(store.gameflow.phase) && !rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)" />
			<!-- CONFLICT PRAYING -->
			<div v-if="rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase)">
				Conflict has been called by:
				<template v-for="(playerIndex, idx) in getConflictCallingPlayerIndexes()" :key="idx">
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>
				</template>
				<br />
				The next phase is:
				<b>{{ view.phaseStr(wonder.getNextPhaseFromHistory()) }}</b>
				<br />
				<b><u>Current Praying Order</u></b>
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
			<b><u>New Praying Order</u></b>
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

				<button @click="cashInPraying(true)" class="actionsLineButton">Cash in & End Turn</button>
				<button @click="keepPraying(true)" class="actionsLineButton">Keep Praying & End Turn</button>
			</div>
			<!-- CONFLICT_TO-->
			<div v-else-if="rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase)">
				Conflict has been called by:
				<template v-for="(playerIndex, idx) in getConflictCallingPlayerIndexes()" :key="idx">
					<span class="mainEntryPlayer" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>
				</template>
				<br />
				The next phase is:
				<b>{{ view.phaseStr(wonder.getNextPhaseFromHistory()) }}</b>
				<br />

				<b><u>Current Praying Order</u></b>
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
				<b><u>New Turn Order</u></b>
				<br />
				<!-- NEW turn order figures -->
				<div>
					<!-- turn order figures -->
					1st
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
					Last
				</div>
				<br />
				<template v-if="store.context.action !== rf.ACT_CONFIRM_END_TURN">Choose your position in turn order</template>
				<template v-else-if="store.context.action === rf.ACT_CONFIRM_END_TURN">
					<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
					<button @click="localEndPlayerTurn" class="actionsLineButton">End Turn</button>
				</template>
			</div>

			<!-- PRODUCTIONS -->
			<div v-if="rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase) && store.context.action !== rf.ACT_CONFIRM_END_TURN && store.context.action !== rf.ACT_CONFIRM_RESIGN">
				<template v-if="store.context.action === rf.ACT_CHOOSE_BUILDING_TO_UPGRADE">
					Production: Select a building to upgrade
					<br />
					<br />
					<button class="actionsLineButton" @click="stopUpgradingBuildings">Stop Upgrading</button>
				</template>
				<template v-else-if="[rf.ACT_SELECT_WATER_FOR_NEW_TRANSPORTER].includes(store.context.action)">
					Production: Select location for new water transporter
					<br />
					<br />
					<button class="actionsLineButton" @click="IO.resetGameStateToLoadedPreMove()" v-if="rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)">Cancel</button>
					<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
					<button @click="context.undoLastAction()" class="actionsLineButton">Undo Last Action</button>
				</template>
				<template v-else-if="[rf.ACT_REMOVE_EXCESS_TRANSPORTERS, rf.ACT_REMOVE_EXCESS_TRANSPORTERS_FOR_DONKEY].includes(store.context.action)">
					Production: Remove excess transporters
					<br />
					<br />
					<button class="actionsLineButton" @click="IO.resetGameStateToLoadedPreMove()" v-if="rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)">Cancel</button>
					<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
					<button @click="context.undoLastAction()" class="actionsLineButton">Undo Last Action</button>
				</template>
				<template v-else>
					Production: Select a building to auto-process goods, or select a transporter to interact with
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
						<br />
					</span>
					<FailedStackEntry v-if="store.stackControl.failedStackHistoryEntry.length > 0" />
					<!-- Researh -->
					<template v-if="store.context.researchHexIDpossibilities.length > 0">
						You can research on these tiles:
						<MiniHex class="summaryMiniHex" v-for="(hexID, idx) in store.context.researchHexIDpossibilities" :key="idx" :hexID="hexID" :scale-factor="1" />
						<br />
					</template>
					<template v-if="store.context.selectedTransporterIDforTM === -9 && loc.isAnyHexLocation(model.getTransporterByID(store.context.selectedTransporterIDforTM).location) && store.context.researchHexIDpossibilities.includes(model.getTransporterByID(store.context.selectedTransporterIDforTM).location[1])">
						You can research with this transporter
						<br />
						<div class="allResearchOptions">
							<template v-for="(isResearched, idx) in controller.currentPlayerObj().RnD" :key="idx">
								<div v-if="isResearched === 0 && (idx !== rf.RND_FUNDAMENTAL_RESEARCH_IDX || (idx === rf.RND_FUNDAMENTAL_RESEARCH_IDX && store.gameOptions.useFundamentalResearch))" class="researchOptionDiv" @click="produce.doResearch(idx)">
									<img :src="view.getImage(`research_${idx}`)" class="researchOptionImg" />
									{{ rf.RND_STRINGS[idx] }}
								</div>
							</template>
						</div>
					</template>
					<div class="cancelTransporterHolderDiv">
						<button v-if="store.context.selectedTransporterIDforTM !== -1" @click="highlight.deselectTransporter" class="actionsLineButton">De-select Transporter</button>
					</div>
					<div v-for="(entry, donkeyIdx) in store.context.possibleDonkeyReproductionData" :key="donkeyIdx" class="donkeyReproductionDiv">
						<!-- Visuals -->
						<mini-hex :hexID="entry[0][0]" :scale-factor="0.8" />
						<img class="donkeyAboutToReproduceImg" :src="view.getImage(`transporter_${rf.DONKEY}_${personal.getCorrectedColour(controller.currentPlayerObj().colour)}`)" />
						<img class="donkeyAboutToReproduceImg" :src="view.getImage(`transporter_${rf.DONKEY}_${personal.getCorrectedColour(controller.currentPlayerObj().colour)}`)" />
						<!-- Label (text) + Checkbox (on the right) -->
						<label class="donkeyReproductionLabel">
							Allow Donkeys to Reproduce
							<input type="checkbox" v-model="entry[1]" :true-value="true" :false-value="false" @change="(e) => handleDonkeyCheckboxChange(entry, e.target.checked)" />
							<span class="checkmark"></span>
						</label>
						<!-- ADD BUTTON TO REMOVE EXCESS TRANS TO MAKE ROOM, OR, CAUTION THAT YOU CAN'T -->
						<template v-if="entry[2] !== -1">
							by removing
							<img class="donkeyAboutToReproduceImg" :src="view.getImage(`transporter_${model.getTransporterByID(entry[2]).type}_${personal.getCorrectedColour(controller.currentPlayerObj().colour)}`)" />
						</template>
						<template v-else-if="entry[1] && anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx)).includes(true)">
							<button @click="presetTransporterRemovalForDonkey(donkeyIdx)" v-if="highlight.getEligibleTransportersForRemoval(controller.currentPlayerIndex(), anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx))[0], anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx))[1], false).length > 0" class="actionsLineButton">Select transporter to remove</button>
							<span v-else class="errorText">You are unable to remove any transporters</span>
						</template>
						<template v-if="entry[1] && anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx)).includes(true)">
							<div class="flexBreak"></div>
							<span class="donkeyWarningSpan" v-if="anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx))[0]">Unable: Max 8 transporters</span>
							<span class="donkeyWarningSpan" v-if="anyDonkeyProducingProblems(getCurrentlyProducingDonkeys(donkeyIdx))[1]">Unable: Max 5 land transporters</span>
						</template>
					</div>
					<div v-if="store.context.action === rf.ACT_SELECT_INPUT_RESOURCES_FOR_SEC_PRODUCTION">
						<b>
							<u>Select Input Goods</u>
						</b>
						<br />
						<div class="flexContainer">
							Chosen Goods:
							<img @click="removeResFromInput(res)" v-for="res in store.context.chosenInputGoods[1]" :key="res" class="resImgChoice" :src="view.getImage(`res_${res}`)" />
							<div v-for="i in 2 - store.context.chosenInputGoods[1].length" :key="i" class="blankInputRes"></div>
						</div>
						<div class="flexContainer" v-if="store.context.chosenInputGoods[1].length < 2">
							Available Goods:
							<img @click="addResToInput(res)" v-for="res in store.context.chosenInputGoods[0]" :key="res" class="resImgChoice" :src="view.getImage(`res_${res}`)" />
						</div>
						<div class="flexContainer" v-else>
							<button class="actionsLineButton" @click="cancelInputGoods">Cancel</button>
							<button class="actionsLineButton" @click="resetInputGoods">Reset Goods</button>
							<button class="actionsLineButton" @click="confirmInputGoods">Confirm Goods</button>
						</div>
					</div>
					<div v-if="![rf.ACT_SELECT_INPUT_RESOURCES_FOR_SEC_PRODUCTION, rf.ACT_REMOVE_EXCESS_TRANSPORTERS, rf.ACT_SELECT_WATER_FOR_NEW_TRANSPORTER].includes(store.context.action)">
						<button id="resignButton" v-if="personal.canResign()" class="actionsLineButton" @click="localClickResign">Resign</button>
						<button class="actionsLineButton" @click="IO.resetGameStateToLoadedPreMove()" v-if="rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)">Cancel</button>
						<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
						<button @click="context.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">Undo Last Action</button>
						<button v-if="personal.trainingGame || personal.soloGame" @click="finishActionsAndEndTurn($event)" class="actionsLineButton">Finish Actions & End Turn</button>
						<button v-else @click="finishActions(false, $event)" class="actionsLineButton">Finish Actions</button>
					</div>
				</template>
			</div>

			<!-- MOVEMENT-->
			<div v-if="rf.PHASE_MOVEMENTS.includes(store.gameflow.phase) && store.context.action !== rf.ACT_CONFIRM_END_TURN">
				<span v-if="store.context.selectedTransporterIDforTM === -1">Movement: Select a transporter</span>
				<span v-else>Move or pickup/drop/ferry goods</span>
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
					Unable to drop geese at sea
				</span>
				<span v-if="anyFollowingGeeseOnRiver()" class="donkeyWarningSpan">
					<br />
					You must drop your geese following a water transporter on a river
				</span>
				<span v-else><br /></span>
				<br />
				<div class="cancelTransporterHolderDiv">
					<button v-if="store.context.selectedTransporterIDforTM !== -1" @click="highlight.deselectTransporter" class="actionsLineButton">De-select Transporter</button>
				</div>
				<button class="actionsLineButton" @click="IO.resetGameStateToLoadedPreMove()" v-if="rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)">Cancel</button>
				<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
				<button @click="context.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">Undo Last Action</button>
				<template v-if="!store.context.errorUnableToDropGeeseAtSea && !anyFollowingGeeseOnRiver()">
					<button v-if="personal.trainingGame || personal.soloGame" @click="finishActionsAndEndTurn($event)" class="actionsLineButton">Finish Actions & End Turn</button>
					<button v-else @click="finishActions(false, $event)" class="actionsLineButton">Finish Actions</button>
				</template>
			</div>

			<!-- BUILDING -->
			<div v-if="rf.PHASE_BUILDINGS.includes(store.gameflow.phase) && store.context.action !== rf.ACT_CONFIRM_END_TURN">
				<span v-if="store.context.selectedTransporterIDforTM === -1">Building: Select a transporter</span>
				<span v-else>Choose a building/map item to build</span>
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
					<button v-if="store.context.selectedTransporterIDforTM !== -1" @click="highlight.deselectTransporter" class="actionsLineButton">De-select Transporter</button>
				</div>
				<button class="actionsLineButton" @click="IO.resetGameStateToLoadedPreMove()" v-if="rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)">Cancel</button>
				<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
				<button @click="context.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">Undo Last Action</button>

				<button v-if="personal.trainingGame || personal.soloGame" @click="finishActionsAndEndTurn($event)" class="actionsLineButton">Finish Actions & End Turn</button>
				<button v-else @click="finishActions(false, $event)" class="actionsLineButton">Finish Actions</button>
			</div>

			<!-- WONDER-->
			<div v-if="rf.PHASE_WONDERS.includes(store.gameflow.phase) && store.context.action !== rf.ACT_CONFIRM_END_TURN && store.context.action !== rf.ACT_CONFIRM_END_GAME">
				<span>Wonder: Select goods on your home marker to build wonder bricks</span>
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
					You do not have any transporters on your home tile
					<br />
				</span>
				<span v-else-if="store.context.wonderError === 2" class="donkeyWarningSpan">
					You do not have enough goods on your home tile
					<br />
				</span>
				<template v-else>
					<img v-for="(resID, idx) in store.context.resIDsOnHomeTile" :key="idx" @click="clickedWonderBrickOption(resID)" class="wonderChoiceRes" :class="{ wonderChoiceResActive: wonder.requiredResourcesForWonderBrick(controller.currentPlayerIndex()) - store.context.resIDsInWonderBrick.length > 0 }" :src="view.getImage(model.getResByID(resID).gfx)" />
					<br />
					Required Goods: {{ wonder.requiredResourcesForWonderBrick(controller.currentPlayerIndex()) - store.context.resIDsInWonderBrick.length }}
					<br />
					<img v-for="(resID, idx) in store.context.resIDsInWonderBrick" :key="idx" @click="clickedWonderBrickOption(resID)" class="wonderChoiceRes wonderChoiceResActive" :src="view.getImage(model.getResByID(resID).gfx)" />
					<div v-for="requiredRes in wonder.requiredResourcesForWonderBrick(controller.currentPlayerIndex()) - store.context.resIDsInWonderBrick.length" :key="requiredRes" class="requiredWonderResDiv">Good</div>
					<!--<template v-if="wonder.requiredResourcesForWonderBrick(controller.currentPlayerIndex()) - store.context.resIDsInWonderBrick.length === 0">
						<br />
						<button @click="addBrickToWonder" class="actionsLineButton">Add Brick</button>
					</template>-->
				</template>
				<br />
				<button class="actionsLineButton" @click="IO.resetGameStateToLoadedPreMove()" v-if="rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)">Cancel</button>
				<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
				<button @click="context.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">Undo Last Action</button>

				<button v-if="personal.trainingGame || personal.soloGame" @click="finishActionsAndEndTurn($event)" class="actionsLineButton">Finish Actions & End Turn</button>
				<button v-else @click="finishActions(false, $event)" class="actionsLineButton">Finish Actions</button>
			</div>

			<!-- Confirm Turn End -->
			<div v-if="store.context.action === rf.ACT_CONFIRM_END_TURN && store.gameflow.phase !== rf.PHASE_CHOOSE_HOME_TILE && !rf.ALL_PHASE_CONFLICTS.includes(store.gameflow.phase)">
				Are you sure you want to end your turn?
				<br />
				<!-- PRODUCTION RESEARCH REMAINING -->
				<template v-if="rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase) && store.context.researchHexIDpossibilities.length > 0">
					You can research on these tiles:
					<MiniHex class="summaryMiniHex" v-for="(hexID, idx) in store.context.researchHexIDpossibilities" :key="idx" :hexID="hexID" :scale-factor="1" />
					<br />
				</template>
				<!-- PRODUCTION MORE SEC BLDGS -->
				<template v-if="rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase) && store.context.buildingIDsToHighlight.length > 0">
					You can produce on these tiles:
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
						<span class="donkeyNoProblemSpan">After ending your turn, you will gain {{ numNewDonkeys }} Donkey(s)</span>
					</template>
					<template v-else>
						Unable to reproduce:
						<br />
						<span class="donkeyWarningSpan" v-html="getDonkeyWarningText"></span>
					</template>
					<br />
				</template>
				<!-- MOVEMENT - Transporters that can still move -->
				<template v-if="rf.PHASE_MOVEMENTS.includes(store.gameflow.phase) && store.context.remainingTransportersWithMovement.length > 0">
					You can still move these transporters:
					<MiniHex class="summaryMiniHex" v-for="(entry, idx) in store.context.remainingTransportersWithMovement" :key="idx" :hexID="entry[0]" :transporterGfx="entry[1]" :scale-factor="1" />
				</template>
				<!-- BUILDING - REMAINING MAIN BUILDINGS TO BUILD -->
				<template v-if="rf.PHASE_BUILDINGS.includes(store.gameflow.phase) && store.context.remainingBuildingSummaryOptions.length > 0">
					You can still build a main building on:
					<MiniHex class="summaryMiniHex" v-for="(entry, idx) in store.context.remainingBuildingSummaryOptions" :key="idx" :hexID="entry[0]" :transporterGfx="entry[1]" :scale-factor="1" />
				</template>
				<!-- Set preference for next turn -->
				<br />
				<ConflictDecisionPanel />

				<button @click="resetWholeTurn" class="actionsLineButton">Reset Whole Turn</button>
				<button @click="context.undoLastAction()" class="actionsLineButton" :disabled="store.undoPoints.length <= 1">Undo Last Action</button>
				<button @click="localGoBack" class="actionsLineButton">Back</button>
				<button @click="localEndPlayerTurn" class="actionsLineButton">End Turn</button>
			</div>
		</template>
		<template v-if="store.stackControl.previewingPhase">
			<div>
				Previewing preset for {{ view.phaseStr(store.stackControl.previewingPhase % 16) }} phase
				<br />
				<button class="actionsLineButton" @click="IO.cancelPreviewAndRedo">Cancel Move and Redo</button>
				<button class="actionsLineButton" @click="IO.backFromPreview">Back</button>
			</div>
		</template>
	</div>
</template>

<style scoped>
#actionAreaDiv {
	font-weight: bolder;
	background-color: aliceblue;
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
