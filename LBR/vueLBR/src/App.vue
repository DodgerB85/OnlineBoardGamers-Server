<script setup>
import { computed, onMounted, onUnmounted } from "vue";

import TopMenu from "./components/TopMenu.vue";
import TopMenuViews from "./components/TopMenuViews.vue";
import KickoutDialog from "./components/KickoutDialog.vue";
import FooterBar from "./components/FooterBar.vue";
import BoardArea from "./components/BoardArea.vue";
import ActionPanel from "./components/ActionPanel.vue";
import PlayerPanel from "./components/PlayerPanel.vue";
import HistoryPanel from "./components/HistoryPanel.vue";
import ChatPanel from "./components/ChatPanel.vue";
import NotesPanel from "./components/NotesPanel.vue";

import { useModelStore } from "./stores/LBRstore.js";
import { usePersonalStore } from "./stores/LBRpersonal.js";
import * as model from "./js/LBRmodel.js";
import * as controller from "./js/LBRcontroller.js";
import * as IO from "./backend/LBR_IO.js";

const store = useModelStore();
const personal = usePersonalStore();

model.initGame();
if (store.chatData) store.chatMessages = IO.decompressChat(store.chatData);
controller.bootGame();

const isSpectator = computed(() => personal.pov < 0);

let pollTimer = null;

onMounted(() => {
	IO.checkForLatestData(true);
	pollTimer = setInterval(() => {
		if (document.hidden) return;
		IO.checkForLatestData();
	}, IO.POLL_INTERVAL_MS);
});

onUnmounted(() => {
	if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
	<TopMenu />
	<TopMenuViews />
	<KickoutDialog />
	<div v-if="isSpectator" class="observer-note">You are watching this game. The board is read-only.</div>
	<div v-if="store.finishedGame && store.game && !store.game.gameOver" class="observer-note">This game is marked finished on the server.</div>
	<HistoryPanel v-if="store.viewSettings.showHistory" />
	<ChatPanel v-if="store.viewSettings.showChat" />
	<NotesPanel v-if="store.viewSettings.showNotes && personal.pov >= 0" />
	<div class="main">
		<BoardArea />
		<div class="side-panel">
			<ActionPanel />
			<PlayerPanel />
		</div>
	</div>
	<FooterBar />
</template>

<style scoped>
.observer-note {
	background: #fff9e9;
	border-bottom: 1px solid #aa9b77;
	color: #302f27;
	padding: 5px 14px;
	font-size: 16px;
	text-align: center;
}

@media (max-width: 900px) {
	.main {
		padding: 8px;
	}
	.side-panel {
		flex: 1 1 100%;
	}
}
</style>
