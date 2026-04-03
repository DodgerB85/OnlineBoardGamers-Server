/** General Utils
 *  Import / export game state
 *
 *
 *
 */

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

//import copy from 'fast-copy';

import * as rf from "./AQYreference.js"
import * as map from "./AQYmap.js"
import * as city from "./AQYcity.js"
import * as model from "./AQYmodel.js"
import * as IO from "../backend/AQY_IO.js"
import * as country from "./AQYcountry.js"

import { usePersonalStore } from "../stores/AQYpersonal.js"
import { useModelStore } from "../stores/AQYstore.js"

export const shuffle = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		let j = Math.floor(Math.random() * (i + 1))
		//const j = Math.floor(Math.random() * (i + 1))
		;[array[i], array[j]] = [array[j], array[i]]
	}
	return array
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

export function generateRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min)
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

export function timestampToString(timestamp) {
	var d = new Date(timestamp)
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
	return String(str)
		.replace(/(?:\r|\n|\r\n)/g, "SNLB")
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
}

export function htmlUnescape(value) {
	return String(value)
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/SNLB/g, "\n")
}

export function decompressChatData(data) {
	if (data.length > 0) {
		let compressedData = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
		// eslint-disable-next-line no-undef
		let decompressedData = pako.ungzip(compressedData, { to: "string" })
		var chatArray = JSON.parse(decompressedData)
	} else chatArray = []

	chatArray.push(["WelcomeBot", 0, "Welcome to Antiquity Online!SNLBSNLBIf you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!"])

	return chatArray
}

function deepClone(obj) {
	if (obj === null || typeof obj !== "object") {
		return obj
	}

	let clone

	if (Array.isArray(obj)) {
		clone = []
		for (let i = 0; i < obj.length; i++) {
			clone[i] = deepClone(obj[i])
		}
	} else {
		clone = {}
		for (let key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				clone[key] = deepClone(obj[key])
			}
		}
	}

	return clone
}

export function decompressTradeData(data, forceAnyUpdate) {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (personal.pov < 0) return

	// Decompress trade data
	let compressedData = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	let tradeData = JSON.parse(decompressedData)

	let relevantIncomingTrades = []
	let relevantOutgoingTrades = []
	let irrelevantTrades = []
	// [youIndece, opponentIndex, yourResources, yourPromise, opponentsResources, opponentsPromise, yourMoveData]
	for (let i = 0; i < tradeData.playerTrades.length; i++) {
		if (tradeData.playerTrades[i][1] === personal.pov) relevantIncomingTrades.push([...tradeData.playerTrades[i]])
		if (tradeData.playerTrades[i][0] === personal.pov) relevantOutgoingTrades.push([...tradeData.playerTrades[i]])
		if (tradeData.playerTrades[i][0] !== personal.pov && tradeData.playerTrades[i][1] !== personal.pov) irrelevantTrades.push([...tradeData.playerTrades[i]])
	}
	store.context.relevantIncomingTrades = [...relevantIncomingTrades]
	store.context.relevantOutgoingTrades = [...relevantOutgoingTrades]
	store.context.irrelevantTrades = [...irrelevantTrades]

	// Add any history
	/*for (let i = 0; i < tradeData.tradeHistory.length; i++) {
		store.history.push(tradeData.tradeHistory[i])
	}*/
	for (let i = 0; i < tradeData.tradeHistory.length; i++) {
		const trade = tradeData.tradeHistory[i]

		// Check if the trade is not already in store.history
		if (!store.history.some((item) => JSON.stringify(item) === JSON.stringify(trade))) {
			store.history.push(trade)
		}
	}

	// If any trade has gone through, update their available resources
	for (let i = 0; i < tradeData.playerCityLockedData.length; i++) {
		if (i !== personal.pov && tradeData.playerCityLockedData[i].length > 0) {
			let inputContent = JSON.parse(
				// eslint-disable-next-line no-undef
				pako.ungzip(
					Uint8Array.from(atob(tradeData.playerCityLockedData[i]), (c) => c.charCodeAt(0)),
					{ to: "string" }
				)
			)
			let player = store.players[i]

			Object.assign(player.availableResources, inputContent[4])
		}
	}

	// Update your prommises
	/*for (let i = 0; i < tradeData.playerPromises.length; i++) {
		
	}*/

	// Always update on a force
	if (forceAnyUpdate && tradeData.playerCityLockedData[personal.pov].length > 0) {
		simpleImportPlayerCityTurnData(personal.pov, tradeData.playerCityLockedData[personal.pov])
		// Remove undo points
		store.undoPoints.splice(0)
		store.clearVars()
		// Save the turn reset
		store.wholeTurnResetData = simpleExportWholeModel()
		// Add an undo point
		model.createUndoPoint()
	}
	// Also update on new trade update, if your POV requires a force
	if (tradeData.playersRequiringHardReset.includes(personal.pov) && tradeData.playerCityLockedData[personal.pov].length > 0) {
		simpleImportPlayerCityTurnData(personal.pov, tradeData.playerCityLockedData[personal.pov])
		IO.removePlayerFromHardTradeReset(personal.pov)
		// Remove undo points
		store.undoPoints.splice(0)
		store.clearVars()
		// Save the turn reset
		store.wholeTurnResetData = simpleExportWholeModel()
		// Add an undo point
		model.createUndoPoint()
	}
}

