<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { useGameStore } from "../stores/game"
import { usePersonalStore } from "../stores/personal"
import { decompress, saveNotes, sendChatMessage, submitBug } from "../backend/ROW_IO"
import { broadcastChatUpdate } from "../backend/ROWwebsocket"

const { t } = useI18n()
const store = useGameStore()
const personal = usePersonalStore()

const chatMessage = ref("")
const bugReport = ref("")

async function sendChat() {
	if (!chatMessage.value) return
	try {
		const returned = await sendChatMessage(personal.gameID, [personal.name, Date.now(), chatMessage.value])
		const parsed = decompress(returned)
		if (Array.isArray(parsed)) store.chatData.splice(0, store.chatData.length, ...parsed)
		chatMessage.value = ""
		broadcastChatUpdate()
	} catch {
		store.gameMessages.errorText = "Error sending chat message"
	}
}

async function saveNotesWithFeedback() {
	try {
		await saveNotes(personal.gameID, personal.notes)
		store.gameMessages.successText = "Notes saved"
	} catch {
		store.gameMessages.errorText = "Error saving notes"
	}
}

async function submitBugReport() {
	try {
		const ok = await submitBug(personal.gameID, bugReport.value, store.serialize())
		store.gameMessages.successText = ok ? "Bug report submitted" : "Bug report failed"
		if (ok) bugReport.value = ""
	} catch {
		store.gameMessages.errorText = "Error submitting bug report"
	}
}
</script>

<template>
	<div id="panels">
		<div v-if="store.viewSettings.showBug" class="panel">
			<h3>{{ t('panels.bugReport') }}</h3>
			<p>{{ t('panels.bugIntro') }}</p>
			<textarea v-model="bugReport" rows="6" cols="80"></textarea>
			<div>
				<button @click="submitBugReport">{{ t('panels.submit') }}</button>
				<button @click="store.viewSettings.showBug = false">{{ t('panels.cancel') }}</button>
			</div>
		</div>
		<div v-if="store.viewSettings.showNotes" class="panel">
			<h3>{{ t('panels.notesTitle') }} - {{ t('panels.notesPrivate') }}</h3>
			<textarea v-model="personal.notes" rows="8" cols="80"></textarea>
			<div>
				<button @click="saveNotesWithFeedback">{{ t('panels.save') }}</button>
				<button @click="store.viewSettings.showNotes = false">{{ t('panels.close') }}</button>
			</div>
		</div>
		<div v-if="store.viewSettings.showChat" class="panel">
			<h3>{{ t('panels.chatTitle') }}</h3>
			<div class="chatList">
				<div v-for="(m, i) in store.chatData" :key="i">{{ (m as unknown[])[0] }}: {{ (m as unknown[])[2] }}</div>
			</div>
			<div>
				<textarea v-model="chatMessage" rows="3" cols="60"></textarea>
				<button @click="sendChat">{{ t('panels.send') }}</button>
			</div>
		</div>
		<div v-if="store.viewSettings.showInfo" class="panel">
			<h3>{{ t('topMenu.info') }}</h3>
			<div v-for="p in store.state?.players ?? []" :key="p.name">{{ p.name }}</div>
		</div>
		<div v-if="store.gameMessages.successText" class="feedback success">{{ store.gameMessages.successText }}</div>
		<div v-if="store.gameMessages.errorText" class="feedback error">{{ store.gameMessages.errorText }}</div>
	</div>
</template>

<style scoped>
.panel { background: lightblue; border: 2px solid black; margin: 6px; padding: 8px; text-align: center; }
.chatList { max-height: 160px; overflow-y: auto; background: white; margin-bottom: 6px; }
button { margin: 4px; padding: 4px 10px; cursor: pointer; }
.feedback { margin: 4px; font-weight: bold; }
.feedback.success { color: #0a6c0a; }
.feedback.error { color: #b00000; }
</style>
