<script setup>
// post.choices: the Morning Post actions a seat may take, in any order, then done.
import { computed } from "vue"
import * as controller from "../../js/PAPcontroller"
import { FRANCHISE, PAPERWORK, RECIPES, TESTIMONIALS, VENUES } from "../../js/engine/cards.js"
import { availableHype } from "../../js/engine/state.js"
import { ICONS } from "../board/icons.js"
import ArtIcon from "../board/ArtIcon.vue"
import TokenPip from "../board/TokenPip.vue"
import CostRow from "./CostRow.vue"
import { venueName } from "./shared.js"

const props = defineProps({ prompt: Object, state: Object })
const me = computed(() => props.prompt.seat)
const player = computed(() => props.state.players[me.value])
const hype = computed(() => availableHype(player.value))
const hand = computed(() => player.value.hand)
const has = card => hand.value.includes(card)

// Hidden when not possible: the Franchise needs the gap to the leader and the Crowns.
const franchiseOk = computed(() => {
	const leader = Math.max(...props.state.players.map(p => p.recognized))
	return !player.value.franchise && leader - player.value.recognized >= FRANCHISE.gap && player.value.cash >= FRANCHISE.cost
})

// Only a Panic this Year can be retargeted (R18), so the Bribe and retarget options need one.
const panic = computed(() => props.state.yearFx.panic)
const retargets = computed(() => VENUES.filter(v => v.id !== panic.value))

// Expose: rivals who sold at a venue last High Street (once per target venue per Year).
const exposes = computed(() => {
	const out = []
	for (const [venue, seats] of Object.entries(props.state.lastStreet.salesByVenue)) {
		for (const seat of [...new Set(seats)]) {
			if (seat === me.value || props.state.players[seat].usedOnce["expose:" + venue]) continue
			out.push({ seat, venue, name: props.state.players[seat].name })
		}
	}
	return out
})

const rivals = computed(() => props.state.players.filter(p => p.seat !== me.value))
const emptyVenues = computed(() => props.state.venues.filter(v => !v.customer))
</script>

