<script setup>
import * as IO from "../BUS_IO"
import * as WS from "../BUSwebsocket"
import * as constants from "../constants"
import * as replay from "../BUSreplay"
import * as view from "../js/BUSview.js"

import { useModelStore } from "../stores/model.js"
const model = useModelStore()

import { usePersonalStore } from "../stores/personal.js"
const personal = usePersonalStore()

function doZoom(dir) {
	let doSave = false
	if (personal.pov >= 0) doSave = true
	model.refSize += dir * 10
	if (model.refSize < 60) {
		model.refSize = 60
		doSave = false
	} else if (model.refSize > 200) {
		model.refSize = 200
		doSave = false
	} else clearInterval(personal.zoomInterval)
	if (doSave) {
		personal.zoomInterval = setTimeout(function () {
			clearInterval(personal.zoomInterval)
			IO.saveZoom(model.refSize)
		}, 1000)
	}
}

function toggleBug() {
	model.topMenuViews.showNotes = false
	model.topMenuViews.showBug = !model.topMenuViews.showBug
}
function toggleNotes() {
	model.topMenuViews.showBug = false
	model.topMenuViews.showNotes = !model.topMenuViews.showNotes
}
function toggleChat() {
	model.topMenuViews.showHistory = false
	//model.topMenuViews.showChat = !model.topMenuViews.showChat
	if (model.topMenuViews.showChat) model.topMenuViews.showChat = false
	else {
		model.topMenuViews.showChat = true
		setTimeout(function () {
			var b = document.getElementById("footer").getBoundingClientRect().top
			var a = 130
			document.getElementById("wholeChat").style["max-height"] = String(parseInt(b - a)) + "px"
		}, 50)
	}

	WS.StartWebSocket()
}

