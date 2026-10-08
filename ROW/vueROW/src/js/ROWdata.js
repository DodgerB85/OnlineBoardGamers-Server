/**
 * Static data transcribed from the Java engine constants
 * (PlayerBuilding, NeutralBuilding, ObjectiveCard.Type, City, RailroadTrack,
 * CattleMarket, JobMarket, KansasCitySupply, Trail).
 *
 * GPL-3.0, Copyright (C) 2021 Tom Wetjens.
 */
import { ActionType, CattleType, City, DiscColor, Edition, Hand, HazardType, PossibleAction, Task, Teepee, Worker } from "./ROWcore";
export const CITY_INFO = {
    [City.KANSAS_CITY]: { value: 0, discColors: [DiscColor.WHITE] },
    [City.TOPEKA]: { value: 1, discColors: [DiscColor.WHITE] },
    [City.WICHITA]: { value: 4, discColors: [DiscColor.WHITE] },
    [City.COLORADO_SPRINGS]: { value: 6, discColors: [DiscColor.WHITE] },
    [City.SANTA_FE]: { value: 8, discColors: [DiscColor.WHITE] },
    [City.ALBUQUERQUE]: { value: 10, discColors: [DiscColor.BLACK, DiscColor.WHITE] },
    [City.EL_PASO]: { value: 12, discColors: [DiscColor.BLACK, DiscColor.WHITE] },
    [City.SAN_DIEGO]: { value: 14, discColors: [DiscColor.WHITE] },
    [City.SACRAMENTO]: { value: 16, discColors: [DiscColor.BLACK, DiscColor.WHITE] },
    [City.SAN_FRANCISCO]: { value: 18, discColors: [DiscColor.BLACK, DiscColor.WHITE] },
    [City.FULTON]: { value: 1, discColors: [DiscColor.WHITE] },
    [City.BLOOMINGTON]: { value: 6, discColors: [DiscColor.WHITE] },
    [City.PEORIA]: { value: 8, discColors: [DiscColor.WHITE] },
    [City.CHICAGO_2]: { value: 10, discColors: [DiscColor.BLACK, DiscColor.WHITE] },
    [City.TOLEDO]: { value: 12, discColors: [DiscColor.BLACK, DiscColor.WHITE] },
    [City.PITTSBURGH_2]: { value: 14, discColors: [DiscColor.WHITE] },
    [City.PHILADELPHIA]: { value: 16, discColors: [DiscColor.BLACK, DiscColor.WHITE] },
    [City.COLUMBIA]: { value: 1, discColors: [DiscColor.WHITE] },
    [City.ST_LOUIS]: { value: 4, discColors: [DiscColor.WHITE] },
    [City.CHICAGO]: { value: 6, discColors: [DiscColor.WHITE] },
    [City.DETROIT]: { value: 10, discColors: [DiscColor.WHITE, DiscColor.BLACK] },
    [City.CLEVELAND]: { value: 12, discColors: [DiscColor.WHITE, DiscColor.BLACK] },
    [City.PITTSBURGH]: { value: 15, discColors: [DiscColor.WHITE] },
    [City.NEW_YORK_CITY]: { value: 18, discColors: [DiscColor.WHITE, DiscColor.BLACK] },
    [City.MEMPHIS]: { value: 3, discColors: [DiscColor.WHITE] },
    [City.DENVER]: { value: 8, discColors: [DiscColor.WHITE, DiscColor.BLACK] },
    [City.MILWAUKEE]: { value: 11, discColors: [DiscColor.WHITE, DiscColor.BLACK] },
    [City.GREEN_BAY]: { value: 12, discColors: [DiscColor.WHITE] },
    [City.MINNEAPOLIS]: { value: 13, discColors: [DiscColor.WHITE, DiscColor.BLACK] },
    [City.TORONTO]: { value: 14, discColors: [DiscColor.WHITE, DiscColor.BLACK] },
    [City.MONTREAL]: { value: 20, discColors: [DiscColor.WHITE, DiscColor.BLACK] },
};
export const ORIGINAL_CITY_STRIP = [
    City.KANSAS_CITY,
    City.TOPEKA,
    City.WICHITA,
    City.COLORADO_SPRINGS,
    City.SANTA_FE,
    City.ALBUQUERQUE,
    City.EL_PASO,
    City.SAN_DIEGO,
    City.SACRAMENTO,
    City.SAN_FRANCISCO,
];
export function cityStrip(edition, railsToTheNorth) {
    if (railsToTheNorth)
        return ORIGINAL_CITY_STRIP;
    return ORIGINAL_CITY_STRIP;
}
export const STATIONS = [
    { cost: 2, points: 1, discColors: [DiscColor.WHITE], space: "4.5" },
    { cost: 2, points: 1, discColors: [DiscColor.WHITE], space: "7.5" },
    { cost: 4, points: 2, discColors: [DiscColor.WHITE], space: "10.5" },
    { cost: 4, points: 2, discColors: [DiscColor.WHITE], space: "13.5" },
    { cost: 6, points: 3, discColors: [DiscColor.WHITE, DiscColor.BLACK], space: "16.5" },
    { cost: 8, points: 5, discColors: [DiscColor.WHITE, DiscColor.BLACK], space: "21.5" },
    { cost: 7, points: 6, discColors: [DiscColor.WHITE, DiscColor.BLACK], space: "25.5" },
    { cost: 6, points: 7, discColors: [DiscColor.WHITE, DiscColor.BLACK], space: "29.5" },
    { cost: 5, points: 8, discColors: [DiscColor.WHITE, DiscColor.BLACK], space: "33.5" },
    { cost: 3, points: 9, discColors: [DiscColor.WHITE, DiscColor.BLACK], space: "39" },
];
/** Signals between engine and a city value (RailroadTrack.SIGNALS + numberOfSignals). */
export const SIGNALS = [3, 4, 5, 7, 9, 10, 11, 13, 15, 16, 17];
export function numberOfSignals(number) {
    let count = 0;
    for (const s of SIGNALS) {
        if (s < number)
            count++;
        else
            break;
    }
    return count;
}
/** Turnout spaces (integer engine positions with a station). */
export const TURNOUT_SPACES = ["4.5", "7.5", "10.5", "13.5", "16.5", "21.5", "25.5", "29.5", "33.5"];
export const MAX_SPACE = 39;
// ---------------------------------------------------------------------------
// Station master tiles (StationMaster.java)
// ---------------------------------------------------------------------------
export const STATION_MASTERS_ORIGINAL = [
    "GAIN_2_DOLLARS_POINT_FOR_EACH_WORKER",
    "REMOVE_HAZARD_OR_TEEPEE_POINTS_FOR_EACH_2_OBJECTIVE_CARDS",
    "PERM_CERT_POINTS_FOR_EACH_2_HAZARDS",
    "PERM_CERT_POINTS_FOR_TEEPEE_PAIRS",
    "PERM_CERT_POINTS_FOR_EACH_2_CERTS",
];
export const STATION_MASTERS_PROMOS = ["TWO_PERM_CERTS", "TWELVE_DOLLARS"];
export const STATION_MASTERS_SECOND_EDITION = ["TWO_PERM_CERTS", "TWELVE_DOLLARS", "PERM_CERT_POINTS_PER_2_STATIONS", "GAIN_2_CERTS_POINTS_PER_BUILDING"];
// ---------------------------------------------------------------------------
// Job market
// ---------------------------------------------------------------------------
export const JOB_MARKET_COST = [6, 6, 7, 5, 7, 9, 6, 8, 10, 6, 5, 4];
export const JOB_MARKET_CATTLE = [6, 9];
export function initialWorkerCount(playerCount) {
    return playerCount === 2 ? 3 : playerCount * 2 - 1;
}
/** JobMarket.getInitialWorkerCount: tiles drawn from supply pile 1 at setup. */
export const jobMarketInitialWorkerCount = initialWorkerCount;
/** CattleMarket.COSTS keyed by breeding value. */
export const CATTLE_COSTS = {
    1: [],
    2: [
        { dollars: 8, cowboys: 1, pair: false },
        { dollars: 5, cowboys: 2, pair: false },
    ],
    3: [
        { dollars: 6, cowboys: 1, pair: false },
        { dollars: 3, cowboys: 2, pair: false },
        { dollars: 5, cowboys: 3, pair: true },
        { dollars: 12, cowboys: 2, pair: true },
        { dollars: 9, cowboys: 3, pair: true },
        { dollars: 6, cowboys: 4, pair: true },
    ],
    4: [
        { dollars: 12, cowboys: 1, pair: false },
        { dollars: 6, cowboys: 3, pair: false },
        { dollars: 8, cowboys: 5, pair: true },
        { dollars: 12, cowboys: 6, pair: true },
        { dollars: 24, cowboys: 2, pair: true },
        { dollars: 18, cowboys: 4, pair: true },
    ],
    5: [
        { dollars: 12, cowboys: 2, pair: false },
        { dollars: 6, cowboys: 4, pair: false },
        { dollars: 18, cowboys: 6, pair: true },
        { dollars: 24, cowboys: 4, pair: true },
    ],
};
export function createCattleSet(playerCount, simmental) {
    const cards = [];
    const a = playerCount === 4 ? 7 : playerCount === 3 ? 5 : 4;
    for (let i = 0; i < a; i++) {
        cards.push({ type: CattleType.HOLSTEIN, points: 1, value: 3 });
        cards.push({ type: CattleType.BROWN_SWISS, points: 2, value: 3 });
        cards.push({ type: CattleType.AYRSHIRE, points: 3, value: 3 });
    }
    const b = playerCount === 4 ? 3 : playerCount === 3 ? 2 : 1;
    for (let i = 0; i < b; i++)
        cards.push({ type: CattleType.WEST_HIGHLAND, points: 3, value: 4 });
    for (let i = 0; i < 3; i++)
        cards.push({ type: CattleType.WEST_HIGHLAND, points: 4, value: 4 });
    for (let i = 0; i < b; i++)
        cards.push({ type: CattleType.WEST_HIGHLAND, points: 5, value: 4 });
    const c = playerCount === 2 ? 1 : 2;
    for (let i = 0; i < c; i++)
        cards.push({ type: CattleType.TEXAS_LONGHORN, points: 5, value: 5 });
    for (let i = 0; i < (playerCount === 3 ? 1 : 2); i++)
        cards.push({ type: CattleType.TEXAS_LONGHORN, points: 6, value: 5 });
    for (let i = 0; i < c; i++)
        cards.push({ type: CattleType.TEXAS_LONGHORN, points: 7, value: 5 });
    if (simmental) {
        const s = playerCount === 4 ? 8 : playerCount === 3 ? 6 : 5;
        for (let i = 0; i < s; i++)
            cards.push({ type: CattleType.SIMMENTAL, points: 3, value: 2 });
    }
    return cards;
}
export function cattleMarketLimit(playerCount, simmental) {
    return simmental ? (playerCount === 2 ? 9 : playerCount === 3 ? 12 : 15) : playerCount === 2 ? 7 : playerCount === 3 ? 10 : 13;
}
export function createKcSet1() {
    const tiles = [];
    for (let i = 0; i < 9; i++)
        tiles.push({ teepee: Teepee.GREEN });
    for (let i = 0; i < 8; i++)
        tiles.push({ teepee: Teepee.BLUE });
    for (const type of [HazardType.FLOOD, HazardType.DROUGHT, HazardType.ROCKFALL]) {
        tiles.push({ hazard: { type, hand: Hand.BLACK, points: 3 } });
        tiles.push({ hazard: { type, hand: Hand.BLACK, points: 2 } });
        tiles.push({ hazard: { type, hand: Hand.GREEN, points: 4 } });
        tiles.push({ hazard: { type, hand: Hand.GREEN, points: 4 } });
        tiles.push({ hazard: { type, hand: Hand.GREEN, points: 3 } });
        tiles.push({ hazard: { type, hand: Hand.GREEN, points: 2 } });
    }
    return tiles;
}
export function createKcSet2() {
    const tiles = [];
    for (const w of [Worker.COWBOY, Worker.CRAFTSMAN, Worker.ENGINEER])
        for (let i = 0; i < 11; i++)
            tiles.push({ worker: w });
    return tiles;
}
export function createKcSet3() {
    const tiles = [];
    for (const w of [Worker.COWBOY, Worker.CRAFTSMAN, Worker.ENGINEER])
        for (let i = 0; i < 7; i++)
            tiles.push({ worker: w });
    for (let i = 0; i < 2; i++)
        tiles.push({ teepee: Teepee.GREEN });
    for (let i = 0; i < 3; i++)
        tiles.push({ teepee: Teepee.BLUE });
    return tiles;
}
/**
 * FIRST edition trail graph. Built exactly as Trail.java wires it, except the
 * negative teepee locations, which the Java source creates as graph orphans
 * (kept here for completeness / trade reference).
 */
