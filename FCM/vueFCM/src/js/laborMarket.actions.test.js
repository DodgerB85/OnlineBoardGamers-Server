import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

let controller, model, playerRules, rf, rules, useModelStore

beforeAll(async () => {
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	controller = await import("./FCMcontroller.js")
	model = await import("./FCMmodel.js")
	playerRules = await import("./FCMplayer.js")
	rf = await import("./FCMreference.js")
	rules = await import("./FCMrules.js")
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
		ceoSlots: 3,
		ceoAction: rf.CEO_ACTION_HIRE_1,
	}
}

beforeEach(() => {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.players.push(player("A"), player("B"), player("C"))
	store.gameflow.turnOrder = [0]
	store.startingOptions.laborMarket = true
	store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
})

describe("Labor Market setup", () => {
	it("gives exactly one Temporary Worker to every player and six Headhunters to supply", () => {
		const store = useModelStore()
		model.setupLaborMarketExpansion()
		expect(store.players.map((p) => p.beach)).toEqual([[rf.TEMPORARY_WORKER], [rf.TEMPORARY_WORKER], [rf.TEMPORARY_WORKER]])
		expect(store.availableEmployees[rf.HEADHUNTER]).toBe(6)
		expect(store.availableEmployees[rf.TEMPORARY_WORKER]).toBe(-1)
		expect(store.availableEmployees[rf.UNION_ORGANIZER]).toBe(3)
	})
})

describe("Labor Market recruiting reset", () => {
	it("resets only recruiting while preserving the Temporary Worker choice", () => {
		const store = useModelStore()
		store.externalStartingOptions.push(rf.SO_LABOR_MARKET)
		store.gameflow.phase = rf.PHASE_WORKING_DAY
		store.gameflow.subphase = rf.SUBPHASE_TEMPORARY_WORKER
		store.players[0].employees = [rf.TEMPORARY_WORKER, rf.RECRUITING_GIRL]
		store.players[0].ceoAction = rf.CEO_ACTION_HIRE_1
		store.laborMarket.dailyTemporaryEffects = [null, null, null]
		store.availableEmployees[rf.WAITRESS] = 4
		store.availableEmployees[rf.EXECUTIVE_VICE_PRESIDENT] = 1
		store.availableMilestones.push(rf.FIRST_RECRUITING_GIRL_USED)

		controller.chooseTemporaryWorkerRole(rf.TRAINER)
		const historyAfterTemporaryChoice = JSON.parse(JSON.stringify(store.history))
		controller.hireEmployee(rf.WAITRESS)

		expect(store.players[0].beach).toContain(rf.WAITRESS)
		expect(store.players[0].beach).toContain(rf.EXECUTIVE_VICE_PRESIDENT)
		expect(store.players[0].milestones).toContain(rf.FIRST_RECRUITING_GIRL_USED)
		expect(controller.resetHiringSubphase()).toBe(true)

		expect(store.gameflow.subphase).toBe(rf.SUBPHASE_HIRING)
		expect(store.laborMarket.dailyTemporaryEffects[0]).toEqual({ roles: [rf.TRAINER], limit: 1, usedByRole: {} })
		expect(store.context.justHired).toEqual([])
		expect(store.context.endOfDaySummaryData.hire.hired).toEqual([])
		expect(store.players[0].beach).not.toContain(rf.WAITRESS)
		expect(store.players[0].beach).not.toContain(rf.EXECUTIVE_VICE_PRESIDENT)
		expect(store.players[0].milestones).not.toContain(rf.FIRST_RECRUITING_GIRL_USED)
		expect(store.availableEmployees[rf.WAITRESS]).toBe(4)
		expect(store.availableEmployees[rf.EXECUTIVE_VICE_PRESIDENT]).toBe(1)
		expect(store.history).toEqual(historyAfterTemporaryChoice)
	})

	it("is unavailable outside Labor Market hiring", () => {
		const store = useModelStore()
		store.startingOptions.laborMarket = false
		store.gameflow.subphase = rf.SUBPHASE_HIRING
		expect(controller.resetHiringSubphase()).toBe(false)
		store.startingOptions.laborMarket = true
		store.gameflow.subphase = rf.SUBPHASE_TRAINING
		expect(controller.resetHiringSubphase()).toBe(false)
	})
})

