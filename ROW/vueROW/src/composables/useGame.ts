import { Edition, JavaRandom, PlayerInfo } from "../game"
import { decompress } from "../backend/ROW_IO"
import { startWebSocket } from "../backend/ROWwebsocket"
import { useGameStore } from "../stores/game"
import { usePersonalStore } from "../stores/personal"

const COLORS = ["RED", "BLUE", "YELLOW", "GREEN"]

/** Initialise the store from the Django-rendered `window.initData` payload. */
export function initGame(): void {
	const store = useGameStore()
	const personal = usePersonalStore()
	const initData = (window.initData ?? {}) as Record<string, unknown>

	personal.gameID = Number(initData.gameID ?? -1)
	personal.name = String(initData.name ?? "")
	personal.pov = Number(initData.pov ?? -99)
	personal.latestUpdate = Number(initData.latestUpdate ?? 0)
	personal.gameCreationTimestamp = Number(initData.gameCreationTimestamp ?? 0)
	personal.notes = String(initData.notes ?? "")
	personal.finishedGame = Boolean(initData.finishedGame)
	personal.secondsToNextKickout = Number(initData.secondsToNextKickout ?? 99999)
	personal.trainingGame = Array.isArray(initData.startingOptions) && (initData.startingOptions as number[]).includes(102)
	personal.transactionID = String(initData.transactionID ?? "")
	personal.chatNotification = Boolean(initData.chatNotification)
	personal.zoom = Number(initData.myZoomLevel ?? 16)
	store.turn = Number(initData.turn ?? 1)

	const edition = (initData.edition as Edition) ?? Edition.FIRST
	const names = (initData.playerNames as string[]) ?? []
	const players: PlayerInfo[] = names.map((name, i) => ({ name, color: COLORS[i % COLORS.length], type: "HUMAN" }))

	let gameData = initData.gameData as unknown
	if (typeof gameData === "string") {
		try {
			gameData = JSON.parse(gameData)
		} catch {
			gameData = null
		}
	}

	store.useRng(new JavaRandom(Number(initData.gameID ?? Date.now())))
	store.initFromGameData(gameData, players, edition)

	// OBG is authoritative for whose turn it is; align the engine to it.
	const currentPlayers = Array.isArray(initData.currentPlayers) ? (initData.currentPlayers as string[]) : []
	store.alignToCurrentPlayers(currentPlayers)

	const chat = initData.chatData
	if (typeof chat === "string" && chat.length > 0) {
		try {
			// The server stores chat as gzip+base64, not plain base64 JSON.
			const parsed = decompress(chat)
			if (Array.isArray(parsed)) store.chatData.splice(0, store.chatData.length, ...parsed)
		} catch {
			/* ignore malformed chat */
		}
	}

	setupLiveUpdates()
}

/**
 * Live updates: start the websocket and, as a fallback, poll for newer data.
 * Both paths funnel into store.reloadFromServer(), which no-ops when the
 * server version matches the local one.
 */
function setupLiveUpdates(): void {
	const store = useGameStore()
	const personal = usePersonalStore()
	if (personal.gameID < 0) return
	void startWebSocket().then((ws) => {
		if (ws)
			ws.onmessage = () => {
				void store.reloadFromServer()
				void store.reloadChat()
			}
	})
	setInterval(() => {
		void store.reloadFromServer()
		void store.reloadChat()
	}, 20000)
}
