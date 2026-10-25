/**
 * Duck Dealer rules engine.
 *
 * Every function takes a plain game state (the same shape that is saved in
 * gameData) and mutates it only after validation has passed. No Vue, Pinia or
 * DOM dependencies, so the whole engine is unit-testable.
 */

import * as rf from "./DDLreference.js"
import * as map from "./DDLmap.js"
import { seededShuffle } from "./DDLfuncs.js"
import i18n from "../i18n.js"

const t = i18n.global.t

export function clone(obj) {
	return JSON.parse(JSON.stringify(obj))
}

export function makeEmptyEnergy() {
	return [0, 0, 0]
}

export function totalEnergy(player) {
	return player.energy[0] + player.energy[1] + player.energy[2]
}

export function totalVirtual(player) {
	return player.virtual[0] + player.virtual[1] + player.virtual[2]
}

export function currentPlayerIndex(state) {
	return state.gameflow.turnOrder.length > 0 ? state.gameflow.turnOrder[0] : -1
}

export function currentPlayer(state) {
	const idx = currentPlayerIndex(state)
	return idx >= 0 ? state.players[idx] : null
}

export function playerPlanet(state, playerIndex) {
	const node = state.players[playerIndex].ship.node
	return node ? rf.planetByNode(node) : null
}

export function planetState(state, planetId) {
	return state.board.planets.find((p) => p.id === planetId)
}

export function tileKey(planetId, kind) {
	return planetId + ":" + kind
}

export function hasPrivilege(state, playerIndex, planetId, kind) {
	const planet = planetState(state, planetId)
	return planet ? planet.privileges[kind] === playerIndex : false
}

export function freeTradeKey(planetId, kind) {
	return planetId + ":" + kind
}

export function energyForGear(gearKey) {
	return rf.gearEnergyColour(gearKey)
}

export function energyProduction(player, colour) {
	let count = 0
	for (const gear of player.gear) {
		if (gear && rf.gearEnergyColour(gear) === colour) count++
	}
	return count
}

export function energyGain(player, chosenColour) {
	const gains = [0, 0, 0]
	gains[chosenColour]++
	for (const gear of player.gear) {
		const colour = rf.gearEnergyColour(gear)
		if (colour >= 0) gains[colour]++
	}
	return gains
}

export function cargoUsed(player) {
	return player.goods.length
}

export function cargoCapacity(player) {
	return rf.cargoCapacity(player.gear)
}

export function cargoOverflow(player) {
	return Math.max(0, player.goods.length - cargoCapacity(player))
}

export function gearAt(player, slotIndex) {
	return player.gear[slotIndex] || null
}

export function filledGear(player) {
	return player.gear.filter(Boolean).length
}

export function firstEmptyGearSlot(player) {
	return player.gear.findIndex((gear) => !gear)
}

export function shipSpeed(player) {
	return rf.shipSpeed(player.gear)
}

export function countGoods(player, goodId) {
	let count = 0
	for (const good of player.goods) if (good === goodId) count++
	return count
}

export function hasGoods(player, needed) {
	const counts = {}
	for (const good of player.goods) counts[good] = (counts[good] || 0) + 1
	for (const good of needed) {
		if (!counts[good]) return false
		counts[good]--
	}
	return true
}

export function removeGoods(player, needed) {
	for (const good of needed) {
		const idx = player.goods.indexOf(good)
		if (idx !== -1) player.goods.splice(idx, 1)
	}
}

export function addGoods(player, goods) {
	for (const good of goods) player.goods.push(good)
}

export function discardGood(state, playerIndex, goodId) {
	const player = state.players[playerIndex]
	const idx = player.goods.indexOf(goodId)
	if (idx === -1) return { ok: false, message: t("errors.goodNotInCargo") }
	player.goods.splice(idx, 1)
	return { ok: true }
}

export function discardEnergy(state, playerIndex, colour) {
	const player = state.players[playerIndex]
	if (player.energy[colour] <= 0) return { ok: false, message: t("errors.noEnergyToDiscard") }
	player.energy[colour]--
	state.board.energyStock[colour]++
	return { ok: true }
}

// Setup --------------------------------------------------------------------

