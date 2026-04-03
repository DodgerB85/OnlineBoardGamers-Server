import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as rf from '../js/BUSreference.js'

//import { storeToRefs } from 'pinia'
//import { usePlayersStore } from './players.js'
//import { useModelStore } from './model.js'

import { useModelStore } from '../stores/BUSstore.js'

export const usePersonalStore = defineStore('personal', () => {
  const store = useModelStore()

  /******* SET ONCE VARS - IN SETUP */
  //var pov = 0
  //const superuser = ref(false)
  //const preferredColour = 1
  const selectedBoard = ref(rf.BOARD_20A_CAPSTONE)
  var WSstatus = "WSconnecting" // Use for light colour
  var votedToDelete = false

  function canPlay() {
    for (let i = 0; i < store.players.length; i++) {
      if (store.players[i].displayName === "BusBot") store.players[i].remainingActions = 0
    }
    if (store.topMenuViews.showReplay === true) return false
    if (store.topMenuViews.generatingReplay === true) return false
    
    if (this.pov < 0) return false
    if (store.gameflow.gameEnded > 0) return false
    if (store.topMenuViews.showLoader) return false
    if (this.superuser) return true
    if (this.trainingGame) return true
    if (this.pov === store.gameflow.turnOrder[0]) return true
    return false
  }
  function canEndTurn() {
    if (
      store.gameflow.phase === rf.PHASE_SETUP_BLDGS &&
      store.context.buildingsLeftToPlace === 0
    )
      return true
    if (
      store.gameflow.phase === rf.PHASE_SETUP_LINES &&
      store.context.linesLeftToPlace === 0
    )
      return true
    if (store.gameflow.phase === rf.PHASE_CHOOSE_ACTIONS && store.context.actionChosen)
      return true
    if (
      store.gameflow.phase === rf.PHASE_LINE_EXPANSION &&
      store.context.linesLeftToPlace === 0
    )
      return true
    if (
      store.gameflow.phase === rf.PHASE_ADD_PAX &&
      store.context.passengersLeftToPlace === 0
    )
      return true
    if (
      store.gameflow.phase === rf.PHASE_ADD_BLDGS &&
      store.context.buildingsLeftToPlace === 0
    )
      return true
    if (store.gameflow.phase === rf.PHASE_VROM && store.context.remainingVroms === 0)
      return true

    if (store.context.turnEndingErrorMessage !== '') return true
    return false
  }

  function getCorrectedColour(colour) {
    if (this.preferredColour > -1 && this.pov > -1) {
      if (store.players[this.pov].colour === colour) {
        return this.preferredColour
      } else if (this.preferredColour === colour) {
        return store.players[this.pov].colour
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
