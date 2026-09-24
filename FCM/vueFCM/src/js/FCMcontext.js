import * as rf from "./FCMreference"

import { useModelStore } from "../stores/FCMstore.js"

export function resetContextAndHighlights() {
	resetContext()
	clearAllHighlights()
}

export function clearAllHighlights() {
	const store = useModelStore()
	store.highlights.indexesToHighlightYellow.splice(0)
	store.highlights.indexesToHighlightPath.splice(0)
	store.highlights.indexesToHighlightPreview.splice(0)
	store.highlights.indexesToHighlightDrinks.splice(0)
	store.highlights.indexesToHighlightHouses.splice(0)
	store.highlights.tilesToHighlight.splice(0)
	store.highlights.tilesToHighlightPreview.splice(0)
}

export function resetContext() {
    const store = useModelStore()
	resetEndOfDaySummaryData()

	store.context.action = rf.ACT_NONE
	store.context.selectedReserveCard = rf.RES_CARD_NONE
	store.context.selectedEmployeeIndexForRestructuring = -1
	store.context.selectedEmployeeToTrainData.employee = -1
	store.context.selectedEmployeeToTrainData.origin = 0
	store.context.justHired.splice(0)
	store.context.justTrained.splice(0)
	store.context.justMarketed.splice(0)
	store.context.remainingProducers.splice(0)
	store.context.justProduced.team.splice(0)
	store.context.justProduced.added = store.startingOptions.dumplings ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 0, 0, 0]
	store.context.justBuilt.splice(0)
	store.context.justLobbied.splice(0)
	store.context.justOpened.splice(0)
	// NB: justFired is NOT cleared here — it is cleared in startPlayerTurn (payday)
	// and the strict payday path of endPlayerTurn. Clearing it here would destroy
	// the player's firing decisions before endPlayerTurn can read them for simul payday.
	// NB: justBinned is likewise NOT cleared here — endPlayerTurn reads it for simul
	// cleanup moveData. It is cleared in startPlayerTurn (cleanup/payday).

	store.context.isNewRestoMSmailbox = false // THIS MAY NEED TO BE SEPERATE?
	store.context.alreadyDoneMailboxMS = false
	store.context.newRestaurantIndex = -1
	store.context.secondCampaignManager = false
	store.context.massMarketersOnly = -1
	store.context.newRestaurantAction = ""
	store.context.noMoreRestaurants = false
	store.context.lobbyistMilestoneActive = false
	store.context.freewaySidesFalse.splice(0)
	store.context.freewaySidesTrue.splice(0)
	store.context.freewayHighlightSets = null
	store.context.houseIndex = -1
	store.context.buildingType = 0

	store.context.campaign = -1 // Pass to view, applies to any marketing
	store.context.double = false
	store.context.campaigns.splice(0) // Capaigns to choose from after selecting marketeer
	store.context.good = rf.BURGER
	store.context.rotated = false
	store.context.duration = 1
	store.context.secondGood = -1
	store.context.selectedBuildingManager = -1
	store.context.newLobbyistTile = -1
	store.context.nextUrbanPlanningTile = -1
	store.context.rotation = 0 // This is used for many objects rotation
	store.context.removedRestoIndex = -1
	store.context.chosenResCard = -1

	// Coffee
	store.context.justCoffeeShopped.splice(0)
	store.context.baristaCoffeeShops = 0
	store.context.leadBaristaCoffeeShopsFromB = 0
	store.context.leadBaristaCoffeeShopsFromTB = 0
	store.context.coffeeShopAction = ""
	store.context.coffeeShopMSAction = ""

	// New stuff
	store.context.restaurantMilestone = false
	store.context.noMoreRestaurants = false
	store.context.nightShift = false
	store.context.nightShiftCampaign = false
	store.context.from = -1
	store.context.range = 0
	store.context.path.splice(0)
	store.context.collectionNumber = 0
	store.context.indexes.splice(0)
	store.context.edges.splice(0)
	store.context.producer = -1
	store.context.hawkerRouteActive = false
	store.context.showingHawkerRoute = -1
	store.context.selectedModuleIndex = 0
	store.context.marketer = -1
	store.context.refusePlaneDouble = false
	store.context.firstCampaignDuration = 1
	store.context.firstCampaignCampaign = 11
	store.context.selectedBuilding = -1
	store.context.house = 1
	store.context.variety = 1
	store.context.flipped = false
	store.context.parkModel.splice(0)
	store.context.brandManagerMS = false
	store.context.componentBeingAdded = -1
	store.context.EODradioSelections = [0, 0]
	store.context.preMoveData = [[[-9], []], [-9]]
	store.context.savedEODpreset = null

	// Replay
	store.context.highlightHistorySquares.splice(0)
}

export function resetEndOfDaySummaryData() {
    const store = useModelStore()
	store.context.endOfDaySummaryData.hire.total = 0
	store.context.endOfDaySummaryData.hire.hired.splice(0)
	store.context.endOfDaySummaryData.hire.salaryReductions = 0

	store.context.endOfDaySummaryData.train.total = 0
	store.context.endOfDaySummaryData.train.trained.splice(0)
	store.context.endOfDaySummaryData.train.unused = 0

	store.context.endOfDaySummaryData.market.total = 0
	store.context.endOfDaySummaryData.market.marketed.splice(0)
	store.context.endOfDaySummaryData.market.unused.splice(0)

	store.context.endOfDaySummaryData.produce.total = 0
	store.context.endOfDaySummaryData.produce.produced = [0, 0, 0, 0, 0, 0, 0, 0, 0]
	store.context.endOfDaySummaryData.produce.unused.splice(0)

	store.context.endOfDaySummaryData.houses.total = 0
	store.context.endOfDaySummaryData.houses.built.splice(0)

	store.context.endOfDaySummaryData.lobby.total = 0
	store.context.endOfDaySummaryData.lobby.built.splice(0)

	store.context.endOfDaySummaryData.managers.total = 0
	store.context.endOfDaySummaryData.managers.built.splice(0)
}

export function resetJustProduced() {
	const store = useModelStore()
	store.context.justProduced.team.splice(0)
	for (let i = 0; i < store.context.justProduced.added.length; i++) store.context.justProduced.added[i] = 0
}