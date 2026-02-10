
import * as rf from './CNSreference'
import * as funcs from './CNSfuncs'
import * as map from './CNSmap'
import * as model from './CNSmodel'
import * as history from './CNShistory'
import * as controller from './CNScontroller'
import * as seed from './CNSseed'
import hexlib from './hexlib.js'

import { useModelStore } from '../stores/CNSstore.js'
import { usePersonalStore } from '../stores/CNSpersonal.js'

export function goToReplayStep(step) {
  const store = useModelStore()

  store.replayStep = step
  funcs.importModel(store.replayData[store.replayStep])
  map.calculateCanvasSize()

  history.setupHistoryHighlight(store.history[store.replayStep][0], store.history[store.replayStep][3])
}

export function performStep(amount) {
  const store = useModelStore()
  const personal = usePersonalStore()

  store.clearHistoryHelpers()
  if (amount === -99) store.replayStep = 0
  if (amount === -9) store.replayStep -= 5
  if (amount === -1) store.replayStep--
  if (amount === 1) store.replayStep++
  if (amount === 9) store.replayStep += 5
  if (amount === 99) store.replayStep = store.replayData.length - 1

  	// Performing back to my last
	if (amount === -999) {
		let idx = store.replayStep
		idx--
		while (idx > 0) {
			let histEntry = store.history[idx]
			if (histEntry[1] === personal.pov) {
				store.replayStep = idx
				break
			}
			idx--
		}
	}

  if (store.replayStep < 0) store.replayStep = 0
  if (store.replayStep > store.replayData.length - 1) store.replayStep = store.replayData.length - 1

  funcs.importModel(store.replayData[store.replayStep])

  history.setupHistoryHighlight(store.history[store.replayStep][0], store.history[store.replayStep][3])
  if (store.topMenuViews.showingPlayerIndex !== -1) store.topMenuViews.showingPlayerIndex = controller.currentPlayerIndex()
}


async function resetDataForReplay() {
  const store = useModelStore()

  // Reset players
  for (let i = 0; i < store.players.length; i++) {
    store.players[i].storedResources.splice(0)
    store.players[i].links.splice(0)
    store.players[i].score = 0
    store.players[i].seenDiscardHexRefs.splice(0)
  }

  // Reset hexes
  store.hexDrawPile.splice(0)
  store.hexDiscardPile.splice(0)

  store.hexes.splice(0)
  if (store.players.length === 4) {
    store.hexDrawPile = [...rf.INITIAL_DRAW_PILE_4P]
    store.hexes = [...seed.initialGridState4p]
  }
  else {
    store.hexDrawPile = [...rf.INITIAL_DRAW_PILE_2P3P]
    store.hexes = [...seed.initialGridState2p3p]
  }
  // Recreate Shuffle
  const oldShuffle = funcs.shuffleSeeded(store.hexDrawPile, store.history[0][3][0]);
  store.hexDrawPile = oldShuffle.shuffled
  store.topMenuViews.replaySeedIndex = 1

  store.oldBoysNetwork.splice(0)

  store.moviePrices = [13, 13, 13]
  store.pirateShipRef = -1

  // Reset gameflow
  store.gameflow.turn = 1
  store.gameflow.phase = 0
  store.gameflow.turnOrder.splice(0)
  store.gameflow.fullTurnOrder.splice(0)

  for (let i = 0; i < store.players.length; i++) {
    store.gameflow.fullTurnOrder.push(i)
    store.gameflow.turnOrder.push(i)
  }

  store.ongoingVars.drawnHexes.splice(0)

  // keep history
  store.resetContext()
  model.drawHexes(3)
}

