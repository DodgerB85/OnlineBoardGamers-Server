<script setup>
import { nextTick } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import * as view from "../js/URRview"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const emit = defineEmits(["inspect"])
function inspect(type, id) {
	store.viewSettings[type === "state" ? "inspectedState" : "inspectedPlayer"] = id
	emit("inspect", type)
}
function close() {
	store.viewSettings.showOverview = false
	nextTick(() => document.querySelector(".overviewToggle").focus({ preventScroll: true }))
}
function stateOrder(id) {
	const order = store.gameflow.phase === rf.PHASE_SETTLEMENT ? rules.getDevelopmentOrder(store) : store.gameflow.stateOrder
	const index = order.indexOf(id)
	return index < 0 ? '—' : index + 1
}
function hasEridu(id) { return store.nations.some((nation) => nation.id === rf.NATION_ERIDU && !nation.isRemoved && nation.ownerType === "state" && nation.owner === id) }
</script>

<template>
	<section v-if="store.viewSettings.showOverview" class="gameOverview" aria-label="Game overview">
		<div class="overviewHeading"><b>Overview</b><button @click="close">Close overview</button></div>
		<div class="overviewTables">
			<div class="tableScroll"><table class="statesTable">
				<caption>States · money in SPL</caption>
				<thead><tr><th scope="col">State</th><th scope="col">Monarch / leader</th><th scope="col">Treasury</th><th scope="col">Owned lands</th><th scope="col">Crews</th><th scope="col">Harvest</th><th scope="col">Order</th></tr></thead>
				<tbody><tr v-for="state in store.states" :key="state.id" :class="{ current: view.currentStateId(store) === state.id }">
					<th scope="row"><button @click="inspect('state', state.id)">{{ rf.STATE_NAMES[state.id] }}</button><small v-if="!state.isActive">Emerging</small></th>
					<td><button v-if="state.king !== null" @click="inspect('player', state.king)">{{ store.players[state.king].displayName }}</button><span v-else>—</span></td>
					<td>{{ state.money }}</td><td>{{ rules.ownedLand(store, state.id).length }}</td><td>{{ state.diggers.length }}<span v-if="hasEridu(state.id)" title="Eridu special crew"> + Eridu</span></td><td>{{ state.isActive ? rules.harvestAmount(store, state.id) : '—' }}</td><td>{{ stateOrder(state.id) }}</td>
				</tr></tbody>
			</table></div>
			<div class="tableScroll"><table>
				<caption>Player ownership · owned lands per state (excludes sold land)</caption>
				<thead><tr><th scope="col">Player</th><th scope="col">Private cash</th><th scope="col">Assets</th><th v-for="state in store.states" :key="state.id" scope="col"><button @click="inspect('state', state.id)">{{ rf.STATE_NAMES[state.id] }}</button></th></tr></thead>
				<tbody><tr v-for="(player, index) in store.players" :key="index"><th scope="row"><button @click="inspect('player', index)">{{ player.displayName }}</button></th><td>{{ player.money }}</td><td>{{ rules.playerAssets(store, index) }}</td><td v-for="state in store.states" :key="state.id" :class="{ monarch: state.king === index }" :title="state.king === index ? state.isActive ? 'Monarch' : 'Ownership leader' : undefined">{{ rules.ownedLand(store, state.id, index).length }}<span v-if="state.king === index" aria-label="Ownership leader"> ★</span></td></tr></tbody>
			</table></div>
		</div>
	</section>
</template>

<style scoped>
.gameOverview { max-width: 1486px; margin: 10px auto 0; padding: 10px; background: #fff9df; border: 1px solid #b3a481; border-radius: 5px; box-sizing: border-box; text-align: left; font-size: 13px; }.overviewHeading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }.overviewTables { display: flex; flex-wrap: wrap; gap: 12px; }.tableScroll { max-width: 100%; overflow-x: auto; flex: 1 1 600px; }table { width: 100%; border-collapse: collapse; }caption { text-align: left; padding: 5px; font-weight: bold; }th, td { padding: 5px; border: 1px solid #d1c5a6; text-align: right; }th { background: #f7f0dd; }th:first-child, .statesTable td:nth-child(2) { text-align: left; }small { display: block; font-weight: normal; color: #655a42; }.current { background: #edf5e4; }.monarch { font-weight: bold; color: #42653b; }button { font: inherit; color: #302f27; background: #fffdf5; border: 1px solid #b3a481; border-radius: 3px; padding: 5px; cursor: pointer; min-height: 32px; }
</style>
