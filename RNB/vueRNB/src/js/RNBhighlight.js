/**
AVAILABLE FUNCTIONS
===================
updateAllHighlightsForTransporterMode()
highlightEligibleResourcesForTransporterPickup(transporterID)
highlightEligibleTransportersForTransporterDrop(transporterID)
highlightEligibleItemsForTransporterDrop(transporterID)
highlightEligibleHexAreasForTransporterMove(transporterID)
setupOptionsToDropHexDuringTM(resID, carriedTransporterID, hexID)
highlightEligibleTransportersForTransporterPickup(transporterID)
**/

import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"

import * as rf from "./RNBreference.js"
import * as util from "./RNButil"
import * as model from "./RNBmodel"
import * as build from "./RNBbuild"
import * as map from "./RNBmap"
import * as loc from "./RNBlocation.js"
import * as graph from "./RNBgraph.js"
import * as controller from "./RNBcontroller"
import * as context from "./RNBcontext"
import * as produce from "./RNBproduce"
import * as wonder from "./RNBwonder"
import * as stack from "./RNBstack"

export function deselectTransporter() {
	const store = useModelStore()
	store.context.selectedTransporterIDforTM = -1
	context.resetContextAndHighlights()
	store.context.action = rf.ACT_TM_SELECT_TRANSPORTER
	updateAllHighlightsForTransporterMode()

	const svgElement = document.querySelector("#hexSVG") // Target your main SVG
	if (svgElement) {
		// Method A: The Style Toggle (Most common)
		svgElement.style.display = "none"
		svgElement.offsetHeight // This "touch" triggers the reflow
		svgElement.style.display = ""

		// Method B: The Hardware Acceleration Nudge
		// This is often more "silent" and less flickery than a display toggle
		svgElement.style.transform = "translateZ(1px)"
		requestAnimationFrame(() => {
			svgElement.style.transform = "translateZ(0)"
		})
	}
}

export function higlightTilesForStartTile() {
	const store = useModelStore()
	let possibilities = []

	// 1. Access HM directly from the object
	if (store.mapData.setupData.HM) {
		const homeMarkerArray = store.mapData.setupData.HM

		// 2. Loop through and process
		homeMarkerArray.forEach((marker) => {
			possibilities.push(stack.decompressLocation(marker))
		})

		// Now remove all hexID's that already have a home marker
		possibilities = possibilities.filter((entry) => !store.ALL_HOME_MARKERS.some((hm) => hm.location[1] === entry[1]))
	}

	// If you have pre-set options, just highlight those
	if (possibilities.length > 0) {
		context.setHexPiecesToHighlight(possibilities.map((p) => [p[1], [p[2]]]))
		return
	}
	// Otherwise, get forbidden hexIDs
	let forbiddenHexIDs = store.ALL_HOME_MARKERS.map((hm) => hm.location[1])
	// Add the neighbouring hexIDs
	let neighbours = []
	for (let i = 0; i < forbiddenHexIDs.length; i++) neighbours = neighbours.concat(store.mapData.neighbours[forbiddenHexIDs[i]])
	forbiddenHexIDs = [...new Set([...forbiddenHexIDs, ...neighbours])]
	// Add the void tiles
	const voidHexIDs = store.mapData.hexData.filter((hex) => hex.baseTerrain === rf.TERR_VOID).map((hex) => hex.hexID)
	forbiddenHexIDs = [...new Set([...forbiddenHexIDs, ...voidHexIDs])]

	// highlight everything not forbidden
	for (let i = 0; i < store.mapData.hexData.length; i++) {
		const hexObj = store.mapData.hexData[i]
		if (forbiddenHexIDs.includes(hexObj.hexID)) continue
		if (hexObj.baseTerrain === rf.TERR_SEA) continue
		for (const bucketId of util.uniqueOnly(hexObj.bucketIdsCurrent)) {
			context.addHexPieceToHighlight([hexObj.hexID, model.hexCurrentBucketToInitial(hexObj.hexID, bucketId)])
		}
	}
	// If you have valid options, highlight those
	if (store.context.hexPiecesToHighlight.length > 0) return

	store.gameMessages.actionError = "No valid start tile found - allowing anywhere"
	for (let i = 0; i < store.mapData.hexData.length; i++) {
		const hex = store.mapData.hexData[i]
		for (const bucketId of util.uniqueOnly(hex.bucketIdsCurrent)) {
			context.addHexPieceToHighlight([store.mapData.hexData[i].hexID, model.hexCurrentBucketToInitial(store.mapData.hexData[i].hexID, bucketId)])
		}
	}
}

