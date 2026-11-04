import { useModelStore } from "../stores/NTRstore"

// Training games seat SHADOW / NtrBot players; they are not people to log.
function isBot(player) {
	return player.username.startsWith("SHADOW") || player.username.startsWith("NtrBot")
}

// Builds the BG Stats import link for the finished game. Napoleon's Triumph has
// no per-player score: the winning side shares first place, the other side second.
// A side left with only bots is dropped. Returns undefined when nobody is left.
export function buildBgStatsUrl() {
	const store = useModelStore()
	if (!store.victory) return undefined

	const humans = store.players.filter((player) => !isBot(player))
	let groups
	if (store.victory.winner === "draw") {
		groups = [humans]
	} else {
		const winners = humans.filter((player) => player.side === store.victory.winner)
		const losers = humans.filter((player) => player.side !== store.victory.winner)
		groups = [winners, losers]
	}

	return window.OBGBgStats.buildUrl({
		title: "Napoleon's Triumph",
		bggId: 18098,
		sourceGameId: "NTR",
		sourcePlayId: store.gameID,
		playDate: store.history[0]?.timestamp ?? Date.now(),
		noPoints: true,
		groups: groups.filter((group) => group.length > 0).map((group) => group.map((player) => ({ name: player.username }))),
	})
}
