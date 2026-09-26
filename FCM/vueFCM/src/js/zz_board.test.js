import { describe, it, beforeAll } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")
const LOG = path.join(__dirname, "zz_board_log.txt")

const GAME_DATA = "H4sIAAAAAAAAA41Tu27kMAz8l60ZgA/JlsoAKdKlSJFCcBEgTYq7/y8zJGV710UQeOElR3yMhvQYQ7SQbBuNMW6fX/++/982Uni6VmLglUYnWUmZrJMalfrwY3+QzoeltJA1MhKhDj+geUzqnrZoeHt/fX55+0BDgSccPJiGrJklSlL930sltCGig9LwYOeW1NFptaAbQeg9PCuiHJS1s5aFtdF4Eu+xBWX0Vc57DnGvphaI0RoQc1wtqxwNGVccnNYahOP4MJEvSzbxUnya1cW4VA22K4nNC+JIndmvPc+4Jc28mvX0DMGytOkUDNFIzhybJwWjFsYGQBNswhkukFT3jASM+BEoF2BpOyA7Q2wA7dMhsV1ppyB6Z9eLapPlnYCA6naqlgGyX8mOiTYf6V6t524Mlzbz5gwstqheRvCof/+D/uLM0N36Zcu3g06JB1KTzVMXnAMTZQ3YwlW83W/+BWWhu3dYHMEO1Vx26NhifP5lzalNOzSfdjntHBPp8bVADSj9A0s0HVwMBAAA"
const STARTING_MAP = [17, 0, 4, 0, 19, 3, 18, 0, 12, 2, 24, 2, 9, 0, 0, 2, 13, 2]
const STARTING_OPTIONS = ["101", "102", "19", "22", "103"]
const PLAYER_NAMES = ["admin", "SHADOW"]

function log(...args) {
	fs.appendFileSync(LOG, args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ") + "\n")
}

let funcs, modelMod, mapMod, rf, useModelStore

beforeAll(async () => {
	if (!globalThis.pako) {
		const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
		;(0, eval)(pakoSrc)
	}
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	funcs = await import("./FCMfuncs.js")
	modelMod = await import("./FCMmodel.js")
	mapMod = await import("./FCMmap.js")
	rf = await import("./FCMreference.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
	globalThis.window.initData = { startingOptions: STARTING_OPTIONS, startingMap: STARTING_MAP, playerNames: PLAYER_NAMES }
})

describe("board", () => {
	it("dump", () => {
		setActivePinia(createPinia())
		const store = useModelStore()
		funcs.importFCMmodel(GAME_DATA, false, false)

		const coords = store.mapData.coords
		const roads = []
		for (let i = 0; i < coords.length; i++) if (rf.ROADS.includes(coords[i])) roads.push(i)
		log("road squares:", roads.length)
		log("road list:", JSON.stringify(roads))

		// road degree under nextRoadNeighbours-ish (undirected adjacency, no back edge)
		const degrees = roads.map((r) => {
			const nb = mapMod.giveNeighbours(r).filter((n) => rf.ROADS.includes(coords[n]))
			return [r, nb.length]
		})
		log("degrees:", JSON.stringify(degrees))

		// components via simple adjacency
		const roadSet = new Set(roads)
		const seen = new Set()
		const comps = []
		for (const r of roads) {
			if (seen.has(r)) continue
			const stack = [r]
			const comp = []
			seen.add(r)
			while (stack.length) {
				const c = stack.pop()
				comp.push(c)
				for (const n of mapMod.giveNeighbours(c)) if (roadSet.has(n) && !seen.has(n)) { seen.add(n); stack.push(n) }
			}
			comps.push(comp)
		}
		log("components:", JSON.stringify(comps.map((c) => c.length)))

		// which squares are "same tile" clusters
		const tiles = new Map()
		for (const r of roads) {
			const x = Math.floor((r % rf.ssW) / 5)
			const y = Math.floor(Math.floor(r / rf.ssW) / 5)
			const key = y * 17 + x
			if (!tiles.has(key)) tiles.set(key, [])
			tiles.get(key).push(r)
		}
		log("tiles with roads:", JSON.stringify([...tiles.entries()].map(([k, v]) => [k, v.length])))

		const index = mapMod.findIndexForHouse(13)
		log("house13 index", index, "zone", JSON.stringify([index + 1, index + rf.ssW, index + rf.ssW + 1, index]))
		log("resto entrances p0", JSON.stringify(modelMod.getSinglePlayerRestaurantEntrances(0)))
		log("resto entrances p1", JSON.stringify(modelMod.getSinglePlayerRestaurantEntrances(1)))
		for (const p of store.players) log("player", p.colour, "restaurants", JSON.stringify(p.restaurants), "coffeeShops", JSON.stringify(p.coffeeShops))
		log("newRoads", JSON.stringify(store.newRoads))
		log("coords at 3696", coords[3696], "3695", coords[3695], "3697", coords[3697])
	}, 300000)
})
