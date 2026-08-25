/**
 * Art & The Atelier ruleset
 *
 * An alternative way to score points. Ateliers produce works of art; exhibition
 * caravans carry them to other players' starting tiles to stage "shows".
 *
 * State:
 *  - `players[i].artShownAt`         { targetIdx: beauty } - one show per target tile per stager
 *  - `players[i].artBestShownHere`   best beauty ever shown at THIS player's starting tile
 *  Both live on the player objects, so they are persisted/serialised with the players.
 */

import { useModelStore } from "../stores/RNBstore.js"

import * as rf from "./RNBreference.js"
import * as model from "./RNBmodel.js"
import * as loc from "./RNBlocation.js"
import * as stack from "./RNBstack.js"

export function isArtEnabled() {
	return useModelStore().gameOptions.useArt
}

export function isExhibitionTransporter(transporter) {
	return transporter.type === rf.EXHIBITION_TRANSPORTER
}

export function isAtelier(building) {
	return building.type === rf.BLDG_ATELIER
}

export function isPearlFishery(building) {
	return building.type === rf.BLDG_PEARL_FISHERY
}

export function getAtelierStats() {
	return rf.BUILDING_STATS.find((b) => b.building === rf.BLDG_ATELIER)
}

// ============================================================================
// ATELIER PRODUCTION
// ============================================================================

// Returns the indices of every recipe whose inputs are fully available on the given
// transporter (or, for the donkey recipe, where the transporter itself is a donkey).
export function findFeasibleRecipeIndices(transporterID) {
	const transporterObj = model.getTransporterByID(transporterID)
	const stats = getAtelierStats()
	if (!stats || !stats.recipes) return []
	const resourcesOnTrans = model.resourcesOnTransport(transporterID).map((r) => r.type)
	const feasible = []
	for (let i = 0; i < stats.recipes.length; i++) {
		const inputs = stats.recipes[i].inputs
		let isFeasible = true
		for (const input of inputs) {
			if (input > rf.RES_UPPER_LIMIT) {
				// Transporter input (donkey): the selected transporter must be this type
				if (!transporterObj || transporterObj.type !== input) isFeasible = false
			} else {
				const needed = inputs.filter((x) => x === input).length
				const have = resourcesOnTrans.filter((x) => x === input).length
				if (have < needed) isFeasible = false
			}
		}
		if (isFeasible) feasible.push(i)
	}
	return feasible
}

// Output (resource or transporter id) for a given atelier recipe index.
export function getRecipeOutput(inputResIdx) {
	const stats = getAtelierStats()
	if (!stats || !stats.recipes || !stats.recipes[inputResIdx]) return -1
	return stats.recipes[inputResIdx].output
}

// ============================================================================
// MARBLE QUARRY
// ============================================================================

// Count a resource on a hex, including any held on transporters standing there.
function countResOnHexIncludingTransporterCargo(hexID, resType) {
	const store = useModelStore()
	let count = store.ALL_RESOURCES.filter((r) => r.type === resType && loc.isSpecificHexLocation(r.location, hexID)).length
	for (const t of model.transportersOnHex(hexID)) {
		count += model.resourcesOnTransport(t.id).filter((r) => r.type === resType).length
	}
	return count
}

// Marble rule: a quarry produces marble instead of stone when at least 3 stone sit
// on its tile and there is no marble (loose or carried) on the tile yet.
export function quarryProducesMarble(hexID) {
	if (!isArtEnabled()) return false
	return countResOnHexIncludingTransporterCargo(hexID, rf.RES_STONE) >= 3 && countResOnHexIncludingTransporterCargo(hexID, rf.RES_MARBLE) === 0
}

// ============================================================================
// CARAVAN CARGO
// ============================================================================

// Exhibition caravans may only carry artwork, and never more than 1 of each type.
export function canCaravanCarry(transporterObj, resType) {
	if (!isExhibitionTransporter(transporterObj)) return true
	if (!rf.ALL_ARTWORK_RES.includes(resType)) return false
	return !model.resourcesOnTransport(transporterObj.id).some((r) => r.type === resType)
}

// ============================================================================
// EXHIBITION STATE
// ============================================================================

function playerArtState(playerIndex) {
	const store = useModelStore()
	const p = store.players[playerIndex]
	if (!p.artShownAt) p.artShownAt = {}
	if (p.artBestShownHere === undefined) p.artBestShownHere = 0
	return p
}

