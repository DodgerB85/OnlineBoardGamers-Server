<script setup>
import * as IO from "../backend/IND_IO"
import * as view from "../js/INDview"
import * as rf from "../js/INDreference"
import * as controller from "../js/INDcontroller"
import * as model from "../js/INDmodel"
import * as replay from "../js/INDreplay"
import * as funcs from "../js/INDfuncs"
import * as map from "../js/INDmap"
import * as rfm from "../js/INDmapData"

import { useModelStore } from "../stores/INDstore.js"
const store = useModelStore()

import { usePersonalStore } from "../stores/INDpersonal.js"
const personal = usePersonalStore()

function doZoom(dir) {
	if (IO.SUPER_USERS.includes(personal.name)) store.hiddenMoney = false
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
	store.topMenuViews.showNotes = false
	store.topMenuViews.showBug = !store.topMenuViews.showBug
}

async function toggleReplay() {
	if (!store.topMenuViews.showReplay) {
		if (store.hiddenMoney) {
			store.gameMessages.rewindErrorText = "You cannot view a replay during a hidden money game"
			return
		}
		store.replayResetData = funcs.simpleExportWholeModel()
		store.topMenuViews.showReplay = true

		// TURM ON
		await replay.generateReplayData()
	} else {
		// TURN OFF
		store.clearHistoryHelpers()
		store.clearVars()
		store.topMenuViews.showReplay = false
		funcs.simpleImportWholeModel(store.replayResetData, true)
	}
}
function toggleNotes() {
	store.topMenuViews.showBug = false
	store.topMenuViews.showNotes = !store.topMenuViews.showNotes
}
function toggleChat() {
	store.topMenuViews.showHistory = false
	document.getElementById("boardContainer").classList.remove("slideRight")
	store.topMenuViews.showChat = !store.topMenuViews.showChat
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
	if (IO.SUPER_USERS.includes(personal.name)) {
		//store.hiddenMoney = false
		personal.pov++
		if (personal.pov === store.players.length) personal.pov = -1
		if (personal.pov >= 0) store.gameName = String(personal.pov) + "  :  " + store.players[personal.pov].name
		else store.gameName = String(personal.pov) + "  :  " + "NOT INVOVLED"
		if (personal.pov >= 0) controller.startPlayerTurn()
	}
	if (personal.trainingGame) {
		store.mapData.selectedMap = rf.MAP_AEGEAN
		store.mapData.selectedMapData = JSON.parse(JSON.stringify(rfm.AG_MAP))
		store.context.territoriesToHighlight.splice(0)
		for (let i = 0; i < rf.AG_TERRITORY_COUNT; i++) store.context.territoriesToHighlight.push(i)
		if (store.refSize > 1300) store.refSize = 1300
		store.context.action = rf.ACT_NONE
		store.mapData.allNeighbours = map.territoryNeighbors(rf.AG_TERRITORY_COUNT, rf.AG_NEIGHBOUR_PAIRS).all
		store.mapData.landNeighbours = map.territoryNeighbors(rf.AG_TERRITORY_COUNT, rf.AG_NEIGHBOUR_PAIRS).land
		store.mapData.seaNeighbours = map.territoryNeighbors(rf.AG_TERRITORY_COUNT, rf.AG_NEIGHBOUR_PAIRS).sea
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

function toggleReserve() {
	if (store.topMenuViews.showReserve) {
		store.topMenuViews.showReserve = false
		store.context.selectedReserveEraCard = -1
		store.clearHistoryHelpers()
	} else store.topMenuViews.showReserve = true
}

function cheatStart() {
	/*model.addCity_core(57, 0, 0)
    model.addCity_core(27, 1, 0)
    model.addCity_core(37, 0, 0)
    model.addCity_core(47, 1, 0)
    model.addCity_core(63, 1, 0)
    model.addCity_core(83, 1, 0)
    model.addCity_core(72, 1, 0)
    model.addCity_core(89, 1, 0)
    controller.startPlayerTurn()

    return*/

	/*store.players[0].eraCards.pop()
	store.players[0].eraCards.pop()
	store.players[1].eraCards.pop()
	store.players[1].eraCards.pop()*/

	model.addCity_core(57, 0, 0)
	model.addCity_core(75, 1, 0)
	model.addCity_core(37, 0, 0)
	model.addCity_core(45, 1, 0)

	// FILL CITIES
	/*for (let i = 0; i <= 115; i++) {
		if (rf.OM_POSSIBLE_CITY_PROVINCES.includes(map.getProvinceFromTerrID(i))) {
			if (map.isCoastal(i)) model.addCity_core(i, 0, 0)
		}
	}
	return*/

	/*store.cities[0].receivedGoods.push(rf.GOOD_RICE)
	store.cities[0].receivedGoods.push(rf.GOOD_RICE)
	store.cities[0].receivedGoods.push(rf.GOOD_RICE)
	store.cities[0].receivedGoods.push(rf.GOOD_SPICE)
	store.cities[0].receivedGoods.push(rf.GOOD_SPICE)
	store.cities[0].receivedGoods.push(rf.GOOD_SPICE)
	store.cities[0].receivedGoods.push(rf.GOOD_RUBBER)
	store.cities[0].receivedGoods.push(rf.GOOD_RUBBER)
	store.cities[0].receivedGoods.push(rf.GOOD_RUBBER)
	store.cities[0].receivedGoods.push(rf.GOOD_OIL)
	store.cities[0].receivedGoods.push(rf.GOOD_OIL)
	store.cities[0].receivedGoods.push(rf.GOOD_OIL)
	store.cities[0].receivedGoods.push(rf.GOOD_SIAP_FAJI)
	store.cities[0].receivedGoods.push(rf.GOOD_SIAP_FAJI)
	store.cities[0].receivedGoods.push(rf.GOOD_SIAP_FAJI)

	store.cities[1].receivedGoods.push(rf.GOOD_RICE)
	store.cities[1].receivedGoods.push(rf.GOOD_RICE)
	store.cities[1].receivedGoods.push(rf.GOOD_SPICE)
	store.cities[1].receivedGoods.push(rf.GOOD_SPICE)
	store.cities[1].receivedGoods.push(rf.GOOD_RUBBER)
	store.cities[1].receivedGoods.push(rf.GOOD_RUBBER)
	store.cities[1].receivedGoods.push(rf.GOOD_OIL)
	store.cities[1].receivedGoods.push(rf.GOOD_OIL)
	store.cities[1].receivedGoods.push(rf.GOOD_SIAP_FAJI)
	store.cities[1].receivedGoods.push(rf.GOOD_SIAP_FAJI)

	store.cities[2].receivedGoods.push(rf.GOOD_RICE)
	store.cities[2].receivedGoods.push(rf.GOOD_SPICE)
	store.cities[2].receivedGoods.push(rf.GOOD_RUBBER)
	store.cities[2].receivedGoods.push(rf.GOOD_OIL)
	store.cities[2].receivedGoods.push(rf.GOOD_SIAP_FAJI)*/

	// Upgrade RnD
	for (let i = 0; i < store.players.length; i++) {
		store.players[i].moneyCash = 500
		for (let j = 0; j < store.players[i].RnD.length; j++) {
			if (j !== rf.RnD_EXPANSION_IDX && j !== rf.RnD_HULL_IDX) store.players[i].RnD[j] = 5
			else if (j === rf.RnD_EXPANSION_IDX) store.players[i].RnD[j] = 2
			else if (j === rf.RnD_HULL_IDX) store.players[i].RnD[j] = 1
		}
	}

	// Ships
	model.acquireCompany_core(1, 0)
	model.expandCompany_core(1, 0, 125, true)
	model.expandCompany_core(1, 0, 129, true)
	model.expandCompany_core(1, 0, 129, true)
	model.expandCompany_core(1, 0, 122, true)
	model.expandCompany_core(1, 0, 132, true)

	model.acquireCompany_core(2, 1)
	model.expandCompany_core(2, 0, 125, true)
	model.expandCompany_core(2, 0, 129, true)
	model.expandCompany_core(2, 0, 129, true)

	model.acquireCompany_core(3, 2)
	model.expandCompany_core(3, 0, 123, true)
	model.expandCompany_core(3, 0, 124, true)
	model.expandCompany_core(3, 0, 125, true)

	// Spice
	model.acquireCompany_core(1, 6)
	model.expandCompany_core(1, 1, 55, true)
	model.expandCompany_core(1, 1, 59, true)
	model.expandCompany_core(1, 1, 56, true)

	model.acquireCompany_core(1, 7)
	model.expandCompany_core(1, 2, 58, true)

	// Rice
	model.acquireCompany_core(0, 4)
	model.expandCompany_core(0, 0, 71, true)
	model.expandCompany_core(0, 0, 72, true)
	model.expandCompany_core(0, 0, 73, true)

	model.acquireCompany_core(0, 5)
	model.expandCompany_core(0, 1, 46, true)
	model.expandCompany_core(0, 1, 47, true)
	model.expandCompany_core(0, 1, 48, true)
	model.expandCompany_core(0, 1, 76, true)
	model.expandCompany_core(0, 1, 74, true)

	// FILL ALL

	// Map Ship Fill
	/*for (let i = 137; i <= 162; i++) {
		for (let j = 0; j < 5; j++) model.expandCompany_core(1, 0, i, true)
	}*/

	// FILL RICE
	/*for (let i = 0; i < 150; i++) {
		if (map.isLandTerritory(i)) model.expandCompany_core(0, 1, i, true)
	}*/
	/*
	// FILL AVAILABLE COMPANIES
	store.availableCompanies.splice(0)
	store.availableCompanies = JSON.parse(JSON.stringify(rf.ALL_COMPANIES))
	store.availableCompanies = store.availableCompanies.reduce((acc, current) => {
		// Check if an object for the province already exists in the accumulator
		const existingProvince = acc.find((item) => item.province === current.province)

		// If not found, add the current object to the accumulator
		if (!existingProvince) {
			acc.push(current)
		}

		return acc
	}, [])
	// Add in pap / hal
	let company = rf.ALL_COMPANIES.find((company) => company.province === rf.PROVINCE_HAL)
	store.availableCompanies.push(company)
	company = rf.ALL_COMPANIES.find((company) => company.province === rf.PROVINCE_PAP)
	store.availableCompanies.push(company)
*/
	//store.gameflow.currentEra = rf.ERA_C

	store.clearVars()
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
	//controller.endPlayerTurn()
	store.gameflow.phase = rf.PHASE_OPERATIONS
	controller.startPlayerTurn()
}
async function endAllTurns() {
	store.clearVars()
	if (store.gameflow.phase === rf.PHASE_BID_TURN_ORDER) {
		for (let i = 0; i < store.players.length; i++) {
			if (!store.ongoingVars.newTurnOrderBids.some((entry) => entry[0] === i)) store.ongoingVars.newTurnOrderBids.push([i, 0, 1])
		}
	}
	store.gameflow.turnOrder.splice(0)
	controller.endCurrentPhase()

	controller.startPlayerTurn()
}

function debugButton() {
	console.log(JSON.stringify(store.computedHistory))
	//store.availableCompanies.splice(0)
	//funcs.simpleExportWholeModel(true)
	/*if ("serviceWorker" in navigator && "PushManager" in window) {
		let tempElement = document.createElement("div")
		tempElement.innerHTML = store.gameName
		// Get the decoded text
		let decodedGameName = tempElement.textContent

		Notification.requestPermission(function (status) {
			const title = "It is your turn in Indonesia"

			const options = {
				body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(),
				//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
				icon: "/static/IND/images/ind_icon.png",
				tag: "OBGgame",
			}

			var n = new Notification(title, options)
			//registration.showNotification(title, options)
			n.onclick = function (event) {
				//event.preventDefault() // Prevents the browser from focusing the Notification's tab
				//window.open("http://localhost:8000/IND/54/", "_blank")
				// Check if the window client exists
				window.focus()
				//window.open('http://google.com', '_self').focus();
				n.close()
			}
		})
	}
	return*/
	/*try {
		if ("serviceWorker" in navigator && "PushManager" in window) {
			let tempElement = document.createElement("div")
			tempElement.innerHTML = store.gameName
			// Get the decoded text
			let decodedGameName = tempElement.textContent

			Notification.requestPermission(function (status) {
				const title = "It is your turn in Indonesia"

				const options = {
					body: "" + decodedGameName + ": " + store.gameflow.turn + " - " + view.phaseStr(),
					//badge: "/static/Lobby/favicon.jpg", // Monochrome, chrome only. Seems to crash
					icon: "/static/IND/images/ind_icon.png",
					tag: "OBGgame",
				}

				var n = new Notification(title, options)
				//registration.showNotification(title, options)
				n.onclick = function (event) {
					event.preventDefault() // Prevents the browser from focusing the Notification's tab
					window.open("http://localhost:8000/IND/54/", "_blank")
					// Check if the window client exists
					/*clients.matchAll({ type: "window" }).then(function (clientList) {
						for (let client of clientList) {
							if ("focus" in client) {
								client.focus()
								break
							}
						}
					})*/
	/*	n.close()
				}
			})
		}
	} catch (error) {
		console.log(error)
	}*/
}

function getEraText() {
	if (store.gameflow.currentEra === rf.ERA_A) return "Era A"
	if (store.gameflow.currentEra === rf.ERA_B) return "Era B"
	if (store.gameflow.currentEra === rf.ERA_C) return "Era C"
}

function toggleMapSelect() {
	store.topMenuViews.selectingBoard = !store.topMenuViews.selectingBoard
}

function changeBoard(boardNumber) {
	if (boardNumber === -1) return
	store.topMenuViews.performingMapChange = true
	store.topMenuViews.selectingBoard = false
	setTimeout(function () {
		view.performingMapChange(boardNumber)
		store.topMenuViews.performingMapChange = false
	}, 500)
}

function getMapBubblePosition(bubble) {
	let midPoint = document.getElementById("menuButtonMap").getBoundingClientRect().left + document.getElementById("menuButtonMap").getBoundingClientRect().width / 2
	if (bubble === 0) return String(midPoint - 216 / 2 - 10 - 149)
	if (bubble === 1) return String(midPoint - 216 / 2) // item width/2
	if (bubble === 2) return String(midPoint + 10 + 216 / 2)
	if (bubble === 3) return String(midPoint - 216 / 2 - 10 - 149)
}

function localForkGame() {
	store.topMenuViews.selectingBoard = false
	IO.forkGame()
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

			<span v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showBug }]" id="menuButtonBug" @click="toggleBug">
				<img :src="view.getImage('icon-stop')" />
				<span>Bug</span>
			</span>

			<!-- IF LOGGED IN -->
			<span v-if="personal.name != undefined" class="topMenuItem" id="menuButtonNext" @click="nextGame">
				<img :src="view.getImage('icon-nextGame')" />
				<span>Next</span>
			</span>

			<div class="menuDivider"></div>

			<span @click="toggleMapSelect" id="menuButtonMap" class="topMenuItem" :class="{ topMenuItemSelected: store.topMenuViews.selectingBoard }">
				<img :src="view.getImage('icon-cog')" />
				<span>Settings</span>
			</span>

			<a href="/IND/help/" target="_blank">
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

			<span :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showReserve }]" id="menuButtonReserve" @click="toggleReserve">
				<img :src="view.getImage('icon-hand-card')" />
				<span>Cards</span>
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
			<span v-if="personal.pov >= 0" :class="['topMenuItem', { topMenuItemSelected: store.topMenuViews.showRewindPanel }]" @click="loadRewind()">
				<img :src="view.getImage('icon-rewind')" />
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
				<span v-if="IO.DEBUG_USERS.includes(personal.name)">{{ store.refSize }}</span>
				<button class="zoomButton" @click="doZoom(1)">🔍+</button>
				<button class="zoomButton" @click="doZoom(-1)">🔍-</button>
				<template v-if="IO.DEBUG_USERS.includes(personal.name)">
					<br />
					<button class="actionsLineButton" @click="cheatStart">Cheat Start</button>
					<button class="actionsLineButton" @click="controller.endPlayerTurn">ET</button>
					<button class="actionsLineButton" @click="endAllTurns">End ALL Ts</button>
					<button class="actionsLineButton" @click="debugButton">Debug</button>
				</template>
			</div>
		</div>

		<div id="topInfos">
			<div class="infoSpanDiv">
				<span id="infoSpan">
					<span v-html="store.gameName"></span>
					| {{ getEraText() }} | {{ store.gameflow.turn }}:
					{{ view.phaseStr() }}
					<span v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER" id="currentPlayerSpan">| {{ controller.currentPlayerObj().displayName }}</span>
				</span>
			</div>
			<div id="playerLineDiv">
				Turn Order:
				<span v-for="(playerIndex, idx) in store.gameflow.turnOrder" :key="idx" class="mainEntryPlayer turnOrderSpan" :class="'mainEntryPlayer' + personal.getCorrectedColour(store.players[playerIndex].colour)">{{ store.players[playerIndex].displayName }}</span>
			</div>
		</div>
	</div>
	<transition name="slideLmap">
		<div
			class="boardSelectBubbleL"
			@click="changeBoard(rf.MAP_OM_HEXES)"
			v-if="store.topMenuViews.selectingBoard"
			:style="{
				left: getMapBubblePosition(0) + 'px',
			}">
			<img class="mapSelectImg" :src="view.getImage('OM_map_hex_icon')" />
		</div>
	</transition>
	<transition name="slideCmap">
		<div
			class="boardSelectBubbleC"
			@click="changeBoard(rf.MAP_OM_1E2E)"
			v-if="store.topMenuViews.selectingBoard"
			:style="{
				left: getMapBubblePosition(1) + 'px',
			}">
			<img class="mapSelectImg" :src="view.getImage('OM_map_1e2e_icon')" />
		</div>
	</transition>
	<transition name="slideCdiv">
		<div
			class="settingsBubble"
			@click="changeBoard(rf.MAP_OM_1E2E)"
			v-if="store.topMenuViews.selectingBoard"
			:style="{
				left: getMapBubblePosition(3) + 'px',
			}">
			<a target="_blank" href="/profileIND/">Click here to set your Indonesia Preferences</a>
		</div>
	</transition>

	<!--<transition name="slideCdiv2">
		<div
			v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && store.topMenuViews.selectingBoard && !personal.trainingGame && personal.pov >= 0"
			class="voteDeleteBubble"
			:style="{
				left: getMapBubblePosition(3) + 'px',
				top: personal.host ? '390px' : '240px'
			}">
			If all players agree, this game will be deleted
			<br />
			Votes: {{ getDeleteVotes() }} - Players: {{ getDeletePlayers() }}
			<br/>
			<button v-if="!personal.votedToDelete" class="actionsLineButton" @click="localVoteToDelete">Vote to Delete Game</button>
		</div>
	</transition>-->

	<transition name="slideCdiv3">
		<div
			v-if="store.gameflow.phase !== rf.PHASE_GAME_OVER && store.topMenuViews.selectingBoard && !personal.trainingGame && personal.host"
			class="hostBubble"
			:style="{
				left: getMapBubblePosition(3) + 'px',
				top: '240px',
			}">
			As game host, you may copy this game at this point to fork the game. Other players will receive a game invite and will need to accept.
			<br />
			<button class="actionsLineButton" @click="localForkGame">Fork Game</button>
		</div>
	</transition>

	<transition name="slideRmap">
		<div
			class="boardSelectBubbleR"
			@click="changeBoard(rf.MAP_OM_3E)"
			v-if="store.topMenuViews.selectingBoard"
			:style="{
				left: getMapBubblePosition(2) + 'px',
			}">
			<img class="mapSelectImg" :src="view.getImage('OM_map_3e_icon')" />
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
	display: inline-block;
	vertical-align: middle;

	/* 1. Limit the maximum size */
	max-width: 160px;

	/* 2. FORCE it to be at least as wide as the text (up to the max) */
	width: min-content;

	/* 3. Prevent parent flexboxes from squashing it */
	flex-shrink: 0;

	/* 4. Standard truncation */
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

