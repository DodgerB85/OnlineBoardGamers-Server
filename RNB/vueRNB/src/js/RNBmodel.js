/**
 * Contains functions that alter the game state,
 * IE anything that needs to be held in the "digital"
 * model.
 * So the functions in here should allow a replay of
 * the game to be re-created.
 * These should not directly update the "view" or
 * what the player sees.
 *
 * In general, it is better to provide all the required information
 * to the function (EG playerIndex, hexes) rather than relying
 * on knowing the currentPlayer.
 * This makes it possible to more easily recreate replays later.
 *
 */

/**
AVAILABLE FUNCTIONS
===================
initGame()
getTransporterByID(transporterID)
getResByID(resID)
getHexByID(hexID)
getEdgeDataFromHexID(hexID1, hexID2)
isHexIDshore(hexID)
addTransporterToGame(playerIndex, transporterType, location)
addResourceToGame_core(resource, location)
removeResourcesFromGameUsingVertex_core(hexID, vertex, resArr)
removeResourcesFromGameUsingTransporter(transporterID, resArr)
addHistory(event, playerIndex, timeOffset, params)
addHexToMap+core(coord, rotation, hexTerrainID)
showErrorPopup(clientX, clientY, htmlMessage)
resourceCountByType(resourceTypes)


*/
import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"

import * as rf from "./RNBreference.js"
import * as map from "./RNBmap"
import * as controller from "./RNBcontroller"
import * as funcs from "./RNBfuncs"
import * as IO from "../backend/RNB_IO.js"
import * as WS from "../backend/RNBwebsocket.js"
import * as hd from "./RNBhex.js"
import * as util from "./RNButil.js"
import * as loc from "./RNBlocation.js"
import * as replay from "../components/History/RNBreplay.js"
import * as context from "./RNBcontext.js"
import * as stack from "./RNBstack.js"
import * as highlight from "./RNBhighlight.js"
import * as view from "./RNBview.js"

export async function initGame() {
	const store = useModelStore()
	const personal = usePersonalStore()

	personal.haltPlay = true

	// Set RNB options
	let options = window.initData.preferredRNBoptions
	personal.preferredColour = options[0]
	personal.preferredPlayerAid = options[1]
	store.viewSettings.colourOverlay = options[2] ?? 0

	store.internalStartingOptions = [...window.initData.startingOptions]

	if (store.internalStartingOptions.includes(rf.SO_USE_SOLO_MINE_RULES)) {
		store.gameOptions.useSoloMineRules = true
	}

	if (store.internalStartingOptions.includes(rf.SO_ELECTRICITY)) {
		store.gameOptions.useElectricity = true
	}
	if (store.internalStartingOptions.includes(rf.SO_MANAGEMENT)) {
		store.gameOptions.useManagement = true
	}
	if (store.internalStartingOptions.includes(rf.SO_ART)) {
		store.gameOptions.useArt = true
	}
	if (store.internalStartingOptions.includes(rf.SO_TRADE)) {
		store.gameOptions.useTrade = true
	}
	if (store.internalStartingOptions.includes(rf.SO_FUNDAMENTAL_RESEARCH)) {
		store.gameOptions.useFundamentalResearch = true
	}
	if (store.internalStartingOptions.includes(rf.SO_PLANES)) {
		store.gameOptions.usePlanes = true
	}
	if (store.internalStartingOptions.includes(rf.SO_BOMBS)) {
		store.gameOptions.useBombs = true
	}
	if (store.internalStartingOptions.includes(rf.SO_JUMP_START)) {
		store.gameOptions.useJumpStart = true
	}

	// Set up all Data
	personal.gameID = window.initData.gameID
	store.gameName = window.initData.gameName
	personal.gameCreationTimestamp = window.initData.gameCreationTimestamp / 1000
	personal.finishedGame = window.initData.finishedGame

	if (store.internalStartingOptions.includes(rf.SO_TRAINING_GAME)) {
		personal.trainingGame = true
		store.trainingGameSkipConflictPhase = true
	}
	store.refSize = window.initData.myZoomLevel * 100

	store.deleteVotesData = window.initData.deleteVotesData
	store.statsExcludeVotesData = window.initData.statsExcludeVotesData
	store.kickoutVotesData = window.initData.kickoutVotesData || {}
	store.kickoutVoteThreshold = window.initData.kickoutVoteThreshold

	personal.liveWS = false
	// Set up logged in player, but not involved
	if (window.initData.pov === -9 || window.initData.pov === -1 || window.initData.pov >= 0) {
		personal.name = window.initData.name
		store.chatData = funcs.decompressChatData(window.initData.chatData)
		personal.latestUpdate = window.initData.latestUpdate
	}

	// 1. Get the string from the script tag
	const gameDataB64 = window.initData.gameDataB64
	personal.gameDataB64 = window.initData.gameDataB64

	// If NOT your game, and NO game data, then game hasn't started
	if (window.initData.pov < 0 && gameDataB64 === "") {
		var heading = document.createElement("h1")
		heading.textContent = "The game has not yet started"
		var body = document.body
		body.appendChild(heading)
		return
	}

	personal.pov = window.initData.pov

	// Set up Involved Player data
	if (personal.pov >= 0) {
		personal.liveWS = true
		personal.myStatsExcludeConsent = window.initData.myStatsExcludeConsent
		personal.statsExcludedGame = window.initData.statsExcludedGame

		personal.notes = funcs.htmlUnescape(window.initData.notes)
		if (window.initData.chatNotification) store.viewSettings.showChat = true
		personal.yourTurnAudioType = window.initData.yourTurnAudioType

		// ROUTING CONDITIONAL: Branch based on existing Save Data presence
		if (gameDataB64 === "") {
			await initNewGame()
		} else {
			await initLoadGame(gameDataB64)
		}
	} else if (gameDataB64 !== "") {
		// Non-involved player but game data exists (Spectator load)
		await initLoadGame(gameDataB64)
	}

	// Shared post-initialization code run across all branches
	if (store.players.length === 1) {
		personal.soloGame = true
		personal.trainingGame = true
		store.trainingGameSkipConflictPhase = true
	}

	if (store.mapData.setupData.CR) {
		store.CUSTOM_RULES = [...store.mapData.setupData.CR]
	}

	hd.calculateCanvasSize()
	personal.haltPlay = false

	// Transaction recovery: if server has a stuck transaction lock, process stacks and clear it.
	// finalize = true so saveAndUpdateNotifictionsAfterStack self-completes (clears the transaction,
	// hides the loader, resumes play and broadcasts) without relying on follow-up code here.
	if (window.initData.transactionID && personal.pov >= 0) {
		personal.transactionID = window.initData.transactionID
		const allStackData = window.initData.allStackData || []
		store.allStackData = allStackData
		IO.processStacks(allStackData)
		await IO.saveAndUpdateNotifictionsAfterStack(false, true)
	}

	// BOT RECOVERY: if the current player is a bot on initial load, auto-process to end its turn
	const firstPlayerIdx = store.gameflow.turnOrder[0]
	if (personal.pov >= 0 && store.gameflow.phase !== rf.PHASE_GAME_OVER && Number.isInteger(firstPlayerIdx) && firstPlayerIdx >= 0 && firstPlayerIdx < store.players.length && store.players[firstPlayerIdx].displayName === rf.BOT_NAME) {
		const allStackData = window.initData.allStackData || []
		store.allStackData = allStackData
		IO.processStacks(allStackData)
		await IO.saveAndUpdateNotifictionsAfterStack(false, true)
	}

	if (personal.canPlay()) {
		controller.startPlayerTurn(store.stackControl.loadedPreMove)
	}

	// Active network synchronization handler
	if (window.initData.pov >= -9 && (!WS.RNBwebSocket || WS.RNBwebSocket.readyState > 1)) {
		WS.StartWebSocket().catch(() => {
			console.log("WebSocket background task initialized.")
		})
	}

	/// RUN OPTIONAL DEVELOPMENT RUNTIME OVERRIDES
	if (rf.APP_ONLY_USERS.includes(personal.name)) {
		context.resetContextAndHighlights()
		store.gameflow.phase = rf.PHASE_BUILDING_TO
		// OLD MAP
		/*

		addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, 0, 0])
		addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 0, 0])
		getResByID(0).location = loc.setTransporterLocation(5)
		getResByID(1).location = loc.setTransporterLocation(6)
		*/

		addResourceToGame_core(rf.RES_BOARDS, [rf.LOCATION_BUCKET, 20, 0])
		addResourceToGame_core(rf.RES_BOMB, [rf.LOCATION_BUCKET, 20, 1])
		addResourceToGame_core(rf.RES_CLAY, [rf.LOCATION_BUCKET, 20, 2])

		addResourceToGame_core(rf.RES_TRUNKS, [rf.LOCATION_BUCKET, 36, 0])
		addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 36, 0])
		map.addBuildingToMap_core(rf.BLDG_SAWMILL, [rf.LOCATION_LAND_VERTEX, 36, 0], false, -1, -1, -1)

		addResourceToGame_core(rf.RES_TRUNKS, [rf.LOCATION_BUCKET, 9, 1])
		addResourceToGame_core(rf.RES_TRUNKS, [rf.LOCATION_BUCKET, 9, 1])
		addResourceToGame_core(rf.RES_STONE, [rf.LOCATION_BUCKET, 9, 1])
		map.addBuildingToMap_core(rf.BLDG_RAFT_FACTORY, [rf.LOCATION_BUCKET, 9, 1], false, -1, -1, -1)

		setupStartTileForPlayerIndex(0, 10, 0)
		setupStartTileForPlayerIndex(1, 37, 0)
		controller.startPlayerTurn()
	}
}

