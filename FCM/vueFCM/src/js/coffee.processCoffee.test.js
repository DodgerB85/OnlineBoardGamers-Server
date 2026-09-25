/**
 * processCoffee (FCMrules.js) consumes getCoffeeRoute's return value: money
 * per seller, coffee removed from stock, FIRST_COFFEE_SOLD milestone,
 * coffeeDist (winner.distance, -1 RMA, +2/+1 milestones), and history shape.
 * Prior fixtures only checked getCoffeeRoute's return value in isolation.
 *
 * Real finished-game imports have no live model.needs to replay a winner
 * out of, so trials are "real components, hypothetical winner": per real
 * board, every (house, colour) with a real reachable distance
 * (giveRestaurantRangesForHouse) is a hypothetical dinner-time winner using
 * that player's real distance/milestones/employees/resources, cross-checked
 * against legacy's own coffee block on the same import (see
 * ~/personal/FCM/tools/capture_processCoffee_cases.mjs).
 *
 * Re-confirms the getCoffeeRoute route-filter fix (coffee.filter.test.js)
 * end-to-end through money: 27/374 trials had a wrong sale amount pre-fix,
 * 0/374 after.
 *
 * Deliberately excluded, not bugs: reservePrice games (vueFCM's game-over
 * import reconstructs reserveCards from history; legacy's resets it - an
 * unrelated, already-shipped difference); historyForCoffeeHouse's 3rd
 * highlight-squares group (vueFCM keeps coffee-shop-only sales legacy's
 * shape drops - a shipped UI improvement); coffeeShopMSplayers ordering
 * across houses; true step-by-step winner replay (out of scope).
 */
import { describe, it, expect, beforeAll, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_FILE = path.join(__dirname, "__fixtures__", "coffee_real", "processCoffee", "cases.jsonl")
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

function loadGames() {
	if (!fs.existsSync(FIXTURE_FILE)) return []
	return fs
		.readFileSync(FIXTURE_FILE, "utf8")
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line))
}

const games = loadGames()
const hasPako = fs.existsSync(PAKO_FILE)

describe.skipIf(games.length === 0 || !hasPako)("processCoffee vs real legacy coffee-block output", () => {
	let funcs, rules, rf, modelMod, plyr, useModelStore

	beforeAll(async () => {
		if (!globalThis.pako) {
			const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
			// eslint-disable-next-line no-eval
			;(0, eval)(pakoSrc)
		}
		globalThis.alert = () => {}
		funcs = await import("./FCMfuncs.js")
		rules = await import("./FCMrules.js")
		rf = await import("./FCMreference.js")
		modelMod = await import("./FCMmodel.js")
		plyr = await import("./FCMplayer.js")
		;({ useModelStore } = await import("../stores/FCMstore.js"))
	})

	function importGame(game) {
		globalThis.window = globalThis.window || {}
		globalThis.window.initData = { startingOptions: game.startingOptions, startingMap: game.startingMap, playerNames: game.playerNames }
		setActivePinia(createPinia())
		const store = useModelStore()
		funcs.importFCMmodel(game.gameData, true, false)
		return store
	}

	it("matches legacy's coffeeDist, earnings, resource removal, milestone award, and sales history on every fixture trial", () => {
		const mismatches = []
		let coffeeDistChecked = 0

		for (const game of games) {
			for (const trial of game.trials) {
				const store = importGame(game)
				const winnerIdx = store.players.findIndex((p) => p.colour === trial.colour)
				if (winnerIdx === -1 || winnerIdx !== trial.winnerSeat) {
					mismatches.push({ gameId: game.gameId, trial, reason: "seat/colour mapping mismatch" })
					continue
				}

				const possibleCoffeeMS = store.availableMilestones.includes(rf.FIRST_COFFEE_SOLD)
				const spy = vi.spyOn(modelMod, "getCoffeeRoute")
				const coffeeEarnings = new Array(store.players.length).fill(0)
				const histoHouses = []
				rules.processCoffee(trial.house, { playerIndex: winnerIdx, distance: trial.rawDistance }, new Set(), coffeeEarnings, histoHouses, possibleCoffeeMS)

				const problems = []
				if (spy.mock.calls.length > 0) {
					coffeeDistChecked++
					if (spy.mock.calls[0][2] !== trial.coffeeDistance) problems.push(`coffeeDist: got ${spy.mock.calls[0][2]}, want ${trial.coffeeDistance}`)
				}
				spy.mockRestore()

				if (JSON.stringify(coffeeEarnings) !== JSON.stringify(trial.coffeeEarningsBySeat)) {
					problems.push(`coffeeEarnings: got ${JSON.stringify(coffeeEarnings)}, want ${JSON.stringify(trial.coffeeEarningsBySeat)}`)
				}

				// Read the post-sale state before switching the active store to a
				// fresh re-import (hasMilestone reads useModelStore() implicitly).
				const msAfter = store.players.map((p, seat) => plyr.hasMilestone(seat, rf.FIRST_COFFEE_SOLD))
				const stockAfter = store.players.map((p) => p.resources.filter((r) => r === rf.COFFEE).length)
				const before = importGame(game)
				const msBefore = before.players.map((p, seat) => plyr.hasMilestone(seat, rf.FIRST_COFFEE_SOLD))
				const stockBefore = before.players.map((p) => p.resources.filter((r) => r === rf.COFFEE).length)
				const gotRemoved = stockBefore.map((n, seat) => n - stockAfter[seat])
				const gotMsAwarded = msBefore.map((was, seat) => !was && msAfter[seat])

				if (JSON.stringify(gotRemoved) !== JSON.stringify(trial.coffeeRemovedBySeat)) problems.push(`coffeeRemoved: got ${JSON.stringify(gotRemoved)}`)
				if (JSON.stringify(gotMsAwarded) !== JSON.stringify(trial.msAwardedBySeat)) problems.push(`msAwarded: got ${JSON.stringify(gotMsAwarded)}`)

				// The coffee block pushes one 3-element [salesByPlayer, highlights,
				// salesData] entry directly, no house-number wrapper.
				const historyEntry = histoHouses.find((h) => Array.isArray(h) && h.length === 3 && Array.isArray(h[0]))
				if (!historyEntry) {
					if (trial.coffeeEarningsBySeat.some((v) => v > 0)) problems.push("history: no coffee block pushed despite a real sale")
				} else {
					if (JSON.stringify(historyEntry[0]) !== JSON.stringify(trial.historySalesByPlayer)) problems.push("history[0] salesByPlayer mismatch")
					if (JSON.stringify(historyEntry[2]) !== JSON.stringify(trial.historySalesData)) problems.push("history[2] salesData mismatch")
				}

				if (problems.length > 0) mismatches.push({ gameId: game.gameId, house: trial.house, colour: trial.colour, problems })
			}
		}

		expect(coffeeDistChecked).toBeGreaterThan(0)
		expect(mismatches).toEqual([])
	}, 60000)
})