describe("Headhunter action", () => {
	it("moves a live Beach employee and defers its switch salary to Payday", () => {
		const store = useModelStore()
		store.players[0].employees = [rf.HEADHUNTER]
		store.players[1].beach = [rf.HR_DIRECTOR]
		const result = controller.headhuntEmployee(0, 1, 0)
		expect(result).toEqual({ employee: rf.HR_DIRECTOR, cost: 50 })
		expect(store.players[0].beach).toEqual([rf.HR_DIRECTOR])
		expect(store.players[1].beach).toEqual([])
		expect(store.players[0].money).toBe(100)
		expect(store.players[1].money).toBe(100)
		expect(store.laborMarket.pendingHeadhuntSalaries[0]).toEqual([{ employee: rf.HR_DIRECTOR, cost: 50 }])
	})

	it("allows a cash-poor action but rejects stale, special, self and duplicate-unique targets", () => {
		const store = useModelStore()
		store.players[0].money = 10
		store.players[0].beach = [rf.CFO]
		store.players[1].beach = [rf.HR_DIRECTOR, rf.TEMPORARY_WORKER, rf.CFO]
		expect(rules.canHeadhunt(0, 1, 0)).toBe(true)
		store.players[0].money = 100
		expect(rules.canHeadhunt(0, 1, 1)).toBe(false)
		expect(rules.canHeadhunt(0, 0, 0)).toBe(false)
		expect(rules.canHeadhunt(0, 1, 2)).toBe(false)
	})
})

