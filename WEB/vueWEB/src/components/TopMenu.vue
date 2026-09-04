<script setup>
//import * as WS from '../js/TGZwebsocket'
//import * as view from '../js/WEBview'
/*import * as model from '../js/TGZmodel'*/
import * as rf from "../js/WEBreference"
//import * as map from '../js/WEBmap'
import * as controller from "../js/WEBcontroller"
import * as funcs from '../js/WEBfuncs'
import * as replay from '../js/WEBreplay'
import * as IO from "../backend/WEB_IO"

import { useModelStore } from "../stores/WEBstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/WEBpersonal.js"
const personal = usePersonalStore()

function doZoom(dir) {
	let doSave = false
	if (personal.pov >= 0) doSave = true
	store.refSize += dir * 10
	if (store.refSize < 20) {
		store.refSize = 20
		doSave = false
	} else if (store.refSize > 100) {
		store.refSize = 100
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
	store.gameMessages.bugErrorText = ""
	store.gameMessages.bugSuccessText = ""
	store.viewSettings.showNotes = false
	store.viewSettings.showBug = !store.viewSettings.showBug
}

async function toggleReplay() {
  if (!store.viewSettings.showReplay) {
    store.replayResetData = funcs.simpleExportWholeWEBmodel()
    store.viewSettings.showReplay = true
    await replay.generateReplayData()
  } else {
    store.clearHistoryHighlights()
    store.resetContext()
    store.viewSettings.showReplay = false
    funcs.simpleImportWholeWEBmodel(store.replayResetData, true)
  }
}
function toggleNotes() {
	store.viewSettings.showBug = false
	store.viewSettings.showNotes = !store.viewSettings.showNotes
}
function toggleChat() {
	store.viewSettings.showHistory = false
	document.getElementById("boardContainer").classList.remove("slideRight")
	store.viewSettings.showChat = !store.viewSettings.showChat
	// WS.StartWebSocket()
}

function toggleHistory() {
	store.viewSettings.showChat = false
	store.clearHistoryHighlights()
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
	if (!personal.trainingGame) store.viewSettings.showRewindPanel = !store.viewSettings.showRewindPanel
	else {
		if (store.viewSettings.performingRewind) return
		store.viewSettings.performingRewind = true
		setTimeout(function () {
			IO.loadRewind()
		}, 500)
	}
}

function clickedLoggedInDiv() {
	if (IO.SUPER_USERS.includes(personal.name)) {
		personal.pov++
		if (personal.pov === store.players.length) personal.pov = 0
		store.gameName = String(personal.pov) + "  :  " + store.players[personal.pov].name
		// controller.startPlayerTurn()
	}
	personal.aidText = false
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

function toggleReserve() {
	store.viewSettings.showReserve = !store.viewSettings.showReserve
}
</script>

<template>
	<div id="top">
		<div id="menu">
			<a href="/">
				<span class="topMenuItem">
					<img src="@static/WEB/images/icon-house.svg" />
					<span>Home</span>
				</span>
			</a>

			<span v-if="personal.name != undefined" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showChat }]" id="menuButtonChat" @click="toggleChat">
				<img src="@static/WEB/images/icon-chat.svg" />
				<span>Chat</span>
			</span>

			<span v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showBug }]" id="menuButtonBug" @click="toggleBug">
				<img src="@static/WEB/images/icon-stop.svg" />
				<span>Bug</span>
			</span>

			<!-- IF LOGGED IN -->
			<span v-if="personal.name != undefined" class="topMenuItem" id="menuButtonNext" @click="nextGame">
				<img src="@static/WEB/images/icon-nextGame.svg" />
				<span>Next</span>
			</span>

			<div class="menuDivider"></div>

			<!--<span @click="toggleMapSelect" id="menuButtonMap" class="topMenuItem" :class="{ topMenuItemSelected: store.viewSettings.selectingBoard }">
				<img src="@static/WEB/images/icon-cog.svg" />
				<span>Settings</span>
			</span>-->

			<a href="/WEB/help/" target="_blank">
				<span class="topMenuItem">
					<img src="@static/WEB/images/icon-rulebook.svg" />
					<span>Rules</span>
				</span>
			</a>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" class="topMenuItem" :class="['topMenuItem', { hasNotes: personal.notes.length > 0 }, { topMenuItemSelected: store.viewSettings.showNotes }]" id="menuButtonNotes" @click="toggleNotes">
				<img src="@static/WEB/images/icon-notebook.svg" />
				<span>Notes</span>
			</span>

			<span :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showReserve }]" id="menuButtonReserve" @click="toggleReserve">
				<img src="@static/WEB/images/icon-box.svg" />
				<span>Reserve</span>
			</span>

			<div class="menuDivider"></div>

			<span :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showHistory }]" id="menuButtonHistory" @click="toggleHistory">
				<img src="@static/WEB/images/icon-scroll.svg" />
				<span>History</span>
			</span>

			<span class="topMenuItem" @click="toggleReplay()">
				<img src="@static/WEB/images/icon-replay.svg" />
				<span>Replay</span>
			</span>

			<div class="menuDivider"></div>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showRewindPanel }]" @click="loadRewind()">
				<img src="@static/WEB/images/icon-rewind.svg" />
				<span>Rewind</span>
			</span>
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
				<button class="zoomButton" @click="doZoom(1)">🔍+</button>
				<button class="zoomButton" @click="doZoom(-1)">🔍-</button>
			</div>
		</div>

		<div id="topInfos">
			<span>
				<span v-html="store.gameName"></span>
				| Turn: {{ store.gameflow.turn }}
			</span>
			<span>{{ controller.currentPlayerObj().displayName }}</span>
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
	min-width: 1050px;
	height: 60px;
	top: 0px;
	z-index: 2;
	position: relative;
}

#menu {
	float: left;
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
	float: right;
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
</style>
