/**
 * Undoing a training still in progress in the training subphase
 * (controller.undoTrainEmployee). It is the exact inverse of trainEmployee:
 * the trained-to card goes back to the supply, the trained-from card comes
 * back to the player, and the spent training / recruiting points return.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

let controller, rf, rules, useModelStore

beforeAll(async () => {
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	controller = await import("./FCMcontroller.js")
	rf = await import("./FCMreference.js")
	rules = await import("./FCMrules.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function player(employees) {
	return {
		name: "A",
		displayName: "A",
		money: 100,
		employees: employees || [],
		beach: [],
		marketers: [],
		milestones: [],
		resources: [],
		ceoSlots: 3,
		ceoAction: rf.CEO_ACTION_HIRE_1,
	}
}

beforeEach(() => {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.players.push(player([rf.TRAINER]))
	store.gameflow.turnOrder = [0]
	store.gameflow.phase = rf.PHASE_WORKING_DAY
	store.gameflow.subphase = rf.SUBPHASE_TRAINING
	store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
})

describe("undoTrainEmployee", () => {
	it("restores a beach train: card back, supply and training point refunded", () => {
		const store = useModelStore()
		store.players[0].beach = [rf.KITCHEN_TRAINEE]
		const traineeSupply = store.availableEmployees[rf.KITCHEN_TRAINEE]
		const cookSupply = store.availableEmployees[rf.BURGER_COOK]

		store.context.selectedEmployeeToTrainData = { employee: rf.KITCHEN_TRAINEE, origin: 0 }
		controller.trainEmployee(rf.BURGER_COOK, 1)

		expect(store.players[0].beach).toEqual([])
		expect(store.availableEmployees[rf.KITCHEN_TRAINEE]).toBe(traineeSupply + 1)
		expect(store.availableEmployees[rf.BURGER_COOK]).toBe(cookSupply - 1)
		expect(store.context.endOfDaySummaryData.train.trained).toEqual([rf.BURGER_COOK])
		expect(rules.getTrainingPoints(0, store.context.justTrained).total).toBe(0)

		controller.undoTrainEmployee(store.context.justTrained[0])

		expect(store.context.justTrained).toEqual([])
		expect(store.players[0].beach).toEqual([rf.KITCHEN_TRAINEE])
		expect(store.availableEmployees[rf.KITCHEN_TRAINEE]).toBe(traineeSupply)
		expect(store.availableEmployees[rf.BURGER_COOK]).toBe(cookSupply)
		expect(store.context.endOfDaySummaryData.train.trained).toEqual([])
		expect(rules.getTrainingPoints(0, store.context.justTrained).total).toBe(1)
	})

	it("restores a train-from-hire: recruiting point refunded", () => {
		const store = useModelStore()
		const cookSupply = store.availableEmployees[rf.BURGER_COOK]
		expect(rules.getRemainingRecruitingPoints(0)).toBe(1)

		store.context.selectedEmployeeToTrainData = { employee: -1, origin: 1 }
		controller.trainEmployee(rf.BURGER_COOK, 1)

		expect(rules.getRemainingRecruitingPoints(0)).toBe(0)
		expect(store.availableEmployees[rf.BURGER_COOK]).toBe(cookSupply - 1)
		expect(store.context.endOfDaySummaryData.hire.hired).toEqual([-1])
		expect(store.context.endOfDaySummaryData.train.trained).toEqual([rf.BURGER_COOK])

		controller.undoTrainEmployee(store.context.justTrained[0])

		expect(store.context.justTrained).toEqual([])
		expect(store.context.justHired).toEqual([])
		expect(rules.getRemainingRecruitingPoints(0)).toBe(1)
		expect(store.availableEmployees[rf.BURGER_COOK]).toBe(cookSupply)
		expect(store.context.endOfDaySummaryData.hire.hired).toEqual([])
		expect(store.context.endOfDaySummaryData.train.trained).toEqual([])
	})
})
