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
import { COLOURS, SO_TRAINING_GAME, DEFAULT_ZOOM, Edition } from "./ROWreference"
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
	return makeSavedPayload(getGame(), rng, store.history)
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
	if (!g || !order || order.length === 0) return
	const valid = order.filter((n) => g.state.playerStates[n])
	if (valid.length === 0) return
	const same = valid.length === g.state.playerOrder.length && valid.every((n, i) => n === g.state.playerOrder[i]) && g.state.currentPlayer === valid[0]
	if (same) return
	g.state.playerOrder = valid
	g.state.currentPlayer = valid[0]
	g.beginTurn()
	store.touch()
	snapshotTurn()
}

export function initFromGameData(gameData, players, edition) {
	const store = useModelStore()
	store.clearAction()
	if (gameData && typeof gameData === "object" && gameData.v === 1) {
		restoreRng(gameData)
		store.setGame(deserializeGame(gameData))
		if (Array.isArray(gameData.history)) store.history.splice(0, store.history.length, ...gameData.history)
		snapshotTurn()
		return
	}
	store.setGame(Game.start(players, { ...defaultOptions(edition) }, rng))
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
	personal.trainingGame = Array.isArray(initData.startingOptions) && initData.startingOptions.includes(SO_TRAINING_GAME)
	personal.transactionID = String(initData.transactionID ?? "")
	personal.chatNotification = Boolean(initData.chatNotification)
	personal.zoom = Number(initData.myZoomLevel ?? DEFAULT_ZOOM)
	store.turn = Number(initData.turn ?? 1)

	const edition = initData.edition ?? Edition.FIRST
	const names = initData.playerNames ?? []
	const players = names.map((name, i) => ({ name, color: COLOURS[i % COLOURS.length], type: "HUMAN" }))

	let gameData = initData.gameData
	if (typeof gameData === "string") {
		try {
			gameData = JSON.parse(gameData)
		} catch {
			gameData = null
		}
	}

	setRng(new JavaRandom(Number(initData.gameID ?? Date.now())))
	initFromGameData(gameData, players, edition)

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
