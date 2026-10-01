<script setup>
/**
 * UR: 1830 BC - main app shell.
 *
 * Generic layout: top menu (single row of icons), the shared panels
 * (chat / notes / bug / info / history / replay / rewind) and a placeholder
 * board area. Game-specific rendering goes in MapArea.vue / the js modules.
 */

import * as model from "./js/URRmodel"
import * as rf from "./js/URRreference"

import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import FooterBar from "./components/FooterBar.vue"
import MapArea from "./components/MapArea.vue"
import PlayerTable from "./components/PlayerTable.vue"
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

model.initGame()

function showDebug() {
	return rf.SUPER_USERS.includes(personal.name) || rf.DEBUG_USERS.includes(personal.name)
}
</script>

<template>
	<TopMenu />
	<div id="wholeMiddleArea">
		<TopMenuViews />
		<HistoryTab />
		<ReplayArea v-if="store.viewSettings.showReplay" />
		<template v-if="!store.viewSettings.showReplay">
			<div id="mainAreaLessHistory">
				<aside class="stateSidebar"><PlayerHoldings /><StateStrip /></aside>
				<div class="mapContainer">
					<MapArea />
					<TerrainMarket />
				</div>
				<aside class="nationSidebar" v-if="store.gameflow.phase === rf.PHASE_DIVIDING_NATIONS"><NationMarket /></aside>
			</div>
			<DebugArea v-if="showDebug()" />
			<PlayerTable />
		</template>
	</div>
	<FooterBar />

	<div id="loaderOverlay" v-if="store.viewSettings.showLoader">
		<div id="loadingText">Loading........</div>
	</div>
</template>

<style>
body {
	margin: 0px !important;
	background-color: #d4eafd;
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
.stateSidebar { flex: 0 0 235px; display: flex; flex-direction: column; gap: 12px; }
.stateSidebar .holdingsPanel { width: 100%; }
.nationSidebar { flex: 0 0 270px; padding: 12px; box-sizing: border-box; background: #fff9e9; border: 1px solid #aa9b77; border-radius: 5px; }
.gameActions button, .nationMarket button { padding: 5px 9px; border: 1px solid #998a67; border-radius: 3px; background: #fffdf4; color: #263b32; }
.gameActions button:hover:enabled, .nationMarket button:hover:enabled { background: #e3eddb; border-color: #547751; }
.gameActions button:disabled, .nationMarket button:disabled { opacity: .5; }
@media (max-width: 1050px) {
 #mainAreaLessHistory { flex-wrap: wrap; }
 .mapContainer { order: -1; flex-basis: 100%; }
 .stateSidebar, .nationSidebar { flex: 1 1 240px; max-width: 460px; min-width: 0; }
}

#loaderOverlay {
	position: fixed;
	inset: 0;
	background: rgba(255, 255, 255, 0.6);
	z-index: 9999;
}

#loaderOverlay #loadingText {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	font-size: 36px;
}
</style>
