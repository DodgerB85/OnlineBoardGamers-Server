// Run with: npm test
import assert from "node:assert/strict"
import { test } from "vitest"

import * as rf from "./RNBreference.js"

test("MBA (Coast) is a shore building, not an open-sea building", () => {
	const stats = rf.BUILDING_STATS.find((b) => b.building === rf.BLDG_MBA_COAST)
	assert.ok(stats.isValidTerrain(rf.TERR_PASTURE, true), "offered on a sea or river shore")
	assert.ok(!stats.isValidTerrain(rf.TERR_SEA, false), "not offered on open sea")
	assert.ok(!stats.isValidTerrain(rf.TERR_DESERT, true), "not offered on a desert shore")
})

test("city production order follows the &c list", () => {
	const order = [
		rf.BLDG_SAWMILL,
		rf.BLDG_POWER_PLANT,
		rf.BLDG_PAPERMILL,
		rf.BLDG_COAL_BURNER,
		rf.BLDG_MINT,
		rf.BLDG_STOCK_EXCHANGE,
		rf.BLDG_RAFT_FACTORY,
		rf.BLDG_WAGON_FACTORY,
		rf.BLDG_ROWBOAT_FACTORY,
		rf.BLDG_TRUCK_FACTORY,
		rf.BLDG_STEAMER_FACTORY,
		rf.BLDG_AEROPORT,
		rf.BLDG_MBA_PASTURE,
		rf.BLDG_BOMB_FACTORY,
		rf.BLDG_ATELIER,
	]
	for (let i = 1; i < order.length; i++) {
		assert.ok(rf.cityProductionOrderIndex(order[i - 1]) < rf.cityProductionOrderIndex(order[i]), `${order[i - 1]} before ${order[i]}`)
	}
})

test("setup conflicts stay on this turn; only the next production conflict rolls over", () => {
	// The setup panel lists this turn's production, movement, building, wonder,
	// then next turn's production. Movement/building/wonder conflicts are this turn.
	assert.equal(rf.getPrePhaseConflictTurn(2, rf.PHASE_PRODUCTION_SETUP_TO, 4), 2, "movement conflict")
	assert.equal(rf.getPrePhaseConflictTurn(2, rf.PHASE_PRODUCTION_SETUP_TO, 8), 2, "building conflict")
	assert.equal(rf.getPrePhaseConflictTurn(2, rf.PHASE_PRODUCTION_SETUP_TO, 12), 2, "wonder conflict")
	assert.equal(rf.getPrePhaseConflictTurn(2, rf.PHASE_PRODUCTION_SETUP_TO, 16), 3, "next production conflict")
	// A +16 offset on a row (an older list built from setup+4) is not an extra turn.
	assert.equal(rf.getPrePhaseConflictTurn(2, rf.PHASE_PRODUCTION_SETUP_TO, 20), 2, "offset movement conflict")
	// Normal main-phase lists keep their existing turn maths.
	assert.equal(rf.getPrePhaseConflictTurn(2, rf.PHASE_PRODUCTION_TO, 4), 2)
	assert.equal(rf.getPrePhaseConflictTurn(2, rf.PHASE_PRODUCTION_TO, 16), 3)
	assert.equal(rf.getPrePhaseConflictTurn(2, rf.PHASE_WONDER_TO, 16), 3)
})

