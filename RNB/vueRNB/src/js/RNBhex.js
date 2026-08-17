/**
 * These are functions to do with displaying or laying out the map.
 *  * NOTE: Pixel / hex coord / layout / display functions are generally in here.
 * Game interation type map functions are in RNBmap
 * If they do not need to be directly in the component, it is easier to put them here.
 * This helps to stop the component getting cluttered up with a lot of functions,
 * and keeps the component mainly for the display
 *
 */

/**
AVAILABLE FUNCTIONS
===================
calculateScoord(q, r)
hexToPixel(coord, forcePointy)
hexCenter(coord, raw, forRotationCenter)
updateAllHexRawXY()
getHexPoints(forHighlight, ratio, keep1hexSize)
calculateGridDimensions()
getViewbox()
isNeighbour(coord1, coord2)
setNeighbours()
getJoiningSide(fromHexCoord, toHexCoord)
setPlaceableTiles()
rotateHex(hexData, rotation)
getHexIDandVertexesAroundGivenVertex(inputHexID, inputVertex, getReachableHexIDsOnly)

 */

import * as rf from "./RNBreference.js"
import * as util from "./RNButil.js"
import * as model from "./RNBmodel.js"
import * as coord from "./RNBcoordinate.js"
import * as IO from "../backend/RNB_IO.js"

import { useModelStore } from "../stores/RNBstore.js"
import { usePersonalStore } from "../stores/RNBpersonal.js"

// Map Vars
const directionVectors = [
	[-1, +1, 0],
	[-1, 0, +1],
	[0, -1, +1],
	[+1, -1, 0],
	[+1, 0, -1],
	[0, +1, -1],
]

export function calculateScoord(q, r) {
	return (q + r) * -1
}

export function doZoom(dir, forceNoSave = false, fromMapEditor = false) {
	const personal = usePersonalStore()
	const store = useModelStore()
	let doSave = false
	if (personal.pov >= 0) doSave = true
	store.refSize += dir * 400
	if (store.refSize < 1000) {
		store.refSize = 1000
		doSave = false
	} else if (store.refSize > 8000) {
		store.refSize = 8000
		doSave = false
	} else clearInterval(personal.zoomInterval)
	if (doSave && !forceNoSave) {
		personal.zoomInterval = setTimeout(function () {
			clearInterval(personal.zoomInterval)
			IO.saveZoom(store.refSize)
		}, 1000)
	}
	if (fromMapEditor) {
		calculateCanvasSize(store.context.action === rf.ACT_PLACE_HEX)
		updateAllHexRawXY()
	} else calculateCanvasSize(false)
}

import { nextTick } from "vue"

export async function changeHexStyle() {
	const store = useModelStore()
	// save transporters copy
	const transportersCopy = JSON.parse(JSON.stringify(store.ALL_TRANSPORTERS))
	store.ALL_TRANSPORTERS.splice(0)
	await nextTick()
	store.hexStyle = store.hexStyle === rf.FLAT ? rf.POINTY : rf.FLAT
	calculateCanvasSize()
	// DO NOT DO THIS! Map style should be able to be changed at any point. This will wipe wall data
	//map.resetAllEdgeData()
	updateAllHexRawXY()
	// restore transporters
	await nextTick()
	Object.assign(store.ALL_TRANSPORTERS, transportersCopy)
}

// Sometimes you need to force pointy, as item positions are ALL calculated according to pointy, and then later rotated 30 degrees
export function hexToPixel(coord, forcePointy) {
	const store = useModelStore()
	let canvasSize = store.canvasSize
	let refSize = store.refSize
	var size = [(refSize / canvasSize) * 50, (refSize / canvasSize) * 50]

	let M = [0, 0, 0, 0, 0, 0, 0, 0, 0]
	// FLAT
	if (store.hexStyle === rf.FLAT && !forcePointy) M = [3.0 / 2.0, 0.0, Math.sqrt(3.0) / 2.0, Math.sqrt(3.0), 2.0 / 3.0, 0.0, -1.0 / 3.0, Math.sqrt(3.0) / 3.0, 0.0]
	// POINTY
	else if (store.hexStyle === rf.POINTY || forcePointy) M = [Math.sqrt(3.0), Math.sqrt(3.0) / 2.0, 0.0, 3.0 / 2.0, Math.sqrt(3.0) / 3.0, -1.0 / 3.0, 0.0, 2.0 / 3.0, 0.5]

	var x = (M[0] * coord[0] + M[1] * coord[1]) * size[0]
	var y = (M[2] * coord[0] + M[3] * coord[1]) * size[1]
	return [x, y]
}

