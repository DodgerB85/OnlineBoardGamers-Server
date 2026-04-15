<script setup>
/** Tabs and items that come off the TopMenu
 *  EG bug report, notes, chat, reserve
 *
 *
 *
 */

//import * as constants from '../constants'
import * as IO from "../backend/AQY_IO"
import * as funcs from "../js/AQYfuncs"
import * as view from "../js/AQYview"
import * as rf from "../js/AQYreference"
import * as city from "../js/AQYcity"
import * as country from "../js/AQYcountry"
import * as map from "../js/AQYmap"

//import HistoryEntry from './HistoryEntry.vue'
import * as model from "../js//AQYmodel.js"

import { ref } from "vue"

import { useModelStore } from "../stores/AQYstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/AQYpersonal.js"
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
	store.topMenuViews.showNotes = false
	store.topMenuViews.showBug = !store.topMenuViews.showBug
}

function toggleNotes() {
	store.topMenuViews.showBug = false
	store.topMenuViews.showNotes = !store.topMenuViews.showNotes
	store.topMenuViews.showNoteHexIDs = false
}
function parseMessage(message) {
	message = message.replace(/SNLB/g, "\n")
	return message
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
	if (store.topMenuViews.performingRewind) return
	store.performingRewind = true
	setTimeout(function () {
		store.topMenuViews.showRewindPanel = false
		IO.loadRewind()
	}, 500)
}

function submitBug() {
	submittingBug.value = true
	store.topMenuViews.bugErrorText = ""
	store.topMenuViews.bugSuccessText = ""

	if (bugReportText.value.length === 0) {
		store.topMenuViews.bugErrorText = "Please enter a bug report"
		submittingBug.value = false
		return
	}
	IO.submitBug(bugReportText.value)
	submittingBug.value = false
}

function getBuildingBackgroundColor(building) {
	if (building === 2) return "green"
	else if (building === 1) return "orange"
	else return "salmon"
}

