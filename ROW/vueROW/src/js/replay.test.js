import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ActionStack, CATTLE_DEFAULT_VALUE, OBJECTIVE_CARD_TYPES, STATIONS, PossibleAction, RecordingRandom, ActionType, deserializeGame, serializeGame } from "./ROWindex";
/**
 * Real replay audit: every Java fixture's `initialState` is hydrated into our
 * engine, each recorded command is executed through `Game.perform`, and the
 * resulting state is compared against the recorded `expectedState`. This is
 * the test that actually proves rule parity (fixtures.test.ts only proved
 * the RNG tape).
 */
function camelToAction(name) {
    const snake = name
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/([a-z])(\d)/g, "$1_$2")
        .replace(/(\d)([A-Z])/g, "$1_$2")
        .toUpperCase();
    if (!(snake in ActionType))
        throw new Error(`Unmapped action name: ${name} -> ${snake}`);
    return snake;
}
function importPossibleAction(j) {
    const key = Object.keys(j)[0];
    const v = j[key];
    switch (key) {
        case "mandatory":
            return PossibleAction.mandatory(camelToAction(v.action));
        case "any":
            return PossibleAction.any((v.actions || []).map(importPossibleAction));
        case "optional":
            return PossibleAction.optional(importPossibleAction(v));
        case "repeat": {
            const inner = v.repeatingAction?.any?.actions?.[0] ?? v.repeatingAction?.mandatory;
            const name = inner?.action;
            if (!name)
                throw new Error("Unsupported repeat shape: " + JSON.stringify(v));
            return PossibleAction.repeat(v.atLeast, v.atMost, camelToAction(name));
        }
        case "choice":
            return PossibleAction.choice((v.actions || []).map(importPossibleAction));
        default:
            throw new Error("Unsupported possible-action key: " + key);
    }
}
function importStack(j) {
    return new ActionStack((j?.actions || []).map(importPossibleAction), (j?.immediateActions || []).map(importPossibleAction));
}
/** Java's CattleCard JSON omits the derived breeding value; hydrate it. */
function fixCard(c) {
    // Objective cards inside a pile serialize as their bare type id ("DRAW_SGG"); expand them to
    // the object form ROW keeps in hand/discard/draw piles.
    if (typeof c === "string")
        return OBJECTIVE_CARD_TYPES[c] ?? c;
    if (c && typeof c === "object" && "type" in c && "points" in c && c.value === undefined && CATTLE_DEFAULT_VALUE[c.type] !== undefined) {
        return { ...c, value: CATTLE_DEFAULT_VALUE[c.type] };
    }
    return c;
}
const fixCards = (arr) => (Array.isArray(arr) ? arr.map(fixCard) : arr);
/**
 * Java omits `player` entirely on neutral buildings (`{"name":"G"}`), while ROW always keeps it as
 * null or a player name and compares with `=== null` throughout the engine. Normalising both sides
 * here is what keeps `canUse`, `payFees`, `placeBuilding` and the state diff in agreement.
 */
