<script setup>
import { computed, ref } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import { usePersonalStore } from "../stores/LBRpersonal.js";
import * as IO from "../backend/LBR_IO.js";
import * as controller from "../js/LBRcontroller.js";
import * as model from "../js/LBRmodel.js";

const store = useModelStore();
const personal = usePersonalStore();
const resignConfirm = ref(false);
const rewindConfirm = ref(false);
const kickoutConfirm = ref(false);

function newGame() {
	window.location.href = "/LBR/createLBRpage/";
}

function help() {
	window.open("/LBR/help/", "_blank");
}

function toggleHistory() {
	store.viewSettings.showHistory = !store.viewSettings.showHistory;
	if (store.viewSettings.showHistory) {
		store.viewSettings.showChat = false;
		store.viewSettings.showNotes = false;
	}
}

function toggleChat() {
	store.viewSettings.showChat = !store.viewSettings.showChat;
	if (store.viewSettings.showChat) {
		store.viewSettings.showHistory = false;
		store.viewSettings.showNotes = false;
		IO.loadChat().catch(() => {});
	}
}

function toggleNotes() {
	store.viewSettings.showNotes = !store.viewSettings.showNotes;
	if (store.viewSettings.showNotes) {
		store.viewSettings.showHistory = false;
		store.viewSettings.showChat = false;
	}
}

function zoomBy(delta) {
	const next = Math.min(65, Math.max(26, personal.zoom + delta));
	if (next === personal.zoom) return;
	personal.zoom = next;
	IO.saveZoom(next).catch(() => {});
}

async function confirmResign() {
	resignConfirm.value = false;
	await controller.doResign();
}

async function confirmRewind() {
	rewindConfirm.value = false;
	await controller.doRewind();
}

async function confirmKickout() {
	kickoutConfirm.value = false;
	try {
		await IO.kickout(model.actorUsername());
	} catch (error) {
		store.gameMessages.errorText = error.message || "Could not start the kickout.";
	}
}

function kicked() {
	const s = Math.max(0, store.secondsToNextKickout);
	const minutes = Math.floor(s / 60);
	const seconds = String(s % 60).padStart(2, "0");
	return `${minutes}:${seconds}`;
}

const canResign = computed(
	() => personal.pov >= 0 && !personal.trainingGame && store.game && !store.game.gameOver,
);
const canRewind = computed(
	() => personal.pov >= 0 && !personal.trainingGame && store.game && !store.game.gameOver,
);
const canKickout = computed(
	() =>
		personal.pov >= 0 &&
		!personal.trainingGame &&
		store.game &&
		!store.game.gameOver &&
		store.kickoutRequired === 2 &&
		!model.isMyTurn(),
);
</script>

<template>
	<div class="top-bar">
		<div class="title-block">
			<h1>{{ store.gameName || "Land Between Rivers" }} #{{ store.gameID }}</h1>
			<div class="subtitle">{{ model.turnText() }}</div>
		</div>

		<button @click="newGame">New Game</button>
		<button @click="help">Help</button>
		<button @click="toggleHistory">{{ store.viewSettings.showHistory ? "Hide History" : "History" }}</button>
		<button @click="toggleChat">
			{{ store.viewSettings.showChat ? "Hide Chat" : "Chat" }}
			<span v-if="store.chatNotification" class="chat-dot">●</span>
		</button>
		<button v-if="personal.pov >= 0" @click="toggleNotes">{{ store.viewSettings.showNotes ? "Hide Notes" : "Notes" }}</button>

		<span class="zoom-group">
			<button @click="zoomBy(-6)" title="Zoom out">-</button>
			<button @click="zoomBy(6)" title="Zoom in">+</button>
		</span>

		<span v-if="store.secondsToNextKickout > 0" class="timer" title="Time until the current player can be kicked out">
			⏱ {{ kicked() }}
		</span>
		<span v-if="store.kickoutRequired === 2" class="warning">⚠ Kickout available</span>

		<span v-if="store.finishedGame" class="finished">Finished</span>

		<template v-if="canKickout">
			<button v-if="!kickoutConfirm" class="ghost" @click="kickoutConfirm = true">
				Kick out {{ model.actorName() }}
			</button>
			<span v-else class="confirm">
				<button @click="confirmKickout">Confirm kickout of {{ model.actorName() }}</button>
				<button class="ghost" @click="kickoutConfirm = false">Cancel</button>
			</span>
		</template>

		<template v-if="canRewind">
			<button v-if="!rewindConfirm" class="ghost" @click="rewindConfirm = true">Rewind</button>
			<span v-else class="confirm">
				<button @click="confirmRewind">Confirm rewind</button>
				<button class="ghost" @click="rewindConfirm = false">Cancel</button>
			</span>
		</template>

		<template v-if="canResign">
			<button v-if="!resignConfirm" class="ghost" @click="resignConfirm = true">Resign</button>
			<span v-else class="confirm">
				<button @click="confirmResign">Confirm resign</button>
				<button class="ghost" @click="resignConfirm = false">Cancel</button>
			</span>
		</template>
	</div>
</template>

<style scoped>
.title-block {
	flex: 1 1 300px;
}

.subtitle {
	font-size: 13px;
	opacity: 0.85;
}

.chat-dot {
	color: #fbf236;
	margin-left: 3px;
}

.timer {
	font-size: 14px;
	font-variant-numeric: tabular-nums;
}

.warning {
	color: #ffb670;
	font-weight: bold;
	font-size: 13px;
}

.finished {
	background: #fbf236;
	color: #222034;
	padding: 3px 7px;
	border-radius: 4px;
	font-weight: bold;
}

.zoom-group {
	display: inline-flex;
	gap: 3px;
}

.confirm {
	display: inline-flex;
	gap: 4px;
}

@media (max-width: 700px) {
	.top-bar {
		font-size: 13px;
	}
}
</style>
