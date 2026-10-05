/**
 * CITY build rules:
 * - A moat BRIDGE can be built on its own (1 stone), from the city itself or from
 *   a neighbouring hex facing the crossing.
 * - A ROAD to/from a city requires the moat bridge on that side to be built first
 *   (offer layer + STACK_BUILD_ROAD verify return 4).
 * - A POWER LINE to/from a city likewise requires the bridge (verify return 4).
 * - The combined bridge+road (2 stone) still exists as one action.
 * - Walls on a city edge require bridge AND road on that side.
 *
 * Run with:
 *     node --test tests/city-build.test.js
 */
import test from "node:test"
import assert from "node:assert/strict"
import { register } from "node:module"

// The source uses vite-style extensionless imports, so teach node how to resolve them.
const loaderSource = `
import { existsSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import path from "node:path"
export async function resolve(specifier, context, nextResolve) {
	if ((specifier.startsWith(".") || specifier.startsWith("/")) && !path.extname(specifier)) {
		const parent = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd()
		const base = specifier.startsWith("/") ? specifier : path.resolve(path.dirname(parent), specifier)
		if (existsSync(base + ".js")) return { url: pathToFileURL(base + ".js").href, shortCircuit: true }
	}
	return nextResolve(specifier, context)
}
`
register("data:text/javascript," + encodeURIComponent(loaderSource), import.meta.url)

// Minimal browser surface the RNB code expects (same as ghost-turn.test.js).
globalThis.window = globalThis.window || {}
globalThis.window.atob = globalThis.window.atob || globalThis.atob
globalThis.window.btoa = globalThis.window.btoa || globalThis.btoa
globalThis.window.initData = {
	pov: 0,
	playerNames: [],
	gameID: 1,
	gameName: "city-build-test",
	gameCreationTimestamp: 0,
	finishedGame: false,
	startingMap: [],
	startingOptions: [],
	preferredRNBoptions: {},
	currentMoveData: {},
	allMyMoveData: [],
	allStackData: [],
	currentPlayers: [],
	transactionID: "",
	kickoutRequired: 0,
	secondsToNextKickout: 99999,
	notes: "",
	yourTurnAudioType: 0,
	myStatsExcludeConsent: 0,
	statsExcludedGame: false,
}
function makeElementStub() {
	return {
		style: {},
		classList: { add: () => {}, remove: () => {}, contains: () => false },
		setAttribute: () => {},
		appendChild: () => {},
		removeChild: () => {},
		innerHTML: "",
		textContent: "",
		content: { firstChild: null },
		firstChild: null,
		children: [],
		parentNode: null,
	}
}
globalThis.document = globalThis.document || {
	cookie: "",
	getElementById: () => null,
	querySelector: () => null,
	querySelectorAll: () => [],
	documentElement: { clientWidth: 800, clientHeight: 600 },
	createElement: () => makeElementStub(),
	createElementNS: () => makeElementStub(),
	createTextNode: () => ({}),
	createComment: () => ({}),
	body: makeElementStub(),
	head: makeElementStub(),
}
globalThis.window.document = globalThis.window.document || globalThis.document
globalThis.alert = globalThis.alert || (() => {})
globalThis.msgpack = globalThis.msgpack || {
	encode: (value) => new TextEncoder().encode(JSON.stringify(value)),
	decode: (buffer) => JSON.parse(new TextDecoder().decode(buffer)),
}

