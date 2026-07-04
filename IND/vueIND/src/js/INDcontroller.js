/**
 * Contains functions related to the flow of the game,
 * or rather, interacting with the game, making moves,
 * ending turns / phases / etc
 *
 *
 */
import * as rf from "./INDreference.js"
import * as model from "./INDmodel.js"
import * as map from "./INDmap.js"
import * as funcs from "./INDfuncs.js"
import * as IO from "../backend/IND_IO.js"
import * as Bot from "./INDbot.js"
import * as view from "./INDview.js"

import { useModelStore } from "../stores/INDstore.js"
import { usePersonalStore } from "../stores/INDpersonal.js"

export function currentPlayerObj() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (store.gameflow.phase === rf.PHASE_MERGER_BIDDING) {
		if (store.ongoingVars.bidTurnOrder.length > 0) return store.players[store.ongoingVars.bidTurnOrder[0]]
		else {
			if (!store.topMenuViews.showReplay && personal.pov >= 0) {
				alert(`CP() Error - Bidding. S.O.bTO: ${store.ongoingVars.bidTurnOrder} -- ${personal.pov}`)
			}
		}
	}

	if (store.gameflow.turnOrder.length > 0) return store.players[store.gameflow.turnOrder[0]]
	else {
		if (!store.topMenuViews.showReplay && personal.pov >= 0) {
			alert(`CP() Error to: ${store.gameflow.turnOrder}, Phase: ${store.gameflow.phase}, FullTO: ${store.gameflow.fullTurnOrder}  -- ${personal.pov}`)
		}
		return store.players[0]
	}
}

export function currentPlayerIndex() {
	const store = useModelStore()

	if (store.gameflow.phase === rf.PHASE_MERGER_BIDDING) {
		if (store.ongoingVars.bidTurnOrder.length > 0) return store.ongoingVars.bidTurnOrder[0]
		else alert(`CP() IDX Error - Bidding. S.O.bTO: ${store.ongoingVars.bidTurnOrder}`)
	}

	if (store.gameflow.turnOrder.length > 0) return store.gameflow.turnOrder[0]
	else {
		if (!store.topMenuViews.showReplay) alert("CP() IDX Error")
		return 0
	}
}

export function canResign() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (!personal.canPlay()) return false
	if (personal.trainingGame) return false
	if (store.gameflow.phase !== rf.PHASE_BID_TURN_ORDER) return false
	return true
}

