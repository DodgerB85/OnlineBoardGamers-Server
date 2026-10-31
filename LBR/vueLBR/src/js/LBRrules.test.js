import test from "node:test";
import assert from "node:assert/strict";

import { idx } from "./LBRreference.js";
import {
	createInitialState,
	applyAction,
	canPlaceCatastrophe,
	canPlaceLeader,
	canPlaceTile,
	currentActor,
	kingdomAt,
	boardTreasureCount,
	computeStandings,
	playerScore,
} from "./LBRrules.js";

// A blank board with the rulebook's bag and no starting temples, so each test
// can build the exact position it needs.
function blank(seats = 2) {
	const s = createInitialState(seats, () => 0.5);
	s.tiles.fill(0);
	s.treasures.fill(false);
	s.catastrophes.fill(false);
	s.leaders.fill(null);
	s.monuments = [];
	s.unification = -1;
	s.players.forEach((p) => {
		p.hand = { R: 6, B: 6, G: 6, K: 6 };
		p.score = { R: 0, B: 0, G: 0, K: 0 };
		p.treasures = 0;
		p.catastrophes = 2;
		p.leaders = { R: null, B: null, G: null, K: null };
	});
	s.bag = { R: 100, B: 100, G: 100, K: 100 };
	s.history = [];
	s.activeSeat = 0;
	s.actionsUsed = 0;
	s.pending = null;
	s.followUp = null;
	s.war = null;
	s.revolt = null;
	s.gameOver = false;
	return s;
}

function put(s, row, col, code) {
	s.tiles[idx(row, col)] = code;
}

function treasure(s, row, col) {
	s.treasures[idx(row, col)] = true;
}

function leader(s, seat, colour, row, col) {
	const i = idx(row, col);
	s.leaders[i] = { s: seat, c: colour };
	s.players[seat].leaders[colour] = i;
}

function act(s, seat, action) {
	const result = applyAction(s, seat, action);
	assert.equal(result.error, undefined, `action failed: ${result.error}`);
	return result.state;
}

test("initial state follows the rulebook setup", () => {
	const s = createInitialState(4, () => 0.5);
	assert.equal(s.tiles.filter((t) => t === 1).length, 10);
	assert.equal(boardTreasureCount(s), 10);
	assert.equal(s.bag.R + s.bag.B + s.bag.G + s.bag.K, 153 - 10 - 24);
	for (const p of s.players) assert.equal(p.hand.R + p.hand.B + p.hand.G + p.hand.K, 6);
});

test("a tile scores its colour to the matching leader", () => {
	let s = blank();
	put(s, 0, 10, 1); // temple
	leader(s, 0, "R", 0, 9);
	s = act(s, 0, { type: "placeTile", colour: "R", pos: idx(1, 9) });
	assert.equal(s.players[0].score.R, 1);
	assert.equal(s.pending, null);
});

test("a tile without its colour leader scores the black leader", () => {
	let s = blank();
	put(s, 0, 10, 1);
	leader(s, 0, "K", 0, 9);
	s = act(s, 0, { type: "placeTile", colour: "G", pos: idx(1, 9) });
	assert.equal(s.players[0].score.G, 1);
});

test("a tile joining two kingdoms scores nothing", () => {
	let s = blank();
	put(s, 0, 10, 1);
	leader(s, 0, "R", 0, 9);
	put(s, 1, 7, 1);
	leader(s, 1, "B", 1, 8);
	// (1,9) is the empty cell between the two kingdoms.
	s = act(s, 0, { type: "placeTile", colour: "R", pos: idx(1, 9) });
	assert.equal(s.players[0].score.R, 0);
	assert.equal(s.players[1].score.R, 0);
});

test("a revolt tie goes to the defender", () => {
	let s = blank();
	put(s, 1, 10, 1);
	leader(s, 1, "R", 1, 9);
	put(s, 2, 10, 1);
	s = act(s, 0, { type: "placeLeader", colour: "R", pos: idx(2, 9) });
	assert.equal(s.pending.kind, "revoltSupport");
	s = act(s, 0, { type: "support", count: 0 });
	s = act(s, 1, { type: "support", count: 0 });
	assert.equal(s.players[1].score.R, 1);
	assert.equal(s.leaders[idx(1, 9)].s, 1);
	assert.equal(s.leaders[idx(2, 9)], null);
});

