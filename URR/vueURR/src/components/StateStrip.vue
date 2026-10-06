<script setup>
import ArtworkCard from "./ArtworkCard.vue"
import { computed } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import { currentStateId } from "../js/URRview"
import { getStateTreasuryImage, getStateOrderImage, getWaterworkImage, getNationCardImage, getPlayerMarkerImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const emit = defineEmits(["inspect"])
function inspectPlayer(index) {
	store.viewSettings.inspectedPlayer = index
	emit("inspect", "player")
}
const visibleStates = computed(() => {
	const id = store.viewSettings.inspectedState ?? currentStateId(store)
	return id === null ? [] : [store.states[id]]
})
function landCount(stateId) { return store.board.areas.filter((area) => area.state === stateId && area.markerOwner !== null).length }
function kingName(state) {
	if (state.king === null) return state.isActive ? "No monarch" : "No ownership leader"
	return `${state.isActive ? '' : 'Leading: '}${store.players[state.king].displayName}`
}
function isCurrentState(stateId) { return currentStateId(store) === stateId }
function landowners(stateId) { return store.players.map((player, index) => ({ index, name: player.displayName, count: rules.ownedLand(store, stateId, index).length })).filter((owner) => owner.count > 0).sort((a, b) => b.count - a.count) }

function nations(stateId) { return store.nations.filter((nation) => !nation.isRemoved && nation.ownerType === "state" && nation.owner === stateId) }
function relevantNations(stateId) {
	if (store.viewSettings.inspectedState !== null) return nations(stateId)
	if (store.gameflow.phase !== rf.PHASE_DEVELOPMENT) return []
	return nations(stateId).filter((nation) => {
		if (nation.id === rf.NATION_ERIDU) return store.gameflow.developmentStep === "eridu" || store.states[stateId].diggers.length === 0
		if (nation.id === rf.NATION_CALAH) return !["eridu", "betweenStates"].includes(store.gameflow.developmentStep)
		return nation.id === rf.NATION_BARAHSHUM && rules.canExchangeBarahshum(store, store.states[stateId].king)
	})
}
function otherNations(stateId) {
	const relevant = relevantNations(stateId)
	return nations(stateId).filter((nation) => !relevant.includes(nation))
}
function ownsEridu(stateId) { return nations(stateId).some((nation) => nation.id === rf.NATION_ERIDU) }
function crewCount(state) { return state.diggers.length + (ownsEridu(state.id) ? 1 : 0) }
function isCrewUnavailable(crew) { return store.gameflow.phase !== rf.PHASE_SETTLEMENT && crew.hasDug }
function crewLabel(crew, stateId) {
	if (isCrewUnavailable(crew)) return "Unavailable"
	if (store.gameflow.phase === rf.PHASE_SETTLEMENT || (store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.developmentStep === "digging" && isCurrentState(stateId))) return "Ready"
	return "Unused"
}
function crewStatus(crew) { return store.gameflow.phase === rf.PHASE_SETTLEMENT ? "Available for upcoming development" : crew.hasDug ? "Unavailable for digging this round" : "Unused this round" }
function crewTiles(capacity) { return capacity === "1+1" ? ["1", "1"] : [capacity] }
</script>

<template>
	<section class="stateStrip" aria-label="State treasuries">
		<details v-for="state in visibleStates" :key="state.id" class="stateCard" open :class="{ currentState: state.isActive && isCurrentState(state.id), inactive: !state.isActive }" :style="{ '--state-color': rf.STATE_COLOURS[state.id] }">
			<summary>
				<span class="treasuryHeader"><img :src="getStateOrderImage(state.id)" alt="" /></span>
				<span class="stateSummary">
					<span v-if="store.viewSettings.inspectedState !== null" class="stateMeta inspectionLabel">Inspecting state</span>
					<span class="stateName"><b>{{ rf.STATE_NAMES[state.id] }}</b><button v-if="store.viewSettings.inspectedState !== null" class="followState" @click.prevent="store.viewSettings.inspectedState = null">{{ currentStateId(store) === null ? 'Close' : 'Follow turn' }}</button></span>
					<span class="stateMeta" :title="kingName(state)">{{ kingName(state) }}<template v-if="state.isActive"> · {{ landCount(state.id) }} colonized</template></span>
					<span v-if="!state.isActive" class="stateMeta">{{ landCount(state.id) }}/{{ rf.LAND_FOR_STATE_TO_ACTIVATE }} colonized</span>
					<span v-if="state.isActive" class="stateMeta summaryTreasury">Treasury {{ state.money }} SPL</span>
				</span>
			</summary>
			<div class="landowners" v-if="landowners(state.id).length && (store.gameflow.phase === rf.PHASE_SETTLEMENT || store.viewSettings.inspectedState !== null || (state.isActive && rules.maintenanceShortfall(store, state.id) > store.players[state.king].money))"><small>Landowners</small><button @click="inspectPlayer(owner.index)" v-for="owner in landowners(state.id)" :key="owner.index" :class="{ monarch: owner.index === state.king, inspected: store.viewSettings.inspectedPlayer === owner.index }" :aria-pressed="store.viewSettings.inspectedPlayer === owner.index" :aria-label="`${owner.name}: ${owner.count} owned lands${owner.index === state.king ? ' · Monarch' : ''}`" :title="`${owner.name}: ${owner.count} owned lands${owner.index === state.king ? ' · Monarch' : ''}`"><img :src="getPlayerMarkerImage(owner.index)" :alt="owner.name" /><b>{{ owner.count }}</b></button></div>
			<div v-if="state.isActive" class="stateDetails">
				<div class="treasuryChart">
					<img :src="getStateTreasuryImage(state.id)" :alt="`${rf.STATE_NAMES[state.id]} treasury chart`" />
					<div class="chartColumn treasury"><b>{{ state.money }}</b><span>SPL</span></div>
					<div class="chartColumn diggers" :class="{ crewCount: crewCount(state) > 2 }" role="group" :aria-label="`${rf.STATE_NAMES[state.id]} digging crews`">
						<template v-if="crewCount(state) > 2"><b>{{ crewCount(state) }}</b><span>crews</span></template>
						<template v-else><span v-for="crew in state.diggers" :key="crew.id" class="crewTile" :class="{ used: isCrewUnavailable(crew), splitCrew: crew.capacity === '1+1' }" :title="crewStatus(crew)" role="img" :aria-label="`${crew.capacity} digging crew. ${crewStatus(crew)}`"><img v-for="(capacity, tileIndex) in crewTiles(crew.capacity)" :key="tileIndex" :src="getWaterworkImage(state.id, capacity)" alt="" /><span v-if="crew.capacity === '1+1'">+</span></span><span v-if="!crewCount(state)">No crews</span><span v-if="ownsEridu(state.id)" class="crewTile" title="Eridu: special 2-point crew; also maintains canals"><img :src="getWaterworkImage(state.id, 2)" alt="Eridu 2-point crew" /></span></template>
					</div>
					<div class="chartColumn harvest"><b>{{ rules.harvestAmount(store, state.id) }}</b><span>SPL harvest</span></div>
				</div>
				<details v-if="crewCount(state) > 2" class="crewInventory" :open="store.viewSettings.inspectedState === state.id || (store.gameflow.phase === rf.PHASE_DEVELOPMENT && isCurrentState(state.id) && ['digging', 'eridu'].includes(store.gameflow.developmentStep))">
					<summary>Digging crews · {{ crewCount(state) }}</summary>
					<div class="crewInventoryGrid">
						<div v-for="crew in state.diggers" :key="crew.id" class="crewInventoryItem" :title="crewStatus(crew)">
							<span class="crewTile" :class="{ used: isCrewUnavailable(crew), splitCrew: crew.capacity === '1+1' }" role="img" :aria-label="`${crew.capacity} digging crew. ${crewStatus(crew)}`"><img v-for="(capacity, tileIndex) in crewTiles(crew.capacity)" :key="tileIndex" :src="getWaterworkImage(state.id, capacity)" alt="" /><span v-if="crew.capacity === '1+1'">+</span></span>
							<small>Crew {{ crew.id + 1 }} · {{ crewLabel(crew, state.id) }}</small>
						</div>
						<div v-if="ownsEridu(state.id)" class="crewInventoryItem" title="Eridu: special 2-point crew; also maintains canals"><span class="crewTile"><img :src="getWaterworkImage(state.id, 2)" alt="Eridu 2-point crew" /></span><small>Eridu</small></div>
					</div>
				</details>
				<div class="stateNations"><ArtworkCard v-for="nation in relevantNations(state.id)" :key="nation.id" :src="getNationCardImage(nation.id)" :alt="rf.NATION_NAMES[nation.id]" /></div>
				<details v-if="otherNations(state.id).length" class="nationInventory"><summary>{{ relevantNations(state.id).length ? 'Other nations' : 'Independent nations' }} · {{ otherNations(state.id).length }}</summary><div class="stateNations"><ArtworkCard v-for="nation in otherNations(state.id)" :key="nation.id" :src="getNationCardImage(nation.id)" :alt="rf.NATION_NAMES[nation.id]" /></div></details>
				<div class="stateFoot">{{ rules.ownedLand(store, state.id).length }} owned lands<template v-if="state.diggers.length"> · {{ state.diggers.length }} hired crew{{ state.diggers.length === 1 ? '' : 's' }}</template><span v-if="state.hasRevolted"> · Revolution</span></div>
			</div>
			<div v-else class="inactiveDetails">Treasury: {{ state.money }} SPL. Activates at the end of settlement with {{ rf.LAND_FOR_STATE_TO_ACTIVATE }} colonized lands.</div>
		</details>
	</section>
</template>

<style scoped>
.stateStrip { display: flex; flex-direction: column; align-items: stretch; gap: 6px; width: 100%; margin: 0; padding: 0; box-sizing: border-box; }
.stateCard { min-width: 0; background: #f7f5ef; border: 1px solid var(--state-color, #8e805e); border-left: 3px solid var(--state-color, #8e805e); border-radius: 4px; text-align: left; font-size: 12px; overflow: hidden; }
.stateCard > summary { display: flex; align-items: stretch; gap: 7px; min-height: 52px; list-style: none; cursor: pointer; }.stateCard > summary::-webkit-details-marker { display: none; }.treasuryHeader { flex: 0 0 36px; width: 36px; padding: 8px 0 8px 7px; }.treasuryHeader img { width: 100%; height: auto; display: block; }.stateSummary { display: flex; flex-direction: column; justify-content: center; min-width: 0; gap: 2px; padding: 4px 4px 4px 0; }.stateName { display: flex; align-items: center; gap: 4px; }.stateName b { font-size: 13px; }.stateMeta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #53616a; font-size: 11px; }.orderNumber { margin-left: auto; color: #58636a; }
.treasuryChart { position: relative; }.treasuryChart img { width: 100%; display: block; }.chartColumn { position: absolute; top: 38%; bottom: 5%; width: 30%; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; text-align: center; overflow: auto; }
.treasury { left: 1%; }.diggers { left: 35%; flex-direction: row; flex-wrap: wrap; align-content: flex-start; }.harvest { right: 1%; }.chartColumn b { font-size: 25px; }.crewTile { position: relative; width: 29px; height: 29px; }.crewTile img { width: 100%; height: 100%; object-fit: contain; }.crewTile span { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11px; font-weight: bold; text-shadow: 0 1px 2px white, 1px 0 white, -1px 0 white; }.crewTile.used { opacity: .5; }.crewTile.splitCrew { display: flex; gap: 2px; flex: 0 1 42px; width: 42px; max-width: 100%; min-width: 0; }.crewTile.splitCrew img { width: calc(50% - 1px); }.stateFoot, .inactiveDetails { padding: 5px 7px; color: #53616a; }.inactiveDetails { border-top: 1px solid #ded9cc; }
.currentState { box-shadow: 0 0 0 2px #45a7df; }.stateDetails { border-top: 1px solid #ded9cc; }
.stateNations { display: grid; gap: 5px; padding: 0 6px; }.stateNations img { width: 100%; }.stateCard > summary:focus-visible { outline: 2px solid #177daf; outline-offset: -2px; }
.nationInventory { margin: 0 6px; border-top: 1px solid #ded9cc; }.nationInventory > summary { cursor: pointer; padding: 6px 0; }.nationInventory .stateNations { padding: 0 0 6px; }
.followState { margin-left: auto; font: inherit; font-size: 11px; cursor: pointer; }
.stateCard[open] .summaryTreasury { display: none; }.stateMeta.inspectionLabel { color: #145575; }
.landowners { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; padding: 6px; border-top: 1px solid #ded9cc; }.landowners small { width: 100%; color: #53616a; }.landowners button { font: inherit; color: inherit; cursor: pointer; background: #fffdf5; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #c4b894; border-radius: 3px; padding: 3px; }.landowners img { width: 25px; height: 25px; }.landowners .monarch { border-color: #527349; background: #edf5e4; }
@media (max-width: 1050px) { .followState { min-height: 40px; font-size: 12px; padding: 4px 8px; }.landowners button { min-width: 40px; min-height: 40px; } }
.landowners button.inspected { outline: 2px solid #177daf; }
.chartColumn.diggers.crewCount { flex-direction: column; flex-wrap: nowrap; align-content: normal; overflow: hidden; }.crewInventory { margin: 0 6px; border-top: 1px solid #ded9cc; }.crewInventory summary { cursor: pointer; padding: 6px 0; }.crewInventoryGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; padding-bottom: 6px; }.crewInventoryItem { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 5px; background: #fffdf5; border: 1px solid #ded9cc; border-radius: 3px; }.crewInventoryItem small { font-size: 11px; }.crewInventoryItem .crewTile.splitCrew { flex-basis: auto; }
@media (max-width: 1050px) { .crewInventory summary { min-height: 40px; box-sizing: border-box; padding: 12px 0; } }
@media (max-width: 1050px) { .nationInventory > summary { min-height: 40px; box-sizing: border-box; padding: 12px 0; } }
</style>
