import * as rf from "./RNBreference.js"
import * as util from "./RNButil"
import * as model from "./RNBmodel.js"
import * as controller from "./RNBcontroller.js"
import * as graph from "./RNBgraph.js"
import * as map from "../js/RNBmap"
import * as view from "../js/RNBview"
import * as vec from "../js/RNBvector"
import * as computes from "../js/RNBcomputes"
import * as highlight from "../js/RNBhighlight"
import * as context from "../js/RNBcontext"
import * as stack from "../js/RNBstack"
import * as atelier from "../js/RNBatelier"

import { useModelStore } from "../stores/RNBstore.js"

/****************************************
 *
 * ALL LOCATIONS (except OOB) NEED TO HAVE HexID AS ENTRY[1]
 * (Except edge - not used; that is DOCKED - and on transporter)
 *
 ****************************************/

export function setOOBlocation() {
	return [rf.LOCATION_OOB]
}

export function setLandVertexLocation(hexId, vertex) {
	let hex = model.getHexByID(hexId)
	if (vertex < 0 || vertex >= hex.nodeVertexDefinitions.length) {
		rf.doAdminAlrt(`setLandVertexLocation: Invalid vertex ${vertex} for hex ${hexId}. Max is ${hex.nodeVertexDefinitions.length - 1}`)
	}
	return [rf.LOCATION_LAND_VERTEX, hexId, vertex]
}

export function setBucketLocation(hexID, bucketID) {
	return [rf.LOCATION_BUCKET, hexID, bucketID]
}

export function setSeaVertexLocation(hexId, vertex) {
	return [rf.LOCATION_SEA_VERTEX, hexId, vertex]
}

export function setRiverVertexLocation(hexId, vertexIndex) {
	return [rf.LOCATION_RIVER_VERTEX, hexId, vertexIndex]
}

export function setRiverBucketLocation(hexID, riverID) {
	return [rf.LOCATION_RIVER_BUCKET, hexID, riverID]
}

export function setDockedLocation(hexId, side, bank, offset = rf.DOCKED_OFFSET_NONE) {
	return [rf.LOCATION_DOCKED, hexId, side, bank, offset] // rf.BANK_NONE, rf.BANK_LEFT, rf.BANK_RIGHT
}

export function getBucketIDadjacentToDockedLocation(location) {
	if (!isDockedLocation(location)) {
		rf.doAdminAlrt("getBucketIDadjacentToDockedLocation: Location is not a docked location")
		return
	}
	const hexId = location[1]
	const side = location[2]
	const bank = location[3]
	const hex = model.getHexByID(hexId)
	function vertex() {
		if (bank == rf.BANK_NONE) {
			return hex.sideNodeIds[side]
		} else {
			const k = bank == rf.BANK_LEFT ? 0 : 1
			return hex.cornerNodeIds[side][k]
		}
	}
	return hex.nodeBucketIds[vertex()]
}

export function isAnyWaterLocation(inputLocation) {
	return [rf.LOCATION_SEA_VERTEX, rf.LOCATION_RIVER_BUCKET, rf.LOCATION_RIVER_VERTEX, rf.LOCATION_DOCKED].includes(inputLocation[0])
}

// This is only used in graph making - probably to find eligible wall locations
export function setEdgeLocation(edgeId) {
	return [rf.LOCATION_EDGE, edgeId]
}

export function setTransporterLocation(transporterId) {
	return [rf.LOCATION_TRANSPORTER, transporterId]
}

export function setFollowerLocation(transporterId) {
	return [rf.LOCATION_FOLLOWER, transporterId]
}

export function getLocationType(inputLocation) {
	return inputLocation[0]
}

export function isOOBlocation(inputLocation) {
	return inputLocation[0] === rf.LOCATION_OOB
}

export function isLandVertexLocation(inputLocation) {
	return inputLocation[0] === rf.LOCATION_LAND_VERTEX
}

export function isWaterVertexLocation(inputLocation) {
	return inputLocation[0] === rf.LOCATION_SEA_VERTEX
}

export function isBucketLocation(inputLocation) {
	return inputLocation[0] === rf.LOCATION_BUCKET
}

export function isNonRiverVertexLocation(inputLocation) {
	return [rf.LOCATION_LAND_VERTEX, rf.LOCATION_SEA_VERTEX].includes(inputLocation[0])
}

// IE anything except OOB and on other transporter
export function isAnyHexLocation(inputLocation) {
	return [rf.LOCATION_LAND_VERTEX, rf.LOCATION_SEA_VERTEX, rf.LOCATION_RIVER_BUCKET, rf.LOCATION_DOCKED, rf.LOCATION_BUCKET, rf.LOCATION_RIVER_VERTEX].includes(inputLocation[0])
}

export function isRiverBucketLocation(inputLocation) {
	return inputLocation[0] === rf.LOCATION_RIVER_BUCKET
}

export function isRiverVertexLocation(inputLocation) {
	return inputLocation[0] === rf.LOCATION_RIVER_VERTEX
}

export function isSpecificHexLocation(inputLocation, hexId) {
	return isAnyHexLocation(inputLocation) && inputLocation[1] === hexId
}

export function isDockedLocation(inputLocation) {
	return inputLocation[0] === rf.LOCATION_DOCKED
}

export function isSeaVertexLocation(inputLocation) {
	return inputLocation[0] === rf.LOCATION_SEA_VERTEX
}

export function isInVertexBucket(inputLocation, hexId, vertexBucket) {
	const hex = model.getHexByID(hexId)
	return isNonRiverVertexLocation(inputLocation) && inputLocation[1] === hexId && vertexBucket === hex.bucketIdsCurrent[hex.nodeBucketIds[inputLocation[2]]]
}

export function isOnSelectedTransporterIDs(inputLocation, transporterIds) {
	return inputLocation[0] === rf.LOCATION_TRANSPORTER && transporterIds.includes(inputLocation[1])
}

export function isOnSpecificTransporter(inputLocation, transporterId) {
	return util.arraysEqual(inputLocation, [rf.LOCATION_TRANSPORTER, transporterId])
}

export function isOnAnyTransporter(inputLocation) {
	return inputLocation[0] === rf.LOCATION_TRANSPORTER
}

export function isFollowingAnyTransporter(inputLocation) {
	return inputLocation[0] === rf.LOCATION_FOLLOWER
}

export function isFollowingTransporter(inputLocation, transporterId) {
	return util.arraysEqual(inputLocation, [rf.LOCATION_FOLLOWER, transporterId])
}

