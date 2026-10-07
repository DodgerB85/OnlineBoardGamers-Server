<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from "vue"
import * as model from "./js/URRmodel"
import * as rf from "./js/URRreference"
import { currentStateId, phaseStr } from "./js/URRview"
import { checkForLatestData } from "./backend/URR_IO"
import { StartWebSocket } from "./backend/URRwebsocket"
import { getAutomaticAction, canExchangeBarahshum, harvestAmount, maintenanceShortfall } from "./js/URRrules"
import { submitAction, getAutomaticBotAction, canRunBotTurn, submitBotAction } from "./js/URRcontroller"
import { submitAction, endPlayerTurn } from "./js/URRcontroller"

import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import FooterBar from "./components/FooterBar.vue"
import MapArea from "./components/MapArea.vue"
import GameOverview from "./components/GameOverview.vue"
import DevelopmentProgress from "./components/DevelopmentProgress.vue"
import TurnOrder from "./components/TurnOrder.vue"
import TurnControls from "./components/TurnControls.vue"
import GameActions from "./components/GameActions.vue"
import StateStrip from "./components/StateStrip.vue"
import PlayerHoldings from "./components/PlayerHoldings.vue"
import EquipmentSupply from "./components/EquipmentSupply.vue"
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
const holdings = ref(null)
const statusPanels = ref(null)
const actionPanelBody = ref(null)
const selectedArea = ref(null)
const gameActions = ref(null)
const mapAction = ref(null)
const actionTargets = ref([])
const removalArea = ref(null)
const landDraft = ref(null)
const canalPath = ref([])
const digCapacity = ref(null)
const mainArea = ref(null)
const boardBaseWidth = ref(640)
let boardObserver = null

function resizeBoard() {
	const area = mainArea.value
	const styles = getComputedStyle(area)
	const padding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight)
	const sidebars = [...area.querySelectorAll(":scope > aside")]
	const availableWidth = area.clientWidth - padding - sidebars.reduce((width, sidebar) => width + sidebar.offsetWidth, 0) - sidebars.length * parseFloat(styles.gap)
	const overhead = parseFloat(styles.getPropertyValue("--board-overhead"))
	boardBaseWidth.value = Math.min(920, availableWidth, Math.max(460, (window.innerHeight - overhead) * 1.2333))
}