export function bestShownAtTarget(targetPlayerIndex) {
	const store = useModelStore()
	const p = store.players[targetPlayerIndex]
	return p && p.artBestShownHere ? p.artBestShownHere : 0
}

export function hasShownAt(stagerPlayerIndex, targetPlayerIndex) {
	const store = useModelStore()
	const p = store.players[stagerPlayerIndex]
	return !!(p && p.artShownAt && p.artShownAt[targetPlayerIndex])
}

export function countDistinctShows(playerIndex) {
	const store = useModelStore()
	const p = store.players[playerIndex]
	if (!p || !p.artShownAt) return 0
	return Object.keys(p.artShownAt).length
}

// ============================================================================
// EXHIBITION SHOW
// ============================================================================

// Called after an exhibition caravan completes a move (live play). If the caravan
// stands on another player's starting tile and the show is valid, the caravan and
// its artwork vanish and the show is recorded.
export function checkExhibitionOnMove(transporterObj) {
	const store = useModelStore()
	if (!isArtEnabled()) return false
	if (!isExhibitionTransporter(transporterObj)) return false
	if (!rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) return false
	if (!transporterObj || loc.isOOBlocation(transporterObj.location)) return false

	const hexID = transporterObj.location[1]
	const homeMarker = model.homeMarkersOnHex(hexID).find((m) => m.ownerIndex !== transporterObj.ownerIndex)
	if (!homeMarker) return false

	const stagerPlayerIndex = transporterObj.ownerIndex
	const targetPlayerIndex = homeMarker.ownerIndex
	if (hasShownAt(stagerPlayerIndex, targetPlayerIndex)) return false

	// Beauty = number of DIFFERENT works of art carried
	const beauty = new Set(model.resourcesOnTransport(transporterObj.id).map((r) => r.type)).size
	if (beauty < 3) return false

	// Strictly more beautiful than the best show already staged at this tile (cap 5)
	const best = bestShownAtTarget(targetPlayerIndex)
	if (beauty <= best || beauty > 5) return false

	// The caravan and everything it carries vanish (artwork is discarded, not dropped)
	if (store.context.selectedTransporterIDforTM === transporterObj.id) store.context.selectedTransporterIDforTM = -1
	for (const res of model.resourcesOnTransport(transporterObj.id)) {
		res.location = loc.setOOBlocation()
	}
	transporterObj.location = loc.setOOBlocation()

	// Record the show
	playerArtState(stagerPlayerIndex).artShownAt[targetPlayerIndex] = beauty
	playerArtState(targetPlayerIndex).artBestShownHere = beauty

	stack.addItemToStack({
		action: rf.STACK_EXHIBITION,
		historyEntry: [rf.STACK_EXHIBITION, stack.getTransIDtoUse(transporterObj), stagerPlayerIndex, targetPlayerIndex, beauty],
		playerIndex: stagerPlayerIndex,
	})
	return true
}

// Re-applies a recorded STACK_EXHIBITION action (replay / rewind).
export function performExhibitionStackAction(stackAction) {
	// [STACK_EXHIBITION, caravanTransID, stagerIdx, targetIdx, beauty]
	const caravanTransID = stackAction[1]
	const stagerPlayerIndex = stackAction[2]
	const targetPlayerIndex = stackAction[3]
	const beauty = stackAction[4]
	const transObj = model.getTransporterByID(caravanTransID)
	if (transObj) {
		for (const res of model.resourcesOnTransport(transObj.id)) {
			res.location = loc.setOOBlocation()
		}
		transObj.location = loc.setOOBlocation()
	}
	playerArtState(stagerPlayerIndex).artShownAt[targetPlayerIndex] = beauty
	playerArtState(targetPlayerIndex).artBestShownHere = beauty
}

// ============================================================================
// END GAME SCORING
// ============================================================================

// Each artwork carried by a player scores 20 points, multiplied by
// (1 + number of distinct starting tiles where they staged a show).
export function scoreArtwork(playerIndex) {
	if (!isArtEnabled()) return 0
	const store = useModelStore()
	const myTransporterIDs = model.getTransportersByPlayerIndex(playerIndex).map((t) => t.id)
	const artworkCount = model.getAllInGameResources().filter((r) => rf.ALL_ARTWORK_RES.includes(r.type) && loc.isOnSelectedTransporterIDs(r.location, myTransporterIDs)).length
	if (artworkCount === 0) return 0
	const multiplier = 1 + countDistinctShows(playerIndex)
	return artworkCount * 20 * multiplier
}