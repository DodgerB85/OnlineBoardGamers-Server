<script setup>
import { computed, nextTick, watch } from "vue"
import * as rf from "../js/URRreference"
import { getDevelopmentOrder, canExchangeBarahshum } from "../js/URRrules"
import { currentStateId, phaseStr } from "../js/URRview"
import { getPlayerMarkerImage, getStateOrderImage, primogenitureImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const emit = defineEmits(["inspect", "browseStates"])
const isGameOver = computed(() => store.gameflow.phase === rf.PHASE_GAME_OVER)
const playerOrder = computed(() => {
	if (isGameOver.value) return store.gameflow.finalPositions
	const order = store.gameflow.fullTurnOrder
	const first = store.gameflow.phase === rf.PHASE_DIVIDING_NATIONS ? 0 : order.indexOf(store.gameflow.primogeniture)
	return [...order.slice(first), ...order.slice(0, first)]
})
const stateOrder = computed(() => store.gameflow.phase === rf.PHASE_SETTLEMENT ? getDevelopmentOrder(store) : store.gameflow.stateOrder.filter((id) => store.states[id].isActive))
const currentState = computed(() => currentStateId(store))
const stateOrderLabel = computed(() => store.gameflow.phase === rf.PHASE_SETTLEMENT ? "Next states" : store.gameflow.phase === rf.PHASE_RAINY_SEASON ? "Harvest order" : "Active states")
const stateOrderExplanation = computed(() => store.gameflow.phase === rf.PHASE_RAINY_SEASON ? "Harvests follow the order set when development began. Water decisions follow the river and pump branches." : store.gameflow.phase === rf.PHASE_SETTLEMENT ? "Upcoming development order: fewest player-owned lands first; ties follow the printed board order. Fixed when development begins." : "Development order was fixed at the start of the phase: fewest player-owned lands first; ties follow the printed board order.")
function hasCompletedState(id) {
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT) return store.gameflow.stateOrder.indexOf(id) < store.gameflow.stateIndex
	return store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "harvest" && !store.rain.harvestOrder.includes(id)
}
const exchangeOwner = computed(() => {
	const nation = store.nations[rf.NATION_BARAHSHUM]
	return nation.ownerType === "player" && nation.owner !== store.gameflow.turnOrder[0] && canExchangeBarahshum(store, nation.owner) ? nation.owner : null
})
const colonized = (id) => store.board.areas.filter((area) => area.state === id && area.markerOwner !== null).length
const readyStates = computed(() => store.states.filter((state) => !state.isActive && colonized(state.id) >= rf.LAND_FOR_STATE_TO_ACTIVATE))
const emergingStates = computed(() => store.states.filter((state) => !state.isActive))
function inspectPlayer(index) {
	store.viewSettings.inspectedPlayer = store.viewSettings.inspectedPlayer === index ? null : index
	if (store.viewSettings.inspectedPlayer !== null) emit("inspect", "player")
}
function inspectState(index) {
	store.viewSettings.inspectedState = store.viewSettings.inspectedState === index ? null : index
	if (store.viewSettings.inspectedState !== null) emit("inspect", "state")
}
function inspectEmergingState(event, index) {
	const details = event.currentTarget.closest("details")
	details.open = false
	details.querySelector("summary").focus({ preventScroll: true })
	inspectState(index)
}
function browseEmergingStates(event) {
	const details = event.currentTarget
	if (!details.open) return
	emit("browseStates")
	nextTick(() => {
		details.scrollIntoView({ block: "nearest", behavior: "instant" })
		if (!window.matchMedia("(max-width: 1050px)").matches) return
		const drawer = document.querySelector(".actionSidebar:not(.isFinished)")?.getBoundingClientRect()
		const bottom = details.getBoundingClientRect().bottom
		if (drawer && bottom > drawer.top) window.scrollBy({ top: bottom - drawer.top + 8, behavior: "smooth" })
	})
}
watch([() => store.gameflow.turnOrder[0], () => store.gameflow.phase, () => currentState.value], () => {
	store.viewSettings.inspectedPlayer = null
	store.viewSettings.inspectedState = null
})
</script>

