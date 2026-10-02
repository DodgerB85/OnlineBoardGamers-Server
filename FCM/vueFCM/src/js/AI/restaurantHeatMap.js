/**
 * Starting-restaurant placement heat map, used by FCM_AI level 2.
 *
 * The board is not passed in: all board state lives in the pinia store
 * (store.mapData.coords / store.mapData.tiles), which every FCMmap helper reads
 * from. So "board_state" here is just `useModelStore()`.
 *
 * Everything is built out of existing FCM helpers rather than re-deriving road
 * traversal:
 *   - rules.givePossibleStartingRestaurantsPosition -> the legal 2x2 spots
 *   - map.areaRoad(index, 1)                        -> the connected road system
 *   - map.giveTileNumber                            -> canonical tile ids
 *
 * KEY INSIGHT that makes the whole thing cheap:
 *   areaRoad() returns a `range` that decrements by one every time the road
 *   leaves the tile it started on. So one areaRoad(entrance, 1) call yields, in a
 *   single pass:
 *     range === 1  -> road on the SAME tile as the entrance   (distance 0)
 *     range === 0  -> road exactly ONE tile boundary away      (distance 1)
 *     nothing negative survives, so nothing further is reached
 *   Both house tiers fall straight out of that.
 */

import * as rf from "../FCMreference"
import * as map from "../FCMmap"
import * as rules from "../FCMrules"
import { useModelStore } from "../../stores/FCMstore.js"

// --- Weights -------------------------------------------------------------
export const W_SAME_TILE_HOUSE = 100 // house on the entrance's tile, road-connected
export const W_ADJACENT_TILE_HOUSE = 30 // house one tile crossing away, road-connected
export const W_DRIVE_THRU = 40 // footprint straddles a tile edge AND touches a road on the far tile
export const W_TILE_BOUNDARY = 10 // per unique tile boundary the adjacent road system crosses
// Not in the original spec, which only said "can also be a strong move". Priced
// between one adjacent house and the drive-thru bonus: it should beat merely
// reaching a neighbouring tile, but not beat a genuinely good corner.
export const W_OVERPASS_DUAL_NETWORK = 60

// Range handed to areaRoad: 1 = own tile plus one crossing. Raise to 2 for a
// three-tier house weighting, at roughly double the cost.
const SEARCH_RANGE = 1

const ROAD_IDS = new Set(rf.ROADS)
const HOUSE_IDS = new Set(rf.HOUSE_SQS)

/**
 * The four squares of a 2x2 footprint.
 * @param {number} index top-left index of the footprint
 * @returns {number[]} [topLeft, topRight, bottomLeft, bottomRight]
 */
function footprintOf(index) {
	return [index, index + 1, index + rf.ssW, index + rf.ssW + 1]
}

/**
 * Every major map tile containing at least one overpass/bridge square.
 * @returns {Map<number, number>} tile id -> number of bridge squares on it
 */
function bridgesByTile(coords) {
	const res = new Map()
	for (let i = 0; i < coords.length; i++) {
		if (rf.BRIDGES.includes(coords[i])) {
			const tile = map.giveTileNumber(i)
			res.set(tile, (res.get(tile) || 0) + 1)
		}
	}
	return res
}

/**
 * Entrance index of every restaurant already on the board, across all players.
 * @returns {number[]}
 */
export function existingEntrances() {
	const store = useModelStore()
	const res = []
	for (const player of store.players) {
		for (const resto of player.restaurants) {
			if (Number.isInteger(resto.index)) res.push(resto.index + rules.getOffsetForRotation(resto.rotation))
		}
	}
	return res
}

/**
 * Road network, tier map and straddling state around one candidate entrance.
 *
 * Overpasses are honoured: `ignoreCrossing` is deliberately NOT set, so a
 * bridge does not join the roads running perpendicular to it.
 *
 * @param {number} entrance empty square the restaurant door would sit on
 * @param {number[]} footprint the four squares of the 2x2
 * @returns {{entries: {index: number, range: number}[], adjacentRoads: number[], boundaries: Set<string>, straddles: boolean}}
 */
function readRoadSystem(entrance, footprint) {
	const store = useModelStore()
	const coords = store.mapData.coords

	// Roads touching any part of the footprint; reused by the drive-thru and
	// overpass checks.
	const adjacentRoads = map.neighbours(footprint).filter((sq) => ROAD_IDS.has(coords[sq]))

	const entries = map.areaRoad(entrance, SEARCH_RANGE, false)

	// Unique tile boundaries the system touches: a road square sitting next to a
	// road square on a different tile.
	const boundaries = new Set()
	for (const entry of entries) {
		const a = map.giveTileNumber(entry.index)
		for (const n of map.giveNeighbours(entry.index)) {
			if (!ROAD_IDS.has(coords[n])) continue
			const b = map.giveTileNumber(n)
			if (a !== b) boundaries.add(a < b ? a + ":" + b : b + ":" + a)
		}
	}

	return { entries, adjacentRoads, boundaries, straddles: new Set(footprint.map((sq) => map.giveTileNumber(sq))).size > 1 }
}

