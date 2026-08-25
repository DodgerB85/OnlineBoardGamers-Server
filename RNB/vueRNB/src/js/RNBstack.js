import * as rf from "./RNBreference.js"
import * as util from "./RNButil.js"
import * as model from "./RNBmodel.js"
import * as controller from "./RNBcontroller.js"
import * as graph from "./RNBgraph.js"
import * as map from "./RNBmap.js"
//import * as computes from "./RNBcomputes.js"
//import * as highlight from "./RNBhighlight.js"
import * as loc from "./RNBlocation.js"
//import * as context from "./RNBcontext.js"
import * as produce from "./RNBproduce.js"
import * as atelier from "./RNBatelier.js"
import * as wonder from "./RNBwonder.js"
import * as funcs from "./RNBfuncs.js"
import * as context from "./RNBcontext.js"
import * as hd from "./RNBhex.js"
//import * as IO from "../backend/RNB_IO.js"

import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"

/************************
 *
 *                  TODO
 *
 * CANCEL OUT
 * ==========
 * combine manual productions of same bldg ID

 *
 *
 * VERIFY
 * ======
 * 
 *
 */

// This is a more general utility to compress any location for storage
export function compressLocation(inputLocation) {
	// Handle basic locations first, Land/Sea/Bucket can go to bucket
	if (loc.isLandVertexLocation(inputLocation)) return geCompressedBucketLocationFromHexIDandVertex(inputLocation[1], inputLocation[2])
	//if (loc.isSeaVertexLocation(inputLocation)) return geCompressedBucketLocationFromHexIDandVertex(inputLocation[1], inputLocation[2])
	if (loc.isSeaVertexLocation(inputLocation)) return [inputLocation[1]]
	if (loc.isBucketLocation(inputLocation)) {
		const hexID = inputLocation[1]
		const bucketID = inputLocation[2]
		if (bucketID > 0) return [hexID, bucketID]
		return [hexID]
	}
	// But sometimes, it could be a transp picking transp, from river/bank/etc
	// For a river location, the riverID is probably zero. So compress to length 2 but need a flag of -1
	if (loc.isRiverBucketLocation(inputLocation)) {
		const hexID = inputLocation[1]
		const riverID = inputLocation[2]
		if (riverID > 0) return [-1, hexID, riverID] // store length 3 location
		return [-1, hexID]
	}
	// For a river vertex location, use the -1 flat with hexID, vertex
	// AH ACTUALLY NO - The whole point of STACK locations is that they can be replayed.
	// If another boat arrived on THAT vertex in the mean time
	if (loc.isRiverVertexLocation(inputLocation)) {
		const hexID = inputLocation[1]
		const riverVertex = inputLocation[2]
		const riverBucketID = loc.getRiverIDfromAnyHexIDandRiverVertex(hexID, riverVertex)
		if (riverBucketID > 0) return [-1, hexID, riverBucketID] // store length 3 location
		return [-1, hexID]
	}
	// For banks, the format is [rf.LOCATION_DOCKED, hexID, side, bank, offset] where bank is rf.BANK_NONE, rf.BANK_LEFT, rf.BANK_RIGHT
	// SIMILARLY, the DOCKED_OFFSET should NOT be stored here. It is just visual, so should be set "in real time" when the move is performed.
	if (loc.isDockedLocation(inputLocation)) {
		const hexID = inputLocation[1]
		const side = inputLocation[2]
		const bank = inputLocation[3]
		//const offset = inputLocation[4]
		if (side === 0 && bank === rf.BANK_NONE) return [-3, hexID]
		if (bank === rf.BANK_NONE) return [-3, hexID, side]
		return [hexID, side, bank]
		//return [hexID, side, bank, offset]
	}
	rf.doAdminAlrt("compressLocation: Unhandled location type: " + JSON.stringify(inputLocation))
}

// This is a more general utility to UNcompress any location from storage
export function decompressLocation(compressedLocation) {
	// If the length is 1, it is just a hexID with bucket 0
	if (compressedLocation.length === 1) return [rf.LOCATION_BUCKET, compressedLocation[0], 0]
	// If it is length 2 with a flag of -1, it is a river location with riverID 0
	if (compressedLocation.length === 2 && compressedLocation[0] === -1) return [rf.LOCATION_RIVER_BUCKET, compressedLocation[1], 0]
	// If it is length 2 with a flag of -2, it is a river vertex location with riverVertex 0
	//if (compressedLocation.length === 2 && compressedLocation[0] === -2) return [rf.LOCATION_RIVER_VERTEX, compressedLocation[1], 0]
	// If it is length 2 with a flag of -3, it is a docked location with side/bank/offset as 0
	if (compressedLocation.length === 2 && compressedLocation[0] === -3) return [rf.LOCATION_DOCKED, compressedLocation[1], 0, rf.BANK_NONE, rf.DOCKED_OFFSET_NONE]
	// Otherwise If the length is 2, it is a hexID with a bucket
	if (compressedLocation.length === 2) return [rf.LOCATION_BUCKET, compressedLocation[0], compressedLocation[1]]
	// For length 3, with -1 flag is river bucket with non 0 riverID
	if (compressedLocation.length === 3 && compressedLocation[0] === -1) {
		return [rf.LOCATION_RIVER_BUCKET, compressedLocation[1], compressedLocation[2]]
	}
	// For length 3, with -2 flag is river vertex with non 0 vertex
	/*if (compressedLocation.length === 3 && compressedLocation[0] === -2) {
		return [rf.LOCATION_RIVER_VERTEX, compressedLocation[1], compressedLocation[2]]
	}*/
	// For length 3, with -3 flag is docked location no bank no offset
	if (compressedLocation.length === 3 && compressedLocation[0] === -3) {
		return [rf.LOCATION_DOCKED, compressedLocation[1], compressedLocation[2], rf.BANK_NONE, rf.DOCKED_OFFSET_NONE]
	}
	// For length 3, with NO flag is docked location with bank no offset
	if (compressedLocation.length === 3 && compressedLocation[0] >= 0) {
		return [rf.LOCATION_DOCKED, compressedLocation[0], compressedLocation[1], compressedLocation[2], rf.DOCKED_OFFSET_NONE]
	}
	// For length 4 it must be docked with offset
	/*if (compressedLocation.length === 4) {
		return [rf.LOCATION_DOCKED, compressedLocation[0], compressedLocation[1], compressedLocation[2], compressedLocation[3]]
	}*/
	rf.doAdminAlrt(`decompressLocation: Unhandled compressedLocation : ${compressedLocation}`)
}

export function geCompressedBucketLocationFromHexIDandVertex(hexID, vertex) {
	let bucketID = loc.getBucketIDfromAnyHexIDandVertex(hexID, vertex)
	let stackLocation = [hexID]
	if (bucketID > 0) stackLocation.push(bucketID)
	return stackLocation
}

export function getHexIDandBucketFromStackLocation(stackLocation) {
	rf.doAdminAlrt("Should be using decompress function")
	let hexID = stackLocation[0]
	let bucketID = 0
	if (stackLocation.length > 1) bucketID = stackLocation[1]
	return [hexID, bucketID]
}

export function compressWaterLocation(inputLocation) {
	// Sea locations can be converted to SEA/HEX/BUCKET
	if (loc.isSeaVertexLocation(inputLocation)) {
		const hexID = inputLocation[1]
		//const vertex = inputLocation[2]
		//let bucketID = loc.getBucketIDfromAnyHexIDandVertex(hexID, vertex)
		//if (bucketID > 0) [hexID, bucketID]
		// Sea hexes only have 1 bucket
		return [hexID]
	}
	if (loc.isRiverVertexLocation(inputLocation)) {
		const hexID = inputLocation[1]
		const riverVertex = inputLocation[2]
		const riverID = loc.getRiverIDfromAnyHexIDandRiverVertex(hexID, riverVertex)
		//if (riverID === 0) return [-1, hexID]
		return [hexID, riverID]
	}
	// NB DOCKED_OFFSET is just visual, so should NOT be stored in the stack!
	if (loc.isDockedLocation(inputLocation)) {
		const hexID = inputLocation[1]
		const side = inputLocation[2]
		const bank = inputLocation[3]
		//const offset = inputLocation[4]
		if (side === 0 && bank === rf.BANK_NONE) return [-3, hexID]
		//if (bank === rf.BANK_NONE) return [-3, hexID, side]
		return [hexID, side, bank]
		//return [hexID, side, bank, offset]
	}
	rf.doAdminAlrt("getWaterLocationForStac: Unhandled location type: " + JSON.stringify(inputLocation))
	return inputLocation
}

export function decompressWaterLocation(stackWaterLocation, keepBucketLocation = false) {
	// Length 1 is a sea hex
	if (stackWaterLocation.length === 1) {
		const hexID = stackWaterLocation[0]
		const bucketID = 0
		if (keepBucketLocation) return [rf.LOCATION_BUCKET, hexID, 0]
		const vertex = graph.getBestVertexInBucketForWaterMove(hexID, bucketID)
		return [rf.LOCATION_SEA_VERTEX, hexID, vertex]
	}
	// length 2 with -3 flag is docked location side 0 no bank no offset
	if (stackWaterLocation.length === 2 && stackWaterLocation[0] === -3) {
		const hexID = stackWaterLocation[1]
		return [rf.LOCATION_DOCKED, hexID, 0, rf.BANK_NONE, rf.DOCKED_OFFSET_NONE]
	}
	// Otherwise Length 2 is a river bucket
	if (stackWaterLocation.length === 2) {
		const hexID = stackWaterLocation[0]
		const riverBucketID = stackWaterLocation[1]
		//const vertex = graph.getBestVertexInRiver(hexID, riverBucketID)
		return [rf.LOCATION_RIVER_BUCKET, hexID, riverBucketID]
	}

	// For length 3, it is docked location (IMPORTANT: Assign no offset here, gets assigned later)
	if (stackWaterLocation.length === 3) {
		return [rf.LOCATION_DOCKED, stackWaterLocation[0], stackWaterLocation[1], stackWaterLocation[2], rf.DOCKED_OFFSET_NONE]
	}

	/*// For length 3, with -3 flag is docked location no bank no offset
	if (stackWaterLocation.length === 3 && stackWaterLocation[0] === -3) {
		return [rf.LOCATION_DOCKED, stackWaterLocation[1], stackWaterLocation[2], rf.BANK_NONE, rf.DOCKED_OFFSET_NONE]
	}
	// For length 3, with NO flag is docked location with bank no offset
	if (stackWaterLocation.length === 3 && stackWaterLocation[0] >= 0) {
		return [rf.LOCATION_DOCKED, stackWaterLocation[0], stackWaterLocation[1], stackWaterLocation[2], rf.DOCKED_OFFSET_NONE]
	}
	// For length 4 it must be docked with offset
	if (stackWaterLocation.length === 4) {
		return [rf.LOCATION_DOCKED, stackWaterLocation[0], stackWaterLocation[1], stackWaterLocation[2], stackWaterLocation[3]]
	}*/

	rf.doAdminAlrt("getWaterLocationForStackREVERSE: Unhandled location type: " + JSON.stringify(stackWaterLocation))
	return location
}

/**
 * NOTE: These functions live "in the moment", so you can use things like currentPlayerObj()
 * and getTransporterByID() and expect it to return the correct data
 * ONLY FOR VERIFYING THE STACK
 * The stack is used for history, so stored data has to be persistent
 */

