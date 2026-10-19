/** Save format. The engine is deterministic, so a replay entry stores only
 * [event, player, action, secondsSincePreviousEntry] and, when replaying the
 * action does not reproduce the position (debug edits, kickouts, renamed
 * shadows), the changes from the replayed position. The opening position is
 * rebuilt from createGame. The UI still receives ordinary snapshots. */
import * as game from "./URRgame.js"
import * as board from "./URRboard.js"
import * as boardRules from "./URRmap.js"

const BOARD_FORMAT = "urr-board-v1"
const encodedEntries = new WeakMap()

function collectChanges(before, after, path, changes) {
	if (before === after) return
	if (before === null || after === null || typeof before !== "object" || typeof after !== "object" || Array.isArray(before) !== Array.isArray(after) || (Array.isArray(after) && before.length !== after.length)) {
		changes.push([path, after])
		return
	}
	for (const key of Object.keys(before)) {
		if (!Object.hasOwn(after, key)) changes.push([[...path, key]])
	}
	for (const key of Object.keys(after)) {
		const nextPath = [...path, key]
		if (!Object.hasOwn(before, key)) changes.push([nextPath, after[key]])
		else collectChanges(before[key], after[key], nextPath, changes)
	}
}

function applyChanges(target, changes) {
	// Clone inserted values so later changes cannot mutate the saved records.
	for (const change of JSON.parse(JSON.stringify(changes))) {
		const [path, value] = change
		if (!Array.isArray(path) || path.length === 0) throw new Error("Invalid URR replay change path")
		let parent = target
		for (const key of path.slice(0, -1)) parent = parent[key]
		const key = path.at(-1)
		if (change.length === 1) delete parent[key]
		else parent[key] = value
	}
	return target
}

function changesBetween(before, after) {
	const changes = []
	collectChanges(before, after, [], changes)
	return changes
}

function printedBoard() {
	return boardRules.createBoard(board.createPrintedBoard())
}

// The printed layout is rebuilt on load; only areas that differ from it are
// saved, keyed by id so a corrected layout cannot misplace saved pieces.
export function compactBoard(current) {
	const printed = printedBoard()
	const areas = {}
	for (const area of current.areas) {
		const fresh = printed.areas.find((candidate) => candidate.id === area.id)
		const changed = Object.fromEntries(Object.entries(area).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(fresh?.[key])))
		if (Object.keys(changed).length) areas[area.id] = changed
	}
	const rest = Object.fromEntries(Object.entries(current).filter(([key, value]) => key !== "areas" && JSON.stringify(value) !== JSON.stringify(printed[key])))
	return { format: BOARD_FORMAT, areas, ...rest }
}

export function expandBoard(stored) {
	if (stored?.format !== BOARD_FORMAT) throw new Error("Unsupported URR board format")
	const { format: _format, areas, ...rest } = stored
	const result = { ...printedBoard(), ...rest }
	for (const area of result.areas) Object.assign(area, areas[area.id])
	return result
}

function predict(previous, player, action) {
	if (!action) return previous
	try {
		return game.applyAction(previous, player, action)
	} catch {
		return previous
	}
}

export function compactHistory(history) {
	if (!history.length) return []
	return history.slice(1).map((entry, offset) => {
		const previousEntry = history[offset]
		const cached = encodedEntries.get(entry)
		if (cached?.snapshot === entry[2] && cached.previousSnapshot === previousEntry[2]) return JSON.parse(JSON.stringify(cached.stored))

		const time = entry[4] != null && previousEntry[4] != null ? entry[4] - previousEntry[4] : null
		const stored = [entry[0], entry[1], entry[3] ?? null, time]
		const changes = changesBetween(predict(JSON.parse(previousEntry[2]), entry[1], entry[3]), JSON.parse(entry[2]))
		if (changes.length) stored.push(changes)
		// An appended move should not re-encode the entire existing replay.
		encodedEntries.set(entry, { snapshot: entry[2], previousSnapshot: previousEntry[2], stored })
		return JSON.parse(JSON.stringify(stored))
	})
}

// Preserve opening changes from debug edits or shadow renames.
export function compactOpening(history) {
	if (!history.length) return []
	const opening = JSON.parse(history[0][2])
	return changesBetween(game.createGame(opening.players.map((player) => player.name)), opening)
}

export function expandHistory(data, newGameEvent, creationTimestamp) {
	if (!Array.isArray(data.replay)) throw new Error("Unsupported URR replay format")
	let previous = applyChanges(game.createGame(data.players.map((player) => player.name)), data.replayStart || [])
	let time = creationTimestamp ?? null
	const result = [[newGameEvent, -1, JSON.stringify(previous), null, time]]
	for (const stored of data.replay) {
		const [event, player, action, delta, changes] = stored
		const snapshot = applyChanges(JSON.parse(JSON.stringify(predict(previous, player, action))), changes || [])
		time = delta != null && time != null ? time + delta : null
		const entry = [event, player, JSON.stringify(snapshot), action, time]
		encodedEntries.set(entry, { snapshot: entry[2], previousSnapshot: result.at(-1)[2], stored })
		result.push(entry)
		previous = snapshot
	}
	return result
}
