/**
 * These are functions to do with manipulating or interacting with the map.
 * NOTE: Pixel / hex coord / layout / display functions are generally in RNBhex
 * This is for more "game" type functions, rather than display/layout
 * If they do not need to be directly in the component, it is easier to put them here.
 * This helps to stop the component getting cluttered up with a lot of functions,
 * and keeps the component mainly for the display
 *
 */

/**
AVAILABLE FUNCTIONS
===================
resetAllEdgeData()
updateEdgeData()
getAnyHexPlacementError(tile, hexRef, rotation)
addBridgeToMap(hexID, bridgeArr, deductResources)
addBuildingToMap(buildingType, location, deductResources)
isVertexGroupValid(vertexGroup)
addWallToMap(hex1ID, hex2ID, playerIndex, deductResources)
clickedRes(event, hexID, resID)
clickedResOnTransporter(transporterID, resourceID)
sortTransporters(transporterID)
clickedTransporter(transporterID)
addRoadToMap([fromHexID, fromBucketId], [toHexID, toBucketId])

*/

import * as rf from "./RNBreference.js"
import * as hd from "./RNBhex.js"
import * as controller from "./RNBcontroller.js"
import * as model from "./RNBmodel.js"
import * as vec from "./RNBvector.js"
import * as util from "./RNButil.js"
import * as loc from "./RNBlocation.js"
import * as graph from "./RNBgraph.js"
import * as highlight from "./RNBhighlight"
//import * as computes from "./RNBcomputes"
import * as context from "./RNBcontext"
import * as prod from "./RNBproduce"
import * as stack from "./RNBstack"
import * as produce from "./RNBproduce"

import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"

export function addNewEdge(hexIds) {
	const store = useModelStore()

	let hexData = model.getHexByID(hexIds[0])
	let otherHexData = model.getHexByID(hexIds[1])
	let joiningSide = hd.getJoiningSide(hexData.coord, otherHexData.coord)
	let otherSide = (joiningSide + 3) % 6
	let hasRiver = hexData.sideRiverVertexIds[joiningSide] >= 0
	// Find out the direction we're going in
	let firstOppositeVertex = (joiningSide + 4) % 6
	let secondOppositeVertex = (firstOppositeVertex + 5) % 6
	let edgeId = store.mapData.edgeData.length

	store.mapData.edgeData.push({
		edgeID: edgeId,
		edgeHexIDs: hexIds,
		wall: [0, -1], // [wallLevel, ownerIndex]
		// DO NOT USE - Wall points calculated on the fly depending on map size / zoom
		//wallSVGpoints: hd.getWallSVGpoints(hexData.hexID, store.mapData.neighbours[i][j], false),
		joiningSides: [joiningSide, otherSide],
		joiningVertexes: [
			[joiningSide, firstOppositeVertex],
			[(joiningSide + 1) % 6, secondOppositeVertex],
		],
		hasRoad: hasRiver ? [false, false] : [false], // Road either side of the river,
		hasRiver: hasRiver,
	})

	// Update the hexes with the edgeData idx
	hexData.edgeLookup[joiningSide] = edgeId
	hexData.hexLookup[joiningSide] = hexIds[1]
	otherHexData.edgeLookup[otherSide] = edgeId
	otherHexData.hexLookup[otherSide] = hexIds[0]
}

export function getJoiningSideFromHexIDs(hex1ID, hex2ID) {
	return hd.getJoiningSide(model.getHexByID(hex1ID).coord, model.getHexByID(hex2ID).coord)
}

/**
 * This function (re)creats ALL the edge data
 */
export function resetAllEdgeData() {
	const store = useModelStore()

	// Reset the edges
	store.mapData.edgeData.splice(0)

	// Neighbours have just been set
	for (let i = 0; i < store.mapData.neighbours.length; i++) {
		for (let j = 0; j < store.mapData.neighbours[i].length; j++) {
			if (store.mapData.neighbours[i][j] > i) {
				addNewEdge([i, store.mapData.neighbours[i][j]])
			}
		}
	}
}

export function updateEdgeData() {
	const store = useModelStore()

	for (let i = 0; i < store.mapData.neighbours.length; i++) {
		for (let j = 0; j < store.mapData.neighbours[i].length; j++) {
			if (store.mapData.neighbours[i][j] > i) {
				const hex1Id = i
				const hex2Id = store.mapData.neighbours[i][j]
				let hexData = model.getHexByID(hex1Id)
				let otherHexData = model.getHexByID(hex2Id)
				let joiningSide = hd.getJoiningSide(hexData.coord, otherHexData.coord)
				if (hexData.edgeLookup[joiningSide] === -1) {
					// Edge doesn't exist, so add it
					addNewEdge([hex1Id, hex2Id])
				}
			}
		}
	}
}

export function getEdgeIDsToBuildWallFromWaterHexID(hexID) {
	const store = useModelStore()
	let res = []
	const landNeighbours = store.mapData.neighbours[hexID].filter((n) => model.getHexByID(n).currentTerrain !== rf.TERR_SEA)
	for (const hexID2 of landNeighbours) {
		const edgeData = model.getEdgeDataFromHexID(hexID, hexID2)
		res.push(edgeData.edgeID)
	}
	return res
}

export function existingEntryPoints(hexId) {
	const store = useModelStore()
	const hex = model.getHexByID(hexId)
	let isEntryPoint = util.makeArrayOfSizeWithFill(hex.nodeBucketIds.length, false)
	for (const side of util.indexArray(6)) {
		const edgeId = hex.edgeLookup[side]
		if (edgeId !== -1) {
			const edge = store.mapData.edgeData[edgeId]
			if (edge.hasRoad.length === 1) {
				isEntryPoint[hex.sideNodeIds[side]] = edge.hasRoad[0]
			} else {
				let offset = hexId === edge.edgeHexIDs[0] ? 0 : 1
				for (const k of [0, 1].filter((k) => edge.hasRoad[k])) {
					isEntryPoint[hex.cornerNodeIds[side][(k + offset) % 2]] = true
				}
			}
		}
	}
	return isEntryPoint
}

export function addRedundantRoads(hexId) {
	const hex = model.getHexByID(hexId)
	let nodeHasRoad = util.makeArrayOfSizeWithFill(hex.nodeBucketIds, false)
	for (let i = 0; i < hex.nodeEdges.length; i++) {
		if (hex.edgeHasRoad[i]) {
			for (const node of hex.nodeEdges[i]) {
				nodeHasRoad[node] = true
			}
		}
	}
	for (let i = 0; i < hex.nodeEdges.length; i++) {
		const nodes = hex.nodeEdges[i]
		if (nodeHasRoad[nodes[0]] && nodeHasRoad[nodes[1]]) {
			hex.edgeHasRoad[i] = true
		}
	}
}

export function updateHexInternalRoadsViaNode(hexId, hexGraph, initialEntryPoints, nodeId) {
	const hex = model.getHexByID(hexId)
	let isEntryPoint = initialEntryPoints.slice()
	for (const bridge of hex.builtBridges) {
		for (const node of bridge) {
			isEntryPoint[node] = true
		}
	}
	isEntryPoint[nodeId] = false

	const pathfind = graph.pathfind(hexGraph, loc.setLandVertexLocation(hexId, nodeId), [rf.MOVE_INTERNAL], 1)
	let indices = util.indexArray(pathfind.locations.length)
	//indices.sort((a, b) => pathfind.distances[a] > pathfind.distances[b])
	indices.sort((a, b) => pathfind.distances[a] - pathfind.distances[b])

	let entryPointIndices = indices.filter((i) => loc.isLandVertexLocation(pathfind.locations[i]) && isEntryPoint[pathfind.locations[i][2]])
	if (entryPointIndices.length === 0) {
		let anchorIndices = indices.filter((i) => loc.isLandVertexLocation(pathfind.locations[i]) && hex.nodeIsRoadAnchor[pathfind.locations[i][2]])
		if (anchorIndices.length > 0) {
			let dest = anchorIndices[0]
			while (dest !== pathfind.previous[dest]) {
				let edgeId = pathfind.viaEdge[dest]
				hex.edgeHasRoad[edgeId] = true
				dest = pathfind.previous[dest]
			}
		}
	} else {
		for (const index of entryPointIndices) {
			let dest = index
			while (dest !== pathfind.previous[dest]) {
				let edgeId = pathfind.viaEdge[dest]
				hex.edgeHasRoad[edgeId] = true
				dest = pathfind.previous[dest]
			}
		}
	}
	addRedundantRoads(hexId)
}

export function updateHexInternalRoads(hexId, nodeIds) {
	const hex = model.getHexByID(hexId)
	const hexGraph = graph.createCompleteGraph([hex], [], -1)
	const isEntryPoint = existingEntryPoints(hexId)

	for (const nodeId of nodeIds) {
		updateHexInternalRoadsViaNode(hexId, hexGraph, isEntryPoint, nodeId)
	}
}

