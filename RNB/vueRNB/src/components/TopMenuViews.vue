<script setup>
//import * as constants from '../constants'
import * as view from "../js/RNBview"
import * as rf from "../js/RNBreference"
import * as IO from "../backend/RNB_IO"
import * as funcs from "../js/RNBfuncs"
import * as wonder from "../js/RNBwonder"
import * as controller from "../js/RNBcontroller"
import * as model from "../js/RNBmodel"
import * as loc from "../js/RNBlocation"
//import HistoryEntry from './HistoryEntry.vue'

import { ref, computed } from "vue"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/RNBpersonal.js"
import PlayerTable from "./PlayerTable.vue"
import MiniHex from "./Utils/MiniHex.vue"
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
	//message = message.replace(/SNLB/g, "\n")
	return message
}

function sendChatMessage() {
	if (chatMessage.value === "") return
	// You will always have chat data, as the welcome message will be in there.
	// New entries are added at the start, and store.chatData has the full TS
	// Therefore, just subtract the time at entry 0 to get the new delta
	let time = Math.round(new Date().getTime() / 1000 - store.chatData[0][1])
	//if (store.chatData.length > 0)
	/*	// NB the final entry will be the welcome message with 
		for (let i = 0; i < store.chatData.length-1; i++) {
			time -= store.chatData[i][1]
		}
	}*/
	let newEntry = [personal.name, time, chatMessage.value]
	IO.sendChatMessage([...newEntry])
	chatMessage.value = ""
}
function clearNotes() {
	personal.notes = ""
	IO.saveNotes()
}