// JUST export the player cities
export function simpleExportPlayerCityTurnData(playerIndex, lockForTrade = false) {
	const store = useModelStore()

	/*					cities: [], //[city.createNewCity_core({"q": 0,"r": 0,"s": 0})],
					availableBuildings: [...rf.SINGLE_CITY_BUILDINGS],
					availableHouses: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
					availableMen: 0,
					availableResources: [6, 0, 0, 0, 0, 0, 0, 0, 0, 0],
					saint: rf.SAINT_NONE,*/

	// Lock for trade save
	if (lockForTrade) {
		for (let i = 0; i < store.players[playerIndex].cities.length; i++) {
			for (let j = 0; j < store.players[playerIndex].cities[i].buildings.length; j++) {
				store.players[playerIndex].cities[i].buildings[j].lockedDueTrade = true
			}
		}
	}

	let temp = []
	temp.push(JSON.parse(JSON.stringify(store.players[playerIndex].cities))) // 0
	temp.push(JSON.parse(JSON.stringify(store.players[playerIndex].availableBuildings))) // 1
	temp.push(JSON.parse(JSON.stringify(store.players[playerIndex].availableHouses))) // 2
	temp.push(JSON.parse(JSON.stringify(store.players[playerIndex].availableMen))) // 3
	temp.push(JSON.parse(JSON.stringify(store.players[playerIndex].availableResources))) // 4
	temp.push(JSON.parse(JSON.stringify(store.players[playerIndex].saint))) // 5
	temp.push(JSON.parse(JSON.stringify(store.players[playerIndex].cityHistory))) // 6
	temp.push(JSON.parse(JSON.stringify(store.players[playerIndex].cathedralStatus))) // 7
	temp.push(JSON.parse(JSON.stringify(store.players[playerIndex].promises))) // 8

	let step1 = JSON.stringify(temp)
	// eslint-disable-next-line no-undef
	let step2 = pako.gzip(step1)
	let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

	// Unlock to carry on playing
	if (lockForTrade) {
		for (let i = 0; i < store.players[playerIndex].cities.length; i++) {
			for (let j = 0; j < store.players[playerIndex].cities[i].buildings.length; j++) {
				delete store.players[playerIndex].cities[i].buildings[j].lockedDueTrade
			}
		}
	}

	return base64Data
}

