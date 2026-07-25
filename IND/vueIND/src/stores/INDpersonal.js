/**
 * I use this to store certain personal things. 
 * For example, like the players ID, their point-of-view at the table,
 * what sounds they want on their turn, if they're a super user, etc etc. 
 * 
 * It also has some functions, like canPlay, which at the same time would
 * be true for some players and false for others. 
 * Hence it is a personal function, so goes in here. 
 * 
 * NOTE: Colour correction stuff is from TGZ; but the same idea would be used in IND
 */


//import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as rf from '../js/INDreference.js'
import * as IO from '../backend/IND_IO.js'

import { useModelStore } from './INDstore.js'

export const usePersonalStore = defineStore('personal', () => {
  const store = useModelStore()

  /******* SET ONCE VARS - IN SETUP */
  //const superuser = ref(false)
  //let preferredColour;
  //var preferredColour = 0
  var WSstatus = "WSconnecting" // Use for light colour
  var latestUpdate = -1
  var pov = -99
  var notes = ""

  var votedToDelete = false
  var votedToExclude = false

  function canPlay() {
    if (this.haltPlay) return false
    if (store.topMenuViews.showReplay) return false
    if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
    
    if (this.pov < 0) return false
    if (IO.SUPER_USERS.includes(this.name)) return true
    if (this.trainingGame) return true

    if (store.gameflow.phase === rf.PHASE_MERGER_BIDDING) {
      if (store.ongoingVars.bidTurnOrder.length > 0 && store.ongoingVars.bidTurnOrder[0] === this.pov) return true
      return false
    }
    
    if (this.pov === store.gameflow.turnOrder[0]) return true
    return false
  }

  function getCorrectedColour(colour) {
    if (this.preferredColour > -1 && this.pov >= 0) {
      if (store.players[this.pov].colour === colour) {
        return this.preferredColour
      } else if (this.preferredColour === colour) {
        return store.players[this.pov].colour
      }
    }
    return colour
  }

  function getCorrectedColourHex(colour) {
    if (this.preferredColour > -1 && this.pov >= 0) {
      if (store.players[this.pov].colour === colour) {
        colour =  this.preferredColour
      } else if (this.preferredColour === colour) {
        colour = store.players[this.pov].colour
      }
    }

    if (colour === 0) return "#84C3E2";// blue // 3474a9
    if (colour === 1) return "#3E7139";// green // red // a12529
    if (colour === 2) return "#D65A1E";// orange // f67112
    if (colour === 3) return "#92385C";// purple
    if (colour === 4) return "#ECC81C";// yellow // ece334

    /*if (colour === 0) return "black";
    if (colour === 1) return "green";
    if (colour === 2) return "red";
    if (colour === 3) return "white";
    if (colour === 4) return "yellow";*/
    alert("P..GCCH: " + colour)
    return "none"
  }



  return {
    canPlay,
    getCorrectedColour,
    getCorrectedColourHex,
    //canEndTurn,
    WSstatus,
    latestUpdate,
    votedToDelete,
    votedToExclude,
    pov,
    notes
  }
})
