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

let model, rf, rules, mapMod, controller, funcs, replay, useModelStore

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
	funcs = await import("./FCMfuncs.js")
	replay = await import("./FCMreplay.js")
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
	it("builds the cross of 5 tiles around the door square's tile", () => {
		freshGame(2, ["50"])
		// restaurant (40,40) rotation 0 -> door on square (41,40), tile (8,8)
		const door = [mapMod.giveIndex(41, 40)]
		const region = mapMod.waveRegionSpaces(door, 1)
		const expected = []
		// tiles (7,8) (8,8) (9,8) (8,7) (8,9), each contributing all 25 spaces
		for (const [tx, ty] of [
			[8, 8],
			[7, 8],
			[9, 8],
			[8, 7],
			[8, 9],
		]) {
			for (let y = 0; y < 5; y++) {
				for (let x = 0; x < 5; x++) expected.push(mapMod.giveIndex(tx * 5 + x, ty * 5 + y))
			}
		}
		expect([...region].sort((a, b) => a - b)).toEqual(expected.sort((a, b) => a - b))
	})

	it("diamond range 2 covers 13 tiles and clips at the board edge", () => {
		freshGame(2, ["50"])
		// door squares of restaurants at (42,42) and (1,1), both rotation 0
		const centre = [mapMod.giveIndex(43, 42)]
		expect(mapMod.waveRegionSpaces(centre, 2).size).toBe(13 * 25)
		// corner restaurant: only the in-board part of the diamond remains
		const corner = [mapMod.giveIndex(2, 1)]
		expect(mapMod.waveRegionSpaces(corner, 2).size).toBe(6 * 25)
	})
})

