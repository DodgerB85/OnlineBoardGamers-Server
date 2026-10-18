<script setup>
import { computed } from "vue"
import { CUSTOMERS, DISPENSATIONS, INGREDIENT_INFO, RECIPES, SCARES } from "../../js/engine/cards.js"
import { venueInfo } from "../../js/engine/state.js"
import { venueAccess } from "../../js/PAPhints.js"
import { useModelStore } from "../../stores/PAPstore.js"
import { usePersonalStore } from "../../stores/PAPpersonal.js"
import ArtIcon from "./ArtIcon.vue"
import { ICONS, MOODS } from "./icons.js"
import TokenPip from "./TokenPip.vue"
import { seatColour } from "./shared.js"

const props = defineProps({
	venue: { type: Object, required: true },
})

const store = useModelStore()
const personal = usePersonalStore()
const s = computed(() => store.viewGame)
const phase = computed(() => s.value.phase)

const info = computed(() => venueInfo(props.venue.id))
// The venue's fixed economics as icon pips; the words live in the tooltips.
const stats = computed(() => [
	{ icon: ICONS.tier(info.value.tier).art, value: info.value.tier, label: "Needs Cauldron Tier " + info.value.tier + " to sell here" },
	{ icon: ICONS.anchor.art, value: info.value.anchor, label: "Anchor " + info.value.anchor + ": the most this customer pays" },
	{ icon: ICONS.overhead.art, value: info.value.overhead, label: "Serving overhead: each sale here costs " + info.value.overhead + " Crown" + (info.value.overhead > 1 ? "s" : "") },
	{ icon: ICONS.tolerance.art, value: info.value.tolerance, label: "Poison tolerance " + info.value.tolerance + ": more Poison markers is an over-tolerance sale (normally +3 Crowns net, or +1 with doubled Levies; Warning)" },
	{ icon: ICONS.founderCut.art, value: info.value.founderCut, label: "Founder's Cut: the Founder gains " + info.value.founderCut + " Hype per sale here while the Boone is live" },
])
const customer = computed(() => (props.venue.customer ? CUSTOMERS[props.venue.customer] : null))
const artName = computed(() => (info.value.overflow ? "venue-overflow" : "venue-" + props.venue.id))

// Eligibility is public. Risks reveal the viewer's own Poison, so they are read only when there is a viewer.
const viewer = computed(() => personal.pov >= 0 && !!s.value.players[personal.pov])
const access = computed(() => venueAccess(s.value, viewer.value ? personal.pov : s.value.order[0], props.venue.id))
const canServe = computed(() => viewer.value && access.value.potions.length > 0)
const sellers = computed(() => s.value.lastStreet.salesByVenue[props.venue.id] || [])
const riskText = computed(() => [...new Set(risks.value.map(r => r.text))].join(". "))
const risks = computed(() => (viewer.value && phase.value === "street" ? access.value.potions.flatMap(p => p.risks) : []))
const scared = computed(() => {
	const e = s.value.yearFx.scare ? SCARES[s.value.yearFx.scare].effect : null
	return !!e && (e.type === "panicAll" || (e.type === "panic" && e.venue === props.venue.id))
})

function wantsText(w) {
	if (w.type === "any") return "anything"
	if (w.type === "stars") return "★".repeat(w.min || w.exact) + "+"
	if (w.type === "recipes") return "Recipes: " + w.ids.map(id => RECIPES[id].name).join(", ")
	return INGREDIENT_INFO[w.kind].name + " potions"
}
</script>

