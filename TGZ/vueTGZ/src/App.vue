<script setup>
import * as map from "./js/TGZmap"
import * as rf from "./js/TGZreference"
import * as funcs from "./js/TGZfuncs"
import * as IO from "./js/TGZ_IO"
import * as view from "./js/TGZview"
import * as WS from "./js/TGZwebsocket"
import * as model from "./js/TGZmodel"
import * as history from "./js/TGZhistory"
import * as replay from "./js/TGZreplay"

import TopMenu from "./components/TopMenu.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import DebugArea from "./components/DebugArea.vue"
import MapArea from "./components/MapArea.vue"
import ActionArea from "./components/ActionArea.vue"
import HistoryTab from "./components/HistoryTab.vue"
import ReplayArea from "./components/ReplayArea.vue"
import PlayerDetails from "./components/PlayerDetails.vue"
import FooterBar from "./components/FooterBar.vue"

import * as controller from "./js/TGZcontroller"

import { watchEffect } from "vue"

import { useModelStore } from "./stores/TGZstore.js"
const store = useModelStore()

import { usePersonalStore } from "./stores/TGZpersonal.js"
const personal = usePersonalStore()

watchEffect(() => {
	let backgroundColour = "floralwhite"
	if (store.topMenuViews.showReplay) backgroundColour = "lightgrey"
	else if (store.gameflow.phase === rf.PHASE_GAME_OVER) backgroundColour = "#d4eafd"
	else if (personal.canPlay()) backgroundColour = "#d4eafd"
	else if (!personal.canPlay() && personal.pov >= 0) backgroundColour = "floralwhite"
	// If it's mid game but you're not involved, should still be blue
	else backgroundColour = "#d4eafd"

	// Update the body background color directly
	document.body.style.backgroundColor = backgroundColour
})

