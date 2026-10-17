<script setup>
import { computed } from "vue"
import { logIcon, logText } from "../js/PAPlog.js"
import { seatColour } from "./board/shared.js"
import ArtIcon from "./board/ArtIcon.vue"

const props = defineProps({
	entry: { type: Object, required: true },
	game: { type: Object, required: true },
})

const icon = computed(() => logIcon(props.entry))
</script>

<template>
	<div class="historyEntry">
		<span v-if="entry.seat !== null && entry.seat !== undefined" class="historyDot" :style="{ background: seatColour(entry.seat) }"></span>
		<ArtIcon v-if="icon" :name="icon.art" :label="icon.label" :size="18" />
		<span>{{ logText(entry, game) }}</span>
	</div>
</template>

<style scoped>
.historyEntry {
	display: flex;
	align-items: center;
	gap: 6px;
	border-bottom: 1px solid #bbb;
	padding: 3px 6px;
	font-size: 14px;
	text-align: left;
}
.historyDot {
	flex: none;
	width: 10px;
	height: 10px;
	border-radius: 50%;
}
</style>