export function startPlayerTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()

	// Remove pre-moves if after RnD
	if (store.gameflow.phase >= rf.PHASE_OPERATIONS) {
		store.preMovesCompressed = ""
		store.players[personal.pov].preMoves.splice(0)
	}

	if (store.gameflow.turn === 1 && store.gameflow.phase === rf.PHASE_NEW_ERA) store.topMenuViews.minimalPlayerTable = true
	else if (store.gameflow.turn === 1 && store.gameflow.phase === rf.PHASE_BID_TURN_ORDER) store.topMenuViews.minimalPlayerTable = false

	if (!personal.canPlay()) return

	store.clearTurnVars()

	if (store.gameflow.phase === rf.PHASE_NEW_ERA) {
		store.context.action = rf.ACT_PLACE_CITY
		let validEraCards
		if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap))
			validEraCards = currentPlayerObj()
				.eraCards.map((cardId) => rf.ALL_ERA_CARDS.find((card) => card.id === cardId))
				.filter((card) => card.era === store.gameflow.currentEra)
		else if (store.mapData.selectedMap === rf.MAP_AEGEAN)
			validEraCards = currentPlayerObj()
				.eraCards.map((cardId) => rf.AG_ALL_ERA_CARDS.find((card) => card.id === cardId))
				.filter((card) => card.era === store.gameflow.currentEra)
		else if (store.mapData.selectedMap === rf.MAP_PHP)
			validEraCards = currentPlayerObj()
				.eraCards.map((cardId) => rf.PH_ALL_ERA_CARDS.find((card) => card.id === cardId))
				.filter((card) => card.era === store.gameflow.currentEra)
		if (validEraCards.length === 1) {
			store.context.selectedEraCard = validEraCards[0].id
			model.setupEraCardHighlights(validEraCards[0].id)
		}
	} else if (store.gameflow.phase === rf.PHASE_BID_TURN_ORDER) {
		if (!store.ongoingVars.newTurnOrderBids.some((entry) => entry[0] === currentPlayerIndex())) {
			store.ongoingVars.newTurnOrderBids.push([currentPlayerIndex(), 0, model.getBidMultiplierAmount(currentPlayerIndex())])
		}
	} else if (store.gameflow.phase === rf.PHASE_MERGERS) {
		store.context.mergerStatusArray.splice(0)
		const activeSlots = model.getActiveSlotListDataObject(store.players, store.activeCompanies)
		const mergerArray = model.slotPairMergerStatus(activeSlots, currentPlayerIndex(), currentPlayerObj(), store.gameflow.currentEra)
		store.context.mergerStatusArray = mergerArray
	} else if (store.gameflow.phase === rf.PHASE_MERGER_REMOVE_SIAP_FAJI_TERRS) {
		store.context.historyObj.splice(0)
		let newSlot = store.ongoingVars.siapFajiOrShippingTerrsToRemoveData[1]
		let slotIdx = store.players[currentPlayerIndex()].slots.findIndex((slot) => JSON.stringify(slot) === JSON.stringify(newSlot))
		store.context.historyObj.push(slotIdx)
		let terrsToRemove = store.ongoingVars.siapFajiOrShippingTerrsToRemoveData[2]

		store.context.siapFajiTerrsToRemove = terrsToRemove
		// highlight eligible terrs
		let allTerrs = []
		for (let i = 0; i < newSlot.length; i++) {
			for (let j = 0; j < model.getActiveCompanyDataFromID(newSlot[i]).territories.length; j++) {
				allTerrs.push(model.getActiveCompanyDataFromID(newSlot[i]).territories[j][0])
			}
		}
		// Now remove those which would break up continuous terrs
		let unconnectedAreasBefore = map.countUnconnectedAreas(new Set(allTerrs))
		let filteredTerrs = []

		for (let terrID of allTerrs) {
			let tempSet = new Set(allTerrs)
			tempSet.delete(terrID)

			let unconnectedAreasAfter = map.countUnconnectedAreas(tempSet)
			if (unconnectedAreasAfter <= unconnectedAreasBefore) {
				filteredTerrs.push(terrID)
			}
		}

		store.context.prodMarkerTerritoriesToHighlight.splice(0)
		store.context.prodMarkerTerritoriesToHighlight = [...filteredTerrs]
	} else if (store.gameflow.phase === rf.PHASE_MERGER_SHIP_REDEPLOYMENT) {
		store.context.historyObj.splice(0)
		let newSlot = store.ongoingVars.siapFajiOrShippingTerrsToRemoveData[1]
		let slotIdx = store.players[currentPlayerIndex()].slots.findIndex((slot) => JSON.stringify(slot) === JSON.stringify(newSlot))
		store.context.historyObj.push(slotIdx)
		let terrsToRedeploy = store.ongoingVars.siapFajiOrShippingTerrsToRemoveData[2]

		store.context.shippingTerrsToRedeploy = terrsToRedeploy

		store.context.territoriesToHighlight.splice(0)
		store.context.territoriesToHighlight = [...store.context.shippingTerrsToRedeploy]
	} else if (store.gameflow.phase === rf.PHASE_ACQUISITIONS) {
		store.clearVars()
		store.context.action = rf.ACT_ACQUIRE_COMPANY
	} else if (store.gameflow.phase === rf.PHASE_OPERATIONS) {
		if (store.context.unfavouredPlayerIndexes.length === 0) {
			for (let i = 0; i < store.players.length; i++) {
				store.context.unfavouredPlayerIndexes.push(true)
			}
		}
		store.context.canChangeOperatingCompany = true
		// HIGHLIGHT ALL YOUR OWNED STUFF, TO ALLOW YOU TO SELECT OPERATING COMPANY VIA THE MAP
		for (let i = 0; i < currentPlayerObj().slots.length; i++) {
			for (let j = 0; j < currentPlayerObj().slots[i].length; j++) {
				let company = model.getActiveCompanyDataFromID(currentPlayerObj().slots[i][j])
				if (!company.operated) {
					if (rf.LAND_COMPANIES.includes(company.type)) {
						for (let k = 0; k < company.territories.length; k++) {
							store.context.prodMarkerTerritoriesToHighlight.push(company.territories[k][0])
						}
					} else if (company.type === rf.COMPANY_SHIPPING) {
						for (let k = 0; k < company.territories.length; k++) {
							// Highlight ship markers
							store.context.shipMarkersToHighlight.push([company.id, company.territories[k][0]])
						}
					}
				}
			}
		}
	} else if (store.gameflow.phase === rf.PHASE_CITY_GROWTH) {
		// Get the terrID's of cities that are eligible to grow, THEN the number of cities that CAN grow
		// 1) FIND ELIGIBLE GROWTH CITIES
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
			if (canUpgrade && store.cities[i].size === 1) size1grows.push(i)
			else if (canUpgrade && store.cities[i].size === 2) size2grows.push(i)
		}

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

		// If here are more size1grows, then it must be a manual selection
		if (size1grows.length > 0) {
			store.context.citySize1GrowsRemaining = Math.min(size1grows.length, 8 - city2Count + Math.min(size2grows.length, 3 - city3Count))
			if (store.context.citySize1GrowsRemaining === 0) size1grows.splice(0)
		}
		if (size2grows.length > 0) {
			store.context.citySize2GrowsRemaining = Math.min(size2grows.length, 3 - city3Count)
			if (store.context.citySize2GrowsRemaining === 0) size2grows.splice(0)
		}

		// Convert city indexes to terrID
		for (let i = 0; i < size1grows.length; i++) size1grows[i] = store.cities[size1grows[i]].territory
		for (let i = 0; i < size2grows.length; i++) size2grows[i] = store.cities[size2grows[i]].territory

		store.context.citiesToHighlight.splice(0)
		store.context.citiesToHighlight = [...size1grows, ...size2grows]
		store.context.historyObj.splice(0)
		store.context.historyObj.push([])
	}

	// EVERY TURN START
	// Save the turn reset
	store.wholeTurnResetData = funcs.simpleExportWholeModel()
}

