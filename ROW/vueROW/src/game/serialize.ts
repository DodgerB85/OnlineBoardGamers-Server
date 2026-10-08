/**
 * Serialization for the ROW game state (the persisted `gameData`).
 * Mirrors the field set of ROW.serialize but as a plain JSON document.
 */

import { ActionStack, Edition, JavaRandom, ROWError, ROWException, Mode, Options, PlayerInfo, Rng, Status, type SerializedActionStack } from "./core"
import { CattleMarket, Foresights, Game, GameState, JobMarket, KansasCitySupply, ObjectiveCards, PlayerState, RailroadTrack, Trail } from "./engine"
import { OBJECTIVE_CARD_TYPES } from "./data"

export interface SerializedGame {
	v: 1
	edition: Edition
	options: Options
	status: Status
	players: PlayerInfo[]
	playerOrder: string[]
	currentPlayer: string
	playerStates: Record<string, unknown>
	trail: unknown
	railroadTrack: unknown
	jobMarket: unknown
	cattleMarket: unknown
	kcSupply: unknown
	foresights: unknown
	objectiveCards: unknown
	startingObjectiveCards: string[]
	canUndo: boolean
	actionStack?: SerializedActionStack
	rngState?: string
}

function serializePlayerState(ps: PlayerState): Record<string, unknown> {
	return {
		player: ps.player,
		drawStack: ps.drawStack,
		hand: ps.hand,
		discardPile: ps.discardPile,
		workers: ps.workers,
		buildings: ps.buildings,
		unlocked: ps.unlocked,
		objectives: ps.objectives,
		stationMasters: ps.stationMasters,
		teepees: ps.teepees,
		hazards: ps.hazards,
		bid: ps.bid,
		tempCertificates: ps.tempCertificates,
		balance: ps.balance,
		jobMarketToken: ps.jobMarketToken,
		numberOfCowboysUsedInTurn: ps.numberOfCowboysUsedInTurn,
		locationsActivatedInTurn: ps.locationsActivatedInTurn,
		lastEngineMove: ps.lastEngineMove,
		lastUpgradedStation: ps.lastUpgradedStation,
		discs: ps.discs,
	}
}

function deserializePlayerState(obj: any): PlayerState {
	const ps = new PlayerState(obj.player)
	ps.drawStack = obj.drawStack ?? []
	ps.hand = obj.hand ?? []
	ps.discardPile = obj.discardPile ?? []
	ps.workers = obj.workers ?? ps.workers
	ps.buildings = obj.buildings ?? []
	ps.unlocked = obj.unlocked ?? ps.unlocked
	ps.objectives = obj.objectives ?? []
	ps.stationMasters = obj.stationMasters ?? []
	ps.teepees = obj.teepees ?? []
	ps.hazards = obj.hazards ?? []
	ps.bid = obj.bid ?? null
	ps.tempCertificates = obj.tempCertificates ?? 0
	ps.balance = obj.balance ?? 0
	ps.jobMarketToken = obj.jobMarketToken ?? false
	ps.numberOfCowboysUsedInTurn = obj.numberOfCowboysUsedInTurn ?? 0
	ps.locationsActivatedInTurn = obj.locationsActivatedInTurn ?? []
	ps.lastEngineMove = obj.lastEngineMove ?? 0
	ps.lastUpgradedStation = obj.lastUpgradedStation ?? null
	ps.discs = obj.discs ?? 12
	return ps
}

function serializeTrail(trail: Trail): unknown {
	const locations: Record<string, unknown> = {}
	for (const [name, loc] of trail.locations) {
		locations[name] = { building: loc.building, teepee: loc.teepee, hazard: loc.hazard }
	}
	return { playerLocations: trail.playerLocations, locations }
}

function deserializeTrail(obj: any, edition: Edition): Trail {
	const trail = new Trail(edition)
	trail.playerLocations = obj.playerLocations ?? {}
	for (const [name, data] of Object.entries<any>(obj.locations ?? {})) {
		const loc = trail.locations.get(name)
		if (!loc) continue
		if (data.building) loc.building = data.building
		if (data.teepee) loc.teepee = data.teepee
		if (data.hazard) loc.hazard = data.hazard
	}
	return trail
}