/***************************** */
async function initGame() {
	personal.haltPlay = true
	// Set up all Data
	personal.gameID = window.initData.gameID
	store.gameName = window.initData.gameName
	personal.gameCreationTimestamp = window.initData.gameCreationTimestamp / 1000
	store.refSize = window.initData.myZoomLevel

	personal.liveWS = false

	personal.latestUpdate = window.initData.latestUpdate

	store.deleteVotesData = window.initData.deleteVotesData
	store.statsExcludeVotesData = window.initData.statsExcludeVotesData

	// Set up logged in player
	if (window.initData.name != undefined) {
		personal.name = window.initData.name
		store.chatData = funcs.decompressChatData(window.initData.chatData)
		personal.latestUpdate = window.initData.latestUpdate
		personal.aidText = true
		if (window.initData.TGZminimalText) personal.aidText = false
	}

	// Set up Involved Player data
	if (window.initData.pov != undefined) {
		if (window.initData.experiencedPlayer) store.topMenuViews.showIntroInfo = false

		personal.liveWS = true
		personal.pov = window.initData.pov
		if (window.initData.externalTournamentGame) {
			personal.externalTournamentGame = true
			rf.SUPER_USERS.push("TGZtourneyAdmin")
			rf.debugUsers.push("TGZtourneyAdmin")
		}
		personal.secondsToNextKickout = window.initData.secondsToNextKickout
		personal.myStatsExcludeConsent = window.initData.myStatsExcludeConsent
		personal.statsExcludedGame = window.initData.statsExcludedGame
		if (personal.statsExcludedGame) personal.votedToExclude = true
		//store.refSize = 240
		if (personal.kickoutCountdownIntervalTimer != undefined) clearInterval(personal.kickoutCountdownIntervalTimer)
		if (personal.secondsToNextKickout <= 1200) personal.kickoutCountdownIntervalTimer = setInterval(view.kickoutTimerTicker, 1000)
		if (window.initData.kickoutRequired > 0) {
			personal.kickoutRequired = window.initData.kickoutRequired
			if (personal.kickoutRequired === 1) {
				funcs.importModel(window.initData.gameData, false)
				let KickoutFlexiDataArray = window.initData.KickoutFlexiDataArray
				let secondsIn24Hours = 24 * 60 * 60
				let playerSeconds = 0

				// Iterate over the KickoutFlexiDataArray to find the player's entry
				for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
					let entry = KickoutFlexiDataArray[i]

					// Check if the entry is a length-2 array and the first element matches the playerName
					if (Array.isArray(entry) && entry.length === 2 && entry[0] === controller.currentPlayerObj().name) {
						playerSeconds = entry[1]
						break
					}
				}
				let remainingFlexSecondsBeforeThisMove = secondsIn24Hours - playerSeconds
				personal.flexiSecondsToNextKickout = remainingFlexSecondsBeforeThisMove + personal.secondsToNextKickout

				personal.kickoutFlexiCountdownIntervalTimer = setInterval(view.kickoutFlexiTimerTicker, 1000)
			}
		}

		personal.notes = funcs.htmlUnescape(window.initData.notes)
		if (window.initData.chatNotification) store.topMenuViews.showChat = true
		personal.preferredColour = window.initData.preferredTGZcolour
		personal.yourTurnAudioType = window.initData.yourTurnAudioType
		if (window.initData.startingOptions[0] === 102) personal.trainingGame = true

		// Set up and save new game
		if (window.initData.gameData === "") {
			// setup gods
			//if (window.initData.startingOptions[0][0] === 20 || (window.initData.startingOptions[0] === 102 && window.initData.startingOptions[1][0] === 20)) {
			let gods_index = -1
			for (let i = 0; i < window.initData.startingOptions.length; i++) {
				if (window.initData.startingOptions[i][0] === 90) {
					gods_index = i
					break
				}
			}
			if (gods_index >= 0) {
				let availablegods = [...window.initData.startingOptions[gods_index]]
				availablegods.shift() // Remove the 90 flag from start
				store.availablegods = [...availablegods]
			}

			// Capture any custom VRs
			let customVR = []
			let VR_index = -1
			for (let i = 0; i < window.initData.startingOptions.length; i++) {
				if (window.initData.startingOptions[i][0] === 91) {
					VR_index = i
					break
				}
			}
			if (VR_index >= 0) {
				customVR = [...window.initData.startingOptions[VR_index]]
				customVR.shift() // Remove the 91 flag from start
			}
			// Set up random gods
			if (store.availablegods.length === 0) {
				let availablegods = [...rf.ALL_gods]
				if (window.initData.startingOptions.includes(7)) availablegods = [...rf.ALL_gods].concat(rf.SCHISM_gods)
				if (window.initData.startingOptions.includes(9)) availablegods = [...rf.SCHISM_gods]
				funcs.shuffle(availablegods)
				if (window.initData.startingOptions.includes(8)) {
					availablegods = availablegods.slice(0, 4)
					let schismAvailanle = [...rf.SCHISM_gods]
					funcs.shuffle(schismAvailanle)
					availablegods = availablegods.concat(schismAvailanle.slice(0, 4))
				} else availablegods = availablegods.slice(0, 8)
				store.availablegods = [...availablegods]
			}
			// Fill up partially chosen gods
			else if (store.availablegods.length < 8) {
				while (store.availablegods.length < 8) {
					const hasOGgod = store.availablegods.some((num) => num <= 11)
					const hasSCHISMgod = store.availablegods.some((num) => num >= 12)

					let randomInt = Math.floor(Math.random() * 12) // Generate a random integer between 0 and 11
					if (hasOGgod && hasSCHISMgod) randomInt = Math.floor(Math.random() * 24)
					else if (!hasOGgod && hasSCHISMgod) randomInt = Math.floor(Math.random() * 12) + 12
					if (!store.availablegods.includes(randomInt)) {
						store.availablegods.push(randomInt) // Add the random integer to the array if it's not already included
						if (customVR.length > 0) customVR.push(rf.gods_VR[randomInt])
					}
				}
			}
			// Check for ogun and add blacksmith
			if (store.availablegods.includes(rf.OGUN)) {
				if (!rf.ALL_TILES.includes(rf.BLACKSMITH_TILE)) rf.ALL_TILES.push(rf.BLACKSMITH_TILE)
				if (store.remainingItems.length === 12) store.remainingItems.push(3)
			}

			// setup custom gods VR
			if (customVR.length > 0) {
				for (let i = 0; i < customVR.length; i++) {
					rf.gods_VR[store.availablegods[i]] = customVR[i]
				}
			}
			// setup cusomt spec VR
			let specVR_index = -1
			for (let i = 0; i < window.initData.startingOptions.length; i++) {
				if (window.initData.startingOptions[i][0] === 92) {
					specVR_index = i
					break
				}
			}
			if (specVR_index >= 0) {
				let specVR = [...window.initData.startingOptions[specVR_index]]
				specVR.shift() // Remove the 92 flag from start
				for (let i = 0; i < specVR.length; i++) {
					rf.SPEC_VR[i] = specVR[i]
				}
			}

			store.availablegods.sort(function (a, b) {
				return rf.gods_VR[a] - rf.gods_VR[b]
			})

			store.availableSpecialists = [...rf.ALL_SPECIALISTS]

			const COLOURS = funcs.shuffle([rf.BLACK, rf.GREEN, rf.RED, rf.WHITE, rf.YELLOW])

			for (let i = 0; i < window.initData.playerNames.length; i++) {
				store.players.push({
					name: window.initData.playerNames[i],
					displayName: "",
					colour: COLOURS[i],
					cows: 3,
					monuments: [],
					craftsmen: [],
					craftsmenPrices: [0, 0, 0, 0, 0, 0, 0],
					god: [rf.NO_god, 0],
					specialists: [],
					techs: [],
					maxVR: 20 + 0.1 * i,
				})
			}
			// Now insert display names
			for (let i = 0; i < store.players.length; i++) {
				if (store.players[i].name === "SHADOW" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[0]
				else if (store.players[i].name === "SHADOW_2" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[1]
				else if (store.players[i].name === "SHADOW_3" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[2]
				else if (store.players[i].name === "SHADOW_4" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[3]
				else store.players[i].displayName = store.players[i].name
			}
			for (let i = 0; i < store.players.length; i++) {
				store.gameflow.turnOrder.push(i)
				store.gameflow.fullTurnOrder.push(i)
			}
			// Create Map
			if (window.initData.startingMap != undefined) {
				map.newMap(window.initData.startingMap)
			} else {
				map.newMap(store.players.length)
			}

			model.addHistory(rf.HIST_NEW_GAME, -1, 0, [[...store.gameflow.fullTurnOrder]])
		} // End NEW GAME
		else if (window.initData.gameData !== "") {
			personal.votedToDelete = store.deleteVotesData[personal.name]
			personal.votedToExclude = store.statsExcludeVotesData[personal.name]
		}
	} // end involved player

	// If new, save, otherwise, import data
	if (window.initData.pov == undefined && window.initData.gameData === "") {
		store.topMenuViews.rewindErrorText = "The game has not yet started"
		// Create the <h1> element
		var heading = document.createElement("h1")

		// Set the text content of the <h1> element
		heading.textContent = "The game has not yet started"

		// Get a reference to the body element
		var body = document.body

		// Append the <h1> element to the body
		body.appendChild(heading)
	} else if (window.initData.gameData === "") {
		await IO.saveGame(true)
		personal.haltPlay = true
	} else {
		// FInally, impport data
		funcs.importModel(window.initData.gameData, false)
		if (window.initData.spoilerFree) {
			// Enter replay mode at step 1
			store.topMenuViews.showReplay = true
			store.replayResetData = funcs.exportModel(true) // FIZ

			// TURM ON
			await replay.generateReplayData(true)
		}
	}

	await WS.StartWebSocket()

	personal.haltPlay = false
	controller.startPlayerTurn()
} // end initGame

initGame()

if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
	model.setupStatsMode()
}

/********************************* */

if (personal.name !== "admin" && personal.name !== "BotKickStarter" && personal.name !== "TGZtourneyAdmin") {
	window.addEventListener("contextmenu", (e) => {
		e.preventDefault()
		e.stopPropagation() // not necessary in my case, could leave in case stopImmediateProp isn't available?
		e.stopImmediatePropagation()
		return false
	})
	/* window.addEventListener("touchend", e => {
	 e.preventDefault()
	 e.stopPropagation(); // not necessary in my case, could leave in case stopImmediateProp isn't available? 
	 e.stopImmediatePropagation();
	 return false;
   });*/
}
//map.newMap(2)

controller.startPlayerTurn() // Will return early anyway if ineligiible

document.addEventListener("keyup", function (event) {
	if (store.topMenuViews.showChat) return
	//if (event.altKey && event.which === 82)
	// r = rotate
	if (event.key === "r" || event.key === "R") {
		// DONT USE - STOPS WORKING IN CHAT / ETC!!!!
		//event.preventDefault();
		if (!rf.ROTATABLE_TILES.includes(store.context.itemBeingAdded)) return
		// Remove ghosts
		let ghostDivs = document.getElementsByClassName("ghostDiv")
		let ghostImgs = document.getElementsByClassName("ghostImg")
		for (let i = 0; i < ghostDivs.length; i++) ghostDivs[i].style.display = "none"
		for (let i = 0; i < ghostImgs.length; i++) ghostImgs[i].style.display = "none"
		store.topMenuViews.currentGhostIndex = -1

		store.context.itemBeingAddedRotation += 1
		if (store.context.itemBeingAddedRotation === 2) store.context.itemBeingAddedRotation = 0
		else if (store.context.itemBeingAddedRotation === -1) store.context.itemBeingAddedRotation = 1
		store.context.indexesToHighlightClick.splice(0)
		if (store.context.action === rf.ACT_BUILD_WATER) store.context.indexesToHighlightClick = map.getSpacesForResource()
		else if (store.context.action === rf.ACT_BUILD_PRI_CRAFTSMAN) store.context.indexesToHighlightClick = map.getAllowedIndexesToPlacePriCraftsman(store.context.itemBeingAdded, store.context.range, store.context.itemBeingAddedRotation)[0]
		else if (store.context.action === rf.ACT_BUILD_SEC_CRAFTSMAN) store.context.indexesToHighlightClick = map.getAllowedIndexesToPlaceSecCraftsman(store.context.itemBeingAdded, store.context.range, store.context.itemBeingAddedRotation)[0]
	} else if (event.key == "ArrowLeft") {
		// left arrow
		if (store.topMenuViews.showReplay) history.performStep(-1)
	} else if (event.key == "ArrowRight") {
		// right arrow
		if (store.topMenuViews.showReplay) history.performStep(1)
	}
})

function getSplitUIleftMinWidth() {
	let plaques = store.players.length
	if (model.anyoneHasSHADIPINYI()) plaques++
	if (plaques <= 4) return 720
	if (plaques === 5) return 820
	if (plaques === 6) return 950
}
</script>

<template>
	<TopMenu />

	<div id="wholeMiddleArea" :style="{
		'min-width': (store.players.length === 2 ? '500' : '730') + 'px',
	}">
		<transition name="fadeMainArea">
			<div id="boardContainer" v-if="!store.topMenuViews.performingRewind">
				<div id="middle">
					<transition name="slideC">
						<PlayerDetails v-if="store.topMenuViews.showingPlayerIndex >= 0"
							:playerIndex="store.topMenuViews.showingPlayerIndex" />
					</transition>
					<TopMenuViews />
					<HistoryTab />
					<div v-if="store.topMenuViews.showLoader" id="fLoadingBar">
						Saving Game.... Please Wait....
						<br />
						<img :src="view.getImage('loading-bar-black')" />
					</div>
					<!-- SPLIT SCREEN REPLAY UI -->
					<template v-if="store.topMenuViews.replayUIlocation === 2 && store.topMenuViews.showReplay">
						<ReplayArea v-if="store.topMenuViews.generatingReplay" />
						<template v-if="!store.topMenuViews.generatingReplay">
							<div id="splitUIcontainer">
								<div id="splitUIleft" :style="{
									'min-width': String(getSplitUIleftMinWidth()) + 'px',
								}">
									<ReplayArea />
									<ActionArea />
								</div>
								<div id="splitUIright">
									<MapArea />
								</div>
							</div>
						</template>
					</template>
					<!-- NORMAL UI -->
					<template v-else>
						<ReplayArea
							v-if="store.topMenuViews.generatingReplay || store.topMenuViews.replayUIlocation === 0" />
						<template v-if="!store.topMenuViews.generatingReplay">
							<div id="mainAreaLessHistory">
								<ActionArea />
								<MapArea />
								<ReplayArea v-if="store.topMenuViews.replayUIlocation === 1" />

								<DebugArea />
							</div>
						</template>
					</template>
				</div>
			</div>
		</transition>
	</div>

	<FooterBar />
