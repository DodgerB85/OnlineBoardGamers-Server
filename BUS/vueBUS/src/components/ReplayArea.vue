<script setup>
import HistoryEntry from './HistoryEntry.vue'
import * as replay from '../js/BUSreplay'
import * as funcs from '../js/BUSfuncs.js'
import * as IO from '../backend/BUS_IO.js'

import { useModelStore } from '../stores/BUSstore.js'
import { usePersonalStore } from '../stores/BUSpersonal.js'

import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const store = useModelStore()
const personal = usePersonalStore()
const { t } = useI18n()

const copyMessage = ref('')
const spinoffSuccessText = ref('')
const spinoffErrorText = ref('')

function performStep(amount) {
  replay.performStep(amount)
}

function setReplayStep(event) {
  const step = Number(event.target.value)
  if (step === store.replayStep) return
  replay.goToReplayStep(step)
}

function exitReplayMode() {
  // TURN OFF
  store.clearHistoryHelpers()
  store.topMenuViews.showReplay = false
  funcs.importBUSmodel(store.endReplayResetData, false, true)
  store.replayData.splice(0)
}

async function copyGameToNewPracticeGame() {
  spinoffErrorText.value = ''
  spinoffSuccessText.value = ''
  const result = await IO.copyGameToNewPracticeGame()
  if (result?.newID) {
    const url = `${window.location.origin}/BUS/${result.newID}/show/`
    spinoffSuccessText.value = `${t('replay.gameCreated')} <a href="${url}" target="_blank" rel="noopener">${t('topMenuViews.here')}</a>`
  } else {
    spinoffErrorText.value = t('replay.copyGameError')
  }
}

function copyToClipboard() {
  const textToCopy = `${window.location.origin}/BUS/${personal.gameID}/replay/${store.replayStep + 1}`
  const textarea = document.createElement('textarea')
  textarea.value = textToCopy
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)

  copyMessage.value = t('replay.copiedToClipboard', { url: textToCopy })

  nextTick(() => {
    const button = document.getElementById('copyURLbutton')
    const popup = document.getElementById('popup')
    clearTimeout(popup.fadeTimeout)
    popup.style.opacity = '1'
    popup.style.display = 'block'

    const buttonRect = button.getBoundingClientRect()
    const popupRect = popup.getBoundingClientRect()
    const below = buttonRect.bottom + 10
    const offsetTop = below + popupRect.height <= window.innerHeight ? below : buttonRect.top - popupRect.height - 10
    const offsetLeft = Math.max(10, Math.min(window.innerWidth - popupRect.width - 10, buttonRect.left + (buttonRect.width - popupRect.width) / 2))

    popup.style.top = offsetTop + 'px'
    popup.style.left = offsetLeft + 'px'

    popup.fadeTimeout = setTimeout(() => {
      popup.style.opacity = '0'
      setTimeout(() => {
        popup.style.display = 'none'
      }, 300)
    }, 2000)
  })
}
</script>

<template>
  <div v-if="store.topMenuViews.generatingReplay" class="progress-bar" id="progressBarID">
    <div id="pBarEl"></div>
    <span id="pBarTextEl"></span>
  </div>

  <template v-if="store.topMenuViews.showReplay">
    <div id="replayArea" :class="{ replayAtBottom: store.topMenuViews.replayAtBottom }">
      <button v-if="personal.pov >= 0" class="actionsLineButton" :disabled="store.replayStep === 0"
        @click="performStep(-999)">{{ $t('replay.backToMyLastMove') }}</button>
      <button class="actionsLineButton" :aria-label="$t('replay.start')" :title="$t('replay.start')" :disabled="store.replayStep === 0" @click="performStep(-99)">
        |&lt;
      </button>
      <button class="actionsLineButton" :aria-label="$t('replay.back5')" :title="$t('replay.back5')" :disabled="store.replayStep === 0" @click="performStep(-9)">
        &lt;&lt;
      </button>
      <button class="actionsLineButton" :aria-label="$t('replay.stepBack')" :title="$t('replay.stepBack')" :disabled="store.replayStep === 0" @click="performStep(-1)">
        &lt;
      </button>
      <input type="range" min="0" :max="Math.max(0, store.replayData.length - 1)" :value="store.replayStep"
        :aria-label="$t('replay.stepAria')" @input="setReplayStep" />
      <span class="replayStepSpan">{{ store.replayStep + 1 }} / {{ store.replayData.length }}</span>
      <button class="actionsLineButton" :aria-label="$t('replay.stepForward')" :title="$t('replay.stepForward')" :disabled="store.replayStep === store.replayData.length - 1"
        @click="performStep(1)">
        &gt;
      </button>
      <button class="actionsLineButton" :aria-label="$t('replay.forward5')" :title="$t('replay.forward5')" :disabled="store.replayStep === store.replayData.length - 1"
        @click="performStep(9)">
        &gt;&gt;
      </button>
      <button class="actionsLineButton" :aria-label="$t('replay.end')" :title="$t('replay.end')" :disabled="store.replayStep === store.replayData.length - 1"
        @click="performStep(99)">
        &gt;|
      </button>

      <button v-if="personal.pov >= 0" class="actionsLineButton" @click="copyGameToNewPracticeGame()">
        {{ $t('replay.copyThisGame') }}<br />{{ $t('replay.toNewGame') }}
      </button>
      <button id="copyURLbutton" @click="copyToClipboard" class="actionsLineButton">{{ $t('replay.copyUrl') }}</button>
      <button class="actionsLineButton" @click="exitReplayMode()">{{ $t('replay.exitReplayMode') }}</button>
      <div id="popup" class="popup">{{ copyMessage }}</div>
    </div>

    <div v-if="spinoffSuccessText !== ''" class="spinoffSuccessText" v-html="spinoffSuccessText"></div>
    <div v-if="spinoffErrorText !== ''" class="spinoffErrorText">{{ spinoffErrorText }}</div>
    <div class="replayHistoryEntry">
      <HistoryEntry :entry="store.history[store.replayStep]" :entry_-i-d="-1" />
    </div>
  </template>
</template>

<style scoped>
.progress-bar {
  border-radius: 5px;
  width: 80%;
  margin: auto;
  margin-top: 20px;
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

.replayHistoryEntry {
  width: fit-content;
  margin: auto;
  min-height: 111px;
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
