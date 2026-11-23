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
		getContext: () => ({ isPointInPath: () => true }),
		getTotalLength: () => 100,
		getPointAtLength: (t) => ({ x: t, y: 0 }),
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
globalThis.Path2D = globalThis.Path2D || class Path2D {}
globalThis.msgpack = globalThis.msgpack || {
	encode: (value) => new TextEncoder().encode(JSON.stringify(value)),
	decode: (buffer) => JSON.parse(new TextDecoder().decode(buffer)),
}

let rf, hd, map, computes, model, stack, train, loc, funcs, useModelStore, usePersonalStore, createPinia, setActivePinia, setupError
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
	funcs = await import("../src/js/RNBfuncs.js")
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
	store.mapData.displaySettings.trackStyle = 2
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

// Two sea tiles linked by a sea track.
function setupSeaTrainMap() {
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
	const sea0 = hd.createActualHex([0, 0, 0], 0, rf.SEA_1)
	sea0.hexID = 0
	store.mapData.hexData.push(sea0)
	const sea1 = hd.createActualHex([0, 1, -1], 0, rf.SEA_1)
	sea1.hexID = 1
	store.mapData.hexData.push(sea1)
	map.addNewEdge([0, 1])
	hd.updateAllHexRawXY()
	assert.equal(map.addTrainTrackToMap_core([0, 0], [1, 0]), true, "sea track")
	return { store, startBucket: train.getTrackBucketsInHex(0)[0], toBucket: train.getTrackBucketsInHex(1)[0] }
}

