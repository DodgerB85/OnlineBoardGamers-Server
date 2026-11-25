import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

let context, rf, useModelStore, usePersonalStore, tutorTrain

beforeAll(async () => {
	globalThis.alert = () => {}
	globalThis.window = { performance }
	context = await import("../../js/FCMcontext.js")
	rf = await import("../../js/FCMreference.js")
	;({ useModelStore } = await import("../../stores/FCMstore.js"))
	;({ usePersonalStore } = await import("../../stores/FCMpersonal.js"))
	;({ tutorTrain } = await import("./FcmTutor.js"))
})

function player(name) {
	return {
		name,
		displayName: name,
		money: 100,
		employees: [],
		beach: [],
		marketers: [],
		milestones: [],
		resources: [],
		restaurants: [],
		ceoSlots: 3,
		ceoAction: rf.CEO_ACTION_HIRE_1,
	}
}

beforeEach(() => {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.players.push(player("P0"), player("P1"))
	store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
	Object.assign(store.gameflow, {
		turn: 1,
		phase: rf.PHASE_WORKING_DAY,
		subphase: rf.SUBPHASE_TRAINING,
		turnOrder: [0, 1],
		fullTurnOrder: [0, 1],
	})
	usePersonalStore().pov = 0
})

describe("tutorial tutor training", () => {
	it("still trains after the human has bound a training selection", () => {
		const store = useModelStore()
		// Human's UI selection while it was their turn.
		context.bindTrainingSelection({ employee: rf.ERRAND_BOY, origin: 0 })
		// The tutor's turn starts.
		store.players[1].employees = [rf.GURU, rf.BLANK_EMPLOYEE_SPACE, rf.BLANK_EMPLOYEE_SPACE]
		store.players[1].beach = [rf.ERRAND_BOY]
		store.gameflow.turnOrder = [1, 0]

		const said = tutorTrain()

		expect(said).toContain("Trains")
		expect(store.context.justTrained).toHaveLength(1)
		expect(store.context.justTrained[0]).toMatchObject({ from: rf.ERRAND_BOY, fromStructure: false })
		expect(store.context.selectedEmployeeToTrainData.employee).toBe(-1)
		expect(store.players[1].beach).not.toContain(rf.ERRAND_BOY)
	})
})
