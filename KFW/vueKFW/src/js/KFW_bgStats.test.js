import { createRequire } from "node:module"
import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import * as rf from "./KFWreference"
import { buildBgStatsUrl } from "./KFW_bgStats"
import { useModelStore } from "../stores/KFWstore.js"
import { usePersonalStore } from "../stores/KFWpersonal.js"

// The shared builder ships as a plain script the show templates load; install
// it here the way a browser would.
globalThis.window = globalThis
globalThis.OBGBgStats = createRequire(import.meta.url)("../../../../Lobby/static/Lobby/common/bgStats.js")

function makePlayer(index, overrides = {}) {
	return {
		name: `user${index}`,
		displayName: `Player ${index}`,
		colour: index,
		finalScore: 0,
		...overrides,
	}
}

// finalPositions is an array of groups of player indices, best group first.
function finish(finalPositions, players) {
	setActivePinia(createPinia())
	const store = useModelStore()
	const personal = usePersonalStore()
	personal.gameID = 4242
	personal.gameCreationTimestamp = 1700000000
	store.players.splice(0, store.players.length, ...players)
	store.context.finalPositions = finalPositions
	store.history.push([rf.HIST_PASS_TURN, -1, 33, []])
	store.gameflow.phase = rf.PHASE_GAME_OVER
}

function decode(url) {
	expect(url.startsWith("https://app.bgstatsapp.com/createPlay.html?data=")).toBe(true)
	return JSON.parse(new URL(url).searchParams.get("data"))
}

beforeEach(() => {
	setActivePinia(createPinia())
})

describe("buildBgStatsUrl", () => {
	it("identifies the site, the play and Keyflower on BGG", () => {
		finish([[0], [1]], [makePlayer(0, { finalScore: 50 }), makePlayer(1, { finalScore: 30 })])

		const play = decode(buildBgStatsUrl())

		expect(play.sourceName).toBe("OnlineBoardGamers.com")
		expect(play.sourcePlayId).toBe("4242")
		// UTC: BG Stats wants "yyyy-MM-dd HH:mm:ss"
		expect(play.playDate).toBe("2023-11-14 22:13:53")
		expect(play.game).toEqual({
			name: "Keyflower",
			sourceGameId: "KFW",
			bggId: 122515,
			highestWins: true,
			noPoints: false,
		})
	})

	it("gives tied players one shared rank and drops bots before ranking", () => {
		finish([[0, 1, 3], [2]], [makePlayer(0, { finalScore: 50 }), makePlayer(1, { finalScore: 50 }), makePlayer(2, { finalScore: 30 }), makePlayer(3, { finalScore: 50, displayName: rf.BOT_NAME })])

		const play = decode(buildBgStatsUrl())

		expect(play.players).toEqual([
			{ name: "user0", sourcePlayerId: "user0", score: 50, rank: 1, winner: true, startPlayer: false },
			{ name: "user1", sourcePlayerId: "user1", score: 50, rank: 1, winner: true, startPlayer: false },
			{ name: "user2", sourcePlayerId: "user2", score: 30, rank: 3, winner: false, startPlayer: false },
		])
	})

	it("promotes the best human when a bot won the game", () => {
		finish([[2], [0], [1]], [makePlayer(0, { finalScore: 40 }), makePlayer(1, { finalScore: 20 }), makePlayer(2, { finalScore: 60, displayName: rf.BOT_NAME })])

		const play = decode(buildBgStatsUrl())

		expect(play.players.map((player) => [player.name, player.rank, player.winner])).toEqual([
			["user0", 1, true],
			["user1", 2, false],
		])
	})

	it("returns nothing when only bots sat at the table", () => {
		finish([[0]], [makePlayer(0, { displayName: rf.BOT_NAME })])

		expect(buildBgStatsUrl()).toBeUndefined()
	})
})
