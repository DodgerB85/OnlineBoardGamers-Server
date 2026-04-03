<script setup>
import * as rf from "../js/BUSreference.js"
import * as funcs from "../js/BUSfuncs.js"
import * as IO from "../backend/BUS_IO"
import * as view from "../js/BUSview.js"

import HistoryEntry from "./HistoryEntry.vue"

import { ref } from "vue"

import { useModelStore } from "../stores/BUSstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/BUSpersonal.js"
const personal = usePersonalStore()

const chatMessage = ref("")

function toggleBug() {
	store.topMenuViews.showNotes = false
	store.topMenuViews.showBug = !store.topMenuViews.showBug
}

async function submitBug() {
	let bugContent = document.getElementById("bugContent").value
	if (bugContent.length === 0) {
		alert("Please enter a bug report")
		return
	}

	store.topMenuViews.showLoader = true
	var csrftoken = funcs.getCookie("csrftoken")

	try {
		const response = await fetch("/BUS/bugEntry/", {
			method: "POST",
			body: JSON.stringify({
				gameID: personal.gameID,
				action: "bugentry",
				description: bugContent,
				gameData: funcs.exportBUSmodel(false),
			}),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			throw new Error("Network response was not ok")
		}
		const data = await response.json()
		if (data.bugEntrySuccess) alert("Your bug report has been submitted")
		else alert("Sorry, there was a problem. Please email the webmaster directly")
	} catch (error) {
		console.error("Error fetching data:", error)
	}

	store.topMenuViews.showLoader = false
	store.topMenuViews.showBug = false
}

function toggleNotes() {
	store.topMenuViews.showBug = false
	store.topMenuViews.showNotes = !store.topMenuViews.showNotes
}
function parseMessage(message) {
	message = message.replace(/SNLB/g, "\n")
	return message
}

function historyToggle() {
	setTimeout(function () {
		if (document.getElementById("historyMainDiv").classList.contains("reverseHistory")) document.getElementById("historyMainDiv").classList.remove("reverseHistory")
		else document.getElementById("historyMainDiv").classList.add("reverseHistory")

		//document.getElementById('boardContainer').classList.add('historyShowing');
		var b = document.getElementById("footer").getBoundingClientRect().top
		var a = 69
		document.getElementById("history").style["max-height"] = String(parseInt(b - a)) + "px"
	}, 400)
}

function sendChatMessage() {
	if (chatMessage.value === "") return
	let newEntry = [personal.name, Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp), chatMessage.value]
	IO.sendChatMessage([...newEntry])
	chatMessage.value = ""
}
function clearNotes() {
	personal.notes = ""
	IO.saveNotes()
}

function loadRewind() {
	if (store.performingRewind) return
	store.performingRewind = true
	setTimeout(function () {
		store.topMenuViews.showRewindPanel = false
		IO.loadRewind()
	}, 500)
}

function getRewindPanelLeft() {
	return document.getElementById("menuButtonRewindPos").getBoundingClientRect().left + document.getElementById("menuButtonRewindPos").getBoundingClientRect().width / 2 - 200
}

function getStatsExcludeVotes(returnPlayers = false) {
	let votes = 0
	let players = "None"

	for (const player in store.statsExcludeVotesData) {
		// Use const or let for player
		if (store.statsExcludeVotesData[player] === true) {
			votes += 1
			if (players === "None") players = String(player)
			else players += ", " + player
		}
	}
	if (returnPlayers) return players
	return votes
}

function getDeleteVotes(returnPlayers = false) {
	let votes = 0
	let players = "None"

	for (const player in store.deleteVotesData) {
		// Use const or let for player
		if (store.deleteVotesData[player] === true) {
			votes += 1
			if (players === "None") players = String(player)
			else players += ", " + player
		}
	}
	if (returnPlayers) return players
	return votes
}

function localCastVote(topic) {
	IO.castVote(topic)
}

</script>

