// Headless rule checks: `node rulesCheck.mjs` from URR/vueURR.
import assert from "node:assert/strict"
import * as rf from "./src/js/URRreference.js"
import * as rules from "./src/js/URRrules.js"
import { createGame, applyAction, finishWaterRouting, previewMaintenanceSales } from "./src/js/URRgame.js"
import { startWaterRouting, allocateWater, waterChoices } from "./src/js/URRwater.js"
import { getCanalCost, getDigPathPreview } from "./src/js/URRmap.js"
import { endsDecision, defaultEndAction, describeAction } from "./src/js/URRturnDraft.js"
import { compactHistory, expandHistory } from "./src/js/URRhistoryStorage.js"

const fresh = () => createGame(["A", "B", "C"])
const id = (row, column) => `printed-${row}-${column}`
const area = (game, areaId) => game.board.areas.find((entry) => entry.id === areaId)

// 3.2: an outbid offer is returned; only the highest offers reserve money.
{
	const game = fresh()
	game.nations[rf.NATION_DER].bids = [{ player: 1, amount: 115 }, { player: 2, amount: 120 }]
	assert.equal(rules.availableMoney(game, 1), 600)
	assert.equal(rules.availableMoney(game, 2), 480)
	game.nations[rf.NATION_ERIDU].bids = [{ player: 1, amount: 175 }]
	assert.equal(rules.availableMoney(game, 1), 425)
}

// 5.3.1.1: a confluence-area reservoir sits downstream of the meeting point.
{
	for (const riverId of [id(4, 6), id(7, 3)]) {
		let game = fresh()
		Object.assign(game.gameflow, { phase: rf.PHASE_DEVELOPMENT, stateOrder: [0], stateIndex: 0, developmentStep: "digging", turnOrder: [0] })
		Object.assign(game.states[0], { isActive: true, king: 0, money: 500 })
		assert.equal(Object.values(game.board.riverDownstream).filter((next) => next === riverId).length, 2)
		game = applyAction(game, 0, { type: "requestWaterwork", kind: "reservoir", area: riverId })
		assert.equal(area(game, riverId).waterwork.kind, "reservoir")
	}
}

// Route selection rejects impossible prefixes, while allowing dry-end tracing.
{
	const game = fresh()
	game.board.areas = [
		{ id: "A", isRiver: true, neighbours: ["B", "R"], nation: null },
		{ id: "B", isRiver: false, neighbours: ["A", "C"], nation: null },
		{ id: "C", isRiver: false, neighbours: ["B", "D"], nation: null },
		{ id: "D", isRiver: false, neighbours: ["C"], nation: null },
		{ id: "R", isRiver: true, neighbours: ["A"], nation: null },
	]
	game.board.canals = []
	assert.equal(getDigPathPreview(game, ["A"], 2).error, "")
	assert.equal(getDigPathPreview(game, ["A", "B"], "1+1").isComplete, true)
	assert.deepEqual(getDigPathPreview(game, ["A", "B", "C"], 3).cost, { canals: 2, junctions: 1, points: 3 })
	assert.match(getDigPathPreview(game, ["A", "B", "C"], "1+1").error, /cannot dig/)
	assert.match(getDigPathPreview(game, ["A", "B", "C", "D"], 3).error, /4 points/)
	assert.equal(getDigPathPreview(game, ["A", "B", "C", "D"], "M").isComplete, true)
	assert.match(getDigPathPreview(game, ["A", "D"], "M").error, /adjacent/)
	assert.match(getDigPathPreview(game, ["A", "R"], "M").error, /two river/)
	assert.match(getDigPathPreview(game, ["A", "B", "A"], "M").error, /simple path/)
	assert.equal(getDigPathPreview(game, ["D", "C"], 4).isComplete, false)
	assert.equal(getDigPathPreview(game, ["D", "C"], 4).error, "")
	assert.match(getDigPathPreview(game, ["D", "C"], 3).error, /No legal route/)
	assert.equal(getDigPathPreview(game, ["D", "C", "B", "A"], 4).isComplete, true)
	assert.match(getDigPathPreview(game, ["D"], null).error, /Choose an unused/)
	game.board.canals = [["B", "C"]]
	assert.match(getDigPathPreview(game, ["A", "B", "C"], "M").error, /middle/)
	assert.match(getDigPathPreview(game, ["B", "C"], "M").error, /already exists/)
	area(game, "D").nation = rf.NATION_ERIDU
	Object.assign(game.nations[rf.NATION_ERIDU], { ownerType: "player", owner: 0 })
	assert.match(getDigPathPreview(game, ["D"], "M").error, /nation land/)
	Object.assign(game.nations[rf.NATION_ERIDU], { ownerType: "state", owner: 0 })
	assert.equal(getDigPathPreview(game, ["D"], 2).error, "")
}

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
	assert.throws(() => exchange(id(4, 1)), /adjacent to its hills/)
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

