<script setup>
import * as rf from "../js/ROWreference"

const props = defineProps({
	entry: { type: Array, required: true },
	index: { type: Number, required: true },
})

function eventText(event) {
	if (event === rf.HIST_NEW_GAME) return "New game created"
	if (event === rf.HIST_END_TURN) return "Ended turn"
	if (event === rf.HIST_GAME_END) return "Game ended"
	return "Event " + event
}
</script>

<template>
	<div class="historyEntry">
		<span class="event">{{ eventText(entry[0]) }}</span>
		<span class="playerIndex" v-if="entry[1] >= 0">(seat {{ entry[1] }})</span>
	</div>
</template>

<style scoped>
.historyEntry {
	border-bottom: 1px solid #bbb;
	padding: 3px 6px;
	font-size: 14px;
	text-align: left;
}
.event { font-weight: bold; }
.playerIndex { color: #666; margin-left: 6px; }
</style>
