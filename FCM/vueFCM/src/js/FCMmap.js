import * as rf from "./FCMreference"
import * as rules from "./FCMrules"
import * as controller from "./FCMcontroller"
import * as funcs from "./FCMfuncs"
import * as model from "./FCMmodel"
import * as plyr from "./FCMplayer"

import { toRaw } from "vue"
import { useModelStore } from "../stores/FCMstore.js"

const ROAD_IDS = new Set(rf.ROADS)

export function numTiles(numPlayers) {
	switch (numPlayers) {
		case 2:
			return 9
		case 3:
			return 12
		case 4:
			return 16
		case 5:
			return 20
		case 6:
			return 24
	}
	return 0
}

export function generateRandomMap(maxPlayers) {
	const store = useModelStore()
	const totalTilesNeeded = numTiles(maxPlayers)
	const options = store.startingOptions

	let res = []
	let allTiles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
	let chosenTiles = []

	// 1. Handle New Districts Logic
	if (options.newDistricts) {
		if (options.newDistrictsAll) {
			chosenTiles.push(20, 21, 22, 23, 24)
			if (options.lobbyists || options.newDistrictsPark) chosenTiles.push(25)
		} else if (options.newDistrictsApp) {
			allTiles.push(20, 21, 22)
			if (options.newDistrictsPark) chosenTiles.push(25)
			else if (options.lobbyists) allTiles.push(25)

			// Randomly pick between tiles 23 and 24
			if (Math.random() < 0.5) {
				chosenTiles.push(23)
				allTiles.push(24)
			} else {
				chosenTiles.push(24)
				allTiles.push(23)
			}
		} else {
			allTiles.push(20, 21, 22, 23, 24)
			if (options.newDistrictsPark) chosenTiles.push(25)
			else if (options.lobbyists) allTiles.push(25)
		}
	}

	// 2. Ensure Park Tile (25) is handled correctly
	if (options.newDistrictsPark && !chosenTiles.includes(25)) {
		chosenTiles.push(25)
		// Remove 25 from allTiles if it exists there (replaces _.remove)
		allTiles = allTiles.filter((n) => n !== 25)
	}

	// 3. Handle 6 Player expansion
	if (maxPlayers === 6) {
		const extraTiles = [20, 21, 22, 23, 24]
		extraTiles.forEach((t) => {
			if (!allTiles.includes(t) && !chosenTiles.includes(t)) allTiles.push(t)
		})
		if ((options.lobbyists || options.newDistricts) && !allTiles.includes(25) && !chosenTiles.includes(25)) {
			allTiles.push(25)
		}
	}

	// 4. Shuffle and fill (Replaces _.shuffle)
	funcs.shuffle(allTiles)
	funcs.shuffle(chosenTiles)

	// Fill chosenTiles up to total requirement
	while (chosenTiles.length < totalTilesNeeded && allTiles.length > 0) {
		chosenTiles.push(allTiles.pop())
	}

	funcs.shuffle(chosenTiles)

	// 5. Final board assembly
	for (let j = 0; j < totalTilesNeeded; j++) {
		const tile = chosenTiles.pop()
		if (options.urbanPlanningPlus) {
			res.push(-2, -2)
		} else if (options.urbanPlanning) {
			res.push(tile, -2)
		} else {
			res.push(tile, Math.floor(Math.random() * 4))
		}
	}

	return expandMapToFullGrid(res, maxPlayers)
}

/**
 * Expands a compact map array into a standardized 17x16 grid.
 * Each tile is represented by two consecutive elements in the array.
 */
export function expandMapToFullGrid(map, maxPlayers) {
	const res = []
	const GRID_WIDTH = 17
	const GRID_HEIGHT = 16 // 6 top rows + 10 remaining rows
	const START_OFFSET = 6

	// Determine the active area dimensions based on player count
	const dimensions = {
		2: { w: 3, h: 3 },
		3: { w: 4, h: 3 },
		4: { w: 4, h: 4 },
		5: { w: 5, h: 4 },
		6: { w: 6, h: 4 },
	}

	const { w: naturalWidth, h: naturalHeight } = dimensions[maxPlayers] || dimensions[2]

	let mapPointer = 0

	// Helper to push a "null" tile (two -1s)
	const pushNullTile = (count = 1) => {
		for (let i = 0; i < count; i++) {
			res.push(-1, -1)
		}
	}

	// 1. Add 6 rows of blank padding at the top
	for (let i = 0; i < 6; i++) {
		pushNullTile(GRID_WIDTH)
	}

	// 2. Add the rows containing actual map data
	for (let y = 0; y < naturalHeight; y++) {
		// Left padding
		pushNullTile(START_OFFSET)

		// Map data for this row
		for (let x = 0; x < naturalWidth; x++) {
			res.push(map[mapPointer++], map[mapPointer++])
		}

		// Right padding (to complete the 17-tile width)
		const remainingCols = GRID_WIDTH - START_OFFSET - naturalWidth
		pushNullTile(remainingCols)
	}

	// 3. Add remaining blank rows at the bottom to reach total height
	const remainingRows = GRID_HEIGHT - 6 - naturalHeight
	for (let i = 0; i < remainingRows; i++) {
		pushNullTile(GRID_WIDTH)
	}

	return res
}

export function initCoords() {
	const store = useModelStore()
	if (store.mapData.tiles.length > 0) {
		if (store.mapData.tiles.indexOf(-2) !== -1) return
		let usedTiles = [] // Holds tiles only. Should be length 272
		for (let i = 0; i < store.mapData.tiles.length / 2; i++) {
			if (store.mapData.tiles[i * 2] != -1) {
				usedTiles.push(rotateTile(rf.TILES[store.mapData.tiles[i * 2]], store.mapData.tiles[i * 2 + 1]))
			} else usedTiles.push(rotateTile(rf.TILES[26], 0))
		}

		for (let i = 0; i < rf.ssH; i++) {
			for (let j = 0; j < rf.ssW; j++) {
				let index = rf.ssW * i + j
				let tileIndex = Math.floor(i / 5) * store.mapData.dimensions[0] + Math.floor(j / 5)
				let inTileIndex = (i % 5) * 5 + (j % 5)
				store.mapData.coords[index] = usedTiles[tileIndex][inTileIndex]
			}
		}
	}
}

export function getOriginalTiles(tilesOnly) {
	const store = useModelStore()
	let originalTiles = []
	let numPlayers = store.players.length

	let naturalWidth = 3
	let naturalHeight = 3
	if (numPlayers == 3) naturalWidth = 4
	if (numPlayers == 4) {
		naturalHeight = 4
		naturalWidth = 4
	}
	if (numPlayers == 5) {
		naturalHeight = 4
		naturalWidth = 5
	}
	if (numPlayers == 6) {
		naturalHeight = 4
		naturalWidth = 6
	}
	// start at 6,6, so 102>204 total tiles, plus 6>12
	let start = 216
	for (let i = 0; i < naturalHeight; i++) {
		for (let j = start + i * store.mapData.dimensions[0] * 2; j < start + i * store.mapData.dimensions[0] * 2 + naturalWidth * 2; j++) originalTiles.push(store.mapData.tiles[j])
	}
	if (!tilesOnly)
		return originalTiles // with rotations
	else {
		let k = originalTiles.length
		while (k--) (k + 1) % 2 === 0 && originalTiles.splice(k, 1)
		return originalTiles // without rotations
	}
}

export function getAddedTiles() {
	const store = useModelStore()
	let originalTiles = getOriginalTiles(true)
	let addedTiles = []
	for (let i = 0; i < store.mapData.tiles.length; i += 2) {
		if (store.mapData.tiles[i] !== -1 && !originalTiles.includes(store.mapData.tiles[i])) {
			addedTiles.push([i / 2, store.mapData.tiles[i], store.mapData.tiles[i + 1]])
		}
	}
	return addedTiles
}

