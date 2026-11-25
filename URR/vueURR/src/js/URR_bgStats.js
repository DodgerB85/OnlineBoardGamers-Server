import * as rf from "./URRreference"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"

// Builds the BG Stats import link for the finished game from the final standings.
// Returns undefined when there is nothing a person could log.
export function buildBgStatsUrl() {
	const store = useModelStore()
	const personal = usePersonalStore()

	// finalPositions groups tied players, best group first. It skips missing
	// seats, so collect those from the player list instead.
	const groups = []
	const outPlayers = store.players.filter((player) => player.isMissing && player.name !== rf.BOT_NAME).map((player) => player.name)
	for (const group of store.gameflow.finalPositions || []) {
		const players = []
		for (const index of group) {
			const player = store.players[index]
			// Only the UrBot account is a bot seat: a seat renamed UrBot is a human
			// who resigned or was kicked, and is exported under their own name.
			if (player.name === rf.BOT_NAME) continue
			if (player.isMissing || player.displayName === rf.BOT_NAME) continue
			players.push({ name: player.name, score: player.score })
		}
		if (players.length > 0) groups.push(players)
	}
	const endTime = store.history.length > 0 ? store.historyTimeAt(store.history.length - 1) : null

	return window.OBGBgStats.buildUrl({
		title: "Ur: 1830 BC",
		bggId: 2396,
		sourceGameId: "URR",
		sourcePlayId: personal.gameID,
		playDate: (endTime ?? Math.floor(Date.now() / 1000)) * 1000,
		groups,
		outPlayers,
	})
}
