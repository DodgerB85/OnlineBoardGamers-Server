import assert from "node:assert/strict"
import test from "node:test"
import { createGame, applyAction, restoreDevelopmentChoices } from "./URRgame.js"
import * as rf from "./URRreference.js"
import { canExchangeBarahshum, getAutomaticAction, remainingWaterworkTokens } from "./URRrules.js"
import { actionPanelGame, defaultEndAction, endsDecision, turnCost } from "./URRturnDraft.js"
import { startWaterRouting, waterChoices } from "./URRwater.js"

test("A sole pump receives all water automatically and stops at its downstream choice", () => {
	const game = createGame(["A", "B", "C"])
	for (const nation of game.nations) nation.isRemoved = true
	Object.assign(game.gameflow, { phase: rf.PHASE_RAINY_SEASON, stateOrder: [0], turnOrder: [1] })
	Object.assign(game.states[0], { isActive: true, king: 1 })
	const area = (id) => game.board.areas.find((entry) => entry.id === id)
	const river = area("printed-3-6")
	const pump = area("printed-3-5")
	const nextPump = area("printed-3-4")
	const land = area("printed-4-5")
	river.waterwork = { state: 0, kind: "reservoir", capacity: 2 }
	pump.waterwork = nextPump.waterwork = { state: 0, kind: "pump", capacity: 1 }
	pump.owner = pump.markerOwner = 2
	nextPump.owner = nextPump.markerOwner = land.owner = land.markerOwner = 1
	game.board.canals.push([river.id, pump.id], [pump.id, nextPump.id], [pump.id, land.id])
	game.rain.step = "routing"
	game.rain.routing = { sourceIndex: 2, river: null, arrivals: {}, outflow: 0, stack: [{ area: river.id, water: 2, downstreamWater: 4, visited: [river.id], originReservoir: river.id }] }
	const automatic = getAutomaticAction(game)
	assert.deepEqual(automatic, { type: "allocateWater", area: pump.id, amount: 2 })
	const allAtOnce = applyAction(game, 1, automatic)
	const firstHalf = applyAction(game, 1, { ...automatic, amount: 1 })
	const splitHandoff = applyAction(firstHalf, 1, getAutomaticAction(firstHalf))
	assert.deepEqual(allAtOnce, splitHandoff)
	assert.equal(pump.irrigatedBy, null)
	assert.equal(allAtOnce.board.areas.find((entry) => entry.id === pump.id).irrigatedBy, 0)
	assert.equal(waterChoices(allAtOnce).length, 2)
	assert.equal(getAutomaticAction(allAtOnce), null)
	land.waterwork = { state: 0, kind: "pump", capacity: 1 }
	game.board.canals.push([river.id, land.id])
	assert.equal(waterChoices(game).length, 2)
	assert.equal(getAutomaticAction(game), null)
})

test("Action review keeps the decision's panel state after a phase or player handoff", () => {
	const start = createGame(["A", "B", "C"])
	const beforeChoice = structuredClone(start)
	beforeChoice.gameflow.phase = rf.PHASE_RAINY_SEASON
	const current = structuredClone(beforeChoice)
	current.gameflow.phase = rf.PHASE_SETTLEMENT
	current.turnDraft = { ready: true, start: { state: start }, steps: [{ state: beforeChoice }] }
	assert.equal(actionPanelGame(current), beforeChoice)
	current.players[0].money -= 20
	current.states[0].money -= 10
	assert.equal(turnCost(current), 30)
	current.turnDraft.ready = false
	assert.equal(actionPanelGame(current), current)
})

test("One water and one reachable land is forced; scarce water with two lands remains a choice", () => {
	const game = createGame(["A", "B", "C"])
	for (const nation of game.nations) nation.isRemoved = true
	Object.assign(game.gameflow, { phase: rf.PHASE_RAINY_SEASON, stateOrder: [0], turnOrder: [0] })
	Object.assign(game.states[0], { isActive: true, king: 0 })
	const river = game.board.areas.find((area) => area.id === "printed-4-2")
	const land = game.board.areas.find((area) => area.id === "printed-4-3")
	river.waterwork = { state: 0, kind: "reservoir", capacity: 2 }
	land.owner = land.markerOwner = 0
	game.board.canals.push([river.id, land.id])
	game.rain.step = "routing"
	startWaterRouting(game)
	game.rain.routing.stack.at(-1).water = 1
	assert.deepEqual(getAutomaticAction(game), { type: "allocateWater", area: land.id, amount: 1 })
	const otherLand = river.neighbours.map((id) => game.board.areas.find((area) => area.id === id)).find((area) => !area.isRiver && area.id !== land.id)
	otherLand.owner = otherLand.markerOwner = 0
	game.board.canals.push([river.id, otherLand.id])
	assert.equal(getAutomaticAction(game), null)
	game.rain.routing.stack.at(-1).water = 2
	assert.equal(getAutomaticAction(game).type, "allocateWater")
})

