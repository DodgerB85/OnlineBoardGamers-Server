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

test("appending computes only the new entries' display rows", () => {
	const first = createGame(["A", "B", "C"])
	const second = structuredClone(first)
	second.era = 2
	const third = structuredClone(second)
	third.era = 3
	const history = [[rf.HIST_NEW_GAME, -1, null], entry({ type: "pass" }, 10), entry({ type: "pass" }, 5)]
	const snapshots = [first, second, third]
	const times = [1000, 1010, 1015]
	const full = computeHistory(history, 1000, snapshots, times)
	const appended = computeHistory(history.slice(0, 2), 1000, snapshots.slice(0, 2), times.slice(0, 2))
	computeHistory(history, 1000, snapshots, times, appended, 2)

	assert.deepEqual(appended, full)
})


test("history reports First Akkadians dissolution for automatic and manual hiring without duplicates", () => {
	for (const type of ["endDevelopment", "buyCard", "resolveMaintenance"]) {
		for (const era of [1, 4]) {
			const before = createGame(["A", "B", "C"])
			before.gameflow.phase = rf.PHASE_DEVELOPMENT
			before.nations[rf.NATION_FIRST_AKKADIANS].isRemoved = false
			const after = structuredClone(before)
			after.era = era
			after.nations[rf.NATION_FIRST_AKKADIANS].isRemoved = true
			const history = [[rf.HIST_NEW_GAME, -1, null], entry({ type, kind: "digger" }, 10)]
			const rows = computeHistory(history, 1000, [before, after])
			const dissolutions = rows.flatMap((row) => row.administration?.details || []).filter((detail) => detail.nation === rf.NATION_FIRST_AKKADIANS)
			assert.equal(dissolutions.length, 1, `${type}, era ${era}`)
			assert.match(dissolutions[0].text, /First Akkadians/)
			const unchanged = computeHistory(history, 1000, [after, after])
			assert.equal(unchanged.some((row) => row.administration?.kind === "firstAkkadians"), false)
		}
	}
})
