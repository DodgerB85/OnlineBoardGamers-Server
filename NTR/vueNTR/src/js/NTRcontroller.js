// NTRcontroller.js - Input handling, move validation and server saves

import { useModelStore } from '../stores/NTRstore'
import * as model from './NTRmodel'
import * as rf from './NTRreference'
import * as IO from '../backend/NTR_IO'

let actionPhase = 'move' // 'move', 'attack', 'reveal'

export function selectLocale(localeId) {
  const store = useModelStore()
  store.selection.locale = store.selection.locale === localeId ? null : localeId
  return true
}

export function selectUnit(unitId) {
  const store = useModelStore()
  if (!store.myMove) return false

  const unit = model.getUnitById(unitId)
  if (!unit) return false

  // Check if unit belongs to current player's side
  const isAlliedTurn = store.phase === rf.PHASE_ALLIED_TURN
  if ((isAlliedTurn && unit.side !== rf.SIDE_ALLIED) || (!isAlliedTurn && unit.side !== rf.SIDE_FRENCH)) {
    return false
  }

  // Toggle unit selection
  const idx = store.selection.units.findIndex(u => u.id === unitId)
  if (idx >= 0) {
    store.selection.units.splice(idx, 1)
  } else {
    store.selection.units.push(unit)
  }
  return true
}

export function clearSelection() {
  const store = useModelStore()
  store.selection.units = []
  store.selection.locale = null
}

export function setActionPhase(phase) {
  actionPhase = phase
}

export function canMoveUnit(unit, targetLocaleId) {
  const store = useModelStore()
  if (!store.myMove) return { valid: false, reason: 'Not your turn' }

  const currentLocale = unit.locale
  const adjacent = store.board.approaches.some(a =>
    (a.from === currentLocale && a.to === targetLocaleId) ||
    (a.to === currentLocale && a.from === targetLocaleId)
  )

  if (!adjacent) return { valid: false, reason: 'Target not adjacent' }

  // Check approach capacity
  const approach = store.board.approaches.find(a =>
    (a.from === currentLocale && a.to === targetLocaleId) ||
    (a.to === currentLocale && a.from === targetLocaleId)
  )

  if (approach) {
    const unitsOnApproach = store.board.units.filter(u =>
      (u.locale === currentLocale || u.locale === targetLocaleId) &&
      u.side === unit.side
    ).length

    const capacity = approach.type === rf.APPROACH_WIDE ? rf.WIDE_APPROACH_CAPACITY : rf.NARROW_APPROACH_CAPACITY
    if (unitsOnApproach >= capacity) {
      return { valid: false, reason: 'Approach at capacity' }
    }
  }

  return { valid: true }
}

export function canAttack(targetLocaleId) {
  const store = useModelStore()
  if (!store.myMove) return { valid: false, reason: 'Not your turn' }
  if (store.selection.units.length === 0) return { valid: false, reason: 'No units selected' }
  if (!targetLocaleId) return { valid: false, reason: 'No target locale' }

  // Check if enemy units present
  const isAlliedTurn = store.phase === rf.PHASE_ALLIED_TURN
  const enemySide = isAlliedTurn ? rf.SIDE_FRENCH : rf.SIDE_ALLIED
  const enemyUnits = model.getUnitsAtLocale(targetLocaleId, enemySide)

  if (enemyUnits.length === 0) return { valid: false, reason: 'No enemy units at target' }

  // Check if adjacent
  const currentLocale = store.selection.units[0].locale
  const adjacent = store.board.approaches.some(a =>
    (a.from === currentLocale && a.to === targetLocaleId) ||
    (a.to === currentLocale && a.from === targetLocaleId)
  )

  if (!adjacent) return { valid: false, reason: 'Target not adjacent' }

  return { valid: true }
}

export function executeMove(units, targetLocaleId) {
  const results = []

  for (const unit of units) {
    const check = canMoveUnit(unit, targetLocaleId)
    if (!check.valid) {
      results.push({ unit: unit.id, success: false, reason: check.reason })
      continue
    }

    model.moveUnit(unit.id, targetLocaleId)
    results.push({ unit: unit.id, success: true })
  }

  clearSelection()
  afterAction()
  return results
}

export function executeAttack(units, targetLocaleId) {
  const store = useModelStore()
  if (!canAttack(targetLocaleId).valid) return { success: false, reason: 'Invalid attack' }

  const isAlliedTurn = store.phase === rf.PHASE_ALLIED_TURN
  const enemySide = isAlliedTurn ? rf.SIDE_FRENCH : rf.SIDE_ALLIED
  const enemyUnits = model.getUnitsAtLocale(targetLocaleId, enemySide)

  // Simple combat: each attacking unit rolls dice vs each defending unit
  const results = []
  let attackerLosses = 0
  let defenderLosses = 0

  for (const attacker of units) {
    for (const defender of enemyUnits) {
      // Combat resolution (simplified)
      const atkRoll = Math.floor(Math.random() * rf.COMBAT_DICE_SIDES) + 1
      const defRoll = Math.floor(Math.random() * rf.COMBAT_DICE_SIDES) + 1

      // Attacker strength modifies roll
      const atkTotal = atkRoll + attacker.strength
      const defTotal = defRoll + defender.strength

      if (atkTotal > defTotal) {
        // Defender takes hit
        model.applyCombatLoss(defender.id, 1)
        defenderLosses++
        results.push({ attacker: attacker.id, defender: defender.id, result: 'hit' })
      } else {
        // Attacker takes hit
        model.applyCombatLoss(attacker.id, 1)
        attackerLosses++
        results.push({ attacker: attacker.id, defender: defender.id, result: 'miss' })
      }
    }
  }

  store.addHistoryEntry({
    turn: store.turn,
    phase: store.phase,
    player: isAlliedTurn ? 'Allied' : 'French',
    action: `Attack on ${targetLocaleId}: ${attackerLosses} attacker losses, ${defenderLosses} defender losses`,
    side: isAlliedTurn ? rf.SIDE_ALLIED : rf.SIDE_FRENCH,
  })

  clearSelection()
  afterAction()

  return { success: true, attackerLosses, defenderLosses, results }
}