export async function initNewGame() {
	const store = useModelStore()
	const personal = usePersonalStore()
	let COLOURS = funcs.shuffle([rf.BLUE, rf.GREEN, rf.RED, rf.YELLOW])

	if (window.initData.playerNames.length >= 5) COLOURS.push(rf.GREY)
	if (window.initData.playerNames.length >= 6) COLOURS.push(rf.BLACK)

	COLOURS = funcs.shuffle(COLOURS)
	store.players.splice(0)

	for (let i = 0; i < window.initData.playerNames.length; i++) {
		store.players.push({
			name: window.initData.playerNames[i],
			displayName: "",
			colour: COLOURS[i],
			RnD: [0, 0, 0, 0, 0, 0, 0, 0],
		})
	}

	if (store.players.length === 1) {
		personal.soloGame = true
		store.wonderBricks = [8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8]
	}

	// Map variable display name identities
	for (let i = 0; i < store.players.length; i++) {
		let displayNamesArr = window.initData.displayNames || ["SHADOW", "SHADOW_2", "SHADOW_3", "SHADOW_4", "SHADOW_5"]
		if (store.players[i].name === "SHADOW" && displayNamesArr.length > 0) store.players[i].displayName = displayNamesArr[0]
		else if (store.players[i].name === "SHADOW_2" && displayNamesArr.length > 1) store.players[i].displayName = displayNamesArr[1]
		else if (store.players[i].name === "SHADOW_3" && displayNamesArr.length > 2) store.players[i].displayName = displayNamesArr[2]
		else if (store.players[i].name === "SHADOW_4" && displayNamesArr.length > 3) store.players[i].displayName = displayNamesArr[3]
		else if (store.players[i].name === "SHADOW_5" && displayNamesArr.length > 4) store.players[i].displayName = displayNamesArr[4]
		else store.players[i].displayName = store.players[i].name
	}

	// Initialize workflow structures and initial map layouts
	store.gameflow.fullTurnOrder = store.players.map((_player, index) => index)
	store.gameflow.turnOrder = [...store.gameflow.fullTurnOrder]
	store.gameflow.phase = rf.PHASE_CHOOSE_HOME_TILE
	store.gameflow.wonderPrayingOrder = [...store.gameflow.fullTurnOrder]
	store.gameflow.wonderTurnOrder = [...store.gameflow.fullTurnOrder]
	store.gameflow.newWonderPrayingOrder = Array(store.players.length).fill(-1)
	store.gameflow.newWonderTurnOrder = []

	personal.haltPlay = true
	store.mapData.externalMapData = [...window.initData.startingMap]
	funcs.importStartingMap(window.initData.startingMap)

	if (store.mapData.setupData.RS) {
		for (let i = 0; i < store.players.length; i++) {
			for (const researchIdx of store.mapData.setupData.RS) {
				store.players[i].RnD[researchIdx] = 1
			}
		}
		addHistory(rf.HIST_ADD_CUSTOM_SCENARIO_ELEMENTS, -1, 0, [[rf.CUSTOM_ALL_PLAYERS_PRE_RESEARCHED, [...store.mapData.setupData.RS]]])
	}

	await IO.saveGame(true, false)
}

export async function initLoadGame(gameDataB64) {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.mapData.externalMapData = [...window.initData.startingMap]

	// Unpack base64 structures into memory models
	if (personal.finishedGame) {
		funcs.importRNBmodel(gameDataB64, true)
	} else {
		funcs.importRNBmodel(gameDataB64, false)
	}

	// Set solo flags immediately after import, before any controller functions are called
	if (store.players.length === 1) {
		personal.soloGame = true
		personal.trainingGame = true
		store.trainingGameSkipConflictPhase = true
	}

	personal.votedToDelete = store.deleteVotesData[personal.name] || false
	personal.votedToExclude = store.statsExcludeVotesData[personal.name] || false

	context.clearAllHighlights()

	// Set up kickout vars
	personal.secondsToNextKickout = window.initData.secondsToNextKickout
	// Set up kickout timer / kickout options
	clearInterval(personal.kickoutCountdownIntervalTimer)
	if (personal.secondsToNextKickout <= 1200) personal.kickoutCountdownIntervalTimer = setInterval(view.kickoutTimerTicker, 1000)

	if (window.initData.kickoutRequired > 0) {
		personal.kickoutRequired = window.initData.kickoutRequired
		if (personal.kickoutRequired === 1 && !personal.finishedGame) {
			store.mapData.externalMapData = [...window.initData.startingMap]
			if (personal.finishedGame) funcs.importRNBmodel(window.initData.gameDataB64, true)
			else funcs.importRNBmodel(window.initData.gameDataB64, false)

			let KickoutFlexiDataArray = window.initData.KickoutFlexiDataArray
			let secondsIn24Hours = 24 * 60 * 60
			let playerSeconds = 0

			for (let i = 0; i < KickoutFlexiDataArray.length; i++) {
				let entry = KickoutFlexiDataArray[i]
				if (Array.isArray(entry) && entry.length === 2 && entry[0] === controller.currentPlayerObj().name) {
					playerSeconds = entry[1]
					break
				}
			}
			let remainingFlexSecondsBeforeThisMove = secondsIn24Hours - playerSeconds
			personal.flexiSecondsToNextKickout = remainingFlexSecondsBeforeThisMove + personal.secondsToNextKickout
			personal.kickoutFlexiCountdownIntervalTimer = setInterval(view.kickoutFlexiTimerTicker, 1000)
		}
	}

	// Sync visualization components
	personal.currentMoveData = window.initData.currentMoveData
	personal.allMyMoveData = window.initData.allMyMoveData || []

	IO.loadCurrentMove()

	// Recalculate dynamic turn order sequencing when inside simultaneous phases
	if (controller.isSimulPhase() || controller.isMainPhaseAndPseudoSimul()) {
		let currentNames = window.initData.currentPlayers
		store.gameflow.turnOrder.splice(0)
		for (let i = 0; i < currentNames.length; i++) {
			for (let j = 0; j < store.players.length; j++) {
				if (currentNames[i] === store.players[j].name) {
					store.gameflow.turnOrder.push(j)
				}
			}
		}

		// KICKSTART: a main/simul phase with no current players is only valid as a transient
		// state mid-saveStackMove. Seeing it on reload means the phase never advanced, so drive
		// it forward now via processStacks + persist the result. Skip if a transactionID is set,
		// since the transaction recovery block in initGame already handles that case.
		if (store.gameflow.turnOrder.length === 0 && personal.pov >= 0 && !window.initData.transactionID) {
			IO.processStacks(window.initData.allStackData || [])
			await IO.saveAndUpdateNotifictionsAfterStack(false)
		}
	}

	// Inject structures when spoiler protection rules apply
	if (window.initData.spoilerFree) {
		store.viewSettings.showReplay = true
		store.replayResetData = funcs.exportRNBmodel(true)
		await replay.generateReplayData(true)
	}
}