export function clickedHighlight(entry, event = null) {
	const store = useModelStore()
	store.clearMessages()
	const hexID = entry[0]
	const bucketIds = entry[1]
	const clickedLocation = entry[2]
	// CHECK ADMIN MOVES FIRST
	if (store.context.action === rf.ACT_ADMIN_ADD_RES) {
		// This only provides hexID and bucketID.
		// So create a location from that
		let bucketID = bucketIds[0]
		// We need any vertex in this bucketID
		const resLoc = [rf.LOCATION_BUCKET, hexID, bucketID]

		model.addResourceToGame_core(store.adminCheatMoveData.selectedRes, resLoc, 9)
		// Add a hacky history entry to allow replay to work
		model.addHistory(rf.HIST_ADD_CUSTOM_SCENARIO_ELEMENTS, -1, 0, [[rf.CUSTOM_ADD_RESOURCE, [store.adminCheatMoveData.selectedRes, [hexID, bucketID]]]])

		context.resetContextAndHighlights()
		highlight.updateAllHighlightsForTransporterMode()
		return
	} else if (store.context.action === rf.ACT_ADMIN_ADD_BLDG) {
		// This only provides hexID and bucketID.
		// So create a location from that
		let bucketID = bucketIds[0]
		// We need any vertex in this bucketID
		const bldgLoc = [rf.LOCATION_BUCKET, hexID, bucketID]

		addBuildingToMap_core(store.adminCheatMoveData.selectedBldg, bldgLoc, false, -1, 9)
		// Add a hacky history entry to allow replay to work
		model.addHistory(rf.HIST_ADD_CUSTOM_SCENARIO_ELEMENTS, -1, 0, [[rf.CUSTOM_ADD_BUILDING, [store.adminCheatMoveData.selectedBldg, [hexID, bucketID]]]])

		context.resetContextAndHighlights()
		highlight.updateAllHighlightsForTransporterMode()
		return
	} else if (store.context.action === rf.ACT_ADMIN_ADD_TRANSPORTER) {
		// This only provides hexID and bucketID.
		// So create a location from that
		//const hex = model.getHexByID(hexID)
		//let location0 = rf.LOCATION_LAND_VERTEX
		//let bucketID = bucketIds[0]
		// We need any vertex in this bucketID
		//let resVertex = loc.getAnyVertexInHexIDbucketID(hexID, bucketID)
		//if (hex.baseTerrain === rf.TERR_SEA) location0 = rf.LOCATION_SEA_VERTEX
		//const transpLoc = [location0, hexID, resVertex]

		const bucketID = bucketIds[0]
		const transLoc = loc.setBucketLocation(hexID, bucketID)

		model.addTransporterToGame(store.adminCheatMoveData.selectedTransportPlayerIndex, store.adminCheatMoveData.selectedTransporter, transLoc, true)
		const compressedLoc = stack.compressLocation(transLoc)
		model.addHistory(rf.HIST_ADD_CUSTOM_SCENARIO_ELEMENTS, -1, 0, [[rf.CUSTOM_ADD_TRANSPORTER, [store.adminCheatMoveData.selectedTransportPlayerIndex, store.adminCheatMoveData.selectedTransporter, [...compressedLoc]]]])

		if (![rf.ACT_REMOVE_EXCESS_TRANSPORTERS, rf.ACT_REMOVE_EXCESS_TRANSPORTERS_FOR_DONKEY].includes(store.context.action)) {
			context.resetContextAndHighlights()
			highlight.updateAllHighlightsForTransporterMode()
		}
		return
	}

	if (store.gameflow.phase === rf.PHASE_CHOOSE_HOME_TILE) {
		model.setupStartTileForPlayerIndex(controller.currentPlayerIndex(), hexID, bucketIds[0])
		context.resetContextAndHighlights()
		store.context.action = rf.ACT_CONFIRM_END_TURN
	}

	if (rf.PHASE_MOVEMENTS.includes(store.gameflow.phase) || rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase) || rf.PHASE_BUILDINGS.includes(store.gameflow.phase) || rf.PHASE_WONDERS.includes(store.gameflow.phase)) {
		if (store.context.action === rf.ACT_SELECT_WATER_FOR_NEW_TRANSPORTER) {
			// Save this now - it will get wiped if adding the transporter moves to removing excess
			const pendingTransporterTypeForLocationSelectionData = [...store.context.pendingTransporterTypeForLocationSelectionData]
			//const bucketID = bucketIds[0]
			const transBucketLoc = loc.getBucketLocationFromVertexLocation(clickedLocation)
			// Place the new transporter onto the water location
			const finalLocation = model.addTransporterToGame(controller.currentPlayerIndex(), pendingTransporterTypeForLocationSelectionData[0], transBucketLoc, false)
			// Add the stack entry with the location of the transporter
			const buildingID = pendingTransporterTypeForLocationSelectionData[1]
			const transporterID = pendingTransporterTypeForLocationSelectionData[2]
			const buildingLocation = pendingTransporterTypeForLocationSelectionData[3]
			const compressedBuildingLocation = stack.compressLocation([rf.LOCATION_BUCKET, ...buildingLocation])
			const compressedNewBoatLocation = stack.compressWaterLocation(finalLocation)
			// NB Clikcked location needs to be stored as that is where the water transport spwans
			const building = model.getBuildingByID(buildingID)
			const transporterObj = model.getTransporterByID(transporterID)
			let stackAction = [rf.STACK_MANUAL_PRODUCTION, stack.getBldgIDtoUse(building), stack.getTransIDtoUse(transporterObj), [...compressedBuildingLocation], [...compressedNewBoatLocation]]
			stack.addItemToStack({
				action: rf.STACK_MANUAL_PRODUCTION,
				historyEntry: stackAction,
				playerIndex: controller.currentPlayerIndex(),
			})
			building.remainingConversions--
			if (![rf.ACT_REMOVE_EXCESS_TRANSPORTERS, rf.ACT_REMOVE_EXCESS_TRANSPORTERS_FOR_DONKEY].includes(store.context.action)) {
				context.resetContextAndHighlights()
				highlight.updateAllHighlightsForTransporterMode()
			}
			context.createUndoPoint()
			return
		}

		if (store.context.action === rf.ACT_TM_ANY_PHASE_DROP_RES_OR_TRANSPORT || store.context.action === rf.ACT_TM_ANY_PHASE_STRICT_DROP_RES_OR_TRANSPORT || store.context.action === rf.ACT_TM_CHOOSE_GOOSE_DEPOSIT_LOCATION) {
			// Drop the res or transport onto the section
			const strictDrop = store.context.action === rf.ACT_TM_ANY_PHASE_STRICT_DROP_RES_OR_TRANSPORT
			const strictDeposit = store.context.action === rf.ACT_TM_CHOOSE_GOOSE_DEPOSIT_LOCATION
			dropResOrTransporterOnLocation(clickedLocation, strictDrop, strictDeposit)
			return
		}
		if (store.context.action === rf.ACT_TM_SELECT_PICKUP_DROP_MOVE) {
			// Move the transporter
			loc.moveTransporterTo(clickedLocation, store.context.transporterMoveInfo[0], event)
			context.createUndoPoint()
			return
		}
	}

	// CHEAT ONLY - build road code
	if (store.context.action === rf.ACT_BUILD_ROAD /*|| rf.PHASE_BUILDINGS.includes(store.gameflow.phase)*/) {
		store.context.hexPiecesToHighlight.splice(0)
		// If it's the first piece, add it and highlight options
		if (store.context.newRoadInfo.length === 0) {
			store.context.newRoadInfo.push(entry)
			if (bucketIds.length > 1) {
				rf.doAdminAlrt("build road should only highlight single buckets, instead got: " + JSON.stringify(bucketIds))
			}
			context.setHexPiecesToHighlight(allLandVertexBucketsWithoutRoadsAdjacentTo(hexID, bucketIds))
		}
		// Otherwise, add the road into the edge data
		else {
			store.context.newRoadInfo.push(entry)
			// Find the joining side from the first to the 2nd hex
			const fromHexID = store.context.newRoadInfo[0][0]
			const firstFromBucketInList = store.context.newRoadInfo[0][1][0]
			const secondEntry = store.context.newRoadInfo[1]
			// ADMIN CHEAT ONLY
			addRoadToMap([fromHexID, firstFromBucketInList], [secondEntry[0], secondEntry[1][0]])
			return
		}
	}

	// During building phase, the only reason to click a segment is to build a road
	if (rf.PHASE_BUILDINGS.includes(store.gameflow.phase)) {
		if (store.context.action === rf.ACT_TM_BUILD_SELECT_BRIDGE_ROAD_WALL_BUILDING_RES_PICKUP_DROP) {
			if (store.context.newRoadInfo.length === 0) {
				// If it's the first piece, add it to the 'first road' data
				// NB I think you can only get here using "cheat raod"
				store.context.newRoadInfo.push(entry)
				context.clearAllHighlights()
				context.setHexPiecesToHighlight(allLandVertexBucketsWithoutRoadsAdjacentTo(hexID, bucketIds))
			} else {
				const firstEntry = store.context.newRoadInfo[0]
				const fromHexID = firstEntry[0]
				const fromBuckets = firstEntry[1]
				const toHexID = entry[0]
				const firstToBucket = entry[1][0]
				// NB you are clicking directly on a bucket, so should only be 1
				// Bridges do not affect these highlights, so can never be more than 1 bucket
				let fromBucketToUse = fromBuckets[0]
				if (fromBuckets.length > 0) {
					const fromHex = model.getHexByID(fromHexID)
					const toHex = model.getHexByID(toHexID)
					const fromHexSide = hd.getJoiningSide(fromHex.coord, toHex.coord)
					const toHexSide = (fromHexSide + 3) % 6
					const edge = store.mapData.edgeData[fromHex.edgeLookup[fromHexSide]]
					for (const fromBucket of fromBuckets) {
						let connects = false
						if (fromHex.sideNodeIds[fromHexSide] !== -1) {
							const b1 = fromHex.bucketIdsInitial[fromHex.nodeBucketIds[fromHex.sideNodeIds[fromHexSide]]]
							const b2 = toHex.bucketIdsInitial[toHex.nodeBucketIds[toHex.sideNodeIds[toHexSide]]]
							if (b1 === fromBucket && b2 === firstToBucket) {
								connects = true
							}
						} else {
							const cornerSide = edge.edgeHexIDs[0] === fromHexID ? [0, 1] : [1, 0]
							const otherCornerSide = cornerSide.map((i) => (i + 1) % 2)
							for (const k of [0, 1]) {
								const b1 = fromHex.bucketIdsInitial[fromHex.nodeBucketIds[fromHex.cornerNodeIds[fromHexSide][cornerSide[k]]]]
								const b2 = toHex.bucketIdsInitial[toHex.nodeBucketIds[toHex.cornerNodeIds[toHexSide][otherCornerSide[k]]]]
								if (b1 === fromBucket && b2 === firstToBucket) {
									connects = true
									break
								}
							}
						}
						if (connects) {
							fromBucketToUse = fromBucket
							break
						}
					}
				}
				addRoadToMap([fromHexID, fromBucketToUse], [toHexID, firstToBucket], true)
				return
			}
		}
		if (store.context.action === rf.ACT_TM_CHOOSE_BUILDING_SEGMENT) {
			let bldgNum = store.context.selectedBuildingToBuild
			addBuildingToMap(bldgNum, clickedLocation, true)
			return
		}
	}
}

export function dropResOrTransporterOnLocation(dropLocationInput, strictDrop = false, strictDeposit = false) {
	const store = useModelStore()
	let transporterID = store.context.selectedTransporterIDforTM
	const compressedLoc = stack.compressLocation(dropLocationInput)

	if (store.context.resIDbeingMoved !== -1) {
		const bucketLocation = loc.convertLocationToBucket(dropLocationInput)
		const hexID = dropLocationInput[1]
		const dropBucket = loc.getBucketIDfromAnyHexIDandVertex(dropLocationInput[1], dropLocationInput[2])
		const dropLocation = [rf.LOCATION_BUCKET, hexID, dropBucket]
		if (!loc.isBucketLocation(dropLocation)) rf.doAdminAlrt("Non bucket dropping location")
		if (dropLocationInput.length !== 3) rf.doAdminAlrt("Location Length inconsistent")

		let stackAction = []
		if (strictDrop) {
			const resObj = model.getResByID(store.context.resIDbeingMoved)
			const transporterObj = model.getTransporterByID(transporterID)
			stackAction = [rf.STACK_STRICT_DROP_RES, stack.getTransIDtoUse(transporterObj), [stack.getResIDtoUse(resObj)], [...compressedLoc]]
			stack.addItemToStack({
				action: rf.STACK_STRICT_DROP_RES,
				historyEntry: stackAction,
				playerIndex: controller.currentPlayerIndex(),
			})
		} else if (strictDeposit) {
			const resObj = model.getResByID(store.context.resIDbeingMoved)
			const transporterObj = model.getTransporterByID(transporterID)
			stackAction = [rf.STACK_DROP_RES_FOLLOWING, stack.getTransIDtoUse(transporterObj), [stack.getResIDtoUse(resObj)], [...compressedLoc]]
			stack.addItemToStack({
				action: rf.STACK_DROP_RES_FOLLOWING,
				historyEntry: stackAction,
				playerIndex: controller.currentPlayerIndex(),
			})
		} else {
			// This is a strict ferry action.
			const resObj = model.getResByID(store.context.resIDbeingMoved)
			const resLocation = resObj.location

			// However, for shortcuts, the SELECTRD transp could be a donkey.
			// So if the transporter is not a water one, then find a valid water transp id and use that
			let transporterIDtoUse = transporterID
			const transporterObjOriginal = model.getTransporterByID(transporterIDtoUse)
			// Check your ORIGINAL transporter can get to the bucket the res is in
			const validLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObjOriginal.location, false)
			if (!util.includesArray(validLocations, resLocation)) {
				// Find the eligible water transporters
				const playerIndex = transporterObjOriginal.ownerIndex
				const waterTransporters = model.getTransportersByPlayerIndexAndHexID(playerIndex, hexID).filter((t) => rf.WATER_TRANSPORTERS.includes(t.type) && loc.isRiverVertexLocation(t.location) && loc.isSpecificHexLocation(t.location, hexID))
				// We want any of these that has DIRECT access to the res (in case it's a brackets river double ferry)
				for (const waterTrans of waterTransporters) {
					// find buckets accessible to the river transp
					const validLocations2 = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(waterTrans.location, false)
					if (util.includesArray(validLocations2, resLocation)) {
						transporterIDtoUse = waterTrans.id
						break
					}
				}
			}
			const transporterObjToUse = model.getTransporterByID(transporterIDtoUse)
			stackAction = [rf.STACK_STRICT_FERRY_RES, stack.getTransIDtoUse(transporterObjToUse), [stack.getResIDtoUse(resObj)], [...compressedLoc]] // was location[2]
			stack.addItemToStack({
				action: rf.STACK_STRICT_FERRY_RES,
				historyEntry: stackAction,
				playerIndex: controller.currentPlayerIndex(),
				// Additional info: from bucket
			})
		}

		dropResOnLocation_core(store.context.resIDbeingMoved, bucketLocation)
	} else if (store.context.transporterIDbeingMoved !== -1) {
		// create the stack
		const mainTransObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
		const carriedTransObj = model.getTransporterByID(store.context.transporterIDbeingDropped)
		let stackAction = [rf.STACK_DROP_TRANSPORTER, stack.getTransIDtoUse(mainTransObj), stack.getTransIDtoUse(carriedTransObj), [...compressedLoc]]
		stack.addItemToStack({
			action: rf.STACK_DROP_TRANSPORTER,
			historyEntry: stackAction,
			playerIndex: controller.currentPlayerIndex(),
		})

		dropTransporterOnLocation_core(store.context.transporterIDbeingDropped, dropLocationInput)
	}

	context.resetContextAndHighlights()
	store.context.selectedTransporterIDforTM = transporterID
	store.context.action = rf.ACT_TM_SELECT_PICKUP_DROP_MOVE
	highlight.updateAllHighlightsForTransporterMode()
	context.createUndoPoint()
}

