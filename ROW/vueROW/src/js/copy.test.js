import { describe, expect, it } from "vitest"
import { sanitizeCopyFrame } from "./ROWreplay"

const cattle = (type, points, value) => ({ type, points, value })
const objective = (id) => ({ id, tasks: [], points: 3, penalty: 0 })

const frame = () => ({
	v: 1,
	players: [{ name: "A", color: "red" }, { name: "B", color: "blue" }],
	playerStates: {
		A: {
			player: "A",
			hand: [cattle("HOLSTEIN", 1, 3), objective("GAIN2_4HH")],
			drawStack: [cattle("BROWN_SWISS", 2, 3)],
			discardPile: [cattle("AYRSHIRE", 3, 3)],
			objectives: ["START_34B"],
		},
		B: {
			player: "B",
			hand: [cattle("WEST_HIGHLAND", 4, 4), objective("GAIN2_BGBL")],
			drawStack: [cattle("TEXAS_LONGHORN", 5, 5)],
			discardPile: [],
			objectives: ["START_SSG"],
		},
	},
	cattleMarket: {
		market: [cattle("HOLSTEIN", 1, 3)],
		drawStack: [cattle("SIMMENTAL", 3, 2), cattle("TEXAS_LONGHORN", 7, 5)],
		simmental: true,
	},
	objectiveCards: {
		available: [objective("GAIN2_SSH")],
		drawStack: [objective("AUX_SF")],
	},
	startingObjectiveCards: ["START_BBH"],
	kcSupply: { piles: [[], [{ teepee: "BLUE" }], []] },
	foresights: { spaces: [[null, null]] },
	rngState: "123456",
})

function cattleCards(state) {
	return [
		...state.playerStates.A.hand,
		...state.playerStates.A.drawStack,
		...state.playerStates.B.hand,
		...state.playerStates.B.drawStack,
		...state.cattleMarket.market,
		...state.cattleMarket.drawStack,
	].filter((card) => card && typeof card === "object" && card.value !== undefined)
}

function objectiveIds(state) {
	const ids = [
		...state.playerStates.A.objectives,
		...state.playerStates.B.objectives,
		...state.startingObjectiveCards,
	]
	for (const card of [
		...state.playerStates.A.hand,
		...state.playerStates.A.drawStack,
		...state.playerStates.B.hand,
		...state.playerStates.B.drawStack,
		...state.objectiveCards.available,
		...state.objectiveCards.drawStack,
	]) {
		if (card && typeof card === "object" && card.tasks !== undefined) ids.push(card.id)
	}
	return ids.sort()
}

describe("ROW copy sanitizer", () => {
	it("keeps the copier's private cards and the public market", () => {
		const original = frame()
		const copy = sanitizeCopyFrame(original, "A")

		expect(copy.playerStates.A.hand).toEqual(original.playerStates.A.hand)
		expect(copy.playerStates.A.objectives).toEqual(original.playerStates.A.objectives)
		expect(copy.cattleMarket.market).toEqual(original.cattleMarket.market)
		expect(copy.objectiveCards.available).toEqual(original.objectiveCards.available)
		expect(copy.playerStates.A.discardPile).toEqual(original.playerStates.A.discardPile)
	})

	it("preserves the total hidden card multisets", () => {
		const original = frame()
		const copy = sanitizeCopyFrame(original, "A")

		expect(cattleCards(copy).length).toBe(cattleCards(original).length)
		expect(cattleCards(copy).map((card) => `${card.type}:${card.points}`).sort()).toEqual(
			cattleCards(original).map((card) => `${card.type}:${card.points}`).sort()
		)
		expect(objectiveIds(copy)).toEqual(objectiveIds(original))
	})

	it("shuffles the hidden decks and refreshes the RNG state", () => {
		const original = frame()
		const copy = sanitizeCopyFrame(original, "A", {
			int: () => 0,
			getState: () => "sanitized-state",
		})

		expect(copy.playerStates.B.drawStack).toHaveLength(1)
		expect(copy.playerStates.B.objectives).toHaveLength(1)
		expect(copy.objectiveCards.drawStack).toHaveLength(1)
		expect(copy.startingObjectiveCards).toHaveLength(1)
		expect(copy.rngState).toBe("sanitized-state")
	})
})