</template>

<style>
body {
	margin: 0px !important;
	/*background-color: #d4eafd;*/
	/*background-color: {bodyBackgroundColor};*/
	transition: background-color 1s ease-in-out;
	font-family: Arial, sans-serif;
	/*-webkit-touch-callout: none !important;*/
	/*user-select: text !important;
  -webkit-user-select: none;*/
	font-size: 16px;
}

/*#actionAreaDiv {
  background-color: lightblue;
  margin: 0;
}*/

#boardContainer {
	/*-webkit-touch-callout: none !important;
  user-select: auto;
  -webkit-user-select: none !important;*/

	margin-top: 0px;
	margin-right: auto;
	/*margin-left:calc((100vw - 500px)/2);*/

	margin-bottom: 0px;
	align-items: center;
	-webkit-transition: all 0.2s ease-in-out;
	-moz-transition: all 0.2s ease-in-out;
	-ms-transition: all 0.2s ease-in-out;
	-o-transition: all 0.2s ease-in-out;
	transition: all 0.2s ease-in-out;
}

.slideC-enter-active,
.slideC-leave-active {
	transition: all 0.2s ease-in-out;
	height: 360px;
	overflow: hidden;
}

.slideC-enter-from,
.slideC-leave-to {
	opacity: 0;
	height: 0px;
}

