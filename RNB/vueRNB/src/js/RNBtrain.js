/************************
 *
 * Trains: a land transporter on a track tile pays one goods token and rides
 * to any other tile the track reaches. Track is map data only (see RNBmap.js);
 * this file holds the gameplay rules.
 *
 ************************/

import { useModelStore } from "../stores/RNBstore.js"

import * as rf from "./RNBreference.js"
import * as model from "./RNBmodel.js"
import * as loc from "./RNBlocation.js"
import * as map from "./RNBmap.js"
import * as stack from "./RNBstack.js"
import * as controller from "./RNBcontroller.js"
import * as context from "./RNBcontext.js"
import * as highlight from "./RNBhighlight.js"

export function isTrainsEnabled() {
	const store = useModelStore()
	return store.gameOptions.useTrains
}

// Hexes are adjacent for trains when the edge between them carries a track.
// Tracks never cross a river, so river edges are never part of the network.
export function getTrackAdjacencies() {
	const store = useModelStore()
	const adj = {}
	for (const edge of store.mapData.edgeData) {
		if (edge.hasRiver) continue
		if (!edge.hasTrainTrack || !edge.hasTrainTrack.some(Boolean)) continue
		const [a, b] = edge.edgeHexIDs
		if (a == null || b == null || a < 0 || b < 0) continue
		if (!adj[a]) adj[a] = []
		if (!adj[b]) adj[b] = []
		adj[a].push(b)
		adj[b].push(a)
	}
	return adj
}

// Which buckets on this tile does the track pass through? edgeHasTrainTrack is
// index-aligned with nodeEdges, exactly like edgeHasRoad/edgeHasPowerLine.
export function getTrackBucketsInHex(hexID) {
	const hex = model.getHexByID(hexID)
	const buckets = []
	if (!hex || !hex.edgeHasTrainTrack) return buckets
	for (let i = 0; i < hex.nodeEdges.length; i++) {
		if (!hex.edgeHasTrainTrack[i]) continue
		for (const node of hex.nodeEdges[i]) {
			const bucketID = hex.bucketIdsCurrent[hex.nodeBucketIds[node]]
			if (!buckets.includes(bucketID)) buckets.push(bucketID)
		}
	}
	return buckets
}

export function isBucketOnTrack(hexID, bucketID) {
	return getTrackBucketsInHex(hexID).includes(bucketID)
}

// shortcut: rivers, docks and being carried by another transporter all end the
// ride before it starts. Upgrade to per-bank river handling if ship boarding lands.
function getTransporterTrackBucket(transporterObj) {
	const location = transporterObj.location
	if (!(loc.isBucketLocation(location) || loc.isLandVertexLocation(location) || loc.isSeaVertexLocation(location))) return null
	const bucketLocation = loc.convertLocationToBucket(location)
	return [bucketLocation[1], bucketLocation[2]]
}

// shortcut: geese are not goods, and pseudo mine goods (28) are not tokens to spend
export function isFareResource(res) {
	if (res.type === rf.RES_GOOSE) return false
	if (typeof res.uniqueID === "string" && res.uniqueID.substring(1, 3) === "28") return false
	return true
}

// Deterministic: carried goods first (the transporter carries its own fare),
// then goods lying on the departure tile, lowest id wins in each group.
export function findTrainFare(transporterID) {
	const transporterObj = model.getTransporterByID(transporterID)
	const fromHexID = transporterObj.location[1]
	const carried = model.resourcesOnTransport(transporterID)
		.filter(isFareResource)
		.sort((a, b) => a.id - b.id)
	if (carried.length > 0) return carried[0]
	const onTile = model
		.getAllInGameResources()
		.filter((r) => isFareResource(r) && !loc.isOnAnyTransporter(r.location) && loc.isSpecificHexLocation(r.location, fromHexID))
		.sort((a, b) => a.id - b.id)
	return onTile[0] ?? null
}

// shortcut: the fare must be lying on the departure tile or already aboard,
// not on another transporter waiting there
export function isFareAccessible(fareRes, transporterObj) {
	if (!isFareResource(fareRes)) return false
	if (loc.isOnSpecificTransporter(fareRes.location, transporterObj.id)) return true
	return !loc.isOnAnyTransporter(fareRes.location) && loc.isSpecificHexLocation(fareRes.location, transporterObj.location[1])
}

// Every hex the track network reaches from here, including the start hex.
export function getTrackConnectedHexIDs(startHexID) {
	const adj = getTrackAdjacencies()
	const visited = new Set([startHexID])
	const queue = [startHexID]
	while (queue.length > 0) {
		const cur = queue.shift()
		for (const next of adj[cur] || []) {
			if (visited.has(next)) continue
			visited.add(next)
			queue.push(next)
		}
	}
	return [...visited]
}

// All [hexID, bucketID] pairs the ride can end on. The departure tile is
// excluded: riding to where you already stand just wastes the fare.
export function getTrainDestinations(transporterID) {
	const transporterObj = model.getTransporterByID(transporterID)
	const fromHexID = transporterObj.location[1]
	const connected = getTrackConnectedHexIDs(fromHexID)

	const destinations = []
	for (const hexID of connected) {
		if (hexID === fromHexID) continue
		const hex = model.getHexByID(hexID)
		// shortcut: land transporters cannot end their turn on a water tile
		if (rf.TERR_ACTS_LIKE_WATER.includes(hex.currentTerrain)) continue
		for (const bucketID of getTrackBucketsInHex(hexID)) destinations.push([hexID, bucketID])
	}
	return destinations
}

