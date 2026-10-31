// LBR rules engine. Plain data in, plain data out; no Vue, no DOM.
//
// State is the persisted game blob. Every mutation works on a deep clone and
// validates before it commits, so a rejected action never changes the state.

import {
	CELLS,
	COLS,
	ROWS,
	COLOURS,
	COLOUR_CODE,
	CODE_COLOUR,
	MONUMENT_COLOURS,
	MONUMENT_TYPES,
	RIVER,
	START_TEMPLE,
	START_TEMPLES,
	START_TILES,
	neighbours,
	edgeDistance,
	rowOf,
	colOf,
} from "./LBRreference.js";

export const VERSION = 1;

export const PHASE_TURN = 0;
export const PHASE_GAME_OVER = 1;

const ALL_MONUMENTS = MONUMENT_TYPES.slice();

export function cloneState(state) {
	return JSON.parse(JSON.stringify(state));
}

export function emptyHand() {
	return { R: 0, B: 0, G: 0, K: 0 };
}

export function handTotal(hand) {
	return hand.R + hand.B + hand.G + hand.K;
}

function newPlayer() {
	const leaders = { R: null, B: null, G: null, K: null };
	return {
		hand: emptyHand(),
		score: emptyHand(),
		treasures: 0,
		catastrophes: 2,
		leaders,
	};
}

function drawTiles(bag, n, rng) {
	const out = emptyHand();
	let short = false;
	for (let i = 0; i < n; i++) {
		const total = bag.R + bag.B + bag.G + bag.K;
		if (total === 0) {
			short = true;
			break;
		}
		let pick = Math.floor(rng() * total);
		let colour = "R";
		for (const c of COLOURS) {
			if (pick < bag[c]) {
				colour = c;
				break;
			}
			pick -= bag[c];
		}
		bag[colour] -= 1;
		out[colour] += 1;
	}
	return { tiles: out, short };
}

function giveTiles(player, tiles) {
	for (const c of COLOURS) player.hand[c] += tiles[c];
}

export function createInitialState(numSeats, rng = Math.random) {
	if (numSeats < 2 || numSeats > 4) throw new Error("numSeats must be 2..4");
	const state = {
		v: VERSION,
		numSeats,
		tiles: new Array(CELLS).fill(0),
		leaders: new Array(CELLS).fill(null),
		treasures: new Array(CELLS).fill(false),
		catastrophes: new Array(CELLS).fill(false),
		unification: -1,
		monuments: [],
		availableMonuments: ALL_MONUMENTS.slice(),
		players: Array.from({ length: numSeats }, newPlayer),
		bag: {
			R: START_TILES.R - START_TEMPLES,
			B: START_TILES.B,
			G: START_TILES.G,
			K: START_TILES.K,
		},
		activeSeat: 0,
		actionsUsed: 0,
		turnNumber: 1,
		pending: null,
		followUp: null,
		war: null,
		revolt: null,
		gameOver: false,
		standings: null,
		history: [],
	};

	for (let i = 0; i < CELLS; i++) {
		if (START_TEMPLE[i]) {
			state.tiles[i] = COLOUR_CODE.R;
			state.treasures[i] = true;
		}
	}
	for (let seat = 0; seat < numSeats; seat++) {
		const drawn = drawTiles(state.bag, 6, rng);
		giveTiles(state.players[seat], drawn.tiles);
	}
	state.history.push({ s: -1, a: "start", n: numSeats });
	return state;
}

export function currentActor(state) {
	return state.pending ? state.pending.seat : state.activeSeat;
}

export function isMyAction(state, seat) {
	return currentActor(state) === seat;
}

export function phaseOf(state) {
	return state.gameOver ? PHASE_GAME_OVER : PHASE_TURN;
}

/* ------------------------------------------------------------------ */
/* Board queries                                                       */
/* ------------------------------------------------------------------ */

export function isConnectable(state, i) {
	return state.tiles[i] !== 0 || state.leaders[i] !== null || state.unification === i;
}

