import * as rf from "./FCMreference"
import * as controller from "./FCMcontroller"
import * as history from "./FCMhistory"
import * as map from "./FCMmap"
import * as funcs from "./FCMfuncs"
import * as rules from "./FCMrules"
import * as context from "./FCMcontext"
import * as plyr from "./FCMplayer"
import * as view from "./FCMview"
import * as model from "./FCMmodel"
import * as bot from "./FCMbot"

import { useModelStore } from "../stores/FCMstore.js"
import { usePersonalStore } from "../stores/FCMpersonal.js"

export function goToReplayStep(step) {
	const store = useModelStore()

	store.replayStep = step
	funcs.simpleImportWholeFCMmodel(store.replayData[store.replayStep])
	history.setupHistoryHighlight(store.computedHistory[store.replayStep][0], store.computedHistory[store.replayStep][3], store.replayStep)
	if (store.viewSettings.showingPlayerIndex !== -1) store.viewSettings.showingPlayerIndex = controller.currentPlayerIndex()
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

	// Performing back to my last move
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

	goToReplayStep(store.replayStep)
}

export function replaySetupKetchupExpansion(playerNumber) {
	const store = useModelStore()
	let max = model.maxUnique(playerNumber)
	let additionalLuxuriesManagerAdded = false

	if (store.startingOptions.fryChefs) {
		store.availableEmployees[rf.FRY_CHEF] = 6
	}
	if (store.startingOptions.kimchi) {
		store.availableEmployees[rf.KIMCHI_MASTER] = max
		store.availableEmployees[rf.LUXURIES_MANAGER]++
		additionalLuxuriesManagerAdded = true
	}
	if (store.startingOptions.sushi) {
		store.availableEmployees[rf.SUSHI_COOK] = 6
		store.availableEmployees[rf.SUSHI_CHEF] = max
		if (!additionalLuxuriesManagerAdded) store.availableEmployees[rf.LUXURIES_MANAGER]++
		additionalLuxuriesManagerAdded = true
	}
	if (store.startingOptions.noodles) {
		store.availableEmployees[rf.NOODLE_COOK] = 6
		store.availableEmployees[rf.NOODLE_CHEF] = max
		if (!additionalLuxuriesManagerAdded) store.availableEmployees[rf.LUXURIES_MANAGER]++
		additionalLuxuriesManagerAdded = true
	}
	if (store.startingOptions.newMilestones) {
		store.availableMilestones.splice(0)
		store.availableMilestones.push(...rf.KETCHUP_NEW_MILESTONES)
	}
	if (store.startingOptions.lobbyists) {
		store.availableEmployees[rf.LOBBYIST] = 6
		if (store.startingOptions.useMilestones) store.availableMilestones.push(rf.FIRST_LOBBYIST_USED)
	}
	if (store.startingOptions.coffee) {
		store.availableEmployees[rf.BARISTA_TRAINEE] = 12
		store.availableEmployees[rf.BARISTA] = 6
		store.availableEmployees[rf.LEAD_BARISTA] = max
		if (!additionalLuxuriesManagerAdded) store.availableEmployees[rf.LUXURIES_MANAGER]++
		additionalLuxuriesManagerAdded = true
		if (store.startingOptions.useMilestones) store.availableMilestones.push(rf.FIRST_COFFEE_SOLD)
	}
	if (store.startingOptions.ketchupMilestone) {
		store.availableMilestones.push(rf.SOMEONE_SELLS_YOUR_DEMAND)
	}
	if (store.startingOptions.nightShift) {
		store.availableEmployees[rf.NIGHT_SHIFT_MANAGER] = max
	}
	if (store.startingOptions.massMarketers) {
		store.availableEmployees[rf.MASS_MARKETEER] = 6
	}

	if (store.startingOptions.ruralMarketers) {
		store.availableEmployees[rf.RURAL_MARKETEER] = 6
		store.availableMilestones.push(rf.FIRST_RURAL_MARKETEER_USED)
		store.availableMarketingCampaigns.push(21, 22, 23, 24)
	}
	if (store.startingOptions.gourmet) {
		store.availableEmployees[rf.GOURMET_FOOD_CRITIC] = 6
		store.availableMarketingCampaigns.push(17, 18, 19, 20)
	}
	if (store.startingOptions.movieStars) {
		store.availableEmployees[rf.B_MOVIE_STAR] = 1
		if (store.players.length >= 4) store.availableEmployees[rf.C_MOVIE_STAR] = 1
		if (store.players.length >= 5) store.availableEmployees[rf.D_MOVIE_STAR] = 1
	}
	if (store.startingOptions.jazzMusicians) store.availableEmployees[rf.JAZZ_MUSICIAN] = 6
	if (store.startingOptions.dumplings) {
		store.availableEmployees[rf.DUMPLING_COOK] = 6
		store.availableEmployees[rf.DUMPLING_CHEF] = max
		if (store.startingOptions.useMilestones) store.availableMilestones.push(rf.FIRST_DUMPLING_SOLD)
	}
	if (store.startingOptions.deliveryDrivers) store.availableEmployees[rf.DELIVERY_DRIVER] = 6
	if (store.startingOptions.hawkers) {
		store.availableMarketingCampaigns.push(25, 26, 27)
		store.availableEmployees[rf.HAWKER_MARKETEER] = 6
	}
}

