<script setup>
import HistoryEntry from './HistoryEntry.vue'
import * as replay from '../js/BUSreplay'
import * as funcs from '../js/BUSfuncs.js'

import { useModelStore } from '../stores/BUSstore.js'
import { usePersonalStore } from '../stores/BUSpersonal.js'

const store = useModelStore()
const personal = usePersonalStore()

function performStep(amount) {
  replay.performStep(amount)
}

function exitReplayMode() {
  // TURN OFF
  store.clearHistoryHelpers()
  store.topMenuViews.showReplay = false
  funcs.importBUSmodel(store.endReplayResetData, false, true)
  store.replayData.splice(0)
}
</script>

<template>
  <div v-if="store.topMenuViews.generatingReplay" class="progress-bar" id="progressBarID">
    <div id="pBarEl"></div>
    <span id="pBarTextEl"></span>
  </div>

  <template v-if="store.topMenuViews.showReplay">
    <div class="replayButtonsDiv">
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
      {{ store.replayStep + 1 }} / {{ store.replayData.length }}
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

      <div class="exitReplayButtonDiv">
        <button class="actionsLineButton" @click="exitReplayMode()">
          {{ $t('replay.exitReplayMode') }}
        </button>
      </div>
      <div class="replayStepHint">{{ $t('replay.stepHint') }}</div>
    </div>
    <div class="replayHistoryEntry">
      <HistoryEntry :entry="store.history[store.replayStep]" :entry_-i-d="-1" />
    </div>
  </template>
</template>

<style scoped>
.progress-bar {
  border-radius: 5px;
  /*width: calc(100% - 40px);*/
  width: 80%;
  /*margin: 20px;*/
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

.exitReplayButtonDiv {
  position: absolute;
  top: 0px;
  left: 100%;
  /*background:blue;*/
  width: 200px;
  /*padding:10px;*/
}

.replayButtonsDiv {
  position: relative;
  width: fit-content;
  margin: auto;
  /*padding-top: 20px;*/
}

.replayHistoryEntry {
  width: fit-content;
  margin: auto;
  min-height: 111px;
}

.replayStepHint {
  position: absolute;
  right: 5px;
  top: 2px;
  font-size: 0.8em;
  color: #555;
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
</style>
