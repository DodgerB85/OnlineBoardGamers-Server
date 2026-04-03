//import * as map from "./WEBmap"
import * as rf from "./WEBreference"
//import * as model from "./WEBmodel"
import * as controller from "./WEBcontroller"

import { useModelStore } from "../stores/WEBstore.js"
//import { usePersonalStore } from "../stores/WEBpersonal"

export function highlightSquaresToPlaceCable() {
	const store = useModelStore()
	store.context.indexesToHighlight.splice(0)
	const size = store.gridWidth * store.gridHeight
	for (let i = 0; i < size; i++) {
		if (isValidCablePlacement(i, controller.currentPlayerIndex(), store.context.selectedCableRotation === 1) === 0) {
			store.context.indexesToHighlight.push(i)
		}
	}
}

export function isValidCablePlacement(index, playerIndex, isHorizontal) {
	const store = useModelStore()
	const size = store.gridWidth * store.gridHeight
	const row = Math.floor(index / store.gridWidth)
	const col = index % store.gridWidth
	const secondIndex = isHorizontal ? index + 1 : index + store.gridWidth

	// Check bounds
	if (index < 0 || index >= size) return 1
	if (isHorizontal && col + 1 >= store.gridWidth) return 1 // Horizontal: need col+1
	if (!isHorizontal && row + 1 >= store.gridHeight) return 1 // Vertical: need row+1
	if (store.coords[index] === rf.SQ_EMPTY || store.coords[secondIndex] === rf.SQ_EMPTY) return 1 // Both squares empty
	// Check no existing cables
	if (store.cables.some((c) => c.indexes.includes(index) && c.indexes.includes(secondIndex))) return 2 // Either end of cable) // Enforces one per square

	// If either index is at a computer, there can be no other cable there
	if (rf.SQS_COMPS.includes(store.coords[index]) && store.cables.some((c) => c.indexes.includes(index))) return 3
	if (rf.SQS_COMPS.includes(store.coords[secondIndex]) && store.cables.some((c) => c.indexes.includes(secondIndex))) return 3

	// It can connect to a server
	if (store.coords[index] === rf.SQ_SERVER || store.coords[secondIndex] === rf.SQ_SERVER) return 0

	// Or it Must connect to same-player cable
	if (store.cables.some((c) => c.playerIndex === playerIndex && (c.indexes.includes(index) || c.indexes.includes(secondIndex)))) return 0

	return 4
}

export function getScore(playerIndex) {
	const store = useModelStore()
	let score = 0
	let playerCables = store.cables.filter((c) => c.playerIndex === playerIndex)
	// Well we know cables start at servers.
	// Assume one cable per computer
	// So any cables on computers is de facto connected to a server, and so will score
	for (const cable of playerCables) {
		let sq = -1
		if (rf.SQS_COMPS.includes(store.coords[cable.indexes[0]])) sq = store.coords[cable.indexes[0]]
		else if (rf.SQS_COMPS.includes(store.coords[cable.indexes[1]])) sq = store.coords[cable.indexes[1]]
		if (sq !== -1) {
			if (sq === rf.SQ_COMP_1) score += 1
			else if (sq === rf.SQ_COMP_2) score += 2
			else if (sq === rf.SQ_COMP_3) score += 3
      else if (sq === rf.SQ_COMP_4) score += 4
		}
	}

  if (store.gameflow.phase === rf.PHASE_GAME_OVER) score -= store.players[playerIndex].tileIDarrays.length

	return score
}
