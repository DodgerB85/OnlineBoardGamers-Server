<script setup>
/** Conflict Decision Pane - Handles conflict decision UI for conflict phases
 */
import * as rf from "../js/RNBreference"
import * as controller from "../js/RNBcontroller"
import * as view from "../js/RNBview"
//import * as produce from "../js/RNBproduce"
//import * as highlight from "../js/RNBhighlight"
//import * as model from "../js/RNBmodel"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()

//import { usePersonalStore } from "../stores/RNBpersonal.js"
//const personal = usePersonalStore()

import { computed, /*watch*/ } from "vue"

function localEndPlayerTurn() {
	controller.endPlayerTurn()
}

function clickedPrePhaseSkipAtConflictDecision(_decision) {
	if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) {
		store.conflictPreset.conflictDecision = rf.CONFLICT_DECISION_NO_CONFLICT
	}
}

const noProductionOptions = computed(() => {
	// DECISION: You could pick up newly producde primary goods. So there is often a decision. 
	// And if not, you can easily preset as an empty future phase
	return false
	/*model.resetBuildingsAfterProduction()
	const anyOption = highlight.highlightEligibleSecondaryBuildingsForManualProduction(-1, true, personal.pov)
	// If there are any highlighted buildings to produce, you have options
	if (anyOption) return false
	// If you have donkeys to reporoduce, you have a move
	if (produce.findAllDonkeyReproductionHexIDpossibilities(controller.currentPlayerIndex()).length > 0) return false
	// If you could research, you have a move
	if (produce.findAllResearchHexIDpossibilities(personal.pov).length > 0) return false
	// Otherwise, you have no moves
	return true*/
})

const isEditingCurrentConflictSection = computed(() => {
	// Only relevant when editing a pre-phase conflict
	if (!rf.ALL_PRE_PHASE_CONFLICTS.includes(store.gameflow.phase)) return false
	const editingPhase = store.gameflow.phase - rf.PRE_PHASE_OFFSET
	return rf.getBaseConflictPhase(editingPhase) === rf.getBaseConflictPhase(store.actualGameState.phase)
		&& store.gameflow.turn === store.actualGameState.turn
})

const shouldShowConflictDecision = computed(() => {
	// Always show when setting from main phase or pre-phase main (future section)
	if (rf.MAIN_PHASES.includes(store.gameflow.phase) || rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)) return true
	// When editing a pre-phase conflict for a FUTURE section, always show all options
	if (rf.ALL_PRE_PHASE_CONFLICTS.includes(store.gameflow.phase) && !isEditingCurrentConflictSection.value) return true
	// When editing the CURRENT conflict section, hide if decision already passed
	if (isEditingCurrentConflictSection.value) {
		if (rf.PHASE_CONFLICT_PRAYINGS.includes(store.actualGameState.phase)) return false
		if (rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.actualGameState.phase)) return false
		return true
	}
	return true
})

const shouldShowPrayingDecision = computed(() => {
	// Always show when setting from main phase or pre-phase main (future section)
	if (rf.MAIN_PHASES.includes(store.gameflow.phase) || rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)) return true
	// When editing a pre-phase conflict for a FUTURE section, always show all options
	if (rf.ALL_PRE_PHASE_CONFLICTS.includes(store.gameflow.phase) && !isEditingCurrentConflictSection.value) return true
	// When editing the CURRENT conflict section, hide if praying already passed
	if (isEditingCurrentConflictSection.value) {
		if (rf.PHASE_CONFLICT_TURN_ORDERS.includes(store.actualGameState.phase)) return false
		return true
	}
	return true
})

/*
// Auto-trigger end turn when player toggles from "Wait & See" to "I wish to call conflict"
// Only applies when actually IN a conflict decision phase (not pre-setting)
watch(() => store.conflictPreset.conflictDecision, (newVal, _oldVal) => {
	if (newVal === rf.CONFLICT_DECISION_CONFLICT && rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)) {
		controller.endPlayerTurn()
	}
})
	*/
</script>

