// NTRfuncs.js - Utility functions

import * as rf from './NTRreference'

// Pathfinding for approach network
export function findPath(board, fromLocale, toLocale, side, unitType) {
  // A* pathfinding on the approach graph
  const openSet = [{ locale: fromLocale, g: 0, h: heuristic(fromLocale, toLocale, board), f: 0, path: [] }]
  const closedSet = new Set()

  openSet[0].f = openSet[0].h

  while (openSet.length > 0) {
    // Find lowest f score
    openSet.sort((a, b) => a.f - b.f)
    const current = openSet.shift()

    if (current.locale === toLocale) {
      return current.path
    }

    closedSet.add(current.locale)

    // Get neighbors
    const approaches = board.approaches.filter(a =>
      (a.from === current.locale || a.to === current.locale) &&
      canTraverseApproach(a, side, unitType)
    )

    for (const approach of approaches) {
      const neighbor = approach.from === current.locale ? approach.to : approach.from
      if (closedSet.has(neighbor)) continue

      const moveCost = getApproachMoveCost(approach, unitType)
      const tentativeG = current.g + moveCost

      const existing = openSet.find(n => n.locale === neighbor)
      if (!existing || tentativeG < existing.g) {
        const newPath = [...current.path, { approach: approach.id, locale: neighbor }]
        const h = heuristic(neighbor, toLocale, board)
        if (existing) {
          existing.g = tentativeG
          existing.f = tentativeG + h
          existing.path = newPath
        } else {
          openSet.push({ locale: neighbor, g: tentativeG, h, f: tentativeG + h, path: newPath })
        }
      }
    }
  }

  return null // No path found
}

function heuristic(localeA, localeB, board) {
  const posA = board.locales.find(l => l.id === localeA)?.position
  const posB = board.locales.find(l => l.id === localeB)?.position
  if (!posA || !posB) return 0
  return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y)
}

function canTraverseApproach(approach, side, unitType) {
  // Check cavalry penalty
  if (unitType === rf.UNIT_CAVALRY && rf.CAVALRY_PENALTY_TERRAINS.has(approach.terrain)) {
    return false // Or could allow with penalty
  }
  // Check capacity (would need current units on approach)
  return true
}

function getApproachMoveCost(approach, unitType) {
  let cost = 1
  if (approach.terrain === rf.APPROACH_TERRAIN_TYPES.ROUGH) cost += 1
  if (approach.terrain === rf.APPROACH_TERRAIN_TYPES.WOODED) cost += 1
  if (approach.terrain === rf.APPROACH_TERRAIN_TYPES.STREAM) cost += 1
  if (approach.terrain === rf.APPROACH_TERRAIN_TYPES.RIVER) cost += 2
  if (approach.terrain === rf.APPROACH_TERRAIN_TYPES.ROAD) cost = 0.5
  return cost
}

// Combat utilities
export function calculateCombatOdds(attacker, defender, approach) {
  // Returns probability distribution of outcomes
  const atkStrength = attacker.strength
  const defStrength = defender.strength

  // Base odds on strength difference
  const diff = atkStrength - defStrength

  // Terrain modifier
  let terrainMod = 0
  if (approach.terrain === rf.APPROACH_TERRAIN_TYPES.ROUGH) terrainMod -= 1
  if (approach.terrain === rf.APPROACH_TERRAIN_TYPES.WOODED) terrainMod -= 1
  if (approach.terrain === rf.APPROACH_TERRAIN_TYPES.STREAM) terrainMod -= 1
  if (approach.terrain === rf.APPROACH_TERRAIN_TYPES.RIVER) terrainMod -= 2

  const finalDiff = diff + terrainMod

  // Convert to rough percentages
  if (finalDiff >= 3) return { attackerWin: 0.8, defenderWin: 0.1, draw: 0.1 }
  if (finalDiff >= 1) return { attackerWin: 0.6, defenderWin: 0.2, draw: 0.2 }
  if (finalDiff >= -1) return { attackerWin: 0.4, defenderWin: 0.3, draw: 0.3 }
  if (finalDiff >= -3) return { attackerWin: 0.2, defenderWin: 0.5, draw: 0.3 }
  return { attackerWin: 0.1, defenderWin: 0.7, draw: 0.2 }
}

