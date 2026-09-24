/**
 * End-to-end regression test: vueFCM's FULL getCoffeeRoute (DFS +
 * maximal-route filter + sales-location filter + stock cap + common-square/
 * common-sale intersection) against legacy's real output, on real games,
 * via a real cross-runtime state import.
 *
 * This was the last unverified layer this session: the DFS and the two
 * subset filters were checked in isolation, but never the whole pipeline
 * together, because it wasn't known whether legacy's exportModel wire
 * format is even compatible with vueFCM's importFCMmodel. It is: fed a
 * real finished game's raw exported blob (base64+gzip) straight into
 * importFCMmodel and it round-trips a coherent store (right player count,
 * right coords length, real player/restaurant data) with no crash.
 *
 * Real-data result (15 real coffee+lobbyist games, 594 (house, colour,
 * winningRange) cases): 586/594 exact match, 594/594 match on the two
 * fields that actually affect gameplay (sales-by-colour and commonSquares -
 * legacy's sales array is colour-indexed/6 slots, vueFCM's is
 * player-index-indexed/N slots, mapped via colour before comparing). The
 * 8 "mismatches" were the third return value (salesIndexes, a highlight-only
 * list) containing the same set of squares in a different order - cosmetic,
 * doesn't reach money or history.
 *
 * This fixture locks in a small sample of those real, precomputed-legacy
 * cases so the pipeline can be checked on every `npm test` without needing
 * the legacy JS runtime or ~/personal/FCM present.
 */
import { describe, it, expect, beforeAll } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_FILE = path.join(__dirname, "__fixtures__", "coffee_real", "pipeline_cases.json")
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

const hasFixture = fs.existsSync(FIXTURE_FILE)
const hasPako = fs.existsSync(PAKO_FILE)

describe.skipIf(!hasFixture || !hasPako)("getCoffeeRoute full pipeline vs real legacy output", () => {
	let games
	let funcs
	let getCoffeeRoute

	beforeAll(async () => {
		games = JSON.parse(fs.readFileSync(FIXTURE_FILE, "utf8"))
		if (!globalThis.pako) {
			const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
			// eslint-disable-next-line no-eval
			;(0, eval)(pakoSrc)
		}
		globalThis.alert = () => {}
		funcs = await import("./FCMfuncs.js")
		;({ getCoffeeRoute } = await import("./FCMmodel.js"))
	})

	it("matches legacy's real sales-by-colour and commonSquares on every fixture case", async () => {
		const { useModelStore } = await import("../stores/FCMstore.js")
		let checked = 0
		const mismatches = []

		for (const game of games) {
			globalThis.window = globalThis.window || {}
			globalThis.window.initData = {
				startingOptions: game.startingOptions,
				startingMap: game.startingMap,
				playerNames: game.playerNames,
			}
			setActivePinia(createPinia())
			const store = useModelStore()
			funcs.importFCMmodel(game.gameData, true, false)

			for (const c of game.cases) {
				const playerIndex = store.players.findIndex((p) => p.colour === c.colour)
				if (playerIndex === -1) continue

				const [actualSales, commonSquares] = getCoffeeRoute(c.house, playerIndex, c.winningRange)
				checked++

				const legacySalesForThisPlayer = c.expected[0][c.colour]
				const salesOk = actualSales[playerIndex] === legacySalesForThisPlayer
				const squaresOk = JSON.stringify([...commonSquares].sort((a, b) => a - b)) === JSON.stringify([...c.expected[1]].sort((a, b) => a - b))

				if (!salesOk || !squaresOk) {
					mismatches.push({ gameId: game.gameId, case: c, salesOk, squaresOk, got: [actualSales[playerIndex], commonSquares] })
				}
			}
		}

		console.log(`${checked} full-pipeline cases across ${games.length} real games`)
		expect(mismatches).toEqual([])
	}, 30000)
})
