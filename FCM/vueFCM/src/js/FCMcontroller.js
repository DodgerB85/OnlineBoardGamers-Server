import * as rf from "./FCMreference"
import * as controller from "./FCMcontroller"
import * as map from "./FCMmap"
import * as funcs from "./FCMfuncs"
import * as rules from "./FCMrules"
import * as IO from "../backend/FCM_IO"
import * as context from "./FCMcontext"
import * as Bot from "./FCMbot"
import * as model from "./FCMmodel"
import * as plyr from "./FCMplayer"
import * as view from "./FCMview"

import { useModelStore } from "../stores/FCMstore.js"
import { usePersonalStore } from "../stores/FCMpersonal"
import i18n from "../i18n"

export function currentPlayerObj() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (controller.isSimulPhase(store.gameflow.phase)) {
		if (store.gameflow.turnOrder.includes(personal.pov)) return store.players[personal.pov]
		else if (store.gameflow.turnOrder.length > 0) return store.players[store.gameflow.turnOrder[0]]
		else {
			// Turn order is momentarily empty while a save is in flight and Vue
			// re-renders; don't alarm for that transient state
			if (!personal.haltPlay) alert(i18n.global.t("alerts.noTurnOrder"))
			return store.players[0]
		}
	}
	if (store.gameflow.turnOrder.length > 0) return store.players[store.gameflow.turnOrder[0]]
	else {
		if (!store.viewSettings.showReplay && personal.pov >= 0) {
			alert(i18n.global.t("alerts.cpiError", { turnOrder: String(store.gameflow.turnOrder) }))
		}
		store.gameflow.turnOrder = [0]
		return store.players[0]
	}
}

export function currentPlayerIndex() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (controller.isSimulPhase(store.gameflow.phase)) return personal.pov
	if (store.gameflow.turnOrder.length > 0) return store.gameflow.turnOrder[0]
	else {
		if (!store.viewSettings.showReplay && personal.pov >= 0) {
			alert(i18n.global.t("alerts.cpiError", { turnOrder: String(store.gameflow.turnOrder) }))
		}
		store.gameflow.turnOrder = [0]
		return 0
	}
}


export function getCurrentPlayersArray() {
	const store = useModelStore()
	// Why is this using displayname?
	if (!controller.isSimulPhase(store.gameflow.phase)) return [store.players[store.gameflow.turnOrder[0]].displayName]
	if (controller.isSimulPhase(store.gameflow.phase)) {
		let ret = []
		for (let i = 0; i < store.gameflow.turnOrder.length; i++) {
			let nameToAdd = store.players[store.gameflow.turnOrder[i]].displayName
			if (nameToAdd.includes(rf.TOURNAMENT_ADMIN_NAME)) nameToAdd = rf.TOURNAMENT_ADMIN_NAME
			ret.push(nameToAdd)
		}
		return ret
	}
}

export function isSimulPhase(phase = -1) {
	if (phase === -1) phase = useModelStore().gameflow.phase
	const store = useModelStore()
	const personal = usePersonalStore()
	// Practice gamws are always in turn order
	if (personal.trainingGame) return false
	if (store.viewSettings.showReplay) return false

	/*if (phase === PHASE_RESTRUCTURING || phase === PHASE_PAYDAY || phase == PHASE_CLEAN_UP) {
            if (rf.SUPER_USERS.includes(global.name)) {
                return true;
            }
        }*/

	// If not a training game, setup reserve and restructuring are ALWAY simul

	if (phase == rf.PHASE_SETUP_RESERVE || phase == rf.PHASE_RESTRUCTURING) return true
	// Otherwise, stricyPaydayFridge is NOT simul
	if (store.startingOptions.strictPaydayFridge) return false

	if (phase == rf.PHASE_CLEAN_UP || phase == rf.PHASE_PAYDAY) return true

	// Otherwise, NON simul
	return false
}

/*****************************************************************
 *
 * END Subphase
 *
 *
 *****************************************************************/

export function endWorkingDaySubphase() {
	const store = useModelStore()
	store.clearCoffeeHistoryInfo()
	context.clearAllHighlights()

	const playerIndex = currentPlayerIndex()
	const playerObj = currentPlayerObj()
	const subphase = store.gameflow.subphase
	const summary = store.context.endOfDaySummaryData

	// --- PHASE: HIRING ---
	if (subphase === rf.SUBPHASE_HIRING) {
		if (store.context.justHired.length >= 3) {
			plyr.awardMilestone(playerIndex, rf.FIRST_HIRE_3)
		}
		model.addHistory(rf.HIST_HIRE, [...store.context.justHired], playerIndex, 0)

		store.gameflow.subphase = rf.SUBPHASE_TRAINING
		store.context.justTrained.length = 0
		summary.train.total = rules.getTrainingPoints(playerIndex, []).total
		summary.train.trained.length = 0

		if (summary.train.total === 0) {
			endWorkingDaySubphase()
			return
		}
	}

	// --- PHASE: TRAINING ---
	else if (subphase === rf.SUBPHASE_TRAINING) {
		completeTraining()
		const unusedPoints = rules.getTrainingPoints(playerIndex, store.context.justTrained).total
		summary.train.unused = unusedPoints

		const tempHist = []
		store.context.justTrained.forEach((o) => {
			let fromNum = o.from + (o.fromStructure ? 50 : 0)
			tempHist.push(fromNum, o.to)
		})

		if (tempHist.length > 0) model.addHistory(rf.HIST_TRAIN, tempHist, playerIndex, 0)

		if (store.startingOptions.coffee && model.shouldActionCoffeeShops()) {
			store.gameflow.subphase = rf.SUBPHASE_COFFEE_SHOPS_FROM_TRAIN
			store.context.justCoffeeShopped.length = 0
			setupCoffeeShopsPhase()
		} else {
			setupMarketingPhase()
		}
	}

	// --- PHASE: COFFEE ---
	else if (subphase === rf.SUBPHASE_COFFEE_SHOPS_FROM_TRAIN) {
		store.context.coffeeShopAction = ""
		setupMarketingPhase()
	}

	// --- PHASE: MARKETING ---
	else if (subphase === rf.SUBPHASE_MARKETING) {
		const currentMarketers = playerObj.employees.filter((e) => rf.MARKETERS.includes(e) && e !== rf.MASS_MARKETEER)
		if (playerObj.employees.includes(rf.NIGHT_SHIFT_MANAGER)) {
			playerObj.employees.forEach((e) => {
				if (e === rf.MARKETING_TRAINEE) currentMarketers.push(e)
			})
		}
		summary.market.unused = [...currentMarketers]

		// Set up producing
		let producers = playerObj.employees.filter((e) => rf.PRODUCERS.includes(e))
		if (playerObj.employees.includes(rf.NIGHT_SHIFT_MANAGER)) {
			const extra = producers.filter((e) => [rf.ERRAND_BOY, rf.KITCHEN_TRAINEE, rf.BARISTA_TRAINEE].includes(e))
			producers.push(...extra)
		}
		summary.produce.total = producers.length
		store.context.remainingProducers = [...producers]

		store.gameflow.subphase = rf.SUBPHASE_PRODUCE
		context.resetJustProduced()

		if (producers.length === 0) {
			endWorkingDaySubphase()
			return
		}
	}

	// --- PHASE: PRODUCE ---
	else if (subphase === rf.SUBPHASE_PRODUCE) {

		// Compute unused producers (same logic as computedProducers in ActionAreaWorkingDay)
		let allProducers = playerObj.employees.filter((e) => rf.PRODUCERS.includes(e))
		if (playerObj.employees.includes(rf.NIGHT_SHIFT_MANAGER)) {
			const extras = allProducers.filter((e) => e === rf.ERRAND_BOY || e === rf.KITCHEN_TRAINEE || e === rf.BARISTA_TRAINEE)
			allProducers = [...allProducers, ...extras]
		}
		for (const used of store.context.justProduced.team) {
			const idx = allProducers.indexOf(used)
			if (idx !== -1) allProducers.splice(idx, 1)
		}
		summary.produce.unused = allProducers
		summary.houses.total = playerObj.employees.filter((e) => e === rf.NEW_BUSINESS_DEVELOPER).length

		if (store.context.justProduced.team.length > 0) {
			const added = store.context.justProduced.added
			const justAddedCondensed = [...added]
			while (justAddedCondensed.length > 0 && justAddedCondensed[justAddedCondensed.length - 1] === 0) {
				justAddedCondensed.pop()
			}

			model.addHistory(rf.HIST_PRODUCE_FOOD_DRINKS, [[...store.context.justProduced.team], justAddedCondensed], playerIndex, 0)

			if (added[rf.BURGER] > 0) plyr.awardMilestone(playerIndex, rf.FIRST_BURGER_PRODUCED)
			if (added[rf.PIZZA] > 0) plyr.awardMilestone(playerIndex, rf.FIRST_PIZZA_PRODUCED)
		}

		// Set up HOUSES phase
		store.gameflow.subphase = rf.SUBPHASE_HOUSES
		store.context.remainingProducers.length = 0
		store.context.justBuilt.length = 0

		const newBusinessDevelopers = playerObj.employees.filter((e) => e === rf.NEW_BUSINESS_DEVELOPER)
		if (newBusinessDevelopers.length === 0) {
			endWorkingDaySubphase()
			return
		}
		setupHousesAndGardensPhase()
	}

	// --- PHASE: HOUSES ---
	else if (subphase === rf.SUBPHASE_HOUSES) {
		// SET UP LOBBYISTS
		summary.lobby.total = playerObj.employees.filter((e) => e === rf.LOBBYIST).length
		store.gameflow.subphase = rf.SUBPHASE_LOBBYISTS
		store.context.justLobbied.length = 0

		const lobbyists = playerObj.employees.filter((e) => e === rf.LOBBYIST)
		if (lobbyists.length === 0) {
			endWorkingDaySubphase()
			return
		}
		setupLobbyistsPhase()
	}

	// --- PHASE: LOBBYISTS ---
	else if (subphase === rf.SUBPHASE_LOBBYISTS) {
		// SET UP NEW RESTOTS
		const managers = playerObj.employees.filter((e) => rf.CAN_BUILD_RESTAURANT.includes(e))
		summary.managers.total = managers.length
		store.gameflow.subphase = rf.SUBPHASE_NEW_RESTAURANTS
		store.context.justOpened.length = 0

		if (summary.managers.total === 0) {
			endWorkingDaySubphase()
			return
		}
	}

	// --- PHASE: NEW RESTAURANTS ---
	else if (subphase === rf.SUBPHASE_NEW_RESTAURANTS) {
		store.gameflow.subphase = rf.SUBPHASE_CONFIRM_END_TURN
	}

	// Final state compression
	store.subphaseResetData = funcs.simpleExportWholeFCMmodel()
	store.subphaseSnapshots[store.gameflow.subphase] = store.subphaseResetData
}

// Set up the marketing subphase, auto-skipping it if there are no marketeers
// available 
function setupMarketingPhase() {
	const store = useModelStore()
	store.gameflow.subphase = rf.SUBPHASE_MARKETING
	store.context.justMarketed.length = 0

	const playerObj = currentPlayerObj()
	const summary = store.context.endOfDaySummaryData
	const marketers = playerObj.employees.filter((e) => rf.MARKETERS.includes(e) && e !== rf.MASS_MARKETEER)
	summary.market.total = marketers.length
	if (playerObj.employees.includes(rf.NIGHT_SHIFT_MANAGER)) {
		summary.market.total += playerObj.employees.filter((e) => e === rf.MARKETING_TRAINEE).length
	}

	const allMarketers = playerObj.employees.filter((employee) => rf.MARKETERS.includes(employee))
	plyr.sendMassMarketeers(currentPlayerIndex())

	let marketersCopy = funcs.removeItemAll(allMarketers, rf.MASS_MARKETEER)
	if (marketersCopy.length === 0 && store.context.massMarketersOnly === -1) {
		// if you only had MM, move to next phase
		endWorkingDaySubphase()
	}
}

/*****************************************************************
 *
 * NEW RESTAURANTS (Local / Regional managers)
 *
 *****************************************************************/

// Return to the manager choice screen.
export function setupNewRestaurantsPhase() {
	const store = useModelStore()
	store.context.selectedBuildingManager = -1
	store.context.newRestaurantAction = ""
	store.context.removedRestoIndex = -1
	store.context.newRestaurantIndex = -1
	store.context.restaurantMilestone = false
	context.clearAllHighlights()
}

// Clicked a Local / Regional Manager card
export function selectManager(manager) {
	const store = useModelStore()
	const playerObj = currentPlayerObj()

	store.context.selectedBuildingManager = manager
	store.context.newRestaurantAction = ""

	if (manager === rf.LOCAL_MANAGER) {
		if (playerObj.restaurants.length < 3) {
			store.context.newRestaurantAction = "create"
			setNewRestaurantPlacementHighlights()
		} else {
			// No more restaurants: the manager is still spent
			store.context.justOpened.push(manager)
			store.context.noMoreRestaurants = true
			setupNewRestaurantsPhase()
		}
	} else {
		if (playerObj.restaurants.length < 3) {
			// Regional Manager: choose between Move and Create
		} else {
			store.context.newRestaurantAction = "move"
			setMoveRestaurantHighlights()
		}
	}
}

export function chooseBuildAction(action) {
	const store = useModelStore()
	store.context.newRestaurantAction = action
	if (action === "move") setMoveRestaurantHighlights()
	else setNewRestaurantPlacementHighlights()
}

// Highlight where the selected manager's new restaurant may be placed
export function setNewRestaurantPlacementHighlights() {
	const store = useModelStore()
	context.clearAllHighlights()
	const ranged = store.context.selectedBuildingManager === rf.LOCAL_MANAGER
	store.highlights.indexesToHighlightYellow = rules.givePossiblePositionsForNewRestaurant(store.context.rotation, ranged)
}

// Highlight the player's existing restaurants so one can be picked to move
export function setMoveRestaurantHighlights() {
	const store = useModelStore()
	context.clearAllHighlights()
	const squares = []
	for (const r of currentPlayerObj().restaurants) squares.push(...map.giveAllSpaceForAToken(r.index, 2, 2))
	store.highlights.indexesToHighlightYellow = squares
}