<template>
	<!-- BUG REPORT -->
	<div id="bugReport" v-if="store.topMenuViews.showBug">
		<h2>Bug Report</h2>
		<p>
			Please submit a bug report if you encounter any issues, giving as much detail as possbile.
			<br />
			The game data will be submitted along with your report.
			<br />
			You can also report it on the OBG discord. Click
			<a href="https://discord.gg/hCU7Fr77yV" class="linkOther" target="_blank">Here</a>
			to join
		</p>

		<div><textarea cols="150" rows="10" name="bugContent" id="bugContent"></textarea></div>
		<div>
			<button class="actionsLineButton" id="submitBug" @click="submitBug()">Submit</button>
			&nbsp;&nbsp;&nbsp;&nbsp;
			<button class="actionsLineButton" id="resetBug" @click="toggleBug()">Cancel</button>
		</div>
	</div>

	<!-- NOTES -->
	<div id="notesBox" v-if="store.topMenuViews.showNotes">
		<h2>Personal game notes</h2>
		<p>Only you can see these notes</p>
		<div><textarea cols="120" rows="10" id="notes" v-model="personal.notes"></textarea></div>
		<div>
			<button class="actionsLineButton" id="submitNotes" @click="IO.saveNotes()">Submit</button>
			<button class="actionsLineButton" id="clearNotes" @click="clearNotes()">Clear</button>
			<button class="actionsLineButton" id="closeNotes" @click="toggleNotes">Close</button>
		</div>
	</div>

	<!-- CHAT -->
	<transition name="fade">
		<div id="wholeChat" v-if="store.topMenuViews.showChat">
			<div id="chatBox">
				<h2>Send a message</h2>
				<div><textarea rows="6" name="chatMessage" id="chatMessage" v-model="chatMessage"></textarea></div>
				<div><button class="actionsLineButton" @click="sendChatMessage()">Send</button></div>
			</div>
			<div id="messageList">
				<div class="chatentry" v-for="(message, index) in store.chatData" v-bind:key="index">
					<div class="header">
						<span class="bold">{{ message[0] }}</span>
						<span class="date">
							{{ funcs.timestampToString((personal.gameCreationTimestamp + message[1]) * 1000) }}
						</span>
					</div>
					<div class="messageBody">{{ parseMessage(message[2]) }}</div>
				</div>
			</div>
		</div>
	</transition>

	<!-- REWIND PANEL -->
	<transition name="fade">
		<div id="rewindPanel" v-if="store.topMenuViews.showRewindPanel" :style="{
			left: getRewindPanelLeft() + 'px',
		}">
			Any player can rewind the game at any time.
			<br />
			Please be courteous and rewind only if absolutely neessary - send a chat message to inform the other
			players.
			<br />
			Misuse of this feature will result in rewinds requiting permission from all players.

			<br />
			<br />

			<span class="topMenuItem" @click="loadRewind()">
				<img :src="view.getImage('icon-rewind')" />
				<span>Rewind</span>
			</span>
			<hr />
			<div
				v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov != undefined && personal.pov >= 0">
				If all players agree, this game can be excluded from the stats (won't count towards wins/losses)
				<br />
				Votes: {{ getStatsExcludeVotes(false) }} - Players: {{ getStatsExcludeVotes(true) }}
				<br />
				<button v-if="!personal.votedToExclude" class="actionsLineButton"
					@click="localCastVote(rf.STATS_EXCLUDE_VOTE_TOPIC)">Vote to
					Exclude
					Game from Stats</button>
			</div>
			<div
				v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
				If all players agree, this game will be deleted
				<br />
				Votes: {{ getDeleteVotes(false) }} - Players: {{ getDeleteVotes(true) }}
				<br />
				<button v-if="!personal.votedToDelete" class="actionsLineButton"
					@click="localCastVote(rf.DELETE_VOTE_TOPIC)">Vote
					to
					Delete
					Game</button>
			</div>
		</div>
	</transition>

	<!-- HISTORY -->
	<transition name="fade">
		<div id="history" v-if="store.topMenuViews.showHistory">
			<div id="historyToggleDiv">
				<label class="textLabel">Oldest First</label>
				<label class="switch">
					<input type="checkbox" checked @click="historyToggle()" />

					<span class="slider round"></span>
				</label>
				<label class="textLabel">Newest First</label>
				<br />
				<span v-if="store.topMenuViews.showReplay">Click entry to jump to that point in the replay</span>
				<span v-else>Click Lines / Buildings / VRROOOMM to highlight board</span>
				<!--<br /><button @click="toggleReplayMode()"><span v-if="store.topMenuViews.showReplay">Exit</span><span
            v-else>Enter</span> Replay Mode</button>-->
			</div>
			<div id="historyMainDiv" class="reverseHistory">
				<template v-for="(entry, index1) in store.history" v-bind:key="index1">
					<HistoryEntry :entry="entry" :entry_-i-d="index1" />
				</template>
			</div>
			<div id="historyButtonDiv"></div>
		</div>
	</transition>
</template>

<style scoped>
.reverseHistory {
	display: flex;
	flex-direction: column-reverse;
}

#bugReport,
#notesBox {
	/*display: none;*/
	text-align: center;
	margin-bottom: 10px;
}

