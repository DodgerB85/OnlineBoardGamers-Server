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

let controller, IO, mapMod, model, plyr, rf, rules, useModelStore

beforeAll(async () => {
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	controller = await import("./FCMcontroller.js")
	IO = await import("../backend/FCM_IO.js")
	mapMod = await import("./FCMmap.js")
	model = await import("./FCMmodel.js")
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
		additionalCampaignArrayIndex: -1,
		additionalMarketedGood: [],
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

describe("train-from-hire salary discount", () => {
	it("counts the train-from-hire as a used recruiting action", () => {
		const store = useModelStore()
		store.players.push(makePlayer(0, { employees: [rf.RECRUITING_MANAGER, rf.BURGER_COOK, rf.BURGER_COOK, rf.BURGER_COOK] }))
		store.history.push([rf.HIST_HIRE, 0, 0, [rf.BURGER_COOK], 1])
		// 4 x $5 salary, 3 recruiting actions, 1 direct hire + 1 train-from-hire
		// used => one unused action => $5 discount.
		expect(rules.salary(0)).toBe(15)
	})
})

describe("short game", () => {
	it("disables milestones in the starting options", () => {
		const store = useModelStore()
		model.setInternalStartingOptions([rf.SO_SHORT_GAME])
		expect(store.startingOptions.shortGame).toBe(true)
		expect(store.startingOptions.useMilestones).toBe(false)
	})
})

describe("cancelling a Brand Manager selection", () => {
	it("rolls back milestones that were only awarded by opening the selection", () => {
		const store = useModelStore()
		store.players.push(makePlayer(0, { employees: [rf.BRAND_MANAGER] }))
		store.gameflow.turnOrder = [0]
		store.availableMilestones = [rf.FIRST_MARKETEER_USED, rf.FIRST_BRAND_MANAGER_USED]
		store.availableMarketingCampaigns = [4, 11]

		controller.selectMarketer(rf.BRAND_MANAGER, false)
		expect(store.players[0].milestones).toEqual([rf.FIRST_MARKETEER_USED, rf.FIRST_BRAND_MANAGER_USED])

		controller.cancelMarketer()
		expect(store.players[0].milestones).toEqual([])
		expect(store.history.filter((entry) => entry[0] === rf.HIST_NEW_MILESTONE && entry[1] === 0)).toEqual([])
	})

	it("does not remove a milestone the player already held", () => {
		const store = useModelStore()
		store.players.push(makePlayer(0, { employees: [rf.BRAND_MANAGER], milestones: [rf.FIRST_MARKETEER_USED] }))
		store.gameflow.turnOrder = [0]
		store.availableMilestones = [rf.FIRST_BRAND_MANAGER_USED]
		store.availableMarketingCampaigns = [4, 11]

		controller.selectMarketer(rf.BRAND_MANAGER, false)
		controller.cancelMarketer()
		expect(store.players[0].milestones).toEqual([rf.FIRST_MARKETEER_USED])
	})
})

describe("repeat route stop bubble", () => {
	it("only shows after a repeat when range is gone or all exits stay on the tile", () => {
		useModelStore().mapData.dimensions = [10, 10]
		const a = mapMod.giveIndex(0, 0)
		const sameTile = a + 1
		const offTile = mapMod.giveIndex(6, 6)

		expect(rules.shouldStopRepeatRoute([a, sameTile], [offTile], 2)).toBe(false)
		expect(rules.shouldStopRepeatRoute([a, sameTile, a], [offTile], 2)).toBe(false)
		expect(rules.shouldStopRepeatRoute([a, sameTile, a], [sameTile], 2)).toBe(true)
		expect(rules.shouldStopRepeatRoute([a, sameTile, a], [offTile], 0)).toBe(true)
	})

	it("ignores a repeat left behind on an earlier tile", () => {
		useModelStore().mapData.dimensions = [10, 10]
		const a = mapMod.giveIndex(0, 0)
		const sameTile = a + 1
		const offTile = mapMod.giveIndex(6, 6)

		expect(rules.shouldStopRepeatRoute([a, sameTile, a, offTile], [offTile + 1], 0)).toBe(false)
		expect(rules.shouldStopRepeatRoute([offTile, offTile + 1, offTile], [offTile + 1], 0)).toBe(true)
	})
})

describe("route preview range", () => {
	it("counts entering the hovered tile before tracing the no-choice road", () => {
		const store = useModelStore()
		store.mapData.dimensions = [17, 16]
		const coords = new Array(rf.ssW * rf.ssH).fill(rf.EMPTY_SPACE)
		const y = 20
		for (let x = 15; x <= 35; x++) coords[mapMod.giveIndex(x, y)] = rf.ROAD
		store.mapData.coords = coords

		const from = mapMod.giveIndex(19, y) // previous tile
		const target = mapMod.giveIndex(20, y) // entering this tile uses the last range
		const preview = rules.nextRoadPossibilities(target, from, 1)

		expect(preview.path.every((idx) => mapMod.onTheSameTile(idx, target))).toBe(true)
		expect(preview.range).toBe(0)
	})
})

describe("dinner tie-breakers", () => {
	const base = { price: 10, distance: 0, waitress: 0, order: 0 }

	it("a better Movie Star beats Jazz Musicians", () => {
		const bStar = { ...base, emp: [rf.B_MOVIE_STAR], musicians: 3 }
		const cStar = { ...base, emp: [rf.C_MOVIE_STAR], musicians: 0 }
		expect(rules.compareDinnerCompetitors(bStar, cStar)).toBeLessThan(0)
	})

	it("without Movie Stars, fewer Jazz Musicians wins", () => {
		const quiet = { ...base, emp: [], musicians: 0 }
		const loud = { ...base, emp: [], musicians: 3 }
		expect(rules.compareDinnerCompetitors(quiet, loud)).toBeLessThan(0)
	})

	it("price + distance remains the primary factor", () => {
		const cheap = { ...base, price: 9, emp: [] }
		const closeButPricier = { ...base, price: 10, distance: 0, emp: [rf.B_MOVIE_STAR] }
		expect(rules.compareDinnerCompetitors(cheap, closeButPricier)).toBeLessThan(0)
	})
})

describe("First to pay $20 in salaries", () => {
	it("is not awarded when First Trainer Used means no cash was actually paid", () => {
		const store = useModelStore()
		store.players.push(makePlayer(0, { employees: Array(4).fill(rf.BURGER_COOK), milestones: [rf.FIRST_TRAINER_USED] }))
		store.availableMilestones = [rf.FIRST_20_SALARIES]

		rules.paySalaries([[]])
		expect(store.players[0].milestones).not.toContain(rf.FIRST_20_SALARIES)

		store.players[0].money = 20
		rules.paySalaries([[]])
		expect(store.players[0].milestones).toContain(rf.FIRST_20_SALARIES)
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
