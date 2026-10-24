<script setup>
import * as refFuncs from "../js/TGZfuncs"
import * as IO from "../js/TGZ_IO"
import * as view from "../js/TGZview"
import * as rf from "../js/TGZreference"
import * as model from "../js/TGZmodel"

import PlayerBiddingLine from "./PlayerBiddingLine.vue"

import { ref } from "vue"

import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/TGZpersonal.js"
const personal = usePersonalStore()

import i18n from "../i18n"
const t = i18n.global.t

const chatMessage = ref("")
const submittingBug = ref(false)

function toggleBug() {
	store.topMenuViews.showNotes = false
	store.topMenuViews.showBug = !store.topMenuViews.showBug
}

async function submitBug() {
	submittingBug.value = true
	store.topMenuViews.bugSuccessText = ""
	let bugContent = document.getElementById("bugContent").value
	if (bugContent.length === 0) {
		store.topMenuViews.rewindErrorText = t("topMenuViews.bugErrorRequired")
		submittingBug.value = false
		return
	}
	IO.submitBug(bugContent)
	submittingBug.value = false
}

function toggleNotes() {
	store.topMenuViews.showBug = false
	store.topMenuViews.showNotes = !store.topMenuViews.showNotes
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
	store.topMenuViews.performingRewind = true
	setTimeout(function () {
		store.topMenuViews.showRewindPanel = false
		IO.loadRewind()
	}, 500)
}

function anyoneHasgod(retArr) {
	let res = []
	for (let i = 0; i < store.players.length; i++) {
		const gods = model.getPlayer_gods(store.players[i])
		for (let g = 0; g < gods.length; g++) {
			if (gods[g][0] !== rf.NO_god) {
				if (!retArr) return true
				else res.push([gods[g][0], i])
			}
		}
	}
	if (retArr) return res
	return false
}

function anyoneHasSpec(retArr) {
	let res = []
	for (let i = 0; i < store.players.length; i++) {
		if (store.players[i].specialists.length > 0) {
			if (!retArr) return true
			else {
				for (let j = 0; j < store.players[i].specialists.length; j++) {
					res.push([store.players[i].specialists[j][0], i])
				}
			}
		}
	}
	if (retArr) return res
	return false
}

function anyoneHasTech(tech, returnIndex) {
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].techs.length; j++) {
			if (store.players[i].techs[j][0] === tech) {
				if (returnIndex) return i
				else return true
			}
		}
	}
	return false
}

function getRemainingNumTop(tile) {
	if (rf.ROTATABLE_TILES.includes(tile)) return 20
	if (rf.CRAFTSMEN_TILES.includes(tile)) return 20
	return 0
}

function getRemainingNumLeft(tile) {
	if (!rf.CRAFTSMEN_TILES.includes(tile)) return 12
	if (rf.ROTATABLE_TILES.includes(tile)) return 10
	return 39
}

function parseMessage(message) {
	message = message.replace(/SNLB/g, "\n")
	return message
}

const reserveFilter = ref("all")

function getMissinggods() {
	let all = [...store.availablegods]
	for (let i = 0; i < store.players.length; i++) {
		const gods = model.getPlayer_gods(store.players[i])
		for (let g = 0; g < gods.length; g++) {
			if (gods[g][0] !== rf.NO_god) all.push(gods[g][0])
		}
	}
	const schismInGame = all.some((god) => rf.SCHISM_gods.includes(god))
	const candidates = schismInGame ? rf.ALL_gods.concat(rf.SCHISM_gods) : rf.ALL_gods
	return candidates.filter((god) => !all.includes(god))
}

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

function getRewindPanelLeft() {
	return document.getElementById("menuButtonRewindPos").getBoundingClientRect().left + document.getElementById("menuButtonRewindPos").getBoundingClientRect().width / 2 - 200
}

