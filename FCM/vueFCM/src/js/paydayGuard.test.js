/**
 * Payday insolvency guard (FCM_IO.saveSimulMove).
 * A player holding the First Trainer Used milestone never goes bankrupt at
 * payday: rules.paySalaries takes all their cash and keeps every employee, so
 * the guard must not reset their move and force payday again.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let IO, rf, rules, useModelStore

beforeAll(async () => {
	if (!globalThis.pako) {
		const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
		;(0, eval)(pakoSrc)
	}
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	IO = await import("../backend/FCM_IO.js")
	rf = await import("./FCMreference.js")
	rules = await import("./FCMrules.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function makePlayer(index, money = 0) {
	return {
		name: `P${index + 1}`,
		displayName: `P${index + 1}`,
		money,
		employees: [],
		beach: [],
		marketers: [],
		milestones: [],
		resources: [],
		restaurants: [],
		ceoSlots: 3,
		ceoAction: rf.CEO_ACTION_HIRE_1,
		OOBpreference: "0",
	}
}

beforeEach(() => {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.players.push(makePlayer(0, 0))
	store.players[0].employees = [rf.BURGER_COOK]
	store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
})

describe("payday insolvency guard", () => {
	it("without the trainer milestone a full-bill move is insolvent", () => {
		const store = useModelStore()
		expect(rules.salary(0)).toBe(5)
		expect(IO.paydayDueForGuard(0, [[-8], []])).toBe(5)
		expect(store.players[0].money).toBeLessThan(5)
	})

	it("with the trainer milestone a manual no-fire move is never insolvent", () => {
		const store = useModelStore()
		store.players[0].milestones = [rf.FIRST_TRAINER_USED]
		expect(IO.paydayDueForGuard(0, [[-8], []])).toBe(0)

		// ...and the bust rule really does keep the employees
		rules.paySalaries([[]])
		expect(store.players[0].money).toBe(0)
		expect(store.players[0].employees).toEqual([rf.BURGER_COOK])
	})

	it("with the trainer milestone part-paying in food is never insolvent", () => {
		const store = useModelStore()
		store.players[0].milestones = [rf.FIRST_TRAINER_USED, rf.FIRST_BEER_SOLD]
		expect(IO.paydayDueForGuard(0, [[-8], [rf.PIZZA]])).toBe(0)
	})

	it("firing salaried employees still reduces what a non-trainer owes", () => {
		useModelStore().players[0].money = 1
		expect(IO.paydayDueForGuard(0, [[rf.BURGER_COOK], []])).toBe(0)
	})
})
