<script setup>
import * as view from "../js/URRview"
import * as rf from "../js/URRreference"
import * as IO from "../backend/URR_IO"

import { ref } from "vue"

import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
import PlayerTable from "./PlayerTable.vue"
const store = useModelStore()
const personal = usePersonalStore()

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
		store.gameMessages.bugErrorText = "Please enter a bug report"
		submittingBug.value = false
		return
	}
	await IO.submitBug(bugReportText.value)
	submittingBug.value = false
}

function getStatsExcludeVotes(returnPlayers = false) {
	let votes = 0
	let players = "None"
	for (const player in store.statsExcludeVotesData) {
		if (store.statsExcludeVotesData[player] === true) {
			votes += 1
			if (players === "None") players = String(player)
			else players += ", " + player
		}
	}
	return returnPlayers ? players : votes
}

function getDeleteVotes(returnPlayers = false) {
	let votes = 0
	let players = "None"
	for (const player in store.deleteVotesData) {
		if (store.deleteVotesData[player] === true) {
			votes += 1
			if (players === "None") players = String(player)
			else players += ", " + player
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
			<h1>Bug Report</h1>
			<h2 class="errorText" v-if="store.gameMessages.bugErrorText !== ''" v-html="store.gameMessages.bugErrorText"></h2>
			<p>
				Please submit a bug report if you encounter any issues, giving as much detail as possible.
				<br />
				The game data will be submitted along with your report.
			</p>
			<div><textarea cols="150" rows="10" v-model="bugReportText"></textarea></div>
			<div>
				<button class="actionsLineButton" @click="submitBug" :disabled="submittingBug">
					<span v-if="submittingBug">Submitting Bug Report...</span>
					<span v-else>Submit</span>
				</button>
				<button class="actionsLineButton" @click="toggleBug">Cancel</button>
			</div>
		</div>
	</transition>

	<!-- NOTES -->
	<transition name="slidePanel">
		<div id="notesBox" v-if="store.viewSettings.showNotes">
			<h2>Personal game notes</h2>
			<p>Only you can see these notes</p>
			<p v-if="store.gameMessages.notesErrorText" class="errorText" role="alert">{{ store.gameMessages.notesErrorText }}</p>
			<div><textarea cols="120" rows="10" v-model="personal.notes" maxlength="5000" aria-label="Personal game notes"></textarea></div>
			<div>
				<button class="actionsLineButton" :disabled="store.viewSettings.isSavingNotes" @click="IO.saveNotes">{{ store.viewSettings.isSavingNotes ? 'Saving…' : 'Save' }}</button>
				<button class="actionsLineButton" :disabled="store.viewSettings.isSavingNotes" @click="clearNotes">Clear</button>
				<button class="actionsLineButton" @click="toggleNotes">Close</button>
			</div>
		</div>
	</transition>

	<!-- CHAT -->
	<div id="wholeChat" v-if="store.viewSettings.showChat" role="region" aria-label="Game chat">
		<div class="chatHeading"><h2>Send a message</h2><button @click="store.viewSettings.showChat = false" aria-label="Close chat">×</button></div>
		<div id="chatBox">
			<p v-if="store.gameMessages.chatErrorText" class="errorText" role="alert">{{ store.gameMessages.chatErrorText }}</p>
			<div><textarea rows="6" v-model="chatMessage" aria-label="Chat message"></textarea></div>
			<div><button class="actionsLineButton" :disabled="store.viewSettings.isSendingChat || !chatMessage" @click="sendChatMessage">{{ store.viewSettings.isSendingChat ? 'Sending…' : 'Send' }}</button></div>
		</div>
		<div id="messageList">
			<div class="chatentry" v-for="(message, index) in store.chatData" :key="index">
				<div class="header"><span class="bold">{{ message[0] }}</span><span class="date">{{ new Date(message[1] * 1000).toLocaleString() }}</span></div>
				<div class="messageBody">{{ message[2] }}</div>
			</div>
		</div>
	</div>

	<!-- REWIND PANEL -->
	<div id="rewindPanel" v-if="store.viewSettings.showRewindPanel">
		<div class="utilityHeading"><b>Rewind and game votes</b><button @click="store.viewSettings.showRewindPanel = false" aria-label="Close rewind panel">×</button></div>
		<p>Rewind restores the previous saved position. Please tell the other players in chat.</p>
		<p v-if="store.gameMessages.errorText" class="errorText" role="alert">{{ store.gameMessages.errorText }}</p>
		<button class="topMenuItem" :disabled="store.viewSettings.showLoader || store.viewSettings.isSaving || personal.haltPlay || store.viewSettings.showReplay" @click="IO.loadRewind()">
			<img :src="view.getImage('icon-rewind')" alt="" />
			<span>Rewind</span>
		</button>
		<hr />
		<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
			If all players agree, this game can be excluded from the stats (won't count towards wins/losses)
			<br />
			Votes: {{ getStatsExcludeVotes(false) }} - Players: {{ getStatsExcludeVotes(true) }}
			<br />
			<button v-if="!personal.votedToExclude" class="actionsLineButton" @click="localCastVote(rf.STATS_EXCLUDE_VOTE_TOPIC)">Vote to Exclude Game from Stats</button>
		</div>
		<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
			If all players agree, this game will be deleted
			<br />
			Votes: {{ getDeleteVotes(false) }} - Players: {{ getDeleteVotes(true) }}
			<br />
			<button v-if="!personal.votedToDelete" class="actionsLineButton" @click="localCastVote(rf.DELETE_VOTE_TOPIC)">Vote to Delete Game</button>
		</div>
	</div>

	<!-- Info -->
	<transition name="slidePanel">
		<div id="info" v-if="store.viewSettings.showInfo">
			<div class="utilityHeading infoHeading"><b>Game information</b><button @click="store.viewSettings.showInfo = false" aria-label="Close game information">×</button></div>
			<PlayerTable :minimiseInfoForMainScreen="false" />
			<p><b>Game name:</b> {{ store.gameName }}</p>
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
#bugReport, #notesBox, #info {
	text-align: center;
	margin-bottom: 10px;
	border: 2px solid black;
	background-color: lightblue;
}
/* max-height rather than a fixed height, so the variable-height panels (info)
   cannot be clipped by a magic number. */
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
#chatBox textarea { width: 90%; }
.chatHeading { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 12px; background: #d4eafd; border-bottom: 1px solid #adc2d0; }.chatHeading h2 { font-size: 20px; }.chatHeading button { font-size: 26px; border: 0; background: none; cursor: pointer; padding: 5px; }
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
	left: 440px;
	font-size: 18px;
	z-index: 10000;
	color: white;
}
.topMenuItem { display: inline-block; width: 62px; height: 55px; cursor: pointer; text-align: center; }
.topMenuItem img { width: 38px; height: 38px; }
.topMenuItem span { font-size: 14px; font-weight: bold; display: block; }
.utilityHeading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.utilityHeading button { border: 0; background: none; color: inherit; font-size: 26px; cursor: pointer; }.topMenuItem { border: 0; background: #303030; color: white; border-radius: 3px; }.topMenuItem:disabled { opacity: .5; cursor: default; }
.infoHeading { position: sticky; top: 0; z-index: 2; background: lightblue; padding: 4px 12px; border-bottom: 1px solid #adc2d0; text-align: left; }
@media (max-width: 1050px) { .chatHeading button, .utilityHeading button { min-width: 44px; min-height: 44px; box-sizing: border-box; } }
</style>
