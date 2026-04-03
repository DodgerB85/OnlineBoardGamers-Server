/**
 * These are functions to do with manipulating or interacting with the map.
 * If they do not need to be directly in the component, it is easier to put them here.
 * This helps to stop the component getting cluttered up with a lot of functions,
 * and keeps the component mainly for the display
 *
 */

import * as rf from "./KFWreference.js"
import * as controller from "./KFWcontroller.js"
import * as village from "./KFWvillage.js"

import { useModelStore } from "../stores/KFWstore.js"

export function getHexPointsForPlayerIndex(playerIndex, forHighlight, ratio) {
	const store = useModelStore()

	let hexSideLength = store.players[playerIndex].villageRefSize // Adjust this value based on the desired hex size in pixels
	// Multiply by the ratio to allow for hex to sit inside main hex
	hexSideLength *= ratio

	if (forHighlight) hexSideLength += 400
	const canvasSize = Math.min(store.players[playerIndex].villageCanvasSize[0], store.players[playerIndex].villageCanvasSize[1]) // Adjust this value based on the size of the container

	// FLAT POINTS
	const flatPoints = [
		[0.5, 0],
		[0.25, -0.435],
		[-0.25, -0.435],
		[-0.5, 0],
		[-0.25, 0.435],
		[0.25, 0.435],
	]

	const absolutePoints = flatPoints.map(([x, y]) => `${((x * hexSideLength) / canvasSize) * 100},${((y * hexSideLength) / canvasSize) * 100}`)

	return absolutePoints.join(" ")
}

export function calculateSemicirclePath(playerIndex, forHighlight, ratio) {
	const store = useModelStore()
	let hexSideLength = store.players[playerIndex].villageRefSize // Adjust this value based on the desired hex size in pixels
	// Multiply by the ratio to allow for hex to sit inside main hex
	hexSideLength *= ratio
	if (forHighlight) hexSideLength += 400
	const canvasSize = Math.min(store.players[playerIndex].villageCanvasSize[0], store.players[playerIndex].villageCanvasSize[1]) // Adjust this value based on the size of the container

    // Calculate the center point of the bottom edge of the hexagon
    const centerX = 0;  // The hexagon is centered at 0,0, so the bottom edge's center is along the y-axis
    const bottomY = 0.435; // Y coordinate of the bottom vertices of the hexagon (from flatPoints)

    // Calculate the absolute center coordinates in percentage
    const absoluteCenterX = ((centerX * hexSideLength) / canvasSize) * 100;
    const absoluteCenterY = ((bottomY * hexSideLength) / canvasSize) * 100;

    // Calculate the radius of the semi-circle.  Let's make it half the length of the bottom side of the hexagon.
    const radius = 0.25 * hexSideLength; // Half the length of the bottom side
    const absoluteRadius = (radius / canvasSize) * 30;

    // Create the SVG path data
    const startX = absoluteCenterX - absoluteRadius;
    const startY = absoluteCenterY;

    const endX = absoluteCenterX + absoluteRadius;
    const endY = absoluteCenterY;

    // SVG path command for an arc: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
    const pathData = `M ${startX},${startY} A ${absoluteRadius},${absoluteRadius} 0 0 1 ${endX},${endY}`;

    return pathData;
}

