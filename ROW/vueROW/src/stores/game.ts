import { defineStore } from "pinia"
import { computed, reactive, ref, shallowRef } from "vue"
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
import { saveGame } from "../backend/ROW_IO"

/**
 * The single shared game store. Holds one engine Game instance plus UI/view
 * state. Mutations go through submit(), which calls the engine and bumps
 * `version` so Vue re-renders.
 */
export const useGameStore = defineStore("store", () => {
	const version = ref(0)
	const game = shallowRef<Game | null>(null)
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
	})
	const gameMessages = reactive({ errorText: "", successText: "", bugErrorText: "" })
	const history = reactive<unknown[]>([])
	const chatData = reactive<unknown[]>([])

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
		touch()
	}

	function perform(action: { type: ActionType; [k: string]: unknown }) {
		submit(action)
	}

	function endTurn() {
		const g = getGame()
		g.endTurn(g.currentPlayer, rng)
		touch()
		void persistTurn()
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
		} catch (error) {
			console.error("Error saving game:", error)
			gameMessages.errorText = "Error saving the game"
		}
	}

	function skip() {
		const g = getGame()
		g.skip(g.currentPlayer)
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
		if (gameData && typeof gameData === "object" && (gameData as { v?: number }).v === 1) {
			setGame(deserializeGame(gameData as never))
			return
		}
		const opts = { ...defaultOptions(edition) }
		setGame(Game.start(players, opts, rng))
	}

	function clearMessages() {
		gameMessages.errorText = ""
		gameMessages.successText = ""
		gameMessages.bugErrorText = ""
	}

	return {
		version,
		game,
		state,
		currentPlayer,
		actions,
		canSkip,
		viewSettings,
		gameMessages,
		history,
		chatData,
		setGame,
		getGame,
		useRng,
		submit,
		perform,
		endTurn,
		persistTurn,
		skip,
		possibleMovesFor,
		serialize,
		initFromGameData,
		clearMessages,
		personal: usePersonalStore,
	}
})
