<script setup>
import { ref, computed } from 'vue'
import { useModelStore } from '../stores/NTRstore'
import * as rf from '../js/NTRreference'
import { t } from '../i18n'

const store = useModelStore()

const actionPhase = ref('move') // 'move', 'attack', 'reveal'
const selectedUnits = computed(() => store.selection.units)
const targetLocale = computed(() => store.selection.locale)
const commandPoints = ref(3)

const victoryText = computed(() => {
  const victory = store.victory
  if (!victory) return ''
  if (victory.winner === 'draw') return t('victory.draw')
  const side = victory.winner === rf.SIDE_ALLIED ? t('map.allied') : t('map.french')
  const reason = victory.type === 'demoralization' ? t('victory.demoralization') : t('victory.territorial')
  return `${side}: ${reason}`
})

function canMove() {
  return store.myMove && !store.isGameOver
}

function canAttack() {
  return store.myMove && selectedUnits.value.length > 0 && targetLocale.value
}

function executeMove() {
  if (!targetLocale.value) return
  // Send move action to server
  import('../js/NTRcontroller').then(({ executeMove }) => {
    executeMove(selectedUnits.value, targetLocale.value)
  })
  clearAction()
}

function executeAttack() {
  if (!targetLocale.value) return
  import('../js/NTRcontroller').then(({ executeAttack }) => {
    executeAttack(selectedUnits.value, targetLocale.value)
  })
  clearAction()
}

function executeReveal() {
  if (!selectedUnits.value.length) return
  import('../js/NTRcontroller').then(({ executeReveal }) => {
    executeReveal(selectedUnits.value)
  })
  clearAction()
}

function passTurn() {
  if (confirm(t('action.confirmPass'))) {
    import('../js/NTRcontroller').then(({ passTurn }) => {
      passTurn()
    })
  }
}

function reorganize() {
  import('../js/NTRcontroller').then(({ reorganize }) => {
    reorganize()
  })
  clearAction()
}

function forcedMarch() {
  import('../js/NTRcontroller').then(({ forcedMarch }) => {
    forcedMarch()
  })
  clearAction()
}

function artilleryBombard() {
  import('../js/NTRcontroller').then(({ artilleryBombard }) => {
    artilleryBombard()
  })
  clearAction()
}

function clearAction() {
  actionPhase.value = 'move'
}

function removeUnit(unit) {
  const idx = store.selection.units.findIndex(u => u.id === unit.id)
  if (idx >= 0) store.selection.units.splice(idx, 1)
}

function addCommandPoint() {
  commandPoints.value++
}

function spendCommandPoint() {
  if (commandPoints.value > 0) commandPoints.value--
}
</script>

<template>
  <div id="actionArea" class="actionArea" :class="{ disabled: !canMove() }">
    <div class="actionHeader">
      <h3>{{ t('action.title') }}</h3>
      <div class="commandPoints" v-if="store.myMove">
        {{ t('action.commandPoints') }}: <strong>{{ commandPoints }}</strong>
        <button @click="addCommandPoint" class="smallBtn">+</button>
        <button @click="spendCommandPoint" class="smallBtn">−</button>
      </div>
    </div>

    <div v-if="store.gameMessages.errorText" class="gameError">
      {{ store.gameMessages.errorText }}
    </div>

    <div v-if="store.isGameOver" class="gameOver">
      {{ t('action.gameOver') }}
      <div v-if="victoryText" class="victoryText">{{ victoryText }}</div>
    </div>

    <div v-else-if="!store.myMove" class="notYourTurn">
      {{ store.isAlliedTurn ? t('action.alliedTurn') : t('action.frenchTurn') }}
      <span v-if="store.pov >= 0"> - {{ t('action.waiting') }}</span>
    </div>

    <template v-else>
      <!-- Phase tabs -->
      <div class="phaseTabs">
        <button
          :class="{ active: actionPhase === 'move' }"
          @click="actionPhase = 'move'"
        >{{ t('action.move') }}</button>
        <button
          :class="{ active: actionPhase === 'attack' }"
          @click="actionPhase = 'attack'"
        >{{ t('action.attack') }}</button>
        <button
          :class="{ active: actionPhase === 'reveal' }"
          @click="actionPhase = 'reveal'"
        >{{ t('action.reveal') }}</button>
      </div>

      <!-- Selected Units -->
      <div class="selectedUnits">
        <h4>{{ t('action.selectedUnits') }} ({{ selectedUnits.length }})</h4>
        <div v-if="selectedUnits.length === 0" class="noSelection">
          {{ t('action.selectUnits') }}
        </div>
        <div v-else class="unitList">
          <div v-for="unit in selectedUnits" :key="unit.id" class="unitItem">
            <span class="unitType">{{ unit.type }}</span>
            <span class="unitStrength">Str {{ unit.strength }}</span>
            <button @click="removeUnit(unit)" class="removeBtn">×</button>
          </div>
        </div>
      </div>

      <!-- Target Locale -->
      <div class="targetLocale">
        <h4>{{ t('action.targetLocale') }}</h4>
        <div v-if="!targetLocale" class="noTarget">
          {{ t('action.clickLocale') }}
        </div>
        <div v-else class="targetInfo">
          <strong>{{ targetLocale }}</strong>
          <button @click="targetLocale = null" class="clearBtn">{{ t('action.clear') }}</button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actionButtons">
        <button
          v-if="actionPhase === 'move'"
          @click="executeMove"
          :disabled="!targetLocale || selectedUnits.length === 0"
          class="primaryBtn"
        >
          {{ t('action.executeMove') }}
        </button>
        <button
          v-if="actionPhase === 'attack'"
          @click="executeAttack"
          :disabled="!targetLocale || selectedUnits.length === 0"
          class="dangerBtn"
        >
          {{ t('action.executeAttack') }}
        </button>
        <button
          v-if="actionPhase === 'reveal'"
          @click="executeReveal"
          :disabled="selectedUnits.length === 0"
          class="warningBtn"
        >
          {{ t('action.executeReveal') }}
        </button>
        <button @click="passTurn" class="secondaryBtn">
          {{ t('action.passTurn') }}
        </button>
      </div>

      <!-- Special Actions -->
      <div class="specialActions">
        <h4>{{ t('action.special') }}</h4>
        <button @click="reorganize" class="smallBtn">{{ t('action.reorganize') }}</button>
        <button @click="forcedMarch" class="smallBtn">{{ t('action.forcedMarch') }}</button>
        <button @click="artilleryBombard" class="smallBtn">{{ t('action.artillery') }}</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.actionArea {
  width: 280px;
  background: white;
  border: 1px solid #d0d8e0;
  border-radius: 4px;
  padding: 12px;
  font-size: 0.85rem;
}

