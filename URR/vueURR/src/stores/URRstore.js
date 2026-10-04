/**
 * The main game store. This holds the shared game state that all clients see
 * (players, turn/phase, chat, history). Personal/private state lives in
 * URRpersonal.js.
 */

import { defineStore } from "pinia"
import { computed, reactive, ref } from "vue"
import * as rf from "../js/URRreference"
import { usePersonalStore } from "./URRpersonal.js"
import { computeHistory } from "../js/URRhistory.js"

export const useModelStore = defineStore("store", () => {
	var gameName = "Game Name"

	const players = reactive([])
	const version = ref(rf.GAME_DATA_VERSION)
	const states = ref([])
	const nations = ref([])
	const board = ref({ areas: [], canals: [], stateOrder: [], markerLimit: null })
	const landPrices = ref([...rf.LAND_COLONIZATION_PRICES])
	const era = ref(1)
	const cardSupply = ref({ ...rf.ERA_CARD_COUNTS })
	const rain = ref({ step: null, outflow: null, harvestOrder: [] })
	const nextDiggerId = ref(0)
	// Local debug controls are deliberately excluded from saved game data.
	const debug = reactive({ tool: "", player: 0, state: 0, era: 1, landType: rf.LAND_SAVANNAH, path: [], undo: [] })

	const gameflow = reactive({
		turn: 1,
		phase: rf.PHASE_DIVIDING_NATIONS,
		turnOrder: [],
		fullTurnOrder: [],
	})

	const chatData = reactive([])
	const history = reactive([])
	// Display-only entries and metadata belong here, not in exported history.
	const computedHistory = computed(() => computeHistory(history, usePersonalStore().gameCreationTimestamp))

	const viewSettings = reactive({
		boardZoom: 1,
		historyArea: null,
		showNotes: false,
		showChat: false,
		showBug: false,
		showHistory: false,
		showInfo: false,
		showLoader: false,
		isSaving: false,
		isSendingChat: false,
		isSavingNotes: false,
		inspectedPlayer: null,
		inspectedState: null,
		showRewindPanel: false,
		performingRewind: false,
		showReplay: false,
	})

	const gameMessages = reactive({
		actionError: "",
		successText: "",
		errorText: "",
		bugErrorText: "",
		chatErrorText: "",
		notesErrorText: "",
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
		viewSettings.historyArea = null
	}

	return {
		gameName,
		players,
		version, states, nations, board, landPrices, era, cardSupply, rain, nextDiggerId, debug,
		gameflow,
		chatData,
		history,
		computedHistory,
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
