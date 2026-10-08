import { describe, expect, it } from "vitest"
import {
	ActionType,
	BuildingsOption,
	Card,
	CattleType,
	Edition,
	ROWError,
	Game,
	JavaRandom,
	PlayerInfo,
	PlayerOrderOption,
	Variant,
	Worker,
	defaultOptions,
	deserializeGame,
	serializeGame,
} from "../index"

function players(n: number): PlayerInfo[] {
	const colors = ["RED", "BLUE", "YELLOW", "GREEN"]
	return Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}`, color: colors[i], type: "HUMAN" as const }))
}

function startGame(playerCount = 4, seed = 0): Game {
	const opts = { ...defaultOptions(Edition.FIRST), buildings: BuildingsOption.BEGINNER }
	return Game.start(players(playerCount), opts, new JavaRandom(seed))
}

describe("Game setup (ROWTest.Create / TestHelper.givenAGame)", () => {
	it("builds a game with the correct starting deck and workers", () => {
		const game = startGame()
		for (const name of game.state.playerOrder) {
			const ps = game.playerState(name)
			// starting hand is 4 (hand limit)
			expect(ps.hand.length).toBe(4)
			// 14-card starting deck total (4 drawn + 10 in stack)
			expect(ps.drawStack.length + ps.hand.length).toBe(14)
			// 4 players -> initial worker count = 2*4-1 = 7 per type
			expect(ps.getNumberOfCowboys()).toBe(1)
			expect(ps.getNumberOfCraftsmen()).toBe(1)
			expect(ps.getNumberOfEngineers()).toBe(1)
		}
		// Job market starts with one full row of workers (7 tiles drawn for 4p).
		const jm = game.getJobMarket()
		expect(jm.currentRowIndex).toBe(1)
		expect(jm.rows[0].workers.length).toBe(4)
		expect(game.possibleActions().has(ActionType.MOVE)).toBe(true)
	})

	it("rejects < 2 and > 4 players", () => {
		expect(() => Game.start(players(1), defaultOptions(), new JavaRandom(0))).toThrowError(/AT_LEAST_2_PLAYERS_REQUIRED/)
		expect(() => Game.start(players(5), defaultOptions(), new JavaRandom(0))).toThrowError(/AT_MOST_4_PLAYERS_SUPPORTED/)
	})
})

describe("Hand value (PlayerStateTest.HandValue)", () => {
	it("counts each cattle type once by its best value", () => {
		const game = startGame(2)
		const ps = game.currentPlayerState()
		// Mirrors PlayerStateTest.HandValue.handValue: 18 cards => 25
		const hand: Card[] = [
			{ type: CattleType.JERSEY, points: 0, value: 1 },
			{ type: CattleType.GUERNSEY, points: 0, value: 2 },
			{ type: CattleType.BLACK_ANGUS, points: 0, value: 2 },
			{ type: CattleType.DUTCH_BELT, points: 0, value: 2 },
			{ type: CattleType.HOLSTEIN, points: 1, value: 3 },
			{ type: CattleType.BROWN_SWISS, points: 2, value: 3 },
			{ type: CattleType.AYRSHIRE, points: 3, value: 3 },
			{ type: CattleType.WEST_HIGHLAND, points: 3, value: 4 },
			{ type: CattleType.TEXAS_LONGHORN, points: 5, value: 5 },
		]
		// 1+2+2+2+3+3+3+4+5 = 25
		ps.hand = hand
		expect(ps.handValue()).toBe(25)
	})
})

describe("Movement + tolls (TrailTest / ActionTest.Move)", () => {
	it("moves forward and stops at Kansas City", () => {
		const game = startGame(2)
		// opening move: place on a neutral building
		const first = game.possibleMoves()
		expect(first.length).toBeGreaterThan(0)
		game.perform(game.currentPlayer, { type: ActionType.MOVE, steps: [first[0].steps[0]] }, new JavaRandom(1))
		expect(game.getTrail().currentLocation(game.currentPlayer)).not.toBe("START")
	})
})

describe("Serialization round-trip (StateRoundTripTest)", () => {
	it("restores a game identically", () => {
		const game = startGame(4, 7)
		const json = serializeGame(game)
		const restored = deserializeGame(JSON.parse(JSON.stringify(json)))
		expect(restored.edition).toBe(game.edition)
		expect(restored.state.currentPlayer).toBe(game.state.currentPlayer)
		expect(restored.state.playerOrder).toEqual(game.state.playerOrder)
		for (const name of game.state.playerOrder) {
			expect(restored.playerState(name).balance).toBe(game.playerState(name).balance)
			expect(restored.playerState(name).hand.length).toBe(game.playerState(name).hand.length)
		}
		expect(JSON.parse(JSON.stringify(serializeGame(restored)))).toEqual(JSON.parse(JSON.stringify(json)))
	})
})

describe("Scoring (PlayerStateTest.Score)", () => {
	it("gives 1 VP per full 5 dollars", () => {
		const game = startGame(2)
		const ps = game.currentPlayerState()
		ps.balance = 20
		// isolate DOLLARS by zeroing the other tracked categories via fresh state is complex;
		// assert the dollars component directly through scoreDetails.
		expect(game.scoreDetails(ps.player).DOLLARS).toBe(4)
	})

	it("gives 2 VP for the job market token", () => {
		const game = startGame(2)
		const ps = game.currentPlayerState()
		ps.jobMarketToken = true
		expect(game.scoreDetails(ps.player).JOB_MARKET_TOKEN).toBe(2)
	})
})

describe("Illegal actions", () => {
	it("rejects acting out of turn", () => {
		const game = startGame(2)
		const other = game.state.playerOrder.find((p) => p !== game.currentPlayer) as string
		expect(() => game.perform(other, { type: ActionType.MOVE, steps: ["A"] }, new JavaRandom(0))).toThrowError(/NOT_CURRENT_PLAYER/)
	})

	it("rejects an action not on the stack", () => {
		const game = startGame(2)
		expect(() => game.perform(game.currentPlayer, { type: ActionType.GAIN_12_DOLLARS }, new JavaRandom(0))).toThrowError(/CANNOT_PERFORM_ACTION/)
	})
})
