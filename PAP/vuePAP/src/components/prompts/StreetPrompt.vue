<script setup>
// street.solo, street.commit, street.extraSale, street.reoffer: the High Street.
import { computed, reactive, ref } from "vue"
import * as controller from "../../js/PAPcontroller"
import { CUSTOMERS, DISPENSATIONS, RECIPES } from "../../js/engine/cards.js"
import { availableHype, kettleCapacity, potionPreference, qualifyingPotions, venueInfo } from "../../js/engine/state.js"
import { saleRisks } from "../../js/PAPhints.js"
import { ICONS, MOODS } from "../board/icons.js"
import ArtIcon from "../board/ArtIcon.vue"
import TokenPip from "../board/TokenPip.vue"
import CostRow from "./CostRow.vue"
import RiskList from "./RiskList.vue"
import { venueName, wantsText } from "./shared.js"

const props = defineProps({ prompt: Object, state: Object })
const me = computed(() => props.prompt.seat)
const p = computed(() => props.state.players[me.value])
const hype = computed(() => availableHype(p.value))
const rivals = computed(() => props.state.players.filter(x => x.seat !== me.value))
const venueById = id => props.state.venues.find(v => v.id === id)
const potsAt = (venueId, ignoreWants = false) => qualifyingPotions(props.state, me.value, venueId, { ignoreWants })
const risks = (potionId, venueId) => saleRisks(props.state, me.value, potionId, venueId)
const potName = pot => RECIPES[pot.recipe].name
// Potion label: name, stars, potency and poison (own potions only).
const potText = pot => `${potName(pot)} ${"★".repeat(RECIPES[pot.recipe].stars)} · potency ${pot.potency}` + (pot.poison ? ` · poison ${pot.poison}` : "")
// Preference tie-break 1 (street.js prefMatch): a customer with no Preference is matched by anything.
const prefOk = (pot, cust) => !cust.preference || potionPreference(pot) === cust.preference

// T10 lets one potion ignore Wants at one venue, once per Year.
const t10Owned = computed(() => p.value.testimonials.includes("T10") && p.value.usedOnce.t10 !== props.state.year)
const useT10 = ref(false)

// street.solo
const soloVenues = computed(() =>
	props.state.venues
		.filter(v => {
			const eligible = props.state.street.eligible[v.id]
			return eligible.length === 1 && eligible[0] === me.value && props.state.street.served[v.id] === undefined
		})
		.map(v => ({ v, pots: potsAt(v.id, useT10.value) })),
)

// street.commit: the venue comes from the prompt; the bid is sealed, so only this seat's own choices are shown.
const venueId = computed(() => props.prompt.data.venue)
const v = computed(() => venueById(venueId.value))
const info = computed(() => venueInfo(venueId.value))
const cust = computed(() => CUSTOMERS[v.value.customer])
const eligibleRivals = computed(() => props.state.street.eligible[venueId.value].filter(seat => seat !== me.value).length)
const bid = reactive({ potionId: "", price: info.value?.anchor || 1, hype: 0, bribe: false, adminEdge: false })
const bribeOk = computed(() => p.value.cash >= 2)
const edgeOk = computed(() => props.state.administered !== null && props.state.administered !== me.value && props.state.exchange.eligible.includes(props.state.administered))
const edgeName = computed(() => props.state.players[props.state.administered]?.name)
const pots = computed(() => potsAt(venueId.value, useT10.value))
// The first qualifying potion is the default, so the score preview shows as soon as the form loads.
const picked = computed(() => pots.value.find(x => x.id === bid.potionId) || pots.value[0])
// Your own Customer Score for this bid. The edge only lands if the administered player also bids here (R51).
const preview = computed(() => {
	if (!picked.value) return null
	const potency = picked.value.potency * (picked.value.disp === "bansheesBlessing" && v.value.mood === "panicked" ? 2 : 1)
	return potency + bid.hype + (bid.bribe ? 2 : 0) + (bid.adminEdge ? 1 : 0) - bid.price
})
const bidOk = computed(() => !!picked.value && bid.price >= 1 && bid.price <= info.value.anchor && bid.hype >= 0 && bid.hype <= hype.value && p.value.cash >= (bid.bribe ? 2 : 0) + (bid.adminEdge ? 1 : 0))
// Why the bid is off, one line. The sliders already keep price and Hype in range.
const bidWhy = computed(() => (!picked.value ? "None of your potions meets the Wants or Tier here: choose a potion" : "Not enough Crowns for the Bribe and edge"))
function submit() {
	controller.act({ type: "commit", potionId: picked.value.id, price: bid.price, hype: bid.hype, bribe: bid.bribe, adminEdge: bid.adminEdge, useT10: useT10.value })
}