/**********************
 *
 * Utility Functions
 *
 ************************/

export function getAllInGameResources() {
	const store = useModelStore()
	return store.ALL_RESOURCES.filter((r) => r.location[0] !== rf.LOCATION_OOB)
}

export function getAllInGameBuildings() {
	const store = useModelStore()
	return store.ALL_BUILDINGS.filter((b) => b.location[0] !== rf.LOCATION_OOB)
}

export function getPlayersHomeMarkerLocation(playerIndex) {
	const store = useModelStore()
	return store.ALL_HOME_MARKERS.find((m) => m.ownerIndex === playerIndex).location
}

export function getAllInGameTransporters() {
	const store = useModelStore()
	return store.ALL_TRANSPORTERS.filter((t) => t.location[0] !== rf.LOCATION_OOB)
}

export function getTransporterByID(transporterID) {
	const store = useModelStore()
	let transporterObj
	if (typeof transporterID === "number") transporterObj = store.ALL_TRANSPORTERS.find((t) => t.id === transporterID)
	else if (typeof transporterID === "string") {
		const matches = store.ALL_TRANSPORTERS.filter((t) => t.uniqueID === transporterID)
		if (matches.length > 1) {
			rf.doAdminAlrt(`GTBI: Duplicate uniqueID found: ${transporterID}. Count: ${matches.length}. IDs: ${matches.map((t) => t.id).join(", ")}`)
		}
		transporterObj = matches[0]
	}
	if (!transporterObj) {
		// During replay, diver history to _HIST arrays
		if (store.viewSettings.showReplay) return
		rf.doAdminAlrt("GTBI: transporterID not found: " + transporterID)
		return
	}
	return transporterObj
}

export function getTransportersByPlayerIndex(playerIndex) {
	return getAllInGameTransporters().filter((t) => t.ownerIndex === playerIndex)
}

export function getTransportersByPlayerIndexAndHexID(playerIndex, hexID) {
	return getAllInGameTransporters().filter((t) => t.ownerIndex === playerIndex && loc.isSpecificHexLocation(t.location, hexID))
}

export function getTransportersByPlayerIndexandType(playerIndex, type) {
	if (type === rf.LAND_TYPE) return getAllInGameTransporters().filter((t) => t.ownerIndex === playerIndex && rf.LAND_TRANSPORTERS.includes(t.type))
	else if (type === rf.WATER_TYPE) return getAllInGameTransporters().filter((t) => t.ownerIndex === playerIndex && rf.WATER_TRANSPORTERS.includes(t.type))
	else if (type === rf.AIR_TYPE) return getAllInGameTransporters().filter((t) => t.ownerIndex === playerIndex && rf.AIR_TRANSPORTERS.includes(t.type))
	rf.doAdminAlrt("No type set")
}

export function transportersOnHex(hexID) {
	return getAllInGameTransporters().filter((t) => loc.isSpecificHexLocation(t.location, hexID))
}

export function isLandTransporter(type) {
	return rf.LAND_TRANSPORTERS.includes(type)
}

export function isWaterTransporter(type) {
	return rf.WATER_TRANSPORTERS.includes(type)
}

// Planes & Aeroports: effective movement parameters for a plane, depending on fly/taxi mode.
// `isFly` is explicit so replay (validate/apply) can derive the same graph without UI state.
export function getEffectiveMoveParams(transporterObj, isFly) {
	const stats = rf.getTransporterStats(transporterObj.type)
	if (transporterObj.type !== rf.PLANE) return { validMove: stats.validMove, maxMoves: stats.maxMoves, isFly: false }
	if (isFly) return { validMove: [rf.MOVE_FLY], maxMoves: stats.maxMoves, isFly: true }
	// TAXI: 1 step over roads (land) or 1 adjacent sea step (sea). Never rivers, never cargo.
	const onLand = loc.isLandVertexLocation(transporterObj.location)
	return { validMove: onLand ? [rf.MOVE_ROAD, rf.MOVE_DONKEY] : [rf.MOVE_WATER], maxMoves: 1, isFly: false }
}

// A tile blocks plane landing if it has ANY building, or an unattended goose.
function tileHasPlaneLandingBlocker(hexID) {
	if (getAllInGameBuildings().some((b) => loc.isSpecificHexLocation(b.location, hexID))) return true
	const unattendedGeese = getAllInGameResources().filter((r) => r.type === rf.RES_GOOSE && loc.isSpecificHexLocation(r.location, hexID) && !r.followingTransporterID)
	return unattendedGeese.length > 0
}

// Planes & Aeroports: can a plane land on `location` (a land vertex bucket)?
// Rules: must be a land vertex on TERR_ANY_LAND (not sea / wet polder); no buildings of
// any kind and no unattended geese on the tile; a river blocks BOTH shores if either
// shore's tile has a building/unattended goose.
export function canPlaneLandOnTile(planeObj, location) {
	const store = useModelStore()
	if (!loc.isLandVertexLocation(location)) return false
	const hexID = location[1]
	const hex = getHexByID(hexID)
	if (!hex || !rf.TERR_ANY_LAND.includes(hex.currentTerrain)) return false
	if (tileHasPlaneLandingBlocker(hexID)) return false
	// River rule: for each side that has a river, check the opposite-shore hex
	if (hex.sideRiverVertexIds) {
		for (let s = 0; s < hex.sideRiverVertexIds.length; s++) {
			if (hex.sideRiverVertexIds[s] === -1) continue
			const neighbour = store.mapData.neighbours[hexID] ? store.mapData.neighbours[hexID][s] : -1
			if (neighbour >= 0 && tileHasPlaneLandingBlocker(neighbour)) return false
		}
	}
	return true
}

export function transporterIsOnTransporter(transporter) {
	return transporter.location[0] === rf.LOCATION_TRANSPORTER
}

export function transporterIsOnMap(transporter) {
	return !transporterIsOnTransporter(transporter)
}

export function resourcesOnTransport(transporterId) {
	return getAllInGameResources().filter((r) => loc.isOnSpecificTransporter(r.location, transporterId))
}

export function resourcesFollowingTransporter(transporterId) {
	return getAllInGameResources().filter((r) => loc.isFollowingTransporter(r.location, transporterId))
}

export function transportersOnTransporter(transporterId) {
	return getAllInGameTransporters().filter((t) => loc.isOnSpecificTransporter(t.location, transporterId))
}

export function transporterCarriesResources(transporterId) {
	return resourcesOnTransport(transporterId).length > 0
}