export function calculateGridDimensionsForPlayerVillage(playerIndex) {
	// Pointy Points
	/*const store = useModelStore()
    
	let minR = Infinity
	let maxR = -Infinity
  
	let maxRight = -Infinity
	let maxLeft = Infinity
  
	for (const tile of store.players[playerIndex].villageTiles) {
	  if (tile.coord[0] + tile.coord[1] / 2 > maxRight) maxRight = tile.coord[0] + tile.coord[1] / 2
	  if (tile.coord[0] + tile.coord[1] / 2 < maxLeft) maxLeft = tile.coord[0] + tile.coord[1] / 2
  
	  if (tile.coord[1] < minR) {
		minR = tile.coord[1]
	  }
	  if (tile.coord[1] > maxR) {
		maxR = tile.coord[1]
	  }
	}

	return [minR, maxR, maxLeft, maxRight]*/
	// Flat hexes
	const store = useModelStore()

	// eslint-disable-next-line no-unused-vars
	let minR = Infinity
	// eslint-disable-next-line no-unused-vars
	let maxR = -Infinity
	let minQ = Infinity
	let maxQ = -Infinity

	//let maxRight = -Infinity
	//let maxLeft = Infinity

	let maxUp = -Infinity
	let maxDown = Infinity

	for (const tile of store.players[playerIndex].villageTiles) {
		if (tile.coord[1] + tile.coord[0] / 2 > maxUp) maxUp = tile.coord[1] + tile.coord[0] / 2
		if (tile.coord[1] + tile.coord[0] / 2 < maxDown) maxDown = tile.coord[1] + tile.coord[0] / 2

		if (tile.coord[0] < minQ) {
			minQ = tile.coord[0]
		}
		if (tile.coord[0] > maxQ) {
			maxQ = tile.coord[0]
		}

		//if ((tile.coord[0] / 2)  + tile.coord[2] / 2 > maxR) maxR = tile.coord[0]/2 + tile.coord[2] / 2
		//if ((tile.coord[0] / 2)  + tile.coord[2] / 2 < minR) minR = tile.coord[0]/2 + tile.coord[2] / 2
	}

	// First TWO is numn rows/height, second TWO is num cols/width
	return [maxDown, maxUp, minQ, maxQ]
}

export function getViewboxForPlayerVillage(playerIndex) {
	const store = useModelStore()
	let gridDimensions = calculateGridDimensionsForPlayerVillage(playerIndex)

	// Find out whether you are NET high/lower, or left/right then the origin
	let netGridNumRows = gridDimensions[1] + gridDimensions[0]
	let netGridNumCols = gridDimensions[3] + gridDimensions[2]

	// Shift appropriately, by half the net amount.
	// You need to go through the canvasSize ratio, as this affects how the SVGs are drawn
	let villageCanvasSize = Math.min(store.players[playerIndex].villageCanvasSize[0], store.players[playerIndex].villageCanvasSize[1])

	// POINTY
	//let horizShift = ((((netGridNumCols / -2) * 260) / villageCanvasSize) * store.players[playerIndex].villageRefSize) / 2400
	//let vertShift = (((((netGridNumRows * 0.866) / -2) * 260) / villageCanvasSize) * store.players[playerIndex].villageRefSize) / 2400

	// FLAT
	let horizShift = (((((netGridNumCols * 0.866) / -2) * 260) / villageCanvasSize) * store.players[playerIndex].villageRefSize) / 2400
	let vertShift = ((((netGridNumRows / -2) * 260) / villageCanvasSize) * store.players[playerIndex].villageRefSize) / 2400

	// Shift down -800 in both directions to display the intial hex
	const minX = -800 * horizShift - 800
	const minY = -800 * vertShift - 800
	const width = 1600
	const height = 1600
	return `${minX} ${minY} ${width} ${height}`
}

export function calculateCanvasSizeForPlayerVillage(playerIndex, addingHexes) {
	const store = useModelStore()

	// Pointy
	/*let hexWidth = (store.players[playerIndex].villageRefSize / 2400) * 130
	const hexHeight = hexWidth * 1.1547 // Calculate the height of each hexagon
	const sideLength = hexWidth / 1.732
	const sidePlusPointy = (hexHeight - sideLength) / 2 + sideLength*/

	// Flat
	let hexHeight = (store.players[playerIndex].villageRefSize / 2400) * 130
	const hexWidth = hexHeight * 1.1547 // Calculate the width of each hexagon
	const sideLength = hexHeight / 1.732
	const sidePlusPointy = (hexWidth - sideLength) / 2 + sideLength

	let gridDimensions = calculateGridDimensionsForPlayerVillage(playerIndex)

	// If you are adding a hex, add space all around the edge to allow space for the new hex options, IE +1 here
	// POINTY
	/*let extraSpaceW = 0
	let extraSpaceH = 0
	if (addingHexes) {
		extraSpaceW = 1.5
		extraSpaceH = 1.66
	}*/
	// FLAT - gives no margin top/bottom
	let extraSpaceW = 0
	let extraSpaceH = 0.25 // Add a bit of space top/bottom
	if (addingHexes) {
		// Pointy
		extraSpaceW = 2
		extraSpaceH = 2.5

		/*extraSpaceW = 1.66
		extraSpaceH = 1.5*/
	}

	const gridHeight = gridDimensions[1] - gridDimensions[0] + extraSpaceH
	const gridWidth = gridDimensions[3] - gridDimensions[2] + extraSpaceW //+ Math.ceil(gridNumRows / 2);

	/* POINTS
	// This sets the size of the div.
	// For the width, you simply want the width of the grid, plus room for 1 hex each side
	let canvasWidth = gridWidth * hexWidth + hexWidth * 1.5 // Add one extra for padding
	let canvasHeight = (gridHeight + 1) * sidePlusPointy + hexHeight * 0.5
	*/

	// FLAT
	// This sets the size of the div.
	// For the HEIGHT, you simply want the width of the grid, plus room for 1 hex each side
	let canvasHeight = gridHeight * hexHeight + hexHeight // Add one extra for padding

	let canvasWidth = (gridWidth + 1) * sidePlusPointy + hexWidth * 0.5

	// As the min dimension of the canvas increaes, the SVGs will get bigger.
	// This variable is used to stop this happening.

	store.players[playerIndex].villageCanvasSize = [canvasWidth, canvasHeight]
}