export function addTileToMap(tile, index, rotation) {
	const store = useModelStore()
	store.mapData.tiles[index] = tile
	store.mapData.tiles[index + 1] = rotation
	index /= 2
	let wholeRows = Math.floor(index / store.mapData.dimensions[0])
	let remainder = index % store.mapData.dimensions[0] // how many extra tiles accross
	index = wholeRows * store.mapData.dimensions[0] * 5 * 5
	index = index + remainder * 5
	let newCoords = rf.TILES[tile] // NEED TO ROTATE
	if (rotation != 0) newCoords = rotateTile(newCoords, rotation)
	for (let y = 0; y < 5; y++) {
		for (let x = 0; x < 5; x++) {
			store.mapData.coords[index + x + y * store.mapData.dimensions[0] * 5] = newCoords[x + y * 5]
		}
	}
}

export function getIndexForTile(x, y) {
	return y * 5 + x
}

export function getCoordsForTile(index) {
	let res = []
	res.push(index % 5)
	res.push(Math.floor(index / 5))
	return res
}

export function isTopLeftOfTile(index) {
	const store = useModelStore()
	// Move it on to top row of tiles
	if (index > store.mapData.dimensions[0] * 5 * 5) index = index % (store.mapData.dimensions[0] * 5 * 5)
	// Needs to be top row and top left
	if (index < store.mapData.dimensions[0] * 5 && index % 5 == 0) return true
	return false
}
export function isTopRightOfTile(index) {
	const store = useModelStore()
	// Move it on to top row of tiles
	if (index > store.mapData.dimensions[0] * 5 * 5) index = index % (store.mapData.dimensions[0] * 5 * 5)
	// Needs to be top row and top left
	if (index < store.mapData.dimensions[0] * 5 && index % 5 == 4) return true
	return false
}
export function isBottomLeftOfTile(index) {
	const store = useModelStore()
	// Move it on to top row of tiles
	if (index > store.mapData.dimensions[0] * 5 * 5) index = index % (store.mapData.dimensions[0] * 5 * 5)
	let x = index % (store.mapData.dimensions[0] * 5)
	let y = Math.floor(index / (store.mapData.dimensions[0] * 5))
	// Needs to be bottom row and bottom left
	if (y == 4 && x % 5 == 0) return true
	return false
}

// NOTE index should be on an ACTUAL tile side
export function isIndexOnLeftEdgeOfMap(index, height) {
	const store = useModelStore()
	const coords = toRaw(store.mapData.coords)
	let onLeft = true // left
	let shiftCount = 0
	for (let sc = 0; sc < height; sc++) {
		if (coords[index + store.mapData.dimensions[0] * 5 * sc + 1] === rf.OFF_BOARD || coords[index + store.mapData.dimensions[0] * 5 * sc + 1] == rf.FREEWAY || (coords[index + store.mapData.dimensions[0] * 5 * sc + 1] >= 134 && coords[index + store.mapData.dimensions[0] * 5 * sc + 1] <= 136)) shiftCount++
	}
	if (shiftCount == height) onLeft = false
	return onLeft
}

export function isIndexOnBottomEdgeOfMap(index, width) {
	const store = useModelStore()
	const coords = toRaw(store.mapData.coords)
	let onBottom = false
	let shiftCount = 0
	for (let sc = 0; sc < width; sc++) {
		if (coords[index + store.mapData.dimensions[0] * 5 + sc] === rf.OFF_BOARD || (coords[index + store.mapData.dimensions[0] * 5 + sc] >= 134 && coords[index + store.mapData.dimensions[0] * 5 + sc] <= 136)) shiftCount++
	}
	if (shiftCount == width) onBottom = true // down
	return onBottom
}

export function rotateTile(coords, nb = 1) {
	if (nb < 0) nb = 0
	nb = nb % 4

	let res = []
	for (let i = 0; i < 25; i++) {
		let c = getCoordsForTile(i)
		let x = c[0]
		let y = c[1]
		switch (nb) {
			case 0:
				res[i] = coords[i]
				break
			case 1:
				res[getIndexForTile(y, x)] = coords[getIndexForTile(x, 5 - y - 1)]
				break
			case 2:
				res[getIndexForTile(x, y)] = coords[getIndexForTile(5 - x - 1, 5 - y - 1)]
				break
			case 3:
				res[getIndexForTile(y, x)] = coords[getIndexForTile(5 - x - 1, y)]
				break
		}
	}
	return res
}

export function giveNeighbours(index) {
	let res = []

	if (index >= rf.ssW) res.push(index - rf.ssW)
	if (Math.floor(index / rf.ssW) < rf.ssH - 1) res.push(index + rf.ssW)
	if (index % rf.ssW > 0) res.push(index - 1)
	if (index % rf.ssW < rf.ssW - 1) res.push(index + 1)

	return res
}

export function neighbours(zone) {
	// Handle single number input
	if (typeof zone === "number") {
		return giveNeighbours(zone)
	}

	// Use a Set for O(1) lookup and automatic uniqueness
	const result = new Set()
	const zoneSet = new Set(zone)

	for (const space of zone) {
		const neighbors = giveNeighbours(space)
		for (const n of neighbors) {
			// Only add if it's not part of the original zone
			if (!zoneSet.has(n)) {
				result.add(n)
			}
		}
	}

	// Convert Set back to Array
	return Array.from(result)
}

export function giveNeighboursOfType(index, type) {
	const store = useModelStore()

	// Normalize type into a Set for ultra-fast lookup
	let typeSet
	if (typeof type === "number") {
		typeSet = new Set([type])
	} else if (Array.isArray(type)) {
		typeSet = new Set(type)
	} else {
		typeSet = new Set()
	}

	return giveNeighbours(index).filter((space) => {
		const spaceValue = store.mapData.coords[space]
		return typeSet.has(spaceValue)
	})
}

export function nextRoadNeighbours(index, comingFrom, sameTile, ignoreCrossing) {
	const store = useModelStore()
	const coords = store.mapData.coords

	// 1. Get initial road neighbors using your updated vanilla function
	const v = giveNeighboursOfType(index, rf.ROADS)

	// 2. Filter in a single pass
	let res = v.filter((space) => {
		// Basic exclusions
		if (space === index || space === comingFrom) return false

		const indexCoord = coords[index]

		// Handle Bridge Logic (Logic: Bridges only allow straight-line movement)
		if (rf.BRIDGES.includes(indexCoord)) {
			const diffIncoming = Math.abs(comingFrom - index)
			const diffOutgoing = Math.abs(space - index)

			// If we came from a side (diff 1), we must exit the other side (diff 1)
			// If we came from top/bottom (diff > 1), we must exit top/bottom (diff > 1)
			return diffIncoming === 1 ? diffOutgoing === 1 : diffOutgoing > 1
		}

		// Handle Standard Road/Crossing Logic
		return ignoreCrossing === true || isCrossing(index) || onTheSameTile(index, space)
	})

	// 3. Final optional same-tile filter
	if (sameTile === true) {
		res = res.filter((space) => onTheSameTile(space, index))
	}

	return res
}

export function traceRoadUntilChoice(index, comingFrom, range) {
	let res = [index]
	let rep = nextRoadNeighbours(index, comingFrom)
	let from = index

	while (rep.length == 1 && range > -1) {
		res.push(rep[0])
		let t = rep[0]
		if (!isNaN(range) && !onTheSameTile(rep[0], from)) range--
		rep = nextRoadNeighbours(rep[0], from)
		from = t
	}
	if (range == -1 && res.length > 0) res.pop()

	return res
}

