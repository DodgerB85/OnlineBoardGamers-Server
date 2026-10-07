<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from "vue"
import * as model from "./js/URRmodel"
import * as rf from "./js/URRreference"
import * as view from "./js/URRview"
import * as IO from "./backend/URR_IO"
import * as WS from "./backend/URRwebsocket"
import * as rules from "./js/URRrules"
import * as controller from "./js/URRcontroller"

import PlayerMarker from "./components/PlayerMarker.vue"
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

const isWelcomeDismissed = ref(false)
const isNationDivision = computed(() => (store.turnDraft.ready ? store.turnDraft.start.state.gameflow.phase : store.gameflow.phase) === rf.PHASE_DIVIDING_NATIONS && !store.viewSettings.showReplay)
const mapPreview = ref(null)
const isMapPreviewOpen = ref(false)
function openMapPreview() {
	mapPreview.value.showModal()
	isMapPreviewOpen.value = true
}
function closeMapPreview() {
	mapPreview.value.close()
	isMapPreviewOpen.value = false
}
watch(isNationDivision, () => { if (isMapPreviewOpen.value) closeMapPreview() })
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
const turnAction = ref(null)
const canalPath = ref([])
const digCapacity = ref(null)
const mainArea = ref(null)
const boardBaseWidth = ref(640)
let boardObserver = null

