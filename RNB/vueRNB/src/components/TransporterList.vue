<script setup>
import * as rf from "../js/RNBreference"
import * as controller from "../js/RNBcontroller"
import * as model from "../js/RNBmodel"
import * as context from "../js/RNBcontext"
import * as view from "../js/RNBview"
import * as highlight from "../js/RNBhighlight"
import * as loc from "../js/RNBlocation"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/RNBpersonal.js"
const personal = usePersonalStore()

import { computed, ref } from "vue"
import HistoryEntry from "./History/HistoryEntry.vue"

const blockedEntry = ref([])

const transporters = computed(() => model.getTransportersByPlayerIndex(controller.currentPlayerIndex()))

function transImage(t) {
	return view.getImage("transporter_" + String(t.type) + "_" + personal.getCorrectedColour(store.players[t.ownerIndex].colour))
}

function cargo(t) {
	return [...model.resourcesOnTransport(t.id), ...model.resourcesFollowingTransporter(t.id)]
}

function carrier(t) {
	return loc.isOnAnyTransporter(t.location) ? model.getTransporterByID(t.location[1]) : null
}

// Same as selecting a transporter on the map, plus zoom to it
function selectTransporter(t) {
	blockedEntry.value = []
	if (!loc.isAnyHexLocation(t.location)) return
	store.context.action = rf.ACT_TM_SELECT_PICKUP_DROP_MOVE
	context.resetContextAndHighlights()
	store.context.selectedTransporterIDforTM = t.id
	highlight.updateAllHighlightsForTransporterMode()
	store.mapData.zoomData.hexID = t.location[1]
}

function resetTransporter(t) {
	blockedEntry.value = context.resetTransporter(t)
	if (blockedEntry.value.length === 0) highlight.updateAllHighlightsForTransporterMode()
}

const blockedHistoryEntry = computed(() => [rf.HIST_STACK_ACTIONS, controller.currentPlayerIndex(), -1, [store.gameflow.phase, blockedEntry.value]])
</script>

<template>
	<div class="transporterList">
		<div v-if="blockedEntry.length > 0">
			<span class="errorText">{{ $t("action.cantResetTransporter") }}</span>
			<HistoryEntry :entry="blockedHistoryEntry" />
		</div>
		<table>
			<tr v-for="t in transporters" :key="t.id" :class="{ selectedRow: store.context.selectedTransporterIDforTM === t.id }" @click="selectTransporter(t)">
				<td><img class="transImg" :src="transImage(t)" /></td>
				<td>{{ t.remainingMoves }}/{{ rf.getTransporterStats(t.type).maxMoves }}</td>
				<td>
					<template v-if="carrier(t)">{{ $t("action.carriedBy") }} <img class="transImg" :src="transImage(carrier(t))" /></template>
				</td>
				<td>
					<img v-for="res in cargo(t)" :key="res.id" class="resImg" :src="view.getImage(`res_${res.type}`)" />
					<img v-for="c in model.transportersOnTransporter(t.id)" :key="'t' + c.id" class="resImg" :src="transImage(c)" />
				</td>
				<td>
					<button v-if="context.stackEntriesForTransporter(t).length > 0" class="actionsLineButton" @click.stop="resetTransporter(t)">{{ $t("action.resetTransporter") }}</button>
				</td>
			</tr>
		</table>
	</div>
</template>

<style scoped>
.transporterList {
	margin: 4px auto;
	width: fit-content;
}
table {
	border-collapse: collapse;
}
tr {
	cursor: pointer;
}
.selectedRow {
	background-color: lightgoldenrodyellow;
}
.transImg {
	height: 24px;
}
.resImg {
	height: 18px;
}
.errorText {
	font-weight: bolder;
	background-color: lightgoldenrodyellow;
	color: darkred;
}
</style>
