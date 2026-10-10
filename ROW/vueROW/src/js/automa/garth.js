/**
 * Garth automa — a faithful port of the reference GWT `Garth` class
 * (GPL-3.0, Tom Wetjens). Everything automa-specific lives here so the rest of
 * the engine stays clean; the engine only creates/hydrates a Garth and applies
 * its score adjustment.
 *
 * Garth is not a normal player: it has unlimited money, only b-side buildings,
 * draws moves from a shuffled GarthAction deck, ignores normal location actions
 * and rewrites its own scoring.
 */
import {
	ActionType,
	PossibleAction,
	Worker,
	Hand,
	HazardType,
	City,
	DiscColor,
	Unlockable,
	UNLOCKABLE_INFO,
	ROWException,
	ROWError,
	shuffle,
	handFee,
	isCattleCard,
	isObjectiveCard,
	Edition,
	ScoreCategory,
} from "../ROWcore"
import { PLAYER_BUILDINGS, CITY_INFO, JOB_MARKET_COST, OBJECTIVE_CARD_TYPES } from "../ROWdata"

const WORKERS = [Worker.COWBOY, Worker.CRAFTSMAN, Worker.ENGINEER]

const GREEN_STATION_TOWN = "40"
const RED_STATION_TOWN = "41"
const MEMPHIS = "MEM"
const GREEN_BAY = "GBY"
const MILWAUKEE = "MIL"
const TORONTO = "TOR"
const MINNEAPOLIS = "MIN"
const MONTREAL = "MON"

const DIFFICULTY = {
	EASY: { startCities: [City.WICHITA, City.ST_LOUIS], rttnStartCities: [City.CHICAGO] },
	MEDIUM: { startCities: [City.COLORADO_SPRINGS, City.BLOOMINGTON], rttnStartCities: [City.CHICAGO, City.CLEVELAND] },
	HARD: { startCities: [City.ALBUQUERQUE, City.CHICAGO_2], rttnStartCities: [City.CLEVELAND] },
	VERY_HARD: { startCities: [City.ALBUQUERQUE, City.CHICAGO_2], rttnStartCities: [City.CLEVELAND] },
}
export const DIFFICULTIES = Object.keys(DIFFICULTY)

// ---------------------------------------------------------------------------
// Small helpers over the JS engine representation
// ---------------------------------------------------------------------------
const hasMaxWorkers = (ps, worker) => ps.workers[worker] >= 6
const workersThatCanBeHired = (ps) => WORKERS.filter((w) => !hasMaxWorkers(ps, w))
const workerCount = (ps, worker) => ps.workers[worker] ?? 0
const optionalObjectives = (ps) => ps.hand.filter((c) => isObjectiveCard(c) && !ps.objectives.includes(c.id))
const jobCost = (rowIndex) => JOB_MARKET_COST[rowIndex]

function canUnlock(ps, unlockable) {
	const info = UNLOCKABLE_INFO[unlockable]
	return (ps.unlocked[unlockable] ?? 0) < info.count && ps.balance >= info.cost
}

function mostNumerousWorker(jm) {
	let best = null
	let bestCount = -1
	for (const w of WORKERS) {
		let count = 0
		for (let i = 0; i < jm.currentRowIndex; i++) count += jm.rows[i].workers.filter((x) => x === w).length
		if (count > bestCount) {
			bestCount = count
			best = w
		}
	}
	return best
}

function stationIndexAt(rt, space) {
	return rt.stations.findIndex((s) => s.space === space)
}

// ---------------------------------------------------------------------------
// Garth actions
// ---------------------------------------------------------------------------
function numberOfSpecializedWorkers(game, player) {
	const ps = game.playerState(player)
	return workerCount(ps, ps.automaState.specialization)
}
function highestNumberOfBuildingsAmongPlayers(game) {
	return game.state.players.reduce((m, p) => Math.max(m, game.getTrail().getBuildings(p.name).length), 0)
}