export function simpleImportPlayerCityTurnData(playerIndex, content) {
	const store = useModelStore()
	// Remove ghosts
	let ghostPaths = document.getElementsByClassName("ghostPath")
	for (let i = 0; i < ghostPaths.length; i++) ghostPaths[i].style.display = "none"
	store.topMenuViews.currentGhostIndex = -1

	if (content === "" || content == undefined) return

	/*let compressedData = Uint8Array.from(atob(content), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	let inputContent = JSON.parse(decompressedData)*/
	let inputContent = JSON.parse(
		// eslint-disable-next-line no-undef
		pako.ungzip(
			Uint8Array.from(atob(content), (c) => c.charCodeAt(0)),
			{ to: "string" }
		)
	)
	let player = store.players[playerIndex]

	Object.assign(player.cities, inputContent[0])
	Object.assign(player.availableBuildings, inputContent[1])
	Object.assign(player.availableHouses, inputContent[2])
	player.availableMen = inputContent[3]
	Object.assign(player.availableResources, inputContent[4])
	player.saint = inputContent[5]
	Object.assign(player.cityHistory, inputContent[6])
	player.cathedralStatus = inputContent[7]
	Object.assign(player.promises, inputContent[8])
}

export function simpleExportWholeModel() {
	const store = useModelStore()

	let temp = []

	// 0
	//temp.push(JSON.parse(JSON.stringify(store.players)))
	temp.push(deepClone(store.players))

	// 1
	temp.push(JSON.parse(JSON.stringify(store.mapData)))
	//temp.push(deepClone(store.mapData))

	// 2
	//temp.push(JSON.parse(JSON.stringify(store.gameflow)))
	temp.push(deepClone(store.gameflow))

	// 3
	//temp.push(JSON.parse(JSON.stringify(store.context)))
	temp.push(deepClone(store.context))

	// 4
	//temp.push(JSON.parse(JSON.stringify(store.history)))
	temp.push(deepClone(store.history))

	// 5
	temp.push(store.famineLevel)

	/*var step1 = JSON.stringify(temp)
	var step2 = LZString.compressToEncodedURIComponent(step1)*/
	let step1 = JSON.stringify(temp)
	// eslint-disable-next-line no-undef
	let step2 = pako.gzip(step1)
	let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

	return base64Data

	//return step2
}

export function compressData(data) {
	let step1 = JSON.stringify(data)
	// eslint-disable-next-line no-undef
	let step2 = pako.gzip(step1)
	let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

	return base64Data
}

export function decompressData(input) {
	let compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	return JSON.parse(decompressedData)
}

export async function simpleImportWholeModel(input) {
	const store = useModelStore()
	// Remove ghosts
	let ghostPaths = document.getElementsByClassName("ghostPath")
	for (let i = 0; i < ghostPaths.length; i++) ghostPaths[i].style.display = "none"
	store.topMenuViews.currentGhostIndex = -1

	if (input === "" || input == undefined) return

	/* input =
'NrDeCIEsBNwLgAwBpwDsCGBbApvcAlAewGdjwUBjQgG0IFcAneARhWKodzmYDoBWFOgoAXSIVQBZdAwDW2BmTgAmZOFE4AysPHZFq6pFS782TOkOGA5vCUDwAIzrFdLFNlTQAUnVQixqRWAVJGYAFgBdNw8AGUMXOGAAZmRmADZI8AAHanQAT3lvX1FxQOCwpABOJCUkAA5wgF8kCBhXNCwucE9CbFzycCpaRnhVdkJOG35BP3EpWXlFYLVITW0jPRQDdZMzC1RrZTtHZ0VWcHcvHxmA+GAMi9j124zsvIKr4puExsiQZGAALSsIFIEEghCRCFIYCsQHA+Gg1hQqFBaFgpFIZBAyG-RJohHozE46GhfGIzHk7FE6ECOGUhHI36pMmE8HE4AAdhZGKxzHZtW5FPR7KqdN5Qr51Jh-1ZBMlKOYsNl5MZ0OYNTp4Pp7OYeM1GOFUvKwGQ4sNkphtNN9MRkQtaTJ4t5Oq5+ptqphArdhI9zFFWoD8t+wRNEu1IWDsOtsrtwY1Pol7KUeuVbKlSlJ3oZSdpqfhSeZYpVtvTroTzvTXoThpRSn9DPDKOSgp97MSSobFab8blKrbKd7aabmbz1KbucHSJxkWEDDo2CQAkV0Lu0N+67Xm9X24tG+3e739oPW+PMNPp93J6v++v59v95vj7vT4fz-XkQgW2wAFEAB6ZdAAn8W5RynFAjAAdwAIScEZBGgaAAAV0FIdxLAWW4DUnDJ0AQmDIGoaArECUDqXAdBqGEeQABUVi4VQADcGEITBMLDGNKAAC0A9CtGkYREJyfImG4JokmQZtkl+FI1WkiNYyAA'
*/ // Remove ghosts

	/*var step1 = LZString.decompressFromEncodedURIComponent(input)
	var inputModel = JSON.parse(step1)*/

	let compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	let inputModel = JSON.parse(decompressedData)

	// 0 players
	store.players.splice(0)
	Object.assign(store.players, inputModel[0])

	// 1
	//store.mapData = {};
	Object.assign(store.mapData, inputModel[1])

	// 2
	//store.gameflow = {};
	Object.assign(store.gameflow, inputModel[2])

	store.clearVars()

	// 3
	//store.context = {};
	Object.assign(store.context, inputModel[3])

	// 4
	store.history.splice(0)
	Object.assign(store.history, inputModel[4])

	// 5
	store.famineLevel = inputModel[5]

	map.calculateCanvasSize()
}

