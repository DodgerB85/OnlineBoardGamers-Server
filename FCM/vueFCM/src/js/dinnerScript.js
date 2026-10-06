/**
 * Builds the playback script ("event queue") for a HIST_DINNER_TIME history entry.
 *
 * Each step is one small animation beat. The DinnerAnimation component plays the
 * array either automatically ("Animate") or one step at a time ("Step through").
 *
 * The script is derived entirely from the already-parsed history blocks
 * (HistoryEntry.vue -> computedEntry3.blocks) plus the current map/player state.
 * It does NOT touch game rules.
 *
 * Step shapes:
 *   saleStart : { type, snap, building, playerName, tokens, car, ms, textKey, textParams }
 *   pickup    : { type, tokens, carrying, car, ms, textKey, textParams }
 *   drive     : { type, carrying, car, range, cost, bump, ms, textKey, textParams }
 *   coffee    : { type, carrying, car, range, cost, bump, flare:{pos,amount,playerIndex}, ms, ... }
 *   arrive    : { type, carrying, building, playerName, car, range, cost, bump, income, ms, ... }
 *
 * range/cost follow the real game counting: the count goes up exactly when the
 * car crosses a tile border (or leaves a roadworks square), and bump marks the
 * steps where it went up so the HUD can pulse on those steps only.
 */

import * as rf from "./FCMreference.js"
import * as map from "./FCMmap.js"
import * as model from "./FCMmodel.js"
import * as view from "./FCMview.js"
import { useModelStore } from "../stores/FCMstore.js"
import i18n from "../i18n.js"

// Speed of each animation beat, in milliseconds. Tweak these to retime the playback.
const SPEED_CAR_ARRIVES = 900 // the car slides into position by the house
const SPEED_GATHER_ITEMS = 1100 // the demand shrinks away from the house
const SPEED_CAR = 520 // the car driving onto one road square (in auto mode)
const SPEED_COFFEE_FLASH = 900 // a coffee sales point flashing its income
const SPEED_DELIVER_ITEMS = 1500 // arrival: items fade away, income pops up

// Same token grids MapArea.vue uses, so animated tokens start where the real ones sat.
const GOODS_HOUSE = {
	V: [
		[0.01, 0],
		[0.01, 0.2],
		[0.21, 0.2],
		[0.01, 0.4],
		[0.21, 0.4],
	],
	V2: [
		[0.01, 0],
		[0.01, 0.2],
		[0.21, 0],
		[0.01, 0.4],
		[0.21, 0.4],
	],
	H: [
		[0.01, 0],
		[0.21, 0],
		[0.01, 0.2],
		[0.21, 0.2],
		[0.42, 0],
	],
	H1: [
		[0.01, 0],
		[0.21, 0],
		[0.01, 0.2],
		[0.21, 0.2],
		[0.42, 0.2],
	],
	H2: [
		[0.01, 0],
		[0.01, 0.2],
		[0.21, 0.2],
		[0.42, 0],
		[0.42, 0.2],
	],
}

const GOODS_APARTMENT = [
	[0.01, 0.15],
	[0.01, 0.35],
	[0.21, 0.15],
	[0.21, 0.35],
	[0.42, 0.35],
	[0.42, 0.15],
]

function tokenGood(g) {
	return Array.isArray(g) ? g[0] : g
}

// Centre (px) of a small square, relative to the top-left of #mapTilesDiv.
function centre(index) {
	if (index == null || index < 0) return null
	const sq = useModelStore().refSize / 5
	const [x, y] = view.getXYforSmallSquare(index)
	return { x: x + sq / 2, y: y + sq / 2 }
}

function translateApartmentNumber(number) {
	if (number == 3.2) return 3.14
	if (number == 9.7) return 9.75
	return number
}

function buildingLabel(buildingNumber, isApartment, isRural) {
	if (isRural) return i18n.global.t("history.animRuralLabel")
	if (isApartment) return i18n.global.t("history.animApartmentLabel", { num: translateApartmentNumber(buildingNumber) })
	return i18n.global.t("history.animHouseLabel", { num: buildingNumber })
}

// Start the tokens on the same spots the board draws them for this building.
function tokenPositions(store, buildingNumber, isApartment, goods) {
	const placed = []
	if (!goods || goods.length === 0) return placed
	const sq = store.refSize / 5

	if (isApartment) {
		const apartment = model.findApartment(buildingNumber)
		if (apartment === -1 || apartment.index < 0) return placed
		const [x, y] = view.getXYforSmallSquare(apartment.index)
		goods.forEach((g, i) => {
			const s = GOODS_APARTMENT[i % GOODS_APARTMENT.length]
			placed.push({ good: tokenGood(g), x: x + s[0] * store.refSize, y: y + s[1] * store.refSize })
		})
		return placed
	}

	const houseObj = model.findHouse(buildingNumber)
	if (houseObj === -1 || houseObj.index < 0) return placed
	const [x, y] = view.getXYforSmallSquare(houseObj.index)
	let adjustedX = x
	let adjustedY = y
	const offsetHouse = model.getHouseOffset(buildingNumber)
	let rotated = houseObj.rotated === 1
	if (offsetHouse === -1 || offsetHouse === 2) rotated = true

	let D = GOODS_HOUSE.V
	if (rotated) D = GOODS_HOUSE.H
	if (offsetHouse === 2) D = GOODS_HOUSE.H2
	if (offsetHouse < -1) D = GOODS_HOUSE.V2
	if (offsetHouse === -1) D = GOODS_HOUSE.H1
	if (offsetHouse === -1) adjustedX -= sq
	if (offsetHouse < -1) adjustedY -= sq

	goods.forEach((g, i) => {
		const s = D[i % D.length]
		placed.push({ good: tokenGood(g), x: adjustedX + s[0] * store.refSize, y: adjustedY + s[1] * store.refSize })
	})
	return placed
}

