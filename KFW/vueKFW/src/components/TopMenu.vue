<script setup>
import * as IO from "../backend/KFW_IO"
import * as view from "../js/KFWview"
import * as rf from "../js/KFWreference"
import * as controller from "../js/KFWcontroller"
import * as model from "../js/KFWmodel"
//import * as replay from "../js/KFWreplay"
import * as funcs from "../js/KFWfuncs"
import * as map from "../js/KFWmap"
//import * as village from "../js/KFWvillage"

import { useModelStore } from "../stores/KFWstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/KFWpersonal.js"
const personal = usePersonalStore()

function doZoom(dir) {
	for (let i = 0; i < store.players.length; i++) {
		store.players[i].knownHiddenMeeples = [1, 2, 3, 4, 3]
		store.players[i].knownHiddenSkillTiles = [2, 2, 3, 1]
	}
	//store.hiddenInformationKnowledge = 3

	let doSave = false
	if (personal.pov >= 0) doSave = true
	store.refSize += dir * 100
	//store.mapData.selectedMapData.viewSettings.resRefSize += dir  /4
	if (store.refSize < store.mapData.selectedMapData.zoomSettings[0]) {
		store.refSize = store.mapData.selectedMapData.zoomSettings[0]
		doSave = false
	} else if (store.refSize > store.mapData.selectedMapData.zoomSettings[1]) {
		store.refSize = store.mapData.selectedMapData.zoomSettings[1]
		doSave = false
	} else clearInterval(personal.zoomInterval)
	/*let oldResRefSize = store.mapData.selectedMapData.viewSettings.resRefSize
    store.mapData.selectedMapData.viewSettings.resRefSize  = store.refSize / 100 * 1.5*/

	if (doSave) {
		personal.zoomInterval = setTimeout(function () {
			clearInterval(personal.zoomInterval)
			IO.saveZoom(store.refSize)
		}, 1000)
	}
	//map.calculateCanvasSize()
}

function toggleBug() {
	store.gameMessages.bugErrorText = ""
	store.gameMessages.bugSuccessText = ""
	store.viewSettings.showNotes = false
	store.viewSettings.showBug = !store.viewSettings.showBug
}

/*async function toggleReplay() {
	if (!store.viewSettings.showReplay) {
		if (store.hiddenMoney) {
			store.gameMessages.errorText = "You cannot view a replay during a hidden money game"
			return
		}
		store.replayResetData = funcs.simpleExportWholeKFWmodel()
		store.viewSettings.showReplay = true

		// TURM ON
		await replay.generateReplayData()
	} else {
		// TURN OFF
		store.clearHistoryHelpers()
		store.clearVars()
		store.viewSettings.showReplay = false
		funcs.simpleImportWholeKFWmodel(store.replayResetData, true)
	}
}*/

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
	store.turnStartHighlights.bidAreas.splice(0)
	store.turnStartHighlights.actionAreas.splice(0)
	if (!personal.trainingGame) store.viewSettings.showRewindPanel = !store.viewSettings.showRewindPanel
	else {
		if (store.viewSettings.showReplay) return
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
		store.gameName = `POC: ${String(personal.pov)}  :  ${store.players[personal.pov].name}, currentTO: ${store.gameflow.turnOrder}, FullTO: ${store.gameflow.fullTurnOrder}` 
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
	if (store.viewSettings.showReserve) {
		store.viewSettings.showReserve = false
		store.context.selectedReserveEraCard = -1
		store.clearHistoryHelpers()
	} else store.viewSettings.showReserve = true
}

