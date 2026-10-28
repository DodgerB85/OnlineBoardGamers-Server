import { describe, expect, it } from "vitest"
import * as rf from "./DDLreference.js"
import * as map from "./DDLmap.js"
import * as rules from "./DDLrules.js"

// Independently traced links on board.jpg, including the destination step.
const printedLinks = [
	["P0", "P1", 4], ["P0", "J0", 7], ["J0", "P2", 3], ["J0", "P3", 11],
	["P3", "J1", 5], ["J1", "P4", 7], ["J1", "P6", 5], ["P4", "P7", 6],
	["P6", "P7", 8], ["P2", "P8", 12], ["P2", "P6", 8], ["P2", "P1", 10],
	["P5", "P6", 6], ["P5", "P12", 12], ["P5", "P13", 12], ["P1", "P8", 12],
	["P8", "P9", 5], ["P8", "P10", 4], ["P10", "P9", 3], ["P10", "P11", 6],
	["P9", "P11", 4], ["P11", "P12", 4], ["P6", "P14", 10], ["P14", "P7", 6],
	["P14", "P15", 8], ["P14", "P13", 10], ["P13", "P12", 10], ["P13", "P15", 12],
]

describe("printed road graph", () => {
	it.each(printedLinks.map((link, id) => [id, ...link]))("traces link %i: %s to %s in %i steps", (id, a, b, length) => {
		expect(rf.ROUTES[id]).toEqual({ id, a, b, length })
		const chain = [a, ...Array.from({ length: length - 1 }, (_, i) => map.segmentNodeId(id, i + 1)), b]
		for (let i = 1; i < chain.length; i++) {
			expect(map.neighbours(chain[i - 1]).some((edge) => edge.to === chain[i])).toBe(true)
			expect(map.neighbours(chain[i]).some((edge) => edge.to === chain[i - 1])).toBe(true)
			const from = map.nodePosition(chain[i - 1])
			const to = map.nodePosition(chain[i])
			expect(Math.hypot(to[0] - from[0], to[1] - from[1])).toBeLessThan(65)
		}
	})

	it("matches all six printed distances around the junctions", () => {
		const state = { board: { highways: {} } }
		for (const [a, b, cost] of [["P0", "P3", 18], ["P0", "P2", 10], ["P2", "P3", 14], ["P3", "P4", 12], ["P3", "P6", 10], ["P6", "P4", 12]]) {
			expect(map.findPath(state, 0, a, b).cost).toBe(cost)
			expect(map.findPath(state, 0, b, a).cost).toBe(cost)
		}
	})

	it("has one distinct target for every printed road space and none on planets", () => {
		expect(map.ROAD_NODES).toHaveLength(184)
		const centres = map.ROAD_NODES.map(map.nodePosition)
		for (let i = 0; i < centres.length; i++) {
			const [x, y] = centres[i]
			for (const planet of rf.PLANETS) expect(Math.hypot(x - planet.x, y - planet.y)).toBeGreaterThan(30)
			for (let j = 0; j < i; j++) expect(Math.hypot(x - centres[j][0], y - centres[j][1])).toBeGreaterThan(20)
			expect(map.ROAD_POLYGONS[map.ROAD_NODES[i]].length).toBeGreaterThanOrEqual(4)
		}
	})

	it("places highways on every road space, including junctions, and skips them only for the owner", () => {
		const state = rules.createInitialState({ playerNames: ["A", "B"], seed: 1, auction: false })
		state.gameflow.turnType = rf.TURN_ACTION
		state.gameflow.freeHighwaysLeft = 184
		state.players[0].cubes = 184
		for (const node of map.ROAD_NODES) expect(rules.placeHighway(state, 0, node, true).ok).toBe(true)
		expect(map.findPath(state, 0, "P0", "P3").cost).toBe(1)
		expect(map.findPath(state, 1, "P0", "P3").cost).toBe(18)
		expect(rules.placeHighway(state, 0, "S1:17", true).ok).toBe(false)
		expect(rules.placeHighway(state, 0, "P0", true).ok).toBe(false)
	})
})
