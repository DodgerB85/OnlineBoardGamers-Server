import * as rf from "../js/RNBreference"
import * as util from "../js/RNButil"
import * as model from "../js/RNBmodel"
import * as hd from "../js/RNBhex"
import * as coord from "../js/RNBcoordinate"
import * as view from "../js/RNBview"

import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"
import { computed } from "vue"

// THIS IS ALSO USE IN MapoomPanel, view
// This turns our relative/absolute co-ords into [x,y] pixel positions
export const computedToXY = computed(() => {
	const store = useModelStore()
	// Pre-calculate basis once when store changes
	const vertices = store.VERTICES_POINTY_EXT
	const vertexPoints = (side) => [vertices[side], vertices[(side + 1) % 6]]
	const basis = [vertices, util.indexArray(6).map(vertexPoints)]

	// Return a stable function
	return (coordinates) => {
		// Since current and pointy are the same in your code, we use the pre-calc basis
		return coord.toXY(1, basis)(coordinates)
	}
})

export const computedHexes = computed(() => {
	const store = useModelStore()
	const personal = usePersonalStore()
	store.debugVars.computedHexCounter++
	// Create a reactive array to hold the computed hexes
	const computedHexes =
		/*reactive(*/
		store.mapData.hexData.map(
			(hex) => ({
				...hex, // Spread to copy properties
				buildingGfxs: [],
				homeMarkerGfxs: [],
				resourceGfxs: [],
				allResourceGfxs: [],
				whiteCrosses: [],
				mineData: [],
				roadSegments: [],
				powerLineSegments: [],
			}) //)
		)

	const toXY = computedToXY.value

	for (let i = 0; i < computedHexes.length; i++) {
		const hex = computedHexes[i]
		computedHexes[i].roadSegments = util.boolFilter(computedHexes[i].nodeEdges, computedHexes[i].edgeHasRoad).map((arr) => arr.map((a) => hex.vertices[a]))
		computedHexes[i].powerLineSegments = util.boolFilter(computedHexes[i].nodeEdges, computedHexes[i].edgeHasPowerLine).map((arr) => arr.map((a) => hex.vertices[a]))
		let resourcesOnHex = model.resourcesOnHex(hex.hexID)
		let buildingsOnHex = model.buildingsOnHex(hex.hexID)
		let homeMarkersOnHex = model.homeMarkersOnHex(hex.hexID)
		const vertexBuckets = util.uniqueOnly(hex.bucketIdsCurrent)
		for (let j = 0; j < vertexBuckets.length; j++) {
			let bucket = vertexBuckets[j]
			let resourcesInBucket = resourcesOnHex.filter((r) => bucket === r.location[2])
			let buildingsInBucket = buildingsOnHex.filter((b) => bucket === b.location[2])
			let homeMarkersInBucket = homeMarkersOnHex.filter((h) => bucket === h.location[2])
			let bucketBuildingLocations = util
				.boolFilter(
					hex.chitLocations,
					hex.chitLocationBucketIds.map((a, n) => hex.chitLocationBuildingEligible[n] && hex.bucketIdsCurrent[a] === bucket)
				)
				.toSorted((a, b) => {
					// set a building on the mountains to the center
					//if (hex.baseTerrain === rf.TERR_MOUNTAINS && homeMarkersInBucket.length === 0) {
					if (hex.riverType === rf.RIVER_NONE /*&& homeMarkersInBucket.length === 0*/) {
						const aIsCenter = a[0] === 0 && a[1] === 0
						const bIsCenter = b[0] === 0 && b[1] === 0

						if (aIsCenter && !bIsCenter) return -1 // Move [0,0] to the top
						if (!aIsCenter && bIsCenter) return 1 // Keep [0,0] at the top
					} else if (hex.riverType === rf.RIVER_SOURCE) {
						// Move smallest absolute Y offset to the top
						const yDistA = Math.abs(a[1])
						const yDistB = Math.abs(b[1])

						if (yDistA !== yDistB) {
							return yDistA - yDistB
						}

						// Tie-breaker: Move closest X offset to the top if Y offsets are equal
						return Math.abs(a[0]) - Math.abs(b[0])
					}

					// 2. Fall back to your original Y-coord (bottom-most) sorting
					return b[1] - a[1]
				})
			let bucketResLocations = util
				.boolFilter(
					hex.chitLocations,
					hex.chitLocationBucketIds.map((a) => hex.bucketIdsCurrent[a] === bucket)
				)
				.toSorted((a, b) => b[1] - a[1])

			// Add buildings
			for (let k = 0; k < buildingsInBucket.length; k++) {
				let building = buildingsInBucket[k]
				if (building.type === rf.BLDG_MINE) {
					// Just set an X/Y to display, and note the bldg ID
					computedHexes[i].mineData.push(building.id)
					computedHexes[i].mineData.push(bucketBuildingLocations[0])
					computedHexes[i].mineData.push(building.remainingMineContent)
					continue
				} // Mines are SVG, not images
				let buildingGfx = {}
				buildingGfx.id = building.id
				buildingGfx.img = building.gfx
				buildingGfx.width = rf.DEFAULT_BLDG_WIDTH
				buildingGfx.height = rf.DEFAULT_BLDG_HEIGHT
				buildingGfx.pos = bucketBuildingLocations[0]

				// NO! DO NOT SET IT HERE! CAUSES RECURSIONS!
				//building.location = [rf.LOCATION_LAND_VERTEX, hex.hexID, buildingVertexes[k]]

				//buildingGfx.pos = vec.sum(vec.scaleBy(0.6, vertices[buildingVertexes[k]]), vec.scaleBy(0.5, [-buildingGfx.width, -buildingGfx.height]))
				// NO - THIS CAUSES INFINITE RECURSION. JUST COPY THE MAIN BIT MANUALLY
				//buildingGfx.pos = getComputedBuildingPos(hex.hexID, buildingVertexes[k])

				//buildingGfx.pos = vec.scaleBy(forZoomPanel ? 1 : store.RATIO, vec.sum(bucketBuildingLocations0, vec.scaleBy(-0.5, [rf.DEFAULT_BLDG_WIDTH, rf.DEFAULT_BLDG_HEIGHT])))
				//buildingGfx.pos = vec.sum(bucketBuildingLocations0, vec.scaleBy(-0.5, [rf.DEFAULT_BLDG_WIDTH, rf.DEFAULT_BLDG_HEIGHT]))
				computedHexes[i].buildingGfxs.push(buildingGfx)
			}

			// If possible, remove the bullding location from the possible res ones
			if (buildingsInBucket.length > 0 && bucketResLocations.length > 1) {
				bucketResLocations = bucketResLocations.filter((sub) => !(sub[0] === bucketBuildingLocations[0][0] && sub[1] === bucketBuildingLocations[0][1]))
			}

			// Add home markers
			for (let k = 0; k < homeMarkersInBucket.length; k++) {
				let homeMarker = homeMarkersInBucket[k]
				let homeTileGfx = {}
				homeTileGfx.location = homeMarker.location
				homeTileGfx.width = rf.DEFAULT_BLDG_WIDTH
				homeTileGfx.height = rf.DEFAULT_BLDG_HEIGHT
				// If we are NOT on a river hex, just go in the middle if no building, else most South
				if (model.getHexByID(homeMarker.location[1]).riverType === rf.RIVER_NONE) {
					homeTileGfx.pos = bucketBuildingLocations[0]
					if (buildingsInBucket.length >= 1 && bucketBuildingLocations.length >= 2) homeTileGfx.pos = bucketBuildingLocations[1]
					else if (buildingsInBucket.length >= 2 && bucketBuildingLocations.length >= 3) homeTileGfx.pos = bucketBuildingLocations[2]
				} else {
					// River hex logic
					homeTileGfx.pos = bucketBuildingLocations[0]
					if (buildingsInBucket.length === 1 && bucketBuildingLocations.length >= 2) homeTileGfx.pos = bucketBuildingLocations[1]
					else if (buildingsInBucket.length === 2 && bucketBuildingLocations.length >= 3) homeTileGfx.pos = bucketBuildingLocations[2]
					// If there's only 1 building position, check for homeMarkerFallbackPosition
					if (buildingsInBucket.length > 0 && bucketBuildingLocations.length === 1 && hex.homeMarkerFallbackPositions) {
						// Find the index of the building location in chitLocations
						const buildingLocIndex = hex.chitLocations.findIndex((loc) => loc[0] === bucketBuildingLocations[0][0] && loc[1] === bucketBuildingLocations[0][1])
						// If there's a fallback position at the same index, use it
						if (buildingLocIndex >= 0 && hex.homeMarkerFallbackPositions[buildingLocIndex] !== null) {
							homeTileGfx.pos = hex.homeMarkerFallbackPositions[buildingLocIndex]
						}
					}
				}
				homeTileGfx.img = "home_" + personal.getCorrectedColour(homeMarker.colour)
				computedHexes[i].homeMarkerGfxs.push(homeTileGfx)
			}

			// Add resources
			const bucketGfxs = view.getResourceGfxs(resourcesInBucket, bucketResLocations)

			// Add them to the hex data
			computedHexes[i].allResourceGfxs.push(...bucketGfxs)
			/*for (let k = 0; k < /*Math.min(resourcesInBucket.length,*/ /* resourcesInBucket.length; k++) {
				let resGfx = {}

				resGfx.id = resourcesInBucket[k].id
				resGfx.img = resourcesInBucket[k].gfx
				resGfx.width = rf.DEFAULT_RES_WIDTH
				resGfx.height = rf.DEFAULT_RES_HEIGHT
				resGfx.movedThisTurn = resourcesInBucket[k].movedTransporterID >= 0

				let len = bucketResLocations.length
				let posIdx = k % len
				let offsetsCount = Math.floor(k / len)
				let xPos = bucketResLocations[posIdx][0]
				let yPos = bucketResLocations[posIdx][1]
				resGfx.pos = [xPos, yPos]
				resGfx.offsets = offsetsCount
				if (k < 6) computedHexes[i].resourceGfxs.push(resGfx)
				computedHexes[i].allResourceGfxs.push(resGfx)
			}
			// + symbol
			/*
			if (resourcesInBucket.length > 6) {
				let whiteCross = {}
				whiteCross.width = rf.DEFAULT_RES_WIDTH * store.RATIO
				whiteCross.height = rf.DEFAULT_RES_HEIGHT * store.RATIO
				whiteCross.pos = vec.sum(computedHexes[i].resourceGfxs[computedHexes[i].resourceGfxs.length - 1].pos, vec.scaleBy(1 / 5, [whiteCross.width, whiteCross.height]))
				computedHexes[i].whiteCrosses.push(whiteCross)
			}
        */
		}
	}

	for (const edge of store.mapData.edgeData) {
		const hexIds = edge.edgeHexIDs
		const hexes = hexIds.map((i) => computedHexes[i])
		const hexSides = [hd.getJoiningSide(hexes[0].coord, hexes[1].coord), hd.getJoiningSide(hexes[1].coord, hexes[0].coord)]
		if (edge.hasRoad.length === 1) {
			if (edge.hasRoad[0]) {
				for (const j of [0, 1]) {
					const hex = hexes[j]
					const side = hexSides[j]
					const entryNode = hex.sideNodeIds[side]
					//hex.roadSegments.push([hex.nodeVertexDefinitions[entryNode], coord.relative([side, 0.5, 0])].map(toXY))
					hex.roadSegments.push([hex.nodeVertexDefinitions[entryNode], coord.relative([side, 0.5, 0])].map((c) => toXY(c, true)))
				}
			}
		} else {
			for (const k of [0, 1].filter((k) => edge.hasRoad[k])) {
				for (const j of [0, 1]) {
					const hex = hexes[j]
					const side = hexSides[j]
					const lr = j === 0 ? k : (k + 1) % 2
					const entryNode = hex.cornerNodeIds[side][lr]
					//hex.roadSegments.push([hex.nodeVertexDefinitions[entryNode], coord.relative([side, rf.ROAD_SIDE_ALIGNMENT + (1 - 2 * rf.ROAD_SIDE_ALIGNMENT) * lr, 0])].map(toXY))
					hex.roadSegments.push(
						[hex.nodeVertexDefinitions[entryNode], coord.relative([side, rf.ROAD_SIDE_ALIGNMENT + (1 - 2 * rf.ROAD_SIDE_ALIGNMENT) * lr, 0])].map((c) => toXY(c, true)) // Explicitly forcing Pointy
					)
				}
			}
		}
		// POWER LINES - mirror the roads, but draw slightly inside so they fit next to a road
		if (edge.hasPowerLine.length === 1) {
			if (edge.hasPowerLine[0]) {
				for (const j of [0, 1]) {
					const hex = hexes[j]
					const side = hexSides[j]
					const entryNode = hex.sideNodeIds[side]
					if (entryNode !== -1) hex.powerLineSegments.push([hex.nodeVertexDefinitions[entryNode], coord.relative([side, 0.5, 0])].map((c) => toXY(c, true)))
				}
			}
		} else {
			for (const k of [0, 1].filter((k) => edge.hasPowerLine[k])) {
				for (const j of [0, 1]) {
					const hex = hexes[j]
					const side = hexSides[j]
					const lr = j === 0 ? k : (k + 1) % 2
					const entryNode = hex.cornerNodeIds[side][lr]
					if (entryNode !== -1) {
						hex.powerLineSegments.push(
							[hex.nodeVertexDefinitions[entryNode], coord.relative([side, rf.ROAD_SIDE_ALIGNMENT + (1 - 2 * rf.ROAD_SIDE_ALIGNMENT) * lr, 0])].map((c) => toXY(c, true))
						)
					}
				}
			}
		}
	}

	// road joins
	for (const hex of computedHexes) {
		/*
    // Flatten all [start, end] pairs into a single list of points
		const allPoints = hex.roadSegments.flat()

		// Use a Map or Set to keep only unique coordinates (to avoid over-drawing circles)
		const uniquePoints = new Map()

		allPoints.forEach((p) => {
			// Create a string key "x,y" to identify unique nodes
			const key = `${p[0].toFixed(2)},${p[1].toFixed(2)}`
			if (!uniquePoints.has(key)) {
				uniquePoints.set(key, p)
			}
		})

		// Store these as the junction points for the SVG to draw
		hex.roadJoinPoints = Array.from(uniquePoints.values())
*/
		// THIS IS SIMPLE BUT EFFECTIVE
		hex.fullRoadPath = hex.roadSegments
			.map((seg) => {
				// Each segment is [[x1, y1], [x2, y2]]
				return `M${seg[0][0] * store.RATIO} ${seg[0][1] * store.RATIO} L${seg[1][0] * store.RATIO} ${seg[1][1] * store.RATIO}`
			})
			.join(" ")
		hex.fullRoadPathZP = hex.roadSegments
			.map((seg) => {
				// Each segment is [[x1, y1], [x2, y2]]
				return `M${seg[0][0] * 1} ${seg[0][1] * 1} L${seg[1][0] * 1} ${seg[1][1] * 1}`
			})
			.join(" ")
		hex.fullPowerLinePath = hex.powerLineSegments
			.map((seg) => {
				// Each segment is [[x1, y1], [x2, y2]]
				return `M${seg[0][0] * store.RATIO} ${seg[0][1] * store.RATIO} L${seg[1][0] * store.RATIO} ${seg[1][1] * store.RATIO}`
			})
			.join(" ")
		hex.fullPowerLinePathZP = hex.powerLineSegments
			.map((seg) => {
				// Each segment is [[x1, y1], [x2, y2]]
				return `M${seg[0][0] * 1} ${seg[0][1] * 1} L${seg[1][0] * 1} ${seg[1][1] * 1}`
			})
			.join(" ")
	}

	return computedHexes
})

