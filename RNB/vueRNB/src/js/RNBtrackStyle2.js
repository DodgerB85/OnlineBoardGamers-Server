// Offset complete routes so a tile boundary cannot change the side of the track.
export function offsetTrackNetwork(chunks, offset, canMove, tolerance = 2) {
	const nodes = []
	const cells = new Map()
	const nodeFor = (point) => {
		const x = Math.floor(point[0] / tolerance), y = Math.floor(point[1] / tolerance)
		for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
			for (const node of cells.get(`${x + dx},${y + dy}`) || []) {
				if (Math.hypot(node.point[0] - point[0], node.point[1] - point[1]) <= tolerance) return node
			}
		}
		const node = { point, edges: [] }
		nodes.push(node)
		const key = `${x},${y}`
		if (!cells.has(key)) cells.set(key, [])
		cells.get(key).push(node)
		return node
	}
	const edges = chunks.map((points, index) => {
		const ends = [nodeFor(points[0]), nodeFor(points[points.length - 1])]
		const edge = { points, index, ends, used: false }
		for (const node of ends) node.edges.push(edge)
		return edge
	})
	const output = []
	const walk = (start, edge) => {
		const parts = [], points = []
		let node = start
		while (!edge.used) {
			edge.used = true
			const reversed = edge.ends[1] === node
			const piece = reversed ? [...edge.points].reverse() : [...edge.points]
			const next = edge.ends[reversed ? 0 : 1]
			piece[0] = node.point
			piece[piece.length - 1] = next.point
			const first = Math.max(0, points.length - 1)
			points.push(...piece.slice(points.length ? 1 : 0))
			parts.push({ edge, first, last: points.length, reversed })
			node = next
			if (node.edges.length !== 2) break
			const unused = node.edges.find((candidate) => !candidate.used)
			if (!unused) break
			edge = unused
		}
		const shifted = offsetRoute(points, offset, canMove, start === node, start.edges.length > 2, node.edges.length > 2)
		const distances = [0]
		for (let i = 1; i < shifted.length; i++) distances.push(distances[i - 1] + Math.hypot(shifted[i][0] - shifted[i - 1][0], shifted[i][1] - shifted[i - 1][1]))
		// Fit whole sleeper periods to the route, including the closing seam of a loop.
		const tieSpacing = distances.at(-1) / Math.max(1, Math.round(distances.at(-1) / 50)) || 50
		for (const part of parts) {
			const piece = shifted.slice(part.first, part.last)
			const phase = part.reversed ? -distances[part.last - 1] : distances[part.first]
			output[part.edge.index] = {
				points: part.reversed ? piece.reverse() : piece,
				tieSpacing,
				tieOffset: ((phase + tieSpacing * 0.12) % tieSpacing + tieSpacing) % tieSpacing,
			}
		}
	}
	for (const node of nodes) if (node.edges.length !== 2) for (const edge of node.edges) if (!edge.used) walk(node, edge)
	for (const edge of edges) if (!edge.used) walk(edge.ends[0], edge)
	return output
}

function offsetRoute(points, offset, canMove, closed, startJunction, endJunction) {
	const last = points.length - 1
	const distances = [0]
	for (let i = 1; i <= last; i++) distances.push(distances[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]))
	const normals = points.map((_point, i) => {
		const a = points[i === 0 ? (closed ? last - 1 : 0) : i - 1]
		const b = points[i === last ? (closed ? 1 : last) : i + 1]
		const size = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
		return [-(b[1] - a[1]) / size, (b[0] - a[0]) / size]
	})
	const limits = points.map((_point, i) => {
		const before = Math.max(0, i - 1), after = Math.min(last, i + 1)
		const turn = Math.hypot(normals[after][0] - normals[before][0], normals[after][1] - normals[before][1])
		// Stay below the inside bend radius, rather than producing a cusp on a tight turn.
		return turn > 0 ? Math.min(offset, 0.45 * (distances[after] - distances[before]) / turn) : offset
	})
	const candidates = [1, -1].map((sign) => {
		const amounts = points.map((point, i) => {
			if ((i === 0 && startJunction) || (i === last && endJunction)) return 0
			for (let step = 8; step > 0; step--) {
				const amount = limits[i] * step / 8
				const shifted = point.map((v, axis) => v + normals[i][axis] * amount * sign)
				if (canMove(point, shifted, normals[i])) return amount
			}
			return 0
		})
		// A shallow envelope eases into narrow banks without a sideways jump.
		for (let pass = 0; pass < 2; pass++) {
			if (closed) amounts[0] = amounts[last] = Math.min(amounts[0], amounts[last])
			for (let i = 1; i <= last; i++) amounts[i] = Math.min(amounts[i], amounts[i - 1] + (distances[i] - distances[i - 1]) * 0.2)
			for (let i = last - 1; i >= 0; i--) amounts[i] = Math.min(amounts[i], amounts[i + 1] + (distances[i + 1] - distances[i]) * 0.2)
		}
		let shifted = points.map((point, i) => {
			const moved = point.map((v, axis) => v + normals[i][axis] * amounts[i] * sign)
			return amounts[i] > 0 && canMove(point, moved, normals[i]) ? moved : point
		})
		if (closed) shifted[last] = shifted[0]
		// Round small kinks in the offset without moving a junction or leaving its bank.
		for (let pass = 0; pass < 6; pass++) {
			shifted = shifted.map((point, i) => {
				if (!closed && (i === 0 || i === last)) return point
				const a = shifted[i === 0 || i === last ? last - 1 : i - 1]
				const b = shifted[i === 0 || i === last ? 1 : i + 1]
				const moved = point.map((v, axis) => (a[axis] + 2 * v + b[axis]) / 4)
				const size = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
				const normal = [-(b[1] - a[1]) / size, (b[0] - a[0]) / size]
				return Math.hypot(moved[0] - points[i][0], moved[1] - points[i][1]) <= offset && canMove(points[i], moved, normal) ? moved : point
			})
		}
		let length = 0
		for (let i = 1; i <= last; i++) length += Math.hypot(shifted[i][0] - shifted[i - 1][0], shifted[i][1] - shifted[i - 1][1])
		return { shifted, score: amounts.reduce((sum, amount) => sum + amount, 0), length }
	})
	const [left, right] = candidates
	// With equal clearance, prefer the outside of a bend over compressing it.
	return left.score > right.score || (left.score === right.score && left.length >= right.length) ? left.shifted : right.shifted
}

