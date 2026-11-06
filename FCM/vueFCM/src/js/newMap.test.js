import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import * as map from "./FCMmap.js"
import * as model from "./FCMmodel.js"
import * as rf from "./FCMreference.js"
import * as rules from "./FCMrules.js"
import * as view from "./FCMview.js"
import { useModelStore } from "../stores/FCMstore.js"

// Decoded house numbers found in the 15 new-map tiles (29-43)
function decodedNewTileHouses() {
	const houses = new Set()
	for (let t = 29; t <= 43; t++) {
		for (const cell of rf.TILES[t]) {
			if (cell > rf.HOUSE && cell < rf.HOUSE_ENC_MAX) houses.add(cell - rf.HOUSE)
		}
	}
	return houses
}

// Tiles (not rotations) actually drawn by generateRandomMap, padding stripped
function drawnTiles(maxPlayers) {
	return map.generateRandomMap(maxPlayers).filter((_, i) => i % 2 === 0).filter((t) => t >= 0)
}

describe("New Map mod — static data", () => {
	it("registers SO_NEW_MAP=51 next to the other fan mods and exposes the lobby icon", () => {
		expect(rf.SO_NEW_MAP).toBe(51)
		expect(rf.SO_NEW_MAP).toBeGreaterThan(rf.SO_MEDIA_LINE)
		expect(view.getImage("so_newMap")).toContain("so_newMap.svg")
	})

	it("declares exactly the 15 new houses 20/23/24/26-37", () => {
		expect(rf.NEW_MAP_HOUSES).toEqual([20, 23, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37])
		// No overlap with the original board houses or the player-buildable card houses
		for (const n of rf.NEW_MAP_HOUSES) {
			expect(rf.BOARD_HOUSES).not.toContain(n)
			expect(rf.AVAILABLE_HOUSES).not.toContain(n)
		}
	})

	it("prints exactly the 15 declared houses on tiles 29-43 and nothing else", () => {
		const houses = decodedNewTileHouses()
		expect([...houses].sort((a, b) => a - b)).toEqual(rf.NEW_MAP_HOUSES)
	})

	it("gives every new tile 25 cells and only valid encodings", () => {
		for (let t = 29; t <= 43; t++) {
			expect(rf.TILES[t]).toHaveLength(25)
			for (const cell of rf.TILES[t]) {
				const isRoad = cell === rf.ROAD
				const isDrink = [rf.DRINK_BEER, rf.DRINK_COKE, rf.DRINK_LEMONADE].includes(cell)
				const isPark = cell === rf.PARK
				const isEmpty = cell === 0
				const isHouse = cell > rf.HOUSE && cell < rf.HOUSE_ENC_MAX
				expect(isRoad || isDrink || isPark || isEmpty || isHouse).toBe(true)
			}
		}
	})

	it("keeps the 5 drink pickups on tiles 39/40/41 (beer/lemonade/coke)", () => {
		const counts = (t) => {
			const c = { beer: 0, coke: 0, lemonade: 0 }
			for (const cell of rf.TILES[t]) {
				if (cell === rf.DRINK_BEER) c.beer++
				else if (cell === rf.DRINK_COKE) c.coke++
				else if (cell === rf.DRINK_LEMONADE) c.lemonade++
			}
			return c
		}
		expect(counts(39)).toEqual({ beer: 1, coke: 1, lemonade: 1 })
		expect(counts(40)).toEqual({ beer: 1, coke: 0, lemonade: 0 })
		expect(counts(41)).toEqual({ beer: 0, coke: 1, lemonade: 0 })
		// Tile 39 column order: beer (2,3), lemonade (3,3), coke (4,3)
		expect(rf.TILES[39][7]).toBe(rf.DRINK_BEER)
		expect(rf.TILES[39][12]).toBe(rf.DRINK_LEMONADE)
		expect(rf.TILES[39][17]).toBe(rf.DRINK_COKE)
		// Tile 41 coke sits at (2,5)
		expect(rf.TILES[41][9]).toBe(rf.DRINK_COKE)
	})

	it("extends HOUSE_SQS and the encoding upper bound to cover the new houses", () => {
		// Encoded houses NEW_MAP_HOUSES[n] + HOUSE (=30..47) must all be in HOUSE_SQS
		for (const n of rf.NEW_MAP_HOUSES) {
			expect(rf.HOUSE_SQS).toContain(n + rf.HOUSE)
		}
		// HOUSE_ENC_MAX must cover the highest new encoded house (37+10=47)
		expect(rf.HOUSE_ENC_MAX).toBe(rf.HOUSE + 38)
		expect(rf.HOUSE_ENC_MAX).toBeGreaterThan(37 + rf.HOUSE)
	})
})

