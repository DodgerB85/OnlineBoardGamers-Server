/** Printed board coordinates shared by URRboard's transcription and the map UI. */
export const MAP_WIDTH = 1216
export const MAP_HEIGHT = 986
export const MAP_STATE_COLOURS = ["white", "blue", "lime", "black", "yellow", "red"]
const NEIGHBOUR_OFFSETS = [[-49, -89], [49, -89], [98, 0], [49, 89], [-49, 89], [-98, 0]]
// Rivers are neutral in the rules, but the printed state borders cross them.
const RIVER_BORDER_STATES = {
	"printed-0-4": 0,
	"printed-1-0": 5, "printed-1-1": 5, "printed-1-5": 0,
	"printed-2-1": 5, "printed-2-5": 0,
	"printed-3-2": 1, "printed-3-6": 0, "printed-3-7": 0, "printed-3-8": 3, "printed-3-9": 3,
	"printed-4-2": 1, "printed-4-6": 0, "printed-4-9": 3,
	"printed-5-3": 4, "printed-5-6": 2,
	"printed-6-2": 4, "printed-6-3": 4, "printed-6-4": 4, "printed-6-5": 4, "printed-6-6": 2,
	"printed-7-3": 4, "printed-8-3": 4,
}

const ROWS = [
	[190, 288, 386, 484, 582, 680, 778, 875, 973, 1071],
	[141, 239, 337, 435, 533, 631, 729, 827, 925, 1023],
	[190, 288, 386, 484, 582, 680, 778, 875, 973, 1071],
	[141, 239, 337, 435, 533, 631, 729, 827, 925, 1023],
	[190, 288, 386, 484, 582, 680, 778, 875, 973, 1071],
	[141, 239, 337, 435, 533, 631, 729, 827, 925, 1023],
	[190, 288, 386, 484, 582, 680, 778, 875, 973, 1071],
	[141, 239, 337, 435, 533, 631, 729, 827, 925, 1023],
	[190, 288, 386, 484, 582, 680, 778, 875, 973, 1071],
]

// The artwork has nine rows spaced 89 pixels apart; a smaller pitch
// accumulates a visible offset towards the bottom of the board.
export const PRINTED_HEXES = ROWS.flatMap((xs, row) => xs.map((x, column) => ({ id: `printed-${row}-${column}`, x, y: 134 + row * 89 })))

export function hexPoints(x, y) {
	return hexCellPoints({ x, y }, [])
}

export function hexCellPoints(position, positions) {
	// Virtual neighbours keep edge hexes the same size as interior hexes.
	const neighbours = [position, ...positions.filter((other) => other !== position && Math.hypot(other.x - position.x, other.y - position.y) < 105)]
	const missingNeighbours = neighbours.flatMap((centre) => NEIGHBOUR_OFFSETS.map(([dx, dy]) => ({ x: centre.x + dx, y: centre.y + dy })).filter((candidate) => !positions.some((other) => Math.abs(other.x - candidate.x) < 2 && Math.abs(other.y - candidate.y) < 2)))
	return hexClipPoints(position, [...positions, ...missingNeighbours])
}

export function stateBorderPaths(areas) {
	const positionedAreas = areas.filter((area) => getAreaPosition(area)).map((area) => ({ ...area, state: area.state ?? RIVER_BORDER_STATES[area.id] ?? null, display: getAreaPosition(area) }))
	const positions = positionedAreas.map((area) => area.display)
	return positionedAreas.filter((area) => area.state !== null).map((area) => {
		const corners = hexCellPoints(area.display, positions).split(" ").map((point) => point.split(",").map(Number))
		const outerEdges = []
		const path = corners.flatMap((start, index) => {
			const end = corners[(index + 1) % corners.length]
			const midpointX = (start[0] + end[0]) / 2
			const midpointY = (start[1] + end[1]) / 2
			const distance = (position) => (position.x - midpointX) ** 2 + (position.y - midpointY) ** 2
			const neighbour = positionedAreas.find((other) => other !== area && Math.abs(distance(other.display) - distance(area.display)) < 1e-6)
			if (neighbour?.state === area.state) return []
			const edge = `M${start.join(",")} L${end.join(",")}`
			if (!neighbour) { outerEdges.push([start, end]); return [] }
			return [edge]
		}).join(" ")
		return { areaId: area.id, state: area.state, path, outerEdges }
	}).filter((border) => border.path || border.outerEdges.length)
}

export function outerStateBorderPaths(borders) {
	const edges = borders.flatMap((border) => border.outerEdges.map(([start, end]) => ({ state: border.state, start, end })))
	const paths = []
	const samePoint = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6
	while (edges.length) {
		const first = edges.shift()
		const points = [first.start, first.end]
		// Join across hexes so SVG draws real corners instead of overlapping end caps.
		while (true) {
			const index = edges.findIndex((edge) => edge.state === first.state && (samePoint(edge.start, points.at(-1)) || samePoint(edge.end, points[0])))
			if (index < 0) break
			const [edge] = edges.splice(index, 1)
			if (samePoint(edge.start, points.at(-1))) points.push(edge.end)
			else points.unshift(edge.start)
		}
		let path = points.map((point, index) => `${index ? "L" : "M"}${point.join(",")}`).join(" ")
		if (samePoint(points[0], points.at(-1))) path += " Z"
		paths.push({ state: first.state, path })
	}
	return paths
}

export function hexClipPoints(position, positions) {
	let points = [[0, 0], [MAP_WIDTH, 0], [MAP_WIDTH, MAP_HEIGHT], [0, MAP_HEIGHT]]
	// Bisect the actual centres so even the artwork's uneven spacing has shared edges.
	for (const neighbour of positions) {
		const dx = neighbour.x - position.x
		const dy = neighbour.y - position.y
		if (dx === 0 && dy === 0) continue
		const midpointX = (position.x + neighbour.x) / 2
		const midpointY = (position.y + neighbour.y) / 2
		const distance = ([x, y]) => (x - midpointX) * dx + (y - midpointY) * dy
		const clipped = []
		for (let index = 0; index < points.length; index++) {
			const start = points[index]
			const end = points[(index + 1) % points.length]
			const startDistance = distance(start)
			const endDistance = distance(end)
			if (startDistance <= 0) clipped.push(start)
			if ((startDistance <= 0) !== (endDistance <= 0)) {
				const fraction = startDistance / (startDistance - endDistance)
				clipped.push([start[0] + fraction * (end[0] - start[0]), start[1] + fraction * (end[1] - start[1])])
			}
		}
		points = clipped
	}
	return points.filter((point, index) => {
		const previous = points[(index + points.length - 1) % points.length]
		return Math.hypot(point[0] - previous[0], point[1] - previous[1]) > 1e-7
	}).map((point) => point.join(",")).join(" ")
}

export function getAreaPosition(area) {
	if (!area?.display || !Number.isFinite(area.display.x) || !Number.isFinite(area.display.y)) return null
	// Saved centres sit two pixels above the printed hex grid.
	return { x: area.display.x, y: area.display.y + 2 }
}