export function dropResOnLocation_core(resID, dropLocation) {
	const res = model.getResByID(resID)
	if (loc.isBucketLocation(dropLocation)) res.location = [...dropLocation]
	else if (loc.isLandVertexLocation(dropLocation)) {
		const bucketID = loc.getBucketIDfromAnyHexIDandVertex(dropLocation[1], dropLocation[2])
		res.location = [rf.LOCATION_BUCKET, dropLocation[1], bucketID]
	} else if (loc.isSeaVertexLocation(dropLocation) && hasOilRigOnHexID(dropLocation[1])) {
		const bucketID = loc.getBucketIDfromAnyHexIDandVertex(dropLocation[1], dropLocation[2])
		res.location = [rf.LOCATION_BUCKET, dropLocation[1], bucketID]
	} else rf.doAdminAlrt("Non land dropping location map-DROLC")
}

export function dropTransporterOnLocation_core(transporterID, dropLocation) {
	const transporter = model.getTransporterByID(transporterID)
	transporter.location = dropLocation
}

export function addRoadToMap([fromHexID, fromBucketId], [toHexID, toBucketId], deductResources) {
	const store = useModelStore()

	// First make sure you can deduct the resources. This flag can be set false for map creation / debug
	if (deductResources) {
		let errorFlag = model.removeResourcesFromGameUsingTransporter(store.context.selectedTransporterIDforTM, [rf.RES_STONE], true)
		if (errorFlag === 1) {
			// Alrt is ok as this should never happen - if not enough res then it shouldn't allow highlight
			rf.doAdminAlrt("You don't have enough resources to build a road")
			return
		}
	}

	// Add the road
	addRoadToMap_core([fromHexID, fromBucketId], [toHexID, toBucketId], store.context.selectedTransporterIDforTM, deductResources)

	// Add to the stack
	const compressedFromLocation = stack.compressLocation([rf.LOCATION_BUCKET, fromHexID, fromBucketId])
	const compressedToLocation = stack.compressLocation([rf.LOCATION_BUCKET, toHexID, toBucketId])
	const transporterObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
	let stackAction = [rf.STACK_BUILD_ROAD, stack.getTransIDtoUse(transporterObj), [...compressedFromLocation], [...compressedToLocation]]
	if (store.context.action !== rf.ACT_BUILD_ROAD)
		stack.addItemToStack({
			action: rf.STACK_BUILD_ROAD,
			historyEntry: stackAction,
			playerIndex: controller.currentPlayerIndex(),
		})

	// Reset the context
	highlight.updateAllHighlightsForTransporterMode()
	context.createUndoPoint()
}

export function addRoadToMap_core([fromHexID, fromBucketId], [toHexID, toBucketId], transporterID, deductResources) {
	const store = useModelStore()

	if (deductResources) {
		let errorFlag = model.removeResourcesFromGameUsingTransporter(transporterID, [rf.RES_STONE], false)
		if (errorFlag === 1) {
			rf.doAdminAlrt("ERROR: No resources for building road - but this should already have been checked or proven")
			return
		}
	}

	// Find the joining side from the first to the 2nd hex
	const fromHex = model.getHexByID(fromHexID)
	const toHex = model.getHexByID(toHexID)
	const fromHexSide = hd.getJoiningSide(fromHex.coord, toHex.coord)
	const toHexSide = (fromHexSide + 3) % 6
	const edgeData = store.mapData.edgeData[fromHex.edgeLookup[fromHexSide]]
	const flipped = edgeData.edgeHexIDs[1] === fromHexID
	const hexIds = flipped ? [toHexID, fromHexID] : [fromHexID, toHexID]
	const hexSides = flipped ? [toHexSide, fromHexSide] : [fromHexSide, toHexSide]
	const bucketIds = flipped ? [toBucketId, fromBucketId] : [fromBucketId, toBucketId]
	const hexes = hexIds.map(model.getHexByID)

	let entryNodes = [-1, -1]

	// If there is only 1 road option, then build the road
	if (edgeData.hasRoad.length === 1) {
		edgeData.hasRoad = [true]
		entryNodes = [0, 1].map((j) => hexes[j].sideNodeIds[hexSides[j]])
	}
	// Otherwise we need to find which side of the river the road should be
	else {
		const firstHexCorner = hexes[0].cornerNodeIds[hexSides[0]][0]
		const secondHexCorner = hexes[1].cornerNodeIds[hexSides[1]][1]
		const oppositeCorner = hexes[0].nodeBucketIds[firstHexCorner] !== bucketIds[0] || hexes[1].nodeBucketIds[secondHexCorner] !== bucketIds[1]
		const actual = oppositeCorner ? 1 : 0
		edgeData.hasRoad[actual] = true
		entryNodes = [0, 1].map((k) => hexes[k].cornerNodeIds[hexSides[k]][(actual + k) % 2])
	}
	for (const k of [0, 1]) {
		updateHexInternalRoads(hexIds[k], [entryNodes[k]])
	}
}

export function clickedBridgeOption(entry) {
	const store = useModelStore()
	const hexID = entry[0]
	// Add a bridge
	if (store.context.action === rf.ACT_TM_BUILD_SELECT_BRIDGE_ROAD_WALL_BUILDING_RES_PICKUP_DROP) {
		addBridgeToMap(hexID, entry[1], true)
		highlight.updateAllHighlightsForTransporterMode()
	} else {
		addBridgeToMap(hexID, entry[1], false)
		store.context.eligibleBridgesToBuild.splice(0)
	}
}

// Adds a bridge to the hex, and recalculates the nodeBucketIdsCurrent according to all bridges
export function addBridgeToMap(hexID, bridgeArr, deductResources) {
	const store = useModelStore()
	addBridgeToMap_core(hexID, store.context.selectedTransporterIDforTM, bridgeArr, deductResources)

	// Add to the stack
	const hex = model.getHexByID(hexID)
	const transporterObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
	if (hex.bridges.length === 1 || util.arraysEqual(bridgeArr, hex.bridges[0])) {
		let stackAction = [rf.STACK_BUILD_BRIDGE, stack.getTransIDtoUse(transporterObj), hexID]
		stack.addItemToStack({
			action: rf.STACK_BUILD_BRIDGE,
			historyEntry: stackAction,
			playerIndex: controller.currentPlayerIndex(),
		})
	} else {
		let bridgeIdx = hex.bridges.findIndex((b) => util.arraysEqual(b, bridgeArr))
		let stackAction = [rf.STACK_BUILD_BRIDGE, stack.getTransIDtoUse(transporterObj), hexID, bridgeIdx]
		stack.addItemToStack({
			action: rf.STACK_BUILD_BRIDGE,
			historyEntry: stackAction,
			playerIndex: controller.currentPlayerIndex(),
		})
	}

	context.createUndoPoint()
}

export function addBridgeToMap_core(hexID, transporterID, bridgeArr, deductResources) {
	const store = useModelStore()
	const hex = model.getHexByID(hexID)
	// First make sure you can deduct the resources. This flag can be set false for map creation / debug
	if (deductResources) {
		let errorFlag = model.removeResourcesFromGameUsingTransporter(transporterID, [rf.RES_STONE], false)
		if (errorFlag === 1) {
			// Alrt is ok as this should never happen - if not enough res then it shouldn't allow highlight
			rf.doAdminAlrt("You don't have enough resources to build a bridge")
			return
		}
	}

	hex.nodeEdges.push(bridgeArr)
	hex.edgeHasRoad.push(false)
	hex.builtBridges.push(bridgeArr)
	let a = hex.bucketIdsCurrent[hex.nodeBucketIds[bridgeArr[0]]]
	let b = hex.bucketIdsCurrent[hex.nodeBucketIds[bridgeArr[1]]]

	const minVal = Math.min(a, b)
	const maxVal = Math.max(a, b)

	// Set ALL max val to min vals, to cope with multi-bridge hexes
	hex.bucketIdsCurrent = hex.bucketIdsCurrent.map((id) => (id === maxVal ? minVal : id))

	// Now update the resources
	const allResInBucket = model.getAllInGameResources().filter((r) => loc.isSpecificHexLocation(r.location, hexID) && loc.isBucketLocation(r.location) && r.location[2] === maxVal)
	allResInBucket.forEach((r) => {
		r.location[2] = minVal
	})

	// And update any buildings
	const allBldgsInBucket = model.getAllInGameBuildings().filter((b) => loc.isSpecificHexLocation(b.location, hexID) && loc.isBucketLocation(b.location) && b.location[2] === maxVal)
	allBldgsInBucket.forEach((b) => {
		b.location[2] = minVal
	})

	// And update any home markers
	const allHomeMarkersInBucket = store.ALL_HOME_MARKERS.filter((hm) => loc.isSpecificHexLocation(hm.location, hexID) && loc.isBucketLocation(hm.location) && hm.location[2] === maxVal)
	allHomeMarkersInBucket.forEach((hm) => {
		hm.location[2] = minVal
	})

	const isEntryPoint = existingEntryPoints(hexID)
	updateHexInternalRoads(hexID, util.boolFilter(util.indexArray(isEntryPoint.length), isEntryPoint))
}

export function checkAddingBuildingToMap(bldgNum) {
	const store = useModelStore()
	// Find the transporter
	let transporterID = store.context.selectedTransporterIDforTM
	if (transporterID < 0) {
		rf.doAdminAlrt("No transporter selected")
		return
	}
	let transporterObj = model.getTransporterByID(transporterID)
	const transporterLocation = transporterObj.location
	if (transporterLocation[0] === rf.LOCATION_TRANSPORTER) {
		return
	}
	const reachable = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterLocation, true, "cabtm")
	let vertexBuckets = model.getVertexBucketsFromLocations(reachable)
	if (vertexBuckets.length === 1) {
		addBuildingToMap(bldgNum, reachable[0], true)
		highlight.updateAllHighlightsForTransporterMode()
		return
	} else {
		context.clearAllHighlights()
		store.context.action = rf.ACT_TM_CHOOSE_BUILDING_SEGMENT
		store.context.selectedBuildingToBuild = bldgNum
		context.setHexPiecesToHighlight(vertexBuckets.map(model.withInitialBuckets))
	}
}

export function reshaftMine(deductResources) {
	const store = useModelStore()
	// Find the transporter
	let transporterID = store.context.selectedTransporterIDforTM
	if (transporterID < 0) {
		rf.doAdminAlrt("No transporter selected")
		return
	}
	let transporterObj = model.getTransporterByID(transporterID)
	const transporterLocation = transporterObj.location
	if (transporterLocation[0] === rf.LOCATION_TRANSPORTER) {
		return
	}

	// Find the mine
	const hexID = transporterLocation[1]
	const buildingsOnTile = model.getAllInGameBuildings().filter((b) => loc.isSpecificHexLocation(b.location, hexID))
	const mineObj = buildingsOnTile.find((b) => b.type === rf.BLDG_MINE)
	if (!mineObj) {
		rf.doAdminAlrt("Mine not founf M.RS")
		return
	}

	// First make sure you can deduct the resources. This flag can be set false for map creation / debug
	if (deductResources) {
		let requiredResources = [rf.RES_FUEL, rf.RES_IRON]
		let errorFlag = model.removeResourcesFromGameUsingTransporter(store.context.selectedTransporterIDforTM, requiredResources, true)
		if (errorFlag === 1) {
			rf.doAdminAlrt("You don't have enough resources to build that building")
			return
		}
		// Removed in _core
	}

	reshaftMine_core(store.context.selectedTransporterIDforTM, mineObj.id, store.context.mineSelectionType, deductResources)

	// Add it to the stack
	let compressedLocation = stack.compressLocation(mineObj.location)
	let stackAction = [rf.STACK_RESHAFT_MINE, stack.getTransIDtoUse(transporterObj), stack.getBldgIDtoUse(mineObj), [...compressedLocation]]
	if (store.context.mineSelectionType !== 0) stackAction.push(store.context.mineSelectionType)
	stack.addItemToStack({
		action: rf.STACK_RESHAFT_MINE,
		historyEntry: stackAction,
		playerIndex: controller.currentPlayerIndex(),
	})

	// Reset the context
	context.resetContextAndHighlights()
	store.context.selectedTransporterIDforTM = transporterID
	// You can only build a bldg if you're in build phase and TM. So set the action directly
	store.context.action = rf.ACT_TM_BUILD_SELECT_BRIDGE_ROAD_WALL_BUILDING_RES_PICKUP_DROP
	highlight.updateAllHighlightsForTransporterMode()
	context.createUndoPoint()
}

