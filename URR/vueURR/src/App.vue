<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from "vue"
import * as model from "./js/URRmodel"
import * as rf from "./js/URRreference"
import { currentStateId, phaseStr } from "./js/URRview"
import { checkForLatestData } from "./backend/URR_IO"
import { StartWebSocket } from "./backend/URRwebsocket"
import { getAutomaticAction, canExchangeBarahshum, harvestAmount, maintenanceShortfall } from "./js/URRrules"
import { submitAction } from "./js/URRcontroller"

import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import FooterBar from "./components/FooterBar.vue"
import MapArea from "./components/MapArea.vue"
import TurnOrder from "./components/TurnOrder.vue"
import GameActions from "./components/GameActions.vue"
import StateStrip from "./components/StateStrip.vue"
import PlayerHoldings from "./components/PlayerHoldings.vue"
import TerrainMarket from "./components/TerrainMarket.vue"
import NationMarket from "./components/NationMarket.vue"
import DebugArea from "./components/DebugArea.vue"
import HistoryTab from "./components/HistoryTab.vue"
import ReplayArea from "./components/ReplayArea.vue"

import { useModelStore } from "./stores/URRstore.js"
import { usePersonalStore } from "./stores/URRpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()

const map = ref(null)
const statusPanels = ref(null)
const actionPanelBody = ref(null)
const selectedArea = ref(null)
const removalArea = ref(null)
const landDraft = ref(null)
const canalPath = ref([])

