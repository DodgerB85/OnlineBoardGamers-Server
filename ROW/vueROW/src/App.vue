<script setup>
/**
 * main app file. Initialise the store/model here.
 */
import { computed, onMounted, onUnmounted } from "vue"
import { useI18n } from "vue-i18n"

import * as model from "./js/ROWmodel"
import * as rf from "./js/ROWreference"
import * as player from "./js/ROWplayer"
import * as view from "./js/ROWview"

import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import ResignPanel from "./components/ResignPanel.vue"
import ActionArea from "./components/ActionArea.vue"
import MapArea from "./components/MapArea.vue"
import BiddingArea from "./components/BiddingArea.vue"
import KickoutArea from "./components/KickoutArea.vue"
import PlayerTable from "./components/PlayerTable.vue"
import CattleMarket from "./components/CattleMarket.vue"
import ObjectivesMarket from "./components/ObjectivesMarket.vue"
import HistoryTab from "./components/HistoryTab.vue"
import ReplayArea from "./components/ReplayArea.vue"
import EndedDialog from "./components/EndedDialog.vue"
import DebugArea from "./components/DebugArea.vue"
import FooterBar from "./components/FooterBar.vue"

import { useModelStore } from "./stores/ROWstore.js"
const store = useModelStore()

import { usePersonalStore } from "./stores/ROWpersonal.js"
const personal = usePersonalStore()

model.initGame()

const { t } = useI18n()
const boardPlayers = computed(() => player.boardPlayersOrder())
const showDebug = computed(() => rf.DEBUG_USERS.includes(personal.name))
const waitingForTurn = computed(() => {
	if (store.viewSettings.showReplay) return true
	if (store.game?.isEnded()) return false
	if (personal.trainingGame || personal.pov < 0) return false
	return store.currentPlayer !== personal.name
})
const myTurn = computed(() => personal.canPlay(store.currentPlayer) && !store.viewSettings.showReplay && !store.viewSettings.performingRewind && !store.game?.isEnded())
const actingPlayer = computed(() => store.state?.players.find((p) => p.name === store.currentPlayer) ?? null)
const turnStatusText = computed(() => {
	if (store.viewSettings.showReplay) return t("row.status.replay")
	if (store.game?.isEnded()) return t("row.status.gameOver")
	return view.actionPanelTitle(store)
})
function playerColorClass(color) {
	return String(color ?? "white").toLowerCase()
}

let kickoutTimer = null
onMounted(() => {
	kickoutTimer = setInterval(() => {
		if (personal.secondsToNextKickout > 0) personal.secondsToNextKickout--
	}, 1000)
})
onUnmounted(() => {
	if (kickoutTimer) clearInterval(kickoutTimer)
})
</script>

<template>
	<TopMenu />
	<div id="turnStatus" :class="{ myTurn: myTurn, gameOver: !store.viewSettings.showReplay && store.game?.isEnded() }">
		<template v-if="store.viewSettings.showReplay">{{ t('row.status.replay') }}</template>
		<template v-else-if="store.game?.isEnded()">{{ t('row.status.gameOver') }}</template>
		<template v-else-if="myTurn">
			<span class="yourTurnBadge">{{ t('row.status.yourTurnBadge') }}</span> {{ turnStatusText }}
		</template>
		<template v-else-if="actingPlayer">
			<span class="turnPlayerChip" :class="playerColorClass(actingPlayer.color)">{{ actingPlayer.name }}</span> {{ turnStatusText }}
		</template>
		<template v-else>{{ t('app.waitingForOthers') }}</template>
	</div>
	<ResignPanel />

	<div id="wholeMiddleArea" :class="waitingForTurn ? 'greyBackground' : 'normalBackground'">
		<transition name="fadeMainArea">
			<div id="boardContainer" v-if="!store.viewSettings.performingRewind">
				<div id="middle">
					<TopMenuViews />
					<HistoryTab />

					<ReplayArea v-if="store.viewSettings.showReplay" />

					<div id="mainAreaLessHistory" :style="{ zoom: personal.zoom / 16 }">
						<BiddingArea />
						<KickoutArea />
						<ActionArea />

						<div id="rowBoard">
							<div id="leftColumn">
								<MapArea />
								<CattleMarket />
								<ObjectivesMarket />
							</div>
							<div id="playerBoards">
								<PlayerTable v-for="p in boardPlayers" :key="p" :playerName="p" />
							</div>
						</div>

						<DebugArea v-if="showDebug" />
					</div>
				</div>
			</div>
		</transition>
	</div>

	<EndedDialog />
	<FooterBar />