export function setNeighboursForPlayerVillage(playerIndex) {
	const store = useModelStore()
	store.players[playerIndex].villageNeighbours.splice(0)
	store.players[playerIndex].villageTiles.forEach((mainTile) => {
		store.players[playerIndex].villageTiles.forEach((otherTile) => {
			if (mainTile.id === otherTile.id) return

			rf.DIRECTION_VECTORS.forEach((dv) => {
				if (mainTile.coord[0] === otherTile.coord[0] + dv[0] && mainTile.coord[1] === otherTile.coord[1] + dv[1] && mainTile.coord[2] === otherTile.coord[2] + dv[2]) {
					if (!store.players[playerIndex].villageNeighbours[mainTile.id]) {
						store.players[playerIndex].villageNeighbours[mainTile.id] = []
					}

					// Check if the neighbor already exists before adding it
					if (store.players[playerIndex].villageNeighbours[mainTile.id].indexOf(otherTile.id) === -1) {
						store.players[playerIndex].villageNeighbours[mainTile.id].push(otherTile.id)
					}
				}
			})
		})
	})
}

export function setPlaceableTilesForPlayerVillge(playerIndex) {
	const store = useModelStore()
	let playerObj = store.players[playerIndex]

	// Make sure the neighbours are set first
	setNeighboursForPlayerVillage(playerIndex)

	playerObj.placeableVillageCoords.splice(0) // = [];
	playerObj.villageTiles.forEach((tile) => {
		if (playerObj.villageNeighbours[tile.id] && playerObj.villageNeighbours[tile.id].length === 6) return

		const currentNeighbourIds = playerObj.villageNeighbours[tile.id] || []

		rf.DIRECTION_VECTORS.forEach((dv) => {
			let newQ = tile.coord[0] + dv[0]
			let newR = tile.coord[1] + dv[1]

			//const newHex = new hexlib.Hex(newQ, newR, t.hex.s + dv[2])
			const newCoord = [newQ, newR, tile.coord[2] + dv[2]]

			const neighbour = currentNeighbourIds.find((nId) => {
				const nb = playerObj.villageTiles.find((neighbourTile) => neighbourTile.id === nId)

				//return nb.hex.q == t.hex.q + dv[0] && nb.hex.r == t.hex.r + dv[1] && nb.hex.s == t.hex.s + dv[2]
				return nb.coord[0] === tile.coord[0] + dv[0] && nb.coord[1] === tile.coord[1] + dv[1] && nb.coord[2] === tile.coord[2] + dv[2]
			})
			if (!neighbour && neighbour !== 0 && !playerObj.placeableVillageCoords.find((h) => h[0] == newCoord[0] && h[1] == newCoord[1] && h[2] == newCoord[2])) {
				//store.context.placeableTiles.push({ ...newCoord, isPendingPlacement: false })
				playerObj.placeableVillageCoords.push([...newCoord])
			}
		})
	})
}

