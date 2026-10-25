import assert from "node:assert/strict"
import test from "node:test"
import { applyAction, createGame, getBotAction } from "./URRgame.js"
import * as rf from "./URRreference.js"
import { computeHistory } from "./URRhistory.js"
import { encodeAction, historyAction } from "./URRhistoryActions.js"
import { changesBetween, compactBoard, expandBoard, expandHistory, openingState, syncHistoryReplay } from "./URRhistoryStorage.js"

function replay(history, names, creationTimestamp = 1000) {
	const cache = { entries: [], snapshots: [], times: [] }
	syncHistoryReplay(cache, history, names, creationTimestamp)
	return cache
}

function entry(player, action, delta) {
	const [code, params] = encodeAction(action)
	return [code, player, delta, ...params]
}

test("A saved replay stores action codes only and rebuilds every position", () => {
	let game = createGame(["A", "B", "C"])
	const history = [[rf.HIST_NEW_GAME, -1, null]]
	for (let step = 0; step < 60 && game.gameflow.phase !== rf.PHASE_GAME_OVER; step++) {
		const player = game.gameflow.turnOrder[0]
		const action = getBotAction(game)
		if (!action) break
		game = applyAction(game, player, action)
		history.push(entry(player, action, step))
		// An edit outside the rules (here a kickout) must survive as a change.
		if (step === 10) {
			game.players[2].isMissing = true
			history.push([rf.HIST_KICKOUT, 2, 0, [[["players", "2", "isMissing"], true]]])
		}
	}
	assert.ok(history.length > 12)
	assert.ok(history.slice(1).every((row) => typeof row[0] === "number" && typeof row[2] === "number"), "Actions and deltas are numbers")
	assert.ok(history.every((row) => !row.some((value) => typeof value === "string" && value.startsWith("{"))), "No snapshots or action objects are stored")

	const expanded = expandHistory({ replay: history.slice(1), replayStart: [] }, rf.HIST_NEW_GAME)
	assert.deepEqual(expanded, history)

	const cache = replay(expanded, ["A", "B", "C"])
	const kickoutIndex = expanded.findIndex((row) => row[0] === rf.HIST_KICKOUT)
	assert.equal(cache.snapshots[kickoutIndex].players[2].isMissing, true)
	assert.deepEqual(cache.snapshots.at(-1), game)
	const computed = computeHistory(expanded, 1000, cache.snapshots, cache.times)
	assert.ok(computed.length > expanded.length, "Replay positions must still infer history summaries")
	assert.ok(computed.every((row) => row.historyIndex >= 0))

	const board = compactBoard(game.board)
	assert.ok(JSON.stringify(board).length < JSON.stringify(game.board).length / 5)
	assert.deepEqual(expandBoard(JSON.parse(JSON.stringify(board))), game.board)
})

test("parameterless actions are stored as a single code", () => {
	const pass = entry(0, { type: "pass" }, 5)
	assert.deepEqual(pass, [10, 0, 5])
	assert.deepEqual(historyAction(pass), { type: "pass" })

	const trade = entry(1, { type: "tradeLand", buy: "printed-4-3", exchangeDer: false, sellBefore: [], sellAfter: [] }, 7)
	assert.equal(trade[0], 13)
	assert.equal(trade[2], 7)
	assert.deepEqual(historyAction(trade), { type: "tradeLand", buy: "printed-4-3" })

	const beforeSale = entry(1, { type: "tradeLand", sellBefore: [["printed-1-4", "printed-1-5"]], sellAfter: [] }, 8)
	assert.deepEqual(historyAction(beforeSale), { type: "tradeLand", sellBefore: [["printed-1-4", "printed-1-5"]] })
	const afterSale = entry(1, { type: "tradeLand", sellBefore: [], sellAfter: [["printed-2-4"]] }, 9)
	assert.deepEqual(historyAction(afterSale).sellAfter, [["printed-2-4"]])
	assert.ok(!historyAction(afterSale).sellBefore)
	assert.deepEqual(historyAction(entry(0, { type: "dig", crew: 2, path: ["printed-1-4", "printed-1-5"] }, 10)), { type: "dig", crew: 2, path: ["printed-1-4", "printed-1-5"] })
	assert.deepEqual(historyAction(entry(0, { type: "respondOffer", accept: false }, 11)), { type: "respondOffer", accept: false })
})

