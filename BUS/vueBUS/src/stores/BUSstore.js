import * as rf from "../js/BUSreference.js"
//import * as funcs from "../js/BUSfuncs.js"
//import * as IO from "../backend/BUS_IO"
//import * as Bot from "../js/BUSbot"
//import * as controller from "../js/BUScontroller.js"
//import * as model from "../js/BUSmodel.js"

import { ref, reactive } from "vue"
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
	const junctions = reactive([])

	function initializeJunctions(board) {
		if (board === rf.BOARD_PITTS) {
			junctions.splice(0)
			junctions.push(...rf.initialJunctionsStateArrayPitts)
		} else {
			junctions.splice(0)
			junctions.push(...rf.initialJunctionsStateArray)
		}
	}

	const refSize = ref(120)
	const desiredBuilding = ref(rf.BLDG_HOME)

	const remainingTimeStones = ref(5) // 4 IN THREE PLAYERS !!!
	const remainingPassengers = ref(11)
	const lines = reactive(Array.from({ length: 80 }, () => []))

	const jeroenStatus = ref(-1)
	const jorisStatus = ref(-1)

	// Bridge tracking for Pittsburgh
	// Array of line IDs that have bridges placed on them
	const bridges = reactive([])

	// Bridge markers available for Pittsburgh (5 total, shared)
	const remainingBridgeMarkers = ref(5)

	// Track which end of each line has a bridge (for expansion options)
	// Format: { lineID: 0 | 1 } where 0 = first end, 1 = second end
	const bridgeEnds = reactive({})

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
		selectedBuildingType: rf.BLDG_HOME,
		remainingVroms: 0,
		turnEndingErrorMessage: "",
		//subphase: 0,
		selectedPaxToVromJunction: -1,
		selectedDesignerToVrom: -1,
		endJunctionsOptions: [],
		actionChosen: false,
		confirmEndTurn: false,
		confirmResign: false,
		historyObj: [],
		action: -1,
		eligibleJunctionsToVromPitts: [],
		// Bridge expansion option for Pittsburgh
		bridgeExpansionOption: null,
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
		errorText: "",
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
		context.selectedBuildingType = rf.BLDG_HOME
		context.remainingVroms = 0
		context.turnEndingErrorMessage = ""
		//context.subphase = 0
		context.selectedPaxToVromJunction = -1
		context.selectedDesignerToVrom = -1
		context.endJunctionsOptions = []
		context.actionChosen = false
		context.confirmEndTurn = false
		context.confirmResign = false
		context.historyObj.splice(0, context.historyObj.length)
		context.eligibleJunctionsToVromPitts.splice(0)
		rewindErrorText.value = ""
		successText.value = ""
		topMenuViews.errorText = ""

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
		initializeJunctions,
		// Pittsburgh variables
		bridges,
		remainingBridgeMarkers,
		bridgeEnds,
		jeroenStatus,
		jorisStatus,
	}
})
