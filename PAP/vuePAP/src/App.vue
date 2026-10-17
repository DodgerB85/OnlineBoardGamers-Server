<script setup>
/**
 * Permits and Poisons - main app shell.
 *
 * Top menu (single row of icons), the shared panels (chat / notes / bug / info / history / replay /
 * rewind), then the game: final scores, player table, the prompt for the viewer's move and the board.
 */

import * as model from "./js/PAPmodel"

import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import FooterBar from "./components/FooterBar.vue"
import FinalScores from "./components/FinalScores.vue"
import PlayerTable from "./components/PlayerTable.vue"
import DebugArea from "./components/DebugArea.vue"
import HistoryTab from "./components/HistoryTab.vue"
import ReplayArea from "./components/ReplayArea.vue"
import GameBoard from "./components/board/GameBoard.vue"
import IconLegend from "./components/board/IconLegend.vue"
import PromptPanel from "./components/prompts/PromptPanel.vue"

import { useModelStore } from "./stores/PAPstore.js"
import { usePersonalStore } from "./stores/PAPpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()

model.initGame()

function showDebug() {
	return personal.name === "admin" || personal.name === "BotKickStarter"
}
</script>

<template>
	<TopMenu />
	<div id="wholeMipapeArea">
		<TopMenuViews />
		<HistoryTab />
		<ReplayArea v-if="store.viewSettings.showReplay" />
		<div id="mainAreaLessHistory">
			<FinalScores />
			<PlayerTable />
			<div class="gameLayout">
				<div class="promptColumn">
					<PromptPanel />
				</div>
				<div class="boardColumn">
					<GameBoard />
					<IconLegend />
				</div>
			</div>
			<DebugArea v-if="showDebug()" />
		</div>
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
	min-width: 100%;
}

#wholeMipapeArea {
	width: 100%;
	text-align: center;
	min-height: 500px;
}

#mainAreaLessHistory {
	min-height: 60px;
	min-width: 0;
}

/* Prompt above the board on narrow screens; a sticky side column on wide ones. */
.gameLayout {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: 8px;
	margin: 8px;
}

@media (min-width: 1100px) {
	.gameLayout {
		flex-direction: row;
		align-items: flex-start;
	}
	.promptColumn {
		position: sticky;
		top: 0;
		width: 340px;
		flex-shrink: 0;
		max-height: 100vh;
		overflow-y: auto;
	}
	.boardColumn {
		flex: 1;
		min-width: 0;
	}
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
