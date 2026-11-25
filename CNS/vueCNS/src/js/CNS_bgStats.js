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
	const outPlayers = store.players.filter((player) => player.displayName === rf.BOT_NAME && player.name !== rf.BOT_NAME).map((player) => player.name)
	for (const entry of gameEnd[3]) {
		const player = store.players[entry[0]]
		// Only the CnsBot account is a bot seat: a seat renamed CnsBot is a human
		// who resigned or was kicked, and is exported under their own name.
		if (player.name === rf.BOT_NAME || player.displayName === rf.BOT_NAME) continue
		groups.push([{ name: player.name, score: entry[1] }])
	}

	return window.OBGBgStats.buildUrl({
		title: "Cannes: Stars, Scripts and Screens",
		bggId: 4318,
		sourceGameId: "CNS",
		sourcePlayId: personal.gameID,
		playDate: (personal.gameCreationTimestamp + gameEnd[2]) * 1000,
		groups,
		outPlayers,
	})
}
