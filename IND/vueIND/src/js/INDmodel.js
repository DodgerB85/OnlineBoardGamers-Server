/**
 * Contains functions that alter the game state,
 * IE anything that needs to be held in the "digital"
 * model.
 * So the functions in here should allow a replay of
 * the game to be re-created.
 * These should not directly update the "view" or
 * what the player sees.
 *
 * In general, it is better to provide all the required information
 * to the function (EG playerObj, hexes) rather than relying
 * on knowing the currentPlayer.
 * This makes it possible to more easily recreate replays later.
 *
 */
import { useModelStore } from "../stores/INDstore.js"
import { usePersonalStore } from "../stores/INDpersonal.js"

import * as rf from "./INDreference.js"
import * as map from "./INDmap.js"
import * as controller from "./INDcontroller.js"
import * as funcs from "./INDfuncs.js"
import * as mpf from "./INDshipping.js"
import * as view from "./INDview.js"
import * as replay from "./INDreplay.js"

import * as IO from "../backend/IND_IO.js"
import * as WS from "../backend/INDwebsocket.js"

export async function initGame() {
	const store = useModelStore()
	const personal = usePersonalStore()

	// Disallow any play whilst init-ing the game.
	personal.haltPlay = true
	if (window.initData.startingOptions.includes(1)) store.hiddenMoney = true
	// Put a data dump here to force a load
	//window.initData.gameData = 'H4sIAAAAAAAAA3VTyWpDMQz8l5xVsLz7WvoX5h0KCb2UFgL9/87Ijt1HKNm0vdFImvTeL9ef++3r+v55kT9mEHVOnPSeDuken/nGR8XbS2FXUS9NNBziHfzL2/f143Z/BdiyVDQPrMinn7AMD3YWjZJEUZEdkz1EJLvZydGk5cvDigFPdkAf9AJNott3EdKB/YL2qdVijlpls2DxiWxIguyiqw24bDljqKnBOrtVpa1GoxBWEWHAJFrAo6a5GAeLEVFg6wokNnc7H+DkyHjIM6BSKzCljIpIdqFxQj8DKqXY8szHrFJqRo80feQBYNua7RY71TO3cGbmd7Y9MVXJ7Ko+LWK+bh7klTZN0mq2QXMTm6F5H0fQzAWXqYrYJNZ5xtEVOz0W6ZjOpNu/63wmDcuVzE2o95t3YmTzVl5x+hl5SAa/Q/6Bk9jjEkj2xW8ZWZXugR4yj5UeV4XbjQFPvmFQoVxYllAOZClZSKFAMbaPGVJODSIUoLebdo5ivknT4YpZCuH2v0tM+zj88QuFVMuh5gMAAA=='

	// Set up all Data
	personal.gameID = window.initData.gameID
	store.gameName = window.initData.gameName
	personal.gameCreationTimestamp = window.initData.gameCreationTimestamp / 1000
	personal.finishedGame = window.initData.finishedGame

	store.refSize = window.initData.myZoomLevel * 100
	if (store.refSize === 0) store.refSize = store.mapData.selectedMapData.zoomSettings[2]

	personal.liveWS = false

	store.deleteVotesData = window.initData.deleteVotesData
	store.statsExcludeVotesData = window.initData.statsExcludeVotesData

	// Set up logged in player
	if (window.initData.name != undefined) {
		personal.name = window.initData.name
		store.chatData = funcs.decompressChatData(window.initData.chatData)
		personal.latestUpdate = window.initData.latestUpdate
	}

	personal.pov = window.initData.pov

	// Set up Involved Player data
	if (window.initData.pov >= 0) {
		personal.liveWS = true
		personal.pov = window.initData.pov
		personal.votedToDelete = store.deleteVotesData[personal.name]

		personal.secondsToNextKickout = window.initData.secondsToNextKickout
		personal.myStatsExcludeConsent = window.initData.myStatsExcludeConsent
		personal.statsExcludedGame = window.initData.statsExcludedGame

		personal.host = false
		if (window.initData.host) personal.host = true

		// Set up kickout timers / kickout option, if required
		if (personal.kickoutCountdownIntervalTimer != undefined) clearInterval(personal.kickoutCountdownIntervalTimer)
		if (personal.secondsToNextKickout <= 1200 && store.gameflow.phase !== rf.PHASE_GAME_OVER) personal.kickoutCountdownIntervalTimer = setInterval(view.kickoutTimerTicker, 1000)
		if (window.initData.kickoutRequired > 0) {
			personal.kickoutRequired = window.initData.kickoutRequired
			if (personal.kickoutRequired === 1) {
				if (personal.finishedGame) funcs.importModel(window.initData.gameData, false, true)
				else funcs.importModel(window.initData.gameData, false, false)
				let KickoutFlexiDataArray = window.initData.KickoutFlexiDataArray
				let secondsIn24Hours = 24 * 60 * 60
				let playerSeconds = 0

				// Iterate over the KickoutFlexiDataArray to find the player's entry
				for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
					let entry = KickoutFlexiDataArray[i]

					// Check if the entry is a length-2 array and the first element matches the playerName
					if (Array.isArray(entry) && entry.length === 2 && entry[0] === controller.currentPlayerObj().name) {
						playerSeconds = entry[1]
						break
					}
				}
				let remainingFlexSecondsBeforeThisMove = secondsIn24Hours - playerSeconds
				personal.flexiSecondsToNextKickout = remainingFlexSecondsBeforeThisMove + personal.secondsToNextKickout

				personal.kickoutFlexiCountdownIntervalTimer = setInterval(view.kickoutFlexiTimerTicker, 1000)
			}
		} // End setting up kickout data

		personal.notes = funcs.htmlUnescape(window.initData.notes)
		if (window.initData.chatNotification) store.topMenuViews.showChat = true
		personal.yourTurnAudioType = window.initData.yourTurnAudioType
		if (window.initData.startingOptions.includes(102)) personal.trainingGame = true

		// Set up and save new game
		if (window.initData.gameData === "") {
			const COLOURS = funcs.shuffle([rf.BLUE, rf.GREEN, rf.ORANGE, rf.PURPLE, rf.YELLOW])
			store.players.splice(0)
			for (let i = 0; i < window.initData.playerNames.length; i++) {
				store.players.push({
					name: window.initData.playerNames[i],
					displayName: "",
					colour: COLOURS[i],
					moneyCash: 100,
					moneyBank: 0,
					moneyRoundIncome: 0,
					RnD: [1, 1, 1, 1, 1],
					slots: [[], [], [], [], []],
					eraCards: [],
					preMoves: [],
				})
			}
			// Add extra RnD slots as required
			for (let i = 0; i < store.players.length; i++) {
				if (store.useMergerSubsidy && !store.useShippingSubsidy) store.players[i].RnD.push(1)
				else if (!store.useMergerSubsidy && store.useShippingSubsidy) store.players[i].RnD.push(-1, 1)
				else if (store.useMergerSubsidy && store.useShippingSubsidy) store.players[i].RnD.push(1, 1)
			}

			// Now insert display names
			for (let i = 0; i < store.players.length; i++) {
				if (store.players[i].name === "SHADOW" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[0]
				else if (store.players[i].name === "SHADOW_2" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[1]
				else if (store.players[i].name === "SHADOW_3" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[2]
				else if (store.players[i].name === "SHADOW_4" && window.initData.displayNames != undefined) store.players[i].displayName = window.initData.displayNames[3]
				else store.players[i].displayName = store.players[i].name
			}
			for (let i = 0; i < store.players.length; i++) {
				store.gameflow.turnOrder.push(i)
				store.gameflow.fullTurnOrder.push(i)
			}
			if (store.players.length === 2) {
				for (let i = 0; i < store.players.length; i++) {
					store.gameflow.turnOrder.push(i)
				}
			}

			// Set available Companies
			let firstEraCompanies = rf.ALL_COMPANIES.filter((company) => company.era === rf.ERA_A)
			if (store.mapData.selectedMap === rf.MAP_AEGEAN) firstEraCompanies = rf.AG_ALL_COMPANIES.filter((company) => company.era === rf.ERA_A)
			else if (store.mapData.selectedMap === rf.MAP_PHP) firstEraCompanies = rf.PH_ALL_COMPANIES.filter((company) => company.era === rf.ERA_A)

			let removedCompanyIDs = []
			if (store.mapData.selectedMap === rf.MAP_PHP) {
				// Remove 1 rice and 1 spice companies from ERA A
				const riceIDs = [4, 5, 6]
				const spiceIDs = [7, 8, 9]

				const removedRice = riceIDs[Math.floor(Math.random() * riceIDs.length)]
				const removedSpice = spiceIDs[Math.floor(Math.random() * spiceIDs.length)]
				removedCompanyIDs.push(removedRice, removedSpice)

				// Remove 2 companies of different types from era B

				const groups = [
					[12, 13], // Rice
					[14, 15, 16], // Spice
					[17, 18, 19], // Rubber
					[20], // SF
				]

				// 1. Flatten groups into a single list of objects { id, groupIndex }
				const pickableCompanies = groups.flatMap((ids, index) => ids.map((id) => ({ id, groupIndex: index })))

				// 2. Shuffle the entire list of companies
				const shuffledEraB = pickableCompanies.sort(() => Math.random() - 0.5)

				// 3. Pick the first company
				const firstPick = shuffledEraB[0]
				removedCompanyIDs.push(firstPick.id)

				// 4. Find the first company in the shuffled list that belongs to a DIFFERENT group
				const secondPick = shuffledEraB.find((company) => company.groupIndex !== firstPick.groupIndex)

				if (secondPick) {
					removedCompanyIDs.push(secondPick.id)
				}
				// Filter the companies list before mapping to the store
				firstEraCompanies = firstEraCompanies.filter((c) => !removedCompanyIDs.includes(c.id))
			}

			store.availableCompanies = firstEraCompanies.map((company) => JSON.parse(JSON.stringify(company)))

			// Deal era cards
			let shuffledEraCards = funcs.shuffle(rf.ALL_ERA_CARDS.slice())
			if (store.mapData.selectedMap === rf.MAP_AEGEAN) shuffledEraCards = funcs.shuffle(rf.AG_ALL_ERA_CARDS.slice())
			else if (store.mapData.selectedMap === rf.MAP_PHP) shuffledEraCards = funcs.shuffle(rf.PH_ALL_ERA_CARDS.slice())
			const playerCardsPerEra = store.players.length === 2 ? 2 : 1
			for (let era = rf.ERA_A; era <= rf.ERA_C; era++) {
				let thisEraCards = shuffledEraCards.filter((card) => card.era === era)
				for (let player of store.players) {
					for (let k = 0; k < playerCardsPerEra; k++) {
						player.eraCards.push(thisEraCards.pop().id)
					}
				}
			}
			addHistory(rf.HIST_NEW_GAME, -1, 0, [[...store.gameflow.fullTurnOrder]])
			addHistory(rf.HIST_NEW_ERA, -1, 0, [rf.ERA_A, [...removedCompanyIDs]])
		} // End NEW GAME
	} // end involved player

	// If new and no data, give an error; otherwise if new, save, otherwise, import data
	if (window.initData.pov < 0 && window.initData.gameData === "") {
		store.topMenuViews.rewindErrorText = "The game has not yet started"
		// Create the <h1> element
		var heading = document.createElement("h1")

		// Set the text content of the <h1> element
		heading.textContent = "The game has not yet started"

		// Get a reference to the body element
		var body = document.body

		// Append the <h1> element to the body
		body.appendChild(heading)
	} else if (window.initData.gameData === "") {
		await IO.saveGame(true)
		personal.haltPlay = true
	} else {
		// FInally, impport data
		if (personal.finishedGame) funcs.importModel(window.initData.gameData, false, true)
		else funcs.importModel(window.initData.gameData, false, false)

		// Import any pre-moves
		if (personal.pov >= 0) {
			store.players[personal.pov].preMoves.splice(0)
			if (window.initData.preMoves !== "") store.players[personal.pov].preMoves = [...funcs.decompressData(window.initData.preMoves)]
			store.preMovesCompressed = window.initData.sideData

			personal.votedToDelete = store.deleteVotesData[personal.name]
			personal.votedToExclude = store.statsExcludeVotesData[personal.name]
		}

		if (window.initData.spoilerFree) {
			// Enter replay mode at step 1
			store.topMenuViews.showReplay = true
			store.replayResetData = funcs.exportModel(true) // FIZ

			// TURM ON
			await replay.generateReplayData(true)
		}
	}

	personal.haltPlay = false

	if (personal.canPlay()) controller.startPlayerTurn()

	if (window.initData.pov >= 0) {
		WS.StartWebSocket().catch(() => {
			console.log("WebSocket background task initialized.")
		})
	}
}

export function addHistory(event, playerIndex, timeOffset, params) {
	const personal = usePersonalStore()
	const store = useModelStore()

	let time = Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp + timeOffset)
	if (store.history.length > 0) {
		for (let i = 0; i < store.history.length; i++) {
			time -= store.history[i][2]
		}
	}
	store.history.push([event, playerIndex, time, [...params]])
}

export function getOccupiedTerrIDs() {
	const store = useModelStore()

	const occupiedTerrIDs = []

	// Collect territory IDs from cities
	for (const city of store.cities) {
		occupiedTerrIDs.push(city.territory)
	}

	// Collect territory IDs from active companies
	for (const company of store.activeCompanies) {
		occupiedTerrIDs.push(...company.territories.map((territory) => territory[0]))
	}

	return occupiedTerrIDs
}

export function addCity(terrID) {
	const store = useModelStore()

	addCity_core(terrID, controller.currentPlayerIndex(), store.context.selectedEraCard)

	addHistory(rf.HIST_ADD_CITY, controller.currentPlayerIndex(), 0, [terrID, store.context.selectedEraCard])
}

export function addCity_core(terrID, playerIndex, eraCardID) {
	const store = useModelStore()
	store.cities.push({
		territory: terrID,
		size: 1,
		receivedGoods: [],
	})

	store.players[playerIndex].eraCards = store.players[playerIndex].eraCards.filter((cardID) => cardID !== eraCardID)
}

export function setupEraCardHighlights(cardID) {
	const store = useModelStore()
	store.context.action = rf.ACT_PLACE_CITY

	let card = rf.ALL_ERA_CARDS.find((card) => card.id === cardID)
	if (store.mapData.selectedMap === rf.MAP_AEGEAN) card = rf.AG_ALL_ERA_CARDS.find((card) => card.id === cardID)
	else if (store.mapData.selectedMap === rf.MAP_PHP) card = rf.PH_ALL_ERA_CARDS.find((card) => card.id === cardID)

	// if there are already 12 level 1 cities, don't highlight anything
	let cityCount = 0

	for (let i = 0; i < store.cities.length; i++) {
		if (store.cities[i].size === 1) cityCount++
	}

	if (cityCount >= 12) {
		store.context.territoriesToHighlight.splice(0)
		store.context.territoriesToHighlightRed.splice(0)
		return
	}

	// Highlight the terrs
	let validTerrs = []
	let invalidTerrs = []

	for (let i = 0; i < card.provinces.length; i++) {
		if (doesProvinceContainCity(card.provinces[i])) invalidTerrs = invalidTerrs.concat(map.getWholeProvinceTerrIDs(card.provinces[i]))
		else validTerrs = validTerrs.concat(map.getWholeProvinceTerrIDs(card.provinces[i]))
	}
	let occupiedTerrs = getOccupiedTerrIDs()
	for (let i = validTerrs.length - 1; i >= 0; i--) {
		if (!map.isCoastal(validTerrs[i])) {
			invalidTerrs.push(validTerrs[i])
			validTerrs.splice(i, 1)
		} else if (occupiedTerrs.includes(validTerrs[i])) {
			invalidTerrs.push(validTerrs[i])
			validTerrs.splice(i, 1)
		}
	}

	store.context.territoriesToHighlight.splice(0)
	store.context.territoriesToHighlight.push(...validTerrs)

	store.context.territoriesToHighlightRed.splice(0)
	store.context.territoriesToHighlightRed.push(...invalidTerrs)
}

export function doesProvinceContainCity(provinceID) {
	/*const store = useModelStore()
	return store.cities.some((city) => map.getWholeProvinceTerrIDs(provinceID).includes(city.territory))*/
	const store = useModelStore()
	const provinceTerritoryIDs = new Set(map.getWholeProvinceTerrIDs(provinceID))

	for (const city of store.cities) {
		if (provinceTerritoryIDs.has(city.territory)) {
			return true // Found a match, no need to continue
		}
	}

	return false // No match found
}

export function completeMerger() {
	const store = useModelStore()
	let winningPlayerIndex = store.ongoingVars.currentBidderIndex
	let winningBidAmount = store.ongoingVars.currentBid
	let mergingCompanies = store.ongoingVars.selectedMergerInfo

	let siapFajiMergerOrShipRedeployment = completeMerger_core(winningPlayerIndex, winningBidAmount, mergingCompanies)
	// siapFajiMerger = [siapFajiMerger INT, newSlotIdx]
	// If no SF and no merger, just go back to mergers
	if (siapFajiMergerOrShipRedeployment[0] === 0) {
		// Make sure phase is set back to merger phase
		store.resetOngoingVars(false)
		// Resetting ongoing vars REMOVES the passed players. So need to reform the turn order
		let currentPlayerIndex = store.gameflow.turnOrder[0]
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		if (currentPlayerIndex) {
			while (store.gameflow.turnOrder[0] !== currentPlayerIndex) store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
		}
		if (store.gameflow.turnOrder.length > 0) store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())

		store.gameflow.phase = rf.PHASE_MERGERS
	}
	// Else if SF merger, go to terr reduction
	else if (siapFajiMergerOrShipRedeployment[0] === 1) {
		store.resetOngoingVars(false)
		// Resetting ongoing vars REMOVES the passed players. So need to reform the turn order
		let currentPlayerIndex = store.gameflow.turnOrder[0]
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		if (currentPlayerIndex !== undefined) {
			while (store.gameflow.turnOrder[0] !== currentPlayerIndex) store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
		}
		if (store.gameflow.turnOrder.length > 0) store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())

		let newSlotIdx = siapFajiMergerOrShipRedeployment[1]
		let totalTerrs = 0
		for (let i = 0; i < store.players[winningPlayerIndex].slots[newSlotIdx].length; i++) totalTerrs += getActiveCompanyDataFromID(store.players[winningPlayerIndex].slots[newSlotIdx][i]).territories.length
		// You must remove half, rounded up
		let terrsToRemove = Math.ceil(totalTerrs / 2)
		// See if we can remove any that are already directly adjacent to SF companies
		let SFterrIDs = []
		for (let i = 0; i < store.activeCompanies.length; i++) {
			if (store.activeCompanies[i].type === rf.COMPANY_SIAP_FAJI && !store.players[winningPlayerIndex].slots[newSlotIdx].includes(store.activeCompanies[i].id)) {
				SFterrIDs = SFterrIDs.concat(store.activeCompanies[i].territories.map((territory) => territory[0]))
			}
		}
		// Now get all the neighbours of the SF terrs
		let SFneighbours = []
		for (let i = 0; i < SFterrIDs.length; i++) {
			SFneighbours = SFneighbours.concat(store.mapData.landNeighbours[SFterrIDs[i]])
		}
		SFneighbours = [...new Set(SFneighbours)]
		// Now remove any terrs that are in the SF neighbours
		for (let i = 0; i < store.players[winningPlayerIndex].slots[newSlotIdx].length; i++) {
			let company = getActiveCompanyDataFromID(store.players[winningPlayerIndex].slots[newSlotIdx][i])
			for (let j = company.territories.length - 1; j >= 0; j--) {
				if (SFneighbours.includes(company.territories[j][0])) {
					company.territories.splice(j, 1)
					terrsToRemove--
				}
			}
		}
		if (terrsToRemove <= 0) {
			// Now a merger is complete, so end that players merger turn
			// Moved to above
			//store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
			store.gameflow.phase = rf.PHASE_MERGERS
		} else if (terrsToRemove > 0) {
			// End the current player merger turn
			// moved to above
			//store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
			// Add the winning player to front of the turn order
			store.gameflow.turnOrder.unshift(winningPlayerIndex)
			// Need to remove more territories
			store.ongoingVars.siapFajiOrShippingTerrsToRemoveData = [winningPlayerIndex, [...store.players[winningPlayerIndex].slots[newSlotIdx]], terrsToRemove]
			store.gameflow.phase = rf.PHASE_MERGER_REMOVE_SIAP_FAJI_TERRS
		}
	} // End siap faji merger
	// Else if ship redeployment, go to ship redeployment
	else if (siapFajiMergerOrShipRedeployment[0] === 2) {
		store.resetOngoingVars(false)
		// Resetting ongoing vars REMOVES the passed players. So need to reform the turn order
		let currentPlayerIndex = store.gameflow.turnOrder[0]
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		if (currentPlayerIndex !== undefined) {
			while (store.gameflow.turnOrder[0] !== currentPlayerIndex) store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
		}
		if (store.gameflow.turnOrder.length > 0) store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())

		let newSlotIdx = siapFajiMergerOrShipRedeployment[1]
		let newTerrs = []
		for (let i = 0; i < store.players[winningPlayerIndex].slots[newSlotIdx].length; i++) newTerrs = newTerrs.concat(getActiveCompanyDataFromID(store.players[winningPlayerIndex].slots[newSlotIdx][i]).territories)
		// Extract just the terrIDs: [123, 127, 123, 124, 128]
		const terrIDs = newTerrs.map((entry) => entry[0])
		// A Set only keeps unique values. If size < length, there was a duplicate.
		//const hasDuplicates = new Set(terrIDs).size !== terrIDs.length
		const duplicates = terrIDs.filter((id, index) => terrIDs.indexOf(id) !== index)
		// Add the winning player to front of the turn order
		store.gameflow.turnOrder.unshift(winningPlayerIndex)
		// Need to remove more territories
		store.ongoingVars.siapFajiOrShippingTerrsToRemoveData = [winningPlayerIndex, [...store.players[winningPlayerIndex].slots[newSlotIdx]], duplicates]
		store.gameflow.phase = rf.PHASE_MERGER_SHIP_REDEPLOYMENT
	} // End siap faji merger
}

