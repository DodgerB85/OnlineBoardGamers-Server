<script setup>
import { computed, nextTick, watch } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import * as view from "../js/URRview"
import * as assets from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const emit = defineEmits(["inspect"])
const currentPlayer = computed(() => view.displayedTurnOrder(store)[0])
const isGameOver = computed(() => store.gameflow.phase === rf.PHASE_GAME_OVER)
const playerOrder = computed(() => {
	if (isGameOver.value) return store.gameflow.finalPositions
	const order = store.gameflow.fullTurnOrder
	const first = store.gameflow.phase === rf.PHASE_DIVIDING_NATIONS ? 0 : order.indexOf(store.gameflow.primogeniture)
	return [...order.slice(first), ...order.slice(0, first)]
})
const stateOrder = computed(() => store.gameflow.phase === rf.PHASE_SETTLEMENT ? rules.getDevelopmentOrder(store) : store.gameflow.stateOrder.filter((id) => store.states[id].isActive))
const currentState = computed(() => view.currentStateId(store))
const stateOrderLabel = computed(() => store.gameflow.phase === rf.PHASE_RAINY_SEASON ? "Harvest order" : "States")
const stateOrderExplanation = computed(() => store.gameflow.phase === rf.PHASE_RAINY_SEASON ? "Harvests follow the order set when development began. Water decisions follow the river and pump branches." : store.gameflow.phase === rf.PHASE_SETTLEMENT ? "Left of the bar: states that will develop, fewest player-owned lands first. Right of the bar: states emerging after settlement, with colonized lands out of 6." : "Development order was fixed at the start of the phase: fewest player-owned lands first; ties follow the printed board order.")
function hasCompletedState(id) {
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT) return store.gameflow.stateOrder.indexOf(id) < store.gameflow.stateIndex
	return store.gameflow.phase === rf.PHASE_RAINY_SEASON && store.rain.step === "harvest" && !store.rain.harvestOrder.includes(id)
}
const exchangeOwner = computed(() => {
	const nation = store.nations[rf.NATION_BARAHSHUM]
	return 	nation.ownerType === "player" && nation.owner !== store.gameflow.turnOrder[0] && rules.canExchangeBarahshum(store, nation.owner) ? nation.owner : null
})
const colonized = (id) => store.board.areas.filter((area) => area.state === id && area.markerOwner !== null).length
const emergingStates = computed(() => store.states.filter((state) => !state.isActive))
function inspectPlayer(index) {
	store.viewSettings.inspectedPlayer = store.viewSettings.inspectedPlayer === index ? null : index
	if (store.viewSettings.inspectedPlayer !== null) emit("inspect", "player")
}
function inspectState(index) {
	store.viewSettings.inspectedState = store.viewSettings.inspectedState === index ? null : index
	if (store.viewSettings.inspectedState !== null) emit("inspect", "state")
}
watch([() => currentPlayer.value, () => store.gameflow.phase, () => currentState.value], () => {
	store.viewSettings.inspectedPlayer = null
	store.viewSettings.showOwnedLand = false
	store.viewSettings.inspectedState = null
})
</script>

