<script setup>
import { computed } from "vue"
import { RECIPES } from "../../js/engine/cards.js"
import ArtIcon from "./ArtIcon.vue"
import CostIcons from "./CostIcons.vue"
import { STAR_COLOURS, costText } from "./shared.js"

const props = defineProps({
	recipeId: { type: String, required: true },
	dim: { type: Boolean, default: false },
	missing: { type: Object, default: null },
})

const recipe = computed(() => RECIPES[props.recipeId])
const label = computed(() => `${recipe.value.name}, ${recipe.value.stars} star. Cost: ${costText(recipe.value.cost)}`)
// Ingredients short for brewing now, one icon per unit.
const short = computed(() => Object.entries(props.missing || {}).flatMap(([k, n]) => Array(n).fill(k)))
</script>

<template>
	<div class="miniRecipe" :class="{ dim }" role="group" :title="label" :aria-label="label">
		<div class="name">{{ recipe.name }}</div>
		<div class="stars" :style="{ color: STAR_COLOURS[recipe.stars] }">{{ "★".repeat(recipe.stars) }}</div>
		<CostIcons :cost="recipe.cost" :size="24" />
		<div v-if="short.length" class="short" :title="'Missing: ' + short.join(', ')">
			<ArtIcon v-for="(kind, i) in short" :key="i" :name="kind" :size="20" />
		</div>
	</div>
</template>

<style scoped>
.miniRecipe {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
	width: 132px;
	box-sizing: border-box;
	border: 2px solid #888;
	border-radius: 6px;
	padding: 4px 4px 6px;
	background-color: #fbf8ef;
	text-align: center;
}
.miniRecipe.dim {
	opacity: 0.45;
}
.short {
	display: flex;
	gap: 1px;
	align-items: center;
	justify-content: center;
	flex-wrap: wrap;
}
.name {
	font-size: 11px;
	font-weight: bold;
	line-height: 1.15;
	min-height: 26px;
	display: flex;
	align-items: center;
}
.stars {
	font-size: 18px;
	line-height: 1;
	letter-spacing: -2px;
}
</style>
