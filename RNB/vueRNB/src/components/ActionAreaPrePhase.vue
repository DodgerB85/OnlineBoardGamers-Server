<script setup>
/** Component to display pre-phase options, or redo a preset move
 *
 *
 *
 *
 */
import * as IO from "../backend/RNB_IO"
import * as rf from "../js/RNBreference"
import * as view from "../js/RNBview"
import * as controller from "../js/RNBcontroller"
import * as stack from "../js/RNBstack"
import * as model from "../js/RNBmodel"
import * as produce from "../js/RNBproduce"
import * as wonder from "../js/RNBwonder"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/RNBpersonal.js"
const personal = usePersonalStore()

import { computed, ref } from "vue"
import ConflictDecisionPanel from "./ConflictDecisionPanel.vue"

const expanded = ref(true)

const setDisplayAreas = computed(() => {
	// Gameover, not in game = none
	if (personal.pov < 0 || store.gameflow.phase === rf.PHASE_GAME_OVER || store.viewSettings.showReplay || store.players[personal.pov].displayName === rf.BOT_NAME) {
		return {
			loadedStackMove: false,
			prePhasePanel: false,
			prePhaseConflictPanel: false,
		}
	}
	// solo or practice game = none
	if (personal.soloGame || personal.trainingGame) {
		return {
			loadedStackMove: false,
			prePhasePanel: false,
			prePhaseConflictPanel: false,
		}
	}
	// If you can play, you cannot set a pre-move
	if (personal.canPlay()) {
		return {
			loadedStackMove: false,
			prePhasePanel: false,
			prePhaseConflictPanel: false,
		}
	}
	// If you are setting a pre-phase conflict, then just show that bit
	if (rf.ALL_PRE_PHASE_CONFLICTS.includes(store.gameflow.phase)) {
		return {
			loadedStackMove: false,
			prePhasePanel: false,
			prePhaseConflictPanel: true,
		}
	}
	// If it is a main phase, and you are not in turn order, then JUST offer pre phases
	if (rf.MAIN_PHASES.includes(store.gameflow.phase) && !store.gameflow.turnOrder.includes(personal.pov) && !personal.haltPlay) {
		return {
			loadedStackMove: false,
			prePhasePanel: true,
			prePhaseConflictPanel: false,
		}
	}

	// If it is a main phase, and you are in TO BUT have a move set, Offer cancel pre move, and pre-phases
	if (rf.MAIN_PHASES.includes(store.gameflow.phase) && store.gameflow.turnOrder.includes(personal.pov) && store.stackControl.loadedPreMove) {
		return {
			loadedStackMove: true,
			prePhasePanel: true,
			prePhaseConflictPanel: false,
		}
	}

	// If it is a conflict decision phase wait and see, then show al
	if (rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) {
		return {
			loadedStackMove: false,
			prePhasePanel: true,
			prePhaseConflictPanel: false,
		}
	}

	// If it is conflict praying, show all
	if (rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase)) {
		return {
			loadedStackMove: false,
			prePhasePanel: true,
			prePhaseConflictPanel: false,
		}
	}

	// If it is conflict TO, show all
	if (rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase)) {
		return {
			loadedStackMove: false,
			prePhasePanel: true,
			prePhaseConflictPanel: false,
		}
	}

	return {
		loadedStackMove: false,
		prePhasePanel: false,
		prePhaseConflictPanel: false,
	}
})

const getUnboundedFutureMainPhases = computed(() => {
	let currentPhase = store.gameflow.phase
	let firstEntry
	if (rf.MAIN_PHASES.includes(currentPhase)) {
		firstEntry = currentPhase + 4
	} else {
		const decisionPhase = rf.getBaseConflictPhase(currentPhase)
		firstEntry = decisionPhase + 3
	}
	const nextPhases = [firstEntry, firstEntry + 4, firstEntry + 8, firstEntry + 12, firstEntry + 16]

	return nextPhases
})

