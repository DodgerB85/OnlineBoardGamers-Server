/**
 * Production setup phase (PHASE_PRODUCTION_SETUP_TO)
 *
 * After the production turn order is set and before anyone produces, in turn order,
 * each player with a choice announces:
 *  - whether managers carried by their transporters activate on a tile
 *  - which of their transporters (if any) burns wood to fire a power plant
 *
 * Players with nothing to choose are skipped, and the phase is skipped when nobody can choose.
 * The announcement is the player's only action in the phase (STACK_PRODUCTION_SETUP).
 * A production preset carries the choice too; it is saved as a separate setup-phase move.
 * The choices are made on the map (transporters carrying them, the managers / wood and the plant are clickable).
 * The preset preview also asks for the choice before primaries produce.
 *
 * Mines are pulled before conflict, so a plant fired here adds the missing second
 * mine output. Other primaries produce after this phase and are doubled normally.
 * Legacy games recorded the setup inside production, after all primaries produced.
 *
 * shortcut: mines are still pulled before conflict; a plant fired here adds the
 * second mine draw at announcement time. Upgrade if power must be decided before
 * the mine draw. Rulings: boardgamegeek.com/thread/3758406 (managers after turn
 * order) and boardgamegeek.com/thread/3715801 (electricity/mines).
 */

import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"

import * as rf from "./RNBreference.js"
import * as model from "./RNBmodel.js"
import * as loc from "./RNBlocation.js"
import * as stack from "./RNBstack.js"
import * as produce from "./RNBproduce.js"
import * as electricity from "./RNBelectricity.js"
import * as controller from "./RNBcontroller.js"
import * as context from "./RNBcontext.js"

export function getDecisionsForPlayer(playerIndex) {
	const store = useModelStore()
	const turnDecisions = store.gameflow.productionDecisions?.[store.gameflow.turn]
	return turnDecisions?.[playerIndex] || { managers: {}, plants: {} }
}

export function pruneProductionDecisions() {
	const store = useModelStore()
	const decisions = store.gameflow.productionDecisions
	if (!decisions) return
	for (const turnKey of Object.keys(decisions)) {
		if (Number(turnKey) < store.gameflow.turn) delete decisions[turnKey]
	}
}

// Each tile with one of the player's managers on a transporter and a secondary
// producer. Only one manager per tile matters, so the choice is per tile.
export function getManagerChoices(playerIndex) {
	const store = useModelStore()
	if (!store.gameOptions.useManagement) return []
	const decisions = getDecisionsForPlayer(playerIndex)
	const choices = new Map()
	for (const transporterObj of model.getTransportersByPlayerIndex(playerIndex)) {
		if (!loc.isAnyHexLocation(transporterObj.location)) continue
		const hasManager = model.resourcesOnTransport(transporterObj.id).some((r) => r.type === rf.RES_MANAGER)
		if (!hasManager) continue
		const hexID = transporterObj.location[1]
		if (choices.has(hexID)) continue
		const hasSecondary = model.getAllInGameBuildings().some((b) => b.location[1] === hexID && model.isSecondaryProducer(b))
		if (!hasSecondary) continue
		choices.set(hexID, { hexID, active: decisions.managers?.[hexID] ?? true })
	}
	return [...choices.values()]
}

// Each unfuelled power plant on a tile where the player has a transporter carrying wood.
export function getPlantChoices(playerIndex) {
	const store = useModelStore()
	if (!store.gameOptions.useElectricity) return []
	const decisions = getDecisionsForPlayer(playerIndex)
	const choices = []
	for (const bldg of electricity.getAllPowerPlants()) {
		if (bldg.powerActive === true) continue
		const hexID = bldg.location[1]
		if (electricity.findFreeFuelOnTile(hexID, bldg.location[2])) continue
		const transporters = model
			.getTransportersByPlayerIndexAndHexID(playerIndex, hexID)
			.map((t) => ({ id: t.id, fuel: electricity.getCarriedFuelOnTile(t, hexID, bldg.location[2]) }))
			.filter((t) => t.fuel.length > 0)
		if (transporters.length === 0) continue
		choices.push({
			bldgID: bldg.id,
			hexID,
			transporters,
			transporterID: decisions.plants?.[bldg.id] ?? -1,
		})
	}
	return choices
}

