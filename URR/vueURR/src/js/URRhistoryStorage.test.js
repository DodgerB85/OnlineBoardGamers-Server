import assert from "node:assert/strict"
import test from "node:test"
import { applyAction, createGame, getBotAction } from "./URRgame.js"
import * as rf from "./URRreference.js"
import { compactBoard, compactHistory, compactOpening, expandBoard, expandHistory } from "./URRhistoryStorage.js"

test("A saved replay stores actions only and rebuilds every position", () => {
	let game = createGame(["A", "B", "C"])
	const history = [[rf.HIST_NEW_GAME, -1, JSON.stringify(game), null, 1000]]
	for (let step = 0; step < 60 && game.gameflow.phase !== rf.PHASE_GAME_OVER; step++) {
		const player = game.gameflow.turnOrder[0]
		const action = getBotAction(game)
		if (!action) break
		game = applyAction(game, player, action)
		// An edit outside the rules (here a kickout) must survive as a change.
		if (step === 10) game.players[2].isMissing = true
		history.push([rf.HIST_ACTION, player, JSON.stringify(game), action, 1000 + step])
	}
	const replay = compactHistory(history)
	assert.equal(replay.length, history.length - 1)
	assert.ok(replay.every((entry) => entry.length === 4 || entry === replay[10]), "Only the edited entry carries changes")
	assert.deepEqual(replay[10][4], [[["players", "2", "isMissing"], true]])
	assert.deepEqual(compactOpening(history), [])

	const board = compactBoard(game.board)
	assert.ok(JSON.stringify(board).length < JSON.stringify(game.board).length / 5)
	assert.deepEqual(expandBoard(JSON.parse(JSON.stringify(board))), game.board)

	const saved = JSON.parse(JSON.stringify({ ...game, board, replay }))
	assert.deepEqual(expandHistory(saved, rf.HIST_NEW_GAME, 1000), history)
})
