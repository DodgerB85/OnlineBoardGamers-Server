<script setup>
import { onMounted } from "vue"
import * as replay from "../js/DDLreplay.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"
import HistoryEntry from "./HistoryEntry.vue"

const store = useModelStore()
const personal = usePersonalStore()

onMounted(() => {
	if (store.replayData.length === 0) replay.buildReplayData()
})

function step(amount) {
	replay.performStep(amount)
}
function exitReplay() {
	store.viewSettings.showReplay = false
	window.location.reload()
}
</script>

<template>
	<div id="replayArea">
		<h2>{{ $t("replay.title") }}</h2>
		<button v-if="personal.pov >= 0" class="actionsLineButton" :disabled="store.replayStep === 0" @click="step(-99)">|&lt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="step(-1)">&lt;</button>
		{{ store.replayStep + 1 }} / {{ store.replayData.length }}
		<button class="actionsLineButton" :disabled="store.replayStep >= store.replayData.length - 1" @click="step(1)">&gt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep >= store.replayData.length - 1" @click="step(99)">&gt;|</button>
		<button class="actionsLineButton" @click="exitReplay">{{ $t("replay.exit") }}</button>
		<div v-if="store.history[store.replayStep]" class="replayEntry">
			<HistoryEntry :entry="store.history[store.replayStep]" :index="store.replayStep" />
		</div>
	</div>
</template>

<style scoped>
#replayArea {
	border: 2px solid black;
	background-color: #f4f4f4;
	padding: 10px;
	margin: 6px auto;
	max-width: 800px;
	text-align: center;
}
.replayEntry { margin-top: 8px; background: #fff; }
.actionsLineButton { margin: 5px; border: 2px solid green; border-radius: 5px; font-weight: bolder; padding: 5px 9px; cursor: pointer; }
</style>
