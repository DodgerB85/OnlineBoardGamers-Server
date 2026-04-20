<script setup>
import * as IO from "../js/TGZ_IO"
import * as WS from "../js/TGZwebsocket"
import * as view from "../js/TGZview"
import * as rf from "../js/TGZreference"
import * as controller from "../js/TGZcontroller"
import * as funcs from "../js/TGZfuncs"
import * as replay from "../js/TGZreplay"
import * as model from "../js/TGZmodel"

import PlayerLine from "./PlayerLine.vue"

import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/TGZpersonal.js"
const personal = usePersonalStore()

import { ref } from "vue"

const nameClickCounter = ref(0)

function zoomClick() {
	let doSave = false
	if (personal.pov >= 0) doSave = true
	store.refSize = 240
	if (doSave) {
		personal.zoomInterval = setTimeout(function () {
			clearInterval(personal.zoomInterval)
			IO.saveZoom(store.refSize)
		}, 1000)
	}
}

function doZoom(dir) {
	let doSave = false
	if (personal.pov >= 0) doSave = true
	store.refSize += dir * 20
	if (store.refSize < 160) {
		store.refSize = 160
		doSave = false
	} else if (store.refSize > 480) {
		store.refSize = 480
		doSave = false
	} else clearInterval(personal.zoomInterval)
	if (doSave) {
		personal.zoomInterval = setTimeout(function () {
			clearInterval(personal.zoomInterval)
			IO.saveZoom(store.refSize)
		}, 1000)
	}
}

function toggleBug() {
	store.topMenuViews.showNotes = false
	if (store.topMenuViews.showBug) store.topMenuViews.rewindErrorText = ""
	store.topMenuViews.showBug = !store.topMenuViews.showBug
}

async function toggleReplay() {
	if (!store.topMenuViews.showReplay) {
		store.statsModeData.statsMode = false
		store.replayResetData = funcs.exportModel(true) // FIZ
		store.topMenuViews.showReplay = true

		// TURM ON
		let preCows = []
		for (let i = 0; i < store.players.length; i++) {
			preCows.push(store.players[i].cows)
		}
		await replay.generateReplayData()
		let postCows = []
		for (let i = 0; i < store.players.length; i++) {
			postCows.push(store.players[i].cows)
		}
		for (let i = 0; i < preCows.length; i++) {
			if (preCows[i] !== postCows[i]) store.topMenuViews.rewindErrorText = "Game data does not match - Submit bug report"
		}
	} else {
		// TURN OFF
		store.clearHistoryHelpers()
		store.clearVars(false)
		store.topMenuViews.showReplay = false
		funcs.importModel(store.replayResetData, true)
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) store.statsModeData.statsMode = true
	}
}
function toggleNotes() {
	store.topMenuViews.showBug = false
	store.topMenuViews.showNotes = !store.topMenuViews.showNotes
}
function toggleChat() {
	store.topMenuViews.showHistory = false
	document.getElementById("boardContainer").classList.remove("slideRight")
	if (store.topMenuViews.showChat) store.topMenuViews.showChat = false
	else {
		store.topMenuViews.showChat = true
		setTimeout(function () {
			var b = document.getElementById("footer").getBoundingClientRect().top
			var a = 130
			document.getElementById("wholeChat").style["max-height"] = String(parseInt(b - a)) + "px"
		}, 50)
	}

	WS.StartWebSocket()
}
function toggleReserve() {
	store.topMenuViews.showReserve = !store.topMenuViews.showReserve
}
function toggleHistory() {
	store.topMenuViews.showChat = false
	store.clearHistoryHelpers()
	if (store.topMenuViews.showHistory) {
		store.topMenuViews.showHistory = false
		document.getElementById("boardContainer").classList.remove("slideRight")
	} else {
		store.topMenuViews.showHistory = true
		setTimeout(function () {
			var b = document.getElementById("footer").getBoundingClientRect().top
			var a = 130
			document.getElementById("history").style["max-height"] = String(parseInt(b - a)) + "px"
			var offsets = document.getElementById("boardContainer").getBoundingClientRect()
			if (offsets.left < 460) document.getElementById("boardContainer").classList.add("slideRight")
		}, 50)
	}
}