export function resetDataForReplay() {
	const store = useModelStore()
	store.replayData.splice(0)

	for (let i = 0; i < store.players.length; i++) {
		store.players[i].restaurants.splice(0)
		store.players[i].money = 0
		store.players[i].bankrupt = false
		store.players[i].employees.splice(0)
		store.players[i].beach.splice(0)
		store.players[i].milestones.splice(0)
		store.players[i].marketers.splice(0)
		store.players[i].resources.splice(0)
		store.players[i].OOBpreference = 0
		store.players[i].additionalCampaignArrayIndex = -1
		store.players[i].additionalMarketedGood.splice(0)
		store.players[i].coffeeShops.splice(0)
		store.players[i].displayName = store.players[i].name
		store.players[i].ceoSlots = 3
	}

	// Reset campaigns
	store.availableMarketingCampaigns.splice(0)
	store.availableMarketingCampaigns.push(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14)
	if (store.players.length > 2) store.availableMarketingCampaigns.push(12)
	if (store.players.length > 3) store.availableMarketingCampaigns.push(15)
	if (store.players.length > 4) store.availableMarketingCampaigns.push(16)

	// Reset employees
	store.availableEmployees.splice(0)
	store.availableEmployees.push(...rf.ORIGINAL_AVAILABLE_EMPLOYEES)
	if (store.players.length < 5) {
		let max = model.maxUnique(store.players.length)
		for (let i = 0; i < rf.BASE_UNIQUE_CARDS.length; i++) {
			store.availableEmployees[rf.BASE_UNIQUE_CARDS[i]] = max
		}
	}

	// Reset MS
	store.availableMilestones.splice(0)
	if (store.startingOptions.useMilestones !== false) {
		store.availableMilestones.push(...rf.BASE_GAME_MILESTONES)
		if (store.startingOptions.noCeoMilestone === true) {
			store.availableMilestones.splice(store.availableMilestones.indexOf(rf.FIRST_100_DOL), 1)
		}
		if (store.startingOptions.noRadioMilestone === true) {
			store.availableMilestones.splice(store.availableMilestones.indexOf(rf.FIRST_RADIO_CAMPAIGN), 1)
		}
	}

	// Reset bank
	if (store.startingOptions.shortGame === true) store.bank = store.players.length * 75
	else store.bank = store.players.length * 50

	// Reset gameflow
	let to = []
	for (let i = 0; i < store.players.length; to[i] = i++);

	store.gameflow.phase = rf.PHASE_SETUP_RESTAURANT1
	store.gameflow.turn = 0
	store.gameflow.turnOrder.splice(0)
	store.gameflow.turnOrder.push(...to)
	store.gameflow.fullTurnOrder.splice(0)
	store.gameflow.fullTurnOrder.push(...to)
	store.gameflow.newTurnOrder.splice(0)
	for (let i = 0; i < store.players.length; i++) store.gameflow.newTurnOrder.push(-1)

	// Reset CEO
	store.ceoLevel = 3

	// Reset expansion
	replaySetupKetchupExpansion(store.players.length)

	// Reset exported data
	store.campaigns.splice(0)
	store.gardens.splice(0)
	store.houses.splice(0)
	store.needs.splice(0)
	store.reserveCards.splice(0)
	for (let i = 0; i < store.players.length; i++) store.reserveCards.push(-1)
	store.freeways.splice(0)
	store.firstPizzas.splice(0)
	store.parks.splice(0)
	store.newRoads.splice(0)
	store.coffeeShopMSplayers.splice(0)

	// Now set them up
	model.setInternalStartingOptions(store.externalStartingOptions)
	context.resetContext()

	// Reset map from seed
	store.mapData.tiles = map.expandMapToFullGrid(window.initData.startingMap, store.players.length)
	map.initCoords()
	view.setMapDisplayTiles()

	// Re-add house 25
	if (store.mapData.tiles.indexOf(20) > -1) {
		let rotated = 0
		if (store.mapData.tiles[store.mapData.tiles.indexOf(20) + 1] === 1 || store.mapData.tiles[store.mapData.tiles.indexOf(20) + 1] === 3) rotated = 1
		let index = map.findIndexForHouse(25)
		model.addHouse(25, index, rotated)
	}
}