test("&c building stats match the rulebook costs, recipes and module gates", () => {
	const stats = (type) => rf.BUILDING_STATS.find((b) => b.building === type)

	const power = stats(rf.BLDG_POWER_PLANT)
	assert.deepEqual(power.cost, [rf.RES_STONE, rf.RES_STONE, rf.RES_STONE], "power plant costs 3 stone")
	assert.equal(power.startingOptionRequired, rf.SO_ELECTRICITY)

	const aeroport = stats(rf.BLDG_AEROPORT)
	assert.deepEqual(aeroport.cost, [rf.RES_STONE, rf.RES_STONE], "aeroport costs 2 stone")
	assert.deepEqual(aeroport.inputRes[0], [rf.RES_GOOSE, rf.RES_BOARDS, rf.RES_BOARDS], "plane costs 1 goose + 2 boards")
	assert.deepEqual(aeroport.outputRes, [rf.PLANE])
	assert.equal(aeroport.maxConversions, 1, "one plane per round")
	assert.equal(aeroport.requiredResearchIndex, -1, "no research required")
	assert.equal(aeroport.startingOptionRequired, rf.SO_PLANES)

	const bomb = stats(rf.BLDG_BOMB_FACTORY)
	assert.deepEqual(bomb.cost, [rf.RES_BOARDS, rf.RES_BOARDS, rf.RES_STONE], "bomb factory costs 2 boards + 1 stone")
	assert.deepEqual(bomb.inputRes[0], [rf.RES_FUEL, rf.RES_IRON], "bomb costs 1 fuel + 1 iron")
	assert.equal(bomb.maxConversions, 1, "one bomb per round")
	assert.equal(bomb.requiredResearchIndex, -1)
	assert.equal(bomb.startingOptionRequired, rf.SO_BOMBS)

	const atelier = stats(rf.BLDG_ATELIER)
	assert.deepEqual(atelier.cost, [rf.RES_BOARDS, rf.RES_BOARDS, rf.RES_STONE], "atelier costs 2 boards + 1 stone")
	assert.deepEqual(
		atelier.recipes.map((r) => r.output),
		[rf.RES_WOOD_CARVING, rf.RES_RING, rf.RES_SKETCH, rf.RES_POTTERY, rf.RES_STATUE, rf.EXHIBITION_TRANSPORTER]
	)
	assert.equal(atelier.startingOptionRequired, rf.SO_ART)

	const pearl = stats(rf.BLDG_PEARL_FISHERY)
	assert.deepEqual(pearl.cost, [rf.RES_BOARDS, rf.RES_BOARDS, rf.RES_BOARDS], "pearl fishery costs 3 boards")
	assert.deepEqual(pearl.inputRes[0], [rf.RES_STONE])
	assert.deepEqual(pearl.outputRes, [rf.RES_PEARL])
	assert.ok(pearl.isValidTerrain(rf.TERR_SEA, false), "pearl fishery is sea-only")
	assert.ok(!pearl.isValidTerrain(rf.TERR_PASTURE, true), "not on land")

	for (const mba of rf.ALL_MBA_BUILDINGS) {
		const mbaStats = stats(mba)
		assert.deepEqual(mbaStats.cost, [rf.RES_BOARDS, rf.RES_BOARDS], "MBA costs 2 boards")
		assert.deepEqual(mbaStats.inputRes[0], [rf.RES_GOLD], "MBA consumes 1 gold")
		assert.deepEqual(mbaStats.outputRes, [rf.RES_MANAGER], "MBA produces a manager")
		assert.equal(mbaStats.maxConversions, 1)
		assert.equal(mbaStats.startingOptionRequired, rf.SO_MANAGEMENT)
	}
	assert.ok(stats(rf.BLDG_MBA_WOODS).isValidTerrain(rf.TERR_WOODS, false), "woods MBA on woods")
	assert.ok(stats(rf.BLDG_MBA_MOUNTAIN).isValidTerrain(rf.TERR_MOUNTAINS, false), "mountain MBA on mountains")
	assert.ok(stats(rf.BLDG_MBA_ROCK).isValidTerrain(rf.TERR_ROCK, false), "rock MBA on rock")
	assert.ok(stats(rf.BLDG_MBA_PASTURE).isValidTerrain(rf.TERR_PASTURE, false), "pasture MBA on pasture")
	assert.ok(stats(rf.BLDG_MBA_DESERT).isValidTerrain(rf.TERR_DESERT, false), "desert MBA on desert, even before irrigation")
	assert.ok(stats(rf.BLDG_MBA_COAST).isValidTerrain(rf.TERR_PASTURE, true), "coast MBA on a shore")
	assert.ok(!stats(rf.BLDG_MBA_COAST).isValidTerrain(rf.TERR_SEA, false), "not on open sea")
})
