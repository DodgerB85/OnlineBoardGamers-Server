import { createRequire } from "node:module"
import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import * as rf from "./FCMreference"
import { buildBgStatsUrl } from "./FCM_bgStats"
import { useModelStore } from "../stores/FCMstore.js"
import { usePersonalStore } from "../stores/FCMpersonal.js"

// The shared builder ships as a plain script the show templates load; install
// it here the way a browser would.
globalThis.window = globalThis
globalThis.OBGBgStats = createRequire(import.meta.url)("../../../../Lobby/static/Lobby/common/bgStats.js")

function makePlayer(index, overrides = {}) {
	return {
		name: `user${index}`,
		displayName: `Player ${index}`,
		colour: index,
		money: 0,
		...overrides,
	}
}

// fullTurnOrder is the finishing order, winner at index 0.
function finish(fullTurnOrder, players) {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.gameID = 4242
	store.players.splice(0, store.players.length, ...players)
	store.gameflow.fullTurnOrder = fullTurnOrder
	// [2] is an absolute epoch in seconds.
	store.history.push([rf.HIST_END_GAME, -1, 1700001234, []])
}

function decode(url) {
	expect(url.startsWith("https://app.bgstatsapp.com/createPlay.html?data=")).toBe(true)
	return JSON.parse(new URL(url).searchParams.get("data"))
}

beforeEach(() => {
	setActivePinia(createPinia())
})

describe("buildBgStatsUrl", () => {
	it("identifies the site, the play and Food Chain Magnate on BGG", () => {
		finish([0, 1], [makePlayer(0), makePlayer(1)])

		const play = decode(buildBgStatsUrl())

		expect(play.sourceName).toBe("OnlineBoardGamers.com")
		expect(play.sourcePlayId).toBe("4242")
		// UTC: BG Stats wants "yyyy-MM-dd HH:mm:ss"
		expect(play.playDate).toBe("2023-11-14 22:33:54")
		expect(play.game).toEqual({
			name: "Food Chain Magnate",
			sourceGameId: "FCM",
			bggId: 175914,
			highestWins: true,
			noPoints: false,
		})
	})

	it("sends every field BG Stats for Android rejects a play without", () => {
		finish([0, 1], [makePlayer(0), makePlayer(1)])

		const play = decode(buildBgStatsUrl())

		for (const key of ["noPoints", "highestWins"]) expect(play.game).toHaveProperty(key)
		for (const player of play.players) {
			for (const key of ["name", "sourcePlayerId", "startPlayer", "winner"]) expect(player).toHaveProperty(key)
		}
	})

	it("records final money, finishing order and a single winner", () => {
		finish([1, 0], [makePlayer(0, { money: 40 }), makePlayer(1, { money: 100 })])

		const play = decode(buildBgStatsUrl())

		expect(play.players).toEqual([
			{ name: "user1", sourcePlayerId: "user1", score: 100, rank: 1, winner: true, startPlayer: false },
			{ name: "user0", sourcePlayerId: "user0", score: 40, rank: 2, winner: false, startPlayer: false },
		])
	})

	it("drops bots and re-ranks the humans left", () => {
		finish([2, 0, 1], [makePlayer(0, { money: 50 }), makePlayer(1, { money: 10 }), makePlayer(2, { money: 999, displayName: rf.BOT_NAME })])

		const play = decode(buildBgStatsUrl())

		expect(play.players.map((player) => player.name)).toEqual(["user0", "user1"])
		expect(play.players.map((player) => player.rank)).toEqual([1, 2])
		expect(play.players[0].winner).toBe(true)
		expect(play.players[0].score).toBe(50)
	})

	it("returns nothing when only bots sat at the table", () => {
		finish([0], [makePlayer(0, { displayName: rf.BOT_NAME })])

		expect(buildBgStatsUrl()).toBeUndefined()
	})
})
