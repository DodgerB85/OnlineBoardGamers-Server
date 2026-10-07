/** Headless game mutations. applyAction clones before mutation so rejected moves
 * never partly spend money or alter the board. The Vue model owns persistence. */
import * as rf from "./URRreference.js"
import * as rules from "./URRrules.js"
import * as board from "./URRboard.js"
import * as water from "./URRwater.js"
import * as boardRules from "./URRmap.js"

export function createGame(playerNames, boardDefinition = board.createPrintedBoard()) {
	boardRules.requireRule(playerNames.length >= 3 && playerNames.length <= 6, "UR: 1830 BC requires 3–6 players")
	return {
		version: rf.GAME_DATA_VERSION,
		players: playerNames.map((name, index) => ({ name, displayName: name, colour: rf.ALL_COLOURS[index], money: rf.STARTING_MONEY_BY_PLAYER_COUNT[playerNames.length], score: 0, soldLandTypes: [], soldEmergingStates: [] })),
		gameflow: {
			turn: 1, phase: rf.PHASE_DIVIDING_NATIONS, fullTurnOrder: Array.from(playerNames.keys()), turnOrder: [0],
			primogeniture: 0, primogenitureBid: null, passes: 0, treatyResumePlayer: 0, ashurPrice: 20,
			auction: null, stateOrder: [], stateIndex: 0, developmentStep: null, endReason: null, pendingOffer: null,
		},
		states: rf.ALL_STATES.map((id) => ({ id, money: 0, king: null, isActive: false, diggers: [], hasRevolted: false })),
		nations: rf.ALL_NATIONS.map((id) => ({ id, ownerType: null, owner: null, isRemoved: false, bids: [] })),
		board: boardRules.createBoard(boardDefinition),
		landPrices: [...rf.LAND_COLONIZATION_PRICES], era: 1, cardSupply: { ...rf.ERA_CARD_COUNTS },
		rain: { step: null, outflow: null, harvestOrder: [] }, nextDiggerId: 0,
	}
}

function nextPlayer(game, player = game.gameflow.turnOrder[0]) {
	game.gameflow.turnOrder = [(player + 1) % game.players.length]
}

function payNationIncome(game) {
	for (const nation of game.nations) {
		if (nation.isRemoved || nation.ownerType === null) continue
		const treasury = nation.ownerType === "player" ? game.players[nation.owner] : game.states[nation.owner]
		treasury.money += rf.NATION_INCOMES[nation.id]
	}
}

function awardNation(game, nation, player, amount) {
	game.players[player].money -= amount
	nation.ownerType = "player"
	nation.owner = player
	nation.bids = []
	if (nation.id === rf.NATION_FIRST_AKKADIANS) {
		const lands = game.board.areas.filter((area) => area.nation === nation.id)
		boardRules.requireRule(lands.length === 3 && lands.every((area) => area.state === rf.STATE_AKKAD && area.landType === rf.LAND_SAVANNAH && !area.isRiver && area.owner === null), "Configure the three First Akkadian savannah areas before awarding this nation")
		boardRules.requireRule(game.board.markerLimit === null || game.board.areas.filter((area) => area.markerOwner === player).length + 3 <= game.board.markerLimit, "Not enough ownership markers")
		for (const area of lands) area.owner = area.markerOwner = player
		game.states[rf.STATE_AKKAD].money += amount
		game.states[rf.STATE_AKKAD].king = rules.getKing(game, rf.STATE_AKKAD)
	}
}

function beginSettlement(game) {
	const flow = game.gameflow
	flow.phase = rf.PHASE_SETTLEMENT
	flow.turnOrder = [flow.primogeniture]
	flow.passes = 0
	flow.primogenitureBid = null
	for (const player of game.players) {
		player.soldLandTypes = []
		player.soldEmergingStates = []
	}
}

function resolveNegotiatedNations(game) {
	const flow = game.gameflow
	while (true) {
		const nation = game.nations.find((entry) => entry.ownerType === null)
		if (!nation) {
			flow.primogeniture = flow.treatyResumePlayer
			beginSettlement(game)
			return
		}
		if (nation.bids.length === 0) {
			flow.turnOrder = [flow.treatyResumePlayer]
			return
		}
		if (nation.bids.length === 1) {
			awardNation(game, nation, nation.bids[0].player, nation.bids[0].amount)
			continue
		}
		const high = nation.bids.reduce((best, bid) => bid.amount > best.amount ? bid : best)
		const bidders = nation.bids.map((bid) => bid.player)
		flow.auction = { nation: nation.id, bidders, highPlayer: high.player, amount: high.amount }
		setAuctionTurn(game, high.player, bidders)
		return
	}
}

