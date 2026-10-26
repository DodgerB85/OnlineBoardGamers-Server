/**
 * Keyflower: The Farmers helpers.
 *
 * A field is a region between roads/water inside a tile. Fields connect across
 * grass edges and may span several tiles. We model each tile's fields from its
 * sides array, then union the fields that meet on a grass edge.
 */

import * as rf from "./KFWreference"

import { useModelStore } from "../stores/KFWstore.js"

// Same vectors as KFWmap.findAdjacentHexCoordsThroughSide; kept local to avoid a module cycle.
const SIDE_DIRECTION_VECTORS = [
	[0, 1, -1],
	[-1, 1, 0],
	[-1, 0, 1],
	[0, -1, 1],
	[1, -1, 0],
	[1, 0, -1],
]

function getAdjacentCoordThroughSide(coord, side) {
	const [x, y, z] = coord
	const [dx, dy, dz] = SIDE_DIRECTION_VECTORS[side]
	return [x + dx, y + dy, z + dz]
}

export function getTileFieldRegions(tile) {
	const sides = tile.sides || []
	const roads = []
	const waters = []
	for (let i = 0; i < 6; i++) {
		if (sides[i] === rf.ROAD) roads.push(i)
		else if (sides[i] === rf.WATER) waters.push(i)
	}
	let barriers = []
	// A single road or water edge is a dead end and does not split the tile.
	if (roads.length >= 2) barriers.push(...roads)
	if (waters.length >= 2) barriers.push(...waters)
	barriers = [...new Set(barriers)].sort((a, b) => a - b)

	if (barriers.length <= 1) return [{ index: 0, edges: [0, 1, 2, 3, 4, 5] }]

	const regions = []
	for (let i = 0; i < barriers.length; i++) {
		const start = barriers[i]
		const end = barriers[(i + 1) % barriers.length]
		const edges = []
		for (let e = (start + 1) % 6; e !== end; e = (e + 1) % 6) edges.push(e)
		regions.push({ index: i, edges })
	}
	return regions
}

export function getTileFieldIndexForEdge(tile, edge) {
	const regions = getTileFieldRegions(tile)
	for (let i = 0; i < regions.length; i++) {
		if (regions[i].edges.includes(edge)) return regions[i].index
	}
	return -1
}

function fieldKey(tileId, fieldIndex) {
	return `${tileId}:${fieldIndex}`
}

function ensureTileAnimalArray(tile) {
	if (!Array.isArray(tile.animals)) tile.animals = []
	const regions = getTileFieldRegions(tile)
	while (tile.animals.length < regions.length) tile.animals.push([0, 0, 0])
}

export function getAnimalCountOnTileField(tile, fieldIndex, animalType) {
	if (!Array.isArray(tile.animals) || !tile.animals[fieldIndex]) return 0
	return tile.animals[fieldIndex][animalType] || 0
}

/**
 * Returns the unified fields of a village. Each entry:
 * { key, regions: [{tileId, tile, fieldIndex}], animals: [sheep, pig, cow], tileIds: [id] }
 */
