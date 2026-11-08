/**
 * Senior Business Developer fan mod:
 * - apartment 3x3 footprint and stock
 * - pending move-out persistence and dinner timing
 * - out-token count derived from history
 * - tile-reward milestone without the Lobbyists module
 * - compact history payloads
 * - milestone fires on every SBD action (house/garden/apartment/evict)
 */
/* global pako */
import { beforeAll, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let funcs, model, mapMod, rf, rules, historyMod, controller, useModelStore, usePersonalStore

beforeAll(async () => {
	if (!globalThis.pako) {
		const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
		;(0, eval)(pakoSrc)
	}
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	funcs = await import("./FCMfuncs.js")
	model = await import("./FCMmodel.js")
	mapMod = await import("./FCMmap.js")
	rf = await import("./FCMreference.js")
	rules = await import("./FCMrules.js")
	historyMod = await import("./FCMhistory.js")
	controller = await import("./FCMcontroller.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
	;({ usePersonalStore } = await import("../stores/FCMpersonal.js"))
})

// Compact 2-player starting map used by the other persistence tests.
const STARTING_MAP = [17, 0, 4, 0, 19, 3, 18, 0, 12, 2, 24, 2, 9, 0, 0, 2, 13, 2]
// SO_SENIOR_BUSINESS_DEVELOPER = 53 (rf is imported in beforeAll)
const SBD_ONLY = [53]

function freshGame(opts = SBD_ONLY) {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.pov = 0
	model.setInternalStartingOptions(opts)
	store.mapData.tiles = mapMod.expandMapToFullGrid(STARTING_MAP, 2)
	mapMod.initCoords()
	store.players.splice(0)
	for (let i = 0; i < 2; i++) {
		store.players.push({
			name: "P" + i,
			displayName: "P" + i,
			colour: i,
			restaurants: [],
			money: 100,
			bankrupt: false,
			employees: [],
			beach: [],
			milestones: [],
			marketers: [],
			resources: [],
			additionalCampaignArrayIndex: -1,
			additionalMarketedGood: [],
			coffeeShops: [],
			ceoSlots: 3,
			ceoAction: rf.CEO_ACTION_HIRE_1,
			OOBpreference: 0,
		})
	}
	model.setupKetchupExpansion(2)
	store.gameflow.turn = 5
	store.gameflow.phase = rf.PHASE_WORKING_DAY
	store.gameflow.subphase = rf.SUBPHASE_SBD_HOUSES
	store.gameflow.fullTurnOrder = [0, 1]
	store.gameflow.turnOrder = [0, 1]
	store.bank = 500
	window.initData = { startingOptions: opts, startingMap: STARTING_MAP, playerNames: ["P0", "P1"] }
	return store
}

function placeHouse(houseNumber = 1) {
	const index = mapMod.locationFor(2, 3, false)[0]
	expect(index).toBeGreaterThanOrEqual(0)
	model.addHouse(houseNumber, index, 0)
	return index
}

function decodeExport(b64) {
	return JSON.parse(pako.ungzip(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), { to: "string" }))
}

function encodeArr(arr) {
	return btoa(String.fromCharCode(...new Uint8Array(pako.gzip(JSON.stringify(arr)))))
}

describe("Senior Business Developer — map and stock", () => {
	it("places apartments as a 3x3 block and removes them from the stock", () => {
		const store = freshGame()
		const index = mapMod.locationFor(3, 3, false)[0]
		model.addApartment(rf.APARTMENT_15, index)

		for (let i = 0; i < 3; i++) {
			for (let j = 0; j < 3; j++) {
				expect(store.mapData.coords[index + i + j * rf.ssW]).toBe(rf.HOUSE + rf.APARTMENT_15)
			}
		}
		expect(store.houses.find((h) => h.number === rf.APARTMENT_15).apartment).toBe(true)
		expect(rules.availableApartments()).not.toContain(rf.APARTMENT_15)
	})

	it("trains New Business Developer into the SBD only when the mod is on", () => {
		freshGame()
		expect(rules.oneLevelAbove(rf.NEW_BUSINESS_DEVELOPER)).toEqual([rf.SENIOR_BUSINESS_DEVELOPER])

		setActivePinia(createPinia())
		model.setInternalStartingOptions([])
		expect(rules.oneLevelAbove(rf.NEW_BUSINESS_DEVELOPER)).toEqual([])
	})
})

describe("Senior Business Developer — eviction", () => {
	it("still eats on the eviction turn and moves out at the next dinner", () => {
		const store = freshGame()
		placeHouse(1)
		model.evictHouse(1)

		rules.doDinnerTime(true)
		const need = store.needs.find((n) => n.number === 1)
		expect(need.pendingMoveOut).toBe(true)
		expect(need.movedOut).not.toBe(true)
		expect(rules.moveOutCandidateHouses()).not.toContain(1)

		store.gameflow.turn = 6
		rules.doDinnerTime(true)
		expect(need.movedOut).toBe(true)
		expect(need.pendingMoveOut).toBe(false)
	})

	it("still eats on the eviction turn when Fried Chicken is also on", () => {
		const store = freshGame([rf.SO_SENIOR_BUSINESS_DEVELOPER, rf.SO_FRIED_CHICKEN])
		placeHouse(1)
		model.evictHouse(1)

		rules.doDinnerTime(true)
		const need = store.needs.find((n) => n.number === 1)
		expect(need.movedOut).not.toBe(true)

		store.gameflow.turn = 6
		rules.doDinnerTime(true)
		expect(need.movedOut).toBe(true)
	})

	it("writes the compact [houseNumber] history payload", () => {
		const store = freshGame()
		const index = placeHouse(1)
		controller.chooseMoveOutHouse(index)

		const entry = store.history.find((h) => h[0] === rf.HIST_SBD_MOVE_OUT)
		expect(entry[3]).toEqual([1])
		expect(store.seniorBusinessDeveloper.outTokensUsed).toBe(1)
	})
})

describe("Senior Business Developer — save/load", () => {
	it("persists pending move-outs, rebuilds used tokens from history and keeps 3x3 apartments", () => {
		freshGame()
		const aptIndex = mapMod.locationFor(3, 3, false)[0]
		model.addApartment(rf.APARTMENT_15, aptIndex)
		placeHouse(1)
		model.evictHouse(1)
		model.addHistory(rf.HIST_SBD_MOVE_OUT, [1], 0, 0)

		const b64 = funcs.exportFCMmodel(false, false)
		const wire = decodeExport(b64)
		// The added-tile slot exists even without Lobbyists, so it is empty here
		expect(wire[0]).toEqual([])
		expect(wire[8]).toContainEqual([1, 2, 5])

		setActivePinia(createPinia())
		window.initData = { startingOptions: SBD_ONLY, startingMap: STARTING_MAP, playerNames: ["P0", "P1"] }
		expect(funcs.importFCMmodel(b64, false, false)).not.toBe(-9999)

		const restored = useModelStore()
		const need = restored.needs.find((n) => n.number === 1)
		expect(need.pendingMoveOut).toBe(true)
		expect(need.sbdEvictedTurn).toBe(5)
		expect(restored.houses.some((h) => h.number === rf.APARTMENT_15)).toBe(true)
		expect(mapMod.findIndexForApartment(rf.APARTMENT_15)).toBe(aptIndex)
		for (let i = 0; i < 3; i++) {
			for (let j = 0; j < 3; j++) {
				expect(restored.mapData.coords[aptIndex + i + j * rf.ssW]).toBe(rf.HOUSE + rf.APARTMENT_15)
			}
		}
		expect(rules.outTokensRemaining()).toBe(rules.SBD_OUT_TOKEN_POOL - 1)
	})

	it("keeps the SBD milestone tile without the Lobbyists module", () => {
		const store = freshGame()
		const tile = rules.availableLobbyistTiles()[0]
		expect(tile).toBeGreaterThan(-1)
		const emptyPair = store.mapData.tiles.findIndex((value, index) => index % 2 === 0 && value === -1)
		expect(emptyPair).toBeGreaterThan(-1)
		mapMod.addTileToMap(tile, emptyPair, 0)

		const b64 = funcs.exportFCMmodel(false, false)
		const wire = decodeExport(b64)
		expect(wire[0]).toContainEqual([emptyPair / 2, tile])

		setActivePinia(createPinia())
		window.initData = { startingOptions: SBD_ONLY, startingMap: STARTING_MAP, playerNames: ["P0", "P1"] }
		funcs.importFCMmodel(b64, false, false)
		expect(useModelStore().mapData.tiles[emptyPair]).toBe(tile)
	})

	it("loads a pre-fix SBD save that has no added-tile slot", () => {
		freshGame()
		placeHouse(1)
		const wire = decodeExport(funcs.exportFCMmodel(false, false))
		wire.shift() // old export: players are slot 0

		setActivePinia(createPinia())
		window.initData = { startingOptions: SBD_ONLY, startingMap: STARTING_MAP, playerNames: ["P0", "P1"] }
		expect(funcs.importFCMmodel(encodeArr(wire), false, false)).not.toBe(-9999)
		expect(useModelStore().players).toHaveLength(2)
	})

	it("persists a Fried Chicken pending move-out through the same marker", () => {
		const store = freshGame()
		store.needs.push({ number: 1, needs: [], pendingMoveOut: true })
		const b64 = funcs.exportFCMmodel(false, false)
		const wire = decodeExport(b64)
		expect(wire[8]).toContainEqual([1, 2, -1])

		setActivePinia(createPinia())
		window.initData = { startingOptions: SBD_ONLY, startingMap: STARTING_MAP, playerNames: ["P0", "P1"] }
		funcs.importFCMmodel(b64, false, false)
		const need = useModelStore().needs.find((n) => n.number === 1)
		expect(need.pendingMoveOut).toBe(true)
		expect(need.sbdEvictedTurn).toBeUndefined()
	})
})

describe("Senior Business Developer — milestone and history UI", () => {
	it("awards First SBD Used when the SBD builds a house", () => {
		const store = freshGame()
		store.availableMilestones.push(rf.FIRST_SENIOR_BUSINESS_DEVELOPER_USED)
		store.context.selectedBuilding = 1
		store.context.rotation = 0
		const index = mapMod.locationFor(2, 3, false)[0]

		controller.chooseHousePosition(index)
		expect(store.players[0].milestones).toContain(rf.FIRST_SENIOR_BUSINESS_DEVELOPER_USED)
		expect(store.context.lobbyistMilestoneActive).toBe(true)
	})

	it("awards First SBD Used when the SBD builds a garden", () => {
		const store = freshGame()
		store.availableMilestones.push(rf.FIRST_SENIOR_BUSINESS_DEVELOPER_USED)
		const houseNumber = rules.givePossibleHousesForGarden()[0]
		expect(houseNumber).toBeDefined()
		store.context.house = houseNumber
		store.context.houseIndex = mapMod.findIndexForHouse(houseNumber)
		store.context.selectedBuilding = -1
		store.context.rotation = 0

		controller.chooseHouseEdge(mapMod.findFreeEdgesForHouse(houseNumber)[0], -1)
		expect(store.players[0].milestones).toContain(rf.FIRST_SENIOR_BUSINESS_DEVELOPER_USED)
		expect(store.context.lobbyistMilestoneActive).toBe(true)
	})

	it("highlights the 3x3 apartment and 2x2 eviction footprints from history", () => {
		const store = freshGame()
		const aptIndex = mapMod.locationFor(3, 3, false)[0]
		model.addApartment(rf.APARTMENT_15, aptIndex)
		historyMod.setupHistoryHighlight(rf.HIST_SBD_BUILD_APARTMENT, [funcs.exportIndex(aptIndex), rf.APARTMENT_15], 0)
		expect(store.historyHelpers.indexesToHighlightYellow).toHaveLength(9)

		const houseIndex = placeHouse(1)
		historyMod.setupHistoryHighlight(rf.HIST_SBD_MOVE_OUT, [1], 0)
		expect(store.historyHelpers.indexesToHighlightYellow).toHaveLength(4)
		expect(store.historyHelpers.indexesToHighlightYellow).toContain(houseIndex)
	})
})
