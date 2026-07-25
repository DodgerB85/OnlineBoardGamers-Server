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

import * as rf from "../js/INDreference"
import * as view from "../js/INDview"
//import * as map from '../js/TGZmap'

import { defineStore } from "pinia"

import { ref, reactive, computed } from "vue"
//import * as refFuncs from '../js/TGZfuncs'
//import * as map from '../js/TGZmap'

import { usePersonalStore } from "./INDpersonal.js"

export const useModelStore = defineStore("store", () => {
	const deleteVotesData = ref({})
	const statsExcludeVotesData = ref({})
	const preMovesCompressed =  ref("")
	const cityColourScheme = ref(0)
	// This var affects the ZOOM level
	// So everything that will be affected by zooming should be referenced through this
	const refSize = ref(1000)
	const resRefSize = ref(1)
	const historyOnly = ref(false)
	//const areaZoom = ref(0)

	// This var affects the canvas size for the map.
	// It is NOT to do with zooming, but just the size of the map.
	// Larger maps need a larger canvas!
	/*const canvasSize = ref(600)
	const canvasWidth = ref(600)
	const canvasHeight = ref(600)*/

	// This does not need to be saved - recreated every time
	const mapData = {
		selectedMap: rf.MAP_OM_HEXES,
		allNeighbours: [],
		landNeighbours: [],
		seaNeighbours: [],
		selectedMapData: [],
	}

	/************ These top vars need to be stored and saved between players / moves */
	const players = reactive([])

	const cities = reactive([])

	const gameflow = reactive({
		turn: 1,
		phase: 0,
		turnOrder: [],
		fullTurnOrder: [],
		currentEra: rf.ERA_A,
	})

	const chatData = reactive([])

	const history = reactive([])

	const availableCompanies = reactive([])

	const activeCompanies = reactive([])

	const ongoingVars = reactive({
		newTurnOrderBids: [],
		/** THIS IS JUST FOR MERGER BIDS */
		selectedMergerInfo: [],
		passedPlayerIndexes: [],
		bidTurnOrder: [],
		currentBid: 0,
		currentBidderIndex: -1,
		siapFajiOrShippingTerrsToRemoveData: [],
		preBidData: [],

		// These are actually not saved
		nominalValue: 0,
		bidIncrement: 0,
	})

	function resetOngoingVars(keepTurnOrders = false) {
		ongoingVars.selectedMergerInfo.splice(0)
		ongoingVars.currentBid = 0
		ongoingVars.currentBidderIndex = -1
		ongoingVars.bidIncrement = 0
		ongoingVars.nominalValue = 0

		ongoingVars.preBidData.splice(0)

		ongoingVars.siapFajiOrShippingTerrsToRemoveData.splice(0)

		ongoingVars.newTurnOrderBids.splice(0)

		if (!keepTurnOrders) {
			ongoingVars.passedPlayerIndexes.splice(0)
			ongoingVars.bidTurnOrder.splice(0)
		}
	}

	/*************************************** UNSAVED - TEMP VARS -- these do not need to be stored or saved */

	const hiddenMoney = ref(false)
	// PHP options
	const useMergerSubsidy = ref(false)
	const useShippingSubsidy = ref(false)
	const useShipRedeployment = ref(false)

	const options = reactive({
		iconsToUse: 1, // 1 = 1e, 2 = 2e
		shipIconsToUse: 0, // 0 = simple, 1 = fancy
		playerTableStyle: 0, // 0 = icons, 1 = text
	})

	const context = reactive({
		action: -1,

		territoriesToHighlight: [],
		territoriesToHighlightBlue: [],
		territoriesToHighlightGreen: [],
		territoriesToHighlightRed: [],
		prodMarkerTerritoriesToHighlight: [],
		citiesToHighlight: [],
		citiesToHighlightRed: [],
		shipMarkersToHighlight: [],
		shipMarkersToHighlightRed: [],
		shipMarkersToHighlightBlue: [],
		shipMarkersToPulse: [],
		shipMarkerImagesToHighlight: [],
		shipMarkerImageToHighlightGreen: [],
		showShippingArray: [],
		// [prod marker terr, ship_company_owner, ship_company_id chip_terr, ship_ter ship_ter..... city_terr]
		currentGoodJourney: [],
		currentMouseoverJourneyCompletion: [],
		justResearched: [],
		maxPossData: [],
		mergerStatusArray: [],
		selectDropdownRND: -1,
		maxPoss: 0,
		unfavouredPlayerIndexes: [],

		selectedEraCard: -1,
		selectedCompanyToAcquire: -1,
		selectedSlotToOperate: -1,
		remainingExpansions: -1,
		canChangeOperatingCompany: true, // NOT IN RESET
		selectedMergerBid: 0,
		selectedMergerPreBid: -1,
		acquiredCompany: false, // NOT IN RESET
		siapFajiTerrsToRemove: 0,
		shippingTerrsToRedeploy: [],
		citySize1GrowsRemaining: 0,
		citySize2GrowsRemaining: 0,
		//selectedMergerPreIsFinalBid: true, // MOVED To the buttons

		selectedReserveEraCard: -1,

		historyObj: [],
	})

	// This is a store of computed properties.
	// EG company display needs to be calclulated only every now and again,
	// and the display is different to the storage.
	// Ok, actually it's kinda the same - store.activeCompanies
	// But maybe filters could be applied to this, eg by player, by type, etc. which saves altering the data order.
	const displayData = reactive({
		companyData: [],
		sortByType: true,
		sortByOwner: false,

		//shipMarkers: [],

		//RNDdisplay: [],
	})

	const gameMessages = reactive({
		actionError: "",
		rewindErrorText: "",
		bugErrorText: "",
		bugSuccessText: "",
		successText: "",
		errorText: "",
	})

	function clearMessages() {
		gameMessages.actionError = ""
		gameMessages.rewindErrorText = ""
		gameMessages.bugErrorText = ""
		gameMessages.bugSuccessText = ""
		gameMessages.successText = ""
		gameMessages.errorText = ""
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
		showFutureBoardState: 0,

		showReplay: false,
		showingPlayerIndex: -1,
		currentGhostIndex: -1,
		mapInspectorMode: false,
		generatingReplay: false,
		showStatsExcludeDropdown: false,
		showWholeTable: false,
		showIntroInfo: true,
		selectingBoard: false,
		performingMapChange: false,
		minimalPlayerTable: false,
		showTerrOutline: true,

		showShipText: true,
	})

	function removeAllActiveHighlights() {
		context.territoriesToHighlight.splice(0)
		context.territoriesToHighlightBlue.splice(0)
		context.territoriesToHighlightGreen.splice(0)
		context.territoriesToHighlightRed.splice(0)
		context.prodMarkerTerritoriesToHighlight.splice(0)
		context.citiesToHighlight.splice(0)
		context.citiesToHighlightRed.splice(0)
		context.shipMarkersToHighlight.splice(0)
		context.shipMarkersToHighlightRed.splice(0)
		context.shipMarkersToHighlightBlue.splice(0)
		context.shipMarkersToPulse.splice(0)
		context.showShippingArray.splice(0)
	}

	function stopFlashingGoodsJourney() {
		historyHelpers.histCitiesToHighlight.splice(0)
		context.showShippingArray.splice(0)
	}

	function clearVars() {
		context.action = rf.ACT_NONE
		context.territoriesToHighlight.splice(0)
		context.territoriesToHighlightBlue.splice(0)
		context.territoriesToHighlightGreen.splice(0)
		context.territoriesToHighlightRed.splice(0)
		context.showShippingArray.splice(0)
		context.selectedEraCard = -1
		context.selectedCompanyToAcquire = -1
		context.selectedSlotToOperate = -1
		context.currentGoodJourney.splice(0)
		context.currentMouseoverJourneyCompletion.splice(0)
		context.justResearched.splice(0)
		context.maxPossData.splice(0)
		context.selectDropdownRND = -1
		context.maxPoss = 0
		context.mergerStatusArray.splice(0)

		context.prodMarkerTerritoriesToHighlight.splice(0)
		context.shipMarkersToHighlight.splice(0)
		context.shipMarkersToHighlightRed.splice(0)
		context.shipMarkersToHighlightBlue.splice(0)
		context.shipMarkersToPulse.splice(0)
		context.citiesToHighlight.splice(0)
		context.citiesToHighlightRed.splice(0)
		context.selectedMergerBid = 0
		context.selectedMergerPreBid = -1
		context.siapFajiTerrsToRemove = 0
		context.shippingTerrsToRedeploy.splice(0)
		context.citySize1GrowsRemaining = 0
		context.citySize2GrowsRemaining = 0
		//context.selectedMergerPreIsFinalBid = true
		//context.acquiredCompany = false

		context.selectedReserveEraCard = -1

		context.historyObj.splice(0)
	}

	function clearTurnVars() {
		context.canChangeOperatingCompany = true
		context.acquiredCompany = false
		context.unfavouredPlayerIndexes.splice(0)
	}

	const historyHelpers = reactive({
		histTerritoriesToHighlight: [],
		histTerritoriesToHighlightBlue: [],
		histTerritoriesToHighlightRed: [],
		histRNDmarkersToHighlight: [],
		histShipMarkersToHighlight: [],
		histCitiesToHighlight: [],
		histCitiesToHighlightBlue: [],
		prodMarkersInSameCompany: [],
		shipMarkersInSameCompany: [],
	})
	function clearHistoryHelpers() {
		historyHelpers.histTerritoriesToHighlight.splice(0)
		historyHelpers.histTerritoriesToHighlightBlue.splice(0)
		historyHelpers.histTerritoriesToHighlightRed.splice(0)
		historyHelpers.histRNDmarkersToHighlight.splice(0)
		historyHelpers.histShipMarkersToHighlight.splice(0)
		historyHelpers.histCitiesToHighlight.splice(0)
		historyHelpers.histCitiesToHighlightBlue.splice(0)
		historyHelpers.prodMarkersInSameCompany.splice(0)
		historyHelpers.shipMarkersInSameCompany.splice(0)
	}

	const wholeTurnResetData = ref("")
	const goodJourneyResetData = ref("")
	const replayResetData = ref("")

	const replayData = reactive([])
	const spinoffReplayData = reactive([])
	const replayStep = ref(0)

	const debugVars = reactive({
		clickedTerrPath: "",
		clickedTerrID: -1,
		allNeighbours: [],
		landNeighbours: [],
		seaNeighbours: [],
	})

	const actualGameState = reactive({
		phase: -1,
		finishedGame: false,
		era: -1,
	})

	/*******************END TEMP VARS */
	const computedHistory = computed(() => {
		const personal = usePersonalStore()
		let computedHistory = []
		let timestamp = personal.gameCreationTimestamp
		for (let i = 0; i < history.length; i++) {
			// If we are on city growth, add a player income summary BEFORE adding city growth
			if (rf.HIST_CITY_GROWTH_ENTRIES.includes(history[i][0])) {
				let playerIncomes = []
				for (let j = 0; j < players.length; j++) playerIncomes.push(0)
				let currentIndex = i - 1
				while (rf.HIST_OPERATIONS_ENTRIES.includes(history[currentIndex][0]) || rf.ENTRIES_TO_IGNORE.includes(history[currentIndex][0]) || history[currentIndex][0] === rf.HIST_REMOVE_COMPANY_NO_TERRS) {
					// If it's a land company that shipped, update the incomes
					if (history[currentIndex][0] === rf.HIST_OPERATE_LAND && history[currentIndex][3].length > 2) {
						let incomeData = view.getTotalIncomeArray(history[currentIndex], false, i)
						for (let j = 0; j < incomeData.length; j++) playerIncomes[incomeData[j][0]] += (incomeData[j][1] + incomeData[j][2])
					}
					currentIndex--
				}

				computedHistory.push([rf.HIST_OPERATION_INCOME_SUMMARY, -1, timestamp, [...playerIncomes], i])
			}
			timestamp += history[i][2]
			computedHistory.push([history[i][0], history[i][1], timestamp, history[i][3], i])
		}
		return computedHistory
	})

	return {
		gameflow,
		//phaseStr,
		topMenuViews,
		//currentPlayer,
		//decompressChatData,

		refSize,

		context,
		players,

		clearVars,

		history,
		computedHistory,
		historyHelpers,
		clearHistoryHelpers,
		wholeTurnResetData,

		replayData,
		replayStep,
		chatData,

		goodJourneyResetData,
		ongoingVars,

		debugVars,
		mapData,

		resRefSize,
		cities,
		availableCompanies,
		activeCompanies,
		displayData,
		resetOngoingVars,
		clearTurnVars,
		removeAllActiveHighlights,
		gameMessages,
		clearMessages,
		hiddenMoney,
		useMergerSubsidy,
		useShippingSubsidy,
		useShipRedeployment,
		replayResetData,
		cityColourScheme,
		options,
		stopFlashingGoodsJourney,
		deleteVotesData,
		statsExcludeVotesData,
		preMovesCompressed,
		historyOnly,
		spinoffReplayData,
		actualGameState
	}
})