export function updateAllHighlightsForTransporterMode() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!personal.canPlay()) return

	// If you have illegal geese, return
	if (store.context.errorUnableToDropGeeseAtSea === true) {
		context.resetContextAndHighlights()
		return
	}

	// If in production, and selecting logs/trunks for input, only allow that
	if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase) && store.context.action === rf.ACT_SELECT_INPUT_RESOURCES_FOR_SEC_PRODUCTION) {
		context.clearAllHighlights()
		return
	}

	// Do this here rather than in startPlayerTurn -- startPlayerTurn sends you here, but so does update during stack move
	if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase) && store.context.possibleDonkeyReproductionData.length === 0) {
		// Find all possible donkey repros
		store.context.possibleDonkeyReproductionData = produce.findAllDonkeyReproductionHexIDpossibilities(controller.currentPlayerIndex())
		store.context.researchHexIDpossibilities = produce.findAllResearchHexIDpossibilities(controller.currentPlayerIndex())
	}

	// Do this here rather than in startPlayerTurn -- startPlayerTurn sends you here, but so does update during stack move
	if (rf.PHASE_WONDERS.includes(store.gameflow.phase) && store.context.resIDsOnHomeTile.length === 0) {
		// If there is no transport on your home tile, you cannot do anything
		// LOOK AT THIS FUNCTION ISNTEAD // highlightEligibleSecondaryBuildingsForManualProduction
		const currentHomeTileLocation = model.getPlayersHomeMarkerLocation(controller.currentPlayerIndex())
		const homeMarkerHexID = currentHomeTileLocation[1]
		store.mapData.zoomData.hexID = homeMarkerHexID
		const homeTransporters = model.getTransportersByPlayerIndexAndHexID(controller.currentPlayerIndex(), homeMarkerHexID)
		if (homeTransporters.length === 0) {
			store.context.wonderError = 1
		}
		// If there are no errors, check there are ENOUGH goods
		if (store.context.wonderError === 0) {
			let resIDsOnHomeTile = [] //model.resourcesOnHex(homeMarkerHexID).map((r) => r.id)
			for (let i = 0; i < homeTransporters.length; i++) {
				const reachableResIDs = loc.getAllResourcesAccessibleToTransporter(homeTransporters[i].id, true).map((r) => r.id)
				resIDsOnHomeTile = resIDsOnHomeTile.concat(reachableResIDs)
				// Now uniq it
				resIDsOnHomeTile = [...new Set(resIDsOnHomeTile)]
			}
			if (resIDsOnHomeTile.length < wonder.requiredResourcesForWonderBrick(controller.currentPlayerIndex())) store.context.wonderError = 2
			else store.context.resIDsOnHomeTile = [...resIDsOnHomeTile]
			// Highlight transporters for TM
			store.context.action = rf.ACT_TM_SELECT_TRANSPORTER
		}
	}

	// Highlight all transporters for selection, if none is selected
	if (store.context.selectedTransporterIDforTM === -1) {
		store.context.transporterIDsToHighlight.splice(0)
		const playerTransportersOnMapIds = model
			.getAllInGameTransporters()
			.filter((transporter) => model.transporterIsOnMap(transporter) && transporter.ownerIndex === controller.currentPlayerIndex())
			.map((a) => a.id)
		if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase) || rf.PHASE_BUILDINGS.includes(store.gameflow.phase) || rf.PHASE_WONDERS.includes(store.gameflow.phase)) {
			context.setTransportersToHighlight(playerTransportersOnMapIds)
		}
		// During production, a transport carrying a transporter can never do stuff
		else if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) {
			// You cannot drop a trans, so you can't do anything with it. NB you also CANNOT interact with any buildings
			context.setTransportersToHighlight(playerTransportersOnMapIds.filter((id) => !model.transporterCarriesTransporter(id)))
			// Also during production, highlgiht ALL secs you have access to
			highlightEligibleSecondaryBuildingsForManualProduction(-1, false, controller.currentPlayerIndex())
			store.context.researchHexIDpossibilities = produce.findAllResearchHexIDpossibilities(controller.currentPlayerIndex())
		}
		return
	}

	// If it is BEING carried, then it doesn't have access to anything
	const transporterID = store.context.selectedTransporterIDforTM
	const transporterObj = model.getTransporterByID(transporterID)
	if (loc.isOnAnyTransporter(transporterObj.location)) return

	// SO NOW YOU HAVE SELECTRED A TRANSPORTER and store.context.selectedTransporterIDforTM is set
	if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) {
		context.resetContextAndHighlights()
		store.context.action = rf.ACT_TM_SELECT_PICKUP_DROP_MOVE
		store.context.selectedTransporterIDforTM = transporterID

		// You can produce with SECONDARIES if you so wish
		highlightEligibleSecondaryBuildingsForManualProduction(store.context.selectedTransporterIDforTM, false, controller.currentPlayerIndex())

		// You can load other transporters
		highlightEligibleTransportersForTransporterPickup(store.context.selectedTransporterIDforTM)
		// You can load res
		highlightEligibleResourcesForTransporterPickup(store.context.selectedTransporterIDforTM)
		// You can drop res
		highlightEligibleItemsForTransporterDrop(store.context.selectedTransporterIDforTM)
		// You can "steal" resources from other transporters you own
		highlightEligibleResourcesOnOtherTransporters(store.context.selectedTransporterIDforTM)
		// Update researh options
		store.context.researchHexIDpossibilities = produce.findAllResearchHexIDpossibilities(controller.currentPlayerIndex())

		return
	}
	if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) {
		context.resetContextAndHighlights()

		store.context.action = rf.ACT_TM_SELECT_PICKUP_DROP_MOVE

		store.context.selectedTransporterIDforTM = transporterID

		// You can load other transporters
		highlightEligibleTransportersForTransporterPickup(store.context.selectedTransporterIDforTM)
		// You can load res
		highlightEligibleResourcesForTransporterPickup(store.context.selectedTransporterIDforTM)
		// You can drop res
		highlightEligibleItemsForTransporterDrop(store.context.selectedTransporterIDforTM)
		// You can "steal" resources from other transporters you own
		highlightEligibleResourcesOnOtherTransporters(store.context.selectedTransporterIDforTM)
		// You can move
		highlightEligibleHexAreasForTransporterMove(store.context.selectedTransporterIDforTM)
		// You can drop transporters
		highlightEligibleTransportersForTransporterDrop(store.context.selectedTransporterIDforTM)
		return
	}
	// Update highlights for building mode
	if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) {
		context.resetContextAndHighlights()
		store.context.action = rf.ACT_TM_BUILD_SELECT_BRIDGE_ROAD_WALL_BUILDING_RES_PICKUP_DROP
		store.context.selectedTransporterIDforTM = transporterID

		// You can load other transporters
		highlightEligibleTransportersForTransporterPickup(store.context.selectedTransporterIDforTM)
		// You can load res
		highlightEligibleResourcesForTransporterPickup(store.context.selectedTransporterIDforTM)
		// You can drop res
		highlightEligibleItemsForTransporterDrop(store.context.selectedTransporterIDforTM)
		// You can "steal" resources from other transporters you own
		highlightEligibleResourcesOnOtherTransporters(store.context.selectedTransporterIDforTM)
		// You can build stuff
		build.setEligibleItemsToBuild(controller.currentPlayerIndex(), store.context.selectedTransporterIDforTM)
		return
	}
	// Update highlights for wonder mode
	if (rf.PHASE_WONDERS.includes(store.gameflow.phase)) {
		context.resetContextAndHighlights()
		store.context.action = rf.ACT_TM_SELECT_PICKUP_DROP_MOVE
		store.context.selectedTransporterIDforTM = transporterID

		// You can load other transporters
		highlightEligibleTransportersForTransporterPickup(store.context.selectedTransporterIDforTM)
		// You can load res
		highlightEligibleResourcesForTransporterPickup(store.context.selectedTransporterIDforTM)
		// You can drop res
		highlightEligibleItemsForTransporterDrop(store.context.selectedTransporterIDforTM)
		// You can "steal" resources from other transporters you own
		highlightEligibleResourcesOnOtherTransporters(store.context.selectedTransporterIDforTM)
		return
	}
}

