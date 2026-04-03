/**
 * I use this to store certain personal things.
 * For example, like the players ID, their point-of-view at the table,
 * what sounds they want on their turn, if they're a super user, etc etc.
 *
 * It also has some functions, like canPlay, which at the same time would
 * be true for some players and false for others.
 * Hence it is a personal function, so goes in here.
 *
 * NOTE: Colour correction stuff is from TGZ; but the same idea would be used in CNS
 */

//import { ref } from 'vue'
import { defineStore } from "pinia"
import * as rf from "../js/WEBreference"
import * as IO from "../backend/WEB_IO"

import { useModelStore } from "./WEBstore.js"

export const usePersonalStore = defineStore("personal", () => {
	const store = useModelStore()

	/******* SET ONCE VARS - IN SETUP */
	//var pov = 0
	//const superuser = ref(false)
	//let preferredColour;
	//var pov = 0
	//var preferredColour = 0
	var WSstatus = "WSconnecting" // Use for light colour
	var haltPlay = false // Stop someone moving, eg when waiting for game to save
	var gameID = -1
	var gameCreationTimestamp = 0
	var finishedGame = false // Tells the game how to load the compressed data
	var trainingGame = false // Same as Practice game, IE single player mode (NOT solo)
	var liveWS = false // Basically always set to true, IE open a live connection
	var name = "NAME" // your username
	var latestUpdate = 0
	var pov = -99 // -99 not logged in, -9 not involved, -1 = admin user not at a seat, 0+ = involved player seat/array number
	var secondsToNextKickout = 9999
	var myStatsExcludeConsent = 0
	var statsExcludedGame = false
	var kickoutCountdownIntervalTimer // Var to hold the interval timer
	var kickoutRequired = 0
	var flexiSecondsToNextKickout = 9999
	var kickoutFlexiCountdownIntervalTimer // Var to hold the interval timer
	var notes = ""
	var yourTurnAudioType = 0
	var preferredColour = -1
  var votedToDelete = false
  var votedToExclude = false

	function canPlay() {
		if (this.haltPlay) return false
		if (store.viewSettings.showReplay) return false
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false

		if (this.pov < 0) return false
		if (IO.SUPER_USERS.includes(this.name)) return true
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
				colour = this.preferredColour
			} else if (this.preferredColour === colour) {
				colour = store.players[this.pov].colour
			}
		}

		if (colour === 0) return "#000000" // black
		if (colour === 1) return "#3474a9" // blue
		if (colour === 2) return "#F5F5F5" // white
		if (colour === 3) return "#c28727" // yellow

		alert("P..GCCH: " + colour)
		return "none"
	}

  function getCorrectedColourText(colour) {
    if (this.preferredColour > -1 && this.pov > -1) {
      if (store.players[this.pov].colour === colour) {
        colour = this.preferredColour
      } else if (this.preferredColour === colour) {
        colour = store.players[this.pov].colour
      }
    }
    if (colour === 0) return "white"
    return "black"
  }

	return {
		canPlay,
		getCorrectedColour,
		getCorrectedColourHex,
		//canEndTurn,
		WSstatus,
		haltPlay,
		gameID,
		gameCreationTimestamp,
		finishedGame,
		trainingGame,
		liveWS,
		name,
		latestUpdate,
		pov,
		secondsToNextKickout,
		myStatsExcludeConsent,
		statsExcludedGame,
		kickoutCountdownIntervalTimer,
		kickoutRequired,
		flexiSecondsToNextKickout,
		kickoutFlexiCountdownIntervalTimer,
		notes,
		yourTurnAudioType,
		preferredColour,
    getCorrectedColourText,
    votedToDelete,
    votedToExclude
	}
})
