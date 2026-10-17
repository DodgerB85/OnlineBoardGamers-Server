<script setup>
import { computed } from "vue"
import { useModelStore } from "../stores/PAPstore.js"
import HistoryEntry from "./HistoryEntry.vue"
const store = useModelStore()

// Newest first, grouped by Year.
const years = computed(() => {
	const out = []
	const log = store.viewGame.log
	for (let i = log.length - 1; i >= 0; i--) {
		if (!out.length || out[out.length - 1].year !== log[i].y) out.push({ year: log[i].y, entries: [] })
		out[out.length - 1].entries.push({ entry: log[i], idx: i })
	}
	return out
})

function close() {
	store.viewSettings.showHistory = false
	store.clearHistoryHelpers()
}
</script>

<template>
	<div id="history" v-if="store.viewSettings.showHistory">
		<div class="historyHeader">
			<h2>History</h2>
			<button class="actionsLineButton" @click="close">Close</button>
		</div>
		<div class="historyList">
			<div v-for="group in years" :key="group.year" class="historyYear">
				<h3>Year {{ group.year }}</h3>
				<HistoryEntry v-for="item in group.entries" :key="item.idx" :entry="item.entry" :game="store.viewGame" />
			</div>
		</div>
	</div>
</template>

<style scoped>
#history {
	border: 2px solid black;
	background-color: white;
	margin: 4px auto;
	max-width: 800px;
	max-height: 500px;
	overflow-y: auto;
	text-align: left;
}
.historyHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 4px 8px;
	background-color: #eee;
	position: sticky;
	top: 0;
}
.historyHeader h2 { margin: 0; }
.historyList { padding: 4px; }
.historyYear h3 { margin: 8px 0 2px; font-size: 15px; }
.actionsLineButton {
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 4px 10px;
	cursor: pointer;
}
</style>
