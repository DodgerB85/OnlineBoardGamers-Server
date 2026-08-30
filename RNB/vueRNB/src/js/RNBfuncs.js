/**
 * shuffle
 * removeItemAll
 * sleepPause
 * getCookie
 * timestampToString
 * htmlUnescape
 * decompressChatData
 * export
 * import
 */

//import * as rf from "./RNBreference"
import * as map from "./RNBmap"
import * as model from "./RNBmodel"
import * as rf from "./RNBreference"
import * as hd from "./RNBhex"
import * as loc from "./RNBlocation"
import * as stack from "./RNBstack"
import * as context from "./RNBcontext"
import * as wonder from "./RNBwonder"

import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"
import { toRaw } from "vue"

export const shuffle = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[array[i], array[j]] = [array[j], array[i]]
	}
	return array
}

// get CSRF for javascript
export function getCookie(name) {
	var cookieValue = null
	if (document.cookie && document.cookie !== "") {
		var cookies = document.cookie.split(";")
		for (var i = 0; i < cookies.length; i++) {
			var cookie = cookies[i].trim()
			// Does this cookie string begin with the name we want?
			if (cookie.substring(0, name.length + 1) === name + "=") {
				cookieValue = decodeURIComponent(cookie.substring(name.length + 1))
				break
			}
		}
	}
	return cookieValue
}

export function removeItemAll(arr, value) {
	var arrCopy = [...arr]
	var i = 0
	while (i < arr.length) {
		if (arrCopy[i] === value) {
			arrCopy.splice(i, 1)
		} else {
			++i
		}
	}
	return arrCopy
}

export function sleepPause(miliseconds) {
	var currentTime = new Date().getTime()

	while (currentTime + miliseconds >= new Date().getTime()) {
		// Do Nothing
	}
}

export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export function compressData64(data) {
	let step1 = JSON.stringify(data)
	// eslint-disable-next-line no-undef
	let step2 = pako.gzip(step1)
	let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

	return base64Data
}

export function decompressData64(input) {
	let compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	return JSON.parse(decompressedData)
}

export function decompressChatData(data) {
	// NB personal.gameCreationTimestamp must already be loaded
	const personal = usePersonalStore()
	if (data.length > 0) {
		let compressedData = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
		// eslint-disable-next-line no-undef
		let decompressedData = pako.ungzip(compressedData, { to: "string" })
		var chatArray = JSON.parse(decompressedData)
	} else chatArray = []
	// Update all the timings
	let currentFullTime = personal.gameCreationTimestamp
	for (let i = chatArray.length - 1; i >= 0; i--) {
		currentFullTime += chatArray[i][1]
		chatArray[i][1] = currentFullTime
	}

	chatArray.push(["WelcomeBot", personal.gameCreationTimestamp, "Welcome to Roads & Boats Online!\n\nIf you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!"])

	return chatArray
}

export function timestampToString(timestamp) {
	var d = new Date(timestamp * 1000)
	var res = ""
	if (d.getDate() < 10) res += "0" + d.getDate() + "/"
	else res += d.getDate() + "/"
	if (d.getMonth() < 9) res += "0" + (d.getMonth() + 1) + "/"
	else res += d.getMonth() + 1 + "/"
	res += d.getFullYear() + " "
	if (d.getHours() < 10) res += "0" + d.getHours() + ":"
	else res += d.getHours() + ":"
	if (d.getMinutes() < 10) res += "0" + d.getMinutes() + ":"
	else res += d.getMinutes() + ":"
	if (d.getSeconds() < 10) res += "0" + d.getSeconds()
	else res += d.getSeconds()

	return res
}

