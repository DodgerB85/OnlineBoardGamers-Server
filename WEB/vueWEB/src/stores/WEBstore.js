/**
 *
 * refSize is used to set the zoom.
 *
 * Anything on the SVG map needs to be processed throughh store.RATIO
 * in order for it to appear correctly with changing viewports / pixel width/heights
 * In reality, store.RATIO should be fixed for any given map, as the map size never changes "in" game
 *
 */

import * as rf from '../js/WEBreference'
//import * as map from '../js/WEBmap'
import * as model from '../js/WEBmodel'
//import * as cb from '../js/WEBcables'

import { usePersonalStore } from "../stores/WEBpersonal.js"


import { defineStore } from 'pinia'

import { ref, reactive, computed } from 'vue'

//import { usePersonalStore } from './RNBpersonal.js'
//  const personal = usePersonalStore()

export const useModelStore = defineStore('store', () => {
  /** Non Reactive Vars */
  var gameName = 'Game Name'
  const deleteVotesData = ref({})
  const statsExcludeVotesData = ref({})
  // This var affects the ZOOM level
  // So everything that will be affected by zooming should be referenced through this
  const refSize = ref(50) // This is the side length of a small square on the grid

  // This var affects the canvas size for the map.
  // It is NOT to do with zooming, but just the size of the map.
  // Larger maps need a larger canvas!
  const gridDimensions = reactive([6, 6])
  const gridWidth = computed(() => gridDimensions[0])
  const gridHeight = computed(() => gridDimensions[1])

  const coords = reactive(Array.from({ length: gridWidth.value * gridHeight.value }, () => rf.SQ_EMPTY))

  const mapTiles = reactive([])

  const SQUARE_PILE_1 = reactive([])
  const SQUARE_PILE_2 = reactive([])
  const RECT_PILE_1 = reactive([])
  const RECT_PILE_2 = reactive([])
  const CORNER_PILE_1 = reactive([])
  const CORNER_PILE_2 = reactive([])
  const cables = reactive([])
  /************ These top vars need to be stored and saved between players / moves */
  const players = reactive([])

  const gameflow = reactive({
    turn: 1,
    phase: rf.PHASE_WHOLE_TURN,
    turnOrder: [],
    fullTurnOrder: [],
  })
  const gameEnded = ref(false)

  const chatData = reactive([])

  const history = reactive([])

  const undoPoints = reactive([])

  /*************************************** UNSAVED - TEMP VARS -- these do not need to be stored or saved */

  const context = reactive({
    action: -1,
    selectedTileIDtoPlaceArr: [-1, -1],
    indexesToHighlight: [],
    currentGhostIndex: -99,
    remainingActions: 0,
    selectedCableRotation: 0,
  })

  function resetContext() {
    context.action = rf.ACT_NONE
    context.selectedTileIDtoPlaceArr = [-1, -1]
    context.indexesToHighlight.splice(0)
    context.currentGhostIndex = -99
    context.remainingActions = 0
    context.selectedCableRotation = 0
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
  })

  const gameMessages = reactive({
    actionError: '',
    errorText: '',
    bugErrorText: '',
    bugSuccessText: '',
    turnEndText: '', // Store text to display after an auto-action

    endTurnMessage: '', // store text to display AFTER YOU ENDED YOUR TURN
  })

  function clearMessages(keepEndTurnMessage = false) {
    gameMessages.actionError = ''
    gameMessages.errorText = ''
    gameMessages.bugErrorText = ''
    gameMessages.bugSuccessText = ''
    gameMessages.turnEndText = ''

    if (!keepEndTurnMessage) gameMessages.endTurnMessage = ''
  }

  const historyHighlights = reactive({
    indexesToHighlight: [],
    cablesToHighlgiht: [],
  })

  function clearHistoryHighlights() {
    historyHighlights.indexesToHighlight.splice(0)
    historyHighlights.cablesToHighlgiht.splice(0)
  }

  const wholeTurnResetData = ref('')
  const phaseResetData = ref('')
  const replayResetData = ref('')

  const replayData = reactive([])
  const spinoffReplayData = reactive([])
  const replayStep = ref(0)

  function clearAllHighlights() {
    context.indexesToHighlight.splice(0)
  }

  const errorPopupSetter = reactive({
    showPopup: false,
    xPos: 0,
    yPos: 0,
    htmlMessage: '',
    timer: null,
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

    // Inset the NEW_GAME
    computedHistory.unshift([rf.HIST_NEW_GAME, -1, 0, []])
    // Add End game
    if (gameflow.phase === rf.PHASE_GAME_OVER) {
      // Add the winning entry
      /*let finalIndexes = model.endGame_core()
      let finalRes = []
      for (let i=0;i<finalIndexes.length;i++) {
        finalRes.push([finalIndexes[i], cb.getScore(finalIndexes[i])])
      }
      computedHistory.push([rf.HIST_GAME_END, -1, 0, JSON.parse(JSON.stringify(finalRes))])*/
      computedHistory.push([rf.HIST_GAME_END, -1, 0, [...model.endGame_core()]])
    }

    return computedHistory
  })


  return {
    gameflow,
    viewSettings,

    refSize,
    gridDimensions,
    gridWidth,
    gridHeight,
    coords,

    context,
    players,

    resetContext,

    history,
    historyHighlights,
    clearHistoryHighlights,
    wholeTurnResetData,

    replayData,
    replayStep,
    chatData,

    phaseResetData,
    undoPoints,

    replayResetData,
    spinoffReplayData,

    gameName,
    gameMessages,
    clearMessages,

    clearAllHighlights,
    errorPopupSetter,
    mapTiles,
    SQUARE_PILE_1,
    SQUARE_PILE_2,
    RECT_PILE_1,
    RECT_PILE_2,
    CORNER_PILE_1,
    CORNER_PILE_2,
    gameEnded,
    cables,
    computedHistory,
    deleteVotesData,
    statsExcludeVotesData,
  }
})
