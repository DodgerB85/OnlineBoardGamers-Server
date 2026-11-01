// End-to-end smoke test for an AI seat setup.
//
// Play an AI-vs-AI game through the vendored policy engine and validate every
// returned action with LBRrules before accepting it. This is the integration
// counterpart of lbr_step.test.mjs: it proves the engine and the client rules
// engine agree on the action vocabulary.
//
// Usage: node LBR/ai/smoke.mjs [moves]
//   LBR_AI_BIN / LBR_AI_MODEL override the default paths in LBR/ai-service.
import { spawnSync } from "node:child_process";
import { applyAction, createInitialState, currentActor } from "../vueLBR/src/js/LBRrules.js";

const bin = process.env.LBR_AI_BIN || new URL("../ai-service/target/release/lbr-policy", import.meta.url).pathname;
const model = process.env.LBR_AI_MODEL || new URL("../ai-service/models/best.bin", import.meta.url).pathname;
const limit = Number(process.argv[2] || 40);

let seed = 20261031;
function rng() {
	seed = (seed * 1664525 + 1013904223) >>> 0;
	return seed / 4294967296;
}

function decide(state, seat) {
	const request = { state, seat };
	const child = spawnSync(bin, ["lbr-move", "--sims", "400", "--alpha", "0.7", "--net", model], {
		input: JSON.stringify(request),
		encoding: "utf8",
		timeout: 30000,
	});
	if (child.error) throw new Error(`policy engine failed: ${child.error.message}`);
	if (child.status !== 0) throw new Error(`policy engine error ${child.status}: ${child.stderr}`);
	return JSON.parse(child.stdout).action;
}

let state = createInitialState(4, rng);
for (let decision = 0; decision < limit; decision++) {
	const seat = currentActor(state);
	const action = decide(state, seat);
	const result = applyAction(state, seat, action);
	if (result.error) throw new Error(`illegal action ${JSON.stringify(action)}: ${result.error}`);
	state = result.state;
	if (state.gameOver) {
		console.log(`game over after ${decision + 1} decisions`);
		process.exit(0);
	}
}
console.log(`ok: ${limit} decisions, every action legal per LBRrules`);