export function hexCenter(coord, raw, forRotationCenter) {
	const store = useModelStore()
	let canvasSize = store.canvasSize
	let refSize = store.refSize
	var size = [(refSize / canvasSize) * 50, (refSize / canvasSize) * 50]

	let M = [0, 0, 0, 0, 0, 0, 0, 0, 0]
	// FLAT
	if (store.hexStyle === rf.FLAT) M = [3.0 / 2.0, 0.0, Math.sqrt(3.0) / 2.0, Math.sqrt(3.0), 2.0 / 3.0, 0.0, -1.0 / 3.0, Math.sqrt(3.0) / 3.0, 0.0]

	// POINTY
	if (store.hexStyle === rf.POINTY) M = [Math.sqrt(3.0), Math.sqrt(3.0) / 2.0, 0.0, 3.0 / 2.0, Math.sqrt(3.0) / 3.0, -1.0 / 3.0, 0.0, 2.0 / 3.0, 0.5]

	var x = M[0] * coord[0] + M[1] * coord[1]
	var y = M[2] * coord[0] + M[3] * coord[1]
	let p = [x * size[0], y * size[1]]

	if (forRotationCenter) return `${p[0].toFixed(0)},${p[1].toFixed(0)}`
	if (raw) return [parseFloat(p[0].toFixed(1)), parseFloat(p[1].toFixed(1))]
	return `translate(${p[0].toFixed(0)},${p[1].toFixed(0)})`
}

export function updateAllHexRawXY() {
	const store = useModelStore()
	const localToXY = localUncomputedToXY()

	store.mapData.hexData.forEach((h) => {
		h.rawXY = hexCenter(h.coord, true, false)

		const rotate = coord.rotateCoord(h.rotation)

		const originalData = rf.ALL_HEX_DATA.find((hex) => hex.hexTerrainID === h.hexTerrainID)
		const originalVertexDefinitions = originalData.nodeVertexDefinitions
		const originalVertexDefinitionsRotated = originalVertexDefinitions.map(rotate)
		h.vertices = originalVertexDefinitionsRotated.map((coord) => localToXY(coord))

		// Compute river vertex positions
		const riverVertexDefinitionsRotated = originalData.riverVertexDefinitions.map(rotate)
		h.riverVertices = riverVertexDefinitionsRotated.map((coord) => localToXY(coord))

		const originalChitLocations = originalData.chitLocations
		const originalChitLocationsRotated = originalChitLocations.map(rotate)
		h.chitLocations = originalChitLocationsRotated.map((coord) => localToXY(coord))
		const originalHomeMarkerFallbackPositions = originalData.homeMarkerFallbackPositions
		const originalHomeMarkerFallbackPositionsRotated = originalHomeMarkerFallbackPositions.map((pos) => (pos !== null ? rotate(pos) : null))
		h.homeMarkerFallbackPositions = originalHomeMarkerFallbackPositionsRotated.map((coord) => (coord !== null ? localToXY(coord) : null))
	})
}