// Skip empty harvests before and after a real harvest, preserving its choice and payouts.
{
	let game = fresh()
	Object.assign(game.gameflow, { phase: rf.PHASE_RAINY_SEASON, stateOrder: [0, 1, 2] })
	game.rain.step = "routing"
	for (const state of game.states.slice(0, 3)) Object.assign(state, { isActive: true, king: state.id })
	const land = game.board.areas.find((entry) => !entry.isRiver && !entry.isCity && entry.state === 1)
	land.owner = land.markerOwner = 1
	land.irrigatedBy = 1
	finishWaterRouting(game, 3 * rf.ERA_WATER_PER_RIVER[game.era] - 1)
	assert.deepEqual(game.rain.harvestOrder, [1, 2])
	assert.deepEqual(game.gameflow.turnOrder, [1])
	assert.equal(game.gameflow.phase, rf.PHASE_RAINY_SEASON)
	assert.equal(game.players[1].money, 605)
	game = applyAction(game, 1, { type: "harvest", choice: "distribute" })
	assert.equal(game.players[1].money, 625)
	assert.equal(game.gameflow.phase, rf.PHASE_SETTLEMENT)
	assert.equal(game.gameflow.turn, 2)
	assert.deepEqual(game.rain.harvestOrder, [])
}

// Finishing development without irrigation needs no harvest confirmations.
{
	const game = fresh()
	Object.assign(game.gameflow, { phase: rf.PHASE_DEVELOPMENT, stateOrder: [0], stateIndex: 0, developmentStep: "digging", turnOrder: [0] })
	Object.assign(game.states[0], { isActive: true, king: 0, diggers: [{ id: 0, era: 1, capacity: "1+1", hasDug: false }] })
	const next = applyAction(game, 0, { type: "endDevelopment" })
	assert.equal(next.gameflow.phase, rf.PHASE_SETTLEMENT)
	assert.equal(next.gameflow.turn, 2)
	assert.equal(next.states[0].money, game.states[0].money)
	assert.deepEqual(next.players.map((player) => player.money), game.players.map((player) => player.money))
}

// A revolting state distributes automatically, still paying out and scoring the game.
{
	const game = fresh()
	Object.assign(game.gameflow, { phase: rf.PHASE_RAINY_SEASON, stateOrder: [0], endReason: "revolution" })
	Object.assign(game.states[0], { isActive: true, king: 0, hasRevolted: true })
	game.rain.step = "routing"
	const land = game.board.areas.find((entry) => !entry.isRiver && !entry.isCity && entry.state === 0)
	land.owner = land.markerOwner = 0
	land.irrigatedBy = 0
	finishWaterRouting(game, 3 * rf.ERA_WATER_PER_RIVER[game.era] - 1)
	assert.equal(game.players[0].money, 625)
	assert.equal(game.gameflow.phase, rf.PHASE_GAME_OVER)
	assert.deepEqual(game.gameflow.turnOrder, [])
	assert.equal(game.players[0].score, rules.playerAssets(game, 0))
}