describe("Media Line B3 diamond range", () => {
	// Restaurant (colour 0) x40-41, y40-41 sits on tile (8,8). Houses are
	// stamped one per tile so the tile-space diamond decides membership.
	function diamondBoard() {
		const store = freshGame(2, ["50"])
		const coords = blankCoords()
		stamp(coords, 40, 40, 2, 2, rf.RESTAURANT_OPEN)
		// house 4 in the restaurant's own tile (8,8) - dist 0
		stamp(coords, 42, 42, 2, 3, rf.HOUSE + 4)
		// house 1 east, tile (9,8) - dist 1
		stamp(coords, 46, 42, 2, 3, rf.HOUSE + 1)
		// house 5 south, tile (8,9) - dist 1
		stamp(coords, 42, 47, 2, 3, rf.HOUSE + 5)
		// house 6 far east, tile (10,8) - dist 2 (arm of the diamond)
		stamp(coords, 51, 42, 2, 3, rf.HOUSE + 6)
		// house 7 south-east, tile (9,9) - dist 2 (diagonal)
		stamp(coords, 47, 47, 2, 3, rf.HOUSE + 7)
		// house 2 beyond the arm, tile (11,8) - dist 3, out of range
		stamp(coords, 56, 42, 2, 3, rf.HOUSE + 2)
		// house 3 diagonal corner, tile (10,10) - dist 4, out of range
		stamp(coords, 52, 52, 2, 3, rf.HOUSE + 3)
		// stadium space inside the restaurant tile - marketing never affects it
		coords[mapMod.giveIndex(44, 44)] = rf.HOUSE + rf.STADIUM
		store.mapData.coords = coords
		store.players[0].restaurants = [{ index: mapMod.giveIndex(40, 40), rotation: 0, open: true }]
		return store
	}

	it("selects houses inside the 13-tile diamond, arms and diagonals included", () => {
		diamondBoard()
		expect(model.giveHousesInWaveRange(0, 2)).toEqual([1, 4, 5, 6, 7])
	})

	it("cross only (tile distance 1) keeps the own and orthogonal tiles", () => {
		diamondBoard()
		expect(model.giveHousesInWaveRange(0, 1)).toEqual([1, 4, 5])
	})

	it("excludes the stadium even when in range", () => {
		diamondBoard()
		expect(model.giveHousesInWaveRange(0, 2)).not.toContain(rf.STADIUM)
	})

	it("a straddling restaurant waves only from its door tile", () => {
		// 2x2 restaurant at x39-40 y39-40 straddles tiles (7,7)(8,7)(7,8)(8,8);
		// rotation 0 puts the door on square (40,39) -> tile (8,7)
		const store = freshGame(2, ["50"])
		const coords = blankCoords()
		stamp(coords, 39, 39, 2, 2, rf.RESTAURANT_OPEN)
		// house 8 on tile (6,8): distance 3 from the door tile (out), distance 1
		// from the south-west footprint tile (7,8) - the door rule excludes it
		stamp(coords, 30, 40, 2, 3, rf.HOUSE + 8)
		store.mapData.coords = coords
		store.players[0].restaurants = [{ index: mapMod.giveIndex(39, 39), rotation: 0, open: true }]
		expect(model.giveHousesInWaveRange(0, 2)).toEqual([])
	})

	it("a Local Manager opens all four corners as doors", () => {
		const store = freshGame(2, ["50"])
		const coords = blankCoords()
		stamp(coords, 39, 39, 2, 2, rf.RESTAURANT_OPEN)
		stamp(coords, 30, 40, 2, 3, rf.HOUSE + 8)
		store.mapData.coords = coords
		store.players[0].restaurants = [{ index: mapMod.giveIndex(39, 39), rotation: 0, open: true }]
		store.players[0].employees.push(rf.LOCAL_MANAGER)
		// the south-west door corner (39,40) -> tile (7,8) reaches house 8
		expect(model.giveHousesInWaveRange(0, 2)).toEqual([8])
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

	it("allows any empty 2x1 pair anchored inside the cross of 5 tiles", () => {
		phoneBoard(false)
		const positions = rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER, 30, false)
		// deep inside the west tile (7,8)
		expect(positions).toContain(mapMod.giveIndex(37, 41))
		// straddling the boundary between the west and centre tiles
		expect(positions).toContain(mapMod.giveIndex(39, 43))
		// anchored on the cross edge - the second cell may sit in the next tile
		expect(positions).toContain(mapMod.giveIndex(49, 43))
		// the diagonally adjacent tile (7,7) is not part of the cross
		expect(positions).not.toContain(mapMod.giveIndex(37, 37))
		// two tiles west (6,8) is beyond the cross
		expect(positions).not.toContain(mapMod.giveIndex(33, 41))
		// the restaurant block itself is not empty ground
		expect(positions).not.toContain(mapMod.giveIndex(40, 40))
		// an anchor outside the cross does not become valid by reaching in
		expect(positions).not.toContain(mapMod.giveIndex(50, 43))
	})

	it("rotated tokens run vertically anywhere in the cross", () => {
		phoneBoard(false)
		const positions = rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER, 30, true)
		// vertical pair inside the north tile (8,7)
		expect(positions).toContain(mapMod.giveIndex(41, 37))
		// vertical pair inside the west tile (7,8)
		expect(positions).toContain(mapMod.giveIndex(37, 41))
		// anchored on the top row of the north tile pokes into the tile above
		expect(positions).toContain(mapMod.giveIndex(41, 35))
		// diagonal tile (7,7) again excluded
		expect(positions).not.toContain(mapMod.giveIndex(37, 37))
	})

	it("house-occupied cells inside the cross are not placeable", () => {
		phoneBoard(true)
		const flat = rules.givePossiblePositionsForMarketingCampaign(rf.TELEMARKETER, 30, false)
		// house 7 covers x38-39 y40-42 in the west tile - anchors overlapping
		// its cells are gone, empty ground west of it stays available
		expect(flat).not.toContain(mapMod.giveIndex(38, 40))
		expect(flat).toContain(mapMod.giveIndex(36, 40))
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
		expect(rules.allowedCampaigns(rf.TELEMARKETER)).toEqual([rf.BILLBOARD, rf.PHONE])
		expect(rules.allowedCampaigns(rf.TV_ANNOUNCER)).toEqual([rf.BILLBOARD, rf.PHONE, rf.TV_CHANNEL])
		expect(rules.allowedCampaigns(rf.BRAND_DIRECTOR)).toEqual([rf.BILLBOARD, rf.MAIL, rf.AIRPLANE, rf.RADIO, rf.PHONE, rf.TV_CHANNEL])
		expect(rules.giveMaxDurationForMarketer(rf.TELEMARKETER)).toBe(3)
		expect(rules.giveMaxDurationForMarketer(rf.TV_ANNOUNCER)).toBe(4)
	})

	it("offers the matching pool slots", () => {
		freshGame(2, ["50"])
		expect(rules.possibleMarketingCampaigns([1, 2, 28, 29, 30, 31], rf.TELEMARKETER)).toEqual([30, 31])
		expect(rules.possibleMarketingCampaigns([1, 2, 28, 29, 30, 31], rf.TV_ANNOUNCER)).toEqual([28, 29, 30, 31])
		expect(rules.possibleMarketingCampaigns([1, 2, 28, 29, 30, 31], rf.BRAND_DIRECTOR)).toEqual([1, 2, 28, 29, 30, 31])
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
		// All campaign cards, ordered by the number printed on them: the six
		// phone cards (6.5-8.6) come before the higher-numbered billboards
		expect(store.context.campaigns).toEqual([30, 31, 32, 33, 34, 35, 11, 13, 14])
		expect(store.context.campaign).toBe(30)
		expect(store.context.duration).toBe(1)

		controller.chooseGood(1)
		controller.chooseDuration(2)
		controller.placeMarketingCampaign(mapMod.giveIndex(40, 39))

		// First token placed, second-token chain armed with the remaining
		// phone cards to choose from (default: the first one)
		expect(store.context.mediaLineSecondCall).toBe(true)
		expect(store.context.campaigns).toEqual([31, 32, 33, 34, 35])
		expect(store.context.campaign).toBe(31)
		expect(store.context.duration).toBe(2)
		expect(store.context.good).toBe(1)
		expect(store.campaigns).toHaveLength(1)
		expect(store.campaigns[0]).toMatchObject({ number: 30, good: 1, duration: 2, index: mapMod.giveIndex(40, 39) })
		expect(store.availableMarketingCampaigns).not.toContain(30)
		expect(store.players[0].employees).not.toContain(rf.TELEMARKETER)
		expect(store.players[0].marketers[0]).toEqual({ campaign: 30, marketer: rf.TELEMARKETER, nightShift: false })
		expect(store.players[0].milestones).toContain(rf.FIRST_TELEMARKETER_USED)

		// The player may spend a different numbered card on the second token
		controller.chooseCampaign(33)

		// Second token: same good and duration, hanging off the same telemarketer
		controller.placeMarketingCampaign(mapMod.giveIndex(40, 42))

		expect(store.context.mediaLineSecondCall).toBe(false)
		expect(store.campaigns).toHaveLength(2)
		expect(store.campaigns[1]).toMatchObject({ number: 33, good: 1, duration: 2 })
		expect(store.availableMarketingCampaigns).not.toContain(33)
		expect(store.players[0].marketers).toHaveLength(2)
		expect(store.players[0].marketers[1].marketer).toBe(rf.TELEMARKETER)
		expect(store.players[0].additionalCampaignArrayIndex).toBe(1)
	})

	it("can finish the action with a single token", () => {
		const store = phoneActionBoard()
		controller.selectMarketer(rf.TELEMARKETER, false)
		controller.chooseCampaign(30)
		controller.placeMarketingCampaign(mapMod.giveIndex(40, 39))
		expect(store.context.mediaLineSecondCall).toBe(true)
		controller.resetMarketingSelection()
		expect(store.campaigns).toHaveLength(1)
		expect(store.context.marketer).toBe(-1)
	})

	it("TV announcer placing a phone token does not chain a second one", () => {
		const store = phoneActionBoard()
		store.players[0].employees.push(rf.TV_ANNOUNCER)
		controller.selectMarketer(rf.TV_ANNOUNCER, false)
		controller.chooseCampaign(30)
		controller.chooseGood(1)
		controller.chooseDuration(2)
		controller.placeMarketingCampaign(mapMod.giveIndex(40, 39))

		// Only the telemarketer chains - the announcer's action is done
		expect(store.context.mediaLineSecondCall).toBe(false)
		expect(store.campaigns).toHaveLength(1)
		expect(store.campaigns[0]).toMatchObject({ number: 30, good: 1, duration: 2 })
		expect(store.players[0].marketers).toEqual([{ campaign: 30, marketer: rf.TV_ANNOUNCER, nightShift: false }])
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
		controller.chooseCampaign(28)
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

	it("an on-campaign TV announcer keeps his nightly headline", () => {
		const store = tvActionBoard()
		// The announcer has been moved from employees onto campaign duty
		store.players[0].employees = store.players[0].employees.filter((e) => e !== rf.TV_ANNOUNCER)
		store.players[0].marketers.push({ campaign: 28, marketer: rf.TV_ANNOUNCER, nightShift: false })

		expect(controller.mediaLineHeadlinesLeft(0)).toBe(1)
		controller.publishHeadline(5)
		expect(store.mediaLine.headlines).toHaveLength(1)
		expect(controller.mediaLineHeadlinesLeft(0)).toBe(0)
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
		controller.chooseCampaign(28)
		expect(controller.tvSelectionComplete()).toBe(false)
		for (const h of [7, 1, 4, 5]) controller.toggleTVHouseSelection(mapMod.findIndexForHouse(h))
		expect(controller.tvSelectionComplete()).toBe(true)
	})
})

describe("Media Line stage 4 - headline publication", () => {
	it("allows one headline per on-duty TV announcer, campaigns count as on duty", () => {
		const store = freshGame(2, ["50"])
		store.players[0].employees.push(rf.TV_ANNOUNCER)
		store.players[0].marketers.push({ campaign: 28, marketer: rf.TV_ANNOUNCER })
		expect(controller.mediaLineHeadlinesLeft(0)).toBe(2)
		controller.publishHeadline(5)
		expect(controller.mediaLineHeadlinesLeft(0)).toBe(1)
		controller.publishHeadline(-5)
		expect(controller.mediaLineHeadlinesLeft(0)).toBe(0)
		// No announcer free anymore - extra publications are ignored
		controller.publishHeadline(5)
		expect(store.mediaLine.headlines).toHaveLength(2)
		expect(store.mediaLine.headlines[0]).toEqual({ turn: store.gameflow.turn, playerIndex: 0, value: 5 })
		expect(store.history.some((h) => h[0] === rf.HIST_PUBLISH_HEADLINE)).toBe(true)
	})

	it("rejects publishing without the mod or with an invalid value", () => {
		const store = freshGame(2, [])
		store.players[0].employees.push(rf.TV_ANNOUNCER)
		controller.publishHeadline(5)
		expect(store.mediaLine.headlines).toHaveLength(0)
		const store2 = freshGame(2, ["50"])
		store2.players[0].employees.push(rf.TV_ANNOUNCER)
		controller.publishHeadline(3)
		controller.publishHeadline(0)
		expect(store2.mediaLine.headlines).toHaveLength(0)
	})

	it("applies only next turn and clamps the city total at +/-10", () => {
		const store = freshGame(2, ["50"])
		expect(rules.giveHeadlineTotal()).toBe(0)
		// Published this turn: not effective tonight
		store.mediaLine.headlines.push({ turn: store.gameflow.turn, playerIndex: 0, value: 5 })
		expect(rules.giveHeadlineTotal()).toBe(0)
		// Published last turn: effective, stacking up to the +10 clamp
		store.mediaLine.headlines.push({ turn: store.gameflow.turn - 1, playerIndex: 0, value: 5 })
		store.mediaLine.headlines.push({ turn: store.gameflow.turn - 1, playerIndex: 1, value: 5 })
		expect(rules.giveHeadlineTotal()).toBe(10)
		// And down to the -10 clamp
		store.mediaLine.headlines.splice(0)
		for (let i = 0; i < 4; i++) store.mediaLine.headlines.push({ turn: store.gameflow.turn - 1, playerIndex: 1, value: -5 })
		expect(rules.giveHeadlineTotal()).toBe(-10)
	})

	it("is inert without the mod", () => {
		const store = freshGame(2, [])
		store.mediaLine.headlines.push({ turn: store.gameflow.turn - 1, playerIndex: 0, value: 5 })
		expect(rules.giveHeadlineTotal()).toBe(0)
	})
})

describe("Media Line stage 4 - headline in dinner settlement", () => {
	function dinnerFreshGame() {
		setActivePinia(createPinia())
		const store = useModelStore()
		model.setInternalStartingOptions(["50"])
		store.mapData.tiles = mapMod.generateRandomMap(2)
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
			})
		}
		store.gameflow.turn = 3
		store.gameflow.fullTurnOrder = [0, 1]
		store.gameflow.turnOrder = [0, 1]
		store.availableMilestones = []
		return store
	}

	// Brute-force a restaurant placement with road access to a target house
	function tryPlaceRestaurantNear(store, playerIndex, centerIndex) {
		const colour = store.players[playerIndex].colour
		for (let dy = -4; dy <= 4; dy++) {
			for (let dx = -8; dx <= 8; dx++) {
				const index = centerIndex + dy * rf.ssW + dx
				if (index < 0 || index >= store.mapData.coords.length) continue
				for (let rotation = 0; rotation < 4; rotation++) {
					mapMod.addElement(rf.TYPE_RESTAURANT, colour, index, false)
					store.players[playerIndex].restaurants.push({ index, rotation, open: true })
					const distances = model.giveRestaurantRangesForHouse(store.houseUnderTest)
					if (distances[playerIndex] !== -99 && distances[playerIndex] !== undefined) return true
					store.players[playerIndex].restaurants.pop()
					mapMod.addElement(rf.TYPE_RESTAURANT, colour, index, false, true)
				}
			}
		}
		return false
	}

	function placeAndFeed(store) {
		let placed = false
		for (const h of rf.BOARD_HOUSES) {
			const idx = mapMod.findIndexForHouse(h)
			if (idx < 0) continue
			store.houseUnderTest = h
			placed = tryPlaceRestaurantNear(store, 0, idx)
			if (placed) break
		}
		expect(placed).toBe(true)
		store.players[0].resources = [rf.BURGER]
		store.needs.push({ number: store.houseUnderTest, needs: [[rf.BURGER, -1]] })
		return store.houseUnderTest
	}

	it("adds tonight's headline to the sale price", () => {
		const store = dinnerFreshGame()
		placeAndFeed(store)
		store.mediaLine.headlines.push({ turn: store.gameflow.turn - 1, playerIndex: 0, value: 5 })
		const moneyBefore = store.players[0].money
		rules.doDinnerTime(false)
		// 1 burger x (base 10 + headline +5); no gardens, parks or milestones
		expect(store.players[0].money - moneyBefore).toBe(15)
	})

	it("stamps the headline at the option-dependent index in the dinner history entry", () => {
		// fryChefs OFF (game #24 layout): [id, needs, winners, bonus, bits, headline]
		const store = dinnerFreshGame()
		placeAndFeed(store)
		store.mediaLine.headlines.push({ turn: store.gameflow.turn - 1, playerIndex: 0, value: 5 })
		rules.doDinnerTime(false)
		const houseOff = store.history.find((e) => e[0] === rf.HIST_DINNER_TIME)[3][0]
		expect(houseOff.length).toBe(6)
		expect(houseOff[5]).toBe(5) // headline sits at index 5 when fryChefs is off

		// fryChefs ON: chef count takes index 5, headline shifts to index 6
		const store2 = dinnerFreshGame()
		placeAndFeed(store2)
		store2.startingOptions.fryChefs = true
		store2.mediaLine.headlines.push({ turn: store2.gameflow.turn - 1, playerIndex: 0, value: 5 })
		rules.doDinnerTime(false)
		const houseOn = store2.history.find((e) => e[0] === rf.HIST_DINNER_TIME)[3][0]
		expect(houseOn.length).toBe(7)
		expect(houseOn[5]).toBe(0) // fry chef count (none used)
		expect(houseOn[6]).toBe(5) // headline sits at index 6 when fryChefs is on
	})

	it("an unsold house keeps its length-2 entry (headline stamps sold houses only)", () => {
		const store = dinnerFreshGame()
		placeAndFeed(store)
		// another board house demanding lemonade - player 0 only has burgers,
		// so nobody sells regardless of restaurant range (deterministic no-sale)
		let farHouse = -1
		for (const h of rf.BOARD_HOUSES) {
			if (h !== store.houseUnderTest && mapMod.findIndexForHouse(h) >= 0) {
				farHouse = h
				break
			}
		}
		expect(farHouse).toBeGreaterThan(-1)
		store.needs.push({ number: farHouse, needs: [[rf.LEMONADE, -1]] })
		store.mediaLine.headlines.push({ turn: store.gameflow.turn - 1, playerIndex: 0, value: 5 })
		rules.doDinnerTime(false)
		const houses = store.history.find((e) => e[0] === rf.HIST_DINNER_TIME)[3]
		const unsold = houses.find((hh) => hh[0] === farHouse)
		// no providers and no headline - length-2 no-sale entry
		expect(unsold.length).toBe(2)
	})

	it("without headlines the price stays at the menu price", () => {
		const store = dinnerFreshGame()
		placeAndFeed(store)
		const moneyBefore = store.players[0].money
		rules.doDinnerTime(false)
		expect(store.players[0].money - moneyBefore).toBe(10)
	})

	it("negative settlement prices are legal (money flows back)", () => {
		const store = dinnerFreshGame()
		placeAndFeed(store)
		store.players[0].employees.push(rf.PRICING_MANAGER, rf.PRICING_MANAGER) // menu 10 - 2 = 8
		store.mediaLine.headlines.push({ turn: store.gameflow.turn - 1, playerIndex: 1, value: -5 })
		store.mediaLine.headlines.push({ turn: store.gameflow.turn - 1, playerIndex: 1, value: -5 }) // city total -10
		const moneyBefore = store.players[0].money
		rules.doDinnerTime(false)
		expect(store.players[0].money - moneyBefore).toBe(-2)
	})
})