function setAuctionTurn(game, previousPlayer, previousOrder) {
	const flow = game.gameflow
	const auction = flow.auction
	const nation = game.nations[auction.nation]
	let index = previousOrder.indexOf(previousPlayer)
	while (auction.bidders.length > 1) {
		// Keep the former successor after withdrawals; the high bidder never raises their own bid.
		do { index = (index + 1) % previousOrder.length } while (!auction.bidders.includes(previousOrder[index]) || previousOrder[index] === auction.highPlayer)
		const player = previousOrder[index]
		if (rules.availableMoney(game, player) >= auction.amount + 5) {
			flow.turnOrder = [player]
			return
		}
		// With no affordable raise, withdrawal is the only legal auction action.
		auction.bidders = auction.bidders.filter((bidder) => bidder !== player)
		nation.bids = nation.bids.filter((bid) => bid.player !== player)
	}
	awardNation(game, nation, auction.highPlayer, auction.amount)
	flow.auction = null
	resolveNegotiatedNations(game)
}

function nationAction(game, player, action) {
	const flow = game.gameflow
	if (flow.auction) {
		const auction = flow.auction
		const nation = game.nations[auction.nation]
		const currentAuctionOrder = [...auction.bidders]
		if (action.type === "pass") {
			auction.bidders = auction.bidders.filter((index) => index !== player)
			nation.bids = nation.bids.filter((bid) => bid.player !== player)
		} else {
			boardRules.requireRule(action.type === "bidNation", "Bid or withdraw from the auction")
			boardRules.requireRule(Number.isInteger(action.amount) && action.amount >= auction.amount + 5, "Raise the bid by at least 5 SPL")
			boardRules.requireRule(rules.availableMoney(game, player) >= action.amount, "Not enough unreserved money")
			nation.bids.find((bid) => bid.player === player).amount = action.amount
			auction.highPlayer = player
			auction.amount = action.amount
		}
		setAuctionTurn(game, player, currentAuctionOrder)
		return
	}
	const treaty = game.nations.find((nation) => nation.ownerType === null)
	if (action.type === "buyNation") {
		boardRules.requireRule(action.nation === treaty.id, "Only the treaty nation can be bought outright")
		const price = treaty.id === rf.NATION_ASHUR ? flow.ashurPrice : rf.NATION_PRICES[treaty.id]
		boardRules.requireRule(rules.availableMoney(game, player) >= price, "Not enough unreserved money")
		awardNation(game, treaty, player, price)
		flow.treatyResumePlayer = (player + 1) % game.players.length
		flow.passes = 0
		resolveNegotiatedNations(game)
	} else if (action.type === "bidNation") {
		const nation = game.nations[action.nation]
		boardRules.requireRule(nation && nation.ownerType === null && nation.id !== treaty.id, "Negotiate with an available non-treaty nation")
		const highest = Math.max(rf.NATION_PRICES[nation.id], ...nation.bids.map((bid) => bid.amount))
		boardRules.requireRule(Number.isInteger(action.amount) && action.amount >= highest + 5, "Raise the price or previous offer by at least 5 SPL")
		const oldBid = nation.bids.find((bid) => bid.player === player)
		const released = oldBid?.amount === highest ? oldBid.amount : 0
		boardRules.requireRule(rules.availableMoney(game, player) + released >= action.amount, "Not enough unreserved money")
		if (oldBid) nation.bids = nation.bids.filter((bid) => bid.player !== player)
		nation.bids.push({ player, amount: action.amount })
		flow.passes = 0
		nextPlayer(game)
	} else {
		boardRules.requireRule(action.type === "pass", "Choose a nation, negotiate, or pass")
		flow.passes++
		nextPlayer(game)
		if (flow.passes === game.players.length) {
			flow.passes = 0
			if (game.nations[rf.NATION_ASHUR].ownerType === null) {
				flow.ashurPrice -= 5
				if (flow.ashurPrice === 0) {
					const recipient = flow.turnOrder[0]
					awardNation(game, treaty, recipient, 0)
					flow.treatyResumePlayer = (recipient + 1) % game.players.length
					resolveNegotiatedNations(game)
				}
			} else payNationIncome(game)
		}
	}
}

