/**
 * One main phase per player per turn.
 *
 * Game 38166: a player's turn-8 movement preset was applied just after the
 * movement conflict resolved, and then the stored preset was applied again
 * when their place in the new turn order came up.  Presets stay in
 * moveDataJSON for a couple of phases (PclearPastMoveData), so the stack
 * processor must treat "already has a movement entry in this turn's history"
 * as done and consume the stale preset instead of playing it again.
 *
 * Run with:
 *     node --test tests/preset-double-move.test.js
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
	gameName: "preset-double-move-test",
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

let rf, model, IO, useModelStore, usePersonalStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js")
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	model = await import("../src/js/RNBmodel.js")
	IO = await import("../src/backend/RNB_IO.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
	;({ usePersonalStore } = await import("../src/stores/RNBpersonal.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

function setupMovementWithCompletedPreset() {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()

	const names = ["A", "B"]
	store.players.splice(0)
	for (const name of names) store.players.push({ name, displayName: "", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })

	personal.pov = 0
	personal.name = names[0]
	personal.gameCreationTimestamp = 0
	personal.soloGame = false
	personal.trainingGame = false

	store.gameflow.turn = 8
	store.gameflow.phase = rf.PHASE_MOVEMENT_TO
	store.gameflow.turnOrder = [0, 1]
	store.gameflow.fullTurnOrder = [0, 1]
	store.actionStack.splice(0)
	store.history.splice(0)
	store.stackControl.loadedPreMove = false
	store.stackControl.loadedPreMoveIsSkip = false

	model.addHistory(rf.HIST_NEW_TURN, -1, 0, [8])
	// A already completed their movement this turn, but the preset is still stored.
	model.addHistory(rf.HIST_STACK_ACTIONS, 0, 0, [rf.PHASE_MOVEMENT_TO, [rf.STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY, 0, 1]])

	personal.currentMoveData = { turn: 8, phase: rf.PHASE_MOVEMENT_TO, username: names[0], actionStack: "stale-preset" }
	personal.allMyMoveData = [personal.currentMoveData]

	return { store, personal }
}

test("a stale preset is consumed, not played again, after the player already acted", { skip: skip }, () => {
	const { store } = setupMovementWithCompletedPreset()
	const historyLength = store.history.length
	const allStackData = [{ turn: 8, phase: rf.PHASE_MOVEMENT_TO, username: "A", actionStack: "stale-preset" }]

	const result = IO.processMainMoveStacks(allStackData)

	assert.equal(result, true)
	assert.deepEqual(store.gameflow.turnOrder, [1], "the stale preset still hands the turn to the next player")
	assert.equal(store.history.length, historyLength, "no second movement entry is added")
	assert.equal(allStackData.length, 0, "the stale preset is consumed")
})

test("an already-acted player is removed from the middle of the turn order", { skip: skip }, () => {
	const { store } = setupMovementWithCompletedPreset()
	store.players.push({ name: "C", displayName: "", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.players.push({ name: "D", displayName: "", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.gameflow.turnOrder = [2, 1, 0, 3]

	IO.processMainMoveStacks([])

	assert.deepEqual(store.gameflow.turnOrder, [2, 1, 3], "the player who already moved is skipped, the rest keep their order")
})

test("an already-acted player's stored preset is not previewed on reload", { skip: skip }, () => {
	const { store } = setupMovementWithCompletedPreset()
	const historyLength = store.history.length

	IO.loadCurrentMove()

	assert.equal(store.stackControl.loadedPreMove, false, "the stale preset is not loaded")
	assert.equal(store.history.length, historyLength, "loading adds no duplicate movement history")
	assert.equal(store.actionStack.length, 0, "the stale preset is not performed")
})
