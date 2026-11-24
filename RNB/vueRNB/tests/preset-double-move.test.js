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

test("a server turn order that still names an acted player needs a kickstart", { skip: skip }, () => {
	// Game 37468: the server queue still had gregged and Amifux after both had
	// production history, so the filtered client queue was only [BlackM] and the
	// old "length === 0" check never repaired the server's current player.
	assert.equal(model.turnOrderNeedsKickstart(["gregged", "Amifux", "BlackM"], ["BlackM"]), true)
	assert.equal(model.turnOrderNeedsKickstart(["gregged", "Amifux", "BlackM"], ["gregged", "BlackM"]), true)
	assert.equal(model.turnOrderNeedsKickstart(["gregged", "Amifux", "BlackM"], ["gregged", "Amifux", "BlackM"]), false)
	assert.equal(model.turnOrderNeedsKickstart(["gregged"], ["gregged", "BlackM"]), false, "a server-omitted player is not re-added")
	assert.equal(model.turnOrderNeedsKickstart([], []), true)
})

function setupWonderPhaseWithLeadingBot() {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()

	const names = ["Marcasia726", "gregged", "Amifux", "BlackM"]
	store.players.splice(0)
	for (const name of names) store.players.push({ name, displayName: name, colour: 0, RnD: [0, 0, 0, 0, 0, 0, 0, 0] })
	store.players[0].displayName = rf.BOT_NAME

	personal.pov = 2
	personal.name = "Amifux"
	personal.soloGame = false
	personal.trainingGame = false

	store.gameflow.phase = rf.PHASE_WONDER_TO
	store.gameflow.turn = 33
	store.gameflow.turnOrder = [0, 3, 2, 1]
	return { store, personal }
}

test("a kicked bot at the head of a main phase is not the current player", { skip: skip }, () => {
	// Game 37468: when the wonder conflict's last turn-order choice resolved, the
	// new main order was [Marcasia726 (kicked bot), BlackM, Amifux, gregged]. The
	// save named Marcasia726 as current; the server filtered the bot, leaving no
	// current player, a blank homepage and a game nobody was notified to continue.
	const { store } = setupWonderPhaseWithLeadingBot()

	const next = IO.getNextCurrentPlayers()

	assert.deepEqual(next.allIsCurrentPlayers, ["BlackM"], "the first real player is current")
	assert.deepEqual(next.allIsCurrentPlayerSeats, [3])
	assert.deepEqual(next.allRemainingPlayersInTurnOrder, ["BlackM", "Amifux", "gregged"])
	assert.deepEqual(next.allRemainingPlayerSeats, [3, 2, 1])
	assert.deepEqual(store.gameflow.turnOrder, [3, 2, 1], "the bot is removed from the local order")
})

test("a conflict-end save names the first real player as current, not the leading bot", { skip: skip }, async () => {
	const { personal } = setupWonderPhaseWithLeadingBot()
	personal.latestUpdate = 1

	const requests = []
	const originalFetch = globalThis.fetch
	globalThis.fetch = async (url, options) => {
		requests.push({ url, ...JSON.parse(options.body) })
		// Stop after the first save; processStacks would need a full game model.
		return { ok: true, json: async () => ({ syncError: true }) }
	}
	try {
		await IO.saveConflictMove(false)
	} finally {
		globalThis.fetch = originalFetch
	}

	assert.equal(requests.length, 1)
	assert.equal(requests[0].phase, rf.PHASE_WONDER_TO)
	assert.deepEqual(requests[0].allRemainingPlayersInTurnOrder, ["BlackM", "Amifux", "gregged"])
	assert.equal(requests[0].nextSinglePlayerUsername, "BlackM", "the server must be told the real current player")
})

