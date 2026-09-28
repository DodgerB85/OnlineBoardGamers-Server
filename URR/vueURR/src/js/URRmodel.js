/**
 * The game model (shared state).
 *
 * The whole model is serialised to / from Game.gameData as plain JSON.
 * Extend exportGameData / importGameData (and snapshotState) as you add real
 * game state so that saves, replays and rewinds keep working.
 */

import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
import * as rf from "./URRreference"
import * as funcs from "./URRfuncs"

export function initGame() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const initData = window.initData || {}

	personal.gameID = initData.gameID
	personal.gameCreationTimestamp = initData.gameCreationTimestamp
	personal.pov = initData.pov !== undefined ? initData.pov : -99
	personal.latestUpdate = initData.latestUpdate
	personal.secondsToNextKickout = initData.secondsToNextKickout !== undefined ? initData.secondsToNextKickout : 99999
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

	if (gameData && store.players.length === 0 && gameData.players && gameData.players.length > 0) {
		importGameData(gameData)
	} else {
		initGameFresh(playerNames)
	}

	rebuildTurnOrder()
}

export function initGameFresh(playerNames) {
	const store = useModelStore()
	store.players.splice(0)
	for (let i = 0; i < playerNames.length; i++) {
		store.players.push({
			name: playerNames[i],
			displayName: playerNames[i],
			colour: rf.ALL_COLOURS[i % rf.ALL_COLOURS.length],
			score: 0,
		})
	}
	store.history.splice(0)
	addHistory(rf.HIST_NEW_GAME, -1, snapshotState())
}

// Rebuild the local turn order from the server's list of current players.
export function rebuildTurnOrder() {
	const store = useModelStore()
	const initData = window.initData || {}
	store.gameflow.fullTurnOrder = store.players.map((_, i) => i)
	let currentNames = initData.currentPlayers || []
	if (currentNames.length === 0) {
		store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
		return
	}
	store.gameflow.turnOrder = currentNames.map((name) => store.players.findIndex((p) => p.name === name)).filter((idx) => idx !== -1)
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
	if (obj.players && obj.players.length > 0) {
		store.players.splice(0, store.players.length, ...JSON.parse(JSON.stringify(obj.players)))
	}
	if (obj.gameflow) {
		store.gameflow.turn = obj.gameflow.turn
		store.gameflow.phase = obj.gameflow.phase
	}
	if (obj.history) {
		store.history.splice(0)
		for (const entry of obj.history) store.history.push(entry)
	}
}

export function exportGameData() {
	const store = useModelStore()
	return {
		players: JSON.parse(JSON.stringify(store.players)),
		gameflow: { turn: store.gameflow.turn, phase: store.gameflow.phase },
		history: JSON.parse(JSON.stringify(store.history)),
	}
}

export function snapshotState() {
	const store = useModelStore()
	return { players: JSON.parse(JSON.stringify(store.players)) }
}

export function addHistory(event, playerIndex, snapshot) {
	const store = useModelStore()
	store.history.push([event, playerIndex, JSON.stringify(snapshot !== undefined ? snapshot : snapshotState())])
}

export function getPlayerByIndex(index) {
	const store = useModelStore()
	return store.players[index]
}

export function getPlayerIndexByName(name) {
	const store = useModelStore()
	return store.players.findIndex((p) => p.name === name)
}
