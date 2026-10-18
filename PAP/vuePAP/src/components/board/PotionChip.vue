<script setup>
import { computed } from "vue"
import { DISPENSATIONS, RECIPES } from "../../js/engine/cards.js"
import { usePersonalStore } from "../../stores/PAPpersonal.js"
import potionRaw from "../../assets/art/potion.svg?raw"
import ArtIcon from "./ArtIcon.vue"
import { FAMILY, STAR_COLOURS } from "./shared.js"

const props = defineProps({
	potion: { type: Object, required: true },
	owner: { type: Number, required: true },
	compact: { type: Boolean, default: false },
	spoil: { type: Boolean, default: false },
})

const personal = usePersonalStore()
const recipe = computed(() => RECIPES[props.potion.recipe])
const disp = computed(() => (props.potion.disp ? DISPENSATIONS[props.potion.disp] : null))
const colour = computed(() => STAR_COLOURS[recipe.value.stars])
// Total potency would reveal Poison by subtracting the public recipe and Dispensation bonuses.
const showPoison = computed(() => props.owner === personal.pov)
const potency = computed(() => showPoison.value ? props.potion.potency : "?")

const marks = computed(() => [props.potion.backedFutures && "Backed Futures", props.potion.protected && "Protected"].filter(Boolean))
const label = computed(() => {
	const parts = [`${recipe.value.name}, ${recipe.value.stars} star, potency ${showPoison.value ? potency.value : "hidden"}`]
	if (disp.value) parts.push(`${disp.value.name} (${FAMILY[disp.value.family].name})`)
	if (showPoison.value) parts.push(`poison ${props.potion.poison}`)
	return [...parts, ...marks.value].join(". ")
})
</script>

<template>
	<span v-if="compact" class="potionChip compact" role="img" :title="label" :aria-label="label" :style="{ color: colour }">
		<span class="bottleWrap">
			<span class="bottle" v-html="potionRaw"></span>
			<span class="potency">{{ potency }}</span>
			<span v-if="disp" class="dispDot" :style="{ backgroundColor: FAMILY[disp.family].colour }"></span>
			<span v-if="spoil" class="spoilMark" title="Will spoil at this Audit unless protected">✗</span>
		</span>
		<span v-if="showPoison && potion.poison" class="skull"><ArtIcon name="poison" :size="12" />{{ potion.poison }}</span>
	</span>
	<div v-else class="potionChip" role="group" :title="label" :aria-label="label" :style="{ borderColor: colour }">
		<span class="bottle" :style="{ color: colour }" v-html="potionRaw"></span>
		<div class="info">
			<div class="recipeName">
				{{ recipe.name }} <span class="stars" :style="{ color: colour }">{{ "★".repeat(recipe.stars) }}</span>
			</div>
			<div class="line">Potency <b>{{ potency }}</b></div>
			<div v-if="disp" class="disp" :style="{ borderColor: FAMILY[disp.family].colour }">
				<span class="dispDot" :style="{ backgroundColor: FAMILY[disp.family].colour }"></span>{{ disp.name }}
			</div>
			<div v-if="showPoison" class="line"><ArtIcon name="poison" :size="14" /> {{ potion.poison }}</div>
			<div v-if="spoil" class="spoilMark">✗ will spoil at Audit</div>
			<div v-if="marks.length" class="marks">
				<span v-for="m in marks" :key="m" class="mark">{{ m }}</span>
			</div>
		</div>
	</div>
</template>

<style scoped>
.potionChip {
	display: flex;
	gap: 6px;
	align-items: flex-start;
	box-sizing: border-box;
	border: 2px solid #888;
	border-radius: 6px;
	padding: 4px 6px;
	background-color: #fbf8ef;
	text-align: left;
	font-size: 12px;
	max-width: 180px;
}
.bottle :deep(svg) {
	width: 26px;
	height: auto;
	display: block;
}
.recipeName {
	font-weight: bold;
}
.stars {
	letter-spacing: -2px;
}
.line {
	color: #444;
}
.disp {
	display: flex;
	align-items: center;
	gap: 4px;
	border-left: 3px solid;
	padding-left: 4px;
}
.marks {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}
.mark {
	background-color: #eef;
	border: 1px solid #889;
	border-radius: 3px;
	padding: 0 3px;
}

/* Compact: a bottle tinted by stars, with a potency badge, a Dispensation dot and an owner-only poison count. */
.potionChip.compact {
	flex-direction: column;
	align-items: center;
	gap: 2px;
	max-width: none;
	border: none;
	border-radius: 0;
	padding: 0;
	background: none;
}
.bottleWrap {
	position: relative;
	display: inline-block;
	line-height: 0;
}
.compact .bottle :deep(svg) {
	width: 28px;
}
.compact .potency {
	position: absolute;
	top: -4px;
	right: -6px;
	min-width: 14px;
	border: 1px solid #2b2233;
	border-radius: 7px;
	background-color: #fff;
	color: #2b2233;
	font-size: 10px;
	font-weight: bold;
	line-height: 13px;
	text-align: center;
}
.spoilMark {
	color: #b00020;
	font-weight: bold;
}
.compact .spoilMark {
	position: absolute;
	top: -6px;
	left: -4px;
	font-size: 14px;
	line-height: 1;
}
.dispDot {
	display: inline-block;
	flex: none;
	width: 8px;
	height: 8px;
	border: 1px solid #2b2233;
	border-radius: 50%;
}
.compact .dispDot {
	position: absolute;
	bottom: 2px;
	left: -3px;
}
.compact .skull {
	display: inline-flex;
	align-items: center;
	gap: 1px;
	border: 1px solid #2b2233;
	border-radius: 7px;
	padding: 0 4px 0 2px;
	background-color: #fff;
	color: #2b2233;
	font-size: 10px;
	font-weight: bold;
	line-height: 13px;
}
</style>
