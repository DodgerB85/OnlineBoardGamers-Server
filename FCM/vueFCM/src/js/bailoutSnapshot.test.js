/* global pako */
import { beforeAll, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

let funcs, model, rules, controller, rf, useModelStore
const STARTING_MAP = [17, 0, 4, 0, 19, 3, 18, 0, 12, 2, 24, 2, 9, 0, 0, 2, 13, 2]

beforeAll(async () => {
	if (!globalThis.pako) {
		const dir = path.dirname(fileURLToPath(import.meta.url))
		;(0, eval)(fs.readFileSync(path.join(dir, "../../../../Lobby/static/Lobby/common/pakoLib.js"), "utf8"))
	}
	globalThis.alert = () => {}
	globalThis.window = { performance }
	funcs = await import("./FCMfuncs.js")
	model = await import("./FCMmodel.js")
	rules = await import("./FCMrules.js")
	controller = await import("./FCMcontroller.js")
	rf = await import("./FCMreference.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function seed({ uniqueCards = true, sbd = true, secondBailout = true, laborMarket = false, mediaLine = false, stadium = false } = {}) {
	setActivePinia(createPinia())
	const store = useModelStore()
	const opts = [sbd && 53, secondBailout && 49, laborMarket && 48, mediaLine && 50, stadium && 47].filter(Boolean)
	window.initData = { startingOptions: opts, startingMap: STARTING_MAP, playerNames: ["P0", "P1"] }
	store.externalStartingOptions.push(...opts)
	model.setInternalStartingOptions(opts)
	model.setupNewGame(window.initData)
	// Imports normalize module-off per-player Labor Market defaults as well.
	funcs.restoreLaborMarketState([])
	store.seniorBusinessDeveloper.uniqueCards = uniqueCards
	store.gameflow.turn = 5
	store.gameflow.phase = rf.PHASE_WORKING_DAY
	store.gameflow.subphase = rf.SUBPHASE_HIRING
	store.players[0].money = 123
	store.bankBroken = 1
	store.bank = -10
	if (secondBailout) {
		rules.handleBankBreak(false)
		rules.claimBailoutEmployee(0, rf.CAMPAIGN_MANAGER)
	}
	if (laborMarket) {
		Object.assign(store.laborMarket, {
			removedTemporaryWorkers: 2, removedTemporaryWorkersAtTurnStart: 1,
			unionHolders: [1], pendingUnionHolders: [0], workedCounts: [3, 5],
			temporaryCampaignOwners: { 5: 1 },
			dailyTemporaryEffects: [null, { roles: [rf.TRAINER], limit: 1, usedByRole: {} }],
			pendingHeadhuntSalaries: [[], [{ employee: rf.TRAINER, cost: 10 }]],
		})
		store.availableEmployees[rf.UNION_ORGANIZER] = 1
	}
	if (mediaLine) Object.assign(store.mediaLine, {
		headlines: [{ turn: 5, playerIndex: 1, value: -5 }], doubleCampaigns: [28], doubleUsedBy: [0],
		night: { groups: { 28: { owner: 0, houses: [1, 7] } }, aLinePushers: [1] },
	})
	if (stadium) store.stadium.gamesPlayed = 1
	return store
}

const clone = (value) => JSON.parse(JSON.stringify(value))
function savedState(store) {
	return clone({ bailout: store.bailout, laborMarket: store.laborMarket, mediaLine: store.mediaLine,
		stadium: store.stadium, players: store.players, bank: store.bank, bankBroken: store.bankBroken,
		history: store.history, availableEmployees: store.availableEmployees })
}
function corrupt(store) {
	Object.assign(store.bailout, { pending: false, pool: {}, claims: {}, order: [] })
	store.laborMarket.removedTemporaryWorkers = 99
	store.mediaLine.headlines = []
	store.stadium.gamesPlayed = 99
	store.players[0].money = -999
	store.bank = -999
	store.bankBroken = 0
	store.availableEmployees.fill(0)
}

// Full cross-product of version, SBD selection, and optional extension slots.
const combinations = []
for (const uniqueCards of [false, true]) for (const sbd of [false, true])
	for (const secondBailout of [false, true]) for (const laborMarket of [false, true])
		for (const mediaLine of [false, true]) combinations.push({ uniqueCards, sbd, secondBailout, laborMarket, mediaLine, stadium: true })

describe("Second Bailout whole-model snapshot regression", () => {
	it("restores pending/pool/claims/order before the new-game marker through real export/import", () => {
		const store = seed()
		const expected = savedState(store)
		const snapshot = funcs.simpleExportWholeFCMmodel()
		const wire = funcs.decompressData(snapshot)
		const markerIndex = wire.findIndex((slot) => slot?.[0] === "sbdUnique")
		expect(markerIndex).toBeGreaterThan(21)
		expect(wire[markerIndex]).toEqual(["sbdUnique", 1])
		expect(wire[markerIndex - 1]).toEqual(expected.bailout)
		expect(wire.slice(markerIndex + 1)).toContainEqual(["newMapVersion", 2])
		corrupt(store)
		funcs.simpleImportWholeFCMmodel(snapshot)
		expect(store.bailout).toEqual(expected.bailout)
	})

	it.each(combinations)("round-trips all module state: %j", (options) => {
		const store = seed(options)
		const expected = savedState(store)
		const snapshot = funcs.simpleExportWholeFCMmodel()
		const wire = funcs.decompressData(snapshot)
		expect(wire[21]).toEqual(expected.stadium)
		expect(wire[22 + Number(options.laborMarket)]).toEqual(expected.bailout)
		expect(wire.some((slot) => slot?.[0] === "sbdUnique")).toBe(options.uniqueCards)
		corrupt(store)
		store.seniorBusinessDeveloper.uniqueCards = !options.uniqueCards
		funcs.simpleImportWholeFCMmodel(snapshot)
		expect(savedState(store)).toEqual(expected)
		expect(store.seniorBusinessDeveloper.uniqueCards).toBe(options.uniqueCards)
		expect(funcs.decompressData(funcs.simpleExportWholeFCMmodel())).toEqual(wire)
	})

	it("restores claim-night state through the real controller subphase undo", () => {
		const store = seed({ laborMarket: true, mediaLine: true, stadium: true })
		const expected = savedState(store)
		store.subphaseResetData = funcs.simpleExportWholeFCMmodel()
		rules.claimBailoutEmployee(1, -1)
		expect(store.bailout.pending).toBe(false)
		corrupt(store)
		controller.resetSubphase()
		expect(savedState(store)).toEqual(expected)
	})

	it.each([false, true])("accepts a compact bailout slot in whole-model version %s", (uniqueCards) => {
		const store = seed({ uniqueCards, laborMarket: true, mediaLine: true })
		const expected = clone(store.bailout)
		const wire = funcs.decompressData(funcs.simpleExportWholeFCMmodel())
		wire[23] = [expected.order, Object.entries(expected.pool).flatMap(([k, v]) => [Number(k), v]), Object.entries(expected.claims).flatMap(([k, v]) => [Number(k), v])]
		corrupt(store)
		funcs.simpleImportWholeFCMmodel(funcs.compressData(wire))
		expect(store.bailout).toEqual(expected)
	})

	it("does not mistake a three-player body slot for a missing bailout extension", () => {
		const store = seed()
		const wire = funcs.decompressData(funcs.simpleExportWholeFCMmodel())
		wire[1].push(clone(wire[1][0]))
		wire[11] = [[], [], []] // Body shape that also matches a compact bailout slot.
		wire.splice(22, 1)
		funcs.simpleImportWholeFCMmodel(funcs.compressData(wire))
		expect(store.bailout).toEqual({ pending: false, pool: {}, claims: {}, order: [] })
	})
})

describe("Second Bailout ordinary storage remains compact and separate", () => {
	it.each(combinations.filter((options) => options.secondBailout))("imports the normal save without changing its module tail: %j", (options) => {
		const store = seed(options)
		const expected = savedState(store)
		const save = funcs.exportFCMmodel(false, false)
		const wire = funcs.decompressData(save)
		expect(wire).toContainEqual([expected.bailout.order, [rf.CAMPAIGN_MANAGER, 5], [0, rf.CAMPAIGN_MANAGER]])
		expect(wire).not.toContainEqual(expected.bailout)
		corrupt(store)
		funcs.importFCMmodel(save, false, false)
		expect(store.bailout).toEqual(expected.bailout)
		expect(store.laborMarket).toEqual(expected.laborMarket)
		expect(store.mediaLine).toEqual(expected.mediaLine)
		expect(store.stadium).toEqual(expected.stadium)
		expect(store.seniorBusinessDeveloper.uniqueCards).toBe(options.uniqueCards)
		expect(funcs.decompressData(funcs.exportFCMmodel(false, false))).toEqual(wire)
	})
})