describe("Union Organizer movement", () => {
	it("cannot fire or train the two protected special employees, while Headhunter stays fireable", () => {
		const store = useModelStore()
		store.players[0].beach = [rf.TEMPORARY_WORKER, rf.UNION_ORGANIZER, rf.HEADHUNTER]
		expect(rules.fireableEmployees(0)).toEqual([rf.HEADHUNTER])
		expect(playerRules.fireEmployee(0, rf.TEMPORARY_WORKER)).toBe(false)
		expect(playerRules.fireEmployee(0, rf.UNION_ORGANIZER)).toBe(false)
		expect(store.players[0].beach).toContain(rf.TEMPORARY_WORKER)
		expect(store.players[0].beach).toContain(rf.UNION_ORGANIZER)
		expect(rules.possibleUpgrades(store.availableEmployees, 0, rf.TEMPORARY_WORKER)).toEqual([[]])
		expect(rules.possibleUpgrades(store.availableEmployees, 0, rf.UNION_ORGANIZER)).toEqual([[]])
	})

	it("preserves base-game firing of an employee assigned to a campaign", () => {
		const store = useModelStore()
		store.players[0].marketers = [{ marketer: rf.MARKETING_TRAINEE, campaign: 1 }]
		expect(playerRules.fireEmployee(0, rf.MARKETING_TRAINEE)).toBe(true)
		expect(store.players[0].marketers).toEqual([])
	})

	it("keeps protected special employees out of Sandbox hiring and firing", () => {
		const store = useModelStore()
		store.availableEmployees[rf.TEMPORARY_WORKER] = -1
		store.availableEmployees[rf.UNION_ORGANIZER] = 3
		store.players[0].beach = [rf.TEMPORARY_WORKER, rf.UNION_ORGANIZER]

		expect(controller.sandboxHireEmployee(rf.TEMPORARY_WORKER)).toBe(false)
		expect(controller.sandboxHireEmployee(rf.UNION_ORGANIZER)).toBe(false)
		expect(controller.sandboxFireEmployee(rf.TEMPORARY_WORKER)).toBe(false)
		expect(controller.sandboxFireEmployee(rf.UNION_ORGANIZER)).toBe(false)
		expect(store.players[0].beach).toEqual([rf.TEMPORARY_WORKER, rf.UNION_ORGANIZER])
		expect(store.availableEmployees[rf.TEMPORARY_WORKER]).toBe(-1)
		expect(store.availableEmployees[rf.UNION_ORGANIZER]).toBe(3)
	})

	it("counts final nonblank workers, counting Temporary Worker once and excluding the union", () => {
		const store = useModelStore()
		store.players[0].employees = [rf.WAITRESS, rf.TEMPORARY_WORKER, rf.UNION_ORGANIZER, rf.BLANK_EMPLOYEE_SPACE]
		expect(rules.snapshotWorkedCount(0)).toBe(2)
		expect(store.laborMarket.workedCounts[0]).toBe(2)
	})

	it("places the mandatory Union Organizer first when auto-filling a structure", () => {
		const store = useModelStore()
		store.laborMarket.unionHolders = [0]
		store.players[0].employees = [rf.BLANK_EMPLOYEE_SPACE, rf.BLANK_EMPLOYEE_SPACE, rf.BLANK_EMPLOYEE_SPACE]
		store.players[0].beach = [rf.WAITRESS, rf.UNION_ORGANIZER]

		controller.autoFillEmployees()

		expect(store.players[0].employees.indexOf(rf.UNION_ORGANIZER)).toBeLessThan(store.players[0].ceoSlots)
		expect(store.players[0].beach).not.toContain(rf.UNION_ORGANIZER)
	})

	it("treats the Union Organizer as CEO-direct only while providing no subordinate slots", () => {
		const store = useModelStore()
		store.players[0].employees = [rf.BLANK_EMPLOYEE_SPACE, rf.BLANK_EMPLOYEE_SPACE, rf.BLANK_EMPLOYEE_SPACE, rf.BLANK_EMPLOYEE_SPACE]
		store.players[0].beach = [rf.UNION_ORGANIZER]

		expect(rf.MANAGERS).toContain(rf.UNION_ORGANIZER)
		expect(rules.getSubSlotsForEmployee(rf.UNION_ORGANIZER)).toBe(0)
		expect(playerRules.setEmployeeInIndex(0, rf.UNION_ORGANIZER, 3)).toBe(false)
		expect(store.players[0].beach).toContain(rf.UNION_ORGANIZER)
		expect(playerRules.setEmployeeInIndex(0, rf.UNION_ORGANIZER, 1)).toBe(true)
		expect(store.players[0].employees[1]).toBe(rf.UNION_ORGANIZER)
		expect(store.players[0].employees).toHaveLength(4)
	})

	it("preserves the submitted workforce snapshot after a marketer leaves the structure", () => {
		const store = useModelStore()
		store.players[0].employees = [rf.MARKETING_TRAINEE, rf.WAITRESS]
		expect(rules.snapshotWorkedCount(0)).toBe(2)
		store.players[0].employees.splice(0, 1)
		store.players[0].marketers.push(rf.MARKETING_TRAINEE)
		expect(store.laborMarket.workedCounts[0]).toBe(2)
	})

	it("assigns one organizer to every eligible leader and returns the rest to supply", () => {
		const store = useModelStore()
		store.laborMarket.workedCounts = [4, 6, 5]
		controller.settleUnionOrganizer()
		expect(store.laborMarket.unionHolders).toEqual([1])
		expect(store.players[1].beach).toContain(rf.UNION_ORGANIZER)
		expect(store.availableEmployees[rf.UNION_ORGANIZER]).toBe(2)

		store.laborMarket.workedCounts = [7, 7, 3]
		controller.settleUnionOrganizer()
		expect(store.laborMarket.unionHolders).toEqual([0, 1])
		expect(store.history.at(-1)[0]).toBe(rf.HIST_UNION_ORGANIZER)
		expect(store.history.at(-1)[1]).toBe(-1)
		expect(store.history.at(-1)[3]).toEqual([[1], [0, 1], [7, 7, 3]])
		expect(store.availableEmployees[rf.UNION_ORGANIZER]).toBe(1)
		expect(store.players.flatMap((p) => [...p.beach, ...p.employees]).filter((e) => e === rf.UNION_ORGANIZER)).toHaveLength(2)
	})

	it("charges a normal $5 salary for each Union Organizer while keeping it non-fireable", () => {
		const store = useModelStore()
		store.players[0].employees = [rf.UNION_ORGANIZER]
		expect(rules.salary(0)).toBe(5)
		expect(rules.fireableEmployees(0)).toEqual([])
	})
})