model.initGame()
let updateTimer = null
onMounted(() => {
	boardObserver = new ResizeObserver(resizeBoard)
	boardObserver.observe(mainArea.value)
	window.addEventListener("resize", resizeBoard)
	if (personal.gameID === undefined || personal.pov < -9) return
	StartWebSocket()
	updateTimer = window.setInterval(() => {
		if (!document.hidden && store.gameflow.phase !== rf.PHASE_GAME_OVER) checkForLatestData()
	}, 10000)
})
onBeforeUnmount(() => {
	window.clearInterval(updateTimer)
	boardObserver.disconnect()
	window.removeEventListener("resize", resizeBoard)
})
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
const isBarahshumExchange = computed(() => !personal.haltPlay && !store.viewSettings.showReplay && personal.pov >= 0 && !personal.canPlay() && canExchangeBarahshum(store, personal.pov))
const actingLabel = computed(() => {
	if (store.turnDraft.ready) return `Reviewing: ${store.players[store.turnDraft.player]?.displayName}`
	if (isBarahshumExchange.value) return `Acting: ${store.players[personal.pov].displayName} · Barahshum exchange`
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) return ""
	const player = store.players[store.gameflow.turnOrder[0]]
	const stateId = currentStateId(store)
	const context = store.gameflow.pendingOffer ? "Responding" : store.gameflow.developmentStep === "betweenStates" ? "Next" : "Acting"
	return `${context}: ${stateId === null ? '' : `${rf.STATE_NAMES[stateId]} · `}${player?.displayName || 'Automatic resolution'}`
})
const actionPanelTitle = computed(() => {
	if (store.turnDraft.ready) return "Confirm your turn"
	if (store.gameflow.pendingOffer) return "Agreement requested"
	if (store.gameflow.phase === rf.PHASE_DIVIDING_NATIONS) {
		if (store.gameflow.auction) return `Auction: ${rf.NATION_NAMES[store.gameflow.auction.nation]}`
		const treaty = store.nations.find((nation) => nation.ownerType === null)
		if (treaty) return `Treaty: ${rf.NATION_NAMES[treaty.id]}`
	}
	if (isBarahshumExchange.value) return "Barahshum · free canal"
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
}
function startDig(keepPath = false) {
	store.viewSettings.actionIntent = "dig"
	store.viewSettings.inspectedState = null
	store.viewSettings.showOwnedLand = false
	map.value.startDig(keepPath)
	nextTick(() => map.value.revealBoard())
}
function reviewDig() {
	nextTick(() => {
		const control = document.querySelector(".digAction:not(:disabled)") || document.querySelector(".fittingCrews button")
		control?.focus()
	})
}
function locateNation(id) { map.value.locateArea(store.board.areas.find((area) => area.nation === id).id, true) }
function revealStatus(type) {
	nextTick(() => statusPanels.value.querySelector(type === "player" ? ".holdingsPanel" : ".stateStrip").scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }))
}
watch(() => store.viewSettings.historyArea, (id) => { if (id) map.value.locateArea(id) })
watch([() => store.gameflow.turn, () => store.gameflow.phase, () => store.gameflow.turnOrder[0], () => currentStateId(store), () => store.gameflow.developmentStep, () => store.rain.step, () => store.gameflow.pendingOffer], async () => {
	await nextTick()
	if (actionPanelBody.value) {
		actionPanelBody.value.scrollTop = 0
		actionPanelBody.value.parentElement.scrollTop = 0
	}
})
const automaticAction = computed(() => {
	if (store.viewSettings.showLoader || store.viewSettings.isSaving || store.viewSettings.performingRewind) return null
	return personal.canPlay() ? getAutomaticAction(store) : getAutomaticBotAction()
})
watch(automaticAction, (action) => {
	if (!action) return
	if (canRunBotTurn()) submitBotAction(action)
	else submitAction(action)
}, { immediate: true, flush: "post" })
watch(() => store.turnDraft.revision, () => {
	map.value?.finishDig()
	selectedArea.value = null
	removalArea.value = null
	landDraft.value = null
	mapAction.value = null
	actionTargets.value = []
})
async function finishTurn() {
	if (gameActions.value && !store.turnDraft.ready) return gameActions.value.finishTurn()
	return endPlayerTurn()
}
const automaticAction = computed(() => !store.turnDraft.pauseAutomatic && !store.turnDraft.ready && personal.canPlay() && !store.viewSettings.showLoader && !store.viewSettings.isSaving && !store.viewSettings.performingRewind ? getAutomaticAction(store) : null)
watch(automaticAction, (action) => { if (action) submitAction(action) }, { immediate: true, flush: "post" })

function showDebug() {
	return rf.SUPER_USERS.includes(personal.name) || rf.DEBUG_USERS.includes(personal.name)
}
</script>

<template>
	<TopMenu />
	<div id="wholeMiddleArea" :class="{ historyOpen: store.viewSettings.showHistory }">
		<TopMenuViews />
		<HistoryTab />
		<div id="gameArea">
		<ReplayArea v-if="store.viewSettings.showReplay" />
		<TurnOrder @inspect="revealStatus" />
		<GameOverview @inspect="revealStatus" />
		<div id="mainAreaLessHistory" ref="mainArea" :style="{ '--board-width': `${boardBaseWidth * store.viewSettings.boardZoom}px`, '--board-overhead': `${(showLandMarket ? 390 : 275) + (store.viewSettings.showReplay ? 60 : 0) + (map?.isTracing ? 60 : 0)}px` }">
			<aside ref="statusPanels" class="stateSidebar"><PlayerHoldings ref="holdings" /><StateStrip @inspect="revealStatus" /><EquipmentSupply /></aside>
			<div class="mapContainer">
				<TerrainMarket v-if="showLandMarket" />
				<MapArea ref="map" :selected-hex="selectedArea" :map-action="mapAction" :action-targets="actionTargets" @confirm-action="gameActions?.confirmMapAction()" @cancel-action="gameActions?.cancelMapAction()" :highlighted-player="store.viewSettings.showOwnedLand ? holdings?.activePlayer ?? null : null" :removal-area="removalArea" :land-draft="landDraft" :waiting-player-name="waitingPlayerName" :dig-capacity="digCapacity" @select-area="selectArea" @change-path="canalPath = $event" @review-dig="reviewDig" />
			</div>
			<aside v-if="!store.viewSettings.showReplay" class="actionSidebar">
				<div class="actionPanelHeading"><small class="actingLabel">{{ actingLabel }}</small>{{ actionPanelTitle }}</div>
				<DevelopmentProgress v-if="!store.turnDraft.ready" />
				<div v-if="!store.turnDraft.ready" ref="actionPanelBody" class="actionPanelBody"><NationMarket v-if="store.gameflow.phase === rf.PHASE_DIVIDING_NATIONS" @locate-nation="locateNation" />
				<GameActions v-else ref="gameActions" :key="store.turnDraft.revision" @select-area="selectedArea = $event" @change-map-action="mapAction = $event" @change-action-targets="actionTargets = $event" :selected-area="selectedArea" :path="canalPath" @start-dig="startDig" @clear-path="map.finishDig()" @change-removal="removalArea = $event" @change-land-draft="landDraft = $event" @change-dig-capacity="digCapacity = $event" /></div>
				<TurnControls @end-turn="finishTurn" />
			</aside>
		</div>
		<DebugArea v-if="showDebug() && !store.viewSettings.showReplay" />
		</div>
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
	min-width: 1400px;
	text-align: center;
	min-height: 500px;
}

