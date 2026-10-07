import { describe, expect, it } from "vitest"
import { ActionType, Game, JavaRandom, PlayerInfo, defaultOptions, serializeGame, deserializeGame } from "../index"

function players(n: number): PlayerInfo[] {
	const colors = ["RED", "BLUE", "YELLOW", "GREEN"]
	return Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}`, color: colors[i], type: "HUMAN" as const }))
}

describe("Full turn loop", () => {
	it("lets each player move to a location and end their turn, across turns", () => {
		const game = Game.start(players(2), defaultOptions(), new JavaRandom(5))
		let safety = 0
		while (!game.isEnded() && safety++ < 20) {
			const player = game.currentPlayer
			const moves = game.possibleMoves(player)
			expect(moves.length, `player ${player} has a move`).toBeGreaterThan(0)
			game.perform(player, { type: ActionType.MOVE, steps: moves[0].steps }, new JavaRandom(safety))
			// A location is now active and offers at least one action.
			expect(game.possibleActions().size).toBeGreaterThan(0)
			game.endTurn(player, new JavaRandom(1000 + safety))
		}
		expect(safety).toBeGreaterThan(2)
	})

	it("keeps move validation honest and leaves the turn intact on rejection", () => {
		const game = Game.start(players(2), defaultOptions(), new JavaRandom(1))
		const player = game.currentPlayer
		expect(() => game.perform(player, { type: ActionType.MOVE, steps: [] }, new JavaRandom(0))).toThrowError(/MUST_MOVE_AT_LEAST_STEPS/)
		// The rejected move must not have consumed the turn's Move action.
		expect(game.possibleActions().has(ActionType.MOVE)).toBe(true)
	})

	it("keeps the action queue in sync with legality", () => {
		const game = Game.start(players(2), defaultOptions(), new JavaRandom(2))
		// GAIN_12_DOLLARS is only legal when offered by a location, not at the start of a turn.
		expect(() => game.perform(game.currentPlayer, { type: ActionType.GAIN_12_DOLLARS }, new JavaRandom(0))).toThrowError(/CANNOT_PERFORM_ACTION/)
	})

	it("survives serialization across turns", () => {
		let game = Game.start(players(3), defaultOptions(), new JavaRandom(7))
		for (let t = 0; t < 3 && !game.isEnded(); t++) {
			const player = game.currentPlayer
			const mv = game.possibleMoves(player)[0]
			game.perform(player, { type: ActionType.MOVE, steps: mv.steps }, new JavaRandom(t + 1))
			game.endTurn(player, new JavaRandom(t + 50))
			game = deserializeGame(JSON.parse(JSON.stringify(serializeGame(game))))
			expect(game.state.players.length).toBe(3)
		}
	})
})