test("a war winner scores the colour and destroys the loser's tiles", () => {
	let s = blank();
	// Left kingdom: seat 0 red leader next to its temple.
	put(s, 0, 10, 1);
	leader(s, 0, "R", 0, 9);
	put(s, 1, 8, 1);
	// Right kingdom: seat 1 red leader next to its temple.
	put(s, 1, 7, 1);
	leader(s, 1, "R", 1, 6);
	put(s, 2, 5, 1);
	// Place a red tile at (1,9), joining them; seat 0 is the attacker.
	s = act(s, 0, { type: "placeTile", colour: "R", pos: idx(1, 9) });
	assert.equal(s.pending.kind, "warSupport");
	s = act(s, 0, { type: "support", count: 0 });
	s = act(s, 1, { type: "support", count: 1 }); // defender adds a temple, wins
	assert.equal(s.players[1].score.R, 2); // 1 for the war + 1 destroyed temple
	assert.equal(s.leaders[idx(0, 9)], null);
	assert.equal(s.tiles[idx(0, 10)], 0); // attacker's supporting temple destroyed
	assert.equal(s.tiles[idx(1, 9)], 1); // the joining tile remains
});

test("treasures are taken by the trader, keeping one farthest from the edge", () => {
	let s = blank();
	put(s, 0, 10, 1);
	treasure(s, 0, 10);
	leader(s, 0, "G", 0, 9);
	put(s, 1, 9, 1);
	treasure(s, 1, 9);
	put(s, 1, 10, 1);
	treasure(s, 1, 10);
	put(s, 2, 9, 1);
	treasure(s, 2, 9);
	// A quiet catastrophe triggers the end-of-action treasure check.
	s = act(s, 0, { type: "catastrophe", pos: idx(5, 5) });
	assert.equal(s.pending.kind, "treasure");
	assert.deepEqual(s.pending.keepOptions, [idx(2, 9)]);
	s = act(s, 0, { type: "treasure", keep: idx(2, 9) });
	assert.equal(s.players[0].treasures, 3);
	assert.equal(boardTreasureCount(s), 1);
	assert.equal(s.treasures[idx(2, 9)], true);
});

test("four like tiles may become a monument, and it scores at turn end", () => {
	let s = blank();
	// three red tiles in a square, plus a temple and leader in the same kingdom
	put(s, 3, 3, 1);
	put(s, 3, 4, 1);
	put(s, 4, 3, 1);
	put(s, 2, 4, 1); // temple for the leader
	leader(s, 0, "R", 2, 5);
	s = act(s, 0, { type: "placeTile", colour: "R", pos: idx(4, 4) });
	assert.equal(s.pending.kind, "monument");
	assert.deepEqual(s.pending.offers[0].at, idx(3, 3));
	s = act(s, 0, { type: "monument", build: { at: idx(3, 3), type: "RG" } });
	assert.equal(s.tiles[idx(3, 3)], 5);
	assert.equal(s.monuments.length, 1);
	// the placement itself scored one red point, then the monument scores one more
	s = act(s, 0, { type: "pass" });
	assert.equal(s.players[0].score.R, 2);
	assert.equal(s.players[0].score.G, 0);
});

test("catastrophe removes a leader whose only temple is destroyed", () => {
	let s = blank();
	put(s, 0, 10, 1);
	leader(s, 0, "R", 0, 9);
	s = act(s, 0, { type: "catastrophe", pos: idx(0, 10) });
	assert.equal(s.leaders[idx(0, 9)], null);
	assert.equal(s.catastrophes[idx(0, 10)], true);
});

test("leader placement needs an adjacent temple", () => {
	const s = blank();
	assert.equal(canPlaceLeader(s, 0, "R", idx(5, 5)), "notAdjacentTemple");
	assert.equal(canPlaceTile(s, 0, "G", idx(5, 5)), null);
});

test("a rejected action leaves the state untouched", () => {
	const s = blank();
	const before = JSON.stringify(s);
	const result = applyAction(s, 0, { type: "catastrophe", pos: idx(5, 5) });
	assert.equal(result.error, undefined);
	const stale = result.state;
	const copy = JSON.stringify(stale);
	const bad = applyAction(stale, 1, { type: "pass" });
	assert.equal(bad.error, "notYourTurn");
	assert.equal(JSON.stringify(stale), copy);
	assert.equal(JSON.stringify(s), before);
});

test("scores after treasures use the lowest colour", () => {
	const p = { score: { R: 3, B: 1, G: 2, K: 0 }, treasures: 3 };
	assert.equal(playerScore(p), 2); // 3/2/2/2 after three treasures
	const s = blank(3);
	s.players[0].score = { R: 5, B: 5, G: 5, K: 5 };
	s.players[1].score = { R: 4, B: 4, G: 4, K: 4 };
	s.players[2].score = { R: 4, B: 4, G: 4, K: 3 };
	const standings = computeStandings(s);
	assert.deepEqual(standings.winners, [0]);
});

