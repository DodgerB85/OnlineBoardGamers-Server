<script setup>
import ArtworkCard from "./ArtworkCard.vue"
import { computed } from "vue"
import * as rf from "../js/URRreference"
import * as rules from "../js/URRrules"
import { currentStateId } from "../js/URRview"
import { getTerrainImage, getNationCardImage, getPlayerMarkerImage, getStateOrderImage, primogenitureImage } from "../js/URRassets"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()
const inspectedPlayer = computed({ get: () => store.viewSettings.inspectedPlayer, set: (index) => { store.viewSettings.inspectedPlayer = index } })
const isSettlement = computed(() => store.gameflow.phase === rf.PHASE_SETTLEMENT)
const showLand = computed(() => {
	if (isSettlement.value || store.gameflow.phase === rf.PHASE_GAME_OVER || inspectedPlayer.value !== null) return true
	const stateId = currentStateId(store)
	return store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.developmentStep !== "betweenStates" && !store.gameflow.pendingOffer && stateId !== null && store.players[activePlayer.value].money < rules.maintenanceShortfall(store, stateId)
})

const activePlayer = computed(() => {
	if (inspectedPlayer.value !== null) return inspectedPlayer.value
	const barahshum = store.nations[rf.NATION_BARAHSHUM]
	if (!personal.haltPlay && !store.viewSettings.showReplay && !personal.canPlay() && barahshum.ownerType === "player" && barahshum.owner === personal.pov && rules.canExchangeBarahshum(store, personal.pov)) return personal.pov
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.developmentStep === "betweenStates" && rules.canExchangeBarahshum(store, barahshum.owner)) return barahshum.owner
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

function reset() { inspectedPlayer.value = null }
</script>

<template>
	<aside class="holdingsPanel">
		<div class="panelTitle"><b :title="player?.displayName"><img class="playerMarker" :src="getPlayerMarkerImage(activePlayer)" alt="Ownership marker" /> {{ player?.displayName || "Player" }}</b><button v-if="inspectedPlayer !== null" @click="reset">Follow turn</button></div>
		<div class="money"><span>Private treasury</span><b>{{ player?.money ?? 0 }} <small>SPL</small></b></div>
		<div class="reservedMoney" v-if="player && availableMoney < player.money"><b>{{ availableMoney }} SPL available</b><span>{{ player.money - availableMoney }} SPL reserved for bids</span></div>
		<div class="terrainGrid" v-if="showLand"><div class="terrainRow" v-for="entry in land" :key="entry.type" :title="`${rf.LAND_NAMES[entry.type]}: ${entry.count} lands worth ${entry.value} SPL`"><img :src="getTerrainImage(entry.type)" :alt="rf.LAND_NAMES[entry.type]" /><b>{{ entry.count }}</b><span>{{ rf.LAND_NAMES[entry.type] }}</span><span v-if="entry.cityCount" class="cityCount" :title="`${entry.cityCount} ${rf.LAND_NAMES[entry.type].toLowerCase()} ${entry.cityCount === 1 ? 'city' : 'cities'} included in ${entry.count} lands`"><img :src="getTerrainImage(entry.type, true)" alt="City" />{{ entry.cityCount }}</span><small v-if="store.gameflow.phase === rf.PHASE_GAME_OVER" class="landValue">{{ entry.value }} SPL</small></div></div>
		<div class="ruledStates" v-if="states.length" aria-label="States ruled"><span v-for="state in states" :key="state.id" :title="rf.STATE_NAMES[state.id]"><img :src="getStateOrderImage(state.id)" alt="" />{{ rf.STATE_NAMES[state.id] }}</span></div>
		<div class="ruledStates emergingStates" v-if="isSettlement && emergingStates.length" aria-label="Leading ownership in emerging states"><small>Leading in</small><span v-for="state in emergingStates" :key="state.id" :title="`${rf.STATE_NAMES[state.id]}: current ownership leader; ${colonized(state.id)}/${rf.LAND_FOR_STATE_TO_ACTIVATE} colonized lands`"><img :src="getStateOrderImage(state.id)" alt="" />{{ rf.STATE_NAMES[state.id] }} · {{ colonized(state.id) }}/{{ rf.LAND_FOR_STATE_TO_ACTIVATE }}</span></div>
		<div class="nationIncome" v-if="nations.length && (isSettlement || store.gameflow.phase === rf.PHASE_DIVIDING_NATIONS)">Nation income<b>{{ nationIncome }} SPL / round</b></div>
		<div v-if="nations.length" class="relevantNationArtwork" :class="{ multipleNations: nations.length > 1 }" aria-label="Owned nations"><div class="nationArtwork" v-for="nation in nations" :key="nation.id"><ArtworkCard :src="getNationCardImage(nation.id)" :alt="rf.NATION_NAMES[nation.id]" /></div></div>
		<div class="primogeniture" v-if="isSettlement"><img :src="primogenitureImage" alt="Primogeniture" /><span>{{ store.gameflow.primogenitureBid ? 'Primogeniture bid' : 'Primogeniture' }}<b>{{ store.players[store.gameflow.primogenitureBid?.player ?? store.gameflow.primogeniture]?.displayName }}<template v-if="store.gameflow.primogenitureBid"> · {{ store.gameflow.primogenitureBid.amount }} SPL</template></b></span></div>
		<div v-if="isSettlement && store.board.markerLimit" class="markerCount" :title="`${markers} markers in use; ${soldMarkers} on sold land. Markers on sold land return when it is bought.`"><img class="playerMarker" :src="getPlayerMarkerImage(activePlayer)" alt="Land markers" /><span><b>{{ store.board.markerLimit - markers }} free</b> · {{ markers }}/{{ store.board.markerLimit }} used</span></div>
		<div class="assetLine" v-if="isSettlement || store.gameflow.phase === rf.PHASE_GAME_OVER">Assets: {{ player ? rules.playerAssets(store, activePlayer) : 0 }} SPL</div>
	</aside>
</template>

<style scoped>
.holdingsPanel { width: 205px; box-sizing: border-box; background: #fff9df; border: 2px solid #8e805e; border-radius: 7px; padding: 8px; text-align: left; font-size: 13px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 5px; align-self: flex-start; }
.panelTitle { display: flex; justify-content: space-between; gap: 4px; font-size: 16px; }
.panelTitle b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.panelTitle button { font: inherit; font-size: 11px; flex-shrink: 0; cursor: pointer; }
.money, .assetLine { font-weight: bold; }
.playerMarker { width: 22px; height: 22px; vertical-align: middle; }.nationArtwork { margin: 3px 0; }.nationArtwork img { width: 100%; }
.money { display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #eee4c9; border-radius: 4px; }.money > span { font-size: 11px; }.money b { font-size: 22px; }.money small { font-size: 11px; }
.nationIncome { display: flex; justify-content: space-between; gap: 5px; font-size: 11px; padding: 4px 0; }.reservedMoney { display: grid; gap: 3px; padding: 4px 7px; font-size: 12px; }.reservedMoney span { color: #655a42; font-size: 11px; }
.terrainGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; padding: 7px 0; }.terrainRow { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 10px; }.terrainRow img { width: 40px; height: 40px; border-radius: 3px; }.terrainRow b { position: absolute; top: 24px; right: 0; min-width: 18px; text-align: center; background: #fffdf4; border: 1px solid #aa9b77; border-radius: 9px; font-size: 12px; }
.terrainRow .cityCount { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; }.terrainRow .cityCount img { width: 20px; height: 20px; }
.ruledStates { display: flex; flex-wrap: wrap; gap: 6px; }.ruledStates span { display: inline-flex; align-items: center; gap: 4px; }.ruledStates img { width: 26px; height: 26px; }.primogeniture { display: flex; align-items: center; gap: 8px; font-size: 11px; border-top: 1px solid #c4b894; padding-top: 6px; }.primogeniture span { min-width: 0; overflow-wrap: anywhere; }.primogeniture img { width: 64px; flex-shrink: 0; }.primogeniture b { display: block; font-size: 12px; }
summary { cursor: pointer; padding: 4px 0; }
.landValue { font-size: 11px; font-weight: bold; white-space: nowrap; }
.markerCount { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.emergingStates { align-items: center; font-size: 12px; }.emergingStates small { font-size: 12px; color: #655a42; }
.relevantNationArtwork { display: grid; gap: 5px; }
@media (max-width: 1050px) { .panelTitle button { min-height: 40px; font-size: 12px; padding: 4px 8px; }summary { min-height: 40px; box-sizing: border-box; padding: 12px 0; } }
</style>
