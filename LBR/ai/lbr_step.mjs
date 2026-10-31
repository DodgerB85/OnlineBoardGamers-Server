// Server-side LBR rules step for AI seats.
//
// The AI service only decides which action to take. This runner validates that
// action with the same LBRrules engine the browser uses and produces the next
// persisted state, so an AI move can never save an illegal position. If the
// action is rejected, a rules-derived default keeps the turn moving and the
// rejection is reported back to the caller.
//
// stdin:  {state, seat, action, playerNames} or {mode: "init", numSeats, playerNames}
// stdout: {stateJson, turn, phase, status, nextPlayer, winner, finalPositions,
//          fallback, rejectedAction} or {error}
import { applyAction, createInitialState, currentActor, phaseOf } from "../vueLBR/src/js/LBRrules.js";

function defaultAction(state) {
	const pending = state.pending;
	if (!pending) return { type: "pass" };
	if (pending.kind === "treasure") return { type: "treasure", keep: pending.keepOptions[0] };
	if (pending.kind === "warOrder") return { type: "warOrder", colour: state.war.conflicts[0].colour };
	if (pending.kind === "warSupport" || pending.kind === "revoltSupport") return { type: "support", count: 0 };
	if (pending.kind === "monument") return { type: "monument", build: null };
	return { type: "pass" };
}

function saveFields(state, playerNames, fallback, rejectedAction) {
	const standings = state.standings || { winners: [], rows: [] };
	const finished = !!state.gameOver;
	const actor = currentActor(state);
	return {
		stateJson: JSON.stringify(state),
		turn: state.turnNumber,
		phase: phaseOf(state),
		status: finished ? "FINISHED" : "ACTIVE",
		nextPlayer: finished ? [] : [playerNames[actor]],
		winner: finished ? standings.winners.map((s) => playerNames[s]) : [],
		finalPositions: finished ? standings.rows.map((row) => row.seat) : [],
		fallback,
		rejectedAction,
	};
}

let input = "";
for await (const chunk of process.stdin) input += chunk;
try {
	const request = JSON.parse(input);
	const playerNames = request.playerNames || [];

	// AI-only games have no client to deal the opening position.
	if (request.mode === "init") {
		const initial = createInitialState(request.numSeats);
		process.stdout.write(JSON.stringify(saveFields(initial, playerNames, false, null)));
	} else {
		const { state, seat } = request;
		let result = applyAction(state, seat, request.action);
		let rejectedAction = null;
		if (result.error) {
			rejectedAction = { action: request.action, error: result.error };
			result = applyAction(state, seat, defaultAction(state));
		}
		if (result.error) {
			process.exitCode = 1;
			process.stdout.write(JSON.stringify({ error: result.error }));
		} else {
			process.stdout.write(JSON.stringify(saveFields(result.state, playerNames, rejectedAction !== null, rejectedAction)));
		}
	}
} catch (error) {
	process.exitCode = 1;
	process.stdout.write(JSON.stringify({ error: String(error && error.message ? error.message : error) }));
}