// Barahshum's between-state opportunity remains a player decision.
{
	const game = fresh()
	Object.assign(game.gameflow, { phase: rf.PHASE_DEVELOPMENT, stateOrder: [0], stateIndex: 0, developmentStep: "digging", turnOrder: [0] })
	Object.assign(game.states[0], { isActive: true, king: 0, diggers: [{ id: 0, era: 1, capacity: "1+1", hasDug: false }] })
	Object.assign(game.nations[rf.NATION_BARAHSHUM], { ownerType: "player", owner: 1 })
	const next = applyAction(game, 0, { type: "endDevelopment" })
	assert.equal(next.gameflow.developmentStep, "betweenStates")
	assert.equal(rules.canExchangeBarahshum(next, 1), true)
	assert.equal(rules.getAutomaticAction(next), null)
	const home = next.board.areas.find((land) => land.nation === rf.NATION_BARAHSHUM)
	const destination = home.neighbours.find((areaId) => area(next, areaId).nation === null && !next.board.canals.some(([from, to]) => (from === home.id && to === areaId) || (to === home.id && from === areaId)))
	const action = { type: "exchangeBarahshum", from: home.id, to: destination }
	const exchanged = applyAction(next, 1, action)
	assert.equal(exchanged.nations[rf.NATION_BARAHSHUM].isRemoved, true)
	assert.equal(exchanged.gameflow.phase, rf.PHASE_SETTLEMENT)
	assert.equal(exchanged.gameflow.turn, 2)
	Object.assign(next.gameflow, { stateOrder: [0, 2], stateIndex: 1 })
	Object.assign(next.states[2], { isActive: true, king: 2 })
	const handoff = applyAction(next, 1, action)
	assert.equal(handoff.gameflow.phase, rf.PHASE_DEVELOPMENT)
	assert.equal(handoff.gameflow.developmentStep, "digging")
	assert.deepEqual(handoff.gameflow.turnOrder, [2])
	assert.equal(handoff.gameflow.stateIndex, 1)
	Object.assign(next.gameflow, { phase: rf.PHASE_SETTLEMENT, turnOrder: [0] })
	assert.deepEqual(applyAction(next, 1, action).gameflow.turnOrder, [0])
	Object.assign(next.gameflow, { phase: rf.PHASE_DEVELOPMENT, stateOrder: [0], stateIndex: 0, developmentStep: "digging" })
	Object.assign(next.nations[rf.NATION_BARAHSHUM], { ownerType: "state", owner: 0 })
	const stateExchange = applyAction(next, 0, action)
	assert.equal(stateExchange.gameflow.developmentStep, "digging")
	assert.equal(stateExchange.gameflow.stateIndex, 0)
	Object.assign(next.nations[rf.NATION_BARAHSHUM], { ownerType: "player", owner: 1 })
	for (const neighbour of home.neighbours) {
		if (!next.board.canals.some(([from, to]) => (from === home.id && to === neighbour) || (to === home.id && from === neighbour))) next.board.canals.push([home.id, neighbour])
	}
	assert.deepEqual(rules.barahshumDestinations(next), [])
	Object.assign(next.gameflow, { developmentStep: "betweenStates", stateOrder: [0, 2], stateIndex: 1 })
	assert.equal(rules.canExchangeBarahshum(next, 1), false)
	assert.deepEqual(rules.getAutomaticAction(next), { type: "beginDevelopment" })
	Object.assign(next.gameflow, { developmentStep: "digging", stateIndex: 0, turnOrder: [0] })
	const skippedExchange = applyAction(next, 0, { type: "endDevelopment" })
	assert.equal(skippedExchange.gameflow.developmentStep, "digging")
	assert.equal(skippedExchange.gameflow.stateIndex, 1)
	assert.deepEqual(skippedExchange.gameflow.turnOrder, [2])
	assert.equal(skippedExchange.nations[rf.NATION_BARAHSHUM].isRemoved, false)
}