export function createInitialState({ playerNames, colours, seed = 1, auction = false }) {
	const players = playerNames.map((name, index) => ({
		name,
		displayName: name,
		colour: colours && colours[index] !== undefined ? colours[index] : index,
		score: 0,
		auctionBid: 0,
		energy: makeEmptyEnergy(),
		virtual: makeEmptyEnergy(),
		goods: [],
		gear: [null, null, null, null, null, null, null, null],
		ship: { node: null },
		cubes: 30,
		privileges: 10,
		pathways: { placed: false, in: null, out: null },
		freeTradeTiles: [],
	}))

	const startPlanets = rf.PLANETS.filter((p) => p.start)
	const normalPlanets = rf.PLANETS.filter((p) => !p.start)

	// Mines: four of each primary, one of each goes to a starting planet.
	let mineBag = []
	for (const good of rf.PRIMARY_GOODS) for (let i = 0; i < 4; i++) mineBag.push(good)
	mineBag = seededShuffle(mineBag, seed + 11)
	const startingMines = []
	for (const good of rf.PRIMARY_GOODS) {
		const idx = mineBag.indexOf(good)
		startingMines.push(mineBag.splice(idx, 1)[0])
	}
	seededShuffle(startingMines, seed + 12)
	mineBag = seededShuffle(mineBag, seed + 13)
	const normalMines = []
	for (const planet of normalPlanets) normalMines.push(mineBag.pop())

	// Spaceyards: one of each on the five starting planets.
	const spaceyards = seededShuffle(rf.SPACEYARD_TYPES.map((s) => s.id), seed + 21)

	// Consumer tiles: deal each value into the matching board slots.
	const consumerBuckets = { 3: [], 10: [], 30: [] }
	for (const tile of rf.CONSUMER_TILES) consumerBuckets[tile.points].push(tile.id)
	for (const value of [3, 10, 30]) seededShuffle(consumerBuckets[value], seed + 30 + value)
	const consumerSlots = rf.CONSUMER_COLUMNS.map((column) => column.map(() => null))
	for (let column = 0; column < rf.CONSUMER_COLUMNS.length; column++) {
		for (let row = 0; row < rf.CONSUMER_COLUMNS[column].length; row++) {
			const value = rf.CONSUMER_COLUMNS[column][row]
			consumerSlots[column][row] = consumerBuckets[value].pop() ?? null
		}
	}

	const planets = rf.PLANETS.map((planet) => {
		const startIndex = startPlanets.findIndex((p) => p.id === planet.id)
		const normalIndex = normalPlanets.findIndex((p) => p.id === planet.id)
		if (planet.start) {
			return {
				id: planet.id,
				start: true,
				mine: startingMines[startIndex],
				site: { kind: "spaceyard", tileId: spaceyards[startIndex], built: false },
				factory: null,
				privileges: { mine: -1, site: -1, factory: -1 },
				pathways: [],
			}
		}
		return {
			id: planet.id,
			start: false,
			mine: normalMines[normalIndex],
			site: null,
			factory: null,
			privileges: { mine: -1, site: -1, factory: -1 },
			pathways: [],
		}
	})

	const factoryStock = rf.FACTORY_TYPES.map((factory) => ({ id: factory.id, count: factory.copies }))

	return {
		version: 1,
		players,
		board: {
			planets,
			consumerSlots,
			factoryStock,
			trades: [],
			turnCubes: [],
			highways: {},
			energyStock: [rf.ENERGY_STOCK_PER_COLOUR, rf.ENERGY_STOCK_PER_COLOUR, rf.ENERGY_STOCK_PER_COLOUR],
		},
		gameflow: {
			turn: 1,
			phase: rf.PHASE_SETUP,
			turnOrder: players.map((_, i) => i),
			fullTurnOrder: players.map((_, i) => i),
			setup: {
				auction,
				stage: auction ? rf.TURN_SETUP_AUCTION : rf.TURN_SETUP_GEAR,
				gearDone: [],
				planetDone: [],
				auctionBids: {},
				auctionOrder: [],
				tiebreakPlayers: [],
				auctionResolved: !auction,
			},
			actionTurn: 1,
			turnType: rf.TURN_CHOOSE,
			freeActionTurn: false,
			freeHighwaysLeft: 0,
			movement: { remaining: 0, active: false },
			pendingExplore: null,
			finalPositions: [],
			winnerNames: [],
		},
		history: [],
	}
}

export function setupOrder(state) {
	const order = state.gameflow.setup.auctionResolved && state.gameflow.setup.auctionOrder.length > 0 ? state.gameflow.setup.auctionOrder : state.gameflow.fullTurnOrder
	return order
}

export function currentSetupPlayer(state) {
	const setup = state.gameflow.setup
	const done = setup.stage === rf.TURN_SETUP_PLANET || setup.gearDone.length >= state.players.length ? setup.planetDone : setup.gearDone
	const order = setupOrder(state)
	for (const idx of order) if (!done.includes(idx)) return idx
	return -1
}

export function resolveAuction(state, bids, order) {
	const setup = state.gameflow.setup
	setup.auctionBids = { ...bids }
	setup.auctionOrder = [...order]
	setup.auctionResolved = true
	setup.stage = rf.TURN_SETUP_GEAR
	state.gameflow.fullTurnOrder = [...order]
	state.gameflow.turnOrder = [...order]
	for (let i = 0; i < state.players.length; i++) {
		const byName = bids[state.players[i].name]
		state.players[i].auctionBid = Number(byName !== undefined ? byName : bids[i] || 0)
	}
	return { ok: true }
}

