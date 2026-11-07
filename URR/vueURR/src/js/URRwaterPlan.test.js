import assert from "node:assert/strict"
import test from "node:test"
import { createGame, applyAction } from "./URRgame.js"
import { currentWaterFrame } from "./URRwater.js"
import { getAutomaticAction } from "./URRrules.js"
import { previewWaterPlan } from "./URRwaterPlan.js"
import * as rf from "./URRreference.js"

function routingGame() {
	const game = createGame(["A", "B", "C"])
	for (const nation of game.nations) nation.isRemoved = true
	Object.assign(game.gameflow, { phase: rf.PHASE_RAINY_SEASON, stateOrder: [0, 1], turnOrder: [0] })
	Object.assign(game.states[0], { isActive: true, king: 0 })
	Object.assign(game.states[1], { isActive: true, king: 1 })
	const area = (id) => game.board.areas.find((entry) => entry.id === id)
	const source = area("printed-3-5")
	const pump = area("printed-3-4")
	const land = area("printed-4-5")
	source.waterwork = { state: 0, kind: "pump", capacity: 2 }
	pump.waterwork = { state: 1, kind: "pump", capacity: 1 }
	land.owner = land.markerOwner = 0
	for (const id of ["printed-4-4", "printed-3-3"]) area(id).owner = area(id).markerOwner = 1
	game.board.canals = [[source.id, pump.id], [source.id, land.id], [pump.id, "printed-4-4"], [pump.id, "printed-3-3"]]
	game.rain.step = "routing"
	game.rain.routing = { sourceIndex: 3, river: null, arrivals: {}, outflow: 0, stack: [{ area: source.id, water: 3, downstreamWater: 0, visited: [source.id], originReservoir: source.id }] }
	return game
}

test("A mixed plan irrigates land before a pump handoff regardless of click order", () => {
	const game = routingGame()
	const before = structuredClone(game)
	const actions = previewWaterPlan(game, [{ area: "printed-3-4", amount: 2 }, { area: "printed-4-5", amount: 1 }])
	assert.deepEqual(actions.map((action) => action.area), ["printed-4-5", "printed-3-4"])
	let after = game
	for (const action of actions) after = applyAction(after, 0, action)
	assert.equal(after.board.areas.find((area) => area.id === "printed-4-5").irrigatedBy, 0)
	assert.equal(after.rain.routing.stack.at(-1).water, 2)
	assert.deepEqual(after.gameflow.turnOrder, [1])
	assert.deepEqual(game, before)
})

test("Invalid pump amounts reject the complete plan without changing the position", () => {
	for (const amount of [0, 1.5, 4]) {
		const game = routingGame()
		const before = structuredClone(game)
		assert.throws(() => previewWaterPlan(game, [{ area: "printed-4-5", amount: 1 }, { area: "printed-3-4", amount }]))
		assert.deepEqual(game, before)
	}
})

test("A plan cannot include another player's downstream routing decision", () => {
	const game = routingGame()
	assert.throws(() => previewWaterPlan(game, [{ area: "printed-3-4", amount: 2 }, { area: "printed-4-4", amount: 1 }]))
})


test("Allocating all water to land and a terminal pump can finish with returned water preserved", () => {
	const game = routingGame()
	const source = game.board.areas.find((area) => area.id === "printed-3-5")
	const pump = game.board.areas.find((area) => area.id === "printed-3-4")
	pump.owner = pump.markerOwner = 1
	game.board.canals = [[source.id, pump.id], [source.id, "printed-4-5"], [source.id, "printed-4-4"], [source.id, "printed-3-3"]]
	const selections = [{ area: "printed-4-5", amount: 1 }, { area: pump.id, amount: 2 }]
	const actions = previewWaterPlan(game, selections)
	let after = game
	for (const action of actions) after = applyAction(after, 0, action)
	assert.equal(after.board.areas.find((area) => area.id === pump.id).irrigatedBy, 1)
	assert.equal(currentWaterFrame(after).area, source.id)
	assert.equal(currentWaterFrame(after).water, 1)
	assert.equal(getAutomaticAction(after), null)
	assert.throws(() => previewWaterPlan(game, [{ area: "printed-4-5", amount: 1 }, { area: pump.id, amount: 1 }]))
})
