import { defineStore } from 'pinia'
import * as rf from '../js/TGZreference'

import { useModelStore } from './TGZstore.js'

export const usePersonalStore = defineStore('personal', () => {
  const store = useModelStore()

  /******* SET ONCE VARS - IN SETUP */
  //var pov = 0
  //const superuser = ref(false)
  //let preferredColour;
  var WSstatus = "WSconnecting" // Use for light colour

  function canPlay() {
    if (this.haltPlay) return false
    if (store.topMenuViews.showReplay) return false
    if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
    
    if (this.pov < 0) return false
    if (rf.SUPER_USERS.includes(this.name)) return true
    if (this.trainingGame) return true
    if (this.pov === store.gameflow.turnOrder[0]) return true
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

  function getCorrectedColourHex(colour) {
    if (this.preferredColour > -1 && this.pov > -1) {
      if (store.players[this.pov].colour === colour) {
        colour =  this.preferredColour
      } else if (this.preferredColour === colour) {
        colour = store.players[this.pov].colour
      }
    }

    if (colour === 0) return "rgb(5,3,14)";// black
   // if (colour === 1) return "rgb(30,95,40)";// green
    if (colour === 1) return "rgb(31,127,66)";// green
    if (colour === 2) return "rgb(187,12,25)";// red
    if (colour === 3) return "rgb(211,209,201)";// white
    if (colour === 4) return "rgb(222,193,31)";// yellow




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
    WSstatus,
  }
})
