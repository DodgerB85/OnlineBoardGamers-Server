import * as rf from "./INDreference"
import * as funcs from "./INDfuncs"
import * as map from "./INDmap"
import * as model from "./INDmodel"
import * as history from "./INDhistory"
import * as controller from "./INDcontroller"

import { useModelStore } from "../stores/INDstore.js"
import { usePersonalStore } from "../stores/INDpersonal.js"

export function goToReplayStep(step) {
	const store = useModelStore()

	store.replayStep = step
	funcs.simpleImportWholeINDmodelNoCompression(store.replayData[store.replayStep], false)
	history.setupHistoryHighlight(store.computedHistory[store.replayStep][0], store.computedHistory[store.replayStep][3], store.replayStep) // ADD STEP???
	if (store.topMenuViews.showingPlayerIndex !== -1) store.topMenuViews.showingPlayerIndex = controller.currentPlayerIndex()
}

export function performStep(amount) {
	const store = useModelStore()
	const personal = usePersonalStore()

	store.clearHistoryHelpers()
	store.clearMessages()
	if (amount === -99) store.replayStep = 0
	if (amount === -9) store.replayStep -= 5
	if (amount === -1) store.replayStep--
	if (amount === 1) store.replayStep++
	if (amount === 9) store.replayStep += 5
	if (amount === 99) store.replayStep = store.replayData.length - 1

	if (store.replayStep < 0) store.replayStep = 0
	if (store.replayStep > store.replayData.length - 1) store.replayStep = store.replayData.length - 1

	// Performing back to my last
	if (amount === -999) {
		let idx = store.replayStep
		idx--
		while (idx > 0) {
			let histEntry = store.computedHistory[idx]
			if (histEntry[1] === personal.pov) {
				store.replayStep = idx
				break
			}
			idx--
		}
	}

	funcs.simpleImportWholeINDmodelNoCompression(store.replayData[store.replayStep], false)

	history.setupHistoryHighlight(store.computedHistory[store.replayStep][0], store.computedHistory[store.replayStep][3], store.replayStep) // ADD STEP??
}

async function resetDataForReplay() {
	const store = useModelStore()

	// Reset Players
	for (let i = 0; i < store.players.length; i++) {
		store.players[i].moneyCash = 100
		store.players[i].moneyBank = 0
		store.players[i].moneyRoundIncome = 0
		store.players[i].RnD.splice(0)
		store.players[i].RnD = [1, 1, 1, 1, 1]
		store.players[i].slots.splice(0)
		store.players[i].slots = [[], [], [], [], []]
		//eraCards: [],
		// TODO REFORM ERA CARDS- or maybe just ignore, assume any played card is owned, and dont worry about it
	}

	// Add extra RnD slots as required
	for (let i = 0; i < store.players.length; i++) {
		if (store.useMergerSubsidy && !store.useShippingSubsidy) store.players[i].RnD.push(1)
		else if (!store.useMergerSubsidy && store.useShippingSubsidy) store.players[i].RnD.push(-1, 1)
		else if (store.useMergerSubsidy && store.useShippingSubsidy) store.players[i].RnD.push(1, 1)
	}

	store.cities.splice(0)
	store.activeCompanies.splice(0)

	// Set available companies for ERA_A using reactive pattern
	let newAvailableCompanies = []
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) {
		for (let i = 0; i < rf.ALL_COMPANIES.length; i++) {
			if (rf.ALL_COMPANIES[i].era === rf.ERA_A) newAvailableCompanies.push(JSON.parse(JSON.stringify(rf.ALL_COMPANIES[i])))
		}
	} else if (store.mapData.selectedMap === rf.MAP_AEGEAN) {
		for (let i = 0; i < rf.AG_ALL_COMPANIES.length; i++) {
			if (rf.AG_ALL_COMPANIES[i].era === rf.ERA_A) newAvailableCompanies.push(JSON.parse(JSON.stringify(rf.AG_ALL_COMPANIES[i])))
		}
	} else if (store.mapData.selectedMap === rf.MAP_PHP) {
		for (let i = 0; i < rf.PH_ALL_COMPANIES.length; i++) {
			if (rf.PH_ALL_COMPANIES[i].era === rf.ERA_A) newAvailableCompanies.push(JSON.parse(JSON.stringify(rf.PH_ALL_COMPANIES[i])))
		}
	}
	store.availableCompanies.splice(0, store.availableCompanies.length, ...newAvailableCompanies)

	// Reset gameflow
	store.gameflow.turnOrder.splice(0)
	store.gameflow.fullTurnOrder.splice(0)

	for (let i = 0; i < store.players.length; i++) {
		store.gameflow.turnOrder.push(i)
		store.gameflow.fullTurnOrder.push(i)
	}
	if (store.players.length === 2) {
		for (let i = 0; i < store.players.length; i++) {
			store.gameflow.turnOrder.push(i)
		}
	}

	store.gameflow.currentEra = rf.ERA_A

	// keep history
	store.clearVars()
	store.resetOngoingVars()
	store.spinoffReplayData.splice(0)
}

