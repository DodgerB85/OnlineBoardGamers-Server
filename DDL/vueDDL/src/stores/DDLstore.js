/**
 * Shared game state. Everything in `players`, `board`, `gameflow`, `history`
 * is saved to Game.gameData; `context`, viewSettings and messages are local.
 */

import { defineStore } from "pinia"
import { reactive, ref } from "vue"
import * as rf from "../js/DDLreference.js"

function emptyBoard() {
	return {
		planets: [],
		consumerSlots: [[], []],
		factoryStock: [],
		trades: [],
		turnCubes: [],
		highways: {},
		energyStock: [40, 40, 40],
	}
}

function emptyGameflow() {
	return {
		turn: 1,
		phase: rf.PHASE_SETUP,
		turnOrder: [],
		fullTurnOrder: [],
		setup: {
			auction: false,
			stage: rf.TURN_SETUP_GEAR,
			gearDone: [],
			planetDone: [],
			auctionBids: {},
			auctionOrder: [],
			tiebreakPlayers: [],
			auctionResolved: true,
		},
		actionTurn: 1,
		turnType: rf.TURN_CHOOSE,
		actionStage: rf.ACT_NONE,
		freeActionTurn: false,
		freeHighwaysLeft: 0,
		movement: { remaining: 0, active: false },
		pendingExplore: null,
		finalPositions: [],
		winnerNames: [],
	}
}

export const useModelStore = defineStore("store", () => {
	var gameName = "Game Name"

	const players = reactive([])
	const board = reactive(emptyBoard())
	const gameflow = reactive(emptyGameflow())
	const chatData = reactive([])
	const history = reactive([])

	const context = reactive({
		action: rf.ACT_NONE,
		selectedPlanet: -1,
		selectedTradePlayer: -1,
		selectedGive: [],
		selectedReceive: [],
		highlightNodes: [],
		selectedBuildKind: "",
		selectedFactoryId: -1,
		selectedGearSlot: -1,
		selectedRandomGood: -1,
		selectedPathwayIn: -1,
		selectedPathwayOut: -1,
		exploreColumn: -1,
		highwayCostsEnergy: false,
		errorText: "",
	})

	function resetContext() {
		context.action = rf.ACT_NONE
		context.selectedPlanet = -1
		context.selectedTradePlayer = -1
		context.selectedGive.splice(0)
		context.selectedReceive.splice(0)
		context.highlightNodes.splice(0)
		context.selectedBuildKind = ""
		context.selectedFactoryId = -1
		context.selectedGearSlot = -1
		context.selectedRandomGood = -1
		context.selectedPathwayIn = -1
		context.selectedPathwayOut = -1
		context.exploreColumn = -1
		context.highwayCostsEnergy = false
	}

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
		showAuction: false,
		showTrade: false,
		showDiscardCargo: false,
		showDiscardEnergy: false,
		showExplore: false,
		showGearPicker: false,
		showPlanetPicker: false,
		zoomPct: 100,
		zoomFitToken: 0,
	})

	const gameMessages = reactive({
		actionError: "",
		successText: "",
		errorText: "",
		bugErrorText: "",
		turnText: "",
	})

	function clearMessages() {
		gameMessages.actionError = ""
		gameMessages.errorText = ""
		gameMessages.bugErrorText = ""
		gameMessages.successText = ""
		gameMessages.turnText = ""
		context.errorText = ""
	}

	const deleteVotesData = ref({})
	const statsExcludeVotesData = ref({})
	const kickoutVotesData = ref({})
	const kickoutVoteThreshold = ref(1)

	const replayData = reactive([])
	const replayStep = ref(0)

	function clearHistoryHelpers() {
		// reserved for history highlights
	}

	function replaceBoard(newBoard) {
		const defaults = emptyBoard()
		for (const key of Object.keys(defaults)) {
			board[key] = newBoard && newBoard[key] !== undefined ? newBoard[key] : defaults[key]
		}
	}

	function replaceGameflow(newFlow) {
		const defaults = emptyGameflow()
		for (const key of Object.keys(defaults)) {
			gameflow[key] = newFlow && newFlow[key] !== undefined ? newFlow[key] : defaults[key]
		}
	}

	return {
		gameName,
		players,
		board,
		gameflow,
		chatData,
		history,
		context,
		viewSettings,
		gameMessages,
		deleteVotesData,
		statsExcludeVotesData,
		kickoutVotesData,
		kickoutVoteThreshold,
		replayData,
		replayStep,
		resetContext,
		clearMessages,
		clearHistoryHelpers,
		replaceBoard,
		replaceGameflow,
	}
})
