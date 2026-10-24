/**
 * The main game store. This holds the shared game state that all clients see
 * (players, turn/phase, chat, history). Personal/private state lives in
 * URRpersonal.js.
 */

import { defineStore } from "pinia"
import { computed, reactive, ref } from "vue"
import * as rf from "../js/URRreference.js"
import { usePersonalStore } from "./URRpersonal.js"
import { computeHistory } from "../js/URRhistory.js"
import { syncHistoryReplay } from "../js/URRhistoryStorage.js"

export const useModelStore = defineStore("store", () => {
	var gameName = "Game Name"

	const players = reactive([])
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

	// Draft checkpoints are local and never exported to the server.
	const turnDraft = reactive({ start: null, steps: [], player: null, ready: false, message: "", revision: 0, pauseAutomatic: false })
	function clearTurnDraft() {
		Object.assign(turnDraft, { start: null, steps: [], player: null, ready: false, message: "", pauseAutomatic: false })
		viewSettings.actionIntent = ""
		turnDraft.revision++
	}

	const chatData = reactive([])
	const history = reactive([])
	// Replayed positions are derived and never exported.
	const historyReplay = { entries: [], snapshots: [], times: [] }

	function resetHistoryReplay() {
		historyReplay.entries.length = 0
		historyReplay.snapshots.length = 0
		historyReplay.times.length = 0
	}

	function setHistory(entries) {
		history.splice(0, history.length, ...entries)
		resetHistoryReplay()
	}

	function syncHistory() {
		return syncHistoryReplay(historyReplay, history, players.map((player) => player.name), usePersonalStore().gameCreationTimestamp)
	}

	function historySnapshotAt(index) {
		if (index < 0 || index >= history.length) return null
		return syncHistory().snapshots[index]
	}

	function historySnapshots() {
		return syncHistory().snapshots
	}

	function historyTimeAt(index) {
		if (index < 0 || index >= history.length) return null
		return syncHistory().times[index]
	}

	// Pre-game edits (shadow names, missing seats) belong to the opening, not a move.
	function setHistoryOpening(changes) {
		if (!history.length) return
		if (changes?.length) history[0][3] = changes
		else if (history[0].length > 3) history[0].length = 3
		resetHistoryReplay()
	}

	// Display-only entries and metadata belong here, not in exported history.
	const computedHistory = computed(() => {
		const replay = syncHistory()
		return computeHistory(history, usePersonalStore().gameCreationTimestamp, replay.snapshots, replay.times)
	})

	const viewSettings = reactive({
		boardZoom: 1,
		historyArea: null,
		actionIntent: "",
		showNotes: false,
		showChat: false,
		showBug: false,
		showHistory: false,
		showInfo: false,
		showLoader: false,
		isSaving: false,
		isSendingChat: false,
		isSavingNotes: false,
		showOverview: false,
		showOwnedLand: false,
		inspectedPlayer: null,
		inspectedState: null,
		showRewindPanel: false,
		showResignPanel: false,
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
		turnDraft, clearTurnDraft,
		players,
		states, nations, board, landPrices, era, cardSupply, rain, nextDiggerId, debug,
		gameflow,
		chatData,
		history,
		setHistory,
		historySnapshotAt,
		historySnapshots,
		historyTimeAt,
		setHistoryOpening,
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
