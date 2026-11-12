<script setup>
import { computed, onMounted, onUnmounted } from "vue"
import * as model from "./js/DDLmodel"
import * as controller from "./js/DDLcontroller"
import * as IO from "./backend/DDL_IO"
import * as WS from "./backend/DDLwebsocket"
import * as view from "./js/DDLview"
import * as rf from "./js/DDLreference"
import GameStatusBanner from "../../../Lobby/static/Lobby/common/GameStatusBanner.vue"
import { getStatusBannerLabels } from "../../../Lobby/static/Lobby/common/statusBannerLabels.js"

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
import DiscardModal from "./components/DiscardModal.vue"
import GearPickerModal from "./components/GearPickerModal.vue"

import { useModelStore } from "./stores/DDLstore.js"
import { usePersonalStore } from "./stores/DDLpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()

model.initGame()
controller.startPlayerTurn()

let pollTimer = null
let kickoutTimer = null
function poll() {
	if (personal.pov < 0 || personal.finishedGame || personal.haltPlay || store.viewSettings.showReplay) return
	if (store.gameflow.phase === 0 && store.gameflow.setup.auction && !store.gameflow.setup.auctionResolved) {
		controller.pollAuction()
		return
	}
	IO.checkForLatestData()
}

onMounted(() => {
	// Anonymous spectators have no account to save or poll with; the page they
	// loaded already holds the state.
	if (personal.pov >= -9) WS.StartWebSocket()
	pollTimer = setInterval(poll, 5000)
	kickoutTimer = setInterval(() => {
		if (personal.secondsToNextKickout > 0) personal.secondsToNextKickout--
	}, 1000)
})
onUnmounted(() => {
	if (pollTimer) clearInterval(pollTimer)
	if (kickoutTimer) clearInterval(kickoutTimer)
})

function showDebug() {
	return personal.name === "admin" || personal.name === "BotKickStarter"
}

// Grey while a seated player waits for another player's turn and while replaying.
// Your turn, spectators, practice games and the game-over screen stay blue.
const waitingForTurn = computed(() => {
	if (store.viewSettings.showReplay) return true
	if (personal.pov < 0 || personal.trainingGame) return false
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
	return personal.pov !== store.gameflow.turnOrder[0]
})

const statusBanner = computed(() => {
	const playerObj = controller.currentPlayerObj()
	return {
		labels: getStatusBannerLabels(window.initData.locale, { turn: store.gameflow.turn }),
		phase: view.phaseStr(store.gameflow.phase),
		action: view.actionTitle(store),
		isMyTurn: personal.canPlay(),
		isGameOver: store.gameflow.phase === rf.PHASE_GAME_OVER,
		isReplay: store.viewSettings.showReplay,
		player: !personal.canPlay() && playerObj ? { name: playerObj.displayName, background: personal.getCorrectedColourHex(playerObj.colour) } : null,
	}
})
</script>

<template>
	<TopMenu />
	<GameStatusBanner v-bind="statusBanner" />
	<div id="wholeMiddleArea" :class="{ greyBackground: waitingForTurn }">
		<TopMenuViews />
		<HistoryTab />
		<ReplayArea v-if="store.viewSettings.showReplay" />
		<div id="mainAreaLessHistory">
			<PlayerTable />
			<div class="gameArea">
				<div class="boardRow">
					<div class="turnColumn">
						<ShipPanel />
						<ActionPanel />
					</div>
					<div class="boardColumn">
						<MapArea />
					</div>
				</div>
			</div>
			<DebugArea v-if="showDebug()" />
		</div>
	</div>
	<FooterBar />

	<AuctionModal />
	<TradeModal />
	<DiscardModal />
	<GearPickerModal />

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
	width: 100%;
}
#wholeMiddleArea {
	width: 100%;
	text-align: center;
	min-height: 500px;
	background-color: #d4eafd;
	transition: background-color 1s;
}
#wholeMiddleArea.greyBackground { background-color: lightgray; }
#mainAreaLessHistory {
	min-height: 60px;
	min-width: 620px;
}
.gameArea {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 8px;
	margin: 4px auto 12px auto;
	width: 100%;
	max-width: 1696px;
	box-sizing: border-box;
	padding: 0 16px;
}
.boardRow {
	display: flex;
	gap: 12px;
	align-items: flex-start;
	min-width: 0;
}
.turnColumn { width: 264px; flex: 0 0 264px; display: flex; flex-direction: column; gap: 8px; }
.boardColumn { flex: 1 1 auto; min-width: 0; }
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
	margin: 10px;
	width: fit-content;
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 5px;
	cursor: pointer;
	background-color: #f7fff7;
}
.actionsLineButton:hover:enabled { background-color: lightgrey; }
.actionsLineButton:active:enabled { background-color: darkgray; }
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