export async function generateReplayData(spoilerFree = false) {
  const store = useModelStore()
  store.topMenuViews.generatingReplay = true

  let replayData = []

  // Reset the data
  await resetDataForReplay()
  let pBarEl = document.querySelector('.progress-bar div');
  const pBarTextEl = document.querySelector('.progress-bar span');

  for (let i = 0; i < store.history.length; i++) {

    if (i !== 0) checkAndPerformTurnEnd(i)


    if (store.history[i][0] === rf.HIST_ADD_HEX) replayAddHex(i, store.history[i][1], store.history[i][3])
    else if (store.history[i][0] === rf.HIST_STORE_HEX) replayStoreHex(i, store.history[i][1], store.history[i][3])
    else if (store.history[i][0] === rf.HIST_ADD_LINK) replayAddLink(i, store.history[i][1], store.history[i][3])
    else if (store.history[i][0] === rf.HIST_PRODUCE_RES) replayProduceRes(i, store.history[i][1], store.history[i][3])
    else if (store.history[i][0] === rf.HIST_CONVERT_RES) replayConvertRes(i, store.history[i][1], store.history[i][3])
    else if (store.history[i][0] === rf.HIST_INCREASE_PRICE) replayIncreasePrice(i, store.history[i][1], store.history[i][3])
    else if (store.history[i][0] === rf.HIST_SELL_MOVIES) replaySellMovies(i, store.history[i][1], store.history[i][3])
    else if (store.history[i][0] === rf.HIST_PIRATE_MOVIE) replayPirateMovie(i, store.history[i][1], store.history[i][3])
    else if (store.history[i][0] === rf.HIST_MOVE_PIRATE) replayMovePirate(i, store.history[i][1], store.history[i][3])
    else if (store.history[i][0] === rf.HIST_ADD_CIGAR) replayAddCigar(i, store.history[i][1], store.history[i][3])
    else if (store.history[i][0] === rf.HIST_STORE_RES) replayStoreRes(i, store.history[i][1], store.history[i][3])

    else if (store.history[i][0] === rf.HIST_NEW_TURN) replayNewTurn(i, store.history[i][1], store.history[i][3])

    else if (store.history[i][0] === rf.HIST_GAME_END) replayGameEnd(i, store.history[i][1], store.history[i][3])/** */

    replayData.push(funcs.exportModel(true))

    if (i % 3 === 0 && pBarEl != null) {
      let percent = (i / store.history.length) * 100;
      pBarEl.style.width = percent + '%';
      pBarTextEl.innerText = Math.round(percent) + '%';
      await funcs.sleep(0);
    }
  }

  store.replayData = replayData
  store.replayStep = replayData.length - 1
  if (spoilerFree) {
    if (window.initData.replayStep <= 0) store.replayStep = 0
    else if (window.initData.replayStep >= store.replayData.length - 1) store.replayStep = store.replayData.length - 1
    else store.replayStep = window.initData.replayStep
  }
  if (store.replayData.length > 0) store.topMenuViews.showReplay = true
  goToReplayStep(store.replayStep)
  store.topMenuViews.generatingReplay = false
}

function replayGameEnd() {
  model.endGame_core()
}

function replayConvertRes(historyIndex, playerIndex, entry3) {
  model.actionProd_core(entry3[0])
}

function replaySellMovies(historyIndex, playerIndex, entry3) {
  let sellingSummary = entry3[0]
  model.sellMovies_core(playerIndex, sellingSummary)
}

function replayIncreasePrice(historyIndex, playerIndex, entry3) {
  model.increaseFilmPrice_core(entry3[0])
}

function replayStoreHex(historyIndex, playerIndex, entry3) {
  const store = useModelStore()

  model.storeHex_core(store.players[playerIndex], entry3[0])
}

function replayProduceRes(historyIndex, playerIndex, entry3) {
  const store = useModelStore()
  store.gameflow.phase = rf.PHASE_PRODUCTION
  model.setupProductionPhase_core(store.players[playerIndex])
}

function replayPirateMovie(historyIndex, playerIndex, entry3) {
  const store = useModelStore()
  if (entry3[0] === 0 || entry3[0] === 1) {
    store.players[playerIndex].score += (entry3.length - 2) * 4
    store.pirateShipRef = entry3[entry3.length - 1]
  }
  else if (entry3[0] === 10 || entry3[0] === 11) {
    store.players[playerIndex].score += (entry3.length - 1) * 4
  }
}

function replayMovePirate(historyIndex, playerIndex, entry3) {
  const store = useModelStore()
  store.pirateShipRef = entry3[0]
}