export function convertLocationToBucket(inputLocation) {
	let newLocation = []
	if (isBucketLocation(inputLocation)) newLocation = [...inputLocation]
	else if (isLandVertexLocation(inputLocation)) {
		const bucketID = getBucketIDfromAnyHexIDandVertex(inputLocation[1], inputLocation[2])
		newLocation = [rf.LOCATION_BUCKET, inputLocation[1], bucketID]
	} else if (isSeaVertexLocation(inputLocation)) {
		const bucketID = getBucketIDfromAnyHexIDandVertex(inputLocation[1], inputLocation[2])
		newLocation = [rf.LOCATION_BUCKET, inputLocation[1], bucketID]
	} else rf.doAdminAlrt(`Unable to convert Location to bucket: ${JSON.stringify(inputLocation)}`)
	return newLocation
}

export function convertLocationToVertex(inputLocation) {
	if (!isAnyHexLocation(inputLocation)) rf.doAdminAlrt(`convertLocationToVertex: Unhandled location type: ${JSON.stringify(inputLocation)}`)
	const hexID = inputLocation[1]
	const hexObj = model.getHexByID(hexID)
	let bucketID = inputLocation[2]
	if (inputLocation.length < 3) rf.doAdminAlrt(`invalid loc: ${inputLocation} - in CLtV`)
	if (isLandVertexLocation(inputLocation)) bucketID = getBucketIDfromAnyHexIDandVertex(hexID, inputLocation[2])
	if (!bucketID && bucketID !== 0) rf.doAdminAlrt(`CLtV no bucket ${JSON.stringify(inputLocation)}`)
	const vertex = getAnyVertexInHexIDbucketID(hexID, bucketID)
	let newLocation = [rf.LOCATION_LAND_VERTEX, hexID, vertex]
	if (hexObj.baseTerrain === rf.TERR_SEA) newLocation = [rf.LOCATION_SEA_VERTEX, hexID, vertex]
	return newLocation
}

export function isRiverStoppingVertex(location) {
	const hexId = location[1]
	const vertexId = location[2]
	return model.getHexByID(hexId).riverStoppingVertex[vertexId]
}

export function isSeaStoppingVertex(location) {
	const vertexId = location[2]
	return vertexId >= 7
}

export function locationAllowsStop(location) {
	if (isSeaVertexLocation(location)) return isSeaStoppingVertex(location)
	if (isRiverVertexLocation(location)) return isRiverStoppingVertex(location)
	return true
}

export function getAnyVertexInHexIDbucketID(hexID, bucketID) {
	const store = useModelStore()
	const hex = model.getHexByID(hexID)
	let anyVertex = -1
	for (let i = 0; i < hex.nodeBucketIds.length; i++) {
		if (hex.nodeBucketIds[i] === bucketID) {
			anyVertex = i
			break
		}
	}
	if (anyVertex === -1) {
		rf.doAdminAlrt(`Res vertex not found for bucketID ${bucketID} in hex ${hexID} T-${store.gameflow.turn} P-${store.gameflow.phase}`)
		return 0
	}
	return anyVertex
}

// Also works for oil rig at sea
export function getBucketIDfromAnyHexIDandVertex(hexID, vertex) {
	const hexObj = model.getHexByID(hexID)
	return hexObj.bucketIdsCurrent[hexObj.nodeBucketIds[vertex]]
}

// Get the riverIdx/ID from any river vertex
export function getRiverIDfromAnyHexIDandRiverVertex(hexID, riverVertex) {
	const hexObj = model.getHexByID(hexID)
	return hexObj.riverVertexRiverIds[riverVertex]
}
// hex.riverVertexRiverIds[hex.sideRiverVertexIds[i]] === riverIdx




export function edgesForFerryOverRiver(hexId, riverId) {
	const hex = model.getHexByID(hexId)
	// Allow for empty arr for River Source
	const adj = hex.riverAdjacencies[riverId] || []
	let res = []
	for (let k = 0; k < adj.length; k++) {
		for (let i = k + 1; i < adj.length; i++) {
			res.push([adj[k], adj[i]])
		}
	}
	return res
}

export function allFerryEdges(hexId, transporters) {
	const hex = model.getHexByID(hexId)
	const transportersInRivers = transporters.filter((t) => t.location[0] === rf.LOCATION_RIVER_VERTEX && t.location[1] === hexId)
	const transporterRiverIds = transportersInRivers.map((t) => hex.riverVertexRiverIds[t.location[2]])
	const riversWithFerries = [0, 1].filter((i) => transporterRiverIds.includes(i))
	return riversWithFerries.map((i) => edgesForFerryOverRiver(hexId, i)).reduce((acc, arr) => acc.concat(arr), [])
}

export function combinedBucketIdsWithFerryEdges(hexId, ferryEdges) {
	const hex = model.getHexByID(hexId)
	let bucketIds = hex.bucketIdsCurrent
	for (const edge of ferryEdges) {
		let a = bucketIds[edge[0]]
		let b = bucketIds[edge[1]]

		const minVal = Math.min(a, b)
		const maxVal = Math.max(a, b)

		bucketIds = bucketIds.map((id) => (id === maxVal ? minVal : id))
	}
	return bucketIds
}

/**
 * Returns every candidate location inside a single hex, without regard to
 * bucket connectivity or the transporter's current position.
 *
 * For sea hexes: returns all bucket and sea-vertex locations.
 * For land hexes: returns all buckets, land vertices, river vertices,
 * and docked positions on sides that border a sea hex (provided the wall
 * is owned by the given player or is unowned).
 *
 * @param {number} hexID        - The hex to enumerate.
 * @param {number} playerIndex  - Used to determine eligible docked locations
 *                                  based on wall ownership.
 * @returns {Array<Array>}      - Array of location arrays (e.g. [LOCATION_BUCKET, hexID, bucketID]).
 */
