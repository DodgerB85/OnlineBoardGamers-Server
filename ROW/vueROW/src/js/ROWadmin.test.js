import { describe, expect, it } from "vitest"
import { Game, JavaRandom, defaultOptions } from "./ROWindex"
import { adminChangesFor, applyAdminChanges } from "./ROWadmin"

const players = [
	{ name: "Alice", color: "RED", type: "HUMAN" },
	{ name: "Bob", color: "BLUE", type: "HUMAN" },
]

function newGame() {
	return Game.start(players, defaultOptions(), new JavaRandom(9))
}

describe("ROW admin edits", () => {
	it("clamps changes and skips no-ops", () => {
		const game = newGame()
		const ps = game.playerState(game.currentPlayer)
		ps.balance = 2
		ps.workers.COWBOY = 6
		ps.branchlets = 15

		const changes = adminChangesFor(ps, { balance: -5, cowboys: 7, branchlets: 99 })
		expect(changes).toEqual([{ field: "balance", from: 2, to: 0 }])
	})

	it("applies absolute targets and ignores unknown fields", () => {
		const game = newGame()
		const player = game.currentPlayer
		const ps = game.playerState(player)

		applyAdminChanges(game, player, [
			{ field: "exchangeTokens", from: ps.exchangeTokens, to: 4 },
			{ field: "jobMarketToken", from: 0, to: 1 },
			{ field: "notAField", from: 0, to: 99 },
		])
		expect(ps.exchangeTokens).toBe(4)
		expect(ps.jobMarketToken).toBe(true)
	})
})
