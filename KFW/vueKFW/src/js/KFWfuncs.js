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

import * as rf from "./KFWreference.js"
import * as model from "./KFWmodel.js"
import * as map from "./KFWmap.js"
import * as village from "./KFWvillage.js"
//import * as controller from "./KFWcontroller.js"

import { usePersonalStore } from "../stores/KFWpersonal.js"
import { useModelStore } from "../stores/KFWstore.js"

export function arraysEqual(a, b) {
	if (a === b) return true
	if (a == null || b == null) return false
	if (a.length !== b.length) return false

	for (var i = 0; i < a.length; ++i) {
		if (a[i] !== b[i]) return false
	}
	return true
}

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

// funcs.timestampToString((personal.gameCreationTimestamp + message[1]) * 1000)
export function chatTimestampToString(message1, idx) {
	const store = useModelStore()
	const personal = usePersonalStore()
	let timestamp = personal.gameCreationTimestamp // + message1 //* 1000)
	for (let i = idx; i < store.chatData.length; i++) {
		if (i >= 0) timestamp += store.chatData[i][1] // * 1000
	}
	timestamp = timestamp * 1000

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

	chatArray.push(["WelcomeBot", 0, "Welcome to Keyflower Online!SNLBSNLBIf you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!"])

	return chatArray
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

export function importCompressedGameData13(gameData1, gameData3, forGameOver) {
	const store = useModelStore()
	const personal = usePersonalStore()

	window.initData.gameData1 = gameData1
	window.initData.gameData3 = gameData3

	let data1Uncompressed = decompressData(gameData1)
	let data3Uncompressed = decompressData(gameData3)
	if (personal.pov >= 0 || personal.adminDataInspection) {
		if (personal.trainingGame || personal.adminDataInspection || forGameOver) {
			for (let i = 0; i < data1Uncompressed.length; i++) {
				store.players[i].hiddenMeeples = data1Uncompressed[i][0]
				store.players[i].hiddenSkillTiles = data1Uncompressed[i][1]
				store.players[i].hiddenHistory = data1Uncompressed[i][2]
			}
			store.availableMeeples = data3Uncompressed[0]
			store.availableSkills = data3Uncompressed[1]
			store.availableMeeplesCount = 0
			store.availableSkillsCount = 0
		} else if (personal.pov >= 0) {
			store.players[personal.pov].hiddenMeeples = data1Uncompressed[0]
			store.players[personal.pov].hiddenSkillTiles = data1Uncompressed[1]
			store.players[personal.pov].hiddenHistory = data1Uncompressed[2]
			store.availableMeeples = [0, 0, 0, 0]
			store.availableSkills = [0, 0, 0]
			store.availableMeeplesCount = data3Uncompressed[0]
			store.availableSkillsCount = data3Uncompressed[1]
		}
	}
	// Otherwise, you're not involved
	else if (personal.pov < 0) {
		store.availableMeeples = [0, 0, 0, 0]
		store.availableSkills = [0, 0, 0]
		store.availableMeeplesCount = data3Uncompressed[0]
		store.availableSkillsCount = data3Uncompressed[1]
	}
}

export function exportPlayerVIllageMoveData(playerIndex) {
	const store = useModelStore()
	let res = []
	for (let i = 0; i < store.players[playerIndex].villageTiles.length; i++) {
		let tile = store.players[playerIndex].villageTiles[i]
		let newEntry = []
		newEntry.push(tile.id)
		newEntry.push(tile.upgraded)
		newEntry.push([...tile.resources])
		newEntry.push(tile.rotation)
		newEntry.push([...tile.sides])
		newEntry.push([...tile.coord])
		if (store.useMerchantsExpansion) {
			newEntry.push(tile.extension)
			if (i === 0) newEntry.push(tile.cabins)
		}
		res.push(newEntry)
	}
	return res
}

export function importPlayerVIllageMoveData(playerIndex, moveDataCompressed) {
	const store = useModelStore()
	if (moveDataCompressed === "") return
	let moveData = decompressData(moveDataCompressed)
	// Importing your village, so all tiles must have been placed, so remove them
	store.players[playerIndex].pendingVillageTiles.splice(0)
	store.players[playerIndex].villageTiles.splice(0)
	for (let i = 0; i < moveData.length; i++) {
		let tile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((t) => t.id === moveData[i][0]))) // id
		tile.upgraded = moveData[i][1]
		tile.resources = [...moveData[i][2]]
		tile.rotation = moveData[i][3]
		tile.sides = [...moveData[i][4]]
		tile.coord = [...moveData[i][5]]
		tile.cabins = 0
		tile.extension = rf.EXTENSION_NONE
		if (store.useMerchantsExpansion) {
			tile.extension = moveData[i][6]
			if (i === 0) tile.cabins = moveData[i][7]
		}
		store.players[playerIndex].villageTiles.push(tile)
	}
	map.calculateCanvasSizeForPlayerVillage(playerIndex, false)
}

