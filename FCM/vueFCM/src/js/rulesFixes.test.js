/**
 * Regression tests for small rules fixes:
 * - pizza-bomb queue trimming keeps complete [marker, house, player] groups
 * - no usable reserve cards keeps CEO slots at 3 and base price at $10
 * - the Dumplings CEO price action counts for First Discount Manager Used
 * - round 1 of starting restaurants leads into round 2
 * - a CFO on the beach is fired by First to have $100
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

let controller, IO, plyr, rf, rules, useModelStore

beforeAll(async () => {
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	controller = await import("./FCMcontroller.js")
	IO = await import("../backend/FCM_IO.js")
	plyr = await import("./FCMplayer.js")
	rf = await import("./FCMreference.js")
	rules = await import("./FCMrules.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function makePlayer(index, overrides = {}) {
	return {
		name: `P${index + 1}`,
		displayName: `P${index + 1}`,
		money: 0,
		employees: [],
		beach: [],
		marketers: [],
		milestones: [],
		resources: [],
		restaurants: [],
		ceoSlots: 3,
		ceoAction: rf.CEO_ACTION_HIRE_1,
		OOBpreference: "0",
		...overrides,
	}
}

beforeEach(() => {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
})

describe("pizza-bomb queue", () => {
	it("drops whole trailing groups so house and player stay paired", () => {
		const queue = [1, 11, 0, 1, 22, 1, 1, 33, 2]
		rules.trimPizzaBombQueue(queue, 1)
		expect(queue).toEqual([1, 11, 0])
	})

	it("keeps the first two groups when two radios are available", () => {
		const queue = [1, 11, 0, 1, 22, 1, 1, 33, 2]
		rules.trimPizzaBombQueue(queue, 2)
		expect(queue).toEqual([1, 11, 0, 1, 22, 1])
	})

	it("empties the queue when no radios are available", () => {
		const queue = [1, 11, 0, 1, 22, 1]
		rules.trimPizzaBombQueue(queue, 0)
		expect(queue).toEqual([])
	})
})

describe("bank break without usable reserve cards", () => {
	it("keeps 3 CEO slots and the $10 base price", () => {
		const store = useModelStore()
		store.players.push(makePlayer(0), makePlayer(1))
		store.reserveCards = [rf.RES_CARD_NONE, rf.RES_CARD_NONE]
		store.startingOptions.reservePrice = true
		store.bankBroken = 0
		store.bank = 0

		rules.handleBankBreak(false)

		expect(store.ceoLevel).toBe(3)
		expect(rules.basePrice()).toBe(10)
	})
})

describe("First Discount Manager Used", () => {
	it("counts the Dumplings CEO permanent -3 price action", () => {
		const store = useModelStore()
		store.players.push(makePlayer(0, { employees: [rf.TRAINER], ceoAction: rf.CEO_ACTION_PRICE_MINUS_3 }))
		expect(plyr.purePriceDropFromDiscountersForPlayer(0)).toBe(3)
	})
})

describe("starting restaurant rounds", () => {
	it("moves from round 1 to round 2 for unplaced players", async () => {
		const store = useModelStore()
		store.players.push(makePlayer(0, { restaurants: [{ index: 1, rotation: 0, open: true }] }), makePlayer(1))
		store.gameflow.phase = rf.PHASE_SETUP_RESTAURANT1
		store.gameflow.fullTurnOrder = [0, 1]
		store.gameflow.turnOrder = [1]

		await controller.endCurrentPhase()

		expect(store.gameflow.phase).toBe(rf.PHASE_SETUP_RESTAURANT2)
		expect(store.gameflow.turnOrder).toEqual([1])
	})

	it("goes to reserve cards once every player has placed", async () => {
		const store = useModelStore()
		store.players.push(makePlayer(0, { restaurants: [{ index: 1, rotation: 0, open: true }] }), makePlayer(1))
		store.gameflow.phase = rf.PHASE_SETUP_RESTAURANT2
		store.gameflow.fullTurnOrder = [0, 1]
		store.gameflow.turnOrder = [1]
		store.players[1].restaurants = [{ index: 2, rotation: 0, open: true }]

		await controller.endCurrentPhase()

		expect(store.gameflow.phase).toBe(rf.PHASE_SETUP_RESERVE)
	})
})

describe("payday validation", () => {
	it("checks the firing player's First Billboard milestone, not another seat's", () => {
		const store = useModelStore()
		store.players.push(makePlayer(0, { milestones: [rf.FIRST_BILLBOARD] }), makePlayer(1, { beach: [rf.CAMPAIGN_MANAGER] }))

		// Player 1 has no First Billboard, so firing the campaign manager must
		// remove its $5 salary. The old code checked player 0 and rejected this.
		expect(rules.salary(1)).toBe(5)
		expect(IO.checkPaydayDataValid(1, [[rf.CAMPAIGN_MANAGER], []])).toBe(1)
	})
})

describe("Dumplings on the Rural Marketing Area", () => {
	it("a giant billboard adds two dumplings as well as the advertised good", () => {
		const store = useModelStore()
		store.players.push(makePlayer(0))
		store.startingOptions.dumplings = true
		store.campaigns = [{ number: 21, index: 0, rotated: false, good: rf.BURGER, duration: 9, houses: [] }]

		rules.doMarketingCampaigns(false)

		const rural = store.needs.find((n) => n.number === rf.RURAL_MARKETING_AREA)
		expect(rural.needs.filter((sub) => sub[0] === rf.BURGER)).toHaveLength(2)
		expect(rural.needs.filter((sub) => sub[0] === rf.DUMPLING)).toHaveLength(2)
	})
})

describe("First to have $100 with a CFO on the beach", () => {
	it("fires the beach CFO and returns it to the supply", () => {
		const store = useModelStore()
		store.players.push(makePlayer(0, { money: 100, beach: [rf.CFO] }))
		store.availableMilestones = [rf.FIRST_100_DOL]
		const supplyBefore = store.availableEmployees[rf.CFO]

		rules.doDinnerTime(false)

		expect(store.players[0].beach).not.toContain(rf.CFO)
		expect(store.availableEmployees[rf.CFO]).toBe(supplyBefore + 1)
		expect(store.players[0].milestones).toContain(rf.FIRST_100_DOL)
	})
})
