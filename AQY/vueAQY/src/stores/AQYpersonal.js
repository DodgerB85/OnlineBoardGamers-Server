/**
 * I use this to store certain personal things.
 * For example, like the players ID, their point-of-view at the table,
 * what sounds they want on their turn, if they're a super user, etc etc.
 *
 * It also has some functions, like canPlay, which at the same time would
 * be true for some players and false for others.
 * Hence it is a personal function, so goes in here.
 *
 *
 */

//import { ref } from 'vue'
import { defineStore } from "pinia"
import * as rf from "../js/AQYreference.js"
import * as controller from "../js/AQYcontroller.js"
import * as IO from "../backend/AQY_IO.js"

import { useModelStore } from "./AQYstore.js"

export const usePersonalStore = defineStore("personal", () => {
	const store = useModelStore()

	/******* SET ONCE VARS - IN SETUP */
	//var pov = 0
	//const superuser = ref(false)
	//let preferredColour;
	//var pov = 0
	//var preferredColour = 0
	var WSstatus = "WSconnecting" // Use for light colour

	function canPlay() {
		if (this.haltPlay) return false
		if (store.topMenuViews.showReplay) return false
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false

		if (this.pov < 0) return false
		if (store.players[this.pov].displayName == rf.BOT_NAME) return false


		if (IO.SUPER_USERS.includes(this.name)) return true
		if (this.trainingGame) return true
		// Allow play for PRE-moves
		if ([rf.PRE_PHASE_STORE_GOODS, rf.PRE_PHASE_HARVEST, rf.PRE_PHASE_EXPLORE, rf.PRE_PHASE_FAMINE, rf.PRE_PHASE_POLLUTION].includes(store.gameflow.phase)) return true

		// Not simul, front of turn order
		if (!controller.isSimulPhase(store.gameflow.phase) && this.pov === store.gameflow.turnOrder[0]) return true
		// simul, and IN turn order
		if (controller.isSimulPhase(store.gameflow.phase) && store.gameflow.turnOrder.includes(this.pov)) return true

		return false
	}

	function canPlayInCity(playerIndex) {
		if (this.haltPlay) return false
		if (store.topMenuViews.showReplay) return false
		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return false
		if (store.topMenuViews.showReplay) return false
		
		// practice game, just check current city is active city
		if (this.trainingGame && playerIndex === store.gameflow.turnOrder[0]) return true
		// In normal game, can only play in your POV city
		if (!this.trainingGame && playerIndex === this.pov) return true
		// Otherwise, you can't play in the city
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

	function getCorrectedColourHex(colour, doNotCorrect) {
		if (!doNotCorrect) {
			if (this.preferredColour > -1 && this.pov > -1) {
				if (store.players[this.pov].colour === colour) {
					colour = this.preferredColour
				} else if (this.preferredColour === colour) {
					colour = store.players[this.pov].colour
				}
			}
		}

		if (colour === 0) return "rgb(52, 90, 151)" // blue
		if (colour === 1) return "rgb(79, 23, 88)" // purple
		//if (colour === 2) return "rgb(112, 22, 31)";// red
		if (colour === 2) return "rgb(180, 42, 52)" // red

		if (colour === 3) return "rgb(227, 209, 12)" // yellow
		//if (colour === 4) return "rgb(222,193,31)";// yellow

		/*if (colour === 0) return "black";
    if (colour === 1) return "green";
    if (colour === 2) return "red";
    if (colour === 3) return "white";
    if (colour === 4) return "yellow";*/
		rf.doAdminAlrt("P..GCCH: " + colour)
		return "none"
	}

	return {
		canPlay,
		canPlayInCity,
		getCorrectedColour,
		getCorrectedColourHex,
		//canEndTurn,
		WSstatus,
	}
})
