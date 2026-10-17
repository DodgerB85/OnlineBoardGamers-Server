/**
 * The main game store. This holds the shared game state that all clients see
 * (players, turn/phase, chat, history). Personal/private state lives in
 * PAPpersonal.js.
 */

import { defineStore } from "pinia"
import { computed, reactive, ref, shallowRef } from "vue"
import * as rf from "../js/PAPreference"

export const useModelStore = defineStore("store", () => {
	var gameName = "Game Name"

	const players = reactive([])

	const gameflow = reactive({
		turn: 1,
		phase: rf.PHASE_MAIN,
		turnOrder: [],
		fullTurnOrder: [],
	})

	// Engine state and the move log it is replayed from (see js/PAPmodel.js).
	const game = shallowRef(null)
	const actions = reactive([])
	const seed = ref(0)
	const options = ref({})
	const names = ref([])

	const chatData = reactive([])

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

	// Replay: replayData holds engine states (one per move); the board shows viewGame.
	const replayData = shallowRef([])
	const replayStep = reactive({ index: 0, maxStep: -1 })
	const viewGame = computed(() => (viewSettings.showReplay && replayData.value.length ? replayData.value[replayStep.index] : game.value))

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
		game,
		actions,
		seed,
		options,
		names,
		chatData,
		viewSettings,
		gameMessages,
		deleteVotesData,
		statsExcludeVotesData,
		kickoutVotesData,
		kickoutVoteThreshold,
		replayData,
		replayStep,
		viewGame,
		clearMessages,
		clearHistoryHelpers,
	}
})