function normaliseTrail(trail) {
    if (!trail?.locations) return trail;
    const locations = {};
    for (const [name, loc] of Object.entries(trail.locations)) {
        locations[name] = loc?.building
            ? { ...loc, building: { ...loc.building, player: loc.building.player ?? null } }
            : loc;
    }
    return { ...trail, locations };
}
/** Map a Java-serialized state onto our SerializedGame field set. */
function toOurs(s) {
    if (!s)
        return s;
    const colorToName = {};
    for (const p of s.players ?? [])
        colorToName[p.color] = p.name;
    const playerStates = {};
    for (const [name, p] of Object.entries(s.playerStates ?? {})) {
        playerStates[name] = {
            player: name,
            drawStack: fixCards(p.drawStack ?? []),
            hand: fixCards(p.hand ?? []),
            discardPile: fixCards(p.discardPile ?? []),
            workers: p.workers ?? {},
            buildings: p.buildings ?? [],
            unlocked: p.unlocked ?? {},
            objectives: p.objectives ?? [],
            stationMasters: p.stationMasters ?? [],
            teepees: p.teepees ?? [],
            hazards: p.hazards ?? [],
            bid: p.bid ?? null,
            tempCertificates: p.tempCertificates ?? 0,
            balance: p.balance ?? 0,
            jobMarketToken: p.jobMarketToken ?? false,
            numberOfCowboysUsedInTurn: p.usedCowboys ?? 0,
            locationsActivatedInTurn: p.locationsActivatedInTurn ?? [],
            lastEngineMove: p.lastEngineMove ?? 0,
            lastUpgradedStation: p.lastUpgradedStation ?? -1,
            exchangeTokens: p.exchangeTokens ?? 1,
            branchlets: p.branchlets ?? 15,
            lastPlacedBranchlet: p.lastPlacedBranchlet ?? null,
        };
    }
    const rt = s.railroadTrack ?? {};
    return {
        v: 1,
        edition: s.edition,
        options: {
            edition: s.edition,
            mode: s.mode ?? "ORIGINAL",
            buildings: "RANDOMIZED",
            playerOrder: "FIXED",
            variant: "ORIGINAL",
            simmental: !!s.cattleMarket?.simmental,
            stationMasterPromos: false,
            building11: false,
            building13: false,
            railsToTheNorth: !!s.railsToTheNorth,
        },
        status: s.status,
        players: s.players,
        playerOrder: s.playerOrder,
        currentPlayer: s.currentPlayer,
        playerStates,
        trail: normaliseTrail(s.trail),
        railroadTrack: {
            players: rt.currentSpaces ?? {},
            cities: rt.cities ?? {},
            branchlets: rt.branchlets ?? {},
            mediumTownTiles: rt.mediumTownTiles ?? {},
            bonusStationMasters: rt.bonusStationMasters ?? [],
            // Java only serializes the mutable part of a station; the printed cost/points/space
            // come from our own table, keyed by station index.
            stations: (rt.stations ?? []).map((st, i) => ({
                ...STATIONS[i],
                upgradedBy: (st.players ?? []).map((c) => colorToName[c] ?? c),
                stationMaster: st.stationMaster ?? null,
                worker: st.worker ?? null,
            })),
        },
        jobMarket: s.jobMarket,
        cattleMarket: s.cattleMarket,
        kcSupply: { piles: s.kansasCitySupply?.drawPiles ?? [[], [], []] },
        foresights: s.foresights,
        objectiveCards: s.objectiveCards,
        startingObjectiveCards: s.startingObjectiveCards,
        canUndo: s.canUndo ?? false,
    };
}
function stable(v) {
    if (Array.isArray(v))
        return v.map(stable);
    if (v && typeof v === "object") {
        const out = {};
        for (const k of Object.keys(v).sort())
            out[k] = stable(v[k]);
        return out;
    }
    return v;
}
const CARDS = (a, b) => JSON.stringify(stable(a)).localeCompare(JSON.stringify(stable(b)));
/** Canonical comparable subset: drops fields our engine does not model (options, discs, empty trail spots). */
function canon(s) {
    const o = JSON.parse(JSON.stringify(s));
    delete o.options;
    // The action stack is serialized separately from the game state (Java shape),
    // so it isn't part of the compared state subset.
    delete o.actionStack;
    delete o.rngState;
    for (const ps of Object.values(o.playerStates ?? {})) {
        delete ps.discs;
        ps.hand = [...(ps.hand ?? [])].sort(CARDS);
        ps.buildings = [...(ps.buildings ?? [])].sort();
        ps.objectives = [...(ps.objectives ?? [])].sort();
        ps.stationMasters = [...(ps.stationMasters ?? [])].sort();
        ps.teepees = [...(ps.teepees ?? [])].sort();
        ps.hazards = [...(ps.hazards ?? [])].sort(CARDS);
        ps.locationsActivatedInTurn = [...(ps.locationsActivatedInTurn ?? [])].sort();
        if (ps.bid && typeof ps.bid === "object")
            ps.bid = stable(ps.bid);
    }
    // stations: compare just the mutable bits (cost/points live in our own data tables)
    if (o.railroadTrack) {
        o.railroadTrack.stations = (o.railroadTrack.stations ?? []).map((st) => ({
            upgradedBy: [...(st.upgradedBy ?? [])].sort(),
            stationMaster: st.stationMaster ?? null,
            worker: st.worker ?? null,
        }));
        for (const key of Object.keys(o.railroadTrack.cities ?? {}))
            o.railroadTrack.cities[key] = [...o.railroadTrack.cities[key]].sort();
    }
    // trail: strip null fields and fully-empty locations (Java omits them, we serialize all)
    if (o.trail?.locations) {
        const locs = {};
        for (const [name, data] of Object.entries(o.trail.locations)) {
            const kept = {};
            for (const k of ["building", "teepee", "hazard"])
                if (data[k])
                    kept[k] = stable(data[k]);
            if (Object.keys(kept).length)
                locs[name] = kept;
        }
        o.trail.locations = locs;
    }
    if (o.objectiveCards) {
        o.objectiveCards.available = [...(o.objectiveCards.available ?? [])].sort();
    }
    return stable(o);
}
function diff(a, b, path = "") {
    if (Object.is(a, b))
        return [];
    if (Array.isArray(a) && Array.isArray(b)) {
        const out = [];
        if (a.length !== b.length)
            out.push(`${path}: length ${a.length} != ${b.length}`);
        for (let i = 0; i < Math.min(a.length, b.length); i++)
            out.push(...diff(a[i], b[i], `${path}[${i}]`));
        return out;
    }
    if (a && b && typeof a === "object" && typeof b === "object") {
        const out = [];
        for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
            out.push(...diff(a[k], b[k], path ? `${path}.${k}` : k));
        return out;
    }
    const short = (v) => JSON.stringify(v)?.slice(0, 90);
    return [`${path}: got ${short(a)} want ${short(b)}`];
}
/**
 * Normalise one action-stack node from either engine into a single comparable tree.
 *
 * Java writes `{"mandatory":{"action":"Move"}}` with camel-case class names; ROW writes
 * `{"kind":"mandatory","action":"MOVE"}` with ActionType constants. Comparing these raw is what
 * the old `delete o.actionStack` sidestepped — and it hid every stack divergence, so a build
 * mistake only surfaced much later as a misleading CANNOT_PERFORM_ACTION.
 */