export function reshaftMine_core(transporterID, buildingID, mineSelectionType, deductResources) {
	if (deductResources) {
		let requiredResources = [rf.RES_FUEL, rf.RES_IRON]
		let errorFlag = model.removeResourcesFromGameUsingTransporter(transporterID, requiredResources, false)
		if (errorFlag === 1) {
			rf.doAdminAlrt("ERROR: No resources for building mine reshaft - but this should already have been checked or proven")
			return
		}
	}

	const mineObj = model.getBuildingByID(buildingID)

	let newContent = [3, 3]
	if (mineSelectionType === rf.MINE_IRON) {
		// Iron spec
		newContent = [0, 4]
	} else if (mineSelectionType === rf.MINE_GOLD) {
		// Gold spec
		newContent = [4, 0]
	} else if (mineSelectionType === rf.MINE_BIG) {
		// big spec
		newContent = [5, 5]
	}

	mineObj.remainingMineContent[0] += newContent[0]
	mineObj.remainingMineContent[1] += newContent[1]
}

export function addBuildingToMap(buildingType, newLocation, deductResources) {
	const store = useModelStore()

	let bldgStats = rf.BUILDING_STATS.find((b) => b.building === buildingType)

	// First make sure you can deduct the resources. This flag can be set false for map creation / debug
	if (deductResources) {
		let requiredResources = JSON.parse(JSON.stringify(bldgStats.cost))
		let errorFlag = model.removeResourcesFromGameUsingTransporter(store.context.selectedTransporterIDforTM, requiredResources, true)
		if (errorFlag === 1) {
			rf.doAdminAlrt("You don't have enough resources to build that building")
			return
		}
		// Actual deduction done in _core
	}

	// So there are enough resources, so add the building
	addBuildingToMap_core(buildingType, newLocation, deductResources, store.context.selectedTransporterIDforTM, store.context.mineSelectionType, controller.currentPlayerIndex())

	// Add to the stack - can assume it's a land location UNLESS oil rig
	const compressedBldgLocation = stack.compressLocation(newLocation)
	const transporterObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
	let stackAction = [rf.STACK_BUILD_BUILDING, stack.getTransIDtoUse(transporterObj), buildingType, [...compressedBldgLocation]]
	if (buildingType === rf.BLDG_MINE) stackAction = [rf.STACK_BUILD_BUILDING, stack.getTransIDtoUse(transporterObj), buildingType, [...compressedBldgLocation], store.context.mineSelectionType]
	stack.addItemToStack({
		action: rf.STACK_BUILD_BUILDING,
		historyEntry: stackAction,
		playerIndex: controller.currentPlayerIndex(),
	})

	// Reset the context
	let transporterID = store.context.selectedTransporterIDforTM
	context.resetContextAndHighlights()
	store.context.selectedTransporterIDforTM = transporterID
	// You can only build a bldg if you're in build phase and TM. So set the action directly
	store.context.action = rf.ACT_TM_BUILD_SELECT_BRIDGE_ROAD_WALL_BUILDING_RES_PICKUP_DROP
	highlight.updateAllHighlightsForTransporterMode()
	context.createUndoPoint()
}

export function addBuildingToMap_core(buildingType, inputLocation, deductResources, transporterID, mineSelectionType, playerIndex, turnForUniqueID) {
	const store = useModelStore()
	if (!turnForUniqueID) turnForUniqueID = store.gameflow.turn
	let bldgStats = rf.BUILDING_STATS.find((b) => b.building === buildingType)

	if (deductResources) {
		let requiredResources = JSON.parse(JSON.stringify(bldgStats.cost))
		let errorFlag = model.removeResourcesFromGameUsingTransporter(transporterID, requiredResources, false)
		if (errorFlag === 1) {
			rf.doAdminAlrt("ERROR: No resources for building main building - but this should already have been checked or proven")
			return 9
		}
	}
	let newLocation = loc.convertLocationToBucket(inputLocation)

	let nextID = store.ALL_BUILDINGS.length

	let nextUniqueID = 0
	let finalUniqueIDString = ""
	let isUnique = false

	// Loop until we find an ID string that doesn't exist yet
	while (!isUnique) {
		finalUniqueIDString = `${String(playerIndex)}${String(buildingType).padStart(2, "0")}${String(turnForUniqueID).padStart(2, "0")}${String(newLocation[1]).padStart(3, "0")}${String(nextUniqueID).padStart(2, "0")}`

		// Check if any building already has this uniqueID
		const collision = store.ALL_BUILDINGS.some((b) => b.uniqueID === finalUniqueIDString)

		if (!collision) {
			isUnique = true
		} else {
			nextUniqueID++
		}
	}

	if (buildingType === rf.BLDG_MINE) {
		let remainingMineContent = [3, 3]
		if (mineSelectionType === rf.MINE_IRON) {
			// Iron spec
			remainingMineContent = [0, 4]
		} else if (mineSelectionType === rf.MINE_GOLD) {
			// Gold spec
			remainingMineContent = [4, 0]
		} else if (mineSelectionType === rf.MINE_BIG) {
			// big spec
			remainingMineContent = [5, 5]
		}
		store.ALL_BUILDINGS.push({
			id: nextID,
			type: buildingType,
			gfx: "bldg_" + String(buildingType),
			location: [...newLocation],
			remainingConversions: bldgStats.maxConversions,
			rawXY: [0, 0],
			remainingMineContent: [...remainingMineContent],
			uniqueID: finalUniqueIDString,
		})
	} else
		store.ALL_BUILDINGS.push({
			id: nextID,
			type: buildingType,
			gfx: "bldg_" + String(buildingType),
			location: [...newLocation],
			remainingConversions: bldgStats.maxConversions,
			rawXY: [0, 0],
			uniqueID: finalUniqueIDString,
		})
}

export function hasOilRigOnHexID(hexID) {
	return model.getAllInGameBuildings().some((b) => b.type === rf.BLDG_OILRIG && b.location[1] === hexID)
}

export function clickedWallOption(entry) {
	const store = useModelStore()
	if (store.context.action === rf.ACT_TM_BUILD_SELECT_BRIDGE_ROAD_WALL_BUILDING_RES_PICKUP_DROP) {
		// Check if it's a build or a demolish - done in addWallToMap_core function
		addWallToMap(entry[0], entry[1], controller.currentPlayerIndex(), true)
		highlight.updateAllHighlightsForTransporterMode()
	}
	// if you don't have a transporter selected, assume it's a "cheat" wall build
	else addWallToMap(entry[0], entry[1], controller.currentPlayerIndex(), false)
}

export function addWallToMap(hex1ID, hex2ID, playerIndex, deductResources) {
	const store = useModelStore()
	const wallActionArr = addWallToMap_core(store.context.selectedTransporterIDforTM, hex1ID, hex2ID, playerIndex, deductResources)
	const wallAction = wallActionArr[0]
	const shiftedBoatIDs = wallActionArr[1]
	// Add to stack
	let [id1, id2] = hex1ID < hex2ID ? [hex1ID, hex2ID] : [hex2ID, hex1ID]
	let edgeEntry = model.getEdgeDataFromHexID(id1, id2)
	let currentLevel = edgeEntry.wall[0]
	// NB the level has ALREADY been increased above
	const newLevel = currentLevel
	// When adding stack, want to have the hexID the transporter is on first, if possible
	let stackAction = []
	const transporterObj = deductResources ? model.getTransporterByID(store.context.selectedTransporterIDforTM) : {}
	const transporterHexID = deductResources ? (loc.isAnyHexLocation(transporterObj.location) ? transporterObj.location[1] : -1) : -1

	// Add build wall to stack
	if (wallAction === 1) {
		stackAction = [rf.STACK_BUILD_WALL, stack.getTransIDtoUse(transporterObj), hex1ID, hex2ID, newLevel]
		if (transporterHexID !== -1 && transporterHexID === hex2ID) {
			stackAction = [rf.STACK_BUILD_WALL, stack.getTransIDtoUse(transporterObj), hex2ID, hex1ID, newLevel]
		}
		if (shiftedBoatIDs.length > 0) {
			stackAction.push([...shiftedBoatIDs])
		}
		stack.addItemToStack({
			action: rf.STACK_BUILD_WALL,
			historyEntry: stackAction,
			playerIndex: controller.currentPlayerIndex(),
		})
	}
	// Add demolish wall to stack
	else if (wallAction === -1) {
		stackAction = [rf.STACK_DEMOLISH_WALL, stack.getTransIDtoUse(transporterObj), hex1ID, hex2ID, currentLevel]
		if (transporterHexID !== -1 && transporterHexID === hex2ID) {
			stackAction = [rf.STACK_DEMOLISH_WALL, stack.getTransIDtoUse(transporterObj), hex2ID, hex1ID, currentLevel]
		}
		stack.addItemToStack({
			action: rf.STACK_DEMOLISH_WALL,
			historyEntry: stackAction,
			playerIndex: controller.currentPlayerIndex(),
		})
	}

	context.createUndoPoint()
}

export function addWallToMap_core(transporterID, hex1ID, hex2ID, playerIndex, deductResources, forceBuild) {
	let [id1, id2] = hex1ID < hex2ID ? [hex1ID, hex2ID] : [hex2ID, hex1ID]
	let edgeEntry = model.getEdgeDataFromHexID(id1, id2)
	let currentLevel = edgeEntry.wall[0]
	let currentOwner = edgeEntry.wall[1]
	// First make sure you can deduct the resources. This flag can be set false for map creation / debug
	if (deductResources) {
		const transporterObj = model.getTransporterByID(transporterID)
		const transporterLocation = transporterObj.location
		let resIncreaseDueBuildingFromWater = 0
		if (loc.isWaterVertexLocation(transporterLocation)) resIncreaseDueBuildingFromWater = 2
		let requiredResources = []
		let stoneUsed = true
		// At level 0, you are building the first wall
		if (currentLevel === 0) {
			requiredResources = [rf.RES_STONE]
			for (let i = 0; i < resIncreaseDueBuildingFromWater; i++) requiredResources.push(rf.RES_STONE)
		}
		// Else if you own it, OR are building up a demolished wall, need lvl+1 stone
		else if (currentOwner === playerIndex || currentOwner === -1) {
			for (let i = 0; i <= currentLevel; i++) requiredResources.push(rf.RES_STONE)
			for (let i = 0; i < resIncreaseDueBuildingFromWater; i++) requiredResources.push(rf.RES_STONE)
		}
		// Otherwise to demolish it, need boards + level
		else {
			requiredResources.splice(0)
			stoneUsed = false
			for (let i = 0; i <= currentLevel; i++) requiredResources.push(rf.RES_BOARDS)
			for (let i = 0; i < resIncreaseDueBuildingFromWater; i++) requiredResources.push(rf.RES_BOARDS)
		}
		let errorFlag = model.removeResourcesFromGameUsingTransporter(transporterID, requiredResources)
		if (errorFlag === 1) {
			rf.doAdminAlrt(`You don't have enough resources to do a wall. Stone used? ${stoneUsed}, TransporterID: ${transporterID} requiredResources: ${JSON.stringify(requiredResources)}, currentLevel: ${currentLevel}, currentOwner: ${currentOwner}, forceBuild: ${forceBuild}`)
			return
		}
	}
	// If it is level 0, or you own it, OR FORCE BUILD (eg map editor) add a level
	if (currentLevel === 0 || currentOwner === playerIndex || currentOwner === -1 || forceBuild === true) {
		edgeEntry.wall[1] = playerIndex
		edgeEntry.wall[0]++
		let shiftedBoatIDs = []
		// Now check for docked boats on that edge (during resource deduction, ie live builds SHOULD move shift)
		if (deductResources) {
			const hex1 = model.getHexByID(id1)
			const hex2 = model.getHexByID(id2)
			const hex1isSea = hex1.currentTerrain === rf.TERR_SEA
			const hex2isSea = hex2.currentTerrain === rf.TERR_SEA
			// XOR logic: Only run if exactly one hex is sea (land-water border)
			if (hex1isSea !== hex2isSea) {
				const landIdx = hex1isSea ? 1 : 0
				const landHexID = edgeEntry.edgeHexIDs[landIdx]
				const joiningSide = edgeEntry.joiningSides[landIdx]
				const dockedBoats = model.getAllInGameTransporters().filter((t) => loc.isDockedLocation(t.location) && t.location[1] === landHexID && t.location[2] === joiningSide)

				if (dockedBoats.length > 0) {
					const seaHexID = hex1isSea ? id1 : id2
					// For each boat, if it isn't the currentPlayerIndex, move them out to see
					dockedBoats.forEach((boat) => {
						if (boat.ownerIndex !== playerIndex) {
							const newSeaLocation = loc.setSeaVertexLocation(seaHexID, 0)
							boat.location = newSeaLocation
							shiftedBoatIDs.push(boat.id)
							// Keep the boat's visual position in sync and move any carried transporters too
							const boatStats = rf.getTransporterStats(boat.type)
							const newPos = getTransporterPositionFromLocation(newSeaLocation, boatStats, boat.id)
							boat.rawTransporterXY = newPos
							model.transportersOnTransporter(boat.id).forEach((carried) => {
								const carriedStats = rf.getTransporterStats(carried.type)
								carried.rawTransporterXY = getTransporterPositionFromLocation(carried.location, carriedStats, carried.id)
							})
						}
					})
				}
			}
		}
		return [1, [...shiftedBoatIDs]]
	}
	// Otherwise, demolish it by setting owner to -1
	else {
		edgeEntry.wall[1] = -1
		return [-1, []]
	}
}

