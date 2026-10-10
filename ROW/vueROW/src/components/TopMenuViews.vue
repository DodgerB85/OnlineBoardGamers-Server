<script setup>
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import * as model from "../js/ROWmodel"
import * as rf from "../js/ROWreference"
import { useModelStore } from "../stores/ROWstore.js"
import { usePersonalStore } from "../stores/ROWpersonal.js"
import { castVote, decompress, saveNotes, sendChatMessage, submitBug } from "../backend/ROW_IO.js"
import { broadcastChatUpdate } from "../backend/ROWwebsocket.js"

const { t } = useI18n()
const store = useModelStore()
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
		const ok = await submitBug(personal.gameID, bugReport.value, model.serialize())
		store.gameMessages.successText = ok ? "Bug report submitted" : "Bug report failed"
		if (ok) bugReport.value = ""
	} catch {
		store.gameMessages.errorText = "Error submitting bug report"
	}
}

// ---- votes (delete game / exclude from stats) ----
function voteSummary(data) {
	const entries = Object.entries(data ?? {})
	const voters = entries.filter(([, v]) => v === true || v === 2).map(([k]) => k)
	return `${voters.length} of ${entries.length}${voters.length ? ": " + voters.join(", ") : ""}`
}

async function castVoteFor(topic) {
	try {
		const data = await castVote(personal.gameID, topic, true)
		if (data.voteChanged !== true) return
		if (data.votesData) {
			const parsed = typeof data.votesData === "string" ? JSON.parse(data.votesData) : data.votesData
			if (topic === rf.DELETE_VOTE_TOPIC) store.deleteVotesData = parsed
			else store.statsExcludeVotesData = parsed
		}
		if (topic === rf.DELETE_VOTE_TOPIC) {
			personal.votedToDelete = true
			if (data.redirect_url) window.location.href = data.redirect_url
		} else if (topic === rf.STATS_EXCLUDE_VOTE_TOPIC) {
			personal.votedToExclude = true
		}
	} catch {
		store.gameMessages.errorText = "Error casting vote"
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
				<div v-for="(m, i) in store.chatData" :key="i">{{ m[0] }}: {{ m[2] }}</div>
			</div>
			<div>
				<textarea v-model="chatMessage" rows="3" cols="60"></textarea>
				<button @click="sendChat">{{ t('panels.send') }}</button>
			</div>
		</div>
		<div v-if="store.viewSettings.showInfo" class="panel">
			<h3>{{ t('topMenu.info') }}</h3>
			<div v-for="p in store.state?.players ?? []" :key="p.name">{{ p.name }}</div>
			<div v-if="store.missingPlayers.length" class="missing">Missing: {{ store.missingPlayers.join(", ") }}</div>
		</div>
		<div v-if="store.viewSettings.showVotes && personal.pov >= 0 && !personal.trainingGame" class="panel">
			<h3>Votes</h3>
			<div class="voteBlock">
				<div>If all players agree, this game will be deleted.</div>
				<div class="voteSummary">{{ voteSummary(store.deleteVotesData) }}</div>
				<button v-if="!personal.votedToDelete" @click="castVoteFor(rf.DELETE_VOTE_TOPIC)">Vote to delete game</button>
			</div>
			<div class="voteBlock">
				<div>If all players agree, this game will be excluded from statistics.</div>
				<div class="voteSummary">{{ voteSummary(store.statsExcludeVotesData) }}</div>
				<button v-if="!personal.votedToExclude" @click="castVoteFor(rf.STATS_EXCLUDE_VOTE_TOPIC)">Vote to exclude from stats</button>
			</div>
		</div>
		<div v-if="store.gameMessages.successText" class="feedback success">{{ store.gameMessages.successText }}</div>
		<div v-if="store.gameMessages.errorText" class="feedback error">{{ store.gameMessages.errorText }}</div>
	</div>
</template>

<style scoped>
.panel { background: lightblue; border: 2px solid black; margin: 6px; padding: 8px; text-align: center; }
.chatList { max-height: 160px; overflow-y: auto; background: white; margin-bottom: 6px; }
.missing { color: #b00000; font-weight: bold; }
.voteBlock { margin: 6px 0; }
.voteSummary { font-size: 13px; margin: 3px 0; }
button { margin: 4px; padding: 4px 10px; cursor: pointer; }
.feedback { margin: 4px; font-weight: bold; }
.feedback.success { color: #0a6c0a; }
.feedback.error { color: #b00000; }
</style>