export function hasChoices(playerIndex) {
	return getManagerChoices(playerIndex).length > 0 || getPlantChoices(playerIndex).length > 0
}

// Players drop out of the setup turn order once they have nothing left to choose
// (eg an earlier player fired the only plant they could fire).
export function dropPlayersWithoutChoices() {
	const store = useModelStore()
	if (store.gameflow.phase !== rf.PHASE_PRODUCTION_SETUP_TO) return
	store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => hasChoices(idx))
}

// A second pull from a mine on a newly powered tile
function addExtraMineOutput(mine, forPreTurn, forcedOutput = -1) {
	const result = produce.addBuildingOutputResourcesToGame_core(mine.id, forcedOutput, 9, forPreTurn, true)
	return result.length > 0 ? result[0][1] : -1
}

// MAP INTERACTION: in the setup phase (and a production preset before primaries run),
// carried managers and wood are clickable. Click a manager to switch it on / off; click
// wood on a transporter, or the plant itself, to fire the plant.
export function isSetupMode() {
	const store = useModelStore()
	const personal = usePersonalStore()
	// A production preset before primaries produce
	if (store.gameflow.phase === rf.PRE_PHASE_PRODUCTION) return personal.canPlay() && store.context.productionSetupPending
	// The real setup phase: only players in the setup turn order may act, but a
	// loaded pre-move still needs the panel so it can be finished.
	if (store.gameflow.phase !== rf.PHASE_PRODUCTION_SETUP_TO) return false
	if (personal.trainingGame || personal.soloGame) return true
	return personal.pov >= 0 && store.gameflow.turnOrder.includes(personal.pov)
}

export function updateSetupHighlights() {
	const store = useModelStore()
	const playerIndex = controller.currentPlayerIndex()
	context.resetContextAndHighlights()
	const managerHexIDs = getManagerChoices(playerIndex).map((c) => c.hexID)
	for (const transporterObj of model.getTransportersByPlayerIndex(playerIndex)) {
		if (!loc.isAnyHexLocation(transporterObj.location) || !managerHexIDs.includes(transporterObj.location[1])) continue
		const manager = model.resourcesOnTransport(transporterObj.id).find((r) => r.type === rf.RES_MANAGER)
		if (!manager) continue
		store.context.resourceIDsToHighlight.push(manager.id)
		store.context.transporterIDsToHighlight.push(transporterObj.id)
	}
	for (const choice of getPlantChoices(playerIndex)) {
		store.context.buildingIDsToHighlight.push(choice.bldgID)
		for (const transporter of choice.transporters) {
			for (const res of transporter.fuel) context.addResourceToHighlight(res.id)
			context.addTransporterToHighlight(transporter.id)
		}
	}
}

// Dims a power plant during setup until it is fired
export function isUnfiredPlant(bldgID) {
	if (!isSetupMode()) return false
	const bldg = model.getBuildingByID(bldgID)
	return electricity.isPowerPlant(bldg) && bldg.powerActive !== true
}

// One line for the action area, so declining is visible too
export function setupSummary() {
	const playerIndex = controller.currentPlayerIndex()
	const managers = getManagerChoices(playerIndex)
	const plants = getPlantChoices(playerIndex).length
	const fired = Object.keys(getDecisionsForPlayer(playerIndex).plants ?? {}).length
	const managersOff = managers.filter((c) => !model.getManagerActivation(playerIndex, c.hexID)).length
	return { plants, fired, managersOn: managers.length - managersOff, managersOff }
}

// Clicking the transporter: fire the plant with its wood, else switch its manager
export function clickedSetupTransporter(transporterID) {
	const store = useModelStore()
	if (!store.context.transporterIDsToHighlight.includes(transporterID)) return
	const hexID = model.getTransporterByID(transporterID).location[1]
	const plantChoice = getPlantChoices(controller.currentPlayerIndex()).find((c) => c.hexID === hexID && c.transporters.some((t) => t.id === transporterID))
	const plantBucketID = plantChoice ? model.getBuildingByID(plantChoice.bldgID).location[2] : undefined
	const wood = electricity.findFuelOnTransporterOnTile(transporterID, hexID, undefined, plantBucketID)
	const manager = model.resourcesOnTransport(transporterID).find((r) => r.type === rf.RES_MANAGER)
	const res = wood && store.context.resourceIDsToHighlight.includes(wood.id) ? wood : manager
	if (res) clickedSetupResource(transporterID, res.id)
}