export function completeMerger_core(winningPlayerIndex, winningBidAmount, mergingCompanies) {
	const store = useModelStore()

	//[playerIndex, slotIdx, totalTerrs]

	// First, take the money from the winning player
	let mergerSubsidyAmount = 0
	let netWinningBidAmount = winningBidAmount
	if (store.useMergerSubsidy) mergerSubsidyAmount = (store.players[winningPlayerIndex].RnD[rf.RnD_MERGER_SUBSIDY_IDX] - 1) * 100
	if (mergerSubsidyAmount > 0) netWinningBidAmount = Math.max(netWinningBidAmount - mergerSubsidyAmount, 0)

	store.players[winningPlayerIndex].moneyCash -= netWinningBidAmount

	// Then distribute the money to the previous owners.
	// If the company was NOT owned by the merger winner, then they get all the cash
	const company0income = winningBidAmount * (mergingCompanies[0][2] / (mergingCompanies[0][2] + mergingCompanies[1][2]))
	const company1income = winningBidAmount * (mergingCompanies[1][2] / (mergingCompanies[0][2] + mergingCompanies[1][2]))
	// Firstly, if you owned both comps, you cannot get back more than netWinningBidAmount
	if (winningPlayerIndex === mergingCompanies[0][0] && winningPlayerIndex === mergingCompanies[1][0]) {
		store.players[winningPlayerIndex].moneyCash += Math.min(netWinningBidAmount, company0income + company1income)
	}
	// Otherwise, you did not own both
	else {
		// If you didn't own them, they get all the money
		if (mergerSubsidyAmount === 0 || mergingCompanies[0][0] !== winningPlayerIndex) store.players[mergingCompanies[0][0]].moneyCash += company0income
		if (mergerSubsidyAmount === 0 || mergingCompanies[1][0] !== winningPlayerIndex) store.players[mergingCompanies[1][0]].moneyCash += company1income
		// If company 0 was owned by the winning player, then the refund is capped by the netWinningBidAmount
		if (mergerSubsidyAmount > 0 && mergingCompanies[0][0] === winningPlayerIndex) {
			let income = company0income
			if (income > netWinningBidAmount) income = netWinningBidAmount
			store.players[mergingCompanies[0][0]].moneyCash += income
		}
		if (mergerSubsidyAmount > 0 && mergingCompanies[1][0] === winningPlayerIndex) {
			let income = company1income
			if (income > netWinningBidAmount) income = netWinningBidAmount
			store.players[mergingCompanies[1][0]].moneyCash += income
		}
	}

	// Then remove the companies from the old slots
	let newSlotArray = [...store.players[mergingCompanies[0][0]].slots[mergingCompanies[0][1]]]
	newSlotArray = newSlotArray.concat(store.players[mergingCompanies[1][0]].slots[mergingCompanies[1][1]])

	store.players[mergingCompanies[0][0]].slots[mergingCompanies[0][1]].splice(0)
	store.players[mergingCompanies[1][0]].slots[mergingCompanies[1][1]].splice(0)

	let siapFajiMergerOrShipRedeployment = 0
	for (let i = 0; i < newSlotArray.length; i++) {
		let company1Type = getActiveCompanyDataFromID(newSlotArray[i]).type
		for (let j = i + 1; j < newSlotArray.length; j++) {
			let company2Type = getActiveCompanyDataFromID(newSlotArray[j]).type
			if (company1Type !== company2Type) {
				siapFajiMergerOrShipRedeployment = 1
				break
			}
		}
		if (siapFajiMergerOrShipRedeployment === 1) break
	}

	let newSlotIdx = -1

	// Then add them to the new slot
	for (let i = 0; i < store.players[winningPlayerIndex].slots.length; i++) {
		if (store.players[winningPlayerIndex].slots[i].length === 0) {
			newSlotIdx = i
			let slot = store.players[winningPlayerIndex].slots[i]
			slot.push(...newSlotArray)
			// Set the new owner, and mark as merged
			for (let j = 0; j < slot.length; j++) {
				let company = getActiveCompanyDataFromID(slot[j])
				company.ownerIndex = winningPlayerIndex
				company.mergedThisPhase = true
				if (siapFajiMergerOrShipRedeployment === 1) {
					company.siapFaji = true
					company.type = rf.COMPANY_SIAP_FAJI
					company.goodsGfx = "prod_marker_siap_faji"
					company.good = rf.GOOD_SIAP_FAJI
					company.typeText = "Siap Saji"
					company.goodValue = 35
				}
			}
			// if it's shipping, set all gfx to the same, move terrs to slot 0, update combined capacity
			if (getActiveCompanyDataFromID(slot[0]).type === rf.COMPANY_SHIPPING) {
				let selectedGfx = ""
				for (let j = 0; j < slot.length; j++) {
					selectedGfx = getActiveCompanyDataFromID(slot[j]).shipGfx
					if (rf.MAIN_FOUR_SHIP_GFX_ARRAY_FANCY.includes(selectedGfx)) break
				}
				for (let j = 0; j < slot.length; j++) {
					getActiveCompanyDataFromID(slot[j]).shipGfx = selectedGfx
					if (j !== 0) {
						let terrs = getActiveCompanyDataFromID(slot[j]).territories.splice(0)
						getActiveCompanyDataFromID(slot[0]).territories.push(...terrs)
					}
				}
				// Update Capacity
				let newCapacity = [0, 0, 0]
				for (let j = 0; j < slot.length; j++) {
					let oldCapacity = getActiveCompanyDataFromID(slot[j]).capacity
					newCapacity[0] += oldCapacity[0]
					newCapacity[1] += oldCapacity[1]
					newCapacity[2] += oldCapacity[2]
				}
				for (let j = 0; j < slot.length; j++) {
					getActiveCompanyDataFromID(slot[j]).combinedCapacity = [...newCapacity]
				}
				// set the company hull capacity
				for (let j = 0; j < slot.length; j++) {
					getActiveCompanyDataFromID(slot[j]).hullCapacity = store.players[winningPlayerIndex].RnD[rf.RnD_HULL_IDX]
					// update all the terrs
					for (let k = 0; k < getActiveCompanyDataFromID(slot[j]).territories.length; k++) {
						getActiveCompanyDataFromID(slot[j]).territories[k][1] = store.players[winningPlayerIndex].RnD[rf.RnD_HULL_IDX]
					}
				}
			}
			break
		}
	}

	// Now check for possible ship redeployment
	if (store.useShipRedeployment && getActiveCompanyDataFromID(store.players[winningPlayerIndex].slots[newSlotIdx][0]).type === rf.COMPANY_SHIPPING) {
		const newTerrs = getActiveCompanyDataFromID(store.players[winningPlayerIndex].slots[newSlotIdx][0]).territories

		// Extract just the terrIDs: [123, 127, 123, 124, 128]
		const terrIDs = newTerrs.map((entry) => entry[0])

		// A Set only keeps unique values. If size < length, there was a duplicate.
		const hasDuplicates = new Set(terrIDs).size !== terrIDs.length

		if (hasDuplicates) {
			siapFajiMergerOrShipRedeployment = 2
		}
	}

	return [siapFajiMergerOrShipRedeployment, newSlotIdx]
}