function loadRewind() {
	if (!personal.trainingGame) store.topMenuViews.showRewindPanel = !store.topMenuViews.showRewindPanel
	else {
		if (store.topMenuViews.performingRewind) return
		store.topMenuViews.performingRewind = true
		setTimeout(function () {
			IO.loadRewind()
		}, 500)
	}
}
function clickedLoggedInDiv() {
	if (rf.SUPER_USERS.includes(personal.name)) {
		personal.pov++
		if (personal.pov === store.players.length) personal.pov = 0
		store.gameName = String(personal.pov) + "  :  " + store.players[personal.pov].name
		controller.startPlayerTurn()
	}
	/*else if (personal.trainingGame) {
		personal.aidText = true
		store.availablegods = [...rf.EVERYTHING_gods]
	}*/
	else {
		nameClickCounter.value++
		if (nameClickCounter.value >= 5) {
			store.allowMultiple_gods = true
		}
	}
	/*if (personal.trainingGame && !rf.SCHISM_MAKERS.includes(personal.name)) {
		personal.aidText = true
		store.availablegods = [rf.AGWU_NSI, rf.ALA, rf.ALAJIRE, rf.ANYANWU, rf.IGWEKALA, rf.ORISHA_AJE, rf.TIURAKH, rf.OGUN]
		if (!rf.ALL_TILES.includes(rf.BLACKSMITH_TILE)) rf.ALL_TILES.push(rf.BLACKSMITH_TILE)
		if (store.remainingItems.length === 12) store.remainingItems.push(3)
	} else if (rf.SCHISM_MAKERS.includes(personal.name) && store.availablegods.length < 12) {
		store.availablegods = [rf.ANYANWU, rf.TIURAKH, rf.OGUN, rf.OYA, rf.EKWENSU, rf.OVIA, rf.YEMOJA, rf.AJE_SHALUGA]
		store.availablegods = [...rf.EVERYTHING_gods]
		if (!rf.ALL_TILES.includes(rf.BLACKSMITH_TILE)) rf.ALL_TILES.push(rf.BLACKSMITH_TILE)
		if (store.remainingItems.length === 12) store.remainingItems.push(3)
	} else if (rf.SCHISM_MAKERS.includes(personal.name)) {
		store.availablegods = [...rf.SCHISM_gods]
		if (!rf.ALL_TILES.includes(rf.BLACKSMITH_TILE)) rf.ALL_TILES.push(rf.BLACKSMITH_TILE)
		if (store.remainingItems.length === 12) store.remainingItems.push(3)
	}*/
}

function getKickoutTImerText() {
	if (personal.secondsToNextKickout < 0) personal.secondsToNextKickout = 0
	let minsToGo = String(Math.floor(personal.secondsToNextKickout / 60))
	let secsToGo = "0" + String(Math.floor(personal.secondsToNextKickout % 60))
	return " " + minsToGo + " : " + secsToGo.slice(-2)
}

function nextGame() {
	window.location.href = window.initData.nextURL
}

/*function toggleStatsExcludeDropdown() {
	store.topMenuViews.showStatsExcludeDropdown = !store.topMenuViews.showStatsExcludeDropdown
}*/

function adminBKSbutton() {
	//funcs.exportModel(false)
	//console.log(map.prettyPrint())
	/*for (let i = 0; i < controller.currentPlayerObj().monuments.length; i++) {
		controller.currentPlayerObj().monuments[i][1] = 5
	}*/
	//store.remainingItems = [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3]
	//for (let i = 0; i < store.players.length; i++) {
	//	model.adjustMaxVR(store.players[i], 100)
	//}
	alert(personal.latestUpdate)
}
</script>