// Side 0 is BOTTOM FLAT side of FROM hex. So Side is the side you cross from the FROM hex
export function getJoiningSide(fromHexCoord, toHexCoord) {
	if (fromHexCoord[1] === toHexCoord[1]) {
		if (fromHexCoord[0] < toHexCoord[0]) return 5
		else return 2
	} else if (fromHexCoord[2] === toHexCoord[2]) {
		if (fromHexCoord[0] < toHexCoord[0]) return 4
		else return 1
	} else if (fromHexCoord[0] === toHexCoord[0]) {
		if (fromHexCoord[1] < toHexCoord[1]) return 0
		else return 3
	}

	return -1
}

export function getNeighbours(playerIndex, coord) {
	const store = useModelStore()
	let villageTiles = store.players[playerIndex].villageTiles

	return rf.DIRECTION_VECTORS.reduce((acc, curr) => {
		const foundTile = villageTiles.find((matchingTile) => {
			return matchingTile.coord[0] == curr[0] + coord[0] && matchingTile.coord[1] == curr[1] + coord[1] && matchingTile.coord[2] == curr[2] + coord[2]
		})
		if (foundTile) {
			acc.push(foundTile)
		}
		return acc
	}, [])
}

/********* PATH FINDING  */

export function indices(max) {
	let result = []
	for (let i = 0; i < max; i++) {
		result.push(i)
	}
	return result
}

export function hexNeighbours(coord) {
	const [x, y] = coord
	return [
		[x, y + 1],
		[x - 1, y + 1],
		[x - 1, y],
		[x, y - 1],
		[x + 1, y - 1],
		[x + 1, y],
	]
}

export function reachableNeighbours(coord, sideReachable) {
	const neighbours = hexNeighbours(coord)
	let result = []
	for (let i = 0; i < 6; i++) {
		if (sideReachable[i]) {
			result.push(neighbours[i])
		}
	}
	return result
}

export function gridSize(coords) {
	const xs = coords.map((coord) => coord[0])
	const ys = coords.map((coord) => coord[1])
	const xmin = Math.min(...xs)
	const xmax = Math.max(...xs)
	const ymin = Math.min(...ys)
	const ymax = Math.max(...ys)
	return [xmin, ymin, xmax - xmin + 1, ymax - ymin + 1]
}

export function distanceFrom(tileCoords, tileSides, traversableTerrain, startingTileIndex) {
	const size = gridSize(tileCoords)
	const left = size[0]
	const bottom = size[1]
	const width = size[2]
	const height = size[3]

	const coords = tileCoords.map((coord) => [coord[0] - left, coord[1] - bottom])
	const reachableSides = tileSides.map((sides) => sides.map((a) => traversableTerrain.includes(a)))

	function withinGrid(x, y) {
		return x >= 0 && x < width && y >= 0 && y < height
	}

	const xs = indices(width)
	const ys = indices(height)

	// eslint-disable-next-line no-unused-vars
	let hasTile = xs.map((_) => ys.map((_) => false))
	// eslint-disable-next-line no-unused-vars
	let reachable = xs.map((_) => ys.map((_) => []))
	// eslint-disable-next-line no-unused-vars
	let visited = xs.map((_) => ys.map((_) => false))
	// eslint-disable-next-line no-unused-vars
	let distance = xs.map((_) => ys.map((_) => -1))

	for (let i = 0; i < coords.length; i++) {
		const [x, y] = coords[i]
		hasTile[x][y] = true
		reachable[x][y] = reachableSides[i]
	}

	const startingCoord = coords[startingTileIndex]
	const [startX, startY] = startingCoord
	visited[startX][startY] = true
	distance[startX][startY] = 0
	let toVisit = [reachableNeighbours(startingCoord, reachableSides[startingTileIndex])]
	let visitFrom = 0

	while (visitFrom >= 0) {
		const visitCoord = toVisit[visitFrom].shift()
		const [x, y] = visitCoord
		if (withinGrid(x, y) && hasTile[x][y] && !visited[x][y]) {
			const dist = visitFrom + 1
			visited[x][y] = true
			distance[x][y] = dist
			if (toVisit.length <= dist) {
				toVisit.push([])
			}
			toVisit[dist].push(...reachableNeighbours(visitCoord, reachable[x][y]))
		}
		visitFrom = toVisit.findIndex((arr) => arr.length > 0)
	}

	function coordDistance(coord) {
		const [x, y] = coord
		return distance[x][y]
	}

	return coords.map(coordDistance)
}