export function exportContractsForFinalScoring(playerIndex) {
	const store = useModelStore()
	let res = []
	for (let i = 0; i < store.players[playerIndex].hiddenContracts.length; i++) {
		let contract = store.players[playerIndex].hiddenContracts[i]
		let contractData = []
		contractData.push(contract.id)
		contractData.push(contract.completed === true ? 1 : 0)
		if (contract.completed && !contract.fixeditems) {
			// Sort the items to match the requirements
			contract.requiredMeeples.sort((a, b) => a - b)
			contract.requiredSkillTiles.sort((a, b) => a - b)
			contract.requiredResources.sort((a, b) => a - b)
			contract.chosenMeeples.sort((a, b) => a - b)
			contract.chosenSkillTiles.sort((a, b) => a - b)
			contract.chosenResources.sort((a, b) => a - b)
			// Items could match, or be wild eg gold/boat power for res
			let completionData = []

			let copyOfReq = true
			for (let i = 0; i < contract.requiredMeeples.length; i++) {
				if (!contract.singleItemType) copyOfReq = false
				if (contract.requiredMeeples[i] !== contract.chosenMeeples[i]) copyOfReq = false
			}
			// If the set is different, or contract has multiple types, then store it
			if (!copyOfReq) completionData.push([...contract.chosenMeeples])

			copyOfReq = true
			for (let i = 0; i < contract.requiredSkillTiles.length; i++) {
				if (!contract.singleItemType) copyOfReq = false
				if (contract.requiredSkillTiles[i] !== contract.chosenSkillTiles[i]) copyOfReq = false
			}
			// If the set is different, or contract has multiple types, then store it
			if (!copyOfReq) completionData.push([...contract.chosenSkillTiles])

			copyOfReq = true
			for (let i = 0; i < contract.requiredResources.length; i++) {
				if (!contract.singleItemType) copyOfReq = false
				if (contract.requiredResources[i] !== contract.chosenResources[i]) copyOfReq = false
			}
			// If the set is different, or contract has multiple types, then store it
			if (!copyOfReq) completionData.push([...contract.chosenResources])

			if (completionData.length > 0) contractData.push([...completionData])
		}
		res.push([...contractData])
	}
	return res
}

export function importContractsForFinalScoring(playerIndex, inputData) {
	const store = useModelStore()
	let newContracts = []
	for (let i = 0; i < inputData.length; i++) {
		let newContract_id = inputData[i][0]
		let newContractCompleted = inputData[i][1] === 1

		let newContract = JSON.parse(JSON.stringify(rf.ALL_CONTRACTS.find((c) => c.id === newContract_id)))
		newContract.completed = newContractCompleted
		newContract.visible = 1
		if (newContract.completed && inputData[i].length === 2) {
			// It is complete, but no data is present. So must be a direct copy of the reqs
			newContract.chosenMeeples = [...newContract.requiredMeeples]
			newContract.chosenSkillTiles = [...newContract.requiredSkillTiles]
			newContract.chosenResources = [...newContract.requiredResources]
		} else if (newContract.completed) {
			// Contract is complete with custom items
			let completedSets = inputData[i][2]

			let IMPORT_IDX = 0
			if (newContract.requiredMeeples.length > 0) {
				newContract.chosenMeeples = [...completedSets[IMPORT_IDX]]
				IMPORT_IDX++
			}
			if (newContract.requiredSkillTiles.length > 0) {
				newContract.chosenSkillTiles = [...completedSets[IMPORT_IDX]]
				IMPORT_IDX++
			}

			if (newContract.requiredResources.length > 0) {
				newContract.chosenResources = [...completedSets[IMPORT_IDX]]
				IMPORT_IDX++
			}
		}

		newContracts.push(newContract)
	}

	store.players[playerIndex].hiddenContracts.splice(0)
	store.players[playerIndex].hiddenContracts = JSON.parse(JSON.stringify(newContracts))
}

export function exportPlayerFinalScoringMoveData(playerIndex) {
	const store = useModelStore()

	let res = []
	let villageData = village.exportVillageEndGame(playerIndex)

	let contractData = exportContractsForFinalScoring(playerIndex)

	if (store.useMerchantsExpansion) res = [villageData, store.players[playerIndex].finalScore, contractData]
	else res = [villageData, store.players[playerIndex].finalScore]

	return res
}

export function importPlayerFinalScoringMoveData(playerIndex, moveData) {
	const store = useModelStore()
	let playeObj = store.players[playerIndex]
	village.importVillageEndGame(playerIndex, moveData[0])
	playeObj.finalScore = moveData[1]
	if (store.useMerchantsExpansion) importContractsForFinalScoring(playerIndex, moveData[2])

	model.scoreAutoProcessingTilesAndMoveResources(playerIndex)
	store.context.action = rf.ACT_CHOOSE_SCORING_AREAS
}

