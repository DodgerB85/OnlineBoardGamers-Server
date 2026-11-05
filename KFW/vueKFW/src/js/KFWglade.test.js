/**
 * The Glade in Winter scores 3VP for each adjacent tile showing a winter icon,
 * so boats and turn order tiles in a village (always winter-side up) count too.
 */
import { describe, it, expect, beforeAll } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let rf, model, useModelStore

beforeAll(async () => {
	if (!globalThis.pako) (0, eval)(fs.readFileSync(path.join(__dirname, "..", "pakoLib.js"), "utf8"))
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.initData = globalThis.window.initData || {}
	rf = await import("./KFWreference.js")
	model = await import("./KFWmodel.js")
	;({ useModelStore } = await import("../stores/KFWstore.js"))
	ALL_GRASS = [rf.GRASS, rf.GRASS, rf.GRASS, rf.GRASS, rf.GRASS, rf.GRASS]
})

let ALL_GRASS

let nextTileId = 1
function makeTile(tileID, coord, sides, extra = {}) {
	return {
		id: nextTileId++,
		tileID,
		upgraded: 0,
		coord,
		sides,
		resources: [0, 0, 0, 0],
		victoryPoints: [0, 0],
		animals: [],
		season: rf.SPRING,
		action: [],
		...extra,
	}
}

function makePlayer(tiles) {
	return {
		name: "P0",
		displayName: "P0",
		colour: 0,
		villageTiles: tiles,
		pendingVillageTiles: [],
		hiddenContracts: [],
		hiddenMeeples: [0, 0, 0, 0],
		hiddenSkillTiles: [0, 0, 0],
		hasPurpleMeeple: false,
		wheat: 0,
	}
}

describe("Glade in Winter scoring", () => {
	it("counts winter boats and turn order tiles as winter icons", () => {
		const home = makeTile([9100, 9101], [10, 0, -10], ALL_GRASS, { season: rf.SEASON_HOME_TILE })
		const glade = makeTile([rf.TILE_WINTER_THE_GLADE_IN_WINTER_A, rf.TILE_WINTER_BACK], [0, 0, 0], ALL_GRASS, { season: rf.WINTER })
		const seasons = [rf.WINTER, rf.WINTER, rf.WINTER, rf.SEASON_BOAT_TILE, rf.SEASON_TURN_ORDER_TILE, rf.AUTUMN]
		const neighbours = rf.DIRECTION_VECTORS.map((coord, i) => makeTile([9200 + i * 2, 9201 + i * 2], coord, ALL_GRASS, { season: seasons[i] }))

		setActivePinia(createPinia())
		const store = useModelStore()
		store.players.splice(0, store.players.length, makePlayer([home, glade, ...neighbours]))
		store.gameflow.season = rf.WINTER

		model.scoreAutoProcessingTilesAndMoveResources(0)

		expect(glade.victoryPoints[0]).toBe(15) // 3 winter + boat + turn order; autumn tile excluded
	})
})
