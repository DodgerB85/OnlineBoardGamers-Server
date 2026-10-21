/**
 * Train tracks are map data: edgeData[].hasTrainTrack mirrors roads/power lines,
 * and the map stores them as TN = [[x1, y1, x2, y2, lane], ...].
 *
 * Run with:
 *     node --test tests/train-tracks.test.js
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

// Minimal browser surface the RNB code expects.
globalThis.window = globalThis.window || {}
globalThis.window.atob = globalThis.window.atob || globalThis.atob
globalThis.window.btoa = globalThis.window.btoa || globalThis.btoa
globalThis.window.initData = {
	pov: 0,
	playerNames: [],
	gameID: 1,
	gameName: "train-tracks-test",
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

let rf, hd, map, computes, model, stack, train, loc, useModelStore, usePersonalStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js")
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	hd = await import("../src/js/RNBhex.js")
	map = await import("../src/js/RNBmap.js")
	computes = await import("../src/js/RNBcomputes.js")
	model = await import("../src/js/RNBmodel.js")
	stack = await import("../src/js/RNBstack.js")
	train = await import("../src/js/RNBtrain.js")
	loc = await import("../src/js/RNBlocation.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
	;({ usePersonalStore } = await import("../src/stores/RNBpersonal.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

// Two adjacent pasture hexes.
function setupTwoHexMap() {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.mapData.hexData.splice(0)
	store.mapData.edgeData.splice(0)
	const hex1 = hd.createActualHex([0, 0, 0], 0, rf.PASTURE_1)
	hex1.hexID = 0
	store.mapData.hexData.push(hex1)
	const hex2 = hd.createActualHex([0, 1, -1], 0, rf.PASTURE_1)
	hex2.hexID = 1
	store.mapData.hexData.push(hex2)
	map.addNewEdge([0, 1])
	hd.updateAllHexRawXY()
	return { store, edge: store.mapData.edgeData[0] }
}

function setupLandSeaMap() {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.mapData.hexData.splice(0)
	store.mapData.edgeData.splice(0)
	const land = hd.createActualHex([0, 0, 0], 0, rf.PASTURE_1)
	land.hexID = 0
	store.mapData.hexData.push(land)
	const sea = hd.createActualHex([0, 1, -1], 0, rf.SEA_1)
	sea.hexID = 1
	store.mapData.hexData.push(sea)
	map.addNewEdge([0, 1])
	hd.updateAllHexRawXY()
	return { store, edge: store.mapData.edgeData[0], sea }
}

test("train track builds, compresses to TN and reloads", { skip: skip }, () => {
	const { store, edge } = setupTwoHexMap()
	assert.deepEqual(edge.hasTrainTrack, [false], "new edge starts without a track")

	assert.equal(map.addTrainTrackToMap_core([0, 0], [1, 0]), true, "track builds between the two areas")
	assert.deepEqual(edge.hasTrainTrack, [true], "edge has a track")
	assert.equal(store.gameOptions.useTrains, true, "map flag follows the track")

	const renderedHex0 = computes.computedHexes.value.find((h) => h.hexID === 0)
	const renderedHex1 = computes.computedHexes.value.find((h) => h.hexID === 1)
	assert.match(renderedHex0.fullTrainTrackPath, /^M/, "hex 0 draws its half of the track")
	assert.match(renderedHex1.fullTrainTrackPath, /^M/, "hex 1 draws its half of the track")
	assert.equal(renderedHex0.fullTrainTrackPath.split("M").length - 1, 1, "hex 0 track is one continuous polyline")
	assert.equal(renderedHex1.fullTrainTrackPath.split("M").length - 1, 1, "hex 1 track is one continuous polyline")

	const tn = map.compressTrainTracksForMap()
	assert.deepEqual(tn, [[0, 0, 0, 1, 0]], "TN stores both tile coords and the lane")

	edge.hasTrainTrack = [false]
	store.mapData.hexData.forEach((hex) => hex.edgeHasTrainTrack.fill(false))
	map.applyTrainTracksFromMap(tn)
	assert.deepEqual(edge.hasTrainTrack, [true], "TN re-applies after hex data is rebuilt")
	assert.ok(store.mapData.hexData[0].edgeHasTrainTrack.some(Boolean), "TN rebuilds the internal track path")
	assert.ok(store.mapData.hexData[1].edgeHasTrainTrack.some(Boolean), "TN rebuilds the other tile's path")

	edge.hasTrainTrack = [false]
	map.refreshUseTrainsFlag()
	assert.equal(store.gameOptions.useTrains, false, "map flag clears with the last track")
})

test("track can run from land onto a sea hex", { skip: skip }, () => {
	const { store, edge, sea } = setupLandSeaMap()
	assert.equal(map.addTrainTrackToMap_core([0, 0], [1, 0]), true, "track builds onto the sea hex")
	assert.deepEqual(edge.hasTrainTrack, [true], "edge has a track")
	assert.ok(sea.edgeHasTrainTrack.some(Boolean), "sea hex draws its internal track")
	assert.equal(store.gameOptions.useTrains, true, "map flag follows the track")
})

// A 3-tile chain 0 - 1 - 2 with a track along all of it, plus one donkey and one
// wood on the start tile. Returns the donkey's track bucket on tile 0.
function setupTrainRideMap() {
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

	for (const [i, coord] of [
		[0, [0, 0, 0]],
		[1, [0, 1, -1]],
		[2, [0, 2, -2]],
	]) {
		const hex = hd.createActualHex(coord, 0, rf.PASTURE_1)
		hex.hexID = i
		store.mapData.hexData.push(hex)
	}
	map.addNewEdge([0, 1])
	map.addNewEdge([1, 2])
	hd.updateAllHexRawXY()

	assert.equal(map.addTrainTrackToMap_core([0, 0], [1, 0]), true, "track builds 0 to 1")
	assert.equal(map.addTrainTrackToMap_core([1, 0], [2, 0]), true, "track builds 1 to 2")

	const startBucket = train.getTrackBucketsInHex(0)[0]
	model.addTransporterToGame(0, rf.DONKEY, [rf.LOCATION_BUCKET, 0, startBucket], true)
	model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, 0, startBucket], 9)

	return { store, startBucket }
}

test("track network, destinations and fare", { skip: skip }, () => {
	const { startBucket } = setupTrainRideMap()

	const adj = train.getTrackAdjacencies()
	assert.deepEqual(adj[0], [1], "tile 0 links only to tile 1")
	assert.deepEqual(adj[2], [1], "tile 2 links only to tile 1")
	assert.deepEqual(train.getTrackConnectedHexIDs(0), [0, 1, 2], "the whole chain is reachable from tile 0")

	assert.equal(train.isBucketOnTrack(0, startBucket), true, "the start bucket is on the track")

	const destinations = train.getTrainDestinations(0)
	assert.equal(destinations.some(([hexID]) => hexID === 0), false, "the departure tile is not a destination")
	assert.ok(destinations.some(([hexID]) => hexID === 1), "tile 1 is a destination")
	assert.ok(destinations.some(([hexID]) => hexID === 2), "tile 2 is reachable through tile 1")

	// The boards on the tile pay the fare
	assert.equal(train.canTransporterUseTrain(0), true, "a donkey on the track with goods can ride")
	assert.equal(train.findTrainFare(0).type, rf.RES_BOARDS, "the goods lying on the tile pays")

	// No goods anywhere: no fare, no ride
	model.getAllInGameResources().forEach((r) => (r.location = loc.setOOBlocation()))
	assert.equal(train.findTrainFare(0), null, "no goods means no fare")
	assert.equal(train.canTransporterUseTrain(0), false, "without a fare the ride is unavailable")
})

test("takeTrain moves the transporter, spends the fare and pushes a stack action", { skip: skip }, () => {
	const { store, startBucket } = setupTrainRideMap()
	const donkey = model.getTransporterByID(0)
	const fare = train.findTrainFare(0)

	train.takeTrain(0, 2, train.getTrackBucketsInHex(2)[0])

	assert.equal(donkey.location[1], 2, "the donkey now stands on tile 2")
	assert.equal(donkey.remainingMoves, 0, "the ride ends the movement")
	assert.equal(donkey.movedThisTurn, true, "the donkey counts as having moved")
	assert.equal(fare.location[0], rf.LOCATION_OOB, "the fare is spent")

	const entry = store.actionStack[0]
	assert.equal(entry.action, rf.STACK_TAKE_TRAIN, "a STACK_TAKE_TRAIN action was pushed")
	assert.equal(entry.historyEntry[0], rf.STACK_TAKE_TRAIN)
	assert.equal(entry.historyEntry[1], donkey.id, "the payload names the moving transporter")
	assert.deepEqual(stack.decompressLocation(entry.historyEntry[2]), [rf.LOCATION_BUCKET, 0, startBucket], "the payload records where it started")
	assert.deepEqual(stack.decompressLocation(entry.historyEntry[3]), [rf.LOCATION_BUCKET, 2, train.getTrackBucketsInHex(2)[0]], "the payload records where it ended")
	// The fare lies on the tile, not aboard, so nothing is carried
	assert.deepEqual(entry.historyEntry[4], [], "the payload records the goods carried on board")
	assert.equal(entry.historyEntry[5], fare.id, "the payload records the fare")

	assert.equal(train.canTransporterUseTrain(0), false, "the donkey cannot ride again")
})

test("another client verifies and performs a train ride from the stack action", { skip: skip }, () => {
	const { startBucket } = setupTrainRideMap()
	const toBucket = train.getTrackBucketsInHex(2)[0]
	const fareID = train.findTrainFare(0).id

	const stackAction = {
		action: rf.STACK_TAKE_TRAIN,
		historyEntry: [rf.STACK_TAKE_TRAIN, 0, [...stack.compressLocation([rf.LOCATION_BUCKET, 0, startBucket])], [...stack.compressLocation([rf.LOCATION_BUCKET, 2, toBucket])], [fareID], fareID],
		playerIndex: 0,
	}

	assert.equal(stack.verifySingleStackAction(stackAction), 0, "the ride verifies against the pre-move state")

	stack.performSingleStackAction(stackAction, false)

	const donkey = model.getTransporterByID(0)
	assert.equal(donkey.location[1], 2, "the donkey lands on tile 2")
	assert.equal(model.getResByID(fareID).location[0], rf.LOCATION_OOB, "the fare is spent on the far side too")
})

test("a ride to an unconnected tile is rejected", { skip: skip }, () => {
	const { startBucket } = setupTrainRideMap()
	const fareID = train.findTrainFare(0).id

	const badAction = {
		action: rf.STACK_TAKE_TRAIN,
		historyEntry: [rf.STACK_TAKE_TRAIN, 0, [...stack.compressLocation([rf.LOCATION_BUCKET, 0, startBucket])], [...stack.compressLocation([rf.LOCATION_BUCKET, 0, startBucket])], [fareID], fareID],
		playerIndex: 0,
	}
	assert.notEqual(stack.verifySingleStackAction(badAction), 0, "riding to the departure tile is not a valid destination")
})
