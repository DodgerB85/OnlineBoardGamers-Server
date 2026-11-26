import { describe, expect, it } from "vitest"
import { ActionStack, ActionType, Game, JavaRandom, PossibleAction, defaultOptions, serializeGame } from "./ROWindex"
import { finalPositionsFor } from "./ROWfuncs"
import { buildReplayFrames } from "./ROWreplay"
import { adminChangesFor, applyAdminChanges } from "./ROWadmin"

const players = [
	{ name: "Alice", color: "RED", type: "HUMAN" },
	{ name: "Bob", color: "BLUE", type: "HUMAN" },
]

describe("ROW replay rebuilding", () => {
	it("rebuilds a recorded end-turn from the opening position", () => {
		const rng = new JavaRandom(9)
		const game = Game.start(players, defaultOptions(), rng)
		const initial = JSON.parse(JSON.stringify(serializeGame(game, rng)))
		const player = game.currentPlayer
		const move = { type: ActionType.MOVE, steps: game.possibleMoves(player)[0].steps }
		game.perform(player, move, rng)

		const frames = buildReplayFrames(initial, [{ type: move.type, player, time: Date.now(), params: [], action: move }])
		expect(frames).toHaveLength(2)
		expect(frames[1]).toEqual(JSON.parse(JSON.stringify(serializeGame(game, rng))))
	})

	it("applies automatic follow-ups in the same frame as their action", () => {
		const rng = new JavaRandom(9)
		const game = Game.start(players, defaultOptions(), rng)
		const player = game.currentPlayer
		game.state.actionStack = ActionStack.initial([PossibleAction.anyActions([ActionType.GAIN_1_DOLLAR, ActionType.GAIN_2_DOLLARS])])
		const initial = JSON.parse(JSON.stringify(serializeGame(game, rng)))
		const action = { type: ActionType.GAIN_1_DOLLAR }
		const followup = { type: ActionType.GAIN_2_DOLLARS }
		game.perform(player, action, rng)
		game.perform(player, followup, rng)

		const frames = buildReplayFrames(initial, [{ type: action.type, player, time: Date.now(), params: [], action, followups: [followup] }])
		expect(frames).toHaveLength(2)
		expect(frames[1]).toEqual(JSON.parse(JSON.stringify(serializeGame(game, rng))))
	})

	it("rebuilds one batched admin edit from history", () => {
		const rng = new JavaRandom(9)
		const game = Game.start(players, defaultOptions(), rng)
		const initial = JSON.parse(JSON.stringify(serializeGame(game, rng)))
		const player = game.currentPlayer
		const ps = game.playerState(player)
		const before = { balance: ps.balance, cowboys: ps.workers.COWBOY }
		const changes = adminChangesFor(ps, {
			balance: before.balance + 5,
			cowboys: before.cowboys + 1,
			exchangeTokens: ps.exchangeTokens + 2,
			tempCertificates: ps.tempCertificates + 1,
			branchlets: ps.branchlets - 3,
		})
		applyAdminChanges(game, player, changes)

		const after = game.playerState(player)
		expect(changes).toHaveLength(5)
		expect(after.balance).toBe(before.balance + 5)
		expect(after.workers.COWBOY).toBe(before.cowboys + 1)
		expect(changes.find((c) => c.field === "balance")).toMatchObject({ from: initial.playerStates[player].balance, to: initial.playerStates[player].balance + 5 })
		expect(changes.find((c) => c.field === "cowboys")).toMatchObject({ from: initial.playerStates[player].workers.COWBOY, to: initial.playerStates[player].workers.COWBOY + 1 })

		const frames = buildReplayFrames(initial, [{ type: "ADMIN_EDIT", player, time: Date.now(), params: [], adminChanges: changes }])
		expect(frames).toHaveLength(2)
		expect(frames[1]).toEqual(JSON.parse(JSON.stringify(serializeGame(game, rng))))
	})

	it("maps ranking names to server seat indexes, not the live rotation", () => {
		expect(finalPositionsFor([["Bob", "Alice"]], ["Alice", "Bob"])).toEqual([[1, 0]])
		expect(finalPositionsFor([["Nobody"]], ["Alice", "Bob"])).toEqual([])
	})
})
