<script setup>
/**
 * UR: 1830 BC - main app shell.
 *
 * Generic layout: top menu (single row of icons), the shared panels
 * (chat / notes / bug / info / history / replay / rewind) and a placeholder
 * board area. Game-specific rendering goes in MapArea.vue / the js modules.
 */

import * as model from "./js/URRmodel"
import * as view from "./js/URRview"

import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import FooterBar from "./components/FooterBar.vue"
import MapArea from "./components/MapArea.vue"
import PlayerTable from "./components/PlayerTable.vue"
import DebugArea from "./components/DebugArea.vue"
import HistoryTab from "./components/HistoryTab.vue"
import ReplayArea from "./components/ReplayArea.vue"

import { useModelStore } from "./stores/URRstore.js"
import { usePersonalStore } from "./stores/URRpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()

model.initGame()

function showDebug() {
	return personal.name === "admin" || personal.name === "BotKickStarter"
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
				<PlayerTable />
				<div class="mapContainer">
					<MapArea />
				</div>
				<DebugArea v-if="showDebug()" />
			</div>
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
	width: fit-content;
	min-width: 100%;
}

#wholeMiddleArea {
	width: 100%;
	min-width: 900px;
	text-align: center;
	min-height: 500px;
}

#mainAreaLessHistory {
	min-height: 60px;
	min-width: 620px;
}

.mapContainer {
	display: flex;
	justify-content: center;
	margin: auto;
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