<template>
	<section class="turnOrder" aria-label="Turn order">
		<div class="orderRow" role="group" :aria-label="isGameOver ? 'Final standings' : 'Player order'">
			<b class="orderLabel">{{ isGameOver ? 'Standings' : 'Players' }}</b>
			<button v-for="(index, position) in playerOrder" :key="index" :class="{ current: !isGameOver && store.gameflow.turnOrder[0] === index, opportunity: exchangeOwner === index, inspected: store.viewSettings.inspectedPlayer === index }" :title="exchangeOwner === index ? `${store.players[index].displayName}: optional Barahshum canal exchange` : store.players[index].displayName" :aria-current="!isGameOver && store.gameflow.turnOrder[0] === index ? 'step' : undefined" :aria-pressed="store.viewSettings.inspectedPlayer === index" @click="inspectPlayer(index)">
				<span class="position">{{ position + 1 }}</span><img :src="getPlayerMarkerImage(index)" alt="" /><span>{{ store.players[index].displayName }}<small>{{ isGameOver ? store.players[index].score : store.players[index].money }} SPL{{ isGameOver ? ' assets' : '' }}</small><small v-if="exchangeOwner === index" class="exchangeCue">Barahshum</small></span><img v-if="!isGameOver && store.gameflow.primogeniture === index" class="birthright" :src="primogenitureImage" alt="Primogeniture" title="Primogeniture" />
			</button>
			<span class="phaseLabel">Turn {{ store.gameflow.turn }} · {{ phaseStr(store.gameflow.phase) }} · Era {{ store.era === 5 ? 'M' : store.era }}<b v-if="store.gameflow.endReason && !isGameOver" class="finalRound">Final round</b></span>
		</div>
		<div class="orderRow" role="group" :aria-label="stateOrderLabel">
			<b class="orderLabel" :title="stateOrderExplanation">{{ stateOrderLabel }}</b>
			<button v-for="(id, position) in stateOrder" :key="id" :class="{ current: currentState === id, completed: hasCompletedState(id), inspected: store.viewSettings.inspectedState === id }" :aria-current="currentState === id ? 'step' : undefined" :aria-pressed="store.viewSettings.inspectedState === id" @click="inspectState(id)">
				<span class="position">{{ position + 1 }}</span><img :src="getStateOrderImage(id)" alt="" /><span>{{ rf.STATE_NAMES[id] }}<small>{{ store.states[id].money }} SPL</small></span><span v-if="hasCompletedState(id)" class="doneMark" role="img" :aria-label="store.gameflow.phase === rf.PHASE_DEVELOPMENT ? 'Development complete' : 'Harvest complete'">✓</span>
			</button>
			<button v-for="state in readyStates" :key="`ready-${state.id}`" class="readyState" :class="{ inspected: store.viewSettings.inspectedState === state.id }" :aria-pressed="store.viewSettings.inspectedState === state.id" :title="`${rf.STATE_NAMES[state.id]}: emerges after settlement with ${colonized(state.id)} colonized lands`" @click="inspectState(state.id)"><img :src="getStateOrderImage(state.id)" alt="" /><span>{{ rf.STATE_NAMES[state.id] }}<small>{{ colonized(state.id) }} lands · ready</small></span></button>
			<span v-if="!stateOrder.length && !readyStates.length" class="emptyOrder">None yet · {{ rf.LAND_FOR_STATE_TO_ACTIVATE }} lands to emerge</span>
			<details v-if="emergingStates.length" class="emergingStates" @toggle="browseEmergingStates"><summary>Emerging states</summary><div><button v-for="state in emergingStates" :key="state.id" @click="inspectEmergingState($event, state.id)"><img :src="getStateOrderImage(state.id)" alt="" />{{ rf.STATE_NAMES[state.id] }} · {{ store.board.areas.filter((area) => area.state === state.id && area.markerOwner !== null).length }}/{{ rf.LAND_FOR_STATE_TO_ACTIVATE }}</button></div></details>
		</div>
	</section>
</template>

<style scoped>
.turnOrder { max-width: 1510px; margin: 10px auto 0; padding: 0 12px; box-sizing: border-box; text-align: left; }
.orderRow { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 6px 8px; background: #f7f0dd; border: 1px solid #b3a481; }.orderRow:first-child { border-radius: 5px 5px 0 0; }.orderRow + .orderRow { border-top: 0; border-radius: 0 0 5px 5px; }
.orderLabel { width: 87px; font-size: 12px; }.orderRow button { display: inline-flex; align-items: center; gap: 5px; text-align: left; font: inherit; font-size: 13px; padding: 4px 7px; border: 1px solid #b3a481; border-radius: 4px; background: #fffdf5; color: #302f27; cursor: pointer; }.orderRow button img { width: 29px; height: 29px; }.orderRow button { max-width: 100%; box-sizing: border-box; }.orderRow button > span:not(.position) { display: block; min-width: 0; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.orderRow button small { display: block; font-size: 11px; color: #625940; }.orderRow button.current { border: 2px solid #527349; background: #edf5e4; padding: 3px 6px; }.orderRow button.inspected { outline: 2px solid #177daf; }.orderRow button .birthright { width: 33px; height: 23px; object-fit: contain; }.position { font-size: 11px; color: #786d54; }.phaseLabel { margin-left: auto; font-size: 13px; }.emptyOrder { font-size: 12px; color: #786d54; }
.emergingStates { margin-left: auto; font-size: 12px; }.emergingStates summary { cursor: pointer; padding: 5px; }.emergingStates[open] { flex-basis: 100%; }.emergingStates[open] > summary { width: max-content; margin-left: auto; }.emergingStates > div { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px 0; border-top: 1px solid #b3a481; }
.orderRow button.opportunity { border-color: #8758a8; background: #f3eafa; }.orderRow button .exchangeCue { color: #70478e; font-size: 11px; }
@media (max-width: 1050px) { .orderRow button { min-height: 40px; }.emergingStates summary { min-height: 40px; box-sizing: border-box; padding: 12px 5px; } }
.orderRow button.completed { background: #eeeadf; }.orderRow button .doneMark { flex-shrink: 0; color: #527349; font-size: 14px; }
.finalRound { display: inline-block; margin-left: 8px; padding: 2px 6px; border: 1px solid #a75a24; border-radius: 3px; background: #f6e3cf; color: #663716; font-size: 12px; }
@media (max-width: 650px) { .orderRow:first-child button > span:not(.position) { max-width: 90px; }.orderRow { gap: 4px; }.orderRow:first-child .orderLabel { display: none; }.orderRow button { font-size: 12px; padding: 4px; }.orderRow button.current { padding: 3px; }.orderRow button img { width: 24px; height: 24px; }.orderRow button .birthright { width: 26px; }.position { display: none; }.orderLabel { width: auto; }.phaseLabel { width: 100%; margin: 3px 0 0; font-size: 12px; }.emptyOrder { font-size: 11px; }.emergingStates { font-size: 11px; } }
@media (max-width: 350px) { .orderRow:first-child button { gap: 3px; }.orderRow:first-child button > span:not(.position) { max-width: 60px; }.orderRow:first-child button img { width: 20px; height: 20px; }.orderRow:first-child button .birthright { width: 22px; } }
</style>
