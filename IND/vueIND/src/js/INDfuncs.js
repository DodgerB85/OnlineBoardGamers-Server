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

import * as rf from "./INDreference.js"
import * as model from "./INDmodel.js"
import * as view from "./INDview.js"

import { useModelStore } from "../stores/INDstore.js"
import { usePersonalStore } from "../stores/INDpersonal.js"
import { toRaw } from "vue"

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

	chatArray.push(["WelcomeBot", 0, "Welcome to Indonesia Online!SNLBSNLBIf you have any suggestions, questions or comments, then please do contact the webmaster at the email address in Contact (top right in the lobby). Thanks!"])

	return chatArray
}

export function simpleExportWholeModel(forAPI=false) {
	const store = useModelStore()
	const personal = usePersonalStore()

	let temp = []

	// 0 - players
	temp.push(JSON.parse(JSON.stringify(store.players)))
	//temp.push(deepClone(store.players))

	// 1 - cities
	temp.push(JSON.parse(JSON.stringify(store.cities)))
	//temp.push(deepClone(store.mapData))

	// 2 - gameflow
	temp.push(JSON.parse(JSON.stringify(store.gameflow)))
	//temp.push(deepClone(store.gameflow))

	// 3 - history
	if (!forAPI) temp.push(JSON.parse(JSON.stringify(store.history)))

	// 4 - available Companies
	temp.push(JSON.parse(JSON.stringify(store.availableCompanies)))

	// 5 - Active Companies
	temp.push(JSON.parse(JSON.stringify(store.activeCompanies)))

	// 6 - Ongoing Vars
	temp.push(JSON.parse(JSON.stringify(store.ongoingVars)))

	// 7 - context
	if (!forAPI) temp.push(JSON.parse(JSON.stringify(store.context)))

	let step1 = JSON.stringify(temp)

	// eslint-disable-next-line no-undef
	let step2 = pako.gzip(step1)
	let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

	return base64Data
}

export async function simpleImportWholeModel(input, importContext) {
	const store = useModelStore()

	if (input === "" || input == undefined) return

	/* input =
'NrDeCIEsBNwLgAwBpwDsCGBbApvcAlAewGdjwUBjQgG0IFcAneARhWKodzmYDoBWFOgoAXSIVQBZdAwDW2BmTgAmZOFE4AysPHZFq6pFS782TOkOGA5vCUDwAIzrFdLFNlTQAUnVQixqRWAVJGYAFgBdNw8AGUMXOGAAZmRmADZI8AAHanQAT3lvX1FxQOCwpABOJCUkAA5wgF8kCBhXNCwucE9CbFzycCpaRnhVdkJOG35BP3EpWXlFYLVITW0jPRQDdZMzC1RrZTtHZ0VWcHcvHxmA+GAMi9j124zsvIKr4puExsiQZGAALSsIFIEEghCRCFIYCsQHA+Gg1hQqFBaFgpFIZBAyG-RJohHozE46GhfGIzHk7FE6ECOGUhHI36pMmE8HE4AAdhZGKxzHZtW5FPR7KqdN5Qr51Jh-1ZBMlKOYsNl5MZ0OYNTp4Pp7OYeM1GOFUvKwGQ4sNkphtNN9MRkQtaTJ4t5Oq5+ptqphArdhI9zFFWoD8t+wRNEu1IWDsOtsrtwY1Pol7KUeuVbKlSlJ3oZSdpqfhSeZYpVtvTroTzvTXoThpRSn9DPDKOSgp97MSSobFab8blKrbKd7aabmbz1KbucHSJxkWEDDo2CQAkV0Lu0N+67Xm9X24tG+3e739oPW+PMNPp93J6v++v59v95vj7vT4fz-XkQgW2wAFEAB6ZdAAn8W5RynFAjAAdwAIScEZBGgaAAAV0FIdxLAWW4DUnDJ0AQmDIGoaArECUDqXAdBqGEeQABUVi4VQADcGEITBMLDGNKAAC0A9CtGkYREJyfImG4JokmQZtkl+FI1WkiNYyAA'
*/

	let compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	let inputModel = JSON.parse(decompressedData)

	// 0 players
	store.players.splice(0)
	Object.assign(store.players, inputModel[0])

	// 1
	store.cities.splice(0)
	Object.assign(store.cities, inputModel[1])

	// 2
	//store.gameflow.turnOrder.splice(0)
	Object.assign(store.gameflow, inputModel[2])

	// 3
	store.history.splice(0)
	Object.assign(store.history, inputModel[3])

	// 4
	store.availableCompanies.splice(0)
	Object.assign(store.availableCompanies, inputModel[4])

	// 5
	store.activeCompanies.splice(0)
	Object.assign(store.activeCompanies, inputModel[5])

	// 6
	Object.assign(store.ongoingVars, inputModel[6])

	store.clearVars()

	// 7
	if (importContext) Object.assign(store.context, inputModel[7])
}

