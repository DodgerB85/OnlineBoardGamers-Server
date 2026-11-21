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
