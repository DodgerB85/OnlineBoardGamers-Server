import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const { saveSimulMoveMock } = vi.hoisted(() => ({ saveSimulMoveMock: vi.fn(() => Promise.resolve()) }))

vi.mock("../backend/FCM_IO.js", async (importOriginal) => {
	const actual = await importOriginal()
	return { ...actual, saveSimulMove: saveSimulMoveMock }
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let Bot, rf, useModelStore, usePersonalStore

beforeAll(async () => {
	if (!globalThis.pako) {
		const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
		;(0, eval)(pakoSrc)
	}
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	rf = await import("./FCMreference.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
	;({ usePersonalStore } = await import("../stores/FCMpersonal.js"))
	Bot = await import("./FCMbot.js")
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
		OOBpreference: "0",
	}
}

beforeEach(() => {
	setActivePinia(createPinia())
	saveSimulMoveMock.mockClear()
})

afterEach(() => {
	saveSimulMoveMock.mockClear()
})

describe("passKickout default move generators", () => {
	it("generatePaydayDefaultMove is pure and never fires non-fireable employees", () => {
		const store = useModelStore()
		store.players.push(makePlayer(0, 4))
		store.players[0].employees = [rf.CART_OPERATOR, rf.TRUCK_DRIVER, rf.TEMPORARY_WORKER]

		const before = [...store.players[0].employees]
		const move = Bot.generatePaydayDefaultMove(0)

		expect(store.players[0].employees).toEqual(before, "the generator must not mutate the store")
		expect(move[0]).toEqual([rf.TRUCK_DRIVER, rf.CART_OPERATOR], "fires salary employees, never the temporary worker")
	})

	it("generateCleanupDefaultMove returns a flat token array without mutating resources", () => {
		const store = useModelStore()
		store.players.push(makePlayer(0))
		store.players[0].milestones = [rf.FIRST_THROW_AWAY]
		store.players[0].resources = [rf.LEMONADE, rf.FIRST_THROW_AWAY, rf.BEER, rf.PIZZA, rf.BURGER, 6, 7, 8, 9, 10, 11, 12]

		const before = [...store.players[0].resources]
		const move = Bot.generateCleanupDefaultMove(0)

		expect(store.players[0].resources).toEqual(before, "the generator must not mutate the store")
		expect(move.every((token) => typeof token === "number")).toBe(true, "cleanup tokens must be a flat int array")
		expect(move).toEqual(before.slice(10), "bins everything past the ten kept resources")
	})
})

describe("passKickout", () => {
	it("saves the timed-out player's restructuring move under their own name", () => {
		const store = useModelStore()
		const personal = usePersonalStore()
		personal.pov = 1
		store.players.push(makePlayer(0), makePlayer(1))
		store.gameflow.turnOrder = [0, 1]
		store.gameflow.phase = rf.PHASE_RESTRUCTURING
		store.players[0].beach = [rf.WAITRESS]
		store.players[0].employees = [rf.CART_OPERATOR, rf.BLANK_EMPLOYEE_SPACE]
		store.players[0].OOBpreference = "2"

		Bot.passKickout()

		expect(personal.kickoutRequired).toBe(0)
		expect(store.gameflow.turnOrder).toEqual([1])
		expect(saveSimulMoveMock).toHaveBeenCalledTimes(1)
		const [moveData, continueFromStalledGame, passKickoutFor] = saveSimulMoveMock.mock.calls[0]
		expect(continueFromStalledGame).toBe(false)
		expect(passKickoutFor).toBe("P1", "the default move must be attributed to the timed-out player")
		expect(moveData).toEqual([[rf.WAITRESS], [rf.CART_OPERATOR], 2])
	})

	it("submitss a flat cleanup move for a timed-out player who must bin", () => {
		const store = useModelStore()
		store.players.push(makePlayer(0), makePlayer(1))
		store.gameflow.turnOrder = [0, 1]
		store.gameflow.phase = rf.PHASE_CLEAN_UP
		store.players[0].milestones = [rf.FIRST_THROW_AWAY]
		store.players[0].resources = [rf.LEMONADE, rf.FIRST_THROW_AWAY, rf.BEER, rf.PIZZA, rf.BURGER, 6, 7, 8, 9, 10, 11, 12]

		Bot.passKickout()

		expect(saveSimulMoveMock).toHaveBeenCalledTimes(1)
		const [moveData, , passKickoutFor] = saveSimulMoveMock.mock.calls[0]
		expect(passKickoutFor).toBe("P1")
		expect(moveData).toEqual([[[-9], []], [11, 12]])
	})
})