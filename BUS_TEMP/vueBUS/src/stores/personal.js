import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as constants from '../constants'

//import { storeToRefs } from 'pinia'
//import { usePlayersStore } from './players.js'
//import { useModelStore } from './model.js'

import { useModelStore } from '../stores/model.js'

export const usePersonalStore = defineStore('personal', () => {
  const model = useModelStore()

  /******* SET ONCE VARS - IN SETUP */
  //var pov = 0
  //const superuser = ref(false)
  //const preferredColour = 1
  const selectedBoard = ref(0)
  var WSstatus = "WSconnecting" // Use for light colour
  var votedToDelete = false

  function canPlay() {
    for (let i = 0; i < model.players.length; i++) {
      if (model.players[i].displayName === "BusBot") model.players[i].remainingActions = 0
    }
    if (model.topMenuViews.showReplay === true) return false
    if (model.topMenuViews.generatingReplay === true) return false
    
    if (this.pov < 0) return false
    if (model.gameflow.gameEnded > 0) return false
    if (model.topMenuViews.showLoader) return false
    if (this.superuser) return true
    if (this.trainingGame) return true
    if (this.pov === model.gameflow.turnOrder[0]) return true
    return false
  }
  function canEndTurn() {
    if (
      model.gameflow.phase === constants.PHASE_SETUP_BLDGS &&
      model.context.buildingsLeftToPlace === 0
    )
      return true
    if (
      model.gameflow.phase === constants.PHASE_SETUP_LINES &&
      model.context.linesLeftToPlace === 0
    )
      return true
    if (model.gameflow.phase === constants.PHASE_CHOOSE_ACTIONS && model.context.actionChosen)
      return true
    if (
      model.gameflow.phase === constants.PHASE_LINE_EXPANSION &&
      model.context.linesLeftToPlace === 0
    )
      return true
    if (
      model.gameflow.phase === constants.PHASE_ADD_PAX &&
      model.context.passengersLeftToPlace === 0
    )
      return true
    if (
      model.gameflow.phase === constants.PHASE_ADD_BLDGS &&
      model.context.buildingsLeftToPlace === 0
    )
      return true
    if (model.gameflow.phase === constants.PHASE_VROM && model.context.remainingVroms === 0)
      return true

    if (model.context.turnEndingErrorMessage !== '') return true
    return false
  }

  function getCorrectedColour(colour) {
    if (this.preferredColour > -1 && this.pov > -1) {
      if (model.players[this.pov].colour === colour) {
        return this.preferredColour
      } else if (this.preferredColour === colour) {
        return model.players[this.pov].colour
      }
    }
    return colour
  }

  return {
    canPlay,
    getCorrectedColour,
    canEndTurn,
    WSstatus,
    selectedBoard,
    votedToDelete,
  }
})
