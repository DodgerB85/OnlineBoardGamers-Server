import { defineStore } from "pinia"
import { ref } from "vue"

/** Per-viewer (private) state. All mutable fields are declared (WEB style). */
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

	function canPlay(currentPlayer: string | null, phase: number): boolean {
		// phase === 2 is GAME_OVER in the engine; viewers who are the current seat may act.
		if (haltPlay.value) return false
		if (pov.value < 0) return false
		if (trainingGame.value) return true
		return currentPlayer !== null
	}

	function getCorrectedColour(colour: string): string {
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
		canPlay,
		getCorrectedColour,
	}
})
