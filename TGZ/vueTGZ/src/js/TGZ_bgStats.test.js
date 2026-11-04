import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import * as rf from "./TGZreference"
import { buildBgStatsUrl } from "./TGZ_bgStats"
import { useModelStore } from "../stores/TGZstore.js"
import { usePersonalStore } from "../stores/TGZpersonal.js"

function makePlayer(index, overrides = {}) {
	return {
		name: `user${index}`,
		displayName: `Player ${index}`,
		colour: index,
		cows: 10,
		monuments: [],
		craftsmen: [],
		craftsmenPrices: [0, 0, 0, 0, 0, 0, 0, 0],
		god: [[rf.NO_god, 0]],
		specialists: [],
		techs: [],
		maxVR: 20,
		...overrides,
	}
}

// standings entries are [overshoot, playerIndex, tieBreakCode], best first.
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
	it("identifies the site, the play and The Great Zimbabwe on BGG", () => {
		finish(
			[
				[10, 0, 1],
				[5, 1, 1],
			],
			[makePlayer(0), makePlayer(1)]
		)

		const play = decode(buildBgStatsUrl())

		expect(play.sourceName).toBe("OnlineBoardGamers.com")
		expect(play.sourcePlayId).toBe("4242")
		// UTC: BG Stats wants "yyyy-MM-dd HH:mm:ss"
		expect(play.playDate).toBe("2023-11-14 22:33:54")
		expect(play.game).toEqual({
			name: "The Great Zimbabwe",
			sourceGameId: "TGZ",
			bggId: 111341,
			highestWins: true,
			noPoints: false,
		})
	})

	it("sends every field BG Stats for Android rejects a play without", () => {
		finish(
			[
				[10, 0, 1],
				[5, 1, 1],
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
				[10, 0, 1],
				[5, 1, 1],
			],
			[makePlayer(0, { monuments: [[0, 5]] }), makePlayer(1, { monuments: [[0, 2]] })]
		)

		const play = decode(buildBgStatsUrl())

		expect(play.players).toEqual([
			{ name: "user0", sourcePlayerId: "user0", score: 21, rank: 1, winner: true, startPlayer: false },
			{ name: "user1", sourcePlayerId: "user1", score: 3, rank: 2, winner: false, startPlayer: false },
		])
	})

	it("drops bots and re-ranks the humans left", () => {
		finish(
			[
				[10, 2, 1],
				[5, 0, 1],
				[1, 1, 1],
			],
			[makePlayer(0), makePlayer(1), makePlayer(2, { displayName: rf.BOT_NAME })]
		)

		const play = decode(buildBgStatsUrl())

		expect(play.players.map((player) => player.name)).toEqual(["user0", "user1"])
		expect(play.players.map((player) => player.rank)).toEqual([1, 2])
		expect(play.players[0].winner).toBe(true)
	})

	it("returns nothing when only bots sat at the table", () => {
		finish([[10, 0, 1]], [makePlayer(0, { displayName: rf.BOT_NAME })])

		expect(buildBgStatsUrl()).toBeUndefined()
	})
})
