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

let model, rf, rules, mapMod, controller, useModelStore

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
	mapMod = await import("./FCMmap.js")
	controller = await import("./FCMcontroller.js")
	;({ useModelStore } = await import("../stores/FCMstore.js"))
})

function freshGame(playerCount = 2, opts = ["50"], useMilestones = true) {
	setActivePinia(createPinia())
	const store = useModelStore()
	model.setInternalStartingOptions(opts)
	if (!useMilestones) store.startingOptions.useMilestones = false
	store.players.splice(0)
	for (let i = 0; i < playerCount; i++) {
		store.players.push({
			name: "P" + i,
			displayName: "P" + i,
			colour: i,
			restaurants: [],
			employees: [],
			beach: [],
			milestones: [],
			marketers: [],
			resources: [],
		})
	}
	store.gameflow.fullTurnOrder = store.players.map((_, i) => i)
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
	store.availableEmployees = [...rf.ORIGINAL_AVAILABLE_EMPLOYEES]
	store.availableMarketingCampaigns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]
	store.availableMilestones = useMilestones ? rf.BASE_GAME_MILESTONES.concat([]) : []
	model.setupKetchupExpansion(playerCount)
	return store
}

// Blank full-size board with hand-stamped blocks (tests assert shapes tile by tile)
function blankCoords() {
	return new Array(rf.ssW * rf.ssH).fill(rf.EMPTY_SPACE)
}

function stamp(coords, x, y, w, h, value) {
	for (let i = 0; i < h; i++) {
		for (let j = 0; j < w; j++) {
			coords[mapMod.giveIndex(x + j, y + i)] = value
		}
	}
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

describe("Media Line geometry primitives", () => {
	it("computes manhattan distance", () => {
		freshGame(2, ["50"])
		const a = mapMod.giveIndex(40, 40)
		expect(mapMod.manhattanDistance(a, a)).toBe(0)
		expect(mapMod.manhattanDistance(a, mapMod.giveIndex(41, 40))).toBe(1)
		expect(mapMod.manhattanDistance(a, mapMod.giveIndex(41, 41))).toBe(2)
		expect(mapMod.manhattanDistance(a, mapMod.giveIndex(38, 42))).toBe(4)
	})

	it("dilates a 2x2 footprint into the 4x4 nine-grid ring", () => {
		freshGame(2, ["50"])
		const footprint = [mapMod.giveIndex(40, 40), mapMod.giveIndex(41, 40), mapMod.giveIndex(40, 41), mapMod.giveIndex(41, 41)]
		const area = mapMod.areaAroundFootprint(footprint, 1)
		const expected = []
		for (let x = 39; x <= 42; x++) {
			for (let y = 39; y <= 42; y++) {
				expected.push(mapMod.giveIndex(x, y))
			}
		}
		expect(area.sort((a, b) => a - b)).toEqual(expected.sort((a, b) => a - b))
	})

	it("clips the dilation at the board edge", () => {
		freshGame(2, ["50"])
		const footprint = [mapMod.giveIndex(0, 0), mapMod.giveIndex(1, 0), mapMod.giveIndex(0, 1), mapMod.giveIndex(1, 1)]
		const area = mapMod.areaAroundFootprint(footprint, 1)
		expect(area).toHaveLength(9) // 3x3 clipped out of the 4x4 ring
		expect(area).not.toContain(-1)
		expect(area.every((i) => i >= 0)).toBe(true)
	})

	it("recognises buildings (houses and restaurants, not roads/gardens)", () => {
		expect(mapMod.isBuildingValue(rf.HOUSE + 1)).toBe(true)
		expect(mapMod.isBuildingValue(rf.HOUSE + 25)).toBe(true)
		expect(mapMod.isBuildingValue(13.2)).toBe(true) // fractional apartment value
		expect(mapMod.isBuildingValue(rf.RESTAURANT_OPEN + 3)).toBe(true)
		expect(mapMod.isBuildingValue(rf.EMPTY_SPACE)).toBe(false)
		expect(mapMod.isBuildingValue(rf.ROAD)).toBe(false)
		expect(mapMod.isBuildingValue(rf.GARDEN)).toBe(false)
		expect(mapMod.isBuildingValue(rf.OFF_BOARD)).toBe(false)
	})
})

describe("Media Line B3 diamond range", () => {
	function diamondBoard() {
		const store = freshGame(2, ["50"])
		const coords = blankCoords()
		// restaurant (colour 0) x40-41, y40-41
		stamp(coords, 40, 40, 2, 2, rf.RESTAURANT_OPEN)
		// house 7 touching directly to the west: dist 1
		stamp(coords, 38, 40, 2, 3, rf.HOUSE + 7)
		// house 1 one space-gap east: dist 2
		stamp(coords, 43, 39, 2, 3, rf.HOUSE + 1)
		// house 4 diagonally touching at the corner: dist 2 (含对角)
		stamp(coords, 42, 42, 2, 3, rf.HOUSE + 4)
		// house 5 two spaces north: dist 2
		stamp(coords, 40, 36, 2, 3, rf.HOUSE + 5)
		// house 2 far away south-east: dist 5
		stamp(coords, 43, 44, 2, 3, rf.HOUSE + 2)
		// house 6 far away east: dist 5
		stamp(coords, 46, 40, 2, 3, rf.HOUSE + 6)
		// stadium space within dist 2 - marketing never affects it
		coords[mapMod.giveIndex(39, 42)] = rf.HOUSE + rf.STADIUM
		store.mapData.coords = coords
		store.players[0].restaurants = [{ index: mapMod.giveIndex(40, 40), rotation: 0, open: true }]
		return store
	}

	it("selects houses within manhattan distance 2, diagonals included", () => {
		diamondBoard()
		expect(model.giveHousesInWaveRange(0, 2)).toEqual([1, 4, 5, 7])
	})

	it("cross only (distance 1) keeps just the touching house", () => {
		diamondBoard()
		expect(model.giveHousesInWaveRange(0, 1)).toEqual([7])
	})

	it("excludes the stadium even when in range", () => {
		diamondBoard()
		expect(model.giveHousesInWaveRange(0, 2)).not.toContain(rf.STADIUM)
	})
})

describe("Media Line B2 phone token placement", () => {
	function phoneBoard(withHouse) {
		const store = freshGame(2, ["50"])
		const coords = blankCoords()
		stamp(coords, 40, 40, 2, 2, rf.RESTAURANT_OPEN)
		if (withHouse) stamp(coords, 38, 40, 2, 3, rf.HOUSE + 7)
		store.mapData.coords = coords
		store.players[0].restaurants = [{ index: mapMod.giveIndex(40, 40), rotation: 0, open: true }]
		store.gameflow.turnOrder = [0]
		return store
	}

	it("allows 2x1 pairs on empty ring cells that touch the restaurant block", () => {
		phoneBoard(false)
		const positions = rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER, 30, false)
		expect(positions.sort((a, b) => a - b)).toEqual([mapMod.giveIndex(40, 39), mapMod.giveIndex(40, 42)])
	})

	it("rotated tokens run vertically along the block sides", () => {
		phoneBoard(false)
		const positions = rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER, 30, true)
		expect(positions.sort((a, b) => a - b)).toEqual([mapMod.giveIndex(39, 40), mapMod.giveIndex(42, 40)])
	})

	it("house-occupied ring cells are not placeable, house walls count as buildings", () => {
		phoneBoard(true)
		const positions = rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER, 30, true)
		// the west column (39,40)-(39,41) is now covered by house 7's spaces
		expect(positions).toEqual([mapMod.giveIndex(42, 40)])
		const flat = rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER, 30, false)
		// the corner cell (39,39) qualifies via house 7's wall next to it
		expect(flat.sort((a, b) => a - b)).toEqual([mapMod.giveIndex(39, 39), mapMod.giveIndex(40, 39), mapMod.giveIndex(40, 42)])
	})
})

