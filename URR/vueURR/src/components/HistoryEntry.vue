<script setup>
import PlayerMarker from "./PlayerMarker.vue"
import ArtworkCard from "./ArtworkCard.vue"
import * as funcs from "../js/URRfuncs"
import StateLeadership from "./StateLeadership.vue"
import { computed, nextTick, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useWaterPlaybackStore } from "../stores/URRwaterPlayback.js"
import * as rf from "../js/URRreference"
import * as view from "../js/URRview"
import * as rules from "../js/URRrules"
import * as water from "../js/URRwater"
import * as assets from "../js/URRassets"
import { historyAction } from "../js/URRhistoryActions"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const { t } = useI18n()
const props = defineProps({ entry: { type: Array, required: true }, index: { type: Number, required: true }, newestFirst: { type: Boolean, default: true } })

const after = computed(() => store.historySnapshotAt(props.index))
const before = computed(() => store.historySnapshotAt(props.index - 1) || after.value)
const player = computed(() => after.value?.players[props.entry[1]] || store.players[props.entry[1]])
const action = computed(() => historyAction(props.entry))
const isAutomaticStep = computed(() => action.value && before.value && rules.getAutomaticAction(before.value)?.type === action.value.type)
const isCurrentReplay = computed(() => store.viewSettings.showReplay && store.replayStep.index === props.index)
const isGameEnd = computed(() => !props.entry.administration && props.entry[0] !== rf.HIST_NEW_GAME && after.value?.gameflow.phase === rf.PHASE_GAME_OVER)
const stateId = computed(() => before.value ? view.currentStateId(before.value) : null)
const waterDestination = computed(() => action.value?.type === "allocateWater" ? before.value?.board.areas.find((area) => area.id === action.value.area) : null)
const eventArtwork = computed(() => {
	if (action.value?.type === "harvest" && stateId.value !== null) return { src: assets.getStateOrderImage(stateId.value), alt: t("history.altHarvest", { state: rf.STATE_NAMES[stateId.value] }) }
	const area = waterDestination.value
	if (!area) return null
	const work = area.waterwork
	return work ? { src: assets.getWaterworkImage(work.state, work.capacity), alt: t("history.altPump", { state: rf.STATE_NAMES[work.state], area: area.label || area.id, measure: view.waterworkMeasure(work) }) } : { src: assets.getTerrainImage(area.landType, area.isCity), alt: t("history.altLand", { land: `${rf.LAND_NAMES[area.landType]}${area.isCity ? " " + t("common.city") : ""}`, area: area.label || area.id }) }
})
const balanceChanges = computed(() => {
	if (!action.value) return []
	const changes = []
	for (const [index, player] of (after.value?.players || []).entries()) {
		const privateBefore = before.value?.players[index]?.money
		if (privateBefore !== undefined && player.money !== privateBefore) changes.push({ src: assets.getPlayerMarkerImage(index), title: player.displayName, label: t("history.privateCashChange", { before: privateBefore, after: player.money }), amount: player.money - privateBefore })
	}
	for (const state of after.value?.states || []) {
		const treasuryBefore = before.value?.states[state.id]?.money
		if (treasuryBefore !== undefined && state.money !== treasuryBefore) changes.push({ src: assets.getStateOrderImage(state.id), label: t("history.stateTreasuryChange", { state: rf.STATE_NAMES[state.id], before: treasuryBefore, after: state.money }), amount: state.money - treasuryBefore })
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
const leadershipChanges = computed(() => view.getLeadershipChanges(before.value, after.value))
const phaseHeading = computed(() => {
	if (props.entry.administration) return ""
	const flow = before.value?.gameflow
	const adjacentFlow = (props.newestFirst ? after.value?.gameflow : store.historySnapshotAt(props.index - 2)?.gameflow) || flow
	const isFirstVisible = props.newestFirst ? props.index === store.history.length - 1 : props.index === 0
	if (!flow || (!isFirstVisible && flow.turn === adjacentFlow?.turn && flow.phase === adjacentFlow?.phase)) return ""
	return t("history.phaseHeading", { turn: flow.turn, phase: view.phaseStr(flow.phase) })
})
function landLabel(id) { return before.value?.board.areas.find((area) => area.id === id)?.label || id }
function saleLabels(batches = []) { return batches.flat().map(landLabel).join(", ") }
const eventText = computed(() => {
	const event = props.entry[0]
	if (event === rf.HIST_NEW_GAME) return t("history.welcome")
	if (event === rf.HIST_KICKOUT) return t("history.kickedOut")
	if (event === rf.HIST_RESIGN) return t("history.resigned")
	const move = action.value
	if (!move) return t("history.playedMove")
	const stateName = rf.STATE_NAMES[stateId.value] || t("history.stateFallback")
	const waterSource = move.type === "allocateWater" ? water.currentWaterFrame(before.value)?.area : null
	const offer = before.value?.gameflow.pendingOffer?.action
	const offerDescription = offer?.type === "offerNation" ? t("history.offerNation", { nation: rf.NATION_NAMES[offer.nation], amount: offer.amount }) : offer ? t("history.offerWork", { kind: offer.kind, area: landLabel(offer.area) }) : t("history.anOffer")
	let passDescription = t("history.passed")
	if (before.value?.gameflow.phase === rf.PHASE_DEVELOPMENT && before.value.gameflow.developmentStep === "eridu") passDescription = t("history.skippedEridu")
	else if (before.value?.gameflow.auction) passDescription = t("history.withdrewAuction", { nation: rf.NATION_NAMES[before.value.gameflow.auction.nation] }) + (isAutomaticStep.value ? t("history.cannotAfford", { amount: before.value.gameflow.auction.amount + 5 }) : "")
	const labels = {
		buyNation: t("history.boughtNation", { nation: rf.NATION_NAMES[move.nation], amount: move.nation === rf.NATION_ASHUR ? before.value.gameflow.ashurPrice : rf.NATION_PRICES[move.nation] }),
		bidNation: before.value.gameflow.auction ? t("history.bidNation", { amount: move.amount, nation: rf.NATION_NAMES[move.nation] }) : t("history.offeredNation", { amount: move.amount, nation: rf.NATION_NAMES[move.nation] }),
		tradeLand: [move.buy !== undefined ? t("history.boughtLand", { land: landLabel(move.buy) }) + (move.exchangeDer ? t("history.inExchangeDer") : "") : "", move.sellBefore?.length ? t("history.soldBefore", { lands: saleLabels(move.sellBefore) }) : "", move.sellAfter?.length ? t("history.soldAfter", { lands: saleLabels(move.sellAfter) }) : ""].filter(Boolean).join(" · "),
		bidPrimogeniture: t("history.bidPrimogeniture", { amount: move.amount }),
		pass: passDescription,
		dig: t("history.dug", { state: stateName, path: move.path?.map(landLabel).join(" → ") }),
		digEridu: t("history.dugEridu", { path: move.path?.map(landLabel).join(" → ") }),
		buyCard: t("history.hiredCrew", { state: stateName }),
		requestWaterwork: after.value?.gameflow.pendingOffer || after.value?.gameflow.waterworkRequests?.some((offer) => offer.action.area === move.area) ? t("history.requestedWork", { state: stateName, kind: view.kindName(move.kind), area: landLabel(move.area) }) : t("history.builtWork", { state: stateName, kind: view.kindName(move.kind), area: landLabel(move.area) }),
		offerNation: after.value?.gameflow.pendingOffer ? t("history.offeredNationState", { state: stateName, amount: move.amount, nation: rf.NATION_NAMES[move.nation] }) : t("history.assimilated", { state: stateName, nation: rf.NATION_NAMES[move.nation], amount: move.amount }),
		respondOffer: move.accept ? t("history.accepted", { offer: offerDescription }) : t("history.declined", { offer: offerDescription }),
		endDevelopment: after.value?.gameflow.pendingOffer ? t("history.requestedAgreement", { state: stateName }) : t("history.endedDevelopment", { state: stateName }) + (before.value?.states[stateId.value]?.diggers.length === 0 && after.value?.states[stateId.value]?.diggers.length > 0 ? t("history.andHiredCrew") : ""),
		beginDevelopment: after.value?.gameflow.phase === rf.PHASE_RAINY_SEASON || after.value?.gameflow.turn !== before.value?.gameflow.turn ? t("history.startedRainy") : t("history.startedState", { state: rf.STATE_NAMES[after.value?.gameflow.stateOrder[after.value.gameflow.stateIndex]] || t("history.stateFallback") }),
		resolveMaintenance: after.value?.states[stateId.value]?.hasRevolted ? t("history.declaredRevolution", { state: stateName }) : t("history.hiredMandatory", { state: stateName }) + (move.sales?.some((batch) => batch.length) ? t("history.bySelling", { lands: saleLabels(move.sales) }) : ""),
		exchangeBarahshum: t("history.exchangedBarahshum", { area: landLabel(move.to) }),
		exchangeCalah: after.value?.gameflow.pendingOffer || after.value?.gameflow.waterworkRequests?.some((offer) => offer.action.area === move.area) ? t("history.requestedCalah", { state: stateName, kind: view.kindName(move.kind), area: landLabel(move.area) }) : t("history.exchangedCalah", { state: stateName, kind: view.kindName(move.kind), area: landLabel(move.area) }),
		allocateWater: waterDestination.value?.waterwork?.kind === "pump" ? t("history.sentWater", { state: stateName, amount: move.amount ?? 1, source: landLabel(waterSource), destination: landLabel(move.area) }) : t("history.irrigated", { state: stateName, area: landLabel(move.area), source: landLabel(waterSource) }),
		advanceWater: t("history.continuedWater"),
		harvest: (move.choice === "store" ? t("history.storedHarvest", { state: stateName, amount: before.value ? rules.harvestAmount(before.value, stateId.value) : "" }) : t("history.distributedHarvest", { state: stateName, amount: before.value ? rules.harvestAmount(before.value, stateId.value) : "" })) + (move.remove ? t("history.removedWaterwork", { area: landLabel(move.remove) }) : ""),
	}
	return labels[move.type] || move.type
})
const actionImages = computed(() => {
	const move = action.value
	if (!move) return []
	if (move.type === "digEridu") return [{ src: assets.getNationCardImage(rf.NATION_ERIDU), alt: t("history.eridu"), card: true }]
	if (move.type === "dig" && stateId.value !== null) {
		const crew = before.value?.states[stateId.value]?.diggers.find((crew) => crew.id === move.crew)
		return crew ? String(crew.capacity).split("+").map((capacity) => ({ src: assets.getWaterworkImage(stateId.value, capacity), alt: t("history.altDiggingCrew", { points: capacity }) })) : []
	}
	if (move.type === "harvest" && move.choice === "store" && move.remove) {
		const work = before.value?.board.areas.find((area) => area.id === move.remove)?.waterwork
		return work ? [{ src: assets.getWaterworkImage(work.state, work.capacity), alt: t("history.altRemovedWork", { state: rf.STATE_NAMES[work.state], kind: view.kindName(work.kind), area: landLabel(move.remove), measure: view.waterworkMeasure(work) }) }] : []
	}
	if (move.type === "exchangeBarahshum") return [{ src: assets.getNationCardImage(rf.NATION_BARAHSHUM), alt: t("history.barahshum"), card: true }]
	if (move.type === "bidPrimogeniture") return [{ src: assets.primogenitureImage, alt: t("history.primogeniture") }]
	if (move.type === "exchangeCalah") {
		const images = [{ src: assets.getNationCardImage(rf.NATION_CALAH), alt: t("history.calah"), card: true }]
		const work = after.value?.board.areas.find((area) => area.id === move.area)?.waterwork
		if (work && !after.value.gameflow.pendingOffer) images.push({ src: assets.getWaterworkImage(work.state, work.capacity), alt: t("history.altBuiltWork", { state: rf.STATE_NAMES[work.state], kind: view.kindName(work.kind), area: landLabel(move.area), measure: view.waterworkMeasure(work) }) })
		return images
	}
	if (["endDevelopment", "resolveMaintenance"].includes(move.type) && stateId.value !== null && before.value?.states[stateId.value]?.diggers.length === 0 && after.value?.states[stateId.value]?.diggers.length > 0) {
		const crew = after.value.states[stateId.value].diggers[0]
		return String(crew.capacity).split("+").map((capacity) => ({ src: assets.getWaterworkImage(stateId.value, capacity), alt: t("history.altMandatoryCrew", { points: capacity }) }))
	}
	if (move.type === "respondOffer") {
		const offer = before.value?.gameflow.pendingOffer
		if (offer?.action.type === "offerNation") return [{ src: assets.getNationCardImage(offer.action.nation), alt: rf.NATION_NAMES[offer.action.nation], card: true }]
		if (offer) {
			const capacity = after.value?.board.areas.find((area) => area.id === offer.action.area)?.waterwork?.capacity
			if (capacity !== undefined && move.accept) return [{ src: assets.getWaterworkImage(offer.state, capacity), alt: t("history.altAcceptedWork", { kind: view.kindName(offer.action.kind), measure: view.waterworkMeasure({ kind: offer.action.kind, capacity }) }) }]
		}
	}
	if (["buyNation", "bidNation", "offerNation"].includes(move.type)) return [...new Set([move.nation, ...nationAwards.value.map((award) => award.id)])].map((id) => ({ src: assets.getNationCardImage(id), alt: rf.NATION_NAMES[id], card: true }))
	if (move.type === "pass" && nationAwards.value.length) return nationAwards.value.map((award) => ({ src: assets.getNationCardImage(award.id), alt: rf.NATION_NAMES[award.id], card: true }))
	if (move.type === "tradeLand") {
		const ids = [move.buy, ...(move.sellBefore || []).flat(), ...(move.sellAfter || []).flat()].filter((id) => id !== undefined)
		const lands = ids.map((id) => before.value?.board.areas.find((area) => area.id === id)).filter(Boolean)
		const terrains = [...new Map(lands.map((area) => [`${area.landType}-${area.isCity}`, area])).values()]
		return terrains.map((area) => ({ src: assets.getTerrainImage(area.landType, area.isCity), alt: area.isCity ? t("history.altTerrainCity", { land: rf.LAND_NAMES[area.landType] }) : rf.LAND_NAMES[area.landType] }))
	}
	if (["buyCard", "requestWaterwork"].includes(move.type) && stateId.value !== null) {
		const era = [1, 2, 3, 4].find((era) => before.value?.cardSupply[era] > 0) || 5
		const capacity = rf.ERA_CARD_DATA[era][move.kind][0]
		return String(capacity).split("+").map((capacity) => ({ src: assets.getWaterworkImage(stateId.value, capacity), alt: move.kind === "digger" ? t("history.altCrew", { points: capacity }) : t("history.altWaterwork", { kind: view.kindName(move.kind), measure: view.waterworkMeasure({ kind: move.kind, capacity }) }) }))
	}
	return []
})
const playback = useWaterPlaybackStore()
const playbackError = ref("")
const canReplayWater = computed(() => ["riverComplete", "rainEnd"].includes(props.entry.administration?.kind) && (!store.turnDraft.start || props.entry.historyIndex < store.turnDraft.start.historyLength))
function startWaterPlayback(advancing, showIrrigated = false) {
	try {
		playback.start(store.history, store.historySnapshots(), props.entry.historyIndex, advancing)
		if (showIrrigated) {
			playback.state.index = playback.state.steps.length - 1
			playback.state.showIrrigated = true
		}
		nextTick(() => document.querySelector("#mapArea .mapSurface").scrollIntoView({ block: "center", behavior: "smooth" }))
		playbackError.value = ""
	} catch (error) {
		playbackError.value = error.message
		console.error("Unable to replay recorded water flow:", error)
	}
}
function jumpToEntry() {
	if (!store.viewSettings.showReplay) return
	store.replayStep.index = props.index
}
</script>

<template>
	<div class="historyGroup">
		<div v-if="phaseHeading" class="phaseHeading">{{ phaseHeading }}</div>
		<div class="log" :class="{ selectableHistory: store.viewSettings.showReplay, currentReplay: isCurrentReplay, automaticStep: isAutomaticStep, separator: entry[0] === rf.HIST_NEW_GAME || isGameEnd }" :aria-current="isCurrentReplay ? 'step' : undefined" :role="store.viewSettings.showReplay ? 'button' : undefined" :tabindex="store.viewSettings.showReplay ? 0 : undefined" @click="jumpToEntry" @keydown.enter.prevent="jumpToEntry" @keydown.space.prevent="jumpToEntry">
			<div class="historyTimestamp">{{ entry.historyTime != null ? funcs.timestampToString(entry.historyTime) : $t("history.timeNotRecorded") }}</div>
			<span v-if="isCurrentReplay" class="replayPosition">{{ $t("history.currentReplay") }}</span>
			<template v-if="entry.administration">
				<div class="administrationHeading">{{ entry.administration.title }}</div>
				<p class="administrationExplanation">{{ entry.administration.text }}</p>
				<div v-if="canReplayWater" class="waterReplayControls"><button @click.stop="startWaterPlayback(true)">{{ $t("history.animate") }}</button><button @click.stop="startWaterPlayback(false)">{{ $t("history.stepThrough") }}</button><button @click.stop="startWaterPlayback(false, true)">{{ $t("history.showIrrigated") }}</button></div>
				<p v-if="playbackError" role="alert">{{ playbackError }}</p>
				<div class="administrationDetails" v-if="entry.administration.details.length">
					<div v-for="(detail, detailIndex) in entry.administration.details" :key="detailIndex">
						<PlayerMarker v-if="detail.player !== undefined" :index="detail.player" />
						<img v-else-if="detail.state !== undefined" :src="assets.getStateOrderImage(detail.state)" alt="" />
						<img v-else-if="detail.terrain !== undefined" :src="assets.getTerrainImage(detail.terrain)" alt="" />
						<span>{{ detail.text }}</span>
					</div>
				</div>
			</template>
			<div v-else-if="entry[0] === rf.HIST_NEW_GAME" class="new_turn">{{ eventText }}</div>
			<template v-else>
				<div class="container"><span class="header" v-if="player"><PlayerMarker :index="entry[1]" :name="player.displayName" /></span><img v-if="eventArtwork" :src="eventArtwork.src" :alt="eventArtwork.alt" :title="eventArtwork.alt" /><span>{{ eventText }}</span></div>
				<div v-for="award in nationAwards" :key="award.id" class="nationAwardNotice"><PlayerMarker :index="award.owner" :name="after.players[award.owner].displayName" /><span>{{ $t("history.acquiredNation", { nation: rf.NATION_NAMES[award.id], amount: award.price }) }}</span></div>
				<StateLeadership v-for="change in leadershipChanges" :key="change.id" :change="change" />
				<details class="balanceDetails" v-if="balanceChanges.length" @click.stop @keydown.enter.stop @keydown.space.stop><summary class="balanceChanges" :aria-label="$t('history.showBalances')"><span v-for="change in balanceChanges" :key="change.label" :title="change.title || change.label"><img :src="change.src" :alt="change.label" /><b>{{ change.amount > 0 ? '+' : '' }}{{ change.amount }} SPL</b></span></summary><div class="balanceBreakdown"><div v-for="change in balanceChanges" :key="change.label"><img :src="change.src" :alt="change.title || change.label" :title="change.title || change.label" /><span>{{ change.label }}</span></div></div></details>
				<div class="actionImages" :class="{ multipleCards: actionImages.filter((asset) => asset.card).length > 1 }" v-if="actionImages.length"><template v-for="(asset, idx) in actionImages" :key="idx"><div v-if="asset.card" class="historyCard"><ArtworkCard :src="asset.src" :alt="asset.alt" /></div><img v-else :src="asset.src" :alt="asset.alt" :title="asset.alt" /></template></div>
				<div v-if="isGameEnd" class="new_turn">{{ after?.gameflow.endReason === 'invasion' ? $t("history.gameEndedInvasion") : after?.gameflow.endReason === 'revolution' ? $t("history.gameEndedRevolution") : $t("history.gameEnded") }}</div>
			</template>
		</div>
	</div>
</template>

<style scoped>
.waterReplayControls { display: flex; gap: 6px; margin: 6px 3px; }.waterReplayControls button { padding: 4px 7px; font: inherit; cursor: pointer; }
.container { display: flex; align-items: center; }
.log { direction: ltr; margin: 5px; border: #000 1px solid; text-align: left; padding: 3px; background-color: #d4eafd; z-index: 30; line-height: 25px; }
.log.separator { padding: 3px; }
.historyTimestamp { font-size: 0.8em; }.administrationHeading { padding: 6px; background: #303030; color: white; text-align: center; font-weight: bold; }.administrationExplanation { margin: 8px 3px; }.administrationDetails { display: grid; gap: 5px; }.administrationDetails > div { display: flex; align-items: center; gap: 6px; padding: 4px; background: #edf6fd; }.administrationDetails img { width: 30px; height: 30px; flex-shrink: 0; }.administrationDetails span { min-width: 0; overflow-wrap: anywhere; }.administrationDetails button { flex-shrink: 0; min-height: 32px; padding: 4px 6px; border: 1px solid #177daf; border-radius: 3px; background: #fffdf4; font: inherit; cursor: pointer; }
.header { display: inline-flex; align-items: center; gap: 5px; }.header b { min-width: 0; overflow-wrap: anywhere; }.header img { width: 23px; height: 23px; }
.new_turn { background: black; color: white; text-align: center; font-weight: bold; font-size: 1.2em; padding: 8px; }.phaseHeading { background: black; color: white; text-align: center; font-weight: bold; font-size: 1.2em; padding: 8px; margin: 5px; }
.selectableHistory { cursor: pointer; }.selectableHistory:hover { border: 1px solid yellow; }.selectableHistory:focus-visible { outline: 2px solid yellow; outline-offset: -2px; }
.log.currentReplay { box-shadow: inset 3px 0 #177daf; background: #e5f3ff; }.replayPosition { display: block; color: #12628c; font-size: 16px; font-weight: bold; }
.actionImages { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }.actionImages img { width: 30px; height: 30px; object-fit: contain; }.historyCard { width: 185px; max-width: 100%; }
.actionImages.multipleCards .historyCard { width: calc((100% - 4px) / 2); max-width: 185px; }
.nationAwardNotice { display: flex; align-items: center; gap: 5px; margin-top: 4px; padding: 3px 6px; background: #edf6fd; border-left: 3px solid #177daf; font-size: 16px; font-weight: 400; }.nationAwardNotice img { width: 23px; height: 23px; flex-shrink: 0; }.nationAwardNotice span { min-width: 0; overflow-wrap: anywhere; }
.container > img { width: 26px; height: 26px; object-fit: contain; flex-shrink: 0; margin-right: 6px; }.container > span:last-child { min-width: 0; overflow-wrap: anywhere; }
.balanceChanges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }.balanceChanges span { display: inline-flex; align-items: center; gap: 4px; padding: 2px 5px; background: #edf6fd; border: 1px solid #adc2d0; font-size: 16px; font-weight: 400; }.balanceChanges img { width: 22px; height: 22px; }
.balanceChanges { cursor: pointer; align-items: center; list-style: none; }.balanceChanges::-webkit-details-marker { display: none; }.balanceChanges::before { content: '▸'; font-size: 16px; font-weight: 400; }.balanceDetails[open] .balanceChanges::before { content: '▾'; }.balanceChanges:focus-visible { outline: 2px solid #177daf; outline-offset: 2px; }.balanceBreakdown { display: grid; gap: 3px; margin-top: 5px; padding: 5px; background: #edf6fd; font-size: 16px; font-weight: 400; }.balanceBreakdown > div { display: flex; align-items: center; gap: 5px; }.balanceBreakdown img { width: 22px; height: 22px; flex-shrink: 0; }.balanceBreakdown span { min-width: 0; overflow-wrap: anywhere; }
@media (max-width: 1050px) { .balanceChanges { min-height: 40px; } }
</style>
