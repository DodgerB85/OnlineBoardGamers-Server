/**
 * Second Bailout mod tests:
 * 1. First break unchanged; second break injects $300 x players and opens the
 *    claim night; third break ends the game.
 * 2. Claims grant one L2 marketer to the beach (not a hire), first come first
 *    served; declining is final; the last claim closes the night.
 * 3. Wire-format persistence of the bailout state.
 */
/* global pako */
import { describe, it, expect, beforeAll } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let funcs, model, mapMod, rf, rules, useModelStore

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
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function freshGame(playerCount = 2, opts = ["49"]) {
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
	store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
	store.reserveCards = []
	store.bank = 0
	store.bankBroken = 0
	store.bailout.pending = false
	store.bailout.pool = {}
	store.bailout.claims = {}
	store.bailout.order = []
	return store
}

describe("bank break stages", () => {
	it("first break stays vanilla: bankBroken 0 -> 1, reserve money added, no bailout", () => {
		const store = freshGame(2)
		// 3-slot card ($200) + 4-slot card ($300)
		store.reserveCards = [rf.RES_CARD_OG_3_SLOTS, rf.RES_CARD_OG_4_SLOTS]
		store.bank = -50

		rules.handleBankBreak(false)

		expect(store.bankBroken).toBe(1)
		expect(store.bank).toBe(-50 + 200 + 300)
		expect(store.bailout.pending).toBe(false)
		expect(store.history.some((h) => h[0] === rf.HIST_BANK_BREAK)).toBe(true)
	})

	it("second break injects $300 per player, sets bankBroken 2 and opens the claim night", () => {
		const store = freshGame(2)
		store.bankBroken = 1
		store.bank = -10
		// The bank breaks during the LAST player's payday, when turnOrder is already empty
		store.gameflow.turnOrder = []

		rules.handleBankBreak(false)

		expect(store.bankBroken).toBe(2)
		expect(store.bank).toBe(-10 + 600)
		expect(store.bailout.pending).toBe(true)
		expect(store.bailout.order).toEqual([0, 1])
		expect(store.bailout.pool).toEqual({ [rf.CAMPAIGN_MANAGER]: 6 })
		expect(store.history.some((h) => h[0] === rf.HIST_BANK_BAILOUT && h[3][0] === 600)).toBe(true)
	})

	it("the pool includes every L2 marketer whose module is enabled", () => {
		const store = freshGame(2, ["49", "17", "13", "15", "45"])
		store.availableEmployees[rf.RURAL_MARKETEER] = 6
		store.availableEmployees[rf.GOURMET_FOOD_CRITIC] = 6
		store.availableEmployees[rf.MASS_MARKETEER] = 6
		store.availableEmployees[rf.HAWKER_MARKETEER] = 6
		store.bankBroken = 1
		store.bank = -10

		rules.handleBankBreak(false)

		expect(store.bailout.pool).toEqual({
			[rf.CAMPAIGN_MANAGER]: 6,
			[rf.RURAL_MARKETEER]: 6,
			[rf.GOURMET_FOOD_CRITIC]: 6,
			[rf.MASS_MARKETEER]: 6,
			[rf.HAWKER_MARKETEER]: 6,
		})
	})

	it("third break ends the game with no further injection", () => {
		const store = freshGame(2)
		store.bankBroken = 2
		store.bank = -10

		rules.handleBankBreak(false)

		expect(store.gameflow.phase).toBe(rf.PHASE_GAME_OVER)
		expect(store.bank).toBe(-10)
		expect(store.bailout.pending).toBe(false)
	})

	it("without the module the second break still ends the game", () => {
		const store = freshGame(2, [])
		store.bankBroken = 1
		store.bank = -10

		rules.handleBankBreak(false)

		expect(store.gameflow.phase).toBe(rf.PHASE_GAME_OVER)
		expect(store.bankBroken).toBe(1)
	})

	it("short games end on the first break regardless of the module", () => {
		const store = freshGame(2, ["49", "1"])
		store.bank = -10

		rules.handleBankBreak(false)

		expect(store.gameflow.phase).toBe(rf.PHASE_GAME_OVER)
	})

	it("an empty market skips the claim night entirely", () => {
		const store = freshGame(2)
		store.availableEmployees[rf.CAMPAIGN_MANAGER] = 0
		store.bankBroken = 1
		store.bank = -10

		rules.handleBankBreak(false)

		expect(store.bailout.pending).toBe(false)
		expect(store.bailout.claims).toEqual({ 0: -1, 1: -1 })
	})
})

