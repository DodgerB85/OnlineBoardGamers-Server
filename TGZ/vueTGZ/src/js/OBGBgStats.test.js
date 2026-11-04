import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"

// The shared builder ships as a plain script the show templates load; install
// it here the way a browser would.
globalThis.window = globalThis
const OBGBgStats = createRequire(import.meta.url)("../../../../Lobby/static/Lobby/common/bgStats.js")

function decode(url) {
	expect(url.startsWith("https://app.bgstatsapp.com/createPlay.html?data=")).toBe(true)
	return JSON.parse(new URL(url).searchParams.get("data"))
}

const BASE = {
	title: "The Great Zimbabwe",
	sourceGameId: "TGZ",
	sourcePlayId: 4242,
	playDate: Date.UTC(2026, 10, 4, 21, 30, 0),
	groups: [
		[{ name: "alice", score: 30 }],
		[{ name: "bob", score: 20 }],
	],
}

describe("OBGBgStats.buildUrl", () => {
	it("sends every field BG Stats for Android rejects a play without", () => {
		const play = decode(OBGBgStats.buildUrl(BASE))

		expect(play.sourceName).toBe("OnlineBoardGamers.com")
		expect(play.sourcePlayId).toBe("4242")
		// UTC, "yyyy-MM-dd HH:mm:ss"
		expect(play.playDate).toBe("2026-11-04 21:30:00")
		for (const key of ["noPoints", "highestWins"]) expect(play.game).toHaveProperty(key)
		for (const player of play.players) {
			for (const key of ["name", "sourcePlayerId", "rank", "score", "winner", "startPlayer"]) {
				expect(player).toHaveProperty(key)
			}
		}
	})

	it("ranks in finishing order and flags only the first group as winners", () => {
		const play = decode(OBGBgStats.buildUrl(BASE))

		expect(play.players).toEqual([
			{ name: "alice", sourcePlayerId: "alice", rank: 1, winner: true, startPlayer: false, score: 30 },
			{ name: "bob", sourcePlayerId: "bob", rank: 2, winner: false, startPlayer: false, score: 20 },
		])
	})

	it("gives a tie one shared rank and every tied player the win", () => {
		const play = decode(
			OBGBgStats.buildUrl({
				...BASE,
				groups: [
					[
						{ name: "alice", score: 30 },
						{ name: "bob", score: 30 },
					],
					[{ name: "carol", score: 10 }],
				],
			})
		)

		expect(play.players.map((player) => [player.name, player.rank, player.winner])).toEqual([
			["alice", 1, true],
			["bob", 1, true],
			["carol", 3, false],
		])
	})

	it("keeps ranks but drops scores for a game with no points", () => {
		const play = decode(
			OBGBgStats.buildUrl({
				...BASE,
				noPoints: true,
				groups: [[{ name: "alice" }], [{ name: "bob" }]],
			})
		)

		expect(play.game.noPoints).toBe(true)
		expect(play.players[0]).not.toHaveProperty("score")
		expect(play.players.map((player) => player.rank)).toEqual([1, 2])
	})

	it("carries bggId when the game is on BoardGameGeek and drops it when not", () => {
		expect(decode(OBGBgStats.buildUrl({ ...BASE, bggId: 111341 })).game.bggId).toBe(111341)
		expect(decode(OBGBgStats.buildUrl(BASE)).game).not.toHaveProperty("bggId")
	})

	it("returns nothing when no human sat at the table", () => {
		expect(OBGBgStats.buildUrl({ ...BASE, groups: [] })).toBeUndefined()
	})
})
