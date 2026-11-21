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

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/RNBpersonal.js"
const personal = usePersonalStore()

import { computed, ref } from "vue"
import ConflictDecisionPanel from "./ConflictDecisionPanel.vue"
import i18n from "../i18n"

const t = (key, named) => i18n.global.t(key, named)

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
	// Production setup: the player not in the setup turn order can pre-set their
	// manager / power plant choices and this turn's production.
	if (store.gameflow.phase === rf.PHASE_PRODUCTION_SETUP_TO) {
		if (store.gameflow.turnOrder.includes(personal.pov)) {
			return {
				loadedStackMove: store.stackControl.loadedPreMove,
				prePhasePanel: false,
				prePhaseConflictPanel: false,
			}
		}
		const acted = model.hasPlayerActedInPhaseThisTurn(personal.pov, rf.PHASE_PRODUCTION_SETUP_TO)
		return {
			loadedStackMove: false,
			prePhasePanel: !personal.haltPlay && !acted,
			prePhaseConflictPanel: false,
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
	// Setup is out of the 0-15 production/movement/building/wonder cycle: its next
	// four phases are this turn's production, movement, building and wonder.
	if (currentPhase === rf.PHASE_PRODUCTION_SETUP_TO) {
		return [rf.PHASE_PRODUCTION_TO, rf.PHASE_MOVEMENT_TO, rf.PHASE_BUILDING_TO, rf.PHASE_WONDER_TO, rf.PHASE_PRODUCTION_TO + 16]
	}
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
	const turnRequired = rf.getPrePhaseConflictTurn(store.gameflow.turn, store.gameflow.phase, futureUnboundedConflictPhaseNum)

	const conflictPhaseNum = futureUnboundedConflictPhaseNum % 16
	const decisionPhase = rf.getBaseConflictPhase(conflictPhaseNum)
	const prePhaseData = personal.allMyMoveData.find((entry) => entry.turn === turnRequired && entry.phase === decisionPhase)
	if (prePhaseData && prePhaseData.conflictPreset) return true
	return false
}

function getPrephaseConflictText(futureUnboundedConflictPhaseNum) {
	const turnRequired = rf.getPrePhaseConflictTurn(store.gameflow.turn, store.gameflow.phase, futureUnboundedConflictPhaseNum)

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
				decisionText = t("prePhase.waitAndSee")
				break
			case rf.CONFLICT_DECISION_NO_CONFLICT:
				decisionText = t("prePhase.noConflict")
				break
			case rf.CONFLICT_DECISION_CONFLICT:
				decisionText = t("prePhase.callConflict")
				break
			default:
				decisionText = t("prePhase.unknown")
		}

		// Praying text
		let prayingText
		switch (prayingNum) {
			case rf.CONFLICT_PRAYING_WAIT_AND_SEE:
				prayingText = t("prePhase.waitAndSee")
				break
			case rf.CONFLICT_PRAYING_CASH_IN:
				prayingText = t("prePhase.cashInPrayers")
				break
			case rf.CONFLICT_PRAYING_KEEP_PRAYING:
				prayingText = t("prePhase.keepPraying")
				break
			default:
				prayingText = t("prePhase.unknown")
		}

		// Turn order text
		let turnOrderText
		switch (turnOrderNum) {
			case rf.CONFLICT_TURN_ORDER_WAIT_AND_SEE:
				turnOrderText = t("prePhase.waitAndSee")
				break
			case rf.CONFLICT_TURN_ORDER_EARLIEST:
				turnOrderText = t("prePhase.goEarliest")
				break
			case rf.CONFLICT_TURN_ORDER_LATEST:
				turnOrderText = t("prePhase.goLatest")
				break
			default:
				turnOrderText = t("prePhase.unknown")
		}

		return `✅ ${decisionText} | ${prayingText} | ${turnOrderText}`
	}
	return `❌ ${t("prePhase.noMoveSet")}`
}

