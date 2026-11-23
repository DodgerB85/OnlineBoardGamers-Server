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
import * as atelier from "./RNBatelier.js"
import * as view from "./RNBview.js"

export function isTrainsEnabled() {
	const store = useModelStore()
	return store.gameOptions.useTrains
}

// Hexes are adjacent for trains when the edge between them carries a track.
// A river edge has one lane per bank, so a track on it stays on that bank -
// adjacency is therefore safe to read straight off the lanes.
export function getTrackAdjacencies() {
	const store = useModelStore()
	const adj = {}
	for (const edge of store.mapData.edgeData) {
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

// Every track bucket the transporter can board from. A river vessel can use a
// track on either bank of its hex; a docked ship uses the bucket its dock faces.
export function getTransporterTrackBuckets(transporterObj) {
	const location = transporterObj.location
	if (loc.isDockedLocation(location)) {
		const hex = model.getHexByID(location[1])
		const initialBucketID = loc.getBucketIDadjacentToDockedLocation(location)
		const bucketID = hex.bucketIdsCurrent[initialBucketID]
		return bucketID >= 0 ? [[location[1], bucketID]] : []
	}
	if (loc.isBucketLocation(location) || loc.isLandVertexLocation(location) || loc.isSeaVertexLocation(location)) {
		const bucketLocation = loc.convertLocationToBucket(location)
		return bucketLocation.length >= 3 ? [[bucketLocation[1], bucketLocation[2]]] : []
	}
	if (loc.isRiverBucketLocation(location) || loc.isRiverVertexLocation(location)) {
		return getTrackBucketsInHex(location[1]).map((bucketID) => [location[1], bucketID])
	}
	return []
}

function getDockLocationForTrackBucket(hexID, bucketID) {
	const hex = model.getHexByID(hexID)
	const locations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation([rf.LOCATION_BUCKET, hexID, bucketID], false)
	return locations.find((entry) => loc.isDockedLocation(entry) && hex.bucketIdsCurrent[loc.getBucketIDadjacentToDockedLocation(entry)] === bucketID) ?? null
}

function getRiverIDForTrackBucket(hexID, bucketID) {
	const hex = model.getHexByID(hexID)
	if (!hex || !hex.riverVertexRiverIds) return null
	for (let i = 0; i < hex.riverVertexRiverIds.length; i++) {
		const riverID = hex.riverVertexRiverIds[i]
		if (riverID < 0) continue
		const locations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation([rf.LOCATION_RIVER_VERTEX, hexID, i], false)
		const reachesBucket = locations.some(
			(entry) => (loc.isBucketLocation(entry) && entry[2] === bucketID) || (loc.isLandVertexLocation(entry) && loc.getBucketIDfromAnyHexIDandVertex(entry[1], entry[2]) === bucketID)
		)
		if (reachesBucket) return riverID
	}
	return null
}

// Where a rider gets off. Sea/wet polder: sea vertex (ships and planes only).
// Land/river tile: a ship docks or gets off in the river; planes, caravans and
// land transporters use the land vertex. Blocks sea tracks for land transporters.
export function getTrainDestinationLocation(transporterObj, hexID, bucketID) {
	const hex = model.getHexByID(hexID)
	if (!hex) return null
	const isShip = rf.WATER_TRANSPORTERS.includes(transporterObj.type)
	const isPlane = transporterObj.type === rf.PLANE
	if (rf.TERR_ACTS_LIKE_WATER.includes(hex.currentTerrain)) {
		if (!isShip && !isPlane) return null
		return [rf.LOCATION_SEA_VERTEX, hexID, loc.getSeaVertexForNewTransporterFromHexIDandBucketID(hexID, bucketID)]
	}
	if (isShip) {
		const dock = getDockLocationForTrackBucket(hexID, bucketID)
		if (dock) return loc.getFinalLocationForDockingTransporterID(dock, transporterObj.id)
		const riverID = getRiverIDForTrackBucket(hexID, bucketID)
		if (riverID !== null) return [rf.LOCATION_RIVER_VERTEX, hexID, loc.getRiverVertexForNewTransporterFromHexIDandBucketID(hexID, riverID)]
		return null
	}
	return [rf.LOCATION_LAND_VERTEX, hexID, loc.getAnyVertexInHexIDbucketID(hexID, bucketID)]
}

// shortcut: pseudo mine goods (28) are not tokens to spend
export function isFareResource(res) {
	if (typeof res.uniqueID === "string" && res.uniqueID.substring(1, 3) === "28") return false
	return true
}

// Every good that may pay: carried first (the transporter carries its own fare),
// then following geese, then goods lying on the departure tile.
export function getEligibleTrainFares(transporterID) {
	const transporterObj = model.getTransporterByID(transporterID)
	const fromHexID = transporterObj.location[1]
	const carried = model.resourcesOnTransport(transporterID)
		.filter((r) => isFareAccessible(r, transporterObj))
		.sort((a, b) => a.id - b.id)
	const following = model
		.resourcesFollowingTransporter(transporterID)
		.filter((r) => isFareAccessible(r, transporterObj))
		.sort((a, b) => a.id - b.id)
	const onTile = model
		.getAllInGameResources()
		.filter((r) => isFareAccessible(r, transporterObj) && !loc.isOnAnyTransporter(r.location) && loc.isSpecificHexLocation(r.location, fromHexID))
		.sort((a, b) => a.id - b.id)
	return carried.concat(following, onTile)
}

// shortcut: eligibility only - the player picks which one actually pays
export function findTrainFare(transporterID) {
	return getEligibleTrainFares(transporterID)[0] ?? null
}

// Goods brought by another transporter during this movement phase cannot pay.
// A goose following this transporter may pay as a shortcut: it is dropped and spent.
export function isFareAccessible(fareRes, transporterObj) {
	if (!isFareResource(fareRes)) return false
	if (fareRes.movedTransporterID !== -1 && fareRes.movedTransporterID !== transporterObj.id) return false
	if (loc.isOnSpecificTransporter(fareRes.location, transporterObj.id)) return true
	if (loc.isFollowingTransporter(fareRes.location, transporterObj.id)) return true
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
		for (const bucketID of getTrackBucketsInHex(hexID)) {
			// A sea/wet polder track is only usable by ships and planes; a ship on a
			// land track may only get off at a dock or in a river.
			if (!getTrainDestinationLocation(transporterObj, hexID, bucketID)) continue
			destinations.push([hexID, bucketID])
		}
	}
	return destinations
}

export function canTransporterUseTrain(transporterID) {
	if (!isTrainsEnabled()) return false
	const store = useModelStore()
	if (!rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)) return false
	const transporterObj = model.getTransporterByID(transporterID)
	// Land transporters, ships and planes may use a train. Caravans walk on land
	// but sit outside LAND_TRANSPORTERS (land cap), so allow them explicitly.
	if (
		!transporterObj ||
		!(
			rf.LAND_TRANSPORTERS.includes(transporterObj.type) ||
			rf.WATER_TRANSPORTERS.includes(transporterObj.type) ||
			transporterObj.type === rf.PLANE ||
			transporterObj.type === rf.EXHIBITION_TRANSPORTER
		)
	)
		return false
	if (transporterObj.remainingMoves <= 0) return false
	if (transporterObj.movedThisTurn) return false
	// No preliminary movement: the fare must already be aboard or on the tile
	if (model.doesTransporterHaveAlreadyMovedResource(transporterID)) return false
	if (model.doesTransporterHaveAlreadyMovedTransporter(transporterID)) return false
	const trackBuckets = getTransporterTrackBuckets(transporterObj)
	if (!trackBuckets.some(([hexID, bucketID]) => isBucketOnTrack(hexID, bucketID))) return false
	if (getTrainDestinations(transporterID).length === 0) return false
	if (!findTrainFare(transporterID)) return false
	return true
}