export async function generateReplayData(spoilerFree = false) {
	const store = useModelStore()
	// Before generating replay data, save the current state
	store.actualGameState.phase = store.gameflow.phase
	store.actualGameState.finishedGame = store.gameflow.phase === rf.PHASE_GAME_OVER
	store.actualGameState.era = store.gameflow.currentEra

	store.topMenuViews.generatingReplay = true

	let replayData = []

	// Reset the data
	await resetDataForReplay()
	let pBarEl = document.querySelector(".progress-bar div")
	const pBarTextEl = document.querySelector(".progress-bar span")

	for (let i = 0; i < store.computedHistory.length; i++) {
		if (i !== 0) checkAndPerformTurnEnd(i)

		store.spinoffReplayData.push(funcs.simpleExportWholeINDmodelNoCompression())

		/** THESE HAVE NO REPLAY YET -- BUT NOT ALL WILL NEED A REPLAY */
		/*// Non-player Actions
		// Player Actions
		export const HIST_SKIP_OPERATE_LAND = 17
		export const HIST_PLAYER_SKIP_ACQUISITOIN_PHASE = 20
		export const HIST_MERGER_WITHOUT_BIDDING = 21
		*/
		if (store.computedHistory[i][0] === rf.HIST_NEW_TURN) replayNewTurn(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_NEW_ERA) replayNewEra(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_ADD_CITY) replayAddCity(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_TURN_ORDER_BID) replayTurnOrderBid(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_SET_NEW_TURN_ORDER) replayNewTurnOrder(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_ACQUIRE_COMPANY) replayAcquireCompany(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_RND) replayRND(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_OPERATE_SHIPPING) replayOperateShipping(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_AUTO_SKIP_SHIP_OPERATE) replaySkipOperateShipping(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_OPERATE_LAND) replayOperateLand(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_SKIP_OPERATE_LAND) replaySkipOperateLand(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_MERGER_BIDDING) replayMergerBidding(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_MERGER_WITHOUT_BIDDING) replayMergerWithoutBidding(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_MERGER_REMOVE_SIAP_FAJI_TERRS) replayMergerRemoveSiapFajiTerrs(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_MERGER_SHIP_REDEPLOYMENT) replayMergerRedeployShips(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_OPERATE_LAND_PAID_EXPANSION_ONLY) replayOperateLandPaidExpansion(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_REMOVE_ERA_CARD) replayRemoveEraCard(i, store.computedHistory[i][1], store.computedHistory[i][3])
		else if (store.computedHistory[i][0] === rf.HIST_CITY_GROWTH) replayCityGrowth(i, store.computedHistory[i][1], store.computedHistory[i][3])

		replayData.push(funcs.simpleExportWholeINDmodelNoCompression())

		if (i % 5 === 0 && pBarEl != null) {
			let percent = (i / store.computedHistory.length) * 100
			pBarEl.style.width = percent + "%"
			pBarTextEl.innerText = Math.round(percent) + "%"
			await funcs.sleep(0)
		}
	} // END generating replay

	store.replayData = replayData
	store.replayStep = replayData.length - 1
	if (spoilerFree) {
		if (window.initData.replayStep <= 0) store.replayStep = 0
		else if (window.initData.replayStep >= store.replayData.length - 1) store.replayStep = store.replayData.length - 1
		else store.replayStep = window.initData.replayStep
	}
	if (store.replayData.length > 0) store.topMenuViews.showReplay = true
	goToReplayStep(store.replayStep)
	store.topMenuViews.generatingReplay = false
}

