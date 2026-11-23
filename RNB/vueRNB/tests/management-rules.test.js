/**
 * &c Management: managers double secondary producer capacity, one per tile.
 *
 * Run with:
 *     node --test tests/management-rules.test.js
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
globalThis.window.initData = { pov: 0, playerNames: [], gameID: 1, gameName: "management-rules-test", gameCreationTimestamp: 0, finishedGame: false, startingMap: [], startingOptions: [], preferredRNBoptions: {}, currentMoveData: {}, allMyMoveData: [], allStackData: [], currentPlayers: [], transactionID: "", kickoutRequired: 0, secondsToNextKickout: 99999, notes: "", yourTurnAudioType: 0, myStatsExcludeConsent: 0, statsExcludedGame: false }
function makeElementStub() {
	return { style: {}, classList: { add: () => {}, remove: () => {}, contains: () => false }, setAttribute: () => {}, appendChild: () => {}, removeChild: () => {}, innerHTML: "", textContent: "", content: { firstChild: null }, firstChild: null, children: [], parentNode: null }
}
globalThis.document = globalThis.document || { cookie: "", getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: { clientWidth: 800, clientHeight: 600 }, createElement: () => makeElementStub(), createElementNS: () => makeElementStub(), createTextNode: () => ({}), createComment: () => ({}), body: makeElementStub(), head: makeElementStub() }
globalThis.window.document = globalThis.window.document || globalThis.document
globalThis.alert = globalThis.alert || (() => {})

let rf, model, useModelStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js")
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	model = await import("../src/js/RNBmodel.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

function setup() {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.players.splice(0)
	store.players.push({ name: "A", displayName: "A", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.players.push({ name: "B", displayName: "B", colour: 1, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.gameflow.turn = 1
	store.gameflow.phase = rf.PHASE_PRODUCTION_TO
	store.gameflow.productionDecisions = {}
	store.ALL_RESOURCES.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_TRANSPORTERS.splice(0)
	return store
}

function addBuilding(store, id, type) {
	store.ALL_BUILDINGS.push({ id, type, location: [rf.LOCATION_BUCKET, 0, 0], remainingConversions: 0 })
}

test("a manager doubles every secondary producer on its tile, including both city buildings", { skip }, () => {
	const store = setup()
	addBuilding(store, 0, rf.BLDG_SAWMILL)
	addBuilding(store, 1, rf.BLDG_PAPERMILL)
	store.ALL_RESOURCES.push({ type: rf.RES_MANAGER, location: [rf.LOCATION_BUCKET, 0, 0] })
	model.resetBuildingsAfterProduction()
	const sawmill = rf.BUILDING_STATS.find((b) => b.building === rf.BLDG_SAWMILL)
	const papermill = rf.BUILDING_STATS.find((b) => b.building === rf.BLDG_PAPERMILL)
	assert.equal(store.ALL_BUILDINGS[0].remainingConversions, sawmill.maxConversions * 2)
	assert.equal(store.ALL_BUILDINGS[1].remainingConversions, papermill.maxConversions * 2, "the second city building is doubled too")
})

test("two managers do not stack, and a manager only helps secondary producers", { skip }, () => {
	const store = setup()
	addBuilding(store, 0, rf.BLDG_SAWMILL)
	addBuilding(store, 1, rf.BLDG_WOODCUTTER)
	store.ALL_RESOURCES.push({ type: rf.RES_MANAGER, location: [rf.LOCATION_BUCKET, 0, 0] })
	store.ALL_RESOURCES.push({ type: rf.RES_MANAGER, location: [rf.LOCATION_BUCKET, 0, 0] })
	model.resetBuildingsAfterProduction()
	const sawmill = rf.BUILDING_STATS.find((b) => b.building === rf.BLDG_SAWMILL)
	const woodcutter = rf.BUILDING_STATS.find((b) => b.building === rf.BLDG_WOODCUTTER)
	assert.equal(store.ALL_BUILDINGS[0].remainingConversions, sawmill.maxConversions * 2, "still only double")
	assert.equal(store.ALL_BUILDINGS[1].remainingConversions, woodcutter.maxConversions, "primary producers are not doubled")
})

test("a carried manager is switched off by its transporter owner for the turn", { skip }, () => {
	const store = setup()
	addBuilding(store, 0, rf.BLDG_SAWMILL)
	store.ALL_TRANSPORTERS.push({ id: 0, type: rf.DONKEY, ownerIndex: 0, location: [rf.LOCATION_BUCKET, 0, 0], remainingMoves: 2, movedThisTurn: false, justPickedUpFromLocation: [] })
	store.ALL_RESOURCES.push({ type: rf.RES_MANAGER, location: [rf.LOCATION_TRANSPORTER, 0] })
	assert.equal(model.getManagerProductionMultiplierForHex(0), 2, "carried manager is active by default")
	model.setManagerActivation(0, 0, false)
	assert.equal(model.getManagerProductionMultiplierForHex(0), 1, "its owner can switch it off")
	model.setManagerActivation(1, 0, false)
	assert.equal(model.getManagerProductionMultiplierForHex(0), 1, "another player's switch does not turn it back on")
	model.setManagerActivation(0, 0, true)
	assert.equal(model.getManagerProductionMultiplierForHex(0), 2, "its owner can switch it back on")
})

test("switching a manager off preserves conversions already used", { skip }, () => {
	const store = setup()
	addBuilding(store, 0, rf.BLDG_PAPERMILL)
	store.ALL_TRANSPORTERS.push({ id: 0, type: rf.DONKEY, ownerIndex: 0, location: [rf.LOCATION_BUCKET, 0, 0], remainingMoves: 2, movedThisTurn: false, justPickedUpFromLocation: [] })
	store.ALL_RESOURCES.push({ type: rf.RES_MANAGER, location: [rf.LOCATION_TRANSPORTER, 0] })
	model.resetBuildingsAfterProduction()
	const papermill = rf.BUILDING_STATS.find((b) => b.building === rf.BLDG_PAPERMILL)
	// It used its one normal conversion while doubled; switching off leaves no spare.
	store.ALL_BUILDINGS[0].remainingConversions = papermill.maxConversions * 2 - 1
	model.setManagerActivation(0, 0, false)
	assert.equal(store.ALL_BUILDINGS[0].remainingConversions, 0, "the used conversion is kept")
})