// Map a clicked square back to the anchor index of the restaurant it belongs to
export function restaurantAnchorForSquare(square) {
	for (const r of currentPlayerObj().restaurants) {
		if (map.giveAllSpaceForAToken(r.index, 2, 2).includes(square)) return r.index
	}
	return -1
}

// Clicked an existing restaurant to move it: remove it, then place it elsewhere
export function removeRestaurantForMove(square) {
	const store = useModelStore()
	const anchor = restaurantAnchorForSquare(square)
	if (anchor === -1) return

	model.removeRestaurant(currentPlayerIndex(), anchor)
	store.context.removedRestoIndex = anchor
	store.context.newRestaurantAction = "create"
	setNewRestaurantPlacementHighlights()
}

// Clicked a highlighted square to place the new restaurant
export function chooseRestaurantPositionForWorking(index) {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()
	const playerObj = currentPlayerObj()
	const manager = store.context.selectedBuildingManager
	const rotation = store.context.rotation
	const isRegional = manager === rf.REGIONAL_MANAGER

	plyr.addRestaurantToPlayer(playerIndex, index, rotation, isRegional)
	map.addElement(rf.TYPE_RESTAURANT, playerObj.colour, index, false)

	store.context.justOpened.push(manager)
	store.context.endOfDaySummaryData.managers.built.push(manager)

	if (store.context.removedRestoIndex === -1) {
		const histObj = [funcs.exportIndex(index), funcs.booleanToInt(manager === rf.LOCAL_MANAGER)]
		if (rotation !== 3) histObj.push(rotation)
		model.addHistory(rf.HIST_OPEN_RESTAURANT, histObj, playerIndex, 0)
		plyr.awardMilestone(playerIndex, rf.FIRST_NEW_RESTAURANT)
	} else {
		const histObj = [funcs.exportIndex(index), funcs.exportIndex(store.context.removedRestoIndex)]
		if (rotation !== 3) histObj.push(rotation)
		model.addHistory(rf.HIST_MOVE_RESTAURANT, histObj, playerIndex, 0)
	}

	store.context.removedRestoIndex = -1
	store.context.selectedBuildingManager = -1
	store.context.newRestaurantAction = ""

	// FIRST_NEW_RESTAURANT milestone: a free mailbox campaign next to the restaurant
	if (plyr.hasMilestone(playerIndex, rf.FIRST_NEW_RESTAURANT) && store.availableMilestones.indexOf(rf.FIRST_NEW_RESTAURANT) > -1 && store.context.isNewRestoMSmailbox === false) {
		store.context.isNewRestoMSmailbox = true
		store.context.restaurantMilestone = true
		store.context.newRestaurantIndex = index
		setMailboxMilestoneHighlights()
	} else {
		setupNewRestaurantsPhase()
	}
}

// Pick the first mailbox campaign that fits next to the new restaurant and highlight its spots
export function setMailboxMilestoneHighlights() {
	const store = useModelStore()
	context.clearAllHighlights()

	const campaigns = rules
		.possibleMarketingCampaigns(store.availableMarketingCampaigns, rf.CAMPAIGN_MANAGER)
		.filter((camp) => rf.MARKETING_CAMPAIGNS[camp].type === rf.MAIL)
		.filter((camp) => rules.givePossiblePositionsForMailboxRestaurantMilestone(camp, store.context.newRestaurantIndex).length > 0)

	if (campaigns.length === 0) {
		cancelNewRestaurantMilestone()
		return
	}

	store.context.marketer = rf.CAMPAIGN_MANAGER
	store.context.campaigns = campaigns
	store.context.campaign = campaigns[0]
	store.context.good = 0
	store.context.rotated = false
	store.context.duration = 9
	store.highlights.indexesToHighlightYellow = rules.givePossiblePositionsForMailboxRestaurantMilestone(campaigns[0], store.context.newRestaurantIndex)
}

// Clicked a highlighted square to place the milestone mailbox campaign
export function placeMailboxRestaurantMilestone(index) {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()

	model.addHistory(rf.HIST_RESTO_MAILBOX_MS, [store.context.campaign, funcs.exportIndex(index), store.context.good], playerIndex, 0)
	model.addMarketingCampaign(store.context.campaign, index, store.context.rotated, store.context.good, store.context.duration)

	store.context.newRestaurantIndex = -1
	store.context.restaurantMilestone = false
	store.context.campaigns.splice(0)
	store.context.marketer = -1
	store.context.campaign = -1
	setupNewRestaurantsPhase()
}

export function cancelNewRestaurantMilestone() {
	const store = useModelStore()
	store.context.newRestaurantIndex = -1
	store.context.restaurantMilestone = false
	store.context.campaigns.splice(0)
	store.context.marketer = -1
	store.context.campaign = -1
	setupNewRestaurantsPhase()
}

/*****************************************************************
 *
 * HOUSES & GARDENS (New Business Developer)
 *
 *****************************************************************/

// Set up the Houses & Gardens subphase.
export function setupHousesAndGardensPhase() {
	const store = useModelStore()
	const playerObj = currentPlayerObj()
	context.clearAllHighlights()

	store.context.selectedBuilding = -1
	store.context.rotation = 0
	store.context.house = -1
	store.context.houseIndex = -1
	store.context.edges.splice(0)

	const numLeft = playerObj.employees.filter((e) => e === rf.NEW_BUSINESS_DEVELOPER).length - store.context.justBuilt.length
	if (numLeft <= 0) return

	const houses = rules.availableHouses()
	store.context.selectedBuilding = houses.length > 0 ? houses[0] : -1
	updateHousesHighlights()
}

// Highlight the board for the currently selected building (a house number, or -1 = garden)
export function updateHousesHighlights() {
	const store = useModelStore()
	context.clearAllHighlights()

	if (store.context.selectedBuilding === -1) {
		// Garden: highlight each house's 2x2 block
		const squares = []
		for (const houseNum of rules.givePossibleHousesForGarden()) {
			const idx = map.findIndexForHouse(houseNum)
			if (idx > -1) squares.push(idx, idx + 1, idx + rf.ssW, idx + rf.ssW + 1)
		}
		store.highlights.indexesToHighlightYellow = squares
	} else {
		const rotated = store.context.rotation === 1 || store.context.rotation === 3
		const w = rotated ? 3 : 2
		const h = rotated ? 2 : 3
		store.highlights.indexesToHighlightYellow = rules.givePossiblePositionsForBlock(w, h)
	}
}

// Clicked a house in the build box
export function selectHouseToBuild(houseNumber) {
	const store = useModelStore()
	store.context.selectedBuilding = houseNumber
	store.context.rotation = 0
	store.context.house = -1
	store.context.houseIndex = -1
	store.context.edges.splice(0)
	updateHousesHighlights()
}

// Clicked the garden in the build box
export function selectGardenToBuild() {
	const store = useModelStore()
	store.context.selectedBuilding = -1
	store.context.rotation = 0
	store.context.house = -1
	store.context.houseIndex = -1
	store.context.edges.splice(0)
	updateHousesHighlights()
}

// Clicked a highlighted square during the HOUSES subphase
export function clickedHouseSquare(index) {
	const store = useModelStore()
	if (store.context.selectedBuilding === -1) {
		if (store.context.edges.length > 0) chooseHouseEdge(-1, index)
		else chooseHouseForGarden(index)
	} else {
		chooseHousePosition(index)
	}
}

export function chooseHousePosition(index) {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()
	const building = store.context.selectedBuilding
	const rotation = store.context.rotation

	model.addHouse(building, index, rotation)

	const histData = [funcs.exportIndex(index), building, rotation]
	model.addHistory(rf.HIST_BUILD_HOUSE, histData, playerIndex, 0)

	plyr.awardMilestone(playerIndex, rf.FIRST_HOUSE_BUILT)
	store.context.justBuilt.push(index)
	store.context.endOfDaySummaryData.houses.built.push(building)

	setupHousesAndGardensPhase()
}

export function chooseHouseForGarden(index) {
	const store = useModelStore()
	const houseNumber = store.mapData.coords[index] - rf.HOUSE
	const houseIndex = map.findIndexForHouse(houseNumber)
	const edges = map.findFreeEdgesForHouse(houseNumber)

	store.context.house = houseNumber
	store.context.houseIndex = houseIndex

	if (edges.length === 1) {
		chooseHouseEdge(edges[0], -1)
	} else {
		store.context.edges.splice(0)
		store.context.edges.push(...edges)
		const edgeIndexes = edges.map((edge) => map.giveIndexForEdge(edge, houseIndex))
		context.clearAllHighlights()
		store.highlights.indexesToHighlightYellow = edgeIndexes
	}
}

// edge = edge number, or -1 when index is the clicked edge square
export function chooseHouseEdge(edge, index) {
	const store = useModelStore()
	if (edge === -1) edge = map.giveEdgeForIndex(index, store.context.houseIndex)
	else if (index === -1) index = map.giveIndexForEdge(edge, store.context.houseIndex)

	const rotated = edge % 2 === 1
	model.addGarden(index, rotated, store.context.house)

	const histData = [funcs.exportIndex(index), store.context.house]
	if (!rotated) histData.push(0)
	model.addHistory(rf.HIST_BUILD_GARDEN, histData, currentPlayerIndex(), rotated ? 0 : 1)

	store.context.justBuilt.push(index)
	store.context.endOfDaySummaryData.houses.built.push(-1)

	setupHousesAndGardensPhase()
}

/*****************************************************************
 *
 * LOBBYISTS SUBPHASE
 *
 *****************************************************************/

// Set up the Lobbyists subphase. 
export function setupLobbyistsPhase() {
	const store = useModelStore()
	const playerObj = currentPlayerObj()
	context.clearAllHighlights()

	const numLeft = playerObj.employees.filter((e) => e === rf.LOBBYIST).length - store.context.justLobbied.length
	if (numLeft <= 0) return

	const newRoads = rules.availableNewRoads()
	const newParks = rules.availableParks()

	if (newRoads.length + newParks.length === 0) return

	// Set initial building type and variety
	if (newRoads.length === 0) {
		store.context.buildingType = 1
		for (let i = 0; i < 3; i++) {
			if (newParks.includes(i)) { store.context.variety = i; break }
		}
	} else {
		store.context.buildingType = 0
		for (let i = 0; i < 3; i++) {
			if (newRoads.includes(i)) { store.context.variety = i; break }
		}
	}
	store.context.rotation = 0
	store.context.flipped = false
	updateLobbyistHighlights()
}

// Switch between road and park building type
export function selectLobbyistBuilding(type) {
	const store = useModelStore()
	store.context.buildingType = type
	store.context.rotation = 0
	store.context.flipped = false

	const available = type === 0 ? rules.availableNewRoads() : rules.availableParks()
	for (let i = 0; i < 3; i++) {
		if (available.includes(i)) { store.context.variety = i; break }
	}
	updateLobbyistHighlights()
}

// Select a specific variety within the current building type
export function selectLobbyistVariety(variety) {
	const store = useModelStore()
	store.context.variety = variety
	store.context.rotation = 0
	store.context.flipped = false
	updateLobbyistHighlights()
}

// Rotate lobbyist item (handles variety-specific rotation limits)
export function rotateLobbyist(clockwise) {
	const store = useModelStore()
	const bType = store.context.buildingType
	const v = store.context.variety

	if (clockwise) {
		store.context.rotation++
		if (store.context.rotation === 4) store.context.rotation = 0
		// Roads variety 0,1 and Parks variety 0: only 2 rotations
		if (store.context.rotation === 2 && bType === 0 && v !== 2) store.context.rotation = 0
		if (store.context.rotation === 2 && bType === 1 && v === 0) store.context.rotation = 0
	} else {
		store.context.rotation--
		if (store.context.rotation === -1) store.context.rotation = 3
		if (store.context.rotation === 3 && bType === 0 && v !== 2) store.context.rotation = 1
		if (store.context.rotation === 3 && bType === 1 && v === 0) store.context.rotation = 1
	}
	updateLobbyistHighlights()
}

// Flip lobbyist item (only for park variety 2)
export function flipLobbyist(vertical) {
	const store = useModelStore()
	store.context.flipped = !store.context.flipped
	if (vertical) {
		// Vertical flip: swap rotations 0 <-> 2
		if (store.context.rotation === 0) store.context.rotation = 2
		else if (store.context.rotation === 2) store.context.rotation = 0
	} else {
		// Horizontal flip: swap rotations 1 <-> 3
		if (store.context.rotation === 1) store.context.rotation = 3
		else if (store.context.rotation === 3) store.context.rotation = 1
	}
	updateLobbyistHighlights()
}

// Update map highlights based on current lobbyist selection
export function updateLobbyistHighlights() {
	const store = useModelStore()
	context.clearAllHighlights()

	const bType = store.context.buildingType
	const v = store.context.variety
	const rot = store.context.rotation
	const lobbyistData = [v, rot]

	if (bType === 0) {
		// Road
		if (v === 0) {
			store.highlights.indexesToHighlightYellow = rules.givePossiblePositionsForSimpleObject(2, 1, 2, rot, true, true, lobbyistData)
		} else if (v === 1) {
			store.highlights.indexesToHighlightYellow = rules.givePossiblePositionsForSimpleObject(4, 1, 2, rot, true, true, lobbyistData)
		} else if (v === 2) {
			// Corner road uses locationForWeirdObject
			let roadModel = []
			if (rot === 0) roadModel = [[1, 1], [1, 0]]
			else if (rot === 1) roadModel = [[1, 1], [0, 1]]
			else if (rot === 2) roadModel = [[0, 1], [1, 1]]
			else if (rot === 3) roadModel = [[1, 0], [1, 1]]
			store.highlights.indexesToHighlightYellow = map.locationForWeirdObject(roadModel, true, true, "newRoad", lobbyistData)
		}
	} else {
		// Park
		const parkModel = rf.getParkModel(v, rot, store.context.flipped)
		store.context.parkModel = parkModel
		if (v === 0) {
			store.highlights.indexesToHighlightYellow = rules.givePossiblePositionsForSimpleObject(4, 1, 2, rot, true, false, lobbyistData)
		} else {
			store.highlights.indexesToHighlightYellow = map.locationForWeirdObject(parkModel, true, false, "park", lobbyistData)
		}
	}
}

