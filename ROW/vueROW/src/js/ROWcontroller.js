/**
 * ROW controller: turn/action orchestration and server persistence.
 * Mirrors the role of FCMcontroller / RNBcontroller.
 */
import * as model from "./ROWmodel"
import { deserializeGame, serializeGame } from "./ROWfuncs"
import { useModelStore } from "../stores/ROWstore"
import { usePersonalStore } from "../stores/ROWpersonal"
import { decompress, loadChat, loadRewind, reloadGameData, resign, saveGame, saveZoom, updateDataFromLoadRewind } from "../backend/ROW_IO"
import { broadcastGameUpdate } from "../backend/ROWwebsocket"
import { PHASE_MAIN, PHASE_GAME_OVER } from "./ROWreference"

/** Only the seat whose turn it is may act (practice games excepted). */
export function canAct() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const g = store.game
	if (!g) return false
	if (store.viewSettings.showReplay) return false
	return personal.canPlay(g.currentPlayer)
}

function captureUndo() {
	const g = useModelStore().game
	return g ? JSON.parse(JSON.stringify(serializeGame(g, model.getRng()))) : null
}

export function submit(action) {
	const store = useModelStore()
	const g = store.getGame()
	store.gameMessages.errorText = ""
	if (!canAct()) {
		store.gameMessages.errorText = "It is not your turn"
		return
	}
	const before = captureUndo()
	try {
		g.perform(g.currentPlayer, action, model.getRng())
	} catch (err) {
		store.gameMessages.errorText = err.message
		return
	}
	store.clearAction()
	store.undoSnapshot = g.canUndo() ? before : null
	model.recordHistory(action.type, g.currentPlayer, model.actionParams(action))
	store.touch()
}

/** Undo the last undoable action by restoring the captured snapshot. */
export function undo() {
	const store = useModelStore()
	const g = store.game
	if (!g || !store.undoSnapshot || !g.canUndo() || !canAct()) return
	const snap = store.undoSnapshot
	store.undoSnapshot = null
	store.clearAction()
	model.restoreRng(snap)
	store.setGame(deserializeGame(snap))
	model.recordHistory("UNDO", g.currentPlayer)
	store.touch()
}

export function perform(action) {
	submit(action)
}

export async function endTurn() {
	const store = useModelStore()
	if (store.saving) return
	const g = store.getGame()
	store.gameMessages.errorText = ""
	if (!canAct()) {
		store.gameMessages.errorText = "It is not your turn"
		return
	}
	const endingPlayer = g.currentPlayer
	g.endTurn(g.currentPlayer, model.getRng())
	store.clearAction()
	store.undoSnapshot = null
	model.recordHistory("END_TURN", endingPlayer)
	store.touch()
	model.snapshotTurn()
	store.turn++
	store.saving = true
	try {
		const ok = await persistTurn()
		if (!ok) await reloadFromServer()
	} finally {
		store.saving = false
	}
}

export function skip() {
	const store = useModelStore()
	const g = store.getGame()
	if (!canAct()) {
		store.gameMessages.errorText = "It is not your turn"
		return
	}
	g.skip(g.currentPlayer)
	store.clearAction()
	model.recordHistory("SKIP", g.currentPlayer)
	store.touch()
}

/** Restore the start-of-turn snapshot (IND's resetWholeTurn). */
export function resetWholeTurn() {
	const store = useModelStore()
	const snap = store.wholeTurnResetData
	if (!snap) return
	store.clearAction()
	store.undoSnapshot = null
	model.restoreRng(snap)
	store.setGame(deserializeGame(snap))
	store.touch()
}

