/**
 * Roads & Boats - Electricity ruleset
 *
 * Power plants are fuelled once per turn (1 trunk or 1 board) before they
 * provide power. Tile fuel is consumed automatically when the new turn's mines
 * are pulled (mines produce before the production conflict). A transporter can
 * supply wood instead during the production setup round, which runs after the
 * conflict turn order and before production (BGG 3715801, 3758406).
 *
 * A fuelled ("working") power plant doubles every primary producer connected
 * through the power line network. Power lines are stored per hex-boundary lane
 * in `edgeData[].hasPowerLine`, like roads. The network is bucket-level: a river
 * crossing only connects the two banks once a bridge has merged them. A city is
 * one power node, so a plant there powers the other building without a line
 * (BGG 808497).
 *
 * State:
 *  - `bldg.powerActive`            transient flag: this plant is working this phase
 *  - `bldg.powerFuelType`          the wood type consumed this phase (for history)
 *  - `store.context.poweredBucketKeys` powered bucket nodes for this production phase
 *  - `store.context.poweredHexIDs` hexes with a powered bucket (map colour only)
 *  - `store.context.powerPlantsFueledTurn` idempotency guard for tile fuel
 */

import { useModelStore } from "../stores/RNBstore.js"

import * as rf from "./RNBreference.js"
import * as model from "./RNBmodel.js"
import * as loc from "./RNBlocation.js"
import * as stack from "./RNBstack.js"
import * as util from "./RNButil.js"

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

// A power node is one bucket. A city is one node: a plant there powers the
// other building on the tile without a power line (Jeroen, BGG 808497).
const CITY_POWER_NODE = "city"

function powerNodeKey(hex, nodeId) {
	if (hex.hexTerrainID === rf.CITY) return `${hex.hexID}:${CITY_POWER_NODE}`
	if (nodeId === undefined || nodeId === null || nodeId < 0) return null
	const bucketID = hex.bucketIdsCurrent[hex.nodeBucketIds[nodeId]]
	if (bucketID === undefined || bucketID < 0) return null
	return `${hex.hexID}:${bucketID}`
}

export function getLocationPowerNodeKey(location) {
	if (!location || !loc.isAnyHexLocation(location)) return null
	const hex = model.getHexByID(location[1])
	if (!hex) return null
	if (loc.isBucketLocation(location)) return powerNodeKeyFromBucket(hex, location[2])
	if (loc.isNonRiverVertexLocation(location)) {
		const bucketID = hex.bucketIdsCurrent[hex.nodeBucketIds[location[2]]]
		return powerNodeKeyFromBucket(hex, bucketID)
	}
	return hex.hexTerrainID === rf.CITY ? `${hex.hexID}:${CITY_POWER_NODE}` : null
}

function powerNodeKeyFromBucket(hex, bucketID) {
	if (hex.hexTerrainID === rf.CITY) return `${hex.hexID}:${CITY_POWER_NODE}`
	if (bucketID === undefined || bucketID === null || bucketID < 0) return null
	return `${hex.hexID}:${bucketID}`
}

// Bucket-level adjacency built from the power line edges. River edges carry one
// lane per bank; a lane only joins the two banks when a bridge has merged them
// (in that case both sides resolve to the same current bucket).
export function getPowerLineBucketAdjacencies() {
	const store = useModelStore()
	const adj = {}
	function add(a, b) {
		if (!a || !b) return
		if (!adj[a]) adj[a] = []
		if (!adj[b]) adj[b] = []
		if (!adj[a].includes(b)) adj[a].push(b)
		if (!adj[b].includes(a)) adj[b].push(a)
	}
	for (const edge of store.mapData.edgeData) {
		const lanes = Array.isArray(edge.hasPowerLine) ? edge.hasPowerLine : [edge.hasPowerLine]
		if (!lanes.some(Boolean)) continue
		const hexA = model.getHexByID(edge.edgeHexIDs[0])
		const hexB = model.getHexByID(edge.edgeHexIDs[1])
		const sideA = edge.joiningSides?.[0]
		const sideB = edge.joiningSides?.[1]
		if (!hexA || !hexB || sideA === undefined || sideB === undefined) continue
		if (lanes.length === 1) {
			add(powerNodeKey(hexA, hexA.sideNodeIds[sideA]), powerNodeKey(hexB, hexB.sideNodeIds[sideB]))
			continue
		}
		for (let k = 0; k < lanes.length; k++) {
			if (!lanes[k]) continue
			const nodeA = hexA.hexTerrainID === rf.CITY ? null : hexA.cornerNodeIds?.[sideA]?.[k % 2]
			const nodeB = hexB.hexTerrainID === rf.CITY ? null : hexB.cornerNodeIds?.[sideB]?.[(k + 1) % 2]
			add(powerNodeKey(hexA, nodeA), powerNodeKey(hexB, nodeB))
		}
	}
	return adj
}

