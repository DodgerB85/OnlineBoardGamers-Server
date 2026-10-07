<script setup>
import { onMounted, onBeforeUnmount, computed, watch } from "vue"
import * as model from "../js/URRmodel.js"
import * as IO from "../backend/URR_IO.js"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()

store.replayStep.index = 0
const step = computed({ get: () => store.replayStep.index, set: (index) => { store.replayStep.index = index } })
const liveSnapshot = model.snapshotState()

onMounted(applyStep)
watch(step, applyStep)
// The menu can close replay without reloading; never leave a historical
// position available for live moves.
onBeforeUnmount(() => {
	model.restoreState(liveSnapshot)
	IO.checkForLatestData()
})

function maxStep() {
	return store.history.length - 1
}

function applyStep() {
	const entry = store.history[step.value]
	if (!entry) return
	try {
		const snapshot = JSON.parse(entry[2])
		if (snapshot && snapshot.players) {
			model.restoreState(snapshot)
		}
	} catch (e) {
		console.error("Unable to restore URR replay snapshot:", e)
	}
}

function prev() {
	if (step.value > 0) {
		step.value--
	}
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
	<div id="replayArea" aria-label="Replay controls">
		<b>Replay</b>
		<button class="actionsLineButton" :disabled="step === 0" @click="prev">&lt; Prev</button>
		<input aria-label="Replay step" type="range" min="0" :max="Math.max(0, maxStep())" v-model.number="step" />
		<span>Step {{ step }} / {{ maxStep() }}</span>
		<button class="actionsLineButton" :disabled="step >= maxStep()" @click="next">Next &gt;</button>
		<button class="actionsLineButton" @click="store.viewSettings.showHistory = !store.viewSettings.showHistory">History</button>
		<button class="actionsLineButton" @click="exitReplay">Exit Replay</button>
	</div>
</template>

<style scoped>
#replayArea { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; background: #d4eafd; border: 1px solid black; padding: 8px; margin: 10px 12px 0; text-align: center; font-size: 16px; font-weight: 600; }
#replayArea input { width: min(300px, 35vw); }.actionsLineButton { border: 1px solid #527349; border-radius: 4px; padding: 6px 10px; background: #f7fff4; font: inherit; cursor: pointer; }.actionsLineButton:disabled { opacity: .4; cursor: default; }
@media (max-width: 1050px) { .actionsLineButton, #replayArea input { min-height: 44px; box-sizing: border-box; } }
</style>