export function highlightEligibleResourcesForTransporterPickup(transporterID) {
	const store = useModelStore()

	let resources = loc.getAllResourcesAccessibleToTransporter(transporterID, false)

	for (const res of resources) {
		// Only alter it if it has not already been set to eligible for pickup, maybe by another transporter
		if (!store.context.resourceIDsToHighlight.includes(res.id)) context.addResourceToHighlight(res.id)
	}
}

export function uniqueRiversFromVertexLocations(locations) {
	function riverVertexToRiver(loc) {
		const hex = model.getHexByID(loc[1])
		// unsure how loc at the end is used, but oh well
		return [loc[1], hex.riverVertexRiverIds[loc[2]], loc]
	}
	function riverComp(a, b) {
		if (a[0] == b[0]) {
			return a[1] - b[1]
		}
		return a[0] - b[0]
	}
	const rivers = locations.map(riverVertexToRiver).sort(riverComp)
	let uniqueRivers = []
	if (rivers.length > 0) {
		uniqueRivers.push(rivers[0])
		for (let k = 1; k < rivers.length; k++) {
			const locA = uniqueRivers[uniqueRivers.length - 1]
			const locB = rivers[k]
			if (locA[0] != locB[0] || locA[1] != locB[1]) {
				uniqueRivers.push(rivers[k])
			}
		}
	}
	return uniqueRivers
}