export function rollCombatDice(count = 1) {
  const rolls = []
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * rf.COMBAT_DICE_SIDES) + 1)
  }
  return rolls
}

// Fog of war utilities
export function isLocaleVisible(board, localeId, viewerSide) {
  const locale = board.locales.find(l => l.id === localeId)
  if (!locale) return false
  if (!locale.fogged) return true
  if (locale.revealed) return true

  // Check if any adjacent locale is occupied by viewer's units
  const adjacentApproaches = board.approaches.filter(a =>
    a.from === localeId || a.to === localeId
  )

  for (const approach of adjacentApproaches) {
    const otherLocale = approach.from === localeId ? approach.to : approach.from
    const units = board.units.filter(u => u.locale === otherLocale && u.side === viewerSide)
    if (units.length > 0) return true
  }

  return false
}

export function revealLocale(board, localeId) {
  const locale = board.locales.find(l => l.id === localeId)
  if (locale) {
    locale.revealed = true
    locale.fogged = false
  }
}

export function hideLocale(board, localeId) {
  const locale = board.locales.find(l => l.id === localeId)
  if (locale) {
    locale.fogged = true
    locale.revealed = false
  }
}

// Unit utilities
export function getUnitStrengthTotal(units) {
  return units.reduce((sum, u) => sum + u.strength, 0)
}

export function getUnitsByType(units, type) {
  return units.filter(u => u.type === type)
}

export function getUnitsByCorps(units, corps) {
  return units.filter(u => u.corps === corps)
}

export function canUnitCommand(unit) {
  return unit.type === rf.UNIT_COMMANDER
}

export function getCommandRange(unit) {
  return rf.UNIT_STATS[unit.type]?.command || 0
}

// Victory checking
export function checkTerritorialVictory(board) {
  let alliedObjectives = 0
  let frenchObjectives = 0

  for (const objId of board.objectives) {
    const alliedUnits = board.units.filter(u => u.locale === objId && u.side === rf.SIDE_ALLIED)
    const frenchUnits = board.units.filter(u => u.locale === objId && u.side === rf.SIDE_FRENCH)

    const hasAlliedCommander = alliedUnits.some(u => u.type === rf.UNIT_COMMANDER)
    const hasFrenchCommander = frenchUnits.some(u => u.type === rf.UNIT_COMMANDER)
    const hasAlliedInfantry = alliedUnits.some(u => u.type === rf.UNIT_INFANTRY || u.type === rf.UNIT_GUARD_INFANTRY || u.type === rf.UNIT_ARTILLERY)
    const hasFrenchInfantry = frenchUnits.some(u => u.type === rf.UNIT_INFANTRY || u.type === rf.UNIT_GUARD_INFANTRY || u.type === rf.UNIT_ARTILLERY)

    if (hasAlliedCommander && hasAlliedInfantry) alliedObjectives++
    if (hasFrenchCommander && hasFrenchInfantry) frenchObjectives++
  }

  return { alliedObjectives, frenchObjectives }
}

// Serialization helpers
export function compressGameData(data) {
  const jsonString = JSON.stringify(data)
  return btoa(jsonString) // Simple base64, could use pako for gzip
}

export function decompressGameData(compressed) {
  try {
    const jsonString = atob(compressed)
    return JSON.parse(jsonString)
  } catch {
    return null
  }
}

// Random utilities
export function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function weightedRandom(choices) {
  // choices: [{weight: number, value: any}, ...]
  const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0)
  let random = Math.random() * totalWeight

  for (const choice of choices) {
    random -= choice.weight
    if (random <= 0) return choice.value
  }
  return choices[choices.length - 1].value
}