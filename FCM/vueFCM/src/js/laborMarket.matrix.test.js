import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let controller, funcs, IO, model, playerRules, rf, rules, useModelStore, usePersonalStore

beforeAll(async () => {
	if (!globalThis.pako) {
		const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
		;(0, eval)(pakoSrc)
	}
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	controller = await import("./FCMcontroller.js")
	funcs = await import("./FCMfuncs.js")
	IO = await import("../backend/FCM_IO.js")
	model = await import("./FCMmodel.js")
	playerRules = await import("./FCMplayer.js")
	rf = await import("./FCMreference.js")
	rules = await import("./FCMrules.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
	;({ usePersonalStore } = await import("../stores/FCMpersonal.js"))
})

function makePlayer(index, money = 200) {
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
	}
}

function setupPlayers(count = 3) {
	const store = useModelStore()
	for (let i = 0; i < count; i++) store.players.push(makePlayer(i))
	store.gameflow.turnOrder = [...Array(count).keys()]
	store.gameflow.fullTurnOrder = [...store.gameflow.turnOrder]
	store.startingOptions.laborMarket = true
	store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
	store.context.headhunterActionsUsed = 0
	store.context.justHeadhunted = []
	return store
}

beforeEach(() => {
	setActivePinia(createPinia())
})

describe("Temporary Worker player-count and role matrix", () => {
	for (let count = 2; count <= 6; count++) {
		it(`${count} players receive one card and share the same turn-start action count`, () => {
			const store = setupPlayers(count)
			model.setupLaborMarketExpansion()
			expect(store.players.every((player) => player.beach.filter((employee) => employee === rf.TEMPORARY_WORKER).length === 1)).toBe(true)

			for (let playerIndex = 0; playerIndex < count; playerIndex++) {
				store.gameflow.turnOrder = [playerIndex]
				const player = store.players[playerIndex]
				player.beach.splice(player.beach.indexOf(rf.TEMPORARY_WORKER), 1)
				player.employees.push(rf.TEMPORARY_WORKER)
				const choice = controller.chooseTemporaryWorkerRole(rf.PRICING_MANAGER)
				expect(choice.limit).toBe(1)
				expect(controller.consumeTemporaryWorker(playerIndex)).toBe(true)
			}

			expect(store.laborMarket.removedTemporaryWorkers).toBe(count)
			model.startLaborMarketTurn()
			expect(store.laborMarket.removedTemporaryWorkersAtTurnStart).toBe(count)
			expect(rules.temporaryWorkerActionCount(store.laborMarket.removedTemporaryWorkersAtTurnStart)).toBe(count + 1)
			expect(store.players.flatMap((player) => [...player.employees, ...player.beach])).not.toContain(rf.TEMPORARY_WORKER)
		})
	}

	it("accepts each of the seven exact base roles and no other employee", () => {
		const store = setupPlayers(1)
		store.players[0].employees = [rf.TEMPORARY_WORKER]
		store.laborMarket.dailyTemporaryEffects = [null]
		for (const role of rf.TEMPORARY_WORKER_ROLES) {
			store.laborMarket.dailyTemporaryEffects[0] = null
			expect(controller.chooseTemporaryWorkerRole(role)).toEqual({ roles: [role], limit: 1 })
		}
		store.laborMarket.dailyTemporaryEffects[0] = null
		expect(controller.chooseTemporaryWorkerRole(rf.CFO)).toBe(false)
	})

	it("keeps the CEO's base recruiting action separate from the Temporary Worker role", () => {
		const store = setupPlayers(1)
		store.players[0].employees = [rf.TEMPORARY_WORKER]
		store.laborMarket.dailyTemporaryEffects = [null]
		controller.chooseTemporaryWorkerRole(rf.TRAINER)
		expect(rules.getRemainingRecruitingPoints(0)).toBe(1)

		store.laborMarket.dailyTemporaryEffects[0] = null
		controller.chooseTemporaryWorkerRole(rf.RECRUITING_GIRL)
		expect(rules.getRemainingRecruitingPoints(0)).toBe(2)
	})

	it("applies all passive actions when a role is confirmed without a numeric override", () => {
		const store = setupPlayers(1)
		store.players[0].employees = [rf.TEMPORARY_WORKER]
		store.laborMarket.removedTemporaryWorkers = 2
		store.laborMarket.removedTemporaryWorkersAtTurnStart = 2
		store.laborMarket.dailyTemporaryEffects = [null]
		controller.chooseTemporaryWorkerRole(rf.PRICING_MANAGER)
		expect(store.laborMarket.dailyTemporaryEffects[0]).toEqual({ roles: [rf.PRICING_MANAGER, rf.PRICING_MANAGER, rf.PRICING_MANAGER], limit: 3, usedByRole: { [rf.PRICING_MANAGER]: 3 } })
	})

	it("does not award passive-action milestones when all optional actions are forgone", () => {
		const store = setupPlayers(1)
		store.players[0].employees = [rf.TEMPORARY_WORKER]
		store.laborMarket.dailyTemporaryEffects = [null]
		controller.chooseTemporaryWorkerRole(rf.WAITRESS, 0)
		expect(store.players[0].milestones).not.toContain(rf.FIRST_WAITRESS)
		store.laborMarket.dailyTemporaryEffects[0] = null
		controller.chooseTemporaryWorkerRole(rf.PRICING_MANAGER, 0)
		expect(store.players[0].milestones).not.toContain(rf.FIRST_LOWER_PRICES)
	})

	it("awards both compatible Waitress action milestones when the passive action is used", () => {
		const store = setupPlayers(1)
		store.players[0].employees = [rf.TEMPORARY_WORKER]
		store.laborMarket.dailyTemporaryEffects = [null]
		store.availableMilestones = [rf.FIRST_WAITRESS, rf.FIRST_WAITRESS_USED]
		controller.chooseTemporaryWorkerRole(rf.WAITRESS)
		expect(store.players[0].milestones).toContain(rf.FIRST_WAITRESS)
		expect(store.players[0].milestones).toContain(rf.FIRST_WAITRESS_USED)
	})
})

