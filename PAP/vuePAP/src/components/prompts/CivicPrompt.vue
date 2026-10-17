<script setup>
// post.review, post.rally, post.council, post.bylaw: the Permit Office.
import { computed } from "vue"
import * as controller from "../../js/PAPcontroller"
import { CHARTERS, RECIPES } from "../../js/engine/cards.js"
import { availableHype, potionStars } from "../../js/engine/state.js"
import { ICONS } from "../board/icons.js"
import ArtIcon from "../board/ArtIcon.vue"
import TokenPip from "../board/TokenPip.vue"
import CostRow from "./CostRow.vue"
import { venueName } from "./shared.js"

const props = defineProps({ prompt: Object, state: Object })
const me = computed(() => props.prompt.seat)
const player = computed(() => props.state.players[me.value])
const review = computed(() => props.state.council.review)
const frozen = computed(() => !!review.value && review.value.frozen === me.value)
const freeSlot = computed(() => !!review.value && review.value.caller === me.value && review.value.callerSpent)

// A Charter target as icons: the good (one icon per unit), a Hype pledge, or a potion of some stars.
const targetCost = t => (t.type === "ingredient" ? { [t.kind]: 1 } : t.type === "crownPledge" ? { hype: t.hype } : null)

// What this seat can put in: the good the Charter asks for, one entry per choice.
function goodOptions(c) {
	const t = CHARTERS[c.charterId].target
	if (freeSlot.value) return [{ good: undefined, label: "Use your Review slot", cost: {}, ok: true }]
	if (t.type === "ingredient") return [{ good: t.kind, label: "", cost: { [t.kind]: 1 }, ok: player.value.ingredients[t.kind] > 0 }]
	if (t.type === "recipeClass") {
		return player.value.potions.filter(pot => potionStars(pot) === t.stars).map(pot => ({ good: pot.id, label: RECIPES[pot.recipe].name, cost: {}, ok: true }))
	}
	return [{ good: undefined, label: "", cost: { hype: t.hype }, ok: availableHype(player.value) >= t.hype }]
}

const open = computed(() =>
	props.state.council.open.map((c, idx) => ({
		idx,
		c,
		card: CHARTERS[c.charterId],
		boone: props.state.venues.find(v => v.id === c.venue)?.boone,
		contributed: c.contributedBy.includes(me.value),
		options: goodOptions(c),
	})),
)

const blocked = (o, opt) => frozen.value || o.boone || o.contributed || !opt.ok
</script>

<template>
	<div>
		<template v-if="prompt.step === 'post.review'">
			<div class="pp-row">
				<button class="pp-btn primary" title="Spends your first Council contribution" @click="controller.act({ type: 'callReview' })">
					<ArtIcon :name="ICONS.review.art" :size="18" :label="ICONS.review.label" /> Call a Public Review
				</button>
				<button class="pp-btn" @click="controller.act({ type: 'pass' })">Pass</button>
			</div>
		</template>

		<template v-else-if="prompt.step === 'post.rally'">
			<div class="pp-row">
				<button class="pp-btn primary" title="Extends the Public Review by one Council opportunity" @click="controller.act({ type: 'rally' })">
					<ArtIcon :name="ICONS.review.art" :size="18" :label="ICONS.review.label" /> Rally
				</button>
				<button class="pp-btn" @click="controller.act({ type: 'pass' })">Pass</button>
			</div>
		</template>

		<template v-else-if="prompt.step === 'post.council'">
			<p v-if="frozen" class="pp-warn">
				<ArtIcon :name="ICONS.review.art" :size="16" :label="ICONS.review.label" /> Frozen out of Council this Year.
			</p>
			<div v-for="o in open" :key="o.idx" class="pp-section">
				<h4 :title="o.card.text">
					{{ o.card.name }} <small>at {{ venueName(o.c.venue) }}</small>
				</h4>
				<p class="pp-row">
					<span v-if="o.card.target.type === 'recipeClass'" class="pp-cost">
						<ArtIcon :name="ICONS.kettleSlot.art" :size="18" :label="ICONS.kettleSlot.label" />
						{{ "★".repeat(o.card.target.stars) }} potion
					</span>
					<CostRow v-else :cost="targetCost(o.card.target)" />
					<span>Progress {{ o.c.progress }}/{{ o.card.threshold }}</span>
					<span v-if="o.boone" class="pp-warn">Paused by a Boone</span>
					<span v-else-if="o.contributed" class="pp-note">You contributed</span>
				</p>
				<p v-if="!o.boone && !o.contributed && !o.options.length" class="pp-note">No {{ o.card.target.stars }}-star potion to contribute.</p>
				<div class="pp-row">
					<button
						v-for="opt in o.options"
						:key="String(opt.good) + opt.label"
						class="pp-btn"
						:disabled="blocked(o, opt)"
						@click="controller.act({ type: 'contribute', charterIdx: o.idx, good: opt.good })"
					>
						<template v-if="opt.label">
							<ArtIcon v-if="opt.good !== undefined" :name="ICONS.kettleSlot.art" :size="18" :label="ICONS.kettleSlot.label" />
							{{ opt.label }}
						</template>
						<CostRow v-else :cost="opt.cost" />
					</button>
				</div>
			</div>
			<p v-if="!open.length" class="pp-note">No Charters are open.</p>
			<p>
				<button class="pp-btn primary" @click="controller.act({ type: 'done' })">Finish Council</button>
			</p>
		</template>

		<template v-else-if="prompt.step === 'post.bylaw'">
			<p class="pp-row">
				Your votes
				<TokenPip :icon="ICONS.seal.art" :value="player.seals.length" :label="'Votes: one per Founder\'s Seal'" />
			</p>
			<div v-for="id in prompt.data.candidates" :key="id" class="pp-section">
				<h4 :title="CHARTERS[id].text">{{ CHARTERS[id].name }} <small>at {{ venueName(CHARTERS[id].venue) }}</small></h4>
				<button class="pp-btn primary" @click="controller.act({ type: 'vote', candidate: id })">Vote for this Charter</button>
			</div>
		</template>
	</div>
</template>