describe("Media Line affected houses", () => {
	it("phone token catches every adjacent house (billboard rule)", () => {
		const store = freshGame(2, ["50"])
		const coords = blankCoords()
		stamp(coords, 40, 40, 2, 2, rf.RESTAURANT_OPEN)
		// house 1 directly above the token line
		stamp(coords, 40, 36, 2, 3, rf.HOUSE + 1)
		store.mapData.coords = coords
		const token = { number: 30, index: mapMod.giveIndex(40, 39), rotated: false, good: 0, duration: 1 }
		expect(rules.housesAffectedByMarketingCampaign(token)).toEqual([1])
	})

	it("TV channel affects exactly the houses picked at placement", () => {
		const store = freshGame(2, ["50"])
		store.mapData.coords = blankCoords()
		const campaign = { number: 28, index: -1, rotated: false, good: 0, duration: 2, houses: [3, 7, 11, 12, 25] }
		expect(rules.housesAffectedByMarketingCampaign(campaign).sort((a, b) => a - b)).toEqual([3, 7, 11, 12, 25])
	})
})

describe("Media Line stage 3 - campaign allowances", () => {
	it("maps employees to campaign types and durations", () => {
		freshGame(2, ["50"])
		expect(rules.allowedCampaigns(rf.TELEMARKETER)).toEqual([rf.PHONE])
		expect(rules.allowedCampaigns(rf.TV_ANNOUNCER)).toEqual([rf.TV_CHANNEL])
		expect(rules.giveMaxDurationForMarketer(rf.TELEMARKETER)).toBe(3)
		expect(rules.giveMaxDurationForMarketer(rf.TV_ANNOUNCER)).toBe(4)
	})

	it("offers the matching pool slots", () => {
		freshGame(2, ["50"])
		expect(rules.possibleMarketingCampaigns([1, 2, 28, 29, 30, 31], rf.TELEMARKETER)).toEqual([30, 31])
		expect(rules.possibleMarketingCampaigns([1, 2, 28, 29, 30, 31], rf.TV_ANNOUNCER)).toEqual([28, 29])
	})

	it("phone and TV campaigns are never infinite, even with the billboard milestone", () => {
		const store = freshGame(2, ["50"])
		store.players[0].milestones.push(rf.FIRST_BILLBOARD)
		store.context.campaign = 30
		expect(controller.campaignDurationInfinite()).toBe(false)
		store.context.campaign = 28
		expect(controller.campaignDurationInfinite()).toBe(false)
	})

	it("collects every space of a house footprint", () => {
		const store = freshGame(2, ["50"])
		const coords = blankCoords()
		stamp(coords, 38, 40, 2, 3, rf.HOUSE + 7)
		store.mapData.coords = coords
		const expected = [
			mapMod.giveIndex(38, 40),
			mapMod.giveIndex(39, 40),
			mapMod.giveIndex(38, 41),
			mapMod.giveIndex(39, 41),
			mapMod.giveIndex(38, 42),
			mapMod.giveIndex(39, 42),
		]
		expect(model.giveSpacesOfHouses([7]).sort((a, b) => a - b)).toEqual(expected.sort((a, b) => a - b))
	})
})

