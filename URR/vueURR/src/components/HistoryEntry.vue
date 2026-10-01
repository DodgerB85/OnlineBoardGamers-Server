<script setup>
import * as rf from "../js/URRreference"

const props = defineProps({
	entry: { type: Array, required: true },
	index: { type: Number, required: true },
})

function eventText(event) {
	if (event === rf.HIST_NEW_GAME) return "New game created"
	if (event === rf.HIST_END_TURN) return "Ended turn"
	if (event === rf.HIST_GAME_END) return "Game ended"
	if (event === rf.HIST_ACTION) {
		const action = props.entry[3]
		if (!action) return "Played a move"
		const labels = { buyNation: `Bought ${rf.NATION_NAMES[action.nation]}`, bidNation: `Bid ${action.amount} SPL for a nation`, tradeLand: "Traded land", bidPrimogeniture: `Bid ${action.amount} SPL for primogeniture`, pass: "Passed", dig: "Dug a canal", digEridu: "Dug with Eridu", buyCard: `Hired a ${action.kind}`, requestWaterwork: `Requested a ${action.kind}`, offerNation: `Offered ${action.amount} SPL for ${rf.NATION_NAMES[action.nation]}`, respondOffer: action.accept ? "Accepted an offer" : "Declined an offer", endDevelopment: "Ended state development", beginDevelopment: "Started state development", resolveMaintenance: "Resolved canal maintenance", exchangeBarahshum: "Exchanged Barahshum for a canal", exchangeCalah: "Exchanged Calah for a waterwork", allocateWater: "Routed water", harvest: action.choice === "store" ? "Stored harvest" : "Distributed harvest" }
		return labels[action.type] || action.type
	}
	return "Event " + event
}
</script>

<template>
	<div class="historyEntry">
		<span class="event">{{ eventText(entry[0]) }}</span>
		<span class="playerIndex" v-if="entry[1] >= 0">(seat {{ entry[1] }})</span>
	</div>
</template>

<style scoped>
.historyEntry {
	border-bottom: 1px solid #bbb;
	padding: 3px 6px;
	font-size: 14px;
	text-align: left;
}
.event { font-weight: bold; }
.playerIndex { color: #666; margin-left: 6px; }
</style>