describe("claim night", () => {
	function openClaimNight(playerCount = 2) {
		const store = freshGame(playerCount)
		store.bankBroken = 1
		store.bank = -10
		rules.handleBankBreak(false)
		return store
	}

	it("a claim grants the employee to the beach and decrements the market", () => {
		const store = openClaimNight()

		rules.claimBailoutEmployee(0, rf.CAMPAIGN_MANAGER)

		expect(store.players[0].beach).toEqual([rf.CAMPAIGN_MANAGER])
		expect(store.availableEmployees[rf.CAMPAIGN_MANAGER]).toBe(5)
		expect(store.bailout.pool[rf.CAMPAIGN_MANAGER]).toBe(5)
		expect(store.bailout.claims[0]).toBe(rf.CAMPAIGN_MANAGER)
		expect(store.bailout.pending).toBe(true)
		expect(store.history.some((h) => h[0] === rf.HIST_BAILOUT_CLAIM && h[1] === 0)).toBe(true)
		// Not a hire: no milestones awarded by the claim itself
		expect(store.players[0].milestones).toEqual([])
	})

	it("the last claim closes the night", () => {
		const store = openClaimNight()

		rules.claimBailoutEmployee(0, rf.CAMPAIGN_MANAGER)
		rules.claimBailoutEmployee(1, -1)

		expect(store.bailout.pending).toBe(false)
		expect(store.bailout.claims[1]).toBe(-1)
		expect(store.players[1].beach).toEqual([])
	})

	it("a claim is final and cannot be repeated", () => {
		const store = openClaimNight()

		rules.claimBailoutEmployee(0, rf.CAMPAIGN_MANAGER)
		rules.claimBailoutEmployee(0, -1)

		expect(store.bailout.claims[0]).toBe(rf.CAMPAIGN_MANAGER)
		expect(store.players[0].beach.length).toBe(1)
	})

	it("sold-out cards cannot be claimed", () => {
		const store = openClaimNight()
		store.bailout.pool[rf.CAMPAIGN_MANAGER] = 0

		rules.claimBailoutEmployee(0, rf.CAMPAIGN_MANAGER)

		expect(store.bailout.claims[0]).toBeUndefined()
		expect(store.players[0].beach).toEqual([])
	})

	it("first come first served: the market runs out across players", () => {
		const store = openClaimNight(2)
		store.bailout.pool[rf.CAMPAIGN_MANAGER] = 1
		store.availableEmployees[rf.CAMPAIGN_MANAGER] = 1

		rules.claimBailoutEmployee(0, rf.CAMPAIGN_MANAGER)
		rules.claimBailoutEmployee(1, rf.CAMPAIGN_MANAGER)

		expect(store.bailout.claims[0]).toBe(rf.CAMPAIGN_MANAGER)
		expect(store.bailout.claims[1]).toBeUndefined()
		expect(store.players[1].beach).toEqual([])
	})
})

