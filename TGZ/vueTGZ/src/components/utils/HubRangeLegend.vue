<script setup>
defineProps({
	ranges: { type: Array, default: () => [] },
})
</script>

<template>
	<span class="hubRangeSq hubRangeSq0">0</span>
	<span v-for="idx in Math.max(ranges.length - 1, 0)" :key="idx" class="hubRangeSq" :class="'hubRangeSq' + String(idx % 8)">
		{{ idx }}
	</span>
</template>