describe("Media Line stage 5 - serpentine campaign order", () => {
	it("maps B-line campaigns to decimal sort keys", () => {
		// A-line keys are the raw campaign numbers, untouched
		expect(rules.campaignSortKey(1)).toBe(1)
		expect(rules.campaignSortKey(7)).toBe(7)
		expect(rules.campaignSortKey(11)).toBe(11)
		// TV channels slot between radio and airplanes
		expect(rules.campaignSortKey(28)).toBe(3.5)
		expect(rules.campaignSortKey(29)).toBe(4.5)
		// Phone tokens pair up after radio 6/7/8: 6.5/6.6, 7.5/7.6, 8.5/8.6
		expect(rules.campaignSortKey(30)).toBe(6.5)
		expect(rules.campaignSortKey(31)).toBe(6.6)
		expect(rules.campaignSortKey(32)).toBe(7.5)
		expect(rules.campaignSortKey(33)).toBe(7.6)
		expect(rules.campaignSortKey(34)).toBe(8.5)
		expect(rules.campaignSortKey(35)).toBe(8.6)
	})

	it("interleaves B-line pushes into the A-line order", () => {
		const store = freshGame(2, ["50"])
		const coords = blankCoords()
		store.mapData.coords = coords
		const emptyIdx = coords.indexOf(rf.EMPTY_SPACE)
		const camp = (n) => ({ number: n, index: emptyIdx, rotated: false, good: rf.BURGER, duration: 9, houses: [] })
		store.campaigns.push(camp(11), camp(28), camp(4), camp(7), camp(30))
		rules.doMarketingCampaigns(false)
		const entry = store.history.find((h) => h[0] === rf.HIST_MARKETING_CAMPAIGN_PHASE)
		// radio(1-3) TV-A(3.5) plane(4) TV-B(4.5) ... phone(6.5) mailbox(7) ... billboard(11)
		expect(entry[3].map((e) => e[0])).toEqual([28, 4, 30, 7, 11])
	})
})

