<script setup>
import * as history from "../js/TGZhistory"
import * as IO from "../js/TGZ_IO"
import * as rf from "../js/TGZreference"
import HistoryEntry from "./HistoryEntry.vue"
import MapInspectorButton from "./utils/MapInspectorButton.vue"
import HubRangeLegend from "./utils/HubRangeLegend.vue"

import { useModelStore } from "../stores/TGZstore.js"
const store = useModelStore()
import { usePersonalStore } from "../stores/TGZpersonal.js"
const personal = usePersonalStore()

import { ref } from "vue"
import i18n from "../i18n"
const t = i18n.global.t

const spinoffSuccessText = ref("")
const spinoffErrorText = ref("")
const copyMessage = ref("")

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
			spinoffErrorText.value = t("replay.stepBackBeforeCopy")
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
	if (result.response) spinoffSuccessText.value = t("replay.gameCreated") + ' <a href="/TGZ/' + String(result.newID) + '/show/" target="_blank"/>' + t("replay.here") + "</a>"
	else spinoffErrorText.value = t("replay.errorCreating")
}

function copyToClipboard() {
	const textToCopy = "https://www.onlineboardgamers.com/TGZ/" + String(personal.gameID) + "/replay/" + String(store.replayStep + 1) // Replace with the desired text to copy

	const textarea = document.createElement("textarea")
	textarea.value = textToCopy
	document.body.appendChild(textarea)

	textarea.select()
	document.execCommand("copy")

	document.body.removeChild(textarea)

	copyMessage.value = t("replay.copiedToClipboard", { url: textToCopy })

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
		<MapInspectorButton prefix="replay" show-eshu />
		<button v-if="personal.pov >= 0" class="actionsLineButton" :disabled="store.replayStep === 0"
			@click="performStep(-999)">{{ $t("replay.backToMyLastMove") }}</button>
		<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-99)" :title="$t('replay.first')" :aria-label="$t('replay.first')">|&lt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-9)" :title="$t('replay.backFive')" :aria-label="$t('replay.backFive')">&lt;&lt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="performStep(-1)" :title="$t('replay.backOne')" :aria-label="$t('replay.backOne')">&lt;</button>
		{{ store.replayStep + 1 }} / {{ store.replayData.length }}
		<button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1"
			@click="performStep(1)" :title="$t('replay.forwardOne')" :aria-label="$t('replay.forwardOne')">&gt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1"
			@click="performStep(9)" :title="$t('replay.forwardFive')" :aria-label="$t('replay.forwardFive')">&gt;&gt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === store.replayData.length - 1"
			@click="performStep(99)" :title="$t('replay.last')" :aria-label="$t('replay.last')">&gt;|</button>

		<div class="copyGameButtonDiv" v-if="personal.name != undefined">
			<button @click="localCopyGameToPracticeGame2()" class="actionsLineButton">
				{{ $t("replay.copyThisGame") }}
				<br />
				{{ $t("replay.toNewGame") }}
			</button>
			<button v-if="store.topMenuViews.replayUIlocation !== 2" @click="moveReplayUIupDown()"
				class="actionsLineButton">
				<template v-if="store.topMenuViews.replayUIlocation === 0">
					{{ $t("replay.moveUiToBottom") }}
					<b>▼</b>
				</template>
				<template v-if="store.topMenuViews.replayUIlocation === 1">
					{{ $t("replay.moveUiToTop") }}
					<b>▲</b>
				</template>
			</button>
			<button @click="moveReplayUIsplitScreen()" class="actionsLineButton">
				<template v-if="store.topMenuViews.replayUIlocation !== 2">
					<b>◀</b>
					{{ $t("replay.splitScreen") }}
					<b>▶</b>
				</template>
				<template v-if="store.topMenuViews.replayUIlocation === 2">
					<b>▶</b>
					{{ $t("replay.singleScreen") }}
					<b>◀</b>
				</template>
			</button>
		</div>
		<br />
		{{ $t("replay.useArrows") }}
		<br />
		<button id="copyURLbutton" @click="copyToClipboard" class="actionsLineButton">{{ $t("replay.copyUrl") }}</button>
		<div id="popup" class="popup">{{ copyMessage }}</div>

		<div v-if="spinoffSuccessText !== ''" class="spinoffSuccessText" v-html="spinoffSuccessText"></div>
		<div v-if="spinoffErrorText !== ''" class="spinoffErrorText">{{ spinoffErrorText }}</div>
		<div v-if="!store.topMenuViews.generatingReplay" class="replayHistoryEntry">
			<HistoryEntry :entry="store.history[store.replayStep]" :entry_-i-d="-1" />
		</div>

		<template v-if="store.topMenuViews.mapInspectorMode && store.topMenuViews.showReplay">
			<br />
			{{ $t("replay.clickItemRanges") }}
			<HubRangeLegend :ranges="store.topMenuViews.hubRangesToHighlight" />
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
