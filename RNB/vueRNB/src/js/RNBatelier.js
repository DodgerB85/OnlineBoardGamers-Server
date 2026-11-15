/**
 * Art & The Atelier ruleset
 *
 * An alternative way to score points. Ateliers produce works of art; exhibition
 * caravans carry them to other players' starting tiles to stage "shows".
 *
 * State:
 *  - `players[i].artShownAt`         { targetIdx: beauty } - one show per target tile per stager
 *  Show records live on the player objects and are persisted with the players.
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

// Returns the indices of every recipe whose inputs the given transporter can reach (carried
// or on its tile, like other secondary producers), or, for the donkey recipe, where the transporter is a donkey.
export function findFeasibleRecipeIndices(transporterID) {
	const transporterObj = model.getTransporterByID(transporterID)
	const stats = getAtelierStats()
	if (!transporterObj) return []
	if (!stats || !stats.recipes) return []
	const resourcesOnTrans = loc.getAllResourcesAccessibleToTransporter(transporterID, true).map((r) => r.type)
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
	return p
}

export function bestShownAtTarget(targetPlayerIndex) {
	const store = useModelStore()
	return Math.max(0, ...store.players.map((player) => player.artShownAt?.[targetPlayerIndex] || 0))
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
// stands on another player's starting tile, it and its artwork vanish; valid shows score.
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

	const beauty = performExhibitionStackAction([rf.STACK_EXHIBITION, transporterObj.id, stagerPlayerIndex, targetPlayerIndex, 0])

	stack.addItemToStack({
		action: rf.STACK_EXHIBITION,
		historyEntry: [rf.STACK_EXHIBITION, stack.getTransIDtoUse(transporterObj), stagerPlayerIndex, targetPlayerIndex, beauty],
		playerIndex: stagerPlayerIndex,
	})
	return true
}

// Every show staged at targetPlayerIndex's starting tile, as [stagerPlayerIndex, beauty].
export function showsAtTarget(targetPlayerIndex) {
	const store = useModelStore()
	return store.players.map((p, i) => [i, p.artShownAt?.[targetPlayerIndex] || 0]).filter(([, beauty]) => beauty > 0)
}

// Live play: let the arrival animation finish before the caravan vanishes. The show
// itself is unchanged; flushPendingExhibition() runs it early if the turn ends first.
let pendingShow = null
export function scheduleExhibitionAfterAnimation(transporterObj, onShown) {
	flushPendingExhibition()
	const ms = (transporterObj.animationWaypoints || []).reduce((sum, w) => sum + (w[2] || 0), 0)
	const transporterID = transporterObj.id
	const run = () => {
		pendingShow = null
		// Look the caravan up again: an undo in the meantime replaces the objects
		const fresh = model.getTransporterByID(transporterID)
		if (fresh && checkExhibitionOnMove(fresh)) onShown()
	}
	pendingShow = { run, timer: setTimeout(run, ms + 100) }
}

export function cancelPendingExhibition() {
	if (!pendingShow) return
	clearTimeout(pendingShow.timer)
	pendingShow = null
}

export function flushPendingExhibition() {
	if (!pendingShow) return
	clearTimeout(pendingShow.timer)
	pendingShow.run()
}

// Applies a recorded STACK_EXHIBITION action (live, replay / rewind). The caravan always
// vanishes on arrival; the show value is recomputed here so a pre-set action applied after
// another player's better show in the same phase is a no-show instead of a failed stack.
export function performExhibitionStackAction(stackAction) {
	// [STACK_EXHIBITION, caravanTransID, stagerIdx, targetIdx, beauty]
	const caravanTransID = stackAction[1]
	const stagerPlayerIndex = stackAction[2]
	const targetPlayerIndex = stackAction[3]
	const transObj = model.getTransporterByID(caravanTransID)
	let beauty = 0
	if (transObj) {
		const store = useModelStore()
		const actualBeauty = new Set(model.resourcesOnTransport(transObj.id).map((r) => r.type)).size
		const isShow =
			isArtEnabled() &&
			!hasShownAt(stagerPlayerIndex, targetPlayerIndex) &&
			actualBeauty >= 3 &&
			actualBeauty <= 5 &&
			actualBeauty > bestShownAtTarget(targetPlayerIndex)
		beauty = isShow ? actualBeauty : 0
		stackAction[4] = beauty
		if (store.context.selectedTransporterIDforTM === transObj.id) store.context.selectedTransporterIDforTM = -1
		for (const goose of model.resourcesFollowingTransporter(transObj.id)) goose.location = [...loc.convertLocationToBucket(transObj.location)]
		for (const res of model.resourcesOnTransport(transObj.id)) {
			res.location = loc.setOOBlocation()
		}
		transObj.location = loc.setOOBlocation()
	}
	if (beauty > 0) playerArtState(stagerPlayerIndex).artShownAt[targetPlayerIndex] = beauty
	return beauty
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