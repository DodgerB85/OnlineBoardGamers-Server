import { describe, expect, it } from "vitest"
import * as rf from "./DDLreference.js"
import * as rules from "./DDLrules.js"
import * as map from "./DDLmap.js"

function game(players = 3) {
	const names = Array.from({ length: players }, (_, i) => "P" + (i + 1))
	const state = rules.createInitialState({ playerNames: names, colours: names.map((_, i) => i), seed: 42, auction: false })
	state.gameflow.phase = rf.PHASE_MAIN
	state.gameflow.setup.stage = "DONE"
	state.gameflow.turn = 1
	state.gameflow.turnType = rf.TURN_CHOOSE
	state.players.forEach((player, i) => {
		player.ship.node = "P" + (8 + i)
	})
	return state
}

describe("setup", () => {
	it("is deterministic for a seed", () => {
		const a = rules.createInitialState({ playerNames: ["A", "B", "C"], seed: 7 })
		const b = rules.createInitialState({ playerNames: ["A", "B", "C"], seed: 7 })
		expect(a.board.consumerSlots).toEqual(b.board.consumerSlots)
		expect(a.board.planets.map((p) => p.mine)).toEqual(b.board.planets.map((p) => p.mine))
		expect(a.board.planets.map((p) => p.site)).toEqual(b.board.planets.map((p) => p.site))
	})

	it("places one of each mine and five spaceyards", () => {
		const state = game()
		expect(state.board.planets.filter((p) => p.start)).toHaveLength(5)
		expect(state.board.planets.filter((p) => p.site && p.site.kind === "spaceyard")).toHaveLength(5)
		expect(state.board.planets.every((p) => p.mine !== null)).toBe(true)
		expect(state.board.consumerSlots.flat().filter((t) => t !== null)).toHaveLength(12)
	})
})

describe("energy", () => {
	it("collects the chosen marker plus matching crew quarters", () => {
		const state = game()
		state.players[0].gear[0] = "navigator"
		state.players[0].gear[1] = "navigator"
		state.players[0].gear[2] = "builder"
		const result = rules.collectEnergy(state, 0, rf.RED_ENERGY)
		expect(result.ok).toBe(true)
		expect(result.produced).toBe(4)
		expect(state.players[0].energy[rf.RED_ENERGY]).toBe(3)
		expect(state.players[0].energy[rf.YELLOW_ENERGY]).toBe(1)
		expect(state.gameflow.turnOrder[0]).toBe(1)
	})

	it("gives virtual energy and an immediate free action turn when stock is empty", () => {
		const state = game()
		state.board.energyStock[rf.RED_ENERGY] = 0
		state.players[0].gear[0] = "navigator"
		const result = rules.collectEnergy(state, 0, rf.RED_ENERGY)
		expect(result.virtual).toBe(true)
		expect(state.players[0].virtual[rf.RED_ENERGY]).toBe(2)
		expect(state.gameflow.turnType).toBe(rf.TURN_ACTION)
		expect(state.gameflow.turnOrder[0]).toBe(0)
		expect(state.board.turnCubes).toHaveLength(1)
	})
})

describe("movement", () => {
	it("uses 8/5/2 speed by filled gear", () => {
		const state = game()
		const player = state.players[0]
		player.gear = [null, null, null, null, null, null, null, null]
		expect(rules.shipSpeed(player)).toBe(8)
		player.gear[0] = "cargo"
		player.gear[1] = "cargo"
		player.gear[2] = "cargo"
		expect(rules.shipSpeed(player)).toBe(8)
		player.gear[3] = "cargo"
		expect(rules.shipSpeed(player)).toBe(5)
		player.gear[4] = "cargo"
		player.gear[6] = "cargo"
		player.gear[5] = "cargo"
		expect(rules.shipSpeed(player)).toBe(2)
	})

	it("skips dots with the player's own highway", () => {
		const state = game()
		const noHighway = map.findPath(state, 0, "P0", "P1")
		expect(noHighway.cost).toBe(4)
		const segment = map.segmentNodeId(0, 2)
		state.board.highways[segment] = 0
		const withHighway = map.findPath(state, 0, "P0", "P1")
		expect(withHighway.cost).toBe(3)
	})

	it("stops movement on a planet and explores a normal planet", () => {
		const state = game()
		state.players[0].ship.node = "P1"
		state.players[0].gear[0] = "cargo"
		state.players[0].gear[1] = "cargo"
		state.players[0].gear[2] = "cargo"
		state.gameflow.turnType = rf.TURN_ACTION
		state.players[0].energy[rf.RED_ENERGY] = 1
		const start = rules.startMovement(state, 0)
		expect(start.ok).toBe(true)
		expect(state.gameflow.movement.remaining).toBe(8)
		const result = rules.moveToNode(state, 0, "P0")
		expect(result.ok).toBe(true)
		expect(state.gameflow.movement.remaining).toBe(0)
		expect(state.gameflow.pendingExplore.planetId).toBe(0)
	})
})