// Earlier saves may already be paused at an empty harvest; preserve the next real choice.
{
	const game = fresh()
	Object.assign(game.gameflow, { phase: rf.PHASE_RAINY_SEASON, stateOrder: [0, 2], turnOrder: [0] })
	Object.assign(game.states[0], { isActive: true, king: 0 })
	Object.assign(game.states[2], { isActive: true, king: 2 })
	const land = game.board.areas.find((entry) => entry.state === 2 && entry.nation === null)
	Object.assign(land, { owner: 2, markerOwner: 2, irrigatedBy: 2 })
	Object.assign(game.rain, { step: "harvest", harvestOrder: [0, 2], outflow: 3 * rf.ERA_WATER_PER_RIVER[game.era] - 1 })
	const action = rules.getAutomaticAction(game)
	assert.deepEqual(action, { type: "harvest", choice: "distribute" })
	const next = applyAction(game, 0, action)
	assert.deepEqual(next.rain.harvestOrder, [2])
	assert.deepEqual(next.gameflow.turnOrder, [2])
	assert.equal(rules.getAutomaticAction(next), null)
	next.states[2].hasRevolted = true
	assert.deepEqual(rules.getAutomaticAction(next), { type: "harvest", choice: "distribute" })
}

// Resume an older exhausted routing step, but never bypass an available destination.
{
	const game = fresh()
	const river = area(game, game.board.riverSources[0])
	const pump = river.neighbours.map((neighbour) => area(game, neighbour)).find((entry) => !entry.isRiver && entry.nation === null)
	river.waterwork = { state: 0, kind: "reservoir", capacity: 2 }
	pump.waterwork = { state: 0, kind: "pump", capacity: 1 }
	game.board.canals.push([river.id, pump.id])
	Object.assign(game.gameflow, { phase: rf.PHASE_RAINY_SEASON, stateOrder: [0], turnOrder: [0] })
	Object.assign(game.states[0], { isActive: true, king: 0 })
	game.rain.step = "routing"
	game.rain.routing = { sourceIndex: 1, river: null, arrivals: {}, outflow: 0, stack: [{ area: river.id, water: 2, downstreamWater: rf.ERA_WATER_PER_RIVER[game.era] - 2, visited: [river.id], originReservoir: river.id }] }
	const action = rules.getAutomaticAction(game)
	assert.deepEqual(action, { type: "advanceWater" })
	const next = applyAction(game, 0, action)
	assert.equal(next.rain.outflow, 3 * rf.ERA_WATER_PER_RIVER[game.era])
	assert.equal(next.gameflow.turn, 2)
	assert.equal(next.gameflow.phase, rf.PHASE_SETTLEMENT)
	pump.owner = pump.markerOwner = 0
	assert.equal(rules.getAutomaticAction(game), null)
	assert.throws(() => applyAction(game, 0, action), /Choose where to send/)
}

// Ending development hires mandatory maintenance directly when no sales are needed.
{
	const game = fresh()
	Object.assign(game.gameflow, { phase: rf.PHASE_DEVELOPMENT, stateOrder: [0], stateIndex: 0, developmentStep: "digging", turnOrder: [0] })
	Object.assign(game.states[0], { isActive: true, king: 0, money: 30 })
	const next = applyAction(game, 0, { type: "endDevelopment" })
	assert.equal(next.states[0].diggers.length, 1)
	assert.equal(next.states[0].money, 0)
	assert.equal(next.players[0].money, 580)
	assert.equal(next.gameflow.phase, rf.PHASE_SETTLEMENT)
	assert.equal(game.states[0].diggers.length, 0)
	game.players[0].money = 0
	assert.throws(() => applyAction(game, 0, { type: "endDevelopment" }), /sell land or resolve a revolution/)
}