function kingdomMap(state, start) {
	const seen = new Set();
	if (!isConnectable(state, start)) return seen;
	const stack = [start];
	while (stack.length) {
		const i = stack.pop();
		if (seen.has(i)) continue;
		if (!isConnectable(state, i)) continue;
		seen.add(i);
		for (const n of neighbours(i)) stack.push(n);
	}
	return seen;
}

export function kingdomAt(state, start, ignoreUnification = false) {
	const map = new Set();
	const blocked = ignoreUnification ? state.unification : -1;
	if (start < 0 || !isConnectable(state, start) || start === blocked) {
		return emptyKingdom();
	}
	const stack = [start];
	while (stack.length) {
		const i = stack.pop();
		if (map.has(i) || i === blocked || !isConnectable(state, i)) continue;
		map.add(i);
		for (const n of neighbours(i)) stack.push(n);
	}
	const k = emptyKingdom();
	k.map = map;
	for (const i of map) {
		if (state.treasures[i]) k.treasures.push(i);
		const code = state.tiles[i];
		if (CODE_COLOUR[code]) k.tileCounts[CODE_COLOUR[code]]++;
		const leader = state.leaders[i];
		if (leader) k.leaders[leader.c] = { seat: leader.s, pos: i };
	}
	k.hasLeader = COLOURS.some((c) => k.leaders[c] !== null);
	return k;
}

function emptyKingdom() {
	return {
		map: new Set(),
		treasures: [],
		leaders: { R: null, B: null, G: null, K: null },
		tileCounts: { R: 0, B: 0, G: 0, K: 0 },
		hasLeader: false,
	};
}

export function neighbouringKingdoms(state, pos) {
	const out = [];
	const seen = new Set();
	for (const n of neighbours(pos)) {
		if (!isConnectable(state, n) || seen.has(n)) continue;
		const k = kingdomAt(state, n);
		for (const i of k.map) seen.add(i);
		if (k.hasLeader) out.push(k);
	}
	return out;
}

export function kingdomCountAt(state, pos) {
	return neighbouringKingdoms(state, pos).length;
}

export function isAdjacentToTemple(state, pos) {
	return neighbours(pos).some((n) => state.tiles[n] === COLOUR_CODE.R);
}

export function pathConnected(state, a, b) {
	if (a === b) return true;
	const seen = new Set([a]);
	const stack = [a];
	while (stack.length) {
		const i = stack.pop();
		for (const n of neighbours(i)) {
			if (seen.has(n) || !isConnectable(state, n)) continue;
			if (n === b) return true;
			seen.add(n);
			stack.push(n);
		}
	}
	return false;
}

export function boardTreasureCount(state) {
	return state.treasures.filter(Boolean).length;
}

/* ------------------------------------------------------------------ */
/* Legality                                                            */
/* ------------------------------------------------------------------ */

export function canPlaceTile(state, seat, colour, pos) {
	if (!isMyAction(state, seat)) return "notYourTurn";
	if (!COLOURS.includes(colour)) return "badColour";
	if (pos < 0 || pos >= CELLS) return "badCell";
	if (state.players[seat].hand[colour] <= 0) return "noTile";
	if (state.tiles[pos] !== 0 || state.leaders[pos] !== null) return "occupied";
	if (state.catastrophes[pos] || state.monuments.some((m) => coversCell(m, pos))) return "occupied";
	if (colour === "B" && !RIVER[pos]) return "blueOnLand";
	if (colour !== "B" && RIVER[pos]) return "landOnRiver";
	if (kingdomCountAt(state, pos) > 2) return "threeKingdoms";
	return null;
}

function coversCell(m, pos) {
	const row = rowOf(m.at);
	const col = colOf(m.at);
	const r = rowOf(pos);
	const c = colOf(pos);
	return r >= row && r <= row + 1 && c >= col && c <= col + 1;
}