export function getEveryLocationWithinSingleHex(hexID, playerIndex) {
	const store = useModelStore()
	const hex = model.getHexByID(hexID)
	const bucketLocations = hex.bucketIdsInitial.map((i) => setBucketLocation(hexID, i))
	// TODO check this
	// const bucketLocations = hex.bucketIdsInitial.map((i) => setBucketLocation(hexID, i)).concat(indexArrayOfRiverIdsDontRememberExactlyHowItLooks.map((i) => setRiverBucketLocation(hexID, i))
	if (hex.currentTerrain === rf.TERR_SEA) {
		return bucketLocations.concat(util.indexArray(hex.nodeBucketIds.length).map((i) => setSeaVertexLocation(hexID, i)))
	} else {
		let eligibleLocations = bucketLocations.concat(
			util
				.indexArray(hex.nodeBucketIds.length)
				.map((i) => setLandVertexLocation(hexID, i))
				.concat(util.indexArray(hex.riverVertexRiverIds.length).map((i) => setRiverVertexLocation(hexID, i)))
		)
		for (let n = 0; n < 6; n++) {
			let edgeId = hex.edgeLookup[n]
			if (edgeId >= 0) {
				const edge = store.mapData.edgeData[edgeId]
				const otherHex = model.getHexByID(edge.edgeHexIDs[edge.edgeHexIDs[0] === hexID ? 1 : 0])
				if (otherHex.currentTerrain === rf.TERR_SEA && [playerIndex, -1].includes(edge.wall[1])) {
					if (hex.sideNodeIds[n] >= 0) {
						eligibleLocations = eligibleLocations.concat(util.indexArray(3).map((offset) => setDockedLocation(hexID, n, rf.BANK_NONE, offset)))
					} else {
						for (const bank of [rf.BANK_LEFT, rf.BANK_RIGHT]) {
							eligibleLocations = eligibleLocations.concat(util.indexArray(3).map((offset) => setDockedLocation(hexID, n, bank, offset)))
						}
					}
				}
			}
		}
		return eligibleLocations
	}
}

/**
 * Filters the raw candidate locations of a hex down to only those reachable
 * from the transporter's currentLocation, based on bucket connectivity.
 *
 * Behaviour depends on the location type:
 *   - Water vertex  : all locations in the hex (water is fully connected).
 *   - Land / Bucket : same-bucket land vertices/buckets, adjacent docks,
 *                     and river vertices touching that bucket.
 *   - River vertex    : same-river vertices and adjacent land/buckets.
 *   - Docked        : adjacent land/buckets and other docked spots sharing
 *                     the same bucket.
 *
 * @param {Array}   currentLocation  - The transporter's current location array.
 * @param {number}  playerIndex      - Passed through to getEveryLocationWithinSingleHex.
 * @param {number[]} bucketIdsCurrent - Merged bucket IDs for the hex (ferries already applied).
 * @returns {Array<Array>}           - Reachable locations within the same hex.
 */
export function getInternalLocationsReachableFromLocation(currentLocation, playerIndex, bucketIdsCurrent) {
	const hexID = currentLocation[1]
	const hexLocations = getEveryLocationWithinSingleHex(hexID, playerIndex)

	// in water, all other transporters are reachable. do nothing
	if (isWaterVertexLocation(currentLocation)) {
		return hexLocations
	}
	// on land, adjacent rivers and docked locations are reachable
	else if (isLandVertexLocation(currentLocation) || isBucketLocation(currentLocation)) {
		const hexID = currentLocation[1]
		const hex = model.getHexByID(hexID)
		const bucketID = isBucketLocation(currentLocation) ? currentLocation[2] : hex.nodeBucketIds[currentLocation[2]]
		const currentBucketID = bucketIdsCurrent[bucketID]
		const adjacentRiverIDS = util.indexArray(hex.riverAdjacencies.length).filter((i) => hex.riverAdjacencies[i].filter((n) => bucketIdsCurrent[n] === currentBucketID).length > 0)
		return hexLocations.filter((location) => (isLandVertexLocation(location) && bucketIdsCurrent[hex.nodeBucketIds[location[2]]] === currentBucketID) || (isDockedLocation(location) && bucketIdsCurrent[getBucketIDadjacentToDockedLocation(location)] === currentBucketID) || (isRiverVertexLocation(location) && adjacentRiverIDS.includes(hex.riverVertexRiverIds[location[2]])) || (isBucketLocation(location) && bucketIdsCurrent[location[2]] === currentBucketID))
	}
	// in a river, adjacent land is reachable
	else if (isRiverVertexLocation(currentLocation)) {
		const hexID = currentLocation[1]
		const hex = model.getHexByID(hexID)
		const riverID = hex.riverVertexRiverIds[currentLocation[2]]
		const adj = hex.riverAdjacencies[riverID]
		const bucketAdj = adj.map((n) => bucketIdsCurrent[n])
		return hexLocations.filter((location) => (isRiverVertexLocation(location) && hex.riverVertexRiverIds[location[2]] === riverID) || (isLandVertexLocation(location) && bucketAdj.includes(bucketIdsCurrent[hex.nodeBucketIds[location[2]]])) || (isBucketLocation(location) && bucketAdj.includes(bucketIdsCurrent[location[2]])))
	}
	// when docked, only adjacent land is reachable
	else if (isDockedLocation(currentLocation)) {
		const hexID = currentLocation[1]
		const hex = model.getHexByID(hexID)
		//const side = currentLocation[2]
		//const bank = currentLocation[3]
		const bucketID = getBucketIDadjacentToDockedLocation(currentLocation)
		const currentBucketID = bucketIdsCurrent[bucketID]
		//return hexLocations.filter((location) => (isLandVertexLocation(location) && bucketIdsCurrent[hex.nodeBucketIds[location[2]]] === currentBucketID) || (isDockedLocation(location) && location[2] === side && location[3] === bank) || (isBucketLocation(location) && bucketIdsCurrent[location[2]] === currentBucketID))
		return hexLocations.filter((location) => (isLandVertexLocation(location) && bucketIdsCurrent[hex.nodeBucketIds[location[2]]] === currentBucketID) || (isDockedLocation(location) && bucketIdsCurrent[getBucketIDadjacentToDockedLocation(location)] === currentBucketID) || (isBucketLocation(location) && bucketIdsCurrent[location[2]] === currentBucketID))
	}
	return []
}

export function hexEdgesAccessibleFromBucketLocations(hexID, bucketIds) {
	const store = useModelStore()
	const hex = model.getHexByID(hexID)
	let edgeLocations = []
	function nodeInBuckets(nodeId) {
		return nodeId >= 0 ? bucketIds.includes(hex.bucketIdsCurrent[hex.nodeBucketIds[nodeId]]) : false
	}
	for (let n = 0; n < 6; n++) {
		let edgeId = hex.edgeLookup[n]
		if (edgeId >= 0) {
			const edge = store.mapData.edgeData[edgeId]
			const otherHex = model.getHexByID(edge.edgeHexIDs[edge.edgeHexIDs[0] === hexID ? 1 : 0])
			if (otherHex.currentTerrain !== rf.TERR_VOID && (hex.currentTerrain !== rf.TERR_SEA || otherHex.currentTerrain !== rf.TERR_SEA)) {
				let reachable = nodeInBuckets(hex.sideNodeIds[n])
				for (const k of hex.cornerNodeIds[n]) {
					reachable = reachable || nodeInBuckets(k)
				}
				if (reachable) {
					edgeLocations.push(setEdgeLocation(edgeId))
				}
			}
		}
	}
	return edgeLocations
}

