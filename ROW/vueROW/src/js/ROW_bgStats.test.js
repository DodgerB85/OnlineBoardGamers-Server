import { createRequire } from "node:module"
import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import { buildBgStatsUrl } from "./ROW_bgStats"
import { useModelStore } from "../stores/ROWstore.js"
import { usePersonalStore } from "../stores/ROWpersonal.js"

// The shared builder ships as a plain script the show templates load; install
// it here the way a browser would.
globalThis.window = globalThis
globalThis.OBGBgStats = createRequire(import.meta.url)("../../../../Lobby/static/Lobby/common/bgStats.js")

// entries are [name, score], best first — the shape game.ranking() implies.
function makeGame(entries, computer = []) {
	return {
		isEnded: () => true,
		ranking: () => entries.map(([name]) => name),
		getScore: (name) => entries.find(([entryName]) => entryName === name)[1],
		isComputer: (name) => computer.includes(name),
		state: { players: entries.map(([name]) => ({ name })) },
	}
}

function setup(game) {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.gameID = 77
	store.game = game
	store.history.splice(0, store.history.length, { type: "END", player: "alice", time: 1700000000000, params: [] })
	return store
}

function decode(url) {
	expect(url.startsWith("https://app.bgstatsapp.com/createPlay.html?data=")).toBe(true)
	return JSON.parse(new URL(url).searchParams.get("data"))
}

beforeEach(() => {
	setActivePinia(createPinia())
})

describe("buildBgStatsUrl", () => {
	it("sends the game, the play date and the final scores", () => {
		setup(
			makeGame([
				["alice", 60],
				["bob", 40],
			])
		)

		const play = decode(buildBgStatsUrl())

		expect(play.sourceName).toBe("OnlineBoardGamers.com")
		expect(play.sourcePlayId).toBe("77")
		expect(play.playDate).toBe("2023-11-14 22:13:20")
		expect(play.game).toEqual({
			name: "Ranchers of the Old West",
			sourceGameId: "ROW",
			noPoints: false,
			highestWins: true,
		})
		expect(play.players).toEqual([
			{ name: "alice", sourcePlayerId: "alice", rank: 1, winner: true, startPlayer: false, score: 60 },
			{ name: "bob", sourcePlayerId: "bob", rank: 2, winner: false, startPlayer: false, score: 40 },
		])
	})

	it("gives a tied score one shared rank and both players the win", () => {
		setup(
			makeGame([
				["alice", 60],
				["bob", 60],
				["carol", 20],
			])
		)

		const play = decode(buildBgStatsUrl())

		expect(play.players.map((player) => [player.name, player.rank, player.winner])).toEqual([
			["alice", 1, true],
			["bob", 1, true],
			["carol", 3, false],
		])
	})

	it("drops computer seats and kicked players, keeping the human ranking", () => {
		const store = setup(
			makeGame(
				[
					["Garth", 90],
					["alice", 60],
					["bob", 40],
				],
				["Garth"]
			)
		)
		store.missingPlayers = ["bob"]

		const play = decode(buildBgStatsUrl())

		expect(play.players.map((player) => [player.name, player.rank])).toEqual([["alice", 1]])
	})

	it("returns nothing when the game is not over", () => {
		setup({ isEnded: () => false })

		expect(buildBgStatsUrl()).toBeUndefined()
	})
})