export async function generateReplayData(spoilerFree = false) {
	const store = useModelStore()
	store.viewSettings.generatingReplay = true

	resetDataForReplay()

	const pBarEl = document.querySelector(".progress-bar div")
	const pBarTextEl = document.querySelector(".progress-bar span")

	for (let i = 0; i < store.computedHistory.length; i++) {
		store.context.highlightHistorySquares.splice(0)

		let playerIdx = store.computedHistory[i][1]
		let action = store.computedHistory[i][0]
		let param = store.computedHistory[i][3]

		setgameflowVars(playerIdx, action)

		if (action === rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION) replayAddStartingResto(i, playerIdx, param)
		else if (action === rf.HIST_CHOOSE_RESERVE_CARD) replayChooseReserveCard(i, playerIdx, param)
		else if (action === rf.HIST_NEW_TURN) replayNewTurn(i, playerIdx, param)
		else if (action === rf.HIST_CHOOSE_TURN_ORDER) replayTurnOrder(i, playerIdx, param)
		else if (action === rf.HIST_CHOOSE_TURN_ORDER_FORCED) replayTurnOrder(i, playerIdx, param)
		else if (action === rf.HIST_CHOOSE_TURN_ORDER_AUTO_EARLY) replayTurnOrder(i, playerIdx, param)
		else if (action === rf.HIST_CHOOSE_TURN_ORDER_AUTO_LATE) replayTurnOrder(i, playerIdx, param)
		else if (action === rf.HIST_HIRE) replayHire(i, playerIdx, param)
		else if (action === rf.HIST_NEW_MILESTONE) replayGetMS(i, playerIdx, param)
		else if (action === rf.HIST_CHOOSE_STRUCTURE) replayRestructure(i, playerIdx, param)
		else if (action === rf.HIST_START_MARKETING_CAMPAIGN) replayStartMarketingCampaign(i, playerIdx, param)
		else if (action === rf.HIST_START_NS_CAMPAIGN) replayStartNightShiftMarketingCampaign(i, playerIdx, param)
		else if (action === rf.HIST_MARKETING_CAMPAIGN_PHASE) replayMarketingCampaigns(i, playerIdx, param)
		else if (action === rf.HIST_DINNER_TIME) replayDinnerTime(i, playerIdx, param)
		else if (action === rf.HIST_TRAIN) replayTrain(i, store.players[playerIdx], param)
		else if (action === rf.HIST_PRODUCE_FOOD_DRINKS) replayProduce(i, playerIdx, param)
		else if (action === rf.HIST_BUILD_HOUSE) replayAddHouse(i, playerIdx, param)
		else if (action === rf.HIST_BUILD_GARDEN) replayAddGarden(i, playerIdx, param)
		else if (action === rf.HIST_OPEN_RESTAURANT) replayAddResto(i, playerIdx, param)
		else if (action === rf.HIST_MOVE_RESTAURANT) replayMoveResto(i, playerIdx, param)
		else if (action === rf.HIST_RESTO_MAILBOX_MS) replayRestoMailboxMS(i, playerIdx, param)
		else if (action === rf.HIST_LOBBYIST_PARK) replayLobbyist_park(i, playerIdx, param)
		else if (action === rf.HIST_LOBBYIST_ROAD) replayLobbyist_road(i, playerIdx, param)
		else if (action === rf.HIST_COFFE_SHOP_BUILD) replayAddCoffeeShop(i, playerIdx, param)
		else if (action === rf.HIST_COFFE_SHOP_REMOVE) replayRemoveCoffeeShop(i, playerIdx, param)
		else if (action === rf.HIST_PIZZA_BOMB) replayPizzaBomb(i, playerIdx, param)
		else if (action === rf.HIST_CHOOSE_MODULE) replayChooseModule(i, playerIdx, param)
		else if (action === rf.HIST_FIRE) replayFire(i, playerIdx, param)
		else if (action === rf.HIST_RESIGN) replayMissingPlayer(i, store.players[playerIdx], param)
		else if (action === rf.HIST_KICKOUT) replayKickout(i, playerIdx, param)
		else if (action === rf.HIST_DISCOUNT_MILESTONE) replayDiscountManagerMS(i, playerIdx, param)
		else if (action === rf.HIST_SALARY) replaySalary(i, playerIdx, param)
		else if (action === rf.HIST_SALARY_STRICT) replaySalary_strict(i, playerIdx, param)
		else if (action === rf.HIST_ADD_FREEWAY) replayAddFreeway(i, playerIdx, param)
		else if (action === rf.HIST_FRIDGE_RESOURCES) replayFridgeResources(i, playerIdx, param)
		else if (action === rf.HIST_NEW_TILE) replayNewTile(i, playerIdx, param)
		else if (action === rf.HIST_INCOME) replayIncome(i, playerIdx, param)
		else if (action === rf.HIST_BANK_BREAK) replayBankBreak(i, playerIdx, param)
		else if (action === rf.HIST_PRODUCE_KIMCHI) replayProduceKimchi(i, playerIdx, param)

		store.replayData.push(funcs.simpleExportWholeFCMmodel())

		if (i % 5 === 0 && pBarEl != null) {
			let percent = (i / store.computedHistory.length) * 100
			pBarEl.style.width = percent + "%"
			pBarTextEl.innerText = Math.round(percent) + "%"
			await funcs.sleep(0)
		}
	}

	store.replayStep = store.replayData.length - 1
	if (spoilerFree) {
		if (window.initData.replayStep <= 0) store.replayStep = 0
		else if (window.initData.replayStep >= store.replayData.length - 1) store.replayStep = store.replayData.length - 1
		else store.replayStep = window.initData.replayStep
	}
	goToReplayStep(store.replayStep)
	store.viewSettings.generatingReplay = false
}