export function areaNotRoad(index) {
	const store = useModelStore()
	const coords = store.mapData.coords

	// Define "Road-like" tiles to ignore (normalized for fast Set lookup)
	const ROAD_TILES = new Set([...rf.ROADS, rf.OFF_BOARD, rf.ROAD_UC, rf.FREEWAY, 134, 135, 136])

	const visited = new Set([index])
	const queue = []

	// Initial neighbors check
	for (const neighbor of giveNeighbours(index)) {
		if (!ROAD_TILES.has(coords[neighbor])) {
			queue.push(neighbor)
			visited.add(neighbor)
		}
	}

	// Standard BFS (Breadth-First Search)
	let head = 0
	while (head < queue.length) {
		const current = queue[head++]

		for (const next of giveNeighbours(current)) {
			// If not visited AND not a road/blocked tile, add to area
			if (!visited.has(next) && !ROAD_TILES.has(coords[next])) {
				visited.add(next)
				queue.push(next)
			}
		}
	}

	return Array.from(visited)
}

export function areaRoad(index, range = 999, ignoreCrossing) {
	const store = useModelStore()
	const coords = store.mapData.coords
	const BRIDGE_IDS = new Set(rf.BRIDGES)

	// Track visited nodes: key = index, value = highest remaining range found so far
	const visited = new Map()
	const queue = []

	// 1. The starting square may itself be empty (e.g. a restaurant door) - seed from its road neighbours either way
	if (ROAD_IDS.has(coords[index])) visited.set(index, range)

	const initialNeighbors = nextRoadNeighbours(index, -1, false, ignoreCrossing)
	for (const n of initialNeighbors) {
		let nextRange = range
		if (!onTheSameTile(index, n)) nextRange--

		if (nextRange >= 0) {
			queue.push({ index: n, range: nextRange, from: index })
		}
	}

	// 2. Process queue (BFS/Dijkstra Hybrid)
	let head = 0
	while (head < queue.length) {
		const current = queue[head++]
		const { index: currIdx, range: currRange, from: currFrom } = current
		const currentTileId = coords[currIdx]

		// Bridge Logic: Bridges allow re-visiting because movement is directional
		const isBridge = BRIDGE_IDS.has(currentTileId)
		const bestRangeSoFar = visited.get(currIdx)

		// Optimization: Only explore if this is a new tile, a bridge,
		// or we found a "cheaper" path (higher remaining range) to an existing tile.
		if (isBridge || currRange > (bestRangeSoFar ?? -1)) {
			// Standard road check
			if (ROAD_IDS.has(currentTileId)) {
				visited.set(currIdx, currRange)

				const neighbors = nextRoadNeighbours(currIdx, currFrom, false, ignoreCrossing)

				for (const n of neighbors) {
					let nextRange = currRange
					if (!onTheSameTile(currIdx, n)) nextRange--

					if (nextRange >= 0) {
						// Only add to queue if this path is better than what we've seen
						const prevBest = visited.get(n)
						if (BRIDGE_IDS.has(coords[n]) || nextRange > (prevBest ?? -1)) {
							queue.push({ index: n, range: nextRange, from: currIdx })
						}
					}
				}
			}
		}
	}

	// 3. Format output to match your original resTab structure
	return Array.from(visited.entries()).map(([idx, r]) => ({
		index: idx,
		range: r,
	}))
}

export function areaRoadLobbyists(index, range = 999, ignoreCrossing) {
	const store = useModelStore()
	const coords = store.mapData.coords
	const BRIDGE_IDS = new Set(rf.BRIDGES)

	// Track how many times each tile has been "processed"
	const visitCount = new Map()
	const resTab = []
	const queue = []

	// 1. The starting square may itself be empty - seed from its road neighbours either way
	if (ROAD_IDS.has(coords[index])) {
		visitCount.set(index, 1)
		resTab.push({ index: index, range: range })
	}

	const initial = nextRoadNeighbours(index, -1, false, ignoreCrossing)
	for (const n of initial) {
		let nextR = range
		if (!onTheSameTile(index, n)) nextR--
		if (nextR >= 0) queue.push({ index: n, range: nextR, from: index })
	}

	// 2. BFS Loop
	let head = 0
	while (head < queue.length) {
		const { index: currIdx, range: currRange, from: currFrom } = queue[head++]
		const cellType = coords[currIdx]

		if (!ROAD_IDS.has(cellType) || currRange < 0) continue

		const count = visitCount.get(currIdx) || 0
		const isBridge = BRIDGE_IDS.has(cellType)

		// Lobbyist Logic: Only explore if:
		// - It's a Bridge (infinite passes usually)
		// - It's been seen 0 times (first pass)
		// - It's been seen 1 time (second pass / doubleExplored logic)
		if (isBridge || count < 2) {
			visitCount.set(currIdx, count + 1)
			resTab.push({ index: currIdx, range: currRange, from: currFrom })

			const neighbors = nextRoadNeighbours(currIdx, currFrom, false, ignoreCrossing)
			for (const n of neighbors) {
				let nextR = currRange
				if (!onTheSameTile(currIdx, n)) nextR--

				if (nextR >= 0) {
					const nextCount = visitCount.get(n) || 0
					// Pre-check to keep the queue lean
					if (BRIDGE_IDS.has(coords[n]) || nextCount < 2) {
						queue.push({ index: n, range: nextR, from: currIdx })
					}
				}
			}
		}
	}

	return resTab
}

export function isCollapsePossible(index, width, rotated) {
	const store = useModelStore()
	const coords = toRaw(store.mapData.coords)
	let collapsePossible = true
	if (!rotated) {
		for (let k = 0; k < width; k++) {
			if (coords[index + k] !== rf.OFF_BOARD && coords[index + k] != rf.FREEWAY && (coords[index + k] < 134 || coords[index + k] > 136)) collapsePossible = false
		}
	} // end not rotated
	else {
		// now you are rotated}
		for (let i = 0; i < width * store.mapData.dimensions[0] * 5; i += store.mapData.dimensions[0] * 5) {
			if (coords[index + i] !== rf.OFF_BOARD && coords[index + i] != rf.FREEWAY && (coords[index + i] < 134 || coords[index + i] > 136)) collapsePossible = false
		}
	} // end rotated
	return collapsePossible
}


/**
 * Helper to calculate grid indexes and add to set
 */

// All the roads spaces from the index. Useful for the dinnertime


// REPLACE THIS FUNCTION WITH THE BELOW
export function getRuralMarketingZone() {
	const store = useModelStore()
	let freewayIndexes = []
	for (let i = 0; i < store.mapData.coords.length; i++) if (store.mapData.coords[i] == rf.FREEWAY) freewayIndexes.push(i)
	return freewayIndexes
}

export function getRuralMarketingSigns() {
	const store = useModelStore()
	let res = []
	for (let i = 0; i < store.mapData.coords.length; i++) if (store.mapData.coords[i] == rf.FREEWAY) res.push(i)
	return res
}

// Only used to place weird object
export function simpleRangeToRestaurantsFromIndex(index, restaurants) {
	const store = useModelStore()
	const BRIDGE_IDS = new Set(rf.BRIDGES)
	const rwIndexes = new Set(getRoadworkIndexes())

	// res[colour] will store the minimum range found for that restaurant type; -1 = unreachable
	const res = new Array(6).fill(-1)

	// Track best (minimum) range found for each tile to prevent infinite loops/redundancy
	const bestRangeAtTile = new Map()
	const queue = []

	// 1. Initial Setup
	queue.push({ index: index, range: 0, from: -1 })

	// 2. BFS / Pathfinding
	let head = 0
	while (head < queue.length) {
		const { index: currIdx, range: currRange, from: currFrom } = queue[head++]
		const cellType = store.mapData.coords[currIdx]

		// Only move through Roads or Bridges
		if (!ROAD_IDS.has(cellType)) continue

		// Optimization: Skip if we've already found a shorter way to this specific tile
		const prevBest = bestRangeAtTile.get(currIdx)
		if (!BRIDGE_IDS.has(cellType) && (prevBest ?? Infinity) <= currRange) {
			continue
		}
		bestRangeAtTile.set(currIdx, currRange)

		// 3. Check for nearby restaurants from this road tile
		const currentNeighbours = neighbours(currIdx)

		for (const resto of restaurants) {
			if (currentNeighbours.includes(resto.index)) {
				let r = currRange
				if (!onTheSameTile(currIdx, resto.index)) r++

				// Add penalty if on a specific type of road index (rwIndexes)
				if (rwIndexes.has(currIdx)) r++

				const colour = resto.colour
				if (res[colour] === -1 || res[colour] > r) {
					res[colour] = r
				}
			}
		}

		// 4. Explore further road connections
		const nextRoads = nextRoadNeighbours(currIdx, currFrom)
		for (const nextIdx of nextRoads) {
			let nextRange = currRange
			if (!onTheSameTile(currIdx, nextIdx)) nextRange++

			queue.push({
				index: nextIdx,
				range: nextRange,
				from: currIdx,
			})
		}
	}

	// 5. Return the first valid range found (mimicking your original logic)
	for (let i = 0; i < res.length; i++) {
		if (res[i] !== -1) return res[i]
	}

	return -1
}

