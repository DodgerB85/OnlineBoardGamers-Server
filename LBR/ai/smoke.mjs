// End-to-end smoke test for an AI seat setup.
//
// Play an AI-vs-AI game through the HTTP service and validate every returned
// action with LBRrules before accepting it. This is the integration counterpart
// of lbr_step.test.mjs: it proves the donor service and the client rules engine
// agree on the action vocabulary.
//
// Usage: LBR_AI_URL=http://127.0.0.1:8731/move node LBR/ai/smoke.mjs [moves]
import { applyAction, createInitialState, currentActor } from "../vueLBR/src/js/LBRrules.js";

const url = process.env.LBR_AI_URL || "http://127.0.0.1:8731/move";
const healthUrl = url.replace(/\/move$/, "/health");
const limit = Number(process.argv[2] || 40);

let seed = 20261031;
function rng() {
	seed = (seed * 1664525 + 1013904223) >>> 0;
	return seed / 4294967296;
}

const health = await fetch(healthUrl).then((response) => response.json());
if (!health.ok) throw new Error("service is not healthy");

let state = createInitialState(4, rng);
for (let decision = 0; decision < limit; decision++) {
	const seat = currentActor(state);
	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ state, seat }),
	});
	if (!response.ok) throw new Error(`service error ${response.status}: ${await response.text()}`);
	const { action } = await response.json();
	const result = applyAction(state, seat, action);
	if (result.error) throw new Error(`illegal action ${JSON.stringify(action)}: ${result.error}`);
	state = result.state;
	if (state.gameOver) {
		console.log(`game over after ${decision + 1} decisions`);
		process.exit(0);
	}
}
console.log(`ok: ${limit} decisions, every action legal per LBRrules`);