// Step 1 of the ride: remember which good will pay. Nothing is moved or spent
// here, so cancelling back out leaves the good exactly where it was.
export function selectTrainFare(resID) {
	const store = useModelStore()
	const transporterObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
	const fareRes = model.getResByID(resID)
	if (!fareRes || !isFareAccessible(fareRes, transporterObj)) return
	store.context.selectedTrainFareResID = resID
	highlight.updateAllHighlightsForTransporterMode()
}

export function performTrainRide_core(transporterID, toBucketLocation, fareRes, deferFollowingGeese = false) {
	const transporterObj = model.getTransporterByID(transporterID)
	const stats = rf.getTransporterStats(transporterObj.type)
	const toHexID = toBucketLocation[1]
	const toBucket = toBucketLocation[2]

	const toLocation = getTrainDestinationLocation(transporterObj, toHexID, toBucket)
	if (!toLocation) {
		rf.doAdminAlrt(`train: no valid destination for transporter ${transporterID} at hex ${toHexID} bucket ${toBucket}`)
		return
	}
	if (fareRes) fareRes.location = loc.setOOBlocation()

	transporterObj.location = toLocation
	transporterObj.rawTransporterXY = map.getTransporterPositionFromLocation(toLocation, stats, transporterID)
	transporterObj.remainingMoves = 0
	transporterObj.movedThisTurn = true

	for (const carried of model.transportersOnTransporter(transporterID)) {
		carried.rawTransporterXY = map.getTransporterPositionFromLocation(carried.location, rf.getTransporterStats(carried.type), carried.id)
	}
	for (const res of model.resourcesOnTransport(transporterID)) res.movedTransporterID = transporterID

	// Geese get off the train with the transporter they follow. In live play they keep
	// following through the ride animation and are dropped by TransporterSVGimg when it
	// finishes; replay/pre-move apply the final position immediately.
	const geeseDropLocation = [rf.LOCATION_BUCKET, toHexID, toBucket]
	for (const res of model.resourcesFollowingTransporter(transporterID)) {
		res.movedTransporterID = transporterID
		if (deferFollowingGeese) res.autoDropLocationAfterFollowingTransporter = [...geeseDropLocation]
		else res.location = [...geeseDropLocation]
	}
}