let rf, hd, map, build, model, graph, stack, useModelStore, usePersonalStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js")
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	hd = await import("../src/js/RNBhex.js")
	map = await import("../src/js/RNBmap.js")
	build = await import("../src/js/RNBbuild.js")
	model = await import("../src/js/RNBmodel.js")
	graph = await import("../src/js/RNBgraph.js")
	stack = await import("../src/js/RNBstack.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
	;({ usePersonalStore } = await import("../src/stores/RNBpersonal.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

// A 3-hex map: hex 0 is a CITY at [0,0,0]; hex 1 (pasture) is across the city's
// side 2 at [0,1,-1] (city bridge [3,9]); hex 2 (pasture) is across the city's
// side 1 at [1,0,-1] (city bridge [2,8]). A donkey sits on the city centre with
// stone to build with.
function setupCityMap() {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.soloGame = true
	personal.pov = 0

	store.players.splice(0)
	store.players.push({ name: "A", displayName: "", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.gameflow.turn = 1
	store.gameflow.phase = rf.PHASE_BUILDING_TO
	store.gameflow.turnOrder = [0]
	store.gameflow.fullTurnOrder = [0]

	store.mapData.hexData.splice(0)
	store.mapData.edgeData.splice(0)
	store.ALL_RESOURCES.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_TRANSPORTERS.splice(0)

	const city = hd.createActualHex([0, 0, 0], 0, rf.CITY)
	city.hexID = 0
	store.mapData.hexData.push(city)
	const pasture1 = hd.createActualHex([0, 1, -1], 0, rf.PASTURE_1)
	pasture1.hexID = 1
	store.mapData.hexData.push(pasture1)
	const pasture2 = hd.createActualHex([1, 0, -1], 0, rf.PASTURE_1)
	pasture2.hexID = 2
	store.mapData.hexData.push(pasture2)

	// City side 2 -> pasture1, city side 1 -> pasture2
	map.addNewEdge([0, 1])
	map.addNewEdge([0, 2])

	store.ALL_TRANSPORTERS.push({
		id: 0,
		type: rf.DONKEY,
		uniqueID: "00031000000",
		location: [rf.LOCATION_LAND_VERTEX, 0, 0],
		remainingMoves: 2,
		ownerIndex: 0,
		movedThisTurn: false,
		justPickedUpFromLocation: [],
	})
	for (let i = 0; i < 3; i++) model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 0, 0], 0)

	store.context.selectedTransporterIDforTM = 0
	return { store }
}

test("on a fresh city: bridge and bridge+road offered, standalone road and wall are not", { skip: skip }, () => {
	const { store } = setupCityMap()

	build.setEligibleItemsToBuild(0, 0)

	const options = store.context.eligibleBuildingsToBuild
	assert.ok(options.includes(rf.BLDG_PSEUDO_BRIDGE), "bridge (1 stone) is offered")
	assert.ok(options.includes(rf.BLDG_PSEUDO_ROAD_BRIDGE), "bridge+road (2 stone) is offered")
	assert.ok(!options.includes(rf.BLDG_PSEUDO_ROAD), "standalone road is NOT offered before any bridge exists")
	assert.ok(!options.includes(rf.BLDG_PSEUDO_WALL), "wall is NOT offered before a bridge+road exists")
})

test("combined bridge+road from the city: walls gated to that side only", { skip: skip }, () => {
	const { store } = setupCityMap()

	map.addRoadBridgeToMap(0, [3, 9])

	const cityHex = store.mapData.hexData[0]
	assert.ok(arrEq(cityHex.builtBridges, [3, 9]), "the moat bridge was built on the city")
	const edgeToPasture1 = edgeBetween(store, 0, 1)
	assert.equal(edgeToPasture1.hasRoad[0], true, "the road was built on the edge")
	assert.equal(store.ALL_RESOURCES.filter((r) => r.type === rf.RES_STONE && r.location[0] !== rf.LOCATION_OOB).length, 1, "2 stone were deducted")

	const edgeToPasture2 = edgeBetween(store, 0, 2)
	assert.equal(map.cityEdgeHasBridgeAndRoad(0, edgeToPasture1), true, "bridge+road side is wall-eligible")
	assert.equal(map.cityEdgeHasBridgeAndRoad(0, edgeToPasture2), false, "side without bridge+road is NOT wall-eligible")

	build.setEligibleItemsToBuild(0, 0)
	const options = store.context.eligibleBuildingsToBuild
	assert.ok(options.includes(rf.BLDG_PSEUDO_WALL), "wall option is offered after a bridge+road exists")
	assert.ok(!options.includes(rf.BLDG_PSEUDO_ROAD_BRIDGE), "no further bridge+road offered (only 1 stone left)")
	assert.ok(!options.includes(rf.BLDG_PSEUDO_ROAD), "standalone road still NOT offered (no bridge on the other side)")
	assert.ok(options.includes(rf.BLDG_PSEUDO_BRIDGE), "bridge still offered for the remaining sides")
})

test("road to/from a city is rejected by verify without a bridge, allowed after a standalone bridge", { skip: skip }, () => {
	const { store } = setupCityMap()

	// A road from the city to pasture2 (city side 1) with NO bridge must fail verify
	const roadActionNoBridge = {
		action: rf.STACK_BUILD_ROAD,
		historyEntry: [rf.STACK_BUILD_ROAD, 0, [0], [2]],
		playerIndex: 0,
	}
	assert.equal(stack.verifySingleStackAction(roadActionNoBridge), 4, "road verify returns 4 (no city bridge)")

	// The road is not even offered before the bridge
	build.setEligibleItemsToBuild(0, 0)
	assert.ok(!store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_ROAD), "standalone road not offered without a bridge")

	// Build a standalone bridge on the city's side 1 (1 stone)
	map.addBridgeToMap(0, [2, 8], true)
	assert.equal(store.ALL_RESOURCES.filter((r) => r.type === rf.RES_STONE && r.location[0] !== rf.LOCATION_OOB).length, 2, "1 stone deducted for the bridge")

	// Now the standalone road is offered towards pasture2
	build.setEligibleItemsToBuild(0, 0)
	assert.ok(store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_ROAD), "standalone road offered once the bridge exists")

	// ...and verify now accepts the road
	assert.equal(stack.verifySingleStackAction(roadActionNoBridge), 0, "road verify passes after the bridge")

	// Build the road for real, then the wall rule unlocks on that side
	map.addRoadToMap([0, 0], [2, 0], true)
	const edgeToPasture2 = edgeBetween(store, 0, 2)
	assert.equal(edgeToPasture2.hasRoad[0], true, "road built to pasture2")
	assert.equal(map.cityEdgeHasBridgeAndRoad(0, edgeToPasture2), true, "bridge+road side is wall-eligible")
	build.setEligibleItemsToBuild(0, 0)
	assert.ok(store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_WALL), "wall offered after bridge + road")
})

