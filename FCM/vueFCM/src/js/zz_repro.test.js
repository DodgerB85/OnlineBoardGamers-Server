import { describe, it, beforeAll, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")
const LOG = path.join(__dirname, "zz_repro_log.txt")

const GAME_DATA = "H4sIAAAAAAAAA41Tu27kMAz8l60ZgA/JlsoAKdKlSJFCcBEgTYq7/y8zJGV710UQeOElR3yMhvQYQ7SQbBuNMW6fX/++/982Uni6VmLglUYnWUmZrJMalfrwY3+QzoeltJA1MhKhDj+geUzqnrZoeHt/fX55+0BDgSccPJiGrJklSlL930sltCGig9LwYOeW1NFptaAbQeg9PCuiHJS1s5aFtdF4Eu+xBWX0Vc57DnGvphaI0RoQc1wtqxwNGVccnNYahOP4MJEvSzbxUnya1cW4VA22K4nNC+JIndmvPc+4Jc28mvX0DMGytOkUDNFIzhybJwWjFsYGQBNswhkukFT3jASM+BEoF2BpOyA7Q2wA7dMhsV1ppyB6Z9eLapPlnYCA6naqlgGyX8mOiTYf6V6t524Mlzbz5gwstqheRvCof/+D/uLM0N36Zcu3g06JB1KTzVMXnAMTZQ3YwlW83W/+BWWhu3dYHMEO1Vx26NhifP5lzalNOzSfdjntHBPp8bVADSj9A0s0HVwMBAAA"
const STARTING_MAP = [17, 0, 4, 0, 19, 3, 18, 0, 12, 2, 24, 2, 9, 0, 0, 2, 13, 2]
const STARTING_OPTIONS = ["101", "102", "19", "22", "103"]
const PLAYER_NAMES = ["admin", "SHADOW"]

function log(...args) {
	fs.appendFileSync(LOG, args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ") + "\n")
}

let funcs, rules, modelMod, mapMod, rf, useModelStore

beforeAll(async () => {
	if (!globalThis.pako) {
		const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
		;(0, eval)(pakoSrc)
	}
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	funcs = await import("./FCMfuncs.js")
	rules = await import("./FCMrules.js")
	modelMod = await import("./FCMmodel.js")
	mapMod = await import("./FCMmap.js")
	rf = await import("./FCMreference.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
	globalThis.window.initData = { startingOptions: STARTING_OPTIONS, startingMap: STARTING_MAP, playerNames: PLAYER_NAMES }
})

function freshImport() {
	setActivePinia(createPinia())
	const store = useModelStore()
	funcs.importFCMmodel(GAME_DATA, false, false)
	return store
}

describe("repro", () => {
	it("A: state + ranges", () => {
		const store = freshImport()
		log("phase", store.gameflow.phase, "turn", store.gameflow.turn, "newRoads", store.newRoads.length)
		log("needs", JSON.stringify(store.needs))
		log("rwIndexes", JSON.stringify(mapMod.getRoadworkIndexes()))
		for (const num of store.needs.map((n) => n.number)) {
			const rd = modelMod.giveRestaurantRangesForHouse(num)
			log("ranges", num, JSON.stringify(rd))
		}
	}, 300000)

	it("E: doDinnerTime with stubbed getCoffeeRoute", () => {
		const store = freshImport()
		const calls = []
		vi.spyOn(modelMod, "getCoffeeRoute").mockImplementation((house, playerIndex, range) => {
			calls.push([house, playerIndex, range])
			return [new Array(store.players.length).fill(0), [], []]
		})
		const t0 = performance.now()
		rules.doDinnerTime(false)
		log("E doDinnerTime (coffee stubbed)", (performance.now() - t0).toFixed(1) + "ms", "calls:", JSON.stringify(calls))
	}, 600000)

	it("F: piecewise timing of getCoffeeRoute for each observed call", () => {
		const store = freshImport()
		// observed in E: house, winner, range
		const house = 13,
			playerIndex = 0,
			range = 5
		log("F inputs", JSON.stringify([house, playerIndex, range]))
		const entr = modelMod.getSinglePlayerRestaurantEntrances(playerIndex)
		log("F entrances", JSON.stringify(entr))

		// zone squares as getCoffeeRoute builds them
		const index = mapMod.findIndexForHouse(house)
		const z = [index + 1, index + rf.ssW, index + rf.ssW + 1, index]
		let total = 0
		for (const sq of z) {
			globalThis.__coffeeStats = { nodes: 0, emitted: 0, prunedRange: 0, prunedHeur: 0, prunedVisit: 0, cap: 2000000 }
			const t0 = performance.now()
			let routes, err = null
			try {
				routes = mapMod.getCoffeeRoutesFromBldgSquare(sq, entr, range)
			} catch (e) {
				err = e.message
			}
			const dt = performance.now() - t0
			total += dt
			log("F dfs zone", sq, err ? "CAPPED:" + err : "routes " + routes.length, dt.toFixed(1) + "ms", JSON.stringify(globalThis.__coffeeStats))
			globalThis.__coffeeStats = null
		}
		log("F dfs total", total.toFixed(1) + "ms")
	}, 600000)

	it("G: full getCoffeeRoute timing", () => {
		const store = freshImport()
		const t0 = performance.now()
		const res = modelMod.getCoffeeRoute(13, 0, 5)
		log("G getCoffeeRoute", (performance.now() - t0).toFixed(1) + "ms", JSON.stringify(res[0]))
	}, 600000)
})