model.initGame()
let updateTimer = null
onMounted(() => {
	if (personal.gameID === undefined || personal.pov < -9) return
	StartWebSocket()
	updateTimer = window.setInterval(() => {
		if (!document.hidden && store.gameflow.phase !== rf.PHASE_GAME_OVER) checkForLatestData()
	}, 10000)
})
onBeforeUnmount(() => window.clearInterval(updateTimer))
const isActionPanelOpen = ref(store.gameflow.phase !== rf.PHASE_SETTLEMENT)
const waitingPlayerName = computed(() => {
	if (personal.haltPlay || personal.canPlay() || store.gameflow.phase === rf.PHASE_GAME_OVER || canExchangeBarahshum(store, personal.pov)) return null
	return store.players[store.gameflow.turnOrder[0]]?.displayName
})
const showLandMarket = computed(() => {
	if (store.gameflow.phase === rf.PHASE_SETTLEMENT) return true
	const stateId = currentStateId(store)
	if (store.gameflow.phase !== rf.PHASE_DEVELOPMENT || store.gameflow.developmentStep === "betweenStates" || store.gameflow.pendingOffer || stateId === null) return false
	return store.players[store.states[stateId].king].money < maintenanceShortfall(store, stateId)
})
const actionPanelTitle = computed(() => {
	if (store.gameflow.pendingOffer) return "Agreement requested"
	if (store.gameflow.phase === rf.PHASE_DIVIDING_NATIONS) {
		if (store.gameflow.auction) return `Auction: ${rf.NATION_NAMES[store.gameflow.auction.nation]}`
		const treaty = store.nations.find((nation) => nation.ownerType === null)
		if (treaty) return `Treaty: ${rf.NATION_NAMES[treaty.id]}`
	}
	if (!personal.haltPlay && !store.viewSettings.showReplay && personal.pov >= 0 && !personal.canPlay() && canExchangeBarahshum(store, personal.pov)) return "Barahshum · free canal"
	if (map.value?.isTracing) return `Canal draft · ${Math.max(0, canalPath.value.length - 1)} segment${canalPath.value.length === 2 ? "" : "s"}`
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.developmentStep === "eridu") return canalPath.value.length >= 2 ? "Eridu · canal review" : "Eridu · special digging turn"
	const stateId = currentStateId(store)
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.developmentStep === "digging" && canalPath.value.length >= 2) return `${rf.STATE_NAMES[stateId]} · canal review`
	if (stateId !== null && store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.developmentStep !== "betweenStates" && store.players[store.states[stateId].king].money < maintenanceShortfall(store, stateId)) return `${rf.STATE_NAMES[stateId]} · crew funding`
	if (stateId !== null && store.gameflow.phase === rf.PHASE_RAINY_SEASON) {
		if (store.gameflow.endReason) return `${rf.STATE_NAMES[stateId]} · final ${store.rain.step === "harvest" ? "harvest" : "water"}`
		return store.rain.step === "harvest" ? `${rf.STATE_NAMES[stateId]} · harvest ${harvestAmount(store, stateId)} SPL` : `${rf.STATE_NAMES[stateId]} · route water`
	}
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.developmentStep === "betweenStates") return stateId === null ? "Before rainy season" : `Before ${rf.STATE_NAMES[stateId]} development`
	return stateId === null ? phaseStr(store.gameflow.phase) : `${rf.STATE_NAMES[stateId]} · ${phaseStr(store.gameflow.phase)}`
})
function selectArea(id) {
	selectedArea.value = id
	if (id !== null && store.gameflow.phase === rf.PHASE_SETTLEMENT) store.viewSettings.inspectedState = store.board.areas.find((area) => area.id === id).state
	if (id !== null && !map.value.isTracing) isActionPanelOpen.value = true
	if (id !== null && isActionPanelOpen.value && window.matchMedia("(max-width: 1050px)").matches) nextTick(() => map.value.revealSelection())
}
function startDig(keepPath = false) {
	map.value.startDig(keepPath)
	isActionPanelOpen.value = false
	if (window.matchMedia("(max-width: 1050px)").matches) nextTick(() => map.value.revealBoard())
}
function reviewDig() {
	isActionPanelOpen.value = true
	nextTick(() => {
		if (window.matchMedia("(max-width: 1050px)").matches) map.value.revealSelection()
		const control = document.querySelector(".digAction:not(:disabled)") || document.querySelector(".fittingCrews button") || document.querySelector(".actionPanelToggle")
		control?.focus()
	})
}
function locateNation(id) { map.value.locateArea(store.board.areas.find((area) => area.nation === id).id, true) }
function revealStatus(type) {
	if (!window.matchMedia("(max-width: 1050px)").matches) return
	isActionPanelOpen.value = false
	nextTick(() => statusPanels.value.querySelector(type === "player" ? ".holdingsPanel" : ".stateStrip").scrollIntoView({ block: "center", behavior: "smooth" }))
}
watch([() => store.gameflow.phase, () => store.gameflow.turnOrder[0]], () => { isActionPanelOpen.value = store.gameflow.phase !== rf.PHASE_SETTLEMENT })
watch([() => store.gameflow.turn, () => store.gameflow.phase, () => store.gameflow.turnOrder[0], () => currentStateId(store), () => store.gameflow.developmentStep, () => store.rain.step, () => store.gameflow.pendingOffer], async () => {
	await nextTick()
	if (actionPanelBody.value) {
		actionPanelBody.value.scrollTop = 0
		actionPanelBody.value.parentElement.scrollTop = 0
	}
})
watch(() => [store.viewSettings.showInfo, store.viewSettings.showNotes, store.viewSettings.showBug], (panels) => {
	if (panels.some(Boolean) && window.matchMedia("(max-width: 1050px)").matches) isActionPanelOpen.value = false
})
const automaticAction = computed(() => personal.canPlay() && !store.viewSettings.showLoader && !store.viewSettings.isSaving && !store.viewSettings.performingRewind ? getAutomaticAction(store) : null)
watch(automaticAction, (action) => { if (action) submitAction(action) }, { immediate: true, flush: "post" })

function showDebug() {
	return rf.SUPER_USERS.includes(personal.name) || rf.DEBUG_USERS.includes(personal.name)
}
</script>