export function replayProduceKimchi(historyIndex, playerIndex, param) {
	plyr.addResources(playerIndex, rf.KIMCHI, 1)
}

export function replayNewTile(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let tileID = param[1]
	let tileRotation = param[2]
	let tileArrIndex = param[3] * 2

	map.addTileToMap(tileID, tileArrIndex, tileRotation)
	view.setMapDisplayTiles()

	if (tileID === 20) {
		let rotated = 0
		if (store.mapData.tiles[store.mapData.tiles.indexOf(20) + 1] === 1 || store.mapData.tiles[store.mapData.tiles.indexOf(20) + 1] === 3) rotated = 1
		let house25index = map.findIndexForHouse(25)
		model.addHouse(25, house25index, rotated)
	}

	let tileIndex = funcs.importIndex(param[0])
	store.context.highlightHistorySquares.push(tileIndex)
	for (let i = 0; i < store.mapData.coords.length; i++) if (i !== tileIndex && map.onTheSameTile(tileIndex, i)) store.context.highlightHistorySquares.push(i)
}

export function replaySalary(historyIndex, playerIndex, param) {
	const store = useModelStore()
	for (let i = 0; i < param.length; i++) {
		let due = param[i][0]
		store.players[i].money -= due
		if (plyr.hasMilestone(i, rf.FIRST_TRAINER_USED) && store.players[i].money < 0) {
			// Add the negative to the due
			due += store.players[i].money
			store.players[i].money = 0
		}
		store.bank += due
	}
}

export function replaySalary_strict(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let due = param[0]
	store.players[playerIndex].money -= due
	if (plyr.hasMilestone(playerIndex, rf.FIRST_TRAINER_USED) && store.players[playerIndex].money < 0) {
		// Add the negative to the due
		due += store.players[playerIndex].money
		store.players[playerIndex].money = 0
	}
	store.bank += due
	// NB the paid in food exact items are never stored, just the amount
	// Nothing needs doing here; just the net money adjusting
}

export function replayIncome(historyIndex, playerIndex, param) {
	// SUMMARY ONLY - ALL DONE IN DINNERTIME PHASE
}

export function replayFridgeResources(historyIndex, playerIndex, param) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	playerObj.resources.splice(0)
	for (let i = 0; i < param.length; i++) {
		plyr.addResources(playerIndex, param[i], 1)
	}
}

export function replayDinnerTime(historyIndex, playerIndex, param) {
	rules.doDinnerTime(true)
}

export function replayTrain(historyIndex, playerObj, param) {
	const store = useModelStore()
	for (let i = 0; i < param.length; i += 2) {
		let fromNum = param[i]
		let toNum = param[i + 1]
		let fromStructure = false
		let fromHiring = false
		if (fromNum === -1) fromHiring = true

		if (fromNum >= 50) {
			fromNum -= 50
			fromStructure = true
		}

		// If it's from hiring
		if (fromHiring) {
			// Don't readd any employees
			// Add the new train to the beach, and remove from available
			store.availableEmployees[toNum]--
			playerObj.beach.push(toNum)
		}
		// else if it's from structure, remove from structure, and add to available
		else if (fromStructure) {
			playerObj.employees.splice(playerObj.employees.indexOf(fromNum), 1)
			store.availableEmployees[fromNum]++
			store.availableEmployees[toNum]--
			playerObj.employees.push(toNum)
		} else {
			if (playerObj.beach.indexOf(fromNum) > -1) playerObj.beach.splice(playerObj.beach.indexOf(fromNum), 1)
			store.availableEmployees[fromNum]++
			store.availableEmployees[toNum]--
			playerObj.beach.push(toNum)
		}
	}
}

export function replayProduce(historyIndex, playerIndex, param) {
	for (let i = 0; i < param[1].length; i++) {
		for (let j = 0; j < param[1][i]; j++) plyr.addResources(playerIndex, i, 1)
	}
}

export function replayAddHouse(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let houseIndex = funcs.importIndex(param[0])
	let houseNumber = param[1]
	// Old entries omitted rotation for the common case; missing means 1 (landscape)
	let rotation = param.length > 2 ? param[2] : 1
	if (rotation === true) rotation = 1
	if (rotation === false) rotation = 0
	model.addHouse(houseNumber, houseIndex, rotation)
	const sideways = rotation === 1 || rotation === 3
	const height = sideways ? 2 : 3
	const width = sideways ? 3 : 2
	for (let i = 0; i < height; i++) {
		for (let j = 0; j < width; j++) {
			store.context.highlightHistorySquares.push(houseIndex + j + rf.ssW * i)
		}
	}
}

export function replayAddGarden(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let gardenIndex = funcs.importIndex(param[0])
	let houseNumber = param[1]
	let rotated = true
	if (param.length > 2 && param[2] === 0) rotated = false

	model.addGarden(gardenIndex, rotated, houseNumber)
	store.context.highlightHistorySquares.push(gardenIndex)
	if (!rotated) store.context.highlightHistorySquares.push(gardenIndex + 1)
	else store.context.highlightHistorySquares.push(gardenIndex + rf.ssW)
}

