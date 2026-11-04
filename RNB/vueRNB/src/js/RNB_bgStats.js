import * as rf from "./RNBreference"
import * as wonder from "./RNBwonder"
import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"

// Builds the BG Stats import link for the finished game. Only valid once the
// game is over: it reads the final standings and the last history timestamp
// the game end screen shows.
// Returns undefined when there is nothing a person could log.
export function buildBgStatsUrl() {
	const store = useModelStore()
	const personal = usePersonalStore()

	// Use the last real history entry: the store appends its own game-end
	// entry after it, which is not a play timestamp.
	const lastEntry = store.computedHistory[store.computedHistory.length - 2]
	const playDate = lastEntry && lastEntry[2] ? lastEntry[2] * 1000 : Date.now()

	// fullTurnOrder is sorted by score, but its tie-break still separates
	// players who finished level, so group equal consecutive scores.
	const groups = []
	for (const playerIndex of store.gameflow.fullTurnOrder) {
		const player = store.players[playerIndex]
		// A bot is not a player: solo games export as a one-player play.
		if (player.displayName === rf.BOT_NAME) continue
		const entry = { name: player.name, score: wonder.getPlayerTotalScore(playerIndex) }
		const group = groups[groups.length - 1]
		if (group && group[0].score === entry.score) group.push(entry)
		else groups.push([entry])
	}

	return window.OBGBgStats.buildUrl({
		title: "Roads & Boats",
		bggId: 875,
		sourceGameId: "RNB",
		sourcePlayId: personal.gameID,
		playDate,
		groups,
	})
}
