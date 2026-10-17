<script setup>
import ArtIcon from "./ArtIcon.vue"

defineProps({
	icon: { type: String, required: true },
	value: { type: [Number, String], required: true },
	label: { type: String, required: true },
	locked: { type: Number, default: 0 },
	size: { type: Number, default: 22 },
})
</script>

<template>
	<span class="tokenPip" role="img" :title="label" :aria-label="label">
		<ArtIcon :name="icon" :size="size" />
		<b>{{ value }}</b>
		<small v-if="locked" class="locked"><ArtIcon name="hype-locked" :size="12" />{{ locked }}</small>
	</span>
</template>

<style scoped>
.tokenPip {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	border: 1px solid #b8ab8c;
	border-radius: 14px;
	padding: 1px 8px 1px 3px;
	background-color: #fff;
	white-space: nowrap;
}
b {
	font-size: 15px;
}
.locked {
	font-size: 11px;
	color: #6b5a3a;
}
</style>