export function exportModel(includeContext, consolelog) {
	const store = useModelStore()

	let temp = []

	// 0 - mapData - MAP HAS TO GO FIRST, SO HEX DATA IS RECONSTRUCTED
	/*		hexes: results, NOT STORED = regenerated on the fly
		seed: seed,
		grass: [],
		pollution: [],
		explorers: explorerTiles,
		availableExplorerResources: [],
		mountainRangeSeedStone: [],
		mountainRangeSeedGold: [],
		*/
	temp.push([
		JSON.parse(JSON.stringify(store.mapData.seed)), // 0
		JSON.parse(JSON.stringify(store.mapData.grass)), // 1
		JSON.parse(JSON.stringify(store.mapData.pollution)), // 2
		JSON.parse(JSON.stringify(store.mapData.explorers)), // 3
		JSON.parse(JSON.stringify(store.mapData.availableExplorerResources)), // 4
		JSON.parse(JSON.stringify(store.mapData.mountainRangeSeedStone)), // 5
		JSON.parse(JSON.stringify(store.mapData.mountainRangeSeedGold)), // 6
	])

	// 1 players
	let tempPlayers = []
	for (let i = 0; i < store.players.length; i++) {
		let tempCountrysideBuildings = []
		for (let j = 0; j < store.players[i].countrysideBuildings.length; j++) {
			let tempCountrysideBuildingsResources = []
			for (let k = 0; k < store.players[i].countrysideBuildings[j].resources.length; k++) {
				tempCountrysideBuildingsResources.push([
					store.players[i].countrysideBuildings[j].resources[k].resType,
					store.players[i].countrysideBuildings[j].resources[k].hexId,
					//store.players[i].countrysideBuildings[j].resources[k].hex,
					//store.players[i].countrysideBuildings[j].resources[k].icon,
				])
			}

			if (store.players[i].countrysideBuildings[j].refHexId) {
				tempCountrysideBuildings.push([
					store.players[i].countrysideBuildings[j].type,
					store.players[i].countrysideBuildings[j].hexId,
					JSON.parse(JSON.stringify(tempCountrysideBuildingsResources)),
					store.players[i].countrysideBuildings[j].refHexId,
					//store.players[i].countrysideBuildings[j].hex,
					//store.players[i].countrysideBuildings[j].harvestCount = 0,
					//store.players[i].countrysideBuildings[j].canHarvest = true,
				])
			} else {
				tempCountrysideBuildings.push([
					store.players[i].countrysideBuildings[j].type,
					store.players[i].countrysideBuildings[j].hexId,
					JSON.parse(JSON.stringify(tempCountrysideBuildingsResources)),
					//store.players[i].countrysideBuildings[j].hex,
					//store.players[i].countrysideBuildings[j].harvestCount = 0,
					//store.players[i].countrysideBuildings[j].canHarvest = true,
				])
			}
		}

		let tempCities = []
		for (let j = 0; j < store.players[i].cities.length; j++) {
			let tempCitiesBuildings = []
			for (let k = 0; k < store.players[i].cities[j].buildings.length; k++) {
				if (store.players[i].cities[j].buildings[k].bldgNum !== rf.BLDG_STORAGE && (store.players[i].cities[j].buildings[k].rotation || store.players[i].cities[j].buildings[k].rotation === 0)) {
					if (rf.BLDG_ROTATABLE.includes(store.players[i].cities[j].buildings[k].bldgNum)) {
						tempCitiesBuildings.push([store.players[i].cities[j].buildings[k].index, store.players[i].cities[j].buildings[k].bldgNum, store.players[i].cities[j].buildings[k].manned ? 1 : 0, store.players[i].cities[j].buildings[k].rotation])
					} else {
						tempCitiesBuildings.push([store.players[i].cities[j].buildings[k].index, store.players[i].cities[j].buildings[k].bldgNum, store.players[i].cities[j].buildings[k].manned ? 1 : 0])
					}
				} else {
					// Else must be storage
					tempCitiesBuildings.push([store.players[i].cities[j].buildings[k].index, store.players[i].cities[j].buildings[k].bldgNum, store.players[i].cities[j].buildings[k].manned ? 1 : 0, [store.players[i].cities[j].buildings[k].width, store.players[i].cities[j].buildings[k].height]])
				}
			}

			tempCities.push([
				//store.players[i].cities[j].size,
				map.getIDfromHex(store.players[i].cities[j].hex), // 0
				JSON.parse(JSON.stringify(store.players[i].cities[j].graves)), // 1 - simple array of indexes
				JSON.parse(JSON.stringify(tempCitiesBuildings)), // 2 - [index, bldgNum, rotation OR [w/h], manned]
				//JSON.parse(JSON.stringify(store.players[i].cities[j].coords)),
			])
		}

		tempPlayers.push([
			store.players[i].name, // 0
			store.players[i].displayName, // 1
			store.players[i].colour, // 2
			store.players[i].saint, // 3
			store.players[i].availableMen, // 4
			store.players[i].cathedralStatus, // ? 1 : 0, // 5
			//store.players[i].selectedForZOCline, //

			JSON.parse(JSON.stringify(store.players[i].availableResources)), // 6 - DONE
			JSON.parse(JSON.stringify(tempCountrysideBuildings)), // 7

			JSON.parse(JSON.stringify(tempCities)), // 8
			JSON.parse(JSON.stringify(store.players[i].promises)), // 9
			//JSON.parse(JSON.stringify(store.players[i].availableBuildings)), //
			//JSON.parse(JSON.stringify(store.players[i].availableHouses)), //
			//JSON.parse(JSON.stringify(store.players[i].requiredRebuilds)), //
		])
	}

	temp.push(tempPlayers) // 0

	// 2 - gameflow
	temp.push([
		store.gameflow.turn,
		store.gameflow.phase,
		JSON.parse(JSON.stringify(store.gameflow.turnOrder)),
		JSON.parse(JSON.stringify(store.gameflow.fullTurnOrder)),
		//subPhase: rf.SUB_PHASE_NONE,
		//action: rf.ACT_NONE,
	])

	// 3 - history - already compressed
	temp.push(JSON.parse(JSON.stringify(store.history)))
	//temp.push(deepClone(store.history))

	// 4 - famine level
	temp.push(store.famineLevel)

	// 5 - context
	//temp.push(JSON.parse(JSON.stringify(store.context)))
	if (includeContext) temp.push(deepClone(store.context))

	let step1 = JSON.stringify(temp)

	if (consolelog) console.log(step1)
	// eslint-disable-next-line no-undef
	let step2 = pako.gzip(step1)
	let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

	return base64Data
}