// Clicked a highlighted square during LOBBYISTS subphase
export function clickedLobbyistSquare(index) {
	const store = useModelStore()
	if (store.context.buildingType === 0) placeLobbyistRoad(index)
	else placeLobbyistPark(index)
}

// Place a road via lobbyist
function placeLobbyistRoad(index) {
	const store = useModelStore()
	model.addNewRoad(index, store.context.variety, store.context.rotation, store.gameflow.turn)

	store.context.justLobbied.push(index)

	const histData = [funcs.exportIndex(index), store.context.variety]
	if (store.context.rotation !== 0) histData.push(store.context.rotation)
	model.addHistory(rf.HIST_LOBBYIST_ROAD, histData, currentPlayerIndex(), 0)

	// EOD summary
	store.context.endOfDaySummaryData.lobby.built.push([1, store.context.variety, store.context.rotation])

	// Milestone check
	const playerIndex = currentPlayerIndex()
	if (!plyr.hasMilestone(playerIndex, rf.FIRST_LOBBYIST_USED) && store.availableMilestones.includes(rf.FIRST_LOBBYIST_USED)) {
		plyr.awardMilestone(playerIndex, rf.FIRST_LOBBYIST_USED)
		selectNewBoardTile()
	} else {
		setupLobbyistsPhase()
	}
}

// Place a park via lobbyist
function placeLobbyistPark(index) {
	const store = useModelStore()
	model.addPark(index, store.context.variety, store.context.rotation, store.context.flipped, store.context.parkModel)

	store.context.justLobbied.push(index)

	const histData = [funcs.exportIndex(index), store.context.variety]
	if (store.context.variety === 0 && store.context.rotation !== 0) histData.push(1)
	else if (store.context.variety === 1 && store.context.rotation !== 0) histData.push(store.context.rotation)
	else if (store.context.variety === 2) {
		histData.push(store.context.rotation)
		if (store.context.flipped) histData.push(1)
	}
	model.addHistory(rf.HIST_LOBBYIST_PARK, histData, currentPlayerIndex(), 0)

	// EOD summary
	store.context.endOfDaySummaryData.lobby.built.push([0, store.context.variety, store.context.rotation, store.context.flipped])

	// Milestone check
	const playerIndex = currentPlayerIndex()
	if (!plyr.hasMilestone(playerIndex, rf.FIRST_LOBBYIST_USED) && store.availableMilestones.includes(rf.FIRST_LOBBYIST_USED)) {
		plyr.awardMilestone(playerIndex, rf.FIRST_LOBBYIST_USED)
		selectNewBoardTile()
	} else {
		setupLobbyistsPhase()
	}
}

/*****************************************************************
 *
 * LOBBYIST MILESTONE - NEW BOARD TILE
 *
 *****************************************************************/

// Show the tile selector for the First Lobbyist Used milestone.
function selectNewBoardTile() {
	const store = useModelStore()
	context.clearAllHighlights()

	const allTiles = rules.availableLobbyistTiles()
	store.context.rotation = 0
	store.context.newLobbyistTile = allTiles.length > 0 ? allTiles[0] : -1
	store.context.lobbyistMilestoneActive = true

	if (allTiles.length > 0) {
		updateLobbyistMSHighlights()
	} else {
		// No more tiles available, skip back to lobbyist flow
		setupLobbyistsPhase()
	}
}

// Select a different tile in the milestone tile selector
export function selectLobbyistMSTile(tile) {
	const store = useModelStore()
	store.context.newLobbyistTile = tile
	store.context.rotation = 0
	updateLobbyistMSHighlights()
}

// Rotate the milestone tile (0-3, always 4 rotations)

// Update highlights for valid tile placement positions
function updateLobbyistMSHighlights() {
	const store = useModelStore()
	context.clearAllHighlights()
	store.highlights.indexesToHighlightYellow = rules.givePossibilitiesForNewTile()
}

// Cancel the milestone tile selection and return to lobbyist flow
export function cancelLobbyistMilestone() {
	const store = useModelStore()
	store.context.lobbyistMilestoneActive = false
	store.context.newLobbyistTile = -1
	context.clearAllHighlights()
	setupLobbyistsPhase()
}

// Clicked a highlighted square during tile placement milestone
export function clickedNewTileSquare(index) {
	const store = useModelStore()
	const totalSSwidth = store.mapData.dimensions[0] * 5

	const x = index % totalSSwidth
	const y = Math.floor(index / totalSSwidth)
	const tileX = Math.floor(x / 5)
	const tileY = Math.floor(y / 5)

	let tileIndex = tileX + tileY * store.mapData.dimensions[0]
	tileIndex *= 2

	map.addTileToMap(store.context.newLobbyistTile, tileIndex, store.context.rotation)
	view.setMapDisplayTiles()

	// Tile 20 contains house 25 - add it
	if (store.context.newLobbyistTile === 20) {
		const tiles = store.mapData.tiles
		const tile20Pos = tiles.indexOf(20)
		const rotated = (tiles[tile20Pos + 1] === 1 || tiles[tile20Pos + 1] === 3) ? 1 : 0
		const house25index = map.findIndexForHouse(25)
		model.addHouse(25, house25index, rotated)
	}

	// Log the tile placement
	const histData = [funcs.exportIndex(index), store.context.newLobbyistTile, store.context.rotation, tileIndex / 2]
	model.addHistory(rf.HIST_NEW_TILE, histData, currentPlayerIndex(), 0)

	store.context.newLobbyistTile = -1
	store.context.lobbyistMilestoneActive = false
	context.clearAllHighlights()

	setupLobbyistsPhase()
}

/*****************************************************************
 *
 * COFFEE SHOPS SUBPHASE
 *
 *****************************************************************/

// Set up the Coffee Shops subphase.
export function setupCoffeeShopsPhase() {
	const store = useModelStore()
	context.clearAllHighlights()

	const player = currentPlayerObj()
	const remaining = store.context.baristaCoffeeShops + store.context.leadBaristaCoffeeShopsFromB + store.context.leadBaristaCoffeeShopsFromTB

	if (remaining > 0) {
		// leadBaristaCoffeeShopsFromB is always placed first; a TB shop is placed second (after the range-2 shop)
		const unlimited = store.context.leadBaristaCoffeeShopsFromB > 0 || (store.context.justCoffeeShopped.length === 1 && store.context.leadBaristaCoffeeShopsFromTB > 0)

		if (player.coffeeShops.length < 3) {
			store.context.coffeeShopAction = "place"
			store.highlights.indexesToHighlightYellow = rules.givePossiblePositionsForCoffeeShop(unlimited ? 99 : 2)
		} else {
			// No more coffee shops available - select a placed one to move it
			store.context.coffeeShopAction = "remove"
			store.highlights.indexesToHighlightYellow = [...player.coffeeShops]
		}
	} else {
		store.context.coffeeShopAction = ""
		if (store.context.justCoffeeShopped.length === 0) endWorkingDaySubphase()
	}
}

// Clicked a highlighted square to place a coffee shop
export function placeCoffeeShop(index) {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()

	model.addCoffeeShop(playerIndex, index)
	model.addHistory(rf.HIST_COFFE_SHOP_BUILD, [funcs.exportIndex(index)], playerIndex, 0)

	store.context.justCoffeeShopped.push(index)

	// leadBaristaCoffeeShopsFromB will ALWAYS be placed first
	if (store.context.leadBaristaCoffeeShopsFromB > 0) store.context.leadBaristaCoffeeShopsFromB--
	// else if you have placed one shop, and have a TB available, it must have been placed second
	else if (store.context.leadBaristaCoffeeShopsFromTB > 0 && store.context.justCoffeeShopped.length === 2) store.context.leadBaristaCoffeeShopsFromTB--
	else store.context.baristaCoffeeShops--

	setupCoffeeShopsPhase()
}

// Clicked one of your own coffee shops to move it (only when all 3 are placed)
export function removeCoffeeShop(index) {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()

	model.removeCoffeeShop(playerIndex, index)
	model.addHistory(rf.HIST_COFFE_SHOP_REMOVE, [funcs.exportIndex(index)], playerIndex, 0)

	if (store.gameflow.phase === rf.PHASE_COFFE_SHOP_MS) setupCoffeeShopMSPhase()
	else setupCoffeeShopsPhase()
}

/*****************************************************************
 *
 * PIZZA BOMB PHASE (First Pizza Sold milestone)
 *
 *****************************************************************/

// Set up the Pizza Bomb phase.
export function setupPizzaBombPhase() {
	const store = useModelStore()
	context.clearAllHighlights()

	const house = store.firstPizzas[1]
	const spaces = rules.givePossiblePositionsForRadioPizzaBomb(house).filter((value) => map.adjacentToRoad(value))

	if (spaces.length > 0) {
		store.highlights.indexesToHighlightYellow = spaces
	}
}

// Clicked a highlighted square to place the free radio campaign
export function choosePizzaBombMarketer(index) {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()

	const campaign = rules.firstRadioCampaign()
	model.addMarketingCampaign(campaign, index, false, rf.PIZZA, 2)

	const histData = [funcs.exportIndex(index)]
	if (campaign !== 1) histData.push(campaign)
	model.addHistory(rf.HIST_PIZZA_BOMB, histData, playerIndex, 0)

	store.firstPizzas.splice(0, 3)

	if (store.firstPizzas.length < 3 || store.firstPizzas[2] !== currentPlayerIndex()) {
		endPlayerTurn(false, false)
	} else {
		setupPizzaBombPhase()
	}
}

// No space left for the pizza radio - skip this bomb
export function skipPizzaBombMarketer() {
	const store = useModelStore()
	store.firstPizzas.splice(0, 3)

	if (store.firstPizzas.length < 3 || store.firstPizzas[2] !== currentPlayerIndex()) {
		endPlayerTurn(true, true)
	} else {
		setupPizzaBombPhase()
	}
}

/*****************************************************************
 *
 * COFFEE SHOP MILESTONE PHASE (First Coffee Sold milestone)
 *
 *****************************************************************/

// Set up the Coffee Shop MS phase.
export function setupCoffeeShopMSPhase() {
	const store = useModelStore()
	context.clearAllHighlights()

	const player = currentPlayerObj()
	if (player.coffeeShops.length < 3) {
		store.context.coffeeShopMSAction = "place"
		store.highlights.indexesToHighlightYellow = rules.givePossiblePositionsForCoffeeShop(99)
	} else {
		// No more coffee shops available - select a placed one to move it
		store.context.coffeeShopMSAction = "remove"
		store.highlights.indexesToHighlightYellow = [...player.coffeeShops]
	}
}

// Clicked a highlighted square to place the milestone coffee shop
export function placeCoffeeShopMS(index) {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()

	model.addCoffeeShop(playerIndex, index)
	model.addHistory(rf.HIST_COFFE_SHOP_BUILD, [funcs.exportIndex(index)], playerIndex, 0)

	// Remove player from the milestone order
	store.coffeeShopMSplayers.splice(0, 1)
	store.context.coffeeShopMSAction = ""
	context.clearAllHighlights()
}

// Skip the Coffee Milestone placement - end the turn as usual
export function skipCoffeeMS() {
	const store = useModelStore()
	store.context.coffeeShopMSAction = ""
	context.clearAllHighlights()
}

/*****************************************************************
 *
 * MARKETING SUBPHASE
 *
 *
 *****************************************************************/

// Duration is infinite for billboard/radio when the relevant milestone is (or was) claimed, and always for giant billboards
export function campaignDurationInfinite() {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()
	const campaignData = rf.MARKETING_CAMPAIGNS[store.context.campaign]

	if (store.context.restaurantMilestone) return true
	if (store.availableMilestones.indexOf(rf.FIRST_BILLBOARD) > -1 && campaignData.type === rf.BILLBOARD) return true
	if (plyr.hasMilestone(playerIndex, rf.FIRST_BILLBOARD)) return true
	if (plyr.hasMilestone(playerIndex, rf.FIRST_BRAND_DIRECTOR_USED) && campaignData.type === rf.RADIO) return true
	if (campaignData.type === rf.GIANT_BILLBOARD) return true
	return false
}

// Highlight the squares the currently selected campaign can be placed on
export function setCampaignPlacementHighlights() {
	const store = useModelStore()
	store.highlights.indexesToHighlightYellow.splice(0)

	if (store.context.marketer === -1 || store.context.campaign === -1) return

	// Gourmet guides / giant billboards / hawker trucks are placed via button, not map click
	if (store.context.campaign > 16) return

	store.highlights.indexesToHighlightYellow = rules.givePossiblePositionsForMarketingCampaign(store.context.marketer, store.context.campaign, store.context.rotated)
}

// Clear the current marketer/campaign selection and return to the marketer choice screen
export function resetMarketingSelection() {
	const store = useModelStore()
	context.clearAllHighlights()

	store.context.action = rf.ACT_NONE
	store.context.marketer = -1
	store.context.campaign = -1
	store.context.campaigns.splice(0)
	store.context.double = false
	store.context.secondGood = -1
	store.context.refusePlaneDouble = false
	store.context.rotated = false
	store.context.freewayHighlightSets = null
	store.context.good = 0
	store.context.duration = 1
	store.context.hawkerRouteActive = false
	store.context.showingHawkerRoute = -1
	store.context.path.splice(0)
	store.context.from = -1
	store.context.range = 0
}

