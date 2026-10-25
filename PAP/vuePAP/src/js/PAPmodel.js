/**
 * The game model (shared state).
 *
 * Game.gameData holds plain JSON: {v, seed, options, names, actions, state}.
 * `actions` is the full move log; `state` is a cache of replaying it through the engine,
 * so replays and history come straight from the engine (see PAP/ENGINE_SPEC.md).
 */

import { useModelStore } from "../stores/PAPstore.js"
import { usePersonalStore } from "../stores/PAPpersonal.js"
import * as rf from "./PAPreference"
import * as funcs from "./PAPfuncs"
import * as engine from "./engine/index.js"

export function initGame() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const initData = window.initData || {}

	personal.name = initData.name || ""
	personal.gameID = initData.gameID
	personal.gameCreationTimestamp = initData.gameCreationTimestamp
	personal.pov = initData.pov !== undefined ? initData.pov : -99
	personal.latestUpdate = initData.latestUpdate
	personal.secondsToNextKickout = initData.secondsToNextKickout !== undefined ? initData.secondsToNextKickout : 99999
	personal.notes = initData.notes || ""
	personal.yourTurnAudioType = initData.yourTurnAudioType || 0
	personal.chatNotification = initData.chatNotification || false
	personal.finishedGame = initData.finishedGame || false
	personal.haltPlay = false

	store.gameName = initData.gameName || ""
	store.gameflow.turn = initData.turn || 1
	store.gameflow.phase = initData.phase !== undefined ? initData.phase : rf.PHASE_MAIN
	store.chatData = funcs.decompressChatData(initData.chatData)
	store.deleteVotesData = initData.deleteVotesData || {}
	store.statsExcludeVotesData = initData.statsExcludeVotesData || {}
	store.kickoutVotesData = initData.kickoutVotesData || {}
	store.kickoutVoteThreshold = initData.kickoutVoteThreshold || 1

	const startingOptions = initData.startingOptions || []
	personal.trainingGame = startingOptions.includes(102)
	personal.soloGame = (initData.maxPlayers === 1) || false

	const gameData = initData.gameData
	if (gameData && gameData.v === 1) {
		importGameData(gameData)
	} else {
		initGameFresh(initData.playerNames || [], { softerEnding: startingOptions.includes(rf.SO_SOFTER_ENDING) }, initData.gameID)
	}
	rebuildTurnOrder()
}

// The seed comes from the game id, so every client that loads an unsaved game builds the same deal.
export function initGameFresh(playerNames, options, gameID) {
	const store = useModelStore()
	store.seed = ((gameID || 1) * 2654435761) >>> 0
	store.options = { ...options, rulesVersion: 2 }
	store.names = [...playerNames]
	store.actions.splice(0)
	store.game = engine.createGame(store.seed, store.names, store.options)
	syncPlayers()
}

export function importGameData(obj) {
	const store = useModelStore()
	if (!obj) return
	if (typeof obj === "string") {
		try {
			obj = JSON.parse(obj)
		} catch {
			return
		}
	}
	if (obj.v !== 1) return
	store.seed = obj.seed
	const rulesVersion = Number.isInteger(obj.options?.rulesVersion) ? obj.options.rulesVersion : 1
	store.options = { ...obj.options, rulesVersion }
	store.names = obj.names
	store.actions.splice(0, store.actions.length, ...obj.actions)
	store.game = obj.state
	store.game.options = { ...store.game.options, rulesVersion }
	syncPlayers()
	rebuildTurnOrder()
}

export function exportGameData() {
	const store = useModelStore()
	return { v: 1, seed: store.seed, options: store.options, names: store.names, actions: store.actions, state: store.game }
}

// Keep the scaffold's player list (used by the shared panels) in step with the engine state.
function syncPlayers() {
	const store = useModelStore()
	const s = store.game
	store.players.splice(0, store.players.length, ...s.players.map((p, i) => ({
		name: p.name,
		displayName: p.name,
		colour: rf.ALL_COLOURS[i % rf.ALL_COLOURS.length],
		score: s.result ? s.result.rows.find(r => r.seat === i).vp : p.recognized,
	})))
	store.gameflow.turn = s.year
	store.gameflow.phase = s.phase === "over" ? rf.PHASE_GAME_OVER : rf.PHASE_MAIN
}

// Exactly one seat acts at a time; the engine says which.
export function rebuildTurnOrder() {
	const store = useModelStore()
	store.gameflow.fullTurnOrder = store.game.order ? [...store.game.order] : store.players.map((_, i) => i)
	const seat = engine.activeSeat(store.game)
	store.gameflow.turnOrder = seat === null ? [] : [seat]
}

// Apply one move for the viewer's seat. Returns the engine error message, or "" on success.
export function act(action) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const seat = personal.trainingGame ? engine.activeSeat(store.game) : personal.pov
	try {
		store.game = engine.applyAction(store.game, seat, action)
	} catch (e) {
		if (e instanceof engine.PAPError) return e.message
		throw e
	}
	store.actions.push({ seat, a: action, t: Date.now() })
	syncPlayers()
	rebuildTurnOrder()
	return ""
}

// Engine states after each action, for the replay panel.
export function buildReplayFrames() {
	const store = useModelStore()
	let s = engine.createGame(store.seed, store.names, store.options)
	const frames = [s]
	// Plain copies: the engine stores action arrays in state, and Vue reactive proxies cannot be structuredClone'd.
	for (const { seat, a } of JSON.parse(JSON.stringify(store.actions))) {
		s = engine.applyAction(s, seat, a)
		frames.push(s)
	}
	return frames
}

export function getPlayerByIndex(index) {
	const store = useModelStore()
	return store.players[index]
}

export function getPlayerIndexByName(name) {
	const store = useModelStore()
	return store.players.findIndex((p) => p.name === name)
}