describe("Headhunter live market and cost matrix", () => {
	it("prices levels one through five at $10 increments", () => {
		setupPlayers()
		const examples = [rf.RECRUITING_GIRL, rf.CART_OPERATOR, rf.TRUCK_DRIVER, rf.ZEPPELIN_PILOT, rf.HR_DIRECTOR]
		expect(examples.map((employee) => rules.getEmployeeLevel(employee))).toEqual([1, 2, 3, 4, 5])
		expect(examples.map((employee) => rules.headhuntCost(employee))).toEqual([10, 20, 30, 40, 50])
	})

	it("lets a later Headhunter use the live Beach without transferring money immediately", () => {
		const store = setupPlayers()
		store.players[0].employees = [rf.HEADHUNTER]
		store.players[1].employees = [rf.HEADHUNTER]
		store.players[1].money = 0
		store.players[1].beach = [rf.HR_DIRECTOR]

		expect(controller.headhuntEmployee(0, 1, 0)).toEqual({ employee: rf.HR_DIRECTOR, cost: 50 })
		expect(store.players.map((player) => player.money)).toEqual([200, 0, 200])
		expect(store.laborMarket.pendingHeadhuntSalaries[0]).toEqual([{ employee: rf.HR_DIRECTOR, cost: 50 }])
		store.context.headhunterActionsUsed = 0
		expect(controller.headhuntEmployee(1, 0, 0)).toEqual({ employee: rf.HR_DIRECTOR, cost: 50 })
		expect(store.players.map((player) => player.money)).toEqual([200, 0, 200])
		expect(store.players[1].beach).toEqual([rf.HR_DIRECTOR])
	})

	it("charges a kept employee once at Payday and waives the charge when it is fired", () => {
		const store = setupPlayers(2)
		store.players[0].employees = [rf.HEADHUNTER]
		store.players[0].money = 100
		store.players[1].beach = [rf.HR_DIRECTOR]
		controller.headhuntEmployee(0, 1, 0)
		store.players[0].employees = []

		expect(rules.baseSalary(0)).toBe(5)
		expect(rules.headhuntSalaryDue(0)).toBe(50)
		expect(rules.salary(0)).toBe(55)
		rules.paySalaries([[], []])
		expect(store.players[0].money).toBe(45)
		expect(store.bank).toBe(55)
		expect(rules.headhuntSalaryDue(0)).toBe(0)
		expect(rules.salary(0)).toBe(5)

		store.laborMarket.pendingHeadhuntSalaries[0] = [{ employee: rf.HR_DIRECTOR, cost: 50 }]
		expect(playerRules.fireEmployee(0, rf.HR_DIRECTOR)).toBe(true)
		expect(rules.headhuntSalaryDue(0)).toBe(0)
	})

	it("distinguishes a native employee from an identical headhunted employee when firing", () => {
		const store = setupPlayers(2)
		store.players[0].beach = [rf.JUNIOR_VICE_PRESIDENT, rf.JUNIOR_VICE_PRESIDENT]
		store.players[0].milestones = [rf.FIRST_TRAIN]
		store.laborMarket.pendingHeadhuntSalaries[0] = [{ employee: rf.JUNIOR_VICE_PRESIDENT, cost: 20 }]

		const choices = rules.fireableEmployeeChoices(0).filter((choice) => choice.employee === rf.JUNIOR_VICE_PRESIDENT)
		expect(choices).toHaveLength(2)
		expect(choices.map((choice) => choice.headhunted)).toEqual([true, false])
		expect(rules.salary(0)).toBe(15)

		const nativeChoice = choices.find((choice) => !choice.headhunted)
		expect(playerRules.fireEmployee(0, nativeChoice.fireToken)).toBe(true)
		expect(rules.headhuntSalaryDue(0)).toBe(10)
		expect(rules.salary(0)).toBe(10)

		store.players[0].beach = [rf.JUNIOR_VICE_PRESIDENT, rf.JUNIOR_VICE_PRESIDENT]
		store.laborMarket.pendingHeadhuntSalaries[0] = [{ employee: rf.JUNIOR_VICE_PRESIDENT, cost: 20 }]
		const headhuntedChoice = rules.fireableEmployeeChoices(0).find((choice) => choice.employee === rf.JUNIOR_VICE_PRESIDENT && choice.headhunted)
		expect(playerRules.fireEmployee(0, headhuntedChoice.fireToken)).toBe(true)
		expect(store.laborMarket.pendingHeadhuntSalaries[0]).toEqual([])
		expect(rules.salary(0)).toBe(0)
		expect(playerRules.restoreFiredEmployee(0, headhuntedChoice.fireToken)).toBe(rf.JUNIOR_VICE_PRESIDENT)
		expect(store.laborMarket.pendingHeadhuntSalaries[0]).toEqual([{ employee: rf.JUNIOR_VICE_PRESIDENT, cost: 20 }])
		expect(rules.salary(0)).toBe(15)
	})

	it("reduces salary for each of two identical Headhunters fired in sequence", () => {
		const store = setupPlayers(2)
		store.players[0].beach = [rf.HEADHUNTER, rf.HEADHUNTER]
		expect(rules.salary(0)).toBe(10)
		expect(playerRules.fireEmployee(0, rf.HEADHUNTER)).toBe(true)
		expect(rules.salary(0)).toBe(5)
		expect(playerRules.fireEmployee(0, rf.HEADHUNTER)).toBe(true)
		expect(rules.salary(0)).toBe(0)
	})

	it("keeps job-switch salary cash-only and applies Trainer bankruptcy protection", () => {
		const store = setupPlayers(2)
		store.players[0].money = 20
		store.players[0].beach = [rf.HR_DIRECTOR]
		store.players[0].resources = [rf.BURGER, rf.PIZZA, rf.BEER, rf.LEMONADE, rf.BURGER, rf.PIZZA]
		store.players[0].milestones = [rf.FIRST_BEER_SOLD]
		store.laborMarket.pendingHeadhuntSalaries[0] = [{ employee: rf.HR_DIRECTOR, cost: 50 }]

		expect(rules.canAffordPayDay(0)).toBe(false)
		store.players[0].milestones.push(rf.FIRST_TRAINER_USED)
		rules.paySalaries([[rf.BURGER], []])
		expect(store.players[0].money).toBe(0)
		expect(store.players[0].beach).toContain(rf.HR_DIRECTOR)
		expect(store.bank).toBe(20)
		expect(rules.headhuntSalaryDue(0)).toBe(0)
	})

	it("resolves two active Headhunters in order and rejects a stale second target", () => {
		const store = setupPlayers(2)
		store.players[0].employees = [rf.HEADHUNTER, rf.HEADHUNTER]
		store.players[1].beach = [rf.RECRUITING_GIRL, rf.TRAINER]
		expect(controller.headhuntEmployee(0, 1, 0)).toEqual({ employee: rf.RECRUITING_GIRL, cost: 10 })
		expect(controller.headhuntEmployee(0, 1, 1)).toBe(false)
		expect(controller.headhuntEmployee(0, 1, 0)).toEqual({ employee: rf.TRAINER, cost: 10 })
		expect(controller.headhuntEmployee(0, 1, 0)).toBe(false)
	})
})

