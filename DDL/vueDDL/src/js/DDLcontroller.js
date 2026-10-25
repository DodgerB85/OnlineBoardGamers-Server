/**
 * Turn / phase control. The controller applies rules mutations, records
 * history, opens the relevant modal and saves once per completed action.
 */

import * as rf from "./DDLreference.js"
import * as rules from "./DDLrules.js"
import * as model from "./DDLmodel.js"
import * as IO from "../backend/DDL_IO.js"
import { useModelStore } from "../stores/DDLstore.js"
import { usePersonalStore } from "../stores/DDLpersonal.js"
import i18n from "../i18n.js"

const t = i18n.global.t

export function currentPlayerIndex() {
	const store = useModelStore()
	return store.gameflow.turnOrder.length > 0 ? store.gameflow.turnOrder[0] : -1
}

// A practice game lets one browser drive every seat, so the acting player is
// whoever's turn it is; otherwise it is the viewer's own seat.
export function actingPlayerIndex() {
	const personal = usePersonalStore()
	return personal.trainingGame ? currentPlayerIndex() : personal.pov
}

export function currentPlayerObj() {
	const store = useModelStore()
	const idx = currentPlayerIndex()
	return store.players[idx] || null
}

export function isMyTurn() {
	const personal = usePersonalStore()
	return personal.canPlay() && currentPlayerIndex() === actingPlayerIndex()
}

export function isSimulPhase() {
	const store = useModelStore()
	return store.gameflow.phase === rf.PHASE_SETUP && store.gameflow.setup.auction
}

export function startPlayerTurn() {
	const personal = usePersonalStore()
	const store = useModelStore()
	personal.haltPlay = false
	const previousAction = store.context.action
	store.resetContext()
	if (personal.pov === -99 || personal.pov === -9) return
	if (store.viewSettings.showReplay) return

	if (store.gameflow.phase === rf.PHASE_SETUP) {
		if (store.gameflow.setup.auction && !store.gameflow.setup.auctionResolved) {
			store.viewSettings.showAuction = true
			if (!personal.trainingGame) IO.getBids(1, []).then((data) => handleAuctionBids(data))
		} else if (store.gameflow.setup.stage === rf.TURN_SETUP_GEAR) {
			store.viewSettings.showGearPicker = true
		} else if (store.gameflow.setup.stage === rf.TURN_SETUP_PLANET) {
			store.viewSettings.showPlanetPicker = true
		}
		return
	}

	if (store.gameflow.phase === rf.PHASE_GAME_OVER) return
	const acting = personal.trainingGame || personal.pov === store.gameflow.turnOrder[0]
	if (!acting) {
		personal.myTradeOffers = store.board.trades.filter((t) => t.status === "pending" && t.to === personal.pov)
		return
	}
	if (store.gameflow.pendingExplore) {
		store.viewSettings.showExplore = true
		return
	}
	if (store.gameflow.turnType === rf.TURN_ACTION && store.gameflow.movement.remaining > 0) store.context.action = rf.ACT_MOVE
	if (store.gameflow.turnType === rf.TURN_ACTION && store.gameflow.freeHighwaysLeft > 0) store.context.action = rf.ACT_PLACE_HIGHWAYS
	if (store.gameflow.turnType === rf.TURN_ACTION && [rf.ACT_BUILD, rf.ACT_TRADE, rf.ACT_MOVE, rf.ACT_PLACE_HIGHWAYS, rf.ACT_PATHWAY].includes(previousAction)) {
		store.context.action = previousAction
	}
	if (personal.myTradeOffers.length === 0) personal.myTradeOffers = store.board.trades.filter((t) => t.status === "pending" && t.to === personal.pov)
}

function advanceSetupTurn(state) {
	const next = rules.currentSetupPlayer(state)
	if (next >= 0) {
		const order = [...state.gameflow.turnOrder]
		const pos = order.indexOf(next)
		if (pos > 0) {
			state.gameflow.turnOrder = [...order.slice(pos), ...order.slice(0, pos)]
		}
	}
}

export async function submitGear(gearKeys) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const actor = rules.currentSetupPlayer(model.stateFromStore())
	const result = model.submitGear(actor, gearKeys)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	store.viewSettings.showGearPicker = false
	advanceSetupTurn(model.stateFromStore())
	model.addHistory(rf.HIST_NEW_GAME, actor, ["gear", gearKeys])
	await IO.saveGame(true)
	return true
}