export function auctionOrder(bids, seatOrder) {
	const entries = seatOrder.map((idx, seat) => {
		const value = bids[idx] !== undefined ? bids[idx] : bids[seat]
		return { idx, seat, bid: Number(value !== undefined ? value : 0) }
	})
	// bids may be keyed by player index (client) or username (server); accept both.
	entries.sort((a, b) => b.bid - a.bid || a.seat - b.seat)
	return entries.map((entry) => entry.idx)
}

export function orderWithTiebreak(firstOrder, firstBids, tieBids) {
	const groups = []
	for (const idx of firstOrder) {
		const bid = Number(firstBids[idx] || 0)
		const last = groups[groups.length - 1]
		if (last && Number(firstBids[last[0]] || 0) === bid) last.push(idx)
		else groups.push([idx])
	}
	return groups.flatMap((group) => {
		if (group.length === 1) return group
		return [...group].sort((a, b) => Number(tieBids[b] || 0) - Number(tieBids[a] || 0) || firstOrder.indexOf(a) - firstOrder.indexOf(b))
	})
}

export function submitGear(state, playerIndex, gearKeys) {
	if (state.gameflow.setup.stage !== rf.TURN_SETUP_GEAR) return { ok: false, message: t("errors.notChoosingGear") }
	if (currentSetupPlayer(state) !== playerIndex) return { ok: false, message: t("errors.notSetupTurn") }
	if (!Array.isArray(gearKeys) || gearKeys.length !== rf.STARTING_GEAR) return { ok: false, message: t("errors.chooseThreeGear") }
	for (const key of gearKeys) if (!rf.GEAR_BY_KEY[key]) return { ok: false, message: t("errors.unknownGear") }
	const player = state.players[playerIndex]
	for (let i = 0; i < rf.STARTING_GEAR; i++) player.gear[i] = gearKeys[i]
	if (!state.gameflow.setup.gearDone.includes(playerIndex)) state.gameflow.setup.gearDone.push(playerIndex)
	if (state.gameflow.setup.gearDone.length >= state.players.length) state.gameflow.setup.stage = rf.TURN_SETUP_PLANET
	return { ok: true }
}

export function submitStartingPlanet(state, playerIndex, planetId) {
	const setup = state.gameflow.setup
	if (setup.stage !== rf.TURN_SETUP_PLANET) return { ok: false, message: t("errors.notChoosingPlanet") }
	if (currentSetupPlayer(state) !== playerIndex) return { ok: false, message: t("errors.notSetupTurn") }
	const planet = rf.PLANETS.find((p) => p.id === planetId && p.start)
	if (!planet) return { ok: false, message: t("errors.chooseStartingPlanet") }
	for (const player of state.players) if (player.ship.node === "P" + planetId) return { ok: false, message: t("errors.planetTaken") }
	state.players[playerIndex].ship.node = "P" + planetId
	if (!setup.planetDone.includes(playerIndex)) setup.planetDone.push(playerIndex)
	if (setup.planetDone.length >= state.players.length) {
		state.gameflow.phase = rf.PHASE_MAIN
		state.gameflow.turn = 1
		state.gameflow.actionTurn = 1
		state.gameflow.turnType = rf.TURN_CHOOSE
		state.gameflow.turnOrder = [...setupOrder(state)]
		state.gameflow.fullTurnOrder = [...setupOrder(state)]
		state.gameflow.setup.stage = "DONE"
	}
	return { ok: true }
}

// Turn flow ----------------------------------------------------------------

export function advancePlayer(state) {
	if (state.gameflow.turnOrder.length === 0) state.gameflow.turnOrder = [...state.gameflow.fullTurnOrder]
	state.gameflow.turnOrder.push(state.gameflow.turnOrder.shift())
	state.gameflow.turnType = rf.TURN_CHOOSE
	state.gameflow.freeActionTurn = false
	state.gameflow.freeHighwaysLeft = 0
	state.gameflow.movement = { remaining: 0, active: false }
	state.gameflow.pendingExplore = null
}

export function beginActionTurn(state, playerIndex, free = false) {
	const player = state.players[playerIndex]
	state.gameflow.turnType = rf.TURN_ACTION
	state.gameflow.actionStage = rf.ACT_PLACE_HIGHWAYS
	state.gameflow.freeActionTurn = free
	state.gameflow.freeHighwaysLeft = state.gameflow.turn <= 8 ? 1 : state.gameflow.turn <= 16 ? 2 : 3
	state.gameflow.movement = { remaining: 0, active: false }
	state.gameflow.pendingExplore = null
	player.freeTradeTiles = []

	// Put a cube on the turn track. If the supply is out, take a highway cube
	// (or a privilege) back off the board, as the rulebook allows.
	let cubeTaken = false
	if (player.cubes > 0) {
		player.cubes--
		cubeTaken = true
	} else {
		const highwayNode = Object.keys(state.board.highways).find((node) => state.board.highways[node] === playerIndex)
		if (highwayNode) {
			delete state.board.highways[highwayNode]
			cubeTaken = true
		} else if (player.privileges > 0) {
			player.privileges--
			cubeTaken = true
		}
	}
	if (cubeTaken) state.board.turnCubes.push({ player: playerIndex, turn: state.gameflow.turn })
	return { ok: true, free }
}