// street.extraSale: franchise picks any venue that already sold; desperate and boone use the prompt's venue.
const slot = computed(() => props.prompt.data.slot)
const desperateLeft = computed(() => kettleCapacity(p.value) - p.value.desperateVolume)
const slotIcon = computed(() => (slot.value === "boone" ? ICONS.boone : slot.value === "franchise" ? ICONS.franchise : null))
const slotTitle = computed(
	() =>
		({
			desperate: `Desperate customer: sell more units at Anchor, up to your Kettle capacity (${desperateLeft.value} left this Phase).`,
			boone: "Civic Boone: one extra sale at this venue, at Anchor.",
			franchise: "Franchise: a second till at a venue that already sold this High Street, at Anchor.",
		})[slot.value],
)
const extraChoices = computed(() => {
	const list = slot.value === "franchise" ? props.state.venues.filter(x => props.state.street.served[x.id] !== undefined && !props.state.street.extraUsed[x.id]) : [v.value]
	return list.map(x => ({ id: x.id, name: venueName(x.id), anchor: venueInfo(x.id).anchor, pots: potsAt(x.id) }))
})
function sellExtra(c, pot) {
	controller.act(slot.value === "franchise" ? { type: "sell", potionId: pot.id, venue: c.id } : { type: "sell", potionId: pot.id })
}

// street.reoffer: the potion that lost an exchange, and the unserved customers it fits.
const fromVenue = computed(() => props.prompt.data.venue)
const reofferPotion = computed(() => p.value.potions.find(x => x.id === props.prompt.data.potionId))
const reofferTargets = computed(() =>
	props.state.venues.filter(x => x.id !== fromVenue.value && props.state.street.served[x.id] === undefined && potsAt(x.id).some(pot => pot.id === props.prompt.data.potionId)),
)
</script>