const GARTH_ACTIONS = [
	{ name: "GARTH_1", steps: (game) => (game.state.players.length === 4 ? 3 : 1), logic: (g, game, player, rng) => g.hireCheapestWorkerOfAnyType(game, player) },
	{ name: "GARTH_2", steps: () => 1, logic: (g, game, player, rng) => g.placeBranchletAndMoveEngineForward(game, player, rng) },
	{ name: "GARTH_3", steps: () => 1, logic: (g, game, player, rng) => g.placeBranchletAndTakeObjectiveCard(game, player, rng) },
	{ name: "GARTH_4", steps: (game) => (game.state.players.length === 2 ? 1 : 3), logic: (g, game, player) => g.removeHighestValueTeepee(game, player) },
	{ name: "GARTH_5", steps: (game) => (game.state.players.length === 2 ? 1 : 3), logic: (g, game, player) => g.removeHighestHazardOfTypeWithMostHazards(game, player) },
	{ name: "GARTH_6", steps: (game) => (game.state.players.length === 4 ? 3 : 1), logic: (g, game, player) => g.hireSpecializedOrMostNumerous(game, player) },
	{ name: "GARTH_7", steps: () => 2, logic: (g, game, player, rng) => g.placeBranchletAndMoveEngineForward(game, player, rng) },
	{ name: "GARTH_8", steps: () => 2, logic: (g, game, player, rng) => g.buyCattleCards(game, player, rng) },
	{ name: "GARTH_9", steps: () => 2, logic: (g, game, player, rng) => g.placeBranchletAndPlaceBuilding(game, player, rng) },
	{ name: "GARTH_10", steps: (game) => Math.max(1, highestNumberOfBuildingsAmongPlayers(game)), logic: (g, game, player) => g.placeBuildingIfSpecializedInCraftsmen(game, player) },
	{ name: "GARTH_11", steps: (game) => Math.max(1, highestNumberOfBuildingsAmongPlayers(game)), logic: (g, game, player) => g.hireEngineerAndMoveEngineForwardIfSpecializedInEngineers(game, player) },
	{ name: "GARTH_12", steps: (game, player) => game.playerState(player).workers[Worker.COWBOY], logic: (g, game, player, rng) => g.drawCattleCardsAndBuyCattleCardsIfSpecializedInCowboys(game, player, rng) },
	{ name: "GARTH_13", steps: (game, player) => game.playerState(player).workers[Worker.COWBOY], logic: (g, game, player, rng) => g.buyCattleCardsIfSpecializedInCowboys(game, player, rng) },
	{ name: "GARTH_14", steps: numberOfSpecializedWorkers, logic: (g, game, player) => g.moveEngineForwardIfSpecializedInEngineers(game, player) },
	{ name: "GARTH_15", steps: numberOfSpecializedWorkers, logic: (g, game, player) => g.placeBuildingIfSpecializedInCraftsmen(game, player) },
]
const ACTIONS_BY_NAME = Object.fromEntries(GARTH_ACTIONS.map((a) => [a.name, a]))