// Always ust pointy points, and rotate 30 degrees as necessary
export function getHexPoints(forHighlight, ratio, keep1hexSize) {
	const store = useModelStore()

	let hexSideLength = store.refSize // Adjust this value based on the desired hex size in pixels

	// Multiply by the ratio to allow for hex to sit inside main hex
	hexSideLength *= ratio

	if (forHighlight) hexSideLength += 400
	const canvasSize = store.canvasSize // Adjust this value based on the size of the container
	// FLAT POINTS
	/*const flatPoints = [
		[0.5, 0],
		[0.25, -0.435],
		[-0.25, -0.435],
		[-0.5, 0],
		[-0.25, 0.435],
		[0.25, 0.435],
	]*/

	let pointyPoints = [
		[0, -0.501721],
		[0.433, -0.250861],
		[0.433, 0.250861],
		[0, 0.501721],
		[-0.433, 0.250861],
		[-0.433, -0.250861],
	]

	let absolutePoints = []
	// FLAT
	//if (store.hexStyle === rf.FLAT) absolutePoints = flatPoints.map(([x, y]) => `${((x * hexSideLength) / canvasSize) * 100},${((y * hexSideLength) / canvasSize) * 100}`)

	// POINTY
	//if (store.hexStyle === rf.POINTY)
	absolutePoints = pointyPoints.map(([x, y]) => `${(((x * hexSideLength) / canvasSize) * 100).toFixed(3)},${(((y * hexSideLength) / canvasSize) * 100).toFixed(3)}`)

	if (keep1hexSize) absolutePoints = pointyPoints.map(([x, y]) => `${(((x * 2400) / 260) * 100).toFixed(3)},${(((y * 2400) / 260) * 100).toFixed(3)}`)

	return absolutePoints.join(" ")
}

/*
	// Find out whether you are NET high/lower, or left/right then the origin
	let netGridNumRows = gridDimensions[1] + gridDimensions[0]
	let netGridNumCols = gridDimensions[3] + gridDimensions[2]
*/
export function calculateGridDimensions() {
	const store = useModelStore()

	// Defensive: empty grid returns zero-size dimensions so callers don't get NaN/Infinity.
	if (!store.mapData.hexData || store.mapData.hexData.length === 0) {
		return [0, 0, 0, 0]
	}

	let minR = Infinity
	let maxR = -Infinity
	let minQ = Infinity
	let maxQ = -Infinity

	let maxRight = -Infinity
	let maxLeft = Infinity
	let maxUp = -Infinity
	let maxDown = Infinity

	if (store.hexStyle === rf.FLAT) {
		for (const hex of store.mapData.hexData) {
			if (hex.coord[1] + hex.coord[0] / 2 > maxUp) maxUp = hex.coord[1] + hex.coord[0] / 2
			if (hex.coord[1] + hex.coord[0] / 2 < maxDown) maxDown = hex.coord[1] + hex.coord[0] / 2

			if (hex.coord[0] < minQ) {
				minQ = hex.coord[0]
			}
			if (hex.coord[0] > maxQ) {
				maxQ = hex.coord[0]
			}
		}
		// First TWO is numn rows/height, second TWO is num cols/width
		return [maxDown, maxUp, minQ, maxQ]
	} else if (store.hexStyle === rf.POINTY) {
		for (const hex of store.mapData.hexData) {
			if (hex.coord[0] + hex.coord[1] / 2 > maxRight) maxRight = hex.coord[0] + hex.coord[1] / 2
			if (hex.coord[0] + hex.coord[1] / 2 < maxLeft) maxLeft = hex.coord[0] + hex.coord[1] / 2

			if (hex.coord[1] < minR) {
				minR = hex.coord[1]
			}
			if (hex.coord[1] > maxR) {
				maxR = hex.coord[1]
			}
		}
		return [minR, maxR, maxLeft, maxRight]
	}
}

export function getViewbox() {
	const store = useModelStore()

	let gridDimensions = calculateGridDimensions()
	// Find out whether you are NET high/lower, or left/right then the origin
	let netGridNumRows = gridDimensions[1] + gridDimensions[0]
	let netGridNumCols = gridDimensions[3] + gridDimensions[2]

	// Shift appropriately, by half the net amount.
	// You need to go through the canvasSize ratio, as this affects how the SVGs are drawn
	let horizShift = 0
	let vertShift = 0

	// FLAT
	if (store.hexStyle === rf.FLAT) {
		horizShift = (((((netGridNumCols * 0.866) / -2) * 260) / store.canvasSize) * store.refSize) / 2400
		vertShift = ((((netGridNumRows / -2) * 260) / store.canvasSize) * store.refSize) / 2400
	}
	// POINTY
	else if (store.hexStyle === rf.POINTY) {
		horizShift = ((((netGridNumCols / -2) * 260) / store.canvasSize) * store.refSize) / 2400
		vertShift = (((((netGridNumRows * 0.866) / -2) * 260) / store.canvasSize) * store.refSize) / 2400
	}

	// Shift down -800 in both directions to display the intial hex
	const minX = -800 * horizShift - 800
	const minY = -800 * vertShift - 800
	const width = 1600
	const height = 1600

	if (!minX || !minY || !width || !height) {
		return "-400 -464 800 928"
	}

	return `${minX} ${minY} ${width} ${height}`
}