function isPrephaseConflictSet(futureUnboundedConflictPhaseNum) {
	const additionalTurns = Math.floor(futureUnboundedConflictPhaseNum / 16)
	const turnRequired = store.gameflow.turn + additionalTurns

	const conflictPhaseNum = futureUnboundedConflictPhaseNum % 16
	const decisionPhase = rf.getBaseConflictPhase(conflictPhaseNum)
	const prePhaseData = personal.allMyMoveData.find((entry) => entry.turn === turnRequired && entry.phase === decisionPhase)
	if (prePhaseData && prePhaseData.conflictPreset) return true
	return false
}

function getPrephaseConflictText(futureUnboundedConflictPhaseNum) {
	const additionalTurns = Math.floor(futureUnboundedConflictPhaseNum / 16)
	const turnRequired = store.gameflow.turn + additionalTurns

	const conflictPhaseNum = futureUnboundedConflictPhaseNum % 16
	const decisionPhase = rf.getBaseConflictPhase(conflictPhaseNum)
	const prePhaseData = personal.allMyMoveData.find((entry) => entry.turn === turnRequired && entry.phase === decisionPhase)
	if (prePhaseData) {
		const decisionNum = prePhaseData.conflictPreset[0]
		const prayingNum = prePhaseData.conflictPreset[1]
		const turnOrderNum = prePhaseData.conflictPreset[2]

		// Decision text
		let decisionText
		switch (decisionNum) {
			case rf.CONFLICT_DECISION_WAIT_AND_SEE:
				decisionText = "Wait and see"
				break
			case rf.CONFLICT_DECISION_NO_CONFLICT:
				decisionText = "No conflict"
				break
			case rf.CONFLICT_DECISION_CONFLICT:
				decisionText = "Call Conflict"
				break
			default:
				decisionText = "Unknown"
		}

		// Praying text
		let prayingText
		switch (prayingNum) {
			case rf.CONFLICT_PRAYING_WAIT_AND_SEE:
				prayingText = "Wait and see"
				break
			case rf.CONFLICT_PRAYING_CASH_IN:
				prayingText = "Cash in prayers"
				break
			case rf.CONFLICT_PRAYING_KEEP_PRAYING:
				prayingText = "Keep praying"
				break
			default:
				prayingText = "Unknown"
		}

		// Turn order text
		let turnOrderText
		switch (turnOrderNum) {
			case rf.CONFLICT_TURN_ORDER_WAIT_AND_SEE:
				turnOrderText = "Wait and see"
				break
			case rf.CONFLICT_TURN_ORDER_EARLIEST:
				turnOrderText = "Go Earliest"
				break
			case rf.CONFLICT_TURN_ORDER_LATEST:
				turnOrderText = "Go Latest"
				break
			default:
				turnOrderText = "Unknown"
		}

		return `✅ ${decisionText} | ${prayingText} | ${turnOrderText}`
	}
	return `❌ No Move Set`
}

function getMainPhaseText(futureUnboundedMainPhaseNum) {
	const futureMainPhaseNum = futureUnboundedMainPhaseNum % 16
	let turnRequired = model.getCorrectTurnForPhasePreseet(store.gameflow.turn, store.gameflow.phase, futureMainPhaseNum)
	const prePhaseData = personal.allMyMoveData.find((entry) => entry.phase === futureMainPhaseNum && entry.turn === turnRequired)
	if (prePhaseData) {
		return `✅ Move set`
	}
	return `❌ No Move Set`
}

function changePrephaseConflictDecision(futureUnboundedConflictPhaseNum) {
	IO.saveActualGameState()
	const conflictPhaseNum = futureUnboundedConflictPhaseNum % 16
	const decisionPhase = rf.getBaseConflictPhase(conflictPhaseNum)
	store.gameflow.currentPhase = store.gameflow.phase
	store.gameflow.phase = decisionPhase + rf.PRE_PHASE_OFFSET
	store.gameflow.futureUnboundedConflictPhaseNum = futureUnboundedConflictPhaseNum
	const additionalTurns = Math.floor(futureUnboundedConflictPhaseNum / 16)
	store.gameflow.turn += additionalTurns
}