function cheatTiles() {
	const SEASON_TILES = rf.ALL_TILES.filter((tile) => tile.season === store.gameflow.season)
	/*let BOAT_TILES = JSON.parse(JSON.stringify(rf.ALL_TILES))
	BOAT_TILES = BOAT_TILES.filter((tile) => tile.season === rf.SEASON_BOAT_TILE)
	controller.currentPlayerObj().pendingVillageTiles.splice(0)
	for (let i = 0; i < BOAT_TILES.length; i++) {
		BOAT_TILES[i].upgraded = 1
		controller.currentPlayerObj().pendingVillageTiles.push(JSON.parse(JSON.stringify(BOAT_TILES[i])))
	}
	controller.currentPlayerObj().pendingVillageTiles.pop()


	return */
	//Use spring tiles according to player count. Start with min 6 tiles
	store.availableTiles.splice(0)
	store.availableTiles = SEASON_TILES
	// In summer, check for boat tiles and set random side
	if (store.gameflow.season === rf.SUMMER) {
		for (let i = 0; i < store.availableTiles.length; i++) {
			if (rf.TILE_SUMMER_BOATS.includes(store.availableTiles[i].tileID[1])) {
				store.availableTiles[i].upgraded = Math.floor(Math.random() * 2)
				//store.availableTiles[i].upgraded = 1
			}
		}
	}

	// Upgrade all the tiles for testing
	for (let i = 0; i < store.availableTiles.length; i++) {
		if (!rf.TILE_SUMMER_BOATS.includes(store.availableTiles[i].tileID[0])) store.availableTiles[i].upgraded = 0
		else store.availableTiles[i].upgraded = 1
	}
}

