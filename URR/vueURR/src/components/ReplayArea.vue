<script setup>
import { onMounted, onBeforeUnmount, computed, watch, nextTick, ref } from "vue"
import { useI18n } from "vue-i18n"
import * as model from "../js/URRmodel.js"
import * as funcs from "../js/URRfuncs.js"
import * as IO from "../backend/URR_IO.js"
import { previousOwnStep } from "../js/URRhistoryStorage.js"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
const store = useModelStore()
const personal = usePersonalStore()
const { t } = useI18n()

// Replay opens on the latest position, or on the shared link's step.
const requestedStep = window.initData?.spoilerFree ? Number(window.initData.replayStep) : NaN
store.replayStep.index = Number.isInteger(requestedStep) && requestedStep >= 0 ? Math.min(requestedStep, store.history.length - 1) : Math.max(0, store.history.length - 1)
const step = computed({ get: () => store.replayStep.index, set: (index) => { store.replayStep.index = index } })
const liveSnapshot = funcs.simpleExportWholeURRmodel()
const copyMessage = ref("")
const spinoffSuccessText = ref("")
const spinoffErrorText = ref("")

onMounted(applyStep)
watch(step, applyStep)
// The menu can close replay without reloading; never leave a historical
// position available for live moves.
onBeforeUnmount(() => {
	funcs.simpleImportWholeURRmodel(liveSnapshot)
	IO.checkForLatestData()
})

function maxStep() {
	return store.history.length - 1
}

function applyStep() {
	const snapshot = store.historySnapshotAt(step.value)
	if (!snapshot?.players) return
	try {
		model.restoreState(snapshot)
	} catch (e) {
		console.error("Unable to restore URR replay snapshot:", e)
	}
}

function jump(amount) {
	step.value = Math.max(0, Math.min(Math.max(0, maxStep()), step.value + amount))
}

function first() {
	step.value = 0
}

function last() {
	step.value = Math.max(0, maxStep())
}

function prev() {
	jump(-1)
}

function backToMyLastMove() {
	const index = previousOwnStep(store.history, personal.pov, step.value)
	if (index !== null) step.value = index
}

function next() {
	jump(1)
}

async function copyGameToNewPracticeGame() {
	spinoffErrorText.value = ""
	spinoffSuccessText.value = ""
	const result = await IO.copyGameToNewPracticeGame(step.value)
	if (result?.newID) {
		const url = `${window.location.origin}/URR/${result.newID}/show/`
		spinoffSuccessText.value = `${t("replay.gameCreated")} <a href="${url}" target="_blank" rel="noopener">${url}</a>`
	} else {
		spinoffErrorText.value = t("replay.copyGameError")
	}
}

function copyToClipboard() {
	const textToCopy = `${window.location.origin}/URR/${personal.gameID}/replay/${step.value + 1}`
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
	<div id="replayArea" :aria-label="$t('replay.aria')">
		<b>{{ $t("replay.title") }}</b>
		<button v-if="personal.pov >= 0" class="actionsLineButton" :disabled="step === 0" @click="backToMyLastMove">{{ $t("replay.backToMyLastMove") }}</button>
		<button class="actionsLineButton" :disabled="step === 0" :aria-label="$t('replay.first')" @click="first">|&lt;</button>
		<button class="actionsLineButton" :disabled="step === 0" :aria-label="$t('replay.prev5')" @click="jump(-5)">&lt;&lt;</button>
		<button class="actionsLineButton" :disabled="step === 0" @click="prev">&lt; {{ $t("replay.prev") }}</button>
		<input :aria-label="$t('replay.stepAria')" type="range" min="0" :max="Math.max(0, maxStep())" v-model.number="step" />
		<span>{{ $t("replay.step", { step: step + 1, total: maxStep() + 1 }) }}</span>
		<button class="actionsLineButton" :disabled="step >= maxStep()" @click="next">{{ $t("replay.next") }} &gt;</button>
		<button class="actionsLineButton" :disabled="step >= maxStep()" :aria-label="$t('replay.next5')" @click="jump(5)">&gt;&gt;</button>
		<button class="actionsLineButton" :disabled="step >= maxStep()" :aria-label="$t('replay.last')" @click="last">&gt;|</button>
		<button class="actionsLineButton" @click="store.viewSettings.showHistory = !store.viewSettings.showHistory">{{ $t("replay.history") }}</button>
		<button v-if="personal.pov >= 0" class="actionsLineButton" @click="copyGameToNewPracticeGame">{{ $t("replay.copyThisGame") }}<br />{{ $t("replay.toNewGame") }}</button>
		<button id="copyURLbutton" class="actionsLineButton" @click="copyToClipboard">{{ $t("replay.copyUrl") }}</button>
		<div id="popup" class="popup">{{ copyMessage }}</div>
		<div v-if="spinoffSuccessText !== ''" class="spinoffSuccessText" v-html="spinoffSuccessText"></div>
		<div v-if="spinoffErrorText !== ''" class="spinoffErrorText">{{ spinoffErrorText }}</div>
	</div>
</template>

<style scoped>
#replayArea { position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; background: #d4eafd; border: 1px solid black; padding: 8px; margin: 10px 12px 0; text-align: center; font-size: 16px; font-weight: 400; }
#replayArea input { width: min(300px, 35vw); }
.spinoffSuccessText, .spinoffErrorText { flex-basis: 100%; padding: 10px; font-weight: bold; }
.spinoffSuccessText { color: darkgreen; background-color: lightblue; }
.spinoffErrorText { color: darkred; background-color: lightblue; }
.popup { position: fixed; z-index: 10000; background-color: #f7f7f7; padding: 10px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); opacity: 0; transition: opacity 0.3s; }
@media (max-width: 1050px) { .actionsLineButton, #replayArea input { min-height: 44px; box-sizing: border-box; } }
</style>