<template>
	<!-- CONFLICT WAIT & SEE -- NB this could be from a preset, which is always the conflict decision -->
	<div v-if="rf.PHASE_CONFLICT_DECISIONS.includes(store.gameflow.phase)">
		Conflict Decision for {{ view.basePhaseStr(store.gameflow.phase) }} phase
		<div class="nextTurnPrefDiv">
			<p><strong>You must decide whether or not you wish to call conflict</strong></p>
			<div class="conflictOptionsDiv">
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.conflictDecision" :value="rf.CONFLICT_DECISION_WAIT_AND_SEE" />
					Wait & See
				</label>
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.conflictDecision" :value="rf.CONFLICT_DECISION_CONFLICT" />
					I wish to call conflict
				</label>
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.conflictDecision" :value="rf.CONFLICT_DECISION_NO_CONFLICT" />
					I do not wish to call conflict
				</label>
			</div>
			<p><strong>For Praying I wish to:</strong></p>

			<div class="conflictOptionsDiv">
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.prayingDecision" :value="rf.CONFLICT_PRAYING_KEEP_PRAYING" />
					Keep Praying
				</label>
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.prayingDecision" :value="rf.CONFLICT_PRAYING_CASH_IN" />
					Cash In
				</label>
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.prayingDecision" :value="rf.CONFLICT_PRAYING_WAIT_AND_SEE" />
					Wait & See
				</label>
			</div>
			<p><strong>For turn order I wish to:</strong></p>

			<div class="conflictOptionsDiv">
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.turnOrderDecision" :value="rf.CONFLICT_TURN_ORDER_EARLIEST" />
					Go earliest
				</label>
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.turnOrderDecision" :value="rf.CONFLICT_TURN_ORDER_LATEST" />
					Go latest
				</label>
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.turnOrderDecision" :value="rf.CONFLICT_TURN_ORDER_WAIT_AND_SEE" />
					Wait & See
				</label>
			</div>
		</div>
		<button v-if="store.conflictPreset.conflictDecision !== rf.CONFLICT_DECISION_WAIT_AND_SEE" class="actionsLineButton" @click="localEndPlayerTurn">
			<span v-if="store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_CONFLICT">End Turn: Call Conflict</span>
			<span v-if="store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_NO_CONFLICT">End Turn: Do Not Call Conflict</span>
		</button>
		<span v-else-if="store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_WAIT_AND_SEE" class="errorText">
			Make a conflict decision to end your turn
		</span>
	</div>

	<!-- EXPANDED VERSION FOR BUILDING/WONDER PHASES -->
	<div v-if="rf.MAIN_PHASES.includes(store.gameflow.phase) || rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase) || rf.ALL_PRE_PHASE_CONFLICTS.includes(store.gameflow.phase)">
		<div class="nextTurnPrefDiv">
			<!-- Section 1: Phase Transition -->
			<div class="conflictGroup">
				<p class="sectionHeader">
					<strong>Before {{ view.nextBasePhaseStr(store.gameflow.phase) }} phase:</strong>
				</p>
				<div class="conflictOptionsDiv" v-if="shouldShowConflictDecision">
					<label :class="['radioLabelButton', { active: store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_WAIT_AND_SEE }]">
						<input type="radio" v-model="store.conflictPreset.conflictDecision" :value="rf.CONFLICT_DECISION_WAIT_AND_SEE" />
						<span>Wait & See</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_CONFLICT }]">
						<input type="radio" v-model="store.conflictPreset.conflictDecision" :value="rf.CONFLICT_DECISION_CONFLICT" />
						<span>I wish to call conflict</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_NO_CONFLICT }]">
						<input type="radio" v-model="store.conflictPreset.conflictDecision" :value="rf.CONFLICT_DECISION_NO_CONFLICT" />
						<span>I do not wish to call conflict</span>
					</label>
				</div>
			</div>

			<!-- Section 2: Reactionary Logic -->
			<div class="conflictGroup" v-if="shouldShowPrayingDecision">
				<p class="sectionHeader">
					<strong v-if="shouldShowConflictDecision">
						<span v-if="store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_CONFLICT">For praying I wish to:</span>
						<span v-else>In case anyone else calls conflict:</span>
					</strong>
				</p>
				<div class="conflictOptionsDiv">
					<label :class="['radioLabelButton', { active: store.conflictPreset.prayingDecision === rf.CONFLICT_PRAYING_KEEP_PRAYING }]">
						<input type="radio" v-model="store.conflictPreset.prayingDecision" :value="rf.CONFLICT_PRAYING_KEEP_PRAYING" />
						<span>Keep Praying</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.prayingDecision === rf.CONFLICT_PRAYING_CASH_IN }]">
						<input type="radio" v-model="store.conflictPreset.prayingDecision" :value="rf.CONFLICT_PRAYING_CASH_IN" />
						<span>Cash In</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.prayingDecision === rf.CONFLICT_PRAYING_WAIT_AND_SEE }]">
						<input type="radio" v-model="store.conflictPreset.prayingDecision" :value="rf.CONFLICT_PRAYING_WAIT_AND_SEE" />
						<span>Wait & See</span>
					</label>
				</div>
			</div>

			<!-- Section 3: Strategic Order -->
			<div class="conflictGroup">
				<p class="sectionHeader">
					<strong>
						<span v-if="store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_CONFLICT">For turn order I wish to:</span>
						<span v-else>In case anyone else calls conflict, for turn order I wish to:</span>
					</strong>
				</p>
				<div class="conflictOptionsDiv">
					<label :class="['radioLabelButton', { active: store.conflictPreset.turnOrderDecision === rf.CONFLICT_TURN_ORDER_EARLIEST }]">
						<input type="radio" v-model="store.conflictPreset.turnOrderDecision" :value="rf.CONFLICT_TURN_ORDER_EARLIEST" />
						<span>Go earliest</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.turnOrderDecision === rf.CONFLICT_TURN_ORDER_LATEST }]">
						<input type="radio" v-model="store.conflictPreset.turnOrderDecision" :value="rf.CONFLICT_TURN_ORDER_LATEST" />
						<span>Go latest</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.turnOrderDecision === rf.CONFLICT_TURN_ORDER_WAIT_AND_SEE }]">
						<input type="radio" v-model="store.conflictPreset.turnOrderDecision" :value="rf.CONFLICT_TURN_ORDER_WAIT_AND_SEE" />
						<span>Wait & See</span>
					</label>
				</div>
			</div>

			<!-- Conditional Panels: Alrts -->
			<div v-if="store.context.noTransportersOnHomeTile && rf.PHASE_BUILDINGS.includes(store.gameflow.phase)" class="expertPanelInfo">
				<p class="alertText">
					<strong>⚠️ No transporters on home tile:</strong>
					Cannot build wonder bricks.
				</p>
				<div class="conflictOptionsDiv">
					<label :class="['radioLabelButton', { active: store.conflictPreset.skipWonderPhaseDecision === rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_ALL }]">
						<input @click="clickedPrePhaseSkipAtConflictDecision(rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_ALL)" type="radio" v-model="store.conflictPreset.skipWonderPhaseDecision" :value="rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_ALL" />
						<span>Skip Wonder Phase & Production Conflict</span>
					</label>
					<!-- No point in just setting a wonder phase skip without the conflict. This also messes up allowing setting phases after that -->
					<!--
					<label :class="['radioLabelButton', { active: store.conflictPreset.skipWonderPhaseDecision === rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_WONDER_ONLY }]">
						<input @click="clickedPrePhaseSkipAtConflictDecision(rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_WONDER_ONLY)" type="radio" v-model="store.conflictPreset.skipWonderPhaseDecision" :value="rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_WONDER_ONLY" />
						<span>Skip Wonder Phase Only</span>
					</label>
				-->
					<label :class="['radioLabelButton', { active: store.conflictPreset.skipWonderPhaseDecision === rf.CONFLICT_SKIP_WONDER_PHASE_WAIT_AND_SEE }]">
						<input type="radio" v-model="store.conflictPreset.skipWonderPhaseDecision" :value="rf.CONFLICT_SKIP_WONDER_PHASE_WAIT_AND_SEE" />
						<span>Play as Normal</span>
					</label>
				</div>
			</div>

			<div v-if="(rf.PHASE_BUILDINGS.includes(store.gameflow.phase) && store.context.noTransportersOnHomeTile && noProductionOptions) || (rf.PHASE_WONDERS.includes(store.gameflow.phase) && noProductionOptions)" class="expertPanelInfo">
				<p class="alertText">
					<strong>⚠️ No manual production options available.</strong>
				</p>
				<div class="conflictOptionsDiv">
					<label :class="['radioLabelButton', { active: store.conflictPreset.skipProductionPhaseDecision === rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_ALL }]">
						<input type="radio" v-model="store.conflictPreset.skipProductionPhaseDecision" :value="rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_ALL" />
						<span>Skip Production Phase & Movement Conflict</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.skipProductionPhaseDecision === rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_PRODUCTION_ONLY }]">
						<input type="radio" v-model="store.conflictPreset.skipProductionPhaseDecision" :value="rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_PRODUCTION_ONLY" />
						<span>Skip Production Phase Only</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.skipProductionPhaseDecision === rf.CONFLICT_SKIP_PRODUCTION_PHASE_WAIT_AND_SEE }]">
						<input type="radio" v-model="store.conflictPreset.skipProductionPhaseDecision" :value="rf.CONFLICT_SKIP_PRODUCTION_PHASE_WAIT_AND_SEE" />
						<span>Play as Normal</span>
					</label>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.nextTurnPrefDiv {
	display: block;
	padding: 15px;
	border: 1px solid #ccc;
	border-radius: 5px;
	background-color: #f9f9f9;
}

.conflictOptionsDiv {
	display: flex;
	gap: 15px;
	justify-content: center;
}

.conflictGroup {
	margin-bottom: 15px;
}

.sectionHeader {
	margin-bottom: 8px;
	font-size: 14px;
}

.radioLabel {
	cursor: pointer;
	display: flex;
	align-items: center;
	gap: 6px;
	white-space: nowrap;
}

.radioLabelButton {
	padding: 8px 12px;
	border: 1px solid #ccc;
	border-radius: 4px;
	cursor: pointer;
	transition: background 0.2s;
}

.radioLabelButton.active {
	background-color: #e0f0ff;
	border-color: #007bff;
	font-weight: bold;
}

.radioLabelButton input {
	margin-right: 10px;
}

.expertPanelInfo {
	border: 2px solid darkorange;
	background-color: lightyellow;
	width: fit-content;
	height: fit-content;
	padding: 10px;
	margin: auto;
	margin-top: 5px;
}

.alertText {
	margin-bottom: 8px;
}

.errorText {
	font-weight: bolder;
	background-color: lightgoldenrodyellow;
	color: darkred;
}
</style>
