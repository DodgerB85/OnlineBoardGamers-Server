import * as rf from "./DDLreference"
import * as rules from "./DDLrules"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"

// Builds the BG Stats import link for the finished game from the final standings.
// Returns undefined when there is nothing a person could log.
export function buildBgStatsUrl() {
	const store = useModelStore()
	const personal = usePersonalStore()

	// finalPositions already groups tied players, best group first.
	const groups = []
	for (const group of store.gameflow.finalPositions || []) {
		const players = []
		for (const index of group) {
			const player = store.players[index]
			// A bot is not a player: solo games export as a one-player play.
			if (player.displayName === rf.BOT_NAME) continue
			players.push({ name: player.name, score: rules.finalScore(player) })
		}
		if (players.length > 0) groups.push(players)
	}

	return window.OBGBgStats.buildUrl({
		title: "Duck Dealer",
		bggId: 38553,
		sourceGameId: "DDL",
		sourcePlayId: personal.gameID,
		// DDL history carries no timestamps.
		playDate: Date.now(),
		groups,
	})
}
