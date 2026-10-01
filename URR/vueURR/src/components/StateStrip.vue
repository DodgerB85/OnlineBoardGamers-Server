<script setup>
import { computed } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import { currentWaterFrame } from "../js/URRwater"
import { getStateTreasuryImage, getStateOrderImage, getWaterworkImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const orderedStates = computed(() => {
	const order = [...store.gameflow.stateOrder, ...store.board.stateOrder.filter((id) => !store.gameflow.stateOrder.includes(id))]
	return [...store.states].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
})

function landCount(stateId) { return store.board.areas.filter((area) => area.state === stateId && area.markerOwner !== null).length }
function kingName(state) { return state.king === null ? "No monarch" : store.players[state.king].displayName }
function isCurrentState(stateId) {
	if (store.gameflow.phase === rf.PHASE_RAINY_SEASON) return store.rain.step === "harvest" ? store.rain.harvestOrder[0] === stateId : store.board.areas.find((area) => area.id === currentWaterFrame(store)?.area)?.waterwork?.state === stateId
	return store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.stateOrder[store.gameflow.stateIndex] === stateId
}
function nations(stateId) { return store.nations.filter((nation) => !nation.isRemoved && nation.ownerType === "state" && nation.owner === stateId) }
function developmentPosition(stateId) { return store.gameflow.stateOrder.indexOf(stateId) + 1 }
function crewTiles(capacity) { return capacity === "1+1" ? ["1", "1"] : [capacity] }
</script>

<template>
	<section class="stateStrip" aria-label="State treasuries">
		<details v-for="state in orderedStates" :key="state.id" class="stateCard" :class="{ currentState: state.isActive && isCurrentState(state.id), inactive: !state.isActive }" :style="{ '--state-color': rf.STATE_COLOURS[state.id] }">
			<summary>
				<span class="treasuryHeader"><img :src="getStateTreasuryImage(state.id)" alt="" /></span>
				<span class="stateSummary">
					<span class="stateName"><img class="orderMarker" :src="getStateOrderImage(state.id)" alt="" /><b>{{ rf.STATE_NAMES[state.id] }}</b><span v-if="state.isActive" class="orderNumber">#{{ developmentPosition(state.id) }}</span></span>
					<span class="stateMeta">{{ kingName(state) }} · {{ landCount(state.id) }}/{{ rf.LAND_FOR_STATE_TO_ACTIVATE }} colonized</span>
					<span class="stateMeta">{{ state.isActive ? `Treasury ${state.money} SPL` : `Activates at ${rf.LAND_FOR_STATE_TO_ACTIVATE} lands` }}</span>
				</span>
			</summary>
			<div v-if="state.isActive" class="stateDetails">
				<div class="treasuryChart">
					<img :src="getStateTreasuryImage(state.id)" :alt="`${rf.STATE_NAMES[state.id]} treasury chart`" />
					<div class="chartColumn treasury"><b>{{ state.money }}</b><span>SPL</span></div>
					<div class="chartColumn diggers"><template v-for="crew in state.diggers" :key="crew.id"><span v-for="(capacity, tileIndex) in crewTiles(crew.capacity)" :key="tileIndex" class="crewTile" :class="{ used: crew.hasDug }" :title="crew.hasDug ? 'Already dug this round' : 'Ready to dig'"><img :src="getWaterworkImage(state.id, capacity)" :alt="`${capacity} capacity`" /><span>{{ capacity }}</span></span></template><span v-if="!state.diggers.length">No crews</span><span v-if="nations(state.id).some((nation) => nation.id === rf.NATION_ERIDU)">Eridu: 2</span></div>
					<div class="chartColumn harvest"><b>{{ rules.harvestAmount(store, state.id) }}</b><span>SPL harvest</span></div>
				</div>
				<div class="stateFoot">{{ rules.ownedLand(store, state.id).length }} owned lands<span v-if="nations(state.id).length"> · {{ nations(state.id).map((nation) => rf.NATION_NAMES[nation.id]).join(', ') }}</span><span v-if="state.hasRevolted"> · Revolution</span></div>
			</div>
			<div v-else class="inactiveDetails">Treasury: {{ state.money }} SPL. Activates at the end of settlement with {{ rf.LAND_FOR_STATE_TO_ACTIVATE }} colonized lands.</div>
		</details>
	</section>
</template>

<style scoped>
.stateStrip { display: flex; flex-direction: column; align-items: stretch; gap: 6px; width: 100%; margin: 0; padding: 0; box-sizing: border-box; }
.stateCard { min-width: 0; background: #f7f5ef; border: 1px solid var(--state-color, #8e805e); border-left: 3px solid var(--state-color, #8e805e); border-radius: 4px; text-align: left; font-size: 12px; overflow: hidden; }
.stateCard > summary { display: flex; align-items: stretch; gap: 7px; min-height: 52px; list-style: none; cursor: pointer; }.stateCard > summary::-webkit-details-marker { display: none; }.treasuryHeader { flex: 0 0 62px; width: 62px; height: 52px; overflow: hidden; }.treasuryHeader img { width: 100%; height: auto; display: block; }.stateSummary { display: flex; flex-direction: column; justify-content: center; min-width: 0; gap: 2px; padding: 4px 4px 4px 0; }.stateName { display: flex; align-items: center; gap: 4px; }.stateName b { font-size: 13px; }.stateMeta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #53616a; font-size: 11px; }.orderNumber { margin-left: auto; color: #58636a; }
.treasuryChart { position: relative; }.treasuryChart img { width: 100%; display: block; }.chartColumn { position: absolute; top: 38%; bottom: 5%; width: 30%; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; text-align: center; overflow: auto; }
.treasury { left: 1%; }.diggers { left: 35%; flex-direction: row; flex-wrap: wrap; align-content: center; }.harvest { right: 1%; }.chartColumn b { font-size: 25px; }.crewTile { position: relative; width: 29px; height: 29px; }.crewTile img { width: 100%; height: 100%; object-fit: contain; }.crewTile span { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11px; font-weight: bold; text-shadow: 0 1px 2px white, 1px 0 white, -1px 0 white; }.crewTile.used { opacity: .5; }.stateFoot, .inactiveDetails { padding: 5px 7px; color: #53616a; }.inactiveDetails { border-top: 1px solid #ded9cc; }
.currentState { box-shadow: 0 0 0 2px #45a7df; }.stateDetails { border-top: 1px solid #ded9cc; }
.orderMarker { width: 20px; height: 20px; vertical-align: middle; }
</style>