function buyLand(game, player, id, isExchange = false) {
	const area = boardRules.getArea(game, id)
	const error = rules.getLandPurchaseError(game, player, area)
	boardRules.requireRule(!error || (isExchange && error === "Not enough private money"), error)
	const isColonization = area.markerOwner === null
	const price = isExchange ? 0 : rules.landPrice(game, area, isColonization)
	game.players[player].money -= price
	if (isColonization) game.states[area.state].money += price
	area.owner = area.markerOwner = player
	game.states[area.state].king = rules.getKing(game, area.state)
}

function sellLand(game, player, ids) {
	boardRules.requireRule(Array.isArray(ids) && new Set(ids).size === ids.length, "List each land sale once")
	const lands = ids.map((id) => boardRules.getArea(game, id))
	boardRules.requireRule(lands.every((area) => area.owner === player), "You may only sell your own land")
	boardRules.requireRule(new Set(lands.map((area) => area.landType)).size <= 1, "Each sale batch must contain one terrain type")
	for (const state of game.states) {
		const selling = lands.filter((area) => area.state === state.id).length
		if (selling > 0) boardRules.requireRule(rules.ownedLand(game, state.id).length > selling, "The last player-owned land in a state cannot be sold")
	}
	// Price the entire batch before moving any markers.
	game.players[player].money += lands.reduce((sum, area) => sum + rules.landPrice(game, area), 0)
	for (const area of lands) {
		area.owner = null
		if (!game.players[player].soldLandTypes.includes(area.landType)) game.players[player].soldLandTypes.push(area.landType)
		if (!game.states[area.state].isActive && !game.players[player].soldEmergingStates.includes(area.state)) game.players[player].soldEmergingStates.push(area.state)
	}
	for (const type of rf.ALL_LAND_TYPES) game.landPrices[type] = rules.priceAfterSale(game.landPrices[type], lands.filter((area) => area.landType === type).length)
	for (const state of game.states) state.king = rules.getKing(game, state.id)
}

function sellLandBatches(game, player, sales) {
	// Flat lists remain compatible with earlier action callers.
	for (const batch of sales.length > 0 && Array.isArray(sales[0]) ? sales : [sales]) sellLand(game, player, batch)
}

function beginDevelopment(game) {
	const flow = game.gameflow
	if (flow.primogenitureBid) flow.primogeniture = flow.primogenitureBid.player
	flow.primogenitureBid = null
	for (const state of game.states) {
		if (game.board.areas.filter((area) => area.state === state.id && area.markerOwner !== null).length >= rf.LAND_FOR_STATE_TO_ACTIVATE) state.isActive = true
		for (const digger of state.diggers) digger.hasDug = false
	}
	payNationIncome(game)
	flow.phase = rf.PHASE_DEVELOPMENT
	flow.stateOrder = rules.getDevelopmentOrder(game)
	flow.stateIndex = 0
	const eridu = game.nations[rf.NATION_ERIDU]
	if (!eridu.isRemoved && eridu.ownerType !== null) {
		flow.developmentStep = "eridu"
		flow.turnOrder = [eridu.ownerType === "player" ? eridu.owner : game.states[eridu.owner].king]
	} else pauseBetweenStates(game)
}

