/**
 * These are functions to do with manipulating or interacting with the map.
 * If they do not need to be directly in the component, it is easier to put them here.
 * This helps to stop the component getting cluttered up with a lot of functions,
 * and keeps the component mainly for the display
 *
 */

//import * as hexlib from './hexlib.js'
import hexlib from "./hexlib.js"
import * as rf from "./AQYreference.js"
//import * as funcs from "./AQYfuncs.js"

import { useModelStore } from "../stores/AQYstore.js"

// Map Vars
const directionVectors = [
	[+1, 0, -1],
	[+1, -1, 0],
	[0, -1, +1],
	[-1, 0, +1],
	[-1, +1, 0],
	[0, +1, -1],
]

export function hexToPixel(hex) {
	return hexlib.Layout.hexToPixel(hex)
}

export function generateMap() {
	const store = useModelStore()
	let index = 0
	const results = []
	const explorerTiles = []

	const seed = []

	let local_MAP_TILE_BAG_V2 = [...rf.MAP_TILE_BAG_V2]

	const layout = store.currentLayout

	for (let x = 0; x < layout.tiles; x++) {
		const mainIndex = Math.floor(Math.random() * local_MAP_TILE_BAG_V2.length)
		const subIndex = Math.floor(Math.random() * local_MAP_TILE_BAG_V2[mainIndex].length)
		const tile = local_MAP_TILE_BAG_V2[mainIndex][subIndex]

		local_MAP_TILE_BAG_V2.splice(mainIndex, 1)

		const offset = layout.tileOffsets[x]

		const tileRotation = Math.floor(Math.random() * 6)

		seed.push([tile.id, tileRotation])


		index = generateSmallHexesFromSingleSeed(offset[0], offset[1], tile.terrain, tileRotation, results, explorerTiles, index)
	}

	store.mapData = {
		hexes: results,
		seed: seed,
		grass: [],
		pollution: [],
		explorers: explorerTiles,
		availableExplorerResources: [],
		mountainRangeSeedStone: [],
		mountainRangeSeedGold: [],
	}
}

export function generateMapFromSeed(seed) {
	const store = useModelStore()

	store.mapData = {}

	// load the layout data
	const layout = store.currentLayout

	let index = 0
	const results = []
	const explorerTiles = []
	for (let i = 0; i < seed.length; i++) {
		// seed[i][0] is the tile ID
		let tileID = seed[i][0]
		if (tileID >= 10) tileID -= 10
		let tile = rf.getTileByID(tileID)

		if (seed[i][0] >= 10) {
			// Need the mirrored version instead
			let mirror = rf.generateMirroredTiles([tile])
			tile = mirror[0]
		}

		const offset = layout.tileOffsets[i]
		const tileRotation = seed[i][1]

		index = generateSmallHexesFromSingleSeed(offset[0], offset[1], tile.terrain, tileRotation, results, explorerTiles, index)
	}

	store.mapData = {
		hexes: results,
		seed: seed,
		grass: [],
		pollution: [],
		explorers: explorerTiles,
		availableExplorerResources: [],
		mountainRangeSeedStone: [],
		mountainRangeSeedGold: [],
	}
}

// This was called generateTile in app
export function generateSmallHexesFromSingleSeed(offsetQ, offsetR, tile, rotation, results, explorerTiles, index) {
	let i = 0

	for (let q = -4; q <= 4; q++) {
		for (let r = Math.max(-4, -q - 4); r <= Math.min(4, -q + 4); r++) {
			let coords = [q, r, -q - r]

			if (rotation > 0) {
				for (let m = 0; m < rotation; m++) {
					const el = coords.shift()
					coords.push(el)
					coords = coords.map((c) => c * -1)
				}
			}

			const hex = new hexlib.Hex(coords[0] + offsetQ, coords[1] + offsetR, -coords[0] - offsetQ - coords[1] - offsetR)

			results.push({
				id: index,
				terrainType: tile[i] > 9 ? tile[i] % 10 : tile[i],
				//rotation, // Small hexes have no rotation
				hex,
				mountainType: rf.MOUNTAIN_NONE,
			})

			if (tile[i] > 9) {
				explorerTiles.push(index)
			}

			index++
			i++
		}
	}

	return index
}

export function setNeighbours() {
	const store = useModelStore()
	store.mapNeighbours.splice(0)
	const hexes = store.mapData.hexes
	const hexCount = hexes.length
	for (let i = 0; i < hexCount; i++) {
		const mapHex1 = hexes[i]
		const neighbours = []
		for (let j = 0; j < hexCount; j++) {
			if (i === j) continue
			const mapHex2 = hexes[j]
			if (isNeighbour(mapHex1.hex, mapHex2.hex)) {
				neighbours.push(mapHex2.id)
			}
		}
		store.mapNeighbours[mapHex1.id] = neighbours
	}
}

