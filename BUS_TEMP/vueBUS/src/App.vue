<script setup>
/***
 * 
 * hard to tap lines --- I want to invisbly expand the area you can click/touch when placing a
 *  line to make it a bit easy. Probably simlar to how they're highlighted with history..

High contrast / colour blind ? ---
 someone wanted a colour blind option? Like to be able to pick colours? 
 Not really sure on that, but it's on the list. I still want to try and 
 add texture to the lines on the original board, so they stand out better.
 * 
 * 
 * 
 * 
 */

import * as constants from "./constants"
import * as IO from "./BUS_IO"
import * as WS from "./BUSwebsocket"
import * as refFuncs from "./refFuncs"
import * as replay from "./BUSreplay"
import * as view from "./js/BUSview.js"

import TopMenu from "./components/TopMenu.vue"
import GameBoard from "./components/GameBoard.vue"
import PlayerInfo from "./components/PlayerInfo.vue"
import ActionSelection from "./components/ActionSelection.vue"
import FooterBar from "./components/FooterBar.vue"
import ActionArea from "./components/ActionArea.vue"
import DebugArea from "./components/DebugArea.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import ReplayArea from "./components/ReplayArea.vue"

import { useModelStore } from "./stores/model.js"

const model = useModelStore()
import { usePersonalStore } from "./stores/personal.js"
const personal = usePersonalStore()

const shuffle = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1))
			//const j = Math.floor(Math.random() * (i + 1))
			;[array[i], array[j]] = [array[j], array[i]]
	}
	return array
}

function initGame() {
	// Set up all Data
	personal.gameID = window.initData.gameID
	model.gameName = window.initData.gameName
	personal.gameCreationTimestamp = window.initData.gameCreationTimestamp / 1000
	model.refSize = window.initData.myZoomLevel

	personal.trainingGame = false
	if (window.initData.startingOptions.includes(102)) personal.trainingGame = true

	personal.liveWS = false
	personal.pov = -9 // Also denotes involved player
	personal.superuser = false

	model.deleteVotesData = window.initData.deleteVotesData
	model.statsExcludeVotesData = window.initData.statsExcludeVotesData

	// Set up logged in player
	if (window.initData.name != undefined) {
		personal.name = window.initData.name
		model.chatData = model.decompressChatData(window.initData.chatData)
		personal.selectedBoard = window.initData.preferredBusBoard
		if (personal.selectedBoard === 2) model.topMenuViews.displayRightActionSelection = false
	}

	// Set up Involved Player data
	if (window.initData.pov != undefined) {
		personal.liveWS = true
		personal.pov = window.initData.pov
		personal.latestUpdate = window.initData.latestUpdate
		personal.secondsToNextKickout = window.initData.secondsToNextKickout
		personal.votedToDelete = model.deleteVotesData[personal.name]
		//model.refSize = 400
		if (personal.kickoutCountdownIntervalTimer != undefined) clearInterval(personal.kickoutCountdownIntervalTimer)
		if (personal.secondsToNextKickout <= 1200 && window.initData.kickoutRequired > 0) personal.kickoutCountdownIntervalTimer = setInterval(model.kickoutTimerTicker, 1000)

		if (window.initData.kickoutRequired > 0) {
			personal.kickoutRequired = window.initData.kickoutRequired
			if (personal.kickoutRequired === 1) {
				model.importModel(window.initData.gameData, false)
				let KickoutFlexiDataArray = window.initData.KickoutFlexiDataArray
				let secondsIn24Hours = 24 * 60 * 60
				let playerSeconds = 0

				// Iterate over the KickoutFlexiDataArray to find the player's entry
				for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
					let entry = KickoutFlexiDataArray[i]

					// Check if the entry is a length-2 array and the first element matches the playerName
					if (Array.isArray(entry) && entry.length === 2 && entry[0] === model.currentPlayer().name) {
						playerSeconds = entry[1]
						break
					}
				}
				let remainingFlexSecondsBeforeThisMove = secondsIn24Hours - playerSeconds
				personal.flexiSecondsToNextKickout = remainingFlexSecondsBeforeThisMove + personal.secondsToNextKickout

				personal.kickoutFlexiCountdownIntervalTimer = setInterval(model.kickoutFlexiTimerTicker, 1000)
			}
		}

		personal.notes = refFuncs.htmlUnescape(window.initData.notes)
		if (window.initData.chatNotification) model.topMenuViews.showChat = true
		personal.preferredColour = window.initData.preferredBusColour
		personal.yourTurnAudioType = window.initData.yourTurnAudioType

		// Set up and save new game
		if (window.initData.gameData === "") {
			const COLOURS = shuffle([constants.BLUE, constants.GREEN, constants.PURPLE, constants.RED, constants.YELLOW])
			for (let i = 0; i < window.initData.playerNames.length; i++) {
				model.players.push({
					name: window.initData.playerNames[i],
					displayName: "",
					colour: COLOURS[i],
					score: 0.5, // Start at ZERO POINT FIVE
					maxScore: 0.5,
					remainingActions: 20, // Start with 20
					timeStones: 0,
					buses: 1, // Total of 5, start with 1
					endJunctions: [],
					endLines: [],
					playerJunctions: [],
					passActionsFlag: false,
				})
			}
			// Now insert display names
			for (let i = 0; i < model.players.length; i++) {
				if (model.players[i].name === "SHADOW" && window.initData.displayNames != undefined) model.players[i].displayName = window.initData.displayNames[0]
				else if (model.players[i].name === "SHADOW_2" && window.initData.displayNames != undefined) model.players[i].displayName = window.initData.displayNames[1]
				else if (model.players[i].name === "SHADOW_3" && window.initData.displayNames != undefined) model.players[i].displayName = window.initData.displayNames[2]
				else if (model.players[i].name === "SHADOW_4" && window.initData.displayNames != undefined) model.players[i].displayName = window.initData.displayNames[3]
				else model.players[i].displayName = model.players[i].name
			}
			for (let i = 0; i < model.players.length; i++) {
				model.gameflow.turnOrder.push(i)
				model.gameflow.fullTurnOrder.push(i)
			}
			// 3p remove one timestone
			if (model.players.length === 3) model.remainingTimeStones--
		} // End NEW GAME
		WS.StartWebSocket()
	} // end involved player

	// If new, save, otherwise, import data
	if (window.initData.pov == undefined && window.initData.gameData === "") {
		model.rewindErrorText = "The game has not yet started"
		// Create the <h1> element
		var heading = document.createElement("h1")

		// Set the text content of the <h1> element
		heading.textContent = "The game has not yet started"

		// Get a reference to the body element
		var body = document.body

		// Append the <h1> element to the body
		body.appendChild(heading)
	}
	else if (window.initData.gameData === "") IO.saveGame(true)
	else {
		// FInally, impport data
		model.importModel(window.initData.gameData)
		if (window.initData.pov != undefined) {
			personal.votedToDelete = model.deleteVotesData[personal.name]
			personal.votedToExclude = model.statsExcludeVotesData[personal.name]
		}
	}
} // end initGame

