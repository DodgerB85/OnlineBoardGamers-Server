<script setup>
// admin.name, admin.take, post.pitch, post.discard.
import { computed } from "vue"
import * as controller from "../../js/PAPcontroller"
import { INGREDIENTS, PAPERWORK } from "../../js/engine/cards.js"
import { availableHype, handLimit } from "../../js/engine/state.js"
import { ICONS } from "../board/icons.js"
import ArtIcon from "../board/ArtIcon.vue"
import TokenPip from "../board/TokenPip.vue"
import CostRow from "./CostRow.vue"

const props = defineProps({ prompt: Object, state: Object })
const me = computed(() => props.prompt.seat)
const player = computed(() => props.state.players[me.value])
const rivals = computed(() => props.state.players.filter(p => p.seat !== me.value))
// admin.take: the rival takes one ingredient from the administered player.
const from = computed(() => props.state.players[props.prompt.data.from])
</script>

<template>
	<div>
		<template v-if="prompt.step === 'admin.name'">
			<div class="pp-row">
				<button v-for="r in rivals" :key="r.seat" class="pp-btn" @click="controller.act({ type: 'nameRival', seat: r.seat })">
					<ArtIcon :name="ICONS.administration.art" :size="18" :label="ICONS.administration.label" /> {{ r.name }}
				</button>
			</div>
		</template>

		<template v-else-if="prompt.step === 'admin.take'">
			<div class="pp-row">
				<button
					v-for="k in INGREDIENTS"
					:key="k"
					class="pp-btn"
					:disabled="from.ingredients[k] < 1"
					:title="'Take one ' + ICONS.ingredient(k).label"
					@click="controller.act({ type: 'takeIngredient', kind: k })"
				>
					<ArtIcon :name="k" :size="18" :label="ICONS.ingredient(k).label" />
					<small>{{ from.name }} holds {{ from.ingredients[k] }}</small>
				</button>
			</div>
		</template>

		<template v-else-if="prompt.step === 'post.pitch'">
			<p class="pp-row"><TokenPip :icon="ICONS.hype.art" :value="availableHype(player)" :label="'Hype available'" /></p>
			<div class="pp-row">
				<button v-for="r in rivals" :key="r.seat" class="pp-btn" :disabled="availableHype(player) < 1" @click="controller.act({ type: 'poisonPitch', seat: r.seat })">
					Block {{ r.name }} <CostRow :cost="{ hype: 1 }" />
				</button>
				<button class="pp-btn" @click="controller.act({ type: 'pass' })">Pass</button>
			</div>
		</template>

		<template v-else-if="prompt.step === 'post.discard'">
			<p class="pp-note">Hand {{ player.hand.length }} of {{ handLimit(player) }}.</p>
			<div class="pp-row">
				<button v-for="(card, i) in player.hand" :key="i" class="pp-btn" :title="'Discard ' + PAPERWORK[card].name + ': ' + PAPERWORK[card].text" @click="controller.act({ type: 'discard', card })">
					<ArtIcon :name="ICONS.paper(card).art" :size="22" :label="ICONS.paper(card).label" /> Discard
				</button>
			</div>
		</template>
	</div>
</template>
