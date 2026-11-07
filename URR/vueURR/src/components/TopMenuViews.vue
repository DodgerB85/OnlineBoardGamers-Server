<script setup>
import PlayerMarker from "./PlayerMarker.vue"
import * as view from "../js/URRview"
import * as rf from "../js/URRreference"
import * as IO from "../backend/URR_IO"

import { ref } from "vue"
import { useI18n } from "vue-i18n"

import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()
const { t } = useI18n()

const chatMessage = ref("")
const bugReportText = ref("")
const submittingBug = ref(false)

function toggleBug() {
	store.viewSettings.showNotes = false
	store.viewSettings.showBug = !store.viewSettings.showBug
}

function toggleNotes() {
	store.viewSettings.showBug = false
	store.viewSettings.showNotes = !store.viewSettings.showNotes
}

async function sendChatMessage() {
	if (chatMessage.value === "") return
	const latestMessageTime = store.chatData[0]?.[1] ?? personal.gameCreationTimestamp
	let time = Math.round(new Date().getTime() / 1000 - latestMessageTime)
	let newEntry = [personal.name, time, chatMessage.value]
	if (await IO.sendChatMessage([...newEntry]) && chatMessage.value === newEntry[2]) chatMessage.value = ""
}

function clearNotes() {
	personal.notes = ""
	IO.saveNotes()
}

async function submitBug() {
	submittingBug.value = true
	store.gameMessages.bugErrorText = ""
	store.gameMessages.successText = ""
	if (bugReportText.value.length === 0) {
		store.gameMessages.bugErrorText = t("bug.required")
		submittingBug.value = false
		return
	}
	await IO.submitBug(bugReportText.value)
	submittingBug.value = false
}

function getStatsExcludeVotes(returnPlayers = false) {
	let votes = 0
	let players = t("common.none")
	for (const player in store.statsExcludeVotesData) {
		if (store.statsExcludeVotesData[player] === true) {
			votes += 1
			players = players === t("common.none") ? String(player) : players + ", " + player
		}
	}
	return returnPlayers ? players : votes
}

function getDeleteVotes(returnPlayers = false) {
	let votes = 0
	let players = t("common.none")
	for (const player in store.deleteVotesData) {
		if (store.deleteVotesData[player] === true) {
			votes += 1
			players = players === t("common.none") ? String(player) : players + ", " + player
		}
	}
	return returnPlayers ? players : votes
}

function localCastVote(topic) {
	IO.castVote(topic)
}
</script>

<template>
	<!-- BUG REPORT -->
	<transition name="slidePanel">
		<div id="bugReport" v-if="store.viewSettings.showBug">
			<h1>{{ $t("bug.title") }}</h1>
			<h2 class="errorText" v-if="store.gameMessages.bugErrorText !== ''" v-html="store.gameMessages.bugErrorText"></h2>
			<p>
				{{ $t("bug.intro") }}
				<br />
				{{ $t("bug.data") }}
			</p>
			<div><textarea cols="150" rows="10" v-model="bugReportText"></textarea></div>
			<div>
				<button class="actionsLineButton" @click="submitBug" :disabled="submittingBug">
					<span v-if="submittingBug">{{ $t("bug.submitting") }}</span>
					<span v-else>{{ $t("bug.submit") }}</span>
				</button>
				<button class="actionsLineButton" @click="toggleBug">{{ $t("common.cancel") }}</button>
			</div>
		</div>
	</transition>

	<!-- NOTES -->
	<transition name="slidePanel">
		<div id="notesBox" v-if="store.viewSettings.showNotes">
			<h2>{{ $t("notes.title") }}</h2>
			<p>{{ $t("notes.private") }}</p>
			<p v-if="store.gameMessages.notesErrorText" class="errorText" role="alert">{{ store.gameMessages.notesErrorText }}</p>
			<div><textarea cols="120" rows="10" v-model="personal.notes" maxlength="5000" :aria-label="$t('notes.aria')"></textarea></div>
			<div>
				<button class="actionsLineButton" :disabled="store.viewSettings.isSavingNotes" @click="IO.saveNotes">{{ store.viewSettings.isSavingNotes ? $t('notes.saving') : $t('notes.save') }}</button>
				<button class="actionsLineButton" :disabled="store.viewSettings.isSavingNotes" @click="clearNotes">{{ $t("notes.clear") }}</button>
				<button class="actionsLineButton" @click="toggleNotes">{{ $t("notes.close") }}</button>
			</div>
		</div>
	</transition>

	<!-- CHAT -->
	<transition name="fade">
	<div id="wholeChat" v-if="store.viewSettings.showChat" role="region" :aria-label="$t('chat.aria')">
		<div id="chatBox">
			<h2>{{ $t("chat.title") }}</h2>
			<p v-if="store.gameMessages.chatErrorText" class="errorText" role="alert">{{ store.gameMessages.chatErrorText }}</p>
			<div><textarea rows="6" v-model="chatMessage" :aria-label="$t('chat.messageAria')"></textarea></div>
			<div><button class="actionsLineButton" :disabled="store.viewSettings.isSendingChat || !chatMessage" @click="sendChatMessage">{{ store.viewSettings.isSendingChat ? $t('chat.sending') : $t('chat.send') }}</button></div>
		</div>
		<div id="messageList">
			<div class="chatentry" v-for="(message, index) in store.chatData" :key="index">
				<div class="header"><span class="bold">{{ message[0] }}</span><PlayerMarker v-if="view.playerIndexByName(store, message[0]) >= 0" class="chatMarker" :index="view.playerIndexByName(store, message[0])" /><span class="date">{{ new Date(message[1] * 1000).toLocaleString() }}</span></div>
				<div class="messageBody">{{ message[2] }}</div>
			</div>
		</div>
	</div>
	</transition>

	<!-- REWIND PANEL -->
	<transition name="fade">
	<div id="rewindPanel" v-if="store.viewSettings.showRewindPanel && store.gameflow.phase !== rf.PHASE_GAME_OVER">
		<p>{{ $t("rewind.intro") }}</p>
		<p>{{ $t("rewind.courtesy") }}</p>
		<p>{{ $t("rewind.misuse") }}</p>
		<p v-if="store.gameMessages.errorText" class="errorText" role="alert"><CurrencyText :text="store.gameMessages.errorText" /></p>
		<button class="topMenuItem" :disabled="!!store.turnDraft.start || store.viewSettings.showLoader || store.viewSettings.isSaving || personal.haltPlay || store.viewSettings.showReplay" :title="store.turnDraft.start ? $t('rewind.resetFirst') : $t('rewind.previousTurn')" @click="IO.loadRewind()">
			<img :src="view.getImage('icon-rewind')" alt="" />
			<span>{{ $t("rewind.rewind") }}</span>
		</button>
		<hr />
		<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
			{{ $t("rewind.statsIntro") }}
			<br />
			{{ $t("rewind.votesPlayers", { votes: getStatsExcludeVotes(false), players: getStatsExcludeVotes(true) }) }}
			<br />
			<button v-if="!personal.votedToExclude" class="actionsLineButton" @click="localCastVote(rf.STATS_EXCLUDE_VOTE_TOPIC)">{{ $t("rewind.voteExclude") }}</button>
		</div>
		<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
			{{ $t("rewind.deleteIntro") }}
			<br />
			{{ $t("rewind.votesPlayers", { votes: getDeleteVotes(false), players: getDeleteVotes(true) }) }}
			<br />
			<button v-if="!personal.votedToDelete" class="actionsLineButton" @click="localCastVote(rf.DELETE_VOTE_TOPIC)">{{ $t("rewind.voteDelete") }}</button>
		</div>
	</div>
	</transition>