export function highlightLocations(locations) {
	let buckets = model.getVertexBucketsFromLocations(locations)
	let rivers = uniqueRiversFromVertexLocations(locations.filter((loc) => loc[0] === rf.LOCATION_RIVER_VERTEX))
	let riverBuckets = locations.filter((inputLoc) => loc.isRiverBucketLocation(inputLoc))
	riverBuckets = util.makeUniqueSubarrays(riverBuckets)

	const uniqueRiverBuckets = riverBuckets.map((entry) => [entry[1], entry[2], [rf.LOCATION_RIVER_VERTEX, entry[1], loc.getRiverVertexForNewTransporterFromHexIDandBucketID(entry[1], entry[2])]]).filter((newEntry) => !rivers.some((existing) => existing[0] === newEntry[0] && existing[1] === newEntry[1]))
	rivers = rivers.concat(uniqueRiverBuckets)

	let shores = locations.filter((loc) => loc[0] === rf.LOCATION_DOCKED && loc[3] === rf.BANK_NONE).map((loc) => [loc[1], loc[2], loc])
	function toHalfShore(loc) {
		let hexId = loc[1]
		let side = loc[2]
		let bank = loc[3]
		let vertex = bank === rf.BANK_LEFT ? side : (side + 1) % 6
		return [hexId, [vertex, side], loc]
	}
	let halfShores = locations.filter((loc) => loc[0] === rf.LOCATION_DOCKED && loc[3] !== rf.BANK_NONE).map(toHalfShore)

	// Include land bucket locations not already covered by vertex locations
	let landBuckets = locations.filter((inputLoc) => loc.isBucketLocation(inputLoc))
	landBuckets = util.makeUniqueSubarrays(landBuckets)
	landBuckets = landBuckets.map((entry) => [entry[1], entry[2], [rf.LOCATION_LAND_VERTEX, entry[1], loc.getLandVertexForNewTransporterFromHexIDandBucketID(entry[1], entry[2])]])
	const uniqueLandBuckets = landBuckets.filter((newEntry) => !buckets.some((existing) => existing[0] === newEntry[0] && existing[1] === newEntry[1]))
	buckets = buckets.concat(uniqueLandBuckets)

	context.setHexPieceToHighlightUnderTransporters(buckets.map(model.withInitialBuckets))
	context.setRiversToHighlight(rivers)
	context.setShoresToHighlight(shores)
	context.setHalfShoresToHighlight(halfShores)
}

