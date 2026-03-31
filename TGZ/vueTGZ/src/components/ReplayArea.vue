<script setup>
import * as history from "../js/TGZhistory"
import * as IO from "../js/TGZ_IO"
import * as rf from "../js/TGZreference"
import * as model from "../js/TGZmodel"

import HistoryEntry from "./HistoryEntry.vue"

import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/TGZpersonal.js"
const personal = usePersonalStore()

import { ref } from "vue"

const spinoffSuccessText = ref("")
const spinoffErrorText = ref("")
const copyMessage = ref("https://www.onlineboardgamers.com/TGZ/110/replay/5 Copied to Clipboard")

function performStep(amount) {
	spinoffSuccessText.value = ""
	spinoffErrorText.value = ""
	history.performStep(amount)
}

async function localCopyGameToPracticeGame2() {
	let copyStep = 0
	// Check if we are at the end of the data
	if (store.replayStep === store.replayData.length - 1) {
		// Need to check if at data end AND game is over
		if (store.history[store.history.length - 1][0] === rf.HIST_GAME_END) {
			spinoffErrorText.value = "Please step back to a player move before copying the game"
			return
		}
		copyStep = store.replayStep + 1
	} else {
		// We are not at the end of the data. So go forwards
		copyStep = store.replayStep + 1
		// Continue going forwards until we can spinoff
		let allowedSpinoffPoints = [rf.HIST_BUILD_FIRST_MON, rf.HIST_BID, rf.HIST_CHOOSE_god, rf.HIST_CHOOSE_SPEC, rf.HIST_ACTIVATE_SPEC, rf.HIST_BUILD_MON, rf.HIST_RAISE_MON, rf.HIST_BUILD_CRAFTSMAN, rf.HIST_SET_PRICES, rf.HIST_ADD_HERD_COWS, rf.HIST_BUILD_WATER, rf.HIST_BUILD_RESOURCE]
		while (copyStep < store.history.length && !allowedSpinoffPoints.includes(store.history[copyStep][0])) {
			copyStep++
		}
	}

	let result = await IO.copyGameToNewPracticeGame(copyStep)
	if (result.response) spinoffSuccessText.value = 'Game Created. View in Lobby or click <a href="/TGZ/' + String(result.newID) + '/show/" target="_blank"/>Here</a>'
	else spinoffErrorText.value = "Error Creating a New Game"
}

function copyToClipboard() {
	const textToCopy = "https://www.onlineboardgamers.com/TGZ/" + String(personal.gameID) + "/replay/" + String(store.replayStep + 1) // Replace with the desired text to copy

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

function moveReplayUIupDown() {
	if (store.topMenuViews.replayUIlocation === 0) {
		store.topMenuViews.replayUIlocation = 1
	} else store.topMenuViews.replayUIlocation = 0
}

function moveReplayUIsplitScreen() {
	if (store.topMenuViews.replayUIlocation === 2) {
		store.topMenuViews.replayUIlocation = 0
	} else store.topMenuViews.replayUIlocation = 2
}
</script>

<template>
	<template v-if="store.topMenuViews.showReplay">
		<div id="mapInspectorButtonDiv">
			<button @click="model.toggleMapInspector" class="actionsLineButton">
				<span v-if="!store.topMenuViews.mapInspectorMode">Enable</span>
				<span v-else>Disable</span>
				<br />
				Map
				<br />
				Inspector
			</button>
			<template v-if="store.topMenuViews.mapInspectorMode">
				<br />
				<input type="checkbox" id="mapInspectorEshuCheckbox" v-model="store.topMenuViews.mapInspectorEshu" />
				<label for="mapInspectorEshuCheckbox">Use Eshu</label>
			</template>
		</div>
		<button v-if="personal.pov >= 0" class="actionsLineButton" :disabled="store.replayStep === 0"
			@click="performStep(-999)">Back to my last move</button>
		<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-99)">|&lt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-9)">&lt;&lt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-1)">&lt;</button>
		{{ store.replayStep + 1 }} / {{ store.replayData.length }}
		<button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1"
			@click="performStep(1)">&gt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1"
			@click="performStep(9)">&gt;&gt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1"
			@click="performStep(99)">&gt;|</button>

		<div class="copyGameButtonDiv" v-if="personal.name != undefined">
			<button @click="localCopyGameToPracticeGame2()" class="actionsLineButton">
				Copy This Game
				<br />
				To New Game
			</button>
			<button v-if="store.topMenuViews.replayUIlocation !== 2" @click="moveReplayUIupDown()"
				class="actionsLineButton">
				<template v-if="store.topMenuViews.replayUIlocation === 0">
					Move UI
					<br />
					to Bottom
					<b>▼</b>
				</template>
				<template v-if="store.topMenuViews.replayUIlocation === 1">
					Move UI
					<br />
					to Top
					<b>▲</b>
				</template>
			</button>
			<button @click="moveReplayUIsplitScreen()" class="actionsLineButton">
				<template v-if="store.topMenuViews.replayUIlocation !== 2">
					<b>◀</b>
					Split
					<b>▶</b>
					<br />
					Screen UI
				</template>
				<template v-if="store.topMenuViews.replayUIlocation === 2">
					<b>▶</b>
					Single
					<b>◀</b>
					<br />
					Screen UI
				</template>
			</button>
		</div>
		<br />
		Use the arrows to step through the game. This will not alter the current game in any way
		<br />
		<button id="copyURLbutton" @click="copyToClipboard" class="actionsLineButton">Copy URL to this move to
			clipboard</button>
		<div id="popup" class="popup">{{ copyMessage }}</div>

		<div v-if="spinoffSuccessText !== ''" class="spinoffSuccessText" v-html="spinoffSuccessText"></div>
		<div v-if="spinoffErrorText !== ''" class="spinoffErrorText">{{ spinoffErrorText }}</div>
		<div v-if="!store.topMenuViews.generatingReplay" class="replayHistoryEntry">
			<HistoryEntry :entry="store.history[store.replayStep]" :entry_-i-d="-1" />
		</div>

		<template v-if="store.topMenuViews.mapInspectorMode && store.topMenuViews.showReplay">
			<br />
			Click an item to view ranges. Hubs Used:
			<span class="hubRangeSq hubRangeSq0">0</span>
			<span v-for="idx in Math.max(store.topMenuViews.hubRangesToHighlight.length - 1, 0)" :key="idx"
				class="hubRangeSq" :class="'hubRangeSq' + String(idx % 8)">
				{{ idx }}
			</span>
			<br />
			<br />
		</template>
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

#mapInspectorButtonDiv {
	display: inline-block;
	vertical-align: middle;
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