export function addItemToStack(newItem) {
	const store = useModelStore()
	const personal = usePersonalStore()
	let idx = 0
	const newItemAction = newItem.action
	let newItemHistoryEntry = newItem.historyEntry
	const playerIndex = newItem.playerIndex

	if (!newItem || newItemAction == null || !newItemHistoryEntry || playerIndex == null) {
		if (!newItem) rf.doAdminAlrt("addItemToStack: newItem missing")
		if (newItemAction == null) rf.doAdminAlrt("addItemToStack: newItemAction missing")
		if (!newItemHistoryEntry) rf.doAdminAlrt("addItemToStack: newItemHistoryEntry missing")
		if (playerIndex == null) rf.doAdminAlrt("addItemToStack: playerIndex missing")
		return
	}

	/*************************************
	 *
	 * First check and see if the item is a REVERSE of an earlier action. If so, remove old action and do NOT add the new
	 *
	 *************************************/
	let reversedAction = false
	if (store.actionStack.length > 0) {
		// First, remove the pickup if you just drop a picked up trans
		if (newItemAction === rf.STACK_DROP_TRANSPORTER_JUST_PICKED_UP) {
			const mainTransporterID = newItemHistoryEntry[1]
			const carriedTransporterID = newItemHistoryEntry[2]
			//const dropLocation = newItemHistoryEntry[3]

			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				// If you are picking up, check this isn't the reverse of a drop off
				if (previousEntry.action === rf.STACK_PICKUP_TRANSPORTER) {
					const previousMainTransporterID = previousEntry.historyEntry[1]
					const previousCarriedTransporterID = previousEntry.historyEntry[2]
					//const previousPickupLocation = previousEntry.historyEntry[3]
					//if (mainTransporterID === previousMainTransporterID && carriedTransporterID === previousCarriedTransporterID && util.arraysEqual(dropLocation, previousPickupLocation)) {

					// Find the previous action and remove it
					if (mainTransporterID === previousMainTransporterID && carriedTransporterID === previousCarriedTransporterID) {
						store.actionStack.splice(idx, 1)
						reversedAction = true
						break
					}
				}
				idx--
			}
		}

		// If you dropped a trans at start of moevement, but then picked it up, cancel it out
		if (newItemAction === rf.STACK_PICKUP_TRANSPORTER) {
			const mainTransporterID = newItemHistoryEntry[1]
			const carriedTransporterID = newItemHistoryEntry[2]
			const pickupStackLocation = newItemHistoryEntry[3]

			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				// If you are picking up, check this isn't the reverse of a drop off
				if (previousEntry.action === rf.STACK_DROP_TRANSPORTER) {
					const previousMainTransporterID = previousEntry.historyEntry[1]
					const previousCarriedTransporterID = previousEntry.historyEntry[2]
					const previousDropStackLocation = previousEntry.historyEntry[3]
					if (util.arraysEqual(previousDropStackLocation, pickupStackLocation) && mainTransporterID === previousMainTransporterID && carriedTransporterID === previousCarriedTransporterID) {
						// Find the previous action and remove it
						store.actionStack.splice(idx, 1)
						reversedAction = true
						break
					}
				}
				// Ah a later fix was to check pickup/drop locations the same. So below should be redundant
				// But if a previous action was a LAND MOVE of either trans, we cannot combine
				else if (previousEntry.action === rf.STACK_MOVE_LAND) {
					const movingTransporterID = previousEntry.historyEntry[1]
					if (movingTransporterID === mainTransporterID || movingTransporterID === carriedTransporterID) {
						break
					}
				}
				// But if a previous action was a WATER MOVE of either trans, we cannot combine
				else if (previousEntry.action === rf.STACK_MOVE_WATER) {
					const movingTransporterID = previousEntry.historyEntry[1]
					if (movingTransporterID === mainTransporterID || movingTransporterID === carriedTransporterID) {
						break
					}
				}
				idx--
			}
		}

		// NB this shouldn't be needed, as an immediate drop is handled as a special case, but this is here as a backup
		// If you picked up a trans, but then dropped it, cancel it out
		if (newItemAction === rf.STACK_DROP_TRANSPORTER) {
			const mainTransporterID = newItemHistoryEntry[1]
			const carriedTransporterID = newItemHistoryEntry[2]
			const dropStackLocation = newItemHistoryEntry[3]

			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				if (previousEntry.action === rf.STACK_PICKUP_TRANSPORTER) {
					const previousMainTransporterID = previousEntry.historyEntry[1]
					const previousCarriedTransporterID = previousEntry.historyEntry[2]
					const previousPickupStackLocation = previousEntry.historyEntry[3]
					if (util.arraysEqual(dropStackLocation, previousPickupStackLocation) && mainTransporterID === previousMainTransporterID && carriedTransporterID === previousCarriedTransporterID) {
						store.actionStack.splice(idx, 1)
						reversedAction = true
						break
					}
				}
				// But if a previous action was a LAND MOVE of either trans, we cannot reverse
				else if (previousEntry.action === rf.STACK_MOVE_LAND) {
					const movingTransporterID = previousEntry.historyEntry[1]
					if (movingTransporterID === mainTransporterID || movingTransporterID === carriedTransporterID) {
						break
					}
				}
				// But if a previous action was a WATER MOVE of either trans, we cannot reverse
				else if (previousEntry.action === rf.STACK_MOVE_WATER) {
					const movingTransporterID = previousEntry.historyEntry[1]
					if (movingTransporterID === mainTransporterID || movingTransporterID === carriedTransporterID) {
						break
					}
				}
				idx--
			}
		}

		if (newItemAction === rf.STACK_STRICT_PICKUP_RES) {
			const newTransporterID = newItemHistoryEntry[1]
			const newResID = newItemHistoryEntry[2][0]
			const newPickupHexIDandBucketID = newItemHistoryEntry[3]
			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				// If you are picking up, check this isn't the reverse of a drop off
				if (previousEntry.action === rf.STACK_STRICT_DROP_RES) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[2]
					const previousPickupHexIDandBucketID = previousEntry.historyEntry[3]
					if (newTransporterID === previousTransporterID && previousResIDs.includes(newResID) && util.arraysEqual(newPickupHexIDandBucketID, previousPickupHexIDandBucketID)) {
						// Find the resID in the previous action and remove it
						let prevIdx = previousResIDs.findIndex((resID) => resID === newResID)
						previousResIDs.splice(prevIdx, 1)
						if (previousResIDs.length === 0) store.actionStack.splice(idx, 1)
						reversedAction = true
						break
					}
				}
				idx--
			}
		}

		if (newItemAction === rf.STACK_PICKUP_RES_TO_FOLLOW) {
			const newTransporterID = newItemHistoryEntry[1]
			const newResID = newItemHistoryEntry[2][0]
			const newTransporterLocation = newItemHistoryEntry[3]
			const newhexID = newTransporterLocation[0]
			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				// If you are picking up, check this isn't the reverse of a drop off
				if (previousEntry.action === rf.STACK_DROP_RES_FOLLOWING) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[2]
					const previousDropHexID = previousEntry.historyEntry[3][0]
					if (newTransporterID === previousTransporterID && previousResIDs.includes(newResID) && newhexID === previousDropHexID) {
						// Find the resID in the previous action and remove it
						let prevIdx = previousResIDs.findIndex((resID) => resID === newResID)
						previousResIDs.splice(prevIdx, 1)
						if (previousResIDs.length === 0) store.actionStack.splice(idx, 1)
						reversedAction = true
						break
					}
				}
				// But if a previous action was a steal of this res BY this transporter, we cannot reverse
				// (the res changed ownership between the drop and pickup, so history would be out of sync)
				// Currently stealing a following res is not possible, but this guard is here for future-proofing
				else if (previousEntry.action === rf.STACK_STEAL_RES) {
					const previousReceivingTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[3]
					if (previousReceivingTransporterID === newTransporterID && previousResIDs.includes(newResID)) {
						break
					}
				}
				idx--
			}
		} else if (newItemAction === rf.STACK_STRICT_DROP_RES) {
			const newTransporterID = newItemHistoryEntry[1]
			const newResID = newItemHistoryEntry[2][0]
			const newDropHexIDandBucketID = newItemHistoryEntry[3]
			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				// If you are picking up, check this isn't the reverse of a drop off
				if (previousEntry.action === rf.STACK_STRICT_PICKUP_RES) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[2]
					const previousPickupHexIDandBucketID = previousEntry.historyEntry[3]
					if (newTransporterID === previousTransporterID && previousResIDs.includes(newResID) && util.arraysEqual(newDropHexIDandBucketID, previousPickupHexIDandBucketID)) {
						// Find the resID in the previous action and remove it
						let prevIdx = previousResIDs.findIndex((resID) => resID === newResID)
						previousResIDs.splice(prevIdx, 1)
						if (previousResIDs.length === 0) store.actionStack.splice(idx, 1)
						reversedAction = true
						break
					}
					// If you picked it up on the hex, BUT are dropping it in a new bucket, change it to a FERRY action
					if (newTransporterID === previousTransporterID && previousResIDs.includes(newResID) && previousPickupHexIDandBucketID[0] === newDropHexIDandBucketID[0]) {
						let newBucket = 0
						let previousBucket = 0
						if (previousPickupHexIDandBucketID.length > 1) previousBucket = previousPickupHexIDandBucketID[1]
						if (newDropHexIDandBucketID.length > 1) newBucket = newDropHexIDandBucketID[1]
						if (previousBucket !== newBucket) {
							// This can be converted to a ferry. So remove the res from the pickup
							// Find the resID in the previous action and remove it
							let prevIdx = previousResIDs.findIndex((resID) => resID === newResID)
							previousResIDs.splice(prevIdx, 1)
							if (previousResIDs.length === 0) store.actionStack.splice(idx, 1)
							// Now convert the stack to a strict ferry
							let newFerryLocation = [newDropHexIDandBucketID[0]]
							if (newBucket > 0) newFerryLocation.push(newBucket)
							// Convert newItem to a ferry
							newItem.historyEntry = [rf.STACK_STRICT_FERRY_RES, newTransporterID, [newResID], [...newFerryLocation]]
							newItem.action = rf.STACK_STRICT_FERRY_RES
							reversedAction = false
							addItemToStack(newItem)
							return
						}
					}
				}
				idx--
			}
		} else if (newItemAction === rf.STACK_DROP_RES_FOLLOWING) {
			const newTransporterID = newItemHistoryEntry[1]
			const newResID = newItemHistoryEntry[2][0]
			const newDropHexID = newItemHistoryEntry[3][0]
			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				if (previousEntry.action === rf.STACK_PICKUP_RES_TO_FOLLOW) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[2]
					const previousTransporterLocation = previousEntry.historyEntry[3]
					const previousHexID = previousTransporterLocation[0]
					if (newTransporterID === previousTransporterID && previousResIDs.includes(newResID) && newDropHexID === previousHexID) {
						let prevIdx = previousResIDs.findIndex((resID) => resID === newResID)
						previousResIDs.splice(prevIdx, 1)
						if (previousResIDs.length === 0) store.actionStack.splice(idx, 1)
						reversedAction = true
						break
					}
				}
				// But if a previous action was a steal of this res BY this transporter, we cannot reverse
				// (the res changed ownership between the pickup and drop, so history would be out of sync)
				else if (previousEntry.action === rf.STACK_STEAL_RES) {
					const previousReceivingTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[3]
					if (previousReceivingTransporterID === newTransporterID && previousResIDs.includes(newResID)) {
						break
					}
				}
				idx--
			}
		} else if (newItemAction === rf.STACK_STEAL_RES) {
			//let stackAction = [rf.STACK_STEAL_RES, stack.getTransIDtoUse(selectedTransporterObj), stack.getTransIDtoUse(otherTransObj), [stack.getResIDtoUse(resObj)], [...compressedLocation]]

			const receivingTransporterID = newItemHistoryEntry[1]
			const otherTransporterID = newItemHistoryEntry[2]
			const newResID = newItemHistoryEntry[3][0]
			const newPickupHexIDandBucketID = newItemHistoryEntry[4] // This is [hexID] only if bucket is 0
			//const newPickupHexID = newPickupHexIDandBucketID[0]

			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				// If you are picking up, check this isn't the reverse of a drop off
				if (previousEntry.action === rf.STACK_STEAL_RES) {
					const previousReceivingTransporterID = previousEntry.historyEntry[1]
					const previousOtherTransporterID = previousEntry.historyEntry[2]
					const previousResIDs = previousEntry.historyEntry[3]
					const previousPickupHexIDandBucketID = previousEntry.historyEntry[4]
					if (receivingTransporterID === previousOtherTransporterID && otherTransporterID === previousReceivingTransporterID && previousResIDs.includes(newResID) && util.arraysEqual(newPickupHexIDandBucketID, previousPickupHexIDandBucketID)) {
						// Find the resID in the previous action and remove it
						let prevIdx = previousResIDs.findIndex((resID) => resID === newResID)
						previousResIDs.splice(prevIdx, 1)
						if (previousResIDs.length === 0) store.actionStack.splice(idx, 1)
						reversedAction = true
						break
					}
				}

				// If the other transporter previously picked it up in the same location, change from steal to direct pickup
				else if (previousEntry.action === rf.STACK_STRICT_PICKUP_RES) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[2]
					const previousPickupHexIDandBucketID = previousEntry.historyEntry[3]
					// If prev was one being stolen from, and res is included, and location is the same
					if (previousTransporterID === otherTransporterID && previousResIDs.includes(newResID) && util.arraysEqual(newPickupHexIDandBucketID, previousPickupHexIDandBucketID)) {
						// Find the resID in the previous action and remove it
						let prevIdx = previousResIDs.findIndex((resID) => resID === newResID)
						previousResIDs.splice(prevIdx, 1)
						if (previousResIDs.length === 0) store.actionStack.splice(idx, 1)

						// Convert newItem to a pickup
						newItem.historyEntry = [rf.STACK_STRICT_PICKUP_RES, receivingTransporterID, [newResID], [...newPickupHexIDandBucketID]]
						newItem.action = rf.STACK_STRICT_PICKUP_RES
						reversedAction = false
						addItemToStack(newItem)
						return
					}
				}

				idx--
			}
		}

		// Check for an UNferry - NOTE: This CANNOT be an else-if, in case the action above changed the newItem to a ferry
		/*if (newItem[0] === rf.STACK_STRICT_FERRY_RES) {
			const newTransporterID = newItem[1]
			const newResID = newItem[2][0]
			const newDropHexIDandBucketID = newItem[3]
			while (idx >= 0) {
				let previousEntry= store.actionStack[idx]
				// If you are picking up, check this isn't the reverse of a drop off
				if (previousEntry.action === rf.STACK_STRICT_PICKUP_RES) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[2]
					const previousDropHexIDandBucketID = previousEntry.historyEntry[3]
					if (newTransporterID === previousTransporterID && previousResIDs.includes(newResID) && util.arraysEqual(newDropHexIDandBucketID, previousDropHexIDandBucketID)) {
						// Find the resID in the previous action and remove it
						let prevIdx = previousResIDs.findIndex((resID) => resID === newResID)
						previousResIDs.splice(prevIdx, 1)
						if (previousResIDs.length === 0) store.actionStack.splice(idx, 1)
						reversedAction = true
						break
					}
					// If you picked it up on the hex, BUT are dropping it in a new bucket, change it to a FERRY action
					if (newTransporterID === previousTransporterID && previousResIDs.includes(newResID) && previousDropHexIDandBucketID[0] === newDropHexIDandBucketID[0]) {
						let newBucket = 0
						let previousBucket = 0
						if (previousDropHexIDandBucketID.length > 1) previousBucket = previousDropHexIDandBucketID[1]
						if (newDropHexIDandBucketID.length > 1) newBucket = newDropHexIDandBucketID[1]
						if (previousBucket !== newBucket) {
							// This can be converted to a ferry. So remove the res from the pickup
							// Find the resID in the previous action and remove it
							let prevIdx = previousResIDs.findIndex((resID) => resID === newResID)
							previousResIDs.splice(prevIdx, 1)
							if (previousResIDs.length === 0) store.actionStack.splice(idx, 1)
							// Now convert the stack to a strict ferry
							let newFerryLocation = [newDropHexIDandBucketID[0]]
							if (newBucket > 0) newFerryLocation.push(newBucket)
							// Convert newItem to a ferry
							newItem = [rf.STACK_STRICT_FERRY_RES, newTransporterID, [newResID], [...newFerryLocation]]
							reversedAction = false
							break
						}
					}
				}
				idx--
			}
		}*/

		/*

				if (newTransporterID === previousTransporterID && newResID === previousResID && newReshexID === previousReshexID && newResBucketID === previousResBucketID) {
					store.actionStack.splice(idx, 1)
					reversedAction = true
					break
				}
			}
			idx--
		}*/
	}
	/*************************************
	 *
	 * Now we know we need to add the action. So see if we can COMBINE it with a previous entry
	 *
	 *************************************/
	let combinedAction = false
	if (store.actionStack.length > 0 && !reversedAction) {
		idx = store.actionStack.length - 1
		// If you are picking up a res, check for previous pickups by the same transporter ID
		// Keep going until anything moves ON to the hex
		if (newItemAction === rf.STACK_STRICT_PICKUP_RES) {
			const newTransporterID = newItemHistoryEntry[1]
			const newResID = newItemHistoryEntry[2][0]
			const newPickupHexIDandBucketID = newItemHistoryEntry[3] // This is [hexID] only if bucket is 0
			const newPickupHexID = newPickupHexIDandBucketID[0]
			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				if (previousEntry.action === rf.STACK_STRICT_PICKUP_RES) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousPickupHexIDandBucketID = previousEntry.historyEntry[3] // This is [hexID] only if bucket is 0
					if (newTransporterID === previousTransporterID && util.arraysEqual(newPickupHexIDandBucketID, previousPickupHexIDandBucketID)) {
						store.actionStack[idx].historyEntry[2].push(newResID)
						combinedAction = true
						break
					}
				}
				// But if a previous action was a drop of the SAME res by a DIFFERENT transp, we cannot combine
				else if (previousEntry.action === rf.STACK_STRICT_DROP_RES) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[2]
					if (previousTransporterID !== newTransporterID && previousResIDs.includes(newResID)) {
						break
					}
				}
				// But if a previous action was something ARRIVING on the hex, we must stop looking
				else if (previousEntry.action === rf.STACK_MOVE_LAND) {
					const fullToLocation = decompressLocation(previousEntry.historyEntry[3])
					const toHexID = fullToLocation[1]
					if (toHexID === newPickupHexID) {
						break
					}
				} else if (previousEntry.action === rf.STACK_MOVE_WATER) {
					const toLocationBucket = decompressWaterLocation(previousEntry.historyEntry[3])
					const arrivingHexID = toLocationBucket[1]
					if (arrivingHexID === newPickupHexID) {
						break
					}
				}
				idx--
			}
		}
		// If you are picking up a follower, check for previous pickups by the same transporter ID
		// Keep going until anything moves ON to the hex
		else if (newItemAction === rf.STACK_PICKUP_RES_TO_FOLLOW) {
			const newTransporterID = newItemHistoryEntry[1]
			const newResID = newItemHistoryEntry[2][0]
			const newTransporterLocation = newItemHistoryEntry[3]
			const newPickupHexID = newTransporterLocation[0]
			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				if (previousEntry.action === rf.STACK_PICKUP_RES_TO_FOLLOW) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousTransporterLocation = previousEntry.historyEntry[3]
					if (newTransporterID === previousTransporterID && util.arraysEqual(newTransporterLocation, previousTransporterLocation)) {
						store.actionStack[idx].historyEntry[2].push(newResID)
						combinedAction = true
						break
					}
				}
				// But if a previous action was a drop of the SAME res by a DIFFERENT transp, we cannot combine
				else if (previousEntry.action === rf.STACK_STRICT_DROP_RES || previousEntry.action === rf.STACK_DROP_RES_FOLLOWING) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[2]
					if (previousTransporterID !== newTransporterID && previousResIDs.includes(newResID)) {
						break
					}
				}
				// But if a previous action was something ARRIVING on the hex, we must stop looking
				else if (previousEntry.action === rf.STACK_MOVE_LAND) {
					const fullToLocation = decompressLocation(previousEntry.historyEntry[3])
					const toHexID = fullToLocation[1]
					if (toHexID === newPickupHexID) {
						break
					}
				} else if (previousEntry.action === rf.STACK_MOVE_WATER) {
					const toLocationBucket = decompressWaterLocation(previousEntry.historyEntry[3])
					const arrivingHexID = toLocationBucket[1]
					if (arrivingHexID === newPickupHexID) {
						break
					}
				}
				idx--
			}
		}
		// If you are dropping a res, check for previous drops by the same transporter ID
		// Keep going until anything moves ON to the hex
		else if (newItemAction === rf.STACK_STRICT_DROP_RES) {
			const newTransporterID = newItemHistoryEntry[1]
			const newResID = newItemHistoryEntry[2][0]
			const newDropHexIDandBucketID = newItemHistoryEntry[3] // This is [hexID] only if bucket is 0
			const newDropHexID = newDropHexIDandBucketID[0]
			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				if (previousEntry.action === rf.STACK_STRICT_DROP_RES) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousDropHexIDandBucketID = previousEntry.historyEntry[3] // This is [hexID] only if bucket is 0
					if (newTransporterID === previousTransporterID && util.arraysEqual(newDropHexIDandBucketID, previousDropHexIDandBucketID)) {
						store.actionStack[idx].historyEntry[2].push(newResID)
						combinedAction = true
						break
					}
				}
				// But if a previous action was a pickup of the SAME res by a DIFFERENT transp, we cannot combine
				else if (previousEntry.action === rf.STACK_STRICT_PICKUP_RES) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[2]
					if (previousTransporterID !== newTransporterID && previousResIDs.includes(newResID)) {
						break
					}
				}
				// But if a previous action was a steal of this res BY this transporter, we cannot combine
				// (the res changed ownership between the two drops, so history would be out of sync)
				else if (previousEntry.action === rf.STACK_STEAL_RES) {
					const previousReceivingTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[3]
					if (previousReceivingTransporterID === newTransporterID && previousResIDs.includes(newResID)) {
						break
					}
				}
				// But if a previous action was something ARRIVING on the hex, we must stop looking
				else if (previousEntry.action === rf.STACK_MOVE_LAND) {
					const fullToLocation = decompressLocation(previousEntry.historyEntry[3])
					const toHexID = fullToLocation[1]
					if (toHexID === newDropHexID) {
						break
					}
				} else if (previousEntry.action === rf.STACK_MOVE_WATER) {
					const toLocationBucket = decompressWaterLocation(previousEntry.historyEntry[3])
					const arrivingHexID = toLocationBucket[1]
					if (arrivingHexID === newDropHexID) {
						break
					}
				}
				idx--
			}
		}
		// If you are dropping a follower, check for previous drops by the same transporter ID
		// Keep going until anything moves ON to the hex
		else if (newItemAction === rf.STACK_DROP_RES_FOLLOWING) {
			const newTransporterID = newItemHistoryEntry[1]
			const newResID = newItemHistoryEntry[2][0]
			const newDropHexIDandBucketID = newItemHistoryEntry[3] // This is [hexID] only if bucket is 0
			const newDropHexID = newDropHexIDandBucketID[0]
			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				if (previousEntry.action === rf.STACK_DROP_RES_FOLLOWING) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousDropHexIDandBucketID = previousEntry.historyEntry[3] // This is [hexID] only if bucket is 0
					if (newTransporterID === previousTransporterID && util.arraysEqual(newDropHexIDandBucketID, previousDropHexIDandBucketID)) {
						store.actionStack[idx].historyEntry[2].push(newResID)
						combinedAction = true
						break
					}
				}
				// But if a previous action was a pickup of the SAME res by a DIFFERENT transp, we cannot combine
				else if (previousEntry.action === rf.STACK_STRICT_PICKUP_RES || previousEntry.action === rf.STACK_PICKUP_RES_TO_FOLLOW) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[2]
					if (previousTransporterID !== newTransporterID && previousResIDs.includes(newResID)) {
						break
					}
				}
				// But if a previous action was a steal of this res BY this transporter, we cannot combine
				// (the res changed ownership between the two drops, so history would be out of sync)
				// Currently stealing a following res is not possible, but this guard is here for future-proofing
				else if (previousEntry.action === rf.STACK_STEAL_RES) {
					const previousReceivingTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[3]
					if (previousReceivingTransporterID === newTransporterID && previousResIDs.includes(newResID)) {
						break
					}
				}
				// But if a previous action was something ARRIVING on the hex, we must stop looking
				else if (previousEntry.action === rf.STACK_MOVE_LAND) {
					const fullToLocation = decompressLocation(previousEntry.historyEntry[3])
					const toHexID = fullToLocation[1]
					if (toHexID === newDropHexID) {
						break
					}
				} else if (previousEntry.action === rf.STACK_MOVE_WATER) {
					const toLocationBucket = decompressWaterLocation(previousEntry.historyEntry[3])
					const arrivingHexID = toLocationBucket[1]
					if (arrivingHexID === newDropHexID) {
						break
					}
				}
				idx--
			}
		}
		// If you are ferrying a res, check for previous ferries by the same transporter ID
		// Keep going until anything moves ON to the hex
		else if (newItemAction === rf.STACK_STRICT_FERRY_RES) {
			const newTransporterID = newItemHistoryEntry[1]
			const newResID = newItemHistoryEntry[2][0]
			const newDropHexIDandBucketID = newItemHistoryEntry[3] // This is [hexID] only if bucket is 0
			const newDropHexID = newDropHexIDandBucketID[0]
			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				if (previousEntry.action === rf.STACK_STRICT_FERRY_RES) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousDropHexIDandBucketID = previousEntry.historyEntry[3] // This is [hexID] only if bucket is 0
					if (newTransporterID === previousTransporterID && util.arraysEqual(newDropHexIDandBucketID, previousDropHexIDandBucketID)) {
						store.actionStack[idx].historyEntry[2].push(newResID)
						combinedAction = true
						break
					}
				}
				// But if a previous action was a pickup of the SAME res by a DIFFERENT transp, we cannot combine
				else if (previousEntry.action === rf.STACK_STRICT_PICKUP_RES) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[2]
					if (previousTransporterID !== newTransporterID && previousResIDs.includes(newResID)) {
						break
					}
				}
				// But if a previous action was a steal of this res BY this transporter, we cannot combine
				// (the res changed ownership between the two ferries, so history would be out of sync)
				else if (previousEntry.action === rf.STACK_STEAL_RES) {
					const previousReceivingTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[3]
					if (previousReceivingTransporterID === newTransporterID && previousResIDs.includes(newResID)) {
						break
					}
				}
				// But if a previous action was something ARRIVING on the hex, we must stop looking
				else if (previousEntry.action === rf.STACK_MOVE_LAND) {
					const fullToLocation = decompressLocation(previousEntry.historyEntry[3])
					const toHexID = fullToLocation[1]
					if (toHexID === newDropHexID) {
						break
					}
				} else if (previousEntry.action === rf.STACK_MOVE_WATER) {
					const toLocationBucket = decompressWaterLocation(previousEntry.historyEntry[3])
					const arrivingHexID = toLocationBucket[1]
					if (arrivingHexID === newDropHexID) {
						break
					}
				}
				idx--
			}
		} else if (newItemAction === rf.STACK_STEAL_RES) {
			//let stackAction = [rf.STACK_STEAL_RES, stack.getTransIDtoUse(selectedTransporterObj), stack.getTransIDtoUse(otherTransObj), [stack.getResIDtoUse(resObj)], [...compressedLocation]]

			const receivingTransporterID = newItemHistoryEntry[1]
			const otherTransporterID = newItemHistoryEntry[2]
			const newResID = newItemHistoryEntry[3][0]
			const newPickupHexIDandBucketID = newItemHistoryEntry[4] // This is [hexID] only if bucket is 0
			const newPickupHexID = newPickupHexIDandBucketID[0]
			idx = store.actionStack.length - 1
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				if (previousEntry.action === rf.STACK_STEAL_RES) {
					const previousReceivingTransporterID = previousEntry.historyEntry[1]
					const previousOtherTransporterID = previousEntry.historyEntry[2]
					const previousPickupHexIDandBucketID = previousEntry.historyEntry[4] // This is [hexID] only if bucket is 0
					if (receivingTransporterID === previousReceivingTransporterID && otherTransporterID === previousOtherTransporterID && util.arraysEqual(newPickupHexIDandBucketID, previousPickupHexIDandBucketID)) {
						store.actionStack[idx].historyEntry[3].push(newResID)
						combinedAction = true
						break
					}
				}
				// But if a previous action was a drop or pickup of the SAME res by a DIFFERENT transp, we cannot combine
				else if (previousEntry.action === rf.STACK_STRICT_DROP_RES || previousEntry.action === rf.STACK_DROP_RES_FOLLOWING || previousEntry.action === rf.STACK_STRICT_PICKUP_RES || previousEntry.action === rf.STACK_PICKUP_RES_TO_FOLLOW) {
					const previousTransporterID = previousEntry.historyEntry[1]
					const previousResIDs = previousEntry.historyEntry[2]
					if (previousTransporterID !== receivingTransporterID && previousResIDs.includes(newResID)) {
						break
					}
				}
				// But if a previous action was something ARRIVING on the hex, we must stop looking
				else if (previousEntry.action === rf.STACK_MOVE_LAND) {
					const fullToLocation = decompressLocation(previousEntry.historyEntry[3])
					const toHexID = fullToLocation[1]

					if (toHexID === newPickupHexID) {
						break
					}
				} else if (previousEntry.action === rf.STACK_MOVE_WATER) {
					const toLocationBucket = decompressWaterLocation(previousEntry.historyEntry[3])
					const arrivingHexID = toLocationBucket[1]

					if (arrivingHexID === newPickupHexID) {
						break
					}
				}
				idx--
			}
		}

		// Combine wonder bricks
		else if (newItemAction === rf.STACK_ADD_WONDER_BRICKS) {
			idx = store.actionStack.length - 1
			const newResUsed = [...newItemHistoryEntry[1]]
			while (idx >= 0) {
				let previousEntry = store.actionStack[idx]
				if (previousEntry.action === rf.STACK_ADD_WONDER_BRICKS) {
					store.actionStack[idx].historyEntry.push([...newResUsed])
					combinedAction = true
					break
				}
				idx--
			}
		}
	}
	/*************************************
	 *
	 * We have checked if it's a reverse, and removed both, OR we can add to a previous entry
	 * If it's not, add the new entry
	 * In all cases, synch the stack.historyEntry with the history entry
	 *
	 *************************************/
	//console.log(`actionstack store: ${JSON.stringify(store.actionStack)} newitem: ${JSON.stringify(newItem)}`)
	if (newItem == null || newItem.historyEntry.some((e) => e == null)) rf.doAdminAlrt("SEND TO ADMIN: ERROR CODE 9 - error adding to stack")
	if (!reversedAction && !combinedAction) store.actionStack.push(newItem)
	// Match the history with the stack
	idx = Math.max(0, store.history.length - 1)

	// Map the stack to get an array of historyEntry values
	const historyEntries = store.actionStack.map((subArr) => subArr.historyEntry)
	let phaseToUse = store.gameflow.phase
	if (phaseToUse >= rf.PRE_PHASE_OFFSET) phaseToUse -= rf.PRE_PHASE_OFFSET

	// Add the history - addItemToStack comes from INDIVIDUAL actions, so must be using POV (or first player in trainingGame)
	let playerIndexToUse = personal.pov
	if (personal.trainingGame) playerIndexToUse = store.gameflow.turnOrder[0]

	if (store.history.length > 0 && store.history[idx][0] === rf.HIST_STACK_ACTIONS && store.history[idx][1] === playerIndexToUse && store.history[idx][3][0] === phaseToUse) {
		// 1. Create a shallow copy of the history row
		let histEntry = [...store.history[idx]]

		// 2. Create a NEW array for index 3, taking only the first element
		// This breaks the reference so you don't mutate the store accidentally
		histEntry[3] = [histEntry[3][0], ...util.deepCloneValue(historyEntries)]

		// 3. (Optional) Save it back to the store if you want the change to persist
		store.history[idx] = histEntry
	} else {
		// Create new history entry with the phase and the mapped entries
		// Make sure we don't add the PRE-phase instead

		// Add the history - addItemToStack comes from INDIVIDUAL actions, so must be using POV (or first player in trainingGame)
		model.addHistory(rf.HIST_STACK_ACTIONS, playerIndexToUse, 0, [phaseToUse, ...historyEntries])
	}
}