test("power line to/from a city requires the moat bridge", { skip: skip }, () => {
	const { store } = setupCityMap()
	store.gameOptions.useElectricity = true
	model.addResourceToGame_core(rf.RES_IRON, [rf.LOCATION_BUCKET, 0, 0], 0)
	model.addResourceToGame_core(rf.RES_IRON, [rf.LOCATION_BUCKET, 0, 0], 0)

	build.setEligibleItemsToBuild(0, 0)
	assert.ok(!store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_POWER_LINE), "power line NOT offered without a city bridge")

	const plActionNoBridge = {
		action: rf.STACK_BUILD_POWER_LINE,
		historyEntry: [rf.STACK_BUILD_POWER_LINE, 0, [0], [2]],
		playerIndex: 0,
	}
	assert.equal(stack.verifySingleStackAction(plActionNoBridge), 4, "power line verify returns 4 (no city bridge)")

	map.addBridgeToMap(0, [2, 8], true)

	build.setEligibleItemsToBuild(0, 0)
	assert.ok(store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_POWER_LINE), "power line offered once the bridge exists")
	assert.equal(stack.verifySingleStackAction(plActionNoBridge), 0, "power line verify passes after the bridge")
})

test("bridge-only to a city can be built from a neighbouring hex", { skip: skip }, () => {
	const { store } = setupCityMap()

	// Donkey on pasture1 facing the city, with 1 stone
	store.ALL_TRANSPORTERS.push({
		id: 1,
		type: rf.DONKEY,
		uniqueID: "00031000001",
		location: [rf.LOCATION_LAND_VERTEX, 1, 3],
		remainingMoves: 2,
		ownerIndex: 0,
		movedThisTurn: false,
		justPickedUpFromLocation: [],
	})
	model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 1, 0], 0)

	build.setEligibleItemsToBuild(0, 1)
	assert.ok(store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_BRIDGE), "bridge offered from the neighbour")

	// Build the city's moat bridge from the neighbour side (1 stone)
	map.addBridgeToMap(0, [3, 9], true)
	const cityHex = store.mapData.hexData[0]
	assert.ok(arrEq(cityHex.builtBridges, [3, 9]), "the moat bridge was built on the city from the neighbour")

	// ...and replay verification accepts a bridge built from the neighbouring hex
	const bridgeAction = {
		action: rf.STACK_BUILD_BRIDGE,
		historyEntry: [rf.STACK_BUILD_BRIDGE, 1, 0, 2],
		playerIndex: 0,
	}
	assert.equal(stack.verifySingleStackAction(bridgeAction), 3, "rebuilding the same bridge is rejected")
})