export class Garth {
	constructor(owner, drawStack, discardPile, difficulty, specialization) {
		this.owner = owner
		this.drawStack = drawStack
		this.discardPile = discardPile
		this.difficulty = difficulty
		this.specialization = specialization
	}
	serialize() {
		return {
			drawStack: this.drawStack.map((a) => a.name),
			discardPile: this.discardPile.map((a) => a.name),
			difficulty: this.difficulty,
			specialization: this.specialization,
		}
	}
	start(game, rng) {
		const ps = game.playerState(this.owner)
		switch (this.difficulty) {
			case "MEDIUM":
				ps.workers[this.specialization]++
				break
			case "HARD": {
				const first = randomWorker(rng)
				ps.workers[first]++
				const second = randomDifferentWorker(rng, first)
				ps.workers[second]++
				break
			}
			case "VERY_HARD":
				ps.workers[Worker.COWBOY]++
				ps.workers[Worker.CRAFTSMAN]++
				ps.workers[Worker.ENGINEER]++
				ps.workers[randomWorker(rng)]++
				break
			default:
				break
		}
	}
	adjustScore(categories, game, ps) {
		const out = { ...categories }
		out[ScoreCategory.DOLLARS] = 0
		out[ScoreCategory.EXTRA_STEP_POINTS] = 0
		out[ScoreCategory.STATION_MASTERS] = 0
		const committed = ps.objectives.map((id) => OBJECTIVE_CARD_TYPES[id]).filter(Boolean)
		out[ScoreCategory.OBJECTIVE_CARDS] = [...committed, ...optionalObjectives(ps)].reduce((a, c) => a + (c.points ?? 0), 0)
		const rt = game.getRailroadTrack()
		out[ScoreCategory.CITIES] = (out[ScoreCategory.CITIES] ?? 0) - rt.scoreSanFrancisco(ps.player, ps) + rt.numberOfDeliveries(ps.player, City.SAN_FRANCISCO) * 6
		return out
	}
	execute(game, rng) {
		const player = game.currentPlayer
		const ps = game.playerState(player)
		const possible = game.possibleActions()
		if (possible.has(ActionType.PLACE_BID)) {
			if (game.canSkip()) game.skip(player)
			else game.perform(player, { type: ActionType.PLACE_BID, ...lowestBidPossible(game) }, rng)
		} else if (possible.has(ActionType.MOVE)) {
			if (this.drawStack.length === 0) {
				shuffle(this.discardPile, rng)
				this.drawStack.push(...this.discardPile)
				this.discardPile.length = 0
			}
			const action = this.drawStack.shift()
			game.perform(player, { type: ActionType.MOVE, steps: calculateMove(game, action.steps(game, player)) }, rng)
			action.logic(this, game, player, rng)
			if (!game.getTrail().atKansasCity(player)) game.getActionStack().clear()
			this.discardPile.push(action)
		} else if (possible.has(ActionType.CHOOSE_FORESIGHT_1)) {
			game.perform(player, { type: ActionType.CHOOSE_FORESIGHT_1, choice: chooseForesight(game.getForesights().choices(0), rng) }, rng)
		} else if (possible.has(ActionType.CHOOSE_FORESIGHT_2)) {
			game.perform(player, { type: ActionType.CHOOSE_FORESIGHT_2, choice: chooseForesight(game.getForesights().choices(1), rng) }, rng)
		} else if (possible.has(ActionType.CHOOSE_FORESIGHT_3)) {
			game.perform(player, { type: ActionType.CHOOSE_FORESIGHT_3, choice: chooseForesight(game.getForesights().choices(2), rng) }, rng)
		} else if (possible.has(ActionType.DELIVER_TO_CITY)) {
			game.perform(player, { type: ActionType.DELIVER_TO_CITY, city: calculateDelivery(game, player), certificates: 0 }, rng)
		} else if (possible.has(ActionType.UNLOCK_WHITE)) {
			game.perform(player, { type: ActionType.UNLOCK_WHITE, unlock: randomWhiteDisc(ps) }, rng)
		} else if (possible.has(ActionType.UNLOCK_BLACK_OR_WHITE)) {
			game.perform(player, { type: ActionType.UNLOCK_BLACK_OR_WHITE, unlock: randomBlackOrWhiteDisc(ps) }, rng)
		} else if (possible.has(ActionType.TAKE_OBJECTIVE_CARD) && game.getObjectiveCards().available.length > 0) {
			game.perform(player, { type: ActionType.TAKE_OBJECTIVE_CARD, objectiveCard: randomObjectiveCard(game, rng) }, rng)
		} else if (possible.has(ActionType.TAKE_BONUS_STATION_MASTER)) {
			const pile = game.getRailroadTrack().stationMasters
			game.perform(player, { type: ActionType.TAKE_BONUS_STATION_MASTER, stationMaster: pile[rng.int(pile.length)] }, rng)
		} else if (possible.has(ActionType.GAIN_EXCHANGE_TOKEN)) {
			game.perform(player, { type: ActionType.GAIN_EXCHANGE_TOKEN }, rng)
		} else {
			game.endTurn(player, rng)
		}
	}

