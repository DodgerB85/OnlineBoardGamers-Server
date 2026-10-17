<script setup>
import { computed } from "vue"
import { activeSeat } from "../../js/engine/index.js"
import { SCARES, YEARS } from "../../js/engine/cards.js"
import { useModelStore } from "../../stores/PAPstore.js"
import { usePersonalStore } from "../../stores/PAPpersonal.js"
import ArtIcon from "./ArtIcon.vue"
import { ICONS } from "./icons.js"
import VenueRow from "./VenueRow.vue"
import CouncilPanel from "./CouncilPanel.vue"
import MarketPanel from "./MarketPanel.vue"
import PlayerShop from "./PlayerShop.vue"

// The four phases of a Year, in order. Post and Shift are the Morning; the High Street is the sale; Audit closes the Year.
const TRACK = [
	["post", "Morning Post"],
	["shift", "Morning Shift"],
	["street", "High Street"],
	["audit", "Audit"],
]

const store = useModelStore()
const personal = usePersonalStore()
const s = computed(() => store.viewGame)

const scare = computed(() => (s.value && s.value.yearFx.scare ? SCARES[s.value.yearFx.scare] : null))
const turnSeat = computed(() => (s.value ? activeSeat(s.value) : null))
const turnName = computed(() => (turnSeat.value === null ? "" : s.value.players[turnSeat.value].name))
const nameOf = seat => (seat === null ? "" : s.value.players[seat].name)

function passed(key) {
	return TRACK.findIndex(step => step[0] === key) < TRACK.findIndex(step => step[0] === s.value.phase)
}

// The viewer's own shop first (spectators have no seat), then rivals in turn order.
const shopSeats = computed(() => {
	const own = s.value.players[personal.pov] ? [personal.pov] : []
	return [...own, ...s.value.order.filter(seat => seat !== personal.pov)]
})
</script>

<template>
	<div v-if="s" class="gameBoard">
		<header class="boardHeader">
			<span class="year">Year {{ s.year }} of {{ YEARS }}</span>
			<ol v-if="s.phase !== 'over'" class="track" aria-label="Phase of the Year">
				<li v-for="step in TRACK" :key="step[0]" :class="{ on: s.phase === step[0], done: passed(step[0]) }" :aria-current="s.phase === step[0] ? 'step' : null">
					{{ step[1] }}
				</li>
			</ol>
			<span v-else class="phase">Game over</span>
			<span v-if="scare" class="scare"><ArtIcon :name="ICONS.scare.art" :size="20" :label="ICONS.scare.label" /> <strong>{{ scare.name }}</strong> {{ scare.text }}</span>
			<span class="markers">
				<span v-if="s.first !== null" class="marker"><ArtIcon :name="ICONS.firstPlayer.art" :size="18" :label="ICONS.firstPlayer.label" /> {{ nameOf(s.first) }}</span>
				<span v-if="s.watch !== null" class="marker"><ArtIcon :name="ICONS.watch.art" :size="18" :label="ICONS.watch.label" /> {{ nameOf(s.watch) }}</span>
				<span v-if="s.administered !== null" class="marker"><ArtIcon :name="ICONS.administration.art" :size="18" :label="ICONS.administration.label" /> {{ nameOf(s.administered) }}</span>
			</span>
			<span v-if="s.phase !== 'over'" class="turn">Turn: <strong :class="{ glow: turnSeat !== null }">{{ turnName }}</strong></span>
		</header>

		<VenueRow />

		<div class="columns">
			<CouncilPanel />
			<MarketPanel />
		</div>

		<div class="shops">
			<PlayerShop v-for="seat in shopSeats" :key="seat" :seat="seat" :active="seat === turnSeat" />
		</div>
	</div>
</template>

<style scoped>
.gameBoard {
	margin: 0 auto;
	padding: 0 8px;
	box-sizing: border-box;
	font-size: 14px;
}
.boardHeader {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: center;
	gap: 6px 16px;
	padding: 8px 10px;
	border: 1px solid #888;
	border-radius: 6px;
	background-color: #fff;
}
.year,
.phase {
	font-size: 18px;
	font-weight: bold;
}
.track {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin: 0;
	padding: 0;
	list-style: none;
}
.track li {
	border: 1px solid #aaa;
	border-radius: 12px;
	padding: 2px 10px;
	color: #888;
	font-size: 13px;
}
.track li.done {
	color: #555;
	border-color: #999;
}
.track li.on {
	background-color: #2b2233;
	border-color: #2b2233;
	color: #fff;
	font-weight: bold;
}
.scare {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	max-width: 100%;
	color: #8a2a2a;
}
.markers {
	display: inline-flex;
	flex-wrap: wrap;
	gap: 8px;
}
.marker {
	display: inline-flex;
	align-items: center;
	gap: 3px;
}
.glow {
	padding: 0 4px;
	border-radius: 4px;
	box-shadow: 0 0 8px 2px #f5c77e;
}
.columns {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 8px 0;
}
.shops {
	display: flex;
	flex-wrap: wrap;
	gap: 0;
}
.shops > * {
	flex: 1 1 480px;
	min-width: 0;
}
</style>