<template>
	<TopMenu />
	<div id="wholeMiddleArea" :class="{ actionsOpen: isActionPanelOpen && !store.viewSettings.showReplay, gameFinished: store.gameflow.phase === rf.PHASE_GAME_OVER }">
		<TopMenuViews />
		<HistoryTab />
		<ReplayArea v-if="store.viewSettings.showReplay" />
		<TurnOrder @inspect="revealStatus" @browse-states="isActionPanelOpen = false" />
		<div id="mainAreaLessHistory" :style="{ '--board-overhead': `${(showLandMarket ? 390 : 275) + (store.viewSettings.showReplay ? 60 : 0) + (map?.isTracing ? 60 : 0)}px` }">
			<aside ref="statusPanels" class="stateSidebar"><button class="statusNavigation" @click="map.revealBoard()">Back to board ↑</button><PlayerHoldings /><StateStrip @inspect="revealStatus" /></aside>
			<div class="mapContainer">
				<TerrainMarket v-if="showLandMarket" />
				<MapArea ref="map" :removal-area="removalArea" :land-draft="landDraft" :waiting-player-name="waitingPlayerName" @select-area="selectArea" @change-path="canalPath = $event" @review-dig="reviewDig" />
			</div>
			<aside v-if="!store.viewSettings.showReplay" class="actionSidebar" :class="{ isOpen: isActionPanelOpen, isFinished: store.gameflow.phase === rf.PHASE_GAME_OVER }">
				<button class="actionPanelToggle" @click="isActionPanelOpen = !isActionPanelOpen" :aria-expanded="isActionPanelOpen">{{ actionPanelTitle }}<span>{{ isActionPanelOpen ? 'Hide' : 'Show actions' }}</span></button>
				<div ref="actionPanelBody" class="actionPanelBody"><NationMarket v-if="store.gameflow.phase === rf.PHASE_DIVIDING_NATIONS" @locate-nation="locateNation" />
				<GameActions v-else :selected-area="selectedArea" :path="canalPath" @start-dig="startDig" @clear-path="map.finishDig()" @change-removal="removalArea = $event" @change-land-draft="landDraft = $event" /></div>
			</aside>
		</div>
		<DebugArea v-if="showDebug() && !store.viewSettings.showReplay" />
	</div>
	<FooterBar />
	<div class="saveStatus" v-if="store.viewSettings.isSaving || store.viewSettings.isSavingNotes || store.viewSettings.isSendingChat" role="status">{{ store.viewSettings.isSaving ? 'Saving…' : store.viewSettings.isSavingNotes ? 'Saving notes…' : 'Sending chat…' }}</div>

	<div id="loaderOverlay" v-if="store.viewSettings.showLoader">
		<div id="loadingText">Loading........</div>
	</div>
</template>

<style>
body {
	margin: 0px !important;
	background-color: #e9e2d2;
	color: #302f27;
	font-family: Arial, sans-serif;
	font-size: 16px;
}

#wholeMiddleArea {
	width: 100%;
	text-align: center;
	min-height: 500px;
}

