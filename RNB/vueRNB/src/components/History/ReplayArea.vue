<script setup>
/*import * as history from '../js/RNBhistory'
import * as model from '../js/RNBmodel'*/

//import * as rf from "../../js/RNBreference"
//import * as IO from '../backend/RNB_IO'
import * as replay from "./RNBreplay"

import HistoryEntry from "./HistoryEntry.vue"

import { useModelStore } from "../../stores/RNBstore.js"
const store = useModelStore()
import { usePersonalStore } from "../../stores/RNBpersonal.js"
const personal = usePersonalStore()

import { ref } from "vue"

const spinoffSuccessText = ref("")
const spinoffErrorText = ref("")
const copyMessage = ref("https://www.onlineboardgamers.com/RNB/110/replay/5 Copied to Clipboard")

function performStep(amount) {
	store.clearMessages()
	spinoffSuccessText.value = ""
	spinoffErrorText.value = ""
	replay.performStep(amount)
}

async function localCopyGameToPracticeGame2() {
	store.gameMessages.rewindErrorText = "Not implemented yet"
}

function copyToClipboard() {
	const textToCopy = "https://www.onlineboardgamers.com/RNB/" + String(personal.gameID) + "/replay/" + String(store.replayStep.computedHistoryIndex + 1) // Replace with the desired text to copy

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

function shouldDisableBackwardsReplay() {
	return store.replayStep.computedHistoryIndex === 0
}

function shouldDisableForwardsReplay() {
	return store.replayStep.computedHistoryIndex === store.computedHistory.length - 1 && (store.replayStep.subStep === -1 || store.replayStep.subStep === store.replayStep.maxStep)
}
</script>

<template>
	<template v-if="store.viewSettings.showReplay">
		<button class="actionsLineButton" :disabled="shouldDisableBackwardsReplay()" @click="performStep(-99)">|&lt;</button>
		<button class="actionsLineButton" :disabled="shouldDisableBackwardsReplay()" @click="performStep(-9)">&lt;&lt;</button>
		<button class="actionsLineButton" :disabled="shouldDisableBackwardsReplay()" @click="performStep(-1)">&lt;</button>
		<div id="replayStepSpan">
		{{ store.replayStep.computedHistoryIndex + 1 }} / {{ store.computedHistory.length }}
		<template v-if="store.replayStep.subStep !== -1">Step: {{ store.replayStep.subStep + 1 }} / {{ store.replayStep.maxStep + 1 }}</template>
		</div>
		<button class="actionsLineButton" :disabled="shouldDisableForwardsReplay()" @click="performStep(1)">&gt;</button>
		<button class="actionsLineButton" :disabled="shouldDisableForwardsReplay()" @click="performStep(9)">&gt;&gt;</button>
		<button class="actionsLineButton" :disabled="shouldDisableForwardsReplay()" @click="performStep(99)">&gt;|</button>

		<!--<div class="copyGameButtonDiv" v-if="personal.name != undefined">
            <button @click="localCopyGameToPracticeGame(false)" class="actionsLineButton">
                Copy Game From<br />Before This Move<br />To Practice Game
            </button>
        </div>-->
		<div class="copyGameButtonDiv" v-if="personal.name != undefined">
			<button @click="localCopyGameToPracticeGame2()" class="actionsLineButton">
				Copy This Game
				<br />
				To New Game
			</button>
			<button @click="store.viewSettings.replayAtBottom = !store.viewSettings.replayAtBottom" class="actionsLineButton">
				<template v-if="!store.viewSettings.replayAtBottom">
					Move UI
					<br />
					to Bottom
					<b>▼</b>
				</template>
				<template v-if="store.viewSettings.replayAtBottom">
					Move UI
					<br />
					to Top
					<b>▲</b>
				</template>
			</button>
		</div>
		<!--<div v-if="personal.name != undefined && store.replayStep === store.replayData.length - 1 && store.gameflow.phase !== rf.PHASE_GAME_OVER"
            class="copyGameButtonDiv">
            <button @click="localCopyGameToPracticeGame(true)" class="actionsLineButton">
                Copy Game From<br />After This Move<br />To Practice Game
            </button>
        </div>-->
		<br />
		Use the arrows to step through the game. This will not alter the current game in any way
		<br />
		<button id="copyURLbutton" @click="copyToClipboard" class="actionsLineButton">Copy URL to this move to clipboard</button>
		<div id="popup" class="popup">{{ copyMessage }}</div>

		<div v-if="spinoffSuccessText !== ''" class="spinoffSuccessText" v-html="spinoffSuccessText"></div>
		<div v-if="spinoffErrorText !== ''" class="spinoffErrorText">{{ spinoffErrorText }}</div>
		<div v-if="!store.viewSettings.generatingReplay" class="replayHistoryEntry">
			<HistoryEntry :entry="store.computedHistory[store.replayStep.computedHistoryIndex]" :entry_-i-d="-1" :singleStackEntryID="store.replayStep.subStep" />
		</div>
	</template>

	<div v-if="store.viewSettings.generatingReplay" class="progress-bar" id="progressBarID">
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

#replayStepSpan {
	display: inline-block;
	min-width: 215px;
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