/*** REPLAY FUNCTIONS HERE */
function replayNewTurn(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	model.resetLandCompanies()
	model.resetShippingCompanies(true)
	for (let i = 0; i < store.players.length; i++) store.players[i].moneyRoundIncome = 0
	for (let i = 0; i < store.cities.length; i++) store.cities[i].receivedGoods.splice(0)
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
}

function replayNewEra(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	model.resetLandCompanies()
	model.resetShippingCompanies(true)
	for (let i = 0; i < store.players.length; i++) store.players[i].moneyRoundIncome = 0
	for (let i = 0; i < store.cities.length; i++) store.cities[i].receivedGoods.splice(0)
	store.gameflow.currentEra = entry3[0]
	// Remove available companies and set new era companies
	let newAvailableCompanies = []
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) {
		for (let i = 0; i < rf.ALL_COMPANIES.length; i++) {
			if (rf.ALL_COMPANIES[i].era === store.gameflow.currentEra) newAvailableCompanies.push(JSON.parse(JSON.stringify(rf.ALL_COMPANIES[i])))
		}
	} else if (store.mapData.selectedMap === rf.MAP_AEGEAN) {
		for (let i = 0; i < rf.AG_ALL_COMPANIES.length; i++) {
			if (rf.AG_ALL_COMPANIES[i].era === store.gameflow.currentEra) newAvailableCompanies.push(JSON.parse(JSON.stringify(rf.AG_ALL_COMPANIES[i])))
		}
	} else if (store.mapData.selectedMap === rf.MAP_PHP) {
		for (let i = 0; i < rf.PH_ALL_COMPANIES.length; i++) {
			if (rf.PH_ALL_COMPANIES[i].era === store.gameflow.currentEra) newAvailableCompanies.push(JSON.parse(JSON.stringify(rf.PH_ALL_COMPANIES[i])))
		}
	}
	store.availableCompanies.splice(0, store.availableCompanies.length, ...newAvailableCompanies)
}

function replayCityGrowth(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	for (let i = 0; i < entry3.length; i++) {
		for (let j = 0; j < entry3[i].length; j++) {
			let city = store.cities.find((city) => city.territory === entry3[i][j])
			city.size = i + 2
		}
	}
}
function replayRemoveEraCard(historyIndex, playerIndex, entry3) {
	// I'm not sure this is needed. Cards seem to disappear from reserve anyway
}