export function setupPaidExpansion() {
	const store = useModelStore()

	store.removeAllActiveHighlights()
	store.context.currentGoodJourney.splice(0)
	store.context.historyObj.push([-1])
	store.clearMessages()

	store.context.action = rf.ACT_EXPAND_COMPANY
	store.context.remainingExpansions = controller.currentPlayerObj().RnD[rf.RnD_EXPANSION_IDX]
	let slotIdx = store.context.selectedSlotToOperate
	let slot = controller.currentPlayerObj().slots[slotIdx]
	store.context.territoriesToHighlightBlue = [...getAllTerrIDsForSlot(slot)]
	store.context.territoriesToHighlight = [...getValidTerrsForExpansionFromLandSlotIdx(slotIdx)]

	if (store.context.territoriesToHighlight.length === 0) {
		store.gameMessages.actionError = "There are no valid territories to expand into"
		return
	}
}

export function getSlotTerrSize(playerIndex, slotIdx) {
	const store = useModelStore()

	let size = 0
	for (let i = 0; i < store.players[playerIndex].slots[slotIdx].length; i++) {
		let company = getActiveCompanyDataFromID(store.players[playerIndex].slots[slotIdx][i])
		size += company.territories.length
	}
	return size
}

export function setupExpansionHighlights(slotIdx) {
	const store = useModelStore()

	let slot = controller.currentPlayerObj().slots[slotIdx]

	// Check if it's a shipping group
	if (getActiveCompanyDataFromID(slot[0]).type === rf.COMPANY_SHIPPING) {
		let validTerrs = []
		let company = getActiveCompanyDataFromID(slot[0])

		let remainingShipCompanyExpansions = getActiveCompanyDataFromID(controller.currentPlayerObj().slots[slotIdx][0]).combinedCapacity[store.gameflow.currentEra] - getSlotTerrSize(controller.currentPlayerIndex(), slotIdx)

		store.context.remainingExpansions = Math.min(store.context.remainingExpansions, remainingShipCompanyExpansions)

		if (store.context.remainingExpansions <= 0) {
			store.gameMessages.actionError = "No more expansions for this company"
			store.context.action = rf.ACT_CONFIRM_END_TURN
			return
		}

		// Collect existing ship markers to pulse
		store.context.shipMarkersToPulse.splice(0) // Clear existing
		for (let i = 0; i < slot.length; i++) {
			let company = getActiveCompanyDataFromID(slot[i])
			for (let j = 0; j < company.territories.length; j++) {
				// Add existing ship markers to pulse array
				store.context.shipMarkersToPulse.push([company.id, company.territories[j][0]])
			}
		}

		for (let i = 0; i < company.territories.length; i++) {
			validTerrs.push(company.territories[i][0])
		}

		//let currentTerrs = []
		// Join all existing territories
		for (let i = 0; i < slot.length; i++) {
			let company = getActiveCompanyDataFromID(slot[i])
			for (let j = 0; j < company.territories.length; j++) {
				//currentTerrs = currentTerrs.concat(company.territories[j])
				validTerrs = validTerrs.concat(store.mapData.seaNeighbours[company.territories[j][0]])
			}
		}
		// Uniq
		validTerrs = [...new Set(validTerrs)]
		store.context.territoriesToHighlight = [...validTerrs]
		store.context.action = rf.ACT_EXPAND_COMPANY
		return
	}

	// So now it must be a land slot
	// Outline the company territories in blue
	store.context.territoriesToHighlightBlue = [...getAllTerrIDsForSlot(slot)]
	store.context.territoriesToHighlight = [...getValidTerrsForExpansionFromLandSlotIdx(slotIdx)]

	// As this is the first good, they are all available
	if (store.context.territoriesToHighlight.length === 0) {
		// ADD THE HISTORY HERE, AS EXPANSION STOPS HERE IN THE CASE OF RUNNING OUT OF TERRS
		// If only doing paids, concat it with entry 1
		if (store.context.historyObj.length === 2 && store.context.historyObj[1][0] === -1) store.context.historyObj[1] = [...store.context.historyObj[1], ...store.context.currentGoodJourney]
		// If doing paids after shipping, concat with last entry
		else if (store.context.historyObj[store.context.historyObj.length - 1][0] === -1) store.context.historyObj[store.context.historyObj.length - 1] = [...store.context.historyObj[store.context.historyObj.length - 1], ...store.context.currentGoodJourney]
		// Otherwise, add a new entry
		else store.context.historyObj.push([...store.context.currentGoodJourney])

		store.gameMessages.actionError = "There are no valid territories to expand into"
		store.context.action = rf.ACT_CONFIRM_END_TURN
		return
	}
}