export function tilesDistanceFrom(villageTiles, traversableTerrain, startingTile_id) {
	const tileCoords = villageTiles.map((tile) => [tile.coord[0], tile.coord[1]])
	const tileSides = villageTiles.map((tile) => tile.sides)

	let startingTileIndex = villageTiles.findIndex((tile) => tile.id === startingTile_id)

	let distanceFromArr = distanceFrom(tileCoords, tileSides, traversableTerrain, startingTileIndex)
	// CONVERT BACK TO BUCKETS OF tile.id's
	let macDistance = Math.max.apply(null, distanceFromArr)
	let distanceBuckets = []
	// create the buckets
	for (let i = 0; i <= macDistance; i++) {
		distanceBuckets.push([])
	}
	// fill the buckets
	for (let i = 0; i < distanceFromArr.length; i++) {
		if (distanceFromArr[i] !== -1) distanceBuckets[distanceFromArr[i]].push(villageTiles[i].id)
	}
	return distanceBuckets
}

export function findAdjacentHexCoordsThroughSide(coords, side) {
	const THROUG_SIDE_DIRECTION_VECTORS = [
		[0, 1, -1], //[+1, 0, -1],
		[-1, 1, 0], //[+1, -1, 0],
		[-1, 0, +1], //[0, -1, +1],
		[0, -1, +1], //[-1, 0, +1],
		[+1, -1, 0], //		[-1, +1, 0],
		[+1, 0, -1], //		[0, +1, -1],
	]

	const [x, y, z] = coords
	const [dx, dy, dz] = THROUG_SIDE_DIRECTION_VECTORS[side] // Adjusted to use the correct direction vector

	const adjacentX = x + dx
	const adjacentY = y + dy
	const adjacentZ = z + dz

	return [adjacentX, adjacentY, adjacentZ]
}

function getHexCenterFromTile_id(tile_id) {
	let playerObj = controller.currentPlayerObj()
	let coord = playerObj.villageTiles.find((tile) => tile.id === tile_id).coord
	let refSize = playerObj.villageRefSize
	let canvasSize = Math.min(playerObj.villageCanvasSize[0], playerObj.villageCanvasSize[1])
	let size = [(refSize / canvasSize) * 50, (refSize / canvasSize) * 50]

	let M = [3.0 / 2.0, 0.0, Math.sqrt(3.0) / 2.0, Math.sqrt(3.0), 2.0 / 3.0, 0.0, -1.0 / 3.0, Math.sqrt(3.0) / 3.0, 0.0]

	var x = (M[0] * coord[0] + M[1] * [coord[1]]) * size[0]
	var y = (M[2] * coord[0] + M[3] * [coord[1]]) * size[1]
	let p = [x, y]

	return `${p[0].toFixed(0)},${p[1].toFixed(0)}`
}

export function getScoringPath(playerIndex, action) {
	const store = useModelStore()
	let res = ""
	let resArr = []
	let resArrM = ""
	let resArrL = ""
	let tile_ids = []
	if (action === rf.ACT_SCORE_SEA_BASTION) {
		if (!village.doesPlayerHaveTileID(playerIndex, rf.TILE_BOAT_SEA_BASTION_B)) return ""
		tile_ids = store.context.seaBastionScoringRoute
	}
	if (action === rf.ACT_SCORE_DELIVERY_MAN) {
		if (!village.doesPlayerHaveTileID(playerIndex, rf.TILE_WINTER_DELIVERY_MAN_A)) return ""
		tile_ids = store.context.deliveryManScoringRoute
	}

	if (tile_ids.length === 0) return ""

	// The first entry is a M
	res = "M " + getHexCenterFromTile_id(tile_ids[0]) + " "
	resArrM = res
	for (let i = 1; i < tile_ids.length; i++) {
		res += "L " + getHexCenterFromTile_id(tile_ids[i]) + " "
		resArrL = "L " + getHexCenterFromTile_id(tile_ids[i]) + " "
		resArr.push([resArrM + resArrL, tile_ids[i]])
		resArrM =  "M " + getHexCenterFromTile_id(tile_ids[i]) + " "
	}
	return resArr
}
