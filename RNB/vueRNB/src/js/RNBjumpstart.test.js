// Run with: npm test
import { test, expect, vi } from "vitest"
import * as rf from "./RNBreference"

const store = { players: [], gameflow: {}, gameOptions: {}, mapData: { setupData: {} }, history: [], wonderBricks: [] }
vi.mock("../stores/RNBstore.js", () => ({ useModelStore: () => store }))
vi.mock("./RNBmodel", () => ({ addHistory: (event, playerIndex, _t, params) => store.history.push([event, playerIndex, 0, params]) }))
vi.mock("./RNBwonder", () => ({ syncPoldersToBrickCount: () => {} }))

globalThis.window = { initData: {} }
const js = await import("./RNBjumpstart")

function newGame(names, presetPiles) {
	store.players = names.map((name) => ({ name, displayName: name }))
	store.gameflow = { fullTurnOrder: names.map((_n, i) => i), turnOrder: [], jumpstart: {} }
	store.gameOptions = { useJumpStart: true }
	store.mapData.setupData = presetPiles ? { JS: presetPiles } : {}
	store.history = []
	store.wonderBricks = []
	js.setupJumpstart()
}

test("variant: 5 goods each round-robin, then bidding, then home tiles in pile order", () => {
	newGame(["a", "b", "c"])
	expect(store.gameflow.phase).toBe(rf.PHASE_JUMPSTART_PILES)
	expect(store.gameflow.turnOrder).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2])
	while (store.gameflow.phase === rf.PHASE_JUMPSTART_PILES) {
		const p = store.gameflow.turnOrder[0]
		expect(js.addGoodToPile(p, p, rf.RES_BOARDS)).toBe(true)
		js.endJumpstartTurn(p)
	}
	expect(store.gameflow.phase).toBe(rf.PHASE_JUMPSTART_BIDDING)
	expect(store.gameflow.turnOrder).toEqual([store.gameflow.jumpstart.firstBidder])

	store.gameflow.jumpstart.firstBidder = 0
	store.gameflow.turnOrder = [0]
	expect(js.placeBid(0, 0, 0)).toBe(true) // a: pile 1 for free
	js.endJumpstartTurn(0)
	expect(store.gameflow.turnOrder).toEqual([1])
	expect(js.placeBid(1, 0, 4)).toBe(false) // must raise by 5
	expect(js.placeBid(1, 0, 5)).toBe(true) // b outbids a
	js.endJumpstartTurn(1)
	expect(store.gameflow.turnOrder).toEqual([2]) // c has no pile
	js.placeBid(2, 2, 0)
	js.endJumpstartTurn(2)
	expect(store.gameflow.turnOrder).toEqual([0]) // a was outbid, bids again (b and c pass)
	js.placeBid(0, 1, 10)
	js.endJumpstartTurn(0)

	expect(store.gameflow.phase).toBe(rf.PHASE_CHOOSE_HOME_TILE)
	expect(store.gameflow.turnOrder).toEqual([1, 0, 2])
	expect(js.bidForPlayer(0)).toBe(10)
	expect(js.bidForPlayer(1)).toBe(5)
	expect(js.pileForPlayer(1)).toHaveLength(5)
	expect(store.wonderBricks).toHaveLength(0) // exactly 5 goods per player
})

test("preset piles skip pile building; more than 5 goods per player fills 4 wonder rows; kicked players are skipped", () => {
	newGame(["a", "b", "c"], [[6, 6, 6, 6, 6, 6], [2, 2, 0, 0, 0, 0], [7, 7, 7, 5, 5, 5]])
	expect(store.gameflow.phase).toBe(rf.PHASE_JUMPSTART_BIDDING)
	store.players[2].displayName = rf.BOT_NAME
	store.gameflow.turnOrder = [0]
	js.placeBid(0, 2, 0)
	js.endJumpstartTurn(0)
	js.placeBid(1, 0, 0)
	js.endJumpstartTurn(1)
	expect(store.gameflow.phase).toBe(rf.PHASE_CHOOSE_HOME_TILE)
	expect(store.gameflow.turnOrder).toEqual([1, 0])
	expect(store.wonderBricks).toHaveLength(17)
})

test("pile building starts with the creator and goes clockwise", () => {
	globalThis.window = { initData: { creatorName: "c" } }
	newGame(["a", "b", "c", "d"])
	expect(store.gameflow.turnOrder.slice(0, 8)).toEqual([2, 3, 0, 1, 2, 3, 0, 1])
	expect(store.gameflow.turnOrder).toHaveLength(20)
	globalThis.window = { initData: {} }
})