	// ---- individual Garth moves ----
	hireCheapestWorkerOfAnyType(game, player) {
		const ps = game.playerState(player)
		const jm = game.getJobMarket()
		const rowIndex = jm.getCheapestRow(workersThatCanBeHired(ps))
		if (rowIndex === null) return
		const row = jm.getRow(rowIndex)
		let worker
		if (row.includes(this.specialization) && !hasMaxWorkers(ps, this.specialization)) worker = this.specialization
		else worker = row.find((w) => !hasMaxWorkers(ps, w))
		if (!worker) return
		jm.takeWorker(rowIndex, worker)
		ps.workers[worker]++
		this.redetermineSpecialization(ps)
	}
	hireEngineer(game) {
		const ps = game.playerState(game.currentPlayer)
		if (hasMaxWorkers(ps, Worker.ENGINEER)) return
		const jm = game.getJobMarket()
		const rowIndex = jm.getCheapestRow([Worker.ENGINEER])
		if (rowIndex === null) return
		jm.takeWorker(rowIndex, Worker.ENGINEER)
		ps.workers[Worker.ENGINEER]++
		this.redetermineSpecialization(ps)
	}
	hireSpecializedOrMostNumerous(game) {
		const player = game.currentPlayer
		const ps = game.playerState(player)
		const jm = game.getJobMarket()
		const rowIndex = jm.getCheapestRow([this.specialization])
		if (rowIndex !== null && !hasMaxWorkers(ps, this.specialization)) {
			jm.takeWorker(rowIndex, this.specialization)
			ps.workers[this.specialization]++
			this.redetermineSpecialization(ps)
			return
		}
		const worker = mostNumerousWorker(jm)
		if (!worker || hasMaxWorkers(ps, worker)) return
		const ri = jm.getCheapestRow([worker])
		if (ri === null) return
		jm.takeWorker(ri, worker)
		ps.workers[worker]++
		this.redetermineSpecialization(ps)
	}
	redetermineSpecialization(ps) {
		for (const w of WORKERS) {
			if (w !== this.specialization && workerCount(ps, w) > workerCount(ps, this.specialization)) {
				this.specialization = w
				return
			}
		}
	}
	placeBuildingIfSpecializedInCraftsmen(game) {
		if (this.specialization === Worker.CRAFTSMAN) this.placeBuilding(game)
	}
	hireEngineerAndMoveEngineForwardIfSpecializedInEngineers(game) {
		if (this.specialization === Worker.ENGINEER) {
			this.hireEngineer(game)
			this.moveEngineForward(game)
		}
	}
	placeBranchletAndPlaceBuilding(game, player, rng) {
		if (game.isRailsToTheNorth()) this.placeBranchlet(game, player, rng)
		this.placeBuilding(game)
	}
	placeBranchletAndMoveEngineForward(game, player, rng) {
		if (game.isRailsToTheNorth()) this.placeBranchlet(game, player, rng)
		this.moveEngineForward(game)
	}
	placeBranchletAndTakeObjectiveCard(game, player, rng) {
		if (game.isRailsToTheNorth()) this.placeBranchlet(game, player, rng)
		this.takeObjectiveCard(game, player)
	}
	moveEngineForwardIfSpecializedInEngineers(game) {
		if (this.specialization === Worker.ENGINEER) this.moveEngineForward(game)
	}
	drawCattleCardsAndBuyCattleCardsIfSpecializedInCowboys(game, player, rng) {
		if (this.specialization !== Worker.COWBOY) return
		drawCattleCards(game)
		const remaining = game.playerState(player).workers[Worker.COWBOY] - 1
		if (remaining > 0) this.buyCattleCards(game, player, remaining)
	}
	buyCattleCardsIfSpecializedInCowboys(game, player, rng) {
		if (this.specialization === Worker.COWBOY) this.buyCattleCards(game, player, game.playerState(player).workers[Worker.COWBOY])
	}
	placeBuilding(game) {
		const trail = game.getTrail()
		const player = game.currentPlayer
		const playerCount = game.state.players.length
		const ps = game.playerState(player)
		const next = game.getNextPlayer()
		const startLoc = trail.getLocation(next && trail.currentLocation(next) ? trail.currentLocation(next) : "START")
		const newBuildLocation = firstEmptyBuildingLocation(trail, startLoc)
		const options = []
		for (const building of ps.buildings) {
			const info = PLAYER_BUILDINGS[building]
			if (!info || info.craftsmen > workerCount(ps, Worker.CRAFTSMAN)) continue
			if (newBuildLocation) options.push({ craftsmen: info.craftsmen, building, location: newBuildLocation })
			for (const loc of trail.locations.values()) {
				if (loc.kind !== "BUILDING" || !loc.building || loc.building.player !== player) continue
				const other = PLAYER_BUILDINGS[loc.building.name]
				if (other && other.craftsmen < info.craftsmen) options.push({ craftsmen: info.craftsmen - other.craftsmen, building, location: loc })
			}
		}
		if (options.length === 0) return
		options.sort((a, b) => {
			if (a.craftsmen !== b.craftsmen) return b.craftsmen - a.craftsmen
			const ap = a.location.building ? PLAYER_BUILDINGS[a.location.building.name]?.points ?? 0 : 0
			const bp = b.location.building ? PLAYER_BUILDINGS[b.location.building.name]?.points ?? 0 : 0
			if (ap !== bp) return bp - ap
			const aNew = handFee(PLAYER_BUILDINGS[a.building].hand, playerCount)
			const aOld = a.location.building ? handFee(PLAYER_BUILDINGS[a.location.building.name].hand, playerCount) : 0
			const bNew = handFee(PLAYER_BUILDINGS[b.building].hand, playerCount)
			const bOld = b.location.building ? handFee(PLAYER_BUILDINGS[b.location.building.name].hand, playerCount) : 0
			return bNew - bOld - (aNew - aOld)
		})
		const best = options[0]
		ps.removeBuilding(best.building)
		best.location.building = { name: best.building, player }
	}
	buyCattleCards(game, player, arg) {
		const ps = game.playerState(player)
		const numberOfCowboys = typeof arg === "number" ? arg : ps.workers[Worker.COWBOY]
		const jm = game.getCattleMarket()
		let best = null
		for (const possibleBuy of jm.possibleBuys(numberOfCowboys, 8)) {
			const buy = bestCattleCards(jm, possibleBuy)
			if (buy && (!best || buy.points > best.points)) best = buy
		}
		if (!best) return
		jm.buy(best.cards, best.cowboys, best.dollars)
		for (const card of best.cards) ps.gainCard(card)
	}
	removeHighestHazardOfTypeWithMostHazards(game, player) {
		const type = mostNumerousHazardType(game.getTrail())
		if (!type) return
		const loc = highestPointsHazard(game.getTrail(), type)
		if (!loc) return
		const hazard = loc.hazard
		loc.hazard = null
		game.playerState(player).hazards.push(hazard)
	}
	removeHighestValueTeepee(game, player) {
		const loc = highestValueTeepee(game.getTrail())
		if (!loc) return
		const teepee = loc.teepee
		loc.teepee = null
		game.playerState(player).teepees.push(teepee)
	}
	takeObjectiveCard(game, player) {
		const oc = game.getObjectiveCards()
		if (oc.available.length === 0) return
		const card = oc.available[0]
		oc.remove(card)
		game.playerState(player).gainCard(card)
	}
	moveEngineForward(game) {
		const player = game.currentPlayer
		const ps = game.playerState(player)
		const rt = game.getRailroadTrack()
		const atMost = workerCount(ps, Worker.ENGINEER)
		const reachable = [...rt.reachableSpacesForward(rt.currentSpace(player), 1, atMost)]
		const to = pick(reachable, (space) => {
			const idx = stationIndexAt(rt, space)
			const upgradeable = rt.isTurnout(space) && idx >= 0 && !rt.hasUpgraded(idx, player)
			return [upgradeable ? 1 : 0, space]
		})
		if (!to) return
		rt.moveEngineForward(player, to, 1, atMost)
		this.upgradeIfPossible(game, player, to)
		if (to === "39") this.moveEngineAtLeast1Backwards(game, player)
	}
	moveEngineAtLeast1Backwards(game, player) {
		const rt = game.getRailroadTrack()
		const reachable = [...rt.reachableSpacesBackwards(rt.currentSpace(player), 1, Number.MAX_SAFE_INTEGER)]
		const to = pick(reachable, (space) => {
			const idx = stationIndexAt(rt, space)
			const upgradeable = rt.isTurnout(space) && idx >= 0 && !rt.hasUpgraded(idx, player)
			return [upgradeable ? 0 : 1, space]
		}, true)
		if (!to) return
		rt.moveEngineBackwards(player, to, 1, Number.MAX_SAFE_INTEGER)
		this.upgradeIfPossible(game, player, to)
	}
	upgradeIfPossible(game, player, space) {
		const rt = game.getRailroadTrack()
		const idx = stationIndexAt(rt, space)
		if (idx < 0 || !rt.isTurnout(space)) return
		if (rt.hasUpgraded(idx, player)) return
		game.upgradeStation(idx)
		if (rt.stations[idx].stationMaster) game.appointStationMaster(Worker.ENGINEER)
	}
	placeBranchlet(game, player, rng) {
		const rt = game.getRailroadTrack()
		const ps = game.playerState(player)
		if (ps.branchlets === 0) return
		const possible = rt.possibleTowns(player)
		if (possible.length === 0) return
		const order =
			this.difficulty === "EASY" || this.difficulty === "MEDIUM"
				? [GREEN_STATION_TOWN, MEMPHIS, "42", RED_STATION_TOWN, "50", GREEN_BAY, MILWAUKEE, "51", "54", TORONTO, MINNEAPOLIS, "53", MONTREAL]
				: [GREEN_STATION_TOWN, MEMPHIS, "42", MONTREAL, "54", TORONTO, "51", "53", MINNEAPOLIS, GREEN_BAY, RED_STATION_TOWN, "50", MILWAUKEE]
		const town = order.find((t) => possible.includes(t))
		if (!town) return
		rt.placeBranchlet(player, town, ps)
		ps.removeBranchlet()
		const stationIdx = rt.stationForTown(town)
		if (stationIdx !== null && !rt.hasUpgraded(stationIdx, player)) game.upgradeStation(stationIdx)
	}
}

