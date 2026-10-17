/**
 * ROW controller: turn/action orchestration and server persistence.
 * Mirrors the role of FCMcontroller / RNBcontroller.
 */
import * as model from "./ROWmodel"
import { deserializeGame, serializeGame } from "./ROWfuncs"
import { useModelStore } from "../stores/ROWstore"
import { usePersonalStore } from "../stores/ROWpersonal"
import { decompress, loadChat, loadRewind, reloadGameData, resign, saveGame, saveZoom, updateDataFromLoadRewind, kickout } from "../backend/ROW_IO"
import { broadcastGameUpdate } from "../backend/ROWwebsocket"
import { ActionType, PHASE_MAIN, PHASE_GAME_OVER } from "./ROWreference"
import { AI_NAME, playAutomaTurns } from "./automa/index"

/** Only the seat whose turn it is may act (practice games excepted). */
export function canAct() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const g = store.game
	if (!g) return false
	if (g.isEnded()) return false
	if (store.saving) return false
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
		return false
	}
	const before = captureUndo()
	try {
		g.perform(g.currentPlayer, action, model.getRng())
	} catch (err) {
		store.gameMessages.errorText = err.message
		return false
	}
	store.clearAction()
	store.clearMovePlan()
	store.undoSnapshot = g.canUndo() ? before : null
	model.recordHistory(action.type, g.currentPlayer, model.actionParams(action))
	store.touch()
	return true
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
	return submit(action)
}

/**
 * Submit the trail move the player has clicked together, clearing the plan.
 * Returns the location landed on, or null when the engine rejected it.
 */
export function commitMove(steps) {
	if (!steps.length) return null
	return perform({ type: ActionType.MOVE, steps: [...steps] }) ? steps[steps.length - 1] : null
}

