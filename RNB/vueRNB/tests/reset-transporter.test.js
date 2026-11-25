/**
 * Reset one transporter mid-turn (context.resetTransporter).
 * Uses the real game 37137 fixture and real stack actions: transporter 0 drops
 * goods, transporter 1 (same hex) picks them up.
 *
 * Run with:
 *     node --test tests/reset-transporter.test.js
 */
import test from "node:test"
import { readFileSync } from "node:fs"
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
	gameName: "ghost-turn-test",
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
// msgpack is a browser global RNBfuncs.js expects; JSON is enough for a test export round-trip.
globalThis.msgpack = globalThis.msgpack || {
	encode: (value) => new TextEncoder().encode(JSON.stringify(value)),
	decode: (buffer) => JSON.parse(new TextDecoder().decode(buffer)),
}

let rf, funcs, model, stack, context, useModelStore, usePersonalStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js")
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	funcs = await import("../src/js/RNBfuncs.js")
	model = await import("../src/js/RNBmodel.js")
	stack = await import("../src/js/RNBstack.js")
	context = await import("../src/js/RNBcontext.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
	;({ usePersonalStore } = await import("../src/stores/RNBpersonal.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

const clone = (v) => JSON.parse(JSON.stringify(v))

// Movement phase for Dycu (player 0); transporters 0 and 1 share hex 55, bucket 0
function setup() {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	const fixture = JSON.parse(readFileSync(new URL("./fixtures/conflict-wall-37137.json", import.meta.url), "utf8"))
	store.mapData.externalMapData = fixture.startingMap
	funcs.importRNBmodel(fixture.gameDataB64, false)
	store.gameflow.phase = rf.PHASE_MOVEMENT_TO
	store.gameflow.turnOrder = [0, 1, 2]
	personal.pov = 0
	personal.name = "Dycu"
	personal.soloGame = false
	personal.trainingGame = false
	stack.saveKnownLengths()
	model.resetTransportersForNewTurn()
	store.actionStack.splice(0)
	store.undoPoints.splice(0)
	store.wholeTurnResetData = funcs.simpleExportWholeRNBmodel()
	context.createUndoPoint()
	return store
}

// Same steps a live click takes: perform, add to stack, undo point
function act(historyEntry) {
	const entry = { action: historyEntry[0], historyEntry, playerIndex: 0 }
	assert.equal(stack.verifySingleStackAction(clone(entry)), 0)
	stack.performSingleStackAction(clone(entry), true)
	stack.addItemToStack(entry)
	context.createUndoPoint()
}

function dropThenPickup() {
	act([rf.STACK_STRICT_DROP_RES, 0, [223], [55]])
	act([rf.STACK_STRICT_PICKUP_RES, 1, [223], [55]])
}

test("reset is refused when a later action depends on the transporter, and nothing changes", { skip }, () => {
	const store = setup()
	dropThenPickup()
	const before = funcs.simpleExportWholeRNBmodel()
	const undoCount = store.undoPoints.length

	const blocked = context.resetTransporter(model.getTransporterByID(0))

	assert.deepEqual(blocked, [rf.STACK_STRICT_PICKUP_RES, 1, [223], [55]], "names the pickup that needed the dropped goods")
	assert.equal(funcs.simpleExportWholeRNBmodel(), before, "game state untouched")
	assert.equal(store.undoPoints.length, undoCount, "undo points untouched")
})

test("reset removes only that transporter's actions, and the new stack replays like the server will", { skip }, () => {
	const store = setup()
	dropThenPickup()
	const t1StartCargo = ["160", "198"]

	const blocked = context.resetTransporter(model.getTransporterByID(1))

	assert.deepEqual(blocked, [])
	assert.deepEqual(clone(store.actionStack).map((e) => e.historyEntry), [[rf.STACK_STRICT_DROP_RES, 0, [223], [55]]])
	assert.deepEqual(model.resourcesOnTransport(1).map((r) => String(r.id)).sort(), t1StartCargo, "transporter 1 back to its start cargo")
	assert.equal(model.getResByID(223).location[1], 55, "goods transporter 0 dropped stay on the ground")
	assert.equal(store.undoPoints.length, 2, "turn start + the one kept action")
	const history = store.history[store.history.length - 1]
	assert.deepEqual(history[3], [rf.PHASE_MOVEMENT_TO, [rf.STACK_STRICT_DROP_RES, 0, [223], [55]]], "history row matches the stack")

	// Server-side check: replay the saved stack from the turn start
	const saved = clone(store.actionStack)
	context.resetWholeTurn()
	assert.equal(stack.verifyAndPerformStack(saved, true).verified, true)
	assert.equal(model.getResByID(223).location[1], 55)
})

test("reset with no actions for the transporter does nothing", { skip }, () => {
	const store = setup()
	dropThenPickup()
	const before = funcs.simpleExportWholeRNBmodel()
	assert.deepEqual(context.resetTransporter(model.getTransporterByID(2)), [])
	assert.equal(funcs.simpleExportWholeRNBmodel(), before)
	assert.equal(store.actionStack.length, 2)
})

test("merged entries: two drops by one transporter merge into one entry and both come back on reset", { skip }, () => {
	const store = setup()
	act([rf.STACK_STRICT_DROP_RES, 0, [223], [55]])
	act([rf.STACK_STRICT_DROP_RES, 0, [228], [55]])
	act([rf.STACK_STRICT_DROP_RES, 1, [160], [55]])
	assert.deepEqual(clone(store.actionStack).map((e) => e.historyEntry[2]), [[223, 228], [160]], "the two drops by transporter 0 merged")

	assert.deepEqual(context.resetTransporter(model.getTransporterByID(0)), [])

	assert.deepEqual(clone(store.actionStack).map((e) => e.historyEntry), [[rf.STACK_STRICT_DROP_RES, 1, [160], [55]]], "only transporter 1's drop is left")
	assert.deepEqual(model.resourcesOnTransport(0).map((r) => r.id).sort(), [223, 228])
	assert.equal(model.getResByID(160).location[1], 55, "transporter 1's drop still happened")
})

test("entries naming the transporter second (carried, picked up, stolen from) are included", { skip }, () => {
	const store = setup()
	store.actionStack.push(
		{ action: rf.STACK_PICKUP_TRANSPORTER, historyEntry: [rf.STACK_PICKUP_TRANSPORTER, 18, 0, [4]], playerIndex: 0 },
		{ action: rf.STACK_STEAL_RES, historyEntry: [rf.STACK_STEAL_RES, 3, 0, [223], [55]], playerIndex: 0 },
		{ action: rf.STACK_STRICT_DROP_RES, historyEntry: [rf.STACK_STRICT_DROP_RES, 1, [160], [55]], playerIndex: 0 },
		// a resource ID equal to the transporter ID must not match
		{ action: rf.STACK_STRICT_PICKUP_RES, historyEntry: [rf.STACK_STRICT_PICKUP_RES, 1, [0], [55]], playerIndex: 0 },
	)
	const actions = context.stackEntriesForTransporter(model.getTransporterByID(0)).map((e) => e.action)
	assert.deepEqual(actions, [rf.STACK_PICKUP_TRANSPORTER, rf.STACK_STEAL_RES])
})