// ---------------------------------------------------------------------------
// Module-level helpers
// ---------------------------------------------------------------------------
function randomWorker(rng) {
	return WORKERS[rng.int(WORKERS.length)]
}
function randomDifferentWorker(rng, different) {
	let w
	do {
		w = randomWorker(rng)
	} while (w === different)
	return w
}

function firstEmptyBuildingLocation(trail, start) {
	const queue = [start]
	const seen = new Set([start.name])
	while (queue.length > 0) {
		const current = queue.shift()
		if (current.isEmpty() && current.kind === "BUILDING") return current
		for (const name of current.next) {
			if (seen.has(name)) continue
			seen.add(name)
			queue.push(trail.getLocation(name))
		}
	}
	return null
}

/** Max/min by a tuple comparator (arrays compare element-wise). */
function pick(items, keyFn, min = false) {
	let best = null
	let bestKey = null
	for (const item of items) {
		const key = keyFn(item)
		if (best === null || (min ? compareKey(key, bestKey) < 0 : compareKey(key, bestKey) > 0)) {
			best = item
			bestKey = key
		}
	}
	return best
}
function compareKey(a, b) {
	for (let i = 0; i < a.length; i++) {
		if (a[i] < b[i]) return -1
		if (a[i] > b[i]) return 1
	}
	return 0
}

