/**
 * Regression test for processCoffee (FCMrules.js) - the code that CONSUMES
 * getCoffeeRoute's return value: money added per seller, coffee removed from
 * stock, FIRST_COFFEE_SOLD milestone awards, and the coffeeDist adjustment
 * formula (winner.distance, -1 for RURAL_MARKETING_AREA, +2/+1 for the
 * FIRST_MARKETEER_USED / SOMEONE_SELLS_YOUR_DEMAND milestones). Earlier work
 * this session only checked getCoffeeRoute's return value in isolation
 * (coffee.real.test.js, coffee.pipeline.test.js) - never whether
 * processCoffee does the right thing WITH that value.
 *
 * Real finished games (Model.importModel forGameOver=true) have
 * model.needs.length === 0 - there's no live dinner-time to replay a real
 * winner out of. So cases here are "synthesized from real components": per
 * real finished board, for every (house, colour) where that colour has a
 * real reachable distance (model.giveRestaurantRangesForHouse), that player
 * is treated as a hypothetical dinner-time winner using their REAL distance
 * and REAL milestone/employee/resource state - not a captured real sale
 * event. See tools/capture_processCoffee_cases.mjs in ~/personal/FCM for the
 * capture script, which re-runs legacy's own coffee block (rules.js
 * "NOW GET THE COFFEE ROUTES" onward, transcribed verbatim) against a
 * freshly re-imported copy of the real model per trial.
 *
 * REAL BUG FOUND AND FIXED (FCMmodel.js, getCoffeeRoute): the maximal-route
 * filter used raw route LENGTH as its dedup key ("sort by length descending,
 * treat equal-length as the tie-break for duplicates"). Legacy's DFS is
 * allowed to revisit a square once, so the exact same set of squares can be
 * emitted as routes of different raw lengths. Two same-coverage routes of
 * DIFFERENT lengths each see the other as a superset and mutually eliminate
 * each other - and every route that was a subset of either of them gets
 * eliminated too, even though the whole family represented ONE real maximal
 * route. Net effect on real games: a second, genuinely different maximal
 * route to the same restaurant (through a different coffee shop) could wipe
 * out the ENTIRE longer-route family, leaving only the shorter route
 * surviving - and since legacy's own final "sale only counts if the same
 * square is common to EVERY surviving route" rule (model.js:1576-1598) then
 * has just one survivor, everything trivially looks "common" and the
 * surviving route's sale is kept - accidentally matching in some cases, but
 * wrongly WIPING OUT real sales in others whenever the eliminated family was
 * the one that should have split the vote. Fixed by deduping on the
 * square-SET signature first (keeping the earliest-found route per set, as
 * legacy's own DFS-emission-order preference does), then filtering
 * maximality with no length tie-break needed since exact-set duplicates are
 * already gone (see coffee.filter.test.js and FCMmodel.js's getCoffeeRoute
 * for the fix itself - this file validates it end-to-end through
 * processCoffee instead of in isolation). Confirmed on real data against a
 * pre-fix build: before the fix, 27/374 real trials had a wrong SALE AMOUNT
 * (not just a wrong price) - after the fix, 0/374.
 *
 * NOT covered by this fixture (documented, not papered over):
 *  - Games with the reservePrice starting option (id "23") are excluded from
 *    the fixture entirely. Reason: legacy's forGameOver=true import path
 *    resets reserveCards to [] and never even reads that slot of the export
 *    (model.js:2679-2702) - by design, for a finished-game snapshot. vueFCM's
 *    importFCMmodel deliberately reconstructs the real reserveCards from the
 *    history log for game-over saves instead (FCMfuncs.js, commit cde1f9a7
 *    "fix undef res on game over" - a real, already-shipped improvement, not
 *    a porting bug). That makes Rules.basePrice()/rules.basePrice() compute a
 *    legitimately DIFFERENT number on the two sides whenever reservePrice
 *    and bankBroken are both active, for reasons that have nothing to do
 *    with processCoffee's own formula - it's an artifact of comparing
 *    forGameOver=true reconstructions where one side deliberately keeps more
 *    data than the other. Confirmed: with reservePrice games included, every
 *    single "coffeeEarnings only" mismatch (47/47) was in a reservePrice
 *    game, and zero amount-level (coffeeRemoved/history[0]) mismatches were.
 *  - historyForCoffeeHouse[1] (highlightSqs). vueFCM deliberately diverges
 *    from legacy's shape here: when a 2x2 restaurant footprint is found,
 *    legacy's highlightSqs is a 2-element array [routeSquares, restoBases]
 *    and silently drops any leftover single coffee-shop sale squares;
 *    vueFCM's is a 3-element array that keeps those leftovers as a 3rd
 *    group so "More Information" can also highlight coffee shops that sold
 *    (FCMrules.js, commit "add CS highlgihts", FCM/vueFCM/src/js/FCMrules.js
 *    + FCM/vueFCM/src/components/HistoryEntry.vue). That's a deliberate,
 *    already-committed UI improvement over legacy's behaviour, not a
 *    porting bug - so it's intentionally excluded from this equality check.
 *  - store.coffeeShopMSplayers push order/content across multiple houses in
 *    the same dinner-time (only checked per-trial, reset before each call).
 *  - A true step-by-step engine replay (real winner selection via the full
 *    price/distance/waitress/movie-star ranking) - out of scope for the time
 *    available; see the task write-up for why (needs the full
 *    controller_runtime_probe harness, which needs a live driver adapted
 *    from run_js_replay.mjs).
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
	let funcs
	let rules
	let rf
	let modelMod
	let plyr

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
	})

	it("matches legacy's coffeeDist, earnings, resource removal, milestone award, and sales history on every fixture trial", async () => {
		const { useModelStore } = await import("../stores/FCMstore.js")
		let checked = 0
		let skippedSeatMismatch = 0
		let coffeeDistChecked = 0
		const mismatches = []

		for (const game of games) {
			for (const trial of game.trials) {
				globalThis.window = globalThis.window || {}
				globalThis.window.initData = {
					startingOptions: game.startingOptions,
					startingMap: game.startingMap,
					playerNames: game.playerNames,
				}
				setActivePinia(createPinia())
				const store = useModelStore()
				funcs.importFCMmodel(game.gameData, true, false)

				const winnerIdx = store.players.findIndex((p) => p.colour === trial.colour)
				if (winnerIdx === -1 || winnerIdx !== trial.winnerSeat) {
					// Seat order should match the legacy blob 1:1 (same underlying
					// exported data) - a mismatch here means the round-trip itself
					// reordered players, worth surfacing rather than silently skipping.
					skippedSeatMismatch++
					mismatches.push({ gameId: game.gameId, trial, reason: "seat/colour mapping mismatch", winnerIdx })
					continue
				}

				const possibleCoffeeMS = store.availableMilestones.includes(rf.FIRST_COFFEE_SOLD)
				store.coffeeShopMSplayers.splice(0)

				const spy = vi.spyOn(modelMod, "getCoffeeRoute")

				const usedFryChefs = new Set()
				const coffeeEarnings = new Array(store.players.length).fill(0)
				const histoHouses = []
				const winner = { playerIndex: winnerIdx, distance: trial.rawDistance }

				rules.processCoffee(trial.house, winner, usedFryChefs, coffeeEarnings, histoHouses, possibleCoffeeMS)

				checked++

				const problems = []

				// --- Part A: coffeeDist ---
				if (spy.mock.calls.length > 0) {
					coffeeDistChecked++
					const gotCoffeeDist = spy.mock.calls[0][2]
					if (gotCoffeeDist !== trial.coffeeDistance) {
						problems.push(`coffeeDist: got ${gotCoffeeDist}, want ${trial.coffeeDistance}`)
					}
				}
				spy.mockRestore()

				// --- Part B: money, resources, milestones, history ---
				if (JSON.stringify(coffeeEarnings) !== JSON.stringify(trial.coffeeEarningsBySeat)) {
					problems.push(`coffeeEarnings: got ${JSON.stringify(coffeeEarnings)}, want ${JSON.stringify(trial.coffeeEarningsBySeat)}`)
				}

				const msAwardedBySeat = store.players.map((p, seat) => plyr.hasMilestone(seat, rf.FIRST_COFFEE_SOLD))
				// msAwardedBySeat here is the AFTER state; compare against fixture's
				// AFTER-derived boolean only for seats where it was previously false
				// (fixture's msAwardedBySeat is already a before->after transition).
				// Re-import a clean copy to read the BEFORE state for comparison.
				setActivePinia(createPinia())
				const freshStore = useModelStore()
				globalThis.window.initData = {
					startingOptions: game.startingOptions,
					startingMap: game.startingMap,
					playerNames: game.playerNames,
				}
				funcs.importFCMmodel(game.gameData, true, false)
				const msBeforeBySeat = freshStore.players.map((p, seat) => plyr.hasMilestone(seat, rf.FIRST_COFFEE_SOLD))
				const coffeeStockBeforeBySeat = freshStore.players.map((p) => p.resources.filter((r) => r === rf.COFFEE).length)
				const coffeeStockAfterBySeat = store.players.map((p) => p.resources.filter((r) => r === rf.COFFEE).length)
				const gotRemovedBySeat = coffeeStockBeforeBySeat.map((before, seat) => before - coffeeStockAfterBySeat[seat])
				const gotMsAwardedBySeat = msBeforeBySeat.map((before, seat) => before === false && msAwardedBySeat[seat] === true)

				if (JSON.stringify(gotRemovedBySeat) !== JSON.stringify(trial.coffeeRemovedBySeat)) {
					problems.push(`coffeeRemoved: got ${JSON.stringify(gotRemovedBySeat)}, want ${JSON.stringify(trial.coffeeRemovedBySeat)}`)
				}
				if (JSON.stringify(gotMsAwardedBySeat) !== JSON.stringify(trial.msAwardedBySeat)) {
					problems.push(`msAwarded: got ${JSON.stringify(gotMsAwardedBySeat)}, want ${JSON.stringify(trial.msAwardedBySeat)}`)
				}

				// History block shape: histoHouses should have exactly one entry
				// (the coffee block pushes its own array directly, no house-number
				// wrapper - see FCMrules.js processCoffee's last few lines).
				const coffeeHistoEntry = histoHouses.find((h) => Array.isArray(h) && h.length === 3 && Array.isArray(h[0]))
				if (!coffeeHistoEntry) {
					if (trial.coffeeEarningsBySeat.some((v) => v > 0)) problems.push("history: no coffee history block pushed despite a real sale")
				} else {
					if (JSON.stringify(coffeeHistoEntry[0]) !== JSON.stringify(trial.historySalesByPlayer)) {
						problems.push(`history[0] salesByPlayer: got ${JSON.stringify(coffeeHistoEntry[0])}, want ${JSON.stringify(trial.historySalesByPlayer)}`)
					}
					if (JSON.stringify(coffeeHistoEntry[2]) !== JSON.stringify(trial.historySalesData)) {
						problems.push(`history[2] salesData: got ${JSON.stringify(coffeeHistoEntry[2])}, want ${JSON.stringify(trial.historySalesData)}`)
					}
				}

				if (problems.length > 0) {
					mismatches.push({ gameId: game.gameId, house: trial.house, colour: trial.colour, problems })
				}
			}
		}

		console.log(`${checked} real-data processCoffee trials across ${games.length} real games (${skippedSeatMismatch} skipped for seat mismatch)`)
		console.log(`${coffeeDistChecked}/${checked} trials directly verified processCoffee's internal coffeeDist against legacy's (the rest never reached getCoffeeRoute - e.g. no coffee left in stock)`)
		if (mismatches.length > 0) {
			console.log(`${mismatches.length} mismatches (showing up to 5):`, JSON.stringify(mismatches.slice(0, 5), null, 2))
		}
		expect(coffeeDistChecked).toBeGreaterThan(0)
		expect(mismatches).toEqual([])
	}, 60000)
})
