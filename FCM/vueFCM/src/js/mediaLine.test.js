/**
 * Media Line mod tests (stage 1 - data layer):
 * 1. Constant allocation (employees 59/60, SO 50, milestones 42/43, HIST 73,
 *    campaign types TV_CHANNEL/PHONE, campaign slots 28-35).
 * 2. Setup: pools x6, campaigns 28-35 pushed, milestones gated by useMilestones.
 * 3. Training chain: MARKETING_TRAINEE -> TELEMARKETER -> TV_ANNOUNCER -> BRAND_DIRECTOR.
 */
/* global pako */
import { describe, it, expect, beforeAll } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAKO_FILE = path.join(__dirname, "..", "..", "..", "..", "Lobby", "static", "Lobby", "common", "pakoLib.js")

let model, rf, rules, useModelStore

beforeAll(async () => {
	if (!globalThis.pako) {
		const pakoSrc = fs.readFileSync(PAKO_FILE, "utf8")
		;(0, eval)(pakoSrc)
	}
	globalThis.alert = () => {}
	globalThis.window = globalThis.window || {}
	globalThis.window.performance = performance
	model = await import("./FCMmodel.js")
	rf = await import("./FCMreference.js")
	rules = await import("./FCMrules.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function freshGame(playerCount = 2, opts = ["50"], useMilestones = true) {
	setActivePinia(createPinia())
	const store = useModelStore()
	model.setInternalStartingOptions(opts)
	if (!useMilestones) store.startingOptions.useMilestones = false
	store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
	store.availableMarketingCampaigns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]
	store.availableMilestones = useMilestones ? rf.BASE_GAME_MILESTONES.concat([]) : []
	model.setupKetchupExpansion(playerCount)
	return store
}

describe("Media Line constants", () => {
	it("allocates unique ids", () => {
		expect(rf.SO_MEDIA_LINE).toBe(50)
		expect(rf.TELEMARKETER).toBe(59)
		expect(rf.TV_ANNOUNCER).toBe(60)
		expect(rf.FIRST_TELEMARKETER_USED).toBe(42)
		expect(rf.FIRST_TV_ANNOUNCER_USED).toBe(43)
		expect(rf.HIST_PUBLISH_HEADLINE).toBe(73)
		expect(rf.TV_CHANNEL).toBe(7)
		expect(rf.PHONE).toBe(8)
	})

	it("registers campaign slots 28-35", () => {
		expect(rf.MARKETING_CAMPAIGNS).toHaveLength(36)
		expect(rf.MARKETING_CAMPAIGNS[28]).toEqual({ type: rf.TV_CHANNEL, width: 1, height: 1 })
		expect(rf.MARKETING_CAMPAIGNS[29]).toEqual({ type: rf.TV_CHANNEL, width: 1, height: 1 })
		for (let n = 30; n <= 35; n++) {
			expect(rf.MARKETING_CAMPAIGNS[n]).toEqual({ type: rf.PHONE, width: 2, height: 1 })
		}
	})

	it("registers both employees in role arrays", () => {
		expect(rf.MARKETERS).toContain(rf.TELEMARKETER)
		expect(rf.MARKETERS).toContain(rf.TV_ANNOUNCER)
		expect(rf.REQUIRE_SALARY).toContain(rf.TELEMARKETER)
		expect(rf.REQUIRE_SALARY).toContain(rf.TV_ANNOUNCER)
		expect(rf.EMPLOYEE_ARRANGEMENT).toContain(rf.TELEMARKETER)
		expect(rf.EMPLOYEE_ARRANGEMENT).toContain(rf.TV_ANNOUNCER)
	})
})

describe("Media Line setup", () => {
	it("fills pools and campaigns when SO 50 present", () => {
		const store = freshGame(2, ["50"])
		expect(store.startingOptions.mediaLine).toBe(true)
		expect(store.availableEmployees[rf.TELEMARKETER]).toBe(6)
		expect(store.availableEmployees[rf.TV_ANNOUNCER]).toBe(6)
		for (let n = 28; n <= 35; n++) {
			expect(store.availableMarketingCampaigns).toContain(n)
		}
		expect(store.availableMilestones).toContain(rf.FIRST_TELEMARKETER_USED)
		expect(store.availableMilestones).toContain(rf.FIRST_TV_ANNOUNCER_USED)
	})

	it("does nothing without SO 50", () => {
		const store = freshGame(2, [])
		expect(store.startingOptions.mediaLine).toBe(false)
		for (let n = 28; n <= 35; n++) {
			expect(store.availableMarketingCampaigns).not.toContain(n)
		}
		expect(store.availableMilestones).not.toContain(rf.FIRST_TELEMARKETER_USED)
		expect(store.availableMilestones).not.toContain(rf.FIRST_TV_ANNOUNCER_USED)
	})

	it("keeps milestones out when useMilestones is off", () => {
		const store = freshGame(2, ["50"], false)
		expect(store.availableEmployees[rf.TELEMARKETER]).toBe(6)
		expect(store.availableEmployees[rf.TV_ANNOUNCER]).toBe(6)
		expect(store.availableMilestones).not.toContain(rf.FIRST_TELEMARKETER_USED)
		expect(store.availableMilestones).not.toContain(rf.FIRST_TV_ANNOUNCER_USED)
	})
})

describe("Media Line training chain", () => {
	it("extends MARKETING_TRAINEE only with the module", () => {
		freshGame(2, ["50"])
		expect(rules.oneLevelAbove(rf.MARKETING_TRAINEE)).toContain(rf.TELEMARKETER)
		freshGame(2, [])
		expect(rules.oneLevelAbove(rf.MARKETING_TRAINEE)).not.toContain(rf.TELEMARKETER)
	})

	it("chains TELEMARKETER -> TV_ANNOUNCER -> BRAND_DIRECTOR", () => {
		freshGame(2, ["50"])
		expect(rules.oneLevelAbove(rf.TELEMARKETER)).toEqual([rf.TV_ANNOUNCER])
		expect(rules.oneLevelAbove(rf.TV_ANNOUNCER)).toEqual([rf.BRAND_DIRECTOR])
	})
})
