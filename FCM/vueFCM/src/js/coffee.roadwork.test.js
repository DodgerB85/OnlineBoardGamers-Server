/**
 * Roadwork + coffee-sale overlap. Other coffee fixtures import a game's
 * FINAL post-game state, where roadwork markers are always cleared, so they
 * never exercise that code path. This one uses real turn-by-turn replay
 * (~/personal/FCM/tools/run_js_replay.mjs's FCM_ROADWORK_CAPTURE_OUT hook)
 * to capture live mid-game state whenever legacy runs getCoffeeRoute with
 * active roadworks, plus 5 synthetic edge-case boards cross-checked against
 * legacy's real getCoffeeRoutesFromBldgSquare directly.
 *
 * Found and fixed a real bug in getRoadworkIndexes (FCMmap.js): a rotation-2
 * corner road shifts its placement index by -1 (addNewRoad), but roadwork
 * reconstruction read the un-shifted road.index, mismarking every such
 * corner road's roadwork squares.
 */
import { describe, it, expect, beforeAll } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import * as rf from "./FCMreference.js"
import { getCoffeeRoutesFromBldgSquare, getRoadworkIndexes } from "./FCMmap.js"
import { useModelStore } from "../stores/FCMstore.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_FILE = path.join(__dirname, "__fixtures__", "coffee_real", "roadwork", "roadwork_pipeline_cases.json")
const SYNTHETIC_FIXTURE_FILE = path.join(__dirname, "__fixtures__", "coffee_real", "roadwork", "roadwork_synthetic_cases.json")
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

const hasFixture = fs.existsSync(FIXTURE_FILE)
const hasPako = fs.existsSync(PAKO_FILE)

function importCase(c, funcs) {
	globalThis.window = globalThis.window || {}
	globalThis.window.initData = { startingOptions: c.startingOptions, startingMap: c.startingMap, playerNames: c.playerNames }
	setActivePinia(createPinia())
	const store = useModelStore()
	funcs.importFCMmodel(c.gameData, false, false) // forGameOver=false: mid-game (live) export
	return store
}

describe.skipIf(!hasFixture || !hasPako)("getCoffeeRoute vs real legacy output, roadwork turns only", () => {
	let cases
	let funcs
	let getCoffeeRoute

	beforeAll(async () => {
		cases = JSON.parse(fs.readFileSync(FIXTURE_FILE, "utf8"))
		if (!globalThis.pako) {
			const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
			// eslint-disable-next-line no-eval
			;(0, eval)(pakoSrc)
		}
		globalThis.alert = () => {}
		funcs = await import("./FCMfuncs.js")
		;({ getCoffeeRoute } = await import("./FCMmodel.js"))
	})

	// One documented gap: getRoadworkIndexes reconstructs from the final board
	// state, not the exact moment each road was placed. Real games/turns:
	// 199 distinct; this affects exactly 1 (game 15837 turn 8), with zero
	// effect on sales/commonSquares (checked independently below).
	it("reconstructs legacy's roadwork indexes (documented exception: game 15837 turn 8)", () => {
		const rwMismatches = new Set()
		for (const c of cases) {
			importCase(c, funcs)
			const got = JSON.stringify([...getRoadworkIndexes()].sort((a, b) => a - b))
			const want = JSON.stringify([...c.rwIndexes].sort((a, b) => a - b))
			if (got !== want) rwMismatches.add(`${c.gameId}:${c.turn}`)
		}
		expect([...rwMismatches].sort()).toEqual(["15837:8"])
	}, 60000)

	it("matches legacy's real sales/commonSquares on every case", () => {
		const mismatches = []
		for (const c of cases) {
			const store = importCase(c, funcs)
			const playerIndex = store.players.findIndex((p) => p.colour === c.colour)
			if (playerIndex === -1) continue

			const [actualSales, commonSquares] = getCoffeeRoute(c.house, playerIndex, c.winningRange)
			const salesOk = actualSales[playerIndex] === c.expected[0][c.colour]
			const squaresOk = JSON.stringify([...commonSquares].sort((a, b) => a - b)) === JSON.stringify([...c.expected[1]].sort((a, b) => a - b))
			if (!salesOk || !squaresOk) mismatches.push({ gameId: c.gameId, turn: c.turn })
		}
		expect(mismatches).toEqual([])
	}, 90000)
})

// Synthetic boards targeting edge cases real games don't guarantee on demand:
// same-tile/cross-tile roadwork entry, the range boundary (exact + one under),
// and roadwork combined with the "visited twice" revisit rule. Ground truth
// is legacy's own getCoffeeRoutesFromBldgSquare with M.rwIndexes seeded
// directly (~/personal/FCM/tools/capture_roadwork_cases.mjs).
//
// Legacy's raw DFS double-emits every non-start-node route (its while-loop
// accept-checks a node's neighbours once right after pushing, again at the
// top of the next iteration for the same node) - harmless, collapsed by
// getCoffeeRoute's own dedup, so routes are compared as a deduped set here.
describe.skipIf(!fs.existsSync(SYNTHETIC_FIXTURE_FILE))("getCoffeeRoutesFromBldgSquare vs real legacy output, synthetic roadwork boards", () => {
	const cases = JSON.parse(fs.readFileSync(SYNTHETIC_FIXTURE_FILE, "utf8"))

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
