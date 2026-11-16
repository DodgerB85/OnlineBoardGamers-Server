/**
 * &c Polder building rules:
 * "Whether they are flooded or not, polders can be built on. They are a new type of
 * land, so building woodcutters, quarries, mines, oil rigs or pearl fishermen is
 * impossible... However, it is allowed to build shoreline buildings."
 *
 * Run with:
 *     node --test tests/polder-build.test.js
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

// Minimal browser surface the RNB code expects (same as city-build.test.js).
globalThis.window = globalThis.window || {}
globalThis.window.atob = globalThis.window.atob || globalThis.atob
globalThis.window.btoa = globalThis.window.btoa || globalThis.btoa
globalThis.window.initData = {
	pov: 0,
	playerNames: [],
	gameID: 1,
	gameName: "polder-build-test",
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

let rf, hd, map, build, model, useModelStore, usePersonalStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js")
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	hd = await import("../src/js/RNBhex.js")
	map = await import("../src/js/RNBmap.js")
	build = await import("../src/js/RNBbuild.js")
	model = await import("../src/js/RNBmodel.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
	;({ usePersonalStore } = await import("../src/stores/RNBpersonal.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

// A 2- or 3-hex map: hex 0 is the given hex terrain at [0,0,0] with a donkey standing
// on land vertex 0 and enough boards/stone in its bucket for any base/&c building.
// Hex 1 is a pasture across side 2; with withSea, hex 2 is sea across side 1, which
// makes the polder shore.
function setup(hexTerrainID, currentTerrain, withSea) {
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

	const hex = hd.createActualHex([0, 0, 0], 0, hexTerrainID)
	hex.hexID = 0
	hex.currentTerrain = currentTerrain
	store.mapData.hexData.push(hex)
	const pasture = hd.createActualHex([0, 1, -1], 0, rf.PASTURE_1)
	pasture.hexID = 1
	store.mapData.hexData.push(pasture)
	map.addNewEdge([0, 1])
	if (withSea) {
		const sea = hd.createActualHex([1, -1, 0], 0, rf.SEA_1)
		sea.hexID = 2
		store.mapData.hexData.push(sea)
		map.addNewEdge([0, 2])
	}

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
	for (let i = 0; i < 6; i++) model.addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, 0, 0], 0)
	for (let i = 0; i < 3; i++) model.addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 0, 0], 0)

	store.context.selectedTransporterIDforTM = 0
	build.setEligibleItemsToBuild(0, 0)
	return { store }
}

for (const [name, terrain] of [
	["drained", rf.TERR_POLDER_DRY],
	["flooded", rf.TERR_POLDER_WET],
]) {
	test(`${name} polder: secondary producers can be built, terrain-bound ones cannot`, { skip: skip }, () => {
		const { store } = setup(rf.POLDER_1, terrain)
		const options = store.context.eligibleBuildingsToBuild

		assert.ok(options.includes(rf.BLDG_WAGON_FACTORY), "wagon factory is offered on a polder")
		assert.ok(options.includes(rf.BLDG_SAWMILL), "sawmill is offered on a polder")
		assert.ok(!options.includes(rf.BLDG_WOODCUTTER), "no woodcutter (needs woods)")
		assert.ok(!options.includes(rf.BLDG_QUARRY), "no quarry (needs rock)")
		assert.ok(!options.includes(rf.BLDG_MINE), "no mine (needs mountains)")
		assert.ok(!options.includes(rf.BLDG_MBA_PASTURE), "no MBA on a polder (each MBA needs its own land type)")
	})
}

// Shoreline buildings ignore the terrain list and only need shore, so they already
// worked on a polder even before this fix - a land-locked polder is not shore.
test("only a polder that touches water is shore enough for the clay pit and raft factory", { skip: skip }, () => {
	const landLocked = setup(rf.POLDER_1, rf.TERR_POLDER_DRY, false).store.context.eligibleBuildingsToBuild
	assert.ok(!landLocked.includes(rf.BLDG_CLAY_PIT), "no clay pit on a land-locked polder")
	assert.ok(!landLocked.includes(rf.BLDG_RAFT_FACTORY), "no raft factory on a land-locked polder")

	const shore = setup(rf.POLDER_1, rf.TERR_POLDER_DRY, true).store.context.eligibleBuildingsToBuild
	assert.ok(shore.includes(rf.BLDG_CLAY_PIT), "clay pit is offered on a polder next to the sea")
	assert.ok(shore.includes(rf.BLDG_RAFT_FACTORY), "raft factory is offered on a polder next to the sea")
})