test("train track builds, compresses to TN and reloads", { skip: skip }, () => {
	const { store, edge } = setupTwoHexMap()
	assert.deepEqual(edge.hasTrainTrack, [false], "new edge starts without a track")

	assert.equal(map.addTrainTrackToMap_core([0, 0], [1, 0]), true, "track builds between the two areas")
	assert.deepEqual(edge.hasTrainTrack, [true], "edge has a track")
	assert.equal(store.gameOptions.useTrains, true, "map flag follows the track")

	const renderedHex0 = computes.computedHexes.value.find((h) => h.hexID === 0)
	const renderedHex1 = computes.computedHexes.value.find((h) => h.hexID === 1)
	for (const hex of [renderedHex0, renderedHex1]) {
		assert.ok(Array.isArray(hex.fullTrainTrackPath) && hex.fullTrainTrackPath.length === 1, `hex ${hex.hexID} draws one track chain`)
		assert.match(hex.fullTrainTrackPath[0].d, /^M/, `hex ${hex.hexID} chain has an SVG path`)
		assert.ok(Number.isInteger(hex.fullTrainTrackPath[0].dashes) && hex.fullTrainTrackPath[0].dashes >= 1, `hex ${hex.hexID} chain has a whole number of dash periods`)
		assert.ok(Array.isArray(hex.fullTrainTrackPathOffset) && hex.fullTrainTrackPathOffset.length === 1, `hex ${hex.hexID} draws one style-2 chain`)
		assert.notEqual(hex.fullTrainTrackPathOffset[0].d, hex.fullTrainTrackPath[0].d, `hex ${hex.hexID} style-2 chain sits beside the road`)
	}

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

test("a goose on the tile can pay the train fare", { skip: skip }, () => {
	const { startBucket } = setupTrainRideMap()
	model.addResourceToGame_core(rf.RES_GOOSE, [rf.LOCATION_BUCKET, 0, startBucket], 9)
	const goose = model.getAllInGameResources().find((r) => r.type === rf.RES_GOOSE)
	const fares = train.getEligibleTrainFares(0)
	assert.ok(fares.some((f) => f.id === goose.id), "the goose is offered as a fare")
})

test("a following goose can pay the fare", { skip: skip }, () => {
	const { store, startBucket } = setupTrainRideMap()
	const donkey = model.getTransporterByID(0)
	model.addResourceToGame_core(rf.RES_GOOSE, [rf.LOCATION_BUCKET, 0, startBucket], 9)
	const goose = model.getAllInGameResources().find((r) => r.type === rf.RES_GOOSE)
	goose.location = loc.setFollowerLocation(donkey.id)

	assert.ok(
		train.getEligibleTrainFares(0).some((f) => f.id === goose.id),
		"the following goose is offered as a fare"
	)
	store.context.selectedTransporterIDforTM = donkey.id
	train.selectTrainFare(goose.id)
	assert.equal(store.context.selectedTrainFareResID, goose.id, "the following goose can be selected")

	train.takeTrain(0, 2, train.getTrackBucketsInHex(2)[0], goose)
	assert.equal(goose.location[0], rf.LOCATION_OOB, "the following goose is spent")
	assert.equal(store.actionStack[0].historyEntry.length, 6, "the spent goose is not also counted as a follower in the history")
})

test("following geese ride the animation and are dropped at the destination", { skip: skip }, () => {
	const { startBucket } = setupTrainRideMap()
	const donkey = model.getTransporterByID(0)
	model.addResourceToGame_core(rf.RES_GOOSE, [rf.LOCATION_BUCKET, 0, startBucket], 9)
	const goose = model.getAllInGameResources().find((r) => r.type === rf.RES_GOOSE)
	goose.location = loc.setFollowerLocation(donkey.id)
	const boards = model.getAllInGameResources().find((r) => r.type === rf.RES_BOARDS)
	const toBucket = train.getTrackBucketsInHex(2)[0]

	train.takeTrain(0, 2, toBucket, boards)

	assert.equal(goose.location[0], rf.LOCATION_FOLLOWER, "the goose stays with the transporter during the ride")
	assert.deepEqual(goose.autoDropLocationAfterFollowingTransporter, [rf.LOCATION_BUCKET, 2, toBucket], "it is queued to drop at the destination when the animation finishes")
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

// Two tiles the river runs straight across - the shared edge is a river edge and
// carries two banks, exactly like roads do.
function setupRiverBankPair() {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.mapData.hexData.splice(0)
	store.mapData.edgeData.splice(0)
	const hex0 = hd.createActualHex([0, 0, 0], 0, rf.PASTURE_RIVER_STRAIGHT)
	hex0.hexID = 0
	store.mapData.hexData.push(hex0)
	hd.updateAllHexRawXY()

	let hex1 = null
	let side = -1
	for (const [dx, dy, dz] of [
		[1, -1, 0],
		[1, 0, -1],
		[0, 1, -1],
		[-1, 1, 0],
		[-1, 0, 1],
		[0, -1, 1],
	]) {
		const candidateSide = hd.getJoiningSide(hex0.coord, [dx, dy, dz])
		if (hex0.sideRiverVertexIds[candidateSide] < 0) continue
		hex1 = hd.createActualHex([dx, dy, dz], 0, rf.PASTURE_RIVER_STRAIGHT)
		if (hex1.sideRiverVertexIds[(candidateSide + 3) % 6] < 0) {
			hex1 = null
			continue
		}
		side = candidateSide
		hex1.hexID = 1
		store.mapData.hexData.push(hex1)
		map.addNewEdge([0, 1])
		hd.updateAllHexRawXY()
		break
	}
	assert.ok(hex1, "found the neighbour the river runs across")
	assert.equal(store.mapData.edgeData[0].hasRiver, true, "the shared edge is crossed by the river")
	return { store, edge: store.mapData.edgeData[0], hex0, hex1, side }
}

test("a track follows one bank of a river onto the neighbouring tile", { skip: skip }, () => {
	const { edge, hex0, hex1, side } = setupRiverBankPair()
	const otherSide = (side + 3) % 6
	assert.deepEqual(edge.hasTrainTrack, [false, false], "a river edge carries one lane per bank")

	const bank = (hex, s) => hex.cornerNodeIds[s].map((node) => hex.bucketIdsInitial[hex.nodeBucketIds[node]])
	const fromBanks = bank(hex0, side)
	const toBanks = bank(hex1, otherSide)
	assert.notEqual(fromBanks[0], fromBanks[1], "the river splits the shared side into two banks")

	const options = map.allVertexBucketsWithoutTrainTracksAdjacentTo(0, [fromBanks[0]])
	assert.equal(options.length, 1, "only one bank of the neighbour is reachable - the same side of the river")
	assert.equal(options[0][0], 1, "the offer is the neighbouring tile")
	assert.equal(options[0][1][0], toBanks[1], "lane 0 on hex 0 carries on to the matching corner of hex 1")

	assert.equal(map.addTrainTrackToMap_core([0, fromBanks[0]], [1, toBanks[1]]), true, "the track builds along that bank")
	assert.deepEqual(edge.hasTrainTrack, [true, false], "only the bank that was drawn is tracked")
	assert.ok(train.getTrackBucketsInHex(0).includes(fromBanks[0]), "the drawn bank is on the network")
	assert.equal(train.getTrackBucketsInHex(0).includes(fromBanks[1]), false, "the far bank is not on the network")
	assert.deepEqual(train.getTrackAdjacencies()[0], [1], "the river crossing is part of the track network")

	assert.equal(map.addTrainTrackToMap_core([0, fromBanks[0]], [1, toBanks[0]]), false, "the opposite bank of the neighbour is not reachable from this one")
	assert.deepEqual(edge.hasTrainTrack, [true, false], "a mismatched pair of banks builds nothing")

	const otherOptions = map.allVertexBucketsWithoutTrainTracksAdjacentTo(0, [fromBanks[1]])
	assert.equal(otherOptions.length, 1, "the far bank can still be drawn in its own right")
	assert.equal(map.addTrainTrackToMap_core([0, fromBanks[1]], [1, otherOptions[0][1][0]]), true, "the far bank builds too")
	assert.deepEqual(edge.hasTrainTrack, [true, true], "each bank keeps its own lane")
})

// The sea tile the river runs into: the whole sea tile is one bucket, so the click
// on the sea cannot say which bank of the river the track stays on.
function setupSeaRiverPair() {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.mapData.hexData.splice(0)
	store.mapData.edgeData.splice(0)
	const riverHex = hd.createActualHex([0, 0, 0], 0, rf.PASTURE_RIVER_STRAIGHT)
	riverHex.hexID = 0
	store.mapData.hexData.push(riverHex)
	hd.updateAllHexRawXY()

	let sea = null
	let side = -1
	for (const [dx, dy, dz] of [
		[1, -1, 0],
		[1, 0, -1],
		[0, 1, -1],
		[-1, 1, 0],
		[-1, 0, 1],
		[0, -1, 1],
	]) {
		const candidateSide = hd.getJoiningSide(riverHex.coord, [dx, dy, dz])
		if (riverHex.sideRiverVertexIds[candidateSide] < 0) continue
		sea = hd.createActualHex([dx, dy, dz], 0, rf.SEA_1)
		sea.hexID = 1
		side = candidateSide
		store.mapData.hexData.push(sea)
		map.addNewEdge([0, 1])
		hd.updateAllHexRawXY()
		break
	}
	assert.ok(sea, "found the sea tile the river runs into")
	return { store, edge: store.mapData.edgeData[0], sea, riverHex, side }
}

test("a track from the sea follows the bank clicked on the river tile", { skip: skip }, () => {
	// Fresh map per click - the first build fills a lane on the edge
	function bankPair() {
		const { edge, sea, riverHex, side } = setupSeaRiverPair()
		const seaBucket = sea.bucketIdsInitial[0]
		const toBanks = riverHex.cornerNodeIds[side].map((node) => riverHex.bucketIdsInitial[riverHex.nodeBucketIds[node]])
		assert.deepEqual(sea.bucketIdsInitial, [0], "the whole sea tile is a single bucket")
		assert.deepEqual(edge.hasTrainTrack, [false, false], "the sea-river edge carries one lane per bank")
		assert.notEqual(toBanks[0], toBanks[1], "the river splits the shared side into two banks")
		const options = map.allVertexBucketsWithoutTrainTracksAdjacentTo(sea.hexID, [seaBucket])
		assert.equal(options.length, 2, "the sea tile offers both banks of the river")
		return { edge, seaBucket, toBanks }
	}

	const far = bankPair()
	assert.equal(map.addTrainTrackToMap_core([1, far.seaBucket], [0, far.toBanks[1]]), true, "the far bank builds")
	assert.deepEqual(far.edge.hasTrainTrack, [false, true], "the lane follows the bank clicked on the river tile")

	const near = bankPair()
	assert.equal(map.addTrainTrackToMap_core([1, near.seaBucket], [0, near.toBanks[0]]), true, "the near bank builds too")
	assert.deepEqual(near.edge.hasTrainTrack, [true, false], "the other click picks the other lane")
})

test("the player picks which good pays for the ride", { skip: skip }, () => {
	const { store, startBucket } = setupTrainRideMap()
	const first = train.findTrainFare(0)
	model.addResourceToGame_core(rf.RES_CLAY, [rf.LOCATION_BUCKET, 0, startBucket], 9)
	const second = model.getAllInGameResources().find((r) => r.id !== first.id)

	const fares = train.getEligibleTrainFares(0)
	assert.equal(fares.length, 2, "both goods on the tile can pay")
	assert.ok(fares[0].id < fares[1].id, "eligible goods are offered lowest id first")

	store.context.selectedTransporterIDforTM = 0
	train.selectTrainFare(second.id)
	assert.equal(store.context.selectedTrainFareResID, second.id, "the picked good is remembered")
	assert.ok(store.context.resourceIDsToHighlight.includes(first.id), "every eligible good is highlighted")
	assert.ok(store.context.resourceIDsToHighlight.includes(second.id), "the picked good stays highlighted")
	assert.notEqual(first.location[0], rf.LOCATION_OOB, "picking a good moves nothing")

	// Backing out of the pick leaves the goods exactly where they were
	store.context.selectedTrainFareResID = -1
	train.selectTrainFare(second.id)
	assert.equal(store.context.selectedTrainFareResID, second.id, "the pick can be made again")

	train.takeTrain(0, 2, train.getTrackBucketsInHex(2)[0], second)
	assert.equal(second.location[0], rf.LOCATION_OOB, "the good you picked pays the fare")
	assert.notEqual(first.location[0], rf.LOCATION_OOB, "the good you did not pick is untouched")
})

test("train tracks survive a whole-turn reset", { skip: skip }, async () => {
	const { store } = setupTwoHexMap()
	store.mapData.setupData = {}

	// A reset point captured before any track existed
	const staleSnapshot = funcs.simpleExportWholeRNBmodel()

	assert.equal(map.addTrainTrackToMap_core([0, 0], [1, 0]), true, "the map editor builds a track")
	store.mapData.setupData = { TN: map.compressTrainTracksForMap() }
	store.gameOptions.useTrains = true

	await funcs.simpleImportWholeRNBmodel(staleSnapshot, false)

	const reloaded = store.mapData.edgeData[0]
	assert.deepEqual(reloaded.hasTrainTrack, [true], "the track is re-applied from the map definition")
	assert.equal(store.gameOptions.useTrains, true, "trains are still enabled after the reset")
	assert.ok(train.isTrainsEnabled(), "the ride is still available after the reset")
})

test("sea tracks carry ships and planes; land transporters cannot end there", { skip: skip }, () => {
	// Ship on a sea track: can board and gets off on a sea stopping vertex.
	const shipMap = setupSeaTrainMap()
	model.addTransporterToGame(0, rf.RAFT, [rf.LOCATION_BUCKET, 0, shipMap.startBucket], true)
	model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, 0, shipMap.startBucket], 9)
	assert.equal(train.canTransporterUseTrain(0), true, "a ship on a sea track can ride")
	assert.ok(train.getTrainDestinations(0).some(([hexID, bucketID]) => hexID === 1 && bucketID === shipMap.toBucket), "the other sea tile is a destination")
	const shipFare = train.findTrainFare(0)
	train.takeTrain(0, 1, shipMap.toBucket, shipFare)
	assert.equal(loc.isSeaVertexLocation(model.getTransporterByID(0).location), true, "the ship gets off on the sea")

	// Plane on the same sea track.
	const planeMap = setupSeaTrainMap()
	model.addTransporterToGame(0, rf.PLANE, [rf.LOCATION_BUCKET, 0, planeMap.startBucket], true)
	model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, 0, planeMap.startBucket], 9)
	assert.equal(train.canTransporterUseTrain(0), true, "a plane on a sea track can ride")
	const planeFare = train.findTrainFare(0)
	train.takeTrain(0, 1, planeMap.toBucket, planeFare)
	assert.equal(loc.isSeaVertexLocation(model.getTransporterByID(0).location), true, "the plane gets off on the sea")

	// Land transporter on a land track into a sea tile must not be offered the sea.
	setupLandSeaMap()
	assert.equal(map.addTrainTrackToMap_core([0, 0], [1, 0]), true)
	const landBucket = train.getTrackBucketsInHex(0)[0]
	model.addTransporterToGame(0, rf.DONKEY, [rf.LOCATION_BUCKET, 0, landBucket], true)
	model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, 0, landBucket], 9)
	assert.ok(!train.getTrainDestinations(0).some(([hexID]) => hexID === 1), "a land transporter cannot end on the sea track")
})