export function getRefSizeToFitScreen() {
	const store = useModelStore()
	let refSize = store.refSize
	let widthAvailable = document.documentElement.clientWidth
	const widthReserved = 460 // APPROX. Need to refine; ZP + toggles

	widthAvailable -= widthReserved

	const initialWidth = calculateCanvasWidthForRefSize(store.refSize)
	if (initialWidth < widthAvailable) {
		while (calculateCanvasWidthForRefSize(refSize) < widthAvailable) {
			refSize += 40
		}
		// Now we are just to big, so shrink to match
		return (refSize -= 40)
	}

	if (initialWidth > widthAvailable) {
		while (calculateCanvasWidthForRefSize(refSize) > widthAvailable) {
			refSize -= 40
		}
		// Now we are just to small, so grow to match
		return refSize
	}

	return refSize
}

export function calculateCanvasWidthForRefSize(refSize) {
	const store = useModelStore()

	let hexWidth = (refSize / 2400) * 130
	const hexHeight = hexWidth * 1.1547 // Calculate the height of each hexagon
	const sideLength = hexWidth / 1.732
	const sidePlusPointy = (hexHeight - sideLength) / 2 + sideLength

	// This is independent of actual sizing and doesn't alter store
	let gridDimensions = calculateGridDimensions()

	// If you are adding a hex, add space all around the edge to allow space for the new hex options, IE +1 here
	let extraSpaceW = 0
	let extraSpaceH = 0
	if (store.hexStyle === rf.FLAT) {
		extraSpaceH = 0
	}

	/*if (addingHexes) {
		if (store.hexStyle === rf.FLAT) {
			extraSpaceW = 2
			extraSpaceH = 2
		} else if (store.hexStyle === rf.POINTY) {
			extraSpaceW = 1
			extraSpaceH = 1
		}
	}*/

	const gridWidth = gridDimensions[3] - gridDimensions[2] + extraSpaceW //+ Math.ceil(gridNumRows / 2);
	const gridHeight = gridDimensions[1] - gridDimensions[0] + extraSpaceH

	let canvasWidth = -1
	let canvasHeight = -1
	let canvasSize = -1

	// This sets the size of the div.
	if (store.hexStyle === rf.FLAT) {
		canvasHeight = gridHeight * hexWidth + hexWidth * 1.5 // Add one extra for padding
		canvasWidth = gridWidth * sidePlusPointy + hexHeight * 1.5

		canvasSize = Math.min(canvasWidth, canvasHeight)
	} else if (store.hexStyle === rf.POINTY) {
		// For the width, you simply want the width of the grid, plus room for 1 hex each side
		canvasWidth = gridWidth * hexWidth + hexWidth * 2 // Add one extra for padding
		canvasHeight = (gridHeight + 1) * sidePlusPointy + hexHeight * 1
		// As the min dimension of the canvas increaes, the SVGs will get bigger.
		// This variable is used to stop this happening.
		canvasSize = Math.min(canvasWidth, canvasHeight)
	}
	// Add a check for no map
	if (canvasSize === -Infinity) canvasSize = 600

	return canvasWidth
}

