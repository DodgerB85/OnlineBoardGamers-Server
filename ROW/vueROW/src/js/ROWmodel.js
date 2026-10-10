/**
 * ROW model: builds the game, exposes the engine, and handles persistence.
 * Mirrors the role of FCMmodel / RNBmodel.
 */
import { JavaRandom, defaultOptions } from "./ROWcore"
import { Game } from "./ROWengine"
import { deserializeGame, serializeGame, savedPayload as makeSavedPayload } from "./ROWfuncs"
import { decompress } from "../backend/ROW_IO"
import { startWebSocket } from "../backend/ROWwebsocket"
import { useModelStore } from "../stores/ROWstore"
import { usePersonalStore } from "../stores/ROWpersonal"
import { COLOURS, SO_TRAINING_GAME, DEFAULT_ZOOM, Edition, Mode, BuildingsOption, PlayerOrderOption, Variant } from "./ROWreference"
import { AI_NAME } from "./automa/index"
import * as controller from "./ROWcontroller"

/** The single RNG driving the engine (module-level; the store is a singleton). */
let rng = new JavaRandom(Date.now())

export function getRng() {
	return rng
}

export function setRng(r) {
	rng = r
}

export function getGame() {
	return useModelStore().getGame()
}

export function setGame(g) {
	useModelStore().setGame(g)
}

export function currentPlayerState() {
	return getGame().currentPlayerState()
}

export function playerState(name) {
	return getGame().playerState(name)
}

/**
 * Legal trail moves. `stepsLeft` and `from` let the UI preview the part of the
 * move the player has not committed yet (see the store's move plan).
 */
export function possibleMovesFor(player, stepsLeft, from) {
	const g = getGame()
	return g.getTrail().possibleMovesFrom(player, g.playerState(player).balance, stepsLeft ?? g.getStepLimit(), g.state.players.length, from)
}

export function serialize() {
	return serializeGame(getGame())
}

export function actionParams(action) {
	return Object.entries(action)
		.filter(([k]) => k !== "type")
		.map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
}

export function recordHistory(type, player, params = []) {
	const store = useModelStore()
	store.history.unshift({ type, player, time: Date.now(), params })
	if (store.history.length > 200) store.history.length = 200
}

/** Restore the RNG seed captured in a serialized snapshot, if present. */
export function restoreRng(serialized) {
	const state = serialized?.rngState
	if (state && rng instanceof JavaRandom) rng.setState(state)
}

export function savedPayload() {
	const store = useModelStore()
	return { ...makeSavedPayload(getGame(), rng, store.history), turn: store.turn }
}

/** Detach a serialized copy of the current (turn-start) position + RNG. */
export function snapshotTurn() {
	const store = useModelStore()
	const g = store.game
	const snap = g ? JSON.parse(JSON.stringify(serializeGame(g, rng))) : null
	store.wholeTurnResetData = snap
	if (snap && !store.viewSettings.showReplay) {
		store.replayFrames.push(snap)
		if (store.replayFrames.length > 100) store.replayFrames.shift()
	}
}

/**
 * OBG is authoritative for turn order; realign the engine when the persisted
 * state disagrees (e.g. a fresh game whose order was randomized client-side).
 */
export function alignToCurrentPlayers(order) {
	const store = useModelStore()
	const g = store.game
	if (!g || !order || order.length === 0) return false
	const valid = order.filter((n) => g.state.playerStates[n])
	if (valid.length === 0) return false
	const same = valid.length === g.state.playerOrder.length && valid.every((n, i) => n === g.state.playerOrder[i]) && g.state.currentPlayer === valid[0]
	if (same) return false
	g.state.playerOrder = valid
	g.state.currentPlayer = valid[0]
	g.beginTurn(false)
	store.touch()
	snapshotTurn()
	return true
}

/** Restore the history log carried inside a serialized payload, if present. */
export function restoreHistoryFrom(payload) {
	if (!payload || !Array.isArray(payload.history)) return
	const store = useModelStore()
	store.history.splice(0, store.history.length, ...payload.history)
}

