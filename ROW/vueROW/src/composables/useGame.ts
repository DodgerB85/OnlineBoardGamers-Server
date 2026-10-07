import { Edition, JavaRandom, PlayerInfo } from "../game"
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

	const chat = initData.chatData
	if (typeof chat === "string" && chat.length > 0) {
		try {
			const binary = atob(chat)
			const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
			store.chatData.splice(0, store.chatData.length, ...JSON.parse(new TextDecoder().decode(bytes)))
		} catch {
			/* ignore malformed chat */
		}
	}
}
