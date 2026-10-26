<script setup>
import PlayerMarker from "./PlayerMarker.vue"
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
	<section v-if="store.viewSettings.showOverview" class="gameOverview" :aria-label="$t('overview.aria')">
		<div class="overviewHeading"><b>{{ $t("overview.title") }}</b><button @click="close">{{ $t("overview.close") }}</button></div>
		<div class="overviewTables">
			<div class="tableScroll"><table class="statesTable">
				<caption><CurrencyText :text="$t('overview.statesCaption')" /></caption>
				<thead><tr><th scope="col">{{ $t("overview.state") }}</th><th scope="col">{{ $t("overview.monarchLeader") }}</th><th scope="col">{{ $t("overview.treasury") }}</th><th scope="col">{{ $t("overview.ownedLands") }}</th><th scope="col">{{ $t("overview.crews") }}</th><th scope="col">{{ $t("overview.harvest") }}</th><th scope="col">{{ $t("overview.order") }}</th></tr></thead>
				<tbody><tr v-for="state in store.states" :key="state.id" :class="{ current: view.currentStateId(store) === state.id }">
					<th scope="row"><button @click="inspect('state', state.id)">{{ rf.STATE_NAMES[state.id] }}</button><small v-if="!state.isActive">{{ $t("overview.emerging") }}</small></th>
					<td><button v-if="state.king !== null" @click="inspect('player', state.king)"><PlayerMarker :index="state.king" /></button><span v-else>—</span></td>
					<td>{{ state.money }}</td><td>{{ rules.ownedLand(store, state.id).length }}</td><td>{{ state.diggers.length }}<span v-if="hasEridu(state.id)" :title="$t('overview.eriduCrew')"> + {{ $t("nationName.eridu") }}</span></td><td>{{ state.isActive ? rules.harvestAmount(store, state.id) : '—' }}</td><td>{{ stateOrder(state.id) }}</td>
				</tr></tbody>
			</table></div>
			<div class="tableScroll"><table>
				<caption>{{ $t("overview.playersCaption") }}</caption>
				<thead><tr><th scope="col">{{ $t("overview.player") }}</th><th scope="col">{{ $t("overview.privateCash") }}</th><th scope="col">{{ $t("overview.assets") }}</th><th v-for="state in store.states" :key="state.id" scope="col"><button @click="inspect('state', state.id)">{{ rf.STATE_NAMES[state.id] }}</button></th></tr></thead>
				<tbody><tr v-for="(player, index) in store.players" :key="index"><th scope="row"><button @click="inspect('player', index)"><PlayerMarker :index="index" /></button></th><td>{{ player.money }}</td><td>{{ rules.playerAssets(store, index) }}</td><td v-for="state in store.states" :key="state.id" :class="{ monarch: state.king === index }" :title="state.king === index ? state.isActive ? $t('overview.monarch') : $t('overview.ownershipLeader') : undefined">{{ rules.ownedLand(store, state.id, index).length }}<span v-if="state.king === index" :aria-label="$t('overview.ownershipLeader')"> ★</span></td></tr></tbody>
			</table></div>
		</div>
	</section>
</template>

<style scoped>
.gameOverview { margin: 10px var(--page-margin) 0; padding: 10px; background: #fff9df; border: 1px solid #b3a481; border-radius: 5px; box-sizing: border-box; text-align: left; font-size: 16px; font-weight: 400; }.overviewHeading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }.overviewTables { display: flex; flex-wrap: wrap; gap: 12px; }.tableScroll { max-width: 100%; overflow-x: auto; flex: 1 1 600px; }table { width: 100%; border-collapse: collapse; }caption { text-align: left; padding: 5px; font-weight: bold; }th, td { padding: 5px; border: 1px solid #d1c5a6; text-align: right; }th { background: #f7f0dd; }th:first-child, .statesTable td:nth-child(2) { text-align: left; }small { display: block; font-weight: normal; color: #655a42; }.current { background: #edf5e4; }.monarch { font-weight: bold; color: #42653b; }button { font: inherit; color: #302f27; background: #fffdf5; border: 1px solid #b3a481; border-radius: 3px; padding: 5px; cursor: pointer; min-height: 32px; }
</style>
