/** Save format. The engine is deterministic, so a replay entry stores only
 * [event, player, action, secondsSincePreviousEntry] and, when replaying the
 * action does not reproduce the position (debug edits, kickouts, renamed
 * shadows), the changes from the replayed position. The opening position is
 * rebuilt from createGame. The UI still receives ordinary snapshots. */
import * as game from "./URRgame.js"
import * as board from "./URRboard.js"
import * as boardRules from "./URRmap.js"
import * as rf from "./URRreference.js"
import { historyAction, historyChanges } from "./URRhistoryActions.js"

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

export function changesBetween(before, after) {
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

function predict(previous, player, action, quiet = false) {
	if (!previous) throw new Error("URR history must start with the new game entry")
	// A no-action entry carries its own changes; clone so cached positions stay immutable.
	if (!action) return JSON.parse(JSON.stringify(previous))
	try {
		return game.applyAction(previous, player, action)
	} catch (error) {
		if (!quiet) console.warn("Unable to replay URR history entry:", error)
		return JSON.parse(JSON.stringify(previous))
	}
}

export function openingState(playerNames, changes = []) {
	return applyChanges(game.createGame(playerNames), changes)
}

export function replayHistoryEntry(previous, entry, playerNames) {
	if (entry[0] === rf.HIST_NEW_GAME) return openingState(playerNames, entry[3] || [])
	const action = historyAction(entry)
	const changes = historyChanges(entry)
	return applyChanges(predict(previous, entry[1], action, Array.isArray(changes) && changes.length > 0), changes || [])
}

// Replays only the entries appended since the last call. Undo truncates and
// import replaces entries, so identity is checked before reusing a position.
export function syncHistoryReplay(cache, history, playerNames, creationTimestamp) {
	if (cache.entries.length > history.length) {
		cache.entries.length = cache.snapshots.length = cache.times.length = history.length
	}
	for (let index = 0; index < cache.entries.length; index++) {
		if (cache.entries[index] === history[index]) continue
		cache.entries.length = 0
		cache.snapshots.length = 0
		cache.times.length = 0
		break
	}
	let previous = cache.snapshots.at(-1) ?? null
	let time = cache.times.at(-1) ?? creationTimestamp ?? null
	// Practice games without a server timestamp still need a real opening time.
	const startTime = creationTimestamp || Math.floor(Date.now() / 1000)
	for (let index = cache.entries.length; index < history.length; index++) {
		const entry = history[index]
		if (index === 0) time = startTime
		else time = entry[2] != null && time != null ? time + entry[2] : null
		const snapshot = replayHistoryEntry(previous, entry, playerNames)
		cache.entries.push(entry)
		cache.snapshots.push(snapshot)
		cache.times.push(time)
		previous = snapshot
	}
	return cache
}

export function expandHistory(data, newGameEvent) {
	if (!Array.isArray(data.replay)) throw new Error("Unsupported URR replay format")
	if (!data.replay.every((entry) => Array.isArray(entry) && typeof entry[0] === "number" && typeof entry[1] === "number" && typeof entry[2] === "number")) throw new Error("Unsupported URR replay format")
	const opening = [newGameEvent, -1, null]
	if (Array.isArray(data.replayStart) && data.replayStart.length) opening.push(data.replayStart)
	return [opening, ...data.replay]
}
