import * as rf from "./BUSreference.js"
import * as model from "./BUSmodel.js"
import { useModelStore } from "../stores/BUSstore.js"
import { usePersonalStore } from "../stores/BUSpersonal.js"

// Builds the BG Stats import link for the finished game. Only valid once the
// game is over: it reads the same final ranking the game end screen shows.
// Returns undefined when there is nothing a person could log.
export function buildBgStatsUrl() {
	const store = useModelStore()
	const personal = usePersonalStore()

	const gameEnd = store.history[store.history.length - 1]
	// The ranking already settles time-stone and first-to-score ties, so every
	// player keeps their own rank.
	const groups = []
	for (const player of model.getFinalRanking()) {
		// A bot is not a player: solo games export as a one-player play.
		if (player.displayName === rf.BOT_NAME) continue
		groups.push([{ name: player.name, score: player.score }])
	}

	return window.OBGBgStats.buildUrl({
		title: "Bus",
		bggId: 552,
		sourceGameId: "BUS",
		sourcePlayId: personal.gameID,
		playDate: (personal.gameCreationTimestamp + gameEnd[2]) * 1000,
		groups,
	})
}
