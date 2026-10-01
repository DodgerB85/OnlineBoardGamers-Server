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
			<StateStrip />
			<div id="mainAreaLessHistory">
				<PlayerHoldings />
				<div class="mapContainer">
					<MapArea />
				</div>
				<TerrainMarket />
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

#mainAreaLessHistory {
	min-height: 60px;
	max-width: 1346px;
	padding: 0 8px;
	box-sizing: border-box;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	gap: 8px;
	margin: 0 auto;
}

.mapContainer {
	display: flex;
	justify-content: center;
	min-width: 0;
	flex: 0 1 920px;
}

#mainAreaLessHistory > aside { flex-shrink: 0; }

@media (max-width: 1120px) {
	#mainAreaLessHistory { flex-wrap: wrap; }
	.mapContainer { order: -1; flex-basis: 100%; max-width: 920px; }
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
