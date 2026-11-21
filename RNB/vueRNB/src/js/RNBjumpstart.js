/**
 * &c Jumpstart: goods piles are auctioned before home tiles are chosen.
 * Pile index = home tile choice order. Winning bids are subtracted from the final score.
 * Maps with a JS key in setupData use those preset piles; otherwise players build one pile
 * each (5 goods per player, round-robin) before bidding.
 */
import * as rf from "./RNBreference"
import * as model from "./RNBmodel"
import * as wonder from "./RNBwonder"

import { useModelStore } from "../stores/RNBstore.js"

// Goods a player may add to a pile when building piles
export const PILE_GOODS = [rf.RES_TRUNKS, rf.RES_BOARDS, rf.RES_PAPER, rf.RES_GOOSE, rf.RES_CLAY, rf.RES_STONE, rf.RES_FUEL, rf.RES_IRON, rf.RES_GOLD, rf.RES_COINS, rf.RES_STOCK]

const NEUTRAL_FIRST_FOUR_WONDER_ROWS = Array(17).fill(8) // 4+4+4+5 bricks

function isActive(store, playerIndex) {
	return store.players[playerIndex].displayName !== rf.BOT_NAME
}

// Called once from initNewGame. Returns true when the game starts in a Jumpstart phase.
export function setupJumpstart() {
	const store = useModelStore()
	if (!store.gameOptions.useJumpStart || store.players.length < 2) return false
	const n = store.players.length
	const js = store.gameflow.jumpstart
	const presetPiles = store.mapData.setupData.JS
	js.piles = presetPiles ? JSON.parse(JSON.stringify(presetPiles)) : Array.from({ length: n }, () => [])
	js.owners = Array(js.piles.length).fill(-1)
	js.prices = Array(js.piles.length).fill(0)
	// Random first bidder, picked now so it is saved with the game (replays stay identical)
	js.firstBidder = Math.floor(Math.random() * n)

	if (presetPiles) {
		store.gameflow.phase = rf.PHASE_JUMPSTART_BIDDING
		store.gameflow.turnOrder = [js.firstBidder]
	} else {
		store.gameflow.phase = rf.PHASE_JUMPSTART_PILES
		// Clockwise from the player who suggested the game (the creator; seat 0 if unknown)
		const start = Math.max(0, store.players.findIndex((p) => p.name === window.initData.creatorName))
		const clockwise = store.gameflow.fullTurnOrder.map((_p, i) => (start + i) % n)
		store.gameflow.turnOrder = []
		for (let round = 0; round < rf.JUMPSTART_GOODS_PER_PLAYER; round++) store.gameflow.turnOrder.push(...clockwise)
	}
	return true
}

export function minBid(pileIdx) {
	const js = useModelStore().gameflow.jumpstart
	return js.owners[pileIdx] === -1 ? 0 : js.prices[pileIdx] + rf.JUMPSTART_MIN_RAISE
}

export function addGoodToPile(playerIndex, pileIdx, resType) {
	const store = useModelStore()
	if (!PILE_GOODS.includes(resType) || !store.gameflow.jumpstart.piles[pileIdx]) return false
	store.gameflow.jumpstart.piles[pileIdx].push(resType)
	model.addHistory(rf.HIST_JUMPSTART_ADD_GOOD, playerIndex, 0, [pileIdx, resType])
	return true
}

export function placeBid(playerIndex, pileIdx, amount) {
	const js = useModelStore().gameflow.jumpstart
	if (!Number.isInteger(amount) || pileIdx < 0 || pileIdx >= js.piles.length || amount < minBid(pileIdx)) return false
	js.owners[pileIdx] = playerIndex
	js.prices[pileIdx] = amount
	model.addHistory(rf.HIST_JUMPSTART_BID, playerIndex, 0, [pileIdx, amount])
	return true
}

// Clockwise from fromIdx (exclusive), the next active player without a pile. -1 when everyone has one.
export function nextBidder(fromIdx) {
	const store = useModelStore()
	const js = store.gameflow.jumpstart
	const n = store.players.length
	for (let step = 1; step <= n; step++) {
		const idx = (fromIdx + step) % n
		if (isActive(store, idx) && !js.owners.includes(idx)) return idx
	}
	return -1
}

// Move on after playerIndex finished (or was kicked from) a Jumpstart turn
export function endJumpstartTurn(playerIndex) {
	const store = useModelStore()
	if (store.gameflow.phase === rf.PHASE_JUMPSTART_PILES) {
		store.gameflow.turnOrder.shift()
		store.gameflow.turnOrder = store.gameflow.turnOrder.filter((idx) => isActive(store, idx))
		if (store.gameflow.turnOrder.length > 0) return
		store.gameflow.phase = rf.PHASE_JUMPSTART_BIDDING
		const js = store.gameflow.jumpstart
		const first = isActive(store, js.firstBidder) ? js.firstBidder : nextBidder(js.firstBidder)
		store.gameflow.turnOrder = first === -1 ? [] : [first]
		if (first !== -1) return
	} else {
		const next = nextBidder(playerIndex)
		store.gameflow.turnOrder = next === -1 ? [] : [next]
		if (next !== -1) return
	}
	finishBidding()
}

function finishBidding() {
	const store = useModelStore()
	const js = store.gameflow.jumpstart
	const entry3 = [JSON.parse(JSON.stringify(js.piles)), [...js.owners], [...js.prices]]
	model.addHistory(rf.HIST_JUMPSTART_RESULT, -1, 0, entry3)
	applyJumpstartResult(entry3)
	store.gameflow.phase = rf.PHASE_CHOOSE_HOME_TILE
	// Home tiles are chosen in pile order
	store.gameflow.turnOrder = js.owners.filter((idx) => idx !== -1 && isActive(store, idx))
}

// Live and replay: more than 5 goods per player fills the first four Wonder rows
export function applyJumpstartResult(entry3) {
	const store = useModelStore()
	const totalGoods = entry3[0].reduce((sum, pile) => sum + pile.length, 0)
	if (totalGoods > rf.JUMPSTART_GOODS_PER_PLAYER * store.players.length && store.wonderBricks.length === 0) {
		store.wonderBricks.push(...NEUTRAL_FIRST_FOUR_WONDER_ROWS)
		wonder.syncPoldersToBrickCount()
	}
}

function getResult() {
	return useModelStore().history.find((entry) => entry[0] === rf.HIST_JUMPSTART_RESULT)
}

export function pileForPlayer(playerIndex) {
	const result = getResult()
	if (!result) return []
	const pileIdx = result[3][1].indexOf(playerIndex)
	return pileIdx === -1 ? [] : result[3][0][pileIdx]
}

export function bidForPlayer(playerIndex) {
	const result = getResult()
	if (!result) return 0
	const pileIdx = result[3][1].indexOf(playerIndex)
	return pileIdx === -1 ? 0 : result[3][2][pileIdx]
}
