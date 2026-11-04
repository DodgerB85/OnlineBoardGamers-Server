import * as rf from "./TGZreference"
import * as model from "./TGZmodel"
import { useModelStore } from "../stores/TGZstore.js"
import { usePersonalStore } from "../stores/TGZpersonal.js"

const SOURCE_NAME = "OnlineBoardGamers.com"
const BGG_ID = 111341

// Builds the BG Stats import link for the finished game. Only valid once the
// game is over: it reads the standings out of the final history entry, the
// same entry the game end screen renders.
// Returns undefined when there is nothing a person could log.
export function buildBgStatsUrl() {
	const store = useModelStore()
	const personal = usePersonalStore()

	const gameEnd = store.history[store.history.length - 1]
	const players = []
	for (const entry of gameEnd[3]) {
		const playerIndex = entry[1]
		const player = store.players[playerIndex]
		// A bot is not a player: solo games export as a one-player play.
		if (player.displayName === rf.BOT_NAME) continue
		players.push({
			name: player.name,
			// Stable across plays, so BG Stats can re-match the player.
			sourcePlayerId: player.name,
			score: model.getScore(playerIndex),
			rank: players.length + 1,
			winner: players.length === 0,
			// OBG does not record who started.
			startPlayer: false,
		})
	}
	if (players.length === 0) return undefined

	const play = {
		sourceName: SOURCE_NAME,
		sourcePlayId: String(personal.gameID),
		playDate: new Date((personal.gameCreationTimestamp + gameEnd[2]) * 1000).toISOString().slice(0, 19).replace("T", " "),
		game: {
			name: "The Great Zimbabwe",
			sourceGameId: "TGZ",
			bggId: BGG_ID,
			highestWins: true,
			noPoints: false,
		},
		players,
	}

	return `https://app.bgstatsapp.com/createPlay.html?data=${encodeURIComponent(JSON.stringify(play))}`
}