function settlementAction(game, player, action) {
	const flow = game.gameflow
	if (action.type === "pass") {
		flow.passes++
		if (flow.passes === game.players.length) beginDevelopment(game)
		else nextPlayer(game)
		return
	}
	if (action.type === "bidPrimogeniture") {
		const previous = flow.primogenitureBid
		boardRules.requireRule(Number.isInteger(action.amount) && action.amount > (previous?.amount || 0), "Bid more than the previous primogeniture bid")
		const released = previous?.player === player ? previous.amount : 0
		boardRules.requireRule(rules.availableMoney(game, player) + released >= action.amount, "Not enough unreserved money")
		flow.primogenitureBid = { player, amount: action.amount }
	} else {
		boardRules.requireRule(action.type === "tradeLand", "Trade land, bid for primogeniture, or pass")
		const before = action.sellBefore || []
		const after = action.sellAfter || []
		boardRules.requireRule(before.length + after.length > 0 || action.buy !== undefined, "An empty trade is not an action")
		sellLandBatches(game, player, before)
		if (action.buy !== undefined) {
			if (action.exchangeDer) {
				const nation = game.nations[rf.NATION_DER]
				boardRules.requireRule(!nation.isRemoved && nation.ownerType === "player" && nation.owner === player, "You do not own Der")
				boardRules.requireRule(boardRules.getArea(game, action.buy).landType === rf.LAND_FOREST, "Der can only be exchanged for forest")
				nation.isRemoved = true
			}
			buyLand(game, player, action.buy, !!action.exchangeDer)
		}
		sellLandBatches(game, player, after)
	}
	flow.passes = 0
	nextPlayer(game)
}

function beginStateTurn(game) {
	const flow = game.gameflow
	if (flow.stateIndex >= flow.stateOrder.length) {
		flow.phase = rf.PHASE_RAINY_SEASON
		flow.developmentStep = null
		flow.turnOrder = []
		game.rain = { step: "routing", outflow: null, harvestOrder: [] }
		for (const area of game.board.areas) area.irrigatedBy = null
		if (game.board.riverDownstream && water.startWaterRouting(game)) finishWaterRouting(game, game.rain.routing.outflow)
		return
	}
	flow.developmentStep = "digging"
	flow.turnOrder = [game.states[flow.stateOrder[flow.stateIndex]].king]
}

function digCanal(game, capacity, path) {
	const cost = boardRules.getCanalCost(game, path)
	boardRules.requireRule(boardRules.canCrewDig(capacity, cost), "The digging crew cannot build this stretch")
	for (let index = 1; index < path.length; index++) game.board.canals.push([path[index - 1], path[index]])
}

function consumeCard(game, era) {
	if (era < 5) game.cardSupply[era]--
	if (era <= game.era) return
	game.era = era
	if (era >= 3) {
		for (const state of game.states) state.diggers = state.diggers.filter((crew) => crew.era > era - 2)
	}
	if (era >= 4) for (const nation of game.nations) nation.isRemoved = true
}

function buyCard(game, state, action, consentingPlayer = null, isFree = false) {
	const era = rules.nextCardEra(game)
	const data = rf.ERA_CARD_DATA[era][action.kind]
	boardRules.requireRule(data, "Choose a digger, pump, or reservoir")
	const [capacity, printedPrice] = data
	// The first purchase starts its era immediately, including crew departures,
	// before deciding whether private funds may cover mandatory maintenance.
	consumeCard(game, era)
	const price = isFree ? 0 : printedPrice
	const shortfall = Math.max(0, price - state.money)
	if (shortfall > 0) {
		boardRules.requireRule(action.kind === "digger" && !rules.hasMaintenanceCrew(game, state.id), "Private funds may only fund a mandatory first crew")
		boardRules.requireRule(game.players[state.king].money >= shortfall, "The king must sell land or resolve a revolution before hiring this crew")
	}
	if (action.kind === "digger") {
		state.diggers.push({ id: game.nextDiggerId++, era, capacity, hasDug: true })
		if (state.id === rf.STATE_AKKAD) game.nations[rf.NATION_FIRST_AKKADIANS].isRemoved = true
	} else {
		const area = boardRules.getArea(game, action.area)
		boardRules.requireRule(!area.waterwork, "A waterwork already occupies this area")
		boardRules.requireRule((action.kind === "reservoir") === area.isRiver, "Reservoirs require rivers; pumps require land")
		boardRules.requireRule(!boardRules.isNationLandClosed(game, area), "Independent nation land is closed to construction")
		// A future consent action must authorize another player's land. A boolean
		// supplied by the builder is not sufficient evidence of that permission.
		boardRules.requireRule(area.owner === null || area.owner === state.king || area.owner === consentingPlayer, "The landowner must consent to this waterwork")
		const supply = game.board.waterworkLimits?.[state.id]?.[capacity]
		boardRules.requireRule(Number.isInteger(supply), "Configure physical waterwork token limits for this state and capacity")
		const used = game.board.areas.filter((land) => land.waterwork?.state === state.id && land.waterwork.capacity === capacity).length
		boardRules.requireRule(used < supply, "No matching waterwork tokens remain")
		area.waterwork = { state: state.id, capacity, kind: action.kind }
	}
	state.money = Math.max(0, state.money - price)
	game.players[state.king].money -= shortfall
}