/**************************************
 *
 *
 *
 *
 *
 */

// Currently, this ONLY comes from processing stacks, from IO, AFTER you've saved, so must ALWAYS use store.gameflow.turnOrder[0]
export function verifyAndPerformStack(stack, processingFirstPlayer) {
	const store = useModelStore()

	// Capture player index and phase BEFORE performing actions,
	// since performSingleStackAction can trigger checkAndPerformEndGame
	// which overwrites turnOrder and phase
	let playerIndexToUse = controller.currentPlayerIndex()
	if (processingFirstPlayer) playerIndexToUse = store.gameflow.turnOrder[0]
	let phaseToUse = store.gameflow.phase

	//}
	// Check each of the actions in order
	// If any of them are invalid, return false
	// If all of them are valid, return true
	for (let i = 0; i < stack.length; i++) {
		let errorCode = verifySingleStackAction(stack[i])
		if (errorCode !== 0) {
			//console.log(`Error verifying entry: ${i} -- Error: ${errorCode} - ${JSON.stringify(stack[i])}`)
			return {
				verified: false,
				errorCode: errorCode,
				entry: stack[i],
				actionNum: i,
			}
		}
		// Otherwise, you need to perform the action, to set up the game
		// in the same state to test the next action on the stack
		else performSingleStackAction(stack[i], true)
	}

	// At this point, the stack is valid, so make the history entry

	let stackEntries = []
	for (let i = 0; i < stack.length; i++) {
		stackEntries.push(stack[i].historyEntry)
	}
	// Currently, this ONLY comes from processing stacks,so must ALWAYS use store.gameflow.turnOrder[0]
	model.addHistory(rf.HIST_STACK_ACTIONS, playerIndexToUse, 0, [phaseToUse, ...stackEntries])

	return {
		verified: true,
	}
}

function resolvePseudoResourceID(resID) {
	if (typeof resID !== "string" || resID.length < 3) return resID

	// 1. Only act if the Category digits (index 1,2) are "28"
	if (resID.substring(1, 3) !== "28") return resID

	// 2. Check if the original still exists (and isn't Out of Bounds)
	const resObj = model.getResByID(resID)
	if (resObj && !loc.isOOBlocation(resObj.location)) return resID

	// 3. Search for replacement
	const allResources = model.getAllInGameResources()
	const suffix = resID.substring(3) // The part that MUST match
	const prefix = resID[0] // The player/non-player digit

	for (const candidate of allResources) {
		const cID = String(candidate.uniqueID)
		if (cID.length !== resID.length) continue

		// Check if prefix and suffix match
		if (cID[0] === prefix && cID.endsWith(suffix)) {
			const category = cID.substring(1, 3)
			// Verify the new category is actually Iron (07) or Gold (08)
			if (category === "07" || category === "08") {
				return candidate.id
			}
		}
	}

	return resID
}