function recordSetupAction(playerIndex, managerChoices, plantChoices) {
	const historyEntry = applyProductionSetup(playerIndex, managerChoices, plantChoices)
	stack.addItemToStack({ action: rf.STACK_PRODUCTION_SETUP, historyEntry, playerIndex })
	context.createUndoPoint()
	updateSetupHighlights()
}

export function clickedSetupResource(transporterID, resID) {
	const store = useModelStore()
	if (!store.context.resourceIDsToHighlight.includes(resID)) return
	const playerIndex = controller.currentPlayerIndex()
	const transporterObj = model.getTransporterByID(transporterID)
	const hexID = transporterObj.location[1]
	if (model.getResByID(resID).type === rf.RES_MANAGER) {
		recordSetupAction(playerIndex, [{ hexID, active: !model.getManagerActivation(playerIndex, hexID) }], [])
		return
	}
	const choice = getPlantChoices(playerIndex).find((c) => c.hexID === hexID && c.transporters.some((t) => t.id === transporterID && t.fuel.some((res) => res.id === resID)))
	if (choice) recordSetupAction(playerIndex, [], [{ bldgID: choice.bldgID, transporterID, fuelID: resID }])
}

// Clicking the plant burns wood from the first of your transporters that carries some
export function clickedSetupBuilding(bldgID) {
	const playerIndex = controller.currentPlayerIndex()
	const choice = getPlantChoices(playerIndex).find((c) => c.bldgID === bldgID)
	if (choice) recordSetupAction(playerIndex, [], [{ bldgID, transporterID: choice.transporters[0].id }])
}

// Production preset: primaries waited for the setup choices (IO.simulateProductionStart)
export function finishPresetSetup() {
	const store = useModelStore()
	store.context.productionSetupPending = false
	controller.performAllPreProductionExceptMines()
	store.context.researchHexIDpossibilities = produce.findAllResearchHexIDpossibilities(controller.currentPlayerIndex())
	context.resetContextAndHighlights()
	store.context.action = rf.ACT_TM_SELECT_TRANSPORTER
	context.createUndoPoint()
}

// Apply the live choice. Returns the stack history entry to store as the first
// production action for this player.
export function applyProductionSetup(playerIndex, managerChoices, plantChoices) {
	const store = useModelStore()
	if (!store.gameflow.productionDecisions) store.gameflow.productionDecisions = {}
	const decisions = getDecisionsForPlayer(playerIndex)
	if (!decisions.managers) decisions.managers = {}
	if (!decisions.plants) decisions.plants = {}

	const managerEntries = []
	for (const choice of managerChoices || []) {
		decisions.managers[choice.hexID] = choice.active
		model.setManagerActivation(playerIndex, choice.hexID, choice.active)
		managerEntries.push([choice.hexID, choice.active])
	}

	const plantEntries = []
	const fuelEntries = []
	const extraOutputs = []
	const forPreTurn = store.gameflow.phase >= rf.PRE_PHASE_OFFSET
	for (const choice of plantChoices || []) {
		decisions.plants[choice.bldgID] = choice.transporterID
		if (choice.transporterID < 0) continue
		const bldg = model.getBuildingByID(choice.bldgID)
		if (!bldg) continue
		const poweredBefore = new Set(store.context.poweredBucketKeys || [])
		const fuelEntry = electricity.firePowerPlantFromTransporter(choice.bldgID, choice.transporterID, choice.fuelID, playerIndex)
		if (!fuelEntry) continue
		const plantID = stack.getBldgIDtoUse(bldg)
		const plantEntry = [plantID, stack.getTransIDtoUse(model.getTransporterByID(choice.transporterID))]
		if (choice.fuelID !== undefined) plantEntry.push(stack.getResIDtoUse(model.getResByID(fuelEntry[2])))
		plantEntries.push(plantEntry)
		fuelEntries.push(fuelEntry)
		// Mines already produced (before conflict): add their missing second output (and record which plant caused it).
		// Other primaries produce after the setup and are doubled then.
		for (const primary of model.getAllInGameBuildings().filter((b) => b.type === rf.BLDG_MINE)) {
			const powerKey = electricity.getLocationPowerNodeKey(primary.location)
			if (!powerKey || poweredBefore.has(powerKey) || !electricity.isLocationPowered(primary.location)) continue
			const outputRes = addExtraMineOutput(primary, forPreTurn)
			// A preset reserves a draw. The first live draw can change what is still in the bag.
			if (outputRes !== -1) extraOutputs.push([plantID, stack.getBldgIDtoUse(primary), stack.compressLocation(primary.location), forPreTurn ? -1 : outputRes])
		}
	}

	if (!store.gameflow.productionDecisions[store.gameflow.turn]) store.gameflow.productionDecisions[store.gameflow.turn] = {}
	store.gameflow.productionDecisions[store.gameflow.turn][playerIndex] = decisions
	return [rf.STACK_PRODUCTION_SETUP, managerEntries, plantEntries, fuelEntries, extraOutputs]
}