function mostNumerousHazardType(trail) {
	let best = null
	let bestCount = 0
	for (const type of Object.values(HazardType)) {
		const count = [...trail.locations.values()].filter((l) => l.hazard && l.hazard.type === type).length
		if (count > bestCount) {
			bestCount = count
			best = type
		}
	}
	return best
}
function highestPointsHazard(trail, type) {
	// Java iterates each hazard type in space-number order (flood1..4, drought1..4, ...);
	// `max` keeps the first on a points tie, so the order is load-bearing.
	const candidates = [...trail.locations.values()]
		.filter((l) => l.hazard && l.hazard.type === type)
		.sort((a, b) => hazardNumber(a.name) - hazardNumber(b.name))
	return pick(candidates, (l) => [l.hazard.points])
}
function hazardNumber(name) {
	const m = /(\d+)$/.exec(name)
	return m ? parseInt(m[1], 10) : 0
}
function highestValueTeepee(trail) {
	return pick(
		[...trail.locations.values()].filter((l) => l.teepee !== null && l.teepee !== undefined),
		(l) => [l.def.reward ?? 0],
	)
}

function drawCattleCards(game) {
	game.getCattleMarket().draw()
	game.getCattleMarket().draw()
}
function bestCattleCards(jm, possibleBuy) {
	const market = jm.market
	const value = possibleBuy.breedingValue
	const sameValue = market.filter((c) => c.value === value)
	if (sameValue.length === 0) return null
	const card = sameValue.reduce((a, b) => (b.points > a.points ? b : a))
	if (!possibleBuy.pair) return { cards: [card], points: card.points, cowboys: possibleBuy.cowboys, dollars: possibleBuy.dollars }
	const second = market.filter((c) => c !== card && c.value === value).reduce((a, b) => (b.points > a.points ? b : a), null)
	if (!second) return null
	return { cards: [card, second], points: card.points + second.points, cowboys: possibleBuy.cowboys, dollars: possibleBuy.dollars }
}

