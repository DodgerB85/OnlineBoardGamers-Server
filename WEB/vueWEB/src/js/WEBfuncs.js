/**
 * shuffle
 * removeItemAll
 * sleepPause
 * getCookie
 * timestampToString
 * htmlUnescape
 * decompressChatData
 * export
 * import
 */

import * as rf from './WEBreference'
import * as map from './WEBmap'
import * as model from './WEBmodel'

import { usePersonalStore } from '../stores/WEBpersonal.js'
import { useModelStore } from '../stores/WEBstore.js'

export const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1))
    //const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

// Seeded PRNG (mulberry32) — deterministic shuffle from a seed
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const seededShuffle = (array, seed) => {
  const rng = mulberry32(seed)
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(rng() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

export const generateSeed = () => {
  return Math.floor(Math.random() * 2147483647)
}

export function removeItemAll(arr, value) {
  var arrCopy = [...arr]
  var i = 0
  while (i < arr.length) {
    if (arrCopy[i] === value) {
      arrCopy.splice(i, 1)
    } else {
      ++i
    }
  }
  return arrCopy
}

export function sleepPause(miliseconds) {
  var currentTime = new Date().getTime()

  while (currentTime + miliseconds >= new Date().getTime()) {
    // Do Nothing
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// get CSRF for javascript
export function getCookie(name) {
  var cookieValue = null
  if (document.cookie && document.cookie !== '') {
    var cookies = document.cookie.split(';')
    for (var i = 0; i < cookies.length; i++) {
      var cookie = cookies[i].trim()
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
        break
      }
    }
  }
  return cookieValue
}

export function timestampToString(timestamp) {
  var d = new Date(timestamp)
  var res = ''
  if (d.getDate() < 10) res += '0' + d.getDate() + '/'
  else res += d.getDate() + '/'
  if (d.getMonth() < 9) res += '0' + (d.getMonth() + 1) + '/'
  else res += d.getMonth() + 1 + '/'
  res += d.getFullYear() + ' '
  if (d.getHours() < 10) res += '0' + d.getHours() + ':'
  else res += d.getHours() + ':'
  if (d.getMinutes() < 10) res += '0' + d.getMinutes() + ':'
  else res += d.getMinutes() + ':'
  if (d.getSeconds() < 10) res += '0' + d.getSeconds()
  else res += d.getSeconds()

  return res
}


export function chatTimestampToString(message1, idx) {
  const store = useModelStore()
  const personal = usePersonalStore()
  let timestamp = personal.gameCreationTimestamp // + message1 //* 1000)
  for (let i = idx; i < store.chatData.length; i++) {
    if (i >= 0) timestamp += store.chatData[i][1] // * 1000
  }
  timestamp = timestamp * 1000

  var d = new Date(timestamp)
  var res = ''
  if (d.getDate() < 10) res += '0' + d.getDate() + '/'
  else res += d.getDate() + '/'
  if (d.getMonth() < 9) res += '0' + (d.getMonth() + 1) + '/'
  else res += d.getMonth() + 1 + '/'
  res += d.getFullYear() + ' '
  if (d.getHours() < 10) res += '0' + d.getHours() + ':'
  else res += d.getHours() + ':'
  if (d.getMinutes() < 10) res += '0' + d.getMinutes() + ':'
  else res += d.getMinutes() + ':'
  if (d.getSeconds() < 10) res += '0' + d.getSeconds()
  else res += d.getSeconds()

  return res
}

export function htmlEscape(str) {
  return String(str)
    .replace(/(?:\r|\n|\r\n)/g, 'SNLB')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function htmlUnescape(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/SNLB/g, '\n')
}

export function decompressChatData(data) {
  if (data.length > 0) {
    let compressedData = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
    // eslint-disable-next-line no-undef
    let decompressedData = pako.ungzip(compressedData, { to: 'string' })
    var chatArray = JSON.parse(decompressedData)
  } else chatArray = []

  chatArray.push(['WelcomeBot', 0, 'Welcome to Web Online!SNLBSNLBIf you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!'])

  return chatArray
}

export function simpleExportWholeWEBmodel() {
  const store = useModelStore()
//  const personal = usePersonalStore()

  let temp = []

  // 0 - players
  temp.push(JSON.parse(JSON.stringify(store.players)))
  //temp.push(deepClone(store.players))

  // 1 - gameflow
  temp.push(JSON.parse(JSON.stringify(store.gameflow)))
  //temp.push(deepClone(store.gameflow))

  //2 coords
  temp.push(JSON.parse(JSON.stringify(store.coords)))

  // 3 mapTiles
  temp.push(JSON.parse(JSON.stringify(store.mapTiles)))

  // 4 SQUARE_PILE_1
  temp.push(JSON.parse(JSON.stringify(store.SQUARE_PILE_1)))

  // 5 SQUARE_PILE_2
  temp.push(JSON.parse(JSON.stringify(store.SQUARE_PILE_2)))

  // 6 RECT_PILE_1
  temp.push(JSON.parse(JSON.stringify(store.RECT_PILE_1)))

  // 7 RECT_PILE_2
  temp.push(JSON.parse(JSON.stringify(store.RECT_PILE_2)))

  // 8 CORNER_PILE_1
  temp.push(JSON.parse(JSON.stringify(store.CORNER_PILE_1)))

  // 9 CORNER_PILE_2
  temp.push(JSON.parse(JSON.stringify(store.CORNER_PILE_2)))

  // 10 cables
  temp.push(JSON.parse(JSON.stringify(store.cables)))

  // 11 grid dimensions
  temp.push(JSON.parse(JSON.stringify(store.gridDimensions)))

  // 12 - history
  temp.push(JSON.parse(JSON.stringify(store.history)))

  // 13 - context
  temp.push(JSON.parse(JSON.stringify(store.context)))

  let step1 = JSON.stringify(temp)

  //if (personal.name === "admin") console.log(JSON.stringify(temp, null, 2))

  // eslint-disable-next-line no-undef
  let step2 = pako.gzip(step1)
  let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

  return base64Data
}

export async function simpleImportWholeWEBmodel(input, importContext) {
  const store = useModelStore()

  if (input === '' || input == undefined) return

  /* input =
'NrDeCIEsBNwLgAwBpwDsCGBbApvcAlAewGdjwUBjQgG0IFcAneARhWKodzmYDoBWFOgoAXSIVQBZdAwDW2BmTgAmZOFE4AysPHZFq6pFS782TOkOGA5vCUDwAIzrFdLFNlTQAUnVQixqRWAVJGYAFgBdNw8AGUMXOGAAZmRmADZI8AAHanQAT3lvX1FxQOCwpABOJCUkAA5wgF8kCBhXNCwucE9CbFzycCpaRnhVdkJOG35BP3EpWXlFYLVITW0jPRQDdZMzC1RrZTtHZ0VWcHcvHxmA+GAMi9j124zsvIKr4puExsiQZGAALSsIFIEEghCRCFIYCsQHA+Gg1hQqFBaFgpFIZBAyG-RJohHozE46GhfGIzHk7FE6ECOGUhHI36pMmE8HE4AAdhZGKxzHZtW5FPR7KqdN5Qr51Jh-1ZBMlKOYsNl5MZ0OYNTp4Pp7OYeM1GOFUvKwGQ4sNkphtNN9MRkQtaTJ4t5Oq5+ptqphArdhI9zFFWoD8t+wRNEu1IWDsOtsrtwY1Pol7KUeuVbKlSlJ3oZSdpqfhSeZYpVtvTroTzvTXoThpRSn9DPDKOSgp97MSSobFab8blKrbKd7aabmbz1KbucHSJxkWEDDo2CQAkV0Lu0N+67Xm9X24tG+3e739oPW+PMNPp93J6v++v59v95vj7vT4fz-XkQgW2wAFEAB6ZdAAn8W5RynFAjAAdwAIScEZBGgaAAAV0FIdxLAWW4DUnDJ0AQmDIGoaArECUDqXAdBqGEeQABUVi4VQADcGEITBMLDGNKAAC0A9CtGkYREJyfImG4JokmQZtkl+FI1WkiNYyAA'
*/

  let compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
  // eslint-disable-next-line no-undef
  let decompressedData = pako.ungzip(compressedData, { to: 'string' })
  let inputModel = JSON.parse(decompressedData)

  // 0 players
  store.players.splice(0)
  Object.assign(store.players, inputModel[0])

  // 1 gameflow
  Object.assign(store.gameflow, inputModel[1])

  //2 coords
  store.coords.splice(0)
  Object.assign(store.coords, inputModel[2])

  // 3 mapTiles
  store.mapTiles.splice(0)
  Object.assign(store.mapTiles, inputModel[3])

  // 4 SQUARE_PILE_1
  store.SQUARE_PILE_1.splice(0)
  Object.assign(store.SQUARE_PILE_1, inputModel[4])

  // 5 SQUARE_PILE_2
  store.SQUARE_PILE_2.splice(0)
  Object.assign(store.SQUARE_PILE_2, inputModel[5])

  // 6 RECT_PILE_1
  store.RECT_PILE_1.splice(0)
  Object.assign(store.RECT_PILE_1, inputModel[6])

  // 7 RECT_PILE_2
  store.RECT_PILE_2.splice(0)
  Object.assign(store.RECT_PILE_2, inputModel[7])

  // 8 CORNER_PILE_1
  store.CORNER_PILE_1.splice(0)
  Object.assign(store.CORNER_PILE_1, inputModel[8])

  // 9 CORNER_PILE_2
  store.CORNER_PILE_2.splice(0)
  Object.assign(store.CORNER_PILE_2, inputModel[9])

  // 10 - cables
  store.cables.splice(0)
  Object.assign(store.cables, inputModel[10])
  // 11 - gridDimensions
  store.gridDimensions[0] = inputModel[11][0]
  store.gridDimensions[1] = inputModel[11][1]

  // 12 - history
  store.history.splice(0)
  Object.assign(store.history, inputModel[12])
  store.resetContext()

  // 13
  if (importContext) Object.assign(store.context, inputModel[13])

}

export function simpleExportWholeWEBmodelNoCompression() {
  const store = useModelStore()

  let temp = []

  // 0 - players
  temp.push(JSON.parse(JSON.stringify(store.players)))

  // 1 - gameflow
  temp.push(JSON.parse(JSON.stringify(store.gameflow)))

  //2 coords
  temp.push(JSON.parse(JSON.stringify(store.coords)))

  // 3 mapTiles
  temp.push(JSON.parse(JSON.stringify(store.mapTiles)))

  // 4 SQUARE_PILE_1
  temp.push(JSON.parse(JSON.stringify(store.SQUARE_PILE_1)))

  // 5 SQUARE_PILE_2
  temp.push(JSON.parse(JSON.stringify(store.SQUARE_PILE_2)))

  // 6 RECT_PILE_1
  temp.push(JSON.parse(JSON.stringify(store.RECT_PILE_1)))

  // 7 RECT_PILE_2
  temp.push(JSON.parse(JSON.stringify(store.RECT_PILE_2)))

  // 8 CORNER_PILE_1
  temp.push(JSON.parse(JSON.stringify(store.CORNER_PILE_1)))

  // 9 CORNER_PILE_2
  temp.push(JSON.parse(JSON.stringify(store.CORNER_PILE_2)))

  // 10 cables
  temp.push(JSON.parse(JSON.stringify(store.cables)))

  // 11 grid dimensions
  temp.push(JSON.parse(JSON.stringify(store.gridDimensions)))

  // 12 - history
  temp.push(JSON.parse(JSON.stringify(store.history)))

  // 13 - context
  temp.push(JSON.parse(JSON.stringify(store.context)))

  return temp
}

export function simpleImportWholeWEBmodelNoCompression(input, keepHistory = false) {
  const store = useModelStore()

  if (!input) return

  // 0 players
  store.players.splice(0)
  Object.assign(store.players, input[0])

  // 1 gameflow
  Object.assign(store.gameflow, input[1])

  //2 coords
  store.coords.splice(0)
  Object.assign(store.coords, input[2])

  // 3 mapTiles
  store.mapTiles.splice(0)
  Object.assign(store.mapTiles, input[3])

  // 4 SQUARE_PILE_1
  store.SQUARE_PILE_1.splice(0)
  Object.assign(store.SQUARE_PILE_1, input[4])

  // 5 SQUARE_PILE_2
  store.SQUARE_PILE_2.splice(0)
  Object.assign(store.SQUARE_PILE_2, input[5])

  // 6 RECT_PILE_1
  store.RECT_PILE_1.splice(0)
  Object.assign(store.RECT_PILE_1, input[6])

  // 7 RECT_PILE_2
  store.RECT_PILE_2.splice(0)
  Object.assign(store.RECT_PILE_2, input[7])

  // 8 CORNER_PILE_1
  store.CORNER_PILE_1.splice(0)
  Object.assign(store.CORNER_PILE_1, input[8])

  // 9 CORNER_PILE_2
  store.CORNER_PILE_2.splice(0)
  Object.assign(store.CORNER_PILE_2, input[9])

  // 10 cables
  store.cables.splice(0)
  Object.assign(store.cables, input[10])

  // 11 grid dimensions
  store.gridDimensions[0] = input[11][0]
  store.gridDimensions[1] = input[11][1]

  // 12 - history
  if (!keepHistory) {
    store.history.splice(0)
    Object.assign(store.history, input[12])
  }

  store.resetContext()
  Object.assign(store.context, input[13])

  map.initCoords()
}

export function exportWEBmodel(includeContext, forGameOver) {
  const store = useModelStore()
  //const personal = usePersonalStore()
  let temp = []

  // 0 - gameflow - THIS NEEDS TO BE FIRST TO CHECK FOR END GAME LOADING
  let tempGameflow = []
  tempGameflow.push(store.gameflow.turn) // 0
  if (!forGameOver) {
    tempGameflow.push(JSON.parse(JSON.stringify(store.gameflow.fullTurnOrder))) // 1
    tempGameflow.push(JSON.parse(JSON.stringify(store.gameflow.turnOrder))) // 2
    tempGameflow.push(store.gameflow.phase) // 3
  }
  temp.push(JSON.parse(JSON.stringify(tempGameflow)))

  // 1 - Players
  let tempPlayers = []
  for (let i = 0; i < store.players.length; i++) {
    let tempPlayer = []
    // 0 - name /  display name
    if (store.players[i].name === store.players[i].displayName) tempPlayer.push([store.players[i].name])
    else tempPlayer.push([store.players[i].name, store.players[i].displayName])
    // 1 - colour
    tempPlayer.push(store.players[i].colour)

    // 2 - storedCables
    tempPlayer.push(store.players[i].storedCables)

    // 3 - currentCables
    tempPlayer.push(store.players[i].currentCables)

    // 4 tileIDarrays
    let tileIDArraysCompressed = []
    for (let j = 0; j < store.players[i].tileIDarrays.length; j++) {
      if (forGameOver) tileIDArraysCompressed.push(store.players[i].tileIDarrays[j][0])
      else {
        if (store.players[i].tileIDarrays[j][1] === 0) tileIDArraysCompressed.push([store.players[i].tileIDarrays[j][0]])
        else tileIDArraysCompressed.push([store.players[i].tileIDarrays[j][0], store.players[i].tileIDarrays[j][1]])
      }
    }
    tempPlayer.push(tileIDArraysCompressed)
    tempPlayers.push(tempPlayer)
  }
  temp.push(JSON.parse(JSON.stringify(tempPlayers)))

  // 2 SQUARE_PILE_1
  temp.push(JSON.parse(JSON.stringify(store.SQUARE_PILE_1)))

  // 3 SQUARE_PILE_2
  temp.push(JSON.parse(JSON.stringify(store.SQUARE_PILE_2)))

  // 4 RECT_PILE_1
  temp.push(JSON.parse(JSON.stringify(store.RECT_PILE_1)))

  // 5 RECT_PILE_2
  temp.push(JSON.parse(JSON.stringify(store.RECT_PILE_2)))

  // 6 CORNER_PILE_1
  temp.push(JSON.parse(JSON.stringify(store.CORNER_PILE_1)))

  // 7 CORNER_PILE_2
  temp.push(JSON.parse(JSON.stringify(store.CORNER_PILE_2)))

  // 8 grid dimensions
  temp.push(JSON.parse(JSON.stringify(store.gridDimensions)))

  // 9 mapTiles
  let tempMapTiles = []
  for (let i = 0; i < store.mapTiles.length; i++) {
    let tempMapTile = []
    tempMapTile.push(store.mapTiles[i].tileID)
    tempMapTile.push(store.mapTiles[i].index)
    if (store.mapTiles[i].rotation !== 0) tempMapTile.push(store.mapTiles[i].rotation)

    tempMapTiles.push(tempMapTile)
  }
  temp.push(JSON.parse(JSON.stringify(tempMapTiles)))

  // 10 cables
  let tempCables = []
  for (let i = 0; i < store.cables.length; i++) {
    let tempCable = []
    tempCable.push(store.cables[i].playerIndex)
    tempCable.push(store.cables[i].indexes[0])
    tempCable.push(store.cables[i].indexes[1])
    tempCables.push(JSON.parse(JSON.stringify(tempCable)))
  }
  temp.push(JSON.parse(JSON.stringify(tempCables)))

  // 11 - history
  temp.push(JSON.parse(JSON.stringify(store.history)))

  // 12 - context
  if (includeContext) temp.push(JSON.parse(JSON.stringify(store.context)))
  let step1 = JSON.stringify(temp)

  //if (personal.name === "admin") console.log(JSON.stringify(temp, null, 2))

  // eslint-disable-next-line no-undef
  let step2 = pako.gzip(step1)
  let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

  return base64Data
  //return simpleExportWholeWEBmodel()
}

export function importWEBmodel(input, forGameOver, includeContext) {
  const store = useModelStore()
  if (input === '' || input == undefined) return

  let compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
  // eslint-disable-next-line no-undef
  let decompressedData = pako.ungzip(compressedData, { to: 'string' })
  let inputModel = JSON.parse(decompressedData)

  // 0 gameflow
  store.gameflow.turn = inputModel[0][0]
  store.gameflow.fullTurnOrder.splice(0)
  store.gameflow.turnOrder.splice(0)

  if (!forGameOver) {
    store.gameflow.fullTurnOrder.push(...inputModel[0][1])
    store.gameflow.turnOrder.push(...inputModel[0][2])
    store.gameflow.phase = inputModel[0][3]
    if (store.gameflow.phase === rf.PHASE_MID_ACTIONS) {
      includeContext = true
    }
  } else if (forGameOver) {
    // players haven't been loaded. So set up temps
    const indexes = Array.from({ length: inputModel[1].length }, (_, i) => i)
    store.gameflow.fullTurnOrder = [...indexes]
    store.gameflow.turnOrder = [...indexes]
    store.gameflow.phase = rf.PHASE_GAME_OVER
  }

  // 1 - players
  store.players.splice(0)
  for (let i = 0; i < inputModel[1].length; i++) {
    let name = ''
    let displayName = ''
    if (inputModel[1][i][0].length === 1) {
      name = inputModel[1][i][0][0]
      displayName = inputModel[1][i][0][0]
    } else if (inputModel[1][i][0].length === 2) {
      name = inputModel[1][i][0][0]
      displayName = inputModel[1][i][0][1]
    }
    let colour = inputModel[1][i][1]
    let storedCables = inputModel[1][i][2]
    let currentCables = inputModel[1][i][3]
    let tileIDarrays = []
    for (let j = 0; j < inputModel[1][i][4].length; j++) {
      let tempTileIDarray = []
      tempTileIDarray.push(inputModel[1][i][4][j][0])
      if (inputModel[1][i][4][j].length === 2) tempTileIDarray.push(inputModel[1][i][4][j][1])
      else tempTileIDarray.push(0)
      tileIDarrays.push(tempTileIDarray)
    }

    store.players.push({
      name: name,
      displayName: displayName,
      colour: colour,
      storedCables: storedCables,
      currentCables: currentCables,
      tileIDarrays: JSON.parse(JSON.stringify(tileIDarrays)),
    })
  }

  // 2 SQUARE_PILE_1
  store.SQUARE_PILE_1.splice(0)
  Object.assign(store.SQUARE_PILE_1, inputModel[2])

  // 3 SQUARE_PILE_2
  store.SQUARE_PILE_2.splice(0)
  Object.assign(store.SQUARE_PILE_2, inputModel[3])

  // 4 RECT_PILE_1
  store.RECT_PILE_1.splice(0)
  Object.assign(store.RECT_PILE_1, inputModel[4])

  // 5 RECT_PILE_2
  store.RECT_PILE_2.splice(0)
  Object.assign(store.RECT_PILE_2, inputModel[5])

  // 6 CORNER_PILE_1
  store.CORNER_PILE_1.splice(0)
  Object.assign(store.CORNER_PILE_1, inputModel[6])

  // 7 CORNER_PILE_2
  store.CORNER_PILE_2.splice(0)
  Object.assign(store.CORNER_PILE_2, inputModel[7])

  // 8 grid dimensions
  store.gridDimensions[0] = inputModel[8][0]
  store.gridDimensions[1] = inputModel[8][1]

  // 9 mapTiles
  store.mapTiles.splice(0)
  for (let i = 0; i < inputModel[9].length; i++) {
    let tempMapTile = {}
    tempMapTile.tileID = inputModel[9][i][0]
    tempMapTile.index = inputModel[9][i][1]
    if (inputModel[9][i].length === 3) tempMapTile.rotation = inputModel[9][i][2]
    else tempMapTile.rotation = 0

    let tileData = rf.ALL_TILES.find((tile) => tile.tileID === tempMapTile.tileID)
    tempMapTile.gfx = tileData.gfx
    tempMapTile.coord = map.getCoordFromIndex(tempMapTile.index)
    tempMapTile.style = tileData.style
    tempMapTile.rotatedModel3d = model.getRotatedModel3d(tempMapTile.tileID, tempMapTile.rotation)
    store.mapTiles.push(JSON.parse(JSON.stringify(tempMapTile)))
  }

  // 10 cables
  store.cables.splice(0)
  for (let i = 0; i < inputModel[10].length; i++) {
    let currentInput = inputModel[10][i]
    let tempCable = {}
    tempCable.playerIndex = currentInput[0]
    tempCable.indexes = [currentInput[1], currentInput[2]]
    tempCable.rotation = 0
    if (currentInput[2] === currentInput[1] + 1) tempCable.rotation = 1
    tempCable.coord = map.getCoordFromIndex(tempCable.indexes[0])
    store.cables.push(JSON.parse(JSON.stringify(tempCable)))
  }

  // 11 history
  store.history.splice(0)
  Object.assign(store.history, inputModel[11])

  store.resetContext()
  if (includeContext) {
    //} || inputModel.length === 11) {
    Object.assign(store.context, inputModel[12])
  }

  // This sets up the gameflwo turn orders as well
  //dif (store.gameflow.phase === rf.PHASE_GAME_OVER)  model.endGame_core()

  map.initCoords()

}