export function getRestaurantZoneFromAnyIndex(index) {
	const store = useModelStore()
	const mapWidth = rf.ssW
	let restoIndex = null

	// Use standard loops so we can "break" early for efficiency
	playerLoop: for (const player of store.players) {
		for (const restaurant of player.restaurants) {
			const rIdx = restaurant.index

			// Check if the input index matches any of the 4 tiles in the 2x2 restaurant
			if (index === rIdx || index === rIdx + 1 || index === rIdx + mapWidth || index === rIdx + mapWidth + 1) {
				restoIndex = rIdx
				break playerLoop // Stop looking once found
			}
		}
	}

	// If no restaurant was found, return an empty array or handle as needed
	if (restoIndex === null) return []

	// Construct the 2x2 zone
	return [restoIndex, restoIndex + 1, restoIndex + mapWidth, restoIndex + mapWidth + 1]
}

// index - index of inside of a bldg
// restaurants - indexes of squares inside restos
// winning range - distant it was sold at
export function getCoffeeRoutesFromBldgSquare(index, restaurants, winningRange) {
	const store = useModelStore()
	const restoSet = new Set(restaurants)
	const rwSet = new Set(getRoadworkIndexes())
	const coffeeRoutes = []

	// tiles of restaurant entrances
	const destinationTiles = [...new Set(restaurants.map((r) => giveTileNumber(r)))]

	// 1. Get initial road neighbors to start paths
	const startNodes = neighbours(index)
		.filter((n) => rf.ROADS.includes(store.mapData.coords[n]))
		.map((n) => ({
			index: n,
			range: onTheSameTile(index, n) ? 0 : 1,
			from: index,
		}))

	/**
	 * Recursive DFS to find all valid paths
	 */
	const findPaths = (currentIdx, fromIdx, currentRange, path, visitedTwice) => {
		// 2. Check for nearby restaurants from current road
		for (const neighbor of neighbours(currentIdx)) {
			if (restoSet.has(neighbor)) {
				// same-tile entrance is always valid; crossing a tile costs +1 range (old map.js)
				if (onTheSameTile(currentIdx, neighbor) || currentRange + 1 <= winningRange) {
					coffeeRoutes.push([...path])
				}
			}
		}

		// 3. Find next road segments
		const nextRoads = nextRoadNeighbours(currentIdx, fromIdx)

		for (const next of nextRoads) {
			let nextRange = currentRange
			const crossed = !onTheSameTile(currentIdx, next)
			if (crossed) nextRange++
			if (rwSet.has(next)) nextRange++

			// 4. Validity Checks (Pruning) - only tile crossings and roadworks
			// consume range; same-tile steps may continue even past it (old map.js)
			if (nextRange > winningRange && (crossed || rwSet.has(next))) continue
			// crossing toward a square whose min tile distance to any restaurant
			// already blows the budget can never sell (old map.js:906)
			if (crossed && currentRange + giveMinTileDistance(next, destinationTiles) > winningRange) continue

			const isSecondVisit = path.includes(next)
			if (isSecondVisit) {
				if (visitedTwice.has(next)) continue // Already visited twice, stop
			}

			// 5. Recurse
			path.push(next)
			if (isSecondVisit) visitedTwice.add(next)

			findPaths(next, currentIdx, nextRange, path, visitedTwice)

			// 6. Backtrack (Cleanup for the next branch)
			path.pop()
			if (isSecondVisit) visitedTwice.delete(next)
		}
	}

	// Start the search for each starting road
	for (const start of startNodes) {
		findPaths(start.index, start.from, start.range, [start.index], new Set())
	}

	return coffeeRoutes
}

// Min tile distance from index's tile to any of the given tile numbers
// (old map.js giveMinTileDistance). Vue tile numbers are y * rf.ssW + x
// (see giveTileNumber), so the row stride is rf.ssW, not the legacy dense 17.
function giveMinTileDistance(index, tiles) {
	const baseTile = giveTileNumber(index)
	let minDist = 99
	for (const t of tiles) {
		let tile1 = baseTile
		let tile2 = t
		if (tile1 > tile2) [tile1, tile2] = [tile2, tile1]
		const dist = Math.floor(tile2 / rf.ssW) - Math.floor(tile1 / rf.ssW) + Math.abs((tile2 % rf.ssW) - (tile1 % rf.ssW))
		if (dist < minDist) minDist = dist
	}
	return minDist
}


// This is run for an INDEX (which is a square of a building)
// So first step is to go from the index to all adjacent roads, and go from there
// ONLY USE THIS FOR DINNERTIME
export function rangeToRestaurantsFromIndex(index, restaurants) {
	const store = useModelStore()
	const BRIDGE_IDS = new Set(rf.BRIDGES)
	const rwSet = new Set(getRoadworkIndexes())

	// res[playerIndex] stores the min range for that player; -99 = unreachable
	const res = new Array(store.players.length).fill(-99)

	// Track best (min) range found for each tile: Map<index, range>
	const bestRangeAtTile = new Map()

	// Use a queue. For the "paused" logic, we process lower ranges first.
	let queue = []

	// 1. Initial Setup: Get road neighbors of the starting index
	const startNodes = neighbours(index)
		.filter((n) => ROAD_IDS.has(store.mapData.coords[n]))
		.map((n) => ({
			index: n,
			range: onTheSameTile(index, n) ? 0 : 1,
			from: index,
		}))

	queue.push(...startNodes)

	// 2. Process Queue
	while (queue.length > 0) {
		// Sort queue by range to handle the "Paused" logic naturally (Dijkstra)
		// This ensures we always process the shortest path first
		queue.sort((a, b) => a.range - b.range)
		const current = queue.shift()
		const { index: currIdx, range: currRange, from: currFrom } = current

		const cellType = store.mapData.coords[currIdx]
		const isRW = rwSet.has(currIdx)

		// Optimization: Skip if we've found a better/equal path already (unless it's a bridge)
		const prevBest = bestRangeAtTile.get(currIdx)
		if (!BRIDGE_IDS.has(cellType) && (prevBest ?? Infinity) <= currRange) {
			continue
		}
		bestRangeAtTile.set(currIdx, currRange)

		// 3. Check for nearby restaurants
		const currentNeighbours = neighbours(currIdx)
		for (const resto of restaurants) {
			if (currentNeighbours.includes(resto.index)) {
				let r = currRange
				if (!onTheSameTile(currIdx, resto.index)) r++
				if (isRW) r++ // Extra penalty for RW tiles

				// res is keyed by playerIndex (index into store.players)
				const playerIndex = resto.playerIndex
				if (res[playerIndex] === -99 || res[playerIndex] > r) {
					res[playerIndex] = r
				}
			}
		}

		// 4. Explore next roads
		const nextRoads = nextRoadNeighbours(currIdx, currFrom)
		for (const nextIdx of nextRoads) {
			let nextRange = currRange

			// Standard tile boundary penalty
			if (!onTheSameTile(currIdx, nextIdx)) nextRange++

			// RW Penalty: Your original logic "pauses" and increments.
			// In a Dijkstra approach, we simply add the weight.
			if (rwSet.has(nextIdx)) nextRange++

			queue.push({
				index: nextIdx,
				range: nextRange,
				from: currIdx,
			})
		}
	}

	return res
}

