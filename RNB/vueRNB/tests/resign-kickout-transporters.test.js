/**
 * A player who resigns or is kicked out leaves the game.
 * model.removeAllTransportersAndGoodsForPlayerIndex must take their transporters,
 * carried transporters, carried goods and following geese off the map (LOCATION_OOB),
 * and leave every other player's pieces alone. Replay calls the same function for
 * HIST_RESIGN / HIST_KICKOUT entries.
 *
 * Requires the RNB frontend deps (vue + pinia):
 *     cd RNB/vueRNB && npm install
 * Run with:
 *     node --test tests/resign-kickout-transporters.test.js
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
	gameName: "resign-kickout-transporters-test",
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

function setupPlayersAndPieces() {
	setActivePinia(createPinia())
	const store = useModelStore()

	store.players.splice(0)
	store.players.push({ name: "Leaver", displayName: "Leaver" }, { name: "Stayer", displayName: "Stayer" })

	store.ALL_TRANSPORTERS.splice(0)
	store.ALL_TRANSPORTERS.push(
		{ id: 0, type: rf.WAGON, ownerIndex: 0, location: [rf.LOCATION_LAND_VERTEX, 0, 0] },
		{ id: 1, type: rf.DONKEY, ownerIndex: 0, location: [rf.LOCATION_TRANSPORTER, 0] }, // riding on the wagon
		{ id: 2, type: rf.WAGON, ownerIndex: 1, location: [rf.LOCATION_LAND_VERTEX, 0, 0] },
	)

	store.ALL_RESOURCES.splice(0)
	store.ALL_RESOURCES.push(
		{ id: 0, type: rf.RES_TRUNKS, location: [rf.LOCATION_TRANSPORTER, 0] }, // carriage on the wagon
		{ id: 1, type: rf.RES_GOOSE, location: [rf.LOCATION_FOLLOWER, 0] }, // following the wagon
		{ id: 2, type: rf.RES_STONE, location: [rf.LOCATION_TRANSPORTER, 1] }, // carriage on the donkey
		{ id: 3, type: rf.RES_BOARDS, location: [rf.LOCATION_TRANSPORTER, 2] }, // the other player's carriage
		{ id: 4, type: rf.RES_TRUNKS, location: [rf.LOCATION_BUCKET, 0, 0] }, // lying on the map
	)

	return store
}

test("a leaving player's transporters, carried pieces and goods all go out of bounds", { skip: skip }, () => {
	const store = setupPlayersAndPieces()

	model.removeAllTransportersAndGoodsForPlayerIndex(0)

	assert.deepEqual(store.ALL_TRANSPORTERS[0].location, [rf.LOCATION_OOB], "the leaver's transporter leaves the map")
	assert.deepEqual(store.ALL_TRANSPORTERS[1].location, [rf.LOCATION_OOB], "the transporter riding on it leaves too")
	assert.deepEqual(store.ALL_RESOURCES[0].location, [rf.LOCATION_OOB], "goods carried on it leave too")
	assert.deepEqual(store.ALL_RESOURCES[1].location, [rf.LOCATION_OOB], "geese following it leave too")
	assert.deepEqual(store.ALL_RESOURCES[2].location, [rf.LOCATION_OOB], "goods on the carried transporter leave too")

	assert.deepEqual(store.ALL_TRANSPORTERS[2].location, [rf.LOCATION_LAND_VERTEX, 0, 0], "another player's transporter is untouched")
	assert.deepEqual(store.ALL_RESOURCES[3].location, [rf.LOCATION_TRANSPORTER, 2], "another player's goods are untouched")
	assert.deepEqual(store.ALL_RESOURCES[4].location, [rf.LOCATION_BUCKET, 0, 0], "resources on the map are untouched")
})
