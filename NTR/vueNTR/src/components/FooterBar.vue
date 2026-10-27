<script setup>
import { ref, computed } from 'vue'
import { useModelStore } from '../stores/NTRstore'
import { usePersonalStore } from '../stores/NTRpersonal'
import { t } from '../i18n'

const store = useModelStore()
const personal = usePersonalStore()

const chatMessage = ref('')
const showChat = computed(() => store.viewSettings.showChat)

function sendChat() {
  if (!chatMessage.value.trim()) return
  // Send via NTR_IO
  import('../backend/NTR_IO').then(({ sendChatMessage }) => {
    sendChatMessage(store.gameID, chatMessage.value)
    chatMessage.value = ''
  })
}

function toggleChat() {
  store.viewSettings.showChat = !store.viewSettings.showChat
}

const chatEntries = computed(() => {
  if (!store.chatData) return []
  try {
    return JSON.parse(store.chatData)
  } catch {
    return []
  }
})
</script>

<template>
  <footer id="footerBar">
    <div class="footerLeft">
      <div v-if="showChat" class="chatContainer">
        <div class="chatHeader">
          <span>{{ t('footer.chat') }}</span>
          <button @click="toggleChat" class="chatToggle">✕</button>
        </div>
        <div class="chatLog" ref="chatLog">
          <div v-for="(entry, idx) in chatEntries" :key="idx" class="chatEntry">
            <span class="chatTime">{{ new Date(entry[1]).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) }}</span>
            <span class="chatPlayer" :class="entry[0].includes('SHADOW') ? 'bot' : ''">{{ entry[0] }}</span>
            <span class="chatText">{{ entry[2] }}</span>
          </div>
        </div>
        <div class="chatInput">
          <input v-model="chatMessage" @keyup.enter="sendChat" :placeholder="t('footer.chatPlaceholder')" />
          <button @click="sendChat">{{ t('footer.send') }}</button>
        </div>
      </div>
      <button v-else @click="toggleChat" class="chatButton">
        💬 {{ t('footer.chat') }}
      </button>
    </div>

    <div class="footerCenter">
      <div class="versionInfo">
        {{ t('footer.version') }} {{ __VERSION__ || 'dev' }}
      </div>
      <div class="playersOnline">
        {{ store.players.length }} {{ t('footer.players') }}
      </div>
    </div>

    <div class="footerRight">
      <div class="notifications">
        <span v-if="store.kickoutRequired > 0" class="kickoutAlert">
          ⚠ {{ t('footer.kickoutWarning') }}
        </span>
        <span v-else-if="store.secondsToNextKickout > 0" class="turnTimer">
          ⏱ {{ Math.floor(store.secondsToNextKickout / 60) }}:{{ String(store.secondsToNextKickout % 60).padStart(2, '0') }}
        </span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
#footerBar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #1a252f;
  color: white;
  font-family: Arial, sans-serif;
  font-size: 0.8rem;
  position: sticky;
  bottom: 0;
  z-index: 100;
}

.footerLeft, .footerCenter, .footerRight {
  display: flex;
  align-items: center;
  gap: 16px;
}

.chatButton {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #3498db;
  color: white;
  cursor: pointer;
}

.chatContainer {
  width: 350px;
  background: #2c3e50;
  border-radius: 4px;
  overflow: hidden;
}

.chatHeader {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: #1a252f;
  border-bottom: 1px solid #34495e;
}

.chatToggle {
  background: none;
  border: none;
  color: #95a5a6;
  cursor: pointer;
}

.chatLog {
  max-height: 150px;
  overflow-y: auto;
  padding: 8px;
}

.chatEntry {
  margin-bottom: 6px;
  line-height: 1.4;
}

.chatTime { color: #7f8c8d; font-size: 0.7rem; }
.chatPlayer { font-weight: bold; margin: 0 6px; }
.chatPlayer.bot { color: #e67e22; }
.chatText { color: #ecf0f1; }

.chatInput {
  display: flex;
  gap: 6px;
  padding: 8px;
  border-top: 1px solid #34495e;
}

.chatInput input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #34495e;
  border-radius: 4px;
  background: #1a252f;
  color: white;
}

.chatInput button {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #3498db;
  color: white;
  cursor: pointer;
}

.versionInfo { color: #95a5a6; }
.playersOnline { color: #bdc3c7; }

.kickoutAlert { color: #e74c3c; font-weight: bold; animation: blink 0.5s infinite; }
.turnTimer { color: #f39c12; font-family: monospace; }

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
</style>