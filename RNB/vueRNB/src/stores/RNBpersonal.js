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

import * as controller from "../js/RNBcontroller"

//import { ref } from 'vue'
import { defineStore } from "pinia"
import * as rf from "../js/RNBreference"

import { useModelStore } from "./RNBstore.js"

export const usePersonalStore = defineStore("personal", () => {
	const store = useModelStore()

	/******* SET ONCE VARS - IN SETUP */
	//const superuser = ref(false)
	var WSstatus = "WSconnecting" // Use for light colour
	var haltPlay = false // Stop someone moving, eg when waiting for game to save
	var gameID = -1
	var gameCreationTimestamp = 0
	var finishedGame = false // Tells the game how to load the compressed data
	var trainingGame = false // Same as Practice game, IE single player mode (NOT solo)
	var soloGame = false
	var liveWS = false // Basically always set to true, IE open a live connection
	var name = "NAME" // your username
	var latestUpdate = 0
	var pov = -99 // -99 not logged in, -9 not involved, -1 = admin user not at a seat, 0+ = involved player seat/array number
	var secondsToNextKickout = 99999
	var myStatsExcludeConsent = 0
	var statsExcludedGame = false
	var kickoutCountdownIntervalTimer // Var to hold the interval timer
	var kickoutRequired = 0
	var flexiSecondsToNextKickout = 99999
	var kickoutFlexiCountdownIntervalTimer // Var to hold the interval timer
	var notes = ""
	var yourTurnAudioType = 0
	var preferredColour = -1
	var preferredPlayerAid = rf.PLAYER_AID_OG
	var showMapOnly = false
	var currentMoveData = {}
	var allMyMoveData = []
	var gameDataB64 = ""
	var transactionID = ""
	// votes
	var votedToExclude = false
	var votedToDelete = false
	var mapDescription = ""
	var mapName = ""
	var mapEditor = false
	var playerCount = 2
	var showPlayerCountWarning = false

	function canResign() {
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
		if (this.pov < 0) return false
		if (this.trainingGame) return false
		if (this.soloGame) return false
		if (store.gameflow.phase !== rf.PHASE_PRODUCTION_TO) return false
		if (this.canPlay() && store.gameflow.turnOrder[0] === this.pov) return true
		return false
	}

	function canPlay() {
		if (this.haltPlay) return false
		if (store.viewSettings.showReplay) return false
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false

		if (this.pov < 0) return false
		if (store.stackControl.previewingPhase) return false
		if (rf.SUPER_USERS.includes(this.name)) return true
		if (this.trainingGame) return true
		if (this.pov === store.gameflow.turnOrder[0]) return true
		// If you are playing a pre-phase, you can play
		if (rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)) return true
		// If you loaded a pre move, you need to unlock before moving again
		if (store.stackControl.loadedPreMove === true) return false
		if (controller.isSimulPhase() && store.gameflow.turnOrder.includes(this.pov)) return true
		if (controller.isMainPhaseAndPseudoSimul() && store.gameflow.turnOrder.includes(this.pov)) return true
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

		/*
    export const BLACK = 0
export const BLUE = 1
export const GREEN = 2
export const GREY = 3
export const RED = 4
export const YELLOW = 5
*/

		if (colour === 0) return "#333333" // black
		if (colour === 1) return "#334CCC" // blue
		if (colour === 2) return "#4C9726" // green
		if (colour === 3) return "#7F7F7F" // grey
		if (colour === 4) return "#CC3333" // red
		if (colour === 5) return "#CCBF33" // yellow

		/*if (colour === 0) return "black";
    if (colour === 1) return "green";
    if (colour === 2) return "red";
    if (colour === 3) return "white";
    if (colour === 4) return "yellow";*/
		rf.doAdminAlrt("P..GCCH: " + colour)
		return "none"
	}

	return {
		canResign,
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
		preferredPlayerAid,
		showMapOnly,
		currentMoveData,
		allMyMoveData,
		gameDataB64,
		transactionID,
		soloGame,
		votedToExclude,
		votedToDelete,
		mapName,
		mapDescription,
		mapEditor,
		playerCount,
		showPlayerCountWarning,

	}
})