test("another client verifies a ship's sea-track ride", { skip: skip }, () => {
	const shipMap = setupSeaTrainMap()
	model.addTransporterToGame(0, rf.RAFT, [rf.LOCATION_BUCKET, 0, shipMap.startBucket], true)
	model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, 0, shipMap.startBucket], 9)
	const fare = train.findTrainFare(0)
	const stackAction = {
		action: rf.STACK_TAKE_TRAIN,
		historyEntry: [rf.STACK_TAKE_TRAIN, 0, [...stack.compressLocation([rf.LOCATION_BUCKET, 0, shipMap.startBucket])], [...stack.compressLocation([rf.LOCATION_BUCKET, 1, shipMap.toBucket])], [fare.id], fare.id],
		playerIndex: 0,
	}
	assert.equal(stack.verifySingleStackAction(stackAction), 0, "the sea-track ride verifies")
	stack.performSingleStackAction(stackAction, false)
	assert.equal(loc.isSeaVertexLocation(model.getTransporterByID(0).location), true, "the ship lands on the sea")
})

test("a carrier takes its carried transporter on one fare; the carried one cannot board alone", { skip: skip }, () => {
	const { store, startBucket } = setupTrainRideMap()
	const donkey = model.getTransporterByID(0)
	store.ALL_TRANSPORTERS.push({ id: 1, type: rf.RAFT, uniqueID: "00033000001", location: [rf.LOCATION_TRANSPORTER, donkey.id], remainingMoves: 3, ownerIndex: 0, movedThisTurn: false, justPickedUpFromLocation: [], rawTransporterXY: [0, 0] })
	const fare = train.findTrainFare(0)
	assert.equal(train.canTransporterUseTrain(0), true, "the carrier can ride")
	assert.equal(train.canTransporterUseTrain(1), false, "the carried transporter cannot board by itself")
	train.takeTrain(0, 2, train.getTrackBucketsInHex(2)[0], fare)
	assert.equal(donkey.location[1], 2, "the carrier moves")
	assert.deepEqual(model.getTransporterByID(1).location, [rf.LOCATION_TRANSPORTER, donkey.id], "the carried transporter stays loaded")
	assert.equal(model.getResByID(fare.id).location[0], rf.LOCATION_OOB, "only one fare is spent")
	assert.deepEqual(store.actionStack[0].historyEntry[4], [-1, 1], "the payload records the carried transporter")
})