export function acquireCompany(companyID) {
	const store = useModelStore()

	acquireCompany_core(controller.currentPlayerIndex(), companyID)

	store.context.acquiredCompany = true

	store.context.historyObj.splice(0)
	store.context.historyObj.push(companyID)

	store.context.action = rf.ACT_FREE_EXPANSION

	//let newCompany = store.activeCompanies.find((company) => company.id === companyID)

	// Highlight the terrs
	store.context.territoriesToHighlight.splice(0)
	store.context.territoriesToHighlightRed.splice(0)
	const ret = getTerritoryIDsToHighlightForNewCompany(companyID)
	store.context.territoriesToHighlight.push(...ret.territoriesToHighlight)
	store.context.territoriesToHighlightRed.push(...ret.territoriesToHighlightRed)
}

export function getTerritoryIDsToHighlightForNewCompany(companyID) {
	const store = useModelStore()
	let newCompany = rf.ALL_COMPANIES.find((company) => company.id === companyID)
	if (store.mapData.selectedMap === rf.MAP_AEGEAN) newCompany = rf.AG_ALL_COMPANIES.find((company) => company.id === companyID)
	else if (store.mapData.selectedMap === rf.MAP_PHP) newCompany = rf.PH_ALL_COMPANIES.find((company) => company.id === companyID)
	let ret = {
		territoriesToHighlight: [],
		territoriesToHighlightRed: [],
	}
	if (newCompany.type === rf.COMPANY_SHIPPING) {
		let provinceTerrs = map.getWholeProvinceTerrIDs(newCompany.province)
		// Make an exception for PHP mal/dav
		if (store.mapData.selectedMap === rf.MAP_PHP && companyID === 11) provinceTerrs = provinceTerrs.concat(map.getWholeProvinceTerrIDs(rf.PH_PROVINCE_DAV))
		let validTerrs = []
		for (let i = 0; i < provinceTerrs.length; i++) {
			validTerrs = validTerrs.concat(store.mapData.seaNeighbours[provinceTerrs[i]])
		}
		for (let i = 0; i < validTerrs.length; i++) {
			if (map.isSeaTerritory(validTerrs[i])) ret.territoriesToHighlight.push(validTerrs[i])
		}
	} else {
		// Set up land terrs to start company on
		let validTerrs = map.getWholeProvinceTerrIDs(newCompany.province)
		let invalidTerrs = []

		// Remove occupied terrs
		let occupiedTerrs = getOccupiedTerrIDs()
		for (let i = validTerrs.length - 1; i >= 0; i--) {
			if (occupiedTerrs.includes(validTerrs[i])) {
				invalidTerrs.push(validTerrs[i])
				validTerrs.splice(i, 1)
			}
		}

		// Remove neighbours of current same type comp
		let blockedTerrs = []
		for (let i = 0; i < store.activeCompanies.length; i++) {
			if (store.activeCompanies[i].type === newCompany.type && store.activeCompanies[i].id !== newCompany.id) {
				for (let j = 0; j < store.activeCompanies[i].territories.length; j++) {
					blockedTerrs = blockedTerrs.concat(store.mapData.landNeighbours[store.activeCompanies[i].territories[j][0]])
				}
			}
		}
		blockedTerrs = [...new Set(blockedTerrs)]

		// remove blocked terrs
		for (let i = validTerrs.length - 1; i >= 0; i--) {
			if (blockedTerrs.includes(validTerrs[i])) {
				invalidTerrs.push(validTerrs[i])
				validTerrs.splice(i, 1)
			}
		}

		ret.territoriesToHighlight = [...validTerrs]

		ret.territoriesToHighlightRed = [...invalidTerrs]
	}
	return ret
}

export function acquireCompany_core(playerIndex, companyID) {
	const store = useModelStore()

	let foundComp
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) foundComp = rf.ALL_COMPANIES.find((company) => company.id === companyID)
	else if (store.mapData.selectedMap === rf.MAP_AEGEAN) foundComp = rf.AG_ALL_COMPANIES.find((company) => company.id === companyID)
	else if (store.mapData.selectedMap === rf.MAP_PHP) foundComp = rf.PH_ALL_COMPANIES.find((company) => company.id === companyID)
	store.activeCompanies.push(JSON.parse(JSON.stringify(foundComp)))

	// Get the first empty slot in the player's list of companies
	let firstEmptySlotIndex = store.players[playerIndex].slots.findIndex((slot) => slot.length === 0)
	store.players[playerIndex].slots[firstEmptySlotIndex].push(companyID)

	let newCompany = store.activeCompanies.find((company) => company.id === companyID)
	newCompany.ownerIndex = playerIndex
	newCompany.territories.splice(0)
	newCompany.hullCapacity = store.players[playerIndex].RnD[rf.RnD_HULL_IDX]
	if (newCompany.type === rf.COMPANY_SHIPPING) {
		let allShipGfx = JSON.parse(JSON.stringify(rf.MAIN_FOUR_SHIP_GFX_ARRAY_FANCY))
		if (store.options.shipIconsToUse === 0) allShipGfx = JSON.parse(JSON.stringify(rf.MAIN_FOUR_SHIP_GFX_ARRAY_SIMPLE))
		let availableShipGfx = [...allShipGfx]
		for (let i = 0; i < store.activeCompanies.length; i++) {
			if (store.activeCompanies[i].type === rf.COMPANY_SHIPPING) {
				availableShipGfx = availableShipGfx.filter((shipGfx) => view.SHIP_GFX_TO_NUM(shipGfx) !== view.SHIP_GFX_TO_NUM(store.activeCompanies[i].shipGfx))
			}
		}
		if (availableShipGfx.length === 0 && store.options.shipIconsToUse === 1) availableShipGfx = JSON.parse(JSON.stringify(rf.BACkUP_TWO_SHIP_GFX_ARRAY_FANCY))
		if (availableShipGfx.length === 0 && store.options.shipIconsToUse === 0) availableShipGfx = JSON.parse(JSON.stringify(rf.BACkUP_TWO_SHIP_GFX_ARRAY_SIMPLE))
		for (let i = 0; i < store.activeCompanies.length; i++) {
			if (store.activeCompanies[i].type === rf.COMPANY_SHIPPING) {
				availableShipGfx = availableShipGfx.filter((shipGfx) => view.SHIP_GFX_TO_NUM(shipGfx) !== view.SHIP_GFX_TO_NUM(store.activeCompanies[i].shipGfx))
			}
		}
		funcs.shuffle(availableShipGfx)
		newCompany.shipGfx = availableShipGfx.shift()
	}
	store.availableCompanies = store.availableCompanies.filter((company) => company.id !== companyID)

	// For replay only
	return firstEmptySlotIndex
}

/*export function addProductionMarkerToTerritory(companyID, terrID) {
	const store = useModelStore()

	let company = store.activeCompanies.find((company) => company.id === companyID)
	if (rf.LAND_COMPANIES.includes(company.type)) addProductionMarkerToTerritory_core(controller.currentPlayerIndex(), companyID, terrID)
	else {
		addTerritoryToShipComany_core(controller.currentPlayerIndex(), companyID, terrID)
		view.updateShipMarkerViewData()
	}
	view.updateCompanyViewData()

	// If setting up a new company, go to end turn confirm
	if (store.context.action === rf.ACT_PLACE_FIRST_COMPANY_GOOD) {
		store.context.action = rf.ACT_CONFIRM_END_TURN
		store.context.selectedCompanyToAcquire = -1
	}
}*/

/*export function addProductionMarkerToTerritory_core(playerIndex, companyID, terrID) {
	const store = useModelStore()

	let company = store.activeCompanies.find((company) => company.id === companyID)
	company.territories.push([terrID, false])
}

export function addTerritoryToShipComany_core(playerIndex, companyID, terrID) {
	const store = useModelStore()

	let company = store.activeCompanies.find((company) => company.id === companyID)
	company.territories.push([terrID, 0])
}*/

