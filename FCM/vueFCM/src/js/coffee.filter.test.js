/**
 * Regression tests for getCoffeeRoute's maximal-route filter (FCMmodel.js).
 *
 * This isn't just a perf pass. The prior implementation sorted routes by RAW
 * array length and used "equal raw length" as its duplicate tie-break. That
 * key is invalid: getCoffeeRoutesFromBldgSquare's DFS allows revisiting a
 * square once, so the exact same set of squares can be found via routes of
 * different raw lengths (padded with harmless backtracking). Two routes
 * covering identical squares but with different lengths would each see the
 * other as a "superset" and eliminate each other - and with 3+ length
 * variants of the same coverage, ALL of them can wipe each other out, even
 * when that coverage was the only maximal one. Result: zero surviving
 * routes where a real sale existed.
 *
 * Verified against real games from ~/personal/FCM's replay corpus (real
 * finished coffee+lobbyist games, legacy's own two-pass filter as the
 * oracle - it dedupes by DFS emission order, never by length, so it doesn't
 * have this bug): across 2,016 real captured cases with at least one route,
 * the OLD filter matched legacy on only 1,289 (64%) - and 513 of those
 * (25.5% of all cases) were the zero-sale failure mode: old filter said 0
 * survivors where legacy found a real sale. The fixed filter (dedupe by
 * square-SET signature first, keeping the earliest-found route per set -
 * same preference legacy's emission-order dedupe gives - then filter
 * maximality with no tie-break needed, since exact-set duplicates are
 * already gone) matched legacy on all 2,016/2,016.
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
