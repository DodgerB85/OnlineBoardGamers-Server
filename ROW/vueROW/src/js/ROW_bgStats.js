import { useModelStore } from "../stores/ROWstore.js"
import { usePersonalStore } from "../stores/ROWpersonal.js"

// Builds the BG Stats import link for the finished game. Only valid once the
// game is over: it reads the same ranking the ended dialog shows.
export function buildBgStatsUrl() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const game = store.game
	if (!game || !game.isEnded()) return undefined

	// ranking() sorts by score then balance, so equal scores end up adjacent.
	const groups = []
	for (const name of game.ranking()) {
		const player = game.state.players.find((p) => p.name === name)
		// A computer opponent is not a person; a kicked seat has no result.
		if (!player || game.isComputer(name) || store.missingPlayers.includes(name)) continue
		const score = game.getScore(name)
		const last = groups[groups.length - 1]
		if (last && last[0].score === score) last.push({ name, score })
		else groups.push([{ name, score }])
	}

	return window.OBGBgStats.buildUrl({
		title: "Ranchers of the Old West",
		sourceGameId: "ROW",
		sourcePlayId: personal.gameID,
		playDate: store.history[0]?.time ?? Date.now(),
		groups,
	})
}
