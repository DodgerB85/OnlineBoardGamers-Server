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

import * as rf from '../js/CNSreference'

import { defineStore } from 'pinia'

import { ref, reactive } from 'vue'

export const useModelStore = defineStore('store', () => {
  const deleteVotesData = ref({})
  const statsExcludeVotesData = ref({})
  const kickoutVotesData = ref({})
  const kickoutVoteThreshold = ref(1)
  // This var affects the ZOOM level
  // So everything that will be affected by zooming should be referenced through this
  const refSize = ref(2400)
  // This var affects the canvas size for the map.
  // It is NOT to do with zooming, but just the size of the map.
  // Larger maps need a larger canvas!
  const canvasSize = ref(600)
  const canvasWidth = ref(600)
  const canvasHeight = ref(600)

  // Limit the size of the play area
  const tableJunk = reactive([])
  const tableUp = ref(0) // Increments of 1.
  const tableDown = ref(0)  // Each 1 is 1 more row up/down from (not including) Cannes (technically ~2/3 of a hex)
  const tableLeft = ref(0) // Increments of 0.5. Each 1 is 1 hex L/R of Cannes
  const tableRight = ref(0) // Increments of 0.5. Each 0.5 is a tile U/D L/R of Cannes
  // Need to add 0.5 to get off CannesL tile
  const tableBulk = ref(200)

  /************ These top vars need to be stored and saved between players / moves */
  const players = reactive([])

  const hexes = reactive([])

  const oldBoysNetwork = reactive([]) // cigars on the map

  const hexDrawPile = reactive([])
  const hexDiscardPile = reactive([])
  const moviePrices = reactive([13, 13, 13]) // 3 movie types

  const useExpansion = ref(false)
  const pirateShipRef = ref(-1)

  const gameflow = reactive({
    turn: 1,
    phase: 0,
    turnOrder: [],
    fullTurnOrder: []
  })

  const chatData = reactive([])

  const history = reactive([])

  const ongoingVars = reactive({
    drawnHexes: [],
  })

  /*************************************** UNSAVED - TEMP VARS -- these do not need to be stored or saved */

  const context = reactive({
    action: -1,
    hexBeingPlaced: null,
    placeableTiles: [],
    placeableLinks: [],
    removableLinks: [],
    neighbours: [],
    tileBeingPlaced: -1,
    hexRefBeingAdded: -1,
    hexBeingAddedRotation: 0,
    availableResources: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    availableProduction: [],
    sellingSummary: [0, 0, 0],
    realEstateAgentsInNetwork: 0,
    linksPlacedThisTurn: 0,
    historyObj: [],
    hexActionsUsed: 0,
    pirateActionsUsed: 0,
    partyPointsToHighlight: [],
    partyMouseOver: -1,
    startingTurnAfterPirates: false,
    // NOT IN RESET YET
    /*resourceHexesCollected: [], /* You collect resources as soon as they come into your network.
    If you connet to more old boys networks, you immediately get those resources (see example
      in last page of manual). So the issue of avoid here is people removing a network line
      from a resource tile, and then putting it back in the same place. If the resource hexes
       aren’t tracked, the game might give you the resources you reconnected to AGAIN.
       Which I don’t think is the intent. So by storing this in context it will prevent
       this situation from happening. */
       
    partyZones: [],
  })

  const topMenuViews = reactive({
    showNotes: false,
    showChat: false,
    showBug: false,
    showHistory: false,
    showReserve: false,
    showLoader: false,
    showRewindPanel: false,
    performingRewind: false,
    rewindErrorText: '',
    errorText: '',
    successText: '',
    bugErrorText: '',
    bugSuccessText: '',
    showReplay: false,
    showingPlayerIndex: -1,
    hubRangesToHighlight: [],
    currentGhostIndex: -1,
    mapInspectorMode: false,
    mapInspectorEshu: false,
    generatingReplay: false,
    replaySeedIndex: 0,
    showStatsExcludeDropdown: false,
    showWholeTable: false,
  })

  function resetContext(keepNeighbours) {
    context.action = rf.ACT_NONE
    context.hexBeingPlaced = null
    context.placeableTiles.splice(0)
    context.placeableLinks.splice(0)
    context.removableLinks.splice(0)
    if (!keepNeighbours) context.neighbours.splice(0)
    context.tileBeingPlaced = -1
    context.hexRefBeingAdded = -1
    context.hexBeingAddedRotation = 0
    for (let i = 0; i < context.availableResources.length; i++) context.availableResources[i] = 0
    context.availableProduction.splice(0)
    for (let i = 0; i < context.sellingSummary.length; i++) context.sellingSummary[i] = 0
    context.realEstateAgentsInNetwork = 0
    context.linksPlacedThisTurn = 0
    context.historyObj.splice(0)
    context.hexActionsUsed = 0
    context.pirateActionsUsed = 0
    context.partyPointsToHighlight.splice(0)
    context.partyMouseOver = -1
    context.startingTurnAfterPirates = false

    topMenuViews.rewindErrorText = ''
    topMenuViews.errorText = ''
    topMenuViews.successText = ''

  }

  const historyHelpers = reactive({
    hexesToHighlight: [],
    linksToHighlight: [],
    linksToHighlightRed: [],
    linksToHighlightGreen: [],
  })
  function clearHistoryHelpers() {
    historyHelpers.hexesToHighlight.splice(0)
    historyHelpers.linksToHighlight.splice(0)
    historyHelpers.linksToHighlightRed.splice(0)
    historyHelpers.linksToHighlightGreen.splice(0)
  }

  const wholeTurnResetData = ref('')
  const networkPhaseResetData = ref('')
  const phaseResetData = ref('')
  const replayResetData = ref('')
  const pirateResetData = ref('')

  const replayData = reactive([])
  const spinoffReplayData = reactive([])
  const replayStep = ref(0)

  const debugVars = reactive({
    showHexImgs: false,
  })

  /*******************END TEMP VARS */

  return {
    gameflow,
    topMenuViews,
    hexes,
    oldBoysNetwork,
    hexDrawPile,
    hexDiscardPile,
    moviePrices,

    refSize,
    canvasSize,
    canvasWidth,
    canvasHeight,
    context,
    players,

    resetContext,

    history,
    historyHelpers,
    clearHistoryHelpers,
    wholeTurnResetData,

    replayData,
    replayStep,
    chatData,

    phaseResetData,
    ongoingVars,

    replayResetData,
    spinoffReplayData,
    debugVars,
    useExpansion,
    tableUp,
    tableDown,
    tableLeft,
    tableRight,
    tableBulk,
    tableJunk,
    pirateShipRef,
    pirateResetData,
    networkPhaseResetData,
    deleteVotesData,
    statsExcludeVotesData,
    kickoutVotesData,
    kickoutVoteThreshold,
  }
})