function asActionType(name) {
    if (name == null) return null;
    try {
        return camelToAction(name);
    } catch {
        return name;
    }
}
/**
 * Java builds some `choice` collections from a `HashSet` (see
 * PlayerState.unlockedSingleAuxiliaryActions), whose iteration order depends on identity hash codes
 * and is not stable between JVM runs. A choice means "perform exactly one of these", so child order
 * carries no meaning — sort it out of the comparison.
 */
function choiceChildren(nodes) {
    return [...nodes].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
function canonStackNode(node) {
    if (node == null) return null;
    if (Array.isArray(node)) return node.map(canonStackNode);
    // ROW shape, keyed by `kind`.
    if (node.kind) {
        switch (node.kind) {
            case "mandatory":
                return { t: "mandatory", a: node.action ?? null };
            case "any":
                return { t: node.kind, c: (node.actions ?? []).map(canonStackNode) };
            case "choice":
                return { t: node.kind, c: choiceChildren((node.actions ?? []).map(canonStackNode)) };
            case "repeat":
                return { t: "repeat", atLeast: node.atLeast, atMost: node.atMost, r: canonStackNode(node.repeatingAction), cur: canonStackNode(node.current) };
            case "whenThen":
                return { t: "whenThen", atLeast: node.atLeast, atMost: node.atMost, when: node.when ?? null, then: node.then ?? null, thens: node.thens ?? 0, cur: canonStackNode(node.current) };
            default:
                return { t: node.kind };
        }
    }
    // Java shape, keyed by a single nested object.
    if ("mandatory" in node) return { t: "mandatory", a: asActionType(node.mandatory?.action) };
    if ("any" in node) return { t: "any", c: (node.any?.actions ?? []).map(canonStackNode) };
    if ("choice" in node) return { t: "choice", c: choiceChildren((node.choice?.actions ?? []).map(canonStackNode)) };
    if ("repeat" in node) {
        const r = node.repeat ?? {};
        return { t: "repeat", atLeast: r.atLeast, atMost: r.atMost, r: canonStackNode(r.repeatingAction), cur: canonStackNode(r.current) };
    }
    if ("whenThen" in node) {
        const w = node.whenThen ?? {};
        return { t: "whenThen", atLeast: w.atLeast, atMost: w.atMost, when: asActionType(w.when), then: asActionType(w.then), thens: w.thens ?? 0, cur: canonStackNode(w.current) };
    }
    return { t: "?", raw: node };
}
/** Normalise a whole action stack (the `{actions, immediateActions}` wrapper) from either engine. */
function canonStack(stack) {
    if (!stack) return null;
    if (stack.actions === undefined && stack.immediateActions === undefined) return canonStackNode(stack);
    return {
        actions: (stack.actions ?? []).map(canonStackNode),
        immediateActions: (stack.immediateActions ?? []).map(canonStackNode),
    };
}
/** Annotate an engine failure with the fixture and command index that produced it. */
function run(command, label) {
    try {
        command();
    } catch (error) {
        throw new Error(`${label}\n  ${error?.message ?? error}`);
    }
}
const fixtureDir = join(__dirname, "__fixtures__", "replays");
// The 17 hand-written baseline fixtures live directly in replays/; generated ones go in
// replays/fuzz/ so that fixtures.test.js can keep counting the baseline on its own.
const files = ["", "fuzz"].flatMap((dir) => {
    const absolute = dir ? join(fixtureDir, dir) : fixtureDir;
    if (!existsSync(absolute)) return [];
    return readdirSync(absolute).filter((f) => f.endsWith(".json")).map((f) => (dir ? join(dir, f) : f));
});
describe("Replay fixtures drive the real engine", () => {
    for (const file of files) {
        it(`replays ${file}`, () => {
            const j = JSON.parse(readFileSync(join(fixtureDir, file), "utf8"));
            const game = deserializeGame(toOurs(j.initialState));
            game.state.actionStack = importStack(j.initialState.actionStack);
            game.state.canUndo = !!j.initialState.canUndo;
            for (let ci = 0; ci < j.commands.length; ci++) {
                const cmd = j.commands[ci];
                const rng = new RecordingRandom(cmd.random ?? []);
                const label = `${file} cmd ${ci} (${cmd.kind}${cmd.action ? " " + cmd.action.type : ""})`;
                const execute = () => {
                    switch (cmd.kind) {
                        case "perform":
                            return game.perform(cmd.player, cmd.action, rng);
                        case "skip":
                            return game.skip(cmd.player);
                        case "endTurn":
                            return game.endTurn(cmd.player, rng);
                        case "undo":
                            return game.undo(cmd.player);
                        default:
                            throw new Error(`Unsupported command kind: ${cmd.kind}`);
                    }
                };
                // Java's ReplayRunner applies expectedError to every command kind, not just
                // perform/skip: a rejected command must throw *and* leave the state untouched.
                if (cmd.expectedError) {
                    expect(() => execute(), label).toThrow(new RegExp(cmd.expectedError));
                }
                else {
                    run(() => {
                        execute();
                        if (cmd.kind !== "undo")
                            rng.assertFullyConsumed();
                    }, label);
                }
                const after = serializeGame(game);
                const diffs = diff(canon(after), canon(toOurs(cmd.expectedState)));
                if (diffs.length)
                    throw new Error(`${label}\n  ${diffs.slice(0, 20).join("\n  ")}`);
                // The stack decides what can be performed next, so a divergence here poisons every
                // later command even when the rest of the state still matches.
                const stackDiffs = diff(canonStack(after.actionStack), canonStack(cmd.expectedState.actionStack), "actionStack");
                if (stackDiffs.length)
                    throw new Error(`${label}\n  ${stackDiffs.slice(0, 20).join("\n  ")}`);
                // Java's ReplayRunner also checks the scores whenever the fixture records them.
                if (cmd.expectedScores) {
                    for (const [name, want] of Object.entries(cmd.expectedScores)) {
                        const got = game.getScore(name);
                        if (got !== want)
                            throw new Error(`${label}\n  score ${name}: got ${got} want ${want}`);
                    }
                }
            }
        });
    }
});