function resizeBoard() {
	const area = mainArea.value
	if (isNationDivision.value) return
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
	WS.StartWebSocket()
	updateTimer = window.setInterval(() => {
		if (!document.hidden && store.gameflow.phase !== rf.PHASE_GAME_OVER) IO.checkForLatestData()
	}, 10000)
})
onBeforeUnmount(() => {
	window.clearInterval(updateTimer)
	boardObserver.disconnect()
	window.removeEventListener("resize", resizeBoard)
})
const waitingPlayerIndex = computed(() => {
	if (personal.haltPlay || personal.canPlay() || store.gameflow.phase === rf.PHASE_GAME_OVER || rules.canExchangeBarahshum(store, personal.pov)) return null
	return view.displayedTurnOrder(store)[0] ?? null
})
const showLandMarket = computed(() => {
	if (store.gameflow.phase === rf.PHASE_SETTLEMENT) return true
	const stateId = view.currentStateId(store)
	if (store.gameflow.phase !== rf.PHASE_DEVELOPMENT || store.gameflow.developmentStep === "betweenStates" || store.gameflow.pendingOffer || stateId === null) return false
	return store.players[store.states[stateId].king].money < rules.maintenanceShortfall(store, stateId)
})
const isBarahshumExchange = computed(() => !personal.haltPlay && !store.viewSettings.showReplay && personal.pov >= 0 && !personal.canPlay() && rules.canExchangeBarahshum(store, personal.pov))
const actingPlayer = computed(() => store.turnDraft.ready ? store.turnDraft.player : isBarahshumExchange.value ? personal.pov : view.displayedTurnOrder(store)[0])
const actingLabel = computed(() => {
	if (store.turnDraft.ready) return "Reviewing:"
	if (isBarahshumExchange.value) return "Acting: Barahshum exchange"
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) return ""
	const player = store.players[store.gameflow.turnOrder[0]]
	const stateId = view.currentStateId(store)
	const context = store.gameflow.pendingOffer ? "Responding" : store.gameflow.developmentStep === "betweenStates" ? "Next" : "Acting"
	return `${context}: ${stateId === null ? '' : `${rf.STATE_NAMES[stateId]} · `}${player ? '' : 'Automatic resolution'}`
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
	const stateId = view.currentStateId(store)
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.developmentStep === "digging" && canalPath.value.length >= 2) return `${rf.STATE_NAMES[stateId]} · canal review`
	if (stateId !== null && store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.developmentStep !== "betweenStates" && store.players[store.states[stateId].king].money < rules.maintenanceShortfall(store, stateId)) return `${rf.STATE_NAMES[stateId]} · crew funding`
	if (stateId !== null && store.gameflow.phase === rf.PHASE_RAINY_SEASON) {
		if (store.gameflow.endReason) return `${rf.STATE_NAMES[stateId]} · final ${store.rain.step === "harvest" ? "harvest" : "water"}`
		return store.rain.step === "harvest" ? `${rf.STATE_NAMES[stateId]} · harvest ${rules.harvestAmount(store, stateId)} SPL` : `${rf.STATE_NAMES[stateId]} · route water`
	}
	if (store.gameflow.phase === rf.PHASE_DEVELOPMENT && store.gameflow.developmentStep === "betweenStates") return stateId === null ? "Before rainy season" : `Before ${rf.STATE_NAMES[stateId]} development`
	return stateId === null ? view.phaseStr(store.gameflow.phase) : `${rf.STATE_NAMES[stateId]} · ${view.phaseStr(store.gameflow.phase)}`
})
function selectArea(id) {
	selectedArea.value = id
	if (id !== null && store.gameflow.phase === rf.PHASE_SETTLEMENT) store.viewSettings.inspectedState = store.board.areas.find((area) => area.id === id).state
}
function locateNation(id) { map.value.locateNation(id) }
function revealStatus(type) {
	nextTick(() => statusPanels.value.querySelector(type === "player" ? ".holdingsPanel" : ".stateStrip").scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" }))
}
watch(() => store.viewSettings.historyArea, (id) => { if (id) map.value.locateArea(id) })
watch([() => store.gameflow.turn, () => store.gameflow.phase, () => store.gameflow.turnOrder[0], () => view.currentStateId(store), () => store.gameflow.developmentStep, () => store.rain.step, () => store.gameflow.pendingOffer], async () => {
	await nextTick()
	if (actionPanelBody.value) {
		actionPanelBody.value.scrollTop = 0
		actionPanelBody.value.parentElement.scrollTop = 0
	}
})
const automaticAction = computed(() => {
	if (store.viewSettings.showLoader || store.viewSettings.isSaving || store.viewSettings.performingRewind) return null
	if (store.turnDraft.pauseAutomatic || store.turnDraft.ready) return null
	return personal.canPlay() ? rules.getAutomaticAction(store) : controller.getAutomaticBotAction()
})
watch(automaticAction, (action) => {
	if (!action) return
	if (controller.canRunBotTurn()) controller.submitBotAction(action)
	else controller.submitAction(action)
}, { immediate: true, flush: "post" })
watch(() => store.turnDraft.revision, () => {
	map.value?.finishDig()
	selectedArea.value = null
	removalArea.value = null
	landDraft.value = null
	turnAction.value = null
	mapAction.value = null
	actionTargets.value = []
})
async function finishTurn() {
	if (gameActions.value && !store.turnDraft.ready) return gameActions.value.finishTurn()
	return controller.endPlayerTurn()
}

function showDebug() {
	return rf.SUPER_USERS.includes(personal.name) || rf.DEBUG_USERS.includes(personal.name)
}
</script>

<template>
	<Teleport to="body"><dialog ref="mapPreview" class="nationMapPreview" aria-label="Game board" @close="isMapPreviewOpen = false" @click="$event.target === mapPreview && closeMapPreview()">
		<div class="mapPreviewHeader"><b>Game board</b><button type="button" @click="closeMapPreview">Close</button></div>
		<div class="mapPreviewViewport" tabindex="0" aria-label="Enlarged map"><div id="nationMapPreviewBody"></div></div>
	</dialog></Teleport>
	<TopMenu />
	<div id="wholeMiddleArea" :class="{ historyOpen: store.viewSettings.showHistory, nationDivision: isNationDivision }">
		<TopMenuViews />
		<HistoryTab />
		<div id="gameArea">
		<ReplayArea v-if="store.viewSettings.showReplay" />
		<TurnOrder @inspect="revealStatus" />
		<GameOverview @inspect="revealStatus" />
		<div v-if="store.gameflow.turn === 1 && store.gameflow.phase === rf.PHASE_DIVIDING_NATIONS && !store.viewSettings.showReplay && !isWelcomeDismissed" class="welcomeHelper">
			<div><b>Welcome to UR: 1830 BC!</b><button type="button" aria-label="Dismiss welcome" @click="isWelcomeDismissed = true">×</button></div>
			<p>Select a hex to inspect it, or a card to enlarge it. Choose a nation below; click the map to enlarge it.</p>
			<p><a href="/URR/help/" target="_blank" rel="noopener">Icons and interface help</a> is also available from Rules in the menu. Enjoy the game!</p>
		</div>
		<div id="mainAreaLessHistory" :class="{ nationDivisionLayout: isNationDivision }" ref="mainArea" :style="{ '--board-width': `${boardBaseWidth * store.viewSettings.boardZoom}px`, '--board-overhead': `${(showLandMarket ? 390 : 275) + (store.viewSettings.showReplay ? 60 : 0) + (map?.isTracing ? 60 : 0)}px` }">
			<aside ref="statusPanels" class="stateSidebar"><PlayerHoldings ref="holdings" /><StateStrip v-if="!isNationDivision" @inspect="revealStatus" /><EquipmentSupply v-if="!isNationDivision" /></aside>
			<div class="mapContainer" :title="isNationDivision ? 'Click the map to enlarge' : undefined" @keydown.enter="isNationDivision && $event.target.closest('.mapSurface') && openMapPreview()" @keydown.space="isNationDivision && $event.target.closest('.mapSurface') && openMapPreview()" @click="isNationDivision && $event.target.closest('.mapSurface') && openMapPreview()">
				<TerrainMarket v-if="showLandMarket" />
				<Teleport to="#nationMapPreviewBody" :disabled="!isMapPreviewOpen">
				<MapArea ref="map" :selected-hex="selectedArea" :map-action="mapAction" :action-targets="actionTargets" @confirm-action="gameActions?.confirmMapAction()" @cancel-action="gameActions?.cancelMapAction()" :highlighted-player="store.viewSettings.showOwnedLand ? holdings?.activePlayer ?? null : null" :removal-area="removalArea" :land-draft="landDraft" :waiting-player-index="waitingPlayerIndex" :dig-capacity="digCapacity" @select-area="selectArea" @change-path="canalPath = $event" />
				</Teleport>
			</div>
			<aside v-if="!store.viewSettings.showReplay" class="actionSidebar">
				<div v-if="!isNationDivision" class="actionPanelHeading"><small class="actingLabel">{{ actingLabel }} <PlayerMarker v-if="actingPlayer !== undefined" :index="actingPlayer" /></small>{{ actionPanelTitle }}</div>
				<DevelopmentProgress v-if="!isNationDivision && !store.turnDraft.ready" />
				<div v-if="!store.turnDraft.ready || isNationDivision" ref="actionPanelBody" class="actionPanelBody"><NationMarket v-if="isNationDivision" :is-board-layout="isNationDivision" @locate-nation="locateNation" />
				<GameActions v-else ref="gameActions" :key="store.turnDraft.revision" @select-area="selectedArea = $event" @change-map-action="mapAction = $event" @change-action-targets="actionTargets = $event" :selected-area="selectedArea" :path="canalPath" @clear-path="map.finishDig()" @change-removal="removalArea = $event" @change-land-draft="landDraft = $event" @change-turn-action="turnAction = $event" @change-dig-capacity="digCapacity = $event" /></div>
				<TurnControls :is-nation-division="isNationDivision" :turn-action="turnAction" :land-draft="landDraft" @end-turn="finishTurn" />
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

#app { display: flex; flex-direction: column; min-width: 1400px; min-height: 100vh; }
#app > #footer { flex-shrink: 0; }

#wholeMiddleArea {
	flex: 1 0 auto;
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
.actionSidebar .equipmentCard { float: none; display: block; max-width: 100%; width: 100%; margin: 0 0 8px; }
.actionPanelHeading { padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #c4b894; font-size: 17px; font-weight: bold; }
.gameActions input[type=number], .gameActions select, .nationMarket input { min-height: 36px; box-sizing: border-box; font-size: 16px; }

.stateSidebar .holdingsPanel, .stateSidebar .equipmentSupply, .actionSidebar .gameActions, .actionSidebar .nationMarket { font-size: 16px; }
.stateSidebar .panelTitle { font-size: 18px; }.stateSidebar .panelTitle button { font-size: 16px; font-weight: 600; }
.stateSidebar .money > span, .stateSidebar .nationIncome, .stateSidebar .markerCount, .stateSidebar .reservedMoney, .stateSidebar .primogeniture, .stateSidebar .primogeniture b, .stateSidebar .terrainRow, .stateSidebar .eraCard > span { font-size: 16px; font-weight: 600; }
.stateSidebar .playerMarker { width: 32px; height: 32px; }.stateSidebar .terrainRow img { width: 48px; height: 48px; }.stateSidebar .terrainRow .cityCount img { width: 28px; height: 28px; }.stateSidebar .ruledStates img { width: 36px; height: 36px; }
.stateSidebar .stateCard { font-size: 16px; font-weight: 600; }.stateSidebar .stateName b { font-size: 16px; }.stateSidebar .stateMeta { font-size: 16px; font-weight: 600; white-space: normal; }.stateSidebar .treasuryHeader { flex-basis: 44px; width: 44px; }.stateSidebar .crewTile { width: 36px; height: 36px; }.stateSidebar .crewTile.splitCrew { width: 50px; flex-basis: 50px; }.stateSidebar .landowners img { width: 32px; height: 32px; }
.actionSidebar .piece { width: 32px; height: 32px; }.actionSidebar .selectedLand > img, .actionSidebar .routingWork, .actionSidebar .offeredWork img, .actionSidebar .offerHeading img { width: 46px; height: 46px; }.actionSidebar .selectedOwner img, .actionSidebar .paymentRow img { width: 32px; height: 32px; }.actionSidebar .gameActions small { font-size: 16px; font-weight: 600; }

#loaderOverlay {
	position: fixed;
	inset: 0;
	background: rgba(255, 255, 255, 0.6);
	z-index: 9999;
}

.saveStatus { position: fixed; right: 12px; bottom: 12px; padding: 6px 12px; background: #fff9df; border: 1px solid #8e805e; border-radius: 4px; font-size: 16px; font-weight: 600; z-index: 10000; pointer-events: none; }

#loaderOverlay #loadingText {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	font-size: 36px;
}
.actingLabel { display: block; font-size: 16px; font-weight: 600; color: #655a42; margin-bottom: 5px; }
.welcomeHelper { margin-bottom: 10px; padding: 8px; background: #edf5e4; border: 1px solid #c1cdb1; border-radius: 4px; }
.welcomeHelper > div { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.welcomeHelper button { flex-shrink: 0; min-width: 40px; min-height: 40px; font: inherit; font-size: 20px; }
.welcomeHelper a { color: #235e88; }

.welcomeHelper { text-align: center; }
.welcomeHelper > div { justify-content: center; position: relative; }
.welcomeHelper button { position: absolute; right: 0; }

/* Nation selection uses the middle of the screen; the map remains a reference. */
.nationDivision .turnOrder .phaseLabel, .nationDivision .turnOrder > .orderRow + .orderRow { display: none; }
#mainAreaLessHistory.nationDivisionLayout { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 10px; max-width: 1800px; }
.nationDivisionLayout .actionSidebar { grid-column: 1; grid-row: 1 / span 2; position: static; max-height: none; overflow: visible; padding: 10px; }
.nationDivisionLayout .mapContainer { grid-column: 2; grid-row: 1; width: 100%; gap: 5px; }
.nationDivisionLayout .stateSidebar { grid-column: 2; grid-row: 2; width: 100%; }
.nationDivisionLayout .mapSurface { cursor: zoom-in; }
.nationDivisionLayout .mapHint, .nationDivisionLayout .boardLegend { display: none; }
.nationDivisionLayout .actionPanelHeading { font-size: 15px; padding-bottom: 5px; margin-bottom: 5px; }
.nationDivisionLayout .nationMarket { font-size: 16px; font-weight: 600; }
.nationDivision .welcomeHelper { max-width: 1776px; margin: 8px auto 0; box-sizing: border-box; font-size: 16px; font-weight: 600; }
.nationDivision .welcomeHelper p { margin: 4px 0; }
.nationMapPreview { top: 20px; margin: 0 auto; width: min(1000px, calc((100vh - 150px) * 1.2333)); max-width: calc(100vw - 40px); max-height: calc(100vh - 40px); box-sizing: border-box; padding: 12px; background: #fff9df; color: #302f27; border: 2px solid #8e805e; border-radius: 6px; }
.nationMapPreview[open] { display: flex; flex-direction: column; overflow: hidden; }
.nationMapPreview::backdrop { background: #0008; }
.mapPreviewHeader { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-shrink: 0; margin-bottom: 8px; }
.mapPreviewViewport { overflow: auto; min-height: 0; }
.mapPreviewViewport:focus-visible { outline: 2px solid #177daf; }

/* One appearance for action buttons across panels and previews. */
:is(#app, dialog) button:not(.topMenuItem) { box-sizing: border-box; min-height: 34px; padding: 5px 8px; border: 1px solid #998a67; border-radius: 3px; background: #fffdf4; color: #302f27; font-family: Arial, sans-serif; font-size: 16px; font-weight: 600; line-height: 1.2; opacity: 1; cursor: pointer; }
:is(#app, dialog) button:not(.topMenuItem):hover:enabled { background: #f1e9d7; border-color: #756440; }
:is(#app, dialog) button:not(.topMenuItem):focus-visible { outline: 2px solid #177daf; outline-offset: 2px; }
:is(#app, dialog) button:not(.topMenuItem):is([aria-pressed=true], [aria-current], .current, .selected) { background: #e1edf5; border-color: #177daf; }
:is(#app, dialog) button:not(.topMenuItem):disabled { opacity: .45; cursor: default; }
</style>