export function chooseAction(state, playerIndex) {
	if (currentPlayerIndex(state) !== playerIndex) return { ok: false, message: t("errors.notYourTurn") }
	if (state.gameflow.turnType !== rf.TURN_CHOOSE) return { ok: false, message: t("errors.alreadyChoseAction") }
	return beginActionTurn(state, playerIndex)
}

export function collectEnergy(state, playerIndex, colour) {
	if (currentPlayerIndex(state) !== playerIndex) return { ok: false, message: t("errors.notYourTurn") }
	if (state.gameflow.turnType !== rf.TURN_CHOOSE) return { ok: false, message: t("errors.mustTakeAction") }
	if (![0, 1, 2].includes(colour)) return { ok: false, message: t("errors.invalidEnergyColour") }
	const player = state.players[playerIndex]
	const gains = energyGain(player, colour)
	let virtual = false
	for (let c = 0; c < 3; c++) {
		for (let i = 0; i < gains[c]; i++) {
			if (state.board.energyStock[c] > 0) {
				state.board.energyStock[c]--
				player.energy[c]++
			} else {
				player.virtual[c]++
				virtual = true
			}
		}
	}
	if (virtual) {
		state.gameflow.freeActionTurn = true
		beginActionTurn(state, playerIndex, true)
		return { ok: true, produced: gains.reduce((a, b) => a + b, 0), gains, virtual: true, message: t("energy.shortage") }
	}
	advancePlayer(state)
	return { ok: true, produced: gains.reduce((a, b) => a + b, 0), gains, virtual: false }
}

export function spendEnergy(state, playerIndex, colour) {
	const player = state.players[playerIndex]
	if (player.energy[colour] > 0) {
		player.energy[colour]--
		state.board.energyStock[colour]++
		return true
	}
	if (player.virtual[colour] > 0) {
		player.virtual[colour]--
		return true
	}
	return false
}

export function placeHighway(state, playerIndex, segmentNode, free = false) {
	if (state.gameflow.turnType !== rf.TURN_ACTION) return { ok: false, message: t("errors.notActionTurn") }
	if (!map.isSegmentNode(segmentNode)) return { ok: false, message: t("errors.highwayOnDot") }
	if (state.board.highways[segmentNode] !== undefined) return { ok: false, message: t("errors.dotHasHighway") }
	const ships = map.shipsOnNode(state, segmentNode)
	if (ships.length > 0) return { ok: false, message: t("errors.shipOnDot") }
	const player = state.players[playerIndex]
	if (player.cubes <= 0) return { ok: false, message: t("errors.noHighwayParts") }
	if (free) {
		if (state.gameflow.freeHighwaysLeft <= 0) return { ok: false, message: t("errors.noFreeHighways") }
		state.gameflow.freeHighwaysLeft--
	} else {
		if (!spendEnergy(state, playerIndex, rf.YELLOW_ENERGY)) return { ok: false, message: t("errors.highwayCost") }
	}
	player.cubes--
	state.board.highways[segmentNode] = playerIndex
	return { ok: true, free }
}

export function startMovement(state, playerIndex) {
	if (state.gameflow.turnType !== rf.TURN_ACTION) return { ok: false, message: t("errors.notActionTurn") }
	if (state.gameflow.movement.remaining > 0) return { ok: true, remaining: state.gameflow.movement.remaining }
	if (cargoOverflow(state.players[playerIndex]) > 0) return { ok: false, message: t("errors.discardBeforeMoving"), needsCargoDiscard: true }
	if (!spendEnergy(state, playerIndex, rf.RED_ENERGY)) return { ok: false, message: t("errors.movementCost") }
	state.gameflow.movement.remaining = shipSpeed(state.players[playerIndex])
	state.gameflow.movement.active = true
	state.players[playerIndex].freeTradeTiles = []
	expireTradesForPlayer(state, playerIndex)
	return { ok: true, remaining: state.gameflow.movement.remaining }
}

