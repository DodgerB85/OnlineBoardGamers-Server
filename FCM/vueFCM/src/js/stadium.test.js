/**
 * Stadium mod tests:
 * 1. Map generation places the 2 complementary arena half-tiles adjacently.
 * 2. stadiumEndOfTurn creates announcements exactly `lead` turns before game turns.
 * 3. doDinnerTime injects game-day demand, settles winner-takes-all (or clears
 *    to zero), advances the schedule and awards the First Stadium Supplier MS.
 */
/* global pako */
import { describe, it, expect, beforeAll } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let funcs, model, mapMod, rf, rules, plyr, useModelStore

beforeAll(async () => {
	if (!globalThis.pako) {
		const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
		;(0, eval)(pakoSrc)
	}
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	funcs = await import("./FCMfuncs.js")
	model = await import("./FCMmodel.js")
	mapMod = await import("./FCMmap.js")
	rf = await import("./FCMreference.js")
	rules = await import("./FCMrules.js")
	plyr = await import("./FCMplayer.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function freshGame(playerCount = 2, opts = ["47"]) {
	setActivePinia(createPinia())
	const store = useModelStore()
	model.setInternalStartingOptions(opts)
	store.mapData.tiles = mapMod.generateRandomMap(playerCount)
	mapMod.initCoords()
	store.players.splice(0)
	for (let i = 0; i < playerCount; i++) {
		store.players.push({
			name: "P" + i,
			displayName: "P" + i,
			colour: i,
			restaurants: [],
			money: 100,
			bankrupt: false,
			employees: [],
			beach: [],
			milestones: [],
			marketers: [],
			resources: [],
			additionalCampaignArrayIndex: -1,
			additionalMarketedGood: [],
			coffeeShops: [],
			ceoSlots: 3,
			ceoAction: rf.CEO_ACTION_HIRE_1,
			OOBpreference: 0,
		})
	}
	store.gameflow.turn = 5
	store.gameflow.fullTurnOrder = store.players.map((_, i) => i)
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
	store.availableMilestones = [rf.FIRST_STADIUM_SOLD]
	store.bank = 500
	store.stadium.gamesPlayed = 0
	store.stadium.announcement = null
	return store
}

// Brute-force a valid restaurant placement with road access to the stadium
function tryPlaceRestaurantNear(store, playerIndex, centerIndex) {
	const colour = store.players[playerIndex].colour
	for (let dy = -4; dy <= 4; dy++) {
		for (let dx = -8; dx <= 8; dx++) {
			const index = centerIndex + dy * rf.ssW + dx
			if (index < 0 || index >= store.mapData.coords.length) continue
			for (let rotation = 0; rotation < 4; rotation++) {
				mapMod.addElement(rf.TYPE_RESTAURANT, colour, index, false)
				store.players[playerIndex].restaurants.push({ index, rotation, open: true })
				const distances = model.giveRestaurantRangesForHouse(rf.STADIUM)
				if (distances[playerIndex] !== -99 && distances[playerIndex] !== undefined) return true
				store.players[playerIndex].restaurants.pop()
				mapMod.addElement(rf.TYPE_RESTAURANT, colour, index, false, true)
			}
		}
	}
	return false
}

describe("stadium map generation", () => {
	it("places both arena half-tiles adjacently (horizontal or vertical)", () => {
		const store = freshGame()
		const tiles = store.mapData.tiles

		// tiles is a flat [tileId, rotation] pair array over a 17x16 tile grid
		let pos27 = -1
		let pos28 = -1
		for (let i = 0; i < tiles.length; i += 2) {
			if (tiles[i] === 27 && pos27 === -1) pos27 = i
			if (tiles[i] === 28 && pos28 === -1) pos28 = i
		}
		expect(pos27).toBeGreaterThan(-1)
		expect(pos28).toBeGreaterThan(-1)

		// Tile origins in pair-space: adjacency = right neighbour or the tile below
		const pair27 = pos27 / 2
		const pair28 = pos28 / 2
		expect(pair28 === pair27 + 1 || pair28 === pair27 + 17).toBe(true)

		// Both share the same rotation (0 = horizontal pair, 1 = vertical pair)
		expect(tiles[pos27 + 1]).toBe(tiles[pos28 + 1])
		expect([0, 1]).toContain(tiles[pos27 + 1])

		// The arena is one continuous pseudo-house: 2 half-tiles x 12 cells
		let cells = 0
		for (let i = 0; i < store.mapData.coords.length; i++) {
			if (store.mapData.coords[i] === rf.HOUSE + rf.STADIUM) cells++
		}
		expect(cells).toBe(24)

		// House lookup works
		expect(mapMod.findIndexForHouse(rf.STADIUM)).toBeGreaterThan(-1)
	})

	it("measures restaurant range from the full arena footprint, not the anchor corner", () => {
		let verified = false
		for (let mapAttempt = 0; mapAttempt < 5 && !verified; mapAttempt++) {
			const store = freshGame()
			const anchor = mapMod.findIndexForHouse(rf.STADIUM)
			const arenaCells = []
			for (let i = 0; i < store.mapData.coords.length; i++) {
				if (store.mapData.coords[i] === rf.HOUSE + rf.STADIUM) arenaCells.push(i)
			}
			// The arena cell furthest from the generic 2x2 zone the old code measured from
			const centre = arenaCells.reduce((a, b) => (Math.abs(b - anchor) > Math.abs(a - anchor) ? b : a))
			const oldZone = [anchor, anchor + 1, anchor + rf.ssW, anchor + rf.ssW + 1]
			if (oldZone.includes(centre)) continue

			// Place a restaurant on the ring road next to that far-side cell
			for (let dy = -2; dy <= 2 && !verified; dy++) {
				for (let dx = -3; dx <= 3 && !verified; dx++) {
					const index = centre + dy * rf.ssW + dx
					if (index < 0 || index >= store.mapData.coords.length) continue
					for (let rotation = 0; rotation < 4 && !verified; rotation++) {
						mapMod.addElement(rf.TYPE_RESTAURANT, store.players[0].colour, index, false)
						store.players[0].restaurants.push({ index, rotation, open: true })
						const d = model.giveRestaurantRangesForHouse(rf.STADIUM)[0]
						if (d !== -99 && d !== undefined) {
							// Pre-fix (anchor 2x2 only) this far-side spot measured 3+ crossings;
							// from the true nearest arena cell it is at most 2
							expect(d).toBeLessThanOrEqual(2)
							verified = true
						} else {
							store.players[0].restaurants.pop()
							mapMod.addElement(rf.TYPE_RESTAURANT, store.players[0].colour, index, false, true)
						}
					}
				}
			}
		}
		expect(verified).toBe(true)
	})
})

describe("stadium announcement schedule", () => {
	it("creates the announcement exactly 2 turns before game 1 (turn 5)", () => {
		const store = freshGame()
		rules.stadiumEndOfTurn(2)
		expect(store.stadium.announcement).toBeNull()
		rules.stadiumEndOfTurn(3)
		expect(store.stadium.announcement).not.toBeNull()
		expect(store.stadium.announcement.gameNumber).toBe(1)
		expect(store.stadium.announcement.units).toBe(6)
		expect([rf.PIZZA, rf.BURGER]).toContain(store.stadium.announcement.food)
		// The announcement goes public in the shared history right away (normal lead)
		expect(store.history.some((h) => h[0] === rf.HIST_STADIUM_ANNOUNCE)).toBe(true)
	})

	it("scales units 6/12/16 and follows the every-3-turns schedule", () => {
		const store = freshGame()
		// game 2 -> turn 8, announced at end of turn 6
		store.stadium.gamesPlayed = 1
		rules.stadiumEndOfTurn(5)
		expect(store.stadium.announcement).toBeNull()
		rules.stadiumEndOfTurn(6)
		expect(store.stadium.announcement.gameNumber).toBe(2)
		expect(store.stadium.announcement.units).toBe(12)
		// game 3+ -> 16 units
		store.stadium.gamesPlayed = 2
		store.stadium.announcement = null
		rules.stadiumEndOfTurn(9)
		expect(store.stadium.announcement.units).toBe(16)
	})

	it("announces 3 turns ahead once a player has the milestone, but the history stays private until the normal lead", () => {
		const store = freshGame()
		store.players[0].milestones.push(rf.FIRST_STADIUM_SOLD)
		rules.stadiumEndOfTurn(1)
		expect(store.stadium.announcement).toBeNull()
		rules.stadiumEndOfTurn(2)
		expect(store.stadium.announcement).not.toBeNull()
		expect(store.stadium.announcement.gameNumber).toBe(1)
		// Early knowledge only: no shared history entry yet (everyone else must not see it)
		expect(store.history.some((h) => h[0] === rf.HIST_STADIUM_ANNOUNCE)).toBe(false)
		rules.stadiumEndOfTurn(3)
		// At the normal 2-turn lead the announcement becomes public
		expect(store.history.some((h) => h[0] === rf.HIST_STADIUM_ANNOUNCE)).toBe(true)
	})
})

describe("stadium game-day demand (display helper)", () => {
	it("returns the announced demand on the game day itself", () => {
		const store = freshGame()
		store.stadium.announcement = { gameNumber: 1, food: rf.PIZZA, units: 6 }
		expect(rules.stadiumGameDayDemand()).toEqual({ food: rf.PIZZA, units: 6 })
	})

	it("returns null before the game day, even once the announcement is public", () => {
		const store = freshGame()
		store.gameflow.turn = 4 // game 1 is on turn 5, announcement public since turn 3
		store.stadium.announcement = { gameNumber: 1, food: rf.PIZZA, units: 6 }
		expect(rules.stadiumGameDayDemand()).toBeNull()
	})

	it("follows the every-3-turns schedule after the first game", () => {
		const store = freshGame()
		store.stadium.gamesPlayed = 1 // next game day is turn 8
		store.stadium.announcement = { gameNumber: 2, food: rf.BURGER, units: 12 }
		store.gameflow.turn = 7
		expect(rules.stadiumGameDayDemand()).toBeNull()
		store.gameflow.turn = 8
		expect(rules.stadiumGameDayDemand()).toEqual({ food: rf.BURGER, units: 12 })
	})

	it("returns null without the stadium option", () => {
		const store = freshGame(2, [rf.SO_SHORT_GAME])
		store.stadium.announcement = { gameNumber: 1, food: rf.PIZZA, units: 6 }
		expect(rules.stadiumGameDayDemand()).toBeNull()
	})
})

describe("stadium game day settlement", () => {
	it("winner takes all: full stock threshold, single payment, milestone, schedule advances", () => {
		const store = freshGame()
		store.stadium.announcement = { gameNumber: 1, food: rf.PIZZA, units: 6 }
		store.players[0].resources = Array(6).fill(rf.PIZZA)

		// Find a restaurant spot with road access to the arena
		const stadiumIndex = mapMod.findIndexForHouse(rf.STADIUM)
		expect(stadiumIndex).toBeGreaterThan(-1)
		const placed = tryPlaceRestaurantNear(store, 0, stadiumIndex)
		expect(placed).toBe(true)

		const moneyBefore = store.players[0].money
		rules.doDinnerTime(false)

		// The injected need is fully consumed and removed
		expect(store.needs.some((n) => n.number === rf.STADIUM)).toBe(false)
		// Winner sold all 6, stock emptied
		expect(store.players[0].resources.filter((r) => r === rf.PIZZA).length).toBe(0)
		// Winner-takes-all payment: 6 units x base price, paid once
		const price = plyr.playersPrice(0)
		expect(store.players[0].money - moneyBefore).toBeGreaterThanOrEqual(6 * price)
		// The arena is not a garden house - no price doubling
		expect(model.hasGarden(rf.STADIUM)).toBe(false)
		// Schedule advanced, announcement consumed
		expect(store.stadium.gamesPlayed).toBe(1)
		expect(store.stadium.announcement).toBeNull()
		// Milestone awarded to the winner
		expect(plyr.hasMilestone(0, rf.FIRST_STADIUM_SOLD)).toBe(true)
		// History entries recorded (announce happens controller-side; result here)
		const resultEntry = store.history.find((h) => h[0] === rf.HIST_STADIUM_RESULT)
		expect(resultEntry).toBeTruthy()
		expect(resultEntry[3][0]).toBe(0)
		expect(resultEntry[3][2]).toBe(6)
	})

	it("partial stock is NOT enough: nobody qualifies, demand clears to zero, no milestone", () => {
		const store = freshGame()
		store.stadium.announcement = { gameNumber: 1, food: rf.PIZZA, units: 6 }
		store.players[0].resources = Array(5).fill(rf.PIZZA) // one short

		const stadiumIndex = mapMod.findIndexForHouse(rf.STADIUM)
		const placed = tryPlaceRestaurantNear(store, 0, stadiumIndex)
		expect(placed).toBe(true)

		const moneyBefore = store.players[0].money
		rules.doDinnerTime(false)

		// Demand cleared without a sale
		expect(store.needs.some((n) => n.number === rf.STADIUM)).toBe(false)
		expect(store.players[0].resources.filter((r) => r === rf.PIZZA).length).toBe(5)
		expect(store.players[0].money).toBe(moneyBefore)
		expect(store.stadium.gamesPlayed).toBe(1)
		expect(store.stadium.announcement).toBeNull()
		expect(plyr.hasMilestone(0, rf.FIRST_STADIUM_SOLD)).toBe(false)
		const resultEntry = store.history.find((h) => h[0] === rf.HIST_STADIUM_RESULT)
		expect(resultEntry[3][0]).toBe(-1)
	})

	it("no injection on non-game turns even with a pending announcement", () => {
		const store = freshGame()
		store.gameflow.turn = 6 // game 1 is on turn 5
		store.stadium.announcement = { gameNumber: 1, food: rf.BURGER, units: 6 }
		rules.doDinnerTime(true)
		expect(store.needs.some((n) => n.number === rf.STADIUM)).toBe(false)
		expect(store.stadium.gamesPlayed).toBe(0)
		expect(store.stadium.announcement).not.toBeNull()
	})

	it("game-day sale triggers the coffee module for shops on the delivery route", () => {
		let sold = false
		for (let mapAttempt = 0; mapAttempt < 3 && !sold; mapAttempt++) {
			const store = freshGame(2, [rf.SO_COFFEE, "47"])
			const stadiumIndex = mapMod.findIndexForHouse(rf.STADIUM)
			if (!tryPlaceRestaurantNear(store, 0, stadiumIndex)) continue

			// Seed a stocked shop on empty land next to a road that every
			// surviving delivery route walks (getCoffeeRoute's common
			// squares) - a real-game-legal spot that must sell on game day.
			const winnerDist = model.giveRestaurantRangesForHouse(rf.STADIUM)[0]
			const commonSquares = model.getCoffeeRoute(rf.STADIUM, 0, winnerDist)[1]
			const candidates = []
			for (const r of commonSquares) {
				for (const s of [r + 1, r - 1, r + rf.ssW, r - rf.ssW]) {
					if (s >= 0 && s < store.mapData.coords.length && store.mapData.coords[s] === rf.EMPTY_SPACE && !candidates.includes(s)) candidates.push(s)
				}
			}

			for (const shop of candidates) {
				store.stadium.gamesPlayed = 0
				store.stadium.announcement = { gameNumber: 1, food: rf.PIZZA, units: 6 }
				store.players[0].resources = Array(6).fill(rf.PIZZA)
				store.players[1].coffeeShops = [shop]
				store.mapData.coords[shop] = 160 + store.players[1].colour
				store.players[1].resources = [rf.COFFEE, rf.COFFEE]
				const before = store.players[1].money
				rules.doDinnerTime(false)
				if (store.players[1].money > before) {
					sold = true
					break
				}
				store.mapData.coords[shop] = rf.EMPTY_SPACE
			}
		}
		expect(sold).toBe(true)
	})

	it("coffee walk laps the whole arena ring: shops on BOTH half-tiles sell even when the winner only touches one half", () => {
		// The arena spans two tiles but is ONE building - moving between its
		// halves is free. With the winner at distance 1 from one half, the
		// walk covers the full ring (both halves) and shops next to either
		// half's ring road must both sell. Pre-fix only the winner-side
		// shop sold: reaching the far half cost a tile crossing and the
		// walk blew its distance budget.
		let verified = false
		for (let mapAttempt = 0; mapAttempt < 5 && !verified; mapAttempt++) {
			const store = freshGame(2, [rf.SO_COFFEE, "47"])

			// Group arena cells by tile - the arena must span exactly 2 tiles
			const arenaByTile = new Map()
			for (let i = 0; i < store.mapData.coords.length; i++) {
				if (store.mapData.coords[i] === rf.HOUSE + rf.STADIUM) {
					const t = mapMod.giveTileNumber(i)
					if (!arenaByTile.has(t)) arenaByTile.set(t, [])
					arenaByTile.get(t).push(i)
				}
			}
			if (arenaByTile.size !== 2) continue
			const pairTiles = new Set(arenaByTile.keys())

			// Ring road squares adjacent to arena cells, per half
			const ringOf = (tile) => {
				const ring = new Set()
				for (const cell of arenaByTile.get(tile)) {
					for (const n of [cell + 1, cell - 1, cell + rf.ssW, cell - rf.ssW]) {
						if (n >= 0 && n < store.mapData.coords.length && store.mapData.coords[n] === rf.ROAD) ring.add(n)
					}
				}
				return ring
			}
			const ringA = ringOf([...pairTiles][0])
			const ringB = ringOf([...pairTiles][1])
			if (ringA.size === 0 || ringB.size === 0) continue

			// Empty lots outside the arena pair, adjacent to a given ring half
			const lotsNextTo = (ring) => {
				const lots = []
				for (const r of ring) {
					for (const s of [r + 1, r - 1, r + rf.ssW, r - rf.ssW]) {
						if (s >= 0 && s < store.mapData.coords.length && store.mapData.coords[s] === rf.EMPTY_SPACE && !pairTiles.has(mapMod.giveTileNumber(s)) && !lots.includes(s)) lots.push(s)
					}
				}
				return lots
			}

			// Winner restaurant on a lot next to half A's ring, at distance 1
			// from the arena (the far half is then only reachable for free)
			let restoIdx = -1
			for (const s of lotsNextTo(ringA)) {
				const cells = [s, s + 1, s + rf.ssW, s + rf.ssW + 1]
				if (cells.some((c) => c < 0 || c >= store.mapData.coords.length || store.mapData.coords[c] !== rf.EMPTY_SPACE)) continue
				mapMod.addElement(rf.TYPE_RESTAURANT, store.players[0].colour, s, false)
				store.players[0].restaurants.push({ index: s, rotation: 0, open: true })
				if (model.giveRestaurantRangesForHouse(rf.STADIUM)[0] === 1) {
					restoIdx = s
					break
				}
				store.players[0].restaurants.pop()
				mapMod.addElement(rf.TYPE_RESTAURANT, store.players[0].colour, s, false, true)
			}
			if (restoIdx === -1) continue
			const restoCells = new Set([restoIdx, restoIdx + 1, restoIdx + rf.ssW, restoIdx + rf.ssW + 1])

			// A stocked shop next to EACH half's ring road (both owned by player 1)
			const shopNear = (ring) => lotsNextTo(ring).find((s) => !restoCells.has(s))
			const shopA = shopNear(ringA)
			const shopB = shopNear(ringB)
			if (shopA === undefined || shopB === undefined) continue

			store.players[1].coffeeShops = [shopA, shopB]
			store.mapData.coords[shopA] = 160 + store.players[1].colour
			store.mapData.coords[shopB] = 160 + store.players[1].colour
			store.players[1].resources = [rf.COFFEE, rf.COFFEE]

			store.stadium.gamesPlayed = 0
			store.stadium.announcement = { gameNumber: 1, food: rf.PIZZA, units: 6 }
			store.players[0].resources = Array(6).fill(rf.PIZZA)
			rules.doDinnerTime(false)

			// Both shops sold - the walk lapped the whole ring
			expect(store.players[1].resources.filter((r) => r === rf.COFFEE).length).toBe(0)
			verified = true
		}
		expect(verified).toBe(true)
	})

	it("free arena crossing is arena-only: a walk seeded next to the ring still pays tile crossings", () => {
		// Regression for the over-broad first version: regular houses' coffee
		// walks (seeded on a non-arena tile) must count the arena's two tiles
		// as normal map tiles. Only the arena's own game-day walk treats the
		// pair as one building.
		let verified = false
		for (let mapAttempt = 0; mapAttempt < 5 && !verified; mapAttempt++) {
			const store = freshGame(2, [rf.SO_COFFEE, "47"])

			// Adjacent ring-road squares across the arena tile boundary
			let rA = -1
			let rB = -1
			for (let i = 0; i < store.mapData.coords.length && rA === -1; i++) {
				if (store.mapData.coords[i] !== rf.ROAD) continue
				for (const n of [i + 1, i - 1, i + rf.ssW, i - rf.ssW]) {
					if (n >= 0 && n < store.mapData.coords.length && store.mapData.coords[n] === rf.ROAD) {
						const tI = mapMod.giveTileNumber(i)
						const tN = mapMod.giveTileNumber(n)
						if (tI !== tN && store.mapData.coords[i] !== undefined) {
							// both roads adjacent to arena cells?
							const nearArena = (sq) => [sq + 1, sq - 1, sq + rf.ssW, sq - rf.ssW].some((m) => m >= 0 && m < store.mapData.coords.length && store.mapData.coords[m] === rf.HOUSE + rf.STADIUM)
							if (nearArena(i) && nearArena(n)) {
								rA = i
								rB = n
								break
							}
						}
					}
				}
			}
			if (rA === -1) continue

			// A square on a THIRD tile touching rA (simulates a house next to
			// the ring) and one touching rB (the restaurant's entrance square)
			const thirdTileSq = (r) => {
				for (const s of [r + 1, r - 1, r + rf.ssW, r - rf.ssW]) {
					if (s >= 0 && s < store.mapData.coords.length) {
						const t = mapMod.giveTileNumber(s)
						if (t !== mapMod.giveTileNumber(rA) && t !== mapMod.giveTileNumber(rB)) return s
					}
				}
				return -1
			}
			const seedHouse = thirdTileSq(rA)
			const restoSq = thirdTileSq(rB)
			if (seedHouse === -1 || restoSq === -1) continue

			// An arena cell adjacent to rA seeds the game-day walk
			let seedArena = -1
			for (const s of [rA + 1, rA - 1, rA + rf.ssW, rA - rf.ssW]) {
				if (s >= 0 && s < store.mapData.coords.length && store.mapData.coords[s] === rf.HOUSE + rf.STADIUM) {
					seedArena = s
					break
				}
			}
			if (seedArena === -1) continue

			const restaurants = [restoSq]

			// Arena-seeded walk: ringA -> ringB is free, restaurant reachable in 1
			const arenaRoutes = mapMod.getCoffeeRoutesFromBldgSquare(seedArena, restaurants, 1)
			expect(arenaRoutes.some((route) => route.includes(rA) && route.includes(rB))).toBe(true)

			// House-seeded walk: reaching the far half now costs a real
			// crossing, so nothing reaches the restaurant within range 1
			const houseRoutes = mapMod.getCoffeeRoutesFromBldgSquare(seedHouse, restaurants, 1)
			expect(houseRoutes.length).toBe(0)

			verified = true
		}
		expect(verified).toBe(true)
	})

	it("after game 1 is won, the next announcement is created at the end of the same turn (end to end)", () => {
		const store = freshGame()
		store.stadium.announcement = { gameNumber: 1, food: rf.PIZZA, units: 6 }
		store.players[0].resources = Array(6).fill(rf.PIZZA)
		const stadiumIndex = mapMod.findIndexForHouse(rf.STADIUM)
		expect(tryPlaceRestaurantNear(store, 0, stadiumIndex)).toBe(true)

		// Turn 5: game day - player 0 wins and takes the milestone
		rules.doDinnerTime(false)
		expect(store.stadium.gamesPlayed).toBe(1)
		expect(plyr.hasMilestone(0, rf.FIRST_STADIUM_SOLD)).toBe(true)

		// End of turn 5 clean-up: the game-2 announcement must exist (milestone lead 3)
		rules.stadiumEndOfTurn(5)
		expect(store.stadium.announcement).not.toBeNull()
		expect(store.stadium.announcement.gameNumber).toBe(2)
		expect(store.stadium.announcement.units).toBe(12)
		// ...but it is still private: no public history entry yet
		expect(store.history.some((h) => h[0] === rf.HIST_STADIUM_ANNOUNCE && h[3][0] === 2)).toBe(false)

		// End of turn 6 clean-up: it becomes public
		rules.stadiumEndOfTurn(6)
		expect(store.history.some((h) => h[0] === rf.HIST_STADIUM_ANNOUNCE && h[3][0] === 2)).toBe(true)
	})
})

describe("stadium wire-format persistence", () => {
	it("exportFCMmodel carries the stadium state and restoreStadiumState reads it back", () => {
		const store = freshGame()
		store.stadium.gamesPlayed = 1
		store.stadium.announcement = { gameNumber: 2, food: rf.NOODLES, units: 12 }

		const b64 = funcs.exportFCMmodel(false, false)
		const decoded = JSON.parse(pako.ungzip(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), { to: "string" }))
		// The bailout module isn't chosen in these games, so the stadium slot is last
		const stadiumSlot = decoded[decoded.length - 1]
		expect(stadiumSlot).toEqual([1, [2, rf.NOODLES, 12]])

		// Restore into a clean store
		const store2 = freshGame()
		expect(store2.stadium.announcement).toBeNull()
		funcs.restoreStadiumState(decoded)
		expect(store2.stadium.gamesPlayed).toBe(1)
		expect(store2.stadium.announcement.gameNumber).toBe(2)
		expect(store2.stadium.announcement.food).toBe(rf.NOODLES)
	})

	it("exports a bare [gamesPlayed] slot when there is no announcement", () => {
		const store = freshGame()
		store.stadium.gamesPlayed = 2
		store.stadium.announcement = null

		const b64 = funcs.exportFCMmodel(false, false)
		const decoded = JSON.parse(pako.ungzip(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), { to: "string" }))
		expect(decoded[decoded.length - 1]).toEqual([2])

		funcs.restoreStadiumState(decoded)
		expect(store.stadium.gamesPlayed).toBe(2)
		expect(store.stadium.announcement).toBeNull()
	})

	it("omits the slot when the stadium module was not chosen", () => {
		const store = freshGame(2, []) // stadium flag off
		store.stadium.gamesPlayed = 5

		const b64 = funcs.exportFCMmodel(false, false)
		const decoded = JSON.parse(pako.ungzip(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), { to: "string" }))
		expect(decoded[decoded.length - 1]).not.toEqual([5])

		// ...and a stray slot in someone else's save is ignored (no scan without the flag)
		const store2 = freshGame(2, [])
		funcs.restoreStadiumState([...decoded, [5]])
		expect(store2.stadium.gamesPlayed).toBe(0)
	})

	it("restoreStadiumState still reads the older full JSON slot", () => {
		const store = freshGame()
		funcs.restoreStadiumState(["legacy", "save", { gamesPlayed: 3, announcement: { gameNumber: 4, food: rf.PIZZA, units: 10 } }])
		expect(store.stadium.gamesPlayed).toBe(3)
		expect(store.stadium.announcement.gameNumber).toBe(4)
		expect(store.stadium.announcement.units).toBe(10)
	})

	it("restoreStadiumState ignores slots it does not recognise", () => {
		const store = freshGame()
		store.history.push([rf.HIST_STADIUM_RESULT, 0, 0, [0, rf.PIZZA, 6]])
		funcs.restoreStadiumState(["legacy", "save", [0, 5000]])
		expect(store.stadium.gamesPlayed).toBe(1)
		expect(store.stadium.announcement).toBeNull()
	})

	it("restoreStadiumState rebuilds gamesPlayed and a pending announcement from history for older saves", () => {
		const store = freshGame()
		store.history.push([rf.HIST_STADIUM_ANNOUNCE, -1, 0, [1, rf.PIZZA, 6]])
		store.history.push([rf.HIST_STADIUM_RESULT, 0, 0, [0, rf.PIZZA, 6]])
		store.history.push([rf.HIST_STADIUM_ANNOUNCE, -1, 0, [2, rf.BURGER, 12]])

		funcs.restoreStadiumState(["legacy", "save", "without", "stadium", "slot"])
		expect(store.stadium.gamesPlayed).toBe(1)
		expect(store.stadium.announcement.gameNumber).toBe(2)
		expect(store.stadium.announcement.food).toBe(rf.BURGER)
		expect(store.stadium.announcement.units).toBe(12)
	})
})