export function canTransporterUseTrain(transporterID) {
	if (!isTrainsEnabled()) return false
	const store = useModelStore()
	if (!rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) return false
	const transporterObj = model.getTransporterByID(transporterID)
	if (!transporterObj || !rf.LAND_TRANSPORTERS.includes(transporterObj.type)) return false
	if (transporterObj.remainingMoves <= 0) return false
	if (transporterObj.movedThisTurn) return false
	// No preliminary movement: the fare must already be aboard or on the tile
	if (model.doesTransporterHaveAlreadyMovedResource(transporterID)) return false
	if (model.doesTransporterHaveAlreadyMovedTransporter(transporterID)) return false
	const trackBucket = getTransporterTrackBucket(transporterObj)
	if (!trackBucket || !isBucketOnTrack(trackBucket[0], trackBucket[1])) return false
	if (getTrainDestinations(transporterID).length === 0) return false
	if (!findTrainFare(transporterID)) return false
	return true
}

export function performTrainRide_core(transporterID, toBucketLocation, fareRes) {
	const transporterObj = model.getTransporterByID(transporterID)
	const stats = rf.getTransporterStats(transporterObj.type)
	const toHexID = toBucketLocation[1]
	const toBucket = toBucketLocation[2]

	if (fareRes) fareRes.location = loc.setOOBlocation()

	const toLocation = [rf.LOCATION_LAND_VERTEX, toHexID, loc.getAnyVertexInHexIDbucketID(toHexID, toBucket)]
	transporterObj.location = toLocation
	transporterObj.rawTransporterXY = map.getTransporterPositionFromLocation(toLocation, stats, transporterID)
	transporterObj.remainingMoves = 0
	transporterObj.movedThisTurn = true

	for (const carried of model.transportersOnTransporter(transporterID)) {
		carried.rawTransporterXY = map.getTransporterPositionFromLocation(carried.location, rf.getTransporterStats(carried.type), carried.id)
	}
	for (const res of model.resourcesOnTransport(transporterID)) res.movedTransporterID = transporterID

	// Geese get off the train with the transporter they follow
	const geeseDropLocation = [rf.LOCATION_BUCKET, toHexID, toBucket]
	for (const res of model.resourcesFollowingTransporter(transporterID)) {
		res.movedTransporterID = transporterID
		res.location = [...geeseDropLocation]
	}
}

export function takeTrain(transporterID, toHexID, toBucketID) {
	const store = useModelStore()
	const transporterObj = model.getTransporterByID(transporterID)
	if (!canTransporterUseTrain(transporterID)) {
		rf.doAdminAlrt(`takeTrain: transporter ${transporterID} cannot take a train`)
		return
	}
	const destinations = getTrainDestinations(transporterID)
	if (!destinations.some(([hexID, bucketID]) => hexID === toHexID && bucketID === toBucketID)) {
		rf.doAdminAlrt(`takeTrain: hex ${toHexID} bucket ${toBucketID} is not a train destination`)
		return
	}
	const fare = findTrainFare(transporterID)
	if (!fare) {
		rf.doAdminAlrt(`takeTrain: no goods available for the train fare`)
		return
	}

	// Snapshot the payload BEFORE the fare is consumed, so verify sees the pre-move state
	const fromBucketLocation = loc.convertLocationToBucket(transporterObj.location)
	const toBucketLocation = [rf.LOCATION_BUCKET, toHexID, toBucketID]
	const transporterOntrans = model.transportersOnTransporter(transporterID)
	const resourcesOnTransporter = model.resourcesOnTransport(transporterID)
	const geese = model.resourcesFollowingTransporter(transporterID)

	const currentStack = [rf.STACK_TAKE_TRAIN]
	currentStack.push(stack.getTransIDtoUse(transporterObj))
	currentStack.push([...stack.compressLocation(fromBucketLocation)])
	currentStack.push([...stack.compressLocation(toBucketLocation)])
	if (transporterOntrans.length > 0) currentStack.push([-1, stack.getTransIDtoUse(transporterOntrans[0])])
	else if (resourcesOnTransporter.length > 0) currentStack.push(resourcesOnTransporter.map((r) => stack.getResIDtoUse(r)))
	else currentStack.push([])
	currentStack.push(stack.getResIDtoUse(fare))
	if (geese.length > 0) currentStack.push([geese.length, 1])

	performTrainRide_core(transporterID, toBucketLocation, fare)

	stack.addItemToStack({
		action: rf.STACK_TAKE_TRAIN,
		historyEntry: currentStack,
		playerIndex: controller.currentPlayerIndex(),
	})

	context.resetContextAndHighlights()
	store.context.selectedTransporterIDforTM = transporterID
	highlight.updateAllHighlightsForTransporterMode()
	store.mapData.zoomData.hexID = toHexID
}