export function replayAddResto(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let restoIndex = funcs.importIndex(param[0])
	let localManager = param[1] === 1
	let rotation = 3
	if (param.length > 2) rotation = param[2]

	model.addRestaurant_core(playerIndex, restoIndex, rotation, !localManager)
	store.context.highlightHistorySquares = [restoIndex, restoIndex + 1, restoIndex + rf.ssW, restoIndex + rf.ssW + 1]
}

export function replayMoveResto(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let newRestoIndex = funcs.importIndex(param[0])
	let oldRestoIndex = funcs.importIndex(param[1])
	let rotation = 3
	if (param.length > 2) rotation = param[2]

	model.removeRestaurant(playerIndex, oldRestoIndex)
	model.addRestaurant_core(playerIndex, newRestoIndex, rotation, true)
	store.context.highlightHistorySquares = [newRestoIndex, newRestoIndex + 1, newRestoIndex + rf.ssW, newRestoIndex + rf.ssW + 1, oldRestoIndex, oldRestoIndex + 1, oldRestoIndex + rf.ssW, oldRestoIndex + rf.ssW + 1]
}

export function replayLobbyist_park(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let parkIndex = funcs.importIndex(param[0])
	let parkVariety = param[1]
	let rotation = 0
	let flipped = false
	if (param.length >= 3) rotation = param[2]
	if (param.length >= 4) flipped = param[3] === 1

	// variety, rotation, flipped
	let parkModel = rf.getParkModel(parkVariety, rotation, flipped)
	model.addPark(parkIndex, parkVariety, rotation, flipped, parkModel)

	// Shift index back to top left of object
	if (parkModel[0][0] === 0 && parkModel[0][1] === 0) parkIndex -= 2
	else if (parkModel[0][0] === 0) parkIndex -= 1

	// Now the index is in the correct place, go thru the object and edit coords
	for (let y = 0; y < parkModel.length; y++) {
		for (let x = 0; x < parkModel[y].length; x++) {
			if (parkModel[y][x] === 1) store.context.highlightHistorySquares.push(parkIndex + x + store.mapData.dimensions[0] * 5 * y)
		}
	}
}

export function replayLobbyist_road(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let roadIndex = funcs.importIndex(param[0])
	let roadVariety = param[1]
	let rotation = 0
	if (param.length >= 3) rotation = param[2]
	model.addNewRoad(roadIndex, roadVariety, rotation, store.gameflow.turn)
	if (roadVariety !== 2) {
		let roadLength = 2
		if (roadVariety === 1) roadLength = 4
		if (rotation === 0) for (let i = 0; i < roadLength; i++) store.context.highlightHistorySquares.push(roadIndex + i)
		else if (rotation === 1) for (let i = 0; i < roadLength; i++) store.context.highlightHistorySquares.push(roadIndex + rf.ssW * i)
	} else if (roadVariety === 2) {
		if (rotation !== 2) store.context.highlightHistorySquares.push(roadIndex)
		if (rotation !== 3) store.context.highlightHistorySquares.push(roadIndex + 1)
		if (rotation !== 0) store.context.highlightHistorySquares.push(roadIndex + rf.ssW + 1)
		if (rotation !== 1) store.context.highlightHistorySquares.push(roadIndex + rf.ssW)
	}
}

export function replayBankBreak(historyIndex, playerIndex, param) {
	const store = useModelStore()
	// TODO change ceo slots?
	store.bank += param[0]
}

export function replayAddCoffeeShop(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let coffeShopIndex = funcs.importIndex(param[0])
	model.addCoffeeShop(playerIndex, coffeShopIndex)
	store.context.highlightHistorySquares.push(coffeShopIndex)
}

export function replayRemoveCoffeeShop(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let coffeShopIndex = funcs.importIndex(param[0])
	model.removeCoffeeShop(playerIndex, coffeShopIndex)
	store.context.highlightHistorySquares.push(coffeShopIndex)
}

export function replayPizzaBomb(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let radioIndex = funcs.importIndex(param[0])
	let radioNum = 1
	if (param.length > 1) radioNum = param[1]

	model.addMarketingCampaign(radioNum, radioIndex, false, rf.PIZZA, 2)
	store.context.highlightHistorySquares.push(radioIndex)
}

export function replayChooseModule(historyIndex, playerIndex, param) {}

export function replayFire(historyIndex, playerIndex, param) {
	const store = useModelStore()
	for (let i = 0; i < param.length; i++) {
		plyr.fireEmployee(playerIndex, param[i])
		store.availableEmployees[param[i]]++
	}
}

export function replayMissingPlayer(historyIndex, playerObj, param) {
	if ((playerObj.money ?? 0) > 0) playerObj.money *= -1
}

export function replayKickout(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let kickedPlayerIndex = param[0]
	bot.makeBot(store.players[kickedPlayerIndex])
}

export function replayDiscountManagerMS(historyIndex, playerIndex, param) {
	rules.enforceDiscountMilestone(playerIndex, true)
}

