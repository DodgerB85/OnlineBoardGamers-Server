/**
 * Issue #106 - extra ghost RNB turns.
 *
 * Movement/building/wonder/production phases are "pseudo-simul"
 * (RNBcontroller.isMainPhaseAndPseudoSimul): every player still in turnOrder,
 * not just turnOrder[0], is allowed to act early. loadCurrentMove() performing
 * a pending (non-first) player's pre-set move on their OWN client, as soon as
 * it opens, is therefore intentional - it is only a local preview, held in
 * store.actionStack/store.history until that player's own saveStackMove
 * submits it (which is what actually advances turnOrder and consumes the
 * preset server-side).
 *
 * The real bug: saveGame(), saveConflictMove() AND saveAndUpdateNotifictionsAfterStack()
 * all export the caller's WHOLE client model, no matter why they were called, and the
 * server (performSaveGame / the saveConflictMove and saveAndUpdateNotifictionsAfterStack
 * branches of _processRNBturn) trusts that gameDataB64 unconditionally - unlike
 * saveStackMove, which the server only accepts from whoever it agrees is actually current.
 * None of the three check for a lingering, unfinalized pre-set preview first.
 *
 * saveAndUpdateNotifictionsAfterStack() in particular needs NO kickout and NO manual
 * action at all: reloadGameData() (run on every WS "game updated" broadcast AND on every
 * page load, for every connected player) and initGame() both call it automatically to
 * auto-process a stuck transaction, a phase with no current player ("KICKSTART"), or a bot
 * current player ("BOT RECOVERY"). So: I am a pending player in a pseudo-simul phase (eg
 * movement) with my own pre-set for THIS phase; some unrelated broadcast (anyone else's
 * move, or a bot's auto-processed turn - see RnbBot going first in the issue's "New Turn
 * Order") reaches my open tab; reloadGameData() re-imports the fresh server state, notices
 * the new current player is a bot, and calls saveAndUpdateNotifictionsAfterStack() to drive
 * it forward. That function's own loadCurrentMove() call (after ITS OWN export, so that
 * particular save is clean) previews MY pre-set on MY client. If literally anything then
 * triggers another such save from my same tab before I explicitly submit my move, my
 * preview goes out as fact while my turnOrder slot is untouched - the reported "ghost turn".
 * No kickout, resign, or admin action required.
 *
 * The fix: clearUnfinalizedPreMoveBeforeExport() reverts any such preview before
 * saveGame()/saveConflictMove()/saveAndUpdateNotifictionsAfterStack() export the model.
 *
 * Requires the RNB frontend deps (vue + pinia):
 *     cd RNB/vueRNB && npm install
 * Run with:
 *     node --test tests/ghost-turn.test.js
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

let rf, funcs, IO, useModelStore, usePersonalStore, createPinia, setActivePinia, setupError
try {
	await import("../src/pakoLib.js") // attaches the pako browser global used by RNBfuncs.js
	;({ createPinia, setActivePinia } = await import("pinia"))
	rf = await import("../src/js/RNBreference.js")
	funcs = await import("../src/js/RNBfuncs.js")
	IO = await import("../src/backend/RNB_IO.js")
	;({ useModelStore } = await import("../src/stores/RNBstore.js"))
	;({ usePersonalStore } = await import("../src/stores/RNBpersonal.js"))
} catch (error) {
	setupError = error
}
const skip = setupError ? `Run 'npm install' in RNB/vueRNB first (${setupError.message})` : false

// A real (verifiable) single action stack: remove an excess transporter at a
// wagon factory. Any valid pre-set stack behaves the same way.
function makeValidPreSetStack(playerIndex) {
	return [
		{
			action: rf.STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY,
			historyEntry: [rf.STACK_REMOVE_EXCESS_TRANSPORTER_AT_FACTORY, 0, 1],
			playerIndex: playerIndex,
		},
	]
}

// Turn 23 movement phase, 3 players, turn order [A, B, s4lm]. The player at
// `pov` has a pre-set movement move stored against turn 23 phase 7.
function setupMovementPhaseWithPreSetMove(pov) {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()

	const names = ["A", "B", "s4lm"]
	store.players.splice(0)
	for (const name of names) store.players.push({ name: name, displayName: "", colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })

	personal.pov = pov
	personal.name = names[pov]
	personal.gameCreationTimestamp = 0
	personal.soloGame = false
	personal.trainingGame = false

	store.gameflow.turn = 23
	store.gameflow.phase = rf.PHASE_MOVEMENT_TO
	store.gameflow.turnOrder = [0, 1, 2]
	store.gameflow.fullTurnOrder = [0, 1, 2]
	store.history.splice(0)
	store.actionStack.splice(0)
	store.stackControl.loadedPreMove = false
	store.stackControl.loadedPreMoveIsSkip = false

	store.ALL_RESOURCES.splice(0)
	store.ALL_BUILDINGS.splice(0)
	store.ALL_TRANSPORTERS.splice(0)
	store.mapData.hexData.splice(0)
	store.mapData.hexData.push({ hexID: 1, nodeBucketIds: { 0: 0 }, bucketIdsCurrent: [0], rawXY: [0, 0] })
	store.ALL_BUILDINGS.push({ id: 50, type: rf.BLDG_WAGON_FACTORY, location: [rf.LOCATION_LAND_VERTEX, 1, 0] })
	store.ALL_TRANSPORTERS.push({
		id: 0,
		type: rf.WAGON,
		uniqueID: "00031000000",
		location: [rf.LOCATION_LAND_VERTEX, 1, 0],
		remainingMoves: 2,
		ownerIndex: pov,
		movedThisTurn: false,
		justPickedUpFromLocation: [],
	})

	const preSetMove = {
		turn: 23,
		phase: rf.PHASE_MOVEMENT_TO,
		username: names[pov],
		actionStack: funcs.compressData64(makeValidPreSetStack(pov)),
	}
	personal.currentMoveData = preSetMove
	personal.allMyMoveData = [preSetMove]

	return { store, personal }
}

function decodeExportedHistory() {
	// exportRNBmodel packs history at index 4 (see RNBfuncs.js)
	const b64 = funcs.exportRNBmodel(false)
	const bytes = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0))
	// eslint-disable-next-line no-undef
	return JSON.parse(pako.ungzip(bytes, { to: "string" }))[4]
}

test("pending player's pre-set move IS loaded as a local pseudo-simul preview", { skip: skip }, () => {
	const { store } = setupMovementPhaseWithPreSetMove(2) // s4lm is 3rd, pending; A is current

	IO.loadCurrentMove()

	// This is intentional: movement is pseudo-simul, so a pending player may act early.
	assert.equal(store.stackControl.loadedPreMove, true, "pending player's pre-set is loaded as a preview")
	assert.equal(store.history.length, 1, "the preview is recorded like any other performed stack")
	assert.deepEqual(store.ALL_TRANSPORTERS[0].location, [rf.LOCATION_OOB], "the preview is performed on the live board")
})

test("issue #106: an unfinalized preview must not be exported when someone else triggers a save", { skip: skip }, () => {
	const { store } = setupMovementPhaseWithPreSetMove(2) // s4lm is 3rd, pending; A is current

	// s4lm's client silently previews their own pre-set (eg on page load / a WS update),
	// without s4lm doing anything - this is normal pseudo-simul behaviour.
	IO.loadCurrentMove()
	assert.equal(store.history.length, 1, "sanity check: the preview is dirtying s4lm's own client first")

	// Now s4lm's browser is used to save the game for an unrelated reason - eg clicking
	// "Permanently Kickout" on a different, timed-out player, or the admin "Save Game"
	// button. saveGame()/saveConflictMove() must clean up the dirty preview first.
	IO.clearUnfinalizedPreMoveBeforeExport()

	assert.equal(store.stackControl.loadedPreMove, false, "the unfinalized preview flag is cleared")
	assert.equal(store.history.length, 0, "the preview must not leave a history entry behind")
	assert.deepEqual(
		store.ALL_TRANSPORTERS[0].location,
		[rf.LOCATION_LAND_VERTEX, 1, 0],
		"the preview's board mutation must be undone before any export",
	)
	assert.equal(decodeExportedHistory().length, 0, "the preview must not appear in the gameData that gets saved")
	// The player's own turnOrder slot is untouched either way - clearing the preview must
	// not be confused with (and must not require) processing their turn.
	assert.deepEqual(store.gameflow.turnOrder, [0, 1, 2], "turnOrder is unaffected by clearing the preview")
})

test("current player's pre-set move is still loaded for confirmation", { skip: skip }, () => {
	const { store } = setupMovementPhaseWithPreSetMove(0) // A is 1st and has a pre-set move

	IO.loadCurrentMove()

	assert.equal(store.stackControl.loadedPreMove, true, "current player must get their pre-set loaded")
	assert.equal(store.history.length, 1, "current player's pre-set is recorded")
	assert.equal(store.history[0][0], rf.HIST_STACK_ACTIONS)
	assert.equal(store.history[0][1], 0)
	assert.equal(store.history[0][3][0], rf.PHASE_MOVEMENT_TO)
	assert.deepEqual(store.ALL_TRANSPORTERS[0].location, [rf.LOCATION_OOB], "current player's pre-set is performed")
})