function exchangeCalah(game, state, action, consentingPlayer = null) {
	const nation = game.nations[rf.NATION_CALAH]
	boardRules.requireRule(!nation.isRemoved && nation.ownerType === "state" && nation.owner === state.id, "This state does not own Calah")
	boardRules.requireRule(action.kind === "pump" || action.kind === "reservoir", "Calah must be exchanged for a waterwork")
	const area = boardRules.getArea(game, action.area)
	boardRules.requireRule(rules.isCalahWaterworkLocation(game, area), "Calah's free waterwork must be on or adjacent to its hills")
	buyCard(game, state, action, consentingPlayer, true)
	nation.isRemoved = true
}

function exchangeBarahshum(game, player, action) {
	boardRules.requireRule(rules.canExchangeBarahshum(game, player), "Barahshum cannot be exchanged now")
	const from = boardRules.getArea(game, action.from)
	const to = boardRules.getArea(game, action.to)
	boardRules.requireRule(from.nation === rf.NATION_BARAHSHUM && from.neighbours.includes(to.id), "Dig from Barahshum to an adjacent area")
	boardRules.requireRule(!game.board.canals.some(([a, b]) => (a === from.id && b === to.id) || (a === to.id && b === from.id)), "Canal already exists")
	game.nations[rf.NATION_BARAHSHUM].isRemoved = true
	boardRules.requireRule(!boardRules.isNationLandClosed(game, to), "Independent nation land is closed to digging")
	game.board.canals.push([from.id, to.id])
}

function applyMaintenanceSales(game, state, sales) {
	const player = state.king
	const prices = []
	for (const batch of sales) {
		boardRules.requireRule(game.players[player].money < rules.maintenanceShortfall(game, state.id), "Stop selling as soon as the mandatory crew can be paid for")
		boardRules.requireRule(Array.isArray(batch) && batch.length > 0, "Choose a nonempty sale batch")
		for (const id of batch) {
			const area = boardRules.getArea(game, id)
			boardRules.requireRule(!rules.getMaintenanceSaleError(game, player, area, state.id), rules.getMaintenanceSaleError(game, player, area, state.id))
			prices.push(rules.landPrice(game, area))
		}
		sellLand(game, player, batch)
		boardRules.requireRule(state.king === player, "Maintenance sales must preserve the current throne")
	}
	return prices
}

// Preview incomplete funding with the same sale validation used on submission.
export function previewMaintenanceSales(game, stateId, sales) {
	const preview = JSON.parse(JSON.stringify(game))
	applyMaintenanceSales(preview, preview.states[stateId], sales)
	return preview
}

function resolveMaintenance(game, state, action) {
	boardRules.requireRule(!rules.hasMaintenanceCrew(game, state.id), "This state already has a maintenance crew")
	const player = state.king
	const prices = applyMaintenanceSales(game, state, action.sales || [])
	const shortfall = rules.maintenanceShortfall(game, state.id)
	if (game.players[player].money >= shortfall) {
		boardRules.requireRule(prices.length === 0 || game.players[player].money - shortfall < Math.min(...prices), "The cash left after hiring must be less than the cheapest land sold")
		buyCard(game, state, { kind: "digger" })
		game.gameflow.developmentStep = "purchasing"
		return
	}
	boardRules.requireRule(!game.board.areas.some((area) => !rules.getMaintenanceSaleError(game, player, area, state.id)), "Sell the remaining eligible land before declaring a revolution")
	game.players[player].money = 0
	state.hasRevolted = true
	game.gameflow.endReason = "revolution"
	endStateTurn(game)
}

function endStateTurn(game) {
	const flow = game.gameflow
	flow.stateIndex++
	pauseBetweenStates(game)
}

