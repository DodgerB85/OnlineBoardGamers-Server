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
	<div class="panel history-panel">
		<h2>History</h2>
		<ol>
			<li v-for="row in rows" :key="row.index" :class="{ system: row.seat < 0 }">
				<span>{{ row.text }}</span>
			</li>
		</ol>
		<p v-if="!rows.length" class="empty">No actions yet.</p>
	</div>
</template>

<style scoped>
.history-panel {
	max-height: 70vh;
	overflow: auto;
}

ol {
	list-style: none;
	padding: 0;
	margin: 0;
	font-size: 13px;
}

li {
	border-bottom: 1px solid rgba(102, 57, 49, 0.25);
	padding: 4px 0;
	display: flex;
	gap: 6px;
}

li.system {
	opacity: 0.7;
	font-style: italic;
}

.empty {
	opacity: 0.7;
}
</style>
