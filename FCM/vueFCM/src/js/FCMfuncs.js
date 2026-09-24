import * as rf from "./FCMreference"
//import * as rules from "./FCMrules"
//import * as controller from "./FCMcontroller"
import * as map from "./FCMmap"
import * as model from "./FCMmodel"
import * as context from "./FCMcontext"
import * as view from "./FCMview"

import { useModelStore } from "../stores/FCMstore.js"
import { usePersonalStore } from "../stores/FCMpersonal"
import i18n from "../i18n"

export const shuffle = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[array[i], array[j]] = [array[j], array[i]]
	}
	return array
}

export function booleanToInt(b) {
	if (b === true) {
		return 1
	} else {
		return 0
	}
}

export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export function compressObjectToDB(obj) {
	// PAKO
	let step1 = JSON.stringify(obj)
	// eslint-disable-next-line no-undef
	let step2B = pako.gzip(step1)
	let base64Data1 = btoa(String.fromCharCode(...new Uint8Array(step2B)))

	return base64Data1
}

export function decompressObjectFromDB(str) {
	let step1
	let step2
	try {
		step1 = Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
		// eslint-disable-next-line no-undef
		let decompressedData = pako.ungzip(step1, { to: "string" })
		step2 = JSON.parse(decompressedData)
	} catch {
		alert(i18n.global.t("alerts.loadDecompressError"))
		return -9999
	}

	return step2

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
	var i = 0
	while (i < arr.length) {
		if (arr[i] === value) {
			arr.splice(i, 1)
		} else {
			++i
		}
	}
	return arr
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
		.replace(/ZQ/g, "\n") // fix the previous notes
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

	chatArray.push(["WelcomeBot", personal.gameCreationTimestamp, i18n.global.t("welcome.welcomeBot")])

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

export function simpleExportWholeFCMmodel() {
	const store = useModelStore()
	let temp = []

	// 0 tiles
	temp.push([[...store.mapData.tiles], [...store.mapData.coords]])

	// 1 players
	temp.push(JSON.parse(JSON.stringify(store.players)))

	// 2
	temp.push(JSON.parse(JSON.stringify(store.availableMarketingCampaigns)))

	// 3
	temp.push(JSON.parse(JSON.stringify(store.availableEmployees)))

	// 4
	temp.push(JSON.parse(JSON.stringify(store.availableMilestones)))

	// 5
	temp.push(store.bank)

	// 6
	temp.push(JSON.parse(JSON.stringify(store.gameflow)))
	// 7
	temp.push(JSON.parse(JSON.stringify(store.campaigns)))

	// 8
	temp.push(JSON.parse(JSON.stringify(store.gardens)))

	// 9
	temp.push(JSON.parse(JSON.stringify(store.houses)))

	// 10
	temp.push(store.ceoLevel)

	// 11
	temp.push(JSON.parse(JSON.stringify(store.needs)))

	// 12
	temp.push(store.bankBroken)

	// 13
	temp.push(store.history)

	// 14
	temp.push(JSON.parse(JSON.stringify(store.freeways)))

	// 15
	temp.push(JSON.parse(JSON.stringify(store.parks)))

	// 16
	temp.push(JSON.parse(JSON.stringify(store.newRoads)))

	// 17
	temp.push(JSON.parse(JSON.stringify(store.coffeeShopMSplayers)))

	// 18
	temp.push(JSON.parse(JSON.stringify(store.firstPizzas)))

	// 19
	temp.push(JSON.parse(JSON.stringify(store.reserveCards)))

	// 20 - context
	temp.push(JSON.parse(JSON.stringify(store.context)))

	let step1 = JSON.stringify(temp)
	// eslint-disable-next-line no-undef
	let step2 = pako.gzip(step1)
	let base64Data = btoa(String.fromCharCode(...new Uint8Array(step2)))

	return base64Data
}

export function exportIndexes(indexes) {
	let res = []
	for (let i = 0; i < indexes.length; i++) {
		res.push(exportIndex(indexes[i]))
	}
	return res
}

function getMapWidthAndShift() {
	const store = useModelStore()
	let mapWidthSq = 15
	if (store.players.length === 3) mapWidthSq = 20
	if (store.players.length === 4) mapWidthSq = 20
	if (store.players.length === 5) mapWidthSq = 25
	if (store.players.length === 6) mapWidthSq = 30
	let xShift = 30
	let yShift = 30
	if (store.startingOptions.lobbyists) {
		let tileWidth = map.getUsedRowCol()[1].length
		mapWidthSq = tileWidth * 5
		let firstRow = -1
		let firstCol = 999
		for (let i = 0; i < store.mapData.tiles.length; i++) {
			if (store.mapData.tiles[i] !== -1) {
				if (firstRow === -1) firstRow = Math.floor(i / 2 / store.mapData.dimensions[0])
				let Col = (i / 2) % store.mapData.dimensions[0]
				if (Col < firstCol) firstCol = Col
			}
		}
		xShift = firstCol * 5
		yShift = firstRow * 5
	}
	return { mapWidthSq, xShift, yShift }
}

export function exportIndex(index) {
	//if (index === 0) return 0
	if (index === -1) return -1
	const { mapWidthSq, xShift, yShift } = getMapWidthAndShift()

	// The top left sq is ALWAYS 2580, at co-ord 30,30
	// So get the co-ord of the index
	let indexCoord = map.giveCoord(index)
	// Shift it relative to 0,0
	indexCoord[0] -= xShift
	indexCoord[1] -= yShift
	// Convert back to an index
	let exportIndex = indexCoord[1] * mapWidthSq + indexCoord[0]

	return exportIndex
}

export function importIndexes(indexes) {
	let res = []
	for (let i = 0; i < indexes.length; i++) {
		res.push(importIndex(indexes[i]))
	}
	return res
}

export function importIndex(index) {
	if (index === -1) return -1
	const { mapWidthSq, xShift, yShift } = getMapWidthAndShift()

	// Find the x,y of the index relative to 0,0
	let indexCoord = [index % mapWidthSq, Math.floor(index / mapWidthSq)]
	let importIndex = 0

	// Shift it relative to 30,30
	indexCoord[0] += xShift
	indexCoord[1] += yShift
	// Convert back to an index
	importIndex = map.giveIndex(indexCoord[0], indexCoord[1])

	return importIndex
}

export function importPlayer(inputArr) {
	const store = useModelStore()
	const newPlayer = {
		name: inputArr[0][0],
		displayName: inputArr[0][1] || inputArr[0][0],
		colour: parseInt(inputArr[1]),
		restaurants: [],
		money: inputArr[3],
		bankrupt: inputArr[3] < 0,
		employees: [...inputArr[4]],
		beach: [...inputArr[5]],
		milestones: [...inputArr[6]],
		marketers: [],
		resources: [],
		additionalCampaignArrayIndex: -1,
		additionalMarketedGood: [],
		coffeeShops: [],
		ceo: 3,
		ceoAction: rf.CEO_ACTION_HIRE_1,
		OOBpreference: 0,
	}

	// 2. Restaurants
	newPlayer.restaurants = inputArr[2].map((r) => ({
		index: r[0],
		rotation: r[1],
		open: r.length <= 2, // If length > 2, it contains the "closed" flag (0)
	}))

	// 7. Marketers (Standardized while loop for flat array parsing)
	const mData = inputArr[7]
	let mIdx = 0
	while (mIdx < mData.length) {
		const type = mData[mIdx]
		const entry = {
			marketer: type,
			campaign: mData[mIdx + 1],
		}

		if (store.startingOptions.nightShift && type === rf.MARKETING_TRAINEE) {
			entry.nightShift = mData[mIdx + 2] === 1
			mIdx += 3
		} else {
			mIdx += 2
		}
		newPlayer.marketers.push(entry)
	}

	// 8. Resources (Reconstructing from counts)
	const resourceCounts = inputArr[8]
	resourceCounts.forEach((count, typeIndex) => {
		for (let j = 0; j < count; j++) {
			newPlayer.resources.push(typeIndex)
		}
	})

	// Dynamic Indexing for Optional Modules
	let nextIdx = 9

	if (store.startingOptions.newMilestones) {
		const amg = inputArr[nextIdx]
		if (amg.length === 1) newPlayer.additionalMarketedGood = [6, amg[0]]
		else if (amg.length === 2) newPlayer.additionalMarketedGood = [...amg]

		nextIdx++
		newPlayer.additionalCampaignArrayIndex = inputArr[nextIdx]
		nextIdx++
	}

	if (store.startingOptions.coffee && inputArr.length > nextIdx) {
		newPlayer.coffeeShops = [...inputArr[nextIdx]]
	}

	return newPlayer
}

export function exportPlayer(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	const res = []

	// 0 - Name / Display Name
	const names = [playerObj.name]
	if (playerObj.name !== playerObj.displayName) names.push(playerObj.displayName)
	res.push(names)

	// 1 - Colour
	res.push(playerObj.colour)

	// 2 - Restaurants
	res.push(
		playerObj.restaurants.map((resto) => {
			const entry = [exportIndex(resto.index), resto.rotation]
			if (!resto.open) entry.push(0)
			return entry
		})
	)

	// 3 - Money
	res.push(playerObj.money)

	// 4 - Employees
	res.push([...playerObj.employees])

	// 5 - Beach
	res.push([...playerObj.beach])

	// 6 - Milestones
	res.push([...playerObj.milestones])

	// 7 - Marketers
	res.push(
		playerObj.marketers.flatMap((m) => {
			if (store.startingOptions.nightShift && m.marketer === rf.MARKETING_TRAINEE) {
				return [m.marketer, m.campaign, m.nightShift ? 1 : 0]
			}
			return [m.marketer, m.campaign]
		})
	)

	// 8 - Resources (Optimized counter)
	const exportResources = Array(10).fill(0)
	playerObj.resources.forEach((type) => exportResources[type]++)

	// Trim trailing zeros efficiently
	let lastIdx = exportResources.length
	while (lastIdx > 0 && exportResources[lastIdx - 1] === 0) lastIdx--
	res.push(exportResources.slice(0, lastIdx))

	// New Milestones Logic
	if (store.startingOptions.newMilestones) {
		// 9 - Additional Marketed Goods
		if (playerObj.additionalMarketedGood.length > 0) {
			const goods = playerObj.additionalMarketedGood
			res.push(goods[0] === 6 ? [goods[1]] : [...goods])
		} else {
			res.push([])
		}

		// 10 - Additional Campaign Index
		res.push(playerObj.additionalCampaignArrayIndex)
	}

	// 11 - Coffee Shops
	if (store.startingOptions.coffee) {
		res.push(playerObj.coffeeShops.map((idx) => exportIndex(idx)))
	}

	return res
}

/** 
			0 - shortGame
			1 - useMilestones
			2 - board
			3 - players
			4 - availableMarketingCampaigns
			5 - availableEmployees
			6 - availableMilestones
			7 - amount left in bank
			8 - gameflow information
			9 - active marketing
			10 - used gardens
			11 - used houses
			12 - global CEO level
			13 - board needs
			14 - reserve
			15 - context
			16 - bankBroken
			17 - history
			18 - history timestamps
			19 - allow surrender
			20 - ketchup options
			21 - strict payday fridge
			22 - training game
			23 - freeway
			24 - first pizzas
			25 - parks
			26 - newRoads
			27 - coffeeShopMSplayers
	 */
export function exportFCMmodel(forGameOver, includeContext) {
	const store = useModelStore()
	const temp = []

	// 0: Map - Added Tiles
	if (store.startingOptions.lobbyists) {
		const tiles = map.getAddedTiles(false).map((tile) => {
			// Remove rotation (index 2) if it is 0
			if (tile[2] === 0) {
				const newTile = [...tile]
				newTile.splice(2, 1)
				return newTile
			}
			return tile
		})
		temp.push(tiles)
	}

	// 1: Players
	let tempPlayers = []
	for (let i = 0; i < store.players.length; i++) {
		tempPlayers.push(JSON.parse(JSON.stringify(exportPlayer(i))))
	}
	temp.push(JSON.parse(JSON.stringify(tempPlayers)))

	// 2: Bank
	temp.push(store.bank)

	// 3: Gameflow - omitted entirely on game over
	if (!forGameOver) {
		const gf = store.gameflow
		const flowData = [[...gf.fullTurnOrder], gf.phase, [...gf.turnOrder]]
		if (gf.newTurnOrder.length > 0) flowData.push([...gf.newTurnOrder])
		temp.push(flowData)
	}

	// 4: Active Marketing Campaigns
	temp.push(
		store.campaigns.map((c) => {
			const entry = [c.number]
			if (c.number <= 16) {
				entry.push(exportIndex(c.index), c.good)
				if (c.duration !== 9) entry.push(c.duration)
				if (rf.ROTATABLE_CAMPAIGNS.includes(c.number) && c.rotated) entry.push(6)
			} else {
				entry.push(c.good)
				if (c.duration !== 9) entry.push(c.duration)
			}
			return entry
		})
	)

	// 5: Gardens
	temp.push(
		store.gardens.map((g) => {
			const entry = [exportIndex(g.index), g.house]
			if (g.rotated) entry.push(1)
			return entry
		})
	)

	// 6: Houses
	temp.push(
		store.houses
			.filter((h) => h.index !== -1)
			.map((h) => {
				const entry = [h.number, exportIndex(h.index)]
				const rotation = h.rotated === true ? 1 : h.rotated || 0
				if (rotation !== 0) entry.push(rotation)
				return entry
			})
	)

	// 7: CEO Level
	temp.push(store.ceoLevel)

	// 8: Needs
	temp.push(
		store.needs
			.filter((h) => h.needs != null)
			.map((h) => {
				const entry = [h.number]
				const needsData = forGameOver ? h.needs.map((n) => n[0]) : h.needs
				return entry.concat(needsData)
			})
	)

	// 9 & 10: History and Timestamps
	if (store.history.length > 0) {
		let tRef = store.history[0][2]
		const histData = [tRef]
		const timestamps = []

		store.history.forEach((entry) => {
			histData.push([entry[1], entry[0], entry[3]])
			const diff = entry[2] - tRef
			timestamps.push(diff)
			tRef += diff
		})
		temp.push(histData, timestamps)
	} else {
		temp.push([], [])
	}

	// 11: Freeways
	if (store.startingOptions.ruralMarketers) {
		temp.push(
			store.freeways.map((f) => {
				const entry = [exportIndex(f.index), f.sides === true ? 1 : 0]
				if (f.rotated) entry.push(1)
				return entry
			})
		)
	} 

	// 12 & 13: Parks and New Roads
	if (store.startingOptions.lobbyists) {
		// Parks
		temp.push(
			store.parks.map((p) => {
				const entry = [exportIndex(p.index), p.variety]
				if (p.variety === 0 && p.rotation !== 0) entry.push(1)
				else if (p.variety === 1 && p.rotation !== 0) entry.push(p.rotation)
				else if (p.variety === 2) {
					entry.push(p.rotation)
					if (p.flipped) entry.push(1)
				}
				return entry
			})
		)
		// Roads
		temp.push(
			store.newRoads.map((r) => {
				const entry = [exportIndex(r.index), r.variety, r.rotation]
				if (!forGameOver) entry.push(r.turnAdded)
				return entry
			})
		)
	} 

	// 14-17: Volatile Context Data
	if (!forGameOver) {
		temp.push(JSON.parse(JSON.stringify(store.coffeeShopMSplayers)))
		temp.push(JSON.parse(JSON.stringify(store.firstPizzas)))
		temp.push(JSON.parse(JSON.stringify(store.reserveCards)))
		if (includeContext) temp.push(JSON.stringify(store.context))
	}

	let step1 = JSON.stringify(temp)
	// eslint-disable-next-line no-undef
	let step2B = pako.gzip(step1)
	let base64Data1 = btoa(String.fromCharCode(...new Uint8Array(step2B)))

	return base64Data1
}

export function importFCMmodel(inputB64, forGameOver, includeContext) {
	let step1
	let step2
	try {
		step1 = Uint8Array.from(atob(inputB64), (c) => c.charCodeAt(0))
		// eslint-disable-next-line no-undef
		let decompressedData = pako.ungzip(step1, { to: "string" })
		step2 = JSON.parse(decompressedData)
	} catch {
		alert(i18n.global.t("alerts.loadDecompressError"))
		return -9999
		//step1 = LZString.decompressFromEncodedURIComponent(str);
		//step2 = JSON.parse(step1);
	}

	const inputArr = step2

	const store = useModelStore()
	let IMPORT_INDEX = 0
	// Now set up internal options -- THIS JUST SETS UP THE TRUE?FALSE FLAGS
	model.setInternalStartingOptions(window.initData.startingOptions)

	// 0 - map
	store.mapData.tiles = map.expandMapToFullGrid(window.initData.startingMap, window.initData.playerNames.length)
	map.initCoords()
	let lobbyistData = []
	if (store.startingOptions.lobbyists) {
		lobbyistData = inputArr[IMPORT_INDEX]
		IMPORT_INDEX++
		// Add in rotation 0
		for (let i = 0; i < lobbyistData.length; i++) {
			if (lobbyistData[i].length === 2) lobbyistData[i].push(0)
		}
	}

	for (let i = 0; i < lobbyistData.length; i++) {
		let idx = lobbyistData[i][0] * 2
		let tile = lobbyistData[i][1]
		let rotation = lobbyistData[i][2]
		map.addTileToMap(tile, idx, rotation)
	}
	view.setMapDisplayTiles()

	// 1? - players
	// Using .map() is more efficient than .splice() followed by a loop of .push()
	store.players.splice(0)
	store.players = inputArr[IMPORT_INDEX].map((entry) => importPlayer(entry))

	IMPORT_INDEX++

	// 2? - bank
	store.bank = inputArr[IMPORT_INDEX]
	IMPORT_INDEX++

	// 3? gameflow
	store.gameflow.turn = 0
	store.gameflow.fullTurnOrder.splice(0)
	for (let i = 0; i < store.players.length; i++) store.gameflow.fullTurnOrder.push(i)

	// Detect game over: if forGameOver is set, or if the gameflow section is missing from the export
	// (the export omits the gameflow section entirely on game over, so what we find here is actually
	// the campaigns array — an array of arrays, not [fullTurnOrder, phase, turnOrder, ...])
	const gfCandidate = inputArr[IMPORT_INDEX]
	const isGameFlowSection = Array.isArray(gfCandidate) && gfCandidate.length >= 3 && Array.isArray(gfCandidate[0]) && typeof gfCandidate[1] === "number" && Array.isArray(gfCandidate[2])

	if (forGameOver || !isGameFlowSection) {
		// Game over: sort highest money first
		store.gameflow.fullTurnOrder.sort((a, b) => store.players[b].money - store.players[a].money)
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		store.gameflow.phase = rf.PHASE_GAME_OVER
		store.gameflow.subphase = rf.SUBPHASE_HIRING
		store.gameflow.newTurnOrder = []
	} else {
		store.gameflow.fullTurnOrder = [...inputArr[IMPORT_INDEX][0]]
		store.gameflow.phase = inputArr[IMPORT_INDEX][1]
		store.gameflow.subphase = rf.SUBPHASE_HIRING
		store.gameflow.turnOrder = [...inputArr[IMPORT_INDEX][2]]
		store.gameflow.newTurnOrder = []
		if (inputArr[IMPORT_INDEX].length > 3) store.gameflow.newTurnOrder = [...inputArr[IMPORT_INDEX][3]]
		IMPORT_INDEX++
	}

	// Now if you aren't drafting modules, set up the rest of the player info
	// Now convert the resto / coffeeShop indices to internal indices
	// This needs to be AFTER all players have been imported, so store.players.length is correct
	if (store.gameflow.phase === rf.PHASE_SETUP_MODULES) {
		for (let i = 0; i < store.players.length; i++) store.players[i].coffeeShops.splice(0)
	}

	if (store.gameflow.phase !== rf.PHASE_SETUP_MODULES) {
		for (let i = 0; i < store.players.length; i++) {
			for (let j = 0; j < store.players[i].restaurants.length; j++) {
				store.players[i].restaurants[j].index = importIndex(store.players[i].restaurants[j].index)
			}
			for (let j = 0; j < store.players[i].coffeeShops.length; j++) {
				store.players[i].coffeeShops[j] = importIndex(store.players[i].coffeeShops[j])
			}
		}
		// Now add the player elements
		for (let i = 0; i < store.players.length; i++) {
			for (let j = 0; j < store.players[i].restaurants.length; j++) {
				map.addElement(rf.TYPE_RESTAURANT, store.players[i].colour, store.players[i].restaurants[j].index, false)
			}
			for (let j = 0; j < store.players[i].coffeeShops.length; j++) {
				map.addElement(rf.TYPE_COFFEE_SHOP, store.players[i].colour, store.players[i].coffeeShops[j], false)
			}
		}
	}

	// 4? - campaigns
	store.campaigns.splice(0)
	store.campaigns = inputArr[IMPORT_INDEX].map((c) => {
		const num = c[0]
		const isStandard = num <= 16

		// Create base object
		const campaign = {
			number: num,
			index: isStandard ? importIndex(c[1]) : 0,
			good: isStandard ? c[2] : c[1],
			duration: 9,
			rotated: false,
		}

		if (isStandard) {
			// Handle Duration
			if (c.length > 3 && c[3] <= 5) campaign.duration = c[3]

			// Handle Rotation logic (checks index 3 or 4 for the rotation flag 6)
			if (rf.ROTATABLE_CAMPAIGNS.includes(num)) {
				campaign.rotated = c[3] === 6 || (c.length > 4 && c[4] === 6)
			}
		} else {
			// Handle Gourmet/Rural campaign duration
			if (c.length > 2) campaign.duration = c[2]
		}

		return campaign
	})

	// Update the Map UI
	for (const camp of store.campaigns) {
		if (camp.number >= 1 && camp.number <= 16) {
			map.addElement(rf.TYPE_CAMPAIGN, camp.number, camp.index, camp.rotated)
		}
	}

	IMPORT_INDEX++

	// 5? - gardens
	store.gardens.splice(0)
	store.gardens = inputArr[IMPORT_INDEX].map((garden) => {
		return {
			index: importIndex(garden[0]),
			house: garden[1],
			rotated: garden.length === 3 ? garden[2] === 1 : false,
		}
	})

	// Update the Map UI
	for (const g of store.gardens) {
		map.addElement(rf.TYPE_GARDEN, -1, g.index, g.rotated)
	}

	IMPORT_INDEX++

	// 6? - houses
	store.houses.splice(0)
	store.houses = inputArr[IMPORT_INDEX].filter((house) => house[1] !== -1) // Remove invalid indices first
		.map((house) => {
			return {
				number: house[0],
				index: importIndex(house[1]),
				rotated: house.length === 3 ? house[2] : 0,
			}
		})

	// Update the Map UI
	for (const h of store.houses) {
		map.addElement(rf.TYPE_HOUSE, h.number, h.index, h.rotated)
	}

	IMPORT_INDEX++

	// 7? - ceoLevel
	const ceoLevel = inputArr[IMPORT_INDEX]
	
	store.ceoLevel = ceoLevel
	store.players.forEach((player) => {
		player.ceoSlots = player.milestones?.includes(rf.FIRST_BURGER_SOLD) ? 4 : ceoLevel
	})

	IMPORT_INDEX++

	// 8? - needs
	store.needs = inputArr[IMPORT_INDEX].map((house) => {
		const number = house[0]
		let needs = []

	if (store.gameflow.phase !== rf.PHASE_GAME_OVER) {
			// Standard Import: Extract all needs data directly
			needs = house.slice(1)
		} else {
			// Game Over Import: Convert flat goods list to [good, -1] format
			needs = house.slice(1).map((good) => [good, -1])
		}

		return { number, needs }
	})

	IMPORT_INDEX++

	// 9 & 10: History and Timestamps
	// 13[0] = refTS, 13 = hist, 14 = Relative TS
	//download(JSON.stringify(inputArr[18], null, 4), 'file.txt', 'txt') // file is filename, and txt is type of file.
	const rawHistory_old = inputArr[IMPORT_INDEX]
	const rawTimestamps_old = inputArr[IMPORT_INDEX + 1]

	let tRef = 0
	let historyIdx = 0

	// 1. Reconstruct History Objects
	store.history.splice(0)
	let tempHistory = []
	for (let i = 0; i < rawHistory_old.length; i++) {
		const entry = rawHistory_old[i]
		if (i === 0) {
			tRef = entry // Set initial timestamp reference
		} else {
			const histObj = {
				player: entry[0],
				action: entry[1],
				param: Array.isArray(entry[2]) ? entry[2] : [entry[2]],
				timestamp: 0, // Placeholder
			}

			// 2. Map the Relative Timestamp (from the next index in inputArr)
			const relativeTS = rawTimestamps_old[historyIdx] || 0
			histObj.timestamp = tRef + relativeTS

			// Update tRef for the next calculation
			tRef += relativeTS

			tempHistory.push(histObj)
			historyIdx++
		}
	}
	for (const histEntry of tempHistory) {
		store.history.push([histEntry.action, histEntry.player, histEntry.timestamp, histEntry.param])
	}

	// Move the global index forward twice (one for History, one for Timestamps)
	IMPORT_INDEX += 2

	// 11?? - freeways
	// 11: Rural Marketers (Freeways)
	if (store.startingOptions.ruralMarketers) {
		store.freeways.splice(0)
		store.freeways = inputArr[IMPORT_INDEX].map((f) => ({
			index: importIndex(f[0]),
			sides: f[1] === 1,
			rotated: f.length === 3 ? f[2] === 1 : false,
		}))

		for (const f of store.freeways) {
			map.addFreeway(f.index, f.rotated, f.sides)
		}
		IMPORT_INDEX++
	}

	// 12? & 13? Lobbyists (Parks and Roads)
	store.parks.splice(0)
	store.newRoads.splice(0)

	if (store.startingOptions.lobbyists) {
		// 12: Parks
		store.parks.splice(0)
		store.parks = inputArr[IMPORT_INDEX].map((p) => ({
			index: importIndex(p[0]),
			variety: p[1],
			rotation: p.length >= 3 ? p[2] : 0,
			flipped: p.length >= 4 ? p[3] === 1 : false,
		}))

		for (const p of store.parks) {
			const parkModel = rf.getParkModel(p.variety, p.rotation, p.flipped)
			map.addPark(p.index, parkModel)
		}
		IMPORT_INDEX++

		// 13: New Roads
		store.newRoads.splice(0)
		store.newRoads = inputArr[IMPORT_INDEX].map((r) => ({
			index: importIndex(r[0]),
			variety: r[1],
			rotation: r[2],
			turnAdded: !forGameOver && r.length >= 4 ? r[3] : 0,
		}))

		// Logic Note: Roads are usually added to map later once turn context is set
		IMPORT_INDEX++
	}

	if (store.gameflow.phase !== rf.PHASE_GAME_OVER) {
		// 14?? - coffeeShopMSplayers
		store.coffeeShopMSplayers.splice(0)

		Object.assign(store.coffeeShopMSplayers, inputArr[IMPORT_INDEX])
		IMPORT_INDEX++

		// 15?? - firstPizzas
		store.firstPizzas.splice(0)

		Object.assign(store.firstPizzas, inputArr[IMPORT_INDEX])
		IMPORT_INDEX++

		// 16?? - reserveCards
		store.reserveCards.splice(0)
		store.reserveCards = JSON.parse(JSON.stringify(inputArr[IMPORT_INDEX]))
		IMPORT_INDEX++

		if (includeContext) {
			// 17?? - context
			store.context.splice(0)
			Object.assign(store.context, JSON.parse(inputArr[IMPORT_INDEX]))
			IMPORT_INDEX++
		} else context.resetContext()
	} else {
		store.coffeeShopMSplayers.splice(0)
		store.firstPizzas.splice(0)
		store.reserveCards.splice(0)
		// Other unstored vars
	}

	if (!includeContext) context.resetContext()
	/*if (forReset) {
			m.context = inputArr[28]
			store.gameflow.subphase = inputArr[29]
		}*/

	// INFER m.bankBroken = inputArr[12]
	store.bankBroken = 0
	if (store.history.some((h) => h[0] === rf.HIST_DISPLAY_RESERVE)) store.bankBroken = 1

	// 3 - availableEmployees
	//m.availableEmployees = inputArr[3]
	// INTERNAL OPTIONS NEED TO BE SET BEFORE THIS
	store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
	store.availableMarketingCampaigns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]
	if (store.startingOptions.useMilestones === false) {
		store.availableMilestones.splice(0)
	} else {
		Object.assign(store.availableMilestones, rf.BASE_GAME_MILESTONES)
		if (store.startingOptions.noCeoMilestone === true) {
			store.availableMilestones.splice(store.availableMilestones.indexOf(rf.FIRST_100_DOL), 1)
		}
		if (store.startingOptions.noRadioMilestone === true) {
			store.availableMilestones.splice(store.availableMilestones.indexOf(rf.FIRST_RADIO_CAMPAIGN), 1)
		}
	}
	if (store.players.length > 2) store.availableMarketingCampaigns.push(12)
	if (store.players.length > 3) store.availableMarketingCampaigns.push(15)
	if (store.players.length > 4) store.availableMarketingCampaigns.push(16)
	// This needs to be BEFORE setupKetchupExpansion otherwise extra lux gets wiped
	if (store.players.length < 5) {
		let max = model.maxUnique(store.players.length)
		for (let i = 0; i < rf.BASE_UNIQUE_CARDS.length; i++) {
			store.availableEmployees[rf.BASE_UNIQUE_CARDS[i]] = max
		}
	}
	// This adds employees / MS / lux
	model.setupKetchupExpansion(store.players.length)

	// 2 - availableMarketingCampaigns
	//m.availableMarketingCampaigns = inputArr[2]
	// 4 - availableMilestones
	//m.availableMilestones = inputArr[4]
	for (let i = 0; i < store.players.length; i++) {
		// Remove employees from available
		for (let j = 0; j < store.players[i].employees.length; j++) {
			store.availableEmployees[store.players[i].employees[j]]--
		}
		// Remove Beach from available
		for (let j = 0; j < store.players[i].beach.length; j++) {
			store.availableEmployees[store.players[i].beach[j]]--
		}
		for (let j = 0; j < store.players[i].marketers.length; j++) {
			store.availableEmployees[store.players[i].marketers[j].marketer]--
		}
		// Remove MS from available
		for (let j = 0; j < store.players[i].milestones.length; j++) {
			removeItemAll(store.availableMilestones, store.players[i].milestones[j])
		}
	}
	// Infer from history
	if (store.history.length > 1) {
		if (store.history[store.history.length - 1][0] === rf.HIST_NEW_TURN) store.gameflow.turn = store.history[store.history.length - 1][3][0]
		// Readd MS that were taken this turn
		else if (store.history[store.history.length - 1][0] !== rf.HIST_NEW_TURN) {
			let idx = store.history.length - 1
			while (idx >= 0 && store.history[idx][0] !== rf.HIST_NEW_TURN) {
				if (store.gameflow.turn === 0 && store.history[idx][0] === rf.HIST_CHOOSE_TURN_ORDER) store.gameflow.turn = 1
				if (store.history[idx][0] === rf.HIST_NEW_MILESTONE) {
					if (!store.availableMilestones.includes(store.history[idx][3][0])) store.availableMilestones.push(store.history[idx][3][0])
				}
				idx--
				if (idx >= 0 && store.history[idx][0] === rf.HIST_NEW_TURN) store.gameflow.turn = store.history[idx][3][0]
			}
		}
	}

	// Check move from turn 0 to turn 1
	if (store.gameflow.turn === 0) {
		for (let i = store.history.length - 1; i >= 0; i--) {
			if (store.history[i][0] === rf.HIST_CHOOSE_RESERVE_CARD && store.gameflow.phase === rf.PHASE_TURN_ORDER) {
				store.gameflow.turn = 1
				break
			}
		}
	}

	// If game is over, double check the winner (from history) is at front of turn order - this is just needed to re-create money ties correctly
	if (forGameOver) {
		let winnerIdx = store.history[store.history.length - 1][3][0]
		// Guard: older broken saves stored the winner NAME here instead of an index.
		// The money sort already ordered turnOrder correctly, so just skip in that case.
		if (typeof winnerIdx === "number" && winnerIdx > -1 && store.gameflow.fullTurnOrder[0] !== winnerIdx) {
			// Move winner to front
			let idxInOrder = store.gameflow.fullTurnOrder.indexOf(winnerIdx)
			store.gameflow.fullTurnOrder.splice(idxInOrder, 1)
			store.gameflow.fullTurnOrder.unshift(winnerIdx)
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		}
	}

	// Must do this AFTER inferring the turn
	for (let roadCount = 0; roadCount < store.newRoads.length; roadCount++) {
		map.addNewRoad(store.newRoads[roadCount].index, store.newRoads[roadCount].variety, store.newRoads[roadCount].rotation, store.newRoads[roadCount].turnAdded === store.gameflow.turn)
	}

	// Remmove Campaigns
	for (let i = 0; i < store.campaigns.length; i++) {
		store.availableMarketingCampaigns.splice(store.availableMarketingCampaigns.indexOf(store.campaigns[i].number), 1)
	}

	// Remove HC MS
	if (store.startingOptions.newMilestones && store.gameflow.turn >= 3) {
		removeItemAll(store.availableMilestones, rf.FIRST_MARKETEER_USED)
		removeItemAll(store.availableMilestones, rf.FIRST_TRAINER_USED)
		removeItemAll(store.availableMilestones, rf.FIRST_RECRUITING_GIRL_USED)
	}
	if (store.startingOptions.hardChoices && store.gameflow.turn >= 3) {
		removeItemAll(store.availableMilestones, rf.FIRST_TRAIN)
		removeItemAll(store.availableMilestones, rf.FIRST_BURGER_MARKETED)
		removeItemAll(store.availableMilestones, rf.FIRST_PIZZA_MARKETED)
		removeItemAll(store.availableMilestones, rf.FIRST_DRINK_MARKETED)
	}
	if (store.startingOptions.hardChoices && store.gameflow.turn >= 4) {
		removeItemAll(store.availableMilestones, rf.FIRST_HIRE_3)
	}

	// Adjust CEOs with dumpling MS, using history
	if (store.startingOptions.dumplings) {
		for (let i = 0; i < store.history.length; i++) {
			if (store.history[i][0] === rf.HIST_CEO_BONUS_CHOSEN) {
				let pIdx = store.history[i][1]
				store.players[pIdx].ceoAction = store.history[i][3][0]
			}
		}
	}
}