describe("Media Line stage 5 - milestone 1 grouped all-eat bonus", () => {
	// Real random map + brute-force restaurant placement (stadium test pattern).
	// A 4-player map carries enough board houses for the group tests.
	function nightBoard() {
		setActivePinia(createPinia())
		const store = useModelStore()
		model.setInternalStartingOptions(["50"])
		store.mapData.tiles = mapMod.generateRandomMap(4)
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
			})
		}
		store.gameflow.turn = 3
		store.gameflow.fullTurnOrder = [0, 1]
		store.gameflow.turnOrder = [0, 1]
		store.availableMilestones = []
		return store
	}

	function placeRestaurantNear(store, playerIndex, centerIndex) {
		const colour = store.players[playerIndex].colour
		for (let dy = -4; dy <= 4; dy++) {
			for (let dx = -8; dx <= 8; dx++) {
				const index = centerIndex + dy * rf.ssW + dx
				if (index < 0 || index >= store.mapData.coords.length) continue
				// Never overwrite existing map elements (roads/houses feed the
				// servability logic under test)
				if (store.mapData.coords[index] !== rf.EMPTY_SPACE || store.mapData.coords[index + 1] !== rf.EMPTY_SPACE || store.mapData.coords[index + rf.ssW] !== rf.EMPTY_SPACE || store.mapData.coords[index + rf.ssW + 1] !== rf.EMPTY_SPACE) continue
				for (let rotation = 0; rotation < 4; rotation++) {
					mapMod.addElement(rf.TYPE_RESTAURANT, colour, index, false)
					store.players[playerIndex].restaurants.push({ index, rotation, open: true })
					const distances = model.giveRestaurantRangesForHouse(store.houseUnderTest)
					if (distances[playerIndex] !== -99 && distances[playerIndex] !== undefined) return true
					store.players[playerIndex].restaurants.pop()
					mapMod.addElement(rf.TYPE_RESTAURANT, colour, index, false, true)
				}
			}
		}
		return false
	}

	function servableHouses(store) {
		const res = []
		for (const h of rf.BOARD_HOUSES) {
			if (mapMod.findIndexForHouse(h) < 0) continue
			store.houseUnderTest = h
			const d = model.giveRestaurantRangesForHouse(h)
			if (d[0] !== -99 && d[0] !== undefined) res.push(h)
		}
		return res
	}

	function placeFirstRestaurant(store) {
		for (const h of rf.BOARD_HOUSES) {
			const idx = mapMod.findIndexForHouse(h)
			if (idx < 0) continue
			store.houseUnderTest = h
			if (placeRestaurantNear(store, 0, idx)) return true
		}
		return false
	}

	// One restaurant rarely covers enough houses - keep adding restaurants
	// (brute-forced near still-unservable houses) until `count` are servable
	function ensureServable(store, count) {
		expect(placeFirstRestaurant(store)).toBe(true)
		for (let guard = 0; guard < 10 && servableHouses(store).length < count; guard++) {
			const servable = new Set(servableHouses(store))
			let placed = false
			for (const h of rf.BOARD_HOUSES) {
				if (servable.has(h)) continue
				const idx = mapMod.findIndexForHouse(h)
				if (idx < 0) continue
				store.houseUnderTest = h
				if (placeRestaurantNear(store, 0, idx)) {
					placed = true
					break
				}
			}
			if (!placed) break
		}
		return servableHouses(store)
	}

	it("pays $10 per house for a fully eaten TV group", () => {
		const store = nightBoard()
		const houses = ensureServable(store, 5).slice(0, 5)
		expect(houses).toHaveLength(5)

		model.addMarketingCampaign(28, -1, false, rf.BURGER, 9, houses)
		store.players[0].marketers.push({ campaign: 28, marketer: rf.TV_ANNOUNCER, nightShift: false })
		store.players[0].milestones.push(rf.FIRST_TELEMARKETER_USED)

		rules.doMarketingCampaigns(false)
		for (const h of houses) {
			expect(store.needs.find((n) => n.number === h).needs).toEqual([[rf.BURGER, 0]])
		}

		store.players[0].resources = Array(5).fill(rf.BURGER)
		const before = store.players[0].money
		rules.doDinnerTime(false)
		// 5 whole-house sales x $10 + all-eat bonus 5 houses x $10
		expect(store.players[0].money - before).toBe(100)
		const bonusEntry = store.history.find((h) => h[0] === rf.HIST_MEDIA_LINE_BONUS)
		expect(bonusEntry[3][0]).toBe(0)
		expect(bonusEntry[3][1]).toBe(50)
	})

	it("an own A-line campaign still running breaks purity (no bonus)", () => {
		const store = nightBoard()
		const houses = ensureServable(store, 5).slice(0, 5)
		expect(houses).toHaveLength(5)

		model.addMarketingCampaign(28, -1, false, rf.BURGER, 9, houses)
		store.players[0].marketers.push({ campaign: 28, marketer: rf.TV_ANNOUNCER, nightShift: false })
		store.players[0].milestones.push(rf.FIRST_TELEMARKETER_USED)

		// The holder also owns a lingering billboard campaign in open country:
		// billboards only reach houses touching the token, so this one pushes
		// nothing - purity is about owning a running A-line campaign at all.
		// Deterministic quiet spot: the empty cell farthest (Manhattan) from
		// every target house, with every other house touching the token
		// footprint stamped to EMPTY (houses are not roads, so target-house
		// servability computed above is unaffected on any random map).
		const targetIdx = houses.map((h) => mapMod.findIndexForHouse(h))
		let quiet = -1
		let bestDist = -1
		for (let i = 0; i < store.mapData.coords.length; i++) {
			if (store.mapData.coords[i] !== rf.EMPTY_SPACE) continue
			const [x, y] = mapMod.giveCoord(i)
			let d = Infinity
			for (const t of targetIdx) {
				const [tx, ty] = mapMod.giveCoord(t)
				d = Math.min(d, Math.abs(x - tx) + Math.abs(y - ty))
			}
			if (d > bestDist) {
				bestDist = d
				quiet = i
			}
		}
		expect(bestDist).toBeGreaterThanOrEqual(3)
		const stampHouses = (cells) => {
			for (const c of cells) {
				const v = store.mapData.coords[c]
				if (v > rf.HOUSE && v < rf.HOUSE + 29 && !targetIdx.includes(c)) store.mapData.coords[c] = rf.EMPTY_SPACE
			}
		}
		const footprint = mapMod.giveAllSpaceForAToken(quiet, 2, 1)
		stampHouses([...footprint, ...mapMod.neighbours(footprint)])
		store.campaigns.push({ number: 11, index: quiet, rotated: false, good: rf.PIZZA, duration: 9, houses: [] })
		store.players[0].marketers.push({ campaign: 11, marketer: -1, nightShift: false })

		rules.doMarketingCampaigns(false)
		for (const h of houses) {
			expect(store.needs.find((n) => n.number === h).needs).toEqual([[rf.BURGER, 0]])
		}
		store.players[0].resources = Array(5).fill(rf.BURGER)
		const before = store.players[0].money
		rules.doDinnerTime(false)
		// Sales only - purity broken by the own mailbox campaign
		expect(store.players[0].money - before).toBe(50)
		expect(store.history.some((h) => h[0] === rf.HIST_MEDIA_LINE_BONUS)).toBe(false)
	})

	it("an A-line campaign placed this turn (first push only tonight) breaks purity", () => {
		const store = nightBoard()
		const houses = ensureServable(store, 5).slice(0, 5)
		expect(houses).toHaveLength(5)

		model.addMarketingCampaign(28, -1, false, rf.BURGER, 9, houses)
		store.players[0].marketers.push({ campaign: 28, marketer: rf.TV_ANNOUNCER, nightShift: false })
		store.players[0].milestones.push(rf.FIRST_TELEMARKETER_USED)

		rules.doMarketingCampaigns(false) // B-line fires, groups armed
		// The holder now launches an A-line campaign for the coming night: it is
		// on the board at settlement but has not pushed anything yet
		store.campaigns.push({ number: 5, index: -1, rotated: false, good: rf.PIZZA, duration: 4, houses: [] })
		store.players[0].marketers.push({ campaign: 5, marketer: -1, nightShift: false })

		store.players[0].resources = Array(5).fill(rf.BURGER)
		const before = store.players[0].money
		rules.doDinnerTime(false)
		// Sales only - purity broken by the freshly placed A-line campaign
		expect(store.players[0].money - before).toBe(50)
		expect(store.history.some((h) => h[0] === rf.HIST_MEDIA_LINE_BONUS)).toBe(false)
	})

	it("a stolen house zeroes its group only, other groups still pay", () => {
		const store = nightBoard()
		const houses = ensureServable(store, 7)
		expect(houses.length).toBeGreaterThanOrEqual(7)
		const stolenFrom = houses.slice(0, 5)
		const kept = houses.slice(5, 7)

		// Rival: right next to the first target house, menu $5 (5 pricing managers)
		store.houseUnderTest = stolenFrom[0]
		expect(placeRestaurantNear(store, 1, mapMod.findIndexForHouse(stolenFrom[0]))).toBe(true)
		store.houseUnderTest = stolenFrom[0]
		const d = model.giveRestaurantRangesForHouse(stolenFrom[0])
		expect(d[1]).not.toBe(-99)
		store.players[1].employees.push(rf.PRICING_MANAGER, rf.PRICING_MANAGER, rf.PRICING_MANAGER, rf.PRICING_MANAGER, rf.PRICING_MANAGER)
		store.players[1].resources = [rf.BURGER] // wins exactly one house

		model.addMarketingCampaign(28, -1, false, rf.BURGER, 9, stolenFrom)
		model.addMarketingCampaign(29, -1, false, rf.BURGER, 9, kept)
		store.players[0].marketers.push({ campaign: 28, marketer: rf.TV_ANNOUNCER, nightShift: false }, { campaign: 29, marketer: rf.TV_ANNOUNCER, nightShift: false })
		store.players[0].milestones.push(rf.FIRST_TELEMARKETER_USED)

		rules.doMarketingCampaigns(false)
		store.players[0].resources = Array(6).fill(rf.BURGER)
		const before0 = store.players[0].money
		const before1 = store.players[1].money
		rules.doDinnerTime(false)
		// P1 steals one house of group 28 ($5 sale); P0 sells the other 6 houses
		// and group 29 (2 houses) still pays 2 x $10
		expect(store.players[1].money - before1).toBe(5)
		expect(store.players[0].money - before0).toBe(6 * 10 + 20)
		const bonusEntry = store.history.find((h) => h[0] === rf.HIST_MEDIA_LINE_BONUS)
		expect(bonusEntry[3][1]).toBe(20)
	})

	it("houses squeezed out by the 3-card cap are not group members", () => {
		const store = nightBoard()
		const houses = ensureServable(store, 5).slice(0, 5)
		expect(houses).toHaveLength(5)

		// First target house is already full (3 cards, no garden)
		store.needs.push({ number: houses[0], needs: [[rf.PIZZA, -1], [rf.PIZZA, -1], [rf.PIZZA, -1]] })

		model.addMarketingCampaign(28, -1, false, rf.BURGER, 9, houses)
		store.players[0].marketers.push({ campaign: 28, marketer: rf.TV_ANNOUNCER, nightShift: false })
		store.players[0].milestones.push(rf.FIRST_TELEMARKETER_USED)

		rules.doMarketingCampaigns(false)
		// The full house got no card from the campaign
		expect(store.needs.find((n) => n.number === houses[0]).needs.every((sub) => sub[0] === rf.PIZZA)).toBe(true)

		store.players[0].resources = Array(4).fill(rf.BURGER)
		const before = store.players[0].money
		rules.doDinnerTime(false)
		// 4 sales x $10 + bonus for the 4 members x $10 (full house not a member,
		// its unsold pizzas don't hurt the group)
		expect(store.players[0].money - before).toBe(80)
		const bonusEntry = store.history.find((h) => h[0] === rf.HIST_MEDIA_LINE_BONUS)
		expect(bonusEntry[3][1]).toBe(40)
	})

	it("a page reload between payday and dinner keeps the pending bonus (night is saved state)", () => {
		// Fixed map so the reload rebuilds the exact same board (importFCMmodel
		// regenerates the map from initData.startingMap, not from gameData)
		const TEST_MAP = []
		for (let i = 0; i < 16; i++) TEST_MAP.push(i, 0)

		const store = nightBoard()
		store.mapData.tiles = mapMod.expandMapToFullGrid(TEST_MAP, 4)
		mapMod.initCoords()
		const houses = ensureServable(store, 5).slice(0, 5)
		expect(houses).toHaveLength(5)

		model.addMarketingCampaign(28, -1, false, rf.BURGER, 9, houses)
		store.players[0].marketers.push({ campaign: 28, marketer: rf.TV_ANNOUNCER, nightShift: false })
		store.players[0].milestones.push(rf.FIRST_TELEMARKETER_USED)

		rules.doMarketingCampaigns(false)
		expect(store.mediaLine.night.groups[28]).toMatchObject({ owner: 0, houses: expect.arrayContaining(houses) })

		// Simulate the reload: round-trip the full state through the wire format
		// (this is exactly what a Ctrl+F5 does - fresh module state, saved game data)
		const b64 = funcs.exportFCMmodel(false, false)
		const decoded = JSON.parse(pako.ungzip(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), { to: "string" }))
		expect(decoded[decoded.length - 1].night.groups["28"]).toMatchObject({ owner: 0 })

		setActivePinia(createPinia())
		const re = useModelStore()
		globalThis.window.initData = { startingOptions: ["50"], startingMap: TEST_MAP, playerNames: ["P0", "P1", "P2", "P3"] }
		const encoded = btoa(String.fromCharCode(...new Uint8Array(pako.gzip(JSON.stringify(decoded)))))
		expect(funcs.importFCMmodel(encoded, false, false)).not.toBe(-9999)
		expect(re.mediaLine.night.groups[28]).toMatchObject({ owner: 0, houses: expect.arrayContaining(houses) })

		re.players[0].resources = Array(5).fill(rf.BURGER)
		const before = re.players[0].money
		rules.doDinnerTime(false)
		// 5 sales x $10 + all-eat bonus 5 houses x $10 - still paid after the reload
		expect(re.players[0].money - before).toBe(100)
		const bonusEntry = re.history.find((h) => h[0] === rf.HIST_MEDIA_LINE_BONUS)
		expect(bonusEntry[3][1]).toBe(50)
	})
})

