<script setup>
import { ref } from 'vue'
import { useModelStore } from '../stores/NTRstore'
import { usePersonalStore } from '../stores/NTRpersonal'
import { t } from '../i18n'

const store = useModelStore()
const personal = usePersonalStore()

const debugTabs = ref('state')
const logFilter = ref('')
const customCommand = ref('')

const debugLogs = ref([
  { time: Date.now(), type: 'info', message: 'Debug panel initialized' },
])

function addLog(type, message) {
  debugLogs.value.unshift({ time: Date.now(), type, message })
  if (debugLogs.value.length > 100) debugLogs.value.pop()
}

function sendCustomCommand() {
  if (!customCommand.value.trim()) return
  try {
    const cmd = JSON.parse(customCommand.value)
    addLog('cmd', `> ${customCommand.value}`)
    // Execute custom command
    new Function(customCommand.value)()
    customCommand.value = ''
  } catch (e) {
    addLog('error', `Command error: ${e.message}`)
  }
}

function exportGameState() {
  const state = {
    gameID: store.gameID,
    turn: store.turn,
    phase: store.phase,
    board: store.board,
    players: store.players,
    history: store.history,
    hiddenData: store.hiddenData,
  }
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `NTR_${store.gameID}_debug.json`
  a.click()
  URL.revokeObjectURL(url)
  addLog('info', 'Game state exported')
}

function forceSync() {
  addLog('info', 'Forcing sync with server...')
  import('../backend/NTR_IO').then(({ loadGame }) => {
    loadGame(store.gameID).then(data => {
      store.setGameData(data.gameData)
      addLog('success', 'Sync complete')
    }).catch(err => {
      addLog('error', `Sync failed: ${err.message}`)
    })
  })
}

function testFogOfWar() {
  // Toggle fog on a random locale
  if (store.board.locales.length > 0) {
    const locale = store.board.locales[Math.floor(Math.random() * store.board.locales.length)]
    locale.fogged = !locale.fogged
    addLog('info', `Toggled fog on ${locale.id}: ${locale.fogged}`)
  }
}
</script>

<template>
  <div id="debugArea" class="debugArea">
    <div class="debugHeader">
      <h3>🔧 {{ t('debug.title') }}</h3>
      <button @click="debugTabs = ''" class="closeBtn">✕</button>
    </div>

    <div class="debugTabs">
      <button :class="{ active: debugTabs === 'state' }" @click="debugTabs = 'state'">{{ t('debug.state') }}</button>
      <button :class="{ active: debugTabs === 'logs' }" @click="debugTabs = 'logs'">{{ t('debug.logs') }}</button>
      <button :class="{ active: debugTabs === 'console' }" @click="debugTabs = 'console'">{{ t('debug.console') }}</button>
      <button :class="{ active: debugTabs === 'actions' }" @click="debugTabs = 'actions'">{{ t('debug.actions') }}</button>
    </div>

    <div v-if="debugTabs === 'state'" class="debugPanel">
      <h4>{{ t('debug.gameState') }}</h4>
      <pre>{{ JSON.stringify({
        gameID: store.gameID,
        turn: store.turn,
        phase: store.phase,
        scenario: store.scenario,
        teamPlay: store.teamPlay,
        morale: store.board.morale,
        unitsCount: store.board.units.length,
        localesCount: store.board.locales.length,
        pov: store.pov,
        myMove: store.myMove,
      }, null, 2) }}</pre>
    </div>

    <div v-if="debugTabs === 'logs'" class="debugPanel">
      <div class="logControls">
        <input v-model="logFilter" :placeholder="t('debug.filter')" />
        <button @click="debugLogs = []">{{ t('debug.clear') }}</button>
      </div>
      <div class="logList">
        <div v-for="(log, idx) in filteredLogs" :key="idx" :class="['logEntry', log.type]">
          <span class="logTime">{{ new Date(log.time).toLocaleTimeString() }}</span>
          <span class="logType">[{{ log.type.toUpperCase() }}]</span>
          <span class="logMessage">{{ log.message }}</span>
        </div>
      </div>
    </div>

    <div v-if="debugTabs === 'console'" class="debugPanel">
      <h4>{{ t('debug.customCommand') }}</h4>
      <textarea v-model="customCommand" :placeholder="t('debug.commandPlaceholder')" rows="3"></textarea>
      <button @click="sendCustomCommand">{{ t('debug.execute') }}</button>
    </div>

    <div v-if="debugTabs === 'actions'" class="debugPanel">
      <h4>{{ t('debug.quickActions') }}</h4>
      <div class="actionGrid">
        <button @click="exportGameState">{{ t('debug.exportState') }}</button>
        <button @click="forceSync">{{ t('debug.forceSync') }}</button>
        <button @click="testFogOfWar">{{ t('debug.toggleFog') }}</button>
        <button @click="store.viewSettings.showReplay = !store.viewSettings.showReplay">{{ t('debug.toggleReplay') }}</button>
        <button @click="store.turn++">{{ t('debug.nextTurn') }}</button>
        <button @click="store.phase = (store.phase + 1) % 3">{{ t('debug.nextPhase') }}</button>
        <button @click="store.board.morale.allied = Math.max(0, store.board.morale.allied - 1)">{{ t('debug.damageAllied') }}</button>
        <button @click="store.board.morale.french = Math.max(0, store.board.morale.french - 1)">{{ t('debug.damageFrench') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  computed: {
    filteredLogs() {
      if (!this.logFilter) return this.debugLogs
      return this.debugLogs.filter(log =>
        log.message.toLowerCase().includes(this.logFilter.toLowerCase()) ||
        log.type.toLowerCase().includes(this.logFilter.toLowerCase())
      )
    }
  }
}
</script>

<style scoped>
.debugArea {
  width: 350px;
  background: #1a252f;
  border: 1px solid #34495e;
  border-radius: 4px;
  color: #ecf0f1;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  max-height: 700px;
}

.debugHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #2c3e50;
  border-bottom: 1px solid #34495e;
}