export function highlightEligibleTransportersForTransporterDrop(transporterID) {
	const carriedTransporters = model.transportersOnTransporter(transporterID)
	if (carriedTransporters.length === 0) return
	// So now your transport is carrying a transport
	let carriedTransporterObj = carriedTransporters[0]
	let transporterOntransportID = carriedTransporterObj.id
	let carryingTransporterObj = model.getTransporterByID(transporterID)
	const location = carryingTransporterObj.location
	const transporterStats = rf.getTransporterStats(carryingTransporterObj.type)
	const carriedStats = rf.getTransporterStats(carriedTransporterObj.type)
	if (carryingTransporterObj.remainingMoves === transporterStats.maxMoves) {
		const reachable = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(location, false)
		const validLocations = reachable.filter((loc) => carriedStats.validDrop.includes(loc[0]))
		if (validLocations.length > 0) {
			context.addTransporterToHighlight(transporterOntransportID)
		}
	}
}

export function highlightEligibleItemsForTransporterDrop(transporterID) {
	const store = useModelStore()
	let transporterObj = model.getTransporterByID(transporterID)
	// You cannot drop at sea UNLESS there is an oil rig
	if (loc.isSeaVertexLocation(transporterObj.location)) {
		if (!map.hasOilRigOnHexID(transporterObj.location[1])) return
	}
	let resources = model.resourcesOnTransport(transporterObj.id)
	let followerResources = model.resourcesFollowingTransporter(transporterID)

	for (const resId of resources.concat(followerResources).map((a) => a.id)) {
		if (!store.context.resourceIDsToHighlight.includes(resId)) context.addResourceToHighlight(resId)
	}
}

