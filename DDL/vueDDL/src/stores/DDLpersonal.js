/**
 * Personal / private state for the current viewer.
 */

import { defineStore } from "pinia"
import * as rf from "../js/DDLreference.js"
import { useModelStore } from "./DDLstore.js"

export const usePersonalStore = defineStore("personal", () => {
	const store = useModelStore()

	var WSstatus = "WSconnecting"
	var haltPlay = false
	var gameID = -1
	var gameCreationTimestamp = 0
	var finishedGame = false
	var trainingGame = false
	var liveWS = true
	var name = "NAME"
	var latestUpdate = 0
	var pov = -99
	var secondsToNextKickout = 99999
	var kickoutRequired = 0
	var notes = ""
	var yourTurnAudioType = 0
	var chatNotification = false
	var transactionID = ""
	var votedToExclude = false
	var votedToDelete = false
	var removeCurrentFlexTime = false
	var removeCurrentFlexTimeName = ""
	var auctionSubmitted = false
	var auctionBid = 0
	var myTradeOffers = []

	function canPlay() {
		if (this.haltPlay) return false
		if (store.viewSettings.showReplay) return false
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
		if (this.pov < 0) return false
		if (rf.SUPER_USERS.includes(this.name)) return true
		if (this.trainingGame) return true
		const current = store.gameflow.turnOrder[0]
		return this.pov === current
	}

	function canBid() {
		if (this.pov < 0 || this.finishedGame) return false
		if (store.gameflow.phase !== rf.PHASE_SETUP) return false
		if (!store.gameflow.setup.auction) return false
		return store.gameflow.setup.stage === rf.TURN_SETUP_AUCTION || (store.gameflow.setup.stage === rf.TURN_SETUP_TIEBREAK && store.gameflow.setup.tiebreakPlayers.includes(this.pov))
	}

	function canResign() {
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
		if (this.pov < 0) return false
		if (this.trainingGame) return false
		return this.canPlay()
	}

	function getCorrectedColourHex(colour) {
		return rf.COLOUR_HEX[colour] || "#333333"
	}

	return {
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
		kickoutRequired,
		notes,
		yourTurnAudioType,
		chatNotification,
		transactionID,
		votedToExclude,
		votedToDelete,
		removeCurrentFlexTime,
		removeCurrentFlexTimeName,
		auctionSubmitted,
		auctionBid,
		myTradeOffers,
		canPlay,
		canBid,
		canResign,
		getCorrectedColourHex,
	}
})
