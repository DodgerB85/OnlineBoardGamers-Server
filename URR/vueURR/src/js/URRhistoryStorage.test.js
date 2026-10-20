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

	const saved = JSON.parse(JSON.stringify({ ...game, board, replay, replayRules: 1 }))
	assert.deepEqual(expandHistory(saved, rf.HIST_NEW_GAME, 1000), history)
})


test("historical Barahshum interruptions and out-of-turn exchanges survive re-export", () => {
	for (const type of ["exchangeBarahshum", "passBarahshum"]) {
		const opening = createGame(["A", "B", "C"])
		Object.assign(opening.gameflow, { phase: rf.PHASE_DEVELOPMENT, stateOrder: [0, 1], stateIndex: 0, developmentStep: "digging", turnOrder: [0] })
		for (const id of [0, 1]) Object.assign(opening.states[id], { isActive: true, king: id, diggers: [{ id, era: 1, capacity: "1+1", hasDug: false }] })
		Object.assign(opening.nations[rf.NATION_BARAHSHUM], { ownerType: "player", owner: 2 })
		const paused = applyAction(opening, 0, { type: "endDevelopment" }, true)
		assert.equal(paused.gameflow.developmentStep, "betweenStates")
		const home = opening.board.areas.find((area) => area.nation === rf.NATION_BARAHSHUM)
		const action = type === "passBarahshum" ? { type } : { type, from: home.id, to: home.neighbours.find((id) => opening.board.areas.find((area) => area.id === id).nation === null) }
		const final = applyAction(paused, 2, action, true)
		const data = { players: opening.players, replayStart: compactOpening([[rf.HIST_NEW_GAME, -1, JSON.stringify(opening), null, 1000]]), replay: [[rf.HIST_ACTION, 0, { type: "endDevelopment" }, 1], [rf.HIST_ACTION, 2, action, 1]] }
		const history = expandHistory(data, rf.HIST_NEW_GAME, 1000)
		assert.deepEqual(JSON.parse(history[1][2]), paused)
		assert.deepEqual(JSON.parse(history[2][2]), final)
		const updated = { ...data, replay: compactHistory(history), replayRules: 1 }
		assert.deepEqual(expandHistory(updated, rf.HIST_NEW_GAME, 1000), history)
	}
})
