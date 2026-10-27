// NTRmodel.js - Game state management
// Uses NTRmap.js for map topology and scenario definitions

import { useModelStore } from '../stores/NTRstore'
import * as rf from './NTRreference'
import * as NTRmap from './NTRmap'

export function initGame() {
  const store = useModelStore()
  // Initialize from window.initData
  if (typeof window !== 'undefined' && window.initData) {
    const d = window.initData
    store.gameID = d.gameID || 0
    store.gameName = d.gameName || ''
    store.gameData = d.gameData || ''
    store.turn = d.turn || 1
    store.phase = d.phase || 0
    store.finishedGame = d.finishedGame || false
    store.latestUpdate = d.latestUpdate || 0
    store.myZoomLevel = d.myZoomLevel || 16
    store.pov = d.pov || -99
    store.playerNames = d.playerNames || []
    store.currentPlayers = d.currentPlayers || []
    store.preferredNTRoptions = d.preferredNTRoptions || [-1, 1]

    // Parse startingMap to get scenario and options
    let scenarioSlug = 'dec_01'
    let options = { french_reinforcements: false, santon_fort: false, team_play: false }
    if (d.startingMap) {
      try {
        const startingMap = typeof d.startingMap === 'string' ? JSON.parse(d.startingMap) : d.startingMap
        scenarioSlug = startingMap.scenario || 'dec_01'
        options = startingMap.options || { french_reinforcements: false, santon_fort: false, team_play: false }
      } catch (e) {
        console.warn('Failed to parse startingMap:', e)
      }
    }
    store.scenario = scenarioSlug
    store.teamPlay = options.team_play || false
    store.options = options

    // Parse game data
    if (store.gameData) {
      parseGameData(store.gameData)
    } else {
      // NEW GAME: Build initial state from scenario
      initializeNewGame(scenarioSlug, options)
    }
  }
}

function initializeNewGame(scenarioSlug, options) {
  const store = useModelStore()
  const initialState = NTRmap.buildInitialGameState(scenarioSlug, options)

  // Initialize board with map topology and scenario units
  store.board = {
    locales: initialState.board.locales,
    approaches: initialState.board.approaches,
    units: initialState.board.units,
    morale: initialState.board.morale,
    objectives: initialState.board.objectives,
    round: initialState.board.round,
  }
  store.turn = initialState.turn
  store.phase = initialState.phase
  store.fogOfWar = initialState.fog_of_war

  // Initialize turn order (Allied first)
  store.gameflow = {
    turnOrder: [0], // Allied player index 0
    fullTurnOrder: [0, 1], // Allied, French
    phase: 0, // Allied turn
  }

  // Save initial game state to server
  saveGameState()
}

export function parseGameData(data) {
  const store = useModelStore()
  if (!data) return

  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data

    if (parsed.board) {
      store.board = { ...store.board, ...parsed.board }
    }
    if (parsed.turn !== undefined) store.turn = parsed.turn
    if (parsed.phase !== undefined) store.phase = parsed.phase
    if (parsed.morale) store.board.morale = parsed.morale
    if (parsed.hiddenData) store.hiddenData = parsed.hiddenData
    if (parsed.corpsAssignments) store.corpsAssignments = parsed.corpsAssignments
    if (parsed.fogOfWar) store.fogOfWar = parsed.fogOfWar

    // Update player data
    if (parsed.players) {
      store.players = parsed.players
    }
    if (parsed.gameflow) {
      store.gameflow = { ...store.gameflow, ...parsed.gameflow }
    }
  } catch (e) {
    console.error('Failed to parse game data:', e)
  }
}

export function serializeGameData() {
  const store = useModelStore()
  return JSON.stringify({
    board: store.board,
    turn: store.turn,
    phase: store.phase,
    morale: store.board.morale,
    hiddenData: store.hiddenData,
    corpsAssignments: store.corpsAssignments,
    fogOfWar: store.fogOfWar,
    players: store.players,
    gameflow: store.gameflow,
  })
}

export function saveGameState() {
  const store = useModelStore()
  store.gameData = serializeGameData()
  // Actual save to server happens via IO.saveGame
}

export function getUnitsAtLocale(localeId, side = null) {
  const store = useModelStore()
  return store.board.units.filter(u =>
    u.locale === localeId && (side === null || u.side === side)
  )
}

