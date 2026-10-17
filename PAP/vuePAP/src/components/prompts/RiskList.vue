<script setup>
// Warnings before a costly move: the warning icon with the short reason. Never blocks the move.
import { ICONS } from "../board/icons.js"
import ArtIcon from "../board/ArtIcon.vue"

defineProps({ risks: { type: Array, required: true } })
</script>

<template>
	<span class="pp-risks">
		<span v-for="(r, i) in risks" :key="i" class="pp-risk">
			<ArtIcon :name="ICONS.warning.art" :size="14" :label="ICONS.warning.label" />
			{{ r.text }}
		</span>
	</span>
</template>