export function allLandVertexBucketsWithoutRoadsAdjacentTo(hexID, bucketIds) {
	const store = useModelStore()
	const hex = model.getHexByID(hexID)
	function inBucket(nodeId) {
		return nodeId >= 0 && bucketIds.includes(hex.bucketIdsInitial[hex.nodeBucketIds[nodeId]])
	}
	let res = []
	for (const side of util.indexArray(6).filter((side) => hex.hexLookup[side] !== -1)) {
		const edge = store.mapData.edgeData[hex.edgeLookup[side]]
		const otherHexId = hex.hexLookup[side]
		const otherHex = model.getHexByID(otherHexId)
		if (rf.TERR_ANY_LAND.includes(hex.currentTerrain) && rf.TERR_ANY_LAND.includes(otherHex.currentTerrain)) {
			function addRes(nodeId) {
				const otherBucketId = otherHex.bucketIdsInitial[otherHex.nodeBucketIds[nodeId]]
				res.push([otherHexId, [otherBucketId]])
			}
			const otherSide = (side + 3) % 6
			if (hex.sideNodeIds[side] !== -1 && !edge.hasRoad[0]) {
				if (inBucket(hex.sideNodeIds[side])) {
					addRes(otherHex.sideNodeIds[otherSide])
				}
			} else {
				const cornerSide = edge.edgeHexIDs[0] === hexID ? [0, 1] : [1, 0]
				const otherCornerSide = cornerSide.map((i) => (i + 1) % 2)
				for (const k of [0, 1].filter((k) => inBucket(hex.cornerNodeIds[side][cornerSide[k]]) && !edge.hasRoad[k])) {
					addRes(otherHex.cornerNodeIds[otherSide][otherCornerSide[k]])
				}
			}
		}
	}
	return res
}

export function clickedRes(event, _hexID, resID) {
	const store = useModelStore()
	if (store.context.action === rf.ACT_CONFIRM_END_TURN) return

	// Find the resource
	let resObj = model.getResByID(resID)
	let showPopup = false

	rf.doAdminConsolLg(`resID: ${resObj.id} UID: ${resObj.uniqueID} stack.getResIDtoUse:  ${stack.getResIDtoUse(resObj)} loc: ${JSON.stringify(resObj.location)}`)

	// Exit if it's not highlighted
	if (!store.context.resourceIDsToHighlight.includes(resID)) return
	if (store.context.action === rf.ACT_TM_SELECT_PICKUP_DROP_MOVE || store.context.action === rf.ACT_TM_BUILD_SELECT_BRIDGE_ROAD_WALL_BUILDING_RES_PICKUP_DROP) {
		let transporterObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
		// First check if it is a goose
		// Only allow goose follows during MOVEMENT phase
		let isGoose = resObj.type === rf.RES_GOOSE && rf.PHASE_MOVEMENTS.includes(store.gameflow.phase)
		// Only allow goose follows with remaining moves
		if (transporterObj && isGoose) {
			if (transporterObj.remainingMoves <= 0) {
				isGoose = false
			}
		}
		// Don't allow goose actions if the goose has already moved with a DIFFERENT transporter
		if (resObj.movedTransporterID >= 0 && resObj.movedTransporterID !== store.context.selectedTransporterIDforTM) isGoose = false
		// Don't allow following if the transporter cannot move
		if (model.doesTransporterHaveAlreadyMovedTransporter(transporterObj.id)) isGoose = false
		if (model.doesTransporterHaveAlreadyMovedResource(transporterObj.id)) isGoose = false

		let spaceToLoadGoose = true
		// Find out how much stuff is on the transport already.
		// If there's already a transporter, you can't carry anything else
		if (model.transporterCarriesTransporter(transporterObj.id)) {
			let clientX = event.clientX
			let clientY = event.clientY
			let htmlMessage = "Transporter is<br/>already full<br/>Max Capacity: 1"
			model.showPopup("error", clientX, clientY, htmlMessage)
			if (isGoose) spaceToLoadGoose = false
			else {
				const buckets = getPossibleDropBucketsForResourceOnTransporter(resID)
				if (buckets.length === 1) {
					// Assume it's a resource
					// Do nothing - leave it where it is
					return
				} else {
					context.clearAllHighlights()
					store.context.action = rf.ACT_TM_ANY_PHASE_DROP_RES_OR_TRANSPORT
					context.setHexPieceToHighlightUnderTransporters(buckets.map(model.withInitialBuckets))
					store.context.resIDbeingMoved = resID
					return
				}
			}
		}
		let resourcesOnTransporter = model.resourcesOnTransport(transporterObj.id)
		let transporterStats = rf.getTransporterStats(transporterObj.type)
		if (resourcesOnTransporter.length >= transporterStats.maxCapacity) {
			showPopup = true
			if (isGoose) spaceToLoadGoose = false
			else {
				let clientX = event.clientX
				let clientY = event.clientY
				let htmlMessage = "Transporter is<br/>already full<br/>Max Capacity: " + transporterStats.maxCapacity
				if (showPopup) model.showPopup("error", clientX, clientY, htmlMessage)
				// Now set up for a possible ferry
				const buckets = getPossibleDropBucketsForResourceOnTransporter(resID)
				if (buckets.length === 1) {
					// Assume it's a resource
					// Do nothing - leave it where it is
					return
				} else {
					context.clearAllHighlights()
					store.context.action = rf.ACT_TM_ANY_PHASE_DROP_RES_OR_TRANSPORT
					context.setHexPieceToHighlightUnderTransporters(buckets.map(model.withInitialBuckets))
					store.context.resIDbeingMoved = resID
					return
				}
			}
		}
		// If it is a goose and the transporter is full, then the goose must be a follower
		if (isGoose && !spaceToLoadGoose) {
			resObj.location = loc.setFollowerLocation(transporterObj.id)
			let clientX = event.clientX
			let clientY = event.clientY
			let htmlMessage = "Transporter is<br/>already full<br/>Max Capacity: " + transporterStats.maxCapacity
			if (showPopup) model.showPopup("info", clientX, clientY, htmlMessage)
			// create the stack
			const compressedTransporterLocation = stack.compressLocation(transporterObj.location)
			let stackAction = [rf.STACK_PICKUP_RES_TO_FOLLOW, stack.getTransIDtoUse(transporterObj), [stack.getResIDtoUse(resObj)], [...compressedTransporterLocation]]
			stack.addItemToStack({
				action: rf.STACK_PICKUP_RES_TO_FOLLOW,
				historyEntry: stackAction,
				playerIndex: controller.currentPlayerIndex(),
			})

			context.createUndoPoint()
			return
		}
		if (isGoose && spaceToLoadGoose) {
			let transporterID = store.context.selectedTransporterIDforTM
			context.resetContextAndHighlights()
			store.context.selectedTransporterIDforTM = transporterID
			store.context.action = rf.ACT_TM_CHOOSE_GOOSE_LOCATION
			store.context.gooseID = resObj.id
			context.addTransporterToHighlight(transporterID)
			return
		}
		// Load the resource onto the transporter
		const compressedOldResLocationUsed = stack.compressLocation(resObj.location)
		pickupRes_core(transporterObj.id, resID)
		// create the stack
		// Resources must be in a hexID and bucket. So use that for the location
		//const resLocation = []
		let stackAction = [rf.STACK_STRICT_PICKUP_RES, stack.getTransIDtoUse(transporterObj), [stack.getResIDtoUse(resObj)], [...compressedOldResLocationUsed]]
		stack.addItemToStack({
			action: rf.STACK_STRICT_PICKUP_RES,
			historyEntry: stackAction,
			playerIndex: controller.currentPlayerIndex(),
		})
		highlight.updateAllHighlightsForTransporterMode()
		context.createUndoPoint()
		return
	}
}

export function pickupRes_core(transporterID, resID) {
	const store = useModelStore()
	// Find the resource
	let resObj = model.getResByID(resID)
	if (!resObj /*&& typeof resID === "string" && resID.substring(1, 3) !== "28"*/) {
		rf.doAdminAlrt(`PICKUP RES CORE: Resource not found: ID: ${resID} T-ID: ${transporterID} Turn: ${store.gameflow.turn} Phase-${store.gameflow.phase}`)
		const tObj = model.getTransporterByID(transporterID)
		rf.doAdminAlrt(JSON.stringify(tObj))
		return 9
	}
	// Find the transporter
	let transporterObj = model.getTransporterByID(transporterID)
	// Load the resource onto the transporter
	resObj.location = loc.setTransporterLocation(transporterObj.id)
	return 0
}

