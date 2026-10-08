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
import { loadRewind, reloadGameData, saveGame, updateDataFromLoadRewind } from "../backend/ROW_IO"
import { broadcastGameUpdate } from "../backend/ROWwebsocket"

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
	const history = reactive<unknown[]>([])
	const chatData = reactive<unknown[]>([])
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

	function submit(action: { type: ActionType; [k: string]: unknown }) {
		const g = getGame()
		gameMessages.errorText = ""
		try {
			g.perform(g.currentPlayer, action, rng)
		} catch (err) {
			gameMessages.errorText = (err as Error).message
			return
		}
		clearAction()
		touch()
	}

	function perform(action: { type: ActionType; [k: string]: unknown }) {
		submit(action)
	}

	function endTurn() {
		const g = getGame()
		g.endTurn(g.currentPlayer, rng)
		clearAction()
		touch()
		snapshotTurn()
		void persistTurn()
	}

	/** Detach a serialized copy of the current (turn-start) position. */
	function snapshotTurn(): void {
		const g = game.value
		wholeTurnResetData.value = g ? (JSON.parse(JSON.stringify(serializeGame(g))) as unknown) : null
	}

	/** Restore the start-of-turn snapshot (IND's resetWholeTurn). */
	function resetWholeTurn(): void {
		const snap = wholeTurnResetData.value
		if (!snap) return
		clearAction()
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
			setGame(deserializeGame(parsed as never))
			personal.latestUpdate = Number(data.latestUpdate ?? personal.latestUpdate)
			window.initData.latestUpdate = data.latestUpdate as never
			snapshotTurn()

			// Write the rewound position back so the server stays in sync.
			const g = getGame()
			const ended = g.isEnded()
			const order = g.state.playerOrder.length > 0 ? g.state.playerOrder : g.state.players.map((p) => p.name)
			const current = g.currentPlayer
			const rotated = [current, ...order.filter((p) => p !== current)]
			const result = await updateDataFromLoadRewind({
				gameID: personal.gameID,
				turn: 1,
				phase: ended ? 2 : 1,
				gameData: serializeGame(g),
				allIsCurrentPlayers: [current],
				allRemainingPlayersInTurnOrder: rotated,
			})
			personal.latestUpdate = Number(result.latestUpdate)
			window.initData.latestUpdate = result.latestUpdate
			personal.secondsToNextKickout = result.secondsToNextKickout
			touch()
		} catch (error) {
			console.error("Error rewinding the game:", error)
			gameMessages.rewindErrorText = "Error rewinding the game"
		} finally {
			viewSettings.performingRewind = false
		}
	}

	/** Persist the whole state and hand the turn to the next player. */
	async function persistTurn(): Promise<void> {
		const personal = usePersonalStore()
		if (personal.gameID < 0) return
		const g = getGame()
		const ended = g.isEnded()
		const order = g.state.playerOrder.length > 0 ? g.state.playerOrder : g.state.players.map((p) => p.name)
		const current = g.currentPlayer
		const rotated = [current, ...order.filter((p) => p !== current)]
		try {
			const result = await saveGame({
				gameID: personal.gameID,
				latestUpdate: personal.latestUpdate,
				gameData: serializeGame(g),
				turn: 1,
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
				return
			}
			personal.latestUpdate = Number(result.latestUpdate)
			window.initData.latestUpdate = result.latestUpdate
			personal.secondsToNextKickout = result.secondsToNextKickout
			broadcastGameUpdate()
		} catch (error) {
			console.error("Error saving game:", error)
			gameMessages.errorText = "Error saving the game"
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
				setGame(deserializeGame(gd as never))
				snapshotTurn()
			}
			personal.latestUpdate = Number(data.latestUpdate)
			personal.secondsToNextKickout = data.secondsToNextKickout
		} catch (error) {
			console.error("Error reloading game data:", error)
		}
	}

	function skip() {
		const g = getGame()
		g.skip(g.currentPlayer)
		clearAction()
		touch()
	}

	function possibleMovesFor(player: string): PossibleMove[] {
		version.value
		return getGame().getTrail().possibleMovesFrom(player, getGame().playerState(player).balance, getGame().getStepLimit(), getGame().state.players.length)
	}

	function serialize(): unknown {
		return serializeGame(getGame())
	}

	function initFromGameData(gameData: unknown, players: PlayerInfo[], edition: Edition) {
		clearAction()
		if (gameData && typeof gameData === "object" && (gameData as { v?: number }).v === 1) {
			setGame(deserializeGame(gameData as never))
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
		wholeTurnResetData,
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
		skip,
		possibleMovesFor,
		serialize,
		initFromGameData,
		clearMessages,
		personal: usePersonalStore,
	}
})