function loadRewind() {
	store.performingRewind = true
	setTimeout(function () {
		store.viewSettings.showRewindPanel = false
		IO.loadRewind()
	}, 500)
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

const pointstAvaialableForPickup = computed(() => {
	const playerIndex = personal.trainingGame ? controller.currentPlayerIndex() : personal.pov
	let result = []
	const allTransporters = model.getTransportersByPlayerIndex(playerIndex)
	for (const transObj of allTransporters) {
		const reachableResources = loc.getAllResourcesAccessibleToTransporter(transObj.id, true)
		result.push(...reachableResources.map((r) => r.id))
	}
	// uniq the IDs
	result = [...new Set(result)]
	result = result.filter((id) => rf.ALL_POINT_SCORING_RES.includes(model.getResByID(id).type) && loc.isBucketLocation(model.getResByID(id).location))
	result = result.map((id) => [model.getResByID(id).location[1], model.getResByID(id).gfx])
	return result
})

const heldResourcesBreakdown = computed(() => {
	const playerIndex = personal.trainingGame ? controller.currentPlayerIndex() : personal.pov

	// 1. Get player's transporters
	const myTransporters = model.getTransportersByPlayerIndex(playerIndex)
	const allResources = model.getAllInGameResources()

	// 2. Map and group resources by transporter
	return myTransporters
		.map((t) => {
			// Filter resources that are specifically on THIS transporter
			const heldResources = allResources.filter((r) => [rf.RES_GOLD, rf.RES_COINS, rf.RES_STOCK].includes(r.type) && loc.isOnSelectedTransporterIDs(r.location, [t.id]))

			// Calculate score for this specific unit
			let tScore = 0
			heldResources.forEach((r) => {
				if (r.type === rf.RES_GOLD) tScore += 10
				else if (r.type === rf.RES_COINS) tScore += 40
				else if (r.type === rf.RES_STOCK) tScore += 120
			})

			return {
				id: t.id, // For :key
				hexID: t.location[1],
				transporterGfx: `transporter_${String(t.type)}_${personal.getCorrectedColour(store.players[playerIndex].colour)}`,
				resourceGfxs: heldResources.map((r) => r.gfx),
				score: tScore,
			}
		})
		.filter((entry) => entry.score > 0) // Only show if carrying items
})

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
				<h2 class="errorText" id="bugErrorText" v-html="store.gameMessages.bugErrorText"></h2>
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
			<div>
				<b><u>Remember:</u></b>
				<ul>
					<li>You cannot build buildings on a desert hex</li>
					<li>Transporters are PRODUCED during the PRODUCTION phase (ie not during build)</li>
				</ul>
			</div>

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
				<button id="submitNotes" class="actionsLineButton" @click="IO.saveNotes">Save</button>
				<button id="clearNotes" class="actionsLineButton" @click="clearNotes">Clear</button>
				<button id="closeNotes" class="actionsLineButton" @click="toggleNotes">Close</button>
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
							{{ funcs.timestampToString(message[1]) }}
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
			<span class="errorText">
				REWINDING WILL REMOVE ALL PRE-SET MOVES
				<br />
				PLEASE BE COURTEOUS WHEN REWINDING
			</span>
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
	</transition>

	<!-- Info -->
	<transition name="slideRes">
		<div id="info" v-if="store.viewSettings.showInfo">
			<PlayerTable :minimiseInfoForMainScreen="false" />
			<!-- YOUR points -->
			<div v-if="heldResourcesBreakdown.length > 0">
				<p>
					<b>You are carrying {{ wonder.getHeldResourcesScore(personal.trainingGame ? controller.currentPlayerIndex() : personal.pov) }} wealth points</b>
					<template v-for="(entry, idx) in heldResourcesBreakdown" :key="idx">
						<MiniHex :hexID="entry.hexID" :transporterGfx="entry.transporterGfx" class="miniHex" />
						<div v-for="(resGfx, idx2) in entry.resourceGfxs" :key="idx2" class="resGfxDiv">
							<img :src="view.getImage(resGfx)" class="resGfxImg" />
						</div>
					</template>
				</p>
			</div>
			<div v-else>
				<p><b>You are not carrying any wealth points</b></p>
			</div>

			<!-- UNPICKED UP POINTS-->
			<div v-if="pointstAvaialableForPickup.length > 0">
				Points available for pickup:
				<template v-for="(pickupEntry, idx) in pointstAvaialableForPickup" :key="idx">
					<MiniHex :hexID="pickupEntry[0]" :resGfx="pickupEntry[1]" class="miniHex" />
				</template>
			</div>
			<div v-else>
				<p><b>There are no points available to pickup</b></p>
			</div>

			<h2>Map: {{ personal.mapName }}</h2>
			<h3 class="mapDescriptionH">{{ personal.mapDescription }}</h3>
			<template v-if="personal.soloGame">
				<br />
				<a class="viewHighScoresBtn" :href="'/RNB/highscores/map/' + store.mapData.setupData.UK + '/'" target="_blank">View Highscores for this Map</a>
			</template>

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
.singleHexDiv {
	position: relative;
	display: inline-block;
	margin: 0px;
	font-size: 0;
	/* Set font size to 0 to remove any additional vertical space */
	line-height: 1;
	/* Set line-height to 1 to prevent extra spacing */
}

.singleHexDiv text {
	font-size: 500px;
	/* Set the desired font size for the text */
}

.singleHexSVG {
	width: 100px;
	margin: 0px;
}

.singleHexSVG polygon {
	stroke: black;
	stroke-width: 30px;
}

#timesDiv {
	margin-top: 20px;
	margin-bottom: 4px;
}

#info {
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

.errorText {
	width: 100%;
	font-weight: bolder;
	font-family: Arial, sans-serif;
	text-align: center;
	background-color: lightgoldenrodyellow;
	color: darkred;
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
	border: 2px solid black;
	/*margin-top: -4px;*/
	/*margin-left: -10px;*/
	background-color: lightblue;
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
	left: 440px;
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

.topMenuItem.highlighted {
	color: #ff9900;
}

.rewindCautionSpan {
	background-color: lightgoldenrodyellow;
	color: darkred;
	font-weight: bolder;
}

.miniHex {
	vertical-align: middle;
}

.resGfxDiv {
	width: 50px;
	height: 50px;
	display: inline-block;
	vertical-align: middle;
}

.resGfxImg {
	width: 100%;
	height: 100%;
}

.mapDescriptionH {
	white-space: pre-line;
	max-width: 800px;
	margin: auto;
}

.viewHighScoresBtn {
	background-color: #04aa6d;
	color: white;
	padding: 16px 0px;
	margin: 8px 0;
	border: none;
	cursor: pointer;
	width: 400px;
	opacity: 0.9;
	font-size: 20px;
	text-decoration: none;
	display: inline-block;
	text-align: center;
}

.viewHighScoresBtn:hover {
	opacity: 1;
}
</style>
