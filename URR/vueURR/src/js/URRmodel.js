import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
import * as rf from "./URRreference"
import * as funcs from "./URRfuncs"
import { createGame, applyAction } from "./URRgame.js"

const STATE_FIELDS = ["version", "players", "gameflow", "states", "nations", "board", "landPrices", "era", "cardSupply", "rain", "nextDiggerId"]

export function initGame() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const initData = window.initData || {}

	personal.name = initData.name || "Guest"
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

	try {
		if (gameData && (typeof gameData === "string" || gameData.players?.length)) importGameData(gameData)
		else initGameFresh(playerNames)
	} catch (error) {
		console.error("Unable to initialize URR:", error)
		store.gameMessages.errorText = error.message
		personal.haltPlay = true
	}
}

export function initGameFresh(playerNames, boardDefinition = null) {
	const store = useModelStore()
	restoreState(createGame(playerNames, boardDefinition))
	store.history.splice(0)
	addHistory(rf.HIST_NEW_GAME, -1)
}

// The saved engine owns turn order, including auctions and consent requests.
// Server names are only a fallback for the old, unversioned scaffold.
export function rebuildTurnOrder() {
	const store = useModelStore()
	if (store.gameflow.primogeniture !== undefined) return
	const currentNames = window.initData?.currentPlayers || []
	store.gameflow.fullTurnOrder = Array.from(store.players.keys())
	store.gameflow.turnOrder = currentNames.map((name) => store.players.findIndex((player) => player.name === name)).filter((index) => index !== -1)
}

export function restoreState(snapshot) {
	const store = useModelStore()
	const data = JSON.parse(JSON.stringify(snapshot))
	for (const field of STATE_FIELDS) {
		if (data[field] === undefined) throw new Error(`Missing URR state field: ${field}`)
	}
	store.players.splice(0, store.players.length, ...data.players)
	for (const key of Object.keys(store.gameflow)) delete store.gameflow[key]
	Object.assign(store.gameflow, data.gameflow)
	for (const field of STATE_FIELDS) {
		if (field !== "players" && field !== "gameflow") store[field] = data[field]
	}
}

export function importGameData(obj) {
	const store = useModelStore()
	const data = typeof obj === "string" ? JSON.parse(obj) : obj
	if (!data || !data.players?.length) throw new Error("Saved URR data contains no players")
	if (data.version === undefined) {
		// The old scaffold stored only names, dummy turns and zero scores, not
		// game mechanics. Never apply those dummy phases to a real position.
		console.warn("Initializing rules state from a legacy URR scaffold save")
		initGameFresh(data.players.map((player) => player.name))
		return
	}
	if (data.version !== rf.GAME_DATA_VERSION) throw new Error("Unsupported URR save version")
	restoreState(data)
	store.history.splice(0, store.history.length, ...JSON.parse(JSON.stringify(data.history || [])))
}

export function exportGameData() {
	return { ...snapshotState(), history: JSON.parse(JSON.stringify(useModelStore().history)) }
}

export function snapshotState() {
	const store = useModelStore()
	return JSON.parse(JSON.stringify(Object.fromEntries(STATE_FIELDS.map((field) => [field, store[field]]))))
}

export function performAction(playerIndex, action) {
	const next = applyAction(snapshotState(), playerIndex, action)
	restoreState(next)
	addHistory(next.gameflow.phase === rf.PHASE_GAME_OVER ? rf.HIST_GAME_END : rf.HIST_ACTION, playerIndex)
}

export function addHistory(event, playerIndex, snapshot) {
	useModelStore().history.push([event, playerIndex, JSON.stringify(snapshot === undefined ? snapshotState() : snapshot)])
}

export function getPlayerByIndex(index) {
	const store = useModelStore()
	return store.players[index]
}

export function getPlayerIndexByName(name) {
	const store = useModelStore()
	return store.players.findIndex((p) => p.name === name)
}
