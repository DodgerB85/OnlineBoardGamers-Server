/**
 * Logged-out / not-started viewers must still see the map.
 *
 * initGame()'s early branch (RNBmodel.js: "If NOT your game, and NO game data,
 * then game hasn't started") returns before importStartingMap ever ran, so a
 * pov < 0 viewer with empty gameDataB64 got a blank board (and empty players)
 * with no error at all - even though the server always sends startingMap.
 * The branch now loads the starting map before returning.
 *
 * Requires the RNB frontend deps (vue + pinia):
 *     cd RNB/vueRNB && npm install
 * Run with:
 *     node --test tests/logged-out-map.test.js
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
		const base = specifier.startsWith("/") ? path.resolve(process.cwd(), specifier.slice(1)) : path.resolve(path.dirname(parent), specifier)
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

let rf, model, useModelStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js") // attaches the pako browser global used by RNBfuncs.js
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	model = await import("../src/js/RNBmodel.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

// Two adjacent pasture hexes with one train track between them, plus the
// trailing setup-data element every startingMap carries.
function makeStartingMap() {
	return [
		[0, 0, rf.PASTURE_1],
		[0, 1, rf.PASTURE_1],
		{ UK: -1, TN: [[0, 0, 0, 1, 0]] },
	]
}

test("pov < 0 with empty gameDataB64 still loads the starting map", { skip }, async () => {
	window.initData = {
		pov: -99, // not logged in
		playerNames: [],
		gameID: 1,
		gameName: "logged-out-map-test",
		gameCreationTimestamp: 0,
		finishedGame: false,
		startingMap: makeStartingMap(),
		startingOptions: [],
		preferredRNBoptions: [-1, 1],
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
		gameDataB64: "",
	}

	setActivePinia(createPinia())
	await model.initGame()

	const store = useModelStore()
	assert.equal(store.mapData.hexData.length, 2, "the map must load even though the game has no data")
	assert.equal(store.gameOptions.useTrains, true, "train tracks must render for the logged-out viewer")
	assert.equal(store.players.length, 0, "no game data means no players - the map-only view")
})

test("the same branch with no track data still loads the hexes", { skip }, async () => {
	window.initData.startingMap = [
		[0, 0, rf.PASTURE_1],
		[0, 1, rf.PASTURE_1],
		{ UK: -1 },
	]

	setActivePinia(createPinia())
	await model.initGame()

	const store = useModelStore()
	assert.equal(store.mapData.hexData.length, 2)
	assert.equal(store.gameOptions.useTrains, false)
})
