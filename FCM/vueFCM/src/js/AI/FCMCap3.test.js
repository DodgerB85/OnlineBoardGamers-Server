import { readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { beforeEach, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import { applyCap3Turn, cap3Seat } from "./FCMCap3"
import * as IO from "../../backend/FCM_IO"
import * as controller from "../FCMcontroller"
import * as funcs from "../FCMfuncs"
import * as map from "../FCMmap"
import * as model from "../FCMmodel"
import * as rf from "../FCMreference"
import { useModelStore } from "../../stores/FCMstore"
import { usePersonalStore } from "../../stores/FCMpersonal"

vi.mock("../../backend/FCM_IO", () => ({ saveGameNormal: vi.fn(async () => true) }))

const startingMap = [14, 2, 16, 0, 13, 1, 15, 0, 9, 2, 17, 0, 1, 3, 7, 0, 0, 3, 8, 0, 12, 2, 10, 3, 18, 1, 4, 3, 11, 1, 5, 2]
const startingOptions = [101, 102, rf.SO_CAP3_AI]

beforeEach(() => {
	setActivePinia(createPinia())
	vi.clearAllMocks()
	globalThis.window = { initData: { startingMap, startingOptions, playerNames: [rf.AI_NAME, "B", "C", "D"] } }
	globalThis.alert = vi.fn()
	if (!globalThis.pako) (0, eval)(readFileSync(new URL("../../../../../Lobby/static/Lobby/common/pakoLib.js", import.meta.url), "utf8"))
	const personal = usePersonalStore()
	personal.pov = 1
	personal.trainingGame = true
	const store = useModelStore()
	store.externalStartingOptions = startingOptions.slice()
	model.setInternalStartingOptions(startingOptions)
	model.setupNewGame()
})

it("recognizes Cap3 only for the opted-in four-seat game and applies a legal opening", async () => {
	const store = useModelStore()
	expect(cap3Seat()).toBe(0)
	window.initData.startingOptions = [101, 102]
	expect(cap3Seat()).toBe(-1)
	window.initData.startingOptions = startingOptions
	usePersonalStore().pov = -1
	await applyCap3Turn({ seat: 0, phase: 0, steps: [{ actions: [163773] }] })
	expect(store.players[0].restaurants[0]).toMatchObject({ index: 3443, rotation: 1 })
	expect(store.gameflow.turnOrder).toEqual([1, 2, 3])
	expect(IO.saveGameNormal).toHaveBeenCalledWith(false, false, false, { cap3Seat: 0 })
})

it.runIf(process.env.FCM_CAP3_BIN)(
	"plays a complete four-seat practice game through the native policy and Vue rules",
	async () => {
		const store = useModelStore()
		usePersonalStore().pov = -1
		const phases = new Set()
		let turns = 0
		while (store.gameflow.phase !== rf.PHASE_GAME_OVER && turns++ < 400) {
			const seat = store.gameflow.turnOrder[0]
			const p = store.players[seat]
			const originalName = p.name
			p.name = rf.AI_NAME
			controller.startPlayerTurn(false, true)
			const state = funcs.decompressData(funcs.exportFCMmodel(false, false))
			const metadata = {
				starting_map: map.getOriginalTiles(false), starting_options: startingOptions.map(String),
				turn: store.gameflow.turn, subphase: store.gameflow.subphase,
				availableEmployees: store.availableEmployees,
				availableMarketingCampaigns: store.availableMarketingCampaigns,
				availableMilestones: store.availableMilestones,
				bankruptPlayers: store.players.flatMap((p, i) => p.bankrupt ? [i] : []),
			}
			const result = execFileSync(process.env.FCM_CAP3_BIN, ["--cap3"], { input: JSON.stringify({ state, metadata }), encoding: "utf8", timeout: 20000 })
			const plan = JSON.parse(result)
			phases.add(plan.phase)
			try {
				await applyCap3Turn(plan)
			} catch (error) {
				throw new Error(`Round ${metadata.turn}, seat ${seat}, phase ${plan.phase}: ${result}`, { cause: error })
			}
			p.name = originalName
		}
		expect(store.gameflow.phase).toBe(rf.PHASE_GAME_OVER)
		expect(phases.has(rf.PHASE_PAYDAY)).toBe(true)
		expect(phases.has(rf.PHASE_RESTRUCTURING)).toBe(true)
	},
	120000,
)
