<script setup>
import { useModelStore } from '../stores/NTRstore'
import { usePersonalStore } from '../stores/NTRpersonal'
import { t } from '../i18n'

const store = useModelStore()
const personal = usePersonalStore()

const isAdmin = () => store.pov === -1

function newGame() {
  window.location.href = '/NTR/createNTRpage/'
}

function showHelp() {
  window.open('/NTR/help/', '_blank')
}

function toggleChat() {
  store.viewSettings.showChat = !store.viewSettings.showChat
}

function toggleReplay() {
  store.viewSettings.showReplay = !store.viewSettings.showReplay
}

function downloadGameData() {
  if (!store.gameData) return
  const blob = new Blob([store.gameData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `NTR_${store.gameID}_turn${store.turn}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div id="topMenu">
    <div class="menuLeft">
      <button class="menuButton" @click="newGame">{{ t('menu.newGame') }}</button>
      <button class="menuButton" @click="toggleReplay">
        {{ store.viewSettings.showReplay ? t('menu.hideReplay') : t('menu.showReplay') }}
      </button>
      <button class="menuButton" @click="downloadGameData">{{ t('menu.downloadGame') }}</button>
      <button class="menuButton" @click="showHelp">{{ t('menu.help') }}</button>
    </div>
    <div class="menuCenter">
      <h1>{{ store.gameName || t('menu.gameTitle') }} #{{ store.gameID }}</h1>
      <div class="turnInfo" :class="{ allied: store.isAlliedTurn, french: store.isFrenchTurn, gameover: store.isGameOver }">
        {{ store.currentTurnString }}
      </div>
      <div v-if="store.finishedGame" class="gameFinished">{{ t('menu.gameFinished') }}</div>
    </div>
    <div class="menuRight">
      <button class="menuButton" @click="toggleChat">
        {{ store.viewSettings.showChat ? t('menu.hideChat') : t('menu.showChat') }}
        <span v-if="store.chatNotification" class="notificationBadge">●</span>
      </button>
      <div v-if="store.secondsToNextKickout > 0" class="kickoutTimer">
        ⏱ {{ Math.floor(store.secondsToNextKickout / 60) }}:{{ String(store.secondsToNextKickout % 60).padStart(2, '0') }}
      </div>
      <div v-if="store.kickoutRequired > 0" class="kickoutWarning">
        ⚠ {{ t('menu.kickoutImminent') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
#topMenu {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: linear-gradient(180deg, #2c3e50 0%, #1a252f 100%);
  color: white;
  font-family: Arial, sans-serif;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  position: sticky;
  top: 0;
  z-index: 100;
}

.menuLeft, .menuRight {
  display: flex;
  gap: 8px;
  align-items: center;
}

.menuCenter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.menuCenter h1 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: bold;
}

.turnInfo {
  font-size: 0.9rem;
  font-weight: bold;
  padding: 2px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.15);
}

.turnInfo.allied { background: #e74c3c; }
.turnInfo.french { background: #3498db; }
.turnInfo.gameover { background: #95a5a6; }

.gameFinished {
  font-size: 0.8rem;
  color: #f39c12;
  font-weight: bold;
  animation: blink 1s infinite;
}

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.menuButton {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: rgba(255,255,255,0.15);
  color: white;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s;
}

.menuButton:hover { background: rgba(255,255,255,0.3); }
.menuButton:active { background: rgba(255,255,255,0.4); }

.notificationBadge {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e74c3c;
  margin-left: 4px;
  animation: pulse 1s infinite;
}

@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); } }

.kickoutTimer {
  font-family: monospace;
  font-size: 0.85rem;
  color: #f39c12;
  background: rgba(243,156,18,0.15);
  padding: 2px 8px;
  border-radius: 4px;
}

.kickoutWarning {
  color: #e74c3c;
  font-weight: bold;
  font-size: 0.85rem;
  animation: blink 0.5s infinite;
}
</style>