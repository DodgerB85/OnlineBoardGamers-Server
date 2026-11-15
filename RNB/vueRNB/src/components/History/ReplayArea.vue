<script setup>
/*import * as history from '../js/RNBhistory'
import * as model from '../js/RNBmodel'*/

//import * as rf from "../../js/RNBreference"
//import * as IO from '../backend/RNB_IO'
import * as replay from "./RNBreplay"
import * as IO from "../../backend/RNB_IO"
import i18n from "../../i18n"

import HistoryEntry from "./HistoryEntry.vue"

import { useModelStore } from "../../stores/RNBstore.js"
const store = useModelStore()
import { usePersonalStore } from "../../stores/RNBpersonal.js"
const personal = usePersonalStore()

import { nextTick, ref } from "vue"

const spinoffSuccessText = ref("")
const spinoffErrorText = ref("")
const copyMessage = ref("")

function performStep(amount) {
	store.clearMessages()
	spinoffSuccessText.value = ""
	spinoffErrorText.value = ""
	replay.performStep(amount)
}

function setReplayStep(event) {
	const index = Number(event.target.value)
	if (index === store.replayStep.index) return
	store.clearHistoryHelpers()
	store.clearMessages()
	replay.goToReplayStep(index)
}

async function localCopyGameToPracticeGame2() {
	spinoffSuccessText.value = ""
	spinoffErrorText.value = ""
	const result = await IO.copyGameToNewPracticeGame()
	if (result?.newID) {
		const url = `${window.location.origin}/RNB/${result.newID}/show/`
		spinoffSuccessText.value = `${i18n.global.t("replay.gameCreated")} <a href="${url}" target="_blank" rel="noopener">${url}</a>`
	} else {
		spinoffErrorText.value = i18n.global.t("replay.copyGameError")
	}
}

function copyToClipboard() {
	const textToCopy = "https://www.onlineboardgamers.com/RNB/" + String(personal.gameID) + "/replay/" + String(store.replayStep.computedHistoryIndex + 1) // Replace with the desired text to copy

	const textarea = document.createElement("textarea")
	textarea.value = textToCopy
	document.body.appendChild(textarea)

	textarea.select()
	document.execCommand("copy")

	document.body.removeChild(textarea)

	copyMessage.value = i18n.global.t("replay.copiedToClipboard", { url: textToCopy })

	// Position the popup after its new text has been rendered, so it is centred and fully on-screen.
	nextTick(() => {
		const button = document.getElementById("copyURLbutton")
		const popup = document.getElementById("popup")

		// Hide any existing popup and reset the timer
		clearTimeout(popup.fadeTimeout)

		popup.style.opacity = "1"
		popup.style.display = "block"

		const buttonRect = button.getBoundingClientRect()
		const popupRect = popup.getBoundingClientRect()
		const below = buttonRect.bottom + 10
		// Flip above the button when a bottom-positioned bar leaves no room underneath.
		const offsetTop = below + popupRect.height <= window.innerHeight ? below : buttonRect.top - popupRect.height - 10
		const offsetLeft = Math.max(10, Math.min(window.innerWidth - popupRect.width - 10, buttonRect.left + (buttonRect.width - popupRect.width) / 2))

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
	})
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
		<div id="replayArea" :class="{ replayAtBottom: store.viewSettings.replayAtBottom }">
			<button v-if="personal.pov >= 0" class="actionsLineButton" :disabled="shouldDisableBackwardsReplay()" @click="performStep(-999)">{{ $t("replay.backToMyLastMove") }}</button>
			<button class="actionsLineButton" :disabled="shouldDisableBackwardsReplay()" @click="performStep(-99)">|&lt;</button>
			<button class="actionsLineButton" :disabled="shouldDisableBackwardsReplay()" @click="performStep(-9)">&lt;&lt;</button>
			<button class="actionsLineButton" :disabled="shouldDisableBackwardsReplay()" @click="performStep(-1)">&lt;</button>
			<input type="range" min="0" :max="Math.max(0, store.replayData.length - 1)" :value="store.replayStep.index" :aria-label="$t('replay.stepAria')" @input="setReplayStep" />
			<div id="replayStepSpan">
				{{ store.replayStep.computedHistoryIndex + 1 }} / {{ store.computedHistory.length }}
				<template v-if="store.replayStep.subStep !== -1">{{ $t("replay.step", { current: store.replayStep.subStep + 1, total: store.replayStep.maxStep + 1 }) }}</template>
			</div>
			<button class="actionsLineButton" :disabled="shouldDisableForwardsReplay()" @click="performStep(1)">&gt;</button>
			<button class="actionsLineButton" :disabled="shouldDisableForwardsReplay()" @click="performStep(9)">&gt;&gt;</button>
			<button class="actionsLineButton" :disabled="shouldDisableForwardsReplay()" @click="performStep(99)">&gt;|</button>

			<template v-if="personal.name != undefined">
				<button @click="localCopyGameToPracticeGame2()" class="actionsLineButton">
					{{ $t("replay.copyGame") }}
					<br />
					{{ $t("replay.toNewGame") }}
				</button>
				<button @click="store.viewSettings.replayAtBottom = !store.viewSettings.replayAtBottom" class="actionsLineButton">
					<template v-if="!store.viewSettings.replayAtBottom">
						{{ $t("replay.moveUi") }}
						<br />
						{{ $t("replay.toBottom") }}
						<b>▼</b>
					</template>
					<template v-if="store.viewSettings.replayAtBottom">
						{{ $t("replay.moveUi") }}
						<br />
						{{ $t("replay.toTop") }}
						<b>▲</b>
					</template>
				</button>
			</template>

			<button id="copyURLbutton" @click="copyToClipboard" class="actionsLineButton">{{ $t("replay.copyUrl") }}</button>
			<div id="popup" class="popup">{{ copyMessage }}</div>
		</div>

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

#replayArea {
	position: sticky;
	top: 0;
	z-index: 9998;
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: center;
	gap: 8px;
	background: #d4eafd;
	border: 1px solid black;
	padding: 8px;
	margin: 10px 12px 0;
	text-align: center;
	font-size: 16px;
	font-weight: 400;
}

/* In the bottom position the bar follows the map's bottom edge instead. */
#replayArea.replayAtBottom {
	top: auto;
	bottom: 0;
}

#replayArea input[type="range"] {
	width: min(300px, 35vw);
}

#replayStepSpan {
	display: inline-block;
	min-width: 160px;
}

.replayHistoryEntry {
	width: fit-content;
	margin: auto;
	min-height: 111px;
}

.actionsLineButton {
	margin: 0;
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
	position: fixed;
	z-index: 10000;
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
