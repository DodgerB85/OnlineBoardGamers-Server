<script setup>
/** Menu bar at the top of the screen
 *
 *
 *
 *
 */

import * as IO from "../backend/AQY_IO"
import * as WS from "../backend/AQYwebsocket"
import * as view from "../js/AQYview"
/*import * as model from '../js/TGZmodel'*/
import * as rf from "../js/AQYreference"
import * as map from "../js/AQYmap"
//import * as city from "../js/AQYcity"
import * as controller from "../js/AQYcontroller"
import * as funcs from "../js/AQYfuncs"
//import * as model from "../js/AQYmodel"
import * as replay from "../js/AQYreplay"
//import * as country from "../js/AQYcountry"

import PlayerLine from "./PlayerLine.vue"

import { useModelStore } from "../stores/AQYstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/AQYpersonal.js"
const personal = usePersonalStore()

function debugButton() {
	//alert(store.mapData.mountainRangeSeedGold)
	//console.log(JSON.stringify(store.players))
	//console.log(JSON.stringify(store.mapData.seed))
	//console.log(JSON.stringify(store.players[0].cities[0].buildings))
	//model.endGame()
	//store.topMenuViews.tradeSuccessText = `Your trade has been sent to <div class="globalPlayerNameDiv"><span class="mainEntryPlayer` + personal.getCorrectedColour(store.players[0].colour) + `">${store.players[0].displayName}</span></div> `;
	//store.famineLevel = 10
	//store.context.gravesLeftToPlace = 3
	//store.context.gravesLeftToRemove = 2
	//store.context.action = rf.ACT_HOSPITAL_GRAVES
	//console.log(JSON.stringify(funcs.exportModel(false, false)))
	//store.famineLevel = 9
	//store.famineLevel = 0
	//store.context.pollutionLeftToPlace = 5
	//console.log(JSON.stringify(store.players[0].countrysideBuildings, null, 2))
	//IO.saveGame(false, false)
	//alert(JSON.stringify(store.gameflow))
	//store.players[1].availableResources= [6, 10, 10, 10, 10, 10, 10, 10, 10, 10]
	store.players[1].saint = rf.SAINT_GIORGIO
	IO.saveGame(false, false)
}

function cheatStart() {
	/*store.clearVars()

	// THIS SETS UP 4p WITH CITIES IN THE 2p PLAY AREA
	// EASIEST JUST TO KEEP EVERYTHING IN THE 2P AREA
	// IN CASE YOU'RE WORKING WITH JUST 2 PLAYERS
	city.createNewCity_core(0, { q: 0, r: -2, s: 2 })
	city.createNewCity_core(1, { q: 0, r: 0, s: 0 })
	if (store.players.length >= 3) city.createNewCity_core(2, { q: 0, r: 2, s: -2 })
	if (store.players.length >= 4) city.createNewCity_core(3, { q: 0, r: 4, s: -4 })
	// Add resources
	let resArr = store.players[0].availableResources
	for (let i = 0; i < resArr.length; i++) resArr[i]++
	for (let i = 0; i < resArr.length; i++) resArr[i]++
	resArr[rf.RES_FISH]++
	// Add buildings
	city.addBuildingToCity(0, 0, 7, rf.BLDG_CART, 2, true, false)
	city.addBuildingToCity(0, 0, 4, rf.BLDG_CART, 0, true, false)
	city.addBuildingToCity(0, 0, 6, rf.BLDG_CART, 0, true, false)
	city.addBuildingToCity(0, 0, 8, rf.BLDG_CART, 0, true, false)
	city.addBuildingToCity(0, 0, 16, rf.BLDG_EXPLORER, 0, true, false)
	city.addBuildingToCity(0, 0, 30, rf.BLDG_BIOLOGY, 0, true, false)

	// Man buildings
	for (let i = 0; i < store.players[0].cities[0].buildings.length; i++) {
		store.players[0].cities[0].buildings[i].manned = true
	}

	// Set the phase
	store.gameflow.phase = rf.PHASE_CITY_BUILDING
	store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS

	//store.gameflow.phase = rf.PHASE_COUNTRYSIDE_BUILDING

	//store.gameflow.phase = rf.PHASE_EXPLORE

	controller.startPlayerTurn()

	// IMPORT SPECIFIC DATA HERE
	/*let data = 

"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"

	funcs.simpleImportWholeModel(data)
	controller.startPlayerTurn()*/
	/*store.refSize = 160
	alert(store.players[2].name)*/
	//store.context.hexesToHighlight.push(map.getHexDataFromID(96))
	/*let nebs = store.mapNeighbours[177]
	for (let i=0; i<nebs.length; i++) {
		alert(nebs[i])
		country.hexOccupied(nebs[i])
	}*/
	//country.hexOccupied(182)
	//map.generateMap()
	//console.log((JSON.stringify(store.mapData.seed)))
	store.famineLevel = 0
	store.context.pollutionLeftToPlace = 5
	//store.permanentSettings.showPollutionUnderRes = !store.permanentSettings.showPollutionUnderRes

	//personal.trainingGame = false
	//personal.pov = 1
}

