// NTR_IO.js - Server communication for Napoleon's Triumph
import * as rf from '../js/NTRreference'

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
      // Redirect to login
      window.location.href = '/login/'
      return
    }
    throw new Error(`HTTP error! status: ${response.status}`)
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

// Game Actions
export async function saveGame(gameData) {
  return fetchWithAuth(`${API_BASE}processNTRturn/`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'saveGame',
      gameID: window.initData.gameID,
      latestUpdate: window.initData.latestUpdate,
      gameData: gameData,
      turn: gameData.turn,
      phase: gameData.phase,
      nextPlayer: gameData.nextPlayer || [],
      status: gameData.status || 'ACTIVE',
      saveRewind: true,
    }),
  })
}

export async function loadGame(gameID) {
  return fetchWithAuth(`${API_BASE}data/1/`, {
    method: 'POST',
    body: JSON.stringify({ gameID, latestUpdate: window.initData.latestUpdate }),
  })
}

export async function pollGame(gameID, latestUpdate) {
  return fetchWithAuth(`${API_BASE}data/3/`, {
    method: 'POST',
    body: JSON.stringify({ gameID, latestUpdate }),
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

// Create game
export async function createGame(formData) {
  const response = await fetch(`${API_BASE}createNTRgame/`, {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
  })
  return response
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