test("combined bridge+road from a neighbouring hex still works (regression)", { skip: skip }, () => {
	const { store } = setupCityMap()

	store.ALL_TRANSPORTERS.push({
		id: 1,
		type: rf.DONKEY,
		uniqueID: "00031000001",
		location: [rf.LOCATION_LAND_VERTEX, 1, 3],
		remainingMoves: 2,
		ownerIndex: 0,
		movedThisTurn: false,
		justPickedUpFromLocation: [],
	})
	model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 1, 0], 0)
	model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 1, 0], 0)

	build.setEligibleItemsToBuild(0, 1)
	assert.ok(store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_ROAD_BRIDGE), "bridge+road offered from the neighbour")

	store.context.selectedTransporterIDforTM = 1
	map.addRoadBridgeToMap(0, [3, 9])
	const cityHex = store.mapData.hexData[0]
	assert.ok(arrEq(cityHex.builtBridges, [3, 9]), "bridge built from the neighbour side too")
})

test("on a city: after the bridge+road a land transporter can move out onto the neighbour", { skip: skip }, () => {
	const { store } = setupCityMap()

	map.addRoadBridgeToMap(0, [3, 9])

	const g = graph.createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, 0)
	const donkey = rf.getTransporterStats(rf.DONKEY)
	const result = graph.pathfind(g, [rf.LOCATION_LAND_VERTEX, 0, 0], donkey.validMove, 2)
	const reachedPasture1 = result.locations.some((l) => l[0] === rf.LOCATION_LAND_VERTEX && l[1] === 1)
	assert.ok(reachedPasture1, "the neighbour hex is reachable from the city centre after the bridge+road")
})

// City + pasture (side 2) + sea (side 5): no bridge or road may exit into the sea
function setupCitySeaMap() {
	const { store } = setupCityMap()
	const sea = hd.createActualHex([0, -1, 1], 0, rf.SEA_1)
	sea.hexID = 3
	store.mapData.hexData.push(sea)
	map.addNewEdge([0, 3])
	return { store }
}

test("city cannot bridge or road into a sea hex", { skip: skip }, () => {
	const { store } = setupCitySeaMap()

	const options = map.getEligibleCityExitBridges(0)
	assert.equal(options.length, 2, "only the two land sides offer a bridge+road")
	assert.ok(options.every((o) => o.citySide !== 5), "the sea side offers nothing")

	// Sea side: also no standalone road (terrain gate) and no city bridge gate bypass
	const roadTargets = map.allLandVertexBucketsWithoutRoadsAdjacentTo(0, [0])
	assert.ok(roadTargets.every((t) => t[0] !== 3), "no road target on the sea hex")

	// And a transporter at sea cannot build a city bridge either
	store.ALL_TRANSPORTERS.push({
		id: 1,
		type: rf.ROWBOAT,
		uniqueID: "00034000001",
		location: [rf.LOCATION_SEA_VERTEX, 3, 7],
		remainingMoves: 4,
		ownerIndex: 0,
		movedThisTurn: false,
		justPickedUpFromLocation: [],
	})
	model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 3, 0], 0)
	assert.deepEqual(map.getCityBridgesBuildableFrom(3, [0]), [], "a boat at sea cannot build a city moat bridge")
	assert.deepEqual(map.getEligibleCityNeighbourBridges(3), [], "a boat at sea cannot start a bridge+road into the city")
})

// City + straight river (side 2; the river's side-5 exit faces the city):
// that side must offer two bridge+road options, one per bank
function setupCityRiverMap() {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.soloGame = true
	personal.pov = 0

	store.players.splice(0)
	store.players.push({ name: "A", displayName: "", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.gameflow.turn = 1
	store.gameflow.phase = rf.PHASE_BUILDING_TO
	store.gameflow.turnOrder = [0]
	store.gameflow.fullTurnOrder = [0]

	store.mapData.hexData.splice(0)
	store.mapData.edgeData.splice(0)
	store.ALL_RESOURCES.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_TRANSPORTERS.splice(0)

	const city = hd.createActualHex([0, 0, 0], 0, rf.CITY)
	city.hexID = 0
	store.mapData.hexData.push(city)
	const river = hd.createActualHex([0, 1, -1], 0, rf.PASTURE_RIVER_STRAIGHT)
	river.hexID = 1
	store.mapData.hexData.push(river)

	map.addNewEdge([0, 1])

	store.ALL_TRANSPORTERS.push({
		id: 0,
		type: rf.DONKEY,
		uniqueID: "00031000000",
		location: [rf.LOCATION_LAND_VERTEX, 0, 0],
		remainingMoves: 2,
		ownerIndex: 0,
		movedThisTurn: false,
		justPickedUpFromLocation: [],
	})
	for (let i = 0; i < 4; i++) model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 0, 0], 0)

	store.context.selectedTransporterIDforTM = 0
	return { store }
}

