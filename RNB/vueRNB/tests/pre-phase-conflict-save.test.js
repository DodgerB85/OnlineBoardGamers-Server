/**
 * Saving a pre-phase conflict keeps the conflict's real turn/phase, even while
 * production setup (17) is the visible phase.
 *
 * Run with: node --test tests/pre-phase-conflict-save.test.js
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
	gameName: "pre-phase-conflict-save-test",
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

let rf, IO, useModelStore, usePersonalStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js")
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	IO = await import("../src/backend/RNB_IO.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
	;({ usePersonalStore } = await import("../src/stores/RNBpersonal.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

test("a setup conflict is saved on the setup turn, not next turn", { skip }, async () => {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()

	store.players.push({ name: "A", displayName: "A", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	personal.pov = 0
	personal.name = "A"
	personal.gameID = 1
	personal.latestUpdate = 1
	personal.soloGame = false
	personal.trainingGame = false

	store.gameflow.turn = 2
	store.gameflow.phase = rf.PRE_PHASE_CONFLICT_MOVEMENT
	store.gameflow.currentPhase = rf.PHASE_PRODUCTION_SETUP_TO
	store.gameflow.futureUnboundedConflictPhaseNum = 4
	store.gameflow.turnOrder = []
	store.actualGameState.turn = 2
	store.actualGameState.phase = rf.PHASE_PRODUCTION_SETUP_TO
	store.conflictPreset.conflictDecision = rf.CONFLICT_DECISION_NO_CONFLICT
	store.conflictPreset.prayingDecision = rf.CONFLICT_PRAYING_WAIT_AND_SEE
	store.conflictPreset.turnOrderDecision = rf.CONFLICT_TURN_ORDER_WAIT_AND_SEE

	let body
	globalThis.fetch = async (_url, options) => {
		body = JSON.parse(options.body)
		return {
			ok: true,
			json: async () => ({ savedConflictPreset: true, gameDataB64: "", currentMoveData: {}, allMyMoveData: [] }),
		}
	}

	await IO.savePrePhaseConflict()

	const compressed = Uint8Array.from(Buffer.from(body.conflictPresetData, "base64"))
	const savedMove = JSON.parse(globalThis.pako.ungzip(compressed, { to: "string" }))
	assert.deepEqual(savedMove, { turn: 2, phase: rf.PHASE_CONFLICT_MOVEMENT_DECISION, conflictPreset: [rf.CONFLICT_DECISION_NO_CONFLICT, rf.CONFLICT_PRAYING_WAIT_AND_SEE, rf.CONFLICT_TURN_ORDER_WAIT_AND_SEE] })

	// The panel must see the move even if the response's list was read a moment earlier.
	const turnRequired = rf.getPrePhaseConflictTurn(store.gameflow.turn, store.gameflow.phase, store.gameflow.futureUnboundedConflictPhaseNum)
	const prePhaseData = personal.allMyMoveData.find((entry) => entry.turn === turnRequired && entry.phase === rf.PHASE_CONFLICT_MOVEMENT_DECISION)
	assert.ok(prePhaseData && prePhaseData.conflictPreset, "the saved conflict is visible in the pre-phase panel")
})

test("ending a setup production preset saves the conflict chosen in its panel", { skip }, async () => {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()

	store.players.push({ name: "A", displayName: "A", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	personal.pov = 0
	personal.name = "A"
	personal.gameID = 1
	personal.latestUpdate = 1
	personal.soloGame = false
	personal.trainingGame = false

	store.gameflow.turn = 2
	store.gameflow.phase = rf.PRE_PHASE_PRODUCTION
	store.gameflow.currentPhase = rf.PHASE_PRODUCTION_SETUP_TO
	store.gameflow.futureUnboundedMainPhaseNum = rf.PHASE_PRODUCTION_TO
	store.gameflow.turnOrder = []
	store.actualGameState.turn = 2
	store.actualGameState.phase = rf.PHASE_PRODUCTION_SETUP_TO
	store.actionStack.splice(0)
	store.conflictPreset.conflictDecision = rf.CONFLICT_DECISION_CONFLICT
	store.conflictPreset.prayingDecision = rf.CONFLICT_PRAYING_CASH_IN
	store.conflictPreset.turnOrderDecision = rf.CONFLICT_TURN_ORDER_EARLIEST

	let body
	globalThis.fetch = async (_url, options) => {
		body = JSON.parse(options.body)
		return {
			ok: true,
			json: async () => ({ savedMoveForLater: true, gameDataB64: "", currentMoveData: {}, allMyMoveData: [] }),
		}
	}

	await IO.savePrePhaseMain()

	const compressed = Uint8Array.from(Buffer.from(body.conflictPresetData, "base64"))
	const savedConflicts = JSON.parse(globalThis.pako.ungzip(compressed, { to: "string" }))
	assert.deepEqual(savedConflicts[0], {
		turn: 2,
		phase: rf.PHASE_CONFLICT_MOVEMENT_DECISION,
		conflictPreset: [rf.CONFLICT_DECISION_CONFLICT, rf.CONFLICT_PRAYING_CASH_IN, rf.CONFLICT_TURN_ORDER_EARLIEST],
	})
})
