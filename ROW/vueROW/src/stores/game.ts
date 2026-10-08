import { defineStore } from "pinia"
import { computed, reactive, ref, type Ref } from "vue"
import {
	ActionType,
	Game,
	GameState,
	JavaRandom,
	PlayerInfo,
	PossibleMove,
	Rng,
	defaultOptions,
	deserializeGame,
	serializeGame,
	type Edition,
} from "../game"
import { usePersonalStore } from "./personal"
import { decompress, loadChat, loadRewind, reloadGameData, resign, saveGame, saveZoom, updateDataFromLoadRewind } from "../backend/ROW_IO"
import { broadcastGameUpdate } from "../backend/ROWwebsocket"

/** A recorded player action, in the IND history shape (type/player/time/params). */
export interface HistoryEntry {
	type: string
	player: string
	time: number
	params: string[]
}

function actionParams(action: { type: ActionType; [k: string]: unknown }): string[] {
	return Object.entries(action)
		.filter(([k]) => k !== "type")
		.map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
}

/**
 * The single shared game store. Holds one engine Game instance plus UI/view
 * state. Mutations go through submit(), which calls the engine and bumps
 * `version` so Vue re-renders.
 */
export const useGameStore = defineStore("store", () => {
	const version = ref(0)
	/**
	 * Deep ref (not shallowRef): the engine is a class instance, and its methods
	 * mutate nested state in place. A deep ref makes those mutations tracked by
	 * Vue so components reading `store.game` re-render after each action.
	 */
	const game = ref<Game | null>(null) as unknown as Ref<Game | null>
	let rng: Rng = new JavaRandom(Date.now())

	const viewSettings = reactive({
		showNotes: false,
		showChat: false,
		showBug: false,
		showHistory: false,
		showInfo: false,
		showLoader: false,
		showRewindPanel: false,
		showReplay: false,
		performingRewind: false,
	})
	const selectedAction = ref<ActionType | null>(null)
	const pendingBuilding = ref<string | null>(null)
	const gameMessages = reactive({ errorText: "", successText: "", bugErrorText: "", rewindErrorText: "" })
	const history = reactive<HistoryEntry[]>([])
	const chatData = reactive<unknown[]>([])
	/** OBG turn number (round-ish), persisted with each save. */
	const turn = ref(1)
	/** True while a save is in flight; blocks duplicate end-turn submissions. */
	const saving = ref(false)
	/** Players the server reports as missing (kicked out / resigned). */
	const missingPlayers = ref<string[]>([])
	/** Client-side replay: a snapshot per turn start + the currently viewed frame. */
	const replayFrames = ref<unknown[]>([])
	const replayIndex = ref(-1)
	let liveBeforeReplay: unknown = null
	/**
	 * Serialized snapshot taken at the start of the current player's turn, so a
	 * player can reset a whole turn before ending it (IND's wholeTurnResetData).
	 */
	const wholeTurnResetData = ref<unknown>(null)

	const state = computed<GameState | null>(() => {
		version.value
		return game.value?.state ?? null
	})
	const currentPlayer = computed(() => {
		version.value
		return game.value?.currentPlayer ?? null
	})
	const actions = computed<ActionType[]>(() => {
		version.value
		return game.value ? Array.from(game.value.possibleActions()) : []
	})
	const canSkip = computed(() => {
		version.value
		return game.value?.canSkip() ?? false
	})

	function touch() {
		version.value++
	}

	function recordHistory(type: string, player: string, params: string[] = []): void {
		history.unshift({ type, player, time: Date.now(), params })
		if (history.length > 200) history.length = 200
	}

	function selectAction(a: ActionType) {
		selectedAction.value = selectedAction.value === a ? null : a
		pendingBuilding.value = null
	}

	function pickBuilding(a: ActionType, building: string) {
		selectedAction.value = a
		pendingBuilding.value = building
	}

	function clearAction() {
		selectedAction.value = null
		pendingBuilding.value = null
	}

	function setGame(g: Game) {
		game.value = g
		touch()
	}

	function getGame(): Game {
		if (!game.value) throw new Error("Game not initialized")
		return game.value
	}

	function useRng(r: Rng) {
		rng = r
	}

	/** Only the seat whose turn it is may act (practice games excepted). */
	function canAct(): boolean {
		const personal = usePersonalStore()
		const g = game.value
		if (!g) return false
		if (viewSettings.showReplay) return false
		return personal.canPlay(g.currentPlayer)
	}

	/** Serialized game plus the history log (attached for persistence). */
	function savedPayload(): Record<string, unknown> {
		return { ...(serializeGame(getGame(), rng) as unknown as Record<string, unknown>), history: history.slice() }
	}

	/** Restore the RNG seed captured in a serialized snapshot, if present. */
	function restoreRng(serialized: unknown): void {
		const state = (serialized as { rngState?: string } | null)?.rngState
		if (state && rng instanceof JavaRandom) rng.setState(state)
	}

	/** Snapshot taken before the last action, for single-action undo. */
	let undoSnapshot: unknown = null
	/** Detach the current state + RNG for a possible undo. */
	function captureUndo(): unknown {
		const g = game.value
		return g ? JSON.parse(JSON.stringify(serializeGame(g, rng))) : null
	}

	function submit(action: { type: ActionType; [k: string]: unknown }) {
		const g = getGame()
		gameMessages.errorText = ""
		if (!canAct()) {
			gameMessages.errorText = "It is not your turn"
			return
		}
		const before = captureUndo()
		try {
			g.perform(g.currentPlayer, action, rng)
		} catch (err) {
			gameMessages.errorText = (err as Error).message
			return
		}
		clearAction()
		undoSnapshot = g.canUndo() ? before : null
		recordHistory(action.type, g.currentPlayer, actionParams(action))
		touch()
	}

	/** Undo the last undoable action by restoring the captured snapshot. */
	function undo(): void {
		const g = game.value
		if (!g || !undoSnapshot || !g.canUndo() || !canAct()) return
		const snap = undoSnapshot
		undoSnapshot = null
		clearAction()
		restoreRng(snap)
		setGame(deserializeGame(snap as never))
		recordHistory("UNDO", g.currentPlayer)
		touch()
	}

	const canUndo = computed(() => {
		version.value
		return !!undoSnapshot && (game.value?.canUndo() ?? false)
	})

	function perform(action: { type: ActionType; [k: string]: unknown }) {
		submit(action)
	}

	async function endTurn(): Promise<void> {
		if (saving.value) return
		const g = getGame()
		gameMessages.errorText = ""
		if (!canAct()) {
			gameMessages.errorText = "It is not your turn"
			return
		}
		const endingPlayer = g.currentPlayer
		g.endTurn(g.currentPlayer, rng)
		clearAction()
		undoSnapshot = null
		recordHistory("END_TURN", endingPlayer)
		touch()
		snapshotTurn()
		turn.value++
		saving.value = true
		try {
			const ok = await persistTurn()
			if (!ok) await reloadFromServer()
		} finally {
			saving.value = false
		}
	}

	/** Detach a serialized copy of the current (turn-start) position + RNG. */
	function snapshotTurn(): void {
		const g = game.value
		wholeTurnResetData.value = g ? (JSON.parse(JSON.stringify(serializeGame(g, rng))) as unknown) : null
		if (wholeTurnResetData.value && !viewSettings.showReplay) {
			replayFrames.value.push(wholeTurnResetData.value)
			if (replayFrames.value.length > 100) replayFrames.value.shift()
		}
	}

	/** Enter read-only replay: view the most recent turn-start frame. */
	function enterReplay(): void {
		if (viewSettings.showReplay) return
		liveBeforeReplay = captureUndo()
		viewSettings.showReplay = true
		replayIndex.value = replayFrames.value.length - 1
		viewReplayFrame()
	}

	/** Step through replay frames (delta -1 = older, +1 = newer). */
	function replayStep(delta: number): void {
		if (!viewSettings.showReplay) return
		const next = replayIndex.value + delta
		if (next < 0 || next >= replayFrames.value.length) return
		replayIndex.value = next
		viewReplayFrame()
	}

	function viewReplayFrame(): void {
		const frame = replayFrames.value[replayIndex.value]
		if (frame) setGame(deserializeGame(JSON.parse(JSON.stringify(frame)) as never))
		touch()
	}

	/** Leave replay and restore the live position. */
	function exitReplay(): void {
		if (!viewSettings.showReplay) return
		viewSettings.showReplay = false
		replayIndex.value = -1
		if (liveBeforeReplay) {
			const snap = liveBeforeReplay
			liveBeforeReplay = null
			restoreRng(snap)
			setGame(deserializeGame(JSON.parse(JSON.stringify(snap)) as never))
		}
		touch()
	}

	/** Restore the start-of-turn snapshot (IND's resetWholeTurn). */
	function resetWholeTurn(): void {
		const snap = wholeTurnResetData.value
		if (!snap) return
		clearAction()
		undoSnapshot = null
		restoreRng(snap)
		setGame(deserializeGame(snap as never))
		touch()
	}

	/** Load the previous saved position from the server and save it back. */
	async function rewind(): Promise<void> {
		const personal = usePersonalStore()
		if (personal.gameID < 0) return
		if (viewSettings.showReplay) {
			gameMessages.rewindErrorText = "Exit replay mode first"
			return
		}
		if (getGame().isEnded()) {
			gameMessages.rewindErrorText = "The game has ended"
			return
		}
		if (viewSettings.performingRewind) return
		viewSettings.performingRewind = true
		gameMessages.rewindErrorText = ""
		try {
			const data = (await loadRewind(personal.gameID, personal.latestUpdate)) as {
				gameData?: string
				latestUpdate?: string
				missingPlayers?: string[]
				errorMessage?: string
				syncError?: boolean
			}
			if (data.syncError) {
				gameMessages.rewindErrorText = "It appears you have an older version of the game. Please refresh the page"
				return
			}
			if (data.errorMessage || !data.gameData) {
				gameMessages.rewindErrorText = data.errorMessage ?? "No rewind data available"
				return
			}
			let parsed: unknown = data.gameData
			if (typeof parsed === "string") parsed = JSON.parse(parsed)
			restoreRng(parsed)
			setGame(deserializeGame(parsed as never))
			personal.latestUpdate = Number(data.latestUpdate ?? personal.latestUpdate)
			window.initData.latestUpdate = data.latestUpdate as never
			missingPlayers.value = data.missingPlayers ?? []
			undoSnapshot = null
			snapshotTurn()

			// Write the rewound position back so the server stays in sync.
			const g = getGame()
			const ended = g.isEnded()
			const order = g.state.playerOrder.length > 0 ? g.state.playerOrder : g.state.players.map((p) => p.name)
			const current = g.currentPlayer
			const rotated = [current, ...order.filter((p) => p !== current)]
			const result = await updateDataFromLoadRewind({
				gameID: personal.gameID,
				turn: turn.value,
				phase: ended ? 2 : 1,
				gameData: savedPayload(),
				allIsCurrentPlayers: [current],
				allRemainingPlayersInTurnOrder: rotated,
			})
			personal.latestUpdate = Number(result.latestUpdate)
			window.initData.latestUpdate = result.latestUpdate
			personal.secondsToNextKickout = result.secondsToNextKickout
			broadcastGameUpdate()
			touch()
		} catch (error) {
			console.error("Error rewinding the game:", error)
			gameMessages.rewindErrorText = "Error rewinding the game"
		} finally {
			viewSettings.performingRewind = false
		}
	}

	/** Persist the whole state and hand the turn to the next player. */
	async function persistTurn(): Promise<boolean> {
		const personal = usePersonalStore()
		if (personal.gameID < 0) return true
		const g = getGame()
		const ended = g.isEnded()
		const order = g.state.playerOrder.length > 0 ? g.state.playerOrder : g.state.players.map((p) => p.name)
		const current = g.currentPlayer
		const rotated = [current, ...order.filter((p) => p !== current)]
		try {
			const result = await saveGame({
				gameID: personal.gameID,
				latestUpdate: personal.latestUpdate,
				gameData: savedPayload(),
				turn: turn.value,
				phase: ended ? 2 : 1,
				status: ended ? "FINISHED" : "ACTIVE",
				allIsCurrentPlayers: [current],
				allRemainingPlayersInTurnOrder: rotated,
				saveRewind: true,
				winner: ended ? g.ranking()[0] : undefined,
				finalPositions: ended ? g.ranking().map((name) => g.state.players.findIndex((p) => p.name === name)) : undefined,
			})
			if (result.syncError) {
				gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
				return false
			}
			personal.latestUpdate = Number(result.latestUpdate)
			window.initData.latestUpdate = result.latestUpdate
			personal.secondsToNextKickout = result.secondsToNextKickout
			broadcastGameUpdate()
			return true
		} catch (error) {
			console.error("Error saving game:", error)
			gameMessages.errorText = "Error saving the game"
			return false
		}
	}

	/** Re-fetch the persisted position (websocket message or polling fallback). */
	async function reloadFromServer(): Promise<void> {
		const personal = usePersonalStore()
		if (personal.gameID < 0) return
		try {
			const data = await reloadGameData(personal.gameID)
			if (String(data.latestUpdate) === String(personal.latestUpdate)) return
			let gd: unknown = data.gameData
			if (typeof gd === "string") gd = JSON.parse(gd)
			if (gd && typeof gd === "object" && (gd as { v?: number }).v === 1) {
				clearAction()
				undoSnapshot = null
				restoreRng(gd)
				setGame(deserializeGame(gd as never))
				snapshotTurn()
			}
			personal.latestUpdate = Number(data.latestUpdate)
			personal.secondsToNextKickout = data.secondsToNextKickout
		} catch (error) {
			console.error("Error reloading game data:", error)
		}
	}

	/** Re-fetch incoming chat (websocket message or polling fallback). */
	async function reloadChat(): Promise<void> {
		const personal = usePersonalStore()
		if (personal.gameID < 0) return
		try {
			const raw = await loadChat(personal.gameID)
			const parsed = decompress(raw)
			if (Array.isArray(parsed)) chatData.splice(0, chatData.length, ...parsed)
		} catch (error) {
			console.error("Error reloading chat:", error)
		}
	}

	/** Persist the saved zoom level (debounced). */
	let zoomSaveTimer: ReturnType<typeof setTimeout> | undefined
	function persistZoom(level: number): void {
		const personal = usePersonalStore()
		if (personal.gameID < 0) return
		if (zoomSaveTimer) clearTimeout(zoomSaveTimer)
		zoomSaveTimer = setTimeout(() => {
			void saveZoom(personal.gameID, level).catch(() => undefined)
		}, 800)
	}

	/** Resign from the game (server marks the player missing). */
	async function resignGame(): Promise<void> {
		const personal = usePersonalStore()
		if (personal.gameID < 0) return
		try {
			await resign(personal.gameID)
			recordHistory("RESIGN", personal.name)
			await reloadFromServer()
		} catch (error) {
			console.error("Error resigning:", error)
			gameMessages.errorText = "Error resigning from the game"
		}
	}

	function skip() {
		const g = getGame()
		if (!canAct()) {
			gameMessages.errorText = "It is not your turn"
			return
		}
		g.skip(g.currentPlayer)
		clearAction()
		recordHistory("SKIP", g.currentPlayer)
		touch()
	}

	function possibleMovesFor(player: string): PossibleMove[] {
		version.value
		return getGame().getTrail().possibleMovesFrom(player, getGame().playerState(player).balance, getGame().getStepLimit(), getGame().state.players.length)
	}

	function serialize(): unknown {
		return serializeGame(getGame())
	}

	/**
	 * OBG is authoritative for turn order; realign the engine when the persisted
	 * state disagrees (e.g. a fresh game whose order was randomized client-side).
	 */
	function alignToCurrentPlayers(order: string[]): void {
		const g = game.value
		if (!g || order.length === 0) return
		const valid = order.filter((n) => g.state.playerStates[n])
		if (valid.length === 0) return
		const same = valid.length === g.state.playerOrder.length && valid.every((n, i) => n === g.state.playerOrder[i]) && g.state.currentPlayer === valid[0]
		if (same) return
		g.state.playerOrder = valid
		g.state.currentPlayer = valid[0]
		g.beginTurn()
		touch()
		snapshotTurn()
	}

	function initFromGameData(gameData: unknown, players: PlayerInfo[], edition: Edition) {
		clearAction()
		if (gameData && typeof gameData === "object" && (gameData as { v?: number }).v === 1) {
			restoreRng(gameData)
			setGame(deserializeGame(gameData as never))
			const h = (gameData as { history?: HistoryEntry[] }).history
			if (Array.isArray(h)) history.splice(0, history.length, ...h)
			snapshotTurn()
			return
		}
		const opts = { ...defaultOptions(edition) }
		setGame(Game.start(players, opts, rng))
		snapshotTurn()
	}

	function clearMessages() {
		gameMessages.errorText = ""
		gameMessages.successText = ""
		gameMessages.bugErrorText = ""
		gameMessages.rewindErrorText = ""
	}

	return {
		version,
		selectedAction,
		pendingBuilding,
		selectAction,
		pickBuilding,
		clearAction,
		game,
		state,
		currentPlayer,
		actions,
		canSkip,
		viewSettings,
		gameMessages,
		history,
		chatData,
		turn,
		saving,
		missingPlayers,
		wholeTurnResetData,
		canAct,
		undo,
		canUndo,
		enterReplay,
		exitReplay,
		replayStep,
		replayFrames,
		replayIndex,
		setGame,
		getGame,
		useRng,
		submit,
		perform,
		endTurn,
		persistTurn,
		snapshotTurn,
		resetWholeTurn,
		rewind,
		reloadFromServer,
		reloadChat,
		resignGame,
		persistZoom,
		skip,
		possibleMovesFor,
		serialize,
		initFromGameData,
		alignToCurrentPlayers,
		clearMessages,
		personal: usePersonalStore,
	}
})