// Used by history
export function getComputedBuildingPos(hexID, buildingBucketID) {
	const hex = model.getHexByID(hexID, "computes2")

	/*// 1. Get unique buckets once
	const vertexBuckets = util.uniqueOnly(hex.bucketIdsCurrent)
	const targetBucket = vertexBuckets[buildingBucketID]

	if (targetBucket === undefined) return null

	// 2. Perform a single-pass search (Replace filter + sort)
	let bestLocation = null
	//let highestY = -Infinity

	const ids = hex.chitLocationBucketIds
	const eligible = hex.chitLocationBuildingEligible
	const currentBuckets = hex.bucketIdsCurrent

	/*for (let n = 0; n < ids.length; n++) {
		// Check eligibility and bucket match first
		if (eligible[n] && currentBuckets[ids[n]] === targetBucket) {
			const rawCoord = hex.chitLocations[n]
			// We just keep track of the one with the largest Y value
			//if (rawCoord[1] > highestY) {
			//	highestY = rawCoord[1]
				bestLocation = rawCoord
				break
			//}
		}
	}*/
	let bucketBuildingLocations = util
		.boolFilter(
			hex.chitLocations,
			hex.chitLocationBucketIds.map((a, n) => hex.chitLocationBuildingEligible[n] && hex.bucketIdsCurrent[a] === buildingBucketID)
		)
		.toSorted((a, b) => {
			// set a building on the mountains to the center
			//if (hex.baseTerrain === rf.TERR_MOUNTAINS && homeMarkersInBucket.length === 0) {
			if (hex.riverType === rf.RIVER_NONE /*&& homeMarkersInBucket.length === 0*/) {
				const aIsCenter = a[0] === 0 && a[1] === 0
				const bIsCenter = b[0] === 0 && b[1] === 0

				if (aIsCenter && !bIsCenter) return -1 // Move [0,0] to the top
				if (!aIsCenter && bIsCenter) return 1 // Keep [0,0] at the top
			}

			// 2. Fall back to your original Y-coord (bottom-most) sorting
			return b[1] - a[1]
		})

	return bucketBuildingLocations[0]
}

