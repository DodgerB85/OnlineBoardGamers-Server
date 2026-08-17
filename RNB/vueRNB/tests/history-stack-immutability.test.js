import test from "node:test"
import assert from "node:assert/strict"

import * as util from "../src/js/RNButil.js"

test("stack history snapshots do not share references with actionStack entries", () => {
	const stackMoveWater = 11
	const stackDropResFollowing = 14
	const locationBucket = 3
	const phaseMovementTo = 16
	const moveEntry = [stackMoveWater, 7, [13, 0], [16, 0, 0], [], [1, [locationBucket, 16, 0]]]
	const expectedHistoryEntry = [phaseMovementTo, [stackMoveWater, 7, [13, 0], [16, 0, 0], [], [1, [locationBucket, 16, 0]]]]
	const actionStack = [{ historyEntry: moveEntry }]
	const historyEntry = [phaseMovementTo, ...util.deepCloneValue(actionStack.map((entry) => entry.historyEntry))]

	actionStack[0].historyEntry[0] = stackDropResFollowing
	actionStack[0].historyEntry[2].push(99)
	actionStack[0].historyEntry[5][0] = 999

	assert.deepEqual(historyEntry, expectedHistoryEntry)
	assert.equal(historyEntry[1][0], stackMoveWater)
	assert.notEqual(historyEntry[1][0], stackDropResFollowing)
	assert.deepEqual(historyEntry[1][2], [13, 0])
	assert.deepEqual(historyEntry[1][5], [1, [locationBucket, 16, 0]])
	console.log("Test passed: stack history snapshots do not share references with actionStack entries")
})