function recreateCities(playerIndex, data) {
	let result = []
	for (let i = 0; i < data.length; i++) {
		result.push({})
		// size
		if (i === 0) result[i].size = 7
		else result[i].size = 6
		// hex
		result[i].hex = map.getHexDataFromID(data[i][0]).hex
		result[i].graves = JSON.parse(JSON.stringify(data[i][1]))
		// buildings
		result[i].buildings = []
		for (let j = 0; j < data[i][2].length; j++) {
			// If storage, [3] has length
			if (data[i][2][j].length === 4 && data[i][2][j][3].length === 2) {
				result[i].buildings.push({
					index: data[i][2][j][0],
					bldgNum: data[i][2][j][1],
					manned: data[i][2][j][2] === 1 ? true : false,
					width: data[i][2][j][3][0],
					height: data[i][2][j][3][1],
					rotation: 0, // this might be needed?
				})
			}
			// if rotatble, whole length is 4
			else if (data[i][2][j].length === 4) {
				result[i].buildings.push({
					index: data[i][2][j][0],
					bldgNum: data[i][2][j][1],
					manned: data[i][2][j][2] === 1 ? true : false,
					rotation: data[i][2][j][3],
				})
			}
			// else cannot be rotated
			else {
				result[i].buildings.push({
					index: data[i][2][j][0],
					bldgNum: data[i][2][j][1],
					manned: data[i][2][j][2] === 1 ? true : false,
					rotation: 0,
				})
			}
		}

		// Co-ords - recreate from buildings LATER
		//result[i].coords = JSON.parse(JSON.stringify(data[i][3]))
		if (i == 0) result[i].coords = new Array(7 * 7).fill(rf.BLDG_NONE_SQ)
		else result[i].coords = new Array(6 * 6).fill(rf.BLDG_NONE_SQ)
	}

	return result
}