export function calculateCanvasSize(addingHexes) {
	const store = useModelStore()

	let hexWidth = (store.refSize / 2400) * 130
	const hexHeight = hexWidth * 1.1547 // Calculate the height of each hexagon
	const sideLength = hexWidth / 1.732
	const sidePlusPointy = (hexHeight - sideLength) / 2 + sideLength

	let gridDimensions = calculateGridDimensions()

	// If you are adding a hex, add space all around the edge to allow space for the new hex options, IE +1 here
	let extraSpaceW = 0
	let extraSpaceH = 0
	if (store.hexStyle === rf.FLAT) {
		extraSpaceH = 0
	}

	if (addingHexes) {
		if (store.hexStyle === rf.FLAT) {
			extraSpaceW = 2
			extraSpaceH = 2
		} else if (store.hexStyle === rf.POINTY) {
			extraSpaceW = 1
			extraSpaceH = 1
		}
	}

	const gridWidth = gridDimensions[3] - gridDimensions[2] + extraSpaceW //+ Math.ceil(gridNumRows / 2);
	const gridHeight = gridDimensions[1] - gridDimensions[0] + extraSpaceH

	// This sets the size of the div.
	if (store.hexStyle === rf.FLAT) {
		// For the HEIGHT, you simply want the width of the grid, plus room for 1 hex each side
		store.canvasHeight = gridHeight * hexWidth + hexWidth * 1.5 // Add one extra for padding
		store.canvasWidth = gridWidth * sidePlusPointy + hexHeight * 1.5

		store.canvasSize = Math.min(store.canvasWidth, store.canvasHeight)
	} else if (store.hexStyle === rf.POINTY) {
		// For the width, you simply want the width of the grid, plus room for 1 hex each side
		store.canvasWidth = gridWidth * hexWidth + hexWidth * 2 // Add one extra for padding
		store.canvasHeight = (gridHeight + 1) * sidePlusPointy + hexHeight * 1
		// As the min dimension of the canvas increaes, the SVGs will get bigger.
		// This variable is used to stop this happening.
		store.canvasSize = Math.min(store.canvasWidth, store.canvasHeight)
	}
	// Add a check for no map
	if (store.canvasSize === -Infinity) {
		store.canvasWidth = hexWidth * 2
		store.canvasHeight = hexHeight * 2
		store.canvasSize = Math.min(store.canvasWidth, store.canvasHeight)
	}
}

function isNeighbour(coord1, coord2) {
	const dv = directionVectors

	for (let i = 0; i < dv.length; i++) {
		if (coord1[0] === coord2[0] + dv[i][0] && coord1[1] === coord2[1] + dv[i][1] && coord1[2] === coord2[2] + dv[i][2]) {
			return true
		}
	}

	return false
}

// Calculate the neighbours, based off their index in store.mapData.hexData
export function setNeighbours() {
	const store = useModelStore()
	store.mapData.neighbours.splice(0)

	const hexData = store.mapData.hexData

	for (let i = 0; i < hexData.length; i++) {
		const hexEntry1 = hexData[i]
		store.mapData.neighbours[hexEntry1.hexID] = []

		for (let j = 0; j < hexData.length; j++) {
			if (i === j) continue

			const hexEntry2 = hexData[j]

			if (isNeighbour(hexEntry1.coord, hexEntry2.coord)) {
				store.mapData.neighbours[hexEntry1.hexID].push(hexEntry2.hexID)
			}
		}
	}
}

// Returns the joiningside/direciton you're moving "from" to "to", with 0 being up left, 1 being directly right, etc going clockwise
// As always, we are using the pointy hex as default. The result is obviously based on the perspective of the "from" hex.
export function getJoiningSide(fromHexCoord, toHexCoord) {
	if (fromHexCoord[1] === toHexCoord[1]) {
		if (fromHexCoord[0] < toHexCoord[0]) return 1
		else return 4
	} else if (fromHexCoord[2] === toHexCoord[2]) {
		if (fromHexCoord[0] < toHexCoord[0]) return 0
		else return 3
	} else if (fromHexCoord[0] === toHexCoord[0]) {
		if (fromHexCoord[1] < toHexCoord[1]) return 2
		else return 5
	}

	return -1
}

