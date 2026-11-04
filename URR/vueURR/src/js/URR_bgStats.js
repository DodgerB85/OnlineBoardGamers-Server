import * as rf from "./URRreference"
import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"

// Builds the BG Stats import link for the finished game from the final standings.
// Returns undefined when there is nothing a person could log.
export function buildBgStatsUrl() {
	const store = useModelStore()
	const personal = usePersonalStore()

	// finalPositions is already ordered best-first: one group each.
	const groups = []
	for (const index of store.gameflow.finalPositions || []) {
		const player = store.players[index]
		// A bot is not a player: solo games export as a one-player play.
		if (player.isMissing || player.displayName === rf.BOT_NAME) continue
		groups.push([{ name: player.name, score: player.score }])
	}
	const endTime = store.history.length > 0 ? store.historyTimeAt(store.history.length - 1) : null

	return window.OBGBgStats.buildUrl({
		title: "Ur: 1830 BC",
		bggId: 2396,
		sourceGameId: "URR",
		sourcePlayId: personal.gameID,
		playDate: (endTime ?? Math.floor(Date.now() / 1000)) * 1000,
		groups,
	})
}