function toggleNoteHexIDs() {
	if (store.topMenuViews.showNoteHexIDs) store.topMenuViews.showNoteHexIDs = false
	else {
		// Sort the small hexes
		/*store.mapData.hexes.sort((a, b) => {
			// Compare the 'r' values first
			if (a.hex.r !== b.hex.r) {
				return a.hex.r - b.hex.r
			} else {
				// If 'r' values are the same, compare the 'q' values
				return a.hex.q - b.hex.q
			}
		})*/
		let excludeIDs = country.getAllCityHexId().flat()
		for (let i = 0; i < store.players.length; i++) {
			const inns = store.players[i].countrysideBuildings.filter((cb) => cb.type === rf.COUNTRYSIDE_BLDG_INN)
			inns.forEach((inn) => excludeIDs.push(inn.hexId))
		}
		if (!store.mapData.hexes[0].noteID) {
			let hexesCopy = JSON.parse(JSON.stringify(store.mapData.hexes))

			hexesCopy.sort((a, b) => {
				// Compare s values first (higher s values come first)
				if (a.hex.s !== b.hex.s) {
					return b.hex.s - a.hex.s
				} else {
					// If s values are the same, compare q values (lower q values come first)
					return a.hex.q - b.hex.q
				}
			})

			// add a noteID to each hex
			for (let i = 0; i < hexesCopy.length; i++) {
				let hexData = map.getHexDataFromID(hexesCopy[i].id)
				if (!excludeIDs.includes(hexData.id)) hexData.noteID = i + 1
				else hexData.noteID = -1
				//store.mapData.hexes[i].noteID = i + 1
			}
		}
		store.topMenuViews.showNoteHexIDs = true
	}
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
	<transition name="slideBug">
		<div id="bugReport" v-if="store.topMenuViews.showBug">
			<h1>Bug Report</h1>
			<template v-if="store.topMenuViews.bugErrorText !== ''">
				<h2 id="bugErrorText" v-html="store.topMenuViews.bugErrorText"></h2>
			</template>
			<template v-if="store.topMenuViews.bugSuccessText !== ''">
				<h2 id="bugSuccessText" v-html="store.topMenuViews.bugSuccessText"></h2>
			</template>
			<p>
				Please submit a bug report if you encounter any issues, giving as much detail as possbile.
				<br />
				The game data will be submitted along with your report.
				<br />
				You can also report it on the OBG discord. Click
				<a href="https://discord.gg/hCU7Fr77yV" class="linkOther" target="_blank">Here</a>
				to join
				<br />
				<br />
				<b>NOTE:</b>
				If your cathedral has graves on it, you lose your Saint Power
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
		<div id="notesBox" v-if="store.topMenuViews.showNotes">
			<h2>Personal game notes</h2>
			<p>Only you can see these notes</p>
			<div><textarea cols="120" rows="10" id="notes" v-model="personal.notes"></textarea></div>
			<div>
				<button class="actionsLineButton" @click="toggleNoteHexIDs">
					<template v-if="store.topMenuViews.showNoteHexIDs">Hide</template>
					<template v-else>Show</template>
					hex IDs
				</button>
				<br />
				<button class="actionsLineButton" @click="IO.saveNotes">Submit</button>
				<button class="actionsLineButton" @click="clearNotes">Clear</button>
				<button class="actionsLineButton" @click="toggleNotes">Close</button>
			</div>
		</div>
	</transition>

	<!-- CHAT -->
	<transition name="fade">
		<div id="wholeChat" v-if="store.topMenuViews.showChat">
			<div id="chatBox">
				<h2>Send a message</h2>
				<div><textarea rows="6" name="chatMessage" id="chatMessage" v-model="chatMessage"></textarea></div>
				<div><button class="actionsLineButton" @click="sendChatMessage()">Send</button></div>
			</div>
			<div id="messageList">
				<div class="chatentry" v-for="(message, index) in store.chatData" :key="index">
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
		<div
			id="rewindPanel"
			v-if="store.topMenuViews.showRewindPanel"
			:style="{
				left: getRewindPanelLeft() + 'px',
			}">
			Any player can rewind the game at any time.
			<br />
			Please be courteous and rewind only if absolutely necessary - send a chat message to inform the other players.
			<br />
			Misuse of this feature will result in rewinds requiring permission from all players.

			<br />
			<br />

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

	<!-- RESERVE -->
	<transition name="slideRes">
		<div id="reserve" v-if="store.topMenuViews.showReserve">
			<h2>Saints</h2>

			<div v-for="(saintNum, idx) in [rf.SAINT_GIORGIO, rf.SAINT_BARBARA, rf.SAINT_CHRISTOFORI, rf.SAINT_NICOLO, rf.SAINT_MARIA]" :key="idx" class="saintContainerContainer">
				<div class="saintContainer">
					<div class="saintImage">
						<img :src="view.getImage('saint_' + String(saintNum))" />
					</div>
					<div class="saintText">
						<strong>{{ rf.SAINT_INFO[saintNum].name }}</strong>
						<br />
						<strong>Bonus:</strong>
						{{ rf.SAINT_INFO[saintNum].bonus }}
						<br />
						<strong>VR:</strong>
						{{ rf.SAINT_INFO[saintNum].VR }}
					</div>
				</div>
			</div>

			<!-- Win at 20 People -->
			<h2>San Nicolo</h2>

			<table class="resultSummaryTable">
				<thead>
					<tr>
						<th></th>
						<th>Houses Built</th>
					</tr>
				</thead>
				<tr v-for="(player, playerIndex) in store.players" :key="playerIndex">
					<td :class="{ winCondMet: model.status_nicolo_20houses(playerIndex) }">{{ player.displayName }}</td>
					<td
						:style="{
							color: model.data_nicolo_20houses(playerIndex) == 0 ? 'green' : 'red',
						}">
						{{ 20 - model.data_nicolo_20houses(playerIndex) }} / 20
					</td>
				</tr>
			</table>
			<!-- Build Each City Building-->
			<h2>Santa Barbara</h2>
			<div class="barbaraInfoDiv barbaraInfoDivGreen">Built</div>
			<div class="barbaraInfoDiv barbaraInfoDivOrange">Built But Graved</div>
			<div class="barbaraInfoDiv barbaraInfoDivRed">Not Built</div>
			<table class="resultSummaryTable">
				<thead>
					<tr class="buildingHeaders">
						<th></th>
						<th>House</th>
						<th>Theology</th>
						<th>Biology</th>
						<th>University</th>
						<th>Alchemy</th>
						<th>Philosophy</th>
						<th>Brewey</th>
						<th>Forced Labour</th>
						<th>Stable</th>
						<th>Harbour</th>
						<th>Hospital</th>
						<th>Explorer</th>
						<th>Granary</th>
						<th>Dump</th>
						<th>Cathedral</th>
						<th>Market</th>
						<th>Cart</th>
						<th>Foutain</th>
						<th>Storage</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(player, playerIndex) in store.players" :key="playerIndex">
						<td :class="{ winCondMet: model.status_barbara_buildings(playerIndex) }">{{ player.displayName }}</td>
						<td v-for="(building, idx) in model.data_barbara_buildings(playerIndex)" :key="idx" :style="{ backgroundColor: getBuildingBackgroundColor(building) }"></td>
					</tr>
				</tbody>
			</table>

			<h2>Cost to Complete Unbuilt Buildings</h2>
			<table class="resultSummaryTable">
				<thead>
					<tr class="buildingHeaders">
						<th></th>
						<th>Resources Required</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(player, playerIndex) in store.players" :key="playerIndex">
						<td>{{ player.displayName }}</td>
						<td class="buildingCostTD">
							{{ city.getBarabaraCostToGo(playerIndex)[0] }} x
							<img class="buildSummaryRes" :src="view.getImage('res_' + String(rf.RES_WOOD))" />
							&nbsp;&nbsp;
							{{ city.getBarabaraCostToGo(playerIndex)[1] }} x
							<img class="buildSummaryRes" :src="view.getImage('res_' + String(rf.RES_STONE))" />
							&nbsp;&nbsp;
							<template v-if="city.hasWorkingUniqueBuilding(playerIndex, rf.BLDG_PHILOSOPHY, false)">{{ city.getBarabaraCostToGo(playerIndex)[2] + 2 * city.getBarabaraCostToGo(playerIndex)[3] }} x Luxury Goods</template>
							<template v-else>
								{{ city.getBarabaraCostToGo(playerIndex)[2] }} x Luxury &nbsp;&nbsp;
								<span v-if="city.getBarabaraCostToGo(playerIndex)[3] > 0">2 x Different Luxury</span>
							</template>
						</td>
					</tr>
				</tbody>
			</table>

			<h2>San Christofori</h2>
			<table class="resultSummaryTable">
				<thead>
					<tr>
						<th></th>
						<th><img class="christoSummaryRes" :src="view.getImage('res_' + String(rf.RES_GRAIN))" /></th>
						<th><img class="christoSummaryRes" :src="view.getImage('res_' + String(rf.RES_SHEEP))" /></th>
						<th><img class="christoSummaryRes" :src="view.getImage('res_' + String(rf.RES_OLIVES))" /></th>
						<th><img class="christoSummaryRes" :src="view.getImage('res_' + String(rf.RES_FISH))" /></th>
						<th><img class="christoSummaryRes" :src="view.getImage('res_' + String(rf.RES_GOLD))" /></th>
						<th><img class="christoSummaryRes" :src="view.getImage('res_' + String(rf.RES_WINE))" /></th>
						<th><img class="christoSummaryRes" :src="view.getImage('res_' + String(rf.RES_PEARLS))" /></th>
						<th><img class="christoSummaryRes" :src="view.getImage('res_' + String(rf.RES_DYE))" /></th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(player, playerIndex) in store.players" :key="playerIndex">
						<td :class="{ winCondMet: model.status_christo_3foodLux(playerIndex) }">{{ player.displayName }}</td>
						<td
							v-for="(res, playerIndex) in model.data_christo_3foodLux(playerIndex)"
							:key="playerIndex"
							:style="{
								color: res >= 3 ? 'green' : 'red',
							}">
							{{ res }}
						</td>
					</tr>
				</tbody>
			</table>
			<h2>San Giorgio (Unenclosed Hexes)</h2>
			<table class="resultSummaryTable">
				<thead>
					<tr>
						<th></th>
						<th v-for="(player, idx) in store.players" :key="idx">{{ player.displayName }}</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(player, playerIndex) in store.players" :key="playerIndex">
						<td :class="{ winCondMet: model.status_giorgio_enclosing(playerIndex) }">{{ player.displayName }}</td>
						<td v-for="(targetPlayer, targetIdx) in store.players" :key="targetIdx">
							<span v-if="playerIndex !== targetIdx" :style="{ color: model.data_giorgio_enclosing(playerIndex, targetIdx) === 0 ? 'green' : 'red' }">
								{{ model.data_giorgio_enclosing(playerIndex, targetIdx) }}
							</span>
							<template v-else>--</template>
						</td>
					</tr>
				</tbody>
			</table>
			<h2>"Unpolluted" (actually unoccupied) Area</h2>
			<table class="resultSummaryTable">
				<thead>
					<tr>
						<th></th>
						<th>Size</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="(player, playerIndex) in store.players" :key="playerIndex">
						<td>{{ player.displayName }}</td>
						<td>{{ model.getUnpollutedArea(playerIndex) }}</td>
					</tr>
				</tbody>
			</table>

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
.saintContainerContainer {
	display: inline-block;
}