export function replayAddFreeway(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let index = funcs.importIndex(param[0])
	let rotated = param[1] === 1
	let sides = param[2] === 1

	let highlightIndex = index
	// if on sides
	if (sides) {
		if (map.isIndexOnLeftEdgeOfMap(index, 1)) {
			highlightIndex--
			if (!rotated) store.context.highlightHistorySquares.push(highlightIndex, highlightIndex - 1, highlightIndex - 2)
			else if (rotated) store.context.highlightHistorySquares.push(highlightIndex, highlightIndex + rf.ssW, highlightIndex + rf.ssW * 2)
		} else {
			highlightIndex++
			if (!rotated) store.context.highlightHistorySquares.push(highlightIndex, highlightIndex + 1, highlightIndex + 2)
			else if (rotated) store.context.highlightHistorySquares.push(highlightIndex, highlightIndex + rf.ssW, highlightIndex + rf.ssW * 2)
		}
	}
	// if on top/bot
	else if (!sides) {
		if (map.isIndexOnBottomEdgeOfMap(index, 1)) {
			highlightIndex += rf.ssW
			if (!rotated) store.context.highlightHistorySquares.push(highlightIndex, highlightIndex + 1, highlightIndex + 2)
			else if (rotated) store.context.highlightHistorySquares.push(highlightIndex, highlightIndex + rf.ssW, highlightIndex + rf.ssW * 2)
		} else {
			highlightIndex -= rf.ssW
			if (!rotated) store.context.highlightHistorySquares.push(highlightIndex, highlightIndex + 1, highlightIndex + 2)
			else if (rotated) store.context.highlightHistorySquares.push(highlightIndex, highlightIndex - rf.ssW, highlightIndex - rf.ssW * 2)
		}
	}
	model.addFreeway(index, rotated, sides)
}

export function replayMarketingCampaigns(historyIndex, playerIndex, param) {
	rules.doMarketingCampaigns(true)
}

export function replayStartMarketingCampaign(historyIndex, playerIndex, param) {
	const store = useModelStore()
	/*
		0 = campaign Number
		1 = index
		2 = good - EITHER num OR array if MS
		3? = employee - IF IT CANNOT BE INFERRED, if campaign number >=4 <=16
		4? = rotation
		5 = duration IF NOT INFINITE
		*/
	let campaignNumber = param[0]
	let campaignIndex = funcs.importIndex(param[1])
	let good = -1
	let secondGood = -1
	if (typeof param[2] === "object") {
		good = param[2][0]
		secondGood = param[2][1]
	} else good = param[2]
	let paramIdx = 3
	let campaignEmployee = -1
	if (campaignNumber <= 3 || campaignNumber >= 17) {
		if (campaignNumber <= 3) campaignEmployee = rf.BRAND_DIRECTOR
		else if (campaignNumber >= 17 && campaignNumber <= 20) campaignEmployee = rf.GOURMET_FOOD_CRITIC
		else if (campaignNumber >= 21 && campaignNumber <= 24) campaignEmployee = rf.RURAL_MARKETEER
	}
	// Otherwise need to read in the employee
	else {
		campaignEmployee = param[paramIdx]
		paramIdx++
	}
	let campaignRotated = 0
	if (rf.ROTATABLE_CAMPAIGNS.includes(campaignNumber)) {
		campaignRotated = param[paramIdx]
		paramIdx++
	}

	let durationNum = 9
	if (param.length > paramIdx) durationNum = param[paramIdx]

	// Check for the Mailbox MS
	let restoMS = false
	if (store.computedHistory[historyIndex - 1][0] === rf.HIST_NEW_MILESTONE && store.computedHistory[historyIndex - 1][3][0] === rf.FIRST_CAMPAIGN_MANAGER_USED) {
		restoMS = true
	}
	if (restoMS) plyr.addCampaignToMarketer(playerIndex, campaignEmployee, campaignNumber)
	else plyr.sendPlayerMarketerToMarket(playerIndex, campaignEmployee, campaignNumber, false, false)

	let height = rf.MARKETING_CAMPAIGNS[campaignNumber].height
	let width = rf.MARKETING_CAMPAIGNS[campaignNumber].width

	if (campaignNumber === 4) [width, height] = [height, width]
	if (campaignRotated === 1) [width, height] = [height, width]

	let highlightIndex = campaignIndex

	if (rf.MARKETING_CAMPAIGNS[campaignNumber].type === rf.AIRPLANE) {
		// If rotated, and thus on sides
		if (campaignRotated === 1) {
			let widthOnLeft = width
			if (widthOnLeft === 2) widthOnLeft = 1
			if (map.isIndexOnLeftEdgeOfMap(campaignIndex, widthOnLeft)) highlightIndex -= 1 * width
			else if (!map.isIndexOnLeftEdgeOfMap(campaignIndex, widthOnLeft)) highlightIndex += 1
		}
		// If on top/bottom
		else {
			let widthOnBottom = width
			if (param[1] === 4) widthOnBottom = 1
			if (map.isIndexOnBottomEdgeOfMap(campaignIndex, widthOnBottom)) highlightIndex += rf.ssW
			else if (!map.isIndexOnBottomEdgeOfMap(campaignIndex, widthOnBottom)) highlightIndex -= rf.ssW * height
		}
	}

	if (campaignNumber <= 16) {
		for (let i = 0; i < height; i++) {
			for (let j = 0; j < width; j++) {
				store.context.highlightHistorySquares.push(highlightIndex + j + rf.ssW * i)
			}
		}
	} else if (campaignNumber >= 25 && campaignNumber <= 27) {
		store.context.highlightHistorySquares.push(...funcs.importIndexes(param[1]))
	}
	model.addMarketingCampaign(campaignNumber, campaignIndex, campaignRotated === 1, good, durationNum)
	if (secondGood >= 0) {
		store.players[playerIndex].additionalMarketedGood = [campaignNumber, secondGood]
	}
}

