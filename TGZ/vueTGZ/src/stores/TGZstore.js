import { defineStore } from 'pinia'

import { ref, reactive } from 'vue'

export const useModelStore = defineStore('store', () => {
  const deleteVotesData = ref({})
  const statsExcludeVotesData = ref({})
  //const players = reactive(initialPlayersState)
  const players = reactive([])

  const refSize = ref(240)

  const mapTiles = reactive([])
  const addedResources = reactive([])
  const depletedResources = reactive([])
  const addedWater = reactive([])
  const coords = reactive([])

  const availablegods = reactive([])
  const availableSpecialists = reactive([])

  const allowMultiple_gods = ref(false)

  const gameflow = reactive({
    turn: 0,
    phase: 0,
    turnOrder: [],
    fullTurnOrder: [],
  })

  const remainingItems = reactive([
    3,// WOOD_CARVER_TILE
    3,// POTTER_TILE
    3,// IVORY_CARVER_TILE
    3,// DIAMOND_CUTTER_TILE

    3,// SCULPTOR_TILE
    3,// VESSEL_MAKER_TILE
    3,// THRONE_MAKER_TILE

    6,// WOOD_TILE
    4,// CLAY_TILE
    3,// IVORY_TILE
    3,// DIAMOND_TILE

    8,// WATER_TILE
  ])


  const chatData = reactive([])

  const history = reactive([])

  const ongoingVars = reactive({
    newTurnOrder: [],
    currentBid: 0,
    totalBids: 0,
  })

  /*************************************** UNSAVED - TEMP VARS */

  const context = reactive({
    indexesToHighlightClick: [],
    indexesToHighlightRed: [],
    indexesToHighlightGreen: [],
    action: -1,
    monumentsToPlace: 0,
    itemBeingAdded: -1,
    itemBeingAddedRotation: 0,
    range: 3,
    indexesToPipGreen: [],
    indexesToPipRed: [],
    chosenPrice: 0,
    craftsmanDataToPipGreen: [],
    craftsmanDataToPipRed: [],
    historyObj: [],
    upgradingMonumentProcess: [],
    currentRitualGood: [],
    craftsmenIndexesToHighlight: [],
    resourceIndexesToHighlight: [],
    choosingPrices: [],
    craftsmenTooExpensive: [],
    actionError: '',
    canSelectRaiseMonument: [],
    itemsInMonumentUpgrade: [],
    monumentsToShowNotEnoughCraftsmen: [],
    selectedBid: 0,
    actionsTaken: [],
    techsTaken: [],
    counter: 0,
    placingMonumentHubRangesToHighlight: [],
    oldBid: 0,
    selectedResourcesForCraftsmen: [],
    EKWENSUcowsUsed: 0,
    EKWENSUdecision: -1,
    WATERTOLLpaymentStatus: 0,
    OYAused: false,
    ignoreAjeShaluga: false
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
    bugSuccessText: '',
    showReplay: false,
    showingPlayerIndex: -1,
    hubRangesToHighlight: [],
    currentGhostIndex: -1,
    mapInspectorMode: false,
    mapInspectorEshu: false,
    generatingReplay: false,
    showStatsExcludeDropdown: false,
    replayUIlocation: 0,
    showIntroInfo: true,
  })

  function clearVars(keepActionsTaken) {
    context.indexesToHighlightClick.splice(0)
    context.indexesToHighlightRed.splice(0)
    context.indexesToHighlightGreen.splice(0)
    context.action = -1
    context.monumentsToPlace = 0
    context.itemBeingAdded = -1
    context.itemBeingAddedRotation = 0
    context.range = 3
    context.indexesToPipGreen.splice(0)
    context.indexesToPipRed.splice(0)
    context.chosenPrice = 0
    context.craftsmanDataToPipGreen.splice(0)
    context.craftsmanDataToPipRed.splice(0)
    context.historyObj.splice(0)
    context.upgradingMonumentProcess.splice(0)
    context.currentRitualGood.splice(0)
    context.craftsmenIndexesToHighlight.splice(0)
    context.resourceIndexesToHighlight.splice(0)
    context.choosingPrices.splice(0)
    context.craftsmenTooExpensive.splice(0)
    context.actionError = ''
    context.canSelectRaiseMonument.splice(0)
    context.itemsInMonumentUpgrade.splice(0)
    context.monumentsToShowNotEnoughCraftsmen.splice(0)
    context.selectedBid = 0
    if (!keepActionsTaken) {
      context.actionsTaken.splice(0)
      context.techsTaken.splice(0)
    }
    context.counter = 0
    context.oldBid = 0
    context.selectedResourcesForCraftsmen.splice(0)
    context.EKWENSUcowsUsed = 0
    context.EKWENSUdecision = -1
    //context.WATERTOLLpaymentStatus = 0
    //context.OYAused = false// not sure why this wasnt in
    context.ignoreAjeShaluga = false

    topMenuViews.rewindErrorText = ''
    topMenuViews.bugSuccessText = ''
    topMenuViews.hubRangesToHighlight.splice(0)
    topMenuViews.currentGhostIndex = -1
    topMenuViews.mapInspectorMode = false

    historyHelpers.indexesToHighlightGreen.splice(0)
  }

  const historyHelpers = reactive({
    indexesToHighlightGreen: [],

  })
  function clearHistoryHelpers() {
    historyHelpers.indexesToHighlightGreen.splice(0)

  }

  const wholeTurnResetData = ref('')
  const actionResetData = ref('')
  const lastMonumentResetData = ref('')
  const replayResetData = ref('')

  const replayData = reactive([])
  const spinoffReplayData = reactive([])
  const replayStep = ref(0)

  const statsModeData = reactive({
    statsMode: false,
    cmanIncomeArray: [],
    techIncomeArray: [],
    specsandgodsObj: {
      herd: 0,
      builder: 0,
      shaman: 0,
      rainCeremony: 0,
      nomads: 0,
      // gods
      engai: 0,
      shadipinyi: 0,
      qamata: 0,
      aja: 0,
      ovia: 0,
      ekwensu: 0,
    }
  })

  /*******************END TEMP VARS */

function resetTurnVars() {
  // Reset turn vars
	context.WATERTOLLpaymentStatus = 0
	context.OYAused = false
  context.EKWENSUcowsUsed = 0
}


  return {
    resetTurnVars,
    gameflow,
    //phaseStr,
    topMenuViews,
    //currentPlayer,
    //decompressChatData,
    mapTiles,
    coords,
    refSize,
    context,
    players,
    //addMonument,
    remainingItems,
    //addResource,
    addedResources,
    addedWater,
    //addCraftsman,
    clearVars,
    //setCraftsmanPrice,
    //addHistory,
    history,
    historyHelpers,
    clearHistoryHelpers,
    wholeTurnResetData,
    //exportModel,
    //importModel,
    replayData,
    replayStep,
    chatData,
    depletedResources,
    actionResetData,
    lastMonumentResetData,
    ongoingVars,
    availablegods,
    availableSpecialists,
    replayResetData,
    spinoffReplayData,
    statsModeData,
    deleteVotesData,
    statsExcludeVotesData,
    allowMultiple_gods
  }
})
