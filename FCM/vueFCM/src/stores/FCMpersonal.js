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

import * as controller from "../js/FCMcontroller"

//import { ref } from 'vue'
import { defineStore } from "pinia"
import * as rf from "../js/FCMreference"
import * as funcs from "../js/FCMfuncs"

import { useModelStore } from "./FCMstore.js"

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
	var liveWS = false // Basically always set to true, IE open a live connection
	var name = "Guest" // your username
	var latestUpdate = "-1" // -1 = not yet received from server
	var pov = -99 // -99 not logged in, -9 not involved, -1 = admin user not at a seat, 0+ = involved player seat/array number
	var secondsToNextKickout = 99
	var kickoutCountdownIntervalTimer = null // Var to hold the interval timer
	var flexiKickoutCountdownIntervalTimer = null // Var to hold the flexi interval timer
	var kickoutRequired = 0
	var flexiSecondsToNextKickout = 9999
	var notes = ""
	var yourTurnAudioType = 0
	var preferredColour = -1
	var moveDataRaw = ""
	var currentRewindConsent = 0


	function canPlay() {
		const store = useModelStore()

		// Handle Obvious Conditions
		if (store.gameflow.turnOrder.length > 0) {
			let obj = controller.currentPlayerObj()
			if (obj && obj.displayName === "FcmAI") return false
		}
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
		if (store.viewSettings.showReplay) return false
		if (this.pov === -1) return false
		if (this.haltPlay === true) return false
		if (this.trainingGame) return true
		if (this.superuser) return true
		//if (store..tournamentGame && this.name === rf.TOURNAMENT_ADMIN_NAME) return true
		if (this.pov < 0) return false
		if (this.pov >= 0 && store.players[this.pov].displayName === rf.BOT_NAME) return false

		// Pre moves
		if (store.gameflow.phase === rf.PHASE_PAYDAY || store.gameflow.phase === rf.PHASE_CLEAN_UP) {
			if (this.moveDataRaw !== "") {
				let decodedMoveData = funcs.decompressData(this.moveDataRaw)[3]
				if (store.gameflow.phase === rf.PHASE_PAYDAY) {
					if (decodedMoveData[0][0].length > 0 && decodedMoveData[0][0][0] !== -9) return false
				}
				if (store.gameflow.phase === rf.PHASE_CLEAN_UP) {
					if (decodedMoveData[1].length > 0 && decodedMoveData[1][0] !== -9) return false
				}
			}
		}

		// Allow a move if you have chosen resto but not reserve
		if ((store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT1 || store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT2) && this.moveDataRaw === "" && store.players[this.pov].restaurants.length > 0 && !store.startingOptions.shortGame) return true

		// If simul and no move
		if (controller.isSimulPhase(store.gameflow.phase) && this.moveDataRaw !== "") {
			if (store.gameflow.phase === rf.PHASE_SETUP_RESERVE) return false
			else if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) {
				return false
			}
		}
		// Check if you're up in non simul
		if (!controller.isSimulPhase(store.gameflow.phase) && this.pov == controller.currentPlayerIndex()) return true
		if (controller.isSimulPhase(store.gameflow.phase) && store.gameflow.turnOrder.includes(controller.currentPlayerIndex())) return true
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

	function getCorrectedColourHexForRestoBorder(colour) {
		if (this.preferredColour > -1 && this.pov > -1) {
			if (store.players[this.pov].colour === colour) {
				colour = this.preferredColour
			} else if (this.preferredColour === colour) {
				colour = store.players[this.pov].colour
			}
		}

		if (colour === 0) return "#c592a9"
		if (colour === 1) return "#af272d"
		if (colour === 2) return "#91c3c4"
		if (colour === 3) return "#f89383"
		if (colour === 4) return "#86ad50"
		if (colour === 5) return "#a5d3a6"
	}

	return {
		canPlay,
		getCorrectedColour,
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
		kickoutCountdownIntervalTimer,
		flexiKickoutCountdownIntervalTimer,
		kickoutRequired,
		flexiSecondsToNextKickout,
		notes,
		yourTurnAudioType,
		preferredColour,
		moveDataRaw,
		currentRewindConsent,
		getCorrectedColourHexForRestoBorder,
	}
})
