/** Rainy-season routing. The stack records water handed between monarchs;
 * unused water returns along that stack before rejoining its river.
 */
import * as rf from "./URRreference.js"
import { requireRule, getArea, getWaterworkReach } from "./URRmap.js"

export function currentWaterFrame(game) {
	return game.rain.routing?.stack.at(-1) ?? null
}

export function waterChoices(game) {
	const frame = currentWaterFrame(game)
	if (!frame || frame.water === 0) return []
	return getWaterworkReach(game, frame.area).flatMap((id) => {
		const area = getArea(game, id)
		if (area.waterwork) return frame.visited.includes(id) ? [] : [{ area: id, kind: "pump" }]
		return area.owner !== null && area.irrigatedBy === null ? [{ area: id, kind: "irrigate" }] : []
	})
}

export function startWaterRouting(game) {
	requireRule(game.board.riverSources?.length === 3 && game.board.riverDownstream, "Configure the three rivers before routing water")
	game.rain.routing = { sourceIndex: 0, river: null, arrivals: {}, stack: [], outflow: 0 }
	return advanceWaterRouting(game)
}

function startPump(game, area, amount, visited) {
	const frame = { area: area.id, water: amount, visited: [...visited, area.id] }
	if (area.owner !== null && area.irrigatedBy === null) {
		area.irrigatedBy = area.waterwork.state
		frame.water--
	}
	game.rain.routing.stack.push(frame)
}

function finishFrame(game) {
	const routing = game.rain.routing
	const frame = routing.stack.pop()
	const parent = routing.stack.at(-1)
	if (parent) {
		parent.water += frame.water
		if (frame.water > 0) parent.visited = [...new Set([...parent.visited, ...frame.visited])]
	} else {
		routing.river = { area: game.board.riverDownstream[frame.area], water: frame.downstreamWater + frame.water }
	}
}

export function advanceWaterRouting(game) {
	const routing = game.rain.routing
	while (true) {
		const frame = currentWaterFrame(game)
		if (frame) {
			if (waterChoices(game).length > 0) {
				game.gameflow.turnOrder = [game.states[getArea(game, frame.area).waterwork.state].king]
				return false
			}
			finishFrame(game)
			continue
		}
		if (!routing.river) {
			if (routing.sourceIndex === game.board.riverSources.length) {
				game.gameflow.turnOrder = []
				return true
			}
			routing.river = { area: game.board.riverSources[routing.sourceIndex++], water: rf.ERA_WATER_PER_RIVER[game.era] }
		}
		let { area: id, water } = routing.river
		if (id === null) {
			routing.outflow += water
			routing.river = null
			continue
		}
		const upstreamCount = Object.values(game.board.riverDownstream).filter((next) => next === id).length
		if (upstreamCount > 1) {
			const arrivals = routing.arrivals[id] || { count: 0, water: 0 }
			arrivals.count++
			arrivals.water += water
			routing.arrivals[id] = arrivals
			if (arrivals.count < upstreamCount) {
				routing.river = null
				continue
			}
			water = arrivals.water
		}
		const area = getArea(game, id)
		if (area.waterwork && water > 0) {
			const diverted = area.waterwork.capacity === "M" ? water : Math.min(water, area.waterwork.capacity)
			routing.stack.push({ area: id, water: diverted, downstreamWater: water - diverted, visited: [id] })
			routing.river = null
		} else routing.river = { area: game.board.riverDownstream[id], water }
	}
}

export function allocateWater(game, action) {
	requireRule(action.type === "allocateWater", "Choose where to send the water")
	const frame = currentWaterFrame(game)
	const choice = waterChoices(game).find((entry) => entry.area === action.area)
	requireRule(choice, "Water must go to reachable owned land or an unvisited pump")
	const amount = action.amount ?? 1
	requireRule(Number.isInteger(amount) && amount > 0 && amount <= frame.water, "Choose an available amount of water")
	const area = getArea(game, choice.area)
	if (choice.kind === "irrigate") {
		requireRule(amount === 1, "Each area uses exactly one water")
		area.irrigatedBy = getArea(game, frame.area).waterwork.state
		frame.water--
	} else {
		frame.water -= amount
		startPump(game, area, amount, frame.visited)
	}
	return advanceWaterRouting(game)
}