function doZoom(dir) {
	let doSave = false
	if (personal.pov >= 0) doSave = true
	store.refSize += dir * 20
	if (store.refSize < 40) {
		store.refSize = 40
		doSave = false
	} else if (store.refSize > 500) {
		store.refSize = 500
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

function toggleBug() {
	store.topMenuViews.bugErrorText = ""
	store.topMenuViews.bugSuccessText = ""
	store.topMenuViews.showNotes = false
	store.topMenuViews.showBug = !store.topMenuViews.showBug
}

async function toggleReplay() {
	if (!store.topMenuViews.showReplay) {
		store.replayResetData = funcs.simpleExportWholeModel()
		store.topMenuViews.showReplay = true

		// TURM ON
		await replay.generateReplayData()
	} else {
		// TURN OFF
		store.clearHistoryHelpers()
		store.clearVars(false)
		store.topMenuViews.showReplay = false
		funcs.simpleImportWholeModel(store.replayResetData)
	}
}
function toggleNotes() {
	store.topMenuViews.showBug = false
	store.topMenuViews.showNotes = !store.topMenuViews.showNotes
	if (!store.topMenuViews.showNotes) store.topMenuViews.showNoteHexIDs = false
}
function toggleChat() {
	store.topMenuViews.showHistory = false
	document.getElementById("boardContainer").classList.remove("slideRight")
	store.topMenuViews.showChat = !store.topMenuViews.showChat
	WS.StartWebSocket()
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
			// REMOVE BELOW LINE
			//store.topMenuViews.performingRewind = false
		}, 500)
	}
}

function clickedLoggedInDiv() {
	if (IO.DEBUG_USERS.includes(personal.name)) {
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
	store.topMenuViews.showReserve = !store.topMenuViews.showReserve
}

function getCurrentPlayerNames() {
	if (!controller.isSimulPhase(store.gameflow.phase)) return controller.currentPlayerObj().displayName
	let res = []
	for (let i = 0; i < store.gameflow.turnOrder.length; i++) res.push(store.players[store.gameflow.turnOrder[i]].displayName)
	return res.join(", ")
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

			<a href="/AQY/help/" target="_blank">
				<span class="topMenuItem">
					<img :src="view.getImage('icon-rulebook')" />
					<span>Rules</span>
				</span>
			</a>

			<span :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showReserve }]" id="menuButtonReserve" @click="toggleReserve">
				<img :src="view.getImage('icon-info')" />
				<span>Info</span>
			</span>
			<div class="menuDivider"></div>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" id="menuButtonRewindPos" :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showRewindPanel }]" @click="loadRewind()">
				<img :src="view.getImage('icon-rewind')" />
				<span>Rewind</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<br />

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

			<div class="menuDivider"></div>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" class="topMenuItem" :class="['topMenuItem', { hasNotes: personal.notes.length > 0 }, { topMenuItemSelected: store.topMenuViews.showNotes }]" id="menuButtonNotes" @click="toggleNotes">
				<img :src="view.getImage('icon-notebook')" />
				<span>Notes</span>
			</span>
			<span v-else class="topMenuBlank"></span>

			<span :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showHistory }]" id="menuButtonHistory" @click="toggleHistory">
				<img :src="view.getImage('icon-scroll')" />
				<span>History</span>
			</span>

			<div class="menuDivider"></div>

			<span class="topMenuItem" @click="toggleReplay()">
				<img :src="view.getImage('icon-replay')" />
				<span>Replay</span>
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
				<br />
				<button v-if="IO.DEBUG_USERS.includes(personal.name)" @click="cheatStart" class="actionsLineButton">CHEAT START</button>
				<button v-if="IO.DEBUG_USERS.includes(personal.name)" @click="debugButton" class="actionsLineButton">DEBUG</button>
			</div>
		</div>

		<div id="topInfos">
			<div class="infoSpanDiv">
				<span id="infoSpan">
					<span v-html="store.gameName"></span>
					| {{ store.gameflow.turn }}{{ view.phaseStr() }}
					<span v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER">| {{ getCurrentPlayerNames() }}</span>
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

#top {
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
	font-weight: bolder;
	color: red;
}

.menuDivider {
	display: inline-block;
	width: 5px;
	height: 50px;
	background-color: darkgray;
	margin: 0px 10px 0px 10px;
}
</style>
