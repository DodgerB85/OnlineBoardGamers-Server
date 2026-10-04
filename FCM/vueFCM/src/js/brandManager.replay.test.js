import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

let replay, rf, useModelStore

beforeAll(async () => {
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	replay = await import("./FCMreplay.js")
	rf = await import("./FCMreference.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function player(name) {
	return {
		name,
		displayName: name,
		money: 100,
		employees: [],
		beach: [],
		marketers: [],
		milestones: [],
		resources: [],
		additionalMarketedGood: [],
	}
}

beforeEach(() => {
	setActivePinia(createPinia())
	const store = useModelStore()
	store.players.push(player("A"), player("B"), player("C"))
	store.mapData.coords = Array(300).fill(0)
	store.history.push([rf.HIST_SALARY, -1, 0, []])
})

// Live play logs the Brand Manager second good FIRST: placeMarketingCampaign pushes
// [secondGood, good]. The replay used to read that pair the other way round, so the
// airplane marketed coke on 6A instead of beer.
describe("brand manager replay", () => {
	it("reads [secondGood, good] from the marketing history", () => {
		const store = useModelStore()
		replay.replayStartMarketingCampaign(1, 0, [6, 0, [rf.BEER, rf.COKE]])

		expect(store.campaigns[0]).toMatchObject({ number: 6, good: rf.COKE })
		expect(store.players[0].additionalMarketedGood).toEqual([6, rf.BEER])
	})

	it("still reads a plain single good", () => {
		const store = useModelStore()
		replay.replayStartMarketingCampaign(1, 0, [6, 0, rf.COKE])

		expect(store.campaigns[0]).toMatchObject({ number: 6, good: rf.COKE })
		expect(store.players[0].additionalMarketedGood).toEqual([])
	})
})