describe("bailout wire-format persistence", () => {
	function decodeExport(b64) {
		return JSON.parse(pako.ungzip(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), { to: "string" }))
	}

	// The slot, when exported, is always the last element: [order, poolPairs, claimPairs]
	function lastIsBailoutSlot(decoded) {
		const last = decoded[decoded.length - 1]
		return Array.isArray(last) && last.length === 3 && Array.isArray(last[0]) && Array.isArray(last[1]) && Array.isArray(last[2])
	}

	it("exportFCMmodel carries the bailout state and restoreBailoutState reads it back", () => {
		const store = freshGame(2)
		store.bankBroken = 1
		rules.handleBankBreak(false)
		rules.claimBailoutEmployee(0, rf.CAMPAIGN_MANAGER)

		const decoded = decodeExport(funcs.exportFCMmodel(false, false))
		expect(decoded[decoded.length - 1]).toEqual([[0, 1], [rf.CAMPAIGN_MANAGER, 5], [0, rf.CAMPAIGN_MANAGER]])

		const store2 = freshGame(2)
		funcs.restoreBailoutState(decoded)
		expect(store2.bailout.pending).toBe(true)
		expect(store2.bailout.claims[0]).toBe(rf.CAMPAIGN_MANAGER)
		expect(store2.bailout.pool[rf.CAMPAIGN_MANAGER]).toBe(5)
		expect(store2.bailout.order).toEqual([0, 1])
	})

	it("omits the slot when no claim night is open", () => {
		freshGame(2) // module chosen, but idle
		const decoded = decodeExport(funcs.exportFCMmodel(false, false))
		expect(lastIsBailoutSlot(decoded)).toBe(false)

		const store2 = freshGame(2)
		funcs.restoreBailoutState(decoded)
		expect(store2.bailout.pending).toBe(false)
	})

	it("omits the slot on game-over saves even while a night is open", () => {
		const store = freshGame(2)
		store.bankBroken = 1
		rules.handleBankBreak(false)
		expect(store.bailout.pending).toBe(true)

		const decoded = decodeExport(funcs.exportFCMmodel(true, false))
		expect(lastIsBailoutSlot(decoded)).toBe(false)

		const store2 = freshGame(2)
		funcs.restoreBailoutState(decoded, decoded.length - 1, true)
		expect(store2.bailout.pending).toBe(false)
	})

	it("omits the slot when the module was not chosen", () => {
		freshGame(2, []) // secondBailout flag off
		const decoded = decodeExport(funcs.exportFCMmodel(false, false))
		expect(lastIsBailoutSlot(decoded)).toBe(false)
	})

	it("trails the stadium slot when both modules are chosen", () => {
		const store = freshGame(2, ["47", "49"])
		store.stadium.gamesPlayed = 1
		store.bankBroken = 1
		rules.handleBankBreak(false)

		const decoded = decodeExport(funcs.exportFCMmodel(false, false))
		expect(decoded[decoded.length - 2]).toEqual([1]) // bare stadium slot
		expect(decoded[decoded.length - 1][0]).toEqual([0, 1]) // bailout order

		const store2 = freshGame(2, ["47", "49"])
		// The import passes the next unread slot index for both: stadium sits
		// there directly, the bailout scan skips past it.
		const importIndex = decoded.length - 2
		funcs.restoreStadiumState(decoded, importIndex)
		funcs.restoreBailoutState(decoded, importIndex)
		expect(store2.stadium.gamesPlayed).toBe(1)
		expect(store2.bailout.pending).toBe(true)
		expect(store2.bailout.order).toEqual([0, 1])
		expect(store2.bailout.claims).toEqual({})
	})

	it("skips a leftover stadium slot from an older save when the stadium module is off", () => {
		const store = freshGame(2)
		// Older saves pushed the stadium slot unconditionally, so the bailout
		// slot can sit one position past the next unread index.
		const bailoutSlot = [[0, 1], [rf.CAMPAIGN_MANAGER, 5], [0, rf.CAMPAIGN_MANAGER]]
		funcs.restoreBailoutState([[0], bailoutSlot], 0)
		expect(store.bailout.pending).toBe(true)
		expect(store.bailout.claims[0]).toBe(rf.CAMPAIGN_MANAGER)
	})

	it("a missing slot resets the bailout state (older saves)", () => {
		const store = freshGame(2)
		funcs.restoreBailoutState([{}, {}, {}])
		expect(store.bailout.pending).toBe(false)
		expect(store.bailout.claims).toEqual({})
	})

	it("still reads the older full-object slot", () => {
		const store = freshGame(2)
		funcs.restoreBailoutState([[0, 1], { pending: true, pool: { [rf.CAMPAIGN_MANAGER]: 5 }, claims: { 0: rf.CAMPAIGN_MANAGER }, order: [0, 1] }])
		expect(store.bailout.pending).toBe(true)
		expect(store.bailout.claims[0]).toBe(rf.CAMPAIGN_MANAGER)
		expect(store.bailout.pool[rf.CAMPAIGN_MANAGER]).toBe(5)
	})
})