export function executeReveal(units) {
  const store = useModelStore()
  if (!store.myMove) return { success: false, reason: 'Not your turn' }
  if (units.length === 0) return { success: false, reason: 'No units selected' }

  for (const unit of units) {
    unit.revealed = true
    // Also reveal in hidden data
    const key = `${unit.locale}_${unit.id}`
    store.hiddenData[key] = { ...unit, revealed: true }
  }

  store.addHistoryEntry({
    turn: store.turn,
    phase: store.phase,
    player: store.phase === rf.PHASE_ALLIED_TURN ? 'Allied' : 'French',
    action: `Revealed ${units.length} unit(s)`,
    side: store.phase === rf.PHASE_ALLIED_TURN ? rf.SIDE_ALLIED : rf.SIDE_FRENCH,
  })

  clearSelection()
  afterAction()

  return { success: true }
}

export function passTurn() {
  const store = useModelStore()
  if (!store.myMove) return false

  const nextPhase = store.phase === rf.PHASE_ALLIED_TURN ? rf.PHASE_FRENCH_TURN : rf.PHASE_ALLIED_TURN
  const nextTurn = nextPhase === rf.PHASE_ALLIED_TURN ? store.turn + 1 : store.turn

  // Check for game end
  if (nextTurn > rf.MAX_ROUNDS) {
    store.phase = rf.PHASE_GAME_OVER
  } else {
    store.turn = nextTurn
    store.phase = nextPhase
  }

  clearSelection()
  afterAction()
  return true
}

export function reorganize() {
  // Reorganize units within locale (consolidate steps)
  const store = useModelStore()
  if (!store.myMove) return

  // Group units by locale and type, merge same types
  const groups = {}
  for (const unit of store.board.units) {
    const key = `${unit.locale}_${unit.type}_${unit.side}`
    if (!groups[key]) groups[key] = []
    groups[key].push(unit)
  }

  for (const key of Object.keys(groups)) {
    const units = groups[key]
    if (units.length > 1) {
      // Keep strongest, absorb others
      units.sort((a, b) => b.strength - a.strength)
      const main = units[0]
      for (let i = 1; i < units.length; i++) {
        main.strength = Math.min(main.strength + units[i].strength, 4) // Max strength 4
        store.board.units = store.board.units.filter(u => u.id !== units[i].id)
      }
    }
  }

  afterAction()
}

export function forcedMarch() {
  // Allow extra movement at cost of morale
  const store = useModelStore()
  if (!store.myMove) return

  const sideKey = store.phase === rf.PHASE_ALLIED_TURN ? 'allied' : 'french'
  if (store.board.morale[sideKey] <= 1) return // Can't forced march if morale too low

  store.board.morale[sideKey] -= 1
  store.addHistoryEntry({
    turn: store.turn,
    phase: store.phase,
    player: store.phase === rf.PHASE_ALLIED_TURN ? 'Allied' : 'French',
    action: 'Forced march (morale -1)',
    side: store.phase === rf.PHASE_ALLIED_TURN ? rf.SIDE_ALLIED : rf.SIDE_FRENCH,
  })

  afterAction()
}

export function artilleryBombard() {
  // Artillery can attack from 2 locales away; range-2 pathfinding is not
  // implemented, so this spends nothing and sends nothing.
  const store = useModelStore()
  if (!store.myMove) return
}

// Every action ends here: persist the position, then decide whether the game is over.
function afterAction() {
  const store = useModelStore()
  model.saveGameState()

  const victory = model.checkVictory()
  if (!victory) {
    IO.saveGame()
    return
  }

  store.phase = rf.PHASE_GAME_OVER
  store.finishedGame = true
  store.victory = victory
  const finish = buildFinishPayload(victory)
  IO.saveGame({ status: 'FINISHED', winner: finish.winner, finalPositions: finish.finalPositions })
}

// The server marks winners by username and orders the result by seat index.
function buildFinishPayload(victory) {
  const store = useModelStore()
  const seats = store.players.map((player, seat) => ({ player, seat }))

  if (victory.winner === 'draw') {
    // Nobody is marked as a winner; every seat shares the result.
    return { winner: [], finalPositions: seats.map(({ seat }) => seat) }
  }

  const winners = seats.filter(({ player }) => player.side === victory.winner)
  const losers = seats.filter(({ player }) => player.side !== victory.winner)
  return {
    winner: winners.map(({ player }) => player.username),
    finalPositions: [...winners, ...losers].map(({ seat }) => seat),
  }
}