function getMainPhaseText(futureUnboundedMainPhaseNum) {
	const futureMainPhaseNum = futureUnboundedMainPhaseNum % 16
	let turnRequired = model.getCorrectTurnForPhasePreseet(store.gameflow.turn, store.gameflow.phase, futureMainPhaseNum)
	const prePhaseData = personal.allMyMoveData.find((entry) => entry.phase === futureMainPhaseNum && entry.turn === turnRequired)
	if (prePhaseData) {
		return `✅ ${t("prePhase.moveSet")}`
	}
	return `❌ ${t("prePhase.noMoveSet")}`
}

function changePrephaseConflictDecision(futureUnboundedConflictPhaseNum) {
	IO.saveActualGameState()
	const conflictPhaseNum = futureUnboundedConflictPhaseNum % 16
	const decisionPhase = rf.getBaseConflictPhase(conflictPhaseNum)
	store.gameflow.currentPhase = store.gameflow.phase
	store.gameflow.phase = decisionPhase + rf.PRE_PHASE_OFFSET
	store.gameflow.futureUnboundedConflictPhaseNum = futureUnboundedConflictPhaseNum
	store.gameflow.turn = rf.getPrePhaseConflictTurn(store.gameflow.turn, store.gameflow.currentPhase, futureUnboundedConflictPhaseNum)

	// Open on the saved choices when changing an existing preset, not on the last
	// conflict's choices.
	view.resetConflictPreferences()
	const existingPreset = personal.allMyMoveData.find((entry) => entry.phase === decisionPhase && entry.turn === store.gameflow.turn)
	if (existingPreset && existingPreset.conflictPreset) {
		store.conflictPreset.conflictDecision = existingPreset.conflictPreset[0]
		store.conflictPreset.prayingDecision = existingPreset.conflictPreset[1]
		store.conflictPreset.turnOrderDecision = existingPreset.conflictPreset[2]
	}
}

function loadSetupConflictPreferences(futureUnboundedMainPhaseNum) {
	// The pre-phase conflict panel edits the conflict that follows this main
	// phase. Load any preset already saved there so End Turn keeps it.
	const conflictUnbounded = futureUnboundedMainPhaseNum + 1
	const decisionPhase = rf.getBaseConflictPhase(conflictUnbounded % 16)
	const turnRequired = rf.getPrePhaseConflictTurn(store.gameflow.turn, store.gameflow.currentPhase, conflictUnbounded)
	view.resetConflictPreferences()
	const existing = personal.allMyMoveData.find((entry) => entry.turn === turnRequired && entry.phase === decisionPhase)
	if (existing && existing.conflictPreset) {
		store.conflictPreset.conflictDecision = existing.conflictPreset[0]
		store.conflictPreset.prayingDecision = existing.conflictPreset[1]
		store.conflictPreset.turnOrderDecision = existing.conflictPreset[2]
	}
}