export function simpleExportWholeKFWmodel() {
	const store = useModelStore()

	let temp = []
	// 0 - gameflow
	temp.push(JSON.parse(JSON.stringify(store.gameflow)))

	// 1 - players
	temp.push(JSON.parse(JSON.stringify(store.players)))

	// 2 - history
	temp.push(JSON.parse(JSON.stringify(store.history)))

	// 3 - availableResources
	temp.push(JSON.parse(JSON.stringify(store.availableResources)))

	// 4 - availableBoatTiles
	temp.push(JSON.parse(JSON.stringify(store.availableBoatTiles)))

	// 5 - availableTurnOrderTiles
	temp.push(JSON.parse(JSON.stringify(store.availableTurnOrderTiles)))

	// 6 - availableTiles
	temp.push(JSON.parse(JSON.stringify(store.availableTiles)))

	// 7 - availableMeeples
	temp.push(JSON.parse(JSON.stringify(store.availableMeeples)))

	// 8 - availableGreenMeeples
	temp.push(store.availableGreenMeeples)

	// 9 - availableSkills
	temp.push(JSON.parse(JSON.stringify(store.availableSkills)))

	// 10 - ongoingVars
	temp.push(JSON.parse(JSON.stringify(store.ongoingVars)))

	// 11 - hiddenContracts
	temp.push(JSON.parse(JSON.stringify(store.hiddenContracts)))

	// 12 - visibleContracts
	temp.push(JSON.parse(JSON.stringify(store.visibleContracts)))

	// 13 - availableExtensions
	temp.push(JSON.parse(JSON.stringify(store.availableExtensions)))

	// 14 - context
	temp.push(JSON.parse(JSON.stringify(store.context)))

	let step1 = JSON.stringify(temp)
	// eslint-disable-next-line no-undef
	let step2 = pako.gzip(step1)
	let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

	return base64Data
}

export async function simpleImportWholeKFWmodel(input, importContext) {
	const store = useModelStore()

	if (input === "" || input == undefined) return

	/* input =
'NrDeCIEsBNwLgAwBpwDsCGBbApvcAlAewGdjwUBjQgG0IFcAneARhWKodzmYDoBWFOgoAXSIVQBZdAwDW2BmTgAmZOFE4AysPHZFq6pFS782TOkOGA5vCUDwAIzrFdLFNlTQAUnVQixqRWAVJGYAFgBdNw8AGUMXOGAAZmRmADZI8AAHanQAT3lvX1FxQOCwpABOJCUkAA5wgF8kCBhXNCwucE9CbFzycCpaRnhVdkJOG35BP3EpWXlFYLVITW0jPRQDdZMzC1RrZTtHZ0VWcHcvHxmA+GAMi9j124zsvIKr4puExsiQZGAALSsIFIEEghCRCFIYCsQHA+Gg1hQqFBaFgpFIZBAyG-RJohHozE46GhfGIzHk7FE6ECOGUhHI36pMmE8HE4AAdhZGKxzHZtW5FPR7KqdN5Qr51Jh-1ZBMlKOYsNl5MZ0OYNTp4Pp7OYeM1GOFUvKwGQ4sNkphtNN9MRkQtaTJ4t5Oq5+ptqphArdhI9zFFWoD8t+wRNEu1IWDsOtsrtwY1Pol7KUeuVbKlSlJ3oZSdpqfhSeZYpVtvTroTzvTXoThpRSn9DPDKOSgp97MSSobFab8blKrbKd7aabmbz1KbucHSJxkWEDDo2CQAkV0Lu0N+67Xm9X24tG+3e739oPW+PMNPp93J6v++v59v95vj7vT4fz-XkQgW2wAFEAB6ZdAAn8W5RynFAjAAdwAIScEZBGgaAAAV0FIdxLAWW4DUnDJ0AQmDIGoaArECUDqXAdBqGEeQABUVi4VQADcGEITBMLDGNKAAC0A9CtGkYREJyfImG4JokmQZtkl+FI1WkiNYyAA'
*/

	let compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	let inputModel = JSON.parse(decompressedData)

	// 0 - gameflow
	Object.assign(store.gameflow, inputModel[0])

	// 1 - players
	store.players.splice(0)
	Object.assign(store.players, inputModel[1])

	// TODO remove this
	for (let i = 0; i < store.players.length; i++) {
		if (!store.players[i].knownHiddenMeeples) {
			store.players[i].knownHiddenMeeples = [0, 0, 0, 0, 8] // NB the last entries here are the unknown incomes
			store.players[i].knownHiddenSkillTiles = [0, 0, 0, 0]
		}
	}

	// 2 - history
	store.history.splice(0)
	Object.assign(store.history, inputModel[2])
	//store.history.splice(0, store.history.length, ...inputModel[2]);
	//Vue.set(store, 'history', [...inputModel[2]]); // Using Vue.set to make Vue aware of the change

	// OR you can directly reassign the entire array
	//store.history = [...inputModel[2]]; // This will also trigger reactivity

	// 3 - availableResources
	store.availableResources.splice(0)
	Object.assign(store.availableResources, inputModel[3])

	// 4 - availableBoatTiles
	store.availableBoatTiles.splice(0)
	Object.assign(store.availableBoatTiles, inputModel[4])

	// 5 - availableTurnOrderTiles
	store.availableTurnOrderTiles.splice(0)
	Object.assign(store.availableTurnOrderTiles, inputModel[5])

	// 6 - availableTiles
	store.availableTiles.splice(0)
	Object.assign(store.availableTiles, inputModel[6])

	// 7 - availableMeeples
	store.availableMeeples.splice(0)
	Object.assign(store.availableMeeples, inputModel[7])

	// 8 - availableGreenMeeples
	store.availableGreenMeeples = inputModel[8]

	// 9 - availableSkills
	store.availableSkills.splice(0)
	Object.assign(store.availableSkills, inputModel[9])

	// 10 - ongoingVars
	Object.assign(store.ongoingVars, inputModel[10])

	// 11 - hiddencontracts
	//Object.assign(store.hiddenContracts, inputModel[11])
	store.hiddenContracts = [...inputModel[11]]

	// 12 - visiblecontracts
	//Object.assign(store.visibleContracts, inputModel[12])
	store.visibleContracts = [...inputModel[12]]

	// 13 - availableExtensions
	store.availableExtensions.splice(0)
	Object.assign(store.availableExtensions, inputModel[13])

	store.clearContext()
	store.context.localEndTurnActions.splice(0)
	store.context.endTurnActions.splice(0)

	// 14 - context
	if (importContext) Object.assign(store.context, inputModel[14])
}

