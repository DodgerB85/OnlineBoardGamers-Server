import assert from "node:assert/strict"
import test from "node:test"
import { createGame } from "./URRgame.js"
import { compactGameData, expandGameData } from "./URRsaveStorage.js"

test("compact save entries preserve state, nation and digger data", () => {
	const game = createGame(["A", "B", "C"])
	game.states[3] = { id: 3, money: 12, king: 0, isActive: true, diggers: [{ id: 7, era: 1, capacity: "1+1", hasDug: true }], hasRevolted: false }
	game.nations[0] = { id: 0, ownerType: "player", owner: 0, isRemoved: false, bids: [] }
	const compact = compactGameData(game)
	assert.deepEqual(compact.states[3], [12, 0, 1, [[7, 1, 1]], 0])
	assert.deepEqual(compact.nations[0], [0, 0, 0, []])
	assert.deepEqual(expandGameData(compact), game)
})

test("old save formats are rejected", () => {
	assert.throws(() => expandGameData({ states: [{ id: 0, money: 0 }] }), /Unsupported URR save format/)
})
