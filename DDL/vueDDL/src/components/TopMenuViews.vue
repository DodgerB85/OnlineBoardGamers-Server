<script setup>
import TurnNudge from "./utils/TurnNudge.vue"
import * as view from "../js/DDLview"
import * as rf from "../js/DDLreference"
import * as IO from "../backend/DDL_IO"

import { ref } from "vue"

import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"
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

function sendChatMessage() {
	if (chatMessage.value === "") return
	let time = Math.round(new Date().getTime() / 1000 - store.chatData[0][1])
	let newEntry = [personal.name, time, chatMessage.value]
	IO.sendChatMessage([...newEntry])
	chatMessage.value = ""
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

function loadRewind() {
	store.viewSettings.showRewindPanel = false
	store.viewSettings.performingRewind = true
	setTimeout(function () {
		IO.loadRewind()
	}, 300)
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
		<TurnNudge v-if="personal.gameID > 0 && personal.pov >= 0 && !personal.trainingGame && store.gameflow.phase !== rf.PHASE_GAME_OVER" :game-id="personal.gameID" :latest-update="personal.latestUpdate" />
	<!-- BUG REPORT -->
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

	<!-- NOTES -->
	<div id="notesBox" v-if="store.viewSettings.showNotes">
		<h2>Personal game notes</h2>
		<p>Only you can see these notes</p>
		<div><textarea cols="120" rows="10" v-model="personal.notes" maxlength="5000"></textarea></div>
		<div>
			<button class="actionsLineButton" @click="IO.saveNotes">Save</button>
			<button class="actionsLineButton" @click="clearNotes">Clear</button>
			<button class="actionsLineButton" @click="toggleNotes">Close</button>
		</div>
	</div>

	<!-- CHAT -->
	<div id="wholeChat" v-if="store.viewSettings.showChat">
		<div id="chatBox">
			<h2>Send a message</h2>
			<div><textarea rows="6" v-model="chatMessage"></textarea></div>
			<div><button class="actionsLineButton" @click="sendChatMessage">Send</button></div>
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
		Any player can rewind the game at any time.
		<br />
		Please be courteous and rewind only if absolutely necessary - send a chat message to inform the other players.
		<br /><br />
		<span class="errorText">REWINDING WILL REMOVE ALL PRE-SET MOVES<br />PLEASE BE COURTEOUS WHEN REWINDING</span>
		<span class="topMenuItem" @click="loadRewind()">
			<img :src="view.getImage('icon-rewind')" />
			<span>Rewind</span>
		</span>
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
	<div id="info" v-if="store.viewSettings.showInfo">
		<PlayerTable :minimiseInfoForMainScreen="false" />
		<p><b>Game name:</b> {{ store.gameName }}</p>
	</div>
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
#wholeChat {
	position: absolute;
	left: 2px;
	top: 62px;
	width: 450px;
	z-index: 9999;
	border: 2px solid black;
	background-color: #d4eafd;
	overflow-y: scroll;
	padding-bottom: 10px;
	text-align: center;
}
#chatBox textarea { width: 90%; }
.chatentry {
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
	top: 60px;
	left: 440px;
	font-size: 18px;
	z-index: 10000;
	color: white;
}
.topMenuItem { display: inline-block; width: 62px; height: 55px; cursor: pointer; text-align: center; }
.topMenuItem img { width: 38px; height: 38px; }
.topMenuItem span { font-size: 14px; font-weight: bold; display: block; }
</style>