function getTechsArray() {
	let res = JSON.parse(JSON.stringify(rf.ALL_TECHS_RES_DISPLAY))
	if (store.availablegods.includes(rf.OGUN) || store.players.some((player) => model.has_god(player, rf.OGUN))) {
		res.push([rf.BLACKSMITH_TECH])
	}
	return res
}
function getTilesArray() {
	let res = JSON.parse(JSON.stringify(rf.ALL_TILES))
	if (store.availablegods.includes(rf.OGUN) || store.players.some((player) => model.has_god(player, rf.OGUN))) {
		res.splice(7, 0, rf.BLACKSMITH_TILE);
	}
	if (!rf.CRAFTSMEN_TILES.includes(rf.BLACKSMITH_TILE)) rf.CRAFTSMEN_TILES.push([rf.BLACKSMITH_TILE])
	return res
}


function getStatsExcludeVotes(returnPlayers = false) {
	let votes = 0
	let players = t("common.none")

	for (const player in store.statsExcludeVotesData) {
		// Use const or let for player
		if (store.statsExcludeVotesData[player] === true) {
			votes += 1
			if (players === t("common.none")) players = String(player)
			else players += ", " + player
		}
	}
	if (returnPlayers) return players
	return votes
}

function getDeleteVotes(returnPlayers = false) {
	let votes = 0
	let players = t("common.none")

	for (const player in store.deleteVotesData) {
		// Use const or let for player
		if (store.deleteVotesData[player] === true) {
			votes += 1
			if (players === t("common.none")) players = String(player)
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
			<h2>{{ $t("topMenuViews.bugReport") }}</h2>
			<p>
				{{ $t("topMenuViews.bugIntro") }}
				<br />
				{{ $t("topMenuViews.bugData") }}
				<br />
				{{ $t("topMenuViews.discordReport") }}
				<a href="https://discord.gg/hCU7Fr77yV" class="linkOther" target="_blank">{{ $t("topMenuViews.here") }}</a>
				{{ $t("topMenuViews.toJoin") }}
			</p>

			<div><textarea cols="150" rows="10" name="bugContent" id="bugContent"></textarea></div>
			<div>
				<button class="actionsLineButton" @click="submitBug" :disabled="submittingBug">
					<span v-if="submittingBug">{{ $t("topMenuViews.submittingBug") }}</span>
					<span v-else>{{ $t("topMenuViews.submit") }}</span>
				</button>
				&nbsp;&nbsp;&nbsp;&nbsp;
				<button class="actionsLineButton" @click="toggleBug">{{ $t("topMenuViews.cancel") }}</button>
			</div>
		</div>
	</transition>

	<!-- NOTES -->
	<transition name="slideNotes">
		<div id="notesBox" v-if="store.topMenuViews.showNotes">
			<h2>{{ $t("topMenuViews.notesTitle") }}</h2>
			<p>{{ $t("topMenuViews.notesPrivate") }}</p>
			<div><textarea cols="120" rows="10" id="notes" v-model="personal.notes" maxlength="5000"></textarea></div>
			<div>
				<button id="submitNotes" class="actionsLineButton" @click="IO.saveNotes">{{ $t("topMenuViews.save") }}</button>
				<button id="clearNotes" class="actionsLineButton" @click="clearNotes">{{ $t("topMenuViews.clear") }}</button>
				<button id="closeNotes" class="actionsLineButton" @click="toggleNotes">{{ $t("topMenuViews.close") }}</button>
			</div>
		</div>
	</transition>

	<!-- CHAT -->
	<transition name="fade">
		<div id="wholeChat" v-if="store.topMenuViews.showChat">
			<div id="chatBox">
				<h2>{{ $t("topMenuViews.chatTitle") }}</h2>
				<div><textarea rows="6" name="chatMessage" id="chatMessage" v-model="chatMessage"></textarea></div>
				<div><button class="actionsLineButton" @click="sendChatMessage">{{ $t("topMenuViews.send") }}</button></div>
			</div>
			<div id="messageList">
				<div class="chatentry" v-for="(message, index) in store.chatData" :key="index">
					<div class="header">
						<span class="bold">{{ message[0] }}</span>
						<span class="date">
							{{ refFuncs.timestampToString((personal.gameCreationTimestamp + message[1]) * 1000) }}
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
			{{ $t("topMenuViews.rewindAnyone") }}
			<br />
			{{ $t("topMenuViews.rewindCourtesy") }}
			<br />
			<br />
			{{ $t("topMenuViews.rewindPermanent") }}
			<br />
			<br />

			<span class="topMenuItem" @click="loadRewind">
				<img :src="view.getImage('icon-rewind')" />
				<span>{{ $t("topMenuViews.rewind") }}</span>
			</span>

			<hr />
			<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
				{{ $t("topMenuViews.statsExcludeIntro") }}
				<br />
				{{ $t("topMenuViews.votesPlayers", { votes: getStatsExcludeVotes(false), players: getStatsExcludeVotes(true) }) }}
				<br />
				<button v-if="!personal.votedToExclude" class="actionsLineButton"
					@click="localCastVote(rf.STATS_EXCLUDE_VOTE_TOPIC)">{{ $t("topMenuViews.voteExclude") }}</button>
			</div>
			<div v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && !personal.trainingGame && personal.pov >= 0">
				{{ $t("topMenuViews.deleteGameIntro") }}
				<br />
				{{ $t("topMenuViews.votesPlayers", { votes: getDeleteVotes(false), players: getDeleteVotes(true) }) }}
				<br />
				<button v-if="!personal.votedToDelete" class="actionsLineButton"
					@click="localCastVote(rf.DELETE_VOTE_TOPIC)">{{ $t("topMenuViews.voteDelete") }}</button>
			</div>

		</div>
	</transition>

	<!-- RESERVE -->
	<transition name="slideC">
		<div id="reserve" v-if="store.topMenuViews.showReserve">
			<label for="reserveFilter" class="reserveFilterLabel">{{ $t("topMenuViews.filter") }}</label>
			<select id="reserveFilter" v-model="reserveFilter" class="reserveFilter">
				<option value="all">{{ $t("topMenuViews.all") }}</option>
				<option value="gods">{{ $t("topMenuViews.availableTakenGods") }}</option>
				<option value="specs">{{ $t("topMenuViews.availableTakenSpecialists") }}</option>
				<option value="techs">{{ $t("topMenuViews.availableTakenTechs") }}</option>
				<option value="tiles">{{ $t("topMenuViews.availableTiles") }}</option>
			</select>

			<!-- Bidding order -->
			<h2>{{ $t("topMenuViews.biddingOrder") }}</h2>
			<PlayerBiddingLine />

			<!-- gods-->
			<template v-if="reserveFilter === 'all' || reserveFilter === 'gods'">
			<h2>{{ $t("topMenuViews.availableTakenGods") }}</h2>
			<div v-for="(god, idx) in store.availablegods" :key="idx"
				:class="[personal.aidText ? 'godResDiv' : 'godResDivNoText']">
				<b>{{ rf.god_NAMES[god] }}</b>
				<br />
				<img class="godResImg" :src="view.getImage('god' + god)" alt="god" />
				<div v-if="personal.aidText" class="godResTextDiv">{{ rf.god_TEXT[god] }}</div>
				<br />
				<span v-if="rf.isVRchanged(god) || personal.aidText" :class="{ changedVR: rf.isVRchanged(god) }">VR: {{
					rf.gods_VR[god] }}</span>
			</div>
			<template v-if="anyoneHasgod(false)">
				<div v-for="(god, idx) in anyoneHasgod(true)" :key="idx"
					:class="[personal.aidText ? 'godResDiv taken' : 'godResDivNoText taken']" :style="{
						'background-color': personal.getCorrectedColourHex(store.players[god[1]].colour),
						color: personal.getCorrectedColour(store.players[god[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[god[1]].colour) === rf.YELLOW ? 'black' : 'white',
					}">
					<b>{{ rf.god_NAMES[god[0]] }}</b>
					<br />
					<img class="godResImg" :src="view.getImage('god' + god[0])" alt="god" />
					<div v-if="personal.aidText" class="godResTextDiv">{{ rf.god_TEXT[god[0]] }}</div>
					<br />
					<span v-if="rf.isVRchanged(god[0]) || personal.aidText"
						:class="{ changedVR: rf.isVRchanged(god[0]) }">VR: {{ rf.gods_VR[god[0]] }}</span>
				</div>
			</template>
			<br />
			<b>{{ $t("topMenuViews.unusedGods") }}</b>
			<span v-for="(god, idx) in getMissinggods()" :key="idx">
				<b>{{ rf.god_NAMES[god] }}</b>
				({{ rf.missinggod_TEXT[god] }})
				<span v-if="idx !== getMissinggods().length - 1">,</span>
			</span>

			<!-- specs-->
			</template>
			<template v-if="reserveFilter === 'all' || reserveFilter === 'specs'">
			<h2>{{ $t("topMenuViews.availableTakenSpecialists") }}</h2>
			<div v-for="(spec, idx) in store.availableSpecialists" :key="idx"
				:class="[personal.aidText ? 'specResDiv' : 'specResDivNoText']">
				<b>{{ rf.SPEC_NAMES[spec] }}</b>
				<br />
				<img class="specResImg" :src="view.getImage('spec' + spec)" alt="Spec" />
				<div v-if="personal.aidText" class="specResTextDiv">{{ rf.SPEC_TEXT[spec] }}</div>
				<br v-if="!personal.aidText" />
				<span v-if="rf.isSpecVRchanged(spec) || personal.aidText"
					:class="{ changedVR: rf.isSpecVRchanged(spec) }">VR: {{
						rf.SPEC_VR[spec] }}</span>
			</div>
			<template v-if="anyoneHasSpec(false)">
				<div v-for="(spec, idx) in anyoneHasSpec(true)" :key="idx"
					:class="[personal.aidText ? 'specResDiv taken' : 'specResDivNoText taken']" :style="{
						'background-color': personal.getCorrectedColourHex(store.players[spec[1]].colour),
						color: personal.getCorrectedColour(store.players[spec[1]].colour) === rf.WHITE || personal.getCorrectedColour(store.players[spec[1]].colour) === rf.YELLOW ? 'black' : 'white',
					}">
					<b>{{ rf.SPEC_NAMES[spec[0]] }}</b>
					<br />
					<img class="specResImg" :src="view.getImage('spec' + spec[0])" alt="Spec" />
					<div v-if="personal.aidText" class="specResTextDiv">
						{{ rf.SPEC_TEXT[spec[0]] }}
						<br />
						VR: {{ rf.SPEC_VR[spec[0]] }}
					</div>
				</div>
			</template>

			<!-- TECHS -->
			</template>
			<template v-if="reserveFilter === 'all' || reserveFilter === 'techs'">
			<h2>{{ $t("topMenuViews.availableTakenTechs") }}</h2>
			<div class="techHolderDiv">
				<template v-for="(row, idx) in getTechsArray()" :key="idx">
					<div class="techPairDiv">
						<div class="techDiv" :class="{ 'taken outline': anyoneHasTech(row[0], false) }" :style="{
							'border-color': anyoneHasTech(row[0], false) ? personal.getCorrectedColourHex(store.players[anyoneHasTech(row[0], true)].colour) : 'rgba(0, 0, 0, 0)',
						}">
							<img class="techResImg" :src="view.getImage('tech' + row[0])" alt="Tech" />
						</div>
						<br />
						<div v-if="row.length > 1" class="techDiv"
							:class="{ 'taken outline': anyoneHasTech(row[1], false) }" :style="{
								'border-color': anyoneHasTech(row[1], false) ? personal.getCorrectedColourHex(store.players[anyoneHasTech(row[1], true)].colour) : 'rgba(0, 0, 0, 0)',
							}">
							<img class="techResImg" :src="view.getImage('tech' + row[1])" alt="Tech" />
						</div>
					</div>
				</template>
			</div>

			<!--Craftsmen -->
			</template>
			<template v-if="reserveFilter === 'all' || reserveFilter === 'tiles'">
			<h2>{{ $t("topMenuViews.availableTiles") }}</h2>
			<template v-for="(tile, idx) in getTilesArray()" :key="idx">
				<div class="tileDiv" :style="{
					width: rf.ROTATABLE_TILES.includes(tile) ? '50px' : '100px',
					width: !rf.CRAFTSMEN_TILES.includes(tile) ? '50px' : '',

					height: rf.CRAFTSMEN_TILES.includes(tile) || tile === rf.WATER_TILE ? '100px' : '50px',
				}">
					<img :src="view.getImage((rf.CRAFTSMEN_TILES.includes(tile) ? 'craftsman' : 'res') + String(tile) + (rf.ROTATABLE_TILES.includes(tile) ? '_v' : ''))"
						:alt="(rf.CRAFTSMEN_TILES.includes(tile) ? 'craftsman' : 'res') + String(tile) + (rf.ROTATABLE_TILES.includes(tile) ? '_v' : '')" />
					<div class="tileNumberDiv" :style="{
						top: String(getRemainingNumTop(tile)) + 'px',
						left: String(getRemainingNumLeft(tile)) + 'px',
					}">
						{{ store.remainingItems[tile] }}
					</div>
				</div>
			</template>

			</template>

			<div id="timesDiv">
				{{ $t("topMenuViews.flexiTimes") }}
				<span v-for="(player, idx) in store.players" :key="idx">{{ player.name }}: {{
					getFlexiTimeString(player.name)
					}}&nbsp;&nbsp;&nbsp;</span>
				&nbsp;&nbsp;&nbsp;
			</div>
		</div>
	</transition>
