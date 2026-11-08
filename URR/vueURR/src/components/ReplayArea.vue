<script setup>
import { onMounted, onBeforeUnmount, computed, watch } from "vue"
import * as model from "../js/URRmodel.js"
import * as funcs from "../js/URRfuncs.js"
import * as IO from "../backend/URR_IO.js"
import { previousOwnStep } from "../js/URRhistoryStorage.js"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()

// Replay opens on the latest position; the slider is 0-based internally but
// displays the first step as 1.
store.replayStep.index = Math.max(0, store.history.length - 1)
const step = computed({ get: () => store.replayStep.index, set: (index) => { store.replayStep.index = index } })
const liveSnapshot = funcs.simpleExportWholeURRmodel()

onMounted(applyStep)
watch(step, applyStep)
// The menu can close replay without reloading; never leave a historical
// position available for live moves.
onBeforeUnmount(() => {
	funcs.simpleImportWholeURRmodel(liveSnapshot)
	IO.checkForLatestData()
})

function maxStep() {
	return store.history.length - 1
}

function applyStep() {
	const snapshot = store.historySnapshotAt(step.value)
	if (!snapshot?.players) return
	try {
		model.restoreState(snapshot)
	} catch (e) {
		console.error("Unable to restore URR replay snapshot:", e)
	}
}

function prev() {
	if (step.value > 0) {
		step.value--
	}
}

function backToMyLastMove() {
	const index = previousOwnStep(store.history, personal.pov, step.value)
	if (index !== null) step.value = index
}

function next() {
	if (step.value < maxStep()) {
		step.value++
	}
}

function exitReplay() {
	store.viewSettings.showReplay = false
}
</script>

<template>
	<div id="replayArea" :aria-label="$t('replay.aria')">
		<b>{{ $t("replay.title") }}</b>
		<button v-if="personal.pov >= 0" class="actionsLineButton" :disabled="step === 0" @click="backToMyLastMove">{{ $t("replay.backToMyLastMove") }}</button>
		<button class="actionsLineButton" :disabled="step === 0" @click="prev">&lt; {{ $t("replay.prev") }}</button>
		<input :aria-label="$t('replay.stepAria')" type="range" min="0" :max="Math.max(0, maxStep())" v-model.number="step" />
		<span>{{ $t("replay.step", { step: step + 1, total: maxStep() + 1 }) }}</span>
		<button class="actionsLineButton" :disabled="step >= maxStep()" @click="next">{{ $t("replay.next") }} &gt;</button>
		<button class="actionsLineButton" @click="store.viewSettings.showHistory = !store.viewSettings.showHistory">{{ $t("replay.history") }}</button>
		<button class="actionsLineButton" @click="exitReplay">{{ $t("replay.exit") }}</button>
	</div>
</template>

<style scoped>
#replayArea { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; background: #d4eafd; border: 1px solid black; padding: 8px; margin: 10px 12px 0; text-align: center; font-size: 16px; font-weight: 400; }
#replayArea input { width: min(300px, 35vw); }
@media (max-width: 1050px) { .actionsLineButton, #replayArea input { min-height: 44px; box-sizing: border-box; } }
</style>
