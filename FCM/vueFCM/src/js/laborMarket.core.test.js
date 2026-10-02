import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import * as model from "./FCMmodel.js"
import * as rf from "./FCMreference.js"
import * as rules from "./FCMrules.js"
import * as view from "./FCMview.js"
import { useModelStore } from "../stores/FCMstore.js"

describe("Labor Market static model", () => {
	beforeEach(() => setActivePinia(createPinia()))

	it("uses stable option and employee IDs without making special employees hireable", () => {
		expect(rf.SO_LABOR_MARKET).toBe(48)
		expect([rf.TEMPORARY_WORKER, rf.HEADHUNTER, rf.UNION_ORGANIZER]).toEqual([56, 57, 58])
		expect(rf.HIREABLE_EMPLOYEES).not.toContain(rf.TEMPORARY_WORKER)
		expect(rf.HIREABLE_EMPLOYEES).not.toContain(rf.HEADHUNTER)
		expect(rf.HIREABLE_EMPLOYEES).not.toContain(rf.UNION_ORGANIZER)
		expect(rf.REQUIRE_SALARY).toContain(rf.HEADHUNTER)
		expect(rf.REQUIRE_SALARY).not.toContain(rf.TEMPORARY_WORKER)
		expect(rf.REQUIRE_SALARY).toContain(rf.UNION_ORGANIZER)
		expect(rf.EMPLOYEES_STR[rf.UNION_ORGANIZER].type).toBe("manager")
	})

	it("parses Labor Market independently and exposes the Management Trainee branch only when enabled", () => {
		const store = useModelStore()
		model.setInternalStartingOptions([String(rf.SO_LABOR_MARKET)])
		expect(store.startingOptions.laborMarket).toBe(true)
		expect(rules.oneLevelAbove(rf.MANAGEMENT_TRAINEE)).toContain(rf.HEADHUNTER)
		expect(rules.oneLevelAbove(rf.RECRUITING_GIRL)).not.toContain(rf.HEADHUNTER)

		setActivePinia(createPinia())
		expect(useModelStore().startingOptions.laborMarket).toBe(false)
		expect(rules.oneLevelAbove(rf.MANAGEMENT_TRAINEE)).not.toContain(rf.HEADHUNTER)
	})

	it("serves every Labor Market image from the current site's static path", () => {
		const store = useModelStore()
		store.startingOptions.laborMarket = true
		expect(view.getImage(`emp_${rf.MANAGEMENT_TRAINEE}`)).toBe("/static/FCM/images/e_management_trainee_labor_market.png")
		expect(view.getImage(`emp_${rf.TEMPORARY_WORKER}`)).toBe("/static/FCM/images/e_temporary_worker.png")
		expect(view.getImage(`emp_${rf.HEADHUNTER}`)).toBe("/static/FCM/images/e_headhunter.png")
		expect(view.getImage(`emp_${rf.UNION_ORGANIZER}`)).toBe("/static/FCM/images/e_union_organizer.png")
		expect(view.getImage("so_laborMarket")).toBe("/static/FCM/images/so_laborMarket.svg")
	})
})

describe("Labor Market core rules", () => {
	it("freezes Temporary Worker actions from the removed count", () => {
		expect(rules.temporaryWorkerActionCount(0)).toBe(1)
		expect(rules.temporaryWorkerActionCount(5)).toBe(6)
	})

	it("computes employee level as training distance from a direct hire", () => {
		model.setInternalStartingOptions([String(rf.SO_LABOR_MARKET)])
		expect(rules.getEmployeeLevel(rf.RECRUITING_GIRL)).toBe(1)
		expect(rules.getEmployeeLevel(rf.HEADHUNTER)).toBe(2)
		expect(rules.getEmployeeLevel(rf.HR_DIRECTOR)).toBe(5)
		expect(rules.headhuntCost(rf.HR_DIRECTOR)).toBe(50)
	})

	it("assigns organizers to every eligible largest workforce with a five-worker threshold", () => {
		expect(rules.resolveUnionHolders([4, 4, 3])).toEqual([])
		expect(rules.resolveUnionHolders([5, 4, 4])).toEqual([0])
		expect(rules.resolveUnionHolders([5, 5, 4])).toEqual([0, 1])
		expect(rules.resolveUnionHolders([6, 5, 5])).toEqual([0])
		expect(rules.resolveUnionHolders([6, 6, 5])).toEqual([0, 1])
	})

	it("requires each holder to place the Union Organizer directly under the CEO", () => {
		const store = useModelStore()
		store.startingOptions.laborMarket = true
		store.players = [
			{
				ceoSlots: 2,
				employees: [rf.WAITRESS, rf.BLANK_EMPLOYEE_SPACE, rf.UNION_ORGANIZER],
				beach: [],
			},
		]
		store.laborMarket.unionHolders = [0]

		expect(rules.unionOrganizerPlacementRequired(0)).toBe(true)
		store.players[0].employees = [rf.WAITRESS, rf.UNION_ORGANIZER]
		expect(rules.unionOrganizerPlacementRequired(0)).toBe(false)
	})
})
