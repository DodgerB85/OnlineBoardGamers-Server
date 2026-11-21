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