export function moveToNode(state, playerIndex, targetNode) {
	if (state.gameflow.turnType !== rf.TURN_ACTION) return { ok: false, message: t("errors.notActionTurn") }
	if (state.gameflow.movement.remaining <= 0) return { ok: false, message: t("errors.spendMovementFirst") }
	const player = state.players[playerIndex]
	const path = map.findPath(state, playerIndex, player.ship.node, targetNode)
	if (path.cost > state.gameflow.movement.remaining) return { ok: false, message: t("errors.beyondMovement") }
	player.ship.node = targetNode
	state.gameflow.movement.remaining -= path.cost
	player.freeTradeTiles = []
	expireTradesForPlayer(state, playerIndex)
	const planet = rf.planetByNode(targetNode)
	if (planet) {
		state.gameflow.movement.remaining = 0
		if (!planet.start) {
			const boardPlanet = planetState(state, planet.id)
			if (boardPlanet && !boardPlanet.site) state.gameflow.pendingExplore = { player: playerIndex, planetId: planet.id }
		}
	}
	return { ok: true, path: path.path, planetId: planet ? planet.id : -1 }
}

export function stopMovement(state) {
	state.gameflow.movement.remaining = 0
}

export function explorePlanet(state, playerIndex, column) {
	const pending = state.gameflow.pendingExplore
	if (!pending || pending.player !== playerIndex) return { ok: false, message: t("errors.noPlanetToExplore") }
	const slots = state.board.consumerSlots
	if (!slots[column]) return { ok: false, message: t("errors.invalidConsumerColumn") }
	let tileId = null
	for (let row = 0; row < slots[column].length; row++) {
		if (slots[column][row] !== null) {
			tileId = slots[column][row]
			slots[column][row] = null
			break
		}
	}
	if (tileId === null) return { ok: false, message: t("errors.emptyConsumerColumn") }
	const planet = planetState(state, pending.planetId)
	planet.site = { kind: "consumer", tileId, built: false }
	state.gameflow.pendingExplore = null
	return { ok: true, tileId, planetId: pending.planetId }
}

export function placePathways(state, playerIndex, inPlanetId, outPlanetId) {
	if (state.gameflow.turnType !== rf.TURN_ACTION) return { ok: false, message: t("errors.pathwaysDuringAction") }
	const player = state.players[playerIndex]
	if (player.pathways.placed) return { ok: false, message: t("errors.pathwaysAlreadyPlaced") }
	if (inPlanetId === outPlanetId) return { ok: false, message: t("errors.chooseTwoPlanets") }
	const inPlanet = planetState(state, inPlanetId)
	const outPlanet = planetState(state, outPlanetId)
	if (!inPlanet || !outPlanet) return { ok: false, message: t("errors.unknownPlanet") }
	if (inPlanet.pathways.length > 0 || outPlanet.pathways.length > 0) return { ok: false, message: t("errors.onePathwayPerPlanet") }
	player.pathways = { placed: true, in: inPlanetId, out: outPlanetId }
	inPlanet.pathways.push({ owner: playerIndex, dir: "in" })
	outPlanet.pathways.push({ owner: playerIndex, dir: "out" })
	return { ok: true }
}

export function canUsePathway(state, playerIndex) {
	const planet = playerPlanet(state, playerIndex)
	if (!planet) return false
	return planet.pathways.some((p) => p.dir === "in")
}

export function usePathway(state, playerIndex) {
	const planet = playerPlanet(state, playerIndex)
	if (!planet) return { ok: false, message: t("errors.planetToUsePathway") }
	const entrance = planet.pathways.find((p) => p.dir === "in")
	if (!entrance) return { ok: false, message: t("errors.noPathwayEntrance") }
	const owner = state.players[entrance.owner]
	if (!owner || !owner.pathways.placed) return { ok: false, message: t("errors.pathwayNotActive") }
	if (!spendEnergy(state, playerIndex, rf.RED_ENERGY)) return { ok: false, message: t("errors.pathwayCost") }
	const player = state.players[playerIndex]
	player.ship.node = "P" + owner.pathways.out
	state.gameflow.movement.remaining = 0
	player.freeTradeTiles = []
	expireTradesForPlayer(state, playerIndex)
	const target = planetState(state, owner.pathways.out)
	if (target && !target.start && !target.site) state.gameflow.pendingExplore = { player: playerIndex, planetId: target.id }
	return { ok: true, planetId: owner.pathways.out }
}

// Building -----------------------------------------------------------------

export function buildFactory(state, playerIndex, factoryTypeId) {
	const player = state.players[playerIndex]
	const planet = playerPlanet(state, playerIndex)
	if (!planet) return { ok: false, message: t("errors.planetRequired") }
	if (planet.start) return { ok: false, message: t("errors.noFactorySlot") }
	const planetObj = planetState(state, planet.id)
	if (planetObj.factory) return { ok: false, message: t("errors.planetHasFactory") }
	const factory = rf.FACTORIES_BY_ID[factoryTypeId]
	if (!factory) return { ok: false, message: t("errors.unknownFactory") }
	const stock = state.board.factoryStock.find((f) => f.id === factoryTypeId)
	if (!stock || stock.count <= 0) return { ok: false, message: t("errors.factoryOutOfStock") }
	if (!hasGoods(player, factory.input)) return { ok: false, message: t("errors.missingInputGoods") }
	if (player.energy[rf.YELLOW_ENERGY] <= 0) return { ok: false, message: t("errors.buildCost") }
	removeGoods(player, factory.input)
	spendEnergy(state, playerIndex, rf.YELLOW_ENERGY)
	stock.count--
	planetObj.factory = { typeId: factoryTypeId }
	player.score += factory.points
	state.gameflow.movement.remaining = 0
	return { ok: true, points: factory.points }
}