test("kingdom membership follows connectable cells only", () => {
	const s = blank();
	put(s, 3, 3, 1);
	leader(s, 0, "R", 3, 4);
	const k = kingdomAt(s, idx(3, 3));
	assert.equal(k.map.has(idx(3, 4)), true);
	assert.equal(k.hasLeader, true);
});

function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

test("three-player wars pick the attacker clockwise from the active player", () => {
	let s = blank(3);
	put(s, 0, 10, 1);
	leader(s, 1, "R", 0, 9);
	put(s, 1, 7, 1);
	leader(s, 2, "R", 1, 8);
	s = act(s, 0, { type: "placeTile", colour: "R", pos: idx(1, 9) });
	assert.equal(s.pending.kind, "warSupport");
	assert.equal(s.pending.seat, 1); // seat 1 is clockwise before seat 2
	assert.equal(s.war.conflicts[0].attacker, 1);
	assert.equal(s.war.conflicts[0].defender, 2);
});

test("two treasures left at the end of a turn finish the game", () => {
	let s = blank(2);
	put(s, 0, 10, 1);
	treasure(s, 0, 10);
	put(s, 0, 11, 1);
	treasure(s, 0, 11);
	s = act(s, 0, { type: "endTurn" });
	assert.equal(s.gameOver, true);
	assert.equal(s.standings.rows.length, 2);
	assert.equal(s.standings.winners.length >= 1, true);
});

test("an empty bag ends the game when a hand refreshes", () => {
	let s = blank(2);
	s.bag = { R: 0, B: 0, G: 0, K: 0 };
	s.players[0].hand = { R: 0, B: 0, G: 0, K: 0 };
	s = act(s, 0, { type: "endTurn" });
	assert.equal(s.gameOver, true);
	assert.equal(s.standings.rows.length, 2);
});

test("random legal play always reaches a finished game", () => {
	const rng = mulberry32(12345);
	let s = createInitialState(3, rng);
	let guard = 0;
	while (!s.gameOver && guard < 4000) {
		guard += 1;
		const seat = currentActor(s);
		const p = s.pending;
		let action;
		if (p) {
			if (p.kind === "treasure") action = { type: "treasure", keep: p.keepOptions[0] };
			else if (p.kind === "warOrder") action = { type: "warOrder", colour: s.war.conflicts[0].colour };
			else if (p.kind === "warSupport" || p.kind === "revoltSupport") action = { type: "support", count: 0 };
			else action = { type: "monument", build: null };
		} else {
			const moves = [];
			for (const colour of ["R", "B", "G", "K"]) {
				for (let pos = 0; pos < 176; pos++) {
					if (canPlaceTile(s, seat, colour, pos) === null) moves.push({ type: "placeTile", colour, pos });
				}
			}
			for (const colour of ["R", "B", "G", "K"]) {
				for (let pos = 0; pos < 176; pos++) {
					if (canPlaceLeader(s, seat, colour, pos) === null) moves.push({ type: "placeLeader", colour, pos });
				}
			}
			for (let pos = 0; pos < 176; pos++) {
				if (canPlaceCatastrophe(s, seat, pos) === null) moves.push({ type: "catastrophe", pos });
			}
			moves.push({ type: "pass" });
			if (s.players[seat].treasures > 0) moves.push({ type: "endTurn" });
			const r = rng();
			action = moves[Math.floor(r * moves.length)];
		}
		const result = applyAction(s, seat, action);
		assert.equal(result.error, undefined, `random step ${guard} failed: ${result.error} action ${JSON.stringify(action)}`);
		s = result.state;
		// Leader bookkeeping must always agree with the board array.
		for (let seat2 = 0; seat2 < s.numSeats; seat2++) {
			for (const colour of ["R", "B", "G", "K"]) {
				const pos = s.players[seat2].leaders[colour];
				if (pos !== null) {
					assert.equal(s.leaders[pos].s, seat2);
					assert.equal(s.leaders[pos].c, colour);
				}
			}
		}
	}
	assert.equal(s.gameOver, true, `game did not finish in ${guard} steps`);
	assert.equal(s.standings.rows.length, 3);
});

test("building a monument evicts a leader that loses its only temple", () => {
	let s = blank();
	put(s, 3, 3, 1);
	put(s, 3, 4, 1);
	put(s, 4, 3, 1);
	leader(s, 0, "R", 2, 3); // only adjacent to the temple at (3,3)
	s = act(s, 0, { type: "placeTile", colour: "R", pos: idx(4, 4) });
	assert.equal(s.pending.kind, "monument");
	s = act(s, 0, { type: "monument", build: { at: idx(3, 3), type: "RG" } });
	assert.equal(s.tiles[idx(3, 3)], 5);
	assert.equal(s.leaders[idx(2, 3)], null);
	assert.equal(s.players[0].leaders.R, null);
});
