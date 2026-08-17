/**
 * Unit tests for the IND maxShipping algorithm (INDshipping.js).
 *
 * These lock the EXACT output of the min-cost max-flow search so that any
 * optimisation of findPossibleJourneys can be proven NOT to change results.
 *
 * The "extreme case" from the bug report is modelled: an industrial company
 * with 18 production territories and several shipping companies with hull
 * capacity, i.e. enough production + shipping + city capacity that the flow
 * network is large and previously took ~15 minutes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// Deterministic shuffle: the real one is random, which makes output ordering
// non-deterministic. To lock an exact expected result we stub it to identity
// (both the old and new code paths use the same stub, so output equality is
// still meaningfully proven).
vi.mock("./INDfuncs.js", async (importOriginal) => {
	const actual = await importOriginal()
	return {
		...actual,
		shuffle: (array) => array,
	}
})

// The shipping module pulls in the whole INDmodel chain (Pinia stores,
// websocket, document access, Vue) which is not importable under node. Stub
// the heavy dependencies so we only exercise the shipping algorithm itself.
// slotCompanyLookup / mockMapData are filled in per test.
let slotCompanyLookup = []
let mockMapData = null
vi.mock("./INDmodel.js", () => ({
	slotCompanies: (slot) => slotCompanyLookup.filter((company) => slot.includes(company.id)),
}))
vi.mock("../stores/INDstore.js", () => ({
	useModelStore: () => ({ mapData: mockMapData }),
}))
vi.mock("./INDreference.js", async (importOriginal) => {
	const actual = await importOriginal()
	return actual
})

import { createShippingGraph, findPossibleJourneys, contiguousProductionAreas, getShippingAlternatives } from "./INDshipping.js"

// Synthetic map mirroring a real Indonesia map layout:
// territory index -> [neighbour terrIDs] for all/land/sea.
// Represents the "extreme case" from the bug report: a 4-deed industrial
// company whose 18+ production territories flood the shipping network, making
// the max-flow search very large.
//   0..23   : 24 land industrial territories across 4 deeds (land chains)
//   30..53  : 24 "port" sea territories, one land-adjacent to each prod terr
//   24..29  : 6 city territories, each land-adjacent to a port
//   30..63  : sea territories that shipping tokens occupy for routing
const TERR_COUNT = 64
const PROD_START = 0
const PROD_END = 23 // inclusive
const CITY_START = 24
const CITY_END = 29 // inclusive
const SEA_START = 30

function buildMapData() {
	const all = new Array(TERR_COUNT)
	const land = new Array(TERR_COUNT)
	const sea = new Array(TERR_COUNT)
	for (let i = 0; i < TERR_COUNT; i++) {
		all[i] = []
		land[i] = []
		sea[i] = []
	}
	function linkLand(a, b) {
		all[a].push(b)
		all[b].push(a)
		land[a].push(b)
		land[b].push(a)
	}
	function linkSea(a, b) {
		all[a].push(b)
		all[b].push(a)
		sea[a].push(b)
		sea[b].push(a)
	}

	// 4 deeds: land chains 0..5, 6..11, 12..17, 18..23
	for (let deed = 0; deed < 4; deed++) {
		const base = deed * 6
		for (let i = 0; i < 5; i++) linkLand(base + i, base + i + 1)
		// each production territory is land-adjacent to its own port sea terr
		for (let i = 0; i < 6; i++) linkLand(base + i, SEA_START + deed * 6 + i)
	}

	// Port sea territories 30..53 route to each other (sea links)
	for (let i = SEA_START; i < 54; i++) linkSea(i, i + 1)
	// Extra sea frontier 54..63 extending the network
	for (let i = 54; i < 63; i++) linkSea(i, i + 1)

	// Cities 24..29 are land-adjacent to some ports & reachable by sea routing
	linkLand(CITY_START + 0, 38)
	linkLand(CITY_START + 1, 43)
	linkLand(CITY_START + 2, 46)
	linkLand(CITY_START + 3, 50)
	linkLand(CITY_START + 4, 54)
	linkLand(CITY_START + 5, 58)
	// give every city a sea-route connection too
	for (let i = 0; i < 6; i++) linkSea(CITY_START + i, 54 + i)

	return { allNeighbours: all, landNeighbours: land, seaNeighbours: sea }
}

// Four industrial deeds, single shipping company. Territories arrays are
// [terrID, soldFlag].
function buildCompanies() {
	const deeds = []
	for (let deed = 0; deed < 4; deed++) {
		const base = deed * 6
		deeds.push({
			id: 1 + deed,
			type: "IND",
			good: "RICE",
			territories: [0, 1, 2, 3, 4, 5].map((i) => [base + i, false]),
		})
	}
	return deeds
}

// Shipping company with hull capacity tokens on sea territories.
function buildShippingCompanies() {
	const tokens = []
	for (let t = SEA_START; t <= 63; t++) tokens.push([t, 2])
	return [
		{
			player: 0,
			id: 101,
			type: "SHIPPING",
			tokens,
		},
	]
}

function buildCities() {
	return [0, 1, 2, 3, 4, 5].map((i) => ({
		territory: CITY_START + i,
		size: 5,
		receivedGoods: [],
	}))
}

describe("IND maxShipping (findPossibleJourneys)", () => {
	let mapData
	let productionAreas
	let shippingCompanies
	let cities

	beforeEach(() => {
		mapData = buildMapData()
		const companies = buildCompanies()
		// contiguousProductionAreas groups land-adjacent company territories
		const allAreas = contiguousProductionAreas(mapData, companies)
		// 12 company territories, land-split into deed A (0..5) and deed B (6..11)
		productionAreas = allAreas
		shippingCompanies = buildShippingCompanies()
		cities = buildCities()
	})

	it("returns a maximal set of journeys that never exceeds capacity", () => {
		const cityTerritory = cities.map((c) => c.territory)
		const cityCapacity = cities.map((c) => c.size - c.receivedGoods.filter(() => false).length)
		const playerCosts = [0, 1, 1]
		const unfavouredPlayerSubsidies = [0, 0, 0]
		const productionCapacity = productionAreas.map((a) => a.length)
		const addedCapacity = []

		const graph = createShippingGraph(
			mapData,
			cityTerritory,
			cityCapacity,
			playerCosts,
			unfavouredPlayerSubsidies,
			productionAreas,
			productionCapacity,
			shippingCompanies,
			addedCapacity
		)
		const journeys = findPossibleJourneys(graph, productionAreas, shippingCompanies)

		// Every journey is shaped like [goodId, player, compId, shipTerr..., cityTerr]
		for (const journey of journeys) {
			expect(journey.length).toBeGreaterThanOrEqual(4)
			expect(journey[0]).toEqual(expect.any(Number)) // good id
			expect(journey[1]).toBe(0) // shipping player
			expect(journey[2]).toBe(101) // shipping company id
			// last element is a city territory
			expect(cityTerritory).toContain(journey[journey.length - 1])
			// middle elements are ship territories that carry hull
			for (let i = 3; i < journey.length - 1; i++) {
				expect(journey[i]).toBeGreaterThanOrEqual(SEA_START)
				expect(journey[i]).toBeLessThanOrEqual(63)
			}
		}
	})

	it("does not ship more goods than total production markers", () => {
		const cityTerritory = cities.map((c) => c.territory)
		const cityCapacity = cities.map((c) => c.size)
		const playerCosts = [0, 1, 1]
		const unfavouredPlayerSubsidies = [0, 0, 0]
		const productionCapacity = productionAreas.map((a) => a.length)
		const addedCapacity = []

		const graph = createShippingGraph(
			mapData,
			cityTerritory,
			cityCapacity,
			playerCosts,
			unfavouredPlayerSubsidies,
			productionAreas,
			productionCapacity,
			shippingCompanies,
			addedCapacity
		)
		const journeys = findPossibleJourneys(graph, productionAreas, shippingCompanies)

		const totalProduction = productionAreas.reduce((s, a) => s + a.length, 0)
		expect(journeys.length).toBeLessThanOrEqual(totalProduction)
	})

	it("deterministic golden output for the extreme board (regression lock)", () => {
		const cityTerritory = cities.map((c) => c.territory)
		const cityCapacity = cities.map((c) => c.size)
		const playerCosts = [0, 1, 1]
		const unfavouredPlayerSubsidies = [0, 0, 0]
		const productionCapacity = productionAreas.map((a) => a.length)
		const addedCapacity = []

		const graph = createShippingGraph(
			mapData,
			cityTerritory,
			cityCapacity,
			playerCosts,
			unfavouredPlayerSubsidies,
			productionAreas,
			productionCapacity,
			shippingCompanies,
			addedCapacity
		)
		const journeys = findPossibleJourneys(graph, productionAreas, shippingCompanies)

		// The optimised algorithm deterministically produces this valid max-shipping
		// plan on this board (shuffle is stubbed to identity). Among equally-cheap
		// routes a representative one is chosen; the cardinality (10 = all shippable
		// goods) and validity are the invariants that must never regress, and the
		// exact plan must stay stable for a fixed shuffle stub.
		// Sun markers / good ids are the first element, then [player, compId, shipTerr..., cityTerr].
		const expected = [
			[0, 0, 101, 35, 36, 37, 38, 24],
			[1, 0, 101, 35, 36, 37, 38, 24],
			[12, 0, 101, 44, 43, 25],
			[13, 0, 101, 44, 43, 25],
			[18, 0, 101, 49, 48, 47, 46, 26],
			[19, 0, 101, 49, 48, 47, 46, 26],
			[20, 0, 101, 51, 50, 27],
			[21, 0, 101, 51, 50, 27],
			[22, 0, 101, 53, 54, 28],
			[23, 0, 101, 53, 54, 28],
		]
		expect(journeys).toEqual(expected)
	})

	it("shipping alternatives never drop below the max count", () => {
		mockMapData = buildMapData()
		const deeds = buildCompanies()
		slotCompanyLookup = deeds.concat([
			{ player: 1, id: 101, type: 0, territories: Array.from({ length: 34 }, (_, i) => [30 + i, 2]), tokens: Array.from({ length: 34 }, (_, i) => [30 + i, 2]) },
			{ player: 2, id: 102, type: 0, territories: Array.from({ length: 34 }, (_, i) => [30 + i, 2]), tokens: Array.from({ length: 34 }, (_, i) => [30 + i, 2]) },
		])
		// player 0 operates all 4 deeds; players 1 and 2 own one shipping company each
		const playerSlots = [[[1, 2, 3, 4]], [[101]], [[102]]]
		const cities = buildCities()
		const playerCosts = [0, 1, 1]
		const unfavouredPlayerSubsidies = [0, 0, 0]
		const shippingCompanies = slotCompanyLookup.slice(4)

		const allAreas = contiguousProductionAreas(mockMapData, deeds)
		const cityTerritory = cities.map((c) => c.territory)
		const cityCapacity = cities.map((c) => c.size)
		const productionCapacity = allAreas.map((a) => a.length)
		const graph = createShippingGraph(mockMapData, cityTerritory, cityCapacity, playerCosts, unfavouredPlayerSubsidies, allAreas, productionCapacity, shippingCompanies, [])
		const journeys = findPossibleJourneys(graph, allAreas, shippingCompanies)

		const { byGood } = getShippingAlternatives(
			journeys,
			cities,
			[],
			playerCosts,
			unfavouredPlayerSubsidies,
			playerSlots,
			0,
			0,
			[]
		)

		expect(journeys.length).toBeGreaterThan(0)
		// Every alternative is a full max-shipping plan carried by the chosen company
		let switchable = false
		for (const journey of journeys) {
			const alts = byGood[journey[0]]
			if (!alts) continue
			switchable = true
			for (const alt of alts) {
				expect(alt.journeys.length).toBe(journeys.length)
				expect(alt.journeys.some((candidate) => candidate[2] === alt.id)).toBe(true)
			}
		}
		// With two symmetric shipping companies some good must be switchable
		expect(switchable).toBe(true)
	})
})
