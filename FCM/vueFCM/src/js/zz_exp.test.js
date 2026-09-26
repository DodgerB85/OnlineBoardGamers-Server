import { describe, it, beforeAll } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")
const LOG = path.join(__dirname, "zz_exp_log.txt")

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

// opts: { memo, heuristic, cap }
function dfsVariant(index, restaurants, winningRange, opts) {
	const store = useModelStore()
	const coords = store.mapData.coords
	const restoSet = new Set(restaurants)
	const rwSet = new Set(mapMod.getRoadworkIndexes())
	const coffeeRoutes = []
	const stats = { nodes: 0, memoHits: 0, emitted: 0, heurPruned: 0 }

	const destTiles = []
	{
		const seen = new Set()
		for (const r of restaurants) {
			const tx = Math.floor((r % rf.ssW) / 5)
			const ty = Math.floor(Math.floor(r / rf.ssW) / 5)
			const key = ty * rf.ssW + tx
			if (!seen.has(key)) {
				seen.add(key)
				destTiles.push([tx, ty])
			}
		}
	}
	const minTileDist = (idx) => {
		const x = Math.floor((idx % rf.ssW) / 5)
		const y = Math.floor(Math.floor(idx / rf.ssW) / 5)
		let min = Infinity
		for (const [dx, dy] of destTiles) {
			const d = Math.abs(x - dx) + Math.abs(y - dy)
			if (d < min) min = d
		}
		return min
	}

	// road-aware lower bound: min additional range cost (tile crossings + rw
	// entries) to reach a road square next to a restaurant entrance. Graph
	// over-approximates (undirected, all road adjacencies), so h <= true cost.
	let h = null
	if (opts.heuristic) {
		const roadSet = new Set()
		for (let i = 0; i < coords.length; i++) if (rf.ROADS.includes(coords[i])) roadSet.add(i)
		const dist = new Map()
		const pq = []
		const push = (i, d) => {
			pq.push([d, i])
			let c = pq.length - 1
			while (c > 0) {
				const p = (c - 1) >> 1
				if (pq[p][0] <= pq[c][0]) break
				;[pq[p], pq[c]] = [pq[c], pq[p]]
				c = p
			}
		}
		const pop = () => {
			const top = pq[0]
			const last = pq.pop()
			if (pq.length) {
				pq[0] = last
				let c = 0
				for (;;) {
					const l = 2 * c + 1,
						r = l + 1
					let m = c
					if (l < pq.length && pq[l][0] < pq[m][0]) m = l
					if (r < pq.length && pq[r][0] < pq[m][0]) m = r
					if (m === c) break
					;[pq[m], pq[c]] = [pq[c], pq[m]]
					c = m
				}
			}
			return top
		}
		// targets: road squares adjacent to a restaurant entrance
		for (const sq of roadSet) {
			for (const nb of mapMod.giveNeighbours(sq)) {
				if (restoSet.has(nb)) {
					dist.set(sq, 0)
					push(sq, 0)
					break
				}
			}
		}
		while (pq.length) {
			const [d, u] = pop()
			if ((dist.get(u) ?? Infinity) < d) continue
			for (const v of mapMod.giveNeighbours(u)) {
				if (!roadSet.has(v)) continue
				const cost = (mapMod.onTheSameTile(u, v) ? 0 : 1) + (rwSet.has(v) ? 1 : 0)
				const nd = d + cost
				if (nd < (dist.get(v) ?? Infinity)) {
					dist.set(v, nd)
					push(v, nd)
				}
			}
		}
		h = (i) => dist.get(i) ?? Infinity
	}

	const roadCache = new Map()
	const cachedNextRoads = (idx, from) => {
		const key = idx * 100000 + from
		let v = roadCache.get(key)
		if (v === undefined) {
			v = mapMod.nextRoadNeighbours(idx, from)
			roadCache.set(key, v)
		}
		return v
	}

	const startNodes = mapMod
		.neighbours(index)
		.filter((n) => rf.ROADS.includes(coords[n]))
		.map((n) => ({ index: n, range: mapMod.onTheSameTile(index, n) ? 0 : 1, from: index }))

	const memo = new Set()

	const findPaths = (currentIdx, fromIdx, currentRange, path, pathSet, visitedTwice) => {
		stats.nodes++
		if (stats.nodes > opts.cap) throw new Error("cap " + JSON.stringify(stats))

		for (const neighbor of mapMod.neighbours(currentIdx)) {
			if (restoSet.has(neighbor)) {
				if (mapMod.onTheSameTile(currentIdx, neighbor) || currentRange + 1 <= winningRange) {
					coffeeRoutes.push([...path])
					stats.emitted++
				}
			}
		}

		const nextRoads = cachedNextRoads(currentIdx, fromIdx)

		for (const next of nextRoads) {
			let nextRange = currentRange
			const crossed = !mapMod.onTheSameTile(currentIdx, next)
			if (crossed) nextRange++
			if (rwSet.has(next)) nextRange++

			if (nextRange > winningRange && (crossed || rwSet.has(next))) continue
			if (crossed && currentRange + minTileDist(next) > winningRange) continue
			if (opts.heuristic) {
				// admissible: reaching any restaurant-adjacent square from `next`
				// costs at least h(next) more range, and every step must stay
				// within winningRange
				if (nextRange + h(next) > winningRange) {
					stats.heurPruned++
					continue
				}
			}

			const isSecondVisit = pathSet.has(next)
			if (isSecondVisit) {
				if (visitedTwice.has(next)) continue
			}

			path.push(next)
			pathSet.add(next)
			if (isSecondVisit) visitedTwice.add(next)

			let skip = false
			if (opts.memo) {
				const key =
					next + "|" + currentIdx + "|" + nextRange + "|" + [...pathSet].sort((a, b) => a - b).join(",") + "|" + [...visitedTwice].sort((a, b) => a - b).join(",")
				if (memo.has(key)) {
					skip = true
					stats.memoHits++
				} else {
					memo.add(key)
				}
			}
			if (!skip) findPaths(next, currentIdx, nextRange, path, pathSet, visitedTwice)

			path.pop()
			if (!isSecondVisit) pathSet.delete(next)
			if (isSecondVisit) visitedTwice.delete(next)
		}
	}

	for (const start of startNodes) {
		findPaths(start.index, start.from, start.range, [start.index], new Set([start.index]), new Set())
	}

	return { routes: coffeeRoutes, stats }
}

