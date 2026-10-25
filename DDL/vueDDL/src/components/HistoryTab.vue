<script setup>
import { computed } from "vue"
import { useModelStore } from "../stores/DDLstore.js"
import HistoryEntry from "./HistoryEntry.vue"
const store = useModelStore()

const reversed = computed(() => [...store.history].reverse())

function close() {
	store.viewSettings.showHistory = false
	store.clearHistoryHelpers()
}
</script>

<template>
	<div id="history" v-if="store.viewSettings.showHistory">
		<div class="historyHeader">
			<h2>{{ $t("history.title") }}</h2>
			<button class="actionsLineButton" @click="close">{{ $t("common.close") }}</button>
		</div>
		<div class="historyList">
			<HistoryEntry v-for="(entry, idx) in reversed" :key="idx" :entry="entry" :index="idx" />
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
	z-index: 1;
}
.historyHeader h2 { margin: 0; }
.historyList { padding: 4px; }
.actionsLineButton { border: 2px solid green; border-radius: 5px; font-weight: bolder; padding: 4px 10px; cursor: pointer; }
</style>