/** Load the previous saved position from the server and save it back. */
export async function rewind() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.gameID < 0) return
	if (store.viewSettings.showReplay) {
		store.gameMessages.rewindErrorText = "Exit replay mode first"
		return
	}
	if (store.getGame().isEnded()) {
		store.gameMessages.rewindErrorText = "The game has ended"
		return
	}
	if (store.viewSettings.performingRewind) return
	store.viewSettings.performingRewind = true
	store.gameMessages.rewindErrorText = ""
	try {
		const data = await loadRewind(personal.gameID, personal.latestUpdate)
		if (data.syncError) {
			store.gameMessages.rewindErrorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
		if (data.errorMessage || !data.gameData) {
			store.gameMessages.rewindErrorText = data.errorMessage ?? "No rewind data available"
			return
		}
		let parsed = data.gameData
		if (typeof parsed === "string") parsed = JSON.parse(parsed)
		model.restoreRng(parsed)
		store.setGame(deserializeGame(parsed))
		personal.latestUpdate = Number(data.latestUpdate ?? personal.latestUpdate)
		window.initData.latestUpdate = data.latestUpdate
		store.missingPlayers = data.missingPlayers ?? []
		store.undoSnapshot = null
		model.snapshotTurn()

		// Write the rewound position back so the server stays in sync.
		const g = store.getGame()
		const ended = g.isEnded()
		const order = g.state.playerOrder.length > 0 ? g.state.playerOrder : g.state.players.map((p) => p.name)
		const current = g.currentPlayer
		const rotated = [current, ...order.filter((p) => p !== current)]
		const result = await updateDataFromLoadRewind({
			gameID: personal.gameID,
			turn: store.turn,
			phase: ended ? PHASE_GAME_OVER : PHASE_MAIN,
			gameData: model.savedPayload(),
			allIsCurrentPlayers: [current],
			allRemainingPlayersInTurnOrder: rotated,
		})
		personal.latestUpdate = Number(result.latestUpdate)
		window.initData.latestUpdate = result.latestUpdate
		personal.secondsToNextKickout = result.secondsToNextKickout
		broadcastGameUpdate()
		store.touch()
	} catch (error) {
		console.error("Error rewinding the game:", error)
		store.gameMessages.rewindErrorText = "Error rewinding the game"
	} finally {
		store.viewSettings.performingRewind = false
	}
}

/** Persist the whole state and hand the turn to the next player. */
export async function persistTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.gameID < 0) return true
	const g = store.getGame()
	const ended = g.isEnded()
	const order = g.state.playerOrder.length > 0 ? g.state.playerOrder : g.state.players.map((p) => p.name)
	const current = g.currentPlayer
	const rotated = [current, ...order.filter((p) => p !== current)]
	try {
		const result = await saveGame({
			gameID: personal.gameID,
			latestUpdate: personal.latestUpdate,
			gameData: model.savedPayload(),
			turn: store.turn,
			phase: ended ? PHASE_GAME_OVER : PHASE_MAIN,
			status: ended ? "FINISHED" : "ACTIVE",
			allIsCurrentPlayers: [current],
			allRemainingPlayersInTurnOrder: rotated,
			saveRewind: true,
			winner: ended ? g.ranking()[0] : undefined,
			finalPositions: ended ? g.ranking().map((name) => g.state.players.findIndex((p) => p.name === name)) : undefined,
		})
		if (result.syncError) {
			store.gameMessages.errorText = "It appears you have an older version of the game. Please refresh the page"
			return false
		}
		personal.latestUpdate = Number(result.latestUpdate)
		window.initData.latestUpdate = result.latestUpdate
		personal.secondsToNextKickout = result.secondsToNextKickout
		broadcastGameUpdate()
		return true
	} catch (error) {
		console.error("Error saving game:", error)
		store.gameMessages.errorText = "Error saving the game"
		return false
	}
}

/** Re-fetch the persisted position (websocket message or polling fallback). */
export async function reloadFromServer() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.gameID < 0) return
	try {
		const data = await reloadGameData(personal.gameID)
		if (String(data.latestUpdate) === String(personal.latestUpdate)) return
		let gd = data.gameData
		if (typeof gd === "string") gd = JSON.parse(gd)
		if (gd && typeof gd === "object" && gd.v === 1) {
			store.clearAction()
			store.undoSnapshot = null
			model.restoreRng(gd)
			store.setGame(deserializeGame(gd))
			model.snapshotTurn()
		}
		personal.latestUpdate = Number(data.latestUpdate)
		personal.secondsToNextKickout = data.secondsToNextKickout
	} catch (error) {
		console.error("Error reloading game data:", error)
	}
}

/** Re-fetch incoming chat (websocket message or polling fallback). */
export async function reloadChat() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.gameID < 0) return
	try {
		const raw = await loadChat(personal.gameID)
		const parsed = decompress(raw)
		if (Array.isArray(parsed)) store.chatData.splice(0, store.chatData.length, ...parsed)
	} catch (error) {
		console.error("Error reloading chat:", error)
	}
}

/** Persist the saved zoom level (debounced). */
let zoomSaveTimer
export function persistZoom(level) {
	const personal = usePersonalStore()
	if (personal.gameID < 0) return
	if (zoomSaveTimer) clearTimeout(zoomSaveTimer)
	zoomSaveTimer = setTimeout(() => {
		void saveZoom(personal.gameID, level).catch(() => undefined)
	}, 800)
}

/** Resign from the game (server marks the player missing). */
export async function resignGame() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.gameID < 0) return
	try {
		await resign(personal.gameID)
		model.recordHistory("RESIGN", personal.name)
		await reloadFromServer()
	} catch (error) {
		console.error("Error resigning:", error)
		store.gameMessages.errorText = "Error resigning from the game"
	}
}
