<script setup>
import { onMounted, onUnmounted } from "vue";

import TopBar from "./components/TopBar.vue";
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
	<div class="app-shell">
		<TopBar />
		<div v-if="personal.pov === -9 || personal.pov === -1" class="observer-note">
			You are watching this game. The board is read-only.
		</div>
		<div v-if="store.finishedGame && store.game && !store.game.gameOver" class="observer-note">
			This game is marked finished on the server.
		</div>
		<div class="main">
			<BoardArea />
			<div class="side-panel">
				<ActionPanel />
				<PlayerPanel />
			</div>
			<div v-if="store.viewSettings.showHistory" class="side-panel">
				<HistoryPanel />
			</div>
			<div v-if="store.viewSettings.showChat" class="side-panel">
				<ChatPanel />
			</div>
			<div v-if="store.viewSettings.showNotes && personal.pov >= 0" class="side-panel">
				<NotesPanel />
			</div>
		</div>
		<div class="footer">
			<a href="/index/">Online Board Gamers</a> ·
			<a href="/lobbyHelp">Help</a> ·
			<a href="/LBR/help/">Land Between Rivers rules</a> ·
			{{ store.gameName }} #{{ store.gameID }}
		</div>
	</div>
</template>

<style scoped>
.observer-note {
	background: #fbf236;
	color: #222034;
	padding: 5px 14px;
	font-size: 13px;
	font-weight: bold;
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
