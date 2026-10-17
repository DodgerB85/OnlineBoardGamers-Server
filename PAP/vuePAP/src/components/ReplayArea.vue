<script setup>
/**
 * Replay: one engine state per move (model.buildReplayFrames). The board follows
 * store.viewGame, which reads the frame at replayStep.index while this panel is open.
 */
import { computed, onMounted, onUnmounted } from "vue"
import * as model from "../js/PAPmodel"
import { logText } from "../js/PAPlog.js"
import { useModelStore } from "../stores/PAPstore.js"
const store = useModelStore()

const lastMove = computed(() => (store.replayStep.index > 0 ? store.actions[store.replayStep.index - 1] : null))
const lastMoveText = computed(() => {
	if (!lastMove.value) return "Start of game"
	const { seat, a } = lastMove.value
	return store.viewGame.players[seat].name + ": " + a.type
})
const lastLogText = computed(() => {
	const log = store.viewGame.log
	return log.length ? logText(log[log.length - 1], store.viewGame) : ""
})

function goTo(i) {
	store.replayStep.index = Math.max(0, Math.min(store.replayStep.maxStep, i))
}

function exitReplay() {
	store.viewSettings.showReplay = false
}

onMounted(() => {
	store.replayData = model.buildReplayFrames()
	store.replayStep.maxStep = store.replayData.length - 1
	store.replayStep.index = store.replayStep.maxStep
})

onUnmounted(() => {
	store.replayData = []
})
</script>

<template>
	<div id="replayArea">
		<h2>Replay</h2>
		<p>Move {{ store.replayStep.index }} / {{ store.replayStep.maxStep }}</p>
		<div class="replayButtons">
			<button class="actionsLineButton" :disabled="store.replayStep.index === 0" @click="goTo(0)">|&lt;</button>
			<button class="actionsLineButton" :disabled="store.replayStep.index === 0" @click="goTo(store.replayStep.index - 1)">&lt; Prev</button>
			<button class="actionsLineButton" :disabled="store.replayStep.index === store.replayStep.maxStep" @click="goTo(store.replayStep.index + 1)">Next &gt;</button>
			<button class="actionsLineButton" :disabled="store.replayStep.index === store.replayStep.maxStep" @click="goTo(store.replayStep.maxStep)">&gt;|</button>
			<button class="actionsLineButton" @click="exitReplay">Exit Replay</button>
		</div>
		<input class="replaySlider" type="range" min="0" :max="store.replayStep.maxStep" v-model.number="store.replayStep.index" />
		<p class="replayMove"><b>Move:</b> {{ lastMoveText }}</p>
		<p class="replayLog"><b>Log:</b> {{ lastLogText }}</p>
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
	box-sizing: border-box;
}
.replayButtons { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
.replaySlider { width: 100%; margin: 8px 0; }
.replayMove, .replayLog { margin: 4px 0; font-size: 14px; }
.actionsLineButton {
	margin: 2px;
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 6px 12px;
	cursor: pointer;
}
.actionsLineButton:disabled { opacity: 0.5; cursor: default; }
</style>