// fareRes is the good the player picked in the Select Good step; passing null
// falls back to the deterministic pick (used by replay-less callers and tests).
export function takeTrain(transporterID, toHexID, toBucketID, fareRes) {
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
	const fare = fareRes ?? findTrainFare(transporterID)
	if (!fare || !isFareAccessible(fare, transporterObj)) {
		rf.doAdminAlrt(`takeTrain: no goods available for the train fare`)
		return
	}

	// Snapshot the payload BEFORE the fare is consumed, so verify sees the pre-move state
	const trackBuckets = getTransporterTrackBuckets(transporterObj)
	const fromTrackBucket = trackBuckets.find(([hexID, bucketID]) => isBucketOnTrack(hexID, bucketID))
	if (!fromTrackBucket) {
		rf.doAdminAlrt(`takeTrain: transporter ${transporterID} is not on the track`)
		return
	}
	const fromBucketLocation = [rf.LOCATION_BUCKET, fromTrackBucket[0], fromTrackBucket[1]]
	const toBucketLocation = [rf.LOCATION_BUCKET, toHexID, toBucketID]
	const transporterOntrans = model.transportersOnTransporter(transporterID)
	const resourcesOnTransporter = model.resourcesOnTransport(transporterID)
	// A following goose used as the fare is spent, so it no longer follows
	const geese = model.resourcesFollowingTransporter(transporterID).filter((r) => r.id !== fare.id)

	const currentStack = [rf.STACK_TAKE_TRAIN]
	currentStack.push(stack.getTransIDtoUse(transporterObj))
	currentStack.push([...stack.compressLocation(fromBucketLocation)])
	currentStack.push([...stack.compressLocation(toBucketLocation)])
	if (transporterOntrans.length > 0) currentStack.push([-1, stack.getTransIDtoUse(transporterOntrans[0])])
	else if (resourcesOnTransporter.length > 0) currentStack.push(resourcesOnTransporter.map((r) => stack.getResIDtoUse(r)))
	else currentStack.push([])
	currentStack.push(stack.getResIDtoUse(fare))
	if (geese.length > 0) currentStack.push([geese.length, 1])

	const startXY = [...transporterObj.rawTransporterXY]
	performTrainRide_core(transporterID, toBucketLocation, fare, true)
	animateTrainRide(transporterObj, fromBucketLocation[1], toHexID, startXY)

	stack.addItemToStack({
		action: rf.STACK_TAKE_TRAIN,
		historyEntry: currentStack,
		playerIndex: controller.currentPlayerIndex(),
	})

	context.resetContextAndHighlights()
	store.mapData.zoomData.hexID = toHexID
	// Art: a caravan arriving by train at another player's start tile may stage a show and vanish
	atelier.scheduleExhibitionAfterAnimation(transporterObj, onExhibitionShown)
	store.context.selectedTransporterIDforTM = transporterID
	highlight.updateAllHighlightsForTransporterMode()
}

function onExhibitionShown(outcome) {
	view.showExhibitionPopup(outcome)
	context.resetContextAndHighlights()
	highlight.updateAllHighlightsForTransporterMode()
	context.createUndoPoint()
}

// Shortest hex route along the track, start and end included.
export function getTrackRoute(fromHexID, toHexID) {
	const adj = getTrackAdjacencies()
	const prev = { [fromHexID]: null }
	const queue = [fromHexID]
	while (queue.length > 0 && !(toHexID in prev)) {
		const cur = queue.shift()
		for (const next of adj[cur] || []) {
			if (next in prev) continue
			prev[next] = cur
			queue.push(next)
		}
	}
	if (!(toHexID in prev)) return [fromHexID, toHexID]
	const route = []
	for (let h = toHexID; h !== null; h = prev[h]) route.unshift(h)
	return route
}

// Live play and replay: slide the transporter through the hex centres along the track,
// using the same waypoint animation as a normal move.
export function animateTrainRide(transporterObj, fromHexID, toHexID, startXY) {
	const store = useModelStore()
	const stats = rf.getTransporterStats(transporterObj.type)
	const offset = [stats.width * store.RATIO * 0.5, stats.height * store.RATIO * 0.5]
	const waypoints = getTrackRoute(fromHexID, toHexID)
		.slice(1, -1)
		.map((hexID) => {
			const xy = model.getHexByID(hexID).rawXY
			return [xy[0] - offset[0], xy[1] - offset[1]]
		})
	waypoints.push([...transporterObj.rawTransporterXY])
	view.addTimingsToWaypoints(startXY, waypoints)
	transporterObj.animationWaypoints = waypoints
}
