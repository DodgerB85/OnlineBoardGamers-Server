import * as rf from "./URRreference.js"
import * as water from "./URRwater.js"

function canalPath(board, from, to) {
	const queue = [[from]]
	const visited = new Set([from])
	for (const path of queue) {
		const last = path.at(-1)
		if (last === to) return path
		for (const canal of board.canals) {
			if (!canal.includes(last)) continue
			const next = canal.find((id) => id !== last)
			if (visited.has(next)) continue
			const area = board.areas.find((area) => area.id === next)
			if (next !== to && (area.isRiver || area.waterwork)) continue
			visited.add(next)
			queue.push([...path, next])
		}
	}
	throw new Error("The recorded water route has no canal path")
}

export function buildWaterPlayback(history, completionIndex) {
	const snapshots = history.slice(0, completionIndex + 1).map((entry) => JSON.parse(entry[2]))
	const completed = snapshots.at(-1)
	if (!completed || completed.rain.outflow === null || completed.rain.step === "routing") throw new Error("Water routing is not complete")
	let startIndex = completionIndex
	while (startIndex > 0) {
		const before = snapshots[startIndex - 1]
		const after = snapshots[startIndex]
		if ([rf.PHASE_DEVELOPMENT, rf.PHASE_SETTLEMENT].includes(before.gameflow.phase) && (after.gameflow.phase === rf.PHASE_RAINY_SEASON || after.gameflow.turn > before.gameflow.turn || after.gameflow.phase === rf.PHASE_GAME_OVER)) break
		startIndex--
	}
	if (startIndex === 0) throw new Error("This history does not contain the start of water routing")
	const game = JSON.parse(JSON.stringify(snapshots[startIndex]))
	for (const area of game.board.areas) area.irrigatedBy = null
	game.rain = { step: "routing", outflow: null, harvestOrder: [] }
	const board = JSON.parse(JSON.stringify(game.board))
	const steps = []
	const label = (id) => board.areas.find((area) => area.id === id)?.label || id
	function record(event) {
		if (event.amount === 0) return
		const descriptions = {
			source: `${event.amount} water enters at ${label(event.to)}.`,
			river: `${event.amount} water flows from ${label(event.from)} ${event.to ? `to ${label(event.to)}` : "towards the river exit"}.`,
			confluence: `${event.amount} water reaches the confluence at ${label(event.to)}${event.waiting ? "; waiting for the other river" : "; the rivers merge"}.`,
			reservoir: `${rf.STATE_NAMES[event.state]} reservoir at ${label(event.to)} diverts ${event.amount} water; ${event.downstream} continues downstream.`,
			pump: `${event.amount} water travels from ${label(event.from)} to ${rf.STATE_NAMES[event.state]} pump at ${label(event.to)}.`,
			irrigate: `${rf.STATE_NAMES[event.state]} uses 1 water to irrigate ${label(event.to)}.`,
			return: `${event.amount} unused water returns from ${label(event.from)} to ${label(event.to)}.`,
			outflow: `${event.amount} water leaves the board.`,
		}
		const path = event.from && event.to && ["pump", "irrigate", "return"].includes(event.type) ? canalPath(board, event.from, event.to) : [event.from, event.to].filter(Boolean)
		steps.push({ ...event, path, text: descriptions[event.type], wet: game.board.areas.filter((area) => area.irrigatedBy !== null).map((area) => area.id) })
	}
	let finished = water.startWaterRouting(game, record)
	for (let index = startIndex + 1; index <= completionIndex; index++) {
		const action = history[index][3]
		if (action?.type === "allocateWater") finished = water.allocateWater(game, action, record)
		else if (action?.type === "advanceWater") finished = water.advanceWaterRouting(game, record)
	}
	if (!finished || game.rain.routing.outflow !== completed.rain.outflow) throw new Error("This history does not contain all water-routing decisions")
	const wet = game.board.areas.filter((area) => area.irrigatedBy !== null).map((area) => area.id)
	steps.push({ type: "complete", path: [], wet, text: `Water routing complete: ${wet.length} ${wet.length === 1 ? "hex" : "hexes"} irrigated, ${game.rain.routing.outflow} water left the board.` })
	return { board, steps }
}
