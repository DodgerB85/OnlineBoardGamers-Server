/**
 * I use this to store certain personal things.
 * For example, like the players ID, their point-of-view at the table,
 * what sounds they want on their turn, if they're a super user, etc etc.
 *
 * It also has some functions, like canPlay, which at the same time would
 * be true for some players and false for others.
 * Hence it is a personal function, so goes in here.
 *
 * NOTE: Colour correction stuff is from TGZ; but the same idea would be used in KFW
 */

//import { ref } from 'vue'
import { defineStore } from "pinia"
import * as rf from "../js/KFWreference.js"
import * as IO from "../backend/KFW_IO.js"
import * as controller from "../js/KFWcontroller.js"

import { useModelStore } from "./KFWstore.js"

export const usePersonalStore = defineStore("personal", () => {
	const store = useModelStore()

	/******* SET ONCE VARS - IN SETUP */
	//var pov = 0
	//const superuser = ref(false)
	//let preferredColour;
	//var pov = 0
	//var preferredColour = 0
	var WSstatus = "WSconnecting" // Use for light colour
	var trainingGame = false
	var adminDataInspection = false
	var haltPlay = false
	var pov = -99
	var name = ""
	var latestUpdate = -1
	var removeCurrentFlexTime = false
	var removeCurrentFlexTimeName = ""
	var preferredColour = -1
	var finishedGame = false
	function canPlay() {
		if (this.haltPlay) return false
		if (store.viewSettings.showReplay) return false
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
		if (this.adminDataInspection) return false

		if (this.pov < 0) return false
		if (store.players[this.pov].displayName == rf.BOT_NAME) return false

		if (IO.SUPER_USERS.includes(this.name)) return true
		if (this.trainingGame) return true

		// Not simul, front of turn order
		if (!controller.isSimulPhase(store.gameflow.phase) && this.pov === store.gameflow.turnOrder[0]) return true
		// New simul phase, BUT has pre-moved, so still left in TO
		if (controller.isSimulPhase(store.gameflow.phase) && store.gameflow.phase === rf.PHASE_VILLAGE_EXPANDING && window.initData.move !== "") return false
		// simul, and IN turn order
		if (controller.isSimulPhase(store.gameflow.phase) && store.gameflow.turnOrder.includes(this.pov)) return true
		//alert(1)
		// Allow expanding village during boat phase
		if (!this.trainingGame && store.gameflow.phase === rf.PHASE_COLLECT_BOAT_RESOURCES && !store.gameflow.turnOrder.includes(this.pov) && store.players[this.pov].pendingVillageTiles.length > 0) {
			if (!IO.DEBUG_USERS.includes(this.name) && this.pov >=0 && window.initData.move != "") store.gameflow.phase = rf.PRE_PHASE_VILLAGE_EXPANDING
		}

		// Emergency check (required)
		if (store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING && window.initData.move != "") return false

		if (store.gameflow.phase === rf.PRE_PHASE_VILLAGE_EXPANDING && !store.gameflow.turnOrder.includes(this.pov)) return true
		//alert(`store.gameflow.phase: ${store.gameflow.phase} -- store.gameflow.turnOrder: ${store.gameflow.turnOrder} -- this.pov: ${this.pov}`)
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

		if (colour === 0) return "#84C3E2" // blue // 3474a9
		if (colour === 1) return "#3E7139" // green // red // a12529
		if (colour === 2) return "#D65A1E" // orange // f67112
		if (colour === 3) return "#92385C" // purple
		if (colour === 4) return "#808080" // grey //"#C28727" //"#ECC81C";// yellow // ece334
		if (colour === 5) return "#000000" //black // orange

		alert("Pers..GetCorrColHex: " + colour)
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

		if (colour === 0) return "black"
		//if (colour === 4) return "black"
		return "white"
	}

	return {
		canPlay,
		getCorrectedColour,
		getCorrectedColourHex,
		getCorrectedColourText,
		//canEndTurn,
		WSstatus,
		trainingGame,
		adminDataInspection,
		haltPlay,
		pov,
		name,
		latestUpdate,
		removeCurrentFlexTime,
		removeCurrentFlexTimeName,
		preferredColour,
		finishedGame
	}
})
