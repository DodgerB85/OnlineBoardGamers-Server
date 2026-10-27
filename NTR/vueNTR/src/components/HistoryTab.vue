<script setup>
import { useModelStore } from '../stores/NTRstore'
import { t } from '../i18n'
import { ref, computed } from 'vue'

const store = useModelStore()

const expanded = ref(true)

function toggleHistory() {
  expanded.value = !expanded.value
}

const displayHistory = computed(() => {
  if (!expanded.value) return []
  return store.history.slice(0, 20)
})

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getSideClass(side) {
  return side === 'ALLIED' ? 'allied' : 'french'
}
</script>

<template>
  <div id="historyTab" class="historyPanel">
    <div class="historyHeader" @click="toggleHistory">
      <span>{{ t('history.title') }}</span>
      <span class="expandIcon">{{ expanded.value ? '▼' : '▲' }}</span>
    </div>
    <transition name="slideHistory">
      <div v-show="expanded.value" class="historyContent">
        <div v-for="(entry, idx) in displayHistory" :key="idx" class="historyEntry" :class="getSideClass(entry.side)">
          <span class="time">{{ formatTime(entry.timestamp) }}</span>
          <span class="round">R{{ entry.turn }}</span>
          <span class="player">{{ entry.player }}</span>
          <span class="action">{{ entry.action }}</span>
        </div>
        <div v-if="store.history.length === 0" class="noHistory">{{ t('history.empty') }}</div>
        <div v-if="store.history.length > 20" class="moreHistory">
          ... {{ store.history.length - 20 }} {{ t('history.more') }}
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.historyPanel {
  background: white;
  border: 1px solid #d0d8e0;
  border-radius: 4px;
  margin: 8px;
  font-size: 0.75rem;
  max-height: 300px;
  overflow: hidden;
}

.historyHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: #f0f4f8;
  border-bottom: 1px solid #d0d8e0;
  cursor: pointer;
  font-weight: bold;
  color: #2c3e50;
}

.historyContent {
  max-height: 250px;
  overflow-y: auto;
}

.historyEntry {
  display: flex;
  gap: 8px;
  padding: 4px 10px;
  border-bottom: 1px solid #f0f0f0;
  font-family: monospace;
}

.historyEntry:last-child { border-bottom: none; }

.historyEntry.allied { border-left: 3px solid #e74c3c; }
.historyEntry.french { border-left: 3px solid #3498db; }

.time { color: #7f8c8d; min-width: 60px; }
.round { color: #2c3e50; min-width: 35px; }
.player { font-weight: bold; min-width: 80px; }
.action { color: #34495e; flex: 1; }

.noHistory, .moreHistory {
  padding: 10px;
  text-align: center;
  color: #95a5a6;
  font-style: italic;
}

.slideHistory-enter-active,
.slideHistory-leave-active {
  transition: all 0.3s ease;
}

.slideHistory-enter-from,
.slideHistory-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}
</style>