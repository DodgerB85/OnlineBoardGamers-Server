/**
 * Regression test for giveTileNumber / giveStartingIndexForTile (FCMmap.js).
 *
 * giveTileNumber used to pack (x,y) as y*85+x (the SQUARE-grid width)
 * instead of y*17+x (the actual tile-grid width, matching legacy's
 * giveTileNumber, map.js:1345). Every caller only ever used the result as an
 * opaque equality/Set key, and giveStartingIndexForTile (its inverse)
 * decoded with the same wrong base, so the bug was inert - but it meant
 * vueFCM's tile ids never matched legacy's canonical numbering, a landmine
 * for any future distance math or cross-referencing. Fixed to use the
 * tile-grid width; values below are legacy's own giveTileNumber output for
 * the same indices.
 */
import { describe, it, expect } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { giveTileNumber, giveStartingIndexForTile, onTheSameTile, giveAdjacentTiles, giveTileAtPosition } from "./FCMmap.js"
import { useModelStore } from "../stores/FCMstore.js"

describe("giveTileNumber", () => {
	it("matches legacy's canonical numbering (y * 17 + x)", () => {
		setActivePinia(createPinia())
		const cases = [
			[0, 0],
			[4, 0],
			[5, 1],
			[84, 16],
			[85, 0],
			[425, 17],
			[3695, 144],
			[6799, 271],
		]
		for (const [index, expected] of cases) {
			expect(giveTileNumber(index)).toBe(expected)
		}
	})

	it("round-trips through giveStartingIndexForTile onto the same tile", () => {
		setActivePinia(createPinia())
		for (const index of [0, 4, 5, 84, 85, 425, 3695, 6799]) {
			const tile = giveTileNumber(index)
			const start = giveStartingIndexForTile(tile)
			expect(giveTileNumber(start)).toBe(tile)
			expect(onTheSameTile(index, start)).toBe(true)
		}
	})

	it("onTheSameTile still distinguishes adjacent tiles correctly", () => {
		setActivePinia(createPinia())
		// Same tile (5x5 block starting at 0)
		expect(onTheSameTile(0, 4)).toBe(true)
		// Next tile over (block starting at 5)
		expect(onTheSameTile(0, 5)).toBe(false)
	})
})

describe("giveAdjacentTiles", () => {
	// Full 17x16 tile board where every tile exists (mapData.tiles is
	// 2 entries per tile, even entry -1 means the tile is absent).
	function fullBoard() {
		setActivePinia(createPinia())
		const store = useModelStore()
		store.mapData.dimensions = [17, 16]
		store.mapData.tiles = new Array(17 * 16 * 2).fill(0)
		return store
	}

	it("returns the 8 surrounding tiles of an interior tile", () => {
		fullBoard()
		// tile id 60 = y*17+x with x=9, y=3
		expect([...giveAdjacentTiles(60, true)].sort((a, b) => a - b)).toEqual([
			42, 43, 44, 59, 61, 76, 77, 78,
		])
	})

	it("never steps past the board edge", () => {
		fullBoard()
		expect([...giveAdjacentTiles(0, true)].sort((a, b) => a - b)).toEqual([1, 17, 18])
	})

	it("skips tiles that are not on the board", () => {
		const store = fullBoard()
		store.mapData.tiles[43 * 2] = -1 // remove the up neighbour of tile 60
		expect([...giveAdjacentTiles(60, true)].sort((a, b) => a - b)).toEqual([42, 44, 59, 61, 76, 77, 78])
	})
})

describe("giveTileAtPosition", () => {
	// Zeppelin drink collection (gatherFromTiles) passes a tile id from
	// giveTileNumber. It must read that exact slot, not decode the id as
	// if it were still base-85.
	it("reads the slot for the tile id, not a base-85 decode", () => {
		setActivePinia(createPinia())
		const store = useModelStore()
		store.mapData.dimensions = [17, 16]
		store.mapData.tiles = new Array(17 * 16 * 2).fill(-1)
		store.mapData.tiles[125 * 2] = 77 // a tile holding drinks
		expect(giveTileAtPosition(125)).toBe(77)
		// spot-check a few more ids land where a square index would map
		for (const sq of [2585, 3695, 3518]) {
			const tile = giveTileNumber(sq)
			store.mapData.tiles[tile * 2] = sq
			expect(giveTileAtPosition(tile)).toBe(sq)
		}
	})
})