export async function submitStartingPlanet(planetId) {
	const store = useModelStore()
	const actor = rules.currentSetupPlayer(model.stateFromStore())
	const result = model.submitStartingPlanet(actor, planetId)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	advanceSetupTurn(model.stateFromStore())
	model.addHistory(rf.HIST_NEW_GAME, actor, ["planet", planetId])
	await IO.saveGame(true)
	return true
}

// Auction ----------------------------------------------------------------

export async function submitAuctionBid(bid) {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!personal.canBid()) return false
	const round = store.gameflow.setup.stage === rf.TURN_SETUP_TIEBREAK ? 2 : 1
	const tiedNames = (store.gameflow.setup.tiebreakPlayers || []).map((idx) => store.players[idx].name)
	const result = await IO.saveBid(bid, round, tiedNames)
	if (!result || !result.ok) {
		store.gameMessages.actionError = (result && result.error) || t("errors.couldNotSaveBid")
		return false
	}
	personal.auctionSubmitted = true
	personal.auctionBid = Number(bid)
	return true
}

export async function pollAuction() {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!personal.canBid()) return
	const round = store.gameflow.setup.stage === rf.TURN_SETUP_TIEBREAK ? 2 : 1
	const tiedNames = (store.gameflow.setup.tiebreakPlayers || []).map((idx) => store.players[idx].name)
	const data = await IO.getBids(round, tiedNames)
	handleAuctionBids(data, round)
}

function handleAuctionBids(data, round = 1) {
	const store = useModelStore()
	const personal = usePersonalStore()
	if (!data || !data.ready) return
	const bids = data.bids || {}
	const byIndex = {}
	for (let i = 0; i < store.players.length; i++) {
		byIndex[i] = Number(bids[store.players[i].name] !== undefined ? bids[store.players[i].name] : 0)
	}
	if (round === 1) {
		const order = rules.auctionOrder(byIndex, store.players.map((_, i) => i))
		const groups = {}
		for (const idx of order) {
			const bid = byIndex[idx] || 0
			if (!groups[bid]) groups[bid] = []
			groups[bid].push(idx)
		}
		const tied = []
		for (const key of Object.keys(groups)) if (groups[key].length > 1) tied.push(...groups[key])
		if (tied.length > 0 && personal.trainingGame === false) {
			store.gameflow.setup.stage = rf.TURN_SETUP_TIEBREAK
			store.gameflow.setup.tiebreakPlayers = tied
			store.gameflow.setup.auctionBids = { ...byIndex }
			personal.auctionSubmitted = false
			store.viewSettings.showAuction = true
			return
		}
		model.resolveAuction(byIndex, order)
		store.gameflow.setup.auctionResolved = true
		store.viewSettings.showAuction = false
		store.viewSettings.showGearPicker = true
		IO.saveGame(true)
		return
	}

	// Round 2: tied players' new bids determine their order only inside their
	// original tie group; they do not jump past players who bid higher first.
	const finalBids = { ...(store.gameflow.setup.auctionBids || {}) }
	const tieBids = {}
	for (const idx of store.gameflow.setup.tiebreakPlayers || []) {
		tieBids[idx] = Number(bids[store.players[idx].name] || 0)
		finalBids[idx] = tieBids[idx]
	}
	const firstOrder = rules.auctionOrder(store.gameflow.setup.auctionBids || {}, store.players.map((_, i) => i))
	const order = rules.orderWithTiebreak(firstOrder, store.gameflow.setup.auctionBids || {}, tieBids)
	model.resolveAuction(finalBids, order)
	store.gameflow.setup.auctionResolved = true
	store.viewSettings.showAuction = false
	store.viewSettings.showGearPicker = true
	IO.saveGame(true)
}

// Main turn ---------------------------------------------------------------

export async function collectEnergy(colour) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.collectEnergy(model.stateFromStore(), actingPlayerIndex(), colour)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_ENERGY, actingPlayerIndex(), [colour, result.produced, result.virtual, result.gains])
	const energyKeys = ["movement", "build", "trade"]
	const collected = result.gains.map((n, i) => (n ? n + " " + t("energy." + energyKeys[i]) : "")).filter(Boolean).join(", ")
	store.gameMessages.successText = result.virtual ? result.message : t("energy.collectedGains", { gains: collected })
	await IO.saveGame(true)
	return true
}