function pauseBetweenStates(game) {
	const flow = game.gameflow
	const barahshum = game.nations[rf.NATION_BARAHSHUM]
	if (!barahshum.isRemoved && barahshum.ownerType === "player" && rules.barahshumDestinations(game).length) {
		flow.developmentStep = "betweenStates"
		flow.turnOrder = [flow.stateIndex < flow.stateOrder.length ? game.states[flow.stateOrder[flow.stateIndex]].king : flow.primogeniture]
	} else beginStateTurn(game)
}

function assimilateNation(game, state, action) {
	const nation = game.nations[action.nation]
	boardRules.requireRule(game.era === 3, "Nations can only be assimilated in era 3")
	boardRules.requireRule(nation && !nation.isRemoved && nation.ownerType !== null && nation.id !== rf.NATION_FIRST_AKKADIANS, "This nation cannot be assimilated")
	boardRules.requireRule(nation.ownerType !== "state" || nation.owner !== state.id, "This state already owns the nation")
	const price = rf.NATION_PRICES[nation.id]
	boardRules.requireRule(Number.isInteger(action.amount) && action.amount >= price / 2 && action.amount <= price * 2, "Pay between half and twice the printed price")
	boardRules.requireRule(state.money >= action.amount, "Not enough state money")
	const seller = nation.ownerType === "player" ? game.players[nation.owner] : game.states[nation.owner]
	seller.money += action.amount
	state.money -= action.amount
	nation.ownerType = "state"
	nation.owner = state.id
}

function requestConsent(game, state, action) {
	let owner
	if (action.type === "offerNation") {
		const nation = game.nations[action.nation]
		boardRules.requireRule(nation && !nation.isRemoved && nation.ownerType !== null, "Nation is unavailable")
		// Validate on a copy before asking another player to respond.
		const preview = JSON.parse(JSON.stringify(game))
		assimilateNation(preview, preview.states[state.id], action)
		owner = nation.ownerType === "player" ? nation.owner : game.states[nation.owner].king
	} else {
		boardRules.requireRule(action.kind === "pump" || action.kind === "reservoir", "Only waterworks need landowner consent")
		owner = boardRules.getArea(game, action.area).owner
		const preview = JSON.parse(JSON.stringify(game))
		if (action.type === "exchangeCalah") exchangeCalah(preview, preview.states[state.id], action, owner)
		else buyCard(preview, preview.states[state.id], action, owner)
	}
	if (owner === null || owner === state.king) {
		game.gameflow.developmentStep = "purchasing"
		if (action.type === "offerNation") assimilateNation(game, state, action)
		else if (action.type === "exchangeCalah") exchangeCalah(game, state, action, owner)
		else buyCard(game, state, action, owner)
	} else {
		game.gameflow.pendingOffer = { state: state.id, action, returnPlayer: state.king }
		game.gameflow.turnOrder = [owner]
	}
}

function respondToOffer(game, player, action) {
	boardRules.requireRule(action.type === "respondOffer" && typeof action.accept === "boolean", "Accept or decline the pending offer")
	const offer = game.gameflow.pendingOffer
	// A declined request buys nothing, so the state may still dig.
	if (action.accept) {
		game.gameflow.developmentStep = "purchasing"
		const state = game.states[offer.state]
		if (offer.action.type === "offerNation") assimilateNation(game, state, offer.action)
		else if (offer.action.type === "exchangeCalah") exchangeCalah(game, state, offer.action, player)
		else buyCard(game, state, offer.action, player)
	}
	game.gameflow.pendingOffer = null
	game.gameflow.turnOrder = [offer.returnPlayer]
}