function presetMainPhase(futureUnboundedMainPhaseNum, event = null) {
	IO.saveActualGameState()
	const futureMainPhaseNum = futureUnboundedMainPhaseNum % 16
	IO.resetGameStateToLoadedPreMove()
	store.gameflow.currentPhase = store.gameflow.phase
	store.gameflow.phase = futureMainPhaseNum + rf.PRE_PHASE_OFFSET
	store.gameflow.futureUnboundedMainPhaseNum = futureUnboundedMainPhaseNum
	let processingPhase = store.gameflow.currentPhase
	// Firstly preset to just the game state plus the basic preset move
	while (![rf.PHASE_BUILDING_TO, rf.PHASE_MOVEMENT_TO, rf.PHASE_PRODUCTION_TO, rf.PHASE_WONDER_TO].includes(processingPhase)) {
		processingPhase--
		if (processingPhase === 0) processingPhase = 16
	}

	processingPhase = (processingPhase + 4) % 16
	// Next, add in anh other moves
	let moveFound = true
	while (moveFound && processingPhase !== futureMainPhaseNum) {
		if (rf.PHASE_PRODUCTIONS.includes(processingPhase)) {
			// At end of wonder phase, add a neutral brick
			wonder.addBrickToWonder_core(8, [])
			store.gameflow.turn++
			//let prevKnownLength = store.ALL_RESOURCES.length
			produce.doMineProduction(false, [], true)
			controller.performAllPreProductionExceptMines()
			store.context.researchHexIDpossibilities = produce.findAllResearchHexIDpossibilities(personal.pov)
		}

		moveFound = false
		//let turnRequired = model.getCorrectTurnForPhasePreseet(store.gameflow.turn, store.gameflow.currentPhase, processingPhase)
		let turnRequired = store.gameflow.turn
		const prePhaseData = personal.allMyMoveData.find((entry) => entry.phase === processingPhase && entry.turn === turnRequired)
		if (prePhaseData) {
			moveFound = true
			stack.attemptToLoadWholeCurrentMoveStack(prePhaseData, processingPhase)
			// If you have just processed a prod phase, do post prod
			if (rf.PHASE_PRODUCTIONS.includes(processingPhase)) {
				store.context.historyObj.splice(0)
				store.context.historyObj.push([])
				produce.doAutoSecondaryProduction(false)
				model.addHistory(rf.HIST_POST_PRODUCTION, -1, 0, [...store.context.historyObj])
				model.resetBuildingsAfterProduction()
			}
			// If you have just moved, check geese are dropped
			if (rf.PHASE_MOVEMENTS.includes(processingPhase)) {
				model.dropAllGeeseForPlayerIndex(personal.pov, event)
			}
			processingPhase = (processingPhase + 4) % 16
		}
	}

	// If at the START of prod pre phase, do pre prod now
	if (rf.PHASE_PRODUCTIONS.includes(futureMainPhaseNum)) {
		// At end of wonder phase, add a neutral brick
		wonder.addBrickToWonder_core(8, [])
		store.gameflow.turn++
		produce.doMineProduction(false, [], true)
		controller.performAllPreProductionExceptMines()
		store.context.researchHexIDpossibilities = produce.findAllResearchHexIDpossibilities(personal.pov)
	}
	controller.startPlayerMainPhasePreTurn()
}

function cancelPrePhaseConflict() {
	store.gameflow.phase = store.gameflow.currentPhase
	store.gameflow.turn = store.actualGameState.turn
	view.resetConflictPreferences()
}

