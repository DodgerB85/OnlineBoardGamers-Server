<script setup>
import * as IO from "../backend/BUS_IO"
import * as WS from "../backend/BUSwebsocket"
import * as rf from "../js/BUSreference.js"
import * as replay from "../js/BUSreplay"
import * as view from "../js/BUSview.js"
import * as funcs from "../js/BUSfuncs.js"

import { useModelStore } from "../stores/BUSstore.js"
const store = useModelStore()
import * as controller from "../js/BUScontroller.js"

import { usePersonalStore } from "../stores/BUSpersonal.js"
const personal = usePersonalStore()

function doZoom(dir) {
	let doSave = false
	if (personal.pov >= 0) doSave = true
	store.refSize += dir * 10
	if (store.refSize < 60) {
		store.refSize = 60
		doSave = false
	} else if (store.refSize > 200) {
		store.refSize = 200
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
	store.topMenuViews.showBug = !store.topMenuViews.showBug
}
function toggleNotes() {
	store.topMenuViews.showBug = false
	store.topMenuViews.showNotes = !store.topMenuViews.showNotes
}
function toggleChat() {
	store.topMenuViews.showHistory = false
	//store.topMenuViews.showChat = !store.topMenuViews.showChat
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
			//document.getElementById('boardContainer').classList.add('slideRight');
			let b = document.getElementById("footer").getBoundingClientRect().top
			let a = 69
			document.getElementById("history").style["max-height"] = String(parseInt(b - a)) + "px"
			let offsets = document.getElementById("boardContainer").getBoundingClientRect()
			if (offsets.left < 460) document.getElementById("boardContainer").classList.add("slideRight")
		}, 50)
	}
}

function loadRewind() {
	if (!personal.trainingGame) store.topMenuViews.showRewindPanel = !store.topMenuViews.showRewindPanel
	else {
		if (store.performingRewind) return
		store.performingRewind = true
		setTimeout(function () {
			IO.loadRewind()
		}, 500)
	}
}

function clickedLoggedInDiv() {
	if (personal.name === "BotKickStarter") {
		personal.pov++
		if (personal.pov === store.players.length) personal.pov = 0
		store.gameName = personal.pov
		controller.startPlayerTurn()
	}
}

function toggleBoardSelect() {
	store.topMenuViews.selectingBoard = !store.topMenuViews.selectingBoard
}

function getKickoutTImerText() {
	if (personal.secondsToNextKickout < 0) personal.secondsToNextKickout = 0
	let minsToGo = String(Math.floor(personal.secondsToNextKickout / 60))
	let secsToGo = "0" + String(Math.floor(personal.secondsToNextKickout % 60))
	return " " + minsToGo + " : " + secsToGo.slice(-2)
}

function changeBoard(boardNumber) {
	store.performingBoardChange = true
	store.topMenuViews.selectingBoard = false
	setTimeout(function () {
		personal.selectedBoard = boardNumber
		if (boardNumber === 2) store.topMenuViews.displayRightActionSelection = false
		else store.topMenuViews.displayRightActionSelection = true
		IO.saveBoardPreference(boardNumber)
		store.performingBoardChange = false
	}, 500)
}

function getMapBubblePosition(bubble) {
	if (bubble === 0) return String(document.getElementById("menuButtonSelectBoard").getBoundingClientRect().left - 150)
	if (bubble === 1) return String(document.getElementById("menuButtonSelectBoard").getBoundingClientRect().left - 25)
	if (bubble === 2) return String(document.getElementById("menuButtonSelectBoard").getBoundingClientRect().left + 100)
}

function toggleReplay() {
	if (store.topMenuViews.generatingReplay === true) return
	if (!store.topMenuViews.showReplay) {
		store.endReplayResetData = funcs.exportBUSmodel(false, true)
		replay.generateReplayData()
	} else {
		// TURN OFF
		store.clearHistoryHelpers()
		store.topMenuViews.showReplay = false
		funcs.importBUSmodel(store.endReplayResetData, false, true)
		store.replayData.splice(0)
	}
}

function nextGame() {
	window.location.href = window.initData.nextURL
}