export function replayRestoMailboxMS(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let campaignNumber = param[0]
	let campaignIndex = funcs.importIndex(param[1])
	let campaignGood = param[2]

	model.addMarketingCampaign(campaignNumber, campaignIndex, false, campaignGood, 9)
	store.context.highlightHistorySquares = [campaignIndex]
	if (campaignNumber === 7 || campaignNumber === 8) store.context.highlightHistorySquares.push(campaignIndex + 1, campaignIndex + rf.ssW, campaignIndex + rf.ssW + 1)
}

export function replayStartNightShiftMarketingCampaign(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let campaignNumber = param[0]
	let campaignIndex = funcs.importIndex(param[1])
	let campaignGood = param[2]
	let campaignDuration = param[3]
	let campaignEmployee = rf.MARKETING_TRAINEE

	let campaignRotated = 0
	if (param.length >= 5) campaignRotated = param[4]

	plyr.sendPlayerMarketerToMarket(playerIndex, campaignEmployee, campaignNumber, true, false)

	let height = rf.MARKETING_CAMPAIGNS[campaignNumber].height
	let width = rf.MARKETING_CAMPAIGNS[campaignNumber].width
	if (campaignRotated === 1) [width, height] = [height, width]

	for (let i = 0; i < height; i++) {
		for (let j = 0; j < width; j++) {
			store.context.highlightHistorySquares.push(campaignIndex + j + rf.ssW * i)
		}
	}
	model.addMarketingCampaign(campaignNumber, campaignIndex, campaignRotated === 1, campaignGood, campaignDuration)

	store.context.highlightHistorySquares = [campaignIndex]
	// TODO add the other highlight sqs
}

export function replayRestructure(historyIndex, playerIndex, param) {
	const store = useModelStore()
	store.players[playerIndex].beach = [...param[1]]
	store.players[playerIndex].employees = [...param[0]]
}

export function replayGetMS(historyIndex, playerIndex, param) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	plyr.awardMilestone(playerIndex, param[0], true)
	if (param[0] === rf.FIRST_THROW_AWAY) {
		playerObj.resources.splice(0)
	}
	if (param[0] === rf.FIRST_100_DOL && plyr.hasEmployee(playerIndex, rf.CFO)) plyr.fireEmployee(playerIndex, rf.CFO)
}

export function replayHire(historyIndex, playerIndex, param) {
	const store = useModelStore()
	for (let i = 0; i < param.length; i++) {
		store.players[playerIndex].beach.push(param[i])
		store.availableEmployees[param[i]]--
	}
}

export function replayTurnOrder(historyIndex, playerIndex, param) {
	const store = useModelStore()
	if (store.computedHistory[historyIndex][0] === rf.HIST_CHOOSE_TURN_ORDER) {
		store.gameflow.newTurnOrder[param[0]] = playerIndex
	} else if (store.computedHistory[historyIndex][0] === rf.HIST_CHOOSE_TURN_ORDER_FORCED) {
		store.gameflow.newTurnOrder[param[0]] = playerIndex
	} else if (store.computedHistory[historyIndex][0] === rf.HIST_CHOOSE_TURN_ORDER_AUTO_EARLY) {
		store.gameflow.newTurnOrder[param[0]] = playerIndex
	} else if (store.computedHistory[historyIndex][0] === rf.HIST_CHOOSE_TURN_ORDER_AUTO_LATE) {
		store.gameflow.newTurnOrder[param[0]] = playerIndex
	}

	if (!store.gameflow.newTurnOrder.includes(-1)) {
		store.gameflow.fullTurnOrder = [...store.gameflow.newTurnOrder]
		store.gameflow.turnOrder = [...store.gameflow.newTurnOrder]
		store.gameflow.newTurnOrder.splice(0)
		for (let i = 0; i < store.players.length; i++) store.gameflow.newTurnOrder.push(-1)
	}
}

export function replayNewTurn(historyIndex, playerIndex, param) {
	const store = useModelStore()
	if (store.gameflow.turn === 1) {
		store.gameflow.phase = rf.PHASE_TURN_ORDER
		store.gameflow.turnOrder.reverse()
	} else store.gameflow.phase = rf.PHASE_RESTRUCTURING

	store.gameflow.newTurnOrder.splice(0)
	for (let i = 0; i < store.players.length; i++) store.gameflow.newTurnOrder.push(-1)

	for (let i = 0; i < store.players.length; i++) {
		// Remove food if no fridge
		funcs.removeItemAll(store.players[i].resources, rf.COFFEE)
		let kimchi = false
		if (plyr.playerHasResources(i, rf.KIMCHI)) kimchi = true
		if (!plyr.hasFridge(i)) store.players[i].resources.splice(0)
		if (kimchi) plyr.addResources(i, rf.KIMCHI)
	}

	model.clearForNewTurn()
	store.gameflow.turn++
}

