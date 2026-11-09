/**
 * Regression tests for the movedOut wire-format marker:
 * a moved-out house is stored with a negated house number. Game-over saves
 * flatten needs to bare good numbers, so a leading `1` (COKE) used to be
 * misread as the old Fried Chicken movedOut marker, hanging a false OUT sign
 * on the house and eating one coke demand.
 */
/* global pako */
import { describe, it, expect, beforeAll } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let funcs, model, mapMod, rf, useModelStore

const STARTING_MAP = [17, 0, 4, 0, 19, 3, 18, 0, 12, 2, 24, 2, 9, 0, 0, 2, 13, 2]

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
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function freshGame() {
	setActivePinia(createPinia())
	const store = useModelStore()
	globalThis.window.initData = { startingOptions: [], startingMap: STARTING_MAP, playerNames: ["P0", "P1"] }
	model.setInternalStartingOptions([])
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
	store.gameflow.turn = 5
	store.gameflow.fullTurnOrder = [0, 1]
	store.gameflow.turnOrder = [0, 1]
	store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
	store.reserveCards = []
	store.bank = 0
	// The winner check at game over reads the last history entry's param[0]
	store.history.push([rf.HIST_NEW_TURN, 0, 0, [0]])
	return store
}

function decodeExport(b64) {
	return JSON.parse(pako.ungzip(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), { to: "string" }))
}
function encodeArr(arr) {
	return btoa(String.fromCharCode(...new Uint8Array(pako.gzip(JSON.stringify(arr)))))
}
function importInto(decoded, forGameOver = false) {
	freshGame()
	const result = funcs.importFCMmodel(encodeArr(decoded), forGameOver, false)
	expect(result).not.toBe(-9999)
	return useModelStore()
}
// The needs slot is the array containing one entry per house, each entry
// leading with the house number (negated when the house moved out) - find it
// by looking up a known house number.
function findNeedEntry(decoded, houseNum) {
	for (const slot of decoded) {
		if (!Array.isArray(slot)) continue
		const hit = slot.find((e) => Array.isArray(e) && Math.abs(e[0]) === houseNum)
		if (hit) return hit
	}
	throw new Error("needs entry not found for house " + houseNum)
}

describe("movedOut marker round-trips", () => {
	it("keeps movedOut on a mid-game save (needs stay [good, owner] pairs)", () => {
		const store = freshGame()
		store.needs.push({ number: 47, needs: [], movedOut: true })

		const decoded = decodeExport(funcs.exportFCMmodel(false, false))
		const entry = findNeedEntry(decoded, 47)
		expect(entry).toEqual([-47])

		const store2 = importInto(decoded, false)
		const imported = store2.needs.find((n) => n.number === 47)
		expect(imported.movedOut).toBe(true)
		expect(imported.needs).toEqual([])
	})

	it("keeps movedOut on a game-over save (flat goods format)", () => {
		const store = freshGame()
		store.gameflow.phase = rf.PHASE_GAME_OVER
		store.needs.push({ number: 47, needs: [], movedOut: true })

		const decoded = decodeExport(funcs.exportFCMmodel(true, false))
		const entry = findNeedEntry(decoded, 47)
		expect(entry).toEqual([-47])

		const store2 = importInto(decoded, true)
		const imported = store2.needs.find((n) => n.number === 47)
		expect(imported.movedOut).toBe(true)
	})

	it("does NOT misread a leading COKE demand as movedOut on game-over saves (regression)", () => {
		const store = freshGame()
		store.gameflow.phase = rf.PHASE_GAME_OVER
		// House 46 ends the game with two unsold demands, coke first
		store.needs.push({ number: 46, needs: [[rf.COKE, -1], [rf.PIZZA, -1]] })

		const decoded = decodeExport(funcs.exportFCMmodel(true, false))
		// Flat goods on the wire: [46, COKE, PIZZA]
		expect(findNeedEntry(decoded, 46)).toEqual([46, rf.COKE, rf.PIZZA])

		const store2 = importInto(decoded, true)
		const imported = store2.needs.find((n) => n.number === 46)
		expect(imported.movedOut).toBeUndefined()
		// The coke demand must survive too - the old bug ate it
		expect(imported.needs).toEqual([
			[rf.COKE, -1],
			[rf.PIZZA, -1],
		])
	})

	it("distinguishes an empty house from a moved-out one", () => {
		const store = freshGame()
		store.gameflow.phase = rf.PHASE_GAME_OVER
		store.needs.push({ number: 43, needs: [] })

		const decoded = decodeExport(funcs.exportFCMmodel(true, false))
		expect(findNeedEntry(decoded, 43)).toEqual([43])

		const store2 = importInto(decoded, true)
		const imported = store2.needs.find((n) => n.number === 43)
		expect(imported.movedOut).toBeUndefined()
		expect(imported.needs).toEqual([])
	})

	it("still honours the legacy bare `1` marker on mid-game saves", () => {
		const store = freshGame()
		store.needs.push({ number: 45, needs: [], movedOut: true })

		const decoded = decodeExport(funcs.exportFCMmodel(false, false))
		// Rewrite the marker the way pre-fix saves stored it: [45, 1]
		const entry = findNeedEntry(decoded, 45)
		entry[0] = -entry[0]
		entry.push(1)

		const store2 = importInto(decoded, false)
		const imported = store2.needs.find((n) => n.number === 45)
		expect(imported.movedOut).toBe(true)
	})

	it("ignores the legacy bare `1` on game-over saves (it is a coke demand there)", () => {
		const store = freshGame()
		store.gameflow.phase = rf.PHASE_GAME_OVER
		store.needs.push({ number: 44, needs: [[rf.COKE, -1]] })

		const decoded = decodeExport(funcs.exportFCMmodel(true, false))
		const entry = findNeedEntry(decoded, 44)
		expect(entry).toEqual([44, rf.COKE]) // what old saves literally stored

		const store2 = importInto(decoded, true)
		const imported = store2.needs.find((n) => n.number === 44)
		// Old game-over saves cannot be disambiguated - coke wins over the marker
		expect(imported.movedOut).toBeUndefined()
		expect(imported.needs).toEqual([[rf.COKE, -1]])
	})
})