export function serializeGame(game: Game, rng?: Rng): SerializedGame {
	const s = game.state
	const playerStates: Record<string, unknown> = {}
	for (const [name, ps] of Object.entries(s.playerStates)) playerStates[name] = serializePlayerState(ps)
	return {
		v: 1,
		edition: s.edition,
		options: s.options,
		status: s.status,
		players: s.players,
		playerOrder: s.playerOrder,
		currentPlayer: s.currentPlayer,
		playerStates,
		trail: serializeTrail(s.trail),
		railroadTrack: {
			players: s.railroadTrack.players,
			cities: s.railroadTrack.cities,
			stations: s.railroadTrack.stations,
		},
		jobMarket: { rows: s.jobMarket.rows, currentRowIndex: s.jobMarket.currentRowIndex },
		cattleMarket: { drawStack: s.cattleMarket.drawStack, market: s.cattleMarket.market, simmental: s.cattleMarket.simmental },
		kcSupply: { piles: s.kcSupply.piles },
		foresights: { spaces: s.foresights.spaces },
		objectiveCards: { drawStack: s.objectiveCards.drawStack.map((c) => c.id), available: s.objectiveCards.available.map((c) => c.id) },
		startingObjectiveCards: s.startingObjectiveCards.map((c) => c.id),
		canUndo: s.canUndo,
		actionStack: s.actionStack.serialize(),
		rngState: rng instanceof JavaRandom ? rng.getState() : undefined,
	}
}

export function deserializeGame(obj: SerializedGame): Game {
	if (!obj || obj.v !== 1) throw new ROWException(ROWError.NOT_IMPLEMENTED)
	const playerStates: Record<string, PlayerState> = {}
	for (const [name, ps] of Object.entries<any>(obj.playerStates)) playerStates[name] = deserializePlayerState(ps)

	const trail = deserializeTrail(obj.trail, obj.edition)

	const railroad = new RailroadTrack()
	const rt: any = obj.railroadTrack
	railroad.players = rt.players ?? {}
	railroad.cities = rt.cities ?? {}
	railroad.stations = rt.stations ?? []

	const jobMarket = new JobMarket()
	const jm: any = obj.jobMarket
	if (jm) {
		jobMarket.rows = jm.rows ?? jobMarket.rows
		jobMarket.currentRowIndex = jm.currentRowIndex ?? 0
	}

	const cattleMarket = new CattleMarket(getBool(obj.cattleMarket, "simmental"))
	const cm: any = obj.cattleMarket
	if (cm) {
		cattleMarket.drawStack = cm.drawStack ?? []
		cattleMarket.market = cm.market ?? []
	}

	const kcSupply = new KansasCitySupply()
	kcSupply.piles = (obj.kcSupply as any)?.piles ?? [[], [], []]

	const foresights = new Foresights()
	foresights.spaces = (obj.foresights as any)?.spaces ?? [[null, null], [null, null], [null, null]]

	const objectiveCards = new ObjectiveCardsFromData((obj.objectiveCards as any)?.drawStack ?? [], (obj.objectiveCards as any)?.available ?? [])

	const state: GameState = {
		edition: obj.edition,
		options: obj.options,
		status: obj.status,
		players: obj.players,
		playerOrder: obj.playerOrder,
		currentPlayer: obj.currentPlayer,
		playerStates,
		trail,
		railroadTrack: railroad,
		jobMarket,
		cattleMarket,
		kcSupply,
		foresights,
		objectiveCards,
		startingObjectiveCards: (obj.startingObjectiveCards ?? []).map((id) => OBJECTIVE_CARD_TYPES[id]),
		actionStack: obj.actionStack ? ActionStack.deserialize(obj.actionStack) : new ActionStack([], []),
		canUndo: obj.canUndo ?? false,
	}
	const game = new Game(state)
	// Older payloads (and fresh games) have no action stack: rebuild begin-turn.
	if (!obj.actionStack) game.beginTurn()
	return game
}

function getBool(obj: unknown, key: string): boolean {
	return !!(obj as any)?.[key]
}

/** ObjectiveCards with an explicit serialized deck. */
class ObjectiveCardsFromData extends ObjectiveCards {
	constructor(drawStackIds: string[], availableIds: string[]) {
		super({ next: () => 0, int: () => 0, boolean: () => false } as unknown as Rng)
		this.drawStack = drawStackIds.map((id) => OBJECTIVE_CARD_TYPES[id])
		this.available = availableIds.map((id) => OBJECTIVE_CARD_TYPES[id])
	}
}
