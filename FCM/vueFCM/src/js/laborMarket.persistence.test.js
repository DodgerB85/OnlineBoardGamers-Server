import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let funcs, model, rf, useModelStore

beforeAll(async () => {
	if (!globalThis.pako) {
		const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
		;(0, eval)(pakoSrc)
	}
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	globalThis.window.initData = globalThis.window.initData || { startingOptions: [] }
	funcs = await import("./FCMfuncs.js")
	model = await import("./FCMmodel.js")
	rf = await import("./FCMreference.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

beforeEach(() => setActivePinia(createPinia()))

describe("Labor Market persistence", () => {
	it("exports a compact tagged slot and restores all persistent state", () => {
		const store = useModelStore()
		store.startingOptions.laborMarket = true
		store.laborMarket.removedTemporaryWorkers = 3
		store.laborMarket.removedTemporaryWorkersAtTurnStart = 2
		store.laborMarket.unionHolders = [1, 2]
		store.laborMarket.pendingUnionHolders = [0, 2]
		store.laborMarket.workedCounts = [4, 5, 6]
		store.laborMarket.temporaryCampaignOwners[12] = 0
		store.laborMarket.dailyTemporaryEffects = [{ roles: [rf.RECRUITING_GIRL, rf.TRAINER, rf.RECRUITING_GIRL], limit: 4, usedByRole: { [rf.RECRUITING_GIRL]: 2 } }, null, null]
		store.laborMarket.pendingHeadhuntSalaries = [[{ employee: rf.HR_DIRECTOR, cost: 50 }], [], []]

		const slot = funcs.exportLaborMarketSlot()
		expect(slot[0]).toBe(-rf.SO_LABOR_MARKET)
		expect(slot[2]).toBe(3)
		expect(slot[3]).toBe(2)
		expect(slot[4]).toEqual([1, 2])
		expect(slot[7]).toEqual([12, 0])
		expect(slot[8][0]).toEqual([4, [rf.RECRUITING_GIRL, rf.TRAINER, rf.RECRUITING_GIRL], [rf.RECRUITING_GIRL, 2]])
		expect(slot[9][0]).toEqual([rf.HR_DIRECTOR, 50])

		store.laborMarket.removedTemporaryWorkers = 0
		store.laborMarket.unionHolders = []
		store.laborMarket.pendingUnionHolders = []
		store.laborMarket.workedCounts = []
		store.laborMarket.temporaryCampaignOwners = {}
		funcs.restoreLaborMarketState([slot])

		expect(store.laborMarket.removedTemporaryWorkers).toBe(3)
		expect(store.laborMarket.removedTemporaryWorkersAtTurnStart).toBe(2)
		expect(store.laborMarket.unionHolders).toEqual([1, 2])
		expect(store.laborMarket.pendingUnionHolders).toEqual([0, 2])
		expect(store.laborMarket.workedCounts).toEqual([4, 5, 6])
		expect(store.laborMarket.temporaryCampaignOwners).toEqual({ 12: 0 })
		expect(store.laborMarket.dailyTemporaryEffects).toEqual([{ roles: [rf.RECRUITING_GIRL, rf.TRAINER, rf.RECRUITING_GIRL], limit: 4, usedByRole: { [rf.RECRUITING_GIRL]: 2 } }, null, null])
		expect(store.laborMarket.pendingHeadhuntSalaries).toEqual([[{ employee: rf.HR_DIRECTOR, cost: 50 }], [], []])
	})

	it("carries Labor Market state through the compressed save wire used for reconnects", () => {
		const store = useModelStore()
		store.startingOptions.laborMarket = true
		store.startingOptions.secondBailout = true
		store.laborMarket.removedTemporaryWorkers = 4
		store.laborMarket.removedTemporaryWorkersAtTurnStart = 3
		store.laborMarket.unionHolders = [1, 2]
		store.laborMarket.pendingUnionHolders = [1, 2]
		store.laborMarket.workedCounts = [3, 4, 6]
		store.laborMarket.temporaryCampaignOwners = { 5: 1 }
		store.laborMarket.dailyTemporaryEffects = [null, { roles: [rf.MARKETING_TRAINEE, rf.MARKETING_TRAINEE, rf.MARKETING_TRAINEE], limit: 5, usedByRole: { [rf.MARKETING_TRAINEE]: 3 } }, null]
		store.laborMarket.pendingHeadhuntSalaries = [[], [{ employee: rf.TRAINER, cost: 10 }], []]
		store.bailout.pending = true
		store.bailout.pool = { [rf.CAMPAIGN_MANAGER]: 4 }
		store.bailout.claims = { 0: rf.CAMPAIGN_MANAGER }
		store.bailout.order = [0, 1, 2]

		const encoded = funcs.exportFCMmodel(false, false)
		const compressed = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
		const wire = JSON.parse(globalThis.pako.ungzip(compressed, { to: "string" }))
		const slot = wire.find((entry) => Array.isArray(entry) && entry[0] === -rf.SO_LABOR_MARKET)
		expect(slot).toEqual(funcs.exportLaborMarketSlot())
		expect(wire.at(-1)).toEqual([[0, 1, 2], [rf.CAMPAIGN_MANAGER, 4], [0, rf.CAMPAIGN_MANAGER]])

		setActivePinia(createPinia())
		useModelStore().startingOptions.laborMarket = true
		useModelStore().startingOptions.secondBailout = true
		funcs.restoreLaborMarketState(wire)
		funcs.restoreBailoutState(wire)
		const restoredStore = useModelStore()
		const restored = restoredStore.laborMarket
		expect(restored.removedTemporaryWorkers).toBe(4)
		expect(restored.removedTemporaryWorkersAtTurnStart).toBe(3)
		expect(restored.unionHolders).toEqual([1, 2])
		expect(restored.workedCounts).toEqual([3, 4, 6])
		expect(restored.temporaryCampaignOwners).toEqual({ 5: 1 })
		expect(restored.dailyTemporaryEffects).toEqual([null, { roles: [rf.MARKETING_TRAINEE, rf.MARKETING_TRAINEE, rf.MARKETING_TRAINEE], limit: 5, usedByRole: { [rf.MARKETING_TRAINEE]: 3 } }, null])
		expect(restored.pendingHeadhuntSalaries).toEqual([[], [{ employee: rf.TRAINER, cost: 10 }], []])
		expect(restoredStore.bailout).toEqual({
			pending: true,
			pool: { [rf.CAMPAIGN_MANAGER]: 4 },
			claims: { 0: rf.CAMPAIGN_MANAGER },
			order: [0, 1, 2],
		})
	})

	it("loads an old save without a Labor Market slot using safe defaults", () => {
		const store = useModelStore()
		store.laborMarket.removedTemporaryWorkers = 5
		store.laborMarket.unionHolders = [1]
		funcs.restoreLaborMarketState([[0], { unrelated: true }])
		expect(store.laborMarket.removedTemporaryWorkers).toBe(0)
		expect(store.laborMarket.unionHolders).toEqual([])
		expect(store.laborMarket.workedCounts).toEqual([])
		expect(store.laborMarket.pendingHeadhuntSalaries).toEqual([])
	})

	it("ignores a Labor Market slot when the module was not chosen", () => {
		const store = useModelStore()
		const slot = [-rf.SO_LABOR_MARKET, 1, 3, 2, [0], [], [4], [], [], []]
		funcs.restoreLaborMarketState([slot])
		expect(store.laborMarket.removedTemporaryWorkers).toBe(0)
		expect(store.laborMarket.unionHolders).toEqual([])
		expect(store.laborMarket.workedCounts).toEqual([])
	})
})

describe("Labor Market wire gating", () => {
	const STARTING_MAP = [17, 0, 4, 0, 19, 3, 18, 0, 12, 2, 24, 2, 9, 0, 0, 2, 13, 2]

	function seedGame(opts) {
		setActivePinia(createPinia())
		const store = useModelStore()
		model.setInternalStartingOptions(opts)
		for (let i = 0; i < 2; i++) {
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
		store.gameflow.fullTurnOrder = [0, 1]
		store.gameflow.turnOrder = [0, 1]
		store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
		store.reserveCards = []
		store.bank = 500
		store.bankBroken = 0
		return store
	}

	function decodeExport(b64) {
		return JSON.parse(globalThis.pako.ungzip(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), { to: "string" }))
	}
	function encodeArr(arr) {
		return btoa(String.fromCharCode(...new Uint8Array(globalThis.pako.gzip(JSON.stringify(arr)))))
	}
	function isLM(entry) {
		return Array.isArray(entry) && entry[0] === -rf.SO_LABOR_MARKET
	}
	function importInto(decoded, opts, forGameOver = false) {
		globalThis.window.initData = { startingOptions: opts, startingMap: STARTING_MAP, playerNames: ["P0", "P1"] }
		const store = seedGame(opts)
		const result = funcs.importFCMmodel(encodeArr(decoded), forGameOver, false)
		expect(result).not.toBe(-9999)
		return store
	}

	it("omits the Labor Market slot when the module is not chosen", () => {
		seedGame(["47"])
		const wire = decodeExport(funcs.exportFCMmodel(false, false))
		expect(wire.some(isLM)).toBe(false)
	})

	it("carries only the temporary campaign owners on game-over saves", () => {
		const store = seedGame(["48"])
		store.gameflow.phase = rf.PHASE_GAME_OVER
		store.history.push([rf.HIST_NEW_TURN, 0, 0, [0]])
		// No temporary campaign owners -> slot omitted entirely
		expect(decodeExport(funcs.exportFCMmodel(true, false)).some(isLM)).toBe(false)
		// With one -> compact slot restoring just the owner map
		store.laborMarket.temporaryCampaignOwners = { 5: 1 }
		const wire = decodeExport(funcs.exportFCMmodel(true, false))
		expect(wire.find(isLM)).toEqual([-rf.SO_LABOR_MARKET, 1, 0, 0, [], [], [], [5, 1], [], []])
		const restored = importInto(wire, ["48"], true)
		expect(restored.laborMarket.temporaryCampaignOwners).toEqual({ 5: 1 })
	})

	it("round-trips Labor Market with Stadium and Second Bailout through importFCMmodel", () => {
		const store = seedGame(["48", "47", "49"])
		store.laborMarket.removedTemporaryWorkers = 2
		store.laborMarket.removedTemporaryWorkersAtTurnStart = 1
		store.laborMarket.unionHolders = [1]
		store.laborMarket.pendingUnionHolders = [0]
		store.laborMarket.workedCounts = [3, 5]
		store.laborMarket.temporaryCampaignOwners = { 5: 1 }
		store.laborMarket.dailyTemporaryEffects = [null, { roles: [rf.TRAINER], limit: 1, usedByRole: {} }]
		store.laborMarket.pendingHeadhuntSalaries = [[], [{ employee: rf.TRAINER, cost: 10 }]]
		store.stadium.gamesPlayed = 1
		store.bailout.pending = true
		store.bailout.order = [0, 1]
		store.bailout.pool = { [rf.CAMPAIGN_MANAGER]: 3 }
		store.bailout.claims = { 0: rf.CAMPAIGN_MANAGER }

		const wire = decodeExport(funcs.exportFCMmodel(false, false))
		// Order after the volatile slots: Labor Market, Stadium, Second Bailout
		expect(isLM(wire[wire.length - 3])).toBe(true)
		expect(wire[wire.length - 2]).toEqual([1])
		expect(wire[wire.length - 1]).toEqual([[0, 1], [rf.CAMPAIGN_MANAGER, 3], [0, rf.CAMPAIGN_MANAGER]])

		const restored = importInto(wire, ["48", "47", "49"])
		expect(restored.laborMarket.removedTemporaryWorkers).toBe(2)
		expect(restored.laborMarket.removedTemporaryWorkersAtTurnStart).toBe(1)
		expect(restored.laborMarket.unionHolders).toEqual([1])
		expect(restored.laborMarket.pendingUnionHolders).toEqual([0])
		expect(restored.laborMarket.workedCounts).toEqual([3, 5])
		expect(restored.laborMarket.temporaryCampaignOwners).toEqual({ 5: 1 })
		expect(restored.laborMarket.dailyTemporaryEffects).toEqual([null, { roles: [rf.TRAINER], limit: 1, usedByRole: {} }])
		expect(restored.laborMarket.pendingHeadhuntSalaries).toEqual([[], [{ employee: rf.TRAINER, cost: 10 }]])
		expect(restored.stadium.gamesPlayed).toBe(1)
		expect(restored.bailout.pending).toBe(true)
		expect(restored.bailout.claims[0]).toBe(rf.CAMPAIGN_MANAGER)
	})

	it("round-trips through the in-memory simple snapshot", () => {
		const store = seedGame(["48"])
		store.laborMarket.removedTemporaryWorkers = 3
		store.laborMarket.unionHolders = [1]
		store.laborMarket.dailyTemporaryEffects = [null, { roles: [rf.TRAINER], limit: 1, usedByRole: {} }]
		const b64 = funcs.simpleExportWholeFCMmodel()

		const fresh = seedGame(["48"])
		funcs.simpleImportWholeFCMmodel(b64)
		expect(fresh.laborMarket.removedTemporaryWorkers).toBe(3)
		expect(fresh.laborMarket.unionHolders).toEqual([1])
		expect(fresh.laborMarket.dailyTemporaryEffects[1]).toEqual({ roles: [rf.TRAINER], limit: 1, usedByRole: {} })
	})
})
