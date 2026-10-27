<script setup>
import { useModelStore } from '../stores/NTRstore'
import { t } from '../i18n'

const store = useModelStore()

const moraleColors = {
  allied: '#e74c3c',
  french: '#3498db',
}

function getMoralePercent(side) {
  const max = 12
  return Math.max(0, (store.board.morale[side] / max) * 100)
}

function getPlayerSide(seat) {
  if (!store.teamPlay) {
    return seat === 0 ? 'ALLIED' : 'FRENCH'
  }
  // Team play: check corps assignment
  const corps = store.corpsAssignments[seat]
  if (!corps) return 'ALLIED'
  return corps.startsWith('RUSSIAN') || corps === 'AUSTRIAN' ? 'ALLIED' : 'FRENCH'
}

function getCorpsName(seat) {
  return store.corpsAssignments[seat] || (seat === 0 ? 'Allied Commander' : 'French Commander')
}
</script>

<template>
  <div id="playerTable" class="playerTable">
    <div class="playerRow" v-for="(player, idx) in store.players" :key="idx" :class="['player' + idx, getPlayerSide(idx).toLowerCase()]">
      <div class="playerColor" :style="{ backgroundColor: store.pov === idx ? '#f39c12' : (getPlayerSide(idx) === 'ALLIED' ? '#e74c3c' : '#3498db') }"></div>
      <div class="playerInfo">
        <div class="playerName">
          {{ player.name || player.username }}
          <span v-if="store.pov === idx" class="youBadge">{{ t('player.you') }}</span>
          <span v-if="player.is_missing" class="missingBadge">{{ t('player.missing') }}</span>
          <span v-if="player.is_kicked" class="kickedBadge">{{ t('player.kicked') }}</span>
        </div>
        <div class="playerCorps">{{ getCorpsName(idx) }}</div>
      </div>
      <div class="playerMorale" :class="getPlayerSide(idx).toLowerCase()">
        <div class="moraleLabel">{{ getPlayerSide(idx) === 'ALLIED' ? t('player.alliedMorale') : t('player.frenchMorale') }}</div>
        <div class="moraleBar">
          <div class="moraleFill" :style="{ width: getMoralePercent(getPlayerSide(idx).toLowerCase()) + '%', backgroundColor: moraleColors[getPlayerSide(idx).toLowerCase()] }"></div>
        </div>
        <div class="moraleValue">{{ store.board.morale[getPlayerSide(idx).toLowerCase()] }} / 12</div>
      </div>
    </div>

    <div v-if="store.teamPlay" class="teamLegend">
      <div class="legendItem allied">
        <span class="legendColor" style="background:#e74c3c"></span>
        {{ t('player.alliedTeam') }}
      </div>
      <div class="legendItem french">
        <span class="legendColor" style="background:#3498db"></span>
        {{ t('player.frenchTeam') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.playerTable {
  background: white;
  border: 1px solid #d0d8e0;
  border-radius: 4px;
  padding: 8px;
  min-width: 300px;
  font-size: 0.85rem;
}

.playerRow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}

.playerRow:last-child { border-bottom: none; }

.playerColor {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.playerInfo { flex: 1; min-width: 0; }
.playerName { font-weight: bold; color: #2c3e50; }
.playerCorps { font-size: 0.75rem; color: #7f8c8d; }

.youBadge { font-size: 0.65rem; background: #f39c12; color: white; padding: 1px 4px; border-radius: 3px; margin-left: 6px; }
.missingBadge { font-size: 0.65rem; background: #e74c3c; color: white; padding: 1px 4px; border-radius: 3px; margin-left: 6px; }
.kickedBadge { font-size: 0.65rem; background: #95a5a6; color: white; padding: 1px 4px; border-radius: 3px; margin-left: 6px; }

.playerMorale {
  text-align: right;
  min-width: 100px;
}

.moraleLabel { font-size: 0.7rem; color: #7f8c8d; margin-bottom: 2px; }
.moraleBar {
  height: 8px;
  background: #ecf0f1;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 2px;
}
.moraleFill { height: 100%; transition: width 0.3s; }
.moraleValue { font-size: 0.7rem; color: #2c3e50; font-family: monospace; }

.teamLegend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #d0d8e0;
}

.legendItem {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #2c3e50;
}

.legendColor { width: 12px; height: 12px; border-radius: 50%; }
</style>