export function selectMarketer(marketer, nightShift) {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()
	const playerObj = currentPlayerObj()

	context.clearAllHighlights()
	store.context.nightShift = nightShift === true

	// Award "used" milestones on selection
	if (marketer === rf.BRAND_MANAGER) {
		plyr.awardMilestone(playerIndex, rf.FIRST_MARKETEER_USED)
		plyr.awardMilestone(playerIndex, rf.FIRST_BRAND_MANAGER_USED)
	} else if (marketer === rf.BRAND_DIRECTOR) {
		plyr.awardMilestone(playerIndex, rf.FIRST_MARKETEER_USED)
		plyr.awardMilestone(playerIndex, rf.FIRST_BRAND_DIRECTOR_USED)
	}

	store.context.marketer = marketer

	let campaigns = rules.possibleMarketingCampaigns(store.availableMarketingCampaigns, marketer)

	// Giant billboards are identical - only offer one
	if (campaigns.includes(21)) campaigns = [21]
	if (campaigns.includes(22)) campaigns = [22]
	if (campaigns.includes(23)) campaigns = [23]

	store.context.campaigns = campaigns

	if (campaigns.length === 0) return

	// Brand Manager milestone allows marketing an additional good with an airplane
	let double = false
	if (plyr.hasMilestone(playerIndex, rf.FIRST_BRAND_MANAGER_USED) && store.availableMilestones.indexOf(rf.FIRST_BRAND_MANAGER_USED) > -1 && playerObj.additionalMarketedGood.length === 0) double = true
	if (store.context.refusePlaneDouble === true) double = false
	store.context.double = double

	store.context.campaign = campaigns[0]
	store.context.good = 0
	store.context.rotated = false
	store.context.secondGood = -1
	store.context.duration = campaignDurationInfinite() ? 9 : 1

	setCampaignPlacementHighlights()
}

export function chooseCampaign(campaign) {
	const store = useModelStore()
	const newType = rf.MARKETING_CAMPAIGNS[campaign]?.type
	const wasPlane = rf.MARKETING_CAMPAIGNS[store.context.campaign]?.type === rf.AIRPLANE
	store.context.campaign = campaign
	store.context.rotated = false
	if (newType !== rf.AIRPLANE || !wasPlane) {
		store.context.secondGood = -1
		store.context.refusePlaneDouble = false
	}
	if (campaignDurationInfinite()) store.context.duration = 9
	else if (store.context.duration === 9) store.context.duration = 1

	if (store.context.restaurantMilestone) {
		store.highlights.indexesToHighlightYellow = rules.givePossiblePositionsForMailboxRestaurantMilestone(campaign, store.context.newRestaurantIndex)
	} else {
		setCampaignPlacementHighlights()
	}
}

export function chooseGood(good) {
	const store = useModelStore()
	store.context.good = good

	// Keep the second good distinct from the main one
	if (store.context.secondGood === good) {
		store.context.secondGood = good + 1
		if (store.context.secondGood === 5) store.context.secondGood = 0
	}
}

export function chooseSecondGood(good) {
	const store = useModelStore()
	store.context.secondGood = good
	store.context.refusePlaneDouble = good === -1
}

export function chooseDuration(duration) {
	const store = useModelStore()
	store.context.duration = duration
}

export function rotateCampaign() {
	const store = useModelStore()
	const campaignData = rf.MARKETING_CAMPAIGNS[store.context.campaign]
	if (campaignData.width === campaignData.height || campaignData.type === rf.GIANT_BILLBOARD) return

	store.context.rotated = !store.context.rotated

	if (store.context.restaurantMilestone) {
		store.highlights.indexesToHighlightYellow = rules.givePossiblePositionsForMailboxRestaurantMilestone(store.context.campaign, store.context.newRestaurantIndex)
	} else {
		setCampaignPlacementHighlights()
	}
}

// Happens when you run out of campaigns for this marketer
export function cancelMarketer() {
	const store = useModelStore()
	const playerObj = currentPlayerObj()

	if (playerObj.employees.indexOf(store.context.marketer) !== -1) store.context.justMarketed.push(store.context.marketer)
	resetMarketingSelection()
}

export function skipNightShiftManager() {
	const store = useModelStore()
	store.context.nightShift = false
	store.context.nightShiftCampaign = false
	resetMarketingSelection()
}

// SECOND CAMPAIGN MANAGER MILESTONE - place a second campaign of the same type
function playSecondCampaignManager() {
	const store = useModelStore()

	const currentType = rf.MARKETING_CAMPAIGNS[store.context.campaign].type
	let campaigns = rules.possibleMarketingCampaigns(store.availableMarketingCampaigns, rf.CAMPAIGN_MANAGER)
	campaigns = campaigns.filter((camp) => rf.MARKETING_CAMPAIGNS[camp].type === currentType)

	if (campaigns.length == 0) {
		store.context.secondCampaignManager = false
		resetMarketingSelection()
		return
	}

	store.context.secondCampaignManager = true
	store.context.campaign = campaigns[0]
	store.context.double = false
	store.context.campaigns = campaigns
	store.context.rotated = false

	setCampaignPlacementHighlights()
}

// NIGHT SHIFT MANAGER - the marketing trainee markets a second time
function playNightShiftCampaign() {
	selectMarketer(rf.MARKETING_TRAINEE, true)
}

function awardCampaignTypeAndGoodMilestones(playerIndex) {
	const store = useModelStore()

	if (rf.MARKETING_CAMPAIGNS[store.context.campaign].type === rf.BILLBOARD) {
		plyr.awardMilestone(playerIndex, rf.FIRST_BILLBOARD)
	} else if (rf.MARKETING_CAMPAIGNS[store.context.campaign].type === rf.AIRPLANE) {
		plyr.awardMilestone(playerIndex, rf.FIRST_AIRPLANE_CAMPAIGN)
	} else if (rf.MARKETING_CAMPAIGNS[store.context.campaign].type === rf.RADIO) {
		plyr.awardMilestone(playerIndex, rf.FIRST_RADIO_CAMPAIGN)
	}

	if (store.context.good === rf.BURGER) {
		plyr.awardMilestone(playerIndex, rf.FIRST_BURGER_MARKETED)
	} else if (store.context.good === rf.PIZZA) {
		plyr.awardMilestone(playerIndex, rf.FIRST_PIZZA_MARKETED)
	} else {
		plyr.awardMilestone(playerIndex, rf.FIRST_DRINK_MARKETED)
	}
}

// Place campaign in model - after you click on square / press Place button
export function placeMarketingCampaign(index) {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()
	const playerObj = currentPlayerObj()
	let scmChain = false

	// If it's an airplane campaign, return the index to the original position
	if (rf.MARKETING_CAMPAIGNS[store.context.campaign].type === rf.AIRPLANE) {
		if (store.context.rotated === true) {
			// if on left edge, -1
			if (index % 5 == 0) index--
			else if ((index + 1) % 5 == 0) index++
		} else {
			// Move it on to top row of tiles
			if (index % (rf.ssW * 5) < rf.ssW) index -= rf.ssW
			else index += rf.ssW
		}
	}

	// Do this to allow main good to be selected on top
	if (store.context.double && store.context.secondGood > -1) {
		let temp = store.context.secondGood
		store.context.secondGood = store.context.good
		store.context.good = temp
	}

	context.clearAllHighlights()

	// --- NIGHT SHIFT CAMPAIGN ---
	if (store.context.nightShift) {
		store.context.endOfDaySummaryData.market.marketed.push(store.context.campaign)

		// If the first campaign was short and this one is longer, attach the Night Shift Manager to this campaign instead
		let swappingNSmarketer = false
		if (store.context.firstCampaignDuration === 1 && store.context.duration === 2) {
			swappingNSmarketer = true
			const indexToSwap = playerObj.marketers.findIndex((object) => object.campaign === store.context.firstCampaignCampaign)
			playerObj.marketers[indexToSwap].nightShift = true
		}

		store.context.justMarketed.push(store.context.campaign)

		plyr.sendPlayerMarketerToMarket(playerIndex, store.context.marketer, store.context.campaign, !swappingNSmarketer, swappingNSmarketer)

		model.addMarketingCampaign(store.context.campaign, index, store.context.rotated, store.context.good, store.context.duration)

		const nsHist = [store.context.campaign, funcs.exportIndex(index), store.context.good, store.context.duration]
		if (rf.ROTATABLE_CAMPAIGNS.includes(store.context.campaign)) nsHist.push(funcs.booleanToInt(store.context.rotated))
		model.addHistory(rf.HIST_START_NS_CAMPAIGN, nsHist, playerIndex, 0)

		store.context.nightShift = false
	}
	// --- NORMAL CAMPAIGN ---
	else {
		if (store.context.secondCampaignManager) {
			plyr.addCampaignToMarketer(playerIndex, store.context.marketer, store.context.campaign)
		} else {
			plyr.sendPlayerMarketerToMarket(playerIndex, store.context.marketer, store.context.campaign, false, false)

			// EOD summary
			store.context.endOfDaySummaryData.market.marketed.push(store.context.campaign)
		}

		// Store the brand manager additional good
		if (plyr.hasMilestone(playerIndex, rf.FIRST_BRAND_MANAGER_USED) && store.availableMilestones.indexOf(rf.FIRST_BRAND_MANAGER_USED) > -1 && playerObj.additionalMarketedGood.length === 0) {
			if (store.context.refusePlaneDouble !== true && store.context.secondGood !== -1) playerObj.additionalMarketedGood = [store.context.campaign, store.context.secondGood]
		}

		store.context.justMarketed.push(store.context.campaign)
		if (store.context.campaign >= 17 && store.context.campaign <= 27) index = -1

		const histObj = [store.context.campaign]
		if (store.context.campaign >= 25 && store.context.campaign <= 27) histObj.push([...funcs.exportIndexes(store.context.path)])
		else histObj.push(funcs.exportIndex(index))
		if (store.context.secondGood > -1) histObj.push([store.context.secondGood, store.context.good])
		else histObj.push(store.context.good)
		if (store.context.campaign >= 4 && store.context.campaign <= 16) histObj.push(store.context.marketer)
		if (rf.ROTATABLE_CAMPAIGNS.includes(store.context.campaign)) histObj.push(funcs.booleanToInt(store.context.rotated))
		if (store.context.duration < 9) histObj.push(store.context.duration)

		model.addHistory(rf.HIST_START_MARKETING_CAMPAIGN, [...histObj], playerIndex, 0)

		model.addMarketingCampaign(store.context.campaign, index, store.context.rotated, store.context.good, store.context.duration)
		rules.giveMarketingMilestones(playerIndex, store.context.marketer)

		// SECOND CAMPAIGN MANAGER MILESTONE - add another campaign of the same type
		if (plyr.hasMilestone(playerIndex, rf.FIRST_CAMPAIGN_MANAGER_USED) && !store.context.alreadyDoneMailboxMS && !store.context.secondCampaignManager && store.availableMilestones.indexOf(rf.FIRST_CAMPAIGN_MANAGER_USED) > -1) {
			store.context.secondCampaignManager = true
			store.context.alreadyDoneMailboxMS = true
			scmChain = true
			playSecondCampaignManager()
		}
		// NIGHT SHIFT MANAGER - the trainee markets a second time
		else if (!store.context.nightShift && playerObj.employees.includes(rf.NIGHT_SHIFT_MANAGER) && store.context.nightShiftCampaign === false && store.context.marketer == rf.MARKETING_TRAINEE) {
			store.context.firstCampaignDuration = store.context.duration
			store.context.firstCampaignCampaign = store.context.campaign
			awardCampaignTypeAndGoodMilestones(playerIndex)
			playNightShiftCampaign()
			return
		} else {
			store.context.secondCampaignManager = false
		}
	}

	// Award the campaign-type / marketed-good milestones while context still holds this campaign
	awardCampaignTypeAndGoodMilestones(playerIndex)

	// RURAL MARKETEER - award milestone and trigger freeway placement
	if (store.context.campaign >= 21 && store.context.campaign <= 24) {
		if (!plyr.hasMilestone(playerIndex, rf.FIRST_RURAL_MARKETEER_USED) && store.availableMilestones.indexOf(rf.FIRST_RURAL_MARKETEER_USED) > -1) {
			plyr.awardMilestone(playerIndex, rf.FIRST_RURAL_MARKETEER_USED)
			selectFreewayDirection()
			return
		}
	}

	// Return to the marketer choice screen unless the Second Campaign Manager chain took over
	if (!scmChain) resetMarketingSelection()
}

// --- HAWKER TRUCK ROUTE SELECTION ---

// The hawker route reuses the cart-operator path-drawing flow with range 2.
// The route is stored in history when the campaign is placed (placeMarketingCampaign).

export function startHawkerRouteSelection() {
	const store = useModelStore()

	// If range is 0 and path exists, clicking "Set Hawker Route" stops the route
	if (store.context.range === 0 && store.context.path.length > 0) {
		stopHawkerTruck()
		return
	}

	store.context.path.splice(0)
	store.context.from = -1
	store.context.range = 2
	store.context.collectionNumber = 0
	store.context.hawkerRouteActive = true

	context.clearAllHighlights()
	store.highlights.indexesToHighlightYellow = rules.givePossibleStartsFromRestaurants()
}

// Called from MapHighlight when clicking a highlighted square during hawker route selection
export function selectHawkerRoutePosition(index) {
	const store = useModelStore()
	clearDrivingPreview()

	if (store.context.from > -1) {
		if (!map.onTheSameTile(index, store.context.from)) {
			store.context.range--
		}
	} else {
		if (!rules.firstStartIsFromTheSameTile(index)) {
			store.context.range--
		}
	}

	let nextRoad = rules.nextRoadPossibilities(index, store.context.from, store.context.range)

	if (nextRoad.from !== -1) {
		store.context.from = nextRoad.from
	} else {
		store.context.from = index
	}
	store.context.range = nextRoad.range

	store.context.path = store.context.path.concat(nextRoad.path)
	store.highlights.indexesToHighlightPath = [...store.context.path]
	store.highlights.indexesToHighlightHouses = rules.giveHousesAlongHawkerPath(store.context.path)

	if (nextRoad.target.length > 0) {
		store.highlights.indexesToHighlightYellow = nextRoad.target
	} else {
		stopHawkerTruck()
	}
}

// Hover a yellow square during hawker route drawing: preview the next section of route
export function setHawkerRoutePreview(index) {
	const store = useModelStore()
	const nextRoad = rules.nextRoadPossibilities(index, store.context.from, store.context.range)
	store.highlights.indexesToHighlightPreview = nextRoad.path
	// Also preview houses that would be affected by the full path + preview
	const fullPath = [...store.context.path, ...nextRoad.path]
	store.highlights.indexesToHighlightHouses = rules.giveHousesAlongHawkerPath(fullPath)
}

// Finalize the route: show it as a green highlight, enable "Add Hawker Truck"
export function stopHawkerTruck() {
	const store = useModelStore()
	context.clearAllHighlights()

	store.context.path = [...new Set(store.context.path)]
	store.highlights.indexesToHighlightPath = [...store.context.path]
	store.context.hawkerRouteActive = false
}