#mainAreaLessHistory { max-width: 1510px; padding: 12px; box-sizing: border-box; display: flex; align-items: flex-start; justify-content: center; gap: 12px; margin: 0 auto; }
.mapContainer { display: flex; flex-direction: column; gap: 12px; min-width: 0; flex: 1 1 920px; max-width: 920px; }
.stateSidebar { flex: 0 0 235px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.stateSidebar .holdingsPanel { width: 100%; }
.actionSidebar { flex: 0 0 310px; position: sticky; top: 12px; max-height: calc(100vh - 205px); overflow-y: auto; padding: 12px; box-sizing: border-box; background: #fff9e9; border: 1px solid #aa9b77; border-radius: 5px; }
.actionSidebar .gameActions { margin: 0; padding: 0; border: 0; background: transparent; }
.gameActions button, .nationMarket button { padding: 5px 9px; border: 1px solid #998a67; border-radius: 3px; background: #fffdf4; color: #263b32; }
.gameActions button.primaryAction, .nationMarket button.primaryAction { background: #e3eddb; border-color: #547751; font-weight: bold; }
.gameActions button, .nationMarket button { min-height: 30px; }
.gameActions button:hover:enabled, .nationMarket button:hover:enabled { background: #e3eddb; border-color: #547751; }
.gameActions button:disabled, .nationMarket button:disabled { opacity: .5; }
@media (min-width: 1051px) { .mapContainer { max-width: min(920px, max(460px, calc((100vh - var(--board-overhead)) * 1.2333))); }.actionSidebar .equipmentCard { float: none; display: block; max-width: 100%; width: 100%; margin: 0 0 8px; } }
.actionPanelToggle { display: none; }
.statusNavigation { display: none; }
@media (min-width: 1051px) and (max-width: 1250px) { #mainAreaLessHistory { padding: 8px; gap: 8px; }.stateSidebar { flex-basis: 190px; }.actionSidebar { flex-basis: 270px; }.terrainRow img { width: 32px; height: 32px; } }
@media (min-width: 1051px) and (max-width: 1250px), (min-width: 1051px) and (max-height: 800px) { .actionSidebar .equipmentCard { float: right; width: 110px; max-width: 40%; margin: 0 0 8px 10px; } }
@media (max-width: 1050px) {
 .gameActions button, .nationMarket button { min-height: 40px; }
 .gameActions input[type=number], .gameActions select, .nationMarket input { min-height: 36px; box-sizing: border-box; font-size: 16px; }
 #wholeMiddleArea { padding-bottom: 60px; }
 #wholeMiddleArea.actionsOpen { padding-bottom: calc(45vh + 12px); }
 #mainAreaLessHistory { flex-wrap: wrap; }
 .mapContainer { order: -1; flex-basis: 100%; }
 .stateSidebar { flex: 1 1 100%; max-width: none; min-width: 0; flex-direction: row; flex-wrap: wrap; }
 .statusNavigation { display: block; position: sticky; top: 8px; z-index: 2; flex: 1 1 100%; min-height: 40px; padding: 7px; border: 1px solid #aa9b77; border-radius: 4px; background: #fff9df; color: #302f27; font: inherit; font-size: 13px; cursor: pointer; }
 .stateSidebar .holdingsPanel, .stateSidebar .stateStrip { flex: 1 1 235px; max-width: 360px; }
 .actionSidebar { position: fixed; inset: auto 8px 8px; max-height: 45vh; width: auto; max-width: none; padding: 0; overflow: hidden; z-index: 100; box-shadow: 0 2px 10px #6b614a66; }
 .actionPanelToggle { display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%; box-sizing: border-box; border: 0; background: #f7edc7; color: #302f27; padding: 12px; font: inherit; font-size: 14px; font-weight: bold; cursor: pointer; }
 .actionPanelToggle span { font-size: 12px; font-weight: normal; }
 .actionPanelBody { display: none; padding: 10px; overflow-y: auto; scroll-padding-bottom: 76px; max-height: calc(45vh - 45px); box-sizing: border-box; }
 .actionSidebar.isOpen .actionPanelBody { display: block; }
 #wholeMiddleArea.gameFinished { padding-bottom: 0; }
 .actionSidebar.isFinished { position: static; flex: 1 1 100%; width: 100%; max-height: none; box-shadow: none; }
 .actionSidebar.isFinished .actionPanelToggle { display: none; }
 .actionSidebar.isFinished .actionPanelBody { display: block; max-height: none; overflow: visible; }
}

#loaderOverlay {
	position: fixed;
	inset: 0;
	background: rgba(255, 255, 255, 0.6);
	z-index: 9999;
}

.saveStatus { position: fixed; right: 12px; bottom: 12px; padding: 6px 12px; background: #fff9df; border: 1px solid #8e805e; border-radius: 4px; font-size: 13px; z-index: 10000; pointer-events: none; }

#loaderOverlay #loadingText {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	font-size: 36px;
}
</style>
