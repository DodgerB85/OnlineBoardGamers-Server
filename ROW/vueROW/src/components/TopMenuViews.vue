<script setup>
import { computed, nextTick, ref, watch } from "vue"
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
const chatList = ref(null)
const bugReport = ref("")
const sendingChat = ref(false)
const savingNotes = ref(false)
const submittingBug = ref(false)
const PANEL_KEYS = ["showBug", "showNotes", "showChat", "showInfo", "showVotes"]
let previousFocus = null

const openPanel = computed(() => PANEL_KEYS.find((key) => store.viewSettings[key]) ?? null)
watch(openPanel, (name) => {
	if (!name) return
	previousFocus = document.activeElement
	nextTick(() => document.querySelector("#panels .panel")?.focus({ preventScroll: true }))
})

function closePanels() {
	for (const key of PANEL_KEYS) store.viewSettings[key] = false
	nextTick(() => {
		if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
	})
}

async function sendChat() {
	if (!chatMessage.value || sendingChat.value) return
	sendingChat.value = true
	try {
		const returned = await sendChatMessage(personal.gameID, [personal.name, Date.now(), chatMessage.value])
		const parsed = decompress(returned)
		if (Array.isArray(parsed)) store.chatData.splice(0, store.chatData.length, ...parsed)
		chatMessage.value = ""
		broadcastChatUpdate()
		await nextTick()
		if (chatList.value) chatList.value.scrollTop = chatList.value.scrollHeight
	} catch {
		store.gameMessages.errorText = t("error.sendingChat")
	} finally {
		sendingChat.value = false
	}
}

async function saveNotesWithFeedback() {
	if (savingNotes.value) return
	savingNotes.value = true
	try {
		await saveNotes(personal.gameID, personal.notes)
		store.gameMessages.successText = t("feedback.notesSaved")
	} catch {
		store.gameMessages.errorText = t("error.savingNotes")
	} finally {
		savingNotes.value = false
	}
}

async function clearNotes() {
	personal.notes = ""
	await saveNotesWithFeedback()
}

async function submitBugReport() {
	if (submittingBug.value) return
	if (!bugReport.value.trim()) {
		store.gameMessages.errorText = t("panels.bugRequired")
		return
	}
	submittingBug.value = true
	try {
		const ok = await submitBug(personal.gameID, bugReport.value, model.serialize())
		store.gameMessages.successText = ok ? t("feedback.bugSubmitted") : t("feedback.bugFailed")
		if (ok) bugReport.value = ""
	} catch {
		store.gameMessages.errorText = t("error.submittingBug")
	} finally {
		submittingBug.value = false
	}
}

// ---- votes (delete game / exclude from stats) ----
function voteSummary(data) {
	const entries = Object.entries(data ?? {})
	const voters = entries.filter(([, v]) => v === true || v === 2).map(([k]) => k)
	return t("votesPanel.summary", { count: voters.length, total: entries.length }) + (voters.length ? ": " + voters.join(", ") : "")
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
		store.gameMessages.errorText = t("error.castingVote")
	}
}
</script>

