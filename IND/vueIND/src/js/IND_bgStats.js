import * as rf from "./INDreference"
import { useModelStore } from "../stores/INDstore.js"
import { usePersonalStore } from "../stores/INDpersonal.js"

// Builds the BG Stats import link for the finished game. Only valid once the
// game is over: it reads the standings from the final history entry, the same
// entry the game end screen renders.
// Returns undefined when there is nothing a person could log.
export function buildBgStatsUrl() {
	const store = useModelStore()
	const personal = usePersonalStore()

	const standings = store.history[store.history.length - 1][3]
	// A bot win records only the winner's index, without a score.
	let entries = standings
	if (typeof standings[0] === "number") {
		const winner = standings[0]
		entries = [[winner, store.players[winner].moneyCash + store.players[winner].moneyBank]]
	}
	// endGame tie-breaks by turn order, so the field is fully ordered: one group each.
	const groups = []
	for (const entry of entries) {
		const player = store.players[entry[0]]
		// A bot is not a player: solo games export as a one-player play.
		if (player.displayName === rf.BOT_NAME) continue
		groups.push([{ name: player.name, score: entry[1] }])
	}

	return window.OBGBgStats.buildUrl({
		title: "Indonesia",
		bggId: 19777,
		sourceGameId: "IND",
		sourcePlayId: personal.gameID,
		playDate: store.computedHistory[store.computedHistory.length - 1][2] * 1000,
		groups,
	})
}
