<script setup>
// setup.recipes: each player learns two different House Specials.
import { ref } from "vue"
import * as controller from "../../js/PAPcontroller"
import { HOUSE_SPECIALS, RECIPES } from "../../js/engine/cards.js"
import { STAR_COLOURS } from "../board/shared.js"
import CostRow from "./CostRow.vue"

const props = defineProps({ prompt: Object, state: Object })
const picked = ref([])

const takenBy = id => props.state.players.filter(p => p.recipes.includes(id)).length

function toggle(id) {
	if (picked.value.includes(id)) picked.value = picked.value.filter(x => x !== id)
	else if (picked.value.length < 2 && takenBy(id) < 2) picked.value = [...picked.value, id]
}
</script>

<template>
	<div>
		<div class="pp-row">
			<button
				v-for="id in HOUSE_SPECIALS"
				:key="id"
				class="pp-btn pp-card"
				:class="{ sel: picked.includes(id) }"
				:disabled="takenBy(id) >= 2 && !picked.includes(id)"
				:title="RECIPES[id].flavor"
				@click="toggle(id)"
			>
				{{ RECIPES[id].name }}
				<small>
					<span :style="{ color: STAR_COLOURS[RECIPES[id].stars] }">{{ "★".repeat(RECIPES[id].stars) }}</span>
					<CostRow :cost="RECIPES[id].cost" />
					<span :class="{ 'pp-warn': takenBy(id) >= 2 }">{{ takenBy(id) }}/2 taken</span>
				</small>
			</button>
		</div>
		<p>
			<button class="pp-btn primary" :disabled="picked.length !== 2" @click="controller.act({ type: 'chooseRecipes', recipes: [...picked] })">Learn these two recipes</button>
		</p>
		<p v-if="picked.length !== 2" class="pp-why">Pick two different House Specials ({{ picked.length }} of 2 chosen)</p>
	</div>
</template>