/**
 * Core function for determining every location a transporter can interact with
 * inside the hex it currently occupies.
 *
 * This wraps the pipeline of:
 *   1. Compute ferry edges (if withFerry is true) and merge connected buckets.
 *   2. Filter to reachable internal locations via getInternalLocationsReachableFromLocation.
 *   3. Append edge locations accessible from the reachable buckets (for building
 *      bridges, roads, or walls).
 *
 * Most gameplay code should call this function rather than the lower-level helpers.
 *
 * @param {Array}  currentLocation - The transporter's current location array.
 * @param {boolean} withFerry     - Whether to treat ferry-connected buckets as connected.
 * @param {number} [playerIndex]   - Defaults to the current player if omitted.
 * @returns {Array<Array>}         - All reachable locations including edge locations, bucket locs, vertex locs
 */
// This will  return EVERYTHING - vertices, edges, docks, and buckets (INCLUDES river vertices)
// NB does NOT include LOCATION_RIVER_BUCKET at the moment (???)
export function getEligibleLocationsForInteractionWithinHexFromSingleLocation(currentLocation, withFerry, playerIndex) {
	if (!currentLocation) {
		rf.doAdminAlrt("getEligibleLocationsForInteractionWithinHexFromSingleLocation: currentLocation is undefined")
		return []
	}
	const effectivePlayerIndex = typeof playerIndex === "number" ? playerIndex : controller.currentPlayerIndex()
	const hexID = currentLocation[1]
	const ferryEdges = withFerry ? allFerryEdges(hexID, model.getTransportersByPlayerIndex(effectivePlayerIndex)) : []
	const currentBucketIds = combinedBucketIdsWithFerryEdges(hexID, ferryEdges)
	const internalLocations = getInternalLocationsReachableFromLocation(currentLocation, effectivePlayerIndex, currentBucketIds)
	const bucketIds = internalLocations.filter(isBucketLocation).map((loc) => loc[2])
	return internalLocations.concat(hexEdgesAccessibleFromBucketLocations(hexID, bucketIds))
}

export function addDockedOffsetsToLocations(locations) {
	const res = []
	for (const singleLoc of locations) {
		if (!isDockedLocation(singleLoc))
			continue //res.push([...singleLoc])
		else {
			// Add docked location with offset
			let dockedLoc = [...singleLoc]
			dockedLoc[4] = 1
			res.push([...dockedLoc])
			dockedLoc[4] = 2
			res.push([...dockedLoc])
		}
	}
	return locations.concat(res)
}

export function addBucketLocationsToLocations(locations) {
	const bucketLocs = []
	for (const singleLoc of locations) {
		if (singleLoc[0] === rf.LOCATION_LAND_VERTEX || singleLoc[0] === rf.LOCATION_SEA_VERTEX) {
			const singleBucketID = getBucketIDfromAnyHexIDandVertex(singleLoc[1], singleLoc[2])
			const newLocation = [rf.LOCATION_BUCKET, singleLoc[1], singleBucketID]
			if (!util.includesArray(bucketLocs, newLocation)) {
				bucketLocs.push(newLocation)
			}
		}
	}
	return locations.concat(bucketLocs)
}

export function getAllResourcesAccessibleToTransporter(transporterID, includeStealingFromOtherTransporters) {
	let transporterObj = model.getTransporterByID(transporterID)
	if (!transporterObj || !transporterObj.location) {
		rf.doAdminAlrt(`getAllResourcesAccessibleToTransporter: transporter ${transporterID} has no location`)
		return []
	}
	let playerIndex = transporterObj.ownerIndex
	const transporterLocation = transporterObj.location
	const reachable = getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterLocation, true, playerIndex)
	const ownTransporters = includeStealingFromOtherTransporters ? model.getAllInGameTransporters().filter((t) => t.ownerIndex === playerIndex && util.includesArray(reachable, t.location)) : []
	const reachableLocations = reachable.concat(ownTransporters.map((t) => setTransporterLocation(t.id)))
	const reachableBucketLocations = []
	for (const reachableLoc of reachableLocations) {
		let newLoc = []
		if (isBucketLocation(reachableLoc)) newLoc = [...reachableLoc]
		else if (isNonRiverVertexLocation(reachableLoc)) newLoc = convertLocationToBucket(reachableLoc)
		else if (
			isOnSelectedTransporterIDs(
				reachableLoc,
				ownTransporters.map((t) => t.id)
			)
		)
			newLoc = [...reachableLoc]
		else continue
		if (!util.includesArray(reachableBucketLocations, newLoc)) reachableBucketLocations.push(newLoc)
	}
	const reachableResources = model.getAllInGameResources().filter((res) => util.includesArray(reachableBucketLocations, res.location))
	return reachableResources
}

export function getFinalLocationForDockingTransporterID(dockedLocation, transporterID) {
	const hexID = dockedLocation[1]
	const side = dockedLocation[2]
	const bank = dockedLocation[3]
	// Check which offsets are already used at this docked location
	const usedOffsets = new Set()
	const transportersAtLocation = model.getAllInGameTransporters().filter((t) => {
		if (t.id === transporterID) return false
		return t.location[0] === rf.LOCATION_DOCKED && t.location[1] === hexID && t.location[2] === side && (t.location[3] ?? rf.BANK_NONE) === bank
	})
	for (const t of transportersAtLocation) {
		const offset = t.location[4] ?? rf.DOCKED_OFFSET_NONE
		usedOffsets.add(offset)
	}
	// Find first available offset in order: 0 (NONE), 1 (ACW), 2 (CW)
	let assignedOffset = rf.DOCKED_OFFSET_NONE
	if (!usedOffsets.has(rf.DOCKED_OFFSET_NONE)) {
		assignedOffset = rf.DOCKED_OFFSET_NONE
	} else if (!usedOffsets.has(rf.DOCKED_OFFSET_ACW)) {
		assignedOffset = rf.DOCKED_OFFSET_ACW
	} else if (!usedOffsets.has(rf.DOCKED_OFFSET_CW)) {
		assignedOffset = rf.DOCKED_OFFSET_CW
	}
	// Reconstruct the location with the assigned offset
	return setDockedLocation(hexID, side, bank, assignedOffset)
}

