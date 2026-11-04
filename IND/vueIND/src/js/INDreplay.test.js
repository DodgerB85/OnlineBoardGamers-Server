/**
 * Unit tests for the IND replay phase derivation (phaseForHistoryEntry).
 *
 * Replay snapshots take their phase from these rules, so a wrong answer shows
 * the wrong phase strip / action area while stepping through a replay.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// INDreplay pulls in the whole model chain (stores, DOM, websocket) which is
// not importable under node. Stub everything except the pure reference tables.
const mocks = vi.hoisted(() => ({ store: null }))
vi.mock("../stores/INDstore.js", () => ({ useModelStore: () => mocks.store }))
vi.mock("../stores/INDpersonal.js", () => ({ usePersonalStore: () => ({}) }))
vi.mock("./INDfuncs.js", () => ({}))
vi.mock("./INDmap.js", () => ({}))
vi.mock("./INDmodel.js", () => ({}))
vi.mock("./INDhistory.js", () => ({}))
vi.mock("./INDcontroller.js", () => ({}))

import * as rf from "./INDreference.js"
import { phaseForHistoryEntry } from "./INDreplay.js"

// computedHistory entries are [action, playerIndex, timestamp, params]
function setHistory(entries, gameflow = { turn: 1, phase: rf.PHASE_NEW_ERA }) {
	mocks.store = {
		computedHistory: entries.map((entry, i) => [entry[0], entry[1] ?? -1, 0, entry[3] ?? [], i]),
		gameflow,
	}
}

describe("phaseForHistoryEntry", () => {
	beforeEach(() => setHistory([[rf.HIST_NEW_GAME]]))

	it("keeps the current phase for entries that do not change it", () => {
		setHistory([[rf.HIST_NEW_GAME]], { turn: 1, phase: rf.PHASE_NEW_ERA })
		expect(phaseForHistoryEntry(0)).toBe(rf.PHASE_NEW_ERA)
	})

	it("starts turn-order bidding after a new turn, unless an era change follows", () => {
		setHistory([
			[rf.HIST_NEW_TURN],
			[rf.HIST_TURN_ORDER_BID],
		])
		expect(phaseForHistoryEntry(0)).toBe(rf.PHASE_BID_TURN_ORDER)

		setHistory([
			[rf.HIST_NEW_TURN],
			[rf.HIST_NEW_ERA],
		])
		expect(phaseForHistoryEntry(0)).toBe(rf.PHASE_NEW_ERA)
		expect(phaseForHistoryEntry(1)).toBe(rf.PHASE_NEW_ERA)
	})

	it("goes to acquisitions on the first turn order, mergers afterwards", () => {
		setHistory([[rf.HIST_SET_NEW_TURN_ORDER]], { turn: 1, phase: rf.PHASE_BID_TURN_ORDER })
		expect(phaseForHistoryEntry(0)).toBe(rf.PHASE_ACQUISITIONS)

		setHistory([[rf.HIST_SET_NEW_TURN_ORDER]], { turn: 2, phase: rf.PHASE_BID_TURN_ORDER })
		expect(phaseForHistoryEntry(0)).toBe(rf.PHASE_MERGERS)
	})

	it("groups all merger activity, including bidding, under mergers", () => {
		setHistory([[rf.HIST_MERGER_BIDDING, -1, [[100], [0, [1]], [0, [2]], [0, 50]]]])
		expect(phaseForHistoryEntry(0)).toBe(rf.PHASE_MERGERS)
		setHistory([[rf.HIST_MERGER_BIDDING, -1, [[100], [0, [1]], [0, [2]], [0, 50], [-2, 0, 0]]]])
		expect(phaseForHistoryEntry(0)).toBe(rf.PHASE_MERGERS)
		setHistory([[rf.HIST_PASS_MERGER]])
		expect(phaseForHistoryEntry(0)).toBe(rf.PHASE_MERGERS)
	})

	it("derives the phase of the remaining player-facing phases", () => {
		const cases = [
			[rf.HIST_ACQUIRE_COMPANY, rf.PHASE_ACQUISITIONS],
			[rf.HIST_RND, rf.PHASE_R_AND_D],
			[rf.HIST_OPERATE_LAND, rf.PHASE_OPERATIONS],
			[rf.HIST_AUTO_SKIP_SHIP_OPERATE, rf.PHASE_OPERATIONS],
			[rf.HIST_MANUAL_CITY_GROWTH, rf.PHASE_CITY_GROWTH],
			[rf.HIST_ADD_CITY, rf.PHASE_NEW_ERA],
			[rf.HIST_GAME_END, rf.PHASE_GAME_OVER],
			[rf.HIST_MERGER_REMOVE_SIAP_FAJI_TERRS, rf.PHASE_MERGER_REMOVE_SIAP_FAJI_TERRS],
			[rf.HIST_MERGER_SHIP_REDEPLOYMENT, rf.PHASE_MERGER_SHIP_REDEPLOYMENT],
		]
		for (const [action, expected] of cases) {
			setHistory([[action]])
			expect(phaseForHistoryEntry(0), `action ${action}`).toBe(expected)
		}
	})
})