test("city side joined to a river side offers two bank bridges, not the centre bridge", { skip: skip }, () => {
	setupCityRiverMap()

	// City side 2: bank bridges [3,17] (25%) and [3,18] (75%); centre bridge [3,9]
	const bridgeOptions = map.getCityBridgeOptions(0)
	assert.deepEqual(bridgeOptions.map((o) => o.bridgeArr), [
		[3, 17],
		[3, 18],
	], "two bank bridges offered on the river side, no centre bridge")
	assert.equal(bridgeOptions.some((o) => util_arraysEqualSame(o.bridgeArr, [3, 9])), false, "centre bridge NOT offered on the river side")

	const options = map.getEligibleCityExitBridges(0)
	assert.equal(options.length, 2, "two bridge+road options, one per river bank")
	assert.deepEqual(options.map((o) => o.bankIdx).sort(), [0, 1], "one option per bank")
	assert.deepEqual(options.map((o) => o.toBucketId).sort(), [0, 1], "targets are the two river banks")
})

test("bridge+road to a river bank: road lands on the chosen bank only", { skip: skip }, () => {
	const { store } = setupCityRiverMap()

	const options = map.getEligibleCityExitBridges(0)
	const optionA = options.find((o) => o.toBucketId === 0)
	map.addRoadBridgeToMap(0, optionA.bridgeArr)

	const cityHex = store.mapData.hexData[0]
	assert.ok(arrEq(cityHex.builtBridges, [3, 17]), "the bank-A moat bridge was built")
	const edge = edgeBetween(store, 0, 1)
	assert.equal(edge.hasRoad.length, 2, "the city-river edge has two road slots")
	assert.equal(edge.hasRoad[optionA.bankIdx], true, "the chosen bank has its road")
	assert.equal(edge.hasRoad[1 - optionA.bankIdx], false, "the other bank does not")

	// Movement: the donkey reaches the chosen bank (bucket 0), not the other (bucket 1)
	const g = graph.createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, 0)
	const donkey = rf.getTransporterStats(rf.DONKEY)
	const result = graph.pathfind(g, [rf.LOCATION_LAND_VERTEX, 0, 0], donkey.validMove, 4)
	const riverHex = store.mapData.hexData[1]
	const reachedRiverBuckets = result.locations
		.filter((l, i) => l[0] === rf.LOCATION_LAND_VERTEX && l[1] === 1 && result.cost[i] > 0)
		.map((l) => riverHex.nodeBucketIds[l[2]])
	assert.deepEqual([...new Set(reachedRiverBuckets)].sort(), [0], "only the chosen bank is reachable")
})