export async function chooseAction() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.chooseAction(model.stateFromStore(), actingPlayerIndex())
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_ACTION_START, actingPlayerIndex(), [store.gameflow.turn])
	store.context.action = store.gameflow.freeHighwaysLeft > 0 ? rf.ACT_PLACE_HIGHWAYS : rf.ACT_NONE
	await IO.saveGame(true)
	return true
}

export async function placeHighway(nodeId, free = true) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const before = store.gameflow.freeHighwaysLeft
	const result = rules.placeHighway(model.stateFromStore(), actingPlayerIndex(), nodeId, free)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_HIGHWAY, actingPlayerIndex(), [nodeId, free])
	store.context.highlightNodes.splice(0)
	store.gameMessages.successText = t("messages.highwayPlaced")
	await IO.saveGame(true)
	if (before === 1 && store.gameflow.freeHighwaysLeft === 0) store.context.action = rf.ACT_NONE
	return true
}

export async function startMovement() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.startMovement(model.stateFromStore(), actingPlayerIndex())
	if (!result.ok) {
		if (result.needsCargoDiscard) {
			store.viewSettings.showDiscardCargo = true
			return false
		}
		store.gameMessages.actionError = result.message
		return false
	}
	store.context.action = rf.ACT_MOVE
	store.gameMessages.successText = t("messages.movement", { steps: result.remaining })
	await IO.saveGame(true)
	return true
}

export async function moveTo(nodeId) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.moveToNode(model.stateFromStore(), actingPlayerIndex(), nodeId)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_MOVE, actingPlayerIndex(), [nodeId, result.path])
	store.context.highlightNodes.splice(0)
	if (store.gameflow.pendingExplore) store.viewSettings.showExplore = true
	await IO.saveGame(true)
	if (store.gameflow.movement.remaining === 0) store.context.action = rf.ACT_NONE
	return true
}

export async function explore(column) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.explorePlanet(model.stateFromStore(), actingPlayerIndex(), column)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	store.viewSettings.showExplore = false
	store.gameMessages.successText = t("messages.planetExplored")
	await IO.saveGame(true)
	return true
}

export async function placePathways(inPlanetId, outPlanetId) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.placePathways(model.stateFromStore(), actingPlayerIndex(), inPlanetId, outPlanetId)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_PATHWAY, actingPlayerIndex(), [inPlanetId, outPlanetId])
	store.viewSettings.showInfo = false
	await IO.saveGame(true)
	return true
}

export async function usePathway() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.usePathway(model.stateFromStore(), actingPlayerIndex())
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_PATHWAY, actingPlayerIndex(), [result.planetId])
	if (store.gameflow.pendingExplore) store.viewSettings.showExplore = true
	await IO.saveGame(true)
	return true
}

export async function buildFactory(factoryTypeId) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.buildFactory(model.stateFromStore(), actingPlayerIndex(), factoryTypeId)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_BUILD, actingPlayerIndex(), ["factory", factoryTypeId, result.points])
	store.gameMessages.successText = t("messages.factoryBuilt", { points: result.points })
	await IO.saveGame(true)
	return true
}

export async function buildSite(randomGoodId, gearSlotIndex = -1) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.buildSite(model.stateFromStore(), actingPlayerIndex(), randomGoodId, gearSlotIndex)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_BUILD, actingPlayerIndex(), ["site", result.points])
	store.gameMessages.successText = result.points ? t("messages.siteBuiltPoints", { points: result.points }) : t("messages.siteBuilt")
	if (result.gear) store.gameMessages.successText += " " + t("messages.gearInstalled")
	await IO.saveGame(true)
	return true
}

export async function claimPrivilege(kind) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.claimPrivilege(model.stateFromStore(), actingPlayerIndex(), kind)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_BUILD, actingPlayerIndex(), ["privilege", kind])
	store.gameMessages.successText = t("messages.privilegeClaimed")
	await IO.saveGame(true)
	return true
}

