<script setup>
import { useModelStore } from '../stores/NTRstore'
import { t } from '../i18n'
import * as replay from '../js/NTRreplay'

const store = useModelStore()

function stepBack() {
  replay.performStep(-1)
}

function stepForward() {
  replay.performStep(1)
}

function jumpToStart() {
  replay.jumpTo(0)
}

function jumpToEnd() {
  replay.jumpTo(store.history.length - 1)
}

function exitReplay() {
  store.viewSettings.showReplay = false
  store.replayIndex = -1
}
</script>

<template>
  <div id="replayArea" class="replayPanel" v-if="store.viewSettings.showReplay">
    <div class="replayHeader">
      <span>{{ t('replay.title') }}</span>
      <button class="exitBtn" @click="exitReplay">✕</button>
    </div>
    <div class="replayControls">
      <button @click="jumpToStart" :disabled="store.replayIndex <= 0" title="{{ t('replay.first') }}">⏮</button>
      <button @click="stepBack" :disabled="store.replayIndex <= 0" title="{{ t('replay.prev') }}">◀</button>
      <span class="replayPosition">{{ store.replayIndex + 1 }} / {{ store.history.length }}</span>
      <button @click="stepForward" :disabled="store.replayIndex >= store.history.length - 1" title="{{ t('replay.next') }}">▶</button>
      <button @click="jumpToEnd" :disabled="store.replayIndex >= store.history.length - 1" title="{{ t('replay.last') }}">⏭</button>
    </div>
    <div class="replayInfo">
      <div v-if="store.replayIndex >= 0 && store.history[store.replayIndex]">
        <strong>{{ t('replay.showing') }}</strong>
        {{ store.history[store.replayIndex].action }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.replayPanel {
  background: white;
  border: 1px solid #d0d8e0;
  border-radius: 4px;
  margin: 8px;
  padding: 10px;
  font-size: 0.85rem;
}

.replayHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: bold;
  color: #2c3e50;
}

.exitBtn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #95a5a6;
}

.exitBtn:hover { color: #e74c3c; }

.replayControls {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.replayControls button {
  padding: 6px 12px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 1rem;
  min-width: 40px;
}

.replayControls button:hover:not(:disabled) { background: #f0f4f8; }
.replayControls button:disabled { opacity: 0.4; cursor: not-allowed; }

.replayPosition {
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-family: monospace;
  font-weight: bold;
  color: #2c3e50;
  min-width: 80px;
  text-align: center;
}

.replayInfo {
  padding: 8px;
  background: #f0f4f8;
  border-radius: 4px;
  text-align: center;
  color: #34495e;
}
</style>