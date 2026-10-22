/**
 * Replay: the history stores a full snapshot after every action, so stepping
 * through a replay is just applying the snapshot for that entry.
 */

import { useModelStore } from "../stores/DDLstore.js"
import * as model from "./DDLmodel.js"

export function buildReplayData() {
	const store = useModelStore()
	store.replayData.splice(0)
	for (const entry of store.history) {
		if (entry && entry[2]) store.replayData.push(entry[2])
	}
	store.replayData.push(model.snapshotState())
	store.replayStep = 0
}

export function applyStep(step) {
	const store = useModelStore()
	if (store.replayData.length === 0) buildReplayData()
	if (step < 0) step = 0
	if (step >= store.replayData.length) step = store.replayData.length - 1
	store.replayStep = step
	model.applySnapshot(store.replayData[step])
}

export function performStep(amount) {
	const store = useModelStore()
	if (store.replayData.length === 0) buildReplayData()
	let target = store.replayStep
	if (amount === -99) target = 0
	else if (amount === -9) target -= 5
	else if (amount === -1) target--
	else if (amount === 1) target++
	else if (amount === 9) target += 5
	else if (amount === 99) target = store.replayData.length - 1
	applyStep(target)
}
