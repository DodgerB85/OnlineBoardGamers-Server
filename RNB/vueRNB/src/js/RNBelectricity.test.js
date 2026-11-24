// Run with: npm test
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "vitest"
import { runInNewContext } from "node:vm"

test("explicit carried fuel leaves the board preference to default choices", () => {
	const source = readFileSync(join(import.meta.dirname, "RNBelectricity.js"), "utf8")
	const first = source.indexOf("export function getCarriedFuelOnTile")
	const last = source.indexOf("// Fuel one plant", first)
	const rf = { RES_TRUNKS: 0, RES_BOARDS: 1 }
	const trunk = { id: 0, uniqueID: "trunk", type: rf.RES_TRUNKS }
	const board = { id: 1, uniqueID: "board", type: rf.RES_BOARDS }
	const gold = { id: 2, uniqueID: "gold", type: 8 }
	const findFuel = runInNewContext(source.slice(first, last).replaceAll("export function", "function") + "findFuelOnTransporterOnTile", {
		rf,
		loc: { isSpecificHexLocation: (location, hexID) => location[1] === hexID },
		model: {
			getTransporterByID: (id) => ({ id, location: [7, 13] }),
			resourcesOnTransport: (id) => id === 0 ? [trunk, board, gold] : [],
		},
	})

	assert.equal(findFuel(0, 13), board)
	assert.equal(findFuel(0, 13, 0), trunk)
	assert.equal(findFuel(0, 13, "trunk"), trunk)
	assert.equal(findFuel(0, 13, "gold"), null)
	assert.equal(findFuel(0, 12, "trunk"), null)
	assert.equal(findFuel(1, 13, "trunk"), null)
})

test("a transporter on the wrong river bank cannot fuel the plant", () => {
	const source = readFileSync(join(import.meta.dirname, "RNBelectricity.js"), "utf8")
	const first = source.indexOf("export function getCarriedFuelOnTile")
	const last = source.indexOf("// Fuel one plant", first)
	const rf = { RES_TRUNKS: 0, RES_BOARDS: 1, LOCATION_BUCKET: 2 }
	const board = { id: 1, uniqueID: "board", type: rf.RES_BOARDS }
	const findFuel = runInNewContext(source.slice(first, last).replaceAll("export function", "function") + "findFuelOnTransporterOnTile", {
		rf,
		util: { includesArray: (arr, item) => arr.some((entry) => entry[0] === item[0] && entry[1] === item[1] && entry[2] === item[2]) },
		loc: {
			isSpecificHexLocation: (location, hexID) => location[1] === hexID,
			isBucketLocation: (location) => location[0] === rf.LOCATION_BUCKET,
			getEligibleLocationsForInteractionWithinHexFromSingleLocation: (location) => [[rf.LOCATION_BUCKET, location[1], location[2]]],
		},
		model: {
			getTransporterByID: (id) => ({ id, location: [7, 13, id], ownerIndex: 0 }),
			resourcesOnTransport: (id) => (id === 0 ? [board] : []),
		},
	})

	assert.equal(findFuel(0, 13, undefined, 0), board, "transporter on the plant's bank can fuel it")
	assert.equal(findFuel(0, 13, undefined, 1), null, "transporter on the other bank cannot fuel it")
	assert.equal(findFuel(1, 13, undefined, 0), null, "a transporter without fuel cannot fire")
})

