/** Save format. The engine is deterministic, so a replay entry stores only
 * [event, player, action, secondsSincePreviousEntry] and, when replaying the
 * action does not reproduce the position (debug edits, kickouts, renamed
 * shadows), the changes from the replayed position. The opening position is
 * rebuilt from createGame. The UI still receives ordinary snapshots. */
import * as game from "./URRgame.js"
import * as board from "./URRboard.js"
import * as boardRules from "./URRmap.js"

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

export function printedAreaIndexMap() {
	return new Map(printedBoard().areas.map((area, index) => [area.id, index]))
}

export function printedAreaIds() {
	return printedBoard().areas.map((area) => area.id)
}

function encodeWaterwork(waterwork) {
	if (!waterwork) return 0
	return [waterwork.state, waterwork.kind === "pump" ? 0 : 1, waterwork.capacity]
}

function decodeWaterwork(entry) {
	if (entry === 0) return null
	return { state: entry[0], kind: entry[1] === 0 ? "pump" : "reservoir", capacity: entry[2] }
}

// The printed layout is rebuilt on load; areas are saved as index-keyed deltas
// so the IDs and unchanged terrain never reach the database.
export function compactBoard(current) {
	const printed = printedBoard()
	const areaIndex = printedAreaIndexMap()
	const areas = []
	for (const area of current.areas) {
		const index = areaIndex.get(area.id)
		if (index === undefined) continue
		const fresh = printed.areas[index]
		const extras = {}
		for (const [key, value] of Object.entries(area)) {
			if (["owner", "markerOwner", "waterwork", "irrigatedBy"].includes(key)) continue
			if (JSON.stringify(value) !== JSON.stringify(fresh[key])) extras[key] = value
		}
		const hasRuntime = area.owner != null || area.markerOwner != null || area.waterwork != null || area.irrigatedBy != null
		if (!hasRuntime && !Object.keys(extras).length) continue
		const entry = [index, area.owner ?? -1, area.markerOwner ?? -1, encodeWaterwork(area.waterwork), area.irrigatedBy ?? -1]
		if (Object.keys(extras).length) entry.push(extras)
		else {
			// The empty waterwork slot uses 0; empty ownership slots use -1.
			while (entry.length > 1 && entry.at(-1) === (entry.length === 4 ? 0 : -1)) entry.pop()
		}
		areas.push(entry)
	}
	const canals = JSON.stringify(current.canals) === JSON.stringify(printed.canals) ? null : current.canals.map(([a, b]) => [areaIndex.get(a) ?? a, areaIndex.get(b) ?? b])
	const rest = {}
	for (const [key, value] of Object.entries(current)) {
		if (key === "areas" || key === "canals") continue
		if (JSON.stringify(value) !== JSON.stringify(printed[key])) rest[key] = value
	}
	return [areas, canals, Object.keys(rest).length ? rest : null]
}

export function expandBoard(stored) {
	if (stored?.format === "urr-board-v1") {
		const { format, areas, ...rest } = stored
		const result = { ...printedBoard(), ...rest }
		for (const area of result.areas) Object.assign(area, areas[area.id])
		return result
	}
	if (!Array.isArray(stored)) throw new Error("Unsupported URR board")
	const [areas, canals, rest] = stored
	const result = printedBoard()
	for (const [index, owner = -1, markerOwner = -1, waterwork = 0, irrigatedBy = -1, extras] of areas) {
		const area = result.areas[index]
		if (!area) continue
		area.owner = owner < 0 ? null : owner
		area.markerOwner = markerOwner < 0 ? null : markerOwner
		area.waterwork = decodeWaterwork(waterwork)
		area.irrigatedBy = irrigatedBy < 0 ? null : irrigatedBy
		if (extras) Object.assign(area, extras)
	}
	if (canals) result.canals = canals.map(([a, b]) => [typeof a === "number" ? result.areas[a].id : a, typeof b === "number" ? result.areas[b].id : b])
	if (rest) Object.assign(result, rest)
	return result
}

function predict(previous, player, action, isLegacyReplay = false) {
	if (!action) return previous
	try {
		return game.applyAction(previous, player, action, isLegacyReplay)
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
	if (!Array.isArray(data.replay)) {
		if (!Array.isArray(data.history)) throw new Error("Unsupported URR replay format")
		let previous = null
		return data.history.map((entry, index) => {
			if (index === 0 && entry[4] > 1e11) entry = [...entry.slice(0, 4), Math.floor(entry[4] / 1000)]
			const stored = entry[2]
			if (typeof stored === "string") previous = JSON.parse(stored)
			else {
				if (!previous || stored?.format !== "urr-history-delta-v1" || !Array.isArray(stored.changes)) throw new Error("Invalid URR replay delta")
				applyChanges(previous, stored.changes)
			}
			return [entry[0], entry[1], JSON.stringify(previous), ...JSON.parse(JSON.stringify(entry.slice(3)))]
		})
	}
	let previous = applyChanges(game.createGame(data.players.map((player) => player.name)), data.replayStart || [])
	let time = creationTimestamp ?? null
	const result = [[newGameEvent, -1, JSON.stringify(previous), null, time]]
	for (const stored of data.replay) {
		const [event, player, action, delta, changes] = stored
		const snapshot = applyChanges(JSON.parse(JSON.stringify(predict(previous, player, action, data.replayRules !== 1))), changes || [])
		time = delta != null && time != null ? time + delta : null
		const entry = [event, player, JSON.stringify(snapshot), action, time]
		if (data.replayRules === 1) encodedEntries.set(entry, { snapshot: entry[2], previousSnapshot: result.at(-1)[2], stored })
		result.push(entry)
		previous = snapshot
	}
	return result
}