test("a plane can take a land track", { skip: skip }, () => {
	const { store, startBucket } = setupTrainRideMap()
	store.ALL_TRANSPORTERS.splice(0)
	model.addTransporterToGame(0, rf.PLANE, [rf.LOCATION_BUCKET, 0, startBucket], true)
	model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, 0, startBucket], 9)
	assert.equal(train.canTransporterUseTrain(0), true, "a plane on a land track can ride")
	const fare = train.findTrainFare(0)
	train.takeTrain(0, 2, train.getTrackBucketsInHex(2)[0], fare)
	assert.equal(loc.isLandVertexLocation(model.getTransporterByID(0).location), true, "the plane gets off on land")
})

test("a docked ship can use a land track and get off at a dock", { skip: skip }, () => {
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

	const land0 = hd.createActualHex([0, 0, 0], 0, rf.PASTURE_1)
	land0.hexID = 0
	const land1 = hd.createActualHex([0, 1, -1], 0, rf.PASTURE_1)
	land1.hexID = 1
	const sea0 = hd.createActualHex([1, -1, 0], 0, rf.SEA_1)
	sea0.hexID = 2
	const sea1 = hd.createActualHex([1, 0, -1], 0, rf.SEA_1)
	sea1.hexID = 3
	store.mapData.hexData.push(land0, land1, sea0, sea1)
	map.addNewEdge([0, 1])
	map.addNewEdge([0, 2])
	map.addNewEdge([1, 3])
	hd.updateAllHexRawXY()
	assert.equal(map.addTrainTrackToMap_core([0, 0], [1, 0]), true, "land track")
	const fromBucket = train.getTrackBucketsInHex(0)[0]
	const toBucket = train.getTrackBucketsInHex(1)[0]

	const dockSide = land0.hexLookup.indexOf(2)
	const dock = loc.setDockedLocation(0, dockSide, rf.BANK_NONE, 0)
	store.ALL_TRANSPORTERS.push({ id: 0, type: rf.RAFT, uniqueID: "00033000000", location: dock, remainingMoves: 3, ownerIndex: 0, movedThisTurn: false, justPickedUpFromLocation: [], rawTransporterXY: [0, 0] })
	model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, 0, fromBucket], 9)
	assert.equal(train.canTransporterUseTrain(0), true, "a docked ship can board the land track")
	assert.ok(train.getTrainDestinations(0).some(([hexID]) => hexID === 1), "the other land tile with a dock is a destination")
	const fare = train.findTrainFare(0)
	train.takeTrain(0, 1, toBucket, fare)
	assert.equal(loc.isDockedLocation(model.getTransporterByID(0).location), true, "the ship gets off at a dock")
})