function previewPresetPhase(futureUnboundedMainPhaseNum, event = null) {
	IO.saveActualGameState()
	const futureMainPhaseNum = futureUnboundedMainPhaseNum % 16
	IO.resetGameStateToLoadedPreMove()
	store.gameflow.currentPhase = store.gameflow.phase
	store.gameflow.phase = futureMainPhaseNum + rf.PRE_PHASE_OFFSET
	store.gameflow.futureUnboundedMainPhaseNum = futureUnboundedMainPhaseNum
	let processingPhase = store.gameflow.currentPhase
	while (![rf.PHASE_BUILDING_TO, rf.PHASE_MOVEMENT_TO, rf.PHASE_PRODUCTION_TO, rf.PHASE_WONDER_TO].includes(processingPhase)) {
		processingPhase--
		if (processingPhase === 0) processingPhase = 16
	}

	processingPhase = (processingPhase + 4) % 16
	let moveFound = true
	while (moveFound && processingPhase !== futureMainPhaseNum) {
		if (rf.PHASE_PRODUCTIONS.includes(processingPhase)) {
			wonder.addBrickToWonder_core(8, [])
			store.gameflow.turn++
			produce.doMineProduction(false, [], true)
			controller.performAllPreProductionExceptMines()
			store.context.researchHexIDpossibilities = produce.findAllResearchHexIDpossibilities(personal.pov)
		}

		moveFound = false
		let turnRequired = store.gameflow.turn
		const prePhaseData = personal.allMyMoveData.find((entry) => entry.phase === processingPhase && entry.turn === turnRequired)
		if (prePhaseData) {
			moveFound = true
			stack.attemptToLoadWholeCurrentMoveStack(prePhaseData, processingPhase)
			if (rf.PHASE_PRODUCTIONS.includes(processingPhase)) {
				store.context.historyObj.splice(0)
				store.context.historyObj.push([])
				produce.doAutoSecondaryProduction(false)
				model.addHistory(rf.HIST_POST_PRODUCTION, -1, 0, [...store.context.historyObj])
				model.resetBuildingsAfterProduction()
			}
			if (rf.PHASE_MOVEMENTS.includes(processingPhase)) {
				model.dropAllGeeseForPlayerIndex(personal.pov, event)
			}
			processingPhase = (processingPhase + 4) % 16
		}
	}

	if (rf.PHASE_PRODUCTIONS.includes(futureMainPhaseNum)) {
		wonder.addBrickToWonder_core(8, [])
		store.gameflow.turn++
		produce.doMineProduction(false, [], true)
		controller.performAllPreProductionExceptMines()
		store.context.researchHexIDpossibilities = produce.findAllResearchHexIDpossibilities(personal.pov)
	}
	let turnRequired = store.gameflow.turn
	const prePhaseData = personal.allMyMoveData.find((entry) => entry.phase === futureMainPhaseNum && entry.turn === turnRequired)
	if (prePhaseData) {
		stack.attemptToLoadWholeCurrentMoveStack(prePhaseData, futureMainPhaseNum)
	}
	store.stackControl.previewingPhase = futureUnboundedMainPhaseNum
}

function canCancelPreMove(futureUnboundedMainPhaseNum) {
	const futureMainPhaseNum = futureUnboundedMainPhaseNum % 16
	let turnRequired = model.getCorrectTurnForPhasePreseet(store.gameflow.turn, store.gameflow.phase, futureMainPhaseNum)
	const prePhaseData = personal.allMyMoveData.find((entry) => entry.phase === futureMainPhaseNum && entry.turn === turnRequired)
	if (prePhaseData) {
		return turnRequired
	}
	return -1
}

function canSetPreMove(futureUnboundedMainPhaseNum) {
	if (!hasSetImmediateConflictPhase.value) return false
	// If you have set an immdiate conflict response, and it is in conflict phases, you
	const futureMainPhaseNum = futureUnboundedMainPhaseNum % 16
	// If it's already set, don't offer a preset
	let turnRequiredForCurrentPhase = model.getCorrectTurnForPhasePreseet(store.gameflow.turn, store.gameflow.phase, futureMainPhaseNum)
	if (personal.allMyMoveData.some((entry) => entry.phase === futureMainPhaseNum && entry.turn === turnRequiredForCurrentPhase)) return false
	// If this is the FIRST future phase, then because we know it isn't already set, we can set it
	let previousMainPhase = store.gameflow.phase
	while (!rf.MAIN_PHASES.includes(previousMainPhase) && previousMainPhase > 0) previousMainPhase--

	if (futureMainPhaseNum === (previousMainPhase + 4) % 16) return true
	// If a previous phase is set, then this must now be the current phase
	// We know by now phaseNum is a main phase, so get the previous main phase number
	const previousMainPhaseNum = (futureMainPhaseNum + 12) % 16
	let turnRequiredForPreviousPhase = model.getCorrectTurnForPhasePreseet(store.gameflow.turn, store.gameflow.phase, previousMainPhaseNum)
	if (personal.allMyMoveData.some((entry) => entry.phase === previousMainPhaseNum && entry.turn === turnRequiredForPreviousPhase)) return true
	return false
}