// Incomplete funding previews preserve the position and share submission's sale rules.
{
	const game = fresh()
	Object.assign(game.gameflow, { phase: rf.PHASE_DEVELOPMENT, stateOrder: [0], stateIndex: 0, developmentStep: "digging", turnOrder: [0] })
	Object.assign(game.states[0], { isActive: true, king: 0, money: 0 })
	game.players[0].money = 0
	game.cardSupply[1] = 0
	game.nations.forEach((nation) => { nation.isRemoved = true })
	const lands = game.board.areas.filter((land) => !land.isRiver && land.state === 0)
	lands.forEach((land) => { land.owner = land.markerOwner = 0 })
	const forests = lands.filter((land) => land.landType === rf.LAND_FOREST && !land.isCity)
	const before = JSON.stringify(game)
	const partial = previewMaintenanceSales(game, 0, [[forests[0].id]])
	assert.equal(partial.players[0].money, 82)
	assert.equal(rules.maintenanceShortfall(partial, 0) - partial.players[0].money, 18)
	assert.equal(partial.states[0].diggers.length, 0)
	assert.throws(() => applyAction(game, 0, { type: "resolveMaintenance", sales: [[forests[0].id]] }), /Sell the remaining eligible land/)
	assert.equal(JSON.stringify(game), before)
	const sales = [[forests[0].id, forests[1].id]]
	const funded = previewMaintenanceSales(game, 0, sales)
	const resolved = applyAction(game, 0, { type: "resolveMaintenance", sales })
	assert.equal(funded.players[0].money, 164)
	assert.equal(resolved.players[0].money, 64)
	assert.equal(resolved.states[0].diggers.length, 1)
	assert.deepEqual(funded.landPrices, resolved.landPrices)
	assert.throws(() => previewMaintenanceSales(game, 0, [...sales, [forests[2].id]]), /Stop selling/)
	assert.throws(() => applyAction(game, 0, { type: "resolveMaintenance", sales: [[...sales[0], forests[2].id]] }), /cash left after hiring/)
	lands.forEach((land) => { land.owner = land.markerOwner = null })
	forests.forEach((land, index) => { land.owner = land.markerOwner = index < 3 ? 0 : 1 })
	assert.throws(() => previewMaintenanceSales(game, 0, [[forests[0].id, forests[1].id]]), /preserve/)
}

// Exhausted pumps do not request water again; surplus still flows downstream.
{
	const game = fresh()
	const river = area(game, id(4, 2))
	const pump = area(game, id(4, 3))
	Object.assign(game.states[0], { isActive: true, king: 0 })
	river.waterwork = { state: 0, kind: "reservoir", capacity: 2 }
	pump.waterwork = { state: 0, kind: "pump", capacity: 1 }
	pump.owner = pump.markerOwner = 0
	game.board.canals.push([river.id, pump.id])
	game.rain.step = "routing"
	assert.equal(startWaterRouting(game), false)
	assert.deepEqual(waterChoices(game), [{ area: pump.id, kind: "pump" }])
	assert.equal(allocateWater(game, { type: "allocateWater", area: pump.id, amount: 1 }), true)
	assert.equal(pump.irrigatedBy, 0)
	assert.equal(game.rain.routing.outflow, 3 * rf.ERA_WATER_PER_RIVER[game.era] - 1)
}

// An irrigated pump is still a real choice when it can serve other land.
{
	const game = fresh()
	const river = area(game, id(4, 2))
	const pump = area(game, id(4, 3))
	const land = area(game, id(4, 4))
	Object.assign(game.states[0], { isActive: true, king: 0 })
	river.waterwork = { state: 0, kind: "reservoir", capacity: 2 }
	pump.waterwork = { state: 0, kind: "pump", capacity: 1 }
	pump.owner = pump.markerOwner = land.owner = land.markerOwner = 0
	pump.irrigatedBy = 0
	game.board.canals.push([river.id, pump.id], [pump.id, land.id])
	assert.equal(startWaterRouting(game), false)
	assert.deepEqual(waterChoices(game), [{ area: pump.id, kind: "pump" }])
	assert.equal(allocateWater(game, { type: "allocateWater", area: pump.id, amount: 1 }), false)
	assert.deepEqual(waterChoices(game), [{ area: land.id, kind: "irrigate" }])
}