export function offsetTrackPaths(hexes, ratio, rotation, offset, canMove) {
	const cos = Math.cos(rotation), sin = Math.sin(rotation)
	const entries = [], chunks = []
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
	for (const hex of hexes) {
		hex.fullTrainTrackPathOffsetZP = []
		for (const chain of hex.fullTrainTrackPathZP) {
			path.setAttribute("d", chain.d)
			const length = path.getTotalLength(), steps = Math.max(2, Math.ceil(length / 10))
			chunks.push(Array.from({ length: steps + 1 }, (_entry, i) => {
				const p = path.getPointAtLength(length * i / steps)
				return [p.x * cos - p.y * sin + hex.rawXY[0] / ratio, p.x * sin + p.y * cos + hex.rawXY[1] / ratio]
			}))
			entries.push(hex)
		}
	}
	// The hex artwork and grid spacing differ slightly; rawXY is rounded too.
	const shifted = offsetTrackNetwork(chunks, offset, canMove, 8 + 1 / ratio)
	for (let i = 0; i < shifted.length; i++) {
		const hex = entries[i]
		const points = shifted[i].points.map((p) => {
			const x = p[0] - hex.rawXY[0] / ratio, y = p[1] - hex.rawXY[1] / ratio
			return [x * cos + y * sin, -x * sin + y * cos]
		})
		hex.fullTrainTrackPathOffsetZP.push({ d: points.map((p, j) => `${j ? "L" : "M"}${p.join(" ")}`).join(" "), tieSpacing: shifted[i].tieSpacing, tieOffset: shifted[i].tieOffset })
	}
	for (const hex of hexes) hex.fullTrainTrackPathOffset = hex.fullTrainTrackPathOffsetZP.map((chain) => ({
		...chain,
		d: chain.d.replace(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi, (value) => Number(value) * ratio),
		tieSpacing: chain.tieSpacing * ratio,
		tieOffset: chain.tieOffset * ratio,
	}))
}

export function createTrackMoveCheck(hexes, ratio, rotation, boundaryPoints, isWaterHex, riverPathsFor) {
	const canvas = document.createElement("canvas").getContext("2d")
	const boundary = new Path2D("M" + boundaryPoints.map((p) => p.join(" ")).join(" L") + " Z")
	const cells = new Map()
	const cos = Math.cos(rotation), sin = Math.sin(rotation)
	for (const hex of hexes) {
		if (isWaterHex(hex)) continue
		const x = hex.rawXY[0] / ratio, y = hex.rawXY[1] / ratio
		const angle = -hex.rotation * Math.PI / 3
		const mask = { x, y, cos: Math.cos(angle), sin: Math.sin(angle), rivers: riverPathsFor(hex).map((d) => new Path2D(d)) }
		for (let cx = Math.floor((x - 500) / 1000); cx <= Math.floor((x + 500) / 1000); cx++) {
			for (let cy = Math.floor((y - 500) / 1000); cy <= Math.floor((y + 500) / 1000); cy++) {
				const key = `${cx},${cy}`
				if (!cells.has(key)) cells.set(key, [])
				cells.get(key).push(mask)
			}
		}
	}
	const isDry = (point) => {
		const masks = cells.get(`${Math.floor(point[0] / 1000)},${Math.floor(point[1] / 1000)}`) || []
		return masks.some((mask) => {
			const dx = point[0] - mask.x, dy = point[1] - mask.y
			const x = dx * cos + dy * sin, y = -dx * sin + dy * cos
			if (!canvas.isPointInPath(boundary, x, y)) return false
			const rx = x * mask.cos - y * mask.sin, ry = x * mask.sin + y * mask.cos
			return !mask.rivers.some((river) => canvas.isPointInPath(river, rx, ry, "evenodd"))
		})
	}
	return (original, shifted, normal) => {
		// Keep the whole sleeper on land, and never jump across a narrow river.
		for (const width of [-52, -26, 0, 26, 52]) {
			for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
				const p = original.map((v, i) => v + (shifted[i] - v) * fraction + normal[i] * width)
				if (!isDry(p)) return false
			}
		}
		return true
	}
}