export function moveTransporterTo(entry, transporterID, event = null) {
	const store = useModelStore()
	let finalLocation = entry
	store.context.transporterMoveInfo.push(entry)
	let transporterObj = model.getTransporterByID(transporterID)
	const transporterStats = rf.getTransporterStats(transporterObj.type)
	const oldTrandporterLocation = transporterObj.location

	// If moving to a docked location, find and assign an unused offset
	if (isDockedLocation(finalLocation)) {
		finalLocation = getFinalLocationForDockingTransporterID(finalLocation, transporterID)
	}

	// Make sure the transporter has the correct OLD xy location now
	let rawTransporterXY = map.getTransporterPositionFromLocation(transporterObj.location, transporterStats, transporterID)
	transporterObj.rawTransporterXY = rawTransporterXY

	// NB all locations (except edges for walls, or following transporters) are hexLocations
	// IE this always runs
	if (isAnyHexLocation(finalLocation)) {
		const pathfinding = store.context.pathfinding // set in highlight.highlightEligibleHexAreasForTransporterMove
		let destinationIdx = util.indexOfArrayInArray(pathfinding.locations, finalLocation)

		// Debug: Check if destination was found
		if (destinationIdx >= pathfinding.locations.length || destinationIdx < 0) {
			console.error("Destination not found in pathfinding locations", finalLocation, pathfinding.locations)
			return
		}

		// First, get the path to the destination in terms of the graph
		// IE [old loc, paths out of old loc / paths around intermediate hexes / destination]
		// IE a PATH does NOT care about pointy/flat - it uses hexID's / vertexes / etc
		let path = graph.pathToDestination(pathfinding, destinationIdx)
		// Remove the start location from the path - we are already there
		path = path.slice(1)

		// LEAVE THIS store.RATIO - I THINK WAYPOINTS ARE LIKE A FINAL OUTPUT
		// waypoints convert a PATH into RAW-XY COORDINATES
		let waypoints = pathWaypoints(path).map(offsetPoint(vec.scaleBy(store.RATIO * -0.5, [transporterStats.width, transporterStats.height])))

		// Docking REQUIRES the final waypoint. Otherwise, push it to try to stop movvement jitter
		// CHECK THIS LATER
		if (finalLocation[0] === rf.LOCATION_DOCKED) {
			waypoints[waypoints.length - 1] = [...map.getTransporterPositionFromLocation(finalLocation, transporterStats, transporterID)]
		}
		// Does the path not contain the final waypoint?
		//else waypoints.push(map.getTransporterPositionFromLocation(location, transporterStats))

		// Ensure the absolute final coordinate is pixel-perfect for the destination
		const finalPixelPt = map.getTransporterPositionFromLocation(finalLocation, transporterStats, transporterID)
		if (waypoints.length > 0) {
			// Replace or push the final destination to ensure it matches updateToFinalPosition
			waypoints[waypoints.length - 1] = [...finalPixelPt]
		} else {
			waypoints.push([...finalPixelPt])
		}

		view.addTimingsToWaypoints(transporterObj.rawTransporterXY, waypoints)

		/*
		let transporterOntrans = model.transportersOnTransporter(transporterID)
		if (transporterOntrans.length > 0) {
			let carriedID = transporterOntrans[0].id
			//let carriedObj = model.getTransporterByID(carriedID)
			let carriedWaypoints = JSON.parse(JSON.stringify(waypoints))
			// THIS IS A HACK
			// We know the final waypoint is the final location for the transporter
			// So copy this in with a 5ms delay to make sure the BEING CARRIED transporter has a longer animation.
			// Then, when it checks for the locatino of the bottom trans, it will be at it's final position
			carriedWaypoints.push([carriedWaypoints[carriedWaypoints.length - 1][0], carriedWaypoints[carriedWaypoints.length - 1][1], 10])
			//carriedObj.animationWaypoints = JSON.parse(JSON.stringify(carriedWaypoints))
			// Atomic update for carried transporter
			store.$patch((state) => {
				const carriedTrans = state.ALL_TRANSPORTERS.find((t) => t.id === carriedID)
				if (carriedTrans) {
					carriedTrans.animationWaypoints = carriedWaypoints
				}
			})
		}
    	*/

		//transporterObj.animationWaypoints = JSON.parse(JSON.stringify(waypoints))
		//transporterObj.location = location
		//transporterObj.remainingMoves -= cost
		// Atomic update for main transporter
		let transporterOntrans = model.transportersOnTransporter(transporterID)

		/*store.$patch((state) => {
			const trans = state.ALL_TRANSPORTERS.find((t) => t.id === transporterID)
			if (trans) {
				trans.movedThisTurn = true
				// CRITICAL: Set waypoints FIRST, then location to hint the watcher
				trans.animationWaypoints = waypoints
				trans.location = location
				trans.remainingMoves -= pathfinding.cost[destinationIdx]
			}

			// If you are carrying something
			transporterOntrans.forEach((carried) => {
				const cTrans = state.ALL_TRANSPORTERS.find((t) => t.id === carried.id)
				if (cTrans) {
					// Use a deep copy to prevent shared reference issues
					cTrans.animationWaypoints = JSON.parse(JSON.stringify(waypoints))
					cTrans.location = location
				}
			})
		})*/

		store.$patch((state) => {
			const trans = state.ALL_TRANSPORTERS.find((t) => t.id === transporterID)
			if (trans) {
				trans.movedThisTurn = true
				// USE A DEEP COPY HERE TOO to prevent Chrome reference pinning
				trans.animationWaypoints = JSON.parse(JSON.stringify(waypoints))
				trans.location = finalLocation
				trans.rawTransporterXY = [...finalPixelPt] // NEW LINE
				trans.remainingMoves -= pathfinding.cost[destinationIdx]
			}

			transporterOntrans.forEach((carried) => {
				const cTrans = state.ALL_TRANSPORTERS.find((t) => t.id === carried.id)
				if (cTrans) {
					// Already doing it here, but ensure 'waypoints' hasn't been
					// mutated further down in the code before this loop finishes.
					cTrans.animationWaypoints = JSON.parse(JSON.stringify(waypoints))
				}
			})
		})

		// Docking ends yuour movement
		if (isDockedLocation(finalLocation)) {
			transporterObj.remainingMoves = 0
		}

		const followingResources = model.resourcesFollowingTransporter(transporterObj.id)
		let geeseFollowingStack = []
		//let numGeeseFollowing = model.resourcesFollowingTransporter(transporterID).length
		//if (numGeeseFollowing > 0) currentStack.push(numGeeseFollowing)
		// Update all resources FOLLOWING the transporter to indicate they've been moved, and drop them if necessary
		if (followingResources.length > 0) {
			geeseFollowingStack.push(followingResources.length)
			followingResources.forEach((followingRes) => {
				followingRes.movedTransporterID = transporterObj.id
			})
			// If there are no moves left, find the drop location
			if (transporterObj.remainingMoves <= 0) {
				let dropLocation = []
				// On land, just drop the geese
				if (isLandVertexLocation(finalLocation)) {
					dropLocation = convertLocationToBucket(finalLocation)
					geeseFollowingStack.push(1) // Show that drop occurred
				}
				// If ending on a sea hex with no oil rig AND geese following, it is illegal
				else if (isSeaVertexLocation(finalLocation) && !map.hasOilRigOnHexID(finalLocation[1])) {
					let clientX = event ? event.clientX : window.innerWidth / 2
					let clientY = event ? event.clientY : window.innerHeight / 2
					let htmlMessage = "Geese cannot end<br/>turn at sea<br/>following transporter"
					model.showPopup("error", clientX, clientY, htmlMessage)
					store.context.errorUnableToDropGeeseAtSea = true
					// DO NOT RETURN = allow function to finish to clear highlights, etc
					//return
				}
				// If ending on a sea hex WITH an oil rig, just drop the geese
				else if (isSeaVertexLocation(finalLocation) && map.hasOilRigOnHexID(finalLocation[1])) {
					dropLocation = convertLocationToBucket(finalLocation)
					geeseFollowingStack.push(1) // Show that drop occurred
				}
				// If ending on a DOCKED location, drop on the hex
				else if (isDockedLocation(finalLocation)) {
					// If a land is dropping a land or water dropping a water, just put it in the same location
					const ig = graph.createInternalGraph(finalLocation[1], controller.currentPlayerIndex())
					//const reachable = graph.reachableFrom(ig, [rf.NODE_VERTEX], location[0] === rf.LOCATION_LAND_VERTEX ? rf.NODE_ALL : [rf.NODE_VERTEX], finalLocation)
					const reachable = graph.reachableFrom(ig, [rf.NODE_VERTEX], oldTrandporterLocation[0] === rf.LOCATION_LAND_VERTEX ? rf.NODE_ALL : [rf.NODE_VERTEX], finalLocation)
					const validLocations = reachable.filter((loc) => [rf.LOCATION_LAND_VERTEX].includes(loc[0]))
					//const validBuckets = model.getVertexBucketsFromLocations(validLocations)
					//const nonVertices = validLocations.filter((location) => !loc.isNonRiverVertexLocation(location))

					dropLocation = [...validLocations[0]]
					dropLocation = convertLocationToBucket(dropLocation)
					// We only need to record this location, otherwise we can move the TO location of the transport
					geeseFollowingStack.push([...dropLocation])
				}
				// Now drop them
				followingResources.forEach((followingRes) => {
					followingRes.autoDropLocationAfterFollowingTransporter = [...dropLocation]
				})
			}
		}

		// Update all resource on the transporter to indicate they've been moved
		let resourcesOnTransporter = model.resourcesOnTransport(transporterObj.id)
		for (let i = 0; i < resourcesOnTransporter.length; i++) {
			resourcesOnTransporter[i].movedTransporterID = transporterObj.id
		}

		// Add to the stack
		let currentStack = []
		if (isLandVertexLocation(finalLocation)) {
			const oldBucketLocation = convertLocationToBucket(oldTrandporterLocation)
			const newBucketLocation = convertLocationToBucket(finalLocation)
			const compressedOldLocation = [...stack.compressLocation(oldBucketLocation)]
			const compressedNewLocation = [...stack.compressLocation(newBucketLocation)]
			currentStack.push(rf.STACK_MOVE_LAND)
			currentStack.push(stack.getTransIDtoUse(transporterObj))
			currentStack.push([...compressedOldLocation])
			currentStack.push([...compressedNewLocation])
			if (transporterOntrans.length > 0) currentStack.push([-1, stack.getTransIDtoUse(transporterOntrans[0])])
			else if (resourcesOnTransporter.length > 0) currentStack.push([...resourcesOnTransporter.map((r) => stack.getResIDtoUse(r))])
			else currentStack.push([])
			//if (model.resourcesFollowingTransporter(transporterID).length > 0) currentStack.push(model.resourcesFollowingTransporter(transporterID).length)
			if (geeseFollowingStack.length > 0) currentStack.push([...geeseFollowingStack])
			stack.addItemToStack({
				action: rf.STACK_MOVE_LAND,
				historyEntry: currentStack,
				playerIndex: controller.currentPlayerIndex(),
			})
		} else {
			currentStack.push(rf.STACK_MOVE_WATER)
			currentStack.push(stack.getTransIDtoUse(transporterObj))
			currentStack.push([...stack.compressWaterLocation(oldTrandporterLocation)])
			currentStack.push([...stack.compressWaterLocation(finalLocation)])
			if (transporterOntrans.length > 0) currentStack.push([-1, stack.getTransIDtoUse(transporterOntrans[0])])
			else if (resourcesOnTransporter.length > 0) currentStack.push([...resourcesOnTransporter.map((r) => stack.getResIDtoUse(r))])
			else currentStack.push([])
			//let numGeeseFollowing = model.resourcesFollowingTransporter(transporterID).length
			//if (numGeeseFollowing > 0) currentStack.push(numGeeseFollowing)
			if (geeseFollowingStack.length > 0) currentStack.push([...geeseFollowingStack])
			stack.addItemToStack({
				action: rf.STACK_MOVE_WATER,
				historyEntry: currentStack,
				playerIndex: controller.currentPlayerIndex(),
			})
		}

		// Art & The Atelier: an exhibition caravan landing on another player's starting
		// tile may stage a show (caravan + artwork vanish, recorded as a stack action).
		// If it does, the caravan no longer exists, so there is nothing to re-highlight.
		if (atelier.checkExhibitionOnMove(transporterObj)) return

		// Remove all highlights
		context.resetContextAndHighlights()
		// Now highlight the new items for move/pickup/drop
		store.context.selectedTransporterIDforTM = transporterID
		store.context.action = rf.ACT_TM_SELECT_PICKUP_DROP_MOVE
		highlight.updateAllHighlightsForTransporterMode()

		store.mapData.zoomData.hexID = transporterObj.location[1]
		return
	}
}