export function expandCompany(slotIdx, terrID) {
	const store = useModelStore()

	if (store.gameflow.phase === rf.PHASE_OPERATIONS) store.context.canChangeOperatingCompany = false

	let forFree = true
	// NB - only gets comp[0]
	let company = store.activeCompanies.find((company) => company.id === store.players[controller.currentPlayerIndex()].slots[slotIdx][0])
	if (company.type !== rf.COMPANY_SHIPPING && store.context.action !== rf.ACT_FREE_EXPANSION && store.gameflow.phase !== rf.PHASE_ACQUISITIONS) forFree = false

	expandCompany_core(controller.currentPlayerIndex(), slotIdx, terrID, forFree)

	if (store.gameflow.phase === rf.PHASE_ACQUISITIONS) {
		store.context.historyObj.push(terrID)
		if (company.type === rf.COMPANY_SHIPPING) store.context.historyObj.push(view.SHIP_GFX_TO_NUM(company.shipGfx))
		addHistory(rf.HIST_ACQUIRE_COMPANY, controller.currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
		store.clearVars()
		store.context.action = rf.ACT_CONFIRM_END_TURN
		return
	}

	// Otherwise, operating a company
	store.context.remainingExpansions--
	if (company.type === rf.COMPANY_SHIPPING) store.context.historyObj.push(terrID)
	else store.context.currentGoodJourney.push(terrID)

	if (store.context.remainingExpansions <= 0) {
		store.context.shipMarkersToPulse.splice(0)
		// Only add CGJ if land comp
		if (getActiveCompanyDataFromID(store.players[controller.currentPlayerIndex()].slots[slotIdx][0]).type !== rf.COMPANY_SHIPPING) {
			// If only doing paids, concat it with entry 1
			if (store.context.historyObj.length === 2 && store.context.historyObj[1][0] === -1) store.context.historyObj[1] = [...store.context.historyObj[1], ...store.context.currentGoodJourney]
			// If doing paids after shipping, concat with last entry
			else if (store.context.historyObj[store.context.historyObj.length - 1][0] === -1) store.context.historyObj[store.context.historyObj.length - 1] = [...store.context.historyObj[store.context.historyObj.length - 1], ...store.context.currentGoodJourney]
			// Otherwise, add a new entry
			else store.context.historyObj.push([...store.context.currentGoodJourney])
		}
		//store.clearVars()
		store.context.action = rf.ACT_CONFIRM_END_TURN
	} else {
		setupExpansionHighlights(slotIdx)
	}
}

export function expandCompany_core(playerIndex, slotIdx, terrID, forFree) {
	const store = useModelStore()

	let company = store.activeCompanies.find((company) => company.id === store.players[playerIndex].slots[slotIdx][0])
	// Pay if required
	if (!forFree) {
		let cost = company.goodValue
		store.players[playerIndex].moneyCash -= cost
	}
	// Add the territory
	if (rf.LAND_COMPANIES.includes(company.type)) company.territories.push([terrID, false])
	else company.territories.push([terrID, company.hullCapacity])
	// Add to "this turn" expansions
	if (store.gameflow.phase === rf.PHASE_OPERATIONS) company.newExpansionsThisTurn.push(terrID)
}

export function stopExpandingEarly() {
	const store = useModelStore()

	store.clearMessages()

	store.context.canChangeOperatingCompany = false

	store.context.territoriesToHighlight.splice(0)
	store.context.remainingExpansions = 0
	store.context.action = rf.ACT_CONFIRM_END_TURN
}

export function upgradeRND(upgradedPlayerIndex, rowIdx) {
	const store = useModelStore()

	upgradeRND_core(upgradedPlayerIndex, rowIdx)

	let newColIdx = store.players[upgradedPlayerIndex].RnD[rowIdx]

	if (controller.currentPlayerIndex() === upgradedPlayerIndex) {
		addHistory(rf.HIST_RND, controller.currentPlayerIndex(), 0, [rowIdx, newColIdx])
		store.context.justResearched = [rowIdx, newColIdx]
	} else {
		addHistory(rf.HIST_RND, controller.currentPlayerIndex(), 0, [rowIdx, newColIdx, upgradedPlayerIndex])
		store.context.justResearched = [rowIdx, newColIdx, upgradedPlayerIndex]
	}
	store.context.action = rf.ACT_CONFIRM_END_TURN
}

export function upgradeRND_core(upgradedPlayerIndex, rowIdx) {
	const store = useModelStore()
	store.players[upgradedPlayerIndex].RnD[rowIdx]++
	// Check for illegal over uprades from pre-moves
	if (store.players[upgradedPlayerIndex].RnD[rowIdx] > 5) store.players[upgradedPlayerIndex].RnD[rowIdx] = 5

	// If hull capacity, update companies
	if (rowIdx === 4) {
		for (let i = 0; i < store.activeCompanies.length; i++) {
			if (store.activeCompanies[i].type === rf.COMPANY_SHIPPING && store.activeCompanies[i].ownerIndex === upgradedPlayerIndex) {
				// set the company hull capacity
				store.activeCompanies[i].hullCapacity = store.players[upgradedPlayerIndex].RnD[rowIdx]
				// update all the terrs
				for (let j = 0; j < store.activeCompanies[i].territories.length; j++) {
					store.activeCompanies[i].territories[j][1] = store.players[upgradedPlayerIndex].RnD[rf.RnD_HULL_IDX]
				}
			}
		}
	}
}

export function slotCompanies(slot, companies) {
	return slot.map((id) => companies.find((company) => company.id === id))
}

export function getActiveSlotListDataObject(players, allCompanies) {
	let result = []
	for (let i = 0; i < players.length; i++) {
		let player = players[i]
		for (let n = 0; n < player.slots.length; n++) {
			let slot = player.slots[n]
			if (slot.length > 0) {
				let companies = slotCompanies(slot, allCompanies)
				let territoryCount = companies.map((company) => company.territories.length).reduce((a, b) => a + b, 0)
				result.push({ player: i, slot: n, deedCount: companies.length, type: companies[0].type, wasMerged: companies[0].mergedThisPhase, territoryCount: territoryCount })
			}
		}
	}
	return result
}

function firstFreeSlot(playerObj) {
	return playerObj.slots.findIndex((slot) => slot.length === 0)
}

export function hasNoFreeSlots(playerObj) {
	let firstSlotIdx = firstFreeSlot(playerObj)
	return playerObj.RnD[rf.RnD_SLOTS_IDX] < firstSlotIdx + 1 || firstSlotIdx === -1
}

export function slotPairMergerStatus(slots, playerIndex, player, currentEra) {
	const store = useModelStore()
	const freeSlots = !hasNoFreeSlots(player)
	let cash = player.moneyCash
	if (store.useMergerSubsidy) cash += (player.RnD[rf.RnD_MERGER_SUBSIDY_IDX] - 1) * 100
	const mergerTech = player.RnD[rf.RnD_MERGER_IDX]
	const ricespice = [rf.COMPANY_RICE, rf.COMPANY_SPICE]
	const result = []
	for (let n = 0; n < slots.length; n++) {
		for (let k = n + 1; k < slots.length; k++) {
			const wasMerged = slots[n].wasMerged || slots[k].wasMerged
			const sameType = slots[n].type === slots[k].type
			const siapFaji = !sameType && ricespice.includes(slots[n].type) && ricespice.includes(slots[k].type)
			const unitCost = rf.GOOD_VALUES[siapFaji ? rf.COMPANY_SPICE : slots[n].type]
			result.push({
				indices: [
					[slots[n].player, slots[n].slot],
					[slots[k].player, slots[k].slot],
				],
				alreadyMerged: wasMerged,
				invalidType: !(sameType || siapFaji),
				tooEarlyForSiap: siapFaji && currentEra < rf.ERA_B,
				insufficientMerger: mergerTech < slots[n].deedCount + slots[k].deedCount,
				noFreeSlot: !(freeSlots || [slots[n].player, slots[k].player].includes(playerIndex)),
				lowCash: cash < unitCost * (slots[n].territoryCount + slots[k].territoryCount),
			})
		}
	}
	return result
}

export function canMergeEntry(ignoreCash) {
	return function (status) {
		return !((status.lowCash && !ignoreCash) || status.alreadyMerged || status.invalidType || status.tooEarlyForSiap || status.insufficientMerger || status.noFreeSlot)
	}
}

export function setupSlotToOperate(playerIndex, slotIdx) {
	const store = useModelStore()
	store.clearVars()
	store.removeAllActiveHighlights()
	store.context.selectedSlotToOperate = slotIdx
	store.context.canChangeOperatingCompany = false
	// RESET THE ACT IN CASE SWITCHING FROM A NON SHIPPABLE LAND COMP
	store.context.action = rf.ACT_NONE

	let companySlot = store.players[playerIndex].slots[slotIdx]

	store.context.historyObj.splice(0)
	store.context.historyObj.push([...companySlot])

	// Check if it's a shipping group
	if (getActiveCompanyDataFromID(companySlot[0]).type === rf.COMPANY_SHIPPING) {
		store.context.remainingExpansions = controller.currentPlayerObj().RnD[rf.RnD_EXPANSION_IDX]
		setupExpansionHighlights(slotIdx)
		return
	}

	// So now it must be a land slot
	store.context.currentGoodJourney.splice(0)
	store.context.currentGoodJourney.push([...companySlot])
	// Outline the company territories in blue
	let productionTerrs = []
	for (let i = 0; i < companySlot.length; i++) {
		let company = getActiveCompanyDataFromID(companySlot[i])
		for (let j = 0; j < company.territories.length; j++) {
			productionTerrs = productionTerrs.concat(company.territories[j][0])
		}
	}
	store.context.territoriesToHighlightBlue = [...productionTerrs]
	store.context.prodMarkerTerritoriesToHighlight = [...productionTerrs]
	// As this is the first good, they are all available

	// Highlight any full cities red
	let shippingGood = getActiveCompanyDataFromID(controller.currentPlayerObj().slots[store.context.selectedSlotToOperate][0]).good
	for (let i = 0; i < store.cities.length; i++) {
		let currentReceivedCount = store.cities[i].receivedGoods.reduce((count, num) => (num === shippingGood ? count + 1 : count), 0)
		if (currentReceivedCount === store.cities[i].size) store.context.citiesToHighlightRed.push(store.cities[i].territory)
	}

	// Check if any can be shipped
	if (!map.canShipGoodFromSlotIDX(controller.currentPlayerIndex(), slotIdx)) {
		store.context.prodMarkerTerritoriesToHighlight.splice(0)
		store.gameMessages.actionError = "You cannot ship any goods with this company"
		store.context.action = rf.ACT_DECIDE_PAID_EXPANSION
		return
	}
	// Now we know A good can be shipped, so set up maxPoss
	let maxPossRet = mpf.getCheapestMaxPossibleShipmentsFromSlotIDX(
		store.cities,
		store.activeCompanies,
		store.players.map((_, n) => (n == playerIndex ? 0 : store.context.unfavouredPlayerIndexes[n] ? 2 : 1)),
		store.players.map((_, n) => (store.useShippingSubsidy && store.context.unfavouredPlayerIndexes[n] ? store.players[n].RnD[rf.RnD_SHIPPING_SUBSIDY_IDX] - 1 : 0)),
		store.players.map((player) => player.slots),
		playerIndex,
		slotIdx, // should be store.context.selectedSlotToOperate
		store.context.historyObj.slice(1)
	)
	store.context.maxPoss = maxPossRet.length
	store.context.maxPossData = [...maxPossRet]

	// Highlight reachable cities
	let reachableCities = mpf.getCitiesReachableByShipping(
		store.cities,
		store.activeCompanies,
		store.players.map((player) => player.slots),
		playerIndex,
		slotIdx,
		store.context.historyObj.slice(1),
		[]
	)
	store.context.citiesToHighlightRed.splice(0)
	store.context.citiesToHighlight = [...reachableCities]
}

export function deliverGoodsToCity() {
	const store = useModelStore()

	store.removeAllActiveHighlights()

	let slotContent = store.context.currentGoodJourney.shift()
	store.context.historyObj.push([...store.context.currentGoodJourney])

	deliverGoodsToCity_core(controller.currentPlayerIndex(), slotContent, store.context.currentGoodJourney, false)

	checkForResponseAfterDeliverGoodsToCity(slotContent)
}

export function checkForResponseAfterDeliverGoodsToCity(slotContent, preventMaxPossRecalc) {
	const store = useModelStore()
	store.removeAllActiveHighlights()
	// Now check if the company has fully operated
	const playerIndex = controller.currentPlayerIndex()
	let slotIdx = controller.currentPlayerObj().slots.findIndex((s) => s[0] === slotContent[0])
	let allSold = true
	let soldCount = 0
	for (let i = 0; i < slotContent.length; i++) {
		let company = getActiveCompanyDataFromID(slotContent[i])
		for (let j = 0; j < company.territories.length; j++) {
			if (!company.territories[j][1]) allSold = false
			if (company.territories[j][1]) soldCount++
		}
	}
	// EVERYTHING SOLD
	if (allSold) {
		store.context.currentGoodJourney.splice(0)
		store.context.action = rf.ACT_CONFIRM_ALL_DELIVERIES
		store.context.territoriesToHighlightBlue.splice(0)
		store.context.prodMarkerTerritoriesToHighlight.splice(0)
		let maxPossRet = mpf.getCheapestMaxPossibleShipmentsFromSlotIDX(
			store.cities,
			store.activeCompanies,
			store.players.map((_, n) => (n == playerIndex ? 0 : store.context.unfavouredPlayerIndexes[n] ? 2 : 1)),
			store.players.map((_, n) => (store.useShippingSubsidy && store.context.unfavouredPlayerIndexes[n] ? store.players[n].RnD[rf.RnD_SHIPPING_SUBSIDY_IDX] - 1 : 0)),
			store.players.map((player) => player.slots),
			playerIndex,
			store.context.selectedSlotToOperate,
			store.context.historyObj.slice(1)
		)
		store.context.maxPossData = [...maxPossRet]
		/*
		// You MUST expand for free
		store.context.action = rf.ACT_FREE_EXPANSION
		store.context.remainingExpansions = controller.currentPlayerObj().RnD[rf.RnD_EXPANSION_IDX]
		store.context.territoriesToHighlightBlue = [...getAllTerrIDsForSlot(slotContent)]
		store.context.territoriesToHighlight = [...getValidTerrsForExpansionFromLandSlotIdx(slotIdx)]
		if (store.context.territoriesToHighlight.length === 0) {
			store.gameMessages.actionError = "There are no valid territories to expand into"
			store.context.action = rf.ACT_CONFIRM_END_TURN
			store.context.historyObj.push(-1)
		}*/
		return
	}
	// Otherwise, not all goods are sold
	// See if ANY good has a valid selling path; if so, highlight the goods
	// So now it must be a land slot
	// Outline the company territories in blue
	store.context.currentGoodJourney.splice(0)
	store.context.currentGoodJourney.push([...slotContent])
	let productionTerrs = []
	for (let i = 0; i < slotContent.length; i++) {
		let company = getActiveCompanyDataFromID(slotContent[i])
		for (let j = 0; j < company.territories.length; j++) {
			if (!company.territories[j][1]) productionTerrs = productionTerrs.concat(company.territories[j][0])
		}
	}
	store.context.territoriesToHighlightBlue = [...productionTerrs]
	store.context.prodMarkerTerritoriesToHighlight = [...productionTerrs]
	if (!preventMaxPossRecalc) {
		let maxPossRet = mpf.getCheapestMaxPossibleShipmentsFromSlotIDX(
			store.cities,
			store.activeCompanies,
			store.players.map((_, n) => (n == playerIndex ? 0 : store.context.unfavouredPlayerIndexes[n] ? 2 : 1)),
			store.players.map((_, n) => (store.useShippingSubsidy && store.context.unfavouredPlayerIndexes[n] ? store.players[n].RnD[rf.RnD_SHIPPING_SUBSIDY_IDX] - 1 : 0)),
			store.players.map((player) => player.slots),
			playerIndex,
			store.context.selectedSlotToOperate,
			store.context.historyObj.slice(1)
		)
		store.context.maxPossData = [...maxPossRet]
	}

	// IF NO MORE SHIPPING, AND YOU HAVE SHIPPED THE MAX, ALLOW PAID EXPANSION
	if (!map.canShipGoodFromSlotIDX(controller.currentPlayerIndex(), slotIdx) && soldCount === store.context.maxPoss) {
		store.context.prodMarkerTerritoriesToHighlight.splice(0)
		//store.context.action = rf.ACT_DECIDE_PAID_EXPANSION
		store.context.action = rf.ACT_CONFIRM_ALL_DELIVERIES
		store.gameMessages.actionError = "You cannot ship any more goods with this company"
	}
	// OTHERWISE, NO MORE SHIPPING, AND NOT MET THE MAX POSS
	else if (!map.canShipGoodFromSlotIDX(controller.currentPlayerIndex(), slotIdx) && soldCount < store.context.maxPoss) {
		store.context.prodMarkerTerritoriesToHighlight.splice(0)
		store.gameMessages.actionError = "You cannot ship any more goods with this company, but you did not ship the most possible. Please restart your turn or remove a manual delivery"
	}
	/*else {
		
	}*/
}

export function deliverGoodsToCity_core(playerIndex, slotContent, goodJourney, markShipsAsUsed) {
	const store = useModelStore()
	let cityTerrID = goodJourney[goodJourney.length - 1]
	let city = store.cities.find((city) => city.territory === cityTerrID)

	// Add the good to the city
	let companyID = -1
	let goodTerr = goodJourney[0]

	for (let i = 0; i < slotContent.length; i++) {
		let comp = getActiveCompanyDataFromID(slotContent[i])
		if (comp.territories.some((terrArr) => terrArr[0] === goodTerr)) {
			companyID = slotContent[i]
			break
		}
	}

	let company = getActiveCompanyDataFromID(companyID)

	city.receivedGoods.push(company.good)

	// Mark the production marker as sold
	let terrArr = company.territories.find((terrArr) => terrArr[0] === goodTerr)
	terrArr[1] = true

	// If you haven't got here manually (which uses the ships as you click them), mark the ships as used
	// good jounrey is [goodTerr, shipCompany.player, shipCompany.id, shipTerr, shipTeer, ..., city]
	if (markShipsAsUsed) {
		let shipCompany = getActiveCompanyDataFromID(goodJourney[2])
		for (let i = 3; i <= goodJourney.length - 2; i++) {
			let terrArr = shipCompany.territories.find((terrArr) => terrArr[0] === goodJourney[i] && terrArr[1] > 0)
			terrArr[1] -= 1
		}
		// If auto shipping, add to history. If from replay, this doesn't break anything anyway
		store.context.historyObj.push([...goodJourney])
	}

	// Pay the monies
	let totalIncome = rf.GOOD_INCOME[company.good]
	let shipsUsed = goodJourney.length - 4 // Take off PROD_TERR, SHIP_COMP_ID, CITY_TERR
	// Active player gets the net income
	store.players[playerIndex].moneyCash += totalIncome - shipsUsed * 5
	store.players[playerIndex].moneyRoundIncome += totalIncome - shipsUsed * 5
	// Add net income to company
	company.incomeThisTurn += totalIncome - shipsUsed * 5
	// Ship player gets shipping income
	let shippingOwnerIndex = getActiveCompanyDataFromID(goodJourney[2]).ownerIndex
	store.players[shippingOwnerIndex].moneyCash += shipsUsed * 5
	store.players[shippingOwnerIndex].moneyRoundIncome += shipsUsed * 5
	// Add shipping income to shipping co
	// Add shipping subsidy to the shipping owner IF IT ISN'T YOURSELF
	let subsidy = 0
	if (store.useShippingSubsidy && shippingOwnerIndex !== playerIndex) {
		subsidy = (store.players[shippingOwnerIndex].RnD[rf.RnD_SHIPPING_SUBSIDY_IDX] - 1) * 5
		store.players[shippingOwnerIndex].moneyCash += subsidy
		store.players[shippingOwnerIndex].moneyRoundIncome += subsidy
	}
	getActiveCompanyDataFromID(goodJourney[2]).incomeThisTurn += shipsUsed * 5 + subsidy
}

export function UNdeliverGoodsToCity_core(playerIndex, goodJourney) {
	const store = useModelStore()
	let slotContent = controller.currentPlayerObj().slots[store.context.selectedSlotToOperate]

	let cityTerrID = goodJourney[goodJourney.length - 1]
	let city = store.cities.find((city) => city.territory === cityTerrID)

	// Add the good to the city
	let companyID = -1
	let goodTerr = goodJourney[0]

	for (let i = 0; i < slotContent.length; i++) {
		let comp = getActiveCompanyDataFromID(slotContent[i])
		if (comp.territories.some((terrArr) => terrArr[0] === goodTerr)) {
			companyID = slotContent[i]
			break
		}
	}

	let company = getActiveCompanyDataFromID(companyID)

	// Remove the good from the city
	const index = city.receivedGoods.indexOf(company.good)
	if (index !== -1) {
		city.receivedGoods.splice(index, 1)
	}

	// Mark the production marker as UNsold
	let terrArr = company.territories.find((terrArr) => terrArr[0] === goodTerr)
	terrArr[1] = false

	// good jounrey is [goodTerr, shipCompany.player, shipCompany.id, shipTerr, shipTeer, ..., city]
	// Un-use the ships
	let shipCompany = getActiveCompanyDataFromID(goodJourney[2])
	for (let i = 3; i <= goodJourney.length - 2; i++) {
		//let terrArr = shipCompany.territories.find((terrArr) => terrArr[0] === goodJourney[i] && terrArr[1] > 0)
		let terrArr = shipCompany.territories.find((terrArr) => terrArr[0] === goodJourney[i] && terrArr[1] < shipCompany.hullCapacity)
		terrArr[1] += 1
	}

	// Pay the monies
	let totalIncome = rf.GOOD_INCOME[company.good]
	let shipsUsed = goodJourney.length - 4 // Take off PROD_TERR, SHIP_COMP_ID, CITY_TERR
	// Active player - remove the net income
	store.players[playerIndex].moneyCash -= totalIncome - shipsUsed * 5
	store.players[playerIndex].moneyRoundIncome -= totalIncome - shipsUsed * 5
	// Remove net income to company
	company.incomeThisTurn -= totalIncome - shipsUsed * 5
	// Ship player loses shipping income
	let shippingOwnerIndex = getActiveCompanyDataFromID(goodJourney[2]).ownerIndex
	store.players[shippingOwnerIndex].moneyCash -= shipsUsed * 5
	store.players[shippingOwnerIndex].moneyRoundIncome -= shipsUsed * 5
	// Add shipping income to shipping co
	getActiveCompanyDataFromID(goodJourney[2]).incomeThisTurn -= shipsUsed * 5
}

// 	model.autoShip(controller.currentPlayerIndex(), store.context.selectedSlotToOperate, store.context.maxPossData)
export function autoShip(playerIndex, slotIdx, maxPossData) {
	const store = useModelStore()
	store.removeAllActiveHighlights()
	// Deliver the goods
	for (let i = 0; i < maxPossData.length; i++) {
		deliverGoodsToCity_core(playerIndex, store.players[playerIndex].slots[slotIdx], maxPossData[i], true)
	}

	let slotContent = store.players[playerIndex].slots[slotIdx]
	checkForResponseAfterDeliverGoodsToCity(slotContent)
}

export function resetLandCompanies() {
	const store = useModelStore()

	for (let i = 0; i < store.activeCompanies.length; i++) {
		if (rf.LAND_COMPANIES.includes(store.activeCompanies[i].type)) {
			store.activeCompanies[i].operated = false
			store.activeCompanies[i].newExpansionsThisTurn.splice(0)
			//store.activeCompanies[i].incomeThisTurn = 0
			for (let j = 0; j < store.activeCompanies[i].territories.length; j++) {
				store.activeCompanies[i].territories[j][1] = false
			}
		}
	}
}

export function resetShippingCompanies(includeOperated) {
	const store = useModelStore()

	for (let i = 0; i < store.activeCompanies.length; i++) {
		if (store.activeCompanies[i].type === rf.COMPANY_SHIPPING) {
			if (includeOperated) {
				store.activeCompanies[i].operated = false
				store.activeCompanies[i].newExpansionsThisTurn.splice(0)
				//store.activeCompanies[i].incomeThisTurn = 0
			}
			for (let j = 0; j < store.activeCompanies[i].territories.length; j++) {
				store.activeCompanies[i].territories[j][1] = store.activeCompanies[i].hullCapacity
			}
		}
	}
}

export function growCities() {
	const store = useModelStore()
	// Find what goods are availble
	let availableGoods = []
	for (let i = 0; i < store.activeCompanies.length; i++) {
		if (rf.LAND_COMPANIES.includes(store.activeCompanies[i].type)) availableGoods.push(store.activeCompanies[i].good)
	}
	availableGoods = [...new Set(availableGoods)]

	let size1grows = [] // index i in the for loop, ie index in store.cities
	let size2grows = [] // index i in the for loop, ie index in store.cities

	for (let i = 0; i < store.cities.length; i++) {
		let res = [0, 0, 0, 0, 0]
		for (let j = 0; j < store.cities[i].receivedGoods.length; j++) {
			res[store.cities[i].receivedGoods[j]]++
		}
		let canUpgrade = store.cities[i].size < 3 && availableGoods.findIndex((good) => res[good] < store.cities[i].size) == -1
		if (canUpgrade && store.cities[i].size === 1) size1grows.push(store.cities[i].territory)
		else if (canUpgrade && store.cities[i].size === 2) size2grows.push(store.cities[i].territory)
	}

	// Check whether it is possible to grow all the cities or not
	let ret = 0 // No city growth problems
	let city2Count = 0
	let city3Count = 0
	for (let i = 0; i < store.cities.length; i++) {
		if (store.cities[i].size === 2) city2Count++
		else if (store.cities[i].size === 3) city3Count++
	}

	// If you already have 3 size 3 cities, no size 2 can upgrade
	if (city3Count === 3) size2grows.splice(0)
	// Now, if size 2 cities AFTER any have upgraded is 8, you cannot upgrade size 1 cities
	if (city2Count - size2grows.length === 8) size1grows.splice(0)

	// New size 2 will be size1grows.length + city2Count - size2grows.length
	// New size 3 will be size2grows.length + city3Count
	let newSize2 = size1grows.length + city2Count - size2grows.length
	let newSize3 = size2grows.length + city3Count
	// If not enough cities, remove the grows and change the return value
	if (newSize2 > 8) {
		size1grows.splice(0)
		ret = 2
	}
	if (newSize3 > 3) {
		size2grows.splice(0)
		ret += 3
	}

	growCities_core(size1grows, size2grows)

	store.context.historyObj.splice(0)
	// If no errors, and no city growth, history no city growth
	if (size1grows.length === 0 && size2grows.length === 0 && ret === 0) addHistory(rf.HIST_NO_CITY_GROWTH, -1, 0, [])
	else if (ret === 0) {
		// Hist city growth with no issues
		store.context.historyObj.push([...size1grows])
		if (size2grows.length > 0) store.context.historyObj.push([...size2grows])
		addHistory(rf.HIST_CITY_GROWTH, -1, 0, [...store.context.historyObj])
	} else if (ret > 0) {
		// hist either partial or no AUTO city growth, due issues - TODO
	}
	return ret
}

export function growCities_core(size1grows, size2grows) {
	const store = useModelStore()
	// Only grow the selected cities, and only splice their rec'd goods
	// Keep rec'd goods on cities where a player deciison is required
	for (let i = 0; i < size1grows.length; i++) {
		store.cities.find((city) => city.territory === size1grows[i]).size = 2
		store.cities.find((city) => city.territory === size1grows[i]).receivedGoods.splice(0)
	}
	for (let i = 0; i < size2grows.length; i++) {
		store.cities.find((city) => city.territory === size2grows[i]).size = 3
		store.cities.find((city) => city.territory === size2grows[i]).receivedGoods.splice(0)
	}
}

export function markActiveCompaniesWithNoStartTerritoriesForRemoval() {
	const store = useModelStore()
	for (let i = store.availableCompanies.length - 1; i >= 0; i--) {
		let company = store.availableCompanies[i]
		if (rf.LAND_COMPANIES.includes(company.type)) {
			let validTerrs = map.getWholeProvinceTerrIDs(company.province)

			// Remove occupied terrs
			let occupiedTerrs = getOccupiedTerrIDs()
			for (let j = validTerrs.length - 1; j >= 0; j--) {
				if (occupiedTerrs.includes(validTerrs[j])) {
					validTerrs.splice(j, 1)
				}
			}

			// Remove neighbours of current same type comp
			let blockedTerrs = []
			for (let j = 0; j < store.activeCompanies.length; j++) {
				if (store.activeCompanies[j].type === company.type && store.activeCompanies[j].id !== company.id) {
					for (let k = 0; k < store.activeCompanies[j].territories.length; k++) {
						blockedTerrs = blockedTerrs.concat(store.mapData.landNeighbours[store.activeCompanies[j].territories[k][0]])
					}
				}
			}
			blockedTerrs = [...new Set(blockedTerrs)]

			// remove blocked terrs
			for (let j = validTerrs.length - 1; j >= 0; j--) {
				if (blockedTerrs.includes(validTerrs[j])) {
					validTerrs.splice(j, 1)
				}
			}
			if (validTerrs.length === 0) company.markedForRemoval = true
		}
	}
}

/** UTILS */
export function getActiveCompanyFromAnyTerritory(terrID) {
	const store = useModelStore()
	return store.activeCompanies.find((company) => company.territories.some((territory) => territory[0] === terrID))
}

export function getRawCompanyDataFromID(companyID) {
	const store = useModelStore()
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) return rf.ALL_COMPANIES.find((company) => company.id === companyID)
	if (store.mapData.selectedMap === rf.MAP_AEGEAN) return rf.AG_ALL_COMPANIES.find((company) => company.id === companyID)
	if (store.mapData.selectedMap === rf.MAP_PHP) return rf.PH_ALL_COMPANIES.find((company) => company.id === companyID)
}

