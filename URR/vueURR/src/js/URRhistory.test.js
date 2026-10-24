import assert from "node:assert/strict"
import test from "node:test"
import { createGame } from "./URRgame.js"
import { computeHistory } from "./URRhistory.js"
import { encodeAction } from "./URRhistoryActions.js"
import * as rf from "./URRreference.js"

function entry(action, delta) {
	const [code, params] = encodeAction(action)
	return [code, 0, delta, ...params]
}

test("computed history infers entries and accumulates relative timestamps", () => {
	const before = createGame(["A", "B", "C"])
	const after = structuredClone(before)
	after.era = 2
	const history = [[rf.HIST_NEW_GAME, -1, null], entry({ type: "pass" }, 10)]
	const result = computeHistory(history, 1000, [before, after], [1000, 1010])

	assert.equal(result.length, 3)
	assert.equal(result[0].historyTime, 1000)
	assert.equal(result[1].historyTime, 1010)
	assert.equal(result[1].historyIndex, 1)
	assert.equal(result[2].administration.kind, "era")
	assert.equal(result[2].historyIndex, 1)
	assert.equal(result[2].historyTime, 1010)
})

test("computed history keeps moves when snapshots are unavailable", () => {
	const history = [[rf.HIST_NEW_GAME, -1, null], entry({ type: "pass" }, 10)]
	const result = computeHistory(history, 1000, [], [])
	assert.equal(result.length, 2)
	assert.equal(result[0].historyTime, 1000)
	assert.equal(result[0].historyIndex, 0)
	assert.equal(result[1].historyTime, null)
	assert.equal(result[1].historyIndex, 1)
})
