import * as rf from "./AQYreference.js"
import { useModelStore } from "../stores/AQYstore.js"
import { usePersonalStore } from "../stores/AQYpersonal.js"

// Builds the BG Stats import link for the finished game. Only valid once the
// game is over: it reads the final result out of the last history entry, the
// same entry the game end screen renders.
// Returns undefined when there is nothing a person could log.
export function buildBgStatsUrl() {
	const store = useModelStore()
	const personal = usePersonalStore()

	const gameEnd = store.history[store.history.length - 1]
	const result = gameEnd[3]
	// [reason, winnerIndices, runnerUpIndices?]. Winners share the first group,
	// runners-up the second; some endings have no runners-up at all.
	const groups = []
	for (const indices of [result[1], result[2]]) {
		if (!indices) continue
		const group = []
		for (const playerIndex of indices) {
			const player = store.players[playerIndex]
			// A bot is not a player: solo games export as a one-player play.
			if (player.displayName === rf.BOT_NAME) continue
			// Antiquity has no score: only the finishing order is exported.
			group.push({ name: player.name })
		}
		if (group.length > 0) groups.push(group)
	}

	return window.OBGBgStats.buildUrl({
		title: "Antiquity",
		bggId: 13122,
		sourceGameId: "AQY",
		sourcePlayId: personal.gameID,
		playDate: (personal.gameCreationTimestamp + gameEnd[2]) * 1000,
		noPoints: true,
		groups,
	})
}
