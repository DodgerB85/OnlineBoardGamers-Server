import { describe, expect, it } from "vitest"
import { Game, JavaRandom, Unlockable, defaultOptions } from "./ROWindex"
import { ADMIN_FIELDS, DISC_FIELDS, adminChangesFor, applyAdminChanges } from "./ROWadmin"

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

	it("clears a player-board disc through an absolute admin edit", () => {
		const game = newGame()
		const player = game.currentPlayer
		const ps = game.playerState(player)
		const field = DISC_FIELDS.find((f) => f.u === Unlockable.AUX_PAY_TO_MOVE_ENGINE_FORWARD)
		expect(field).toBeTruthy()
		expect(ADMIN_FIELDS).toContain(field)

		const from = field.get(ps)
		expect(from).toBe(0)
		const changes = adminChangesFor(ps, { [field.key]: from + 1 })
		expect(changes).toEqual([{ field: field.key, from, to: 1 }])

		applyAdminChanges(game, player, changes)
		expect(ps.unlocked[Unlockable.AUX_PAY_TO_MOVE_ENGINE_FORWARD]).toBe(1)

		applyAdminChanges(game, player, [{ field: field.key, from: 0, to: 99 }])
		expect(ps.unlocked[Unlockable.AUX_PAY_TO_MOVE_ENGINE_FORWARD]).toBe(field.count)
	})
})