describe("Union enforcement and module composition", () => {
	it("records every submitted simultaneous structure before resolving Union Organizers", () => {
		const store = setupPlayers(3)
		store.gameflow.phase = rf.PHASE_RESTRUCTURING
		store.laborMarket.workedCounts = [0, 0, 0]
		const moves = store.players.map((player, playerIndex) => [
			player.name,
			[rf.PHASE_RESTRUCTURING],
			Date.now() + playerIndex,
			[[], Array.from({ length: playerIndex + 4 }, () => rf.WAITRESS), 0],
		])

		IO.processSimulMoveData(funcs.compressObjectToDB(moves))

		expect(store.laborMarket.workedCounts).toEqual([4, 5, 6])
		expect(rules.resolveUnionHolders(store.laborMarket.workedCounts)).toEqual([2])
	})

	it("blocks restructuring submission until the holder places the Union Organizer", async () => {
		const store = setupPlayers(2)
		const personal = usePersonalStore()
		personal.pov = 0
		personal.trainingGame = true
		store.gameflow.phase = rf.PHASE_RESTRUCTURING
		store.gameflow.turnOrder = [0, 1]
		store.laborMarket.unionHolders = [0]
		store.players[0].beach = [rf.UNION_ORGANIZER]
		store.players[0].employees = [rf.WAITRESS]

		await controller.endPlayerTurn(false)
		expect(store.gameflow.turnOrder).toEqual([0, 1])
		expect(store.gameMessages.actionError).not.toBe("")

		store.gameMessages.actionError = ""
		store.players[0].beach = []
		store.players[0].employees = [rf.WAITRESS, rf.TRAINER, rf.ERRAND_BOY, rf.UNION_ORGANIZER]
		await controller.endPlayerTurn(false)
		expect(store.gameflow.turnOrder).toEqual([0, 1])
		expect(store.gameMessages.actionError).not.toBe("")

		store.players[0].employees = [rf.WAITRESS, rf.UNION_ORGANIZER, rf.ERRAND_BOY]
		expect(rules.snapshotWorkedCount(0)).toBe(2)
	})

	it("keeps Labor Market independently enabled with every high-risk module combination", () => {
		const combinations = [
			[rf.SO_COFFEE],
			[rf.SO_NIGHT_SHIFT],
			[rf.SO_NEW_MS],
			[rf.SO_HARD_CHOICES],
			[rf.SO_SANDBOX_MODE],
			[rf.SO_FRIED_CHICKEN],
			[rf.SO_STADIUM],
			[rf.SO_COFFEE, rf.SO_NIGHT_SHIFT, rf.SO_NEW_MS, rf.SO_SANDBOX_MODE, rf.SO_FRIED_CHICKEN, rf.SO_STADIUM],
		]
		for (const options of combinations) {
			setActivePinia(createPinia())
			model.setInternalStartingOptions([...options, rf.SO_LABOR_MARKET].map(String))
			expect(useModelStore().startingOptions.laborMarket).toBe(true)
		}
	})

	it("leaves base-game state untouched when Labor Market is disabled", () => {
		const store = setupPlayers(3)
		store.startingOptions.laborMarket = false
		const before = store.players.map((player) => ({ employees: [...player.employees], beach: [...player.beach] }))
		expect(controller.settleUnionOrganizer()).toEqual([])
		expect(store.players.map((player) => ({ employees: [...player.employees], beach: [...player.beach] }))).toEqual(before)
		expect(rules.temporaryWorkerEffect(0)).toEqual({ roles: [], limit: 0, usedByRole: {} })
	})

	it("keeps all three roles coherent in one lifecycle", () => {
		const store = setupPlayers(2)
		store.players[0].employees = [rf.TEMPORARY_WORKER, rf.HEADHUNTER]
		store.players[1].employees = [rf.UNION_ORGANIZER, rf.WAITRESS, rf.RECRUITING_GIRL, rf.TRAINER, rf.ERRAND_BOY, rf.KITCHEN_TRAINEE]
		store.players[1].beach = [rf.TRAINER]
		store.laborMarket.unionHolders = [1]
		store.laborMarket.dailyTemporaryEffects = [null, null]

		expect(controller.chooseTemporaryWorkerRole(rf.KITCHEN_TRAINEE)).toEqual({ roles: [rf.KITCHEN_TRAINEE], limit: 1 })
		expect(controller.headhuntEmployee(0, 1, 0)).toEqual({ employee: rf.TRAINER, cost: 10 })
		expect(rules.snapshotWorkedCount(0)).toBe(2)
		expect(rules.snapshotWorkedCount(1)).toBe(5)
		expect(controller.consumeTemporaryWorker(0)).toBe(true)
		expect(controller.settleUnionOrganizer()).toEqual([1])
		expect(store.players[0].beach).toContain(rf.TRAINER)
		expect(store.players.flatMap((player) => [...player.employees, ...player.beach]).filter((employee) => employee === rf.UNION_ORGANIZER)).toHaveLength(1)
	})
})