test("Barahshum's free canal keeps the owner's settlement turn open for a land purchase", () => {
	const game = createGame(["A", "B", "C"])
	Object.assign(game.gameflow, { phase: rf.PHASE_SETTLEMENT, turnOrder: [0, 1, 2] })
	Object.assign(game.nations[rf.NATION_BARAHSHUM], { ownerType: "player", owner: 0 })
	const home = game.board.areas.find((area) => area.nation === rf.NATION_BARAHSHUM)
	const destination = home.neighbours.find((id) => game.board.areas.find((area) => area.id === id).nation === null)
	const action = { type: "exchangeBarahshum", from: home.id, to: destination }
	const exchanged = applyAction(game, 0, action)
	assert.equal(endsDecision(game, exchanged, action), false)
	assert.deepEqual(exchanged.gameflow.turnOrder, game.gameflow.turnOrder)
	const land = exchanged.board.areas.find((area) => !area.isRiver && area.nation === null && area.owner === null && area.markerOwner === null)
	const purchased = applyAction(exchanged, 0, { type: "tradeLand", buy: land.id })
	assert.equal(purchased.board.areas.find((area) => area.id === land.id).owner, 0)
	assert.equal(purchased.nations[rf.NATION_BARAHSHUM].isRemoved, true)
	Object.assign(game.nations[rf.NATION_BARAHSHUM], { owner: 1 })
	assert.throws(() => applyAction(game, 1, action), /Barahshum cannot be exchanged now/)
})

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

test("privately owned Barahshum is only available on its owner's settlement turn", () => {
	const game = betweenStatesGame()
	Object.assign(game.gameflow, { phase: rf.PHASE_SETTLEMENT, turnOrder: [0] })
	assert.equal(canExchangeBarahshum(game, 2), false)
	game.gameflow.turnOrder = [2]
	game.gameflow.barahshumPass = { turn: game.gameflow.turn, player: 2 }
	assert.equal(canExchangeBarahshum(game, 2), true, "Old prompt preferences must not disable the own-turn option")
	game.gameflow.phase = rf.PHASE_DEVELOPMENT
	assert.equal(canExchangeBarahshum(game, 2), false)
	assert.throws(() => applyAction(game, 2, { type: "passBarahshum" }), /no longer needs a separate pass/)
})

test("development moves directly to the next state without Barahshum interruptions", () => {
	const game = betweenStatesGame()
	game.gameflow.developmentStep = "digging"
	const next = applyAction(game, 0, { type: "endDevelopment" })
	assert.equal(next.gameflow.developmentStep, "digging")
	assert.equal(next.gameflow.stateIndex, 1)
	assert.deepEqual(next.gameflow.turnOrder, [1])
	assert.equal(next.nations[rf.NATION_BARAHSHUM].isRemoved, false)
	assert.deepEqual(getAutomaticAction(game), null)
})

test("settlement and Eridu lead directly into state development", () => {
	const game = betweenStatesGame()
	game.states[0].isActive = true
	game.nations[rf.NATION_ERIDU].isRemoved = true
	Object.assign(game.gameflow, { phase: rf.PHASE_SETTLEMENT, passes: 2 })
	const next = applyAction(game, 0, { type: "pass" })
	assert.equal(next.gameflow.phase, rf.PHASE_DEVELOPMENT)
	assert.equal(next.gameflow.developmentStep, "digging")
	assert.deepEqual(next.gameflow.turnOrder, [0])
	Object.assign(game.gameflow, { phase: rf.PHASE_DEVELOPMENT, developmentStep: "eridu", turnOrder: [2] })
	assert.deepEqual(defaultEndAction(game), { type: "pass" })
	const afterEridu = applyAction(game, 2, defaultEndAction(game))
	assert.equal(afterEridu.gameflow.developmentStep, "digging")
	assert.deepEqual(afterEridu.gameflow.turnOrder, [0])
})

test("an old between-state save automatically starts the next state's turn", () => {
	const game = betweenStatesGame()
	assert.equal(canExchangeBarahshum(game, 2), false)
	assert.deepEqual(getAutomaticAction(game), { type: "beginDevelopment" })
	const next = applyAction(game, 0, getAutomaticAction(game))
	assert.equal(next.gameflow.developmentStep, "digging")
	assert.deepEqual(next.gameflow.turnOrder, [0])
})

test("assimilated Barahshum can only be exchanged during its owning state's turn", () => {
	const game = betweenStatesGame()
	game.gameflow.developmentStep = "digging"
	Object.assign(game.nations[rf.NATION_BARAHSHUM], { ownerType: "state", owner: 0 })
	assert.equal(canExchangeBarahshum(game, 0), true)
	assert.equal(canExchangeBarahshum(game, 1), false)
	game.gameflow.stateIndex = 1
	game.gameflow.turnOrder = [1]
	assert.equal(canExchangeBarahshum(game, 0), false)
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
	assert.equal(between.gameflow.developmentStep, "digging")
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

test("Waterwork token counts share matching numbers and exclude other states", () => {
	const game = createGame(["A", "B", "C"])
	assert.equal(remainingWaterworkTokens(game, 0, 2), 6)
	game.board.areas[0].waterwork = { state: 0, capacity: 2, kind: "pump" }
	game.board.areas[1].waterwork = { state: 0, capacity: 2, kind: "reservoir" }
	game.board.areas[2].waterwork = { state: 1, capacity: 2, kind: "pump" }
	game.board.areas[3].waterwork = { state: 0, capacity: 1, kind: "pump" }
	assert.equal(remainingWaterworkTokens(game, 0, 2), 4)
	game.board.areas[0].waterwork = null
	assert.equal(remainingWaterworkTokens(game, 0, 2), 5)
})
