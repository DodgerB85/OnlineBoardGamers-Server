import test from "node:test";
import assert from "node:assert/strict";

import { neededColours, toggleSwapPick } from "./LBRview.js";

test("swap tiles are picked one at a time and only the clicked one goes back", () => {
	assert.deepEqual(toggleSwapPick({}, 1, 0), { 0: true });
	assert.deepEqual(toggleSwapPick({}, 3, 0), { 2: true }, "a later tile picks only itself");
	assert.deepEqual(toggleSwapPick({ 0: true, 1: true, 2: true }, 2, 3), { 0: true, 2: true }, "the clicked tile alone is put back");
});

test("swap selection never goes past six tiles in total", () => {
	assert.deepEqual(toggleSwapPick({}, 1, 6), {}, "picking a seventh is refused");
	assert.deepEqual(toggleSwapPick({ 0: true }, 1, 6), {}, "putting one back is always allowed");
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
