<script setup>
import { computed } from "vue"
import { ICON_SCALE } from "./icons.js"

const props = defineProps({
	name: { type: String, required: true },
	size: { type: Number, default: 24 },
	label: { type: String, default: "" },
})

const src = computed(() => new URL(`../../assets/art/${props.name}.svg`, import.meta.url).href)
</script>

<template>
	<img class="artIcon" :src="src" :width="Math.round(size * ICON_SCALE)" :alt="label" :title="label || null" :aria-label="label || null" />
</template>

<style scoped>
.artIcon {
	display: inline-block;
	vertical-align: middle;
	height: auto;
}
</style>
