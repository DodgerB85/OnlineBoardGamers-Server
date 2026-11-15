/**
 * Replay smoke test: compact history -> rebuilt frames -> raw frame loads.
 * It uses a tiny synthetic game, not a saved gameData fixture.
 */
import { describe, it, expect, beforeAll } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let rf, model, replay, useModelStore, usePersonalStore

beforeAll(async () => {
	if (!globalThis.pako) (0, eval)(fs.readFileSync(path.join(__dirname, "..", "pakoLib.js"), "utf8"))
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	rf = await import("./KFWreference.js")
	model = await import("./KFWmodel.js")
	replay = await import("./KFWreplay.js")
	;({ useModelStore } = await import("../stores/KFWstore.js"))
	;({ usePersonalStore } = await import("../stores/KFWpersonal.js"))
})

function makeHomeTile(id) {
	const tile = JSON.parse(JSON.stringify(rf.ALL_TILES.find((candidate) => candidate.id === id)))
	tile.upgraded = 0
	tile.coord = [0, 0, 0]
	return tile
}

function makePlayer(name, colour, homeID, hasPurpleMeeple) {
	return {
		name,
		displayName: name,
		colour,
		hiddenWinterTile_tileIDs: [],
		hiddenContracts: [],
		villageTiles: [makeHomeTile(homeID)],
		villageCanvasSize: [162.5, 162.5],
		villageRefSize: 2400,
		pendingVillageTiles: [],
		hasPurpleMeeple,
		villageNeighbours: [],
		placeableVillageCoords: [],
		finalScore: 0,
		requireItmesScore: 0,
		autoScoreScore: 0,
		manualScoreScore: 0,
		contractScore: 0,
		goldScore: 0,
		animalScore: 0,
		bakeryScore: 0,
		granaryScore: 0,
		purpleAnimalScore: 0,
		wheat: 0,
		passFlag: 1,
		knownHiddenMeeples: [0, 0, 0, 0, 8],
		knownHiddenSkillTiles: [0, 0, 0, 0],
		hiddenMeeples: [0, 0, 0, 0],
		hiddenSkillTiles: [0, 0, 0],
		hiddenHistory: [],
	}
}

function setupGame() {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.pov = -99
	personal.haltPlay = false
	personal.trainingGame = false
	personal.gameCreationTimestamp = Math.round(Date.now() / 1000)

	store.useMerchantsExpansion = false
	store.useFarmersExpansion = false
	store.promoTileIDsToInclude = []
	store.players.splice(0)
	store.players.push(makePlayer("P0", 0, 48, true), makePlayer("P1", 1, 49, false))
	store.gameflow.turn = 0
	store.gameflow.phase = rf.PHASE_BIDDING_AND_ACTIONS
	store.gameflow.season = rf.SPRING
	store.gameflow.fullTurnOrder.splice(0, store.gameflow.fullTurnOrder.length, 0, 1)
	store.gameflow.turnOrder.splice(0, store.gameflow.turnOrder.length, 0, 1)
	store.gameflow.passedPlayerIndexes.splice(0)

	globalThis.window.initData = {
		gameID: 1,
		gameName: "test",
		gameData: "",
		gameData1: "",
		gameData3: "",
		gameCreationTimestamp: 0,
		myZoomLevel: 0,
		startingOptions: [],
		playerNames: [],
		currentPlayers: [],
		preferredKFWoptions: [-1],
		pov: -99,
		move: "",
		turn: 0,
		locale: "en-gb",
	}

	store.history.splice(
		0,
		store.history.length,
		[rf.HIST_FILL_BOAT_TILES, -1, 0, [[103, [2, 0, 0, 0], [0], []]]],
		[rf.HIST_SEASON_TILES, -1, 0, [rf.SPRING, 0, 2]],
		[rf.HIST_BID_ON_TILE, 0, 0, [0, [-1, 0]]]
	)
	return { store, personal }
}

describe("KFW replay", () => {
	it("builds one raw frame per history entry and loads them by step", async () => {
		const { store } = setupGame()
		await replay.generateReplayData(false)

		expect(store.replayData.length).toBe(3)
		expect(Array.isArray(store.replayData[0])).toBe(true)
		expect(store.replayStep).toBe(2)

		// Last frame: the bid is on Keywood.
		const keywood = store.availableTiles.find((tile) => tile.tileID.includes(0))
		expect(keywood.bids[0][0]).toEqual([0])

		// Step 1: season tiles exist, no bid yet.
		replay.goToReplayStep(1)
		expect(store.replayStep).toBe(1)
		expect(store.availableTiles.length).toBe(2)
		expect(store.availableTiles.some((tile) => tile.bids.some((bid) => bid[0].length > 0))).toBe(false)

		// Step 0: only the boats.
		replay.performStep(-1)
		expect(store.replayStep).toBe(0)
		expect(store.availableTiles.length).toBe(0)
		expect(store.availableBoatTiles.length).toBe(1)
	})

	it("ignores unknown history events without breaking the frames", async () => {
		const { store } = setupGame()
		store.history.push([999, 0, 0, []])
		await replay.generateReplayData(false)
		expect(store.replayData.length).toBe(4)
		expect(store.replayStep).toBe(3)
	})

	it("replays farmers animal and wheat gains", async () => {
		const { store } = setupGame()
		store.useFarmersExpansion = true
		store.history.splice(
			0,
			store.history.length,
			[rf.HIST_FILL_BOAT_TILES, -1, 0, [[103, [2, 0, 0, 0], [0], []]]],
			[rf.HIST_SEASON_TILES, -1, 0, [rf.SPRING, 0, 2]],
			[rf.HIST_GET_FARM_ITEMS, 0, 0, [84, 0, 1, 1, []]]
		)

		await replay.generateReplayData(false)

		const player = store.players[0]
		expect(player.wheat).toBe(1)
		expect(player.villageTiles[0].animals[0][0]).toBe(1)
		expect(store.availableAnimals[0]).toBe(rf.AVAILABLE_ANIMALS_START[0] - 1)
		expect(store.availableWheat).toBe(rf.AVAILABLE_WHEAT_START - 1)
	})

	it("opens a spoiler-free link on the requested 0-based step", async () => {
		const { store } = setupGame()
		globalThis.window.initData.replayStep = 1
		await replay.generateReplayData(true)
		expect(store.replayStep).toBe(1)
		expect(store.availableTiles.length).toBe(2)
	})

	it("keeps history entries compact", () => {
		const { store } = setupGame()
		store.history.splice(0)
		model.addHistory(rf.HIST_PASS_TURN, 1, 0, [])
		expect(store.history.length).toBe(1)
		expect(store.history[0].length).toBe(4)
		expect(Array.isArray(store.history[0][3])).toBe(true)
		expect(store.history[0][3]).toEqual([])
	})
})