describe("Media Line stage 5 - milestone 2 first-campaign double", () => {
	function tvBoard() {
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

	it("latches on the holder's first TV placement and never again", () => {
		const store = tvBoard()
		controller.selectMarketer(rf.TV_ANNOUNCER, false)
		controller.chooseCampaign(28)
		for (const h of [7, 1, 5, 2, 4]) controller.toggleTVHouseSelection(mapMod.findIndexForHouse(h))
		controller.chooseGood(2)
		controller.chooseDuration(3)
		controller.placeMarketingCampaign(0)

		expect(store.mediaLine.doubleCampaign).toBe(28)
		expect(store.mediaLine.doubleUsed).toBe(true)
		expect(store.players[0].milestones).toContain(rf.FIRST_TV_ANNOUNCER_USED)

		// A second channel placement by the same holder does not re-latch
		store.players[0].employees.push(rf.TV_ANNOUNCER)
		controller.selectMarketer(rf.TV_ANNOUNCER, false)
		controller.chooseCampaign(28)
		for (const h of [7, 1, 5, 2, 4]) controller.toggleTVHouseSelection(mapMod.findIndexForHouse(h))
		controller.chooseGood(2)
		controller.chooseDuration(3)
		controller.placeMarketingCampaign(0)

		expect(store.mediaLine.doubleCampaign).toBe(28)
		expect(store.campaigns).toHaveLength(2)
	})

	it("pushes two cards per house while latched, then frees the slot at expiry", () => {
		const store = tvBoard()
		model.addMarketingCampaign(28, -1, false, rf.BURGER, 1, [7, 1, 5, 2, 4])
		store.players[0].marketers.push({ campaign: 28, marketer: rf.TV_ANNOUNCER, nightShift: false })
		store.mediaLine.doubleCampaign = 28
		store.mediaLine.doubleUsed = true

		rules.doMarketingCampaigns(false)
		for (const h of [7, 1, 5, 2, 4]) {
			expect(store.needs.find((n) => n.number === h).needs).toEqual([
				[rf.BURGER, 0],
				[rf.BURGER, 0],
			])
		}
		// Duration 1: the campaign expired, the slot is freed, the latch stays
		expect(store.campaigns).toHaveLength(0)
		expect(store.mediaLine.doubleCampaign).toBe(-1)
		expect(store.mediaLine.doubleUsed).toBe(true)
	})

	it("unlatched TV campaigns push a single card per house", () => {
		const store = tvBoard()
		model.addMarketingCampaign(29, -1, false, rf.BURGER, 9, [7, 1, 5])
		store.players[0].marketers.push({ campaign: 29, marketer: rf.TV_ANNOUNCER, nightShift: false })
		rules.doMarketingCampaigns(false)
		for (const h of [7, 1, 5]) {
			expect(store.needs.find((n) => n.number === h).needs).toEqual([[rf.BURGER, 0]])
		}
	})
})

describe("Media Line stage 6 - save / load round trip", () => {
	const STARTING_MAP = [17, 0, 4, 0, 19, 3, 18, 0, 12, 2, 24, 2, 9, 0, 0, 2, 13, 2]

	function seedMLGame(opts = ["50"]) {
		setActivePinia(createPinia())
		const store = useModelStore()
		model.setInternalStartingOptions(opts)
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
		store.availableMarketingCampaigns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]
		model.setupKetchupExpansion(2)
		store.reserveCards = []
		store.bank = 0
		store.bankBroken = 0
		return store
	}

	function decodeExport(b64) {
		return JSON.parse(pako.ungzip(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), { to: "string" }))
	}
	function encodeArr(arr) {
		return btoa(String.fromCharCode(...new Uint8Array(pako.gzip(JSON.stringify(arr)))))
	}
	function importInto(decoded, opts = ["50"], forGameOver = false) {
		globalThis.window.initData = { startingOptions: opts, startingMap: STARTING_MAP, playerNames: ["P0", "P1"] }
		const store = seedMLGame(opts)
		const result = funcs.importFCMmodel(encodeArr(decoded), forGameOver, false)
		expect(result).not.toBe(-9999)
		return store
	}

	it("exportFCMmodel keeps TV houses, phone tokens and the media line state", () => {
		const store = seedMLGame()
		const phoneIdx = mapMod.giveIndex(40, 39)
		model.addMarketingCampaign(28, -1, false, rf.BURGER, 3, [7, 1, 5])
		model.addMarketingCampaign(30, phoneIdx, true, rf.PIZZA, 2)
		store.players[0].marketers.push({ campaign: 28, marketer: rf.TV_ANNOUNCER, nightShift: false })
		store.players[0].marketers.push({ campaign: 30, marketer: rf.TELEMARKETER, nightShift: false })
		store.mediaLine.headlines.push({ turn: 4, playerIndex: 0, value: 5 }, { turn: 4, playerIndex: 1, value: -5 })
		store.mediaLine.doubleCampaign = 28
		store.mediaLine.doubleUsed = true

		const decoded = decodeExport(funcs.exportFCMmodel(false, false))
		expect(decoded[decoded.length - 1].headlines).toHaveLength(2)

		const restored = importInto(decoded)
		const tv = restored.campaigns.find((c) => c.number === 28)
		expect(tv).toMatchObject({ index: -1, rotated: false, good: rf.BURGER, duration: 3, houses: [7, 1, 5] })
		const phone = restored.campaigns.find((c) => c.number === 30)
		expect(phone.index).toBe(phoneIdx)
		expect(phone.rotated).toBe(true)
		expect(phone.good).toBe(rf.PIZZA)
		expect(phone.duration).toBe(2)
		expect(restored.mediaLine.headlines).toEqual([
			{ turn: 4, playerIndex: 0, value: 5 },
			{ turn: 4, playerIndex: 1, value: -5 },
		])
		expect(restored.mediaLine.doubleCampaign).toBe(28)
		expect(restored.mediaLine.doubleUsed).toBe(true)
	})

	it("loads an older save without the media line slot using safe defaults", () => {
		const store = seedMLGame()
		store.mediaLine.headlines.push({ turn: 4, playerIndex: 0, value: 5 })
		store.mediaLine.doubleCampaign = 28
		store.mediaLine.doubleUsed = true

		const decoded = decodeExport(funcs.exportFCMmodel(false, false))
		decoded.pop() // strip the media line slot: pre-module save shape

		const restored = importInto(decoded)
		expect(restored.mediaLine.headlines).toEqual([])
		expect(restored.mediaLine.doubleCampaign).toBe(-1)
		expect(restored.mediaLine.doubleUsed).toBe(false)
	})

	it("omits the slot when the module was not chosen", () => {
		seedMLGame([])
		const decoded = decodeExport(funcs.exportFCMmodel(false, false))
		expect(decoded[decoded.length - 1].headlines).toBeUndefined()
	})

	it("round-trips through the in-memory simple snapshot", () => {
		const store = seedMLGame()
		model.addMarketingCampaign(28, -1, false, rf.BURGER, 3, [7, 1])
		store.mediaLine.headlines.push({ turn: 4, playerIndex: 1, value: -5 })
		store.mediaLine.doubleCampaign = 28
		store.mediaLine.doubleUsed = true
		const b64 = funcs.simpleExportWholeFCMmodel()

		seedMLGame()
		funcs.simpleImportWholeFCMmodel(b64)
		const restored = useModelStore()
		expect(restored.campaigns.find((c) => c.number === 28)).toMatchObject({ index: -1, duration: 3, houses: [7, 1] })
		expect(restored.mediaLine.headlines).toEqual([{ turn: 4, playerIndex: 1, value: -5 }])
		expect(restored.mediaLine.doubleCampaign).toBe(28)
		expect(restored.mediaLine.doubleUsed).toBe(true)
	})
})

