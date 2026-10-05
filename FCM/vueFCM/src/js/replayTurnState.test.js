/* global pako */
import { describe, it, expect, beforeAll } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let replay, rules, rf, useModelStore

beforeAll(async () => {
	if (!globalThis.pako) {
		;(0, eval)(fs.readFileSync(PAKO_FILE, "utf8"))
	}
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	globalThis.document = { querySelector: () => null, getElementById: () => null, createElement: () => ({ style: {} }) }
	replay = await import("./FCMreplay.js")
	rules = await import("./FCMrules.js")
	rf = await import("./FCMreference.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function player(name, employees = []) {
	return { name, displayName: name, colour: 0, restaurants: [], money: 0, employees: [...employees], beach: [], milestones: [], marketers: [], resources: [], additionalMarketedGood: [], coffeeShops: [], ceoSlots: 3, OOBpreference: 0 }
}

function setup() {
	setActivePinia(createPinia())
	const store = useModelStore()
	globalThis.window.initData = { startingMap: [13, 2, 4, 2, 5, 0, 10, 3, 25, 2, 15, 0, 1, 1, 11, 3, 20, 0], startingOptions: [], playerNames: ["a", "b"] }
	store.players.push(player("a", [rf.KITCHEN_TRAINEE]), player("b", [rf.KITCHEN_TRAINEE]))
	return store
}

// Live play runs the marketing phase once per Mass Marketeer and only ticks campaign
// durations down on the last of those passes. The replay has to rebuild that shape
// from the history, otherwise every replayed turn ends up short of money / demand.
describe("replay turn bookkeeping", () => {
	it("starts from an unbroken bank after importing a finished game", () => {
		const store = setup()
		// importFCMmodel infers bankBroken from the loaded history; a finished game
		// therefore leaves it set, which must not leak into the replay.
		store.bankBroken = 1
		replay.resetDataForReplay()
		expect(store.bankBroken).toBe(0)
	})

	it("leaves a fridge owner's items alone, kimchi and coffee included", () => {
		const store = setup()
		replay.resetDataForReplay()
		// FIRST_COKE_SOLD is what grants the fridge
		store.players[0].milestones.push(rf.FIRST_COKE_SOLD)
		store.players[0].resources.push(rf.COFFEE, rf.KIMCHI)
		replay.replayProduceKimchi(0, 0, [])
		replay.replayNewTurn(1, -1, [])
		// Live play only wipes the fridge for players without one, so the replay
		// must not add a second kimchi on top of the fresh one either.
		expect(store.players[0].resources).toEqual([rf.COFFEE, rf.KIMCHI, rf.KIMCHI])
	})

	it("keeps only the freshly made kimchi for a player with no fridge", () => {
		const store = setup()
		replay.resetDataForReplay()
		store.players[0].resources.push(rf.COFFEE, rf.KIMCHI)
		replay.replayProduceKimchi(0, 0, [])
		replay.replayNewTurn(1, -1, [])
		expect(store.players[0].resources).toEqual([rf.KIMCHI])
	})

	it("only expires campaign durations on the final marketing pass", () => {
		const store = setup()
		replay.resetDataForReplay()
		store.players[0].employees.push(rf.MASS_MARKETEER)
		store.campaigns.push({ number: rf.BILLBOARD, index: 1, good: rf.COKE, duration: 1, rotated: false })
		// Early Mass Marketeer pass: live play leaves the campaign running here
		replay.replayMarketingCampaigns(0, -1, [[rf.BILLBOARD, [], rf.COKE]])
		expect(store.campaigns).toHaveLength(1)
		// Final pass: tagged with the bare loop index
		replay.replayMarketingCampaigns(1, -1, [[rf.BILLBOARD, [], rf.COKE], 1])
		expect(store.campaigns).toHaveLength(0)
	})

	it("ends on the game over phase", () => {
		const store = setup()
		replay.resetDataForReplay()
		replay.replayEndGame(0, -1, [0])
		expect(store.gameflow.phase).toBe(rf.PHASE_GAME_OVER)
		expect(store.gameflow.fullTurnOrder).toEqual([0, 1])
	})
})
