/**
 * Board graph and geometry helpers.
 *
 * A route of printed length N is modelled as N steps: the planet at one end,
 * N-1 mid-space "dot" nodes, then the planet at the other end. A highway on a
 * dot makes entering that dot free for its owner.
 */

import * as rf from "./DDLreference.js"
import i18n from "../i18n.js"

const t = i18n.global.t
const SEGMENT_PREFIX = "S"

function sampleCurve(points, samplesPerSection = 24) {
	if (!points || points.length === 0) return []
	if (points.length === 1) return [points[0]]
	const out = []
	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[Math.max(0, i - 1)]
		const p1 = points[i]
		const p2 = points[i + 1]
		const p3 = points[Math.min(points.length - 1, i + 2)]
		for (let j = 0; j < samplesPerSection; j++) {
			const t = j / samplesPerSection
			const t2 = t * t
			const t3 = t2 * t
			out.push([
				0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
				0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
			])
		}
	}
	out.push(points[points.length - 1])
	return out
}

function pointAtFraction(points, fraction) {
	if (points.length === 1) return points[0]
	let total = 0
	const lengths = []
	for (let i = 1; i < points.length; i++) {
		const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
		lengths.push(d)
		total += d
	}
	if (total === 0) return points[0]
	let target = total * fraction
	for (let i = 0; i < lengths.length; i++) {
		if (target <= lengths[i]) {
			const t = lengths[i] === 0 ? 0 : target / lengths[i]
			return [points[i][0] + (points[i + 1][0] - points[i][0]) * t, points[i][1] + (points[i + 1][1] - points[i][1]) * t]
		}
		target -= lengths[i]
	}
	return points[points.length - 1]
}

export const ROUTE_POINTS = {}
export const SEGMENT_POSITIONS = {}
for (const route of rf.ROUTES) {
	const points = sampleCurve(route.ctrl)
	ROUTE_POINTS[route.id] = points
	// Prefer the measured printed dots; the hand-drawn control points only
	// describe the shape of the route, not where its dots landed on the art.
	const measured = rf.ROUTE_DOTS[route.id]
	SEGMENT_POSITIONS[route.id] = []
	for (let i = 1; i < route.length; i++) {
		const fallback = pointAtFraction(points, i / route.length)
		const dot = measured && measured[i - 1] ? measured[i - 1] : fallback
		SEGMENT_POSITIONS[route.id].push([dot[0], dot[1]])
	}
}

export function segmentNodeId(routeId, index) {
	return SEGMENT_PREFIX + routeId + ":" + index
}

export function parseSegmentNode(nodeId) {
	if (typeof nodeId !== "string" || !nodeId.startsWith(SEGMENT_PREFIX)) return null
	const [routeId, index] = nodeId.slice(1).split(":")
	return { routeId: Number(routeId), index: Number(index) }
}

export function isSegmentNode(nodeId) {
	return parseSegmentNode(nodeId) !== null
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
		addAdj(a, b, route.id, isSegmentNode(b) ? b : null)
		addAdj(b, a, route.id, isSegmentNode(a) ? a : null)
	}
}

export function neighbours(nodeId) {
	return ADJACENCY[nodeId] || []
}

export function routePathD(route) {
	const pts = ROUTE_POINTS[route.id]
	if (!pts || pts.length === 0) return ""
	let d = `M ${pts[0][0]} ${pts[0][1]}`
	for (let i = 1; i < pts.length - 1; i++) {
		const midX = (pts[i][0] + pts[i + 1][0]) / 2
		const midY = (pts[i][1] + pts[i + 1][1]) / 2
		d += ` Q ${pts[i][0]} ${pts[i][1]} ${midX} ${midY}`
	}
	d += ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`
	return d
}

function edgeCost(state, playerIndex, from, to) {
	if (isSegmentNode(to)) {
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