export function highlightEligibleHexAreasForTransporterMove(transporterID) {
	const store = useModelStore()

	let transporterObj = model.getTransporterByID(transporterID)
	// Make sure there are moves remaining
	if (transporterObj.remainingMoves <= 0) return 1
	// Check if the transporter is eligible to move.
	// Find resources, and see if any are linked to anotheer transporterID
	if (model.doesTransporterHaveAlreadyMovedResource(transporterID)) return 2
	// Find trans on trans. If that one has moved, then you can't move
	if (model.transportersOnTransporter(transporterID).length > 0 && model.transportersOnTransporter(transporterID)[0].movedThisTurn) return 3

	const stats = rf.getTransporterStats(transporterObj.type)
	const movementGraph = graph.createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, controller.currentPlayerIndex())
	const pathfind = graph.pathfind(movementGraph, transporterObj.location, stats.validMove, transporterObj.remainingMoves)
	const locationIndices = util.indexArray(pathfind.locations.length)
	let indicesToValid = util.boolFilter(
		locationIndices,
		locationIndices.map((i) => pathfind.cost[i] > 0 && loc.locationAllowsStop(pathfind.locations[i]))
	)
	// this little trickery lets us find the closest / emptiest vertex in the destination bucket
	const transportersPerLocation = pathfind.locations.map((location) => model.getAllInGameTransporters().filter((a) => util.arraysEqual(a.location, location)).length)
	/*function sortFunc(i, k) {
		// 1. Check crowd density
		const crowdDiff = transportersPerLocation[i] - transportersPerLocation[k]
		if (crowdDiff !== 0) return crowdDiff

		// 2. Check distance
		const distDiff = pathfind.distances[i] - pathfind.distances[k]
		if (distDiff !== 0) return distDiff

		// 3. THE TIE BREAKER: If empty and same distance, always pick the same index
		// This stops Chrome and FF from disagreeing
		return i - k
	}*/
	/*function sortFunc(i, k) {
		const locA = pathfind.locations[i]
		const locB = pathfind.locations[k]
		if (loc.isLandVertexLocation(locA) && loc.isLandVertexLocation(locB) && loc.isSpecificHexLocation(locB, locA[1])) {
			const hexID = locA[1]
			const hexObj = model.getHexByID(hexID)
			const vertexPosA = hexObj.vertices[locA[2]]
			const vertexPosB = hexObj.vertices[locB[2]]
			// 1. PRIORITISE AWAY FROM [0,0]
			// If one is [0,0] and the other isn't, prefer the one that isn't.
			const aIsCenter = vertexPosA[0] === 0 && vertexPosA[1] === 0
			const bIsCenter = vertexPosB[0] === 0 && vertexPosB[1] === 0

			if (aIsCenter !== bIsCenter) {
				return aIsCenter ? 1 : -1 // 1 moves 'a' to the end, -1 keeps it at the front
			}
		}

		// 2. Check crowd density
		const crowdDiff = transportersPerLocation[i] - transportersPerLocation[k]
		if (crowdDiff !== 0) return crowdDiff

		// 3. Check distance
		const distDiff = pathfind.distances[i] - pathfind.distances[k]
		if (distDiff !== 0) return distDiff

		// 4. THE TIE BREAKER: Browser consistency
		return i - k
	}*/

	indicesToValid.sort((i, k) =>
		graph.sortTransporterMoveIndices(i, k, {
			pathfind,
			transportersPerLocation,
			loc,
			model,
		})
	)
	const validMoves = util.getByIndices(pathfind.locations, indicesToValid)
	store.context.pathfinding = pathfind
	store.context.transporterMoveInfo = [transporterID]
	highlightLocations(validMoves)
}

export function highlightEligibleTransportersForTransporterPickup(transporterID) {
	const store = useModelStore()
	store.context.transporterIDsToHighlight.splice(0)
	const transporterObj = model.getTransporterByID(transporterID)

	if (model.transporterCarriesAnything(transporterID)) return

	const otherEmptyTransporters = model.getTransportersByPlayerIndex(controller.currentPlayerIndex()).filter((t) => t.id !== transporterObj.id && !model.transporterCarriesAnything(t.id) && !model.anythingFollowingTransporter(t.id))
	let eligibleLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, false)

	context.setTransportersToHighlight(otherEmptyTransporters.filter((t) => util.includesArray(eligibleLocations, t.location)).map((t) => t.id))
}

export function highlightEligibleResourcesOnOtherTransporters(transporterID) {
	const store = useModelStore()
	let transporterObj = model.getTransporterByID(transporterID)
	let eligibleLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, false)
	// DOCK HACK
	eligibleLocations = loc.addDockedOffsetsToLocations(eligibleLocations)
	// END DOCK HACK - TODO
	const otherTransportersOnHex = model.getAllInGameTransporters().filter((t) => util.includesArray(eligibleLocations, t.location) && model.transporterCarriesAnything(t.id) && t.id !== transporterObj.id && t.ownerIndex === transporterObj.ownerIndex)
	for (const t of otherTransportersOnHex) {
		let resources = model.resourcesOnTransport(t.id)
		for (const resId of resources.map((a) => a.id)) {
			if (!store.context.resourceIDsToHighlight.includes(resId)) context.addResourceToHighlight(resId)
		}
	}
}

