<script setup>
//import * as constants from '../constants'
import * as view from "../js/WEBview"
import * as rf from "../js/WEBreference"
import * as IO from "../backend/WEB_IO"
import * as funcs from "../js/WEBfuncs"
import * as model from "../js/WEBmodel"

//import HistoryEntry from './HistoryEntry.vue'

import { ref } from "vue"
import { useI18n } from "vue-i18n"

import { useModelStore } from "../stores/WEBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/WEBpersonal.js"
const personal = usePersonalStore()

const { t } = useI18n()

const chatMessage = ref("")
const sendingChat = ref(false)
const chatErrorText = ref("")
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

function playerIndexByName(name) {
	return store.players.findIndex((player) => player.name === name || player.displayName === name)
}

function playerNameClass(name) {
	const index = playerIndexByName(name)
	return index < 0 ? "bold" : "mainEntryPlayer mainEntryPlayer" + personal.getCorrectedColour(store.players[index].colour)
}

function playerMarkerStyle(name) {
	const index = playerIndexByName(name)
	return index < 0 ? {} : { backgroundColor: personal.getCorrectedColourHex(store.players[index].colour) }
}

async function sendChatMessage() {
	const message = chatMessage.value.trim()
	if (message === "" || sendingChat.value) return
	sendingChat.value = true
	chatErrorText.value = ""
	let time = Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp)
	if (store.chatData.length > 0) {
		for (let i = 0; i < store.chatData.length; i++) {
			time -= store.chatData[i][1]
		}
	}
	let newEntry = [personal.name, time, message]
	try {
		if (await IO.sendChatMessage([...newEntry])) {
			if (chatMessage.value.trim() === message) chatMessage.value = ""
		} else {
			chatErrorText.value = t("io.chatError")
		}
	} catch (error) {
		console.error("Error sending chat:", error)
		chatErrorText.value = t("io.chatError")
	} finally {
		sendingChat.value = false
	}
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
	store.gameMessages.successText = ""
	store.gameMessages.errorText = ""

	if (bugReportText.value.length === 0) {
		store.gameMessages.errorText = t("topMenuViews.bugEnterReport")
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
	let players = ""

	for (const player in store.statsExcludeVotesData) {
		// Use const or let for player
		if (store.statsExcludeVotesData[player] === true) {
			votes += 1
			if (players === "") players = String(player)
			else players += ", " + player
		}
	}
	if (returnPlayers) return players
	return votes
}