export function exportKFWmodel(includeContext = false) {
	const store = useModelStore()
	let temp = []

	// 0 - gameflow - THIS NEEDS TO BE FIRST TO CHECK FOR END GAME LOADING
	let tempGameflow = []
	tempGameflow.push(store.gameflow.turn) // 0
	//if (!gameOver) {
	tempGameflow.push(JSON.parse(JSON.stringify(store.gameflow.fullTurnOrder))) // 1
	tempGameflow.push(JSON.parse(JSON.stringify(store.gameflow.turnOrder))) // 2
	tempGameflow.push(store.gameflow.phase) // 3
	tempGameflow.push(store.gameflow.season) // 4
	if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) tempGameflow.push(JSON.parse(JSON.stringify(store.gameflow.passedPlayerIndexes)))
	//}
	temp.push(JSON.parse(JSON.stringify(tempGameflow)))
	// 1 - Players
	let tempPlayers = []
	for (let i = 0; i < store.players.length; i++) {
		let tempPlayer = []
		// 0 - name /  display name
		if (store.players[i].name === store.players[i].displayName) tempPlayer.push([store.players[i].name])
		else tempPlayer.push([store.players[i].name, store.players[i].displayName])
		// 1 - colour
		tempPlayer.push(store.players[i].colour)
		// 2 - village Tiles
		tempPlayer.push(JSON.parse(JSON.stringify(village.exportVillageMidGame(i))))

		// 3 - hasPurpleMeeple
		tempPlayer.push(store.players[i].hasPurpleMeeple ? 1 : 0) // 3

		// pendingVillageTiles: [], // tile objects // 4
		let pendingVillageTilesArr = []
		for (let j = 0; j < store.players[i].pendingVillageTiles.length; j++) pendingVillageTilesArr.push(store.players[i].pendingVillageTiles[j].tileID[store.players[i].pendingVillageTiles[j].upgraded])
		tempPlayer.push(JSON.parse(JSON.stringify(pendingVillageTilesArr)))

		// 5 - hiddenWinterTile_tileIDs
		tempPlayer.push(JSON.parse(JSON.stringify(store.players[i].hiddenWinterTile_tileIDs)))

		// passFlag 6
		if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) tempPlayer.push(store.players[i].passFlag)

		// 7 knownHiddenMeeples
		tempPlayer.push(JSON.parse(JSON.stringify(store.players[i].knownHiddenMeeples)))

		// 8 knownHiddenSkillTiles
		tempPlayer.push(JSON.parse(JSON.stringify(store.players[i].knownHiddenSkillTiles)))

		// 9 - hiddenContracts
		if (store.useMerchantsExpansion) {
			let hiddenContractsArr = []
			for (let j = 0; j < store.players[i].hiddenContracts.length; j++) {
				hiddenContractsArr.push([store.players[i].hiddenContracts[j].id, store.players[i].hiddenContracts[j].visible])
			}
			tempPlayer.push(JSON.parse(JSON.stringify(hiddenContractsArr)))
		}
		//}
		tempPlayers.push(tempPlayer)
	}
	temp.push(JSON.parse(JSON.stringify(tempPlayers)))

	// 2 - available Boat Tiles
	let tempBoatTiles = []
	for (let i = 0; i < store.availableBoatTiles.length; i++) {
		let boatTile = []
		boatTile.push(store.availableBoatTiles[i].tileID[store.availableBoatTiles[i].upgraded])
		boatTile.push([...store.availableBoatTiles[i].itemsOnBoat.meeples])
		boatTile.push([...store.availableBoatTiles[i].itemsOnBoat.skillTiles])
		if (store.useMerchantsExpansion) {
			boatTile.push([...store.availableBoatTiles[i].itemsOnBoat.resources])
			boatTile.push([...store.availableBoatTiles[i].itemsOnBoat.contracts])
			boatTile.push(store.availableBoatTiles[i].itemsOnBoat.greenMeeples)
			boatTile.push(store.availableBoatTiles[i].itemsOnBoat.cabins)
		}
		tempBoatTiles.push(boatTile)
	}
	temp.push(JSON.parse(JSON.stringify(tempBoatTiles)))

	// 3 availableTurnOrderTiles
	let tempTurnOrderTiles = []
	for (let i = 0; i < store.availableTurnOrderTiles.length; i++) {
		let tempTile = []
		tempTile.push(store.availableTurnOrderTiles[i].tileID[store.availableTurnOrderTiles[i].upgraded]) //0
		let tempBids = []
		for (let j = 0; j < store.availableTurnOrderTiles[i].bids.length; j++) {
			if (j < store.players.length) tempBids.push([...store.availableTurnOrderTiles[i].bids[j][0]])
		}
		tempTile.push(tempBids)
		if (store.availableTurnOrderTiles[i].coreMeepleColour !== rf.MEEPLE_NONE) tempTile.push(store.availableTurnOrderTiles[i].coreMeepleColour)
		tempTurnOrderTiles.push(tempTile)
	}
	temp.push(JSON.parse(JSON.stringify(tempTurnOrderTiles)))

	// 4 availableTiles
	let tempAvailableTiles = []
	for (let i = 0; i < store.availableTiles.length; i++) {
		let tempTile = []
		tempTile.push(store.availableTiles[i].tileID[store.availableTiles[i].upgraded]) //0
		let tempBids = []
		for (let j = 0; j < store.availableTiles[i].bids.length; j++) {
			if (j < store.players.length) tempBids.push([...store.availableTiles[i].bids[j][0]])
		}
		tempTile.push(tempBids)
		if (!rf.TILE_NO_ACTION.includes(store.availableTiles[i].tileID[store.availableTiles[i].upgraded])) {
			tempTile.push(JSON.parse(JSON.stringify(store.availableTiles[i].meeplesOnTile)))
		}
		if (store.availableTiles[i].coreMeepleColour !== rf.MEEPLE_NONE) tempTile.push(store.availableTiles[i].coreMeepleColour)
		tempAvailableTiles.push(tempTile)
	}
	temp.push(JSON.parse(JSON.stringify(tempAvailableTiles)))

	// 5 history
	temp.push(JSON.parse(JSON.stringify(store.history)))

	// 6 availableResources
	temp.push(JSON.parse(JSON.stringify(store.availableResources)))

	// 7 - availableGreenMeeples
	temp.push(store.availableGreenMeeples)

	// 8 - hiddenContracts
	temp.push(JSON.parse(JSON.stringify(store.hiddenContracts)))

	// 9 - visibleContracts
	temp.push(JSON.parse(JSON.stringify(store.visibleContracts)))

	// 10 - availableExtensions
	temp.push(JSON.parse(JSON.stringify(store.availableExtensions)))

	// 11 - ongoingVars
	temp.push(JSON.parse(JSON.stringify(store.ongoingVars.selectedWinterTileIDs)))

	// 12 - context?
	if (includeContext) temp.push(JSON.parse(JSON.stringify(store.context)))

	for (let i = 0; i < temp.length; i++) {
		//console.log(i)
		//console.log(JSON.stringify(temp[i]))
	}

	var step1 = JSON.stringify(temp)

	// eslint-disable-next-line no-undef
	let step2 = pako.gzip(step1)
	let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

	return base64Data
}