function pathWaypoints(path) {
	const store = useModelStore()
	function waypoint(inputLocation) {
		let type = inputLocation[0]

		const hexId = inputLocation[1]
		const hex = computes.computedHexes.value.find((h) => h.hexID === hexId)
		// docked can be left out, since it's always the start or the end
		if (isNonRiverVertexLocation(inputLocation)) {
			let pt = vec.scaleBy(store.RATIO, hex.vertices[inputLocation[2]])
			// Sea vertices look better when using a bit of scale to move
			if (isSeaVertexLocation(inputLocation)) pt = vec.scaleBy(0.75, pt)

			// This is our final chance to rotate the point relative to 0,0
			if (store.hexStyle === rf.FLAT) {
				const angle = Math.PI / 6 // 30 degrees in radians
				const cosA = Math.cos(angle)
				const sinA = Math.sin(angle)

				const [x, y] = pt
				pt = [x * cosA - y * sinA, x * sinA + y * cosA]
			}
			return vec.sum(hex.rawXY, pt)
		} else if (type === rf.LOCATION_RIVER_VERTEX) {
			// River vertex: use hex.riverVertices for positioning
			let pt = vec.scaleBy(store.RATIO, hex.riverVertices[inputLocation[2]])
			// Apply same rotation as vertices
			if (store.hexStyle === rf.FLAT) {
				const angle = Math.PI / 6 // 30 degrees in radians
				const cosA = Math.cos(angle)
				const sinA = Math.sin(angle)

				const [x, y] = pt
				pt = [x * cosA - y * sinA, x * sinA + y * cosA]
			}
			return vec.sum(hex.rawXY, pt)
		} else if (type === rf.LOCATION_RIVER_BUCKET) {
			return hex.rawXY
		}
		return hex.rawXY
	}
	return path.map(waypoint)
}