</template>

<style scoped>
.changedVR {
	background-color: yellow;
	color: darkred;
}

.reserveFilterLabel {
	margin-right: 6px;
	font-weight: bold;
}

.reserveFilter {
	margin-bottom: 10px;
	padding: 4px 8px;
	font-size: 15px;
}

.slideC-enter-active,
.slideC-leave-active {
	transition: all 0.2s ease-in-out;
	height: 1000px;
	overflow: hidden;
}

.slideNotes-enter-active,
.slideNotes-leave-active {
	transition: all 0.2s ease-in-out;
	height: 293px;
	overflow: hidden;
}

.slideBug-enter-active,
.slideBug-leave-active {
	transition: all 0.2s ease-in-out;
	height: 329px;
	overflow: hidden;
}

.slideBug-enter-from,
.slideBug-leave-to,
.slideNotes-enter-from,
.slideNotes-leave-to,
.slideC-enter-from,
.slideC-leave-to {
	opacity: 0;
	height: 0px;
}

#reserve {
	border: 2px solid black;
	/*margin-top: -4px;*/
	/*margin-left: -10px;*/
	background-color: lightblue;
}

.techHolderDiv {
	width: 100%;
	height: 294;
	background-color: lightblue;
	/*overflow: none;*/
	/*white-space: nowrap;*/
}