function replayMergerWithoutBidding(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	// Each mergingCompany should be //[playerIndex, slotIdx, totalTerrs]
	let ownerIndex1 = entry3[1][0]
	let slotIdx1 = model.getSlotIDXfromCompanyID(entry3[1][1][0])
	let slotSize1 = 0
	for (let i = 0; i < store.players[ownerIndex1].slots[slotIdx1].length; i++) {
		let company = model.getActiveCompanyDataFromID(store.players[ownerIndex1].slots[slotIdx1][i])
		slotSize1 += company.territories.length
	}
	let mergingCcomp1 = [ownerIndex1, slotIdx1, slotSize1]

	let ownerIndex2 = entry3[2][0]
	let slotIdx2 = model.getSlotIDXfromCompanyID(entry3[2][1][0])
	let slotSize2 = 0
	for (let i = 0; i < store.players[ownerIndex2].slots[slotIdx2].length; i++) {
		let company = model.getActiveCompanyDataFromID(store.players[ownerIndex2].slots[slotIdx2][i])
		slotSize2 += company.territories.length
	}
	let mergingCcomp2 = [ownerIndex2, slotIdx2, slotSize2]

	let winningPlayerIndex = playerIndex
	let winningBid = entry3[0]

	model.completeMerger_core(winningPlayerIndex, winningBid, [mergingCcomp1, mergingCcomp2])
}
function replayMergerBidding(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	// entry3[0] is the intiial bid
	// Next 2 entries are the comp info;
	// [playerIdx, [slot content]]
	// Then a series of bids [playerIdx, bid]
	// Final entry is [-2, firstCompPlayerGain, secondCompPlayerGain]

	// IF IT IS MID-MERGER, THEN IGNORE THIS ENTRY

	if (entry3[entry3.length - 1][0] !== -2) return

	// Each mergingCompany should be //[playerIndex, slotIdx, totalTerrs]
	let ownerIndex1 = entry3[1][0]
	let slotIdx1 = model.getSlotIDXfromCompanyID(entry3[1][1][0])
	let slotSize1 = 0
	for (let i = 0; i < store.players[ownerIndex1].slots[slotIdx1].length; i++) {
		let company = model.getActiveCompanyDataFromID(store.players[ownerIndex1].slots[slotIdx1][i])
		slotSize1 += company.territories.length
	}
	let mergingCcomp1 = [ownerIndex1, slotIdx1, slotSize1]

	let ownerIndex2 = entry3[2][0]
	let slotIdx2 = model.getSlotIDXfromCompanyID(entry3[2][1][0])
	let slotSize2 = 0
	for (let i = 0; i < store.players[ownerIndex2].slots[slotIdx2].length; i++) {
		let company = model.getActiveCompanyDataFromID(store.players[ownerIndex2].slots[slotIdx2][i])
		slotSize2 += company.territories.length
	}
	let mergingCcomp2 = [ownerIndex2, slotIdx2, slotSize2]
	// Find the winning playerIndex
	let winningPlayerIndex = -1
	let winningBid = -1
	for (let i = entry3.length - 2; i >= 3; i--) {
		if (entry3[i].length === 2 && entry3[i][0] >= 0 && entry3[i][1] > 0) {
			winningPlayerIndex = entry3[i][0]
			winningBid = entry3[i][1]
			break
		}
	}
	// If no high bid found, everyone passed
	if (winningPlayerIndex === -1 && winningBid === -1) {
		winningPlayerIndex = playerIndex
		winningBid = entry3[0]
	}

	model.completeMerger_core(winningPlayerIndex, winningBid, [mergingCcomp1, mergingCcomp2])
}

function replayMergerRemoveSiapFajiTerrs(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	let terrsToRemove = [...entry3]
	terrsToRemove.shift()
	for (let i = 0; i < store.players[playerIndex].slots[entry3[0]].length; i++) {
		let company = model.getActiveCompanyDataFromID(store.players[playerIndex].slots[entry3[0]][i])
		company.territories = company.territories.filter((territory) => !terrsToRemove.includes(territory[0]))
	}
}

function replayMergerRedeployShips(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	let terrsToRemove = [...entry3]
	terrsToRemove.shift()

	let company = model.getActiveCompanyDataFromID(store.players[playerIndex].slots[entry3[0]][0])
	//company.territories = company.territories.filter((territory) => !terrsToRemove.includes(territory[0]))
	let territories = company.territories
	for (let i = 1; i < entry3.length; i++) {
		const index = territories.findIndex((entry) => entry[0] === entry3[i])
		// If found (index is not -1), remove only that one element
		if (index !== -1) {
			territories.splice(index, 1)
		}
	}
}

function replayOperateLandPaidExpansion(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	// Mark companies as operated
	for (let i = 0; i < entry3[0].length; i++) {
		let slotCompanyID = entry3[0][i]
		let company = store.activeCompanies.find((company) => company.id === slotCompanyID)
		company.operated = true
	}

	let slotIdx = model.getSlotIDXfromCompanyID(entry3[0][0])
	for (let i = 0; i < entry3[1].length; i++) {
		model.expandCompany_core(playerIndex, slotIdx, entry3[1][i], false)
	}
}

function replaySkipOperateLand(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	// Make sure shipping co's are reset before operating a land
	model.resetShippingCompanies(false)
	// Mark companies as operated
	// Mark companies as operated
	for (let i = 0; i < entry3.length; i++) {
		let slotCompanyID = entry3[i]
		let company = store.activeCompanies.find((company) => company.id === slotCompanyID)
		company.operated = true
	}
}