export function getActiveCompanyDataFromID(companyID) {
	const store = useModelStore()
	let company = store.activeCompanies.find((company) => company.id === companyID)
	if (company) return company
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) return rf.ALL_COMPANIES.find((company) => company.id === companyID)
	if (store.mapData.selectedMap === rf.MAP_AEGEAN) return rf.AG_ALL_COMPANIES.find((company) => company.id === companyID)
	if (store.mapData.selectedMap === rf.MAP_PHP) return rf.PH_ALL_COMPANIES.find((company) => company.id === companyID)
}

export function getNominalValueFromSlotID(playerIndex, slotIdx, isSiapFajiMerger) {
	const store = useModelStore()
	let nominalValue = 0
	for (let i = 0; i < store.players[playerIndex].slots[slotIdx].length; i++) {
		let company = getActiveCompanyDataFromID(store.players[playerIndex].slots[slotIdx][i])
		let numTerrs = company.territories.length
		let goodNominalValue = rf.GOOD_VALUES[isSiapFajiMerger ? rf.COMPANY_SPICE : company.type]
		nominalValue += numTerrs * goodNominalValue
	}

	return nominalValue
}

export function getSlotFromCompanyID(companyID) {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].slots.length; j++) {
			for (let k = 0; k < store.players[i].slots[j].length; k++) {
				if (store.players[i].slots[j][k] === companyID) return store.players[i].slots[j]
			}
		}
	}
}