// Place the hawker truck campaign (calls placeMarketingCampaign with the route path)
export function addHawkerTruck() {
	const store = useModelStore()
	// placeMarketingCampaign handles history, milestones, and reset
	placeMarketingCampaign(0)
	// Clean up hawker state
	store.context.path.splice(0)
	store.context.from = -1
	store.context.range = 0
	store.context.hawkerRouteActive = false
}

// After placing a Rural Marketeer campaign, enter freeway placement flow
export function selectFreewayDirection() {
	const store = useModelStore()
	store.context.action = rf.ACT_PLACE_FREEWAY
	store.context.rotation = 0

	if (store.freeways.length < 3) {
		// Eagerly compute both rotations so rotation toggle is instant
		ensureFreewaySet(0)
		ensureFreewaySet(1)
		applyFreewayHighlightsForCurrentRotation()
	} else {
		resetMarketingSelection()
	}
}

// Rotate the freeway during placement

// Compute freeway highlights for ONE orientation lazily and cache it. Initiation
// only needs the current rotation (cheap - 2 givePossibilitiesForFreeway calls),
// matching the "quick" behavior. The other orientation is computed on first
// rotation and then reused, so rotation stays smooth without a heavy upfront block.
function computeFreewaySet(rotated) {
	const sidesFalse = rules.givePossibilitiesForFreeway(rotated, false)
	const sidesTrue = rules.givePossibilitiesForFreeway(rotated, true)
	return {
		sidesFalse,
		sidesTrue,
		merged: [...new Set([...sidesFalse, ...sidesTrue])],
	}
}

function ensureFreewaySet(rot) {
	const store = useModelStore()
	if (!store.context.freewayHighlightSets) store.context.freewayHighlightSets = [null, null]
	if (!store.context.freewayHighlightSets[rot]) {
		store.context.freewayHighlightSets[rot] = computeFreewaySet(rot === 1)
	}
}

export function refreshFreewayHighlights() {
	const store = useModelStore()
	ensureFreewaySet(store.context.rotation === 1 ? 1 : 0)
	applyFreewayHighlightsForCurrentRotation()
}

// Cheap: pick the cached set for the current rotation, computing it on first use.
export function applyFreewayHighlightsForCurrentRotation() {
	const store = useModelStore()
	const rot = store.context.rotation === 1 ? 1 : 0
	ensureFreewaySet(rot)
	const set = store.context.freewayHighlightSets[rot]
	store.context.freewaySidesFalse = set.sidesFalse
	store.context.freewaySidesTrue = set.sidesTrue
	store.highlights.indexesToHighlightYellow = set.merged
}

// Place a freeway on the map after clicking a highlighted square
export function placeFreeway(index) {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()
	// Determine sides from which set the index belongs to
	const sides = store.context.freewaySidesTrue.includes(index)

	// Move index back onto the board tile
	let adjustedIndex = index
	if (sides) {
		if (adjustedIndex % 5 == 0) adjustedIndex--
		else if ((adjustedIndex + 1) % 5 == 0) adjustedIndex++
	} else {
		const rowSize = store.mapData.dimensions[0] * 5 * 5
		const topRowSize = store.mapData.dimensions[0] * 5
		if (adjustedIndex % rowSize < topRowSize) adjustedIndex -= topRowSize
		else adjustedIndex += topRowSize
	}

	model.addFreeway(adjustedIndex, store.context.rotation === 1, sides)
	model.addHistory(rf.HIST_ADD_FREEWAY, [funcs.exportIndex(adjustedIndex), funcs.booleanToInt(store.context.rotation === 1), funcs.booleanToInt(sides)], playerIndex, 0)
	context.clearAllHighlights()
	store.context.action = rf.ACT_NONE
	store.context.freewaySidesFalse = []
	store.context.freewaySidesTrue = []
	resetMarketingSelection()
}

/*****************************************************************
 *
 * END PLAYER TURN
 *
 *
 *****************************************************************/

// Bin a single resource from the current player into the bin (cleanup phase).
export function binResource(resource) {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()

	plyr.removeResourcesFromPlayer(playerIndex, resource, 1)
	store.context.justBinned.push(resource)

	if (!plyr.hasFridge(playerIndex)) {
		plyr.awardMilestone(playerIndex, rf.FIRST_THROW_AWAY)
	}
}

// Restore a single binned resource back into the player's fridge (cleanup phase).
export function unbinResource(resource) {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()

	const idx = store.context.justBinned.lastIndexOf(resource)
	if (idx === -1) return
	store.context.justBinned.splice(idx, 1)
	plyr.addResources(playerIndex, resource, 1)
}

// Choose to store Kimchi OR the rest when both are present (kimchi collision).
export function chooseFridgeType(choice) {
	const store = useModelStore()
	const playerIndex = currentPlayerIndex()
	const playerObj = store.players[playerIndex]

	const numKimchi = playerObj.resources.filter((r) => r === rf.KIMCHI).length
	const rest = playerObj.resources.filter((r) => r !== rf.KIMCHI)

	if (choice === "kimchi") {
		store.context.justBinned.push(...rest)
		const keep = Math.min(numKimchi, 10)
		playerObj.resources = new Array(keep).fill(rf.KIMCHI)
	} else {
		store.context.justBinned.push(...new Array(numKimchi).fill(rf.KIMCHI))
		playerObj.resources = [...rest]
	}

	if (!plyr.hasFridge(playerIndex)) {
		plyr.awardMilestone(playerIndex, rf.FIRST_THROW_AWAY)
	}
}

export async function endPlayerTurn(forced, isPointlessMove = false) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.clearCoffeeHistoryInfo()
	context.resetContextAndHighlights()
	const playerObj = currentPlayerObj()
	const playerIndex = currentPlayerIndex()

	// Check for last man standing game over here
	let numNonPlayers = 0
	for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) numNonPlayers++
	if (numNonPlayers === store.players.length - 1) {
		model.endGame()
		return
	}

	// EXIT EARLY FOR CHOOSING RESERVE OUT OF PHASE (not used in training games)
	if (!personal.trainingGame && (store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT1 || store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT2) && model.alreadyChosenReserveCard() && store.players[personal.pov].restaurants.length > 0) {
		let moveData = [store.reserveCards[personal.pov]]
		personal.moveDataRaw = funcs.compressObjectToDB([personal.name, [0, 1, 2], Math.round(new Date().getTime() / 1000), [...moveData]])
		IO.saveSimulMove(moveData)
		return
	}

	if (store.gameflow.phase === rf.PHASE_SETUP_RESERVE) {
		if (personal.trainingGame && store.context.chosenResCard !== -1) {
			model.addHistory(rf.HIST_CHOOSE_RESERVE_CARD, [store.context.chosenResCard], currentPlayerIndex(), 0)
			store.context.chosenResCard = -1
		}
	} else if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) {
		if (playerObj.employees.length == 0 && !forced && playerObj.beach.length > 0 /*&& !isAIplayer*/) {
			return
		} else if (playerObj.beach.length > 0 && !forced) {
			// Warning shows if there's a beach employee that can actually be placed:
			// - Free CEO slot + any beach employee (managers and non-managers can fill CEO slots)
			// - Free normal slot + non-manager on beach (only non-managers can fill normal slots)
			const hasFreeCEOslot = playerObj.employees.slice(0, playerObj.ceoSlots).includes(rf.BLANK_EMPLOYEE_SPACE)
			const hasFreeNormalSlot = playerObj.employees.slice(playerObj.ceoSlots).includes(rf.BLANK_EMPLOYEE_SPACE)
			const hasNonManagerOnBeach = playerObj.beach.some(emp => !rf.MANAGERS.includes(emp))
			if ((hasFreeCEOslot && playerObj.beach.length > 0) || (hasFreeNormalSlot && hasNonManagerOnBeach)) {
				store.context.action = rf.ACT_CONFIRM_NO_MORE_EMPLOYEES
				return
			}
		} else if (personal.trainingGame) {
			currentPlayerObj().employees = currentPlayerObj().employees.filter((emp) => emp !== rf.BLANK_EMPLOYEE_SPACE)
			model.addHistory(rf.HIST_CHOOSE_STRUCTURE, [[...currentPlayerObj().employees], [...currentPlayerObj().beach]], currentPlayerIndex(), 0)
			if (currentPlayerObj().employees.indexOf(rf.DISCOUNT_MANAGER) > -1) {
				plyr.awardMilestone(currentPlayerIndex(), rf.FIRST_DISCOUNT_MANAGER_USED)
			}
			rules.enforceDiscountMilestone(currentPlayerIndex())
		}

		// Always do this
		currentPlayerObj().employees = currentPlayerObj().employees.filter((emp) => emp !== rf.BLANK_EMPLOYEE_SPACE)
	} else if (store.gameflow.phase === rf.PHASE_WORKING_DAY) {
		store.gameflow.subphase = rf.SUBPHASE_HIRING
		// Set autoFridge from expert panel cleanup skip flag for isRequiredToPlayCleanUp
		const cleanupFlag = parseInt(store.context.preMoveData[1][0])
		currentPlayerObj().autoFridge = cleanupFlag === -1 ? 1 : 0
	} else if (store.gameflow.phase === rf.PHASE_CHOOSE_CEO_BONUS) {
		model.addHistory(rf.HIST_CEO_BONUS_CHOSEN, [currentPlayerObj().ceoAction], currentPlayerIndex(), 0)
	} else if (store.gameflow.phase === rf.PHASE_PAYDAY) {
		if (store.startingOptions.strictPaydayFridge) {
			let histo = []
			let paidItems = 0
			let due = rules.salary(playerIndex)
			if (due >= 20) plyr.awardMilestone(playerIndex, rf.FIRST_20_SALARIES)
			if (plyr.hasMilestone(playerIndex, rf.FIRST_BEER_SOLD) && store.context.preMoveData[0][1].length > 0) {
				let unitarySalary = plyr.hasMilestone(playerIndex, rf.FIRST_WAITRESS_USED) ? 3 : 5
				paidItems = store.context.preMoveData[0][1].length
				store.context.preMoveData[0][1].splice(0)
				due -= unitarySalary * paidItems
				due = Math.max(due, 0)
			}
			if (due > playerObj.money && plyr.hasMilestone(playerIndex, rf.FIRST_TRAINER_USED)) {
				store.bank += playerObj.money
				playerObj.money = 0
				if (plyr.hasMilestone(playerIndex, rf.FIRST_BEER_SOLD)) playerObj.resources = []
			} else {
				playerObj.money -= due
				store.bank += due
			}

			if (paidItems > 0) {
				histo.push(due, paidItems)
			} else {
				histo.push(due)
			}

			model.addHistory(rf.HIST_FIRE, [...store.context.justFired], currentPlayerIndex(), 0)
			// re add firees to the reserve
			store.context.justFired.forEach((returnee) => {
				store.availableEmployees[returnee]++
			})
			store.context.justFired.splice(0)
			model.addHistory(rf.HIST_SALARY_STRICT, [...histo], currentPlayerIndex(), 0)
		}
	} else if (store.gameflow.phase === rf.PHASE_CLEAN_UP) {
		if (store.startingOptions.strictPaydayFridge) model.addHistory(rf.HIST_FRIDGE_RESOURCES, [...currentPlayerObj().resources], currentPlayerIndex(), 0)
	}

	// END NON SIMUL TURN
	if (!isSimulPhase(store.gameflow.phase)) {
		// Remove player from the turn order
		store.gameflow.turnOrder.shift()

		// If not a simul phase, check to see if you can skip the next player
		actionAllPlayerSkips()
		// Check for all turns complete
		if (store.gameflow.turnOrder.length === 0 || (store.gameflow.phase === rf.PHASE_TURN_ORDER && store.gameflow.turnOrder.length === 1)) {
			// POSSIBLE NEEDED TEMP FIX
			// Maybe copy fullTurnOrder in here so that vue updates don't break on zero TO length?
			store.gameflow.turnOrder.splice(0)
			endCurrentPhase()
			// Game over is saved on game end
			//if (store.gameflow.phase === rf.PHASE_GAME_OVER) return
		}

		// You always want to save a rewind, even at the END of a pointless move
		// But if it is pointless, you want to delete the PREVIOUS rewind point
		await IO.saveGameNormal(true, false, isPointlessMove)
		// In case it is your turn again right away, run startPlayerTurn
		// If it isn't then you get returned from that function anyway
		if (rf.SUPER_USERS.includes(personal.name)) personal.pov = -1
		startPlayerTurn(false)

		// After save, check if next players can be skipped (e.g. PAYDAY auto-skip)
		const turnOrderBefore = store.gameflow.turnOrder.length
		actionAllPlayerSkips()
		if (store.gameflow.turnOrder.length < turnOrderBefore && store.gameflow.turnOrder.length > 0) {
			await endPlayerTurn(true, true)
		}
		// Make sure this function is exited now
		return
	}
	// END SIMUL TURN - assume bots are filtered out at the start of the phase
	else {
		// Remove from turn order
		store.gameflow.turnOrder = store.gameflow.turnOrder.filter((playerIndex) => playerIndex !== personal.pov)
		// NEED TO REBUILD THE TO ARRAY NOW, OTHERWISE VUE GFX THAT REALLY ON (eg turnOder[0]) WILL CAUSE ERRORS
		// The turn order should be set/reset again after processing the end of the simul turn
		//if (store.gameflow.turnOrder.length === 0) store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		let moveData = []
		if (store.gameflow.phase === rf.PHASE_SETUP_RESERVE) moveData.push(store.reserveCards[personal.pov])
		else if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) {
			for (let i = playerObj.employees.length - 1; i >= 0; i--) {
				if (playerObj.employees[i] === rf.BLANK_EMPLOYEE_SPACE) playerObj.employees.splice(i, 1)
			}
			moveData.push([...playerObj.beach])
			moveData.push([...playerObj.employees])
			moveData.push(parseInt(playerObj.OOBpreference)) // DNE
	} else if (store.gameflow.phase === rf.PHASE_PAYDAY) {
		let paidInFood = [...store.context.preMoveData[0][1]]
		let paydayMoveData = [[...store.context.justFired], [...paidInFood]]
		//if (paydayMoveData[0].length === 0) paydayMoveData[0] = [[-8], []]
		if (paydayMoveData[0].length === 0) paydayMoveData[0] = [-8]
		// NOW NEED TO ADD ANY CLEANUP ON THE END
		if (store.context.preMoveData[1].length === 0) store.context.preMoveData[1] = [-9]
		moveData = [[...paydayMoveData], [...store.context.preMoveData[1]]]
		//moveData = [[...moveData], [...store.context.preMoveData[1]]]
		store.context.preMoveData = [...moveData]
		} else if (store.gameflow.phase === rf.PHASE_CLEAN_UP) {
			let cleanupMoveData = [...store.context.justBinned]
			if (cleanupMoveData.length === 0) cleanupMoveData = [-8]
			moveData = [[[-9], []], [...cleanupMoveData]]
			store.context.preMoveData = [...moveData]
		}
		// End of turn, NOT T-G
		let phasesArr = [-1]
		if (store.gameflow.phase < rf.PHASE_RESTRUCTURING) phasesArr = [0, 1, 2]
		else if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) phasesArr = [3, 4]
		else if ([5, 6, 7, 8, 9, 11, 12, 15].includes(store.gameflow.phase)) phasesArr = [5, 6, 7, 8, 9, 11, 12, 15]

		personal.moveDataRaw = funcs.compressObjectToDB([personal.name, [...phasesArr], Math.round(new Date().getTime() / 1000), [...moveData]])
		await IO.saveSimulMove(moveData)
		if (rf.SUPER_USERS.includes(personal.name)) personal.pov = -1
		// Make sure this function is exited now
		startPlayerTurn(false)
		return
	}
}

