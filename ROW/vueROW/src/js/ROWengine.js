/**
 * Great Western Trail - game engine.
 *
 * Faithful port of the core of `com.boardgamefiesta.row.logic` (GPL-3.0,
 * Copyright (C) 2021 Tom Wetjens). Framework-free; the Vue layer owns a single
 * Game instance inside the Pinia store.
 *
 * Scope of this port (first playable): First edition, 2-4 players, the main turn
 * loop, trail movement + tolls, neutral/private building activation, hiring,
 * buying cattle, the Kansas City subphases, station upgrades, auxiliary actions,
 * end-of-game scoring. Actions that are not yet ported throw
 * ROWError.NOT_IMPLEMENTED rather than guessing.
 */
import { ActionStack, ActionType, CattleType, City, DiscColor, Edition, ROWError, ROWException, Hand, HazardType, PossibleAction, ScoreCategory, Status, Task, Teepee, Unlockable, UNLOCKABLE_INFO, Worker, handFee, isCattleCard, isObjectiveCard, shuffle, } from "./ROWcore";
import { buildTrailNodes, buildingNumbersForOptions, CATTLE_COSTS, STATION_MASTERS_ORIGINAL, STATION_MASTERS_PROMOS, STATION_MASTERS_SECOND_EDITION, CITY_INFO, cattleMarketLimit, createCattleSet, createKcSet1, createKcSet2, createKcSet3, jobMarketInitialWorkerCount, JOB_MARKET_CATTLE, JOB_MARKET_COST, NEUTRAL_BUILDING_LOCATIONS, neutralBuildingAction, numberOfSignals, OBJECTIVE_CARD_TYPES, OBJECTIVE_DRAW_STACK, PLAYER_BUILDINGS, playerBuildingAction, STATIONS, STARTING_OBJECTIVE_IDS, } from "./ROWdata";
const clone = (v) => JSON.parse(JSON.stringify(v));
/** Certificate track steps (PlayerState.CERTIFICATE_STEPS). */
const CERTIFICATE_STEPS = [0, 1, 2, 3, 4, 6];
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
        this.lastEngineMove = 0;
        this.lastUpgradedStation = null;
        this.discs = 12; // placement discs remaining (14 total, 2 start removed); simplified
        this.player = player;
        for (const u of Object.values(Unlockable))
            this.unlocked[u] = 0;
        // Gain $1 and draw-a-card are already unlocked once at setup: they are
        // usable in SINGLE_OR_DOUBLE auxiliary actions from the start, and the
        // player board only shows their remaining (second) upgrade disc.
        this.unlocked[Unlockable.AUX_GAIN_DOLLAR] = 1;
        this.unlocked[Unlockable.AUX_DRAW_CARD_TO_DISCARD_CARD] = 1;
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
        const idx = this.hand.indexOf(card);
        if (idx < 0)
            throw new ROWException(ROWError.CARD_NOT_IN_HAND);
        this.hand.splice(idx, 1);
        this.discardPile.unshift(card);
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
            for (const pile of [this.hand, this.discardPile, this.drawStack]) {
                const idx = pile.indexOf(card);
                if (idx >= 0) {
                    pile.splice(idx, 1);
                    break;
                }
            }
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
        return 0;
    }
    getLastActivatedLocation() {
        return this.locationsActivatedInTurn.length > 0 ? this.locationsActivatedInTurn[this.locationsActivatedInTurn.length - 1] : null;
    }
    simmentalsToUpgrade() {
        return 0;
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
    possibleMovesFrom(player, balance, stepLimit, playerCount) {
        const from = this.currentLocation(player);
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
    init(playerCount, rng) {
        const set = createCattleSet(playerCount, this.simmental);
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
        const idx = this.market.indexOf(card);
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
    init(playerCount, rng) {
        const p1 = createKcSet1();
        const p2 = createKcSet2();
        const p3 = createKcSet3();
        shuffle(p1, rng);
        shuffle(p2, rng);
        shuffle(p3, rng);
        if (playerCount === 3) {
            // balanced variant: remove some tiles (KansasCitySupply.balanced)
            removeTeepees(p1, Teepee.BLUE, 1);
            removeTeepees(p1, Teepee.GREEN, 2);
            removeHazardsWithPointsAndHand(p1, 1, 3, Hand.GREEN);
            removeWorkers(p2, 3);
            removeTeepees(p3, Teepee.BLUE, 1);
            removeWorkers(p3, 1);
        }
        else if (playerCount === 2) {
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
        const idx = this.available.indexOf(card);
        if (idx < 0)
            throw new ROWException(ROWError.OBJECTIVE_CARD_NOT_AVAILABLE);
        this.available.splice(idx, 1);
        this.fill();
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
    constructor() {
        this.players = {};
        this.cities = {};
        this.stations = [];
        this.stationMasters = [];
    }
    init(players) {
        for (const p of players) {
            this.players[p] = "0";
            this.cities[p] = [];
        }
        this.cities = {};
        for (const city of Object.keys(CITY_INFO))
            this.cities[city] = [];
        this.stations = STATIONS.map((s) => ({ ...s, upgradedBy: [], stationMaster: null, worker: null }));
        this.stationMasters = STATIONS.map(() => null);
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
    reachable(from, atLeast, atMost, direction) {
        // Linear numeric track: 0..39 plus half-turnouts.
        const result = new Set();
        const isTurnout = (n) => !Number.isInteger(n);
        const consider = (pos, steps) => {
            if (pos < 0 || pos > STATIONS.length)
                return;
            // convert to space name
        };
        // Build candidate spaces between from and to.
        const start = parseFloat(from);
        const fromInt = Math.floor(start);
        const isFromTurnout = !Number.isInteger(start);
        let steps = 0;
        let current = fromInt;
        const spaces = [];
        const allSpaces = [];
        for (let i = 0; i <= 39; i++)
            allSpaces.push(String(i));
        for (const t of ["4.5", "7.5", "10.5", "13.5", "16.5", "21.5", "25.5", "29.5", "33.5"])
            allSpaces.push(t);
        void allSpaces;
        // Simplified: enumerate integer positions as steps; turnouts are 1 step too.
        const candidates = [];
        // forward
        if (direction === 1) {
            steps = 0;
            current = fromInt;
            // if starting on a turnout, first step is the next integer
            if (isFromTurnout) {
                steps = 1;
                current = fromInt + 1;
            }
            else {
                current = fromInt;
            }
            for (let n = current + (isFromTurnout ? 0 : 1); n <= 39; n++) {
                steps = isFromTurnout ? current - fromInt + (n - current) : n - fromInt;
                candidates.push({ name: String(n), steps });
                const turnout = `${n}.5`;
                if (["4", "7", "10", "13", "16", "21", "25", "29", "33"].includes(String(n))) {
                    candidates.push({ name: turnout, steps: steps + 1 });
                }
            }
        }
        else {
            steps = 0;
            current = fromInt;
            if (isFromTurnout) {
                steps = 1;
                current = fromInt;
            }
            for (let n = fromInt - (isFromTurnout ? 0 : 1); n >= 0; n--) {
                steps = isFromTurnout ? fromInt - n + 1 : fromInt - n;
                candidates.push({ name: String(n), steps });
                if (["4", "7", "10", "13", "16", "21", "25", "29", "33"].includes(String(n))) {
                    candidates.push({ name: `${n}.5`, steps: steps + 1 });
                }
            }
        }
        for (const c of candidates) {
            if (c.steps >= atLeast && c.steps <= atMost) {
                // Cannot land on an occupied space (other than self).
                const occupied = Object.entries(this.players).some(([p, sp]) => sp === c.name);
                if (!occupied)
                    result.add(c.name);
            }
        }
        return result;
    }
    reachableSpacesForward(from, atLeast, atMost) {
        return this.reachable(from, atLeast, atMost, 1);
    }
    reachableSpacesBackwards(from, atLeast, atMost) {
        return this.reachable(from, atLeast, atMost, -1);
    }
    moveEngineForward(player, to, atLeast, atMost) {
        const from = this.currentSpace(player);
        const reachable = this.reachableSpacesForward(from, atLeast, atMost);
        if (!reachable.has(to))
            throw new ROWException(ROWError.SPACE_NOT_REACHABLE);
        if (Object.entries(this.players).some(([p, sp]) => p !== player && sp === to))
            throw new ROWException(ROWError.ALREADY_PLAYER_ON_SPACE);
        this.players[player] = to;
        return this.stationUpgradeImmediate(player, to);
    }
    moveEngineBackwards(player, to, atLeast, atMost) {
        const from = this.currentSpace(player);
        const reachable = this.reachableSpacesBackwards(from, atLeast, atMost);
        if (!reachable.has(to))
            throw new ROWException(ROWError.SPACE_NOT_REACHABLE);
        if (Object.entries(this.players).some(([p, sp]) => p !== player && sp === to))
            throw new ROWException(ROWError.ALREADY_PLAYER_ON_SPACE);
        this.players[player] = to;
        return this.stationUpgradeImmediate(player, to);
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
            if (!this.cities[city])
                continue;
            const value = CITY_INFO[city].value;
            if (value > handValue)
                continue;
            if (this.cities[city].includes(player) && city !== City.KANSAS_CITY && city !== City.SAN_FRANCISCO)
                continue;
            const certificates = Math.max(0, value - handValue);
            const reward = handValue - Math.max(0, numberOfSignals(value) - passed);
            void extraCertificates;
            out.push({ city, certificates, reward });
        }
        return out;
    }
    numberOfUpgradedStations(player) {
        return this.stations.filter((s) => s.upgradedBy.includes(player)).length;
    }
    numberOfDeliveries(player, city) {
        return (this.cities[city] ?? []).filter((p) => p === player).length;
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
    scoreDeliveries(player) {
        let total = 0;
        for (const [city, players] of Object.entries(this.cities)) {
            const count = players.filter((p) => p === player).length;
            if (count === 0)
                continue;
            const value = CITY_INFO[city].value;
            total += players.indexOf(player) === 0 ? value : -value;
            void count;
        }
        return total;
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
        const railroad = new RailroadTrack();
        railroad.init(players.map((p) => p.name));
        // Station master tiles: shuffled pile dealt onto the first five stations.
        const masterPile = [...STATION_MASTERS_ORIGINAL];
        if (options.edition === Edition.SECOND)
            masterPile.push(...STATION_MASTERS_SECOND_EDITION);
        else if (options.stationMasterPromos)
            masterPile.push(...STATION_MASTERS_PROMOS);
        shuffle(masterPile, rng);
        for (let i = 0; i < 5 && i < railroad.stations.length; i++)
            railroad.stations[i].stationMaster = masterPile[i];
        railroad.stationMasters = masterPile.slice(5);
        const jobMarket = new JobMarket();
        const cattleMarket = new CattleMarket(options.simmental);
        cattleMarket.init(players.length, rng);
        const kcSupply = new KansasCitySupply();
        kcSupply.init(players.length, rng);
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
            status: Status.STARTED,
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
            startingObjectiveCards: [],
            actionStack: ActionStack.initial([]),
            canUndo: false,
        });
        // GWT.start: starting balances, committed objectives, second-edition overdraws.
        playerOrder.forEach((name, i) => {
            const ps = playerStates[name];
            ps.gainDollars(6 + i);
            const objective = startingObjectiveCards[i];
            if (objective)
                ps.objectives.push(objective.id);
            if (options.edition === Edition.SECOND && i > 0)
                ps.drawCards(i, rng);
        });
        game.beginTurn();
        return game;
    }
    // ---- turn flow (ROW.determineBeginTurnActions) ----
    beginTurn() {
        const ps = this.currentPlayerState();
        ps.numberOfCowboysUsedInTurn = 0;
        ps.locationsActivatedInTurn = [];
        const actions = [];
        const handLimit = ps.getHandLimit();
        if (ps.hand.length > handLimit) {
            actions.push(PossibleAction.repeat(ps.hand.length - handLimit, ps.hand.length - handLimit, ActionType.DISCARD_CARD));
        }
        actions.push(PossibleAction.mandatory(ActionType.MOVE));
        this.state.actionStack = ActionStack.initial(actions);
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
        const out = [];
        for (const city of Object.keys(CITY_INFO)) {
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
        // Objective cards may be played at allowed windows.
        if (this.canPlayObjectiveCard())
            set.add(ActionType.PLAY_OBJECTIVE_CARD);
        return set;
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
        if (this.state.actionStack.canPerform(ActionType.UPGRADE_SIMMENTAL))
            this.currentPlayerState().discardHand();
        this.state.actionStack.skip();
    }
    endTurn(player, rng) {
        if (this.isEnded())
            throw new ROWException(ROWError.GAME_ENDED);
        if (player && player !== this.currentPlayer)
            throw new ROWException(ROWError.NOT_CURRENT_PLAYER);
        const ps = this.currentPlayerState();
        if (this.state.actionStack.canPerform(ActionType.UPGRADE_SIMMENTAL))
            ps.discardHand();
        this.state.actionStack.skipAll();
        ps.drawUpToHandLimit(rng);
        if (this.state.trail.atKansasCity(this.currentPlayer))
            this.state.trail.moveToStart(this.currentPlayer);
        this.state.canUndo = false;
        this.afterEndTurn();
    }
    getNextPlayer() {
        const order = this.state.playerOrder;
        const idx = order.indexOf(this.currentPlayer);
        return order[(idx + 1) % order.length];
    }
    afterEndTurn() {
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
        const anytime = type === ActionType.PLAY_OBJECTIVE_CARD;
        // Work on a clone of the action queue so a rejected action leaves the turn untouched.
        const originalStack = this.state.actionStack;
        const stack = originalStack.clone();
        this.state.actionStack = stack;
        try {
            if (!anytime) {
                if (!stack.canPerform(type))
                    throw new ROWException(ROWError.CANNOT_PERFORM_ACTION);
                stack.perform(type);
            }
            const result = this.execute(action, rng);
            if (!result)
                return;
            if (Array.isArray(result)) {
                if (result.length > 0)
                    stack.addActions(result);
                return;
            }
            stack.addImmediateActions(result.immediate);
            stack.addActions(result.actions);
            this.state.canUndo = result.canUndo;
        }
        catch (e) {
            this.state.actionStack = originalStack;
            throw e;
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
                const atMost = action.type === ActionType.MOVE_1_FORWARD ? 1
                    : action.type === ActionType.MOVE_2_FORWARD ? 2
                        : action.type === ActionType.MOVE_3_FORWARD ? 3
                            : action.type === ActionType.MOVE_4_FORWARD ? 4
                                : action.type === ActionType.MOVE_5_FORWARD ? 5
                                    : action.type === ActionType.MOVE_3_FORWARD_WITHOUT_FEES ? 3
                                        : null;
                return this.doMove(action.steps, atMost, action.type !== ActionType.MOVE_3_FORWARD_WITHOUT_FEES);
            }
            case ActionType.PLACE_BID:
                throw new ROWException(ROWError.NOT_IMPLEMENTED);
            case ActionType.DISCARD_CARD: {
                const card = action.card;
                if (!card)
                    throw new ROWException(ROWError.CARD_NOT_IN_HAND);
                ps.discardCard(card);
                return null;
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
                return { immediate: [], actions: this.hireWorker(action.row, action.worker, 0), canUndo: true };
            case ActionType.HIRE_WORKER_PLUS_2:
                return { immediate: [], actions: this.hireWorker(action.row, action.worker, 2), canUndo: true };
            case ActionType.HIRE_WORKER_MINUS_1:
                return { immediate: [], actions: this.hireWorker(action.row, action.worker, -1), canUndo: true };
            case ActionType.HIRE_WORKER_MINUS_2:
                return { immediate: [], actions: this.hireWorker(action.row, action.worker, -2), canUndo: true };
            case ActionType.TAKE_OBJECTIVE_CARD: {
                const requested = action.objectiveCard;
                const chosen = requested ?? this.state.objectiveCards.draw();
                if (requested)
                    this.state.objectiveCards.remove(requested);
                ps.gainCard(chosen);
                return null;
            }
            case ActionType.ADD_1_OBJECTIVE_CARD_TO_HAND: {
                const requested = action.objectiveCard;
                const chosen = requested ?? this.state.objectiveCards.draw();
                if (requested)
                    this.state.objectiveCards.remove(requested);
                ps.addCardToHand(chosen);
                return null;
            }
            case ActionType.PLAY_OBJECTIVE_CARD: {
                const card = action.objectiveCard;
                const idx = ps.hand.indexOf(card);
                if (idx < 0)
                    throw new ROWException(ROWError.CARD_NOT_IN_HAND);
                ps.hand.splice(idx, 1);
                ps.objectives.push(card.id);
                return { immediate: card.action ? [PossibleAction.mandatory(card.action)] : [], actions: [], canUndo: true };
            }
            case ActionType.CHOOSE_FORESIGHT_1:
                return { immediate: [], actions: [this.chooseForesight(0, action.choice, rng)], canUndo: true };
            case ActionType.CHOOSE_FORESIGHT_2:
                return { immediate: [], actions: [this.chooseForesight(1, action.choice, rng)], canUndo: true };
            case ActionType.CHOOSE_FORESIGHT_3:
                return { immediate: [], actions: [this.chooseForesight(2, action.choice, rng)], canUndo: true };
            case ActionType.DELIVER_TO_CITY: {
                return { immediate: this.deliverToCity(action.city, action.certificates ?? 0), actions: [], canUndo: true };
            }
            case ActionType.BUY_CATTLE: {
                const requested = action.cattleCards ?? [];
                const market = this.state.cattleMarket.market;
                const cards = requested.map((req) => {
                    const idx = market.findIndex((m) => m.type === req.type && m.points === req.points && (req.value === undefined || m.value === req.value));
                    if (idx < 0)
                        throw new ROWException(ROWError.CATTLE_CARD_NOT_AVAILABLE);
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
                return this.unlockedSingleAuxiliaryActions(ps);
            case ActionType.SINGLE_OR_DOUBLE_AUXILIARY_ACTION:
                return this.unlockedSingleOrDoubleAuxiliaryActions(ps);
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
                const from = this.state.railroadTrack.currentSpace(this.currentPlayer);
                const immediate = this.state.railroadTrack.moveEngineBackwards(this.currentPlayer, action.to, action.type === ActionType.MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS ? 1 : 1, action.type === ActionType.MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS ? 1 : Number.MAX_SAFE_INTEGER);
                if (action.type === ActionType.MOVE_ENGINE_AT_LEAST_1_BACKWARDS_AND_GAIN_3_DOLLARS)
                    ps.lastEngineMove = this.spaceDistance(from, action.to);
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
                const from = this.state.railroadTrack.currentSpace(this.currentPlayer);
                const immediate = this.state.railroadTrack.moveEngineBackwards(this.currentPlayer, action.to, 1, Number.MAX_SAFE_INTEGER);
                ps.lastEngineMove = this.engineDistanceNotCountingTurnouts(from, action.to);
                return { immediate: [PossibleAction.mandatory(ActionType.DELIVER_TO_CITY), ...immediate], actions: [], canUndo: true };
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
            case ActionType.USE_ADJACENT_BUILDING:
                return this.useAdjacentBuilding(action.location);
            case ActionType.UNLOCK_WHITE:
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
    spaceDistance(from, to) {
        return Math.abs(Math.round(parseFloat(from) - parseFloat(to)));
    }
    /** Distance in engine steps, ignoring turnouts (ExtraordinaryDelivery). */
    engineDistanceNotCountingTurnouts(from, to) {
        return Math.max(1, Math.abs(Math.floor(parseFloat(from)) - Math.floor(parseFloat(to))) + 1);
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
        station.upgradedBy.push(this.currentPlayer);
        ps.lastUpgradedStation = stationIndex;
        ps.discs = Math.max(0, ps.discs - 1);
        return station.stationMaster ? [PossibleAction.optionalAction(ActionType.APPOINT_STATION_MASTER)] : [];
    }
    appointStationMaster(worker) {
        const ps = this.currentPlayerState();
        const stationIndex = ps.lastUpgradedStation ?? this.stationAtCurrentSpace();
        if (stationIndex === null)
            throw new ROWException(ROWError.NOT_AT_STATION);
        const station = this.state.railroadTrack.stations[stationIndex];
        if (!station.stationMaster)
            throw new ROWException(ROWError.CANNOT_PERFORM_ACTION);
        if (ps.workers[worker] <= 0)
            throw new ROWException(ROWError.NOT_ENOUGH_WORKERS);
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
        if (tile)
            this.deployKcTile(tile);
        return PossibleAction.mandatory(this.nextForesightAction(column));
    }
    nextForesightAction(column) {
        if (column === 0)
            return this.state.foresights.isEmpty(1) ? this.nextForesightAction(1) : ActionType.CHOOSE_FORESIGHT_2;
        if (column === 1)
            return this.state.foresights.isEmpty(2) ? this.nextForesightAction(2) : ActionType.CHOOSE_FORESIGHT_3;
        return ActionType.DELIVER_TO_CITY;
    }
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
            }
        }
        else if ("hazard" in tile) {
            this.placeHazardOnTrail(tile.hazard);
        }
        else if ("teepee" in tile) {
            this.placeTeepeeOnTrail(tile.teepee);
        }
    }
    placeHazardOnTrail(hazard) {
        this.state.trail.placeHazard(hazard);
    }
    placeTeepeeOnTrail(teepee) {
        this.state.trail.placeTeepee(teepee);
    }
    deliverToCity(city, certificates) {
        var _a;
        const ps = this.currentPlayerState();
        if (this.atKansasCity()) {
            // Normal delivery: bank pays breeding value minus transport costs (+KC bonus).
            const breedingValue = ps.handValue() + certificates;
            if (breedingValue < CITY_INFO[city].value)
                throw new ROWException(ROWError.NOT_ENOUGH_BREEDING_VALUE);
            const transportCosts = this.state.railroadTrack.transportCosts(this.currentPlayer, city);
            let payout = Math.max(0, breedingValue - transportCosts);
            if (city === City.KANSAS_CITY)
                payout += this.edition === Edition.FIRST ? 6 : 4;
            const tempCerts = Math.max(0, certificates - ps.permanentCertificates());
            if (tempCerts > 0)
                ps.spendTempCertificates(tempCerts);
            ps.gainDollars(payout);
            ps.discardHand();
        }
        else {
            // Extraordinary delivery (building 9A): the city value must fit the engine's backward move.
            if (CITY_INFO[city].value > ps.lastEngineMove)
                throw new ROWException(ROWError.CITY_VALUE_MUST_BE_LESS_THEN_OR_EQUAL_TO_SPACES_THAT_ENGINE_MOVED_BACKWARDS);
        }
        const delivered = ((_a = this.state.railroadTrack.cities)[city] ?? (_a[city] = []));
        if (delivered.includes(this.currentPlayer) && city !== City.KANSAS_CITY && city !== City.SAN_FRANCISCO && !this.isRailsToTheNorth()) {
            throw new ROWException(ROWError.ALREADY_DELIVERED_TO_CITY);
        }
        delivered.push(this.currentPlayer);
        return this.removeDisc(CITY_INFO[city].discColors);
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
                    return PossibleAction.optional(PossibleAction.choice([withRisk, PossibleAction.mandatory(ActionType.SINGLE_AUXILIARY_ACTION)]));
                }
                if (hasSODA)
                    return localAction;
                return PossibleAction.optional(PossibleAction.choice([localAction, PossibleAction.mandatory(ActionType.SINGLE_AUXILIARY_ACTION)]));
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
        categories[ScoreCategory.CITIES] = this.state.railroadTrack.scoreDeliveries(player);
        categories[ScoreCategory.STATIONS] = this.state.railroadTrack.scoreStations(player);
        return categories;
    }
    getScore(player) {
        return Object.values(this.scoreDetails(player)).reduce((a, b) => a + (b ?? 0), 0);
    }
    scoreCattleCards(ps) {
        const all = [...ps.drawStack, ...ps.hand, ...ps.discardPile].filter(isCattleCard);
        const seen = new Set();
        let points = 0;
        for (const c of all) {
            const key = `${c.type}:${c.points}:${c.value}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            points += c.points;
        }
        return points;
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