export function clickedBuilding(buildingID, forcedInputGoods = []) {
	const store = useModelStore()

	rf.doAdminConsolLg(`bldgID: ${buildingID}    Obj: ${JSON.stringify(model.getBuildingByID(buildingID))}`)
	// Exit if building is not highlighted
	if (!store.context.buildingIDsToHighlight.includes(buildingID) && forcedInputGoods.length === 0) return
	if (store.context.action === rf.ACT_CONFIRM_END_TURN) return

	const building = model.getBuildingByID(buildingID)
	const bldgStats = model.getBuildingStatsFromBuildingID(building.id)

	if (store.context.action === rf.ACT_CHOOSE_BUILDING_TO_UPGRADE) {
		let newBuildingType = -1
		if (store.context.researchIndexForBuildingUpgrades === rf.RND_ROWBOAT_IDX) newBuildingType = rf.BLDG_ROWBOAT_FACTORY
		else if (store.context.researchIndexForBuildingUpgrades === rf.RND_STEAMER_IDX) newBuildingType = rf.BLDG_STEAMER_FACTORY
		else if (store.context.researchIndexForBuildingUpgrades === rf.RND_TRUCK_IDX) newBuildingType = rf.BLDG_TRUCK_FACTORY
		const oldLocation = [...building.location]

		if (building.type === rf.BLDG_RAFT_FACTORY || building.type === rf.BLDG_ROWBOAT_FACTORY) {
			// Remove the old building
			model.removeBuildingByID(buildingID)
			addBuildingToMap_core(newBuildingType, oldLocation, false, -1, -1, controller.currentPlayerIndex())
		} else if (building.type === rf.BLDG_WAGON_FACTORY) {
			// Remove the old building
			model.removeBuildingByID(buildingID)
			addBuildingToMap_core(newBuildingType, oldLocation, false, -1, -1, controller.currentPlayerIndex())
		}
		// Add to the stack
		const compressedOldLocation = stack.compressLocation(oldLocation)
		let stackAction = [rf.STACK_UPGRADE_BUILDING, stack.getBldgIDtoUse(building), newBuildingType, [...compressedOldLocation]]
		stack.addItemToStack({
			action: rf.STACK_UPGRADE_BUILDING,
			historyEntry: stackAction,
			playerIndex: controller.currentPlayerIndex(),
		})

		// Reset vars
		const RND_IDX = store.context.researchIndexForBuildingUpgrades
		context.resetContextAndHighlights()
		// Check for transporter production upgrade possibilities
		const eligibleBuildingIDs = produce.getEligibleBuildingIDsToUpgrade(RND_IDX)
		if (eligibleBuildingIDs.length > 0) {
			store.context.buildingIDsToHighlight = [...eligibleBuildingIDs]
			store.context.action = rf.ACT_CHOOSE_BUILDING_TO_UPGRADE
			store.context.researchIndexForBuildingUpgrades = RND_IDX
		}
		return
	}

	// EMERGENCY CHECK - make sure it's a sec, ie requires input goods
	if (bldgStats.inputRes[0].length === 0) {
		rf.doAdminAlrt("EMERGENCY CHECK - make sure it's a sec, ie requires input goods")
		return
	}

	let inputResources = bldgStats.inputRes[0]

	// Determine transporter ID based on mode (TM or non-TM) - use LOWEST if there's a choice
	const transporterID = store.context.selectedTransporterIDforTM >= 0 ? store.context.selectedTransporterIDforTM : Math.min(...model.getTransportersByPlayerIndexAndHexID(controller.currentPlayerIndex(), building.location[1]).map((t) => t.id))

	// If it is a multi-option input building, detect if options exist, and if so, go to option selection
	if (bldgStats.inputRes.length > 1 && forcedInputGoods.length === 0) {
		// First, check if you actually have a choice. This will only happen if you have >1 trunk AND >1 boards
		const reachableResources = loc.getAllResourcesAccessibleToTransporter(transporterID, true)
		const resourceOnHex = model.resourceCountByType(reachableResources.map((res) => res.type))

		const trunksOnHex = resourceOnHex[rf.RES_TRUNKS]
		const boardsOnHex = resourceOnHex[rf.RES_BOARDS]

		// For there to be a choice, you need at least one of each, and at least 3 totoal
		if (trunksOnHex >= 1 && boardsOnHex >= 1 && trunksOnHex + boardsOnHex >= 3) {
			store.context.action = rf.ACT_SELECT_INPUT_RESOURCES_FOR_SEC_PRODUCTION
			for (let i = 0; i < trunksOnHex; i++) store.context.chosenInputGoods[0].push(rf.RES_TRUNKS)
			for (let i = 0; i < boardsOnHex; i++) store.context.chosenInputGoods[0].push(rf.RES_BOARDS)
			store.context.chosenInputGoods[2] = buildingID
			highlight.updateAllHighlightsForTransporterMode()
			return
		}
		// So now there's no real choice
		if (trunksOnHex >= 2 && boardsOnHex === 0) inputResources = [rf.RES_TRUNKS, rf.RES_TRUNKS]
		else if (trunksOnHex === 0 && boardsOnHex >= 2) inputResources = [rf.RES_BOARDS, rf.RES_BOARDS]
		else if (trunksOnHex >= 1 && boardsOnHex >= 1) inputResources = [rf.RES_TRUNKS, rf.RES_BOARDS]
	} else if (bldgStats.inputRes.length > 1 && forcedInputGoods.length !== 0) {
		inputResources = [...forcedInputGoods]
		if (inputResources.includes(rf.RES_BOARDS) && inputResources.includes(rf.RES_TRUNKS)) inputResources = [rf.RES_TRUNKS, rf.RES_BOARDS]
	}

	// Process building production - this removes resources, and adds transporters ONLY at this stage - sets up new water trans action if needed
	const buildingProductionRet = processBuildingProduction(transporterID, building, bldgStats, inputResources)
	const buildingProductionRetError = buildingProductionRet[0]
	const buildingProductionRetRemovedTransporterID = buildingProductionRet[1]
	let buildingProductionRetNewTransporterWaterLocation = buildingProductionRet[2]
	if (!rf.ALL_WATER_TRANSPORTER_BUILDINGS.includes(building.type)) buildingProductionRetNewTransporterWaterLocation = []

	if (buildingProductionRetError === -1) {
		rf.doAdminAlrt("Unable to process building")
		return
	}

	// Finalize production (you can safely pass in transporters as they will be ignored)
	prod.addBuildingOutputResourcesToGame_core(building.id, -1, controller.currentPlayerIndex())

	// If you selected resources different from first option, record it here
	let resSetIdx = 0
	if (!util.arraysEqual(inputResources, bldgStats.inputRes[0])) {
		if (util.arraysEqual(inputResources, bldgStats.inputRes[1])) resSetIdx = 1
		else if (util.arraysEqual(inputResources, bldgStats.inputRes[2])) resSetIdx = 2
		else rf.doAdminAlrt("ERROR: Unrecognized input resource set for building production history")
	}

	// If you are pending water placement, don't reset now, and don't add to the stack yet
	if (store.context.action === rf.ACT_SELECT_WATER_FOR_NEW_TRANSPORTER) return

	// create the stack
	const compressedLocation = stack.compressLocation(building.location)
	const transporterObj = model.getTransporterByID(transporterID)
	let stackAction = [rf.STACK_MANUAL_PRODUCTION, stack.getBldgIDtoUse(building), stack.getTransIDtoUse(transporterObj), [...compressedLocation]]
	if (buildingProductionRetNewTransporterWaterLocation.length > 0) stackAction.push([...stack.compressWaterLocation(buildingProductionRetNewTransporterWaterLocation)])
	if (buildingProductionRetRemovedTransporterID !== -1) stackAction.push(buildingProductionRetRemovedTransporterID)
	if (resSetIdx > 0) stackAction.push(resSetIdx)
	// If it's a water trans production, we require the location it was placed at
	// (in case later there are multiple options)
	//if (rf.ALL_WATER_TRANSPORTER_BUILDINGS.includes(building.type) && locationIfTransportProduced[0] !== -99) stackAction.push([...locationIfTransportProduced])
	stack.addItemToStack({
		action: rf.STACK_MANUAL_PRODUCTION,
		historyEntry: stackAction,
		playerIndex: controller.currentPlayerIndex(),
	})
	building.remainingConversions--
	if (![rf.ACT_REMOVE_EXCESS_TRANSPORTERS, rf.ACT_REMOVE_EXCESS_TRANSPORTERS_FOR_DONKEY].includes(store.context.action)) {
		context.resetContextAndHighlights()
		highlight.updateAllHighlightsForTransporterMode()
	}
	context.createUndoPoint()
}

/**
 * Processes building production, including resource removal and transporter handling.
 * Returns location of new trans, or [-1] if failed, o [0] if successful
 */
function processBuildingProduction(transporterID, building, bldgStats, inputResources) {
	const store = useModelStore()
	let removedTransporterID = -1
	// Attempt to remove required resources
	if (model.removeResourcesFromGameUsingTransporter(transporterID, inputResources, true) !== 0) {
		return [-1, removedTransporterID, []]
	}

	model.removeResourcesFromGameUsingTransporter(transporterID, inputResources, false)

	// Handle transporter input if required
	let transporterAlreadyAdded = false
	if (store.context.selectedTransporterIDforTM >= 0 && inputResources.some((res) => res > rf.RES_UPPER_LIMIT)) {
		const transporterTypeNeeded = inputResources.find((res) => res > rf.RES_UPPER_LIMIT)
		const transporterObj = model.getTransporterByID(transporterID)
		if (transporterObj.type === transporterTypeNeeded) {
			if (bldgStats.outputRes.length === 1 && bldgStats.outputRes[0] > rf.RES_UPPER_LIMIT) {
				model.removeAndAddTransporterFromGameUsingID(transporterID, bldgStats.outputRes[0])
				removedTransporterID = transporterID
				transporterAlreadyAdded = true
			} else {
				model.removeTransporterIDfromGame(transporterID)
				removedTransporterID = transporterID
			}
		}
	}

	// Add output transporter if needed
	if (bldgStats.outputRes.length === 1 && bldgStats.outputRes[0] > rf.RES_UPPER_LIMIT && !transporterAlreadyAdded) {
		return [0, removedTransporterID, addTransporterProductionToGame(bldgStats.outputRes[0], building.id)]
	}

	return [0, removedTransporterID, []]
}

/**
 * Adds a transporter to the game based on type and location.
 * Returns true if successful, false if location selection is needed for water transporters.
 */
function addTransporterProductionToGame(transporterType, buildingID) {
	const store = useModelStore()
	const building = model.getBuildingByID(buildingID)

	if (rf.LAND_TRANSPORTERS.includes(transporterType)) {
		model.addTransporterToGame(controller.currentPlayerIndex(), transporterType, building.location, false)
		return building.location
	}

	// Handle water transporters
	const possibleLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(building.location, false, "atptg").filter((x) => loc.isAnyWaterLocation(x))
	let possibleBucketLocations = []
	for (const possibleLoc of possibleLocations) {
		const bucketLoc = loc.getBucketLocationFromVertexLocation(possibleLoc)
		if (!util.includesArray(possibleBucketLocations, bucketLoc)) possibleBucketLocations.push([...bucketLoc])
	}

	if (possibleBucketLocations.length === 1) {
		const finalLocation = model.addTransporterToGame(controller.currentPlayerIndex(), transporterType, possibleBucketLocations[0], false)
		return finalLocation
	}

	context.clearAllHighlights()
	highlight.highlightLocations(possibleLocations)
	store.context.action = rf.ACT_SELECT_WATER_FOR_NEW_TRANSPORTER
	///  building.id, transporterID, building.location.slice(1)
	const transporterID = store.context.selectedTransporterIDforTM >= 0 ? store.context.selectedTransporterIDforTM : model.getTransportersByPlayerIndexAndHexID(controller.currentPlayerIndex(), building.location[1])[0].id
	store.context.pendingTransporterTypeForLocationSelectionData = [transporterType, buildingID, transporterID, building.location.slice(1)]
	return [-99]
}

export function getPossibleDropBucketsForResourceOnTransporter(resID) {
	const store = useModelStore()
	let resObj = model.getResByID(resID)
	let transporterObj
	// If the res is NOT on a transporter, it must be an auto-drop from a full transporter
	if (loc.getLocationType(resObj.location) !== rf.LOCATION_TRANSPORTER) {
		transporterObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
	} else transporterObj = model.getTransporterByID(resObj.location[1])
	const reachable = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, false, "gpdbfrot")
	const buckets = model.getVertexBucketsFromLocations(reachable)
	return buckets
}