function replayOperateLand(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	// Make sure shipping co's are reset before operating a land
	model.resetShippingCompanies(false)

	let companyID = entry3[0][0]

	//const store = useModelStore()
	let slotIdx = model.getSlotIDXfromCompanyID(companyID)
	// Deliver the goods
	for (let i = 1; i <= entry3.length - 2; i++) {
		// good joruney is [prod marker terr, ship_company_owner, ship_company_id chip_terr, ship_ter ship_ter..... city_terr]
		model.deliverGoodsToCity_core(playerIndex, entry3[0], entry3[i], true)
	}
	// Mark companies as operated
	for (let i = 0; i < entry3[0].length; i++) {
		let slotCompanyID = entry3[0][i]
		let company = store.activeCompanies.find((company) => company.id === slotCompanyID)
		company.operated = true
	}
	// Check expansions  - free
	// If the last entry doesn't start with -1 or -2, it must be a free expansion
	if (entry3[entry3.length - 1][0] !== -1 && entry3[entry3.length - 1][0] !== -2) {
		for (let i = 0; i < entry3[entry3.length - 1].length; i++) {
			model.expandCompany_core(playerIndex, slotIdx, entry3[entry3.length - 1][i], true)
		}
	}
	// If it starts with -1, it was a PAID expansion
	else if (entry3[entry3.length - 1][0] === -1) {
		for (let i = 1; i < entry3[entry3.length - 1].length; i++) {
			model.expandCompany_core(playerIndex, slotIdx, entry3[entry3.length - 1][i], false)
		}
	}
}

function replaySkipOperateShipping(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	// Mark companies as operated
	for (let i = 0; i < entry3[0].length; i++) {
		let slotCompanyID = entry3[0][i]
		let company = store.activeCompanies.find((company) => company.id === slotCompanyID)
		company.operated = true
	}
}

function replayOperateShipping(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	store.gameflow.phase = rf.PHASE_OPERATIONS
	let companyID = entry3[0][0]
	let slotIdx = model.getSlotIDXfromCompanyID(companyID)
	// Mark companies as operated
	/*for (let i = 0; i < store.players[playerIndex].slots[slotIdx].length; i++) {
		let slotCompanyID = store.players[playerIndex].slots[slotIdx][i]
		let company = store.activeCompanies.find((company) => company.id === slotCompanyID)
		company.operated = true
	}*/
	for (let i = 0; i < entry3[0].length; i++) {
		let slotCompanyID = entry3[0][i]
		let company = store.activeCompanies.find((company) => company.id === slotCompanyID)
		company.operated = true
	}

	// Last entry is ship gfx
	for (let i = 1; i < entry3.length - 1; i++) {
		model.expandCompany_core(playerIndex, slotIdx, entry3[i], true)
	}
}

function replayRND(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	store.gameflow.phase = rf.PHASE_R_AND_D
	let shippingPlayerIndex = -1
	if (entry3.length === 2) {
		store.players[playerIndex].RnD[entry3[0]]++
		shippingPlayerIndex = playerIndex
	} else {
		store.players[entry3[2]].RnD[entry3[0]]++
		shippingPlayerIndex = entry3[2]
	}

	// Update hull capacities
	if (entry3[0] === rf.RnD_HULL_IDX) {
		for (let i = 0; i < store.players[shippingPlayerIndex].slots.length; i++) {
			if (store.players[shippingPlayerIndex].slots[i].length > 0) {
				let company = model.getActiveCompanyDataFromID(store.players[shippingPlayerIndex].slots[i][0])
				if (company.type === rf.COMPANY_SHIPPING) {
					for (let j = 0; j < store.players[shippingPlayerIndex].slots[i].length; j++) {
						company = model.getActiveCompanyDataFromID(store.players[shippingPlayerIndex].slots[i][j])
						company.hullCapacity = store.players[shippingPlayerIndex].RnD[rf.RnD_HULL_IDX]
					}
				}
			}
		}
		// Update the terrs
		model.resetShippingCompanies(false)
	}
}

