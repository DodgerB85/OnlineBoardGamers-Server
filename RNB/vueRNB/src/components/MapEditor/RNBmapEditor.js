/**MAP CODES:
 * ST: 1 - Set style to FLAT top
 * HM: Home marker locations
 * CR: Custom Rules
 * RS: [res idx's already researched]
 * RX: [res on map]
 * BX: [bldgs on map]
 * TX: [transp on map]
 *
 */

import { useModelStore } from "../../stores/RNBstore.js"
import * as rf from "../../js/RNBreference.js"
import * as context from "../../js/RNBcontext.js"
import * as util from "../../js/RNButil.js"
import * as model from "../../js/RNBmodel.js"
import * as stack from "../../js/RNBstack.js"
import * as funcs from "../../js/RNBfuncs.js"

export function clickedHighlight(entry) {
	const store = useModelStore()
	const hexID = entry[0]
	const bucketIds = entry[1]
	if (store.context.action === rf.ACT_MAP_EDITOR_ADD_HOME_MARKER) {
		let bucketID = bucketIds[0]
		// We need any vertex in this bucketID
		const homeLoc = [rf.LOCATION_BUCKET, hexID, bucketID]
		store.ALL_HOME_MARKERS.push({
			ownerIndex: -1,
			colour: rf.GREEN,
			location: [...homeLoc],
		})
		context.resetContextAndHighlights()
		return
	}

	if (store.context.action === rf.ACT_MAP_EDITOR_REMOVE_HOME_MARKER) {
		const hexID = entry[0]
		const bucketId = entry[1][0]

		// Find and remove the home marker at this location
		const markerIndex = store.ALL_HOME_MARKERS.findIndex((marker) => marker.location[1] === hexID && marker.location[2] === bucketId)

		if (markerIndex !== -1) {
			store.ALL_HOME_MARKERS.splice(markerIndex, 1)
			context.resetContextAndHighlights()
			store.context.action = rf.ACT_NONE
		}
	}
}

export function setupAddHomeMarker() {
	const store = useModelStore()
	if (store.context.action === rf.ACT_MAP_EDITOR_ADD_HOME_MARKER) {
		context.resetContextAndHighlights()
		store.context.action = rf.ACT_NONE
		return
	}

	context.resetContextAndHighlights()

	for (let i = 0; i < store.mapData.hexData.length; i++) {
		const hex = store.mapData.hexData[i]
		const hexID = hex.hexID
		if (store.ALL_HOME_MARKERS.some((marker) => marker.location[1] === hexID)) continue
		if (hex.baseTerrain === rf.TERR_VOID) continue

		for (const bucketId of util.uniqueOnly(hex.bucketIdsCurrent)) {
			context.addHexPieceToHighlight([hexID, model.hexCurrentBucketToInitial(hexID, bucketId)])
		}
	}
	store.context.action = rf.ACT_MAP_EDITOR_ADD_HOME_MARKER
}

export function setupRemoveHomeMarker() {
	const store = useModelStore()
	if (store.context.action === rf.ACT_MAP_EDITOR_REMOVE_HOME_MARKER) {
		context.resetContextAndHighlights()
		store.context.action = rf.ACT_NONE
		return
	}

	context.resetContextAndHighlights()

	// Highlight areas that have home markers
	for (let i = 0; i < store.ALL_HOME_MARKERS.length; i++) {
		const marker = store.ALL_HOME_MARKERS[i]
		const hexID = marker.location[1]
		const bucketId = marker.location[2]

		// Add the hex piece to highlight for each home marker location
		context.addHexPieceToHighlight([hexID, [bucketId]])
	}
	store.context.action = rf.ACT_MAP_EDITOR_REMOVE_HOME_MARKER
}

export function compressMapForDB() {
	const store = useModelStore()
	let res = []

	// First, get map Data
	for (let i = 0; i < store.mapData.hexData.length; i++) {
		const hex = store.mapData.hexData[i]
		if (hex.hexID !== i) rf.doAdminAlrt("Mismatch in indices\nAny other items relying on hexID will not work properly.")

		if (hex.rotation === 0) {
			res.push([hex.coord[0], hex.coord[1], hex.hexTerrainID])
		} else {
			res.push([hex.coord[0], hex.coord[1], hex.hexTerrainID, hex.rotation])
		}
	}

	// Next, define optional components as a single Object
	let additionalData = {}

	// Home Markers
	let homeMarkerLocations = []
	for (let i = 0; i < store.ALL_HOME_MARKERS.length; i++) {
		const marker = store.ALL_HOME_MARKERS[i]
		homeMarkerLocations.push(stack.compressLocation(marker.location))
	}

	if (homeMarkerLocations.length > 0) {
		additionalData.HM = homeMarkerLocations
	}

	// Add default style if flat
	if (store.hexStyle === rf.FLAT) {
		additionalData.ST = 1
	}

	res.push(additionalData)

	return res
}

export async function replaceMapInDB(mapId, mapName, mapDescription, playerCount, isVerified) {
	const store = useModelStore()
	const mapData = compressMapForDB()

	store.viewSettings.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	let postData = {
		action: "replaceMap",
		mapId: mapId,
		mapData: mapData,
		mapName: mapName,
		mapDescription: mapDescription,
		playerCount: playerCount,
		isVerified: isVerified,
	}

	try {
		const response = await fetch("/RNB/replaceRNBmap/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			return false
		}
		const data = await response.json()
		store.viewSettings.showLoader = false
		if (data.success) return true

		return false
	} catch (error) {
		console.error("Error replacing map:", error)
		store.gameMessages.errorText = "Error replacing the map"
		return false
	}
}

export async function saveMapToDB(mapName, mapDescription, playerCount, isVerified) {
	const store = useModelStore()
	const mapData = compressMapForDB()

	store.viewSettings.showLoader = true

	let csrftoken = funcs.getCookie("csrftoken")

	let postData = {
		action: "saveMap",

		mapData: mapData,
		mapName: mapName,
		mapDescription: mapDescription,
		playerCount: playerCount,
		isVerified: isVerified,
	}

	try {
		const response = await fetch("/RNB/saveRNBmap/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			//const errorData = await response.json() // Assuming the server returns JSON error data
			//const errorMessage = errorData.error || "Network response was not ok"
			return false
		}
		const data = await response.json()
		store.viewSettings.showLoader = false
		if (data.success) return true

		return false
	} catch (error) {
		console.error("Error fetching data:", error)
		store.gameMessages.errorText = "Error saving the game"
		return false
	}
}

export async function deleteMapFromDB(mapId) {
	let csrftoken = funcs.getCookie("csrftoken")

	let postData = {
		mapId: mapId,
	}

	try {
		const response = await fetch("/RNB/deleteRNBmap/", {
			method: "POST",
			body: JSON.stringify(postData),
			headers: { "X-CSRFToken": csrftoken },
		})
		if (!response.ok) {
			return false
		}
		const data = await response.json()
		if (data.success) return true

		return false
	} catch (error) {
		console.error("Error deleting map:", error)
		return false
	}
}
