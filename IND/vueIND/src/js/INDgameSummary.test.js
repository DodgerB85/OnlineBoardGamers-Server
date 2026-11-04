import { describe, it, expect } from "vitest"

import { buildGameSummarySeries } from "./INDgameSummary.js"
import * as rf from "./INDreference.js"

// Replay snapshots are [players, cities, gameflow, null, ...]
function snapshot(turn, money) {
	return [
		money.map(([moneyCash, moneyBank]) => ({ moneyCash, moneyBank })),
		[],
		{ turn },
		null,
	]
}

describe("buildGameSummarySeries", () => {
	it("takes the last snapshot of each turn for cash, bank and total", () => {
		const replayData = [
			snapshot(1, [
				[100, 0],
				[100, 0],
			]),
			snapshot(1, [
				[80, 20],
				[100, 0],
			]),
			snapshot(2, [
				[80, 20],
				[90, 10],
			]),
			snapshot(2, [
				[130, 20],
				[90, 30],
			]),
		]

		const { turns, cash, bank, total } = buildGameSummarySeries(replayData, [])

		expect(turns).toEqual([1, 2])
		expect(cash).toEqual([
			[80, 130],
			[100, 90],
		])
		expect(bank).toEqual([
			[20, 20],
			[0, 30],
		])
		expect(total).toEqual([
			[100, 150],
			[100, 120],
		])
	})

	it("assigns each operation income summary to its turn, keeping the last one", () => {
		const replayData = [
			snapshot(1, [[100, 0]]),
			snapshot(1, [[100, 0]]),
			snapshot(2, [[100, 0]]),
			snapshot(2, [[100, 0]]),
		]
		const computedHistory = [
			[rf.HIST_NEW_GAME, -1, 0, []],
			[rf.HIST_OPERATION_INCOME_SUMMARY, -1, 0, [10]],
			[rf.HIST_CITY_GROWTH, -1, 0, []],
			[rf.HIST_OPERATION_INCOME_SUMMARY, -1, 0, [15]],
			[rf.HIST_CITY_GROWTH, -1, 0, []],
			[rf.HIST_NEW_TURN, -1, 0, [2]],
			[rf.HIST_OPERATION_INCOME_SUMMARY, -1, 0, [7]],
			[rf.HIST_CITY_GROWTH, -1, 0, []],
		]

		const { income } = buildGameSummarySeries(replayData, computedHistory)

		expect(income).toEqual([[15, 7]])
	})

	it("falls back to incrementing turns when old histories lack the turn number", () => {
		const replayData = [
			snapshot(1, [[100, 0]]),
			snapshot(1, [[100, 0]]),
			snapshot(2, [[100, 0]]),
			snapshot(2, [[100, 0]]),
		]
		const computedHistory = [
			[rf.HIST_OPERATION_INCOME_SUMMARY, -1, 0, [4]],
			[rf.HIST_NEW_TURN, -1, 0, []],
			[rf.HIST_OPERATION_INCOME_SUMMARY, -1, 0, [9]],
		]

		const { income } = buildGameSummarySeries(replayData, computedHistory)

		expect(income).toEqual([[4, 9]])
	})
})
