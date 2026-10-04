<script setup>
import { useModelStore } from "../stores/PAPstore.js"
import HistoryEntry from "./HistoryEntry.vue"
const store = useModelStore()

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
			<HistoryEntry v-for="(entry, idx) in store.history" :key="idx" :entry="entry" :index="idx" />
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
.actionsLineButton {
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 4px 10px;
	cursor: pointer;
}
</style>
