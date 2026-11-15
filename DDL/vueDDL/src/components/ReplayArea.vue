<script setup>
import { nextTick, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import * as replay from "../js/DDLreplay.js"
import * as IO from "../backend/DDL_IO.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"
import HistoryEntry from "./HistoryEntry.vue"

const { t } = useI18n()
const store = useModelStore()
const personal = usePersonalStore()

const copyMessage = ref("")
const spinoffSuccessText = ref("")
const spinoffErrorText = ref("")

onMounted(() => {
	if (store.replayData.length === 0) replay.buildReplayData()
	if (window.initData?.spoilerFree) replay.applyStep(Number(window.initData.replayStep) || 0)
})

function step(amount) {
	replay.performStep(amount)
}

function setReplayStep(event) {
	replay.applyStep(Number(event.target.value))
}

function exitReplay() {
	replay.exitReplay()
}

async function copyGameToNewPracticeGame() {
	spinoffErrorText.value = ""
	spinoffSuccessText.value = ""
	const result = await IO.copyGameToNewPracticeGame()
	if (result?.newID) {
		const url = `${window.location.origin}/DDL/${result.newID}/show/`
		spinoffSuccessText.value = `${t("replay.gameCreated")} <a href="${url}" target="_blank" rel="noopener">${url}</a>`
	} else {
		spinoffErrorText.value = t("replay.copyGameError")
	}
}

function copyToClipboard() {
	const textToCopy = `${window.location.origin}/DDL/${personal.gameID}/replay/${store.replayStep + 1}`
	const textarea = document.createElement("textarea")
	textarea.value = textToCopy
	document.body.appendChild(textarea)
	textarea.select()
	document.execCommand("copy")
	document.body.removeChild(textarea)

	copyMessage.value = t("replay.copiedToClipboard", { url: textToCopy })

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
	<div id="replayArea">
		<h2>{{ $t("replay.title") }}</h2>
		<button v-if="personal.pov >= 0" class="actionsLineButton" :disabled="store.replayStep === 0" @click="step(-99)">|&lt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep === 0" @click="step(-1)">&lt;</button>
		<input type="range" min="0" :max="Math.max(0, store.replayData.length - 1)" :value="store.replayStep"
			:aria-label="$t('replay.stepAria')" @input="setReplayStep" />
		<span class="replayStepSpan">{{ store.replayStep + 1 }} / {{ store.replayData.length }}</span>
		<button class="actionsLineButton" :disabled="store.replayStep >= store.replayData.length - 1" @click="step(1)">&gt;</button>
		<button class="actionsLineButton" :disabled="store.replayStep >= store.replayData.length - 1" @click="step(99)">&gt;|</button>
		<button v-if="personal.pov >= 0" class="actionsLineButton" @click="copyGameToNewPracticeGame">{{ $t("replay.copyThisGame") }}<br />{{ $t("replay.toNewGame") }}</button>
		<button id="copyURLbutton" class="actionsLineButton" @click="copyToClipboard">{{ $t("replay.copyUrl") }}</button>
		<button class="actionsLineButton" @click="exitReplay">{{ $t("replay.exit") }}</button>
		<div id="popup" class="popup">{{ copyMessage }}</div>
	</div>
	<div v-if="spinoffSuccessText !== ''" class="spinoffSuccessText" v-html="spinoffSuccessText"></div>
	<div v-if="spinoffErrorText !== ''" class="spinoffErrorText">{{ spinoffErrorText }}</div>
	<div v-if="store.history[store.replayStep]" class="replayEntry">
		<HistoryEntry :entry="store.history[store.replayStep]" :index="store.replayStep" />
	</div>
</template>

<style scoped>
#replayArea {
	position: sticky;
	top: 0;
	z-index: 9998;
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: center;
	gap: 8px;
	border: 2px solid black;
	background-color: #f4f4f4;
	padding: 8px;
	margin: 6px auto;
	width: min(1000px, calc(100% - 24px));
	text-align: center;
	font-size: 16px;
	font-weight: 400;
}

#replayArea input[type="range"] {
	width: min(300px, 35vw);
}

.replayStepSpan {
	min-width: 100px;
}

.replayEntry {
	width: 100%;
	margin-top: 8px;
	background: #fff;
}

.spinoffSuccessText,
.spinoffErrorText {
	width: 100%;
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
	border: 2px solid green;
	border-radius: 5px;
	font-weight: bolder;
	padding: 5px 9px;
	cursor: pointer;
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