function isNeighbour(hex1, hex2) {
	for (let i = 0; i < 6; i++) {
		if (hex1.q === hex2.q + directionVectors[i][0] && hex1.r === hex2.r + directionVectors[i][1] && hex1.s === hex2.s + directionVectors[i][2]) {
			return true
		}
	}
	return false
}

export function getHexDataFromID(ID) {
	const store = useModelStore()

	return store.mapData.hexes[ID]
}

export function getIDfromHex(hex) {
	const store = useModelStore()
	// IMPROVED OLD METHOD
	const { q, r, s } = hex
	const index = store.mapData.hexes.findIndex((item) => item.hex.q === q && item.hex.r === r && item.hex.s === s)

	if (index !== -1) {
		const item = store.mapData.hexes[index]
		return item.id
	}

	return -1
}

// Ref: https://www.redblobgames.com/grids/hexagons/#distances
function hex_subtract(a, b) {
	return [a.q - b.q, a.r - b.r, a.s - b.s]
}

// Ref: https://www.redblobgames.com/grids/hexagons/#distances
export function getDistanceBetweenHex(hex1, hex2) {
	var vec = hex_subtract(hex1, hex2)
	return (Math.abs(vec[0]) + Math.abs(vec[1]) + Math.abs(vec[2])) / 2
}

export function calculateCanvasSize() {
	const store = useModelStore()

	let hexWidth = (store.refSize / 100) * 30
	const hexHeight = hexWidth * 0.866 // Calculate the height of each hexagon

	let extraSpaceW = 0
	let extraSpaceH = 0

	// 2p has width 18 * 3/4 hexes
	// 39p has width 27 * 3/4 hexes
	let gridWidth = 18 + extraSpaceW //+ Math.ceil(gridNumRows / 2);
	if (store.players.length === 3) gridWidth = 27 + extraSpaceW
	if (store.players.length === 4) gridWidth = 27.5 + extraSpaceW

	// THERE IS A CONSTANT 22.5 * hexHeight
	let gridHeight = 22 + extraSpaceH // Height in whole hex heights
	if (store.players.length === 3) gridHeight = 22.5 + extraSpaceW
	if (store.players.length === 4) gridHeight = 23 + extraSpaceW

	// This sets the size of the div.
	store.canvasWidth = gridWidth * hexWidth * 0.75
	store.canvasHeight = (gridHeight + 0) * hexHeight
	// As the min dimension of the canvas increaes, the SVGs will get bigger.
	// This variable is used to stop this happening.
	store.canvasSize = Math.min(store.canvasWidth, store.canvasHeight)
}

export function getTerrainColor(tile) {
	const store = useModelStore()

	let terrainType = tile.terrainType

	if (store.topMenuViews.showFullColourHex === 0) return "none"
	// Check to show forest under wood
	if (store.permanentSettings.keepForestUnderWoodRes && terrainType === rf.TERR_GRASS) {
		if (!shouldShowGrass(tile)) terrainType = rf.TERR_FOREST
	}
	const tt = rf.TERRAIN_TYPES[terrainType]
	if (!tt) throw new Error(`Cannot find terrain type ${terrainType} -- ${tt}`)
	return tt.color
}

export function getZoomTerrainColor(terrainType) {
	const store = useModelStore()

	if (store.topMenuViews.showFullColourHex === 0) return "none"
	// Check to show forest under wood
	if (store.permanentSettings.keepForestUnderWoodRes && terrainType === rf.TERR_GRASS) {
		if (!shouldShowGrass(getHexDataFromID(store.zoomPanelInfo.hexID))) terrainType = rf.TERR_FOREST
	}
	const tt = rf.TERRAIN_TYPES[terrainType]
	if (!tt) throw new Error(`Cannot find terrain type ${terrainType} -- ${tt}`)
	return tt.color
}

export function shouldShowGrass(tile) {
	const store = useModelStore()

	// If removing forest immediately, always show
	if (!store.permanentSettings.keepForestUnderWoodRes) return true

	const hasWoodResOnTile = store.players.some((player) => {
		if (player.countrysideBuildings) {
			return player.countrysideBuildings.some((building) => {
				if (building.resources) {
					return building.resources.some((resource) => {
						return resource.hexId === tile.id && resource.resType === rf.RES_WOOD
					})
				}
				return false
			})
		}
		return false
	})

	if (hasWoodResOnTile) return false
	return true
}