// BFS over power line buckets from every working power plant's bucket.
export function computePoweredBucketKeys(workingPlantLocations) {
	const adj = getPowerLineBucketAdjacencies()
	const powered = new Set()
	const queue = []
	for (const location of workingPlantLocations) {
		const key = getLocationPowerNodeKey(location)
		if (!key || powered.has(key)) continue
		powered.add(key)
		queue.push(key)
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

// Recompute the energised set from the current power plant states.
export function computePoweredStateFromActivePlants() {
	const store = useModelStore()
	const workingPlantLocations = getAllPowerPlants()
		.filter((b) => b.powerActive === true)
		.map((b) => b.location)
	const poweredBucketKeys = computePoweredBucketKeys(workingPlantLocations)
	store.context.poweredBucketKeys = poweredBucketKeys
	store.context.poweredHexIDs = [...new Set(poweredBucketKeys.map((key) => Number(String(key).split(":")[0])))]
	return poweredBucketKeys
}

export function isBucketPowered(hexID, bucketID) {
	const store = useModelStore()
	const hex = model.getHexByID(hexID)
	if (!hex) return false
	const key = hex.hexTerrainID === rf.CITY ? `${hexID}:${CITY_POWER_NODE}` : `${hexID}:${bucketID}`
	return (store.context.poweredBucketKeys || []).includes(key)
}

// Production uses the building's own bucket; map colouring uses isHexPowered.
export function isLocationPowered(location) {
	if (!location) return false
	if (loc.isBucketLocation(location)) return isBucketPowered(location[1], location[2])
	if (loc.isNonRiverVertexLocation(location)) {
		const hex = model.getHexByID(location[1])
		const bucketID = hex.bucketIdsCurrent[hex.nodeBucketIds[location[2]]]
		return isBucketPowered(location[1], bucketID)
	}
	return isHexPowered(location[1])
}

export function isHexPowered(hexID) {
	const store = useModelStore()
	return (store.context.poweredHexIDs || []).includes(hexID)
}

// ============================================================================
// FUELING
// ============================================================================

// shortcut: pre-conflict tile fuel cannot be replaced by a transporter to
// reorder a city good; the plant always leaves city trunks to the sawmill
// unless the sawmill cannot use them all.
function citySawmillTrunkCapacity(hexID) {
	const hex = model.getHexByID(hexID)
	if (hex.hexTerrainID !== rf.CITY) return 0
	const managerMultiplier = model.getManagerProductionMultiplierForHex(hexID)
	return model
		.getAllInGameBuildings()
		.filter((b) => b.location[1] === hexID && b.type === rf.BLDG_SAWMILL)
		.reduce((capacity, bldg) => capacity + model.getBuildingStatsFromBuildingID(bldg.id).maxConversions * managerMultiplier, 0)
}

function findAccessibleFuels(hexID, bucketID, fuelType) {
	const locations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation([rf.LOCATION_BUCKET, hexID, bucketID], false, 9)
	return model.getAllInGameResources().filter((r) => r.type === fuelType && util.includesArray(locations, r.location))
}

function findAccessibleFuel(hexID, bucketID, fuelType) {
	return findAccessibleFuels(hexID, bucketID, fuelType)[0] ?? null
}

function citySawmillCanUseAllTrunks(hexID, bucketID) {
	const capacity = citySawmillTrunkCapacity(hexID)
	if (capacity <= 0) return false
	return findAccessibleFuels(hexID, bucketID, rf.RES_TRUNKS).length <= capacity
}

// Free fuel sitting on the plant's tile. Board is preferred over trunk, and
// only the plant's own side of a river is accessible. A city sawmill gets first
// use of the trunks, but a surplus trunk may fire the plant.
export function findFreeFuelOnTile(hexID, bucketID) {
	for (const fuelType of [rf.RES_BOARDS, rf.RES_TRUNKS]) {
		if (fuelType === rf.RES_TRUNKS && citySawmillCanUseAllTrunks(hexID, bucketID)) continue
		const res = findAccessibleFuel(hexID, bucketID, fuelType)
		if (res) return res
	}
	return null
}

export function getCarriedFuelOnTile(transporter, hexID, bucketID) {
	if (!transporter || !loc.isSpecificHexLocation(transporter.location, hexID)) return []
	// A land/docked transporter on the far bank cannot hand goods to the plant.
	// A boat in the river reaches both banks, so it still passes this check.
	if (bucketID !== undefined && bucketID !== null) {
		const plantBuckets = loc
			.getEligibleLocationsForInteractionWithinHexFromSingleLocation([rf.LOCATION_BUCKET, hexID, bucketID], false, 9)
			.filter((location) => loc.isBucketLocation(location))
		const reachable = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporter.location, false, transporter.ownerIndex)
		if (!plantBuckets.some((location) => util.includesArray(reachable, location))) return []
	}
	return model.resourcesOnTransport(transporter.id).filter((res) => res.type === rf.RES_BOARDS || res.type === rf.RES_TRUNKS)
}

// A transporter click and older saved moves use the default fuel.
export function findFuelOnTransporterOnTile(transporterID, hexID, fuelID, bucketID) {
	if (transporterID === -1) return null
	const transporter = model.getTransporterByID(transporterID)
	if (!transporter) return null
	const fuel = getCarriedFuelOnTile(transporter, hexID, bucketID)
	if (fuelID !== undefined) return fuel.find((res) => res.id === fuelID || res.uniqueID === fuelID) ?? null
	return fuel.find((res) => res.type === rf.RES_BOARDS) ?? fuel[0] ?? null
}

// Fuel one plant from a transporter during the owner's production setup.
// Returns the consumed fuel's history entry, or null when the plant cannot fire.
export function firePowerPlantFromTransporter(buildingID, transporterID, fuelID, playerIndex = null) {
	if (!isElectricityEnabled()) return null
	const bldg = model.getBuildingByID(buildingID)
	if (!bldg || !isPowerPlant(bldg) || bldg.powerActive === true) return null
	const transporter = model.getTransporterByID(transporterID)
	if (!transporter) return null
	if (playerIndex !== null && playerIndex !== undefined && transporter.ownerIndex !== playerIndex) return null
	const fuelRes = findFuelOnTransporterOnTile(transporterID, bldg.location[1], fuelID, bldg.location[2])
	if (!fuelRes) return null
	bldg.powerActive = true
	bldg.powerFuelType = fuelRes.type
	fuelRes.location = loc.setOOBlocation()
	computePoweredStateFromActivePlants()
	return [bldg.id, stack.compressLocation(bldg.location), fuelRes.id]
}

// Fuel every power plant for this production phase from tile fuel. Called when
// the new turn's mines are pulled (mines produce before the conflict). Idempotent
// per turn. A transporter can fuel a plant during the production setup instead.
//
// Auto-consumption priority:
//   1. Fuel freely sitting on the plant's own side of the tile is consumed
//      automatically (a board before a trunk).
//   2. In a city, a sawmill keeps its trunks (city production order).
//   3. Otherwise the plant is inactive this turn.
//
// Returns fuel history entries:
//   [bldgID, compressedLoc, fuelResID]
// The fuelResID lets history show exactly which fuel the plant consumed.
export function fuelPowerPlants() {
	const store = useModelStore()
	if (!isElectricityEnabled()) {
		store.context.poweredHexIDs = []
		store.context.poweredBucketKeys = []
		return []
	}
	if (store.context.powerPlantsFueledTurn === store.gameflow.turn) return []

	store.context.powerPlantsFueledTurn = store.gameflow.turn

	const fuelEntries = []
	for (const bldg of getAllPowerPlants()) {
		bldg.powerActive = false
		bldg.powerFuelType = -1

		const consumed = findFreeFuelOnTile(bldg.location[1], bldg.location[2])

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
	store.context.poweredBucketKeys.splice(0)
	store.context.powerPlantsFueledTurn = -1
	for (const bldg of getAllPowerPlants()) {
		bldg.powerActive = false
		bldg.powerFuelType = -1
	}
}