export function replayChooseReserveCard(historyIndex, playerIndex, param) {
	const store = useModelStore()
	store.gameflow.phase = rf.PHASE_SETUP_RESERVE
	store.reserveCards[playerIndex] = param[0]
}

export function replayAddStartingResto(historyIndex, playerIndex, param) {
	const store = useModelStore()
	let restoIndex = funcs.importIndex(param[0])

	// Assume rotation = 3
	let rotation = 3
	if (param.length > 1) rotation = param[1]

	model.addRestaurant_core(playerIndex, restoIndex, rotation, true)
	store.context.highlightHistorySquares = [restoIndex, restoIndex + 1, restoIndex + rf.ssW, restoIndex + rf.ssW + 1]
}

export function setgameflowVars(playerIndex, action) {
	const store = useModelStore()
	if (action === rf.HIST_SETUP_GAME) playerIndex = -1

	if (action === rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION) store.gameflow.phase = rf.PHASE_SETUP_RESTAURANT1
	else if (action === rf.HIST_CHOOSE_RESERVE_CARD) store.gameflow.phase = rf.PHASE_SETUP_RESERVE
	else if (action === rf.HIST_CHOOSE_STRUCTURE) store.gameflow.phase = rf.PHASE_RESTRUCTURING
	else if (action === rf.HIST_CHOOSE_TURN_ORDER) store.gameflow.phase = rf.PHASE_TURN_ORDER
	else if (action === rf.HIST_CHOOSE_TURN_ORDER_FORCED) store.gameflow.phase = rf.PHASE_TURN_ORDER
	else if (action === rf.HIST_CHOOSE_TURN_ORDER_AUTO_EARLY) store.gameflow.phase = rf.PHASE_TURN_ORDER
	else if (action === rf.HIST_CHOOSE_TURN_ORDER_AUTO_LATE) store.gameflow.phase = rf.PHASE_TURN_ORDER
	else if (action === rf.HIST_HIRE) store.gameflow.phase = rf.PHASE_WORKING_DAY
	else if (action === rf.HIST_TRAIN) store.gameflow.phase = rf.PHASE_WORKING_DAY
	else if (action === rf.HIST_COFFE_SHOP_BUILD) store.gameflow.phase = rf.PHASE_WORKING_DAY
	else if (action === rf.HIST_COFFE_SHOP_REMOVE) store.gameflow.phase = rf.PHASE_WORKING_DAY
	else if (action === rf.HIST_START_MARKETING_CAMPAIGN) store.gameflow.phase = rf.PHASE_WORKING_DAY
	else if (action === rf.HIST_PRODUCE_FOOD_DRINKS) store.gameflow.phase = rf.PHASE_WORKING_DAY
	else if (action === rf.HIST_LOBBYIST_PARK) store.gameflow.phase = rf.PHASE_WORKING_DAY
	else if (action === rf.HIST_LOBBYIST_ROAD) store.gameflow.phase = rf.PHASE_WORKING_DAY
	else if (action === rf.HIST_BUILD_HOUSE) store.gameflow.phase = rf.PHASE_WORKING_DAY
	else if (action === rf.HIST_BUILD_GARDEN) store.gameflow.phase = rf.PHASE_WORKING_DAY
	else if (action === rf.HIST_OPEN_RESTAURANT) store.gameflow.phase = rf.PHASE_WORKING_DAY
	else if (action === rf.HIST_MOVE_RESTAURANT) store.gameflow.phase = rf.PHASE_WORKING_DAY
	else if (action === rf.HIST_DINNER_TIME) store.gameflow.phase = rf.PHASE_DINNERTIME
	else if (action === rf.HIST_COFFEE_SALE) store.gameflow.phase = rf.PHASE_DINNERTIME
	else if (action === rf.HIST_FIRE) store.gameflow.phase = rf.PHASE_PAYDAY
	else if (action === rf.HIST_SALARY) store.gameflow.phase = rf.PHASE_PAYDAY
	else if (action === rf.HIST_MARKETING_CAMPAIGN_PHASE) store.gameflow.phase = rf.PHASE_MARKETING_CAMPAIGNS
	else if (action === rf.HIST_MARKETING_EARNING) store.gameflow.phase = rf.PHASE_MARKETING_CAMPAIGNS
	else if (action === rf.HIST_FRIDGE_RESOURCES) store.gameflow.phase = rf.PHASE_CLEAN_UP
	else if (action === rf.HIST_NEW_TURN) store.gameflow.phase = rf.PHASE_RESTRUCTURING
	else if (action === rf.HIST_PIZZA_BOMB) store.gameflow.phase = rf.PHASE_PIZZA_BOMB
	else if (action === rf.HIST_CHOOSE_MODULE) store.gameflow.phase = rf.PHASE_SETUP_MODULES
}