export function endCurrentPhase() {
	const store = useModelStore()
	if (store.gameflow.phase === rf.PHASE_NEW_ERA) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()

		store.gameflow.phase = rf.PHASE_BID_TURN_ORDER
	} else if (store.gameflow.phase === rf.PHASE_BID_TURN_ORDER) {
		// Redo turn order
		store.gameflow.fullTurnOrder.splice(0)
		for (let i = 0; i < store.ongoingVars.newTurnOrderBids.length; i++) {
			store.gameflow.fullTurnOrder.push(store.ongoingVars.newTurnOrderBids[i][0])
		}

		// NOW ADD IN NON-BIDDED PLAYERS - IE BOTS
		for (let i = 0; i < store.players.length; i++) {
			if (!store.gameflow.fullTurnOrder.includes(i)) store.gameflow.fullTurnOrder.push(i)
		}
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		store.resetOngoingVars(false)

		model.addHistory(rf.HIST_SET_NEW_TURN_ORDER, -1, 0, [...store.gameflow.fullTurnOrder])

		if (store.gameflow.turn === 1) store.gameflow.phase = rf.PHASE_ACQUISITIONS
		else store.gameflow.phase = rf.PHASE_MERGERS
	} else if (store.gameflow.phase === rf.PHASE_MERGERS) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		store.resetOngoingVars(false)
		// Reset merger flag
		for (let i = 0; i < store.activeCompanies.length; i++) store.activeCompanies[i].mergedThisPhase = false
		store.gameflow.phase = rf.PHASE_ACQUISITIONS
	} else if (store.gameflow.phase === rf.PHASE_ACQUISITIONS) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		store.gameflow.phase = rf.PHASE_R_AND_D
	} else if (store.gameflow.phase === rf.PHASE_R_AND_D) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		store.gameflow.phase = rf.PHASE_OPERATIONS
		// Remove last turn earnings
		for (let i = 0; i < store.activeCompanies.length; i++) {
			store.activeCompanies[i].incomeThisTurn = 0
		}
	} else if (store.gameflow.phase === rf.PHASE_OPERATIONS) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		// reset all companies
		model.resetLandCompanies()
		model.resetShippingCompanies(true)

		// Remove unusable companies
		for (let i = store.availableCompanies.length - 1; i >= 0; i--) {
			if (store.availableCompanies[i].markedForRemoval) {
				model.addHistory(rf.HIST_REMOVE_COMPANY_NO_TERRS, -1, 0, [store.availableCompanies[i].id])
				store.availableCompanies.splice(i, 1)
			}
		}

		// Check and action city growth
		store.gameflow.phase = rf.PHASE_CITY_GROWTH
		let ret = model.growCities()
		if (ret > 0) {
			// Start a city grwoth phase
			// First player in turn order decides all city growth
			store.gameflow.turnOrder.splice(0)
			store.gameflow.turnOrder.push(store.gameflow.fullTurnOrder[0])
			return
		}
		// If no errors with auto-city growth, end the phase
		endCurrentPhase()
		return
	} else if (store.gameflow.phase === rf.PHASE_CITY_GROWTH) {
		// Reform the turn order in case city growth phase was played
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()
		// Now check for game over / era change
		store.gameflow.phase = rf.PHASE_NEW_ERA
		// Now remove all rec'd goods
		for (let i = 0; i < store.cities.length; i++) {
			store.cities[i].receivedGoods.splice(0)
		}

		store.gameflow.turn++
		store.context.historyObj.splice(0)
		store.context.historyObj.push(store.gameflow.turn)
		if (!store.hiddenMoney) {
			for (let i = 0; i < store.players.length; i++) {
				store.context.historyObj.push([store.players[i].moneyCash, store.players[i].moneyBank])
			}
		}

		let newEraHistoryEntryData = [false, []]

		if (model.checkForEraChange()) {
			newEraHistoryEntryData[0] = true
			//newEraHistoryEntryData[1] = model.actionEraChange()
			// All cards removed at game creation, so no new data needed
			model.actionEraChange()
			if (store.gameflow.phase === rf.PHASE_GAME_OVER) return
			if (store.players.length === 2) {
				store.gameflow.turnOrder = store.gameflow.fullTurnOrder.concat(store.gameflow.fullTurnOrder)
				Bot.removeBotPlayers()
			}
		}
		// else move on to turn order
		else store.gameflow.phase = rf.PHASE_BID_TURN_ORDER
		// Add a new turn entry
		model.addHistory(rf.HIST_NEW_TURN, -1, 0, [...store.context.historyObj])
		//if (newEraHistoryEntryData[0]) model.addHistory(rf.HIST_NEW_ERA, -1, 0, [store.gameflow.currentEra, [...newEraHistoryEntryData[1]]])
		if (newEraHistoryEntryData[0]) model.addHistory(rf.HIST_NEW_ERA, -1, 0, [store.gameflow.currentEra])
		store.context.historyObj.splice(0)
	}

	// Reset all roundIncomes here
	for (let i = 0; i < store.players.length; i++) store.players[i].moneyRoundIncome = 0

	// Always check for skips
	actionAllPlayerSkips()

	// If the ENTIRE phase is skipped, add history here
	if (store.gameflow.turnOrder.length === 0) {
		if (store.gameflow.phase === rf.PHASE_ACQUISITIONS) model.addHistory(rf.HIST_SKIP_ACQUISITOIN_PHASE, -1, 0, [])
		endCurrentPhase()
	} else if (store.gameflow.phase === rf.PHASE_ACQUISITIONS) {
		for (let i = 0; i < store.context.historyObj.length; i++) {
			if (store.context.historyObj[i][1] === 0) model.addHistory(rf.HIST_AUTO_SKIP_SINGLE_ACQUISITOIN, store.context.historyObj[i][0], 0, [])
			else if (store.context.historyObj[i][1] === 1) model.addHistory(rf.HIST_SKIP_ACQUISITOIN_NO_COMPANIES, store.context.historyObj[i][0], 0, [])
		}
		store.context.historyObj.splice(0)
	}
}

export function actionAllPlayerSkips() {
	const store = useModelStore()

	store.context.historyObj.splice(0)
	while (canSkipCurrentPlayer()) {
		if (store.gameflow.phase === rf.PHASE_MERGERS) {
			store.ongoingVars.passedPlayerIndexes.push(currentPlayerIndex())
			// Only record a pass if there was some possible action
			if (store.gameflow.turn > 1 && store.context.mergerStatusArray.filter(model.canMergeEntry(store.hiddenMoney)).length !== 0 && store.history[store.history.length - 1][0] === rf.HIST_PASS_MERGER) {
				store.history[store.history.length - 1][3].push(currentPlayerIndex())
			} else if (store.gameflow.turn > 1 && store.context.mergerStatusArray.filter(model.canMergeEntry(store.hiddenMoney)).length !== 0) model.addHistory(rf.HIST_PASS_MERGER, -1, 0, [currentPlayerIndex()])
		}
		store.gameflow.turnOrder.shift()
	}
	// THIS IS REQURED because checking skips sometimes checks what can be highlighted - so need to remove here
	store.removeAllActiveHighlights()
}

