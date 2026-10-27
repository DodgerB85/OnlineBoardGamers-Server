// NTRreplay.js - Replay functionality

import { useModelStore } from '../stores/NTRstore'

let replayMode = false
let replayIndex = -1
let replayHistory = []

export function startReplay() {
  const store = useModelStore()
  if (store.history.length === 0) return false

  replayMode = true
  replayHistory = [...store.history].reverse() // Chronological order
  replayIndex = 0
  store.viewSettings.showReplay = true
  store.viewSettings.generatingReplay = true

  applyReplayStep(0)
  store.viewSettings.generatingReplay = false
  return true
}

export function exitReplay() {
  const store = useModelStore()
  replayMode = false
  replayIndex = -1
  store.viewSettings.showReplay = false
  // Restore current game state
  applyReplayStep(replayHistory.length - 1)
}

export function performStep(direction) {
  const store = useModelStore()
  if (!replayMode || replayHistory.length === 0) return

  const newIndex = replayIndex + direction
  if (newIndex < 0 || newIndex >= replayHistory.length) return

  replayIndex = newIndex
  applyReplayStep(replayIndex)
  store.replayIndex = replayIndex
}

export function jumpTo(index) {
  if (index < 0 || index >= replayHistory.length) return
  replayIndex = index
  applyReplayStep(replayIndex)
}

function applyReplayStep(index) {
  const store = useModelStore()
  const entry = replayHistory[index]

  if (!entry) return

  // Restore game state to this point in history
  // This would need full state snapshots in history entries
  // For now, just update the display
  store.turn = entry.turn
  store.phase = entry.phase

  // If we have board state in entry, restore it
  if (entry.board) {
    store.board = { ...store.board, ...entry.board }
  }
}

export function recordHistoryEntry(entry) {
  const store = useModelStore()
  store.addHistoryEntry(entry)
}

export function getReplayInfo() {
  return {
    mode: replayMode,
    index: replayIndex,
    total: replayHistory.length,
  }
}

export function isReplayMode() {
  return replayMode
}