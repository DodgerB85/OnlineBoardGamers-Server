/**
 * Differential test for getCoffeeRoutesFromBldgSquare against real games.
 *
 * Cases come from ~/personal/FCM's replay corpus: real finished games that
 * used both coffee and lobbyists, reconstructed via the legacy JS engine
 * (Model.importModel), replayed to their final board. Every
 * (index, restaurants, winningRange) call that getCoffeeRoute makes into the
 * DFS is captured off that real road network, along with what legacy's OWN
 * (unpruned) DFS returned for it - see
 * ~/personal/FCM/tools/capture_coffee_real_cases.mjs.
 *
 * A curated fixture (__fixtures__/coffee_real/cases.jsonl) is committed so
 * this runs in CI without ~/personal/FCM present; regenerate it by copying
 * fresh output from that script.
 */
import { describe, it, expect } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { useModelStore } from "../stores/FCMstore.js"
import { getCoffeeRoutesFromBldgSquare } from "./FCMmap.js"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_FILE = path.join(__dirname, "__fixtures__", "coffee_real", "cases.jsonl")

function loadGames() {
	if (!fs.existsSync(FIXTURE_FILE)) return []
	return fs
		.readFileSync(FIXTURE_FILE, "utf8")
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line))
}

const games = loadGames()

describe.skipIf(games.length === 0)("getCoffeeRoutesFromBldgSquare vs real coffee+lobbyist games", () => {
	it(`matches legacy's DFS output on every captured real-game case (${games.length} games)`, () => {
		let totalCases = 0
		let totalMs = 0
		const mismatches = []

		for (const game of games) {
			setActivePinia(createPinia())
			const store = useModelStore()
			store.mapData.coords = game.coords
			store.mapData.dimensions = game.dimensions
			store.newRoads.splice(0)

			for (const c of game.cases) {
				const t0 = performance.now()
				const routes = getCoffeeRoutesFromBldgSquare(c.index, c.restaurants, c.winningRange)
				totalMs += performance.now() - t0
				totalCases++

				// Unique-route-set equality, not raw multiset equality: legacy's
				// manual loop re-runs its "adjacent to a restaurant?" check twice
				// for every non-start node (once right after pushing it, once at
				// the top of the next while-loop iteration where it's now
				// currentRouteIndexes.last() again) - map.js:824-834 vs :967-978.
				// That's a redundant artifact of its specific loop structure, not
				// a game rule: it pushes every valid route twice (once for the
				// start node). getCoffeeRoute's own subset filter collapses exact
				// duplicates back to one survivor either way (possibleRoutes[j]
				// .length === route.length -> keep first), so it never reaches
				// observable game behaviour. The real DFS contract is which
				// distinct routes are found, not how many times each is pushed.
				const canon = (rs) => new Set([...rs].map((r) => r.join(",")))
				const gotSet = canon(routes)
				const wantSet = canon(c.expected)
				const setsEqual = gotSet.size === wantSet.size && [...gotSet].every((r) => wantSet.has(r))
				if (!setsEqual) {
					mismatches.push({ gameId: game.gameId, case: c, got: routes.length, want: c.expected.length })
				}
			}
		}

		console.log(`${totalCases} real-game cases across ${games.length} games, ${totalMs.toFixed(0)}ms total`)
		if (mismatches.length > 0) {
			console.log(`${mismatches.length} mismatches (showing up to 5):`, JSON.stringify(mismatches.slice(0, 5), null, 2))
		}
		expect(mismatches).toEqual([])
	}, 120000)
})
