/**
 * Roads & Boats - Electricity ruleset
 *
 * Power plants must be fuelled once per turn (1 trunk or 1 board) at the very
 * start of the production phase. A fuelled ("working") power plant doubles the
 * output of every primary producer that sits on a hex connected to it through
 * the power line network.
 *
 * Power lines are stored per hex-boundary in `edgeData[].hasPowerLine`, exactly
 * like roads (`hasRoad`). The network itself is a hex-level graph: two hexes
 * are adjacent when the power line edge between them has any lane active.
 *
 * State:
 *  - `bldg.powerActive`            transient flag: this plant is working this phase
 *  - `bldg.pendingTransporterFuel` optional transporter ID chosen by the player to
 *                                    supply 1 wood instead of free tile fuel
 *  - `store.context.poweredHexIDs` hexes energised for the current production phase
 *  - `store.context.powerPlantsFueledTurn` idempotency guard (fuel once per turn)
 */

import { useModelStore } from "../stores/RNBstore.js"

import * as rf from "./RNBreference.js"
import * as model from "./RNBmodel.js"
import * as loc from "./RNBlocation.js"
import * as stack from "./RNBstack.js"

export function isElectricityEnabled() {
	return useModelStore().gameOptions.useElectricity
}

export function isPowerPlant(building) {
	return building.type === rf.BLDG_POWER_PLANT
}

export function getAllPowerPlants() {
	return model.getAllInGameBuildings().filter(isPowerPlant)
}

// ============================================================================
// NETWORK CONNECTIVITY
// ============================================================================

// Hex-level adjacency built from the power line edges. An edge connects two
// hexes whenever at least one of its lanes (river edges have two banks) is lit.
export function getPowerLineAdjacencies() {
	const store = useModelStore()
	const adj = {}
	for (const edge of store.mapData.edgeData) {
		if (!edge.hasPowerLine) continue
		const hasLine = Array.isArray(edge.hasPowerLine) ? edge.hasPowerLine.some(Boolean) : edge.hasPowerLine
		if (!hasLine) continue
		const [a, b] = edge.edgeHexIDs
		if (!adj[a]) adj[a] = []
		if (!adj[b]) adj[b] = []
		adj[a].push(b)
		adj[b].push(a)
	}
	return adj
}

// BFS over power line edges from every hex containing a working power plant.
// Returns the set of hexes that are energised this production phase.
export function computePoweredHexIDs(workingPlantHexIDs) {
	const adj = getPowerLineAdjacencies()
	const powered = new Set()
	const queue = []
	for (const h of workingPlantHexIDs) {
		if (!powered.has(h)) {
			powered.add(h)
			queue.push(h)
		}
	}
	while (queue.length > 0) {
		const cur = queue.shift()
		for (const nxt of adj[cur] || []) {
			if (!powered.has(nxt)) {
				powered.add(nxt)
				queue.push(nxt)
			}
		}
	}
	return [...powered]
}

// Recompute the energised hex set from the current power plant states.
export function computePoweredStateFromActivePlants() {
	const store = useModelStore()
	const workingPlantHexIDs = getAllPowerPlants()
		.filter((b) => b.powerActive === true)
		.map((b) => b.location[1])
	store.context.poweredHexIDs = computePoweredHexIDs(workingPlantHexIDs)
	return store.context.poweredHexIDs
}

export function isHexPowered(hexID) {
	const store = useModelStore()
	return (store.context.poweredHexIDs || []).includes(hexID)
}

// ============================================================================
// FUELING
// ============================================================================

// Free fuel sitting on the power plant's tile. Board is preferred over trunk,
// per the auto-consumption priority rule. "On the tile" means anywhere on the
// plant's hex (any bucket) - fuel dropped by a departing transporter frequently
// lands in a different bucket than the building itself.
function findFreeFuelOnTile(hexID, bucketID) {
	const resources = model.getAllInGameResources()
	for (const fuelType of [rf.RES_BOARDS, rf.RES_TRUNKS]) {
		// Prefer fuel in the plant's own bucket, but accept any fuel on the hex
		const res = resources.find((r) => r.type === fuelType && loc.isBucketLocation(r.location) && r.location[1] === hexID && r.location[2] === bucketID)
		if (res) return res
		const resAnyBucket = resources.find((r) => r.type === fuelType && loc.isBucketLocation(r.location) && r.location[1] === hexID)
		if (resAnyBucket) return resAnyBucket
	}
	return null
}

// Fuel supplied from a transporter on the same tile (player override).
function findFuelOnTransporterOnTile(transporterID, hexID) {
	if (transporterID === -1) return null
	const transporterObj = model.getTransporterByID(transporterID)
	if (!transporterObj) return null
	if (!loc.isSpecificHexLocation(transporterObj.location, hexID)) return null
	const resources = model.resourcesOnTransport(transporterObj.id)
	for (const fuelType of [rf.RES_BOARDS, rf.RES_TRUNKS]) {
		const res = resources.find((r) => r.type === fuelType)
		if (res) return res
	}
	return null
}

// Player hook for the Transporter Override: choose a transporter on the plant's
// tile to supply 1 wood at the start of the production phase.
export function setPowerPlantTransporterFuel(buildingID, transporterID) {
	const bldg = model.getBuildingByID(buildingID)
	if (bldg && isPowerPlant(bldg)) bldg.pendingTransporterFuel = transporterID
}

// Fuel every power plant for this production phase. Called at the very start of
// the production phase (before mines and primaries pull). Idempotent per turn.
//
// Auto-consumption priority:
//   1. Fuel freely sitting on the plant's tile is consumed automatically
//      (a board before a trunk).
//   2. Otherwise a player-set Transporter Override supplies 1 wood from a
//      transporter on the tile.
//   3. Otherwise the plant is inactive this turn.
//
// Returns fuel history entries:
//   [bldgID, compressedLoc, fuelResID]
// The fuelResID lets history show exactly which fuel the plant consumed.
export function fuelPowerPlants() {
	const store = useModelStore()
	if (!isElectricityEnabled()) {
		store.context.poweredHexIDs = []
		return []
	}
	if (store.context.powerPlantsFueledTurn === store.gameflow.turn) return []

	store.context.powerPlantsFueledTurn = store.gameflow.turn

	const fuelEntries = []
	for (const bldg of getAllPowerPlants()) {
		bldg.powerActive = false
		bldg.powerFuelType = -1
		const overrideTransporterID = bldg.pendingTransporterFuel || -1
		bldg.pendingTransporterFuel = -1

		const hexID = bldg.location[1]
		const bucketID = bldg.location[2]
		let consumed = null

		// 1. Auto-consume free fuel on the tile (board preferred)
		consumed = findFreeFuelOnTile(hexID, bucketID)

		// 2. Transporter override - only used when no free fuel is on the tile
		if (!consumed && overrideTransporterID !== -1) {
			consumed = findFuelOnTransporterOnTile(overrideTransporterID, hexID)
		}

		if (consumed) {
			bldg.powerActive = true
			bldg.powerFuelType = consumed.type
			consumed.location = loc.setOOBlocation()
			fuelEntries.push([bldg.id, stack.compressLocation(bldg.location), consumed.id])
		}
	}

	computePoweredStateFromActivePlants()
	return fuelEntries
}

// Clear all transient power state at the end of the production phase.
export function resetPowerState() {
	const store = useModelStore()
	store.context.poweredHexIDs.splice(0)
	store.context.powerPlantsFueledTurn = -1
	for (const bldg of getAllPowerPlants()) {
		bldg.powerActive = false
		bldg.powerFuelType = -1
		bldg.pendingTransporterFuel = -1
	}
}
