/**
 * &c Electricity: a fuelled plant doubles primary output, mines pull twice.
 *
 * Run with:
 *     node --test tests/electricity-production.test.js
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
globalThis.window.initData = { pov: 0, playerNames: [], gameID: 1, gameName: "electricity-production-test", gameCreationTimestamp: 0, finishedGame: false, startingMap: [], startingOptions: [], preferredRNBoptions: {}, currentMoveData: {}, allMyMoveData: [], allStackData: [], currentPlayers: [], transactionID: "", kickoutRequired: 0, secondsToNextKickout: 99999, notes: "", yourTurnAudioType: 0, myStatsExcludeConsent: 0, statsExcludedGame: false }
function makeElementStub() { return { style: {}, classList: { add: () => {}, remove: () => {}, contains: () => false }, setAttribute: () => {}, appendChild: () => {}, removeChild: () => {}, innerHTML: "", textContent: "", content: { firstChild: null }, firstChild: null, children: [], parentNode: null } }
globalThis.document = globalThis.document || { cookie: "", getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], documentElement: { clientWidth: 800, clientHeight: 600 }, createElement: () => makeElementStub(), createElementNS: () => makeElementStub(), createTextNode: () => ({}), createComment: () => ({}), body: makeElementStub(), head: makeElementStub() }
globalThis.window.document = globalThis.window.document || globalThis.document
globalThis.alert = globalThis.alert || (() => {})

let rf, model, produce, hd, useModelStore, usePersonalStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js")
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	model = await import("../src/js/RNBmodel.js")
	produce = await import("../src/js/RNBproduce.js")
	hd = await import("../src/js/RNBhex.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
	;({ usePersonalStore } = await import("../src/stores/RNBpersonal.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

function setup(powered) {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.soloGame = false
	personal.trainingGame = false
	store.players.splice(0)
	store.players.push({ name: "A", displayName: "A", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.gameflow.turn = 1
	store.gameOptions.useElectricity = true
	store.gameOptions.useSoloMineRules = false
	store.context.poweredBucketKeys = powered ? ["0:0"] : []
	store.ALL_RESOURCES.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_TRANSPORTERS.splice(0)
	const hex = hd.createActualHex([0, 0, 0], 0, rf.PASTURE_1)
	hex.hexID = 0
	store.mapData.hexData.splice(0, store.mapData.hexData.length, hex)
	store.ALL_BUILDINGS.push({ id: 0, type: rf.BLDG_MINE, location: [rf.LOCATION_BUCKET, 0, 0], remainingMineContent: [10, 10], remainingConversions: 1 })
	return store
}

test("a powered mine pulls two goods, an unpowered mine pulls one", { skip }, () => {
	const originalRandom = Math.random
	Math.random = () => 0.5
	try {
		const powered = setup(true)
		const mined = produce.addBuildingOutputResourcesToGame_core(0, -1, 9, false)
		assert.equal(powered.ALL_RESOURCES.length, 2, "powered mine produces two goods")
		assert.equal(mined.length, 2, "both pulls are recorded")
		assert.equal(powered.ALL_BUILDINGS[0].remainingMineContent[0] + powered.ALL_BUILDINGS[0].remainingMineContent[1], 18, "the mine is exhausted twice")

		const normal = setup(false)
		const normalMined = produce.addBuildingOutputResourcesToGame_core(0, -1, 9, false)
		assert.equal(normal.ALL_RESOURCES.length, 1, "unpowered mine produces one good")
		assert.equal(normalMined.length, 1)
		assert.equal(normal.ALL_BUILDINGS[0].remainingMineContent[0] + normal.ALL_BUILDINGS[0].remainingMineContent[1], 19, "one pull")
	} finally {
		Math.random = originalRandom
	}
})
