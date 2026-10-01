import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let funcs, rf, useModelStore

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
	rf = await import("./FCMreference.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

beforeEach(() => setActivePinia(createPinia()))

describe("Labor Market persistence", () => {
	it("exports a versioned tagged slot and restores all persistent state", () => {
		const store = useModelStore()
		store.laborMarket.removedTemporaryWorkers = 3
		store.laborMarket.removedTemporaryWorkersAtTurnStart = 2
		store.laborMarket.unionHolders = [1, 2]
		store.laborMarket.pendingUnionHolders = [0, 2]
		store.laborMarket.workedCounts = [4, 5, 6]
		store.laborMarket.temporaryCampaignOwners[12] = 0
		store.laborMarket.dailyTemporaryEffects = [{ roles: [rf.RECRUITING_GIRL, rf.TRAINER, rf.RECRUITING_GIRL], limit: 4, usedByRole: { [rf.RECRUITING_GIRL]: 2 } }, null, null]
		store.laborMarket.pendingHeadhuntSalaries = [[{ employee: rf.HR_DIRECTOR, cost: 50 }], [], []]

		const slot = funcs.exportLaborMarketSlot()
		expect(slot.kind).toBe("laborMarket")
		expect(slot.version).toBe(4)

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
		const slot = wire.find((entry) => entry?.kind === "laborMarket")
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

	it("migrates a version-1 scalar Union Organizer holder", () => {
		const store = useModelStore()
		store.players.push({}, {}, {})
		funcs.restoreLaborMarketState([{ kind: "laborMarket", version: 1, unionHolder: 2, pendingUnionHolder: 1, workedCounts: [4, 6, 5] }])
		expect(store.laborMarket.unionHolders).toEqual([2])
		expect(store.laborMarket.pendingUnionHolders).toEqual([1])
	})

	it("migrates a version-3 single-role Temporary Worker effect and infers the turn-start count", () => {
		const store = useModelStore()
		store.players.push({ employees: [], beach: [] })
		funcs.restoreLaborMarketState([{ kind: "laborMarket", version: 3, removedTemporaryWorkers: 3, dailyTemporaryEffects: [{ role: rf.TRAINER, limit: 3, used: 1 }], pendingHeadhuntSalaries: [[]] }])
		expect(store.laborMarket.dailyTemporaryEffects[0]).toEqual({ roles: [rf.TRAINER, rf.TRAINER, rf.TRAINER], limit: 3, usedByRole: { [rf.TRAINER]: 1 } })
		expect(store.laborMarket.removedTemporaryWorkersAtTurnStart).toBe(2)
	})
})
