/**
 * River sides connecting to polder hexes.
 *
 * A river hex may now end at a polder (map editor allows it). In-game:
 * - while the polder is flooded (TERR_POLDER_WET) boats move between the river
 *   vertex and the polder's water (one MOVE_WATER cross-hex edge, no docking);
 * - while the polder is drained (TERR_POLDER_DRY) the dike blocks boats - no
 *   water hop onto the polder, no docking against it - but a land transporter
 *   on the polder may cross onto the river hex, reaching either bank (two
 *   MOVE_DONKEY cross-hex edges from the polder's shared-side vertex).
 *
 * Run with:
 *     node --test tests/river-polder.test.js
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
	gameName: "river-polder-test",
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

let rf, hd, map, graph, useModelStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js") // attaches the pako browser global used by RNB code
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	hd = await import("../src/js/RNBhex.js")
	map = await import("../src/js/RNBmap.js")
	graph = await import("../src/js/RNBgraph.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

// A 2-hex map: hex 0 is a straight river pasture at [0,0,0] (river exits sides 2
// and 5), hex 1 is a polder at [0,1,-1]. getJoiningSide puts the polder across
// the river hex's side 2, so the river exits straight into the polder.
function setupRiverPolderMap() {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.mapData.hexData.splice(0)
	store.mapData.edgeData.splice(0)

	const riverHex = hd.createActualHex([0, 0, 0], 0, rf.PASTURE_RIVER_STRAIGHT)
	riverHex.hexID = 0
	store.mapData.hexData.push(riverHex)
	const polderHex = hd.createActualHex([0, 1, -1], 0, rf.POLDER_1)
	polderHex.hexID = 1
	store.mapData.hexData.push(polderHex)

	map.addNewEdge([0, 1])
	return { store }
}

// All cross-hex edges (by node ids) between the two hexes, with types and locations.
function crossEdgesBetween(graphObj, hexA, hexB) {
	return graphObj.edges.nodes
		.map((nodes, i) => ({
			type: graphObj.edges.types[i],
			hexes: nodes.map((n) => graphObj.nodes.hexIds[n]),
			locations: nodes.map((n) => graphObj.nodes.locations[n]),
		}))
		.filter((e) => e.hexes.includes(hexA) && e.hexes.includes(hexB))
}

test("flooded polder: river connects to the polder with a single water move", { skip: skip }, () => {
	const { store } = setupRiverPolderMap()
	store.mapData.hexData[1].currentTerrain = rf.TERR_POLDER_WET

	const g = graph.createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, 0)
	const cross = crossEdgesBetween(g, 0, 1)

	assert.equal(cross.length, 1, "exactly one cross-hex edge between river hex and flooded polder")
	assert.equal(cross[0].type, rf.MOVE_WATER, "the connection is a water move")
	// One end is the river hex's side-2 river exit vertex (sideRiverVertexIds[2] = 6),
	// the other is one of the polder's stopping vertices (1-6).
	assert.deepEqual(cross[0].locations.find((l) => l[0] === rf.LOCATION_RIVER_VERTEX), [rf.LOCATION_RIVER_VERTEX, 0, 6], "river end of the edge is the side-2 river exit vertex")
	const polderEnd = cross[0].locations.find((l) => l[0] === rf.LOCATION_SEA_VERTEX)
	assert.ok(polderEnd, "polder end of the edge is a sea vertex")
	assert.equal(polderEnd[1], 1, "polder end belongs to the polder hex")
	assert.ok(polderEnd[2] >= 1 && polderEnd[2] <= 6, "polder end is a stopping vertex")
})

test("drained polder: boats are blocked, but a land transporter may cross onto either bank", { skip: skip }, () => {
	const { store } = setupRiverPolderMap()
	store.mapData.hexData[1].currentTerrain = rf.TERR_POLDER_DRY

	const g = graph.createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, 0)
	const cross = crossEdgesBetween(g, 0, 1)

	// The dike blocks water: no MOVE_WATER edges, no docked (coast) nodes.
	assert.ok(cross.every((e) => e.type !== rf.MOVE_WATER), "no water edges between river hex and drained polder")
	assert.ok(cross.every((e) => e.locations.every((l) => l[0] !== rf.LOCATION_DOCKED)), "no docking against the drained polder")
	// Land crossing: the polder's shared-side vertex (side 5 -> vertex 6) connects
	// to BOTH banks of the river hex (corner nodes 3 and 6 on its river side 2).
	assert.equal(cross.length, 2, "exactly two land edges: one per river bank")
	assert.ok(cross.every((e) => e.type === rf.MOVE_DONKEY), "the land edges are cross-country (donkey) moves")
	for (const e of cross) {
		assert.deepEqual(e.locations.find((l) => l[1] === 1), [rf.LOCATION_LAND_VERTEX, 1, 6], "polder end of each edge is its shared-side vertex")
	}
	assert.deepEqual(
		cross.map((e) => e.locations.find((l) => l[1] === 0)[2]).sort((a, b) => a - b),
		[3, 6],
		"river ends of the edges are the two river banks (vertices 3 and 6)",
	)
})

test("drained polder: a donkey on the polder can pathfind onto both banks of the river hex", { skip: skip }, () => {
	const { store } = setupRiverPolderMap()
	store.mapData.hexData[1].currentTerrain = rf.TERR_POLDER_DRY

	const g = graph.createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, 0)
	const donkey = rf.getTransporterStats(rf.DONKEY)
	const result = graph.pathfind(g, [rf.LOCATION_LAND_VERTEX, 1, 6], donkey.validMove, 2)

	// Each bank of the river hex is a bucket (bucket 0 spans vertices 0-5, bucket 1 spans 6-9)
	const riverHex = store.mapData.hexData[0]
	const reachedBuckets = result.locations
		.filter((l, i) => l[0] === rf.LOCATION_LAND_VERTEX && l[1] === 0 && result.cost[i] > 0)
		.map((l) => riverHex.nodeBucketIds[l[2]])
	assert.deepEqual([...new Set(reachedBuckets)].sort(), [0, 1], "both banks (buckets) of the river hex are reachable from the polder")
})

test("graph stays clean with a drained polder - no edges reference out-of-range nodes", { skip: skip }, () => {
	const { store } = setupRiverPolderMap()
	store.mapData.hexData[1].currentTerrain = rf.TERR_POLDER_DRY

	const g = graph.createCompleteGraph(store.mapData.hexData, store.mapData.edgeData, 0)
	const nodeCount = g.nodes.types.length
	for (const nodes of g.edges.nodes) {
		for (const n of nodes) {
			assert.ok(n >= 0 && n < nodeCount, `edge endpoint ${n} is a valid node index (nodeCount ${nodeCount})`)
		}
	}
})
