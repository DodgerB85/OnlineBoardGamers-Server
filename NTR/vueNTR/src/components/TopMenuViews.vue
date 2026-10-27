<script setup>
import { useModelStore } from '../stores/NTRstore'
import { t } from '../i18n'

const store = useModelStore()

function toggleHistory() {
  store.viewSettings.showReplay = false
  // History is always visible in sidebar
}

function toggleReplayPosition() {
  store.viewSettings.replayAtBottom = !store.viewSettings.replayAtBottom
}

function clearReplay() {
  store.viewSettings.generatingReplay = false
  store.replayIndex = -1
}
</script>

<template>
  <div id="topMenuViews" class="viewToggles">
    <div class="toggleGroup">
      <label>
        <input type="checkbox" v-model="store.viewSettings.showReplay" @change="toggleHistory" />
        {{ t('views.replay') }}
      </label>
      <label v-if="store.viewSettings.showReplay">
        <input type="checkbox" v-model="store.viewSettings.replayAtBottom" @change="toggleReplayPosition" />
        {{ t('views.replayAtBottom') }}
      </label>
    </div>
    <div v-if="store.viewSettings.generatingReplay" class="generatingReplay">
      {{ t('views.generatingReplay') }}
    </div>
    <div v-if="store.viewSettings.showReplay && store.history.length > 0" class="replayInfo">
      {{ t('views.replayStep') }} {{ store.replayIndex + 1 }} / {{ store.history.length }}
    </div>
  </div>
</template>

<style scoped>
.viewToggles {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 6px;
  background: #f0f4f8;
  border-bottom: 1px solid #d0d8e0;
  font-size: 0.85rem;
}

.toggleGroup {
  display: flex;
  gap: 16px;
  align-items: center;
}

.toggleGroup label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.generatingReplay {
  color: #e67e22;
  font-weight: bold;
  animation: pulse 1s infinite;
}

.replayInfo {
  color: #2c3e50;
  font-family: monospace;
}

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>