describe("Media Line stage 6 - replay", () => {
	it("replays a TV placement: houses, announcer ownership and the milestone 2 lookahead latch", () => {
		const store = freshGame(2, ["50"])
		store.players[0].employees.push(rf.TV_ANNOUNCER)
		// A benign earlier entry (the handler reads the previous entry for the
		// mailbox MS), then the live order: campaign entry, milestone entry
		store.history.push([rf.HIST_HIRE, 0, 999, [1]])
		store.history.push([rf.HIST_START_MARKETING_CAMPAIGN, 0, 1000, [28, [7, 1, 5], rf.BURGER, 3]])
		store.history.push([rf.HIST_NEW_MILESTONE, 0, 1001, [rf.FIRST_TV_ANNOUNCER_USED]])

		replay.replayStartMarketingCampaign(1, 0, [28, [7, 1, 5], rf.BURGER, 3])

		expect(store.campaigns[0]).toMatchObject({ number: 28, index: -1, good: rf.BURGER, duration: 3, houses: [7, 1, 5] })
		expect(store.players[0].employees).toEqual([]) // announcer moved to the market
		expect(store.players[0].marketers).toEqual([{ campaign: 28, marketer: rf.TV_ANNOUNCER, nightShift: false }])
		// The milestone is not replayed yet - the latch comes from the lookahead
		expect(store.mediaLine.doubleCampaign).toBe(28)
		expect(store.mediaLine.doubleUsed).toBe(true)
	})

	it("replays a phone placement and chains the second token to the same telemarketer", () => {
		const store = freshGame(2, ["50"])
		store.players[0].employees.push(rf.TELEMARKETER)
		store.history.push([rf.HIST_HIRE, 0, 999, [1]])
		const phoneIdx = mapMod.giveIndex(40, 39)
		const wireIdx = funcs.exportIndex(phoneIdx)

		replay.replayStartMarketingCampaign(1, 0, [30, wireIdx, rf.BURGER, 1, 2])
		expect(store.campaigns[0]).toMatchObject({ number: 30, index: phoneIdx, rotated: true, good: rf.BURGER, duration: 2 })
		expect(store.players[0].marketers).toEqual([{ campaign: 30, marketer: rf.TELEMARKETER, nightShift: false }])

		replay.replayStartMarketingCampaign(1, 0, [31, wireIdx, rf.BURGER, 0, 2])
		expect(store.players[0].marketers).toHaveLength(2)
		// Live addCampaignToMarketer does not set nightShift on the extra entry
		expect(store.players[0].marketers[1]).toEqual({ campaign: 31, marketer: rf.TELEMARKETER })
		expect(store.campaigns[1]).toMatchObject({ number: 31, index: phoneIdx, rotated: false })
	})

	it("replays a published headline onto the current replay turn", () => {
		const store = freshGame(2, ["50"])
		store.gameflow.turn = 4
		replay.replayPublishHeadline(0, 1, [5])
		expect(store.mediaLine.headlines).toEqual([{ turn: 4, playerIndex: 1, value: 5 }])
	})
})