export function canPlaceLeader(state, seat, colour, pos) {
	if (!isMyAction(state, seat)) return "notYourTurn";
	if (!COLOURS.includes(colour)) return "badColour";
	if (pos < 0 || pos >= CELLS) return "badCell";
	if (state.tiles[pos] !== 0 || state.leaders[pos] !== null) return "occupied";
	if (state.catastrophes[pos]) return "catastrophe";
	if (state.monuments.some((m) => coversCell(m, pos))) return "monument";
	if (RIVER[pos]) return "river";
	if (!isAdjacentToTemple(state, pos)) return "notAdjacentTemple";
	if (kingdomCountAt(state, pos) > 1) return "joinTwoKingdoms";
	const from = state.players[seat].leaders[colour];
	if (from !== null && from !== pos && moveWouldSplitAndRejoin(state, from, pos)) return "splitRejoin";
	return null;
}

function moveWouldSplitAndRejoin(state, from, to) {
	const kingdom = kingdomMap(state, from);
	if (!kingdom.has(from)) return false;
	const rest = new Set(kingdom);
	rest.delete(from);
	if (rest.size === 0) return false;
	const components = [];
	const seen = new Set();
	for (const start of rest) {
		if (seen.has(start)) continue;
		const comp = new Set();
		const stack = [start];
		while (stack.length) {
			const i = stack.pop();
			if (comp.has(i) || !rest.has(i)) continue;
			comp.add(i);
			for (const n of neighbours(i)) stack.push(n);
		}
		for (const i of comp) seen.add(i);
		components.push(comp);
	}
	if (components.length < 2) return false;
	const toNeighbours = new Set(neighbours(to));
	const touched = components.filter((c) => [...c].some((i) => toNeighbours.has(i))).length;
	return touched >= 2;
}

export function canWithdrawLeader(state, seat, colour) {
	if (!isMyAction(state, seat)) return "notYourTurn";
	if (!COLOURS.includes(colour)) return "badColour";
	if (state.players[seat].leaders[colour] === null) return "noLeader";
	return null;
}

export function canPlaceCatastrophe(state, seat, pos) {
	if (!isMyAction(state, seat)) return "notYourTurn";
	if (pos < 0 || pos >= CELLS) return "badCell";
	if (state.players[seat].catastrophes <= 0) return "noCatastrophes";
	if (state.treasures[pos]) return "treasure";
	if (state.catastrophes[pos]) return "catastrophe";
	if (state.leaders[pos] !== null) return "leader";
	if (state.monuments.some((m) => coversCell(m, pos))) return "monument";
	return null;
}