function toggleStatsExcludeDropdown() {
	store.topMenuViews.showStatsExcludeDropdown = !store.topMenuViews.showStatsExcludeDropdown
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

			<span :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.selectingBoard }]" id="menuButtonSelectBoard" @click="toggleBoardSelect()">
				<img :src="view.getImage('icon-board')" />
				<span>Board</span>
			</span>

			<a href="/BUS/help/" target="_blank">
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
				Logged in as: {{ personal.name }}
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

			<!-- DROP DOWN FOR SPLOTTER CON-->
			<template v-if="personal.pov > -1 && personal.trainingGame && IO.SPLOTTER_CON_USERS.includes(personal.name)">
				<div id="dropdownContainerSplotterCon">
					<div @click="toggleStatsExcludeDropdown" id="showDropdownSplotterCon">↓ Edit Players / Colours ↓</div>
					<transition name="fade">
						<div id="dropdownSplotterCon" v-if="store.topMenuViews.showStatsExcludeDropdown">
							Change the Player Names / Colours to match the real game
							<br />
							<br />
							<template v-for="(playerIndex, idx) in store.gameflow.fullTurnOrder" :key="idx">
								<div class="splotterConSelectionLineDiv">
									<input type="text" v-model="store.players[playerIndex].displayName" />
									<select v-model="store.players[playerIndex].colour">
										<option :value="rf.BLUE">Blue</option>
										<option :value="rf.GREEN">Green</option>
										<option :value="rf.PURPLE">Purple</option>
										<option :value="rf.RED">Red</option>
										<option :value="rf.YELLOW">Yellow</option>
									</select>
								</div>
							</template>

							<div id="dropdownText">
								Edit the names / colours and then make a move to save
								<br />
								<button @click="IO.saveGame(false)" class="actionsLineButton">Save</button>
							</div>

							<div id="dropdownText">
								<input name="inhibitChatPopup" id="inhibitChatPopup" type="checkbox" v-model="personal.inhibitChatPopup" />
								<label for="inhibitChatPopup">Inhibit Chat Popup</label>
							</div>
						</div>
					</transition>
				</div>
			</template>
		</div>

		<div id="topInfos">
			<span id="infoSpan">
				<span v-html="store.gameName"></span>
				| {{ store.gameflow.turn }}: {{ view.phaseStr() }}
			</span>
			<span>{{ controller.currentPlayerObj().displayName }}</span>
		</div>
	</div>
	<transition name="slideL">
		<div
			class="boardSelectBubbleL"
			@click="changeBoard(1)"
			v-if="store.topMenuViews.selectingBoard"
			:style="{
				left: getMapBubblePosition(0) + 'px',
			}">
			<img class="gameBoardSelectImg" :src="view.getImage('Board_orig')" />
		</div>
	</transition>
	<transition name="slideC">
		<div
			class="boardSelectBubbleC"
			@click="changeBoard(0)"
			v-if="store.topMenuViews.selectingBoard"
			:style="{
				left: getMapBubblePosition(1) + 'px',
			}">
			<img class="gameBoardSelectImg" :src="view.getImage('Board_20A')" />
		</div>
	</transition>
	<transition name="slideR">
		<div
			class="boardSelectBubbleR"
			@click="changeBoard(2)"
			v-if="store.topMenuViews.selectingBoard"
			:style="{
				left: getMapBubblePosition(2) + 'px',
			}">
			<img class="gameBoardSelectImg" :src="view.getImage('Board_20AC')" />
		</div>
	</transition>
</template>

<style scoped>
#infoSpan {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.gameBoardSelectImg {
	width: 100%;
	height: 100%;
	border-radius: 20%;
}

.slideR-leave-active,
.slideR-enter-active {
	transition: 0.5s ease-in-out;
}

.slideR-leave-to,
.slideR-enter-from {
	transform: translate(-100px, -200px);
	opacity: 0;
	/*left: 352px;*/
}

.boardSelectBubbleR {
	position: absolute;
	top: 65px;
	background-color: black;
	width: 100px;
	height: 100px;
	border: 3px solid yellow;
	border-radius: 20%;
	z-index: 1;
}

.slideL-leave-active,
.slideL-enter-active {
	transition: 0.5s ease-in-out;
}

.slideL-leave-to,
.slideL-enter-from {
	transform: translate(100px, -200px);
	opacity: 0;
}

.boardSelectBubbleC {
	position: absolute;
	top: 65px;
	background-color: black;
	width: 100px;
	height: 100px;
	border: 3px solid yellow;
	border-radius: 20%;
	z-index: 1;
}

.slideC-leave-active,
.slideC-enter-active {
	transition: 0.5s ease-in-out;
}

.slideC-leave-to,
.slideC-enter-from {
	transform: translate(0px, -200px);
	opacity: 0;
}

.boardSelectBubbleL {
	position: absolute;
	top: 65px;
	background-color: black;
	width: 100px;
	height: 100px;
	border: 3px solid yellow;
	border-radius: 20%;
	z-index: 1;
}

.boardSelectBubbleL:hover,
.boardSelectBubbleC:hover,
.boardSelectBubbleR:hover {
	border-color: lightgreen;
}

.zoomButton {
	font-weight: bolder;
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
	font-size: 14px;
	text-align: center;
	margin-right: 5px;
}

#topInfos {
	display: flex;
	flex-direction: column; /* Add this line to change the direction to column */
	justify-content: center;
	align-items: center;
	height: 100%;
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

/**Splotter Con */
#dropdownContainerSplotterCon {
	float: right;
	width: fit-content;
	text-align: center;
	margin-top: 1px;
	margin-right: 3px;
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
</style>