test("fixed-vocabulary params are stored as indexes and trades store no holes", () => {
	const card = entry(0, { type: "buyCard", kind: "digger", area: "printed-4-3" }, 1)
	assert.deepEqual(card, [17, 0, 1, 0, "printed-4-3"])
	assert.deepEqual(historyAction(card), { type: "buyCard", kind: "digger", area: "printed-4-3" })

	const work = entry(1, { type: "requestWaterwork", kind: "reservoir", area: "printed-5-6" }, 2)
	assert.deepEqual(work.slice(3), [2, "printed-5-6"])
	assert.deepEqual(historyAction(work), { type: "requestWaterwork", kind: "reservoir", area: "printed-5-6" })

	const harvest = entry(2, { type: "harvest", choice: "store", remove: "printed-5-6" }, 3)
	assert.deepEqual(harvest.slice(3), [0, "printed-5-6"])
	assert.deepEqual(historyAction(harvest), { type: "harvest", choice: "store", remove: "printed-5-6" })

	// Entries reach the database through JSON, so read them back the same way.
	const plain = JSON.parse(JSON.stringify(entry(1, { type: "tradeLand", buy: "printed-4-3", exchangeDer: false, sellBefore: [], sellAfter: [] }, 7)))
	const full = JSON.parse(JSON.stringify(entry(1, { type: "tradeLand", buy: "printed-4-3", exchangeDer: true, sellBefore: [["printed-1-4"]], sellAfter: [["printed-2-4"]] }, 8)))
	assert.ok(!JSON.stringify(plain).includes("null") && !JSON.stringify(full).includes("null"), "optional trailing params leave no holes")
	assert.deepEqual(historyAction(full), { type: "tradeLand", buy: "printed-4-3", exchangeDer: true, sellBefore: [["printed-1-4"]], sellAfter: [["printed-2-4"]] })

	// A sale after the buy leaves a hole in front of it: the hole reads as absent, not as null.
	const sellAfterOnly = JSON.parse(JSON.stringify(entry(1, { type: "tradeLand", sellAfter: [["printed-2-4"]] }, 9)))
	assert.deepEqual(historyAction(sellAfterOnly), { type: "tradeLand", sellAfter: [["printed-2-4"]] })
})

test("opening-only changes replay without a stored snapshot", () => {
	const opening = createGame(["A", "B", "C"])
	opening.players[0].displayName = "Shadow name"
	const changes = changesBetween(createGame(["A", "B", "C"]), opening)
	const expanded = expandHistory({ replay: [], replayStart: changes }, rf.HIST_NEW_GAME)
	assert.deepEqual(openingState(["A", "B", "C"], expanded[0][3]), opening)
	const cache = replay(expanded, ["A", "B", "C"])
	assert.equal(cache.snapshots[0].players[0].displayName, "Shadow name")
})

test("the replay cache truncates on undo and rebuilds after replacement", () => {
	let game = createGame(["A", "B", "C"])
	const history = [[rf.HIST_NEW_GAME, -1, null]]
	for (let step = 0; step < 3; step++) {
		const player = game.gameflow.turnOrder[0]
		const action = getBotAction(game)
		game = applyAction(game, player, action)
		history.push(entry(player, action, 1))
	}
	const cache = replay(history, ["A", "B", "C"])
	assert.equal(cache.snapshots.length, 4)
	history.length = 2
	syncHistoryReplay(cache, history, ["A", "B", "C"], 1000)
	assert.equal(cache.snapshots.length, 2)
	history[1] = entry(0, { type: "pass" }, 5)
	syncHistoryReplay(cache, history, ["A", "B", "C"], 1000)
	assert.equal(cache.entries[1], history[1])
	assert.equal(cache.times[1], 1005)
})

test("board entries omit trailing defaults and preserve every runtime field", () => {
	const game = createGame(["A", "B", "C"])
	const area = game.board.areas.find((entry) => !entry.isRiver)
	for (const change of [{ owner: 0 }, { markerOwner: 0 }, { waterwork: { state: 0, kind: "reservoir", capacity: 2 } }, { irrigatedBy: 0 }, { landType: 99 }]) {
		const board = structuredClone(game.board)
		Object.assign(board.areas.find((entry) => entry.id === area.id), change)
		const compact = compactBoard(board)
		if (change.owner === 0) assert.equal(compact[0][0].length, 2)
		assert.deepEqual(expandBoard(compact), board)
	}
})