/**
 * Count road-connected houses per distance tier.
 *
 * Houses are keyed by number (coord - rf.HOUSE) so a multi-square house zone
 * counts once, and a house touching both tiers is credited to the closer tier
 * only. Moved-out houses no longer read as house squares in coords, so they fall
 * out of this for free.
 *
 * @param {{index: number, range: number}[]} entries areaRoad output
 * @returns {{sameTile: number, adjacentTile: number}}
 */
function countHouses(entries) {
	const store = useModelStore()
	const coords = store.mapData.coords

	const seen = new Set()
	let sameTile = 0
	let adjacentTile = 0

	for (const entry of entries) {
		for (const n of map.giveNeighbours(entry.index)) {
			const coord = coords[n]
			if (!HOUSE_IDS.has(coord)) continue
			const house = coord - rf.HOUSE
			if (seen.has(house)) continue
			seen.add(house)
			if (entry.range === SEARCH_RANGE) sameTile++
			else if (entry.range === SEARCH_RANGE - 1) adjacentTile++
		}
	}

	return { sameTile, adjacentTile }
}

/**
 * Drive-thru potential: the footprint must straddle a tile edge AND have its
 * secondary corners touching a road over on the neighbouring tile, so a
 * Local/Regional Manager could later serve across the border.
 *
 * @param {number[]} footprint
 * @param {number} entranceTile
 * @returns {boolean}
 */
function hasDriveThru(footprint, entranceTile) {
	const store = useModelStore()
	const coords = store.mapData.coords

	for (const sq of footprint) {
		if (map.giveTileNumber(sq) === entranceTile) continue // not a secondary corner
		for (const n of map.giveNeighbours(sq)) {
			if (map.giveTileNumber(n) === entranceTile) continue
			if (ROAD_IDS.has(coords[n])) return true
		}
	}
	return false
}

// --- Public API -----------------------------------------------------------

/**
 * Score every legal starting restaurant placement.
 *
 * @param {number[]} [opponentEntrances] entrance indexes whose tile may not be
 *   reused. Defaults to every restaurant already on the board.
 * @returns {Map<string, {index: number, rotation: number, x: number, y: number, score: number, breakdown: object}>}
 *   keyed `"x,y,rotation"`.
 */
export function generatePlacementHeatMap(opponentEntrances = existingEntrances()) {
	const store = useModelStore()
	const coords = store.mapData.coords

	const forbiddenTiles = new Set(opponentEntrances.map((sq) => map.giveTileNumber(sq)))
	const bridges = bridgesByTile(coords)
	const results = new Map()

	// givePossibleStartingRestaurantsPosition already enforces the rules that
	// matter: 4 empty squares (so no road, house, drink source or building), a
	// road orthogonally adjacent to the entrance corner, and not the tile the
	// previous player used.
	for (let rotation = 0; rotation < 4; rotation++) {
		for (const index of rules.givePossibleStartingRestaurantsPosition(rotation)) {
			const entrance = index + rules.getOffsetForRotation(rotation)
			const entranceTile = map.giveTileNumber(entrance)

			// Sharing a tile with an opponent entrance is out, however good the roads are.
			if (forbiddenTiles.has(entranceTile)) continue

			const footprint = footprintOf(index)
			const sys = readRoadSystem(entrance, footprint)

			const houses = countHouses(sys.entries)

			// Overpass case: sit wholly on the bridging tile with roads from BOTH
			// sides of the overpass in reach of the footprint.
			const reachable = new Set(sys.entries.map((entry) => entry.index))
			const unreachable = sys.adjacentRoads.filter((sq) => !reachable.has(sq)).length
			const overpassDualNetwork = !sys.straddles && bridges.has(entranceTile) && unreachable > 0 && sys.adjacentRoads.length - unreachable > 0

			const breakdown = {
				sameTileHouses: houses.sameTile,
				adjacentTileHouses: houses.adjacentTile,
				driveThru: hasDriveThru(footprint, entranceTile),
				tileBoundaries: sys.boundaries.size,
				overpassDualNetwork,
			}

			const score =
				breakdown.sameTileHouses * W_SAME_TILE_HOUSE +
				breakdown.adjacentTileHouses * W_ADJACENT_TILE_HOUSE +
				(breakdown.driveThru ? W_DRIVE_THRU : 0) +
				breakdown.tileBoundaries * W_TILE_BOUNDARY +
				(breakdown.overpassDualNetwork ? W_OVERPASS_DUAL_NETWORK : 0)

			const [x, y] = map.giveCoord(index)
			results.set(x + "," + y + "," + rotation, { index, rotation, x, y, score, breakdown })
		}
	}

	return results
}

/**
 * Highest scoring placement in a heat map.
 *
 * @param {Map<string, object>} heatMap
 * @param {() => number} [tieBreak] random number in [0,1), used to break ties so
 *   the AI is not deterministic.
 * @returns {{index: number, rotation: number, score: number, breakdown: object}|null}
 */
export function findBestPlacement(heatMap, tieBreak = Math.random) {
	let best = null
	for (const entry of heatMap.values()) {
		if (best === null || entry.score > best.score || (entry.score === best.score && tieBreak() < 0.5)) best = entry
	}
	return best
}
