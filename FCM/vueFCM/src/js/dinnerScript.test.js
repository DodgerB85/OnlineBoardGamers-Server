/**
 * dinnerScript.js builds the dinner-time animation event queue from the parsed
 * history blocks. This checks the two things that are easy to get wrong:
 *  - findRoute walks drivable squares and stops on the road square beside the door
 *  - buildDinnerScript emits saleStart, pickup, drive steps, then arrive, with a
 *    coffee beat spliced in when a selling player's shop sits beside the route
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"

describe("dinnerScript", () => {
	let rf, view, buildDinnerScript, findRoute, useModelStore

	beforeAll(async () => {
		globalThis.alert = () => {}
		rf = await import("./FCMreference.js")
		view = await import("./FCMview.js")
		;({ buildDinnerScript, findRoute } = await import("./dinnerScript.js"))
		;({ useModelStore } = await import("../stores/FCMstore.js"))
	})

	// Board: house #3 at index 0, straight road 2-3-4-5, restaurant door on square 6.
	function setupStore() {
		setActivePinia(createPinia())
		const store = useModelStore()
		store.mapData.coords = new Array(rf.ssW * rf.ssH).fill(rf.OFF_BOARD)
		store.mapData.coords[0] = rf.HOUSE + 3
		store.mapData.coords[2] = rf.ROAD
		store.mapData.coords[3] = rf.ROAD
		store.mapData.coords[4] = rf.ROAD
		store.mapData.coords[5] = rf.ROAD
		store.houses.push({ number: 3, index: 0, rotated: 0 })
		store.players.push({
			colour: "blue",
			displayName: "Alice",
			employees: [],
			restaurants: [{ index: 5, rotation: 0, open: true, colour: "blue" }],
			coffeeShops: [89],
		})
		return store
	}

	beforeEach(() => {
		setupStore()
		vi.spyOn(view, "getXYforSmallSquare").mockImplementation((index) => [index * 10, index * 5])
	})

const saleBlock = () => ({
		kind: "sale",
		buildingNumber: 3,
		isApartment: false,
		isRural: false,
		goods: [[rf.BURGER], [rf.PIZZA]],
		noSale: false,
		sale: { winnerColour: "blue", basePrice: 10, finalSaleAmount: 40 },
	})

	it("findRoute drives the road and stops adjacent to the door", () => {
		expect(findRoute([0, 1, rf.ssW, rf.ssW + 1], 6)).toEqual([2, 3, 4, 5])
	})

	it("findRoute goes straight over a bridge instead of turning off it", () => {
		// Row 0: road 2, BRIDGE_H 3, road 4. A road runs underneath (88, 173) and
		// the door (258) is below it. Turning off the bridge at 3 would be the
		// illegal shortcut [2,3,88,173]; the legal route must continue over the
		// bridge to 4, then come down and double back through 89.
		const store = useModelStore()
		store.mapData.coords[3] = rf.BRIDGE_H
		const roadSquares = [88, 89, 173]
		for (const sq of roadSquares) store.mapData.coords[sq] = rf.ROAD
		expect(findRoute([0, 1, rf.ssW, rf.ssW + 1], 258)).toEqual([2, 3, 4, 89, 88, 173])
	})

	it("builds saleStart -> pickup -> drive* -> arrive with tile-border range counting", () => {
		const { steps } = buildDinnerScript([saleBlock()])
		const types = steps.map((s) => s.type)

		expect(types[0]).toBe("saleStart")
		expect(steps[0].tokens).toHaveLength(2)
		expect(types[1]).toBe("pickup")
		expect(types[types.length - 1]).toBe("arrive")

		// Range counts tile-border crossings: everything before square 5 is on
		// the same tile, so only the 4 -> 5 move increments, and it pulses.
		const drives = steps.filter((s) => s.type === "drive")
		expect(drives.map((d) => d.range)).toEqual([0, 0, 1])
		expect(drives.map((d) => d.cost)).toEqual([10, 10, 11])
		expect(drives.map((d) => d.bump)).toEqual([false, false, true])

		const arrive = steps[steps.length - 1]
		expect(arrive.income).toBe(40)
		expect(arrive.range).toBe(1)
		expect(arrive.cost).toBe(11)
		expect(arrive.bump).toBe(false)
	})

	it("splices a coffee beat in when a seller's shop is beside the route", () => {
		const coffee = { kind: "coffee", buildingNumber: 3, rows: [{ colour: "blue", finalSaleAmount: 3 }] }
		const { steps } = buildDinnerScript([saleBlock(), coffee])
		const coffeeSteps = steps.filter((s) => s.type === "coffee")

		expect(coffeeSteps).toHaveLength(1)
		expect(coffeeSteps[0].flare.amount).toBe(3)
		expect(coffeeSteps[0].flare.playerIndex).toBe(0)
		// The flash follows the drive that reaches the shop's square.
		const idx = steps.findIndex((s) => s.type === "coffee")
		expect(steps[idx - 1].type).toBe("drive")
	})

	it("emits no steps for a sale where no route can be found", () => {
		const store = useModelStore()
		store.mapData.coords.fill(rf.OFF_BOARD)
		expect(buildDinnerScript([saleBlock()]).steps).toEqual([])
	})

	it("demands overlay keeps houses visible until their delivery takes over", () => {
		// Animated sale: tokens hide from its own saleStart step (index 0).
		const { steps, overlay } = buildDinnerScript([saleBlock()])
		expect(overlay).toEqual([{ hideAfter: 0, tokens: expect.any(Array) }])
		expect(overlay[0].tokens).toHaveLength(2)

		// Unfulfilled demand (noSale) and unanimatable sales stay visible forever.
		const noSale = { ...saleBlock(), noSale: true, sale: null }
		const again = buildDinnerScript([saleBlock(), { kind: "coffee", buildingNumber: 3, rows: [] }, noSale])
		expect(again.steps).toHaveLength(steps.length)
		expect(again.overlay).toHaveLength(2)
		expect(again.overlay[1].hiddenAfter).toBeUndefined()
		expect(Number.isFinite(again.overlay[1].hideAfter)).toBe(false)
	})
})