export function highlightEligibleSecondaryBuildingsForManualProduction(transporterID, returnAnyOption, playerIndex, inlcudeWagonFacWithNoDonkeySelected) {
	const store = useModelStore()
	store.context.buildingIDsToHighlight.splice(0)
	const resourcesByHex = model.allResourcesGroupedByAllHexes([playerIndex])
	let secondaryBuildings = model.getAllInGameBuildings().filter((building) => (returnAnyOption || inlcudeWagonFacWithNoDonkeySelected ? model.isSecondaryProducer(building) : model.isSecondaryProducerWithoutTransporterInput(building) || (transporterID >= 0 && model.isSecondaryProducerIncludingTransporterInput(transporterID)(building))))

	function resourceCount(resourceTypes) {
		let count = util.makeArrayOfSizeWithFill(rf.TOTAL_RES, 0)
		for (const res of resourceTypes) {
			if (res <= rf.RES_UPPER_LIMIT) count[res]++
		}
		return count
	}
	function locationResourceCount(hexId, locations) {
		/** THIS FUNCTION NEEDS TO BE MODIFIED TO INCLUDE RELEVANT TRANSPORTER RESOURCES */
		const hexResources = resourcesByHex[hexId]
		function getResLocation(res) {
			if (!loc.isOnAnyTransporter(res.location)) return res.location
			return model.getTransporterByID(res.location[1]).location
		}
		return resourceCount(hexResources.filter((res) => util.includesArray(locations, getResLocation(res))).map((res) => res.type))
	}
	function hasEnoughResourcesAndOutputAreaAndRemainingConversions(building, locations, playerIndex) {
		if (building.remainingConversions === 0) return false
		const stats = rf.BUILDING_STATS.find((a) => a.building === building.type)
		// NB - Check RES input only - not trans input. Can only select bldg with trans input if trans selected
		const inputs = stats.inputRes.map(resourceCount)
		const available = locationResourceCount(building.location[1], locations)
		for (const inputSet of inputs) {
			let enough = true
			for (let i = 0; i < rf.TOTAL_RES; i++) {
				if (inputSet[i] > available[i]) {
					enough = false
				}
			}
			if (enough) {
				// If it's a wagon fac, make sure a donkey is available
				if (building.type === rf.BLDG_WAGON_FACTORY) {
					// Make sure playerIndex has a donkey that can reach the factory
					const possibleLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(building.location, false).filter((x) => loc.isLandVertexLocation(x))
					const allPlayerTransporters = model.getTransportersByPlayerIndex(playerIndex).filter((t) => t.type === rf.DONKEY)
					if (allPlayerTransporters.length === 0) return false
					if (!allPlayerTransporters.some((t) => possibleLocations.some((subArr) => util.arraysEqual(subArr, t.location)))) return false
					return true
				}
				// If outputting a water transporter, check if there's enough water
				if (rf.WATER_TRANSPORTERS.includes(stats.outputRes[0])) {
					const possibleLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(building.location, false).filter((x) => loc.isAnyWaterLocation(x))
					if (possibleLocations.length === 0) return false
				}
				return true
			}
		}
		return false
	}
	function highlightBuildingsWithReachableResources(buildings, playerIndex) {
		const buildingLocation = buildings.map((a) => a.location)
		const buildingReachableLocations = buildingLocation.map((location) => loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(location, true))
		const indices = util.indexArray(buildings.length).filter((i) => hasEnoughResourcesAndOutputAreaAndRemainingConversions(buildings[i], buildingReachableLocations[i], playerIndex))
		if (returnAnyOption) return indices.length > 0
		context.setBuildingsToHighlight(indices.map((i) => buildings[i].id))
	}
	// MAIN FUNCTION STARTS HERE
	// If you have selected a t
	// ransport, limit your highlight to just the reachable buildings
	if (transporterID >= 0) {
		const transporterObj = model.getTransporterByID(transporterID)
		const reachableLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, true)
		const reachableBuildings = secondaryBuildings.filter((a) => util.includesArray(reachableLocations, a.location))
		highlightBuildingsWithReachableResources(reachableBuildings, playerIndex)
		return
	}
	// If you haven't selected a transport, then highlight ALL reachable buildings from ANY of your trans
	else {
		const ownTransporterReachableLocations = loc.getAllLocationsReachableByPlayerIndex(playerIndex, true)
		const secondaryBuildingsReachable = secondaryBuildings.filter((a) => util.includesArray(ownTransporterReachableLocations, a.location))
		return highlightBuildingsWithReachableResources(secondaryBuildingsReachable, playerIndex)
	}
}