.slideRight {
	margin: 0px auto 0px 460px !important;
	/*position: absolute;*/
	-webkit-transition: all 0.2s ease-in-out;
	-moz-transition: all 0.2s ease-in-out;
	-ms-transition: all 0.2s ease-in-out;
	-o-transition: all 0.2s ease-in-out;
	transition: all 0.2s ease-in-out;
}

#wholeMiddleArea {
	width: 100%;
	min-width: 1310px;
	text-align: center;
	min-height: 500px;
}

#mainAreaLessHistory {
	min-width: 620px;
}

.fadeMainArea-enter-active,
.fadeMainArea-leave-active {
	transition: opacity 0.5s ease-in-out;
}

.fadeMainArea-enter-from,
.fadeMainArea-leave-to {
	opacity: 0;
}

#fLoadingBar {
	width: 100%;
	text-align: center;
	font-size: 40px;
	font-weight: bolder;
}

.r1 {
	-moz-transform: rotate(90deg);
	-webkit-transform: rotate(90deg);
	-o-transform: rotate(90deg);
	-ms-transform: rotate(90deg);
	transform: rotate(90deg);
}

.r2 {
	-moz-transform: rotate(180deg);
	-webkit-transform: rotate(180deg);
	-o-transform: rotate(180deg);
	-ms-transform: rotate(180deg);
	transform: rotate(180deg);
}