export function htmlEscape(str) {
	return (
		String(str)
			//.replace(/(?:\r|\n|\r\n)/g, "SNLB")
			.replace(/&/g, "&amp;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
	)
}

export function htmlUnescape(value) {
	return String(value)
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
	//.replace(/SNLB/g, "\n")
}

/*** MAP */
// Wipe everything to reset map building
export function clearMap(keepHistory) {
	const store = useModelStore()
	if (!keepHistory) store.history.splice(0)

	// First, remove all items from the map
	store.ALL_TRANSPORTERS.splice(0)
	store.ALL_RESOURCES.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_HOME_MARKERS.splice(0)
	// Set the zoomPanel to -1
	store.mapData.zoomData.hexID = -1
	// Remove edgeData
	store.mapData.edgeData.splice(0)
	// Remove all hexes
	store.mapData.hexData.splice(0)
}

// Map only, ie no bridges/roads/etc. DEBUG only
export function exportMapOnly() {
	const store = useModelStore()
	let res = []
	for (let i = 0; i < store.mapData.hexData.length; i++) {
		const hex = store.mapData.hexData[i]
		if (hex.hexID !== i) rf.doAdminAlrt("Mismatch in indices\nAny other items relying on hexID will not work properly.")
		res.push([[...hex.coord], hex.rotation, hex.hexTerrainID])
	}
	return res
}

// inputArr cannot be modified inside the app, otherwise it triggers constant reloads
export function importStartingMap(inputArr) {
	if (!inputArr) return // Allow selecting no map in Lobby area
	if (inputArr.length < 2) return
	const store = useModelStore()
	const personal = usePersonalStore()
	clearMap()
	// Update the mapData line to exclude the last element without mutating:
	store.mapData.setupData = inputArr[inputArr.length - 1]
	store.mapData.startingMap = inputArr.slice(0, -1)

	for (let i = 0; i < store.mapData.startingMap.length; i++) {
		const cood = [store.mapData.startingMap[i][0], store.mapData.startingMap[i][1], -store.mapData.startingMap[i][0] - store.mapData.startingMap[i][1]]
		const hexTerrainID = store.mapData.startingMap[i][2]
		let rotation = 0
		if (store.mapData.startingMap[i].length > 3) rotation = store.mapData.startingMap[i][3]
		let newHex = hd.createActualHex(cood, rotation, hexTerrainID)
		newHex.hexID = i
		store.mapData.hexData.push(newHex)
	}

	// ST === 1 for flat style
	if (store.mapData.setupData.ST && store.mapData.setupData.ST === 1) {
		store.hexStyle = rf.FLAT
	} else store.hexStyle = rf.POINTY

	// RS, already res idx's - added with players
	hd.calculateCanvasSize()
	hd.setNeighbours()
	map.updateEdgeData()
	hd.updateAllHexRawXY()
	// if gameID is -1, load the home markers to show the locations
	if (personal.gameID === -1 || personal.showMapOnly) {
		if (store.mapData.setupData.HM) {
			const homeMarkerArray = store.mapData.setupData.HM
			homeMarkerArray.forEach((marker) => {
				const bucketLocation = stack.decompressLocation(marker)
				store.ALL_HOME_MARKERS.push({
					ownerIndex: -1,
					colour: rf.RED,
					location: [...bucketLocation],
				})
			})
		}
	}

	// RX = [[resType, [loc]], ....]
	if (store.mapData.setupData.RX) {
		for (const inputRes of store.mapData.setupData.RX) {
			const resType = inputRes[0]
			const resLoc = inputRes[1]
			const bucketLocation = stack.decompressLocation(resLoc)
			model.addResourceToGame_core(resType, bucketLocation, 9)
		}
		model.addHistory(rf.HIST_ADD_CUSTOM_SCENARIO_ELEMENTS, -1, 0, [[rf.CUSTOM_ADD_RESOURCE, ...store.mapData.setupData.RX]])
	}

	// BX = [[bldgType, [loc]], ....]
	if (store.mapData.setupData.BX) {
		for (const inputBldg of store.mapData.setupData.BX) {
			const bldgType = inputBldg[0]
			const bldgLoc = inputBldg[1]
			const bucketLocation = stack.decompressLocation(bldgLoc)
			map.addBuildingToMap_core(bldgType, bucketLocation, false, -1, -1, 9)
			if (bldgType === rf.BLDG_MINE && inputBldg.length > 2) {
				let remainingMineContent = inputBldg[2]
				if (remainingMineContent.length === 1) remainingMineContent.push(0)
				store.ALL_BUILDINGS[store.ALL_BUILDINGS.length - 1].remainingMineContent = [...remainingMineContent]
			}
		}
		model.addHistory(rf.HIST_ADD_CUSTOM_SCENARIO_ELEMENTS, -1, 0, [[rf.CUSTOM_ADD_BUILDING, ...store.mapData.setupData.BX]])
	}

	// TX = [[transPlayer, transType, [loc]], ....]
	// This must come after the map setting calcs
	if (store.mapData.setupData.TX) {
		for (const inputTrans of store.mapData.setupData.TX) {
			const playerIndex = inputTrans[0]
			const transType = inputTrans[1]
			const transLoc = inputTrans[2]
			const bucketLocation = stack.decompressLocation(transLoc)
			model.addTransporterToGame(playerIndex, transType, bucketLocation, true)
		}
		model.addHistory(rf.HIST_ADD_CUSTOM_SCENARIO_ELEMENTS, -1, 0, [[rf.CUSTOM_ADD_TRANSPORTER, ...store.mapData.setupData.TX]])
	}
}

export function importMapOnly(inputArr, keepHistory) {
	clearMap(keepHistory)
	for (let i = 0; i < inputArr.length; i++) {
		model.addHexToMap_core(inputArr[i][0], inputArr[i][1], inputArr[i][2])
	}
}

export function simpleExportWholeMap() {
	const store = useModelStore()
	return JSON.stringify(store.mapData.hexData)
}

export function simpleImportWholeMap(importData) {
	const store = useModelStore()
	store.mapData.zoomData.hexID = -1
	store.mapData.hexData.splice(0)
	Object.assign(store.mapData.hexData, importData)
}

/** TRANSPORTERS */
export function simpleExportTransportersString() {
	const store = useModelStore()
	return JSON.stringify(store.ALL_TRANSPORTERS)
}

export function simpleImportTransporters(importData) {
	const store = useModelStore()
	store.ALL_TRANSPORTERS.splice(0)
	Object.assign(store.ALL_TRANSPORTERS, importData)
}

/** BUILDINGS */
// Export, but only "static" data, eg no remainingMoves/justPickedUpFromLocation/movedThisTurn data
export function simpleExportBuildingsString() {
	const store = useModelStore()
	return JSON.stringify(store.ALL_BUILDINGS)
}

export function simpleImportBuildings(importData) {
	const store = useModelStore()
	store.ALL_BUILDINGS.splice(0)
	Object.assign(store.ALL_BUILDINGS, importData)
}

/** RESOURCES */
export function simpleExportResourcesString() {
	const store = useModelStore()
	return JSON.stringify(store.ALL_RESOURCES)
}

export function simpleImportResources(importData) {
	const store = useModelStore()
	store.ALL_RESOURCES.splice(0)
	Object.assign(store.ALL_RESOURCES, importData)
}

/** WHOLE GAME */
export function simpleExportWholeRNBmodel() {
	const store = useModelStore()
	//  const personal = usePersonalStore()

	let temp = []

	// 0 - gameflow
	// 1 - players
	// 2 - hexData
	// 3 - edgeData - INCLUDES WALLS AND ROADS
	// 4 - Transporters
	// 5 - Buildings
	// 6 - Resources
	// 7 - wonderBricks
	// 8 - home markers
	// 9 - history
	// 10 - action Stack
	// 11 - context

	// 0 - gameflow
	temp.push(JSON.parse(JSON.stringify(store.gameflow)))

	// 1 - players
	temp.push(JSON.parse(JSON.stringify(store.players)))

	//2 hexData
	temp.push(JSON.parse(JSON.stringify(store.mapData.hexData)))

	// 3 edgeData
	temp.push(JSON.parse(JSON.stringify(store.mapData.edgeData)))

	// 4 Transporters
	temp.push(JSON.parse(simpleExportTransportersString()))

	// 5 Buildings
	temp.push(JSON.parse(simpleExportBuildingsString()))

	// 6 Resources
	temp.push(JSON.parse(simpleExportResourcesString()))

	// 7 wonderBricks
	temp.push(JSON.parse(JSON.stringify(store.wonderBricks)))

	// 8 Home markers
	temp.push(JSON.parse(JSON.stringify(store.ALL_HOME_MARKERS)))

	// 9 - history
	temp.push(JSON.parse(JSON.stringify(store.history)))

	// 10 - action Stack
	temp.push(JSON.parse(JSON.stringify(store.actionStack)))

	// 11 - context
	temp.push(JSON.parse(JSON.stringify(store.context)))

	// eslint-disable-next-line no-undef
	const msgpacked = msgpack.encode(temp)

	// 2. GZIP the binary data with maximum compression
	// level: 9 is the highest possible ratio
	// eslint-disable-next-line no-undef
	const compressed2 = pako.gzip(msgpacked, { level: 9 })

	let exportDataB64 = btoa(String.fromCharCode(...new Uint8Array(compressed2)))

	return exportDataB64
}

/** Safe clone for export that handles nested Vue reactive proxies */
function safeCloneForExport(data) {
	try {
		return structuredClone(toRaw(data))
	} catch {
		return JSON.parse(JSON.stringify(toRaw(data)))
	}
}

/** Safe clone function for history data that handles circular references */
function safeCloneHistory(history) {
	try {
		// Try structuredClone first (fastest)
		return structuredClone(history)
	} catch (error) {
		console.warn("structuredClone failed, trying JSON fallback:", error.message)
		// Fallback to JSON stringify/parse for problematic objects
		try {
			return JSON.parse(JSON.stringify(history))
		} catch (jsonError) {
			console.warn("JSON fallback failed, using manual clone:", jsonError.message)
			// Last resort: manual deep clone for circular references
			const seen = new WeakSet()
			return history.map((entry) => {
				if (!Array.isArray(entry)) return entry

				const clonedEntry = entry.map((item) => {
					if (typeof item === "object" && item !== null) {
						if (seen.has(item)) return "[Circular]"
						seen.add(item)
						try {
							return JSON.parse(JSON.stringify(item))
						} catch {
							return "[Uncloneable]"
						}
					}
					return item
				})
				return clonedEntry
			})
		}
	}
}

/** WHOLE GAME - NO COMPRESSION (for replay generation) */
export function simpleExportWholeRNBmodelNoCompression() {
	const store = useModelStore()

	let temp = []

	// 0 - gameflow
	// 1 - players
	// 2 - hexData
	// 3 - edgeData - INCLUDES WALLS AND ROADS
	// 4 - Transporters
	// 5 - Buildings
	// 6 - Resources
	// 7 - wonderBricks
	// 8 - home markers
	// 9 - history
	// 10 - action Stack
	// 11 - context

	// 0 - gameflow
	temp.push(safeCloneForExport(store.gameflow))

	// 1 - players
	temp.push(safeCloneForExport(store.players))

	//2 hexData
	temp.push(safeCloneForExport(store.mapData.hexData))

	// 3 edgeData
	temp.push(safeCloneForExport(store.mapData.edgeData))

	// 4 Transporters
	temp.push(safeCloneForExport(store.ALL_TRANSPORTERS))

	// 5 Buildings
	temp.push(safeCloneForExport(store.ALL_BUILDINGS))

	// 6 Resources
	temp.push(safeCloneForExport(store.ALL_RESOURCES))

	// 7 wonderBricks
	temp.push(safeCloneForExport(store.wonderBricks))

	// 8 Home markers
	temp.push(safeCloneForExport(store.ALL_HOME_MARKERS))

	// 9 - history
	temp.push(safeCloneHistory(toRaw(store.history)))

	// 10 - action Stack
	temp.push(safeCloneForExport(store.actionStack))

	// 11 - context
	temp.push(safeCloneHistory(toRaw(store.context)))

	// Return the array directly without compression
	return temp
}

export async function simpleImportWholeRNBmodelNoCompression(inputModel, keepHistory = false) {
	const store = useModelStore()

	// Turn off zoom panel
	store.mapData.zoomData.hexID = -1

	if (!inputModel || inputModel.length === 0) return

	// Firstly, clear the whole map so it can be rebuilt again
	clearMap(keepHistory)

	// Clear old data
	if (!keepHistory) store.history.splice(0)

	// 0 gameflow
	Object.assign(store.gameflow, inputModel[0])

	// 1 players
	store.players.splice(0)
	Object.assign(store.players, inputModel[1])

	//  2 hexData
	store.mapData.hexData.splice(0)
	Object.assign(store.mapData.hexData, inputModel[2])

	// 3 edgeData - INCLUDES WALLS AND ROADS
	store.mapData.edgeData.splice(0)
	Object.assign(store.mapData.edgeData, inputModel[3])

	// Remove everything in one go here
	store.ALL_TRANSPORTERS.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_RESOURCES.splice(0)
	store.ALL_HOME_MARKERS.splice(0)

	// 4 transporters
	Object.assign(store.ALL_TRANSPORTERS, inputModel[4])

	// 5 buildings
	Object.assign(store.ALL_BUILDINGS, inputModel[5])

	// 6 resources
	Object.assign(store.ALL_RESOURCES, inputModel[6])

	// 7 wonder bricks
	store.wonderBricks.splice(0)
	Object.assign(store.wonderBricks, inputModel[7])

	// 8 Home Markers
	store.ALL_HOME_MARKERS.splice(0)
	Object.assign(store.ALL_HOME_MARKERS, inputModel[8])

	// 9 - history
	Object.assign(store.history, inputModel[9])

	// 10 - actionStack
	store.actionStack.splice(0)
	Object.assign(store.actionStack, inputModel[10])

	// 11 - context
	Object.assign(store.context, inputModel[11])

	// Clear any saved animation waypoints and set correct positions
	for (const transporterObj of store.ALL_TRANSPORTERS) {
		transporterObj.animationWaypoints = []
		const transporterLocation = transporterObj.location
		if (loc.isOOBlocation(transporterLocation)) continue
		const transporterStats = rf.getTransporterStats(transporterObj.type)
		transporterObj.rawTransporterXY = map.getTransporterPositionFromLocation(transporterLocation, transporterStats, transporterObj.id)
	}
}

export async function simpleImportWholeRNBmodel(inputBase64, keepHistory = false) {
	const store = useModelStore()

	// Turn off zoom panel
	store.mapData.zoomData.hexID = -1

	// 0 - gameflow
	// 1 - players
	// 2 - hexData
	// 3 - edgeData - INCLUDES WALLS AND ROADS
	// 4 - Transporters
	// 5 - Buildings
	// 6 - Resources
	// 7 - Home Markers
	// 8 - history
	// 9 - context
	// 10 - action Stack

	if (inputBase64 === "" || inputBase64 == undefined) return

	let inputModel = null
	try {
		const binaryString = window.atob(inputBase64)
		const len = binaryString.length
		const bytes = new Uint8Array(len)
		for (let i = 0; i < len; i++) {
			bytes[i] = binaryString.charCodeAt(i)
		}
		// 1. Un-GZIP the raw binary
		// pako.ungzip detects the header and handles the inflation
		// eslint-disable-next-line no-undef
		const ungzipped = pako.ungzip(bytes)

		// 2. Decode the MessagePack binary back into a Javascript Array
		// eslint-disable-next-line no-undef
		inputModel = msgpack.decode(ungzipped)
	} catch (err) {
		console.error("Decompression failed:", err)
		return null
	}

	// Firstly, cleat the whole map so it can be rebuilt again
	clearMap(keepHistory)

	// Clear old data
	if (!keepHistory) store.history.splice(0) // MUST DO THIS NOW. Otherwise next tick makes history look into empty arrs EXCEPT DURING REPLAY

	// 0 gameflow
	Object.assign(store.gameflow, inputModel[0])

	// 1 players
	store.players.splice(0)
	Object.assign(store.players, inputModel[1])

	//  2 hexData
	store.mapData.hexData.splice(0)
	Object.assign(store.mapData.hexData, inputModel[2])

	// 3 edgeData - INCLUDES WALLS AND ROADS
	store.mapData.edgeData.splice(0)
	Object.assign(store.mapData.edgeData, inputModel[3])

	// Remove everything in one go here
	store.ALL_TRANSPORTERS.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_RESOURCES.splice(0)
	store.ALL_HOME_MARKERS.splice(0)

	// 4 transporters
	Object.assign(store.ALL_TRANSPORTERS, inputModel[4])

	// 5 buildings
	Object.assign(store.ALL_BUILDINGS, inputModel[5])

	// 6 resources
	Object.assign(store.ALL_RESOURCES, inputModel[6])

	// 7 wonder bricks
	store.wonderBricks.splice(0)
	Object.assign(store.wonderBricks, inputModel[7])

	// 8 Home Markers
	store.ALL_HOME_MARKERS.splice(0)
	Object.assign(store.ALL_HOME_MARKERS, inputModel[8])

	// 9 - history
	Object.assign(store.history, inputModel[9])

	// 10 - actionStack
	store.actionStack.splice(0)
	Object.assign(store.actionStack, inputModel[10])

	// 11 - context
	//if (importContext) Object.assign(store.context, inputModel[13])
	Object.assign(store.context, inputModel[11])

	// Clear any saved animation waypoints and set correct positions
	for (const transporterObj of store.ALL_TRANSPORTERS) {
		transporterObj.animationWaypoints = []
		const transporterLocation = transporterObj.location
		if (loc.isOOBlocation(transporterLocation)) continue
		const transporterStats = rf.getTransporterStats(transporterObj.type)
		transporterObj.rawTransporterXY = map.getTransporterPositionFromLocation(transporterLocation, transporterStats, transporterObj.id)
	}
}

export function exportRNBmodel(forGameOver) {
	const store = useModelStore()
	let temp = []

	// 0 - Players
	let tempPlayers = []
	for (let i = 0; i < store.players.length; i++) {
		let tempPlayer = []
		// 0 - name /  display name
		if (store.players[i].name === store.players[i].displayName) tempPlayer.push([store.players[i].name])
		else tempPlayer.push([store.players[i].name, store.players[i].displayName])
		// 1 - colour
		tempPlayer.push(store.players[i].colour)
		// 2 - Art & The Atelier: shows staged per target, best beauty shown at this tile
		if (store.gameOptions.useArt) tempPlayer.push(store.players[i].artShownAt || {})
		if (store.gameOptions.useArt) tempPlayer.push(store.players[i].artBestShownHere || 0)

		tempPlayers.push(tempPlayer)
	}
	temp.push(JSON.parse(JSON.stringify(tempPlayers)))

	// 1 - wonderbricks
	temp.push(JSON.parse(JSON.stringify(store.wonderBricks)))

	// 2 - transporters
	let tempTransporters = []
	for (let i = 0; i < store.ALL_TRANSPORTERS.length; i++) {
		if (store.ALL_TRANSPORTERS[i].id !== i) rf.doAdminAlrt("Mismatch in Transporter indices\nAny other items relying on transporterID will not work properly.")
		const transporterObj = store.ALL_TRANSPORTERS[i]
		let tempTransporter = []
		tempTransporter.push(transporterObj.ownerIndex)
		tempTransporter.push(transporterObj.type)
		let exportLocation = []
		// Art & The Atelier: exhibition caravans are land movers but not in LAND_TRANSPORTERS.
		// Planes & Aeroports: a plane is placed on a land vertex bucket, so export it like a land transporter.
		if (rf.LAND_TRANSPORTERS.includes(transporterObj.type) || transporterObj.type === rf.EXHIBITION_TRANSPORTER || transporterObj.type === rf.PLANE) exportLocation = exportLandTransporterLocation(transporterObj.location)
		else if (rf.WATER_TRANSPORTERS.includes(transporterObj.type)) exportLocation = exportWaterTransporterLocation(transporterObj.location)
		tempTransporter.push([...exportLocation])
		if (!forGameOver) tempTransporter.push(transporterObj.uniqueID)
		tempTransporters.push(tempTransporter)
	}
	temp.push(JSON.parse(JSON.stringify(tempTransporters)))

	// 3 - Res
	let tempResources = []
	for (let i = 0; i < store.ALL_RESOURCES.length; i++) {
		if (store.ALL_RESOURCES[i].id !== i) rf.doAdminAlrt("Mismatch in Resource indices\nAny other items relying on resourceID will not work properly.")
		const resourceObj = store.ALL_RESOURCES[i]
		let tempResource = []
		tempResource.push(resourceObj.type)
		let exportLocation = exportResLocation(resourceObj.location)
		tempResource.push([...exportLocation])
		if (!forGameOver) tempResource.push(resourceObj.uniqueID)
		tempResources.push(tempResource)
	}
	temp.push(JSON.parse(JSON.stringify(tempResources)))

	// 4 - history
	temp.push(JSON.parse(JSON.stringify(store.history)))

	// 5 - mine content
	let tempMineContent = []
	for (let i = 0; i < store.ALL_BUILDINGS.length; i++) {
		const bldgObj = store.ALL_BUILDINGS[i]
		if (bldgObj.type === rf.BLDG_MINE) {
			if (bldgObj.remainingMineContent[1] !== 0) tempMineContent.push([bldgObj.id, [...bldgObj.remainingMineContent]])
			else tempMineContent.push([bldgObj.id, [bldgObj.remainingMineContent[0]]])
		}
	}
	temp.push(JSON.parse(JSON.stringify(tempMineContent)))

	if (!forGameOver) {
		// 6- gameflow - a solo mode or ended game doesn't need this
		let tempGameflow = []
		// turn - get from history
		tempGameflow.push(store.gameflow.phase) // 0
		tempGameflow.push(JSON.parse(JSON.stringify(store.gameflow.fullTurnOrder))) // 1
		tempGameflow.push(JSON.parse(JSON.stringify(store.gameflow.turnOrder))) // 2
		tempGameflow.push(JSON.parse(JSON.stringify(store.gameflow.wonderPrayingOrder))) // 3
		tempGameflow.push(JSON.parse(JSON.stringify(store.gameflow.wonderTurnOrder))) // 4
		tempGameflow.push(JSON.parse(JSON.stringify(store.gameflow.newWonderTurnOrder))) // 5
		if (store.gameflow.newWonderPrayingOrder.length > 0 && store.gameflow.newWonderPrayingOrder.some((x) => x !== -1)) tempGameflow.push(JSON.parse(JSON.stringify(store.gameflow.newWonderPrayingOrder))) // 6
		temp.push(JSON.parse(JSON.stringify(tempGameflow)))

		// 7 - ongoingVars
		let tempOngoingvars = []
		tempOngoingvars.push([JSON.parse(JSON.stringify(store.ongoingVars.resourceSharingData))])

		temp.push(JSON.parse(JSON.stringify(tempOngoingvars)))
	}

	let step1 = JSON.stringify(temp)

	// eslint-disable-next-line no-undef
	let step2 = pako.gzip(step1)
	let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

	return base64Data
}

export function importRNBmodel(input, forGameOver) {
	// COUNT BRICKS AND ADD DESERT TO PASTURE CONVERSION
	const store = useModelStore()
	if (input === "" || input == undefined) return

	let compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	let inputModel = JSON.parse(decompressedData)

	context.clearDataForGameReload()
	importStartingMap(store.mapData.externalMapData)

	// 0 - players
	store.players.splice(0)
	for (let i = 0; i < inputModel[0].length; i++) {
		const entry = inputModel[0][i]
		let name = ""
		let displayName = ""
		if (entry[0].length === 1) {
			name = entry[0][0]
			displayName = entry[0][0]
		} else if (entry[0].length === 2) {
			name = entry[0][0]
			displayName = entry[0][1]
		}
		let colour = entry[1]
		let RnD = [0, 0, 0, 0, 0, 0, 0, 0]

		store.players.push({
			name: name,
			displayName: displayName,
			colour: colour,
			RnD: [...RnD],
			// Art & The Atelier: restored for old saves that lack these fields
			artShownAt: entry[2] || {},
			artBestShownHere: entry[3] || 0,
		})
	}

	// 1 - Wonder Bricks
	store.wonderBricks.splice(0)
	Object.assign(store.wonderBricks, inputModel[1])

	// 2 - Transporters
	store.ALL_TRANSPORTERS.splice(0)
	for (let i = 0; i < inputModel[2].length; i++) {
		const entry = inputModel[2][i]
		let ownerIndex = entry[0]
		let transporterType = entry[1]
		let exportedLocation = entry[2]
		let uniqueID = ""
		if (!forGameOver) uniqueID = entry[3]
		let transporterLocation = []
		// Art & The Atelier: exhibition caravans are land movers but not in LAND_TRANSPORTERS
		if (rf.LAND_TRANSPORTERS.includes(transporterType) || transporterType === rf.EXHIBITION_TRANSPORTER || transporterType === rf.PLANE) transporterLocation = importLandTransporterLocation(exportedLocation)
		else if (rf.WATER_TRANSPORTERS.includes(transporterType)) transporterLocation = importWaterTransporterLocation(exportedLocation)
		const transporterStats = rf.getTransporterStats(transporterType)

		store.ALL_TRANSPORTERS.push({
			id: i,
			ownerIndex: ownerIndex,
			type: transporterType,
			location: transporterLocation,
			justPickedUpFromLocation: [],
			remainingMoves: transporterStats.maxMoves,
			movedThisTurn: false, // Flag to see if it can be picked up or not. Could also use "remaining moves" but easier to seperate for testing
			rawTransporterXY: [0, 0],
			//animationWaypoints: [[...newPos, 10]],
			animationWaypoints: [],
			uniqueID: uniqueID,
		})
	}
	// Position NON carried trans
	for (const transporterObj of store.ALL_TRANSPORTERS) {
		const transporterLocation = transporterObj.location
		if (loc.isOnAnyTransporter(transporterLocation)) continue
		if (loc.isOOBlocation(transporterLocation)) continue
		const transporterStats = rf.getTransporterStats(transporterObj.type)
		let rawTransporterXY = map.getTransporterPositionFromLocation(transporterLocation, transporterStats, transporterObj.id)
		transporterObj.rawTransporterXY = rawTransporterXY
	}
	// Position CARRIED trans
	for (const transporterObj of store.ALL_TRANSPORTERS) {
		const transporterLocation = transporterObj.location
		if (!loc.isOnAnyTransporter(transporterLocation)) continue
		const transporterStats = rf.getTransporterStats(transporterObj.type)
		let rawTransporterXY = map.getTransporterPositionFromLocation(transporterLocation, transporterStats, transporterObj.id)
		transporterObj.rawTransporterXY = rawTransporterXY
	}

	// 3 - Res
	store.ALL_RESOURCES.splice(0)
	for (let i = 0; i < inputModel[3].length; i++) {
		const resObj = inputModel[3][i]
		const resType = resObj[0]
		const exportLocation = resObj[1]
		let uniqueID = ""
		if (!forGameOver) uniqueID = resObj[2]
		const resLocation = importResLocation(exportLocation)

		store.ALL_RESOURCES.push({
			id: i,
			location: [...resLocation],
			autoDropLocationAfterFollowingTransporter: [],
			type: resType,
			gfx: "res_" + String(resType),
			movedTransporterID: -1,
			uniqueID: uniqueID,
		})
	}

	// 4 history
	store.history.splice(0)
	Object.assign(store.history, inputModel[4])

	// 5 mine content (do after hist)

	if (!forGameOver) {
		// 6 gameflow
		store.gameflow.turn = 1
		store.gameflow.phase = inputModel[6][0]
		store.gameflow.fullTurnOrder = JSON.parse(JSON.stringify(inputModel[6][1]))
		store.gameflow.turnOrder = JSON.parse(JSON.stringify(inputModel[6][2]))
		store.gameflow.wonderPrayingOrder = JSON.parse(JSON.stringify(inputModel[6][3]))
		store.gameflow.wonderTurnOrder = JSON.parse(JSON.stringify(inputModel[6][4]))
		store.gameflow.newWonderTurnOrder = JSON.parse(JSON.stringify(inputModel[6][5]))
		store.gameflow.newWonderPrayingOrder = Array(store.players.length).fill(-1)
		if (inputModel[6].length > 6) store.gameflow.newWonderPrayingOrder = JSON.parse(JSON.stringify(inputModel[6][6]))

		// Repair legacy conflict arrays that can carry -1 placeholders
		// (players dropped from the turn order during an earlier conflict without praying)
		const repairMissingPlayerIndexes = (arr) => {
			if (arr.length !== store.players.length) return arr
			const result = [...arr]
			for (let i = 0; i < store.players.length; i++) {
				if (!result.includes(i)) {
					const emptyPos = result.indexOf(-1)
					if (emptyPos !== -1) result[emptyPos] = i
				}
			}
			return result
		}
		store.gameflow.wonderPrayingOrder = repairMissingPlayerIndexes(store.gameflow.wonderPrayingOrder)
		store.gameflow.fullTurnOrder = repairMissingPlayerIndexes(store.gameflow.fullTurnOrder)
		// During praying, any player not yet prayed and not in the turn order should still get their pray turn
		if (rf.PHASE_CONFLICT_PRAYINGS.includes(store.gameflow.phase)) {
			const prayedSoFar = new Set(store.gameflow.newWonderPrayingOrder.filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < store.players.length))
			for (let i = 0; i < store.players.length; i++) {
				if (!prayedSoFar.has(i) && !store.gameflow.turnOrder.includes(i)) store.gameflow.turnOrder.push(i)
			}
		}

		store.ongoingVars.resourceSharingData = JSON.parse(JSON.stringify(inputModel[7][0]))
	} else if (forGameOver) {
		// recreate gameflow
		store.gameflow.turn = 1
		store.gameflow.phase = rf.PHASE_GAME_OVER

		store.gameflow.fullTurnOrder = store.players.map((_player, index) => index)
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		store.gameflow.wonderPrayingOrder = [...store.gameflow.fullTurnOrder] //.reverse()
		store.gameflow.wonderTurnOrder = [...store.gameflow.fullTurnOrder]
		store.gameflow.newWonderTurnOrder = []
		store.gameflow.newWonderPrayingOrder = Array(store.players.length).fill(-1)
	}

	context.resetContextAndHighlights()
	/*if (includeContext) {
		// 8 context
		Object.assign(store.context, inputModel[8])
	}*/

	// FINALLY, do a loop over store.history
	// Do: Home Markers, brdges, roads, buildgings, walls
	let newHomeMarkers = []
	let newBridges = []
	let newRoads = []
	let newPowerLines = []
	let newBuildings = []
	for (let i = 0; i < store.history.length; i++) {
		const entry = store.history[i]
		if (entry[0] === rf.HIST_CHOOSE_HOME_TILE) {
			const playerIndex = entry[1]
			const homeMarkerLocation = stack.decompressLocation(entry[3])
			newHomeMarkers.push([playerIndex, homeMarkerLocation])
		}
		//
		else if (entry[0] === rf.HIST_NEW_TURN) store.gameflow.turn = entry[3][0]
		else if (entry[0] === rf.HIST_ADD_CUSTOM_SCENARIO_ELEMENTS) {
			// Buildings need to be readded here
			for (const customEntry of entry[3]) {
				if (customEntry[0] === rf.CUSTOM_ADD_BUILDING) {
					for (const [bldgType, bldgLoc] of customEntry.slice(1)) {
						const bldgLocation = stack.decompressLocation(bldgLoc)
						newBuildings.push([bldgType, bldgLocation, 9, store.gameflow.turn])
					}
				}
			}
			// Auto-research needs to be done here
			if (store.mapData.setupData.RS) {
				for (let i = 0; i < store.players.length; i++) {
					for (const researchIdx of store.mapData.setupData.RS) {
						store.players[i].RnD[researchIdx] = 1
					}
				}
			}
		}
		//
		else if (entry[0] === rf.HIST_STACK_ACTIONS) {
			if (rf.PHASE_BUILDINGS.includes(entry[3][0]) || rf.PHASE_PRODUCTIONS.includes(entry[3][0])) {
				for (const stackAction of entry[3].slice(1)) {
					if (stackAction[0] === rf.STACK_BUILD_BUILDING) {
						const bldgType = stackAction[2]
						const bldgLocation = stack.decompressLocation(stackAction[3])
						newBuildings.push([bldgType, bldgLocation, entry[1], store.gameflow.turn])
					} else if (stackAction[0] === rf.STACK_UPGRADE_BUILDING) {
						const oldBldgID = stackAction[1]
						const newBldgType = stackAction[2]
						const bldgLocation = stack.decompressLocation(stackAction[3])
						newBuildings.push([-1, oldBldgID, newBldgType, bldgLocation, entry[1], store.gameflow.turn])
					} else if (stackAction[0] === rf.STACK_BUILD_ROAD) {
						const fromLoc = stack.decompressLocation(stackAction[2])
						const toLoc = stack.decompressLocation(stackAction[3])
						newRoads.push([
							[fromLoc[1], fromLoc[2]],
							[toLoc[1], toLoc[2]],
						])
					} else if (stackAction[0] === rf.STACK_BUILD_POWER_LINE) {
						const fromLoc = stack.decompressLocation(stackAction[2])
						const toLoc = stack.decompressLocation(stackAction[3])
						newPowerLines.push([
							[fromLoc[1], fromLoc[2]],
							[toLoc[1], toLoc[2]],
						])
					} else if (stackAction[0] === rf.STACK_BUILD_BRIDGE) {
						const hexID = stackAction[2]
						let bridgeIdx = 0
						if (stackAction.length > 3) bridgeIdx = stackAction[3]
						const hexObj = model.getHexByID(hexID)
						const bridgeArr = hexObj.bridges[bridgeIdx]
						newBridges.push([hexID, bridgeArr])
					}
					// Walls must be done "in real time" to make sure the size / demolish order is correct
					else if (stackAction[0] === rf.STACK_BUILD_WALL) {
						const fromHexID = stackAction[2]
						const toHexID = stackAction[3]
						map.addWallToMap_core(-1, fromHexID, toHexID, entry[1], false, false)
					} else if (stackAction[0] === rf.STACK_DEMOLISH_WALL) {
						const fromHexID = stackAction[2]
						const toHexID = stackAction[3]
						map.addWallToMap_core(-1, fromHexID, toHexID, entry[1], false, false)
					}
					if (stackAction[0] === rf.STACK_DO_RESEARCH) {
						const researchIdx = stackAction[2]
						store.players[entry[1]].RnD[researchIdx] = 1
					}
				}
			}
		}
	}
	store.ALL_HOME_MARKERS.splice(0)
	for (const homeEntry of newHomeMarkers) {
		model.addHomeMarkerToGame(homeEntry[0], homeEntry[1])
	}
	store.ALL_BUILDINGS.splice(0)
	for (const bldgEntry of newBuildings) {
		if (bldgEntry[0] !== -1) map.addBuildingToMap_core(bldgEntry[0], bldgEntry[1], false, -1, rf.MINE_NORMAL, bldgEntry[2], bldgEntry[3])
		// If it's -1, then remove and add
		else {
			// newBuildings.push(-1, oldBldgID, newBldgType, bldgLocation, playerIndex, turn)
			// Remove the old building
			model.getBuildingByID(bldgEntry[1]).location = loc.setOOBlocation()
			// Add the new one
			map.addBuildingToMap_core(bldgEntry[2], bldgEntry[3], false, -1, rf.MINE_NORMAL, bldgEntry[4], bldgEntry[5])
		}
	}
	for (const roadEntry of newRoads) {
		map.addRoadToMap_core(roadEntry[0], roadEntry[1], -1, false)
	}
	for (const bridgeEntry of newBridges) {
		map.addBridgeToMap_core(bridgeEntry[0], -1, bridgeEntry[1], false)
	}
	for (const powerLineEntry of newPowerLines) {
		map.addPowerLineToMap_core(powerLineEntry[0], powerLineEntry[1], -1, false)
	}
	// Now update mine to current content by ID
	for (const mineEntry of inputModel[5]) {
		const bldgID = mineEntry[0]
		let remainingMineContent = mineEntry[1]
		if (remainingMineContent.length < 2) remainingMineContent.push(0)
		model.getBuildingByID(bldgID).remainingMineContent = [...remainingMineContent]
	}

	// Use conversions of building if this is produciton phase
	if (rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) {
		let histIdx = store.history.length - 1
		while (store.history[histIdx][0] === rf.HIST_STACK_ACTIONS && rf.PHASE_PRODUCTIONS.includes(store.history[histIdx][3][0])) {
			for (const stackAction of store.history[histIdx][3].slice(1)) {
				if (stackAction[0] === rf.STACK_MANUAL_PRODUCTION) {
					const bldgID = stackAction[1]
					const bldgObj = model.getBuildingByID(bldgID)
					bldgObj.remainingConversions--
				}
			}
			histIdx--
		}
	}

	// Finally, check if deserts need to be converted
	if (store.wonderBricks.length >= 45) wonder.convertDesertsToPastures()

	// Amd if it's gameover, calc the scores
	if (store.gameflow.phase == rf.PHASE_GAME_OVER) {
		wonder.setFullTurnOrderForGameover()
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
	}

}

