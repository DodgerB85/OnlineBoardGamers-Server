/**
 * Differential test for getCoffeeRoutesFromBldgSquare against real games.
 * Cases come from ~/personal/FCM's replay corpus (real finished coffee+
 * lobbyist games, reconstructed via the legacy engine's Model.importModel)
 * - see ~/personal/FCM/tools/capture_coffee_real_cases.mjs, which also
 * captures what legacy's own DFS returned for each case.
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
		const mismatches = []

		for (const game of games) {
			setActivePinia(createPinia())
			const store = useModelStore()
			store.mapData.coords = game.coords
			store.mapData.dimensions = game.dimensions
			store.newRoads.splice(0)

			for (const c of game.cases) {
				const routes = getCoffeeRoutesFromBldgSquare(c.index, c.restaurants, c.winningRange)
				totalCases++

				// Unique-route-set equality, not raw multiset equality: legacy's
				// loop double-pushes every non-start-node route (a redundant
				// artifact of its structure, not a game rule - map.js:824-978),
				// harmless since getCoffeeRoute's own filter collapses duplicates.
				const canon = (rs) => new Set([...rs].map((r) => r.join(",")))
				const gotSet = canon(routes)
				const wantSet = canon(c.expected)
				const setsEqual = gotSet.size === wantSet.size && [...gotSet].every((r) => wantSet.has(r))
				if (!setsEqual) {
					mismatches.push({ gameId: game.gameId, case: c, got: routes.length, want: c.expected.length })
				}
			}
		}

		expect(totalCases).toBeGreaterThan(0)
		expect(mismatches).toEqual([])
	}, 120000)
})
