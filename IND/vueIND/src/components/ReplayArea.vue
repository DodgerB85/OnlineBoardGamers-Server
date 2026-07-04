<script setup>
/*import * as history from '../js/INDhistory'
import * as model from '../js/INDmodel'*/

import * as rf from "../js/INDreference"
import * as IO from "../backend/IND_IO"
import * as replay from "../js/INDreplay"

import HistoryEntry from "./HistoryEntry.vue"

import { useModelStore } from "../stores/INDstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/INDpersonal.js"
const personal = usePersonalStore()

import { ref } from "vue"

const spinoffSuccessText = ref("")
const spinoffErrorText = ref("")
const copyMessage = ref("https://www.onlineboardgamers.com/IND/110/replay/5 Copied to Clipboard")

function performStep(amount) {
	store.clearMessages()
	spinoffSuccessText.value = ""
	spinoffErrorText.value = ""
	replay.performStep(amount)
}

async function localCopyGameToPracticeGame() {
	if (store.hiddenMoney && store.actualGameState.finishedGame !== rf.PHASE_GAME_OVER) {
		spinoffErrorText.value = "You cannot copy a hidden money game until it has finished"
		return
	}
	if (store.gameflow.phase === rf.PHASE_NEW_ERA && store.actualGameState.era === rf.ERA_A) {
		spinoffErrorText.value = "You cannot copy a game before the first cities have all been placed"
		return
	}
	let copyStep = 0
	// Check if we are at the end of the data
	if (store.replayStep === store.replayData.length - 1) {
		// Need to check if at data end AND game is over
		if (store.computedHistory[store.computedHistory.length - 1][0] === rf.HIST_GAME_END) {
			spinoffErrorText.value = "Please step back to a player move before copying the game"
			return
		}
		copyStep = store.replayStep + 1
	} else {
		// We are not at the end of the data. So go forwards
		copyStep = store.replayStep + 1
		// Continue going forwards until we can spinoff
		let allowedSpinoffPoints = [rf.HIST_ADD_CITY, rf.HIST_TURN_ORDER_BID, rf.HIST_PASS_MERGER, rf.HIST_MERGER_WITHOUT_BIDDING, rf.HIST_MERGER_BIDDING, rf.HIST_ACQUIRE_COMPANY, rf.HIST_RND, rf.HIST_OPERATE_SHIPPING, rf.HIST_OPERATE_LAND, rf.HIST_SKIP_OPERATE_LAND, rf.HIST_OPERATE_LAND_PAID_EXPANSION_ONLY, rf.HIST_MANUAL_CITY_GROWTH, rf.HIST_MERGER_REMOVE_SIAP_FAJI_TERRS]
		while (copyStep > 0 && copyStep < store.computedHistory.length && !allowedSpinoffPoints.includes(store.computedHistory[copyStep][0])) {
			copyStep--
		}
	}

	let result = await IO.copyGameToNewPracticeGame(copyStep)
	if (result.response) spinoffSuccessText.value = 'Game Created. View in Lobby or click <a href="/IND/' + String(result.newID) + '/show/" target="_blank"/>Here</a>'
	else spinoffErrorText.value = "Error Creating a New Game"
}

function copyToClipboard() {
	const textToCopy = "https://www.onlineboardgamers.com/IND/" + String(personal.gameID) + "/replay/" + String(store.replayStep + 1) // Replace with the desired text to copy

	const textarea = document.createElement("textarea")
	textarea.value = textToCopy
	document.body.appendChild(textarea)

	textarea.select()
	document.execCommand("copy")

	document.body.removeChild(textarea)

	copyMessage.value = textToCopy + " Copied to Clipboard"

	const button = document.getElementById("copyURLbutton")
	const popup = document.getElementById("popup")

	// Hide any existing popup and reset the timer
	clearTimeout(popup.fadeTimeout)

	popup.style.opacity = "1"
	popup.style.display = "block"

	const buttonRect = button.getBoundingClientRect()
	const popupRect = popup.getBoundingClientRect()
	const offsetTop = buttonRect.top + buttonRect.height + 10 // Adjust the offset as needed
	const offsetLeft = buttonRect.left + (buttonRect.width - popupRect.width) / 2

	popup.style.top = offsetTop + "px"
	popup.style.left = offsetLeft + "px"

	// Fade out the popup after 2 seconds
	popup.fadeTimeout = setTimeout(() => {
		popup.style.opacity = "0"

		// Hide the popup after the fade-out animation completes
		setTimeout(() => {
			popup.style.display = "none"
		}, 300)
	}, 2000)
}
</script>

