<script setup>
import * as rf from "../js/WEBreference"
import * as funcs from "../js/WEBfuncs"
import * as replay from "../js/WEBreplay"
import * as IO from "../backend/WEB_IO"

import HistoryEntry from "./HistoryEntry.vue"

import { useModelStore } from "../stores/WEBstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/WEBpersonal.js"
const personal = usePersonalStore()

import { nextTick, ref } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

const copyMessage = ref("")
const spinoffSuccessText = ref("")
const spinoffErrorText = ref("")

async function localCopyGameToPracticeGame() {
	spinoffErrorText.value = ""
	spinoffSuccessText.value = ""
	const result = await IO.copyGameToNewPracticeGame()
	if (result?.newID) {
		const url = `${window.location.origin}/WEB/${result.newID}/show/`
		const note = store.gameflow.phase === rf.PHASE_GAME_OVER ? "" : ` ${t("replay.hiddenDataNote")}`
		spinoffSuccessText.value = `${t("replay.gameCreated")} <a href="${url}" target="_blank" rel="noopener">${t("topMenuViews.here")}</a>${note}`
	} else {
		spinoffErrorText.value = t("replay.copyGameError")
	}
}

function setReplayStep(event) {
	const step = Number(event.target.value)
	if (step === store.replayStep) return
	store.clearHistoryHelpers()
	replay.goToReplayStep(step)
}

function performStep(amount) {
	store.clearMessages()
	replay.performStep(amount)
}

function copyToClipboard() {
	const textToCopy = "https://www.onlineboardgamers.com/WEB/" + String(personal.gameID) + "/replay/" + String(store.replayStep + 1)

	const textarea = document.createElement("textarea")
	textarea.value = textToCopy
	document.body.appendChild(textarea)

	textarea.select()
	document.execCommand("copy")

	document.body.removeChild(textarea)

	copyMessage.value = t("replay.copied", { url: textToCopy })

	// Position after the new text renders, so the popup is centred and on-screen.
	nextTick(() => {
		const button = document.getElementById("copyURLbutton")
		const popup = document.getElementById("popup")

		clearTimeout(popup.fadeTimeout)

		popup.style.opacity = "1"
		popup.style.display = "block"

		const buttonRect = button.getBoundingClientRect()
		const popupRect = popup.getBoundingClientRect()
		const below = buttonRect.bottom + 10
		const offsetTop = below + popupRect.height <= window.innerHeight ? below : buttonRect.top - popupRect.height - 10
		const offsetLeft = Math.max(10, Math.min(window.innerWidth - popupRect.width - 10, buttonRect.left + (buttonRect.width - popupRect.width) / 2))

		popup.style.top = offsetTop + "px"
		popup.style.left = offsetLeft + "px"

		popup.fadeTimeout = setTimeout(() => {
			popup.style.opacity = "0"
			setTimeout(() => {
				popup.style.display = "none"
			}, 300)
		}, 2000)
	})
}
</script>

<template>
	<template v-if="store.viewSettings.showReplay">
		<div id="replayArea" :class="{ replayAtBottom: store.viewSettings.replayAtBottom }">
			<button v-if="personal.pov >= 0" class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-999)">{{ $t("replay.backToMyLastMove") }}</button>
			<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-99)">|&lt;</button>
			<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-9)">&lt;&lt;</button>
			<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-1)">&lt;</button>
			<input type="range" min="0" :max="Math.max(0, store.replayData.length - 1)" :value="store.replayStep"
				:aria-label="$t('replay.stepAria')" @input="setReplayStep" />
			<span class="replayStepSpan">{{ store.replayStep + 1 }} / {{ store.replayData.length }}</span>
			<button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1" @click="performStep(1)">&gt;</button>
			<button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1" @click="performStep(9)">&gt;&gt;</button>
			<button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1" @click="performStep(99)">&gt;|</button>

			<template v-if="personal.pov >= 0">
				<button @click="localCopyGameToPracticeGame()" class="actionsLineButton">
					{{ $t("replay.copyThisGame") }}<br />{{ $t("replay.toNewGame") }}
				</button>
				<button @click="store.viewSettings.replayAtBottom = !store.viewSettings.replayAtBottom" class="actionsLineButton">
					<template v-if="!store.viewSettings.replayAtBottom">{{ $t("replay.moveUi") }} <b>▼</b></template>
					<template v-else>{{ $t("replay.moveUi") }} <b>▲</b></template>
				</button>
			</template>

			<button id="copyURLbutton" @click="copyToClipboard" class="actionsLineButton">{{ $t("replay.copyUrl") }}</button>
			<div id="popup" class="popup">{{ copyMessage }}</div>
		</div>

		<div v-if="spinoffSuccessText !== ''" class="spinoffSuccessText" v-html="spinoffSuccessText"></div>
		<div v-if="spinoffErrorText !== ''" class="spinoffErrorText">{{ spinoffErrorText }}</div>
		<div v-if="!store.viewSettings.generatingReplay" class="replayHistoryEntry">
			<HistoryEntry :entry="store.computedHistory[store.replayStep]" :entry_-i-d="-1" />
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

.replayHistoryEntry {
	width: fit-content;
	margin: auto;
	min-height: 111px;
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

#replayArea.replayAtBottom {
	top: auto;
	bottom: 0;
}

#replayArea input[type="range"] {
	width: min(300px, 35vw);
}

.replayStepSpan {
	min-width: 100px;
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

.actionsLineButton {
	margin: 0;
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
</style>