<template>
	<div id="top">
		<div id="menu">
			<a href="/">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-house')" />
					<span>Home</span>
				</span>
			</a>

			<!-- IF LOGGED IN -->
			<span v-if="personal.name != undefined" class="topMenuItem" id="menuButtonNext" @click="nextGame">
				<img :src="view.getImage('icon-nextGame')" />
				<span>Next</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<div class="menuDivider"></div>

			<a href="/TGZ/help/" target="_blank">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-rulebook')" />
					<span>Rules</span>
				</span>
			</a>

			<span :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showReserve }]" id="menuButtonReserve" @click="toggleReserve">
				<img :src="view.getImage('icon-box')" />
				<span>Reserve</span>
			</span>

			<div class="menuDivider"></div>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" id="menuButtonRewindPos" :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showRewindPanel }]" @click="loadRewind()">
				<img :src="view.getImage('icon-rewind')" />
				<span>Rewind</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<br />

			<!-- IF LOGGED IN -->
			<span v-if="personal.name != undefined" :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showChat }]" id="menuButtonChat" @click="toggleChat">
				<img :src="view.getImage('icon-chat')" />
				<span>Chat</span>
			</span>
			<span v-else class="topMenuBlank"></span>
			<!-- IF LOGGED IN -->
			<span v-if="personal.name != undefined" :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showBug }]" id="menuButtonBug" @click="toggleBug">
				<img :src="view.getImage('icon-stop')" />
				<span>Bug</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<div class="menuDivider"></div>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" class="topMenuItem" :class="['topMenuItem', { hasNotes: personal.notes.length > 0 }, , { topMenuItemSelected: store.topMenuViews.showNotes }]" id="menuButtonNotes" @click="toggleNotes">
				<img :src="view.getImage('icon-notebook')" />
				<span>Notes</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<span :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showHistory }]" id="menuButtonHistory" @click="toggleHistory">
				<img :src="view.getImage('icon-scroll')" />
				<span>History</span>
			</span>

			<div class="menuDivider"></div>

			<span class="topMenuItem" @click="toggleReplay">
				<img :src="view.getImage('icon-replay')" />
				<span>Replay</span>
			</span>
		</div>

		<div id="topRight">
			<div id="loggedInDiv" v-if="personal.name" @click="clickedLoggedInDiv()">
				{{ personal.name }}
				<div id="WSstatus" v-if="personal.pov >= 0" :class="personal.WSstatus"></div>
				<br />
			</div>
			<button class="zoomButton" @click="doZoom(1)">🔍+</button>
			<button class="zoomButton" @click="doZoom(-1)">🔍-</button>
			<template v-if="personal.pov >= 0 && !personal.trainingGame && personal.secondsToNextKickout <= 1200 && store.gameflow.phase !== rf.PHASE_GAME_OVER">
				<br />
				<span id="kickoutTimerSpan">
					Time to next kickout:
					<span id="kickoutTimerTimer">{{ getKickoutTImerText() }}</span>
				</span>
			</template>
			<template v-if="personal.name === 'admin' || personal.name === 'BotKickStarter'">
				<br />
				<button class="actionsLineButton" @click="adminBKSbutton">Admin / BKS button</button>
			</template>
			<!-- Stats exclude bit
			<br />
			<template v-if="personal.pov > -1 && !personal.trainingGame">
				<div id="dropdownContainer">
					<div @click="toggleStatsExcludeDropdown" id="showDropdown">↓ Stats Exclude ↓</div>
					<transition name="fade">
						<div id="dropdown" v-if="store.topMenuViews.showStatsExcludeDropdown">
							<div v-if="personal.statsExcludedGame !== true">
								<input type="checkbox" class="myCheckbox" id="checkStatsExclude" name="checkStatsExclude" value="1" :disabled="personal.myStatsExcludeConsent === 1" :checked="personal.myStatsExcludeConsent === 1" />
								<label for="checkStatsExclude">Exclude game from stats</label>
								<input v-if="personal.myStatsExcludeConsent !== 1" @click="IO.submitStatsExcludeConsent" type="submit" value="Exclude From Stats" />
							</div>

							<span v-if="personal.statsExcludedGame !== true && personal.myStatsExcludeConsent === 1" style="background-color: darkgoldenrod">
								Waiting for other players
								<br />
								Refresh page to update
							</span>
							<span v-if="personal.statsExcludedGame" style="background-color: darkcyan">Excluded from Stats</span>

							<div id="dropdownText">If all players confirm this option then this game won't count in any stats. You can use this if players have resigned/been kicked out, or you wish to have a less competitive game. After this has been confirmed by everyone, you can resign without a loss if you wish to leave</div>
						</div>
					</transition>
				</div>
			</template>
		-->
			<!-- DROP DOWN FOR SPLOTTER CON-->
			<template v-else-if="personal.pov > -1 && personal.trainingGame && rf.SPLOTTER_CON_USERS.includes(personal.name)">
				<div id="dropdownContainerSplotterCon">
					<div @click="toggleStatsExcludeDropdown" id="showDropdownSplotterCon">↓ Edit Players / Colours ↓</div>
					<transition name="fade">
						<div id="dropdownSplotterCon" v-if="store.topMenuViews.showStatsExcludeDropdown">
							Change the Player Names / Colours to match the real game
							<br />
							Note: Top player is currently the first in turn order.
							<br />
							<br />
							<b>
								NOTE THAT THE COLOUR SELECTION IS THE "BEHIND THE SCENES COLOUR SETTING"
								<br />
								IF YOU HAVE PREFERRED COLOUR ENABLED IN YOUR PROFILE, IT COULD AFFECT THE COLOUR OUTPUT
							</b>

							<br />
							<br />
							<template v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx">
								<div class="splotterConSelectionLineDiv">
									<input type="text" v-model="store.players[playerIndex].displayName" />
									<select v-model="store.players[playerIndex].colour">
										<option :value="rf.BLACK">Black</option>
										<option :value="rf.GREEN">Green</option>
										<option :value="rf.RED">Red</option>
										<option :value="rf.WHITE">White</option>
										<option :value="rf.YELLOW">Yellow</option>
									</select>
								</div>
							</template>

							<div id="dropdownText">
								Edit the names / colours and then make a move to save
								<br />
								Or you can use this button
								<br />
								<button @click="IO.doSimpleSave()" class="actionsLineButton">Save</button>
							</div>

							<div id="dropdownText">
								If people start using the in-game chat, it will show up every time there's a new message.
								<br />
								If this gets annoying or interrupts the game flow, use this checkbox to inhibit the auto-popup.
								<br />
								Just remember to check the chat occasionally in case there's an important message!
								<br />
								<br />
								<input name="inhibitChatPopup" id="inhibitChatPopup" type="checkbox" v-model="personal.inhibitChatPopup" />
								<label for="inhibitChatPopup">Inhibit Chat Popup</label>
								<br />
								<br />
								(You will need to re-tick this each time you reload the page)
							</div>
						</div>
					</transition>
				</div>
			</template>
		</div>

		<div id="topInfos">
			<div class="infoSpanDiv">
				<span id="infoSpan">
					<span v-html="store.gameName"></span> | {{ store.gameflow.turn }}: {{ view.phaseStr() }}
					<span v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER">| {{ controller.currentPlayerObj().displayName }}</span>
				</span>
			</div>
			<div id="playerLineDiv">
				<PlayerLine />
			</div>
		</div>
	</div>