// Building footprint squares the car can leave from.
function buildingZone(buildingNumber, isApartment, isRural) {
	if (isRural) return map.getRuralMarketingZone()
	const index = map.findIndexForHouse(buildingNumber)
	if (index < 0) return []
	if (isApartment) {
		return [index, index + 1, index + rf.ssW, index + rf.ssW + 1, index + rf.ssW * 2, index + rf.ssW * 2 + 1]
	}
	return [index, index + 1, index + rf.ssW, index + rf.ssW + 1]
}

// Shortest drivable route from the building zone to a road square next to the door.
// The door square itself is a building, so "arrived" means a road square
// orthogonally touching it (matches model.giveRestaurantRangesForHouse's reach test).
//
// State is (comingFrom, square), not just square: bridges are flyovers, so the
// ways out of a bridge square depend on the direction of entry (straight-line
// only). Successors come from the game's own nextRoadNeighbours, the same
// function the real range calculation (rangeToRestaurantsFromIndex) expands
// with, so the animated car obeys the exact same movement rules.
// Note the drivable set is rf.ROADS only - ROAD_UC / FREEWAY are never walked
// by the real range calculation either.
export function findRoute(startZone, goalIndex) {
	if (!startZone || startZone.length === 0) return []
	const store = useModelStore()
	const coords = store.mapData.coords

	// parent: stateKey -> previous stateKey (null for zone-adjacent seeds)
	const parent = new Map()
	const queue = []

	// Seed: every road square touching the building footprint. The car "enters"
	// it from the footprint square it touches; a footprint square can't be a
	// bridge, so the straight-line rule can't wrongly bite on the first move.
	for (const sq of map.neighbours(startZone)) {
		if (!rf.ROADS.includes(coords[sq])) continue
		for (const zoneSq of startZone) {
			if (!map.neighbours(zoneSq).includes(sq)) continue
			const key = zoneSq + ":" + sq
			if (parent.has(key)) continue
			parent.set(key, null)
			queue.push({ from: zoneSq, square: sq })
		}
	}

	let head = 0
	let foundKey = null
	while (head < queue.length && foundKey === null) {
		const { from, square } = queue[head++]
		const key = from + ":" + square
		if (square === goalIndex || map.neighbours(square).includes(goalIndex)) {
			foundKey = key
			break
		}
		for (const next of map.nextRoadNeighbours(square, from)) {
			const nextKey = square + ":" + next
			if (parent.has(nextKey)) continue
			parent.set(nextKey, key)
			queue.push({ from: square, square: next })
		}
	}

	if (foundKey === null) return []
	const path = []
	let k = foundKey
	while (k !== null) {
		path.push(Number(k.split(":")[1]))
		k = parent.get(k)
	}
	return path.reverse()
}

// For every coffee row (a selling player), find that player's coffee shop squares.
function coffeeFlareInfos(store, coffeeBlock) {
	const infos = []
	if (!coffeeBlock || !coffeeBlock.rows) return infos
	const ownerOf = new Map()
	for (let p = 0; p < store.players.length; p++) {
		for (const s of store.players[p]?.coffeeShops || []) ownerOf.set(s, p)
	}
	for (const row of coffeeBlock.rows) {
		const playerIndex = store.players.findIndex((p) => p.colour === row.colour)
		if (playerIndex < 0) continue
		for (const [square, pIndex] of ownerOf) {
			if (pIndex !== playerIndex) continue
			const pos = centre(square)
			if (pos) infos.push({ square, pos, playerIndex, amount: row.finalSaleAmount })
		}
	}
	return infos
}

function flaresBeside(infos, square) {
	const nbrs = map.neighbours(square)
	return infos.filter((c) => c.square === square || nbrs.includes(c.square))
}

