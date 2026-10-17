import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Game, JavaRandom, defaultOptions } from "./ROWindex";

/**
 * Setup parity: every replay fixture's `initialState` is a snapshot Java took immediately after
 * `GWT.start`, so it shows exactly what a fresh game must contain. The replays *hydrate* that
 * state instead of building it, so `Game.start` is otherwise never checked - and that is where
 * the supply/deck scaling and initial fills live.
 *
 * The RNG tape differs between the two engines, so every comparison below is shuffle-independent
 * (multisets, counts, or sorted sets), never positional.
 */
const dir = join(__dirname, "__fixtures__", "replays", "fuzz");

const tileKey = (t, relaxHazardHand = false) => {
	if (t.worker !== undefined) return `W:${t.worker}`;
	if (t.teepee !== undefined) return `T:${t.teepee}`;
	// KansasCitySupply.balanced's 2-player trim removes "a hazard of each type with N points"
	// without naming a hand, so which copy of that type/points leaves the game is up to the
	// shuffle. Everything else keeps the hand in the key.
	if (t.hazard !== undefined) return relaxHazardHand ? `H:${t.hazard.type}:${t.hazard.points}` : `H:${t.hazard.type}:${t.hazard.hand}:${t.hazard.points}`;
	return JSON.stringify(t);
};
const multiset = (arr, relaxHazardHand = false) => arr.map((t) => tileKey(t, relaxHazardHand)).sort();
const cardKey = (c) => {
	if (typeof c === "string") return c;
	if (c.id !== undefined) return c.id;
	return `${c.type}:${c.points}:${c.value}`;
};
const cardMultiset = (arr) => arr.map(cardKey).sort();
const nonZero = (map) => Object.fromEntries(Object.entries(map ?? {}).filter(([, v]) => v));

function freshGame(s, seed, extra) {
	const players = s.players.map((p) => ({ name: p.name, color: p.color, type: "HUMAN" }));
	const options = { ...defaultOptions(s.edition, { buildings: "BEGINNER", railsToTheNorth: !!s.railsToTheNorth, ...extra }) };
	return Game.start(players, options, new JavaRandom(seed));
}

