import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

let controller, funcs, model, playerRules, rf, rules, useModelStore

beforeAll(async () => {
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	controller = await import("./FCMcontroller.js")
	funcs = await import("./FCMfuncs.js")
	model = await import("./FCMmodel.js")
	playerRules = await import("./FCMplayer.js")
	rf = await import("./FCMreference.js")
	rules = await import("./FCMrules.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function player() {
	return {
		name: "A",
		displayName: "A",
		money: 100,
		employees: [rf.TEMPORARY_WORKER, rf.NIGHT_SHIFT_MANAGER],
		beach: [],
		marketers: [],
		milestones: [],
		resources: [],
		ceoSlots: 3,
		ceoAction: -1,
	}
}

beforeEach(() => {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.players.push(player())
	store.gameflow.turnOrder = [0]
	store.gameflow.phase = rf.PHASE_WORKING_DAY
	store.gameflow.subphase = rf.SUBPHASE_TEMPORARY_WORKER
	store.startingOptions.laborMarket = true
	store.startingOptions.nightShift = true
	store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
	store.laborMarket.removedTemporaryWorkers = 2
	store.laborMarket.removedTemporaryWorkersAtTurnStart = 2
	store.laborMarket.dailyTemporaryEffects = [null]
})

describe("Temporary Worker role choice", () => {
	it("only accepts the seven base roles and freezes the action limit", () => {
		const store = useModelStore()
		expect(rf.TEMPORARY_WORKER_ROLES).toEqual([rf.WAITRESS, rf.PRICING_MANAGER, rf.RECRUITING_GIRL, rf.TRAINER, rf.ERRAND_BOY, rf.MARKETING_TRAINEE, rf.KITCHEN_TRAINEE])
		expect(controller.chooseTemporaryWorkerRole(rf.TRAINER)).toEqual({ roles: [rf.TRAINER, rf.TRAINER, rf.TRAINER], limit: 3 })
		expect(store.laborMarket.dailyTemporaryEffects[0]).toEqual({ roles: [rf.TRAINER, rf.TRAINER, rf.TRAINER], limit: 3, usedByRole: {} })
		store.laborMarket.removedTemporaryWorkers = 5
		expect(rules.temporaryWorkerEffect(0).limit).toBe(3)
		expect(controller.chooseTemporaryWorkerRole(rf.CFO)).toBe(false)
	})

	it("does not let Night Shift double recruiting, training, pricing or waitress effects", () => {
		const store = useModelStore()
		controller.chooseTemporaryWorkerRole(rf.RECRUITING_GIRL)
		expect(rules.getRemainingRecruitingPoints(0)).toBe(3)

		store.laborMarket.dailyTemporaryEffects[0] = { roles: [rf.TRAINER, rf.TRAINER, rf.TRAINER], limit: 3, usedByRole: {} }
		expect(rules.getTrainingPoints(0, []).total).toBe(3)

		store.laborMarket.dailyTemporaryEffects[0] = { roles: [rf.PRICING_MANAGER, rf.PRICING_MANAGER, rf.PRICING_MANAGER], limit: 3, usedByRole: { [rf.PRICING_MANAGER]: 3 } }
		expect(playerRules.playerDiscount(0)).toBe(3)

		store.laborMarket.dailyTemporaryEffects[0] = { roles: [rf.WAITRESS, rf.WAITRESS], limit: 3, usedByRole: { [rf.WAITRESS]: 2 } }
		expect(playerRules.numberOfWaitress(0)).toBe(2)
	})

	it("removes the card after the workday but preserves the frozen dinner effect", () => {
		const store = useModelStore()
		store.laborMarket.dailyTemporaryEffects[0] = { roles: [rf.WAITRESS, rf.WAITRESS], limit: 3, usedByRole: { [rf.WAITRESS]: 2 } }
		expect(controller.consumeTemporaryWorker(0)).toBe(true)
		expect(store.players[0].employees).not.toContain(rf.TEMPORARY_WORKER)
		expect(store.laborMarket.removedTemporaryWorkers).toBe(3)
		expect(store.laborMarket.dailyTemporaryEffects[0]).toEqual({ roles: [rf.WAITRESS, rf.WAITRESS], limit: 3, usedByRole: { [rf.WAITRESS]: 2 } })
		expect(controller.consumeTemporaryWorker(0)).toBe(false)
	})

	it("initializes and serializes per-player daily effects", () => {
		const store = useModelStore()
		model.setupLaborMarketExpansion()
		expect(store.laborMarket.dailyTemporaryEffects).toEqual([null])
		store.laborMarket.dailyTemporaryEffects[0] = { roles: [rf.ERRAND_BOY], limit: 1, usedByRole: { [rf.ERRAND_BOY]: 1 } }
		const slot = funcs.exportLaborMarketSlot()
		store.laborMarket.dailyTemporaryEffects = []
		funcs.restoreLaborMarketState([slot])
		expect(store.laborMarket.dailyTemporaryEffects).toEqual([{ roles: [rf.ERRAND_BOY], limit: 1, usedByRole: { [rf.ERRAND_BOY]: 1 } }])
	})

	it("adds exactly N basic production actions without Night Shift duplication", () => {
		const store = useModelStore()
		store.laborMarket.dailyTemporaryEffects[0] = { roles: [rf.ERRAND_BOY, rf.ERRAND_BOY, rf.ERRAND_BOY], limit: 3, usedByRole: {} }
		expect(rules.availableProducers(0)).toEqual([rf.ERRAND_BOY, rf.ERRAND_BOY, rf.ERRAND_BOY])
		expect(rules.availableProducers(0, [rf.ERRAND_BOY])).toHaveLength(2)

		store.laborMarket.dailyTemporaryEffects[0] = { roles: [rf.KITCHEN_TRAINEE, rf.KITCHEN_TRAINEE, rf.KITCHEN_TRAINEE], limit: 3, usedByRole: {} }
		expect(rules.availableProducers(0)).toEqual([rf.KITCHEN_TRAINEE, rf.KITCHEN_TRAINEE, rf.KITCHEN_TRAINEE])
		expect(rules.availableProducers(0, [rf.KITCHEN_TRAINEE, rf.KITCHEN_TRAINEE])).toHaveLength(1)
	})

	it("tracks temporary marketing uses and campaign ownership without a marketer card", () => {
		const store = useModelStore()
		store.laborMarket.dailyTemporaryEffects[0] = { roles: [rf.MARKETING_TRAINEE, rf.MARKETING_TRAINEE, rf.MARKETING_TRAINEE], limit: 3, usedByRole: {} }
		expect(rules.temporaryWorkerUsesAction(0, rf.MARKETING_TRAINEE)).toBe(true)
		expect(rules.temporaryWorkerRemainingActions(0, rf.MARKETING_TRAINEE)).toBe(2)
		store.laborMarket.temporaryCampaignOwners[7] = 0
		expect(model.findPlayerForCampaign(7)).toBe(0)
	})

	it("allows mixed and repeated employee abilities within the frozen limit", () => {
		const store = useModelStore()
		expect(controller.chooseTemporaryWorkerRoles([rf.TRAINER, rf.RECRUITING_GIRL, rf.TRAINER])).toEqual({ roles: [rf.TRAINER, rf.RECRUITING_GIRL, rf.TRAINER], limit: 3 })
		expect(rules.temporaryWorkerRoleCount(0, rf.TRAINER)).toBe(2)
		expect(rules.temporaryWorkerRoleCount(0, rf.RECRUITING_GIRL)).toBe(1)
		expect(rules.getTrainingPoints(0, []).total).toBe(2)
		expect(rules.getRemainingRecruitingPoints(0)).toBe(1)
		expect(store.laborMarket.dailyTemporaryEffects[0].roles).toEqual([rf.TRAINER, rf.RECRUITING_GIRL, rf.TRAINER])
	})

	it("expires a temporary campaign without returning any employee to the Beach", () => {
		const store = useModelStore()
		store.players[0].employees = []
		store.players[0].beach = []
		store.players[0].marketers = []
		store.campaigns = [{ number: 0, index: 0, rotated: false, good: rf.BURGER, duration: 1 }]
		store.availableMarketingCampaigns = []
		store.mapData.coords = Array(rf.ssW * rf.ssH).fill(0)
		store.laborMarket.temporaryCampaignOwners[0] = 0

		model.removeMarketingCampaign(0)

		expect(store.campaigns).toEqual([])
		expect(store.availableMarketingCampaigns).toContain(0)
		expect(store.laborMarket.temporaryCampaignOwners[0]).toBeUndefined()
		expect(store.players[0].beach).toEqual([])
		expect(store.players[0].marketers).toEqual([])
	})
})