export function getNeighboursAndJoiningSide(hexID) {
	const store = useModelStore()
	let hex = model.getHexByID(hexID)
	let neighbours = store.mapData.neighbours[hexID]
	let joiningSides = neighbours.map((n) => getJoiningSide(hex.coord, model.getHexByID(n).coord))
	let res = []
	for (let i = 0; i < neighbours.length; i++) {
		res.push([neighbours[i], joiningSides[i]])
	}
	return res
}

export function setPlaceableTiles() {
	const store = useModelStore()

	setNeighbours()

	store.context.placeableTiles.splice(0)
	store.mapData.hexData.forEach((t) => {
		if (store.mapData.neighbours[t.hexID] && store.mapData.neighbours[t.hexID].length === 6) return

		directionVectors.forEach((dv) => {
			let newQ = t.coord[0] + dv[0]
			let newR = t.coord[1] + dv[1]

			const newHex = [newQ, newR, t.coord[2] + dv[2]]

			// Check if there's already a hex at this position by checking hexData directly
			const existingHex = store.mapData.hexData.find((hex) => hex.coord[0] === newHex[0] && hex.coord[1] === newHex[1] && hex.coord[2] === newHex[2])

			if (!existingHex && !store.context.placeableTiles.find((h) => h.coord[0] == newHex[0] && h.coord[1] == newHex[1] && h.coord[2] == newHex[2])) store.context.placeableTiles.push({ coord: [...newHex], isPendingPlacement: false })
		})
	})
	// If there is no options, set up the first option, ie 0,0,0 (which was manually removed above, but might not work anyway if not removed above)
	if (store.context.placeableTiles.length === 0) store.context.placeableTiles.push({ coord: [0, 0, 0], isPendingPlacement: false })
}

export function createActualHex(coord, rotation, hexTerrainID) {
	let reference = rf.ALL_HEX_DATA.find((h) => h.hexTerrainID === hexTerrainID)
	let maxBucketId = Math.max(...reference.nodeBucketIds)

	if (reference.nodeBucketIds.length !== reference.nodeVertexDefinitions.length) {
		rf.doAdminAlrt(`node data mismatch in hex: ${reference.hexGfx} reference.nodeBucketIds.length: ${reference.nodeBucketIds.length} reference.nodeVertexDefinitions.length: ${reference.nodeVertexDefinitions.length}`)
	}
	if (reference.riverVertexRiverIds.length !== reference.riverVertexDefinitions.length) {
		rf.doAdminAlrt(`node data mismatch in hex: ${reference.hexGfx} reference.riverVertexRiverIds.length: ${reference.riverVertexRiverIds.length} reference.riverVertexDefinitions.length: ${reference.riverVertexDefinitions.length}`)
	}
	for (let i = 0; i < 6; i++) {
		let hasRiver = reference.sideRiverVertexIds[i] >= 0
		let cornerDefs = !util.arraysEqual(reference.cornerNodeIds[i], [-1, -1])
		let sideDef = reference.sideNodeIds[i] !== -1
		if (reference.baseTerrain !== rf.TERR_SEA && ((!hasRiver && cornerDefs) || (hasRiver && !cornerDefs))) {
			rf.doAdminAlrt(`corner data error in hex: ${reference.hexGfx}`)
		}
		if (reference.baseTerrain !== rf.TERR_SEA && ((hasRiver && sideDef) || (!hasRiver && !sideDef))) {
			rf.doAdminAlrt(`side data error in hex: ${reference.hexGfx}`)
		}
	}

	// Check that the river arrays are all equal length
	if (reference.riverStoppingVertex.length !== reference.riverVertexRiverIds.length || reference.riverVertexRiverIds.length !== reference.riverVertexDefinitions.length) {
		rf.doAdminAlrt(`river data mismatch in hex: ${reference.hexGfx} reference.riverStoppingVertex.length: ${reference.riverStoppingVertex.length} reference.riverVertexRiverIds.length: ${reference.riverVertexRiverIds.length} reference.riverVertexDefinitions.length: ${reference.riverVertexDefinitions.length}`)
	}

	let newHex = JSON.parse(JSON.stringify(reference))
	newHex.currentTerrain = reference.baseTerrain
	newHex.hexID = -1 // THIS DEFINES NEIGHBOURS ETC, AND IS UNIQUE PER HEX ON THE MAP. It is -1 until the hex is placed on the map
	newHex.coord = coord // [q,r,s] hex coord, needs to be saved
	newHex.rotation = 0 // 0-5, multiplied by 60 degrees, needs to be saved

	newHex.edgeLookup = util.makeArrayOfSizeWithFill(6, -1) // This is the index in store.mapData.edgeData of that edge, IE, the edge following that vertex in a CLOCKWISE direction
	newHex.hexLookup = util.makeArrayOfSizeWithFill(6, -1) // This is the id in store.mapData.hexData of the *other* hexes connected to the edges above

	newHex.bucketIdsInitial = util.indexArray(maxBucketId + 1) // ids of initial buckets. Always identical to index, doesn't have to be saved
	newHex.bucketIdsCurrent = util.indexArray(maxBucketId + 1) // ids of current, e.g joint, buckets
	newHex.builtBridges = [] // pairs of nodes which have been built as bridges, e.g [[2, 5], [3, 1]]
	newHex.bridgeHasRoad = [] // matches builtBridges. For display purposes, doesn't have to be saved
	newHex.edgeHasRoad = util.makeArrayOfSizeWithFill(reference.nodeEdges.length, false) // for display purposes, doesn't have to be saved
	newHex.nodeIsRoadAnchor = util.indexArray(reference.nodeBucketIds.length).map((i) => reference.roadAnchors.includes(i)) // creates a bool array from ids. Doesn't have to be saved
	rotateHex(newHex, rotation)
	newHex.initialBucketCorners = newHex.bucketIdsInitial.map((bucket) => util.indicesOf(newHex.cornerBucketIds, (a) => a === bucket))

	//const localToXY = localUncomputedToXY()

	// NEW -- add the vertices here instead. They will need to be MANUALLY updated
	newHex.rawXY = [0, 0] // Thisis the XY center of the hex in the current SVG grid. It is the local (0,0) for the hex. Computed from coords
	newHex.vertices = []
	newHex.riverVertices = [] // Computed river vertex positions (like vertices for nodes)

	return newHex
}

