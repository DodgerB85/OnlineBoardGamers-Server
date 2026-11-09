import assert from "node:assert/strict"
import test from "node:test"
import { actingPlayerIndex, assignArray, canPairNicoloHouse, clampFamine, countsForSanGiorgioWin } from "./AQYrules.js"

test("San Nicolo can pair house 25 with a free lower house", () => {
	assert.equal(canPairNicoloHouse(25), true)
	assert.equal(canPairNicoloHouse(26), true)
	assert.equal(canPairNicoloHouse(24), false)
})

test("assignArray replaces instead of leaving stale entries", () => {
	const target = [21, 22, 23, 24, 25]
	assignArray(target, [21, 22])
	assert.deepEqual(target, [21, 22])
})

test("famine display never goes below zero", () => {
	assert.equal(clampFamine(0, 2), 0)
	assert.equal(clampFamine(3, 1), 2)
})

test("training games act as the current player", () => {
	assert.equal(actingPlayerIndex(true, 0, 2), 2)
	assert.equal(actingPlayerIndex(false, 0, 2), 0)
})

test("a player gone before placing a city does not count for San Giorgio", () => {
	assert.equal(countsForSanGiorgioWin(true, 0), false)
	assert.equal(countsForSanGiorgioWin(true, 37), true)
	assert.equal(countsForSanGiorgioWin(false, 30), true)
})