export async function tradeMine() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.tradeMine(model.stateFromStore(), actingPlayerIndex())
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_TRADE, actingPlayerIndex(), ["mine", result.good])
	await IO.saveGame(true)
	return true
}

export async function tradeFactory() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.tradeFactory(model.stateFromStore(), actingPlayerIndex())
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_TRADE, actingPlayerIndex(), ["factory", result.good])
	await IO.saveGame(true)
	return true
}

export async function tradeConsumer() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.tradeConsumer(model.stateFromStore(), actingPlayerIndex())
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_TRADE, actingPlayerIndex(), ["consumer", result.points])
	store.gameMessages.successText = t("messages.goodsSold", { points: result.points })
	await IO.saveGame(true)
	return true
}

export async function buyGear(slotIndex, randomGoodId) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.buyGear(model.stateFromStore(), actingPlayerIndex(), slotIndex, randomGoodId)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_TRADE, actingPlayerIndex(), ["gear", result.gear, slotIndex])
	store.gameMessages.successText = t("messages.gearInstalled")
	await IO.saveGame(true)
	return true
}

export async function proposeTrade(toIndex, give, receive) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.proposeTrade(model.stateFromStore(), actingPlayerIndex(), toIndex, give, receive)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_TRADE_OFFER, actingPlayerIndex(), ["propose", toIndex, give, receive])
	store.viewSettings.showTrade = false
	await IO.saveGame(true)
	return true
}

export async function respondTrade(tradeId, accept) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.respondTrade(model.stateFromStore(), tradeId, actingPlayerIndex(), accept)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_TRADE_OFFER, actingPlayerIndex(), [accept ? "accept" : "decline", tradeId])
	personal.myTradeOffers = store.board.trades.filter((t) => t.status === "pending" && t.to === actingPlayerIndex())
	await IO.saveGame(true, { noNotify: true })
	return true
}

export async function discardCargo(goodId) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.discardGood(model.stateFromStore(), actingPlayerIndex(), goodId)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	await IO.saveGame(true)
	return true
}

export async function discardEnergy(colour) {
	const store = useModelStore()
	const personal = usePersonalStore()
	const result = rules.discardEnergy(model.stateFromStore(), actingPlayerIndex(), colour)
	if (!result.ok) {
		store.gameMessages.actionError = result.message
		return false
	}
	await IO.saveGame(true)
	return true
}

export async function endActionTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const endingTurn = store.gameflow.turn
	const result = rules.finishActionTurn(model.stateFromStore())
	if (!result.ok) {
		if (result.needsEnergyDiscard) {
			store.viewSettings.showDiscardEnergy = true
			return false
		}
		if (result.needsCargoDiscard) {
			store.viewSettings.showDiscardCargo = true
			return false
		}
		store.gameMessages.actionError = result.message
		return false
	}
	model.addHistory(rf.HIST_END_TURN, actingPlayerIndex(), [endingTurn])
	store.viewSettings.showDiscardCargo = false
	store.viewSettings.showDiscardEnergy = false
	await IO.saveGame(!result.gameOver)
	if (result.gameOver) personal.finishedGame = true
	return true
}

export async function skipMissingPlayerTurn() {
	const store = useModelStore()
	const personal = usePersonalStore()
	const currentIdx = currentPlayerIndex()
	const current = currentPlayerObj()
	if (!current) return false
	personal.removeCurrentFlexTime = true
	personal.removeCurrentFlexTimeName = current.name
	rules.advancePlayer(model.stateFromStore())
	model.addHistory(rf.HIST_END_TURN, currentIdx, ["skip"])
	await IO.saveGame(true)
	personal.removeCurrentFlexTime = false
	personal.removeCurrentFlexTimeName = ""
	return true
}

export async function gameOverNow() {
	const store = useModelStore()
	if (!window.confirm(t("confirm.endGameNow"))) return false
	const result = rules.endGame(model.stateFromStore())
	model.addHistory(rf.HIST_GAME_END, -1, result.finalPositions)
	await IO.saveGame(false)
	return true
}

export function setupPlayer() {
	const store = useModelStore()
	return rules.currentSetupPlayer(model.stateFromStore()) >= 0 ? store.players[rules.currentSetupPlayer(model.stateFromStore())] : currentPlayerObj()
}