export function clickedResOnTransporter(transporterID, resourceID) {
	const store = useModelStore()
	if (store.context.action === rf.ACT_CONFIRM_END_TURN) return

	if (store.context.action === rf.ACT_TM_SELECT_PICKUP_DROP_MOVE || store.context.action === rf.ACT_TM_BUILD_SELECT_BRIDGE_ROAD_WALL_BUILDING_RES_PICKUP_DROP) {
		// If you are clicking a resource on another transporter, then try to steal it
		if (transporterID !== store.context.selectedTransporterIDforTM) {
			// Exit if it's not highlighted
			if (!store.context.resourceIDsToHighlight.includes(resourceID)) return
			let selectedTransporterObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
			if (model.transporterCarriesTransporter(selectedTransporterObj.id)) {
				let clientX = event.clientX
				let clientY = event.clientY
				let htmlMessage = "Transporter is<br/>already full<br/>Max Capacity: 1"
				model.showPopup("error", clientX, clientY, htmlMessage)
				return
			}
			let resourcesOnTransporter = model.resourcesOnTransport(selectedTransporterObj.id)
			let transporterStats = rf.getTransporterStats(selectedTransporterObj.type)
			if (resourcesOnTransporter.length >= transporterStats.maxCapacity) {
				let clientX = event.clientX
				let clientY = event.clientY
				let htmlMessage = "Transporter is<br/>already full<br/>Max Capacity: " + transporterStats.maxCapacity
				model.showPopup("error", clientX, clientY, htmlMessage)
				return
			}
			// Load the resource onto the transporter
			pickupRes_core(selectedTransporterObj.id, resourceID)
			// create the stack
			const compressedLocation = stack.compressLocation(selectedTransporterObj.location)
			const resObj = model.getResByID(resourceID)
			const otherTransObj = model.getTransporterByID(transporterID)
			let stackAction = [rf.STACK_STEAL_RES, stack.getTransIDtoUse(selectedTransporterObj), stack.getTransIDtoUse(otherTransObj), [stack.getResIDtoUse(resObj)], [...compressedLocation]]
			stack.addItemToStack({
				action: rf.STACK_STEAL_RES,
				historyEntry: stackAction,
				playerIndex: controller.currentPlayerIndex(),
			})
			highlight.updateAllHighlightsForTransporterMode()
			context.createUndoPoint()
			return
		}

		const buckets = getPossibleDropBucketsForResourceOnTransporter(resourceID)
		if (buckets.length === 1) {
			// Assume it's a resource
			// create the stack
			/*const dropHexID = buckets[0][2][1]
			const dropBucketID = buckets[0][2][2]
			let dropLocation = [dropHexID]
			if (dropBucketID !== 0) {
				dropLocation.push(dropBucketID)
			}*/
			const compressedDropLocationUsed = stack.compressLocation(buckets[0][2])
			const resObj = model.getResByID(resourceID)
			const transObj = model.getTransporterByID(transporterID)
			let stackAction = [rf.STACK_STRICT_DROP_RES, stack.getTransIDtoUse(transObj), [stack.getResIDtoUse(resObj)], [...compressedDropLocationUsed]]
			stack.addItemToStack({
				action: rf.STACK_STRICT_DROP_RES,
				historyEntry: stackAction,
				playerIndex: controller.currentPlayerIndex(),
			})

			dropResOnLocation_core(resourceID, buckets[0][2])
			context.createUndoPoint()
			return
		} else {
			context.clearAllHighlights()
			store.context.action = rf.ACT_TM_ANY_PHASE_STRICT_DROP_RES_OR_TRANSPORT
			context.setHexPieceToHighlightUnderTransporters(buckets.map(model.withInitialBuckets))
			store.context.resIDbeingMoved = resourceID
			return
		}
	}
}

export function clickedResFollowingTransporter(resourceID) {
	const store = useModelStore()

	if (!store.context.resourceIDsToHighlight.includes(resourceID)) return

	// CHECK THIS
	const transporterID = store.context.selectedTransporterIDforTM

	if (store.context.action === rf.ACT_TM_CHOOSE_GOOSE_LOCATION) return
	const buckets = getPossibleDropBucketsForResourceOnTransporter(resourceID)
	if (buckets.length === 1) {
		// Assume it's a resource
		// create the stack
		const compressedDropLocationUsed = stack.compressLocation(buckets[0][2])
		const resObj = model.getResByID(resourceID)
		const transObj = model.getTransporterByID(transporterID)
		let stackAction = [rf.STACK_DROP_RES_FOLLOWING, stack.getTransIDtoUse(transObj), [stack.getResIDtoUse(resObj)], [...compressedDropLocationUsed]]
		stack.addItemToStack({
			action: rf.STACK_DROP_RES_FOLLOWING,
			historyEntry: stackAction,
			playerIndex: controller.currentPlayerIndex(),
		})
		dropResOnLocation_core(resourceID, buckets[0][2])
		context.createUndoPoint()
		return
	} else {
		context.clearAllHighlights()
		store.context.action = rf.ACT_TM_CHOOSE_GOOSE_DEPOSIT_LOCATION
		context.setHexPieceToHighlightUnderTransporters(buckets.map(model.withInitialBuckets))
		store.context.resIDbeingMoved = resourceID
		return
	}
}

export function executePickupTransporter(transporterID) {
	const store = useModelStore()
	const selectedTransporterObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
	// create the stack
	const pickerUpLocation = selectedTransporterObj.location
	const compressedPickedUpLocation = stack.compressLocation(pickerUpLocation)
	const carriedTransObj = model.getTransporterByID(transporterID)
	let stackAction = [rf.STACK_PICKUP_TRANSPORTER, stack.getTransIDtoUse(selectedTransporterObj), stack.getTransIDtoUse(carriedTransObj), [...compressedPickedUpLocation]]
	stack.addItemToStack({
		action: rf.STACK_PICKUP_TRANSPORTER,
		historyEntry: stackAction,
		playerIndex: controller.currentPlayerIndex(),
	})

	// Make sure the just clicked transporter has correct rawXY
	// Make sure the transporter has the correct OLD xy location now
	const beingLoadedTransporterObj = model.getTransporterByID(transporterID)
	const transporterStats = rf.getTransporterStats(beingLoadedTransporterObj.type)
	let rawTransporterXY = getTransporterPositionFromLocation(beingLoadedTransporterObj.location, transporterStats, transporterID)
	beingLoadedTransporterObj.rawTransporterXY = rawTransporterXY

	loadTransporterOntoTransporter_core(store.context.selectedTransporterIDforTM, transporterID)

	// Reset the decision state
	store.context.selectedTransporterIDforPickupOrSelection = -1
	store.context.action = rf.ACT_TM_SELECT_PICKUP_DROP_MOVE

	highlight.updateAllHighlightsForTransporterMode()
	context.createUndoPoint()
}

export function clickedTransporter(transporterID) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.clearMessages()

	if (1 == 1 || rf.DEBUG_USERS.includes(personal.name)) {
		rf.doAdminConsolLg(`id: ${transporterID} - loc: ${model.getTransporterByID(transporterID).location} UID: ${model.getTransporterByID(transporterID).uniqueID}`)
		const tempAllresOn = model.resourcesOnTransport(transporterID)
		rf.doAdminConsolLg(`resON: ${JSON.stringify(tempAllresOn.map((r) => r.id))}`)
		const tempAllresFollow = model.resourcesFollowingTransporter(transporterID)
		rf.doAdminConsolLg(`resFollow: ${JSON.stringify(tempAllresFollow.map((r) => r.id))}`)

		rf.doAdminConsolLg(`t: ${JSON.stringify(model.getTransporterByID(transporterID))}`)
	}

	if (!personal.canPlay()) return
	if (store.context.action === rf.ACT_CONFIRM_END_TURN) return

	// If you are placing a new water transporter, ignore clicks on other transporters
	if (store.context.action === rf.ACT_SELECT_WATER_FOR_NEW_TRANSPORTER) return

	// If you have illegal geese, return
	if (store.context.errorUnableToDropGeeseAtSea === true) {
		context.resetContextAndHighlights()
		return
	}

	// If it is NOT your transporter, return
	if (model.getTransporterByID(transporterID).ownerIndex !== controller.currentPlayerIndex()) return

	// If it is not highlighted, return UNDER CERTAIN ACTIONS
	if (!store.context.transporterIDsToHighlight.includes(transporterID)) {
		if ([rf.ACT_REMOVE_EXCESS_TRANSPORTERS, rf.ACT_REMOVE_EXCESS_TRANSPORTERS_FOR_DONKEY].includes(store.context.action)) return
	}
	stack.resetStackControlData()

	// If you are removing transporters, do that first
	if ([rf.ACT_REMOVE_EXCESS_TRANSPORTERS, rf.ACT_REMOVE_EXCESS_TRANSPORTERS_FOR_DONKEY].includes(store.context.action)) {
		// Remove the transporter from the game
		const oldHexID = model.getTransporterByID(transporterID).location[1]
		const transObj = model.getTransporterByID(transporterID)
		const oldLocation = [...transObj.location]
		model.removeTransporterIDfromGame(transporterID)
		if (store.context.action === rf.ACT_REMOVE_EXCESS_TRANSPORTERS) {
			// Add the stack
			let stackAction = [rf.STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY, stack.getTransIDtoUse(transObj), oldHexID]
			stack.addItemToStack({
				action: rf.STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY,
				historyEntry: stackAction,
				playerIndex: controller.currentPlayerIndex(),
			})
		} else if (store.context.action === rf.ACT_REMOVE_EXCESS_TRANSPORTERS_FOR_DONKEY) {
			store.context.possibleDonkeyReproductionData[store.context.selectedDonkeyIdxToStoreTransporterRemoveal][2] = stack.getTransIDtoUse(transObj)
			store.context.possibleDonkeyReproductionData[store.context.selectedDonkeyIdxToStoreTransporterRemoveal][3] = [...oldLocation]

			store.context.selectedDonkeyIdxToStoreTransporterRemoveal = -1
		}
		context.resetContextAndHighlights()
		highlight.updateAllHighlightsForTransporterMode()
		return
	}
	// Firstly, if the current transporter is NOT highlighted,
	// ASSUME you want to select it for TM. So reset store.context.selectedTransporterIDforTM to -1
	if (!store.context.transporterIDsToHighlight.includes(transporterID)) {
		store.context.selectedTransporterIDforTM = -1
	}
	let transporterObj = model.getTransporterByID(transporterID)
	if (loc.isAnyHexLocation(transporterObj.location)) store.mapData.zoomData.hexID = transporterObj.location[1]

	// If there is no transporter selected, select a transport
	if (store.context.selectedTransporterIDforTM === -1) {
		context.resetContextAndHighlights()
		store.context.selectedTransporterIDforTM = transporterID
		highlight.updateAllHighlightsForTransporterMode()
		return
	}

	// So now we know we are in TM with a selected transporter already
	// If another transporter is selected, that is on a hex, then it must be a loading action
	if (loc.isAnyHexLocation(transporterObj.location) && [rf.ACT_TM_SELECT_PICKUP_DROP_MOVE, rf.ACT_TM_BUILD_SELECT_BRIDGE_ROAD_WALL_BUILDING_RES_PICKUP_DROP].includes(store.context.action)) {
		store.context.action = rf.ACT_TM_DECIDE_ON_TRANSPORTER_PICKUP_OR_SELECT
		store.context.selectedTransporterIDforPickupOrSelection = transporterID
		return
	}

	// If another transporter is selected, that is on a transporter, then it must be an unloading action
	if (loc.getLocationType(transporterObj.location) === rf.LOCATION_TRANSPORTER && store.context.action === rf.ACT_TM_SELECT_PICKUP_DROP_MOVE) {
		// If this has just been picked up, just drop it in it's old location
		if (transporterObj.justPickedUpFromLocation.length > 0) {
			// Don't store the stack - this is basically a shortcut undo
			// For consistency, create the stack, but it will always trigger a cancel out
			const compressedPickedUpLocation = stack.compressLocation(transporterObj.justPickedUpFromLocation)
			const mainTransObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
			const carriedTransObj = model.getTransporterByID(transporterID)
			let stackAction = [rf.STACK_DROP_TRANSPORTER_JUST_PICKED_UP, stack.getTransIDtoUse(mainTransObj), stack.getTransIDtoUse(carriedTransObj), [...compressedPickedUpLocation]]
			stack.addItemToStack({
				action: rf.STACK_DROP_TRANSPORTER_JUST_PICKED_UP,
				historyEntry: stackAction,
				playerIndex: controller.currentPlayerIndex(),
			})

			transporterObj.location = [...transporterObj.justPickedUpFromLocation]
			transporterObj.justPickedUpFromLocation.splice(0)
			//sortTransporters(transporterObj.id)
			highlight.updateAllHighlightsForTransporterMode()
			return
		}

		// If a land is dropping a land or water dropping a water, just put it in the same location
		let carryingTransporterObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
		const carryingTransporterLocation = carryingTransporterObj.location
		let carriedTransporterObj = transporterObj
		//const carriedStats = rf.getTransporterStats(carriedTransporterObj.type)

		//const reachable = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(carryingTransporterLocation, false)
		//const validLocations = reachable.filter((loc) => carriedStats.validDrop.includes(loc[0]))
		//const validBuckets = model.getVertexBucketsFromLocations(validLocations)
		//const nonVertices = validLocations.filter((arrLoc) => !loc.isNonRiverVertexLocation(arrLoc))
		//const validDropLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(carryingTransporterLocation, false).filter(resLoc => carriedStats.validDrop.includes(resLoc[0]))
		let validDropBucketLocations = []
		// LAND transporters can only be dropped in bucket locations. So find these
		if (rf.LAND_TRANSPORTERS.includes(carriedTransporterObj.type)) {
			// If you are at sea, you cannot drop it
			if (model.getHexByID(carryingTransporterLocation[1]).currentTerrain === rf.TERR_SEA) return
			validDropBucketLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(carryingTransporterLocation, false).filter((resLoc) => loc.isBucketLocation(resLoc))
		} else {
			// WATER transporters can be dropped on SEA, RIVER, or DOCKED locations
			// First filter for bucket (sea hex) or river vertex, or docked loc
			const isSeaHex = model.getHexByID(carryingTransporterLocation[1]).currentTerrain === rf.TERR_SEA
			validDropBucketLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(carryingTransporterLocation, false).filter((resLoc) => (isSeaHex && loc.isBucketLocation(resLoc)) || loc.isRiverVertexLocation(resLoc) || loc.isDockedLocation(resLoc))
			// Now convert any river vertex to river ID, and remove docked offsets
			for (let i = 0; i < validDropBucketLocations.length; i++) {
				if (loc.isRiverVertexLocation(validDropBucketLocations[i])) {
					const hexID = validDropBucketLocations[i][1]
					const riverID = loc.getRiverIDfromAnyHexIDandRiverVertex(hexID, validDropBucketLocations[i][2])
					validDropBucketLocations[i] = loc.setRiverBucketLocation(hexID, riverID)
				} else if (loc.isDockedLocation(validDropBucketLocations[i])) {
					validDropBucketLocations[i][4] = rf.DOCKED_OFFSET_NONE
				}
			}
		}
		// Now remove duplicate subarrays
		validDropBucketLocations = util.makeUniqueSubarrays(validDropBucketLocations)

		if (validDropBucketLocations.length === 1) {
			const hexID = validDropBucketLocations[0][1]

			// TODO - probably replace this with getVisualLocationFromBucketLocation ???
			let finalDropLocationFull = []
			if (rf.LAND_TRANSPORTERS.includes(carriedTransporterObj.type)) {
				const vertex = loc.getLandVertexForNewTransporterFromHexIDandBucketID(hexID, validDropBucketLocations[0][2])
				finalDropLocationFull = [rf.LOCATION_LAND_VERTEX, hexID, vertex]
			} else {
				// Dropping on sea hex
				if (loc.isBucketLocation(validDropBucketLocations[0])) {
					const vertex = loc.getSeaVertexForNewTransporterFromHexIDandBucketID(hexID, validDropBucketLocations[0][2])
					finalDropLocationFull = [rf.LOCATION_SEA_VERTEX, hexID, vertex]
				}
				// Drop on river
				else if (loc.isRiverBucketLocation(validDropBucketLocations[0])) {
					const vertex = loc.getRiverVertexForNewTransporterFromHexIDandBucketID(hexID, validDropBucketLocations[0][2])

					finalDropLocationFull = [rf.LOCATION_RIVER_VERTEX, hexID, vertex]
				}
				// Drop on dock
				else if (loc.isDockedLocation(validDropBucketLocations[0])) {
					finalDropLocationFull = loc.getVisualLocationFromBucketLocation(validDropBucketLocations[0])
				}
			}
			// create the stack
			const compressedDropLocation = stack.compressLocation(finalDropLocationFull)
			const mainTransObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
			const carriedTransObj = model.getTransporterByID(transporterID)
			let stackAction = [rf.STACK_DROP_TRANSPORTER, stack.getTransIDtoUse(mainTransObj), stack.getTransIDtoUse(carriedTransObj), [...compressedDropLocation]]
			stack.addItemToStack({
				action: rf.STACK_DROP_TRANSPORTER,
				historyEntry: stackAction,
				playerIndex: controller.currentPlayerIndex(),
			})

			dropTransporterOnLocation_core(transporterObj.id, finalDropLocationFull)

			highlight.updateAllHighlightsForTransporterMode()
			return
		} else {
			store.context.action = rf.ACT_TM_ANY_PHASE_DROP_RES_OR_TRANSPORT
			store.context.transporterIDbeingDropped = transporterObj.id
			// If there are multiple
			highlight.highlightLocations(validDropBucketLocations)
			return
		}
	}

	// Check if this is a goodse load/folllow decision
	if (store.context.action === rf.ACT_TM_CHOOSE_GOOSE_LOCATION && store.context.selectedTransporterIDforTM === transporterObj.id) {
		// Load the resource onto the transporter
		let resID = store.context.gooseID
		// Load the resource onto the transporter
		const resObj = model.getResByID(resID)
		const compressedOldResLocationUsed = stack.compressLocation(resObj.location)
		pickupRes_core(transporterObj.id, resID)
		// create the stack
		let stackAction = [rf.STACK_STRICT_PICKUP_RES, stack.getTransIDtoUse(transporterObj), [stack.getResIDtoUse(resObj)], [...compressedOldResLocationUsed]]
		stack.addItemToStack({
			action: rf.STACK_STRICT_PICKUP_RES,
			historyEntry: stackAction,
			playerIndex: controller.currentPlayerIndex(),
		})

		context.resetContextAndHighlights()
		store.context.action = rf.ACT_TM_SELECT_PICKUP_DROP_MOVE
		store.context.selectedTransporterIDforTM = transporterObj.id
		highlight.updateAllHighlightsForTransporterMode()
		context.createUndoPoint()
		return
	}
}