function calculateMove(game, steps) {
	const trail = game.getTrail()
	const player = game.currentPlayer
	if (trail.currentLocation(player) === null) return ["A"]
	const ps = game.playerState(player)
	const moves = trail.possibleMovesFrom(player, ps.balance, steps, game.state.players.length)
	if (moves.length === 0) throw new ROWException(ROWError.NO_ACTIONS)
	// Java: most steps first, then lowest cost; ties broken by path (a determinism shim on both
	// sides -- the reference's HashSet iteration made the choice irreproducible).
	moves.sort((a, b) => {
		if (a.steps.length !== b.steps.length) return b.steps.length - a.steps.length
		if (a.cost !== b.cost) return a.cost - b.cost
		return a.steps.join(">").localeCompare(b.steps.join(">"))
	})
	return moves[0].steps
}

function chooseForesight(choices, rng) {
	const index = rng.int(choices.length)
	return choices[index] !== null && choices[index] !== undefined ? index : (index + 1) % 2
}

function calculateDelivery(game, player) {
	const diff = DIFFICULTY[game.playerState(player).automaState.difficulty] ?? DIFFICULTY.EASY
	const startCities = game.isRailsToTheNorth() ? diff.rttnStartCities : diff.startCities
	const highest = startCities[startCities.length - 1]
	const rt = game.getRailroadTrack()
	for (const city of startCities) {
		if (!rt.hasMadeDelivery(player, city) && rt.isAccessibleCity(player, city)) return city
	}
	const candidates = rt
		.possibleDeliveries(player, Number.MAX_SAFE_INTEGER, 0)
		.map((d) => d.city)
		.filter((city) => CITY_INFO[city].value > CITY_INFO[highest].value)
	if (candidates.length > 0) {
		candidates.sort((a, b) => CITY_INFO[a].value - CITY_INFO[b].value || (a === City.NEW_YORK_CITY ? 1 : 0) - (b === City.NEW_YORK_CITY ? 1 : 0))
		return candidates[0]
	}
	return game.edition === Edition.SECOND ? City.NEW_YORK_CITY : City.SAN_FRANCISCO
}

function randomObjectiveCard(game, rng) {
	const available = game.getObjectiveCards().available
	return available[rng.int(available.length)]
}
function randomWhiteDisc(ps) {
	const u = Object.values(Unlockable).find((x) => UNLOCKABLE_INFO[x].discColor === DiscColor.WHITE && canUnlock(ps, x))
	if (u === undefined) throw new ROWException(ROWError.NO_ACTIONS)
	return u
}
function randomBlackOrWhiteDisc(ps) {
	const u = Object.values(Unlockable).find((x) => canUnlock(ps, x))
	if (u === undefined) throw new ROWException(ROWError.NO_ACTIONS)
	return u
}
function lowestBidPossible(game) {
	const used = new Set()
	for (const name of game.state.playerOrder) {
		const bid = game.playerState(name).bid
		if (bid) used.add(bid.position)
	}
	for (let position = 0; position < game.state.playerOrder.length; position++)
		if (!used.has(position)) return { position, points: 0 }
	let max = null
	for (const name of game.state.playerOrder) {
		const bid = game.playerState(name).bid
		if (bid && (!max || bid.points > max.points)) max = bid
	}
	return max ? { position: max.position, points: max.points + 1 } : { position: 0, points: 0 }
}

export function createGarth(ps, rng, difficulty) {
	const deck = GARTH_ACTIONS.slice()
	shuffle(deck, rng)
	return new Garth(ps.player, deck, [], difficulty ?? "EASY", randomWorker(rng))
}
export function deserializeGarth(owner, obj) {
	return new Garth(
		owner,
		(obj.drawStack ?? []).map((n) => ACTIONS_BY_NAME[n]),
		(obj.discardPile ?? []).map((n) => ACTIONS_BY_NAME[n]),
		obj.difficulty,
		obj.specialization,
	)
}
