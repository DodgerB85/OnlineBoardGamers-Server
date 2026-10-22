<script setup>
import { onMounted, onUnmounted } from "vue"
import * as model from "./js/DDLmodel"
import * as controller from "./js/DDLcontroller"
import * as IO from "./backend/DDL_IO"

import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import FooterBar from "./components/FooterBar.vue"
import MapArea from "./components/MapArea.vue"
import PlayerTable from "./components/PlayerTable.vue"
import ShipPanel from "./components/ShipPanel.vue"
import ActionPanel from "./components/ActionPanel.vue"
import DebugArea from "./components/DebugArea.vue"
import HistoryTab from "./components/HistoryTab.vue"
import ReplayArea from "./components/ReplayArea.vue"
import AuctionModal from "./components/AuctionModal.vue"
import TradeModal from "./components/TradeModal.vue"
import ExploreModal from "./components/ExploreModal.vue"
import DiscardModal from "./components/DiscardModal.vue"
import GearPickerModal from "./components/GearPickerModal.vue"
import PlanetPickerModal from "./components/PlanetPickerModal.vue"

import { useModelStore } from "./stores/DDLstore.js"
import { usePersonalStore } from "./stores/DDLpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()

model.initGame()
controller.startPlayerTurn()

let pollTimer = null
function poll() {
	if (personal.pov < 0 || personal.finishedGame || personal.haltPlay) return
	if (store.gameflow.phase === 0 && store.gameflow.setup.auction && !store.gameflow.setup.auctionResolved) {
		controller.pollAuction()
		return
	}
	IO.checkForLatestData()
}

onMounted(() => {
	pollTimer = setInterval(poll, 5000)
})
onUnmounted(() => {
	if (pollTimer) clearInterval(pollTimer)
})

function showDebug() {
	return personal.name === "admin" || personal.name === "BotKickStarter"
}
</script>

<template>
	<TopMenu />
	<div id="wholeMiddleArea" :class="{ greyBackground: store.viewSettings.showReplay }">
		<TopMenuViews />
		<HistoryTab />
		<ReplayArea v-if="store.viewSettings.showReplay" />
		<div id="mainAreaLessHistory">
			<PlayerTable />
			<div class="gameArea">
				<ShipPanel />
				<div class="boardColumn">
					<MapArea />
				</div>
				<ActionPanel />
			</div>
			<DebugArea v-if="showDebug()" />
		</div>
	</div>
	<FooterBar />

	<AuctionModal />
	<TradeModal />
	<ExploreModal />
	<DiscardModal />
	<GearPickerModal />
	<PlanetPickerModal />

	<div id="loaderOverlay" v-if="store.viewSettings.showLoader">
		<div id="loadingText">{{ $t("app.loading") }}</div>
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
	min-width: 1700px;
	text-align: center;
	min-height: 500px;
	transition: background-color 0.3s;
}
#wholeMiddleArea.greyBackground { background-color: lightgray; }
#mainAreaLessHistory {
	min-height: 60px;
	min-width: 620px;
}
.gameArea {
	display: flex;
	justify-content: center;
	align-items: flex-start;
	gap: 12px;
	margin: 4px auto 20px auto;
	width: fit-content;
}
.boardColumn { flex: 0 0 auto; }
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
.actionsLineButton {
	margin: 5px;
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 6px 10px;
	cursor: pointer;
	background-color: #f7fff7;
}
.actionsLineButton:hover:enabled { background-color: lightgrey; }
.actionsLineButton:disabled { background-color: darkgray; cursor: default; }
.errorText {
	width: 100%;
	font-weight: bolder;
	text-align: center;
	background-color: lightgoldenrodyellow;
	color: darkred;
	padding: 4px;
}
.successText {
	width: 100%;
	font-weight: bolder;
	text-align: center;
	color: darkgreen;
	padding: 4px;
}
</style>
