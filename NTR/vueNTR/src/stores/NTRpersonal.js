import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePersonalStore = defineStore('personal', () => {
  const name = ref('')
  const preferredColour = ref(0)
  const preferredPlayerAid = ref(1)
  const preferredNTRoptions = ref([-1, 1])
  const mapName = ref('')
  const mapDescription = ref('')
  const trainingGame = ref(false)
  const showMapOnly = ref(false)
  const mapEditor = ref(false)
  const gameID = ref(0)
  const playerCount = ref(2)
  const showPlayerCountWarning = ref(false)

  return {
    name, preferredColour, preferredPlayerAid, preferredNTRoptions,
    mapName, mapDescription, trainingGame, showMapOnly, mapEditor,
    gameID, playerCount, showPlayerCountWarning,
  }
})