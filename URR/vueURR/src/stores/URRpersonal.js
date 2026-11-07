/**
 * Personal / private state for the current viewer.
 */

import { defineStore } from "pinia"
import * as rf from "../js/URRreference.js"
import { useModelStore } from "./URRstore.js"

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
	var kickoutFlexiData = []
	var kickoutSecondsRemaining = 99999
	var kickoutTimerUpdatedAt = 0
	var notes = ""
	var yourTurnAudioType = 0
	var preferredColour = -1
	var chatNotification = false
	var gameDataB64 = ""
	var votedToExclude = false
	var votedToDelete = false

	function canPlay() {
		if (this.haltPlay || store.turnDraft.ready) return false
		if (store.viewSettings.showReplay) return false
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
		if (this.pov < 0 || store.players[this.pov]?.isMissing) return false
		if (rf.SUPER_USERS.includes(this.name)) return true
		if (this.trainingGame) return true
		return this.pov === store.gameflow.turnOrder[0]
	}

	function canResign() {
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
		if (this.pov < 0 || store.players[this.pov]?.isMissing) return false
		if (this.trainingGame) return false
		if (this.soloGame) return false
		// Settlement only, so nobody can resign once a final rainy season is under way.
		if (store.gameflow.phase !== rf.PHASE_SETTLEMENT) return false
		if (this.canPlay() && store.gameflow.turnOrder[0] === this.pov) return true
		return false
	}

	function getCorrectedColour(colour) {
		if (this.preferredColour > -1 && this.pov > -1) {
			const myColour = store.players[this.pov]?.colour
			if (myColour === colour) return this.preferredColour
			if (this.preferredColour === colour) return myColour
		}
		return colour
	}

	function getCorrectedColourHex(colour) {
		return rf.PLAYER_COLOUR_HEXES[this.getCorrectedColour(colour)] || "none"
	}

	function getCorrectedTextColourHex(colour) {
		return rf.PLAYER_COLOUR_TEXT_HEXES[this.getCorrectedColour(colour)] || "#ffffff"
	}

	/** Returns the name to show in history: uses player.name if displayName is BOT_NAME (kicked out), else displayName */
	function getHistoryName(playerIndex) {
		const player = store.players[playerIndex]
		if (!player) return "Unknown"
		return player.displayName === rf.BOT_NAME ? player.name : player.displayName
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
		kickoutFlexiData,
		kickoutSecondsRemaining,
		kickoutTimerUpdatedAt,
		notes,
		yourTurnAudioType,
		preferredColour,
		chatNotification,
		gameDataB64,
		votedToExclude,
		votedToDelete,
		canPlay,
		canResign,
		getCorrectedColour,
		getCorrectedColourHex,
		getCorrectedTextColourHex,
		getHistoryName,
	}
})
