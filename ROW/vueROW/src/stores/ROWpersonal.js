/**
 * Per-viewer (private) state for ROW. Mirrors FCMpersonal / RNBpersonal.
 */
import { defineStore } from "pinia"
import { ref } from "vue"

export const usePersonalStore = defineStore("personal", () => {
	const WSstatus = ref("WSconnecting")
	const gameID = ref(-1)
	const gameCreationTimestamp = ref(0)
	const finishedGame = ref(false)
	const trainingGame = ref(false)
	const liveWS = ref(true)
	const name = ref("")
	const latestUpdate = ref(0)
	const pov = ref(-99) // -99 not logged in, -9 not involved, -1 admin, 0+ seat
	const secondsToNextKickout = ref(99999)
	const notes = ref("")
	const yourTurnAudioType = ref(0)
	const haltPlay = ref(false)
	const kickoutRequired = ref(0)
	const transactionID = ref("")
	const chatNotification = ref(false)
	const zoom = ref(16)

	function canPlay(currentPlayer) {
		if (haltPlay.value) return false
		// Practice/training games let the logged-in user drive every seat.
		if (trainingGame.value) return true
		if (pov.value < 0) return false
		if (!name.value) return false
		return name.value === currentPlayer
	}

	function getCorrectedColour(colour) {
		return colour
	}

	return {
		WSstatus,
		gameID,
		gameCreationTimestamp,
		finishedGame,
		trainingGame,
		liveWS,
		name,
		latestUpdate,
		pov,
		secondsToNextKickout,
		notes,
		yourTurnAudioType,
		haltPlay,
		kickoutRequired,
		transactionID,
		chatNotification,
		zoom,
		canPlay,
		getCorrectedColour,
	}
})
