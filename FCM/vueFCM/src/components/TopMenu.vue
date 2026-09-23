<script setup>
/** Menu bar at the top of the screen
 *
 *
 *
 *
 */

import * as IO from "../backend/FCM_IO"
//import * as WS from "../backend/FCMwebsocket"
import * as view from "../js/FCMview"
import * as rf from "../js/FCMreference"
import * as controller from "../js/FCMcontroller"
import * as funcs from "../js/FCMfuncs"
//import * as model from "../js/FCMmodel"
import * as replay from "../js/FCMreplay"

import PlayerLine from "./PlayerLine.vue"

import { useModelStore } from "../stores/FCMstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/FCMpersonal.js"
import { computed } from "vue"
const personal = usePersonalStore()

function testButton() {
	for (let i = 0; i < 10; i++) store.highlights.indexesToHighlightYellow.push(i + 2580)
}

function debugButton() {
	controller.currentPlayerObj().beach.push(rf.SENIOR_VICE_PRESIDENT)
	controller.currentPlayerObj().beach.push(rf.SENIOR_VICE_PRESIDENT)
	controller.currentPlayerObj().beach.push(rf.SENIOR_VICE_PRESIDENT)
	controller.currentPlayerObj().beach.push(rf.WAITRESS)
	controller.currentPlayerObj().beach.push(rf.TRAINER)
	controller.currentPlayerObj().beach.push(rf.COACH)
	controller.currentPlayerObj().beach.push(rf.GURU)
	controller.currentPlayerObj().beach.push(rf.HR_DIRECTOR)
	controller.currentPlayerObj().beach.push(rf.KITCHEN_TRAINEE)
	controller.currentPlayerObj().beach.push(rf.ERRAND_BOY)
	controller.currentPlayerObj().beach.push(rf.PIZZA_COOK)
	controller.currentPlayerObj().beach.push(rf.NEW_BUSINESS_DEVELOPER)
	controller.currentPlayerObj().beach.push(rf.NEW_BUSINESS_DEVELOPER)
	controller.currentPlayerObj().beach.push(rf.LOCAL_MANAGER)
	rf.sortEmployees(controller.currentPlayerObj().beach)
}