function cheatStart() {
	store.clearContext()
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
	//controller.endPlayerTurn()
	store.gameflow.phase = rf.PHASE_VILLAGE_EXPANDING

	let tile = rf.ALL_TILES.find((tile) => tile.id === 5)
	/*store.players[store.gameflow.turnOrder[0]].pendingVillageTiles.push(JSON.parse(JSON.stringify(tile)))
	store.players[store.gameflow.turnOrder[1]].pendingVillageTiles.push(JSON.parse(JSON.stringify(tile)))
	store.players[store.gameflow.turnOrder[2]].pendingVillageTiles.push(JSON.parse(JSON.stringify(tile)))*/
	//store.players[controller.currentPlayerIndex()].pendingVillageTiles.push(JSON.parse(JSON.stringify(tile)))

	tile = rf.ALL_TILES.find((tile) => tile.id === 6)
	/*store.players[store.gameflow.turnOrder[0]].pendingVillageTiles.push(JSON.parse(JSON.stringify(tile)))
	store.players[store.gameflow.turnOrder[1]].pendingVillageTiles.push(JSON.parse(JSON.stringify(tile)))
	store.players[store.gameflow.turnOrder[2]].pendingVillageTiles.push(JSON.parse(JSON.stringify(tile)))*/
	//store.players[controller.currentPlayerIndex()].pendingVillageTiles.push(JSON.parse(JSON.stringify(tile)))

	tile = rf.ALL_TILES.find((tile) => tile.id === 7)
	/*store.players[store.gameflow.turnOrder[0]].pendingVillageTiles.push(JSON.parse(JSON.stringify(tile)))
	store.players[store.gameflow.turnOrder[1]].pendingVillageTiles.push(JSON.parse(JSON.stringify(tile)))
	store.players[store.gameflow.turnOrder[2]].pendingVillageTiles.push(JSON.parse(JSON.stringify(tile)))*/
	//store.players[controller.currentPlayerIndex()].pendingVillageTiles.push(JSON.parse(JSON.stringify(tile)))

	let newTile1 = rf.ALL_TILES.find((tile) => tile.id === 3)
	let newTile2 = rf.ALL_TILES.find((tile) => tile.id === 4)
	let newTile3 = rf.ALL_TILES.find((tile) => tile.id === 5)
	let newTile4 = rf.ALL_TILES.find((tile) => tile.id === 6)
	let newTile5 = rf.ALL_TILES.find((tile) => tile.id === 7)
	let newTile6 = rf.ALL_TILES.find((tile) => tile.id === 8)
	let newTile7 = rf.ALL_TILES.find((tile) => tile.id === 9)
	let newTile8 = rf.ALL_TILES.find((tile) => tile.id === 10)
	let newTile9 = rf.ALL_TILES.find((tile) => tile.id === 11)

	let boat1a = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID[0] === rf.TILE_SUMMER_BOAT1_A)))
	let boat1b = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID[1] === rf.TILE_SUMMER_BOAT1_B)))
	let boat2a = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID[0] === rf.TILE_SUMMER_BOAT2_A)))
	let boat2b = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID[1] === rf.TILE_SUMMER_BOAT2_B)))
	let boat3a = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID[0] === rf.TILE_SUMMER_BOAT3_A)))
	let boat3b = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID[1] === rf.TILE_SUMMER_BOAT3_B)))
	let boat4a = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID[0] === rf.TILE_SUMMER_BOAT4_A)))
	let boat4b = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID[1] === rf.TILE_SUMMER_BOAT4_B)))
	/*let boat5a = rf.ALL_TILES.find((tile) => tile.tileID[0] === rf.TILE_SUMMER_BOAT5_A)
	let boat5b = rf.ALL_TILES.find((tile) => tile.tileID[1] === rf.TILE_SUMMER_BOAT5_B)

	let boat6a = rf.ALL_TILES.find((tile) => tile.tileID[0] === rf.TILE_SUMMER_BOAT6_A)
	let boat6b = rf.ALL_TILES.find((tile) => tile.tileID[1] === rf.TILE_SUMMER_BOAT6_B)*/
	let boat7a = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID[0] === rf.TILE_SUMMER_BOAT7_A)))
	let boat7b = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID[1] === rf.TILE_SUMMER_BOAT7_B)))

	boat1b.upgraded = 1
	boat2b.upgraded = 1
	boat3b.upgraded = 1
	boat4b.upgraded = 1
	boat7b.upgraded = 0

	model.rotateTileMultipleTimes(boat1a, 1, 1)
	model.rotateTileMultipleTimes(boat1b, 1, 1)
	model.rotateTileMultipleTimes(boat2a, 1, 1)
	model.rotateTileMultipleTimes(boat2b, 1, 1)
	model.rotateTileMultipleTimes(boat3a, 1, 1)
	model.rotateTileMultipleTimes(boat3b, 1, 1)
	model.rotateTileMultipleTimes(boat4a, 1, 1)
	model.rotateTileMultipleTimes(boat4b, 1, 1)
	model.rotateTileMultipleTimes(boat7a, 1, 1)
	model.rotateTileMultipleTimes(boat7b, 1, 1)

	// Surround
	boat1a.coord = [0, 1, -1]
	boat1b.coord = [-1, 0, 1]
	boat2a.coord = [-1, 1, 0]
	boat2b.coord = [0, -1, 1]
	boat3a.coord = [1, 0, -1]
	boat3b.coord = [1, -1, 0]
	boat4a.coord = [0, 1, -1]
	boat4b.coord = [-1, 0, 1]
	boat7a.coord = [-1, 1, 0]
	boat7b.coord = [0, 1, -1]

	/*store.players[0].villageTiles.push(boat1a)
	store.players[0].villageTiles.push(boat1b)
	store.players[0].villageTiles.push(boat2a)
	store.players[0].villageTiles.push(boat2b)
	store.players[0].villageTiles.push(boat3a)
	store.players[0].villageTiles.push(boat3b)
	store.players[1].villageTiles.push(boat4a)
	store.players[1].villageTiles.push(boat4b)*/
	store.players[1].villageTiles.push(boat7a)
	//store.players[2].villageTiles.push(boat7b)

	// Down Right
	newTile1.coord = [1, 0, -1]
	newTile2.coord = [2, 0, -2]
	newTile3.coord = [3, 0, -3]
	newTile4.coord = [4, 0, -4]

	// Up Right
	newTile1.coord = [1, -1, 0]
	newTile2.coord = [2, -2, 0]
	newTile3.coord = [3, -3, 0]
	newTile4.coord = [4, -4, 0]

	// UP / DOWN
	newTile1.coord = [0, -1, 1]
	newTile2.coord = [0, -2, 2]
	newTile3.coord = [0, -3, 3]
	newTile4.coord = [0, -4, 4]

	// Surround
	newTile1.coord = [0, 1, -1] //a
	newTile2.coord = [-1, 0, 1] //a
	newTile3.coord = [-1, 1, 0] //a
	newTile4.coord = [0, -1, 1] //b
	newTile5.coord = [1, 0, -1] //b
	newTile6.coord = [1, -1, 0] //b
	newTile7.coord = [0, 2, -2] //a
	newTile8.coord = [-1, 0, 1] //b
	newTile9.coord = [-2, 2, 0] //a

	model.rotateTileMultipleTimes(newTile1, 1, 1)
	model.rotateTileMultipleTimes(newTile2, 1, 2)
	model.rotateTileMultipleTimes(newTile3, 1, 3)
	model.rotateTileMultipleTimes(newTile4, 1, 4)
	model.rotateTileMultipleTimes(newTile5, 1, 5)
	model.rotateTileMultipleTimes(newTile6, 1, 1)
	model.rotateTileMultipleTimes(newTile7, 1, 2)
	model.rotateTileMultipleTimes(newTile8, 1, 3)
	model.rotateTileMultipleTimes(newTile9, 1, 4)

	store.players[1].villageTiles.push(newTile1)
	/*store.players[0].villageTiles.push(newTile2)
	store.players[0].villageTiles.push(newTile3)
	store.players[1].villageTiles.push(newTile4)
	store.players[1].villageTiles.push(newTile5)
	store.players[1].villageTiles.push(newTile6)
	store.players[0].villageTiles.push(newTile7)
	store.players[1].villageTiles.push(newTile8)
	store.players[0].villageTiles.push(newTile9)*/

	store.players[controller.currentPlayerIndex()].villageTiles[0].resources[0] = 1
	store.players[controller.currentPlayerIndex()].villageTiles[0].resources[1] = 2
	store.players[controller.currentPlayerIndex()].villageTiles[0].resources[2] = 3
	store.players[controller.currentPlayerIndex()].villageTiles[0].resources[3] = 4

	// Res
	/*store.players[0].villageTiles[0].resources[0] = 1
	store.players[0].villageTiles[0].resources[1] = 2
	store.players[0].villageTiles[0].resources[3] = 3
	store.players[0].villageTiles[0].resources[2] = 4*/

	/*store.players[1].villageTiles[1].resources[0] = 1
	store.players[1].villageTiles[1].resources[1] = 2
	store.players[1].villageTiles[1].resources[3] = 3
	store.players[1].villageTiles[1].resources[2] = 4

	store.players[2].villageTiles[2].resources[0] = 1
	store.players[2].villageTiles[2].resources[1] = 2
	store.players[2].villageTiles[2].resources[3] = 3
	store.players[2].villageTiles[2].resources[2] = 4*/

	map.calculateCanvasSizeForPlayerVillage(0, false)
	map.calculateCanvasSizeForPlayerVillage(1, false)
	//map.calculateCanvasSizeForPlayerVillage(2, false)

	//store.gameflow.season++

	// Re-add meeples to boats
	//rules.setupSeasonTiles(store.gameflow.season)
	store.gameflow.phase = rf.PHASE_BIDDING_AND_ACTIONS

	controller.startPlayerTurn()
}
async function endAllTurns() {
	store.clearContext()

	store.gameflow.turnOrder.splice(0)
	controller.endCurrentPhase()

	controller.startPlayerTurn()
}

