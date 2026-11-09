<script setup>
import { computed, onMounted, onUnmounted } from "vue";

import TopMenu from "./components/TopMenu.vue";
import TopMenuViews from "./components/TopMenuViews.vue";
import KickoutDialog from "./components/KickoutDialog.vue";
import FooterBar from "./components/FooterBar.vue";
import BoardArea from "./components/BoardArea.vue";
import ActionBar from "./components/ActionBar.vue";
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
const seats = computed(() => Array.from({ length: store.game?.numSeats || 0 }, (_, i) => i));
const mySeat = computed(() => personal.pov);
// Your own card sits on the right, alone; every other player stacks on the left.
const rightSeats = computed(() => (seats.value.includes(mySeat.value) ? [mySeat.value] : []));
const leftSeats = computed(() => seats.value.filter((seat) => seat !== mySeat.value));

let pollTimer = null;
let kickoutTimer = null;

function schedulePoll() {
	pollTimer = setTimeout(async () => {
		if (!document.hidden) await IO.checkForLatestData();
		schedulePoll();
	}, IO.pollIntervalMs(store.game, store.aiSeats));
}

function onKeydown(event) {
	if (event.key !== "Escape") return;
	const target = event.target;
	if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) return;
	controller.resetSelection();
}

onMounted(() => {
	IO.checkForLatestData(true);
	schedulePoll();
	kickoutTimer = setInterval(() => {
		if (store.secondsToNextKickout > 0) store.secondsToNextKickout--;
	}, 1000);
	document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
	if (pollTimer) clearTimeout(pollTimer);
	if (kickoutTimer) clearInterval(kickoutTimer);
	document.removeEventListener("keydown", onKeydown);
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
	<div class="game-area">
		<aside class="player-rail left">
			<PlayerPanel :seats="leftSeats" />
		</aside>
		<div class="center-column">
			<ActionBar />
			<BoardArea />
		</div>
		<aside v-if="rightSeats.length" class="player-rail right">
			<PlayerPanel :seats="rightSeats" />
		</aside>
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

/* Two 250px rails stay beside the board down to 1300px; the board shrinks to
   fit. Below that the rails move under it. */
@media (max-width: 1300px) {
	.game-area {
		flex-wrap: wrap;
	}
	.center-column {
		order: -1;
		flex-basis: 100%;
		min-height: 60vh;
	}
	.player-rail {
		flex: 1 1 100%;
		flex-direction: row;
		overflow-x: auto;
	}
}
</style>
