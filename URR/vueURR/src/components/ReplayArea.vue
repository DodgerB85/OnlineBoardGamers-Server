<script setup>
/**
 * Minimal replay: steps through the snapshots stored in the history entries.
 * Replace this with a proper replay of the real game state as you build URR.
 */
import { ref } from "vue"
import { restoreState } from "../js/URRmodel.js"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()

const step = ref(0)

function maxStep() {
	return store.history.length - 1
}

function applyStep() {
	const entry = store.history[step.value]
	if (!entry) return
	try {
		const snapshot = JSON.parse(entry[2])
		if (snapshot && snapshot.players) {
			restoreState(snapshot)
		}
	} catch (e) {
		console.error("Unable to restore URR replay snapshot:", e)
	}
}

function prev() {
	if (step.value > 0) {
		step.value--
		applyStep()
	}
}

function next() {
	if (step.value < maxStep()) {
		step.value++
		applyStep()
	}
}

function exitReplay() {
	store.viewSettings.showReplay = false
	window.location.reload()
}
</script>

<template>
	<div id="replayArea">
		<h2>Replay</h2>
		<p>Step {{ step }} / {{ maxStep() }}</p>
		<button class="actionsLineButton" @click="prev">&lt; Prev</button>
		<button class="actionsLineButton" @click="next">Next &gt;</button>
		<button class="actionsLineButton" @click="exitReplay">Exit Replay</button>
	</div>
</template>

<style scoped>
#replayArea {
	border: 2px solid black;
	background-color: lightgray;
	padding: 10px;
	margin: 6px auto;
	max-width: 700px;
	text-align: center;
}
.actionsLineButton {
	margin: 6px;
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 6px 12px;
	cursor: pointer;
}
</style>
