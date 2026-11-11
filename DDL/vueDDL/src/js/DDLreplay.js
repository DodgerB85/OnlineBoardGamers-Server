/**
 * Replay: the history stores a full snapshot after every action, so stepping
 * through a replay is just applying the snapshot for that entry.
 */

import { useModelStore } from "../stores/DDLstore.js"
import * as model from "./DDLmodel.js"
import * as IO from "../backend/DDL_IO.js"
import * as controller from "./DDLcontroller.js"

// The live position captured when replay started. Every replay close path
// restores it before play continues.
let liveSnapshot = null

export function buildReplayData() {
	const store = useModelStore()
	store.replayData.splice(0)
	for (const entry of store.history) {
		if (entry && entry[2]) store.replayData.push(entry[2])
	}
	liveSnapshot = model.snapshotState()
	store.replayData.push(liveSnapshot)
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

export function exitReplay() {
	const store = useModelStore()
	store.viewSettings.showReplay = false
	store.replayData.splice(0)
	store.replayStep = 0
	if (liveSnapshot) model.applySnapshot(liveSnapshot)
	liveSnapshot = null
	// Catch up on anything that arrived while the replay was open.
	controller.startPlayerTurn()
	IO.checkForLatestData()
}