export function exportLandTransporterLocation(inputLocation) {
	// OOB is empty array
	if (loc.isOOBlocation(inputLocation)) return []
	// On trans is length 1, just trans ID
	else if (loc.isOnAnyTransporter(inputLocation)) return [inputLocation[1]]
	// Land vertex is length 2, hex ID and vertex ID
	else if (loc.isLandVertexLocation(inputLocation)) return [inputLocation[1], inputLocation[2]]
	else rf.doAdminAlrt(`landTransporterLocation error: ${inputLocation}`)
}

export function importLandTransporterLocation(inputLocation) {
	if (inputLocation.length === 0) return [rf.LOCATION_OOB]
	else if (inputLocation.length === 1) return [rf.LOCATION_TRANSPORTER, inputLocation[0]]
	else if (inputLocation.length === 2) return [rf.LOCATION_LAND_VERTEX, inputLocation[0], inputLocation[1]]
	else rf.doAdminAlrt(`importLandTransporterLocation error: ${inputLocation}`)
}

export function exportWaterTransporterLocation(inputLocation) {
	// OOB is simply []
	if (loc.isOOBlocation(inputLocation)) return []
	// river vertex, vertex 0 is length 1
	else if (loc.isRiverVertexLocation(inputLocation) && inputLocation[2] === 0) return [inputLocation[1]]
	// Otherwise river vertex is length 2 WITHOUT -1 flag
	else if (loc.isRiverVertexLocation(inputLocation)) return [inputLocation[1], inputLocation[2]]
	// If on transporteer, use -1 flag
	else if (loc.isOnAnyTransporter(inputLocation)) return [-1, inputLocation[1]]
	// If on water vertex, use hexID and vertex length 3  flag -1
	else if (loc.isWaterVertexLocation(inputLocation)) return [-1, inputLocation[1], inputLocation[2]]
	else if (loc.isDockedLocation(inputLocation)) {
		const hexID = inputLocation[1]
		const side = inputLocation[2]
		const bank = inputLocation[3]
		const offset = inputLocation[4]
		// Compact format: no bank, no offset -> length 3
		if (bank === rf.BANK_NONE && offset === rf.DOCKED_OFFSET_NONE) return [rf.LOCATION_DOCKED, hexID, side]
		// Has bank, no offset -> length 4
		if (offset === rf.DOCKED_OFFSET_NONE) return [rf.LOCATION_DOCKED, hexID, side, bank]
		// Has bank and offset -> length 5
		return [rf.LOCATION_DOCKED, hexID, side, bank, offset]
	} else rf.doAdminAlrt(`export waterTransporterLocation error: ${inputLocation}`)
}

