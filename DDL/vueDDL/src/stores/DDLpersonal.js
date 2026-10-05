/**
 * Personal / private state for the current viewer.
 */

import { defineStore } from "pinia"
import * as rf from "../js/DDLreference"
import { useModelStore } from "./DDLstore.js"

export const usePersonalStore = defineStore("personal", () => {
	const store = useModelStore()

	var WSstatus = "WSconnecting"
	var haltPlay = false
	var gameID = -1
	var gameCreationTimestamp = 0
	var finishedGame = false
	var trainingGame = false
	var soloGame = false
	var liveWS = true
	var name = "NAME"
	var latestUpdate = 0
	var pov = -99 // -99 not logged in, -9 not involved, -1 admin, 0+ seat
	var secondsToNextKickout = 99999
	var statsExcludedGame = false
	var kickoutRequired = 0
	var notes = ""
	var yourTurnAudioType = 0
	var chatNotification = false
	var currentMoveData = {}
	var allMyMoveData = []
	var gameDataB64 = ""
	var transactionID = ""
	var votedToExclude = false
	var votedToDelete = false

	function canPlay() {
		if (this.haltPlay) return false
		if (store.viewSettings.showReplay) return false
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
		if (this.pov < 0) return false
		if (rf.SUPER_USERS.includes(this.name)) return true
		if (this.trainingGame) return true
		return this.pov === store.gameflow.turnOrder[0]
	}

	function canResign() {
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
		if (this.pov < 0) return false
		if (this.trainingGame) return false
		if (this.soloGame) return false
		if (this.canPlay() && store.gameflow.turnOrder[0] === this.pov) return true
		return false
	}

	function getCorrectedColour(colour) {
		return colour
	}

	function getCorrectedColourHex(colour) {
		if (colour === rf.BLACK) return "#333333"
		if (colour === rf.BLUE) return "#334CCC"
		if (colour === rf.GREEN) return "#4C9726"
		if (colour === rf.GREY) return "#7F7F7F"
		if (colour === rf.RED) return "#CC3333"
		if (colour === rf.YELLOW) return "#CCBF33"
		return "none"
	}

	return {
		WSstatus,
		haltPlay,
		gameID,
		gameCreationTimestamp,
		finishedGame,
		trainingGame,
		soloGame,
		liveWS,
		name,
		latestUpdate,
		pov,
		secondsToNextKickout,
		statsExcludedGame,
		kickoutRequired,
		notes,
		yourTurnAudioType,
		chatNotification,
		currentMoveData,
		allMyMoveData,
		gameDataB64,
		transactionID,
		votedToExclude,
		votedToDelete,
		canPlay,
		canResign,
		getCorrectedColour,
		getCorrectedColourHex,
	}
})