<template>
	<div class="venueCard" :class="{ canServe: canServe && phase === 'street', scared, recede: phase !== 'street' }">
		<ArtIcon class="art" :name="artName" :size="240" />
		<div class="title">
			{{ info.name }}
			<span v-if="risks.length" class="risk" role="img" :title="riskText" :aria-label="riskText"><ArtIcon name="warning" :size="18" /></span>
		</div>
		<div class="stats">
			<TokenPip v-for="st in stats" :key="st.icon" :icon="st.icon" :value="st.value" :label="st.label" :size="18" />
		</div>
		<div v-if="phase === 'street' && access.eligibleSeats.length" class="dots" :title="access.contested ? 'Contested: a Pricing Exchange' : 'Solo: only one shop can serve'">
			<span v-for="seat in access.eligibleSeats" :key="seat" class="dot" :style="{ backgroundColor: seatColour(seat) }">{{ s.players[seat].name[0] }}</span>
			<span class="dotsLabel">{{ access.contested ? "Exchange" : "Solo" }}</span>
		</div>
		<div v-if="phase === 'post' && sellers.length" class="dots hot" :title="'Sold here last Year: ' + sellers.map(seat => s.players[seat].name).join(', ')">
			<span class="dotsLabel">Last Year</span>
			<span v-for="(seat, i) in sellers" :key="i" class="dot" :style="{ backgroundColor: seatColour(seat) }">{{ s.players[seat].name[0] }}</span>
		</div>
		<div class="badges">
			<span v-if="venue.boone" class="badge"><ArtIcon name="boone" :size="16" /> Civic Boone</span>
			<span v-if="typeof venue.founder === 'number'" class="badge"><ArtIcon name="seal" :size="16" /> Founder: {{ s.players[venue.founder].name }}</span>
		</div>
		<div v-if="customer" class="customer">
			<div class="customerName">
				{{ customer.name }}
				<span class="mood" :style="{ backgroundColor: MOODS[venue.mood].colour }" :title="MOODS[venue.mood].label"><span aria-hidden="true">{{ MOODS[venue.mood].shape }}</span> {{ venue.mood }}</span>
			</div>
			<div :title="customer.wants.type === 'stars' ? 'Potency ' + (customer.wants.min || customer.wants.exact) + ' or more' : null">Wants: {{ wantsText(customer.wants) }}</div>
			<div class="iconLine" :title="'Preference: ' + (customer.preference ? DISPENSATIONS[customer.preference].name : 'none') + ' (wins Pricing Exchange ties; at a Panicked venue a mismatch costs a Warning)'">
				<ArtIcon :name="ICONS.preference.art" :size="16" /> {{ customer.preference ? DISPENSATIONS[customer.preference].name : "—" }}
			</div>
			<div class="iconLine" :title="'Reward: you learn ' + RECIPES[customer.reward].name + ' when you satisfy this customer'">
				<ArtIcon :name="ICONS.reward.art" :size="16" /> {{ RECIPES[customer.reward].name }}
			</div>
		</div>
		<div v-else class="customer empty">No customer</div>
	</div>
</template>

<style scoped>
.venueCard {
	display: flex;
	flex-direction: column;
	gap: 4px;
	width: 240px;
	max-width: 100%;
	box-sizing: border-box;
	border: 2px solid #888;
	border-radius: 6px;
	padding: 6px;
	background-color: #fbf8ef;
	text-align: left;
	font-size: 13px;
}
.venueCard.canServe {
	border-color: green;
	box-shadow: 0 0 6px #6c6;
}
.venueCard.scared {
	border-color: #d84343;
	border-style: dashed;
}
.venueCard.recede {
	opacity: 0.7;
}
.art {
	width: 100%;
	border-radius: 4px;
}
.venueCard.recede .art {
	height: 64px;
	object-fit: cover;
	opacity: 0.4;
}
.title {
	font-weight: bold;
	font-size: 15px;
	display: flex;
	align-items: center;
	gap: 6px;
}
.stats {
	display: flex;
	flex-wrap: wrap;
	gap: 2px 8px;
	color: #444;
}
.dots {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px;
	font-size: 12px;
}
.dots.hot .dotsLabel {
	font-weight: bold;
}
.dot {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	border: 1px solid #2b2233;
	border-radius: 50%;
	color: #fff;
	font-size: 11px;
	font-weight: bold;
	text-shadow: 0 0 2px #000;
}
.dotsLabel {
	color: #444;
}
.badges {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}
.badge {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	border: 1px solid #996;
	border-radius: 10px;
	padding: 0 6px;
	background-color: #f3e9d2;
}
.customer {
	border-top: 1px dashed #999;
	padding-top: 4px;
}
.customer.empty {
	color: #777;
	font-style: italic;
}
.customerName {
	font-weight: bold;
}
.mood {
	font-size: 14px;
	text-transform: uppercase;
	white-space: nowrap;
	border-radius: 3px;
	padding: 0 4px;
	color: #111;
}
.mood span {
	font-size: 16px;
}
.iconLine {
	display: flex;
	align-items: center;
	gap: 4px;
}
</style>
