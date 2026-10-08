<script setup>
/**
 * main app file. Initialise the store/model here.
 */
import { computed } from "vue"

import * as model from "./js/ROWmodel"
import * as rf from "./js/ROWreference"
import * as player from "./js/ROWplayer"

import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import ActionArea from "./components/ActionArea.vue"
import MapArea from "./components/MapArea.vue"
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

const boardPlayers = computed(() => player.boardPlayersOrder())
const showDebug = computed(() => rf.DEBUG_USERS.includes(personal.name))
</script>

<template>
	<TopMenu />

	<div id="wholeMiddleArea" :class="store.viewSettings.showReplay ? 'greyBackground' : 'normalBackground'">
		<transition name="fadeMainArea">
			<div id="boardContainer" v-if="!store.viewSettings.performingRewind">
				<div id="middle">
					<TopMenuViews />
					<HistoryTab />

					<ReplayArea v-if="store.viewSettings.showReplay" />

					<div id="mainAreaLessHistory" :style="{ zoom: personal.zoom / 16 }">
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
body {
	margin: 0 !important;
	background-color: #d4eafd;
	font-family: Arial, sans-serif;
	font-size: 15px;
}

#wholeMiddleArea {
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
