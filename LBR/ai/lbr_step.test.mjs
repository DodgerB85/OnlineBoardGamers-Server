// Rules-step tests: the AI service's chosen action must be legal per LBRrules,
// and an illegal one must fall back to a legal default rather than reach the DB.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const STEP = new URL("./lbr_step.mjs", import.meta.url).pathname;

function run(payload) {
	const result = spawnSync(process.execPath, [STEP], {
		input: JSON.stringify(payload),
		encoding: "utf8",
	});
	return { status: result.status, out: JSON.parse(result.stdout || "{}"), err: result.stderr };
}

function initialState(numSeats = 4) {
	const { status, out } = run({ mode: "init", numSeats, playerNames: ["a", "b", "c", "d"].slice(0, numSeats) });
	assert.equal(status, 0);
	assert.equal(out.status, "ACTIVE");
	return { state: JSON.parse(out.stateJson), out };
}

test("init deals a complete opening position", () => {
	const { state, out } = initialState(4);
	assert.equal(state.numSeats, 4);
	assert.equal(state.tiles.length, 176);
	assert.equal(state.activeSeat, 0);
	assert.deepEqual(out.nextPlayer, ["a"]);
	assert.equal(state.players[0].hand.R + state.players[0].hand.B + state.players[0].hand.G + state.players[0].hand.K, 6);
});

test("a legal action is applied by LBRrules", () => {
	const { state } = initialState(2);
	const { status, out } = run({ state, seat: 0, action: { type: "pass" }, playerNames: ["a", "b"] });
	assert.equal(status, 0);
	assert.equal(out.fallback, false);
	const next = JSON.parse(out.stateJson);
	assert.equal(next.actionsUsed, 1);
	assert.equal(next.activeSeat, 0);
});

test("an illegal action falls back to a legal one and is reported", () => {
	const { state } = initialState(2);
	const occupied = state.tiles.findIndex((code) => code !== 0);
	const { status, out } = run({
		state,
		seat: 0,
		action: { type: "placeTile", colour: "R", pos: occupied },
		playerNames: ["a", "b"],
	});
	assert.equal(status, 0);
	assert.equal(out.fallback, true);
	assert.equal(out.rejectedAction.error, "occupied");
	const next = JSON.parse(out.stateJson);
	assert.equal(next.actionsUsed, 1);
});

test("pending decisions fall back to the rules-derived default", () => {
	const { state } = initialState(2);
	const pendingState = { ...state, pending: { kind: "monument", seat: 0, colour: "R", offers: [] } };
	const { status, out } = run({ state: pendingState, seat: 0, action: { type: "monument", build: { at: 0, type: "RG" } }, playerNames: ["a", "b"] });
	assert.equal(status, 0);
	assert.equal(out.fallback, true);
	const next = JSON.parse(out.stateJson);
	assert.equal(next.pending, null);
	assert.equal(next.actionsUsed, 1);
});
