import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
import * as rf from "./URRreference"
import * as funcs from "./URRfuncs"
import * as game from "./URRgame.js"
import i18n from "../i18n.js"

const t = i18n.global.t

export const snapshotState = funcs.snapshotState
export const restoreState = funcs.restoreState

export function initGame() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const initData = window.initData || {}

	personal.name = initData.name || "Guest"
	personal.gameID = initData.gameID
	// The server sends milliseconds; history times are in seconds.
	personal.gameCreationTimestamp = Math.floor(initData.gameCreationTimestamp / 1000)
	personal.pov = initData.pov !== undefined ? initData.pov : -99
	personal.latestUpdate = initData.latestUpdate
	personal.secondsToNextKickout = initData.secondsToNextKickout !== undefined ? initData.secondsToNextKickout : 99999
	personal.kickoutSecondsRemaining = personal.secondsToNextKickout
	personal.kickoutTimerUpdatedAt = Date.now()
	personal.kickoutRequired = initData.kickoutRequired || 0
	personal.kickoutFlexiData = initData.KickoutFlexiDataArray || []
	personal.notes = initData.notes || ""
	personal.yourTurnAudioType = initData.yourTurnAudioType || 0
	personal.chatNotification = initData.chatNotification || false
	personal.finishedGame = initData.finishedGame || false
	personal.gameDataB64 = initData.gameData || {}
	personal.haltPlay = false

	store.gameName = initData.gameName || ""
	store.gameflow.turn = initData.turn || 1
	store.gameflow.phase = initData.phase !== undefined ? initData.phase : rf.PHASE_DIVIDING_NATIONS
	store.chatData = funcs.decompressChatData(initData.chatData)
	store.deleteVotesData = initData.deleteVotesData || {}
	store.statsExcludeVotesData = initData.statsExcludeVotesData || {}
	store.kickoutVotesData = initData.kickoutVotesData || {}
	store.kickoutVoteThreshold = initData.kickoutVoteThreshold || 1

	const startingOptions = initData.startingOptions || []
	personal.trainingGame = startingOptions.includes(102)
	personal.soloGame = (initData.maxPlayers === 1) || false

	const playerNames = initData.playerNames || []
	const gameData = initData.gameData

	try {
		if (gameData && gameData !== "{}" && (typeof gameData === "string" || gameData.players?.length)) importGameData(gameData)
		else initGameFresh(playerNames)
	} catch (error) {
		console.error("Unable to initialize URR:", error)
		store.gameMessages.errorText = error.message
		personal.haltPlay = true
	}

	setMissingPlayers(initData.missingPlayers || [])
	applyShadowDisplayNames(initData.displayNames)
}

// The server hands over the creator's chosen names for the practice-game shadows
// once, then clears its stash. displayName lives in players[], so it is saved
// into gameData and survives later reloads.
export function applyShadowDisplayNames(names) {
	if (!names || names.length === 0) return
	const store = useModelStore()
	for (const [index, name] of names.entries()) {
		const player = store.players.find((candidate) => candidate.name === rf.SHADOW_PLAYER_NAMES[index])
		if (player && name) player.displayName = name
	}
}

export function initGameFresh(playerNames, boardDefinition) {
	const store = useModelStore()
	restoreState(game.createGame(playerNames, boardDefinition))
	store.clearTurnDraft()
	store.history.splice(0)
	addHistory(rf.HIST_NEW_GAME, -1)
}

export function importGameData(obj) {
	const store = useModelStore()
	const data = funcs.importURRmodel(obj)
	const hadDraft = !!store.turnDraft.start
	store.clearTurnDraft()
	if (hadDraft) store.turnDraft.message = t("io.uncommittedCleared")
	restoreState(data.state)
	store.history.splice(0, store.history.length, ...data.history)
}

export function performAction(playerIndex, action) {
	const next = game.applyAction(snapshotState(), playerIndex, action)
	restoreState(next)
	addHistory(next.gameflow.phase === rf.PHASE_GAME_OVER ? rf.HIST_GAME_END : rf.HIST_ACTION, playerIndex, undefined, action)
}

// Missing seats never hold the turn: their remaining duties resolve with the
// bot policy as soon as they come up, so the next real player is notified.
export function playMissingSeats() {
	const store = useModelStore()
	// ponytail: bounded loop, a bot policy that stops advancing just leaves the seat to the App.vue fallback
	for (let guard = 0; guard < 500 && store.gameflow.phase !== rf.PHASE_GAME_OVER; guard++) {
		const player = store.gameflow.turnOrder[0]
		if (!store.players[player]?.isMissing) return
		const action = game.getBotAction(snapshotState())
		if (!action) return
		performAction(player, action)
	}
}

export function addHistory(event, playerIndex, snapshot, action = null) {
	const entry = [event, playerIndex, JSON.stringify(snapshot === undefined ? snapshotState() : snapshot)]
	entry.push(action ? JSON.parse(JSON.stringify(action)) : null)
	entry.push(event === rf.HIST_NEW_GAME ? usePersonalStore().gameCreationTimestamp || Math.floor(Date.now() / 1000) : Math.floor(Date.now() / 1000))
	useModelStore().history.push(entry)
}

export function getPlayerByIndex(index) {
	const store = useModelStore()
	return store.players[index]
}

export function getPlayerIndexByName(name) {
	const store = useModelStore()
	return store.players.findIndex((p) => p.name === name)
}

export function setMissingPlayers(names) {
	const store = useModelStore()
	for (const player of store.players) {
		// Only missing seats carry the flag, so saves and replays stay free of `isMissing: false`.
		if (!names.includes(player.name)) continue
		player.isMissing = true
		player.displayName = `${player.name} (Bot)`
	}
}
