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

import * as rf from "../js/KFWreference"
//import * as map from '../js/TGZmap'

import { usePersonalStore } from "./KFWpersonal.js"

import { defineStore } from "pinia"

import { ref, reactive, computed } from "vue"
//import * as refFuncs from '../js/TGZfuncs'
//import * as map from '../js/TGZmap'

//import { usePersonalStore } from './TGZpersonal.js'
//  const personal = usePersonalStore()

export const useModelStore = defineStore("store", () => {
	// This var affects the ZOOM level
	// So everything that will be affected by zooming should be referenced through this
	const refSize = ref(1000)

	// This var affects the canvas size for the map.
	// It is NOT to do with zooming, but just the size of the map.
	// Larger maps need a larger canvas!

	/************ These top vars need to be stored and saved between players / moves */
	const players = reactive([])

	// Gamwe vars
	const availableGreenMeeples = ref(20)
	// There are 6 cabins in the game, and at most 6 are used
	//const availableCabins = ref(6)
	const availableResources = reactive([24, 24, 24, 48]) // Wood / Stone / Iron / Gold
	const hiddenContracts = reactive([]) // .id's only
	const visibleContracts = reactive([])
	//const availableExtensions = reactive([[0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17]])
	const availableExtensions = reactive([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17])

	// Tiles in the game
	const availableTiles = reactive([]) // season tiles to bid on
	const availableTurnOrderTiles = reactive([])
	const availableBoatTiles = reactive([]) // Full ono tiles (need to fill them with items)

	// Server Data
	const availableMeeples = reactive([0, 0, 0, 0])
	const availableSkills = reactive([0, 0, 0])
	const availableMeeplesCount = ref(120)
	const availableSkillsCount = ref(48)
	// game flags
	const useMerchantsExpansion = ref(false)
	const promoTileIDsToInclude = reactive([])
	const hiddenInformationKnowledge = ref(5) // default to 9, max hidden

	const gameflow = reactive({
		turn: 0,
		phase: 0,
		turnOrder: [],
		fullTurnOrder: [],
		season: rf.SPRING,
		passedPlayerIndexes: [],
	})

	const chatData = reactive([])

	const kickoutVotesData = ref({})
	const kickoutVoteThreshold = ref(1)

	const history = reactive([])

	const ongoingVars = reactive({
		selectedWinterTileIDs: [],
	})

	function resetOngoingVars() {}

	/*************************************** UNSAVED - TEMP VARS -- these do not need to be stored or saved */
	const turnStartHighlights = reactive({
		bidAreas: [],
		actionAreas: [],
	})

	const popupSetter = reactive({
		showPopup: false,
		//popupData: {
		xPos: -1,
		yPos: -1,
		tile_id: -1,
		upgraded: 0,
		//popupObjectData: [],
		//},
	})

	const meeplePopupSetter = reactive({
		showPopup: false,
		outbidMeepleInfo: [],
		xPos: -1,
		yPos: -1,
	})

	const context = reactive({
		action: rf.ACT_NONE,
		action2: rf.ACT_NONE,
		historyObj: [],
		coreMeepleColour: rf.MEEPLE_NONE,
		selectedTile: { id: -1 },
		selectedTileArea: rf.TILE_AREA_NONE,
		minMeeplesRequired: 0,
		arrayCreatedToHoldActionMeepels: false,
		remainingMoves: 0,
		remainingUpgrades: 0,
		remainingContracts: 0,
		selectedWinterTileIDs: [],
		currentItemSet: [],
		remainingItemSet: [],
		coreSkillType: rf.SKILL_NONE,
		coreResType: rf.RES_NONE,
		villageDistanceHighlightData: [],
		meeplesRemoved: [],
		currentlyScoringContract_id: -1,
		stopBoat4b: false,
		selectedExtension: -1,
		seaBastionScoringRoute: [],
		deliveryManScoringRoute: [],
		pendingBoat7Aresources: [],
		resourceDepositTileID: -1,
		sorcererRange: 0,
		boatChainWarnings: [],
		preFinalActions: [],
		tileIDsForPreFinalAction: [],
		newBoatTileIDs: [],
		meepleActionFound: false,
		boat4bEligible: false,
		finalPositions: [], // Only set at game over - never need to reset
		hideContractFromBoatCollection: false,

		// itemsRequired
		itemsRequired: {
			meeplesReq: [],
			skillsReq: [],
			resReq: [],
			resTile_id: -1,
		},
		// itemsChosen
		itemsChosen: {
			meeplesChosen: [],
			skillsChosen: [],
			resChosen: [],
			resTile_id: -1,
		},

		// For expanding village
		newTileGhostData: {
			selectedIndexInpendingVillageTiles: 0,
			id: -1,
			rotation: 0,
			gfx: "",
			newSides: [],
			upgraded: 0,
		},

		// Highlights
		/*villageTilesToHighlight: [],
		villageTilesToHighlightYellow: [],
		villageTilesToHighlightGreen: [],*/

		// persist
		endTurnActions: [],
		localEndTurnActions: [],
		newVillageTile_ids: [],
	})

	function clearContext() {
		context.action = rf.ACT_NONE
		context.action2 = rf.ACT_NONE
		context.historyObj.splice(0)
		context.coreMeepleColour = rf.MEEPLE_NONE
		context.selectedTile = { id: -1 }
		context.selectedTileArea = rf.TILE_AREA_NONE
		context.minMeeplesRequired = 1
		context.arrayCreatedToHoldActionMeepels = false
		context.remainingMoves = 0
		context.remainingUpgrades = 0
		context.remainingContracts = 0
		context.selectedWinterTileIDs.splice(0)
		context.currentItemSet.splice(0)
		context.remainingItemSet.splice(0)
		context.coreSkillType = rf.SKILL_NONE
		context.coreResType = rf.RES_NONE
		context.villageDistanceHighlightData.splice(0)
		context.meeplesRemoved.splice(0)
		context.currentlyScoringContract_id = -1
		context.stopBoat4b = false
		context.selectedExtension = -1
		context.seaBastionScoringRoute.splice(0)
		context.deliveryManScoringRoute.splice(0)
		context.pendingBoat7Aresources.splice(0)
		context.resourceDepositTileID = -1
		context.sorcererRange = 0
		context.boatChainWarnings.splice(0)
		context.preFinalActions.splice(0)
		context.tileIDsForPreFinalAction.splice(0)
		context.newBoatTileIDs.splice(0)
		context.meepleActionFound = false
		context.boat4bEligible = false
		context.hideContractFromBoatCollection = false

		// itemsRequired
		context.itemsRequired.meeplesReq.splice(0)
		context.itemsRequired.skillsReq.splice(0)
		context.itemsRequired.resReq.splice(0)
		context.itemsRequired.resTile_id = -1
		// itemsChosen
		context.itemsChosen.meeplesChosen.splice(0)
		context.itemsChosen.skillsChosen.splice(0)
		context.itemsChosen.resChosen.splice(0)
		context.itemsChosen.resTile_id = -1

		// newTileGhostData
		context.newTileGhostData.selectedIndexInpendingVillageTiles = 0
		context.newTileGhostData.id = -1
		context.newTileGhostData.rotation = 0
		context.newTileGhostData.gfx = ""
		context.newTileGhostData.newSides.splice(0)
		context.newTileGhostData.upgraded = 0

		// persist
		//context.endTurnActions.splice(0)
		context.newVillageTile_ids.splice(0)
	}

	const gameMessages = reactive({
		actionError: "",
		errorText: "",
		bugErrorText: "",
		bugSuccessText: "",
		turnEndText: "", // Store text to display after an auto-action

		endTurnMessage: "", // store text to display AFTER YOU ENDED YOUR TURN
	})

	function clearMessages(keepEndTurnMessage = false) {
		gameMessages.actionError = ""
		gameMessages.errorText = ""
		gameMessages.bugErrorText = ""
		gameMessages.bugSuccessText = ""
		gameMessages.turnEndText = ""

		if (!keepEndTurnMessage) gameMessages.endTurnMessage = ""
	}

	const viewSettings = reactive({
		showNotes: false,
		showChat: false,
		showBug: false,
		showHistory: false,
		showReserve: false,
		showLoader: false,
		showRewindPanel: false,
		performingRewind: false,

		showReplay: false,

		showIntroInfo: true,
		showFullExtensions: false,
	})

	function removeAllActiveHighlights() {
		/*context.villageTilesToHighlight.splice(0)
		context.villageTilesToHighlightYellow.splice(0)
		context.villageTilesToHighlightGreen.splice(0)*/
	}

	const historyHelpers = reactive({
		histTerritoriesToHighlight: [],
	})

	function clearHistoryHelpers() {
		historyHelpers.histTerritoriesToHighlight.splice(0)
	}

	const wholeTurnResetData = ref("")
	const replayResetData = ref("")

	const replayData = reactive([])
	const replayStep = ref(0)

	const undoPoints = reactive([])

	/*******************END TEMP VARS */

	const computedHistory = computed(() => {
		const personal = usePersonalStore()
		let computedHistory = JSON.parse(JSON.stringify(history))

		let timestamp = personal.gameCreationTimestamp
		for (let i = 0; i < computedHistory.length; i++) {
			timestamp += computedHistory[i][2]
			//computedHistory.push([history[i][0], history[i][1], timestamp, history[i][3]])
			computedHistory[i][2] = timestamp
		}

		// THIS MUST BE DONE FIRST. DO NOT ALTER THE LENGTH, OTHERWISE HIDDEN INFO WILL MISMATCH
		if (gameflow.phase !== rf.PHASE_GAME_OVER) {
			// Now add in player hidden histories
			if (personal.trainingGame || personal.adminDataInspection) {
				for (let i = 0; i < players.length; i++) {
					for (let j = 0; j < players[i].hiddenHistory.length; j++) {
						let hiddenEntry = players[i].hiddenHistory[j]
						let entry3 = computedHistory[hiddenEntry[0]][3]
						if (computedHistory[hiddenEntry[0]][0] === rf.HIST_COLLECT_BOAT1A_RANDOM_MEEPLES) {
							entry3[0] = hiddenEntry[1][0]
							entry3[1] = hiddenEntry[1][1]
						}
						// Handle BOOKKEEPER_B
						else if (entry3[0] === rf.TILE_M_SUMMER_BOOKKEEPER_B) {
							entry3[2][2] = hiddenEntry[1][2]
						} else entry3[entry3.length - 1] = [...hiddenEntry[1]]
					}
				}
			} else if (personal.pov >= 0) {
				for (let j = 0; j < players[personal.pov].hiddenHistory.length; j++) {
					let hiddenEntry = players[personal.pov].hiddenHistory[j]
					let entry3 = computedHistory[hiddenEntry[0]][3]
					if (computedHistory[hiddenEntry[0]][0] === rf.HIST_COLLECT_BOAT1A_RANDOM_MEEPLES) {
						entry3[0] = hiddenEntry[1][0]
						entry3[1] = hiddenEntry[1][1]
					}
					// Handle BOOKKEEPER_B
					else if (entry3[0] === rf.TILE_M_SUMMER_BOOKKEEPER_B) {
						entry3[2][2] = hiddenEntry[1][2]
					} else {
						entry3[entry3.length - 1] = [...hiddenEntry[1]]
					}
				}
			}

			// Now crop history for info level 5, to thelast 2 entries involving you
			if (hiddenInformationKnowledge.value === 5) {
				if (personal.pov < 0) {
					computedHistory = computedHistory.slice(-2)
				} else if (personal.pov >= 0) {
					let firstIndex = computedHistory.length - 1
					let playerFoundTimes = 0
					for (let i = computedHistory.length - 1; i >= 0; i--) {
						if (computedHistory[i][1] === personal.pov) playerFoundTimes++
						if (playerFoundTimes === 2) {
							firstIndex = i
							break
						}
					}
					computedHistory = computedHistory.slice(firstIndex)
				}
			}
		}

		// Inset the NEW_GAME
		computedHistory.unshift([rf.HIST_NEW_GAME, -1, 0, []])
		if (gameflow.phase === rf.PHASE_GAME_OVER) {
			// Add the winning entry
			computedHistory.push([rf.HIST_GAME_END, -1, 0, []])
		}

		return computedHistory
	})

	return {
		gameflow,
		//phaseStr,
		viewSettings,
		//currentPlayer,
		//decompressChatData,
		useMerchantsExpansion,
		promoTileIDsToInclude,

		refSize,

		context,
		players,

		availableGreenMeeples,
		//availableCabins,
		availableResources,
		hiddenContracts,
		visibleContracts,

		availableTiles,
		availableTurnOrderTiles,
		availableBoatTiles,
		availableExtensions,

		clearContext,

		history,
		computedHistory,
		historyHelpers,
		clearHistoryHelpers,
		wholeTurnResetData,

		replayData,
		replayStep,
		chatData,

		kickoutVotesData,
		kickoutVoteThreshold,

		ongoingVars,

		resetOngoingVars,
		removeAllActiveHighlights,
		gameMessages,
		clearMessages,
		replayResetData,
		undoPoints,
		popupSetter,
		meeplePopupSetter,
		availableMeeples,
		availableSkills,
		availableMeeplesCount,
		availableSkillsCount,
		hiddenInformationKnowledge,
		turnStartHighlights,
	}
})
