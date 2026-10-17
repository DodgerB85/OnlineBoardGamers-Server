/**
 * Automa smoke tests. Rule fidelity is proven by the four `gwt-automa-*` Java replay
 * fixtures in `__fixtures__/replays/fuzz/`; these cover the fresh-game setup and the
 * turn driver, which the hydrated fixtures cannot.
 */
import { describe, expect, it } from "vitest"
import { Game } from "../ROWengine"
import { JavaRandom, defaultOptions } from "../ROWcore"
import { deserializeGame, serializeGame } from "../ROWfuncs"
import { AI_NAME, createGarth, playAutomaTurns } from "./index"

function startGame(seed, types = ["HUMAN", "COMPUTER"]) {
	const rng = new JavaRandom(seed)
	const players = types.map((type, i) => ({ name: i === 0 ? "Human" : AI_NAME, color: i === 0 ? "RED" : "BLUE", type }))
	return Game.start(players, { ...defaultOptions("FIRST", { buildings: "BEGINNER", difficulty: "EASY" }) }, rng)
}

describe("Automa setup", () => {
	it("gives the computer seat unlimited money and b-side buildings", () => {
		const g = startGame(7)
		const ps = g.playerState(AI_NAME)
		expect(ps.automaState).toBeTruthy()
		expect(ps.buildings.every((b) => b.endsWith("b"))).toBe(true)
		// 999 (computer) + the 7 dollars for seat index 1.
		expect(ps.balance).toBe(1006)
	})

	it("round-trips the automa state through serialization", () => {
		const g = startGame(7)
		const clone = deserializeGame(JSON.parse(JSON.stringify(serializeGame(g, new JavaRandom(7)))))
		expect(clone.playerState(AI_NAME).automaState.serialize()).toEqual(g.playerState(AI_NAME).automaState.serialize())
	})

	it("creates a deterministic Garth for a given seed", () => {
		const a = createGarth({ player: AI_NAME }, new JavaRandom(3), "HARD")
		const b = createGarth({ player: AI_NAME }, new JavaRandom(3), "HARD")
		expect(a.serialize()).toEqual(b.serialize())
		expect(a.serialize().difficulty).toBe("HARD")
	})
})

describe("Automa driver", () => {
	it("plays a whole automa-vs-automa game to completion", () => {
		// Both seats are computers so the driver can run the game without a human.
		const rng = new JavaRandom(11)
		const players = [
			{ name: AI_NAME, color: "RED", type: "COMPUTER" },
			{ name: "RowAI2", color: "BLUE", type: "COMPUTER" },
		]
		const g = Game.start(players, { ...defaultOptions("FIRST", { buildings: "BEGINNER", difficulty: "EASY" }) }, rng)
		let steps = 0
		while (!g.isEnded() && steps < 5000) {
			g.executeAutoma(g.currentPlayer, rng)
			steps++
		}
		expect(g.isEnded()).toBe(true)
		for (const p of g.state.players)
			expect(Number.isFinite(g.getScore(p.name))).toBe(true)
	})

	it("hands the turn back after Garth plays", () => {
		const rng = new JavaRandom(11)
		const players = [
			{ name: AI_NAME, color: "RED", type: "COMPUTER" },
			{ name: "RowAI2", color: "BLUE", type: "COMPUTER" },
		]
		const g = Game.start(players, { ...defaultOptions("FIRST", { buildings: "BEGINNER", difficulty: "MEDIUM" }) }, rng)
		const steps = playAutomaTurns(g, rng)
		expect(steps).toBeGreaterThan(0)
		expect(g.isEnded() || g.currentPlayer !== AI_NAME).toBe(true)
	})
})