export function emptyNeighboursWithinRange(path, lobbyist, lobbyistData) {
	const store = useModelStore()
	const res = new Set()
	const mapWidth = store.mapData.dimensions[0] * 5
	const coords = store.mapData.coords

	for (const road of path) {
		// 1. Get neighbors that are empty spaces (using your optimized vanilla function)
		const neighbours = giveNeighboursOfType(road.index, rf.EMPTY_SPACE)

		for (const v of neighbours) {
			const roadRangeValid = road.range > 0
			const onSameTileValid = onTheSameTile(v, road.index)

			// Basic check: if within range or on the same tile, it's valid
			if (roadRangeValid || onSameTileValid) {
				res.add(v)
				continue
			}

			// 2. Specialized Lobbyist Logic (when range is 0 and different tile)
			if (lobbyist) {
				// If parks or general lobbyist without specific data
				if (lobbyistData == null) {
					res.add(v)
					continue
				}

				// Calculate which road indexes could "reach" this empty space via a Lobbyist
				const possibleRW = []
				const [type, orientation] = lobbyistData

				if (type === 0 || type === 1) {
					if (orientation === 0) {
						possibleRW.push(v + 1, v - 1)
					} else if (orientation === 1) {
						possibleRW.push(v + mapWidth, v - mapWidth)
					}
				} else if (type === 2) {
					// Corner logic
					if (orientation === 0) possibleRW.push(v + mapWidth, v + 1)
					else if (orientation === 1) possibleRW.push(v + mapWidth, v - 1)
					else if (orientation === 2) possibleRW.push(v - mapWidth, v - 1)
					else if (orientation === 3) possibleRW.push(v - mapWidth, v + 1)
				}

				// Check if our current road is one of the valid entry points for this lobbyist
				// Also verify the index actually contains a ROAD in the master coordinates
				const isValidLobbyistPath = possibleRW.some((idx) => idx === road.index && coords[idx] === rf.ROAD)

				if (isValidLobbyistPath) {
					res.add(v)
				}
			}
		}
	}

	return Array.from(res)
}

// Check if the given index is a crossing to a new tile or not
export function isCrossing() {
	// Previously, base game only allowed corssing mind tile
	// But this broke certain possibilities, and doesn't work with expansions
	// So I think Splotter retro ruled taht any crossing is allowed between tiles
	// I think the mid point crossing was just to aid simplicity when it made zero difference anyway
	return true
}

export function buildingAdjacentToRoad(index, width, height) {
	const store = useModelStore()
	const coords = toRaw(store.mapData.coords)
	const mapWidth = rf.ssW

	// Iterate through every tile the building occupies
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const currentTileIdx = index + x + y * mapWidth
			const neighbors = giveNeighbours(currentTileIdx)

			// Check neighbors for this specific tile
			for (const neighbor of neighbors) {
				if (ROAD_IDS.has(coords[neighbor])) {
					// Found a road! Exit everything immediately.
					return true
				}
			}
		}
	}

	return false
}

// Indicates if two indexes are on the same tile or not
// Usefull combined with the Neighbouring methods, to check the range
export function onTheSameTile(index1, index2) {
	let tile1 = giveTileNumber(index1)
	let tile2 = giveTileNumber(index2)

	return tile1 == tile2
}

export function splitPathByTiles(path) {
	let res = []
	if (path.length > 1) {
		let t = [path[0]]
		for (let i = 1; i < path.length; i++) {
			if (!onTheSameTile(path[i - 1], path[i])) {
				res.push(t.concat([]))
				t = [path[i]]
			} else {
				t.push(path[i])
			}
			if (i == path.length - 1) {
				res.push(t)
			}
		}
	} else if (path.length == 1) {
		res = [path]
	}
	return res
}

export function emptySpacesAdjacentToRoadsWithinRange(index, range, lobbyist, lobbyistData) {
	const store = useModelStore()
	let path
	if (store.startingOptions.lobbyists || store.startingOptions.newDistricts) path = areaRoadLobbyists(index, range, true)
	else path = areaRoad(index, range, true)
	/*let visPath = []
		for (let i=0;i<path.length;i++) visPath.push(path[i].index)
		V.externalDrawSquares([...visPath], "#f00", 'selector');
		debugger*/

	return emptyNeighboursWithinRange(path, lobbyist, lobbyistData)
}

export function giveAdjacentTiles(tileNumber, diagonal) {
	const store = useModelStore()
	let res = []

	// Tile numbers use the rf.ssW-wide space (see giveTileNumber), but mapData.tiles
	// is laid out with store.mapData.dimensions[0] tiles per row. Translate for the checks.
	const tileAt = (num) => {
		const row = Math.floor(num / rf.ssW)
		const col = num % rf.ssW
		return store.mapData.tiles[(row * store.mapData.dimensions[0] + col) * 2] != -1
	}

	if (tileNumber >= rf.ssW) {
		if (tileAt(tileNumber - rf.ssW)) res.push(tileNumber - rf.ssW)
	}
	if (Math.floor(tileNumber / rf.ssW) < store.mapData.dimensions[1] - 1) {
		if (tileAt(tileNumber + rf.ssW)) res.push(tileNumber + rf.ssW)
	}
	if (tileNumber % rf.ssW > 0) {
		if (tileAt(tileNumber - 1)) res.push(tileNumber - 1)
	}
	if (tileNumber % rf.ssW < rf.ssW - 1) {
		if (tileAt(tileNumber + 1)) res.push(tileNumber + 1)
	}

	// NOT FIXED - never used?
	if (diagonal === true) {
		if (tileNumber >= rf.ssW) {
			if (tileNumber % rf.ssW > 0) {
				if (tileAt(tileNumber - rf.ssW - 1)) res.push(tileNumber - rf.ssW - 1)
			}
			if (tileNumber % rf.ssW < rf.ssW - 1) {
				if (tileAt(tileNumber - rf.ssW + 1)) res.push(tileNumber - rf.ssW + 1)
			}
		}
		if (Math.floor(tileNumber / rf.ssW) < store.mapData.dimensions[1] - 1) {
			if (tileNumber % rf.ssW > 0) {
				if (tileAt(tileNumber + rf.ssW - 1)) res.push(tileNumber + rf.ssW - 1)
			}
			if (tileNumber % rf.ssW < rf.ssW - 1) {
				if (tileAt(tileNumber + rf.ssW + 1)) res.push(tileNumber + rf.ssW + 1)
			}
		}
	}

	return res
}

export function giveTileNumber(index) {
	let xTile1 = Math.floor((index % rf.ssW) / 5)
	let yTile1 = Math.floor(Math.floor(index / rf.ssW) / 5)
	let tile1 = yTile1 * rf.ssW + xTile1

	return tile1
}


export function giveStartingIndexForTile(number) {
	let xTile = number % rf.ssW
	let yTile = Math.floor(number / rf.ssW)
	return xTile * 5 + yTile * 5 * rf.ssW
}

export function giveIndexForCoordsInTile(tile, x, y) {
	let index = giveStartingIndexForTile(tile)
	return index + x + y * rf.ssW
}


export function adjacentToRoad(index) {
	const store = useModelStore()
	const coords = toRaw(store.mapData.coords)
	const neighbors = giveNeighbours(index)

	// .some() returns true and stops as soon as the condition is met
	return neighbors.some((space) => ROAD_IDS.has(coords[space]))
}