function debugButton() {
	alert(JSON.stringify(store.gameflow.passedPlayerIndexes))
	//store.players[2].knownHiddenSkillTiles = [0,0,0,0]
	//IO.simpleSave()
	return
	//alert(controller.currentPlayerObj().name)

	let data = funcs.exportKFWmodelForGameOver()
	console.log(JSON.stringify(data))
	funcs.importKFWmodelForGameOver(data)
	for (let i = 0; i < store.players.length; i++) model.scoreAutoProcessingTilesAndMoveResources(i)

	//controller.startPlayerTurn()

	// CONTRACT EXPORT
	/*console.log(JSON.stringify(controller.currentPlayerObj().hiddenContracts))
	let data = funcs.exportPlayerFinalScoringMoveData(controller.currentPlayerIndex())
	console.log(JSON.stringify(data))
	village.importVillageEndGame(controller.currentPlayerIndex(), data[0])
	funcs.importContractsForFinalScoring(controller.currentPlayerIndex(), data[1])
	console.log(JSON.stringify(controller.currentPlayerObj().hiddenContracts))*/

	return
	/*let newTile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.id === 1)))
	controller.currentPlayerObj().pendingVillageTiles.push(newTile)
	newTile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.id === 5)))
	controller.currentPlayerObj().pendingVillageTiles.push(newTile)
	newTile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.id === 7)))
	controller.currentPlayerObj().pendingVillageTiles.push(newTile)
	newTile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.id === 9)))
	controller.currentPlayerObj().pendingVillageTiles.push(newTile)
	return*/
	store.availableResources = [1, 1, 1, 1]
	controller.currentPlayerObj().hiddenSkillTiles[0] = 1
	controller.currentPlayerObj().hiddenSkillTiles[1] = 2
	controller.currentPlayerObj().hiddenSkillTiles[2] = 3

	controller.currentPlayerObj().hiddenMeeples[0] = 5
	controller.currentPlayerObj().hiddenMeeples[1] = 4
	controller.currentPlayerObj().hiddenMeeples[2] = 3
	controller.currentPlayerObj().hiddenMeeples[3] = 3

	controller.currentPlayerObj().villageTiles[0].resources = [3, 0, 0, 0]
	//controller.currentPlayerObj().villageTiles[1].resources = [2,2, 2, 2]
	//controller.currentPlayerObj().villageTiles[0].extension = 5
	controller.currentPlayerObj().villageTiles[0].upgraded = 1
	//controller.currentPlayerObj().villageTiles[1].extension = 1

	controller.currentPlayerObj().villageTiles[0].cabins = 1

	controller.currentPlayerObj().hiddenContracts = []
	for (let idd of [5, 7, 11, 14, 22, 33]) {
		let newContract = rf.ALL_CONTRACTS.find((c) => c.id === parseInt(idd))

		if (newContract) {
			controller.currentPlayerObj().hiddenContracts.push(JSON.parse(JSON.stringify(newContract)))
		} else {
			console.log(`Contract with id ${idd} not found.`)
		}
	}

	//controller.currentPlayerObj().villageTiles[0].resources = [3,6,8,5]

	/*let tile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((tile) => tile.tileID[0] === rf.TILE_WINTER_DELIVERY_MAN_A)))
	tile.upgraded = 0
	tile.coord = [1,1,-2]
	controller.currentPlayerObj().villageTiles.push(tile)*/
}

