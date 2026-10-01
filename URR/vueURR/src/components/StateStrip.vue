<script setup>
import * as rf from "../js/URRreference"
import { getStateTreasuryImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()

function landCount(stateId) {
	return store.board.areas.filter((area) => area.state === stateId && area.markerOwner !== null).length
}

function kingName(state) {
	return state.king === null || !store.players[state.king] ? "No monarch" : store.players[state.king].displayName
}

function isCurrentState(stateId) {
	return store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.stateOrder[store.gameflow.stateIndex] === stateId
}
</script>

<template>
	<section class="stateStrip" aria-label="States">
		<div v-for="state in store.states.filter((entry) => entry.isActive)" :key="state.id" class="activeState" :class="{ currentState: isCurrentState(state.id) }" :style="{ '--state-colour': rf.STATE_COLOURS[state.id] }">
			<img class="treasuryImage" :src="getStateTreasuryImage(state.id)" :alt="`${rf.STATE_NAMES[state.id]} treasury chart`" />
			<b>{{ rf.STATE_NAMES[state.id] }}</b>
			<span>{{ kingName(state) }}</span>
			<span>Treasury {{ state.money }} SPL</span>
			<span>{{ state.diggers.length }} crew{{ state.diggers.length === 1 ? "" : "s" }}</span>
		</div>
		<div v-for="state in store.states.filter((entry) => !entry.isActive)" :key="state.id" class="emergingState" :style="{ borderColor: rf.STATE_COLOURS[state.id] }">
			{{ rf.STATE_NAMES[state.id] }} {{ landCount(state.id) }}/{{ rf.LAND_FOR_STATE_TO_ACTIVATE }}
		</div>
	</section>
</template>

<style scoped>
.stateStrip { display: flex; justify-content: center; align-items: stretch; flex-wrap: wrap; gap: 6px; margin: 8px auto; max-width: 1320px; }
.activeState, .emergingState { background: #fff7d3; border: 2px solid #756f5c; border-radius: 5px; padding: 4px 8px; text-align: left; }
.activeState { border-top: 7px solid var(--state-colour); min-width: 130px; display: grid; font-size: 12px; }.treasuryImage { width: 100%; height: 17px; object-fit: cover; object-position: top; border: 1px solid #aaa; }
.currentState { box-shadow: 0 0 0 3px #45a7df; }
.emergingState { font-size: 13px; white-space: nowrap; }
</style>