function getDeleteVotes(returnPlayers = false) {
	let votes = 0
	let players = ""

	for (const player in store.deleteVotesData) {
		// Use const or let for player
		if (store.deleteVotesData[player] === true) {
			votes += 1
			if (players === "") players = String(player)
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
			<h1>{{ $t("topMenuViews.bugReport") }}</h1>
			<p>
				{{ $t("topMenuViews.bugIntro") }}
				<br />
				{{ $t("topMenuViews.bugData") }}
				<br />
				<i18n-t keypath="topMenuViews.bugDiscord" tag="span" scope="global">
					<template #here><a href="https://discord.gg/hCU7Fr77yV" class="linkOther" target="_blank">{{ $t("topMenuViews.here") }}</a></template>
				</i18n-t>
			</p>

			<div><textarea cols="150" rows="10" name="bugContent" id="bugContent" v-model="bugReportText"></textarea></div>
			<div>
				<button class="actionsLineButton" id="submitBug" @click="submitBug" :disabled="submittingBug">
					<span v-if="submittingBug">{{ $t("topMenuViews.submittingBug") }}</span>
					<span v-else>{{ $t("topMenuViews.submit") }}</span>
				</button>
				<button class="actionsLineButton" id="resetBug" @click="toggleBug">{{ $t("topMenuViews.cancel") }}</button>
			</div>
		</div>
	</transition>

	<!-- NOTES -->
	<transition name="slideNotes">
		<div id="notesBox" v-if="store.viewSettings.showNotes">
			<h2>{{ $t("topMenuViews.notesTitle") }}</h2>
			<p>{{ $t("topMenuViews.notesPrivate") }}</p>
			<div><textarea cols="120" rows="10" id="notes" v-model="personal.notes" maxlength="5000"></textarea></div>
			<div>
				<button class="actionsLineButton" id="submitNotes" @click="IO.saveNotes">{{ $t("topMenuViews.save") }}</button>
				<button class="actionsLineButton" id="clearNotes" @click="clearNotes">{{ $t("topMenuViews.clear") }}</button>
				<button class="actionsLineButton" id="closeNotes" @click="toggleNotes">{{ $t("topMenuViews.close") }}</button>
			</div>
		</div>
	</transition>

	<!-- CHAT -->
	<transition name="fade">
		<div id="wholeChat" v-if="store.viewSettings.showChat">
			<div class="chatUser">{{ personal.name }}</div>
			<div id="chatBox">
				<h2>{{ $t("topMenuViews.chatTitle") }}</h2>
				<p v-if="chatErrorText" class="chatErrorText" role="alert">{{ chatErrorText }}</p>
				<div><textarea rows="6" name="chatMessage" id="chatMessage" v-model="chatMessage"></textarea></div>
				<div><button class="actionsLineButton" :disabled="sendingChat || !chatMessage.trim()" @click="sendChatMessage">{{ sendingChat ? $t("nudge.sending") : $t("topMenuViews.send") }}</button></div>
			</div>
			<div id="messageList">
				<div class="chatentry" v-for="(message, index) in store.chatData" :key="index">
					<div class="header">
						<span :class="playerNameClass(message[0])">{{ message[0] }}</span>
						<span v-if="playerIndexByName(message[0]) >= 0" class="chatMarker chatMarkerSwatch" :style="playerMarkerStyle(message[0])"></span>
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
			{{ $t("topMenuViews.rewindIntro") }}
			<br />
			{{ $t("topMenuViews.rewindCourtesy") }}
			<br />
			{{ $t("topMenuViews.rewindMisuse") }}

			<br />
			<br />
			<span v-if="model.revealedHiddenInformationForRewind()" class="rewindCautionSpan">
				{{ $t("topMenuViews.rewindCaution") }}
				<br />
				{{ $t("topMenuViews.rewindCautionHistory") }}
				<br />
				<br />
			</span>

			<span class="topMenuItem" @click="loadRewind()">
				<img src="@static/WEB/images/icon-rewind.svg" />
				<span>{{ $t("topMenuViews.rewindButton") }}</span>
			</span>
			<hr />
			<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
				{{ $t("topMenuViews.statsExcludeIntro") }}
				<br />
				{{ $t("topMenuViews.votesPlayers", { votes: getStatsExcludeVotes(false), players: getStatsExcludeVotes(true) || $t("common.none") }) }}
				<br />
				<button v-if="!personal.votedToExclude" class="actionsLineButton" @click="localCastVote(rf.STATS_EXCLUDE_VOTE_TOPIC)">{{ $t("topMenuViews.voteExclude") }}</button>
			</div>
			<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
				{{ $t("topMenuViews.deleteIntro") }}
				<br />
				{{ $t("topMenuViews.votesPlayers", { votes: getDeleteVotes(false), players: getDeleteVotes(true) || $t("common.none") }) }}
				<br />
				<button v-if="!personal.votedToDelete" class="actionsLineButton" @click="localCastVote(rf.DELETE_VOTE_TOPIC)">{{ $t("topMenuViews.voteDelete") }}</button>
			</div>
		</div>
	</transition>

	<!-- RESERVE -->
	<transition name="slideRes">
		<div id="reserve" v-if="store.viewSettings.showReserve">
			<!-- DRAW PILE -->
			<h2>{{ $t("topMenuViews.reserveTitle") }}<br />{{ $t("topMenuViews.reserveSubtitle") }}</h2>
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
				{{ $t("topMenuViews.flexiTimes") }}
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

.chatErrorText {
	color: darkred;
	font-weight: bold;
	margin: 4px;
}

.chatUser {
	position: absolute;
	top: 2px;
	left: 5px;
	font-size: 13px;
	font-weight: bold;
	opacity: 0.75;
}

.chatMarker {
	display: inline-block;
	width: 18px;
	height: 18px;
	object-fit: contain;
	vertical-align: middle;
	margin-left: 4px;
}

.chatMarkerSwatch {
	width: 13px;
	height: 13px;
	border: 1px solid #333;
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
	display: flex;
	align-items: center;
}

.chatentry .header .mainEntryPlayer {
	margin: 0;
	padding: 1px 4px;
	line-height: 1.2;
}

.chatentry .header .bold {
	line-height: 1.2;
}

.chatentry .header .date {
	margin-left: auto;
	float: none;
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
