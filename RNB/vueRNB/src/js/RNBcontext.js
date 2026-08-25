import { useModelStore } from "../stores/RNBstore.js"

import * as rf from "./RNBreference.js"
import * as funcs from "./RNBfuncs.js"
import * as highlight from "./RNBhighlight.js"
import * as stack from "./RNBstack.js"
import * as model from "./RNBmodel.js"
import * as loc from "./RNBlocation.js"

export function clearDataForGameReload() {
	const store = useModelStore()
	resetContextAndHighlights()
	store.clearMessages()
	store.undoPoints.splice(0)
	store.actionStack.splice(0)
	store.context.possibleDonkeyReproductionData.splice(0)
	// ELECTRICITY: clear transient power state so a stale guard from a cancelled
	// pre-phase preview can't suppress fuelling (or its history entry) on the real turn.
	store.context.powerPlantsFueledTurn = -1
	store.context.poweredHexIDs.splice(0)
	// stack control
	stack.resetStackControlData()
}

export function resetWholeTurn() {
	const store = useModelStore()
	resetContextAndHighlights()
	store.clearMessages()
	store.undoPoints.splice(0)
	store.actionStack.splice(0)
	stack.resetStackControlData()
	funcs.simpleImportWholeRNBmodel(store.wholeTurnResetData, false)
	// This was suggested by AI. But simple import whole model SHOULD capture data "as is"
	/*
	model.resetTransportersForNewTurn()
	for (let i = 0; i < model.getAllInGameResources().length; i++) {
		model.getAllInGameResources()[i].movedTransporterID = -1
	}
		*/
	highlight.updateAllHighlightsForTransporterMode()
}

export function createUndoPoint() {
	const store = useModelStore()
	store.undoPoints.push(funcs.simpleExportWholeRNBmodel())
}

export function undoLastAction() {
	const store = useModelStore()
	// 0 or 1 action is the same as a whole turn reset
	if (store.undoPoints.length === 0) {
		return
	}
	stack.resetStackControlData()
	store.undoPoints.pop()
	// Get the next action
	let restorePoint = store.undoPoints[store.undoPoints.length - 1]
	funcs.simpleImportWholeRNBmodel(restorePoint)
	// If a transporter is selected, then set the zoom hex to that location
	if (store.context.selectedTransporterIDforTM !== -1) {
		let transporterObj = model.getTransporterByID(store.context.selectedTransporterIDforTM)
		if (loc.isAnyHexLocation(transporterObj.location)) {
			store.mapData.zoomData.hexID = transporterObj.location[1]
		}
	}
}

export function clearAllHighlights() {
	const store = useModelStore()
	let context = store.context

	context.hexPiecesToHighlight.splice(0)
	context.hexPiecesToHighlightUnderTransporters.splice(0)
	context.resourceIDsToHighlight.splice(0)
	context.transporterIDsToHighlight.splice(0)
	context.buildingIDsToHighlight.splice(0)
	context.eligibleWallsToBuild.splice(0)
	context.eligibleWallsToDemolish.splice(0)
	context.eligibleBridgesToBuild.splice(0)
	context.riversToHighlight.splice(0)
	context.shoresToHighlight.splice(0)
	context.halfShoresToHighlight.splice(0)
	context.eligibleBuildingsToBuild.splice(0)
}

export function resetContextAndHighlights() {
	resetContext()
	clearAllHighlights()
}

export function resetContext() {
	const store = useModelStore()
	let context = store.context

	context.action = rf.ACT_NONE
	context.hexTerrainIDbeingAdded = -1
	context.placeableTiles.splice(0)
	context.hexBeingAddedRotation = 0
	context.historyObj.splice(0)
	context.newRoadInfo.splice(0)
	context.transporterMoveInfo.splice(0)
	context.resIDbeingMoved = -1
	context.transporterIDbeingDropped = -1

	// Transporter Mode vars
	context.selectedTransporterIDforTM = -1
	context.gooseID = -1

	// Production vars
	context.pendingTransporterTypeForLocationSelectionData.splice(0)
	//context.possibleDonkeyReproductionData.splice(0) // persist to turn end
	context.chosenInputGoods[0].splice(0)
	context.chosenInputGoods[1].splice(0)
	context.chosenInputGoods[2] = -1
	context.atelierRecipeOutput = -1
	context.atelierRecipeOptions.splice(0)
	context.atelierBuildingID = -1
	context.atelierTransporterID = -1
	//context.researchHexIDpossibilities.splice(0)
	context.researchIndexForBuildingUpgrades = -1

	// Movement Vars
	//context.errorUnableToDropGeeseAtSea = false // Don't reset this. Must use undo action
	context.remainingTransportersWithMovement.splice(0)
	context.selectedTransporterIDforPickupOrSelection = -1

	// Building Vars
	context.selectedBuildingToBuild = -1
	context.mineSelectionType = 0
	context.buildingPowerLine = false
	context.remainingBuildingSummaryOptions.splice(0)
	context.noTransportersOnHomeTile = false

	// Wonder Vars
	context.wonderError = 0
	// DON'T KEEP RESETTING THESE
	//context.resIDsOnHomeTile.splice(0)
	//context.resIDsInWonderBrick.splice(0)
}

export function addHexPieceToHighlight(entry) {
	const store = useModelStore()
	let context = store.context
	context.hexPiecesToHighlight.push(entry)
}

export function setHexPiecesToHighlight(arr) {
	const store = useModelStore()
	store.context.hexPiecesToHighlight = arr
}

export function setHexPieceToHighlightUnderTransporters(arr) {
	const store = useModelStore()
	store.context.hexPiecesToHighlightUnderTransporters = arr
}

export function addResourceToHighlight(id) {
	const store = useModelStore()
	let context = store.context
	context.resourceIDsToHighlight.push(id)
}

export function addTransporterToHighlight(id) {
	const store = useModelStore()
	let context = store.context
	context.transporterIDsToHighlight.push(id)
}

export function setTransportersToHighlight(arr) {
	const store = useModelStore()
	let context = store.context
	context.transporterIDsToHighlight = arr
}

export function setBuildingsToHighlight(arr) {
	const store = useModelStore()
	let context = store.context
	context.buildingIDsToHighlight = arr
}

export function addEligibleWallToBuild(entry) {
	const store = useModelStore()
	let context = store.context
	context.eligibleWallsToBuild.push(entry)
}

export function addEligibleBridgeToBuild(entry) {
	const store = useModelStore()
	let context = store.context
	context.eligibleBridgesToBuild.push(entry)
}

// The input arr is in form [hexID, riverIdx/ID, [fullLoc]]
export function setRiversToHighlight(arr) {
	const store = useModelStore()
	store.context.riversToHighlight = arr
}

export function setShoresToHighlight(arr) {
	const store = useModelStore()
	let context = store.context
	context.shoresToHighlight = arr
}

export function addHalfShoreToHighlight(entry) {
	const store = useModelStore()
	let context = store.context
	context.halfShoresToHighlight.push(entry)
}

export function setHalfShoresToHighlight(arr) {
	const store = useModelStore()
	let context = store.context
	context.halfShoresToHighlight = arr
}