export function getSlotIDXfromCompanyID(companyID) {
	const store = useModelStore()
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].slots.length; j++) {
			for (let k = 0; k < store.players[i].slots[j].length; k++) {
				if (store.players[i].slots[j][k] === companyID) return j
			}
		}
	}
}

/*export function getShipMultiples(companyID, terrID) {
	let slot = getSlotFromCompanyID(companyID)
	let allTerrs = []
	for (let i = 0; i < slot.length; i++) {
		let terrArrs = getActiveCompanyDataFromID(slot[i]).territories
		for (let j = 0; j < terrArrs.length; j++) {
			if (terrArrs[j][0] === terrID) allTerrs.push(terrArrs[j][0])
		}
	}
	return allTerrs.reduce((count, num) => (num === terrID ? count + 1 : count), 0)
}*/

export function getAllTerrIDsForSlot(slot) {
	let allTerrs = []
	for (let i = 0; i < slot.length; i++) {
		let terrArrs = getActiveCompanyDataFromID(slot[i]).territories
		for (let j = 0; j < terrArrs.length; j++) {
			allTerrs.push(terrArrs[j][0])
		}
	}
	return allTerrs
}

export function getValidTerrsForExpansionFromLandSlotIdx(slotIdx) {
	const store = useModelStore()
	let allTerrs = []
	let slot = controller.currentPlayerObj().slots[slotIdx]
	let deliveredCompany = getActiveCompanyDataFromID(slot[0])
	let deliveredGood = deliveredCompany.good
	for (let i = 0; i < slot.length; i++) {
		let terrArrs = getActiveCompanyDataFromID(slot[i]).territories
		for (let j = 0; j < terrArrs.length; j++) {
			allTerrs.push(terrArrs[j][0])
		}
	}
	// Can't expand to occupied terrs
	let occupiedTerrIDs = getOccupiedTerrIDs()
	// Can't expand into neighbours of other slots of same good type
	let invalidCompanies = []
	let invalidTerrs = []
	for (let i = 0; i < store.players.length; i++) {
		for (let j = 0; j < store.players[i].slots.length; j++) {
			if (i !== controller.currentPlayerIndex() || j !== slotIdx) {
				for (let k = 0; k < store.players[i].slots[j].length; k++) {
					let company = getActiveCompanyDataFromID(store.players[i].slots[j][k])
					if (company.good === deliveredGood) {
						invalidCompanies.push(store.players[i].slots[j][k])
						let allTerrs = []
						for (let l = 0; l < company.territories.length; l++) {
							allTerrs.push(company.territories[l][0])
						}
						// Get the land neighbours
						let landNeighboursOfSameNeighbouringCompany = []
						for (let l = 0; l < allTerrs.length; l++) {
							let currentNighbours = store.mapData.landWithExpansionRestrictionsNeighbours[allTerrs[l]]
							for (let m = 0; m < currentNighbours.length; m++) {
								if (!landNeighboursOfSameNeighbouringCompany.includes(currentNighbours[m]) && !allTerrs.includes(currentNighbours[m]) && !occupiedTerrIDs.includes(currentNighbours[m])) landNeighboursOfSameNeighbouringCompany.push(currentNighbours[m])
							}
						}
						landNeighboursOfSameNeighbouringCompany = [...new Set(landNeighboursOfSameNeighbouringCompany)]
						invalidTerrs = invalidTerrs.concat(landNeighboursOfSameNeighbouringCompany)
					}
				}
			}
		}
	}

	// Now find valid terrID's
	let neighbours = []
	for (let i = 0; i < allTerrs.length; i++) {
		let currentNighbours = store.mapData.landWithExpansionRestrictionsNeighbours[allTerrs[i]]
		for (let j = 0; j < currentNighbours.length; j++) {
			if (!allTerrs.includes(currentNighbours[j]) && !occupiedTerrIDs.includes(currentNighbours[j]) && !invalidTerrs.includes(currentNighbours[j])) neighbours.push(currentNighbours[j])
		}
	}
	neighbours = [...new Set(neighbours)]
	return neighbours
}