.saintContainer {
	display: flex;
	align-items: center;
	border: 2px solid black;
	width: fit-content;
	height: 116px;
	margin-right: 5px;
}

.saintImage {
	height: 100%;
	width: 64px;
	border: 1px solid black;
}

.saintImage img {
	height: 100%;
	width: 100%;
}

.saintText {
	text-align: left;
	margin-left: 10px;
	margin-right: 10px;
	max-width: 200px;
}

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
	height: 1000px;
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
	height: 342px;
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
	top: 123px;
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

#rewindPanel {
	position: absolute;
	background-color: black;
	border: 1px solid white;
	padding: 5px;
	width: 400px;
	left: 10px;
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

.resultSummaryTable {
	border-collapse: collapse;
	width: 600px;
	margin: auto;
}

.resultSummaryTable td,
.resultSummaryTable th {
	border: 1px solid #000;
	padding: 5px;
}

.resultSummaryTable tr {
	cursor: pointer;
	text-align: center;
}

.resultSummaryTable tr:nth-child(even) {
	background-color: #f2f2f2;
}

.resultSummaryTable tr:nth-child(odd) {
	background-color: white;
}

.resultSummaryTable tr:hover {
	background-color: #ddd;
}

.resultSummaryTable th {
	padding-top: 7px;
	padding-bottom: 7px;
	background-color: #5875f8;
	color: white;
	cursor: default;
}

.buildingHeaders th {
	padding-left: 10px;
	padding-right: 10px;
}

.christoSummaryRes {
	width: 50px;
	height: 50px;
	border: 2px solid black;
}

.buildSummaryRes {
	width: 40px;
	height: 40px;
	border: 2px solid black;
	vertical-align: middle;
}

.buildingCostTD {
	font-size: 20px;
}

.barbaraInfoDiv {
	border: 1px solid black;
	display: inline-block;
	padding: 5px;
	margin-right: 10px;
}

.barbaraInfoDivRed {
	color: white;
	background-color: salmon;
}

.barbaraInfoDivGreen {
	color: white;
	background-color: green;
}

.barbaraInfoDivOrange {
	color: black;
	background-color: orange;
}

.winCondMet {
	background-color: lightgreen;
}
</style>