<template>
	<div id="panels">
		<transition name="slidePanel">
			<div v-if="store.viewSettings.showBug" class="panel" role="region" :aria-label="t('panels.bugReport')" tabindex="-1" @keydown.esc.stop.prevent="closePanels">
				<h3>{{ t('panels.bugReport') }}</h3>
				<p>{{ t('panels.bugIntro') }}</p>
				<textarea v-model="bugReport" rows="6" cols="80"></textarea>
				<div>
					<button class="actionsLineButton" :disabled="submittingBug" @click="submitBugReport">{{ t('panels.submit') }}</button>
					<button class="actionsLineButton" @click="store.viewSettings.showBug = false">{{ t('panels.cancel') }}</button>
				</div>
			</div>
		</transition>
		<transition name="slidePanel">
			<div v-if="store.viewSettings.showNotes" class="panel" role="region" :aria-label="t('panels.notesTitle')" tabindex="-1" @keydown.esc.stop.prevent="closePanels">
				<h3>{{ t('panels.notesTitle') }} - {{ t('panels.notesPrivate') }}</h3>
				<textarea v-model="personal.notes" rows="8" cols="80" maxlength="5000"></textarea>
				<div>
					<button class="actionsLineButton" :disabled="savingNotes" @click="saveNotesWithFeedback">{{ t('panels.save') }}</button>
					<button class="actionsLineButton" :disabled="savingNotes" @click="clearNotes">{{ t('panels.clear') }}</button>
					<button class="actionsLineButton" @click="store.viewSettings.showNotes = false">{{ t('panels.close') }}</button>
				</div>
			</div>
		</transition>
		<transition name="fade">
			<div v-if="store.viewSettings.showChat" class="panel chatPanel" role="region" :aria-label="t('panels.chatTitle')" tabindex="-1" @keydown.esc.stop.prevent="closePanels">
				<h3>{{ t('panels.chatTitle') }}</h3>
				<div ref="chatList" class="chatList">
					<div v-for="(m, i) in store.chatData" :key="i">{{ m[0] }}: {{ m[2] }}</div>
				</div>
				<div>
					<textarea v-model="chatMessage" rows="3" cols="60" maxlength="5000"></textarea>
					<button class="actionsLineButton" :disabled="sendingChat || !chatMessage" @click="sendChat">{{ t('panels.send') }}</button>
				</div>
			</div>
		</transition>
		<transition name="slidePanel">
			<div v-if="store.viewSettings.showInfo" class="panel" role="region" :aria-label="t('topMenu.info')" tabindex="-1" @keydown.esc.stop.prevent="closePanels">
				<h3>{{ t('topMenu.info') }}</h3>
				<div v-for="p in store.state?.players ?? []" :key="p.name">{{ p.name }}</div>
				<div v-if="store.missingPlayers.length" class="missing">{{ t('app.missing', { players: store.missingPlayers.join(", ") }) }}</div>
			</div>
		</transition>
		<transition name="slidePanel">
			<div v-if="store.viewSettings.showVotes && personal.pov >= 0 && !personal.trainingGame" class="panel" role="region" :aria-label="t('app.votes')" tabindex="-1" @keydown.esc.stop.prevent="closePanels">
				<h3>{{ t('app.votes') }}</h3>
				<div class="voteBlock">
					<div>{{ t('votesPanel.deleteExplain') }}</div>
					<div class="voteSummary">{{ voteSummary(store.deleteVotesData) }}</div>
					<button v-if="!personal.votedToDelete" class="actionsLineButton" @click="castVoteFor(rf.DELETE_VOTE_TOPIC)">{{ t('votesPanel.deleteButton') }}</button>
				</div>
				<div class="voteBlock">
					<div>{{ t('votesPanel.excludeExplain') }}</div>
					<div class="voteSummary">{{ voteSummary(store.statsExcludeVotesData) }}</div>
					<button v-if="!personal.votedToExclude" class="actionsLineButton" @click="castVoteFor(rf.STATS_EXCLUDE_VOTE_TOPIC)">{{ t('votesPanel.excludeButton') }}</button>
				</div>
			</div>
		</transition>
		<div v-if="store.gameMessages.successText" class="feedback success">{{ store.gameMessages.successText }}</div>
		<div v-if="store.gameMessages.errorText" class="feedback error">{{ store.gameMessages.errorText }}</div>
	</div>
</template>

<style scoped>
.panel { background: lightblue; border: 2px solid black; margin: 6px; padding: 8px; text-align: center; }
.panel:focus-visible { outline: 2px solid #177daf; outline-offset: -2px; }
.panel .actionsLineButton { margin: 5px; }
.chatPanel {
	position: fixed;
	left: 2px;
	top: 88px;
	z-index: 9999;
	width: min(450px, calc(100vw - 4px));
	max-height: calc(100vh - 96px);
	overflow-y: auto;
	box-sizing: border-box;
}
.chatList { max-height: 160px; overflow-y: auto; background: white; margin-bottom: 6px; }
.missing { color: #b00000; font-weight: bold; }
.voteBlock { margin: 6px 0; }
.voteSummary { font-size: 13px; margin: 3px 0; }
.feedback { margin: 4px; font-weight: bold; }
.feedback.success { color: #0a6c0a; }
.feedback.error { color: #b00000; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease-in-out; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slidePanel-enter-active, .slidePanel-leave-active { transition: all 0.2s ease-in-out, opacity 0.2s ease-in-out; overflow: hidden; max-height: 2000px; }
.slidePanel-enter-from, .slidePanel-leave-to { opacity: 0; max-height: 0; }
</style>
