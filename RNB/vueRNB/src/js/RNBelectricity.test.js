// Run with: npm test
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "vitest"
import { runInNewContext } from "node:vm"

test("explicit carried fuel leaves the board preference to default choices", () => {
	const source = readFileSync(join(import.meta.dirname, "RNBelectricity.js"), "utf8")
	const first = source.indexOf("export function getCarriedFuelOnTile")
	const last = source.indexOf("// Player hook", first)
	const rf = { RES_TRUNKS: 0, RES_BOARDS: 1 }
	const trunk = { id: 0, uniqueID: "trunk", type: rf.RES_TRUNKS }
	const board = { id: 1, uniqueID: "board", type: rf.RES_BOARDS }
	const gold = { id: 2, uniqueID: "gold", type: 8 }
	const findFuel = runInNewContext(source.slice(first, last).replaceAll("export function", "function") + "findFuelOnTransporterOnTile", {
		rf,
		loc: { isSpecificHexLocation: (location, hexID) => location[1] === hexID },
		model: {
			getTransporterByID: (id) => ({ id, location: [7, 13] }),
			resourcesOnTransport: (id) => id === 0 ? [trunk, board, gold] : [],
		},
	})

	assert.equal(findFuel(0, 13), board)
	assert.equal(findFuel(0, 13, 0), trunk)
	assert.equal(findFuel(0, 13, "trunk"), trunk)
	assert.equal(findFuel(0, 13, "gold"), null)
	assert.equal(findFuel(0, 12, "trunk"), null)
	assert.equal(findFuel(1, 13, "trunk"), null)
})