.actionArea.disabled { opacity: 0.6; pointer-events: none; }

.actionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ecf0f1;
}

.actionHeader h3 { margin: 0; font-size: 1rem; color: #2c3e50; }

.commandPoints { font-size: 0.85rem; color: #2c3e50; }
.commandPoints strong { color: #f39c12; margin: 0 4px; }

.smallBtn {
  padding: 2px 8px;
  border: 1px solid #bdc3c7;
  border-radius: 3px;
  background: white;
  cursor: pointer;
  font-size: 0.8rem;
}
.smallBtn:hover { background: #f0f4f8; }

.notYourTurn, .gameOver {
  text-align: center;
  padding: 20px;
  color: #7f8c8d;
  font-style: italic;
}

.victoryText { margin-top: 6px; color: #2c3e50; font-style: normal; font-weight: bold; }

.gameError {
  margin-bottom: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  background: #fdecea;
  color: #c0392b;
  font-size: 0.8rem;
}

.phaseTabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.phaseTabs button {
  flex: 1;
  padding: 6px;
  border: 1px solid #bdc3c7;
  border-radius: 3px;
  background: white;
  cursor: pointer;
  font-size: 0.8rem;
}

.phaseTabs button.active {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.phaseTabs button:hover:not(.active) { background: #f0f4f8; }

.selectedUnits, .targetLocale {
  margin-bottom: 12px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.selectedUnits h4, .targetLocale h4 {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  color: #2c3e50;
}

.noSelection, .noTarget { color: #95a5a6; font-style: italic; font-size: 0.8rem; }

.unitList { display: flex; flex-direction: column; gap: 4px; }
.unitItem {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: white;
  border: 1px solid #ecf0f1;
  border-radius: 3px;
  font-size: 0.8rem;
}

.removeBtn {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 3px;
  background: #e74c3c;
  color: white;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}

.targetInfo { display: flex; justify-content: space-between; align-items: center; }
.clearBtn { padding: 2px 8px; font-size: 0.75rem; }

.actionButtons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.primaryBtn, .dangerBtn, .warningBtn, .secondaryBtn {
  padding: 10px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  font-size: 0.9rem;
}

.primaryBtn { background: #27ae60; color: white; }
.primaryBtn:hover:not(:disabled) { background: #219a52; }
.primaryBtn:disabled { opacity: 0.5; cursor: not-allowed; }

.dangerBtn { background: #e74c3c; color: white; }
.dangerBtn:hover:not(:disabled) { background: #c0392b; }

.warningBtn { background: #f39c12; color: white; }
.warningBtn:hover:not(:disabled) { background: #d4a80b; }

.secondaryBtn { background: #95a5a6; color: white; }
.secondaryBtn:hover { background: #7f8c8d; }

.specialActions {
  padding-top: 12px;
  border-top: 1px solid #ecf0f1;
}

.specialActions h4 { margin: 0 0 8px 0; font-size: 0.85rem; color: #2c3e50; }
.specialActions .smallBtn { margin-right: 4px; margin-bottom: 4px; }
</style>