test("a ship in a river can use the track to reach the sea", { skip: skip }, () => {
	const { store, sea, riverHex, side } = setupSeaRiverPair()
	store.players.push({ name: "A", displayName: "", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.gameflow.phase = rf.PHASE_MOVEMENT_TO
	store.gameflow.turnOrder = [0]
	store.gameflow.fullTurnOrder = [0]
	const seaBucket = sea.bucketIdsInitial[0]
	const fromBanks = riverHex.cornerNodeIds[side].map((node) => riverHex.bucketIdsInitial[riverHex.nodeBucketIds[node]])
	assert.equal(map.addTrainTrackToMap_core([1, seaBucket], [0, fromBanks[0]]), true, "track from the sea onto the river bank")
	const riverID = riverHex.riverVertexRiverIds.find((id) => id >= 0)
	const riverVertex = loc.getRiverVertexForNewTransporterFromHexIDandBucketID(riverHex.hexID, riverID)
	store.ALL_TRANSPORTERS.push({ id: 0, type: rf.RAFT, uniqueID: "00033000000", location: [rf.LOCATION_RIVER_VERTEX, riverHex.hexID, riverVertex], remainingMoves: 3, ownerIndex: 0, movedThisTurn: false, justPickedUpFromLocation: [], rawTransporterXY: [0, 0] })
	model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, riverHex.hexID, fromBanks[0]], 9)
	assert.equal(train.canTransporterUseTrain(0), true, "a ship in a river can board the track")
	assert.ok(train.getTrainDestinations(0).some(([hexID]) => hexID === sea.hexID), "the sea is a destination")
	const fare = train.findTrainFare(0)
	train.takeTrain(0, sea.hexID, seaBucket, fare)
	assert.equal(loc.isSeaVertexLocation(model.getTransporterByID(0).location), true, "the ship gets off on the sea")
})

