/**
 * Production setup pre-phase
 *
 * At the start of the production phase, in turn order, each player announces:
 *  - whether managers carried by their transporters activate on a tile
 *  - which of their transporters (if any) burns wood to fire a power plant
 *
 * The announcement is recorded as the first action in the player's production
 * stack, so pre-set moves carry it and it is re-verified when loaded.
 *
 * shortcut: the choice is applied when that player's turn starts, so an earlier
 * player can take a primary before a later player fires its connected plant; the
 * later player's extra output is still added then. Upgrade by collecting every
 * pre-set choice at phase start if strict simultaneity is needed.
 */

import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"

import * as rf from "./RNBreference.js"
import * as model from "./RNBmodel.js"
import * as loc from "./RNBlocation.js"
import * as stack from "./RNBstack.js"
import * as produce from "./RNBproduce.js"
import * as electricity from "./RNBelectricity.js"

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
			.filter((t) => electricity.findFuelOnTransporterOnTile(t.id, hexID))
			.map((t) => ({ id: t.id, type: electricity.findFuelOnTransporterOnTile(t.id, hexID).type }))
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

function hasSetupActionInStack() {
	const store = useModelStore()
	return store.actionStack.some((a) => a.action === rf.STACK_PRODUCTION_SETUP)
}

export function isSetupPending() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!rf.PHASE_PRODUCTIONS.includes(store.gameflow.phase)) return false
	if (!store.gameOptions.useManagement && !store.gameOptions.useElectricity) return false
	if (!personal.canPlay()) return false
	if (hasSetupActionInStack()) return false
	const playerIndex = personal.pov
	if (playerIndex < 0) return false
	const isPrePhase = rf.ALL_PRE_PHASE_MAIN_PHASES.includes(store.gameflow.phase)
	if (!isPrePhase && !personal.trainingGame && !personal.soloGame && !store.gameflow.turnOrder.includes(playerIndex)) return false
	return getManagerChoices(playerIndex).length > 0 || getPlantChoices(playerIndex).length > 0
}

function wasMarbleQuarryProduction(bldgID) {
	const store = useModelStore()
	for (let i = store.history.length - 1; i >= 0; i--) {
		if (store.history[i][0] !== rf.HIST_PRE_PRODUCTION) continue
		const entry = (store.history[i][3]?.[0] || []).find((e) => e[0] === bldgID)
		return !!entry && entry.includes(-4)
	}
	return false
}

function addExtraPrimaryOutput(bldg) {
	if (bldg.type === rf.BLDG_MINE) {
		const result = produce.addBuildingOutputResourcesToGame_core(bldg.id, -1, 9, false, true)
		return result.length > 0 ? result[0][1] : -1
	}
	const bldgStats = model.getBuildingStatsFromBuildingID(bldg.id)
	let outputRes = bldgStats.outputRes[0]
	// The extra output matches the first one: its pre-production entry carries -4 for marble.
	if (bldg.type === rf.BLDG_QUARRY && wasMarbleQuarryProduction(bldg.id)) outputRes = rf.RES_MARBLE
	model.addResourceToGame_core(outputRes, bldg.location, 9)
	return outputRes
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
	for (const choice of plantChoices || []) {
		decisions.plants[choice.bldgID] = choice.transporterID
		if (choice.transporterID < 0) continue
		const bldg = model.getBuildingByID(choice.bldgID)
		if (!bldg) continue
		const poweredBefore = [...(store.context.poweredHexIDs || [])]
		const fuelEntry = electricity.firePowerPlantFromTransporter(choice.bldgID, choice.transporterID)
		if (!fuelEntry) continue
		const plantID = stack.getBldgIDtoUse(bldg)
		plantEntries.push([plantID, stack.getTransIDtoUse(model.getTransporterByID(choice.transporterID))])
		fuelEntries.push(fuelEntry)
		// A plant fired during setup was not working when primaries produced, so add
		// the missing second output now (and record which plant caused it).
		for (const hexID of store.context.poweredHexIDs || []) {
			if (poweredBefore.includes(hexID)) continue
			for (const primary of model.getAllInGameBuildings().filter((b) => b.location[1] === hexID && model.isPrimaryProducer(b))) {
				const outputRes = addExtraPrimaryOutput(primary)
				if (outputRes !== -1) extraOutputs.push([plantID, stack.getBldgIDtoUse(primary), stack.compressLocation(primary.location), outputRes])
			}
		}
	}

	if (!store.gameflow.productionDecisions[store.gameflow.turn]) store.gameflow.productionDecisions[store.gameflow.turn] = {}
	store.gameflow.productionDecisions[store.gameflow.turn][playerIndex] = decisions
	return [rf.STACK_PRODUCTION_SETUP, managerEntries, plantEntries, fuelEntries, extraOutputs]
}

// Re-apply a recorded setup action (other players' stack processing, pre-move
// loading and replay). Recorded extra outputs are forced so random mine pulls match.
export function performSetupStackAction(stackAction, playerIndex) {
	const store = useModelStore()
	if (!store.gameflow.productionDecisions) store.gameflow.productionDecisions = {}
	const decisions = getDecisionsForPlayer(playerIndex)
	if (!decisions.managers) decisions.managers = {}
	if (!decisions.plants) decisions.plants = {}

	for (const [hexID, active] of stackAction[1] || []) {
		decisions.managers[hexID] = active
		model.setManagerActivation(playerIndex, hexID, active)
	}
	for (const [bldgID, transporterID] of stackAction[2] || []) {
		decisions.plants[bldgID] = transporterID
		const fired = electricity.firePowerPlantFromTransporter(bldgID, transporterID)
		// The plant may already be working from tile fuel now; in that case the
		// pre-production output was already doubled and these extras must not be added.
		if (!fired) continue
		for (const [plantID, primaryID, , outputRes] of stackAction[4] || []) {
			if (plantID !== bldgID) continue
			const primary = model.getBuildingByID(primaryID)
			if (!primary) continue
			if (primary.type === rf.BLDG_MINE) produce.addBuildingOutputResourcesToGame_core(primaryID, outputRes, 9)
			else model.addResourceToGame_core(outputRes, primary.location, 9)
		}
	}

	if (!store.gameflow.productionDecisions[store.gameflow.turn]) store.gameflow.productionDecisions[store.gameflow.turn] = {}
	store.gameflow.productionDecisions[store.gameflow.turn][playerIndex] = decisions
}