test("the real current player behind a kicked bot saves as current", { skip: skip }, async () => {
	const { store, personal } = setupWonderPhaseWithLeadingBot()
	// BlackM is next behind the kicked seat 0.
	personal.pov = 3
	personal.name = "BlackM"
	personal.latestUpdate = 1

	const requests = []
	const originalFetch = globalThis.fetch
	globalThis.fetch = async (url, options) => {
		requests.push({ url, ...JSON.parse(options.body) })
		return { ok: true, json: async () => ({ syncError: true }) }
	}
	try {
		await IO.saveStackMove(false)
	} finally {
		globalThis.fetch = originalFetch
	}

	assert.equal(requests.length, 1)
	assert.equal(requests[0].action, "saveStackMove")
	assert.equal(requests[0].isCurrent, true, "the bot must not hide the real current player")
	assert.deepEqual(requests[0].allIsCurrentPlayers, ["Amifux"], "the turn passes to the next real player")
	assert.deepEqual(requests[0].allRemainingPlayersInTurnOrder, ["Amifux", "gregged"])
	assert.deepEqual(store.gameflow.turnOrder, [2, 1], "BlackM has finished, the bot is gone")
})

async function reloadAsBks(turnOrder, history) {
	const { store, personal } = setupWonderPhaseWithLeadingBot()
	const gameData = [
		[
			[["Marcasia726", rf.BOT_NAME], 5],
			[["gregged"], 2],
			[["Amifux"], 4],
			[["BlackM"], 1],
		],
		[],
		[],
		[],
		history,
		[],
		[rf.PHASE_WONDER_TO, turnOrder, turnOrder, turnOrder, turnOrder, [], [], {}],
		[[]],
	]
	const gameDataB64 = btoa(String.fromCharCode(...pako.gzip(JSON.stringify(gameData))))

	personal.name = "BotKickStarter"
	personal.pov = 3 // the POV change has just moved BKS from -1 to BlackM's seat
	personal.latestUpdate = 1
	// No real map/home markers in this fixture; keep startPlayerTurn from drawing them.
	store.viewSettings.showReplay = true

	const requests = []
	const originalFetch = globalThis.fetch
	globalThis.fetch = async (url, options) => {
		const body = JSON.parse(options.body)
		requests.push({ url, ...body })
		if (url === "/RNB/data/1/") {
			return {
				ok: true,
				json: async () => ({
					gameDataB64,
					finishedGame: false,
					latestUpdate: 1,
					transactionID: "",
					allStackData: [],
					currentMoveData: {},
					allMyMoveData: [],
					secondsToNextKickout: 99999,
				}),
			}
		}
		return { ok: true, json: async () => ({ latestUpdate: 2, currentMoveData: {}, allMyMoveData: [] }) }
	}
	try {
		await IO.reloadGameData(false, true)
	} finally {
		globalThis.fetch = originalFetch
	}
	return { store, requests }
}

test("a BotKickStarter POV reload repairs the stuck turn order", { skip: skip }, async () => {
	// Server game data from game 37468: the bot heads the order and Amifux already
	// acted, so BKS's reload must drop both and persist BlackM as the current player.
	const { store, requests } = await reloadAsBks([0, 3, 2, 1], [
		[rf.HIST_NEW_TURN, -1, 0, [33]],
		[rf.HIST_STACK_ACTIONS, 2, 0, [rf.PHASE_WONDER_TO]],
	])

	const save = requests.find((request) => request.action === "saveAndUpdateNotifictionsAfterStack")
	assert.ok(save, "the reload must persist the repaired state")
	assert.deepEqual(save.allIsCurrentPlayers, ["BlackM"])
	assert.deepEqual(save.allRemainingPlayersInTurnOrder, ["BlackM", "gregged"])
	assert.deepEqual(store.gameflow.turnOrder, [3, 1])
})

test("a BotKickStarter POV reload force-saves a state the kickstart heuristics miss", { skip: skip }, async () => {
	// The order already looks valid, so none of the normal recovery blocks fire.
	// BKS still persists the derived current player/queue when it takes a seat.
	const { requests } = await reloadAsBks([3, 1], [[rf.HIST_NEW_TURN, -1, 0, [33]]])

	const save = requests.find((request) => request.action === "saveAndUpdateNotifictionsAfterStack")
	assert.ok(save, "the forced repair must persist the server state")
	assert.deepEqual(save.allIsCurrentPlayers, ["BlackM"])
	assert.deepEqual(save.allRemainingPlayersInTurnOrder, ["BlackM", "gregged"])
})
