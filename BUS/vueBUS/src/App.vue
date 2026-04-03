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

//import * as rf from "./js/BUSreference.js"
//import * as IO from "./backend/BUS_IO"
//import * as WS from "./backend/BUSwebsocket"
//import * as funcs from "./js/BUSfuncs.js"
import * as controller from "./js/BUScontroller.js"
import * as replay from "./js/BUSreplay"
import * as view from "./js/BUSview.js"
import { initGame } from "./js/BUSmodel.js"

import TopMenu from "./components/TopMenu.vue"
import GameBoard from "./components/GameBoard.vue"
import PlayerInfo from "./components/PlayerInfo.vue"
import ActionSelection from "./components/ActionSelection.vue"
import FooterBar from "./components/FooterBar.vue"
import ActionArea from "./components/ActionArea.vue"
import DebugArea from "./components/DebugArea.vue"
import TopMenuViews from "./components/TopMenuViews.vue"
import ReplayArea from "./components/ReplayArea.vue"

import { useModelStore } from "./stores/BUSstore.js"

const store = useModelStore()
import { usePersonalStore } from "./stores/BUSpersonal.js"
const personal = usePersonalStore()

initGame()
controller.startPlayerTurn() // Will return early anyway if ineligiible

document.addEventListener("keyup", function (event) {
	if (store.topMenuViews.showChat) return
	//if (event.altKey && event.which === 82)
	if (event.key == "ArrowLeft") {
		// left arrow
		if (store.topMenuViews.showReplay) replay.performStep(-1)
	} else if (event.key == "ArrowRight") {
		// right arrow
		if (store.topMenuViews.showReplay) replay.performStep(1)
	}
})

// THis is needed as it's used right here to display under the board
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
	<div id="wholeMiddleArea" :class="store.topMenuViews.showReplay ? 'greyBackground' : 'normalBackground'">
		<transition name="fadeMainArea">
			<div id="middle" v-if="!store.performingRewind">
				<TopMenuViews />
				<div id="boardContainer">
					<ReplayArea />
					<template v-if="!store.topMenuViews.generatingReplay">
						<div id="aboveBoardContainer">
							<div id="playerInfoContainer">
								<PlayerInfo />
							</div>
							<div id="actionAreaContainer">
								<ActionSelection />
							</div>
						</div>
						<div v-if="store.topMenuViews.showLoader" id="fLoadingBar"><img
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
		<span v-for="(player, idx) in store.players" :key="idx">{{ player.name }}: {{ getFlexiTimeString(player.name)
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