</template>

<style>
#app {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	height: auto;
}

body {
	margin: 0 !important;
	background-color: #d4eafd;
	font-family: Arial, sans-serif;
	font-size: 15px;
}

#turnStatus {
	text-align: center;
	font-weight: bolder;
	padding: 4px 8px;
	background-color: #c4dff7;
	border-bottom: 1px solid #8bb8d8;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
#turnStatus.myTurn { background-color: lightgreen; }
#turnStatus.gameOver { background-color: lightgoldenrodyellow; }
.yourTurnBadge {
	display: inline-block;
	background-color: darkgreen;
	color: white;
	border-radius: 10px;
	padding: 1px 8px;
	margin-right: 6px;
	font-size: 0.9em;
}
.turnPlayerChip {
	display: inline-block;
	border: 1px solid black;
	padding: 1px 6px;
	margin-right: 6px;
}
.turnPlayerChip.red { background-color: red; color: white; }
.turnPlayerChip.blue { background-color: blue; color: white; }
.turnPlayerChip.yellow { background-color: yellow; color: black; }
.turnPlayerChip.green { background-color: green; color: white; }
.turnPlayerChip.white { background-color: #d9d9d9; color: black; }
.turnPlayerChip.orange { background-color: orange; color: black; }
.turnPlayerChip.purple { background-color: purple; color: white; }
.turnPlayerChip.black { background-color: black; color: white; }

/* Site action-button style: URR's refinement of WEB's .actionsLineButton. */
.actionsLineButton {
	box-sizing: border-box;
	min-height: 34px;
	width: fit-content;
	padding: 5px;
	border: 2px solid green;
	border-radius: 5px;
	background: #fffdf4;
	color: #302f27;
	font: inherit;
	font-weight: bolder;
	line-height: 1.2;
	cursor: pointer;
}
.actionsLineButton:hover:enabled {
	background-color: lightgrey;
}
.actionsLineButton:active:enabled {
	background-color: darkgrey;
}
.actionsLineButton:focus-visible {
	outline: 2px solid #177daf;
	outline-offset: 2px;
}
.actionsLineButton:disabled {
	opacity: 0.45;
	cursor: default;
}

#wholeMiddleArea {
	flex: 1 0 auto;
	width: 100%;
	min-width: 1050px;
	min-height: 500px;
	text-align: center;
}

#boardContainer {
	margin: 0 auto;
	transition: all 0.2s ease-in-out;
}

#mainAreaLessHistory {
	min-height: 100px;
	min-width: 1050px;
}

#rowBoard {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: flex-start;
	gap: 4px;
}

#leftColumn {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex: 0 1 780px;
	min-width: 0;
}

#playerBoards {
	display: flex;
	flex-direction: column;
	align-items: center;
	flex: 1 1 360px;
	min-width: 300px;
	max-width: 46%;
}

.greyBackground {
	background-color: lightgray;
	transition: background-color 1s ease-in-out;
}

.normalBackground {
	background-color: #d4eafd;
	transition: background-color 1s ease-in-out;
}

.fadeMainArea-enter-active,
.fadeMainArea-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fadeMainArea-enter-from,
.fadeMainArea-leave-to {
	opacity: 0;
}
</style>