.r3 {
	-moz-transform: rotate(270deg);
	-webkit-transform: rotate(270deg);
	-o-transform: rotate(270deg);
	-ms-transform: rotate(270deg);
	transform: rotate(270deg);
}

.mainEntryPlayer {
	color: white;
	font-weight: bolder;
	padding: 0px;
	border: 1px solid black;
	margin-right: 3px;
	display: inline-block;
	margin-top: 1px;
}

.hubRangeSq {
	border: 4px solid;
	padding: 4px;
	margin: 4px;
	vertical-align: middle;
}

.hubRangeSq0 {
	border-color: green;
}

.hubRangeSq1 {
	border-color: orange;
}

.hubRangeSq2 {
	border-color: purple;
}

.hubRangeSq3 {
	border-color: red;
}

.hubRangeSq4 {
	border-color: black;
}

.hubRangeSq5 {
	border-color: black;
}

.hubRangeSq6 {
	border-color: black;
}

.hubRangeSq7 {
	border-color: black;
}

.actionsLineButton {
	margin: 10px;
	/*width: 100px;*/
	width: fit-content;
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 5px;
}

.actionsLineButton:hover {
	background-color: lightgrey;
}

#splitUIcontainer {
	display: flex;
	margin: auto;
	width: fit-content;
}

#splitUIleft {
	width: fit-content;
	margin: 5px;
}

#splitUIright {
	width: fit-content;
	margin: 5px;
	margin-top: 20px;
}
</style>