export function verifySingleStackAction(stackActionData) {
	const store = useModelStore()

	const action = stackActionData.action
	const histEntry = stackActionData.historyEntry
	const stackAction = histEntry
	const playerIndex = stackActionData.playerIndex
	if (!playerIndex && playerIndex !== 0) {
		rf.doAdminAlrt(`missing PI in SAD - PI: ${playerIndex}`)
		//console.log(JSON.stringify(stackActionData))
	}

	if (action === rf.STACK_MOVE_LAND) {
		// Split out the parameters
		let movingTransporterID = stackAction[1]
		//if (movingTransporterID >= knownTransLen) movingTransporterID += transIDdelta
		const fullFromLocation = decompressLocation(stackAction[2])
		const fullToLocation = decompressLocation(stackAction[3])
		const contents = stackAction[4]
		let numGeeseFollowing = 0
		if (stackAction.length >= 6) numGeeseFollowing = stackAction[5][0]
		//const geeseDropped = stackAction[5].length > 1 && stackAction[5][1] === 1

		const fromHexID = fullFromLocation[1]
		const fromBucketID = fullFromLocation[2]
		const toHexID = fullToLocation[1]
		const toBucketID = fullToLocation[2]

		// Verify the initial transporter exists
		const transporterObj = model.getTransporterByID(movingTransporterID)
		if (loc.isOOBlocation(transporterObj.location)) {
			rf.doAdminAlrt("Transporter not found")
			return 1
		}
		// Verify it is at the start location
		if (transporterObj.location[0] !== rf.LOCATION_LAND_VERTEX) {
			rf.doAdminAlrt(`2.1 - Transporter location type incorrect: ${transporterObj.location} vs ${rf.LOCATION_LAND_VERTEX}`)
			return 2.1
		}
		if (transporterObj.location[1] !== fromHexID) {
			rf.doAdminAlrt(`2.2 - Transporter hexID incorrect: ${transporterObj.location} vs ${fromHexID}`)
			return 2.2
		}
		if (loc.getBucketIDfromAnyHexIDandVertex(transporterObj.location[1], transporterObj.location[2]) !== fromBucketID) {
			rf.doAdminAlrt(`2.3 - Transporter from bucketID incorrect: ${loc.getBucketIDfromAnyHexIDandVertex(transporterObj.location[1], transporterObj.location[2])} vs ${fromBucketID}`)
			return 2.3
		}
		let resourcesOnTransporter = model.resourcesOnTransport(transporterObj.id).map((r) => [r.id, r.uniqueID])
		let resourcesFollowingTransporter = model.resourcesFollowingTransporter(transporterObj.id)
		let transporterOntrans = model.transportersOnTransporter(transporterObj.id).map((t) => [t.id, t.uniqueID])
		if (resourcesOnTransporter.length > 0) {
			for (const [actualID, actualUniqueID] of resourcesOnTransporter) {
				// Check if actual ID or UniqueID exists directly in contents
				let found = contents.includes(actualID) || contents.includes(actualUniqueID)

				// FALLBACK: If not found, check if contents has a Pseudo ID (28)
				// that maps to this actual resource (07/08)
				if (!found) {
					found = contents.some((contentID) => {
						if (typeof contentID !== "string") return false
						// Run your resolution logic to see if this contentID
						// is a "28" version of the actualUniqueID
						return resolvePseudoResourceID(contentID) === actualID
					})
				}

				if (!found) {
					rf.doAdminAlrt(`3 - Transporter contents incorrect res: ${actualUniqueID} not in ${contents}`)
					return 3
				}
			}

			// Check that the total counts match
			if (resourcesOnTransporter.length !== contents.length) {
				rf.doAdminAlrt(`3 - Count mismatch: ${resourcesOnTransporter.length} vs ${contents.length}`)
				return 3
			}
		}
		if (transporterOntrans.length > 0) {
			// contents should be [-1, transID] where transID can be either id or uniqueID
			if (contents.length !== 2 || contents[0] !== -1) {
				rf.doAdminAlrt(`4 - Transporter contents incorrect trans: ${transporterOntrans} vs ${contents}`)
				return 4
			}
			const transID = contents[1]
			// Check if the transID matches either id or uniqueID of the carried transporter
			const [id, uniqueID] = transporterOntrans[0]
			if (transID !== id && transID !== uniqueID) {
				rf.doAdminAlrt(`4 - Transporter contents incorrect trans: ${transporterOntrans} vs ${contents}`)
				return 4
			}
		}
		if (numGeeseFollowing !== resourcesFollowingTransporter.length) {
			rf.doAdminAlrt("Number of geese following incorrect")
			return 5
		}

		const movingTransporterObj = model.getTransporterByID(movingTransporterID)
		// Make sure there are moves remaining
		if (movingTransporterObj.remainingMoves <= 0) return 6

		// Find reachable locations
		const stats = rf.getTransporterStats(transporterObj.type)
		const isCaravan = transporterObj.type === rf.EXHIBITION_TRANSPORTER
		const movementGraph = graph.createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, playerIndex, isCaravan, isCaravan)
		const pathfind = graph.pathfind(movementGraph, transporterObj.location, stats.validMove, transporterObj.remainingMoves)
		let indicesToValid = util.boolFilter(
			util.indexArray(pathfind.locations.length),
			pathfind.cost.map((cost) => cost > 0)
		)
		// Smallest distance (i) comes first
		indicesToValid.sort((i, k) => pathfind.distances[i] - pathfind.distances[k])

		const validMoves = util.getByIndices(pathfind.locations, indicesToValid)
		if (!toBucketID && toBucketID !== 0) rf.doAdminAlrt(`bucket error 1 ${toBucketID}`)

		const toVertex = loc.getAnyVertexInHexIDbucketID(toHexID, toBucketID)
		if (loc.getBucketIDfromAnyHexIDandVertex(toHexID, toVertex) !== toBucketID) return 7

		const toLocation = [rf.LOCATION_LAND_VERTEX, toHexID, toVertex]
		if (!util.includesArray(validMoves, toLocation)) return 8

		// Everything checks out
		return 0
	}
	if (action === rf.STACK_MOVE_WATER) {
		// Split out the parameters
		let movingTransporterID = stackAction[1]
		//if (movingTransporterID >= knownTransLen) movingTransporterID += transIDdelta
		const compressedFromLocation = stackAction[2]
		const fromLocationBucket = decompressWaterLocation(compressedFromLocation)
		const toLocationBucket = decompressWaterLocation(stackAction[3])
		const contents = stackAction[4]
		let numGeeseFollowing = 0
		if (stackAction.length >= 6) numGeeseFollowing = stackAction[5][0]
		//const geeseDropped = stackAction[5].length > 1 && stackAction[5][1] === 1

		// Verify the initial transporter exists
		const transporterObj = model.getTransporterByID(movingTransporterID)
		if (loc.isOOBlocation(transporterObj.location)) {
			rf.doAdminAlrt("Transporter not found")
			return 1
		}
		// Verify it is at the start location
		if (!util.arraysEqual(compressWaterLocation(transporterObj.location), compressedFromLocation)) {
			rf.doAdminAlrt(`Transporter start location incorrect: ${transporterObj.location} vs ${fromLocationBucket}`)
			return 2
		}
		let resourcesOnTransporter = model.resourcesOnTransport(transporterObj.id).map((r) => [r.id, r.uniqueID])
		let resourcesFollowingTransporter = model.resourcesFollowingTransporter(transporterObj.id)
		let transporterOntrans = model.transportersOnTransporter(transporterObj.id).map((t) => [t.id, t.uniqueID])
		if (resourcesOnTransporter.length > 0) {
			for (const [actualID, actualUniqueID] of resourcesOnTransporter) {
				// Check if actual ID or UniqueID exists directly in contents
				let found = contents.includes(actualID) || contents.includes(actualUniqueID)

				// FALLBACK: If not found, check if contents has a Pseudo ID (28)
				// that maps to this actual resource (07/08)
				if (!found) {
					found = contents.some((contentID) => {
						if (typeof contentID !== "string") return false
						return resolvePseudoResourceID(contentID) === actualID
					})
				}

				if (!found) {
					rf.doAdminAlrt(`3 - Transporter contents incorrect res: ${actualUniqueID} not in ${contents}`)
					return 3
				}
			}

			// Check that the total counts match
			if (resourcesOnTransporter.length !== contents.length) {
				rf.doAdminAlrt(`3 - Count mismatch: ${resourcesOnTransporter.length} vs ${contents.length}`)
				return 3
			}
		}
		if (transporterOntrans.length > 0) {
			// contents should be [-1, transID] where transID can be either id or uniqueID
			if (contents.length !== 2 || contents[0] !== -1) {
				rf.doAdminAlrt(`4 - Transporter contents incorrect trans: ${transporterOntrans} vs ${contents}`)
				return 4
			}
			const transID = contents[1]
			// Check if the transID matches either id or uniqueID of the carried transporter
			const [id, uniqueID] = transporterOntrans[0]
			if (transID !== id && transID !== uniqueID) {
				rf.doAdminAlrt(`4 - Transporter contents incorrect trans: ${transporterOntrans} vs ${contents}`)
				return 4
			}
		}
		if (numGeeseFollowing !== resourcesFollowingTransporter.length) {
			rf.doAdminAlrt("Number of geese following incorrect")
			return 5
		}

		const movingTransporterObj = model.getTransporterByID(movingTransporterID)
		// Make sure there are moves remaining
		if (movingTransporterObj.remainingMoves <= 0) return 6

		// Check if a valid water destination exists
		const result = graph.findValidWaterDestination(toLocationBucket, transporterObj, playerIndex)
		if (!result) {
			rf.doAdminAlrt("Invalid water move - no path found")
			return 7
		}

		// Everything checks out
		return 0
	}
	if (action === rf.STACK_STRICT_PICKUP_RES) {
		let transporterID = stackAction[1]
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const resIDs = stackAction[2]
		const reachableResources = loc.getAllResourcesAccessibleToTransporter(transporterID, false)
		for (const resID of resIDs) {
			//let correctedResID = resID
			//if (correctedResID >= knownResLen) correctedResID += resIDdelta
			if (typeof resID === "number" && !reachableResources.some((res) => res.id === resID)) return 1
			if (typeof resID === "string" && !reachableResources.some((res) => res.uniqueID === resID)) {
				// Try pseudo ID resolution
				const resolvedID = resolvePseudoResourceID(resID)
				if (typeof resolvedID === "number" && !reachableResources.some((res) => res.id === resolvedID)) return 1
				if (typeof resolvedID !== "number") return 1
			}
		}
		return 0
	}
	if (action === rf.STACK_STRICT_DROP_RES) {
		let transporterID = stackAction[1]
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const resIDs = stackAction[2]
		const dropHexID = stackAction[3][0]
		let dropBucket = 0
		if (stackAction[3].length > 1) dropBucket = stackAction[3][1]
		const hexObj = model.getHexByID(dropHexID)
		const transporterObj = model.getTransporterByID(transporterID)
		const dropVertex = loc.getAnyVertexInHexIDbucketID(dropHexID, dropBucket)
		const dropLocation = [rf.LOCATION_LAND_VERTEX, dropHexID, dropVertex]
		if (hexObj.baseTerrain === rf.TERR_SEA) dropLocation[0] = rf.LOCATION_SEA_VERTEX
		const reachableLocs = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, false, "ssdr")
		// Check you can reach the drop location
		if (!util.includesArray(reachableLocs, dropLocation)) return 1
		// Check all the res are on the transp
		for (const resID of resIDs) {
			let correctedResID = resID
			//if (correctedResID >= knownResLen) correctedResID += resIDdelta
			const resObj = model.getResByID(correctedResID)
			if (!resObj) return 4
			if (resObj.location[0] !== rf.LOCATION_TRANSPORTER) return 2
			const transporterObj = model.getTransporterByID(transporterID)
			if (resObj.location[1] !== transporterObj.id && resObj.location[1] !== transporterObj.uniqueID) {
				// Try pseudo ID resolution
				const resolvedID = resolvePseudoResourceID(resObj.location[1])
				if (resolvedID !== transporterObj.id && resolvedID !== transporterObj.uniqueID) return 3
			}
		}
		return 0
	}
	if (action === rf.STACK_PICKUP_RES_TO_FOLLOW) {
		let transporterID = stackAction[1]
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const resIDs = stackAction[2]
		const reachableResources = loc.getAllResourcesAccessibleToTransporter(transporterID, false)
		for (const resID of resIDs) {
			let correctedResID = resID
			//if (correctedResID >= knownResLen) correctedResID += resIDdelta
			if (typeof correctedResID === "number" && !reachableResources.some((res) => res.id === correctedResID)) return 1
			if (typeof correctedResID === "string" && !reachableResources.some((res) => res.uniqueID === correctedResID)) {
				// Try pseudo ID resolution
				const resolvedID = resolvePseudoResourceID(correctedResID)
				if (typeof resolvedID === "number" && !reachableResources.some((res) => res.id === resolvedID)) return 1
				if (typeof resolvedID !== "number") return 1
			}
		}
		return 0
	}
	if (action === rf.STACK_DROP_RES_FOLLOWING) {
		let transporterID = stackAction[1]
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const resIDs = stackAction[2]
		const dropHexID = stackAction[3][0]
		let dropBucket = 0
		if (stackAction[3].length > 1) dropBucket = stackAction[3][1]
		const hexObj = model.getHexByID(dropHexID)
		const transporterObj = model.getTransporterByID(transporterID)
		const dropVertex = loc.getAnyVertexInHexIDbucketID(dropHexID, dropBucket)
		const dropLocation = [rf.LOCATION_LAND_VERTEX, dropHexID, dropVertex]
		if (hexObj.baseTerrain === rf.TERR_SEA) dropLocation[0] = rf.LOCATION_SEA_VERTEX
		const reachableLocs = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, false, "sdrf")
		if (!util.includesArray(reachableLocs, dropLocation)) return 1
		// Check all the res are following the trans
		for (const resID of resIDs) {
			let correctedResID = resID
			// (correctedResID >= knownResLen) correctedResID += resIDdelta
			const resObj = model.getResByID(correctedResID)
			if (!resObj) return 4
			if (resObj.location[0] !== rf.LOCATION_FOLLOWER) return 2
			const transporterObj = model.getTransporterByID(transporterID)
			if (resObj.location[1] !== transporterObj.id && resObj.location[1] !== transporterObj.uniqueID) {
				// Try pseudo ID resolution
				const resolvedID = resolvePseudoResourceID(resObj.location[1])
				if (resolvedID !== transporterObj.id && resolvedID !== transporterObj.uniqueID) return 3
			}
		}
		return 0
	}

	if (action === rf.STACK_PICKUP_TRANSPORTER) {
		let mainTransporterID = stackAction[1]
		//if (mainTransporterID >= knownTransLen) mainTransporterID += transIDdelta
		let transporterBeingPickedUpID = stackAction[2]
		//if (transporterBeingPickedUpID >= knownTransLen) transporterBeingPickedUpID += transIDdelta
		const mainTransporterObj = model.getTransporterByID(mainTransporterID)
		const transporterBeingPickedUpObj = model.getTransporterByID(transporterBeingPickedUpID)
		const eligibleLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(mainTransporterObj.location, false)

		if (!util.includesArray(eligibleLocations, transporterBeingPickedUpObj.location)) return 1
		return 0
	}
	if (action === rf.STACK_STRICT_FERRY_RES) {
		let transporterID = stackAction[1]
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const transporterObj = model.getTransporterByID(transporterID)
		const resIDs = stackAction[2]
		// NB: This includes all res except stealing, which is correct
		const reachableResources = loc.getAllResourcesAccessibleToTransporter(transporterID, false)
		for (const resID of resIDs) {
			let correctedResID = resID
			//if (correctedResID >= knownResLen) correctedResID += resIDdelta
			if (typeof correctedResID === "number" && !reachableResources.some((res) => res.id === correctedResID)) return 1
			if (typeof correctedResID === "string" && !reachableResources.some((res) => res.uniqueID === correctedResID)) {
				// Try pseudo ID resolution
				const resolvedID = resolvePseudoResourceID(correctedResID)
				if (typeof resolvedID === "number" && !reachableResources.some((res) => res.id === resolvedID)) return 1
				if (typeof resolvedID !== "number") return 1
			}
		}

		const dropHexID = stackAction[3][0]
		let dropBucket = 0
		if (stackAction[3].length > 1) dropBucket = stackAction[3][1]
		const dropVertex = loc.getAnyVertexInHexIDbucketID(dropHexID, dropBucket)
		const dropLocation = [rf.LOCATION_LAND_VERTEX, dropHexID, dropVertex]
		const hexObj = model.getHexByID(dropHexID)
		if (hexObj.baseTerrain === rf.TERR_SEA) dropLocation[0] = rf.LOCATION_SEA_VERTEX

		// Allow a 2nd ferry in case it's a double ferry on brackets tile
		let validLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, true, "ssfr")
		if (!util.includesArray(validLocations, dropLocation)) return 2

		return 0
	}
	if (action === rf.STACK_DROP_TRANSPORTER) {
		let mainTransporterID = stackAction[1]
		//if (mainTransporterID >= knownTransLen) mainTransporterID += transIDdelta
		let carriedTransporterID = stackAction[2]
		//if (carriedTransporterID >= knownTransLen) carriedTransporterID += transIDdelta
		const droppingLocationStack = stackAction[3]
		const mainTransporterObj = model.getTransporterByID(mainTransporterID)
		const carriedTransporterObj = model.getTransporterByID(carriedTransporterID)
		const eligibleLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(mainTransporterObj.location, false, "sdt")

		const droppingLocationFullBucket = decompressLocation(droppingLocationStack)

		const droppingLocationFullVertex = loc.getVisualLocationFromBucketLocation(droppingLocationFullBucket)

		if (!util.includesArray(eligibleLocations, droppingLocationFullVertex)) return 1
		// Check the carried trans is being carried
		if (carriedTransporterObj.location[0] !== rf.LOCATION_TRANSPORTER) return 2
		if (carriedTransporterObj.location[1] !== mainTransporterObj.id && carriedTransporterObj.location[1] !== mainTransporterObj.uniqueID) return 3
		return 0
	}
	if (action === rf.STACK_STEAL_RES) {
		// let stackAction = [rf.STACK_STEAL_RES, selectedTransporterObj.id, transporterID, resourceID, [...selectedTransporterObj.location]]
		let mainTransporterID = stackAction[1]
		//if (mainTransporterID >= knownTransLen) mainTransporterID += transIDdelta
		let otherTransporterID = stackAction[2]
		//	if (otherTransporterID >= knownTransLen) otherTransporterID += transIDdelta
		const otherTransObj = model.getTransporterByID(otherTransporterID)
		const resIDs = stackAction[3]
		//const mainTransporterLocation = stackAction[4]
		const reachableResources = loc.getAllResourcesAccessibleToTransporter(mainTransporterID, true)
		for (const resID of resIDs) {
			let correctedResID = resID
			// (correctedResID >= knownResLen) correctedResID += resIDdelta
			if (typeof correctedResID === "number" && !reachableResources.some((res) => res.id === correctedResID)) return 1
			if (typeof correctedResID === "string" && !reachableResources.some((res) => res.uniqueID === correctedResID)) {
				// Try pseudo ID resolution
				const resolvedID = resolvePseudoResourceID(correctedResID)
				if (typeof resolvedID === "number" && !reachableResources.some((res) => res.id === resolvedID)) return 1
				if (typeof resolvedID !== "number") return 1
			}
			const resObj = model.getResByID(correctedResID)
			if (!resObj) return 4
			if (resObj.location[0] !== rf.LOCATION_TRANSPORTER) return 2
			if (resObj.location[1] !== otherTransObj.id && resObj.location[1] !== otherTransObj.uniqueID) return 3
		}
		return 0
	}
	/**************************** BUILDING ACTIONS **************************************************/
	if (action === rf.STACK_BUILD_ROAD) {
		let transporterID = stackAction[1]
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const fromStackLocation = stackAction[2]
		const toStackLocation = stackAction[3]

		const fromHexID = fromStackLocation[0]
		const toHexID = toStackLocation[0]
		let fromBucketID = 0
		let toBucketID = 0
		if (fromStackLocation.length > 1) fromBucketID = fromStackLocation[1]
		if (toStackLocation.length > 1) toBucketID = toStackLocation[1]

		const transporterObj = model.getTransporterByID(transporterID)
		const fromvertex = loc.getAnyVertexInHexIDbucketID(fromHexID, fromBucketID)
		const fromRoadLocation = [rf.LOCATION_LAND_VERTEX, fromHexID, fromvertex]

		const validLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, false, "sbr")
		// Check you can reach the FROM location
		if (!util.includesArray(validLocations, fromRoadLocation)) return 1
		const reachableResources = loc.getAllResourcesAccessibleToTransporter(transporterID, true)
		// Check you can reach a stone for building
		if (!reachableResources.some((res) => res.type === rf.RES_STONE)) return 2
		// Check there isn't already a road there
		// Find the joining side from the first to the 2nd hex
		const fromHex = model.getHexByID(fromHexID)
		const toHex = model.getHexByID(toHexID)
		const fromHexSide = hd.getJoiningSide(fromHex.coord, toHex.coord)
		const toHexSide = (fromHexSide + 3) % 6
		const edgeData = store.mapData.edgeData[fromHex.edgeLookup[fromHexSide]]
		const flipped = edgeData.edgeHexIDs[1] === fromHexID
		const hexIds = flipped ? [toHexID, fromHexID] : [fromHexID, toHexID]
		const hexSides = flipped ? [toHexSide, fromHexSide] : [fromHexSide, toHexSide]
		const bucketIds = flipped ? [toBucketID, fromBucketID] : [fromBucketID, toBucketID]
		const hexes = hexIds.map(model.getHexByID)

		// If there is only 1 road option, then build the road
		if (edgeData.hasRoad.length === 1) {
			if (edgeData.hasRoad[0]) return 3
		}
		// Otherwise we need to find which side of the river the road should be
		else {
			const firstHexCorner = hexes[0].cornerNodeIds[hexSides[0]][0]
			const secondHexCorner = hexes[1].cornerNodeIds[hexSides[1]][1]
			const oppositeCorner = hexes[0].nodeBucketIds[firstHexCorner] !== bucketIds[0] || hexes[1].nodeBucketIds[secondHexCorner] !== bucketIds[1]
			const actual = oppositeCorner ? 1 : 0
			if (edgeData.hasRoad[actual]) return 3
		}
		return 0
	}
	//
	else if (action === rf.STACK_BUILD_POWER_LINE) {
		let transporterID = stackAction[1]
		const fromStackLocation = stackAction[2]
		const toStackLocation = stackAction[3]

		const fromHexID = fromStackLocation[0]
		const toHexID = toStackLocation[0]
		let fromBucketID = 0
		let toBucketID = 0
		if (fromStackLocation.length > 1) fromBucketID = fromStackLocation[1]
		if (toStackLocation.length > 1) toBucketID = toStackLocation[1]

		const transporterObj = model.getTransporterByID(transporterID)
		const fromvertex = loc.getAnyVertexInHexIDbucketID(fromHexID, fromBucketID)
		const fromPowerLineLocation = [rf.LOCATION_LAND_VERTEX, fromHexID, fromvertex]

		const validLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, false, "sbpl")
		// Check you can reach the FROM location
		if (!util.includesArray(validLocations, fromPowerLineLocation)) return 1
		const reachableResources = loc.getAllResourcesAccessibleToTransporter(transporterID, true)
		// Check you can reach iron for building
		if (!reachableResources.some((res) => res.type === rf.RES_IRON)) return 2
		// Check there isn't already a power line there
		const fromHex = model.getHexByID(fromHexID)
		const toHex = model.getHexByID(toHexID)
		const fromHexSide = hd.getJoiningSide(fromHex.coord, toHex.coord)
		const toHexSide = (fromHexSide + 3) % 6
		const edgeData = store.mapData.edgeData[fromHex.edgeLookup[fromHexSide]]
		const flipped = edgeData.edgeHexIDs[1] === fromHexID
		const hexIds = flipped ? [toHexID, fromHexID] : [fromHexID, toHexID]
		const hexSides = flipped ? [toHexSide, fromHexSide] : [fromHexSide, toHexSide]
		const bucketIds = flipped ? [toBucketID, fromBucketID] : [fromBucketID, toBucketID]
		const hexes = hexIds.map(model.getHexByID)

		// If there is only 1 power line option, then build the power line
		if (edgeData.hasPowerLine.length === 1) {
			if (edgeData.hasPowerLine[0]) return 3
		}
		// Otherwise we need to find which side of the river the power line should be
		else {
			const firstHexCorner = hexes[0].cornerNodeIds[hexSides[0]][0]
			const secondHexCorner = hexes[1].cornerNodeIds[hexSides[1]][1]
			const oppositeCorner = hexes[0].nodeBucketIds[firstHexCorner] !== bucketIds[0] || hexes[1].nodeBucketIds[secondHexCorner] !== bucketIds[1]
			const actual = oppositeCorner ? 1 : 0
			if (edgeData.hasPowerLine[actual]) return 3
		}
		return 0
	}
	//
	else if (action === rf.STACK_BUILD_BRIDGE) {
		let transporterID = stackAction[1]
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const hexID = stackAction[2]
		let bridgeIdx = 0
		if (stackAction.length > 3) bridgeIdx = stackAction[3]
		const hexObj = model.getHexByID(hexID)
		const bridgeArr = hexObj.bridges[bridgeIdx]

		const transporterObj = model.getTransporterByID(transporterID)
		const validLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, false, "sbb")
		if (!util.includesArray(validLocations, [rf.LOCATION_LAND_VERTEX, hexID, bridgeArr[0]]) && !util.includesArray(validLocations, [rf.LOCATION_LAND_VERTEX, hexID, bridgeArr[1]])) return 1
		const reachableResources = loc.getAllResourcesAccessibleToTransporter(transporterID, true)
		// Check you can reach a stone for building
		if (!reachableResources.some((res) => res.type === rf.RES_STONE)) return 2
		// Check there isn't already a bridge there
		if (hexObj.builtBridges.some((b) => b[0] === bridgeArr[0] && b[1] === bridgeArr[1])) return 3
		return 0
	}
	//
	else if (action === rf.STACK_BUILD_WALL) {
		let transporterID = stackAction[1]
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const transporterHexID = stackAction[2]
		const otherHexID = stackAction[3]
		const newLevel = stackAction[4]

		const transporterObj = model.getTransporterByID(transporterID)
		// The transporter must be on the correct hex
		if (transporterObj.location[1] !== transporterHexID) return 1
		// You must have access to resources
		let [id1, id2] = transporterHexID < otherHexID ? [transporterHexID, otherHexID] : [otherHexID, transporterHexID]
		let edgeEntry = model.getEdgeDataFromHexID(id1, id2)
		let currentWallLevel = edgeEntry.wall[0]
		let currentWallOwner = edgeEntry.wall[1]
		const transporterOwnerIndex = transporterObj.ownerIndex
		// If you don't own the wall, you cannot build it
		if (currentWallLevel > 0 && currentWallOwner !== -1 && currentWallOwner !== transporterOwnerIndex) return 2
		// If the current level isn't correct, fail the move
		if (currentWallLevel !== newLevel - 1) return 3

		const transporterLocation = transporterObj.location
		let resIncreaseDueBuildingFromWater = 0
		if (loc.isWaterVertexLocation(transporterLocation)) resIncreaseDueBuildingFromWater = 2
		let requiredResources = []
		//let stoneUsed = true
		// At level 0, you are building the first wall
		if (currentWallLevel === 0) {
			requiredResources = [rf.RES_STONE]
			for (let i = 0; i < resIncreaseDueBuildingFromWater; i++) requiredResources.push(rf.RES_STONE)
		}
		// Else if you own it, OR are building up a demolished wall, need lvl+1 stone
		else if (currentWallOwner === transporterOwnerIndex || currentWallOwner === -1) {
			for (let i = 0; i <= currentWallLevel; i++) requiredResources.push(rf.RES_STONE)
			for (let i = 0; i < resIncreaseDueBuildingFromWater; i++) requiredResources.push(rf.RES_STONE)
		}
		let errorFlag = model.removeResourcesFromGameUsingTransporter(transporterID, requiredResources, true)
		if (errorFlag > 0) return errorFlag + 10
		return 0
	}
	//
	else if (action === rf.STACK_DEMOLISH_WALL) {
		let transporterID = stackAction[1]
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const transporterHexID = stackAction[2]
		const otherHexID = stackAction[3]
		const currentLevel = stackAction[4]

		const transporterObj = model.getTransporterByID(transporterID)
		// The transporter must be on the correct hex
		if (transporterObj.location[1] !== transporterHexID) return 1
		// You must have access to resources
		let [id1, id2] = transporterHexID < otherHexID ? [transporterHexID, otherHexID] : [otherHexID, transporterHexID]
		let edgeEntry = model.getEdgeDataFromHexID(id1, id2)
		let currentWallLevel = edgeEntry.wall[0]
		let currentWallOwner = edgeEntry.wall[1]
		const transporterOwnerIndex = transporterObj.ownerIndex
		// If you own the wall, you cannot demolish it
		if (currentWallOwner === transporterOwnerIndex) return 2
		// If it is already demolished, you cannot demolish it
		if (currentWallOwner === -1) return 3
		// If the levels don't match, fail the move
		if (currentWallLevel !== currentLevel) return 4

		const transporterLocation = transporterObj.location
		let resIncreaseDueBuildingFromWater = 0
		if (loc.isWaterVertexLocation(transporterLocation)) resIncreaseDueBuildingFromWater = 2
		let requiredResources = []
		//  to demolish it, need boards + level
		requiredResources.splice(0)
		for (let i = 0; i <= currentWallLevel; i++) requiredResources.push(rf.RES_BOARDS)
		for (let i = 0; i < resIncreaseDueBuildingFromWater; i++) requiredResources.push(rf.RES_BOARDS)

		let errorFlag = model.removeResourcesFromGameUsingTransporter(transporterID, requiredResources, true)
		if (errorFlag > 0) return errorFlag + 10
		return 0
	}
	//
	else if (action === rf.STACK_BUILD_BUILDING) {
		let transporterID = stackAction[1]
		const buildingType = stackAction[2]
		const compressedLocation = stackAction[3]
		const bldgStats = rf.BUILDING_STATS.find((b) => b.building === buildingType)
		const requiredRes = [...bldgStats.cost]
		const fullLocation = decompressLocation(compressedLocation)
		const hexID = fullLocation[1]
		const bucketId = fullLocation[2]
		const vertex = loc.getAnyVertexInHexIDbucketID(hexID, bucketId)
		let location = [rf.LOCATION_LAND_VERTEX, hexID, vertex]
		const hexObj = model.getHexByID(hexID)
		if (hexObj.baseTerrain === rf.TERR_SEA) location = [rf.LOCATION_SEA_VERTEX, hexID, vertex]
		const transporterObj = model.getTransporterByID(transporterID)
		// You can build over a ferry
		const validLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, true, "sbblg")
		if (!util.includesArray(validLocations, location)) return 1
		// Check you have the required resources
		let errorFlag = model.removeResourcesFromGameUsingTransporter(transporterID, requiredRes, true)
		if (errorFlag > 0) return errorFlag + 10
		// Check there are not already too many buildings
		const maxBuildings = hexObj.terrainID === rf.CITY ? 2 : 1
		const buildingsOnTile = model.getAllInGameBuildings().filter((b) => loc.isSpecificHexLocation(b.location, hexID))
		const spaceForBuilding = buildingsOnTile.length < maxBuildings
		if (!spaceForBuilding) return 2
		return 0
	} else if (action === rf.STACK_RESHAFT_MINE) {
		//	let stackAction = [rf.STACK_RESHAFT_MINE, stack.getTransIDtoUse(transporterObj), stack.getBldgIDtoUse(mineObj), [...compressedLocation]]
		const transporterID = stackAction[1]
		const mineID = stackAction[2]

		const compressedMineLoc = stackAction[3]
		const fullLocation = decompressLocation(compressedMineLoc)

		// Check ths mine exists
		const mineObj = model.getBuildingByID(mineID, "stk 1")
		if (loc.isOOBlocation(mineObj.location) || mineObj.location[1] !== fullLocation[1]) return 1
		const hexID = fullLocation[1]
		const bucketId = fullLocation[2]
		const vertex = loc.getAnyVertexInHexIDbucketID(hexID, bucketId)
		const location = [rf.LOCATION_LAND_VERTEX, hexID, vertex]
		const transporterObj = model.getTransporterByID(transporterID)
		const validLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, false, "sbblg")
		if (!util.includesArray(validLocations, location)) return 2
		// Now check the transporter has access to the resources
		let errorFlag = model.removeResourcesFromGameUsingTransporter(transporterID, [rf.RES_FUEL, rf.RES_IRON], true)
		if (errorFlag > 0) return errorFlag + 10
		return 0
	}
	//**************************** END BUILDING ACTIONS **************************************************/
	//**************************** PRODUCTION *********************************************** */
	else if (action === rf.STACK_MANUAL_PRODUCTION) {
		// TODO: make raft THEN someone builds wall to block it
		// 	let stackAction = [rf.STACK_MANUAL_PRODUCTION, building.id, transporterID, [...stackLocation]]
		let buildingID = stackAction[1]
		const transporterID = stackAction[2]
		const compressedLoc = stackAction[3]
		const fullLocation = decompressLocation(compressedLoc)
		// Check ths bldg exists
		const bldgObj = model.getBuildingByID(buildingID, "stk 2")
		if (!bldgObj || loc.isOOBlocation(bldgObj.location) || bldgObj.location[1] !== fullLocation[1]) return 1
		// Check the bldg can operate
		if (bldgObj.remainingConversions <= 0) return 2
		const hexID = fullLocation[1]
		const bucketId = fullLocation[2]
		const vertex = loc.getAnyVertexInHexIDbucketID(hexID, bucketId)
		const landVertexLocation = [rf.LOCATION_LAND_VERTEX, hexID, vertex]
		const transporterObj = model.getTransporterByID(transporterID)
		// Allow ferry, in case of brackets hex
		const validLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterObj.location, true, "sbblg")
		if (!util.includesArray(validLocations, landVertexLocation)) return 3

		const bldgStats = model.getBuildingStatsFromBuildingID(buildingID)

		let inputResources = bldgStats.inputRes[0]
		if (bldgStats.inputRes.length > 1 && stackAction.length > 4) {
			const resIdx = stackAction[4]
			inputResources = bldgStats.inputRes[resIdx]
		}

		// Don't check the donkey for a wagon fac
		if (bldgObj.type === rf.BLDG_WAGON_FACTORY) inputResources = [rf.RES_BOARDS, rf.RES_BOARDS]

		// Now check the transporter has access to the input resources
		let errorFlag = model.removeResourcesFromGameUsingTransporter(transporterID, inputResources, true)
		if (errorFlag > 0) return errorFlag + 10

		return 0
	}
	//
	else if (action === rf.STACK_DO_RESEARCH) {
		//let stackAction = [rf.STACK_DO_RESEARCH, stack.getTransIDtoUse(transporterObj), RND_IDX, hexID]
		const transporterID = stackAction[1]
		const hexID = stackAction[3]

		// Check the transporter is on the hex
		const transporterObj = model.getTransporterByID(transporterID)
		if (transporterObj.location[1] !== hexID) return 1
		const playerObj = controller.currentPlayerObj()

		let inputResources = [rf.RES_GOOSE, rf.RES_PAPER]
		if (playerObj.RnD[rf.RND_FUNDAMENTAL_RESEARCH_IDX] !== 1) inputResources.push(rf.RES_GOOSE)

		// Now check the transporter has access to the input resources
		let errorFlag = model.removeResourcesFromGameUsingTransporter(transporterID, inputResources, true)
		if (errorFlag > 0) return errorFlag + 10
		return 0
	}
	//
	else if (action === rf.STACK_UPGRADE_BUILDING) {
		// 		let stackAction = [rf.STACK_UPGRADE_BUILDING, stack.getBldgIDtoUse(building), newBuildingType, [...compressedOldLocation]]
		let oldBuildingID = stackAction[1]
		const oldBldgObj = model.getBuildingByID(oldBuildingID, "stk 3")
		// Just check the old building still exists
		if (loc.isOOBlocation(oldBldgObj.location)) return 1
		return 0
	}
	//
	else if (action === rf.STACK_DONKEY_REPRODUCTION) {
		for (const donkeyEntry of stackAction.slice(1)) {
			let donkeyLocation = donkeyEntry[0]
			if (donkeyEntry.length > 1) {
				const removedTransporterObj = model.getTransporterByID(donkeyEntry[1])
				if (!loc.isAnyHexLocation(removedTransporterObj.location)) return 1
				const removedTransporterHexID = removedTransporterObj.location[1]
				const bldgsOnHex = model.getAllInGameBuildings().filter((b) => b.location[1] === removedTransporterHexID)
				if (bldgsOnHex.length === 0) return 1
				if (!bldgsOnHex.some((b) => rf.ALL_TRANSPORTER_FACTORIES.includes(b.type))) return 2
			}

			const fullLocation = decompressLocation(donkeyLocation)
			const hexID = fullLocation[1]
			// Check the location is empty
			/*// Donkey can't be carrying anything
			if (model.anythingFollowingTransporter(d.id)) continue
			if (model.transporterCarriesAnything(d.id)) continue*/
			// Hex must be pasture
			let hex = model.getHexByID(hexID)
			if (hex.currentTerrain !== rf.TERR_PASTURE) return 10
			// No buildings
			let buildingsOnHex = model.getAllInGameBuildings().filter((b) => loc.isSpecificHexLocation(b.location, hexID))
			if (buildingsOnHex.length > 0) return 11
			// No res
			let resOnHex = model.getAllInGameResources().filter((r) => loc.isSpecificHexLocation(r.location, hexID))
			if (resOnHex.length > 0) return 12
			// Check exactly 2 transp on hex
			let allTransportersOnHex = model.getAllInGameTransporters().filter((t) => loc.isSpecificHexLocation(t.location, hexID))
			if (allTransportersOnHex.length !== 2) return 13
			// Check both trans are donkeys and owned by this player
			let donkeysOnHex = model.getTransportersByPlayerIndex(playerIndex).filter((t) => loc.isSpecificHexLocation(t.location, hexID) && t.type === rf.DONKEY)
			if (donkeysOnHex.length !== 2) return 14
		}
		return 0
	}
	//
	else if (action === rf.STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY) {
		// let stackAction = [rf.STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY, stack.getTransIDtoUse(transObj), oldHexID]
		const removedTransporterID = stackAction[1]
		const removedTransporterObj = model.getTransporterByID(removedTransporterID)
		if (!loc.isAnyHexLocation(removedTransporterObj.location)) return 1
		const removedTransporterHexID = removedTransporterObj.location[1]
		const bldgsOnHex = model.getAllInGameBuildings().filter((b) => b.location[1] === removedTransporterHexID)
		if (bldgsOnHex.length === 0) return 1
		if (!bldgsOnHex.some((b) => rf.ALL_TRANSPORTER_FACTORIES.includes(b.type))) return 2

		return 0
	}
	// WONDER
	else if (action === rf.STACK_ADD_WONDER_BRICKS) {
		const currentHomeTileLocation = model.getPlayersHomeMarkerLocation(playerIndex)
		const homeMarkerHexID = currentHomeTileLocation[1]
		const homeTransporters = model.getTransportersByPlayerIndexAndHexID(playerIndex, homeMarkerHexID)
		if (homeTransporters.length === 0) return 1

		let resIDsOnHomeTile = []
		for (let i = 0; i < homeTransporters.length; i++) {
			const reachableResIDs = loc.getAllResourcesAccessibleToTransporter(homeTransporters[i].id, true).map((r) => r.id)
			resIDsOnHomeTile = resIDsOnHomeTile.concat(reachableResIDs)
			// Now uniq it
			resIDsOnHomeTile = [...new Set(resIDsOnHomeTile)]
		}

		// Start at index 1 to skip the 'action' string
		for (let i = 1; i < stackAction.length; i++) {
			const brick = stackAction[i]
			const numResUsed = brick.length
			const numResRequired = wonder.requiredResourcesForWonderBrick(playerIndex, i - 1)
			if (numResUsed !== numResRequired) return 2
			for (const resID of brick) {
				//const resObj = model.getResByID(resID)
                // make sure res is on the home tile (technically could be the other side of a river, but then how did it get here in the first place?)
                //if (resObj.location[1] !== currentHomeTileLocation[1]) return 2
                //if (!resIDsOnHomeTile.includes(resID)) return 3

				let checkResID = resID
				if (typeof checkResID === "string") {
					const resObj = model.getResByID(checkResID)
					if (resObj) checkResID = resObj.id
					else {
						const resolvedID = resolvePseudoResourceID(checkResID)
						if (typeof resolvedID === "number") checkResID = resolvedID
					}
				}
				if (!resIDsOnHomeTile.includes(checkResID)) return 3
			}
		}
		return 0
	}

	return -1 // should not get here
}