// NB hiddenMoney is checked for in HTML startingOptions, in APP.vue
export function exportModel(includeContext, gameOver, forAPI=false) {
	const store = useModelStore()
	let temp = []

	// 0 - Players
	let tempPlayers = []
	for (let i = 0; i < store.players.length; i++) {
		tempPlayers.push([
			store.players[i].name, // 0
			store.players[i].displayName, // 1
			store.players[i].colour, // 2
			store.players[i].moneyCash, // 3
			store.players[i].moneyBank, //  4
			JSON.parse(JSON.stringify(store.players[i].slots)), //5
			JSON.parse(JSON.stringify(store.players[i].RnD)), // 6
		])
		// Don't save for end game
		if (!gameOver) tempPlayers[i].push(JSON.parse(JSON.stringify(store.players[i].eraCards))) // 7
		if (!gameOver) tempPlayers[i].push(store.players[i].moneyRoundIncome) // 8
	}
	temp.push(JSON.parse(JSON.stringify(tempPlayers)))

	// 1 Cities
	let tempCities = []
	for (let i = 0; i < store.cities.length; i++) {
		tempCities.push([store.cities[i].territory, store.cities[i].size])
		if (!gameOver) tempCities[i].push(JSON.parse(JSON.stringify(store.cities[i].receivedGoods)))
	}
	temp.push(JSON.parse(JSON.stringify(tempCities)))

	// 2 - gameflow
	let tempGameflow = []
	tempGameflow.push(store.gameflow.turn) // 0
	tempGameflow.push(JSON.parse(JSON.stringify(store.gameflow.fullTurnOrder))) // 1
	if (!gameOver) tempGameflow.push(JSON.parse(JSON.stringify(store.gameflow.turnOrder))) // 2
	if (!gameOver) tempGameflow.push(store.gameflow.phase) // 3
	if (!gameOver) tempGameflow.push(store.gameflow.currentEra) // 4
	temp.push(JSON.parse(JSON.stringify(tempGameflow)))

	// 3 - history
	if (!forAPI)temp.push(JSON.parse(JSON.stringify(store.history)))

	// 4 - Active Companies
	let tempActiveCompanies = []
	for (let i = 0; i < store.activeCompanies.length; i++) {
		let tempTerrs = []
		for (let j = 0; j < store.activeCompanies[i].territories.length; j++) {
			tempTerrs.push(store.activeCompanies[i].territories[j][0])
		}
		let tempActiveComp = []
		tempActiveComp.push(store.activeCompanies[i].id, JSON.parse(JSON.stringify(tempTerrs)))
		if (store.activeCompanies[i].type === rf.COMPANY_SHIPPING) {
			tempActiveComp.push(view.SHIP_GFX_TO_NUM(store.activeCompanies[i].shipGfx))
		}
		if (!gameOver) {
			tempActiveComp.push(store.activeCompanies[i].operated ? 1 : 0)
			tempActiveComp.push(store.activeCompanies[i].mergedThisPhase ? 1 : 0)
		}
		//else if (store.activeCompanies[i].siapFaji) tempActiveComp.push(1)

		tempActiveCompanies.push(JSON.parse(JSON.stringify(tempActiveComp)))
	}
	temp.push(JSON.parse(JSON.stringify(tempActiveCompanies)))

	// 5 - available Companies
	let tempAvailableCompanies = []
	for (let i = 0; i < store.availableCompanies.length; i++) {
		tempAvailableCompanies.push(store.availableCompanies[i].id)
	}
	if (!gameOver) temp.push(JSON.parse(JSON.stringify(tempAvailableCompanies)))

	// 6 - ongoing vars
	if (!gameOver)
		temp.push([
			JSON.parse(JSON.stringify(store.ongoingVars.selectedMergerInfo)),
			JSON.parse(JSON.stringify(store.ongoingVars.passedPlayerIndexes)),
			JSON.parse(JSON.stringify(store.ongoingVars.bidTurnOrder)),
			JSON.parse(JSON.stringify(store.ongoingVars.newTurnOrderBids)),
			store.ongoingVars.currentBid,
			store.ongoingVars.currentBidderIndex,
			JSON.parse(JSON.stringify(store.ongoingVars.siapFajiOrShippingTerrsToRemoveData)),
			JSON.parse(JSON.stringify(store.ongoingVars.preBidData)),
			// store.ongoinVars.nominalValue,
			// store.ongoingVars.bidIncrement,
		])

	// 7 - context
	if (includeContext) temp.push(JSON.parse(JSON.stringify(store.context)))

	var step1 = JSON.stringify(temp)

	// eslint-disable-next-line no-undef
	let step2 = pako.gzip(step1)
	let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

	return base64Data
}

