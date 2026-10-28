// NTR_IO.js - Server communication for Napoleon's Triumph
import * as rf from '../js/NTRreference'
import * as model from '../js/NTRmodel'
import { useModelStore } from '../stores/NTRstore'

const SUPER_USERS = [
  'admin', 'DodgerB', 'Burmer', 'Batch', 'Beezy', 'Benkyo', 'BigBad',
  'Brent', 'BotKickStarter', 'Burmer', 'DodgerB', 'Dopple', 'Dycu',
  'F1087', 'Ftep', 'Gauss', 'Hohohale', 'Jasonbartfast', 'JoshuaAcosta',
  'Jungy', 'Juni', 'Kawlos', 'Lemem', 'Melk0r', 'PhasingPlayer', 'RJ_E',
  'Rastko', 'RedWater', 'SaintJason', 'Shoopuffman', 'Steveth', 'Strange8ractor',
  'TDUBZ', 'burmer', 'craggybackhand', 'durendal', 'enavico', 'gdc', 'h',
  'ha.steven', 'huddyrx', 'jmelliere', 'joshuastarr', 'kbbr', 'krieg90',
  'looogic', 'massibull', 'michazhn', 'phil', 'siddhig', 'timmymayes',
  'user1', 'vraid', 'waymost',
]

const DEBUG_USERS = [
  'admin', 'DodgerB', 'Burmer', 'Batch', 'Beezy', 'Benkyo', 'BigBad',
  'Brent', 'BotKickStarter', 'Burmer', 'DodgerB', 'Dopple', 'Dycu',
  'F1087', 'Ftep', 'Gauss', 'Hohohale', 'Jasonbartfast', 'JoshuaAcosta',
  'Jungy', 'Juni', 'Kawlos', 'Lemem', 'Melk0r', 'PhasingPlayer', 'RJ_E',
  'Rastko', 'RedWater', 'SaintJason', 'Shoopuffman', 'Steveth', 'Strange8ractor',
  'TDUBZ',
]

const PRACTICE_USERS = []

export { SUPER_USERS, DEBUG_USERS, PRACTICE_USERS }

const API_BASE = '/NTR/'
const POLL_INTERVAL_MS = 5000

let saveQueue = Promise.resolve()

async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
      ...options.headers,
    },
    credentials: 'same-origin',
  })

  if (!response.ok) {
    if (response.status === 403) {
      window.location.href = '/login/'
      return
    }
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

function getCsrfToken() {
  const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]')
  if (csrfInput) return csrfInput.value
  const csrfMeta = document.querySelector('meta[name="csrf-token"]')
  if (csrfMeta) return csrfMeta.getAttribute('content')
  // Try to get from cookie
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrftoken') return value
  }
  return ''
}

export function playersOnSide(store, side) {
  return store.players.filter(player => player.side === side).map(player => player.username)
}

function playersForCurrentPhase(store) {
  return playersOnSide(store, store.phase === rf.PHASE_ALLIED_TURN ? rf.SIDE_ALLIED : rf.SIDE_FRENCH)
}

// Saves are serialised: a second action handed in while the first request is in
// flight would otherwise post the same latestUpdate and be rejected as stale.
export function saveGame({ status = 'ACTIVE', winner = [], finalPositions = [] } = {}) {
  saveQueue = saveQueue.then(() => doSaveGame({ status, winner, finalPositions }))
  return saveQueue
}

async function doSaveGame({ status, winner, finalPositions }) {
  const store = useModelStore()
  if (!store.gameID) return

  const postData = {
    action: 'saveGame',
    gameID: store.gameID,
    latestUpdate: store.latestUpdate,
    gameData: store.gameData,
    turn: store.turn,
    phase: store.phase,
    nextPlayer: status === 'FINISHED' ? [] : playersForCurrentPhase(store),
    status,
    saveRewind: status !== 'FINISHED',
  }
  if (status === 'FINISHED') {
    postData.winner = winner
    postData.finalPositions = finalPositions
  }

  store.viewSettings.showLoader = true
  try {
    const data = await fetchWithAuth(`${API_BASE}processNTRturn/`, {
      method: 'POST',
      body: JSON.stringify(postData),
    })
    if (!data) return
    if (data.syncError) {
      store.gameMessages = { errorText: 'Another player moved first - loading the latest position.' }
      await checkForLatestData(true)
      return
    }
    store.latestUpdate = data.latestUpdate
    if (data.secondsToNextKickout !== undefined) store.secondsToNextKickout = data.secondsToNextKickout
    store.gameMessages = { errorText: '', successText: '' }
  } catch (error) {
    console.error('Error saving:', error)
    store.gameMessages = { errorText: 'Could not save the move. Please reload the game.' }
  } finally {
    store.viewSettings.showLoader = false
  }
}