/**
 * When performing the action, we can already assume that it is a legal and correct action.
 * Most actions we can defer to eg pickupRes_core to handle the action
 * But MOVING trans is recreated here to skip out the waypoints along the way.
 */
export function performSingleStackAction(stackActionData, swapIDs) {
	const store = useModelStore()

	// Always try to swapIDs, if possible?
	//swapIDs = true

	const action = stackActionData.action
	const stackAction = stackActionData.historyEntry
	const stackPlayerIndex = stackActionData.playerIndex

	if (action === rf.STACK_MOVE_LAND) {
		if (swapIDs && typeof stackAction[1] === "string") {
			stackAction[1] = model.getTransporterByID(stackAction[1]).id
		}
		const movingTransporterID = stackAction[1]
		//if (movingTransporterID >= knownTransLen) movingTransporterID += transIDdelta
		// Split out the parameters
		const toBucketLocation = decompressLocation(stackAction[3])
		let contents = stackAction[4]
		if (swapIDs && contents.length > 0 /*&& !contents.includes(-1)*/) {
			for (let i = 0; i < contents.length; i++) {
				if (typeof contents[i] === "string") {
					// Try as resource first
					const resObj = model.getResByID(contents[i])
					if (resObj) contents[i] = resObj.id
					// If not a resource, try pseudo ID resolution
					else {
						const resolvedID = resolvePseudoResourceID(contents[i])
						if (typeof resolvedID === "number") contents[i] = resolvedID
						// If not a resource, try as transporter
						else {
							const transObj = model.getTransporterByID(contents[i])
							if (transObj) contents[i] = transObj.id
						}
					}
				}
			}
		}
		//let numGeeseFollowing = 0
		//if (stackAction.length >= 6) numGeeseFollowing = stackAction[5]

		// THESE LEGNTHS MIGHT BE 1 OUT FOR SOME REASON???
		const geeseDropped = stackAction.length >= 6 && stackAction[5].length > 1 && stackAction[5][1] === 1

		const toHexID = toBucketLocation[1]
		const toBucket = toBucketLocation[2]
		if (!toBucket && toBucket !== 0) rf.doAdminAlrt(`bucket error 6 ${toBucket}`)

		const toVertex = loc.getAnyVertexInHexIDbucketID(toHexID, toBucket)
		let toLocationFromStack = [rf.LOCATION_LAND_VERTEX, toHexID, toVertex]
		const geeseDropLocation = [rf.LOCATION_BUCKET, toHexID, toBucket]

		const transporterObj = model.getTransporterByID(movingTransporterID)
		// Find reachable locations
		const stats = rf.getTransporterStats(transporterObj.type)
		const isCaravan = transporterObj.type === rf.EXHIBITION_TRANSPORTER
		const movementGraph = graph.createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, stackPlayerIndex, isCaravan, isCaravan)
		const pathfind = graph.pathfind(movementGraph, transporterObj.location, stats.validMove, transporterObj.remainingMoves)
		const destinationIdx = util.indexOfArrayInArray(pathfind.locations, toLocationFromStack)
		let indicesToValid = util.boolFilter(
			util.indexArray(pathfind.locations.length),
			pathfind.cost.map((cost) => cost > 0)
		)
		const transportersPerLocation = pathfind.locations.map((arrLoc) => model.getAllInGameTransporters().filter((a) => util.arraysEqual(a.location, arrLoc)).length)

		indicesToValid.sort((i, k) =>
			graph.sortTransporterMoveIndices(i, k, {
				pathfind,
				transportersPerLocation,
				loc,
				model,
			})
		)

		const validMoves = util.getByIndices(pathfind.locations, indicesToValid)
		// Now find a valid move that matches the hexID and bucket of the stack move, and use that
		// TODO: use the find best vertex function?
		const toLocation = validMoves.find((arrLoc) => arrLoc[1] === toHexID && loc.getBucketIDfromAnyHexIDandVertex(arrLoc[1], arrLoc[2]) === toBucket)
		if (!toLocation) {
			rf.doAdminAlrt(`No valid land destination found for hex ${toHexID} bucket ${toBucket} for tID: ${movingTransporterID}`)
			rf.doAdminConsolLg(`Tobj: ${JSON.stringify(transporterObj)}`)
			return
		}

		// this little trickery lets us find the closest vertex in the destination bucket
		//indicesToValid.sort((i, k) => pathfind.distances[i] > pathfind.distances[k])
		// Smallest distance (i) comes first
		//indicesToValid.sort((i, k) => pathfind.distances[i] - pathfind.distances[k])
		let cost = pathfind.cost[destinationIdx]
		// Move the transporter
		transporterObj.remainingMoves -= cost

		transporterObj.location = toLocation

		// Keep visual positions in sync for the moved transporter and anything it carries
		transporterObj.rawTransporterXY = map.getTransporterPositionFromLocation(transporterObj.location, stats, transporterObj.id)
		model.transportersOnTransporter(transporterObj.id).forEach((carried) => {
			const carriedStats = rf.getTransporterStats(carried.type)
			carried.rawTransporterXY = map.getTransporterPositionFromLocation(carried.location, carriedStats, carried.id)
		})

		// Update all resources FOLLOWING the transporter to indicate they've been moved
		let resourcesFollowingTransporter = model.resourcesFollowingTransporter(transporterObj.id)
		for (let i = 0; i < resourcesFollowingTransporter.length; i++) {
			resourcesFollowingTransporter[i].movedTransporterID = transporterObj.id
		}

		// Update all resource on the transporter to indicate they've been moved
		let resourcesOnTransporter = model.resourcesOnTransport(transporterObj.id)
		for (let i = 0; i < resourcesOnTransporter.length; i++) {
			resourcesOnTransporter[i].movedTransporterID = transporterObj.id
		}

		// If geese were dropped, then drop them
		if (geeseDropped) {
			const resFollowing = model.resourcesFollowingTransporter(transporterObj.id)
			for (let i = 0; i < resFollowing.length; i++) {
				resFollowing[i].location = [...geeseDropLocation]
			}
		}
	} else if (action === rf.STACK_MOVE_WATER) {
		if (swapIDs && typeof stackAction[1] === "string") {
			stackAction[1] = model.getTransporterByID(stackAction[1]).id
		}
		const movingTransporterID = stackAction[1]
		//if (movingTransporterID >= knownTransLen) movingTransporterID += transIDdelta
		//const fromLocation = stackAction[2]
		const toBucketLocation = decompressWaterLocation(stackAction[3])

		let contents = stackAction[4]
		if (swapIDs && contents.length > 0 /*&& !contents.includes(-1)*/) {
			for (let i = 0; i < contents.length; i++) {
				if (typeof contents[i] === "string") {
					// Try as resource first
					const resObj = model.getResByID(contents[i])
					if (resObj) contents[i] = resObj.id
					// If not a resource, try pseudo ID resolution
					else {
						const resolvedID = resolvePseudoResourceID(contents[i])
						if (typeof resolvedID === "number") contents[i] = resolvedID
						// If not a resource, try as transporter
						else {
							const transObj = model.getTransporterByID(contents[i])
							if (transObj) contents[i] = transObj.id
						}
					}
				}
			}
		}

		const transporterObj = model.getTransporterByID(movingTransporterID)

		// Find valid destination (handles docked, sea, and river)
		const result = graph.findValidWaterDestination(toBucketLocation, transporterObj, stackPlayerIndex)
		if (!result) {
			rf.doAdminAlrt("No valid water destination found")
			return
		}
		const toLocation = result.location
		const cost = result.cost

		// Move the transporter
		transporterObj.remainingMoves -= cost
		if (loc.isDockedLocation(toLocation)) transporterObj.remainingMoves = 0
		transporterObj.location = toLocation

		// Keep visual positions in sync for the moved transporter and anything it carries (especially for docked locations with offsets)
		const movingStats = rf.getTransporterStats(transporterObj.type)
		transporterObj.rawTransporterXY = map.getTransporterPositionFromLocation(transporterObj.location, movingStats, transporterObj.id)
		model.transportersOnTransporter(transporterObj.id).forEach((carried) => {
			const carriedStats = rf.getTransporterStats(carried.type)
			carried.rawTransporterXY = map.getTransporterPositionFromLocation(carried.location, carriedStats, carried.id)
		})

		// Update all resources FOLLOWING the transporter to indicate they've been moved
		let resourcesFollowingTransporter = model.resourcesFollowingTransporter(transporterObj.id)
		for (let i = 0; i < resourcesFollowingTransporter.length; i++) {
			resourcesFollowingTransporter[i].movedTransporterID = transporterObj.id
		}

		// Update all resource on the transporter to indicate they've been moved
		let resourcesOnTransporter = model.resourcesOnTransport(transporterObj.id)
		for (let i = 0; i < resourcesOnTransporter.length; i++) {
			resourcesOnTransporter[i].movedTransporterID = transporterObj.id
		}

		// If geese were dropped, then drop them
		const geeseDropped = stackAction.length >= 6 && stackAction[5].length > 1
		if (geeseDropped) {
			const resFollowing = model.resourcesFollowingTransporter(transporterObj.id)
			for (let i = 0; i < resFollowing.length; i++) {
				if (loc.isSeaVertexLocation(toLocation)) {
					resFollowing[i].location = loc.setBucketLocation(toLocation, 0)
				} else if (loc.isLandVertexLocation(toLocation)) {
					const bucketID = loc.getBucketIDfromAnyHexIDandVertex(toLocation[1], toLocation[2])
					resFollowing[i].location = loc.setBucketLocation(toLocation, bucketID)
				} else if (loc.isDockedLocation(toLocation)) {
					const eligibleLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(toLocation, false)
					const bucketLocation = eligibleLocations.find((l) => l[0] === rf.LOCATION_BUCKET)
					resFollowing[i].location = bucketLocation
				}
			}
		}
	} else if (action === rf.STACK_STRICT_PICKUP_RES) {
		let transporterID = stackAction[1]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[1] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[1]
		}
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		for (let i = 0; i < stackAction[2].length; i++) {
			if (swapIDs) {
				const originalID = stackAction[2][i]
				const resObj = model.getResByID(originalID)
				if (resObj) {
					stackAction[2][i] = resObj.id
					const expectedLoc = decompressLocation(stackAction[3])
					if (resObj.location[1] !== expectedLoc[1]) {
						rf.doAdminAlrt(`STACK_PICKUP_SWAP: Resource swapped to wrong hex. UID: ${originalID} -> ID: ${resObj.id}. Expected hex: ${expectedLoc[1]}, Actual hex: ${resObj.location[1]}`)
					}
				} else {
					const resolvedID = resolvePseudoResourceID(originalID)
					if (typeof resolvedID === "number") stackAction[2][i] = resolvedID
				}
			}

			let correctedResID = stackAction[2][i]
			//if (correctedResID >= knownResLen) correctedResID += resIDdelta
			map.pickupRes_core(transporterID, correctedResID)
		}
	}
	//
	else if (action === rf.STACK_STRICT_DROP_RES) {
		let transporterID = stackAction[1]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[1] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[1]
		}

		const dropHexID = stackAction[3][0]
		let dropBucket = 0
		if (stackAction[3].length > 1) dropBucket = stackAction[3][1]
		const hexObj = model.getHexByID(dropHexID)
		if (!dropBucket && dropBucket !== 0) rf.doAdminAlrt(`bucket error 5 ${dropBucket}`)

		const dropVertex = loc.getAnyVertexInHexIDbucketID(dropHexID, dropBucket)
		const dropLocation = [rf.LOCATION_LAND_VERTEX, dropHexID, dropVertex]
		if (hexObj.baseTerrain === rf.TERR_SEA) dropLocation[0] = rf.LOCATION_SEA_VERTEX

		for (let i = 0; i < stackAction[2].length; i++) {
			if (swapIDs) {
				const resObj = model.getResByID(stackAction[2][i])
				if (resObj) stackAction[2][i] = resObj.id
				else {
					const resolvedID = resolvePseudoResourceID(stackAction[2][i])
					if (typeof resolvedID === "number") stackAction[2][i] = resolvedID
				}
			}
			let correctedResID = stackAction[2][i]
			//if (correctedResID >= knownResLen) correctedResID += resIDdelta
			map.dropResOnLocation_core(correctedResID, dropLocation)
		}
	}
	//
	else if (action === rf.STACK_PICKUP_RES_TO_FOLLOW) {
		let transporterID = stackAction[1]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[1] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[1]
		}
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const resIDs = stackAction[2]
		const transporterObj = model.getTransporterByID(transporterID)
		for (let i = 0; i < resIDs.length; i++) {
			if (swapIDs) {
				const originalID = resIDs[i]
				const resObj = model.getResByID(originalID)
				if (resObj) {
					resIDs[i] = resObj.id
					if (resObj.location[1] !== transporterObj.location[1]) {
						rf.doAdminAlrt(`STACK_FOLLOW_SWAP: Resource swapped to wrong hex. UID: ${originalID} -> ID: ${resObj.id}. Expected hex (transporter): ${transporterObj.location[1]}, Actual hex: ${resObj.location[1]}`)
					}
				} else {
					const resolvedID = resolvePseudoResourceID(originalID)
					if (typeof resolvedID === "number") resIDs[i] = resolvedID
				}
			}
			let correctedResID = resIDs[i]
			//if (correctedResID >= knownResLen) correctedResID += resIDdelta
			const resObj = model.getResByID(correctedResID)
			resObj.location = loc.setFollowerLocation(transporterID)
		}
	}
	//
	else if (action === rf.STACK_DROP_RES_FOLLOWING) {
		// stackAction = [rf.STACK_DROP_RES_FOLLOWING, stack.getTransIDtoUse(transporterObj), [stack.getResIDtoUse(resObj)], [...compressedLoc]]

		let transporterID = stackAction[1]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[1] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[1]
		}
		const resIDs = stackAction[2]
		const dropLocation = decompressLocation(stackAction[3])
		for (let i = 0; i < resIDs.length; i++) {
			if (swapIDs) {
				const resObj = model.getResByID(resIDs[i])
				if (resObj) resIDs[i] = resObj.id
				else {
					const resolvedID = resolvePseudoResourceID(resIDs[i])
					if (typeof resolvedID === "number") resIDs[i] = resolvedID
				}
			}
			let correctedResID = resIDs[i]
			//if (correctedResID >= knownResLen) correctedResID += resIDdelta
			map.dropResOnLocation_core(correctedResID, dropLocation)
		}
	}
	//
	else if (action === rf.STACK_PICKUP_TRANSPORTER) {
		let mainTransporterID = stackAction[1]
		if (swapIDs && typeof mainTransporterID === "string") {
			stackAction[1] = model.getTransporterByID(mainTransporterID).id
			mainTransporterID = stackAction[1]
		}
		let transporterBeingPickedUpID = stackAction[2]
		if (swapIDs && typeof transporterBeingPickedUpID === "string") {
			stackAction[2] = model.getTransporterByID(transporterBeingPickedUpID).id
			transporterBeingPickedUpID = stackAction[2]
		}
		//if (transporterBeingPickedUpID >= knownTransLen) transporterBeingPickedUpID += transIDdelta
		map.loadTransporterOntoTransporter_core(mainTransporterID, transporterBeingPickedUpID)
	} else if (action === rf.STACK_STRICT_FERRY_RES) {
		let transporterID = stackAction[1]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[1] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[1]
		}
		const resIDs = stackAction[2]
		const dropHexID = stackAction[3][0]
		let dropBucket = 0
		if (stackAction[3].length > 1) dropBucket = stackAction[3][1]
		if (!dropBucket && dropBucket !== 0) rf.doAdminAlrt(`bucket error 3 ${dropBucket}`)

		const dropVertex = loc.getAnyVertexInHexIDbucketID(dropHexID, dropBucket)
		const dropLocation = [rf.LOCATION_LAND_VERTEX, dropHexID, dropVertex]
		const hexObj = model.getHexByID(dropHexID)
		if (hexObj.baseTerrain === rf.TERR_SEA) dropLocation[0] = rf.LOCATION_SEA_VERTEX

		//const buckets = map.getPossibleDropBucketsForResourceOnTransporter(resID)

		// It has to be dropped/ferried on the same hex as the transporter
		for (let i = 0; i < resIDs.length; i++) {
			if (swapIDs) {
				const resObj = model.getResByID(resIDs[i])
				if (resObj) resIDs[i] = resObj.id
				else {
					const resolvedID = resolvePseudoResourceID(resIDs[i])
					if (typeof resolvedID === "number") resIDs[i] = resolvedID
				}
			}
			let correctedResID = resIDs[i]
			//if (correctedResID >= knownResLen) correctedResID += resIDdelta
			map.dropResOnLocation_core(correctedResID, dropLocation)
		}
	} else if (action === rf.STACK_DROP_TRANSPORTER) {
		let mainTransporterID = stackAction[1]
		if (swapIDs && typeof mainTransporterID === "string") {
			stackAction[1] = model.getTransporterByID(mainTransporterID).id
			mainTransporterID = stackAction[1]
		}
		let carriedTransporterID = stackAction[2]
		if (swapIDs && typeof carriedTransporterID === "string") {
			stackAction[2] = model.getTransporterByID(carriedTransporterID).id
			carriedTransporterID = stackAction[2]
		}
		const droppingLocationStack = stackAction[3]
		const droppingLocationFull = decompressLocation(droppingLocationStack)
		const dropLocationVertex = loc.getVisualLocationFromBucketLocation(droppingLocationFull)
		map.dropTransporterOnLocation_core(carriedTransporterID, dropLocationVertex)
	}
	if (action === rf.STACK_STEAL_RES) {
		// 			let stackAction = [rf.STACK_STEAL_RES, selectedTransporterObj.id, transporterID, resourceID, [...selectedTransporterObj.location]]
		let mainTransporterID = stackAction[1]
		if (swapIDs && typeof mainTransporterID === "string") {
			stackAction[1] = model.getTransporterByID(mainTransporterID).id
			mainTransporterID = stackAction[1]
		}

		let otherTransporterID = stackAction[2]
		if (swapIDs && typeof otherTransporterID === "string") {
			stackAction[2] = model.getTransporterByID(otherTransporterID).id
			otherTransporterID = stackAction[2]
		}
		const resIDs = stackAction[3]
		//const mainTransporterLocation = stackAction[4]
		//const reachableResources = loc.getAllResourcesAccessibleToTransporter(mainTransporterID, true)
		for (let i = 0; i < resIDs.length; i++) {
			if (swapIDs) {
				const resObj = model.getResByID(resIDs[i])
				if (resObj) resIDs[i] = resObj.id
				else {
					const resolvedID = resolvePseudoResourceID(resIDs[i])
					if (typeof resolvedID === "number") resIDs[i] = resolvedID
				}
			}
			let correctedResID = resIDs[i]
			//if (correctedResID >= knownResLen) correctedResID += resIDdelta
			map.pickupRes_core(mainTransporterID, correctedResID)
		}
	}
	/**************************** BUILDING ACTIONS **************************************************/
	if (action === rf.STACK_BUILD_ROAD) {
		let transporterID = stackAction[1]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[1] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[1]
		}
		const fromStackLocation = stackAction[2]
		const toStackLocation = stackAction[3]

		const fromHexID = fromStackLocation[0]
		const toHexID = toStackLocation[0]
		let fromBucketID = 0
		let toBucketID = 0
		if (fromStackLocation.length > 1) fromBucketID = fromStackLocation[1]
		if (toStackLocation.length > 1) toBucketID = toStackLocation[1]

		map.addRoadToMap_core([fromHexID, fromBucketID], [toHexID, toBucketID], transporterID, true)

		return 0
	} else if (action === rf.STACK_BUILD_POWER_LINE) {
		let transporterID = stackAction[1]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[1] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[1]
		}
		const fromStackLocation = stackAction[2]
		const toStackLocation = stackAction[3]

		const fromHexID = fromStackLocation[0]
		const toHexID = toStackLocation[0]
		let fromBucketID = 0
		let toBucketID = 0
		if (fromStackLocation.length > 1) fromBucketID = fromStackLocation[1]
		if (toStackLocation.length > 1) toBucketID = toStackLocation[1]

		map.addPowerLineToMap_core([fromHexID, fromBucketID], [toHexID, toBucketID], transporterID, true)

		return 0
	} else if (action === rf.STACK_BUILD_BRIDGE) {
		let transporterID = stackAction[1]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[1] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[1]
		}
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const hexID = stackAction[2]
		let bridgeIdx = 0
		if (stackAction.length > 3) bridgeIdx = stackAction[3]
		const hexObj = model.getHexByID(hexID)
		const bridgeArr = hexObj.bridges[bridgeIdx]

		map.addBridgeToMap_core(hexID, transporterID, bridgeArr, true)
	} else if (action === rf.STACK_BUILD_WALL) {
		let transporterID = stackAction[1]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[1] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[1]
		}
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const transporterHexID = stackAction[2]
		const otherHexID = stackAction[3]

		const transporterObj = model.getTransporterByID(transporterID)
		const wallResult = map.addWallToMap_core(transporterID, transporterHexID, otherHexID, transporterObj.ownerIndex, true)
		// If applying the wall actually shifted boats (e.g. state was different from when the
		// pre-move was created), make sure the history entry records the shifted boat IDs.
		if (wallResult && wallResult.length > 1 && wallResult[1].length > 0 && stackAction.length < 6) {
			stackAction.push([...wallResult[1]])
		}
	} else if (action === rf.STACK_DEMOLISH_WALL) {
		let transporterID = stackAction[1]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[1] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[1]
		}
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const transporterHexID = stackAction[2]
		const otherHexID = stackAction[3]

		const transporterObj = model.getTransporterByID(transporterID)
		map.addWallToMap_core(transporterID, transporterHexID, otherHexID, transporterObj.ownerIndex, true)
	} else if (action === rf.STACK_BUILD_BUILDING) {
		let transporterID = stackAction[1]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[1] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[1]
		}
		const buildingType = stackAction[2]
		const compressedLocation = stackAction[3]
		const fullLocation = decompressLocation(compressedLocation)
		let mineSelectionType = 0
		if (stackAction.length > 4) mineSelectionType = stackAction[4]
		map.addBuildingToMap_core(buildingType, fullLocation, true, transporterID, mineSelectionType, stackPlayerIndex)
	} else if (action === rf.STACK_RESHAFT_MINE) {
		let transporterID = stackAction[1]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[1] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[1]
		}
		let mineID = stackAction[2]
		if (swapIDs && typeof mineID === "string") {
			stackAction[2] = model.getBuildingByID(mineID, "stk 4").id
			mineID = stackAction[2]
		}

		let reshafthResources = [rf.RES_FUEL, rf.RES_IRON]
		model.removeResourcesFromGameUsingTransporter(transporterID, reshafthResources, false)

		const mineObj = model.getBuildingByID(mineID, "stk 5")
		let newMineContent = [3, 3]
		if (stackAction.length > 4) {
			const mineType = stackAction[4]
			if (mineType === rf.MINE_IRON) newMineContent = [0, 4]
			else if (mineType === rf.MINE_GOLD) newMineContent = [4, 0]
			else if (mineType === rf.MINE_BIG) newMineContent = [5, 5]
		}

		mineObj.remainingMineContent[0] += newMineContent[0]
		mineObj.remainingMineContent[1] += newMineContent[1]
	}
	//**************************** END BUILDING ACTIONS **************************************************/
	//**************************** PRODUCTION *********************************************** */
	else if (action === rf.STACK_MANUAL_PRODUCTION) {
		// 	let stackAction = [rf.STACK_MANUAL_PRODUCTION, building.id, transporterID, [...stackLocation]]
		let buildingID = stackAction[1]
		let buildingObj = model.getBuildingByID(buildingID, "stk 7")
		if (swapIDs && typeof buildingID === "string") {
			if (buildingObj) {
				stackAction[1] = buildingObj.id
				buildingID = stackAction[1]
			}
		}
		//if (buildingID >= knownBldgen) buildingID += bldgIDdelta
		let transporterID = stackAction[2]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[2] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[2]
		}
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const compressedLocation = stackAction[3]
		const decompressedLocation = decompressLocation(compressedLocation)
		//const hexID = decompressedLocation[1]
		const bucketID = decompressedLocation[2]
		if (!bucketID && bucketID !== 0) rf.doAdminAlrt(`bucket error 2 ${bucketID}`)

		//const stackVertex = loc.getAnyVertexInHexIDbucketID(hexID, bucketID)
		//let transporterOutputlocation = [rf.LOCATION_LAND_VERTEX, hexID, stackVertex]
		const buildingType = buildingObj.type
		const bldgStats = rf.BUILDING_STATS.find((b) => b.building === buildingType)
		let inputResIdx = 0
		let removedTransporterID = -1
		// THIS MUST BE A DEFAULT BUCKET FOR WAGON OUTPUT
		let transporterOutputBucketlocation = [...buildingObj.location]
		if (rf.ALL_WATER_TRANSPORTER_BUILDINGS.includes(buildingType) && stackAction.length > 4) {
			transporterOutputBucketlocation = decompressWaterLocation([...stackAction[4]], true)
			//transporterOutputlocation = loc.getVisualLocationFromBucketLocation(transporterOutputBucketlocation)
		} else if (stackAction.length > 4 && buildingType === rf.BLDG_WAGON_FACTORY) removedTransporterID = stackAction[4]
		// Art & The Atelier: the recipe index is always the last element (the caravan
		// recipe also records the removed donkey transporter before it)
		else if (stackAction.length > 4 && buildingType === rf.BLDG_ATELIER) inputResIdx = stackAction[stackAction.length - 1]
		else if (stackAction.length > 4) inputResIdx = stackAction[4]
		const inputRes = bldgStats.inputRes[inputResIdx]
		// remove input res
		model.removeResourcesFromGameUsingTransporter(transporterID, inputRes, false)
		// Art & The Atelier: the caravan recipe consumes the selected donkey
		if (buildingType === rf.BLDG_ATELIER && atelier.getRecipeOutput(inputResIdx) > rf.RES_UPPER_LIMIT) removedTransporterID = transporterID
		// Remove any input transp
		if (removedTransporterID >= 0) model.removeTransporterIDfromGame(removedTransporterID)
		// Art & The Atelier: restore the recipe output for an atelier
		const atelierOutput = buildingType === rf.BLDG_ATELIER ? atelier.getRecipeOutput(inputResIdx) : -1
		store.context.atelierRecipeOutput = atelierOutput
		// add output res
		produce.addBuildingOutputResourcesToGame_core(buildingID, -1, stackPlayerIndex)
		// But if the output is a transporter, add it here
		const outputTransporter = buildingType === rf.BLDG_ATELIER ? atelierOutput : bldgStats.outputRes.length === 1 && bldgStats.outputRes[0] > rf.RES_UPPER_LIMIT ? bldgStats.outputRes[0] : -1
		if (outputTransporter > rf.RES_UPPER_LIMIT) {
			const transporterObj = model.getTransporterByID(transporterID)
			const playerIndex = transporterObj.ownerIndex
			model.addTransporterToGame(playerIndex, outputTransporter, transporterOutputBucketlocation, true)
		}
		store.context.atelierRecipeOutput = -1
		// Remove the building use
		buildingObj.remainingConversions--
	}
	//
	else if (action === rf.STACK_DO_RESEARCH) {
		let transporterID = stackAction[1]
		if (swapIDs && typeof transporterID === "string") {
			stackAction[1] = model.getTransporterByID(transporterID).id
			transporterID = stackAction[1]
		}
		//if (transporterID >= knownTransLen) transporterID += transIDdelta
		const RND_IDX = stackAction[2]
		//const hexID = stackAction[3]
		const playerIndex = model.getTransporterByID(transporterID).ownerIndex
		const playerObj = store.players[playerIndex]
		let researchResources = [rf.RES_GOOSE, rf.RES_PAPER]
		if (playerObj.RnD[rf.RND_FUNDAMENTAL_RESEARCH_IDX] !== 1) {
			researchResources.push(rf.RES_GOOSE)
		}
		model.removeResourcesFromGameUsingTransporter(transporterID, researchResources, false)
		playerObj.RnD[RND_IDX] = 1
	}
	//
	else if (action === rf.STACK_UPGRADE_BUILDING) {
		let oldBuildingID = stackAction[1]
		if (swapIDs && typeof oldBuildingID === "string") {
			stackAction[1] = model.getBuildingByID(oldBuildingID, "stk 8").id
			oldBuildingID = stackAction[1]
		}
		//if (oldBuildingID >= knownBldgen) oldBuildingID += bldgIDdelta
		const newBuildingType = stackAction[2]
		const compressedLocation = stackAction[3]
		const decompressedLocation = decompressLocation(compressedLocation)
		// remove the old building
		model.removeBuildingByID(oldBuildingID)
		// add the new building
		map.addBuildingToMap_core(newBuildingType, decompressedLocation, false, -1, -1, stackPlayerIndex)
	}
	//
	else if (action === rf.STACK_DONKEY_REPRODUCTION) {
		const donkeyEntries = stackAction.slice(1)
		for (const entry of donkeyEntries) {
			let donkeyLocation = entry[0]
			if (entry.length > 1) {
				model.removeTransporterIDfromGame(entry[1])
			}

			const fullLocation = decompressLocation(donkeyLocation)

			model.addTransporterToGame(stackPlayerIndex, rf.DONKEY, fullLocation, true)
		}
	}
	//
	else if (action === rf.STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY) {
		let removedTransporterID = stackAction[1]
		if (swapIDs && typeof removedTransporterID === "string") {
			stackAction[1] = model.getTransporterByID(removedTransporterID).id
			removedTransporterID = stackAction[1]
		}
		//if (removedTransporterID >= knownTransLen) removedTransporterID += transIDdelta
		model.removeTransporterIDfromGame(removedTransporterID)
	}
	// Art & The Atelier: an exhibition caravan stages a show and vanishes
	else if (action === rf.STACK_EXHIBITION) {
		atelier.performExhibitionStackAction(stackAction)
	}
	// WONDER
	else if (action === rf.STACK_ADD_WONDER_BRICKS) {
		for (let i = 1; i < stackAction.length; i++) {
			if (swapIDs) {
				// Mutate the IDs inside this specific brick array
				for (let j = 0; j < stackAction[i].length; j++) {
					let resID = stackAction[i][j]
					const resObj = model.getResByID(resID)

					if (resObj) stackAction[i][j] = resObj.id
					else {
						const resolvedID = resolvePseudoResourceID(stackAction[i][j])
						if (typeof resolvedID === "number") stackAction[i][j] = resolvedID
					}
				}
			}

			// Use the now-mutated brick
			const brick = stackAction[i]
			wonder.addBrickToWonder_core(stackPlayerIndex, brick)

			// Logic for ending turn/game
			if (store.gameflow.turnOrder[0] === stackPlayerIndex) {
				wonder.checkAndPerformEndGame(true)
			}

			// Stop adding any more bricks if the game has ended
			if (store.gameflow.phase === rf.PHASE_GAME_OVER) {
				break
			}
		}
	}
}

