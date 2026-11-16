/**
 * Unit tests for the IND phase flow (endCurrentPhase).
 *
 * Company deeds that cannot start must be discarded before the merger phase,
 * otherwise a Siap Saji merger can free an area and wrongly bring the deed back.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// INDcontroller pulls in the whole model chain (stores, DOM, websocket) which is
// not importable under node. Stub everything except the pure reference tables.
const mocks = vi.hoisted(() => ({
	store: null,
	markNoStartTerritories: vi.fn(),
	removeMarkedCompanies: vi.fn(),
}))

vi.mock("../stores/INDstore.js", () => ({ useModelStore: () => mocks.store }))
vi.mock("../stores/INDpersonal.js", () => ({ usePersonalStore: () => ({}) }))
vi.mock("./INDmodel.js", () => ({
	markActiveCompaniesWithNoStartTerritoriesForRemoval: mocks.markNoStartTerritories,
	removeMarkedCompanies: mocks.removeMarkedCompanies,
}))
vi.mock("./INDmap.js", () => ({}))
vi.mock("./INDfuncs.js", () => ({}))
vi.mock("./INDbot.js", () => ({ removeBotPlayers: vi.fn() }))
vi.mock("./INDview.js", () => ({}))
vi.mock("../backend/IND_IO.js", () => ({}))

import * as rf from "./INDreference.js"
import { endCurrentPhase } from "./INDcontroller.js"

function makeStore() {
	return {
		gameflow: { phase: rf.PHASE_NEW_ERA, turn: 2, fullTurnOrder: [0], turnOrder: [0] },
		players: [{ displayName: "player", moneyRoundIncome: 0 }],
		context: { historyObj: [] },
		history: [],
		cities: [],
		availableCompanies: [],
		removeAllActiveHighlights() {},
	}
}

describe("endCurrentPhase", () => {
	beforeEach(() => {
		mocks.store = makeStore()
		mocks.markNoStartTerritories.mockReset()
		mocks.removeMarkedCompanies.mockReset()
	})

	it("discards deeds with no starting area before the merger phase", () => {
		let phaseWhenDiscarded = -1
		mocks.removeMarkedCompanies.mockImplementation(() => {
			phaseWhenDiscarded = mocks.store.gameflow.phase
		})

		endCurrentPhase()

		expect(mocks.markNoStartTerritories).toHaveBeenCalled()
		expect(phaseWhenDiscarded).toBe(rf.PHASE_NEW_ERA)
		expect(mocks.store.gameflow.phase).toBe(rf.PHASE_BID_TURN_ORDER)
	})
})