<template>
	<div>
		<p class="pp-row">
			<TokenPip :icon="ICONS.hype.art" :value="hype" :label="'Hype available'" />
			<TokenPip :icon="ICONS.cash.art" :value="player.cash" :label="ICONS.cash.label" />
			<span v-if="!hand.length" class="pp-note">No Paperwork</span>
			<ArtIcon v-for="(card, i) in hand" :key="i" :name="ICONS.paper(card).art" :size="26" :label="ICONS.paper(card).label" :title="PAPERWORK[card].name" />
		</p>

		<div v-if="franchiseOk" class="pp-section">
			<button class="pp-btn" :title="'A second till and +' + FRANCHISE.premium + ' per sale'" @click="controller.act({ type: 'buyFranchise' })">
				<ArtIcon :name="ICONS.franchise.art" :size="18" :label="ICONS.franchise.label" /> Franchise <CostRow :cost="{ crowns: FRANCHISE.cost }" />
			</button>
		</div>

		<div v-if="exposes.length && hype >= 1" class="pp-section">
			<div class="pp-row">
				<button
					v-for="x in exposes"
					:key="x.seat + x.venue"
					class="pp-btn"
					:title="'Expose ' + x.name + ' at ' + venueName(x.venue) + '. Once per venue per Year.'"
					@click="controller.act({ type: 'expose', seat: x.seat, venue: x.venue })"
				>
					<ArtIcon :name="ICONS.tolerance.art" :size="18" :label="ICONS.tolerance.label" /> Expose {{ x.name }} at {{ venueName(x.venue) }}
					<CostRow :cost="{ hype: 1 }" />
				</button>
			</div>
		</div>

		<div v-if="has('backedFutures') && hype >= 2 && player.potions.some(x => !x.backedFutures)" class="pp-section">
			<div class="pp-row">
				<button
					v-for="pot in player.potions.filter(x => !x.backedFutures)"
					:key="pot.id"
					class="pp-btn"
					:title="PAPERWORK.backedFutures.text"
					@click="controller.act({ type: 'backedFutures', potionId: pot.id })"
				>
					<ArtIcon :name="ICONS.paper('backedFutures').art" :size="18" :label="ICONS.paper('backedFutures').label" /> Back {{ RECIPES[pot.recipe].name }}
					<CostRow :cost="{ lockHype: 2 }" />
				</button>
			</div>
		</div>

		<div v-if="has('bribe') && panic && player.cash >= 2" class="pp-section">
			<div class="pp-row">
				<button
					v-for="v in retargets"
					:key="v.id"
					class="pp-btn"
					:title="PAPERWORK.bribe.text"
					@click="controller.act({ type: 'bribeScare', venue: v.id })"
				>
					<ArtIcon :name="ICONS.paper('bribe').art" :size="18" :label="ICONS.paper('bribe').label" />
					<ArtIcon :name="ICONS.scare.art" :size="18" :label="ICONS.scare.label" /> to {{ v.name }}
					<CostRow :cost="{ crowns: 2 }" />
				</button>
			</div>
		</div>

		<div v-if="hype >= 2" class="pp-section">
			<p class="pp-row"><b>Pamphlet</b> <CostRow :cost="{ hype: 2 }" /></p>
			<div class="pp-row">
				<template v-if="panic">
					<button v-for="v in retargets" :key="'re' + v.id" class="pp-btn" :title="'Move this Year\'s Panic to ' + v.name" @click="controller.act({ type: 'pamphlet', mode: 'retarget', venue: v.id })">
						<ArtIcon :name="ICONS.scare.art" :size="18" :label="ICONS.scare.label" /> to {{ v.name }}
					</button>
				</template>
				<button
					v-for="r in rivals"
					:key="'rel' + r.seat"
					class="pp-btn"
					title="A rival's next sale this Year must pass a Reliability check"
					@click="controller.act({ type: 'pamphlet', mode: 'reliability', seat: r.seat })"
				>
					<ArtIcon :name="ICONS.tolerance.art" :size="18" :label="ICONS.tolerance.label" /> {{ r.name }}
				</button>
			</div>
		</div>

		<div v-if="hype >= 3 && state.decks.testimonialMarket.length" class="pp-section">
			<p class="pp-row"><b>Testimonial</b> <CostRow :cost="{ hype: 3 }" /></p>
			<div class="pp-row">
				<button
					v-for="id in state.decks.testimonialMarket"
					:key="id"
					class="pp-btn"
					:title="TESTIMONIALS[id].text"
					@click="controller.act({ type: 'plantTestimonial', testiId: id })"
				>
					<ArtIcon :name="ICONS.testimonial.art" :size="18" :label="ICONS.testimonial.label" /> {{ TESTIMONIALS[id].name }}
				</button>
			</div>
		</div>

		<div v-if="emptyVenues.length && hype >= 4" class="pp-section">
			<p class="pp-row"><b>Demonstration</b> <CostRow :cost="{ hype: 4 }" /></p>
			<div class="pp-row">
				<button v-for="v in emptyVenues" :key="v.id" class="pp-btn" title="Deal a customer into this empty venue now" @click="controller.act({ type: 'demonstration', venue: v.id })">
					<ArtIcon :name="ICONS.boone.art" :size="18" :label="ICONS.boone.label" /> {{ venueName(v.id) }}
				</button>
			</div>
		</div>

		<div v-if="has('inspection') && player.cash >= 1" class="pp-section">
			<div class="pp-row">
				<button
					v-for="r in rivals"
					:key="r.seat"
					class="pp-btn"
					:title="PAPERWORK.inspection.text"
					@click="controller.act({ type: 'inspection', seat: r.seat })"
				>
					<ArtIcon :name="ICONS.paper('inspection').art" :size="18" :label="ICONS.paper('inspection').label" /> Inspect {{ r.name }}
					<CostRow :cost="{ crowns: 1 }" />
				</button>
			</div>
		</div>

		<p>
			<button class="pp-btn primary" @click="controller.act({ type: 'done' })">Done</button>
		</p>
	</div>
</template>
