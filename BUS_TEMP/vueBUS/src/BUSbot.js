import { useModelStore } from './stores/model.js'

import { usePersonalStore } from './stores/personal.js'

import * as IO from './BUS_IO'
import * as constants from './constants'

export function actionAnyBotMooves() {
  const model = useModelStore()

  if (model.gameflow.gameEnded > 0) return
  // Still action any bot turns for history on time passing, or adding buses
  if (model.gameflow.phase === constants.PHASE_ADD_BUS || model.gameflow.phase === constants.PHASE_ALTER_TIME) return
  while (model.gameflow.turnOrder.length > 0 && model.players[model.gameflow.turnOrder[0]].displayName === 'BusBot') {
    model.gameflow.turnOrder.shift()
  }

  if (model.gameflow.turnOrder.length === 0) {
    //model.context.historyObj.push([9])
    model.endCurrentPhase()
  }
  model.startPlayerTurn()
}

/**================================================================================================ */

export function actionPlayerKickout() {
  const model = useModelStore()
  const personal = usePersonalStore()
  if (personal.kickoutRequired === 2) {
    personal.kickoutRequired = 0

    // Action the kick in game
    model.history.push([
      constants.HIST_KICKOUT,
      personal.pov,
      Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp),
      [model.gameflow.turnOrder[0]]
    ])
    model.resetVarsOnTurnEnd()

    model.players[model.gameflow.turnOrder[0]].displayName = 'BusBot'
    model.players[model.gameflow.turnOrder[0]].score = 0
    model.players[model.gameflow.turnOrder[0]].remainingActions = 0

    IO.saveGameDataAfterKickout()
  }
}

export function actionResign() {
  const model = useModelStore()
  const personal = usePersonalStore()
  // change display name
  model.players[personal.pov].displayName = 'BusBot'
  // set score to 0
  model.players[personal.pov].score = 0

  // Count non players and end game if only 1 left
  var nbNonPlayers = 0
  for (let i = 0; i < model.players.length; i++)
    if (model.players[i].displayName === 'BusBot') nbNonPlayers++

  if (nbNonPlayers >= model.players.length - 1) {
    // Only 1 player left, so end game
    model.gameflow.phase = constants.PHASE_GAME_OVER
    model.gameflow.gameEnded = 4
    model.endGame()
    IO.saveGame(false)
    return
  } else
    [
      IO.saveGame(true)
    ]
}