function offsetPoint(offset) {
	return function (point) {
		return vec.sum(offset, point)
	}
}

// In production phase transp carrying transp cannot do anything
export function getAllLocationsReachableByPlayerIndex(playerIndex, excludeTransportCarryingTransport) {
	let ownTransporters = model.getAllInGameTransporters().filter((t) => t.ownerIndex === playerIndex)
	if (excludeTransportCarryingTransport) ownTransporters = ownTransporters.filter((t) => !model.transporterCarriesTransporter(t.id))
	const ownTransporterLocations = ownTransporters.map((t) => t.location)
	let ownTransporterReachableLocations = []
	for (let i = 0; i < ownTransporterLocations.length; i++) {
		ownTransporterReachableLocations = ownTransporterReachableLocations.concat(getEligibleLocationsForInteractionWithinHexFromSingleLocation(ownTransporterLocations[i], false))
	}
	return util.makeUniqueSubarrays(ownTransporterReachableLocations)
}

// This is also used for DROPPING a transporter - which effectively creates a new one on the hex
export function getLandVertexForNewTransporterFromHexIDandBucketID(hexID, bucketID) {
	const vertex = getAnyVertexInHexIDbucketID(hexID, bucketID)
	const locationFrom = [rf.LOCATION_LAND_VERTEX, hexID, vertex]

	const availableVertexes = getEligibleLocationsForInteractionWithinHexFromSingleLocation(locationFrom, false)
		.filter((l) => l[0] === rf.LOCATION_LAND_VERTEX)
		.map((l) => l[2])

	// Try to not put a trans in the center, which is where a building might be
	if (availableVertexes[0] === 0) availableVertexes.push(availableVertexes.shift())

	const usedVertices = model
		.getAllInGameTransporters()
		.filter((t) => isSpecificHexLocation(t.location, hexID))
		.map((t) => t.location[2])
	// NB we need to use ?? to check undfined, as otherwise using || will reject 0
	const finalVertex = availableVertexes.find((v) => !usedVertices.includes(v)) ?? availableVertexes[0]

	return finalVertex
}

// This is used for DROPPING a transporter - which effectively creates a new one on the hex
export function getSeaVertexForNewTransporterFromHexIDandBucketID(hexID, bucketID) {
	const vertex = getAnyVertexInHexIDbucketID(hexID, bucketID)
	const locationFrom = [rf.LOCATION_SEA_VERTEX, hexID, vertex]

	let availableVertexes = getEligibleLocationsForInteractionWithinHexFromSingleLocation(locationFrom, false)
		.filter((l) => l[0] === rf.LOCATION_SEA_VERTEX)
		.map((l) => l[2])
	availableVertexes = availableVertexes.filter((verteID) => verteID >= 7)
	// Try to not put a trans in the center, which is where a building might be
	if (availableVertexes[0] === 0) availableVertexes.push(availableVertexes.shift())

	const usedVertices = model
		.getAllInGameTransporters()
		.filter((t) => isSpecificHexLocation(t.location, hexID))
		.map((t) => t.location[2])
	// NB we need to use ?? to check undfined, as otherwise using || will reject 0
	const finalVertex = availableVertexes.find((v) => !usedVertices.includes(v)) ?? availableVertexes[0]

	return finalVertex
}

// This is used for DROPPING a transporter - which effectively creates a new one on the hex
export function getRiverVertexForNewTransporterFromHexIDandBucketID(hexID, riverID) {
	const hex = model.getHexByID(hexID)

	const riverVertexes = util.indexArray(hex.riverVertexRiverIds.length).filter((i) => hex.riverVertexRiverIds[i] === riverID)

	const usedVertices = model
		.getAllInGameTransporters()
		.filter((t) => isSpecificHexLocation(t.location, hexID) && t.location[0] === rf.LOCATION_RIVER_VERTEX)
		.map((t) => t.location[2])

	// Try valid stopping vertices first
	const availableVertex = riverVertexes.find((v) => hex.riverStoppingVertex[v] && !usedVertices.includes(v))
	if (availableVertex !== undefined) return availableVertex

	// Then try non-valid vertices
	const availableNonValidVertex = riverVertexes.find((v) => !hex.riverStoppingVertex[v] && !usedVertices.includes(v))
	if (availableNonValidVertex !== undefined) return availableNonValidVertex

	// Fallback to first vertex for this river
	return riverVertexes[0] ?? 0
}

