import * as rf from "./WEBreference"
import * as model from "./WEBmodel"
import * as cb from "./WEBcables"
import { useModelStore } from "../stores/WEBstore.js"
import { usePersonalStore } from "../stores/WEBpersonal.js"

// Builds the BG Stats import link for the finished game. Only valid once the
// game is over: it reads the final standings and the last history timestamp
// the game end screen shows.
// Returns undefined when there is nothing a person could log.
export function buildBgStatsUrl() {
	const store = useModelStore()
	const personal = usePersonalStore()

	// The last real history entry holds the play's timestamp; the synthetic
	// game-end entry the store appends has [2] === 0.
	const lastEntry = store.computedHistory[store.computedHistory.length - 2]
	const playDate = lastEntry && lastEntry[2] ? lastEntry[2] * 1000 : Date.now()

	// endGame_core already groups players tied on the same score.
	const groups = []
	const outPlayers = store.players.filter((player) => player.displayName === rf.BOT_NAME && player.name !== rf.BOT_NAME).map((player) => player.name)
	for (const group of model.endGame_core()) {
		const players = []
		for (const playerIndex of group) {
			const player = store.players[playerIndex]
			// Only the WebBot account is a bot seat: a seat renamed WebBot is a
			// human who resigned or was kicked, and is exported under their own name.
			if (player.name === rf.BOT_NAME || player.displayName === rf.BOT_NAME) continue
			players.push({ name: player.name, score: cb.getScore(playerIndex) })
		}
		// Drop groups left empty by bots so the ranks and winners stay right.
		if (players.length > 0) groups.push(players)
	}

	return window.OBGBgStats.buildUrl({
		title: "Web",
		bggId: 10758,
		sourceGameId: "WEB",
		sourcePlayId: personal.gameID,
		playDate,
		groups,
		outPlayers,
	})
}