export function importWaterTransporterLocation(inputLocation) {
	// No length is OOB
	if (inputLocation.length === 0) return [rf.LOCATION_OOB]
	// River vertex 0 has length 1
	else if (inputLocation.length === 1) return [rf.LOCATION_RIVER_VERTEX, inputLocation[0], 0]
	// Otherwise, river vertex has length 2
	else if (inputLocation.length === 2 && inputLocation[0] !== -1) return [rf.LOCATION_RIVER_VERTEX, inputLocation[0], inputLocation[1]]
	// On transporter has -1 flag length 2 with transporterID
	else if (inputLocation.length === 2 && inputLocation[0] === -1) return [rf.LOCATION_TRANSPORTER, inputLocation[1]]
	// Water vertex is length 3 with -1 flag with hexID and vertex
	else if (inputLocation.length === 3 && inputLocation[0] === -1) return [rf.LOCATION_SEA_VERTEX, inputLocation[1], inputLocation[2]]
	// Docked is length 3 if bank none and no offset
	else if (inputLocation.length === 3) return loc.setDockedLocation(inputLocation[1], inputLocation[2], rf.BANK_NONE, rf.DOCKED_OFFSET_NONE)
	// Docked is length 4 if has bank but no offset
	else if (inputLocation.length === 4) return loc.setDockedLocation(inputLocation[1], inputLocation[2], inputLocation[3], rf.DOCKED_OFFSET_NONE)
	// Docked is length 5 if has bank and offset
	else if (inputLocation.length === 5) return loc.setDockedLocation(inputLocation[1], inputLocation[2], inputLocation[3], inputLocation[4])
	else rf.doAdminAlrt(`importWaterTransporterLocation error: ${inputLocation}`)
}

