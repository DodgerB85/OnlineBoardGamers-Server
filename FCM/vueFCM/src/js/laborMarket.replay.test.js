import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

let replay, rf, useModelStore

beforeAll(async () => {
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	replay = await import("./FCMreplay.js")
	rf = await import("./FCMreference.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function player(name, money = 100) {
	return {
		name,
		displayName: name,
		money,
		employees: [],
		beach: [],
		marketers: [],
		milestones: [],
		resources: [],
		additionalMarketedGood: [],
	}
}

beforeEach(() => {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.startingOptions.laborMarket = true
	store.players.push(player("A"), player("B"), player("C"))
	store.laborMarket.dailyTemporaryEffects = [null, null, null]
})

describe("Labor Market replay", () => {
	it("rebuilds the Temporary Worker choice, permanent removal count and campaign owner", () => {
		const store = useModelStore()
		store.players[0].employees = [rf.TEMPORARY_WORKER]
		replay.replayTemporaryWorker(0, 0, [[rf.MARKETING_TRAINEE, rf.TRAINER, rf.MARKETING_TRAINEE], 3, {}])
		expect(store.players[0].employees).toEqual([])
		expect(store.laborMarket.removedTemporaryWorkers).toBe(1)
		expect(store.laborMarket.dailyTemporaryEffects[0]).toEqual({ roles: [rf.MARKETING_TRAINEE, rf.TRAINER, rf.MARKETING_TRAINEE], limit: 3, usedByRole: {} })
		replay.replayTemporaryWorker(1, 0, [rf.MARKETING_TRAINEE, 3, 1, 7])
		expect(store.laborMarket.temporaryCampaignOwners[7]).toBe(0)
		expect(store.laborMarket.dailyTemporaryEffects[0].usedByRole[rf.MARKETING_TRAINEE]).toBe(1)
	})

	it("keeps legacy single-role Temporary Worker histories compatible", () => {
		const store = useModelStore()
		store.players[0].employees = [rf.TEMPORARY_WORKER]
		replay.replayTemporaryWorker(0, 0, [rf.TRAINER, 2, 1])
		expect(store.laborMarket.dailyTemporaryEffects[0]).toEqual({ roles: [rf.TRAINER, rf.TRAINER], limit: 2, usedByRole: { [rf.TRAINER]: 1 } })
	})

	it("does not consume a physical marketer when replaying a Temporary Worker campaign", () => {
		const store = useModelStore()
		store.players[0].employees = [rf.MARKETING_TRAINEE]
		store.mapData.coords = Array(300).fill(0)
		store.history.push([rf.HIST_TEMPORARY_WORKER, 0, 0, [rf.MARKETING_TRAINEE, 1, 1, 15]])
		replay.replayTemporaryWorker(0, 0, [rf.MARKETING_TRAINEE, 1, 1, 15])

		replay.replayStartMarketingCampaign(1, 0, [15, 0, 0, rf.MARKETING_TRAINEE, 2])

		expect(store.players[0].employees).toEqual([rf.MARKETING_TRAINEE])
		expect(store.players[0].marketers).toEqual([])
		expect(store.campaigns).toHaveLength(1)
		expect(store.campaigns[0]).toMatchObject({ number: 15, rotated: false, good: 0, duration: 2 })
		expect(store.laborMarket.temporaryCampaignOwners[15]).toBe(0)
	})

	it("replays a deferred-payment headhunt atomically", () => {
		const store = useModelStore()
		store.players[1].beach = [rf.HR_DIRECTOR]
		replay.replayHeadhunt(0, 0, [1, rf.HR_DIRECTOR, 50, 1])
		expect(store.players[0].beach).toEqual([rf.HR_DIRECTOR])
		expect(store.players[1].beach).toEqual([])
		expect(store.players.map((p) => p.money)).toEqual([100, 100, 100])
		expect(store.laborMarket.pendingHeadhuntSalaries[0]).toEqual([{ employee: rf.HR_DIRECTOR, cost: 50 }])
	})

	it("keeps legacy immediate-payment headhunt histories compatible", () => {
		const store = useModelStore()
		store.players[1].beach = [rf.HR_DIRECTOR]
		replay.replayHeadhunt(0, 0, [1, rf.HR_DIRECTOR, 50])
		expect(store.players.map((p) => p.money)).toEqual([50, 150, 100])
	})

	it("replays firing the headhunted copy when an identical native employee remains", () => {
		const store = useModelStore()
		store.players[0].beach = [rf.JUNIOR_VICE_PRESIDENT, rf.JUNIOR_VICE_PRESIDENT]
		store.laborMarket.pendingHeadhuntSalaries[0] = [{ employee: rf.JUNIOR_VICE_PRESIDENT, cost: 20 }]
		store.availableEmployees[rf.JUNIOR_VICE_PRESIDENT] = 0

		replay.replayFire(0, 0, [rf.encodeFiredEmployee(rf.JUNIOR_VICE_PRESIDENT, true)])

		expect(store.players[0].beach).toEqual([rf.JUNIOR_VICE_PRESIDENT])
		expect(store.laborMarket.pendingHeadhuntSalaries[0]).toEqual([])
		expect(store.availableEmployees[rf.JUNIOR_VICE_PRESIDENT]).toBe(1)
	})

	it("replays Union Organizer assignments for every tied leader", () => {
		const store = useModelStore()
		store.players[0].beach = [rf.UNION_ORGANIZER]
		store.players[2].employees = [rf.UNION_ORGANIZER]
		replay.replayUnionOrganizer(0, -1, [[0], [0, 1], [6, 6, 5]])
		expect(store.laborMarket.unionHolders).toEqual([0, 1])
		expect(store.laborMarket.workedCounts).toEqual([6, 6, 5])
		expect(store.players.flatMap((p) => [...p.beach, ...p.employees]).filter((employee) => employee === rf.UNION_ORGANIZER)).toHaveLength(2)
		expect(store.players[0].beach).toContain(rf.UNION_ORGANIZER)
		expect(store.players[1].beach).toContain(rf.UNION_ORGANIZER)
	})

	it("replays legacy scalar Union Organizer history", () => {
		const store = useModelStore()
		replay.replayUnionOrganizer(0, -1, [0, 1, [4, 6, 5]])
		expect(store.laborMarket.unionHolders).toEqual([1])
	})
})
