import { describe, it, expect, beforeAll, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"

let replay, rules, rf, storeMod

beforeAll(async () => {
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	globalThis.window.initData = { startingOptions: [], startingMap: [], playerNames: [] }
	replay = await import("./FCMreplay.js")
	rules = await import("./FCMrules.js")
	rf = await import("./FCMreference.js")
	storeMod = await import("../stores/FCMstore.js")
})

// The live game logs sales milestones BEFORE the dinner history entry but awards them
// AFTER the bonus calc, so the sale that earns First Fried Chicken Sold must not get its
// own +$5 perk. Replay must reproduce that.
describe("fried chicken replay bonus timing", () => {
	it("hides a just-earned First Fried Chicken Sold during the dinner recompute", () => {
		setActivePinia(createPinia())
		const store = storeMod.useModelStore()
		store.players.push({ milestones: [rf.FIRST_FRIED_CHICKEN_SOLD], money: 0 })
		store.history.push([rf.HIST_NEW_MILESTONE, 0, 0, [rf.FIRST_FRIED_CHICKEN_SOLD]])
		store.history.push([rf.HIST_DINNER_TIME, -1, 0, []])

		let activeDuringDinner = null
		vi.spyOn(rules, "doDinnerTime").mockImplementation(() => {
			activeDuringDinner = store.players[0].milestones.includes(rf.FIRST_FRIED_CHICKEN_SOLD)
		})

		replay.replayDinnerTime(1, -1, [])

		expect(activeDuringDinner).toBe(false)
		expect(store.players[0].milestones).toContain(rf.FIRST_FRIED_CHICKEN_SOLD)
	})

	it("keeps a fried chicken milestone earned at an earlier dinner", () => {
		setActivePinia(createPinia())
		const store = storeMod.useModelStore()
		store.players.push({ milestones: [rf.FIRST_FRIED_CHICKEN_SOLD], money: 0 })
		store.history.push([rf.HIST_DINNER_TIME, -1, 0, []])
		store.history.push([rf.HIST_DINNER_TIME, -1, 0, []])

		let activeDuringDinner = null
		vi.spyOn(rules, "doDinnerTime").mockImplementation(() => {
			activeDuringDinner = store.players[0].milestones.includes(rf.FIRST_FRIED_CHICKEN_SOLD)
		})

		replay.replayDinnerTime(1, -1, [])

		expect(activeDuringDinner).toBe(true)
	})
})