<template>
	<template v-if="store.topMenuViews.showReplay">
		<button v-if="personal.pov >= 0" class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-999)">Back to my last move</button>
		<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-99)">|&lt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-9)">&lt;&lt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-1)">&lt;</button>
		{{ store.replayStep + 1 }} / {{ store.replayData.length }}
		<button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1" @click="performStep(1)">&gt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1" @click="performStep(9)">&gt;&gt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1" @click="performStep(99)">&gt;|</button>

		<div class="copyGameButtonDiv" v-if="personal.name != undefined">
			<button @click="localCopyGameToPracticeGame()" class="actionsLineButton">
				Copy This Game
				<br />
				To New Game (BETA)
			</button>
			<button @click="store.topMenuViews.replayAtBottom = !store.topMenuViews.replayAtBottom" class="actionsLineButton">
				<template v-if="!store.topMenuViews.replayAtBottom">
					Move UI
					<br />
					to Bottom
					<b>▼</b>
				</template>
				<template v-if="store.topMenuViews.replayAtBottom">
					Move UI
					<br />
					to Top
					<b>▲</b>
				</template>
			</button>
		</div>

		<br />
		Use the arrows to step through the game. This will not alter the current game in any way
		<br />
		<button id="copyURLbutton" @click="copyToClipboard" class="actionsLineButton">Copy URL to this move to clipboard</button>
		<div id="popup" class="popup">{{ copyMessage }}</div>

		<div v-if="spinoffSuccessText !== ''" class="spinoffSuccessText" v-html="spinoffSuccessText"></div>
		<div v-if="spinoffErrorText !== ''" class="spinoffErrorText">{{ spinoffErrorText }}</div>
		<div v-if="!store.topMenuViews.generatingReplay" class="replayHistoryEntry">
			<HistoryEntry :entry="store.computedHistory[store.replayStep]" :entry_-i-d="-1" />
		</div>
	</template>

	<div v-if="store.topMenuViews.generatingReplay" class="progress-bar" id="progressBarID">
		<div id="pBarEl"></div>
		<span id="pBarTextEl"></span>
	</div>
</template>

<style scoped>
.progress-bar {
	border-radius: 5px;
	width: 80%;
	margin: auto;
	background-color: #999;
	height: 30px;
	position: relative;
}

.progress-bar div {
	border-radius: 5px;
	background-color: #1f1f85;
	height: 30px;
	width: 0%;
}

.progress-bar span {
	position: absolute;
	top: 0;
	left: 0;
	display: block;
	width: 100%;
	text-align: center;
	color: #fff;
	margin-top: 5px;
	font-family: Verdana;
}

.spinoffSuccessText,
.spinoffErrorText {
	font-size: 20px;
	margin: 10px;
	padding: 10px;
	font-weight: bold;
}

.spinoffSuccessText {
	color: darkgreen;
	background-color: lightblue;
}

.spinoffErrorText {
	color: darkred;
	background-color: lightblue;
}

.copyGameButtonDiv {
	display: inline-block;
	vertical-align: middle;
}

.replayHistoryEntry {
	width: fit-content;
	margin: auto;
	min-height: 111px;
}

.actionsLineButton {
	margin: 10px;
	/*width: 100px;*/
	width: fit-content;
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
}

.actionsLineButton:hover:enabled {
	background-color: lightgrey;
}

.actionsLineButton:disabled {
	background-color: darkgray;
}

.popup {
	position: absolute;
	background-color: #f7f7f7;
	padding: 10px;
	border-radius: 4px;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	opacity: 0;
	transition: opacity 0.3s;
}

.fade-in {
	opacity: 1;
}

.fade-out {
	opacity: 0;
}
</style>