export function transporterCarriesTransporter(transporterId) {
	return transportersOnTransporter(transporterId).length > 0
}

export function transporterCarriesAnything(transporterId) {
	return transporterCarriesTransporter(transporterId) || transporterCarriesResources(transporterId)
}

export function anythingFollowingTransporter(transporterId) {
	return resourcesFollowingTransporter(transporterId).length > 0
}

export function doesTransporterHaveAlreadyMovedResource(transporterID) {
	let transporterObj = getTransporterByID(transporterID)
	let resources = resourcesOnTransport(transporterObj.id).concat(resourcesFollowingTransporter(transporterObj.id))
	for (const res of resources) {
		if (res.movedTransporterID !== -1 && res.movedTransporterID !== transporterID) return true
	}
	return false
}

export function doesTransporterHaveAlreadyMovedTransporter(transporterID) {
	const carriedTransporter = transportersOnTransporter(transporterID)[0]
	if (!carriedTransporter) return false
	if (carriedTransporter.movedThisTurn) return true
	return false
}

// Allow in game and OOB ews finding
export function getResByID(resID) {
	const store = useModelStore()
	let resObj
	if (typeof resID === "number") resObj = store.ALL_RESOURCES.find((r) => r.id === resID)
	else if (typeof resID === "string") {
		const matches = store.ALL_RESOURCES.filter((r) => r.uniqueID === resID)
		if (matches.length > 1) {
			rf.doAdminAlrt(`GRBI: Duplicate uniqueID found: ${resID}. Count: ${matches.length}. IDs: ${matches.map((r) => r.id).join(", ")}`)
		}
		resObj = matches[0]
	}
	// Ignore errors from pseudo mine res no longer existing
	if (!resObj && (typeof resID !== "string" || (typeof resID === "string" && resID.substring(1, 3) !== "28"))) {
		// During replay, divert history to _HIST arrays
		if (store.viewSettings.showReplay) return null
		rf.doAdminAlrt("GRBI: resID not found: " + resID)

		return
	}
	return resObj
}

export function getBuildingByID(buildingID, flag) {
	const store = useModelStore()
	let buildingObj

	if (typeof buildingID === "number") buildingObj = store.ALL_BUILDINGS.find((b) => b.id === buildingID)
	else if (typeof buildingID === "string") {
		const matches = store.ALL_BUILDINGS.filter((b) => b.uniqueID === buildingID)
		if (matches.length > 1) {
			rf.doAdminAlrt(`GBBI: Duplicate uniqueID found: ${buildingID}. Count: ${matches.length}. IDs: ${matches.map((b) => b.id).join(", ")}`)
		}
		buildingObj = matches[0]
	}
	if (!buildingObj) {
		// During replay, diver history to _HIST arrays
		if (store.viewSettings.showReplay) return null
		rf.doAdminAlrt(`GBBI: buildingID not found: ${buildingID} flag: ${flag}`)
		return
	}
	return buildingObj
}

export function allResourcesGroupedByAllHexes(playerIndexesTransportsToUseArr) {
	const store = useModelStore()
	const hexCount = store.mapData.hexData.length

	// 1. Pre-allocate the array for better performance
	const result = Array.from({ length: hexCount }, () => [])

	// 2. Convert the inclusion array to a Set for O(1) lookups
	const allowedOwners = new Set(playerIndexesTransportsToUseArr)

	for (const res of getAllInGameResources()) {
		const location = res.location
		const isOnTransporter = loc.isOnAnyTransporter(location)

		if (isOnTransporter) {
			const transporter = getTransporterByID(location[1])

			// 3. Filter by owner using the Set
			if (!allowedOwners.has(transporter.ownerIndex)) {
				continue
			}

			// 4. Use the cached transporter object to get the hex
			const hex = transporter.location[1]
			result[hex].push(res)
		} else {
			// It's directly on a hex
			const hex = location[1]
			result[hex].push(res)
		}
	}
	return result
}

export function resourcesOnHex(hexID) {
	return getAllInGameResources().filter((r) => loc.isSpecificHexLocation(r.location, hexID))
}

export function getBuildingStatsFromBuildingID(buildingID) {
	const building = getBuildingByID(buildingID)
	let bldgStats = rf.BUILDING_STATS.find((b) => b.building === building.type)
	if (!bldgStats) {
		rf.doAdminAlrt("Get building stats: type not found: " + building.type)
		return
	}
	return bldgStats
}

export function buildingsOnHex(hexID) {
	return getAllInGameBuildings().filter((b) => loc.isSpecificHexLocation(b.location, hexID))
}

export function homeMarkersOnHex(hexID) {
	const store = useModelStore()
	return store.ALL_HOME_MARKERS.filter((b) => loc.isSpecificHexLocation(b.location, hexID))
}

export function isPrimaryProducer(building) {
	const stats = getBuildingStatsFromBuildingID(building.id)
	return stats.inputRes[0].length === 0
}

// Special buildings that are neither primary nor secondary producers. E.g. the
// power plant - its fuel is consumed at the start of the production phase, and
// it does not produce goods through the normal production machinery.
export function isNonProducingBuilding(building) {
	return building.type === rf.BLDG_POWER_PLANT
}

export function isSecondaryProducer(building) {
	return !isPrimaryProducer(building) && !isNonProducingBuilding(building)
}

export function isSecondaryProducerWithoutTransporterInput(building) {
	if (!isSecondaryProducer(building)) return false
	const stats = getBuildingStatsFromBuildingID(building.id)
	if (stats.inputRes.length === 1 && stats.inputRes[0].some((res) => res > rf.RES_UPPER_LIMIT)) return false
	return true
}

export function isSecondaryProducerIncludingTransporterInput(transporterID) {
	// Return a function that takes a building and checks the condition
	return function (building) {
		if (!isSecondaryProducer(building)) return false
		const stats = getBuildingStatsFromBuildingID(building.id)
		let transporterType = getTransporterByID(transporterID).type
		if (stats.inputRes.length === 1 && stats.inputRes[0].some((res) => res > rf.RES_UPPER_LIMIT)) {
			if (stats.inputRes[0].includes(transporterType)) return true
			return false
		}
		// Return true if it's 2ndry with no transporter input
		return true
	}
}

export function getHexByID(hexID, passInErrorFalg) {
	const store = useModelStore()
	let hexObj = store.mapData.hexData.find((h) => h.hexID === hexID)
	if (!hexObj) {
		rf.doAdminAlrt(`GHBBI: hexID not found: ${hexID} flag: ${passInErrorFalg}`)
		return store.mapData.hexData[0]
	}
	return hexObj
}

export function getEdgeDataFromHexID(hexID1, hexID2) {
	const store = useModelStore()
	let edgeData = store.mapData.edgeData.find((e) => e.edgeHexIDs.includes(hexID1) && e.edgeHexIDs.includes(hexID2))
	if (!edgeData) {
		rf.doAdminAlrt("GEFHEXID: edgeData not found: " + hexID1 + "," + hexID2)
		return
	}
	return edgeData
}

export function getHexShoreSides(hexId) {
	let hex = getHexByID(hexId)
	if (hex.currentTerrain === rf.TERR_SEA) {
		return []
	} else {
		let result = []
		for (let i = 0; i < 6; i++) {
			let neighbour = hex.hexLookup[i]
			if (neighbour >= 0 && getHexByID(neighbour).currentTerrain === rf.TERR_SEA) {
				result.push(i)
			}
		}
		return result
	}
}

export function isHexIDshore(hexId) {
	let hex = getHexByID(hexId)
	return hex.riverType !== rf.RIVER_NONE || getHexShoreSides(hexId).length > 0
}

