<script setup>
import { computed } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import { historyText } from "../js/LBRview.js";
import * as model from "../js/LBRmodel.js";

const store = useModelStore();

const labels = computed(() => store.playerNames.map((_, seat) => model.seatName(seat)));

const rows = computed(() => {
	if (!store.game) return [];
	return store.game.history
		.map((entry, index) => ({
			index,
			seat: entry.s,
			text: historyText(entry, labels.value),
		}))
		.reverse();
});
</script>

<template>
	<div id="history" aria-label="Game history">
		<div class="historyHeading">
			<h2>History</h2>
			<button type="button" class="utilityClose" @click="store.viewSettings.showHistory = false" aria-label="Close history">×</button>
		</div>
		<ol>
			<li v-for="row in rows" :key="row.index" :class="{ system: row.seat < 0 }">
				<span>{{ row.text }}</span>
			</li>
		</ol>
		<p v-if="!rows.length" class="empty">No actions yet.</p>
	</div>
</template>

<style scoped>
#history {
	position: fixed;
	left: 2px;
	top: calc(var(--lbr-menu-height, 60px) + 2px);
	width: 450px;
	max-width: calc(100vw - 4px);
	max-height: calc(100vh - var(--lbr-menu-height, 60px) - 4px);
	box-sizing: border-box;
	z-index: 9999;
	border: 2px solid black;
	background-color: #d4eafd;
	overflow-y: auto;
	padding: 0 8px 8px;
	text-align: left;
}
.historyHeading { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 4px; background: #d4eafd; border-bottom: 1px solid #adc2d0; text-align: center; }
.historyHeading h2 { font-size: 20px; }
.historyHeading button { font-size: 26px; border: 0; background: none; cursor: pointer; padding: 5px; }
ol { list-style: none; padding: 0; margin: 0; font-size: 16px; }
li { border-bottom: 1px solid #adc2d0; padding: 5px 2px; display: flex; gap: 6px; }
li.system { opacity: 0.7; font-style: italic; }
.empty { opacity: 0.7; }
@media (max-width: 1050px) { .historyHeading button { min-width: 44px; min-height: 44px; box-sizing: border-box; } }
</style>