// This just skips all possible players - NO PHASE CHANIGNG
export function actionAllPlayerSkips() {
	const store = useModelStore()
	// TO skips todo?

	if (!isSimulPhase(store.gameflow.phase)) {
		while (store.gameflow.turnOrder.length > 0 && canSkipCurrentPlayer(store.gameflow.turnOrder[0])) {
			store.gameflow.turnOrder.shift()
		}
	}
	// Simul Skips
	else if (isSimulPhase(store.gameflow.phase)) {
		for (let i = store.gameflow.turnOrder.length - 1; i >= 0; i--) {
			if (canSkipCurrentPlayer(store.gameflow.turnOrder[i])) {
				store.gameflow.turnOrder.splice(i, 1)
			}
		}
	}
}

// Checks a playerIndex for any moves. NO pizza bomb skips, as only relevant players get into turn order
export function canSkipCurrentPlayer(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	if (playerObj.displayName === rf.BOT_NAME || playerObj.bankrupt) return true

	if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) {
		if (playerObj.beach.length === 0) return true
		return false
	}

	if (store.gameflow.phase === rf.PHASE_TURN_ORDER) {
		// NB you CANNOT skip anyone (expcet the last) for PHASE_TURN_ORDER (except pre sets)

		if (playerObj.OOBpreference == 1 || playerObj.OOBpreference == 2) {
			if (store.gameflow.turnOrder.length !== 1) autoProcessTurnOrder()
			return true
		}
		return false
	} else if (store.gameflow.phase === rf.PHASE_PIZZA_BOMB) {
		if (store.firstPizzas.length < 3) return true
		return false
	} else if (store.gameflow.phase === rf.PHASE_CHOOSE_CEO_BONUS) {
		if (!plyr.hasMilestone(playerIndex, rf.FIRST_DUMPLING_SOLD)) return true
		if (playerObj.ceoAction !== rf.CEO_ACTION_HIRE_1) return true
		return false
	} else if (store.gameflow.phase === rf.PHASE_PAYDAY) {
		// Skip no salary and turn <=2 only
		if (rules.salary(playerIndex) === 0 && store.gameflow.turn <= 2) return true
		if (store.gameflow.turn === 1 && !plyr.hasEmployee(playerIndex, rf.LOBBYIST) && !plyr.hasEmployee(playerIndex, rf.NIGHT_SHIFT_MANAGER) && !plyr.hasEmployee(playerIndex, rf.KIMCHI_MASTER)) return true
		// Auto-skip: zero salary and no fireable employees
		if (rules.salary(playerIndex) === 0 && rules.fireableEmployees(playerIndex).length === 0) return true
		return false
	} else if (store.gameflow.phase === rf.PHASE_CLEAN_UP) {
		if (!rules.isRequiredToPlayCleanUp(playerIndex)) {
			rules.autoProcessCleanUp(playerIndex)
			return true
		}
	}
	return false
}

/*****************************************************************
 *
 * END CURRENT PHASE
 *
 *
 *****************************************************************/

export async function endCurrentPhase() {
	const store = useModelStore()
	store.clearCoffeeHistoryInfo()
	const phase = store.gameflow.phase

	// --- PHASE: SETUP RESTAURANT 1 ---
	if (store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT1) {
		const readyPlayers = store.players.filter((p) => p.restaurants.length > 0 || p.displayName === rf.BOT_NAME)
		console.log(`readyPlayers: ${readyPlayers.length}`)
		if (readyPlayers.length === store.players.length) {
			if (store.startingOptions.shortGame) {
				if (store.gameflow.turn === 0) {
					store.gameflow.turn = 1
					model.clearForNewTurn()
				}
				store.gameflow.phase = rf.PHASE_TURN_ORDER
				store.gameflow.newTurnOrder.length = 0
				store.gameflow.fullTurnOrder.reverse()
				store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
				store.players.forEach(() => store.gameflow.newTurnOrder.push(-1))
			} else {
				store.gameflow.phase = rf.PHASE_SETUP_RESERVE
				const fto = store.players.map((_, i) => i).reverse()
				store.gameflow.fullTurnOrder = [...fto]
				store.gameflow.turnOrder = [...fto]
			}
			return
		} else {
			store.gameflow.fullTurnOrder.reverse()
			store.gameflow.turnOrder.length = 0
			store.gameflow.fullTurnOrder.forEach((idx) => {
				if (store.players[idx].restaurants.length === 0 && store.players[idx].displayName !== rf.BOT_NAME) {
					store.gameflow.turnOrder.push(idx)
				}
			})
			return
		}
	}

	// --- PHASE: SETUP RESERVE ---
	else if (store.gameflow.phase === rf.PHASE_SETUP_RESERVE) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		store.gameflow.phase = rf.PHASE_TURN_ORDER
		if (store.gameflow.turn === 0) {
			store.gameflow.turn = 1
			const currentMonies = store.players.map((p) => p.money)
			model.addHistory(rf.HIST_NEW_TURN, [store.gameflow.turn, store.bank, currentMonies], -1, 0)
		}
		store.gameflow.newTurnOrder.length = 0
		store.players.forEach(() => store.gameflow.newTurnOrder.push(-1))

		Bot.removeBotPlayers()
		let replacingIdx = 0
		store.players.forEach((p, i) => {
			if (p.displayName === rf.BOT_NAME) {
				store.gameflow.newTurnOrder[replacingIdx++] = i
			}
		})
	}

	// --- PHASE: RESTRUCTURING ---
	else if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) {
		store.players.forEach((player) => {
			player.employees = player.employees.filter((e) => e !== rf.BLANK_EMPLOYEE_SPACE)
		})

		store.gameflow.fullTurnOrder = rules.giveTurnOrderFromFreeSlots()
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		Bot.removeBotPlayers()

		store.gameflow.phase = rf.PHASE_TURN_ORDER
		store.gameflow.newTurnOrder.length = 0
		store.players.forEach(() => store.gameflow.newTurnOrder.push(-1))

		let replacingIdx = 0
		store.players.forEach((p, i) => {
			if (p.displayName === rf.BOT_NAME) {
				store.gameflow.newTurnOrder[replacingIdx++] = i
			}
		})

		// Optimized Milestone Awarding
		store.players.forEach((player, i) => {
			const emp = player.employees
			if (emp.includes(rf.WAITRESS)) plyr.awardMilestone(i, rf.FIRST_WAITRESS)
			if (emp.includes(rf.PRICING_MANAGER) || emp.includes(rf.DISCOUNT_MANAGER)) plyr.awardMilestone(i, rf.FIRST_LOWER_PRICES)
			if (emp.includes(rf.ERRAND_BOY)) plyr.awardMilestone(i, rf.FIRST_ERRAND_BOY)
			if (emp.includes(rf.CART_OPERATOR)) plyr.awardMilestone(i, rf.FIRST_CART_OPERATOR)
		})

	}

	// --- PHASE: TURN ORDER ---
	else if (store.gameflow.phase === rf.PHASE_TURN_ORDER) {
		store.players.forEach((_, i) => {
			if (!store.gameflow.newTurnOrder.includes(i)) {
				const emptyIdx = store.gameflow.newTurnOrder.indexOf(-1)
				if (emptyIdx !== -1) store.gameflow.newTurnOrder[emptyIdx] = i
			}
		})
		store.gameflow.fullTurnOrder = [...store.gameflow.newTurnOrder]
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		store.gameflow.newTurnOrder.splice(0)
		store.gameflow.phase = rf.PHASE_WORKING_DAY
	}

	// --- PHASE: WORKING DAY ---
	else if (store.gameflow.phase === rf.PHASE_WORKING_DAY) {
		store.players.forEach((p) => (p.OOBpreference = 0))

		rules.doDinnerTime()

		if (store.gameflow.phase === rf.PHASE_GAME_OVER) return

		store.gameflow.phase = rf.PHASE_PIZZA_BOMB
		if (store.firstPizzas.length > 0) {
			store.gameflow.turnOrder.length = 0
			for (let i = 2; i < store.firstPizzas.length; i += 3) {
				store.gameflow.turnOrder.push(store.firstPizzas[i])
			}
		}
	}

	// --- PHASE: PIZZA BOMB ---
	else if (store.gameflow.phase === rf.PHASE_PIZZA_BOMB) {
		store.gameflow.phase = rf.PHASE_CHOOSE_CEO_BONUS
		const needed = store.players.reduce((acc, _p, i) => {
			if (plyr.hasMilestone(i, rf.FIRST_DUMPLING_SOLD)) acc.push(i)
			return acc
		}, [])
		if (needed.length > 0) {
			store.gameflow.turnOrder = store.gameflow.fullTurnOrder.filter((idx) => needed.includes(idx))
		}
	}

	// --- PHASE: CEO BONUS / PAYDAY ---
	else if (store.gameflow.phase === rf.PHASE_CHOOSE_CEO_BONUS || phase === rf.PHASE_PAYDAY) {
		const wasCEO = phase === rf.PHASE_CHOOSE_CEO_BONUS

		if (!wasCEO || store.startingOptions.shortGame) {
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
			rules.doMarketingCampaigns()

			store.players.forEach((player, playerIndex) => {
				if (!plyr.hasFridge(playerIndex)) {
					funcs.removeItemAll(player.resources, rf.COFFEE)
					if (player.resources.length > 0) {
						plyr.awardMilestone(playerIndex, rf.FIRST_THROW_AWAY)
					}
					player.resources.length = 0
				}
			})

			if (store.startingOptions.coffee && store.coffeeShopMSplayers.length > 0) {
				store.gameflow.phase = rf.PHASE_COFFE_SHOP_MS
				store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => store.coffeeShopMSplayers.includes(idx))
			} else {
				store.gameflow.phase = rf.PHASE_CLEAN_UP
			}
		} else {
			store.gameflow.phase = rf.PHASE_PAYDAY
			store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		}
	}

	// --- PHASE: COFFEE SHOP MS ---
	else if (store.gameflow.phase === rf.PHASE_COFFE_SHOP_MS) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		store.gameflow.phase = rf.PHASE_CLEAN_UP
	}

	// --- PHASE: CLEAN UP ---
	else if (store.gameflow.phase === rf.PHASE_CLEAN_UP) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		const kimchiIdxs = store.players.reduce((acc, p, i) => {
			if (p.employees.includes(rf.KIMCHI_MASTER)) acc.push(i)
			return acc
		}, [])

		model.clearForNewTurn()

		kimchiIdxs.forEach((idx) => {
			plyr.addResources(idx, rf.KIMCHI, 1)
			model.addHistory(rf.HIST_PRODUCE_KIMCHI, [], idx, 0)
		})

		store.gameflow.phase = rf.PHASE_RESTRUCTURING
		store.gameflow.turn++
		const currentMonies = store.players.map((p) => p.money)
		model.addHistory(rf.HIST_NEW_TURN, [store.gameflow.turn, store.bank, currentMonies], -1, 0)
	}

	context.resetContext()

	// Skip auto-processing when transitioning out of restructuring;
	// let saveGameNormal's response handler drive the OOB/turn-order
	// flow so that intermediate rewind states are created properly.
	if (phase !== rf.PHASE_RESTRUCTURING) {
		actionAllPlayerSkips()

		// Check for auto-advance
		if (store.gameflow.turnOrder.length === 0 || (store.gameflow.turnOrder.length === 1 && store.gameflow.phase === rf.PHASE_TURN_ORDER)) {
			await endCurrentPhase()
			return
		}
	}

	store.subphaseResetData = funcs.simpleExportWholeFCMmodel()
}

