import * as rf from "./CNSreference"
import { useModelStore } from "../stores/CNSstore.js"
import { usePersonalStore } from "../stores/CNSpersonal"

// Builds the BG Stats import link for the finished game. Only valid once the
// game is over: it reads the standings out of the final history entry, the
// same entry the game end screen renders.
// Returns undefined when there is nothing a person could log.
export function buildBgStatsUrl() {
	const store = useModelStore()
	const personal = usePersonalStore()

	const gameEnd = store.history[store.history.length - 1]
	// Final result is [[playerIndex, score], ...] best first; turn order settles
	// equal scores, so every player keeps their own rank.
	const groups = []
	for (const entry of gameEnd[3]) {
		const player = store.players[entry[0]]
		// A bot is not a player: solo games export as a one-player play.
		if (player.displayName === rf.BOT_NAME) continue
		groups.push([{ name: player.name, score: entry[1] }])
	}

	return window.OBGBgStats.buildUrl({
		title: "Cannes: Stars, Scripts and Screens",
		bggId: 4318,
		sourceGameId: "CNS",
		sourcePlayId: personal.gameID,
		playDate: (personal.gameCreationTimestamp + gameEnd[2]) * 1000,
		groups,
	})
}