export async function importKFWmodel(input, includeContext) {
	const store = useModelStore()

	if (input === "" || input == undefined) return

	let compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	let inputModel = JSON.parse(decompressedData)

	/*for (let i=0;i<inputModel[1].length;i++) {
		console.log(i)
		console.log(JSON.stringify(inputModel[1][i]))
	}*/

	// 0 gameflow
	store.gameflow.turn = inputModel[0][0]
	store.gameflow.fullTurnOrder.splice(0)
	store.gameflow.fullTurnOrder.push(...inputModel[0][1])
	store.gameflow.turnOrder.splice(0)
	store.gameflow.turnOrder.push(...inputModel[0][2])
	store.gameflow.phase = inputModel[0][3]
	store.gameflow.season = inputModel[0][4]
	store.gameflow.passedPlayerIndexes = []
	if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
		store.gameflow.passedPlayerIndexes.splice(0)
		store.gameflow.passedPlayerIndexes.push(...inputModel[0][5])
	}

	// 1 - players
	store.players.splice(0)
	for (let i = 0; i < inputModel[1].length; i++) {
		let name = ""
		let displayName = ""
		if (inputModel[1][i][0].length === 1) {
			name = inputModel[1][i][0][0]
			displayName = inputModel[1][i][0][0]
		} else if (inputModel[1][i][0].length === 2) {
			name = inputModel[1][i][0][0]
			displayName = inputModel[1][i][0][1]
		}
		let colour = inputModel[1][i][1]
		let villageTiles = village.importVillageMidGame(inputModel[1][i][2])
		let hasPurpleMeeple = inputModel[1][i][3] === 1
		let pendingVillageTiles = []
		for (let j = 0; j < inputModel[1][i][4].length; j++) {
			let tempTile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((t) => t.tileID.includes(inputModel[1][i][4][j]))))
			tempTile.upgraded = tempTile.tileID.indexOf(inputModel[1][i][4][j])
			pendingVillageTiles.push(tempTile)
		}
		let hiddenWinterTile_tileIDs = inputModel[1][i][5]
		let IMPORT_IDX = 6
		let passFlag = 1
		if (store.gameflow.phase === rf.PHASE_BIDDING_AND_ACTIONS) {
			passFlag = inputModel[1][i][IMPORT_IDX]
			IMPORT_IDX++
		}

		let knownHiddenMeeples = [...inputModel[1][i][IMPORT_IDX]]
		IMPORT_IDX++
		let knownHiddenSkillTiles = [...inputModel[1][i][IMPORT_IDX]]
		IMPORT_IDX++

		let hiddenContracts = []
		if (store.useMerchantsExpansion) {
			for (let j = 0; j < inputModel[1][i][IMPORT_IDX].length; j++) {
				let contract = JSON.parse(JSON.stringify(rf.ALL_CONTRACTS.find((c) => c.id === inputModel[1][i][IMPORT_IDX][j][0])))
				hiddenContracts.push(contract)
				hiddenContracts[hiddenContracts.length - 1].visible = inputModel[1][i][IMPORT_IDX][j][1]
			}
		}
		store.players.push({
			name: name,
			displayName: displayName,
			colour: colour,

			hiddenWinterTile_tileIDs: hiddenWinterTile_tileIDs, // This is just tile.id

			hiddenContracts: hiddenContracts, // object copies; but only need the objects in final scoring
			villageTiles: villageTiles, // stores your village, along with hex co-ords
			villageCanvasSize: [162.5, 162.5], // Size of player village
			villageRefSize: 2400,
			pendingVillageTiles: pendingVillageTiles, // tile objects
			hasPurpleMeeple: hasPurpleMeeple, // Given in TO setup
			villageNeighbours: [],
			placeableVillageCoords: [],
			finalScore: 0,
			requireItmesScore: 0,
			autoScoreScore: 0,
			manualScoreScore: 0,
			contractScore: 0,
			goldScore: 0,
			passFlag: passFlag,

			// Tracking Data
			knownHiddenMeeples: knownHiddenMeeples,
			knownHiddenSkillTiles: knownHiddenSkillTiles,

			// DATA FROM SERVER
			hiddenMeeples: [0, 0, 0, 0], // B / R / Y / G
			hiddenSkillTiles: [0, 0, 0], // SAW / PICKAXE / ANVIL
			hiddenHistory: [], // History objects
		})
		map.calculateCanvasSizeForPlayerVillage(i, false)
	}

	// 2 - available Boat Tiles
	store.availableBoatTiles.splice(0)
	for (let i = 0; i < inputModel[2].length; i++) {
		let tileID = inputModel[2][i][0]
		let meeplesOnBoat = inputModel[2][i][1]
		let skillsOnBoat = inputModel[2][i][2]
		let resourcesOnBoat = []
		let contractsOnBoat = []
		let greenMeeplesOnBoat = 0
		let cabinsOnBoat = 0
		if (store.useMerchantsExpansion) {
			resourcesOnBoat = inputModel[2][i][3]
			contractsOnBoat = inputModel[2][i][4]
			greenMeeplesOnBoat = inputModel[2][i][5]
			cabinsOnBoat = inputModel[2][i][6]
		}

		let tile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((t) => t.tileID.includes(tileID)))) // id
		tile.upgraded = tile.tileID.indexOf(tileID)
		tile.itemsOnBoat.meeples = meeplesOnBoat
		tile.itemsOnBoat.skillTiles = skillsOnBoat
		tile.itemsOnBoat.resources = resourcesOnBoat
		tile.itemsOnBoat.contracts = contractsOnBoat
		tile.itemsOnBoat.greenMeeples = greenMeeplesOnBoat
		tile.itemsOnBoat.cabins = cabinsOnBoat

		store.availableBoatTiles.push(tile)
	}

	// 3 availableTurnOrderTiles
	store.availableTurnOrderTiles.splice(0)
	for (let i = 0; i < inputModel[3].length; i++) {
		let tileID = inputModel[3][i][0]
		let bids = inputModel[3][i][1]
		let coreMeepleColour = rf.MEEPLE_NONE
		if (inputModel[3][i].length > 2) coreMeepleColour = inputModel[3][i][2]

		let tile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((t) => t.tileID.includes(tileID)))) // id
		tile.upgraded = tile.tileID.indexOf(tileID)
		for (let j = 0; j < bids.length; j++) tile.bids[j][0] = bids[j]
		tile.coreMeepleColour = coreMeepleColour

		store.availableTurnOrderTiles.push(tile)
	}

	// 4 availableTiles
	store.availableTiles.splice(0)
	for (let i = 0; i < inputModel[4].length; i++) {
		let tileID = inputModel[4][i][0]
		let bids = inputModel[4][i][1]

		let tile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((t) => t.tileID.includes(tileID)))) // id
		tile.upgraded = tile.tileID.indexOf(tileID)

		let IMPORT_INDEX = 2
		if (!rf.TILE_NO_ACTION.includes(tile.tileID[tile.upgraded])) {
			tile.meeplesOnTile = inputModel[4][i][IMPORT_INDEX]
			IMPORT_INDEX++
		}

		if (inputModel[4][i].length > IMPORT_INDEX) {
			tile.coreMeepleColour = inputModel[4][i][IMPORT_INDEX]
		}

		for (let j = 0; j < bids.length; j++) tile.bids[j][0] = bids[j]

		store.availableTiles.push(tile)
	}

	// 3 history
	store.history.splice(0)
	Object.assign(store.history, inputModel[5])

	// 6 availableResources
	store.availableResources.splice(0)
	Object.assign(store.availableResources, inputModel[6])

	// 7 - availableGreenMeeples
	store.availableGreenMeeples = inputModel[7]

	// 8 - hiddenContracts
	store.hiddenContracts.splice(0)
	Object.assign(store.hiddenContracts, inputModel[8])

	// 9 - visibleContracts
	store.visibleContracts.splice(0)
	Object.assign(store.visibleContracts, inputModel[9])

	// 10 - availableExtensions
	store.availableExtensions.splice(0)
	Object.assign(store.availableExtensions, inputModel[10])

	// 11 - ongoingVars
	store.ongoingVars.selectedWinterTileIDs.splice(0)
	Object.assign(store.ongoingVars.selectedWinterTileIDs, inputModel[11])

	store.clearContext()
	if (includeContext) {
		//} || inputModel.length === 11) {
		Object.assign(store.context, inputModel[12])
	}

	importCompressedGameData13(window.initData.gameData1, window.initData.gameData3)
}

