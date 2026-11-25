import fs from "node:fs"
import { fileURLToPath } from "node:url"
import { beforeAll, afterAll, it, expect, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"

const clone = (x) => JSON.parse(JSON.stringify(x))
const startingMap = [17, 0, 4, 0, 19, 3, 18, 0, 12, 2, 24, 2, 9, 0, 0, 2, 13, 2]
let rf, model, map, rules, controller, funcs, replay, useModelStore, store

beforeAll(async () => {
	if (!globalThis.pako) (0, eval)(fs.readFileSync(fileURLToPath(new URL("../../../../Lobby/static/Lobby/common/pakoLib.js", import.meta.url)), "utf8"))
	vi.stubGlobal("window", { performance })
	vi.stubGlobal("document", { addEventListener() {}, querySelector() { return null } })
	vi.stubGlobal("alert", () => { throw Error("Unexpected alert") })
	vi.stubGlobal("fetch", () => { throw Error("Network forbidden in inventory regression") })
	rf = await import("./FCMreference.js")
	model = await import("./FCMmodel.js")
	map = await import("./FCMmap.js")
	rules = await import("./FCMrules.js")
	controller = await import("./FCMcontroller.js")
	funcs = await import("./FCMfuncs.js")
	replay = await import("./FCMreplay.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})
afterAll(() => vi.unstubAllGlobals())

function snapshot() {
	return clone({
		stock: store.availableEmployees,
		// Campaign/milestone inventories are membership pools: expiry appends returned cards.
		campaignStock: [...store.availableMarketingCampaigns].sort((a, b) => a - b),
		milestoneStock: [...store.availableMilestones].sort((a, b) => a - b),
		players: store.players.map((p) => ({ employees: p.employees, beach: p.beach, marketers: p.marketers.map((m) => ({ ...m, nightShift: !!m.nightShift })) })),
		campaigns: store.campaigns,
	})
}

function init(options = [16, 21], employees = [[47, 13], [13]]) {
	setActivePinia(createPinia())
	store = useModelStore()
	store.externalStartingOptions = options
	window.initData = { startingOptions: options, playerNames: ["P0", "P1"], startingMap }
	model.setInternalStartingOptions(options)
	model.setupNewGame(window.initData)
	store.mapData.tiles = map.expandMapToFullGrid(startingMap, 2)
	map.initCoords()
	for (let p = 0; p < 2; p++) {
		const index = rules.givePossiblePositionsForNewRestaurant(0, false)[0]
		model.addRestaurant_core(p, index, 0, true)
		model.addHistory(rf.HIST_CHOOSE_RESTAURANT_STARTING_POSITION, [funcs.exportIndex(index), 0], p, 0)
		for (const employee of employees[p]) model.giveEmployeeIfAvailable(p, employee)
		store.players[p].beach = []
		store.players[p].employees = [...employees[p]]
		model.addHistory(rf.HIST_HIRE, [...employees[p]], p, 0)
	}
	store.gameflow.turn = 1
	model.addHistory(rf.HIST_NEW_TURN, [1, store.bank, [0, 0]], -1, 0)
	for (let p = 0; p < 2; p++) model.addHistory(rf.HIST_CHOOSE_STRUCTURE, [[...employees[p]], []], p, 0)
	Object.assign(store.gameflow, { phase: rf.PHASE_WORKING_DAY, subphase: rf.SUBPHASE_MARKETING, fullTurnOrder: [0, 1], turnOrder: [0, 1] })
}

function place(duration, select = true) {
	if (select) controller.selectMarketer(13)
	controller.chooseDuration(duration)
	const index = store.highlights.indexesToHighlightYellow[0]
	expect(index).toBeGreaterThanOrEqual(0)
	controller.placeMarketingCampaign(index, 27)
}

it("ordinary import preserves the entire physical inventory of one night-shift trainee with two campaigns", () => {
	init()
	const beforeMarketing = [...store.availableEmployees]
	place(1)
	expect(store.context.nightShift).toBe(true)
	place(2, false)
	expect(store.availableEmployees[13]).toBe(beforeMarketing[13])
	expect(store.availableEmployees[27]).toBe(beforeMarketing[27] - 1)
	expect(store.players[0].marketers.map((m) => m.nightShift)).toEqual([true, false])
	const live = snapshot()
	const wire = funcs.exportFCMmodel(false, false)
	funcs.importFCMmodel(wire, false, false)
	expect(snapshot().stock).toEqual(live.stock)
	expect(snapshot()).toEqual(live)
})

function physicalEmployees() {
	return store.players.map((p) => [...p.employees, ...p.beach, ...p.marketers.filter((m) => !m.nightShift).map((m) => m.marketer)].filter((e) => e >= 0).sort((a, b) => a - b))
}

async function roundTrip(withReplay = true) {
	const live = snapshot()
	const held = physicalEmployees()
	const raw = funcs.simpleExportWholeFCMmodel(true)
	const compressed = funcs.simpleExportWholeFCMmodel()
	funcs.simpleImportWholeFCMmodel(raw, true)
	expect(snapshot()).toEqual(live)
	funcs.simpleImportWholeFCMmodel(compressed, false)
	expect(snapshot()).toEqual(live)
	for (const includeContext of [false, true]) {
		const wire = funcs.exportFCMmodel(false, includeContext)
		for (let i = 0; i < 3; i++) {
			funcs.importFCMmodel(wire, false, includeContext)
			expect(snapshot()).toEqual(live)
			expect(physicalEmployees()).toEqual(held)
		}
	}
	if (withReplay) {
		await replay.generateReplayData()
		expect(snapshot()).toEqual(live)
		expect(physicalEmployees()).toEqual(held)
		for (let i = 0; i < 3; i++) {
			replay.performStep(-1)
			replay.performStep(1)
			expect(snapshot()).toEqual(live)
		}
	}
}

it.each([
	{ label: "legacy night shift short-long", options: [16, 21], durations: [1, 2], night: true },
	{ label: "legacy night shift long-short", options: [16, 21], durations: [2, 1], night: true },
	{ label: "legacy night shift equal", options: [16, 21], durations: [1, 1], night: true },
	{ label: "balanced night shift short-long", options: [16, 21, 54], durations: [1, 2], night: true },
	{ label: "balanced night shift long-short", options: [16, 21, 54], durations: [2, 1], night: true },
	{ label: "balanced night shift equal", options: [16, 21, 54], durations: [1, 1], night: true },
	{ label: "two real same-type employees without night shift", options: [21], durations: [1, 2], night: false },
	{ label: "two real same-type employees with night shift enabled", options: [16, 21], durations: [1, 2], night: false },
	{ label: "one ordinary campaign", options: [21], durations: [1], night: false },
	{ label: "one campaign with night-shift manager present", options: [16, 21], durations: [1], night: true },
])("$label conserves full inventory through wire, context, raw/packed whole and real replay", async ({ options, durations, night }) => {
	const employees = night ? [47, 13] : durations.map(() => 13)
	init(options, [employees, [13]])
	const stockBefore = [...store.availableEmployees]
	place(durations[0])
	if (durations.length === 2) place(durations[1], !night)
	expect(store.history.filter((h) => [9, 45].includes(h[0])).map((h) => h[0])).toEqual(night && durations.length === 2 ? [9, 45] : durations.map(() => 9))
	expect(store.availableEmployees[13]).toBe(stockBefore[13])
	expect(store.availableEmployees[27]).toBe(stockBefore[27] - 1)
	expect(store.availableEmployees[23]).toBe(stockBefore[23] - (options.includes(54) ? 0 : 1))
	await roundTrip()
})

it.each([
	{ options: [16, 21], durations: [1, 2] },
	{ options: [16, 21], durations: [2, 1] },
	{ options: [16, 21], durations: [1, 1] },
	{ options: [16, 21, 54], durations: [1, 2] },
	{ options: [16, 21, 54], durations: [2, 1] },
	{ options: [16, 21, 54], durations: [1, 1] },
])("real expiry $options/$durations returns exactly one physical employee and survives import/replay", async ({ options, durations }) => {
	init(options)
	place(durations[0])
	place(durations[1], false)
	const stock = [...store.availableEmployees]
	const held = physicalEmployees()
	rules.doMarketingCampaigns(false)
	expect(store.campaigns).toHaveLength(durations[0] === durations[1] ? 0 : 1)
	expect(physicalEmployees()).toEqual(held)
	expect(store.availableEmployees).toEqual(stock)
	if (store.campaigns.length) {
		expect(store.players[0].marketers).toHaveLength(1)
		expect(store.players[0].marketers[0].nightShift).toBe(false)
		expect(store.players[0].beach.filter((e) => e === 13)).toHaveLength(0)
		await roundTrip()
		rules.doMarketingCampaigns(false)
	}
	expect(store.campaigns).toHaveLength(0)
	expect(store.players[0].marketers).toHaveLength(0)
	expect(store.players[0].beach.filter((e) => e === 13)).toHaveLength(1)
	expect(store.availableEmployees).toEqual(stock)
	expect(physicalEmployees()).toEqual(held)
	await roundTrip()
})

it.each([false, true])("production recall of physical-first=%s preserves a single card even with only a virtual binding left", async (physicalFirst) => {
	const player = await import("./FCMplayer.js")
	init()
	place(2)
	place(1, false)
	const stock = [...store.availableEmployees]
	const held = physicalEmployees()
	const bindings = [...store.players[0].marketers].sort((a, b) => physicalFirst ? Number(a.nightShift) - Number(b.nightShift) : Number(b.nightShift) - Number(a.nightShift))
	for (const binding of bindings) {
		model.removeMarketingCampaign(binding.campaign)
		player.recallMarketeer(0, binding.campaign)
		expect(store.availableEmployees).toEqual(stock)
		expect(physicalEmployees()).toEqual(held)
		// Direct recall has no standalone history action; replay is covered by actual expiry above.
		await roundTrip(false)
	}
	expect(store.players[0].beach.filter((e) => e === 13)).toHaveLength(1)
})

it("a legacy ordinary binding with no nightShift property still consumes each real same-type employee", async () => {
	init([21], [[13, 13], [13]])
	place(1)
	place(2)
	for (const binding of store.players[0].marketers) delete binding.nightShift
	expect(store.players[0].marketers.every((m) => !("nightShift" in m))).toBe(true)
	expect(store.availableEmployees[13]).toBe(rf.ORIGINAL_AVAILABLE_EMPLOYEES[13] - 3)
	await roundTrip()
})

it("the exact captured browser POST reload has the same full inventory and bindings as independent history replay", async () => {
	// Original Task12B saveNormal payload: POST = DB = loadNew (SHA256 b4eaecbb0ab2d1c3dcffea7650a5954e309b53a49d4c2e3ce2ca44ec37b092c4).
	// This is an immutable captured fixture, not a new HTTP/DB end-to-end test.
	const capturedWire = "H4sIAAAAAAAAA1VQuw7CMAz8l86uFOdB2rGIgQ0hkBisCDEz8v8Sd+6DokQ52/HZZ5uZddfpeX993hqPXZMsZkFCaxLEcm1ikY8OoiMxiargJN6AiN9eAdbdztPp8kAVhVfWKprWNNvlIykEbwZuEUcWQflBPMhmSWHHtvKSo9axFM3DIYr1TDAmBHadpQMq1UMjPQpe5MCurqg5NRb/pRBnOhVNFi4LO4ehnw9FypXs7FGwJndH2UZIsgwVJJfdOFun/xNn3NYEfdzTFzveLLKkAQAA"
	init([101, 102, 16, 21, 54])
	funcs.importFCMmodel(capturedWire, false, false)
	const imported = snapshot()
	expect(imported.stock[13]).toBe(10)
	expect(imported.stock[27]).toBe(11)
	expect(imported.stock[23]).toBe(12)
	await roundTrip()
})