export function siteCost(state, planetId) {
	const planet = planetState(state, planetId)
	if (!planet || !planet.site) return null
	if (planet.site.kind === "spaceyard") {
		const type = rf.SPACEYARD_TYPES[planet.site.tileId]
		return { printed: type.cost[0], random: true, points: type.points, gear: type.gear }
	}
	const tile = rf.CONSUMER_TILES.find((t) => t.id === planet.site.tileId)
	return { printed: tile.good, random: false, points: tile.buildPoints }
}

function spaceyardRewardSlot(player, requestedSlot) {
	const emptySlot = firstEmptyGearSlot(player)
	if (emptySlot >= 0) return emptySlot
	if (requestedSlot >= 0 && requestedSlot < player.gear.length) return requestedSlot
	return -1
}

export function buildSite(state, playerIndex, randomGoodId, gearSlotIndex = -1) {
	const player = state.players[playerIndex]
	const planet = playerPlanet(state, playerIndex)
	if (!planet) return { ok: false, message: t("errors.planetRequired") }
	const planetObj = planetState(state, planet.id)
	if (!planetObj.site || planetObj.site.built) return { ok: false, message: t("errors.noUnbuiltSite") }
	const cost = siteCost(state, planet.id)
	if (cost.random) {
		if (randomGoodId === cost.printed) return { ok: false, message: t("errors.secondGoodDifferent") }
		if (!hasGoods(player, [cost.printed, randomGoodId])) return { ok: false, message: t("errors.missingRequiredGoods") }
	} else if (!hasGoods(player, [cost.printed])) {
		return { ok: false, message: t("errors.missingRequiredGoods") }
	}
	if (player.energy[rf.YELLOW_ENERGY] <= 0) return { ok: false, message: t("errors.buildCost") }
	let rewardSlot = -1
	if (planetObj.site.kind === "spaceyard") {
		rewardSlot = spaceyardRewardSlot(player, gearSlotIndex)
		if (rewardSlot < 0) return { ok: false, message: t("errors.chooseShipSlot") }
	}
	if (cost.random) removeGoods(player, [cost.printed, randomGoodId])
	else removeGoods(player, [cost.printed])
	spendEnergy(state, playerIndex, rf.YELLOW_ENERGY)
	planetObj.site.built = true
	if (planetObj.site.kind === "spaceyard") player.gear[rewardSlot] = cost.gear
	player.score += cost.points
	state.gameflow.movement.remaining = 0
	return { ok: true, points: cost.points, gear: cost.gear || null, gearSlotIndex: rewardSlot }
}

export function claimPrivilege(state, playerIndex, kind) {
	const player = state.players[playerIndex]
	const planet = playerPlanet(state, playerIndex)
	if (!planet) return { ok: false, message: t("errors.planetRequired") }
	const planetObj = planetState(state, planet.id)
	if (kind === "site" && !planetObj.site) return { ok: false, message: t("errors.noSiteToClaim") }
	if (kind === "factory" && !planetObj.factory) return { ok: false, message: t("errors.noFactoryToClaim") }
	if (planetObj.privileges[kind] !== -1) return { ok: false, message: t("errors.privilegeAlready") }
	if (player.privileges <= 0) return { ok: false, message: t("errors.noPrivileges") }
	if (player.energy[rf.YELLOW_ENERGY] < 3) return { ok: false, message: t("errors.privilegeCost") }
	for (let i = 0; i < 3; i++) spendEnergy(state, playerIndex, rf.YELLOW_ENERGY)
	planetObj.privileges[kind] = playerIndex
	player.privileges--
	return { ok: true }
}

// Trading ------------------------------------------------------------------

function payTradeEnergy(state, playerIndex, planetId, kind) {
	const player = state.players[playerIndex]
	const key = freeTradeKey(planetId, kind)
	if (player.freeTradeTiles.includes(key)) return true
	if (!spendEnergy(state, playerIndex, rf.BLUE_ENERGY)) return false
	if (hasPrivilege(state, playerIndex, planetId, kind)) player.freeTradeTiles.push(key)
	return true
}

