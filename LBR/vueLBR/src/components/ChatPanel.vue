<script setup>
import { onMounted, ref } from "vue";

import { useModelStore } from "../stores/LBRstore.js";
import * as IO from "../backend/LBR_IO.js";

const store = useModelStore();
const text = ref("");
const sending = ref(false);

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
	<div class="panel chat-panel">
		<h2>Chat</h2>
		<ul>
			<li v-for="(message, index) in store.chatMessages" :key="index">
				<div class="meta">{{ message[0] }} <span class="time">{{ time(message[1]) }}</span></div>
				<div class="text">{{ message[2] }}</div>
			</li>
		</ul>
		<p v-if="!store.chatMessages.length" class="empty">No messages yet.</p>
		<div class="composer">
			<textarea v-model="text" rows="3" placeholder="Write a message"></textarea>
			<button class="action" :disabled="sending || !text.trim()" @click="send">Send</button>
		</div>
	</div>
</template>

<style scoped>
.chat-panel {
	max-height: 70vh;
	display: flex;
	flex-direction: column;
}

ul {
	list-style: none;
	padding: 0;
	margin: 0 0 8px;
	overflow: auto;
	flex: 1;
}

li {
	border-bottom: 1px solid rgba(102, 57, 49, 0.25);
	padding: 5px 0;
	font-size: 13px;
}

.meta {
	font-weight: bold;
}

.time {
	font-weight: normal;
	opacity: 0.65;
	margin-left: 5px;
}

.text {
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.composer {
	display: flex;
	gap: 6px;
}

textarea {
	flex: 1;
	font: inherit;
}

.empty {
	opacity: 0.7;
}
</style>