export async function endPlayerTurn() {
	const store = useModelStore()

	store.clearMessages()
	store.removeAllActiveHighlights()

	if (store.gameflow.phase === rf.PHASE_BID_TURN_ORDER) {
		let entry = store.ongoingVars.newTurnOrderBids.find((entry) => entry[0] === currentPlayerIndex())
		currentPlayerObj().moneyCash -= entry[1]
		currentPlayerObj().moneyBank += entry[1]
		store.gameflow.turnOrder.shift()
	} else if (store.gameflow.phase === rf.PHASE_MERGERS) {
		// You are either setting up a merger, or passing
		if (store.context.selectedMergerBid === 0 || store.context.selectedMergerBid < store.ongoingVars.nominalValue) {
			// You are declining to merge.
			if (store.gameflow.turn > 1 && store.history[store.history.length - 1][0] === rf.HIST_PASS_MERGER) {
				store.history[store.history.length - 1][3].push(currentPlayerIndex())
			} else if (store.gameflow.turn > 1) model.addHistory(rf.HIST_PASS_MERGER, -1, 0, [currentPlayerIndex()])
			store.resetOngoingVars(true)
			store.ongoingVars.passedPlayerIndexes.push(currentPlayerIndex())
			store.ongoingVars.passedPlayerIndexes = [...new Set(store.ongoingVars.passedPlayerIndexes)]
			// IF everyone has passed, end the phase by removing everyone
			if (store.ongoingVars.passedPlayerIndexes.length === store.players.length) {
				// End the phase
				store.resetOngoingVars(false)
				store.gameflow.turnOrder.splice(0)
			}
			// Otherwise, revolve the turn order
			else {
				store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
			}
		}
		// Else you are bidding on a NEW merger
		else {
			// So remove the passed player info
			store.ongoingVars.passedPlayerIndexes.splice(0)
			store.ongoingVars.currentBidderIndex = currentPlayerIndex()
			store.ongoingVars.currentBid = store.context.selectedMergerBid
			// If other players can bid, then create a bidding turn order
			let eligibleBidderIndexes = []
			for (let i = 0; i < store.players.length; i++) {
				// You need money to bid, and either free slot, OR be in the merger
				let availableMoney = store.players[i].moneyCash
				if (store.useMergerSubsidy) availableMoney += (store.players[i].RnD[rf.RnD_MERGER_SUBSIDY_IDX] - 1) * rf.MERGER_SUBSIDY_MULTIPLIER
				if (availableMoney >= store.ongoingVars.currentBid + store.ongoingVars.bidIncrement || store.hiddenMoney) {
					// Now you have enough cash, check whether you have enough slots
					let freeSlot = false
					// Either fully free slot
					if (!model.hasNoFreeSlots(store.players[i])) freeSlot = true
					// OR be in the merger
					else if (store.ongoingVars.selectedMergerInfo[0][0] === i || store.ongoingVars.selectedMergerInfo[1][0] === i) freeSlot = true
					// But NOT a bot
					if (store.players[i].displayName === rf.BOT_NAME) freeSlot = false
					if (freeSlot) eligibleBidderIndexes.push(i)
				}
			}
			// If no one else can bid, or only the current winner can bid, complete the merger
			if (eligibleBidderIndexes.length === 0 || (eligibleBidderIndexes.length === 1 && eligibleBidderIndexes[0] === store.ongoingVars.currentBidderIndex)) {
				// Add history
				// store.ongoingVars.selectedMergerInfo
				// //[playerIndex, slotIdx, totalTerrs]

				store.context.historyObj.splice(0)
				store.context.historyObj.push(store.ongoingVars.currentBid)

				let comp1playerIndex = store.ongoingVars.selectedMergerInfo[0][0]
				let comp1slotIndex = store.ongoingVars.selectedMergerInfo[0][1]
				let comp1PlayerGain = store.ongoingVars.currentBid * (store.ongoingVars.selectedMergerInfo[0][2] / (store.ongoingVars.selectedMergerInfo[0][2] + store.ongoingVars.selectedMergerInfo[1][2]))
				let comp2playerIndex = store.ongoingVars.selectedMergerInfo[1][0]
				let comp2slotIndex = store.ongoingVars.selectedMergerInfo[1][1]
				let comp2PlayerGain = store.ongoingVars.currentBid * (store.ongoingVars.selectedMergerInfo[1][2] / (store.ongoingVars.selectedMergerInfo[0][2] + store.ongoingVars.selectedMergerInfo[1][2]))

				comp1PlayerGain = parseInt(comp1PlayerGain)
				comp2PlayerGain = parseInt(comp2PlayerGain)

				let comp1Info = [comp1playerIndex, [...store.players[comp1playerIndex].slots[comp1slotIndex]], comp1PlayerGain]
				if (model.getActiveCompanyDataFromID(store.players[comp1playerIndex].slots[comp1slotIndex][0]).type === rf.COMPANY_SHIPPING) comp1Info.push(view.SHIP_GFX_TO_NUM(model.getActiveCompanyDataFromID(store.players[comp1playerIndex].slots[comp1slotIndex][0]).shipGfx))
				let comp2Info = [comp2playerIndex, [...store.players[comp2playerIndex].slots[comp2slotIndex]], comp2PlayerGain]
				if (model.getActiveCompanyDataFromID(store.players[comp2playerIndex].slots[comp2slotIndex][0]).type === rf.COMPANY_SHIPPING) comp2Info.push(view.SHIP_GFX_TO_NUM(model.getActiveCompanyDataFromID(store.players[comp2playerIndex].slots[comp2slotIndex][0]).shipGfx))

				store.context.historyObj.push([...comp1Info])
				store.context.historyObj.push([...comp2Info])
				model.addHistory(rf.HIST_MERGER_WITHOUT_BIDDING, currentPlayerIndex(), 0, [...store.context.historyObj])
				// Now add in skipped players with the reason
				for (let i = 0; i < store.players.length; i++) {
					if (!eligibleBidderIndexes.includes(i)) {
						// If no free slot and not in merge
						if (model.hasNoFreeSlots(store.players[i]) && store.ongoingVars.selectedMergerInfo[0][0] !== i && store.ongoingVars.selectedMergerInfo[1][0] !== i) {
							store.history[store.history.length - 1][3].push([-5, i])
						}
						// Otherwise you must be short on money - but don't include you if YOU are highest bidder
						else if (i !== store.ongoingVars.currentBidderIndex) store.history[store.history.length - 1][3].push([-6, i])
					}
				}
				store.context.historyObj.splice(0)
				model.completeMerger()
				// Start of merger, WITH bidding
			} else if (eligibleBidderIndexes.length > 0) {
				let tempBidTurnOrder = [...store.gameflow.fullTurnOrder]
				while (tempBidTurnOrder[0] !== currentPlayerIndex()) tempBidTurnOrder.push(tempBidTurnOrder.shift())
				tempBidTurnOrder.push(tempBidTurnOrder.shift())
				// So now we have the correct bidding order. So just fill in with eligible players
				store.ongoingVars.bidTurnOrder.splice(0)
				// NB removed players are found due to absence, history done at end
				for (let i = 0; i < tempBidTurnOrder.length; i++) {
					if (eligibleBidderIndexes.includes(tempBidTurnOrder[i])) store.ongoingVars.bidTurnOrder.push(tempBidTurnOrder[i])
				}
				store.gameflow.phase = rf.PHASE_MERGER_BIDDING

				// Start the history
				store.context.historyObj.splice(0)
				store.context.historyObj.push(store.ongoingVars.currentBid)

				let comp1playerIndex = store.ongoingVars.selectedMergerInfo[0][0]
				let comp1slotIndex = store.ongoingVars.selectedMergerInfo[0][1]
				let comp2playerIndex = store.ongoingVars.selectedMergerInfo[1][0]
				let comp2slotIndex = store.ongoingVars.selectedMergerInfo[1][1]

				let comp1Info = [comp1playerIndex, [...store.players[comp1playerIndex].slots[comp1slotIndex]]]
				if (model.getActiveCompanyDataFromID(store.players[comp1playerIndex].slots[comp1slotIndex][0]).type === rf.COMPANY_SHIPPING) comp1Info.push(view.SHIP_GFX_TO_NUM(model.getActiveCompanyDataFromID(store.players[comp1playerIndex].slots[comp1slotIndex][0]).shipGfx))
				let comp2Info = [comp2playerIndex, [...store.players[comp2playerIndex].slots[comp2slotIndex]]]
				if (model.getActiveCompanyDataFromID(store.players[comp2playerIndex].slots[comp2slotIndex][0]).type === rf.COMPANY_SHIPPING) comp2Info.push(view.SHIP_GFX_TO_NUM(model.getActiveCompanyDataFromID(store.players[comp2playerIndex].slots[comp2slotIndex][0]).shipGfx))

				store.context.historyObj.push([...comp1Info])
				store.context.historyObj.push([...comp2Info])
				// CANNOT use currentPlayerIndex() here, as phase has shifted to merger bidding
				model.addHistory(rf.HIST_MERGER_BIDDING, store.gameflow.turnOrder[0], 0, [...store.context.historyObj])
				store.context.historyObj.splice(0)
				// Now add in skipped players with the reason
				for (let i = 0; i < store.players.length; i++) {
					if (!eligibleBidderIndexes.includes(i)) {
						// If no free slot and not in merge
						if (model.hasNoFreeSlots(store.players[i]) && store.ongoingVars.selectedMergerInfo[0][0] !== i && store.ongoingVars.selectedMergerInfo[1][0] !== i) {
							store.history[store.history.length - 1][3].push([-5, i])
						}
						// Otherwise you must be short on money
						else if (i !== store.ongoingVars.currentBidderIndex) store.history[store.history.length - 1][3].push([-6, i])
					}
				}
			}
		}
	} else if (store.gameflow.phase === rf.PHASE_MERGER_BIDDING) {
		if (store.context.selectedMergerBid === 0) {
			// Add the pass to the history
			let histIndex = store.history.length - 1
			while (store.history[histIndex][0] !== rf.HIST_MERGER_BIDDING) histIndex--
			store.history[histIndex][3].push([currentPlayerIndex(), 0])
			// Remove from the bidding order
			store.ongoingVars.bidTurnOrder.shift()
		} else {
			// Set new high bidder, rotate turn order
			store.ongoingVars.currentBidderIndex = currentPlayerIndex()
			store.ongoingVars.currentBid = store.context.selectedMergerBid

			// Add the bid to the history
			let histIndex = store.history.length - 1
			while (store.history[histIndex][0] !== rf.HIST_MERGER_BIDDING) histIndex--
			store.history[histIndex][3].push([currentPlayerIndex(), store.context.selectedMergerBid])
			store.ongoingVars.bidTurnOrder.push(store.ongoingVars.bidTurnOrder.shift())
		}

		// NOW PROCESS PRE-BIDS IN TURN
		let currentPlayerNeedsToMove = false
		// Remember: You need 2 players in the bid turn order to have an auction, otherwise someone has just won
		while (!currentPlayerNeedsToMove && store.ongoingVars.bidTurnOrder.length >= 2) {
			// If the player doesnt have enough money, remove them from turn order ONLY IF NOT HIDDEN MONEY
			let availableMoney = store.players[store.ongoingVars.bidTurnOrder[0]].moneyCash
			if (store.useMergerSubsidy) availableMoney += (store.players[store.ongoingVars.bidTurnOrder[0]].RnD[rf.RnD_MERGER_SUBSIDY_IDX] - 1) * rf.MERGER_SUBSIDY_MULTIPLIER

			if (!store.hiddenMoney && availableMoney < store.ongoingVars.currentBid + store.ongoingVars.bidIncrement) {
				// Add the pass to the history
				let histIndex = store.history.length - 1
				while (store.history[histIndex][0] !== rf.HIST_MERGER_BIDDING) histIndex--
				store.history[histIndex][3].push([-6, currentPlayerIndex()])
				store.ongoingVars.bidTurnOrder.shift()
			}
			// IF hidden money AND not enough money, need to allow a pass
			else if (store.hiddenMoney && store.players[store.ongoingVars.bidTurnOrder[0]].moneyCash < store.ongoingVars.currentBid + store.ongoingVars.bidIncrement) currentPlayerNeedsToMove = true
			// If you don't have a pre-move, then you need to move
			else if (!store.ongoingVars.preBidData.some((entry) => entry[0] === store.ongoingVars.bidTurnOrder[0])) {
				currentPlayerNeedsToMove = true
			}
			// Now you have a pre-move, AND enough money to bid
			else {
				// So set the bid data, and move on to the next player
				let preBidData = store.ongoingVars.preBidData.find((entry) => entry[0] === store.ongoingVars.bidTurnOrder[0])
				let maxBid = preBidData[1]
				let passFlag = preBidData[2] === 1
				// If you can max bid, do a bid
				if (maxBid >= store.ongoingVars.currentBid + store.ongoingVars.bidIncrement) {
					store.ongoingVars.currentBidderIndex = currentPlayerIndex()
					store.ongoingVars.currentBid = store.ongoingVars.currentBid + store.ongoingVars.bidIncrement
					// Add the bid to the history
					let histIndex = store.history.length - 1
					while (store.history[histIndex][0] !== rf.HIST_MERGER_BIDDING) histIndex--
					store.history[histIndex][3].push([currentPlayerIndex(), store.ongoingVars.currentBid])
					store.ongoingVars.bidTurnOrder.push(store.ongoingVars.bidTurnOrder.shift())
				}
				// Else if you can't bid, follow the pass / take turn flag
				else if (maxBid < store.ongoingVars.currentBid + store.ongoingVars.bidIncrement) {
					if (passFlag) {
						// Add the pass to the history
						let histIndex = store.history.length - 1
						while (store.history[histIndex][0] !== rf.HIST_MERGER_BIDDING) histIndex--
						store.history[histIndex][3].push([currentPlayerIndex(), 0])
						// Remove from the bidding order
						store.ongoingVars.bidTurnOrder.shift()
					}
					// Else you want a turn instead of passing
					else {
						if (store.players[store.ongoingVars.bidTurnOrder[0]].displayName === rf.BOT_NAME) currentPlayerNeedsToMove = false
						else currentPlayerNeedsToMove = true
					}
				}
			}
		}

		// Check reamining players for enough money ONLY IF MONEY HIDDEN
		/*for (let i = store.ongoingVars.bidTurnOrder.length - 1; i >= 0; i--) {
			if (store.players[store.ongoingVars.bidTurnOrder[i]].moneyCash < store.ongoingVars.currentBid + store.ongoingVars.bidIncrement) {
				store.ongoingVars.bidTurnOrder.splice(i, 1)
			}
		}*/

		// Check for no players or only 1 winning player
		if (store.ongoingVars.bidTurnOrder.length === 0 || (store.ongoingVars.bidTurnOrder.length === 1 && store.ongoingVars.bidTurnOrder[0] === store.ongoingVars.currentBidderIndex)) {
			// Add the winning bid to the history, along with payouts
			let comp1PlayerGain = store.ongoingVars.currentBid * (store.ongoingVars.selectedMergerInfo[0][2] / (store.ongoingVars.selectedMergerInfo[0][2] + store.ongoingVars.selectedMergerInfo[1][2]))
			let comp2PlayerGain = store.ongoingVars.currentBid * (store.ongoingVars.selectedMergerInfo[1][2] / (store.ongoingVars.selectedMergerInfo[0][2] + store.ongoingVars.selectedMergerInfo[1][2]))

			comp1PlayerGain = parseInt(comp1PlayerGain)
			comp2PlayerGain = parseInt(comp2PlayerGain)

			let histIndex = store.history.length - 1
			while (store.history[histIndex][0] !== rf.HIST_MERGER_BIDDING) histIndex--
			// last but 1 entry
			//store.history[histIndex][3].push([currentPlayerIndex(), store.context.selectedMergerBid])
			// FINAL ENRTRY
			store.history[histIndex][3].push([-2, comp1PlayerGain, comp2PlayerGain])

			// This also resets the phase to MERGERS or SF_TERRS, or SHIP_TERRS
			model.completeMerger()
		}
	} else if (store.gameflow.phase === rf.PHASE_MERGER_REMOVE_SIAP_FAJI_TERRS) {
		model.addHistory(rf.HIST_MERGER_REMOVE_SIAP_FAJI_TERRS, currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
		store.gameflow.phase = rf.PHASE_MERGERS
		store.gameflow.turnOrder.shift()
	} else if (store.gameflow.phase === rf.PHASE_MERGER_SHIP_REDEPLOYMENT) {
		model.addHistory(rf.HIST_MERGER_SHIP_REDEPLOYMENT, currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
		store.gameflow.phase = rf.PHASE_MERGERS
		store.gameflow.turnOrder.shift()
	} else if (store.gameflow.phase === rf.PHASE_ACQUISITIONS) {
		if (store.context.acquiredCompany) {
			if (model.hasNoFreeSlots(currentPlayerObj())) store.gameflow.turnOrder.shift()
			else store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
		} else {
			model.addHistory(rf.HIST_PLAYER_SKIP_ACQUISITOIN_PHASE, currentPlayerIndex(), 0, [])
			store.gameflow.turnOrder.shift()
		}
	} else if (store.gameflow.phase === rf.PHASE_OPERATIONS) {
		// Mark the slot comps as used
		if (store.context.selectedSlotToOperate !== -1) {
			for (let i = 0; i < currentPlayerObj().slots[store.context.selectedSlotToOperate].length; i++) {
				let company = model.getActiveCompanyDataFromID(currentPlayerObj().slots[store.context.selectedSlotToOperate][i])
				company.operated = true
				// Mark land terrs as used
				if (rf.LAND_COMPANIES.includes(company.type)) {
					for (let j = 0; j < company.territories.length; j++) {
						company.territories[j][1] = true
					}
				}
			}
		}
		// Add the hisory
		if (store.context.historyObj.length > 0 && model.getActiveCompanyDataFromID(store.context.historyObj[0][0]).type === rf.COMPANY_SHIPPING) {
			store.context.historyObj.push(view.SHIP_GFX_TO_NUM(model.getActiveCompanyDataFromID(store.context.historyObj[0][0]).shipGfx))
			model.addHistory(rf.HIST_OPERATE_SHIPPING, currentPlayerIndex(), 0, [...store.context.historyObj])
			store.context.historyObj.splice(0)
		} else if (store.context.historyObj.length > 0 && rf.LAND_COMPANIES.includes(model.getActiveCompanyDataFromID(store.context.historyObj[0][0]).type)) {
			if (store.context.historyObj.length === 2 && store.context.historyObj[1][0] === -2) {
				model.addHistory(rf.HIST_SKIP_OPERATE_LAND, currentPlayerIndex(), 0, [...store.context.historyObj[0]])
			} else if (store.context.historyObj.length === 2 && store.context.historyObj[1][0] === -1) {
				store.context.historyObj[1].shift()
				model.addHistory(rf.HIST_OPERATE_LAND_PAID_EXPANSION_ONLY, currentPlayerIndex(), 0, [...store.context.historyObj])
			} else model.addHistory(rf.HIST_OPERATE_LAND, currentPlayerIndex(), 0, [...store.context.historyObj])
			store.context.historyObj.splice(0)
		}

		// Remove companies with no space
		model.markActiveCompaniesWithNoStartTerritoriesForRemoval()

		// Reset Shipping
		model.resetShippingCompanies(false)

		let shiftTurn = true
		for (let i = 0; i < currentPlayerObj().slots.length; i++) {
			if (currentPlayerObj().slots[i].length > 0) {
				let company = model.getActiveCompanyDataFromID(currentPlayerObj().slots[i][0])
				if (!company.operated) {
					shiftTurn = false
					break
				}
			}
		}
		if (shiftTurn) store.gameflow.turnOrder.shift()
		else store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
	} else if (store.gameflow.phase === rf.PHASE_CITY_GROWTH) {
		model.addHistory(rf.HIST_MANUAL_CITY_GROWTH, currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)
		store.gameflow.turnOrder.shift()
	} 
	// merger bidding has finished, so don't remove the 'new' current player yet
	else if (store.gameflow.phase !== rf.PHASE_MERGERS) store.gameflow.turnOrder.shift()

	store.clearVars()

	// If you are now in the SF_terr OR ship_terr removal phase, DO NOT change player order or end phase
	if (store.gameflow.phase !== rf.PHASE_MERGER_REMOVE_SIAP_FAJI_TERRS && store.gameflow.phase !== rf.PHASE_MERGER_SHIP_REDEPLOYMENT) {
		// Action Player Skips
		actionAllPlayerSkips()

		// AQ auto pass history
		if (store.gameflow.phase === rf.PHASE_ACQUISITIONS) {
			for (let i = 0; i < store.context.historyObj.length; i++) {
				if (store.context.historyObj[i][1] === 0) model.addHistory(rf.HIST_AUTO_SKIP_SINGLE_ACQUISITOIN, store.context.historyObj[i][0], 0, [])
				else if (store.context.historyObj[i][1] === 1) model.addHistory(rf.HIST_SKIP_ACQUISITOIN_NO_COMPANIES, store.context.historyObj[i][0], 0, [])
			}
			store.context.historyObj.splice(0)
		}

		// Check for merger all passed
		if (store.gameflow.phase === rf.PHASE_MERGERS) {
			for (let i = 0; i < store.players.length; i++) {
				if (store.players[i].displayName === rf.BOT_NAME) store.ongoingVars.passedPlayerIndexes.push(i)
			}
			// make sure it's uniq
			store.ongoingVars.passedPlayerIndexes = [...new Set(store.ongoingVars.passedPlayerIndexes)]

			if (store.ongoingVars.passedPlayerIndexes.length === store.gameflow.fullTurnOrder.length) store.gameflow.turnOrder.splice(0)
		}

		if (store.gameflow.phase !== rf.PHASE_MERGER_BIDDING && store.gameflow.turnOrder.length === 0) endCurrentPhase()
	}

	// await save
	await IO.saveGame(true, false)

	// Have this for training games
	startPlayerTurn()
}

export function canSkipCurrentPlayer() {
	const store = useModelStore()
	// Always skip bots - NB these SHOULDNT ever be in turnOrder, so this is a backup
	if (store.gameflow.turnOrder.length > 0 && store.players[store.gameflow.turnOrder[0]].displayName === rf.BOT_NAME) return true

	// You can't skip if the turn is over
	if (store.gameflow.turnOrder.length === 0) return false

	let playerIndex = store.gameflow.turnOrder[0]
	let playerObj = store.players[playerIndex]

	if (store.gameflow.phase === rf.PHASE_NEW_ERA) {
		let validEraCards
		if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap))
			validEraCards = currentPlayerObj()
				.eraCards.map((cardId) => rf.ALL_ERA_CARDS.find((card) => card.id === cardId))
				.filter((card) => card.era === store.gameflow.currentEra)
		else if (store.mapData.selectedMap === rf.MAP_AEGEAN)
			validEraCards = currentPlayerObj()
				.eraCards.map((cardId) => rf.AG_ALL_ERA_CARDS.find((card) => card.id === cardId))
				.filter((card) => card.era === store.gameflow.currentEra)
		else if (store.mapData.selectedMap === rf.MAP_PHP)
			validEraCards = currentPlayerObj()
				.eraCards.map((cardId) => rf.PH_ALL_ERA_CARDS.find((card) => card.id === cardId))
				.filter((card) => card.era === store.gameflow.currentEra)

		if (validEraCards.length === 2) {
			//let terrCount = 0
			store.context.selectedEraCard = validEraCards[0].id
			model.setupEraCardHighlights(validEraCards[0].id)
			if (store.context.territoriesToHighlight.length > 0) return false
			store.context.selectedEraCard = validEraCards[1].id
			model.setupEraCardHighlights(validEraCards[1].id)
			if (store.context.territoriesToHighlight.length > 0) return false
			// So now both are invalid
			// Record history - extra info if already 12 level 12 cities
			let cityCount = 0
			for (let i = 0; i < store.cities.length; i++) {
				if (store.cities[i].size === 1) cityCount++
			}
			if (cityCount >= 12) model.addHistory(rf.HIST_REMOVE_ERA_CARD, playerIndex, 0, [validEraCards[0].id, 1])
			else model.addHistory(rf.HIST_REMOVE_ERA_CARD, playerIndex, 0, [validEraCards[0].id])

			// remove the era card
			playerObj.eraCards = playerObj.eraCards.filter((cardID) => cardID !== validEraCards[0].id)
			return true
		}

		if (validEraCards.length === 1) {
			store.context.selectedEraCard = validEraCards[0].id
			model.setupEraCardHighlights(validEraCards[0].id)

			if (store.context.territoriesToHighlight.length > 0) return false

			// Otherwise Record history and skip
			let cityCount = 0
			for (let i = 0; i < store.cities.length; i++) {
				if (store.cities[i].size === 1) cityCount++
			}
			if (cityCount >= 12) model.addHistory(rf.HIST_REMOVE_ERA_CARD, playerIndex, 0, [validEraCards[0].id, 1])
			else model.addHistory(rf.HIST_REMOVE_ERA_CARD, playerIndex, 0, [validEraCards[0].id])
			// remove the era card
			playerObj.eraCards = playerObj.eraCards.filter((cardID) => cardID !== validEraCards[0].id)
			return true
		}
		return false
	} else if (store.gameflow.phase === rf.PHASE_MERGERS) {
		// Just collect a "dumb" copy of all relevant data
		const activeSlots = model.getActiveSlotListDataObject(store.players, store.activeCompanies)
		// Now filter all the data down into possible options
		const mergerArray = model.slotPairMergerStatus(activeSlots, playerIndex, playerObj, store.gameflow.currentEra)
		store.context.mergerStatusArray = mergerArray
		if (mergerArray.filter(model.canMergeEntry(store.hiddenMoney)).length === 0) {
			/*
							indices: [[slots[n].player, slots[n].slot], [slots[k].player, slots[k].slot]],
				alreadyMerged: wasMerged,
				invalidType: !(sameType || siapFaji),
				tooEarlyForSiap: siapFaji && currentEra < rf.ERA_B,
				insufficientMerger: mergerTech < slots[n].deedCount + slots[k].deedCount,
				noFreeSlot: !(freeSlots || [slots[n].player, slots[k].player].includes(playerIndex)),
				lowCash: cash < unitCost * (slots[n].territoryCount + slots[k].territoryCount)})
				*/

			// Check EVERYTHING already merged
			if (mergerArray.every((x) => x.alreadyMerged)) {
				if (store.history[store.history.length - 1][0] === rf.HIST_AUTO_SKIP_MERGERS) store.history[store.history.length - 1][3].push([playerIndex, 9])
				else model.addHistory(rf.HIST_AUTO_SKIP_MERGERS, -1, 0, [[playerIndex, 9]]) // 9 = all merged
				return true
			}
			store.context.historyObj.splice(0)
			store.context.historyObj.push(playerIndex)

			if (mergerArray.every((x) => x.insufficientMerger)) {
				if (store.history[store.history.length - 1][0] === rf.HIST_AUTO_SKIP_MERGERS) store.history[store.history.length - 1][3].push([playerIndex, 1])
				else model.addHistory(rf.HIST_AUTO_SKIP_MERGERS, -1, 0, [[playerIndex, 1]])
				return true
			} else if (mergerArray.some((x) => x.insufficientMerger)) store.context.historyObj.push(2) // SOME insufficient merger tech

			if (mergerArray.every((x) => x.noFreeSlot)) {
				store.context.historyObj.push(3) // ALL insufficient slot tech
				if (store.history[store.history.length - 1][0] === rf.HIST_AUTO_SKIP_MERGERS) store.history[store.history.length - 1][3].push([playerIndex, 3])
				else model.addHistory(rf.HIST_AUTO_SKIP_MERGERS, -1, 0, [[playerIndex, 3]])
				return true
			} else if (mergerArray.some((x) => x.noFreeSlot)) store.context.historyObj.push(4) // SOME insufficient slot tech

			if (mergerArray.every((x) => x.lowCash)) {
				store.context.historyObj.push(5) // ALL insufficient cash
				if (store.history[store.history.length - 1][0] === rf.HIST_AUTO_SKIP_MERGERS) store.history[store.history.length - 1][3].push([playerIndex, 5])
				else model.addHistory(rf.HIST_AUTO_SKIP_MERGERS, -1, 0, [[playerIndex, 5]])
				return true
			} else if (mergerArray.some((x) => x.lowCash)) store.context.historyObj.push(6) // SOME insufficient cash

			// Now record all the partials
			if (store.history[store.history.length - 1][0] === rf.HIST_AUTO_SKIP_MERGERS) store.history[store.history.length - 1][3].push([...store.context.historyObj])
			else model.addHistory(rf.HIST_AUTO_SKIP_MERGERS, -1, 0, [[...store.context.historyObj]])

			return true
		}
		return false
	} else if (store.gameflow.phase === rf.PHASE_ACQUISITIONS) {
		if (model.hasNoFreeSlots(playerObj)) {
			store.context.historyObj.push([playerIndex, 0])
			return true
		}
		if (store.availableCompanies.length === 0) {
			store.context.historyObj.push([playerIndex, 1])
			return true
		}
		return false
	} else if (store.gameflow.phase === rf.PHASE_R_AND_D) {
		for (let i = 0; i < playerObj.RnD.length; i++) {
			if (playerObj.RnD[i] < 5) return false
		}
		return true
	} else if (store.gameflow.phase === rf.PHASE_OPERATIONS) {
		let hasAnyCompany = false
		let hasOperableCompany = false
		let nonOperableShippingSlotIdx = -1
		for (let i = 0; i < playerObj.slots.length; i++) {
			if (playerObj.slots[i].length > 0) {
				hasAnyCompany = true
				let company = model.getActiveCompanyDataFromID(playerObj.slots[i][0])
				if (!company.operated && rf.LAND_COMPANIES.includes(company.type)) hasOperableCompany = true
				// Otherwise, it is a shipping company, so check if it is at max capac
				else if (!company.operated && company.type === rf.COMPANY_SHIPPING) {
					// This works because merged shipping terrs ALL go to company 0
					if (company.territories.length < company.combinedCapacity[store.gameflow.currentEra]) hasOperableCompany = true
					else nonOperableShippingSlotIdx = i
				}
			}
		}

		// Cannot skip with any operable company
		if (hasOperableCompany) return false
		// Can skip with no companies
		if (!hasAnyCompany) return true
		// So now you have shipping comp(s) that you can't operate, with one being in slot index nonOperableShippingSlotIdx
		for (let i = 0; i < playerObj.slots[nonOperableShippingSlotIdx].length; i++) {
			model.getActiveCompanyDataFromID(playerObj.slots[nonOperableShippingSlotIdx][i]).operated = true
		}
		model.addHistory(rf.HIST_AUTO_SKIP_SHIP_OPERATE, playerIndex, 0, [[...playerObj.slots[nonOperableShippingSlotIdx]], view.SHIP_GFX_TO_NUM(model.getActiveCompanyDataFromID(playerObj.slots[nonOperableShippingSlotIdx][0]).shipGfx)])
		return true
	}
}
