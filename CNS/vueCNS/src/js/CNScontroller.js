/**
 * Contains functions related to the flow of the game,
 * or rather, interacting with the game, making moves,
 * ending turns / phases / etc
 *
 *
 */
import * as rf from "./CNSreference"
import * as model from "./CNSmodel"
import * as map from "./CNSmap"
import * as funcs from "./CNSfuncs"
import * as IO from "./CNS_IO"
import * as Bot from "./CNSbot"

import { useModelStore } from "../stores/CNSstore.js"
import { usePersonalStore } from "../stores/CNSpersonal"

export function currentPlayerObj() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (store.gameflow.turnOrder.length > 0) return store.players[store.gameflow.turnOrder[0]]
	else {
		if (!store.topMenuViews.showReplay & (personal.pov != undefined)) {
			alert("CP() Error")
			alert(store.gameflow.turnOrder)
		}
		return store.players[0]
	}
}

export function currentPlayerIndex() {
	const store = useModelStore()

	if (store.gameflow.turnOrder.length > 0) return store.gameflow.turnOrder[0]
	else {
		if (!store.topMenuViews.showReplay) alert("CP() IDX Error")
		return 0
	}
}

export function startPlayerTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (!personal.canPlay()) return

	if (store.gameflow.phase === rf.PHASE_MOVE_PIRATE) {
		store.networkPhaseResetData = ""
		store.context.action = rf.ACT_MOVE_PIRATE

		map.setNeighbours()

		const currentPirateParty = store.context.partyZones.findIndex((party) => party.some((obj) => obj.hexRef === store.pirateShipRef))
		store.context.partyPointsToHighlight.splice(0)
		for (let i = 0; i < store.context.partyZones.length; i++) {
			if (store.context.pirateActionsUsed === 1 && i === currentPirateParty) store.context.partyPointsToHighlight.push([])
			else store.context.partyPointsToHighlight.push(map.getEdgePointsForPartyZone(store.context.partyZones[i]))
		}
		if (store.context.pirateActionsUsed >= 2) store.pirateShipRef = -1

		store.wholeTurnResetData = funcs.exportModel(true)
	} else if (store.gameflow.phase === rf.PHASE_PRODUCTION) {
		store.context.action = rf.ACT_NONE
		store.context.startingTurnAfterPirates = true
		store.context.pirateActionsUsed = 0

		// Find all hexes in your network
		let hexRefs = map.getHexesInNetwork(currentPlayerObj(), true)

		// Then collect resources from them
		let networkResProd = rf.collectResAndProdFromHexRefs(hexRefs)

		// Set up production - may no longer include pirate ship
		store.context.availableProduction = [...networkResProd[1]]

		store.wholeTurnResetData = funcs.exportModel(true)
		store.phaseResetData = funcs.exportModel(true)
	} else {
		store.gameflow.phase = rf.PHASE_PLACE_HEXES
		store.networkPhaseResetData = ""
		let hexRefsInNetwork = map.getHexesInNetwork(currentPlayerObj(), true)
		if (hexRefsInNetwork.includes(rf.HEX_REAL_ESTATE_A) || hexRefsInNetwork.includes(rf.HEX_REAL_ESTATE_B)) store.context.realEstateAgentsInNetwork = 1
		if (hexRefsInNetwork.includes(rf.HEX_REAL_ESTATE_A) && hexRefsInNetwork.includes(rf.HEX_REAL_ESTATE_B)) store.context.realEstateAgentsInNetwork = 2

		store.wholeTurnResetData = funcs.exportModel(false)
	}
}

export function endCurrentPhase(andStartNext) {
	const store = useModelStore()

	if (store.gameflow.phase === rf.PHASE_PLACE_HEXES) {
		// Don't add history for resign / kick
		if (store.context.historyObj.length > 0) model.addHistory(rf.HIST_ADD_HEX, currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)

		model.discardHexes()
		if (andStartNext) {
			store.gameflow.phase = rf.PHASE_NETWORK
			map.calculateCanvasSize(false)
			startPhase(store.gameflow.phase)
			return
		}
	} else if (store.gameflow.phase === rf.PHASE_NETWORK) {
		// Will always move to the next phase. Prod always follows network
		store.gameflow.phase = rf.PHASE_PRODUCTION

		if (store.context.historyObj.length > 0) model.addHistory(rf.HIST_ADD_LINK, currentPlayerIndex(), 0, [...store.context.historyObj])
		store.context.historyObj.splice(0)

		startPhase(store.gameflow.phase)
		return
	} else if (store.gameflow.phase === rf.PHASE_PRODUCTION) {
		let totalRes = store.context.availableResources.reduce((acc, curr) => acc + curr, 0)
		// totalRes > 5, or expansion and total res > 3, allow removing resources
		if (totalRes > 5 || (store.useExpansion && totalRes > 3)) {
			store.gameflow.phase = rf.PHASE_STORE_RES
			store.phaseResetData = funcs.exportModel(true)
		} else {
			let totalRes = store.context.availableResources.reduce((acc, curr) => acc + curr, 0)
			if (totalRes > 0) model.storeResources()
			store.gameflow.phase = rf.PHASE_PRODUCTION
			store.context.action = rf.ACT_CONFIRM_END_TURN
		}
	}
}

