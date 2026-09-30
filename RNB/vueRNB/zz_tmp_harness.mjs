import { createPinia, setActivePinia } from "pinia"
import * as pako from "pako"

globalThis.pako = {
	ungzip: (b) => new TextDecoder().decode(pako.ungzip(b)),
	gzip: pako.gzip,
}

setActivePinia(createPinia())

const { useModelStore } = await import("./src/stores/RNBstore.js")
const { usePersonalStore } = await import("./src/stores/RNBpersonal.js")
const funcs = await import("./src/js/RNBfuncs.js")
const highlight = await import("./src/js/RNBhighlight.js")
const controller = await import("./src/js/RNBcontroller.js")
const view = await import("./src/js/RNBview.js")
const model = await import("./src/js/RNBmodel.js")

const store = useModelStore()
const personal = usePersonalStore()

personal.gameID = 42
personal.pov = 0
personal.name = "100pcBlade"
personal.haltPlay = false

const map = [
	[0, 0, 84], [1, 0, 84], [2, 0, 84], [3, 0, 84], [4, 0, 84],
	[1, -1, 56], [4, -1, 56], [2, -1, 73], [3, -1, 65], [0, 1, 77],
	[1, 1, 65], [2, 1, 73], [4, 1, 15, 5], [4, 3, 84], [3, 4, 84],
	[2, 5, 84], [1, 6, 84], [0, 7, 84], [1, 5, 73], [3, 5, 73],
	[3, 3, 75], [3, 2, 65], [2, 4, 65], [2, 3, 57], [1, 4, 57],
	[0, 4, 21, 3], [0, 3, 21, 5], [1, 3, 21, 1], [2, 2, 2, 1], [1, 2, 56],
	[0, 2, 56], [-1, 2, 65], [-2, 2, 15, 3], [-1, 3, 2, 2], [-1, 4, 56],
	[-1, 5, 56], [-1, 6, 65], [-2, 5, 65], [-3, 3, 83], [-3, 4, 83],
	[-3, 5, 83], [-3, 6, 83], [-3, 7, 83], [-2, 6, 78], [-4, 4, 55],
	[-4, 7, 55], [-4, 5, 64], [-4, 6, 72], [-2, 4, 73], [-1, 7, 15, 1],
	[0, 6, 6], [0, 5, 2], [4, 4, 56], [1, 7, 56], [2, 6, 65],
	[-1, 1, 3, 1], [3, 1, 6, 4], [4, 2, 3], [-2, 3, 6, 2], [-2, 7, 3, 5],
	{ HM: [[50], [56], [58]], UK: 16 },
]

store.mapData.externalMapData = [...map]

funcs.importRNBmodel("H4sIAAAAAAAAA4uOjo5WMjQwKEh2yklMSVWK1TGN1QEKufsCmYZgZm5RTmZxSSWQbxQLFEBDRgY60QY6hkA53DRIWzSQjI0FAMXHlNdvAAAA", false)

console.log("players =", JSON.stringify(store.players.map((p) => p.name)))
console.log("phase =", store.gameflow.phase, "turnOrder =", JSON.stringify(store.gameflow.turnOrder))
console.log("setupData.HM =", JSON.stringify(store.mapData.setupData.HM))
console.log("ALL_HOME_MARKERS =", JSON.stringify(store.ALL_HOME_MARKERS))
console.log("hexData length =", store.mapData.hexData.length)
console.log("canPlay =", personal.canPlay())

try {
	controller.startPlayerTurn()
} catch (e) {
	console.log("startPlayerTurn threw (after highlight):", e.message)
}
console.log("hexPiecesToHighlight =", JSON.stringify(store.context.hexPiecesToHighlight))

for (const id of [50, 56, 58]) {
	const hex = model.getHexByID(id)
	console.log("hex", id, "baseTerrain", hex.baseTerrain, "currentTerrain", hex.currentTerrain, "hexTerrainID", hex.hexTerrainID, "rotation", hex.rotation)
	const p = view.getHexHighlightPath(id, [0], false)
	console.log("  path", p === "" ? "EMPTY" : p.length)
}