<template>
	<section class="turnOrder" aria-label="Turn order">
		<div class="orderRow" role="group" :aria-label="isGameOver ? 'Final standings' : 'Player order'">
			<b class="orderLabel">{{ isGameOver ? 'Standings' : 'Players' }}</b>
			<button v-for="(index, position) in playerOrder" :key="index" class="playerOrderButton" :class="{ current: !isGameOver && currentPlayer === index, opportunity: exchangeOwner === index, inspected: store.viewSettings.inspectedPlayer === index }" :title="exchangeOwner === index ? `${store.players[index].displayName}: optional Barahshum canal exchange` : store.players[index].displayName" :aria-current="!isGameOver && currentPlayer === index ? 'step' : undefined" :aria-pressed="store.viewSettings.inspectedPlayer === index" @click="inspectPlayer(index)">
				<span class="position">{{ position + 1 }}</span><img :src="assets.getPlayerMarkerImage(index)" alt="" /><span>{{ store.players[index].displayName }}<small>{{ isGameOver ? store.players[index].score : store.players[index].money }} SPL{{ isGameOver ? ' assets' : '' }}</small><small v-if="store.gameflow.phase === rf.PHASE_DIVIDING_NATIONS && rules.availableMoney(store, index) < store.players[index].money" :title="`${store.players[index].money} SPL total; only highest bids reserve money`">{{ rules.availableMoney(store, index) }} available · {{ store.players[index].money - rules.availableMoney(store, index) }} reserved</small><small v-if="exchangeOwner === index" class="exchangeCue">Barahshum</small></span><img v-if="!isGameOver && store.gameflow.primogeniture === index" class="birthright" :src="assets.primogenitureImage" alt="Primogeniture" title="Primogeniture" />
			</button>
			<button class="overviewToggle" :aria-expanded="store.viewSettings.showOverview" @click="store.viewSettings.showOverview = !store.viewSettings.showOverview">Overview</button>
			<span class="phaseLabel">Turn {{ store.gameflow.turn }} · {{ view.phaseStr(store.gameflow.phase) }} · Era {{ store.era === 5 ? 'M' : store.era }}<b v-if="store.gameflow.endReason && !isGameOver" class="finalRound">Final round</b></span>
		</div>
		<div class="orderRow" role="group" :aria-label="stateOrderLabel">
			<b class="orderLabel" :title="stateOrderExplanation">{{ stateOrderLabel }}</b>
			<button v-for="(id, position) in stateOrder" :key="id" :class="{ current: currentState === id, completed: hasCompletedState(id), inspected: store.viewSettings.inspectedState === id }" :aria-current="currentState === id ? 'step' : undefined" :aria-pressed="store.viewSettings.inspectedState === id" @click="inspectState(id)">
				<span class="position">{{ position + 1 }}</span><img :src="assets.getStateOrderImage(id)" alt="" /><span>{{ rf.STATE_NAMES[id] }}<small>{{ store.states[id].money }} SPL</small></span><span v-if="hasCompletedState(id)" class="doneMark" role="img" :aria-label="store.gameflow.phase === rf.PHASE_DEVELOPMENT ? 'Development complete' : 'Harvest complete'">✓</span>
			</button>
			<span v-if="!stateOrder.length" class="emptyOrder">None yet</span>
			<template v-if="emergingStates.length"><span class="orderDivider" aria-hidden="true">|</span>
			<button v-for="state in emergingStates" :key="state.id" class="emergingState" :class="{ ready: colonized(state.id) >= rf.LAND_FOR_STATE_TO_ACTIVATE, inspected: store.viewSettings.inspectedState === state.id }" :aria-pressed="store.viewSettings.inspectedState === state.id" :title="`${rf.STATE_NAMES[state.id]}: emerges with ${rf.LAND_FOR_STATE_TO_ACTIVATE} colonized lands`" @click="inspectState(state.id)"><img :src="assets.getStateOrderImage(state.id)" alt="" /><span>{{ rf.STATE_NAMES[state.id] }}<small>{{ colonized(state.id) }}/{{ rf.LAND_FOR_STATE_TO_ACTIVATE }} lands{{ colonized(state.id) >= rf.LAND_FOR_STATE_TO_ACTIVATE ? ' · ready' : '' }}</small></span></button></template>
		</div>
	</section>
</template>

<style scoped>
.turnOrder { margin: 10px 0 0; padding: 0 var(--page-margin); box-sizing: border-box; text-align: left; }
.orderRow { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 4px 8px; background: #f7f0dd; border: 1px solid #b3a481; }.orderRow:first-child { border-radius: 5px 5px 0 0; }.orderRow + .orderRow { border-top: 0; border-radius: 0 0 5px 5px; }
.orderLabel { width: 87px; font-size: 16px; font-weight: 400; }.orderRow button { display: inline-flex; align-items: center; gap: 5px; text-align: left; font: inherit; font-size: 16px; font-weight: 400; padding: 4px 7px; border: 1px solid #b3a481; border-radius: 4px; background: #fffdf5; color: #302f27; cursor: pointer; }.orderRow button img { width: 29px; height: 29px; }.orderRow button { max-width: 100%; box-sizing: border-box; }.orderRow button > span:not(.position) { display: block; min-width: 0; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.orderRow button small { display: block; font-size: 16px; font-weight: 400; color: #625940; }.orderRow button.current { border: 2px solid #527349; background: #edf5e4; padding: 3px 6px; }.orderRow button.inspected { outline: 2px solid #177daf; }.orderRow button .birthright { width: 33px; height: 23px; object-fit: contain; }.position { font-size: 16px; font-weight: 400; color: #786d54; }.phaseLabel { margin-left: auto; font-size: 16px; font-weight: 400; }.emptyOrder { font-size: 16px; font-weight: 400; color: #786d54; }
.orderDivider { font-size: 22px; font-weight: 400; color: #786d54; padding: 0 4px; }.orderRow button.emergingState { border-style: dashed; background: transparent; }.orderRow button.emergingState.ready { border-style: solid; background: #edf5e4; }
.orderRow button.opportunity { border-color: #8758a8; background: #f3eafa; }.orderRow button .exchangeCue { color: #70478e; font-size: 16px; font-weight: 400; }
@media (max-width: 1050px) { .orderRow button { min-height: 40px; } }
.orderRow button.completed { background: #eeeadf; }.orderRow button .doneMark { flex-shrink: 0; color: #527349; font-size: 16px; font-weight: 400; }
.finalRound { display: inline-block; margin-left: 8px; padding: 2px 6px; border: 1px solid #a75a24; border-radius: 3px; background: #f6e3cf; color: #663716; font-size: 16px; font-weight: 400; }
.orderRow:first-child { align-items: center; }
.orderRow .playerOrderButton { min-width: 220px; justify-content: flex-start; }
.orderRow .playerOrderButton > span:not(.position) { max-width: none; }
.orderRow .playerOrderButton small { white-space: nowrap; }
.orderRow .playerOrderButton .exchangeCue { display: inline; margin-left: 8px; }
.orderRow .playerOrderButton > span:not(.position) small:first-of-type { display: inline; margin-left: 8px; }
</style>
