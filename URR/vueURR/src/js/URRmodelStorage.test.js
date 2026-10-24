import assert from "node:assert/strict"
import test from "node:test"
import { createPinia, setActivePinia } from "pinia"
import "../pakoLib.js"
import { createGame } from "./URRgame.js"
import * as historyStorage from "./URRhistoryStorage.js"
import { encodeAction, historyAction } from "./URRhistoryActions.js"
import * as rf from "./URRreference.js"
import * as funcs from "./URRfuncs.js"
import * as model from "./URRmodel.js"
import { useModelStore } from "../stores/URRstore.js"

setActivePinia(createPinia())
const store = useModelStore()

function storeGame(game, history = [[rf.HIST_NEW_GAME, -1, null]]) {
	funcs.restoreState(game)
	store.setHistory(history)
}

test("the compressed save round-trips state, board and history", () => {
	const game = createGame(["A", "B", "C"])
	game.players[1].displayName = "Bee"
	game.players[2].isMissing = true
	game.players[0].soldLandTypes = [2]
	game.players[0].soldEmergingStates = [3]
	game.states[3] = { id: 3, money: 12, king: 0, isActive: true, diggers: [{ id: 7, era: 1, capacity: "1+1", hasDug: true }], hasRevolted: false }
	game.nations[0] = { id: 0, ownerType: "player", owner: 1, isRemoved: false, bids: [{ player: 1, amount: 25 }] }
	const area = game.board.areas.find((entry) => !entry.isRiver)
	Object.assign(area, { owner: 0, markerOwner: 0, waterwork: { state: 0, kind: "pump", capacity: 1 }, irrigatedBy: 0 })
	game.board.canals.push([area.id, area.neighbours[0]])
	game.rain.step = "harvest"
	game.rain.outflow = 3
	game.rain.harvestOrder = [2, 0]

	const history = [[rf.HIST_NEW_GAME, -1, null]]
	storeGame(game, history)
	const encoded = funcs.exportURRmodel()
	assert.doesNotMatch(encoded, /^{/)
	const saved = funcs.decompressData64(encoded)
	assert.equal(saved.length, 12)
	assert.deepEqual(saved[10], [])
	assert.deepEqual(saved[11], [])
	const imported = funcs.importURRmodel(encoded)
	assert.deepEqual(imported.state, game)
	assert.equal(imported.history.length, 1)
	assert.deepEqual(imported.history[0], history[0])
})

test("an in-progress water route round-trips", () => {
	const game = createGame(["A", "B", "C"])
	const river = game.board.areas.find((entry) => entry.isRiver)
	game.rain.step = "routing"
	game.rain.routing = {
		sourceIndex: 1,
		river: { area: river.id, water: 2 },
		arrivals: { [river.id]: { count: 2, water: 3 } },
		outflow: 1,
		stack: [{ area: river.id, water: 2, downstreamWater: 1, visited: [river.id], originReservoir: river.id }],
	}
	storeGame(game)
	assert.deepEqual(funcs.importURRmodel(funcs.exportURRmodel()).state, game)
})

test("game-over saves drop transient state but keep the final result", () => {
	const game = createGame(["A", "B", "C"])
	game.gameflow.phase = rf.PHASE_GAME_OVER
	game.gameflow.endReason = "invasion"
	game.gameflow.finalPositions = [0, 1, 2]
	game.cardSupply[1] = 4
	game.rain.step = "complete"
	game.nextDiggerId = 9
	game.players[0].soldLandTypes = [2]
	storeGame(game)

	const imported = funcs.importURRmodel(funcs.exportURRmodel(true)).state
	assert.equal(imported.gameflow.phase, rf.PHASE_GAME_OVER)
	assert.equal(imported.gameflow.endReason, "invasion")
	assert.deepEqual(imported.gameflow.finalPositions, [0, 1, 2])
	assert.equal(imported.cardSupply[1], 4)
	assert.equal(imported.rain.step, null)
	assert.deepEqual(imported.players[0].soldLandTypes, [])
})

test("the simple export restores state and history without touching the server", () => {
	const game = createGame(["A", "B", "C"])
	storeGame(game)
	const snapshot = funcs.simpleExportWholeURRmodel()
	game.players[0].money = 1
	funcs.restoreState(game)
	store.history.push([rf.HIST_ACTION, 0, 5])
	funcs.simpleImportWholeURRmodel(snapshot)
	assert.equal(store.players[0].money, rf.STARTING_MONEY_BY_PLAYER_COUNT[3])
	assert.equal(store.history.length, 1)
})

test("display history appends without invalidating the map's river reports", () => {
	const game = createGame(["A", "B", "C"])
	storeGame(game)
	const rows = store.computedHistory
	const reports = store.historyRiverReports
	model.addHistory(rf.HIST_ACTION, 0, { type: "pass" })

	assert.equal(store.computedHistory.length, 2)
	assert.notEqual(store.computedHistory, rows)
	assert.equal(store.historyRiverReports, reports)
})

test("river summaries are kept separately for the map", () => {
	const game = createGame(["A", "B", "C"])
	Object.assign(game.gameflow, { phase: rf.PHASE_DEVELOPMENT, stateOrder: [], stateIndex: 0, developmentStep: "betweenStates", turnOrder: [0] })
	const opening = historyStorage.changesBetween(createGame(["A", "B", "C"]), game)
	funcs.restoreState(game)
	store.setHistory([[rf.HIST_NEW_GAME, -1, null, opening]])
	model.addHistory(rf.HIST_ACTION, 0, { type: "beginDevelopment" })

	assert.deepEqual(store.historyRiverReports.map((report) => report.administration.kind), ["riverStart", "riverComplete"])
})

test("the rewind opening marker rebuilds the opening position", () => {
	const opening = { opening: true, players: ["A", "B", "C"], replayStart: [] }
	const imported = funcs.importURRmodel(JSON.stringify(opening))
	assert.equal(imported.history.length, 1)
	assert.deepEqual(imported.state.players.map((player) => player.name), ["A", "B", "C"])
	assert.equal(imported.state.gameflow.phase, rf.PHASE_DIVIDING_NATIONS)
	assert.deepEqual(imported.history[0], [rf.HIST_NEW_GAME, -1, null])
})

test("invalid save shapes are rejected", () => {
	assert.throws(() => funcs.importURRmodel({}), /Unsupported URR save/)
	assert.throws(() => funcs.importURRmodel([]), /Unsupported URR save/)
})

test("new history entries store numeric action codes instead of objects", () => {
	const game = createGame(["A", "B", "C"])
	storeGame(game)
	const action = { type: "pass" }
	model.performAction(0, action)
	const [code] = encodeAction(action)
	assert.equal(store.history.length, 2)
	assert.equal(store.history[1].length, 3)
	assert.equal(store.history[1][0], code)
	assert.equal(store.history[1][1], 0)
	assert.equal(typeof store.history[1][2], "number")
	assert.deepEqual(historyAction(store.history[1]), { type: "pass" })
	assert.equal(store.historySnapshotAt(1).gameflow.turnOrder[0], 1)
	assert.equal(store.computedHistory.length, 2)
	assert.ok(store.computedHistory.every((entry) => entry.historyTime !== null))
	const imported = funcs.importURRmodel(funcs.exportURRmodel())
	assert.deepEqual(imported.history, store.history)
	assert.deepEqual(imported.state, funcs.snapshotState())
})

test("board entries omit trailing defaults and preserve every runtime field", () => {
	const game = createGame(["A", "B", "C"])
	const area = game.board.areas.find((entry) => !entry.isRiver)
	for (const change of [{ owner: 0 }, { markerOwner: 0 }, { waterwork: { state: 0, kind: "reservoir", capacity: 2 } }, { irrigatedBy: 0 }, { landType: 99 }]) {
		const board = structuredClone(game.board)
		Object.assign(board.areas.find((entry) => entry.id === area.id), change)
		const compact = historyStorage.compactBoard(board)
		if (change.owner === 0) assert.equal(compact[0][0].length, 2)
		assert.deepEqual(historyStorage.expandBoard(compact), board)
	}
})

test("finished replay preserves a modified opening", () => {
	const game = createGame(["A", "B", "C"])
	game.players[0].displayName = "Shadow name"
	const openingChanges = historyStorage.changesBetween(createGame(["A", "B", "C"]), game)
	game.gameflow.phase = rf.PHASE_GAME_OVER
	game.gameflow.endReason = "invasion"
	storeGame(game, [[rf.HIST_NEW_GAME, -1, null, openingChanges]])
	const imported = funcs.importURRmodel(funcs.exportURRmodel(true))
	assert.equal(historyStorage.openingState(["A", "B", "C"], imported.history[0][3]).players[0].displayName, "Shadow name")
})
