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
	const outPlayers = store.players.filter((player) => player.displayName === rf.BOT_NAME && player.name !== rf.BOT_NAME).map((player) => player.name)
	for (const group of store.gameflow.finalPositions || []) {
		const players = []
		for (const index of group) {
			const player = store.players[index]
			// Only the DdlBot account is a bot seat: a seat renamed DdlBot is a
			// human who was kicked, and is exported under their own name.
			if (player.name === rf.BOT_NAME || player.displayName === rf.BOT_NAME) continue
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
		outPlayers,
	})
}