describe("Media Line stage 3 - phone token action", () => {
	function phoneActionBoard() {
		const store = freshGame(2, ["50"])
		const coords = blankCoords()
		stamp(coords, 40, 40, 2, 2, rf.RESTAURANT_OPEN)
		store.mapData.coords = coords
		store.players[0].restaurants = [{ index: mapMod.giveIndex(40, 40), rotation: 0, open: true }]
		store.players[0].employees.push(rf.TELEMARKETER)
		store.players[0].additionalCampaignArrayIndex = -1
		store.players[0].additionalMarketedGood = []
		return store
	}

	it("chains a second identical token and locks its good and duration", () => {
		const store = phoneActionBoard()
		controller.selectMarketer(rf.TELEMARKETER, false)
		expect(store.context.campaigns).toEqual([30])
		expect(store.context.campaign).toBe(30)
		expect(store.context.duration).toBe(1)

		controller.chooseGood(1)
		controller.chooseDuration(2)
		controller.placeMarketingCampaign(mapMod.giveIndex(40, 39))

		// First token placed, second-token chain armed
		expect(store.context.mediaLineSecondCall).toBe(true)
		expect(store.context.campaign).toBe(31)
		expect(store.context.duration).toBe(2)
		expect(store.context.good).toBe(1)
		expect(store.campaigns).toHaveLength(1)
		expect(store.campaigns[0]).toMatchObject({ number: 30, good: 1, duration: 2, index: mapMod.giveIndex(40, 39) })
		expect(store.availableMarketingCampaigns).not.toContain(30)
		expect(store.players[0].employees).not.toContain(rf.TELEMARKETER)
		expect(store.players[0].marketers[0]).toEqual({ campaign: 30, marketer: rf.TELEMARKETER, nightShift: false })
		expect(store.players[0].milestones).toContain(rf.FIRST_TELEMARKETER_USED)

		// Second token: same good and duration, hanging off the same telemarketer
		controller.placeMarketingCampaign(mapMod.giveIndex(40, 42))

		expect(store.context.mediaLineSecondCall).toBe(false)
		expect(store.campaigns).toHaveLength(2)
		expect(store.campaigns[1]).toMatchObject({ number: 31, good: 1, duration: 2 })
		expect(store.players[0].marketers).toHaveLength(2)
		expect(store.players[0].marketers[1].marketer).toBe(rf.TELEMARKETER)
		expect(store.players[0].additionalCampaignArrayIndex).toBe(1)
	})

	it("can finish the action with a single token", () => {
		const store = phoneActionBoard()
		controller.selectMarketer(rf.TELEMARKETER, false)
		controller.placeMarketingCampaign(mapMod.giveIndex(40, 39))
		expect(store.context.mediaLineSecondCall).toBe(true)
		controller.resetMarketingSelection()
		expect(store.campaigns).toHaveLength(1)
		expect(store.context.marketer).toBe(-1)
	})
})