const setKey = (routes) => new Set(routes.map((r) => [...new Set(r)].sort((a, b) => a - b).join(",")))

describe("experiment", () => {
	it("variants on the reported board", () => {
		setActivePinia(createPinia())
		const store = useModelStore()
		funcs.importFCMmodel(GAME_DATA, false, false)

		const index = mapMod.findIndexForHouse(13)
		const zone = [index + 1, index + rf.ssW, index + rf.ssW + 1, index]
		const entr = modelMod.getSinglePlayerRestaurantEntrances(0)
		const range = 5

		const run = (label, opts) => {
			const t0 = performance.now()
			let res = null
			let err = null
			try {
				res = dfsVariant(zone[opts.zoneIdx ?? 2], entr, range, opts)
			} catch (e) {
				err = e.message
			}
			const ms = performance.now() - t0
			log(label, err ? "ERR " + err : `${res.stats.nodes} nodes, emitted ${res.stats.emitted}, sets ${setKey(res.routes).size}, heurPruned ${res.stats.heurPruned}, memoHits ${res.stats.memoHits}, ${ms.toFixed(0)}ms`)
			return res
		}

		run("zone2927 baseline", { memo: false, heuristic: false, cap: 2000000, zoneIdx: 2 })
		run("zone2927 heuristic", { memo: false, heuristic: true, cap: 2000000, zoneIdx: 2 })
		run("zone2927 heur+memo", { memo: true, heuristic: true, cap: 5000000, zoneIdx: 2 })
		run("zone2926 heur+memo", { memo: true, heuristic: true, cap: 5000000, zoneIdx: 1 })
		run("zone2842 heur+memo", { memo: true, heuristic: true, cap: 5000000, zoneIdx: 0 })
		run("zone2841 heur+memo", { memo: true, heuristic: true, cap: 5000000, zoneIdx: 3 })
	}, 600000)
})
