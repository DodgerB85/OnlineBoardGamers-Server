import { beforeAll, beforeEach, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import * as map from "./FCMmap.js"
import * as model from "./FCMmodel.js"
import * as funcs from "./FCMfuncs.js"
import * as rf from "./FCMreference.js"
import * as view from "./FCMview.js"
import * as rules from "./FCMrules.js"
import * as replay from "./FCMreplay.js"
import * as controller from "./FCMcontroller.js"
import { useModelStore } from "../stores/FCMstore.js"
// Approved tile data copied verbatim from d312437453909816bfc4ee9372bfa4ddcb26cf9e.
import tuned from "./fixtures/newMap-v2.json"

beforeAll(() => {
	;(0, eval)(fs.readFileSync(new URL("../../../../Lobby/static/Lobby/common/pakoLib.js", import.meta.url), "utf8"))
	globalThis.alert = (message) => { throw new Error(message) }
	globalThis.window = { performance }
})
beforeEach(() => {
	setActivePinia(createPinia())
	window.initData = { playerNames: ["A", "B"], startingOptions: [rf.SO_NEW_MAP], startingMap: [29, 0, 32, 0, 33, 0, 36, 0, 30, 0, 31, 0, 34, 0, 35, 0, 37, 0] }
	model.setInternalStartingOptions(window.initData.startingOptions)
})

const versionSlot = (entry) => Array.isArray(entry) && entry[0] === "newMapVersion"

for (const version of [0, 2]) {
	for (const [label, gameOver, context] of [["normal", false, false], ["context", false, true], ["game-over", true, false]]) {
		it(`persists version ${version} through real ${label} export/import and same-page switching`, () => {
			model.setupNewGame({ newMapVersion: version })
			if (gameOver) model.endGame()
			const store = useModelStore()
			const expected = [...store.mapData.coords]
			const saved = funcs.exportFCMmodel(gameOver, context)
			const wire = funcs.decompressData(saved)
			expect(wire.find(versionSlot)).toEqual(version ? ["newMapVersion", 2] : undefined)
			store.mapData.newMapVersion = version ? 0 : 2
			funcs.importFCMmodel(saved, gameOver, context)
			expect(store.mapData.newMapVersion).toBe(version)
			expect(store.mapData.coords).toEqual(expected)
			expect(funcs.decompressData(funcs.exportFCMmodel(gameOver, context)).find(versionSlot)).toEqual(version ? ["newMapVersion", 2] : undefined)
		})
	}
	it(`restores version ${version} with whole-model undo snapshots`, () => {
		model.setupNewGame({ newMapVersion: version })
		const store = useModelStore()
		const expected = [...store.mapData.coords]
		const snapshot = funcs.simpleExportWholeFCMmodel()
		expect(funcs.decompressData(snapshot).find(versionSlot)).toEqual(version ? ["newMapVersion", 2] : undefined)
		store.mapData.newMapVersion = version ? 0 : 2
		funcs.simpleImportWholeFCMmodel(snapshot)
		expect(store.mapData.newMapVersion).toBe(version)
		expect(store.mapData.coords).toEqual(expected)
	})
}

for (let mask = 0; mask < 8; mask++) {
	for (const format of ["whole", "normal", "context", "game-over"]) {
		it(`preserves extension combination ${mask} in ${format} with the version marker`, () => {
			const options = [rf.SO_NEW_MAP, rf.SO_SECOND_BAILOUT]
			if (mask & 1) options.push(rf.SO_STADIUM)
			if (mask & 2) options.push(rf.SO_LABOR_MARKET)
			if (mask & 4) options.push(rf.SO_MEDIA_LINE)
			window.initData.startingOptions = options
			model.setInternalStartingOptions(options)
			model.setupNewGame()
			const store = useModelStore()
			store.externalStartingOptions = options
			store.stadium.gamesPlayed = 2
			store.stadium.announcement = { gameNumber: 3, food: rf.BURGER, units: 5 }
			store.laborMarket.removedTemporaryWorkers = 2
			store.laborMarket.temporaryCampaignOwners = { 5: 1 }
			store.mediaLine.headlines = [{ turn: 0, playerIndex: 1, value: 5 }]
			store.mediaLine.doubleCampaigns = [28]
			Object.assign(store.bailout, { pending: true, order: [1, 0], pool: { 5: 2 }, claims: { 1: 5 } })
			const bailout = JSON.parse(JSON.stringify(store.bailout))
			const stadium = JSON.parse(JSON.stringify(store.stadium))
			if (format === "game-over") model.endGame()
			const encoded = format === "whole" ? funcs.simpleExportWholeFCMmodel() : funcs.exportFCMmodel(format === "game-over", format === "context")
			store.bailout.pending = false
			store.stadium.gamesPlayed = 0
			store.laborMarket.removedTemporaryWorkers = 0
			store.mediaLine.doubleCampaigns = []
			if (format === "whole") funcs.simpleImportWholeFCMmodel(encoded)
			else funcs.importFCMmodel(encoded, format === "game-over", format === "context")
			expect(store.mapData.newMapVersion).toBe(2)
			if (format !== "game-over") expect(store.bailout).toEqual(bailout)
			else expect(store.bailout.pending).toBe(false)
			if (mask & 1) expect(store.stadium).toEqual(stadium)
			if (mask & 2) {
				if (format !== "game-over") expect(store.laborMarket.removedTemporaryWorkers).toBe(2)
				expect(store.laborMarket.temporaryCampaignOwners).toEqual({ 5: 1 })
			}
			if (mask & 4) expect(store.mediaLine.doubleCampaigns).toEqual([28])
		})
	}
}

for (const version of [0, 2]) {
	it(`routes every board and candidate image consistently for version ${version}`, () => {
		model.setupNewGame({ newMapVersion: version })
		for (let tile = 0; tile < rf.TILES.length; tile++) {
			const changed = Object.hasOwn(tuned, tile)
			const filename = `map${String(tile + 1).padStart(2, "0")}${version && changed ? "_v2" : ""}.jpg`
			expect(view.getImage(`map${tile + 1}`)).toContain(`/images/${filename}`)
		}
	})
	for (let rotation = 0; rotation < 4; rotation++) {
		for (const tile of [29, 32, 33, 36]) {
			it(`expands tile ${tile} rotation ${rotation} using version ${version} cells`, () => {
				const store = useModelStore()
				store.mapData.newMapVersion = version
				store.mapData.tiles = Array(17 * 16 * 2).fill(-1)
				map.initCoords()
				map.addTileToMap(tile, 216, rotation)
				const expected = map.rotateTile(version ? tuned[tile] : rf.TILES[tile], rotation)
				expect(cellsAt(108)).toEqual(expected)
				const expanded = [...store.mapData.coords]
				map.initCoords()
				expect(store.mapData.coords).toEqual(expanded)
				if (tile === 33) expect(rules.gatherFromTiles([108], 2)).toEqual(version ? [rf.LEMONADE, rf.LEMONADE] : [])
				if (tile === 29) {
					const firstRoad = store.mapData.coords.indexOf(rf.ROAD)
					expect(map.areaRoad(firstRoad).length).toBe(version ? 3 : 9)
				}
			})
		}
	}
}

vi.mock("../backend/FCM_IO.js", () => ({ saveGameNormal: vi.fn(async () => {}) }))

for (const version of [0, 2]) {
	it(`Reset AI keeps version ${version} instead of upgrading a legacy game`, async () => {
		window.initData.playerNames = ["A", "FcmAI"]
		model.setupNewGame({ newMapVersion: version })
		const { resetGameForAI } = await import("./AI/resetGame.js")
		expect(await resetGameForAI()).toBe(true)
		expect(useModelStore().mapData.newMapVersion).toBe(version)
	})
}

for (const version of [0, 2]) {
	for (let rotation = 0; rotation < 4; rotation++) {
		it(`loads all cells and house locations with rotation ${rotation} in version ${version}`, () => {
			window.initData.startingMap = window.initData.startingMap.map((n, i) => i % 2 ? rotation : n)
			model.setupNewGame({ newMapVersion: version })
			const saved = funcs.exportFCMmodel(false, false)
			setActivePinia(createPinia())
			funcs.importFCMmodel(saved, false, false)
			const store = useModelStore()
			for (let position = 0; position < store.mapData.tiles.length / 2; position++) {
				const tile = store.mapData.tiles[position * 2]
				if (tile < 0) continue
				const expected = map.rotateTile(version && tuned[tile] ? tuned[tile] : rf.TILES[tile], rotation)
				expect(cellsAt(position)).toEqual(expected)
				for (const house of new Set(expected.filter((n) => n > rf.HOUSE && n < rf.HOUSE_ENC_MAX))) {
					const local = expected.indexOf(house)
					const anchor = Math.floor(position / 17) * 5 * rf.ssW + position % 17 * 5
					expect(map.findIndexForHouse(house - rf.HOUSE)).toBe(anchor + Math.floor(local / 5) * rf.ssW + local % 5)
				}
			}
			expect(view.getImage("map30")).toContain(version ? "map30_v2.jpg" : "map30.jpg")
		})
	}

	it(`replays imported version ${version}, including expansion and backward/forward snapshots`, async () => {
		window.initData.startingOptions.push(rf.SO_LOBBYISTS)
		window.initData.startingMap = [29, 1, 32, 2, 30, 0, 31, 0, 34, 0, 35, 0, 37, 0, 38, 0, 39, 0]
		model.setInternalStartingOptions(window.initData.startingOptions)
		model.setupNewGame({ newMapVersion: version })
		const store = useModelStore()
		store.externalStartingOptions = [...window.initData.startingOptions]
		const initial = [...store.mapData.coords]
		map.addTileToMap(36, 214, 3)
		model.addHistory(rf.HIST_NEW_TILE, [0, 36, 3, 107], 0, 1)
		map.addTileToMap(33, 248, 1)
		model.addHistory(rf.HIST_NEW_TILE, [0, 33, 1, 124], 0, 2)
		const final = [...store.mapData.coords]
		const saved = funcs.exportFCMmodel(false, false)
		store.mapData.newMapVersion = version ? 0 : 2
		funcs.importFCMmodel(saved, false, false)
		expect(store.mapData.coords).toEqual(final)
		globalThis.document = { querySelector: () => null, getElementById: () => null }
		await replay.generateReplayData()
		expect(store.replayData).toHaveLength(3)
		expect(store.mapData.coords).toEqual(final)
		replay.goToReplayStep(0)
		expect(store.mapData.coords).toEqual(initial)
		expect(store.mapData.newMapVersion).toBe(version)
		replay.goToReplayStep(2)
		expect(store.mapData.coords).toEqual(final)
		expect(store.mapData.newMapVersion).toBe(version)
		expect(rules.gatherFromTiles([124], 1)).toEqual(version ? [rf.LEMONADE] : [])
		expect(view.getImage("map37")).toContain(version ? "map37_v2.jpg" : "map37.jpg")
	})

	it(`rewinds a whole turn in version ${version} before the next expansion`, () => {
		model.setupNewGame({ newMapVersion: version })
		const store = useModelStore()
		const original = [...store.mapData.coords]
		store.wholeTurnResetData = funcs.exportFCMmodel(false, false)
		map.addTileToMap(33, 214, 0)
		store.mapData.newMapVersion = version ? 0 : 2
		controller.resetWholeTurn()
		expect(store.mapData.newMapVersion).toBe(version)
		expect(store.mapData.coords).toEqual(original)
		map.addTileToMap(33, 214, 0)
		expect(rules.gatherFromTiles([107], 1)).toEqual(version ? [rf.LEMONADE] : [])
	})

	it(`undoes actual lobbyist expansion and keeps subsequent tile logic in version ${version}`, () => {
		model.setupNewGame({ newMapVersion: version })
		const store = useModelStore()
		const original = [...store.mapData.coords]
		store.subphaseResetData = funcs.simpleExportWholeFCMmodel()
		map.addTileToMap(33, 214, 2)
		store.mapData.newMapVersion = version ? 0 : 2
		controller.resetLobbying()
		expect(store.mapData.newMapVersion).toBe(version)
		expect(store.mapData.coords).toEqual(original)
		map.addTileToMap(33, 214, 2)
		expect(cellsAt(107)).toEqual(map.rotateTile(version ? tuned[33] : rf.TILES[33], 2))
	})
}

it("persists the new-game version even before New Map is drafted", () => {
	window.initData.startingOptions = [rf.SO_DRAFT_MODULES]
	setActivePinia(createPinia())
	model.setInternalStartingOptions(window.initData.startingOptions)
	model.setupNewGame()
	expect(useModelStore().startingOptions.newMap).toBe(false)
	const saved = funcs.exportFCMmodel(false, false)
	setActivePinia(createPinia())
	funcs.importFCMmodel(saved, false, false)
	model.setInternalStartingOptions([rf.SO_NEW_MAP])
	map.addTileToMap(33, 214, 0)
	expect(cellsAt(107)).toEqual(tuned[33])
	expect(view.getImage("map34")).toContain("map34_v2.jpg")
})

function cellsAt(tilePosition) {
	const store = useModelStore()
	const anchor = Math.floor(tilePosition / 17) * 5 * rf.ssW + tilePosition % 17 * 5
	return Array.from({ length: 25 }, (_, n) => store.mapData.coords[anchor + Math.floor(n / 5) * rf.ssW + n % 5])
}

it("does not change tile pools, numbering or random-mode draws between revisions", () => {
	const store = useModelStore()
	const random = vi.spyOn(Math, "random").mockReturnValue(0.25)
	try {
		for (const priority of [false, true]) {
			Object.assign(store.startingOptions, { newMap: true, newMapAll: priority, lobbyists: true, newDistricts: true })
			store.mapData.newMapVersion = 0
			const pool = rules.availableLobbyistTiles()
			const urban = rules.availableUrbanPlanningTiles()
			const drawn = map.generateRandomMap(4)
			store.mapData.newMapVersion = 2
			expect(rules.availableLobbyistTiles()).toEqual(pool)
			expect(rules.availableUrbanPlanningTiles()).toEqual(urban)
			expect(map.generateRandomMap(4)).toEqual(drawn)
		}
	} finally {
		random.mockRestore()
	}
})

it("keeps the other eleven tiles and house inventory identical in both revisions", () => {
	const houses = new Set()
	for (let tile = 29; tile <= 43; tile++) {
		const data = rf.tileData(tile, 2)
		expect(data).toHaveLength(25)
		if (!Object.hasOwn(tuned, tile)) expect(data).toBe(rf.TILES[tile])
		for (const value of data) if (value > rf.HOUSE && value < rf.HOUSE_ENC_MAX) houses.add(value - rf.HOUSE)
	}
	expect([...houses].sort((a, b) => a - b)).toEqual(rf.NEW_MAP_HOUSES)
})

it("selects the approved optimized cells before initializing a new game's coordinates", () => {
	model.setupNewGame()
	for (const [tile, expected] of Object.entries(tuned)) {
		const position = useModelStore().mapData.tiles.findIndex((value, index) => index % 2 === 0 && value === Number(tile)) / 2
		expect(cellsAt(position)).toEqual(expected)
	}
})
