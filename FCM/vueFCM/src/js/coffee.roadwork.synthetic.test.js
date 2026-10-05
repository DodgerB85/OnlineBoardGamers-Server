import { describe, it, expect } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import * as rf from "./FCMreference.js"
import { getCoffeeRoutesFromBldgSquare, getRoadworkIndexes } from "./FCMmap.js"
import { useModelStore } from "../stores/FCMstore.js"
import { loadSyntheticCases } from "./coffee.roadwork.shared.js"

// Synthetic boards targeting edge cases real games don't guarantee on demand:
// same-tile/cross-tile roadwork entry, the range boundary (exact + one under),
// and roadwork combined with the "visited twice" revisit rule. Ground truth is
// legacy's own getCoffeeRoutesFromBldgSquare with M.rwIndexes seeded directly
// (~/personal/FCM/tools/capture_roadwork_cases.mjs).
//
// These build their boards by hand rather than importing an export, so they cost
// nothing and stay in this one file rather than being sharded.
//
// Legacy's raw DFS double-emits every non-start-node route (its while-loop
// accept-checks a node's neighbours once right after pushing, again at the top
// of the next iteration for the same node) - harmless, collapsed by
// getCoffeeRoute's own dedup, so routes are compared as a deduped set here.
const cases = loadSyntheticCases()

describe.skipIf(!cases)("getCoffeeRoutesFromBldgSquare vs real legacy output, synthetic roadwork boards", () => {
	for (const c of cases ?? []) {
		it(c.name, () => {
			setActivePinia(createPinia())
			const store = useModelStore()
			store.mapData.coords = new Array(rf.ssW * rf.ssH).fill(rf.EMPTY_SPACE)
			store.mapData.dimensions = [17, 16]
			store.gameflow.turn = 5
			for (const sq of c.roadSquares) store.mapData.coords[sq] = rf.ROAD

			// getRoadworkIndexes can't be mocked from outside (called as a bare
			// local reference, not through the module's export binding), so seed
			// store.newRoads with a phantom rotation=1 road one tile-row below
			// each target: its formula marks (index - tileWidth) whenever that
			// square is already a ROAD, regardless of the phantom's own coords.
			const tW = store.mapData.dimensions[0] * 5
			for (const target of c.rwIndexes) store.newRoads.push({ index: target + tW, variety: 0, rotation: 1, turnAdded: store.gameflow.turn })

			expect([...getRoadworkIndexes()].sort((a, b) => a - b)).toEqual([...c.rwIndexes].sort((a, b) => a - b))

			const dedup = (routes) => [...new Set(routes.map((r) => JSON.stringify(r)))].sort()
			const rawRoutes = getCoffeeRoutesFromBldgSquare(c.building, c.restaurants, c.winningRange)
			expect(dedup(rawRoutes)).toEqual(dedup(c.routes))
		})
	}
})
