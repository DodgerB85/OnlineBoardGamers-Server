<script setup>
/** Client-side replay bar: step through recorded frames, copy a point, then exit. */
import { nextTick, ref } from "vue"
import { useI18n } from "vue-i18n"
import * as replay from "../js/ROWreplay"
import { useModelStore } from "../stores/ROWstore.js"
import { usePersonalStore } from "../stores/ROWpersonal.js"

const { t } = useI18n()
const store = useModelStore()
const personal = usePersonalStore()

const copyMessage = ref("")
const spinoffSuccessText = ref("")
const spinoffErrorText = ref("")

async function copyGameToNewPracticeGame() {
	spinoffErrorText.value = ""
	spinoffSuccessText.value = ""
	const result = await replay.copyGameToNewPracticeGame()
	if (result?.newID) {
		const url = `${window.location.origin}/ROW/${result.newID}/show/`
		spinoffSuccessText.value = `${t("app.gameCreated")} <a href="${url}" target="_blank" rel="noopener">${url}</a>`
	} else {
		spinoffErrorText.value = t("app.copyGameError")
	}
}

function copyToClipboard() {
	const textToCopy = `${window.location.origin}/ROW/${personal.gameID}/replay/${store.replayIndex + 1}`
	const textarea = document.createElement("textarea")
	textarea.value = textToCopy
	document.body.appendChild(textarea)
	textarea.select()
	document.execCommand("copy")
	document.body.removeChild(textarea)

	copyMessage.value = t("app.copiedToClipboard", { url: textToCopy })

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
	<div v-if="store.viewSettings.showReplay" id="replayArea">
		<button class="actionsLineButton" :disabled="store.replayIndex <= 0" @click="replay.performStep(-1)">&lt; {{ t("app.back") }}</button>
		<input type="range" min="0" :max="Math.max(0, store.replayFrames.length - 1)" :value="store.replayIndex"
			:aria-label="t('app.replayStep')" @input="replay.goToReplayStep($event.target.value)" />
		<span class="frame">{{ t("app.frame", { current: store.replayIndex + 1, total: store.replayFrames.length }) }}</span>
		<button class="actionsLineButton" :disabled="store.replayIndex >= store.replayFrames.length - 1" @click="replay.performStep(1)">{{ t("app.forward") }} &gt;</button>
		<button v-if="personal.pov >= 0" class="actionsLineButton" @click="copyGameToNewPracticeGame">{{ t("app.copyThisGame") }}<br />{{ t("app.toNewGame") }}</button>
		<button id="copyURLbutton" class="actionsLineButton" @click="copyToClipboard">{{ t("app.copyUrl") }}</button>
		<button class="actionsLineButton" @click="replay.exitReplay()">{{ t("app.exitReplay") }}</button>
		<div id="popup" class="popup">{{ copyMessage }}</div>
		<div v-if="spinoffSuccessText !== ''" class="spinoffSuccessText" v-html="spinoffSuccessText"></div>
		<div v-if="spinoffErrorText !== ''" class="spinoffErrorText">{{ spinoffErrorText }}</div>
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
	background: #d4eafd;
	border: 1px solid black;
	padding: 8px;
	margin: 10px 12px 0;
	text-align: center;
	font-size: 16px;
	font-weight: 400;
}
#replayArea input[type="range"] { width: min(300px, 35vw); }
#replayArea .frame { font-weight: bold; min-width: 120px; }
.actionsLineButton { margin: 0; border: 2px solid green; border-radius: 5px; font-weight: bolder; padding: 5px 9px; cursor: pointer; }
.actionsLineButton:disabled { opacity: 0.4; cursor: default; }
.spinoffSuccessText, .spinoffErrorText { width: 100%; padding: 10px; font-weight: bold; }
.spinoffSuccessText { color: darkgreen; background-color: lightblue; }
.spinoffErrorText { color: darkred; background-color: lightblue; }
.popup { position: fixed; z-index: 10000; background-color: #f7f7f7; padding: 10px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); opacity: 0; transition: opacity 0.3s; }
</style>
