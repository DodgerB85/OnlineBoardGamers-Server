<script setup>
import ArtworkCard from "./ArtworkCard.vue"
import { timestampToString } from "../js/URRfuncs"
import StateLeadership from "./StateLeadership.vue"
import { computed } from "vue"
import * as rf from "../js/URRreference"
import { currentStateId, phaseStr, waterworkMeasure, getLeadershipChanges } from "../js/URRview"
import { getAutomaticAction, harvestAmount } from "../js/URRrules"
import { currentWaterFrame } from "../js/URRwater"
import { getPlayerMarkerImage, getStateOrderImage, getNationCardImage, getTerrainImage, getWaterworkImage, primogenitureImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const props = defineProps({ entry: { type: Array, required: true }, index: { type: Number, required: true }, newestFirst: { type: Boolean, default: true } })

function snapshot(entry) {
	if (!entry) return null
	try { return JSON.parse(entry[2]) } catch (error) { console.error("Unable to read URR history snapshot:", error); return null }
}
const after = computed(() => snapshot(props.entry))
const before = computed(() => snapshot(store.history[props.index - 1]) || after.value)
const player = computed(() => after.value?.players[props.entry[1]] || store.players[props.entry[1]])
const action = computed(() => props.entry[3])
const isAutomaticStep = computed(() => action.value && before.value && getAutomaticAction(before.value)?.type === action.value.type)
const isCurrentReplay = computed(() => store.viewSettings.showReplay && store.replayStep.index === props.index)
const stateId = computed(() => before.value ? currentStateId(before.value) : null)
const waterDestination = computed(() => action.value?.type === "allocateWater" ? before.value?.board.areas.find((area) => area.id === action.value.area) : null)
const eventArtwork = computed(() => {
	if (action.value?.type === "harvest" && stateId.value !== null) return { src: getStateOrderImage(stateId.value), alt: `${rf.STATE_NAMES[stateId.value]} harvest` }
	const area = waterDestination.value
	if (!area) return null
	const work = area.waterwork
	return work ? { src: getWaterworkImage(work.state, work.capacity), alt: `${rf.STATE_NAMES[work.state]} pump at ${area.label || area.id} · ${waterworkMeasure(work)}` } : { src: getTerrainImage(area.landType, area.isCity), alt: `${rf.LAND_NAMES[area.landType]}${area.isCity ? ' city' : ''} at ${area.label || area.id}` }
})
const balanceChanges = computed(() => {
	if (!action.value) return []
	const changes = []
	for (const [index, player] of (after.value?.players || []).entries()) {
		const privateBefore = before.value?.players[index]?.money
		if (privateBefore !== undefined && player.money !== privateBefore) changes.push({ src: getPlayerMarkerImage(index), label: `${player.displayName}: ${privateBefore} → ${player.money} SPL`, amount: player.money - privateBefore })
	}
	for (const state of after.value?.states || []) {
		const treasuryBefore = before.value?.states[state.id]?.money
		if (treasuryBefore !== undefined && state.money !== treasuryBefore) changes.push({ src: getStateOrderImage(state.id), label: `${rf.STATE_NAMES[state.id]} treasury: ${treasuryBefore} → ${state.money} SPL`, amount: state.money - treasuryBefore })
	}
	return changes
})
const nationAwards = computed(() => {
	if (before.value?.gameflow.phase !== rf.PHASE_DIVIDING_NATIONS || !action.value) return []
	return (after.value?.nations || []).filter((nation) => nation.ownerType === "player" && before.value.nations[nation.id].ownerType === null && !(action.value.type === "buyNation" && action.value.nation === nation.id)).map((nation) => {
		const price = action.value.type === "bidNation" && action.value.nation === nation.id ? action.value.amount : Math.max(0, ...before.value.nations[nation.id].bids.map((bid) => bid.amount))
		return { id: nation.id, owner: nation.owner, price }
	})
})
const leadershipChanges = computed(() => getLeadershipChanges(before.value, after.value))
const phaseHeading = computed(() => {
	if (props.entry.administration) return ""
	const flow = before.value?.gameflow
	const adjacentFlow = (props.newestFirst ? after.value?.gameflow : snapshot(store.history[props.index - 2])?.gameflow) || flow
	const isFirstVisible = props.newestFirst ? props.index === store.history.length - 1 : props.index === 0
	if (!flow || (!isFirstVisible && flow.turn === adjacentFlow?.turn && flow.phase === adjacentFlow?.phase)) return ""
	return `Turn ${flow.turn} · ${phaseStr(flow.phase)}`
})
function landLabel(id) { return before.value?.board.areas.find((area) => area.id === id)?.label || id }
function saleLabels(batches = []) { return batches.flat().map(landLabel).join(", ") }
const eventText = computed(() => {
	const event = props.entry[0]
	if (event === rf.HIST_NEW_GAME) return "Welcome to UR: 1830 BC!"
	if (event === rf.HIST_END_TURN) return "Ended turn"
	const move = action.value
	if (!move) return event === rf.HIST_GAME_END ? "Game ended" : "Played a move"
	const stateName = rf.STATE_NAMES[stateId.value] || "State"
	const waterSource = move.type === "allocateWater" ? currentWaterFrame(before.value)?.area : null
	const offer = before.value?.gameflow.pendingOffer?.action
	const offerDescription = offer?.type === "offerNation" ? `${rf.NATION_NAMES[offer.nation]} for ${offer.amount} SPL` : offer ? `${offer.kind} at ${landLabel(offer.area)}` : "an offer"
	let passDescription = "Passed"
	if (before.value?.gameflow.phase === rf.PHASE_DEVELOPMENT && before.value.gameflow.developmentStep === "eridu") passDescription = "Skipped Eridu digging"
	else if (before.value?.gameflow.auction) passDescription = `${isAutomaticStep.value ? `${player.value.displayName}: ` : ''}Withdrew from the ${rf.NATION_NAMES[before.value.gameflow.auction.nation]} auction${isAutomaticStep.value ? ` · cannot afford ${before.value.gameflow.auction.amount + 5} SPL` : ''}`
	const labels = {
		buyNation: `Bought ${rf.NATION_NAMES[move.nation]} for ${move.nation === rf.NATION_ASHUR ? before.value.gameflow.ashurPrice : rf.NATION_PRICES[move.nation]} SPL`,
		bidNation: `${before.value.gameflow.auction ? 'Bid' : 'Offered'} ${move.amount} SPL for ${rf.NATION_NAMES[move.nation]}`,
		tradeLand: [move.buy !== undefined ? `Bought ${landLabel(move.buy)}${move.exchangeDer ? " in exchange for Der" : ""}` : "", move.sellBefore?.length ? `Sold ${saleLabels(move.sellBefore)} before buying` : "", move.sellAfter?.length ? `Sold ${saleLabels(move.sellAfter)} after buying` : ""].filter(Boolean).join(" · "),
		bidPrimogeniture: `Bid ${move.amount} SPL for primogeniture`,
		pass: passDescription,
		dig: `${stateName}: dug ${move.path?.map(landLabel).join(" → ")}`,
		digEridu: `Eridu: dug ${move.path?.map(landLabel).join(" → ")}`,
		buyCard: `${stateName}: hired a digging crew`,
		requestWaterwork: `${stateName}: ${after.value?.gameflow.pendingOffer ? 'requested' : 'built'} a ${move.kind} at ${landLabel(move.area)}`,
		offerNation: after.value?.gameflow.pendingOffer ? `${stateName}: offered ${move.amount} SPL for ${rf.NATION_NAMES[move.nation]}` : `${stateName}: assimilated ${rf.NATION_NAMES[move.nation]} for ${move.amount} SPL`,
		respondOffer: `${move.accept ? 'Accepted' : 'Declined'} ${offerDescription}`,
		endDevelopment: `${stateName}: ended development${before.value?.states[stateId.value]?.diggers.length === 0 && after.value?.states[stateId.value]?.diggers.length > 0 ? " and hired the mandatory crew" : ""}`,
		beginDevelopment: after.value?.gameflow.phase === rf.PHASE_RAINY_SEASON || after.value?.gameflow.turn !== before.value?.gameflow.turn ? "Started the rainy season" : `Started ${rf.STATE_NAMES[after.value?.gameflow.stateOrder[after.value.gameflow.stateIndex]] || 'the next state'} development`,
		resolveMaintenance: after.value?.states[stateId.value]?.hasRevolted ? `${stateName}: declared a revolution` : `${stateName}: hired the mandatory crew${move.sales?.some((batch) => batch.length) ? ` by selling ${saleLabels(move.sales)}` : ''}`,
		exchangeBarahshum: `Exchanged Barahshum for a canal to ${landLabel(move.to)}`,
		exchangeCalah: `${stateName}: ${after.value?.gameflow.pendingOffer ? 'requested a Calah exchange for' : 'exchanged Calah for'} a ${move.kind} at ${landLabel(move.area)}`,
		allocateWater: waterDestination.value?.waterwork?.kind === "pump" ? `${stateName}: Sent ${move.amount ?? 1} water from ${landLabel(waterSource)} to ${landLabel(move.area)}` : `${stateName}: irrigated ${landLabel(move.area)} with one water from ${landLabel(waterSource)}`,
		advanceWater: "Continued automatic water flow",
		harvest: `${stateName}: ${move.choice === "store" ? "stored" : "distributed"} ${before.value ? harvestAmount(before.value, stateId.value) : ''} SPL harvest${move.remove ? ` · removed waterwork at ${landLabel(move.remove)}` : ''}`,
	}
	return labels[move.type] || move.type
})
const actionImages = computed(() => {
	const move = action.value
	if (!move) return []
	if (move.type === "digEridu") return [{ src: getNationCardImage(rf.NATION_ERIDU), alt: "Eridu", card: true }]
	if (move.type === "dig" && stateId.value !== null) {
		const crew = before.value?.states[stateId.value]?.diggers.find((crew) => crew.id === move.crew)
		return crew ? String(crew.capacity).split("+").map((capacity) => ({ src: getWaterworkImage(stateId.value, capacity), alt: `Digging crew: ${capacity} points` })) : []
	}
	if (move.type === "harvest" && move.choice === "store" && move.remove) {
		const work = before.value?.board.areas.find((area) => area.id === move.remove)?.waterwork
		return work ? [{ src: getWaterworkImage(work.state, work.capacity), alt: `Removed ${rf.STATE_NAMES[work.state]} ${work.kind} at ${landLabel(move.remove)} · ${waterworkMeasure(work)}` }] : []
	}
	if (move.type === "exchangeBarahshum") return [{ src: getNationCardImage(rf.NATION_BARAHSHUM), alt: "Barahshum", card: true }]
	if (move.type === "bidPrimogeniture") return [{ src: primogenitureImage, alt: "Primogeniture" }]
	if (move.type === "exchangeCalah") {
		const images = [{ src: getNationCardImage(rf.NATION_CALAH), alt: "Calah", card: true }]
		const work = after.value?.board.areas.find((area) => area.id === move.area)?.waterwork
		if (work && !after.value.gameflow.pendingOffer) images.push({ src: getWaterworkImage(work.state, work.capacity), alt: `Built ${rf.STATE_NAMES[work.state]} ${work.kind} at ${landLabel(move.area)} · ${waterworkMeasure(work)}` })
		return images
	}
	if (["endDevelopment", "resolveMaintenance"].includes(move.type) && stateId.value !== null && before.value?.states[stateId.value]?.diggers.length === 0 && after.value?.states[stateId.value]?.diggers.length > 0) {
		const crew = after.value.states[stateId.value].diggers[0]
		return String(crew.capacity).split("+").map((capacity) => ({ src: getWaterworkImage(stateId.value, capacity), alt: `Mandatory digging crew: ${capacity} points` }))
	}
	if (move.type === "respondOffer") {
		const offer = before.value?.gameflow.pendingOffer
		if (offer?.action.type === "offerNation") return [{ src: getNationCardImage(offer.action.nation), alt: rf.NATION_NAMES[offer.action.nation], card: true }]
		if (offer) {
			const capacity = after.value?.board.areas.find((area) => area.id === offer.action.area)?.waterwork?.capacity
			if (capacity !== undefined && move.accept) return [{ src: getWaterworkImage(offer.state, capacity), alt: `Accepted ${offer.action.kind} · ${waterworkMeasure({ kind: offer.action.kind, capacity })}` }]
		}
	}
	if (["buyNation", "bidNation", "offerNation"].includes(move.type)) return [...new Set([move.nation, ...nationAwards.value.map((award) => award.id)])].map((id) => ({ src: getNationCardImage(id), alt: rf.NATION_NAMES[id], card: true }))
	if (move.type === "pass" && nationAwards.value.length) return nationAwards.value.map((award) => ({ src: getNationCardImage(award.id), alt: rf.NATION_NAMES[award.id], card: true }))
	if (move.type === "tradeLand") {
		const ids = [move.buy, ...(move.sellBefore || []).flat(), ...(move.sellAfter || []).flat()].filter((id) => id !== undefined)
		const lands = ids.map((id) => before.value?.board.areas.find((area) => area.id === id)).filter(Boolean)
		const terrains = [...new Map(lands.map((area) => [`${area.landType}-${area.isCity}`, area])).values()]
		return terrains.map((area) => ({ src: getTerrainImage(area.landType, area.isCity), alt: `${rf.LAND_NAMES[area.landType]}${area.isCity ? ' city' : ''}` }))
	}
	if (["buyCard", "requestWaterwork"].includes(move.type) && stateId.value !== null) {
		const era = [1, 2, 3, 4].find((era) => before.value?.cardSupply[era] > 0) || 5
		const capacity = rf.ERA_CARD_DATA[era][move.kind][0]
		return String(capacity).split("+").map((capacity) => ({ src: getWaterworkImage(stateId.value, capacity), alt: move.kind === "digger" ? `${capacity}-point digging crew` : `${move.kind} · ${waterworkMeasure({ kind: move.kind, capacity })}` }))
	}
	return []
})
function jumpToEntry() {
	if (!store.viewSettings.showReplay) return
	store.replayStep.index = props.index
}
</script>

<template>
	<div class="historyGroup">
		<div v-if="phaseHeading" class="phaseHeading">{{ phaseHeading }}</div>
		<div class="log" :class="{ selectableHistory: store.viewSettings.showReplay, currentReplay: isCurrentReplay, automaticStep: isAutomaticStep }" :aria-current="isCurrentReplay ? 'step' : undefined" :role="store.viewSettings.showReplay ? 'button' : undefined" :tabindex="store.viewSettings.showReplay ? 0 : undefined" @click="jumpToEntry" @keydown.enter.prevent="jumpToEntry" @keydown.space.prevent="jumpToEntry">
			<div class="historyTimestamp">{{ entry[4] != null ? timestampToString(entry[4]) : 'Time not recorded' }}</div>
			<span v-if="isCurrentReplay" class="replayPosition">Current replay position</span>
			<template v-if="entry.administration">
				<div class="administrationHeading">{{ entry.administration.title }}</div>
				<p class="administrationExplanation">{{ entry.administration.text }}</p>
				<div class="administrationDetails" v-if="entry.administration.details.length">
					<div v-for="(detail, detailIndex) in entry.administration.details" :key="detailIndex">
						<img v-if="detail.player !== undefined" :src="getPlayerMarkerImage(detail.player)" alt="" />
						<img v-else-if="detail.state !== undefined" :src="getStateOrderImage(detail.state)" alt="" />
						<img v-else-if="detail.terrain !== undefined" :src="getTerrainImage(detail.terrain)" alt="" />
						<button v-if="detail.area" @click.stop="store.viewSettings.historyArea = detail.area" :aria-label="`Find ${detail.label} on the board`">{{ detail.label }}</button><span>{{ detail.text }}</span>
					</div>
				</div>
			</template>
			<div v-else-if="entry[0] === rf.HIST_NEW_GAME" class="new_turn">{{ eventText }}</div>
			<template v-else>
				<div class="header" v-if="player && !isAutomaticStep"><img :src="getPlayerMarkerImage(entry[1])" alt="" /><b>{{ player.displayName }}</b></div>
				<div class="eventDescription"><img v-if="eventArtwork" :src="eventArtwork.src" :alt="eventArtwork.alt" :title="eventArtwork.alt" /><span>{{ eventText }}</span></div>
				<div v-for="award in nationAwards" :key="award.id" class="nationAwardNotice"><img :src="getPlayerMarkerImage(award.owner)" alt="" /><span>{{ after.players[award.owner].displayName }} acquired {{ rf.NATION_NAMES[award.id] }} for {{ award.price }} SPL</span></div>
				<StateLeadership v-for="change in leadershipChanges" :key="change.id" :change="change" />
				<details class="balanceDetails" v-if="balanceChanges.length" @click.stop @keydown.enter.stop @keydown.space.stop><summary class="balanceChanges" aria-label="Show cash balances before and after"><span v-for="change in balanceChanges" :key="change.label" :title="change.label"><img :src="change.src" :alt="change.label" /><b>{{ change.amount > 0 ? '+' : '' }}{{ change.amount }} SPL</b></span></summary><div class="balanceBreakdown"><div v-for="change in balanceChanges" :key="change.label"><img :src="change.src" alt="" /><span>{{ change.label }}</span></div></div></details>
				<div class="actionImages" :class="{ multipleCards: actionImages.filter((asset) => asset.card).length > 1 }" v-if="actionImages.length"><template v-for="(asset, idx) in actionImages" :key="idx"><div v-if="asset.card" class="historyCard"><ArtworkCard :src="asset.src" :alt="asset.alt" /></div><img v-else :src="asset.src" :alt="asset.alt" :title="asset.alt" /></template></div>
				<div v-if="entry[0] === rf.HIST_GAME_END" class="new_turn">Game ended<template v-if="after?.gameflow.endReason === 'invasion'"> · The Southern Peoples invade</template><template v-else-if="after?.gameflow.endReason === 'revolution'"> · Revolution</template></div>
			</template>
		</div>
	</div>
</template>

<style scoped>
.log { margin: 5px; border: 1px solid black; padding: 5px; background-color: #d4eafd; text-align: left; font-size: 14px; line-height: 23px; }
.historyTimestamp { font-size: 12px; text-align: right; color: #53616a; }.administrationHeading { padding: 6px; background: #303030; color: white; text-align: center; font-weight: bold; }.administrationExplanation { margin: 8px 3px; }.administrationDetails { display: grid; gap: 5px; }.administrationDetails > div { display: flex; align-items: center; gap: 6px; padding: 4px; background: #edf6fd; }.administrationDetails img { width: 30px; height: 30px; flex-shrink: 0; }.administrationDetails span { min-width: 0; overflow-wrap: anywhere; }.administrationDetails button { flex-shrink: 0; min-height: 32px; padding: 4px 6px; border: 1px solid #177daf; border-radius: 3px; background: #fffdf4; font: inherit; cursor: pointer; }
.header { display: flex; align-items: center; gap: 5px; font-size: 13px; }.header b { min-width: 0; overflow-wrap: anywhere; }.header img { width: 23px; height: 23px; }
.new_turn, .phaseHeading { background: black; color: white; text-align: center; font-weight: bold; padding: 8px; }.phaseHeading { margin: 5px; font-size: 14px; }
.selectableHistory { cursor: pointer; }.selectableHistory:hover, .selectableHistory:focus-visible { border-color: #c79e00; outline: 1px solid #c79e00; }
.log.currentReplay { box-shadow: inset 3px 0 #177daf; background: #e5f3ff; }.replayPosition { display: block; color: #12628c; font-size: 12px; font-weight: bold; }
.actionImages { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }.actionImages img { width: 30px; height: 30px; object-fit: contain; }.historyCard { width: 185px; max-width: 100%; }
.actionImages.multipleCards .historyCard { width: calc((100% - 4px) / 2); max-width: 185px; }
.nationAwardNotice { display: flex; align-items: center; gap: 5px; margin-top: 4px; padding: 3px 6px; background: #edf6fd; border-left: 3px solid #177daf; font-size: 12px; }.nationAwardNotice img { width: 23px; height: 23px; flex-shrink: 0; }.nationAwardNotice span { min-width: 0; overflow-wrap: anywhere; }
.eventDescription { display: flex; align-items: center; gap: 6px; }.eventDescription img { width: 26px; height: 26px; object-fit: contain; flex-shrink: 0; }.eventDescription span { min-width: 0; overflow-wrap: anywhere; }
.balanceChanges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }.balanceChanges span { display: inline-flex; align-items: center; gap: 4px; padding: 2px 5px; background: #edf6fd; border: 1px solid #adc2d0; font-size: 12px; }.balanceChanges img { width: 22px; height: 22px; }
.balanceChanges { cursor: pointer; align-items: center; list-style: none; }.balanceChanges::-webkit-details-marker { display: none; }.balanceChanges::before { content: '▸'; font-size: 14px; }.balanceDetails[open] .balanceChanges::before { content: '▾'; }.balanceChanges:focus-visible { outline: 2px solid #177daf; outline-offset: 2px; }.balanceBreakdown { display: grid; gap: 3px; margin-top: 5px; padding: 5px; background: #edf6fd; font-size: 12px; }.balanceBreakdown > div { display: flex; align-items: center; gap: 5px; }.balanceBreakdown img { width: 22px; height: 22px; flex-shrink: 0; }.balanceBreakdown span { min-width: 0; overflow-wrap: anywhere; }
@media (max-width: 1050px) { .balanceChanges { min-height: 40px; } }
</style>