/** Every shuffle-independent difference between the fresh build and Java's setup snapshot. */
function compare(s, g, relaxHazardHand = false) {
	const diffs = [];
	const eq = (label, row, java) => {
		const a = JSON.stringify(row);
		const b = JSON.stringify(java);
		if (a !== b)
			diffs.push(`${label}\n     row: ${a}\n    java: ${b}`);
	};

	// Supplies and decks: the whole cattle deck lives in market+stack, and the whole Kansas City
	// supply is spread over the piles, the trail, the foresights and the job market. Comparing the
	// union makes the check independent of which tiles the shuffle happened to draw.
	eq("cattle deck", cardMultiset([...g.state.cattleMarket.market, ...g.state.cattleMarket.drawStack]), cardMultiset([...(s.cattleMarket.market ?? []), ...(s.cattleMarket.drawStack ?? [])]));

	const ourTrailTiles = [...g.state.trail.locations.values()].filter((l) => l.hazard || l.teepee).map((l) => (l.hazard ? { hazard: l.hazard } : { teepee: l.teepee }));
	const javaTrailTiles = Object.values(s.trail.locations ?? {}).filter((d) => d.hazard || d.teepee);
	const ourForesight = g.state.foresights.spaces.flat().filter(Boolean);
	const javaForesight = (s.foresights.spaces ?? []).flat().filter(Boolean);
	const ourWorkers = g.state.jobMarket.rows.flatMap((r) => r.workers.map((w) => ({ worker: w })));
	const javaWorkers = (s.jobMarket.rows ?? []).flatMap((r) => (r.workers ?? []).map((w) => ({ worker: w })));
	eq(
		"kc supply (piles + trail + foresights + job market)",
		multiset([...g.state.kcSupply.piles.flat(), ...ourTrailTiles, ...ourForesight, ...ourWorkers], relaxHazardHand),
		multiset([...(s.kansasCitySupply.drawPiles ?? []).flat(), ...javaTrailTiles, ...javaForesight, ...javaWorkers], relaxHazardHand)
	);
	eq("kc pile sizes", g.state.kcSupply.piles.map((p) => p.length), s.kansasCitySupply.drawPiles.map((p) => p.length));

	// Job market: how many workers sit in each row is fixed by the row capacities.
	eq("job market row sizes", g.state.jobMarket.rows.map((r) => r.workers.length), s.jobMarket.rows.map((r) => (r.workers ?? []).length));
	eq("job market row index", g.state.jobMarket.currentRowIndex, s.jobMarket.currentRowIndex ?? 0);
	eq("foresight slots filled", g.state.foresights.spaces.map((col) => col.filter(Boolean).length), s.foresights.spaces.map((col) => (col ?? []).filter(Boolean).length));

	// Players: starting deck+hand, seats, buildings and committed objective are all fixed.
	const ourPlayers = Object.entries(g.state.playerStates).sort((a, b) => a[0].localeCompare(b[0])).map(([, ps]) => ps);
	const javaPlayers = Object.entries(s.playerStates).sort((a, b) => a[0].localeCompare(b[0])).map(([, ps]) => ps);
	eq("player cards (deck+hand+discard)", ourPlayers.map((p) => cardMultiset([...p.drawStack, ...p.hand, ...p.discardPile])), javaPlayers.map((p) => cardMultiset([...(p.drawStack ?? []), ...(p.hand ?? []), ...(p.discardPile ?? [])])));
	eq("player balances", ourPlayers.map((p) => p.balance).sort((a, b) => a - b), javaPlayers.map((p) => p.balance).sort((a, b) => a - b));
	eq("player buildings", ourPlayers.map((p) => [...p.buildings].sort()), javaPlayers.map((p) => [...(p.buildings ?? [])].sort()));
	eq("player unlocked", ourPlayers.map((p) => nonZero(p.unlocked)), javaPlayers.map((p) => nonZero(p.unlocked)));
	// Which start cards each seat drew is shuffled, but every seat gets exactly one START_* card.
	eq("player committed objectives", ourPlayers.map((p) => p.objectives.length).sort((a, b) => a - b), javaPlayers.map((p) => (p.objectives ?? []).length).sort((a, b) => a - b));
	eq("committed objectives are start cards", ourPlayers.flatMap((p) => p.objectives).every((id) => String(id).startsWith("START_")), javaPlayers.flatMap((p) => p.objectives ?? []).every((id) => String(id).startsWith("START_")));
	eq("player order", [...g.state.playerOrder].sort(), [...s.playerOrder].sort());

	// Trail: the seven neutral buildings plus seven hazard/teepee tiles from the first pile.
	// How the seven tiles split between hazards and teepees is a shuffle outcome, so only the
	// total is comparable (their content is already covered by the first-pile comparison).
	const ourTiles = [...g.state.trail.locations.values()].filter((l) => l.building || l.hazard || l.teepee);
	const javaTiles = Object.values(s.trail.locations ?? {}).filter((d) => d.building || d.hazard || d.teepee);
	eq("trail building names", ourTiles.map((l) => l.building?.name).filter(Boolean).sort(), javaTiles.map((d) => d.building?.name).filter(Boolean).sort());
	eq("trail tile count", ourTiles.filter((l) => l.hazard || l.teepee).length, javaTiles.filter((d) => d.hazard || d.teepee).length);

	// Railroad: whatever pile remains after dealing, plus the one-time medium town tiles.
	const ourMasters = [...g.state.railroadTrack.stations.map((st) => st.stationMaster), ...g.state.railroadTrack.stationMasters].filter(Boolean).sort();
	const javaMasters = [...s.railroadTrack.stations.map((st) => st.stationMaster ?? null), ...(s.railroadTrack.bonusStationMasters ?? [])].filter(Boolean).sort();
	eq("station master pile", ourMasters, javaMasters);
	eq("medium town tile count", Object.keys(g.state.railroadTrack.mediumTownTiles).length, Object.keys(s.railroadTrack.mediumTownTiles ?? {}).length);

	// Objective market: fixed 24-card deck, four face up.
	eq("objective market", cardMultiset([...g.state.objectiveCards.available, ...g.state.objectiveCards.drawStack]), cardMultiset([...(s.objectiveCards.available ?? []), ...(s.objectiveCards.drawStack ?? [])]));
	eq("starting objective cards", g.state.startingObjectiveCards.map(cardKey), (s.startingObjectiveCards ?? []).map(cardKey));
	eq("status", g.state.status, s.status);
	return diffs;
}

/**
 * One entry per generated fixture. The fixture records edition / railsToTheNorth / simmental but
 * not the other option flags, so they are repeated here exactly as the fuzzer was called.
 */
const CASES = [
	{ file: "gwt2-fuzz-000.json", seed: 11 },
	{ file: "gwt-rttn-fuzz-000.json", seed: 22 },
	{ file: "gwt-rttn-3p-fuzz-000.json", seed: 33 },
	{ file: "gwt2-rttn-4p-fuzz-000.json", seed: 44 },
	{ file: "gwt2-rttn-3p-variant.BALANCED-simmental.true-fuzz-000.json", seed: 55, extra: { variant: "BALANCED", simmental: true } },
	{ file: "gwt2-rttn-variant.BALANCED-fuzz-000.json", seed: 66, extra: { variant: "BALANCED" }, relaxHazardHand: true },
	{ file: "gwt-rttn-4p-stationMasterPromos.true-building11.true-building13.true-fuzz-000.json", seed: 77, extra: { stationMasterPromos: true, building11: true, building13: true } },
	{ file: "gwt2-rttn-building13.true-simmental.true-fuzz-000.json", seed: 88, extra: { building13: true, simmental: true } },
];

describe("Game.start setup parity (vs Java post-start snapshots)", () => {
	for (const { file, seed, extra, relaxHazardHand } of CASES) {
		it(`builds the same setup as Java for ${file}`, () => {
			const s = JSON.parse(readFileSync(join(dir, file), "utf8")).initialState;
			const g = freshGame(s, seed, extra ?? {});
			expect(compare(s, g, !!relaxHazardHand).join("\n")).toBe("");
		});
	}
});
