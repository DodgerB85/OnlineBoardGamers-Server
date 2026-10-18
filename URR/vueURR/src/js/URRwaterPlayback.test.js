import assert from "node:assert/strict"
import test from "node:test"
import { createGame, applyAction } from "./URRgame.js"
import { buildWaterPlayback } from "./URRwaterPlayback.js"
import * as rf from "./URRreference.js"

function routingHistory(hasPump = true) {
	let game = createGame(["A", "B", "C"])
	Object.assign(game.gameflow, { phase: rf.PHASE_DEVELOPMENT, stateOrder: [0], stateIndex: 0, developmentStep: "purchasing", turnOrder: [0] })
	Object.assign(game.states[0], { king: 0, isActive: true, diggers: [{ id: 0, era: 1, capacity: "1+1", hasDug: true }] })
	for (const nation of game.nations) nation.isRemoved = true
	const river = game.board.areas.find((area) => area.id === "printed-4-2")
	const pump = game.board.areas.find((area) => area.id === "printed-4-3")
	if (hasPump) {
		river.waterwork = { state: 0, kind: "reservoir", capacity: 2 }
		pump.waterwork = { state: 0, kind: "pump", capacity: 1 }
		pump.owner = 0
		game.board.canals.push([river.id, pump.id])
	}
	const history = [[rf.HIST_NEW_GAME, -1, JSON.stringify(game), null]]
	function act(action) {
		const player = game.gameflow.turnOrder[0]
		game = applyAction(game, player, action)
		history.push([rf.HIST_ACTION, player, JSON.stringify(game), action])
	}
	act({ type: "endDevelopment" })
	if (hasPump) act({ type: "allocateWater", area: pump.id, amount: 2 })
	return history
}

test("Completed water playback follows recorded decisions, irrigation and returned water without changing history", () => {
	const history = routingHistory()
	const original = JSON.stringify(history)
	assert.throws(() => buildWaterPlayback(history, 1), /not complete/)
	const script = buildWaterPlayback(history, 2)
	assert.equal(JSON.stringify(history), original)
	assert.equal(script.steps.filter((step) => step.type === "source").length, 3)
	const transfer = script.steps.find((step) => step.type === "pump")
	assert.equal(transfer.amount, 2)
	assert.deepEqual(transfer.path, ["printed-4-2", "printed-4-3"])
	const returned = script.steps.find((step) => step.type === "return")
	assert.equal(returned.amount, 1)
	assert.deepEqual(returned.path, ["printed-4-3", "printed-4-2"])
	assert.deepEqual(script.steps.at(-1).wet, ["printed-4-3"])
	assert.equal(script.board.areas.find((area) => area.id === "printed-4-3").irrigatedBy, null)
	assert.equal(script.steps.at(-1).text, "Water routing complete: 1 hex irrigated, 17 water left the board.")
})

test("Fully automatic rainy seasons can replay all three rivers after harvest has cleared the board", () => {
	const history = routingHistory(false)
	const script = buildWaterPlayback(history, 1)
	assert.equal(script.steps.filter((step) => step.type === "source").length, 3)
	assert.equal(script.steps.filter((step) => step.type === "outflow").reduce((sum, step) => sum + step.amount, 0), 18)
	assert.deepEqual(script.steps.at(-1).wet, [])
})


test("Rainy-season completion replays the same water flow after harvesting", () => {
	const history = routingHistory()
	const before = JSON.parse(history.at(-1)[2])
	const player = before.gameflow.turnOrder[0]
	const action = { type: "harvest", choice: "distribute" }
	const after = applyAction(before, player, action)
	history.push([rf.HIST_ACTION, player, JSON.stringify(after), action])
	assert.equal(after.rain.step, "complete")
	assert.deepEqual(buildWaterPlayback(history, 3), buildWaterPlayback(history, 2))
})

test("Undiverted water stays on the river while the reservoir's share is played through the canal", () => {
	const script = buildWaterPlayback(routingHistory(), 2)
	const reservoirIndex = script.steps.findIndex((step) => step.type === "reservoir")
	assert.ok(reservoirIndex >= 0)
	const reservoir = script.steps[reservoirIndex]
	assert.equal(reservoir.amount, 2)
	assert.equal(reservoir.downstream, 4)
	const releaseIndex = script.steps.findIndex((step, index) => index > reservoirIndex && step.type === "river" && step.from === reservoir.to)
	assert.ok(releaseIndex > reservoirIndex + 1)
	for (const step of script.steps.slice(reservoirIndex, releaseIndex)) {
		assert.deepEqual(step.waitingWater.find((water) => water.area === reservoir.to), { area: reservoir.to, amount: 4 })
	}
	assert.equal(script.steps[releaseIndex].amount, 5)
	assert.ok(!script.steps[releaseIndex].waitingWater.some((water) => water.area === reservoir.to))
	assert.deepEqual(script.steps.at(-1).waitingWater, [])
})

test("Junction water stays visible until the next river merges with it", () => {
	const script = buildWaterPlayback(routingHistory(false), 1)
	const waitingIndex = script.steps.findIndex((step) => step.type === "confluence" && step.waiting)
	assert.ok(waitingIndex >= 0)
	const arrival = script.steps[waitingIndex]
	const mergeIndex = script.steps.findIndex((step, index) => index > waitingIndex && step.type === "confluence" && step.to === arrival.to && !step.waiting)
	assert.ok(mergeIndex > waitingIndex + 1)
	for (const step of script.steps.slice(waitingIndex, mergeIndex)) {
		assert.deepEqual(step.waitingWater.find((water) => water.area === arrival.to), { area: arrival.to, amount: arrival.amount })
	}
	const incoming = script.steps[mergeIndex - 1]
	assert.equal(script.steps[mergeIndex].amount, arrival.amount + incoming.amount)
	assert.ok(!script.steps[mergeIndex].waitingWater.some((water) => water.area === arrival.to))
	assert.deepEqual(script.steps.at(-1).waitingWater, [])
})