export async function endTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (store.saving) return
	const g = store.getGame()
	store.gameMessages.errorText = ""
	if (!canAct()) {
		store.gameMessages.errorText = "It is not your turn"
		return
	}
	const endingPlayer = g.currentPlayer
	const before = captureUndo()
	const prevTurnSnapshot = store.wholeTurnResetData
	const prevFrameCount = store.replayFrames.length
	try {
		g.endTurn(g.currentPlayer, model.getRng())
		// The automa plays immediately, so one save commits the human's turn + Garth's whole turn.
		if (personal.automaGame && !g.isEnded() && g.currentPlayer === AI_NAME)
			playAutomaTurns(g, model.getRng())
	} catch (err) {
		// The engine rejected or the automa got stuck: roll the whole local advance back
		// so the client never drifts ahead of the persisted position, and report it.
		store.gameMessages.errorText = err?.message ?? "Could not end the turn"
		model.restoreRng(before)
		store.setGame(deserializeGame(before))
		store.wholeTurnResetData = prevTurnSnapshot
		if (store.replayFrames.length > prevFrameCount) store.replayFrames.pop()
		if (store.history[0]?.type === "END_TURN") store.history.shift()
		store.undoSnapshot = null
		store.touch()
		return
	}
	store.clearAction()
	store.undoSnapshot = null
	model.recordHistory("END_TURN", endingPlayer)
	store.touch()
	// Snapshot after the automa has played, so "Reset Whole Turn" restores the next
	// human turn rather than Garth's (which a human cannot act on).
	model.snapshotTurn()
	store.turn++
	store.saving = true
	let ok = false
	try {
		ok = await persistTurn()
	} finally {
		store.saving = false
	}
	if (!ok) {
		// The server did not accept the end of turn: roll the local advance back
		// so the client never drifts ahead of the persisted position.
		model.restoreRng(before)
		store.setGame(deserializeGame(before))
		store.wholeTurnResetData = prevTurnSnapshot
		if (store.replayFrames.length > prevFrameCount) store.replayFrames.pop()
		if (store.history[0]?.type === "END_TURN") store.history.shift()
		store.turn--
		store.undoSnapshot = null
		store.touch()
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
		model.restoreHistoryFrom(parsed)
		if (Number.isFinite(Number(parsed.turn))) store.turn = Number(parsed.turn)
		personal.latestUpdate = Number(data.latestUpdate ?? personal.latestUpdate)
		window.initData.latestUpdate = data.latestUpdate
		store.missingPlayers = data.missingPlayers ?? []
		store.undoSnapshot = null

		// Exclude missing players from the engine rotation and pick the current
		// player from the remaining seats before writing the position back.
		const g = store.getGame()
		const ended = g.isEnded()
		const allOrder = g.state.playerOrder.length > 0 ? g.state.playerOrder : g.state.players.map((p) => p.name)
		const available = allOrder.filter((p) => !store.missingPlayers.includes(p))
		let current = g.currentPlayer
		if (store.missingPlayers.includes(current) && available.length > 0) current = available[0]
		const rotated = [current, ...available.filter((p) => p !== current)]
		if (!model.alignToCurrentPlayers(rotated)) model.snapshotTurn()

		// Write the rewound position back so the server stays in sync.
		const result = await updateDataFromLoadRewind({
			gameID: personal.gameID,
			latestUpdate: personal.latestUpdate,
			turn: store.turn,
			phase: ended ? PHASE_GAME_OVER : PHASE_MAIN,
			gameData: model.savedPayload(),
			allIsCurrentPlayers: [current],
			allRemainingPlayersInTurnOrder: rotated,
		})
		if (result.syncError) {
			store.gameMessages.rewindErrorText = "It appears you have an older version of the game. Please refresh the page"
			return
		}
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
	const rotated = [current, ...order.filter((p) => p !== current && !store.missingPlayers.includes(p))]
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
	// Never clobber the replay view (or the pre-replay live position) while the
	// user is reviewing history; reloading would also advance latestUpdate past
	// the state that exitReplay restores.
	if (store.viewSettings.showReplay) return
	try {
		const data = await reloadGameData(personal.gameID)
		if (Array.isArray(data.missingPlayers)) store.missingPlayers = data.missingPlayers
		if (data.kickoutVotesData) store.kickoutVotesData = data.kickoutVotesData
		if (data.kickoutVoteThreshold != null) store.kickoutVoteThreshold = Number(data.kickoutVoteThreshold)
		if (data.kickoutRequired != null) personal.kickoutRequired = Number(data.kickoutRequired)
		if (String(data.latestUpdate) === String(personal.latestUpdate)) return
		let gd = data.gameData
		if (typeof gd === "string") gd = JSON.parse(gd)
		if (gd && typeof gd === "object" && gd.v === 1) {
			store.clearAction()
			store.undoSnapshot = null
			model.restoreRng(gd)
			store.setGame(deserializeGame(gd))
			model.restoreHistoryFrom(gd)
			if (Number.isFinite(Number(data.turn))) store.turn = Number(data.turn)
			else if (Number.isFinite(Number(gd.turn))) store.turn = Number(gd.turn)
			// OBG is authoritative for turn order; realign to its current players,
			// dropping seats the server reports as missing.
			const serverOrder = (Array.isArray(data.currentPlayerNames) ? data.currentPlayerNames : []).filter((n) => !store.missingPlayers.includes(n))
			if (!model.alignToCurrentPlayers(serverOrder)) model.snapshotTurn()
		}
		personal.latestUpdate = Number(data.latestUpdate)
		personal.secondsToNextKickout = data.secondsToNextKickout
		store.touch()
		void runAutomaIfNeeded()
	} catch (error) {
		console.error("Error reloading game data:", error)
	}
}

/**
 * If the persisted position is on the RowAI seat (e.g. a previous automa turn was interrupted),
 * play Garth's turn and save. Otherwise a no-op. Never runs during replay or while saving.
 */
export async function runAutomaIfNeeded() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!personal.automaGame || store.saving || store.viewSettings.showReplay) return
	const g = store.game
	if (!g || g.isEnded() || g.currentPlayer !== AI_NAME) return
	store.saving = true
	try {
		playAutomaTurns(g, model.getRng())
		store.touch()
		await persistTurn()
	} catch (error) {
		console.error("Error running the automa:", error)
		store.gameMessages.errorText = "Error running the automa"
	} finally {
		store.saving = false
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

/**
 * Vote to kick out (or, on the decisive vote, actually kick out) the timed-out
 * player. A recorded vote updates the local votes; a completed kickout refreshes
 * the game from the server.
 */
export async function kickoutPlayer(kickedName) {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (personal.gameID < 0 || !kickedName) return
	try {
		const result = await kickout(personal.gameID, kickedName, personal.latestUpdate)
		if (result.syncError) return
		if (result.voteCast) {
			if (result.votesData) store.kickoutVotesData = JSON.parse(result.votesData)
			if (result.threshold != null) store.kickoutVoteThreshold = Number(result.threshold)
			return
		}
		personal.kickoutRequired = 0
		store.kickoutVotesData = {}
		await reloadFromServer()
	} catch (error) {
		console.error("Error kicking out player:", error)
	}
}
