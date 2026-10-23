<script setup>
import PlayerMarker from "./PlayerMarker.vue"
import ArtworkCard from "./ArtworkCard.vue"
import { computed, watch } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import * as view from "../js/URRview"
import * as assets from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
const store = useModelStore()
const inspectedPlayer = computed({ get: () => store.viewSettings.inspectedPlayer, set: (index) => { store.viewSettings.inspectedPlayer = index } })
const isSettlement = computed(() => store.gameflow.phase === rf.PHASE_SETTLEMENT)
const showLand = computed(() => {
	if (isSettlement.value || store.gameflow.phase === rf.PHASE_GAME_OVER || inspectedPlayer.value !== null) return true
	const stateId = view.currentStateId(store)
	return store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.developmentStep !== "betweenStates" && !store.gameflow.pendingOffer && stateId !== null && store.players[activePlayer.value].money < rules.maintenanceShortfall(store, stateId)
})

const activePlayer = computed(() => {
	if (inspectedPlayer.value !== null) return inspectedPlayer.value
	if (store.turnDraft.ready && !store.viewSettings.showReplay) return view.displayedTurnOrder(store)[0]
	return store.gameflow.turnOrder[0] ?? store.gameflow.finalPositions?.[0] ?? 0
})
const player = computed(() => store.players[activePlayer.value])
const land = computed(() => rf.ALL_LAND_TYPES.map((type) => {
	const areas = store.board.areas.filter((area) => area.owner === activePlayer.value && area.landType === type)
	return { type, count: areas.length, cityCount: areas.filter((area) => area.isCity).length, value: areas.reduce((sum, area) => sum + rules.landPrice(store, area), 0) }
}))
const nations = computed(() => store.nations.filter((nation) => !nation.isRemoved && nation.ownerType === "player" && nation.owner === activePlayer.value))
const nationIncome = computed(() => nations.value.reduce((sum, nation) => sum + rf.NATION_INCOMES[nation.id], 0))
const states = computed(() => store.states.filter((state) => state.isActive && state.king === activePlayer.value))
const emergingStates = computed(() => store.states.filter((state) => !state.isActive && state.king === activePlayer.value))
function colonized(stateId) { return store.board.areas.filter((area) => area.state === stateId && area.markerOwner !== null).length }
const markers = computed(() => store.board.areas.filter((area) => area.markerOwner === activePlayer.value).length)
const soldMarkers = computed(() => store.board.areas.filter((area) => area.markerOwner === activePlayer.value && area.owner === null).length)
const availableMoney = computed(() => rules.availableMoney(store, activePlayer.value))

watch(activePlayer, () => { store.viewSettings.showOwnedLand = false })
defineExpose({ activePlayer })
function reset() { inspectedPlayer.value = null; store.viewSettings.showOwnedLand = false }
</script>

<template>
	<aside class="holdingsPanel">
		<div v-if="inspectedPlayer !== null" class="inspectionLabel">{{ $t("holdings.inspectingPlayer") }}</div>
		<div class="panelTitle"><b :title="player?.displayName"><PlayerMarker :index="activePlayer" /></b><button class="showOwnedLand" :aria-pressed="store.viewSettings.showOwnedLand" @click="store.viewSettings.showOwnedLand = !store.viewSettings.showOwnedLand">{{ store.viewSettings.showOwnedLand ? $t("holdings.hideMyLand") : $t("holdings.showMyLand") }}</button><button v-if="inspectedPlayer !== null" @click="reset">{{ $t("holdings.followTurn") }}</button></div>
		<div class="money"><span>{{ $t("holdings.privateTreasury") }}</span><b>{{ player?.money ?? 0 }} <small>SPL</small></b></div>
		<div class="reservedMoney" v-if="player && availableMoney < player.money"><b>{{ $t("holdings.available", { amount: availableMoney }) }}</b><span>{{ $t("holdings.reservedForBids", { amount: player.money - availableMoney }) }}</span></div>
		<div class="terrainGrid" v-if="showLand"><div class="terrainRow" v-for="entry in land" :key="entry.type" :title="$t('holdings.landTitle', { land: rf.LAND_NAMES[entry.type], count: entry.count, value: entry.value })"><img :src="assets.getTerrainImage(entry.type)" :alt="rf.LAND_NAMES[entry.type]" /><b>{{ entry.count }}</b><span>{{ rf.LAND_NAMES[entry.type] }}</span><span v-if="entry.cityCount" class="cityCount" :title="entry.cityCount === 1 ? $t('holdings.cityTitleOne', { count: entry.cityCount, land: rf.LAND_NAMES[entry.type].toLowerCase(), total: entry.count }) : $t('holdings.cityTitleMany', { count: entry.cityCount, land: rf.LAND_NAMES[entry.type].toLowerCase(), total: entry.count })"><img :src="assets.getTerrainImage(entry.type, true)" :alt="$t('common.city')" />{{ entry.cityCount }}</span><small v-if="store.gameflow.phase === rf.PHASE_GAME_OVER" class="landValue">{{ entry.value }} SPL</small></div></div>
		<div class="ruledStates" v-if="states.length" :aria-label="$t('holdings.statesRuled')"><small>{{ $t("holdings.statesRuled") }}</small><span v-for="state in states" :key="state.id" :title="rf.STATE_NAMES[state.id]"><img :src="assets.getStateOrderImage(state.id)" alt="" />{{ rf.STATE_NAMES[state.id] }}</span></div>
		<div class="ruledStates emergingStates" v-if="isSettlement && emergingStates.length" :aria-label="$t('holdings.leadingOwnership')"><small>{{ $t("holdings.leadingIn") }}</small><span v-for="state in emergingStates" :key="state.id" :title="$t('holdings.emergingTitle', { state: rf.STATE_NAMES[state.id], count: colonized(state.id), total: rf.LAND_FOR_STATE_TO_ACTIVATE })"><img :src="assets.getStateOrderImage(state.id)" alt="" />{{ rf.STATE_NAMES[state.id] }} · {{ colonized(state.id) }}/{{ rf.LAND_FOR_STATE_TO_ACTIVATE }}</span></div>
		<div class="nationIncome" v-if="nations.length && (isSettlement || store.gameflow.phase === rf.PHASE_DIVIDING_NATIONS)">{{ $t("holdings.nationIncome") }}<b>{{ $t("holdings.perRound", { amount: nationIncome }) }}</b></div>
		<div v-if="nations.length" class="relevantNationArtwork" :class="{ multipleNations: nations.length > 1 }" :aria-label="$t('holdings.ownedNations')"><div class="nationArtwork" v-for="nation in nations" :key="nation.id"><ArtworkCard :src="assets.getNationCardImage(nation.id)" :alt="rf.NATION_NAMES[nation.id]" /></div></div>
		<div class="primogeniture" v-if="isSettlement && activePlayer === (store.gameflow.primogenitureBid?.player ?? store.gameflow.primogeniture)"><img :src="assets.primogenitureImage" :alt="$t('holdings.primogeniture')" /><span>{{ store.gameflow.primogenitureBid ? $t("holdings.primogenitureBid") : $t("holdings.primogeniture") }}<b v-if="store.gameflow.primogenitureBid">{{ store.gameflow.primogenitureBid.amount }} SPL</b></span></div>
		<div v-if="isSettlement && store.board.markerLimit" class="markerCount" :title="$t('holdings.markerTitle', { markers, sold: soldMarkers })"><span>{{ $t("holdings.usedMarkers", { used: markers, limit: store.board.markerLimit }) }}</span></div>
		<div class="assetLine" v-if="isSettlement || store.gameflow.phase === rf.PHASE_GAME_OVER">{{ $t("holdings.assets", { amount: player ? rules.playerAssets(store, activePlayer) : 0 }) }}</div>
	</aside>
