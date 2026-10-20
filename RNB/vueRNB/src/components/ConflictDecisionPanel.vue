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
		{{ $t("conflict.decisionFor", { phase: view.basePhaseStr(store.gameflow.phase) }) }}
		<div class="nextTurnPrefDiv">
			<p><strong>{{ $t("conflict.mustDecide") }}</strong></p>
			<div class="conflictOptionsDiv">
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.conflictDecision" :value="rf.CONFLICT_DECISION_WAIT_AND_SEE" />
					{{ $t("conflict.waitAndSee") }}
				</label>
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.conflictDecision" :value="rf.CONFLICT_DECISION_CONFLICT" />
					{{ $t("conflict.callConflict") }}
				</label>
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.conflictDecision" :value="rf.CONFLICT_DECISION_NO_CONFLICT" />
					{{ $t("conflict.noCallConflict") }}
				</label>
			</div>
			<p><strong>{{ $t("conflict.forPraying") }}</strong></p>

			<div class="conflictOptionsDiv">
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.prayingDecision" :value="rf.CONFLICT_PRAYING_KEEP_PRAYING" />
					{{ $t("conflict.keepPraying") }}
				</label>
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.prayingDecision" :value="rf.CONFLICT_PRAYING_CASH_IN" />
					{{ $t("conflict.cashIn") }}
				</label>
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.prayingDecision" :value="rf.CONFLICT_PRAYING_WAIT_AND_SEE" />
					{{ $t("conflict.waitAndSee") }}
				</label>
			</div>
			<p><strong>{{ $t("conflict.forTurnOrder") }}</strong></p>

			<div class="conflictOptionsDiv">
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.turnOrderDecision" :value="rf.CONFLICT_TURN_ORDER_EARLIEST" />
					{{ $t("conflict.goEarliest") }}
				</label>
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.turnOrderDecision" :value="rf.CONFLICT_TURN_ORDER_LATEST" />
					{{ $t("conflict.goLatest") }}
				</label>
				<label class="radioLabel">
					<input type="radio" v-model="store.conflictPreset.turnOrderDecision" :value="rf.CONFLICT_TURN_ORDER_WAIT_AND_SEE" />
					{{ $t("conflict.waitAndSee") }}
				</label>
			</div>
		</div>
		<button v-if="store.conflictPreset.conflictDecision !== rf.CONFLICT_DECISION_WAIT_AND_SEE" class="actionsLineButton" @click="localEndPlayerTurn">
			<span v-if="store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_CONFLICT">{{ $t("conflict.endTurnCall") }}</span>
			<span v-if="store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_NO_CONFLICT">{{ $t("conflict.endTurnNoCall") }}</span>
		</button>
		<span v-else-if="store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_WAIT_AND_SEE" class="errorText">
			{{ $t("conflict.makeDecision") }}
		</span>
	</div>

	<!-- EXPANDED VERSION FOR BUILDING/WONDER PHASES -->
	<div v-if="rf.MAIN_PHASES.includes(store.gameflow.phase) || rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase) || rf.ALL_PRE_PHASE_CONFLICTS.includes(store.gameflow.phase)">
		<div class="nextTurnPrefDiv">
			<!-- Section 1: Phase Transition -->
			<div class="conflictGroup">
				<p class="sectionHeader">
					<strong>{{ $t("conflict.beforePhase", { phase: view.nextBasePhaseStr(store.gameflow.phase) }) }}</strong>
				</p>
				<div class="conflictOptionsDiv" v-if="shouldShowConflictDecision">
					<label :class="['radioLabelButton', { active: store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_WAIT_AND_SEE }]">
						<input type="radio" v-model="store.conflictPreset.conflictDecision" :value="rf.CONFLICT_DECISION_WAIT_AND_SEE" />
						<span>{{ $t("conflict.waitAndSee") }}</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_CONFLICT }]">
						<input type="radio" v-model="store.conflictPreset.conflictDecision" :value="rf.CONFLICT_DECISION_CONFLICT" />
						<span>{{ $t("conflict.callConflict") }}</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_NO_CONFLICT }]">
						<input type="radio" v-model="store.conflictPreset.conflictDecision" :value="rf.CONFLICT_DECISION_NO_CONFLICT" />
						<span>{{ $t("conflict.noCallConflict") }}</span>
					</label>
				</div>
			</div>

			<!-- Section 2: Reactionary Logic -->
			<div class="conflictGroup" v-if="shouldShowPrayingDecision">
				<p class="sectionHeader">
					<strong v-if="shouldShowConflictDecision">
						<span v-if="store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_CONFLICT">{{ $t("conflict.forPraying") }}</span>
						<span v-else>{{ $t("conflict.inCaseConflict") }}</span>
					</strong>
				</p>
				<div class="conflictOptionsDiv">
					<label :class="['radioLabelButton', { active: store.conflictPreset.prayingDecision === rf.CONFLICT_PRAYING_KEEP_PRAYING }]">
						<input type="radio" v-model="store.conflictPreset.prayingDecision" :value="rf.CONFLICT_PRAYING_KEEP_PRAYING" />
						<span>{{ $t("conflict.keepPraying") }}</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.prayingDecision === rf.CONFLICT_PRAYING_CASH_IN }]">
						<input type="radio" v-model="store.conflictPreset.prayingDecision" :value="rf.CONFLICT_PRAYING_CASH_IN" />
						<span>{{ $t("conflict.cashIn") }}</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.prayingDecision === rf.CONFLICT_PRAYING_WAIT_AND_SEE }]">
						<input type="radio" v-model="store.conflictPreset.prayingDecision" :value="rf.CONFLICT_PRAYING_WAIT_AND_SEE" />
						<span>{{ $t("conflict.waitAndSee") }}</span>
					</label>
				</div>
			</div>

			<!-- Section 3: Strategic Order -->
			<div class="conflictGroup">
				<p class="sectionHeader">
					<strong>
						<span v-if="store.conflictPreset.conflictDecision === rf.CONFLICT_DECISION_CONFLICT">{{ $t("conflict.forTurnOrder") }}</span>
						<span v-else>{{ $t("conflict.inCaseConflictTurnOrder") }}</span>
					</strong>
				</p>
				<div class="conflictOptionsDiv">
					<label :class="['radioLabelButton', { active: store.conflictPreset.turnOrderDecision === rf.CONFLICT_TURN_ORDER_EARLIEST }]">
						<input type="radio" v-model="store.conflictPreset.turnOrderDecision" :value="rf.CONFLICT_TURN_ORDER_EARLIEST" />
						<span>{{ $t("conflict.goEarliest") }}</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.turnOrderDecision === rf.CONFLICT_TURN_ORDER_LATEST }]">
						<input type="radio" v-model="store.conflictPreset.turnOrderDecision" :value="rf.CONFLICT_TURN_ORDER_LATEST" />
						<span>{{ $t("conflict.goLatest") }}</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.turnOrderDecision === rf.CONFLICT_TURN_ORDER_WAIT_AND_SEE }]">
						<input type="radio" v-model="store.conflictPreset.turnOrderDecision" :value="rf.CONFLICT_TURN_ORDER_WAIT_AND_SEE" />
						<span>{{ $t("conflict.waitAndSee") }}</span>
					</label>
				</div>
			</div>

			<!-- Conditional Panels: Alrts -->
			<div v-if="store.context.noTransportersOnHomeTile && rf.PHASE_BUILDINGS.includes(store.gameflow.phase)" class="expertPanelInfo">
				<p class="alertText">
					<strong>{{ $t("conflict.noTransportersHome") }}</strong>
					{{ $t("conflict.cannotBuildBricks") }}
				</p>
				<div class="conflictOptionsDiv">
					<label :class="['radioLabelButton', { active: store.conflictPreset.skipWonderPhaseDecision === rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_ALL }]">
						<input @click="clickedPrePhaseSkipAtConflictDecision(rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_ALL)" type="radio" v-model="store.conflictPreset.skipWonderPhaseDecision" :value="rf.CONFLICT_SKIP_WONDER_PHASE_SKIP_ALL" />
						<span>{{ $t("conflict.skipWonderAll") }}</span>
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
						<span>{{ $t("conflict.playNormal") }}</span>
					</label>
				</div>
			</div>

			<div v-if="(rf.PHASE_BUILDINGS.includes(store.gameflow.phase) && store.context.noTransportersOnHomeTile && noProductionOptions) || (rf.PHASE_WONDERS.includes(store.gameflow.phase) && noProductionOptions)" class="expertPanelInfo">
				<p class="alertText">
					<strong>{{ $t("conflict.noManualProduction") }}</strong>
				</p>
				<div class="conflictOptionsDiv">
					<label :class="['radioLabelButton', { active: store.conflictPreset.skipProductionPhaseDecision === rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_ALL }]">
						<input type="radio" v-model="store.conflictPreset.skipProductionPhaseDecision" :value="rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_ALL" />
						<span>{{ $t("conflict.skipProductionAll") }}</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.skipProductionPhaseDecision === rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_PRODUCTION_ONLY }]">
						<input type="radio" v-model="store.conflictPreset.skipProductionPhaseDecision" :value="rf.CONFLICT_SKIP_PRODUCTION_PHASE_SKIP_PRODUCTION_ONLY" />
						<span>{{ $t("conflict.skipProductionOnly") }}</span>
					</label>
					<label :class="['radioLabelButton', { active: store.conflictPreset.skipProductionPhaseDecision === rf.CONFLICT_SKIP_PRODUCTION_PHASE_WAIT_AND_SEE }]">
						<input type="radio" v-model="store.conflictPreset.skipProductionPhaseDecision" :value="rf.CONFLICT_SKIP_PRODUCTION_PHASE_WAIT_AND_SEE" />
						<span>{{ $t("conflict.playNormal") }}</span>
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
