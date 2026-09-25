/**
 * getCoffeeRoute's maximal-route filter (FCMmodel.js) used to sort routes by
 * raw array length and use "equal length" as its duplicate tie-break. The
 * DFS allows revisiting a square once, so identical square coverage can
 * come at different raw lengths - two such routes would each see the other
 * as a superset and eliminate each other, wiping out an entire coverage
 * family (real sale included) even when it was the only maximal one.
 *
 * Against 2,016 real captured cases (legacy's position-based dedupe as the
 * oracle - it never sorts by length, so it doesn't have this bug), the old
 * filter matched legacy on 64% (25.5% were the zero-sale failure mode). The
 * fix - dedupe by square-set signature first, then filter maximality with
 * no tie-break needed - matches 2,016/2,016.
 */
import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BIG_CASE_FILE = path.join(__dirname, "__fixtures__", "coffee_real", "big_route_list.json")

// Mirrors the current FCMmodel.js implementation exactly (kept in sync by
// hand - it isn't exported standalone from FCMmodel.js, which pulls in the
// whole store/model dependency graph).
function filterMaximalRoutes(possibleRoutesIn) {
	const bySignature = new Map()
	for (const route of possibleRoutesIn) {
		const sig = [...new Set(route)].sort((a, b) => a - b).join(",")
		if (!bySignature.has(sig)) bySignature.set(sig, route)
	}
	const deduped = [...bySignature.values()]
	const routeSets = deduped.map((r) => new Set(r))
	return deduped.filter((route, i) => {
		for (let j = 0; j < deduped.length; j++) {
			if (i === j) continue
			if (route.every((v) => routeSets[j].has(v))) return false
		}
		return true
	})
}

describe("getCoffeeRoute maximal-route filter", () => {
	it("drops a strict subset and keeps the route that contains it", () => {
		const routes = [
			[1, 2, 3],
			[1, 2],
			[9, 8],
		]
		const kept = filterMaximalRoutes(routes)
		expect(kept).toEqual([
			[1, 2, 3],
			[9, 8],
		])
	})

	it("keeps exactly one of two identical routes", () => {
		const routes = [
			[1, 2, 3],
			[1, 2, 3],
		]
		const kept = filterMaximalRoutes(routes)
		expect(kept.length).toBe(1)
		expect(kept[0]).toEqual([1, 2, 3])
	})

	it("keeps one survivor when the same square-set is reached via different raw lengths (regression)", () => {
		// Same 3 squares reached with 0, 1 and 2 harmless backtracks - the
		// exact shape that used to wipe every variant out.
		const routes = [
			[1, 2, 3],
			[1, 2, 1, 2, 3],
			[1, 2, 1, 2, 1, 2, 3],
		]
		const kept = filterMaximalRoutes(routes)
		expect(kept.length).toBe(1)
		expect(new Set(kept[0])).toEqual(new Set([1, 2, 3]))
	})

	it.skipIf(!fs.existsSync(BIG_CASE_FILE))("matches legacy on a real 3214-route case with 472 same-coverage, different-length variants", () => {
		const routes = JSON.parse(fs.readFileSync(BIG_CASE_FILE, "utf8"))
		const t0 = performance.now()
		const kept = filterMaximalRoutes(routes)
		const elapsedMs = performance.now() - t0

		// Legacy's own (position-based) filter finds exactly 1 survivor here,
		// the 38-unique-square route. The old raw-length-tie-break filter
		// found 0 (see file header). This locks in the fix.
		expect(kept.length).toBe(1)
		expect(new Set(kept[0]).size).toBe(38)
		expect(elapsedMs).toBeLessThan(5000)
	}, 10000)
})