function recreateCountrysideBuildings(data) {
	let result = []
	for (let i = 0; i < data.length; i++) {
		result.push({
			type: data[i][0],
			hexId: data[i][1],

			// UNSAVED DATA:
			hex: map.getHexDataFromID(data[i][1]).hex,

			// FIXED DATA
			harvestCount: 0,
			canHarvest: true,
		})
		let tempCountrysideBuildingsResources = []
		for (let j = 0; j < data[i][2].length; j++) {
			tempCountrysideBuildingsResources.push({
				resType: data[i][2][j][0],
				hexId: data[i][2][j][1],

				// UNSAVED DATA
				hex: map.getHexDataFromID(data[i][2][j][1]).hex,
				icon: "res_" + String(data[i][2][j][0]),
			})
		}

		result[i].resources = JSON.parse(JSON.stringify(tempCountrysideBuildingsResources))
		if (data[i].length === 4) result[i].refHexId = data[i][3]
	}

	return result
}

function recreateGrass() {
	const store = useModelStore()

	for (let i = 0; i < store.mapData.grass.length; i++) {
		map.getHexDataFromID(store.mapData.grass[i][0]).terrainType = rf.TERR_GRASS
	}
}

function grassInitialCityWater() {
	const store = useModelStore()

	// Grass the water under initial cities. Can add any city, as subsequent won't have water anyway.
	let cityCentreHexes = country.getCityTiles()
	let cityIDs = []
	for (let i=0; i<cityCentreHexes.length; i++) {
		cityIDs.push(map.getIDfromHex(cityCentreHexes[i]))
	}
	//let neighbourIDs = []
	for (let i = cityIDs.length-1; i >= 0; i--) {
		
		cityIDs = cityIDs.concat(store.mapNeighbours[cityIDs[i]])
	}

	for (let i = 0; i < cityIDs.length; i++) {
		let hexData = map.getHexDataFromID(cityIDs[i])
		if (hexData.terrainType === rf.TERR_WATER) hexData.terrainType = rf.TERR_GRASS
	}
}

