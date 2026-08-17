<script setup>
//import * as WS from '../js/TGZRNBsocket'
//import * as view from '../js/RNBview'
/*import * as model from '../js/TGZmodel'*/
import * as rf from "../js/RNBreference"
//import * as map from '../js/RNBmap'
//import * as controller from "../js/RNBcontroller"
//import * as funcs from '../js/RNBfuncs'
//import * as replay from '../js/RNBreplay'
import * as IO from "../backend/RNB_IO"
import * as view from "../js/RNBview"
import * as hd from "../js/RNBhex"
import * as funcs from "../js/RNBfuncs"
import * as replay from "../components/History/RNBreplay"
import * as context from "../js/RNBcontext"
//import * as model from "../js/RNBmodel"

import { useModelStore } from "../stores/RNBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/RNBpersonal.js"
const personal = usePersonalStore()


function toggleBug() {
	store.gameMessages.bugErrorText = ""
	store.gameMessages.successText = ""
	store.gameMessages.errorText = ""
	store.viewSettings.showNotes = false
	store.viewSettings.showBug = !store.viewSettings.showBug
}

async function toggleReplay() {
	if (!store.viewSettings.showReplay) {
		store.replayResetData = funcs.simpleExportWholeRNBmodel(true)
		store.viewSettings.showReplay = true

		// TURM ON
		await replay.generateReplayData()
	} else {
		// TURN OFF
		store.clearHistoryHelpers()
		context.resetContextAndHighlights()
		funcs.simpleImportWholeRNBmodel(store.replayResetData, true)
		store.viewSettings.showReplay = false
	}
}

function toggleNotes() {
	store.viewSettings.showBug = false
	store.viewSettings.showNotes = !store.viewSettings.showNotes
}
function toggleChat() {
	if (store.viewSettings.showHistory) {
		store.viewSettings.showHistory = false
		store.clearHistoryHelpers()
	}
	document.getElementById("boardContainer").classList.remove("slideRight")
	store.viewSettings.showChat = !store.viewSettings.showChat
	// WS.StartRNBSocket()
}