function toggleHistory() {
	model.topMenuViews.showChat = false
	model.clearHistoryHelpers()
	if (model.topMenuViews.showHistory) {
		model.topMenuViews.showHistory = false
		document.getElementById("boardContainer").classList.remove("slideRight")
	} else {
		model.topMenuViews.showHistory = true
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
	if (!personal.trainingGame) model.topMenuViews.showRewindPanel = !model.topMenuViews.showRewindPanel
	else {
		if (model.performingRewind) return
		model.performingRewind = true
		setTimeout(function () {
			IO.loadRewind()
		}, 500)
	}
}

function clickedLoggedInDiv() {
	if (personal.name === "BotKickStarter") {
		personal.pov++
		if (personal.pov === model.players.length) personal.pov = 0
		model.gameName = personal.pov
		model.startPlayerTurn()
	}
}

function toggleBoardSelect() {
	model.topMenuViews.selectingBoard = !model.topMenuViews.selectingBoard
}

function getKickoutTImerText() {
	if (personal.secondsToNextKickout < 0) personal.secondsToNextKickout = 0
	let minsToGo = String(Math.floor(personal.secondsToNextKickout / 60))
	let secsToGo = "0" + String(Math.floor(personal.secondsToNextKickout % 60))
	return " " + minsToGo + " : " + secsToGo.slice(-2)
}

function changeBoard(boardNumber) {
	model.performingBoardChange = true
	model.topMenuViews.selectingBoard = false
	setTimeout(function () {
		personal.selectedBoard = boardNumber
		if (boardNumber === 2) model.topMenuViews.displayRightActionSelection = false
		else model.topMenuViews.displayRightActionSelection = true
		IO.saveBoardPreference(boardNumber)
		model.performingBoardChange = false
	}, 500)
}

function getMapBubblePosition(bubble) {
	if (bubble === 0) return String(document.getElementById("menuButtonSelectBoard").getBoundingClientRect().left - 150)
	if (bubble === 1) return String(document.getElementById("menuButtonSelectBoard").getBoundingClientRect().left - 25)
	if (bubble === 2) return String(document.getElementById("menuButtonSelectBoard").getBoundingClientRect().left + 100)
}

function toggleReplay() {
	if (model.topMenuViews.generatingReplay === true) return
	if (!model.topMenuViews.showReplay) {
		model.endReplayResetData = model.exportModel(true)
		replay.generateReplayData()
	} else {
		// TURN OFF
		model.clearHistoryHelpers()
		model.topMenuViews.showReplay = false
		model.importModel(model.endReplayResetData, true)
		model.replayData.splice(0)
	}
}

function nextGame() {
	window.location.href = window.initData.nextURL
}

function toggleStatsExcludeDropdown() {
	model.topMenuViews.showStatsExcludeDropdown = !model.topMenuViews.showStatsExcludeDropdown
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

			<span v-if="personal.name != undefined" :class="['topMenuItem', { topMenuItemSelected: model.topMenuViews.showChat }]" id="menuButtonChat" @click="toggleChat">
				<img :src="view.getImage('icon-chat')" />
				<span>Chat</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<span v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: model.topMenuViews.showBug }]" id="menuButtonBug" @click="toggleBug">
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

			<span :class="['topMenuItem', { topMenuItemSelected: model.topMenuViews.selectingBoard }]" id="menuButtonSelectBoard" @click="toggleBoardSelect()">
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
			<span v-if="personal.pov >= 0" class="topMenuItem" :class="['topMenuItem', { hasNotes: personal.notes.length > 0 }, { topMenuItemSelected: model.topMenuViews.showNotes }]" id="menuButtonNotes" @click="toggleNotes">
				<img :src="view.getImage('icon-notebook')" />
				<span>Notes</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<div class="menuDivider"></div>

			<span :class="['topMenuItem', { topMenuItemSelected: model.topMenuViews.showHistory }]" id="menuButtonHistory" @click="toggleHistory">
				<img :src="view.getImage('icon-scroll')" />
				<span>History</span>
			</span>

			<span class="topMenuItem" @click="toggleReplay()">
				<img :src="view.getImage('icon-replay')" />
				<span>Replay</span>
			</span>

			<div class="menuDivider"></div>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" id="menuButtonRewindPos" :class="['topMenuItem', { topMenuItemSelected: model.topMenuViews.showRewindPanel }]" @click="loadRewind()">
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

				<template v-if="personal.pov >= 0 && !personal.trainingGame && personal.secondsToNextKickout <= 1200 && model.gameflow.phase !== constants.PHASE_GAME_OVER">
					<span id="kickoutTimerSpan">
						Time to next kickout:
						<span id="kickoutTimerTimer">{{ getKickoutTImerText() }}</span>
					</span>
				</template>
			</div>

			<div id="zoomDiv">
				<label id="zoomLabel">Zoom</label>
				<input class="zoomButton" type="button" value="+" @click="doZoom(1)" />
				<input class="zoomButton" type="button" value="-" @click="doZoom(-1)" />
			</div>

			<!-- DROP DOWN FOR SPLOTTER CON-->
			<template v-if="personal.pov > -1 && personal.trainingGame && IO.SPLOTTER_CON_USERS.includes(personal.name)">
				<div id="dropdownContainerSplotterCon">
					<div @click="toggleStatsExcludeDropdown" id="showDropdownSplotterCon">↓ Edit Players / Colours ↓</div>
					<transition name="fade">
						<div id="dropdownSplotterCon" v-if="model.topMenuViews.showStatsExcludeDropdown">
							Change the Player Names / Colours to match the real game
							<br />
							<br />
							<template v-for="(playerIndex, idx) in model.gameflow.fullTurnOrder" :key="idx">
								<div class="splotterConSelectionLineDiv">
									<input type="text" v-model="model.players[playerIndex].displayName" />
									<select v-model="model.players[playerIndex].colour">
										<option :value="constants.BLUE">Blue</option>
										<option :value="constants.GREEN">Green</option>
										<option :value="constants.PURPLE">Purple</option>
										<option :value="constants.RED">Red</option>
										<option :value="constants.YELLOW">Yellow</option>
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
				<span v-html="model.gameName"></span>
				| {{ model.gameflow.turn }}: {{ model.phaseStr() }}
			</span>
			<span>{{ model.currentPlayer().displayName }}</span>
		</div>
	</div>
	<transition name="slideL">
		<div
			class="boardSelectBubbleL"
			@click="changeBoard(1)"
			v-if="model.topMenuViews.selectingBoard"
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
			v-if="model.topMenuViews.selectingBoard"
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
			v-if="model.topMenuViews.selectingBoard"
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
