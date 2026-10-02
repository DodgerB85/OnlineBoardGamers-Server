// Headless rule checks: `node rulesCheck.mjs` from URR/vueURR.
import assert from "node:assert/strict"
import * as rf from "./src/js/URRreference.js"
import * as rules from "./src/js/URRrules.js"
import { createGame, applyAction } from "./src/js/URRgame.js"
import { getCanalCost } from "./src/js/URRmap.js"

const fresh = () => createGame(["A", "B", "C"])
const id = (row, column) => `printed-${row}-${column}`
const area = (game, areaId) => game.board.areas.find((entry) => entry.id === areaId)

// 6.3: 5 hill, 4 forest, 3 savannah and 4 desert regions.
{
	const game = fresh()
	const regions = rf.ALL_LAND_TYPES.map((type) => new Set(game.board.areas.filter((entry) => entry.landType === type).map((entry) => entry.region)).size)
	assert.deepEqual(regions, [5, 4, 3, 4])
}

// 4.2: printed state outlines give Elam 12 land areas and every other state 11.
{
	const game = fresh()
	assert.deepEqual(rf.ALL_STATES.map((state) => game.board.areas.filter((entry) => !entry.isRiver && entry.state === state).length), [11, 11, 12, 11, 11, 11])
}

// 5.1: a declined waterwork request buys nothing, so the state may still dig.
{
	let game = fresh()
	Object.assign(game.gameflow, { phase: rf.PHASE_DEVELOPMENT, stateOrder: [rf.STATE_URARTU], stateIndex: 0, developmentStep: "digging", turnOrder: [0] })
	Object.assign(game.states[rf.STATE_URARTU], { isActive: true, king: 0, money: 500, diggers: [{ id: 0, era: 1, capacity: "1+1", hasDug: false }] })
	const land = game.board.areas.find((entry) => !entry.isRiver && entry.nation === null)
	land.owner = land.markerOwner = 1
	game = applyAction(game, 0, { type: "requestWaterwork", kind: "pump", area: land.id })
	game = applyAction(game, 1, { type: "respondOffer", accept: false })
	assert.equal(game.gameflow.developmentStep, "digging")
}

// 4.3: 30 ownership markers; a flipped marker returns to its owner when rebought.
{
	const game = fresh()
	assert.equal(game.board.markerLimit, 30)
	const land = game.board.areas.filter((entry) => !entry.isRiver && entry.nation === null)
	for (const entry of land.slice(0, 30)) entry.markerOwner = 0
	land[0].owner = null
	game.players[0].money = 10000
	assert.equal(rules.getLandPurchaseError(game, 0, land[30]), "No ownership markers remain")
	assert.equal(rules.getLandPurchaseError(game, 0, land[0]), "")
}

// 9.3: Calah's waterwork goes on its hills or on land adjacent to Calah, not on Calah's forest.
{
	const game = fresh()
	Object.assign(game.gameflow, { phase: rf.PHASE_DEVELOPMENT, stateOrder: [rf.STATE_URARTU], stateIndex: 0, developmentStep: "purchasing", turnOrder: [0] })
	Object.assign(game.states[rf.STATE_URARTU], { isActive: true, king: 0, diggers: [{ id: 0, era: 3, capacity: 3, hasDug: true }] })
	Object.assign(game.nations[rf.NATION_CALAH], { ownerType: "state", owner: rf.STATE_URARTU })
	Object.assign(game, { era: 3, cardSupply: { 1: 0, 2: 0, 3: 7, 4: 5 } })
	const exchange = (areaId) => applyAction(game, 0, { type: "exchangeCalah", kind: "pump", area: areaId })
	assert.throws(() => exchange(id(4, 1)), /hills or adjacent/)
	assert.equal(area(exchange(id(3, 1)), id(3, 1)).waterwork.capacity, 3)
	assert.equal(area(exchange(id(4, 0)), id(4, 0)).waterwork.capacity, 3)
}

// 5.2: a stretch may be listed from its dry end toward the river.
{
	const game = fresh()
	const river = area(game, id(1, 1))
	const dry = river.neighbours.map((neighbour) => area(game, neighbour)).find((entry) => !entry.isRiver && entry.nation === null)
	assert.deepEqual(getCanalCost(game, [dry.id, river.id]), getCanalCost(game, [river.id, dry.id]))
	const isolated = game.board.areas.find((entry) => !entry.isRiver && entry.neighbours.every((neighbour) => !area(game, neighbour).isRiver))
	assert.throws(() => getCanalCost(game, [isolated.id, isolated.neighbours[0]]), /existing river or canal/)
}

console.log("URR rule checks passed")
