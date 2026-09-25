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
import { giveTileNumber, giveStartingIndexForTile, onTheSameTile } from "./FCMmap.js"

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
