import { useModelStore } from "../stores/URRstore.js"
import { usePersonalStore } from "../stores/URRpersonal.js"
import * as rf from "./URRreference"
import * as funcs from "./URRfuncs"
import { createGame, applyAction } from "./URRgame.js"
import { createPrintedBoard } from "./URRboard.js"
import { createBoard } from "./URRmap.js"

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
	// Earlier rules saves had no board. Preserve their economy and turn order.
	if (data.board?.areas.length === 0) data.board = createBoard(createPrintedBoard())
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
	addHistory(next.gameflow.phase === rf.PHASE_GAME_OVER ? rf.HIST_GAME_END : rf.HIST_ACTION, playerIndex, undefined, action)
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
