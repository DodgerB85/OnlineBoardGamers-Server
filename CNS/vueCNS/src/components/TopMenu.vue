<script setup>
import * as IO from "../js/CNS_IO"
import * as WS from "../js/CNSwebsocket"
import * as view from "../js/CNSview"
import * as rf from "../js/CNSreference"
import * as map from "../js/CNSmap"
import * as controller from "../js/CNScontroller"
import * as funcs from "../js/CNSfuncs"
import * as replay from "../js/CNSreplay"

import { useModelStore } from "../stores/CNSstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/CNSpersonal.js"
const personal = usePersonalStore()

function doZoom(dir) {
	let doSave = false
	if (personal.pov >= 0) doSave = true
	store.refSize += dir * 200
	if (store.refSize < 1000) {
		store.refSize = 1000
		doSave = false
	} else if (store.refSize > 4000) {
		store.refSize = 4000
		doSave = false
	} else clearInterval(personal.zoomInterval)
	if (doSave) {
		personal.zoomInterval = setTimeout(function () {
			clearInterval(personal.zoomInterval)
			IO.saveZoom()
		}, 1000)
	}
	map.calculateCanvasSize()
}

function tableZoom() {
	store.topMenuViews.showWholeTable = !store.topMenuViews.showWholeTable
	map.calculateCanvasSize()
	personal.zoomInterval = setTimeout(function () {
		clearInterval(personal.zoomInterval)
		IO.saveZoom()
	}, 1000)
}

function toggleBug() {
	store.topMenuViews.bugErrorText = ""
	store.topMenuViews.bugSuccessText = ""
	store.topMenuViews.showNotes = false
	store.topMenuViews.showBug = !store.topMenuViews.showBug
}

async function toggleReplay() {
	if (!store.topMenuViews.showReplay) {
		store.replayResetData = funcs.exportModel(true) // FIZ
		store.topMenuViews.showReplay = true

		// TURM ON
		await replay.generateReplayData()
	} else {
		// TURN OFF
		store.clearHistoryHelpers()
		store.resetContext(false)
		store.topMenuViews.showReplay = false
		funcs.importModel(store.replayResetData, true)
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
	WS.StartWebSocket().catch(() => {
		console.log("WebSocket background task initialized.")
	})
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
		if (store.topMenuViews.showReplay) {
			store.topMenuViews.rewindErrorText = "Please exit Replay to Rewind"
			return
		}
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
	store.topMenuViews.showReserve = !store.topMenuViews.showReserve
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

			<span v-if="personal.name != undefined" :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showChat }]" id="menuButtonChat" @click="toggleChat">
				<img :src="view.getImage('icon-chat')" />
				<span>Chat</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<span v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showBug }]" id="menuButtonBug" @click="toggleBug">
				<img :src="view.getImage('icon-stop')" />
				<span>Bug</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<!-- IF LOGGED IN -->
			<span v-if="personal.name != undefined" class="topMenuItem" id="menuButtonNext" @click="nextGame">
				<img :src="view.getImage('icon-nextGame')" />
				<span>Next</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<div class="menuDivider"></div>

			<a href="/CNS/help/" target="_blank">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-rulebook')" />
					<span>Rules</span>
				</span>
			</a>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" class="topMenuItem" :class="['topMenuItem', { hasNotes: personal.notes.length > 0 }, { topMenuItemSelected: store.topMenuViews.showNotes }]" id="menuButtonNotes" @click="toggleNotes">
				<img :src="view.getImage('icon-notebook')" />
				<span>Notes</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<span :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showReserve }]" id="menuButtonReserve" @click="toggleReserve">
				<img :src="view.getImage('icon-box')" />
				<span>Reserve</span>
			</span>

			<div class="menuDivider"></div>

			<span :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showHistory }]" id="menuButtonHistory" @click="toggleHistory">
				<img :src="view.getImage('icon-scroll')" />
				<span>History</span>
			</span>

			<span class="topMenuItem" @click="toggleReplay()">
				<img :src="view.getImage('icon-replay')" />
				<span>Replay</span>
			</span>

			<div class="menuDivider"></div>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" id="menuButtonRewindPos" :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showRewindPanel }]" @click="loadRewind()">
				<img :src="view.getImage('icon-rewind')" />
				<span>Rewind</span>
			</span>
			<span v-else class="topMenuBlank"></span>
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
				<button class="tableZoomButton" @click="tableZoom()">🔍{{ store.topMenuViews.showWholeTable ? "Map" : "Table" }}</button>
				<button class="zoomButton" @click="doZoom(1)">🔍+</button>
				<button class="zoomButton" @click="doZoom(-1)">🔍-</button>
			</div>
		</div>

		<div id="topInfos">
			<span>
				<span v-html="store.gameName"></span>
				| {{ store.gameflow.turn }}: {{ view.phaseStr() }}
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
	width: 38px;
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

.redText {
	color: red;
}

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