/**** END UTILITY */

export function setupStartTileForPlayerIndex(playerIndex, hexID, bucketID) {
	setupStartTileForPlayerIndex_core(playerIndex, hexID, bucketID)
	//const bucketLocation =	loc.convertLocationToBucket([rf.LOCATION_LAND_VERTEX, hexID, vertex])
	const stackLocation = stack.compressLocation([rf.LOCATION_BUCKET, hexID, bucketID])
	addHistory(rf.HIST_CHOOSE_HOME_TILE, playerIndex, 0, [...stackLocation])
}

export function setupStartTileForPlayerIndex_core(playerIndex, hexID, bucketID) {
	const store = useModelStore()
	const homeBucketLocation = loc.setBucketLocation(hexID, bucketID)
	// 1 home marker
	addHomeMarkerToGame(playerIndex, homeBucketLocation)

	// 3 Donkeys
	addTransporterToGame(playerIndex, rf.DONKEY, homeBucketLocation, true)
	if (!store.CUSTOM_RULES.includes(rf.CR_ONLY_START_WITH_1_DONKEY)) addTransporterToGame(playerIndex, rf.DONKEY, homeBucketLocation, true)
	if (!store.CUSTOM_RULES.includes(rf.CR_START_2_DONKEY_3RD_ON_WONDER_BRICK_27) && !store.CUSTOM_RULES.includes(rf.CR_ONLY_START_WITH_1_DONKEY)) addTransporterToGame(playerIndex, rf.DONKEY, homeBucketLocation, true)

	// 5 Boards
	for (let i = 0; i < 5; i++) addResourceToGame_core(rf.RES_BOARDS, loc.setBucketLocation(hexID, bucketID), 9)

	// 1 Stones
	for (let i = 0; i < 1; i++) addResourceToGame_core(rf.RES_STONE, loc.setBucketLocation(hexID, bucketID), 9)

	// 2 Geese
	for (let i = 0; i < 2; i++) addResourceToGame_core(rf.RES_GOOSE, loc.setBucketLocation(hexID, bucketID), 9)

	// CR extra stone
	if (store.CUSTOM_RULES.includes(rf.CR_START_WITH_ONE_EXTRA_STONE)) addResourceToGame_core(rf.RES_STONE, loc.setBucketLocation(hexID, bucketID), 9)

	// CR extra boards
	if (store.CUSTOM_RULES.includes(rf.CR_START_WITH_ONE_EXTRA_BOARDS)) addResourceToGame_core(rf.RES_BOARDS, loc.setBucketLocation(hexID, bucketID), 9)
}

export function addHomeMarkerToGame(playerIndex, bucketLocation) {
	const store = useModelStore()
	store.ALL_HOME_MARKERS.push({
		ownerIndex: playerIndex,
		colour: store.players[playerIndex].colour,
		location: [...bucketLocation],
	})
}

// During replay/stack, it's permissible to temporarily have excess transporters
export function addTransporterToGame(playerIndex, transporterType, bucketLocation, ignoreAnyExcessTransporters) {
	const store = useModelStore()
	if (!rf.ALL_TRANSPORTERS.includes(transporterType)) {
		rf.doAdminAlrt(`Transporter type not found: ${transporterType}`)
		return
	}
	// You can't use array length for ID, as some transporters may be converted / destoryed
	let nextID = store.ALL_TRANSPORTERS.length
	let finalLocation = loc.getVisualLocationFromBucketLocation(bucketLocation)
	const hexID = finalLocation[1]

	let transporterStats = rf.getTransporterStats(transporterType)

	let nextUniqueID = 0
	let finalUniqueIDString = ""
	let isUnique = false

	// Loop until we find an ID string that doesn't exist yet
	while (!isUnique) {
		finalUniqueIDString = `${String(playerIndex)}${String(transporterType).padStart(2, "0")}${String(store.gameflow.turn).padStart(2, "0")}${String(hexID).padStart(3, "0")}${String(nextUniqueID).padStart(2, "0")}`

		// Check if any transporter already has this uniqueID
		const collision = store.ALL_TRANSPORTERS.some((t) => t.uniqueID === finalUniqueIDString)

		if (!collision) {
			isUnique = true
		} else {
			nextUniqueID++
		}
	}

	store.ALL_TRANSPORTERS.push({
		id: nextID,
		ownerIndex: playerIndex,
		type: transporterType,
		location: finalLocation,
		justPickedUpFromLocation: [], // This is to stop you picking up from a brakets river/shore, and
		// then dropping in the other river/somewhere else. You can only drop at start of next turn UNLESS
		// you proxy this instead of an "undo"

		// Don't save GFX here as someone could change colour preference mid game
		//gfx: "transporter_" + String(transporterType) + "_" + personal.getCorrectedColour(controller.currentPlayerObj().colour),
		/*
    movedTransporterID: -1, // This is the ID of the transporter that has moved it this turn - can only be moved by 1 transporter
		// BUT MAYBE DON'T NEED THIS? AS YOU CAN'T UNLOAD A TRANSPORTER MID TURN?
		*/
		remainingMoves: transporterStats.maxMoves,
		movedThisTurn: false, // Flag to see if it can be picked up or not. Could also use "remaining moves" but easier to seperate for testing
		rawXY: [0, 0], // THIS IS JUST TO SET THE START POS FOR ANIMATION. It is updated to correct "before" location just pre-move
		rawTransporterXY: [0, 0], // THIS IS JUST TO SET THE START POS FOR ANIMATION. It is updated to correct "before" location just pre-move

		//animationWaypoints: [[...newPos, 10]],
		animationWaypoints: [],
		uniqueID: finalUniqueIDString,
	})

	// Compute initial display position so the transporter is valid even before the UI component mounts.
	if (!loc.isOOBlocation(finalLocation)) {
		let initialPos = map.getTransporterPositionFromLocation(finalLocation, transporterStats, nextID)
		store.ALL_TRANSPORTERS[nextID].rawTransporterXY = initialPos
	}

	if (!ignoreAnyExcessTransporters) {
		// Now check for transporter violations
		const problemRet = excessTransporterCheck(playerIndex)
		if (problemRet[0] || problemRet[1] || problemRet[2] || problemRet[3] || problemRet[4]) {
			context.resetContextAndHighlights()
			store.context.action = rf.ACT_REMOVE_EXCESS_TRANSPORTERS
			highlight.highlightEligibleTransportersForRemoval(playerIndex, problemRet[0], problemRet[1], problemRet[2], problemRet[3], problemRet[4])
		}
	}

	return finalLocation
}

export function excessTransporterCheck(playerIndex) {
	let currentTransporters = getTransportersByPlayerIndex(playerIndex).length
	let currentLandTransporters = getTransportersByPlayerIndexandType(playerIndex, rf.LAND_TYPE).length
	let currentWaterTransporters = getTransportersByPlayerIndexandType(playerIndex, rf.WATER_TYPE).length
	let currentCaravans = getTransportersByPlayerIndex(playerIndex).filter((t) => t.type === rf.EXHIBITION_TRANSPORTER).length
	// Planes & Aeroports: a player is limited to 3 planes. Planes are NOT counted in the
	// land/water 5-caps (they are excluded from LAND_TRANSPORTERS/WATER_TRANSPORTERS) but
	// they DO count toward the global 8-transporter total (currentTransporters above).
	let currentPlanes = getTransportersByPlayerIndexandType(playerIndex, rf.AIR_TYPE).length
	let totalProblem = false
	let landProblem = false
	let waterProblem = false
	let caravanProblem = false
	let planeProblem = false
	if (currentTransporters > 8) totalProblem = true
	if (currentLandTransporters > 5) landProblem = true
	if (currentWaterTransporters > 5) waterProblem = true
	// Art & The Atelier: a player is limited to 3 exhibition caravans
	if (currentCaravans > 3) caravanProblem = true
	// Planes & Aeroports: a player is limited to 3 planes
	if (currentPlanes > 3) planeProblem = true
	return [totalProblem, landProblem, waterProblem, caravanProblem, planeProblem, currentTransporters, currentLandTransporters, currentWaterTransporters, currentCaravans, currentPlanes]
}