export function getBucketLocationFromVertexLocation(inputLocation) {
	const locationType = inputLocation[0]
	const hexID = inputLocation[1]

	if (locationType === rf.LOCATION_LAND_VERTEX || locationType === rf.LOCATION_SEA_VERTEX) {
		const vertex = inputLocation[2]
		const bucketID = getBucketIDfromAnyHexIDandVertex(hexID, vertex)
		return [rf.LOCATION_BUCKET, hexID, bucketID]
	}

	if (locationType === rf.LOCATION_DOCKED) {
		//[rf.LOCATION_DOCKED, hexId, side, bank, offset]
		const side = inputLocation[2]
		const bank = inputLocation[3]
		return [rf.LOCATION_DOCKED, hexID, side, bank, rf.DOCKED_OFFSET_NONE]
	}

	if (locationType === rf.LOCATION_RIVER_VERTEX) {
		const riverVertex = inputLocation[2]
		const riverID = getRiverIDfromAnyHexIDandRiverVertex(hexID, riverVertex)
		return [rf.LOCATION_RIVER_BUCKET, hexID, riverID]
	}

	rf.doAdminAlrt(`getBucketLocationFromVertexLocation: Unhandled location type: ${JSON.stringify(inputLocation)}`)
	return inputLocation
}

// This will take in a bucket, and give you a vertex location within that
// NB at the moment, it defaults to always returning a new transporter friendly vertex
// If startingLocation and transporterType are provided, uses pathfinding to pick the vertex
// nearest to where the transporter enters the hex (matching real-time move behaviour).
export function getVisualLocationFromBucketLocation(inputLocation, startingLocation = null, transporterType = null, remainingMoves = 999) {
	// We need a bucket location, or ricer bucket location
	if (!isBucketLocation(inputLocation) && !isRiverBucketLocation(inputLocation) && !isDockedLocation(inputLocation)) {
		rf.doAdminAlrt(`Error #71 Converting non bucket: ${JSON.stringify(inputLocation)}`)
		return
	}

	const hexID = inputLocation[1]
	const bucketID = inputLocation[2]
	const hexObj = model.getHexByID(hexID)
	const hexIsSea = hexObj.currentTerrain === rf.TERR_SEA

	// First, handle docked locations
	if (isDockedLocation(inputLocation)) {
		const side = inputLocation[2]
		const bank = inputLocation[3]
		// Check which offsets are already used at this docked location
		const usedOffsets = new Set()
		const transportersAtLocation = model.getAllInGameTransporters().filter((t) => {
			//if (t.id === transporterID) return false
			return t.location[0] === rf.LOCATION_DOCKED && t.location[1] === hexID && t.location[2] === side && (t.location[3] ?? rf.BANK_NONE) === bank
		})
		for (const t of transportersAtLocation) {
			const offset = t.location[4] ?? rf.DOCKED_OFFSET_NONE
			usedOffsets.add(offset)
		}
		// Find first available offset in order: 0 (NONE), 1 (ACW), 2 (CW)
		let assignedOffset = rf.DOCKED_OFFSET_NONE
		if (!usedOffsets.has(rf.DOCKED_OFFSET_NONE)) {
			assignedOffset = rf.DOCKED_OFFSET_NONE
		} else if (!usedOffsets.has(rf.DOCKED_OFFSET_ACW)) {
			assignedOffset = rf.DOCKED_OFFSET_ACW
		} else if (!usedOffsets.has(rf.DOCKED_OFFSET_CW)) {
			assignedOffset = rf.DOCKED_OFFSET_CW
		}
		// Reconstruct the location with the assigned offset
		return setDockedLocation(hexID, side, bank, assignedOffset)
	}

	// If startingLocation and transporterType are provided, use pathfinding to find the best vertex
	if (startingLocation && transporterType !== null) {
		const store = useModelStore()
		let pathfindStart = [...startingLocation]
		if (isBucketLocation(pathfindStart)) {
			pathfindStart = convertLocationToVertex(pathfindStart)
		} else if (isOnAnyTransporter(pathfindStart)) {
			const carrier = model.getTransporterByID(pathfindStart[1])
			if (carrier) pathfindStart = [...carrier.location]
		}

		const stats = rf.getTransporterStats(transporterType)
		const movementGraph = graph.createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, controller.currentPlayerIndex(), transporterType === rf.EXHIBITION_TRANSPORTER)
		const pathfindResult = graph.pathfind(movementGraph, pathfindStart, stats.validMove, remainingMoves)

		const locationIndices = util.indexArray(pathfindResult.locations.length)
		let indicesToValid = util.boolFilter(
			locationIndices,
			locationIndices.map((i) => pathfindResult.cost[i] > 0 && locationAllowsStop(pathfindResult.locations[i]))
		)

		const transportersPerLocation = pathfindResult.locations.map((arrLoc) => model.getAllInGameTransporters().filter((t) => util.arraysEqual(t.location, arrLoc)).length)

		indicesToValid.sort((i, k) =>
			graph.sortTransporterMoveIndices(i, k, {
				pathfind: pathfindResult,
				transportersPerLocation,
			})
		)

		const validMoves = util.getByIndices(pathfindResult.locations, indicesToValid)

		let bestLocation = null
		if (isRiverBucketLocation(inputLocation)) {
			bestLocation = validMoves.find((arrLoc) => isRiverVertexLocation(arrLoc) && arrLoc[1] === hexID && hexObj.riverVertexRiverIds[arrLoc[2]] === bucketID)
		} else {
			bestLocation = validMoves.find((arrLoc) => isNonRiverVertexLocation(arrLoc) && arrLoc[1] === hexID && getBucketIDfromAnyHexIDandVertex(arrLoc[1], arrLoc[2]) === bucketID)
		}

		if (bestLocation) {
			return bestLocation
		}
		// If pathfinding doesn't find a match, fall through to the old logic
	}

	// Then, deal with the river options.
	if (isRiverBucketLocation(inputLocation)) {
		const vertex = getRiverVertexForNewTransporterFromHexIDandBucketID(hexID, bucketID)
		return [rf.LOCATION_RIVER_VERTEX, hexID, vertex]
	}

	// Now, if the hex isn't sea, and we aren't in a river, then we must be on a land bucket. So we want a land vertex location
	if (!hexIsSea) {
		const vertex = getLandVertexForNewTransporterFromHexIDandBucketID(hexID, bucketID)
		return [rf.LOCATION_LAND_VERTEX, hexID, vertex]
	}

	// Finally, if the hex is sea, then we are in a sea bucket. So we want a sea vertex location
	if (hexIsSea) {
		const vertex = getSeaVertexForNewTransporterFromHexIDandBucketID(hexID, bucketID)
		return [rf.LOCATION_SEA_VERTEX, hexID, vertex]
	}
}