// Could also add vertexBasis (fix the actual function)
// export const vertexBasis = comuted(() => [store.VERTICES_POINTY_EXT, util.indexArray(6).map(vertexPoints)])
/*
export const globalRoadNetworks = computed(() => {
	const store = useModelStore()
	const hexes = computedHexes.value
	// 1. Flatten all segments from every hex into one big list
	const allSegments = hexes.flatMap((h) => {
		const [hx, hy] = h.rawXY // The pre-scaled absolute center of the hex

		return h.roadSegments.map(([p1, p2]) => {
			// p1 and p2 are [x, y] relative to the hex center
			return [
				[Math.round(p1[0] * store.RATIO + hx), Math.round(p1[1] * store.RATIO + hy)], // Absolute p1
				[Math.round(p2[0] * store.RATIO + hx), Math.round(p2[1] * store.RATIO + hy)], // Absolute p2
			]
		})
	})

	// 2. Group these segments into independent networks
	const networks = []
	const visited = new Set()
	const toKey = (p) => `${p[0].toFixed(0)},${p[1].toFixed(0)}`

	allSegments.forEach((seg, i) => {
		if (visited.has(i)) return

		seg[0][0] = Math.round(seg[0][0])
		seg[0][1] = Math.round(seg[0][1])
		seg[1][0] = Math.round(seg[1][0])
		seg[1][1] = Math.round(seg[1][1])

		const currentNetwork = []
		const queue = [i]
		visited.add(i)

		while (queue.length > 0) {
			const idx = queue.shift()
			const s = allSegments[idx]
			currentNetwork.push(s)

			// Find all other segments that touch this one
			allSegments.forEach((other, oIdx) => {
				if (!visited.has(oIdx)) {
					const sharesPoint = [s[0], s[1]].some((p1) => [other[0], other[1]].some((p2) => toKey(p1) === toKey(p2)))
					if (sharesPoint) {
						visited.add(oIdx)
						queue.push(oIdx)
					}
				}
			})
		}
		networks.push(currentNetwork)
	})

	// 3. Convert each network into a single smooth SVG path string
	return networks.map((net) => buildSmoothRoadPath(net, store.RATIO))
})

export function buildSmoothRoadPath(segments, ratio) {
	if (!segments.length) return ""

	const adj = new Map()
	const toKey = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`

	// 1. Build Adjacency List
	segments.forEach(([p1, p2]) => {
		const k1 = toKey(p1),
			k2 = toKey(p2)
		if (!adj.has(k1)) adj.set(k1, { pt: p1, neighbors: [] })
		if (!adj.has(k2)) adj.set(k2, { pt: p2, neighbors: [] })
		adj.get(k1).neighbors.push(p2)
		adj.get(k2).neighbors.push(p1)
	})

	let path = ""
	const visited = new Set()

	for (const [key, node] of adj) {
		if (visited.has(key)) continue

		let stack = [{ pt: node.pt, parent: null }]

		while (stack.length > 0) {
			const { pt, parent } = stack.pop()
			const currKey = toKey(pt)

			// If we haven't been here, move the pen to the start of this branch
			if (!visited.has(currKey)) {
				path += ` M ${pt[0]} ${pt[1]}`
				visited.add(currKey)
			}

			const neighbors = adj.get(currKey).neighbors
			neighbors.forEach((next) => {
				const nextKey = toKey(next)
				if (!visited.has(nextKey)) {
					const midX = (pt[0] + next[0]) / 2
					const midY = (pt[1] + next[1]) / 2

					// Instead of a continuous line, we draw the curve and Move the pen
					path += ` Q ${pt[0]} ${pt[1]}, ${midX} ${midY}`
					path += ` L ${next[0]} ${next[1]}`

					stack.push({ pt: next, parent: pt })
				}
			})
		}
	}
	return path
}
*/