</template>

<style scoped>
.holdingsPanel { width: 205px; box-sizing: border-box; background: #fff9df; border: 2px solid #8e805e; border-radius: 7px; padding: 8px; text-align: left; font-size: 16px; font-weight: 400; display: grid; grid-template-columns: minmax(0, 1fr); gap: 5px; align-self: flex-start; }
.panelTitle { display: flex; flex-wrap: wrap; align-items: center; gap: 8px;  font-size: 16px; }
.panelTitle b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.panelTitle button { font: inherit; font-size: 16px; font-weight: 400; flex-shrink: 0; cursor: pointer; }
.money, .assetLine { font-weight: bold; }
.nationArtwork { margin: 3px 0; }.nationArtwork img { width: 100%; }
.money { display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #eee4c9; border-radius: 4px; }.money > span { font-size: 16px; font-weight: 400; }.money b { font-size: 22px; }.money small { font-size: 16px; font-weight: 400; }
.nationIncome { display: flex; justify-content: space-between; gap: 5px; font-size: 16px; font-weight: 400; padding: 4px 0; }.reservedMoney { display: grid; gap: 3px; padding: 4px 7px; font-size: 16px; font-weight: 400; }.reservedMoney span { color: #655a42; font-size: 16px; font-weight: 400; }
.terrainGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 7px 0; }.terrainRow { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 16px; font-weight: 400; }.terrainRow img { width: 40px; height: 40px; border-radius: 3px; }.terrainRow b { position: absolute; top: 24px; right: 0; min-width: 18px; text-align: center; background: #fffdf4; border: 1px solid #aa9b77; border-radius: 9px; font-size: 16px; font-weight: 400; }
.terrainRow .cityCount { display: inline-flex; align-items: center; gap: 3px; font-size: 16px; font-weight: 400; }.terrainRow .cityCount img { width: 20px; height: 20px; }
.ruledStates { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }.ruledStates span { display: inline-flex; align-items: center; gap: 4px; }.ruledStates img { width: 26px; height: 26px; }.primogeniture { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 400; border-top: 1px solid #c4b894; padding-top: 6px; }.primogeniture span { min-width: 0; overflow-wrap: anywhere; }.primogeniture > img { width: 64px; flex-shrink: 0; }.primogeniture b { display: block; font-size: 16px; font-weight: 400; }
summary { cursor: pointer; padding: 4px 0; }
.landValue { font-size: 16px; font-weight: bold; white-space: nowrap; }
.markerCount { display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 400; }
.emergingStates { border-top: 1px solid #c4b894; padding-top: 6px; }.ruledStates small { font-size: 16px; font-weight: 400; color: #655a42; }
.relevantNationArtwork { display: grid; gap: 5px; }
@media (max-width: 1050px) { .panelTitle button { min-height: 40px; font-size: 16px; font-weight: 400; padding: 4px 8px; }summary { min-height: 40px; box-sizing: border-box; padding: 12px 0; } }
.inspectionLabel { font-size: 16px; font-weight: 400; color: #145575; }.showOwnedLand { justify-self: start; font: inherit; padding: 5px 8px; min-height: 32px; background: #fffdf5; border: 1px solid #b3a481; border-radius: 3px; cursor: pointer; }.showOwnedLand[aria-pressed=true] { background: #e1edf5; border-color: #177daf; }
</style>