export async function importModel(input, includeContext, keepNeighbours) {
	// Remove ghosts
	const store = useModelStore()
	let ghostDivs = document.getElementsByClassName("ghostDiv")
	let ghostImgs = document.getElementsByClassName("ghostImg")
	for (let i = 0; i < ghostDivs.length; i++) ghostDivs[i].style.display = "none"
	for (let i = 0; i < ghostImgs.length; i++) ghostImgs[i].style.display = "none"
	store.topMenuViews.currentGhostIndex = -1

	if (input === "" || input == undefined) return

	let compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	let inputModel = JSON.parse(decompressedData)

	// 0 - map
	/*	temp.push([
		JSON.parse(JSON.stringify(store.mapData.seed)), // 0
		JSON.parse(JSON.stringify(store.mapData.grass)), // 1
		JSON.parse(JSON.stringify(store.mapData.pollution)), // 2
		JSON.parse(JSON.stringify(store.mapData.explorers)), // 3
		JSON.parse(JSON.stringify(store.mapData.availableExplorerResources)), // 4
		JSON.parse(JSON.stringify(store.mapData.mountainRangeSeedStone)), // 5
		JSON.parse(JSON.stringify(store.mapData.mountainRangeSeedGold)), // 6
	])*/
	//store.mapData = {};

	// first, recreate the map
	map.generateMapFromSeed(inputModel[0][0])
	store.mapData.grass = inputModel[0][1] // 1
	store.mapData.pollution = inputModel[0][2] // 2
	store.mapData.explorers = inputModel[0][3] // 3
	store.mapData.availableExplorerResources = inputModel[0][4] // 4
	store.mapData.mountainRangeSeedStone = inputModel[0][5] // 5
	store.mapData.mountainRangeSeedGold = inputModel[0][6] // 6

	recreateGrass()
	map.calculateCanvasSize()
	// For some reason, doing this during replay results in LAAAAG. Not sure why
	if (!keepNeighbours) map.setNeighbours()

	// Re-seed mountains
	for (let i = 0; i < store.mapData.mountainRangeSeedStone.length; i++) country.setMountainType(map.getHexDataFromID(store.mapData.mountainRangeSeedStone[i]), rf.RES_STONE)
	for (let i = 0; i < store.mapData.mountainRangeSeedGold.length; i++) country.setMountainType(map.getHexDataFromID(store.mapData.mountainRangeSeedGold[i]), rf.RES_GOLD)

	// 1 - players
	store.players.splice(0)
	for (let i = 0; i < inputModel[1].length; i++) {
		store.players.push({
			name: inputModel[1][i][0],
			displayName: inputModel[1][i][1],
			colour: inputModel[1][i][2],
			saint: inputModel[1][i][3],
			availableMen: inputModel[1][i][4],
			cathedralStatus: inputModel[1][i][5], //=== 1 ? true : false,

			availableResources: JSON.parse(JSON.stringify(inputModel[1][i][6])),
			promises: JSON.parse(JSON.stringify(inputModel[1][i][9])),
			//availableBuildings: JSON.parse(JSON.stringify(inputModel[0][i][7])),
			//availableHouses: JSON.parse(JSON.stringify(inputModel[0][i][8])),
		})

		store.players[i].countrysideBuildings = JSON.parse(JSON.stringify(recreateCountrysideBuildings(inputModel[1][i][7])))
		store.players[i].cities = JSON.parse(JSON.stringify(recreateCities(i, inputModel[1][i][8])))

		// Set CITY COORDS - REMEMBER: This "index" is the TopLeftFixed, but the get/set function wants the "click" index
		for (let j = 0; j < store.players[i].cities.length; j++) {
			// Buildings
			for (let k = 0; k < store.players[i].cities[j].buildings.length; k++) {
				let citySize = 6
				if (j === 0) citySize = 7
				let topLeftFixed = store.players[i].cities[j].buildings[k].index
				let rotation = store.players[i].cities[j].buildings[k].rotation
				let bldgNum = store.players[i].cities[j].buildings[k].bldgNum
				let bldgData

				// If not house, get the data
				if (bldgNum < 20 && bldgNum !== rf.BLDG_STORAGE) {
					bldgData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgNum]]
				} else if (bldgNum === rf.BLDG_STORAGE) {
					bldgData = rf.BLDG_DATA[rf.BLDG_ARRAY[bldgNum]]
					bldgData.width = rotation[0]
					bldgData.height = rotation[1]
					rotation = 0
				} else bldgData = rf.BLDG_DATA["HOUSE"]

				let index = topLeftFixed

				if (rotation === 0) {
					index = topLeftFixed + bldgData.path[0]
				} else if (rotation === 1) {
					index = topLeftFixed + bldgData.path[0] * citySize + (bldgData.height - 1)
				} else if (rotation === 2) {
					index = topLeftFixed - bldgData.path[0] + (bldgData.height - 1) * citySize + (bldgData.width - 1)
				} else if (rotation === 3) {
					index = topLeftFixed - bldgData.path[0] * citySize + (bldgData.width - 1) * citySize
				}
				if (store.players[i].cities[j].buildings[k].bldgNum === rf.BLDG_STORAGE) city.getOrSetAllIndexesOfBuilding(i, j, topLeftFixed, bldgNum, [store.players[i].cities[j].buildings[k].width, store.players[i].cities[j].buildings[k].height], true, true)
				else city.getOrSetAllIndexesOfBuilding(i, j, index, bldgNum, rotation, true, true)
			}
			// Graves
			// Buildings
			for (let k = 0; k < store.players[i].cities[j].graves.length; k++) {
				city.addGraveToCity_core(i, j, store.players[i].cities[j].graves[k], true)
			}
		}

		// UNSAVED VARS
		store.players[i].availableBuildings = [...rf.SINGLE_CITY_BUILDINGS]
		store.players[i].availableHouses = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40]
		store.players[i].requiredRebuilds = []
		store.players[i].cityHistory = {
			//built: [], // Use flags? Need: bldgNum, cityIndex, index, rotation, payment?
			moved: [], // Use flags? Need: bldgNum, newPos-> cityIndex, index, rotation, payment?
			//manned: [],// Use flags? Need: bldgNum, (if not unique then also: cityIndex, index),
			boardTrades: [], // IN: sets of [out, out, in]
			gravesRemoved: [], // IN: [][][][], up to 4 arrays, 1 per city, with grave indexes in each,
			saintChosen: rf.SAINT_NONE, // IN: just a saint_ID
			razedCathedral: 0, // IN: true/false
		}
		store.players[i].selectedForZOCline = false
		store.players[i].preMoves = [] // create here, fill later

		// Now remove already built houses / buildings from the options.
		for (let j = 0; j < store.players[i].cities.length; j++) {
			for (let k = 0; k < store.players[i].cities[j].buildings.length; k++) {
				if (store.players[i].cities[j].buildings[k].bldgNum >= 20) store.players[i].availableHouses.splice(store.players[i].availableHouses.indexOf(store.players[i].cities[j].buildings[k].bldgNum), 1)
				else if (store.players[i].availableBuildings.includes(store.players[i].cities[j].buildings[k].bldgNum)) store.players[i].availableBuildings.splice(store.players[i].availableBuildings.indexOf(store.players[i].cities[j].buildings[k].bldgNum), 1)
			}
		}
	}

	// Now we have the players, grass over any INITIAL city water
	grassInitialCityWater()

	// 2 - gameflow
	//store.gameflow = {};
	store.gameflow.turn = inputModel[2][0]
	store.gameflow.phase = inputModel[2][1]
	store.gameflow.turnOrder = JSON.parse(JSON.stringify(inputModel[2][2]))
	store.gameflow.fullTurnOrder = JSON.parse(JSON.stringify(inputModel[2][3]))
	store.gameflow.subPhase = rf.SUB_PHASE_NONE
	store.gameflow.action = rf.ACT_NONE

	if (store.gameflow.phase === rf.PHASE_CITY_BUILDING) store.gameflow.subPhase = rf.SUB_PHASE_ADD_BUILDINGS

	// 3 - history
	//store.context = {};
	store.history.splice(0)
	store.history = JSON.parse(JSON.stringify(inputModel[3]))

	// 4 - famine level
	store.famineLevel = inputModel[4]

	// 5 - context
	if (inputModel.length == 5 && includeContext) {
		store.context.splice(0)
		store.context = JSON.parse(JSON.stringify(inputModel[5]))
	}

	store.clearVars()
}
