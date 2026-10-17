<script setup>
import { computed } from "vue"
import { INGREDIENTS } from "../../js/engine/cards.js"
import ArtIcon from "./ArtIcon.vue"
import { costText } from "./shared.js"

const props = defineProps({
	cost: { type: Object, required: true },
	size: { type: Number, default: 16 },
})

// One icon per unit: a recipe costs at most three of any one ingredient.
const units = computed(() => INGREDIENTS.flatMap(k => Array(props.cost[k] || 0).fill(k)))
const label = computed(() => "Cost: " + costText(props.cost))
</script>

<template>
	<span class="costIcons" role="img" :title="label" :aria-label="label">
		<ArtIcon v-for="(kind, i) in units" :key="i" :name="kind" :size="size" />
	</span>
</template>

<style scoped>
.costIcons {
	display: inline-flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 1px;
}
</style>