/* Need
	currentMoveData: actionStack -- this is in B64 format, and is compressed store.actionStack

	This is run when 
		- loading all your preset stacks to get to the current prePhase
		- IO.reloadGameData
		- IO.loadCurrentMove <- this displays YOUR latest preset

	So it will always be YOUR pov used. Presets are not used during trainingGame
*/
export function attemptToLoadWholeCurrentMoveStack(currentMoveData, historyPhase) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.undoPoints.splice(0)
	context.resetContextAndHighlights()
	store.actionStack.splice(0)
	store.wholeTurnResetData = funcs.simpleExportWholeRNBmodel(false)
	context.createUndoPoint()

	// If there is no stack, then retrun
	if (Object.keys(currentMoveData).length === 0) return
	if (currentMoveData.actionStack === "SKIP" || currentMoveData.actionStack === "") {
		return
	}
	let stack
	try {
		stack = funcs.decompressData64(currentMoveData.actionStack)
	} catch {
		rf.doAdminAlrt("SEND TO ADMIN: ERROR CODE 12 - decompress failed in attemptToLoadWholeCurrentMoveStack")
		return
	}
	//console.log(`loading Stack: ${JSON.stringify(stack)}`)

	if (store.actionStack.some((subArr) => subArr.historyEntry.some((e) => e == null))) rf.doAdminAlrt("SEND TO ADMIN: ERROR CODE 11 - IO stack error found")

	for (let i = 0; i < stack.length; i++) {
		// If you have got here through some weird reason, and the stack is empty, just ignore it
		if (i == 0 && stack[i].length === 0) {
			//console.log("Empty stack")
			rf.doAdminAlrt("Emptry Stack. Error code 3")
			return
		}
		let errorCode = verifySingleStackAction(stack[i])
		//console.log(`Error code: ${errorCode} - ${JSON.stringify(stack[i])} i=${i}`)

		// If an error is found, stop the stack there, and display the error
		if (errorCode !== 0) {
			console.log(`Error code: ${errorCode} - ${JSON.stringify(stack[i])} i=${i}`)
			store.stackControl.failedStackHistoryEntry = util.deepCloneValue(stack[i].historyEntry)
			stack = stack.slice(0, i)
			break
		}

		// Otherwise, you need to perform the action, to set up the game
		// in the same state to test the next action on the stack
		else {
			// As this is only loading the stack from the current phase, but out of order, we KNOW all pre-prod and mines
			// have been done. Therefore, we are ok to swap ID's
			// EXCEPT MAYBE TRANSPORTERS ????
			performSingleStackAction(stack[i], true)
			context.createUndoPoint()
		}
	}
	// At this point, the stack is valid, so make the history entry

	let stackEntries = []
	for (let i = 0; i < stack.length; i++) {
		stackEntries.push(stack[i].historyEntry)
	}

	// Sync history with completed actions, and add the stack
	// This only happens during NON practice games, when reloading YOUR stack. So use personal.pov
	if (stackEntries.length > 0) model.addHistory(rf.HIST_STACK_ACTIONS, personal.pov, 0, [historyPhase, ...stackEntries])

	if (stack.length > 0) store.actionStack = JSON.parse(JSON.stringify(stack))
}