test("after one bank's bridge, the other bank still needs its own bridge before a plain road", { skip: skip }, () => {
	const { store } = setupCityRiverMap()

	const options = map.getEligibleCityExitBridges(0)
	const optionA = options.find((o) => o.toBucketId === 0)
	map.addRoadBridgeToMap(0, optionA.bridgeArr)

	// The other bank's bridge+road is still offered (its own bridge)
	const remaining = map.getEligibleCityExitBridges(0).filter((o) => o.citySide === 2)
	assert.equal(remaining.length, 1, "the other bank's bridge+road is still offered")
	assert.deepEqual(remaining[0].toBucketId, 1, "targeting the other bank")

	// ...but a plain road to that bank is not offered until its bridge exists
	build.setEligibleItemsToBuild(0, 0)
	assert.ok(!store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_ROAD), "plain road NOT offered without the other bank's bridge")
	const roadTargetsBefore = map.allLandVertexBucketsWithoutRoadsAdjacentTo(0, [0])
	assert.equal(roadTargetsBefore.length, 0, "no road targets before the second bridge")

	// Build the second bank's bridge (1 stone)
	map.addBridgeToMap(0, [3, 18], true)

	// Now the plain road targets the remaining bank
	build.setEligibleItemsToBuild(0, 0)
	assert.ok(store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_ROAD), "plain road offered once the second bridge exists")
	const roadTargets = map.allLandVertexBucketsWithoutRoadsAdjacentTo(0, [0])
	assert.equal(roadTargets.length, 1, "one road target remains")
	assert.equal(roadTargets[0][0], 1, "the target is on the river hex")
	assert.equal(roadTargets[0][1][0], 1, "the target bucket is bank B (bucket 1)")

	map.addRoadToMap([0, 0], [1, 1], true)
	const edge = edgeBetween(store, 0, 1)
	assert.equal(edge.hasRoad.every(Boolean), true, "both banks now have roads")

	const g = graph.createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, 0)
	const donkey = rf.getTransporterStats(rf.DONKEY)
	const result = graph.pathfind(g, [rf.LOCATION_LAND_VERTEX, 0, 0], donkey.validMove, 4)
	const riverHex2 = store.mapData.hexData[1]
	const reachedRiverBuckets = result.locations
		.filter((l, i) => l[0] === rf.LOCATION_LAND_VERTEX && l[1] === 1 && result.cost[i] > 0)
		.map((l) => riverHex2.nodeBucketIds[l[2]])
	assert.deepEqual([...new Set(reachedRiverBuckets)].sort(), [0, 1], "both banks are reachable after both roads")
})

test("bridge-only from a river hex bank builds the aligned bank bridge", { skip: skip }, () => {
	const { store } = setupCityRiverMap()

	// Donkey on the river hex's bank A (vertex 0, bucket 0), with stone
	store.ALL_TRANSPORTERS.push({
		id: 1,
		type: rf.DONKEY,
		uniqueID: "00031000001",
		location: [rf.LOCATION_LAND_VERTEX, 1, 0],
		remainingMoves: 2,
		ownerIndex: 0,
		movedThisTurn: false,
		justPickedUpFromLocation: [],
	})
	model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 1, 0], 0)
	model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 1, 0], 0)

	// Only the bank-A bridge is offered (aligned with the transporter's bank)
	assert.deepEqual(map.getCityBridgesBuildableFrom(1, [0]), [[0, [3, 17]]], "only the bank-A bridge offered from bank A")

	store.context.selectedTransporterIDforTM = 1
	map.addBridgeToMap(0, [3, 17], true)
	const cityHex = store.mapData.hexData[0]
	assert.ok(arrEq(cityHex.builtBridges, [3, 17]), "the bank-A moat bridge was built from the river bank")

	// And the plain road from that bank into the city is now offered and valid
	build.setEligibleItemsToBuild(0, 1)
	assert.ok(store.context.eligibleBuildingsToBuild.includes(rf.BLDG_PSEUDO_ROAD), "plain road offered from the bank")
	const roadTargets = map.allLandVertexBucketsWithoutRoadsAdjacentTo(1, [0])
	assert.equal(roadTargets.length, 1, "one road target (the city)")
	assert.equal(roadTargets[0][0], 0, "target is the city hex")

	const roadAction = {
		action: rf.STACK_BUILD_ROAD,
		historyEntry: [rf.STACK_BUILD_ROAD, 1, [1, 0], [0]],
		playerIndex: 0,
	}
	assert.equal(stack.verifySingleStackAction(roadAction), 0, "road verify passes with the bank bridge built")
})

