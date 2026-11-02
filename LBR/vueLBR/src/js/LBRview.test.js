import test from "node:test";
import assert from "node:assert/strict";

import { cycleSwapCount } from "./LBRview.js";

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