.techPairDiv {
	display: inline-block;
}

.techDiv {
	display: inline-block;
	border: 8px solid;
	margin: 2px;
	width: 150px;
	height: 98px;
}

.outline {
	outline: 1px solid black;
}

.techDiv img {
	width: 100%;
	height: 100%;
}

.tileDiv {
	display: inline-block;
	border: 2px solid black;
	margin-right: 5px;
	position: relative;
}

.tileDiv img {
	height: 100%;
	width: 100%;
}

.tileNumberDiv {
	position: absolute;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
	color: white;
	font-size: 45px;
}

.specResDiv,
.godResDiv {
	display: inline-block;
	/*border: 1px solid black;*/
	margin: 2px;
	width: 150px;
	height: fit-content;
	min-height: 310px;
	vertical-align: top;
	position: relative;
}

.specResDivNoText,
.godResDivNoText {
	display: inline-block;
	/*border: 1px solid black;*/
	margin: 2px;
	width: 150px;
	height: fit-content;
	vertical-align: middle;
	position: relative;
}

.specResImg,
.godResImg,
.techResImg {
	width: 100px;
	height: 153px;
	border: 1px solid black;
	border-radius: 7px;
}

.specResTextDiv,
.godResTextDiv {
	padding: 5px;
}

.godChoiceDiv img {
	width: 80%;
}

.taken img {
	opacity: 0.7;
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
	top: 121px;
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
	/*margin-bottom: 5px;*/
	margin-left: 0px;
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
</style>