function allowSettingImmediateConflictPhase(futureUnboundedConflictPhaseNum) {
	const conflictPhaseNum = futureUnboundedConflictPhaseNum % 16

	if (!hasSetImmediateConflictPhase.value && conflictPhaseNum === rf.getBaseConflictPhase(store.gameflow.phase)) return true
	const decisionPhase = rf.getBaseConflictPhase(conflictPhaseNum)
	const remainder = Math.floor(futureUnboundedConflictPhaseNum / 16)
	let turnRequired = store.gameflow.turn
	if (conflictPhaseNum === 0) turnRequired += remainder
	// If it's already set, don't offer a preset
	if (personal.allMyMoveData.some((entry) => entry.phase === decisionPhase && entry.turn === turnRequired)) return false
	// If this is the FIRST future phase, then because we know it isn't already set, we can set it
	if (turnRequired === store.gameflow.turn + 1 && conflictPhaseNum === (rf.getBaseConflictPhase(store.gameflow.phase) + 4) % 16) return true
	// Rewind-wipe fallback: if all presets were wiped and player is not in turn order,
	// allow setting the immediate conflict phase
	if (personal.allMyMoveData.length === 0 && !store.gameflow.turnOrder.includes(personal.pov)) {
		const expectedImmediate = rf.MAIN_PHASES.includes(store.gameflow.phase) ? store.gameflow.phase + 1 : rf.getBaseConflictPhase(store.gameflow.phase)
		if (futureUnboundedConflictPhaseNum === expectedImmediate) return true
	}
	return false
}

// NB - you MUST set conflict before ending turn. BUT a rewind will remove everything.
const hasSetImmediateConflictPhase = computed(() => {
	let turnRequired = store.gameflow.turn
	if (store.gameflow.phase === rf.PHASE_WONDER_TO) turnRequired++
	// Set from main phase
	let futureConflictPhaseNum = (store.gameflow.phase + 1) % 16
	// Set from conflict decision
	if (rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) futureConflictPhaseNum = store.gameflow.phase
	// Set from conflict praying
	if (rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase)) futureConflictPhaseNum = store.gameflow.phase - 1
	// Set from conflict TO
	if (rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase)) futureConflictPhaseNum = store.gameflow.phase - 2

	// If it is TO and you have already chosen, then true
	if (rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase) && !store.gameflow.turnOrder.includes(personal.pov)) return true
	// If it's already set, don't offer a preset
	if (personal.allMyMoveData.some((entry) => entry.phase === futureConflictPhaseNum && entry.turn === turnRequired)) return true

	return false
})
</script>