// Returns top/left indexes that can fit an object of appropriate _width and _height
export function locationFor(_width, _height, adjacentToRoad) {
	const store = useModelStore()
	const coords = toRaw(store.mapData.coords)
	const ssW = rf.ssW
	const ssH = rf.ssH
	let res = []
	for (let i = 0; i < coords.length; i++) {
		if (coords[i] == rf.EMPTY_SPACE) {
			const cX = i % ssW
			const cY = Math.floor(i / ssW)
			let possible = true
			for (let x = 0; x < _width; x++) {
				if (cX + x < ssW) {
					for (let y = 0; y < _height; y++) {
						if (cY + y < ssH) {
							if (coords[(cY + y) * ssW + (cX + x)] != rf.EMPTY_SPACE) {
								possible = false
							}
						} else {
							possible = false
						}
					}
				} else {
					possible = false
				}
			}

			if (possible === true) {
				if (adjacentToRoad !== true || buildingAdjacentToRoad(i, _width, _height)) {
					res.push(i)
				}
			}
		}
	}

	return res
}

export function weirdBuildingAdjacentToRoad(index, shape) {
	const store = useModelStore()
	const coords = toRaw(store.mapData.coords)
	const mapWidth = rf.ssW

	const height = shape.length
	const width = shape[0].length

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			// 1. Only check tiles that are actually part of the building shape
			if (shape[y][x] !== 1) continue

			const currentIdx = index + x + y * mapWidth
			const neighbors = giveNeighbours(currentIdx)

			// 2. Short-circuit as soon as a road is found
			const hasRoad = neighbors.some((neighbor) => ROAD_IDS.has(coords[neighbor]))

			if (hasRoad) return true
		}
	}

	return false
}

// Returns top/left indexes that can fit an object of appropriate _width and _height
export function locationForWeirdObject(shape, adjacentToRoad, lobbyist, type, lobbyistData) {
	const store = useModelStore()
	const playerObj = controller.currentPlayerObj()
	const coords = toRaw(store.mapData.coords)
	const { ssW, ssH } = rf

	// 1. Determine Highlight Offset & Rotation
	const highlightOffset = shape[0][0] === 1 ? 0 : shape[0][1] === 1 ? 1 : 2
	const rotation = getRoadRotation(shape)
	const width = shape[0].length
	const height = shape.length

	let possibilities = []

	// 2. Scan Map for Basic Geometric/Collision Validity
	for (let i = 0; i < coords.length; i++) {
		if (coords[i + highlightOffset] !== rf.EMPTY_SPACE) continue

		const cX = i % ssW
		const cY = Math.floor(i / ssW)
		let possible = true

		outer: for (let x = 0; x < width; x++) {
			for (let y = 0; y < height; y++) {
				if (cX + x >= ssW || cY + y >= ssH || (shape[y][x] === 1 && coords[(cY + y) * ssW + (cX + x)] !== rf.EMPTY_SPACE)) {
					possible = false
					break outer
				}
			}
		}

		if (possible) {
			if (type === "newRoad") {
				if (isValidNewRoadConnection(i, rotation, coords)) {
					possibilities.push(i + highlightOffset)
				}
			} else if (adjacentToRoad !== true || weirdBuildingAdjacentToRoad(i, shape)) {
				possibilities.push(i + highlightOffset)
			}
		}
	}

	// 3. Reachability Filter (Replaces _.intersection)
	const reachSet = buildReachabilitySet(playerObj, lobbyist, lobbyistData)
	possibilities = possibilities.filter((p) => {
		const totalCoords = giveAllSpaceForWeirdObject(p - highlightOffset, shape)
		return totalCoords.some((coord) => reachSet.has(coord))
	})

	// 4. "New Road" Special Logic (Roadworks & Direct Door Roads)
	if (type === "newRoad") {
		const entrances = model.giveCurrentPlayerRestaurantEntrances(true)

		// A. Filter existing possibilities by Roadworks range
		possibilities = possibilities.filter((p) => {
			const signs = getPossibleRoadworksSigns(p, rotation, coords)
			return signs.some((signIdx) => {
				const range = simpleRangeToRestaurantsFromIndex(signIdx, entrances)
				return range > -1 && range <= 2
			})
		})

		// B. Add Direct Door Roads
		const restoStarts = [...new Set(rules.givePossibleStartsFromRestaurants(true).flat())].filter((idx) => coords[idx] === rf.EMPTY_SPACE)

		for (const idx of restoStarts) {
			const doorPos = getDirectDoorPlacement(idx, rotation, coords)
			if (doorPos !== null) possibilities.push(doorPos)
		}
	}

	return [...new Set(possibilities)]
}

/**
 * Logic Helpers
 */
function getRoadRotation(shape) {
	if (shape[1][0] === 0) return 1
	if (shape[0][0] === 0) return 2
	if (shape[0][1] === 0) return 3
	return 0
}

function isValidNewRoadConnection(i, rota, coords) {
	const w = rf.ssW
	const rules = [() => coords[i + 2] === rf.ROAD || coords[i + w * 2] === rf.ROAD, () => coords[i - 1] === rf.ROAD || coords[i + w * 2 + 1] === rf.ROAD, () => coords[i - w + 1] === rf.ROAD || coords[i + w - 1] === rf.ROAD, () => coords[i - w] === rf.ROAD || coords[i + w + 2] === rf.ROAD]
	return rules[rota]()
}

function buildReachabilitySet(playerObj, lobbyist, lobbyistData) {
	const reachSet = new Set()
	const range = 2
	const sources = [...playerObj.restaurants]
	if (useModelStore().startingOptions.coffee) sources.push(...playerObj.coffeeShops.map((idx) => ({ index: idx, isCoffee: true })))

	for (const s of sources) {
		let minR = 0,
			maxR = 4
		if (!s.isCoffee && !plyr.doesPlayerHaveDriveIn(controller.currentPlayerIndex())) {
			minR = s.rotation
			maxR = s.rotation + 1
		}

		for (let r = minR; r < maxR; r++) {
			let off = r === 0 ? 1 : r === 1 ? rf.ssW + 1 : r === 2 ? rf.ssW : 0
			emptySpacesAdjacentToRoadsWithinRange(s.index + off, range, lobbyist, lobbyistData).forEach((idx) => reachSet.add(idx))
		}
	}
	return reachSet
}

function getPossibleRoadworksSigns(p, rota, coords) {
	const w = rf.ssW
	const signs = [
		[p + 2, p + w * 2],
		[p - 1, p + w * 2 + 1],
		[p - w, p + w - 2],
		[p - w, p + w + 2],
	][rota]
	return signs.filter((idx) => coords[idx] === rf.ROAD)
}

function getDirectDoorPlacement(idx, rota, coords) {
	const w = rf.ssW
	const test = rules.restaurantRoadTest(idx)
	const empty = (i) => coords[i] === rf.EMPTY_SPACE

	if (rota === 0) {
		// _object[1][1] == 0 in original logic
		if (test === 0 && empty(idx - w) && empty(idx - w + 1)) return idx - w
		if (test === 3 && empty(idx - 1) && empty(idx - w - 1)) return idx - 1
	} else if (rota === 1) {
		// _object[1][0] == 0
		if (test === 1 && empty(idx + 1) && empty(idx + w + 1)) return idx
		if (test === 0 && empty(idx - w) && empty(idx - w - 1)) return idx - w - 1
	} else if (rota === 2) {
		// _object[0][0] == 0
		if (test === 2 && empty(idx + w) && empty(idx + w - 1)) return idx
		if (test === 1 && empty(idx + 1) && empty(idx - w + 1)) return idx - w + 1
	} else if (rota === 3) {
		// _object[0][1] == 0
		if (test === 2 && empty(idx + w) && empty(idx + w + 1)) return idx
		if (test === 3 && empty(idx - 1) && empty(idx - w - 1)) return idx - w - 1
	}
	return null
}

export function giveAllSpaceForWeirdObject(index, _object) {
	let width = _object[0].length
	let height = _object.length

	let res = []
	for (let i = 0; i < height; i++) {
		for (let j = 0; j < width; j++) {
			if (_object[i][j] == 1) res.push(parseInt(index + j + i * rf.ssW))
		}
	}
	return res
}