test("power line buckets only cross a river through a bridge; a city is one node", () => {
	const source = readFileSync(join(import.meta.dirname, "RNBelectricity.js"), "utf8")
	const first = source.indexOf("const CITY_POWER_NODE")
	const last = source.indexOf("// Recompute the energised set", first)
	const rf = { CITY: 20 }
	const hexA = { hexID: 0, hexTerrainID: 1, bucketIdsCurrent: [0, 1], nodeBucketIds: [0, 1], cornerNodeIds: [[0, 1]] }
	const hexB = { hexID: 1, hexTerrainID: 1, bucketIdsCurrent: [0, 1], nodeBucketIds: [0, 1], cornerNodeIds: [[0, 1]] }
	const store = { mapData: { edgeData: [{ edgeHexIDs: [0, 1], joiningSides: [0, 0], hasPowerLine: [true, false] }] } }
	const loc = {
		isAnyHexLocation: (location) => Array.isArray(location) && location.length >= 2,
		isBucketLocation: (location) => location[0] === 2,
		isNonRiverVertexLocation: () => false,
	}
	const network = runInNewContext(source.slice(first, last).replaceAll("export function", "function") + "({getPowerLineBucketAdjacencies, computePoweredBucketKeys, getLocationPowerNodeKey})", {
		rf,
		loc,
		model: { getHexByID: (id) => [hexA, hexB][id] },
		useModelStore: () => store,
	})

	let keys = network.computePoweredBucketKeys([[2, 0, 0]])
	assert.deepEqual(new Set(keys), new Set(["0:0", "1:1"]), "the line connects only lane 0's banks")
	assert.ok(keys.includes("1:1"), "the producer on the powered bank is powered")
	assert.ok(!keys.includes("1:0"), "the producer on the far bank is not powered")

	// A bridge merges the two banks of each hex, so the same lane now reaches both.
	hexA.bucketIdsCurrent = [0, 0]
	hexB.bucketIdsCurrent = [0, 0]
	keys = network.computePoweredBucketKeys([[2, 0, 0]])
	assert.ok(keys.includes("1:0"), "the far bank is powered once the bridge merges the buckets")

	// A city is a single power node: the plant's bucket powers the other building.
	store.mapData.edgeData = []
	hexA.hexTerrainID = rf.CITY
	assert.equal(network.getLocationPowerNodeKey([2, 0, 1]), "0:city")
	assert.deepEqual([...network.computePoweredBucketKeys([[2, 0, 1]])], ["0:city"])
})

test("plant fuel uses the plant's bank and leaves only usable city trunks to the sawmill", () => {
	const source = readFileSync(join(import.meta.dirname, "RNBelectricity.js"), "utf8")
	const first = source.indexOf("function citySawmillTrunkCapacity")
	const last = source.indexOf("export function getCarriedFuelOnTile", first)
	const rf = { RES_TRUNKS: 0, RES_BOARDS: 1, CITY: 20, LOCATION_BUCKET: 2, BLDG_SAWMILL: 51 }
	const hexes = {
		0: { hexID: 0, hexTerrainID: 1 },
		5: { hexID: 5, hexTerrainID: rf.CITY },
	}
	const resources = []
	const buildings = []
	const findFreeFuel = runInNewContext(source.slice(first, last).replaceAll("export function", "function") + "findFreeFuelOnTile", {
		rf,
		util: { includesArray: (arr, item) => arr.some((entry) => entry[0] === item[0] && entry[1] === item[1] && entry[2] === item[2]) },
		model: {
			getHexByID: (id) => hexes[id],
			getAllInGameBuildings: () => buildings,
			getAllInGameResources: () => resources,
			getBuildingStatsFromBuildingID: () => ({ maxConversions: 3 }),
			getManagerProductionMultiplierForHex: () => 1,
		},
		loc: { getEligibleLocationsForInteractionWithinHexFromSingleLocation: (location) => [location] },
	})

	resources.push({ type: rf.RES_BOARDS, location: [rf.LOCATION_BUCKET, 0, 0] })
	resources.push({ type: rf.RES_TRUNKS, location: [rf.LOCATION_BUCKET, 0, 1] })
	assert.equal(findFreeFuel(0, 0).type, rf.RES_BOARDS, "board on the plant's bank is used first")
	resources.splice(0, 1)
	assert.equal(findFreeFuel(0, 0), null, "trunk on the other river bank is not used")

	resources.splice(0, 1)
	resources.push({ type: rf.RES_TRUNKS, location: [rf.LOCATION_BUCKET, 5, 0] })
	buildings.push({ id: 0, type: rf.BLDG_SAWMILL, location: [rf.LOCATION_BUCKET, 5, 0] })
	assert.equal(findFreeFuel(5, 0), null, "a city sawmill keeps a trunk it can use")
	resources.push({ type: rf.RES_TRUNKS, location: [rf.LOCATION_BUCKET, 5, 0] })
	resources.push({ type: rf.RES_TRUNKS, location: [rf.LOCATION_BUCKET, 5, 0] })
	assert.equal(findFreeFuel(5, 0), null, "all three trunks fit the sawmill")
	resources.push({ type: rf.RES_TRUNKS, location: [rf.LOCATION_BUCKET, 5, 0] })
	assert.equal(findFreeFuel(5, 0).type, rf.RES_TRUNKS, "a fourth, surplus trunk can fire the plant")
	resources.push({ type: rf.RES_BOARDS, location: [rf.LOCATION_BUCKET, 5, 0] })
	assert.equal(findFreeFuel(5, 0).type, rf.RES_BOARDS, "the plant may still use a board first")
})
