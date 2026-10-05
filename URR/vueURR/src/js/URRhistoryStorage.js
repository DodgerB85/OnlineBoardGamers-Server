/** Lossless replay storage. Full positions anchor phase changes; intervening
 * entries store only changed values. The UI still receives ordinary snapshots. */
const DELTA_FORMAT = "urr-history-delta-v1"
const encodedSnapshots = new WeakMap()

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

function copyEntry(entry, snapshot) {
	return [entry[0], entry[1], snapshot, ...JSON.parse(JSON.stringify(entry.slice(3)))]
}

export function compactHistory(history) {
	return history.map((entry, index) => {
		const snapshot = entry[2]
		const previousSnapshot = index > 0 ? history[index - 1][2] : null
		const cached = encodedSnapshots.get(entry)
		if (cached?.snapshot === snapshot && cached.previousSnapshot === previousSnapshot) return copyEntry(entry, cached.storedSnapshot)

		let storedSnapshot = snapshot
		if (previousSnapshot !== null) {
			const before = JSON.parse(previousSnapshot)
			const after = JSON.parse(snapshot)
			if (before.gameflow.turn === after.gameflow.turn && before.gameflow.phase === after.gameflow.phase) {
				const changes = []
				collectChanges(before, after, [], changes)
				const delta = { format: DELTA_FORMAT, changes }
				if (JSON.stringify(delta).length < snapshot.length) storedSnapshot = delta
			}
		}
		// An appended move should not re-encode the entire existing replay.
		encodedSnapshots.set(entry, { snapshot, previousSnapshot, storedSnapshot })
		return copyEntry(entry, storedSnapshot)
	})
}

export function expandHistory(history) {
	let previous = null
	return history.map((entry) => {
		const stored = entry[2]
		let snapshot = stored
		if (typeof stored === "string") previous = JSON.parse(stored)
		else {
			if (!previous || stored?.format !== DELTA_FORMAT || !Array.isArray(stored.changes)) throw new Error("Invalid URR replay delta")
			// Clone inserted values so later deltas cannot mutate the saved records.
			for (const change of JSON.parse(JSON.stringify(stored.changes))) {
				const [path, value] = change
				if (!Array.isArray(path) || path.length === 0) throw new Error("Invalid URR replay change path")
				let target = previous
				for (const key of path.slice(0, -1)) target = target[key]
				const key = path.at(-1)
				if (change.length === 1) delete target[key]
				else target[key] = value
			}
			snapshot = JSON.stringify(previous)
		}
		return copyEntry(entry, snapshot)
	})
}