test("a ship can ride from the sea into a river", { skip: skip }, () => {
	const { store, sea, riverHex, side } = setupSeaRiverPair()
	store.players.push({ name: "A", displayName: "", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.gameflow.phase = rf.PHASE_MOVEMENT_TO
	store.gameflow.turnOrder = [0]
	store.gameflow.fullTurnOrder = [0]
	const seaBucket = sea.bucketIdsInitial[0]
	const toBanks = riverHex.cornerNodeIds[side].map((node) => riverHex.bucketIdsInitial[riverHex.nodeBucketIds[node]])
	assert.equal(map.addTrainTrackToMap_core([1, seaBucket], [0, toBanks[0]]), true, "track from the sea onto the river bank")
	model.addTransporterToGame(0, rf.RAFT, [rf.LOCATION_BUCKET, sea.hexID, seaBucket], true)
	model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, sea.hexID, seaBucket], 9)
	assert.ok(train.getTrainDestinations(0).some(([hexID]) => hexID === riverHex.hexID), "the river is a destination")
	const fare = train.findTrainFare(0)
	train.takeTrain(0, riverHex.hexID, toBanks[0], fare)
	const destination = model.getTransporterByID(0).location
	assert.ok(loc.isRiverVertexLocation(destination) || loc.isDockedLocation(destination), "the ship gets off in the river or at its dock")
})
