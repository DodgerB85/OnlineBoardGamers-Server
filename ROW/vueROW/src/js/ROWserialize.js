/**
 * Serialization for the ROW game state (the persisted `gameData`).
 * Mirrors the field set of ROW.serialize but as a plain JSON document.
 */
import { ActionStack, JavaRandom, ROWError, ROWException, Unlockable } from "./ROWcore";
import { CattleMarket, Foresights, Game, JobMarket, KansasCitySupply, ObjectiveCards, PlayerState, RailroadTrack, Trail } from "./ROWengine";
import { OBJECTIVE_CARD_TYPES, STATIONS } from "./ROWdata";
function serializePlayerState(ps) {
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
        turns: ps.turns,
        stops: ps.stops,
        lastEngineMove: ps.lastEngineMove,
        lastUpgradedStation: ps.lastUpgradedStation,
        exchangeTokens: ps.exchangeTokens,
        branchlets: ps.branchlets,
        lastPlacedBranchlet: ps.lastPlacedBranchlet,
        discs: ps.discs,
    };
}
function deserializePlayerState(obj) {
    const ps = new PlayerState(obj.player);
    ps.drawStack = obj.drawStack ?? [];
    ps.hand = obj.hand ?? [];
    ps.discardPile = obj.discardPile ?? [];
    ps.workers = obj.workers ?? ps.workers;
    ps.buildings = obj.buildings ?? [];
    ps.unlocked = obj.unlocked ?? ps.unlocked;
    // Setup already removes the first (left) gain-$1 / draw-a-card disc. Older
    // payloads saved before that starting state are brought up to it on load.
    for (const u of [Unlockable.AUX_GAIN_DOLLAR, Unlockable.AUX_DRAW_CARD_TO_DISCARD_CARD])
        ps.unlocked[u] = Math.max(ps.unlocked[u] ?? 0, 1);
    ps.objectives = obj.objectives ?? [];
    ps.stationMasters = obj.stationMasters ?? [];
    ps.teepees = obj.teepees ?? [];
    ps.hazards = obj.hazards ?? [];
    ps.bid = obj.bid ?? null;
    ps.tempCertificates = obj.tempCertificates ?? 0;
    ps.balance = obj.balance ?? 0;
    ps.jobMarketToken = obj.jobMarketToken ?? false;
    ps.numberOfCowboysUsedInTurn = obj.numberOfCowboysUsedInTurn ?? 0;
    ps.locationsActivatedInTurn = obj.locationsActivatedInTurn ?? [];
    ps.turns = obj.turns ?? 0;
    ps.stops = obj.stops ?? {};
    ps.lastEngineMove = obj.lastEngineMove ?? 0;
    ps.lastUpgradedStation = obj.lastUpgradedStation ?? -1;
    // Payloads saved before exchange tokens existed still start with the one every player gets.
    ps.exchangeTokens = obj.exchangeTokens ?? 1;
    ps.branchlets = obj.branchlets ?? 15;
    ps.lastPlacedBranchlet = obj.lastPlacedBranchlet ?? null;
    ps.discs = obj.discs ?? 12;
    return ps;
}
function serializeTrail(trail) {
    const locations = {};
    for (const [name, loc] of trail.locations) {
        locations[name] = { building: loc.building, teepee: loc.teepee, hazard: loc.hazard };
    }
    return { playerLocations: trail.playerLocations, locations };
}
function deserializeTrail(obj, edition) {
    const trail = new Trail(edition);
    trail.playerLocations = obj.playerLocations ?? {};
    for (const [name, data] of Object.entries(obj.locations ?? {})) {
        const loc = trail.locations.get(name);
        if (!loc)
            continue;
        if (data.building)
            // Java omits `player` on neutral buildings; ROW always keeps it as null or a player
            // name, and the engine compares with `=== null` all over.
            loc.building = { ...data.building, player: data.building.player ?? null };
        if (data.teepee)
            loc.teepee = data.teepee;
        if (data.hazard)
            loc.hazard = data.hazard;
    }
    return trail;
}
export function serializeGame(game, rng) {
    const s = game.state;
    const playerStates = {};
    for (const [name, ps] of Object.entries(s.playerStates))
        playerStates[name] = serializePlayerState(ps);
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
            branchlets: s.railroadTrack.branchlets,
            mediumTownTiles: s.railroadTrack.mediumTownTiles,
            bonusStationMasters: s.railroadTrack.stationMasters,
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
    };
}
export function deserializeGame(obj) {
    if (!obj || obj.v !== 1)
        throw new ROWException(ROWError.NOT_IMPLEMENTED);
    const playerStates = {};
    for (const [name, ps] of Object.entries(obj.playerStates))
        playerStates[name] = deserializePlayerState(ps);
    const trail = deserializeTrail(obj.trail, obj.edition);
    const railroad = new RailroadTrack(obj.edition, !!obj.options?.railsToTheNorth);
    const rt = obj.railroadTrack;
    railroad.players = rt.players ?? {};
    railroad.cities = rt.cities ?? {};
    // A payload may carry only the mutable half of a station (Java's serializer does); the
    // printed cost/points/disc colours/space come from our own table, keyed by index.
    railroad.stations = (rt.stations ?? []).map((st, i) => ({ ...(STATIONS[i] ?? {}), ...st }));
    railroad.branchlets = rt.branchlets ?? {};
    railroad.mediumTownTiles = rt.mediumTownTiles ?? {};
    railroad.stationMasters = rt.bonusStationMasters ?? [];
    const jobMarket = new JobMarket();
    const jm = obj.jobMarket;
    if (jm) {
        jobMarket.rows = jm.rows ?? jobMarket.rows;
        jobMarket.currentRowIndex = jm.currentRowIndex ?? 0;
    }
    const cattleMarket = new CattleMarket(getBool(obj.cattleMarket, "simmental"));
    const cm = obj.cattleMarket;
    if (cm) {
        cattleMarket.drawStack = cm.drawStack ?? [];
        cattleMarket.market = cm.market ?? [];
    }
    const kcSupply = new KansasCitySupply();
    kcSupply.piles = obj.kcSupply?.piles ?? [[], [], []];
    const foresights = new Foresights();
    foresights.spaces = obj.foresights?.spaces ?? [[null, null], [null, null], [null, null]];
    const objectiveCards = new ObjectiveCardsFromData(obj.objectiveCards?.drawStack ?? [], obj.objectiveCards?.available ?? []);
    const state = {
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
    };
    const game = new Game(state);
    // Older payloads (and fresh games) have no action stack: rebuild begin-turn
    // without counting it (the persisted `turns` counter is authoritative).
    if (!obj.actionStack)
        game.beginTurn(false);
    return game;
}
function getBool(obj, key) {
    return !!obj?.[key];
}
/** ObjectiveCards with an explicit serialized deck. */
class ObjectiveCardsFromData extends ObjectiveCards {
    constructor(drawStackIds, availableIds) {
        super({ next: () => 0, int: () => 0, boolean: () => false });
        this.drawStack = drawStackIds.map((id) => OBJECTIVE_CARD_TYPES[id]);
        this.available = availableIds.map((id) => OBJECTIVE_CARD_TYPES[id]);
    }
}
