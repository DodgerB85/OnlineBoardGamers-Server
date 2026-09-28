/**
 * Regression test for module drafting (FCMrules.getAvailableModules).
 *
 * externalStartingOptions holds starting option codes (18/300/120/...), the 999
 * skip marker and the drafted module IDs all mixed together. The old code counted
 * everything that was not on a hand-maintained IGNORED_MODS list, so option codes,
 * skips and duplicate picks all inflated the count. The end-of-draft check compares
 * that count against an exact target (4 for a 4-player game), so once the count had
 * shot past the target the phase could never end and drafting ran forever.
 */
import { describe, it, expect, beforeAll } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let getAvailableModules, useModelStore

beforeAll(async () => {
	if (!globalThis.pako) {
		const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
		;(0, eval)(pakoSrc)
	}
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	;({ getAvailableModules } = await import("./FCMrules.js"))
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

// The live 4-player game this bug was reported on: 3 option codes, 14 picks
// (8 real modules drafted twice each, 4 skips) and it still never ended.
const STUCK_GAME_OPTIONS = [18, 300, 120, 20, 22, 19, 11, 20, 22, 8, 12, 17, 999, 999, 999, 10, 999]

function store() {
	setActivePinia(createPinia())
	return useModelStore()
}

describe("getAvailableModules", () => {
	it("counts only real, distinct drafted modules", () => {
		const s = store()
		s.externalStartingOptions.push(...STUCK_GAME_OPTIONS)
		expect(getAvailableModules(true)).toEqual([20, 22, 19, 11, 8, 12, 17, 10])
	})

	it("drafted count reaches the 4-player end target so the phase can end", () => {
		const s = store()
		s.externalStartingOptions.push(...STUCK_GAME_OPTIONS)
		// saveModuleSelection ends the draft when length >= 4 for 4 players
		expect(getAvailableModules(true).length).toBeGreaterThanOrEqual(4)
	})

	it("option codes and skips do not count as drafted modules", () => {
		const s = store()
		s.externalStartingOptions.push(18, 300, 120, 999, 101, 102, 205, 21, 181, 183)
		expect(getAvailableModules(true)).toEqual([])
		// full pool still on offer: 13 base modules + milestone 8
		expect(getAvailableModules()).toHaveLength(14)
		expect(getAvailableModules()[0]).toBe(8)
	})

	it("removes drafted modules from the available list, duplicates notwithstanding", () => {
		const s = store()
		s.externalStartingOptions.push(18, 300, 120, 20, 20, 19)
		const available = getAvailableModules()
		expect(available).not.toContain(20)
		expect(available).not.toContain(19)
		expect(available).toContain(23)
	})

	it("keeps milestone 8 out of the pool when new milestones are in play", () => {
		const s = store()
		s.startingOptions.newMilestones = true
		expect(getAvailableModules()).toHaveLength(13)
		expect(getAvailableModules()).not.toContain(8)
	})
})
