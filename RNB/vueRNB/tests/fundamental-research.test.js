/**
 * FUNDAMENTAL RESEARCH optional module.
 *
 * Rules: researching Fundamental Research (lightbulb) costs the normal 2 geese + 1 paper.
 * Once a player owns it, every later research that player does costs 1 goose + 1 paper.
 *
 * Regression: the research offers (the bubbles + "You can research on these tiles") came
 * from findAllResearchHexIDpossibilities(), which demanded 2 geese + 1 paper even after
 * Fundamental Research, so a player with exactly 1 goose + 1 paper could not research.
 * The stack verify also charged the cost to whoever was processing the stack rather than
 * the researching player.
 *
 * Run with:
 *     node --test tests/fundamental-research.test.js
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
	gameName: "fundamental-research-test",
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

let rf, hd, model, produce, stack, useModelStore, usePersonalStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js") // attaches the pako browser global used by RNBfuncs.js
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	hd = await import("../src/js/RNBhex.js")
	model = await import("../src/js/RNBmodel.js")
	produce = await import("../src/js/RNBproduce.js")
	stack = await import("../src/js/RNBstack.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
	;({ usePersonalStore } = await import("../src/stores/RNBpersonal.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

// One pasture hex with a donkey owned by player 0 sitting on it. `goods` go into the
// donkey's own bucket. The local client is player `pov` (player 1 in the "another
// client" tests), but the stack always belongs to player 0.
function addGoodToDonkeyHex(store, type) {
	const hex = store.mapData.hexData[0]
	const bucketID = hex.bucketIdsCurrent[hex.nodeBucketIds[0]]
	model.addResourceToGame_core(type, [rf.LOCATION_BUCKET, 0, bucketID], 9)
}

function setupResearchMap(goods = [rf.RES_GOOSE, rf.RES_PAPER], pov = 0) {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.soloGame = false
	personal.trainingGame = false
	personal.pov = pov

	store.players.splice(0)
	store.players.push({ name: "A", displayName: "", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.players.push({ name: "B", displayName: "", colour: 1, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.gameflow.turn = 1
	store.gameflow.phase = rf.PHASE_PRODUCTION_TO
	store.gameflow.turnOrder = [0, 1]
	store.gameflow.fullTurnOrder = [0, 1]

	store.mapData.hexData.splice(0)
	store.mapData.edgeData.splice(0)
	store.ALL_RESOURCES.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_TRANSPORTERS.splice(0)
	store.players[0].RnD[rf.RND_FUNDAMENTAL_RESEARCH_IDX] = 0
	store.players[1].RnD[rf.RND_FUNDAMENTAL_RESEARCH_IDX] = 0

	const pasture = hd.createActualHex([0, 0, 0], 0, rf.PASTURE_1)
	pasture.hexID = 0
	store.mapData.hexData.push(pasture)

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

	const bucketID = pasture.bucketIdsCurrent[pasture.nodeBucketIds[0]]
	for (const good of goods) model.addResourceToGame_core(good, [rf.LOCATION_BUCKET, 0, bucketID], 9)

	return { store, personal }
}

// The [STACK_DO_RESEARCH, transporterID, RND_IDX, hexID] action for researching
// truck factory on the donkey's hex.
function researchTruckAction() {
	return {
		action: rf.STACK_DO_RESEARCH,
		historyEntry: [rf.STACK_DO_RESEARCH, 0, rf.RND_TRUCK_IDX, 0],
		playerIndex: 0,
	}
}

test("research is not offered on 1 goose + 1 paper until Fundamental Research is owned", skip, () => {
	const { store } = setupResearchMap()

	assert.deepEqual(produce.findAllResearchHexIDpossibilities(0), [], "1 goose + 1 paper is not enough yet")

	// Without Fundamental Research the normal 2 geese + 1 paper is required
	addGoodToDonkeyHex(store, rf.RES_GOOSE)
	assert.deepEqual(produce.findAllResearchHexIDpossibilities(0), [0], "2 geese + 1 paper is enough")
})

test("with Fundamental Research owned, 1 goose + 1 paper is enough to research", skip, () => {
	const { store } = setupResearchMap()
	store.players[0].RnD[rf.RND_FUNDAMENTAL_RESEARCH_IDX] = 1

	assert.deepEqual(produce.findAllResearchHexIDpossibilities(0), [0], "the tile is offered for research")
	assert.equal(stack.verifySingleStackAction(researchTruckAction()), 0, "the 1 goose + 1 paper research verifies")

	// Sanity: player 1 has NOT researched it, so their 1 goose + 1 paper is still not enough
	assert.deepEqual(produce.findAllResearchHexIDpossibilities(1), [], "the discount is per player")
})

test("researching Fundamental Research itself still costs 2 geese + 1 paper", skip, () => {
	const { store } = setupResearchMap()

	const fundamentalAction = {
		action: rf.STACK_DO_RESEARCH,
		historyEntry: [rf.STACK_DO_RESEARCH, 0, rf.RND_FUNDAMENTAL_RESEARCH_IDX, 0],
		playerIndex: 0,
	}
	assert.equal(stack.verifySingleStackAction(fundamentalAction), 11, "only 1 goose: researching FR is refused")

	addGoodToDonkeyHex(store, rf.RES_GOOSE)
	assert.equal(stack.verifySingleStackAction(fundamentalAction), 0, "2 geese + 1 paper: allowed")
})

test("another client validates a research move with the MOVER's Fundamental Research", skip, () => {
	// Player 1 is the local client, player 0 owns the donkey and has done the research
	const { store } = setupResearchMap([rf.RES_GOOSE, rf.RES_PAPER], 1)
	store.players[0].RnD[rf.RND_FUNDAMENTAL_RESEARCH_IDX] = 1

	assert.equal(stack.verifySingleStackAction(researchTruckAction()), 0, "player 0's 1 goose + 1 paper research is accepted")

	// And the other way round: player 0 has no Fundamental Research, so 1 goose is too few
	store.players[0].RnD[rf.RND_FUNDAMENTAL_RESEARCH_IDX] = 0
	store.players[1].RnD[rf.RND_FUNDAMENTAL_RESEARCH_IDX] = 1
	assert.equal(stack.verifySingleStackAction(researchTruckAction()), 11, "player 0 still needs 2 geese")
})