function developmentAction(game, action) {
	const flow = game.gameflow
	if (flow.developmentStep === "betweenStates") {
		boardRules.requireRule(action.type === "beginDevelopment", "Start the next state's turn")
		beginStateTurn(game)
		return
	}
	if (flow.developmentStep === "eridu") {
		boardRules.requireRule(action.type === "digEridu" || action.type === "pass", "Use Eridu's crew or pass")
		if (action.type === "digEridu") digCanal(game, 2, action.path)
		pauseBetweenStates(game)
		return
	}
	const state = game.states[flow.stateOrder[flow.stateIndex]]
	if (action.type === "dig") {
		boardRules.requireRule(flow.developmentStep === "digging", "Canals must be dug before purchasing")
		const crew = state.diggers.find((entry) => entry.id === action.crew)
		boardRules.requireRule(crew && !crew.hasDug, "Choose an unused digging crew")
		digCanal(game, crew.capacity, action.path)
		crew.hasDug = true
	} else if (action.type === "offerNation" || action.type === "requestWaterwork" || action.type === "exchangeCalah") {
		requestConsent(game, state, action)
	} else if (action.type === "resolveMaintenance") {
		resolveMaintenance(game, state, action)
	} else if (action.type === "buyCard") {
		buyCard(game, state, action)
		flow.developmentStep = "purchasing"
	} else {
		boardRules.requireRule(action.type === "endDevelopment", "Dig, purchase a card, or end this state's turn")
		// Ending development commits to the mandatory crew when no land sales are needed.
		if (!rules.hasMaintenanceCrew(game, state.id)) buyCard(game, state, { kind: "digger" })
		endStateTurn(game)
	}
}

export function applyAction(current, player, action) {
	const game = JSON.parse(JSON.stringify(current))
	boardRules.requireRule(game.version === rf.GAME_DATA_VERSION, "Unsupported game data version")
	boardRules.requireRule(Number.isInteger(player) && game.players[player], "Unknown player")
	if (action.type === "exchangeBarahshum") {
		exchangeBarahshum(game, player, action)
		if (game.gameflow.phase === rf.PHASE_DEVELOPMENT && game.gameflow.developmentStep === "betweenStates") beginStateTurn(game)
		return game
	}
	boardRules.requireRule(game.gameflow.turnOrder[0] === player, "It is not this player's turn")
	if (game.gameflow.pendingOffer) respondToOffer(game, player, action)
	else if (game.gameflow.phase === rf.PHASE_DIVIDING_NATIONS) nationAction(game, player, action)
	else if (game.gameflow.phase === rf.PHASE_SETTLEMENT) settlementAction(game, player, action)
	else if (game.gameflow.phase === rf.PHASE_DEVELOPMENT) developmentAction(game, action)
	else if (game.gameflow.phase === rf.PHASE_RAINY_SEASON && game.rain.step === "routing") {
		let finished
		if (action.type === "advanceWater") {
			boardRules.requireRule(rules.getAutomaticAction(game)?.type === "advanceWater", "Choose where to send the available water")
finished = water.advanceWaterRouting(game)
	} else finished = water.allocateWater(game, action)
		if (finished) finishWaterRouting(game, game.rain.routing.outflow)
	}
	else if (game.gameflow.phase === rf.PHASE_RAINY_SEASON && game.rain.step === "harvest") harvestAction(game, action)
	else throw new Error("Water routing must be implemented before rainy-season turns can be submitted")
	return game
}

/** Called by the future water-routing resolver, not by a player action. The
 * resolver must already have assigned irrigatedBy and exhausted legal routing. */
export function finishWaterRouting(game, outflow) {
	boardRules.requireRule(game.gameflow.phase === rf.PHASE_RAINY_SEASON && game.rain.step === "routing", "Not resolving water")
	boardRules.requireRule(Number.isInteger(outflow) && outflow >= 0 && outflow <= 3 * rf.ERA_WATER_PER_RIVER[game.era], "Invalid southern outflow")
	const irrigated = game.board.areas.filter((area) => area.irrigatedBy !== null)
	boardRules.requireRule(irrigated.length + outflow === 3 * rf.ERA_WATER_PER_RIVER[game.era], "All source water must irrigate land or flow off the board")
	for (const area of irrigated) boardRules.requireRule(area.owner !== null && !area.isRiver && game.states[area.irrigatedBy]?.isActive, "Only owned land can be irrigated by an active state")
	for (const area of irrigated) game.players[area.owner].money += rf.IRRIGATED_LANDOWNER_INCOME * (area.isCity ? 2 : 1)
	game.rain.outflow = outflow
	game.rain.step = "harvest"
	game.rain.harvestOrder = [...game.gameflow.stateOrder]
	if (outflow === 0 && !game.gameflow.endReason) game.gameflow.endReason = "invasion"
	setHarvestTurn(game)
}