function presetMainPhase(futureUnboundedMainPhaseNum, event = null) {
	IO.saveActualGameState()
	const futureMainPhaseNum = futureUnboundedMainPhaseNum % 16
	IO.resetGameStateToLoadedPreMove()
	store.gameflow.currentPhase = store.gameflow.phase
	const fromSetup = store.gameflow.currentPhase === rf.PHASE_PRODUCTION_SETUP_TO
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
			IO.simulateProductionStart(false, !(fromSetup && processingPhase === rf.PHASE_PRODUCTION_TO))
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
		IO.simulateProductionStart(true, !(fromSetup && futureMainPhaseNum === rf.PHASE_PRODUCTION_TO))
	}
	if (fromSetup) loadSetupConflictPreferences(futureUnboundedMainPhaseNum)
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
	const fromSetup = store.gameflow.currentPhase === rf.PHASE_PRODUCTION_SETUP_TO
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
			IO.simulateProductionStart(false, !(fromSetup && processingPhase === rf.PHASE_PRODUCTION_TO))
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
		IO.simulateProductionStart(false, !(fromSetup && futureMainPhaseNum === rf.PHASE_PRODUCTION_TO))
	}
	let turnRequired = store.gameflow.turn
	const prePhaseData = personal.allMyMoveData.find((entry) => entry.phase === futureMainPhaseNum && entry.turn === turnRequired)
	if (prePhaseData) {
		stack.attemptToLoadWholeCurrentMoveStack(prePhaseData, futureMainPhaseNum)
	}
	if (fromSetup) loadSetupConflictPreferences(futureUnboundedMainPhaseNum)
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
	const futureMainPhaseNum = futureUnboundedMainPhaseNum % 16
	// Production from setup has no conflict of its own; the movement conflict is
	// set separately and is only needed before presetting movement.
	const isSetupProduction = store.gameflow.phase === rf.PHASE_PRODUCTION_SETUP_TO && futureMainPhaseNum === rf.PHASE_PRODUCTION_TO
	if (!isSetupProduction && !hasSetImmediateConflictPhase.value) return false
	// If it's already set, don't offer a preset
	let turnRequiredForCurrentPhase = model.getCorrectTurnForPhasePreseet(store.gameflow.turn, store.gameflow.phase, futureMainPhaseNum)
	if (personal.allMyMoveData.some((entry) => entry.phase === futureMainPhaseNum && entry.turn === turnRequiredForCurrentPhase)) return false
	if (isSetupProduction) return true
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
	const setupPhase = store.gameflow.phase === rf.PHASE_PRODUCTION_SETUP_TO
	const baseConflict = setupPhase ? rf.PHASE_CONFLICT_MOVEMENT_DECISION : rf.getBaseConflictPhase(store.gameflow.phase)

	// From setup, preset production before its following movement conflict.
	if (setupPhase) {
		const productionPreset = personal.allMyMoveData.some((entry) => entry.phase === rf.PHASE_PRODUCTION_TO && entry.turn === store.gameflow.turn)
		if (!productionPreset) return false
	}

	if (!hasSetImmediateConflictPhase.value && conflictPhaseNum === baseConflict) return true
	const decisionPhase = rf.getBaseConflictPhase(conflictPhaseNum)
	let turnRequired = store.gameflow.turn
	if (setupPhase) {
		turnRequired = rf.getPrePhaseConflictTurn(store.gameflow.turn, store.gameflow.phase, futureUnboundedConflictPhaseNum)
	} else {
		const remainder = Math.floor(futureUnboundedConflictPhaseNum / 16)
		if (conflictPhaseNum === 0) turnRequired += remainder
	}
	// If it's already set, don't offer a preset
	if (personal.allMyMoveData.some((entry) => entry.phase === decisionPhase && entry.turn === turnRequired)) return false
	// If this is the FIRST future phase, then because we know it isn't already set, we can set it
	if (turnRequired === store.gameflow.turn + 1 && conflictPhaseNum === (baseConflict + 4) % 16) return true
	// Rewind-wipe fallback: if all presets were wiped and player is not in turn order,
	// allow setting the immediate conflict phase
	if (personal.allMyMoveData.length === 0 && !store.gameflow.turnOrder.includes(personal.pov)) {
		const expectedImmediate = store.gameflow.phase === rf.PHASE_PRODUCTION_SETUP_TO ? rf.PHASE_CONFLICT_MOVEMENT_DECISION : rf.MAIN_PHASES.includes(store.gameflow.phase) ? store.gameflow.phase + 1 : rf.getBaseConflictPhase(store.gameflow.phase)
		if (futureUnboundedConflictPhaseNum === expectedImmediate) return true
	}
	return false
}

