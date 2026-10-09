/**
 * Great Western Trail - game engine.
 *
 * Faithful port of the core of `com.boardgamefiesta.row.logic` (GPL-3.0,
 * Copyright (C) 2021 Tom Wetjens). Framework-free; the Vue layer owns a single
 * Game instance inside the Pinia store.
 *
 * Scope of this port: both editions and the Rails to the North expansion, 2-4
 * players, the main turn loop, trail movement + tolls, neutral/private building
 * activation, hiring, buying cattle, the Kansas City subphases, station upgrades,
 * auxiliary actions, city deliveries (including the northern strip and branchlets)
 * and end-of-game scoring. Not ported: bidding, the Garth automa and the balanced
 * cattle-market variant - those throw ROWError.NOT_IMPLEMENTED rather than guessing.
 */
import { ActionStack, ActionType, CattleType, City, DiscColor, Edition, ROWError, ROWException, Hand, HazardType, PossibleAction, ScoreCategory, Status, Task, Teepee, Unlockable, UNLOCKABLE_INFO, Variant, Worker, handFee, isCattleCard, isObjectiveCard, shuffle, } from "./ROWcore";
import { buildTrailNodes, buildingNumbersForOptions, cityStrip, TRACK_NEXT, TRACK_PREVIOUS, CATTLE_COSTS, STATION_MASTERS_ORIGINAL, STATION_MASTERS_PROMOS, STATION_MASTERS_SECOND_EDITION, STATION_MASTERS_RTTN, CITY_INFO, RTTN_TRACK, RTTN_BIG_TOWNS, RTTN_MEDIUM_TOWN_DEAL_ORDER, MEDIUM_TOWN_TILES, cattleMarketLimit, createCattleSet, createKcSet1, createKcSet2, createKcSet3, jobMarketInitialWorkerCount, JOB_MARKET_CATTLE, JOB_MARKET_COST, NEUTRAL_BUILDING_LOCATIONS, neutralBuildingAction, numberOfSignals, OBJECTIVE_CARD_TYPES, OBJECTIVE_DRAW_STACK, PLAYER_BUILDINGS, playerBuildingAction, STATIONS, STARTING_OBJECTIVE_IDS, } from "./ROWdata";
const clone = (v) => JSON.parse(JSON.stringify(v));
/** Certificate track steps (PlayerState.CERTIFICATE_STEPS). */
const CERTIFICATE_STEPS = [0, 1, 2, 3, 4, 6];
/**
 * Key for matching a described card against the hand: cattle by type + points, objective cards by
 * points + penalty + tasks. Mirrors Java's findCardInHand, so a card that arrived as plain JSON
 * (a recorded client action, or a replay fixture) resolves to the card already in hand.
 */
function cardKey(card) {
    if (typeof card === "string") return `objective-id:${card}`;
    if (card.type !== undefined) return `cattle:${card.type}:${card.points}`;
    return `objective:${card.points ?? 0}:${card.penalty ?? 0}:${[...(card.tasks ?? [])].sort().join(",")}`;
}
/**
 * MediumTownTile.possibleAction: what a medium town tile offers when a branchlet lands on it.
 * Java wraps the result in `optional(...)` at the call site, so this returns the inner action.
 */
function mediumTownTileAction(tile) {
    switch (tile) {
        case "GAIN_5_DOLLARS_OR_TAKE_CATTLE_CARD":
            return PossibleAction.choiceActions([ActionType.GAIN_5_DOLLARS, ActionType.TAKE_BREEDING_VALUE_3_CATTLE_CARD]);
        case "HIRE_WORKER_PLUS_2":
            // The tile is named PLUS_2 but Java wires it to HireWorkerMinus2.
            return PossibleAction.optionalAction(ActionType.HIRE_WORKER_MINUS_2);
        case "REMOVE_2_CARDS":
            return PossibleAction.repeat(0, 2, ActionType.REMOVE_CARD);
        case "MOVE_ENGINE_3_FORWARD":
            return PossibleAction.optionalAction(ActionType.MOVE_ENGINE_AT_MOST_3_FORWARD);
        case "PLACE_BUILDING_FOR_FREE":
            return PossibleAction.optionalAction(ActionType.PLACE_BUILDING_FOR_FREE);
        default:
            throw new ROWException(ROWError.NOT_IMPLEMENTED);
    }
}
/**
 * Structural copy of the game state that keeps class instances and Maps intact, so a command that
 * throws can be rolled back wholesale. Java gets the same guarantee differently: its replay runner
 * executes every command against a copy of the state and only adopts the copy on success, so a
 * rejected action must leave everything untouched - not just the action queue.
 */