export function resetStackControlData() {
	const store = useModelStore()
	// stack control
	store.stackControl.failedStackHistoryEntry.splice(0)
	store.stackControl.loadedPreMove = false
	store.stackControl.loadedPreMoveIsSkip = false
}

export function saveKnownLengths() {
	const store = useModelStore()
	store.knownArrayLengths[0] = store.ALL_RESOURCES.length
	store.knownArrayLengths[1] = store.ALL_BUILDINGS.length
	store.knownArrayLengths[2] = store.ALL_TRANSPORTERS.length
	store.knownFinalHistoryidx = store.history.length - 1
	store.expectedResPreProduction = 0
}

export function getResIDtoUse(resObj) {
	const store = useModelStore()
	const personal = usePersonalStore()
	// practice/solo just use ID
	if (personal.trainingGame) return resObj.id
	// Generating replay - just use id
	if (store.viewSettings.showReplay) return resObj.id
	// Already existing in the full saved game? use id
	if (resObj.id < store.knownArrayLengths[0]) return resObj.id
	// Pre-moves, always use unique
	if (rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)) return resObj.uniqueID
	// Not a pre-move, and we are not first player, use uniqueID
	if (store.gameflow.turnOrder[0] === personal.pov) return resObj.id

	return resObj.uniqueID
}