export function resetTransportersForNewTurn() {
	const inGameTransporters = getAllInGameTransporters()
	for (let i = 0; i < inGameTransporters.length; i++) {
		let transporterStats = rf.getTransporterStats(inGameTransporters[i].type)
		inGameTransporters[i].remainingMoves = transporterStats.maxMoves
		inGameTransporters[i].movedThisTurn = false
		inGameTransporters[i].justPickedUpFromLocation.splice(0)
	}
}

// MANAGEMENT MECHANIC: A Manager on a tile doubles the max production capacity of all
// secondary producers on that tile. Only one manager applies per tile.
// Managers placed directly on the tile are always active. Managers inside a transporter on
// the tile are active unless the transporter's owner has de-activated them for that tile.
export function isManagerActiveOnHex(hexID) {
	const store = useModelStore()

	// Managers placed directly on the tile (bucket / vertex / docked / river)
	const managersOnTile = getAllInGameResources().filter((r) => r.type === rf.RES_MANAGER && loc.isSpecificHexLocation(r.location, hexID))
	if (managersOnTile.length > 0) return true

	// Managers carried inside transporters that are on the tile - active unless the
	// transporter owner has opted out for this tile (see store.managerActivation)
	const transportersOnTile = getAllInGameTransporters().filter((t) => loc.isSpecificHexLocation(t.location, hexID))
	for (const t of transportersOnTile) {
		const carriedManager = resourcesOnTransport(t.id).find((r) => r.type === rf.RES_MANAGER)
		if (carriedManager && (store.managerActivation[t.ownerIndex]?.[hexID] ?? true)) return true
	}
	return false
}

// Doubles secondary producer capacity on a tile when a manager is active there.
export function getManagerProductionMultiplierForHex(hexID) {
	return isManagerActiveOnHex(hexID) ? 2 : 1
}

// Toggle whether the current player's transporter-carried managers on a tile activate.
// Defaults to active (true). TODO: wire this up to the production phase UI.
export function toggleManagerActivation(hexID) {
	const store = useModelStore()
	const playerIndex = controller.currentPlayerIndex()
	store.managerActivation[playerIndex] = store.managerActivation[playerIndex] || {}
	const currentlyActive = store.managerActivation[playerIndex][hexID] ?? true
	store.managerActivation[playerIndex][hexID] = !currentlyActive
}

export function resetBuildingsAfterProduction() {
	const buildingsInGame = getAllInGameBuildings()
	for (let i = 0; i < buildingsInGame.length; i++) {
		const bldg = buildingsInGame[i]
		const bldgStats = getBuildingStatsFromBuildingID(bldg.id)
		// A Manager on the tile doubles the max production capacity of secondary producers there
		const capacityMultiplier = isSecondaryProducer(bldg) ? getManagerProductionMultiplierForHex(bldg.location[1]) : 1
		bldg.remainingConversions = bldgStats.maxConversions * capacityMultiplier
	}
}

export function addResourceToGame_core(resource, location, playerIndex) {
	const store = useModelStore()
	let nextID = 0
	const newLocation = loc.convertLocationToBucket(location)
	nextID = store.ALL_RESOURCES.length

	let nextUniqueID = 0
	let finalUniqueIDString = ""
	let isUnique = false

	// Loop until we find an ID string that doesn't exist yet
	/* Unique identifiers are:
		- playerIndex using the 2ndry building (or 9 for no one)
		- resourceType - eg rf.RES_WOOD, eg 2 or 3 or 15
		- game turn - pri bldgs can produce once per turn
		- hexID - can only be created on one ID, and often that's unique
		- nextUniqueID - if a player makes multiple boards from trunks, we need a tie-breaker to uniquely ID them
			the counter won't break if multiple people use the sawmill, as the counter is unique to the playerIndex at the start

		BAD IDEAS
		=========
		- creating bldgID - 3 players could all make woodcutters in the same pre-phases
			so each would get the same basic bldgID
			using full unique bldg id is a bit long to be ideal, but could be used. 

		*/

	while (!isUnique) {
		finalUniqueIDString = `${String(playerIndex)}${String(resource).padStart(2, "0")}${String(store.gameflow.turn).padStart(2, "0")}${String(location[1]).padStart(3, "0")}${String(nextUniqueID).padStart(2, "0")}`

		// Check if any resource already has this uniqueID
		const collision = store.ALL_RESOURCES.some((r) => r.uniqueID === finalUniqueIDString)

		if (!collision) {
			isUnique = true
		} else {
			nextUniqueID++
		}
	}

	store.ALL_RESOURCES.push({
		id: nextID,
		location: [...newLocation],
		// THIS DOES NOT NEED TO BE SAVED. IT IS A TEMPORARY PROPERTY TO AUTO-DROP GEESE AFTER TRANSPORTER ENDS MOVEMENT ANIMATION
		autoDropLocationAfterFollowingTransporter: [],
		type: resource,
		gfx: "res_" + String(resource),
		movedTransporterID: -1, // This is the ID of the transporter that has moved it this turn - can only be moved by 1 transporter
		// 2 digit type, 2 digit turn, 3 digit hexID, 2 digit counter
		uniqueID: finalUniqueIDString,
		//  designate them for secondary production or building. Or set geese to follow.
	})
}

export function removeResourcesFromGameUsingBucket_core(hexID, bucketID, resArr) {
	const locations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation([rf.LOCATION_BUCKET, hexID, bucketID], false, "rrfgub_c")

	const allResources = getAllInGameResources().sort((a, b) => a.id - b.id)
	let resourceIDs = []
	for (const resType of resArr) {
		let resID = (allResources.find((r) => !resourceIDs.includes(r.id) && util.includesArray(locations, r.location) && r.type === resType) || {}).id ?? -1
		if (resID === -1) {
			rf.doAdminAlrt(`RRFGUV: Resource not found: ${resType} input: ${JSON.stringify(resArr)}`)
			return ``
		}
		resourceIDs.push(resID)
	}
	// Unique the IDs just to make sure
	resourceIDs = [...new Set(resourceIDs)]
	// Sanity check; make sure you have the correct number of IDs
	if (resourceIDs.length !== resArr.length) {
		rf.doAdminAlrt("Inconsistent resources found")
		return
	}
	// Now Remove the resources
	for (const resID of resourceIDs) {
		let resObj = getResByID(resID)
		resObj.location = loc.setOOBlocation()
	}
	return resourceIDs
}