export function getUsedRowCol() {
	const store = useModelStore()
	// find the relevant rows and columns
	let usedRows = []
	let row = 0
	let col = 0
	for (row = 0; row < 14; row++) {
		//let rowCount = 0
		let currentRowArr = []
		for (col = 0; col < store.mapData.dimensions[0] * 2; col += 2) {
			//rowCount += store.mapData.tiles[row * store.mapData.dimensions[0] * 2 + col]
			currentRowArr.push(store.mapData.tiles[row * store.mapData.dimensions[0] * 2 + col])
		}
		//if (rowCount != -store.mapData.dimensions[0]) usedRows.push(row)
		if (currentRowArr.some((x) => x !== -1)) usedRows.push(row)
	}
	let usedCols = []
	for (col = 0; col < store.mapData.dimensions[0] * 2; col += 2) {
		//let colCount = 0
		let currentColArr = []
		for (row = 0; row < store.mapData.tiles.length; row += store.mapData.dimensions[0] * 2) {
			//colCount += store.mapData.tiles[row + col]
			currentColArr.push(store.mapData.tiles[row + col])
		}
		//if (colCount != -store.mapData.dimensions[1]) usedCols.push(col / 2)
		if (currentColArr.some((x) => x !== -1)) usedCols.push(col / 2)
	}
	return [usedRows, usedCols]
}

export function giveUsedDimension() {
	let usedRowCol = getUsedRowCol()
	return [usedRowCol[1].length, usedRowCol[0].length]
}

export function giveTileAtPosition(index) {
	const store = useModelStore()
	const row = Math.floor(index / rf.ssW)
	const col = index % rf.ssW
	return store.mapData.tiles[(row * store.mapData.dimensions[0] + col) * 2]
}

export function giveCoord(index, isTile) {
	const store = useModelStore()
	let m = 5
	if (isTile == true) m = 1
	let dimensions = store.mapData.dimensions
	return [index % (dimensions[0] * m), Math.floor(index / (dimensions[0] * m))]
}

export function giveIndex(x, y) {
	const store = useModelStore()
	let dimensions = store.mapData.dimensions
	if (Array.isArray(x)) {
		// overload: giveIndex([x, y])
		return x[1] * dimensions[0] * 5 + x[0]
	}
	return y * dimensions[0] * 5 + x
}

export function giveAllSpaceForAToken(index, width, height) {
	let res = []
	for (let i = 0; i < height; i++) {
		for (let j = 0; j < width; j++) {
			res.push(parseInt(index + j + i * rf.ssW))
		}
	}
	return res
}

export function findIndexForHouse(number) {
	const store = useModelStore()
	return store.mapData.coords.indexOf(number + rf.HOUSE)
}

export function findIndexForApartment(number) {
	const store = useModelStore()
	if (number == 3.2 || number == 9.7) return store.mapData.coords.indexOf(number + rf.HOUSE)

	return -1
}

export function getZoneOfHouse(houseNumber) {
	const store = useModelStore()
	const mapWidth = rf.ssW
	const index = findIndexForHouse(houseNumber)

	// 1. Initialize the base 2x2 house zone
	let zone = []
	if (houseNumber !== rf.RURAL_MARKETING_AREA) {
		zone = [index, index + 1, index + mapWidth, index + mapWidth + 1]
	}

	// 2. Add garden tiles if applicable
	if (model.hasGarden(houseNumber)) {
		const isOnBoardHouse = rf.BOARD_HOUSES.includes(houseNumber)

		if (!isOnBoardHouse) {
			// Logic for houses with "built-in" gardens
			const house = store.houses.find((h) => h.number === houseNumber)

			if (house && (house.rotated === 1 || house.rotated === 3)) {
				// Garden is on the side
				zone.push(index + 2, index + mapWidth + 2)
			} else {
				// Garden is on the bottom
				zone.push(index + 2 * mapWidth, index + 2 * mapWidth + 1)
			}
		} else {
			// Logic for separate garden tiles
			const g = store.gardens.find((garden) => garden.house === houseNumber)

			if (g) {
				const gIdx = g.index
				// Add specific garden offsets based on where the garden tile is placed
				if (gIdx === index - 1) {
					zone.push(index - 1, index + mapWidth - 1)
				} else if (gIdx === index + 2) {
					zone.push(index + 2, index + mapWidth + 2)
				} else if (gIdx === index - mapWidth) {
					zone.push(index - mapWidth, index - mapWidth + 1)
				} else if (gIdx === index + 2 * mapWidth) {
					zone.push(index + 2 * mapWidth, index + 2 * mapWidth + 1)
				}
			}
		}
	}

	return zone
}

export function findAllHouses() {
	const store = useModelStore()
	let res = []
	for (let i = 0; i < store.mapData.coords.length; i++) {
		let c = store.mapData.coords[i]
		// QWERT
		if (c < rf.HOUSE + 29 && c > rf.HOUSE) {
			let m = c - rf.HOUSE

			// Needed to fix 3.2 becoming 3.1999999
			if (Number.isInteger(m)) {
				// m is already an integer, so do nothing
			} else {
				// m is a float, so round it to a specific number of decimal places (e.g., 2)
				m = parseFloat(m.toFixed(1)) // Convert back to a number
			}

			if (res.indexOf(m) == -1) {
				res.push(m)
			}
		}
	}
	return res
}

export function findFreeEdgesForHouse(number) {
	const store = useModelStore()
	let idx = findIndexForHouse(number)
	let res = []
	if (idx > -1) {
		let spaces = giveAllSpaceForAToken(idx, 2, 2)
		if (idx >= rf.ssW) {
			if (store.mapData.coords[spaces[0] - rf.ssW] === rf.EMPTY_SPACE && store.mapData.coords[spaces[1] - rf.ssW] === rf.EMPTY_SPACE) {
				res.push(0)
			}
		}
		if (spaces[1] % rf.ssW < rf.ssW - 1) {
			if (store.mapData.coords[spaces[1] + 1] === rf.EMPTY_SPACE && store.mapData.coords[spaces[3] + 1] === rf.EMPTY_SPACE) {
				res.push(1)
			}
		}
		if (idx < (rf.ssH - 2) * rf.ssW) {
			if (store.mapData.coords[spaces[2] + rf.ssW] === rf.EMPTY_SPACE && store.mapData.coords[spaces[3] + rf.ssW] === rf.EMPTY_SPACE) {
				res.push(2)
			}
		}
		if (spaces[0] % rf.ssW > 0) {
			if (store.mapData.coords[spaces[0] - 1] === rf.EMPTY_SPACE && store.mapData.coords[spaces[2] - 1] === rf.EMPTY_SPACE) {
				res.push(3)
			}
		}
	}
	return res
}

export function giveIndexForEdge(edge, index) {
	switch (edge) {
		case 0:
			return index - rf.ssW
		case 1:
			return index + 2
		case 2:
			return index + 2 * rf.ssW
		case 3:
			return index - 1
	}
	return -1
}

export function giveEdgeForIndex(edgeIndex, houseIndex) {
	if (houseIndex - edgeIndex == rf.ssW) return 0
	if (houseIndex - edgeIndex == -2) return 1
	if (edgeIndex - houseIndex == 2 * rf.ssW) return 2
	if (edgeIndex - houseIndex == -1) return 3

	return -1
}

export function giveEmptyIndexesInTile(tileIndex) {
	const store = useModelStore()
	let c = []
	let idx = giveStartingIndexForTile(tileIndex)
	let cdx = giveCoord(idx)

	for (let i = 0; i < 5; i++) {
		for (let j = 0; j < 5; j++) {
			let localIndex = giveIndex(cdx[0] + i, cdx[1] + j)
			if (store.mapData.coords[localIndex] === rf.EMPTY_SPACE) c.push(localIndex)
		}
	}
	return c
}

/**
 * Adds an element on the board. It can be used to remove such an element
 * @param {string} type - The element type
 * @param {number} number - The element number / p.colour
 * @param {number} index - The index position on the board
 * @param {boolean} rotated - If the element token is rotated or not
 * @param {boolean} emptying - If this should be a removal instead
 */