// 3: auction turns retain marker order and skip bidders without an affordable raise.
{
	let game = createGame(["A", "B", "C", "D"])
	game.nations[rf.NATION_BARAHSHUM].bids = [{ player: 0, amount: 45 }, { player: 1, amount: 75 }, { player: 2, amount: 55 }, { player: 3, amount: 60 }]
	Object.assign(game.gameflow, { auction: { nation: rf.NATION_BARAHSHUM, bidders: [0, 1, 2, 3], highPlayer: 1, amount: 75 }, turnOrder: [2], treatyResumePlayer: 3 })
	game.players[0].money = 84
	game.players[3].money = 79
	game = applyAction(game, 2, { type: "pass" })
	assert.deepEqual(game.gameflow.turnOrder, [0])
	assert.deepEqual(game.gameflow.auction.bidders, [0, 1])
	assert.equal(game.players[3].money, 79)
	game = applyAction(game, 0, { type: "bidNation", nation: rf.NATION_BARAHSHUM, amount: 80 })
	assert.deepEqual(game.gameflow.turnOrder, [1])
	const winnerBefore = game.players[1].money
	game = applyAction(game, 1, { type: "bidNation", nation: rf.NATION_BARAHSHUM, amount: 85 })
	assert.equal(game.gameflow.auction, null)
	assert.equal(game.nations[rf.NATION_BARAHSHUM].owner, 1)
	assert.equal(game.players[1].money, winnerBefore - 85)
	assert.equal(game.players[0].money, 84)
	assert.deepEqual(game.gameflow.turnOrder, [3])
}

// 3: the next auction respects money reserved for later nations, including an exact minimum bid.
{
	let game = fresh()
	game.players[0].money = 50
	game.players[1].money = 225
	game.nations[rf.NATION_BARAHSHUM].bids = [{ player: 0, amount: 45 }, { player: 1, amount: 50 }, { player: 2, amount: 55 }]
	game.nations[rf.NATION_ERIDU].bids = [{ player: 1, amount: 165 }]
	game = applyAction(game, 0, { type: "buyNation", nation: rf.NATION_ASHUR })
	assert.deepEqual(game.gameflow.turnOrder, [1])
	assert.deepEqual(game.gameflow.auction.bidders, [1, 2])
	assert.equal(rules.availableMoney(game, 1), 60)
	assert.equal(rules.getAutomaticAction(game), null)
	game = applyAction(game, 1, { type: "bidNation", nation: rf.NATION_BARAHSHUM, amount: 60 })
	assert.deepEqual(game.gameflow.turnOrder, [2])
	assert.deepEqual(game.nations[rf.NATION_ERIDU].bids, [{ player: 1, amount: 165 }])
}

// 3: opening an auction with no affordable challenger awards the existing high bid immediately.
{
	let game = fresh()
	game.players[0].money = 50
	game.players[1].money = 220
	game.nations[rf.NATION_BARAHSHUM].bids = [{ player: 0, amount: 45 }, { player: 1, amount: 50 }, { player: 2, amount: 55 }]
	game.nations[rf.NATION_ERIDU].bids = [{ player: 1, amount: 165 }]
	game = applyAction(game, 0, { type: "buyNation", nation: rf.NATION_ASHUR })
	assert.equal(game.gameflow.auction, null)
	assert.equal(game.nations[rf.NATION_BARAHSHUM].owner, 2)
	assert.equal(game.players[2].money, 545)
	assert.equal(game.players[0].money, 30)
	assert.equal(game.players[1].money, 220)
	assert.deepEqual(game.gameflow.turnOrder, [1])
	assert.deepEqual(game.nations[rf.NATION_ERIDU].bids, [{ player: 1, amount: 165 }])
}

// Stored positions which already stopped on an unaffordable bidder also resolve automatically.
{
	const game = fresh()
	game.players[0].money = 54
	Object.assign(game.gameflow, { auction: { nation: rf.NATION_BARAHSHUM, bidders: [0, 1], highPlayer: 1, amount: 50 }, turnOrder: [0] })
	assert.deepEqual(rules.getAutomaticAction(game), { type: "pass" })
	game.players[0].money = 55
	assert.equal(rules.getAutomaticAction(game), null)
}

