import * as rf from "./INDreference"

/**
 * Builds the per-turn series used by the game summary graphs.
 *
 * Replay snapshots are [players, cities, gameflow, null, ...] (see INDfuncs), so only
 * the players (0) and gameflow (2) slots are read. Money is taken from the replay
 * because hidden-money games omit it from the HIST_NEW_TURN history params.
 */
export function buildGameSummarySeries(replayData, computedHistory) {
	const turns = []
	const playersByTurn = new Map()
	for (const snapshot of replayData) {
		const turn = snapshot[2].turn
		if (!playersByTurn.has(turn)) turns.push(turn)
		playersByTurn.set(turn, snapshot[0]) // last snapshot of the turn = end of turn
	}
	turns.sort((a, b) => a - b)

	const playerCount = replayData.length > 0 ? replayData[0][0].length : 0
	const cash = zeroSeries(playerCount, turns.length)
	const bank = zeroSeries(playerCount, turns.length)
	const total = zeroSeries(playerCount, turns.length)
	const income = zeroSeries(playerCount, turns.length)

	turns.forEach((turn, turnIndex) => {
		const players = playersByTurn.get(turn)
		for (let p = 0; p < playerCount; p++) {
			cash[p][turnIndex] = players[p].moneyCash
			bank[p][turnIndex] = players[p].moneyBank
			total[p][turnIndex] = players[p].moneyCash + players[p].moneyBank
		}
	})

	// Operation income summaries are inserted into computedHistory before each city growth,
	// so the last one in a turn is that turn's total. Old histories lack the turn number.
	let currentTurn = 1
	let turnIndex = turns.indexOf(currentTurn)
	for (const entry of computedHistory) {
		if (entry[0] === rf.HIST_NEW_TURN) {
			currentTurn = typeof entry[3][0] === "number" ? entry[3][0] : currentTurn + 1
			turnIndex = turns.indexOf(currentTurn)
		} else if (entry[0] === rf.HIST_OPERATION_INCOME_SUMMARY && turnIndex >= 0) {
			for (let p = 0; p < playerCount; p++) income[p][turnIndex] = entry[3][p] ?? 0
		}
	}

	return { turns, cash, bank, total, income }
}

function zeroSeries(playerCount, turnCount) {
	return Array.from({ length: playerCount }, () => new Array(turnCount).fill(0))
}