function setHarvestTurn(game) {
	if (game.rain.harvestOrder.length > 0) {
		const state = game.states[game.rain.harvestOrder[0]]
		// No decision remains for an empty harvest or a state that must distribute.
		if (rules.harvestAmount(game, state.id) === 0 || state.hasRevolted) {
			harvestAction(game, { type: "harvest", choice: "distribute" })
			return
		}
		game.gameflow.turnOrder = [state.king]
		return
	}
	const counts = rules.irrigatedRegionCounts(game)
	for (const type of rf.ALL_LAND_TYPES) {
		const index = rf.LAND_PRICE_TRACK.indexOf(game.landPrices[type])
		game.landPrices[type] = rf.LAND_PRICE_TRACK[Math.min(rf.LAND_PRICE_TRACK.length - 1, index + counts[type])]
	}
	for (const area of game.board.areas) area.irrigatedBy = null
	game.rain.step = "complete"
	if (game.gameflow.endReason) {
		for (let player = 0; player < game.players.length; player++) game.players[player].score = rules.playerAssets(game, player)
		game.gameflow.phase = rf.PHASE_GAME_OVER
		game.gameflow.turnOrder = []
		game.gameflow.finalPositions = Array.from(game.players.keys()).filter(index => !game.players[index].isMissing).sort((a, b) => game.players[b].score - game.players[a].score)
	} else {
		game.gameflow.turn++
		beginSettlement(game)
	}
}

function harvestAction(game, action) {
	const state = game.states[game.rain.harvestOrder[0]]
	boardRules.requireRule(action.type === "harvest" && ["store", "distribute"].includes(action.choice), "Store or distribute the harvest")
	boardRules.requireRule(!state.hasRevolted || action.choice === "distribute", "A revolting state must distribute its harvest")
	const amount = rules.harvestAmount(game, state.id)
	if (action.choice === "distribute") {
		const result = rules.harvestDistribution(game, state.id, amount)
		for (let index = 0; index < game.players.length; index++) game.players[index].money += result.payments[index]
		state.money += result.retained
	} else {
		const removable = rules.removableWaterworks(game, state.id)
		if (amount > 0 && removable.length > 0) {
			boardRules.requireRule(removable.includes(action.remove), "Remove a waterwork with the lowest printed capacity")
			boardRules.getArea(game, action.remove).waterwork = null
		}
		state.money += amount
	}
	game.rain.harvestOrder.shift()
	setHarvestTurn(game)
}

// Abandoned seats keep their holdings and indexes. This policy declines optional
// actions and delegates every mandatory action to the same rules as human moves.
export function getBotAction(game) {
	const flow = game.gameflow
	if (flow.pendingOffer) return { type: "respondOffer", accept: false }
	const automatic = rules.getAutomaticAction(game)
	if (automatic) return automatic
	if ([rf.PHASE_DIVIDING_NATIONS, rf.PHASE_SETTLEMENT].includes(flow.phase)) return { type: "pass" }
	if (flow.phase === rf.PHASE_DEVELOPMENT) {
		if (flow.developmentStep === "betweenStates") return { type: "beginDevelopment" }
		if (flow.developmentStep === "eridu") return { type: "pass" }
		const state = game.states[flow.stateOrder[flow.stateIndex]]
		if (!rules.hasMaintenanceCrew(game, state.id) && game.players[state.king].money < rules.maintenanceShortfall(game, state.id)) {
			const preview = JSON.parse(JSON.stringify(game))
			const sales = []
			while (preview.players[state.king].money < rules.maintenanceShortfall(preview, state.id)) {
				const eligible = preview.board.areas.filter(area => !rules.getMaintenanceSaleError(preview, state.king, area, state.id))
				if (!eligible.length) break
				// Highest prices first keep the final surplus below every sale price,
				// as required by the maintenance rule.
				eligible.sort((a, b) => rules.landPrice(preview, b) - rules.landPrice(preview, a))
				const batch = [eligible[0].id]
				sellLand(preview, state.king, batch)
				sales.push(batch)
			}
			return { type: "resolveMaintenance", sales }
		}
		return { type: "endDevelopment" }
	}
	if (flow.phase === rf.PHASE_RAINY_SEASON) {
		if (game.rain.step === "harvest") return { type: "harvest", choice: "distribute" }
		const choice = water.waterChoices(game)[0]
		if (choice) return { type: "allocateWater", area: choice.area, amount: 1 }
	}
	return null
}
