import { createRequire } from "node:module"
import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import * as rf from "./INDreference"
import { buildBgStatsUrl } from "./IND_bgStats"
import { useModelStore } from "../stores/INDstore.js"
import { usePersonalStore } from "../stores/INDpersonal.js"

// The shared builder ships as a plain script the show templates load; install
// it here the way a browser would.
globalThis.window = globalThis
globalThis.OBGBgStats = createRequire(import.meta.url)("../../../../Lobby/static/Lobby/common/bgStats.js")

function makePlayer(index, overrides = {}) {
	return {
		name: `user${index}`,
		displayName: `Player ${index}`,
		colour: index,
		moneyCash: 0,
		moneyBank: 0,
		...overrides,
	}
}

// history [2] is an offset from the game creation; the standings are [playerIndex, score] best first.
function finish(standings, players) {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.gameID = 4242
	personal.gameCreationTimestamp = 1700000000
	store.players.splice(0, store.players.length, ...players)
	store.history.push([rf.HIST_GAME_END, -1, 1234, standings])
}

function decode(url) {
	expect(url.startsWith("https://app.bgstatsapp.com/createPlay.html?data=")).toBe(true)
	return JSON.parse(new URL(url).searchParams.get("data"))
}

beforeEach(() => {
	setActivePinia(createPinia())
})

describe("buildBgStatsUrl", () => {
	it("identifies the site, the play and Indonesia on BGG", () => {
		finish(
			[
				[0, 100],
				[1, 50],
			],
			[makePlayer(0), makePlayer(1)]
		)

		const play = decode(buildBgStatsUrl())

		expect(play.sourceName).toBe("OnlineBoardGamers.com")
		expect(play.sourcePlayId).toBe("4242")
		// UTC: BG Stats wants "yyyy-MM-dd HH:mm:ss"
		expect(play.playDate).toBe("2023-11-14 22:33:54")
		expect(play.game).toEqual({
			name: "Indonesia",
			sourceGameId: "IND",
			bggId: 19777,
			highestWins: true,
			noPoints: false,
		})
	})

	it("sends every field BG Stats for Android rejects a play without", () => {
		finish(
			[
				[0, 100],
				[1, 50],
			],
			[makePlayer(0), makePlayer(1)]
		)

		const play = decode(buildBgStatsUrl())

		for (const key of ["noPoints", "highestWins"]) expect(play.game).toHaveProperty(key)
		for (const player of play.players) {
			for (const key of ["name", "sourcePlayerId", "startPlayer", "winner"]) expect(player).toHaveProperty(key)
		}
	})

	it("records final scores, finishing order and a single winner", () => {
		finish(
			[
				[1, 200],
				[0, 120],
			],
			[makePlayer(0), makePlayer(1)]
		)

		const play = decode(buildBgStatsUrl())

		expect(play.players).toEqual([
			{ name: "user1", sourcePlayerId: "user1", score: 200, rank: 1, winner: true, startPlayer: false },
			{ name: "user0", sourcePlayerId: "user0", score: 120, rank: 2, winner: false, startPlayer: false },
		])
	})

	it("reads the single-index bot win as one winner", () => {
		finish([0], [makePlayer(0, { moneyCash: 90, moneyBank: 30 }), makePlayer(1, { displayName: rf.BOT_NAME })])

		const play = decode(buildBgStatsUrl())

		expect(play.players).toEqual([{ name: "user0", sourcePlayerId: "user0", score: 120, rank: 1, winner: true, startPlayer: false }])
	})

	it("drops bots and re-ranks the humans left", () => {
		finish(
			[
				[2, 300],
				[0, 200],
				[1, 100],
			],
			[makePlayer(0), makePlayer(1), makePlayer(2, { displayName: rf.BOT_NAME })]
		)

		const play = decode(buildBgStatsUrl())

		expect(play.players.map((player) => player.name)).toEqual(["user0", "user1"])
		expect(play.players.map((player) => player.rank)).toEqual([1, 2])
		expect(play.players[0].winner).toBe(true)
	})

	it("returns nothing when only bots sat at the table", () => {
		finish([[0, 100]], [makePlayer(0, { displayName: rf.BOT_NAME })])

		expect(buildBgStatsUrl()).toBeUndefined()
	})
})