export function getUnitById(unitId) {
  const store = useModelStore()
  return store.board.units.find(u => u.id === unitId)
}

export function moveUnit(unitId, targetLocaleId) {
  const store = useModelStore()
  const unit = store.board.units.find(u => u.id === unitId)
  if (unit) {
    unit.locale = targetLocaleId
    store.addHistoryEntry({
      turn: store.turn,
      phase: store.phase,
      player: unit.side === 'ALLIED' ? 'Allied' : 'French',
      action: `Moved ${rf.UNIT_DISPLAY_NAMES[unit.type]} to ${targetLocaleId}`,
      side: unit.side,
    })
    return true
  }
  return false
}

export function applyCombatLoss(unitId, stepsLost) {
  const store = useModelStore()
  const unit = store.board.units.find(u => u.id === unitId)
  if (unit) {
    unit.strength = Math.max(0, unit.strength - stepsLost)

    // Morale loss
    const sideKey = unit.side === 'ALLIED' ? 'allied' : 'french'
    store.board.morale[sideKey] = Math.max(0, store.board.morale[sideKey] - stepsLost * rf.MORALE_LOSS_STEP_LOSS)

    // Check for guard destruction
    if (unit.type === rf.UNIT_GUARD_INFANTRY && unit.strength === 0) {
      store.board.morale[sideKey] = Math.max(0, store.board.morale[sideKey] - rf.MORALE_LOSS_GUARD_DESTROYED)
    }

    // Remove dead units
    if (unit.strength === 0) {
      store.board.units = store.board.units.filter(u => u.id !== unitId)
    }

    store.addHistoryEntry({
      turn: store.turn,
      phase: store.phase,
      player: unit.side === 'ALLIED' ? 'Allied' : 'French',
      action: `${rf.UNIT_DISPLAY_NAMES[unit.type]} lost ${stepsLost} step(s)`,
      side: unit.side,
    })
  }
}

export function checkVictory() {
  const store = useModelStore()

  // Demoralization victory
  if (store.board.morale.allied <= 0) return { winner: 'FRENCH', type: 'demoralization' }
  if (store.board.morale.french <= 0) return { winner: 'ALLIED', type: 'demoralization' }

  // End of game (Round 10) - territorial objectives
  if (store.turn > rf.MAX_ROUNDS) {
    let alliedObjectives = 0
    let frenchObjectives = 0

    for (const objId of store.board.objectives) {
      const alliedUnits = getUnitsAtLocale(objId, 'ALLIED')
      const frenchUnits = getUnitsAtLocale(objId, 'FRENCH')

      const hasAlliedCommander = alliedUnits.some(u => u.type === rf.UNIT_COMMANDER)
      const hasFrenchCommander = frenchUnits.some(u => u.type === rf.UNIT_COMMANDER)
      const hasAlliedInfantry = alliedUnits.some(u => u.type === rf.UNIT_INFANTRY || u.type === rf.UNIT_GUARD_INFANTRY || u.type === rf.UNIT_ARTILLERY)
      const hasFrenchInfantry = frenchUnits.some(u => u.type === rf.UNIT_INFANTRY || u.type === rf.UNIT_GUARD_INFANTRY || u.type === rf.UNIT_ARTILLERY)

      if (hasAlliedCommander && hasAlliedInfantry) alliedObjectives++
      if (hasFrenchCommander && hasFrenchInfantry) frenchObjectives++
    }

    if (alliedObjectives > frenchObjectives) return { winner: 'ALLIED', type: 'territorial', alliedObjectives, frenchObjectives }
    if (frenchObjectives > alliedObjectives) return { winner: 'FRENCH', type: 'territorial', alliedObjectives, frenchObjectives }
    return { winner: 'draw', type: 'territorial', alliedObjectives, frenchObjectives }
  }

  return null
}

// Helper functions for map topology
export function getAdjacentLocales(localeId) {
  return NTRmap.getAdjacentLocales(localeId)
}

export function getApproachBetween(localeA, localeB) {
  return NTRmap.getApproachBetween(localeA, localeB)
}

export function getApproachesFrom(localeId) {
  return NTRmap.getApproachesFrom(localeId)
}