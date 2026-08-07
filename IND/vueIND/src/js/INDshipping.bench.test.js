/**
 * Benchmark for the IND maxShipping algorithm on a large, dense network
 * approximating the extreme case from the bug report: a 4-deed company with
 * 18+ production territories and several shipping fleets, so the flow network
 * is large and paths are long (many sea hops). Reports wall-clock time for one
 * full max-shipping solve. Demonstrates the impact of the findPossibleJourneys
 * optimisations (O(1) visited membership + O(1) queue) vs the original
 * (visitedNodes.includes O(depth) + nodeList.shift O(n)).
 *
 * Run:  IND_BENCH=1 npx vitest run src/js/INDshipping.bench.test.js
 */
import { describe, it, expect, vi } from "vitest"
import { createShippingGraph, findPossibleJourneys, contiguousProductionAreas } from "./INDshipping.js"

vi.mock("./INDfuncs.js", async (importOriginal) => {
	const actual = await importOriginal()
	return { ...actual, shuffle: (array) => array }
})
vi.mock("./INDmodel.js", () => ({ slotCompanies: () => [] }))
vi.mock("../stores/INDstore.js", () => ({ useModelStore: () => ({ mapData: null }) }))
vi.mock("./INDreference.js", async (importOriginal) => {
	const actual = await importOriginal()
	return actual
})

// Deeds land chains; every production territory has a dedicated port; ports
// form a multi-row dense sea grid so shipping paths are long and have many
// alternatives. Cities land-adjacent to a spread of ports.
function buildMapData(prodTerrs, cityCount, seaCols) {
	const seaRows = Math.ceil(prodTerrs / seaCols) + cityCount
	const seaTerrs = seaRows * seaCols
	const cityStart = prodTerrs
	const seaStart = prodTerrs + cityCount
	const N = seaStart + seaTerrs
	const all = new Array(N), land = new Array(N), sea = new Array(N)
	for (let i = 0; i < N; i++) { all[i] = []; land[i] = []; sea[i] = [] }
	const ll = (a, b) => { all[a].push(b); all[b].push(a); land[a].push(b); land[b].push(a) }
	const ls = (a, b) => { all[a].push(b); all[b].push(a); sea[a].push(b); sea[b].push(a) }

	// production land chain + ports
	for (let i = 0; i < prodTerrs - 1; i++) ll(i, i + 1)
	for (let i = 0; i < prodTerrs; i++) ll(i, seaStart + i)

	// dense sea grid: each sea territory links to neighbours (right, down, diagonal)
	for (let r = 0; r < seaRows; r++) {
		for (let c = 0; c < seaCols; c++) {
			const idx = r * seaCols + c
			if (c + 1 < seaCols) ls(seaStart + idx, seaStart + idx + 1)
			if (r + 1 < seaRows) {
				ls(seaStart + idx, seaStart + idx + seaCols)
				if (c > 0) ls(seaStart + idx, seaStart + idx + seaCols - 1)
				if (c + 1 < seaCols) ls(seaStart + idx, seaStart + idx + seaCols + 1)
			}
		}
	}

	// cities land-adjacent to a spread of ports
	for (let c = 0; c < cityCount; c++) {
		ll(cityStart + c, seaStart + c * seaCols)
	}
	return { allNeighbours: all, landNeighbours: land, seaNeighbours: sea }
}

function solve(mapData, prodTerrs, cityCount, seaCols, fleetCount) {
	// N industrial deeds (4 shown)
	const deedSize = Math.ceil(prodTerrs / 4)
	const deeds = []
	for (let d = 0; d < 4; d++) {
		const ids = []
		for (let i = 0; i < deedSize; i++) {
			const t = d * deedSize + i
			if (t < prodTerrs) ids.push(t)
		}
		deeds.push({ id: 1 + d, type: "IND", good: "RICE", territories: ids.map((t) => [t, false]) })
	}
	const productionAreas = contiguousProductionAreas(mapData, deeds)

	const seaTerrs = mapData.allNeighbours.length - prodTerrs - cityCount
	const cityStart = prodTerrs
	const seaStart = prodTerrs + cityCount

	const tokens = []
	for (let i = 0; i < seaTerrs; i++) tokens.push([seaStart + i, 3])
	const shippingCompanies = []
	for (let f = 0; f < fleetCount; f++) {
		shippingCompanies.push({ player: f, id: 200 + f, type: "SHIPPING", tokens: [...tokens] })
	}

	const cityList = Array.from({ length: cityCount }, (_, i) => ({ territory: cityStart + i, size: 8, receivedGoods: [] }))
	const cityTerritory = cityList.map((c) => c.territory)
	const cityCapacity = cityList.map((c) => c.size)
	const productionCapacity = productionAreas.map((a) => a.length)
	const playerCosts = [0, 1, 1, 1, 1]
	const subsidies = [0, 0, 0, 0, 0]

	const t0 = performance.now()
	const graph = createShippingGraph(mapData, cityTerritory, cityCapacity, playerCosts, subsidies, productionAreas, productionCapacity, shippingCompanies, [])
	const journeys = findPossibleJourneys(graph, productionAreas, shippingCompanies)
	const dt = performance.now() - t0
	const totalProduction = productionAreas.reduce((s, a) => s + a.length, 0)
	return { journeys, dt, totalProduction }
}

describe("IND maxShipping benchmark (extreme case)", () => {
	it("times a large dense multi-fleet solve and asserts a consistent result", () => {
		const prodTerrs = Number(process.env.IND_PROD || 24)
		const cityCount = Number(process.env.IND_CITY || 6)
		const seaCols = Number(process.env.IND_COLS || 10)
		const fleetCount = Number(process.env.IND_FLEET || 4)
		const mapData = buildMapData(prodTerrs, cityCount, seaCols)
		const { journeys, dt, totalProduction } = solve(mapData, prodTerrs, cityCount, seaCols, fleetCount)
		// eslint-disable-next-line no-console
		console.log(`MAXSHIPPING_BENCH ms=${dt.toFixed(1)} journeys=${journeys.length} totalProduction=${totalProduction} fleet=${fleetCount}`)
		// A valid max shipping: never more goods shipped than production markers.
		expect(journeys.length).toBeLessThanOrEqual(totalProduction)
		// Every production marker may be shipped at most once.
		const goodIds = journeys.map((j) => j[0])
		expect(new Set(goodIds).size).toBe(goodIds.length)
		// Every journey terminates at a city and is ship-only through the middle.
		for (const journey of journeys) {
			expect(journey[1]).toBeLessThan(fleetCount)
			expect(journey[2]).toBeGreaterThanOrEqual(200)
			for (let i = 3; i < journey.length - 1; i++) {
				expect(journey[i]).toBeGreaterThanOrEqual(prodTerrs + cityCount)
			}
		}
		// On this board the cities can absorb every production good, so a correct
		// max-shipping MUST deliver all of them -- the optimisation must never
		// under-ship. This is the cardinality invariant shared with the original.
		expect(journeys.length).toBe(totalProduction)
	}, 600000)
})
