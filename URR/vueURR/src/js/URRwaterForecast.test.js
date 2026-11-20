import assert from "node:assert/strict"
import test from "node:test"
import { createGame } from "./URRgame.js"
import * as water from "./URRwater.js"
import * as rf from "./URRreference.js"
import { chooseWaterForecast, createWaterForecast, waterForecastDecider } from "./URRwaterForecast.js"

function settlementGame() {
	const game = createGame(["A", "B", "C"])
	for (const nation of game.nations) nation.isRemoved = true
	Object.assign(game.gameflow, { phase: rf.PHASE_SETTLEMENT, turnOrder: [0] })
	Object.assign(game.states[0], { isActive: true, king: 0 })
	Object.assign(game.states[1], { isActive: true, king: 1 })
	const source = game.board.areas.find((area) => area.id === "printed-1-0")
	const land = game.board.areas.find((area) => area.id === "printed-0-0")
	source.waterwork = { state: 1, kind: "reservoir", capacity: 2 }
	land.owner = land.markerOwner = 0
	game.board.canals.push([source.id, land.id])
	return { game, land }
}

test("A forecast starts a rainy season on a clone and stops at the current owner's decision", () => {
	const { game, land } = settlementGame()
	const before = structuredClone(game)
	const forecast = createWaterForecast(game)
	assert.deepEqual(game, before)
	assert.equal(forecast.game.gameflow.phase, rf.PHASE_RAINY_SEASON)
	assert.equal(forecast.finished, false)
	assert.ok(forecast.recorder.steps.length > 0)
	assert.deepEqual(water.waterChoices(forecast.game).map((choice) => choice.area), [land.id])
	assert.equal(waterForecastDecider(forecast.game), 1)
})

test("The previewer's decision is irrigated only in the forecast", () => {
	const { game, land } = settlementGame()
	const before = structuredClone(game)
	const forecast = createWaterForecast(game)
	chooseWaterForecast(forecast, land.id, 1)
	assert.equal(forecast.game.board.areas.find((area) => area.id === land.id).irrigatedBy, 1)
	assert.deepEqual(game, before)
})

test("A season without waterworks finishes automatically and conserves all source water", () => {
	const game = createGame(["A", "B", "C"])
	Object.assign(game.gameflow, { phase: rf.PHASE_SETTLEMENT, turnOrder: [0] })
	const forecast = createWaterForecast(game)
	assert.equal(forecast.finished, true)
	assert.equal(forecast.game.rain.routing.outflow, 3 * rf.ERA_WATER_PER_RIVER[game.era])
	assert.equal(forecast.game.board.areas.filter((area) => area.irrigatedBy !== null).length, 0)
	assert.equal(waterForecastDecider(forecast.game), null)
	assert.equal(forecast.recorder.steps.filter((step) => step.type === "source").length, 3)
})