</template>

<style scoped>
.splotterConSelectionLineDiv {
	padding: 5px;
}
#top {
	background-color: #333;
	color: white;
	padding: 0px;
	width: 100%;
	min-width: 1410px;
	height: 120px;
	top: 0px;
	z-index: 2;
	position: relative;
}

.infoSpanDiv {
	display: flex;
	justify-content: center;
	line-height: 16px;
	margin-bottom: 2px;
	margin-top: 2px;
}

#topInfos {
	display: inline;
}

#infoSpan {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

#playerLineDiv {
	display: flex;
	/*margin: auto;*/
	justify-content: center;
}

.zoomButton {
	font-weight: 900;
	font-size: 15px;
	margin-left: 5px;
	min-width: 20px;
	text-shadow:
		-1px -1px 0 #000,
		1px -1px 0 #000,
		-1px 1px 0 #000,
		1px 1px 0 #000;
}

#WSstatus {
	border: 2px solid white;
	border-radius: 100%;
	width: 15px;
	height: 15px;
	display: inline-block;
	vertical-align: middle;
}

.WSconnecting {
	background-color: #ff9900;
}

.WSconnected {
	background-color: green;
}

.WSdisconnected {
	background-color: darkred;
}

#menu {
	float: left;
	/*color: lightblue;*/
	color: white;
	/* background-color: #ff9900;*/
}