export function tradeMine(state, playerIndex) {
	const player = state.players[playerIndex]
	const planet = playerPlanet(state, playerIndex)
	if (!planet) return { ok: false, message: t("errors.planetRequired") }
	const planetObj = planetState(state, planet.id)
	if (planetObj.mine === null) return { ok: false, message: t("errors.noMine") }
	if (!payTradeEnergy(state, playerIndex, planet.id, "mine")) return { ok: false, message: t("errors.tradeCost") }
	player.goods.push(planetObj.mine)
	state.gameflow.movement.remaining = 0
	return { ok: true, good: planetObj.mine }
}

export function tradeFactory(state, playerIndex) {
	const player = state.players[playerIndex]
	const planet = playerPlanet(state, playerIndex)
	if (!planet) return { ok: false, message: t("errors.planetRequired") }
	const planetObj = planetState(state, planet.id)
	if (!planetObj.factory) return { ok: false, message: t("errors.noFactory") }
	const factory = rf.FACTORIES_BY_ID[planetObj.factory.typeId]
	if (!hasGoods(player, factory.input)) return { ok: false, message: t("errors.missingInputGoods") }
	if (!payTradeEnergy(state, playerIndex, planet.id, "factory")) return { ok: false, message: t("errors.tradeCost") }
	removeGoods(player, factory.input)
	player.goods.push(factory.output)
	state.gameflow.movement.remaining = 0
	return { ok: true, good: factory.output }
}

export function tradeConsumer(state, playerIndex) {
	const player = state.players[playerIndex]
	const planet = playerPlanet(state, playerIndex)
	if (!planet) return { ok: false, message: t("errors.planetRequired") }
	const planetObj = planetState(state, planet.id)
	if (!planetObj.site || planetObj.site.kind !== "consumer" || !planetObj.site.built) return { ok: false, message: t("errors.noConsumerSite") }
	const tile = rf.CONSUMER_TILES.find((t) => t.id === planetObj.site.tileId)
	if (!hasGoods(player, [tile.good])) return { ok: false, message: t("errors.missingRequiredGood") }
	if (!payTradeEnergy(state, playerIndex, planet.id, "site")) return { ok: false, message: t("errors.tradeCost") }
	removeGoods(player, [tile.good])
	player.score += tile.points
	state.gameflow.movement.remaining = 0
	return { ok: true, points: tile.points }
}

export function buyGear(state, playerIndex, slotIndex, randomGoodId) {
	const player = state.players[playerIndex]
	const planet = playerPlanet(state, playerIndex)
	if (!planet) return { ok: false, message: t("errors.planetRequired") }
	const planetObj = planetState(state, planet.id)
	if (!planetObj.site || planetObj.site.kind !== "spaceyard" || !planetObj.site.built) return { ok: false, message: t("errors.noSpaceyard") }
	if (slotIndex < 0 || slotIndex >= player.gear.length) return { ok: false, message: t("errors.chooseShipSlot") }
	const emptySlot = firstEmptyGearSlot(player)
	if (emptySlot >= 0 && slotIndex !== emptySlot) return { ok: false, message: t("errors.gearSlotOrder") }
	const type = rf.SPACEYARD_TYPES[planetObj.site.tileId]
	if (randomGoodId === type.cost[0]) return { ok: false, message: t("errors.secondGoodDifferent") }
	if (!hasGoods(player, [type.cost[0], randomGoodId])) return { ok: false, message: t("errors.missingRequiredGoods") }
	if (!payTradeEnergy(state, playerIndex, planet.id, "site")) return { ok: false, message: t("errors.tradeCost") }
	removeGoods(player, [type.cost[0], randomGoodId])
	player.gear[slotIndex] = type.gear
	state.gameflow.movement.remaining = 0
	return { ok: true, gear: type.gear, slotIndex }
}

// Player trades ------------------------------------------------------------

export function proposeTrade(state, fromIndex, toIndex, give, receive) {
	if (fromIndex !== currentPlayerIndex(state)) return { ok: false, message: t("errors.proposeOnOwnTurn") }
	if (fromIndex === toIndex) return { ok: false, message: t("errors.chooseAnotherPlayer") }
	const from = state.players[fromIndex]
	const to = state.players[toIndex]
	if (!from || !to) return { ok: false, message: t("errors.unknownPlayer") }
	if (!from.ship.node || from.ship.node !== to.ship.node) return { ok: false, message: t("errors.shipsSamePlanet") }
	if (!rf.planetByNode(from.ship.node)) return { ok: false, message: t("errors.tradesOnPlanet") }
	if (!hasGoods(from, give)) return { ok: false, message: t("errors.missingOfferedGoods") }
	if (!hasGoods(to, receive)) return { ok: false, message: t("errors.otherMissingRequestedGoods") }
	const existing = state.board.trades.find((t) => t.status === "pending" && ((t.from === fromIndex && t.to === toIndex) || (t.from === toIndex && t.to === fromIndex)))
	if (existing) return { ok: false, message: t("errors.pendingTradeExists") }
	const trade = {
		id: "T" + Date.now() + "-" + fromIndex + "-" + toIndex,
		from: fromIndex,
		to: toIndex,
		give: [...give],
		receive: [...receive],
		planetId: rf.planetByNode(from.ship.node).id,
		status: "pending",
		createdTurn: state.gameflow.turn,
	}
	state.board.trades.push(trade)
	return { ok: true, trade }
}