describe("New Map mod — option parsing", () => {
	beforeEach(() => setActivePinia(createPinia()))

	it("defaults to off", () => {
		const store = useModelStore()
		expect(store.startingOptions.newMap).toBe(false)
	})

	it("isBoardHouse treats new houses as board houses only when the mod is on", () => {
		expect(rf.isBoardHouse(20, { newMap: false })).toBe(false)
		expect(rf.isBoardHouse(20, { newMap: true })).toBe(true)
		expect(rf.isBoardHouse(37, { newMap: true })).toBe(true)
		expect(rf.isBoardHouse(36, { newMap: true })).toBe(true)
		// Without options the new houses are not board houses
		expect(rf.isBoardHouse(26, undefined)).toBe(false)
		// Original board houses are always board houses
		expect(rf.isBoardHouse(2, { newMap: false })).toBe(true)
		expect(rf.isBoardHouse(22, { newMap: false })).toBe(true)
		// Buildable and unknown numbers never are
		expect(rf.isBoardHouse(1, { newMap: true })).toBe(false)
		expect(rf.isBoardHouse(99, { newMap: true })).toBe(false)
	})

	it("parses 51 as mix mode and 52 as priority mode (which implies 51)", () => {
		const store = useModelStore()
		expect(store.startingOptions.newMapAll).toBe(false)

		model.setInternalStartingOptions([rf.SO_NEW_MAP])
		expect(store.startingOptions.newMap).toBe(true)
		expect(store.startingOptions.newMapAll).toBe(false)

		const store2 = useModelStore()
		model.setInternalStartingOptions([rf.SO_NEW_MAP_ALL])
		expect(store2.startingOptions.newMap).toBe(true)
		expect(store2.startingOptions.newMapAll).toBe(true)
	})
})

describe("New Map mod — tile pool & map generation", () => {
	beforeEach(() => setActivePinia(createPinia()))

	it("keeps the base map identical when the mod is off", () => {
		const seen = new Set()
		for (let i = 0; i < 50; i++) {
			for (const t of drawnTiles(2)) seen.add(t)
		}
		for (let t = 29; t <= 43; t++) expect(seen.has(t)).toBe(false)
	})

	it("keeps new tiles out of normal games with New Districts and Lobbyists", () => {
		const store = useModelStore()
		store.startingOptions.newDistricts = true
		store.startingOptions.lobbyists = true

		expect(rules.availableLobbyistTiles().filter((t) => t >= 29 && t <= 43)).toHaveLength(0)
		expect(rules.availableUrbanPlanningTiles().filter((t) => t >= 29 && t <= 43)).toHaveLength(0)
		for (let i = 0; i < 30; i++) {
			expect(drawnTiles(4).filter((t) => t >= 29 && t <= 43)).toHaveLength(0)
		}
	})

	it("puts all 15 new tiles into the random pool when the mod is on", () => {
		const store = useModelStore()
		store.startingOptions.newMap = true
		const seen = new Set()
		for (let i = 0; i < 200; i++) {
			for (const t of drawnTiles(2)) seen.add(t)
		}
		for (let t = 29; t <= 43; t++) expect(seen.has(t)).toBe(true)
	})

	it("stacks with New Districts: 20 base + 5 newDistricts + 1 lobbyist park + 15 newMap = 41 pool tiles", () => {
		const store = useModelStore()
		store.startingOptions.newDistricts = true
		store.startingOptions.lobbyists = true
		store.startingOptions.newMap = true
		// Empty board -> availableLobbyistTiles returns the full districtTiles pool
		const pool = rules.availableLobbyistTiles()
		expect(pool).toHaveLength(41)
		expect(pool.filter((t) => t >= 29 && t <= 43)).toHaveLength(15)
	})

	it("priority mode draws every board tile from the 15 new tiles at 2-3 players", () => {
		const store = useModelStore()
		store.startingOptions.newMap = true
		store.startingOptions.newMapAll = true
		for (const players of [2, 3]) {
			for (let i = 0; i < 30; i++) {
				const tiles = drawnTiles(players)
				expect(tiles).toHaveLength(map.numTiles(players))
				for (const t of tiles) expect(t).toBeGreaterThanOrEqual(29)
			}
		}
	})

	it("priority mode backfills with base tiles only beyond the 15 new ones", () => {
		const store = useModelStore()
		store.startingOptions.newMap = true
		store.startingOptions.newMapAll = true
		for (const players of [4, 5, 6]) {
			for (let i = 0; i < 30; i++) {
				const tiles = drawnTiles(players)
				const fresh = tiles.filter((t) => t >= 29 && t <= 43)
				expect(fresh).toHaveLength(15)
				expect(tiles.filter((t) => t < 29)).toHaveLength(map.numTiles(players) - 15)
			}
		}
	})

	it("priority mode stacks with New Districts All: forced districts first, then new tiles fill the rest", () => {
		const store = useModelStore()
		store.startingOptions.newDistricts = true
		store.startingOptions.newDistrictsAll = true
		store.startingOptions.newMap = true
		store.startingOptions.newMapAll = true
		for (let i = 0; i < 30; i++) {
			const tiles = drawnTiles(2)
			expect(tiles).toHaveLength(9)
			// 5 forced district tiles are always on the board
			for (const d of [20, 21, 22, 23, 24]) expect(tiles).toContain(d)
			// The remaining 4 slots are drawn from the 15 new tiles
			const fresh = tiles.filter((t) => t >= 29 && t <= 43)
			expect(fresh).toHaveLength(4)
			// And no original base tile sneaks in
			expect(tiles.filter((t) => t >= 0 && t < 20)).toHaveLength(0)
		}
	})
})