<template>
	<!-- Loaded stack move -->
	<template v-if="setDisplayAreas.loadedStackMove">
		<div v-if="!store.stackControl.previewingPhase">
			Your preset move has been loaded
			<br />
			You may need to redo your move if other players intefere with your actions
			<br />
			<button class="actionsLineButton" @click="IO.cancelPresetMoves(store.gameflow.turn, store.gameflow.phase)">Cancel All Preset Moves</button>
		</div>
		<div v-else>
			Previewing preset for {{ view.phaseStr(store.stackControl.previewingPhase % 16) }} phase
			<br />
			<button class="actionsLineButton" @click="IO.cancelPreviewAndRedo">Cancel Move and Redo</button>
			<button class="actionsLineButton" @click="IO.backFromPreview">Back</button>
		</div>
	</template>

	<!-- Pre Phase Panel -->
	<template v-if="setDisplayAreas.prePhasePanel">
		<div class="expertPanel" @click="!expanded && (expanded = true)">
			<div class="expandDiv" >
				<div style="width: 40px; flex-shrink: 0"></div>
				<span v-if="!expanded" style="flex: 1; text-align: center">You may pre-set future phases (click to expand)</span>
				<span v-else style="flex: 1; text-align: center">You may pre-set future phases</span>
				<button class="actionsLineButton expandButton" @click.stop="expanded = !expanded">
					<span v-if="expanded">▲</span>
					<span v-else>▼</span>
				</button>
			</div>
			<template v-if="expanded">
				<template v-for="(futureUnboundedMainPhaseNum, idx) in getUnboundedFutureMainPhases" :key="idx">
					<hr />
					<template v-if="idx !== 0 || (idx === 0 && rf.MAIN_PHASES.includes(store.gameflow.phase)) || (idx === 0 && rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) || (idx === 0 && rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase)) || (idx === 0 && rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase) && store.gameflow.turnOrder.includes(personal.pov))">
						{{ view.phaseStr((futureUnboundedMainPhaseNum - 3) % 16) }}:
						<span v-if="!isPrephaseConflictSet(futureUnboundedMainPhaseNum - 3)">
							{{ getPrephaseConflictText(futureUnboundedMainPhaseNum - 3) }}
							<button v-if="allowSettingImmediateConflictPhase(futureUnboundedMainPhaseNum - 3)" class="actionsLineButton" @click="changePrephaseConflictDecision(futureUnboundedMainPhaseNum - 3)">Set</button>
						</span>
						<span v-else>
							{{ getPrephaseConflictText(futureUnboundedMainPhaseNum - 3) }}&nbsp;
							<button class="actionsLineButton" @click="changePrephaseConflictDecision(futureUnboundedMainPhaseNum - 3)">Change</button>
						</span>
					</template>
					<template v-if="idx !== 4">
						<br />
						{{ view.phaseStr(futureUnboundedMainPhaseNum % 16) }}:
						{{ getMainPhaseText(futureUnboundedMainPhaseNum) }}
						<!-- Give a cancel button if the phase is set. Give a play button if it's the NEXT phase unplayed-->
						<button class="actionsLineButton" @click="IO.cancelPresetMoves(canCancelPreMove(futureUnboundedMainPhaseNum), futureUnboundedMainPhaseNum)" v-if="canCancelPreMove(futureUnboundedMainPhaseNum) >= 0">Cancel All Moves From Here</button>
						<button class="actionsLineButton eyeButton" @click="previewPresetPhase(futureUnboundedMainPhaseNum, $event)" v-if="canCancelPreMove(futureUnboundedMainPhaseNum) >= 0" title="Preview this preset move">
							<svg class="actionsLineButtonSvg" viewBox="0 0 32 32">
								<ellipse cx="16" cy="16" rx="12" ry="7" fill="none" stroke="currentColor" stroke-width="3" />
								<circle cx="16" cy="16" r="3" fill="currentColor" />
								<line x1="8" y1="9" x2="6" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
								<line x1="12" y1="8" x2="11" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
								<line x1="16" y1="8" x2="16" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
								<line x1="20" y1="8" x2="21" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
								<line x1="24" y1="9" x2="26" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
							</svg>
						</button>
						<button class="actionsLineButton" @click="presetMainPhase(futureUnboundedMainPhaseNum, $event)" v-if="canSetPreMove(futureUnboundedMainPhaseNum)">Pre-set {{ view.phaseStr(futureUnboundedMainPhaseNum % 16) }} Phase</button>
					</template>
					<template v-else>
						<br />
						Too far in the future
					</template>
					<br />
				</template>
				<hr />
			</template>
		</div>
	</template>

	<!-- Set Pre Phase Conflict -->
	<template v-if="setDisplayAreas.prePhaseConflictPanel">
		<ConflictDecisionPanel />
		<button class="actionsLineButton" @click="cancelPrePhaseConflict">Cancel</button>
		<button class="actionsLineButton" @click="IO.savePrePhaseConflict">Save New Settings</button>
	</template>
</template>

<style scoped>
.expertPanel {
	border: 2px solid darkblue;
	background-color: lightsalmon;
	font-weight: bolder;
	width: fit-content;
	height: fit-content;
	padding: 2px 5px 5px 5px;
	margin: auto;
	margin-top: 5px;
}

.expandDiv {
	display: flex;
	align-items: center;
	/*gap: 8px;*/
	padding: 2px;
}

.expandButton {
	margin: 0px;
	margin-left: 5px;
}

.expertPanel hr:first-of-type {
	margin-top: 0;
}

.eyeButton {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	height: 29.2px; /* Match action button heights */
	min-width: 45px;
	padding: 2px 6px; /* Tiny vertical buffer to prevent clipping */
	vertical-align: middle;
}
</style>
