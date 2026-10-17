<script setup>
// Kettle craft: recipe, Dispensation, Poison markers and swaps. Used by the Kettle tile and The Second Kettle.
// Fills the `craft` object it is given (see newCraft in shared.js); the parent builds the action from it.
import { computed } from "vue"
import { DISPENSATIONS, INGREDIENTS, INGREDIENT_INFO, RECIPES } from "../../js/engine/cards.js"
import { kettleCapacity } from "../../js/engine/state.js"
import { craftable } from "../../js/PAPhints.js"
import { ICONS } from "../board/icons.js"
import { STAR_COLOURS } from "../board/shared.js"
import ArtIcon from "../board/ArtIcon.vue"
import TokenPip from "../board/TokenPip.vue"
import CostRow from "./CostRow.vue"

const props = defineProps({ state: Object, seat: Number })
const craft = defineModel("craft", { type: Object, required: true })
const p = computed(() => props.state.players[props.seat])
const recipe = computed(() => RECIPES[craft.value.recipe])
const swapper = computed(() => craft.value.disp === "fieldGradeToadstool" || craft.value.disp === "shamblingQuicksilver")
const banshee = computed(() => craft.value.disp === "doomRecycledBanshee" && (recipe.value?.cost.banshee || 0) > 0)
const can = computed(() => craftable(props.state, props.seat))

// Requirement before Dispensation swaps: Scare surcharge (R40), Tier 2+ Quicksilver halving (R41), Poison markers.
const need = computed(() => {
	if (!recipe.value) return null
	const n = { ...recipe.value.cost }
	if (props.state.yearFx.craftExtraIngredient) n[INGREDIENTS.find(k => n[k] > 0)] += 1
	if (p.value.tier >= 2) n.quick = Math.ceil(n.quick / 2)
	for (const k of craft.value.poisonPay.slice(0, craft.value.poison)) if (k) n[k] += 1
	return n
})
const swapMax = computed(() => {
	if (!need.value) return 0
	if (craft.value.disp === "fieldGradeToadstool") return need.value.toad
	if (craft.value.disp === "shamblingQuicksilver") return need.value.quick
	return 0
})
</script>

<template>
	<div>
		<p class="pp-row">
			<TokenPip :icon="ICONS.kettleSlot.art" :value="p.potions.length + '/' + kettleCapacity(p)" :label="'Kettle slots used'" />
			<span v-if="p.potions.length >= kettleCapacity(p)" class="pp-warn">Kettle full</span>
		</p>

		<div class="pp-row">
			<button
				v-for="id in p.recipes"
				:key="id"
				class="pp-btn pp-card"
				:class="{ sel: craft.recipe === id }"
				:title="RECIPES[id].flavor"
				@click="craft.recipe = id"
			>
				{{ RECIPES[id].name }}
				<small>
					<span :style="{ color: STAR_COLOURS[RECIPES[id].stars] }">{{ "★".repeat(RECIPES[id].stars) }}</span>
					<CostRow :cost="RECIPES[id].cost" />
				</small>
				<small v-if="can[id].ok" class="pp-ok">✓ affordable</small>
				<small v-else-if="Object.keys(can[id].missing).length" class="pp-warn">✗ short <CostRow :cost="can[id].missing" /></small>
				<small v-else class="pp-warn">✗ Kettle full</small>
			</button>
		</div>
		<p v-if="craft.disp && recipe" class="pp-note">Dispensation swaps are not counted in the check above.</p>

		<div class="pp-row">
			<label class="pp-field">
				Dispensation
				<select v-model="craft.disp">
					<option value="">None</option>
					<option v-for="id in p.dispensations" :key="id" :value="id">{{ DISPENSATIONS[id].name }}</option>
				</select>
			</label>
			<span v-if="craft.disp" class="pp-note" :title="DISPENSATIONS[craft.disp].text">{{ DISPENSATIONS[craft.disp].text }}</span>
		</div>

		<div class="pp-row">
			<label class="pp-field">
				<ArtIcon :name="ICONS.poison.art" :size="16" :label="ICONS.poison.label" />
				Poison
				<select v-model.number="craft.poison">
					<option v-for="n in [0, 1, 2, 3]" :key="n" :value="n">{{ n }}</option>
				</select>
			</label>
			<label v-for="i in craft.poison" :key="i" class="pp-field">
				Marker {{ i }} paid with
				<select v-model="craft.poisonPay[i - 1]">
					<option value="" disabled>Choose</option>
					<option v-for="k in INGREDIENTS" :key="k" :value="k">{{ INGREDIENT_INFO[k].name }}</option>
				</select>
			</label>
		</div>

		<div v-if="swapper" class="pp-row">
			<label class="pp-field">
				Swap
				<select v-model.number="craft.swap">
					<option v-for="n in swapMax + 1" :key="n" :value="n - 1">{{ n - 1 }}</option>
				</select>
			</label>
			<span class="pp-note">{{ craft.disp === "fieldGradeToadstool" ? "Toadstool paid as Quicksilver" : "Quicksilver paid as Crystal" }}</span>
		</div>

		<div v-if="banshee" class="pp-row">
			<span class="pp-note">Replace the Banshee with:</span>
			<label v-for="i in 2" :key="i" class="pp-field">
				<select v-model="craft.swapPay[i - 1]">
					<option value="" disabled>Choose</option>
					<option v-for="k in INGREDIENTS.filter(x => x !== 'banshee')" :key="k" :value="k">{{ INGREDIENT_INFO[k].name }}</option>
				</select>
			</label>
		</div>
	</div>
</template>