function localUncomputedToXY() {
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
}

export function rotateHex(hexData, rotation) {
	// NOTE: This just needs to rotate the hex art and base data
	// Anything added AFTER placement, will already be orientated to vertex 0 at the top, so never needs to be rotated
	hexData.rotation = rotation

	function rearrange(arr) {
		return util.indexArray(arr.length).map((i) => arr[(i - rotation + 6) % 6])
	}

	const rotate = coord.rotateCoord(rotation)
	hexData.sideRiverVertexIds = rearrange(hexData.sideRiverVertexIds)
	hexData.riverVertexDefinitions = hexData.riverVertexDefinitions.map(rotate)
	hexData.cornerBucketIds = rearrange(hexData.cornerBucketIds)
	hexData.nodeVertexDefinitions = hexData.nodeVertexDefinitions.map(rotate)
	hexData.sideNodeIds = rearrange(hexData.sideNodeIds)
	hexData.cornerNodeIds = rearrange(hexData.cornerNodeIds)

	for (let i = 0; i < hexData.bridgeRiverLines.length; i++) {
		hexData.bridgeRiverLines[i] = hexData.bridgeRiverLines[i].map(rotate)
	}

	hexData.chitLocations = hexData.chitLocations.map(rotate)
	hexData.homeMarkerFallbackPositions = hexData.homeMarkerFallbackPositions.map(rotate)

	return hexData
}