<template>
	<div>
		<template v-if="prompt.step === 'street.solo'">
			<div class="pp-section">
				<h4>Sell to a customer only you can serve</h4>
				<p v-if="t10Owned" class="pp-note">
					<label :title="'Ignore the customer\'s Wants here, once per Year. The Tier still applies.'"><input v-model="useT10" type="checkbox" /> Use T10</label>
				</p>
				<div v-for="x in soloVenues" :key="x.v.id" class="pp-row">
					<strong>{{ venueName(x.v.id) }}</strong>
					<span class="pp-note">wants {{ wantsText(x.v.customer) }}</span>
					<TokenPip :icon="ICONS.anchor.art" :value="venueInfo(x.v.id).anchor" :label="ICONS.anchor.label" />
					<button v-for="pot in x.pots" :key="pot.id" class="pp-btn" @click="controller.act({ type: 'soloSale', venue: x.v.id, potionId: pot.id, useT10 })">
						{{ potText(pot) }}
						<RiskList v-if="risks(pot.id, x.v.id).length" :risks="risks(pot.id, x.v.id)" />
					</button>
					<span v-if="!x.pots.length" class="pp-note">None of your potions qualify.</span>
				</div>
				<p v-if="!soloVenues.length" class="pp-note">No customer is yours alone this High Street.</p>
			</div>

			<div class="pp-section">
				<h4>Dump a potion</h4>
				<p class="pp-row">
					<TokenPip :icon="ICONS.cash.art" :value="'+' + (p.testimonials.includes('T8') ? 2 : 1)" :label="ICONS.cash.label" />
					<TokenPip :icon="ICONS.reputation.art" value="-1" :label="ICONS.reputation.label" />
				</p>
				<div class="pp-row">
					<button v-for="pot in p.potions" :key="pot.id" class="pp-btn" @click="controller.act({ type: 'dump', potionId: pot.id })">{{ potText(pot) }}</button>
					<span v-if="!p.potions.length" class="pp-note">You hold no potions.</span>
				</div>
			</div>

			<div class="pp-section">
				<h4>Sabotage a rival's potion <CostRow :cost="{ hype: 2 }" /></h4>
				<p v-if="!p.hand.includes('sabotage')" class="pp-note">
					<ArtIcon :name="ICONS.paper('sabotage').art" :size="16" :label="ICONS.paper('sabotage').label" /> You hold no Sabotage Order.
				</p>
				<div v-for="r in rivals" :key="r.seat" class="pp-row">
					<strong>{{ r.name }}:</strong>
					<button
						v-for="pot in r.potions"
						:key="pot.id"
						class="pp-btn"
						:disabled="!p.hand.includes('sabotage') || hype < 2"
						@click="controller.act({ type: 'sabotage', targetSeat: r.seat, potionId: pot.id })"
					>
						{{ RECIPES[pot.recipe].name }}
						<small v-if="pot.fireWard">Fire-Ward up</small>
					</button>
					<span v-if="!r.potions.length" class="pp-note">No potions.</span>
				</div>
			</div>

			<div class="pp-section">
				<h4>Fire-Ward a potion <CostRow :cost="{ reputation: 2 }" /></h4>
				<p class="pp-note" title="This potion cannot be sabotaged for the rest of this High Street">Blocks Sabotage on one of your potions.</p>
				<div class="pp-row">
					<button v-for="pot in p.potions" :key="pot.id" class="pp-btn" :disabled="pot.fireWard || p.reputation < 2" @click="controller.act({ type: 'fireWard', potionId: pot.id })">
						{{ potText(pot) }}
						<small v-if="pot.fireWard">Warded</small>
					</button>
				</div>
			</div>

			<p>
				<button class="pp-btn primary" @click="controller.act({ type: 'done' })">Done</button>
			</p>
		</template>

		<template v-else-if="prompt.step === 'street.commit'">
			<p class="pp-row">
				<strong>{{ venueName(venueId) }}</strong>
				<span class="pp-note">wants {{ wantsText(v.customer) }}</span>
				<TokenPip :icon="ICONS.anchor.art" :value="info.anchor" :label="ICONS.anchor.label" />
				<span class="pp-note">{{ eligibleRivals }} rival{{ eligibleRivals === 1 ? "" : "s" }} eligible here</span>
				<span v-if="cust.preference" class="pp-row" :title="'Preference: ' + DISPENSATIONS[cust.preference].text + '. Wins ties in the bid.'">
					<ArtIcon :name="ICONS.preference.art" :size="16" :label="ICONS.preference.label" />
					{{ DISPENSATIONS[cust.preference].name }}
				</span>
			</p>
			<div class="pp-row">
				<button v-for="pot in pots" :key="pot.id" class="pp-btn" :class="{ sel: picked?.id === pot.id }" @click="bid.potionId = pot.id">
					{{ potText(pot) }}
					<span v-if="cust.preference" :class="prefOk(pot, cust) ? 'pp-ok' : 'pp-warn'">{{ prefOk(pot, cust) ? "✓" : "✗" }} Preference</span>
					<RiskList v-if="risks(pot.id, venueId).length" :risks="risks(pot.id, venueId)" />
				</button>
				<span v-if="!pots.length" class="pp-warn">None of your potions meets the Wants or Tier here.</span>
				<label v-if="t10Owned" class="pp-field" title="The Tier still applies">
					<input v-model="useT10" type="checkbox" /> Use T10: ignore the customer's Wants here (once per Year)
				</label>
			</div>
			<div class="pp-row">
				<label class="pp-field">
					<ArtIcon :name="ICONS.cash.art" :size="18" :label="ICONS.cash.label" />
					Price: {{ bid.price }} Crowns (1–{{ info.anchor }}, the Anchor)
					<input v-model.number="bid.price" type="range" min="1" :max="info.anchor" step="1" />
				</label>
				<label v-if="hype > 0" class="pp-field">
					<ArtIcon :name="ICONS.hype.art" :size="18" :label="ICONS.hype.label" />
					Hype bid: {{ bid.hype }} (you have {{ hype }})
					<input v-model.number="bid.hype" type="range" min="0" :max="hype" step="1" />
				</label>
				<span v-else class="pp-note">No Hype to bid</span>
			</div>
			<div v-if="p.hand.includes('bribe') || edgeOk" class="pp-row">
				<label v-if="p.hand.includes('bribe')" class="pp-field" title="Bribe card: discarded when you bid">
					<input v-model="bid.bribe" type="checkbox" :disabled="!bribeOk" />
					<ArtIcon :name="ICONS.paper('bribe').art" :size="18" :label="ICONS.paper('bribe').label" />
					Use a Bribe card: your Hype counts +2 (costs 2 Crowns)
				</label>
				<label v-if="edgeOk" class="pp-field" title="Counts only if the administered player also bids here">
					<input v-model="bid.adminEdge" type="checkbox" :disabled="p.cash < 1" />
					<ArtIcon :name="ICONS.administration.art" :size="18" :label="ICONS.administration.label" />
					Use the administration edge: +1 if {{ edgeName }} also bids here (costs 1 Crown)
				</label>
			</div>
			<p class="pp-row">
				Your Customer Score if you win: potency + Hype{{ bid.bribe ? " + 2 Bribe" : "" }}{{ bid.adminEdge ? " + 1 edge" : "" }} − price =
				<strong>{{ preview === null ? "-" : preview }}</strong>
			</p>
			<div class="pp-row">
				<button class="pp-btn primary" :disabled="!bidOk" @click="submit">Submit sealed bid</button>
				<button class="pp-btn" @click="controller.act({ type: 'pass' })">Pass</button>
			</div>
			<p v-if="!bidOk" class="pp-why">{{ bidWhy }}</p>
		</template>

		<template v-else-if="prompt.step === 'street.extraSale'">
			<p class="pp-row" :title="slotTitle">
				<ArtIcon v-if="slotIcon" :name="slotIcon.art" :size="20" :label="slotIcon.label" />
				<span v-else :style="{ color: MOODS.desperate.colour }">{{ MOODS.desperate.shape }}</span>
				{{ slot === "desperate" ? "Desperate: up to " + desperateLeft + " more units at Anchor" : slot === "boone" ? "Extra sale at Anchor" : "Second till at Anchor" }}
			</p>
			<div v-for="c in extraChoices" :key="c.id" class="pp-row">
				<strong v-if="slot === 'franchise'">{{ c.name }}</strong>
				<TokenPip :icon="ICONS.anchor.art" :value="c.anchor" :label="ICONS.anchor.label" />
				<button v-for="pot in c.pots" :key="pot.id" class="pp-btn" @click="sellExtra(c, pot)">
					{{ potText(pot) }}
					<RiskList v-if="risks(pot.id, c.id).length" :risks="risks(pot.id, c.id)" />
				</button>
				<span v-if="!c.pots.length" class="pp-note">None of your potions qualify here.</span>
			</div>
			<p v-if="!extraChoices.length" class="pp-note">No venue is open for an extra sale.</p>
			<p>
				<button class="pp-btn" @click="controller.act({ type: 'pass' })">Pass</button>
			</p>
		</template>

		<template v-else-if="prompt.step === 'street.reoffer'">
			<p v-if="reofferPotion" class="pp-note">{{ potName(reofferPotion) }} lost an exchange at {{ venueName(fromVenue) }}. Re-offer at Anchor:</p>
			<div class="pp-row">
				<button v-for="x in reofferTargets" :key="x.id" class="pp-btn" @click="controller.act({ type: 'reoffer', venue: x.id, potionId: prompt.data.potionId })">
					{{ venueName(x.id) }}: {{ CUSTOMERS[x.customer].name }}
					<small>wants {{ wantsText(x.customer) }}</small>
					<TokenPip :icon="ICONS.anchor.art" :value="venueInfo(x.id).anchor" :label="ICONS.anchor.label" />
					<RiskList v-if="risks(prompt.data.potionId, x.id).length" :risks="risks(prompt.data.potionId, x.id)" />
				</button>
				<span v-if="!reofferTargets.length" class="pp-note">No unserved customer fits.</span>
			</div>
			<p>
				<button class="pp-btn" @click="controller.act({ type: 'pass' })">Pass</button>
			</p>
		</template>
	</div>
</template>