describe("Media Line stage 3 - TV channel action", () => {
	// Restaurant 40-41/40-41 plus SIX houses inside the diamond (dist <= 2):
	// 7 west (38,40), 1 east (42,39), 5 north (40,36), 2 south (40,42),
	// 4 north-east diagonal (42,42), 6 north-west diagonal (38,37)
	function tvActionBoard() {
		const store = freshGame(2, ["50"])
		const coords = blankCoords()
		stamp(coords, 40, 40, 2, 2, rf.RESTAURANT_OPEN)
		stamp(coords, 38, 40, 2, 3, rf.HOUSE + 7)
		stamp(coords, 42, 39, 2, 3, rf.HOUSE + 1)
		stamp(coords, 40, 36, 2, 3, rf.HOUSE + 5)
		stamp(coords, 40, 42, 2, 3, rf.HOUSE + 2)
		stamp(coords, 42, 42, 2, 3, rf.HOUSE + 4)
		stamp(coords, 38, 37, 2, 3, rf.HOUSE + 6)
		store.mapData.coords = coords
		store.players[0].restaurants = [{ index: mapMod.giveIndex(40, 40), rotation: 0, open: true }]
		store.players[0].employees.push(rf.TV_ANNOUNCER)
		return store
	}

	it("picks 5 of 6 houses, caps at 5, and places without a board token", () => {
		const store = tvActionBoard()
		controller.selectMarketer(rf.TV_ANNOUNCER, false)
		expect(store.context.campaign).toBe(28)
		// All 6 candidate houses are clickable (6 spaces each)
		expect(store.highlights.indexesToHighlightYellow).toHaveLength(36)

		// Out-of-range squares are ignored
		controller.toggleTVHouseSelection(mapMod.giveIndex(50, 50))
		expect(store.context.tvHouses).toEqual([])

		controller.toggleTVHouseSelection(mapMod.findIndexForHouse(7))
		controller.toggleTVHouseSelection(mapMod.findIndexForHouse(1))
		controller.toggleTVHouseSelection(mapMod.findIndexForHouse(5))
		controller.toggleTVHouseSelection(mapMod.findIndexForHouse(2))
		expect(controller.tvSelectionComplete()).toBe(false)
		controller.toggleTVHouseSelection(mapMod.findIndexForHouse(4))
		expect(controller.tvSelectionComplete()).toBe(true)

		// The 6th candidate cannot join once 5 are picked
		controller.toggleTVHouseSelection(mapMod.findIndexForHouse(6))
		expect(store.context.tvHouses).toHaveLength(5)

		// Deselecting reopens the choice
		controller.toggleTVHouseSelection(mapMod.findIndexForHouse(4))
		expect(controller.tvSelectionComplete()).toBe(false)
		controller.toggleTVHouseSelection(mapMod.findIndexForHouse(4))

		controller.chooseGood(2)
		controller.chooseDuration(3)
		controller.placeMarketingCampaign(0)

		expect(store.campaigns).toHaveLength(1)
		expect(store.campaigns[0]).toMatchObject({ number: 28, index: -1, good: 2, duration: 3 })
		expect([...store.campaigns[0].houses].sort((a, b) => a - b)).toEqual([1, 2, 4, 5, 7])
		expect(store.availableMarketingCampaigns).toContain(29)
		expect(store.availableMarketingCampaigns).not.toContain(28)
		expect(store.players[0].marketers).toEqual([{ campaign: 28, marketer: rf.TV_ANNOUNCER, nightShift: false }])
		expect(store.players[0].milestones).toContain(rf.FIRST_TV_ANNOUNCER_USED)
		// No board token: no space ever became a TV campaign element
		expect(store.mapData.coords.some((v) => v === rf.MARKETING + 28)).toBe(false)
	})

	it("completes with all houses when fewer than 5 are in range", () => {
		const store = freshGame(2, ["50"])
		const coords = blankCoords()
		stamp(coords, 40, 40, 2, 2, rf.RESTAURANT_OPEN)
		stamp(coords, 38, 40, 2, 3, rf.HOUSE + 7)
		stamp(coords, 43, 39, 2, 3, rf.HOUSE + 1)
		stamp(coords, 42, 42, 2, 3, rf.HOUSE + 4)
		stamp(coords, 40, 36, 2, 3, rf.HOUSE + 5)
		store.mapData.coords = coords
		store.players[0].restaurants = [{ index: mapMod.giveIndex(40, 40), rotation: 0, open: true }]
		store.players[0].employees.push(rf.TV_ANNOUNCER)
		controller.selectMarketer(rf.TV_ANNOUNCER, false)
		expect(controller.tvSelectionComplete()).toBe(false)
		for (const h of [7, 1, 4, 5]) controller.toggleTVHouseSelection(mapMod.findIndexForHouse(h))
		expect(controller.tvSelectionComplete()).toBe(true)
	})
})