// KEEP THIS - bug it's only needed for debugging
/*export function getHexIDandVertexesAroundGivenVertex(inputHexID, inputVertex, getReachableHexIDsOnly) {
	const store = useModelStore()
	const hex = model.getHexByID(inputHexID)

	if (!hex) {
		console.warn(`Hex with ID ${inputHexID} not found.`)
		return []
	}

	let inputCoord = hex.coord
	let res = []
	let hexIDsOnly = []

	switch (inputVertex) {
		case 0: {
			// Up
			let upLeftHex = store.mapData.hexData.find((h) => h.coord[0] === inputCoord[0] && h.coord[1] === inputCoord[1] - 1)
			let upRightHex = store.mapData.hexData.find((h) => h.coord[0] === inputCoord[0] + 1 && h.coord[1] === inputCoord[1] - 1)

			if (upLeftHex) {
				res.push([upLeftHex.hexID, 2])
				hexIDsOnly.push(upLeftHex.hexID)
			}
			if (upRightHex) {
				res.push([upRightHex.hexID, 4])
				hexIDsOnly.push(upRightHex.hexID)
			}
			break
		}
		case 1: {
			// Up Right
			let rightHex = store.mapData.hexData.find((h) => h.coord[0] === inputCoord[0] + 1 && h.coord[1] === inputCoord[1])
			let upRightHex = store.mapData.hexData.find((h) => h.coord[0] === inputCoord[0] + 1 && h.coord[1] === inputCoord[1] - 1)

			if (rightHex) {
				res.push([rightHex.hexID, 5])
				hexIDsOnly.push(rightHex.hexID)
			}
			if (upRightHex) {
				res.push([upRightHex.hexID, 3])
				hexIDsOnly.push(upRightHex.hexID)
			}
			break
		}
		case 2: {
			// Down Right
			let rightHex = store.mapData.hexData.find((h) => h.coord[0] === inputCoord[0] + 1 && h.coord[1] === inputCoord[1])
			let downRightHex = store.mapData.hexData.find((h) => h.coord[0] === inputCoord[0] && h.coord[1] === inputCoord[1] + 1)

			if (rightHex) {
				res.push([rightHex.hexID, 4])
				hexIDsOnly.push(rightHex.hexID)
			}
			if (downRightHex) {
				res.push([downRightHex.hexID, 0])
				hexIDsOnly.push(downRightHex.hexID)
			}
			break
		}
		case 3: {
			// Down
			let downLeftHex = store.mapData.hexData.find((h) => h.coord[0] === inputCoord[0] - 1 && h.coord[1] === inputCoord[1] + 1)
			let downRightHex = store.mapData.hexData.find((h) => h.coord[0] === inputCoord[0] && h.coord[1] === inputCoord[1] + 1)

			if (downLeftHex) {
				res.push([downLeftHex.hexID, 1])
				hexIDsOnly.push(downLeftHex.hexID)
			}
			if (downRightHex) {
				res.push([downRightHex.hexID, 5])
				hexIDsOnly.push(downRightHex.hexID)
			}
			break
		}
		case 4: {
			// Down Left
			let leftHex = store.mapData.hexData.find((h) => h.coord[0] === inputCoord[0] - 1 && h.coord[1] === inputCoord[1])
			let downLeftHex = store.mapData.hexData.find((h) => h.coord[0] === inputCoord[0] - 1 && h.coord[1] === inputCoord[1] + 1)

			if (leftHex) {
				res.push([leftHex.hexID, 2])
				hexIDsOnly.push(leftHex.hexID)
			}
			if (downLeftHex) {
				res.push([downLeftHex.hexID, 0])
				hexIDsOnly.push(downLeftHex.hexID)
			}
			break
		}
		case 5: {
			// Up Left
			let leftHex = store.mapData.hexData.find((h) => h.coord[0] === inputCoord[0] - 1 && h.coord[1] === inputCoord[1])
			let upLeftHex = store.mapData.hexData.find((h) => h.coord[0] === inputCoord[0] && h.coord[1] === inputCoord[1] - 1)

			if (leftHex) {
				res.push([leftHex.hexID, 1])
				hexIDsOnly.push(leftHex.hexID)
			}
			if (upLeftHex) {
				res.push([upLeftHex.hexID, 3])
				hexIDsOnly.push(upLeftHex.hexID)
			}
			break
		}
		default:
			console.warn(`Invalid inputVertex: ${inputVertex}.  Must be between 0 and 5.`)
			return []
	}
	if (getReachableHexIDsOnly) return hexIDsOnly
	return res
}*/
