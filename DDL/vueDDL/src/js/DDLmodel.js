/**
 * Model: serialisation, initial setup and the thin layer that applies rules
 * mutations to the Pinia store and records history snapshots.
 */

import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"
import * as rf from "./DDLreference.js"
import * as funcs from "./DDLfuncs.js"
import * as rules from "./DDLrules.js"

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
	personal.transactionID = initData.transactionID || ""
	personal.haltPlay = false
	personal.name = initData.name || "NAME"

	if (initData.liveWS !== undefined) personal.liveWS = initData.liveWS

	store.gameName = initData.gameName || ""
	store.chatData.splice(0, store.chatData.length, ...funcs.decompressChatData(initData.chatData, personal.gameCreationTimestamp))
	store.deleteVotesData = initData.deleteVotesData || {}
	store.statsExcludeVotesData = initData.statsExcludeVotesData || {}
	store.kickoutVotesData = initData.kickoutVotesData || {}
	store.kickoutVoteThreshold = initData.kickoutVoteThreshold || 1

	const startingOptions = initData.startingOptions || []
	personal.trainingGame = startingOptions.includes(102)
	personal.soloGame = (initData.playerNames || []).length === 1

	if (initData.gameData) {
		importGameData(initData.gameData)
	}
	if (store.players.length === 0 && (personal.pov >= 0 || rf.SUPER_USERS.includes(personal.name))) {
		initGameFresh(initData, startingOptions)
	}

	personal.votedToExclude = store.statsExcludeVotesData[personal.name] === true
	personal.votedToDelete = store.deleteVotesData[personal.name] === true
	personal.myTradeOffers = store.board.trades.filter((t) => t.status === "pending" && t.to === personal.pov)

	rebuildTurnOrder()
}

function displayNameFor(initData, name, index) {
	let displayNames = initData.displayNames
	if (typeof displayNames === "string" && displayNames.length > 0) {
		try {
			displayNames = JSON.parse(displayNames)
		} catch {
			displayNames = []
		}
	}
	if (!Array.isArray(displayNames)) return name
	if (name === "SHADOW") return displayNames[0] || name
	const match = /^SHADOW_(\d+)$/.exec(name)
	if (match) return displayNames[Number(match[1]) - 1] || name
	return name
}

export function initGameFresh(initData, startingOptions) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const names = initData.playerNames || []
	const auction = startingOptions.includes(rf.SO_AUCTION) && !personal.trainingGame
	const seed = Number(initData.setupSeed || initData.playerOrderSeed || 1)

	const state = rules.createInitialState({
		playerNames: names,
		colours: names.map((_, i) => i % rf.ALL_COLOURS.length),
		seed,
		auction,
	})

	for (let i = 0; i < state.players.length; i++) {
		state.players[i].displayName = displayNameFor(initData, state.players[i].name, i)
	}
	state.players.forEach((player, index) => {
		player.displayName = displayNameFor(initData, player.name, index)
	})

	applyState(state)
	if (store.history.length === 0) addHistory(rf.HIST_NEW_GAME, -1)
}

export function applyState(state) {
	const store = useModelStore()
	store.players.splice(0, store.players.length, ...funcs.deepClone(state.players))
	store.replaceBoard(funcs.deepClone(state.board))
	store.replaceGameflow(funcs.deepClone(state.gameflow))
	store.history.splice(0, store.history.length, ...(state.history || []))
	store.resetContext()
}

export function applySnapshot(snapshot) {
	const store = useModelStore()
	if (!snapshot) return
	store.players.splice(0, store.players.length, ...funcs.deepClone(snapshot.players || []))
	store.replaceBoard(funcs.deepClone(snapshot.board || {}))
	store.replaceGameflow(funcs.deepClone(snapshot.gameflow || {}))
	store.resetContext()
}

export function stateFromStore() {
	const store = useModelStore()
	return { players: store.players, board: store.board, gameflow: store.gameflow }
}

export function importGameData(input) {
	const store = useModelStore()
	const obj = funcs.decompressGameData(input)
	if (!obj) return
	store.players.splice(0, store.players.length, ...(obj.players || []))
	store.replaceBoard(obj.board || {})
	store.replaceGameflow(obj.gameflow || {})
	store.history.splice(0, store.history.length, ...(obj.history || []))
	store.resetContext()
}

export function exportObject() {
	const store = useModelStore()
	return {
		version: 1,
		players: funcs.deepClone(store.players),
		board: funcs.deepClone(store.board),
		gameflow: funcs.deepClone(store.gameflow),
		history: funcs.deepClone(store.history),
	}
}

export function exportGameData() {
	return funcs.compressGameData(exportObject())
}

export function snapshotState() {
	const store = useModelStore()
	return funcs.deepClone({
		players: store.players,
		board: store.board,
		gameflow: store.gameflow,
	})
}

export function addHistory(event, playerIndex, params = []) {
	const store = useModelStore()
	store.history.push([event, playerIndex, snapshotState(), params])
	if (store.history.length > 200) store.history.splice(0, store.history.length - 200)
}

export function rebuildTurnOrder() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const initData = window.initData || {}
	const names = initData.currentPlayers || []
	if (names.length === 0) return
	const order = names.map((name) => store.players.findIndex((p) => p.name === name)).filter((idx) => idx !== -1)
	if (order.length > 0 && store.gameflow.turnOrder.length === 0 && store.gameflow.phase !== rf.PHASE_GAME_OVER) {
		store.gameflow.turnOrder = order
	}
	if (store.gameflow.fullTurnOrder.length === 0) store.gameflow.fullTurnOrder = store.players.map((_, i) => i)
}

// Setup wrappers -----------------------------------------------------------

export function submitGear(playerIndex, gearKeys) {
	return rules.submitGear(stateFromStore(), playerIndex, gearKeys)
}

export function submitStartingPlanet(playerIndex, planetId) {
	return rules.submitStartingPlanet(stateFromStore(), playerIndex, planetId)
}

export function resolveAuction(bids, order) {
	const store = useModelStore()
	const result = rules.resolveAuction(stateFromStore(), bids, order)
	if (result.ok) addHistory(rf.HIST_AUCTION, -1, [bids, order])
	return result
}

export function getPlayerIndexByName(name) {
	const store = useModelStore()
	return store.players.findIndex((p) => p.name === name)
}

export function getPlayerByIndex(index) {
	const store = useModelStore()
	return store.players[index]
}
