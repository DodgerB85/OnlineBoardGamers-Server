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

import { defineStore } from "pinia"
import * as rf from "../js/CNSreference"

import { useModelStore } from "./CNSstore.js"

export const usePersonalStore = defineStore("personal", () => {
	const store = useModelStore()

	/******* SET ONCE VARS - IN SETUP */
	//var pov = 0
	//const superuser = ref(false)
	//let preferredColour;
	//var pov = 0
	//var preferredColour = 0
	var WSstatus = "WSconnecting" // Use for light colour
	var votedToDelete = false
	var votedToExclude = false

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
				colour = this.preferredColour
			} else if (this.preferredColour === colour) {
				colour = store.players[this.pov].colour
			}
		}

		if (colour === 0) return "black" // black
		if (colour === 1) return "blue" // blue
		if (colour === 2) return "red" // red
		if (colour === 3) return "yellow" // yellow

		alert("P..GCCH: " + colour)
		return "none"
	}

	return {
		canPlay,
		getCorrectedColour,
		getCorrectedColourHex,
		WSstatus,
    votedToDelete,
    votedToExclude,
	}
})