export function getPlayerFields(playerIndex) {
	const store = useModelStore()
	const playerObj = store.players[playerIndex]
	if (!playerObj) return []

	const nodes = []
	const nodeByTileField = {}
	for (let i = 0; i < playerObj.villageTiles.length; i++) {
		const tile = playerObj.villageTiles[i]
		ensureTileAnimalArray(tile)
		const regions = getTileFieldRegions(tile)
		for (let j = 0; j < regions.length; j++) {
			const node = {
				id: nodes.length,
				parent: nodes.length,
				tileId: tile.id,
				tile,
				fieldIndex: regions[j].index,
				edges: regions[j].edges,
				animals: [0, 0, 0],
				tileIds: [tile.id],
			}
			nodes.push(node)
			nodeByTileField[fieldKey(tile.id, regions[j].index)] = node
		}
	}

	function find(node) {
		while (node.parent !== node.id) {
			node.parent = nodes[node.parent].parent
			node = nodes[node.parent]
		}
		return node
	}
	function union(a, b) {
		const rootA = find(a)
		const rootB = find(b)
		if (rootA.id !== rootB.id) rootB.parent = rootA.id
	}

	function isBoatTile(tile) {
		return rf.TILE_BOATS.includes(tile.tileID[0]) || rf.TILE_BOATS_MERCHANTS.includes(tile.tileID[0]) || rf.TILE_SUMMER_BOATS.includes(tile.tileID[0])
	}

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i]
		for (let e = 0; e < node.edges.length; e++) {
			const edge = node.edges[e]
			if (node.tile.sides[edge] !== rf.GRASS) continue
			const neighbourCoord = getAdjacentCoordThroughSide(node.tile.coord, edge)
			const neighbour = playerObj.villageTiles.find((t) => t.coord[0] === neighbourCoord[0] && t.coord[1] === neighbourCoord[1])
			if (!neighbour) continue
			// Rules: the corners of fields on boat tiles do not connect to adjacent boat tiles.
			if (isBoatTile(node.tile) && isBoatTile(neighbour)) continue
			const joiningSide = (edge + 3) % 6
			if (neighbour.sides[joiningSide] !== rf.GRASS) continue
			const neighbourField = getTileFieldIndexForEdge(neighbour, joiningSide)
			const otherNode = nodeByTileField[fieldKey(neighbour.id, neighbourField)]
			if (otherNode) union(node, otherNode)
		}
	}

	const fieldsByRoot = {}
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i]
		const root = find(node)
		if (!fieldsByRoot[root.id]) {
			fieldsByRoot[root.id] = {
				key: fieldKey(root.tileId, root.fieldIndex),
				regions: [],
				animals: [0, 0, 0],
				tileIds: [],
			}
		}
		const field = fieldsByRoot[root.id]
		field.regions.push({ tileId: node.tileId, tile: node.tile, fieldIndex: node.fieldIndex })
		if (!field.tileIds.includes(node.tileId)) field.tileIds.push(node.tileId)
		const animals = node.tile.animals[node.fieldIndex] || [0, 0, 0]
		for (let a = 0; a < field.animals.length; a++) field.animals[a] += animals[a] || 0
	}

	return Object.values(fieldsByRoot)
}

export function getFieldsForTile(playerIndex, tileId) {
	return getPlayerFields(playerIndex).filter((field) => field.tileIds.includes(tileId))
}

export function getFieldByKey(playerIndex, key) {
	return getPlayerFields(playerIndex).find((field) => field.key === key) || null
}

export function getAdjacentFields(playerIndex, sourceFieldKey) {
	const fields = getPlayerFields(playerIndex)
	const source = fields.find((field) => field.key === sourceFieldKey)
	if (!source) return []
	const sourceTileIds = new Set(source.tileIds)
	const result = []
	for (let i = 0; i < fields.length; i++) {
		const field = fields[i]
		if (field.key === sourceFieldKey) continue
		if (field.tileIds.some((id) => sourceTileIds.has(id))) result.push(field)
	}
	return result
}

export function canPlaceAnimalInField(field, animalType, allowMixed) {
	if (allowMixed) return true
	for (let a = 0; a < field.animals.length; a++) {
		if (field.animals[a] > 0 && a !== animalType) return false
	}
	return true
}

// Returns the unified field on the target tile that can take the animal, or null.
export function findAvailableAnimalField(playerIndex, tileId, animalType, allowMixed) {
	const fields = getPlayerFields(playerIndex).filter((field) => field.tileIds.includes(tileId))
	for (let i = 0; i < fields.length; i++) {
		if (canPlaceAnimalInField(fields[i], animalType, allowMixed)) return fields[i]
	}
	return null
}

export function addAnimalToTileField(tile, fieldIndex, animalType) {
	ensureTileAnimalArray(tile)
	if (!tile.animals[fieldIndex]) tile.animals[fieldIndex] = [0, 0, 0]
	tile.animals[fieldIndex][animalType]++
}

export function removeAnimalFromTileField(tile, fieldIndex, animalType) {
	if (!Array.isArray(tile.animals) || !tile.animals[fieldIndex]) return false
	if ((tile.animals[fieldIndex][animalType] || 0) <= 0) return false
	tile.animals[fieldIndex][animalType]--
	return true
}

export function getAnimalGroupsForTile(playerIndex, tile) {
	const fields = getPlayerFields(playerIndex).filter((field) => field.tileIds.includes(tile.id))
	const result = []
	for (let i = 0; i < fields.length; i++) {
		const field = fields[i]
		const counts = [0, 0, 0]
		for (let r = 0; r < field.regions.length; r++) {
			const region = field.regions[r]
			if (region.tileId !== tile.id) continue
			const animals = region.tile.animals[region.fieldIndex] || [0, 0, 0]
			for (let a = 0; a < counts.length; a++) counts[a] += animals[a] || 0
		}
		if (counts.some((c) => c > 0)) result.push({ fieldKey: field.key, fieldIndex: field.regions.find((r) => r.tileId === tile.id).fieldIndex, counts })
	}
	return result
}