export function shouldShowPollution(pollutionID) {
	const store = useModelStore()

	if (!store.mapData.pollution.includes(pollutionID)) return 0

	const hasResOnTile = store.players.some((player) => {
		if (player.countrysideBuildings) {
			return player.countrysideBuildings.some((building) => {
				if (building.resources) {
					return building.resources.some((resource) => {
						return resource.hexId === pollutionID
					})
				}
				return false
			})
		}
		return false
	})

	// If there's a resource, but you don't show pollution under res, return 0
	if (hasResOnTile && !store.permanentSettings.showPollutionUnderRes) return 0
	else if (hasResOnTile) return 1 // 1 is pollution under res
	return 2 // 2 is pollution on its own
}

export function getHexPoints(forSelection) {
	const store = useModelStore()

	let hexSideLength = store.refSize * 6 // Adjust this value based on the desired hex size in pixels
	if (forSelection) hexSideLength -= store.refSize
	const canvasSize = store.canvasSize // Adjust this value based on the size of the container

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

export function getViewbox() {
	const store = useModelStore()

	let minX = -1100 //* -1100 * horizShift
	let minY = -186 // * vertShift - 800
	let width = 2100
	let height = 2100
	if (store.players.length === 3) {
		minX = -1130 //* -1100 * horizShift
		minY = -433 // * vertShift - 800
		width = 2100
		height = 2100
	}
	if (store.players.length === 4) {
		minX = -1086 //* -1100 * horizShift
		minY = -466 // * vertShift - 800
		width = 2100
		height = 2100
	}
	return `${minX} ${minY} ${width} ${height}`
}

export function getMinX() {
	const store = useModelStore()

	if (store.players.length === 4) return -1086
	if (store.players.length === 3) return -1130
	return -110
}
export function getMinY() {
	const store = useModelStore()

	if (store.players.length === 4) return -466
	if (store.players.length === 3) return -433
	return -186
}

export function getBigHexD(xOffset, yOffset) {
	const store = useModelStore()

	// DO NOT ADJUST ANY OF THESE. IT ALL RUNS THROUGH store.refSize
	let hexHeight = ((store.refSize * 0.866) / store.canvasSize) * 600 //86.66 // 2x apothem = 110

	let hexDown = hexHeight / 2 // aka apothem = 55
	let hexSide = (hexDown / 1.732) * 2 //* Math.sqrt(3/2) *  63.5 = hexDown / tan60 * 2

	//let hexSide = (((store.refSize * 0.866) / store.canvasSize) * 600 / 2 / 1.732) * 2 //* Math.sqrt(3/2) *  63.5 = hexDown / tan60 * 2

	let hexAcross = hexSide / 2 //31.75

	let path = `M ${hexSide * xOffset} ${hexHeight * yOffset}`

	const directions = [
		[hexSide, 0],
		[hexAcross, hexDown],
		[hexSide, 0],
		[hexAcross, hexDown],
		[hexSide, 0],
		[hexAcross, hexDown],
		[hexSide, 0],
		[hexAcross, hexDown],
		[hexSide, 0],
		[hexAcross, hexDown],

		[-hexAcross, hexDown],
		[hexAcross, hexDown],
		[-hexAcross, hexDown],
		[hexAcross, hexDown],
		[-hexAcross, hexDown],
		[hexAcross, hexDown],
		[-hexAcross, hexDown],
		[hexAcross, hexDown],

		[-hexAcross, hexDown],
		[-hexSide, 0],
		[-hexAcross, hexDown],
		[-hexSide, 0],
		[-hexAcross, hexDown],
		[-hexSide, 0],
		[-hexAcross, hexDown],
		[-hexSide, 0],
		[-hexAcross, hexDown],
		[-hexSide, 0],

		[-hexAcross, -hexDown],
		[-hexSide, 0],
		[-hexAcross, -hexDown],
		[-hexSide, 0],
		[-hexAcross, -hexDown],
		[-hexSide, 0],
		[-hexAcross, -hexDown],
		[-hexSide, 0],

		[-hexAcross, -hexDown],
		[hexAcross, -hexDown],
		[-hexAcross, -hexDown],
		[hexAcross, -hexDown],
		[-hexAcross, -hexDown],
		[hexAcross, -hexDown],
		[-hexAcross, -hexDown],
		[hexAcross, -hexDown],
		[-hexAcross, -hexDown],
		[hexAcross, -hexDown],

		[hexSide, 0],
		[hexAcross, -hexDown],
		[hexSide, 0],
		[hexAcross, -hexDown],
		[hexSide, 0],
		[hexAcross, -hexDown],
		[hexSide, 0],
		[hexAcross, -hexDown],
	]

	directions.forEach(([dx, dy]) => {
		path += ` l ${dx} ${dy}`
	})

	return path
}

/**
 * get SVG Path of City Tiles
 * Ref: getBigHexD
 */
export function getCityD() {
	const store = useModelStore()

	// DO NOT ADJUST ANY OF THESE. IT ALL RUNS THROUGH store.refSize
	let hexHeight = ((store.refSize * 0.866) / store.canvasSize) * 600 //86.66 // 2x apothem = 110

	let hexDown = hexHeight / 2 // aka apothem = 55
	let hexSide = (hexDown / 1.732) * 2 //* Math.sqrt(3/2) *  63.5 = hexDown / tan60 * 2
	let hexAcross = hexSide / 2 //31.75

	// This path is transfrom-shifted to the CENTER of the city hex.
	// So to get the path to START in the right place, shift it half hex back, 1.5 hex up
	let path = `M ${hexSide * -0.5} ${hexHeight * -1.5}`

	const directions = [
		[hexSide, 0],
		[hexAcross, hexDown],
		[hexSide, 0],
		[hexAcross, hexDown],
		[-hexAcross, hexDown],
		[hexAcross, hexDown],
		[-hexAcross, hexDown],
		[-hexSide, 0],
		[-hexAcross, hexDown],
		[-hexSide, 0],
		[-hexAcross, -hexDown],
		[-hexSide, 0],
		[-hexAcross, -hexDown],
		[hexAcross, -hexDown],
		[-hexAcross, -hexDown],
		[hexAcross, -hexDown],
		[hexSide, 0],
		[hexAcross, -hexDown],
	]

	directions.forEach(([dx, dy]) => {
		path += ` l ${dx} ${dy}`
	})

	return path
}

export function findCommonSide(hex1, hex2) {
	// Start at hex1, going TO hex 2
	// Sides are numbered 0-5. Side ZERO is on the TOP
	if (hex1.q != hex2.q && hex1.s === hex2.s) {
		if (hex2.q < hex1.q) return 4
		if (hex2.q > hex1.q) return 1
	}
	if (hex1.r != hex2.r && hex1.q === hex2.q) {
		if (hex2.r < hex1.r) return 0
		if (hex2.r > hex1.r) return 3
	}
	if (hex1.s != hex2.s && hex1.r === hex2.r) {
		if (hex2.s < hex1.s) return 2
		if (hex2.s > hex1.s) return 5
	}
	return -1
}

export function getPathBetweenHexIDs(zocID, outsideID) {
	const store = useModelStore()

	// Set up PATH vars
	// DO NOT ADJUST ANY OF THESE. IT ALL RUNS THROUGH store.refSize
	let hexHeight = ((store.refSize * 0.866) / store.canvasSize) * 600 //86.66 // 2x apothem = 110
	let hexDown = hexHeight / 2 // aka apothem = 55
	let hexSide = (hexDown / 1.732) * 2 //* Math.sqrt(3/2) *  63.5 = hexDown / tan60 * 2
	let hexAcross = hexSide / 2 //31.75

	// Set up data using higher/lower IDs
	// This allows us to see common ZOC sides, even when they have different in/out ZOC hexes
	let lowerID, higherID

	if (zocID < outsideID) {
		lowerID = zocID
		higherID = outsideID
	} else {
		lowerID = outsideID
		higherID = zocID
	}

	let lowerData = getHexDataFromID(lowerID)
	let higherData = getHexDataFromID(higherID)
	let commonSide = findCommonSide(lowerData.hex, higherData.hex)

	let directions = []

	// Move the pen to the center of the ZOC hex
	// First move to the absolute position of the ZOC hex
	let p = hexToPixel(lowerData.hex)
	let path = ` M ${p.x.toFixed(0)} ${p.y.toFixed(0)} `

	// Then move to the relative start of the edge stroke
	let rightStartShift = 0
	let downStartShift = 0
	if (commonSide === 0) {
		rightStartShift = -0.5
		downStartShift = -0.5
		directions.push([hexSide, 0])
	} else if (commonSide === 1) {
		rightStartShift = 0.5
		downStartShift = -0.5
		directions.push([hexAcross, hexDown])
	} else if (commonSide === 2) {
		rightStartShift = 1
		directions.push([-hexAcross, hexDown])
	} else if (commonSide === 3) {
		rightStartShift = 0.5
		downStartShift = 0.5
		directions.push([-hexSide, 0])
	} else if (commonSide === 4) {
		rightStartShift = -0.5
		downStartShift = 0.5
		directions.push([-hexAcross, -hexDown])
	} else if (commonSide === 5) {
		rightStartShift = -1
		directions.push([hexAcross, -hexDown])
	}

	path += ` m ${(hexSide * rightStartShift).toFixed(0)} ${(hexHeight * downStartShift).toFixed(0)} `

	// Then add a line along the edge
	directions.forEach(([dx, dy]) => {
		path += ` l ${dx.toFixed(0)} ${dy.toFixed(0)} `
	})

	return path
}
