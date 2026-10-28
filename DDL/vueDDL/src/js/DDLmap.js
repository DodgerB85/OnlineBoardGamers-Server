/**
 * Board graph and geometry helpers.
 *
 * Each branch links planets or shared junctions through its printed road cells.
 * Entering a cell costs one step, or zero for the owner of its highway.
 */

import * as rf from "./DDLreference.js"
import i18n from "../i18n.js"

const t = i18n.global.t
const SEGMENT_PREFIX = "S"

export const SEGMENT_POSITIONS = rf.ROUTE_DOTS
export const ROAD_POLYGONS = { ...rf.JUNCTION_CELLS }
for (const route of rf.ROUTES) {
	for (let i = 1; i < route.length; i++) ROAD_POLYGONS[segmentNodeId(route.id, i)] = rf.ROAD_CELLS[route.id][i - 1]
}
export const ROAD_NODES = Object.keys(ROAD_POLYGONS)

export function roadPolygon(nodeId) {
	return ROAD_POLYGONS[nodeId].map((point) => point.join(",")).join(" ")
}

export function isRoadNode(nodeId) {
	return Object.hasOwn(ROAD_POLYGONS, nodeId)
}

export function segmentNodeId(routeId, index) {
	return SEGMENT_PREFIX + routeId + ":" + index
}

export function parseSegmentNode(nodeId) {
	if (typeof nodeId !== "string" || !nodeId.startsWith(SEGMENT_PREFIX)) return null
	const [routeId, index] = nodeId.slice(1).split(":")
	return { routeId: Number(routeId), index: Number(index) }
}

export function nodePosition(nodeId) {
	const seg = parseSegmentNode(nodeId)
	if (seg) {
		const pos = SEGMENT_POSITIONS[seg.routeId]
		return pos && pos[seg.index - 1] ? pos[seg.index - 1] : [0, 0]
	}
	return rf.nodeCoord(nodeId)
}

export function nodeLabel(nodeId) {
	const planet = rf.planetByNode(nodeId)
	if (planet) return planet.name
	const seg = parseSegmentNode(nodeId)
	if (seg) return t("map.routeDot", { route: seg.routeId + 1, dot: seg.index })
	return t("map.deepSpace")
}

export function nodePlanetId(nodeId) {
	const planet = rf.planetByNode(nodeId)
	return planet ? planet.id : -1
}

// Adjacency is static; the cost of entering a dot is decided by DDLrules.
export const ADJACENCY = {}
function addAdj(a, b, routeId, segmentId) {
	if (!ADJACENCY[a]) ADJACENCY[a] = []
	ADJACENCY[a].push({ to: b, routeId, segment: segmentId || null })
}

for (const route of rf.ROUTES) {
	const chain = [route.a]
	for (let i = 1; i < route.length; i++) chain.push(segmentNodeId(route.id, i))
	chain.push(route.b)
	for (let i = 0; i < chain.length - 1; i++) {
		const a = chain[i]
		const b = chain[i + 1]
		addAdj(a, b, route.id, isRoadNode(b) ? b : null)
		addAdj(b, a, route.id, isRoadNode(a) ? a : null)
	}
}

export function neighbours(nodeId) {
	return ADJACENCY[nodeId] || []
}

function edgeCost(state, playerIndex, from, to) {
	if (isRoadNode(to)) {
		const highway = state.board.highways[to]
		if (highway === playerIndex) return 0
	}
	return 1
}

/**
 * Shortest path from one node to another honouring the player's highways.
 * Returns {cost, path}. The path includes both endpoints.
 */
export function findPath(state, playerIndex, from, to) {
	if (from === to) return { cost: 0, path: [from] }
	const dist = { [from]: 0 }
	const prev = {}
	const queue = [{ node: from, cost: 0 }]
	const visited = new Set()
	while (queue.length > 0) {
		queue.sort((a, b) => a.cost - b.cost)
		const current = queue.shift()
		if (visited.has(current.node)) continue
		visited.add(current.node)
		if (current.node === to) break
		for (const edge of neighbours(current.node)) {
			const cost = current.cost + edgeCost(state, playerIndex, current.node, edge.to)
			if (dist[edge.to] === undefined || cost < dist[edge.to]) {
				dist[edge.to] = cost
				prev[edge.to] = current.node
				queue.push({ node: edge.to, cost })
			}
		}
	}
	if (dist[to] === undefined) return { cost: Infinity, path: [] }
	const path = [to]
	let node = to
	while (node !== from) {
		node = prev[node]
		path.unshift(node)
	}
	return { cost: dist[to], path }
}

export function reachableNodes(state, playerIndex, from, maxSteps) {
	const dist = { [from]: 0 }
	const queue = [{ node: from, cost: 0 }]
	const visited = new Set()
	while (queue.length > 0) {
		queue.sort((a, b) => a.cost - b.cost)
		const current = queue.shift()
		if (visited.has(current.node)) continue
		visited.add(current.node)
		for (const edge of neighbours(current.node)) {
			const cost = current.cost + edgeCost(state, playerIndex, current.node, edge.to)
			if (cost <= maxSteps && (dist[edge.to] === undefined || cost < dist[edge.to])) {
				dist[edge.to] = cost
				queue.push({ node: edge.to, cost })
			}
		}
	}
	return Object.keys(dist).filter((node) => node !== from)
}

export function pathStepNode(nodeId) {
	return nodeId
}

export function shipsOnNode(state, nodeId) {
	const result = []
	for (let i = 0; i < state.players.length; i++) {
		if (state.players[i].ship.node === nodeId) result.push(i)
	}
	return result
}

export function planetAtNode(nodeId) {
	return rf.planetByNode(nodeId)
}