export function startPhase(phase) {
	const store = useModelStore()

	if (phase === rf.PHASE_NETWORK) {
		store.context.placeableLinks.splice(0)
		store.context.placeableTiles.splice(0)
		store.context.action = rf.ACT_ADD_LINK
		map.setNeighbours()
		map.setPlaceableLinks(currentPlayerObj(), false)

		store.phaseResetData = funcs.exportModel(false)
		store.networkPhaseResetData = funcs.exportModel(true)
		model.setCurrentProdRes(currentPlayerObj())
	} else if (phase === rf.PHASE_PRODUCTION) {
		model.setupProductionPhase()
	}
}

export async function endPlayerTurn() {
	const store = useModelStore()
	endCurrentPhase(false)
	store.resetContext()
	// Check for game end
	if (store.hexDiscardPile.length + store.hexDrawPile.length === 0 || store.oldBoysNetwork.length >= 10) {
		model.endGame()
		return
	}

	// Check that there is more than 1 player left, otherwise end game
	let nbNonPlayers = 0
	for (let i = 0; i < store.players.length; i++) if (store.players[i].displayName === rf.BOT_NAME) nbNonPlayers++

	if (nbNonPlayers >= store.players.length - 1) {
		// Only 1 player left, so end game
		store.gameflow.phase = rf.PHASE_GAME_OVER
		model.endGame() // THIS ALSO SAVES THE GAME
		return
	}

	store.gameflow.turnOrder.shift()
	Bot.actionAnyBotMooves()

	if (store.gameflow.turnOrder.length === 0) {
		alert("INFO CODE 32")
		model.endTurn()
	}
	Bot.actionAnyBotMooves()

	store.gameflow.phase = rf.PHASE_PLACE_HEXES
	model.drawHexes(3)
	await IO.saveGame(true)

	startPlayerTurn()
}

export async function endPlayerPirateTurn() {
	const store = useModelStore()

	// Add the history
	model.addHistory(rf.HIST_PIRATE_MOVIE, currentPlayerIndex(), 0, [...store.context.historyObj])
	store.context.historyObj.splice(0)

	store.gameflow.phase = rf.PHASE_MOVE_PIRATE

	store.networkPhaseResetData = ""

	// Insert non bot player at start of turn order
	let possibleOptions = [...store.gameflow.fullTurnOrder]
	// Rotate possible options until current player is at the front
	while (possibleOptions[0] !== store.gameflow.turnOrder[0]) possibleOptions.push(possibleOptions.shift())
	// Then rotate once more
	possibleOptions.push(possibleOptions.shift())
	let chosenPlayerIndex = possibleOptions[0]
	while (store.players[chosenPlayerIndex].displayName === rf.BOT_NAME) {
		possibleOptions.shift()
		chosenPlayerIndex = possibleOptions[0]
	}

	store.gameflow.turnOrder.unshift(chosenPlayerIndex)
	store.context.partyZones.splice(0)
	await IO.saveGame(true, true)
}

export async function endPlayerPiratePlacementTurn() {
	const store = useModelStore()

	let pirateHexRotation = map.reconstructHexRotationFromHexRef(store.pirateShipRef)
	// add history
	model.addHistory(rf.HIST_MOVE_PIRATE, currentPlayerIndex(), 0, [store.pirateShipRef, pirateHexRotation])

	store.gameflow.phase = rf.PHASE_PRODUCTION

	store.gameflow.turnOrder.shift()
	store.context.partyZones.splice(0)
	await IO.saveGame(true, true)

	startPlayerTurn()
}

export function canResign() {
	const store = useModelStore()
	const personal = usePersonalStore()

	if (personal.trainingGame) return false
	if (personal.canPlay() && store.context.hexActionsUsed === 0 && store.gameflow.phase === rf.PHASE_PLACE_HEXES) return true
	return false
}
