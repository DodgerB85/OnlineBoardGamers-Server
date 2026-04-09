/**
 * Ok, this in some ways is what I am least sure of.
 * I generally found it easier to have one store for all the game model stuff,
 * and to have as few functions in the store as possible.
 * This is because in here, you make a var like const myNum = ref(2)
 * but to set it here you have to do myNum.value = 4
 * If you export myNum, then elsewhere, you simply do myNum = 4.
 * This had some pretty big implications for trying to import/export the game
 * model and reset the variables in the store.
 * It's just easier to do that from outside the store, I found.
 *
 * refSize is used to set the zoom.
 * So anything that could be zoomed should probably be related to store.refSize
 * (eg hexes, links, etc)
 *
 */

import * as rf from "../js/AQYreference"
//import * as controller from "../js/AQYcontroller"

import { defineStore } from "pinia"

import { ref, reactive, computed } from "vue"
//import * as refFuncs from '../js/TGZfuncs'
//import * as map from '../js/TGZmap'

//import { usePersonalStore } from './TGZpersonal.js'
//  const personal = usePersonalStore()

export const useModelStore = defineStore("store", () => {
	const deleteVotesData = ref({})
	const statsExcludeVotesData = ref({})
	// TEMPORARY VAR, USE TO DEBUG HOW MANY TIMES STUFF RUNS, ETC
	const counter = ref(0)

	// This var affects the ZOOM level
	// So everything that will be affected by zooming should be referenced through this
	const refSize = ref(160) // This is d, the length point to point
	// This var affects the canvas size for the map.
	// It is NOT to do with zooming, but just the size of the map.
	// Larger maps need a larger canvas!
	// AQY is a fixed size, but as you zoom in / out, the space required will change
	const canvasSize = ref(600)
	const canvasWidth = ref(600)
	const canvasHeight = ref(600)

	/************ These top vars need to be stored and saved between players / moves */
	const players = reactive([])

	const mapData = reactive({
		hexes: [], // Array of all SMALL hexes, {id, terrainType, hex, mountainType}
		seed: [], // [bigHexID, rot], etc
		grass: [], // Array of grass hexeses = [hexID, grassImg], [... etc
		pollution: [], // IDs of hexes with pollution
		explorers: [], // IDs of REMAINING explorers
		availableExplorerResources: [], // rf.RES, eg  [ 7, 7, 4, 2, 2, 3, 4, 3, 3, 2, 4, 7, 2, 4, 7, 3 ]
		mountainRangeSeedGold: [], // Holds JUST ONE hexID of a mountain range set to this type
		mountainRangeSeedStone: [], // see above
	})

	const mapNeighbours = reactive([])

	const ZOCpaths = reactive([])
	const ZOCpathsWithMultiples = reactive([])

	const ZOCoverlapData = reactive([])
	const ZOCuniqueData = reactive([])
	// This stores the mapData. I guess an object, with each entry like
	/*
  hex: [q,r,s]
  baseTerrain: rf.WOODS
  hexObjects: [rf.GRASS, rf.POLLUTION, rf.RES_WOOD, rf.MEEPLE]
  etc
  exploration markers also stored here?
  */

	//const pollution = reactive([]) // actually already stored in mapData

	// Limited buildings
	/* const remainingBuildings = reactive([
    12, //Fisheries
    16,// Cartshops
    16,//Fountains
    16,//Stores
  ])*/

	const famineLevel = ref(0) // starts on 0

	const gameflow = reactive({
		turn: 1,
		phase: 0,
		subPhase: rf.SUB_PHASE_NONE,
		action: rf.ACT_NONE,
		turnOrder: [],
		fullTurnOrder: [],
	})

	const chatData = reactive([])

	const history = reactive([])

	const ongoingVars = reactive({
		//drawnHexes: [],
	})

	const undoPoints = reactive([])

	const newlyExplorerResource = rf.RES_NONE // keep separate to ONLY affect individual player

	/*************************************** UNSAVED - TEMP VARS -- these do not need to be stored or saved */

	const context = reactive({
		/**GENERL STUFF */
		historyObj: [],

		//justUndone: false,

		/*** CITY STUFF */
		newStorageWidth: 2,
		newStorageHeight: 1,

		action: rf.ACT_NONE,

		cityBuildingToDisplay: -1,
		cityBuildingToDisplayData: [], // Not strictly required, but saves a lot of rf.BLDG_DATA[rf.BLDG_PATTERNS[store.context.cityBuildingBeingAdded][2]].width

		cityBuildingBeingAdded: -1,
		cityBuildingBeingAddedRotation: 0,
		cityBuildingBeingAddedPayment: [],

		cityIndexesToHighlightClick: [],

		gravesLeftToPlace: 0,
		gravesLeftToRemove: 0,

		buildingMoveError: 0,

		saintHouse: -1, // This denotes the paid for house - free houses must be less than this

		tradingAwayGoods: [],

		setupPlayerTrade: {
			yourResources: [],
			opponentsResources: [],
			selectedOpponent: -1,
			yourPromise: "",
			opponentsPromise: "",
		},

		saintHousesThisTurn: [], // This is a note of the saint houses (IE THE FREE ONES) you have built this turn

		discardedResources: [],
		resourcesToDiscard: 0,

		originalMovedFromCityGrave: -1,
		originalMovedFromIndexGrave: -1,

		preMoveGravesArr: [],

		relevantIncomingTrades: [],
		relevantOutgoingTrades: [],
		irrelevantTrades: [],

		// I DONT THINK THIS IS ACTUALLY USED??
		playerTrades: {},

		/*** COUNTRYSIDE STUFF */
		countryCartsLeftToUse: 0,
		countryBuildingBeingPlaced: rf.COUNTRSIDE_BLDG_NONE,
		hexesToHighlight: [],
		hexesToHighlightBlueTopLayer: [],
		goodsToBeProduced: rf.RES_NONE, // This proxies as payment for INN as well
		goodsToBeProducedUsesFreeSeed: false,
		noReset: false,
		previousStep: [],
		newCityPayment: [],
		selectedExplorerRes: rf.RES_NONE,
		pollutionLeftToPlace: 0,
		needToPlaceSecondFisheryHex: false,
		//countryBuildingBeingAddedPayment: [], REPLAACED BY goodsToBeProduced
		gameflowPhase: 0, // save to access during pre turn

		// SPECIFIC COUNTRY BUILD CALCULATIONS STORE
		countryBuildCalculation: {
			hasWood: false,
			anyWoodHexes: false,
			anyMountainHexes: false,
			anyFishermanHexes: false,
			hasSeedRes: false,
			anyPlainsHexes: false,
			hasBrewery: false,
			hasFoodRes: false,
			canAffordCity: false,
			noSpaceForCity: false,
			cachedZOCtiles: [],
		},
	})

	const zoomPanelInfo = reactive({
		hexID: -1,
		terrainType: 1, // -1 Means nothing to display. NB If forest replaced with grass, this will be set to grass
		showPollution: true,
		showExplorer: false,
		resToShow: 0,
		manColourToShow: 0, // -1 for none, otherwise this should be the CORRECTED colour of man
		innColourToShow: -1, // -1 for none, otherwise this should be the CORRECTED colour of inn
		mountainType: rf.MOUNTAIN_NONE,
		fisherySide: -1,
	})

	const permanentSettings = reactive({
		pullResToMan: false,
		keepForestUnderWoodRes: true,
		showPollutionUnderRes: false,
		housesInNumberOrder: 0,
	})

	function clearZoomPanel() {
		zoomPanelInfo.hexID = -1
		zoomPanelInfo.terrainType = -1
		zoomPanelInfo.showPollution = false
		zoomPanelInfo.showExplorer = false
		zoomPanelInfo.resToShow = -1
		zoomPanelInfo.manColourToShow = -1
		zoomPanelInfo.innColourToShow = -1
		zoomPanelInfo.mountainType = rf.MOUNTAIN_NONE
		zoomPanelInfo.fisherySide = -1
	}

	function clearVars() {
		// This shoudl ONLY be done after making the history entry
		//context.historyObj.splice(0)

		/*   newStorageWidth: 2, No need to clear these
    newStorageHeight: 1,*/
		context.action = rf.ACT_NONE

		//neighbours: [], This doesn't change; don't clear

		context.cityBuildingToDisplay = -1
		context.cityBuildingToDisplayData = []

		context.cityBuildingBeingAdded = -1
		context.cityBuildingBeingAddedRotation = 0
		context.cityBuildingBeingAddedPayment.splice(0)

		context.cityIndexesToHighlightClick.splice(0)

		/*context.originalMovedFromCityGrave = -1
		context.originalMovedFromIndexGrave = -1*/

		//context.gravesLeftToPlace = 0 // This shouldn't be reset on clear
		//context.gravesLeftToRemove = 0 // This should't be reset on clear

		//context.preMoveGravesArr.splice(0)

		context.buildingMoveError = 0

		//context.saintHouse = -1 // This shouldn't be reset on clear

		context.tradingAwayGoods.splice(0)

		context.setupPlayerTrade.yourResources.splice(0)
		context.setupPlayerTrade.opponentsResources.splice(0)
		context.setupPlayerTrade.selectedOpponent = -1
		context.setupPlayerTrade.yourPromise = ""
		context.setupPlayerTrade.opponentsPromise = ""

		//context.saintHousesThisTurn.splice(0) // This shouldn't be reset on clear
		//context.resourcesToDiscard = 0 // DONT RESET THIS

		/** COUNTRYSIDE STUFF */
		//context.countryCartsLeftToUse = 0
		context.countryBuildingBeingPlaced = rf.COUNTRSIDE_BLDG_NONE
		context.hexesToHighlight.splice(0)
		context.hexesToHighlightBlueTopLayer.splice(0)
		context.goodsToBeProduced = rf.RES_NONE
		context.goodsToBeProducedUsesFreeSeed = false
		context.noReset = false
		context.previousStep = []
		context.newCityPayment.splice(0)
		//context.pollutionLeftToPlace = 0
		context.needToPlaceSecondFisheryHex = false
		//context.selectedExplorerRes = rf.RES_NONE
		//context.countryBuildingBeingAddedPayment.splice(0)
	}

	const topMenuViews = reactive({
		showNotes: false,
		showChat: false,
		showBug: false,
		showHistory: false,
		showReserve: false,
		showLoader: false,
		showRewindPanel: false,
		performingRewind: false,
		rewindErrorText: "",
		bugErrorText: "",
		bugSuccessText: "",
		tradeSuccessText: "",
		tradeErrorText: "",
		WStradeToDisplay: [],

		showReplay: false,
		showingPlayerIndex: -1, // -1 for countryside, 0-3 for player city screens
		hubRangesToHighlight: [],
		currentGhostIndex: -1,
		generatingReplay: false,
		showStatsExcludeDropdown: false,

		showFullColourHex: 1,
		resourceIconType: 1,
		showMapObjects: true,

		buildingSVGpathHighlightNum: -1,
		strokeSelectableHighlightCity: [-1, -1, -1],

		showNoteHexIDs: false,
	})

	const historyHelpers = reactive({
		hexesToHighlightYellow: [],
		hexesToHighlightBlue: [],
		hexesToHighlightRed: [],
		hexesToOutlineRed: [],
		hexesToOutlineBlue: [],
		hexesToOutlineGreen: [],
		// Open 1 entry per player, each with 4 entries [],[],[],[]
		citySquaresToHighlight: [
			[[], [], [], []],
			[[], [], [], []],
			[[], [], [], []],
			[[], [], [], []],
		],
	})
	function clearHistoryHelpers() {
		historyHelpers.hexesToHighlightYellow.splice(0)
		historyHelpers.hexesToHighlightBlue.splice(0)
		historyHelpers.hexesToHighlightRed.splice(0)
		historyHelpers.hexesToOutlineRed.splice(0)
		historyHelpers.hexesToOutlineBlue.splice(0)
		historyHelpers.hexesToOutlineGreen.splice(0)
		for (let i = 0; i < 4; i++) {
			for (let j = 0; j < 4; j++) {
				historyHelpers.citySquaresToHighlight[i][j].splice(0)
			}
		}
		// controller.startPlayerTurn()
	}

	function clearMessages() {
		topMenuViews.rewindErrorText = ""
		topMenuViews.bugErrorText = ""
		topMenuViews.bugSuccessText = ""
		topMenuViews.tradeSuccessText = ""
		topMenuViews.tradeErrorText = ""
		topMenuViews.WStradeToDisplay.splice(0)
	}

	const sandboxMode = ref(false)

	const wholeTurnResetData = ref("")
	const prePhaseResetData = ref("")
	const sandboxResetData = ref("")
	const phaseResetData = ref("")
	const replayResetData = ref("")
	const wholeTestResetData = ref("")

	const replayData = reactive([])
	// const spinoffReplayData = reactive([])
	const replayStep = ref(0)

	const debugVars = reactive({
		//showHexImgs: false,
	})

	const currentLayout = reactive({
		/*players: 4,
		layout: [3, 2, 3],
		tiles: 8,
		tileOffsets: [
			[-9, 4],
			[0, 0],
			[9, -4],
			[4, 5],
			[-5, 9],
			[-10, 18],
			[-1, 14],
			[8, 10],
		],
		imageOffsets: [
			[-14, -5],
			[-0.5, -4.5],
			[13, -4],
			[5.5, 2.5],
			[-8, 2],
			[-15.5, 8.5],
			[-2, 9],
			[11.5, 9.5],
		],*/
	})

	/*******************END TEMP VARS */

	const computedHistory = computed(() => {
		const result = []
		let oldPhaseNumber = -1
		let currentFamineLevel = 0 // Local tracker for this calculation

		// 1. Start with the New Game entry if needed
		if (history.length === 0 || history[0][0] !== rf.HIST_NEW_GAME) {
			result.push([rf.HIST_NEW_GAME, -1, 0, []])
		}

		// 2. Process existing history
		for (const rawEntry of history) {
			// Deep clone the entry so we don't mutate the original Store data
			const entry = JSON.parse(JSON.stringify(rawEntry))
			const histAction = entry[0]
			const entry3 = entry[3]

			// Logic: Insert NEW_PHASE before FIRST_CITY
			if (oldPhaseNumber === -1 && histAction === rf.HIST_FIRST_CITY) {
				oldPhaseNumber = rf.HIST_FIRST_CITY
				result.push([rf.HIST_NEW_PHASE, -1, 0, [rf.HIST_FIRST_CITY]])
			}
			else if (oldPhaseNumber !== rf.HIST_PHASE_CITY_BUILDING && rf.HIST_CITY_ACTIONS.includes(histAction)) {
				oldPhaseNumber = rf.HIST_PHASE_CITY_BUILDING
				result.push([rf.HIST_NEW_PHASE, -1, 0, [rf.HIST_PHASE_CITY_BUILDING]])
			}
			else if (oldPhaseNumber !== rf.HIST_PHASE_NEW_TURN_ORDER && histAction === rf.HIST_NEW_TURN_ORDER) {
				oldPhaseNumber = rf.HIST_PHASE_NEW_TURN_ORDER
				result.push([rf.HIST_NEW_PHASE, -1, 0, [rf.HIST_NEW_TURN_ORDER]])
			}
			else if (oldPhaseNumber !== rf.HIST_PHASE_COUNTRYSIDE_BUILDING && rf.HIST_COUNTRY_ACTIONS.includes(histAction)) {
				oldPhaseNumber = rf.HIST_PHASE_COUNTRYSIDE_BUILDING
				result.push([rf.HIST_NEW_PHASE, -1, 0, [rf.HIST_PHASE_COUNTRYSIDE_BUILDING]])
			}
			else if (oldPhaseNumber !== rf.HIST_PHASE_GOODS_STORAGE && rf.HIST_STORAGE_ACTIONS.includes(histAction)) {
				oldPhaseNumber = rf.HIST_PHASE_GOODS_STORAGE
				result.push([rf.HIST_NEW_PHASE, -1, 0, [rf.HIST_PHASE_GOODS_STORAGE]])
			}
			else if (oldPhaseNumber !== rf.HIST_PHASE_HARVEST && rf.HIST_HARVEST_ACTIONS.includes(histAction)) {
				oldPhaseNumber = rf.HIST_PHASE_HARVEST
				result.push([rf.HIST_NEW_PHASE, -1, 0, [rf.HIST_PHASE_HARVEST]])
			}
			else if (oldPhaseNumber !== rf.HIST_PHASE_EXPLORE && rf.HIST_EXPLORE_ACTIONS.includes(histAction)) {
				oldPhaseNumber = rf.HIST_PHASE_EXPLORE
				result.push([rf.HIST_NEW_PHASE, -1, 0, [rf.HIST_PHASE_EXPLORE]])
			}
			else if (oldPhaseNumber !== rf.HIST_PHASE_FAMINE && rf.HIST_FAMINE_ACTIONS.includes(histAction)) {
				oldPhaseNumber = rf.HIST_PHASE_FAMINE
				result.push([rf.HIST_NEW_PHASE, -1, 0, [rf.HIST_PHASE_FAMINE, currentFamineLevel]])
			}
			else if (oldPhaseNumber !== rf.HIST_PHASE_POLLUTION && rf.HIST_POLLUTION_ACTIONS.includes(histAction)) {
				currentFamineLevel++
				result.push([rf.HIST_FAMINE_INCREASE, -1, 0, [currentFamineLevel]])
				oldPhaseNumber = rf.HIST_PHASE_POLLUTION
				result.push([rf.HIST_NEW_PHASE, -1, 0, [rf.HIST_PHASE_POLLUTION]])
			}


			// Logic: Famine Level tracking
			if (histAction === rf.HIST_NEW_TURN) {
				//currentFamineLevel++
				entry3.push(currentFamineLevel)
			} else if (histAction === rf.HIST_EXPLORE) {
				if (rf.RES_FOODS.includes(entry3[1])) {
					currentFamineLevel++
					entry3.push(currentFamineLevel)
				}
			}
			else if (histAction === rf.HIST_CITY_FOUNTAINS) {
				currentFamineLevel = entry3[1] // This is already stored directy, so sync up here
			}

			result.push(entry)
		}

		return result
	})

	return {
		gameflow,
		//phaseStr,
		topMenuViews,
		//currentPlayer,
		//decompressChatData,
		mapData,
		mapNeighbours,
		ZOCpaths,
		ZOCpathsWithMultiples,
		ZOCoverlapData,
		ZOCuniqueData,
		undoPoints,

		refSize,
		canvasSize,
		canvasWidth,
		canvasHeight,
		context,
		players,

		clearVars,
		clearZoomPanel,
		clearMessages,

		history,
		historyHelpers,
		clearHistoryHelpers,
		wholeTurnResetData,
		wholeTestResetData,

		replayData,
		replayStep,
		chatData,

		phaseResetData,
		ongoingVars,

		replayResetData,
		debugVars,
		famineLevel,
		sandboxResetData,
		sandboxMode,
		zoomPanelInfo,
		permanentSettings,
		counter,
		currentLayout,
		//remainingBuildings
		newlyExplorerResource,
		prePhaseResetData,
		deleteVotesData,
		statsExcludeVotesData,
		computedHistory,
	}
})
