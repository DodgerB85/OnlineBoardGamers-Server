import * as rf from "./FCMreference"
import { reactive, toRaw } from "vue"

// Unconfirmed UI choice, deliberately outside the serialized context/wire.
// Replacing players on import/new game gives an explicit null default even
// when an old context omits every new field. Weak keys do not retain old games.
const marketingTraineeChoices = reactive(new WeakMap())
export function marketingTraineeChoice(playerObj) {
	return marketingTraineeChoices.get(playerObj) ?? null
}
export function setMarketingTraineeChoice(playerObj, choice = null) {
	if (choice == null) marketingTraineeChoices.delete(playerObj)
	else marketingTraineeChoices.set(playerObj, choice)
}

import { useModelStore } from "../stores/FCMstore.js"

export function clearMarketingTraineeChoices() {
	for (const playerObj of useModelStore().players) marketingTraineeChoices.delete(playerObj)
}

// Bound live selections are ephemeral capabilities, never wire/context fields.
// Keep revoked entries while a stale event still holds the selection object.
const trainingSelectionOwners = new WeakMap()
// Remember UI provenance independently of the replaceable selection/context.
// Once this store has bound a UI choice, replacing it cannot reopen raw mode.
// Weak store keys isolate games/test stores without adding serialized fields.
const trainingSelectionSessions = new WeakMap()
export function bindTrainingSelection(selection) {
	const store = useModelStore()
	clearTrainingSelection()
	const bound = { employee: selection.employee, origin: selection.origin }
	if (selection.sourceIndex !== undefined) Object.defineProperty(bound, "sourceIndex", { value: selection.sourceIndex, enumerable: false })
	trainingSelectionOwners.set(bound, {
		context: store.context, player: store.players[store.gameflow.turnOrder[0]],
		playerIndex: store.gameflow.turnOrder[0], turn: store.gameflow.turn,
		phase: store.gameflow.phase, subphase: store.gameflow.subphase, valid: true,
	})
	trainingSelectionSessions.set(store, bound)
	store.context.selectedEmployeeToTrainData = bound
	return store.context.selectedEmployeeToTrainData
}
export function trainingSelectionIsCurrent(selection, requireBound = false) {
	const store = useModelStore()
	const owner = trainingSelectionOwners.get(toRaw(selection))
	// Retain the pre-existing raw controller API used by non-UI callers; the
	// live UI always binds and explicitly submits its render-time capability.
	if (!owner) return !requireBound && !trainingSelectionSessions.has(store)
	return owner.valid && selection === store.context.selectedEmployeeToTrainData &&
		owner.context === store.context && owner.player === store.players[owner.playerIndex] &&
		owner.playerIndex === store.gameflow.turnOrder[0] && owner.turn === store.gameflow.turn &&
		owner.phase === store.gameflow.phase && owner.subphase === store.gameflow.subphase
}
export function clearTrainingSelection() {
	const store = useModelStore()
	const owner = trainingSelectionOwners.get(trainingSelectionSessions.get(store))
	if (owner) owner.valid = false
	store.context.selectedEmployeeToTrainData = { employee: -1, origin: 0 }
}

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
	clearMarketingTraineeChoices()
	store.context.phoneGroupAction = null
	store.context.mediaLineSecondCall = false
	resetEndOfDaySummaryData()

	store.context.action = rf.ACT_NONE
	store.context.selectedReserveCard = rf.RES_CARD_NOT_CHOSEN
	store.context.selectedEmployeeIndexForRestructuring = -1
	clearTrainingSelection()
	store.context.justHired.splice(0)
	store.context.justTrained.splice(0)
	store.context.justMarketed.splice(0)
	store.context.remainingProducers.splice(0)
	store.context.justProduced.team.splice(0)
	// Always full item length (LEMONADE..FRIED_CHICKEN); slots for items not in this
	// game just stay 0 (display checks > 0, so they are invisible). Export trims
	// trailing zeros; import pads back to full length.
	store.context.justProduced.added = Array(rf.FRIED_CHICKEN + 1).fill(0)
	store.context.justBuilt.splice(0)
	store.context.justLobbied.splice(0)
	store.context.justOpened.splice(0)
	store.context.headhunterActionsUsed = 0
	store.context.justHeadhunted.splice(0)
	store.context.temporaryMarketer = false
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
	store.context.nightShift = false
	store.context.nightShiftCampaign = false
	store.context.from = -1
	store.context.range = 0
	store.context.path.splice(0)
	store.context.routeTargets.splice(0)
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
	store.context.endOfDaySummaryData.produce.produced = Array(rf.FRIED_CHICKEN + 1).fill(0)
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
