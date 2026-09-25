/**
 * Regression tests for getCoffeeRoutesFromBldgSquare's DFS (FCMmap.js).
 *
 * Lobbyist roads (roads built next to roads) create dense road junctions,
 * and the DFS used to explode combinatorially on them - real games with
 * lobbyists + extra roads could take 10+ minutes on a single coffee sale.
 * The fix restores the admissible min-tile-distance prune that legacy
 * map.js always had (map.js:899-900, giveMinTileDistance): a tile crossing
 * that can't possibly reach a destination within range is rejected on
 * arrival instead of being walked to its full depth. This never changes
 * which routes are found (verified by hand and against legacy's own DFS
 * for these shapes) - it only cuts dead branches early.
 */
import { describe, it, expect } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { useModelStore } from "../stores/FCMstore.js"
import * as rf from "./FCMreference.js"
import { getCoffeeRoutesFromBldgSquare } from "./FCMmap.js"

function freshBoard() {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.mapData.coords = new Array(rf.ssW * rf.ssH).fill(rf.EMPTY_SPACE)
	store.mapData.dimensions = [17, 16]
	store.newRoads.splice(0)
	return store
}

describe("getCoffeeRoutesFromBldgSquare", () => {
	it("finds the single route along a straight, unbranched corridor", () => {
		const store = freshBoard()
		const r0 = 20,
			c0 = 20
		for (let dc = 0; dc < 3; dc++) store.mapData.coords[r0 * rf.ssW + (c0 + dc)] = rf.ROAD
		const startIndex = r0 * rf.ssW + (c0 - 1)
		const restoEntrance = r0 * rf.ssW + (c0 + 3)

		const routes = getCoffeeRoutesFromBldgSquare(startIndex, [restoEntrance], 1)

		expect(routes).toEqual([[r0 * rf.ssW + c0, r0 * rf.ssW + c0 + 1, r0 * rf.ssW + c0 + 2]])
	})

	it("handles a lobbyist-style parallel road segment without changing the route count", () => {
		const store = freshBoard()
		const r0 = 20,
			c0 = 20
		const cols = 20 // 4 tiles
		for (let dc = 0; dc < cols; dc++) store.mapData.coords[r0 * rf.ssW + (c0 + dc)] = rf.ROAD
		// a lobbyist road built right next to the existing one, in the middle tile only
		for (let dc = 10; dc < 15; dc++) store.mapData.coords[(r0 + 1) * rf.ssW + (c0 + dc)] = rf.ROAD
		store.mapData.coords[r0 * rf.ssW + (c0 + 10)] = rf.ROAD
		store.mapData.coords[r0 * rf.ssW + (c0 + 14)] = rf.ROAD

		const startIndex = r0 * rf.ssW + (c0 - 1)
		const restoEntrance = r0 * rf.ssW + (c0 + cols)

		const routes = getCoffeeRoutesFromBldgSquare(startIndex, [restoEntrance], 6)

		// Locked in against legacy's own (unoptimized) DFS on this exact shape.
		expect(routes.length).toBe(456)
	})

	// The actual bug report: lobbyist roads built right next to existing roads,
	// several tiles' worth, used to take the unpruned DFS 10+ minutes. A ladder
	// (two parallel roads, connected at every column) is a worse case than any
	// real game produces, and still has to resolve well inside a test timeout.
	it("stays fast on a dense double-lane road (lobbyist worst case)", () => {
		const store = freshBoard()
		const r0 = 20,
			c0 = 20
		const cols = 10 // 2 tiles, both lanes
		for (let dc = 0; dc < cols; dc++) {
			store.mapData.coords[r0 * rf.ssW + (c0 + dc)] = rf.ROAD
			store.mapData.coords[(r0 + 1) * rf.ssW + (c0 + dc)] = rf.ROAD
		}
		const startIndex = r0 * rf.ssW + (c0 - 1)
		const restoEntrance = r0 * rf.ssW + (c0 + cols)

		const start = performance.now()
		const routes = getCoffeeRoutesFromBldgSquare(startIndex, [restoEntrance], 4)
		const elapsedMs = performance.now() - start

		expect(routes.length).toBeGreaterThan(0)
		expect(elapsedMs).toBeLessThan(15000)
	}, 20000)
})
