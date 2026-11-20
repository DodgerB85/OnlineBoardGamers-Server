<script setup>
import { computed, onMounted, ref } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import { usePersonalStore } from "../stores/LBRpersonal.js";
import * as IO from "../backend/LBR_IO.js";
import * as model from "../js/LBRmodel.js";
import { dynastyStyle } from "../js/LBRview.js";

const store = useModelStore();
const personal = usePersonalStore();
const text = ref("");
const sending = ref(false);
const chatErrorText = ref("");

const SEAT_COLOURS = ["#8a5a2b", "#4a6fa5", "#b08a2e", "#3f7d4f"];

const canSend = computed(() => personal.pov >= 0 || personal.isAdmin);

onMounted(() => {
	IO.loadChat().catch(() => {});
});

function time(ts) {
	if (!ts) return "";
	const date = new Date(ts);
	return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function playerSeat(name) {
	return model.seatOfName(name);
}

function playerStyle(name) {
	const seat = playerSeat(name);
	if (seat < 0) return {};
	return { backgroundColor: SEAT_COLOURS[seat] || "#555555", color: "white", padding: "0 4px", border: "1px solid black" };
}

async function send() {
	const message = text.value.trim();
	if (!message || sending.value) return;
	sending.value = true;
	chatErrorText.value = "";
	try {
		await IO.sendChat(message);
		text.value = "";
	} catch {
		chatErrorText.value = "Could not send the message.";
	} finally {
		sending.value = false;
	}
}
</script>

<template>
	<div id="wholeChat" role="region" aria-label="Game chat">
		<div class="chatHeading">
			<span class="chatUser">{{ personal.name }}</span>
			<h2>Chat</h2>
			<button type="button" class="utilityClose" @click="store.viewSettings.showChat = false" aria-label="Close chat">×</button>
		</div>
		<div id="chatBox">
			<p v-if="chatErrorText" class="errorText" role="alert">{{ chatErrorText }}</p>
			<template v-if="canSend">
				<div><textarea rows="6" v-model="text" aria-label="Chat message"></textarea></div>
				<div><button type="button" class="actionsLineButton" :disabled="sending || !text.trim()" @click="send">{{ sending ? "Sending…" : "Send" }}</button></div>
			</template>
			<p v-else class="spectatorNote">Spectators can read the chat but cannot send messages.</p>
		</div>
		<div id="messageList">
			<div class="chatentry" v-for="(message, index) in store.chatMessages" :key="index">
				<div class="header">
					<span class="author" :style="playerStyle(message[0])">{{ message[0] }}</span>
					<span v-if="playerSeat(message[0]) >= 0" class="chatMarker" :style="dynastyStyle(playerSeat(message[0]), 20)" :title="model.seatName(playerSeat(message[0]))"></span>
					<span class="date">{{ time(message[1]) }}</span>
				</div>
				<div class="messageBody">{{ message[2] }}</div>
			</div>
			<p v-if="!store.chatMessages.length" class="empty">No messages yet.</p>
		</div>
	</div>
</template>

<style scoped>
#wholeChat {
	position: fixed;
	left: 2px;
	top: calc(var(--lbr-menu-height, 60px) + 2px);
	width: 450px;
	max-width: calc(100vw - 4px);
	max-height: calc(100vh - var(--lbr-menu-height, 60px) - 4px);
	box-sizing: border-box;
	z-index: 9999;
	border: 2px solid black;
	background-color: #d4eafd;
	overflow-y: auto;
	padding-bottom: 10px;
	text-align: center;
}
#chatBox textarea { width: 90%; box-sizing: border-box; }
.chatHeading { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 12px; background: #d4eafd; border-bottom: 1px solid #adc2d0; }
.chatHeading h2 { font-size: 20px; }
.chatHeading button { font-size: 26px; border: 0; background: none; cursor: pointer; padding: 5px; }
.chatUser { font-size: 13px; font-weight: bold; opacity: 0.75; }
#messageList { padding: 0 6px; }
.chatMarker { display: inline-block; vertical-align: middle; margin-left: 4px; border-radius: 50%; }
.chatentry {
	overflow-wrap: anywhere;
	margin: 5px;
	border: #000 1px solid;
	text-align: left;
	padding: 5px;
	background-color: #d4eafd;
}
.chatentry .header { margin-bottom: 7px; border-bottom: #000 1px solid; display: flex; align-items: center; }
.chatentry .author { font-weight: bold; line-height: 1.2; }
.chatentry .header .date { font-size: 0.7em; font-style: italic; float: none; margin-left: auto; }
.chatentry .messageBody { overflow: auto; white-space: pre-wrap; }
.spectatorNote, .empty { font-size: 14px; opacity: 0.8; }
.errorText {
	width: 100%;
	font-weight: bolder;
	text-align: center;
	background-color: lightgoldenrodyellow;
	color: darkred;
}
@media (max-width: 1050px) { .chatHeading button { min-width: 44px; min-height: 44px; box-sizing: border-box; } }
</style>