export function highlightEligibleTransportersForRemoval(playerIndex, isTotalProblem, isLandProblem, isWaterProblem) {
	const eligibleTransporteridS = getEligibleTransportersForRemoval(playerIndex, isTotalProblem, isLandProblem, isWaterProblem)
	context.setTransportersToHighlight(eligibleTransporteridS)
}

export function getEligibleTransportersForRemoval(playerIndex, isTotalProblem, isLandProblem, isWaterProblem) {
	let typesForRemoval = []
	// If you have too many land, you MUST remove a land
	if (isLandProblem) typesForRemoval.push(rf.LAND_TYPE)
	// If you have too many water, you MUST remove a water
	else if (isWaterProblem) typesForRemoval.push(rf.WATER_TYPE)
	// Otherwise, just remove any
	else if (isTotalProblem) typesForRemoval = [rf.LAND_TYPE, rf.WATER_TYPE]

	// Find the bucket locations of all eligible buildings
	const factoryBucketLocations = model
		.getAllInGameBuildings()
		.filter((building) => rf.ALL_TRANSPORTER_FACTORIES.includes(building.type))
		.map((building) => building.location)

	const playerTransporters = model.getAllInGameTransporters().filter((transporter) => {
		const isCorrectOwner = transporter.ownerIndex === playerIndex
		let isEligibleType = false
		if (typesForRemoval.includes(rf.LAND_TYPE) && rf.LAND_TRANSPORTERS.includes(transporter.type)) isEligibleType = true
		else if (typesForRemoval.includes(rf.WATER_TYPE) && rf.WATER_TRANSPORTERS.includes(transporter.type)) isEligibleType = true
		return isCorrectOwner && isEligibleType
	})

	let eligibleTransporteridS = []
	for (const transporterObj of playerTransporters) {
		if (!loc.isAnyHexLocation(transporterObj.location)) continue
		let reachableBuckets = []
		// Vertex has an easy conversion
		if (loc.isLandVertexLocation(transporterObj.location)) reachableBuckets = [[rf.LOCATION_BUCKET, transporterObj.location[1], loc.getBucketIDfromAnyHexIDandVertex(transporterObj.location[1], transporterObj.location[2])]]
		// Otherwise, find all reachable and filter by bucketLoc
		else {
			const reachableLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, false)
			reachableBuckets = reachableLocations.filter((loc) => loc[0] === rf.LOCATION_BUCKET)
		}
		// Now check if any reachable buckets contain a factory
		for (const bucketLoc of reachableBuckets) {
			if (util.includesArray(factoryBucketLocations, bucketLoc)) {
				eligibleTransporteridS.push(transporterObj.id)
				break
			}
		}
	}

	return eligibleTransporteridS
}

export function shouldHighlightItem(itemType, itemNum) {
	const store = useModelStore()
	if (store.context.action === rf.ACT_CONFIRM_END_TURN) return false
	if (itemType === rf.ITEM_BUILT_BUILDING) {
		if (store.context.buildingIDsToHighlight.includes(itemNum)) return true
		return false
	}
}