export function initFromGameData(gameData, players, options) {
	const store = useModelStore()
	store.clearAction()
	if (gameData && typeof gameData === "object" && gameData.v === 1) {
		restoreRng(gameData)
		store.setGame(deserializeGame(gameData))
		restoreHistoryFrom(gameData)
		if (Number.isFinite(Number(gameData.turn))) store.turn = Number(gameData.turn)
		snapshotTurn()
		return
	}
	// An empty payload ({}) means a brand-new game; anything else is a
	// corrupted/unrecognised state and must not silently start a fresh game.
	const hasData = gameData && typeof gameData === "object" && Object.keys(gameData).length > 0
	if (hasData) {
		store.gameMessages.errorText = "Could not load the saved game (unrecognised data). Please report this bug."
		return
	}
	store.setGame(Game.start(players, { ...defaultOptions(options.edition, options) }, rng))
	snapshotTurn()
}

/** Initialise the store from the Django-rendered `window.initData` payload. */
export function initGame() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const initData = window.initData ?? {}

	personal.gameID = Number(initData.gameID ?? -1)
	personal.name = String(initData.name ?? "")
	personal.pov = Number(initData.pov ?? -99)
	personal.latestUpdate = Number(initData.latestUpdate ?? 0)
	personal.gameCreationTimestamp = Number(initData.gameCreationTimestamp ?? 0)
	personal.notes = String(initData.notes ?? "")
	personal.finishedGame = Boolean(initData.finishedGame)
	personal.secondsToNextKickout = Number(initData.secondsToNextKickout ?? 99999)
	personal.kickoutRequired = Number(initData.kickoutRequired ?? 0)
	store.kickoutVotesData = initData.kickoutVotesData ?? {}
	store.kickoutVoteThreshold = Number(initData.kickoutVoteThreshold ?? 0)
	store.deleteVotesData = initData.deleteVotesData ?? {}
	store.statsExcludeVotesData = initData.statsExcludeVotesData ?? {}
	personal.votedToDelete = Boolean(store.deleteVotesData[personal.name])
	personal.votedToExclude = Boolean(store.statsExcludeVotesData[personal.name])
	personal.trainingGame = Array.isArray(initData.startingOptions) && initData.startingOptions.includes(SO_TRAINING_GAME)
	personal.transactionID = String(initData.transactionID ?? "")
	personal.chatNotification = Boolean(initData.chatNotification)
	personal.zoom = Number(initData.myZoomLevel ?? DEFAULT_ZOOM)
	store.turn = Number(initData.turn ?? 1)

	const edition = initData.edition ?? Edition.FIRST
	// Game options carried as starting options by the Django views.
	const options = {
		edition,
		mode: initData.mode ?? Mode.ORIGINAL,
		buildings: initData.buildings ?? BuildingsOption.RANDOMIZED,
		playerOrder: initData.playerOrder ?? PlayerOrderOption.RANDOMIZED,
		variant: initData.variant ?? Variant.ORIGINAL,
		railsToTheNorth: Boolean(initData.railsToTheNorth),
		simmental: Boolean(initData.simmental),
		stationMasterPromos: Boolean(initData.stationMasterPromos),
		building11: Boolean(initData.building11),
		building13: Boolean(initData.building13),
		difficulty: initData.difficulty ?? "EASY",
	}
	const names = initData.playerNames ?? []
	personal.automaGame = names.includes(AI_NAME)
	const players = names.map((name, i) => ({ name, color: COLOURS[i % COLOURS.length], type: name === AI_NAME ? "COMPUTER" : "HUMAN" }))

	let gameData = initData.gameData
	if (typeof gameData === "string") {
		try {
			gameData = JSON.parse(gameData)
		} catch {
			// A non-empty string that will not parse is corrupted save data.
			gameData = gameData.trim() === "" || gameData.trim() === "{}" ? {} : { corrupt: true }
		}
	}

	setRng(new JavaRandom(Number(initData.gameID ?? Date.now())))
	initFromGameData(gameData, players, options)

	// OBG is authoritative for whose turn it is; align the engine to it.
	alignToCurrentPlayers(Array.isArray(initData.currentPlayers) ? initData.currentPlayers : [])

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
	void controller.runAutomaIfNeeded()
}

/**
 * Live updates: start the websocket and, as a fallback, poll for newer data.
 * Both paths funnel into controller.reloadFromServer(), which no-ops when the
 * server version matches the local one.
 */
function setupLiveUpdates() {
	const personal = usePersonalStore()
	if (personal.gameID < 0) return
	void startWebSocket().then((ws) => {
		if (ws)
			ws.onmessage = () => {
				void controller.reloadFromServer()
				void controller.reloadChat()
			}
	})
	setInterval(() => {
		void controller.reloadFromServer()
		void controller.reloadChat()
	}, 20000)
}
