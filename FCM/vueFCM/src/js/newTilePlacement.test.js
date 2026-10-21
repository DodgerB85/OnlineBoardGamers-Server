/**
 * Lobbyist milestone "add a tile to the map": givePossibilitiesForNewTile must
 * only offer squares that really touch the board. Neighbour lookups used to run
 * off the end of coords (undefined != OFF_BOARD) and the 5x5 collision check
 * used to read past the end of the array (undefined = free), so every square on
 * the grid's outer rows became a fake hotspot ~1200px below/above the map.
 */
import { describe, it, expect, beforeAll } from "vitest"
import { createPinia, setActivePinia } from "pinia"

describe("givePossibilitiesForNewTile", () => {
	let rf, rules, mapMod, useModelStore

	beforeAll(async () => {
		globalThis.alert = () => {}
		globalThis.window = globalThis.window || {}
		globalThis.window.performance = performance
		rf = await import("./FCMreference.js")
		rules = await import("./FCMrules.js")
		mapMod = await import("./FCMmap.js")
		;({ useModelStore } = await import("../stores/FCMstore.js"))
	})

	// 6-player board: 6x4 natural map padded into the fixed 17x16 tile grid
	function setupBoard() {
		setActivePinia(createPinia())
		const store = useModelStore()
		const compact = []
		for (let i = 0; i < 24; i++) compact.push(0, 0)
		store.mapData.tiles = mapMod.expandMapToFullGrid(compact, 6)
		mapMod.initCoords()
		return store
	}

	it("offers only spots next to the board", () => {
		const store = setupBoard()
		const spots = rules.givePossibilitiesForNewTile()
		expect(spots.length).toBeGreaterThan(0)

		for (const idx of spots) {
			// never on the grid's outer small-square rows
			expect(idx).toBeGreaterThanOrEqual(rf.ssW)
			expect(idx).toBeLessThan(rf.ssW * (rf.ssH - 1))
			// the square must have a real in-grid neighbour that is part of the board
			const neighbours = [idx - 1, idx + 1, idx - rf.ssW, idx + rf.ssW].filter((j) => j >= 0 && j < rf.ssW * rf.ssH)
			expect(neighbours.some((j) => store.mapData.coords[j] !== rf.OFF_BOARD)).toBe(true)
		}
	})
})
