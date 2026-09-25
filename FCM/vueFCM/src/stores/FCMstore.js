/**
 *
 * refSize is used to set the zoom.
 *
 * Anything on the SVG map needs to be processed throughh store.RATIO
 * in order for it to appear correctly with changing viewports / pixel width/heights
 * In reality, store.RATIO should be fixed for any given map, as the map size never changes "in" game
 *
 */

import * as rf from "../js/FCMreference"

import { defineStore } from "pinia"

import { ref, reactive, computed } from "vue"

export const useModelStore = defineStore("store", () => {
	/** Non Reactive Vars */
	var gameName = "Game Name"

	// rwIndexes
	const externalStartingOptions = reactive([])
	const startingOptionsHTML = ref("")

	// NB - MAY need to make this reactive
	const startingOptions = {
		useMilestones: true,
		shortGame: false,
		noCeoMilestone: false,
		noRadioMilestone: false,
		allowSurrender: true,
		hardChoices: false,
		fryChefs: false,
		kimchi: false,
		sushi: false,
		noodles: false,
		gourmet: false,
		movieStars: false,
		massMarketers: false,
		nightShift: false,
		ruralMarketers: false,

		newDistricts: false,
		newDistrictsPark: false,
		newDistrictsAll: false,
		newDistrictsApp: false,

		coffee: false,
		ketchupMilestone: false,
		newMilestones: false,
		lobbyists: false,

		strictPaydayFridge: false,
		trainingGame: false,
		sandboxMode: false,
		draftModules: false,
		reservePrice: false,

		// Chinese Expansion
		urbanPlanning: false,
		urbanPlanningPlus: false,
		jazzMusicians: false,
		dumplings: false,
		deliveryDrivers: false,
		hawkers: false,
	}

	// This var affects the ZOOM level
	// So everything that will be affected by zooming should be referenced through this
	const refSize = ref(200) // default 200

	const deleteVotesData = ref({})
	const statsExcludeVotesData = ref({})
	const kickoutVotesData = ref({})
	const kickoutVoteThreshold = ref(1)

	// Settings flags

	/************ These top vars need to be stored and saved between players / moves */
	const players = reactive([])

	const mapData = reactive({
		tiles: [],
		displayTiles: [],
		coords: [],
		dimensions: [17, 16],
		startingMap: [],
	})

	const gameflow = reactive({
		turn: 1,
		phase: rf.PHASE_SETUP_RESTAURANT1,
		subphase: rf.SUBPHASE_HIRING,
		turnOrder: [],
		fullTurnOrder: [],
		newTurnOrder: [],
	})

	const chatData = reactive([])

	const history = reactive([])



	// Saved Vars
	/** STORED VARS - IE THESE MUST BE EXPORT / IMPORTED */
	// available stuff
	const availableEmployees = reactive([])
	const availableMilestones = reactive([])
	const availableMarketingCampaigns = reactive([])
	// set stuff
	const ceoLevel = ref(3)
	const bank = ref(0)
	const bankBroken = ref(0)
	const reserveCards = reactive([])
	const coffeeShopMSplayers = reactive([])
	const firstPizzas = reactive([])
	const campaigns = reactive([])
	const gardens = reactive([])
	const houses = reactive([])
	const needs = reactive([])
	const freeways = reactive([])
	const parks = reactive([])
	const newRoads = reactive([])

	/*************************************** UNSAVED - TEMP VARS -- these do not need to be stored or saved */

	const context = reactive({
		action: rf.ACT_NONE,
		selectedReserveCard: rf.RES_CARD_NONE,
		selectedEmployeeIndexForRestructuring: -1,
		justHired: [],
		selectedEmployeeToTrainData: {
			employee: -1,
			origin: 0, // 0 = beach, 1 = hire, 2 = structure
		},
		justTrained: [],
		justMarketed: [],
		remainingProducers: [],
		justProduced: {
			team: [],
			added: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		},
		justBuilt: [],
		justLobbied: [],
		justOpened: [],
		justFired: [],
		justBinned: [],

		isNewRestoMSmailbox: false,
		alreadyDoneMailboxMS: false,
		newRestaurantIndex: -1,
		secondCampaignManager: false,
		massMarketersOnly: -1,

		campaign: -1, // Pass to view, applies to any marketing
		double: false,
		campaigns: [], // Capaigns to choose from after selecting marketeer
		good: rf.BURGER,
		rotated: false,
		duration: 1,
		secondGood: -1,
		selectedBuildingManager: -1,
		newRestaurantAction: "", // "" = choose manager, "create" = placing, "move" = choosing one to move
		newLobbyistTile: -1,
		lobbyistMilestoneActive: false,
		nextUrbanPlanningTile: -1,
		rotation: 0, // This is used for many objects rotation
		freewaySidesFalse: [], // Possible freeway positions with sides=false (top/bottom)
		freewaySidesTrue: [], // Possible freeway positions with sides=true (left/right)
		freewayHighlightSets: null, // Precomputed highlight sets for both freeway orientations
		removedRestoIndex: -1,
		chosenResCard: -1,

		// Coffee
		justCoffeeShopped: [],
		baristaCoffeeShops: 0,
		leadBaristaCoffeeShopsFromB: 0,
		leadBaristaCoffeeShopsFromTB: 0,
		coffeeShopAction: "", // "place" = placing a new shop, "remove" = selecting a placed shop to move it
		coffeeShopMSAction: "", // Same modes for the First Coffee Sold milestone phase

		// New stuff
		restaurantMilestone: false,
		noMoreRestaurants: false,
		nightShift: false,
		nightShiftCampaign: false,
		from: -1,
		range: 0,
		path: [],
		collectionNumber: 0, // Number of drinks collected per station
		indexes: [],
		edges: [],
		producer: -1,
		hawkerRouteActive: false,
		showingHawkerRoute: -1,
		selectedModuleIndex: 0,
		marketer: -1,
		refusePlaneDouble: false,
		firstCampaignDuration: 1,
		firstCampaignCampaign: 11,
		selectedBuilding: -1,
		house: 1,
		houseIndex: -1, // Board index of the house being given a garden
		variety: 1,
		flipped: false,
		buildingType: 0, // 0 = road, 1 = park (lobbyist subphase)
		parkModel: [],
		brandManagerMS: false,
		componentBeingAdded: -1,
		EODradioSelections: [0, 0],
		preMoveData: [[[-9], []], [-9]],
		savedEODpreset: null,
		endOfDaySummaryData: {
			hire: {
				total: 0,
				hired: [],
				salaryReductions: 0,
			},
			train: {
				total: 0,
				trained: [],
				unused: 0,
			},
			market: {
				total: 0,
				marketed: [],
				unused: [],
			},
			produce: {
				total: 0,
				produced: [0, 0, 0, 0, 0, 0, 0, 0, 0],
				unused: [],
			},
			houses: {
				total: 0,
				built: [],
			},
			lobby: {
				total: 0,
				built: [],
			},
			managers: {
				total: 0,
				built: [],
			},
		},

		// Replay
		highlightHistorySquares: [],
	})

	const highlights = reactive({
		indexesToHighlightYellow: [],
		indexesToHighlightPath: [],
		indexesToHighlightPreview: [],
		indexesToHighlightDrinks: [],
		indexesToHighlightHouses: [],
		tilesToHighlight: [],
		tilesToHighlightPreview: [],
	})

	const viewSettings = reactive({
		showingPlayerIndex: -1,
		showNotes: false,
		showChat: false,
		showBug: false,
		showHistory: false,
		showInfo: false,
		showGameLoader: false,
		showRewindPanel: false,
		performingRewind: false,
		alreadyRewinding: false,
		rewindPanelType: 0,
		rewindHostPossible: false,
		rewindHostHTML: "",

		generatingReplay: false,
		showReplay: false,
		replayAtBottom: false,

		showIntroInfo: true,

		assistance: true,

		currentGhostIndex: -1,
		showCoffeeHistoryInfo: false, // Coffee "More Information" panel in the action area
		coffeeInfoShownBlock: -1, // Which coffee history block opened the panel
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
		indexesToHighlightYellow: [],
		coffeeRouteSquaresToHighlight: [],
	})

	function clearHistoryHelpers() {
		historyHelpers.indexesToHighlightYellow.splice(0)
		historyHelpers.coffeeRouteSquaresToHighlight.splice(0)
	}

	// Hide the coffee "More Information" panel + its board highlight
	function clearCoffeeHistoryInfo() {
		if (viewSettings.showCoffeeHistoryInfo) historyHelpers.coffeeRouteSquaresToHighlight = []
		viewSettings.showCoffeeHistoryInfo = false
		viewSettings.coffeeInfoShownBlock = -1
	}

	const wholeTurnResetData = ref("")
	const subphaseResetData = ref("")
	const subphaseSnapshots = reactive({})
	const replayResetData = ref("")

	const replayData = reactive([])
	const replayStep = reactive({})

	/*******************END TEMP VARS */
	const computedHistory = computed(() => {
		let result = []
		let turnAtEntry = 0
		for (const entry of history) {
			if (entry[0] === rf.HIST_NEW_TURN) {
				turnAtEntry++
				// clearForNewTurn runs during cleanup when turn is still (turnAtEntry - 1)
				const prevTurn = turnAtEntry - 1
			const hcRemoved = []
			if (startingOptions.hardChoices) {
				if (prevTurn === 2) hcRemoved.push(...rf.HC_OLD_MS_LEAVE_END_TURN_2)
				if (prevTurn === 3) hcRemoved.push(...rf.HC_OLD_MS_LEAVE_END_TURN_3)
			} else if (startingOptions.newMilestones && prevTurn === 2) {
				hcRemoved.push(...rf.HC_NEW_MS_LEAVE_END_TURN_2)
			}
				if (hcRemoved.length > 0) {
					result.push([rf.HIST_REMOVE_HC_MS, hcRemoved, -1, 0])
				}
			}
			result.push(entry)
		}
		return result
	})

	return {
		gameflow,
		viewSettings,

		refSize,
		context,
		players,

		history,
		historyHelpers,
		clearHistoryHelpers,
		clearCoffeeHistoryInfo,
		wholeTurnResetData,
		replayData,
		replayStep,
		chatData,

		subphaseResetData,
		subphaseSnapshots,

		replayResetData,
		mapData,
		gameName,
		gameMessages,
		clearMessages,
		computedHistory,
		deleteVotesData,
		statsExcludeVotesData,
		kickoutVotesData,
		kickoutVoteThreshold,
		startingOptions,
		coffeeShopMSplayers,
		firstPizzas,
		campaigns,
		gardens,
		houses,
		needs,
		freeways,
		parks,
		newRoads,
		reserveCards,
		bank,
		bankBroken,
		availableEmployees,
		availableMarketingCampaigns,
		availableMilestones,
		externalStartingOptions,
		startingOptionsHTML,
		ceoLevel,
		highlights
	}
})
