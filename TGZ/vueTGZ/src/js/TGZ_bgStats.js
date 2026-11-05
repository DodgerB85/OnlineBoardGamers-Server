import * as rf from "./TGZreference"
import { useModelStore } from "../stores/TGZstore.js"
import { usePersonalStore } from "../stores/TGZpersonal.js"

// Builds the BG Stats import link for the finished game. Only valid once the
// game is over: it reads the standings out of the final history entry, the
// same entry the game end screen renders.
// Returns undefined when there is nothing a person could log.
export function buildBgStatsUrl() {
	const store = useModelStore()
	const personal = usePersonalStore()

	const gameEnd = store.history[store.history.length - 1]
	// Entries are [overshoot, playerIndex, tieBreakCode], best first. Overshoot
	// is VP minus VR - the +4 / -11 a TGZ player would write down - and it is
	// what the ranking is built from, so score and rank can never disagree.
	const groups = []
	for (const entry of gameEnd[3]) {
		const playerIndex = entry[1]
		const player = store.players[playerIndex]
		// A bot is not a player: solo games export as a one-player play.
		if (player.displayName === rf.BOT_NAME) continue
		groups.push([{ name: player.name, score: entry[0] }])
	}

	return window.OBGBgStats.buildUrl({
		title: "The Great Zimbabwe",
		bggId: 111341,
		sourceGameId: "TGZ",
		sourcePlayId: personal.gameID,
		playDate: (personal.gameCreationTimestamp + gameEnd[2]) * 1000,
		groups,
	})
}
