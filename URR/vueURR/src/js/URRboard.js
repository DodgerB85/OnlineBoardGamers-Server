/** Transcription of static/URR/images/ur-map.png, with neutral river areas.
 * Rows run north to south; columns run west to east. Regions cross state borders.
 */
import * as rf from "./URRreference.js"
import { PRINTED_HEXES } from "./URRboardDisplay.js"

// H/F/S/D = hills/forest/savannah/desert; * marks a city; R = river.
// A/B/E/P/S/U = Akkad/Babylon/Elam/Persia/Sumer/Urartu.
const ROWS = [
	"HU HU FU HU R HP H*P FP FP DP",
	"R R HU F*U HU R HP FA FP HP",
	"HU R FU FA HA R F*A HP HP HP",
	"FU HU R FB FA FA R R R R",
	"FB FB R SA SA SA R FE FE R",
	"D*B DB SB R SS SS R FE DE D*E",
	"DB S*B R R R R R SE DE DE",
	"DB DB SS R SS D*S SS SE DE D*E",
	"D*B DS SS R SS SS SS SE DE DE",
]
const STATES = { A: rf.STATE_AKKAD, B: rf.STATE_BABYLON, E: rf.STATE_ELAM, P: rf.STATE_PERSIA, S: rf.STATE_SUMER, U: rf.STATE_URARTU }
const TERRAIN = { H: rf.LAND_HILLS, F: rf.LAND_FOREST, S: rf.LAND_SAVANNAH, D: rf.LAND_DESERT }
const id = (row, column) => `printed-${row}-${column}`
const HOMELANDS = {
	[id(4, 7)]: rf.NATION_ASHUR,
	[id(7, 1)]: rf.NATION_BARAHSHUM,
	[id(3, 1)]: rf.NATION_CALAH, [id(4, 1)]: rf.NATION_CALAH,
	[id(1, 4)]: rf.NATION_DER, [id(2, 4)]: rf.NATION_DER,
	[id(8, 6)]: rf.NATION_ERIDU, [id(8, 7)]: rf.NATION_ERIDU, [id(8, 8)]: rf.NATION_ERIDU,
	[id(4, 3)]: rf.NATION_FIRST_AKKADIANS, [id(4, 4)]: rf.NATION_FIRST_AKKADIANS, [id(4, 5)]: rf.NATION_FIRST_AKKADIANS,
}
const RIVERS = [
	[[1, 0], [1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [6, 2], [7, 3]],
	[[0, 4], [1, 5], [2, 5], [3, 6], [4, 6], [5, 6], [6, 6], [6, 5], [6, 4], [6, 3], [7, 3], [8, 3]],
	[[4, 9], [3, 9], [3, 8], [3, 7], [4, 6]],
]

export function createPrintedBoard(markerLimit = null) {
	const areas = ROWS.flatMap((row, rowIndex) => row.split(" ").map((cell, column) => {
		const areaId = id(rowIndex, column)
		return {
			id: areaId, label: `${String.fromCharCode(65 + rowIndex)}${column + 1}`,
			state: cell === "R" ? null : STATES[cell.at(-1)], landType: cell === "R" ? null : TERRAIN[cell[0]],
			isRiver: cell === "R", isCity: cell.includes("*"), nation: HOMELANDS[areaId] ?? null,
			display: { x: PRINTED_HEXES[rowIndex * 10 + column].x, y: PRINTED_HEXES[rowIndex * 10 + column].y },
			neighbours: [],
		}
	}))
	for (const area of areas) {
		area.neighbours = areas.filter((other) => other.id !== area.id && Math.hypot(other.display.x - area.display.x, other.display.y - area.display.y) < 105).map((other) => other.id)
	}
	let region = 0
	for (const area of areas) {
		if (area.isRiver || area.region !== undefined) continue
		area.region = `region-${region++}`
		const queue = [area]
		for (let index = 0; index < queue.length; index++) {
			for (const neighbourId of queue[index].neighbours) {
				const neighbour = areas.find((entry) => entry.id === neighbourId)
				if (!neighbour.isRiver && neighbour.region === undefined && neighbour.landType === area.landType) {
					neighbour.region = area.region
					queue.push(neighbour)
				}
			}
		}
	}
	const downstream = {}
	for (const river of RIVERS) {
		for (let index = 1; index < river.length; index++) downstream[id(...river[index - 1])] = id(...river[index])
	}
	downstream[id(8, 3)] = null
	return {
		areas, markerLimit,
		stateOrder: [rf.STATE_ELAM, rf.STATE_SUMER, rf.STATE_AKKAD, rf.STATE_BABYLON, rf.STATE_PERSIA, rf.STATE_URARTU],
		// Printed markers sheet: pumps and reservoirs share each capacity's supply.
		waterworkLimits: Object.fromEntries(rf.ALL_STATES.map((state) => [state, { 1: 3, 2: 6, 3: 3, 4: 5, 6: 3, 8: 3, M: 4 }])),
		canals: [[id(1, 4), id(2, 4)], [id(3, 1), id(4, 1)], [id(8, 6), id(8, 7)], [id(8, 7), id(8, 8)]],
		riverSources: RIVERS.map((river) => id(...river[0])), riverDownstream: downstream,
	}
}