export function buildTrailNodes(edition) {
    const nodes = [];
    const add = (n) => nodes.push(n);
    add({ name: "KANSAS_CITY", kind: "KANSAS_CITY", next: [] });
    add({ name: "START", kind: "START", next: ["A"] });
    add({ name: "G-1", kind: "BUILDING", next: ["KANSAS_CITY"] });
    add({ name: "G-2", kind: "BUILDING", next: ["KANSAS_CITY"] });
    add({ name: "G", kind: "BUILDING", next: ["G-1", "G-2"] });
    add({ name: "F-1", kind: "BUILDING", next: ["G"] });
    add({ name: "F-2", kind: "BUILDING", next: ["G"], inWoods: true });
    add({ name: "F", kind: "BUILDING", next: ["F-1", "F-2"] });
    add({ name: "ROCKFALL-RISK-2", kind: "BUILDING", next: ["F"], inWoods: true, riskAction: ActionType.DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE_AND_2_DOLLARS });
    add({ name: "ROCKFALL-RISK-1", kind: "BUILDING", next: ["ROCKFALL-RISK-2"], riskAction: ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE });
    add({ name: "ROCKFALL-4", kind: "HAZARD", next: ["ROCKFALL-RISK-1"], hazardPoints: 4 });
    add({ name: "ROCKFALL-3", kind: "HAZARD", next: ["ROCKFALL-4"], hazardPoints: 3 });
    add({ name: "ROCKFALL-2", kind: "HAZARD", next: ["ROCKFALL-3"], hazardPoints: 2 });
    add({ name: "ROCKFALL-1", kind: "HAZARD", next: ["ROCKFALL-2"], hazardPoints: 1 });
    add({ name: "E-2", kind: "BUILDING", next: ["F"], inWoods: true });
    add({ name: "E-1", kind: "BUILDING", next: ["E-2"], inWoods: true });
    add({ name: "E", kind: "BUILDING", next: ["E-1", "ROCKFALL-1"] });
    add({ name: "INDIAN-TRADE-RISK-2", kind: "BUILDING", next: ["E"], riskAction: ActionType.DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE_AND_2_DOLLARS });
    add({ name: "INDIAN-TRADE-RISK-1", kind: "BUILDING", next: ["INDIAN-TRADE-RISK-2"], riskAction: ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE });
    const teepeeReward = (n) => {
        if (edition === Edition.FIRST)
            return n;
        const map = { 10: 10, 8: 8, 6: 6, 4: 5, 2: 4, 1: 3, [-3]: 2, [-2]: 1, [-1]: 0 };
        return map[n];
    };
    add({ name: "TEEPEE-10", kind: "TEEPEE", next: ["INDIAN-TRADE-RISK-1"], reward: teepeeReward(10) });
    add({ name: "TEEPEE-8", kind: "TEEPEE", next: ["TEEPEE-10"], reward: teepeeReward(8) });
    add({ name: "TEEPEE-6", kind: "TEEPEE", next: ["TEEPEE-8"], reward: teepeeReward(6) });
    add({ name: "TEEPEE-4", kind: "TEEPEE", next: ["TEEPEE-6"], reward: teepeeReward(4) });
    add({ name: "TEEPEE-2", kind: "TEEPEE", next: ["TEEPEE-4"], reward: teepeeReward(2) });
    add({ name: "TEEPEE-1", kind: "TEEPEE", next: ["TEEPEE-2"], reward: teepeeReward(1) });
    add({ name: "TEEPEE--3", kind: "TEEPEE", next: [], reward: teepeeReward(-3) });
    add({ name: "TEEPEE--2", kind: "TEEPEE", next: [], reward: teepeeReward(-2) });
    add({ name: "TEEPEE--1", kind: "TEEPEE", next: [], reward: teepeeReward(-1) });
    add({ name: "C-1-2", kind: "BUILDING", next: ["E"], inWoods: true });
    add({ name: "C-1-1", kind: "BUILDING", next: ["C-1-2"], inWoods: true });
    if (edition === Edition.FIRST) {
        add({ name: "D", kind: "BUILDING", next: ["E"] });
        add({ name: "C-2", kind: "BUILDING", next: ["D", "TEEPEE-1"] });
        add({ name: "C", kind: "BUILDING", next: ["C-1-1", "C-2"] });
    }
    else {
        add({ name: "D-1", kind: "BUILDING", next: ["E"] });
        add({ name: "D", kind: "BUILDING", next: ["D-1", "TEEPEE-1"] });
        add({ name: "C", kind: "BUILDING", next: ["C-1-1", "D"] });
    }
    add({ name: "DROUGHT-RISK-1", kind: "BUILDING", next: ["C"], riskAction: ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE });
    add({ name: "DROUGHT-4", kind: "HAZARD", next: ["DROUGHT-RISK-1"], hazardPoints: 4 });
    add({ name: "DROUGHT-3", kind: "HAZARD", next: ["DROUGHT-4"], hazardPoints: 3 });
    add({ name: "DROUGHT-2", kind: "HAZARD", next: ["DROUGHT-3"], hazardPoints: 2 });
    add({ name: "DROUGHT-1", kind: "HAZARD", next: ["DROUGHT-2"], hazardPoints: 1 });
    add({ name: "B-3", kind: "BUILDING", next: ["C"] });
    add({ name: "B-2", kind: "BUILDING", next: ["B-3"] });
    add({ name: "B-1", kind: "BUILDING", next: ["B-2"], inWoods: true });
    add({ name: "B", kind: "BUILDING", next: ["DROUGHT-1", "B-1"] });
    add({ name: "FLOOD-RISK-2", kind: "BUILDING", next: ["B"], inWoods: true, riskAction: ActionType.DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE_AND_2_DOLLARS });
    add({ name: "FLOOD-RISK-1", kind: "BUILDING", next: ["FLOOD-RISK-2"], riskAction: edition === Edition.FIRST ? ActionType.DISCARD_1_JERSEY_TO_GAIN_1_CERTIFICATE_AND_2_DOLLARS : ActionType.DISCARD_1_CATTLE_CARD_TO_GAIN_1_CERTIFICATE });
    add({ name: "FLOOD-4", kind: "HAZARD", next: ["FLOOD-RISK-1"], hazardPoints: 4 });
    add({ name: "FLOOD-3", kind: "HAZARD", next: ["FLOOD-4"], hazardPoints: 3 });
    add({ name: "FLOOD-2", kind: "HAZARD", next: ["FLOOD-3"], hazardPoints: 2 });
    add({ name: "FLOOD-1", kind: "HAZARD", next: ["FLOOD-2"], hazardPoints: 1 });
    add({ name: "A-3", kind: "BUILDING", next: ["B"] });
    add({ name: "A-2", kind: "BUILDING", next: ["A-3"] });
    add({ name: "A-1", kind: "BUILDING", next: ["A-2"] });
    add({ name: "A", kind: "BUILDING", next: ["A-1", "FLOOD-1"] });
    return nodes;
}
export const NEUTRAL_BUILDING_LOCATIONS = ["A", "B", "C", "D", "E", "F", "G"];
const PB = (name, hand, craftsmen, points) => ({
    name,
    number: parseInt(name, 10),
    side: name.endsWith("a") ? "a" : "b",
    hand,
    craftsmen,
    points,
});
export const PLAYER_BUILDINGS = {
    "1a": PB("1a", Hand.GREEN, 1, 1),
    "2a": PB("2a", Hand.NONE, 1, 1),
    "3a": PB("3a", Hand.NONE, 1, 1),
    "4a": PB("4a", Hand.BLACK, 2, 3),
    "5a": PB("5a", Hand.NONE, 3, 4),
    "6a": PB("6a", Hand.NONE, 4, 5),
    "7a": PB("7a", Hand.BOTH, 5, 6),
    "8a": PB("8a", Hand.GREEN, 5, 6),
    "9a": PB("9a", Hand.NONE, 7, 9),
    "10a": PB("10a", Hand.BLACK, 9, 13),
    "1b": PB("1b", Hand.GREEN, 1, 1),
    "2b": PB("2b", Hand.NONE, 1, 1),
    "3b": PB("3b", Hand.NONE, 2, 3),
    "4b": PB("4b", Hand.BLACK, 2, 3),
    "5b": PB("5b", Hand.NONE, 3, 4),
    "6b": PB("6b", Hand.NONE, 4, 5),
    "7b": PB("7b", Hand.BOTH, 5, 6),
    "8b": PB("8b", Hand.NONE, 6, 8),
    "9b": PB("9b", Hand.NONE, 6, 8),
    "10b": PB("10b", Hand.BLACK, 8, 11),
    "11a": PB("11a", Hand.NONE, 12, 25),
    "11b": PB("11b", Hand.NONE, 5, 10),
    "12a": PB("12a", Hand.NONE, 3, 4),
    "12b": PB("12b", Hand.NONE, 3, 4),
    "13a": PB("13a", Hand.GREEN, 4, 5),
    "13b": PB("13b", Hand.NONE, 2, 4),
};
/** Buildings available for the given edition + options (BuildingSet.buildingsForOptions). */
export function buildingNumbersForOptions(edition, opts) {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    if (opts.railsToTheNorth) {
        numbers.push(11, 12);
    }
    else if (edition === Edition.SECOND || opts.building11) {
        numbers.push(11);
    }
    if (edition === Edition.SECOND || opts.building13)
        numbers.push(13);
    return numbers;
}
/** Neutral building local actions (NeutralBuilding A-G). */
export function neutralBuildingAction(name, cowboys) {
    switch (name) {
        case "A":
            return PossibleAction.anyActions([ActionType.DISCARD_1_GUERNSEY, ActionType.HIRE_WORKER, ActionType.HIRE_WORKER_PLUS_2]);
        case "B":
            return PossibleAction.anyActions([ActionType.DISCARD_1_DUTCH_BELT_TO_GAIN_2_DOLLARS, ActionType.PLACE_BUILDING]);
        case "C":
            return PossibleAction.any([
                PossibleAction.choiceActions([ActionType.GAIN_1_CERTIFICATE, ActionType.TAKE_OBJECTIVE_CARD]),
                PossibleAction.mandatory(ActionType.MOVE_ENGINE_FORWARD),
            ]);
        case "D":
            return PossibleAction.any([
                PossibleAction.choiceActions([ActionType.TRADE_WITH_TRIBES, ActionType.PAY_2_DOLLARS_TO_MOVE_ENGINE_2_FORWARD]),
                PossibleAction.mandatory(ActionType.SINGLE_OR_DOUBLE_AUXILIARY_ACTION),
            ]);
        case "E":
            return PossibleAction.any([
                PossibleAction.optionalAction(ActionType.DISCARD_1_BLACK_ANGUS_TO_GAIN_2_DOLLARS),
                PossibleAction.repeat(0, cowboys, ActionType.BUY_CATTLE),
                PossibleAction.repeat(0, cowboys, ActionType.DRAW_2_CATTLE_CARDS),
            ]);
        case "F":
            return PossibleAction.anyActions([ActionType.DISCARD_PAIR_TO_GAIN_4_DOLLARS, ActionType.REMOVE_HAZARD]);
        case "G":
            return PossibleAction.anyActions([ActionType.MOVE_ENGINE_FORWARD, ActionType.SINGLE_OR_DOUBLE_AUXILIARY_ACTION]);
        default:
            return PossibleAction.anyActions([]);
    }
}
/**
 * Player building local actions (PlayerBuilding subclasses). First-edition
 * behaviour per the Java source. Bespoke actions not yet ported are marked
 * via the returned action set; the engine refuses unported commands.
 */
