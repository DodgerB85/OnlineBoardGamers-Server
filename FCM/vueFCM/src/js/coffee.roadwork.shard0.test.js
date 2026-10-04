import { describe, it, expect } from "vitest"
import { hasFixture, hasPako, runRoadworkShard } from "./coffee.roadwork.shared.js"

// Keep in step across coffee.roadwork.shard0..N.test.js. See the PERFORMANCE
// note in coffee.roadwork.shared.js for why the fixture is split up.
const SHARD = 0
const SHARDS = 4

describe.skipIf(!hasFixture || !hasPako)(`getCoffeeRoute vs real legacy output, roadwork shard ${SHARD + 1}/${SHARDS}`, () => {
	it("matches legacy's roadwork indexes and real sales/commonSquares", async () => {
		const { rwMismatches, expectedRwMismatches, mismatches } = await runRoadworkShard(SHARD, SHARDS)

		expect(rwMismatches).toEqual(expectedRwMismatches)
		expect(mismatches).toEqual([])
	}, 120000)
})