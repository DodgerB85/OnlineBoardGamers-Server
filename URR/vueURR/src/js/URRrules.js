/** Rule queries and economic calculations. All state is explicit and serializable. */
import * as rf from "./URRreference.js"
import { requireRule, isNationLandClosed } from "./URRmap.js"

export function ownedLand(game, stateId, player = null) {
	return game.board.areas.filter((area) => area.state === stateId && area.owner !== null && (player === null || area.owner === player))
}

export function availableMoney(game, player) {
	let reserved = game.gameflow.primogenitureBid?.player === player ? game.gameflow.primogenitureBid.amount : 0
	for (const nation of game.nations) {
		if (nation.ownerType !== null || nation.bids.length === 0) continue
		const highest = nation.bids.reduce((best, bid) => bid.amount > best.amount ? bid : best)
		if (highest.player === player) reserved += highest.amount
	}
	return game.players[player].money - reserved
}

export function landPrice(game, area, colonization = false) {
	if (colonization) return (area.isCity ? rf.LAND_CITY_COLONIZATION_PRICES : rf.LAND_COLONIZATION_PRICES)[area.landType]
	const price = game.landPrices[area.landType]
	if (!area.isCity) return price
	return Math.min(...game.landPrices.filter((value) => value > price), Math.max(...game.landPrices))
}

export function priceAfterSale(price, count) {
	const index = rf.LAND_PRICE_TRACK.indexOf(price)
	const intervention = rf.LAND_PRICE_TRACK.indexOf(rf.LAND_INTERVENTION_PRICE)
	requireRule(index >= 0, "Unknown land price")
	if (count === 0) return price
	return rf.LAND_PRICE_TRACK[index <= intervention ? Math.max(0, index - 1) : Math.max(intervention, index - Math.min(3, count))]
}

export function getLandPurchaseError(game, player, area) {
	if (area.isRiver) return "River areas cannot be bought"
	if (area.owner !== null) return "Land already has an owner"
	if (isNationLandClosed(game, area)) return "Independent nation land is not available"
	if (game.players[player].soldLandTypes.includes(area.landType)) return "You sold this terrain during this settlement"
	if (game.players[player].soldEmergingStates.includes(area.state)) return "You sold land in this emerging state"
	const used = game.board.areas.filter((land) => land.markerOwner === player).length
	if (game.board.markerLimit !== null && used >= game.board.markerLimit) return "No ownership markers remain"
	if (availableMoney(game, player) < landPrice(game, area, area.markerOwner === null)) return "Not enough private money"
	return ""
}

export function getKing(game, stateId) {
	const current = game.states[stateId].king
	const counts = Array.from(game.players.keys(), (index) => ownedLand(game, stateId, index).length)
	const most = Math.max(...counts)
	if (most === 0) return null
	if (current !== null && counts[current] === most) return current
	const start = current === null ? 0 : (current + 1) % game.players.length
	for (let offset = 0; offset < game.players.length; offset++) {
		const player = (start + offset) % game.players.length
		if (counts[player] === most) return player
	}
}

export function getDevelopmentOrder(game) {
	return game.states.filter((state) => state.isActive).map((state) => state.id).sort((a, b) => ownedLand(game, a).length - ownedLand(game, b).length || game.board.stateOrder.indexOf(a) - game.board.stateOrder.indexOf(b))
}

export function nextCardEra(game) {
	for (let era = 1; era < 5; era++) if (game.cardSupply[era] > 0) return era
	return 5
}

export function hasMaintenanceCrew(game, stateId) {
	const eridu = game.nations[rf.NATION_ERIDU]
	return game.states[stateId].diggers.length > 0 || (!eridu.isRemoved && eridu.ownerType === "state" && eridu.owner === stateId)
}

export function maintenanceShortfall(game, stateId) {
	if (hasMaintenanceCrew(game, stateId)) return 0
	return Math.max(0, rf.ERA_CARD_DATA[nextCardEra(game)].digger[1] - game.states[stateId].money)
}

export function getMaintenanceSaleError(game, player, area, stateId) {
	if (area.owner !== player) return "You may only sell your own land"
	if (ownedLand(game, area.state).length === 1) return "The last player-owned land in a state cannot be sold"
	if (area.state === stateId) {
		const remaining = ownedLand(game, stateId, player).length - 1
		if (game.players.some((entry, index) => index !== player && ownedLand(game, stateId, index).length > remaining)) return "A maintenance sale must preserve the current throne"
	}
	return ""
}

export function canExchangeBarahshum(game, player) {
	const nation = game.nations[rf.NATION_BARAHSHUM]
	if (!nation || nation.isRemoved || nation.ownerType === null) return false
	if (nation.ownerType === "player") return nation.owner === player && (game.gameflow.phase === rf.PHASE_SETTLEMENT || (game.gameflow.phase === rf.PHASE_DEVELOPMENT && game.gameflow.developmentStep === "betweenStates"))
	return game.gameflow.phase === rf.PHASE_DEVELOPMENT && game.gameflow.stateOrder[game.gameflow.stateIndex] === nation.owner && game.states[nation.owner].king === player && ["digging", "purchasing"].includes(game.gameflow.developmentStep) && !game.gameflow.pendingOffer
}

export function harvestAmount(game, stateId) {
	return game.board.areas.filter((area) => area.irrigatedBy === stateId).reduce((sum, area) => sum + rf.ERA_YIELD_PER_AREA[game.era] * (area.isCity ? 2 : 1), 0)
}

export function harvestDistribution(game, stateId, amount = harvestAmount(game, stateId)) {
	const counts = Array.from(game.players.keys(), (index) => ownedLand(game, stateId, index).length)
	const total = counts.reduce((sum, count) => sum + count, 0)
	const soleOwner = counts.filter((count) => count > 0).length === 1
	const payments = counts.map((count) => soleOwner && count > 0 ? amount : total === 0 ? 0 : count * Math.floor(amount / total))
	return { payments, retained: amount - payments.reduce((sum, payment) => sum + payment, 0) }
}

export function removableWaterworks(game, stateId) {
	const works = game.board.areas.filter((area) => area.waterwork?.state === stateId && area.waterwork.capacity !== "M")
	const lowest = Math.min(...works.map((area) => area.waterwork.capacity))
	return works.filter((area) => area.waterwork.capacity === lowest).map((area) => area.id)
}

export function irrigatedRegionCounts(game) {
	return rf.ALL_LAND_TYPES.map((type) => new Set(game.board.areas.filter((area) => area.landType === type && area.irrigatedBy !== null).map((area) => area.region)).size)
}

export function playerAssets(game, player) {
	return game.players[player].money + game.board.areas.filter((area) => area.owner === player).reduce((sum, area) => sum + landPrice(game, area), 0)
}