.debugHeader h3 { margin: 0; font-size: 0.9rem; }

.closeBtn {
  background: none;
  border: none;
  color: #95a5a6;
  cursor: pointer;
  font-size: 1.2rem;
}

.debugTabs {
  display: flex;
  background: #2c3e50;
  border-bottom: 1px solid #34495e;
}

.debugTabs button {
  flex: 1;
  padding: 6px;
  border: none;
  background: transparent;
  color: #bdc3c7;
  cursor: pointer;
  font-size: 0.75rem;
}

.debugTabs button.active {
  background: #1a252f;
  color: #3498db;
  border-bottom: 2px solid #3498db;
}

.debugTabs button:hover:not(.active) { color: #ecf0f1; }

.debugPanel {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.debugPanel h4 { margin: 0 0 10px 0; color: #3498db; font-size: 0.85rem; }

.debugPanel pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #bdc3c7;
  line-height: 1.5;
}

.logControls {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.logControls input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #34495e;
  border-radius: 3px;
  background: #1a252f;
  color: #ecf0f1;
  font-size: 0.75rem;
}

.logControls button {
  padding: 4px 10px;
  border: 1px solid #34495e;
  border-radius: 3px;
  background: #2c3e50;
  color: #ecf0f1;
  cursor: pointer;
}

.logList { max-height: 400px; overflow-y: auto; }

.logEntry {
  padding: 4px 8px;
  border-bottom: 1px solid #2c3e50;
  display: flex;
  gap: 8px;
  font-family: monospace;
}

.logEntry.info { border-left: 3px solid #3498db; }
.logEntry.success { border-left: 3px solid #27ae60; }
.logEntry.warning { border-left: 3px solid #f39c12; }
.logEntry.error { border-left: 3px solid #e74c3c; }
.logEntry.cmd { border-left: 3px solid #9b59b6; }

.logTime { color: #7f8c8d; font-size: 0.7rem; min-width: 60px; }
.logType { color: #95a5a6; min-width: 70px; }
.logMessage { flex: 1; word-break: break-word; }

.debugPanel textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #34495e;
  border-radius: 3px;
  background: #1a252f;
  color: #ecf0f1;
  font-family: monospace;
  font-size: 0.75rem;
  margin-bottom: 8px;
  box-sizing: border-box;
}

.actionGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.actionGrid button {
  padding: 8px;
  border: 1px solid #34495e;
  border-radius: 3px;
  background: #2c3e50;
  color: #ecf0f1;
  cursor: pointer;
  font-size: 0.75rem;
  text-align: left;
}

.actionGrid button:hover { background: #34495e; }
</style>