initGame()
model.startPlayerTurn() // Will return early anyway if ineligiible

document.addEventListener("keyup", function (event) {
	if (model.topMenuViews.showChat) return
	//if (event.altKey && event.which === 82)
	if (event.key == "ArrowLeft") {
		// left arrow
		if (model.topMenuViews.showReplay) replay.performStep(-1)
	} else if (event.key == "ArrowRight") {
		// right arrow
		if (model.topMenuViews.showReplay) replay.performStep(1)
	}
})

function getFlexiTimeString(playerName) {
	let KickoutFlexiDataArray = window.initData.KickoutFlexiDataArray
	let secondsIn24Hours = 24 * 60 * 60
	let playerSeconds = 0

	// Iterate over the KickoutFlexiDataArray to find the player's entry
	for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
		let entry = KickoutFlexiDataArray[i]

		// Check if the entry is a length-2 array and the first element matches the playerName
		if (Array.isArray(entry) && entry.length === 2 && entry[0] === playerName) {
			playerSeconds = entry[1]
			break
		}
	}

	let remainingSeconds = secondsIn24Hours - playerSeconds
	let hours = Math.floor(remainingSeconds / 3600)
	let minutes = Math.floor((remainingSeconds % 3600) / 60)

	// Set remaining time to 0 if it is negative
	hours = Math.max(hours, 0)
	minutes = Math.max(minutes, 0)

	// Format the hours and minutes as a string in the format hh:mm
	let formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`

	return formattedTime
}
</script>

<template>
	<TopMenu />
	<div id="wholeMiddleArea" :class="model.topMenuViews.showReplay ? 'greyBackground' : 'normalBackground'">
		<transition name="fadeMainArea">
			<div id="middle" v-if="!model.performingRewind">
				<TopMenuViews />
				<div id="boardContainer">
					<ReplayArea />
					<template v-if="!model.topMenuViews.generatingReplay">
						<div id="aboveBoardContainer">
							<div id="playerInfoContainer">
								<PlayerInfo />
							</div>
							<div id="actionAreaContainer">
								<ActionSelection />
							</div>
						</div>
						<div v-if="model.topMenuViews.showLoader" id="fLoadingBar"><img
								:src="view.getImage('loading-bar-black')" /></div>

						<ActionArea />

						<GameBoard />
						<DebugArea v-if="personal.name === 'admin'" />
					</template>
				</div>
			</div>
		</transition>
	</div>
	<div id="timesDiv">
		Flexi-Times:
		<span v-for="(player, idx) in model.players" :key="idx">{{ player.name }}: {{ getFlexiTimeString(player.name)
		}}&nbsp;&nbsp;&nbsp;</span>
		&nbsp;&nbsp;&nbsp;
	</div>
	<FooterBar />
</template>

<style>
#timesDiv {
	text-align: center;
	margin: auto;
	font-weight: bolder;
}

.greyBackground {
	background-color: lightgray;
	transition: background-color 1s ease-in-out;
}

.normalBackground {
	background-color: #d4eafd;
	transition: background-color 1s ease-in-out;
}

#boardContainer {
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
	min-height: 500px;
	/* margin: auto;*/
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
}

.historyShowing {
	padding-left: max(454px, 100px);
	/*position: flex;*/
	/*left: 454px;*/
}

body {
	margin: 0px !important;
	background-color: #d4eafd;
	transition: background-color 1s ease-in-out;
	font-family: Arial, sans-serif;
}

.blue {
	color: blue;
}

.green {
	color: green;
}

.purple {
	color: purple;
}

.red {
	color: red;
}

.yellow {
	color: yellow;
}

#middle {
	width: 100%;
	min-width: 970px;
}

#aboveBoardContainer {
	width: 100%;
	max-width: 1150px;
	min-width: 970px;
	display: flex;
	margin: auto;
	/*background-color: red;*/
}

#playerInfoContainer {
	flex: 1;
	/* background-color: green;*/
}

#actionAreaContainer {
	/* background-color: yellow;*/
	flex: 2;
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

.mainEntryPlayer0 {
	background-color: #3474a9;
}

.mainEntryPlayer1 {
	background-color: #456334;
}

.mainEntryPlayer2 {
	/*background-color: #51365F;*/
	background-color: #aa79ae;
}

.mainEntryPlayer3 {
	background-color: #a12529;
}

.mainEntryPlayer4 {
	background-color: #c28727;
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

.actionsLineButton:active {
	background-color: darkgrey;
}
</style>