export function exportResLocation(inputLocation) {
	// Length 0 is OOB
	if (loc.isOOBlocation(inputLocation)) return []
	// Length 2 but starting wtih -1 is on trans
	else if (loc.isOnAnyTransporter(inputLocation)) return [-1, inputLocation[1]]
	// If it's a bucket location, return just hexID if bucket is 0, else length 2 [hexID, bucketID]
	else if (loc.isBucketLocation(inputLocation)) {
		if (inputLocation[2] === 0) return [inputLocation[1]]
		else return [inputLocation[1], inputLocation[2]]
	} else if (loc.isFollowingAnyTransporter(inputLocation)) {
		rf.doAdminAlrt("Export location should not be following transporter")
		return [-2, inputLocation[1]]
	} else rf.doAdminAlrt(`resLocation error: ${inputLocation}`)
}

export function importResLocation(inputLocation) {
	if (inputLocation.length === 0) return [rf.LOCATION_OOB]
	else if (inputLocation.length === 2 && inputLocation[0] === -1) return [rf.LOCATION_TRANSPORTER, inputLocation[1]]
	else if (inputLocation.length === 2 && inputLocation[0] === -2) return [rf.LOCATION_FOLLOWER, inputLocation[1]]
	else if (inputLocation.length === 1) return [rf.LOCATION_BUCKET, inputLocation[0], 0]
	else if (inputLocation.length === 2) return [rf.LOCATION_BUCKET, inputLocation[0], inputLocation[1]]
	else rf.doAdminAlrt(`importResLocation error: ${inputLocation}`)
}