// NB event is not always passed on here, eg during replay, or IO stacks.
// But by this point, the error should not be present
export function dropAllGeeseForPlayerIndex(playerIndex, event = null) {
	const store = useModelStore()
	const playerTransportersOnMap = getAllInGameTransporters()
		.filter((transporter) => transporterIsOnMap(transporter) && transporter.ownerIndex === playerIndex)
		.map((a) => [a.id, a.location])

	let resourcesFollowingTransporters = []
	for (let i = 0; i < playerTransportersOnMap.length; i++) {
		resourcesFollowingTransporters = resourcesFollowingTransporters.concat(resourcesFollowingTransporter(playerTransportersOnMap[i][0]))
	}

	for (let i = 0; i < resourcesFollowingTransporters.length; i++) {
		let resObj = resourcesFollowingTransporters[i]
		const followedTransporterID = resObj.location[1]
		const followedTransporterLocation = playerTransportersOnMap.find((t) => t[0] === followedTransporterID)[1]
		const followedTransporterHexID = followedTransporterLocation[1]
		// Firstly, can only drop on sea IF there's an oil rig. In which case, the only bucket is 0
		if (loc.isSeaVertexLocation(followedTransporterLocation) && !map.hasOilRigOnHexID(followedTransporterHexID)) {
			let clientX = event ? event.clientX : window.innerWidth / 2
			let clientY = event ? event.clientY : window.innerHeight / 2
			let htmlMessage = "Geese cannot end<br/>turn at sea<br/>following transporter"
			showPopup("error", clientX, clientY, htmlMessage)
			store.context.errorUnableToDropGeeseAtSea = true
			return
		}
		// Now we know there is an oil rig, so drop in bucket 0
		else if (loc.isSeaVertexLocation(followedTransporterLocation) && map.hasOilRigOnHexID(followedTransporterHexID)) {
			resObj.location = loc.setBucketLocation(followedTransporterHexID, 0)
		}
		// On land, convert the transporters location to a bucket, and drop it in that
		else if (loc.isLandVertexLocation(followedTransporterLocation)) {
			const bucketID = loc.getBucketIDfromAnyHexIDandVertex(followedTransporterHexID, followedTransporterLocation[2])
			resObj.location = loc.setBucketLocation(followedTransporterHexID, bucketID)
		}
		// NB Docking sets movement to 0 so SHOULD have already dropped the geese
		// TODO; tidy this up - BUT THIS SHOULD NEVER BE RUN ANYWAY
		else if (loc.isDockedLocation(followedTransporterLocation)) {
			/*const ig = graph.createInternalGraph(followedTransporterLocation[1], controller.currentPlayerIndex())
			// const reachable = graph.reachableFrom(ig, [rf.NODE_VERTEX], location[0] === rf.LOCATION_LAND_VERTEX ? rf.NODE_ALL : [rf.NODE_VERTEX], followedTransporterLocation)
			const reachable = graph.reachableFrom(ig, [rf.NODE_VERTEX], followedTransporterLocation[0] === rf.LOCATION_LAND_VERTEX ? rf.NODE_ALL : [rf.NODE_VERTEX], followedTransporterLocation)
			const validLocations = reachable.filter((loc) => [rf.LOCATION_LAND_VERTEX].includes(loc[0]))
			// Just dump in the first valid location
			const hexID = validLocations[0][1]
			const vertex = validLocations[0][2]
			const bucketID = loc.getBucketIDfromAnyHexIDandVertex(hexID, vertex)
			resObj.location = [rf.LOCATION_BUCKET, hexID, bucketID]*/
			const eligibleLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(followedTransporterLocation, false, playerIndex)
			// Find the first bucket location
			const bucketLocation = eligibleLocations.find((loc) => loc[0] === rf.LOCATION_BUCKET)
			resObj.location = bucketLocation
		}
	}
}

// THIS IS USED IN REPLAY
export function removeResourcesFromGameUsingTransporter(transporterID, resArr, simulateOnly) {
	// If deducting resources, then it must be during the build phase after selecting a transporter
	let transporterObj = getTransporterByID(transporterID)
	let hexID = transporterObj.location[1]
	// Find the eligible resources
	let resources = loc.getAllResourcesAccessibleToTransporter(transporterID, true)
	console.log(JSON.stringify(resources))
	// Ignore transporter inputs
	resArr = resArr.filter((resType) => resType < rf.RES_UPPER_LIMIT)

	// Sort resources by ID for deterministic selection
	resources.sort((a, b) => a.id - b.id)

	// Now find all the resources by ID
	let resourceIDStoRemove = []
	for (const resType of resArr) {
		// Find it lying around on the floor, or -1
		let resID = (resources.find((r) => !resourceIDStoRemove.includes(r.id) && r.type === resType && loc.isSpecificHexLocation(r.location, hexID)) || {}).id ?? -1
		// If you haven't found it, check yourself
		if (resID === -1) resID = (resources.find((r) => !resourceIDStoRemove.includes(r.id) && r.type === resType && loc.isOnSpecificTransporter(r.location, transporterObj.id)) || {}).id ?? -1
		// If you still haven't found it, just get any res (ie check other transporters in the bucket)
		if (resID === -1) resID = (resources.find((r) => !resourceIDStoRemove.includes(r.id) && r.type === resType) || {}).id ?? -1

		// Return error code 1 if you can't find a resource
		if (resID !== -1) resourceIDStoRemove.push(resID)
		else return 1
	}

	// Unique the IDs just to make sure
	resourceIDStoRemove = [...new Set(resourceIDStoRemove)]

	// Sanity check; make sure you have the correct number of IDs
	if (resourceIDStoRemove.length !== resArr.length) {
		rf.doAdminAlrt("Inconsistent resources found")
		return 1
	}

	// Now Remove the resources, if you're not just running a check
	if (!simulateOnly) {
		for (const resID of resourceIDStoRemove) {
			let resObj = getResByID(resID)
			resObj.location = loc.setOOBlocation()
		}
	}

	return 0
}

export function removeAndAddTransporterFromGameUsingID(transporterID, newTransporterType) {
	const store = useModelStore()
	// De-select the transporter
	if (store.context.selectedTransporterIDforTM === transporterID) store.context.selectedTransporterIDforTM = -1
	let transporterObj = getTransporterByID(transporterID)
	let resOnTransporter = resourcesOnTransport(transporterID)
	let transporterLocation = transporterObj.location
	let transporterBucketLocation = loc.getBucketLocationFromVertexLocation(transporterLocation)
	// Add the new one
	addTransporterToGame(transporterObj.ownerIndex, newTransporterType, transporterBucketLocation, true)
	for (const res of resOnTransporter) {
		res.location = loc.setTransporterLocation(store.ALL_TRANSPORTERS.length - 1)
	}
	// Remove the old one

	transporterObj.location = loc.setOOBlocation()
}

export function removeTransporterIDfromGame(transporterID) {
	const store = useModelStore()
	// De-select the transporter
	if (store.context.selectedTransporterIDforTM === transporterID) store.context.selectedTransporterIDforTM = -1
	let transporterObj = getTransporterByID(transporterID)
	let resOnTransporter = resourcesOnTransport(transporterID)
	let transporterLocation = transporterObj.location
	let resDropLocation = []
	if (loc.isLandVertexLocation(transporterLocation)) {
		resDropLocation = [rf.LOCATION_BUCKET, transporterLocation[1], loc.getBucketIDfromAnyHexIDandVertex(transporterLocation[1], transporterLocation[2])]
	} else if (loc.isDockedLocation(transporterLocation)) {
		// find bucket accessible to the docked location
		const validLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterLocation, false, transporterObj.ownerIndex).filter((resLoc) => loc.isBucketLocation(resLoc))
		resDropLocation = validLocations[0]
	} else if (loc.isRiverVertexLocation(transporterLocation)) {
		const validLocations = loc.getEligibleLocationsForInteractionWithinHexFromSingleLocation(transporterLocation, false, transporterObj.ownerIndex).filter((resLoc) => loc.isBucketLocation(resLoc))
		resDropLocation = validLocations[0]
	}
	for (const res of resOnTransporter) {
		res.location = resDropLocation
	}
	transporterObj.location = loc.setOOBlocation()
}

export function removeBuildingByID(buildingID) {
	let buildingObj = getBuildingByID(buildingID)
	buildingObj.location = loc.setOOBlocation()
	// To do: should only be transp facs, so shouldn't be any res in bldg loc, otherwise move them to tile
}