/** WHOLE GAME - NO COMPRESSION (for replay generation) */
export function simpleExportWholeINDmodelNoCompression() {
    const store = useModelStore();

    // Mapping directly from the store ensures we get the current reactive values.
    // JSON.stringify automatically handles the "Proxy to Plain Object" conversion.
    return [
        JSON.parse(JSON.stringify(store.players)),            // 0
        JSON.parse(JSON.stringify(store.cities)),             // 1
        JSON.parse(JSON.stringify(store.gameflow)),           // 2
        JSON.parse(JSON.stringify(store.history)),            // 3
        JSON.parse(JSON.stringify(store.activeCompanies)),    // 4
        JSON.parse(JSON.stringify(store.availableCompanies)), // 5
        JSON.parse(JSON.stringify(store.ongoingVars)),        // 6
        JSON.parse(JSON.stringify(store.context))             // 7
    ];
}

export async function simpleImportWholeINDmodelNoCompression(inputModel, keepHistory = false) {
    const store = useModelStore();

    if (!inputModel?.length) return;

    // Destructure for readability (matches the 0-7 order in your export)
    const [
        inPlayers, 
        inCities, 
        inGameflow, 
        inHistory, 
        inActiveCos, 
        inAvailableCos, 
        inOngoing, 
        inContext
    ] = inputModel;


    // Arrays: Use splice to replace contents while maintaining reactivity
    store.players.splice(0, store.players.length, ...inPlayers);
    store.cities.splice(0, store.cities.length, ...inCities);
    store.activeCompanies.splice(0, store.activeCompanies.length, ...inActiveCos);
    store.availableCompanies.splice(0, store.availableCompanies.length, ...inAvailableCos);

    // Objects: Use Object.assign to update properties reactively
    Object.assign(store.gameflow, inGameflow);
    Object.assign(store.ongoingVars, inOngoing);
    Object.assign(store.context, inContext);

    // Conditional History
    if (!keepHistory) {
        store.history.splice(0, store.history.length, ...inHistory);
    }

    store.clearVars();
}

