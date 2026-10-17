<script setup>
import { computed } from "vue"
import ArtIcon from "./ArtIcon.vue"
import { ICON_SCALE } from "./icons.js"

const props = defineProps({
	kind: { type: String, required: true },
	count: { type: Number, default: null },
	label: { type: String, default: "" },
	title: { type: String, required: true },
	fan: { type: Boolean, default: false },
	size: { type: Number, default: 44 },
})

// A fanned stack shows three backs rotated apart; a single back shows one.
const layers = computed(() => (props.fan ? [-7, 0, 7] : [0]))
</script>

<template>
	<span class="cardBack" role="img" :title="title" :aria-label="title">
		<span class="stack" :style="{ width: size * ICON_SCALE + 'px', height: size * ICON_SCALE * 1.4 + 'px' }">
			<span v-for="(deg, i) in layers" :key="i" class="layer" :style="{ transform: `rotate(${deg}deg)`, zIndex: i }">
				<ArtIcon :name="'back-' + kind" :size="size" />
			</span>
		</span>
		<span v-if="count !== null" class="count">{{ count }}</span>
		<span v-if="label" class="label">{{ label }}</span>
	</span>
</template>

<style scoped>
.cardBack {
	display: inline-flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	position: relative;
	max-width: 100%;
}
.stack {
	position: relative;
	display: inline-block;
}
.layer {
	position: absolute;
	left: 0;
	top: 0;
	transform-origin: 50% 90%;
}
.count {
	position: absolute;
	top: -6px;
	right: -6px;
	z-index: 5;
	min-width: 18px;
	padding: 0 4px;
	border: 1px solid #2b2233;
	border-radius: 9px;
	background-color: #2b2233;
	color: #fff;
	font-size: 12px;
	font-weight: bold;
	text-align: center;
	line-height: 16px;
}
.label {
	font-size: 11px;
	line-height: 1.15;
	max-width: 80px;
	text-align: center;
}
</style>
