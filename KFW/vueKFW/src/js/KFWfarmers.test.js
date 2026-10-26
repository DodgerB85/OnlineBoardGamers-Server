/**
 * Farmers rules tests:
 * 1. Field regions from tile sides, and the union of fields across grass edges
 *    (a road blocks it, boat tiles do not join other boat tiles).
 * 2. The purple marker: an animal of any type in any field, or a wheat tile.
 * 3. Breeding at season end, including the mixed-field rule (boat 5a).
 * 4. Spending wheat buys a move for resource moves too.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let rf, farmers, model, useModelStore

beforeAll(async () => {
	if (!globalThis.pako) (0, eval)(fs.readFileSync(path.join(__dirname, "..", "pakoLib.js"), "utf8"))
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.initData = globalThis.window.initData || {}
	rf = await import("./KFWreference.js")
	farmers = await import("./KFWfarmers.js")
	model = await import("./KFWmodel.js")
	;({ useModelStore } = await import("../stores/KFWstore.js"))
	ALL_GRASS = [rf.GRASS, rf.GRASS, rf.GRASS, rf.GRASS, rf.GRASS, rf.GRASS]
	BOAT_SIDES = [rf.WATER, rf.GRASS, rf.GRASS, rf.WATER, rf.GRASS, rf.GRASS]
})

let ALL_GRASS, BOAT_SIDES

let nextTileId = 1
// Fake tileIDs outside every known constant: doesPlayerHaveTileID never matches them.
function makeTile(tileID, coord, sides, extra = {}) {
	return {
		id: nextTileId++,
		tileID,
		upgraded: 0,
		coord,
		sides,
		resources: [0, 0, 0, 0],
		victoryPoints: [0, 0],
		animals: [],
		season: rf.SPRING,
		action: [],
		...extra,
	}
}

function makePlayer(tiles, extra = {}) {
	return {
		name: "P0",
		displayName: "P0",
		colour: 0,
		villageTiles: tiles,
		pendingVillageTiles: [],
		hiddenContracts: [],
		hiddenMeeples: [0, 0, 0, 0],
		hiddenSkillTiles: [0, 0, 0],
		hasPurpleMeeple: false,
		wheat: 0,
		...extra,
	}
}

function setupStore(player) {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.useFarmersExpansion = true
	store.players.splice(0, store.players.length, player)
	store.gameflow.season = rf.SPRING
	store.gameflow.turnOrder.splice(0)
	store.gameflow.turnOrder.push(0)
	return store
}

// Two tiles sharing the edge between side 1 of the first and side 4 of the second.
function adjacentPair(firstTileID, secondTileID, secondSides = ALL_GRASS, firstSides = ALL_GRASS) {
	const first = makeTile(firstTileID, [0, 0, 0], firstSides)
	const second = makeTile(secondTileID, [-1, 1, 0], secondSides)
	return { first, second, tiles: [first, second] }
}

describe("field regions", () => {
	it("a tile with no roads has one field covering all edges", () => {
		const regions = farmers.getTileFieldRegions({ sides: ALL_GRASS })
		expect(regions).toHaveLength(1)
		expect(regions[0].edges).toEqual([0, 1, 2, 3, 4, 5])
	})

	it("a single road is a dead end and does not split the tile", () => {
		const sides = [...ALL_GRASS]
		sides[2] = rf.ROAD
		expect(farmers.getTileFieldRegions({ sides })).toHaveLength(1)
	})

	it("two roads split the tile into two fields", () => {
		const sides = [...ALL_GRASS]
		sides[1] = rf.ROAD
		sides[4] = rf.ROAD
		const regions = farmers.getTileFieldRegions({ sides })
		expect(regions).toHaveLength(2)
		expect(regions[0].edges).toEqual([2, 3])
		expect(regions[1].edges).toEqual([5, 0])
	})
})

describe("field union across tiles", () => {
	it("grass edges join the fields of two tiles into one field", () => {
		const { tiles } = adjacentPair([9001, 9002], [9003, 9004])
		setupStore(makePlayer(tiles))
		const fields = farmers.getPlayerFields(0)
		expect(fields).toHaveLength(1)
		expect(fields[0].tileIds).toHaveLength(2)
	})

	it("a road facing the shared edge keeps the two fields apart", () => {
		const blocked = [...ALL_GRASS]
		blocked[4] = rf.ROAD
		const { tiles } = adjacentPair([9001, 9002], [9003, 9004], blocked)
		setupStore(makePlayer(tiles))
		expect(farmers.getPlayerFields(0)).toHaveLength(2)
	})

	it("a boat still joins a normal tile's field", () => {
		const { tiles } = adjacentPair([rf.TILE_F_SUMMER_BOAT5_A, rf.TILE_F_SUMMER_BOAT5_B], [9003, 9004], ALL_GRASS, BOAT_SIDES)
		setupStore(makePlayer(tiles))
		const shared = farmers.getPlayerFields(0).filter((field) => field.tileIds.length > 1)
		expect(shared).toHaveLength(1)
	})

	// Rules: the corners of fields on boat tiles do not connect to adjacent boat tiles.
	it("two adjacent boat tiles keep separate fields", () => {
		const boatTiles = [
			[rf.TILE_BOAT_KEYFLOWER_A, rf.TILE_BOAT_KEYFLOWER_B],
			[rf.TILE_F_SUMMER_BOAT5_A, rf.TILE_F_SUMMER_BOAT5_B],
		]
		for (const tileID of boatTiles) {
			const { tiles } = adjacentPair(tileID, tileID, BOAT_SIDES, BOAT_SIDES)
			setupStore(makePlayer(tiles))
			expect(farmers.getPlayerFields(0).filter((field) => field.tileIds.length > 1), `boat ${tileID[0]}`).toHaveLength(0)
		}
	})
})

describe("canPlaceAnimalInField", () => {
	it("rejects a field holding another animal type unless boat 5a allows mixing", () => {
		const mixed = { animals: [2, 1, 0] }
		expect(farmers.canPlaceAnimalInField(mixed, rf.ANIMAL_COW, false)).toBe(false)
		expect(farmers.canPlaceAnimalInField(mixed, rf.ANIMAL_COW, true)).toBe(true)
		expect(farmers.canPlaceAnimalInField(mixed, rf.ANIMAL_SHEEP, false)).toBe(false)
		expect(farmers.canPlaceAnimalInField({ animals: [2, 0, 0] }, rf.ANIMAL_SHEEP, false)).toBe(true)
		expect(farmers.canPlaceAnimalInField({ animals: [0, 0, 0] }, rf.ANIMAL_PIG, false)).toBe(true)
	})
})

describe("purple marker scoring", () => {
	it("may be declared as any animal type, including in a mixed field", () => {
		const tile = makeTile([9001, 9002], [0, 0, 0], ALL_GRASS, { animals: [[1, 1, 0]] })
		setupStore(makePlayer([tile], { hasPurpleMeeple: true }))
		const score = model.calculateAnimalFieldScore(0)
		expect(score.purpleScore).toBe(3) // a cow completes the mixed field
		expect(score.total).toBe(1 + 2 + 3)
	})

	it("scores nothing extra once it is declared as wheat", () => {
		const tile = makeTile([9001, 9002], [0, 0, 0], ALL_GRASS, { animals: [[0, 0, 1]] })
		setupStore(makePlayer([tile], { hasPurpleMeeple: true }))
		expect(model.calculateAnimalFieldScore(0).purpleScore).toBe(2)
		store().players[0].purpleDeclaredWheat = true
		expect(model.calculateAnimalFieldScore(0).purpleScore).toBe(0)
	})

	it("scores nothing without the marker", () => {
		const tile = makeTile([9001, 9002], [0, 0, 0], ALL_GRASS, { animals: [[0, 0, 1]] })
		setupStore(makePlayer([tile]))
		expect(model.calculateAnimalFieldScore(0).purpleScore).toBe(0)
	})
})

describe("purple marker declared as wheat", () => {
	// villageTiles[0] must be the home tile, and each tile sits in its own field.
	function scoringFixture({ wheat, resources = [0, 0, 0, 0], skills = [0, 0, 0] }) {
		const home = makeTile([9100, 9101], [0, 0, 0], ALL_GRASS, { resources })
		const field = makeTile([9102, 9103], [2, 0, -2], ALL_GRASS, { animals: [[0, 0, 1]] })
		const granary = makeTile([rf.TILE_F_WINTER_GRANARY_A, rf.TILE_WINTER_BACK], [4, 0, -4], ALL_GRASS)
		const player = makePlayer([home, field, granary], { hasPurpleMeeple: true, wheat, hiddenSkillTiles: skills })
		return { player, granary }
	}

	it("is taken when the extra wheat beats the animal it would score", () => {
		// 1 wheat adds 3VP on the granary and completes a bakery set (+4VP); as an animal
		// the marker is worth at most a cow's 3VP.
		const { player, granary } = scoringFixture({ wheat: 1, resources: [1, 0, 1, 0], skills: [1, 1, 0] })
		setupStore(player)
		model.scoreAutoProcessingTilesAndMoveResources(0)
		expect(store().players[0].purpleDeclaredWheat).toBe(true)
		expect(granary.victoryPoints[0]).toBe(3)
	})

	it("is left as an animal when the animal scores more", () => {
		// A truffle orchard makes a pig worth 5VP, more than the 3VP of a second wheat.
		const { player, granary } = scoringFixture({ wheat: 1 })
		player.villageTiles.push(makeTile([rf.TILE_F_WINTER_TRUFFLE_ORCHARD_A, rf.TILE_WINTER_BACK], [6, 0, -6], ALL_GRASS))
		player.villageTiles.push(makeTile([9104, 9105], [8, 0, -8], ALL_GRASS))
		setupStore(player)
		model.scoreAutoProcessingTilesAndMoveResources(0)
		expect(store().players[0].purpleDeclaredWheat).toBe(false)
		expect(granary.victoryPoints[0]).toBe(0)
	})
})

describe("breeding", () => {
	it("adds an animal to each field with two of a type", () => {
		const tile = makeTile([9001, 9002], [0, 0, 0], ALL_GRASS, { animals: [[2, 0, 0]] })
		const store = setupStore(makePlayer([tile]))
		model.breedAnimals()
		expect(tile.animals[0]).toEqual([3, 0, 0])
		expect(store.availableAnimals[rf.ANIMAL_SHEEP]).toBe(31)
	})

	it("does not breed a mixed field without boat 5a", () => {
		const tile = makeTile([9001, 9002], [0, 0, 0], ALL_GRASS, { animals: [[0, 2, 1]] })
		setupStore(makePlayer([tile]))
		model.breedAnimals()
		expect(tile.animals[0]).toEqual([0, 2, 1])
	})

	it("breeds a mixed field with boat 5a", () => {
		const boat = makeTile([rf.TILE_F_SUMMER_BOAT5_A, rf.TILE_F_SUMMER_BOAT5_B], [10, 0, -10], BOAT_SIDES)
		const tile = makeTile([9001, 9002], [0, 0, 0], ALL_GRASS, { animals: [[0, 2, 1]] })
		const store = setupStore(makePlayer([tile, boat]))
		model.breedAnimals()
		expect(tile.animals[0]).toEqual([0, 3, 1])
		expect(store.availableAnimals[rf.ANIMAL_PIG]).toBe(23)
	})

	it("does not breed in winter", () => {
		const tile = makeTile([9001, 9002], [0, 0, 0], ALL_GRASS, { animals: [[2, 0, 0]] })
		const store = setupStore(makePlayer([tile]))
		store.gameflow.season = rf.WINTER
		model.breedAnimals()
		expect(tile.animals[0]).toEqual([2, 0, 0])
	})
})

describe("spendWheatForMove", () => {
	it("buys a move during a resource move", () => {
		const store = setupStore(makePlayer([], { wheat: 1 }))
		store.context.action = rf.ACT_MOVE_RES
		store.context.remainingMoves = 0
		model.spendWheatForMove()
		expect(store.players[0].wheat).toBe(0)
		expect(store.availableWheat).toBe(31)
		expect(store.context.remainingMoves).toBe(1)
	})

	it("does nothing outside a move action or without the expansion", () => {
		const store = setupStore(makePlayer([], { wheat: 2 }))
		store.context.action = rf.ACT_NONE
		store.context.remainingMoves = 0
		model.spendWheatForMove()
		expect(store.players[0].wheat).toBe(2)
		expect(store.context.remainingMoves).toBe(0)
	})
})

// setupStore replaces the active pinia, so re-fetch the store when a test needs it again.
function store() {
	return useModelStore()
}

beforeEach(() => {
	nextTileId = 1
})