// Assume store.history is updated with hidden info, and all players scoring is complete and in the model
export function exportKFWmodelForGameOver() {
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
		// 2 - village Tiles
		tempPlayer.push(JSON.parse(JSON.stringify(village.exportVillageEndGame(i))))

		//tempPlayer.push(store.players[i].hasPurpleMeeple ? 1 : 0) // 3

		// 3 - hiddenMeeples  - NOW SAVED IN GAME DATA - WIPED ON SERVER
		tempPlayer.push([...store.players[i].hiddenMeeples])

		// 4 = hiddenSkillTiles - NOW SAVED IN GAME DATA
		tempPlayer.push([...store.players[i].hiddenSkillTiles])

		// 5? - hiddenContracts
		if (store.useMerchantsExpansion) {
			let hiddenContractsArr = exportContractsForFinalScoring(i)
			tempPlayer.push(JSON.parse(JSON.stringify(hiddenContractsArr)))
		}
		tempPlayers.push(tempPlayer)
	}
	temp.push(JSON.parse(JSON.stringify(tempPlayers)))

	// 1 history
	temp.push(JSON.parse(JSON.stringify(store.history)))

	// 2 availableMeeples
	temp.push(JSON.parse(JSON.stringify(store.availableMeeples)))

	// 3 green meeples
	temp.push(store.availableGreenMeeples)

	// 4 avaialbleSkilllTiles
	temp.push(JSON.parse(JSON.stringify(store.availableSkills)))

	// 5 availableResources
	temp.push(JSON.parse(JSON.stringify(store.availableResources)))

	// 6 contracts
	if (store.useMerchantsExpansion) {
		let contractData = []
		contractData.push(store.hiddenContracts.length)
		contractData = contractData.concat(store.visibleContracts)
		temp.push(JSON.parse(JSON.stringify(contractData)))
	}

	for (let i = 0; i < temp.length; i++) {
		//console.log(i)
		//console.log(JSON.stringify(temp[i]))
	}

	var step1 = JSON.stringify(temp)

	// eslint-disable-next-line no-undef
	let step2 = pako.gzip(step1)
	let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

	return base64Data
}