function toggleMapSelect() {
	store.viewSettings.selectingBoard = !store.viewSettings.selectingBoard
}

function getMapBubblePosition(bubble) {
	let midPoint = document.getElementById("menuButtonMap").getBoundingClientRect().left + document.getElementById("menuButtonMap").getBoundingClientRect().width / 2
	if (bubble === 0) return String(midPoint - 216 / 2 - 10 - 149)
	if (bubble === 1) return String(midPoint - 216 / 2) // item width/2
	if (bubble === 2) return String(midPoint + 10 + 216 / 2)
	if (bubble === 3) return String(midPoint - 216 / 2 - 10 - 149)
}
</script>

<template>
	<div id="top">
		<div id="menu">
			<a href="/">
				<span class="topMenuItem">
					<img src="@static/KFW/images/icon-house.svg" />
					<span>Home</span>
				</span>
			</a>

			<span v-if="personal.name != undefined" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showChat }]" id="menuButtonChat" @click="toggleChat">
				<img src="@static/KFW/images/icon-chat.svg" />
				<span>Chat</span>
			</span>

			<span v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showBug }]" id="menuButtonBug" @click="toggleBug">
				<img src="@static/KFW/images/icon-stop.svg" />
				<span>Bug</span>
			</span>

			<!-- IF LOGGED IN -->
			<span v-if="personal.name != undefined" class="topMenuItem" id="menuButtonNext" @click="nextGame">
				<img src="@static/KFW/images/icon-nextGame.svg" />
				<span>Next</span>
			</span>

			<div class="menuDivider"></div>

			<!--<span @click="toggleMapSelect" id="menuButtonMap" class="topMenuItem" :class="{ topMenuItemSelected: store.viewSettings.selectingBoard }">
				<img src="@static/KFW/images/icon-cog.svg" />
				<span>Settings</span>
			</span>-->

			<a href="/KFW/help/" target="_blank">
				<span class="topMenuItem">
					<img src="@static/KFW/images/icon-rulebook.svg" />
					<span>Rules</span>
				</span>
			</a>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" class="topMenuItem" :class="['topMenuItem', { hasNotes: personal.notes.length > 0 }, { topMenuItemSelected: store.viewSettings.showNotes }]" id="menuButtonNotes" @click="toggleNotes">
				<img src="@static/KFW/images/icon-notebook.svg" />
				<span>Notes</span>
			</span>

			<span :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showReserve }]" id="menuButtonReserve" @click="toggleReserve">
				<img src="@static/KFW/images/icon-box.svg" />
				<span>Reserve</span>
			</span>

			<div class="menuDivider"></div>

			<span :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showHistory }]" id="menuButtonHistory" @click="toggleHistory">
				<img src="@static/KFW/images/icon-scroll.svg" />
				<span>History</span>
			</span>

			<!--<span class="topMenuItem" @click="toggleReplay()">
				<img src="@static/KFW/images/icon-replay.svg" />
				<span>Replay</span>
			</span>-->

			<div class="menuDivider"></div>

			<!-- IF INVOLVED PLAYER-->
			<span v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.viewSettings.showRewindPanel }]" @click="loadRewind()">
				<img src="@static/KFW/images/icon-rewind.svg" />
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

			<!--
			<div id="zoomDiv">
				<label id="zoomLabel">Zoom</label>-->
			<!--<input class="tableZoomButton" type="button" value="Whole Map" @click="areaZoom(0)" />
				<input class="tableZoomButton" type="button" value="L" @click="areaZoom(0)" />
				<input class="tableZoomButton" type="button" value="C" @click="areaZoom(1)" />
				<input class="tableZoomButton" type="button" value="R" @click="areaZoom(2)" />-->
			<!--
				<input class="zoomButton" type="button" value="+" @click="doZoom(1)" />
				<input class="zoomButton" type="button" value="-" @click="doZoom(-1)" />

			</div>-->
			<template v-if="IO.DEBUG_USERS.includes(personal.name)">
				<br />
				<span style="color: #000"></span>
				<button class="actionsLineButton" @click="cheatStart">Cheat Start</button>
				<button class="actionsLineButton" @click="cheatTiles">Cheat Tiles</button>
				<button class="actionsLineButton" @click="controller.endPlayerTurn">ET</button>
				<button class="actionsLineButton" @click="endAllTurns">End ALL</button>
				<button class="actionsLineButton" @click="debugButton">Debug</button>
			</template>
		</div>

		<div id="topInfos">
			<div class="infoSpanDiv">
				<span id="infoSpan">
					<span v-html="store.gameName"></span>
					| {{ view.getSeasonText(store.gameflow.season) }} | {{ view.phaseStr() }}
					<span v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER">| {{ controller.currentPlayerObj().displayName }}</span>
				</span>
			</div>
			<div id="playerLineDiv">
				Turn Order: 
				<span
					v-for="(playerIndex, idx) in store.gameflow.turnOrder"
					:key="idx"
					class="mainEntryPlayer"
					:style="{
						backgroundColor: personal.getCorrectedColourHex(store.players[playerIndex].colour),
						color: personal.getCorrectedColourText(store.players[playerIndex].colour),
					}">
					{{ store.players[playerIndex].displayName }}
				</span>
			</div>
		</div>
	</div>
	<transition name="slideLmap">
		<div
			class="boardSelectBubbleL"
			@click="alert(1)"
			v-if="store.viewSettings.selectingBoard"
			:style="{
				left: getMapBubblePosition(0) + 'px',
			}"></div>
	</transition>
	<transition name="slideCmap">
		<div
			class="boardSelectBubbleC"
			@click="alert(2)"
			v-if="store.viewSettings.selectingBoard"
			:style="{
				left: getMapBubblePosition(1) + 'px',
			}"></div>
	</transition>
	<transition name="slideCdiv">
		<div
			class="settingsBubble"
			@click="alert(3)"
			v-if="store.viewSettings.selectingBoard"
			:style="{
				left: getMapBubblePosition(3) + 'px',
			}">
			<a class="settingsBubbleLink" target="_blank" href="/profileKFW/">Click here to set your Indonesia Preferences</a>
		</div>
	</transition>
	<transition name="slideRmap">
		<div
			class="boardSelectBubbleR"
			@click="changeBoard(-1)"
			v-if="store.viewSettings.selectingBoard"
			:style="{
				left: getMapBubblePosition(2) + 'px',
			}">
			<!--<img class="mapSelectImg" src="" alt="3e map">-->
			<span style="color: white">&nbsp;&nbsp;3e Map</span>
		</div>
	</transition>
