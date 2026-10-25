import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import * as rf from "./TGZreference"
import * as model from "./TGZmodel"
import { useModelStore } from "../stores/TGZstore.js"
import { usePersonalStore } from "../stores/TGZpersonal.js"

function makePlayer(index = 0) {
	return {
		name: `p${index}`,
		displayName: `P${index}`,
		colour: index,
		cows: 10,
		monuments: [],
		craftsmen: [],
		craftsmenPrices: [0, 0, 0, 0, 0, 0, 0, 0],
		god: [[rf.NO_god, 0]],
		specialists: [],
		techs: [],
		maxVR: 20,
	}
}

function setup(...players) {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.gameCreationTimestamp = 0
	personal.name = "p0"
	store.players.splice(0, store.players.length, ...players)
	store.gameflow.turn = 1
	store.gameflow.phase = rf.PHASE_BUILD
	store.gameflow.turnOrder.splice(0, store.gameflow.turnOrder.length, 0)
	store.gameflow.fullTurnOrder.splice(0, store.gameflow.fullTurnOrder.length, ...players.map((_, i) => i))
	return { store, personal }
}

beforeEach(() => {
	setActivePinia(createPinia())
})

describe("TGZ VR", () => {
	it("starts at 20 and applies god and specialist modifiers", () => {
		const player = makePlayer()
		player.god = [[rf.OBATALA, 0]]
		player.specialists.push([rf.SHAMAN, 0])
		setup(player)
		expect(model.getVR(player)).toBe(30)
	})

	it("applies Xango -2 and Alajire +5", () => {
		const xangoPlayer = makePlayer(0)
		xangoPlayer.god = [[rf.XANGO, 0]]
		const alajirePlayer = makePlayer(1)
		alajirePlayer.god = [[rf.ALAJIRE, 0]]
		const other = makePlayer(2)
		setup(xangoPlayer, alajirePlayer, other)

		expect(model.getVR(xangoPlayer)).toBe(23)
		expect(model.getVR(alajirePlayer)).toBe(22)
		expect(model.getVR(other)).toBe(25)
	})

	it("allows a 42-VR Alajire player to take Xango because the recalculated VR is 40", () => {
		const alajirePlayer = makePlayer(0)
		alajirePlayer.god = [[rf.ALAJIRE, 0]]
		const player = makePlayer(1)
		player.specialists.push([rf.SHAMAN, 0], [rf.SHAMAN, 0])
		player.techs.push(
			[rf.DIAMOND_CUTTER_TECH_A, 0],
			[rf.DIAMOND_CUTTER_TECH_A, 0],
			[rf.DIAMOND_CUTTER_TECH_A, 0],
			[rf.IVORY_CARVER_TECH_A, 0],
			[rf.POTTER_TECH_A, 0],
			[rf.WOOD_CARVER_TECH_A, 0]
		)
		setup(alajirePlayer, player)

		expect(model.getVR(player, true)).toBe(42)
		expect(model.getVR(player, true, rf.XANGO)).toBe(40)
	})

	it("applies Gu's one-VR technology rule when Gu is the candidate", () => {
		const player = makePlayer()
		player.techs.push([rf.DIAMOND_CUTTER_TECH_A, 0], [rf.POTTER_TECH_A, 0])
		setup(player)
		expect(model.getVR(player, true, rf.GU)).toBe(26)
	})
})

describe("TGZ scoring", () => {
	it("uses the monument chart", () => {
		const player = makePlayer()
		player.monuments.push([10, 4])
		setup(player)
		expect(model.getScore(0)).toBe(13)
	})

	it("splits Yemoja upgrades between the owner and Yemoja", () => {
		const owner = makePlayer(0)
		owner.monuments.push([10, 4])
		const yemoja = makePlayer(1)
		yemoja.god = [[rf.YEMOJA, 0]]
		const { store } = setup(owner, yemoja)
		store.history.push([rf.HIST_RAISE_MON, 1, 0, [[10, 3]]])

		expect(model.getScore(0)).toBe(9)
		expect(model.getScore(1)).toBe(4)
	})
})

describe("Anyanwu", () => {
	it("offers only the player's level 1 and 2 monuments", () => {
		const player = makePlayer()
		player.monuments.push([10, 1], [11, 2], [12, 3])
		const { store } = setup(player)
		store.availablegods.push(rf.ANYANWU)

		model.setgod(rf.ANYANWU)

		expect(store.context.action).toBe(rf.ACT_CHOOSE_ANYANWU_MON)
		expect(store.context.canSelectRaiseMonument).toEqual([10, 11])
	})
})
