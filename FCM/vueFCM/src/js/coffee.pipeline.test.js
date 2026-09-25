/**
 * End-to-end: vueFCM's full getCoffeeRoute (DFS + both subset filters +
 * stock cap + common-square/-sale intersection) against legacy's real
 * output, via legacy's exportModel fed straight into vueFCM's
 * importFCMmodel (confirmed wire-compatible). Compares sales-by-colour and
 * commonSquares - the two fields that affect money/history (legacy's sales
 * array is colour-indexed/6 slots, vueFCM's is player-index-indexed/N
 * slots, mapped via colour before comparing).
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

		expect(checked).toBeGreaterThan(0)
		expect(mismatches).toEqual([])
	}, 30000)
})