export function playerBuildingAction(name, edition, cowboys) {
    const A = ActionType;
    switch (name) {
        case "1a":
            return PossibleAction.optionalAction(A.GAIN_2_DOLLARS_PER_BUILDING_IN_WOODS);
        case "1b":
            return PossibleAction.anyActions([A.DISCARD_1_OBJECTIVE_CARD_TO_GAIN_2_CERTIFICATES, A.MOVE_ENGINE_1_BACKWARDS_TO_GAIN_3_DOLLARS]);
        case "2a":
            return PossibleAction.any([PossibleAction.optionalAction(A.DISCARD_1_GUERNSEY_TO_GAIN_4_DOLLARS), PossibleAction.repeat(0, cowboys, A.BUY_CATTLE), PossibleAction.repeat(0, cowboys, A.DRAW_2_CATTLE_CARDS)]);
        case "2b":
            return edition === Edition.SECOND
                ? PossibleAction.anyActions([A.DISCARD_1_JERSEY_TO_GAIN_2_DOLLARS, A.DISCARD_1_DUTCH_BELT_TO_MOVE_ENGINE_2_FORWARD])
                : PossibleAction.anyActions([A.DISCARD_1_JERSEY_TO_MOVE_ENGINE_1_FORWARD, A.DISCARD_1_DUTCH_BELT_TO_GAIN_3_DOLLARS]);
        case "3a":
            return PossibleAction.anyActions([A.DISCARD_PAIR_TO_GAIN_3_DOLLARS, A.MOVE_1_FORWARD]);
        case "3b":
            return PossibleAction.anyActions([A.SINGLE_OR_DOUBLE_AUXILIARY_ACTION, A.MOVE_1_FORWARD]);
        case "4a":
            return PossibleAction.anyActions([A.REMOVE_HAZARD_FOR_5_DOLLARS, A.MOVE_2_FORWARD]);
        case "4b": {
            const choices = [PossibleAction.optionalAction(A.DRAW_CARD)];
            if (cowboys > 1)
                choices.push(PossibleAction.optionalAction(A.DRAW_2_CARDS));
            if (cowboys > 2)
                choices.push(PossibleAction.optionalAction(A.DRAW_3_CARDS));
            if (cowboys > 3)
                choices.push(PossibleAction.optionalAction(A.DRAW_4_CARDS));
            if (cowboys > 4)
                choices.push(PossibleAction.optionalAction(A.DRAW_5_CARDS));
            if (cowboys > 5)
                choices.push(PossibleAction.optionalAction(A.DRAW_6_CARDS));
            return PossibleAction.any([PossibleAction.choice(choices), PossibleAction.mandatory(A.MOVE_3_FORWARD)]);
        }
        case "5a":
            return edition === Edition.SECOND ? PossibleAction.anyActions([A.DISCARD_CATTLE_CARD_TO_GAIN_7_DOLLARS, A.SINGLE_OR_DOUBLE_AUXILIARY_ACTION]) : PossibleAction.anyActions([A.HIRE_WORKER_MINUS_1, A.MOVE_ENGINE_FORWARD]);
        case "5b":
            return PossibleAction.anyActions([A.DISCARD_1_BLACK_ANGUS_TO_GAIN_2_CERTIFICATES, A.GAIN_1_DOLLAR_PER_ENGINEER]);
        case "6a":
            return edition === Edition.SECOND ? PossibleAction.anyActions([A.HIRE_WORKER_MINUS_1, A.MOVE_ENGINE_FORWARD]) : PossibleAction.anyActions([A.DISCARD_1_HOLSTEIN_TO_GAIN_10_DOLLARS, A.SINGLE_OR_DOUBLE_AUXILIARY_ACTION]);
        case "6b":
            return edition === Edition.SECOND ? PossibleAction.optionalAction(A.USE_ADJACENT_BUILDING) : PossibleAction.optionalAction(A.DISCARD_1_CATTLE_CARD_TO_GAIN_3_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND);
        case "7a":
            return PossibleAction.optionalAction(A.GAIN_2_CERTIFICATES_AND_2_DOLLARS_PER_TEEPEE_PAIR);
        case "7b":
            return PossibleAction.optionalAction(A.MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_BUILDINGS_IN_WOODS);
        case "8a":
            return PossibleAction.any([PossibleAction.choiceActions([A.TRADE_WITH_TRIBES, A.SINGLE_OR_DOUBLE_AUXILIARY_ACTION]), PossibleAction.mandatory(A.MOVE_ENGINE_AT_MOST_2_FORWARD)]);
        case "8b":
            return edition === Edition.SECOND ? PossibleAction.optionalAction(A.DISCARD_1_CATTLE_CARD_TO_GAIN_6_DOLLARS_AND_ADD_1_OBJECTIVE_CARD_TO_HAND) : PossibleAction.optionalAction(A.USE_ADJACENT_BUILDING);
        case "9a":
            return PossibleAction.anyActions([A.MOVE_ENGINE_AT_MOST_3_FORWARD, A.EXTRAORDINARY_DELIVERY]);
        case "9b":
            return PossibleAction.optionalAction(A.UPGRADE_ANY_STATION_BEHIND_ENGINE);
        case "10a":
            return PossibleAction.anyActions([A.MAX_CERTIFICATES, A.MOVE_5_FORWARD]);
        case "10b":
            return PossibleAction.anyActions([A.GAIN_4_DOLLARS, A.MOVE_ENGINE_AT_MOST_4_FORWARD, A.MOVE_4_FORWARD]);
        case "11a":
            return edition === Edition.SECOND ? PossibleAction.repeat(0, 2, A.REMOVE_HAZARD_FOR_2_DOLLARS) : PossibleAction.optionalAction(A.REMOVE_HAZARD_FOR_2_DOLLARS);
        case "11b":
            return PossibleAction.optionalAction(A.MOVE_ENGINE_FORWARD_UP_TO_NUMBER_OF_HAZARDS);
        case "12a":
            return PossibleAction.optionalAction(A.GAIN_1_CERTIFICATE_AND_1_DOLLAR_PER_BELL);
        case "12b":
            return PossibleAction.anyActions([A.GAIN_1_DOLLAR_PER_CRAFTSMAN, A.PLACE_BRANCHLET]);
        case "13a":
            return edition === Edition.SECOND ? PossibleAction.anyActions([A.GAIN_1_DOLLAR_PER_CRAFTSMAN, A.MOVE_1_FORWARD]) : PossibleAction.anyActions([A.DISCARD_1_JERSEY_FOR_SINGLE_AUXILIARY_ACTION, A.PLACE_CHEAP_BUILDING]);
        case "13b":
            return edition === Edition.SECOND ? PossibleAction.anyActions([A.GAIN_2_DOLLARS_PER_STATION, A.GAIN_EXCHANGE_TOKEN]) : PossibleAction.anyActions([A.GAIN_2_DOLLARS_PER_STATION, A.SINGLE_OR_DOUBLE_AUXILIARY_ACTION]);
        default:
            return PossibleAction.anyActions([]);
    }
}
// ---------------------------------------------------------------------------
// Objective cards (ObjectiveCard.Type)
// ---------------------------------------------------------------------------
const oc = (id, tasks, points, penalty, action) => ({ id, tasks, points, penalty, action });
export const OBJECTIVE_CARD_TYPES = {
    START_34B: oc("START_34B", [Task.BREEDING_VALUE_3, Task.BREEDING_VALUE_4, Task.BUILDING], 3, 0, null),
    START_SSG: oc("START_SSG", [Task.STATION, Task.STATION, Task.GREEN_TEEPEE], 3, 0, null),
    START_BBH: oc("START_BBH", [Task.BUILDING, Task.BUILDING, Task.HAZARD], 3, 0, null),
    START_BLHH: oc("START_BLHH", [Task.BLUE_TEEPEE, Task.HAZARD, Task.HAZARD], 3, 0, null),
    GAIN2_BBLBL: oc("GAIN2_BBLBL", [Task.BUILDING, Task.BLUE_TEEPEE, Task.BLUE_TEEPEE], 3, 2, ActionType.GAIN_2_DOLLARS),
    GAIN2_BGBL: oc("GAIN2_BGBL", [Task.BUILDING, Task.GREEN_TEEPEE, Task.BLUE_TEEPEE], 3, 2, ActionType.GAIN_2_DOLLARS),
    GAIN2_4HH: oc("GAIN2_4HH", [Task.BREEDING_VALUE_4, Task.HAZARD, Task.HAZARD], 3, 2, ActionType.GAIN_2_DOLLARS),
    GAIN2_SSH: oc("GAIN2_SSH", [Task.STATION, Task.STATION, Task.HAZARD], 3, 2, ActionType.GAIN_2_DOLLARS),
    GAIN2_333B: oc("GAIN2_333B", [Task.BREEDING_VALUE_3, Task.BREEDING_VALUE_3, Task.BREEDING_VALUE_3, Task.BUILDING], 4, 2, ActionType.GAIN_2_DOLLARS),
    AUX_SF: oc("AUX_SF", [Task.SAN_FRANCISCO], 5, 3, ActionType.SINGLE_OR_DOUBLE_AUXILIARY_ACTION),
    DRAW_BBH: oc("DRAW_BBH", [Task.BUILDING, Task.BUILDING, Task.HAZARD], 3, 2, ActionType.DRAW_3_CARDS),
    DRAW_SGBL: oc("DRAW_SGBL", [Task.STATION, Task.GREEN_TEEPEE, Task.BLUE_TEEPEE], 3, 2, ActionType.DRAW_3_CARDS),
    DRAW_5H: oc("DRAW_5H", [Task.BREEDING_VALUE_5, Task.HAZARD], 3, 2, ActionType.DRAW_3_CARDS),
    DRAW_SGG: oc("DRAW_SGG", [Task.STATION, Task.GREEN_TEEPEE, Task.GREEN_TEEPEE], 3, 2, ActionType.DRAW_3_CARDS),
    DRAW_333S: oc("DRAW_333S", [Task.BREEDING_VALUE_3, Task.BREEDING_VALUE_3, Task.BREEDING_VALUE_3, Task.STATION], 4, 2, ActionType.DRAW_3_CARDS),
    ENGINE_44SG: oc("ENGINE_44SG", [Task.BREEDING_VALUE_4, Task.BREEDING_VALUE_4, Task.STATION, Task.GREEN_TEEPEE], 5, 3, ActionType.MOVE_ENGINE_AT_MOST_2_FORWARD),
    ENGINE_345: oc("ENGINE_345", [Task.BREEDING_VALUE_3, Task.BREEDING_VALUE_4, Task.BREEDING_VALUE_5], 5, 3, ActionType.MOVE_ENGINE_AT_MOST_2_FORWARD),
    ENGINE_BBGG: oc("ENGINE_BBGG", [Task.BUILDING, Task.BUILDING, Task.GREEN_TEEPEE, Task.GREEN_TEEPEE], 5, 3, ActionType.MOVE_ENGINE_AT_MOST_2_FORWARD),
    ENGINE_BBLHH: oc("ENGINE_BBLHH", [Task.BUILDING, Task.BLUE_TEEPEE, Task.HAZARD, Task.HAZARD], 5, 3, ActionType.MOVE_ENGINE_AT_MOST_3_FORWARD),
    ENGINE_SSHH: oc("ENGINE_SSHH", [Task.STATION, Task.STATION, Task.HAZARD, Task.HAZARD], 5, 3, ActionType.MOVE_ENGINE_AT_MOST_3_FORWARD),
    MOVE_BBHH: oc("MOVE_BBHH", [Task.BUILDING, Task.BUILDING, Task.HAZARD, Task.HAZARD], 5, 2, ActionType.MOVE_3_FORWARD_WITHOUT_FEES),
    MOVE_SSBLBL: oc("MOVE_SSBLBL", [Task.STATION, Task.STATION, Task.BLUE_TEEPEE, Task.BLUE_TEEPEE], 5, 2, ActionType.MOVE_3_FORWARD_WITHOUT_FEES),
    MOVE_345: oc("MOVE_345", [Task.BREEDING_VALUE_3, Task.BREEDING_VALUE_4, Task.BREEDING_VALUE_5], 5, 2, ActionType.MOVE_3_FORWARD_WITHOUT_FEES),
    MOVE_34HH: oc("MOVE_34HH", [Task.BREEDING_VALUE_3, Task.BREEDING_VALUE_4, Task.HAZARD, Task.HAZARD], 5, 2, ActionType.MOVE_3_FORWARD_WITHOUT_FEES),
    MOVE_SSBB: oc("MOVE_SSBB", [Task.STATION, Task.STATION, Task.BUILDING, Task.BUILDING], 5, 2, ActionType.MOVE_3_FORWARD_WITHOUT_FEES),
};
export const OBJECTIVE_DRAW_STACK = [
    "GAIN2_4HH",
    "GAIN2_BGBL",
    "GAIN2_SSH",
    "GAIN2_333B",
    "GAIN2_BBLBL",
    "AUX_SF",
    "AUX_SF",
    "AUX_SF",
    "AUX_SF",
    "DRAW_5H",
    "DRAW_333S",
    "DRAW_BBH",
    "DRAW_SGBL",
    "DRAW_SGG",
    "ENGINE_44SG",
    "ENGINE_345",
    "ENGINE_BBGG",
    "ENGINE_BBLHH",
    "ENGINE_SSHH",
    "MOVE_34HH",
    "MOVE_345",
    "MOVE_BBHH",
    "MOVE_SSBB",
    "MOVE_SSBLBL",
];
export const STARTING_OBJECTIVE_IDS = ["START_34B", "START_BBH", "START_BLHH", "START_SSG"];
// Re-export commonly used enums for convenience.
export { ActionType, CattleType, City, DiscColor, Edition, Hand, HazardType, Task, Teepee, Worker };
