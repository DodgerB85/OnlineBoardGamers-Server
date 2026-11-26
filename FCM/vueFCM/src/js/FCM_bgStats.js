import * as rf from "./FCMreference"
import { useModelStore } from "../stores/FCMstore.js"
import { usePersonalStore } from "../stores/FCMpersonal.js"

// Builds the BG Stats import link for the finished game. Only valid once the
// game is over: endGame leaves fullTurnOrder sorted by money, winner first.
// Returns undefined when there is nothing a person could log.
export function buildBgStatsUrl() {
	const store = useModelStore()
	const personal = usePersonalStore()

	const gameEnd = store.history[store.history.length - 1]
	// endGame tie-breaks by seat, so the field is fully ordered: one group each.
	const groups = []
	const outPlayers = store.players.filter((player) => player.displayName === rf.BOT_NAME && player.name !== rf.BOT_NAME).map((player) => player.name)
	for (const playerIndex of store.gameflow.fullTurnOrder) {
		const player = store.players[playerIndex]
		// Only the FcmBot account is a bot seat: a seat renamed FcmBot is a human
		// who resigned or was kicked. FcmAI is the in-game AI, never a person.
		if (player.name === rf.BOT_NAME || rf.CAP3_AI_NAMES.includes(player.name) || player.displayName === rf.BOT_NAME) continue
		groups.push([{ name: player.name, score: player.money }])
	}

	return window.OBGBgStats.buildUrl({
		title: "Food Chain Magnate",
		bggId: 175914,
		sourceGameId: "FCM",
		sourcePlayId: personal.gameID,
		playDate: gameEnd[2] * 1000,
		groups,
		outPlayers,
	})
}