function replayAddCity(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	store.gameflow.phase = rf.PHASE_NEW_ERA
	let eraCard
	if (rf.ORIGINAL_MAPS.includes(store.mapData.selectedMap)) {
		eraCard = rf.ALL_ERA_CARDS.find((card) => card.id === entry3[1])
	} else if (store.mapData.selectedMap === rf.MAP_AEGEAN) {
		eraCard = rf.AG_ALL_ERA_CARDS.find((card) => card.id === entry3[1])
	} else if (store.mapData.selectedMap === rf.MAP_PHP) {
		eraCard = rf.PH_ALL_ERA_CARDS.find((card) => card.id === entry3[1])
	}
	store.gameflow.currentEra = eraCard.era
	model.addCity_core(entry3[0], playerIndex, entry3[1])
}

function replayTurnOrderBid(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	// Move the money bid
	store.players[playerIndex].moneyCash -= entry3[0]
	store.players[playerIndex].moneyBank += entry3[0]
	// Add a bid
	store.ongoingVars.newTurnOrderBids.push([playerIndex, parseInt(entry3[0]), parseInt(entry3[1])])
	// Sort the bids
	store.ongoingVars.newTurnOrderBids.sort((a, b) => {
		// First, sort by turnBidAmount
		if (a[1] * a[2] !== b[1] * b[2]) {
			return b[1] * b[2] - a[1] * a[2]
		} else {
			// If turnBidAmounts are equal, sort by playerIndex
			const playerIndexA = a[0]
			const playerIndexB = b[0]

			// Find the indices in store.gameflow.fullTurnOrder
			const indexA = store.gameflow.fullTurnOrder.indexOf(playerIndexA)
			const indexB = store.gameflow.fullTurnOrder.indexOf(playerIndexB)

			return indexA - indexB
		}
	})
}

function replayNewTurnOrder(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	store.gameflow.fullTurnOrder.splice(0)
	store.gameflow.fullTurnOrder = [...entry3]
	store.gameflow.turnOrder = [...entry3]
}

function replayAcquireCompany(historyIndex, playerIndex, entry3) {
	const store = useModelStore()
	store.gameflow.phase = rf.PHASE_ACQUISITIONS
	let companyID = entry3[0]
	let slotIdx = model.acquireCompany_core(playerIndex, companyID)
	model.expandCompany_core(playerIndex, slotIdx, entry3[1], true)
}