export function loadTransporterOntoTransporter_core(mainTransporterID, transporterToLoadID) {
	const transporterToLoadObj = model.getTransporterByID(transporterToLoadID)
	transporterToLoadObj.justPickedUpFromLocation = [...transporterToLoadObj.location]
	transporterToLoadObj.location = loc.setTransporterLocation(mainTransporterID)
}

export function clickedGooseArea(transporterID, gooseID) {
	const store = useModelStore()
	if (store.context.action === rf.ACT_TM_CHOOSE_GOOSE_LOCATION) {
		let transporterObj = model.getTransporterByID(transporterID)
		let resObj = model.getResByID(gooseID)
		resObj.location = loc.setFollowerLocation(transporterObj.id)

		// create the stack
		const compressedTransporterLocation = stack.compressLocation(transporterObj.location)

		let stackAction = [rf.STACK_PICKUP_RES_TO_FOLLOW, stack.getTransIDtoUse(transporterObj), [stack.getResIDtoUse(resObj)], [...compressedTransporterLocation]]
		stack.addItemToStack({
			action: rf.STACK_PICKUP_RES_TO_FOLLOW,
			historyEntry: stackAction,
			playerIndex: controller.currentPlayerIndex(),
		})

		context.resetContextAndHighlights()
		store.context.action = rf.ACT_TM_SELECT_PICKUP_DROP_MOVE
		store.context.selectedTransporterIDforTM = transporterID
		highlight.updateAllHighlightsForTransporterMode()
		context.createUndoPoint()
		return
	}
}

export function doesBucketHaveAccessToResources(hexID, bucketID, resArr, returnIDs) {
	//const hex = model.getHexByID(hexID)
	//const locations = util
	//	.indexArray(hex.nodeVertexDefinitions.length)
	//	.filter((i) => hex.bucketIdsCurrent[hex.nodeBucketIds[i]] === bucketID)
	//	.map((i) => loc.setLandVertexLocation(hexID, i))
	if (!bucketID && bucketID !== 0) rf.doAdminAlrt(`dbhatr error: h-${hexID} b-${bucketID} rArr-${resArr} retI=${returnIDs}`)
	const locations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation([rf.LOCATION_BUCKET, hexID, bucketID], false, "dbhatr")
	const allResources = model.getAllInGameResources().sort((a, b) => a.id - b.id)
	let foundResIDs = []
	for (let i = 0; i < resArr.length; i++) {
		let resFound = false
		for (let j = 0; j < allResources.length; j++) {
			let resObj = allResources[j]
			if (!foundResIDs.includes(resObj.id) && util.includesArray(locations, resObj.location) && resObj.type === resArr[i]) {
				foundResIDs.push(resObj.id)
				resFound = true
				break
			}
		}
		if (!resFound) {
			if (returnIDs) return foundResIDs
			else return false
		}
	}

	if (returnIDs) return foundResIDs
	return true
}

// THIS IS ALLOWED TO USE store.RATIO AS IT GETS A FINAL XY POSITION
// transporterID is optional - if provided, used to determine unique offset when multiple transporters share a docked location
export function getTransporterPositionFromLocation(inputLocation, transporterStats, transporterID) {
	const store = useModelStore()
	const locationType = loc.getLocationType(inputLocation)

	if (locationType === rf.LOCATION_TRANSPORTER) {
		const holdingTransporterObj = model.getTransporterByID(inputLocation[1])
		//if (util.arraysEqual(holdingTransporterObj.rawTransporterXY, [0, 0])) rf.doAdminAlrt("Zero array found")
		//return holdingTransporterObj.rawTransporterXY
		const transporterStats2 = rf.getTransporterStats(holdingTransporterObj.type)
		return getTransporterPositionFromLocation(holdingTransporterObj.location, transporterStats2, transporterID)
	}

	const hexId = inputLocation[1]
	const hexObj = model.getHexByID(hexId, "Map")
	const imgWidth = transporterStats.width * store.RATIO
	const imgHeight = transporterStats.height * store.RATIO

	let pt = [0, 0]
	if (loc.isRiverVertexLocation(inputLocation)) {
		const vertex = inputLocation[2]
		pt = vec.scaleBy(store.RATIO, hexObj.riverVertices[vertex])
	}
	if (loc.isNonRiverVertexLocation(inputLocation)) {
		const vertex = inputLocation[2]
		pt = vec.scaleBy(store.RATIO, hexObj.vertices[vertex])
	} else if (locationType === rf.LOCATION_DOCKED) {
		// Check for multiple transporters at same docked location and offset them
		// Calculate position based on offset stored in location[4]
		const side = inputLocation[2]
		const bank = inputLocation[3]
		const dockedOffset = inputLocation[4] ?? rf.DOCKED_OFFSET_NONE
		const midPoint = store.MID_POINTS_POINTY[side]
		const offset = bank === rf.BANK_NONE ? midPoint : bank === rf.BANK_LEFT ? store.VERTICES_POINTY_EXT[side] : store.VERTICES_POINTY_EXT[(side + 1) % 6]
		const centerPt = vec.scaleBy(0.5 * store.RATIO, vec.sum(midPoint, offset))

		// Apply offset if specified
		if (dockedOffset !== rf.DOCKED_OFFSET_NONE) {
			const leftVertex = store.VERTICES_POINTY_EXT[side]
			const rightVertex = store.VERTICES_POINTY_EXT[(side + 1) % 6]
			const sideDirection = vec.subtract(rightVertex, leftVertex)
			// Use larger offset when no bank
			const offsetMultiplier = bank === rf.BANK_NONE ? store.RATIO / 3 : store.RATIO / 6
			const sideOffset = vec.scaleBy(offsetMultiplier, sideDirection)

			if (dockedOffset === rf.DOCKED_OFFSET_CW) {
				pt = vec.sum(centerPt, sideOffset)
			} else if (dockedOffset === rf.DOCKED_OFFSET_ACW) {
				pt = vec.subtract(centerPt, sideOffset)
			} else {
				pt = centerPt
			}
		} else {
			pt = centerPt
		}
	}
	// Now it is the correct local point. So before moving over the whole map, rotate it relative to local 0,0 if in flat
	if (store.hexStyle === rf.FLAT) {
		const angle = Math.PI / 6 // 30 degrees in radians
		const cosA = Math.cos(angle)
		const sinA = Math.sin(angle)

		const [x, y] = pt
		pt = [x * cosA - y * sinA, x * sinA + y * cosA]
	}

	let temp = vec.subtract(vec.sum(hexObj.rawXY, pt), vec.scaleBy(0.5, [imgWidth, imgHeight]))

	return temp
}

// KEEP THIS FUNCTOIN - it moves the transporter to the top, ie paints it FIRST if something was loaded on to it
/*function sortTransporters(transporterID) {
    if (!transporterID && transporterID !== 0) return // Avoid mutations for invalid IDs
    const index = store.ALL_TRANSPORTERS.findIndex((t) => t.id === transporterID)
    if (index === -1 || index === store.ALL_TRANSPORTERS.length - 1) return // No action if not found or already last
    // AVOID THIS? MIGHT CAUSE SNAP POSITIONING. INSTEAD, MAYBE COMPUTE TRANS DISPLAY?
    store.ALL_TRANSPORTERS.push(store.ALL_TRANSPORTERS.splice(index, 1)[0])
}*/