// Replay compaction preserves every choice, including deletions and array changes.
{
	const history = []
	const game = fresh()
	const record = (action = null) => history.push([rf.HIST_ACTION, 0, JSON.stringify(game), action, 12345])
	record()
	game.gameflow.pendingOffer = { state: 0, action: { type: "offerNation", nation: 1, amount: 50 } }
	game.states[0].diggers.push({ id: 0, capacity: 2, era: 1, hasDug: false })
	record({ type: "offerNation", nation: 1, amount: 50 })
	game.gameflow.pendingOffer.action.amount = 60
	game.board.areas[0].irrigatedBy = 0
	game.states[0].diggers[0].hasDug = true
	game.players[0].money -= 10
	record({ type: "allocateWater", area: game.board.areas[0].id, amount: 1 })
	delete game.gameflow.pendingOffer
	game.states[0].diggers = []
	record()
	game.gameflow.phase = rf.PHASE_SETTLEMENT
	record()
	const compact = compactHistory(history)
	assert.equal(typeof compact[0][2], "string")
	assert.equal(typeof compact[1][2], "object")
	assert.equal(typeof compact.at(-1)[2], "string")
	assert.ok(JSON.stringify(compact).length < JSON.stringify(history).length / 2)
	const saved = JSON.stringify(compact)
	const expanded = expandHistory(compact)
	assert.equal(JSON.stringify(compact), saved, "Expansion must not mutate compact records")
	for (const [index, entry] of expanded.entries()) {
		assert.deepEqual(JSON.parse(entry[2]), JSON.parse(history[index][2]))
		assert.deepEqual(entry.slice(3), history[index].slice(3))
	}
	assert.deepEqual(expandHistory(history), history, "Legacy full snapshots remain readable")
	assert.deepEqual(compactHistory(history), compact, "Cached exports preserve the same history")
	// A replay branch can replace a snapshot on the same history entry.
	game.players[0].money += 30
	history[2][2] = JSON.stringify(game)
	assert.deepEqual(JSON.parse(expandHistory(compactHistory(history))[2][2]), game)
	assert.throws(() => expandHistory([[rf.HIST_ACTION, 0, compact[1][2]]]), /Invalid URR replay delta/)
}

// Ending a state's development is a review boundary even when the same king
// controls the next state. Buying equipment alone remains undoable in that turn.
{
	const game = fresh()
	Object.assign(game.gameflow, { phase: rf.PHASE_DEVELOPMENT, stateOrder: [rf.STATE_SUMER, rf.STATE_AKKAD], stateIndex: 0, developmentStep: "digging", turnOrder: [0] })
	for (const stateId of game.gameflow.stateOrder) {
		game.states[stateId].king = 0
		game.states[stateId].money = 1000
		game.states[stateId].diggers = [{ id: stateId, capacity: 1, era: 1, hasDug: false }]
	}
	const purchase = { type: "buyCard", kind: "digger" }
	const purchased = applyAction(game, 0, purchase)
	assert.equal(endsDecision(game, purchased, purchase), false)
	assert.equal(purchased.gameflow.developmentStep, "purchasing")
	const end = defaultEndAction(purchased)
	const next = applyAction(purchased, 0, end)
	assert.equal(next.gameflow.turnOrder[0], 0)
	assert.equal(endsDecision(purchased, next, end), true)
	assert.match(describeAction(purchased, next, end), /End Turn to confirm/)
	const offer = { ...game, gameflow: { ...game.gameflow, pendingOffer: { returnPlayer: 0 } } }
	assert.throws(() => defaultEndAction(offer), /Accept or Decline/)
}

// Ending a routing or harvest turn must not invent a choice for the player.
{
	const game = fresh()
	game.gameflow.phase = rf.PHASE_RAINY_SEASON
	game.rain.step = "routing"
	assert.throws(() => defaultEndAction(game), /remaining water/)
	game.rain.step = "harvest"
	assert.throws(() => defaultEndAction(game), /harvest/)
}

console.log("URR rule, replay storage, and turn boundary checks passed")