// Pending moves resolve their extra draws against the current bag. Replay uses recorded draws.
export function performSetupStackAction(stackAction, playerIndex, moveData = null) {
	const store = useModelStore()
	const forPreTurn = moveData !== null && store.gameflow.phase >= rf.PRE_PHASE_OFFSET
	// Older presets recorded a concrete draw even though they were saved before the turn began.
	const isOlderPreset = Number.isInteger(moveData?.knownFinalHistoryidx) &&
		moveData.knownFinalHistoryidx < store.history.findLastIndex((entry) => entry[0] === rf.HIST_NEW_TURN && entry[3][0] === store.gameflow.turn)
	const resolvedOutputs = []
	if (!store.gameflow.productionDecisions) store.gameflow.productionDecisions = {}
	const decisions = getDecisionsForPlayer(playerIndex)
	if (!decisions.managers) decisions.managers = {}
	if (!decisions.plants) decisions.plants = {}

	for (const [hexID, active] of stackAction[1] || []) {
		decisions.managers[hexID] = active
		model.setManagerActivation(playerIndex, hexID, active)
	}
	for (const [bldgID, transporterID, fuelID] of stackAction[2] || []) {
		decisions.plants[bldgID] = transporterID
		const poweredBefore = new Set(store.context.poweredBucketKeys || [])
		const fired = electricity.firePowerPlantFromTransporter(bldgID, transporterID, fuelID, playerIndex)
		// The plant may already be working from tile fuel now; in that case the
		// pre-production output was already doubled and these extras must not be added.
		if (!fired) continue
		for (const [plantID, primaryID, location, outputRes] of stackAction[4] || []) {
			if (plantID !== bldgID) continue
			const primary = model.getBuildingByID(primaryID)
			if (!primary) continue
			if (primary.type === rf.BLDG_MINE) {
				// Live moves use the bucket network; replay trusts the recorded draw
				// so older games with hex-level power data still replay exactly.
				if (moveData) {
					const powerKey = electricity.getLocationPowerNodeKey(primary.location)
					if (powerKey && poweredBefore.has(powerKey)) continue
					if (!electricity.isLocationPowered(primary.location)) continue
				}
				const [gold, iron] = primary.remainingMineContent
				const available = (outputRes === rf.RES_GOLD && gold > 0) || (outputRes === rf.RES_IRON && iron > 0)
				const forcedOutput = moveData && (forPreTurn || isOlderPreset || !available) ? -1 : outputRes
				const drawn = addExtraMineOutput(primary, forPreTurn, forcedOutput)
				if (drawn !== -1) resolvedOutputs.push([plantID, primaryID, location, drawn])
			} else {
				model.addResourceToGame_core(outputRes, primary.location, 9)
				resolvedOutputs.push([plantID, primaryID, location, outputRes])
			}
		}
	}
	if (moveData && !forPreTurn) stackAction[4] = resolvedOutputs

	if (!store.gameflow.productionDecisions[store.gameflow.turn]) store.gameflow.productionDecisions[store.gameflow.turn] = {}
	store.gameflow.productionDecisions[store.gameflow.turn][playerIndex] = decisions
}
