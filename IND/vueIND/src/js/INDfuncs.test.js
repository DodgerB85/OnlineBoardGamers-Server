import { describe, it, expect, vi, beforeEach } from "vitest"

// INDfuncs pulls in the whole model/view chain, which is not importable under node
const mocks = vi.hoisted(() => ({ store: null }))
vi.mock("../stores/INDstore.js", () => ({ useModelStore: () => mocks.store }))
vi.mock("../stores/INDpersonal.js", () => ({ usePersonalStore: () => ({}) }))
vi.mock("./INDmodel.js", () => ({}))
vi.mock("./INDview.js", () => ({}))

import { simpleExportWholeINDmodelNoCompression, simpleImportWholeINDmodelNoCompression } from "./INDfuncs.js"

function makeStore() {
	return {
		players: [{ moneyCash: 100, moneyBank: 0 }],
		cities: [],
		gameflow: { turn: 3 },
		history: [["entry"]],
		activeCompanies: [],
		availableCompanies: [],
		ongoingVars: {},
		context: {},
		clearVars() {},
	}
}

describe("simpleExport/ImportWholeINDmodelNoCompression", () => {
	beforeEach(() => {
		mocks.store = makeStore()
	})

	it("does not clone history into every replay snapshot", () => {
		const snapshot = simpleExportWholeINDmodelNoCompression()

		expect(snapshot[3]).toBeNull()
		expect(snapshot[0]).toEqual([{ moneyCash: 100, moneyBank: 0 }])
	})

	it("leaves history untouched when a snapshot has no history", async () => {
		const snapshot = simpleExportWholeINDmodelNoCompression()
		const history = mocks.store.history

		await simpleImportWholeINDmodelNoCompression(snapshot, false)

		expect(mocks.store.history).toBe(history)
	})

	it("still replaces history from older snapshots that carry it", async () => {
		const snapshot = simpleExportWholeINDmodelNoCompression()
		snapshot[3] = [["legacy"]]

		await simpleImportWholeINDmodelNoCompression(snapshot, false)

		expect(mocks.store.history).toEqual([["legacy"]])
	})
})