export async function resetWholeTurn() {
	const store = useModelStore()

	store.clearVars()
	store.clearHistoryHelpers()

	store.gameMessages.actionError = ""

	await funcs.simpleImportWholeModel(store.wholeTurnResetData, false)
	controller.startPlayerTurn()
}

export async function restartGoodJourney() {
	const store = useModelStore()
	store.clearVars()
	store.clearHistoryHelpers()

	await funcs.simpleImportWholeModel(store.goodJourneyResetData, true)
}

export function canCityAcceptGood(terrID, good) {
	const store = useModelStore()
	let city = store.cities.find((city) => city.territory === terrID)
	let res = [0, 0, 0, 0, 0]
	for (let i = 0; i < city.receivedGoods.length; i++) {
		res[city.receivedGoods[i]]++
	}

	if (res[good] < city.size) return true
	return false
}

export function checkForEraChange() {
	const store = useModelStore()
	// Check whether no or only 1 types left
	let remainingTypes = []
	for (let i = 0; i < store.availableCompanies.length; i++) {
		if (!remainingTypes.includes(store.availableCompanies[i].type)) remainingTypes.push(store.availableCompanies[i].type)
	}
	if (remainingTypes.length <= 1) return true
	return false
}

export function actionEraChange() {
	const store = useModelStore()

	// Assume Era change is checked and required
	store.gameflow.currentEra++
	// End game if end of era 3
	if (store.gameflow.currentEra === rf.ERA_C + 1) {
		store.gameflow.currentEra = rf.ERA_C
		endGame()
		// Double current turn takings

		// calculate winner

		// save game, etc
		return
	}
	// Remove avaiable companies
	store.availableCompanies.splice(0)
	// Set available Companies
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) {
		for (let i = 0; i < rf.ALL_COMPANIES.length; i++) {
			if (rf.ALL_COMPANIES[i].era === store.gameflow.currentEra) store.availableCompanies.push(JSON.parse(JSON.stringify(rf.ALL_COMPANIES[i])))
		}
	} else if (store.mapData.selectedMap === rf.MAP_AEGEAN) {
		for (let i = 0; i < rf.AG_ALL_COMPANIES.length; i++) {
			if (rf.AG_ALL_COMPANIES[i].era === store.gameflow.currentEra) store.availableCompanies.push(JSON.parse(JSON.stringify(rf.AG_ALL_COMPANIES[i])))
		}
	} else if (store.mapData.selectedMap === rf.MAP_PHP) {
		for (let i = 0; i < rf.PH_ALL_COMPANIES.length; i++) {
			if (rf.PH_ALL_COMPANIES[i].era === store.gameflow.currentEra) store.availableCompanies.push(JSON.parse(JSON.stringify(rf.PH_ALL_COMPANIES[i])))
		}
	}

	// If on PHP map and starting ERA_B then remove 2 comps from 3 piles -- THESE HAVE ALREADY BEEN REMOVED, SO FIND HIST ENTRY AND REMOVE
	if (store.mapData.selectedMap === rf.MAP_PHP && store.gameflow.currentEra === rf.ERA_B) {
		let previouslyRemovedCompanyIDs = []
		for (let i = store.history.length - 1; i >= 0; i--) {
			if (store.history[i][0] === rf.HIST_NEW_ERA && store.history[i][3].length > 1) {
				previouslyRemovedCompanyIDs = previouslyRemovedCompanyIDs.concat(store.history[i][3][1])
			}
		}
		// 3. Filter the companies list
		store.availableCompanies = store.availableCompanies.filter((c) => !previouslyRemovedCompanyIDs.includes(c.id))
	}

	// If on PHP map and in era C, remove all oil companies, and then add in JUST the ones matching the provinces previously removed
	if (store.mapData.selectedMap === rf.MAP_PHP && store.gameflow.currentEra === rf.ERA_C) {
		// Remove all the oil companies
		store.availableCompanies = store.availableCompanies.filter((c) => c.type !== rf.COMPANY_OIL)
		// Find the previously removed company IDs
		let previouslyRemovedCompanyIDs = []
		for (let i = store.history.length - 1; i >= 0; i--) {
			if (store.history[i][0] === rf.HIST_NEW_ERA && store.history[i][3].length > 1) {
				previouslyRemovedCompanyIDs = previouslyRemovedCompanyIDs.concat(store.history[i][3][1])
			}
		}
		let previouslyRemovedCompanyProvinces = []
		for (let i = 0; i < previouslyRemovedCompanyIDs.length; i++) {
			let previousProvince = rf.PH_ALL_COMPANIES.find((c) => c.id === previouslyRemovedCompanyIDs[i]).province
			previouslyRemovedCompanyProvinces.push(previousProvince)
		}
		// Now add the ERA_C oil companies with the matching provinces
		for (let i = 0; i < previouslyRemovedCompanyProvinces.length; i++) {
			let oilCompany = rf.PH_ALL_COMPANIES.find((c) => c.province === previouslyRemovedCompanyProvinces[i] && c.type === rf.COMPANY_OIL && c.era === rf.ERA_C)
			store.availableCompanies.push(JSON.parse(JSON.stringify(oilCompany)))
		}
	}
}

export function getBidMultiplierAmount(playerIndex) {
	const store = useModelStore()
	const bidTech = store.players[playerIndex].RnD[rf.RnD_BID_IDX]
	return rf.RND_BID_MULTIPLIER[bidTech]
}

export function getRndDisplayValue(rnd, level) {
	if (rnd === rf.RnD_BID_IDX) {
		return rf.RND_BID_MULTIPLIER[level]
	}
	return level
}

export function endGame() {
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.finishedGame = true
	store.gameflow.phase = rf.PHASE_GAME_OVER

	let finalRes = endGame_core()
	store.clearVars()

	addHistory(rf.HIST_GAME_END, -1, 0, [...finalRes])
}

export function endGame_core() {
	const store = useModelStore()
	const personal = usePersonalStore()

	let res = []

	// CHECK FOR BOTS WINN
	const nbNonPlayers = store.players.filter((player) => player.displayName === rf.BOT_NAME).length
	if ((personal.trainingGame && nbNonPlayers > 0) || nbNonPlayers === store.players.length - 1) {
		const nonBotPlayers = store.players.filter((player) => player.displayName !== rf.BOT_NAME)
		const winnerIndex = store.players.findIndex((player) => player === nonBotPlayers[0])
		res.push(winnerIndex)
		for (let i = 0; i < store.players.length; i++) {
			if (!res.includes(i)) res.push(i)
		}

		store.gameflow.fullTurnOrder.splice(0)
		for (let i = 0; i < res.length; i++) {
			store.gameflow.fullTurnOrder.push(res[i])
		}
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		// Single winner, 1 player left
		return [res[0]]
	}

	// Add the round money on again
	store.context.historyObj.splice(0)
	for (let i = 0; i < store.players.length; i++) {
		store.players[i].moneyCash += store.players[i].moneyRoundIncome
		store.context.historyObj.push(store.players[i].moneyRoundIncome)
	}
	addHistory(rf.HIST_FINAL_INCOME, -1, 0, [...store.context.historyObj])

	// Sort players by score

	let finalRes = []
	for (let i = 0; i < store.players.length; i++) {
		finalRes.push([i, store.players[i].moneyCash + store.players[i].moneyBank])
	}

	// [playerIndex, name, score]
	finalRes.sort((a, b) => {
		if (b[1] !== a[1]) {
			return b[1] - a[1] // Sort by score in descending order
		} else {
			const povA = store.gameflow.fullTurnOrder.findIndex((entry) => entry === a[0])
			const povB = store.gameflow.fullTurnOrder.findIndex((entry) => entry === b[0])
			return povA - povB // Sort by earliest pov value in finalTurnOrder
		}
	})

	store.gameflow.fullTurnOrder.splice(0)
	for (let i = 0; i < finalRes.length; i++) {
		store.gameflow.fullTurnOrder.push(finalRes[i][0])
	}
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]

	return finalRes
}