function replayAddHex(historyIndex, playerIndex, entry3) {
  const store = useModelStore()
  for (let i = 0; i < entry3.length; i++) {
    model.addHexToMap_core(store.players[playerIndex], new hexlib.Hex(entry3[i][2][0], entry3[i][2][1], map.calculateScoord(entry3[i][2][0], entry3[i][2][1])), entry3[i][0], entry3[i][1])
  }
}

function replayAddLink(historyIndex, playerIndex, entry3) {
  const store = useModelStore()


  for (let i = 0; i < entry3.length; i++) {
    // Just Adding a link
    if (entry3[i].length === 2) {
      let hexObj0 = map.reconstructHexDataFromQR(entry3[i][0][0], entry3[i][0][1], true)
      let hexObj1 = map.reconstructHexDataFromQR(entry3[i][1][0], entry3[i][1][1], true)

      model.addLink_core(store.players[playerIndex], [hexObj0, hexObj1])
    }
    else if (entry3[i].length === 4) {
      // hex, id, rotation, hexRef
      let hexObj0remove = map.reconstructHexDataFromQR(entry3[i][0][0], entry3[i][0][1], true)
      let hexObj1remove = map.reconstructHexDataFromQR(entry3[i][1][0], entry3[i][1][1], true)
      model.removeLink_core(store.players[playerIndex], [hexObj0remove, hexObj1remove])

      let hexObj0 = map.reconstructHexDataFromQR(entry3[i][2][0], entry3[i][2][1], true)
      let hexObj1 = map.reconstructHexDataFromQR(entry3[i][3][0], entry3[i][3][1], true)

      model.addLink_core(store.players[playerIndex], [hexObj0, hexObj1])
    }
  }
}

function replayAddCigar(historyIndex, playerIndex, entry3) {
  const store = useModelStore()

  let hexObj0 = map.reconstructHexDataFromQR(entry3[0][0], entry3[0][1], true)
  let hexObj1 = map.reconstructHexDataFromQR(entry3[1][0], entry3[1][1], true)

  model.addCigar_core([hexObj0, hexObj1], store.players[playerIndex])


}


function replayStoreRes(historyIndex, playerIndex, entry3) {
  const store = useModelStore()
  store.players[playerIndex].storedResources = [...entry3]
  store.gameflow.phase = rf.PHASE_PLACE_HEXES
}


function replayNewTurn(historyIndex, playerIndex, entry3) {
  model.endTurn_core()
}

function checkAndPerformTurnEnd(historyIndex) {
  // NOTE: THis IS THE HISTORY INDEX THAT ALREADY HAPPEND
  // SO NEED TO REDUCE TO THE PREVIOUS MENINGFUL ENTRY
  const store = useModelStore()

  /*const NOTHING = 0
  const PUSH_SHIFT = 1
  const SHIFT = 2*/

  let currentAction = store.history[historyIndex][0]

  let entriesToIgnore = [rf.HIST_REWIND, rf.HIST_RESIGN, rf.HIST_KICKOUT]
  if (entriesToIgnore.includes(currentAction)) return// NOTHING

  let currentPlayerIndex = store.history[historyIndex][1]

  historyIndex--
  while (entriesToIgnore.includes(store.history[historyIndex][0]) && historyIndex > 0) historyIndex--
  // Don't end the first turn before it has begun

  //let previousPlayerIndex = store.history[historyIndex][1]
  let previousAction = store.history[historyIndex][0]

  if (historyIndex === 0 && entriesToIgnore.includes(previousAction)) return //NOTHING

  // Add player to turn order if making a pirate move
  if (previousAction === rf.HIST_PIRATE_MOVIE && currentAction === rf.HIST_MOVE_PIRATE) {
    store.gameflow.turnOrder.unshift(currentPlayerIndex)
  }

  if (previousAction === rf.HIST_NEW_TURN) return// NOTHING
  if (store.gameflow.turnOrder[0] !== currentPlayerIndex) {
    store.gameflow.turnOrder.shift()
    store.resetContext(true)
    store.gameflow.phase = rf.PHASE_PLACE_HEXES
    model.discardHexes()
    model.drawHexes(3)
  }
  //return NOTHING
}