#wholeChat {
	/*display: none;*/
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

#chatBox {
	text-align: center;
}

#chatBox textarea {
	width: 90%;
}

.chatentry {
	margin: 5px;
	border: #000 1px solid;
	text-align: left;
	padding: 5px;
	background-size: 40px 40px;
	background-repeat: no-repeat;
	background-position: right top;
	background-color: #d4eafd;
}

.chatentry .header {
	margin-bottom: 7px;
	border-bottom: #000 1px solid;
}

.chatentry .header .date {
	font-size: 0.7em;
	font-style: italic;
	float: right;
}

.chatentry .header .bold {
	font-weight: bold;
}

.chatentry .messageBody {
	overflow: auto;
	white-space: pre-wrap;
}

.chatentry .header {
	margin-bottom: 7px;
	border-bottom: #000 1px solid;
}

.chatentry .header .date {
	font-size: 0.7em;
	font-style: italic;
	float: right;
}

.chatentry .header .bold {
	font-weight: bold;
}

.chatentry .body {
	overflow: auto;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

#history {
	position: absolute;
	padding-top: 5px;
	left: 2px;
	top: 62px;
	width: 450px;
	z-index: 9999;
	border: 2px solid black;
	background-color: #d4eafd;
	/*overflow-y: scroll;
	direction: rtl;*/
	overflow-y: scroll;
	text-align: center;
}

/* The switch - the box around the slider */
#historyToggleDiv .switch {
	position: relative;
	display: inline-block;
	width: 60px;
	height: 34px;
	margin-left: 10px;
	margin-right: 10px;
	vertical-align: middle;
}

/* Hide default HTML checkbox */
#historyToggleDiv .switch input {
	opacity: 0;
	width: 0;
	height: 0;
}

/* The slider */
#historyToggleDiv .slider {
	position: absolute;
	cursor: pointer;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: #2196f3;
	-webkit-transition: 0.4s;
	transition: 0.4s;
}

#historyToggleDiv .slider:before {
	position: absolute;
	content: "";
	height: 26px;
	width: 26px;
	left: 4px;
	bottom: 4px;
	background-color: white;
	-webkit-transition: 0.4s;
	transition: 0.4s;
}

#historyToggleDiv input:checked+.slider {
	background-color: #2196f3;
}

#historyToggleDiv input:focus+.slider {
	box-shadow: 0 0 1px #2196f3;
}

#historyToggleDiv input:checked+.slider:before {
	-webkit-transform: translateX(26px);
	-ms-transform: translateX(26px);
	transform: translateX(26px);
}

/* Rounded sliders */
#historyToggleDiv .slider.round {
	border-radius: 34px;
}

#historyToggleDiv .slider.round:before {
	border-radius: 50%;
}

#rewindPanel {
	position: absolute;
	background-color: black;
	border: 1px solid white;
	padding: 5px;
	width: 400px;
	top: 60px;
	font-size: 18px;
	z-index: 10000;
	color: white;
	text-align: center;
}

.topMenuItem {
	display: inline-block;
	width: 62px;
	height: 55px;
	border: #eee;
	border-radius: 5px;
	cursor: pointer;
	text-align: center;
}

.topMenuItem:hover {
	color: lightblue;
}

.topMenuItem:hover img {
	filter: brightness(0) saturate(100%) invert(100%) sepia(17%) saturate(6440%) hue-rotate(174deg) brightness(98%) contrast(102%);
	/*filter:  brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(7500%) hue-rotate(299deg) brightness(99%) contrast(104%);
    */
}

.topMenuItem img {
	/*filter: brightness(0) saturate(100%) invert(100%) sepia(17%) saturate(6440%) hue-rotate(174deg) brightness(98%) contrast(102%);
*/
	width: 38x;
	height: 38px;
}

.topMenuItem span {
	font-size: 14px;
	font-weight: bold;
	display: block;
}

.topMenuItem.highlighted {
	color: #ff9900;
}
</style>
