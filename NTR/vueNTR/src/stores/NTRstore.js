import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useModelStore = defineStore('model', () => {
  // Game metadata
  const gameID = ref(0)
  const gameName = ref('')
  const gameData = ref('')
  const turn = ref(1)
  const phase = ref(0) // 0=Allied, 1=French, 2=GameOver
  const maxPlayers = ref(2)
  const finishedGame = ref(false)
  const latestUpdate = ref(0)
  const myZoomLevel = ref(16)
  const pov = ref(-99) // -99=observer, -9=authenticated non-player, -1=admin, 0-7=player seat

  // Player data
  const players = ref([])
  const playerNames = ref([])
  const currentPlayers = ref([])
  const scenario = ref(0)
  const teamPlay = ref(false)

  // View settings
  const viewSettings = ref({
    showChat: false,
    showReplay: false,
    replayAtBottom: true,
    generatingReplay: false,
    performingRewind: false,
    showLoader: false,
  })

  // Kickout data
  const kickoutFlexiData = ref([])
  const kickoutVotesData = ref({})
  const kickoutVoteThreshold = ref(0)
  const secondsToNextKickout = ref(0)
  const kickoutRequired = ref(0)

  // Votes
  const deleteVotesData = ref({})
  const statsExcludeVotesData = ref({})

  // Chat
  const chatData = ref('')

  // Notes
  const notes = ref('')

  // Fog of War / Hidden Info
  const hiddenData = ref({}) // Server-authoritative hidden unit data
  const playerHiddenData = ref({}) // Player's view of hidden data

  // Corps assignments (for team play)
  const corpsAssignments = ref({}) // seat_order -> corps_id

  // Game board state (populated from gameData)
  const board = ref({
    locales: [],
    approaches: [],
    units: [], // All units on the board
    morale: { allied: 12, french: 12 },
    objectives: [], // Starred objective locales
    round: 1,
  })

  // Move history
  const history = ref([])
  const replayIndex = ref(-1)

  // Computed
  const isAlliedTurn = computed(() => phase.value === 0)
  const isFrenchTurn = computed(() => phase.value === 1)
  const isGameOver = computed(() => phase.value === 2 || finishedGame.value)
  const currentTurnString = computed(() => {
    if (isGameOver.value) return 'Game Over'
    return `Round ${turn.value} - ${isAlliedTurn.value ? 'Allied' : 'French'} Turn`
  })
  const myMove = computed(() => {
    if (isGameOver.value) return false
    if (pov.value < 0) return false
    // Check if current player's seat matches the active side
    const player = players.value[pov.value]
    if (!player) return false
    const isAllied = player.side === 'ALLIED'
    return (isAllied && isAlliedTurn.value) || (!isAllied && isFrenchTurn.value)
  })

  // Actions
  function setGameData(data) {
    gameData.value = data
    parseGameData(data)
  }

  function parseGameData(data) {
    if (!data) return
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      if (parsed.board) {
        board.value = { ...board.value, ...parsed.board }
      }
      if (parsed.turn !== undefined) turn.value = parsed.turn
      if (parsed.phase !== undefined) phase.value = parsed.phase
      if (parsed.morale) board.value.morale = parsed.morale
    } catch (e) {
      console.error('Failed to parse game data:', e)
    }
  }

  function setPlayers(playerList) {
    players.value = playerList
    playerNames.value = playerList.map(p => p.name || p.username)
  }

  function setCurrentPlayers(playerList) {
    currentPlayers.value = playerList
  }

  function updateTurn(newTurn, newPhase) {
    turn.value = newTurn
    phase.value = newPhase
  }

  function addHistoryEntry(entry) {
    history.value.unshift({ ...entry, timestamp: Date.now() })
    if (history.value.length > 100) history.value.pop()
  }

  function setReplayIndex(idx) {
    replayIndex.value = idx
  }

  function resetGame() {
    gameID.value = 0
    gameName.value = ''
    gameData.value = ''
    turn.value = 1
    phase.value = 0
    finishedGame.value = false
    board.value = {
      locales: [],
      approaches: [],
      units: [],
      morale: { allied: 12, french: 12 },
      objectives: [],
      round: 1,
    }
    history.value = []
    replayIndex.value = -1
  }

  return {
    // State
    gameID, gameName, gameData, turn, phase, maxPlayers, finishedGame,
    latestUpdate, myZoomLevel, pov, players, playerNames, currentPlayers,
    scenario, teamPlay, viewSettings, kickoutFlexiData, kickoutVotesData,
    kickoutVoteThreshold, secondsToNextKickout, kickoutRequired,
    deleteVotesData, statsExcludeVotesData, chatData, notes,
    hiddenData, playerHiddenData, corpsAssignments, board, history, replayIndex,
    // Computed
    isAlliedTurn, isFrenchTurn, isGameOver, currentTurnString, myMove,
    // Actions
    setGameData, parseGameData, setPlayers, setCurrentPlayers,
    updateTurn, addHistoryEntry, setReplayIndex, resetGame,
  }
})