describe("building and trading", () => {
	it("builds a factory and scores its points", () => {
		const state = game()
		const player = state.players[0]
		const factory = rf.FACTORY_TYPES[0]
		player.ship.node = "P8"
		player.goods.push(...factory.input)
		player.energy[rf.YELLOW_ENERGY] = 1
		const before = player.score
		const result = rules.buildFactory(state, 0, factory.id)
		expect(result.ok).toBe(true)
		expect(player.score).toBe(before + factory.points)
		expect(rules.planetState(state, 8).factory.typeId).toBe(factory.id)
	})

	it("builds a starting spaceyard for 10 points", () => {
		const state = game()
		const player = state.players[0]
		const planet = rules.planetState(state, 8)
		const yard = rf.SPACEYARD_TYPES[planet.site.tileId]
		const other = rf.PRIMARY_GOODS.find((g) => g !== yard.cost[0])
		player.goods.push(yard.cost[0], other)
		player.energy[rf.YELLOW_ENERGY] = 1
		const result = rules.buildSite(state, 0, other)
		expect(result.ok).toBe(true)
		expect(planet.site.built).toBe(true)
		expect(player.score).toBe(yard.points)
	})

	it("sells to a consumer for its points", () => {
		const state = game()
		const player = state.players[0]
		const planet = rules.planetState(state, 8)
		planet.site = { kind: "consumer", tileId: 10, built: true }
		player.goods.push(10)
		player.energy[rf.BLUE_ENERGY] = 1
		const result = rules.tradeConsumer(state, 0)
		expect(result.ok).toBe(true)
		expect(player.score).toBe(10)
	})

	it("transfers goods in a player trade", () => {
		const state = game()
		state.players[0].ship.node = "P8"
		state.players[1].ship.node = "P8"
		state.players[0].goods.push(0)
		state.players[1].goods.push(1)
		const proposed = rules.proposeTrade(state, 0, 1, [0], [1])
		expect(proposed.ok).toBe(true)
		const accepted = rules.respondTrade(state, proposed.trade.id, 1, true)
		expect(accepted.ok).toBe(true)
		expect(state.players[0].goods).toContain(1)
		expect(state.players[1].goods).toContain(0)
	})
})

describe("auction and game end", () => {
	it("orders bids high to low with seat tie-break", () => {
		expect(rules.auctionOrder({ 0: 4, 1: 9, 2: 4 }, [0, 1, 2])).toEqual([1, 0, 2])
	})

	it("tie-break only reorders the tied group", () => {
		const firstOrder = [0, 1, 2]
		const firstBids = { 0: 10, 1: 5, 2: 5 }
		const order = rules.orderWithTiebreak(firstOrder, firstBids, { 1: 20, 2: 15 })
		expect(order).toEqual([0, 1, 2])
		expect(rules.orderWithTiebreak(firstOrder, firstBids, { 1: 15, 2: 20 })).toEqual([0, 2, 1])
	})

	it("ends after action turn 24 and groups ties", () => {
		const state = game()
		state.gameflow.turn = 24
		state.gameflow.turnType = rf.TURN_ACTION
		state.players[0].ship.node = "P8"
		state.players[0].gear = ["cargo", "cargo", "cargo", null, null, null, null, null]
		state.players[0].score = 30
		state.players[1].score = 25
		state.players[2].score = 10
		state.players[0].auctionBid = 5
		const result = rules.finishActionTurn(state)
		expect(result.gameOver).toBe(true)
		expect(state.gameflow.phase).toBe(rf.PHASE_GAME_OVER)
		expect(state.gameflow.finalPositions[0].sort()).toEqual([0, 1])
	})
})
