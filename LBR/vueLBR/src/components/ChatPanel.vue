<script setup>
import { computed, onMounted, ref } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import { usePersonalStore } from "../stores/LBRpersonal.js";
import * as IO from "../backend/LBR_IO.js";

const store = useModelStore();
const personal = usePersonalStore();
const text = ref("");
const sending = ref(false);

const canSend = computed(() => personal.pov >= 0 || personal.isAdmin);

onMounted(() => {
	IO.loadChat().catch(() => {});
});

function time(ts) {
	if (!ts) return "";
	const date = new Date(ts);
	return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

async function send() {
	const message = text.value.trim();
	if (!message || sending.value) return;
	sending.value = true;
	try {
		await IO.sendChat(message);
		text.value = "";
	} catch {
		store.gameMessages.errorText = "Could not send the message.";
	} finally {
		sending.value = false;
	}
}
</script>

<template>
	<div id="wholeChat" role="region" aria-label="Game chat">
		<div class="chatHeading">
			<h2>Chat</h2>
			<button type="button" class="utilityClose" @click="store.viewSettings.showChat = false" aria-label="Close chat">×</button>
		</div>
		<div id="chatBox">
			<p v-if="store.gameMessages.errorText" class="errorText" role="alert">{{ store.gameMessages.errorText }}</p>
			<template v-if="canSend">
				<div><textarea rows="6" v-model="text" aria-label="Chat message"></textarea></div>
				<div><button type="button" class="actionsLineButton" :disabled="sending || !text.trim()" @click="send">{{ sending ? "Sending..." : "Send" }}</button></div>
			</template>
			<p v-else class="spectatorNote">Spectators can read the chat but cannot send messages.</p>
		</div>
		<div id="messageList">
			<div class="chatentry" v-for="(message, index) in store.chatMessages" :key="index">
				<div class="header">
					<span class="author">{{ message[0] }}</span>
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
#messageList { padding: 0 6px; }
.chatentry {
	overflow-wrap: anywhere;
	margin: 5px;
	border: #000 1px solid;
	text-align: left;
	padding: 5px;
	background-color: #d4eafd;
}
.chatentry .header { margin-bottom: 7px; border-bottom: #000 1px solid; }
.chatentry .author { font-weight: bold; }
.chatentry .header .date { font-size: 0.7em; font-style: italic; float: right; }
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
