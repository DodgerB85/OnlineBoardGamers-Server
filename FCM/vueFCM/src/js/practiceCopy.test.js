/**
 * Copying a game to a practice game during restructuring must not leak the
 * structures already chosen: every card goes back on the beach and the copy
 * starts from the first player in a non-simultaneous game.
 */
/* global pako */
import { beforeAll, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let funcs, mapMod, model, rf, useModelStore

beforeAll(async () => {
	if (!globalThis.pako) {
		const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
		;(0, eval)(pakoSrc)
	}
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	funcs = await import("./FCMfuncs.js")
	mapMod = await import("./FCMmap.js")
	model = await import("./FCMmodel.js")
	rf = await import("./FCMreference.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

describe("practice game copy", () => {
	it("starts restructuring clean from the first player", () => {
		setActivePinia(createPinia())
		const store = useModelStore()
		model.setInternalStartingOptions(["49"])
		store.mapData.tiles = mapMod.generateRandomMap(2)
		mapMod.initCoords()
		store.players.splice(0)
		for (let i = 0; i < 2; i++) {
			store.players.push({
				name: "P" + i,
				displayName: "P" + i,
				colour: i,
				restaurants: [],
				money: 100,
				employees: [],
				beach: [],
				milestones: [],
				marketers: [],
				resources: [],
				additionalCampaignArrayIndex: -1,
				additionalMarketedGood: [],
				coffeeShops: [],
				ceoSlots: 3,
				ceoAction: rf.CEO_ACTION_HIRE_1,
				OOBpreference: 0,
			})
		}
		store.gameflow.turn = 5
		store.gameflow.phase = rf.PHASE_RESTRUCTURING
		store.gameflow.fullTurnOrder = [1, 0]
		store.gameflow.turnOrder = [0]
		store.gameflow.newTurnOrder = [0, 1]
		store.players[0].employees = [rf.WAITRESS, rf.BURGER_COOK]
		store.players[0].beach = [rf.PIZZA_COOK]

		const prepared = funcs.exportPracticeFCMmodel()
		const data = funcs.decompressData(prepared.data)

		expect(prepared.phase).toBe(rf.PHASE_RESTRUCTURING)
		expect(prepared.turn).toBe(5)
		expect(data[2][1]).toBe(rf.PHASE_RESTRUCTURING)
		expect(data[2][2]).toEqual([1, 0])
		expect(data[2]).toHaveLength(3)
		expect(data[0][0][4]).toEqual([rf.BLANK_EMPLOYEE_SPACE, rf.BLANK_EMPLOYEE_SPACE, rf.BLANK_EMPLOYEE_SPACE])
		expect(data[0][0][5]).toEqual(expect.arrayContaining([rf.WAITRESS, rf.BURGER_COOK, rf.PIZZA_COOK]))

		// A copy taken from an earlier replay step must not carry later history.
		store.history.splice(
			0,
			store.history.length,
			[rf.HIST_NEW_TURN, -1, 100, [1]],
			[rf.HIST_HIRE, 0, 110, [rf.WAITRESS]],
			[rf.HIST_NEW_TURN, -1, 120, [2]],
		)
		store.viewSettings.showReplay = true
		store.replayStep = 0
		const replayData = funcs.decompressData(funcs.exportPracticeFCMmodel().data)
		expect(replayData[8]).toHaveLength(2)
	})
})
