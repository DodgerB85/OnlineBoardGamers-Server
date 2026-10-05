/** Logical board only: no coordinates, DOM, or rendering dependencies. */
import * as rf from "./URRreference.js"

export function requireRule(condition, message) {
	if (!condition) throw new Error(message)
}

export function getArea(game, id) {
	const area = game.board.areas.find((entry) => entry.id === id)
	requireRule(area, `Unknown area: ${id}`)
	return area
}

export function canalNeighbours(game, id) {
	return game.board.canals.flatMap(([a, b]) => a === id ? [b] : b === id ? [a] : [])
}

export function isNationLandClosed(game, area) {
	if (area.nation === null) return false
	const nation = game.nations[area.nation]
	return !nation.isRemoved && nation.ownerType !== "state"
}

export function createBoard(definition) {
	if (!definition) return { areas: [], canals: [], stateOrder: [], markerLimit: null }
	const board = JSON.parse(JSON.stringify(definition))
	requireRule(board.markerLimit === null || (Number.isInteger(board.markerLimit) && board.markerLimit > 0), "Invalid ownership marker count")
	requireRule(board.stateOrder?.length === 6 && new Set(board.stateOrder).size === 6 && board.stateOrder.every((id) => rf.ALL_STATES.includes(id)), "Supply the printed state order")
	requireRule(Array.isArray(board.areas) && board.areas.length > 0, "Supply board areas")
	const ids = new Set(board.areas.map((area) => area.id))
	requireRule(ids.size === board.areas.length && !ids.has(undefined) && !ids.has(null), "Area IDs must be unique")
	board.areas = board.areas.map((area) => {
		requireRule(area.isRiver ? area.state === null || rf.ALL_STATES.includes(area.state) : rf.ALL_STATES.includes(area.state), "Land areas need a state")
		requireRule(typeof area.isRiver === "boolean" && typeof area.isCity === "boolean", "Specify river and city flags")
		requireRule(area.isRiver || (rf.ALL_LAND_TYPES.includes(area.landType) && area.region !== undefined), "Land needs terrain and a region ID")
		requireRule(Array.isArray(area.neighbours) && area.neighbours.every((id) => ids.has(id) && id !== area.id), "Invalid neighbouring area")
		requireRule(area.nation == null || rf.ALL_NATIONS.includes(area.nation), "Invalid independent nation")
		return { ...area, nation: area.nation ?? null, owner: null, markerOwner: null, waterwork: null, irrigatedBy: null }
	})
	for (const area of board.areas) {
		for (const id of area.neighbours) requireRule(board.areas.find((other) => other.id === id).neighbours.includes(area.id), "Board adjacency must be symmetric")
	}
	board.canals = board.canals || []
	const edges = new Set()
	for (const [a, b] of board.canals) {
		requireRule(board.areas.find((area) => area.id === a)?.neighbours.includes(b), "Canals must connect neighbours")
		const key = JSON.stringify([a, b].sort())
		requireRule(!edges.has(key), "Duplicate canal")
		edges.add(key)
	}
	if (board.riverDownstream) {
		const rivers = board.areas.filter((area) => area.isRiver)
		requireRule(board.riverSources?.length === 3 && new Set(board.riverSources).size === 3, "Supply three distinct river sources")
		for (const river of rivers) {
			const next = board.riverDownstream[river.id]
			requireRule(next === null || (river.neighbours.includes(next) && rivers.some((area) => area.id === next)), "River flow must reach an adjacent river area or the southern outflow")
		}
		const reached = new Set()
		for (const source of board.riverSources) {
			const path = new Set()
			let next = source
			while (next !== null) {
				requireRule(rivers.some((area) => area.id === next) && !path.has(next), "Invalid river source or cyclic river flow")
				path.add(next)
				reached.add(next)
				next = board.riverDownstream[next]
			}
		}
		requireRule(reached.size === rivers.length, "Every river area must be downstream of a source")
	}
	return board
}

// A crew builds one continuous, non-branching stretch. Existing network
// connections are counted before adding the stretch (rulebook pp.8–9).
export function getCanalCost(game, path) {
	return getPathCost(game, path, true)
}

