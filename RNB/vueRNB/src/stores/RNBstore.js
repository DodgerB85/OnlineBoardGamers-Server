/**
 *
 * refSize is used to set the zoom.
 *
 * Anything on the SVG map needs to be processed throughh store.RATIO
 * in order for it to appear correctly with changing viewports / pixel width/heights
 * In reality, store.RATIO should be fixed for any given map, as the map size never changes "in" game
 *
 */

import * as rf from "../js/RNBreference"
import * as hd from "../js/RNBhex"
//import * as mg from "../js/RNBgraph"
//import * as util from "../js/RNButil"
//import * as vec from "../js/RNBvector"
//import * as model from "../js/RNBmodel"
//import * as map from '../js/RNBmap'
import * as histJS from "../components/History/RNBhistory"
import * as wonder from "../js/RNBwonder"

import { defineStore } from "pinia"

import { ref, reactive, computed } from "vue"
//import * as refFuncs from '../js/RNBfuncs'
//import * as map from '../js/RNBmap'

import { usePersonalStore } from "./RNBpersonal.js"
//  const personal = usePersonalStore()

export const useModelStore = defineStore("store", () => {
	/** Non Reactive Vars */
	var gameName = "Game Name"

	// NB - MAY need to make this reactive
	const internalStartingOptions = []
	// Game settings
	var gameOptions = {
		useFundamentalResearch: false,
		useSoloMineRules: false,
		useElectricity: false,
		useManagement: false,
		useArt: false,
		useTrade: false,
		usePlanes: false,
		useBombs: false,
		useJumpStart: false,
	}
	var CUSTOM_RULES = []

	// MANAGEMENT: Owner's choice for whether their transporter-carried managers activate on a tile.
	// { [playerIndex]: { [hexID]: true/false } }. Defaults to true (active) when not set.
	var managerActivation = {}

	// This var affects the ZOOM level
	// So everything that will be affected by zooming should be referenced through this
	const refSize = ref(2400) // default 2400

	// This var affects the canvas size for the map.
	// It is NOT to do with zooming, but just the size of the map.
	// Larger maps need a larger canvas!
	const canvasSize = ref(600)
	const canvasWidth = ref(600)
	const canvasHeight = ref(600)
	const hexStyle = ref(rf.POINTY)
	const deleteVotesData = ref({})
	const statsExcludeVotesData = ref({})
	const kickoutVotesData = ref({})
	const kickoutVoteThreshold = ref(1)
	const mapUpdateTrigger = ref(0)

	// Settings flags
	const trainingGameSkipConflictPhase = ref(false)
	const stackControl = reactive({
		loadedPreMove: false,
		loadedPreMoveIsSkip: false,
		failedStackHistoryEntry: [],
		previewingPhase: null,
	})

	const RATIO = computed(() => {
		return ((refSize.value / 2400 / canvasSize.value) * 260).toFixed(3)
	})

	/*function scaleByRatio(pt) {
		return pt.map((val) => parseFloat((val * RATIO.value).toFixed(3)))
	}*/

	const VERTICES_POINTY_EXT = [
		[0, -463.127],
		[399.692, -231.564],
		[399.692, 231.564],
		[0, 463.127],
		[-399.692, 231.564],
		[-399.692, -231.564],
	]

	// THIS IS NO LONGER USED
	/*const VERTICES_FLAT_EXT = computed(() => {
		const theta = (30 * Math.PI) / 180
		return VERTICES_POINTY_EXT.value.map((val) => [val[0] * Math.cos(theta) - val[1] * Math.sin(theta), val[0] * Math.sin(theta) + val[1] * Math.cos(theta)])
	})*/

	// NB this should probably be removed. Vertexes should either be internal to hex, or _EXT
	// This is indeed, no longer used. Vertices should be pointy, rotated 30deg mathmatically on the hex as needed
	/*const VERTICES_CURRENT = computed(() => {
		let corners = VERTICES_POINTY_EXT.value
		let midpoints = util.indexArray(6).map((i) => vec.scaleBy(0.5, vec.sum(corners[i], corners[(i + 1) % 6])))
		// center plus corners plus sides
		return [[0, 0]].concat(corners.concat(midpoints))
	})*/

	// THIS IS NO LONGER USED - VERTICES_POINTY_EXT is now fixed, not computed
	/*const VERTICES_CURRENT_EXT = computed(() => {
		return VERTICES_POINTY_EXT.value
	})*/

	// NB Might need to do liek the VERTICES, IE MID_POINTS_POINTY/FLAT and MID_POINTS_CURRENT
	// But at the moment it's just calculated for pointy and rotated as needed - "raw" flat mid points are not needed at the moment
	const MID_POINTS_POINTY = [
		[199.846, -347.346],
		[399.692, 0.0],
		[199.846, 347.346],
		[-199.846, 347.346],
		[-399.692, 0.0],
		[-199.846, -347.346],
	]

	/*const MID_POINTS_FLAT = computed(() => {
		const theta = (30 * Math.PI) / 180
		return MID_POINTS_POINTY.value.map((val) => [val[0] * Math.cos(theta) - val[1] * Math.sin(theta), val[0] * Math.sin(theta) + val[1] * Math.cos(theta)])
	})*/

	/*const MID_POINTS_CURRENT = computed(() => {
		return MID_POINTS_POINTY.value
	})*/

	const hexPoints = computed(() => {
		return hd.getHexPoints(false, 1, false)
	})

	/************ These top vars need to be stored and saved between players / moves */
	const players = reactive([])

	const mapData = reactive({
		hexData: [],
		neighbours: [],
		edgeData: [],
		displaySettings: {
			showTransporters: true,
			showResources: true,
			showRoads: true,
			showBridges: true,
			showWalls: true,
			showBuildings: true,
			showHomeMakres: true,
		},
		zoomData: {
			hexID: -1,
		},
		startingMap: [], // Compressed map editor data
		setupData: {}, // OBJECT of setup Data
		externalMapData: [],
	})

	const ALL_TRANSPORTERS = reactive([])
	const ALL_BUILDINGS = reactive([])
	const ALL_RESOURCES = reactive([])
	const ALL_HOME_MARKERS = reactive([])

	const knownArrayLengths = [0, 0, 0]
	const knownFinalHistoryidx = 0 // RES, BLDGS, TRANS
	const expectedResPreProduction = 0

	//const wonderBricks = reactive(Array(83).fill(-1)) // why was this 81?
	const wonderBricks = reactive([]) // why was this 81?

	var ALL_TRANSPORTERS_HIST = []
	var ALL_BUILDINGS_HIST = []
	var ALL_RESOURCES_HIST = []
	var ALL_HOME_MARKERS_HIST = []

	const gameflow = reactive({
		turn: 1,
		phase: rf.PHASE_PRODUCTION_TO,
		currentPhase: rf.PHASE_PRODUCTION_TO, // NB this is just used to reset the phase when going into a PRE_PHASE
		futureUnboundedMainPhaseNum: 16,
		futureUnboundedConflictPhaseNum: 16,
		turnOrder: [],
		fullTurnOrder: [],
		wonderPrayingOrder: [],
		wonderTurnOrder: [],
		newWonderPrayingOrder: [],
		newWonderTurnOrder: [],
	})

	// Setting a pre-move alters gameflow.phase
	// So this records the "actual" position of the game,
	// basically so you know if you're editing within the same conflict phase as the game
	const actualGameState = reactive({
		turn: -1,
		phase: -1,
	})

	const chatData = reactive([])

	const history = reactive([])

	const ongoingVars = reactive({
		resourceSharingData: [],
	})

	const undoPoints = reactive([])

	const actionStack = reactive([])

	const conflictPreset = reactive({
		conflictDecision: rf.CONFLICT_DECISION_NO_CONFLICT, // Default: Option 2 (do not wish)
		prayingDecision: rf.CONFLICT_PRAYING_WAIT_AND_SEE, // Default: Last option
		turnOrderDecision: rf.CONFLICT_TURN_ORDER_WAIT_AND_SEE, // Default: Last option
		skipWonderPhaseDecision: rf.CONFLICT_SKIP_WONDER_PHASE_WAIT_AND_SEE, // Default: Last option
		skipProductionPhaseDecision: rf.CONFLICT_SKIP_PRODUCTION_PHASE_WAIT_AND_SEE, // Default: Last option
	})

	const allStackData = reactive([])
	/*************************************** UNSAVED - TEMP VARS -- these do not need to be stored or saved */

	const context = reactive({
		action: -1,
		hexTerrainIDbeingAdded: -1,

		placeableTiles: [],
		hexBeingAddedRotation: 0,
		historyObj: [],

		newRoadInfo: [],
		transporterMoveInfo: [],
		resIDbeingMoved: -1,
		transporterIDbeingDropped: -1,

		// Electricity vars
		buildingPowerLine: false, // True while the player is placing power line segments
		poweredHexIDs: [], // Hexes energised this production phase by a working power plant
		powerPlantsFueledTurn: -1, // Turn the power plants were last fuelled for (idempotency guard)

		// Transporter Mode vars
		selectedTransporterIDforTM: -1,
		gooseID: -1,

		// Production vars
		pendingTransporterTypeForLocationSelectionData: [],
		possibleDonkeyReproductionData: [], // Persists until turn end
		selectedDonkeyIdxToStoreTransporterRemoveal: -1,
		chosenInputGoods: [[], [], -1], // [[possible inputs], [chosen input], bldg.id]
		atelierRecipeOutput: -1, // Art & The Atelier: output (res or transporter) for the current atelier production
		atelierRecipeOptions: [], // Art & The Atelier: feasible recipe indices awaiting a bubble choice
		atelierBuildingID: -1,
		atelierTransporterID: -1,
		researchHexIDpossibilities: [],
		researchIndexForBuildingUpgrades: -1,

		// Movement vars
		errorUnableToDropGeeseAtSea: false,
		remainingTransportersWithMovement: [],
		selectedTransporterIDforPickupOrSelection: -1,

		// Plane (Planes & Aeroports) vars
		selectedPlaneMode: -1, // rf.MOVE_FLY | rf.MOVE_TAXI while a plane is selected
		midFlightDropTiles: [], // land tiles validated for airdrop this move

		// Building Vars
		eligibleBuildingsToBuild: [],
		eligibleBridgesToBuild: [],
		eligibleWallsToBuild: [],
		eligibleWallsToDemolish: [],
		selectedBuildingToBuild: -1,
		mineSelectionType: 0,
		// summary
		remainingBuildingSummaryOptions: [],
		noTransportersOnHomeTile: false,

		// Wonder vars
		wonderError: 0,
		resIDsOnHomeTile: [],
		resIDsInWonderBrick: [],

		// highlights
		// Sometimes you want to highlight ABOVE transporters, sometimes underneath
		hexPiecesToHighlight: [], // arrays of [tileID, [vertexes]]
		hexPiecesToHighlightUnderTransporters: [], // arrays of [tileID, [vertexes]]
		resourceIDsToHighlight: [], // array of resource IDs
		transporterIDsToHighlight: [], // array of transporter IDs
		buildingIDsToHighlight: [],
		riversToHighlight: [],
		shoresToHighlight: [],
		halfShoresToHighlight: [], // [hexID, vertex, sideForTheHalfSide]

		pathfinding: {},
	})

	const viewSettings = reactive({
		showNotes: false,
		showNoteHexIDs: false,
		showChat: false,
		showBug: false,
		showHistory: false,
		showInfo: false,
		showLoader: false,
		showRewindPanel: false,
		performingRewind: false,

		generatingReplay: false,
		showReplay: false,
		replayAtBottm: false,

		showIntroInfo: true,

		// 0 = none, 1 = transparent, 2 = full colour
		colourOverlay: 0,
	})

	const gameMessages = reactive({
		actionError: "",
		successText: "",
		errorText: "",
		bugErrorText: "",
		turnEndText: "", // Store text to display after an auto-action

		endTurnMessage: "", // store text to display AFTER YOU ENDED YOUR TURN
	})

	function clearMessages(keepEndTurnMessage = false) {
		gameMessages.actionError = ""
		gameMessages.errorText = ""
		gameMessages.bugErrorText = ""
		gameMessages.successText = ""
		gameMessages.turnEndText = ""

		if (!keepEndTurnMessage) gameMessages.endTurnMessage = ""
	}

	const historyHelpers = reactive({
		histHexPiecesToHighlight: [],
		histBuildingsToHighlight: [],
		histRiversToHighlight: [],
		histShoresToHighlight: [],
		histHalfShoresToHighlight: [],
		histBridgesToHighlight: [],
		histWallsToHighlight: [],
	})

	function clearHistoryHelpers() {
		historyHelpers.histHexPiecesToHighlight.splice(0)
		historyHelpers.histBuildingsToHighlight.splice(0)
		historyHelpers.histRiversToHighlight.splice(0)
		historyHelpers.histShoresToHighlight.splice(0)
		historyHelpers.histHalfShoresToHighlight.splice(0)
		historyHelpers.histBridgesToHighlight.splice(0)
		historyHelpers.histWallsToHighlight.splice(0)
	}

	const wholeTurnResetData = ref("")
	const phaseResetData = ref("")
	const replayResetData = ref("")
	const goBackResetData = ref("")

	const replayData = reactive([])
	const spinoffReplayData = reactive([])
	const replayStep = reactive({
		computedHistoryIndex: 0,
		mainStep: 0,
		subStep: -1,
		maxStep: -1,
		index: 0,
	})

	const debugVars = {
		computedHexCounter: 0,
	}

	const errorPopupSetter = reactive({
		showPopup: false,
		pos: [0, 0],
		htmlMessage: "",
		timer: null,
	})

	const infoPopupSetter = reactive({
		showPopup: false,
		pos: [0, 0],
		htmlMessage: "",
		timer: null,
	})

	const adminCheatMoveData = reactive({
		selectedRes: 0,
		selectedBldg: rf.BLDG_SAWMILL, // Bldgs start at 50
		selectedTransporter: rf.DONKEY,
		selectedTransportPlayerIndex: 0,
	})

	/*******************END TEMP VARS */
	const computedHistory = computed(() => {
		const personal = usePersonalStore()
		let computedHistory = JSON.parse(JSON.stringify(history))

		// First add the corrected timestamps
		let timestamp = personal.gameCreationTimestamp
		for (let i = 0; i < computedHistory.length; i++) {
			timestamp += computedHistory[i][2]
			computedHistory[i][2] = timestamp
		}

		if (!personal.soloGame) {
			// Add in an entry if there was no conflict
			for (let i = computedHistory.length - 2; i >= 0; i--) {
				// check if this entry AND next have different phases, and both being stack
				let phaseChangeRet = histJS.changeOfPhaseWithNoConflictDetected(i)
				if (phaseChangeRet[0] === true) {
					// Add the entry
					computedHistory.splice(i + 1, 0, [rf.HIST_NO_CONFLICT, -1, computedHistory[i][2], [phaseChangeRet[1]]])
				}
			}

			// Add an entry if the PREVIOUS entry was a DIFFERENT MAIN phase - ie no conflict
			if (gameflow.phase !== rf.PHASE_GAME_OVER && rf.MAIN_PHASES.includes(gameflow.phase)) {
				if (history[history.length - 1][0] === rf.HIST_STACK_ACTIONS && history[history.length - 1][3][0] !== gameflow.phase) {
					computedHistory.push([rf.HIST_NO_CONFLICT, -1, computedHistory[computedHistory.length - 1][2], []])
				}
			}
		}

		// Inset the NEW_GAME
		computedHistory.unshift([rf.HIST_NEW_GAME, -1, 0, []])
		// Add End game
		if (gameflow.phase === rf.PHASE_GAME_OVER) {
			// The full Turn Order should be created in winning order on import
			// Add the winning entry
			let histEntry = []
			for (const playerIndex of gameflow.fullTurnOrder) {
				histEntry.push([playerIndex, wonder.getPlayerTotalScore(playerIndex)])
			}
			computedHistory.push([rf.HIST_GAME_END, -1, personal.gameCreationTimestamp, histEntry])
		}
		return computedHistory
	})

	return {
		gameflow,
		viewSettings,

		refSize,
		canvasSize,
		canvasWidth,
		canvasHeight,
		context,
		players,

		history,
		historyHelpers,
		clearHistoryHelpers,
		wholeTurnResetData,
		goBackResetData,
		replayData,
		replayStep,
		chatData,

		phaseResetData,
		ongoingVars,

		replayResetData,
		spinoffReplayData,
		debugVars,
		mapData,
		hexStyle,
		gameName,
		gameMessages,
		clearMessages,
		RATIO,
		VERTICES_POINTY_EXT,
		MID_POINTS_POINTY,
		hexPoints,
		ALL_TRANSPORTERS,
		ALL_BUILDINGS,
		ALL_RESOURCES,
		errorPopupSetter,
		infoPopupSetter,
		undoPoints,
		actionStack,
		ALL_HOME_MARKERS,
		computedHistory,
		ALL_BUILDINGS_HIST,
		ALL_RESOURCES_HIST,
		ALL_TRANSPORTERS_HIST,
		ALL_HOME_MARKERS_HIST,
		wonderBricks,
		deleteVotesData,
		statsExcludeVotesData,
		kickoutVotesData,
		kickoutVoteThreshold,
		adminCheatMoveData,
		trainingGameSkipConflictPhase,
		stackControl,
		gameOptions,
		managerActivation,
		conflictPreset,
		allStackData,
		internalStartingOptions,
		knownFinalHistoryidx,
		knownArrayLengths,
		expectedResPreProduction,
		mapUpdateTrigger,
		CUSTOM_RULES,
		actualGameState,
	}
})