export function respondTrade(state, tradeId, playerIndex, accept) {
	const trade = state.board.trades.find((t) => t.id === tradeId)
	if (!trade || trade.status !== "pending") return { ok: false, message: t("errors.tradeUnavailable") }
	if (trade.to !== playerIndex) return { ok: false, message: t("errors.tradeNotAddressed") }
	const from = state.players[trade.from]
	const to = state.players[trade.to]
	if (!from || !to || !from.ship.node || from.ship.node !== to.ship.node || !rf.planetByNode(from.ship.node)) {
		trade.status = "expired"
		return { ok: false, message: t("errors.shipsSeparated") }
	}
	if (!accept) {
		trade.status = "declined"
		return { ok: true, declined: true }
	}
	if (!hasGoods(from, trade.give) || !hasGoods(to, trade.receive)) {
		trade.status = "expired"
		return { ok: false, message: t("errors.goodsUnavailable") }
	}
	removeGoods(from, trade.give)
	removeGoods(to, trade.receive)
	addGoods(to, trade.give)
	addGoods(from, trade.receive)
	trade.status = "accepted"
	return { ok: true, accepted: true }
}

export function expireTradesForPlayer(state, playerIndex) {
	for (const trade of state.board.trades) {
		if (trade.status === "pending" && (trade.from === playerIndex || trade.to === playerIndex)) trade.status = "expired"
	}
}

export function cleanupTrades(state) {
	for (const trade of state.board.trades) {
		if (trade.status !== "pending") continue
		const from = state.players[trade.from]
		const to = state.players[trade.to]
		if (!from || !to || !from.ship.node || from.ship.node !== to.ship.node) trade.status = "expired"
	}
}

// End of turn / game end ----------------------------------------------------

export function energyOverflow(player) {
	return Math.max(0, totalEnergy(player) - 4)
}

export function finishActionTurn(state) {
	if (state.gameflow.turnType !== rf.TURN_ACTION) return { ok: false, message: t("errors.notActionTurn") }
	cleanupTrades(state)
	const player = currentPlayer(state)
	if (player && energyOverflow(player) > 0) return { ok: false, message: t("errors.maxFourEnergy"), needsEnergyDiscard: true }
	if (player && cargoOverflow(player) > 0) return { ok: false, message: t("errors.discardToCapacity"), needsCargoDiscard: true }
	if (player) {
		for (let c = 0; c < 3; c++) player.virtual[c] = 0
		player.freeTradeTiles = []
	}
	state.gameflow.movement = { remaining: 0, active: false }
	state.gameflow.pendingExplore = null
	state.gameflow.turn++
	if (state.gameflow.turn > 24) {
		endGame(state)
		return { ok: true, gameOver: true }
	}
	advancePlayer(state)
	return { ok: true }
}

export function skipCollectTurn(state) {
	if (state.gameflow.turnType !== rf.TURN_CHOOSE) return { ok: false, message: t("errors.notCollectTurn") }
	advancePlayer(state)
	return { ok: true }
}

export function finalScore(player) {
	return player.score - (player.auctionBid || 0)
}

export function computeFinalPositions(state) {
	const scores = state.players.map((p, idx) => ({ idx, score: finalScore(p) }))
	scores.sort((a, b) => b.score - a.score || a.idx - b.idx)
	const groups = []
	for (const entry of scores) {
		if (groups.length === 0 || groups[groups.length - 1][0].score !== entry.score) groups.push([entry])
		else groups[groups.length - 1].push(entry)
	}
	return groups.map((group) => group.map((entry) => entry.idx))
}

export function endGame(state) {
	state.gameflow.phase = rf.PHASE_GAME_OVER
	state.gameflow.turnType = rf.TURN_GAME_OVER
	state.gameflow.finalPositions = computeFinalPositions(state)
	state.gameflow.winnerNames = state.gameflow.finalPositions.length > 0 ? state.gameflow.finalPositions[0].map((idx) => state.players[idx].name) : []
	return { ok: true, finalPositions: state.gameflow.finalPositions, winnerNames: state.gameflow.winnerNames }
}

export function winnerUsername(state) {
	return state.gameflow.winnerNames[0] || state.players[0].name
}

export function isCurrentPlayer(state, playerIndex) {
	return currentPlayerIndex(state) === playerIndex
}

export function canAct(state, playerIndex) {
	return state.gameflow.phase === rf.PHASE_MAIN && isCurrentPlayer(state, playerIndex)
}
