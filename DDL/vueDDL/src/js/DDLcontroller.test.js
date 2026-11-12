import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import * as rf from "./DDLreference.js"
import * as rules from "./DDLrules.js"
import * as model from "./DDLmodel.js"
import * as view from "./DDLview.js"
import * as controller from "./DDLcontroller.js"
import * as IO from "../backend/DDL_IO.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"

vi.mock("../backend/DDL_IO.js", () => ({
	saveGame: vi.fn().mockResolvedValue(undefined),
	checkForLatestData: vi.fn().mockResolvedValue(undefined),
	getBids: vi.fn(),
	saveBid: vi.fn().mockResolvedValue({ ok: true }),
}))

beforeEach(() => {
	setActivePinia(createPinia())
	vi.clearAllMocks()
	model.applyState(rules.createInitialState({ playerNames: ["A", "B", "C"], seed: 42 }))
	const store = useModelStore()
	store.gameflow.phase = rf.PHASE_MAIN
	store.players.forEach((player, i) => { player.ship.node = "P" + (8 + i) })
	const personal = usePersonalStore()
	personal.pov = 0
	personal.trainingGame = true
})

describe("turn controls", () => {
	it("saves stopped movement and does not reopen it after save or reload", async () => {
		const store = useModelStore()
		store.gameflow.turnType = rf.TURN_ACTION
		store.gameflow.movement.remaining = 4
		store.context.action = rf.ACT_MOVE
		await controller.stopMovement()
		expect(store.gameflow.movement.remaining).toBe(0)
		expect(IO.saveGame).toHaveBeenCalledWith(true)
		controller.startPlayerTurn()
		expect(store.context.action).toBe(rf.ACT_NONE)
	})

	it("does not stop live movement while replaying", async () => {
		const store = useModelStore()
		store.gameflow.movement.remaining = 4
		store.viewSettings.showReplay = true
		await controller.stopMovement()
		expect(store.gameflow.movement.remaining).toBe(4)
		expect(IO.saveGame).not.toHaveBeenCalled()
	})

	it("retains the paid highway mode across saves", () => {
		const store = useModelStore()
		store.gameflow.turnType = rf.TURN_ACTION
		store.context.action = rf.ACT_PLACE_HIGHWAYS
		store.context.highwayCostsEnergy = true
		controller.startPlayerTurn()
		expect(store.context.highwayCostsEnergy).toBe(true)
	})

	it("attributes practice energy collection to the player who collected it", async () => {
		await controller.collectEnergy(rf.RED_ENERGY)
		const store = useModelStore()
		expect(store.gameflow.turnOrder[0]).toBe(1)
		expect(store.history.at(-1)[1]).toBe(0)
	})

	it("attributes practice end turn to the player who ended it", async () => {
		const store = useModelStore()
		store.gameflow.turnType = rf.TURN_ACTION
		await controller.endActionTurn()
		expect(store.gameflow.turnOrder[0]).toBe(1)
		expect(store.history.at(-1)[1]).toBe(0)
	})
	it("shows exploration ahead of unused highways in the status banner", () => {
		const store = useModelStore()
		store.gameflow.turnType = rf.TURN_ACTION
		store.gameflow.freeHighwaysLeft = 1
		store.gameflow.pendingExplore = { player: 0, planetId: 0 }
		expect(view.actionTitle(store)).toBe("Explore the planet")
	})

})


describe("auction handoff", () => {
	function auction() {
		const store = useModelStore()
		store.gameflow.phase = rf.PHASE_SETUP
		store.gameflow.setup.auction = true
		store.gameflow.setup.auctionResolved = false
		store.gameflow.setup.stage = rf.TURN_SETUP_AUCTION
		usePersonalStore().trainingGame = false
		return store
	}

	it("commits the result from one seat while other seats fetch the saved result", async () => {
		const store = auction()
		IO.getBids.mockResolvedValue({ ready: true, bids: { A: 1, B: 3, C: 2 } })
		usePersonalStore().pov = 1
		await controller.pollAuction()
		expect(IO.checkForLatestData).toHaveBeenCalled()
		expect(IO.saveGame).not.toHaveBeenCalled()
		expect(store.gameflow.setup.auctionResolved).toBe(false)
		usePersonalStore().pov = 0
		await controller.pollAuction()
		expect(IO.saveGame).toHaveBeenCalledTimes(1)
		expect(store.gameflow.turnOrder[0]).toBe(1)
	})

	it("allows tied players to bid again and an untied committing seat to resolve", async () => {
		const store = auction()
		IO.getBids.mockResolvedValueOnce({ ready: true, bids: { A: 3, B: 1, C: 1 } })
		await controller.pollAuction()
		expect(store.gameflow.setup.stage).toBe(rf.TURN_SETUP_TIEBREAK)
		const personal = usePersonalStore()
		personal.pov = 1
		expect(personal.canBid()).toBe(true)
		await controller.submitAuctionBid(2)
		expect(IO.saveBid).toHaveBeenCalledWith(2, 2, ["B", "C"])
		personal.pov = 0
		expect(personal.canBid()).toBe(false)
		IO.getBids.mockResolvedValueOnce({ ready: true, bids: { B: 0, C: 2 } })
		await controller.pollAuction()
		expect(store.gameflow.setup.auctionResolved).toBe(true)
		expect(store.gameflow.turnOrder).toEqual([0, 2, 1])
		expect(IO.saveGame).toHaveBeenCalledTimes(1)
	})
})