describe("New Map mod — garden cap", () => {
	beforeEach(() => setActivePinia(createPinia()))

	it("caps gardens at 8 in the base game and 15 with the mod", () => {
		const store = useModelStore()
		expect(rules.availableGardens()).toBe(8)
		store.startingOptions.newMap = true
		expect(rules.availableGardens()).toBe(15)
		// Partially used stock still tracks against the raised cap
		store.gardens.push({ index: 1, house: 2 }, { index: 2, house: 4 })
		expect(rules.availableGardens()).toBe(13)
	})
})

describe("New Map mod — dinnertime ordering", () => {
	it("interleaves the new houses with the originals in ascending number order", () => {
		// FCMrules dinnertime sorts needs by `number` ascending (FCMrules.js:1878)
		const all = [...rf.BOARD_HOUSES, 25, ...rf.NEW_MAP_HOUSES]
		const sorted = [...all].sort((a, b) => a - b)
		expect(sorted).toEqual([
			2, 4, 5, 7, 8, 10, 12, 13, 15, 16, 18, 20, 21, 22, 23, 24, 25, 26,
			27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37,
		])
	})
})

describe("New Map mod — Rural Marketing Area coexistence", () => {
	beforeEach(() => setActivePinia(createPinia()))

	it("keeps RMA=26 without the mod and moves it to 99 with the mod", () => {
		const store = useModelStore()
		// Base game / old saves: RMA stays 26, settles after every real house (max 25)
		expect(rf.RURAL_MARKETING_AREA).toBe(26)
		expect(rf.ruralAreaNum(store.startingOptions)).toBe(26)

		// New Map games: RMA moves to 99 because the mod prints a real board house 26
		store.startingOptions.newMap = true
		expect(rf.ruralAreaNum(store.startingOptions)).toBe(rf.RURAL_MARKETING_AREA_NEW_MAP)
		expect(rf.ruralAreaNum(store.startingOptions)).toBe(99)
	})

	it("keeps the board house 26 and the RMA in separate needs entries when both mods are on", () => {
		const store = useModelStore()
		store.startingOptions.newMap = true
		store.startingOptions.ruralMarketers = true

		// The board house 26 exists as a real board house; on tile 30 it is
		// encoded as 26 + HOUSE = 36, never as literal 26
		expect(rf.NEW_MAP_HOUSES).toContain(26)
		expect(rf.isBoardHouse(26, store.startingOptions)).toBe(true)
		const tile30 = rf.TILES[30]
		expect(tile30).toContain(26 + rf.HOUSE)
		expect(tile30.filter((c) => c === 26)).toHaveLength(0)

		// Marketing the rural area and the board house 26 creates two distinct needs
		model.addNeedToHouse(rf.BURGER, rf.ruralAreaNum(store.startingOptions), 0)
		model.addNeedToHouse(rf.BURGER, 26, 0)
		expect(store.needs).toHaveLength(2)
		expect(store.needs.find((n) => n.number === rf.ruralAreaNum(store.startingOptions)).needs).toHaveLength(1)
		expect(store.needs.find((n) => n.number === 26).needs).toHaveLength(1)
	})

	it("settles the rural area after every new-map house when both mods are on", () => {
		const store = useModelStore()
		store.startingOptions.newMap = true
		store.startingOptions.ruralMarketers = true

		const numbers = [rf.STADIUM, ...rf.BOARD_HOUSES, 25, ...rf.NEW_MAP_HOUSES, rf.ruralAreaNum(store.startingOptions)]
		const sorted = [...numbers].sort((a, b) => a - b)
		expect(sorted[sorted.length - 1]).toBe(rf.ruralAreaNum(store.startingOptions))
		expect(sorted[sorted.length - 2]).toBe(37) // last real house is new-map house 37
	})
})