export function importKFWmodelForGameOver(input) {
	const store = useModelStore()

	if (input === "" || input == undefined) return

	let compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	let inputModel = JSON.parse(decompressedData)

	// 0 - players
	store.players.splice(0)
	for (let i = 0; i < inputModel[0].length; i++) {
		let name = "" // 0
		let displayName = ""
		if (inputModel[0][i][0].length === 1) {
			name = inputModel[0][i][0][0]
			displayName = inputModel[0][i][0][0]
		} else if (inputModel[0][i][0].length === 2) {
			name = inputModel[0][i][0][0]
			displayName = inputModel[0][i][0][1]
		}
		let colour = inputModel[0][i][1] // 1

		//let hasPurpleMeeple = inputModel[1][i][3] === 1

		store.players.push({
			name: name,
			displayName: displayName,
			colour: colour,

			hiddenWinterTile_tileIDs: [], // This is just tile.id

			hiddenContracts: [], // IMPORTED AFTER
			villageTiles: [], // IMPORTED AFTER
			villageCanvasSize: [162.5, 162.5], // Size of player village
			villageRefSize: 2400,
			pendingVillageTiles: [], // tile objects
			hasPurpleMeeple: false, // Given in TO setup
			villageNeighbours: [],
			placeableVillageCoords: [],
			finalScore: 0,
			requireItmesScore: 0,
			autoScoreScore: 0,
			manualScoreScore: 0,
			contractScore: 0,
			goldScore: 0,
			passFlag: 1,

			// Tracking Data
			knownHiddenMeeples: [0, 0, 0, 0, 8],
			knownHiddenSkillTiles: [0, 0, 0, 0],

			// DATA FROM SERVER
			hiddenMeeples: [0, 0, 0, 0], // B / R / Y / G
			hiddenSkillTiles: [0, 0, 0], // SAW / PICKAXE / ANVIL
			hiddenHistory: [], // History objects
		})
		village.importVillageEndGame(i, inputModel[0][i][2]) //2
		store.players[i].hiddenMeeples = [...inputModel[0][i][3]]
		store.players[i].hiddenSkillTiles = [...inputModel[0][i][4]]
		if (store.useMerchantsExpansion) {
			importContractsForFinalScoring(i, inputModel[0][i][5])
		}

		map.calculateCanvasSizeForPlayerVillage(i, false)
	}

	// 1 history
	store.history.splice(0)
	Object.assign(store.history, inputModel[1])

	// 2 availableMeeples
	store.availableMeeples.splice(0)
	Object.assign(store.availableMeeples, inputModel[2])

	// 3 green meeples
	store.availableGreenMeeples = inputModel[3]

	// 4 avaialbleSkilllTiles
	store.availableSkills.splice(0)
	Object.assign(store.availableSkills, inputModel[4])

	// 5 availableResources
	store.availableResources.splice(0)
	Object.assign(store.availableResources, inputModel[5])

	// contracts
	if (store.useMerchantsExpansion) {
		let numHidden = inputModel[6].shift()
		store.hiddenContracts.splice(0)
		for (let i = 0; i < numHidden; i++) store.hiddenContracts.push(0)
		store.visibleContracts.splice(0)
		Object.assign(store.visibleContracts, inputModel[6])
	}

	// Recreate gameflow
	store.gameflow.turn = window.initData.turn
	store.gameflow.phase = rf.PHASE_GAME_OVER

	for (let i = 0; i < store.players.length; i++) model.calculateTotalFinalScore(i)
	store.context.finalPositions = model.endGame_core()
	let finalTurnOrder = []
	for (let i = 0; i < store.context.finalPositions.length; i++) {
		for (let j = 0; j < store.context.finalPositions[i].length; j++) {
			finalTurnOrder.push(store.context.finalPositions[i][j])
		}
	}
	store.gameflow.fullTurnOrder.splice(0)
	store.gameflow.fullTurnOrder = [...finalTurnOrder]
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]

	// Infer remaining extensions
	let remainingExtensions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].villageTiles.length; j++) {
			remainingExtensions = remainingExtensions.filter((ext) => ext !== store.players[i].villageTiles[j].extension)
		}
	}
	store.availableExtensions.splice(0)
	store.availableExtensions = [...remainingExtensions]

	store.context.finalPositions = model.endGame_core()
}
