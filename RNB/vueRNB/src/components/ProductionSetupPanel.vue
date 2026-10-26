<script setup>
/** &c production setup: managers and power plant fuel, announced in player order
 * at the start of the production phase. */
import * as rf from "../js/RNBreference"
import * as productionSetup from "../js/RNBproductionSetup"
import * as context from "../js/RNBcontext"
import * as highlight from "../js/RNBhighlight"
import * as stack from "../js/RNBstack"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/RNBpersonal.js"
const personal = usePersonalStore()

import { computed, ref } from "vue"

const playerIndex = personal.pov
const managerChoices = ref(productionSetup.getManagerChoices(playerIndex))
const plantChoices = ref(productionSetup.getPlantChoices(playerIndex))
// Keep map clicks blocked while the panel is on screen.
store.context.productionSetupPending = true

const hasChoices = computed(() => managerChoices.value.length > 0 || plantChoices.value.length > 0)

function confirmSetup() {
	const historyEntry = productionSetup.applyProductionSetup(playerIndex, managerChoices.value, plantChoices.value)
	stack.addItemToStack({
		action: rf.STACK_PRODUCTION_SETUP,
		historyEntry,
		playerIndex,
	})
	store.context.productionSetupPending = false
	store.context.action = rf.ACT_TM_SELECT_TRANSPORTER
	highlight.updateAllHighlightsForTransporterMode()
	context.createUndoPoint()
}
</script>

<template>
	<div v-if="hasChoices" class="productionSetupPanel">
		<b>{{ $t("productionSetup.title") }}</b>
		<p class="productionSetupHint">{{ $t("productionSetup.hint") }}</p>

		<div v-if="managerChoices.length > 0">
			<b>{{ $t("productionSetup.managers") }}</b>
			<div v-for="choice in managerChoices" :key="choice.hexID" class="productionSetupRow">
				<label>
					<input type="checkbox" v-model="choice.active" />
					{{ $t("productionSetup.useManager", { hex: choice.hexID }) }}
				</label>
			</div>
		</div>

		<div v-if="plantChoices.length > 0">
			<b>{{ $t("productionSetup.powerPlants") }}</b>
			<div v-for="choice in plantChoices" :key="choice.bldgID" class="productionSetupRow">
				{{ $t("productionSetup.firePlant", { hex: choice.hexID }) }}
				<select v-model="choice.transporterID">
					<option :value="-1">{{ $t("productionSetup.doNotFire") }}</option>
					<option v-for="transporter in choice.transporters" :key="transporter.id" :value="transporter.id">
						{{ $t("productionSetup.useTransporterWood", { type: rf.ALL_RES_STRINGS[transporter.type] }) }} #{{ transporter.id }}
					</option>
				</select>
			</div>
		</div>

		<button class="actionsLineButton" @click="confirmSetup">{{ $t("productionSetup.confirm") }}</button>
	</div>
</template>

<style scoped>
.productionSetupPanel {
	border: 2px solid darkblue;
	background-color: lightsalmon;
	font-weight: bolder;
	width: fit-content;
	height: fit-content;
	padding: 5px;
	margin: auto;
	text-align: left;
}

.productionSetupHint {
	font-weight: normal;
}

.productionSetupRow {
	margin: 3px 0;
}
</style>
