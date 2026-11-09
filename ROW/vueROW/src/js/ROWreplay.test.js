import { describe, expect, it } from "vitest"
import { ActionType, Game, JavaRandom, defaultOptions, serializeGame } from "./ROWindex"
import { finalPositionsFor } from "./ROWfuncs"
import { buildReplayFrames } from "./ROWreplay"

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

	it("maps ranking names to server seat indexes, not the live rotation", () => {
		expect(finalPositionsFor([["Bob", "Alice"]], ["Alice", "Bob"])).toEqual([[1, 0]])
		expect(finalPositionsFor([["Nobody"]], ["Alice", "Bob"])).toEqual([])
	})
})