export function canSwap(state, seat, tiles) {
	if (!isMyAction(state, seat)) return "notYourTurn";
	const hand = state.players[seat].hand;
	let n = 0;
	for (const c of COLOURS) {
		if (tiles[c] < 0 || tiles[c] > hand[c]) return "notEnoughTiles";
		n += tiles[c];
	}
	if (n === 0) return "noTiles";
	if (handTotal(state.bag) === 0) return "bagEmpty";
	return null;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export function applyAction(state, seat, action) {
	if (state.gameOver) return { error: "gameOver" };
	if (currentActor(state) !== seat) return { error: "notYourTurn" };
	const s = cloneState(state);
	s.standings = null;
	let err = null;
	switch (action.type) {
		case "placeTile":
			err = doPlaceTile(s, seat, action.colour, action.pos);
			break;
		case "placeLeader":
			err = doPlaceLeader(s, seat, action.colour, action.pos);
			break;
		case "withdrawLeader":
			err = doWithdrawLeader(s, seat, action.colour);
			break;
		case "catastrophe":
			err = doCatastrophe(s, seat, action.pos);
			break;
		case "swap":
			err = doSwap(s, seat, action.tiles);
			break;
		case "pass":
			finishAction(s);
			break;
		case "endTurn":
			endTurn(s);
			break;
		case "treasure":
			err = doTreasure(s, seat, action.keep);
			break;
		case "warOrder":
			err = doWarOrder(s, seat, action.colour);
			break;
		case "support":
			err = doSupport(s, seat, action.count);
			break;
		case "monument":
			err = doMonument(s, seat, action.build);
			break;
		default:
			err = "badAction";
	}
	if (err) return { error: err };
	return { state: s };
}

function doPlaceTile(s, seat, colour, pos) {
	const err = canPlaceTile(s, seat, colour, pos);
	if (err) return err;
	const player = s.players[seat];
	player.hand[colour] -= 1;
	const kingdoms = neighbouringKingdoms(s, pos);
	const conflicts = [];
	for (const colourCode of COLOURS) {
		const leaders = [];
		for (const k of kingdoms) {
			if (k.leaders[colourCode]) leaders.push(k.leaders[colourCode]);
		}
		if (leaders.length < 2) continue;
		let attacker;
		if (leaders.some((l) => l.seat === seat)) attacker = seat;
		else attacker = clockwiseNearest(s, seat, leaders.map((l) => l.seat));
		const atk = leaders.find((l) => l.seat === attacker);
		const def = leaders.find((l) => l.seat !== attacker);
		conflicts.push({
			colour: colourCode,
			attacker: atk.seat,
			attackerPos: atk.pos,
			defender: def.seat,
			defenderPos: def.pos,
			attackerSupport: 0,
			defenderSupport: 0,
			attackerSent: false,
			defenderSent: false,
		});
	}
	s.history.push({ s: seat, a: "tile", p: pos, c: colour });
	if (conflicts.length > 0) {
		s.unification = pos;
		s.war = { at: pos, placedColour: colour, conflicts };
		s.followUp = { pos, colour };
		startWarOrderOrSupport(s);
		return null;
	}
	s.tiles[pos] = COLOUR_CODE[colour];
	if (kingdoms.length < 2) {
		const kingdom = kingdomAt(s, pos);
		const owner =
			kingdom.leaders[colour]?.seat ?? kingdom.leaders.K?.seat ?? null;
		if (owner !== null) s.players[owner].score[colour] += 1;
	}
	processFollowUp(s, { pos, colour });
	return null;
}

function clockwiseNearest(s, from, seats) {
	let best = seats[0];
	let bestDistance = Number.MAX_SAFE_INTEGER;
	for (const seat of seats) {
		const d = (seat - from + s.numSeats) % s.numSeats;
		if (d < bestDistance) {
			bestDistance = d;
			best = seat;
		}
	}
	return best;
}

function doPlaceLeader(s, seat, colour, pos) {
	const err = canPlaceLeader(s, seat, colour, pos);
	if (err) return err;
	const player = s.players[seat];
	const from = player.leaders[colour];

	// Detect the rival before the new leader joins the map: once both are in
	// the same kingdom, kingdomAt only keeps one leader per colour.
	let rival = null;
	for (const k of neighbouringKingdoms(s, pos)) {
		const leader = k.leaders[colour];
		if (leader && leader.seat !== seat) {
			rival = leader;
			break;
		}
	}

	if (from !== null) {
		s.leaders[from] = null;
		player.leaders[colour] = null;
	}
	s.leaders[pos] = { s: seat, c: colour };
	player.leaders[colour] = pos;
	s.history.push({ s: seat, a: "leader", p: pos, c: colour, from });

	if (rival) {
		s.revolt = {
			at: pos,
			colour,
			attacker: seat,
			attackerPos: pos,
			defender: rival.seat,
			defenderPos: rival.pos,
			attackerSupport: 0,
			defenderSupport: 0,
			attackerSent: false,
			defenderSent: false,
		};
		s.followUp = { pos, colour: null };
		s.pending = { kind: "revoltSupport", seat, stage: "attacker" };
		return null;
	}
	processFollowUp(s, { pos, colour: null });
	return null;
}

function doWithdrawLeader(s, seat, colour) {
	const err = canWithdrawLeader(s, seat, colour);
	if (err) return err;
	const player = s.players[seat];
	const pos = player.leaders[colour];
	s.leaders[pos] = null;
	player.leaders[colour] = null;
	s.history.push({ s: seat, a: "withdraw", c: colour, p: pos });
	processFollowUp(s, { pos: -1, colour: null });
	return null;
}

function doCatastrophe(s, seat, pos) {
	const err = canPlaceCatastrophe(s, seat, pos);
	if (err) return err;
	const player = s.players[seat];
	player.catastrophes -= 1;
	s.catastrophes[pos] = true;
	s.tiles[pos] = 0;
	s.leaders[pos] = null;
	s.history.push({ s: seat, a: "cat", p: pos });
	for (const n of neighbours(pos)) evictIfNoTemple(s, n);
	processFollowUp(s, { pos: -1, colour: null });
	return null;
}

function doSwap(s, seat, tiles) {
	const err = canSwap(s, seat, tiles);
	if (err) return err;
	const player = s.players[seat];
	let n = 0;
	for (const c of COLOURS) {
		player.hand[c] -= tiles[c];
		n += tiles[c];
	}
	const drawn = drawTiles(s.bag, n, Math.random);
	giveTiles(player, drawn.tiles);
	s.history.push({ s: seat, a: "swap", t: { ...tiles }, n });
	finishAction(s);
	return null;
}

/* ------------------------------------------------------------------ */
/* Pending decisions                                                   */
/* ------------------------------------------------------------------ */

function treasureTargets(s) {
	const seen = new Set();
	const out = [];
	for (let i = 0; i < CELLS; i++) {
		if (!s.treasures[i] || seen.has(i)) continue;
		const k = kingdomAt(s, i);
		for (const j of k.map) seen.add(j);
		if (k.treasures.length > 1 && k.leaders.G) {
			out.push({ at: i, seat: k.leaders.G.seat, treasures: k.treasures });
		}
	}
	return out;
}

function keepChoices(treasures) {
	const maxDistance = Math.max(...treasures.map(edgeDistance));
	return treasures.filter((p) => edgeDistance(p) === maxDistance);
}

function processFollowUp(s, follow) {
	s.followUp = follow;
	const targets = treasureTargets(s);
	if (targets.length > 0) {
		const t = targets[0];
		s.pending = {
			kind: "treasure",
			seat: t.seat,
			at: t.at,
			keepOptions: keepChoices(t.treasures),
			takeCount: t.treasures.length - 1,
		};
		return;
	}
	if (follow && follow.colour) {
		const offers = monumentOffers(s, follow.pos, follow.colour);
		if (offers.length > 0) {
			s.pending = {
				kind: "monument",
				seat: s.activeSeat,
				colour: follow.colour,
				offers,
			};
			return;
		}
	}
	finishAction(s);
}

function doTreasure(s, seat, keep) {
	const p = s.pending;
	if (!p || p.kind !== "treasure" || p.seat !== seat) return "notYourTurn";
	if (!p.keepOptions.includes(keep)) return "badTreasure";
	const taker = s.players[seat];
	const k = kingdomAt(s, p.at);
	const greens = k.leaders.G;
	if (!greens || greens.seat !== seat) return "noTrader";
	let taken = 0;
	for (const pos of k.treasures) {
		if (pos === keep) continue;
		s.treasures[pos] = false;
		taken += 1;
	}
	taker.treasures += taken;
	s.history.push({ s: seat, a: "treasure", n: taken, keep });
	s.pending = null;
	processFollowUp(s, s.followUp);
	return null;
}

function monumentOffers(s, pos, colour) {
	const code = COLOUR_CODE[colour];
	const types = s.availableMonuments.filter((t) => MONUMENT_COLOURS[t].includes(colour));
	if (types.length === 0) return [];
	const row = rowOf(pos);
	const col = colOf(pos);
	const topLefts = [
		[pos],
		[row - 1, col],
		[row, col - 1],
		[row - 1, col - 1],
	];
	const offers = [];
	for (const [r, c] of topLefts) {
		if (r < 0 || c < 0 || r >= ROWS - 1 || c >= COLS - 1) continue;
		const at = r * COLS + c;
		const cells = [at, at + 1, at + COLS, at + COLS + 1];
		if (cells.every((i) => s.tiles[i] === code)) offers.push({ at, types: types.slice() });
	}
	return offers;
}

function doMonument(s, seat, build) {
	const p = s.pending;
	if (!p || p.kind !== "monument" || p.seat !== seat) return "notYourTurn";
	if (build === null) {
		s.history.push({ s: seat, a: "declineMonument" });
		s.pending = null;
		finishAction(s);
		return null;
	}
	const offer = p.offers.find((o) => o.at === build.at && o.types.includes(build.type));
	if (!offer) return "badMonument";
	const code = COLOUR_CODE[p.colour];
	const cells = [offer.at, offer.at + 1, offer.at + COLS, offer.at + COLS + 1];
	if (!cells.every((i) => s.tiles[i] === code)) return "badMonument";
	for (const i of cells) s.tiles[i] = 5;
	s.monuments.push({ t: build.type, at: offer.at });
	s.availableMonuments = s.availableMonuments.filter((t) => t !== build.type);
	for (const i of cells) {
		for (const n of neighbours(i)) evictIfNoTemple(s, n);
	}
	s.history.push({ s: seat, a: "monument", p: offer.at, t: build.type });
	s.pending = null;
	finishAction(s);
	return null;
}

function startWarOrderOrSupport(s) {
	if (!s.war) return;
	const conflicts = s.war.conflicts;
	if (conflicts.length === 0) {
		finishWar(s);
		return;
	}
	if (conflicts.length === 1) {
		startWarSupport(s, conflicts[0]);
		return;
	}
	s.pending = { kind: "warOrder", seat: s.activeSeat };
}

function doWarOrder(s, seat, colour) {
	const p = s.pending;
	if (!p || p.kind !== "warOrder" || p.seat !== seat) return "notYourTurn";
	const conflict = s.war.conflicts.find((c) => c.colour === colour);
	if (!conflict) return "badColour";
	startWarSupport(s, conflict);
	return null;
}

function startWarSupport(s, conflict) {
	s.pending = {
		kind: "warSupport",
		seat: conflict.attacker,
		colour: conflict.colour,
		stage: "attacker",
	};
}

function doSupport(s, seat, count) {
	const p = s.pending;
	if (!p || (p.kind !== "warSupport" && p.kind !== "revoltSupport") || p.seat !== seat) {
		return "notYourTurn";
	}
	const c = p.kind === "warSupport"
		? s.war.conflicts.find((x) => x.colour === p.colour)
		: s.revolt;
	if (!c) return "badSupport";
	const isAttacker = p.stage === "attacker";
	const who = isAttacker ? c.attacker : c.defender;
	if (who !== seat) return "notYourTurn";
	const colour = p.kind === "warSupport" ? p.colour : "R";
	const hand = s.players[seat].hand;
	if (count < 0 || count > hand[colour]) return "notEnoughTiles";
	hand[colour] -= count;
	if (isAttacker) {
		c.attackerSupport += count;
		c.attackerSent = true;
	} else {
		c.defenderSupport += count;
		c.defenderSent = true;
	}
	s.history.push({ s: seat, a: "support", n: count, c: colour });
	if (isAttacker) {
		p.stage = "defender";
		p.seat = c.defender;
		return null;
	}
	if (p.kind === "warSupport") {
		resolveWarConflict(s, c);
		return null;
	}
	resolveRevolt(s, c);
	return null;
}

function resolveRevolt(s, c) {
	const attackerBase = neighbours(c.attackerPos).filter((n) => s.tiles[n] === COLOUR_CODE.R).length;
	const defenderBase = neighbours(c.defenderPos).filter((n) => s.tiles[n] === COLOUR_CODE.R).length;
	const attackerTotal = attackerBase + c.attackerSupport;
	const defenderTotal = defenderBase + c.defenderSupport;
	const attackerWins = attackerTotal > defenderTotal;
	const winner = attackerWins ? c.attacker : c.defender;
	const loserPos = attackerWins ? c.defenderPos : c.attackerPos;
	s.players[winner].score.R += 1;
	removeLeader(s, loserPos);
	s.history.push({ s: winner, a: "revolt", p: c.attackerPos });
	s.revolt = null;
	s.pending = null;
	processFollowUp(s, s.followUp);
}

function countColourInKingdom(s, pos, colour, ignoreUnification) {
	const k = kingdomAt(s, pos, ignoreUnification);
	return k.tileCounts[colour];
}

function resolveWarConflict(s, conflict) {
	const colour = conflict.colour;
	const attackerBase = countColourInKingdom(s, conflict.attackerPos, colour, true);
	const defenderBase = countColourInKingdom(s, conflict.defenderPos, colour, true);
	const attackerTotal = attackerBase + conflict.attackerSupport;
	const defenderTotal = defenderBase + conflict.defenderSupport;
	const attackerWins = attackerTotal > defenderTotal;
	const winner = attackerWins ? conflict.attacker : conflict.defender;
	const loserPos = attackerWins ? conflict.defenderPos : conflict.attackerPos;

	// Snapshot the loser's kingdom while its leader still connects the tiles.
	const loserKingdom = kingdomAt(s, loserPos, true);
	s.players[winner].score[colour] += 1;

	removeLeader(s, loserPos);
	const code = COLOUR_CODE[colour];
	const toRemove = [];
	for (const pos of loserKingdom.map) {
		if (pos === s.unification) continue;
		if (s.tiles[pos] !== code) continue;
		if (s.monuments.some((m) => coversCell(m, pos))) continue;
		if (colour === "R") {
			const treasure = s.treasures[pos];
			const otherLeader = neighbours(pos).some((n) => s.leaders[n] !== null);
			if (treasure || otherLeader) continue;
		}
		toRemove.push(pos);
	}
	for (const pos of toRemove) {
		s.tiles[pos] = 0;
		s.leaders[pos] = null;
	}
	s.players[winner].score[colour] += toRemove.length;
	for (const pos of toRemove) {
		for (const n of neighbours(pos)) evictIfNoTemple(s, n);
	}
	s.history.push({ s: winner, a: "war", c: colour, p: conflict.attackerPos, n: toRemove.length });

	s.war.conflicts = s.war.conflicts.filter((c) => c !== conflict);
	s.war.conflicts = s.war.conflicts.filter(
		(c) =>
			s.leaders[c.attackerPos]?.c === c.colour &&
			s.leaders[c.defenderPos]?.c === c.colour &&
			pathConnected(s, c.attackerPos, c.defenderPos),
	);
	s.pending = null;
	if (s.war.conflicts.length > 0) startWarOrderOrSupport(s);
	else finishWar(s);
}

function finishWar(s) {
	const at = s.war.at;
	const colour = s.war.placedColour;
	s.tiles[at] = COLOUR_CODE[colour];
	s.unification = -1;
	s.war = null;
	s.pending = null;
	processFollowUp(s, { pos: at, colour });
}

/* ------------------------------------------------------------------ */
/* Turn end                                                            */
/* ------------------------------------------------------------------ */

function finishAction(s) {
	s.pending = null;
	s.followUp = null;
	s.actionsUsed += 1;
	if (s.actionsUsed >= 2) endTurn(s);
}

function endTurn(s) {
	scoreMonuments(s);
	const empty = refreshHands(s);
	if (empty) {
		finishGame(s, "bag");
		return;
	}
	if (boardTreasureCount(s) <= 2) {
		finishGame(s, "treasures");
		return;
	}
	s.actionsUsed = 0;
	s.activeSeat = (s.activeSeat + 1) % s.numSeats;
	s.turnNumber += 1;
	s.pending = null;
	s.followUp = null;
}

function scoreMonuments(s) {
	const seat = s.activeSeat;
	for (const m of s.monuments) {
		const k = kingdomAt(s, m.at);
		for (const colour of MONUMENT_COLOURS[m.t]) {
			if (k.leaders[colour]?.seat === seat) s.players[seat].score[colour] += 1;
		}
	}
}

function refreshHands(s) {
	for (let seat = 0; seat < s.numSeats; seat++) {
		const p = s.players[seat];
		const need = 6 - handTotal(p.hand);
		if (need <= 0) continue;
		const drawn = drawTiles(s.bag, need, Math.random);
		giveTiles(p, drawn.tiles);
		if (drawn.short) return true;
	}
	return false;
}

function finishGame(s, reason) {
	s.gameOver = true;
	s.pending = null;
	s.followUp = null;
	s.war = null;
	s.revolt = null;
	s.standings = computeStandings(s);
	s.history.push({ s: -1, a: "over", r: reason });
}

function removeLeader(s, pos) {
	const leader = s.leaders[pos];
	if (!leader) return;
	const player = s.players[leader.s];
	if (player.leaders[leader.c] === pos) player.leaders[leader.c] = null;
	s.leaders[pos] = null;
}

function evictIfNoTemple(s, pos) {
	if (s.leaders[pos] === null) return;
	if (isAdjacentToTemple(s, pos)) return;
	removeLeader(s, pos);
	s.history.push({ s: s.activeSeat, a: "evict", p: pos });
}

export function conflictStanding(state, pending) {
	if (!pending) return null;
	let c;
	let colour;
	let attackerBase;
	let defenderBase;
	if (pending.kind === "revoltSupport") {
		c = state.revolt;
		colour = "R";
		attackerBase = neighbours(c.attackerPos).filter((n) => state.tiles[n] === COLOUR_CODE.R).length;
		defenderBase = neighbours(c.defenderPos).filter((n) => state.tiles[n] === COLOUR_CODE.R).length;
	} else if (pending.kind === "warSupport") {
		c = state.war.conflicts.find((x) => x.colour === pending.colour);
		colour = pending.colour;
		attackerBase = countColourInKingdom(state, c.attackerPos, colour, true);
		defenderBase = countColourInKingdom(state, c.defenderPos, colour, true);
	} else {
		return null;
	}
	const attackerTotal = attackerBase + c.attackerSupport;
	const defenderTotal = defenderBase + c.defenderSupport;
	return {
		colour,
		attacker: c.attacker,
		defender: c.defender,
		attackerBase,
		defenderBase,
		attackerSupport: c.attackerSupport,
		defenderSupport: c.defenderSupport,
		attackerTotal,
		defenderTotal,
		winnerIfNow: attackerTotal > defenderTotal ? c.attacker : c.defender,
	};
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

export function scoresAfterTreasures(player) {
	const scores = { ...player.score };
	for (let i = 0; i < player.treasures; i++) {
		let lowest = "R";
		for (const c of COLOURS) if (scores[c] < scores[lowest]) lowest = c;
		scores[lowest] += 1;
	}
	return scores;
}

export function playerScore(player) {
	const scores = scoresAfterTreasures(player);
	return Math.min(scores.R, scores.B, scores.G, scores.K);
}

export function computeStandings(s) {
	const rows = [];
	for (let seat = 0; seat < s.numSeats; seat++) {
		const p = s.players[seat];
		const scores = scoresAfterTreasures(p);
		rows.push({
			seat,
			score: Math.min(scores.R, scores.B, scores.G, scores.K),
			treasures: p.treasures,
			total: scores.R + scores.B + scores.G + scores.K,
			scores,
		});
	}
	rows.sort(
		(a, b) =>
			b.score - a.score ||
			b.treasures - a.treasures ||
			b.total - a.total ||
			a.seat - b.seat,
	);
	const top = rows[0].score;
	const winners = rows.filter((r) => r.score === top).map((r) => r.seat);
	return { rows, winners };
}

/* ------------------------------------------------------------------ */
/* Helpers for the UI                                                  */
/* ------------------------------------------------------------------ */

