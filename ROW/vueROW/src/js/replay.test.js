import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ActionStack, CATTLE_DEFAULT_VALUE, PossibleAction, RecordingRandom, ActionType, deserializeGame, serializeGame } from "./ROWindex";
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
    if (c && typeof c === "object" && "type" in c && "points" in c && c.value === undefined && CATTLE_DEFAULT_VALUE[c.type] !== undefined) {
        return { ...c, value: CATTLE_DEFAULT_VALUE[c.type] };
    }
    return c;
}
const fixCards = (arr) => (Array.isArray(arr) ? arr.map(fixCard) : arr);
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
            lastUpgradedStation: p.lastUpgradedStation ?? null,
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
        trail: s.trail,
        railroadTrack: {
            players: rt.currentSpaces ?? {},
            cities: rt.cities ?? {},
            stations: (rt.stations ?? []).map((st) => ({
                cost: st.cost,
                points: st.points,
                discColors: st.discColors,
                space: st.space,
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
/** Canonical comparable subset: drops fields our engine does not model (options, discs, RTTN extras, empty trail spots). */
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
    // stations: only the 10 base stations exist in our engine; compare just the mutable bits
    if (o.railroadTrack) {
        o.railroadTrack.stations = (o.railroadTrack.stations ?? []).slice(0, 10).map((st) => ({
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
                if (cmd.kind === "perform") {
                    if (cmd.expectedError) {
                        expect(() => game.perform(cmd.player, cmd.action, rng), label).toThrow(new RegExp(cmd.expectedError));
                    }
                    else {
                        run(() => {
                            game.perform(cmd.player, cmd.action, rng);
                            rng.assertFullyConsumed();
                        }, label);
                    }
                }
                else if (cmd.kind === "skip") {
                    if (cmd.expectedError) {
                        expect(() => game.skip(cmd.player), label).toThrow(new RegExp(cmd.expectedError));
                    }
                    else {
                        run(() => {
                            game.skip(cmd.player);
                            rng.assertFullyConsumed();
                        }, label);
                    }
                }
                else if (cmd.kind === "endTurn") {
                    run(() => {
                        game.endTurn(cmd.player, rng);
                        rng.assertFullyConsumed();
                    }, label);
                }
                else if (cmd.kind === "undo") {
                    game.undo(cmd.player);
                }
                else {
                    throw new Error(`Unsupported command kind: ${cmd.kind}`);
                }
                const diffs = diff(canon(serializeGame(game)), canon(toOurs(cmd.expectedState)));
                if (diffs.length)
                    throw new Error(`${label}\n  ${diffs.slice(0, 20).join("\n  ")}`);
            }
        });
    }
});
