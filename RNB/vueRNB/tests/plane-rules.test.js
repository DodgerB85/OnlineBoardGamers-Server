/**
 * &c Planes: core rules that are not tied to the map editor or UI.
 *
 * Run with:
 *     node --test tests/plane-rules.test.js
 */
import test from "node:test"
import assert from "node:assert/strict"
import { register } from "node:module"

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

globalThis.window = globalThis.window || {}
globalThis.window.atob = globalThis.window.atob || globalThis.atob
globalThis.window.btoa = globalThis.window.btoa || globalThis.btoa
globalThis.window.initData = {
	pov: 0,
	playerNames: [],
	gameID: 1,
	gameName: "plane-rules-test",
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

let rf, hd, map, model, loc, produce, highlight, useModelStore, usePersonalStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js")
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	hd = await import("../src/js/RNBhex.js")
	map = await import("../src/js/RNBmap.js")
	model = await import("../src/js/RNBmodel.js")
	loc = await import("../src/js/RNBlocation.js")
	produce = await import("../src/js/RNBproduce.js")
	highlight = await import("../src/js/RNBhighlight.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
	;({ usePersonalStore } = await import("../src/stores/RNBpersonal.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

function setupMap(terrains) {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.soloGame = false
	personal.trainingGame = true
	personal.pov = 0
	store.players.splice(0)
	store.players.push({ name: "A", displayName: "", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.players.push({ name: "B", displayName: "", colour: 1, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.gameflow.turn = 1
	store.gameflow.phase = rf.PHASE_MOVEMENT_TO
	store.gameflow.turnOrder = [0, 1]
	store.gameflow.fullTurnOrder = [0, 1]
	store.mapData.hexData.splice(0)
	store.mapData.edgeData.splice(0)
	store.ALL_RESOURCES.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_TRANSPORTERS.splice(0)
	store.actionStack.splice(0)
	store.history.splice(0)
	for (const [hexID, coord, terrain] of terrains) {
		const hex = hd.createActualHex(coord, 0, terrain)
		hex.hexID = hexID
		store.mapData.hexData.push(hex)
	}
	for (let i = 1; i < terrains.length; i++) map.addNewEdge([i - 1, i])
	hd.updateAllHexRawXY()
	return { store, personal }
}

function addPlane(hexID, vertex, remainingMoves = 99) {
	const store = useModelStore()
	store.ALL_TRANSPORTERS.push({
		id: 0,
		type: rf.PLANE,
		uniqueID: "00360000000",
		location: [rf.LOCATION_LAND_VERTEX, hexID, vertex],
		remainingMoves,
		ownerIndex: 0,
		movedThisTurn: false,
		justPickedUpFromLocation: [],
	})
	return store.ALL_TRANSPORTERS[0]
}

test("plane stats and limits: 4 goods, 3 planes, counted in the 8 but not land/sea", { skip }, () => {
	const stats = rf.getTransporterStats(rf.PLANE)
	assert.equal(stats.maxCapacity, 4)
	assert.equal(rf.AIR_TRANSPORTERS.includes(rf.PLANE), true)
	assert.equal(rf.LAND_TRANSPORTERS.includes(rf.PLANE), false)
	assert.equal(rf.WATER_TRANSPORTERS.includes(rf.PLANE), false)

	setupMap([[0, [0, 0, 0], rf.PASTURE_1]])
	for (let i = 0; i < 3; i++) {
		useModelStore().ALL_TRANSPORTERS.push({ id: i, type: rf.PLANE, uniqueID: "00" + i, location: [rf.LOCATION_LAND_VERTEX, 0, 0], remainingMoves: 99, ownerIndex: 0, movedThisTurn: false, justPickedUpFromLocation: [] })
	}
	let excess = model.excessTransporterCheck(0)
	assert.equal(excess[4], false, "3 planes are allowed")
	useModelStore().ALL_TRANSPORTERS.push({ id: 3, type: rf.PLANE, uniqueID: "003", location: [rf.LOCATION_LAND_VERTEX, 0, 1], remainingMoves: 99, ownerIndex: 0, movedThisTurn: false, justPickedUpFromLocation: [] })
	excess = model.excessTransporterCheck(0)
	assert.equal(excess[4], true, "a 4th plane is over the limit")
	assert.equal(excess[5], 4, "planes count toward the global 8")
})

test("planes may only pick up at the start of the movement phase, not while taxiing", { skip }, () => {
	const { store } = setupMap([[0, [0, 0, 0], rf.PASTURE_1]])
	const plane = addPlane(0, 0)
	store.context.selectedPlaneMode = rf.MOVE_FLY
	assert.equal(model.canPlanePickUpNow(plane), true)
	plane.remainingMoves = 98
	assert.equal(model.canPlanePickUpNow(plane), false, "after moving")
	plane.remainingMoves = 99
	store.context.selectedPlaneMode = rf.MOVE_TAXI
	assert.equal(model.canPlanePickUpNow(plane), false, "while taxiing")
	store.context.selectedPlaneMode = rf.MOVE_FLY
	store.gameflow.phase = rf.PHASE_PRODUCTION_TO
	assert.equal(model.canPlanePickUpNow(plane), false, "during production")
})

test("plane fly/taxi movement parameters", { skip }, () => {
	setupMap([
		[0, [0, 0, 0], rf.PASTURE_1],
		[1, [0, 1, -1], rf.SEA_1],
	])
	const store = useModelStore()
	const plane = addPlane(0, 0)
	const fly = model.getEffectiveMoveParams(plane, true)
	assert.deepEqual(fly.validMove, [rf.MOVE_FLY])
	assert.equal(fly.maxMoves, 99)
	const taxiLand = model.getEffectiveMoveParams(plane, false)
	assert.deepEqual(taxiLand.validMove, [rf.MOVE_INTERNAL, rf.MOVE_ROAD])
	assert.equal(taxiLand.maxMoves, 1)
	plane.location = [rf.LOCATION_SEA_VERTEX, 1, loc.getAnyVertexInHexIDbucketID(1, store.mapData.hexData[1].bucketIdsCurrent[0])]
	const taxiSea = model.getEffectiveMoveParams(plane, false)
	assert.deepEqual(taxiSea.validMove, [rf.MOVE_WATER])
	assert.equal(taxiSea.maxMoves, 1)
})

test("plane landing blocks buildings and unattended geese, but not aeroports", { skip }, () => {
	const { store } = setupMap([[0, [0, 0, 0], rf.PASTURE_1]])
	const plane = addPlane(0, 0)
	const landing = [rf.LOCATION_LAND_VERTEX, 0, 0]
	assert.equal(model.canPlaneLandOnTile(plane, landing), true, "empty land")

	store.ALL_BUILDINGS.push({ id: 0, type: rf.BLDG_SAWMILL, location: [rf.LOCATION_BUCKET, 0, 0] })
	assert.equal(model.canPlaneLandOnTile(plane, landing), false, "building blocks landing")

	store.ALL_BUILDINGS[0] = { id: 0, type: rf.BLDG_AEROPORT, location: [rf.LOCATION_BUCKET, 0, 0] }
	model.addResourceToGame_core(rf.RES_GOOSE, [rf.LOCATION_BUCKET, 0, 0], 9)
	assert.equal(model.canPlaneLandOnTile(plane, landing), true, "an aeroport allows landing even with geese")
})

test("a building on the next tile along the river does not block a river-shore landing", { skip }, () => {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.soloGame = false
	personal.trainingGame = true
	personal.pov = 0
	store.players.splice(0)
	store.players.push({ name: "A", displayName: "", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.players.push({ name: "B", displayName: "", colour: 1, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.gameflow.turn = 1
	store.gameflow.phase = rf.PHASE_MOVEMENT_TO
	store.mapData.hexData.splice(0)
	store.mapData.edgeData.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_TRANSPORTERS.splice(0)
	const river = hd.createActualHex([0, 0, 0], 0, rf.PASTURE_RIVER_STRAIGHT)
	river.hexID = 0
	store.mapData.hexData.push(river)
	let neighbour = null
	for (const [dx, dy, dz] of [
		[1, -1, 0],
		[1, 0, -1],
		[0, 1, -1],
		[-1, 1, 0],
		[-1, 0, 1],
		[0, -1, 1],
	]) {
		const side = hd.getJoiningSide(river.coord, [dx, dy, dz])
		if (river.sideRiverVertexIds[side] < 0) continue
		neighbour = hd.createActualHex([dx, dy, dz], 0, rf.PASTURE_1)
		neighbour.hexID = 1
		store.mapData.hexData.push(neighbour)
		map.addNewEdge([0, 1])
		break
	}
	assert.ok(neighbour, "found a neighbour along the river")
	hd.updateAllHexRawXY()
	store.ALL_BUILDINGS.push({ id: 0, type: rf.BLDG_SAWMILL, location: [rf.LOCATION_BUCKET, 1, 0] })
	const plane = addPlane(0, 0)
	const riverLandVertex = river.sideNodeIds.find((node) => node >= 0)
	assert.equal(model.canPlaneLandOnTile(plane, [rf.LOCATION_LAND_VERTEX, 0, riverLandVertex]), true, "the next tile downriver does not block this shore")

	store.ALL_BUILDINGS.push({ id: 1, type: rf.BLDG_MINT, location: [rf.LOCATION_BUCKET, 0, 0] })
	assert.equal(model.canPlaneLandOnTile(plane, [rf.LOCATION_LAND_VERTEX, 0, riverLandVertex]), false, "a building on the river tile blocks both shores")
})

test("planes can land at sea but not in rivers", { skip }, () => {
	setupMap([
		[0, [0, 0, 0], rf.SEA_1],
		[1, [0, 1, -1], rf.PASTURE_RIVER_STRAIGHT],
	])
	const store = useModelStore()
	const plane = addPlane(0, 0)
	const seaBucket = store.mapData.hexData[0].bucketIdsCurrent[0]
	const seaVertex = loc.getSeaVertexForNewTransporterFromHexIDandBucketID(0, seaBucket)
	assert.equal(model.canPlaneLandOnTile(plane, [rf.LOCATION_SEA_VERTEX, 0, seaVertex]), true, "sea landing")

	const river = store.mapData.hexData[1]
	const riverLandVertex = river.sideNodeIds.find((node) => node >= 0)
	assert.equal(model.canPlaneLandOnTile(plane, [rf.LOCATION_LAND_VERTEX, 1, riverLandVertex]), true, "landing on a river shore")
	assert.equal(model.canPlaneLandOnTile(plane, [rf.LOCATION_RIVER_VERTEX, 1, 0]), false, "never in the river itself")
})

test("a plane in flight may airdrop goods onto any land tile but never onto the sea", { skip }, () => {
	const { store } = setupMap([
		[0, [0, 0, 0], rf.PASTURE_1],
		[1, [0, 1, -1], rf.SEA_1],
		[2, [1, 0, -1], rf.PASTURE_1],
	])
	const plane = addPlane(0, 0)
	plane.remainingMoves = 98 // already took off
	store.context.planeInFlight = true
	store.context.selectedTransporterIDforTM = 0
	model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_TRANSPORTER, 0], 9)
	const board = store.ALL_RESOURCES.find((r) => r.type === rf.RES_BOARDS)

	const buckets = map.getPossibleDropBucketsForResourceOnTransporter(board.id)
	assert.ok(buckets.some(([hexID]) => hexID === 0), "the plane's own tile is offered")
	assert.ok(buckets.some(([hexID]) => hexID === 2), "a far land tile is offered")
	assert.ok(!buckets.some(([hexID]) => hexID === 1), "the sea is never offered")

	const farBucket = buckets.find(([hexID]) => hexID === 2)
	store.context.action = rf.ACT_TM_ANY_PHASE_STRICT_DROP_RES_OR_TRANSPORT
	store.context.resIDbeingMoved = board.id
	map.dropResOrTransporterOnLocation(farBucket[2], true)
	assert.equal(board.location[1], 2, "the board landed on the far land tile")
	assert.equal(store.context.planeInFlight, true, "the plane stays in flight for further drops")
})

test("a taxiing plane follows roads and cannot cross unpaved land", { skip }, () => {
	const { store } = setupMap([
		[0, [0, 0, 0], rf.PASTURE_1],
		[1, [0, 1, -1], rf.PASTURE_1],
	])
	addPlane(0, 0)
	store.context.selectedPlaneMode = rf.MOVE_TAXI
	const reachesNextTile = () => store.context.hexPiecesToHighlightUnderTransporters.some(([hexID]) => hexID === 1)

	map.addRoadToMap_core([0, 0], [1, 0], -1, false)
	highlight.highlightEligibleHexAreasForTransporterMove(0)
	assert.ok(reachesNextTile(), "one road step reaches the next tile")

	store.mapData.edgeData[0].hasRoad = [false, false]
	highlight.highlightEligibleHexAreasForTransporterMove(0)
	assert.ok(!reachesNextTile(), "unpaved land is not a taxi move")
})

test("a plane claims a transporter and research produced on its tile", { skip }, () => {
	const { store } = setupMap([[0, [0, 0, 0], rf.PASTURE_1]])
	addPlane(0, 0)
	store.context.selectedTransporterIDforTM = 0
	store.context.buildingIDsToHighlight = [0]

	store.ALL_BUILDINGS.push({ id: 0, type: rf.BLDG_TRUCK_FACTORY, location: [rf.LOCATION_BUCKET, 0, 0], remainingConversions: 1 })
	model.addResourceToGame_core(rf.RES_IRON, [rf.LOCATION_BUCKET, 0, 0], 9)
	model.addResourceToGame_core(rf.RES_FUEL, [rf.LOCATION_BUCKET, 0, 0], 9)
	map.clickedBuilding(0)
	const truck = store.ALL_TRANSPORTERS.find((t) => t.type === rf.TRUCK)
	assert.ok(truck, "the truck factory produced a truck")
	assert.equal(truck.ownerIndex, 0, "the plane's player claimed it")

	model.addResourceToGame_core(rf.RES_PAPER, [rf.LOCATION_BUCKET, 0, 0], 9)
	model.addResourceToGame_core(rf.RES_GOOSE, [rf.LOCATION_BUCKET, 0, 0], 9)
	model.addResourceToGame_core(rf.RES_GOOSE, [rf.LOCATION_BUCKET, 0, 0], 9)
	assert.ok(produce.findAllResearchHexIDpossibilities(0).includes(0), "the plane's tile offers research")
	assert.equal(produce.doResearch_core(0, rf.RND_ROWBOAT_IDX), 2, "the plane spent paper and two geese")
	assert.equal(store.players[0].RnD[rf.RND_ROWBOAT_IDX], 1, "the research is claimed")
})