function backupState(state) {
    const seen = new Map();
    const copy = (v) => {
        if (Array.isArray(v)) {
            if (seen.has(v))
                return seen.get(v);
            const arr = [];
            seen.set(v, arr);
            for (const item of v)
                arr.push(copy(item));
            return arr;
        }
        if (v instanceof Map) {
            if (seen.has(v))
                return seen.get(v);
            const map = new Map();
            seen.set(v, map);
            for (const [key, value] of v)
                map.set(key, copy(value));
            return map;
        }
        if (v && typeof v === "object") {
            if (seen.has(v))
                return seen.get(v);
            const out = Object.create(Object.getPrototypeOf(v));
            seen.set(v, out);
            for (const key of Object.keys(v))
                out[key] = copy(v[key]);
            return out;
        }
        return v;
    };
    return copy(state);
}
function objectiveCountsNegative(c) {
    return c.buildings < 0 || c.greenTeepees < 0 || c.blueTeepees < 0 || c.hazards < 0 || c.stations < 0 || c.breedingValue3 < 0 || c.breedingValue4 < 0 || c.breedingValue5 < 0 || c.sanFrancisco < 0;
}
function subtractObjectiveTasks(c, tasks) {
    const r = { ...c };
    for (const t of tasks) {
        switch (t) {
            case Task.BUILDING:
                r.buildings--;
                break;
            case Task.GREEN_TEEPEE:
                r.greenTeepees--;
                break;
            case Task.BLUE_TEEPEE:
                r.blueTeepees--;
                break;
            case Task.HAZARD:
                r.hazards--;
                break;
            case Task.STATION:
                r.stations--;
                break;
            case Task.BREEDING_VALUE_3:
                r.breedingValue3--;
                break;
            case Task.BREEDING_VALUE_4:
                r.breedingValue4--;
                break;
            case Task.BREEDING_VALUE_5:
                r.breedingValue5--;
                break;
            case Task.SAN_FRANCISCO:
                r.sanFrancisco--;
                break;
        }
    }
    return r;
}
// ---------------------------------------------------------------------------
// Player state
// ---------------------------------------------------------------------------
export class PlayerState {
    constructor(player) {
        this.drawStack = [];
        this.hand = [];
        this.discardPile = [];
        this.workers = { [Worker.COWBOY]: 0, [Worker.CRAFTSMAN]: 0, [Worker.ENGINEER]: 0 };
        this.buildings = []; // available private building names in personal supply
        this.unlocked = {};
        this.objectives = [];
        this.stationMasters = [];
        this.teepees = [];
        this.hazards = [];
        this.bid = null;
        this.tempCertificates = 0;
        this.balance = 0;
        this.jobMarketToken = false;
        this.numberOfCowboysUsedInTurn = 0;
        this.locationsActivatedInTurn = [];
        this.turns = 0;
        this.stops = {};
        this.lastEngineMove = 0;
        this.lastUpgradedStation = -1; // Java's "no station yet" representation
        this.discs = 12; // placement discs remaining (14 total, 2 start removed); simplified
        this.player = player;
        for (const u of Object.values(Unlockable))
            this.unlocked[u] = 0;
        // Gain $1 and draw-a-card are already unlocked once at setup: they are
        // usable in SINGLE_OR_DOUBLE auxiliary actions from the start, and the
        // player board only shows their remaining (second) upgrade disc.
        this.unlocked[Unlockable.AUX_GAIN_DOLLAR] = 1;
        this.unlocked[Unlockable.AUX_DRAW_CARD_TO_DISCARD_CARD] = 1;
        // Java unlocks this one at setup too; it only becomes usable with Rails to the North.
        this.unlocked[Unlockable.AUX_DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET] = 1;
        // PlayerState: always starts with one exchange token (spent only in 2e / Rails to the North).
        this.exchangeTokens = 1;
        // Rails to the North: branchlets left to place (Java starts at 15).
        this.branchlets = 15;
        this.lastPlacedBranchlet = null;
    }
    getNumberOfCowboys() {
        return this.workers[Worker.COWBOY];
    }
    getNumberOfCraftsmen() {
        return this.workers[Worker.CRAFTSMAN];
    }
    getNumberOfEngineers() {
        return this.workers[Worker.ENGINEER];
    }
    cowboysRemaining() {
        return this.getNumberOfCowboys() - this.numberOfCowboysUsedInTurn;
    }
    getHandLimit() {
        return 4 + (this.unlocked[Unlockable.EXTRA_CARD] ?? 0);
    }
    getStepLimit(playerCount) {
        const extraDollars = this.unlocked[Unlockable.EXTRA_STEP_DOLLARS] ?? 0;
        const extraPoints = this.unlocked[Unlockable.EXTRA_STEP_POINTS] ?? 0;
        if (playerCount === 2)
            return 3 + extraDollars + extraPoints;
        if (playerCount === 3)
            return 3 + extraDollars * 2 + extraPoints;
        return 4 + extraDollars * 2 + extraPoints;
    }
    hasUnlocked(u) {
        return (this.unlocked[u] ?? 0) > 0;
    }
    hasAllUnlocked(u) {
        return (this.unlocked[u] ?? 0) === UNLOCKABLE_INFO[u].count;
    }
    canUnlock(u, railsToTheNorth) {
        if (u === Unlockable.AUX_DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET && !railsToTheNorth)
            return false;
        return (this.unlocked[u] ?? 0) < UNLOCKABLE_INFO[u].count && this.balance >= UNLOCKABLE_INFO[u].cost;
    }
    gainDollars(amount) {
        if (amount < 0)
            throw new Error("Amount must not be negative: " + amount);
        this.balance += amount;
    }
    payDollars(amount) {
        if (amount < 0)
            throw new Error("Amount must not be negative: " + amount);
        if (this.balance < amount)
            throw new ROWException(ROWError.NOT_ENOUGH_BALANCE_TO_PAY);
        this.balance -= amount;
    }
    gainExchangeTokens(amount) {
        this.exchangeTokens += amount;
    }
    payExchangeTokens(amount) {
        if (this.exchangeTokens < amount)
            throw new ROWException(ROWError.NOT_ENOUGH_EXCHANGE_TOKENS);
        this.exchangeTokens -= amount;
    }
    handValue() {
        const best = new Map();
        for (const card of this.hand) {
            if (!isCattleCard(card))
                continue;
            best.set(card.type, Math.max(best.get(card.type) ?? 0, card.value));
        }
        let sum = 0;
        for (const v of best.values())
            sum += v;
        return sum;
    }
    allCattle() {
        return [...this.drawStack, ...this.hand, ...this.discardPile].filter(isCattleCard);
    }
    numberOfCattleCards(types) {
        return this.allCattle().filter((c) => types.includes(c.type)).length;
    }
    drawCard(rng) {
        if (this.drawStack.length === 0) {
            shuffle(this.discardPile, rng);
            this.drawStack = this.discardPile;
            this.discardPile = [];
        }
        if (this.drawStack.length > 0) {
            const card = this.drawStack.shift();
            this.hand.push(card);
            return card;
        }
        return null;
    }
    drawCards(count, rng) {
        let drawn = 0;
        for (let i = 0; i < count; i++)
            if (this.drawCard(rng))
                drawn++;
        return drawn;
    }
    drawUpToHandLimit(rng) {
        const limit = this.getHandLimit();
        while (this.hand.length < limit && this.drawStack.length + this.discardPile.length > 0)
            this.drawCard(rng);
    }
    discardCard(card) {
        // Identity first, then by value: an action carried as JSON describes the card rather than
        // referencing the object in hand.
        let idx = this.hand.indexOf(card);
        if (idx < 0)
            idx = this.hand.findIndex((c) => cardKey(c) === cardKey(card));
        if (idx < 0)
            throw new ROWException(ROWError.CARD_NOT_IN_HAND);
        const [removed] = this.hand.splice(idx, 1);
        this.discardPile.unshift(removed);
    }
    discardCattleCards(type, amount) {
        const candidates = this.hand
            .filter(isCattleCard)
            .filter((c) => c.type === type)
            .sort((a, b) => a.value - b.value)
            .slice(0, amount);
        if (candidates.length !== amount)
            throw new ROWException(ROWError.CATTLE_CARDS_NOT_IN_HAND);
        for (const c of candidates)
            this.hand.splice(this.hand.indexOf(c), 1);
        this.discardPile.unshift(...candidates);
        return candidates;
    }
    discardHand() {
        this.discardPile.unshift(...this.hand);
        this.hand = [];
    }
    /** Cards gained (bought cattle, objective cards) go to the discard pile, per the Java engine. */
    gainCard(card) {
        this.discardPile.unshift(card);
    }
    addCardToHand(card) {
        this.hand.push(card);
    }
    removeCard(card) {
        this.removeCards([card]);
    }
    removeCards(cards) {
        for (const card of cards) {
            // Identity first (cards held in memory), then by value: a card that arrived as plain
            // JSON describes the card rather than referencing the object in hand.
            let found = false;
            for (const pile of [this.hand, this.discardPile, this.drawStack]) {
                let idx = pile.indexOf(card);
                if (idx < 0 && card && typeof card === "object")
                    idx = pile.findIndex((c) => c && typeof c === "object" && cardKey(c) === cardKey(card));
                if (idx >= 0) {
                    pile.splice(idx, 1);
                    found = true;
                    break;
                }
            }
            if (!found)
                throw new ROWException(ROWError.CARD_NOT_IN_HAND);
        }
    }
    hasObjectiveCardInHand() {
        return this.hand.some(isObjectiveCard);
    }
    useCowboys(amount) {
        if (this.getNumberOfCowboys() - this.numberOfCowboysUsedInTurn < amount)
            throw new ROWException(ROWError.NOT_ENOUGH_COWBOYS);
        this.numberOfCowboysUsedInTurn += amount;
    }
    numberOfCowboysUsedInTurnTotal() {
        return this.numberOfCowboysUsedInTurn;
    }
    gainTempCertificates(steps) {
        const idx = CERTIFICATE_STEPS.indexOf(this.tempCertificates);
        const newIdx = Math.min(CERTIFICATE_STEPS.length - 1, idx + steps);
        this.tempCertificates = Math.min(this.getTempCertificateLimit(), CERTIFICATE_STEPS[newIdx]);
    }
    gainMaxTempCertificates() {
        this.tempCertificates = this.getTempCertificateLimit();
    }
    getTempCertificateLimit() {
        if (this.hasUnlocked(Unlockable.CERT_LIMIT_6) && this.hasUnlocked(Unlockable.CERT_LIMIT_4))
            return 6;
        if (this.hasUnlocked(Unlockable.CERT_LIMIT_4))
            return 4;
        return 3;
    }
    spendTempCertificates(amount) {
        if (amount > this.tempCertificates)
            throw new ROWException(ROWError.NOT_ENOUGH_CERTIFICATES);
        let remaining = amount;
        while (remaining > 0) {
            const idx = Math.max(0, CERTIFICATE_STEPS.indexOf(this.tempCertificates) - 1);
            const spent = this.tempCertificates - CERTIFICATE_STEPS[idx];
            this.tempCertificates -= spent;
            remaining -= spent;
        }
    }
    permanentCertificates() {
        let n = 0;
        if (this.stationMasters.includes("PERM_CERT_POINTS_FOR_EACH_2_CERTS"))
            n += 1;
        if (this.stationMasters.includes("PERM_CERT_POINTS_FOR_EACH_2_HAZARDS"))
            n += 1;
        if (this.stationMasters.includes("PERM_CERT_POINTS_FOR_TEEPEE_PAIRS"))
            n += 1;
        if (this.stationMasters.includes("TWO_PERM_CERTS"))
            n += 2;
        if (this.stationMasters.includes("PERM_CERT_POINTS_PER_2_STATIONS"))
            n += 1;
        return n;
    }
    numberOfHazards() {
        return this.hazards.length;
    }
    numberOfBells() {
        // Java: 5 - ceil(branchlets / 3); 15 unplaced branchlets means no bells yet.
        return 5 - Math.ceil(this.branchlets / 3);
    }
    /** PlayerState.removeBranchlet: pays out an exchange token every 6th branchlet used. */
    removeBranchlet() {
        if (this.branchlets < 1)
            throw new ROWException(ROWError.NO_BRANCHLETS);
        this.branchlets--;
        return this.branchlets === 9 || this.branchlets === 0 ? [PossibleAction.optionalAction(ActionType.GAIN_EXCHANGE_TOKEN)] : [];
    }
    getLastActivatedLocation() {
        return this.locationsActivatedInTurn.length > 0 ? this.locationsActivatedInTurn[this.locationsActivatedInTurn.length - 1] : null;
    }
    simmentalsToUpgrade() {
        // PlayerState.simmentalsToUpgrade: simmentals in hand that still have an upgrade step.
        return this.hand.filter((c) => isCattleCard(c) && c.type === CattleType.SIMMENTAL && c.value < 5).length;
    }
    removeBuilding(buildingName) {
        const idx = this.buildings.indexOf(buildingName);
        if (idx < 0)
            throw new ROWException(ROWError.BUILDING_NOT_AVAILABLE);
        this.buildings.splice(idx, 1);
    }
    gainWorker(worker) {
        this.workers[worker]++;
    }
    unlock(u) {
        if ((this.unlocked[u] ?? 0) >= UNLOCKABLE_INFO[u].count)
            throw new ROWException(ROWError.ALREADY_UNLOCKED);
        const cost = UNLOCKABLE_INFO[u].cost;
        if (cost > 0)
            this.payDollars(cost);
        this.unlocked[u] = (this.unlocked[u] ?? 0) + 1;
        if (u === Unlockable.EXTRA_STEP_DOLLARS)
            this.gainDollars(3);
    }
    hasUsedBuildingInTurn(locationName) {
        return this.locationsActivatedInTurn.includes(locationName);
    }
    activate(locationName) {
        this.locationsActivatedInTurn.push(locationName);
        this.stops[locationName] = (this.stops[locationName] ?? 0) + 1;
    }
    scoreBuildingPoints(trail, player) {
        return trail.scoreBuildings(player);
    }
    numberOfTeepeePairs() {
        if (this.teepees.length < 2)
            return 0;
        const blue = this.teepees.filter((t) => t === Teepee.BLUE).length;
        const green = this.teepees.length - blue;
        return Math.min(blue, green);
    }
    numberOfGreenTeepees() {
        return this.teepees.filter((t) => t === Teepee.GREEN).length;
    }
    objectsInPlay() {
        return this.objectives.length;
    }
}
class TrailLocation {
    constructor(def) {
        this.building = null;
        this.teepee = null;
        this.hazard = null;
        this.def = def;
        this.name = def.name;
        this.kind = def.kind;
        this.next = def.next;
        this.inWoods = def.inWoods ?? false;
        this.riskAction = def.riskAction ?? null;
    }
    getHand() {
        if (this.building)
            return this.building.player === null ? Hand.NONE : PLAYER_BUILDINGS[this.building.name]?.hand ?? Hand.NONE;
        if (this.hazard)
            return this.hazard.hand;
        if (this.teepee)
            return this.teepee === Teepee.BLUE ? Hand.BLACK : Hand.GREEN;
        return Hand.NONE;
    }
    isEmpty() {
        if (this.kind === "START" || this.kind === "KANSAS_CITY")
            return false;
        if (this.kind === "BUILDING")
            return this.building === null;
        if (this.kind === "HAZARD")
            return this.hazard === null;
        return this.teepee === null;
    }
}
export class Trail {
    constructor(edition) {
        this.locations = new Map();
        this.playerLocations = {};
        this.edition = edition;
        for (const def of buildTrailNodes(edition)) {
            this.locations.set(def.name, new TrailLocation(def));
        }
    }
    placeNeutralBuildings(rng, beginner) {
        const names = [...NEUTRAL_BUILDING_LOCATIONS];
        if (!beginner)
            shuffle(names, rng);
        NEUTRAL_BUILDING_LOCATIONS.forEach((locName, i) => {
            const loc = this.locations.get(locName);
            if (loc)
                loc.building = { name: names[i], player: null };
        });
    }
    /** Trail.placeHazard: first (lowest-number) empty spot of the hazard's type. */
    placeHazard(hazard) {
        const candidates = [...this.locations.values()]
            .filter((l) => l.kind === "HAZARD" && l.hazard === null && l.def.name.startsWith(hazard.type))
            .sort((a, b) => (a.def.hazardPoints ?? 0) - (b.def.hazardPoints ?? 0));
        if (candidates.length === 0)
            return false;
        candidates[0].hazard = hazard;
        return true;
    }
    /** Trail.placeTeepee: lowest-reward empty teepee spot. */
    placeTeepee(teepee) {
        const candidates = [...this.locations.values()]
            .filter((l) => l.kind === "TEEPEE" && l.teepee === null)
            .sort((a, b) => (a.def.reward ?? 0) - (b.def.reward ?? 0));
        if (candidates.length === 0)
            return false;
        candidates[0].teepee = teepee;
        return true;
    }
    getLocation(name) {
        const loc = this.locations.get(name);
        if (!loc)
            throw new ROWException(ROWError.NO_SUCH_LOCATION);
        return loc;
    }
    getReachableLocations() {
        const visited = new Set();
        const walk = (name) => {
            if (visited.has(name))
                return;
            visited.add(name);
            for (const n of this.getLocation(name).next)
                walk(n);
        };
        walk("START");
        return visited;
    }
    currentLocation(player) {
        return this.playerLocations[player] ?? null;
    }
    movePlayer(player, to) {
        this.playerLocations[player] = to;
    }
    moveToStart(player) {
        this.playerLocations[player] = "START";
    }
    atKansasCity(player) {
        return this.playerLocations[player] === "KANSAS_CITY";
    }
    reachable(from, stepLimit) {
        if (stepLimit <= 0)
            return [];
        const out = [];
        for (const next of this.getLocation(from).next) {
            const loc = this.getLocation(next);
            if (loc.isEmpty()) {
                // Empty spaces are pass-through and do not count towards the step limit.
                for (const tail of this.reachable(next, stepLimit))
                    out.push(tail);
            }
            else {
                out.push([next]);
                for (const tail of this.reachable(next, stepLimit - 1))
                    out.push([next, ...tail]);
            }
        }
        return out;
    }
    /**
     * Every legal move from `from` (defaults to where the player stands). The UI
     * passes an origin to preview a move the player is still building up, one
     * clicked step at a time.
     */
    possibleMovesFrom(player, balance, stepLimit, playerCount, from = this.currentLocation(player)) {
        if (!from) {
            // opening placement: any non-empty building location
            const moves = [];
            for (const name of this.getReachableLocations()) {
                const loc = this.getLocation(name);
                if (name === "START" || loc.isEmpty() || loc.kind !== "BUILDING")
                    continue;
                moves.push({ from: null, steps: [name], cost: 0, playerFees: {} });
            }
            return moves;
        }
        if (stepLimit <= 0)
            return [];
        return this.reachable(from, stepLimit).map((steps) => this.buildMove(from, steps, player, balance, playerCount));
    }
    buildMove(from, steps, player, balance, playerCount) {
        let cost = 0;
        const fees = {};
        let remaining = balance;
        for (const name of steps) {
            const loc = this.getLocation(name);
            let toOther = false;
            let owner = null;
            if (loc.kind === "BUILDING" && loc.building && loc.building.player !== null && loc.building.player !== player) {
                toOther = true;
                owner = loc.building.player;
            }
            if (!toOther) {
                cost += loc.getHand() === Hand.NONE ? 0 : handFee(loc.getHand(), playerCount);
            }
            else {
                const fee = Math.min(remaining, handFee(loc.getHand(), playerCount));
                if (owner && fee > 0)
                    fees[owner] = (fees[owner] ?? 0) + fee;
            }
        }
        // Cap bank cost at balance minus what goes to players.
        const totalToPlayers = Object.values(fees).reduce((a, b) => a + b, 0);
        cost = Math.min(Math.max(0, balance - totalToPlayers), cost);
        return { from, steps, cost, playerFees: fees };
    }
    moveTo(player, steps, balance, playerCount) {
        const from = this.currentLocation(player);
        if (!from)
            throw new ROWException(ROWError.NOT_AT_LOCATION);
        const move = this.buildMove(from, steps, player, balance, playerCount);
        return move;
    }
    numberOfBuildings(player) {
        let count = 0;
        for (const loc of this.locations.values()) {
            if (loc.kind === "BUILDING" && loc.building && loc.building.player === player)
                count++;
        }
        return count;
    }
    buildingsInWoods(player) {
        let count = 0;
        for (const loc of this.locations.values()) {
            if (loc.kind === "BUILDING" && loc.inWoods && loc.building && loc.building.player === player)
                count++;
        }
        return count;
    }
    scoreBuildings(player) {
        let points = 0;
        for (const loc of this.locations.values()) {
            if (loc.kind === "BUILDING" && loc.building && loc.building.player === player) {
                points += PLAYER_BUILDINGS[loc.building.name]?.points ?? 0;
            }
        }
        return points;
    }
    getBuildings(player) {
        const out = [];
        for (const loc of this.locations.values()) {
            if (loc.kind === "BUILDING" && loc.building && loc.building.player === player)
                out.push(loc.building.name);
        }
        return out;
    }
    /** Names of locations directly connected to the given location (either direction). */
    getAdjacentLocations(name) {
        const result = new Set(this.getLocation(name).next);
        for (const [otherName, loc] of this.locations) {
            if (loc.next.includes(name))
                result.add(otherName);
        }
        return [...result];
    }
    numberOfHazardsOnTrail() {
        let count = 0;
        for (const loc of this.locations.values())
            if (loc.kind === "HAZARD" && loc.hazard)
                count++;
        return count;
    }
}
// ---------------------------------------------------------------------------
// Job market
// ---------------------------------------------------------------------------
export class JobMarket {
    constructor() {
        this.rows = [];
        this.currentRowIndex = 0;
        this.rows = JOB_MARKET_COST.map(() => ({ workers: [] }));
    }
    addWorker(worker, playerCount) {
        if (this.isClosed())
            throw new ROWException(ROWError.JOB_MARKET_CLOSED);
        const row = this.rows[this.currentRowIndex];
        row.workers.push(worker);
        if (row.workers.length === playerCount) {
            this.currentRowIndex++;
            return this.currentRowIndex < this.rows.length && JOB_MARKET_CATTLE.includes(this.currentRowIndex);
        }
        return false;
    }
    isClosed() {
        return this.currentRowIndex >= this.rows.length;
    }
    takeWorker(rowIndex, worker) {
        if (rowIndex >= this.currentRowIndex)
            throw new ROWException(ROWError.WORKER_NOT_AVAILABLE);
        const row = this.rows[rowIndex];
        const idx = row.workers.indexOf(worker);
        if (idx < 0)
            throw new ROWException(ROWError.WORKER_NOT_AVAILABLE);
        row.workers.splice(idx, 1);
    }
    cost(rowIndex, worker) {
        if (rowIndex >= this.currentRowIndex || !this.rows[rowIndex].workers.includes(worker))
            throw new ROWException(ROWError.WORKER_NOT_AVAILABLE);
        return JOB_MARKET_COST[rowIndex];
    }
    getRow(rowIndex) {
        return this.rows[rowIndex]?.workers ?? [];
    }
    getCheapestRow(workers) {
        let best = null;
        for (let i = 0; i < this.currentRowIndex; i++) {
            if (this.rows[i].workers.some((w) => workers.includes(w))) {
                if (best === null || JOB_MARKET_COST[i] < JOB_MARKET_COST[best])
                    best = i;
            }
        }
        return best;
    }
}
export class CattleMarket {
    constructor(simmental) {
        this.drawStack = [];
        this.market = [];
        this.simmental = simmental;
    }
    init(playerCount, rng, balanced = false) {
        // CattleMarket.original always uses the full 4-player deck; the balanced variant scales it.
        const set = createCattleSet(balanced ? playerCount : 4, this.simmental);
        shuffle(set, rng);
        this.drawStack = set;
        this.market = [];
        this.fillUp(playerCount);
    }
    fillUp(playerCount) {
        const limit = cattleMarketLimit(playerCount, this.simmental);
        while (this.market.length < limit && this.drawStack.length > 0) {
            this.market.push(this.drawStack.shift());
        }
    }
    /** Reveal the next cattle card into the market (CattleMarket.draw). */
    draw() {
        if (this.drawStack.length === 0)
            return null;
        const card = this.drawStack.shift();
        this.market.push(card);
        return card;
    }
    /** Remove a specific card from the market (CattleMarket.take). */
    take(card) {
        let idx = this.market.indexOf(card);
        if (idx < 0 && card && typeof card === "object")
            idx = this.market.findIndex((m) => m.type === card.type && m.points === card.points && (card.value === undefined || m.value === card.value));
        if (idx < 0)
            throw new ROWException(ROWError.CATTLE_CARD_NOT_AVAILABLE);
        this.market.splice(idx, 1);
    }
    possibleBuys(numberOfCowboys, balance) {
        if (numberOfCowboys === 0 || balance < 3)
            return [];
        const byValue = {};
        for (const card of this.market)
            byValue[card.value] = (byValue[card.value] ?? 0) + 1;
        const out = [];
        for (const [valueStr, count] of Object.entries(byValue)) {
            const value = parseInt(valueStr, 10);
            for (const cost of CATTLE_COSTS[value] ?? []) {
                if (cost.cowboys > numberOfCowboys || cost.dollars > balance)
                    continue;
                if (cost.pair && count < 2)
                    continue;
                out.push({ breedingValue: value, pair: cost.pair, dollars: cost.dollars, cowboys: cost.cowboys });
            }
        }
        return out;
    }
    buy(cards, cowboys, dollars) {
        if (cards.length === 0)
            throw new ROWException(ROWError.CATTLE_CARD_NOT_AVAILABLE);
        const card = cards[0];
        if (cards.length > 1 && (cards[1].value !== card.value || cards[1] === card))
            throw new ROWException(ROWError.NOT_PAIR);
        const cost = (CATTLE_COSTS[card.value] ?? []).find((c) => c.pair === (cards.length > 1) && c.cowboys === cowboys && c.dollars === dollars);
        if (!cost)
            throw new ROWException(ROWError.CANNOT_PERFORM_ACTION);
        for (const c of cards) {
            const idx = this.market.indexOf(c);
            if (idx < 0)
                throw new ROWException(ROWError.CATTLE_CARD_NOT_AVAILABLE);
            this.market.splice(idx, 1);
        }
        return cost;
    }
}
// ---------------------------------------------------------------------------
// Kansas City supply + foresights
// ---------------------------------------------------------------------------
export class KansasCitySupply {
    constructor() {
        this.piles = [];
    }
    init(playerCount, rng, balanced = false) {
        const p1 = createKcSet1();
        const p2 = createKcSet2();
        const p3 = createKcSet3();
        shuffle(p1, rng);
        shuffle(p2, rng);
        shuffle(p3, rng);
        // KansasCitySupply.balanced: only the "Balanced" variant trims tiles for 2-3 players.
        if (balanced && playerCount === 3) {
            // balanced variant: remove some tiles (KansasCitySupply.balanced)
            removeTeepees(p1, Teepee.BLUE, 1);
            removeTeepees(p1, Teepee.GREEN, 2);
            removeHazardsWithPointsAndHand(p1, 1, 3, Hand.GREEN);
            removeWorkers(p2, 3);
            removeTeepees(p3, Teepee.BLUE, 1);
            removeWorkers(p3, 1);
        }
        else if (balanced && playerCount === 2) {
            removeTeepees(p1, Teepee.GREEN, 3);
            removeTeepees(p1, Teepee.BLUE, 3);
            removeHazardsWithPoints(p1, 1, 2);
            removeHazardsWithPoints(p1, 1, 4);
            removeWorkers(p2, 5);
            removeTeepees(p3, Teepee.BLUE, 1);
            removeTeepees(p3, Teepee.GREEN, 1);
            removeWorkers(p3, 3);
        }
        this.piles = [p1, p2, p3];
    }
    draw(pile) {
        return this.piles[pile]?.shift() ?? null;
    }
    tilesLeft(pile) {
        return this.piles[pile]?.length ?? 0;
    }
}
function removeTeepees(pile, teepee, amount) {
    let removed = 0;
    for (let i = 0; i < pile.length && removed < amount;) {
        const t = pile[i];
        if ("teepee" in t && t.teepee === teepee) {
            pile.splice(i, 1);
            removed++;
        }
        else
            i++;
    }
}
function removeWorkers(pile, amount) {
    for (const w of [Worker.COWBOY, Worker.CRAFTSMAN, Worker.ENGINEER]) {
        let removed = 0;
        for (let i = 0; i < pile.length && removed < amount;) {
            const t = pile[i];
            if ("worker" in t && t.worker === w) {
                pile.splice(i, 1);
                removed++;
            }
            else
                i++;
        }
    }
}
function removeHazardsWithPoints(pile, amount, points) {
    for (const type of [HazardType.FLOOD, HazardType.DROUGHT, HazardType.ROCKFALL]) {
        let removed = 0;
        for (let i = 0; i < pile.length && removed < amount;) {
            const t = pile[i];
            if ("hazard" in t && t.hazard.type === type && t.hazard.points === points) {
                pile.splice(i, 1);
                removed++;
            }
            else
                i++;
        }
    }
}
function removeHazardsWithPointsAndHand(pile, amount, points, hand) {
    for (const type of [HazardType.FLOOD, HazardType.DROUGHT, HazardType.ROCKFALL]) {
        let removed = 0;
        for (let i = 0; i < pile.length && removed < amount;) {
            const t = pile[i];
            if ("hazard" in t && t.hazard.type === type && t.hazard.points === points && t.hazard.hand === hand) {
                pile.splice(i, 1);
                removed++;
            }
            else
                i++;
        }
    }
}
export class Foresights {
    constructor() {
        this.spaces = [
            [null, null],
            [null, null],
            [null, null],
        ];
    }
    init(supply, rng) {
        this.fillUp(supply, true);
    }
    fillUp(supply, workers) {
        for (let col = 0; col < 3; col++) {
            for (let row = 0; row < 2; row++) {
                if (this.spaces[col][row] === null) {
                    let tile = supply.draw(col);
                    if (tile && "worker" in tile && !workers)
                        tile = null;
                    this.spaces[col][row] = tile;
                }
            }
        }
    }
    isEmpty(col) {
        return this.spaces[col][0] === null && this.spaces[col][1] === null;
    }
    isEmptyAll() {
        return this.isEmpty(0) && this.isEmpty(1) && this.isEmpty(2);
    }
    choices(col) {
        return this.spaces[col];
    }
    take(col, row) {
        const tile = this.spaces[col][row];
        this.spaces[col][row] = null;
        return tile;
    }
    removeWorkers() {
        for (let col = 0; col < 3; col++)
            for (let row = 0; row < 2; row++) {
                const t = this.spaces[col][row];
                if (t && "worker" in t)
                    this.spaces[col][row] = null;
            }
    }
}
// ---------------------------------------------------------------------------
// Objective card market
// ---------------------------------------------------------------------------
export class ObjectiveCards {
    constructor(rng) {
        this.drawStack = [];
        this.available = [];
        const deck = OBJECTIVE_DRAW_STACK.map((id) => OBJECTIVE_CARD_TYPES[id]);
        shuffle(deck, rng);
        this.drawStack = deck;
        this.fill();
    }
    fill() {
        while (this.available.length < 4 && this.drawStack.length > 0)
            this.available.push(this.drawStack.shift());
    }
    remove(card) {
        // The action carries a JSON copy of the card; Java's ActionType.findObjectiveCard maps it
        // back onto the live card, so match by value when identity fails.
        let idx = this.available.indexOf(card);
        if (idx < 0 && card && typeof card === "object")
            idx = this.available.findIndex((c) => cardKey(c) === cardKey(card));
        if (idx < 0)
            throw new ROWException(ROWError.OBJECTIVE_CARD_NOT_AVAILABLE);
        const [removed] = this.available.splice(idx, 1);
        this.fill();
        return removed;
    }
    getDrawStackSize() {
        return this.drawStack.length;
    }
    draw() {
        if (this.drawStack.length === 0)
            throw new ROWException(ROWError.OBJECTIVE_CARD_NOT_AVAILABLE);
        return this.drawStack.shift();
    }
}
export class RailroadTrack {
    constructor(edition = Edition.FIRST, railsToTheNorth = false) {
        this.players = {};
        this.cities = {};
        this.stations = [];
        this.stationMasters = []; // leftover station master pile (Java: bonusStationMasters)
        this.edition = edition;
        // Stored as a flag rather than a strip identity check: the rollback backup deep-copies
        // the state, so `cityStrip === RTTN_CITY_STRIP` would stop holding after a rejection.
        this.railsToTheNorth = !!railsToTheNorth;
        this.cityStrip = cityStrip(edition, railsToTheNorth);
        this.branchlets = {}; // town name -> [player names]
        this.mediumTownTiles = {}; // town name -> MediumTownTile name
    }
    isRailsToTheNorth() {
        return this.railsToTheNorth;
    }
    init(players, rng) {
        for (const p of players) {
            this.players[p] = "0";
            this.cities[p] = [];
        }
        this.cities = {};
        for (const city of this.cityStrip)
            this.cities[city] = [];
        this.stations = STATIONS.map((s) => ({ ...s, upgradedBy: [], stationMaster: null, worker: null }));
        this.stationMasters = [];
        this.branchlets = {};
        // RailroadTrack.initial always deals a shuffled MediumTownTile pile, expansion or not.
        if (rng) {
            const pile = [...MEDIUM_TOWN_TILES, ...MEDIUM_TOWN_TILES];
            shuffle(pile, rng);
            RTTN_MEDIUM_TOWN_DEAL_ORDER.forEach((town, i) => (this.mediumTownTiles[town] = pile[i]));
        }
    }
    currentSpace(player) {
        return this.players[player] ?? "0";
    }
    position(sp) {
        return Math.floor(parseFloat(sp));
    }
    signalsPassed(player) {
        return numberOfSignals(Math.ceil(parseFloat(this.currentSpace(player))));
    }
    /** Java's Space.isTurnout(): a space its predecessor also bypasses. True for the 9 turnouts. */
    isTurnout(space) {
        const previous = TRACK_PREVIOUS[space] ?? [];
        const next = TRACK_NEXT[space] ?? [];
        return previous.length === 1 && next.length === 1 && (TRACK_NEXT[previous[0]] ?? []).includes(next[0]);
    }
    /**
     * Java's RailroadTrack.reachableSpacesEngine: walk the track graph, skipping occupied spaces
     * for free (they cost no step), and never entering a town. Returns space name -> fewest steps.
     */
    reachableSpaces(from, atLeast, atMost, forward) {
        const occupied = (name) => Object.values(this.players).includes(name);
        const reachable = new Map();
        const walk = (current, remainingAtLeast, remainingAtMost, steps) => {
            // START may always be shared; every other space must be free to stop on or pass over.
            const available = current !== from && (current === "0" || !occupied(current));
            if (available && remainingAtLeast <= 1 && remainingAtMost > 0) {
                const cost = steps + 1;
                const best = reachable.get(current);
                if (best === undefined || cost < best)
                    reachable.set(current, cost);
            }
            const neighbours = (forward ? TRACK_NEXT[current] : TRACK_PREVIOUS[current]) ?? [];
            if (!available) {
                // Occupied (or the starting space): jump over it without spending a step.
                for (const n of neighbours)
                    walk(n, remainingAtLeast, remainingAtMost, steps);
            }
            else if (remainingAtMost > 1) {
                for (const n of neighbours)
                    walk(n, Math.max(remainingAtLeast - 1, 0), remainingAtMost - 1, steps + 1);
            }
        };
        walk(from, atLeast, atMost, 0);
        return reachable;
    }
    reachableSpacesForward(from, atLeast, atMost) {
        return new Set(this.reachableSpaces(from, atLeast, atMost, true).keys());
    }
    reachableSpacesBackwards(from, atLeast, atMost) {
        return new Set(this.reachableSpaces(from, atLeast, atMost, false).keys());
    }
    /** Java's RailroadTrack.moveEngine: validate, move, and report the walk's step count. */
    moveEngine(player, to, atLeast, atMost, forward) {
        // Java checks occupancy first (START is exempt) and "already there" second.
        if (to !== "0" && Object.values(this.players).includes(to))
            throw new ROWException(ROWError.ALREADY_PLAYER_ON_SPACE);
        const from = this.currentSpace(player);
        if (to === from)
            throw new ROWException(ROWError.ALREADY_AT_SPACE);
        const reachable = this.reachableSpaces(from, atLeast, atMost, forward);
        if (!reachable.has(to))
            throw new ROWException(ROWError.SPACE_NOT_REACHABLE);
        this.players[player] = to;
        const immediate = this.stationUpgradeImmediate(player, to);
        if (to === "39")
            immediate.push(PossibleAction.mandatory(ActionType.MOVE_ENGINE_AT_LEAST_1_BACKWARDS_AND_GAIN_3_DOLLARS));
        return { immediate, steps: reachable.get(to) };
    }
    moveEngineForward(player, to, atLeast, atMost) {
        return this.moveEngine(player, to, atLeast, atMost, true).immediate;
    }
    moveEngineBackwards(player, to, atLeast, atMost) {
        return this.moveEngine(player, to, atLeast, atMost, false).immediate;
    }
    /** Stopping on a turnout with an unupgraded station offers an optional station upgrade. */
    stationUpgradeImmediate(player, space) {
        const station = this.stations.find((s) => s.space === space);
        if (station && !station.upgradedBy.includes(player))
            return [PossibleAction.optionalAction(ActionType.UPGRADE_STATION)];
        return [];
    }
    transportCosts(player, city) {
        return Math.max(0, numberOfSignals(CITY_INFO[city].value) - this.signalsPassed(player));
    }
    possibleDeliveries(player, handValue, extraCertificates = 0) {
        const passed = this.signalsPassed(player);
        const out = [];
        for (const city of Object.keys(CITY_INFO)) {
            const value = CITY_INFO[city].value;
            if (!this.canDeliver(player, city))
                continue;
            if (value > handValue + extraCertificates)
                continue;
            const certificates = Math.max(0, value - handValue);
            const reward = handValue - Math.max(0, numberOfSignals(value) - passed);
            out.push({ city, certificates, reward });
        }
        return out;
    }
    hasMadeDelivery(player, city) {
        return (this.cities[city] ?? []).includes(player);
    }
    hasBranchlet(townName, player) {
        return (this.branchlets[townName] ?? []).includes(player);
    }
    /** Java's RailroadTrack.canDeliver. */
    canDeliver(player, city) {
        return this.isAccessibleCity(player, city) && (!this.hasMadeDelivery(player, city) || this.isMultipleDeliveries(city));
    }
    /** Cities that may be delivered to more than once (RailroadTrack.isMultipleDeliveries). */
    isMultipleDeliveries(city) {
        if (city === City.KANSAS_CITY)
            return true;
        if (this.railsToTheNorth || this.edition !== Edition.SECOND)
            return city === City.SAN_FRANCISCO;
        return city === City.NEW_YORK_CITY;
    }
    /** On the active strip, or behind a branchlet the player placed on that city's big town. */
    isAccessibleCity(player, city) {
        if (this.cityStrip.includes(city))
            return true;
        const town = RTTN_BIG_TOWNS[city];
        return !!town && this.hasBranchlet(town, player);
    }
    numberOfUpgradedStations(player) {
        return this.stations.filter((s) => s.upgradedBy.includes(player)).length;
    }
    numberOfDeliveries(player, city) {
        return (this.cities[city] ?? []).filter((p) => p === player).length;
    }
    /** Distinct areas of the towns the player has a branchlet on (RailroadTrack.numberOfAreas). */
    numberOfAreas(player) {
        const areas = new Set();
        for (const [town, players] of Object.entries(this.branchlets)) {
            if (players.includes(player) && RTTN_TRACK[town]?.town?.area)
                areas.add(RTTN_TRACK[town].town.area);
        }
        return areas.size;
    }
    getUpgradedBy(stationIndex) {
        return this.stations[stationIndex].upgradedBy;
    }
    hasUpgraded(stationIndex, player) {
        return this.stations[stationIndex].upgradedBy.includes(player);
    }
    scoreStations(player) {
        return this.stations.filter((s) => s.upgradedBy.includes(player)).reduce((a, s) => a + s.points, 0);
    }
    /**
     * Java's RailroadTrack.scoreDeliveries*: one table per variant. Rails to the North replaces the
     * whole strip's scoring and multiplies San Francisco by the player's bells.
     */
    scoreDeliveries(player, ps) {
        if (this.isRailsToTheNorth())
            return this.scoreDeliveriesRailsToTheNorth(player, ps);
        return this.edition === Edition.SECOND ? this.scoreDeliveriesSecondEdition(player) : this.scoreDeliveriesFirstEdition(player, ps);
    }
    scoreDeliveriesFirstEdition(player, ps) {
        let result = 0;
        result -= this.numberOfDeliveries(player, City.KANSAS_CITY) * 6;
        if (this.hasMadeDelivery(player, City.TOPEKA) && this.hasMadeDelivery(player, City.WICHITA))
            result -= 3;
        if (this.hasMadeDelivery(player, City.WICHITA) && this.hasMadeDelivery(player, City.COLORADO_SPRINGS))
            result -= 1;
        if (this.hasMadeDelivery(player, City.ALBUQUERQUE) && this.hasMadeDelivery(player, City.EL_PASO))
            result += 6;
        if (this.hasMadeDelivery(player, City.EL_PASO) && this.hasMadeDelivery(player, City.SAN_DIEGO))
            result += 8;
        if (this.hasMadeDelivery(player, City.SAN_DIEGO) && this.hasMadeDelivery(player, City.SACRAMENTO))
            result += 4;
        if (this.hasMadeDelivery(player, City.SACRAMENTO))
            result += 6;
        return result + this.scoreSanFrancisco(player, ps);
    }
    scoreDeliveriesSecondEdition(player) {
        let result = 0;
        result -= this.numberOfDeliveries(player, City.KANSAS_CITY) * 6;
        if (this.hasMadeDelivery(player, City.FULTON) && this.hasMadeDelivery(player, City.ST_LOUIS))
            result -= 3;
        if (this.hasMadeDelivery(player, City.CHICAGO_2) && this.hasMadeDelivery(player, City.TOLEDO))
            result += 6;
        if (this.hasMadeDelivery(player, City.TOLEDO) && this.hasMadeDelivery(player, City.PITTSBURGH_2))
            result += 8;
        if (this.hasMadeDelivery(player, City.PITTSBURGH_2) && this.hasMadeDelivery(player, City.PHILADELPHIA))
            result += 4;
        if (this.hasMadeDelivery(player, City.PHILADELPHIA))
            result += 6;
        return result + this.numberOfDeliveries(player, City.NEW_YORK_CITY) * 9;
    }
    scoreDeliveriesRailsToTheNorth(player, ps) {
        let result = 0;
        result -= this.numberOfDeliveries(player, City.KANSAS_CITY) * 8;
        if (this.hasMadeDelivery(player, City.COLUMBIA) && this.hasMadeDelivery(player, City.ST_LOUIS))
            result -= 5;
        if (this.hasMadeDelivery(player, City.CHICAGO) && this.hasMadeDelivery(player, City.DETROIT))
            result -= 5;
        if (this.hasMadeDelivery(player, City.CLEVELAND) && this.hasMadeDelivery(player, City.PITTSBURGH))
            result += 4;
        if (this.hasMadeDelivery(player, City.PITTSBURGH) && this.hasMadeDelivery(player, City.NEW_YORK_CITY))
            result += 6;
        if (this.hasMadeDelivery(player, City.NEW_YORK_CITY))
            result += 3;
        if (this.hasMadeDelivery(player, City.GREEN_BAY))
            result += 4;
        if (this.hasMadeDelivery(player, City.TORONTO))
            result += 5;
        if (this.hasMadeDelivery(player, City.MINNEAPOLIS))
            result += 10;
        if (this.hasMadeDelivery(player, City.MONTREAL))
            result += 15;
        return result + this.scoreSanFrancisco(player, ps);
    }
    scoreSanFrancisco(player, ps) {
        return this.numberOfDeliveries(player, City.SAN_FRANCISCO) * (this.isRailsToTheNorth() ? ps.numberOfBells() * 2 : 9);
    }
    // ---- Rails to the North: towns, branchlets, medium town tiles ----
    /** Town nodes reachable from START for this player (Java's accessibleTowns stream). */
    accessibleTownsFor(player) {
        const visited = new Set(["0"]);
        const found = [];
        const walk = (fromName) => {
            const from = RTTN_TRACK[fromName];
            if (!from)
                return;
            for (const next of from.next) {
                if (visited.has(next))
                    continue;
                const node = RTTN_TRACK[next];
                if (!node)
                    continue;
                if (node.town) {
                    // Entering a town off the main line is gated by a delivery to the city whose
                    // crest sits on that space (Space names double as city values).
                    const city = from.town || fromName === "0" ? null : this.cityAtSpace(fromName);
                    if (city && !this.hasMadeDelivery(player, city))
                        continue;
                    visited.add(next);
                    found.push(next);
                    if (this.hasBranchlet(next, player))
                        walk(next);
                }
                else {
                    if (next === "16")
                        return; // Java's early exit: nothing hangs past space 15
                    visited.add(next);
                    walk(next);
                }
            }
        };
        walk("0");
        return found;
    }
    /** The strip city whose printed value is this main-line space name (RailroadTrack.getCity). */
    cityAtSpace(spaceName) {
        for (const city of this.cityStrip)
            if (String(CITY_INFO[city].value) === spaceName)
                return city;
        return null;
    }
    /** Towns this player may place a branchlet on (RailroadTrack.possibleTowns). */
    possibleTowns(player) {
        if (!this.isRailsToTheNorth())
            return [];
        return this.accessibleTownsFor(player).filter((town) => !this.hasBranchlet(town, player));
    }
    /** Java's isAccessible(START, town, player) - no branchlet filter, so duplicates can be rejected. */
    isTownAccessible(townName, player) {
        return this.isRailsToTheNorth() && this.accessibleTownsFor(player).includes(townName);
    }
    stationForTown(townName) {
        const town = RTTN_TRACK[townName]?.town;
        return town?.kind === "station" ? town.station : null;
    }
    mediumTownTile(townName) {
        return this.mediumTownTiles[townName] ?? null;
    }
    /**
     * Java's Town.placeBranchlet hooks: what the town pays out when a branchlet lands on it,
     * evaluated before the branchlet is recorded (first-player bonuses see an empty town).
     */
    townActivation(townName, player, ps) {
        const town = RTTN_TRACK[townName]?.town;
        if (!town)
            throw new ROWException(ROWError.NO_SUCH_TOWN);
        const placed = (this.branchlets[townName] ?? []).length;
        if (town.kind === "station")
            return this.hasUpgraded(town.station, player) ? [] : [PossibleAction.optionalAction(ActionType.UPGRADE_STATION_TOWN)];
        if (town.kind === "medium") {
            const tile = this.mediumTownTiles[townName];
            return tile ? [PossibleAction.optional(mediumTownTileAction(tile))] : [];
        }
        switch (town.activate) {
            case "GAIN_EXCHANGE_TOKEN":
                return [PossibleAction.optionalAction(ActionType.GAIN_EXCHANGE_TOKEN)];
            case "FIRST_GAIN_2_DOLLARS":
                return placed === 0 ? [PossibleAction.optionalAction(ActionType.GAIN_2_DOLLARS)] : [];
            case "FIRST_GAIN_1_CERTIFICATE":
                return placed === 0 ? [PossibleAction.optionalAction(ActionType.GAIN_1_CERTIFICATE)] : [];
            case "FIRST_GAIN_EXCHANGE_TOKEN":
                return placed === 0 ? [PossibleAction.optionalAction(ActionType.GAIN_EXCHANGE_TOKEN)] : [];
            case "FIRST_TAKE_OBJECTIVE_CARD":
                return placed === 0 ? [PossibleAction.optionalAction(ActionType.TAKE_OBJECTIVE_CARD)] : [];
            case "PAY_1_2_3":
                ps.payDollars(placed === 0 ? 1 : placed === 3 ? 3 : 2);
                return [];
            case "PAY_1_3_4":
                ps.payDollars(placed === 0 ? 1 : placed === 3 ? 4 : 3);
                return [];
            default:
                return [];
        }
    }
    /**
     * Java's RailroadTrack.placeBranchlet: accessibility first, then the town's payout, then the
     * duplicate check - so a rejected placement is rolled back as a whole (as Java's replay
     * runner does by discarding its working copy).
     */
    placeBranchlet(player, townName, ps) {
        if (!this.isRailsToTheNorth())
            throw new ROWException(ROWError.CANNOT_PERFORM_ACTION);
        if (!this.isTownAccessible(townName, player))
            throw new ROWException(ROWError.TOWN_NOT_ACCESSIBLE);
        const immediate = this.townActivation(townName, player, ps);
        const players = (this.branchlets[townName] ??= []);
        if (players.includes(player))
            throw new ROWException(ROWError.ALREADY_PLACED_BRANCHLET);
        players.push(player);
        ps.lastPlacedBranchlet = townName;
        return immediate;
    }
    takeBonusStationMaster(master) {
        const idx = this.stationMasters.indexOf(master);
        if (idx < 0)
            throw new ROWException(ROWError.STATION_MASTER_NOT_AVAILABLE);
        this.stationMasters.splice(idx, 1);
    }
}
export class Game {
    constructor(state) {
        this.state = state;
    }
    get currentPlayer() {
        return this.state.currentPlayer;
    }
    get options() {
        return this.state.options;
    }
    get edition() {
        return this.state.edition;
    }
    get status() {
        return this.state.status;
    }
    isEnded() {
        return this.state.status === Status.ENDED;
    }
    isRailsToTheNorth() {
        return this.state.options.railsToTheNorth;
    }
    currentPlayerState() {
        return this.playerState(this.state.currentPlayer);
    }
    playerState(player) {
        const ps = this.state.playerStates[player];
        if (!ps)
            throw new ROWException(ROWError.NO_SUCH_PLAYER);
        return ps;
    }
    getTrail() {
        return this.state.trail;
    }
    getRailroadTrack() {
        return this.state.railroadTrack;
    }
    getForesights() {
        return this.state.foresights;
    }
    getCattleMarket() {
        return this.state.cattleMarket;
    }
    getJobMarket() {
        return this.state.jobMarket;
    }
    getObjectiveCards() {
        return this.state.objectiveCards;
    }
    getActionStack() {
        return this.state.actionStack;
    }
    static start(players, options, rng) {
        if (players.length < 2)
            throw new ROWException(ROWError.AT_LEAST_2_PLAYERS_REQUIRED);
        if (players.length > 4)
            throw new ROWException(ROWError.AT_MOST_4_PLAYERS_SUPPORTED);
        const playerOrder = players.map((p) => p.name);
        if (options.playerOrder === "RANDOMIZED")
            shuffle(playerOrder, rng);
        const playerStates = {};
        const buildingNumbers = buildingNumbersForOptions(options.edition, options);
        for (const p of players) {
            const ps = new PlayerState(p.name);
            ps.balance = 0;
            if (options.buildings === "BEGINNER") {
                ps.buildings = buildingNumbers.map((n) => `${n}a`);
            }
            else {
                ps.buildings = buildingNumbers.map((n) => `${n}${rng.boolean() ? "a" : "b"}`);
            }
            // starting deck
            const deck = [];
            for (let i = 0; i < 5; i++)
                deck.push({ type: CattleType.JERSEY, points: 0, value: 1 });
            for (let i = 0; i < 3; i++)
                deck.push({ type: CattleType.DUTCH_BELT, points: 0, value: 2 });
            for (let i = 0; i < 3; i++)
                deck.push({ type: CattleType.BLACK_ANGUS, points: 0, value: 2 });
            for (let i = 0; i < 3; i++)
                deck.push({ type: CattleType.GUERNSEY, points: 0, value: 2 });
            shuffle(deck, rng);
            ps.drawStack = deck;
            ps.drawUpToHandLimit(rng);
            // starting workers: one of each (JobMarket.getInitialWorkerCount is for the supply fill)
            ps.workers[Worker.COWBOY] = 1;
            ps.workers[Worker.CRAFTSMAN] = 1;
            ps.workers[Worker.ENGINEER] = 1;
            playerStates[p.name] = ps;
        }
        const trail = new Trail(options.edition);
        trail.placeNeutralBuildings(rng, options.buildings === "BEGINNER");
        const railroad = new RailroadTrack(options.edition, options.railsToTheNorth);
        railroad.init(players.map((p) => p.name), rng);
        // Station master tiles: shuffled pile dealt onto the first five stations (+ the two
        // Rails to the North station towns), leftovers become the bonus pile.
        const masterPile = [...STATION_MASTERS_ORIGINAL];
        if (options.railsToTheNorth)
            masterPile.push(...STATION_MASTERS_RTTN);
        else if (options.edition === Edition.SECOND)
            masterPile.push(...STATION_MASTERS_SECOND_EDITION);
        else if (options.stationMasterPromos)
            masterPile.push(...STATION_MASTERS_PROMOS);
        shuffle(masterPile, rng);
        for (let i = 0; i < 5 && i < railroad.stations.length; i++)
            railroad.stations[i].stationMaster = masterPile[i];
        if (options.railsToTheNorth && railroad.stations.length > 11) {
            railroad.stations[10].stationMaster = masterPile[5] ?? null;
            railroad.stations[11].stationMaster = masterPile[6] ?? null;
            railroad.stationMasters = masterPile.slice(7);
        }
        else {
            railroad.stationMasters = masterPile.slice(5);
        }
        const jobMarket = new JobMarket();
        // The "balanced" variant scales the supply and cattle deck to the player count; the
        // original rules always use the full 4-player sets (RailroadTrack/CattleMarket.original).
        const balanced = options.variant === Variant.BALANCED;
        const cattleMarket = new CattleMarket(options.simmental);
        cattleMarket.init(players.length, rng, balanced);
        const kcSupply = new KansasCitySupply();
        kcSupply.init(players.length, rng, balanced);
        const foresights = new Foresights();
        foresights.init(kcSupply, rng);
        const objectiveCards = new ObjectiveCards(rng);
        const startingDeck = [...STARTING_OBJECTIVE_IDS];
        shuffle(startingDeck, rng);
        const startingObjectiveCards = startingDeck.slice(0, players.length).map((id) => OBJECTIVE_CARD_TYPES[id]);
        // GWT.placeInitialTiles: 7 hazard/teepee tiles from the first supply pile.
        let placed = 0;
        while (placed < 7 && kcSupply.tilesLeft(0) > 0) {
            const tile = kcSupply.draw(0);
            if (!tile)
                break;
            if ("hazard" in tile ? trail.placeHazard(tile.hazard) : "teepee" in tile && trail.placeTeepee(tile.teepee))
                placed++;
        }
        // One initial job-market row of workers from the second pile (JobMarket.getInitialWorkerCount).
        for (let i = 0; i < jobMarketInitialWorkerCount(players.length); i++) {
            const tile = kcSupply.draw(1);
            if (tile && "worker" in tile)
                jobMarket.addWorker(tile.worker, players.length);
        }
        const game = new Game({
            edition: options.edition,
            options,
            status: Status.BIDDING,
            players,
            playerOrder,
            currentPlayer: playerOrder[0],
            playerStates,
            trail,
            railroadTrack: railroad,
            jobMarket,
            cattleMarket,
            kcSupply,
            foresights,
            objectiveCards,
            startingObjectiveCards,
            actionStack: ActionStack.initial([]),
            canUndo: false,
        });
        if (options.playerOrder === "BIDDING") {
            game.startBidding();
        }
        else {
            game.startSetup(rng);
        }
        return game;
    }
    /** Java's private GWT.start(random): start balances, objectives, first turn. */
    startSetup(rng) {
        // Java's Player objects are kept; only the order changes with the bid result.
        const byName = new Map(this.state.players.map((p) => [p.name, p]));
        this.state.players = this.state.playerOrder.map((name) => byName.get(name));
        this.state.playerOrder.forEach((name, i) => {
            const ps = this.state.playerStates[name];
            ps.gainDollars(6 + i);
            const objective = this.state.startingObjectiveCards.shift();
            if (objective)
                ps.objectives.push(objective.id);
            if (this.state.edition === Edition.SECOND && i > 0)
                ps.drawCards(i, rng);
        });
        this.state.status = Status.STARTED;
        this.beginFirstTurn();
    }
    /** Java's GWT.startBidding: status stays BIDDING, first bidder begins. */
    startBidding() {
        this.state.status = Status.BIDDING;
        this.beginFirstTurn();
    }
    beginFirstTurn() {
        this.state.currentPlayer = this.state.playerOrder[0];
        this.beginTurn();
    }
    // ---- turn flow (ROW.determineBeginTurnActions) ----
    beginTurn(countTurn = true) {
        this.state.actionStack = ActionStack.initial(this.determineBeginTurnActions());
        if (this.state.status !== Status.BIDDING) {
            const ps = this.currentPlayerState();
            ps.numberOfCowboysUsedInTurn = 0;
            ps.locationsActivatedInTurn = [];
            if (countTurn)
                ps.turns++;
        }
    }
    determineBeginTurnActions() {
        if (this.mustPlaceBid(this.state.currentPlayer))
            return [PossibleAction.mandatory(ActionType.PLACE_BID)];
        const ps = this.currentPlayerState();
        const actions = [];
        const mustDiscard = ps.hand.length - ps.getHandLimit();
        if (mustDiscard > 0)
            actions.push(PossibleAction.repeat(mustDiscard, mustDiscard, ActionType.DISCARD_CARD));
        actions.push(PossibleAction.mandatory(ActionType.MOVE));
        return actions;
    }
    mustPlaceBid(player) {
        return this.state.status === Status.BIDDING && this.isBidContested(player);
    }
    isBidContested(player) {
        const bid = this.playerState(player).bid;
        if (!bid)
            return true;
        return this.isPositionContested(bid.position);
    }
    isPositionContested(position) {
        return Object.values(this.state.playerStates).filter((ps) => ps.bid && ps.bid.position === position).length > 1;
    }
    /** Java's GWT.placeBid: position in range, points strictly above the current best for that seat. */
    placeBid(bid, _rng) {
        if (!Number.isInteger(bid.position) || bid.position < 0 || bid.position >= this.state.playerOrder.length)
            throw new ROWException(ROWError.BID_INVALID_POSITION);
        if (!Number.isInteger(bid.points))
            throw new ROWException(ROWError.BID_INVALID_POSITION);
        let highest = -1;
        for (const ps of Object.values(this.state.playerStates)) {
            if (ps.bid && ps.bid.position === bid.position && ps.bid.points > highest)
                highest = ps.bid.points;
        }
        if (bid.points <= highest)
            throw new ROWException(ROWError.BID_TOO_LOW);
        this.currentPlayerState().bid = { position: bid.position, points: bid.points };
    }
    endBiddingIfCompleted(rng) {
        const bids = Object.values(this.state.playerStates).map((ps) => ps.bid).filter((b) => b);
        const distinct = new Set(bids.map((b) => b.position)).size;
        if (distinct !== this.state.playerOrder.length)
            return;
        this.state.actionStack.clear();
        const order = this.playerOrderFromBids();
        this.state.playerOrder = order;
        this.startSetup(rng);
    }
    playerOrderFromBids() {
        const base = this.state.playerOrder;
        return [...base].sort((a, b) => {
            const ba = this.playerState(a).bid;
            const bb = this.playerState(b).bid;
            const pa = ba ? ba.position : Number.MAX_SAFE_INTEGER;
            const pb = bb ? bb.position : Number.MAX_SAFE_INTEGER;
            if (pa !== pb)
                return pa - pb;
            const va = ba ? ba.points : Number.MIN_SAFE_INTEGER;
            const vb = bb ? bb.points : Number.MIN_SAFE_INTEGER;
            if (va !== vb)
                return vb - va;
            return base.indexOf(a) - base.indexOf(b);
        });
    }
    getStepLimit() {
        return this.currentPlayerState().getStepLimit(this.state.players.length);
    }
    possibleMoves(player) {
        const p = player ?? this.currentPlayer;
        return this.state.trail.possibleMovesFrom(p, this.playerState(p).balance, this.getStepLimit(), this.state.players.length);
    }
    /** Deliveries for the current viewer: normal at Kansas City, otherwise extraordinary (building 9A). */
    possibleDeliveries(player) {
        const p = player ?? this.currentPlayer;
        const ps = this.playerState(p);
        if (this.state.trail.atKansasCity(p)) {
            return this.state.railroadTrack.possibleDeliveries(p, ps.handValue(), ps.tempCertificates + ps.permanentCertificates());
        }
        // Extraordinary delivery (building 9A): only cities the player may deliver to, and only
        // those whose value fits the engine's last backward move.
        const out = [];
        for (const city of Object.keys(CITY_INFO)) {
            if (!this.state.railroadTrack.canDeliver(p, city))
                continue;
            const value = CITY_INFO[city].value;
            if (value <= ps.lastEngineMove)
                out.push({ city, certificates: 0, reward: 0 });
        }
        return out;
    }
    possibleActions() {
        if (this.isEnded())
            return new Set();
        const set = new Set(this.state.actionStack.getPossibleActions());
        // Objective cards and exchange tokens are only available once the game has started.
        if (this.state.status === Status.STARTED) {
            if (this.canPlayObjectiveCard())
                set.add(ActionType.PLAY_OBJECTIVE_CARD);
            if (this.canUseExchangeToken())
                set.add(ActionType.USE_EXCHANGE_TOKEN);
        }
        return set;
    }
    /** Java's Action.UseExchangeToken.canPerform. */
    canUseExchangeToken() {
        if (!this.isRailsToTheNorth() && this.edition !== Edition.SECOND)
            return false;
        const ps = this.currentPlayerState();
        const stack = this.state.actionStack;
        return ps.exchangeTokens > 0 && !stack.canPerform(ActionType.DRAW_CARD) && !stack.canPerform(ActionType.DRAW_2_CARDS) && !stack.canPerform(ActionType.DISCARD_CARD) && ps.hand.length > 0;
    }
    canPlayObjectiveCard() {
        if (!this.currentPlayer)
            return false;
        if (!this.currentPlayerState().hasObjectiveCardInHand())
            return false;
        if (this.atKansasCity())
            return false;
        const stack = this.state.actionStack;
        return (stack.size() === 1 && stack.canPerform(ActionType.MOVE)) || !stack.hasImmediate() || stack.isEmpty();
    }
    atKansasCity() {
        return this.state.trail.atKansasCity(this.currentPlayer);
    }
    canSkip() {
        return !this.isEnded() && this.state.actionStack.canSkip();
    }
    canUndo() {
        return this.state.canUndo;
    }
    skip(player) {
        if (this.isEnded())
            throw new ROWException(ROWError.GAME_ENDED);
        if (player && player !== this.currentPlayer)
            throw new ROWException(ROWError.NOT_CURRENT_PLAYER);
        const backup = backupState(this.state);
        try {
            if (this.state.actionStack.canPerform(ActionType.UPGRADE_SIMMENTAL))
                this.currentPlayerState().discardHand();
            this.state.actionStack.skip();
        }
        catch (e) {
            Object.assign(this.state, backup);
            throw e;
        }
    }
    endTurn(player, rng) {
        if (this.isEnded())
            throw new ROWException(ROWError.GAME_ENDED);
        if (player && player !== this.currentPlayer)
            throw new ROWException(ROWError.NOT_CURRENT_PLAYER);
        const backup = backupState(this.state);
        try {
            const ps = this.currentPlayerState();
            if (this.state.actionStack.canPerform(ActionType.UPGRADE_SIMMENTAL))
                ps.discardHand();
            this.state.actionStack.skipAll();
            ps.drawUpToHandLimit(rng);
            // Java's PlayerState.endTurn resets all three; -1/null match the serialised forms
            // (Java writes "none" as -1 for the station and null for the town).
            ps.numberOfCowboysUsedInTurn = 0;
            ps.locationsActivatedInTurn = [];
            ps.lastEngineMove = 0;
            ps.lastUpgradedStation = -1;
            ps.lastPlacedBranchlet = null;
            if (this.state.trail.atKansasCity(this.currentPlayer))
                this.state.trail.moveToStart(this.currentPlayer);
            this.state.canUndo = false;
            this.afterEndTurn(rng);
        }
        catch (e) {
            Object.assign(this.state, backup);
            throw e;
        }
    }
    getNextPlayer() {
        const order = this.state.playerOrder;
        let idx = order.indexOf(this.currentPlayer);
        let player;
        do {
            idx = (idx + 1) % order.length;
            player = order[idx];
        } while (this.state.status === Status.BIDDING && !this.mustPlaceBid(player));
        return player;
    }
    afterEndTurn(rng) {
        if (this.state.status === Status.BIDDING) {
            this.endBiddingIfCompleted(rng);
            if (this.state.status === Status.STARTED)
                return;
        }
        this.state.foresights.fillUp(this.state.kcSupply, !this.state.jobMarket.isClosed());
        const playerThatEndedTurn = this.currentPlayer;
        this.state.currentPlayer = this.getNextPlayer();
        if (this.state.jobMarket.isClosed()) {
            // The player who closed the job market has taken their last turn.
            this.state.playerOrder = this.state.playerOrder.filter((p) => p !== playerThatEndedTurn);
        }
        if (this.state.playerOrder.length > 0)
            this.beginTurn();
        else
            this.state.status = Status.ENDED;
    }
    // ---- perform ----
    perform(player, action, rng) {
        if (this.isEnded())
            throw new ROWException(ROWError.GAME_ENDED);
        if (player !== this.currentPlayer)
            throw new ROWException(ROWError.NOT_CURRENT_PLAYER);
        const type = action.type;
        if (type === ActionType.PLAY_OBJECTIVE_CARD && !this.canPlayObjectiveCard())
            throw new ROWException(ROWError.CANNOT_PERFORM_ACTION);
        // Bidding forces every action through the stack (Java: isAnytimeAction only counts when started).
        const anytime = (type === ActionType.PLAY_OBJECTIVE_CARD || type === ActionType.USE_EXCHANGE_TOKEN) && this.state.status !== Status.BIDDING;
        const backup = backupState(this.state);
        try {
            const stack = this.state.actionStack;
            if (!anytime) {
                if (!stack.canPerform(type))
                    throw new ROWException(ROWError.CANNOT_PERFORM_ACTION);
                stack.perform(type);
            }
            const result = this.execute(action, rng);
            // Java's ActionResult always carries a canUndo flag: `undoAllowed` for everything
            // except the handful of actions that return `undoNotAllowed` (handled explicitly
            // below), so a null/array result means "undo stays allowed".
            if (!result) {
                this.state.canUndo = true;
                return;
            }
            if (Array.isArray(result)) {
                if (result.length > 0)
                    stack.addActions(result);
                this.state.canUndo = true;
                return;
            }
            stack.addImmediateActions(result.immediate);
            stack.addActions(result.actions);
            this.state.canUndo = result.canUndo;
        }
        catch (e) {
            Object.assign(this.state, backup);
            throw e;
        }
    }
    /**
     * Steps a MOVE-family action may take, or null when the player's own step
     * limit applies. Shared with the board so both agree on the movement range.
     */
    moveStepLimit(type) {
        switch (type) {
            case ActionType.MOVE_1_FORWARD: return 1;
            case ActionType.MOVE_2_FORWARD: return 2;
            case ActionType.MOVE_3_FORWARD: return 3;
            case ActionType.MOVE_4_FORWARD: return 4;
            case ActionType.MOVE_5_FORWARD: return 5;
            case ActionType.MOVE_3_FORWARD_WITHOUT_FEES: return 3;
            default: return null;
        }
    }
    execute(action, rng) {
        const ps = this.currentPlayerState();
        switch (action.type) {
            case ActionType.MOVE:
            case ActionType.MOVE_1_FORWARD:
            case ActionType.MOVE_2_FORWARD:
            case ActionType.MOVE_3_FORWARD:
            case ActionType.MOVE_4_FORWARD:
            case ActionType.MOVE_5_FORWARD:
            case ActionType.MOVE_3_FORWARD_WITHOUT_FEES: {
                const atMost = this.moveStepLimit(action.type);
                return this.doMove(action.steps, atMost, action.type !== ActionType.MOVE_3_FORWARD_WITHOUT_FEES);
            }
            case ActionType.PLACE_BID:
                this.placeBid({ position: action.position, points: action.points }, rng);
                return { immediate: [], actions: [], canUndo: true };
            case ActionType.DISCARD_CARD: {
                const card = action.card;
                if (!card)
                    throw new ROWException(ROWError.CARD_NOT_IN_HAND);
                ps.discardCard(card);
                return { immediate: [], actions: [], canUndo: true };
            }
            case ActionType.DRAW_CARD: {
                if (!ps.drawCard(rng))
                    throw new ROWException(ROWError.NOT_ENOUGH_CARDS);
                return { immediate: [PossibleAction.mandatory(ActionType.DISCARD_CARD)], actions: [], canUndo: false };
            }
            case ActionType.DRAW_2_CARDS:
            case ActionType.DRAW_3_CARDS:
            case ActionType.DRAW_4_CARDS:
            case ActionType.DRAW_5_CARDS:
            case ActionType.DRAW_6_CARDS: {
                const n = action.type === ActionType.DRAW_2_CARDS ? 2 : action.type === ActionType.DRAW_3_CARDS ? 3 : action.type === ActionType.DRAW_4_CARDS ? 4 : action.type === ActionType.DRAW_5_CARDS ? 5 : 6;
                const actual = ps.drawCards(n, rng);
                if (actual === 0)
                    throw new ROWException(ROWError.NOT_ENOUGH_CARDS);
                return { immediate: [PossibleAction.repeat(actual, actual, ActionType.DISCARD_CARD)], actions: [], canUndo: false };
            }
            case ActionType.GAIN_1_DOLLAR:
                ps.gainDollars(1);
                return null;
            case ActionType.GAIN_2_DOLLARS:
                ps.gainDollars(2);
                return null;
            case ActionType.GAIN_3_DOLLARS:
                ps.gainDollars(3);
                return null;
            case ActionType.GAIN_4_DOLLARS:
                ps.gainDollars(4);
                return null;
            case ActionType.GAIN_5_DOLLARS:
                ps.gainDollars(5);
                return null;
            case ActionType.GAIN_EXCHANGE_TOKEN:
                ps.gainExchangeTokens(1);
                return { immediate: [], actions: [], canUndo: true };
            case ActionType.USE_EXCHANGE_TOKEN:
                ps.payExchangeTokens(1);
                return { immediate: [PossibleAction.optional(PossibleAction.choiceActions([ActionType.DRAW_CARD, ActionType.DRAW_2_CARDS]))], actions: [], canUndo: true };
            case ActionType.GAIN_12_DOLLARS:
                ps.gainDollars(12);
                return null;
            case ActionType.GAIN_1_CERTIFICATE:
                ps.gainTempCertificates(1);
                return null;
            case ActionType.GAIN_2_CERTIFICATES:
                ps.gainTempCertificates(2);
                return null;
            case ActionType.GAIN_1_DOLLAR_PER_ENGINEER:
                ps.gainDollars(ps.getNumberOfEngineers());
                return null;
            case ActionType.GAIN_1_DOLLAR_PER_CRAFTSMAN:
                ps.gainDollars(ps.getNumberOfCraftsmen());
                return null;
            case ActionType.GAIN_2_DOLLARS_PER_BUILDING_IN_WOODS:
                ps.gainDollars(2 * this.state.trail.buildingsInWoods(this.currentPlayer));
                return null;
            case ActionType.GAIN_2_DOLLARS_PER_STATION:
                ps.gainDollars(2 * this.state.railroadTrack.numberOfUpgradedStations(this.currentPlayer));
                return null;
            case ActionType.HIRE_WORKER:
                // Java: undoAllowed(gainWorker(...)) - the worker-count bonuses are immediate actions.
                return { immediate: this.hireWorker(action.row, action.worker, 0), actions: [], canUndo: true };
            case ActionType.HIRE_WORKER_PLUS_2:
                return { immediate: this.hireWorker(action.row, action.worker, 2), actions: [], canUndo: true };
            case ActionType.HIRE_WORKER_MINUS_1:
                return { immediate: this.hireWorker(action.row, action.worker, -1), actions: [], canUndo: true };
            case ActionType.HIRE_WORKER_MINUS_2:
                return { immediate: this.hireWorker(action.row, action.worker, -2), actions: [], canUndo: true };
            case ActionType.TAKE_OBJECTIVE_CARD: {
                const chosen = action.objectiveCard ? this.state.objectiveCards.remove(action.objectiveCard) : this.state.objectiveCards.draw();
                ps.gainCard(chosen);
                // Java: ActionResult.undoNotAllowed(ImmediateActions.none())
                return { immediate: [], actions: [], canUndo: false };
            }
            case ActionType.ADD_1_OBJECTIVE_CARD_TO_HAND: {
                const chosen = action.objectiveCard ? this.state.objectiveCards.remove(action.objectiveCard) : this.state.objectiveCards.draw();
                ps.addCardToHand(chosen);
                // Java: ActionResult.undoNotAllowed(ImmediateActions.none())
                return { immediate: [], actions: [], canUndo: false };
            }
            case ActionType.PLAY_OBJECTIVE_CARD: {
                const requested = action.objectiveCard;
                let idx = ps.hand.indexOf(requested);
                if (idx < 0 && requested && typeof requested === "object")
                    idx = ps.hand.findIndex((c) => cardKey(c) === cardKey(requested));
                if (idx < 0)
                    throw new ROWException(ROWError.CARD_NOT_IN_HAND);
                const [card] = ps.hand.splice(idx, 1);
                ps.objectives.push(card.id);
                // Java's ObjectiveCard.possibleAction is optional(...): the GAIN2/ENGINE/MOVE cards
                // grant one optional action and the DRAW cards an optional draw-1/2/3 choice.
                const grant = card.action ? (card.drawChoice ? PossibleAction.choiceActions([ActionType.DRAW_CARD, ActionType.DRAW_2_CARDS, ActionType.DRAW_3_CARDS]) : PossibleAction.mandatory(card.action)) : null;
                return { immediate: grant ? [PossibleAction.optional(grant)] : [], actions: [], canUndo: true };
            }
            // Java returns the next foresight/delivery as ImmediateActions, not newActions.
            case ActionType.CHOOSE_FORESIGHT_1: {
                const r = this.chooseForesight(0, action.choice, rng);
                return { immediate: [r.next], actions: [], canUndo: r.canUndo };
            }
            case ActionType.CHOOSE_FORESIGHT_2: {
                const r = this.chooseForesight(1, action.choice, rng);
                return { immediate: [r.next], actions: [], canUndo: r.canUndo };
            }
            case ActionType.CHOOSE_FORESIGHT_3: {
                const r = this.chooseForesight(2, action.choice, rng);
                return { immediate: [r.next], actions: [], canUndo: r.canUndo };
            }
            case ActionType.DELIVER_TO_CITY: {
                return { immediate: this.deliverToCity(action.city, action.certificates ?? 0), actions: [], canUndo: true };
            }
            case ActionType.BUY_CATTLE: {
                // Java checks the cowboys before it even looks up the cost, so an unaffordable
                // buy reports NOT_ENOUGH_COWBOYS rather than CANNOT_PERFORM_ACTION.
                if ((action.cowboys ?? 0) > ps.cowboysRemaining())
                    throw new ROWException(ROWError.NOT_ENOUGH_COWBOYS);
                const requested = action.cattleCards ?? [];
                const market = this.state.cattleMarket.market;
                // Java's ActionType.findCattleCards resolves each request against a shrinking copy
                // of the market, so two identical requests become two distinct cards.
                const taken = new Set();
                const cards = requested.map((req) => {
                    const idx = market.findIndex((m, i) => !taken.has(i) && m.type === req.type && m.points === req.points && (req.value === undefined || m.value === req.value));
                    if (idx < 0)
                        throw new ROWException(ROWError.CATTLE_CARD_NOT_AVAILABLE);
                    taken.add(idx);
                    return market[idx];
                });
                const cost = this.state.cattleMarket.buy(cards, action.cowboys, action.dollars);
                for (const c of cards)
                    ps.discardPile.unshift(c);
                ps.payDollars(cost.dollars);
                ps.useCowboys(cost.cowboys);
                return { immediate: [], actions: [], canUndo: true };
            }
            case ActionType.SINGLE_AUXILIARY_ACTION:
                return { immediate: [], actions: [PossibleAction.optional(PossibleAction.choice(this.unlockedSingleAuxiliaryActions(ps)))], canUndo: true };
            case ActionType.SINGLE_OR_DOUBLE_AUXILIARY_ACTION:
                return { immediate: [], actions: [PossibleAction.optional(PossibleAction.choice(this.unlockedSingleOrDoubleAuxiliaryActions(ps)))], canUndo: true };
            case ActionType.MOVE_ENGINE_FORWARD: {
                const to = action.to ?? this.forwardTarget();
                const immediate = this.state.railroadTrack.moveEngineForward(this.currentPlayer, to, 0, ps.getNumberOfEngineers());
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.MOVE_ENGINE_1_FORWARD: {
                const immediate = this.state.railroadTrack.moveEngineForward(this.currentPlayer, action.to, 1, 1);
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.MOVE_ENGINE_2_FORWARD: {
                const immediate = this.state.railroadTrack.moveEngineForward(this.currentPlayer, action.to, 1, 2);
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.MOVE_ENGINE_AT_MOST_2_FORWARD: {
                const immediate = this.state.railroadTrack.moveEngineForward(this.currentPlayer, action.to, 0, 2);
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.MOVE_ENGINE_AT_MOST_3_FORWARD: {
                const immediate = this.state.railroadTrack.moveEngineForward(this.currentPlayer, action.to, 0, 3);
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.MOVE_ENGINE_AT_MOST_4_FORWARD: {
                const immediate = this.state.railroadTrack.moveEngineForward(this.currentPlayer, action.to, 0, 4);
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.MOVE_ENGINE_2_OR_3_FORWARD: {
                const immediate = this.state.railroadTrack.moveEngineForward(this.currentPlayer, action.to, 2, 3);
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_BUILDINGS_IN_WOODS: {
                const max = this.state.trail.buildingsInWoods(this.currentPlayer);
                const immediate = this.state.railroadTrack.moveEngineForward(this.currentPlayer, action.to, 0, max);
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_HAZARDS: {
                const immediate = this.state.railroadTrack.moveEngineForward(this.currentPlayer, action.to, 0, ps.numberOfHazards());
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD: {
                ps.payDollars(1);
                const immediate = this.state.railroadTrack.moveEngineForward(this.currentPlayer, action.to, 1, 1);
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD: {
                ps.payDollars(2);
                const immediate = this.state.railroadTrack.moveEngineForward(this.currentPlayer, action.to, 1, 2);
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.PAY_1_DOLLAR_AND_MOVE_ENGINE_1_BACKWARDS_TO_GAIN_1_CERTIFICATE: {
                ps.payDollars(1);
                const immediate = this.state.railroadTrack.moveEngineBackwards(this.currentPlayer, action.to, 1, 1);
                ps.gainTempCertificates(1);
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES: {
                ps.payDollars(2);
                const immediate = this.state.railroadTrack.moveEngineBackwards(this.currentPlayer, action.to, 2, 2);
                ps.gainTempCertificates(2);
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.MOVE_ENGINE_AT_LEAST_1_BACKWARDS_AND_GAIN_3_DOLLARS:
            case ActionType.MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS: {
                if (action.type === ActionType.MOVE_ENGINE_AT_LEAST_1_BACKWARDS_AND_GAIN_3_DOLLARS)
                    ps.gainDollars(3);
                const immediate = this.state.railroadTrack.moveEngineBackwards(this.currentPlayer, action.to, 1, action.type === ActionType.MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS ? 1 : Number.MAX_SAFE_INTEGER);
                if (action.type === ActionType.MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS)
                    ps.gainDollars(3);
                return { immediate, actions: [], canUndo: true };
            }
            case ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD: {
                const immediate = this.state.railroadTrack.moveEngineBackwards(this.currentPlayer, action.to, 1, 1);
                return { immediate: [...immediate, PossibleAction.mandatory(ActionType.REMOVE_CARD)], actions: [], canUndo: true };
            }
            case ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR: {
                ps.gainDollars(1);
                const immediate = this.state.railroadTrack.moveEngineBackwards(this.currentPlayer, action.to, 1, 1);
                return { immediate: [...immediate, PossibleAction.optionalAction(ActionType.REMOVE_CARD)], actions: [], canUndo: true };
            }
            case ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS: {
                const immediate = this.state.railroadTrack.moveEngineBackwards(this.currentPlayer, action.to, 2, 2);
                return { immediate: [...immediate, PossibleAction.repeat(2, 2, ActionType.REMOVE_CARD)], actions: [], canUndo: true };
            }
            case ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS_AND_GAIN_2_DOLLARS: {
                ps.gainDollars(2);
                const immediate = this.state.railroadTrack.moveEngineBackwards(this.currentPlayer, action.to, 2, 2);
                return { immediate: [...immediate, PossibleAction.repeat(0, 2, ActionType.REMOVE_CARD)], actions: [], canUndo: true };
            }
            case ActionType.EXTRAORDINARY_DELIVERY: {
                const move = this.state.railroadTrack.moveEngine(this.currentPlayer, action.to, 1, Number.MAX_SAFE_INTEGER, false);
                // Java's EngineMove.getStepsNotCountingTurnouts: a turnout stop is not a step.
                ps.lastEngineMove = move.steps - (this.state.railroadTrack.isTurnout(action.to) ? 1 : 0);
                return { immediate: [PossibleAction.mandatory(ActionType.DELIVER_TO_CITY), ...move.immediate], actions: [], canUndo: true };
            }
            case ActionType.UPGRADE_STATION: {
                const stationIndex = this.stationAtCurrentSpace();
                if (stationIndex === null)
                    throw new ROWException(ROWError.NOT_AT_STATION);
                return { immediate: this.upgradeStation(stationIndex), actions: [], canUndo: true };
            }
            case ActionType.UPGRADE_ANY_STATION_BEHIND_ENGINE: {
                const stationIndex = action.station;
                const station = this.state.railroadTrack.stations[stationIndex];
                if (!station)
                    throw new ROWException(ROWError.STATION_NOT_ON_TRACK);
                if (parseFloat(this.state.railroadTrack.currentSpace(this.currentPlayer)) <= parseFloat(station.space))
                    throw new ROWException(ROWError.STATION_MUST_BE_BEHIND_ENGINE);
                return { immediate: this.upgradeStation(stationIndex), actions: [], canUndo: true };
            }
            case ActionType.DOWNGRADE_STATION: {
                const stationIndex = action.station;
                if (stationIndex === ps.lastUpgradedStation)
                    throw new ROWException(ROWError.STATION_MUST_BE_DIFFERENT);
                this.downgradeStation(stationIndex);
                return { immediate: [], actions: [], canUndo: true };
            }
            case ActionType.APPOINT_STATION_MASTER:
                return { immediate: this.appointStationMaster(action.worker), actions: [], canUndo: true };
            case ActionType.UPGRADE_STATION_TOWN: {
                const town = ps.lastPlacedBranchlet;
                if (!town)
                    throw new ROWException(ROWError.CANNOT_PERFORM_ACTION);
                const stationIndex = this.state.railroadTrack.stationForTown(town);
                if (stationIndex === null)
                    throw new ROWException(ROWError.NOT_AT_STATION);
                return { immediate: this.upgradeStation(stationIndex), actions: [], canUndo: true };
            }
            case ActionType.PLACE_BRANCHLET: {
                // Java resolves the town name before performing (NO_SUCH_TOWN), then pulls a
                // branchlet off the supply, then places it: town payout first, supply bonus second.
                if (!RTTN_TRACK[action.town]?.town)
                    throw new ROWException(ROWError.NO_SUCH_TOWN);
                const supply = ps.removeBranchlet();
                const town = this.state.railroadTrack.placeBranchlet(this.currentPlayer, action.town, ps);
                return { immediate: town.concat(supply), actions: [], canUndo: true };
            }
            case ActionType.DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET: {
                if (![CattleType.GUERNSEY, CattleType.BLACK_ANGUS, CattleType.DUTCH_BELT].includes(action.cattleType))
                    throw new ROWException(ROWError.INVALID_CATTLE_TYPE);
                ps.discardCattleCards(action.cattleType, 1);
                return { immediate: [PossibleAction.optionalAction(ActionType.PLACE_BRANCHLET)], actions: [], canUndo: true };
            }
            case ActionType.TAKE_BONUS_STATION_MASTER: {
                if (ps.stationMasters.includes(action.stationMaster))
                    throw new ROWException(ROWError.ALREADY_HAS_STATION_MASTER);
                this.state.railroadTrack.takeBonusStationMaster(action.stationMaster);
                ps.stationMasters.push(action.stationMaster);
                return { immediate: this.stationMasterActivate(action.stationMaster), actions: [], canUndo: true };
            }
            case ActionType.UPGRADE_SIMMENTAL: {
                const requested = action.card ?? action.cattleCard;
                const idx = requested && typeof requested === "object" ? ps.hand.findIndex((c) => isCattleCard(c) && c.type === requested.type && c.points === requested.points && (requested.value === undefined || c.value === requested.value)) : -1;
                if (idx < 0)
                    throw new ROWException(ROWError.CARD_NOT_IN_HAND);
                const card = ps.hand[idx];
                if (card.type !== CattleType.SIMMENTAL)
                    throw new ROWException(ROWError.INVALID_CATTLE_TYPE);
                let upgraded;
                if (card.value === 2)
                    upgraded = { type: CattleType.SIMMENTAL, points: 4, value: 4 };
                else if (card.value === 4)
                    upgraded = { type: CattleType.SIMMENTAL, points: 5, value: 5 };
                else
                    throw new ROWException(ROWError.CANNOT_UPGRADE_SIMMENTAL);
                ps.hand.splice(idx, 1);
                ps.gainCard(upgraded);
                // Java discards the rest of the hand once no simmentals are left to upgrade.
                if (ps.simmentalsToUpgrade() === 0)
                    ps.discardHand();
                return null;
            }
            case ActionType.USE_ADJACENT_BUILDING:
                return this.useAdjacentBuilding(action.location);
            case ActionType.UNLOCK_WHITE:
                // Java rejects a black disc here; without this the player could unlock e.g.
                // CERT_LIMIT_6 with UNLOCK_WHITE.
                if (UNLOCKABLE_INFO[action.unlock].discColor !== DiscColor.WHITE)
                    throw new ROWException(ROWError.MUST_PICK_WHITE_DISC);
                ps.unlock(action.unlock);
                return null;
            case ActionType.UNLOCK_BLACK_OR_WHITE:
                ps.unlock(action.unlock);
                return null;
            case ActionType.PLACE_BUILDING:
                this.placeBuilding(action.location, action.building, 2);
                return { immediate: [], actions: [], canUndo: true };
            case ActionType.PLACE_CHEAP_BUILDING:
                this.placeBuilding(action.location, action.building, 1);
                return { immediate: [], actions: [], canUndo: true };
            case ActionType.PLACE_BUILDING_FOR_FREE:
                this.placeBuilding(action.location, action.building, 0);
                return { immediate: [], actions: [], canUndo: true };
            case ActionType.REMOVE_HAZARD:
            case ActionType.REMOVE_HAZARD_FOR_2_DOLLARS:
            case ActionType.REMOVE_HAZARD_FOR_5_DOLLARS:
            case ActionType.REMOVE_HAZARD_FOR_FREE:
                return { immediate: this.removeHazard(action.type, action.location), actions: [], canUndo: true };
            case ActionType.TRADE_WITH_TRIBES:
                return { immediate: this.tradeWithTribes(action.location), actions: [], canUndo: true };
            case ActionType.DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE:
                ps.discardCattleCards(CattleType.JERSEY, 1);
                ps.gainTempCertificates(1);
                return null;
            case ActionType.DISCARD_1_JERSEY_TO_GAIN_2_DOLLARS:
                ps.discardCattleCards(CattleType.JERSEY, 1);
                ps.gainDollars(2);
                return null;
            case ActionType.DISCARD_1_JERSEY_TO_GAIN_2_CERTIFICATES:
                ps.discardCattleCards(CattleType.JERSEY, 1);
                ps.gainTempCertificates(2);
                return null;
            case ActionType.DISCARD_1_JERSEY_TO_GAIN_4_DOLLARS:
                ps.discardCattleCards(CattleType.JERSEY, 1);
                ps.gainDollars(4);
                return null;
            case ActionType.DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE_AND_2_DOLLARS:
                ps.discardCattleCards(CattleType.JERSEY, 1);
                ps.gainTempCertificates(1);
                ps.gainDollars(2);
                return null;
            case ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE:
            case ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND:
            case ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND: {
                ps.discardCattleCards(action.cattleType, 1);
                if (action.type === ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE)
                    ps.gainTempCertificates(1);
                else {
                    ps.gainDollars(action.type === ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND ? 6 : 3);
                    const hasObjectives = this.state.objectiveCards.available.length + this.state.objectiveCards.drawStack.length > 0;
                    return { immediate: hasObjectives ? [PossibleAction.optionalAction(ActionType.ADD_1_OBJECTIVE_CARD_TO_HAND)] : [], actions: [], canUndo: true };
                }
                return null;
            }
            case ActionType.DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS: {
                const t = action.cattleType;
                if (![CattleType.AYRSHIRE, CattleType.BROWN_SWISS, CattleType.HOLSTEIN].includes(t))
                    throw new ROWException(ROWError.INVALID_CATTLE_TYPE);
                ps.discardCattleCards(t, 1);
                ps.gainDollars(7);
                return null;
            }
            case ActionType.DISCARD_PAIR_TO_GAIN_3_DOLLARS:
                ps.discardCattleCards(action.cattleType, 2);
                ps.gainDollars(3);
                return null;
            case ActionType.DISCARD_PAIR_TO_GAIN_4_DOLLARS:
                ps.discardCattleCards(action.cattleType, 2);
                ps.gainDollars(4);
                return null;
            case ActionType.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES:
                ps.discardCard(action.objectiveCard);
                ps.gainTempCertificates(2);
                return null;
            case ActionType.DISCARD_1_GUERNSEY:
                ps.discardCattleCards(CattleType.GUERNSEY, 1);
                ps.gainDollars(2);
                return null;
            case ActionType.DISCARD_1_GUERNSEY_TO_GAIN_4_DOLLARS:
                ps.discardCattleCards(CattleType.GUERNSEY, 1);
                ps.gainDollars(4);
                return null;
            case ActionType.DISCARD_1_HOLSTEIN_TO_GAIN_10_DOLLARS:
                ps.discardCattleCards(CattleType.HOLSTEIN, 1);
                ps.gainDollars(10);
                return null;
            case ActionType.DISCARD_1_BLACK_ANGUS_TO_GAIN_2_DOLLARS:
                ps.discardCattleCards(CattleType.BLACK_ANGUS, 1);
                ps.gainDollars(2);
                return null;
            case ActionType.DISCARD_1_BLACK_ANGUS_TO_GAIN_2_CERTIFICATES:
                ps.discardCattleCards(CattleType.BLACK_ANGUS, 1);
                ps.gainTempCertificates(2);
                return null;
            case ActionType.DISCARD_1_DUTCH_BELT_TO_GAIN_2_DOLLARS:
                ps.discardCattleCards(CattleType.DUTCH_BELT, 1);
                ps.gainDollars(2);
                return null;
            case ActionType.DISCARD_1_DUTCH_BELT_TO_GAIN_3_DOLLARS:
                ps.discardCattleCards(CattleType.DUTCH_BELT, 1);
                ps.gainDollars(3);
                return null;
            case ActionType.DISCARD_1_JERSEY_TO_MOVE_ENGINE_1_FORWARD:
                ps.discardCattleCards(CattleType.JERSEY, 1);
                return { immediate: [PossibleAction.optionalAction(ActionType.MOVE_ENGINE_1_FORWARD)], actions: [], canUndo: true };
            case ActionType.DISCARD_1_DUTCH_BELT_TO_MOVE_ENGINE_2_FORWARD:
                ps.discardCattleCards(CattleType.DUTCH_BELT, 1);
                return { immediate: [PossibleAction.optionalAction(ActionType.MOVE_ENGINE_2_FORWARD)], actions: [], canUndo: true };
            case ActionType.DISCARD_1_JERSEY_FOR_SINGLE_AUXILIARY_ACTION:
                ps.discardCattleCards(CattleType.JERSEY, 1);
                return { immediate: [], actions: [PossibleAction.optional(PossibleAction.choice(this.unlockedSingleAuxiliaryActions(ps)))], canUndo: true };
            case ActionType.MAX_CERTIFICATES:
                ps.gainMaxTempCertificates();
                return null;
            case ActionType.GAIN_2_CERTIFICATES_AND_2_DOLLARS_PER_TEEPEE_PAIR: {
                const pairs = ps.numberOfTeepeePairs();
                ps.gainTempCertificates(pairs * 2);
                ps.gainDollars(pairs * 2);
                return null;
            }
            case ActionType.GAIN_1_CERTIFICATE_AND_1_DOLLAR_PER_BELL: {
                const bells = ps.numberOfBells();
                ps.gainTempCertificates(bells);
                ps.gainDollars(bells);
                return null;
            }
            case ActionType.TAKE_BREEDING_VALUE_3_CATTLE_CARD: {
                const card = (action.card ?? action.cattleCard);
                this.state.cattleMarket.take(card);
                ps.gainCard(card);
                return null;
            }
            case ActionType.DRAW_2_CATTLE_CARDS: {
                if (!this.state.cattleMarket.draw())
                    throw new ROWException(ROWError.NOT_ENOUGH_CARDS);
                this.state.cattleMarket.draw();
                ps.useCowboys(1);
                return { immediate: [], actions: [], canUndo: false };
            }
            case ActionType.REMOVE_CARD:
                ps.removeCard(action.card);
                return null;
            default:
                throw new ROWException(ROWError.NOT_IMPLEMENTED);
        }
    }
    isDirect(from, to) {
        if (this.state.trail.getLocation(from).next.includes(to))
            return true;
        // pass through empty locations
        for (const n of this.state.trail.getLocation(from).next) {
            const loc = this.state.trail.getLocation(n);
            if (loc.isEmpty() && this.isDirect(n, to))
                return true;
        }
        return false;
    }
    doMove(steps, atMost, payFeesAndActivate) {
        const ps = this.currentPlayerState();
        if (!steps || steps.length === 0)
            throw new ROWException(ROWError.MUST_MOVE_AT_LEAST_STEPS);
        if (atMost === null) {
            if (steps.length > this.getStepLimit())
                throw new ROWException(ROWError.STEPS_EXCEED_LIMIT);
        }
        else if (steps.length > atMost) {
            throw new ROWException(ROWError.STEPS_EXCEED_LIMIT);
        }
        const to = steps[steps.length - 1];
        const toLoc = this.state.trail.getLocation(to);
        if (toLoc.isEmpty())
            throw new ROWException(ROWError.LOCATION_EMPTY);
        const from = this.state.trail.currentLocation(this.currentPlayer);
        if (from) {
            let cur = from;
            for (const s of steps) {
                if (!this.isDirect(cur, s))
                    throw new ROWException(ROWError.CANNOT_STEP_DIRECTLY_FROM_TO);
                cur = s;
            }
            if (payFeesAndActivate)
                this.payFees(steps);
        }
        else if (toLoc.kind !== "BUILDING") {
            throw new ROWException(ROWError.MUST_START_ON_NEUTRAL_BUILDING);
        }
        this.state.trail.movePlayer(this.currentPlayer, to);
        if (!this.state.actionStack.canPerform(ActionType.MOVE))
            this.state.actionStack.clear();
        if (payFeesAndActivate) {
            return { immediate: [], actions: [this.activateLocation(toLoc)], canUndo: true };
        }
        if (to === "KANSAS_CITY")
            throw new ROWException(ROWError.CANNOT_PERFORM_ACTION);
        return { immediate: [], actions: [], canUndo: true };
    }
    /** Pay tolls to the bank / other players, capped at the current balance (Move.payFees). */
    payFees(steps) {
        const ps = this.currentPlayerState();
        for (const name of steps) {
            const loc = this.state.trail.getLocation(name);
            const amount = Math.min(ps.balance, handFee(loc.getHand(), this.state.players.length));
            if (amount <= 0)
                continue;
            let recipient = null;
            if (loc.kind === "BUILDING" && loc.building && loc.building.player !== null)
                recipient = loc.building.player;
            if (recipient && recipient !== this.currentPlayer) {
                ps.payDollars(amount);
                this.playerState(recipient).gainDollars(amount);
            }
            else if (!recipient) {
                ps.payDollars(amount);
            }
        }
    }
    forwardTarget(explicit) {
        if (explicit)
            return explicit;
        const cur = parseFloat(this.state.railroadTrack.currentSpace(this.currentPlayer));
        return String(Math.floor(cur) + 1);
    }
    stationAtCurrentSpace() {
        const space = this.state.railroadTrack.currentSpace(this.currentPlayer);
        const idx = this.state.railroadTrack.stations.findIndex((s) => s.space === space);
        return idx >= 0 ? idx : null;
    }
    upgradeStation(stationIndex) {
        const ps = this.currentPlayerState();
        const station = this.state.railroadTrack.stations[stationIndex];
        if (station.upgradedBy.includes(this.currentPlayer))
            throw new ROWException(ROWError.ALREADY_UPGRADED_STATION);
        ps.payDollars(station.cost);
        ps.lastUpgradedStation = stationIndex;
        station.upgradedBy.push(this.currentPlayer);
        // Java's RailroadTrack.upgradeStation: placing the station disc costs a player-board disc
        // (or a station downgrade when none are left), then offers the station master.
        const immediate = this.removeDisc(station.discColors);
        if (station.stationMaster)
            immediate.push(PossibleAction.optionalAction(ActionType.APPOINT_STATION_MASTER));
        return immediate;
    }
    appointStationMaster(worker) {
        const ps = this.currentPlayerState();
        // Java serialises "none" as -1; only a real station index counts as remembered.
        const remembered = typeof ps.lastUpgradedStation === "number" && ps.lastUpgradedStation >= 0;
        const stationIndex = remembered ? ps.lastUpgradedStation : this.stationAtCurrentSpace();
        if (stationIndex === null)
            throw new ROWException(ROWError.NOT_AT_STATION);
        const station = this.state.railroadTrack.stations[stationIndex];
        if (!station.stationMaster)
            throw new ROWException(ROWError.CANNOT_PERFORM_ACTION);
        // PlayerState.removeWorker: a worker of that type must remain on the board afterwards.
        if (ps.workers[worker] <= 1)
            throw new ROWException(ROWError.NOT_ENOUGH_WORKERS);
        if (ps.stationMasters.includes(station.stationMaster))
            throw new ROWException(ROWError.ALREADY_HAS_STATION_MASTER);
        ps.workers[worker]--;
        station.worker = worker;
        const master = station.stationMaster;
        station.stationMaster = null;
        ps.stationMasters.push(master);
        return this.stationMasterActivate(master);
    }
    downgradeStation(stationIndex) {
        const ps = this.currentPlayerState();
        const station = this.state.railroadTrack.stations[stationIndex];
        const idx = station.upgradedBy.indexOf(this.currentPlayer);
        if (idx < 0)
            throw new ROWException(ROWError.STATION_NOT_UPGRADED_BY_PLAYER);
        station.upgradedBy.splice(idx, 1);
        ps.discs += 1;
    }
    stationMasterActivate(master) {
        if (master === "GAIN_2_DOLLARS_POINT_FOR_EACH_WORKER")
            return [PossibleAction.optionalAction(ActionType.GAIN_2_DOLLARS)];
        if (master === "REMOVE_HAZARD_OR_TEEPEE_POINTS_FOR_EACH_2_OBJECTIVE_CARDS")
            return [PossibleAction.optional(PossibleAction.choiceActions([ActionType.TRADE_WITH_TRIBES, ActionType.REMOVE_HAZARD_FOR_FREE]))];
        if (master === "TWELVE_DOLLARS")
            return [PossibleAction.optionalAction(ActionType.GAIN_12_DOLLARS)];
        if (master === "GAIN_2_CERTS_POINTS_PER_BUILDING")
            return [PossibleAction.optionalAction(ActionType.GAIN_2_CERTIFICATES)];
        return [];
    }
    placeBuilding(locationName, buildingName, costPerCraftsman) {
        const ps = this.currentPlayerState();
        const loc = this.state.trail.getLocation(locationName);
        if (loc.kind !== "BUILDING")
            throw new ROWException(ROWError.MUST_START_ON_NEUTRAL_BUILDING);
        const info = PLAYER_BUILDINGS[buildingName];
        if (!info)
            throw new ROWException(ROWError.BUILDING_NOT_AVAILABLE);
        if (!ps.buildings.includes(buildingName))
            throw new ROWException(ROWError.BUILDING_NOT_AVAILABLE);
        let craftsmenNeeded = info.craftsmen;
        if (loc.building) {
            if (loc.building.player === null)
                throw new ROWException(ROWError.CANNOT_REPLACE_NEUTRAL_BUILDING);
            if (loc.building.player !== this.currentPlayer)
                throw new ROWException(ROWError.CANNOT_REPLACE_BUILDING_OF_OTHER_PLAYER);
            const existing = PLAYER_BUILDINGS[loc.building.name];
            if (existing.craftsmen >= info.craftsmen)
                throw new ROWException(ROWError.REPLACEMENT_BUILDING_MUST_BE_HIGHER);
            craftsmenNeeded = info.craftsmen - existing.craftsmen;
        }
        if (craftsmenNeeded > ps.getNumberOfCraftsmen())
            throw new ROWException(ROWError.NOT_ENOUGH_CRAFTSMEN);
        ps.payDollars(craftsmenNeeded * costPerCraftsman);
        ps.removeBuilding(buildingName);
        loc.building = { name: buildingName, player: this.currentPlayer };
    }
    removeHazard(type, locationName) {
        const ps = this.currentPlayerState();
        const loc = this.state.trail.getLocation(locationName);
        if (loc.hazard === null)
            throw new ROWException(ROWError.LOCATION_EMPTY);
        const cost = type === ActionType.REMOVE_HAZARD_FOR_FREE ? 0 : type === ActionType.REMOVE_HAZARD_FOR_2_DOLLARS ? 2 : type === ActionType.REMOVE_HAZARD_FOR_5_DOLLARS ? 5 : 7;
        ps.payDollars(cost);
        ps.hazards.push(loc.hazard);
        loc.hazard = null;
        return [];
    }
    tradeWithTribes(locationName) {
        const ps = this.currentPlayerState();
        const loc = this.state.trail.getLocation(locationName);
        if (loc.kind !== "TEEPEE" || loc.teepee === null)
            throw new ROWException(ROWError.NO_TEEPEE_AT_LOCATION);
        const reward = loc.def.reward ?? 0;
        if (reward > 0)
            ps.gainDollars(reward);
        else if (reward < 0)
            ps.payDollars(Math.min(ps.balance, -reward));
        ps.teepees.push(loc.teepee);
        loc.teepee = null;
        // Java TeepeeLocation.isExchangeToken: a zero-reward teepee space pays an exchange token.
        if (reward === 0)
            ps.gainExchangeTokens(1);
        return [];
    }
    hireWorker(rowIndex, worker, modifier) {
        const ps = this.currentPlayerState();
        const base = this.state.jobMarket.cost(rowIndex, worker);
        const cost = Math.max(0, base + modifier);
        if (ps.balance < cost)
            throw new ROWException(ROWError.NOT_ENOUGH_BALANCE_TO_PAY);
        ps.payDollars(cost);
        this.state.jobMarket.takeWorker(rowIndex, worker);
        ps.gainWorker(worker);
        return this.gainWorkerImmediate(worker);
    }
    gainWorkerImmediate(worker) {
        const ps = this.currentPlayerState();
        const count = ps.workers[worker];
        if (worker === Worker.COWBOY) {
            if (count === 4)
                return [PossibleAction.optionalAction(ActionType.REMOVE_HAZARD_FOR_FREE)];
            if (count === 6)
                return [PossibleAction.optionalAction(ActionType.TRADE_WITH_TRIBES)];
        }
        else if (worker === Worker.CRAFTSMAN) {
            if (count === 4 || count === 6)
                return [PossibleAction.optionalAction(ActionType.PLACE_CHEAP_BUILDING)];
        }
        else if (worker === Worker.ENGINEER) {
            if (count === 2)
                return [PossibleAction.optionalAction(ActionType.DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE)];
            if (count === 3)
                return [PossibleAction.optionalAction(ActionType.DISCARD_1_JERSEY_TO_GAIN_2_DOLLARS)];
            if (count === 4)
                return [PossibleAction.optionalAction(ActionType.HIRE_WORKER_MINUS_2)];
            if (count === 5)
                return [PossibleAction.optionalAction(ActionType.DISCARD_1_JERSEY_TO_GAIN_2_CERTIFICATES)];
            if (count === 6)
                return [PossibleAction.optionalAction(ActionType.DISCARD_1_JERSEY_TO_GAIN_4_DOLLARS)];
        }
        return [];
    }
    chooseForesight(column, choice, rng) {
        void rng;
        const tile = this.state.foresights.take(column, choice);
        const canUndo = tile ? this.deployKcTile(tile) : true;
        return { next: PossibleAction.mandatory(this.nextForesightAction(column)), canUndo };
    }
    nextForesightAction(column) {
        if (column === 0)
            return this.state.foresights.isEmpty(1) ? this.nextForesightAction(1) : ActionType.CHOOSE_FORESIGHT_2;
        if (column === 1)
            return this.state.foresights.isEmpty(2) ? this.nextForesightAction(2) : ActionType.CHOOSE_FORESIGHT_3;
        return ActionType.DELIVER_TO_CITY;
    }
    /** Places a chosen KC tile; returns Java's `undoAllowed` (false when it refills the cattle market). */
    deployKcTile(tile) {
        if ("worker" in tile) {
            const jm = this.state.jobMarket;
            if (!jm.isClosed()) {
                const fillCattle = jm.addWorker(tile.worker, this.state.playerOrder.length);
                if (fillCattle)
                    this.state.cattleMarket.fillUp(this.state.players.length);
                if (jm.isClosed()) {
                    this.currentPlayerState().jobMarketToken = true;
                    this.state.foresights.removeWorkers();
                }
                if (fillCattle)
                    return false;
            }
        }
        else if ("hazard" in tile) {
            this.placeHazardOnTrail(tile.hazard);
        }
        else if ("teepee" in tile) {
            this.placeTeepeeOnTrail(tile.teepee);
        }
        return true;
    }
    placeHazardOnTrail(hazard) {
        this.state.trail.placeHazard(hazard);
    }
    placeTeepeeOnTrail(teepee) {
        this.state.trail.placeTeepee(teepee);
    }
    deliverToCity(city, certificates) {
        const track = this.state.railroadTrack;
        const ps = this.currentPlayerState();
        const atKc = this.atKansasCity();
        if (atKc) {
            // Normal delivery: bank pays breeding value minus transport costs (+KC bonus).
            const breedingValue = ps.handValue() + certificates;
            if (breedingValue < CITY_INFO[city].value)
                throw new ROWException(ROWError.NOT_ENOUGH_BREEDING_VALUE);
            const transportCosts = track.transportCosts(this.currentPlayer, city);
            let payout = Math.max(0, breedingValue - transportCosts);
            if (city === City.KANSAS_CITY)
                payout += this.edition === Edition.FIRST ? 6 : 4;
            const tempCerts = Math.max(0, certificates - ps.permanentCertificates());
            if (tempCerts > 0)
                ps.spendTempCertificates(tempCerts);
            ps.gainDollars(payout);
        }
        else {
            // Extraordinary delivery (building 9A): the city value must fit the engine's backward move.
            if (CITY_INFO[city].value > ps.lastEngineMove)
                throw new ROWException(ROWError.CITY_VALUE_MUST_BE_LESS_THEN_OR_EQUAL_TO_SPACES_THAT_ENGINE_MOVED_BACKWARDS);
        }
        // Java's RailroadTrack.deliverToCity: on the active strip (or behind a branchlet) and not
        // delivered to yet, unless the city allows repeat deliveries.
        if (!track.canDeliver(this.currentPlayer, city)) {
            if (!track.isAccessibleCity(this.currentPlayer, city))
                throw new ROWException(ROWError.CITY_NOT_ACCESSIBLE);
            throw new ROWException(ROWError.ALREADY_DELIVERED_TO_CITY);
        }
        (track.cities[city] ?? (track.cities[city] = [])).push(this.currentPlayer);
        const immediate = this.removeDisc(CITY_INFO[city].discColors).concat(this.deliveryActions(city));
        if (atKc) {
            // Java: upgrade the simmentals in hand instead of discarding it, while any are left.
            const simmentals = ps.simmentalsToUpgrade();
            if (simmentals > 0)
                return immediate.concat([PossibleAction.repeat(0, simmentals, ActionType.UPGRADE_SIMMENTAL)]);
            ps.discardHand();
        }
        return immediate;
    }
    /**
     * Java's RailroadTrack.deliveryActions*: the paired-city bonus you get for having already
     * delivered to the partner city (an extra objective card, or an exchange token), plus the
     * Rails to the North big-town payouts. Part of the delivery's immediate actions, alongside
     * the disc removal.
     */
    deliveryActions(city) {
        const track = this.state.railroadTrack;
        const objectives = this.state.objectiveCards;
        const anyObjectives = objectives.available.length + objectives.drawStack.length > 0;
        const moreThanOneObjective = objectives.available.length > 1;
        const delivered = (partner) => track.hasMadeDelivery(this.currentPlayer, partner);
        const out = [];
        const takeObjectiveCard = (partner, partnerNeedsTwoCards) => {
            if (delivered(partner) && (partnerNeedsTwoCards ? moreThanOneObjective : anyObjectives))
                out.push(PossibleAction.mandatory(ActionType.TAKE_OBJECTIVE_CARD));
        };
        const gainExchangeToken = (partner) => {
            if (delivered(partner))
                out.push(PossibleAction.mandatory(ActionType.GAIN_EXCHANGE_TOKEN));
        };
        if (this.isRailsToTheNorth()) {
            switch (city) {
                case City.COLUMBIA:
                    gainExchangeToken(City.ST_LOUIS);
                    break;
                case City.ST_LOUIS:
                    gainExchangeToken(City.COLUMBIA);
                    break;
                case City.CHICAGO:
                    gainExchangeToken(City.DETROIT);
                    break;
                case City.DETROIT:
                    gainExchangeToken(City.CHICAGO);
                    if (anyObjectives)
                        out.push(PossibleAction.mandatory(ActionType.TAKE_OBJECTIVE_CARD));
                    break;
                case City.CLEVELAND:
                    takeObjectiveCard(City.PITTSBURGH);
                    break;
                case City.PITTSBURGH:
                    takeObjectiveCard(City.CLEVELAND);
                    break;
                case City.NEW_YORK_CITY:
                    if (track.bonusStationMasters.length > 0)
                        out.push(PossibleAction.mandatory(ActionType.TAKE_BONUS_STATION_MASTER));
                    break;
                case City.MEMPHIS:
                    this.currentPlayerState().gainDollars(2);
                    out.push(PossibleAction.mandatory(ActionType.TAKE_OBJECTIVE_CARD));
                    break;
                case City.MILWAUKEE:
                    this.currentPlayerState().gainDollars(3);
                    out.push(PossibleAction.mandatory(ActionType.TAKE_OBJECTIVE_CARD));
                    break;
            }
            return out;
        }
        if (this.edition === Edition.SECOND) {
            switch (city) {
                case City.FULTON:
                    takeObjectiveCard(City.ST_LOUIS);
                    break;
                case City.ST_LOUIS:
                    takeObjectiveCard(City.FULTON);
                    gainExchangeToken(City.BLOOMINGTON);
                    break;
                case City.BLOOMINGTON:
                    gainExchangeToken(City.ST_LOUIS);
                    takeObjectiveCard(City.PEORIA);
                    break;
                case City.CHICAGO_2:
                    takeObjectiveCard(City.PEORIA);
                    break;
                case City.PEORIA:
                    takeObjectiveCard(City.BLOOMINGTON);
                    takeObjectiveCard(City.CHICAGO_2, true);
                    break;
            }
            return out;
        }
        switch (city) {
            case City.TOPEKA:
                takeObjectiveCard(City.WICHITA);
                break;
            case City.WICHITA:
                takeObjectiveCard(City.TOPEKA);
                break;
            case City.COLORADO_SPRINGS:
            case City.ALBUQUERQUE:
                takeObjectiveCard(City.SANTA_FE);
                break;
            case City.SANTA_FE:
                takeObjectiveCard(City.COLORADO_SPRINGS);
                takeObjectiveCard(City.ALBUQUERQUE, true);
                break;
        }
        return out;
    }
    permanentCertificates(ps) {
        let perm = 0;
        if (ps.stationMasters.includes("PERM_CERT_POINTS_FOR_EACH_2_CERTS"))
            perm += 1;
        if (ps.stationMasters.includes("TWO_PERM_CERTS"))
            perm += 2;
        return perm;
    }
    unlockedSingleAuxiliaryActions(ps) {
        const actions = [PossibleAction.optionalAction(ActionType.GAIN_1_DOLLAR), PossibleAction.optionalAction(ActionType.DRAW_CARD)];
        if (ps.hasUnlocked(Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT))
            actions.push(PossibleAction.optionalAction(ActionType.PAY_1_DOLLAR_AND_MOVE_ENGINE_1_BACKWARDS_TO_GAIN_1_CERTIFICATE));
        if (ps.hasUnlocked(Unlockable.AUX_PAY_TO_MOVE_ENGINE_FORWARD))
            actions.push(PossibleAction.optionalAction(ActionType.PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD));
        if (ps.hasUnlocked(Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD)) {
            actions.push(PossibleAction.optionalAction(this.edition === Edition.SECOND ? ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR : ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD));
        }
        if (this.isRailsToTheNorth())
            actions.push(PossibleAction.optionalAction(ActionType.DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET));
        return actions;
    }
    unlockedSingleOrDoubleAuxiliaryActions(ps) {
        const actions = [];
        if (ps.hasUnlocked(Unlockable.AUX_GAIN_DOLLAR))
            actions.push(PossibleAction.optionalAction(ActionType.GAIN_1_DOLLAR));
        if (ps.hasAllUnlocked(Unlockable.AUX_GAIN_DOLLAR))
            actions.push(PossibleAction.optionalAction(ActionType.GAIN_2_DOLLARS));
        if (ps.hasAllUnlocked(Unlockable.AUX_DRAW_CARD_TO_DISCARD_CARD))
            actions.push(PossibleAction.choiceActions([ActionType.DRAW_CARD, ActionType.DRAW_2_CARDS]));
        else if (ps.hasUnlocked(Unlockable.AUX_DRAW_CARD_TO_DISCARD_CARD))
            actions.push(PossibleAction.optionalAction(ActionType.DRAW_CARD));
        if (ps.hasUnlocked(Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT))
            actions.push(PossibleAction.optionalAction(ActionType.PAY_1_DOLLAR_AND_MOVE_ENGINE_1_BACKWARDS_TO_GAIN_1_CERTIFICATE));
        if (ps.hasAllUnlocked(Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_GAIN_CERT))
            actions.push(PossibleAction.optionalAction(ActionType.PAY_2_DOLLARS_AND_MOVE_ENGINE_2_BACKWARDS_TO_GAIN_2_CERTIFICATES));
        if (ps.hasUnlocked(Unlockable.AUX_PAY_TO_MOVE_ENGINE_FORWARD))
            actions.push(PossibleAction.optionalAction(ActionType.PAY_1_DOLLAR_TO_MOVE_ENGINE_1_FORWARD));
        if (ps.hasAllUnlocked(Unlockable.AUX_PAY_TO_MOVE_ENGINE_FORWARD))
            actions.push(PossibleAction.optionalAction(ActionType.PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD));
        if (ps.hasUnlocked(Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD)) {
            actions.push(PossibleAction.optionalAction(this.edition === Edition.SECOND ? ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD_AND_GAIN_1_DOLLAR : ActionType.MOVE_ENGINE_1_BACKWARDS_TO_REMOVE_1_CARD));
        }
        if (ps.hasAllUnlocked(Unlockable.AUX_MOVE_ENGINE_BACKWARDS_TO_REMOVE_CARD)) {
            actions.push(PossibleAction.optionalAction(this.edition === Edition.SECOND ? ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS_AND_GAIN_2_DOLLARS : ActionType.MOVE_ENGINE_2_BACKWARDS_TO_REMOVE_2_CARDS));
        }
        if (this.isRailsToTheNorth()) {
            if (ps.hasAllUnlocked(Unlockable.AUX_DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET))
                actions.push(PossibleAction.repeat(0, 2, ActionType.DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET));
            else
                actions.push(PossibleAction.optionalAction(ActionType.DISCARD_CATTLE_CARD_TO_PLACE_BRANCHLET));
        }
        return actions;
    }
    /** ROW.removeDisc: returns the disc-removal immediate actions (unlock or station downgrade). */
    removeDisc(discColors) {
        const ps = this.currentPlayerState();
        const canRemove = (colors) => Object.values(Unlockable).some((u) => colors.includes(UNLOCKABLE_INFO[u].discColor) && ps.canUnlock(u, this.isRailsToTheNorth()));
        if (canRemove(discColors))
            return [PossibleAction.mandatory(discColors.includes(DiscColor.BLACK) ? ActionType.UNLOCK_BLACK_OR_WHITE : ActionType.UNLOCK_WHITE)];
        if (canRemove([DiscColor.BLACK]))
            return [PossibleAction.mandatory(ActionType.UNLOCK_BLACK_OR_WHITE)];
        if (this.state.railroadTrack.numberOfUpgradedStations(this.currentPlayer) > 0)
            return [PossibleAction.mandatory(ActionType.DOWNGRADE_STATION)];
        return [];
    }
    activateLocation(loc, adjacent = false) {
        const ps = this.currentPlayerState();
        if (loc.kind === "KANSAS_CITY")
            return this.kansasCityAction();
        if (loc.kind === "BUILDING") {
            const building = loc.building;
            const canUse = !!building && (adjacent || building.player === null || building.player === this.currentPlayer) && (this.edition === Edition.FIRST || !ps.hasUsedBuildingInTurn(loc.name));
            if (canUse && building) {
                ps.activate(loc.name);
                const localAction = building.player === null ? neutralBuildingAction(building.name, ps.getNumberOfCowboys()) : playerBuildingAction(building.name, this.edition, ps.getNumberOfCowboys());
                const hasSODA = localAction.canPerform(ActionType.SINGLE_OR_DOUBLE_AUXILIARY_ACTION);
                if (loc.riskAction) {
                    const withRisk = PossibleAction.any([localAction, PossibleAction.mandatory(loc.riskAction)]);
                    if (hasSODA)
                        return PossibleAction.optional(PossibleAction.choice([withRisk]));
                    // Java's choice(PossibleAction, Class...) wraps the class in Any([mandatory]);
                    // a bare mandatory here would make the option unskippable.
                    return PossibleAction.optional(PossibleAction.choice([withRisk, PossibleAction.optionalAction(ActionType.SINGLE_AUXILIARY_ACTION)]));
                }
                if (hasSODA)
                    return localAction;
                return PossibleAction.optional(PossibleAction.choice([localAction, PossibleAction.optionalAction(ActionType.SINGLE_AUXILIARY_ACTION)]));
            }
            ps.activate(loc.name);
            return PossibleAction.optionalAction(ActionType.SINGLE_AUXILIARY_ACTION);
        }
        return PossibleAction.optionalAction(ActionType.SINGLE_AUXILIARY_ACTION);
    }
    useAdjacentBuilding(locationName) {
        const ps = this.currentPlayerState();
        const current = ps.getLastActivatedLocation() ?? this.state.trail.currentLocation(this.currentPlayer);
        if (!current)
            throw new ROWException(ROWError.NOT_AT_LOCATION);
        if (!this.state.trail.getAdjacentLocations(current).includes(locationName))
            throw new ROWException(ROWError.LOCATION_NOT_ADJACENT);
        const loc = this.state.trail.getLocation(locationName);
        if (loc.isEmpty())
            throw new ROWException(ROWError.LOCATION_EMPTY);
        return { immediate: [], actions: [this.activateLocation(loc, true)], canUndo: true };
    }
    kansasCityAction() {
        const f = this.state.foresights;
        if (f.isEmpty(0)) {
            if (f.isEmpty(1)) {
                if (f.isEmpty(2))
                    return PossibleAction.mandatory(ActionType.DELIVER_TO_CITY);
                return PossibleAction.mandatory(ActionType.CHOOSE_FORESIGHT_3);
            }
            return PossibleAction.mandatory(ActionType.CHOOSE_FORESIGHT_2);
        }
        return PossibleAction.mandatory(ActionType.CHOOSE_FORESIGHT_1);
    }
    // ---- scoring ----
    scoreDetails(player) {
        const ps = this.playerState(player);
        const objectives = this.scoreObjectives(ps);
        const categories = {};
        categories[ScoreCategory.BID] = ps.bid ? -ps.bid.points : 0;
        categories[ScoreCategory.DOLLARS] = Math.floor(ps.balance / 5);
        categories[ScoreCategory.CATTLE_CARDS] = this.scoreCattleCards(ps);
        categories[ScoreCategory.OBJECTIVE_CARDS] = objectives.total;
        categories[ScoreCategory.STATION_MASTERS] = this.scoreStationMasters(ps, objectives.committedCount);
        categories[ScoreCategory.WORKERS] = Object.values(ps.workers).reduce((a, c) => a + (c === 6 ? 8 : c === 5 ? 4 : 0), 0);
        categories[ScoreCategory.HAZARDS] = ps.hazards.reduce((a, h) => a + h.points, 0);
        categories[ScoreCategory.EXTRA_STEP_POINTS] = ps.hasUnlocked(Unlockable.EXTRA_STEP_POINTS) ? 3 : 0;
        categories[ScoreCategory.JOB_MARKET_TOKEN] = ps.jobMarketToken ? 2 : 0;
        categories[ScoreCategory.BUILDINGS] = this.state.trail.scoreBuildings(player);
        categories[ScoreCategory.CITIES] = this.state.railroadTrack.scoreDeliveries(player, ps);
        categories[ScoreCategory.STATIONS] = this.state.railroadTrack.scoreStations(player);
        return categories;
    }
    getScore(player) {
        return Object.values(this.scoreDetails(player)).reduce((a, b) => a + (b ?? 0), 0);
    }
    scoreCattleCards(ps) {
        // Java collects the cards into an identity-based Set, so every copy counts.
        return [...ps.drawStack, ...ps.hand, ...ps.discardPile].filter(isCattleCard).reduce((sum, c) => sum + c.points, 0);
    }
    /**
     * Objective scoring, ported from ObjectiveCard.score (GPL-3.0, Tom Wetjens):
     * both committed and optional (in-hand) objectives are considered; a card is
     * scored if its tasks are met, otherwise the player may still "commit" to it
     * and take its penalty. Returns the best total plus the number of committed
     * cards (needed for the points-per-2-objectives station master).
     */
    scoreObjectives(ps) {
        const counts = this.objectiveCounts(ps);
        const committedIds = new Set(ps.objectives);
        const cards = [];
        for (const id of ps.objectives) {
            const def = OBJECTIVE_CARD_TYPES[id];
            if (def)
                cards.push({ def, committed: true });
        }
        for (const c of ps.hand) {
            if (isObjectiveCard(c) && !committedIds.has(c.id))
                cards.push({ def: c, committed: false });
        }
        cards.sort((a, b) => b.def.points - a.def.points);
        const results = this.scoreObjectiveCards(cards, 0, counts, 0, 0);
        const pairs3 = ps.stationMasters.includes("REMOVE_HAZARD_OR_TEEPEE_POINTS_FOR_EACH_2_OBJECTIVE_CARDS");
        let best = { total: 0, committedCount: 0 };
        let bestValue = -Infinity;
        for (const r of results) {
            const value = pairs3 ? r.total + Math.floor(r.committedCount / 2) * 3 : r.total;
            if (value > bestValue) {
                bestValue = value;
                best = r;
            }
        }
        return best;
    }
    scoreObjectiveCards(cards, index, counts, total, committedCount) {
        if (index >= cards.length)
            return [{ total, committedCount }];
        const { def, committed } = cards[index];
        const remaining = subtractObjectiveTasks(counts, def.tasks);
        if (objectiveCountsNegative(remaining)) {
            if (committed)
                return this.scoreObjectiveCards(cards, index + 1, counts, total - def.penalty, committedCount + 1);
            return [
                ...this.scoreObjectiveCards(cards, index + 1, counts, total, committedCount),
                ...this.scoreObjectiveCards(cards, index + 1, counts, total - def.penalty, committedCount + 1),
            ];
        }
        if (committed) {
            return [
                ...this.scoreObjectiveCards(cards, index + 1, remaining, total + def.points, committedCount + 1),
                ...this.scoreObjectiveCards(cards, index + 1, counts, total - def.penalty, committedCount + 1),
            ];
        }
        return [
            ...this.scoreObjectiveCards(cards, index + 1, counts, total, committedCount),
            ...this.scoreObjectiveCards(cards, index + 1, remaining, total + def.points, committedCount + 1),
        ];
    }
    objectiveCounts(ps) {
        const teepees = ps.teepees.length;
        const greenTeepees = ps.numberOfGreenTeepees();
        return {
            buildings: this.state.trail.numberOfBuildings(ps.player),
            greenTeepees,
            blueTeepees: teepees - greenTeepees,
            hazards: ps.numberOfHazards(),
            stations: this.state.railroadTrack.numberOfUpgradedStations(ps.player),
            breedingValue3: ps.numberOfCattleCards([CattleType.AYRSHIRE, CattleType.BROWN_SWISS, CattleType.HOLSTEIN]),
            breedingValue4: ps.numberOfCattleCards([CattleType.WEST_HIGHLAND]),
            breedingValue5: ps.numberOfCattleCards([CattleType.TEXAS_LONGHORN]),
            sanFrancisco: this.state.railroadTrack.numberOfDeliveries(ps.player, this.state.edition === Edition.SECOND ? City.NEW_YORK_CITY : City.SAN_FRANCISCO),
        };
    }
    scoreStationMasters(ps, committedCount) {
        let result = 0;
        if (ps.stationMasters.includes("GAIN_2_DOLLARS_POINT_FOR_EACH_WORKER"))
            result += ps.getNumberOfCowboys() + ps.getNumberOfCraftsmen() + ps.getNumberOfEngineers();
        if (ps.stationMasters.includes("REMOVE_HAZARD_OR_TEEPEE_POINTS_FOR_EACH_2_OBJECTIVE_CARDS"))
            result += Math.floor(committedCount / 2) * 3;
        if (ps.stationMasters.includes("PERM_CERT_POINTS_FOR_EACH_2_HAZARDS"))
            result += Math.floor(ps.hazards.length / 2) * 3;
        if (ps.stationMasters.includes("PERM_CERT_POINTS_FOR_TEEPEE_PAIRS"))
            result += ps.numberOfTeepeePairs() * 3;
        if (ps.stationMasters.includes("PERM_CERT_POINTS_FOR_EACH_2_CERTS"))
            result += Math.floor((ps.tempCertificates + ps.permanentCertificates()) / 2) * 3;
        if (ps.stationMasters.includes("PERM_CERT_POINTS_PER_2_STATIONS"))
            result += Math.floor(this.state.railroadTrack.numberOfUpgradedStations(ps.player) / 2) * 3;
        if (ps.stationMasters.includes("GAIN_2_CERTS_POINTS_PER_BUILDING"))
            result += this.state.trail.numberOfBuildings(ps.player) * 2;
        return result;
    }
    ranking() {
        return [...this.state.players]
            .map((p) => p.name)
            .sort((a, b) => {
            const diff = this.getScore(b) - this.getScore(a);
            if (diff !== 0)
                return diff;
            return this.playerState(b).balance - this.playerState(a).balance;
        });
    }
}