function toggleHistory() {
	store.viewSettings.showChat = false
	store.clearHistoryHelpers()
	if (store.viewSettings.showHistory) {
		store.viewSettings.showHistory = false
		document.getElementById("boardContainer").classList.remove("slideRight")
	} else {
		store.viewSettings.showHistory = true
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
	if (!personal.trainingGame && !personal.soloGame) store.viewSettings.showRewindPanel = !store.viewSettings.showRewindPanel
	else {
		if (store.viewSettings.performingRewind) return
		store.viewSettings.performingRewind = true
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
		// controller.startPlayerTurn()
	}
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

function toggleInfo() {
	store.viewSettings.showInfo = !store.viewSettings.showInfo
}

function wholeMapZoom() {
	// update store.refSize
	store.refSize = hd.getRefSizeToFitScreen()
	hd.calculateCanvasSize()
}

function debugButton() {
	//const resObj = model.getResByID(67)
	alert(JSON.stringify(store.ALL_HOME_MARKERS))
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

			<span v-if="personal.name != undefined" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showChat }]" id="menuButtonChat" @click="toggleChat">
				<img :src="view.getImage('icon-chat')" />
				<span>Chat</span>
			</span>

			<span v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showBug }]" id="menuButtonBug" @click="toggleBug">
				<img :src="view.getImage('icon-stop')" />
				<span>Bug</span>
			</span>

			<!-- IF LOGGED IN -->
			<span v-if="personal.name != undefined" class="topMenuItem" id="menuButtonNext" @click="nextGame">
				<img :src="view.getImage('icon-nextGame')" />
				<span>Next</span>
			</span>

			<div class="menuDivider"></div>

			<!--<span @click="toggleMapSelect" id="menuButtonMap" class="topMenuItem" :class="{ topMenuItemSelected: store.viewSettings.selectingBoard }">
				<img src="@static/WEB/images/icon-cog.svg" />
				<span>Settings</span>
			</span>-->

			<a href="/RNB/help/" target="_blank">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-rulebook')" />
					<span>Rules</span>
				</span>
			</a>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" class="topMenuItem" :class="['topMenuItem', { hasNotes: personal.notes.length > 0 }, { topMenuItemSelected: store.viewSettings.showNotes }]" id="menuButtonNotes" @click="toggleNotes">
				<img :src="view.getImage('icon-notebook')" />
				<span>Notes</span>
			</span>

			<span :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showInfo }]" id="menuButtonInfo" @click="toggleInfo">
				<img :src="view.getImage('icon-info')" />
				<span>Info</span>
			</span>

			<div class="menuDivider"></div>

			<span :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showHistory }]" id="menuButtonHistory" @click="toggleHistory">
				<img :src="view.getImage('icon-scroll')" />
				<span>History</span>
			</span>

			<span class="topMenuItem" @click="toggleReplay()">
				<img :src="view.getImage('icon-replay')" />
				<span>Replay</span>
			</span>

			<div class="menuDivider"></div>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showRewindPanel }]" @click="loadRewind()">
				<img :src="view.getImage('icon-rewind')" />
				<span>Rewind</span>
			</span>
		</div>

		<div id="topInfos">
			<span class="gameInfoSpan">
				<span v-html="store.gameName"></span>
				| Turn: {{ store.gameflow.turn }} - {{ view.phaseStr(store.gameflow.phase) }}
			</span>
			<div class="playerLineDiv">
				<template v-for="(playerIndex, idx) in store.gameflow.turnOrder" :key="idx">
					<span v-if="playerIndex !== -1" class="mainEntryPlayer turnOrderSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>
				</template>
			</div>
		</div>

		<div id="topRight">
			<div id="loggedInDiv" v-if="personal.name" @click="clickedLoggedInDiv()">
				{{ personal.name }}
				<div id="WSstatus" v-if="personal.pov >= 0" :class="personal.WSstatus"></div>
				<br />

				<template v-if="personal.pov >= 0 && !personal.trainingGame && personal.secondsToNextKickout <= 1200 && store.gameflow.phase !== rf.PHASE_GAME_OVER">
					<span id="kickoutTimerSpan">
						Time to next kickout:
						<span id="kickoutTimerTimer">{{ getKickoutTImerText() }}</span>
					</span>
				</template>
			</div>

			<div id="zoomDiv">
				<label id="zoomLabel" v-if="rf.DEBUG_USERS.includes(personal.name)">{{ store.debugVars.computedHexCounter }}</label>
				<button v-if="rf.DEBUG_USERS.includes(personal.name)" @click="debugButton">DEBUG</button>
				<button class="tableZoomButton" @click="wholeMapZoom()">🔍Map</button>
				<button class="zoomButton" @click="hd.doZoom(1)">🔍+</button>
				<button class="zoomButton" @click="hd.doZoom(-1)">🔍-</button>
			</div>
		</div>
	</div>
</template>

<style scoped>
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

.tableZoomButton {
	font-weight: 900;
	font-size: 15px;
	margin-left: 5px;
	min-width: 20px;
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

#top {
	background-color: #333;
	color: white;
	padding: 0px;
	width: 100%;
	height: 60px;
	top: 0px;
	z-index: 2;
	position: relative;
	display: flex;
	white-space: nowrap;
	box-sizing: border-box;
	/*overflow-x: auto;*/
}

#menu {
	flex-shrink: 0;
	color: white;
}

#menu a {
	color: white;
}

#menu a:hover,
#menu span:hover {
	color: lightblue;
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

#topRight {
	flex-shrink: 0;
	height: 100%;
	font-size: 14px;
	text-align: center;
	margin-right: 5px;
}

#topInfos {
	display: flex;
	flex-direction: column;
	/* Add this line to change the direction to column */
	justify-content: center;
	align-items: center;
	height: 100%;
	min-width: fit-content;
	overflow-x: auto;
	flex-shrink: 0;
	margin: 0 auto;
}

.menuDivider {
	display: inline-block;
	width: 5px;
	height: 50px;
	background-color: darkgray;
	margin: 0px 10px 0px 10px;
}

/* Only needed to flash tiimer  */
.redText {
	color: red;
}

.turnOrderSpan {
	display: inline-block;
	padding: 5px;
	max-width: 150px;
	overflow: hidden;
	text-overflow: ellipsis;
}

.gameInfoSpan {
	white-space: nowrap;
}

.playerLineDiv {
	white-space: nowrap;
}
</style>