#mainAreaLessHistory { max-width: 1510px; padding: 12px; box-sizing: border-box; display: flex; align-items: flex-start; justify-content: flex-start; gap: 12px; margin: 0 auto; }
#gameArea { width: 100%; transition: margin-left .5s ease-in-out; }.historyOpen #gameArea { margin-left: 462px; }
.mapContainer { display: flex; flex-direction: column; gap: 12px; min-width: 0; flex: 0 0 var(--board-width); width: var(--board-width); }
.stateSidebar { flex: 0 0 260px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.stateSidebar .holdingsPanel { width: 100%; }
.actionSidebar { flex: 0 0 340px; position: sticky; top: 12px; max-height: calc(100vh - 205px); overflow-y: auto; padding: 12px; box-sizing: border-box; background: #fff9e9; border: 1px solid #aa9b77; border-radius: 5px; }
.actionSidebar .gameActions { margin: 0; padding: 0; border: 0; background: transparent; }
.gameActions button, .nationMarket button { padding: 5px 9px; border: 1px solid #998a67; border-radius: 3px; background: #fffdf4; color: #263b32; }
.gameActions button.primaryAction, .nationMarket button.primaryAction { background: #e3eddb; border-color: #547751; font-weight: bold; }
.gameActions button, .nationMarket button { min-height: 40px; }
.gameActions button:hover:enabled, .nationMarket button:hover:enabled { background: #e3eddb; border-color: #547751; }
.gameActions button:disabled, .nationMarket button:disabled { opacity: .5; }
.actionSidebar .equipmentCard { float: none; display: block; max-width: 100%; width: 100%; margin: 0 0 8px; }
.actionPanelHeading { padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #c4b894; font-size: 17px; font-weight: bold; }
.gameActions input[type=number], .gameActions select, .nationMarket input { min-height: 36px; box-sizing: border-box; font-size: 16px; }

.stateSidebar .holdingsPanel, .stateSidebar .equipmentSupply, .actionSidebar .gameActions, .actionSidebar .nationMarket { font-size: 16px; }
.stateSidebar .panelTitle { font-size: 18px; }.stateSidebar .panelTitle button { font-size: 13px; }
.stateSidebar .money > span, .stateSidebar .nationIncome, .stateSidebar .markerCount, .stateSidebar .reservedMoney, .stateSidebar .primogeniture, .stateSidebar .primogeniture b, .stateSidebar .terrainRow, .stateSidebar .eraCard > span { font-size: 13px; }
.stateSidebar .playerMarker { width: 32px; height: 32px; }.stateSidebar .terrainRow img { width: 48px; height: 48px; }.stateSidebar .terrainRow .cityCount img { width: 28px; height: 28px; }.stateSidebar .ruledStates img { width: 36px; height: 36px; }
.stateSidebar .stateCard { font-size: 14px; }.stateSidebar .stateName b { font-size: 16px; }.stateSidebar .stateMeta { font-size: 13px; white-space: normal; }.stateSidebar .treasuryHeader { flex-basis: 44px; width: 44px; }.stateSidebar .crewTile { width: 36px; height: 36px; }.stateSidebar .crewTile.splitCrew { width: 50px; flex-basis: 50px; }.stateSidebar .landowners img { width: 32px; height: 32px; }
.actionSidebar .piece { width: 32px; height: 32px; }.actionSidebar .selectedLand > img, .actionSidebar .routingWork, .actionSidebar .offeredWork img, .actionSidebar .offerHeading img { width: 46px; height: 46px; }.actionSidebar .selectedOwner img, .actionSidebar .paymentRow img { width: 32px; height: 32px; }.actionSidebar .gameActions small { font-size: 13px; }

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
.actingLabel { display: block; font-size: 12px; font-weight: normal; color: #655a42; margin-bottom: 5px; }
</style>
