import assert from "node:assert/strict"
import test from "node:test"
import { createGame, applyAction, restoreDevelopmentChoices } from "./URRgame.js"
import * as rf from "./URRreference.js"
import { canExchangeBarahshum } from "./URRrules.js"

function betweenStatesGame() {
	const game = createGame(["A", "B", "C"])
	Object.assign(game.gameflow, { phase: rf.PHASE_DEVELOPMENT, stateOrder: [0, 1, 2], stateIndex: 0, developmentStep: "betweenStates", turnOrder: [0] })
	Object.assign(game.nations[rf.NATION_BARAHSHUM], { ownerType: "player", owner: 2 })
	for (const state of game.states) {
		state.king = state.id % 3
		state.diggers = [{ id: state.id, capacity: "1+1", hasDug: false }]
	}
	return game
}

test("Barahshum pass survives reload, skips only this owner's round, and rewinds", () => {
	const original = betweenStatesGame()
	assert.throws(() => applyAction(original, 0, { type: "passBarahshum" }), /Only Barahshum's owner/)
	const passed = applyAction(original, 2, { type: "passBarahshum" })
	assert.equal(passed.gameflow.developmentStep, "digging")
	assert.equal(passed.nations[rf.NATION_BARAHSHUM].isRemoved, false)
	const reloaded = JSON.parse(JSON.stringify(passed))
	const next = applyAction(reloaded, 0, { type: "endDevelopment" })
	assert.equal(next.gameflow.stateIndex, 1)
	assert.equal(next.gameflow.developmentStep, "digging")
	next.gameflow.turn++
	assert.equal(applyAction(next, 1, { type: "endDevelopment" }).gameflow.developmentStep, "betweenStates")
	passed.nations[rf.NATION_BARAHSHUM].owner = 1
	assert.equal(applyAction(passed, 0, { type: "endDevelopment" }).gameflow.developmentStep, "betweenStates")
	const rewound = applyAction(original, 0, { type: "beginDevelopment" })
	assert.equal(applyAction(rewound, 0, { type: "endDevelopment" }).gameflow.developmentStep, "betweenStates")
	assert.equal(original.gameflow.barahshumPass, undefined)
})

test("Barahshum can skip prompts during settlement without passing the settlement turn", () => {
	const game = betweenStatesGame()
	game.gameflow.phase = rf.PHASE_SETTLEMENT
	const passed = applyAction(game, 2, { type: "passBarahshum" })
	assert.equal(passed.gameflow.phase, rf.PHASE_SETTLEMENT)
	assert.deepEqual(passed.gameflow.turnOrder, [0])
	assert.equal(canExchangeBarahshum(passed, 2), false)
	Object.assign(passed.gameflow, { phase: rf.PHASE_DEVELOPMENT, developmentStep: "digging" })
	assert.equal(applyAction(passed, 0, { type: "endDevelopment" }).gameflow.developmentStep, "digging")
	passed.gameflow.phase = rf.PHASE_SETTLEMENT
	passed.gameflow.turn++
	assert.equal(canExchangeBarahshum(passed, 2), true)
})

test("Checked Barahshum pass also passes the current settlement turn", () => {
	const game = betweenStatesGame()
	Object.assign(game.gameflow, { phase: rf.PHASE_SETTLEMENT, turnOrder: [2], passes: 0 })
	const passed = applyAction(game, 2, { type: "passBarahshum", passTurn: true })
	assert.equal(passed.gameflow.passes, 1)
	assert.deepEqual(passed.gameflow.turnOrder, [0])
	assert.equal(canExchangeBarahshum(passed, 2), false)
	game.gameflow.turnOrder = [0]
	assert.throws(() => applyAction(game, 2, { type: "passBarahshum", passTurn: true }), /Only the current player/)
})

test("Waterwork agreements wait for End Turn and allow other purchases", () => {
	const game = betweenStatesGame()
	game.gameflow.developmentStep = "purchasing"
	game.states[0].money = 500
	for (const nation of game.nations) nation.isRemoved = true
	const sites = game.board.areas.filter((area) => !area.isRiver).slice(0, 2)
	for (const area of sites) area.owner = 1
	const request = { type: "requestWaterwork", kind: "pump", area: sites[0].id }
	const requested = applyAction(game, 0, request)
	assert.equal(requested.gameflow.pendingOffer, null)
	assert.deepEqual(requested.gameflow.turnOrder, [0])
	assert.equal(requested.states[0].money, 500)
	assert.throws(() => applyAction(requested, 0, request), /already occupies/)
	const purchased = applyAction(requested, 0, { type: "buyCard", kind: "digger" })
	assert.equal(purchased.states[0].diggers.length, 2)
	const queued = applyAction(purchased, 0, { ...request, area: sites[1].id })
	const ended = applyAction(queued, 0, { type: "endDevelopment" })
	assert.deepEqual(ended.gameflow.turnOrder, [1])
	assert.equal(ended.gameflow.pendingOffer.action.area, sites[0].id)
	assert.throws(() => applyAction(ended, 0, { type: "respondOffer", accept: true }), /not this player's turn/i)
	const accepted = applyAction(JSON.parse(JSON.stringify(ended)), 1, { type: "respondOffer", accept: true })
	assert.equal(accepted.board.areas.find((area) => area.id === sites[0].id).waterwork.kind, "pump")
	assert.equal(accepted.gameflow.pendingOffer.action.area, sites[1].id)
	const declined = applyAction(accepted, 1, { type: "respondOffer", accept: false })
	assert.deepEqual(declined.gameflow.turnOrder, [0])
	assert.equal(declined.gameflow.pendingOffer, null)
	assert.equal(declined.board.areas.find((area) => area.id === sites[1].id).waterwork, null)
})

test("Accepting the final waterwork advances development to the next state", () => {
	const game = betweenStatesGame()
	game.gameflow.developmentStep = "purchasing"
	game.states[0].money = 500
	for (const nation of game.nations) nation.isRemoved = true
	const site = game.board.areas.find((area) => !area.isRiver)
	site.owner = 1
	const requested = applyAction(game, 0, { type: "requestWaterwork", kind: "pump", area: site.id })
	const ended = applyAction(requested, 0, { type: "endDevelopment" })
	const accepted = applyAction(ended, 1, { type: "respondOffer", accept: true })
	assert.equal(accepted.gameflow.stateIndex, 1)
	assert.deepEqual(accepted.gameflow.turnOrder, [1])
	assert.equal(accepted.gameflow.developmentPlan, undefined)
})


test("Declined development restores editable purchases and blocks only the refused site", () => {
	const game = betweenStatesGame()
	game.gameflow.developmentStep = "purchasing"
	game.states[0].money = 500
	for (const nation of game.nations) nation.isRemoved = true
	const sites = game.board.areas.filter((area) => !area.isRiver).slice(0, 2)
	for (const site of sites) site.owner = 1
	const purchased = applyAction(game, 0, { type: "buyCard", kind: "digger" })
	const requested = applyAction(purchased, 0, { type: "requestWaterwork", kind: "pump", area: sites[0].id })
	const ended = applyAction(requested, 0, { type: "endDevelopment" })
	const declined = applyAction(ended, 1, { type: "respondOffer", accept: false })
	const restored = restoreDevelopmentChoices(JSON.parse(JSON.stringify(declined)))
	assert.equal(restored.steps.length, 1)
	assert.equal(restored.steps[0].action.type, "buyCard")
	assert.equal(restored.state.states[0].diggers.length, 2)
	assert.equal(restored.state.states[0].money, purchased.states[0].money)
	assert.equal(restored.steps[0].state.states[0].diggers.length, 1)
	assert.throws(() => applyAction(restored.steps[0].state, 0, { type: "requestWaterwork", kind: "pump", area: sites[0].id }), /declined construction/)
	assert.equal(applyAction(restored.state, 0, { type: "requestWaterwork", kind: "pump", area: sites[1].id }).gameflow.waterworkRequests.length, 1)
	const next = applyAction(restored.state, 0, { type: "endDevelopment" })
	assert.equal(next.gameflow.declinedWaterworks, undefined)
	restored.state.nations[rf.NATION_BARAHSHUM].isRemoved = false
	const between = applyAction(restored.state, 0, { type: "endDevelopment" })
	assert.equal(between.gameflow.developmentStep, "betweenStates")
	assert.equal(between.gameflow.developmentPlan, undefined)
	assert.equal(between.gameflow.offerDeclined, undefined)
})

test("Declining a later request preserves earlier approved construction", () => {
	const game = betweenStatesGame()
	game.gameflow.developmentStep = "purchasing"
	game.states[0].money = 500
	for (const nation of game.nations) nation.isRemoved = true
	const sites = game.board.areas.filter((area) => !area.isRiver).slice(0, 2)
	for (const site of sites) site.owner = 1
	let next = applyAction(game, 0, { type: "requestWaterwork", kind: "pump", area: sites[0].id })
	next = applyAction(next, 0, { type: "buyCard", kind: "digger" })
	next = applyAction(next, 0, { type: "requestWaterwork", kind: "pump", area: sites[1].id })
	next = applyAction(next, 0, { type: "endDevelopment" })
	next = applyAction(next, 1, { type: "respondOffer", accept: true })
	next = applyAction(next, 1, { type: "respondOffer", accept: false })
	const restored = restoreDevelopmentChoices(next)
	assert.deepEqual(restored.state.states, next.states)
	assert.deepEqual(restored.state.board.areas, next.board.areas)
	assert.deepEqual(restored.state.cardSupply, next.cardSupply)
	assert.equal(restored.state.gameflow.pendingOffer, null)
	assert.equal(restored.state.gameflow.waterworkRequests?.length || 0, 0)
})