export function simpleImportWholeFCMmodel(inputBase64) {
	const store = useModelStore()

	
	let compressedData = Uint8Array.from(atob(inputBase64), (c) => c.charCodeAt(0))
	// eslint-disable-next-line no-undef
	let decompressedData = pako.ungzip(compressedData, { to: "string" })
	let inputModel = JSON.parse(decompressedData)



	// Now set up internal options
	model.setInternalStartingOptions(store.externalStartingOptions)
	context.resetContextAndHighlights()

	// 0 = tiles
	//store.mapData.tiles = JSON.parse(JSON.stringify(inputModel[0]))
	//map.initCoords()
	store.mapData.tiles.splice(0)
	store.mapData.coords.splice(0)
	Object.assign(store.mapData.tiles, inputModel[0][0])
	Object.assign(store.mapData.coords, inputModel[0][1])
	view.setMapDisplayTiles()
	
	// 1 - array of exportPlayer(M)
	store.players.splice(0)
	Object.assign(store.players, inputModel[1])

	/*// Now convert the resto / coffeeShop indices to internal indices
	// This needs to be AFTER all players have been imported, so store.players.length is correct
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].restaurants.length; j++) {
			store.players[i].restaurants[j].index = m.importIndex(store.players[i].restaurants[j].index)
		}
		for (let j = 0; j < store.players[i].coffeeShops.length; j++) {
			store.players[i].coffeeShops[j] = m.importIndex(store.players[i].coffeeShops[j])
		}
	}*/
	// Now add the player elements
	/*for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].restaurants.length; j++) {
			map.addElement(rf.TYPE_RESTAURANT, store.players[i].colour, store.players[i].restaurants[j].index, false)
		}
		for (let j = 0; j < store.players[i].coffeeShops.length; j++) {
			map.addElement(rf.TYPE_COFFEE_SHOP, store.players[i].colour, store.players[i].coffeeShops[j], false)
		}
	}*/

	// 2 - availableMarketingCampaigns
	store.availableMarketingCampaigns.splice(0)
	Object.assign(store.availableMarketingCampaigns, inputModel[2])
	// 3 - availableEmployees
	store.availableEmployees.splice(0)
	Object.assign(store.availableEmployees, inputModel[3])
	// 4 - availableMilestones
	store.availableMilestones.splice(0)
	Object.assign(store.availableMilestones, inputModel[4])
	// 5 - bank
	store.bank = inputModel[5]
	// 6 - gameflow
	//store.gameflow.splice(0)
	Object.assign(store.gameflow, inputModel[6])
	// 7 - campaigns
	store.campaigns.splice(0)
	Object.assign(store.campaigns, inputModel[7])
	for (let i = 0; i < store.campaigns.length; i++) {
		if (store.campaigns[i].number >= 1 && store.campaigns[i].number <= 16) map.addElement(rf.TYPE_CAMPAIGN, store.campaigns[i].number, store.campaigns[i].index, store.campaigns[i].rotated)
	}

	// 8 - gardens
	store.gardens.splice(0)
	Object.assign(store.gardens, inputModel[8])
	for (let i = 0; i < store.gardens.length; i++) {
		map.addElement(rf.TYPE_GARDEN, -1, store.gardens[i].index, store.gardens[i].rotated)
	}

	// 9 - houses
	store.houses.splice(0)
	Object.assign(store.houses, inputModel[9])
	store.houses = store.houses.filter((h) => h.index >= 0)
	for (let i = 0; i < store.houses.length; i++) {
		map.addElement(rf.TYPE_HOUSE, store.houses[i].number, store.houses[i].index, store.houses[i].rotated)
	}

	// 10 - ceoLevel
	store.ceoLevel = inputModel[10]
	// 11 - needs
	store.needs.splice(0)
	Object.assign(store.needs, inputModel[11])
	// 12 - bankBroken
	store.bankBroken = inputModel[12]
	// 13 - history
	store.history.splice(0)
	Object.assign(store.history, inputModel[13])

	// 14 - freeways
	store.freeways.splice(0)
	Object.assign(store.freeways, inputModel[14])
	for (let i = 0; i < store.freeways.length; i++) {
		map.addFreeway(store.freeways[i].index, store.freeways[i].rotated, store.freeways[i].sides)
	}

	// 15 - parks
	store.parks.splice(0)
	Object.assign(store.parks, inputModel[15])
	//store.parks = JSON.parse(JSON.stringify(inputModel[15]))
	for (let parkCount = 0; parkCount < store.parks.length; parkCount++) {
		map.addPark(store.parks[parkCount].index, rf.getParkModel(store.parks[parkCount].variety, store.parks[parkCount].rotation, store.parks[parkCount].flipped))
	}

	// 16 - newRoads
	store.newRoads.splice(0)
	Object.assign(store.newRoads, inputModel[16])
	for (let roadCount = 0; roadCount < store.newRoads.length; roadCount++) {
		map.addNewRoad(store.newRoads[roadCount].index, store.newRoads[roadCount].variety, store.newRoads[roadCount].rotation, store.newRoads[roadCount].turnAdded === store.gameflow.turn)
	}

	// 17 - coffeeShopMSplayers
	store.coffeeShopMSplayers.splice(0)
	Object.assign(store.coffeeShopMSplayers, inputModel[17])
	// 18 - firstPizzas
	store.firstPizzas.splice(0)
	Object.assign(store.firstPizzas, inputModel[18])
	// 19 - reserveCards
	store.reserveCards.splice(0)
	Object.assign(store.reserveCards, inputModel[19])

	// 20 - context
	Object.assign(store.context, inputModel[20])

	// Adjust CEOs with dumpling MS, using history
	if (store.startingOptions.dumplings) {
		for (let i = 0; i < store.history.length; i++) {
			if (store.history[i][0] === rf.HIST_CEO_BONUS_CHOSEN) {
				let pIdx = store.history[i][1]
				store.players[pIdx].ceoAction = store.history[i][3][0]
			}
		}
	}
}
