/**
 * The hiring ledger (justHired) is client-only, so a save taken mid-turn and
 * then reloaded loses it while the beach keeps the already-hired cards. These
 * tests pin the rebuild-from-history path and the controller guards that stop
 * a stale hire/undo click from adding or removing the wrong card.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let controller, rf, rules, useModelStore

beforeAll(async () => {
	if (!globalThis.pako) {
		const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
		;(0, eval)(pakoSrc)
	}
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	controller = await import("./FCMcontroller.js")
	rf = await import("./FCMreference.js")
	rules = await import("./FCMrules.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function makePlayer() {
	return {
		name: "A",
		displayName: "A",
		money: 0,
		employees: [],
		beach: [],
		marketers: [],
		milestones: [],
		resources: [],
		restaurants: [],
		ceoSlots: 3,
		ceoAction: rf.CEO_ACTION_HIRE_1,
		OOBpreference: 0,
	}
}

beforeEach(() => {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.players.push(makePlayer())
	store.gameflow.turn = 1
	store.gameflow.turnOrder = [0]
	store.gameflow.phase = rf.PHASE_WORKING_DAY
	store.gameflow.subphase = rf.SUBPHASE_HIRING
	store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
	store.history.push([rf.HIST_NEW_TURN, -1, 0, [1, 200, [0]]])
})

describe("hiring ledger", () => {
	it("records a hire immediately so a mid-turn reload cannot hire the card again", () => {
		const store = useModelStore()
		expect(controller.hireEmployee(rf.TRAINER)).toBe(true)
		expect(store.history.find((h) => h[0] === rf.HIST_HIRE)[3]).toEqual([rf.TRAINER])
		expect(store.players[0].beach).toEqual([rf.TRAINER])

		// Simulate the reload: context is client-only and comes back empty.
		store.context.justHired.length = 0
		store.context.endOfDaySummaryData.hire.hired.length = 0
		controller.startPlayerWorkingDaySubphase(rf.SUBPHASE_HIRING)

		expect(store.context.justHired).toEqual([rf.TRAINER])
		expect(store.context.endOfDaySummaryData.hire.hired).toEqual([rf.TRAINER])
		expect(store.context.endOfDaySummaryData.hire.total).toBe(1)
		expect(rules.getRemainingRecruitingPoints(0)).toBe(0)
		expect(controller.hireEmployee(rf.TRAINER)).toBe(false)
		expect(store.players[0].beach).toEqual([rf.TRAINER])
	})

	it("a cleared ledger cannot spend the same point again while the hire log remains", () => {
		const store = useModelStore()
		expect(controller.hireEmployee(rf.TRAINER)).toBe(true)

		// A restore can clear the client-only ledger while the saved log and beach stay.
		store.context.justHired.length = 0
		store.context.endOfDaySummaryData.hire.hired.length = 0

		expect(rules.getRemainingRecruitingPoints(0)).toBe(0)
		expect(controller.hireEmployee(rf.TRAINER)).toBe(false)
		expect(store.players[0].beach).toEqual([rf.TRAINER])
	})

	it("undo removes the hire from history immediately too", () => {
		const store = useModelStore()
		controller.hireEmployee(rf.TRAINER)
		expect(controller.undoHireEmployee(rf.TRAINER)).toBe(true)
		expect(store.history.find((h) => h[0] === rf.HIST_HIRE)[3]).toEqual([])
		expect(store.players[0].beach).toEqual([])
		expect(rules.getRemainingRecruitingPoints(0)).toBe(1)
	})

	it("does not carry a previous turn's hire into this turn", () => {
		const store = useModelStore()
		store.history.splice(0)
		store.history.push([rf.HIST_NEW_TURN, -1, 0, [1, 200, [0]]])
		store.history.push([rf.HIST_HIRE, 0, 100, [rf.TRAINER]])
		store.history.push([rf.HIST_NEW_TURN, -1, 0, [2, 200, [0]]])

		controller.startPlayerWorkingDaySubphase(rf.SUBPHASE_HIRING)

		expect(store.context.justHired).toEqual([])
		expect(rules.getRemainingRecruitingPoints(0)).toBe(1)
	})

	it("ignores a stale hire or undo click after the hiring subphase", () => {
		const store = useModelStore()
		store.players[0].beach = [rf.TRAINER]
		store.context.justHired.push(rf.TRAINER)
		store.gameflow.subphase = rf.SUBPHASE_TRAINING

		expect(controller.hireEmployee(rf.TRAINER)).toBe(false)
		expect(controller.undoHireEmployee(rf.TRAINER)).toBe(false)
		expect(store.players[0].beach).toEqual([rf.TRAINER])
		expect(store.context.justHired).toEqual([rf.TRAINER])
	})

	it("a stale undo click cannot remove a different card", () => {
		const store = useModelStore()
		store.players[0].beach = [rf.TRAINER, rf.WAITRESS]
		store.context.justHired.push(rf.TRAINER, rf.WAITRESS)
		store.context.endOfDaySummaryData.hire.hired.push(rf.TRAINER, rf.WAITRESS)

		expect(controller.undoHireEmployee(rf.WAITRESS)).toBe(true)
		expect(controller.undoHireEmployee(rf.WAITRESS)).toBe(false)
		expect(store.players[0].beach).toEqual([rf.TRAINER])
		expect(store.context.justHired).toEqual([rf.TRAINER])
	})
})
