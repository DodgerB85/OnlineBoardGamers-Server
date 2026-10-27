// NTRbot.js - AI opponent (SHADOW) for training games

import { useModelStore } from '../stores/NTRstore'
import * as model from './NTRmodel'
import * as rf from './NTRreference'
import * as funcs from './NTRfuncs'

export class NTRBot {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty
    this.thinkTime = difficulty === 'easy' ? 500 : difficulty === 'hard' ? 2000 : 1000
  }

  async takeTurn() {
    const store = useModelStore()
    if (!store.myMove) return false

    // Simulate thinking
    await this.sleep(this.thinkTime)

    const isAlliedTurn = store.phase === rf.PHASE_ALLIED_TURN
    const botSide = isAlliedTurn ? rf.SIDE_ALLIED : rf.SIDE_FRENCH

    // Get all bot units that can act
    const botUnits = store.board.units.filter(u => u.side === botSide)
    const enemySide = botSide === rf.SIDE_ALLIED ? rf.SIDE_FRENCH : rf.SIDE_ALLIED
    const enemyUnits = store.board.units.filter(u => u.side === enemySide)

    if (botUnits.length === 0) {
      return this.passTurn()
    }

    // Simple AI: prioritize objectives, then attack, then move toward objectives
    const action = this.chooseAction(botUnits, enemyUnits, store)

    switch (action.type) {
      case 'attack':
        return this.executeAttack(action)
      case 'move':
        return this.executeMove(action)
      case 'reveal':
        return this.executeReveal(action)
      case 'pass':
        return this.passTurn()
    }
  }

  chooseAction(botUnits, enemyUnits, store) {
    // Check for adjacent enemies to attack
    for (const unit of botUnits) {
      const adjacentLocales = this.getAdjacentLocales(unit.locale, store)
      for (const adjLocale of adjacentLocales) {
        const enemies = enemyUnits.filter(e => e.locale === adjLocale)
        if (enemies.length > 0) {
          // Prefer attacking weakened enemies
          const target = enemies.reduce((weakest, e) =>
            e.strength < weakest.strength ? e : weakest
          )
          return {
            type: 'attack',
            attacker: unit,
            targetLocale: adjLocale,
            targetUnit: target,
          }
        }
      }
    }

    // Move toward nearest objective
    const objectives = store.board.objectives || []
    for (const unit of botUnits) {
      if (unit.type === rf.UNIT_COMMANDER) continue // Commanders stay back

      const bestObjective = this.findBestObjective(unit, objectives, store)
      if (bestObjective) {
        const path = funcs.findPath(store.board, unit.locale, bestObjective, unit.side, unit.type)
        if (path && path.length > 0) {
          const nextStep = path[0].locale
          // Check if can move there
          const moveCheck = this.canMoveTo(unit, nextStep, store)
          if (moveCheck.valid) {
            return {
              type: 'move',
              unit: unit,
              targetLocale: nextStep,
            }
          }
        }
      }
    }

    // Reveal hidden units if any
    const hiddenUnits = botUnits.filter(u => !u.revealed)
    if (hiddenUnits.length > 0 && Math.random() < 0.3) {
      return {
        type: 'reveal',
        units: [hiddenUnits[0]],
      }
    }

    return { type: 'pass' }
  }

  getAdjacentLocales(localeId, store) {
    const approaches = store.board.approaches.filter(a =>
      a.from === localeId || a.to === localeId
    )
    return approaches.map(a => a.from === localeId ? a.to : a.from)
  }

  findBestObjective(unit, objectives, store) {
    // Find closest objective not controlled by us
    let best = null
    let bestDist = Infinity

    for (const objId of objectives) {
      const ourUnits = store.board.units.filter(u =>
        u.locale === objId && u.side === unit.side
      )
      const hasCommander = ourUnits.some(u => u.type === rf.UNIT_COMMANDER)
      const hasInfantry = ourUnits.some(u =>
        u.type === rf.UNIT_INFANTRY || u.type === rf.UNIT_GUARD_INFANTRY || u.type === rf.UNIT_ARTILLERY
      )

      if (hasCommander && hasInfantry) continue // Already controlled

      const path = funcs.findPath(store.board, unit.locale, objId, unit.side, unit.type)
      if (path && path.length < bestDist) {
        bestDist = path.length
        best = objId
      }
    }

    return best
  }

  canMoveTo(unit, targetLocale, store) {
    // Check adjacency
    const approaches = store.board.approaches.filter(a =>
      (a.from === unit.locale && a.to === targetLocale) ||
      (a.to === unit.locale && a.from === targetLocale)
    )

    if (approaches.length === 0) return { valid: false }

    // Check capacity
    for (const approach of approaches) {
      const unitsOnApproach = store.board.units.filter(u =>
        (u.locale === unit.locale || u.locale === targetLocale) &&
        u.side === unit.side
      ).length

      const capacity = approach.type === rf.APPROACH_WIDE ? rf.WIDE_APPROACH_CAPACITY : rf.NARROW_APPROACH_CAPACITY
      if (unitsOnApproach >= capacity) {
        return { valid: false, reason: 'capacity' }
      }
    }

    return { valid: true }
  }

  async executeAttack(action) {
    // Use the controller's attack function
    const { executeAttack } = await import('./NTRcontroller')
    return executeAttack([action.attacker], action.targetLocale)
  }

  async executeMove(action) {
    const { executeMove } = await import('./NTRcontroller')
    return executeMove([action.unit], action.targetLocale)
  }

  async executeReveal(action) {
    const { executeReveal } = await import('./NTRcontroller')
    return executeReveal(action.units)
  }

  async passTurn() {
    const { passTurn } = await import('./NTRcontroller')
    return passTurn()
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton for easy use
export const ntrBot = new NTRBot('normal')

// Function to start bot turn if it's bot's turn
export async function checkBotTurn() {
  const store = useModelStore()
  // Check if current player is a bot (SHADOW)
  const currentPlayers = store.currentPlayers
  const isBotTurn = currentPlayers.some(p => p.startsWith('SHADOW') || p.startsWith('NtrBot'))

  if (isBotTurn && store.myMove) {
    await ntrBot.takeTurn()
  }
}