export function getTransIDtoUse(transObj) {
	const store = useModelStore()
	const personal = usePersonalStore()
	// practice/solo just use ID
	if (personal.trainingGame) return transObj.id
	// Generating replay - just use id
	if (store.viewSettings.showReplay) return transObj.id
	// Already existing in the full saved game? use id
	if (transObj.id < store.knownArrayLengths[2]) return transObj.id
	// Pre-moves, always use unique
	if (rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)) return transObj.uniqueID
	// Not a pre-move, and we are not first player, use uniqueID
	if (store.gameflow.turnOrder[0] === personal.pov) return transObj.id

	return transObj.uniqueID
}

export function getBldgIDtoUse(bldgObj) {
	const store = useModelStore()
	const personal = usePersonalStore()
	// practice/solo just use ID
	if (personal.trainingGame) return bldgObj.id
	// Generating replay - just use id
	if (store.viewSettings.showReplay) return bldgObj.id
	// Already existing in the full saved game? use id
	if (bldgObj.id < store.knownArrayLengths[1]) return bldgObj.id
	// Pre-moves, always use unique
	if (rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)) return bldgObj.uniqueID
	// Not a pre-move, and we are not first player, use uniqueID
	if (store.gameflow.turnOrder[0] === personal.pov) return bldgObj.id

	return bldgObj.uniqueID //|| bldgObj.id
}
