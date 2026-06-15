<script setup>
//import * as constants from '../constants'
import * as view from "../js/WEBview"
import * as rf from "../js/WEBreference"
import * as IO from "../backend/WEB_IO"
import * as funcs from "../js/WEBfuncs"
import * as model from "../js/WEBmodel"

//import HistoryEntry from './HistoryEntry.vue'

import { ref } from "vue"

import { useModelStore } from "../stores/WEBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/WEBpersonal.js"
const personal = usePersonalStore()

const chatMessage = ref("")
const bugReportText = ref("")
const submittingBug = ref(false)

function getFlexiTimeString(playerName) {
	let KickoutFlexiDataArray = window.initData.KickoutFlexiDataArray
	let secondsIn24Hours = 24 * 60 * 60
	let playerSeconds = 0

	// Iterate over the KickoutFlexiDataArray to find the player's entry
	for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
		let entry = KickoutFlexiDataArray[i]

		// Check if the entry is a length-2 array and the first element matches the playerName
		if (Array.isArray(entry) && entry.length === 2 && entry[0] === playerName) {
			playerSeconds = entry[1]
			break
		}
	}

	let remainingSeconds = secondsIn24Hours - playerSeconds
	let hours = Math.floor(remainingSeconds / 3600)
	let minutes = Math.floor((remainingSeconds % 3600) / 60)

	// Set remaining time to 0 if it is negative
	hours = Math.max(hours, 0)
	minutes = Math.max(minutes, 0)

	// Format the hours and minutes as a string in the format hh:mm
	let formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`

	return formattedTime
}

function toggleBug() {
	store.viewSettings.showNotes = false
	store.viewSettings.showBug = !store.viewSettings.showBug
}

function toggleNotes() {
	store.viewSettings.showBug = false
	store.viewSettings.showNotes = !store.viewSettings.showNotes
}
function parseMessage(message) {
	message = message.replace(/SNLB/g, "\n")
	return message
}

function sendChatMessage() {
	if (chatMessage.value === "") return
	let time = Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp)
	if (store.chatData.length > 0) {
		for (let i = 0; i < store.chatData.length; i++) {
			time -= store.chatData[i][1]
		}
	}
	let newEntry = [personal.name, time, chatMessage.value]
	IO.sendChatMessage([...newEntry])
	chatMessage.value = ""
}

function clearNotes() {
	personal.notes = ""
	IO.saveNotes()
}

function loadRewind() {
	if (store.viewSettings.performingRewind) return
	store.viewSettings.performingRewind = true
	setTimeout(function () {
		store.viewSettings.showRewindPanel = false
		IO.loadRewind()
	}, 500)
}

async function submitBug() {
	submittingBug.value = true
	store.gameMessages.bugErrorText = ""
	store.gameMessages.bugSuccessText = ""

	if (bugReportText.value.length === 0) {
		store.gameMessages.bugErrorText = "Please enter a bug report"
		submittingBug.value = false
		return
	}
	await IO.submitBug(bugReportText.value)
	submittingBug.value = false
}

function getReserveTileIDs() {
	// Start with everything
	let possibleIDs = []
	for (let i = 0; i < rf.ALL_TILES.length; i++) {
		possibleIDs.push(rf.ALL_TILES[i].tileID)
	}

	// Remove placed tiles
	for (let i = 0; i < store.mapTiles.length; i++) {
		possibleIDs = possibleIDs.filter((tileID) => tileID !== store.mapTiles[i].tileID)
	}

	// Remove your tiles
	if (personal.pov >= 0) for (let i = 0; i < store.players[personal.pov].tileIDarrays.length; i++) possibleIDs = possibleIDs.filter((tileID) => tileID !== store.players[personal.pov].tileIDarrays[i][0])

	return possibleIDs
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
	<transition name="slideBug">
		<div id="bugReport" v-if="store.viewSettings.showBug">
			<h1>Bug Report</h1>
			<template v-if="store.gameMessages.bugErrorText !== ''">
				<h2 id="bugErrorText" v-html="store.gameMessages.bugErrorText"></h2>
			</template>
			<template v-if="store.gameMessages.bugSuccessText !== ''">
				<h2 id="bugSuccessText" v-html="store.gameMessages.bugSuccessText"></h2>
			</template>
			<p>
				Please submit a bug report if you encounter any issues, giving as much detail as possbile.
				<br />
				The game data will be submitted along with your report.
				<br />
				You can also report it on the OBG discord. Click
				<a href="https://discord.gg/hCU7Fr77yV" class="linkOther" target="_blank">Here</a>
				to join
			</p>

			<div><textarea cols="150" rows="10" name="bugContent" id="bugContent" v-model="bugReportText"></textarea></div>
			<div>
				<button class="actionsLineButton" id="submitBug" @click="submitBug" :disabled="submittingBug">
					<span v-if="submittingBug">Submitting Bug Report...</span>
					<span v-else>Submit</span>
				</button>
				<button class="actionsLineButton" id="resetBug" @click="toggleBug">Cancel</button>
			</div>
		</div>
	</transition>

	<!-- NOTES -->
	<transition name="slideNotes">
		<div id="notesBox" v-if="store.viewSettings.showNotes">
			<h2>Personal game notes</h2>
			<p>Only you can see these notes</p>
			<div><textarea cols="120" rows="10" id="notes" v-model="personal.notes" maxlength="5000"></textarea></div>
			<div>
				<button class="actionsLineButton" id="submitNotes" @click="IO.saveNotes">Save</button>
				<button class="actionsLineButton" id="clearNotes" @click="clearNotes">Clear</button>
				<button class="actionsLineButton" id="closeNotes" @click="toggleNotes">Close</button>
			</div>
		</div>
	</transition>

	<!-- CHAT -->
	<transition name="fade">
		<div id="wholeChat" v-if="store.viewSettings.showChat">
			<div id="chatBox">
				<h2>Send a message</h2>
				<div><textarea rows="6" name="chatMessage" id="chatMessage" v-model="chatMessage"></textarea></div>
				<div><button class="actionsLineButton" @click="sendChatMessage">Send</button></div>
			</div>
			<div id="messageList">
				<div class="chatentry" v-for="(message, index) in store.chatData" :key="index">
					<div class="header">
						<span class="bold">{{ message[0] }}</span>
						<span class="date">
							{{ funcs.chatTimestampToString(message[1], index) }}
						</span>
					</div>
					<div class="messageBody">{{ parseMessage(message[2]) }}</div>
				</div>
			</div>
		</div>
	</transition>

	<!-- REWIND PANEL -->
	<transition name="fade">
		<div id="rewindPanel" v-if="store.viewSettings.showRewindPanel">
			Any player can rewind the game at any time.
			<br />
			Please be courteous and rewind only if absolutely neessary - send a chat message to inform the other players.
			<br />
			Misuse of this feature will result in rewinds requiring permission from all players.

			<br />
			<br />
			<span v-if="model.revealedHiddenInformationForRewind()" class="rewindCautionSpan">
				Caution: You are rewinding after reveling hidden information
				<br />
				This will be added as a note in the history
				<br />
				<br />
			</span>

			<span class="topMenuItem" @click="loadRewind()">
				<img src="@static/WEB/images/icon-rewind.svg" />
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
	</transition>

	<!-- RESERVE -->
	<transition name="slideRes">
		<div id="reserve" v-if="store.viewSettings.showReserve">
			<!-- DRAW PILE -->
			<h2>Unused Tiles - including opponents' stored tiles and draw piles (where you haven't seen the number of actions)</h2>
			<div id="allReserveTilesDiv">
				<template v-for="(tileID, idx) in getReserveTileIDs()" :key="idx">
					<div class="tileAndActionsNumberDiv">
						<div class="actionsNumberDiv">
							<img :src="view.getImage('actions_' + model.getActionsForTileID(tileID))" />
						</div>
						<div class="singleTileDiv">
							<svg class="singleTileSVG" xmlns="http://www.w3.org/2000/svg" :viewBox="rf.ALL_RECT_TILES.includes(tileID) ? '0 0 50 100' : '0 0 100 100'">
								<polygon class="singleTilePolygon" x="0" y="0" :points="view.getPolygonPointsFromTileID(tileID, 0, 0, 0, 50)" :fill="view.getTilePatternFromID(tileID)" />
							</svg>
						</div>
					</div>
				</template>
			</div>

			<!-- FLEXI-TIMES -->
			<div id="timesDiv">
				Flexi-Times:
				<span v-for="(player, idx) in store.players" :key="idx">{{ player.displayName }}: {{ getFlexiTimeString(player.name) }}&nbsp;&nbsp;&nbsp;</span>
				&nbsp;&nbsp;&nbsp;
			</div>
		</div>
	</transition>
</template>

<style scoped>
#timesDiv {
	margin-top: 20px;
	margin-bottom: 4px;
}

#reserve {
	border: 2px solid black;
	/*margin-top: -4px;*/
	/*margin-left: -10px;*/
	background-color: lightblue;
}

.slideRes-enter-active,
.slideRes-leave-active {
	transition: all 0.2s ease-in-out;
	height: 500px;
	overflow: hidden;
}

.slideRes-enter-from,
.slideRes-leave-to {
	opacity: 0;
	height: 0px;
}

#bugErrorText {
	width: 100%;
	font-weight: bolder;
	font-family: Arial, sans-serif;
	text-align: center;
	background-color: lightgoldenrodyellow;
	color: darkred;
}

#bugSuccessText {
	color: darkgreen;
	background-color: lightblue;
}

.slideNotes-enter-active,
.slideNotes-leave-active {
	transition: all 0.2s ease-in-out;
	height: 264px;
	overflow: hidden;
}

.slideBug-enter-active,
.slideBug-leave-active {
	transition: all 0.2s ease-in-out;
	height: 300px;
	overflow: hidden;
}

.slideBug-enter-from,
.slideBug-leave-to,
.slideNotes-enter-from,
.slideNotes-leave-to {
	opacity: 0;
	height: 0px;
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
	font-family: Arial, sans-serif;
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

#rewindPanel {
	position: absolute;
	background-color: black;
	border: 1px solid white;
	padding: 5px;
	width: 400px;
	top: 60px;
	left: 380px;
	font-size: 18px;
	z-index: 10000;
	color: white;
}

.topMenuItem {
	display: inline-block;
	width: 62px;
	height: 55px;
	border: #eee;
	border-radius: 5px;
	margin-left: 0px;
	cursor: pointer;
	text-align: center;
}

.topMenuItem:hover {
	color: lightblue;
}

.topMenuItem:hover img {
	filter: brightness(0) saturate(100%) invert(100%) sepia(17%) saturate(6440%) hue-rotate(174deg) brightness(98%) contrast(102%);
}

.topMenuItem img {
	width: 38x;
	height: 38px;
}

.topMenuItem span {
	font-size: 14px;
	font-weight: bold;
	display: block;
}

.tileAndActionsNumberDiv {
	display: inline-block;
	position: relative;
	margin-right: 5px;
	border: 1px solid black;
	width: 100px;
	height: 100px;
}

.actionsNumberDiv {
	position: absolute;
	top: 0px;
	left: 0px;
	z-index: 100;
	width: 30px;
	height: 30px;
	border: 1px solid black;
	box-sizing: border-box;
	overflow: hidden;
}

.actionsNumberDiv img {
	width: 100%;
	height: 100%;
}

.singleTileDiv {
	height: 75px;
}

.singleTileSVG {
	width: 100%;
	height: 100%;
}

.singleTilePolygon {
	stroke: black;
	stroke-width: 1px;
}

.rewindCautionSpan {
	background-color: lightgoldenrodyellow;
	color: darkred;
}
</style>