#menu a {
	/*color: lightblue;*/
	color: white;
}

#menu a:hover,
#menu span:hover {
	/*color: white;*/
	color: lightblue !important;
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

.topMenuItem:hover img {
	filter: brightness(0) saturate(100%) invert(100%) sepia(17%) saturate(6440%) hue-rotate(174deg) brightness(98%) contrast(102%);

	/*filter:  brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(7500%) hue-rotate(299deg) brightness(99%) contrast(104%);
    */
}

.hasNotes {
	filter: brightness(0) saturate(100%) invert(83%) sepia(61%) saturate(1522%) hue-rotate(359deg) brightness(105%) contrast(108%);
}

.topMenuItemSelected {
	filter: brightness(0) saturate(100%) invert(100%) sepia(17%) saturate(6440%) hue-rotate(174deg) brightness(98%) contrast(102%);
	color: lightblue;
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

.highlighted {
	color: lightblue;
}

.redText {
	color: red;
}

#topRight {
	float: right;
	height: 100%;
	font-size: 16px;
	text-align: right;
	margin-right: 10px;
	line-height: 30px;
}

/* drop */

#dropdownContainer {
	float: right;
	width: fit-content;
	text-align: center;
	margin-top: 1px;
	margin-right: 3px;
}

#dropdownContainerSplotterCon {
	float: right;
	width: fit-content;
	text-align: center;
	margin-top: 1px;
	margin-right: 3px;
}

#showDropdown {
	padding: 1px;
	padding-left: 5px;
	padding-right: 5px;
	border: 1px solid white;
	border-radius: 17px 15px 15px 15px;
	cursor: pointer;
}

#showDropdown:hover {
	background-color: white;
	color: black;
}

#showDropdownSplotterCon {
	padding: 1px;
	padding-left: 5px;
	padding-right: 5px;
	border: 1px solid white;
	border-radius: 17px 15px 15px 15px;
	cursor: pointer;
}

#showDropdownSplotterCon:hover {
	background-color: white;
	color: black;
}

#dropdown {
	position: absolute;
	background-color: black;
	border: 1px solid white;
	padding: 5px;
	width: 400px;
	right: 5px;
	font-size: 18px;
	z-index: 1000;
}

#dropdownSplotterCon {
	position: absolute;
	background-color: black;
	border: 1px solid white;
	padding: 5px;
	width: 800px;
	right: 5px;
	font-size: 18px;
	z-index: 1000;
}

#dropdown input[type="submit"] {
	width: 200px;
	font-weight: bolder;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

/* end drop */

.topMenuBlank {
	display: inline-block;
	width: 62px;
	height: 55px;
	border: #eee;
	border-radius: 5px;
	margin-left: 0px;
	text-align: center;
}

.menuDivider {
	display: inline-block;
	width: 5px;
	height: 50px;
	background-color: darkgray;
	margin: 0px 10px 0px 10px;
}
</style>