export function autoProcessTurnOrder() {
	const store = useModelStore()

	// DOES NOT EXIST ON PLAYER OBJ DNE
	if (currentPlayerObj().OOBpreference !== 1 && currentPlayerObj().OOBpreference !== 2) return
	// gameflow.newTurnOrder is set to -1's during phase start
	let pos = -1
	for (let i = 0; i < store.gameflow.newTurnOrder.length; i++) {
		if (store.gameflow.newTurnOrder[i] === -1) {
			if (currentPlayerObj().OOBpreference == 1 && pos === -1) pos = i
			if (currentPlayerObj().OOBpreference == 2) pos = i
		}
	}
	store.gameflow.newTurnOrder[pos] = currentPlayerIndex()
	if (currentPlayerObj().OOBpreference == 1) model.addHistory(rf.HIST_CHOOSE_TURN_ORDER_AUTO_EARLY, [pos], currentPlayerIndex(), 0)
	else model.addHistory(rf.HIST_CHOOSE_TURN_ORDER_AUTO_LATE, [pos], currentPlayerIndex(), 0)

	const unchosenPlayersCount = store.gameflow.newTurnOrder.reduce((acc, num) => {
		return num === -1 ? acc + 1 : acc
	}, 0)

	if (unchosenPlayersCount === 1) {
		let allPlayerIndexes = []
		for (let i = 0; i < store.players.length; i++) allPlayerIndexes.push(i)
		for (let i = 0; i < allPlayerIndexes.length; i++) {
			if (!store.gameflow.newTurnOrder.includes(allPlayerIndexes[i])) {
				for (let j = 0; j < store.gameflow.newTurnOrder.length; j++) {
					if (store.gameflow.newTurnOrder[j] === -1) {
						store.gameflow.newTurnOrder[j] = allPlayerIndexes[i]
						model.addHistory(rf.HIST_CHOOSE_TURN_ORDER_FORCED, [j], allPlayerIndexes[i], 0)
						break
					}
				}
			}
		}
		// End T-O phase if only 1 player left
	}
}

export function startPlayerTurn(startingMidPhase) {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (store.gameflow.phase === rf.PHASE_GAME_OVER) return

	if (!personal.canPlay()) {
		return
	}
	if (store.gameflow.phase === rf.PHASE_URBAN_PLANNING) {
		if (store.startingOptions.urbanPlanningPlus) {
			let minus2idx = store.mapData.tiles.indexOf(-2)
			if (minus2idx !== -1) {
				if (store.mapData.tiles[minus2idx] === -2) {
					let allTiles = rules.availableUrbanPlanningTiles()
					store.context.nextUrbanPlanningTile = allTiles[0]
					store.mapData.tiles[minus2idx] = allTiles[0]
					store.mapData.tiles[minus2idx + 1] = -1
				} else {
					store.context.nextUrbanPlanningTile = store.mapData.tiles[minus2idx]
				}
			}
		} else if (store.startingOptions.urbanPlanning) {
			let minus2idx = store.mapData.tiles.indexOf(-2)
			if (minus2idx !== -1 && minus2idx > 0) {
				store.context.nextUrbanPlanningTile = store.mapData.tiles[minus2idx - 1]
				store.mapData.tiles[minus2idx] = -1
			}
		}
		store.context.rotation = 0
		view.setMapDisplayTiles()
	} else if (store.gameflow.phase === rf.PHASE_SETUP_MODULES) {
		store.context.selectedModuleIndex = 0
	} else if (store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT1) {
		// Use the current player (not personal.pov) so hotseat training games
		// highlight correctly when another seat is placing
		if (currentPlayerObj().restaurants.length === 0) {
			store.highlights.indexesToHighlightYellow = rules.givePossibleStartingRestaurantsPosition(store.context.rotation)
		}

	} else if (store.gameflow.phase === rf.PHASE_SETUP_RESTAURANT2) {
		if (currentPlayerObj().restaurants.length === 0) {
			store.highlights.indexesToHighlightYellow = rules.givePossibleStartingRestaurantsPosition(store.context.rotation)
		}
	} else if (store.gameflow.phase === rf.PHASE_SETUP_RESERVE) {
		//
	} else if (store.gameflow.phase === rf.PHASE_RESTRUCTURING) {
		rf.sortEmployees(currentPlayerObj().beach)

		if (currentPlayerObj().employees.length < currentPlayerObj().ceoSlots) {
			while (currentPlayerObj().employees.length < currentPlayerObj().ceoSlots) {
				currentPlayerObj().employees.push(rf.BLANK_EMPLOYEE_SPACE)
			}
		}
	} else if (store.gameflow.phase === rf.PHASE_TURN_ORDER) {
		// No action needed
	} else if (store.gameflow.phase === rf.PHASE_WORKING_DAY) {
		// Save the current player's EOD preset before resetting for next player;
		// clear it when there is no live preset so a previous turn cannot leak in
		const pd = store.context.preMoveData
		if (pd[0].length > 0 && pd[0][0].length > 0 && pd[0][0][0] !== -9) {
			store.context.savedEODpreset = JSON.parse(JSON.stringify(pd))
		} else {
			store.context.savedEODpreset = null
		}
		// Make sure the pre move data is reset in the context
		store.context.preMoveData = [[[-9], []], [-9]]
		store.context.EODradioSelections = [0, 0]
		currentPlayerObj().autoFridge = 0
		personal.moveDataRaw = ""
		// Need to define subphases so the subphase reset works proper
		if (!startingMidPhase) {
			store.gameflow.subphase = rf.SUBPHASE_HIRING
			context.resetEndOfDaySummaryData()
		}
		startPlayerWorkingDaySubphase(store.gameflow.subphase)
	} else if (store.gameflow.phase === rf.PHASE_PIZZA_BOMB) {
		setupPizzaBombPhase()
	} else if (store.gameflow.phase === rf.PHASE_CHOOSE_CEO_BONUS) {
		//
	} else if (store.gameflow.phase === rf.PHASE_COFFE_SHOP_MS) {
		setupCoffeeShopMSPhase()
	} else if (store.gameflow.phase === rf.PHASE_PAYDAY) {
		store.context.justBinned.splice(0)
		store.context.justFired.splice(0)

		// AUTO FIRE MARKETERS - if you must fire marketers and don't have the trainer milestone, all salaried staff are fired automatically
		const idx = currentPlayerIndex()
		if (rules.needFiringMarketers(idx) && !plyr.hasMilestone(idx, rf.FIRST_TRAINER_USED)) {
			const playerObj = currentPlayerObj()
store.context.justFired.push(
				...playerObj.employees.filter((e) => rf.REQUIRE_SALARY.indexOf(e) > -1),
				...playerObj.beach.filter((e) => rf.REQUIRE_SALARY.indexOf(e) > -1)
			)			
			playerObj.employees = playerObj.employees.filter((e) => rf.REQUIRE_SALARY.indexOf(e) === -1)
			playerObj.beach = playerObj.beach.filter((e) => rf.REQUIRE_SALARY.indexOf(e) === -1)

			store.context.justFired.forEach((fired) => {
				store.availableEmployees[fired]++
			})

			// Compensating EVP hire if you have the recruiting girl milestone
			if (plyr.hasMilestone(idx, rf.FIRST_RECRUITING_GIRL_USED) && playerObj.employees.indexOf(rf.EXECUTIVE_VICE_PRESIDENT) === -1 && playerObj.beach.indexOf(rf.EXECUTIVE_VICE_PRESIDENT) === -1) {
				playerObj.beach.push(rf.EXECUTIVE_VICE_PRESIDENT)
				store.availableEmployees[rf.EXECUTIVE_VICE_PRESIDENT]--
			}
		}
	} else if (store.gameflow.phase === rf.PHASE_CLEAN_UP) {
		store.context.justBinned.splice(0)
	}

	if (!startingMidPhase) {
		store.context.justHired.splice(0)
		store.context.justCoffeeShopped.splice(0)
		store.context.justMarketed.splice(0)
		context.resetJustProduced()
		store.context.justBuilt.splice(0)
		store.context.justLobbied.splice(0)
		store.context.justOpened.splice(0)
	}

	if (!startingMidPhase) store.wholeTurnResetData = funcs.exportFCMmodel(false, false)
	store.subphaseResetData = funcs.simpleExportWholeFCMmodel()
}

// NEED THIS TO START THE GAME FROM MID-TURN RESET
export function startPlayerWorkingDaySubphase(subphase) {
	const store = useModelStore()
	const summary = store.context.endOfDaySummaryData
	const playerIndex = currentPlayerIndex()
	const playerObj = currentPlayerObj()

	// --- SUBPHASE: HIRING ---
	if (subphase === rf.SUBPHASE_HIRING) {
		store.context.justHired.length = 0

		// EOD summary
		summary.hire.total = rules.getRemainingRecruitingPoints(playerIndex)
		summary.hire.hired.length = 0

		summary.hire.salaryReductions = playerObj.employees.reduce((total, emp) => {
			if (emp === rf.RECRUITING_MANAGER) return total + 2
			if (emp === rf.HR_DIRECTOR) return total + 4
			return total
		}, 0)
		if (playerObj.ceoAction === rf.CEO_ACTION_RECRUITING_MANAGER) summary.hire.salaryReductions += 2

		store.wholeTurnResetData = funcs.simpleExportWholeFCMmodel()
	}

	// --- SUBPHASE: TRAINING ---
	else if (subphase === rf.SUBPHASE_TRAINING) {
		store.context.justTrained.length = 0
		summary.train.total = rules.getTrainingPoints(playerIndex, []).total
		summary.train.trained.length = 0
		//store.context.subPhaseTrainingData = rules.getTrainingPoints(playerIndex, store.context.justTrained)
	}

	// --- SUBPHASE: COFFEE SHOPS ---
	else if (subphase === rf.SUBPHASE_COFFEE_SHOPS_FROM_TRAIN) {
		if (model.shouldActionCoffeeShops()) {
			store.context.justCoffeeShopped.length = 0
			setupCoffeeShopsPhase()
		} else {
			setupMarketingPhase()
		}
		// Ensure reset happens even if phase skipped
		store.context.justCoffeeShopped.length = 0
	}

	// --- SUBPHASE: MARKETING ---
	else if (subphase === rf.SUBPHASE_MARKETING) {
		setupMarketingPhase()
	}

	// --- SUBPHASE: PRODUCE ---
	else if (subphase === rf.SUBPHASE_PRODUCE) {
		context.resetJustProduced()
		store.context.remainingProducers.length = 0
	}

	// --- SUBPHASE: HOUSES ---
	else if (subphase === rf.SUBPHASE_HOUSES) {
		store.context.justBuilt.length = 0
		setupHousesAndGardensPhase()
	}

	// --- SUBPHASE: LOBBYISTS ---
	else if (subphase === rf.SUBPHASE_LOBBYISTS) {
		// This needs to be here, otherwise you get infinite lobbies
		store.context.justLobbied.length = 0
		setupLobbyistsPhase()
	}

	// --- SUBPHASE: NEW RESTAURANTS ---
	else if (subphase === rf.SUBPHASE_NEW_RESTAURANTS) {
		store.context.justOpened.length = 0
	}

	// Final state compression
	store.subphaseResetData = funcs.simpleExportWholeFCMmodel()
	store.subphaseSnapshots[subphase] = store.subphaseResetData
}

export function resetWholeTurn() {
	const store = useModelStore()
	store.clearCoffeeHistoryInfo()
	context.resetJustProduced()
	//store.context.isNewRestoMSmailbox = false

	funcs.importFCMmodel(store.wholeTurnResetData)

	// importFCMmodel doesn't restore context - clear paid payday items
	store.context.preMoveData[0] = [[], []]

	context.clearAllHighlights()
	controller.startPlayerTurn(false)
}

/*****************************************************************
 *
 * SANDBOX MODE (starting option 103) - free beach hiring / firing
 *
 *****************************************************************/

// Add an employee to the current player's beach
export function sandboxHireEmployee(employee) {
	const store = useModelStore()
	currentPlayerObj().beach.push(employee)
	store.availableEmployees[employee]--
}

// Remove an employee from the current player
export function sandboxFireEmployee(employee) {
	const store = useModelStore()
	const playerObj = currentPlayerObj()

	const beachIdx = playerObj.beach.indexOf(employee)
	if (beachIdx !== -1) playerObj.beach.splice(beachIdx, 1)
	else {
		const empIdx = playerObj.employees.indexOf(employee)
		if (empIdx !== -1) playerObj.employees.splice(empIdx, 1)
	}
	store.availableEmployees[employee]++
}

// Reset just the lobbyist subphase: restore the board to the state before any
// lobbying, then set up lobbyists again. 
// (cannot use resetSubphase, which advances past this subphase).
export function resetLobbying() {
	const store = useModelStore()
	funcs.simpleImportWholeFCMmodel(store.subphaseResetData)

	store.gameflow.subphase = rf.SUBPHASE_LOBBYISTS
	store.context.justLobbied.length = 0
	store.context.lobbyistMilestoneActive = false
	store.context.newLobbyistTile = -1
	store.context.rotation = 0
	store.context.flipped = false
	context.clearAllHighlights()
	setupLobbyistsPhase()
}

export function resetSubphase() {
	const store = useModelStore()
	store.clearCoffeeHistoryInfo()
	context.resetJustProduced()

	if (store.startingOptions.coffee && store.gameflow.subphase === rf.SUBPHASE_COFFEE_SHOPS_FROM_TRAIN && store.context.justTrained.length > 0) {
		model.shouldActionCoffeeShops()
	}

	store.context.isNewRestoMSmailbox = false
	store.context.alreadyDoneMailboxMS = false
	funcs.simpleImportWholeFCMmodel(store.subphaseResetData)

	// Allows for spectator auto update history
	startPlayerTurn(true)
}

// Go back to the start of a previous working day subphase from the EOD
// summary. Recruit is the same as resetWholeTurn; the others restore the
// snapshot taken when that subphase started.
export function redoSubphase(subphase) {
	const store = useModelStore()
	if (subphase === rf.SUBPHASE_HIRING) {
		resetWholeTurn()
		return
	}
	const snapshot = store.subphaseSnapshots[subphase]
	if (snapshot == null || snapshot === "") return
	store.clearCoffeeHistoryInfo()
	context.resetJustProduced()
	funcs.simpleImportWholeFCMmodel(snapshot)
	store.gameflow.subphase = subphase
	startPlayerTurn(true)
}

/**************************
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */


