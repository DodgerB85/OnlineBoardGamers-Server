// Run with: npm test
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "vitest"
import { runInNewContext } from "node:vm"

function fixture() {
	const root = import.meta.dirname
	const produceSource = readFileSync(join(root, "RNBproduce.js"), "utf8")
	const setupSource = readFileSync(join(root, "RNBproductionSetup.js"), "utf8")
	const extract = (source, name) => source.match(new RegExp("(function " + name + "\\([\\s\\S]*?\\n\\})"))[1]
	const rf = {
		BLDG_MINE: 58, RES_GOLD: 8, RES_IRON: 7, RES_PSEUDO_MINE: 28, RES_UPPER_LIMIT: 29,
		PRE_PHASE_OFFSET: 100, STACK_PRODUCTION_SETUP: 36, HIST_NEW_TURN: 0,
	}
	const mine = { id: 0, type: rf.BLDG_MINE, location: [7, 15, 0] }
	const plant = { id: 1, location: [7, 13, 0] }
	const store = { gameOptions: { useElectricity: true }, gameflow: { turn: 2 }, context: {}, history: [[rf.HIST_NEW_TURN, -1, 0, [1]], [rf.HIST_NEW_TURN, -1, 0, [2]]] }
	const outputs = []
	const rolls = []
	const model = {
		getBuildingByID: (id) => id === mine.id ? mine : plant,
		getBuildingStatsFromBuildingID: () => ({ outputRes: [rf.RES_IRON] }),
		isPrimaryProducer: (building) => building === mine,
		getAllInGameBuildings: () => [mine, plant],
		getTransporterByID: () => ({ id: 3 }),
		addResourceToGame_core: (type) => outputs.push(type),
	}
	const { draw, applySetup, playSetup } = runInNewContext([
		extract(produceSource, "addBuildingOutputResourcesToGame_core"),
		...["getDecisionsForPlayer", "addExtraMineOutput", "applyProductionSetup", "performSetupStackAction"].map((name) => extract(setupSource, name)),
		"({draw: addBuildingOutputResourcesToGame_core, applySetup: applyProductionSetup, playSetup: performSetupStackAction})",
	].join("\n"), {
		rf, model, useModelStore: () => store, usePersonalStore: () => ({}),
		Math: { random: () => { rolls.push(0.1); return 0.1 } },
		electricity: {
			getLocationPowerNodeKey: (location) => `${location[1]}:${location[2] ?? 0}`,
			isLocationPowered: (location) => store.context.poweredHexIDs.includes(location[1]),
			firePowerPlantFromTransporter: () => { store.context.poweredHexIDs = [15]; return [1, [13], 4] },
		},
		stack: { getBldgIDtoUse: (b) => b.id, getTransIDtoUse: (t) => t.id, compressLocation: (location) => [location[1]] },
		produce: { addBuildingOutputResourcesToGame_core: (...args) => draw(...args) },
	})
	const reset = (bag, { preview = false, powered = false } = {}) => {
		mine.remainingMineContent = [...bag]
		store.gameflow.phase = preview ? 103 : 17
		store.context.poweredBucketKeys = powered ? ["15:0"] : []
		store.context.poweredHexIDs = powered ? [15] : []
		outputs.length = 0
		rolls.length = 0
	}
	return { rf, mine, outputs, rolls, reset, draw, playSetup, choosePower: () => applySetup(0, [], [{ bldgID: plant.id, transporterID: 3 }]) }
}

test("preset production defers the extra mine draw and saves the live result for replay", () => {
	const { rf, mine, outputs, rolls, reset, draw, choosePower, playSetup } = fixture()
	reset([1, 1], { preview: true })
	draw(0, -1, 9, true)
	const action = choosePower()
	assert.deepEqual(outputs, [rf.RES_PSEUDO_MINE, rf.RES_PSEUDO_MINE])
	assert.equal(rolls.length, 0)
	assert.equal(action[4][0][3], -1)
	reset([1, 1], { preview: true })
	draw(0, -1, 9, true)
	playSetup(action, 0, { knownFinalHistoryidx: 0 })
	assert.equal(action[4][0][3], -1)
	assert.equal(rolls.length, 0)

	reset([1, 1])
	draw(0)
	playSetup(action, 0, {})
	assert.deepEqual(outputs, [rf.RES_GOLD, rf.RES_IRON])
	assert.deepEqual(mine.remainingMineContent, [0, 0])
	assert.equal(rolls.length, 2)
	assert.equal(action[4][0][3], rf.RES_IRON)

	reset([0, 1])
	playSetup(action, 0)
	assert.deepEqual(outputs, [rf.RES_IRON])
	assert.equal(rolls.length, 0)
})

test("old presets redraw in live play and skip mines already powered or empty", () => {
	const { rf, mine, outputs, rolls, reset, playSetup } = fixture()
	const oldPreset = () => [rf.STACK_PRODUCTION_SETUP, [], [[1, 3]], [], [[1, 0, [15], rf.RES_GOLD]]]
	const savedBeforeTurn = { knownFinalHistoryidx: 0 }
	reset([1, 1])
	playSetup(oldPreset(), 0, savedBeforeTurn)
	assert.equal(rolls.length, 1)
	reset([0, 1])
	playSetup(oldPreset(), 0, savedBeforeTurn)
	assert.deepEqual(outputs, [rf.RES_IRON])
	assert.deepEqual(mine.remainingMineContent, [0, 0])

	for (const [bag, options] of [[[1, 1], { powered: true }], [[0, 0], {}]]) {
		reset(bag, options)
		const action = oldPreset()
		playSetup(action, 0, savedBeforeTurn)
		assert.equal(action[4].length, 0)
		assert.deepEqual(outputs, [])
		assert.deepEqual(mine.remainingMineContent, bag)
	}
})