#currentPlayerSpan {
	display: inline-block;
	vertical-align: middle;

	/* 1. Limit the maximum size */
	max-width: 200px;

	/* 2. FORCE it to be at least as wide as the text (up to the max) */
	width: min-content;

	/* 3. Prevent parent flexboxes from squashing it */
	flex-shrink: 0;

	/* 4. Standard truncation */
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
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

.voteDeleteBubble {
	position: absolute;
	top: 240px;
	background-color: white;
	width: 600px;
	height: fit-content;
	border: 3px solid black;
	border-radius: 20px;
	z-index: 1;
	font-size: 27px;
	text-align: center;
	cursor: pointer;
	font-weight: bolder;
	display: inline-block; /* Add flex display */
	justify-content: center; /* Horizontally center the content */
	align-items: center; /* Vertically center the content */
}

.hostBubble {
	position: absolute;

	background-color: white;
	width: 600px;
	height: fit-content;
	border: 3px solid black;
	border-radius: 20px;
	z-index: 1;
	font-size: 27px;
	text-align: center;
	cursor: pointer;
	font-weight: bolder;
	display: inline-block; /* Add flex display */
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

.slideCdiv2-leave-active,
.slideCdiv2-enter-active {
	transition: 0.5s ease-in-out;
}

.slideCdiv2-leave-to,
.slideCdiv2-enter-from {
	transform: translate(0px, -200px);
	opacity: 0;
}

.slideCdiv3-leave-active,
.slideCdiv3-enter-active {
	transition: 0.5s ease-in-out;
}

.slideCdiv3-leave-to,
.slideCdiv3-enter-from {
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
