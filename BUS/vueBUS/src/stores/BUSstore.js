import * as rf from "../js/BUSreference.js"
//import * as funcs from "../js/BUSfuncs.js"
//import * as IO from "../backend/BUS_IO"
//import * as Bot from "../js/BUSbot"
//import * as controller from "../js/BUScontroller.js"
//import * as model from "../js/BUSmodel.js"

import { ref, reactive } from "vue"
import * as view from "../js/BUSview.js"

import { defineStore } from "pinia"

//import { storeToRefs } from 'pinia'

/************************ SET UP ONCE VARS */
//var trainingGame = true
//var gameCreationTimestamp = 0 // NEEDS SAVING LOCALLY
//var gameName = 'Bus Game Name'
//var liveWS = "yellow"
/********************** */

export const useModelStore = defineStore("model", () => {
	const deleteVotesData = ref({})
	const statsExcludeVotesData = ref({})

	const players = reactive([])
	const junctions = reactive([...rf.initialJunctionsStateArray])

	const refSize = ref(120)
	const desiredBuilding = ref(1)

	const remainingTimeStones = ref(5) // 4 IN THREE PLAYERS !!!
	const remainingPassengers = ref(11)
	const lines = reactive(Array.from({ length: 80 }, () => []))

	const actionAreaData = reactive([[-1, -1, -1, -1, -1, -1], [-1], [-1, -1, -1, -1, -1, -1], [-1, -1, -1, -1, -1, -1], [-1], [-1, -1, -1, -1, -1, -1], [-1]])

	const gameflow = reactive({
		turn: 0,
		phase: 0,
		turnOrder: [],
		fullTurnOrder: [],
		fullActionTurnOrder: [],
		gameEnded: 0,
	})

	const chatData = reactive([])

	const history = reactive([])

	// UNSAVED - TEMP VARS
	const context = reactive({
		buildingsLeftToPlace: 0,
		linesLeftToPlace: 0,
		passengersLeftToPlace: 0,
		selectedBuildingType: 1,
		remainingVroms: 0,
		turnEndingErrorMessage: "",
		//subphase: 0,
		selectedPaxToVromJunction: -1,
		endJunctionsOptions: [],
		actionChosen: false,
		confirmEndTurn: false,
		confirmResign: false,
		historyObj: [],
		action: -1,
	})
	const topMenuViews = reactive({
		showNotes: false,
		showChat: false,
		showBug: false,
		showHistory: false,
		showLoader: false,
		showRewindPanel: false,
		selectingBoard: false,
		displayRightActionSelection: true,
		showReplay: false,
		generatingReplay: false,
		showStatsExcludeDropdown: false,
	})

	const turnResetData = ref("")
	const endReplayResetData = ref("")

	const historyHelpers = reactive({
		buildingsToHighlight: [],
		linesToHighlight: [],
		junctionsToHighlight: [],
	})
	function clearHistoryHelpers() {
		historyHelpers.buildingsToHighlight = []
		historyHelpers.linesToHighlight = []
		historyHelpers.junctionsToHighlight = []
	}

	const performingRewind = ref(false)
	const performingBoardChange = ref(false)
	const rewindErrorText = ref("")
	const successText = ref("")

	const replayStep = ref(0)
	const replayData = reactive([])

	function resetVarsOnTurnEnd() {
		context.buildingsLeftToPlace = 0
		context.linesLeftToPlace = 0
		context.passengersLeftToPlace = 0
		context.selectedBuildingType = 1
		context.remainingVroms = 0
		context.turnEndingErrorMessage = ""
		//context.subphase = 0
		context.selectedPaxToVromJunction = -1
		context.endJunctionsOptions = []
		context.actionChosen = false
		context.confirmEndTurn = false
		context.confirmResign = false
		context.historyObj.splice(0, context.historyObj.length)
		rewindErrorText.value = ""
		successText.value = ""
	}

	return {
		junctions,
		gameflow,
		players,
		refSize,
		context,
		lines,
		actionAreaData,
		desiredBuilding,
		history,
		historyHelpers,
		clearHistoryHelpers,
		chatData,
		performingRewind,
		performingBoardChange,
		rewindErrorText,
		successText,
		replayStep,
		replayData,
		endReplayResetData,
		deleteVotesData,
		statsExcludeVotesData,
		topMenuViews,
		remainingTimeStones,
		remainingPassengers,
		turnResetData,
		resetVarsOnTurnEnd,
	}
})