export function autoFillEmployees() {
	let playerObj = currentPlayerObj()
	rf.sortEmployees(playerObj.beach)
	// Fill top slots with NSM then managers then employees
	for (let i = 0; i < playerObj.ceoSlots; i++) {
		if (playerObj.employees[i] === rf.BLANK_EMPLOYEE_SPACE && playerObj.beach.length > 0) plyr.setEmployeeInIndex(currentPlayerIndex(), playerObj.beach[0], i)
	}
	// Then fill bottom slots with employees only
	let slots1 = playerObj.ceoSlots
	let slots2 = 0

	for (let i = 0; i < slots1; i++) if (playerObj.employees[i] !== rf.BLANK_EMPLOYEE_SPACE) slots2 += rules.getSubSlotsForEmployee(playerObj.employees[i])

	if (playerObj.employees.length < slots1 + slots2) {
		while (playerObj.employees.length < slots1 + slots2) {
			playerObj.employees.push(rf.BLANK_EMPLOYEE_SPACE)
		}
	}

	let offset = playerObj.ceoSlots
	for (let i = 0 + offset; i < slots2 + offset; i++) {
		// add first non manager
		for (let j = 0; j < playerObj.beach.length; j++) {
			if (!rf.MANAGERS.includes(playerObj.beach[j])) {
				if (playerObj.employees[i] === rf.BLANK_EMPLOYEE_SPACE && playerObj.beach.length > 0) plyr.setEmployeeInIndex(currentPlayerIndex(), playerObj.beach[j], i)
				break
			}
		}
	}
}

// Restructure
/*export function setCardInCEOslot() {
	const store = useModelStore()
	if (currentPlayerObj().employees.length < currentPlayerObj().ceoSlots + slots2) {
		while (currentPlayerObj().employees.length < currentPlayerObj().ceoSlots + slots2) {
			currentPlayerObj().employees.push(rf.BLANK_EMPLOYEE_SPACE)
		}
	}
}*/

export function chooseTurnOrderPosition(idx) {
	const store = useModelStore()
	store.gameflow.newTurnOrder[idx] = currentPlayerIndex()

	model.addHistory(rf.HIST_CHOOSE_TURN_ORDER, [idx], currentPlayerIndex(), 0)

	// Check for one player left and insert them in the newTurnOrder to display
	const unchosenPlayersCount = store.gameflow.newTurnOrder.reduce((acc, num) => {
		return num === -1 ? acc + 1 : acc
	}, 0)

	if (unchosenPlayersCount === 1) {
		let allPlayerIndexes = []
		for (let i = 0; i < store.players.length; i++) allPlayerIndexes.push(i)
		for (let i = 0; i < allPlayerIndexes.length; i++) {
			if (!store.gameflow.newTurnOrder.includes(allPlayerIndexes[i])) {
				for (let j = 0; j < store.gameflow.newTurnOrder.length; j++) {
					if (store.gameflow.newTurnOrder[j] === -1) {
						store.gameflow.newTurnOrder[j] = allPlayerIndexes[i]
						model.addHistory(rf.HIST_CHOOSE_TURN_ORDER_FORCED, [j], allPlayerIndexes[i], 0)
						break
					}
				}
			}
		}
	}

	store.context.action = rf.ACT_CONFORM_END_TURN
}

/*****************
 *
 * WORKING DAY
 *
 */

// Hire
export function hireEmployee(emp) {
	const store = useModelStore()
	let playerObj = currentPlayerObj()
	playerObj.beach.push(emp)

	store.context.endOfDaySummaryData.hire.hired.push(emp)
	store.availableEmployees[emp]--
	// Bonus EVP's can be given due MS - so check this only goes to 0 NB actualy given in model.giveMilestone. This is just emergency check
	if (emp === rf.EXECUTIVE_VICE_PRESIDENT && store.availableEmployees[rf.EXECUTIVE_VICE_PRESIDENT] < 0) {
		store.availableEmployees[rf.EXECUTIVE_VICE_PRESIDENT] = 0
	}

	store.context.justHired.push(emp)

	if (playerObj.employees.indexOf(rf.RECRUITING_GIRL) > -1) {
		plyr.awardMilestone(currentPlayerIndex(), rf.FIRST_RECRUITING_GIRL_USED)
	}
}

// TRAIN
export function trainEmployee(toEmp, steps) {
	const store = useModelStore()
	const fromEmp = store.context.selectedEmployeeToTrainData.employee
	const fromHire = store.context.selectedEmployeeToTrainData.origin === 1
	const fromStructure = store.context.selectedEmployeeToTrainData.origin === 2

	const playerObj = currentPlayerObj()
	store.context.justTrained.push({
		from: fromEmp,
		to: toEmp,
		spent: steps,
		fromStructure: fromStructure,
	})

	if (fromHire) {
		store.context.justHired.push(fromEmp)
	} else {
		if (fromStructure === true) {
			playerObj.employees.splice(playerObj.employees.indexOf(fromEmp), 1)
		} else {
			playerObj.beach.splice(playerObj.beach.indexOf(fromEmp), 1)
		}
		store.availableEmployees[fromEmp]++
	}

	store.availableEmployees[toEmp]--

	// EOD summary
	store.context.endOfDaySummaryData.train.trained.push(toEmp)
	if (fromHire) store.context.endOfDaySummaryData.hire.hired.push(-1)

	store.context.selectedEmployeeToTrainData.employee = -1
	store.context.selectedEmployeeToTrainData.origin = 0
}

function completeTraining() {
	const store = useModelStore()
	const trained = store.context.justTrained

	if (trained.length > 0) {
		const playerObj = currentPlayerObj()
		const playerIndex = currentPlayerIndex()

		// 1. Update Beach: Filter for non-structure items, then map to 'to' IDs
		const newBeachItems = trained.filter((jt) => jt.fromStructure !== true).map((jt) => jt.to)

		playerObj.beach.push(...newBeachItems)

		// 2. Update Employees: Filter for structure items, then map to 'to' IDs
		const newEmployeeItems = trained.filter((jt) => jt.fromStructure === true).map((jt) => jt.to)

		playerObj.employees.push(...newEmployeeItems)

		// 3. Milestones
		if (store.context.justHired.length >= 3) {
			plyr.awardMilestone(playerIndex, rf.FIRST_HIRE_3)
		}

		plyr.awardMilestone(playerIndex, rf.FIRST_TRAIN)

		// 4. Trainer Check
		if (playerObj.employees.includes(rf.TRAINER)) {
			plyr.awardMilestone(playerIndex, rf.FIRST_TRAINER_USED)
		}
	}
}

// PRODUCE
export function clickedProducer(producer) {
	const store = useModelStore()

	let possible = rules.givePossibleFoodDrinksChoice(producer)

	if (possible.length > 0) {
		if (producer == rf.ERRAND_BOY || producer == rf.KITCHEN_TRAINEE) {
			store.context.producer = producer
			return
		} // end kt or eb
		else {
			// must be a COOK OR CHEF
			let amount = 1
			let item = -1
			if (producer == rf.BARISTA_TRAINEE) amount = 1
			if (producer == rf.BARISTA) amount = 2

			if (producer == rf.BURGER_COOK || producer == rf.PIZZA_COOK || producer == rf.DUMPLING_COOK) amount = 3
			if (producer == rf.SUSHI_COOK) amount = 2
			if (producer == rf.NOODLE_COOK) amount = 6

			if (producer == rf.BURGER_CHEF || producer == rf.PIZZA_CHEF || producer == rf.DUMPLING_CHEF) amount = 8
			if (producer == rf.SUSHI_CHEF || producer == rf.LEAD_BARISTA) amount = 5

			if (producer == rf.NOODLE_CHEF) amount = 16

			if (producer == rf.BURGER_COOK || producer == rf.BURGER_CHEF) item = rf.BURGER
			if (producer == rf.PIZZA_COOK || producer == rf.PIZZA_CHEF) item = rf.PIZZA
			if (producer == rf.SUSHI_COOK || producer == rf.SUSHI_CHEF) item = rf.SUSHI
			if (producer == rf.NOODLE_COOK || producer == rf.NOODLE_CHEF) item = rf.NOODLES
			if (producer == rf.DUMPLING_COOK || producer == rf.DUMPLING_CHEF) item = rf.DUMPLING

			if (producer == rf.BARISTA_TRAINEE || producer == rf.BARISTA || producer == rf.LEAD_BARISTA) item = rf.COFFEE

			//c.model.context.good = good

			store.context.justProduced.team.push(producer)
			store.context.justProduced.added[item] += amount

			for (let i = 0; i < amount; i++) plyr.addResources(currentPlayerIndex(), item, 1)

			// EOD summary
			store.context.endOfDaySummaryData.produce.produced[item] += amount
		}
	} else {
		// Else no possibilities given, so must be some sort of driving drink person
		// Reset drink driving vars
		store.context.path.splice(0)
		store.context.from = -1
		store.context.range = 0
		store.context.collectionNumber = 0

		store.context.producer = producer

		let range = 2
		if (producer == rf.TRUCK_DRIVER) range++
		// A bit confusing: initially cart is 2/2 and truck 3/3
		store.context.collectionNumber = range // IE 2 for cart, 3 for truck
		if (producer == rf.ZEPPELIN_PILOT) {
			range = 4
			store.context.collectionNumber = 2
		}
		if (plyr.hasMilestone(currentPlayerIndex(), rf.FIRST_ERRAND_BOY)) {
			store.context.collectionNumber++
		}
		if (plyr.hasMilestone(currentPlayerIndex(), rf.FIRST_CART_OPERATOR)) {
			range++
		}

		store.context.range = range
		context.clearAllHighlights()
		if (producer == rf.ZEPPELIN_PILOT) {
			store.highlights.tilesToHighlight = rules.givePossibleStartsFromRestaurantsForZeppelin()
		} else {
			store.highlights.indexesToHighlightYellow = rules.givePossibleStartsFromRestaurants()
		}
	}
}

// Convert a list of tile numbers into the small-square indexes that cover them
function zeppelinTilesToSquares(tiles) {
	const squares = []
	for (const tile of tiles) squares.push(...map.giveAllSpaceForAToken(map.giveStartingIndexForTile(tile), 5, 5))
	return squares
}

// Clicked a highlighted square while driving a cart / truck along the road
export function selectNextPosition(index) {
	const store = useModelStore()
	clearDrivingPreview()

	if (store.context.from > -1) {
		if (!map.onTheSameTile(index, store.context.from)) {
			store.context.range--
		}
	} else {
		if (!rules.firstStartIsFromTheSameTile(index)) {
			store.context.range--
		}
	}
	let nextRoad = rules.nextRoadPossibilities(index, store.context.from, store.context.range)

	if (nextRoad.from !== -1) {
		store.context.from = nextRoad.from
	} else {
		store.context.from = index
	}
	store.context.range = nextRoad.range

	store.context.path = store.context.path.concat(nextRoad.path)
	store.highlights.indexesToHighlightPath = [...store.context.path]
	store.highlights.indexesToHighlightDrinks = rules.giveDrinkSquaresAlongPath(store.context.path)
	if (nextRoad.target.length > 0) {
		store.highlights.indexesToHighlightYellow = nextRoad.target
	} else {
		stopCollecting()
	}
}

// Hovering a highlighted square: preview the route it would add (up to the next decision point / max range)
export function setDrivingPreview(index) {
	const store = useModelStore()
	if (store.context.producer === rf.ZEPPELIN_PILOT) {
		const tile = map.giveTileNumber(index)
		// At the end of the zeppelin's range there are no more options to preview
		if (store.context.path.length >= store.context.range) {
			store.highlights.tilesToHighlightPreview.splice(0)
			return
		}
		store.highlights.tilesToHighlightPreview = rules.nextAirPossibilitiesForZeppelin(tile, store.context.path)
	} else {
		const nextRoad = rules.nextRoadPossibilities(index, store.context.from, store.context.range)
		store.highlights.indexesToHighlightPreview = nextRoad.path
	}
}

export function clearDrivingPreview() {
	const store = useModelStore()
	store.highlights.indexesToHighlightPreview.splice(0)
	store.highlights.tilesToHighlightPreview.splice(0)
}

// Clicked a highlighted tile while flying the zeppelin
export function selectNextTile(tile) {
	const store = useModelStore()
	clearDrivingPreview()
	store.context.path.push(tile)
	store.highlights.indexesToHighlightPath = zeppelinTilesToSquares(store.context.path)
	store.highlights.indexesToHighlightDrinks = rules.giveDrinkSquaresOnTiles(store.context.path)

	let target = rules.nextAirPossibilitiesForZeppelin(tile, store.context.path)
	if (target.length === 0 || store.context.path.length == store.context.range + 1) {
		stopCollecting()
	} else {
		store.highlights.tilesToHighlight = target
	}
}

export function stopCollecting() {
	const store = useModelStore()
	context.clearAllHighlights()

	let resources = []

	if (store.context.producer == rf.CART_OPERATOR) {
		plyr.awardMilestone(currentPlayerIndex(), rf.FIRST_CART_OPERATOR_USED)
	}

	let collectionNumber = store.context.collectionNumber
	if (plyr.hasMilestone(currentPlayerIndex(), rf.FIRST_CART_OPERATOR_USED)) {
		collectionNumber *= 2
	}
	if (store.context.producer == rf.ZEPPELIN_PILOT) {
		resources = rules.gatherFromTiles(store.context.path, collectionNumber)
	} else {
		resources = rules.gatherDrinksAlongPath(store.context.path, collectionNumber)
	}

	store.context.justProduced.team.push(store.context.producer)
	for (const r of resources) store.context.justProduced.added[r]++

	// EOD summary
	for (const r of resources) store.context.endOfDaySummaryData.produce.produced[r] += 1
	plyr.addResources(currentPlayerIndex(), resources)

	store.context.producer = -1
	store.context.path.splice(0)
	store.context.from = -1
	store.context.range = 0
	store.context.collectionNumber = 0
}

export function addProducedItemToPlayer(item) {
	const store = useModelStore()
	//c.model.context.good = good

	let amount = 1
	if (store.context.producer == rf.ERRAND_BOY && plyr.hasMilestone(currentPlayerIndex(), rf.FIRST_ERRAND_BOY)) amount = 2
	store.context.justProduced.team.push(store.context.producer)
	store.context.justProduced.added[item] += amount
	/*if (rf.DRINK.indexOf(good) > -1 && playerObj.hasMilestone(rf.FIRST_ERRAND_BOY)) {
			c.model.context.justProduced.added[good]++
			playerObj.addResources(good, 1)
		}*/
	for (let i = 0; i < amount; i++) plyr.addResources(currentPlayerIndex(), item, 1)

	// EOD summary
	store.context.endOfDaySummaryData.produce.produced[item] += amount

	store.context.producer = -1
}

export function selectCeoBonus(bonus) {
	currentPlayerObj().ceoAction = bonus
}
