import test from "node:test";
import assert from "node:assert/strict";

import { cycleSwapCount, neededColours } from "./LBRview.js";

test("swap selection adds one tile and wraps back to zero", () => {
	assert.equal(cycleSwapCount(0, 3, 0), 1);
	assert.equal(cycleSwapCount(1, 3, 1), 2);
	assert.equal(cycleSwapCount(2, 3, 2), 3);
	assert.equal(cycleSwapCount(3, 3, 3), 0);
});

test("swap selection never goes past six tiles in total", () => {
	assert.equal(cycleSwapCount(0, 3, 6), 0);
	assert.equal(cycleSwapCount(1, 3, 5), 2);
	assert.equal(cycleSwapCount(1, 3, 7), 0, "a saved over-limit draft still resets");
});

test("needed colours are the ones holding the lowest score", () => {
	assert.deepEqual(neededColours({ score: { R: 3, B: 1, G: 2, K: 0 }, treasures: 0 }), ["K"]);
	assert.deepEqual(neededColours({ score: { R: 2, B: 2, G: 1, K: 2 }, treasures: 0 }), ["G"]);
});

test("needed colours count treasures as wild cubes", () => {
	// Three treasures lift 3/1/2/0 to 3/2/2/2, so every bottom colour needs work.
	assert.deepEqual(neededColours({ score: { R: 3, B: 1, G: 2, K: 0 }, treasures: 3 }), ["B", "G", "K"]);
});

test("needed colours are all four when the scores are level", () => {
	assert.deepEqual(neededColours({ score: { R: 1, B: 1, G: 1, K: 1 }, treasures: 0 }), ["R", "B", "G", "K"]);
});