export function buildDinnerScript(blocks) {
	const store = useModelStore()
	const steps = []
	// History-time demand tokens per house; each house's entry is hidden from the
	// step where its own delivery takes over (its saleStart), shown forever for
	// houses that were never visited (hideAfter = Infinity).
	const overlay = []
	if (!blocks || blocks.length === 0) return { steps, overlay }

	for (let bi = 0; bi < blocks.length; bi++) {
		const block = blocks[bi]
		if (!block || block.kind !== "sale") continue

		const { buildingNumber, isApartment, isRural, goods, sale } = block
		const demandTokens = tokenPositions(store, buildingNumber, isApartment, goods)

		let saleStartIndex = -1
		if (!block.noSale && sale) {
			const winnerIdx = store.players.findIndex((p) => p.colour === sale.winnerColour)
			if (winnerIdx !== -1) {
				const zone = buildingZone(buildingNumber, isApartment, isRural)
				const doors = model.giveRestaurantDoorIndices(winnerIdx, { openOnly: false })
				let route = []
				for (const door of doors) {
					const r = findRoute(zone, door)
					if (r.length > 0 && (route.length === 0 || r.length < route.length)) route = r
				}
				if (route.length > 0) {
					saleStartIndex = steps.length // the saleStart step lands right here
					buildSaleSteps(steps, bi, blocks, demandTokens, zone, route, doors, block, sale, winnerIdx, store)
				}
			}
		}

		if (demandTokens.length > 0) {
			overlay.push({ hideAfter: saleStartIndex >= 0 ? saleStartIndex : Number.POSITIVE_INFINITY, tokens: demandTokens })
		}
	}

	return { steps, overlay }
}

// All the playback steps for one delivered demand block.
function buildSaleSteps(steps, bi, blocks, tokens, zone, route, doors, block, sale, winnerIdx, store) {
	const { isApartment, isRural } = block

	// The door itself is the arrival point; the last road square is where the car parks.
	const arriveSquare = doors.find((d) => d === route[route.length - 1] || map.neighbours(route[route.length - 1]).includes(d))
	const carStart = centre(route[0])
	const arrivePos = centre(arriveSquare)
	if (carStart === null || arrivePos === null) return

	// Walk the route the way the real range calculation counts distance:
	// +1 each time the car crosses a tile border, +1 when it leaves a
	// roadworks square, then a final hop from the parked road square onto
	// the door (same-tile parking is free) plus its roadworks penalty.
	// Steps where the count went up get bump: true so the HUD pulses.
	const price = sale.basePrice ?? 0
	const rwSet = new Set(map.getRoadworkIndexes())
	const seedZoneSquare = zone.find((z) => map.neighbours(z).includes(route[0])) ?? route[0]
	let range = map.onTheSameTile(seedZoneSquare, route[0]) ? 0 : 1
	const driveRanges = []
	for (let i = 1; i < route.length; i++) {
		if (!map.onTheSameTile(route[i - 1], route[i])) range++
		if (rwSet.has(route[i - 1])) range++
		driveRanges.push(range)
	}
	const arriveRange = range + (map.onTheSameTile(route[route.length - 1], arriveSquare) ? 0 : 1) + (rwSet.has(route[route.length - 1]) ? 1 : 0)

	const building = buildingLabel(block.buildingNumber, isApartment, isRural)
	const playerName = store.players[winnerIdx]?.displayName || "?"
	const carrying = tokens.map((t) => t.good)
	const coffeeInfos = coffeeFlareInfos(store, blocks[bi + 1]?.kind === "coffee" ? blocks[bi + 1] : null)

	steps.push({
		type: "saleStart",
		snap: true,
		building,
		playerName,
		tokens,
		car: carStart,
		ms: SPEED_CAR_ARRIVES,
		textKey: "history.animDemandLeaves",
		textParams: { building, player: playerName },
	})
	if (tokens.length > 0) {
		steps.push({ type: "pickup", tokens, carrying, car: carStart, ms: SPEED_GATHER_ITEMS, textKey: "history.animPickup", textParams: {} })
	}

	for (let i = 1; i < route.length; i++) {
		const square = route[i]
		const r = driveRanges[i - 1]
		// Pulse exactly when this leg's tile-border count went up.
		const bump = i > 1 && r > driveRanges[i - 2]
		steps.push({
			type: "drive",
			carrying,
			car: centre(square),
			range: r,
			cost: price + r,
			bump,
			ms: SPEED_CAR,
			textKey: "history.animDrive",
			textParams: {},
		})
		for (const flare of flaresBeside(coffeeInfos, square)) {
			steps.push({
				type: "coffee",
				carrying,
				car: centre(square),
				range: r,
				cost: price + r,
				bump,
				flare,
				ms: SPEED_COFFEE_FLASH,
				textKey: "history.animCoffee",
				textParams: { player: store.players[flare.playerIndex]?.displayName || "?", amount: flare.amount },
			})
		}
	}

	steps.push({
		type: "arrive",
		carrying,
		building,
		playerName,
		car: arrivePos,
		range: arriveRange,
		cost: price + arriveRange,
		bump: arriveRange > range,
		income: sale.finalSaleAmount || 0,
		ms: SPEED_DELIVER_ITEMS,
		textKey: "history.animArrive",
		textParams: { player: playerName, income: sale.finalSaleAmount || 0 },
	})
}