// Poll endpoint: returns only latestUpdate unless something changed.
export async function checkForLatestData(force = false) {
  const store = useModelStore()
  if (!store.gameID) return
  // Spectators have no logged-in identity; the data endpoint requires one.
  if (!window.initData || !window.initData.name) return
  if (!force && (store.viewSettings.performingRewind || store.viewSettings.showReplay)) return

  try {
    const data = await fetchWithAuth(`${API_BASE}data/3/`, {
      method: 'POST',
      body: JSON.stringify({ gameID: store.gameID, latestUpdate: store.latestUpdate }),
    })
    if (!data) return
    if (data.gameDoesNotExist) return
    if (data.latest === true) {
      if (data.finishedGame) store.finishedGame = true
      return
    }

    store.latestUpdate = data.latestUpdate
    if (data.secondsToNextKickout !== undefined) store.secondsToNextKickout = data.secondsToNextKickout
    store.finishedGame = data.finishedGame || false
    importServerData(data.gameData)
  } catch (error) {
    console.error('Error fetching data:', error)
  }
}

// Replace the local position with the server's, keeping the selection cleared so
// stale unit references from the old position cannot be submitted.
export function importServerData(gameData) {
  const store = useModelStore()
  store.selection = { units: [], locale: null }
  model.parseGameData(gameData)
  store.gameData = gameData
  store.finishedGame = store.finishedGame || store.phase === rf.PHASE_GAME_OVER
  // Derive the result locally so the opponent sees why the game ended.
  if (store.phase === rf.PHASE_GAME_OVER && !store.victory) store.victory = model.checkVictory()
}

export async function loadGame(gameID) {
  return fetchWithAuth(`${API_BASE}data/1/`, {
    method: 'POST',
    body: JSON.stringify({ gameID, latestUpdate: window.initData.latestUpdate }),
  })
}

export async function loadRewind(gameID, latestUpdate) {
  return fetchWithAuth(`${API_BASE}processNTRturn/`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'loadRewind',
      gameID,
      latestUpdate,
    }),
  })
}

export async function resign(gameID, latestUpdate) {
  return fetchWithAuth(`${API_BASE}processNTRturn/`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'resign',
      gameID,
      latestUpdate,
    }),
  })
}

// Chat
export async function sendChatMessage(gameID, message) {
  return fetchWithAuth(`${API_BASE}sendChatMessage/`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'sendChatMessage',
      gameID,
      newEntry: [window.initData.name, Date.now(), message],
    }),
  })
}

export async function loadChat(gameID) {
  return fetchWithAuth(`${API_BASE}data/2/`, {
    method: 'POST',
    body: JSON.stringify({ gameID }),
  })
}

// Notes
export async function saveNotes(gameID, notes) {
  return fetchWithAuth(`${API_BASE}saveNotesNTR/`, {
    method: 'POST',
    body: JSON.stringify({ gameID, notes }),
  })
}

// Zoom
export async function saveZoom(gameID, zoomLevel, allPlayers = false, playerNumber = 0) {
  return fetchWithAuth(`${API_BASE}saveZoomNTR/`, {
    method: 'PUT',
    body: JSON.stringify({
      action: 'zoom',
      gameID,
      zoomLevel,
      allPlayers,
      playerNumber,
    }),
  })
}

// Votes
export async function castVote(gameID, topic, choice) {
  return fetchWithAuth(`${API_BASE}castVote/`, {
    method: 'POST',
    body: JSON.stringify({ gameID, topic, choice }),
  })
}

// Bug report
export async function submitBugReport(gameID, description, gameData) {
  return fetchWithAuth(`${API_BASE}bugEntry/`, {
    method: 'POST',
    body: JSON.stringify({ gameID, description, gameData }),
  })
}

// Helper: Compress data with pako (gzip)
export function compressData(data) {
  const jsonString = JSON.stringify(data)
  const binaryString = pako.gzip(jsonString, { to: 'string' })
  return btoa(binaryString)
}

// Helper: Decompress data
export function decompressData(base64String) {
  const binaryString = atob(base64String)
  const data = pako.ungzip(binaryString, { to: 'string' })
  return JSON.parse(data)
}

export { POLL_INTERVAL_MS }