function getPathCost(game, path, needsWaterConnection) {
	requireRule(Array.isArray(path) && path.length >= 2 && new Set(path).size === path.length, "A canal must be a simple path")
	const areas = path.map((id) => getArea(game, id))
	requireRule(areas.length !== 2 || !areas.every((area) => area.isRiver), "A single canal cannot connect two river areas")
	// A stretch may be selected from either end; one end must already hold water.
	const watered = (area) => area.isRiver || canalNeighbours(game, area.id).length > 0
	requireRule(!needsWaterConnection || watered(areas[0]) || watered(areas.at(-1)), "One end must connect to an existing river or canal")
	let junctions = 0
	for (let i = 0; i < areas.length; i++) {
		const area = areas[i]
		requireRule(!isNationLandClosed(game, area), "Independent nation land is closed to digging")
		const degree = canalNeighbours(game, area.id).length
		if (i > 0 && i < areas.length - 1) requireRule(!area.isRiver && degree === 0, "No junctions in the middle of a stretch")
		else if (area.isRiver || degree >= 2) junctions++
		if (i > 0) {
			requireRule(areas[i - 1].neighbours.includes(area.id), "Canals must connect adjacent areas")
			requireRule(!canalNeighbours(game, area.id).includes(areas[i - 1].id), "Canal already exists")
		}
	}
	return { canals: path.length - 1, junctions, points: path.length - 1 + junctions }
}

export function canCrewDig(capacity, cost) {
	if (capacity === "M") return true
	if (capacity === "1+1") return cost.canals === 1 && cost.junctions <= 1
	return cost.points <= capacity
}

// A dry-end draft is selectable only if it can still reach the existing network
// within this crew's budget. Submission always uses the complete-path validator.
export function getDigPathPreview(game, path, capacity) {
	let cost = null
	try {
		requireRule(capacity !== null && capacity !== undefined, "Choose an unused digging crew before tracing a route")
		requireRule(path.length > 0, "Select a starting area")
		const start = getArea(game, path[0])
		requireRule(!isNationLandClosed(game, start), "Independent nation land is closed to digging")
		if (path.length > 1) {
			const previous = getArea(game, path.at(-2))
			requireRule(previous.neighbours.includes(path.at(-1)), `Choose a hex adjacent to ${previous.label || previous.id}`)
			cost = getPathCost(game, path, false)
			requireRule(canCrewDig(capacity, cost), `This route needs ${cost.points} points: ${cost.canals} canals + ${cost.junctions} junctions. The ${capacity} crew cannot dig it.${capacity === "1+1" ? " A 1+1 crew can build only one canal and at most one junction." : ""}`)
			if (start.isRiver || canalNeighbours(game, start.id).length || getArea(game, path.at(-1)).isRiver || canalNeighbours(game, path.at(-1)).length) return { cost, isComplete: true, error: "" }
		}
		const queue = [path]
		const visited = new Set(path)
		for (let index = 0; index < queue.length; index++) {
			const prefix = queue[index]
			for (const next of getArea(game, prefix.at(-1)).neighbours) {
				if (visited.has(next)) continue
				const end = getArea(game, next)
				if (isNationLandClosed(game, end) || canalNeighbours(game, next).includes(prefix.at(-1))) continue
				if (prefix.length === 1 && start.isRiver && end.isRiver) continue
				const candidate = [...prefix, next]
				const candidateCost = getPathCost(game, candidate, false)
				if (!canCrewDig(capacity, candidateCost)) continue
				if (start.isRiver || canalNeighbours(game, start.id).length || end.isRiver || canalNeighbours(game, next).length) return { cost, isComplete: false, error: "" }
				visited.add(next)
				queue.push(candidate)
			}
		}
		return { cost, isComplete: false, error: `No legal route from here can reach an existing river or canal with the ${capacity} crew. Choose another start or undo the last step.` }
	} catch (error) { return { cost, isComplete: false, error: error.message } }
}

// Reach excludes crossing rivers and stops at other pumps. Those pumps are
// legal destinations; their onward routing belongs to their own king.
export function getWaterworkReach(game, sourceId) {
	const source = getArea(game, sourceId)
	requireRule(source.waterwork, "No waterwork at source")
	const limit = source.isRiver ? 1 : source.waterwork.capacity === "M" ? Infinity : source.waterwork.capacity
	const visited = new Set([sourceId])
	const queue = [[sourceId, 0]]
	const reachable = []
	for (let index = 0; index < queue.length; index++) {
		const [id, distance] = queue[index]
		if (distance >= limit) continue
		for (const nextId of canalNeighbours(game, id)) {
			if (visited.has(nextId)) continue
			visited.add(nextId)
			const next = getArea(game, nextId)
			if (next.isRiver) continue
			reachable.push(nextId)
			if (!next.waterwork) queue.push([nextId, distance + 1])
		}
	}
	return reachable
}