// NB - you MUST set conflict before ending turn. BUT a rewind will remove everything.
const hasSetImmediateConflictPhase = computed(() => {
	// Setup is followed by production, whose conflict is already resolved. The next
	// conflict is the movement decision, set as usual for the production preset.
	if (store.gameflow.phase === rf.PHASE_PRODUCTION_SETUP_TO) {
		return personal.allMyMoveData.some((entry) => entry.phase === rf.PHASE_CONFLICT_MOVEMENT_DECISION && entry.turn === store.gameflow.turn)
	}
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
			{{ $t("prePhase.presetLoaded") }}
			<br />
			{{ $t("prePhase.presetRedo") }}
			<br />
			<button class="actionsLineButton" @click="IO.cancelPresetMoves(store.gameflow.turn, store.gameflow.phase)">{{ $t("prePhase.cancelAllPresetMoves") }}</button>
		</div>
		<div v-else>
			{{ $t("prePhase.previewing", { phase: view.phaseStr(store.stackControl.previewingPhase % 16) }) }}
			<br />
			<button class="actionsLineButton" @click="IO.cancelPreviewAndRedo">{{ $t("prePhase.cancelMoveRedo") }}</button>
			<button class="actionsLineButton" @click="IO.backFromPreview">{{ $t("prePhase.back") }}</button>
		</div>
	</template>

	<!-- Pre Phase Panel -->
	<template v-if="setDisplayAreas.prePhasePanel">
		<div class="expertPanel" @click="!expanded && (expanded = true)">
			<div class="expandDiv" >
				<div style="width: 40px; flex-shrink: 0"></div>
				<span v-if="!expanded" style="flex: 1; text-align: center">{{ $t("prePhase.preSetCollapsed") }}</span>
				<span v-else style="flex: 1; text-align: center">{{ $t("prePhase.preSetExpanded") }}</span>
				<button class="actionsLineButton expandButton" @click.stop="expanded = !expanded">
					<span v-if="expanded">▲</span>
					<span v-else>▼</span>
				</button>
			</div>
			<template v-if="expanded">
				<template v-for="(futureUnboundedMainPhaseNum, idx) in getUnboundedFutureMainPhases" :key="idx">
					<hr />
					<template v-if="idx !== 0 || (idx === 0 && rf.MAIN_PHASES.includes(store.gameflow.phase) && store.gameflow.phase !== rf.PHASE_PRODUCTION_SETUP_TO) || (idx === 0 && rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) || (idx === 0 && rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase)) || (idx === 0 && rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.gameflow.phase) && store.gameflow.turnOrder.includes(personal.pov))">
						{{ view.phaseStr((futureUnboundedMainPhaseNum - 3) % 16) }}:
						<span v-if="!isPrephaseConflictSet(futureUnboundedMainPhaseNum - 3)">
							{{ getPrephaseConflictText(futureUnboundedMainPhaseNum - 3) }}
							<button v-if="allowSettingImmediateConflictPhase(futureUnboundedMainPhaseNum - 3)" class="actionsLineButton" @click="changePrephaseConflictDecision(futureUnboundedMainPhaseNum - 3)">{{ $t("prePhase.set") }}</button>
						</span>
						<span v-else>
							{{ getPrephaseConflictText(futureUnboundedMainPhaseNum - 3) }}&nbsp;
							<button class="actionsLineButton" @click="changePrephaseConflictDecision(futureUnboundedMainPhaseNum - 3)">{{ $t("prePhase.change") }}</button>
						</span>
					</template>
					<template v-if="idx !== 4">
						<br />
						{{ view.phaseStr(futureUnboundedMainPhaseNum % 16) }}:
						{{ getMainPhaseText(futureUnboundedMainPhaseNum) }}
						<!-- Give a cancel button if the phase is set. Give a play button if it's the NEXT phase unplayed-->
						<button class="actionsLineButton" @click="IO.cancelPresetMoves(canCancelPreMove(futureUnboundedMainPhaseNum), futureUnboundedMainPhaseNum)" v-if="canCancelPreMove(futureUnboundedMainPhaseNum) >= 0">{{ $t("prePhase.cancelAllMovesFromHere") }}</button>
						<button class="actionsLineButton eyeButton" @click="previewPresetPhase(futureUnboundedMainPhaseNum, $event)" v-if="canCancelPreMove(futureUnboundedMainPhaseNum) >= 0" :title="$t('prePhase.previewPreset')">
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
						<button class="actionsLineButton" @click="presetMainPhase(futureUnboundedMainPhaseNum, $event)" v-if="canSetPreMove(futureUnboundedMainPhaseNum)">{{ $t("prePhase.presetPhase", { phase: view.phaseStr(futureUnboundedMainPhaseNum % 16) }) }}</button>
					</template>
					<template v-else>
						<br />
						{{ $t("prePhase.tooFarFuture") }}
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
		<button class="actionsLineButton" @click="cancelPrePhaseConflict">{{ $t("prePhase.cancel") }}</button>
		<button class="actionsLineButton" @click="IO.savePrePhaseConflict">{{ $t("prePhase.saveNewSettings") }}</button>
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