export function addHistory(event, playerIndex, timeOffset, params) {
	const personal = usePersonalStore()
	const store = useModelStore()

	let time = Math.round(new Date().getTime() / 1000 - personal.gameCreationTimestamp + timeOffset)
	if (store.history.length > 0) {
		for (let i = 0; i < store.history.length; i++) {
			time -= store.history[i][2]
		}
	}
	store.history.push([event, playerIndex, time, util.deepCloneValue(params)])
}

export function addHexToMap(coord, rotation, hexTerrainID) {
	const store = useModelStore()
	addHexToMap_core(coord, rotation, hexTerrainID)

	//hd.calculateCanvasSize()
	store.context.hexTerrainIDbeingAdded = -1

	//addHistory(rf.HIST_ADD_HEX, controller.currentPlayerIndex(), 0, [hexRef, store.context.hexBeingAddedRotation, [tile.q, tile.r]])
}

export function addHexToMap_core(coord, rotation, hexTerrainID) {
	const store = useModelStore()

	if (coord.length !== 3) {
		rf.doAdminAlrt(`Must have 3 coords: ${coord}`)
		return
	}
	if (coord[0] + coord[1] + coord[2] !== 0) {
		rf.doAdminAlrt(`Coord Sum MUST be 0: ${coord}`)
		return
	}

	let newHex = hd.createActualHex(coord, rotation, hexTerrainID)
	newHex.hexID = store.mapData.hexData.length
	store.mapData.hexData.push(newHex)

	store.context.action = rf.ACT_NONE

	// After adding a map, set the neighbours and edges, etc
	hd.calculateCanvasSize()
	hd.setNeighbours()
	map.updateEdgeData()
	hd.updateAllHexRawXY()
}

export function showPopup(type, clientX, clientY, htmlMessage) {
	const store = useModelStore()

	const popupWidth = 200 // Estimated popup width
	const popupHeight = 80 // Estimated popup height
	let xPos = clientX + 25
	let yPos = clientY - popupHeight / 2
	if (xPos + popupWidth > window.innerWidth) xPos = window.innerWidth - popupWidth
	if (yPos + popupHeight > window.innerHeight) yPos = window.innerHeight - popupHeight
	if (xPos < 0) xPos = 0
	if (yPos < 0) yPos = 0

	if (type === "error") {
		store.errorPopupSetter.htmlMessage = htmlMessage
		store.errorPopupSetter.pos = [xPos, yPos]
		clearTimeout(store.errorPopupSetter.timer)
		store.errorPopupSetter.timer = setTimeout(() => {
			store.errorPopupSetter.showPopup = false
		}, 2000)
		store.errorPopupSetter.showPopup = true
	} else if (type === "info") {
		store.infoPopupSetter.htmlMessage = htmlMessage
		store.infoPopupSetter.pos = [xPos, yPos]
		clearTimeout(store.infoPopupSetter.timer)
		store.infoPopupSetter.timer = setTimeout(() => {
			store.infoPopupSetter.showPopup = false
		}, 2000)
		store.infoPopupSetter.showPopup = true
	}
}

export function resourceCountByType(resourceTypes) {
	let arr = new Array(rf.ALL_RES.length)
	arr.fill(0)
	for (const type of resourceTypes) arr[type]++
	return arr
}

export function getVertexBucketsFromLocations(locations) {
	const store = useModelStore()
	const hexData = store.mapData.hexData
	let buckets = []
	let hexIds = []
	let hexOffset = []
	for (let i = 0; i < hexData.length; i++) {
		hexOffset.push(buckets.length)
		buckets = buckets.concat(hexData[i].bucketIdsCurrent)
		hexIds = hexIds.concat(util.makeArrayOfSizeWithFill(hexData[i].bucketIdsCurrent.length, i))
	}
	let vertexLocations = buckets.map((_) => [])

	let included = util.makeArrayOfSizeWithFill(buckets.length, false)
	for (const location of locations.filter(loc.isNonRiverVertexLocation)) {
		let hexId = location[1]
		let vertex = location[2]
		const hex = hexData[hexId]
		let index = hexOffset[hexId] + hex.bucketIdsCurrent[hex.nodeBucketIds[vertex]]
		if (!included[index]) {
			included[index] = true
			vertexLocations[index] = location
		}
	}
	return util.boolFilter(util.indexArray(buckets.length), included).map((i) => [hexIds[i], buckets[i], vertexLocations[i]])
}

export function withInitialBuckets([hexId, bucketId, loc]) {
	return [hexId, hexCurrentBucketToInitial(hexId, bucketId), loc]
}

export function splitLocationsIntoBucketsAndNonBuckets(locations) {
	const buckets = getVertexBucketsFromLocations(locations)
	const other = locations.filter((location) => !loc.isNonRiverVertexLocation(location))
	return {
		buckets: buckets,
		other: other,
	}
}

export function hexVertexBucketsInitial(hexId) {
	const hex = getHexByID(hexId)
	return hex.bucketIdsInitial
}

export function hexCurrentBucketToInitial(hexId, bucketId) {
	const hex = getHexByID(hexId)
	return hex.bucketIdsInitial.filter((i) => hex.bucketIdsCurrent[i] === bucketId)
}

export function hexVertexBucketsCurrent(hexId) {
	const hex = getHexByID(hexId)
	return util.uniqueOnly(hex.bucketIdsCurrent)
}

export function hexNodeBucketIdsCurrent(hexId) {
	const hex = getHexByID(hexId)
	return hex.nodeBucketIds.map((i) => (i === -1 ? i : hex.bucketIdsCurrent[i]))
}

export function getCorrectTurnForPhasePreseet(actualCurrentTurn, actualCurrentPhase, furturePhase) {
	if (actualCurrentPhase > 15) rf.doAdminAlrt("Actual current phase is greater than 15")
	// If the future phase is GREATER than the current phase, it must be in the same turn
	if (furturePhase > actualCurrentPhase) {
		return actualCurrentTurn
	}
	// If the FUTURE phase is the SAME or LOWER than the currentPhase, it must be NEXT turn
	if (furturePhase <= actualCurrentPhase) {
		return actualCurrentTurn + 1
	}
}

///////////////
///////////////

// THIS DOES NOT SEEM TO BE USED ANYWHERE! KEEP IT IN CASE
export function removeResourcesFromGameUsingVertex_core(hexID, vertex, resArr) {
	const hex = getHexByID(hexID)
	const bucketId = hex.bucketIdsCurrent[hex.nodeBucketIds[vertex]]
	const locations = util
		.indexArray(hex.nodeVertexDefinitions.length)
		.filter((i) => hex.bucketIdsCurrent[hex.nodeBucketIds[i]] === bucketId)
		.map((i) => loc.setLandVertexLocation(hexID, i))
	const allResources = getAllInGameResources().sort((a, b) => a.id - b.id)
	let resourceIDs = []
	for (const resType of resArr) {
		let resID = (allResources.find((r) => !resourceIDs.includes(r.id) && util.includesArray(locations, r.location) && r.type === resType) || {}).id ?? -1
		if (resID === -1) {
			rf.doAdminAlrt(`RRFGUV: Resource not found: ${resType} input: ${JSON.stringify(resArr)}`)
			return ``
		}
		resourceIDs.push(resID)
	}
	// Unique the IDs just to make sure
	resourceIDs = [...new Set(resourceIDs)]
	// Sanity check; make sure you have the correct number of IDs
	if (resourceIDs.length !== resArr.length) {
		rf.doAdminAlrt("Inconsistent resources found")
		return
	}
	// Now Remove the resources
	for (const resID of resourceIDs) {
		let resObj = getResByID(resID)
		resObj.location = loc.setOOBlocation()
	}
}