function checkAndPerformTurnEnd(historyIndex) {
	// NOTE: THis IS THE HISTORY INDEX THAT ALREADY HAPPEND
	// SO NEED TO REDUCE TO THE PREVIOUS MENINGFUL ENTRY
	const store = useModelStore()

	let currentAction = store.computedHistory[historyIndex][0]

	/*

// Player Actions- 30+
export const HIST_ADD_CITY = 30
export const HIST_REMOVE_ERA_CARD = 31
export const HIST_TURN_ORDER_BID = 32
export const HIST_PASS_MERGER = 33
export const HIST_MERGER_WITHOUT_BIDDING = 34
export const HIST_MERGER_BIDDING = 35
export const HIST_ACQUIRE_COMPANY = 36
export const HIST_PLAYER_SKIP_ACQUISITOIN_PHASE = 37
export const HIST_AUTO_SKIP_SINGLE_ACQUISITOIN = 38
export const HIST_RND = 39
export const HIST_OPERATE_SHIPPING = 40
export const HIST_OPERATE_LAND = 41
export const HIST_SKIP_OPERATE_LAND = 42
export const HIST_AUTO_SKIP_SHIP_OPERATE = 43
export const HIST_OPERATE_LAND_PAID_EXPANSION_ONLY = 44
export const HIST_MANUAL_CITY_GROWTH = 45
export const HIST_MERGER_REMOVE_SIAP_FAJI_TERRS = 46
export const HIST_SKIP_ACQUISITOIN_NO_COMPANIES = 47

*/

	// Ignore player trades, as they won't ever end a turn or player (which is done by city build)
	let entriesToIgnore = [rf.HIST_REWIND, rf.HIST_RESIGN, rf.HIST_KICKOUT, rf.HIST_CITY_GROWTH, rf.HIST_NO_CITY_GROWTH, rf.HIST_NEW_GAME, rf.HIST_NEW_TURN, rf.HIST_SET_NEW_TURN_ORDER, rf.HIST_REMOVE_COMPANY_NO_TERRS, rf.HIST_FINAL_INCOME, rf.HIST_GAME_END, rf.HIST_OPERATION_INCOME_SUMMARY, rf.HIST_SET_NEW_TURN_ORDER]
	if (entriesToIgnore.includes(currentAction)) return // NOTHING

	let currentPlayerIndex = store.computedHistory[historyIndex][1]

	historyIndex--
	while (entriesToIgnore.includes(store.computedHistory[historyIndex][0]) && historyIndex > 0) historyIndex--
	// Don't end the first turn before it has begun

	//let previousPlayerIndex = store.computedHistory[historyIndex][1]
	let previousAction = store.computedHistory[historyIndex][0]
	let previousPlayerIndex = store.computedHistory[historyIndex][1]

	if (historyIndex === 0 && entriesToIgnore.includes(previousAction)) return //NOTHING

	if (previousAction === rf.HIST_NEW_TURN) return // NOTHING

	// Remove multuple players due to skips
	if (store.computedHistory[historyIndex][0] === rf.HIST_AUTO_SKIP_MERGERS) {
		for (let i = 0; i < store.computedHistory[historyIndex][3].length; i++) {
			store.gameflow.turnOrder = store.gameflow.turnOrder.filter((item) => item !== store.computedHistory[historyIndex][3][i][0])
		}
		if (store.gameflow.turnOrder.length === 0) store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		return
	}
	if (store.computedHistory[historyIndex][0] === rf.HIST_PASS_MERGER) {
		for (let i = 0; i < store.computedHistory[historyIndex][3].length; i++) {
			store.gameflow.turnOrder = store.gameflow.turnOrder.filter((item) => item !== store.computedHistory[historyIndex][3][i])
		}
		if (store.gameflow.turnOrder.length === 0) store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		return
	}
	if (store.computedHistory[historyIndex][0] === rf.HIST_MERGER_REMOVE_SIAP_FAJI_TERRS) return

	let changeOfPlayer = false
	let keepPlayer = false
	if (rf.HIST_OPERATIONS_ENTRIES.includes(previousAction)) {
		let companiesToOperate = 0
		for (let i = 0; i < store.players[previousPlayerIndex].slots.length; i++) {
			if (store.players[previousPlayerIndex].slots[i].length > 0) {
				let companyID = store.players[previousPlayerIndex].slots[i][0]
				let companyObj = store.activeCompanies.find((company) => company.id === companyID)
				if (companyObj.operated === false) companiesToOperate++
				if (companiesToOperate >= 1) break
			}
		}
		if (companiesToOperate >= 1) keepPlayer = true
	}
	// Successful mergers reinstate all players
	if (previousAction === rf.HIST_MERGER_BIDDING || previousAction === rf.HIST_MERGER_WITHOUT_BIDDING) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		while (store.gameflow.turnOrder[store.gameflow.turnOrder.length - 1] !== previousPlayerIndex) store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
	}
	if (store.gameflow.turnOrder[0] !== -1 && store.gameflow.turnOrder[0] !== currentPlayerIndex) changeOfPlayer = true
	//if (currentAction === rf.HIST_CITY_BUILD && previousAction === rf.HIST_FIRST_CITY) changeOfPlayer = true

	// If there has been a change of player
	if (changeOfPlayer) {
		// This should work, as city build simul history is generated in player turn order
		if (keepPlayer) store.gameflow.turnOrder.push(store.gameflow.turnOrder.shift())
		else store.gameflow.turnOrder.shift()

		/*// Instead of shift, use this to allow for simul turns
		const indexToRemove = store.gameflow.turnOrder.indexOf(currentPlayerIndex)
		// Check if the integer is present in the array before removing
		if (indexToRemove !== -1) {
			// Remove the integer from the array
			store.gameflow.turnOrder.splice(indexToRemove, 1)
		}*/

		if (store.gameflow.turnOrder.length === 0) {
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		}
	}
	//return NOTHING
}