</template>

<style scoped>
#topInfos {
	display: inline;
	white-space: nowrap;
	overflow: hidden;
	min-width: fit-content;
	background-color: #ff9900;
	/*
	margin-top: 10px;
    align-items: center;
    min-width: 600px; 
    display: flex;
    justify-content: center;*/
}

#playerLineDiv {
	/*margin-top: 10px;
	align-items: center;
	margin: auto;
	display: inline;
	justify-content: center;*/
	display: flex;
	justify-content: center;
	line-height: 16px;
	margin-bottom: 2px;
	margin-top: 2px;
}

.turnOrderSpan {
	vertical-align: middle;
}

#top {
	background-color: #333;
	color: white;
	padding: 0px;
	width: 100%;
	min-width: 1550px;
	height: 60px;
	top: 0px;
	z-index: 2;
	margin: 0px important;
	position: relative;
	display: inline-block;
}

#menu {
	float: left;
	color: white;
}

#topRight {
	float: right;
	height: 100%;
	font-size: 14px;
	text-align: right;
	margin-right: 10px;
}

.infoSpanDiv {
	display: flex;
	justify-content: center;
	line-height: 16px;
	margin-bottom: 2px;
	margin-top: 2px;
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

/*.tableZoomButton {
	font-weight: 900;
	font-size: 15px;
	margin-left: 5px;
	min-width: 20px;
}*/

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

/* Only needed to flash tiimer  */
.redText {
	color: red;
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

/** Map Selection */
.mapSelectImg {
	width: 100%;
	height: 100%;
	border-radius: 20px;
}

.boardSelectBubbleL {
	position: absolute;
	top: 65px;
	background-color: black;
	width: 149px;
	height: 100px;
	border: 3px solid yellow;
	border-radius: 20px;
	z-index: 1;
}

.slideLmap-leave-active,
.slideLmap-enter-active {
	transition: 0.5s ease-in-out;
}

.slideLmap-leave-to,
.slideLmap-enter-from {
	transform: translate(100px, -200px);
	opacity: 0;
}

.boardSelectBubbleC {
	position: absolute;
	top: 65px;
	background-color: black;
	width: 216px;
	height: 100px;
	border: 3px solid yellow;
	border-radius: 20px;
	z-index: 1;
}

.settingsBubble {
	position: absolute;
	top: 175px;
	background-color: white;
	width: 600px;
	height: 59px;
	border: 3px solid black;
	border-radius: 20px;
	z-index: 1;
	font-size: 27px;
	text-align: center;
	cursor: pointer;
	font-weight: bolder;
	display: flex; /* Add flex display */
	justify-content: center; /* Horizontally center the content */
	align-items: center; /* Vertically center the content */
}

.slideCmap-leave-active,
.slideCmap-enter-active {
	transition: 0.5s ease-in-out;
}

.slideCmap-leave-to,
.slideCmap-enter-from {
	transform: translate(0px, -200px);
	opacity: 0;
}

.slideCdiv-leave-active,
.slideCdiv-enter-active {
	transition: 0.5s ease-in-out;
}

.slideCdiv-leave-to,
.slideCdiv-enter-from {
	transform: translate(0px, -200px);
	opacity: 0;
}

.boardSelectBubbleR {
	position: absolute;
	top: 65px;
	background-color: black;
	width: 216px;
	height: 100px;
	border: 3px solid yellow;
	border-radius: 20px;
	z-index: 1;
}

.slideRmap-leave-active,
.slideRmap-enter-active {
	transition: 0.5s ease-in-out;
}

.slideRmap-leave-to,
.slideRmap-enter-from {
	transform: translate(-100px, -200px);
	opacity: 0;
	/*left: 352px;*/
}

.boardSelectBubbleL:hover,
.boardSelectBubbleC:hover,
.boardSelectBubbleR:hover {
	border-color: lightgreen;
}
.menuDivider {
	display: inline-block;
	width: 5px;
	height: 50px;
	background-color: darkgray;
	margin: 0px 10px 0px 10px;
}
</style>