function doZoom(dir, doSave = true) {
	if (personal.pov < 0) doSave = false
	if (store.refSize === 240 && dir > 0) {
		doSave = false
	} else if (store.refSize === 100 && dir < 0) {
		doSave = false
	} else {
		clearInterval(personal.zoomInterval)
		if (Math.abs(dir) < 2) store.refSize += 20 * dir
		else store.refSize = dir
		if (store.refSize < 100) {
			store.refSize = 100
		}
		if (store.refSize > 240) {
			store.refSize = 240
		}
	}
	if (doSave) {
		personal.zoomInterval = setTimeout(function () {
			clearInterval(personal.zoomInterval)
			IO.saveZoom(store.refSize)
		}, 500)
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
		store.replayResetData = funcs.simpleExportWholeFCMmodel()
		store.viewSettings.showReplay = true

		// TURM ON
		await replay.generateReplayData()
	} else {
		// TURN OFF
		store.clearHistoryHelpers()
		store.viewSettings.showReplay = false
		funcs.simpleImportWholeFCMmodel(store.replayResetData)
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
	store.clearCoffeeHistoryInfo()
	document.getElementById("boardContainer").classList.remove("slideRight")
	store.viewSettings.showChat = !store.viewSettings.showChat
}

function toggleHistory() {
	store.viewSettings.showChat = false
	store.clearHistoryHelpers()
	if (store.viewSettings.showHistory) {
		store.viewSettings.showHistory = false
		store.clearCoffeeHistoryInfo()
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
	if (!store.viewSettings.showReserve) store.viewSettings.showingPlayerIndex = -1
	store.viewSettings.showReserve = !store.viewSettings.showReserve
}

const topDivMinWidth = computed(() => {
	const p = store.players.length
	if (p <= 4) return 1050
	if (p === 5) return 1250
	return 1450
})

function getCurrentPlayerNames() {
	if (!controller.isSimulPhase(store.gameflow.phase)) {
		let obj = controller.currentPlayerObj()
		return obj ? obj.displayName : ""
	}
	let res = []
	for (let i = 0; i < store.gameflow.turnOrder.length; i++) {
		let player = store.players[store.gameflow.turnOrder[i]]
		if (player) res.push(player.displayName)
	}
	return res.join(", ")
}
</script>

<template>
	<div id="topDiv" :style="{ minWidth: topDivMinWidth + 'px' }">
		<div id="menuDiv">
			<a href="/">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-house')" />
					<span>{{ $t('topMenu.home') }}</span>
				</span>
			</a>
			<!-- IF LOGGED IN -->
			<span v-if="personal.name" class="topMenuItem" id="menuButtonNext" @click="nextGame">
				<img :src="view.getImage('icon-nextGame')" />
				<span>{{ $t('topMenu.next') }}</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<div class="menuDivider"></div>

			<a href="/FCM/help/" target="_blank">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-rulebook')" />
					<span>{{ $t('topMenu.rules') }}</span>
				</span>
			</a>

			<span :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showReserve }]" id="menuButtonReserve" @click="toggleReserve">
				<img :src="view.getImage('icon-box')" />
				<span>{{ $t('topMenu.reserve') }}</span>
			</span>
			<div class="menuDivider"></div>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" id="menuButtonRewindPos" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showRewindPanel }]" @click="loadRewind()">
				<img :src="view.getImage('icon-rewind')" />
				<span>{{ $t('topMenu.rewind') }}</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<br />

			<span v-if="personal.name" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showChat }]" id="menuButtonChat" @click="toggleChat">
				<img :src="view.getImage('icon-chat')" />
				<span>{{ $t('topMenu.chat') }}</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<span v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showBug }]" id="menuButtonBug" @click="toggleBug">
				<img :src="view.getImage('icon-stop')" />
				<span>{{ $t('topMenu.bug') }}</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<div class="menuDivider"></div>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" class="topMenuItem" :class="['topMenuItem', { hasNotes: personal.notes.length > 0 }, { topMenuItemSelected: store.viewSettings.showNotes }]" id="menuButtonNotes" @click="toggleNotes">
				<img :src="view.getImage('icon-notebook')" />
				<span>{{ $t('topMenu.notes') }}</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<span :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showHistory }]" id="menuButtonHistory" @click="toggleHistory">
				<img :src="view.getImage('icon-scroll')" />
				<span>{{ $t('topMenu.history') }}</span>
			</span>

			<div class="menuDivider"></div>

			<span class="topMenuItem" @click="toggleReplay()">
				<img :src="view.getImage('icon-replay')" />
				<span>{{ $t('topMenu.replay') }}</span>
			</span>
		</div>

		<div id="topRight">
			<div id="loggedInDiv" v-if="personal.name" @click="clickedLoggedInDiv()">
				{{ personal.name }}
				<div id="WSstatus" v-if="personal.pov >= 0" :class="personal.WSstatus"></div>
				<br />

				<template v-if="personal.pov >= 0 && !personal.trainingGame && personal.secondsToNextKickout <= 1200 && store.gameflow.phase !== rf.PHASE_GAME_OVER">
					<span id="kickoutTimerSpan">
						{{ $t('topMenu.timeToNextKickout') }}
						<span id="kickoutTimerTimer">{{ getKickoutTImerText() }}</span>
					</span>
				</template>
			</div>

			<div id="zoomDiv">
				<button class="zoomButton" @click="doZoom(1)">🔍+</button>
				<button class="zoomButton" @click="doZoom(-1)">🔍-</button>
				<br />
				<button v-if="rf.DEBUG_USERS.includes(personal.name)" @click="testButton" class="actionsLineButton">Test</button>
				<button v-if="rf.DEBUG_USERS.includes(personal.name)" @click="debugButton" class="actionsLineButton">DEBUG</button>
			</div>
		</div>

		<div id="topInfos">
			<div class="infoSpanDiv">
				<span id="infoSpan">
					<span id="bankIcon" :class="{ bankBroken: store.bankBroken !== 0 }">🏦</span>
					<span>{{ $t('topMenu.bank', { bank: store.bank }) }}</span>
					&nbsp;|&nbsp;
					<span class="gameNameSpan" v-html="store.gameName"></span>
					&nbsp;|&nbsp; {{ store.gameflow.turn }}: {{ view.phaseStr(store.gameflow.phase) }}
					<span v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER">&nbsp;|&nbsp; {{ getCurrentPlayerNames() }}</span>
				</span>
			</div>
			<div id="playerLineDiv">
				<PlayerLine />
			</div>
		</div>
	</div>
</template>

<style scoped>
.infoSpanDiv {
	display: flex;
	justify-content: center;
	line-height: 16px;
	margin-bottom: 2px;
	margin-top: 2px;
	white-space: nowrap;
	overflow: hidden;
}
#infoSpan {
	display: flex;
	white-space: nowrap;
	min-width: 0;
	overflow: hidden;
}
.gameNameSpan {
	min-width: 0;
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

#topDiv {
	background-color: #333;
	color: white;
	padding: 0px;
	width: 100%;
	min-width: 1050px;
	height: 120px;
	top: 0px;
	z-index: 2;
	position: relative;
	display: inline-block;
}

#menuDiv {
	float: left;
	color: white;
}

#menuDiv a {
	color: white;
}

#menuDiv a:hover,
#menuDiv span:hover {
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

.topMenuBlank {
	display: inline-block;
	width: 62px;
	height: 55px;
	border: #eee;
	border-radius: 5px;
	margin-left: 0px;
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
	display: inline;
	/*display: flex;*/
	/*flex-direction: column;
    /* Add this line to change the direction to column */
	/*justify-content: center;
    align-items: center;
    height: 100%;*/
}

.redText {
	color: red;
}

.menuDivider {
	display: inline-block;
	width: 5px;
	height: 50px;
	background-color: darkgray;
	margin: 0px 10px 0px 10px;
}

/* Bank icon styling */
#bankIcon {
	font-size: 1.2em;
	margin-right: 5px;
	vertical-align: baseline;
	transition: all 0.3s ease;
	position: relative;
	display: inline-block;
}

#bankIcon:hover {
	transform: translateY(-2px) scale(1.1);
	cursor: help;
}

/* Red cross overlay for broken bank */
#bankIcon.bankBroken:after {
	content: "❌";
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	font-size: 0.8em;
	color: red;
	text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}
</style>