test("verify rejects a bank bridge built from the wrong bank, and the centre bridge on a river side", { skip: skip }, () => {
	const { store } = setupCityRiverMap()

	// Donkey on bank A (vertex 0, bucket 0)
	store.ALL_TRANSPORTERS.push({
		id: 1,
		type: rf.DONKEY,
		uniqueID: "00031000001",
		location: [rf.LOCATION_LAND_VERTEX, 1, 0],
		remainingMoves: 2,
		ownerIndex: 0,
		movedThisTurn: false,
		justPickedUpFromLocation: [],
	})
	model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 1, 0], 0)

	// Bank-B bridge from bank A: wrong bank
	const wrongBankAction = {
		action: rf.STACK_BUILD_BRIDGE,
		historyEntry: [rf.STACK_BUILD_BRIDGE, 1, 0, 11],
		playerIndex: 0,
	}
	// bridges index 11 = [3,18] (side 2 bank B)
	assert.equal(store.mapData.hexData[0].bridges[11][1], 18, "sanity: index 11 is the side-2 bank-B bridge")
	assert.equal(stack.verifySingleStackAction(wrongBankAction), 1, "bank-B bridge from bank A rejected")

	// Centre bridge on the river side: never allowed
	const centreAction = {
		action: rf.STACK_BUILD_BRIDGE,
		historyEntry: [rf.STACK_BUILD_BRIDGE, 1, 0, 2],
		playerIndex: 0,
	}
	assert.equal(stack.verifySingleStackAction(centreAction), 5, "centre bridge on a river side rejected")

	// Bank-A bridge from bank A: allowed
	const rightBankAction = {
		action: rf.STACK_BUILD_BRIDGE,
		historyEntry: [rf.STACK_BUILD_BRIDGE, 1, 0, 10],
		playerIndex: 0,
	}
	assert.equal(store.mapData.hexData[0].bridges[10][1], 17, "sanity: index 10 is the side-2 bank-A bridge")
	assert.equal(stack.verifySingleStackAction(rightBankAction), 0, "bank-A bridge from bank A allowed")
})

test("city cannot build a standalone bridge on the sea side", { skip: skip }, () => {
	setupCitySeaMap()

	// City side 5 faces the sea (bridge index 5 = [6,12]); side 2 faces pasture1
	const bridgeActionSea = {
		action: rf.STACK_BUILD_BRIDGE,
		historyEntry: [rf.STACK_BUILD_BRIDGE, 0, 0, 5],
		playerIndex: 0,
	}
	assert.equal(stack.verifySingleStackAction(bridgeActionSea), 5, "sea-side moat bridge rejected by verify")

	const bridgeActionLand = {
		action: rf.STACK_BUILD_BRIDGE,
		historyEntry: [rf.STACK_BUILD_BRIDGE, 0, 0, 2],
		playerIndex: 0,
	}
	assert.equal(stack.verifySingleStackAction(bridgeActionLand), 0, "land-side moat bridge still allowed")
})

test("city with only sea neighbours offers no bridge options at all", { skip: skip }, () => {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.soloGame = true
	personal.pov = 0
	store.players.splice(0)
	store.players.push({ name: "A", displayName: "", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.gameflow.turn = 1
	store.gameflow.phase = rf.PHASE_BUILDING_TO
	store.gameflow.turnOrder = [0]
	store.gameflow.fullTurnOrder = [0]
	store.mapData.hexData.splice(0)
	store.mapData.edgeData.splice(0)
	store.ALL_RESOURCES.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_TRANSPORTERS.splice(0)
	const city = hd.createActualHex([0, 0, 0], 0, rf.CITY)
	city.hexID = 0
	store.mapData.hexData.push(city)
	const sea = hd.createActualHex([0, 1, -1], 0, rf.SEA_1)
	sea.hexID = 1
	store.mapData.hexData.push(sea)
	map.addNewEdge([0, 1])
	store.ALL_TRANSPORTERS.push({
		id: 0,
		type: rf.DONKEY,
		uniqueID: "00031000000",
		location: [rf.LOCATION_LAND_VERTEX, 0, 0],
		remainingMoves: 2,
		ownerIndex: 0,
		movedThisTurn: false,
		justPickedUpFromLocation: [],
	})
	model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 0, 0], 0)
	store.context.selectedTransporterIDforTM = 0

	build.setEligibleItemsToBuild(0, 0)
	const options = store.context.eligibleBuildingsToBuild
	assert.ok(!options.includes(rf.BLDG_PSEUDO_BRIDGE), "no bridge offered (only sea neighbour)")
	assert.ok(!options.includes(rf.BLDG_PSEUDO_ROAD_BRIDGE), "no bridge+road offered (only sea neighbour)")
	assert.ok(!options.includes(rf.BLDG_PSEUDO_ROAD), "no road offered (only sea neighbour)")
})

function arrEq(haystackEntry, needle) {
	return haystackEntry.some((item) => JSON.stringify(item) === JSON.stringify(needle))
}
function util_arraysEqualSame(a, b) {
	return JSON.stringify(a) === JSON.stringify(b)
}
function edgeBetween(store, hexA, hexB) {
	return store.mapData.edgeData.find((e) => e.edgeHexIDs.length === 2 && e.edgeHexIDs.includes(hexA) && e.edgeHexIDs.includes(hexB))
}