export function importModel(input, includeContext, gameOver) {
	const store = useModelStore()

	if (input === "" || input == undefined) return

	let compressedData = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	let inputModel = JSON.parse(decompressedData)

	// 0 players
	store.players.splice(0)
	for (let i = 0; i < inputModel[0].length; i++) {
		store.players.push({
			name: inputModel[0][i][0],
			displayName: inputModel[0][i][1],
			colour: inputModel[0][i][2],
			moneyCash: Math.round(inputModel[0][i][3]),
			moneyBank: Math.round(inputModel[0][i][4]),
			slots: JSON.parse(JSON.stringify(inputModel[0][i][5])),
			RnD: JSON.parse(JSON.stringify(inputModel[0][i][6])),

			eraCards: [],
			moneyRoundIncome: 0,
			preMoves: [],
		})
		if (!gameOver) store.players[i].eraCards = JSON.parse(JSON.stringify(inputModel[0][i][7]))
		if (!gameOver) store.players[i].moneyRoundIncome = Math.round(inputModel[0][i][8])
	}

	// 1 cities
	store.cities.splice(0)
	for (let i = 0; i < inputModel[1].length; i++) {
		store.cities.push({
			territory: inputModel[1][i][0],
			size: inputModel[1][i][1],
			receivedGoods: [],
		})
		if (!gameOver) store.cities[i].receivedGoods = JSON.parse(JSON.stringify(inputModel[1][i][2]))
	}

	// 2 - gameflow
	store.gameflow.turn = inputModel[2][0]
	store.gameflow.fullTurnOrder.splice(0)
	store.gameflow.fullTurnOrder.push(...inputModel[2][1])
	if (!gameOver) {
		store.gameflow.turnOrder.splice(0)
		store.gameflow.turnOrder.push(...inputModel[2][2])
		store.gameflow.phase = inputModel[2][3]
		store.gameflow.currentEra = inputModel[2][4]
	} else if (gameOver) {
		store.gameflow.turnOrder.splice(0)
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		store.gameflow.phase = rf.PHASE_GAME_OVER
		store.gameflow.currentEra = rf.ERA_C
	}
	// 3 history
	store.history.splice(0)
	Object.assign(store.history, inputModel[3])

	// 4 activeCompanies
	store.activeCompanies.splice(0)
	for (let i = 0; i < inputModel[4].length; i++) {
		// [id, terrs, operated, mergedThisPhase, shipGfxNum // isSiapFaji]
		let foundComp
		if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) foundComp = rf.ALL_COMPANIES.find((comp) => comp.id === inputModel[4][i][0])
		else if (store.mapData.selectedMap === rf.MAP_AEGEAN) foundComp = rf.AG_ALL_COMPANIES.find((comp) => comp.id === inputModel[4][i][0])
		else if (store.mapData.selectedMap === rf.MAP_PHP) foundComp = rf.PH_ALL_COMPANIES.find((comp) => comp.id === inputModel[4][i][0])
		let tempComp = JSON.parse(JSON.stringify(foundComp))
		//update ownerIndex
		for (let j = 0; j < store.players.length; j++) {
			for (let k = 0; k < store.players[j].slots.length; k++) {
				if (store.players[j].slots[k].includes(tempComp.id)) {
					tempComp.ownerIndex = j
					break
				}
			}
		}
		//update shipping hullCapacity
		tempComp.hullCapacity = store.players[tempComp.ownerIndex].RnD[rf.RnD_HULL_IDX]
		for (let j = 0; j < inputModel[4][i][1].length; j++) {
			if (tempComp.type === rf.COMPANY_SHIPPING) {
				tempComp.territories.push([inputModel[4][i][1][j], tempComp.hullCapacity])
			} else tempComp.territories.push([inputModel[4][i][1][j], false])
		}
		//update shipping gfx
		if (tempComp.type === rf.COMPANY_SHIPPING) tempComp.shipGfx = view.SHIP_NUM_TO_GFX(inputModel[4][i][2])
		if (!gameOver && tempComp.type === rf.COMPANY_SHIPPING) {
			tempComp.operated = inputModel[4][i][3] === 1
			tempComp.mergedThisPhase = inputModel[4][i][4] === 1
		}
		if (!gameOver && rf.LAND_COMPANIES.includes(tempComp.type)) {
			tempComp.operated = inputModel[4][i][2] === 1
			tempComp.mergedThisPhase = inputModel[4][i][3] === 1
		}

		// update used prod markers
		if (rf.LAND_COMPANIES.includes(tempComp.type)) {
			if (tempComp.operated) {
				for (let j = 0; j < tempComp.territories.length; j++) {
					tempComp.territories[j][1] = true
				}
			}
		}
		store.activeCompanies.push(JSON.parse(JSON.stringify(tempComp)))
	}

	// NOW ALL COMPANIES ARE IN
	//update shipping combinedCapacity
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].slots.length; j++) {
			let newCapacity = [0, 0, 0]
			if (store.players[i].slots[j].length > 1 && model.getActiveCompanyDataFromID(store.players[i].slots[j][0]).type === rf.COMPANY_SHIPPING) {
				// Combine capacity
				for (let k = 0; k < store.players[i].slots[j].length; k++) {
					let oldCapacity = model.getActiveCompanyDataFromID(store.players[i].slots[j][k]).capacity
					newCapacity[0] += oldCapacity[0]
					newCapacity[1] += oldCapacity[1]
					newCapacity[2] += oldCapacity[2]
				}
				// Replace capcity
				for (let k = 0; k < store.players[i].slots[j].length; k++) {
					model.getActiveCompanyDataFromID(store.players[i].slots[j][k]).combinedCapacity = [...newCapacity]
				}
			}
		}
	}

	// Now all companies are in, infer SIAP FAJI companies
	let siapFajiCompIDS = []
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].slots.length; j++) {
			let companyType = -1
			for (let k = 0; k < store.players[i].slots[j].length; k++) {
				if (k === 0) companyType = model.getActiveCompanyDataFromID(store.players[i].slots[j][k]).type
				else {
					if (companyType !== model.getActiveCompanyDataFromID(store.players[i].slots[j][k]).type) {
						// you have found a SF slo
						siapFajiCompIDS = siapFajiCompIDS.concat(store.players[i].slots[j])
					}
				}
			}
		}
	}
	// Unique the IDs
	siapFajiCompIDS = [...new Set(siapFajiCompIDS)]
	for (let i = 0; i < siapFajiCompIDS.length; i++) {
		let company = model.getActiveCompanyDataFromID(siapFajiCompIDS[i])
		if (company.type !== rf.COMPANY_RICE && company.type !== rf.COMPANY_SPICE && company.type !== rf.COMPANY_SIAP_FAJI) alert("ILLEGAL SF IMPORT")
		company.siapFaji = true
		company.type = rf.COMPANY_SIAP_FAJI
		company.goodsGfx = "prod_marker_siap_faji"
		company.good = rf.GOOD_SIAP_FAJI
		company.typeText = "Siap Saji"
		company.goodValue = 35
	}

	// And update the newExpansionsThisTurn, and incomeThisTurn
	let histIndex = store.history.length - 1
	// If you arne't in operations, rewind index to start of operations
	if (store.gameflow.phase !== rf.PHASE_OPERATIONS) {
		while (!rf.HIST_OPERATIONS_ENTRIES.includes(store.history[histIndex][0]) && histIndex > 0) histIndex--
	}
	// Now rewind thru operations to add income and expansions
	while (histIndex >= 0 && (rf.HIST_OPERATIONS_ENTRIES.includes(store.history[histIndex][0]) || rf.ENTRIES_TO_IGNORE.includes(store.history[histIndex][0]))) {
		if (store.gameflow.phase === rf.PHASE_OPERATIONS && store.history[histIndex][0] === rf.HIST_OPERATE_SHIPPING && store.history[histIndex][3].length > 2) {
			// Operated Shipping company
			let companyID = store.history[histIndex][3][0][0]
			let company = model.getActiveCompanyDataFromID(companyID)
			for (let i = 1; i < store.history[histIndex][3].length - 1; i++) {
				company.newExpansionsThisTurn.push(store.history[histIndex][3][i])
			}
		} else if (store.history[histIndex][0] === rf.HIST_OPERATE_LAND) {
			let companyID = store.history[histIndex][3][0][0]
			let company = model.getActiveCompanyDataFromID(companyID)
			if (store.gameflow.phase === rf.PHASE_OPERATIONS) {
				for (let i = 0; i < store.history[histIndex][3][store.history[histIndex][3].length - 1].length; i++) {
					if (store.history[histIndex][3][store.history[histIndex][3].length - 1][i] !== -1 && store.history[histIndex][3][store.history[histIndex][3].length - 1][i] !== -2) company.newExpansionsThisTurn.push(store.history[histIndex][3][store.history[histIndex][3].length - 1][i])
				}
			}
			let resComps = view.getTotalIncomeArray(store.history[histIndex], true, histIndex)
			for (let i = 0; i < resComps.length; i++) {
				let company = model.getActiveCompanyDataFromID(resComps[i][0])
				company.incomeThisTurn += resComps[i][1]
			}
		} else if (store.gameflow.phase === rf.PHASE_OPERATIONS && store.history[histIndex][0] === rf.HIST_OPERATE_LAND_PAID_EXPANSION_ONLY) {
			let companyID = store.history[histIndex][3][0][0]
			let company = model.getActiveCompanyDataFromID(companyID)
			for (let i = 0; i < store.history[histIndex][3][1].length; i++) {
				company.newExpansionsThisTurn.push(store.history[histIndex][3][1][i])
			}
		}
		histIndex--
	}

	// 5 - available companise
	store.availableCompanies.splice(0)
	if (!gameOver) {
		for (let i = 0; i < inputModel[5].length; i++) {
			if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) store.availableCompanies.push(JSON.parse(JSON.stringify(rf.ALL_COMPANIES.find((comp) => comp.id === inputModel[5][i]))))
			else if (store.mapData.selectedMap === rf.MAP_AEGEAN) store.availableCompanies.push(JSON.parse(JSON.stringify(rf.AG_ALL_COMPANIES.find((comp) => comp.id === inputModel[5][i]))))
			else if (store.mapData.selectedMap === rf.MAP_PHP) store.availableCompanies.push(JSON.parse(JSON.stringify(rf.PH_ALL_COMPANIES.find((comp) => comp.id === inputModel[5][i]))))
		}
	}

	// 6 ongoing vars
	store.resetOngoingVars(false)
	if (!gameOver) {
		store.ongoingVars.selectedMergerInfo.splice(0)
		store.ongoingVars.selectedMergerInfo = JSON.parse(JSON.stringify(inputModel[6][0]))
		store.ongoingVars.passedPlayerIndexes.splice(0)
		store.ongoingVars.passedPlayerIndexes.push(...inputModel[6][1])
		store.ongoingVars.bidTurnOrder.splice(0)
		store.ongoingVars.bidTurnOrder.push(...inputModel[6][2])
		store.ongoingVars.newTurnOrderBids.splice(0)
		store.ongoingVars.newTurnOrderBids = JSON.parse(JSON.stringify(inputModel[6][3]))
		store.ongoingVars.currentBid = inputModel[6][4]
		store.ongoingVars.currentBidderIndex = inputModel[6][5]
		store.ongoingVars.siapFajiOrShippingTerrsToRemoveData.splice(0)
		store.ongoingVars.siapFajiOrShippingTerrsToRemoveData = JSON.parse(JSON.stringify(inputModel[6][6]))
		store.ongoingVars.preBidData.splice(0)
		store.ongoingVars.preBidData = JSON.parse(JSON.stringify(inputModel[6][7]))
	}

	if (store.ongoingVars.selectedMergerInfo.length >= 2) {
		let isSiapFajiMerger = false
		let company1type = model.getActiveCompanyDataFromID(store.players[store.ongoingVars.selectedMergerInfo[0][0]].slots[store.ongoingVars.selectedMergerInfo[0][1]][0]).type
		let company2type = model.getActiveCompanyDataFromID(store.players[store.ongoingVars.selectedMergerInfo[1][0]].slots[store.ongoingVars.selectedMergerInfo[1][1]][0]).type
		if (company1type !== company2type) isSiapFajiMerger = true
		store.ongoingVars.nominalValue = model.getNominalValueFromSlotID(store.ongoingVars.selectedMergerInfo[0][0], store.ongoingVars.selectedMergerInfo[0][1], isSiapFajiMerger) + model.getNominalValueFromSlotID(store.ongoingVars.selectedMergerInfo[1][0], store.ongoingVars.selectedMergerInfo[1][1], isSiapFajiMerger)
		store.ongoingVars.bidIncrement = store.ongoingVars.selectedMergerInfo[0][2] + store.ongoingVars.selectedMergerInfo[1][2]
	}

	// 7 IF INCLUDE CONTEXT
	store.clearVars()
	if (includeContext) {
		//} || inputModel.length === 11) {
		Object.assign(store.context, inputModel[7])
	}

	// Mark companies with no space
	model.markActiveCompaniesWithNoStartTerritoriesForRemoval()
}