</template>

<style scoped>
.actionsLineButton {
	margin: 10px;
	width: fit-content;
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 5px;
	cursor: pointer;
}
.actionsLineButton:hover { background-color: lightgrey; }
.errorText {
	width: 100%;
	font-weight: bolder;
	text-align: center;
	background-color: lightgoldenrodyellow;
	color: darkred;
}
#bugReport, #notesBox {
	text-align: center;
	margin-bottom: 10px;
	border: 2px solid black;
	background-color: lightblue;
}
/* Variable-height panels must not be clipped by a fixed height. */
.slidePanel-enter-active,
.slidePanel-leave-active {
	transition: all 0.2s ease-in-out, opacity 0.2s ease-in-out;
	overflow: hidden;
	max-height: 2000px;
}
.slidePanel-enter-from,
.slidePanel-leave-to {
	opacity: 0;
	max-height: 0;
}
#wholeChat {
	position: fixed;
	left: 2px;
	top: calc(var(--urr-menu-height, 60px) + 2px);
	width: 450px;
	max-width: calc(100vw - 4px);
	max-height: calc(100vh - var(--urr-menu-height, 60px) - 4px);
	box-sizing: border-box;
	z-index: 9999;
	border: 2px solid black;
	background-color: #d4eafd;
	overflow-y: scroll;
	padding-bottom: 10px;
	text-align: center;
}
#chatBox { text-align: center; }
#chatBox textarea { width: 90%; }
#notesBox textarea, #bugReport textarea { max-width: 90%; box-sizing: border-box; }
.actionsLineButton:disabled { cursor: default; opacity: .5; }@media (max-width: 1050px) { .actionsLineButton { min-height: 40px; } }
.chatentry {
	overflow-wrap: anywhere;
	margin: 5px;
	border: #000 1px solid;
	text-align: left;
	padding: 5px;
	background-color: #d4eafd;
}
.chatentry .header { margin-bottom: 7px; border-bottom: #000 1px solid; }
.chatentry .header .chatMarker { margin-left: 4px; }
.chatentry .header .date { font-size: 0.7em; font-style: italic; float: right; }
.chatentry .header .bold { font-weight: bold; }
.chatentry .messageBody { overflow: auto; white-space: pre-wrap; }
#rewindPanel {
	position: absolute;
	background-color: black;
	border: 1px solid white;
	padding: 5px;
	width: 400px;
	top: var(--urr-menu-height, 60px);
	left: 650px;
	font-size: 18px;
	z-index: 10000;
	color: white;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease-in-out; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.topMenuItem { display: inline-block; width: 62px; height: 55px; cursor: pointer; text-align: center; }
.topMenuItem img { width: 38px; height: 38px; }
.topMenuItem span { font-size: 16px; font-weight: bold; display: block; }
.topMenuItem { border: 0; background: #303030; color: white; border-radius: 3px; }.topMenuItem:disabled { opacity: .5; cursor: default; }
</style>