export function addElement(type, number, index, rotated, emptying) {
	const store = useModelStore()
	let ref = []
	let val = 0
	if (type == rf.TYPE_CAMPAIGN) {
		ref = [rf.MARKETING_CAMPAIGNS[number].width, rf.MARKETING_CAMPAIGNS[number].height]
		val = rf.MARKETING + number
		if (number >= 4 && number <= 6) {
			// It must be a plane, so need to shift the index off the board
			if (!rotated) {
				// on top or bottom
				if (number == 4) ref.push(ref.shift())
				if (isIndexOnBottomEdgeOfMap(index, ref[0])) index = index + store.mapData.dimensions[0] * 5
				else index = index - store.mapData.dimensions[0] * 5 * 2
			} else {
				if (number == 4) ref.push(ref.shift())
				if (isIndexOnLeftEdgeOfMap(index, ref[0])) index = index - 2
				else index = index + 1
			}
		}
	} else if (type == rf.TYPE_HOUSE) {
		ref = [2, 3]
		val = rf.HOUSE + number
	} else if (type == rf.TYPE_GARDEN) {
		ref = [2, 1]
		val = rf.GARDEN
	} else if (type == rf.TYPE_RESTAURANT) {
		ref = [2, 2]
		val = rf.RESTAURANT_OPEN + number
	} else if (type == rf.TYPE_COFFEE_SHOP) {
		ref = [1, 1]
		val = rf.COFFEE_SHOP + number
	}

	if (rotated === true || rotated === 1 || rotated === 3) {
		let t = ref[0]
		ref[0] = ref[1]
		ref[1] = t
	}

	if (emptying === true) {
		val = 0
		if (type == rf.TYPE_CAMPAIGN && number >= 4 && number <= 6) val = -1
	}

	for (let i = 0; i < ref[0]; i++) {
		for (let j = 0; j < ref[1]; j++) {
			let idx = index + i + j * rf.ssW
			store.mapData.coords[idx] = val
		}
	}
}

// Compute roadwork indexes on-the-fly from newRoads and current turn.
//  only roads where turnAdded === currentTurn get roadwork markers on adjacent existing roads.
export function getRoadworkIndexes() {
	const store = useModelStore()
	const result = []
	const tW = store.mapData.dimensions[0] * 5

	for (const road of store.newRoads) {
		if (road.turnAdded !== store.gameflow.turn) continue

		const index = road.index
		const variety = road.variety
		const rotation = road.rotation

		if (variety !== 2) {
			const sqw = variety === 1 ? 4 : 2
			if (rotation === 0) {
				if (store.mapData.coords[index - 1] === rf.ROAD) result.push(index - 1)
				if (store.mapData.coords[index + sqw] === rf.ROAD) result.push(index + sqw)
			} else if (rotation === 1) {
				if (store.mapData.coords[index - tW] === rf.ROAD) result.push(index - tW)
				if (store.mapData.coords[index + tW * sqw] === rf.ROAD) result.push(index + tW * sqw)
			}
		} else {
			if (rotation === 0 && store.mapData.coords[index + 2] === rf.ROAD) result.push(index + 2)
			if (rotation === 0 && store.mapData.coords[index + tW * 2] === rf.ROAD) result.push(index + tW * 2)
			if (rotation === 1 && store.mapData.coords[index - 1] === rf.ROAD) result.push(index - 1)
			if (rotation === 1 && store.mapData.coords[index + tW * 2 + 1] === rf.ROAD) result.push(index + tW * 2 + 1)
			if (rotation === 2 && store.mapData.coords[index - 1 - tW + 1] === rf.ROAD) result.push(index - 1 - tW + 1)
			if (rotation === 2 && store.mapData.coords[index - 1 + tW - 1] === rf.ROAD) result.push(index - 1 + tW - 1)
			if (rotation === 3 && store.mapData.coords[index - tW] === rf.ROAD) result.push(index - tW)
			if (rotation === 3 && store.mapData.coords[index + tW + 2] === rf.ROAD) result.push(index + tW + 2)
		}
	}
	return result
}

export function addNewRoad(index, variety, rotation, isFirstTurn) {
	const store = useModelStore()
	if (variety != 2) {
		let roadLength = 2
		if (variety == 1) roadLength = 4
		if (rotation == 0) {
			for (let i = 0; i < roadLength; i++) {
				if (isFirstTurn) store.mapData.coords[index + i] = rf.ROAD_UC
				else store.mapData.coords[index + i] = rf.ROAD
			}
		}
		if (rotation == 1) {
			for (let i = 0; i < roadLength * store.mapData.dimensions[0] * 5; i += store.mapData.dimensions[0] * 5) {
				if (isFirstTurn) store.mapData.coords[index + i] = rf.ROAD_UC
				else store.mapData.coords[index + i] = rf.ROAD
			}
		}
	} else {
		// add a corner road
		let roadModel = []
		if (rotation == 0)
			roadModel = [
				[1, 1],
				[1, 0],
			]
		if (rotation == 1)
			roadModel = [
				[1, 1],
				[0, 1],
			]
		if (rotation == 2)
			roadModel = [
				[0, 1],
				[1, 1],
			]
		if (rotation == 3)
			roadModel = [
				[1, 0],
				[1, 1],
			]

		if (roadModel[0][0] == 0) index -= 1

		// Now the index is in the correct place, go thru the object and edit coorder
		for (let y = 0; y < roadModel.length; y++) {
			for (let x = 0; x < roadModel[y].length; x++) {
				if (isFirstTurn && roadModel[y][x] == 1) store.mapData.coords[index + x + store.mapData.dimensions[0] * 5 * y] = rf.ROAD_UC
				else if (!isFirstTurn && roadModel[y][x] == 1) store.mapData.coords[index + x + store.mapData.dimensions[0] * 5 * y] = rf.ROAD
			}
		}
	}
}

export function addPark(index, parkModel) {
	const store = useModelStore()
	// Shift indecc back to top left of object
	if (parkModel[0][0] == 0 && parkModel[0][1] == 0) index -= 2
	else if (parkModel[0][0] == 0) index -= 1

	// Now the index is in the correct place, go thru the object and edit coorder
	for (let y = 0; y < parkModel.length; y++) {
		for (let x = 0; x < parkModel[y].length; x++) {
			if (parkModel[y][x] == 1) store.mapData.coords[index + x + store.mapData.dimensions[0] * 5 * y] = rf.PARK
		}
	}
}

export function addFreeway(_index, rotated, sides) {
	const store = useModelStore()
	let index = _index
	let freewayWidth = 3
	let freewayHeight = 1
	if (rotated) {
		freewayWidth = 1
		freewayHeight = 3
	}
	if (!sides) {
		// on bottom
		if (isIndexOnBottomEdgeOfMap(index, freewayWidth)) {
			for (let y = 0; y < freewayHeight; y++) {
				for (let x = 0; x < freewayWidth; x++) {
					store.mapData.coords[index + store.mapData.dimensions[0] * 5 + store.mapData.dimensions[0] * 5 * y + x] = rf.FREEWAY
				}
			}
		} else {
			// on top
			for (let y = 0; y < freewayHeight; y++) {
				for (let x = 0; x < freewayWidth; x++) {
					store.mapData.coords[index - store.mapData.dimensions[0] * 5 - store.mapData.dimensions[0] * 5 * y + x] = rf.FREEWAY
				}
			}
		}
	} else {
		// on side of map
		if (isIndexOnLeftEdgeOfMap(index, freewayWidth)) {
			for (let y = 0; y < freewayHeight; y++) {
				for (let x = 0; x < freewayWidth; x++) {
					store.mapData.coords[index - 1 + store.mapData.dimensions[0] * 5 * y - x] = rf.FREEWAY
				}
			}
		} else {
			// on top
			for (let y = 0; y < freewayHeight; y++) {
				for (let x = 0; x < freewayWidth; x++) {
					store.mapData.coords[index + 1 + store.mapData.dimensions[0] * 5 * y + x] = rf.FREEWAY
				}
			}
		}
	}
}
