/**
 * The main game store. This holds the shared game state that all clients see
 * (players, turn/phase, chat, history). Personal/private state lives in
 * ROWpersonal.js.
 */

import { defineStore } from "pinia"
import { reactive, ref } from "vue"
import * as rf from "../js/ROWreference"

export const useModelStore = defineStore("store", () => {
	var gameName = "Game Name"

	const players = reactive([])

	const gameflow = reactive({
		turn: 1,
		phase: rf.PHASE_MAIN,
		turnOrder: [],
		fullTurnOrder: [],
	})

	const chatData = reactive([])
	const history = reactive([])

	const viewSettings = reactive({
		showNotes: false,
		showChat: false,
		showBug: false,
		showHistory: false,
		showInfo: false,
		showLoader: false,
		showRewindPanel: false,
		performingRewind: false,
		showReplay: false,
	})

	const gameMessages = reactive({
		actionError: "",
		successText: "",
		errorText: "",
		bugErrorText: "",
	})

	const deleteVotesData = ref({})
	const statsExcludeVotesData = ref({})
	const kickoutVotesData = ref({})
	const kickoutVoteThreshold = ref(1)

	// Replay
	const replayData = reactive([])
	const replayStep = reactive({ index: 0, maxStep: -1 })

	function clearMessages() {
		gameMessages.actionError = ""
		gameMessages.errorText = ""
		gameMessages.bugErrorText = ""
		gameMessages.successText = ""
	}

	function clearHistoryHelpers() {
		// Placeholder: game-specific replay highlight data can be cleared here.
	}

	return {
		gameName,
		players,
		gameflow,
		chatData,
		history,
		viewSettings,
		gameMessages,
		deleteVotesData,
		statsExcludeVotesData,
		kickoutVotesData,
		kickoutVoteThreshold,
		replayData,
		replayStep,
		clearMessages,
		clearHistoryHelpers,
	}
})
